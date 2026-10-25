import { mkdirSync, mkdtempSync } from "node:fs";
import { join, resolve } from "node:path";

// Tests write only under the repository's data/test-tmp (or AGENTMOM_TEST_TMP), never the system temp directory on C:.
export function tmpRoot(): string {
  const base = resolve(process.env.AGENTMOM_TEST_TMP ?? join(process.cwd(), "data", "test-tmp"));
  mkdirSync(base, { recursive: true });
  return base;
}

export function mkTmp(prefix: string): string {
  return mkdtempSync(join(tmpRoot(), prefix));
}
