// Kullanım-tabanlı DENETİMLİ yedek (Faz 11 dilim 4, madde 30/7/28). Sahip: Claude [İP:AgentMom Faz 11].
// Sabit saat YOK: AgentMom'da son yedekten beri gerçek değişiklik (denetim olayları: görev, onay, hafıza, karar, alt oturum, iş akışı…) oldu ve kullanım
// sakinleştiyse (boşta kalma süresi) ya da uygulama kapanırken yedek alınır; hiç değişiklik yoksa yedek ALINMAZ. Yedeği mevcut createBackup/verifyBackup
// yapar (anahtar/belirteç içermez, üzerine yazmaz, hiçbir şeyi silmez). Bu modül politika/ACL'e dokunamaz; yalnız bu iki işlevi çağırır.
// Her karar (alındı/atlandı + sebep) denetim kaydına yazılır (atlama kararları aynı sebeple günde en çok bir kez, kayıt şişmesin).
// Uyarılar görünürdür: yedek başarısız, yedek doğrulaması başarısız, çok eski yedek ama etkinlik var, zamanlayıcı hata verdi. Çökme sessiz kalmaz.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { AuditLog } from "../core/audit/audit.ts";
import type { Db } from "../core/db/db.ts";
import { MANIFEST, createBackup, verifyBackup } from "./backup.ts";
import type { CreateBackupOptions, VerifyReport } from "./backup.ts";

export interface SchedulerConfig {
  minChanges: number; // son yedekten beri en az bu kadar anlamlı değişiklik (yedek hiç yoksa 1)
  idleMs: number; // son etkinlikten sonra bu kadar sakinlik
  tickMs: number; // kontrol aralığı
  staleWarnMs: number; // etkinlik varken bu kadar eski yedek = uyarı
  verifyEveryMs: number; // en son yedeğin periyodik doğrulaması
  skipLogEveryMs: number; // aynı atlama sebebi denetim kaydına en çok bu sıklıkla yazılır
}

export const DEFAULT_SCHEDULER: SchedulerConfig = { minChanges: 8, idleMs: 10 * 60_000, tickMs: 60_000, staleWarnMs: 3 * 24 * 3600_000, verifyEveryMs: 12 * 3600_000, skipLogEveryMs: 24 * 3600_000 };

export type DecisionCode = "no_activity" | "few_changes" | "busy" | "idle" | "closing" | "first_backup" | "manual" | "backoff";
export interface Decision {
  action: "backup" | "skip";
  code: DecisionCode;
  reason: string;
}

export interface DecideInput {
  now: number;
  lastBackupAt: number | null;
  changesSince: number;
  lastActivityAt: number | null;
  closing?: boolean;
  manual?: boolean;
  // Başarısız yedekten sonra bu ana kadar otomatik deneme YOK (üstel geri çekilme); elle yedek bunu aşar.
  backoffUntil?: number | null;
}

// Saf karar işlevi (testlenebilir): yedek alınsın mı?
export function decide(cfg: SchedulerConfig, i: DecideInput): Decision {
  if (i.manual) return { action: "backup", code: "manual", reason: "Yusuf yedek istedi" };
  if (i.changesSince <= 0) return { action: "skip", code: "no_activity", reason: "son yedekten beri değişiklik yok" };
  if (i.backoffUntil && i.now < i.backoffUntil) return { action: "skip", code: "backoff", reason: `önceki yedek denemesi başarısız oldu; ${Math.ceil((i.backoffUntil - i.now) / 60000)} dk sonra yeniden denenecek` };
  const threshold = i.lastBackupAt === null ? 1 : cfg.minChanges;
  if (i.closing) return { action: "backup", code: "closing", reason: `uygulama kapanıyor, ${i.changesSince} değişiklik yedeksiz` };
  if (i.changesSince < threshold) return { action: "skip", code: "few_changes", reason: `yalnız ${i.changesSince} değişiklik var (eşik ${threshold})` };
  const idleFor = i.lastActivityAt === null ? Infinity : i.now - i.lastActivityAt;
  if (idleFor < cfg.idleMs) return { action: "skip", code: "busy", reason: `kullanım sürüyor (son etkinlik ${Math.round(idleFor / 1000)} sn önce, sakinlik ${Math.round(cfg.idleMs / 60000)} dk)` };
  return { action: "backup", code: i.lastBackupAt === null ? "first_backup" : "idle", reason: `${i.changesSince} değişiklik var ve kullanım sakinleşti` };
}

export interface Warning {
  code: "clock_skew" | "backup_failed" | "verify_failed" | "stale_with_activity" | "scheduler_error";
  text: string;
}

export interface BackupStatus {
  lastBackup: { at: string; dir: string; reason: string } | null;
  ageHours: number | null;
  changesSince: number;
  lastVerify: { at: string; ok: boolean; problems: string[] } | null;
  lastDecision: { at: string; action: string; code: string; reason: string } | null;
  warnings: Warning[];
  config: { minChanges: number; idleMinutes: number; staleDays: number };
}

export interface SchedulerDeps {
  db: Db;
  audit: AuditLog;
  backupOptions: Omit<CreateBackupOptions, "db" | "reason" | "now">;
  cfg?: Partial<SchedulerConfig>;
  now?: () => Date;
  // Testler için: gerçek yedek/doğrulama yerine konabilir. Varsayılanlar gerçek createBackup/verifyBackup'tır.
  create?: typeof createBackup;
  verify?: typeof verifyBackup;
}

const SYSTEM = { kind: "system", id: "backup-scheduler" } as const;

// Yedekten sayılan "anlamlı" değişiklik: denetim olaylarından yedek, akış gürültüsü ve salt okuma olayları hariç.
const MEANINGFUL_SQL = `action NOT LIKE 'backup.%' AND action NOT LIKE 'provider.event:%' AND action NOT LIKE 'run.refused%' AND action NOT LIKE '%.read'`;

export class BackupScheduler {
  private readonly cfg: SchedulerConfig;
  private readonly now: () => Date;
  private readonly create: typeof createBackup;
  private readonly verify: typeof verifyBackup;
  private busy = false;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastBackupError: string | null = null; // yedek denemesi hatası (bir sonraki BAŞARILI yedeğe kadar kalır)
  private lastSchedulerError: string | null = null; // zamanlayıcı/denetim hatası (sonraki sorunsuz turda silinir)
  private failCount = 0;
  private backoffUntil: number | null = null;
  private clockSkew = false;
  private lastSkipLog = new Map<string, number>();
  private lastVerifyAtMs = 0;

  private readonly deps: SchedulerDeps;

  constructor(deps: SchedulerDeps) {
    this.deps = deps;
    this.cfg = { ...DEFAULT_SCHEDULER, ...(deps.cfg ?? {}) };
    this.now = deps.now ?? (() => new Date());
    this.create = deps.create ?? createBackup;
    this.verify = deps.verify ?? verifyBackup;
  }

  // Uygulama içi tetikleme: Windows Görev Zamanlayıcı, yönetici izni ya da dış süreç GEREKMEZ.
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), this.cfg.tickMs);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  // En yeni yedeğin manifesti: createdAt'e göre (dizin adına değil) ve GELECEK tarihlilerle (saat geri alınmış/sahte manifest) bastırılmadan.
  private latestBackup(): { dir: string; createdAt: number; reason: string; path: string } | null {
    const root = this.deps.backupOptions.destRoot;
    if (!existsSync(root)) return null;
    const nowMs = this.now().getTime();
    let best: { dir: string; createdAt: number; reason: string; path: string } | null = null;
    let skew = false;
    const names = readdirSync(root).filter((n) => /^agentmom-yedek-/.test(n)).sort().reverse().slice(0, 40);
    for (const n of names) {
      const mf = join(root, n, MANIFEST);
      if (!existsSync(mf)) continue; // bitmemiş deneme
      try {
        const m = JSON.parse(readFileSync(mf, "utf8")) as { createdAt?: string; reason?: string };
        const t = Date.parse(m.createdAt ?? "");
        if (!Number.isFinite(t)) continue;
        if (t > nowMs + 5 * 60_000) {
          skew = true;
          continue;
        }
        if (!best || t > best.createdAt) best = { dir: n, createdAt: t, reason: String(m.reason ?? ""), path: join(root, n) };
      } catch {
        /* bozuk manifest: sonrakine bak; doğrulama zaten bunu raporlar */
      }
    }
    this.clockSkew = skew;
    return best;
  }

  private changesSince(sinceMs: number | null): { count: number; lastAt: number | null } {
    const since = sinceMs === null ? "1970-01-01T00:00:00.000Z" : new Date(sinceMs).toISOString();
    const r = this.deps.db.prepare(`SELECT COUNT(*) AS n, MAX(ts) AS last FROM audit_events WHERE ts > ? AND ${MEANINGFUL_SQL}`).get(since) as unknown as { n: number; last: string | null };
    return { count: r.n, lastAt: r.last ? Date.parse(r.last) : null };
  }

  private record(action: string, decision: string, result: string, details: Record<string, unknown>): void {
    try {
      this.deps.audit.record({ initiator: SYSTEM, action, decision, result, details });
    } catch {
      /* denetim yazılamıyorsa uyarı olarak görünür kalması için lastError'a düşer */
      this.lastSchedulerError = "zamanlayıcı: denetim kaydı yazılamadı";
    }
  }

  private logSkip(d: Decision, details: Record<string, unknown>): void {
    const k = d.code;
    const t = this.now().getTime();
    let prev = this.lastSkipLog.get(k) ?? 0;
    if (prev > t) prev = 0; // saat geri alındı: süzgeç sıfırlanır (kayıt susmasın)
    if (t - prev < this.cfg.skipLogEveryMs) return;
    this.lastSkipLog.set(k, t);
    this.record("backup.decision", "skip", d.code, { reason: d.reason, ...details });
  }

  private doBackup(d: Decision, extra: Record<string, unknown>): { ok: boolean; verifyOk: boolean; dir?: string } {
    try {
      const made = this.create({ ...this.deps.backupOptions, db: this.deps.db, reason: d.code === "manual" ? "manuel" : `otomatik:${d.code}`, now: this.now });
      const v = this.verify(made.dir);
      this.lastVerifyAtMs = this.now().getTime();
      this.lastBackupError = null;
      this.failCount = 0;
      this.backoffUntil = null;
      this.record("backup.decision", "backup", d.code, { reason: d.reason, dir: made.dir.split(/[\\/]/).pop(), ...extra });
      this.record("backup.verify", v.ok ? "ok" : "failed", v.ok ? "ok" : "failed", { dir: made.dir.split(/[\\/]/).pop(), problems: v.problems.slice(0, 5) });
      return { ok: true, verifyOk: v.ok, dir: made.dir };
    } catch (e) {
      this.lastBackupError = (e as Error).message.slice(0, 200);
      this.failCount += 1;
      // Üstel geri çekilme: 30 dk, 1 sa, 2 sa … en çok 24 sa (başarısız deneme dakikada bir tam veritabanı kopyası üretmesin).
      this.backoffUntil = this.now().getTime() + Math.min(24 * 3600_000, 30 * 60_000 * 2 ** (this.failCount - 1));
      this.record("backup.failed", "backup", "failed", { code: d.code, error: this.lastBackupError, attempt: this.failCount });
      return { ok: false, verifyOk: false };
    }
  }

  // Bir kontrol turu: karar ver, uygula, kaydet. Hata fırlatmaz; hata uyarı olarak görünür kalır.
  async tick(opts: { closing?: boolean; manual?: boolean } = {}): Promise<(Decision & { ok?: boolean; verifyOk?: boolean; dir?: string }) | null> {
    if (this.busy) return null; // tek örnek: aynı anda tek yedek
    this.busy = true;
    try {
      const last = this.latestBackup();
      const ch = this.changesSince(last?.createdAt ?? null);
      const d = decide(this.cfg, { now: this.now().getTime(), lastBackupAt: last?.createdAt ?? null, changesSince: ch.count, lastActivityAt: ch.lastAt, closing: opts.closing === true, manual: opts.manual === true, backoffUntil: opts.manual ? null : this.backoffUntil });
      this.lastSchedulerError = null;
      let result: Decision & { ok?: boolean; verifyOk?: boolean; dir?: string } = d;
      if (d.action === "skip") this.logSkip(d, { changesSince: ch.count });
      else result = { ...d, ...this.doBackup(d, { changesSince: ch.count }) };
      this.maybeVerifyLatest();
      return result;
    } catch (e) {
      this.lastSchedulerError = `zamanlayıcı hatası: ${(e as Error).message.slice(0, 160)}`;
      this.record("backup.scheduler_error", "error", "failed", { error: this.lastSchedulerError });
      return null;
    } finally {
      this.busy = false;
    }
  }

  // Periyodik doğrulama: en son yedek, yedek alınmasa da arada bir yeniden doğrulanır.
  private maybeVerifyLatest(): void {
    const t = this.now().getTime();
    if (t - this.lastVerifyAtMs < this.cfg.verifyEveryMs) return;
    const last = this.latestBackup();
    if (!last) return;
    this.lastVerifyAtMs = t;
    let v: VerifyReport;
    try {
      v = this.verify(last.path);
    } catch (e) {
      v = { ok: false, problems: [(e as Error).message.slice(0, 160)], needsMigration: false, manifest: null };
    }
    this.record("backup.verify", v.ok ? "ok" : "failed", v.ok ? "periodic" : "failed", { dir: last.dir, problems: v.problems.slice(0, 5) });
  }

  // Uygulama kapanırken: değişiklik varsa yedek al (eşik ve sakinlik aranmaz). Kapanışı engellememek için hata fırlatmaz.
  async close(): Promise<void> {
    this.stop();
    await this.tick({ closing: true });
  }

  manual(): Promise<(Decision & { ok?: boolean; verifyOk?: boolean; dir?: string }) | null> {
    return this.tick({ manual: true });
  }

  private lastAuditOf(action: string): { ts: string; decision: string; result: string; details: Record<string, unknown> } | null {
    const r = this.deps.db.prepare("SELECT ts, decision, result, details_json FROM audit_events WHERE action = ? ORDER BY ts DESC LIMIT 1").get(action) as unknown as { ts: string; decision: string; result: string; details_json: string } | undefined;
    if (!r) return null;
    let details: Record<string, unknown> = {};
    try {
      details = JSON.parse(r.details_json) as Record<string, unknown>;
    } catch {
      /* bozuk ayrıntı: boş */
    }
    return { ts: r.ts, decision: r.decision, result: r.result, details };
  }

  status(): BackupStatus {
    const nowMs = this.now().getTime();
    const last = this.latestBackup();
    const ch = this.changesSince(last?.createdAt ?? null);
    const v = this.lastAuditOf("backup.verify");
    const dec = this.lastAuditOf("backup.decision");
    const failed = this.lastAuditOf("backup.failed");
    const warnings: Warning[] = [];
    if (this.lastSchedulerError) warnings.push({ code: "scheduler_error", text: this.lastSchedulerError });
    if (this.clockSkew) warnings.push({ code: "clock_skew", text: "Bir yedeğin tarihi gelecekte görünüyor (saat geri alınmış ya da sahte manifest): bu yedek en yeni sayılmaz." });
    const failedAfterBackup = failed && (!last || Date.parse(failed.ts) > last.createdAt);
    if (this.lastBackupError || failedAfterBackup) warnings.push({ code: "backup_failed", text: `Son yedek denemesi başarısız: ${this.lastBackupError ?? String(failed?.details.error ?? "bilinmiyor")}${this.backoffUntil ? " (otomatik yeniden deneme beklemede)" : ""}` });
    if (v && v.decision === "failed") warnings.push({ code: "verify_failed", text: `Yedek doğrulaması başarısız (${v.ts}): ${(Array.isArray(v.details.problems) ? v.details.problems : []).join("; ") || "ayrıntı yok"}` });
    const ageMs = last ? nowMs - last.createdAt : null;
    if (ch.count > 0 && (ageMs === null || ageMs > this.cfg.staleWarnMs)) warnings.push({ code: "stale_with_activity", text: ageMs === null ? `Hiç yedek yok ama ${ch.count} değişiklik var.` : `Son yedek ${Math.round(ageMs / 3600_000)} saat önce ve ${ch.count} değişiklik yedeksiz.` });
    return {
      lastBackup: last ? { at: new Date(last.createdAt).toISOString(), dir: last.dir, reason: last.reason } : null,
      ageHours: ageMs === null ? null : Math.round((ageMs / 3600_000) * 10) / 10,
      changesSince: ch.count,
      lastVerify: v ? { at: v.ts, ok: v.decision !== "failed", problems: Array.isArray(v.details.problems) ? (v.details.problems as unknown[]).map(String) : [] } : null,
      lastDecision: dec ? { at: dec.ts, action: dec.decision, code: dec.result, reason: String(dec.details.reason ?? "") } : null,
      warnings,
      config: { minChanges: this.cfg.minChanges, idleMinutes: Math.round(this.cfg.idleMs / 60000), staleDays: Math.round(this.cfg.staleWarnMs / 86400000) },
    };
  }
}
