import type { RunResult } from "./schema.ts";

export interface VerificationHandle {
  runId: string;
  result: Promise<RunResult>;
  cancel(): Promise<void>;
}

export interface VerificationProvider<Req> {
  readonly id: string;
  run(request: Req): VerificationHandle;
}

// A test claims to cover a criterion in one of two explicit ways: an [ac:<id>] tag in its name, or a request-level mapping.
export function criteriaFor(testName: string, map?: Record<string, string[]>): string[] {
  const ids = new Set<string>();
  for (const m of testName.matchAll(/\[ac:([A-Za-z0-9_-]+)\]/g)) ids.add(m[1] as string);
  for (const [id, needles] of Object.entries(map ?? {})) if (needles.some((n) => n.length > 0 && testName.includes(n))) ids.add(id);
  return [...ids];
}
