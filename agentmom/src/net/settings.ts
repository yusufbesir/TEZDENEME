// İnternet erişimi ayarları (D8c-2a). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// Varsayılan KAPALI. Ayar yalnız KULLANICI tarafından değiştirilir; kayıt yalnız eklenir (SQL tetikleyici), geçerli ayar en son satırdır, hiç satır yoksa
// internet kapalıdır. Her değişiklik denetim kaydına (net.settings: eski/yeni özet) ve anlamsal değişiklik defterine yazılır.
import { randomUUID } from "node:crypto";
import type { AuditLog } from "../core/audit/audit.ts";
import { ChangeLedger } from "../core/audit/change-ledger.ts";
import type { Db } from "../core/db/db.ts";
import type { Actor } from "../core/policy/types.ts";
import { MAX_DOMAINS, normalizeDomainPattern } from "./guard.ts";

export class NetError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "NetError";
    this.code = code;
  }
}

export interface NetSettings {
  enabled: boolean;
  allowedDomains: string[];
  perUseApproval: boolean;
  setBy: string | null;
  setAt: string | null;
}

export interface NetSettingsInput {
  enabled: unknown;
  allowedDomains: unknown;
  perUseApproval: unknown;
}

export const HOW_TO_ENABLE = "İnternet erişimi kapalı. Açmak için Ayarlar > İnternet erişimi bölümünden etkinleştirin ve izinli alan adlarını ekleyin (yalnız kullanıcı yapabilir).";

interface Row {
  enabled: number;
  allowed_domains_json: string;
  per_use_approval: number;
  set_by: string;
  set_at: string;
}

export const DEFAULT_NET_SETTINGS: NetSettings = Object.freeze({ enabled: false, allowedDomains: [], perUseApproval: true, setBy: null, setAt: null }) as NetSettings;

function parseDomains(s: string): string[] {
  try {
    const v: unknown = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, MAX_DOMAINS) : [];
  } catch {
    return [];
  }
}

function summary(s: NetSettings): { enabled: boolean; domainCount: number; domains: string[]; perUseApproval: boolean } {
  return { enabled: s.enabled, domainCount: s.allowedDomains.length, domains: s.allowedDomains, perUseApproval: s.perUseApproval };
}

export class NetSettingsStore {
  private readonly db: Db;
  private readonly audit: AuditLog | undefined;
  private readonly changes: ChangeLedger;
  private readonly now: () => Date;

  constructor(db: Db, opts: { audit?: AuditLog; now?: () => Date } = {}) {
    this.db = db;
    this.audit = opts.audit;
    this.now = opts.now ?? (() => new Date());
    this.changes = new ChangeLedger(db, { now: this.now });
  }

  // Geçerli ayar = en son satır. Okuma hatasında (tablo yok vb.) KAPALI döner.
  get(): NetSettings {
    let r: Row | undefined;
    try {
      r = this.db.prepare("SELECT enabled, allowed_domains_json, per_use_approval, set_by, set_at FROM net_settings ORDER BY seq DESC LIMIT 1").get() as Row | undefined;
    } catch {
      return { ...DEFAULT_NET_SETTINGS, allowedDomains: [] };
    }
    if (!r) return { ...DEFAULT_NET_SETTINGS, allowedDomains: [] };
    return { enabled: r.enabled === 1, allowedDomains: parseDomains(r.allowed_domains_json), perUseApproval: r.per_use_approval === 1, setBy: r.set_by, setAt: r.set_at };
  }

  validate(input: NetSettingsInput): { enabled: boolean; allowedDomains: string[]; perUseApproval: boolean } {
    if (typeof input.enabled !== "boolean") throw new NetError("invalid_field", "enabled true ya da false olmalı");
    if (typeof input.perUseApproval !== "boolean") throw new NetError("invalid_field", "perUseApproval true ya da false olmalı");
    if (!Array.isArray(input.allowedDomains)) throw new NetError("invalid_field", "allowedDomains bir liste olmalı");
    if (input.allowedDomains.length > MAX_DOMAINS) throw new NetError("invalid_field", `en çok ${MAX_DOMAINS} alan adı eklenebilir`);
    const seen = new Set<string>();
    for (const raw of input.allowedDomains) {
      const r = normalizeDomainPattern(raw);
      if (!r.ok) throw new NetError("invalid_field", r.message);
      seen.add(r.value);
    }
    const allowedDomains = [...seen].sort();
    if (input.enabled && allowedDomains.length === 0) throw new NetError("invalid_field", "internet erişimini açmak için en az bir izinli alan adı gerekir");
    return { enabled: input.enabled, allowedDomains, perUseApproval: input.perUseApproval };
  }

  // YALNIZ kullanıcı. Ajan ve sistem reddedilir (denetim kaydıyla).
  set(input: NetSettingsInput, actor: Actor): NetSettings {
    if (actor.kind !== "user") {
      this.audit?.record({ initiator: actor, action: "net.settings", decision: "deny", result: "only the user can change internet settings", details: {} });
      throw new NetError("approval_requires_user", "internet ayarlarını yalnız kullanıcı değiştirebilir");
    }
    const next = this.validate(input);
    const before = this.get();
    const at = this.now().toISOString();
    this.db.prepare("INSERT INTO net_settings (id, enabled, allowed_domains_json, per_use_approval, set_by, set_at) VALUES (?, ?, ?, ?, ?, ?)").run(randomUUID(), next.enabled ? 1 : 0, JSON.stringify(next.allowedDomains), next.perUseApproval ? 1 : 0, `${actor.kind}:${actor.id}`, at);
    const after = this.get();
    const ev = this.audit?.record({ initiator: actor, action: "net.settings", decision: "allow", result: after.enabled ? "internet access enabled" : "internet access disabled", details: { before: summary(before), after: summary(after) } });
    this.changes.record(
      { kind: "policy", summary: `İnternet erişimi ${after.enabled ? "açık" : "kapalı"} (${after.allowedDomains.length} alan adı, her kullanımda onay: ${after.perUseApproval ? "evet" : "hayır"})`, reason: before.enabled === after.enabled ? "İnternet ayarları güncellendi" : after.enabled ? "Kullanıcı internet erişimini açtı" : "Kullanıcı internet erişimini kapattı", ...(ev ? { auditId: ev.id } : {}) },
      actor,
    );
    return after;
  }
}
