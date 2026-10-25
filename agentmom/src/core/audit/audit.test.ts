import { mkTmp } from "../../testing/tmp.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { openDb } from "../db/db.ts";
import { migrate } from "../db/migrate.ts";
import { AuditLog, JsonlAuditSink, MemoryAuditSink, SqliteAuditSink, listAudit } from "./audit.ts";
import { REDACTED, redact, redactString } from "./redact.ts";

const FAKE_KEY = "sk-" + "A1b2C3d4E5f6G7h8I9j0K1l2";
const FAKE_GH = "ghp_" + "abcdefghijklmnopqrstuvwxyz0123456789";
const FAKE_JWT = "eyJhbGciOiJIUzI1NiJ9" + ".eyJzdWIiOiIxMjM0NTY3ODkwIn0" + ".dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";

test("redacts secret-like strings", () => {
  const input = `a ${FAKE_KEY} b ${FAKE_GH} c Bearer abcdef1234567890XYZ d ${FAKE_JWT} e AKIAABCDEFGHIJKLMNOP`;
  const out = redactString(input);
  for (const leak of [FAKE_KEY, FAKE_GH, "abcdef1234567890XYZ", FAKE_JWT, "AKIAABCDEFGHIJKLMNOP"]) {
    assert.ok(!out.includes(leak), `leaked ${leak}`);
  }
  assert.ok(out.includes(REDACTED));
});

test("redacts assignments and private key blocks", () => {
  assert.equal(redactString("password=hunter2 ok"), `password=${REDACTED} ok`);
  const pem = "-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJBAKj34GkxFhD90vcNLYLInFEX6Ppy1tPf9Cnzj4p4WGeKLs1Pt8Qu\n-----END RSA PRIVATE KEY-----";
  assert.ok(!redactString(`x ${pem} y`).includes("MIIBOgIBAAJB"));
});

test("redacts sensitive keys at any depth but keeps secret_ref", () => {
  const out = redact({ user: "yusuf", apiKey: "plain", nested: { Authorization: "x", list: [{ password: "p" }] }, secret_ref: "secret:claude" }) as Record<string, any>;
  assert.equal(out.user, "yusuf");
  assert.equal(out.apiKey, REDACTED);
  assert.equal(out.nested.Authorization, REDACTED);
  assert.equal(out.nested.list[0].password, REDACTED);
  assert.equal(out.secret_ref, "secret:claude");
});

test("free text never gets a secret_ref exemption, and a bad secret_ref value is redacted", () => {
  assert.ok(!redactString("login secret:hunter2 now").includes("hunter2"));
  assert.ok(!JSON.stringify(redact({ note: "secret:claude" })).includes("secret:claude"));
  const out = redact({ secret_ref: "hunter2 plain value" }) as Record<string, unknown>;
  assert.ok(!JSON.stringify(out).includes("hunter2"));
});

test("stops at excessive depth instead of recursing forever", () => {
  const a: any = {};
  a.self = a;
  assert.doesNotThrow(() => redact(a));
});

test("writes to sqlite and jsonl, with secrets redacted in both", () => {
  const db = openDb(":memory:");
  migrate(db);
  const dir = mkTmp("agentmom-audit-");
  const jsonl = join(dir, "sub", "audit.jsonl");
  const mem = new MemoryAuditSink();
  const log = new AuditLog([new SqliteAuditSink(db), new JsonlAuditSink(jsonl), mem], () => new Date("2026-10-21T12:00:00Z"));
  log.record({
    initiator: { kind: "agent", id: "a1" },
    action: "provider.call",
    decision: "deny",
    result: `blocked ${FAKE_KEY}`,
    details: { token: FAKE_GH, note: `see ${FAKE_KEY}`, secret_ref: "secret:openai" },
  });
  const sqliteRows = listAudit(db);
  assert.equal(sqliteRows.length, 1);
  const fileText = readFileSync(jsonl, "utf8");
  const all = JSON.stringify(sqliteRows) + fileText + JSON.stringify(mem.events);
  assert.ok(!all.includes(FAKE_KEY));
  assert.ok(!all.includes(FAKE_GH));
  assert.ok(all.includes("secret:openai"));
  const row = sqliteRows[0];
  assert.equal(row?.initiator.kind, "agent");
  assert.equal(row?.decision, "deny");
  assert.equal(row?.ts, "2026-10-21T12:00:00.000Z");
  assert.equal(fileText.trim().split("\n").length, 1);
});

test("a failing sink surfaces the error (fail closed)", () => {
  const log = new AuditLog([{ write() { throw new Error("disk full"); } }]);
  assert.throws(() => log.record({ initiator: { kind: "system", id: "s" }, action: "x", decision: "allow", result: "ok" }), /disk full/);
});
