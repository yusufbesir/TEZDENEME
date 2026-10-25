// Mantıksal çelişki çözücü (madde 64). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Açık çelişki bayraklarındaki kayıt çiftleri için KURAL TABANLI çözüm ÖNERİSİ üretir. SALT OKUNUR: hiçbir kaydı emekli etmez, hiçbir bayrağı çözmez,
// hiçbir şey yazmaz; model/ağ/dosya yok. Uygulamak (kaydı emekli etmek, bayrağı çözmek) yalnız kullanıcının işidir.
// Kurallar SIRAYLA denenir; ilk KESİN sonuç veren seçilir, sonraki kurallar yalnız karşı oy (dissent) olarak sayılır:
//   1 yenilik   : gözlem tarihleri ≥ 7 gün farklıysa yeni kazanır (yeni olan bayat/süresi dolmuşsa ve eskisi değilse bu kural işlemez)
//   2 güven     : güven farkı ≥ 0,2 ise yüksek güven kazanır
//   3 tür       : decision > fact > note (yalnız ikisi de bu üç türdense ve türleri farklıysa)
//   4 kaynak    : kullanıcı kaynağı > ajan kaynağı (kaynak sınıfı bilinmiyorsa işlemez)
//   5 bayatlık  : biri bayat/süresi dolmuş, diğeri değilse tazesi kazanır
// Güven (0..1) = kuralın taban değeri − 0,15 × karşı oy sayısı (en az 0,2). Hiçbir kural kesin değilse: "çözülemez: kullanıcı karar versin".
import { redactString } from "../core/audit/redact.ts";
import type { MemoryRecord, MemoryStore } from "./store.ts";

export const MAX_RESOLUTIONS = 50;
export const NEWER_MIN_DAYS = 7;
export const CONFIDENCE_MIN_GAP = 0.2;
export const DISSENT_PENALTY = 0.15;
const DAY = 86_400_000;
const KIND_RANK: Record<string, number> = { decision: 3, fact: 2, note: 1 };

export type ResolverRule = "yenilik" | "guven" | "tur" | "kaynak" | "bayatlik";

export interface RecordBrief {
  id: string;
  kind: string;
  title: string;
  scope: string;
  confidence: number;
  observedAt: string;
  status: string;
  source: string;
  flags: string[];
}

export interface Resolution {
  flagId: string;
  detail: string;
  a: RecordBrief | null;
  b: RecordBrief | null;
  outcome: "önerildi" | "çözülemez";
  keep: string | null;
  retire: string | null;
  // Emekli edilmesi önerilen kayıt zaten etkin değilse (yerine geçilmiş/emekli) yalnız bayrağı çözmek yeter.
  retireAlreadyInactive: boolean;
  rule: ResolverRule | "none";
  rationale: string;
  confidence: number;
  dissentingRules: ResolverRule[];
}

export interface ResolutionReport {
  generatedAt: string;
  totalOpen: number;
  considered: number;
  truncated: boolean;
  suggested: number;
  unresolvable: number;
  resolutions: Resolution[];
  note: string;
}

export const USER_RETIRE_MAX_CONFIDENCE = 0.5;

export interface ResolverSource {
  store: MemoryStore;
  // "decision:<id>" kaynağının gerçek bir karar kaydına işaret edip etmediği (karar defteri). Verilmezse hiçbir "decision:" kaynağı kullanıcı sayılmaz.
  decisionExists?: (id: string) => boolean;
  now?: () => Date;
}

function clean(s: string, max: number): string {
  const t = redactString(s).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function round(x: number): number {
  return Math.round(x * 1000) / 1000;
}

type Authority = "user" | "agent" | "unknown";
// Kaynak sınıfı: karar defteri kayıtları ("decision:<id>") yalnız kullanıcıdan gelir; "user/kullanıcı/yusuf" önekleri kullanıcı; ajan adları ajan.
// Serbest metin kaynağa GÜVENİLMEZ: "decision:<id>" yalnız o kimlik karar defterinde gerçekten varsa "karar kaynaklı" (kullanıcı) sayılır;
// kullanıcı sınıfı için kaynak TAM "user/kullanıcı/yusuf" ya da "user:/kullanıcı:/yusuf:" öneki olmalı ve içinde ajan adı geçmemelidir
// ("user-claude" kullanıcı DEĞİL, ajandır). Ajan adı geçen her kaynak ajan sayılır; gerisi bilinmiyor.
const AGENT_NAME = /(agent|ajan|claude|codex|gemini|llm|gpt|subsession|provider|model|bot)/;
function authorityOf(source: string, decisionExists: (id: string) => boolean): Authority {
  const s = source.trim().toLowerCase();
  const dm = /^decision:([0-9a-f-]{36})$/.exec(s);
  if (dm) return decisionExists(dm[1] as string) ? "user" : "unknown";
  if (AGENT_NAME.test(s)) return "agent";
  if (/^(user|kullan[ıi]c[ıi]|yusuf)(:.{0,60})?$/.test(s)) return "user";
  return "unknown";
}

interface Vote {
  rule: ResolverRule;
  winner: "a" | "b";
  base: number;
  why: string;
}

function votesFor(a: MemoryRecord, b: MemoryRecord, fa: string[], fb: string[], aa: Authority, ab: Authority): Vote[] {
  const votes: Vote[] = [];
  const staleA = fa.includes("stale") || fa.includes("expired");
  const staleB = fb.includes("stale") || fb.includes("expired");
  // 1 yenilik
  const days = (Date.parse(a.observedAt) - Date.parse(b.observedAt)) / DAY;
  if (Math.abs(days) >= NEWER_MIN_DAYS) {
    const w: "a" | "b" = days > 0 ? "a" : "b";
    const winnerStale = w === "a" ? staleA : staleB;
    const loserStale = w === "a" ? staleB : staleA;
    if (!(winnerStale && !loserStale)) votes.push({ rule: "yenilik", winner: w, base: 0.55 + 0.3 * Math.min(1, Math.abs(days) / 90), why: `daha yeni gözlem (${Math.round(Math.abs(days))} gün fark)` });
  }
  // 2 güven
  const gap = a.confidence - b.confidence;
  if (Math.abs(gap) >= CONFIDENCE_MIN_GAP - 1e-12) votes.push({ rule: "guven", winner: gap > 0 ? "a" : "b", base: 0.55 + 0.3 * Math.min(1, Math.abs(gap)), why: `daha yüksek güven (${round(Math.max(a.confidence, b.confidence))} / ${round(Math.min(a.confidence, b.confidence))})` });
  // 3 tür
  const ra = KIND_RANK[a.kind];
  const rb = KIND_RANK[b.kind];
  if (ra !== undefined && rb !== undefined && ra !== rb) votes.push({ rule: "tur", winner: ra > rb ? "a" : "b", base: 0.6, why: `tür önceliği (decision > fact > note): ${ra > rb ? a.kind : b.kind} > ${ra > rb ? b.kind : a.kind}` });
  // 4 kaynak
  if (aa !== "unknown" && ab !== "unknown" && aa !== ab) votes.push({ rule: "kaynak", winner: aa === "user" ? "a" : "b", base: 0.65, why: "kullanıcı kaynağı ajan kaynağından önceliklidir" });
  // 5 bayatlık
  if (staleA !== staleB) votes.push({ rule: "bayatlik", winner: staleA ? "b" : "a", base: 0.7, why: "diğer kayıt bayat ya da süresi dolmuş" });
  return votes;
}

function brief(r: MemoryRecord, flags: string[]): RecordBrief {
  return { id: r.id, kind: r.kind, title: clean(r.title, 120), scope: r.scope, confidence: r.confidence, observedAt: r.observedAt, status: r.status, source: clean(r.source, 80), flags };
}

export function suggestResolutions(src: ResolverSource): ResolutionReport {
  const at = (src.now ?? (() => new Date()))();
  const exists = src.decisionExists ?? (() => false);
  const open = src.store.openContradictions();
  const chosen = open.slice(0, MAX_RESOLUTIONS);
  const load = (id: string | null): MemoryRecord | null => {
    if (id === null) return null;
    try {
      return src.store.get(id);
    } catch {
      return null;
    }
  };
  const resolutions: Resolution[] = chosen.map((c) => {
    const a = load(c.recordId);
    const b = load(c.otherId);
    const fa = a ? src.store.flagsFor(a, at).filter((f) => f !== "contradiction") : [];
    const fb = b ? src.store.flagsFor(b, at).filter((f) => f !== "contradiction") : [];
    const base = { flagId: c.id, detail: clean(c.detail, 300), a: a ? brief(a, fa) : null, b: b ? brief(b, fb) : null };
    const none = (why: string): Resolution => ({ ...base, outcome: "çözülemez", keep: null, retire: null, retireAlreadyInactive: false, rule: "none", rationale: `Çözülemez: kullanıcı karar versin. ${why}`, confidence: 0, dissentingRules: [] });
    if (!a || !b) return none("Çelişkinin bir tarafı bulunamadı ya da yalnız tek kayıt var.");
    const aa = authorityOf(a.source, exists);
    const ab = authorityOf(b.source, exists);
    const raw = votesFor(a, b, fa, fb, aa, ab);
    // Ajan kaynaklı kayıt kullanıcı/karar kaynaklıya karşı yenilik, güven vb. ile KAZANAMAZ: kaynak kuralı öne alınır.
    const votes = [...raw.filter((v) => v.rule === "kaynak"), ...raw.filter((v) => v.rule !== "kaynak")];
    const first = votes[0];
    if (!first) return none("Yenilik, güven, tür, kaynak ve bayatlık kuralları belirleyici bir fark bulamadı (eşitlik ya da belirsizlik).");
    const keepRec = first.winner === "a" ? a : b;
    const retireRec = first.winner === "a" ? b : a;
    const dissent = votes.slice(1).filter((v) => v.winner !== first.winner).map((v) => v.rule);
    const retireIsUser = (first.winner === "a" ? ab : aa) === "user";
    let confidence = round(Math.max(0.2, Math.min(1, first.base - DISSENT_PENALTY * dissent.length)));
    if (retireIsUser) confidence = Math.min(confidence, USER_RETIRE_MAX_CONFIDENCE);
    const inactive = retireRec.status !== "active";
    const rationale = `'${clean(keepRec.title, 80)}' korunmalı, '${clean(retireRec.title, 80)}' emekli edilmeli: ${first.why}.${dissent.length > 0 ? ` Dikkat: ${dissent.join(", ")} kural(lar)ı tersini söylüyor; güven düşürüldü.` : ""}${retireIsUser ? " Kullanıcı kaynaklı kaydı yalnız siz emekli edebilirsiniz; bu yalnız bir öneridir (güven en çok 0,5)." : ""}${inactive ? " Emekli edilecek kayıt zaten etkin değil: yalnız çelişki bayrağını çözmek yeter." : ""}`;
    return { ...base, outcome: "önerildi", keep: keepRec.id, retire: retireRec.id, retireAlreadyInactive: inactive, rule: first.rule, rationale, confidence, dissentingRules: dissent };
  });
  const suggested = resolutions.filter((r) => r.outcome === "önerildi").length;
  return {
    generatedAt: at.toISOString(),
    totalOpen: open.length,
    considered: resolutions.length,
    truncated: open.length > resolutions.length,
    suggested,
    unresolvable: resolutions.length - suggested,
    resolutions,
    note: `Yalnız ÖNERİDİR: hiçbir kayıt emekli edilmedi, hiçbir çelişki bayrağı çözülmedi. Uygulama kararı ve işlemi kullanıcıya aittir. En çok ${MAX_RESOLUTIONS} açık çelişki değerlendirilir.`,
  };
}
