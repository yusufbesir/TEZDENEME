// Zamanlanmış analizlerin KISA özetleri (madde 13 zaman tetikleyicisi, ADR-016). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// Yalnız mevcut SALT-OKUNUR analiz raporlarını tek cümlelik özete çevirir; model çağrısı, ağ, dosya yazımı YOK. Rapor üreticileri uygulamadan (app.ts) verilir.
// Çıktı AutomationEngine tarafından sır taramasından geçirilip 300 karaktere kırpılır; burada da kendi sınırı vardır.
import { redactString } from "../core/audit/redact.ts";
import type { AttentionPlan } from "../core/attention.ts";
import type { HalfLifeMap } from "../memory/halflife.ts";
import type { LearningReport } from "../reasoning/learning.ts";
import type { AbsenceReport } from "../analysis/absence.ts";
import type { ContinuityReport } from "../analysis/continuity.ts";
import type { OfflineReport } from "../analysis/offline.ts";
import type { ShadowReport } from "../analysis/shadow-price.ts";
import type { AnalysisName, AnalysisRunner } from "./automation.ts";

export interface AnalysisSources {
  attention(): AttentionPlan;
  halflife(): HalfLifeMap;
  learning(): LearningReport;
  absence(): Promise<AbsenceReport>;
  continuity(): ContinuityReport;
  offline(): OfflineReport;
  shadowPrice(): ShadowReport;
}

const MAX_SUMMARY = 280;

export function summarizeAttention(p: AttentionPlan): string {
  return `bekleyen onay: ${p.totalAwaiting} (${p.counts.critical} kritik; şimdi ${p.counts.now}, bugün ${p.counts.today}, toplu ${p.counts.batch} grup)${p.truncated ? "; kısmi tarama" : ""}`;
}

export function summarizeHalfLife(m: HalfLifeMap): string {
  const enough = m.byKind.filter((g) => g.status === "yeterli").length;
  const stale = m.byKind.reduce((a, g) => a + g.staleCount + g.expiredCount, 0);
  return `hafıza kaydı: ${m.recordsRead}; bayat/süresi dolmuş: ${stale}; yeterli veriyle yarı ömür tahmini: ${enough}/${m.byKind.length} tür`;
}

export function summarizeLearning(r: LearningReport): string {
  const o = r.overall;
  return `çözülen tahmin: ${o.resolved}, açık: ${o.open} (vadesi geçen ${o.unresolvedOverdue}); durum: ${o.status}${o.trend ? `; eğilim: ${o.trend}` : ""}`;
}

export function summarizeAbsence(r: AbsenceReport): string {
  return `kullanılmayan tablo: ${r.unused.tables.total}, kullanılmayan uç: ${r.unused.endpoints.total}, yetenek: ${r.unused.capabilities.total}; arayüzsüz uç: ${r.missing.endpointsWithoutUi.total}; doğrudan testsiz modül: ${r.missing.modulesWithoutDirectTest.total}${r.scan.truncated ? "; kısmi tarama" : ""}`;
}

export function summarizeContinuity(r: ContinuityReport): string {
  const s = r.summary;
  return `sağlayıcı: ${s.providers} (etkin ${s.activeProviders}); tek noktaya bağlı yetenek: ${s.singlePoints} (temel ${s.essentialSinglePoints}); kimsenin sunmadığı: ${s.offeredByNobody}`;
}

export function summarizeOffline(r: OfflineReport): string {
  return `mod: ${r.mode}; kullanılabilir sağlayıcı: ${r.usableProviders}, doğrulanmış: ${r.verifiedProviders}`;
}

export function summarizeShadowPrice(r: ShadowReport): string {
  const tight = r.providers.filter((p) => p.level === "kıt" || p.level === "çok kıt").map((p) => p.provider);
  return `sağlayıcı: ${r.providers.length}; kıt/çok kıt: ${tight.length}${tight.length ? ` (${tight.slice(0, 5).join(", ")})` : ""}${r.truncated ? "; kısmi veri" : ""}`;
}

// Beyaz listedeki her ad için tek bir salt-okunur rapor + özet. Bilinmeyen ad fırlatır (motor da beyaz listeyi ayrıca denetler).
export function buildAnalysisRunner(src: AnalysisSources): AnalysisRunner {
  return async (name: AnalysisName): Promise<string> => {
    let text: string;
    switch (name) {
      case "attention": text = summarizeAttention(src.attention()); break;
      case "halflife": text = summarizeHalfLife(src.halflife()); break;
      case "learning": text = summarizeLearning(src.learning()); break;
      case "absence": text = summarizeAbsence(await src.absence()); break;
      case "continuity": text = summarizeContinuity(src.continuity()); break;
      case "offline": text = summarizeOffline(src.offline()); break;
      case "shadow-price": text = summarizeShadowPrice(src.shadowPrice()); break;
      default: throw new Error(`bilinmeyen analiz: ${String(name)}`);
    }
    return redactString(text).slice(0, MAX_SUMMARY);
  };
}
