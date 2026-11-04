// Geçici yetenek izinleri (madde 77, D5b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// Bir izin, politika motorunun "kullanıcı onayı gerekir" (approval_required) kararını, KAPSAMLI (eylem + klasör), SÜRELİ (en çok 24 sa) ve
// KULLANIM SAYILI olarak önceden onaylar. Hiçbir ret kuralını gevşetmez: yasak klasör, sözleşme süresi, bütçe, ücretli rota, güvenilmeyen
// depo ve sözleşmede olmayan eylem aynen reddedilir. İzni yalnız kullanıcı verir ve geri alır; ajan veremez. Her oluşturma/kullanım/iptal denetlenir.
import { randomUUID } from "node:crypto";
import type { AuditLog } from "../audit/audit.ts";
import { redactString } from "../audit/redact.ts";
import type { Db } from "../db/db.ts";
import { evaluate, isInside, isInsideReal } from "./engine.ts";
import type { Actor, ActionRequest, ActionType, AutonomyContract, Decision } from "./types.ts";

// Yalnız geri alınabilir veya sınırlı etkili eylemler izin konusu olabilir. shell.exec, ağ, ücretli sağlayıcı ve izin değişikliği olamaz.
export const GRANTABLE_ACTIONS: readonly ActionType[] = ["file.read", "file.write", "verification.run"];
export const MAX_GRANT_TTL_MS = 24 * 60 * 60 * 1000;
export const MIN_GRANT_TTL_MS = 60 * 1000;
export const MAX_GRANT_USES = 100;

export class GrantError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "GrantError";
    this.code = code;
  }
}

export interface Grant {
  id: string;
  action: ActionType;
  scopeDir: string;
  reason: string;
  createdBy: string;
  createdAt: string;
  expiresAt: string;
  maxUses: number;
  uses: number;
  revokedAt: string | null;
  revokedBy: string | null;
  // Hesaplanan durum; saklanmaz.
  state: "active" | "exhausted" | "expired" | "revoked";
}

export interface GrantInput {
  action: string;
  scopeDir: string;
  reason: string;
  ttlMinutes: number;
  maxUses: number;
}

interface Row {
  id: string;
  action: string;
  scope_dir: string;
  reason: string;
  created_by: string;
  created_at: string;
  expires_at: string;
  max_uses: number;
  uses: number;
  revoked_at: string | null;
  revoked_by: string | null;
}

function stateOf(r: Row, now: Date): Grant["state"] {
  if (r.revoked_at) return "revoked";
  if (Date.parse(r.expires_at) <= now.getTime()) return "expired";
  if (r.uses >= r.max_uses) return "exhausted";
  return "active";
}

function toGrant(r: Row, now: Date): Grant {
  return { id: r.id, action: r.action as ActionType, scopeDir: r.scope_dir, reason: r.reason, createdBy: r.created_by, createdAt: r.created_at, expiresAt: r.expires_at, maxUses: r.max_uses, uses: r.uses, revokedAt: r.revoked_at, revokedBy: r.revoked_by, state: stateOf(r, now) };
}

export class GrantStore {
  private readonly db: Db;
  private readonly audit: AuditLog | undefined;
  private readonly now: () => Date;

  constructor(db: Db, opts: { audit?: AuditLog; now?: () => Date } = {}) {
    this.db = db;
    this.audit = opts.audit;
    this.now = opts.now ?? (() => new Date());
  }

  create(input: GrantInput, actor: Actor, contract: AutonomyContract): Grant {
    if (actor.kind !== "user") throw new GrantError("approval_requires_user", "only the user can grant a temporary capability");
    if (!(GRANTABLE_ACTIONS as readonly string[]).includes(input.action)) throw new GrantError("invalid_field", `action must be one of ${GRANTABLE_ACTIONS.join(", ")}`);
    const scope = typeof input.scopeDir === "string" ? input.scopeDir.trim() : "";
    if (!scope || scope.includes("\0") || scope.length > 500) throw new GrantError("invalid_field", "scopeDir must be a non-empty path");
    const reason = typeof input.reason === "string" ? redactString(input.reason.trim()).slice(0, 300) : "";
    if (reason.length < 3) throw new GrantError("invalid_field", "a reason of at least 3 characters is required");
    const ttl = Number(input.ttlMinutes);
    if (!Number.isFinite(ttl) || ttl * 60_000 < MIN_GRANT_TTL_MS || ttl * 60_000 > MAX_GRANT_TTL_MS) throw new GrantError("invalid_field", "ttlMinutes must be between 1 and 1440");
    const maxUses = Number(input.maxUses);
    if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > MAX_GRANT_USES) throw new GrantError("invalid_field", `maxUses must be an integer between 1 and ${MAX_GRANT_USES}`);
    // Kapsam sözleşmenin izinli klasörlerinin içinde olmalı ve yasak klasöre değmemeli (izin sözleşmeyi aşamaz).
    if (!contract.allowedDirs.some((d) => isInside(d, scope) && isInsideReal(d, scope))) throw new GrantError("scope_outside_contract", "scopeDir must be inside the contract's allowed directories");
    if (contract.forbiddenDirs?.some((d) => isInside(d, scope) || isInside(scope, d) || isInsideReal(d, scope) || isInsideReal(scope, d))) throw new GrantError("scope_forbidden", "scopeDir is, or contains, a forbidden directory");
    const at = this.now();
    const id = randomUUID();
    const expiresAt = new Date(at.getTime() + ttl * 60_000).toISOString();
    this.db.prepare("INSERT INTO capability_grants (id, action, scope_dir, reason, created_by, created_at, expires_at, max_uses) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(id, input.action, scope, reason, `${actor.kind}:${actor.id}`, at.toISOString(), expiresAt, maxUses);
    this.audit?.record({ initiator: actor, action: "grant.create", decision: "allow", result: `grant ${id}`, details: { grantId: id, action: input.action, scopeDir: scope, expiresAt, maxUses, reason } });
    return this.get(id) as Grant;
  }

  get(id: string): Grant | undefined {
    const r = this.db.prepare("SELECT * FROM capability_grants WHERE id = ?").get(id) as Row | undefined;
    return r ? toGrant(r, this.now()) : undefined;
  }

  list(limit = 100): Grant[] {
    const rows = this.db.prepare("SELECT * FROM capability_grants ORDER BY created_at DESC, rowid DESC LIMIT ?").all(Math.min(Math.max(1, limit), 500)) as unknown as Row[];
    const now = this.now();
    return rows.map((r) => toGrant(r, now));
  }

  revoke(id: string, actor: Actor): Grant {
    if (actor.kind !== "user") throw new GrantError("approval_requires_user", "only the user can revoke a grant");
    const g = this.get(id);
    if (!g) throw new GrantError("not_found", "unknown grant");
    if (g.revokedAt) throw new GrantError("conflict", "grant already revoked");
    this.db.prepare("UPDATE capability_grants SET revoked_at = ?, revoked_by = ? WHERE id = ? AND revoked_at IS NULL").run(this.now().toISOString(), `${actor.kind}:${actor.id}`, id);
    this.audit?.record({ initiator: actor, action: "grant.revoke", decision: "allow", result: `grant ${id} revoked`, details: { grantId: id } });
    return this.get(id) as Grant;
  }

  // Eşleşen EN ESKİ etkin izni atomik olarak tüketir (koşullu UPDATE: iptal, süre ve sayı denetimi aynı ifadede). Eşleşme yoksa undefined.
  consumeFor(req: ActionRequest): Grant | undefined {
    if (!req.target || !(GRANTABLE_ACTIONS as readonly string[]).includes(req.action)) return undefined;
    const nowIso = this.now().toISOString();
    const rows = this.db.prepare("SELECT * FROM capability_grants WHERE action = ? AND revoked_at IS NULL AND expires_at > ? AND uses < max_uses ORDER BY created_at, rowid").all(req.action, nowIso) as unknown as Row[];
    for (const r of rows) {
      if (!(isInside(r.scope_dir, req.target) && isInsideReal(r.scope_dir, req.target))) continue;
      const res = this.db.prepare("UPDATE capability_grants SET uses = uses + 1 WHERE id = ? AND revoked_at IS NULL AND expires_at > ? AND uses < max_uses").run(r.id, nowIso) as { changes?: number | bigint };
      if (Number(res.changes ?? 0) === 1) return this.get(r.id);
    }
    return undefined;
  }
}

// Karar şu üç koşulun HEPSİ doğruysa "allow"a çevrilir: motor kararı require_approval, kuralı approval_required (başka hiçbir kural değil) ve eşleşen etkin bir izin var.
// Motor zaten tüm ret kurallarını (yasak klasör, kapsam, bütçe, ücretli rota...) önce değerlendirdiği için, buraya yalnız "sadece onay eksik" durumu gelir.
export function evaluateWithGrants(req: ActionRequest, contract: AutonomyContract | undefined, now: Date, grants: GrantStore | undefined, audit?: AuditLog): Decision {
  const base = evaluate(req, contract, now);
  if (!grants || base.decision !== "require_approval" || base.rule !== "approval_required") return base;
  if (req.approval) return base;
  const g = grants.consumeFor(req);
  if (!g) return base;
  audit?.record({ initiator: req.actor, action: "grant.use", decision: "allow", result: `grant ${g.id} used (${g.uses}/${g.maxUses})`, details: { grantId: g.id, action: req.action, target: req.target ?? null } });
  return { decision: "allow", rule: "temporary_grant", reason: `pre-approved by temporary grant ${g.id} (${g.uses}/${g.maxUses} uses, until ${g.expiresAt})` };
}
