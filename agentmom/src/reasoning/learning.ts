// Öğrenme getirisi hesaplayıcı (madde 97). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Kalibrasyon defterindeki (predictions) ÇÖZÜLMÜŞ tahminlerden, kaynak başına öğrenmenin Brier puanına yansıyıp yansımadığını ölçer.
// SALT OKUNUR: hiçbir şey yazmaz; model/ağ/dosya yok. Aynı veri => aynı çıktı.
// Brier = ortalama (güven − sonuç)²  (0 = mükemmel, düşük = iyi). Tahminler OLUŞTURULMA sırasıyla dizilir; n çift ise ilk n/2 ve son n/2,
// n tekse ortadaki tahmin dışarıda bırakılır (iki yarı eşit boyutta). İyileşme = ilk yarı Brier − son yarı Brier (pozitif = iyileşme).
// Öğrenme getirisi = iyileşme / çözülmüş tahmin sayısı. Yeterli veri eşiği: ≥ 10 çözülmüş tahmin; altında "yetersiz veri" (iyileşme ve getiri YOK).
// Güven aralığı HESAPLANMAZ; örnek boyutu daima gösterilir.
import type { Db } from "../core/db/db.ts";

export const MIN_RESOLVED_FOR_LEARNING = 10;
export const MAX_SOURCES = 100;
export const TREND_THRESHOLD = 0.02;

export interface LearningEntry {
  source: string | null;
  resolved: number;
  open: number;
  unresolvedOverdue: number;
  meanBrier: number | null;
  firstHalfBrier: number | null;
  lastHalfBrier: number | null;
  improvement: number | null;
  learningReturn: number | null;
  trend: "iyileşiyor" | "değişmiyor" | "kötüleşiyor" | null;
  status: "yeterli" | "yetersiz veri";
  note: string;
}

export interface LearningReport {
  generatedAt: string;
  minResolved: number;
  sourcesTotal: number;
  truncated: boolean;
  overall: LearningEntry;
  sources: LearningEntry[];
  note: string;
}

export interface LearningSource {
  db: Db;
  now?: () => Date;
}

interface Row {
  source: string;
  confidence: number;
  due_at: string;
  created_at: string;
  outcome: number | null;
}

const mean = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
const brierOf = (rs: Row[]): number => mean(rs.map((r) => (r.confidence - (r.outcome as number)) ** 2));
const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;

function entry(source: string | null, rows: Row[], nowMs: number): LearningEntry {
  const resolved = rows.filter((r) => r.outcome !== null);
  const open = rows.filter((r) => r.outcome === null);
  const overdue = open.filter((r) => Date.parse(r.due_at) < nowMs).length;
  const n = resolved.length;
  const base = { source, resolved: n, open: open.length, unresolvedOverdue: overdue };
  if (n < MIN_RESOLVED_FOR_LEARNING) {
    return { ...base, meanBrier: n ? r6(brierOf(resolved)) : null, firstHalfBrier: null, lastHalfBrier: null, improvement: null, learningReturn: null, trend: null, status: "yetersiz veri", note: `Yetersiz veri: ${n} çözülmüş tahmin var, en az ${MIN_RESOLVED_FOR_LEARNING} gerekir. İyileşme ve öğrenme getirisi hesaplanmadı.` };
  }
  const sorted = [...resolved].sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
  const h = Math.floor(n / 2);
  const first = brierOf(sorted.slice(0, h));
  const last = brierOf(sorted.slice(n - h));
  const improvement = first - last;
  const trend: LearningEntry["trend"] = improvement > TREND_THRESHOLD ? "iyileşiyor" : improvement < -TREND_THRESHOLD ? "kötüleşiyor" : "değişmiyor";
  return {
    ...base,
    meanBrier: r6(brierOf(resolved)),
    firstHalfBrier: r6(first),
    lastHalfBrier: r6(last),
    improvement: r6(improvement),
    learningReturn: r6(improvement / n),
    trend,
    status: "yeterli",
    note: `${n} çözülmüş tahmin; ilk ${h} ve son ${h} tahmin karşılaştırıldı (eşik ±${TREND_THRESHOLD}). Güven aralığı hesaplanmaz: küçük örneklerde fark rastlantı olabilir.${overdue > 0 ? ` ${overdue} vadesi geçmiş tahmin hâlâ çözülmedi: çözülenler iltifat edici bir örnek olabilir.` : ""}`,
  };
}

export function learningReturn(src: LearningSource): LearningReport {
  const at = (src.now ?? (() => new Date()))();
  const rows = src.db.prepare("SELECT source, confidence, due_at, created_at, outcome FROM predictions ORDER BY created_at, rowid").all() as unknown as Row[];
  const bySource = new Map<string, Row[]>();
  for (const r of rows) {
    const list = bySource.get(r.source);
    if (list) list.push(r);
    else bySource.set(r.source, [r]);
  }
  const names = [...bySource.keys()].sort();
  return {
    generatedAt: at.toISOString(),
    minResolved: MIN_RESOLVED_FOR_LEARNING,
    sourcesTotal: names.length,
    truncated: names.length > MAX_SOURCES,
    overall: entry(null, rows, at.getTime()),
    sources: names.slice(0, MAX_SOURCES).map((s) => entry(s, bySource.get(s) as Row[], at.getTime())),
    note: "Yalnız BİLGİDİR: hesap kalibrasyon defterinden yapılır ve hiçbir şey yazmaz. Brier düşükse tahminler iyidir; iyileşme = ilk yarı − son yarı Brier; öğrenme getirisi = iyileşme / çözülmüş tahmin sayısı.",
  };
}
