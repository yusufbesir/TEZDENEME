import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { redact, redactString } from "../core/audit/redact.ts";
import { buildChildEnv } from "../providers/child-env.ts";
import { killTree } from "../providers/cli-adapter.ts";
import { classifyFailure } from "./classify.ts";
import { describeFile, saveEvidence, sha256Of } from "./evidence-files.ts";
import { findLinks } from "./links.ts";
import { criteriaFor } from "./provider.ts";
import type { VerificationHandle, VerificationProvider } from "./provider.ts";
import { isBaselineName, validateScenario } from "./scenario.ts";
import type { ScenarioStep } from "./scenario.ts";
import { VERIFY_SCHEMA_VERSION, totalsOf } from "./schema.ts";
import type { EvidenceItem, RunResult, RunStatus, TestResult } from "./schema.ts";

export interface BrowserRequest {
  siteDir: string;
  steps: ScenarioStep[];
  evidenceDir: string;
  timeoutMs: number;
  stepTimeoutMs?: number;
  criteriaMap?: Record<string, string[]>;
  channel?: string;
  // Görsel regresyon (madde 52): GÜVENİLİR taban klasörü (kullanıcı onaylı tabanlar; sunucu yönetir) ve ikincil, YALNIZ OKUNUR çalışma ağacı klasörü
  // (<çalışma ağacı>/.agentmom/baselines; uygulayıcı yazabildiği için güvenilmez: yalnız uyarı üretir, asla geçiş sayılmaz).
  baselineDir?: string;
  workspaceBaselineDir?: string;
  // Çalışma ağacı kökü: workspaceBaselineDir'in gerçek yolu bunun gerçek yolunun İÇİNDE kalmalı ve aradaki hiçbir bileşen bağ/kavşak olmamalı (.agentmom kavşağıyla dışarı kaçış yok).
  workspaceRoot?: string;
  // Onay anında kaydedilen taban özetleri (ad -> sha256). Verilirse onaylı klasördeki bir dosya YALNIZ bu özetle eşleşirse güvenilir sayılır:
  // klasöre elle yazılmış / değiştirilmiş dosya "invalid" olur. Verilmezse (doğrudan sağlayıcı kullanımı) klasör içeriğine güvenilir.
  approvedBaselines?: Record<string, string>;
}

// Taban dosyasının üst sınırı ve PNG imzası. Ana süreç tabanı BULUR ve doğrular; worker yalnız özetini yeniden denetler.
const MAX_BASELINE_BYTES = 8 * 1024 * 1024;
const PNG_SIGNATURE = "89504e470d0a1a0a";
type ResolvedBaseline = { source: "approved" | "workspace"; path: string; sha256: string } | { source: "approved" | "workspace"; invalid: string };

// root'tan dir'e giden her bileşen için lstat: bağ/kavşak varsa false. dir root'un içinde değilse de false.
function pathHasNoLinks(root: string, dir: string): boolean {
  const realRoot = realpathSync(root);
  const realDir = realpathSync(dir);
  if (!(realDir === realRoot || realDir.startsWith(realRoot + sep))) return false;
  let cur = resolve(root);
  const rel = relative(cur, resolve(dir));
  if (rel.startsWith("..") || isAbsolute(rel)) return false;
  for (const part of rel.split(sep).filter(Boolean)) {
    cur = join(cur, part);
    if (lstatSync(cur).isSymbolicLink()) return false;
  }
  return true;
}

function readBaselineFile(dir: string, name: string, source: "approved" | "workspace", root?: string): ResolvedBaseline | null {
  const file = join(dir, name);
  let st;
  try {
    st = lstatSync(file);
  } catch {
    return null;
  }
  // lstat: sembolik bağ / kavşak "düzenli dosya" sayılmaz. Çalışma ağacı için ayrıca gerçek yolun klasörün içinde kaldığı denetlenir.
  if (!st.isFile()) return { source, invalid: "the baseline is not a regular file (links are refused)" };
  if (st.size === 0 || st.size > MAX_BASELINE_BYTES) return { source, invalid: `the baseline must be 1 to ${MAX_BASELINE_BYTES} bytes` };
  try {
    const realDir = realpathSync(dir);
    const real = realpathSync(file);
    if (!real.startsWith(realDir + sep)) return { source, invalid: "the baseline resolves outside its folder" };
    if (lstatSync(dir).isSymbolicLink()) return { source, invalid: "the baseline folder is a link" };
    if (root !== undefined && !pathHasNoLinks(root, dir)) return { source, invalid: "the baseline folder leads outside the workspace or through a link" };
  } catch {
    return { source, invalid: "the baseline could not be resolved" };
  }
  const buf = readFileSync(file);
  if (buf.subarray(0, 8).toString("hex") !== PNG_SIGNATURE) return { source, invalid: "the baseline is not a PNG image" };
  return { source, path: file, sha256: sha256Of(buf) };
}

// Önce onaylı klasör; orada dosya varsa yalnız o kullanılır. Yoksa çalışma ağacındaki (güvenilmez) taban. İkisi de yoksa null (taban yok).
export function resolveBaseline(name: string, req: Pick<BrowserRequest, "baselineDir" | "workspaceBaselineDir" | "workspaceRoot" | "approvedBaselines">): ResolvedBaseline | null {
  if (!isBaselineName(name)) return { source: "approved", invalid: "invalid baseline name" };
  if (req.baselineDir) {
    const approved = readBaselineFile(req.baselineDir, name, "approved");
    if (approved) {
      if (!("path" in approved) || req.approvedBaselines === undefined) return approved;
      const recorded = Object.hasOwn(req.approvedBaselines, name) ? req.approvedBaselines[name] : undefined;
      if (recorded === undefined) return { source: "approved", invalid: "no approval record exists for this baseline file; it is not trusted" };
      if (recorded !== approved.sha256) return { source: "approved", invalid: "the baseline file does not match the hash recorded when the user approved it (modified after approval)" };
      return approved;
    }
  }
  if (req.workspaceBaselineDir) {
    const ws = readBaselineFile(req.workspaceBaselineDir, name, "workspace", req.workspaceRoot);
    if (ws) return ws;
  }
  return null;
}

interface WorkerCase {
  name: string;
  outcome: "passed" | "failed" | "error" | "skipped";
  durationMs: number;
  message: string | null;
  detail: string | null;
  criteria: string[];
  screenshot: string | null;
  visual?: { checked: number; skipped: number; violations: number };
  diffImage?: string | null;
  baseline?: { file: string; status: string; source?: string; baselineSha256?: string; ratio?: number; maxDiffRatio?: number; diffPixels?: number; totalPixels?: number };
}

const WORKER = join(import.meta.dirname, "browser-worker.ts");
const clean = (s: string): string => redactString(s).slice(0, 200);

// Browser verification with the installed Edge, driven from a separate process. The scenario is data; requests outside the local server are blocked.
export class BrowserProvider implements VerificationProvider<BrowserRequest> {
  readonly id = "browser";

  run(req: BrowserRequest): VerificationHandle {
    const runId = randomUUID();
    let child: ChildProcess | undefined;
    let cancelled = false;
    const result = this.execute(runId, req, (c) => (child = c), () => cancelled);
    return {
      runId,
      result,
      cancel: async () => {
        cancelled = true;
        if (child) killTree(child);
        await result;
      },
    };
  }

  private async execute(runId: string, req: BrowserRequest, setChild: (c: ChildProcess) => void, isCancelled: () => boolean): Promise<RunResult> {
    const startedAt = new Date();
    const steps = validateScenario(req.steps);
    const siteDir = resolve(req.siteDir);
    if (!existsSync(siteDir) || !statSync(siteDir).isDirectory()) throw new Error(`siteDir is not a directory: ${req.siteDir}`);
    const links = findLinks(siteDir);
    if (links.length > 0) throw new Error(`siteDir contains ${links.length} symlink/junction(s); refusing to serve it (${links.slice(0, 3).join(", ")})`);
    mkdirSync(join(req.evidenceDir, "tmp"), { recursive: true });
    const baselines: Record<string, ResolvedBaseline> = {};
    for (const st of steps) {
      if (st.kind !== "expectScreenshotMatch" || Object.hasOwn(baselines, st.baseline)) continue;
      const found = resolveBaseline(st.baseline, req);
      if (found) baselines[st.baseline] = found;
    }
    const requestFile = join(req.evidenceDir, `${runId}-request.json`);
    writeFileSync(requestFile, JSON.stringify({ siteDir, steps, evidenceDir: req.evidenceDir, runId, stepTimeoutMs: req.stepTimeoutMs ?? 5000, channel: req.channel ?? "msedge", baselines }), { flag: "wx" });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let spawnError: string | null = null;
    const code = await new Promise<number | null>((resolveP) => {
      const child = spawn(process.execPath, [WORKER, requestFile], {
        cwd: req.evidenceDir,
        env: { ...buildChildEnv({ tempDir: join(req.evidenceDir, "tmp") }), PLAYWRIGHT_BROWSERS_PATH: join(req.evidenceDir, "pw-browsers"), PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1" },
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        shell: false,
      });
      setChild(child);
      const timer = setTimeout(() => {
        timedOut = true;
        killTree(child);
      }, req.timeoutMs);
      child.stdout.on("data", (d: Buffer) => {
        if (stdout.length < 4 * 1024 * 1024) stdout += d.toString("utf8");
      });
      child.stderr.on("data", (d: Buffer) => {
        if (stderr.length < 256 * 1024) stderr += d.toString("utf8");
      });
      child.on("error", (err: NodeJS.ErrnoException) => (spawnError = err.code ?? "spawn_error"));
      child.on("close", (c) => {
        clearTimeout(timer);
        resolveP(c);
      });
    });

    const evidence: EvidenceItem[] = [];
    evidence.push(saveEvidence(req.evidenceDir, `${runId}-worker-stdout`, "log", "browser worker output", redactString(stdout) || "(no output)\n", "log"));
    if (stderr.trim()) evidence.push(saveEvidence(req.evidenceDir, `${runId}-worker-stderr`, "log", "browser worker stderr", redactString(stderr), "log"));
    const logRefs = evidence.map((e) => e.id);

    const line = stdout.split("\n").find((l) => l.startsWith("RESULT:"));
    let parsed: { cases: WorkerCase[]; blocked: string[]; launchError: string | null } | null = null;
    if (line && !timedOut && !isCancelled()) {
      try {
        parsed = JSON.parse(line.slice("RESULT:".length));
      } catch {
        parsed = null;
      }
    }

    const tests: TestResult[] = [];
    const visual: Array<{ name: string; checked: number; skipped: number; violations: number }> = [];
    const baselineRecords: Array<Record<string, unknown>> = [];
    const runLevel = isCancelled() ? "cancelled" : timedOut ? "timeout" : spawnError ? "spawn_error" : parsed ? null : "crash";
    if (runLevel || !parsed) {
      const message =
        runLevel === "timeout" ? `browser run exceeded ${req.timeoutMs} ms and was killed` : runLevel === "cancelled" ? "browser run was cancelled" : runLevel === "spawn_error" ? `could not start the worker (${spawnError})` : `browser worker ended without a result (exit ${code})`;
      tests.push({ id: "run", suite: "browser", name: "run", outcome: "error", durationMs: 0, error: { message, detail: redactString(stderr).slice(0, 2000) }, criteria: [], classification: classifyFailure({ message, runLevel: runLevel ?? "crash" }), evidenceRefs: logRefs, attempts: 1 });
    } else if (parsed.launchError) {
      const message = redactString(parsed.launchError).slice(0, 800);
      tests.push({ id: "browser-launch", suite: "browser", name: "browser launch", outcome: "error", durationMs: 0, error: { message }, criteria: [], classification: classifyFailure({ message: `Failed to launch: ${message}` }), evidenceRefs: logRefs, attempts: 1 });
    } else {
      const used = new Map<string, number>();
      // Görsel kalite adımlarında bir görünüm alanının tüm kuralları aynı ekran görüntüsüne dayanır: kanıt bir kez yazılır, birden çok teste bağlanır.
      const shots = new Map<string, EvidenceItem>();
      for (const c of parsed.cases) {
        const refs = [...logRefs];
        if (c.screenshot) {
          let shot = shots.get(c.screenshot);
          if (!shot) {
            shot = describeFile(join(req.evidenceDir, c.screenshot), c.screenshot.replace(/\.png$/, ""), "screenshot", `${c.outcome === "passed" || c.outcome === "skipped" ? "screenshot" : "failure screenshot"}: ${c.name}`);
            shots.set(c.screenshot, shot);
            evidence.push(shot);
          }
          refs.push(shot.id);
        }
        const shotRef = c.screenshot ? (refs[refs.length - 1] as string) : null;
        if (c.visual) visual.push({ name: clean(c.name), ...c.visual });
        // Görsel regresyon: fark görüntüsü ayrı kanıt olarak yazılır ve başarısız testin kanıtlarına eklenir; yeni görüntünün kanıt kimliği onay ucu için kayda yazılır.
        if (c.diffImage) {
          const diff = describeFile(join(req.evidenceDir, c.diffImage), c.diffImage.replace(/\.png$/, ""), "screenshot", `visual diff (differing pixels in red): ${c.name}`);
          evidence.push(diff);
          refs.push(diff.id);
        }
        if (c.baseline) {
          const newImage = c.screenshot ? evidence.find((e) => e.id === (c.screenshot as string).replace(/\.png$/, "")) : undefined;
          baselineRecords.push({ ...c.baseline, test: clean(c.name), outcome: c.outcome, ...(newImage ? { newEvidenceId: newImage.id, newSha256: newImage.sha256 } : {}), ...(c.diffImage ? { diffEvidenceId: c.diffImage.replace(/\.png$/, "") } : {}) });
        }
        const n = (used.get(c.name) ?? 0) + 1;
        used.set(c.name, n);
        const failed = c.outcome === "failed" || c.outcome === "error";
        tests.push({
          id: n === 1 ? clean(c.name) : `${clean(c.name)}#${n}`,
          suite: "browser",
          name: clean(c.name),
          outcome: c.outcome,
          durationMs: c.durationMs,
          error: failed || (c.outcome === "skipped" && c.message) ? { message: redactString(c.message ?? "step failed"), detail: redactString(c.detail ?? "").slice(0, 2000) } : null,
          criteria: [...new Set([...c.criteria, ...criteriaFor(c.name, req.criteriaMap)])],
          classification: failed ? classifyFailure({ message: c.message ?? "", detail: c.detail ?? "" }) : null,
          evidenceRefs: failed ? refs : shotRef ? [shotRef] : [],
          attempts: 1,
        });
      }
    }

    const endedAt = new Date();
    const status: RunStatus = runLevel === "timeout" ? "timed_out" : runLevel === "cancelled" ? "cancelled" : tests.some((t) => t.outcome === "error") ? "error" : tests.some((t) => t.outcome === "failed") ? "failed" : "passed";
    return {
      schemaVersion: VERIFY_SCHEMA_VERSION,
      runId,
      provider: this.id,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: endedAt.getTime() - startedAt.getTime(),
      status,
      tests,
      evidence,
      totals: totalsOf(tests),
      environment: { node: process.version, platform: process.platform },
      providerData: redact({ channel: req.channel ?? "msedge", steps: steps.length, blockedRequests: parsed?.blocked ?? [], exitCode: code, ...(visual.length ? { visual: visual.slice(0, 100) } : {}), ...(baselineRecords.length ? { baselines: baselineRecords.slice(0, 50) } : {}) }) as Record<string, unknown>,
    };
  }
}
