import { test, after } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { CredentialManagerStore, runBridgeForTest } from "./credman.ts";

const store = new CredentialManagerStore();
const created: string[] = [];

function freshRef(): string {
  const ref = `secret:test-${randomBytes(6).toString("hex")}`;
  created.push(ref);
  return ref;
}

// Only entries this file created (random secret:test-* names) are ever removed.
after(() => {
  for (const ref of created) {
    try {
      store.remove(ref);
    } catch {
      // best effort cleanup of our own test entry
    }
  }
});

test("writes, reads and removes a real Credential Manager entry (own test entry only)", () => {
  const ref = freshRef();
  const value = "unit-test-value-" + randomBytes(8).toString("hex") + " ünïcode ✓";
  assert.equal(store.has(ref), false);
  assert.equal(store.get(ref), undefined);
  store.put(ref, value);
  assert.equal(store.has(ref), true);
  assert.equal(store.get(ref), value);
  assert.ok(store.list().includes(ref));
  assert.equal(store.remove(ref), true);
  assert.equal(store.has(ref), false);
  assert.equal(store.get(ref), undefined);
  assert.equal(store.remove(ref), false);
});

test("overwrites an existing entry", () => {
  const ref = freshRef();
  store.put(ref, "first");
  store.put(ref, "second");
  assert.equal(store.get(ref), "second");
});

test("rejects invalid refs, empty and oversized values before touching the store", () => {
  assert.throws(() => store.put("claude", "x"), /invalid secret_ref/);
  assert.throws(() => store.get("secret:UP"), /invalid secret_ref/);
  assert.throws(() => store.put(freshRef(), ""), /empty/);
  assert.throws(() => store.put(freshRef(), "a".repeat(3000)), /too large/);
});

test("the bridge refuses any target that is not prefixed agentmom: (exit 3)", () => {
  for (const op of ["get", "exists", "delete", "put"]) {
    assert.equal(runBridgeForTest(op, "other:something").code, 3, op);
    assert.equal(runBridgeForTest(op, "LegacyGeneric").code, 3, op);
  }
});

test("list only returns agentmom: entries as secret refs", () => {
  const ref = freshRef();
  store.put(ref, "v");
  for (const r of store.list()) assert.match(r, /^secret:[a-z0-9]/);
});

test("the stored value never appears in error messages", () => {
  const ref = freshRef();
  try {
    store.put(ref, "x".repeat(3000));
  } catch (err) {
    assert.ok(!String(err).includes("xxxx"));
  }
});
