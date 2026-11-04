// Madde 75: ajanlar arası müzakere protokolü (model yeteneği, D8c-3a): tanım, adım şemaları, istemler ve sonuç türetme. Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// İki FARKLI sağlayıcı (A: öneren, B: eleştirmen) kullanıcı isteğiyle yapılandırılmış müzakere yapar; hiçbir şey kendiliğinden uygulanmaz, sonuç yalnız ÖNERİDİR.
// Çalıştırma akışı src/capabilities/negotiation.ts'tedir; burada yalnız saf işlevler vardır. Her model çıktısı GÜVENİLMEZ VERİDİR: şemaya göre doğrulanır ve bir sonraki istemde
// nonce'lu sınırlayıcıyla "veri, talimat değildir" olarak verilir.
import { OutputInvalid, asEnum, asItems, asObject, asText, asTextList, cleanInputText, renderPrompt } from "./common.ts";
import type { CleanInput, ModelCapability, PriorBlock } from "./common.ts";

export const NEGOTIATION_STEPS = ["propose", "critique", "revise", "final"] as const;
export type NegotiationStep = (typeof NEGOTIATION_STEPS)[number];
export const SEVERITIES = ["low", "medium", "high"] as const;
export const STANCES = ["agree", "partial", "disagree"] as const;
export const OUTCOME_STATUSES = ["consensus", "partial", "disagreement"] as const;
export type OutcomeStatus = (typeof OUTCOME_STATUSES)[number];
export const REC_SOURCE_MODEL = "B modeli (güvenilmez)";
export const REC_SOURCE_TEMPLATE = "belirleyici şablon (model metni değil)";
export const CONFIDENCES = ["low", "medium"] as const;
export const NEGOTIATION_NOTE = "Hiçbir şey kendiliğinden uygulanmadı; bu sonuç yalnız ÖNERİDİR, karar sizindir.";
export const SAME_PROVIDER_MESSAGE = "providerA ve providerB aynı olamaz: müzakere iki FARKLI sağlayıcı ister";
export const NEED_TWO_MESSAGE = "müzakere için iki farklı sağlayıcı gerekir";
const ID_RE = /^[A-Za-z0-9_-]{1,20}$/;

export interface TranscriptEntry {
  round: number;
  role: "A" | "B";
  providerId: string;
  step: NegotiationStep;
  content: Record<string, unknown>;
}

export interface Outcome {
  status: OutcomeStatus;
  // 1 turlu müzakere doğrulanmamıştır: "low"; 2 turlu: "medium".
  confidence: "low" | "medium";
  agreedPoints: string[];
  openIssues: string[];
  recommendation: string;
  // Öneri metninin kaynağı (arayüz etiketler): B modeli çıktısı GÜVENİLMEZDİR; 1 turda metin belirleyici şablondur.
  recommendationSource: string;
}

export interface StepContext {
  proposalIds: ReadonlySet<string>;
}

export const stepRole = (step: NegotiationStep): "A" | "B" => (step === "propose" || step === "revise" ? "A" : "B");
export const stepRound = (step: NegotiationStep): number => (step === "propose" || step === "critique" ? 1 : 2);
export const stepsFor = (rounds: number): NegotiationStep[] => (rounds === 2 ? ["propose", "critique", "revise", "final"] : ["propose", "critique"]);

const proposalShape = (p: Record<string, unknown>, w: string) => ({
  summary: asText(p.summary, `${w}.summary`, 600),
  pros: asTextList(p.pros, `${w}.pros`, { max: 6, itemMax: 300 }),
  cons: asTextList(p.cons, `${w}.cons`, { max: 6, itemMax: 300 }),
});

function knownId(v: unknown, w: string, ctx: StepContext): string {
  const id = asText(v, w, 20);
  if (!ctx.proposalIds.has(id)) throw new OutputInvalid(`${w}: bilinen bir öneri kimliği değil`);
  return id;
}

// Adım çıktısı doğrulaması: bilinmeyen alanlar atılır; araç çağrısı/komut alanı şemada YOKTUR.
export function validateStep(step: NegotiationStep, raw: unknown, ctx: StepContext): Record<string, unknown> {
  const o = asObject(raw, "çıktı");
  if (step === "propose") {
    const seen = new Set<string>();
    return {
      position: asText(o.position, "position", 600),
      proposals: asItems(o.proposals, "proposals", { min: 1, max: 4 }, (p, w) => {
        const id = asText(p.id, `${w}.id`, 20);
        if (!ID_RE.test(id)) throw new OutputInvalid(`${w}.id: harf, rakam, _ ve - içeren en çok 20 karakterli bir kimlik olmalı`);
        if (seen.has(id)) throw new OutputInvalid(`${w}.id: yinelenen kimlik`);
        seen.add(id);
        return { id, ...proposalShape(p, w) };
      }),
    };
  }
  if (step === "critique") {
    const cp = o.counterProposal;
    return {
      critiques: asItems(o.critiques, "critiques", { min: 0, max: 8 }, (c, w) => ({
        proposalId: knownId(c.proposalId, `${w}.proposalId`, ctx),
        objection: asText(c.objection, `${w}.objection`, 600),
        severity: asEnum(c.severity, `${w}.severity`, SEVERITIES),
        suggestion: asText(c.suggestion, `${w}.suggestion`, 600),
      })),
      counterProposal: cp === null || cp === undefined ? null : proposalShape(asObject(cp, "counterProposal"), "counterProposal"),
      // AÇIK tutum ZORUNLU: boş eleştiri listesi tek başına uzlaşma sayılmaz.
      stance: asEnum(o.stance, "stance", STANCES),
    };
  }
  if (step === "revise") {
    return {
      revisions: asItems(o.revisions, "revisions", { min: 0, max: 8 }, (r, w) => ({
        proposalId: knownId(r.proposalId, `${w}.proposalId`, ctx),
        change: asText(r.change, `${w}.change`, 600),
        answersCritique: asText(r.answersCritique, `${w}.answersCritique`, 600),
      })),
      stance: asText(o.stance, "stance", 400),
    };
  }
  return {
    stance: asEnum(o.stance, "stance", STANCES),
    remainingIssues: asTextList(o.remainingIssues, "remainingIssues", { max: 8, itemMax: 400 }),
    agreedPoints: asTextList(o.agreedPoints, "agreedPoints", { max: 8, itemMax: 400 }),
    recommendation: asText(o.recommendation, "recommendation", 800),
  };
}

// --- Sonuç: yalnız doğrulanmış transcript'ten, belirleyici (modelden ek metin istemeden) türetilir ---
export function deriveOutcome(transcript: TranscriptEntry[], rounds: number): Outcome {
  const proposeEntry = transcript.find((t) => t.step === "propose");
  const proposals = ((proposeEntry?.content.proposals ?? []) as Array<{ id: string; summary: string }>).slice(0, 4);
  if (rounds === 2) {
    const fin = transcript.find((t) => t.step === "final");
    const c = (fin?.content ?? {}) as { stance?: string; remainingIssues?: string[]; agreedPoints?: string[]; recommendation?: string };
    // consensus YALNIZ B'nin son tutumu agree VE remainingIssues boşsa; agree deyip sorun listelerse partial.
    const issues = c.remainingIssues ?? [];
    const status: OutcomeStatus = c.stance === "agree" ? (issues.length === 0 ? "consensus" : "partial") : c.stance === "partial" ? "partial" : "disagreement";
    return { status, confidence: "medium", agreedPoints: c.agreedPoints ?? [], openIssues: issues, recommendation: c.recommendation ?? "", recommendationSource: REC_SOURCE_MODEL };
  }
  const critique = transcript.find((t) => t.step === "critique");
  const crit = ((critique?.content.critiques ?? []) as Array<{ proposalId: string; objection: string; severity: string }>);
  const stance = (critique?.content.stance as string | undefined) ?? "partial";
  const objected = new Set(crit.map((c) => c.proposalId));
  // Tek turda ASLA consensus yok: boş eleştiri + agree bile en fazla "partial" ("itiraz yok, doğrulanmadı: tek tur"); güven "low".
  const status: OutcomeStatus = crit.some((c) => c.severity === "high") || stance === "disagree" ? "disagreement" : "partial";
  const agreedPoints = proposals.filter((p) => !objected.has(p.id)).map((p) => `${p.id}: ${p.summary}`.slice(0, 400));
  const openIssues = crit.map((c) => `${c.proposalId}: ${c.objection}`.slice(0, 600));
  if (crit.length === 0 && stance !== "agree") openIssues.push(`Eleştirmen tutumu ${stance}: ayrıntı verilmedi`);
  const recommendation =
    crit.length === 0 && stance === "agree"
      ? `İtiraz yok, doğrulanmadı: tek tur; öneriler (${proposals.map((p) => p.id).join(", ")}) için uygulamadan önce siz karar verin.`
      : `Açık konular var (${openIssues.length}); önerileri uygulamadan önce açık konuları değerlendirin.`;
  return { status, confidence: "low", agreedPoints, openIssues, recommendation, recommendationSource: REC_SOURCE_TEMPLATE };
}

// --- İstemler ---
const SCHEMAS: Record<NegotiationStep, string> = {
  propose: `{"position":"","proposals":[{"id":"o1","summary":"","pros":[""],"cons":[""]}]}`,
  critique: `{"critiques":[{"proposalId":"o1","objection":"","severity":"low|medium|high","suggestion":""}],"counterProposal":{"summary":"","pros":[""],"cons":[""]},"stance":"agree|partial|disagree"}`,
  revise: `{"revisions":[{"proposalId":"o1","change":"","answersCritique":""}],"stance":""}`,
  final: `{"stance":"agree|partial|disagree","remainingIssues":[""],"agreedPoints":[""],"recommendation":""}`,
};
const TASKS: Record<NegotiationStep, string> = {
  propose: "Rol: ÖNEREN (A). Konu için en çok 4 öneri üret (seçenekler verildiyse onları değerlendir). Her öneriye kısa bir kimlik (ör. o1), özet, artılar ve eksiler ver; başlangıç duruşunu (position) yaz.",
  critique: "Rol: ELEŞTİRMEN (B). Önceki çıktıdaki (A'nın önerileri) her öneriyi eleştir: itiraz, ciddiyet (low, medium, high) ve düzeltme önerisi ver. Gerekirse karşı öneri (counterProposal) sun, yoksa null yaz. Genel tutumunu (stance: agree, partial, disagree) AÇIKÇA bildir; eleştiri listesini boş bırakmak tutum yerine geçmez. Yalnız var olan öneri kimliklerine atıf yap.",
  revise: "Rol: ÖNEREN (A). Eleştirmenin itirazlarına yanıt ver: hangi öneride neyi değiştirdiğini ve hangi eleştiriyi nasıl karşıladığını yaz; güncel duruşunu (stance) belirt.",
  final: "Rol: ELEŞTİRMEN (B). A'nın gözden geçirmesine bakarak SON tutumunu bildir: agree, partial ya da disagree; kalan sorunları, üzerinde anlaştığınız noktaları ve bir öneri metnini (recommendation) yaz.",
};
const LABELS: Record<string, string> = { topic: "Konu", options: "Seçenekler", constraints: "Kısıtlar" };

export function stepPrompt(step: NegotiationStep, input: CleanInput, prior: PriorBlock[], nonce?: string): string {
  const { providerA: _a, providerB: _b, rounds: _r, ...rest } = input;
  return renderPrompt({ gorev: TASKS[step], schema: SCHEMAS[step], input: rest, labels: LABELS, prior, ...(nonce ? { nonce } : {}) });
}

// Önceki adımların DOĞRULANMIŞ çıktısı, bir sonraki isteme güvenilmez veri olarak taşınır (metin temizliği + sınırlayıcı etkisizleştirme + nonce).
export function priorBlocks(transcript: TranscriptEntry[]): PriorBlock[] {
  return transcript.map((t) => ({ role: t.role, step: t.step, text: cleanInputText(JSON.stringify(t.content)) }));
}

// --- Yetenek tanımı (liste ucu ve genel sözleşme için) ---
function checkTranscript(raw: unknown): TranscriptEntry[] {
  if (!Array.isArray(raw)) throw new OutputInvalid("transcript: liste bekleniyordu");
  if (raw.length < 1 || raw.length > 4) throw new OutputInvalid("transcript: 1..4 adım olmalı");
  let ctx: StepContext = { proposalIds: new Set() };
  return raw.map((e, i) => {
    const w = `transcript[${i}]`;
    const o = asObject(e, w);
    const step = asEnum(o.step, `${w}.step`, NEGOTIATION_STEPS);
    const role = asEnum(o.role, `${w}.role`, ["A", "B"] as const);
    if (role !== stepRole(step)) throw new OutputInvalid(`${w}.role: adımla uyuşmuyor`);
    const round = o.round;
    if (round !== 1 && round !== 2) throw new OutputInvalid(`${w}.round: 1 ya da 2 olmalı`);
    const content = validateStep(step, o.content, ctx);
    if (step === "propose") ctx = { proposalIds: new Set((content.proposals as Array<{ id: string }>).map((p) => p.id)) };
    return { round, role, providerId: asText(o.providerId, `${w}.providerId`, 100), step, content };
  });
}

export const negotiation: ModelCapability = {
  id: "negotiation",
  madde: 75,
  ad: "Ajanlar arası müzakere",
  aciklama: "İki FARKLI sağlayıcı (A öneren, B eleştirmen) bir konuda 1-2 turluk yapılandırılmış müzakere yapar; uzlaşma, kısmi uzlaşma ya da anlaşmazlık sonucu ve açık konular çıkar. Hiçbir şey kendiliğinden uygulanmaz; sonuç yalnız öneridir.",
  fields: [
    { name: "topic", label: "Konu", kind: "text", required: true, maxLength: 2000 },
    { name: "options", label: "Seçenekler", kind: "list", required: false, maxLength: 300, maxItems: 4 },
    { name: "constraints", label: "Kısıtlar", kind: "text", required: false, maxLength: 1000 },
    { name: "rounds", label: "Tur sayısı (1 ya da 2; varsayılan 2)", kind: "number", required: false, maxLength: 1 },
    { name: "providerA", label: "Öneren sağlayıcı (isteğe bağlı)", kind: "text", required: false, maxLength: 40 },
    { name: "providerB", label: "Eleştirmen sağlayıcı (isteğe bağlı)", kind: "text", required: false, maxLength: 40 },
  ],
  schemaSummary: "transcript[1-4]{round,role(A|B),providerId,step(propose|critique|revise|final),content}, outcome{status(consensus|partial|disagreement),agreedPoints[],openIssues[],recommendation}, providers{A,B}, rounds",
  promptBuilder(input: CleanInput): string {
    return stepPrompt("propose", input, []);
  },
  validateOutput(raw: unknown): Record<string, unknown> {
    const o = asObject(raw, "çıktı");
    const transcript = checkTranscript(o.transcript);
    const oc = asObject(o.outcome, "outcome");
    const pr = asObject(o.providers, "providers");
    const rounds = o.rounds;
    if (rounds !== 1 && rounds !== 2) throw new OutputInvalid("rounds: 1 ya da 2 olmalı");
    return {
      transcript,
      outcome: {
        status: asEnum(oc.status, "outcome.status", OUTCOME_STATUSES),
        agreedPoints: asTextList(oc.agreedPoints, "outcome.agreedPoints", { max: 8, itemMax: 400 }),
        openIssues: asTextList(oc.openIssues, "outcome.openIssues", { max: 16, itemMax: 600 }),
        recommendation: asText(oc.recommendation, "outcome.recommendation", 800),
        confidence: asEnum(oc.confidence, "outcome.confidence", CONFIDENCES),
        recommendationSource: asText(oc.recommendationSource, "outcome.recommendationSource", 100),
      },
      providers: { A: asText(pr.A, "providers.A", 100), B: asText(pr.B, "providers.B", 100) },
      rounds,
      note: NEGOTIATION_NOTE,
    };
  },
  example: {
    transcript: [
      { round: 1, role: "A", providerId: "claude-code", step: "propose", content: { position: "Önbellek ekle.", proposals: [{ id: "o1", summary: "Bellek içi önbellek", pros: ["Hızlı"], cons: ["Bayatlama"] }] } },
      { round: 1, role: "B", providerId: "local-x", step: "critique", content: { critiques: [{ proposalId: "o1", objection: "Bayat veri riski", severity: "medium", suggestion: "Kısa ömür ekle" }], counterProposal: null, stance: "partial" } },
    ],
    outcome: { status: "partial", confidence: "low", agreedPoints: [], openIssues: ["o1: Bayat veri riski"], recommendation: "Açık konular var (1); önerileri uygulamadan önce açık konuları değerlendirin.", recommendationSource: "belirleyici şablon (model metni değil)" },
    providers: { A: "claude-code", B: "local-x" },
    rounds: 1,
    note: NEGOTIATION_NOTE,
  },
};
