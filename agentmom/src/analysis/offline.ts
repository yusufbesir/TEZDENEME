// Çevrimdışı kip planı (madde 74, D8b). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// SALT OKUNUR. İki parça: (1) STATİK özellik haritası (aşağıda, kodda belgeli): hangi özellik hiçbir sağlayıcı olmadan çalışır, hangisi sağlayıcı ister;
// (2) CANLI durum: kayıtlı sağlayıcı verisinden "şu an çevrimdışı mı". "Çevrimdışı" burada = hiçbir sağlayıcı kullanılabilir değil (programın kendisi internet kullanmaz).
// Kullanılabilir sağlayıcı = adaptörü var + kullanıcı kapatmamış + sözleşme izin veriyor + 'execute' yeteneği doğrulanmış ya da kısmi.
// Kip: çevrimdışı (kullanılabilir sağlayıcı yok) | kısıtlı (var ama hiçbirinin execute'u doğrulanmış değil) | çevrimiçi.
// Harita DOĞRULANABİLİR kalır: uç yolları src/server/app.ts'deki gerçek uçlarla bir birim testinde karşılaştırılır (sessizce eskimez).
import { isFreeRoute, isUsable, statusOf } from "./snapshot.ts";
import type { ProviderSnapshot } from "./snapshot.ts";

export interface FeatureEntry {
  id: string;
  name: string;
  // true = çalışması için kullanılabilir bir sağlayıcı (model/CLI koşusu) gerekir.
  needsProvider: boolean;
  // Bu özelliğin dayandığı HTTP uçları ("YÖNTEM /yol"; ":" içeren yollar parametreli).
  endpoints: string[];
  why: string;
}

export const FEATURE_MAP: readonly FeatureEntry[] = [
  { id: "policy", name: "Politika ve sözleşme", needsProvider: false, endpoints: ["GET /api/policy", "GET /api/actions/semantics"], why: "Yerel kural motoru ve eylem anlamları; veritabanı ve kod dışında hiçbir şeye bağlı değil." },
  { id: "audit", name: "Denetim kaydı ve zincir doğrulama", needsProvider: false, endpoints: ["GET /api/audit", "GET /api/audit/verify"], why: "Yerel SQLite denetim kaydı ve özet zinciri." },
  { id: "tasks", name: "Görev kaydı, onay ve ret", needsProvider: false, endpoints: ["GET /api/tasks", "POST /api/tasks"], why: "Görev açma, listeleme, onay/ret yalnız kayıt ve politika kararıdır; koşturmak ayrıdır." },
  { id: "monitor", name: "Canlı izleme ve darboğaz", needsProvider: false, endpoints: ["GET /api/monitor"], why: "Yalnız kayıtlı görev/iş akışı verisinden hesaplanır." },
  { id: "memory", name: "Operasyonel hafıza, getirme ve derleme", needsProvider: false, endpoints: ["GET /api/memory/search", "GET /api/memory/context", "GET /api/memory/compile", "POST /api/memory"], why: "Yerel SQLite hafıza deposu; model gerekmez." },
  { id: "reasoning", name: "Karar defteri, varsayım borcu, kalibrasyon, hipotez ve bilgi değeri", needsProvider: false, endpoints: ["GET /api/decisions", "GET /api/assumption-debt", "GET /api/calibration", "POST /api/reasoning/hypotheses", "POST /api/reasoning/voi"], why: "Saf aritmetik ve kayıt; modelsiz." },
  { id: "grants-changes", name: "Geçici izinler ve değişiklik defteri", needsProvider: false, endpoints: ["GET /api/grants", "GET /api/changes"], why: "Yerel kayıt ve politika kontrolü." },
  { id: "automation", name: "Olay tetiklemeli otomasyon kuralları", needsProvider: false, endpoints: ["GET /api/automation"], why: "Yalnız güvenli eylemler (bildirim, görev kaydı); sağlayıcı çağırmaz." },
  { id: "verification-labs", name: "Yerel doğrulama laboratuvarları (api / contracts / state / a11y / design)", needsProvider: false, endpoints: ["POST /api/verification/labs", "GET /api/verification/runs"], why: "Deterministik, modelsiz, yerel koşular." },
  { id: "backup", name: "Denetimli yedek", needsProvider: false, endpoints: ["GET /api/backup/status", "POST /api/backup/run"], why: "Yerel veritabanı kopyası ve doğrulaması." },
  { id: "skills", name: "Beceri yaşam döngüsü kayıtları", needsProvider: false, endpoints: ["GET /api/skills"], why: "Yalnız kayıt ve kapı kayıtları; hiçbir şey kurulmaz ya da çalıştırılmaz." },
  { id: "usage", name: "Kullanım raporu", needsProvider: false, endpoints: ["GET /api/usage", "GET /api/usage/context"], why: "Geçmiş koşu kayıtlarından toplam; yeni model çağrısı yok." },
  { id: "analysis", name: "Sistem analitiği (etki, süreklilik, çıkış planı, aracı, uzmanlık, gölge fiyat, eksiklik)", needsProvider: false, endpoints: ["GET /api/analysis/impact", "GET /api/analysis/graph", "GET /api/analysis/continuity", "GET /api/analysis/exit", "GET /api/analysis/broker", "GET /api/analysis/offline", "GET /api/analysis/expertise", "GET /api/analysis/shadow-price", "GET /api/analysis/absence", "GET /api/analysis/switching"], why: "Deterministik, modelsiz, ağsız; yalnız kod ve kayıtları okur." },
  { id: "providers-registry", name: "Sağlayıcı listesi, detay, açma/kapama", needsProvider: false, endpoints: ["GET /api/providers", "GET /api/providers/:id", "POST /api/providers/:id/disable", "POST /api/providers/:id/enable"], why: "Kayıt defteri ve kullanıcı durumu; sağlayıcıyı çalıştırmaz." },
  { id: "help-docs", name: "Uygulama içi yardım belgeleri ve yetenek listesi", needsProvider: false, endpoints: ["GET /api/capabilities"], why: "Depodaki sabit belgelerin okunması." },
  { id: "provider-test", name: "Sağlayıcı yerel bağlantı testi", needsProvider: true, endpoints: ["POST /api/providers/:id/test"], why: "Sağlayıcının yerel CLI'sini çalıştırır (model çağrısı yok ama sağlayıcı adaptörü gerekir)." },
  { id: "single-run", name: "Tek koşu (görevi bir sağlayıcıda çalıştırma)", needsProvider: true, endpoints: ["POST /api/tasks/:id/run"], why: "Sağlayıcı koşusu gerekir." },
  { id: "workflow", name: "İş akışı (plan, uygula, gözden geçir, doğrula)", needsProvider: true, endpoints: ["POST /api/tasks/:id/workflow"], why: "Plan/uygulama/inceleme adımları sağlayıcı koşusudur." },
  { id: "subsession-create", name: "Alt oturum açma", needsProvider: true, endpoints: ["POST /api/subsessions"], why: "Oluşturma sırasında seçilen sağlayıcının kullanılabilir olması aranır." },
];

export interface OfflineProviderState {
  id: string;
  usable: boolean;
  executeStatus: string | null;
  reasons: string[];
}

export interface OfflineReport {
  mode: "çevrimdışı" | "kısıtlı" | "çevrimiçi";
  offline: boolean;
  usableProviders: number;
  verifiedProviders: number;
  providers: OfflineProviderState[];
  works: FeatureEntry[];
  blockedNow: FeatureEntry[];
  needsProvider: FeatureEntry[];
  summary: string;
  note: string;
}

export function offlineStateOf(providers: ProviderSnapshot[]): { usable: ProviderSnapshot[]; verified: ProviderSnapshot[]; states: OfflineProviderState[] } {
  const states: OfflineProviderState[] = providers.map((p) => {
    const exec = statusOf(p, "execute");
    const reasons: string[] = [];
    if (p.disabled) reasons.push("kullanıcı tarafından devre dışı");
    if (!p.hasAdapter) reasons.push("bu derlemede adaptörü yok");
    if (!p.allowedByPolicy) reasons.push("sözleşmenin izinli sağlayıcılar listesinde değil");
    if (!isFreeRoute(p.routeKind)) reasons.push(p.routeKind === "api_paid" ? "ücretli rota (api_paid) kullanılabilir sayılmaz" : "bilinmeyen rota türü kullanılabilir sayılmaz");
    if (exec !== "verified" && exec !== "partial") reasons.push(exec === null ? "execute yeteneği kayıtlı değil" : `execute durumu '${exec}'`);
    return { id: p.id, usable: isUsable(p) && (exec === "verified" || exec === "partial"), executeStatus: exec, reasons };
  });
  const usableIds = new Set(states.filter((s) => s.usable).map((s) => s.id));
  const usable = providers.filter((p) => usableIds.has(p.id));
  return { usable, verified: usable.filter((p) => statusOf(p, "execute") === "verified"), states };
}

export function buildOfflinePlan(providers: ProviderSnapshot[]): OfflineReport {
  const { usable, verified, states } = offlineStateOf(providers);
  const offline = usable.length === 0;
  const mode: OfflineReport["mode"] = offline ? "çevrimdışı" : verified.length === 0 ? "kısıtlı" : "çevrimiçi";
  const local = FEATURE_MAP.filter((f) => !f.needsProvider);
  const needs = FEATURE_MAP.filter((f) => f.needsProvider);
  const summary = offline
    ? `Şu an çevrimdışı: kullanılabilir sağlayıcı yok. ${local.length} özellik çalışır, ${needs.length} özellik sağlayıcı bekler.`
    : mode === "kısıtlı"
      ? `${usable.length} sağlayıcı kullanılabilir ama hiçbirinin execute yeteneği doğrulanmış değil (kısıtlı kip).`
      : `${verified.length} sağlayıcının execute yeteneği doğrulanmış; sağlayıcı isteyen özellikler kullanılabilir.`;
  return {
    mode,
    offline,
    usableProviders: usable.length,
    verifiedProviders: verified.length,
    providers: states,
    works: local,
    blockedNow: offline ? needs : [],
    needsProvider: needs,
    summary,
    note: "Özellik haritası statik ve kodda belgelidir; durum kayıtlı sağlayıcı verisinden hesaplanır (canlı test yapılmaz). Çevrimdışı = hiçbir sağlayıcı kullanılabilir değil; program kendisi internet kullanmaz.",
  };
}
