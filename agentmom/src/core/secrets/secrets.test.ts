import { test } from "node:test";
import assert from "node:assert/strict";
import { MemorySecretStore, isSecretRef } from "./secrets.ts";

test("stores and reads a value by secret_ref", () => {
  const s = new MemorySecretStore();
  s.put("secret:claude", "value-1");
  assert.equal(s.get("secret:claude"), "value-1");
  assert.equal(s.has("secret:claude"), true);
  assert.equal(s.get("secret:missing"), undefined);
});

test("rejects malformed refs and empty values", () => {
  const s = new MemorySecretStore();
  for (const bad of ["claude", "secret:", "secret:UPPER", "secret:../x", "secret:a b"]) {
    assert.equal(isSecretRef(bad), false, bad);
    assert.throws(() => s.put(bad, "v"));
  }
  assert.throws(() => s.put("secret:ok", ""));
});

test("serializing the store never exposes values", () => {
  const s = new MemorySecretStore();
  s.put("secret:openai", "very-private-value");
  assert.ok(!JSON.stringify(s).includes("very-private-value"));
  assert.deepEqual(s.list(), ["secret:openai"]);
});
