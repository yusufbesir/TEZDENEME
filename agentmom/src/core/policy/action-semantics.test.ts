// Eylem anlamları tablosu testleri (madde 94, D5a). Yazan: Claude [İP:AgentMom D5a]; sahip: Yusuf. Yalnız yazan yapay zeka değiştirir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTION_SEMANTICS, REQUIRED_ACTIONS, USER_ACTIONS, semanticsFor } from "./action-semantics.ts";
import { ACTION_TYPES } from "./types.ts";

test("every policy action (ACTION_TYPES) has a semantics record: adding an action without a record breaks this test", () => {
  for (const a of ACTION_TYPES) assert.ok(semanticsFor(a), `missing semantics for policy action ${a}`);
});

test("every user-approved app action has a record (file.recycle, provider.disable/enable, backup.create, subsession.*)", () => {
  for (const a of ["file.recycle", "provider.disable", "provider.enable", "backup.create", "subsession.create", "subsession.rename", "subsession.pin", "subsession.archive"]) {
    assert.ok((USER_ACTIONS as readonly string[]).includes(a), a);
    assert.ok(semanticsFor(a), a);
  }
  for (const a of REQUIRED_ACTIONS) assert.ok(semanticsFor(a), a);
});

test("records are well-formed, unique, Turkish text, and irreversible ones say so", () => {
  const seen = new Set<string>();
  for (const s of ACTION_SEMANTICS) {
    assert.ok(!seen.has(s.action), `duplicate ${s.action}`);
    seen.add(s.action);
    assert.ok(["yes", "partial", "no"].includes(s.reversible), s.action);
    assert.ok(["low", "medium", "high"].includes(s.sensitivity), s.action);
    assert.ok(s.effect.length > 5 && s.undo.length > 5, s.action);
    if (s.reversible === "no") assert.match(s.undo, /geri alınamaz/, s.action);
  }
  assert.equal(semanticsFor("shell.exec")?.reversible, "no");
  assert.equal(semanticsFor("network.request")?.reversible, "no");
  assert.equal(semanticsFor("file.recycle")?.reversible, "yes");
  assert.match(semanticsFor("file.recycle")?.undo ?? "", /Geri Dönüşüm/);
  assert.equal(semanticsFor("unknown.thing"), null, "no invented record for an unknown action");
  assert.ok(Object.isFrozen(ACTION_SEMANTICS) && Object.isFrozen(ACTION_SEMANTICS[0]));
});
