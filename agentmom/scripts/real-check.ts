// Manual verification against the REAL CLIs installed on this machine. Not part of `npm test` (needs login, uses subscription quota).
// Usage: node scripts/real-check.ts connection | node scripts/real-check.ts codex-run
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { redactString } from "../src/core/audit/redact.ts";
import { buildChildEnv } from "../src/providers/child-env.ts";
import { join, resolve } from "node:path";
import { CLAUDE_EXE, ClaudeCodeAdapter, NODE_DIR } from "../src/providers/claude-code.ts";
import { CodexAdapter } from "../src/providers/codex.ts";
import { GEMINI_ENTRY, GeminiAdapter, NODE_EXE } from "../src/providers/gemini.ts";

const mode = process.argv[2];

if (mode === "connection") {
  for (const a of [new ClaudeCodeAdapter(), new CodexAdapter()]) {
    const r = await a.testConnection();
    console.log(JSON.stringify({ provider: a.id, ...r }));
    console.log(JSON.stringify(a.describeCapabilities().filter((c) => ["testConnection", "execute"].includes(c.operation))));
  }
} else if (mode === "codex-run") {
  const base = resolve("data", "real-check");
  mkdirSync(base, { recursive: true });
  const repo = mkdtempSync(join(base, "codex-"));
  const git = (...args: string[]) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { cwd: repo, stdio: "pipe" });
  git("init", "-q");
  writeFileSync(join(repo, "hello.txt"), "hello\n");
  git("add", "-A");
  git("commit", "-q", "-m", "init");
  const a = new CodexAdapter({ tempDir: resolve("data", "provider-tmp") });
  const h = a.execute({
    taskId: "real-check",
    prompt: "Reply with exactly the single word: pong. Do not run any commands and do not modify files.",
    cwd: repo,
    sandbox: { permission: "read_only", allowedTools: ["Read", "Glob", "Grep"] },
    timeoutMs: 180_000,
  });
  const events: unknown[] = [];
  for await (const e of a.streamEvents(h.executionId)) events.push(e);
  const r = await h.result;
  console.log(JSON.stringify({ result: r, eventTypes: events.map((e) => (e as { type: string }).type), usage: a.getUsage(h.executionId) }, null, 1));
  console.log("RAW TAIL (redacted):", a.collectEvidence(h.executionId).outputTail.slice(-1500));
} else if (mode === "claude-run" || mode === "gemini-run") {
  const base = resolve("data", "real-check");
  mkdirSync(base, { recursive: true });
  const repo = mkdtempSync(join(base, `${mode}-`));
  const git = (...args: string[]) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { cwd: repo, stdio: "pipe" });
  git("init", "-q");
  writeFileSync(join(repo, "hello.txt"), "hello\n");
  git("add", "-A");
  git("commit", "-q", "-m", "init");
  const tempDir = resolve("data", "provider-tmp");
  // Gemini execution is disabled by default (unverified); this one-off check opts in explicitly.
  const a = mode === "claude-run" ? new ClaudeCodeAdapter({ tempDir }) : new GeminiAdapter({ tempDir, allowUnverifiedExecution: true });
  const h = a.execute({
    taskId: "real-check",
    prompt: "Reply with exactly the single word: pong. Do not run any commands and do not modify files.",
    cwd: repo,
    sandbox: { permission: "read_only", allowedTools: ["Read", "Glob", "Grep"] },
    timeoutMs: 180_000,
  });
  const events: unknown[] = [];
  for await (const e of a.streamEvents(h.executionId)) events.push(e);
  const r = await h.result;
  console.log(JSON.stringify({ provider: a.id, result: r, eventTypes: events.map((e) => (e as { type: string }).type), usage: a.getUsage(h.executionId) }, null, 1));
  console.log("RAW TAIL (redacted):", a.collectEvidence(h.executionId).outputTail.slice(-3500));
} else if (mode === "claude-record" || mode === "gemini-record") {
  // Records the CLI's complete raw stdout (redacted) to a file, to be kept as a test fixture of REAL output.
  const out = process.argv[3] as string;
  const base = resolve("data", "real-check");
  mkdirSync(base, { recursive: true });
  const repo = mkdtempSync(join(base, `${mode}-`));
  const git = (...args: string[]) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { cwd: repo, stdio: "pipe" });
  git("init", "-q");
  writeFileSync(join(repo, "hello.txt"), "hello\n");
  git("add", "-A");
  git("commit", "-q", "-m", "init");
  const prompt = "Reply with exactly the single word: pong. Do not run any commands and do not modify files.";
  const env = buildChildEnv({ extraPathDirs: [NODE_DIR], tempDir: resolve("data", "provider-tmp") });
  const spec =
    mode === "claude-record"
      ? { cmd: CLAUDE_EXE, args: ["-p", "--output-format", "stream-json", "--verbose", "--no-session-persistence", "--safe-mode", "--permission-mode", "plan", "--permission-prompts", "none", "--tools", "Read,Glob,Grep", "--allowedTools", "Read,Glob,Grep"], input: prompt }
      : { cmd: NODE_EXE, args: [GEMINI_ENTRY, "-p", prompt, "-o", "stream-json", "--approval-mode", "plan", "-e", "none"], input: "" };
  const r = spawnSync(spec.cmd, spec.args, { cwd: repo, env, input: spec.input, encoding: "utf8", timeout: 180_000, windowsHide: true });
  writeFileSync(out, redactString(r.stdout ?? ""), { flag: "wx" });
  console.log(JSON.stringify({ exit: r.status, stdoutBytes: (r.stdout ?? "").length, stderrTail: redactString(r.stderr ?? "").slice(-600) }));
} else if (mode === "claude-edge") {
  // Real failure / timeout / cancel behaviour of the Claude adapter (kind = badmodel | timeout | cancel). Prints the observed result and the redacted raw tail (kept as fixtures of REAL output).
  const kind = process.argv[3];
  const base = resolve("data", "real-check");
  mkdirSync(base, { recursive: true });
  const repo = mkdtempSync(join(base, `claude-${kind}-`));
  const git = (...args: string[]) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...args], { cwd: repo, stdio: "pipe" });
  git("init", "-q");
  writeFileSync(join(repo, "hello.txt"), "hello\n");
  git("add", "-A");
  git("commit", "-q", "-m", "init");
  const a = new ClaudeCodeAdapter({ tempDir: resolve("data", "provider-tmp") });
  const h = a.execute({
    taskId: "real-check",
    prompt: "Reply with exactly the single word: pong. Do not run any commands and do not modify files.",
    cwd: repo,
    sandbox: { permission: "read_only", allowedTools: ["Read", "Glob", "Grep"] },
    timeoutMs: kind === "timeout" ? 1500 : 180_000,
    ...(kind === "badmodel" ? { model: "no-such-model-xyz" } : {}),
  });
  if (kind === "cancel") setTimeout(() => void a.cancel(h.executionId), 1200);
  const events: unknown[] = [];
  for await (const e of a.streamEvents(h.executionId)) events.push(e);
  const r = await h.result;
  console.log(JSON.stringify({ kind, result: r, eventTypes: events.map((e) => (e as { type: string }).type), usage: a.getUsage(h.executionId) }, null, 1));
  console.log("RAW TAIL (redacted):", a.collectEvidence(h.executionId).outputTail.slice(-2500));
} else {
  console.log("usage: connection | codex-run | claude-run | gemini-run | claude-record <file> | gemini-record <file> | claude-edge <badmodel|timeout|cancel>");
}
