// Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Doğrulama laboratuvarı D6a / madde 56: davranış sözleşmeleri ve değişmezler. Yerel, deterministik, modelsiz.
// Her sözleşme bir kuraldır (rules.ts); konu (subject) doğrudan veri ya da {before, after} olabilir, kurallar yolla before.x / after.y der.
import { randomUUID } from "node:crypto";
import { criteriaFor } from "../provider.ts";
import type { VerificationHandle, VerificationProvider } from "../provider.ts";
import type { RunResult, TestResult } from "../schema.ts";
import { LabSpecError, boundedMs, criteriaIds, evaluateRule, mkRun, mkTest, plainObject, reqString, tagName, validateRule } from "./rules.ts";
import type { Rule } from "./rules.ts";

export const CONTRACT_KINDS = ["invariant", "precondition", "postcondition"] as const;
export type ContractKind = (typeof CONTRACT_KINDS)[number];

export interface ContractsRequest {
  subject: unknown;
  contracts: Array<{ name: string; kind: ContractKind; rule: unknown; criteria?: string[] }>;
  timeoutMs?: number;
}

export interface ContractSpec {
  name: string;
  kind: ContractKind;
  rule: Rule;
  criteria: string[];
}

interface ContractsPlan {
  subject: unknown;
  contracts: ContractSpec[];
  timeoutMs: number;
}

export const MAX_CONTRACTS = 100;
export const MAX_SUBJECT_BYTES = 256 * 1024;

export function validateContractsRequest(input: unknown): ContractsPlan {
  const o = plainObject(input, "spec", ["subject", "contracts", "timeoutMs"]);
  if (o.subject === undefined) throw new LabSpecError("spec.subject is required");
  let text: string;
  try {
    text = JSON.stringify(o.subject);
  } catch {
    throw new LabSpecError("spec.subject must be plain JSON data");
  }
  if (typeof text !== "string") throw new LabSpecError("spec.subject must be plain JSON data");
  if (Buffer.byteLength(text) > MAX_SUBJECT_BYTES) throw new LabSpecError(`spec.subject is larger than ${MAX_SUBJECT_BYTES / 1024} KB`);
  const contracts = validateContractList(o.contracts);
  return { subject: JSON.parse(text) as unknown, contracts, timeoutMs: boundedMs(o.timeoutMs, "spec.timeoutMs", 30_000, 10_000) };
}

// Sözleşme listesi doğrulaması: laboratuvar isteği ve iş akışı doğrulama planı (workflows/types.ts) aynı doğrulayıcıyı kullanır.
export function validateContractList(input: unknown): ContractSpec[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_CONTRACTS) throw new LabSpecError(`spec.contracts must list 1 to ${MAX_CONTRACTS} contracts`);
  return input.map((raw, i): ContractSpec => {
    const c = plainObject(raw, `contracts[${i}]`, ["name", "kind", "rule", "criteria"]);
    if (typeof c.kind !== "string" || !(CONTRACT_KINDS as readonly string[]).includes(c.kind)) throw new LabSpecError(`contracts[${i}].kind must be one of ${CONTRACT_KINDS.join(", ")}`);
    if (c.rule === undefined) throw new LabSpecError(`contracts[${i}].rule is required`);
    return { name: reqString(c.name, `contracts[${i}].name`, 200), kind: c.kind as ContractKind, rule: validateRule(c.rule), criteria: criteriaIds(c.criteria, `contracts[${i}]`) };
  });
}

export class ContractsLabProvider implements VerificationProvider<ContractsRequest> {
  readonly id = "contracts-lab";

  // Girdi hatası burada, çalışmadan ÖNCE LabSpecError olarak fırlar.
  run(request: ContractsRequest): VerificationHandle {
    const req = validateContractsRequest(request);
    const runId = randomUUID();
    return { runId, result: Promise.resolve(this.execute(req)), cancel: async () => {} };
  }

  private execute(req: ContractsPlan): RunResult {
    const started = Date.now();
    const deadline = started + req.timeoutMs;
    const tests: TestResult[] = [];
    let timedOut = false;
    req.contracts.forEach((c, i) => {
      const name = tagName(c.name, c.criteria);
      const criteria = criteriaFor(name);
      if (Date.now() > deadline) {
        timedOut = true;
        tests.push(mkTest(i, { suite: c.kind, name, outcome: "skipped", durationMs: 0, criteria }));
        return;
      }
      const t0 = Date.now();
      try {
        const r = evaluateRule(c.rule, req.subject, { deadline });
        tests.push(r.ok ? mkTest(i, { suite: c.kind, name, outcome: "passed", durationMs: Date.now() - t0, criteria }) : mkTest(i, { suite: c.kind, name, outcome: "failed", durationMs: Date.now() - t0, message: `${c.kind} violated`, detail: r.detail, criteria }));
      } catch (e) {
        // Değerlendirme hatası (ör. çok fazla düğüm eşleşmesi, kural değerlendirme bütçesi/süresi aşımı) ürünün değil aracın/girdinin hatasıdır.
        tests.push(mkTest(i, { suite: c.kind, name, outcome: "error", durationMs: Date.now() - t0, message: "the contract could not be evaluated", detail: e instanceof Error ? e.message : String(e), criteria }));
      }
    });
    const kinds: Record<string, number> = {};
    for (const c of req.contracts) kinds[c.kind] = (kinds[c.kind] ?? 0) + 1;
    return mkRun(this.id, started, tests, [], { lab: "contracts", contracts: req.contracts.length, kinds }, timedOut ? "timed_out" : undefined);
  }
}
