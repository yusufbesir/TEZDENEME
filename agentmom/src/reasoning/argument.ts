// Akıl yürütme derleyicisi (madde 61). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Bir kararı (başlık, gerekçe, kapsam, süre, soy ağacı zinciri, varsayımlar ve durumları, bağlı bellek kayıtları) YAPILANDIRILMIŞ bir argüman belgesine döker.
// SALT OKUNUR: hiçbir şey yazmaz; model/ağ/dosya yok. Aynı veri ve aynı saat => aynı çıktı. Hüküm bir ÖNERİDİR; karar kullanıcıdadır.
// Hüküm kuralı (sırayla):
//   zayıf         : en az bir varsayım KIRIK ya da karar artık geçerli değil (yerine geçilmiş / emekli)
//   gözden geçir  : doğrulanmamış varsayım var, ya da kararın süresi doldu / 30 gün içinde doluyor
//   güvenilir     : yukarıdakilerin hiçbiri
// Markdown çıktısı compile.ts'teki line() kalıbıyla etkisizleştirilir (ham etiket/bağ/şablon canlı kalmaz) ve en sonda ikinci kez sır taramasından geçer.
import { redactString } from "../core/audit/redact.ts";
import { line } from "../memory/compile.ts";
import type { MemoryRecord, MemoryStore } from "../memory/store.ts";
import { genealogyOf } from "./genealogy.ts";
import type { Db } from "../core/db/db.ts";
import type { Decision, DecisionLedger } from "./reasoning.ts";

export const EXPIRY_SOON_DAYS = 30;
const DAY = 86_400_000;

export type Verdict = "güvenilir" | "gözden geçir" | "zayıf";

export interface ArgumentSource {
  db: Db;
  ledger: DecisionLedger;
  store: MemoryStore;
  now?: () => Date;
}

export interface ArgumentRisk {
  kind: "kırık varsayım" | "doğrulanmamış varsayım" | "gecikmiş doğrulama" | "süresi doldu" | "süresi yaklaşıyor" | "geçersiz karar" | "çelişki" | "bayat bellek" | "varsayım yok";
  severity: "high" | "medium" | "low";
  text: string;
}

export interface ArgumentDocument {
  decisionId: string;
  claim: string;
  scope: string;
  status: Decision["status"];
  decidedAt: string;
  expiresAt: string;
  grounds: string[];
  assumptions: Array<{ text: string; status: string; checkBy: string }>;
  risks: ArgumentRisk[];
  counterpoints: Array<{ decisionId: string; title: string; decidedAt: string; rationale: string; brokenAssumptions: string[] }>;
  linkedMemory: Array<{ id: string; title: string; kind: string; confidence: number; flags: string[] }>;
  verdict: Verdict;
  verdictReasons: string[];
  markdown: string;
  maskedSecrets: boolean;
  generatedAt: string;
}

// JSON alanları için: sır maskelenir, denetim karakterleri temizlenir, kısaltılır (Markdown kaçışı yalnız markdown'da yapılır).
// maskedCount: plain() içinde maskelenen sırların sayısı (maskedSecrets bunu da kapsar).
let maskedCount = 0;
function plain(s: string, max: number): string {
  const red = redactString(s);
  if (red !== s) maskedCount++;
  const t = red.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

const day = (iso: string): string => iso.slice(0, 10);

export function compileArgument(src: ArgumentSource, decisionId: string): ArgumentDocument {
  maskedCount = 0;
  const at = (src.now ?? (() => new Date()))();
  const nowMs = at.getTime();
  const d = src.ledger.get(decisionId);
  const chain = genealogyOf({ db: src.db, ledger: src.ledger, now: () => at }, decisionId);
  const idx = chain.chain.indexOf(decisionId);
  const earlier = chain.chain.slice(0, Math.max(0, idx)).map((id) => src.ledger.get(id));
  const counterDecisions = earlier.filter((e) => e.scope === d.scope);

  const memIds = [d.memoryRecordId, ...earlier.map((e) => e.memoryRecordId)].filter((x): x is string => x !== null);
  const linked: Array<{ rec: MemoryRecord; flags: string[] }> = [];
  for (const id of memIds) {
    try {
      const rec = src.store.get(id);
      linked.push({ rec, flags: src.store.flagsFor(rec, at) });
    } catch {
      // Bağlı kayıt bulunamadıysa atlanır (uydurulmaz).
    }
  }

  const assumptions = d.assumptions.map((a) => ({ text: plain(a.text, 500), status: a.status, checkBy: a.checkBy }));
  const holds = d.assumptions.filter((a) => a.status === "holds");
  const broken = d.assumptions.filter((a) => a.status === "broken");
  const unvalidated = d.assumptions.filter((a) => a.status === "unvalidated");
  const expiresMs = Date.parse(d.expiresAt);
  const expired = expiresMs < nowMs;
  const expiringSoon = !expired && expiresMs - nowMs <= EXPIRY_SOON_DAYS * DAY;

  const grounds: string[] = [`Gerekçe: ${plain(d.rationale, 600)}`, `Kapsam ${plain(d.scope, 80)}; karar tarihi ${day(d.decidedAt)}; geçerlilik sonu ${day(d.expiresAt)}.`];
  for (const a of holds) grounds.push(`Doğrulanmış varsayım: ${plain(a.text, 300)}${a.evidence ? ` (kanıt: ${plain(a.evidence, 300)})` : ""}`);
  for (const l of linked.slice(0, 5)) grounds.push(`Bağlı bellek kaydı: ${plain(l.rec.title, 120)} (${l.rec.kind}; güven ${l.rec.confidence}${l.flags.length ? `; bayrak ${l.flags.join(", ")}` : ""})`);

  const risks: ArgumentRisk[] = [];
  if (d.status !== "active") risks.push({ kind: "geçersiz karar", severity: "high", text: d.status === "superseded" ? "Bu karar artık geçerli değil: yerine yenisi geçti." : "Bu karar kullanıcı tarafından emekli edildi." });
  for (const a of broken) risks.push({ kind: "kırık varsayım", severity: "high", text: `${plain(a.text, 300)}${a.evidence ? ` (kanıt: ${plain(a.evidence, 200)})` : ""}` });
  for (const a of unvalidated) {
    const late = Date.parse(a.checkBy) < nowMs;
    risks.push(late ? { kind: "gecikmiş doğrulama", severity: "medium", text: `${plain(a.text, 300)} (son doğrulama tarihi ${day(a.checkBy)} geçti)` } : { kind: "doğrulanmamış varsayım", severity: "medium", text: `${plain(a.text, 300)} (doğrulama tarihi ${day(a.checkBy)})` });
  }
  if (expired) risks.push({ kind: "süresi doldu", severity: "high", text: `Kararın geçerlilik süresi ${day(d.expiresAt)} tarihinde doldu.` });
  else if (expiringSoon) risks.push({ kind: "süresi yaklaşıyor", severity: "medium", text: `Kararın geçerlilik süresi ${day(d.expiresAt)} tarihinde, ${Math.ceil((expiresMs - nowMs) / DAY)} gün içinde doluyor.` });
  for (const l of linked) {
    if (l.flags.includes("contradiction")) risks.push({ kind: "çelişki", severity: "medium", text: `Bağlı bellek kaydı açık bir çelişki bayrağı taşıyor: ${plain(l.rec.title, 120)}` });
    if (l.flags.includes("stale") || l.flags.includes("expired")) risks.push({ kind: "bayat bellek", severity: "low", text: `Bağlı bellek kaydı bayat ya da süresi dolmuş: ${plain(l.rec.title, 120)}` });
  }
  if (d.assumptions.length === 0) risks.push({ kind: "varsayım yok", severity: "low", text: "Karar hangi varsayımlara dayandığını kaydetmemiş; kırılabilecek bir şey izlenmiyor." });

  const reasons: string[] = [];
  let verdict: Verdict = "güvenilir";
  if (broken.length > 0) reasons.push(`${broken.length} varsayım kırık`);
  if (d.status !== "active") reasons.push(`karar ${d.status === "superseded" ? "yerine geçilmiş" : "emekli"}`);
  if (reasons.length > 0) verdict = "zayıf";
  else {
    if (unvalidated.length > 0) reasons.push(`${unvalidated.length} varsayım doğrulanmamış`);
    if (expired) reasons.push("karar süresi doldu");
    else if (expiringSoon) reasons.push(`karar süresi ${EXPIRY_SOON_DAYS} gün içinde doluyor`);
    if (reasons.length > 0) verdict = "gözden geçir";
    else reasons.push("kırık ya da doğrulanmamış varsayım yok, süre geçerli");
  }

  const counterpoints = counterDecisions.map((c) => ({
    decisionId: c.id,
    title: plain(c.title, 200),
    decidedAt: c.decidedAt,
    rationale: plain(c.rationale, 400),
    brokenAssumptions: c.assumptions.filter((a) => a.status === "broken").map((a) => plain(a.text, 300)),
  }));

  const md: string[] = [];
  md.push(`# Argüman: ${line(d.title, 200)}`, "", `> ÜRETİLMİŞ BELGE: karar defterinden derlendi (karar ${d.id.slice(0, 8)}; üretim zamanı ${at.toISOString()}). Hüküm bir ÖNERİDİR, karar kullanıcıdadır.`, "", `**Hüküm: ${verdict}** — ${reasons.map((r) => line(r, 160)).join("; ")}.`, "");
  md.push("## İddia", "", line(d.title, 300), "");
  md.push("## Dayanaklar", "", ...grounds.map((g) => `- ${line(g, 700)}`), "");
  md.push("## Varsayımlar", "", ...(d.assumptions.length ? d.assumptions.map((a) => `- [${a.status}] ${line(a.text, 300)} (doğrulama tarihi ${day(a.checkBy)})`) : ["- (kayıtlı varsayım yok)"]), "");
  md.push("## Riskler", "", ...(risks.length ? risks.map((r) => `- ${r.severity.toUpperCase()} — ${r.kind}: ${line(r.text, 400)}`) : ["- (belirgin risk yok)"]), "");
  md.push("## Karşı görüşler (aynı kapsamda yerine geçilen önceki kararlar)", "", ...(counterpoints.length ? counterpoints.map((c) => `- ${line(c.title, 160)} (${day(c.decidedAt)}; id ${c.decisionId.slice(0, 8)}): ${line(c.rationale, 300)}${c.brokenAssumptions.length ? ` — kırık varsayım: ${c.brokenAssumptions.map((b) => line(b, 120)).join(" | ")}` : ""}`) : ["- (yok)"]), "");
  const raw = md.join("\n");
  const markdown = redactString(raw);

  return {
    decisionId: d.id,
    claim: plain(d.title, 200),
    scope: d.scope,
    status: d.status,
    decidedAt: d.decidedAt,
    expiresAt: d.expiresAt,
    grounds,
    assumptions,
    risks,
    counterpoints,
    linkedMemory: linked.map((l) => ({ id: l.rec.id, title: plain(l.rec.title, 120), kind: l.rec.kind, confidence: l.rec.confidence, flags: l.flags })),
    verdict,
    verdictReasons: reasons,
    markdown,
    maskedSecrets: markdown !== raw || maskedCount > 0,
    generatedAt: at.toISOString(),
  };
}
