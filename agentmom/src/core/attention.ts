// Dikkat bütçesi yöneticisi (madde 93). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Onay bekleyen görevleri (awaiting_approval) risk puanına ve bekleme süresine göre sıralar ve kullanıcının günlük dikkat bütçesine göre katmanlara böler.
// SAF SIRALAMA: yan etkisiz, görev durumunu değiştirmez, hiçbir şeyi onaylamaz/reddetmez, yazmaz; model/ağ/dosya yok.
// GRUPLAMA: aynı eylem + hedef + komut + sağlayıcıya sahip görevler TEK satırda toplanır (count, taskIds); böylece bir ajan çok sayıda
// benzer görevle "şimdi" katmanını dolduramaz. Grubun riski ortaktır (aynı girdi => aynı risk); bekleme süresi en eski görevinkidir.
// Öncelik = risk puanı + min(bekleme günü, 5) × 2  (en çok +10: bekleme, riskin yerine geçmez, yalnız eşitliği bozar/yaşlandırır).
// Katmanlar (grup başına): KRİTİK risk her zaman "şimdi"dir (bütçeyi aşsa bile) ve işaretlenir; kalan "şimdi" yerleri (bütçe − kritik grup sayısı)
// öncelik sırasıyla doldurulur; sonraki 2×bütçe grup "bugün"; kalanı "toplu/sonra".
import { redactString } from "./audit/redact.ts";
import { assessTaskRequest } from "./policy/risk.ts";
import type { RiskAssessment, RiskInput } from "./policy/risk.ts";
import type { Task } from "./tasks/tasks.ts";

export const DEFAULT_BUDGET = 5;
export const MIN_BUDGET = 1;
export const MAX_BUDGET = 50;
export const MAX_GROUP_TASK_IDS = 20;
const DAY = 86_400_000;
const AGING_MAX_DAYS = 5;
const AGING_PER_DAY = 2;

export type AttentionTier = "now" | "today" | "batch";
const TIER_LABEL: Record<AttentionTier, string> = { now: "şimdi", today: "bugün", batch: "toplu/sonra" };

export interface AttentionItem {
  // Grubun temsilcisi: en eski bekleyen görev.
  taskId: string;
  // Gruptaki görev sayısı ve (en çok 20) görev kimliği; en eski önce.
  count: number;
  taskIds: string[];
  title: string;
  requestedAction: string;
  riskLevel: RiskAssessment["level"];
  riskScore: number;
  priority: number;
  waitingMinutes: number;
  tier: AttentionTier;
  tierLabel: string;
  critical: boolean;
  reasons: string[];
}

export interface AttentionPlan {
  budget: number;
  // Onay bekleyen görev sayısı (gruplanmamış) ve grup sayısı.
  totalAwaiting: number;
  totalGroups: number;
  // Bekleyen görevlerin hepsi değerlendirilemediyse true (tarama sınırı).
  truncated: boolean;
  // Sayılar GRUP başınadır.
  counts: { now: number; today: number; batch: number; critical: number };
  overBudget: boolean;
  items: AttentionItem[];
  note: string;
}

function groupKey(t: Task): string {
  const r = t.request !== null && typeof t.request === "object" && !Array.isArray(t.request) ? (t.request as Record<string, unknown>) : {};
  const route = r.route !== null && typeof r.route === "object" && !Array.isArray(r.route) ? (r.route as Record<string, unknown>) : {};
  const s = (v: unknown): string => (typeof v === "string" ? v : "");
  return JSON.stringify([t.requestedAction, s(r.target), s(r.command), s(route.providerId) || s(r.provider), s(route.kind)]);
}

export function planAttention(tasks: readonly Task[], contract: RiskInput["contract"], opts: { budget?: number; now: Date; totalAwaiting?: number; truncated?: boolean }): AttentionPlan {
  const budget = opts.budget ?? DEFAULT_BUDGET;
  if (!Number.isInteger(budget) || budget < MIN_BUDGET || budget > MAX_BUDGET) throw new RangeError(`budget ${MIN_BUDGET}..${MAX_BUDGET} arasında bir tam sayı olmalı`);
  const nowMs = opts.now.getTime();
  const waitOf = (t: Task): number => {
    const w = nowMs - Date.parse(t.updatedAt);
    return Number.isFinite(w) ? Math.max(0, w) : 0;
  };
  const awaiting = tasks.filter((t) => t.state === "awaiting_approval");
  const groups = new Map<string, Task[]>();
  for (const t of awaiting) {
    const k = groupKey(t);
    const g = groups.get(k);
    if (g) g.push(t);
    else groups.set(k, [t]);
  }
  const scored = [...groups.values()].map((members) => {
    // En eski bekleyen önce (kararlı: eşitlikte kimlik).
    const sorted = [...members].sort((a, b) => waitOf(b) - waitOf(a) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const rep = sorted[0] as Task;
    const risk = assessTaskRequest(rep.requestedAction, rep.request, contract);
    const waitedMs = waitOf(rep);
    const priority = risk.score + Math.min(AGING_MAX_DAYS, waitedMs / DAY) * AGING_PER_DAY;
    return { rep, sorted, risk, waitedMs, priority };
  });
  scored.sort((a, b) => b.priority - a.priority || b.risk.score - a.risk.score || b.waitedMs - a.waitedMs || (a.rep.id < b.rep.id ? -1 : a.rep.id > b.rep.id ? 1 : 0));
  const criticalCount = scored.filter((s) => s.risk.level === "critical").length;
  let nowSlots = Math.max(0, budget - criticalCount);
  let todaySlots = 2 * budget;
  const items: AttentionItem[] = scored.map((s) => {
    const critical = s.risk.level === "critical";
    let tier: AttentionTier;
    if (critical) tier = "now";
    else if (nowSlots > 0) {
      tier = "now";
      nowSlots--;
    } else if (todaySlots > 0) {
      tier = "today";
      todaySlots--;
    } else tier = "batch";
    return {
      taskId: s.rep.id,
      count: s.sorted.length,
      taskIds: s.sorted.slice(0, MAX_GROUP_TASK_IDS).map((t) => t.id),
      title: redactString(s.rep.title).replace(/[\u0000-\u001f\u007f]+/g, " ").trim().slice(0, 200),
      requestedAction: s.rep.requestedAction,
      riskLevel: s.risk.level,
      riskScore: s.risk.score,
      priority: Math.round(s.priority * 100) / 100,
      waitingMinutes: Math.floor(s.waitedMs / 60_000),
      tier,
      tierLabel: TIER_LABEL[tier],
      critical,
      reasons: s.risk.reasons.map((r) => redactString(r)),
    };
  });
  const count = (tier: AttentionTier): number => items.filter((i) => i.tier === tier).length;
  const total = Math.max(opts.totalAwaiting ?? awaiting.length, awaiting.length);
  const truncated = opts.truncated === true;
  const repeated = items.filter((i) => i.count > 1).length;
  return {
    budget,
    totalAwaiting: total,
    totalGroups: items.length,
    truncated,
    counts: { now: count("now"), today: count("today"), batch: count("batch"), critical: criticalCount },
    overBudget: criticalCount > budget,
    items,
    note:
      "Yalnız SIRALAMADIR: görevler onaylanmadı ya da reddedilmedi; karar kullanıcıdadır. Kritik riskli görevler bütçeden bağımsız olarak her zaman 'şimdi' katmanındadır." +
      (repeated > 0 ? ` ${repeated} grup aynı eylem+hedef+komutu tekrarlayan görevleri tek satırda toplar (count, taskIds).` : "") +
      (truncated ? ` UYARI: ${total} bekleyen görevin yalnız ${awaiting.length} tanesi (en eski ve en yeni) değerlendirildi; aradaki görevler listelenmedi.` : ""),
  };
}
