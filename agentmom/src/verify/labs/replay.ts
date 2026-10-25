// Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Doğrulama laboratuvarı madde 60: hata oynatma ("yeniden üretim paketi"). Başarısız bir koşudan, hatayı AYNI komutla yeniden üretmek için gereken her şeyi
// taşıyan, maskelenmiş ve ≤ 256 KB bir JSON paket çıkarır. buildReplayBundle / verifyReplayBundle SAFTIR: hiçbir süreç başlatmaz, dosya yazmaz.
//
// TASARIM KARARI (bilerek): gerçek bir "yeniden çalıştır" (spawn) YOKTUR. Paket yalnızca veridir: komut (localTests için `node --test <dosyalar>`, tarayıcı için
// senaryo adımları, laboratuvarlar için plan bölümü), taahhüt (commit) + görevin değiştirdiği dosyalar, ortam (node/platform), plan ve kanıt dosyalarının
// yolu + sha256'sı. Yeniden üretmek isteyen kişi (ya da ileride ayrıca izinli bir araç) çalışma ağacını `commit` + `files` ile kurup komutu kendisi çalıştırır;
// kanıt bütünlüğü verifyReplayBundle ile doğrulanır. Böylece paket üretmek bir saldırı yüzeyi (kod çalıştırma) eklemez.
import { redact, redactString } from "../../core/audit/redact.ts";
import type { VerificationPlan } from "../../workflows/types.ts";
import { checkEvidenceFile } from "../evidence-files.ts";
import type { EvidenceItem, RunResult } from "../schema.ts";
import type { ScenarioStep } from "../scenario.ts";

export const REPLAY_SCHEMA = "agentmom.replay/1";
export const MAX_REPLAY_BYTES = 256 * 1024;
const MAX_FAILING = 50;
const MAX_EVIDENCE = 100;
const MAX_FILES = 200;

export type ReplayCommand =
  | { kind: "node-test"; executable: "node"; argv: string[]; display: string; note: string }
  | { kind: "browser-scenario"; siteDir: string; steps: ScenarioStep[]; note: string }
  | { kind: "lab"; lab: string; plan: unknown; note: string }
  | { kind: "none"; note: string };

export interface ReplayFailingTest {
  id: string;
  name: string;
  error: { message: string; detail?: string } | null;
  classification: string | null;
  evidenceRefs: string[];
}

export interface ReplayEvidence {
  id: string;
  kind: string;
  path?: string;
  sha256?: string;
  bytes?: number;
}

export interface ReplayBundle {
  schema: typeof REPLAY_SCHEMA;
  runId: string;
  provider: string;
  runStatus: string;
  failingTests: ReplayFailingTest[];
  command: ReplayCommand;
  environment: { node: string; platform: string };
  plan: unknown;
  commit?: string;
  // Görevin değiştirdiği dosyalar (çalışma ağacına göreli): commit üzerine uygulanan fark bu dosyalardadır.
  files: string[];
  evidence: ReplayEvidence[];
  createdAt: string;
  // Boyut sınırı için kırpılan bölümler (yoksa alan da yoktur).
  truncated?: string[];
}

export interface ReplayContext {
  plan: VerificationPlan;
  commit?: string;
  worktreeRelativeFiles: string[];
  now?: () => Date;
}

function commandFor(run: RunResult, plan: VerificationPlan): ReplayCommand {
  switch (run.provider) {
    case "local-tests": {
      const files = plan.localTests?.files ?? [];
      const argv = ["--test", ...files.map((f) => `./${f}`)];
      return { kind: "node-test", executable: "node", argv, display: `node ${argv.join(" ")}`, note: "run from the worktree root; the engine additionally runs it under node --permission with a scratch directory" };
    }
    case "browser":
      return plan.browser ? { kind: "browser-scenario", siteDir: plan.browser.siteDir, steps: plan.browser.steps, note: "play the steps in order against the static site directory" } : { kind: "none", note: "the plan has no browser scenario" };
    case "contracts-lab":
      return { kind: "lab", lab: "contracts", plan: plan.contracts ?? null, note: "deterministic: evaluate the contracts against the subject JSON file in the worktree" };
    case "state-lab":
      return { kind: "lab", lab: "state", plan: plan.states ?? null, note: "deterministic: the machine is inline in the plan" };
    case "a11y-lab":
      return { kind: "lab", lab: "a11y", plan: plan.a11y ?? null, note: "deterministic: scan the listed html files in the worktree" };
    case "design-lab":
      return { kind: "lab", lab: "design", plan: plan.design ?? null, note: "deterministic: check the listed html/css files in the worktree against the design spec (inline or specFile)" };
    case "mutation-lab":
      return { kind: "lab", lab: "mutation", plan: plan.mutation ?? null, note: "copy the worktree (without .git/node_modules), apply each listed mutation to the copy only and rerun the localTests files; survivors are the failures" };
    default:
      return { kind: "none", note: "no replay command is known for this provider" };
  }
}

function sizeOf(b: unknown): number {
  return Buffer.byteLength(JSON.stringify(b));
}

// Başarısız (failed / error) testi olan bir koşudan paket üretir. Paket redact edilir; ≤ 256 KB'a sığmazsa sırayla ayrıntılar kırpılır (truncated alanı yazılır).
export function buildReplayBundle(run: RunResult, ctx: ReplayContext): ReplayBundle {
  const failing = run.tests.filter((t) => t.outcome === "failed" || t.outcome === "error");
  const raw: ReplayBundle = {
    schema: REPLAY_SCHEMA,
    runId: run.runId,
    provider: run.provider,
    runStatus: run.status,
    failingTests: failing.slice(0, MAX_FAILING).map((t) => ({
      id: t.id,
      name: t.name,
      error: t.error ? { message: t.error.message, ...(t.error.detail ? { detail: t.error.detail } : {}) } : null,
      classification: t.classification,
      evidenceRefs: [...t.evidenceRefs],
    })),
    command: commandFor(run, ctx.plan),
    environment: { node: run.environment.node, platform: run.environment.platform },
    plan: ctx.plan,
    ...(ctx.commit ? { commit: redactString(ctx.commit).slice(0, 100) } : {}),
    files: ctx.worktreeRelativeFiles.slice(0, MAX_FILES),
    evidence: run.evidence.slice(0, MAX_EVIDENCE).map((e) => ({ id: e.id, kind: e.kind, ...(e.path !== undefined ? { path: e.path } : {}), ...(e.sha256 !== undefined ? { sha256: e.sha256 } : {}), ...(e.bytes !== undefined ? { bytes: e.bytes } : {}) })),
    createdAt: (ctx.now ?? (() => new Date()))().toISOString(),
  };
  let bundle = redact(raw) as ReplayBundle;
  const truncated: string[] = [];
  const shrink = (what: string, fn: (b: ReplayBundle) => void): void => {
    if (sizeOf(bundle) <= MAX_REPLAY_BYTES) return;
    fn(bundle);
    truncated.push(what);
  };
  shrink("error details", (b) => {
    for (const t of b.failingTests) if (t.error?.detail) t.error.detail = `${t.error.detail.slice(0, 200)}…`;
  });
  shrink("failing tests (first 10)", (b) => {
    b.failingTests = b.failingTests.slice(0, 10);
  });
  shrink("files", (b) => {
    b.files = b.files.slice(0, 20);
  });
  shrink("command", (b) => {
    b.command = { kind: "none", note: "the command was too large to embed; derive it from the plan" };
  });
  shrink("plan", (b) => {
    b.plan = { truncated: true };
  });
  if (truncated.length > 0) bundle = { ...bundle, truncated };
  return bundle;
}

export interface ReplayVerification {
  ok: boolean;
  problems: string[];
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// Paketin bütünlüğü: şema, gerekli alanlar, boyut, her failingTest'in evidenceRefs'inin pakette olması ve kanıt dosyalarının (yol + sha256 + boyut) diskte değişmemiş olması.
export function verifyReplayBundle(bundle: unknown): ReplayVerification {
  const problems: string[] = [];
  if (!isObj(bundle)) return { ok: false, problems: ["the bundle must be an object"] };
  if (bundle.schema !== REPLAY_SCHEMA) problems.push(`schema must be ${REPLAY_SCHEMA}`);
  for (const k of ["runId", "provider", "runStatus", "createdAt"]) if (typeof bundle[k] !== "string" || bundle[k] === "") problems.push(`${k} is required`);
  if (typeof bundle.createdAt === "string" && Number.isNaN(Date.parse(bundle.createdAt))) problems.push("createdAt is not a date");
  if (!isObj(bundle.command) || typeof bundle.command.kind !== "string") problems.push("command is required");
  if (!isObj(bundle.environment) || typeof bundle.environment.node !== "string" || typeof bundle.environment.platform !== "string") problems.push("environment needs node and platform");
  if (bundle.plan === undefined || bundle.plan === null || typeof bundle.plan !== "object") problems.push("plan is required");
  if (!Array.isArray(bundle.files) || !bundle.files.every((f) => typeof f === "string")) problems.push("files must be a list of paths");
  const ids = new Set<string>();
  if (!Array.isArray(bundle.evidence)) problems.push("evidence must be a list");
  else {
    for (const [i, e] of bundle.evidence.entries()) {
      if (!isObj(e) || typeof e.id !== "string" || typeof e.kind !== "string") {
        problems.push(`evidence[${i}] is malformed`);
        continue;
      }
      if (ids.has(e.id)) problems.push(`duplicate evidence id ${e.id}`);
      ids.add(e.id);
      if (typeof e.path === "string") {
        const item: EvidenceItem = { id: e.id, kind: e.kind as EvidenceItem["kind"], summary: "", path: e.path, ...(typeof e.sha256 === "string" ? { sha256: e.sha256 } : {}), ...(typeof e.bytes === "number" ? { bytes: e.bytes } : {}) };
        if (item.sha256 === undefined) problems.push(`evidence ${e.id} has a file but no sha256`);
        const p = checkEvidenceFile(item);
        if (p) problems.push(p);
      }
    }
  }
  if (!Array.isArray(bundle.failingTests)) problems.push("failingTests must be a list");
  else {
    for (const [i, t] of bundle.failingTests.entries()) {
      if (!isObj(t) || typeof t.name !== "string" || !Array.isArray(t.evidenceRefs)) {
        problems.push(`failingTests[${i}] is malformed`);
        continue;
      }
      for (const r of t.evidenceRefs) if (typeof r !== "string" || !ids.has(r)) problems.push(`failingTests[${i}] references evidence that is not in the bundle`);
    }
  }
  if (sizeOf(bundle) > MAX_REPLAY_BYTES) problems.push(`the bundle is larger than ${MAX_REPLAY_BYTES / 1024} KB`);
  return { ok: problems.length === 0, problems: problems.map((p) => redactString(p).slice(0, 300)) };
}
