// Örtük bilgi çıkarıcı (madde 87). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// KURAL TABANLI (model yok, ağ yok): denetim kayıtları, karar defteri, görev kayıtları ve bellek çelişki bayraklarındaki tekrar eden örüntülerden
// ADAY bilgi önerir. ASLA kendiliğinden kaydetmez: yalnız öneri döner; hafızaya eklemek mevcut `POST /api/memory` ile KULLANICI kararıdır.
// Güven formülü (hepsi için): confidence = sayı / (sayı + 2)  (3 tekrar = 0.6, 8 tekrar = 0.8; hiçbir zaman 1'e varmaz).
// Eşik: a, b, c, e kuralları için en az 3 tekrar. d kuralı (süresi dolmuş karar) tek karardır; sayı = gecikme gün sayısı (en az 1).
import { createHash } from "node:crypto";
import { redactString } from "../core/audit/redact.ts";
import type { Db } from "../core/db/db.ts";
import type { DecisionLedger } from "../reasoning/reasoning.ts";
import { foldTr } from "./store.ts";
import type { MemoryStore } from "./store.ts";

export const MIN_REPEATS = 3;
export const MAX_EVIDENCE = 10;
export const MAX_CANDIDATES = 50;
export const AUDIT_SCAN_LIMIT = 5000;
const DAY = 86_400_000;
const SCOPE = /^[A-Za-z0-9][A-Za-z0-9_.:\- ]{0,79}$/;
const DEFAULT_SCOPE = "agentmom";
const MAX_TEXT = 500;

export type ImplicitRule = "approval_repeat" | "deny_repeat" | "provider_unstable" | "decision_expired" | "contradiction_repeat";

export interface ImplicitCandidate {
  id: string;
  kind: "fact" | "note" | "incident";
  rule: ImplicitRule;
  text: string;
  evidence: string[];
  count: number;
  confidence: number;
  suggestedScope: string;
  // Metin ajan girdisi içerebilen denetim/karar verisinden türedi: talimat olarak değil, veri olarak okunmalı.
  untrusted: true;
  source: string;
}

export interface ImplicitReport {
  candidates: ImplicitCandidate[];
  skippedAlreadyRecorded: number;
  scannedAuditEvents: number;
  minRepeats: number;
  note: string;
}

export interface ImplicitSource {
  db: Db;
  memory: MemoryStore;
  ledger: DecisionLedger;
  now?: () => Date;
}

interface AuditRow {
  id: string;
  initiator_kind: string;
  action: string;
  decision: string;
  result: string;
  details_json: string;
}

type Details = Record<string, unknown>;

function parse(json: string): Details {
  try {
    const v: unknown = JSON.parse(json);
    return v !== null && typeof v === "object" && !Array.isArray(v) ? (v as Details) : {};
  } catch {
    return {};
  }
}

const str = (v: unknown): string => (typeof v === "string" ? v : "");
const confidenceOf = (count: number): number => Number((count / (count + 2)).toFixed(4));
const clean = (s: string, max: number): string => redactString(s.replace(/\s+/g, " ").trim()).slice(0, max);
const idFor = (...key: string[]): string => `ort-${createHash("sha256").update(key.join("\u0000")).digest("hex").slice(0, 12)}`;
// Dış kaynaklı (denetim kaydı, ajan girdisi, karar başlığı) alanlar: kontrol karakterleri temizlenir, maskelenir, kısaltılır ve JSON dizgesi olarak
// (tırnaklı, içteki tırnak/ters bölü kaçışlı) gömülür; böylece metin içinde talimat gibi görünemez.
const q = (v: string, max: number): string => JSON.stringify(clean(v.replace(/[\u0000-\u001f\u007f]+/g, " "), max));
const tail = (ids: string[]): string[] => ids.slice(-MAX_EVIDENCE);
const scopeOr = (s: string): string => (SCOPE.test(s) && redactString(s) === s ? s : DEFAULT_SCOPE);

function make(rule: ImplicitRule, kind: ImplicitCandidate["kind"], key: string[], body: string, evidence: string[], count: number, scope: string): ImplicitCandidate {
  const id = idFor(rule, ...key);
  // Kimlik işareti: kullanıcı metni olduğu gibi kaydederse aday bir sonraki taramada "zaten kayıtlı" diye elenir.
  const marker = ` [örtük:${id}]`;
  return { id, kind, rule, text: clean(body, MAX_TEXT - marker.length) + marker, evidence: tail(evidence), count, confidence: confidenceOf(count), suggestedScope: scopeOr(scope), untrusted: true, source: "denetim kaydı (ajan girdisi içerebilir)" };
}

export function extractImplicit(src: ImplicitSource): ImplicitReport {
  const now = (src.now ?? (() => new Date()))();
  // En yeni 5000 denetim satırı, eskiden yeniye.
  const rows = (src.db.prepare("SELECT id, initiator_kind, action, decision, result, details_json FROM audit_events ORDER BY rowid DESC LIMIT ?").all(AUDIT_SCAN_LIMIT) as unknown as AuditRow[]).reverse();
  const out: ImplicitCandidate[] = [];

  // (a) Kullanıcı aynı eylem + hedef için en az 3 kez onay verdi => kalıcı izin önerisi.
  const approvals = new Map<string, { action: string; target: string; ids: string[] }>();
  const taskOf = src.db.prepare("SELECT requested_action, request_json FROM tasks WHERE id = ?");
  for (const r of rows) {
    if (r.action !== "task.approve" || r.initiator_kind !== "user") continue;
    const taskId = str(parse(r.details_json).taskId);
    const t = taskId ? (taskOf.get(taskId) as unknown as { requested_action: string; request_json: string } | undefined) : undefined;
    if (!t) continue;
    const target = str(parse(t.request_json).target);
    const key = `${t.requested_action}\u0000${target}`;
    const g = approvals.get(key) ?? { action: t.requested_action, target, ids: [] };
    g.ids.push(r.id);
    approvals.set(key, g);
  }
  for (const [key, g] of approvals) {
    if (g.ids.length < MIN_REPEATS) continue;
    const where = g.target ? ` ${q(g.target, 200)} hedefi için` : "";
    out.push(make("approval_repeat", "note", [key], `Kullanıcı ${q(g.action, 60)} eylemini${where} ${g.ids.length} kez onayladı. Bu eylem için sınırlı süreli bir izin (geçici izin) ya da görev sözleşmesi güncellemesi düşünülebilir; karar kullanıcıdadır, kendiliğinden izin verilmez.`, g.ids, g.ids.length, DEFAULT_SCOPE));
  }

  // (b) Aynı kuralla en az 3 ret => sık reddedilen eylem.
  const denies = new Map<string, { rule: string; action: string; ids: string[] }>();
  for (const r of rows) {
    if (r.decision !== "deny") continue;
    const d = parse(r.details_json);
    const rule = str(d.rule);
    if (!rule) continue;
    const req = d.request !== null && typeof d.request === "object" ? (d.request as Details) : {};
    const action = str(req.action) || r.action.replace(/^task\.create:/, "");
    const key = `${rule}\u0000${action}`;
    const g = denies.get(key) ?? { rule, action, ids: [] };
    g.ids.push(r.id);
    denies.set(key, g);
  }
  for (const [key, g] of denies) {
    if (g.ids.length < MIN_REPEATS) continue;
    out.push(make("deny_repeat", "fact", [key], `${q(g.action, 60)} eylemi ${q(g.rule, 80)} kuralıyla ${g.ids.length} kez reddedildi (sık reddedilen eylem). Ajan talimatını ya da sözleşmeyi bu kurala göre gözden geçirin.`, g.ids, g.ids.length, DEFAULT_SCOPE));
  }

  // (c) Aynı sağlayıcıda ardışık (son) en az 3 başarısız koşu => sağlayıcı kararsız.
  const providerOfAttempt = new Map<string, string>();
  const runs = new Map<string, Array<{ id: string; ok: boolean }>>();
  for (const r of rows) {
    const d = parse(r.details_json);
    if (r.action === "run.started") {
      const m = /^attempt (.+)$/.exec(r.result);
      if (m && str(d.providerId)) providerOfAttempt.set(m[1] as string, str(d.providerId));
    } else if (r.action === "run.finished") {
      const provider = providerOfAttempt.get(str(d.attemptId));
      if (provider) runs.set(provider, [...(runs.get(provider) ?? []), { id: r.id, ok: r.result === "succeeded" }]);
    }
  }
  for (const [provider, list] of runs) {
    let streak = 0;
    for (let i = list.length - 1; i >= 0 && !(list[i] as { ok: boolean }).ok; i--) streak++;
    if (streak < MIN_REPEATS) continue;
    out.push(make("provider_unstable", "incident", [provider], `${q(provider, 60)} sağlayıcısında son ${streak} koşu üst üste başarısız oldu (sağlayıcı kararsız). Bağlantıyı sınayın ve gerekirse başka sağlayıcı seçin.`, list.slice(-streak).map((x) => x.id), streak, DEFAULT_SCOPE));
  }

  // (d) Süresi dolmuş ama yenilenmemiş (hâlâ etkin) kararlar => gözden geçir.
  for (const d of src.ledger.list({ onlyActive: true })) {
    const late = now.getTime() - Date.parse(d.expiresAt);
    if (!(late > 0)) continue;
    const days = Math.max(1, Math.floor(late / DAY));
    out.push(make("decision_expired", "note", [d.id], `${q(d.title, 120)} kararının süresi ${d.expiresAt.slice(0, 10)} tarihinde doldu ve yenilenmedi (${days} gün). Gözden geçirip yeni bir kararla yenileyin ya da emekli edin.`, [d.id], days, d.scope));
  }

  // (e) Aynı konuda (kapsam + konu) en az 3 açık çelişki bayrağı => tekrar eden çelişki.
  const flagGroups = new Map<string, { subject: string; scope: string; ids: string[] }>();
  for (const f of src.memory.openContradictions()) {
    try {
      const rec = src.memory.get(f.recordId);
      if (rec.subject === null) continue;
      const key = `${rec.scope}\u0000${rec.subject}`;
      const g = flagGroups.get(key) ?? { subject: rec.subject, scope: rec.scope, ids: [] };
      g.ids.push(f.id);
      flagGroups.set(key, g);
    } catch {
      // kaydı bulunamayan bayrak atlanır
    }
  }
  for (const [key, g] of flagGroups) {
    if (g.ids.length < MIN_REPEATS) continue;
    out.push(make("contradiction_repeat", "note", [key], `${q(g.subject, 120)} konusunda (kapsam ${q(g.scope, 60)}) ${g.ids.length} açık çelişki bayrağı var. Kayıtları gözden geçirip doğru olanın yerine diğerlerini geçirin.`, g.ids, g.ids.length, g.scope));
  }

  // "Zaten kayıtlı" ayıklaması: etkin kayıtlardan birinin gövdesi aynı kimlik işaretini ya da aynı metni taşıyorsa aday elenir.
  const existing = src.memory.list({ limit: 500 }).filter((r) => r.status === "active");
  const bodies = existing.map((r) => foldTr(r.body).replace(/\s+/g, " "));
  const kept = out.filter((c) => {
    const bare = foldTr(c.text).replace(/\s+/g, " ");
    const core = bare.replace(/ \[ortuk:ort-[0-9a-f]+\]$/, "");
    return !bodies.some((b) => b.includes(`[ortuk:${c.id}]`) || b === bare || b === core);
  });
  kept.sort((a, b) => b.confidence - a.confidence || (a.id < b.id ? -1 : 1));
  return {
    candidates: kept.slice(0, MAX_CANDIDATES),
    skippedAlreadyRecorded: out.length - kept.length,
    scannedAuditEvents: rows.length,
    minRepeats: MIN_REPEATS,
    note: "Bunlar yalnız ÖNERİDİR; hiçbiri kaydedilmedi. Kaydetmek isterseniz metni POST /api/memory ile siz ekleyin. Güven = sayı / (sayı + 2).",
  };
}
