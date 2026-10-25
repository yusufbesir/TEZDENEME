// Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// İş akışı teslim denetimi için doğrulama laboratuvarı koşuları (madde 56 sözleşmeler, madde 57 durum geçişleri).
// Çalışma ağacında KOD ÇALIŞTIRILMAZ: sözleşmeler çalışma ağacından güvenle okunan tek bir JSON dosyasını (konu) değerlendirir,
// durum denetimi satır içi makineyi işler. Her koşuya, auditEvidence kurallarının aradığı gibi diskte bir LOG kanıt dosyası eklenir.
import { closeSync, fstatSync, openSync, readSync } from "node:fs";
import { redactString } from "../core/audit/redact.ts";
import { resolveInsideRoot } from "../core/config/safe-path.ts";
import { saveEvidence } from "../verify/evidence-files.ts";
import { A11yLabProvider } from "../verify/labs/a11y.ts";
import { ContractsLabProvider, MAX_SUBJECT_BYTES } from "../verify/labs/contracts.ts";
import { DesignLabProvider } from "../verify/labs/design.ts";
import { MutationLabProvider } from "../verify/labs/mutation.ts";
import { LabSpecError, mkRun, mkTest } from "../verify/labs/rules.ts";
import { StateLabProvider } from "../verify/labs/state.ts";
import type { RunResult } from "../verify/schema.ts";
import type { VerificationPlan } from "./types.ts";

export type SubjectRead = { ok: true; value: unknown } | { ok: false; message: string };

const bad = (message: string): SubjectRead => ({ ok: false, message });

// Konu dosyası çalışma ağacı İÇİNDEN okunur: sembolik bağ/kavşak, ağaç dışı yol, düzenli olmayan dosya, çoklu sabit bağ ve 256 KB üstü reddedilir.
// Hata iletileri sabittir (dosya içeriği ya da JSON ayrıştırıcı alıntısı sızdırılmaz).
export function readSubjectFile(root: string, rel: string): SubjectRead {
  let path: string;
  try {
    path = resolveInsideRoot(root, rel);
  } catch {
    return bad("the subject file path is outside the workspace or goes through a symlink");
  }
  let fd: number;
  try {
    fd = openSync(path, "r");
  } catch {
    return bad("the subject file does not exist or cannot be opened");
  }
  try {
    const st = fstatSync(fd);
    if (!st.isFile()) return bad("the subject file is not a regular file");
    if (st.nlink > 1) return bad("the subject file is hard-linked; refusing to read it");
    if (st.size > MAX_SUBJECT_BYTES) return bad(`the subject file is larger than ${MAX_SUBJECT_BYTES / 1024} KB`);
    const buf = Buffer.alloc(MAX_SUBJECT_BYTES + 1);
    let n = 0;
    while (n <= MAX_SUBJECT_BYTES) {
      const r = readSync(fd, buf, n, buf.length - n, null);
      if (r === 0) break;
      n += r;
    }
    if (n > MAX_SUBJECT_BYTES) return bad(`the subject file is larger than ${MAX_SUBJECT_BYTES / 1024} KB`);
    try {
      return { ok: true, value: JSON.parse(buf.subarray(0, n).toString("utf8").replace(/^﻿/, "")) as unknown };
    } catch {
      return bad("the subject file is not valid JSON");
    }
  } catch {
    return bad("the subject file could not be read");
  } finally {
    closeSync(fd);
  }
}

// Konu okunamadıysa ürün hatası DEĞİL araç/girdi (infra) hatası olan tek testli bir koşu üretilir: teslim asla "passed" olmaz.
function subjectErrorRun(started: number, rel: string, message: string): RunResult {
  const t = mkTest(0, { suite: "subject", name: "the subject file can be read", outcome: "error", durationMs: Date.now() - started, message, detail: `subjectFile: ${rel}` });
  return mkRun("contracts-lab", started, [t], [], { lab: "contracts", subjectFile: rel });
}

export async function runContractsPlan(root: string, plan: VerificationPlan): Promise<RunResult> {
  const spec = plan.contracts as NonNullable<VerificationPlan["contracts"]>;
  const started = Date.now();
  const subject = readSubjectFile(root, spec.subjectFile);
  if (!subject.ok) return subjectErrorRun(started, spec.subjectFile, subject.message);
  try {
    return await new ContractsLabProvider().run({ subject: subject.value, contracts: spec.contracts, timeoutMs: Math.min(plan.timeoutMs, 30_000) }).result;
  } catch (err) {
    if (err instanceof LabSpecError) return subjectErrorRun(started, spec.subjectFile, `the subject or contracts were not accepted: ${err.message}`);
    throw err;
  }
}

export async function runStatesPlan(plan: VerificationPlan): Promise<RunResult> {
  return new StateLabProvider().run(plan.states as NonNullable<VerificationPlan["states"]>).result;
}

// Erişilebilirlik laboratuvarı (madde 27): çalışma ağacındaki statik HTML dosyaları güvenle okunur, hiçbir kod çalıştırılmaz.
// Plan/girdi kabul edilmezse (LabSpecError) ürün hatası DEĞİL araç/girdi (infra) hatası olan tek testli bir koşu üretilir: teslim asla "passed" olmaz.
export async function runA11yPlan(root: string, plan: VerificationPlan): Promise<RunResult> {
  const spec = plan.a11y as NonNullable<VerificationPlan["a11y"]>;
  const started = Date.now();
  try {
    return await new A11yLabProvider().run({ root, files: spec.files, contrastPairs: spec.contrastPairs, ...(spec.criteria ? { criteria: spec.criteria } : {}), timeoutMs: Math.min(plan.timeoutMs, 30_000) }).result;
  } catch (err) {
    if (err instanceof LabSpecError) {
      const t = mkTest(0, { suite: "a11y", name: "the a11y request can be run", outcome: "error", durationMs: Date.now() - started, message: `the a11y plan was not accepted: ${err.message}`, detail: `files: ${spec.files.length}`, criteria: Object.keys(spec.criteria ?? {}) });
      return mkRun("a11y-lab", started, [t], [], { lab: "a11y" });
    }
    throw err;
  }
}

// Tasarım laboratuvarı (madde 49 + 50): HTML/CSS dosyaları ve (satır içi ya da çalışma ağacından okunan) tasarım sözleşmesi; kod ÇALIŞTIRILMAZ.
// Plan kabul edilmezse (LabSpecError) araç/girdi (infra) hatası olan tek testli bir koşu üretilir: teslim asla "passed" olmaz. Okunamayan/bozuk specFile koşunun içinde aynı biçimde "error" olur.
export async function runDesignPlan(root: string, plan: VerificationPlan): Promise<RunResult> {
  const spec = plan.design as NonNullable<VerificationPlan["design"]>;
  const started = Date.now();
  try {
    return await new DesignLabProvider().run({ root, files: spec.files, ...(spec.spec ? { spec: spec.spec } : {}), ...(spec.specFile ? { specFile: spec.specFile } : {}), ...(spec.criteria ? { criteria: spec.criteria } : {}), timeoutMs: Math.min(plan.timeoutMs, 30_000) }).result;
  } catch (err) {
    if (err instanceof LabSpecError) {
      const t = mkTest(0, { suite: "design", name: "the design request can be run", outcome: "error", durationMs: Date.now() - started, message: `the design plan was not accepted: ${err.message}`, detail: `files: ${spec.files.length}`, criteria: Object.keys(spec.criteria ?? {}) });
      return mkRun("design-lab", started, [t], [], { lab: "design" });
    }
    throw err;
  }
}

// Mutasyon testi (madde 58): localTests dosyaları, kaynak dosyaların mutantlarına karşı çalışma ağacının geçici KOPYASINDA yeniden koşulur; gerçek ağaç değişmez.
// Plan kabul edilmezse (LabSpecError) araç/girdi (infra) hatası olan tek testli bir koşu üretilir: teslim asla "passed" olmaz.
export async function runMutationPlan(root: string, plan: VerificationPlan, evidenceDir: string): Promise<RunResult> {
  const spec = plan.mutation as NonNullable<VerificationPlan["mutation"]>;
  const tests = (plan.localTests as NonNullable<VerificationPlan["localTests"]>).files;
  const started = Date.now();
  try {
    return await new MutationLabProvider().run({ cwd: root, files: spec.files, testFiles: tests, ...(spec.maxMutants !== undefined ? { maxMutants: spec.maxMutants } : {}), ...(spec.minScore !== undefined ? { minScore: spec.minScore } : {}), totalTimeoutMs: Math.min(600_000, Math.max(30_000, plan.timeoutMs * 3)), evidenceDir }).result;
  } catch (err) {
    if (err instanceof LabSpecError) {
      const t = mkTest(0, { suite: "mutation", name: "the mutation request can be run", outcome: "error", durationMs: Date.now() - started, message: `the mutation plan was not accepted: ${err.message}`, detail: `files: ${spec.files.length}` });
      return mkRun("mutation-lab", started, [t], [], { lab: "mutation" });
    }
    throw err;
  }
}

// Koşunun test sonuçlarının özetini LOG kanıt dosyası olarak yazar (redactString'li) ve başarısız/hatalı testlerin evidenceRefs'ine ekler.
export function attachLabLog(run: RunResult, dir: string): RunResult {
  const id = `${run.runId}-lab-log`;
  const lines = [`provider: ${run.provider}`, `status: ${run.status}`, `totals: passed=${run.totals.passed} failed=${run.totals.failed} error=${run.totals.error} skipped=${run.totals.skipped}`, ""];
  for (const t of run.tests) lines.push(`[${t.outcome}] ${t.suite ?? "-"} / ${t.name}${t.error ? ` -- ${t.error.message}${t.error.detail ? `: ${t.error.detail}` : ""}` : ""}`);
  const text = `${redactString(lines.join("\n")).slice(0, 100_000)}\n`;
  run.evidence.push(saveEvidence(dir, id, "log", `${run.provider} test summary`, text, "log"));
  for (const t of run.tests) if ((t.outcome === "failed" || t.outcome === "error") && !t.evidenceRefs.includes(id)) t.evidenceRefs.push(id);
  return run;
}
