import { delimiter } from "node:path";

// Allowlist, not denylist: API keys and tokens (ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, ...) are never forwarded,
// so a subscription route cannot silently turn into a paid API route.
const ALLOWED = new Set(
  [
    "SystemRoot", "windir", "ComSpec", "PATHEXT", "OS", "USERNAME", "USERDOMAIN", "COMPUTERNAME", "LANG",
    "USERPROFILE", "HOMEDRIVE", "HOMEPATH", "APPDATA", "LOCALAPPDATA", "ProgramData", "ProgramFiles", "ProgramFiles(x86)",
    "PROCESSOR_ARCHITECTURE", "NUMBER_OF_PROCESSORS",
  ].map((k) => k.toLowerCase()),
);

export interface ChildEnvOptions {
  base?: NodeJS.ProcessEnv;
  extraPathDirs?: string[];
  tempDir?: string;
}

export function buildChildEnv(opts: ChildEnvOptions = {}): Record<string, string> {
  const base = opts.base ?? process.env;
  const out: Record<string, string> = {};
  let path = "";
  for (const [key, value] of Object.entries(base)) {
    if (value === undefined) continue;
    const lower = key.toLowerCase();
    if (lower === "path") path = value;
    else if (ALLOWED.has(lower)) out[key] = value;
  }
  out.PATH = [...(opts.extraPathDirs ?? []), path].filter(Boolean).join(delimiter);
  if (opts.tempDir) {
    out.TEMP = opts.tempDir;
    out.TMP = opts.tempDir;
  }
  return out;
}
