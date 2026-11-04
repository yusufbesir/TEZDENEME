// Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Doğrulama laboratuvarı D6a / madde 53: birleşik laboratuvar. Üç yerel, modelsiz sağlayıcıyı tek girişte toplar ve ortak RunResult üretir.
import type { RunResult } from "../schema.ts";
import { validateRunResult } from "../schema.ts";
import { A11yLabProvider } from "./a11y.ts";
import type { A11yRequest } from "./a11y.ts";
import { ApiLabProvider } from "./api.ts";
import type { ApiLabRequest } from "./api.ts";
import { ContractsLabProvider } from "./contracts.ts";
import type { ContractsRequest } from "./contracts.ts";
import { DesignLabProvider } from "./design.ts";
import type { DesignRequest } from "./design.ts";
import { LabSpecError } from "./rules.ts";
import { StateLabProvider } from "./state.ts";
import type { StateRequest } from "./state.ts";

export { LabSpecError } from "./rules.ts";

export const LAB_KINDS = ["api", "contracts", "state", "a11y", "design"] as const;
export type LabKind = (typeof LAB_KINDS)[number];

export function isLabKind(v: unknown): v is LabKind {
  return typeof v === "string" && (LAB_KINDS as readonly string[]).includes(v);
}

// Girdi hatası (bilinmeyen tür ya da geçersiz spec) LabSpecError olarak fırlar; çalışma sırasındaki araç hataları test sonucunda "infra" olur.
// opts.forbiddenPorts: api laboratuvarının hedefi olamayacak portlar (AgentMom'un kendi portu). opts.signal: abort olursa koşu iptal edilir (api: uçtaki istek yok edilir, kalan adımlar atlanır).
export interface RunLabOptions {
  signal?: AbortSignal;
  forbiddenPorts?: readonly number[];
}

export async function runLab(kind: string, spec: unknown, opts?: RunLabOptions): Promise<RunResult> {
  if (!isLabKind(kind)) throw new LabSpecError(`unknown lab kind; expected one of ${LAB_KINDS.join(", ")}`);
  const handle =
    kind === "api"
      ? new ApiLabProvider().run(spec as ApiLabRequest, opts?.forbiddenPorts ? { forbiddenPorts: opts.forbiddenPorts } : undefined)
      : kind === "contracts"
        ? new ContractsLabProvider().run(spec as ContractsRequest)
        : kind === "a11y"
          ? new A11yLabProvider().run(spec as A11yRequest)
          : kind === "design"
            ? new DesignLabProvider().run(spec as DesignRequest)
            : new StateLabProvider().run(spec as StateRequest);
  const signal = opts?.signal;
  const onAbort = (): void => {
    handle.cancel().catch(() => undefined);
  };
  if (signal) {
    if (signal.aborted) onAbort();
    else signal.addEventListener("abort", onAbort, { once: true });
  }
  try {
    return validateRunResult(await handle.result);
  } finally {
    signal?.removeEventListener("abort", onAbort);
  }
}

export interface LabSummary {
  total: number;
  passed: number;
  failed: number;
  error: number;
  skipped: number;
  byProvider: Record<string, { total: number; passed: number; failed: number; error: number; skipped: number }>;
}

export function summarizeRuns(runs: RunResult[]): LabSummary {
  const sum: LabSummary = { total: 0, passed: 0, failed: 0, error: 0, skipped: 0, byProvider: {} };
  for (const r of runs) {
    const p = (sum.byProvider[r.provider] ??= { total: 0, passed: 0, failed: 0, error: 0, skipped: 0 });
    for (const k of ["passed", "failed", "error", "skipped"] as const) {
      sum[k] += r.totals[k];
      p[k] += r.totals[k];
    }
    const n = r.totals.passed + r.totals.failed + r.totals.error + r.totals.skipped;
    sum.total += n;
    p.total += n;
  }
  return sum;
}
