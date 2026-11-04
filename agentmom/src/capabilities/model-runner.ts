// Model yeteneği çalıştırıcısı (D8c-1, ADR-016). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// Uygulama içi modelin (mevcut sağlayıcı adaptörü; abonelik/yerel rota, ücretli rota ASLA) çağrıldığı TEK ortak yol. Dokuz yapılandırılmış-çıktılı yetenek bu yoldan çalışır (6 çevrimdışı; 37/38/40 internetli: kaynaklar fetchPublic ile, kullanıcı biletiyle getirilir).
// Güvenlik sınırları: yalnız kullanıcı; veri sınırı (secret girdi yalnız yerel rotaya); mevcut startRun hattı (görev + kullanıcı onayı + politika + denetim + kanıt);
// SALT-OKUNUR sandbox ve boş, yalıtılmış bir git deposu (hiçbir proje dosyası modele verilmez); aynı anda en çok 1 koşu; en çok 5 dk.
// Model çıktısı GÜVENİLMEZ VERİDİR: şemaya göre doğrulanır, her zaman untrusted:true döner, talimat/komut/dosya yolu olarak yorumlanmaz. Denetime girdi/çıktı METNİ yazılmaz.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, realpathSync, renameSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { AuditLog } from "../core/audit/audit.ts";
import { redact, redactString } from "../core/audit/redact.ts";
import type { Db } from "../core/db/db.ts";
import { hostAllowed, parseTarget } from "../net/guard.ts";
import { MAX_TEXT_BYTES, clipBytes } from "../net/html-text.ts";
import type { ApprovalTickets } from "../net/approval.ts";
import { HOW_TO_ENABLE } from "../net/settings.ts";
import type { NetSettings } from "../net/settings.ts";
import { fetchPublic } from "../net/web-fetch.ts";
import type { FetchLimiter, Resolver, TransportOverride } from "../net/web-fetch.ts";
import { resolveInsideRoot } from "../core/config/safe-path.ts";
import { evaluate } from "../core/policy/engine.ts";
import { classifyData } from "../core/policy/data-boundary.ts";
import type { Actor, AutonomyContract, DataClass } from "../core/policy/types.ts";
import type { ActionRequest } from "../core/policy/types.ts";
import type { TaskStore } from "../core/tasks/tasks.ts";
import { brokerRequest } from "../analysis/broker.ts";
import type { ProviderSnapshot } from "../analysis/snapshot.ts";
import type { EvidenceStore } from "../orchestrator/evidence.ts";
import { RunRefused, startRun } from "../orchestrator/run-task.ts";
import { SYSTEM, canonicalPath, git } from "../orchestrator/steps.ts";
import type { ExecutionResult, ProviderAdapter } from "../providers/contract.ts";
import type { ProviderRegistry } from "../providers/registry.ts";
import { InputInvalid, OutputInvalid, cleanSourceText, extractJson, normalizeForQuote, validateInput } from "./model/common.ts";
import type { ModelCapability, OutputContext, PromptSource } from "./model/common.ts";
import { MAX_URLS, SOURCELESS_WARNING, VERIFIED_MEANING } from "./model/net-common.ts";
import { MODEL_CAPABILITIES, findModelCapability } from "./model/registry.ts";
import { negotiationAvailability, startNegotiation } from "./negotiation.ts";

export const MAX_RUN_MS = 5 * 60 * 1000;
export const MAX_EVIDENCE_BYTES = 64 * 1024;
// Birikmiş çalışma ağacı üst sınırı: SİLME YOK, sınıra gelince yeni koşular 409 ile durur (temizlik Yusuf'ta: Geri Dönüşüm Kutusu'na taşıma).
export const SANDBOX_WORKTREE_LIMIT = 80;
export const SANDBOX_CLEANUP_MESSAGE = "analysis-sandbox/wt altında çok fazla eski çalışma ağacı birikti; Yusuf'un bunları Geri Dönüşüm Kutusu'na taşıması gerekir (otomatik silme yapılmaz)";
// Bekçi payı: sağlayıcının kendi zaman aşımından sonra beklenen ek süre.
export const GRACE_MS = 15_000;
export const SECRET_WARNING = "sır gibi görünen kodlanmış metin yerel olmayan sağlayıcıya gönderilmez";
const KEEP_RUNS = 200;
// İnternetli yetenekler: kaynak başına en çok 60 KB, toplam en çok 150 KB metin istemde verilir.
export const MAX_SOURCE_BYTES = MAX_TEXT_BYTES;
export const MAX_TOTAL_SOURCE_BYTES = 150 * 1024;

export type ModelErrorCode = "validation" | "not_found" | "busy" | "provider_unavailable" | "user_required" | "data_boundary_secret" | "refused";

export class ModelCapabilityError extends Error {
  readonly code: string;
  readonly status: number;
  // Yanıt gövdesine eklenecek ek alanlar (ör. howToEnable, kaynak durumları).
  readonly extra: Record<string, unknown> | undefined;

  constructor(code: string, message: string, status: number, extra?: Record<string, unknown>) {
    super(message);
    this.extra = extra;
    this.name = "ModelCapabilityError";
    this.code = code;
    this.status = status;
  }
}

export type ModelRunStatus = "running" | "done" | "failed" | "refused";

export interface ModelRunRecord {
  taskId: string;
  capabilityId: string;
  status: ModelRunStatus;
  providerId: string;
  // Müzakerede ayrı alanlar (providerId yalnız gösterim etiketi "A+B"dir ve ASLA sağlayıcı aramasına verilmez).
  providerA?: string;
  providerB?: string;
  result?: Record<string, unknown> & { untrusted: true };
  error?: { code: string; message: string };
  usage?: ExecutionResult["usage"];
}

// Çalıştırıcının süreç içi durumu: tek koşu kilidi ve son koşuların kaydı. createApp başına bir tane kurulur.
export class ModelRunnerState {
  busy = false;
  readonly runs = new Map<string, ModelRunRecord>();

  remember(rec: ModelRunRecord): void {
    this.runs.set(rec.taskId, rec);
    while (this.runs.size > KEEP_RUNS) {
      const oldest = this.runs.keys().next().value;
      if (oldest === undefined) break;
      this.runs.delete(oldest);
    }
  }
}

// İnternet katmanı bağlantıları (D8c-2b). Yoksa internetli yetenekler adres verilince net_disabled döner; adressiz (kaynaksız) kip her zaman çalışır.
export interface ModelNetDeps {
  settings: () => NetSettings;
  db: Db;
  tickets?: ApprovalTickets;
  limiter?: FetchLimiter;
  resolver?: Resolver;
  transportOverride?: TransportOverride;
  limits?: { totalMs?: number; connectMs?: number };
}

export interface SourceInfo {
  index: number;
  url: string;
  fetchedAt?: string;
  status?: number;
  contentType?: string;
  bytes?: number;
  sha256?: string;
  truncated?: boolean;
  // Başarısızsa sabit hata kodu (ör. approval_required, redirect_needs_approval, http_status).
  error?: string;
}

export interface ModelRunnerDeps {
  net?: ModelNetDeps;
  tasks: TaskStore;
  audit: AuditLog;
  registry: ProviderRegistry;
  evidence: EvidenceStore;
  contract: AutonomyContract;
  // Sandbox deposu <stateDir>/analysis-sandbox altında kurulur (kullanıcı verisi DEĞİLDİR).
  stateDir: string;
  // Sağlayıcı anlık görüntüleri (broker girdisi): her çağrıda taze okunur.
  snapshots: () => ProviderSnapshot[];
  state: ModelRunnerState;
  // Test kancası: koşu süresini kısaltır (5 dakikayı AŞAMAZ).
  runTimeoutMs?: number;
  // Test kancası: bekçi payı (varsayılan 15 sn).
  graceMs?: number;
  // Test kancası: müzakere toplam süresi (10 dakikayı AŞAMAZ).
  negotiationTotalMs?: number;
  now?: () => Date;
}

export interface StartedModelRun {
  taskId: string;
  providerId: string;
  providerA?: string;
  providerB?: string;
  done: Promise<ModelRunRecord>;
  warnings?: string[];
}

// --- Sağlayıcı seçimi (salt öneri hattı: broker) ---
type Selection = { ok: true; adapter: ProviderAdapter } | { ok: false; code: "provider_unavailable" | "data_boundary_secret"; reason: string };

export function usable(deps: Pick<ModelRunnerDeps, "registry" | "snapshots">, dataClass: DataClass): { adapters: ProviderAdapter[]; reasons: string[]; cloudSkippedForSecret: boolean } {
  const b = brokerRequest(deps.snapshots(), "execute", null);
  const adapters: ProviderAdapter[] = [];
  const reasons: string[] = b.eliminated.map((e) => `${e.provider}: ${e.reasons.join("; ")}`);
  let cloudSkippedForSecret = false;
  for (const c of b.candidates) {
    const a = deps.registry.get(c.provider);
    if (!a) {
      reasons.push(`${c.provider}: kullanılamıyor (kapalı ya da adaptör yok)`);
      continue;
    }
    // Çalışma dizini dışını okuyabilen sağlayıcı yalnız güvenilir depolarda çalışır; yalıtılmış sandbox güvenilir depo DEĞİLDİR.
    if (a.readScope === "unconfined") {
      reasons.push(`${c.provider}: çalışma dizini dışını okuyabildiği için model yeteneklerinde kullanılmaz`);
      continue;
    }
    if (a.routeKind === "api_paid") {
      reasons.push(`${c.provider}: ücretli rota kapalı`);
      continue;
    }
    if (dataClass === "secret" && a.routeKind !== "local") {
      cloudSkippedForSecret = true;
      continue;
    }
    adapters.push(a);
  }
  return { adapters, reasons, cloudSkippedForSecret };
}

export function select(deps: Pick<ModelRunnerDeps, "registry" | "snapshots">, dataClass: DataClass, providerId?: string): Selection {
  // Birleşik gösterim etiketi ("A+B") ya da biçimsiz kimlik broker'a/kayıt defterine ASLA gitmez.
  if (providerId !== undefined && !/^[a-z0-9-]{1,40}$/.test(providerId)) return { ok: false, code: "provider_unavailable", reason: "geçersiz sağlayıcı kimliği" };
  const u = usable(deps, dataClass);
  if (providerId !== undefined) {
    const hit = u.adapters.find((a) => a.id === providerId);
    if (hit) return { ok: true, adapter: hit };
    if (u.cloudSkippedForSecret) return { ok: false, code: "data_boundary_secret", reason: "girdi sır içeriyor; yalnız yerel rota kabul edilir, bu sağlayıcıya gönderilmez" };
    const why = u.reasons.find((r) => r.startsWith(`${providerId}:`));
    return { ok: false, code: "provider_unavailable", reason: why ?? `${providerId.slice(0, 40).replace(/[^\w.-]/g, "?")}: bilinmeyen ya da uygun olmayan sağlayıcı` };
  }
  const first = u.adapters[0];
  if (first) return { ok: true, adapter: first };
  if (u.cloudSkippedForSecret) return { ok: false, code: "data_boundary_secret", reason: "girdi sır içeriyor; yalnız yerel rota kabul edilir ve uygun yerel sağlayıcı yok" };
  return { ok: false, code: "provider_unavailable", reason: u.reasons.length ? `uygun sağlayıcı yok (${u.reasons.join(" | ")})`.slice(0, 600) : "uygun sağlayıcı yok" };
}

// Liste ucu için: model yetenekleri şu an çalıştırılabilir mi (dürüstçe).
export function modelCapabilityAvailability(deps: Pick<ModelRunnerDeps, "registry" | "snapshots">): { available: boolean; reason: string } {
  const s = select(deps, "internal");
  return s.ok ? { available: true, reason: `${s.adapter.id} (${s.adapter.routeKind})` } : { available: false, reason: s.reason };
}

export function listModelCapabilities(deps: Pick<ModelRunnerDeps, "registry" | "snapshots" | "net">): Array<{ id: string; madde: number; ad: string; aciklama: string; availability: { available: boolean; reason: string }; schema: string; fields: ModelCapability["fields"]; needsNet?: true; net?: { enabled: boolean; allowedDomains: string[] } }> {
  const baseAvailability = modelCapabilityAvailability(deps);
  const availability = baseAvailability;
  const s = deps.net?.settings();
  const net = { enabled: s?.enabled === true, allowedDomains: s ? [...s.allowedDomains] : [] };
  return MODEL_CAPABILITIES.map((c) => ({ id: c.id, madde: c.madde, ad: c.ad, aciklama: c.aciklama, availability: c.id === "negotiation" ? negotiationAvailability(deps) : availability, schema: c.schemaSummary, fields: c.fields, ...(c.needsNet ? { needsNet: true as const, net } : {}) }));
}

// Adresli internetli koşu ön denetimi (model/ağ çağrısından ÖNCE): ayar açık olmalı, her adres geçerli ve izinli olmalı, biletler biçimce geçerli olmalı.
function prepareNet(deps: ModelRunnerDeps, rawInput: unknown, urls: string[]): { settings: NetSettings; tickets: Map<string, string> } {
  const settings = deps.net?.settings();
  if (!deps.net || !settings || !settings.enabled) throw new ModelCapabilityError("net_disabled", HOW_TO_ENABLE, 403, { howToEnable: HOW_TO_ENABLE });
  if (urls.length > MAX_URLS) throw new ModelCapabilityError("validation", `en çok ${MAX_URLS} adres verilebilir`, 400);
  if (new Set(urls).size !== urls.length) throw new ModelCapabilityError("validation", "adresler yinelenemez (her bilet tek kullanımlıktır)", 400);
  for (const u of urls) {
    const p = parseTarget(u);
    if (!p.ok) throw new ModelCapabilityError("validation", p.message, 400);
    if (!hostAllowed(p.host, settings.allowedDomains)) throw new ModelCapabilityError("host_not_allowed", "bu ana bilgisayar izinli değil", 403);
  }
  const tickets = new Map<string, string>();
  const raw = rawInput !== null && typeof rawInput === "object" && !Array.isArray(rawInput) ? (rawInput as Record<string, unknown>).tickets : undefined;
  if (raw !== undefined) {
    if (raw === null || typeof raw !== "object" || Array.isArray(raw)) throw new ModelCapabilityError("validation", "tickets bir nesne olmalı ({adres: bilet})", 400);
    const entries = Object.entries(raw as Record<string, unknown>);
    if (entries.length > MAX_URLS) throw new ModelCapabilityError("validation", `en çok ${MAX_URLS} bilet verilebilir`, 400);
    for (const [k, v] of entries) {
      if (typeof v !== "string" || v.length === 0 || v.length > 200 || k.length > 2000) throw new ModelCapabilityError("validation", "tickets değerleri 1..200 karakterli metin olmalı", 400);
      tickets.set(k.trim(), v);
    }
    for (const k of tickets.keys()) if (!urls.includes(k)) throw new ModelCapabilityError("validation", "bilet yalnız verilen adresler için olabilir", 400);
  }
  return { settings, tickets };
}

// --- Yalıtılmış sandbox deposu: tek boş commit, hiçbir proje dosyası yok ---
export interface Sandbox {
  repoPath: string;
  worktreeRoot: string;
}

function same(a: string, b: string): boolean {
  return relative(resolve(canonicalPath(a)), resolve(canonicalPath(b))) === "";
}

export const EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
// Depo-yerel yapılandırmada bulunursa depo güvenilmez sayılır: çalıştırılabilir komut/filtre/kanca ya da başka dosya okutabilecek anahtarlar.
const DANGEROUS_CONFIG = /^(filter\.|diff\..*\.(command|textconv)|merge\..*\.driver|core\.(hookspath|fsmonitor|sshcommand|pager|editor|askpass|gitproxy|attributesfile|excludesfile|worktree)|include\.|includeif\.|alias\.|credential\.|protocol\.|receive\.|uploadpack\.|url\.)/i;

// Depo sağlam mı: kök doğru, HEAD'in ağacı BOŞ ağaç, çalışma dizininde .git dışında hiçbir şey yok, tehlikeli yapılandırma/öznitelik dosyası yok.
async function inspectSandbox(real: string, hooksDir: string): Promise<"ok" | "untrusted" | "missing"> {
  const g = (args: string[]) => git(args, real, hooksDir, undefined, true);
  const top = await g(["rev-parse", "--show-toplevel"]);
  if (top.code !== 0 || !same(top.stdout.trim(), real)) return readdirSync(real).length === 0 ? "missing" : "untrusted";
  const tree = await g(["rev-parse", "HEAD^{tree}"]);
  if (tree.code !== 0) return "untrusted";
  if (tree.stdout.trim() !== EMPTY_TREE) return "untrusted";
  if (readdirSync(real).some((n) => n !== ".git")) return "untrusted";
  if (existsSync(join(real, ".git", "info", "attributes"))) return "untrusted";
  const cfg = await g(["config", "--local", "--list"]);
  if (cfg.code !== 0) return "untrusted";
  for (const line of cfg.stdout.split("\n")) {
    const key = line.split("=")[0]?.trim() ?? "";
    if (key && DANGEROUS_CONFIG.test(key)) return "untrusted";
  }
  return "ok";
}

export async function ensureAnalysisSandbox(stateDir: string, now: () => Date = () => new Date()): Promise<Sandbox> {
  mkdirSync(stateDir, { recursive: true });
  const base = resolveInsideRoot(stateDir, "analysis-sandbox");
  mkdirSync(base, { recursive: true });
  let repoPath = resolveInsideRoot(stateDir, "analysis-sandbox/repo");
  const worktreeRoot = resolveInsideRoot(stateDir, "analysis-sandbox/wt");
  const hooksDir = join(base, ".nohooks");
  for (const d of [repoPath, worktreeRoot, hooksDir]) mkdirSync(d, { recursive: true });
  let real = realpathSync(repoPath);
  let state = await inspectSandbox(real, hooksDir);
  if (state === "untrusted") {
    // SİLME YOK: güvenilmeyen depo yeniden adlandırılarak kenara alınır (Yusuf temizler), yenisi kurulur.
    const aside = resolveInsideRoot(stateDir, `analysis-sandbox/repo.eski-${now().toISOString().replace(/[^0-9A-Za-z]/g, "")}`);
    renameSync(real, aside);
    mkdirSync(repoPath, { recursive: true });
    real = realpathSync(repoPath);
    state = "missing";
  }
  if (state === "missing") {
    const init = await git(["init", "-q"], real, hooksDir, undefined, true);
    if (init.code !== 0) throw new Error("sandbox git init başarısız");
    const commit = await git(["-c", "user.name=agentmom", "-c", "user.email=agentmom@localhost", "-c", "commit.gpgsign=false", "commit", "--allow-empty", "-q", "-m", "bos sandbox"], real, hooksDir, undefined, true);
    if (commit.code !== 0 || (await inspectSandbox(real, hooksDir)) !== "ok") throw new Error("sandbox boş commit oluşturulamadı");
  }
  repoPath = real;
  return { repoPath, worktreeRoot };
}

export function assertSandboxCapacity(deps: Pick<ModelRunnerDeps, "stateDir" | "audit">): void {
  if (sandboxWorktreeCount(deps.stateDir) >= SANDBOX_WORKTREE_LIMIT) {
    throw new ModelCapabilityError("sandbox_cleanup_needed", SANDBOX_CLEANUP_MESSAGE, 409, { worktrees: sandboxWorktreeCount(deps.stateDir), limit: SANDBOX_WORKTREE_LIMIT });
  }
}

// Birikmiş çalışma ağacı sayısı (silinmez; Yusuf temizler). Sandbox yoksa 0.
export function sandboxWorktreeCount(stateDir: string): number {
  try {
    const wt = join(stateDir, "analysis-sandbox", "wt");
    return readdirSync(wt, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith(".")).length;
  } catch {
    return 0;
  }
}

function inputChars(input: Record<string, string | string[]>): number {
  return Object.values(input).reduce<number>((n, v) => n + (Array.isArray(v) ? v.reduce((m, x) => m + x.length, 0) : v.length), 0);
}

// --- Ana giriş ---
export async function startModelCapability(deps: ModelRunnerDeps, args: { capabilityId: string; input: unknown; providerId?: string; actor: Actor }): Promise<StartedModelRun> {
  const now = deps.now ?? (() => new Date());
  const { actor } = args;
  if (actor.kind !== "user") throw new ModelCapabilityError("user_required", "model yeteneklerini yalnız kullanıcı çalıştırabilir", 403);
  if (args.capabilityId === "negotiation") {
    if (args.providerId !== undefined) throw new ModelCapabilityError("validation", "müzakerede üst düzey providerId kullanılamaz; providerA/providerB kullanın", 400);
    return startNegotiation(deps, { input: args.input, actor });
  }
  const cap = findModelCapability(args.capabilityId);
  if (!cap) throw new ModelCapabilityError("not_found", "bilinmeyen model yeteneği", 404);
  let input;
  try {
    input = validateInput(cap, args.input);
  } catch (err) {
    if (err instanceof InputInvalid) throw new ModelCapabilityError("validation", err.message, 400);
    throw err;
  }
  const urls = (Array.isArray(input.urls) ? input.urls : []) as string[];
  const netPlan = cap.needsNet && urls.length > 0 ? prepareNet(deps, args.input, urls) : undefined;

  // Veri sınırı: sınıf, sağlayıcıya gidecek KULLANICI metninden hesaplanır; secret yalnız yerel rotaya gider.
  const userText = Object.values(input).flat().join("\n");
  const dataClass = classifyData({ text: userText }, deps.contract);
  const chosen = select(deps, dataClass, args.providerId);
  if (!chosen.ok) {
    deps.audit.record({ initiator: actor, action: "capability.model.refused", decision: "deny", result: chosen.code, details: { capabilityId: cap.id, dataClass } });
    throw new ModelCapabilityError(chosen.code, chosen.reason, chosen.code === "provider_unavailable" ? 503 : 403);
  }
  const adapter = chosen.adapter;

  assertSandboxCapacity(deps);
  // Aynı anda en çok bir model yeteneği koşusu (kontrol ve kilit aynı eşzamanlı adımda).
  if (deps.state.busy) throw new ModelCapabilityError("busy", "başka bir model yeteneği koşusu sürüyor; birazdan tekrar deneyin", 429);
  deps.state.busy = true;
  let released = false;
  const release = (): void => {
    if (!released) {
      released = true;
      deps.state.busy = false;
    }
  };

  try {
    let sandbox: Sandbox;
    try {
      sandbox = await ensureAnalysisSandbox(deps.stateDir, now);
    } catch {
      throw new ModelCapabilityError("provider_unavailable", "yalıtılmış analiz sandbox'ı hazırlanamadı", 503);
    }
    // Uygulama çağrısı = kullanıcı eylemi: onay "user" tarafından verilmiş sayılır; politika yine değerlendirir (hiçbir yetenek izin veremez).
    const route = { kind: adapter.routeKind, providerId: adapter.id };
    const req: ActionRequest = { actor: { kind: actor.kind, id: actor.id }, action: "provider.call", provider: adapter.id, route, dataClass };
    const decision = evaluate({ ...req, approval: { grantedBy: "user" } }, deps.contract, now());
    if (decision.decision !== "allow") {
      deps.audit.record({ initiator: actor, action: "capability.model.refused", decision: decision.decision, result: decision.rule, details: { capabilityId: cap.id, providerId: adapter.id } });
      throw new ModelCapabilityError("refused", decision.reason, 403);
    }
    // Yalnız bu boş sandbox'ın okunmasına izin eklenir (kullanıcı verisi değildir); yasak klasörler ve diğer kurallar aynen geçerlidir.
    const runContract: AutonomyContract = { ...deps.contract, allowedDirs: [...deps.contract.allowedDirs, sandbox.repoPath] };
    // Getirmeden ÖNCE: sandbox okuma yetkisi de denetlenir (politika reddederse internete çıkılmaz ve biletler harcanmaz).
    const readable = evaluate({ actor: SYSTEM, action: "file.read", target: sandbox.repoPath }, runContract, now());
    if (readable.decision !== "allow") {
      deps.audit.record({ initiator: actor, action: "capability.model.refused", decision: readable.decision, result: readable.rule, details: { capabilityId: cap.id, providerId: adapter.id } });
      throw new ModelCapabilityError(readable.rule, readable.reason, 403);
    }
    // İnternetli yetenek: kaynaklar BU kilit altında, politika/model çağrısından ÖNCE getirilir. Getirilen metin GÜVENİLMEZ VERİDİR.
    const sourceInfos: SourceInfo[] = [];
    const promptSources: PromptSource[] = [];
    const quoteTexts = new Map<number, string>();
    if (netPlan && deps.net) {
      let budget = MAX_TOTAL_SOURCE_BYTES;
      for (const [i, url] of urls.entries()) {
        const index = i + 1;
        // Ayar HER getirmeden önce yeniden okunur: kullanıcı interneti kapatırsa kalan kaynaklar atlanır.
        const nowSettings = deps.net.settings();
        if (!nowSettings.enabled) {
          sourceInfos.push({ index, url: redactString(url), error: "net_disabled" });
          continue;
        }
        const ticket = netPlan.tickets.get(url);
        const r = await fetchPublic({
          url,
          settings: nowSettings,
          approvedBy: actor,
          purpose: cap.id,
          ...(ticket !== undefined ? { ticket } : {}),
          ...(deps.net.tickets ? { tickets: deps.net.tickets } : {}),
          db: deps.net.db,
          audit: deps.audit,
          ...(deps.net.limiter ? { limiter: deps.net.limiter } : {}),
          ...(deps.net.resolver ? { resolver: deps.net.resolver } : {}),
          ...(deps.net.transportOverride ? { transportOverride: deps.net.transportOverride } : {}),
          ...(deps.net.limits ? { limits: deps.net.limits } : {}),
          ...(deps.now ? { now: deps.now } : {}),
        });
        if (!r.ok) {
          sourceInfos.push({ index, url: redactString(url), error: r.code });
          continue;
        }
        const clipped = clipBytes(cleanSourceText(r.text), Math.max(0, Math.min(MAX_SOURCE_BYTES, budget)));
        if (clipped.text.length === 0) {
          sourceInfos.push({ index, url: redactString(url), error: "total_limit" });
          continue;
        }
        budget -= Buffer.byteLength(clipped.text);
        const truncated = r.truncated || clipped.clipped;
        sourceInfos.push({ index, url: redactString(r.url), fetchedAt: r.fetchedAt, status: r.status, contentType: r.contentType, bytes: r.bytes, sha256: r.sha256, truncated });
        promptSources.push({ index, url: r.url, fetchedAt: r.fetchedAt, text: clipped.text, truncated });
        quoteTexts.set(index, normalizeForQuote(clipped.text, true));
      }
      if (promptSources.length === 0) {
        deps.audit.record({ initiator: actor, action: "capability.model.refused", decision: "deny", result: "sources_unavailable", details: { capabilityId: cap.id, sourceCount: urls.length } });
        throw new ModelCapabilityError("sources_unavailable", "hiçbir kaynak getirilemedi; model çağrılmadı", 502, { sources: sourceInfos });
      }
    }
    const prompt = cap.promptBuilder(input, promptSources);
    const outputCtx: OutputContext = { sources: quoteTexts };

    const task = deps.tasks.create({ title: `Model yeteneği: ${cap.id} (madde ${cap.madde})`, requestedAction: "provider.call", request: req, decision: "allow" });
    deps.tasks.transition(task.id, "approved", actor);

    const timeoutMs = Math.min(deps.runTimeoutMs ?? MAX_RUN_MS, MAX_RUN_MS, deps.contract.maxRuntimeMs);
    let executionId: string | undefined;
    let started: Awaited<ReturnType<typeof startRun>>;
    try {
      started = await startRun(
        { tasks: deps.tasks, audit: deps.audit, registry: deps.registry, evidence: deps.evidence, contract: runContract, worktreeRoot: sandbox.worktreeRoot, ...(deps.now ? { now: deps.now } : {}) },
        { taskId: task.id, providerId: adapter.id, repoPath: sandbox.repoPath, prompt, timeoutMs, readOnly: true, quietAudit: true, classifyText: userText, onExecutionId: (id) => void (executionId = id) },
        actor,
      );
    } catch (err) {
      if (err instanceof RunRefused) {
        try {
          deps.tasks.transition(task.id, "cancelled", SYSTEM);
        } catch {
          // görev zaten başka bir durumda: reddin kendisi yeterli kayıt
        }
        try {
          deps.state.remember({ taskId: task.id, capabilityId: cap.id, status: "refused", providerId: adapter.id, error: { code: err.code, message: err.message } });
          deps.audit.record({ initiator: actor, action: "capability.model.finish", decision: "deny", result: "refused", details: { taskId: task.id, capabilityId: cap.id, providerId: adapter.id, code: err.code } });
        } catch {
          // kayıt hatası reddin kendisini gizlemez
        }
        throw new ModelCapabilityError(err.code, err.message, 403);
      }
      throw err;
    }
    // Koşu başladı: bundan sonra HİÇBİR kayıt hatası kilidi sızdırmaz ya da isteği düşürmez (en iyi çaba), kilit done içinde finally ile açılır.
    started.done.catch(() => undefined);
    const running: ModelRunRecord = { taskId: task.id, capabilityId: cap.id, status: "running", providerId: adapter.id };
    try {
      deps.audit.record({ initiator: actor, action: "capability.model.start", decision: "allow", result: `task ${task.id}`, details: { taskId: task.id, capabilityId: cap.id, providerId: adapter.id, routeKind: adapter.routeKind, dataClass, inputChars: inputChars(input), readOnly: true, sourceCount: sourceInfos.length } });
      deps.state.remember(running);
    } catch {
      // best-effort
    }

    // Bekçi: sağlayıcı süreye uymasa da (started.done hiç bitmese de) timeoutMs + pay sonunda koşu iptal edilir, kayıt failed/timeout olur ve kilit açılır.
    const guardMs = timeoutMs + (deps.graceMs ?? GRACE_MS);
    const done = (async (): Promise<ModelRunRecord> => {
      let rec: ModelRunRecord = { ...running, status: "failed", error: { code: "internal", message: "koşu tamamlanamadı" } };
      let outputChars = 0;
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timedOut = new Promise<"timeout">((res) => {
          timer = setTimeout(() => res("timeout"), guardMs);
        });
        const outcome = await Promise.race([started.done, timedOut]);
        if (outcome === "timeout") {
          if (executionId !== undefined) await Promise.race([adapter.cancel(executionId).catch(() => undefined), new Promise((r) => setTimeout(r, 2000).unref())]);
          rec = { ...running, status: "failed", error: { code: "timeout", message: "sağlayıcı süre sınırında yanıt vermedi; koşu iptal edildi" } };
        } else {
          // Tam yanıt (yalnız bellek) varsa o ayrıştırılır; redaksiyon AYRIŞTIRMADAN SONRA değerlere uygulanır (anahtar adları bozulmaz).
          const text = outcome.fullText ?? outcome.summary ?? "";
          outputChars = text.length;
          if (outcome.status !== "succeeded") {
            rec = { ...running, status: "failed", error: { code: outcome.errorCode ?? outcome.status, message: `sağlayıcı koşusu başarısız (${outcome.status})` } };
          } else {
            try {
              const checked = cap.validateOutput(extractJson(text), outputCtx);
              rec = { ...running, status: "done", result: { ...checked, ...(cap.needsNet ? { verifiedMeaning: VERIFIED_MEANING, sources: sourceInfos, ...(promptSources.length === 0 ? { sourceless: true, warning: SOURCELESS_WARNING } : {}) } : {}), untrusted: true } };
            } catch (err) {
              if (!(err instanceof OutputInvalid)) throw err;
              rec = { ...running, status: "failed", error: { code: "malformed_output", message: `model çıktısı şemaya uymuyor: ${err.message}` } };
            }
          }
          if (outcome.usage) rec.usage = outcome.usage;
        }
      } catch {
        rec = { ...running, status: "failed", error: { code: "internal", message: "koşu tamamlanamadı" } };
      } finally {
        if (timer) clearTimeout(timer);
      }
      try {
        try {
          deps.evidence.add(task.id, null, "capability.output", `${cap.id}: ${rec.status}`, evidenceData(cap.id, rec));
        } catch {
          // kanıt yazılamasa da sonuç kullanıcıya verilir; denetim satırı yine denenir
        }
        deps.audit.record({
          initiator: SYSTEM,
          action: "capability.model.finish",
          decision: rec.status === "done" ? "allow" : "n/a",
          result: rec.status,
          details: { taskId: task.id, capabilityId: cap.id, providerId: adapter.id, errorCode: rec.error?.code ?? null, outputChars, inputTokens: rec.usage?.inputTokens ?? null, outputTokens: rec.usage?.outputTokens ?? null },
        });
      } catch {
        // denetim hatası koşuyu düşürmez
      } finally {
        try {
          deps.state.remember(rec);
        } catch {
          // best-effort
        }
        release();
      }
      return rec;
    })();
    done.catch(() => undefined);
    return { taskId: task.id, providerId: adapter.id, done, ...(dataClass === "secret" ? { warnings: [SECRET_WARNING] } : {}) };
  } catch (err) {
    release();
    throw err;
  }
}

// Kanıt: çıktı redakte, en çok 64 KB (aşarsa sonuç atılır, bayrak konur).
// KALICI kanıt, net_fetches ilkesiyle uyumlu: kaynak başına yalnız ana bilgisayar + yol/sorgu sha256 + tarih/özet (tam URL yazılmaz). Kullanıcıya dönen yanıt (bellekteki kayıt) tam URL taşır;
// sunucu yeniden başlarsa yanıt kanıttan okunur ve yalnız host + özet içerir.
function evidenceResult(result: ModelRunRecord["result"]): ModelRunRecord["result"] {
  if (!result || !Array.isArray((result as { sources?: unknown }).sources)) return result;
  const sources = ((result as unknown as { sources: SourceInfo[] }).sources).map((s) => {
    const { url, ...rest } = s;
    let host = "-";
    let pathSha256 = "-";
    try {
      const u = new URL(url);
      host = u.host;
      pathSha256 = createHash("sha256").update(`${u.pathname}${u.search}`).digest("hex");
    } catch {
      // geçersiz biçim: yalnız özet
      pathSha256 = createHash("sha256").update(url).digest("hex");
    }
    return { ...rest, host, pathSha256 };
  });
  return { ...result, sources } as ModelRunRecord["result"];
}

export function evidenceData(capabilityId: string, rec: ModelRunRecord): unknown {
  const data = redact({ capabilityId, providerId: rec.providerId, status: rec.status, ...(rec.result ? { result: evidenceResult(rec.result) } : {}), ...(rec.error ? { error: rec.error } : {}), ...(rec.usage ? { usage: rec.usage } : {}) });
  if (Buffer.byteLength(JSON.stringify(data)) <= MAX_EVIDENCE_BYTES) return data;
  const { result: dropped, ...rest } = data as Record<string, unknown>;
  const sources = (dropped as { sources?: unknown } | undefined)?.sources;
  const keep = dropped as { outcome?: unknown; providers?: unknown } | undefined;
  return { ...rest, ...(sources !== undefined ? { sources } : {}), ...(keep?.outcome !== undefined ? { outcome: keep.outcome, providers: keep.providers } : {}), truncated: true };
}

// Koşu durumu: süreç içi kayıt; yeniden başlatmadan sonra yalnız "capability.output" kanıtından (done/failed).
export function getModelRun(deps: Pick<ModelRunnerDeps, "tasks" | "evidence" | "state">, taskId: string): ModelRunRecord | undefined {
  const mem = deps.state.runs.get(taskId);
  if (mem) return mem;
  if (!deps.tasks.get(taskId)) return undefined;
  const rows = deps.evidence.list(taskId).filter((e) => e.kind === "capability.output");
  const last = rows[rows.length - 1];
  if (!last) return undefined;
  const d = last.data as { capabilityId?: string; providerId?: string; providerA?: string; providerB?: string; status?: ModelRunStatus; result?: ModelRunRecord["result"]; error?: ModelRunRecord["error"]; usage?: ModelRunRecord["usage"] };
  const label = typeof d.providerId === "string" ? d.providerId : typeof d.providerA === "string" && typeof d.providerB === "string" ? `${d.providerA}+${d.providerB}` : undefined;
  if (typeof d.capabilityId !== "string" || label === undefined || (d.status !== "done" && d.status !== "failed")) return undefined;
  return { taskId, capabilityId: d.capabilityId, providerId: label, ...(typeof d.providerA === "string" ? { providerA: d.providerA } : {}), ...(typeof d.providerB === "string" ? { providerB: d.providerB } : {}), status: d.status, ...(d.result ? { result: d.result } : {}), ...(d.error ? { error: d.error } : {}), ...(d.usage ? { usage: d.usage } : {}) };
}
