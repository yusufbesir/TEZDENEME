// Birleşik Entegrasyon ve Yetenek Merkezi (madde 46) + Entegrasyon Yaşam Döngüsü (madde 48). Sahip: Claude [İP:AgentMom devam].
// Sağlayıcı, IDE, MCP, beceri ve araç kayıtları tek listede, tek durum makinesiyle. Bu modül yalnız KAYIT ve KARAR tutar:
// hiçbir entegrasyonu bağlamaz, çalıştırmaz, ağa çıkmaz (ADR-016). Durum, ekleme-yalnız olay günlüğünden yeniden hesaplanır.
// Kapalı-varsayılan (fail-closed): bilinmeyen kayıt "etkin değil"; günlükte bozuk satır varsa hiçbir entegrasyon etkin sayılmaz. Yüksek riskli entegrasyonu etkinleştirmek bir İNSAN onayı ister;
// ajan yalnız kapatabilir (güvenli yön), kullanıcının kapattığını yeniden açamaz. Riski yalnız İNSAN beyan edebilir: ajanın bildirdiği her kayıt "high" sayılır.
// Kurtarma: günlük dolarsa ya da bozulursa dosyayı yeniden adlandırın; yeni günlük boş başlar ve her şey kapalıdır (kapalı-varsayılan). İnsanı kimin temsil ettiğini kanıtlamak çağıranın işidir (etiket düzeyinde).
import { appendFileSync, lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { hasSecret } from "../ops/capsule.ts";

export const INTEGRATION_KINDS = ["provider", "ide", "mcp", "skill", "tool"] as const;
export type IntegrationKind = (typeof INTEGRATION_KINDS)[number];
export const INTEGRATION_STATES = ["discovered", "configured", "enabled", "disabled", "removed"] as const;
export type IntegrationState = (typeof INTEGRATION_STATES)[number];
export const ACTIONS = ["discover", "configure", "approve", "enable", "disable", "remove"] as const;
export type Action = (typeof ACTIONS)[number];
export type Risk = "low" | "medium" | "high";
export interface IntegrationActor {
  kind: "user" | "agent" | "system";
  id: string;
}
export const LOG_FILE = "entegrasyon-olaylari.jsonl";
export const EVENT_SCHEMA = "agentmom-integration-event/1";
const ID_RE = /^[a-z0-9][a-z0-9._-]{0,62}$/;
const MAX_EVENTS = 20000;
const CONTROL = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;

export class IntegrationError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "IntegrationError";
    this.code = code;
  }
}

interface IntegrationEvent {
  schema: typeof EVENT_SCHEMA;
  kind: IntegrationKind;
  id: string;
  action: Action;
  actor: IntegrationActor;
  at: string;
  risk?: Risk;
  optional?: boolean;
  title?: string;
  note?: string;
}
export interface IntegrationView {
  // Son kapatan kimse: kullanıcının kapattığını ajan yeniden açamaz.
  disabledBy: "user" | "agent" | "system" | null;
  kind: IntegrationKind;
  id: string;
  title: string;
  state: IntegrationState;
  risk: Risk;
  optional: boolean;
  // Yüksek riskte, bu keşiften sonra bir insan onayı var mı.
  approved: boolean;
  // Yalnız state === "enabled" ve (risk yüksekse) onay varsa true.
  effective: boolean;
  events: number;
}
export interface Overview {
  integrations: IntegrationView[];
  problems: string[];
}

const isObj = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);
function textField(v: unknown, what: string, max: number): string {
  if (typeof v !== "string" || v.length === 0 || v.length > max || CONTROL.test(v)) throw new IntegrationError("invalid_event", `${what} must be 1..${max} characters of plain text`);
  return v;
}
function parseEvent(raw: unknown): IntegrationEvent {
  if (!isObj(raw)) throw new IntegrationError("invalid_event", "event must be an object");
  const allowed = ["schema", "kind", "id", "action", "actor", "at", "risk", "optional", "title", "note"];
  for (const k of Object.keys(raw)) if (!allowed.includes(k)) throw new IntegrationError("invalid_event", `unknown field ${k.slice(0, 30)}`);
  if (raw["schema"] !== EVENT_SCHEMA) throw new IntegrationError("invalid_event", "wrong schema");
  if (!(INTEGRATION_KINDS as readonly string[]).includes(raw["kind"] as string)) throw new IntegrationError("invalid_event", "unknown kind");
  if (typeof raw["id"] !== "string" || !ID_RE.test(raw["id"])) throw new IntegrationError("invalid_event", "id must be lowercase letters, digits and . _ - (1..63)");
  if (!(ACTIONS as readonly string[]).includes(raw["action"] as string)) throw new IntegrationError("invalid_event", "unknown action");
  const a = raw["actor"];
  if (!isObj(a) || !["user", "agent", "system"].includes(a["kind"] as string)) throw new IntegrationError("invalid_event", "actor.kind must be user, agent or system");
  const actor: IntegrationActor = { kind: a["kind"] as IntegrationActor["kind"], id: textField(a["id"], "actor.id", 80) };
  const at = textField(raw["at"], "at", 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(at) || Number.isNaN(Date.parse(at))) throw new IntegrationError("invalid_event", "at must be an ISO time");
  const ev: IntegrationEvent = { schema: EVENT_SCHEMA, kind: raw["kind"] as IntegrationKind, id: raw["id"], action: raw["action"] as Action, actor, at };
  if (raw["risk"] !== undefined) {
    if (!["low", "medium", "high"].includes(raw["risk"] as string)) throw new IntegrationError("invalid_event", "unknown risk");
    ev.risk = raw["risk"] as Risk;
  }
  if (raw["optional"] !== undefined) {
    if (typeof raw["optional"] !== "boolean") throw new IntegrationError("invalid_event", "optional must be true or false");
    ev.optional = raw["optional"];
  }
  if (raw["title"] !== undefined) ev.title = textField(raw["title"], "title", 120);
  if (raw["note"] !== undefined) ev.note = textField(raw["note"], "note", 300);
  for (const t of [ev.title, ev.note]) if (t !== undefined && hasSecret(t)) throw new IntegrationError("invalid_event", "text looks like it contains a secret");
  return ev;
}

interface Cell {
  view: IntegrationView;
  seen: boolean;
}
const keyOf = (k: IntegrationKind, id: string): string => `${k}:${id}`;

// Geçiş kuralı. Başarısızsa IntegrationError atar; durum DEĞİŞMEZ.
function apply(cell: Cell | undefined, ev: IntegrationEvent): Cell {
  const fail = (code: string, msg: string): never => {
    throw new IntegrationError(code, msg);
  };
  const v = cell?.view;
  if (ev.action === "discover") {
    if (v && v.state !== "removed") fail("conflict", "this integration is already registered (remove it first to register again)");
    return { seen: true, view: { kind: ev.kind, id: ev.id, title: ev.title ?? ev.id, state: "discovered", disabledBy: null, risk: ev.actor.kind === "user" ? (ev.risk ?? "high") : "high", optional: ev.optional ?? false, approved: false, effective: false, events: (v?.events ?? 0) + 1 } };
  }
  if (!v || v.state === "removed") return fail("not_found", "this integration is not registered");
  const next: IntegrationView = { ...v, events: v.events + 1 };
  switch (ev.action) {
    case "configure":
      if (v.state === "enabled") fail("conflict", "disable it before reconfiguring");
      next.state = "configured";
      next.approved = false; // yapılandırma değişince önceki onay geçerli kalmaz
      break;
    case "approve":
      if (ev.actor.kind !== "user") fail("human_required", "only a person can approve an integration");
      if (v.state === "discovered") fail("conflict", "configure it before approving");
      next.approved = true;
      break;
    case "enable":
      if (v.state !== "configured" && v.state !== "disabled") fail("conflict", `cannot enable from ${v.state}`);
      if (v.risk === "high" && !v.approved) fail("approval_required", "a high-risk integration needs a person's approval first");
      if (v.risk === "high" && ev.actor.kind === "agent") fail("human_required", "an agent cannot enable a high-risk integration");
      if (v.disabledBy === "user" && ev.actor.kind === "agent") fail("human_required", "a person disabled this integration; only a person can enable it again");
      next.state = "enabled";
      next.disabledBy = null;
      break;
    case "disable":
      if (v.state !== "enabled") fail("conflict", `cannot disable from ${v.state}`);
      next.state = "disabled";
      next.disabledBy = ev.actor.kind;
      break;
    case "remove":
      if (ev.actor.kind !== "user") fail("human_required", "only a person can remove an integration");
      next.state = "removed";
      next.approved = false;
      break;
  }
  next.effective = next.state === "enabled" && (next.risk !== "high" || next.approved);
  return { seen: true, view: next };
}

export function replay(lines: string[]): Overview {
  const cells = new Map<string, Cell>();
  const problems: string[] = [];
  lines.forEach((l, i) => {
    if (l.trim() === "") return;
    try {
      const ev = parseEvent(JSON.parse(l));
      cells.set(keyOf(ev.kind, ev.id), apply(cells.get(keyOf(ev.kind, ev.id)), ev));
    } catch (e) {
      // Bozuk ya da geçersiz satır atlanır ve RAPORLANIR; atlanan satır hiçbir şeyi etkinleştirmez (fail-closed).
      problems.push(`line ${i + 1}: ${e instanceof IntegrationError ? e.message : "not valid JSON"}`.slice(0, 200));
    }
  });
  const integrations = [...cells.values()].map((c) => c.view).filter((v) => v.state !== "removed").sort((a, b) => (keyOf(a.kind, a.id) < keyOf(b.kind, b.id) ? -1 : 1));
  // Atlanan satır bir "kapat" ya da "kaldır" olabilirdi; günlük güvenilmez olduğu sürece HİÇBİR entegrasyon etkin sayılmaz.
  if (problems.length > 0) for (const v of integrations) v.effective = false;
  return { integrations, problems: problems.slice(0, 50) };
}

export class IntegrationCenter {
  private readonly file: string;
  private readonly now: () => Date;

  // dir: kayıt günlüğünün tutulacağı var olan klasör (çağıran seçer; depo dışında olması önerilir).
  constructor(dir: string, now: () => Date = () => new Date()) {
    let st;
    try {
      st = lstatSync(dir);
    } catch {
      throw new IntegrationError("invalid_dir", "the log folder does not exist");
    }
    if (!st.isDirectory() || st.isSymbolicLink()) throw new IntegrationError("invalid_dir", "the log folder must be a real directory");
    this.file = join(dir, LOG_FILE);
    this.now = now;
  }

  private lines(): string[] {
    let st;
    try {
      st = lstatSync(this.file);
    } catch {
      return [];
    }
    if (!st.isFile() || st.isSymbolicLink() || st.size > 8 * 1024 * 1024) throw new IntegrationError("invalid_log", "the event log is not a regular file under 8 MB");
    const ls = readFileSync(this.file, "utf8").split("\n").filter((l) => l.trim() !== "");
    if (ls.length > MAX_EVENTS) throw new IntegrationError("invalid_log", "the event log is too long");
    return ls;
  }

  overview(): Overview {
    return replay(this.lines());
  }

  get(kind: IntegrationKind, id: string): IntegrationView | undefined {
    return this.overview().integrations.find((i) => i.kind === kind && i.id === id);
  }

  // Etkin mi? Kayıt yok, bozuk ya da onay eksikse false (kapalı-varsayılan).
  isEffective(kind: IntegrationKind, id: string): boolean {
    try {
      return this.get(kind, id)?.effective === true;
    } catch {
      return false;
    }
  }

  // Olayı doğrular, mevcut durumla geçişi dener, geçerliyse günlüğe YENİ satır olarak ekler. Hiçbir şey silinmez ya da ezilmez.
  record(input: { kind: IntegrationKind; id: string; action: Action; actor: IntegrationActor; risk?: Risk; optional?: boolean; title?: string; note?: string }): IntegrationView {
    const ev = parseEvent({ schema: EVENT_SCHEMA, ...input, at: this.now().toISOString() });
    const current = replay(this.lines());
    // Geçiş denemesi: yalnız geçerli satırlardan hesaplanan durumla. Geçersizse apply atar ve günlüğe yazılmaz.
    const cell = current.integrations.find((i) => i.kind === ev.kind && i.id === ev.id);
    const result = apply(cell ? { seen: true, view: cell } : undefined, ev);
    try {
      appendFileSync(this.file, JSON.stringify(ev) + "\n", { flag: "a" });
    } catch {
      throw new IntegrationError("write_failed", "could not append to the event log");
    }
    return result.view;
  }
}
