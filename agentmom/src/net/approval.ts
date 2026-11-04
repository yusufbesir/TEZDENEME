// İnternet erişimi: sunucunun verdiği tek kullanımlık ONAY BİLETLERİ (D8c-2a). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// perUseApproval açıkken getirme, çağıranın kendi ürettiği bir "onay" nesnesine değil, SUNUCUNUN yalnız kullanıcı isteğiyle verdiği bilete dayanır:
// bilet belleğe sha256(normalleştirilmiş URL) ile bağlanır, en çok 2 dakika yaşar ve BİR kez kullanılır (yanlış URL ile denenirse de yanar).
// Model yetenekleri (37/38/40) aynı bileti kabul eder: redeemApproval(ticket, url).
import { createHash, randomBytes } from "node:crypto";
import { hostAllowed, parseTarget, refuse } from "./guard.ts";
import type { Refusal } from "./guard.ts";
import type { NetSettings } from "./settings.ts";

export const APPROVAL_TTL_MS = 2 * 60 * 1000;
const MAX_OPEN_TICKETS = 200;

export interface ApprovalGrant {
  urls: string[];
  grantedBy: "user";
}

export interface IssuedTicket {
  ticket: string;
  expiresAt: string;
  url: string;
}

function digest(url: string): string {
  return createHash("sha256").update(url).digest("hex");
}

export class ApprovalTickets {
  private readonly open = new Map<string, { urlHash: string; expires: number }>();
  private readonly clock: () => number;
  private readonly ttlMs: number;

  constructor(opts: { clock?: () => number; ttlMs?: number } = {}) {
    this.clock = opts.clock ?? (() => Date.now());
    this.ttlMs = Math.min(opts.ttlMs ?? APPROVAL_TTL_MS, APPROVAL_TTL_MS);
  }

  private purge(): void {
    const t = this.clock();
    for (const [k, v] of this.open) if (v.expires <= t) this.open.delete(k);
    while (this.open.size >= MAX_OPEN_TICKETS) {
      const oldest = this.open.keys().next().value;
      if (oldest === undefined) break;
      this.open.delete(oldest);
    }
  }

  // YALNIZ kullanıcı isteğiyle çağrılır (uç requireUser uygular). URL ayrıştırılır ve doğrulanır; ayar kapalıysa ya da ana bilgisayar izinli değilse bilet verilmez.
  issue(url: unknown, settings: NetSettings): IssuedTicket | Refusal {
    if (!settings.enabled) return refuse("net_disabled", "internet erişimi kapalı");
    const t = parseTarget(url);
    if (!t.ok) return t;
    if (!hostAllowed(t.host, settings.allowedDomains)) return refuse("host_not_allowed", "bu ana bilgisayar izinli değil");
    this.purge();
    const ticket = randomBytes(24).toString("base64url");
    const expires = this.clock() + this.ttlMs;
    this.open.set(ticket, { urlHash: digest(t.url.href), expires });
    return { ticket, expiresAt: new Date(expires).toISOString(), url: t.url.href };
  }

  // Tek kullanımlık: bilet bulunursa (eşleşse de eşleşmese de) silinir. Yalnız süresi dolmamış ve URL'si eşleşen bilet onay üretir.
  redeem(ticket: unknown, url: string): ApprovalGrant | null {
    if (typeof ticket !== "string" || ticket.length === 0 || ticket.length > 200) return null;
    const rec = this.open.get(ticket);
    if (!rec) return null;
    this.open.delete(ticket);
    if (rec.expires <= this.clock()) return null;
    let href: string;
    try {
      const u = new URL(url);
      u.hash = "";
      href = u.href;
    } catch {
      return null;
    }
    return rec.urlHash === digest(href) ? { urls: [href], grantedBy: "user" } : null;
  }
}

export const sharedTickets = new ApprovalTickets();

// Model yeteneklerinin (37/38/40) iç API'si: kullanıcının verdiği bileti bu URL için tüketir; geçerliyse fetchPublic'in `approval` sözleşmesini döndürür.
export function redeemApproval(ticket: unknown, url: string, tickets: ApprovalTickets = sharedTickets): ApprovalGrant | null {
  return tickets.redeem(ticket, url);
}
