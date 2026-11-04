import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { isSecretRef } from "./secrets.ts";
import type { SecretStore } from "./secrets.ts";

const SCRIPT = join(import.meta.dirname, "credman.ps1");
const POWERSHELL = join(process.env.SystemRoot ?? "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
const PREFIX = "agentmom:";
const MAX_BYTES = 2560;

function target(ref: string): string {
  if (!isSecretRef(ref)) throw new Error("invalid secret_ref");
  return PREFIX + ref.slice("secret:".length);
}

interface Result {
  code: number;
  out: string;
}

// Values go in and out as base64 on stdin/stdout. Error messages never include process output.
function run(op: string, targetName?: string, input?: string): Result {
  const args = ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", SCRIPT, "-Op", op];
  if (targetName !== undefined) args.push("-Target", targetName);
  const r = spawnSync(POWERSHELL, args, {
    input,
    encoding: "utf8",
    timeout: 30_000,
    windowsHide: true,
    env: { SystemRoot: process.env.SystemRoot ?? "C:\\Windows", windir: process.env.windir ?? "C:\\Windows" },
  });
  if (r.error) throw new Error(`credential manager bridge failed to start (${(r.error as NodeJS.ErrnoException).code ?? "error"})`);
  return { code: r.status ?? 1, out: r.stdout ?? "" };
}

export class CredentialManagerStore implements SecretStore {
  put(ref: string, value: string): void {
    const bytes = Buffer.from(value, "utf8");
    if (bytes.length === 0) throw new Error("empty secret value");
    if (bytes.length > MAX_BYTES) throw new Error("secret value too large for Credential Manager");
    const r = run("put", target(ref), bytes.toString("base64"));
    if (r.code !== 0) throw new Error(`credential manager put failed (exit ${r.code})`);
  }

  get(ref: string): string | undefined {
    const r = run("get", target(ref));
    if (r.code === 2) return undefined;
    if (r.code !== 0) throw new Error(`credential manager get failed (exit ${r.code})`);
    return Buffer.from(r.out.trim(), "base64").toString("utf8");
  }

  has(ref: string): boolean {
    const r = run("exists", target(ref));
    if (r.code === 0) return true;
    if (r.code === 2) return false;
    throw new Error(`credential manager exists failed (exit ${r.code})`);
  }

  // Only entries prefixed "agentmom:" are ever enumerated or touched.
  list(): string[] {
    const r = run("list");
    if (r.code !== 0) throw new Error(`credential manager list failed (exit ${r.code})`);
    return r.out
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.startsWith(PREFIX))
      .map((t) => "secret:" + t.slice(PREFIX.length))
      .sort();
  }

  remove(ref: string): boolean {
    const r = run("delete", target(ref));
    if (r.code === 0) return true;
    if (r.code === 2) return false;
    throw new Error(`credential manager delete failed (exit ${r.code})`);
  }
}

// Exposed for the test that proves the bridge refuses foreign targets.
export function runBridgeForTest(op: string, targetName: string): Result {
  return run(op, targetName);
}
