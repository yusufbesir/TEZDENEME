import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mkTmp } from "../../testing/tmp.ts";
import { AuthRegistry, writeTokenFile } from "./auth.ts";

test("the user token authenticates as the user", () => {
  const auth = new AuthRegistry();
  assert.deepEqual(auth.authenticate(`Bearer ${auth.userToken}`), { kind: "user", id: "local-user" });
});

test("an issued agent token authenticates as that agent, never as the user", () => {
  const auth = new AuthRegistry();
  const t = auth.issueAgentToken("claude-run-1");
  assert.deepEqual(auth.authenticate(`Bearer ${t}`), { kind: "agent", id: "claude-run-1" });
  assert.notEqual(t, auth.userToken);
});

test("rejects missing, malformed, wrong and truncated tokens", () => {
  const auth = new AuthRegistry();
  for (const h of [undefined, "", "Bearer", "Basic abc", `Bearer ${auth.userToken}x`, `Bearer ${auth.userToken.slice(0, -1)}`, `bearer ${auth.userToken}`, "Bearer " + "A".repeat(43)]) {
    assert.equal(auth.authenticate(h), undefined, String(h));
  }
});

test("each registry has its own token", () => {
  assert.notEqual(new AuthRegistry().userToken, new AuthRegistry().userToken);
});

test("writes the token file with a trailing newline", () => {
  const auth = new AuthRegistry();
  const path = join(mkTmp("agentmom-auth-"), "session.token");
  writeTokenFile(path, auth.userToken);
  assert.equal(readFileSync(path, "utf8"), auth.userToken + "\n");
});

test("issued tokens are masked wherever they appear in audit-style text", async () => {
  const { redactString } = await import("../audit/redact.ts");
  const auth = new AuthRegistry();
  const agent = auth.issueAgentToken("a");
  const text = redactString(`user=${auth.userToken} agent=${agent} Authorization: Bearer ${auth.userToken}`);
  assert.ok(!text.includes(auth.userToken) && !text.includes(agent));
});
