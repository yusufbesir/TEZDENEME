// Aşamalı bellek getirme (madde 44). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Saf okuma: model yok, ağ yok, dosya yok, hiçbir şeyi kaydetmez. Aynı arama üç ayrıntı aşamasında döner:
//   1 = ÖZET (kimlik, tür, kapsam, ilk ~160 karakter, bayraklar, skor)  2 = BÖLÜM (kayıt gövdesi, kayıt başına en çok 1200 karakter)
//   3 = KAYNAK (kaynak, dışa aktarım yolu, ilişkili çelişkiler, yerine-geçen / yerine-geçilen bağlantıları)
// Sınır: arama en çok 50 isabet ve aşama 3 bağlantıları için kapsam başına en yeni 500 kayıt okunur (MemoryStore.list sınırı).
// Bütçe (karakter) ASLA aşılmaz: kullanılan karakter = döndürülen `items` dizisinin JSON uzunluğu. Bayraklı (bayat / süresi dolmuş / çelişkili /
// düşük güvenli) kayıtlar sessizce elenmez, bayraklarıyla döner; pasif (yerine geçilmiş / emekli) kayıtlar hiç dahil edilmez.
import { redactString } from "../core/audit/redact.ts";
import { MemoryError } from "./store.ts";
import type { MemoryFlagName, MemoryKind, MemoryStore, SearchHit } from "./store.ts";

export const SUMMARY_CHARS = 160;
export const SECTION_CHARS = 1200;
export const MIN_BUDGET = 200;
export const MAX_BUDGET = 20_000;
export const DEFAULT_BUDGET = 3000;
export const MAX_QUERY_CHARS = 200;

export type RetrievalStage = 1 | 2 | 3;

export interface RetrievalOptions {
  scope?: string;
  kinds?: MemoryKind[];
  budgetChars?: number;
  stage?: RetrievalStage;
  limit?: number;
}

export interface RetrievalItem {
  id: string;
  kind: MemoryKind;
  scope: string;
  title: string;
  flags: MemoryFlagName[];
  score: number;
  // Aşama 1: ilk ~160 karakter.
  summary?: string;
  // Aşama 2: gövde (en çok 1200 karakter). bodyClipped: gövde kısaltıldı (sınır ya da bütçe).
  body?: string;
  bodyClipped?: boolean;
  // Aşama 3: kaynak ve bağlantılar.
  source?: string;
  sourceRef?: string | null;
  exportedPath?: string | null;
  observedAt?: string;
  validUntil?: string | null;
  contradictions?: Array<{ flagId: string; otherId: string | null; detail: string }>;
  links?: { replaces: string | null; replacedBy: string | null };
}

export interface RetrievalResult {
  stage: RetrievalStage;
  query: string;
  items: RetrievalItem[];
  usedChars: number;
  budgetChars: number;
  truncated: boolean;
  nextStage: RetrievalStage | null;
}

function oneLine(s: string): string {
  return redactString(s).replace(/\s+/g, " ").trim();
}

// Skor 0..1: en iyi (bm25 en küçük / en olumsuz) sonuç 1, diğerleri ona oranlanır. Eşit ya da pozitif sıralamada hepsi 1.
function scores(hits: SearchHit[]): number[] {
  const best = Math.min(0, ...hits.map((h) => h.rank));
  return hits.map((h) => (best === 0 ? 1 : Math.max(0, Math.min(1, Number((h.rank / best).toFixed(4))))));
}

// Metin alanını (alan adı `field`) öğe JSON'u `room` karakteri aşmayacak biçimde kısaltır; sığmıyorsa null.
function fitText(item: RetrievalItem, field: "summary" | "body", text: string, room: number): { text: string; clipped: boolean } | null {
  const make = (t: string): number => JSON.stringify({ ...item, [field]: t }).length;
  if (make(text) <= room) return { text, clipped: false };
  let cut = Math.min(text.length, Math.max(0, room - make("")));
  while (cut >= 0) {
    const t = text.slice(0, cut);
    if (make(t) <= room) return { text: t, clipped: true };
    cut -= Math.max(1, make(t) - room);
  }
  return null;
}

export function progressiveRetrieve(store: MemoryStore, query: string, opts: RetrievalOptions = {}): RetrievalResult {
  if (typeof query !== "string") throw new MemoryError("invalid_field", "sorgu bir metin olmalı");
  if (query.length > MAX_QUERY_CHARS) throw new MemoryError("invalid_field", `sorgu en çok ${MAX_QUERY_CHARS} karakter olabilir`);
  const stage = opts.stage ?? 1;
  if (stage !== 1 && stage !== 2 && stage !== 3) throw new MemoryError("invalid_field", "aşama 1, 2 ya da 3 olmalı");
  const budget = opts.budgetChars ?? DEFAULT_BUDGET;
  if (!Number.isInteger(budget) || budget < MIN_BUDGET || budget > MAX_BUDGET) throw new MemoryError("invalid_field", `bütçe ${MIN_BUDGET}..${MAX_BUDGET} arasında bir tam sayı olmalı`);
  const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 10), 1), 50);

  // search() pasif kayıtları zaten dışarıda bırakır (includeInactive verilmez); yine de burada da süzülür.
  const hits = store
    .search(query, { ...(opts.scope !== undefined ? { scope: opts.scope } : {}), ...(opts.kinds ? { kinds: opts.kinds } : {}), limit })
    .filter((h) => h.status === "active");
  const sc = scores(hits);

  // Aşama 3 için ilişkiler: açık çelişkiler ve aynı kapsamdaki yerine-geçme bağlantıları (yalnız gereken kapsamlar okunur).
  const ids = new Set(hits.map((h) => h.id));
  const flagsBy = new Map<string, Array<{ flagId: string; otherId: string | null; detail: string }>>();
  const successor = new Map<string, string>();
  if (stage === 3) {
    for (const c of store.openContradictions()) {
      for (const [mine, other] of [[c.recordId, c.otherId], [c.otherId, c.recordId]] as const) {
        if (mine !== null && ids.has(mine)) flagsBy.set(mine, [...(flagsBy.get(mine) ?? []), { flagId: c.id, otherId: other, detail: c.detail }]);
      }
    }
    for (const scope of new Set(hits.map((h) => h.scope))) for (const r of store.list({ scope, limit: 500 })) if (r.supersedesId !== null) successor.set(r.supersedesId, r.id);
  }

  const items: RetrievalItem[] = [];
  let size = 2; // "[" ve "]"
  let truncated = false;
  for (let i = 0; i < hits.length; i++) {
    const h = hits[i] as SearchHit;
    const base: RetrievalItem = { id: h.id, kind: h.kind, scope: h.scope, title: oneLine(h.title).slice(0, 200), flags: h.flags, score: sc[i] as number };
    const room = budget - size - (items.length > 0 ? 1 : 0);
    let item: RetrievalItem | null = null;
    if (stage === 1) {
      const text = oneLine(h.body);
      const fit = fitText(base, "summary", text.slice(0, SUMMARY_CHARS), room);
      if (fit) item = { ...base, summary: fit.text };
      if (fit?.clipped) truncated = true;
    } else if (stage === 2) {
      const safe = redactString(h.body); // önce maskele, sonra kes
      const text = safe.length > SECTION_CHARS ? safe.slice(0, SECTION_CHARS) : safe;
      const fit = fitText({ ...base, bodyClipped: false }, "body", text, room);
      if (fit) {
        item = { ...base, body: fit.text, bodyClipped: fit.clipped || h.body.length > SECTION_CHARS };
        if (fit.clipped) truncated = true;
      }
    } else {
      const full: RetrievalItem = {
        ...base,
        source: h.source,
        sourceRef: h.sourceRef,
        exportedPath: h.exportedPath,
        observedAt: h.observedAt,
        validUntil: h.validUntil,
        contradictions: flagsBy.get(h.id) ?? [],
        links: { replaces: h.supersedesId, replacedBy: successor.get(h.id) ?? null },
      };
      if (JSON.stringify(full).length <= room) item = full;
    }
    if (!item) {
      truncated = true;
      break;
    }
    items.push(item);
    size += JSON.stringify(item).length + (items.length > 1 ? 1 : 0);
  }
  return { stage, query, items, usedChars: JSON.stringify(items).length, budgetChars: budget, truncated, nextStage: stage < 3 ? ((stage + 1) as RetrievalStage) : null };
}
