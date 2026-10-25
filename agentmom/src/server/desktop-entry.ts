// One-time entry tickets for the desktop window (Faz 11, slice 1). Owner: Claude [IP:AgentMom Faz 11].
// WHY: the window is opened by a command line (msedge --app=URL). A command line can be read by other processes of the same user, so the long-lived
// session token must never be on it. The launcher asks the running server (with the token read from the token FILE) for a ticket instead and puts only
// the ticket in the URL. A ticket is random, valid 30 seconds, usable ONCE, and useless afterwards, so a leaked command line gives nothing.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const TTL_MS = 30_000;
const MAX_OPEN = 4;

interface Entry {
  hash: Buffer;
  expiresAt: number;
}

export class EntryTickets {
  private entries: Entry[] = [];
  private readonly now: () => number;
  constructor(now: () => number = Date.now) {
    this.now = now;
  }

  issue(): string {
    this.prune();
    if (this.entries.length >= MAX_OPEN) this.entries.shift();
    const ticket = randomBytes(24).toString("base64url");
    this.entries.push({ hash: createHash("sha256").update(ticket).digest(), expiresAt: this.now() + TTL_MS });
    return ticket;
  }

  // Single use: a successful redeem removes the ticket.
  redeem(ticket: unknown): boolean {
    this.prune();
    if (typeof ticket !== "string" || !/^[A-Za-z0-9_-]{20,64}$/.test(ticket)) return false;
    const h = createHash("sha256").update(ticket).digest();
    const i = this.entries.findIndex((e) => timingSafeEqual(e.hash, h));
    if (i < 0) return false;
    this.entries.splice(i, 1);
    return true;
  }

  private prune(): void {
    const t = this.now();
    this.entries = this.entries.filter((e) => e.expiresAt > t);
  }
}
