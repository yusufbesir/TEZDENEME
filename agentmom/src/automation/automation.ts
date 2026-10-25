// Olay tetiklemeli otomasyon (madde 13, D5b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// Kurallar yalnız KULLANICI tarafından oluşturulur. Bir denetim olayı bir kuralın desenine uyarsa iki güvenli eylemden biri çalışır:
//   notify      -> kayıt düşer (arayüzde görünür); hiçbir şey çalıştırmaz.
//   record_task -> bir görev KAYDI açar; kayıt politika motorundan normal yoldan geçer (otomasyon izin veremez, onay gerekiyorsa onay bekler).
// Döngü koruması: otomasyonun kendi (initiator system:automation) olayları kural tetiklemez; kural başına bekleme süresi ve saatlik üst sınır vardır.
// Otomasyon hatası denetim yazımını ASLA bozmaz (sink hata fırlatmaz) ve işleme olay yazımı bittikten sonra, ayrı bir mikro-görevde yapılır.
// ZAMAN TETİKLEYİCİSİ (ADR-016 "zamanlanmış görev"; migrasyon 016): kuralı yalnız kullanıcı KURAR; kendiliğinden kural doğmaz. Zamanlama: aralık (15..10080 dk) ya da günlük HH:MM (yerel saat, isteğe bağlı hafta günleri).
//   tick(now) zamanı gelen kuralı en çok BİR kez çalıştırır (tick başına en çok 20 kural, süreç içi tek tick kilidi). Eylemler: notify, record_task (politika motorundan geçer, onay gerekiyorsa
//   awaiting_approval'da BEKLER) ve run_analysis (yalnız beyaz listedeki salt-okunur analizler; kısa özet çalışma kaydına yazılır). Model yeteneği, ağ, dosya yazımı YOK:
//   zamanlanmış "model görevi" bu dilimde yoktur (model yetenekleri yalnız kullanıcı isteğiyle çalışır; ADR-016).
//   Catch-up YOK: süreç kapalıyken kaçan çalışmalar toplu çalıştırılmaz; yalnız tek bir 'missed' kaydı düşer ve takvim ileri taşınır. Yaz saati geçişlerinde "son çalışmadan beri" mantığı
//   (çapa = son çalışma/kaçırma kaydı) çift ya da boş çalışmayı önler.
import { randomUUID } from "node:crypto";
import type { AuditEvent, AuditSink } from "../core/audit/audit.ts";
import { redactString } from "../core/audit/redact.ts";
import type { Db } from "../core/db/db.ts";
import type { Actor, ActionRequest } from "../core/policy/types.ts";

export const AUTOMATION_ACTOR: Actor = { kind: "system", id: "automation" };
export const RECORD_TASK_ACTIONS = ["file.read", "verification.run"] as const;
export const MAX_RUNS_PER_HOUR = 30;
const PATTERN = /^[a-z0-9_.:-]{1,60}\*?$/;
export const MAX_SCHEDULE_RULES = 20;
export const TICK_MAX_RULES = 20;
export const INTERVAL_MIN_MINUTES = 15;
export const INTERVAL_MAX_MINUTES = 10080;
// Günlük çalışma zamanından en çok bu kadar geç kalınırsa hâlâ çalışır; daha geçse 'missed' sayılır (catch-up yok).
export const DAILY_GRACE_MS = 10 * 60_000;
export const ANALYSIS_TIMEOUT_MS = 60_000;
export const RUN_NOW_PER_MINUTE = 5;
// Zamanlanmış çalışmada izinli analizler: hepsi salt-okunur ve yan etkisizdir (model çağrısı yok, internet yok).
export const ANALYSES = ["attention", "halflife", "learning", "absence", "continuity", "offline", "shadow-price"] as const;
export type AnalysisName = (typeof ANALYSES)[number];
const EXEC_OUTCOMES = "'notified', 'task_recorded', 'scheduled_ok', 'error'";

export type Schedule = { kind: "interval"; everyMinutes: number } | { kind: "daily"; at: string; weekdays?: number[] };
export type AnalysisRunner = (name: AnalysisName) => string | Promise<string>;
export interface TickResult {
  ran: number;
  missed: number;
  skipped: number;
  errors: number;
  busy: boolean;
}

export class AutomationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AutomationError";
    this.code = code;
  }
}

export interface RuleInput {
  name: string;
  // Olay tetikleyicisinde zorunlu; zaman tetikleyicisinde VERİLMEZ.
  eventPattern?: string;
  // Zaman tetikleyicisi: { kind: "schedule", schedule: { kind: "interval", everyMinutes } | { kind: "daily", at: "HH:MM", weekdays? } }.
  trigger?: unknown;
  actionKind: string;
  params: { message?: string; title?: string; action?: string; target?: string; analysis?: string };
  cooldownSeconds: number;
}

export interface Rule {
  id: string;
  name: string;
  eventPattern: string;
  triggerKind: "event" | "schedule";
  schedule: Schedule | null;
  actionKind: "notify" | "record_task" | "run_analysis";
  params: Record<string, string>;
  enabled: boolean;
  cooldownSeconds: number;
  createdBy: string;
  createdAt: string;
}

export interface Run {
  id: string;
  ruleId: string;
  ts: string;
  eventAction: string;
  eventId: string | null;
  outcome: "notified" | "task_recorded" | "scheduled_ok" | "missed" | "skipped_cooldown" | "skipped_rate" | "error";
  message: string;
}

interface RuleRow {
  id: string;
  name: string;
  event_pattern: string;
  action_kind: string;
  params_json: string;
  enabled: number;
  cooldown_s: number;
  created_by: string;
  created_at: string;
  trigger_kind: string;
  schedule_json: string | null;
}

// Zamanlama belirtimini sıkı doğrular (bilinmeyen alan, aralık dışı değer, kötü biçim reddedilir).
export function parseSchedule(v: unknown): Schedule {
  const bad = (m: string): never => {
    throw new AutomationError("invalid_field", m);
  };
  if (v === null || typeof v !== "object" || Array.isArray(v)) return bad("schedule must be an object");
  const o = v as Record<string, unknown>;
  const only = (keys: string[]): void => {
    for (const k of Object.keys(o)) if (!keys.includes(k)) bad(`schedule: unknown field ${k}`);
  };
  if (o.kind === "interval") {
    only(["kind", "everyMinutes"]);
    const n = o.everyMinutes;
    if (typeof n !== "number" || !Number.isInteger(n) || n < INTERVAL_MIN_MINUTES || n > INTERVAL_MAX_MINUTES) return bad(`schedule.everyMinutes must be an integer between ${INTERVAL_MIN_MINUTES} and ${INTERVAL_MAX_MINUTES}`);
    return { kind: "interval", everyMinutes: n };
  }
  if (o.kind === "daily") {
    only(["kind", "at", "weekdays"]);
    if (typeof o.at !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(o.at)) return bad("schedule.at must be HH:MM (local time, 00:00-23:59)");
    if (o.weekdays === undefined) return { kind: "daily", at: o.at };
    const w = o.weekdays;
    if (!Array.isArray(w) || w.length < 1 || w.length > 7 || w.some((d) => typeof d !== "number" || !Number.isInteger(d) || d < 1 || d > 7) || new Set(w).size !== w.length) return bad("schedule.weekdays must be 1-7 distinct integers (1 = Monday ... 7 = Sunday)");
    return { kind: "daily", at: o.at, weekdays: [...(w as number[])].sort((a, b) => a - b) };
  }
  return bad("schedule.kind must be interval or daily");
}

const isoWeekday = (d: Date): number => (d.getDay() === 0 ? 7 : d.getDay());

// Günlük zamanlamanın "en son geçmiş" çalışma anı (<= atMs), yerel saatle; yoksa null (en çok 8 gün geriye bakar).
export function latestDailySlot(spec: { at: string; weekdays?: number[] }, atMs: number): number | null {
  const [h, m] = spec.at.split(":").map(Number) as [number, number];
  const base = new Date(atMs);
  for (let back = 0; back <= 8; back++) {
    const c = new Date(base.getFullYear(), base.getMonth(), base.getDate() - back, h, m, 0, 0);
    if (spec.weekdays && !spec.weekdays.includes(isoWeekday(c))) continue;
    if (c.getTime() <= atMs) return c.getTime();
  }
  return null;
}

// Günlük zamanlamanın atMs'den SONRAKİ ilk çalışma anı (yerel saat).
export function nextDailySlot(spec: { at: string; weekdays?: number[] }, atMs: number): number | null {
  const [h, m] = spec.at.split(":").map(Number) as [number, number];
  const base = new Date(atMs);
  for (let fwd = 0; fwd <= 8; fwd++) {
    const c = new Date(base.getFullYear(), base.getMonth(), base.getDate() + fwd, h, m, 0, 0);
    if (spec.weekdays && !spec.weekdays.includes(isoWeekday(c))) continue;
    if (c.getTime() > atMs) return c.getTime();
  }
  return null;
}

function clean(v: unknown, max: number): string {
  return typeof v === "string" ? redactString(v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, " ").trim()).slice(0, max) : "";
}

export function matchesPattern(pattern: string, action: string): boolean {
  return pattern.endsWith("*") ? action.startsWith(pattern.slice(0, -1)) : action === pattern;
}

// Görev oluşturucu: uygulama tarafından verilir ve normal POST /api/tasks yolunu (politika + görev + denetim) izler.
export type TaskCreator = (title: string, request: ActionRequest) => void;

export class AutomationEngine implements AuditSink {
  private readonly db: Db;
  private readonly now: () => Date;
  private createTask: TaskCreator | undefined;
  private pending: Promise<void> = Promise.resolve();
  private analysisRunner: AnalysisRunner | undefined;
  private ticking = false;
  private readonly running = new Set<string>();
  private readonly manualAttempts = new Map<string, number[]>();

  constructor(db: Db, opts: { now?: () => Date } = {}) {
    this.db = db;
    this.now = opts.now ?? (() => new Date());
  }

  setTaskCreator(fn: TaskCreator): void {
    this.createTask = fn;
  }

  // Salt-okunur analiz işlevleri uygulamadan enjekte edilir (model/ağ çağıran bir işlev BAĞLANMAZ). Bağlı değilse run_analysis 'error' kaydı düşer.
  setAnalysisRunner(fn: AnalysisRunner): void {
    this.analysisRunner = fn;
  }

  // Testler ve kapanış için: kuyruktaki işlemelerin bitmesini bekler.
  async idle(): Promise<void> {
    await this.pending;
  }

  createRule(input: RuleInput, actor: Actor): Rule {
    if (actor.kind !== "user") throw new AutomationError("approval_requires_user", "only the user can create automation rules");
    const name = clean(input.name, 80);
    if (name.length < 3) throw new AutomationError("invalid_field", "name of at least 3 characters is required");
    let schedule: Schedule | null = null;
    if (input.trigger !== undefined) {
      const t = input.trigger;
      if (t === null || typeof t !== "object" || Array.isArray(t)) throw new AutomationError("invalid_field", "trigger must be an object");
      for (const k of Object.keys(t)) if (k !== "kind" && k !== "schedule") throw new AutomationError("invalid_field", `trigger: unknown field ${k}`);
      if ((t as Record<string, unknown>).kind !== "schedule") throw new AutomationError("invalid_field", "trigger.kind must be schedule");
      if (input.eventPattern !== undefined) throw new AutomationError("invalid_field", "a schedule trigger has no eventPattern");
      schedule = parseSchedule((t as Record<string, unknown>).schedule);
      const maxCool = schedule.kind === "interval" ? schedule.everyMinutes * 60 : 86400;
      if (Number(input.cooldownSeconds) > maxCool) throw new AutomationError("invalid_field", "bekleme süresi çalışma aralığından uzun olamaz");
      const used = (this.db.prepare("SELECT count(*) AS n FROM automation_rules WHERE trigger_kind = 'schedule' AND enabled = 1").get() as { n: number }).n;
      if (Number(used) >= MAX_SCHEDULE_RULES) throw new AutomationError("limit_reached", `at most ${MAX_SCHEDULE_RULES} enabled scheduled rules; disable one first`);
    } else {
      if (typeof input.eventPattern !== "string" || !PATTERN.test(input.eventPattern) || input.eventPattern === "*") throw new AutomationError("invalid_field", "eventPattern must be an audit action or a prefix ending with * (a bare * is not allowed)");
      if (input.eventPattern.startsWith("automation.")) throw new AutomationError("invalid_field", "rules cannot listen to automation events");
    }
    const cooldown = Number(input.cooldownSeconds);
    if (!Number.isInteger(cooldown) || cooldown < 10 || cooldown > 86400) throw new AutomationError("invalid_field", "cooldownSeconds must be an integer between 10 and 86400");
    const p = input.params ?? {};
    let params: Record<string, string>;
    if (input.actionKind === "notify") {
      const message = clean(p.message, 300);
      if (message.length < 3) throw new AutomationError("invalid_field", "params.message of at least 3 characters is required");
      params = { message };
    } else if (input.actionKind === "record_task") {
      const title = clean(p.title, 200);
      const target = typeof p.target === "string" ? p.target.trim() : "";
      if (title.length < 3) throw new AutomationError("invalid_field", "params.title of at least 3 characters is required");
      if (!(RECORD_TASK_ACTIONS as readonly string[]).includes(String(p.action))) throw new AutomationError("invalid_field", `params.action must be one of ${RECORD_TASK_ACTIONS.join(", ")}`);
      if (!target || target.includes("\0") || target.length > 500) throw new AutomationError("invalid_field", "params.target must be a non-empty path");
      params = { title, action: String(p.action), target };
    } else if (input.actionKind === "run_analysis") {
      if (!schedule) throw new AutomationError("invalid_field", "run_analysis is only available on schedule triggers");
      if (typeof p.analysis !== "string" || !(ANALYSES as readonly string[]).includes(p.analysis)) throw new AutomationError("invalid_field", `params.analysis must be one of ${ANALYSES.join(", ")}`);
      params = { analysis: p.analysis };
    } else {
      throw new AutomationError("invalid_field", "actionKind must be notify, record_task or run_analysis");
    }
    const id = randomUUID();
    this.db.prepare("INSERT INTO automation_rules (id, name, event_pattern, action_kind, params_json, enabled, cooldown_s, created_by, created_at, trigger_kind, schedule_json) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)").run(id, name, schedule ? "" : (input.eventPattern as string), input.actionKind, JSON.stringify(params), cooldown, `${actor.kind}:${actor.id}`, this.now().toISOString(), schedule ? "schedule" : "event", schedule ? JSON.stringify(schedule) : null);
    return this.getRule(id) as Rule;
  }

  setEnabled(id: string, enabled: boolean, actor: Actor): Rule {
    if (actor.kind !== "user") throw new AutomationError("approval_requires_user", "only the user can enable or disable rules");
    const existing = this.getRule(id);
    if (!existing) throw new AutomationError("not_found", "unknown rule");
    if (enabled && !existing.enabled && existing.triggerKind === "schedule") {
      const used = (this.db.prepare("SELECT count(*) AS n FROM automation_rules WHERE trigger_kind = 'schedule' AND enabled = 1").get() as { n: number }).n;
      if (Number(used) >= MAX_SCHEDULE_RULES) throw new AutomationError("limit_reached", `at most ${MAX_SCHEDULE_RULES} enabled scheduled rules; disable one first`);
    }
    this.db.prepare("UPDATE automation_rules SET enabled = ? WHERE id = ?").run(enabled ? 1 : 0, id);
    return this.getRule(id) as Rule;
  }

  getRule(id: string): Rule | undefined {
    const r = this.db.prepare("SELECT * FROM automation_rules WHERE id = ?").get(id) as RuleRow | undefined;
    return r ? this.mapRule(r) : undefined;
  }

  listRules(): Rule[] {
    return (this.db.prepare("SELECT * FROM automation_rules ORDER BY created_at DESC, rowid DESC LIMIT 200").all() as unknown as RuleRow[]).map((r) => this.mapRule(r));
  }

  listRuns(limit = 100): Run[] {
    const rows = this.db.prepare("SELECT * FROM automation_runs ORDER BY ts DESC, rowid DESC LIMIT ?").all(Math.min(Math.max(1, limit), 500)) as unknown as Array<{ id: string; rule_id: string; ts: string; event_action: string; event_id: string | null; outcome: string; message: string }>;
    return rows.map((r) => ({ id: r.id, ruleId: r.rule_id, ts: r.ts, eventAction: r.event_action, eventId: r.event_id, outcome: r.outcome as Run["outcome"], message: r.message }));
  }

  // AuditSink: asla fırlatmaz; işleme olay yazımı tamamlandıktan sonra yapılır.
  write(event: AuditEvent): void {
    try {
      if (event.initiator.kind === AUTOMATION_ACTOR.kind && event.initiator.id === AUTOMATION_ACTOR.id) return;
      if (event.action.startsWith("automation.")) return;
      const snapshot: AuditEvent = { ...event };
      this.pending = this.pending.then(() => new Promise<void>((resolve) => queueMicrotask(() => {
        try {
          this.handle(snapshot);
        } catch (e) {
          // Denetim yazımını bozmaz ama sessizce de yutulmaz: stderr'e kısa, sırdan arındırılmış iz düşer.
          process.stderr.write(`[automation] işleme hatası: ${e instanceof Error ? clean(e.message, 150) : "bilinmeyen"}
`);
        }
        resolve();
      })));
    } catch {
      // sink sözleşmesi: hiçbir koşulda fırlatma
    }
  }

  private handle(event: AuditEvent): void {
    const rules = (this.db.prepare("SELECT * FROM automation_rules WHERE enabled = 1 AND trigger_kind = 'event'").all() as unknown as RuleRow[]).map((r) => this.mapRule(r));
    for (const rule of rules) {
      if (!matchesPattern(rule.eventPattern, event.action)) continue;
      const now = this.now();
      const last = this.db.prepare("SELECT ts FROM automation_runs WHERE rule_id = ? AND outcome IN ('notified', 'task_recorded', 'error') ORDER BY ts DESC, rowid DESC LIMIT 1").get(rule.id) as { ts: string } | undefined;
      if (last && now.getTime() - Date.parse(last.ts) < rule.cooldownSeconds * 1000) {
        this.run(rule, event, "skipped_cooldown", `bekleme süresi dolmadı (${rule.cooldownSeconds} sn)`, false);
        continue;
      }
      const hourAgo = new Date(now.getTime() - 3600_000).toISOString();
      const n = (this.db.prepare("SELECT count(*) AS n FROM automation_runs WHERE rule_id = ? AND ts > ? AND outcome IN ('notified', 'task_recorded', 'error')").get(rule.id, hourAgo) as { n: number }).n;
      if (Number(n) >= MAX_RUNS_PER_HOUR) {
        this.run(rule, event, "skipped_rate", `saatlik sınır (${MAX_RUNS_PER_HOUR}) doldu`, false);
        continue;
      }
      if (rule.actionKind === "notify") {
        this.run(rule, event, "notified", rule.params.message ?? "", true);
      } else if (!this.createTask) {
        this.run(rule, event, "error", "görev oluşturucu bağlı değil", true);
      } else {
        try {
          const request: ActionRequest = { actor: AUTOMATION_ACTOR, action: rule.params.action as ActionRequest["action"], target: rule.params.target as string };
          this.createTask(rule.params.title ?? "", request);
          this.run(rule, event, "task_recorded", `görev kaydı: ${rule.params.title}`, true);
        } catch (e) {
          this.run(rule, event, "error", `görev kaydı açılamadı: ${e instanceof Error ? clean(e.message, 150) : "bilinmeyen hata"}`, true);
        }
      }
    }
  }

  private run(rule: Rule, event: AuditEvent, outcome: Run["outcome"], message: string, always: boolean): void {
    // Atlanan çalışmalar (bekleme/sınır) her olayda satır üretmesin: aynı kural için son satır zaten atlama ise tekrar yazılmaz.
    if (!always) {
      const prev = this.db.prepare("SELECT outcome FROM automation_runs WHERE rule_id = ? ORDER BY ts DESC, rowid DESC LIMIT 1").get(rule.id) as { outcome: string } | undefined;
      if (prev?.outcome === outcome) return;
    }
    this.log(rule, this.now(), event.action, event.id, outcome, message);
  }

  private log(rule: Rule, at: Date, eventAction: string, eventId: string | null, outcome: Run["outcome"], message: string): string {
    const id = randomUUID();
    this.db.prepare("INSERT INTO automation_runs (id, rule_id, ts, event_action, event_id, outcome, message) VALUES (?, ?, ?, ?, ?, ?, ?)").run(id, rule.id, at.toISOString(), clean(eventAction, 80), eventId === null ? null : clean(eventId, 80), outcome, clean(message, 300));
    return id;
  }

  // ---- Zaman tetikleyicisi ----

  // Zamanlama çapası: son çalışma (başarılı/hatalı) ya da 'missed' kaydı; hiç yoksa kuralın oluşturulma anı.
  private anchorMs(rule: Rule): number {
    const r = this.db.prepare(`SELECT ts FROM automation_runs WHERE rule_id = ? AND outcome IN (${EXEC_OUTCOMES}, 'missed') ORDER BY ts DESC, rowid DESC LIMIT 1`).get(rule.id) as { ts: string } | undefined;
    const t = r ? Date.parse(r.ts) : Date.parse(rule.createdAt);
    return Number.isFinite(t) ? t : 0;
  }

  // Zamanı gelmiş çalışma var mı? late=true: kaçırıldı (toplu çalıştırılmaz).
  private due(rule: Rule, atMs: number): { slotMs: number; late: boolean } | null {
    const s = rule.schedule;
    if (!s) return null;
    const anchor = this.anchorMs(rule);
    if (s.kind === "interval") {
      const every = s.everyMinutes * 60_000;
      const slot = anchor + every;
      return atMs >= slot ? { slotMs: slot, late: atMs - slot >= every } : null;
    }
    const slot = latestDailySlot(s, atMs);
    if (slot === null || slot <= anchor) return null;
    return { slotMs: slot, late: atMs - slot > DAILY_GRACE_MS };
  }

  // Bir sonraki planlı çalışma anı (ISO) ya da null (olay kuralı / kapalı / hesaplanamadı).
  nextRunAt(rule: Rule, at: Date = this.now()): string | null {
    const s = rule.schedule;
    if (!rule.enabled || !s) return null;
    const atMs = at.getTime();
    const d = this.due(rule, atMs);
    let t: number | null;
    if (s.kind === "interval") t = this.anchorMs(rule) + s.everyMinutes * 60_000;
    else t = d && !d.late ? d.slotMs : nextDailySlot(s, atMs);
    return t === null || !Number.isFinite(t) ? null : new Date(t).toISOString();
  }

  // Arayüz/uç görünümü: kural + tetikleyici ve sonraki çalışma.
  ruleView(rule: Rule, at: Date = this.now()): Rule & { trigger: { kind: "event"; eventPattern: string } | { kind: "schedule"; schedule: Schedule }; nextRunAt: string | null } {
    return { ...rule, trigger: rule.schedule ? { kind: "schedule", schedule: rule.schedule } : { kind: "event", eventPattern: rule.eventPattern }, nextRunAt: this.nextRunAt(rule, at) };
  }

  // Dakikada bir zamanlayıcı tarafından çağrılır (testlerde sahte saatle elle). Tick başına en çok 20 kural, kural başına en çok 1 çalışma; süreç içi tek tick kilidi.
  async tick(at: Date = this.now()): Promise<TickResult> {
    const out: TickResult = { ran: 0, missed: 0, skipped: 0, errors: 0, busy: false };
    if (this.ticking) {
      out.busy = true;
      return out;
    }
    this.ticking = true;
    try {
      const rules = (this.db.prepare("SELECT * FROM automation_rules WHERE enabled = 1 AND trigger_kind = 'schedule' ORDER BY created_at, rowid LIMIT ?").all(TICK_MAX_RULES) as unknown as RuleRow[]).map((r) => this.mapRule(r));
      for (const rule of rules) {
        try {
          const d = this.due(rule, at.getTime());
          if (!d) continue;
          if (d.late) {
            this.log(rule, at, "schedule", null, "missed", `kaçırıldı: planlı çalışma ${new Date(d.slotMs).toISOString()} anında yapılamadı (uygulama kapalıydı ya da gecikti); toplu çalıştırılmaz, takvim ileri taşındı`);
            out.missed++;
            continue;
          }
          const o = (await this.fire(rule, at, "schedule")).outcome;
          if (o === "error") out.errors++;
          else if (o === "busy" || o === "skipped_cooldown" || o === "skipped_rate") out.skipped++;
          else out.ran++;
        } catch (e) {
          out.errors++;
          process.stderr.write(`[automation] zamanlı kural hatası: ${e instanceof Error ? clean(e.message, 150) : "bilinmeyen"}\n`);
        }
      }
    } finally {
      this.ticking = false;
    }
    return out;
  }

  // Kullanıcının denemesi: zamanlı kuralı hemen çalıştırır (bekleme süresi ve saatlik sınır geçerli). Olay kuralı ve kapalı kural çalıştırılamaz.
  // Kural başına dakikada en çok 5 deneme (aşılırsa rate_limited); aynı kural zaten çalışıyorsa busy. Atlama satırları tekrarsızdır: yeni satır yazılmazsa yanıtta skippedReason döner.
  async runNow(id: string, actor: Actor, at: Date = this.now()): Promise<{ run: Run; skippedReason?: string }> {
    if (actor.kind !== "user") throw new AutomationError("approval_requires_user", "only the user can run a rule now");
    const rule = this.getRule(id);
    if (!rule) throw new AutomationError("not_found", "unknown rule");
    if (rule.triggerKind !== "schedule") throw new AutomationError("not_schedule", "only scheduled rules can be run now");
    if (!rule.enabled) throw new AutomationError("rule_disabled", "the rule is disabled");
    const recent = (this.manualAttempts.get(id) ?? []).filter((t) => at.getTime() - t < 60_000 && at.getTime() - t >= 0);
    if (recent.length >= RUN_NOW_PER_MINUTE) throw new AutomationError("rate_limited", `run-now: at most ${RUN_NOW_PER_MINUTE} attempts per minute per rule`);
    this.manualAttempts.set(id, [...recent, at.getTime()]);
    const res = await this.fire(rule, at, "schedule.run-now");
    if (res.outcome === "busy") throw new AutomationError("busy", "this rule is already running");
    const row = res.runId
      ? this.db.prepare("SELECT * FROM automation_runs WHERE id = ?").get(res.runId)
      : this.db.prepare("SELECT * FROM automation_runs WHERE rule_id = ? ORDER BY ts DESC, rowid DESC LIMIT 1").get(id);
    const r = row as unknown as { id: string; rule_id: string; ts: string; event_action: string; event_id: string | null; outcome: string; message: string };
    const run: Run = { id: r.id, ruleId: r.rule_id, ts: r.ts, eventAction: r.event_action, eventId: r.event_id, outcome: r.outcome as Run["outcome"], message: r.message };
    return res.skippedReason ? { run, skippedReason: res.skippedReason } : { run };
  }

  // Tek çalışma: önce (eşzamansız bölümden ÖNCE, senkron) bekleme süresi, saatlik sınır ve "çalışıyor" kümesi; sonra eylem. Eşzamanlı çağrılar sınırları atlatamaz.
  private async fire(rule: Rule, at: Date, source: string): Promise<{ outcome: Run["outcome"] | "busy"; runId: string | null; skippedReason?: string }> {
    if (this.running.has(rule.id)) return { outcome: "busy", runId: null, skippedReason: "kural zaten çalışıyor" };
    const last = this.db.prepare(`SELECT ts FROM automation_runs WHERE rule_id = ? AND outcome IN (${EXEC_OUTCOMES}) ORDER BY ts DESC, rowid DESC LIMIT 1`).get(rule.id) as { ts: string } | undefined;
    const skip = (outcome: "skipped_cooldown" | "skipped_rate", message: string): { outcome: Run["outcome"]; runId: string | null; skippedReason?: string } => {
      const prev = this.db.prepare("SELECT outcome FROM automation_runs WHERE rule_id = ? ORDER BY ts DESC, rowid DESC LIMIT 1").get(rule.id) as { outcome: string } | undefined;
      if (prev?.outcome === outcome) return { outcome, runId: null, skippedReason: message };
      return { outcome, runId: this.log(rule, at, source, null, outcome, message) };
    };
    if (last && at.getTime() - Date.parse(last.ts) < rule.cooldownSeconds * 1000) return skip("skipped_cooldown", `bekleme süresi dolmadı (${rule.cooldownSeconds} sn)`);
    const hourAgo = new Date(at.getTime() - 3600_000).toISOString();
    const n = (this.db.prepare(`SELECT count(*) AS n FROM automation_runs WHERE rule_id = ? AND ts > ? AND outcome IN (${EXEC_OUTCOMES})`).get(rule.id, hourAgo) as { n: number }).n;
    if (Number(n) >= MAX_RUNS_PER_HOUR) return skip("skipped_rate", `saatlik sınır (${MAX_RUNS_PER_HOUR}) doldu`);
    this.running.add(rule.id);
    try {
      const { outcome, message } = await this.execute(rule);
      return { outcome, runId: this.log(rule, at, source, null, outcome, message) };
    } finally {
      this.running.delete(rule.id);
    }
  }

  private async execute(rule: Rule): Promise<{ outcome: Run["outcome"]; message: string }> {
    let outcome: Run["outcome"];
    let message: string;
    if (rule.actionKind === "notify") {
      outcome = "notified";
      message = rule.params.message ?? "";
    } else if (rule.actionKind === "record_task") {
      if (!this.createTask) {
        outcome = "error";
        message = "görev oluşturucu bağlı değil";
      } else {
        try {
          this.createTask(rule.params.title ?? "", { actor: AUTOMATION_ACTOR, action: rule.params.action as ActionRequest["action"], target: rule.params.target as string });
          outcome = "task_recorded";
          message = `görev kaydı: ${rule.params.title}`;
        } catch (e) {
          outcome = "error";
          message = `görev kaydı açılamadı: ${e instanceof Error ? clean(e.message, 150) : "bilinmeyen hata"}`;
        }
      }
    } else {
      const name = rule.params.analysis;
      if (!(ANALYSES as readonly string[]).includes(name ?? "")) {
        outcome = "error";
        message = "bilinmeyen analiz (beyaz listede yok)";
      } else if (!this.analysisRunner) {
        outcome = "error";
        message = "analiz çalıştırıcı bağlı değil";
      } else {
        let timer: ReturnType<typeof setTimeout> | undefined;
        try {
          const summary = await Promise.race([Promise.resolve(this.analysisRunner(name as AnalysisName)), new Promise<never>((_ok, no) => {
            timer = setTimeout(() => no(new Error("analiz zaman aşımı")), ANALYSIS_TIMEOUT_MS);
            timer.unref();
          })]);
          outcome = "scheduled_ok";
          message = `${name}: ${clean(summary, 280) || "(boş özet)"}`;
        } catch (e) {
          outcome = "error";
          message = `analiz çalışmadı (${name}): ${e instanceof Error ? clean(e.message, 150) : "bilinmeyen hata"}`;
        } finally {
          if (timer) clearTimeout(timer);
        }
      }
    }
    return { outcome, message };
  }

  private mapRule(r: RuleRow): Rule {
    let params: Record<string, string> = {};
    try {
      const v: unknown = JSON.parse(r.params_json);
      if (v && typeof v === "object") params = v as Record<string, string>;
    } catch {
      params = {};
    }
    let schedule: Schedule | null = null;
    if (r.trigger_kind === "schedule") {
      try {
        schedule = parseSchedule(JSON.parse(r.schedule_json ?? "null"));
      } catch {
        schedule = null; // bozuk satır: zamanı hiç gelmez (güvenli taraf)
      }
    }
    return { id: r.id, name: r.name, eventPattern: r.event_pattern, triggerKind: r.trigger_kind === "schedule" ? "schedule" : "event", schedule, actionKind: r.action_kind as Rule["actionKind"], params, enabled: r.enabled === 1, cooldownSeconds: r.cooldown_s, createdBy: r.created_by, createdAt: r.created_at };
  }
}
