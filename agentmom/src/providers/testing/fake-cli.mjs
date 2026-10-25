// Test fixture that imitates a provider CLI. It is NOT a real provider: output shapes follow our own assumptions,
// so tests built on it prove adapter behavior only, never that a real CLI emits these lines.
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const format = process.argv[2];
const args = process.argv.slice(3);

let input = "";
for await (const chunk of process.stdin) input += chunk;
const lines = input.split("\n");
const mode = (lines[0] ?? "").trim();
const extra = lines.slice(1).join("\n");

const out = (o) => process.stdout.write(JSON.stringify(o) + "\n");
const message = (text) =>
  format === "claude"
    ? out({ type: "assistant", message: { content: [{ type: "text", text }] } })
    : format === "gemini"
      ? out({ type: "message", role: "assistant", content: text })
      : out({ type: "item.completed", item: { type: "agent_message", text } });
const start = () =>
  format === "claude" ? out({ type: "system", subtype: "init", model: "fake" }) : format === "gemini" ? out({ type: "init", model: "fake" }) : out({ type: "thread.started", thread_id: "t1" });
const finish = (text) =>
  format === "claude"
    ? out({ type: "result", subtype: "success", is_error: false, result: text, total_cost_usd: 0.01, usage: { input_tokens: 10, output_tokens: 5 } })
    : format === "gemini"
      ? out({ type: "result", status: "success", stats: { input_tokens: 10, output_tokens: 5 } })
      : out({ type: "turn.completed", usage: { input_tokens: 10, output_tokens: 5 } });
const fail = (text) =>
  format === "claude"
    ? out({ type: "result", subtype: "error", is_error: true, result: text })
    : format === "gemini"
      ? out({ type: "result", status: "error", error: { message: text } })
      : out({ type: "turn.failed", error: { message: text } });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (mode === "replay-stderr") {
  // Prints a recorded real stderr file (path on line 2) and exits with the recorded exit code (line 3).
  process.stderr.write(readFileSync(extra.split("\n")[0].trim(), "utf8"));
  process.exit(Number(extra.split("\n")[1] ?? 1));
}
if (mode === "replay") {
  // Prints a recorded real-output file verbatim (path given on the second prompt line).
  process.stdout.write(readFileSync(extra.trim(), "utf8"));
  process.exit(0);
}
start();
switch (mode) {
  case "ok":
    message("working");
    if (extra.startsWith("WRITE:")) writeFileSync(join(process.cwd(), extra.slice(6).trim()), "created by fake provider\n");
    message("done");
    finish("done");
    break;
  case "args":
    message(JSON.stringify({ args, env: Object.keys(process.env) }));
    finish("args");
    break;
  case "auth":
    process.stderr.write("Error: not logged in. Please run /login\n");
    process.exit(1);
    break;
  case "ratelimit":
    fail("429 rate limit reached, usage limit exceeded");
    process.exit(1);
    break;
  case "network":
    process.stderr.write("fetch failed: getaddrinfo ENOTFOUND api.example\n");
    process.exit(1);
    break;
  case "garbage":
    process.stdout.write("this is not json\n{broken\n");
    break;
  case "partial":
    message("before garbage");
    process.stdout.write("not json at all\n");
    finish("recovered");
    break;
  case "hang":
    message("started working");
    await sleep(60_000);
    break;
  case "flood":
    for (let i = 0; i < 400; i++) process.stdout.write(JSON.stringify({ type: "noise", pad: "x".repeat(8192) }) + "\n");
    await sleep(20_000);
    break;
  case "secret":
    message("token is sk-" + "Qq1Ww2Ee3Rr4Tt5Yy6Uu7Ii8 and ghp_" + "abcdefghijklmnopqrstuvwxyz0123456789");
    finish("api_key=hunter2hunter2");
    break;
  case "evilgit": {
    // Hostile provider: repoints the worktree .git at a crafted git directory whose config defines a clean filter.
    // Git for Windows marks .git hidden; a hostile process simply clears that attribute first.
    try {
      execFileSync("attrib", ["-H", join(process.cwd(), ".git")]);
    } catch {
      // not Windows, or already visible
    }
    writeFileSync(join(process.cwd(), ".git"), "gitdir: " + extra.trim() + "\n");
    writeFileSync(join(process.cwd(), ".gitattributes"), "* filter=evil\n");
    writeFileSync(join(process.cwd(), "evil.txt"), "payload\n");
    message("done");
    finish("done");
    break;
  }
  case "nonzero":
    process.exit(3);
    break;
  default:
    appendFileSync(join(process.cwd(), "unknown-mode.log"), mode + "\n");
    finish("unknown");
}
