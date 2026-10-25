import { mkTmp } from "../../testing/tmp.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { ConfigError, DEFAULT_CONFIG, deepMerge, loadConfig, validateLayer } from "./config.ts";

function dir(): string {
  return mkTmp("agentmom-cfg-");
}

function write(d: string, name: string, value: unknown): string {
  const p = join(d, name);
  writeFileSync(p, typeof value === "string" ? value : JSON.stringify(value));
  return p;
}

test("returns defaults when no layer exists", () => {
  const { config, sources } = loadConfig({ user: "Z:/nope.json" });
  assert.deepEqual(config, DEFAULT_CONFIG);
  assert.deepEqual(sources, ["default"]);
});

test("later layers override earlier ones: default < user < project < local", () => {
  const d = dir();
  const { config, sources } = loadConfig({
    user: write(d, "u.json", { server: { port: 1111 }, db: { path: "user.db" } }),
    project: write(d, "p.json", { server: { port: 2222 } }),
    local: write(d, "l.json", { server: { port: 3333 }, audit: { jsonlPath: "local.jsonl" } }),
  });
  assert.equal(config.server.port, 3333);
  assert.equal(config.db.path, "user.db");
  assert.equal(config.audit.jsonlPath, "local.jsonl");
  assert.deepEqual(sources, ["default", "user", "project", "local"]);
});

test("nested objects merge but arrays replace", () => {
  const d = dir();
  const { config } = loadConfig({
    user: write(d, "u.json", { policy: { defaultContract: { budget: { maxUsd: 3 }, allowedActions: ["file.read"] } } }),
  });
  const c = config.policy.defaultContract;
  assert.equal(c.budget.maxUsd, 3);
  assert.equal(c.budget.spentUsd, 0);
  assert.deepEqual(c.allowedActions, ["file.read"]);
  assert.equal(c.paidRoute, "none");
});

test("rejects unknown keys, wrong types and bad values with the path", () => {
  assert.deepEqual(validateLayer({ server: { host: "0.0.0.0" } }), ["$.server.host: unknown key"]);
  assert.ok(validateLayer({ server: { port: "80" } })[0]?.includes("expected finite number"));
  assert.ok(validateLayer({ server: { port: 70000 } })[0]?.includes("<= 65535"));
  assert.ok(validateLayer({ policy: { defaultContract: { allowedActions: ["rm.rf"] } } })[0]?.includes("expected one of"));
  assert.ok(validateLayer({ policy: { defaultContract: { paidRoute: "yes" } } })[0]?.includes("paidRoute"));
});

test("a server host cannot be configured (loopback only)", () => {
  const d = dir();
  assert.throws(() => loadConfig({ local: write(d, "l.json", { server: { host: "0.0.0.0" } }) }), ConfigError);
});

test("invalid JSON and invalid layers fail loudly instead of being skipped", () => {
  const d = dir();
  assert.throws(() => loadConfig({ user: write(d, "u.json", "{not json") }), /invalid JSON/);
  assert.throws(() => loadConfig({ project: write(d, "p.json", { db: { path: 5 } }) }), /expected string/);
});

test("rejects an inconsistent contract after merging", () => {
  const d = dir();
  assert.throws(
    () => loadConfig({ user: write(d, "u.json", { policy: { defaultContract: { budget: { maxUsd: 1, spentUsd: 2 } } } }) }),
    /spentUsd exceeds maxUsd/,
  );
  assert.throws(
    () => loadConfig({ user: write(d, "u.json", { policy: { defaultContract: { expiresAt: "tomorrow-ish" } } }) }),
    /not a valid date/,
  );
});

test("deepMerge does not mutate its inputs", () => {
  const a = { x: { y: 1 } };
  const b = { x: { z: 2 } };
  const out = deepMerge(a, b);
  assert.deepEqual(out, { x: { y: 1, z: 2 } });
  assert.deepEqual(a, { x: { y: 1 } });
});

const USER_POLICY = {
  policy: {
    defaultContract: {
      allowedActions: ["file.read", "file.write", "provider.call"],
      allowedDirs: ["D:/work/proj"],
      allowedProviders: ["claude"],
      trustedRepos: ["D:/work/proj/trusted"],
      budget: { maxUsd: 5, spentUsd: 1 },
      maxRuntimeMs: 60000,
      expiresAt: "2030-01-01T00:00:00Z",
      approvalRequiredActions: ["file.write"],
    },
  },
};

test("the user layer may widen the policy", () => {
  const d = dir();
  const { config } = loadConfig({ user: write(d, "u.json", USER_POLICY) });
  assert.deepEqual(config.policy.defaultContract.allowedActions, ["file.read", "file.write", "provider.call"]);
  assert.equal(config.policy.defaultContract.budget.maxUsd, 5);
});

test("project and local layers can narrow the policy", () => {
  const d = dir();
  const { config, sources } = loadConfig({
    user: write(d, "u.json", USER_POLICY),
    project: write(d, "p.json", { policy: { defaultContract: { allowedActions: ["file.read"], budget: { maxUsd: 2 }, maxRuntimeMs: 1000, approvalRequiredActions: ["file.write", "file.read"] } } }),
    local: write(d, "l.json", { policy: { defaultContract: { allowedDirs: ["D:/work/proj/sub"], expiresAt: "2029-01-01T00:00:00Z" } } }),
  });
  assert.deepEqual(sources, ["default", "user", "project", "local"]);
  assert.deepEqual(config.policy.defaultContract.allowedActions, ["file.read"]);
  assert.equal(config.policy.defaultContract.budget.maxUsd, 2);
  assert.deepEqual(config.policy.defaultContract.allowedDirs, ["D:/work/proj/sub"]);
});

test("project and local layers cannot widen the policy (untrusted workspace files)", () => {
  const d = dir();
  const user = write(d, "u.json", USER_POLICY);
  const attempts: Array<[string, unknown, RegExp]> = [
    ["actions", { allowedActions: ["shell.exec"] }, /cannot add shell\.exec/],
    ["providers", { allowedProviders: ["openai"] }, /cannot add openai/],
    ["trusted", { trustedRepos: ["D:/work/proj/other"] }, /not inside an already trusted/],
    ["dirs", { allowedDirs: ["C:/Windows"] }, /outside the directories/],
    ["dirs-traversal", { allowedDirs: ["D:/work/proj/../other"] }, /outside the directories/],
    ["paid", { paidRoute: "approved" }, /cannot grant paid-route/],
    ["budget", { budget: { maxUsd: 100 } }, /cannot raise the budget/],
    ["spent", { budget: { spentUsd: 0 } }, /cannot lower spent/],
    ["runtime", { maxRuntimeMs: 999999 }, /cannot raise the runtime/],
    ["expiry", { expiresAt: "2040-01-01T00:00:00Z" }, /cannot extend/],
    ["drop-approval", { approvalRequiredActions: [] }, /cannot drop file\.write/],
  ];
  for (const [name, contract, pattern] of attempts) {
    for (const layer of ["project", "local"] as const) {
      const file = write(d, `${layer}-${name}.json`, { policy: { defaultContract: contract } });
      assert.throws(() => loadConfig({ user, [layer]: file }), pattern, `${layer}:${name}`);
    }
  }
});

test("project and local layers cannot point db or audit outside the data directory", () => {
  const d = dir();
  for (const bad of ["C:/Windows/x.db", "/etc/x.db", "../x.db", "a/../../x.db", String.raw`\\server\share\x.db`]) {
    assert.throws(() => loadConfig({ project: write(d, "p.json", { db: { path: bad } }) }), /relative path/, bad);
    assert.throws(() => loadConfig({ local: write(d, "l.json", { audit: { jsonlPath: bad } }) }), /relative path/, bad);
  }
  assert.equal(loadConfig({ project: write(d, "ok.json", { db: { path: "data/x.db" } }) }).config.db.path, "data/x.db");
});

test("forbiddenDirs: layers can add but never remove a forbidden directory", () => {
  const d = dir();
  const user = write(d, "u.json", { policy: { defaultContract: { forbiddenDirs: ["D:/Arsiv-test"] } } });
  const keep = write(d, "p1.json", { policy: { defaultContract: { forbiddenDirs: ["D:/Arsiv-test", "D:/more"] } } });
  const drop = write(d, "p2.json", { policy: { defaultContract: { forbiddenDirs: ["D:/more"] } } });
  const empty = write(d, "p3.json", { policy: { defaultContract: { forbiddenDirs: [] } } });
  assert.deepEqual(loadConfig({ user, project: keep }).config.policy.defaultContract.forbiddenDirs, ["D:/Arsiv-test", "D:/more"]);
  assert.throws(() => loadConfig({ user, project: drop }), /cannot drop/);
  assert.throws(() => loadConfig({ user, project: empty }), /cannot drop/);
});
