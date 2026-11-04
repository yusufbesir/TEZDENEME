import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { chmodSync, writeFileSync } from "node:fs";
import { registerKnownSecret } from "../audit/redact.ts";
import type { Actor } from "../policy/types.ts";

function digest(token: string): Buffer {
  return createHash("sha256").update(token, "utf8").digest();
}

// Session tokens live only in memory (the user token is also written once to a file so the user's own tools can read it).
// The identity behind a token decides the actor: only the user token can approve or run; agent tokens never can.
export class AuthRegistry {
  readonly userToken: string;
  private readonly entries: Array<{ hash: Buffer; actor: Actor }> = [];

  constructor() {
    this.userToken = randomBytes(32).toString("base64url");
    registerKnownSecret(this.userToken);
    this.entries.push({ hash: digest(this.userToken), actor: { kind: "user", id: "local-user" } });
  }

  issueAgentToken(agentId: string): string {
    const token = randomBytes(32).toString("base64url");
    registerKnownSecret(token);
    this.entries.push({ hash: digest(token), actor: { kind: "agent", id: agentId } });
    return token;
  }

  authenticate(header: string | undefined): Actor | undefined {
    const m = /^Bearer ([A-Za-z0-9_-]{20,128})$/.exec(header ?? "");
    if (!m) return undefined;
    const candidate = digest(m[1] as string);
    let found: Actor | undefined;
    for (const e of this.entries) if (timingSafeEqual(e.hash, candidate)) found = e.actor;
    return found;
  }
}

// Mode 0600 limits the file to its owner on POSIX; on Windows Node ignores it and the folder's inherited ACL applies.
export function writeTokenFile(path: string, token: string): void {
  writeFileSync(path, token + "\n", { encoding: "utf8", mode: 0o600 });
  chmodSync(path, 0o600);
}
