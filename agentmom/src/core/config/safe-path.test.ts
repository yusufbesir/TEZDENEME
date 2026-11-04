import { mkTmp } from "../../testing/tmp.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { resolveInsideRoot } from "./safe-path.ts";

function tmp(): string {
  return mkTmp("agentmom-sp-");
}

test("accepts plain and not-yet-existing paths inside the root", () => {
  const root = tmp();
  assert.ok(resolveInsideRoot(root, "data/agentmom.db").endsWith("agentmom.db"));
  mkdirSync(join(root, "data"));
  assert.ok(resolveInsideRoot(root, "data/audit.jsonl").endsWith("audit.jsonl"));
});

test("rejects absolute paths and traversal", () => {
  const root = tmp();
  assert.throws(() => resolveInsideRoot(root, "../x"), /inside the workspace/);
  assert.throws(() => resolveInsideRoot(root, join(root, "x")), /inside the workspace/);
});

test("refuses a data directory that is a junction or symlink to the outside", () => {
  const root = tmp();
  const outside = tmp();
  symlinkSync(outside, join(root, "data"), "junction");
  assert.throws(() => resolveInsideRoot(root, "data/agentmom.db"), /symlink or junction/);
});

test("refuses a symlinked file inside a real data directory", () => {
  const root = tmp();
  const outside = tmp();
  mkdirSync(join(root, "data"));
  symlinkSync(outside, join(root, "data", "sub"), "junction");
  assert.throws(() => resolveInsideRoot(root, "data/sub/x.db"), /symlink or junction/);
});
