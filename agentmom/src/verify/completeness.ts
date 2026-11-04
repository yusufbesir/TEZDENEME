import { checkEvidenceFile } from "./evidence-files.ts";
import { SchemaError, totalsOf, validateRunResult } from "./schema.ts";
import type { RunResult } from "./schema.ts";

export interface Completeness {
  complete: boolean;
  problems: string[];
}

// Re-reads the evidence itself: schema, counts, files on disk (existence, size, hash), failure evidence, expected providers.
export function auditEvidence(runs: unknown[], expectedProviders: string[] = []): Completeness {
  const problems: string[] = [];
  const valid: RunResult[] = [];
  if (runs.length === 0) problems.push("there is no verification run at all");
  for (const [i, raw] of runs.entries()) {
    try {
      valid.push(validateRunResult(raw));
    } catch (err) {
      problems.push(`run ${i}: ${err instanceof SchemaError ? err.problems.join("; ") : String(err)}`);
    }
  }
  for (const r of valid) {
    const tag = `${r.provider}/${r.runId.slice(0, 8)}`;
    if (r.tests.length === 0) problems.push(`${tag}: no tests were recorded`);
    if (Date.parse(r.endedAt) < Date.parse(r.startedAt)) problems.push(`${tag}: ended before it started`);
    const recount = totalsOf(r.tests);
    if (JSON.stringify(recount) !== JSON.stringify(r.totals)) problems.push(`${tag}: totals do not match the tests`);
    const anyFailing = r.tests.some((t) => t.outcome === "failed" || t.outcome === "error");
    if (r.status === "passed" && anyFailing) problems.push(`${tag}: status is passed but a test failed`);
    if (r.status === "failed" && !r.tests.some((t) => t.outcome === "failed")) problems.push(`${tag}: status is failed but no test failed`);
    if (!r.evidence.some((e) => e.kind === "log")) problems.push(`${tag}: no log evidence`);
    if (r.provider === "browser" && !r.evidence.some((e) => e.kind === "screenshot") && r.tests.some((t) => t.id !== "run" && t.id !== "browser-launch")) problems.push(`${tag}: a browser run without any screenshot`);
    for (const t of r.tests) if ((t.outcome === "failed" || t.outcome === "error") && t.evidenceRefs.length === 0) problems.push(`${tag}: failed test "${t.name}" has no evidence`);
    for (const e of r.evidence) {
      const p = checkEvidenceFile(e);
      if (p) problems.push(`${tag}: ${p}`);
      else if (e.path === undefined) problems.push(`${tag}: evidence ${e.id} has no file`);
    }
  }
  for (const p of expectedProviders) if (!valid.some((r) => r.provider === p)) problems.push(`no run from the expected provider ${p}`);
  return { complete: problems.length === 0, problems };
}
