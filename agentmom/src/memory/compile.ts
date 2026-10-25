// Proje hafızası derleyicisi (madde 90). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Etkin bellek kayıtlarından ve karar defterinden TEK bir Markdown özeti derler ve DÖNDÜRÜR; dosyaya YAZMAZ, hafızaya yazmaz
// (kaydetmek isteyen mevcut `POST /api/memory/export` yolunu kullanır). Model/ağ yok. Aynı veri ve aynı saat => bayt bayt aynı çıktı.
// Sınır: en yeni 500 etkin kayıt okunur (MemoryStore.list sınırı); başlıkta not düşülür.
// Sır taraması: çıktı redactString'den geçer. Bütçe (maxChars) aşılırsa metin SONDAN kesilir ve "KESİLDİ" notu düşülür.
import { redactString } from "../core/audit/redact.ts";
import type { DecisionLedger } from "../reasoning/reasoning.ts";
import { MEMORY_KINDS, MemoryError } from "./store.ts";
import type { MemoryRecord, MemoryStore } from "./store.ts";

export const MIN_COMPILE_CHARS = 2000;
export const MAX_COMPILE_CHARS = 60_000;
export const DEFAULT_COMPILE_CHARS = 20_000;
const DAY = 86_400_000;
const SOON_DAYS = 30;
const LINE_CHARS = 300;

export interface CompileSource {
  store: MemoryStore;
  ledger: DecisionLedger;
  now?: () => Date;
}

export interface CompiledSection {
  key: "kayitlar" | "kararlar" | "sure" | "celiskiler" | "varsayim" | "bayat";
  title: string;
  items: number;
  // Bu bölümün metni bütçe yüzünden tamamen ya da kısmen çıktıda yok.
  truncated: boolean;
}

export interface CompiledMemory {
  markdown: string;
  sections: CompiledSection[];
  counts: { records: number; decisions: number; expiring: number; expired: number; contradictions: number; assumptionDebt: number; stale: number };
  generatedAt: string;
  truncated: boolean;
  // Çıktıda sır maskelendi mi (kaynak kayıtlar zaten maskeli yazılır; bu ikinci bir güvenlik ağıdır).
  maskedSecrets: boolean;
}

// Tek satır, kısa, Markdown'ı bozmayan metin: satır sonları ve baştaki başlık/liste imleri etkisizleştirilir, şablon etiketleri kırılır.
// Sıra: önce sır maskelenir, sonra kısaltılır (kesik sır parçası kalmaz), en son Markdown/şablon karakterleri HTML varlıklarına çevrilir
// (< > ! [ ] { } $ | ` &): ham etiket, görsel/izleme pikseli, [[bağ]], {{şablon}}, DataviewJS ($=) canlı kalmaz; kaçışlı hâl okunabilir.
const ENTITY: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", "!": "&#33;", "[": "&#91;", "]": "&#93;", "{": "&#123;", "}": "&#125;", $: "&#36;", "|": "&#124;", "`": "&#96;" };
export function line(s: string, max = LINE_CHARS): string {
  const t = redactString(s).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().replace(/^([#*+-]|\d+\.)\s*/, "$1 ");
  const cut = t.length > max ? `${t.slice(0, max - 1)}…` : t;
  return cut.replace(/[&<>![\]{}$|`]/g, (c) => ENTITY[c] as string);
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function compileProjectMemory(src: CompileSource, opts: { scope?: string; maxChars?: number } = {}): CompiledMemory {
  const maxChars = opts.maxChars ?? DEFAULT_COMPILE_CHARS;
  if (!Number.isInteger(maxChars) || maxChars < MIN_COMPILE_CHARS || maxChars > MAX_COMPILE_CHARS) throw new MemoryError("invalid_field", `maxChars ${MIN_COMPILE_CHARS}..${MAX_COMPILE_CHARS} arasında bir tam sayı olmalı`);
  const at = (src.now ?? (() => new Date()))();
  const nowMs = at.getTime();

  const records = src.store
    .list({ ...(opts.scope !== undefined ? { scope: opts.scope } : {}), limit: 500 })
    .filter((r) => r.status === "active")
    .sort((a, b) => cmp(a.scope, b.scope) || MEMORY_KINDS.indexOf(a.kind) - MEMORY_KINDS.indexOf(b.kind) || cmp(b.observedAt, a.observedAt) || cmp(a.title, b.title) || cmp(a.id, b.id));
  const flagged = new Map<string, string[]>(records.map((r) => [r.id, src.store.flagsFor(r, at)]));
  const decisions = src.ledger
    .list({ onlyActive: true })
    .filter((d) => opts.scope === undefined || d.scope === opts.scope)
    .sort((a, b) => cmp(a.expiresAt, b.expiresAt) || cmp(a.id, b.id));
  const valid = decisions.filter((d) => Date.parse(d.expiresAt) >= nowMs);
  const expired = decisions.filter((d) => Date.parse(d.expiresAt) < nowMs);
  const soon = valid.filter((d) => Date.parse(d.expiresAt) - nowMs <= SOON_DAYS * DAY);
  const recordIds = new Set(records.map((r) => r.id));
  const contradictions = src.store.openContradictions().filter((c) => recordIds.has(c.recordId) || (c.otherId !== null && recordIds.has(c.otherId)));
  const debtAll = src.ledger.debt();
  const decisionIds = new Set(decisions.map((d) => d.id));
  const debt = debtAll.filter((d) => decisionIds.has(d.decisionId));
  const stale = records.filter((r) => (flagged.get(r.id) ?? []).some((f) => f === "stale" || f === "expired"));

  const bullet = (r: MemoryRecord): string => {
    const f = flagged.get(r.id) ?? [];
    return `- ${line(r.title, 120)}${f.length ? ` [${f.join(", ")}]` : ""} (güven ${r.confidence}; gözlem ${r.observedAt.slice(0, 10)}; id ${r.id.slice(0, 8)}): ${line(r.body, 220)}`;
  };

  const parts: Array<{ section: CompiledSection; text: string }> = [];
  const add = (key: CompiledSection["key"], title: string, items: number, body: string[]): void => {
    parts.push({ section: { key, title, items, truncated: false }, text: `## ${title}\n\n${body.length ? body.join("\n") : "- (yok)"}\n` });
  };

  // 1. Etkin kayıtlar: kapsam, sonra tür.
  const recLines: string[] = [];
  let lastScope = "";
  let lastKind = "";
  for (const r of records) {
    if (r.scope !== lastScope) {
      recLines.push(`${recLines.length ? "\n" : ""}### Kapsam: ${line(r.scope, 80)}`);
      lastScope = r.scope;
      lastKind = "";
    }
    if (r.kind !== lastKind) {
      recLines.push(`**${r.kind}**`);
      lastKind = r.kind;
    }
    recLines.push(bullet(r));
  }
  add("kayitlar", "Etkin kayıtlar (kapsam ve türe göre)", records.length, recLines);
  add("kararlar", "Geçerli kararlar", valid.length, valid.map((d) => `- ${line(d.title, 120)} (kapsam ${line(d.scope, 80)}; süre sonu ${d.expiresAt.slice(0, 10)}; inceleme ${d.reviewState}; id ${d.id.slice(0, 8)}): ${line(d.rationale, 220)}`));
  add("sure", `Süresi yaklaşan (${SOON_DAYS} gün içinde) veya dolan kararlar`, soon.length + expired.length, [
    ...soon.map((d) => `- YAKLAŞIYOR ${d.expiresAt.slice(0, 10)}: ${line(d.title, 120)} (id ${d.id.slice(0, 8)})`),
    ...expired.map((d) => `- DOLDU ${d.expiresAt.slice(0, 10)}: ${line(d.title, 120)} (id ${d.id.slice(0, 8)}) — yenilenmedi, gözden geçirin`),
  ]);
  add("celiskiler", "Açık çelişkiler", contradictions.length, contradictions.map((c) => `- ${c.recordId.slice(0, 8)} ↔ ${(c.otherId ?? "-").slice(0, 8)}: ${line(c.detail, 220)}`));
  const byKind = { broken: 0, overdue: 0, pending: 0 };
  for (const d of debt) byKind[d.kind]++;
  add("varsayim", "Varsayım borcu", debt.length, debt.length ? [`Özet: ${byKind.broken} bozuk, ${byKind.overdue} gecikmiş, ${byKind.pending} bekleyen.`, ...debt.slice(0, 20).map((d) => `- ${d.kind}${d.overdueDays ? ` (${d.overdueDays} gün)` : ""}: ${line(d.text, 160)} — karar: ${line(d.decisionTitle, 100)}`), ...(debt.length > 20 ? [`- … ve ${debt.length - 20} varsayım daha`] : [])] : []);
  add("bayat", "Bayat veya süresi dolmuş kayıtlar", stale.length, stale.map((r) => `- ${line(r.title, 120)} [${(flagged.get(r.id) ?? []).join(", ")}] (${r.kind}; kapsam ${line(r.scope, 80)}; gözlem ${r.observedAt.slice(0, 10)}; id ${r.id.slice(0, 8)})`));

  const generatedAt = at.toISOString();
  const header = [
    "---",
    "description: " + JSON.stringify("ÜRETİLMİŞ DOSYA: veri kaynağı AgentMom bellek kayıtları ve karar defteri (compileProjectMemory). Elle değiştirmeyin; her derlemede yeniden üretilir. Sahip: Claude [İP:AgentMom Faz 11]. Silme yalnız Yusuf kararıyla ve Geri Dönüşüm Kutusuna taşıyarak."),
    "---",
    "# Proje hafızası (derlenmiş)",
    "",
    `> ÜRETİLMİŞ DOSYA: veri kaynağı bellek / karar defteri. Üretim zamanı: ${generatedAt}.${opts.scope !== undefined ? ` Kapsam süzgeci: ${line(opts.scope, 80)}.` : ""}`,
    `> Bayat, süresi dolmuş ve çelişkili kayıtlar bayraklarıyla birlikte gösterilir; hiçbiri otomatik çözülmez.${records.length >= 500 ? " Not: en yeni 500 kayıt okundu." : ""}`,
    "",
  ].join("\n");

  // Bütçe: üstbilgi + bölümler sırayla; sığmayan kısım SONDAN kesilir (satır sınırında) ve not eklenir.
  const note = (n: number): string => `\n> KESİLDİ: çıktı ${n} karakterlik sınırı (maxChars) aştığı için sonraki satırlar/bölümler dahil edilmedi.\n`;
  const full = redactString(header + parts.map((p) => p.text).join("\n"));
  const masked = full !== header + parts.map((p) => p.text).join("\n");
  let markdown = full;
  let truncated = false;
  if (full.length > maxChars) {
    truncated = true;
    const room = maxChars - note(maxChars).length;
    let cut = full.slice(0, Math.max(0, room));
    const nl = cut.lastIndexOf("\n");
    if (nl > 0) cut = cut.slice(0, nl);
    markdown = cut.replace(/\s+$/, "") + note(maxChars);
    // Hangi bölümlerin metni (tamamen ya da kısmen) çıktıda yok?
    let offset = header.length;
    for (const p of parts) {
      if (offset + p.text.length > cut.length) p.section.truncated = true;
      offset += p.text.length + 1;
    }
  }
  return {
    markdown,
    sections: parts.map((p) => p.section),
    counts: { records: records.length, decisions: valid.length, expiring: soon.length, expired: expired.length, contradictions: contradictions.length, assumptionDebt: debt.length, stale: stale.length },
    generatedAt,
    truncated,
    maskedSecrets: masked,
  };
}
