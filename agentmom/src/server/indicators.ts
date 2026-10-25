// Durum göstergeleri (bağlam %, kota %, bekleyen onay, takılma şüphesi). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// SALT OKUNUR ve DURUMSUZ (yalnız 5 sn'lik bellek önbelleği): yalnız SELECT; hiçbir şey yazılmaz, hiçbir koşu iptal/yönlendirilmez, model ve ağ yok.
// UYDURMA YOK: sağlayıcının bildirmediği değer null/"unknown" kalır.
//  - Bağlam: oturumun/görevin son SAĞLAYICI BİLDİRİMLİ girdi+çıktı token'ı (usage.contextFor; bağlam halkasıyla AYNI hesap) ÷ pencere. Hiçbir adaptör bağlam penceresi bildirmez;
//    pencere olarak halkanın da kullandığı programın planlama sınırı (CONTEXT_LIMIT) alınır ve bu açıkça yazılır (windowSource). Token bildirilmediyse yüzde null.
//  - Kota: yalnız sağlayıcının kendi olayında bildirdiği kullanım yüzdesi (analysis/quota.ts); bildirmediyse null. Seviye: <%75 ok, >=%75 warn, >=%90 critical.
//  - Bekleyen onay: awaiting_approval sayısı + kritik risk sayısı (dikkat sırasıyla aynı risk hesabı; en çok 500 görev taranır).
import { levelOf, readProviderLimits } from "../analysis/quota.ts";
import type { IndicatorLevel } from "../analysis/quota.ts";
import type { Db } from "../core/db/db.ts";
import { assessTaskRequest } from "../core/policy/risk.ts";
import type { RiskInput } from "../core/policy/risk.ts";
import type { TaskStore } from "../core/tasks/tasks.ts";
import type { ProviderRegistry } from "../providers/registry.ts";
import { monitorReport } from "./monitor.ts";
import { contextFor } from "./usage.ts";

export const INDICATOR_TTL_MS = 5000;
export const INDICATOR_CACHE_MAX = 50;

export const APPROVAL_SCAN_MAX = 500;
const STALLED_ITEMS_MAX = 20;

export interface IndicatorsReport {
  context: {
    percent: number | null;
    usedTokens: number | null;
    windowTokens: number | null;
    source: "reported" | "unknown";
    level: IndicatorLevel;
    // Pencere sağlayıcıdan gelmez: "program_default" = halkayla ortak planlama sınırı; token yoksa "unknown".
    windowSource: "program_default" | "unknown";
    note: string;
  };
  quota: { percent: number | null; providerId: string | null; reported: boolean; level: IndicatorLevel; note: string };
  pendingApprovals: { count: number; critical: number; truncated: boolean };
  // Takılmış GÖRÜNEN koşular (yalnız şüphe; iptal/yönlendirme yok).
  stalled: { count: number; items: Array<{ taskId: string; lastTraceMin: number; long: boolean }> };
  generatedAt: string;
}

export interface IndicatorDeps {
  db: Db;
  registry: ProviderRegistry;
  tasks: TaskStore;
  contract: RiskInput["contract"];
  now: () => Date;
}

type Row = Record<string, unknown>;

// Oturum: alt oturum kimliği (görevi + sağlayıcısı kayıtlıdır) ya da doğrudan görev/iş akışı kimliği (halkanın "konu" kimliği).
function resolveSession(db: Db, session: string): { topicId: string | null; providerId: string | null; found: boolean } {
  const sub = db.prepare("SELECT task_id, provider FROM subsessions WHERE id = ?").get(session) as Row | undefined;
  if (sub) return { topicId: typeof sub.task_id === "string" ? sub.task_id : null, providerId: typeof sub.provider === "string" ? sub.provider : null, found: true };
  const viaTask = db.prepare("SELECT provider FROM subsessions WHERE task_id = ? ORDER BY updated_at DESC LIMIT 1").get(session) as Row | undefined;
  return { topicId: session, providerId: viaTask && typeof viaTask.provider === "string" ? viaTask.provider : null, found: false };
}

function contextIndicator(db: Db, topicId: string | null, hadSession: boolean): IndicatorsReport["context"] {
  const unknown = (note: string): IndicatorsReport["context"] => ({ percent: null, usedTokens: null, windowTokens: null, source: "unknown", level: "unknown", windowSource: "unknown", note });
  if (!hadSession) return unknown("bağlam: oturum seçilmedi");
  if (topicId === null) return unknown("bağlam: bu oturuma bağlı görev yok");
  const c = contextFor(db, topicId);
  if (!c) return unknown("bağlam: oturum/görev bulunamadı");
  if (c.tokens === null || c.pct === null) return unknown("bağlam: sağlayıcı token kullanımı bildirmedi");
  return {
    percent: c.pct,
    usedTokens: c.tokens,
    windowTokens: c.limit,
    source: "reported",
    level: levelOf(c.pct),
    windowSource: "program_default",
    note: "kullanılan token sağlayıcı bildirimli; pencere sağlayıcıdan gelmez, programın planlama sınırıdır (bağlam halkasıyla aynı hesap)",
  };
}

function quotaIndicator(deps: IndicatorDeps, providerId: string | null, sessionGiven: boolean, now: Date): IndicatorsReport["quota"] {
  // Oturum verilmiş ama sağlayıcısı bulunamadıysa başka sağlayıcının kotası ÖDÜNÇ ALINMAZ: bilinmiyor.
  if (sessionGiven && providerId === null) return { percent: null, providerId: null, reported: false, level: "unknown", note: "kota: bilinmiyor (oturumun sağlayıcısı bilinmiyor)" };
  const ids = providerId !== null ? [providerId] : deps.registry.list().map((p) => p.id);
  let best: { id: string; used: number } | null = null;
  for (const id of ids) {
    const used = readProviderLimits(deps.db, id, now)?.usedPct ?? null;
    if (used !== null && (best === null || used > best.used)) best = { id, used };
  }
  if (!best) return { percent: null, providerId, reported: false, level: "unknown", note: "kota: bilinmiyor (sağlayıcı kota bildirmedi ya da bildirim eski)" };
  return { percent: best.used, providerId: best.id, reported: true, level: levelOf(best.used), note: providerId === null ? "en yüksek bildirilmiş kullanım (oturum seçilmedi)" : "sağlayıcının bildirdiği kullanım" };
}

function approvalIndicator(deps: IndicatorDeps): IndicatorsReport["pendingApprovals"] {
  const total = deps.tasks.countByState("awaiting_approval");
  const scanned = total <= APPROVAL_SCAN_MAX ? deps.tasks.listByState("awaiting_approval", APPROVAL_SCAN_MAX) : [...deps.tasks.listByState("awaiting_approval", APPROVAL_SCAN_MAX / 2, "oldest"), ...deps.tasks.listByState("awaiting_approval", APPROVAL_SCAN_MAX / 2, "newest")];
  const uniq = [...new Map(scanned.map((t) => [t.id, t])).values()];
  const critical = uniq.filter((t) => assessTaskRequest(t.requestedAction, t.request, deps.contract).level === "critical").length;
  return { count: total, critical, truncated: total > uniq.length };
}

export function buildIndicators(deps: IndicatorDeps, session: string | null): IndicatorsReport {
  const at = deps.now();
  const s = session === null ? null : resolveSession(deps.db, session);
  const mon = monitorReport(deps.db, at, deps.contract);
  return {
    context: contextIndicator(deps.db, s ? s.topicId : null, s !== null),
    quota: quotaIndicator(deps, s ? s.providerId : null, s !== null, at),
    pendingApprovals: approvalIndicator(deps),
    stalled: { count: mon.stalled.length, items: mon.stalled.slice(0, STALLED_ITEMS_MAX).map((x) => ({ taskId: x.taskId, lastTraceMin: x.lastTraceMin, long: x.stalledLong })) },
    generatedAt: at.toISOString(),
  };
}

// Aynı oturum anahtarı için 5 sn'lik küçük bellek önbelleği (sınırlı boyut; en eski girdi atılır). Saat deps.now'dan gelir (test edilebilir).
export class IndicatorService {
  private readonly cache = new Map<string, { atMs: number; value: IndicatorsReport }>();
  private readonly deps: IndicatorDeps;

  constructor(deps: IndicatorDeps) {
    this.deps = deps;
  }

  get(session: string | null): IndicatorsReport {
    const key = session ?? "-";
    const nowMs = this.deps.now().getTime();
    const hit = this.cache.get(key);
    if (hit && nowMs - hit.atMs >= 0 && nowMs - hit.atMs < INDICATOR_TTL_MS) return hit.value;
    const value = buildIndicators(this.deps, session);
    this.cache.delete(key);
    this.cache.set(key, { atMs: nowMs, value });
    while (this.cache.size > INDICATOR_CACHE_MAX) {
      const oldest = this.cache.keys().next().value;
      if (oldest === undefined) break;
      this.cache.delete(oldest);
    }
    return value;
  }
}
