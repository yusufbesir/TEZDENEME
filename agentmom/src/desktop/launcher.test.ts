// Pure parts of the desktop launcher. Owner: Claude [IP:AgentMom Faz 11].
import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEdgeArgs, findEdge, launcherPaths, parseLock, pidAlive } from "./launcher.ts";

const TICKET = "A".repeat(32);

test("the window command line carries the one-time ticket and an AgentMom-only profile, never the session token", () => {
  const args = buildEdgeArgs({ port: 8787, ticket: TICKET, profileDir: "D:\\x\\profile" });
  assert.equal(args[0], `--app=http://127.0.0.1:8787/desktop/enter?t=${TICKET}`);
  assert.ok(args.includes("--user-data-dir=D:\\x\\profile"));
  assert.ok(!args.join(" ").includes("token"), "no token on the command line");
  assert.ok(args.every((a) => !/[\r\n]/.test(a)));
});
test("a malformed ticket or port is refused before anything is started", () => {
  assert.throws(() => buildEdgeArgs({ port: 8787, ticket: "x&calc", profileDir: "p" }));
  assert.throws(() => buildEdgeArgs({ port: 8787, ticket: TICKET + "\n--evil", profileDir: "p" }));
  assert.throws(() => buildEdgeArgs({ port: 87.5, ticket: TICKET, profileDir: "p" }));
});
test("Edge is searched in the two standard places only; none found = null", () => {
  assert.equal(findEdge(() => false), null);
  assert.equal(findEdge((p) => p.includes("(x86)")), "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe");
});
test("lock files: junk and empty (closed) locks are not 'running'", () => {
  assert.deepEqual(parseLock('{"pid":123,"port":8787}'), { pid: 123, port: 8787 });
  for (const t of ["", "{", "{}", '{"pid":-1,"port":1}', '{"pid":"a","port":1}']) assert.equal(parseLock(t), null);
  assert.equal(pidAlive(process.pid), true);
  assert.equal(pidAlive(2147483646), false);
});
test("the profile, lock and log live under the state folder on D:, not in the repository", () => {
  const p = launcherPaths("D:\\YusufII\\Projeler\\agentmom", {});
  for (const f of [p.profileDir, p.lockFile, p.logFile]) assert.match(f, /^D:\\YusufII\\Projeler\\agentmom-state\\desktop/i);
});

import { expectedProof } from "./launcher.ts";
test("the launcher's expected proof depends on the token and the nonce", () => {
  const a = expectedProof("tok-a", "n".repeat(20));
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.notEqual(a, expectedProof("tok-b", "n".repeat(20)));
  assert.notEqual(a, expectedProof("tok-a", "m".repeat(20)));
});
