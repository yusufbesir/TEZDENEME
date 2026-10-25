import { createServer } from "node:http";
import { join, resolve } from "node:path";
import { readFileSync, statSync } from "node:fs";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { AuditLog, listAudit, verifyAuditChain } from "../core/audit/audit.ts";
import { ACTION_SEMANTICS, semanticsFor } from "../core/policy/action-semantics.ts";
import { assessTaskRequest } from "../core/policy/risk.ts";
import type { Task } from "../core/tasks/tasks.ts";
import { IndicatorService } from "./indicators.ts";
import { monitorReport } from "./monitor.ts";
import { AuthRegistry } from "../core/auth/auth.ts";
import type { AgentMomConfig } from "../core/config/config.ts";
import type { Db } from "../core/db/db.ts";
import { checkHealth } from "../core/health/health.ts";
import { canon, evaluate, hasUnexpandedShortName, isInside, isInsideReal } from "../core/policy/engine.ts";
import { ACTION_TYPES } from "../core/policy/types.ts";
import type { ActionRequest, ActionType, Actor, Route, RouteKind } from "../core/policy/types.ts";
import { TaskError, TaskStore } from "../core/tasks/tasks.ts";
import type { TaskState } from "../core/tasks/tasks.ts";
import { compileProjectMemory } from "../memory/compile.ts";
import { exportRecords } from "../memory/export.ts";
import { extractImplicit } from "../memory/implicit.ts";
import { progressiveRetrieve } from "../memory/retrieval.ts";
import type { RetrievalStage } from "../memory/retrieval.ts";
import { MEMORY_KINDS, MemoryError, MemoryStore } from "../memory/store.ts";
import type { MemoryInput, MemoryKind } from "../memory/store.ts";
import { Calibration, DecisionLedger, ReasoningError } from "../reasoning/reasoning.ts";
import { genealogyForest, genealogyOf } from "../reasoning/genealogy.ts";
import { analyzeHypotheses } from "../reasoning/hypotheses.ts";
import { evaluateVoi } from "../reasoning/voi.ts";
import { learningReturn } from "../reasoning/learning.ts";
import { compileArgument } from "../reasoning/argument.ts";
import { suggestResolutions } from "../memory/resolver.ts";
import { halfLifeMap } from "../memory/halflife.ts";
import { MAX_BUDGET, MIN_BUDGET, planAttention } from "../core/attention.ts";
import { AutomationEngine, AutomationError, ANALYSES, MAX_SCHEDULE_RULES } from "../automation/automation.ts";
import { buildAnalysisRunner } from "../automation/analysis-summaries.ts";
import { ChangeLedger, ChangeLedgerError } from "../core/audit/change-ledger.ts";
import { GrantError, GrantStore, evaluateWithGrants } from "../core/policy/grants.ts";
import { sharedTickets } from "../net/approval.ts";
import { MAX_DOMAINS, MAX_DOMAIN_LENGTH } from "../net/guard.ts";
import { HOW_TO_ENABLE, NetError, NetSettingsStore } from "../net/settings.ts";
import { CONNECT_TIMEOUT_MS, FetchLimiter, MAX_BODY_BYTES as NET_MAX_BODY, MAX_CONCURRENT as NET_MAX_CONCURRENT, MAX_PER_MINUTE as NET_MAX_PER_MINUTE, MAX_REDIRECTS as NET_MAX_REDIRECTS, TOTAL_TIMEOUT_MS, fetchPublic } from "../net/web-fetch.ts";
import type { Resolver, TransportOverride } from "../net/web-fetch.ts";
import { MAX_TEXT_BYTES as NET_MAX_TEXT } from "../net/html-text.ts";
import type { AssumptionStatus } from "../reasoning/reasoning.ts";
import { serveUi } from "./ui.ts";
import { SubsessionError, SubsessionStore, UUID_RE } from "./subsessions.ts";
import { contextFor, usageReport } from "./usage.ts";
import { PROVIDER_ID_RE, TEST_MIN_INTERVAL_MS, providerDetail, runConnectionTest } from "./providers-api.ts";
import { loadAbsenceInputs, analyzeAbsence } from "../analysis/absence.ts";
import { isBrokerCapability, isBrokerRole, brokerRequest } from "../analysis/broker.ts";
import type { BrokerRole } from "../analysis/broker.ts";
import { BUSY, exclusiveScan } from "../analysis/lock.ts";
import { buildContinuity } from "../analysis/continuity.ts";
import { buildExitPlan } from "../analysis/exit-plan.ts";
import { collectObservations, expertiseReport, buildExpertise, roleObservations } from "../analysis/expertise.ts";
import { analyzeImpact, loadImportGraph, summarizeGraph, validateFileParam } from "../analysis/impact.ts";
import { buildOfflinePlan } from "../analysis/offline.ts";
import { collectUsageRecords, computeShadowPrices } from "../analysis/shadow-price.ts";
import { analyzeRelease, validateRef } from "../analysis/release-impact.ts";
import { providerSnapshots } from "../analysis/snapshot.ts";
import { DEFAULT_DAYS, switchingReport } from "../analysis/switching.ts";
import { buildTechDebt } from "../analysis/tech-debt.ts";
import { ModelCapabilityError, ModelRunnerState, SANDBOX_WORKTREE_LIMIT, SECRET_WARNING, getModelRun, listModelCapabilities, sandboxWorktreeCount, startModelCapability } from "../capabilities/model-runner.ts";
import type { ModelRunnerDeps } from "../capabilities/model-runner.ts";
import { MODEL_CAPABILITY_ID } from "../capabilities/model/registry.ts";
import { SkillError, SkillLifecycle } from "../skills/lifecycle.ts";
import type { Gate, RiskClass, Verdict as SkillVerdict } from "../skills/lifecycle.ts";
import { EvidenceStore } from "../orchestrator/evidence.ts";
import { RunRefused, startRun } from "../orchestrator/run-task.ts";
import { canonicalPath } from "../orchestrator/steps.ts";
import type { RunOutcome } from "../orchestrator/run-task.ts";
import { createHmac } from "node:crypto";
import { isSecretRef } from "../core/secrets/secrets.ts";
import { EntryTickets } from "./desktop-entry.ts";
import { ProviderRegistry } from "../providers/registry.ts";
import { BaselineError, approveBaseline } from "../verify/baselines.ts";
import { isBaselineName } from "../verify/scenario.ts";
import { DataProfileError, profileFile } from "../verify/labs/data-profile.ts";
import { LabSpecError, isLabKind, runLab } from "../verify/labs/index.ts";
import { WorkflowEngine } from "../workflows/engine.ts";
import type { WorkflowOutcome } from "../workflows/engine.ts";
import { WorkflowStore } from "../workflows/store.ts";
import { ValidationError, validateContract, validateDefinition } from "../workflows/types.ts";

export interface AppDeps {
  db: Db;
  dbPath: string;
  config: AgentMomConfig;
  audit: AuditLog;
  auth: AuthRegistry;
  registry: ProviderRegistry;
  engine: WorkflowEngine;
  workflows: WorkflowStore;
  worktreeRoot: string;
  // Model yetenekleri (D8c-1): yalıtılmış analiz sandbox'ı <stateDir>/analysis-sandbox altında kurulur. Yoksa model yetenek uçları 503 döner.
  stateDir?: string;
  // Test kancası: model yeteneği koşu süresini kısaltır (en çok 5 dk). Gerçek sunucu geçmez.
  modelRunTimeoutMs?: number;
  // Test kancası: arka plandaki model yeteneği koşusunu bekletmek için.
  onModelRun?: (done: Promise<unknown>) => void;
  // Doğrulama kanıt kökü (görsel regresyon tabanları <kök>/baselines/<görev> altında tutulur). Yoksa taban onay ucu 503 döner.
  evidenceRoot?: string;
  now?: () => Date;
  // Receives background runs so tests can await them; the real server ignores it.
  onRun?: (done: Promise<RunOutcome>) => void;
  onWorkflow?: (done: Promise<WorkflowOutcome>) => void;
  // Desktop shell: asks the process to shut down gracefully (close server, close database). Absent in tests.
  onQuit?: () => void;
  // Sır DEPOSUNUN yalnız referans adları (secret:ad). Değer okuyan yol YOKTUR. Yoksa uç 503 döner.
  secretRefs?: () => string[];
  // Kullanım-tabanlı denetimli yedek (Faz 11): durum ve elle yedek. Yoksa uçlar 503 döner.
  // Olay tetiklemeli otomasyon (D5b): main.ts motoru denetim sink'i olarak bağlar. Yoksa createApp kendi motorunu kurar (olay almaz; API çalışır).
  automation?: AutomationEngine;
  // İnternet erişimi katmanı (D8c-2a): YALNIZ testler için çözümleyici/aktarım/sınır enjeksiyonu. main.ts üretimde vermez (aktarım geçersiz kılma üretimde zaten reddedilir).
  net?: { resolver?: Resolver; transportOverride?: TransportOverride; limiter?: FetchLimiter; limits?: { totalMs?: number; connectMs?: number } };
  backup?: { status(): unknown; manual(): Promise<{ action: string; code: string; reason: string; ok?: boolean; verifyOk?: boolean; dir?: string } | null> };
}

const MAX_BODY = 64 * 1024;
const REPO_ROOT = resolve(import.meta.dirname, "..", "..");
const HELP_DOCS: Record<string, string> = {
  egitim: "docs/egitim/masaustu-ajan-uygulamalari.md",
  harita: "docs/egitim/claude-masaustu-arayuz-haritasi.md",
  "el-kitabi": "docs/isletim-el-kitabi.md",
  guvenlik: "docs/guvenlik-sinirlari.md",
  "claude-code": "docs/integrations/claude-code.md",
  codex: "docs/integrations/codex.md",
  gemini: "docs/integrations/gemini.md",
  yetenekler: "docs/status/100-yetenek-kontrol-listesi.md",
};
// The 100-capability status file (Faz 11 D3): fixed path, read at request time, size-capped. Nothing in the request builds the path.
const CAPABILITIES_FILE = "docs/status/100-yetenek-durum.json";
const CAPABILITIES_MAX = 1024 * 1024;
const ROUTE_KINDS: readonly string[] = ["subscription", "api_paid", "local"];

class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function send(res: ServerResponse, status: number, body: unknown): void {
  const text = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "content-length": Buffer.byteLength(text) });
  res.end(text);
}

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new HttpError(413, "request body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new HttpError(400, "body is not valid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function isObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function expectKeys(obj: Record<string, unknown>, allowed: string[], where: string): void {
  for (const k of Object.keys(obj)) if (!allowed.includes(k)) throw new HttpError(400, `${where}: unknown field ${k}`);
}

function parseRoute(v: unknown, where: string): Route {
  if (!isObject(v)) throw new HttpError(400, `${where} must be an object`);
  expectKeys(v, ["kind", "providerId"], where);
  if (typeof v.kind !== "string" || !ROUTE_KINDS.includes(v.kind)) throw new HttpError(400, `${where}.kind is invalid`);
  if (typeof v.providerId !== "string" || v.providerId.length === 0 || v.providerId.length > 100) throw new HttpError(400, `${where}.providerId is invalid`);
  return { kind: v.kind as RouteKind, providerId: v.providerId };
}

function optString(v: unknown, name: string, max: number): string | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "string" || v.length === 0 || v.length > max) throw new HttpError(400, `${name} must be a string of 1..${max} characters`);
  return v;
}

function optNumber(v: unknown, name: string): number | undefined {
  if (v === undefined) return undefined;
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) throw new HttpError(400, `${name} must be a non-negative number`);
  return v;
}

// The actor comes from the authenticated token, never from the body: nothing in the body can raise the actor or carry an approval.
export function parseTaskBody(body: unknown, actor: Actor): { title: string; description?: string; request: ActionRequest } {
  if (!isObject(body)) throw new HttpError(400, "body must be an object");
  expectKeys(body, ["title", "description", "request"], "body");
  const title = optString(body.title, "title", 200);
  if (!title) throw new HttpError(400, "title is required");
  const description = optString(body.description, "description", 2000);
  const r = body.request;
  if (!isObject(r)) throw new HttpError(400, "request is required");
  expectKeys(r, ["action", "target", "provider", "route", "previousRoute", "costUsd", "durationMs"], "request");
  if (typeof r.action !== "string" || !(ACTION_TYPES as readonly string[]).includes(r.action)) throw new HttpError(400, "request.action is invalid");
  const request: ActionRequest = { actor: { ...actor }, action: r.action as ActionType };
  const target = optString(r.target, "request.target", 1000);
  if (target !== undefined) request.target = target;
  const provider = optString(r.provider, "request.provider", 100);
  if (provider !== undefined) request.provider = provider;
  if (r.route !== undefined) request.route = parseRoute(r.route, "request.route");
  if (r.previousRoute !== undefined) request.previousRoute = parseRoute(r.previousRoute, "request.previousRoute");
  const costUsd = optNumber(r.costUsd, "request.costUsd");
  if (costUsd !== undefined) request.costUsd = costUsd;
  const durationMs = optNumber(r.durationMs, "request.durationMs");
  if (durationMs !== undefined) request.durationMs = durationMs;
  const out: { title: string; description?: string; request: ActionRequest } = { title, request };
  if (description !== undefined) out.description = description;
  return out;
}

// D7 okuma uçları için (yazan: Claude [İP:AgentMom Faz 11]): bilinmeyen ya da yinelenen sorgu parametresi 400. Parametre adı yanıta yazılmaz.
const SCOPE_PARAM = /^[A-Za-z0-9][A-Za-z0-9_.:\- ]{0,79}$/;
function onlyParams(url: URL, allowed: readonly string[]): void {
  const seen = new Set<string>();
  for (const k of url.searchParams.keys()) {
    if (!allowed.includes(k) || seen.has(k)) throw new HttpError(400, "bilinmeyen ya da yinelenen sorgu parametresi");
    seen.add(k);
  }
}
function scopeParam(url: URL): string | undefined {
  const v = url.searchParams.get("scope");
  if (v === null) return undefined;
  if (!SCOPE_PARAM.test(v)) throw new HttpError(400, "scope kısa bir ad olmalı (harf, rakam, - _ . : ve boşluk; en çok 80 karakter)");
  return v;
}
function intParam(url: URL, name: string, min: number, max: number): number | undefined {
  const v = url.searchParams.get(name);
  if (v === null) return undefined;
  if (!/^\d{1,6}$/.test(v) || Number(v) < min || Number(v) > max) throw new HttpError(400, `${name} ${min}..${max} arasında bir tam sayı olmalı`);
  return Number(v);
}

const BUSY_BODY = { error: "başka bir analiz taraması sürüyor; birazdan tekrar deneyin", code: "busy" };

// D8b: tarama beklenmedik biçimde başarısız olursa iç ayrıntı verilmeden 503.
function analysisUnavailable(): never {
  throw new HttpError(503, "analiz şu an yapılamadı");
}

// Blocks DNS-rebinding and cross-site browser calls: only requests addressed to this loopback port are served.
function checkOrigin(req: IncomingMessage): void {
  const port = req.socket.localPort;
  const allowedHosts = [`127.0.0.1:${port}`, `localhost:${port}`];
  if (!req.headers.host || !allowedHosts.includes(req.headers.host)) throw new HttpError(403, "host not allowed");
  const origin = req.headers.origin;
  if (origin !== undefined && !allowedHosts.some((h) => origin === `http://${h}`)) throw new HttpError(403, "origin not allowed");
}

export function createApp(deps: AppDeps): Server {
  const now = deps.now ?? (() => new Date());
  const tasks = new TaskStore(deps.db, now);
  // Doğrulama laboratuvarı ucu: aynı anda en çok bir koşu.
  let labRunning = false;
  // Model yeteneği çalıştırıcısı durumu (D8c-1): tek koşu kilidi ve son koşular.
  const modelState = new ModelRunnerState();

  const evidence = new EvidenceStore(deps.db, now);
  const memory = new MemoryStore(deps.db, now);
  const skills = new SkillLifecycle(deps.db, deps.audit, now);
  const decisions = new DecisionLedger(deps.db, { audit: deps.audit, memory, now });
  const calibration = new Calibration(deps.db, { audit: deps.audit, now });
  const grants = new GrantStore(deps.db, { audit: deps.audit, now });
  const changes = new ChangeLedger(deps.db, { now });
  const netSettings = new NetSettingsStore(deps.db, { audit: deps.audit, now });
  const netLimiter = deps.net?.limiter ?? new FetchLimiter();
  const automation = deps.automation ?? new AutomationEngine(deps.db, { now });
  // Otomasyonun "görev kaydı aç" eylemi normal görev yolunu izler: politika motoru karar verir, otomasyon izin veremez (onay gerekiyorsa onay bekler).
  // Otomasyon geçici izin TÜKETEMEZ: düz evaluate kullanılır (izin kullanıcının gözetiminde yapılan işler içindir).
  automation.setTaskCreator((title, request) => {
    const decision = evaluate(request, contract, now());
    const task = tasks.create({ title, requestedAction: request.action, request, decision: decision.decision });
    const next: TaskState = decision.decision === "allow" ? "approved" : decision.decision === "deny" ? "denied" : "awaiting_approval";
    const saved = tasks.transition(task.id, next, request.actor);
    deps.audit.record({ initiator: request.actor, action: `task.create:${request.action}`, decision: decision.decision, result: `task ${saved.id} ${saved.state}`, details: { taskId: saved.id, rule: decision.rule, reason: decision.reason, request } });
  });
  // Zaman tetikleyicisi (ADR-016): zamanlanan analizler yalnız mevcut SALT-OKUNUR hesaplardır (aynı uç mantığı); model/ağ/dosya yazımı yoktur.
  automation.setAnalysisRunner(buildAnalysisRunner({
    attention: () => {
      const totalAwaiting = tasks.countByState("awaiting_approval");
      const awaiting = totalAwaiting <= 5000 ? tasks.listByState("awaiting_approval", 5000) : [...tasks.listByState("awaiting_approval", 2500, "oldest"), ...tasks.listByState("awaiting_approval", 2500, "newest")];
      const uniq = [...new Map(awaiting.map((t) => [t.id, t])).values()];
      return planAttention(uniq, contract, { now: now(), totalAwaiting, truncated: totalAwaiting > uniq.length });
    },
    halflife: () => halfLifeMap({ store: memory, now }),
    learning: () => learningReturn({ db: deps.db, now }),
    absence: async () => {
      const providers = providerSnapshots(deps.db, deps.registry, contract, now());
      const report = await exclusiveScan(async () => analyzeAbsence(await loadAbsenceInputs(REPO_ROOT, providers)));
      if (report === BUSY) throw new Error("başka bir analiz taraması sürüyor");
      return report;
    },
    continuity: () => buildContinuity(providerSnapshots(deps.db, deps.registry, contract, now())),
    offline: () => buildOfflinePlan(providerSnapshots(deps.db, deps.registry, contract, now())),
    shadowPrice: () => {
      const at = now();
      const used = collectUsageRecords(deps.db, at);
      return computeShadowPrices({ providers: deps.registry.list().map((p) => p.id), usage: used.records, truncated: used.truncated, calls: collectObservations(deps.db).observations, now: at });
    },
  }));
  const contract = deps.config.policy.defaultContract;
  const entryTickets = new EntryTickets();
  let lastManualBackupAt = 0;
  const lastProviderTestAt = new Map<string, number>();
  // Durum göstergeleri: salt okunur, 5 sn bellek önbellekli (bkz. indicators.ts).
  const indicators = new IndicatorService({ db: deps.db, registry: deps.registry, tasks, contract, now });
  const subsessions = new SubsessionStore(deps.db, { now, providerAvailable: (id) => deps.registry.get(id) !== undefined });

  function authenticate(req: IncomingMessage): Actor {
    const actor = deps.auth.authenticate(req.headers.authorization);
    if (!actor) throw new HttpError(401, "missing or invalid session token");
    return actor;
  }

  function requireUser(actor: Actor): void {
    if (actor.kind !== "user") throw new HttpError(403, "only the user can do this");
  }

  // D5a (yazan: Claude [İP:AgentMom D5a]): görev nesnesine EK alanlar; yalnız hesaplanır, veritabanına yazılmaz, mevcut alanlar değişmez.
  // Risk yalnız bilgidir: sunucu buna göre ek kural uygulamaz, karar kullanıcıdadır.
  function withRisk(task: Task): Task & { risk: ReturnType<typeof assessTaskRequest>; semantics: ReturnType<typeof semanticsFor> } {
    return { ...task, risk: assessTaskRequest(task.requestedAction, task.request, contract), semantics: semanticsFor(task.requestedAction) };
  }

  // D8c-1: model yeteneği çalıştırıcısının bağımlılıkları; stateDir yoksa uçlar dürüstçe 503 döner.
  function modelDeps(): ModelRunnerDeps {
    if (!deps.stateDir) throw new HttpError(503, "model yetenekleri yapılandırılmamış (durum klasörü yok)");
    return { tasks, audit: deps.audit, registry: deps.registry, evidence, contract, stateDir: deps.stateDir, snapshots: () => providerSnapshots(deps.db, deps.registry, contract, now()), state: modelState, net: { settings: () => netSettings.get(), db: deps.db, tickets: sharedTickets, limiter: netLimiter, ...(deps.net?.resolver ? { resolver: deps.net.resolver } : {}), ...(deps.net?.transportOverride ? { transportOverride: deps.net.transportOverride } : {}), ...(deps.net?.limits ? { limits: deps.net.limits } : {}) }, ...(deps.modelRunTimeoutMs !== undefined ? { runTimeoutMs: deps.modelRunTimeoutMs } : {}), now };
  }

  function requireJson(req: IncomingMessage): void {
    if (!(req.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) throw new HttpError(415, "content-type must be application/json");
  }

  async function route(req: IncomingMessage, res: ServerResponse): Promise<void> {
    checkOrigin(req);
    const url = new URL(req.url ?? "/", "http://localhost");
    const method = req.method ?? "GET";

    if (method === "GET" && url.pathname === "/health") {
      const report = checkHealth({ dbPath: deps.dbPath });
      return send(res, report.status === "green" ? 200 : 503, report);
    }
    // Desktop window entry (Faz 11): the launcher puts a ONE-TIME ticket on the command line, never the session token. The ticket is exchanged here for a
    // redirect to the panel with the token in the URL fragment (fragments are not sent to servers and the panel removes it from the address bar at once).
    // Proves to the launcher that the listener on this port really holds the session token (HMAC over the launcher's nonce), BEFORE the launcher sends
    // the token anywhere: a process squatting on the port cannot forge it. The nonce is chosen by the caller, the key is never revealed.
    if (method === "GET" && url.pathname === "/desktop/proof") {
      const n = url.searchParams.get("n") ?? "";
      if (!/^[A-Za-z0-9_-]{16,64}$/.test(n)) throw new HttpError(400, "nonce must be 16-64 url-safe characters");
      return send(res, 200, { proof: createHmac("sha256", deps.auth.userToken).update(`agentmom-desktop-proof:${n}`).digest("hex") });
    }
    if (method === "GET" && url.pathname === "/desktop/enter") {
      const site = req.headers["sec-fetch-site"];
      if (site !== undefined && site !== "none") throw new HttpError(403, "the entry ticket works only for a direct window start, not from another page");
      if (!entryTickets.redeem(url.searchParams.get("t"))) throw new HttpError(403, "entry ticket invalid, used or expired");
      res.writeHead(302, { location: `/#token=${deps.auth.userToken}`, "cache-control": "no-store", "referrer-policy": "no-referrer", "content-length": 0 });
      return void res.end();
    }
    // The panel files carry no data and no secret; everything the panel shows still needs the bearer token on /api/.
    if (serveUi(method, url.pathname, res)) return;
    if (!url.pathname.startsWith("/api/")) throw new HttpError(404, "not found");
    const actor = authenticate(req);

    // Agent tokens may only create tasks; everything that reads state (tasks, audit, providers, evidence) is user-only.
    // In-app Help documents (Faz 11): a FIXED list of repository documents, read at request time, size-capped, user token required (no path is built from the request).
    const hm = /^\/api\/help\/([a-z-]{1,24})$/.exec(url.pathname);
    if (method === "GET" && hm) {
      requireUser(actor);
      const rel = Object.hasOwn(HELP_DOCS, hm[1] as string) ? HELP_DOCS[hm[1] as string] : undefined;
      if (!rel) throw new HttpError(404, "unknown help document");
      try {
        const text = readFileSync(join(REPO_ROOT, rel), "utf8");
        return send(res, 200, { name: hm[1], text: text.length > 400_000 ? text.slice(0, 400_000) : text, truncated: text.length > 400_000 });
      } catch {
        throw new HttpError(404, "help document not available");
      }
    }
    // Read-only policy summary for the Settings window (no secrets; changing policy is never possible from here).
    if (method === "GET" && url.pathname === "/api/policy") {
      requireUser(actor);
      const c = contract;
      return send(res, 200, { policy: { contractId: c.id, allowedActions: c.allowedActions, approvalRequiredActions: c.approvalRequiredActions, allowedDirs: c.allowedDirs, forbiddenDirs: c.forbiddenDirs, trustedRepos: c.trustedRepos, allowedProviders: c.allowedProviders ?? [], paidRoute: c.paidRoute ?? "none", maxRuntimeMs: c.maxRuntimeMs } });
    }
    if (method === "POST" && url.pathname === "/api/desktop/ticket") {
      requireUser(actor);
      return send(res, 200, { ticket: entryTickets.issue(), expiresInSeconds: 30 });
    }
    if (method === "GET" && url.pathname === "/api/secrets/refs") {
      requireUser(actor);
      if (!deps.secretRefs) throw new HttpError(503, "secret store listing is not configured");
      let refs: string[];
      try {
        refs = deps.secretRefs().filter((r) => isSecretRef(r)).slice(0, 200);
      } catch {
        throw new HttpError(503, "the secret store could not be listed");
      }
      return send(res, 200, { refs, count: refs.length, note: "reference names only; values are never read or shown" });
    }
    if (method === "GET" && url.pathname === "/api/backup/status") {
      requireUser(actor);
      if (!deps.backup) throw new HttpError(503, "backup scheduler is not configured");
      return send(res, 200, { backup: deps.backup.status() });
    }
    if (method === "POST" && url.pathname === "/api/backup/run") {
      requireUser(actor);
      requireJson(req);
      const bk = await readBody(req);
      if (!isObject(bk)) throw new HttpError(400, "body must be an object");
      expectKeys(bk, [], "body");
      if (!deps.backup) throw new HttpError(503, "backup scheduler is not configured");
      // Art arda elle yedek istekleri sınırlanır (her yedek tam veritabanı kopyasıdır).
      const nowMs = Date.now();
      if (nowMs - lastManualBackupAt < 15_000) throw new HttpError(429, "a backup was just requested; wait a few seconds");
      lastManualBackupAt = nowMs;
      const d = await deps.backup.manual();
      return send(res, 200, { decision: d, ok: d?.ok === true, verifyOk: d?.verifyOk === true, busy: d === null, backup: deps.backup.status() });
    }
    if (method === "POST" && url.pathname === "/api/desktop/quit") {
      requireUser(actor);
      send(res, 200, { quitting: Boolean(deps.onQuit) });
      if (deps.onQuit) setTimeout(deps.onQuit, 100).unref();
      return;
    }
    if (method === "GET") requireUser(actor);
    if (method === "GET" && url.pathname === "/api/tasks") return send(res, 200, { tasks: tasks.list().map(withRisk) });
    // D5a (yazan: Claude [İP:AgentMom D5a]): eylem anlamları/geri alma haritası, denetim zinciri doğrulaması ve canlı izleme. Hepsi salt okunur ve
    // yalnız kullanıcı (yukarıdaki GET kuralı: ajan belirteci 403, belirteçsiz 401).
    if (method === "GET" && url.pathname === "/api/actions/semantics") return send(res, 200, { actions: ACTION_SEMANTICS });
    if (method === "GET" && url.pathname === "/api/audit/verify") return send(res, 200, verifyAuditChain(deps.db, now));
    if (method === "GET" && url.pathname === "/api/monitor") return send(res, 200, monitorReport(deps.db, now(), contract));
    // Durum göstergeleri (bağlam %, kota %, bekleyen onay, takılma şüphesi): salt okunur GET, yalnız kullanıcı; session isteğe bağlı uuid (alt oturum ya da görev kimliği).
    if (method === "GET" && url.pathname === "/api/status/indicators") {
      onlyParams(url, ["session"]);
      const session = url.searchParams.get("session");
      if (session !== null && !UUID_RE.test(session)) throw new HttpError(400, "session must be a uuid");
      return send(res, 200, indicators.get(session));
    }
    if (method === "GET" && url.pathname === "/api/audit") {
      const limit = Number(url.searchParams.get("limit") ?? "100");
      return send(res, 200, { events: listAudit(deps.db, Number.isFinite(limit) ? limit : 100) });
    }
    if (method === "GET" && url.pathname === "/api/providers") return send(res, 200, { providers: deps.registry.list() });

    // Provider detail and controls (Faz 11 D3; yazan: Claude [İP:AgentMom Faz 11 D3]). Reading is user-only (GET rule above); test/disable/enable are
    // user-only too (agent token 403). Disabling is fail-closed (see ProviderRegistry); the test is the adapter's LOCAL testConnection, no model call.
    const prm = /^\/api\/providers\/([^/]+)(?:\/(test|disable|enable))?$/.exec(url.pathname);
    if (prm && (method === "GET" || method === "POST")) {
      const pid = prm[1] as string;
      const verb = prm[2];
      if (method === "GET" && verb) throw new HttpError(404, "not found or method not allowed");
      if (method === "POST" && !verb) throw new HttpError(404, "not found or method not allowed");
      if (method === "POST") {
        requireUser(actor);
        requireJson(req);
        const body = await readBody(req);
        if (!isObject(body)) throw new HttpError(400, "body must be an object");
        expectKeys(body, [], "body");
      }
      if (!PROVIDER_ID_RE.test(pid)) throw new HttpError(400, "provider id must match ^[a-z0-9-]{1,40}$");
      if (!providerDetail(deps.db, deps.registry, contract, pid, undefined, now())) throw new HttpError(404, "unknown provider");
      if (verb === "disable" || verb === "enable") {
        const disabled = verb === "disable";
        const r = deps.registry.setDisabled(pid, disabled, `${actor.kind}:${actor.id}`);
        deps.audit.record({ initiator: actor, action: `provider.${verb}`, decision: "allow", result: `provider ${pid} ${disabled ? "disabled" : "enabled"}${r.changed ? "" : " (unchanged)"}`, details: { providerId: pid, disabled, changed: r.changed, changedBy: `${actor.kind}:${actor.id}` } });
      } else if (verb === "test") {
        if (deps.registry.isDisabled(pid)) throw new HttpError(409, "provider is disabled; enable it before testing");
        if (!deps.registry.get(pid)) throw new HttpError(409, "provider has no adapter in this build");
        const nowMs = Date.now();
        if (nowMs - (lastProviderTestAt.get(pid) ?? 0) < TEST_MIN_INTERVAL_MS) throw new HttpError(429, "a test was just run for this provider; wait a few seconds");
        lastProviderTestAt.set(pid, nowMs);
        const outcome = await runConnectionTest({ registry: deps.registry, audit: deps.audit, now }, pid, actor);
        return send(res, 200, { test: outcome, provider: providerDetail(deps.db, deps.registry, contract, pid, undefined, now()) });
      }
      return send(res, 200, { provider: providerDetail(deps.db, deps.registry, contract, pid, undefined, now()) });
    }
    // Lists for the D3 pages (read-only, user-only by the GET rule above).
    if (method === "GET" && url.pathname === "/api/workflows") return send(res, 200, { workflows: deps.workflows.list(100) });
    if (method === "GET" && url.pathname === "/api/verification/runs") {
      const raw = url.searchParams.get("limit") ?? "50";
      if (!/^\d{1,3}$/.test(raw) || Number(raw) < 1 || Number(raw) > 200) throw new HttpError(400, "limit must be an integer 1..200");
      return send(res, 200, { runs: deps.workflows.listVerificationRuns(Number(raw)) });
    }
    if (method === "GET" && url.pathname === "/api/capabilities") {
      const file = join(REPO_ROOT, CAPABILITIES_FILE);
      let size: number;
      try {
        size = statSync(file).size;
      } catch {
        throw new HttpError(404, "capability status file not available");
      }
      if (size > CAPABILITIES_MAX) throw new HttpError(503, "capability status file is too large");
      let parsed: unknown;
      try {
        parsed = JSON.parse(readFileSync(file, "utf8"));
      } catch {
        throw new HttpError(503, "capability status file is not valid JSON");
      }
      if (!isObject(parsed)) throw new HttpError(503, "capability status file has an unexpected shape");
      return send(res, 200, parsed);
    }

    // Sub-sessions and usage (Faz 11). Reading is user-only (GET rule above); every write is user-only too (an agent token gets 403). The name is user
    // data, the model is system data fixed at creation; nothing is deleted (archive flag). Usage is read from stored records only, unknown = null.
    if (method === "GET" && url.pathname === "/api/subsessions") return send(res, 200, { subsessions: subsessions.list() });
    if (method === "GET" && url.pathname === "/api/usage") return send(res, 200, usageReport(deps.db, now));
    if (method === "GET" && url.pathname === "/api/usage/context") {
      const topic = url.searchParams.get("topic") ?? "";
      if (!UUID_RE.test(topic)) throw new HttpError(400, "topic must be a uuid");
      const ctx = contextFor(deps.db, topic);
      if (!ctx) throw new HttpError(404, "topic not found");
      return send(res, 200, ctx);
    }
    // D8b (yazan: Claude [İP:AgentMom Faz 11]): sistem analitiği. Hepsi SALT OKUNUR GET, modelsiz ve ağsız; hiçbir şey yazmaz, denetim kaydı yazmaz. Kullanıcı belirteci gerekir
    // (GET kuralı). Bilinmeyen sorgu parametresi 400; hata iletileri iç ayrıntı içermez. Depo taramaları (impact, graph, absence) süre bütçelidir (G/Ç 2 sn + çözümleme 2 sn; aşılırsa kısmi sonuç + truncated),
    // dosyalar arasında setImmediate ile olay döngüsünü bırakır ve aynı anda en çok BİR tarama çalışır (meşgulse 429 busy). Tek dosyadaki senkron blok, dosya başına 300 KB ve iç içelik sınırıyla kısıtlıdır.
    if (method === "GET" && url.pathname === "/api/analysis/impact") {
      onlyParams(url, ["file", "depth"]);
      const file = url.searchParams.get("file");
      if (file === null) throw new HttpError(400, "file gerekli (src/ altında göreli dosya yolu)");
      const bad = validateFileParam(file);
      if (bad) throw new HttpError(400, bad);
      const depth = intParam(url, "depth", 1, 6) ?? 3;
      const loaded = await exclusiveScan(() => loadImportGraph(REPO_ROOT)).catch(() => analysisUnavailable());
      if (loaded === BUSY) return send(res, 429, BUSY_BODY);
      const impact = analyzeImpact(loaded.graph, file, depth);
      if (!impact) throw new HttpError(404, "dosya bulunamadı");
      return send(res, 200, { impact });
    }
    if (method === "GET" && url.pathname === "/api/analysis/graph") {
      onlyParams(url, []);
      const loaded = await exclusiveScan(() => loadImportGraph(REPO_ROOT)).catch(() => analysisUnavailable());
      if (loaded === BUSY) return send(res, 429, BUSY_BODY);
      return send(res, 200, { graph: summarizeGraph(loaded.graph, loaded.scan) });
    }
    if (method === "GET" && url.pathname === "/api/analysis/continuity") {
      onlyParams(url, []);
      return send(res, 200, { continuity: buildContinuity(providerSnapshots(deps.db, deps.registry, contract, now())) });
    }
    if (method === "GET" && url.pathname === "/api/analysis/exit") {
      onlyParams(url, ["provider"]);
      const pid = url.searchParams.get("provider");
      if (pid === null || !PROVIDER_ID_RE.test(pid)) throw new HttpError(400, "provider ^[a-z0-9-]{1,40}$ biçiminde olmalı");
      const plan = buildExitPlan(providerSnapshots(deps.db, deps.registry, contract, now()), pid);
      if (!plan) throw new HttpError(404, "bilinmeyen sağlayıcı");
      return send(res, 200, { exit: plan });
    }
    if (method === "GET" && url.pathname === "/api/analysis/broker") {
      onlyParams(url, ["capability", "role"]);
      const capability = url.searchParams.get("capability");
      if (capability === null || !isBrokerCapability(capability)) throw new HttpError(400, "capability geçerli bir sağlayıcı işlemi olmalı");
      const roleRaw = url.searchParams.get("role");
      if (roleRaw !== null && !isBrokerRole(roleRaw)) throw new HttpError(400, "role plan, implement, review ya da verify olmalı");
      const role: BrokerRole | null = roleRaw as BrokerRole | null;
      const stats = role ? roleObservations(buildExpertise(collectObservations(deps.db)), role) : undefined;
      return send(res, 200, { broker: brokerRequest(providerSnapshots(deps.db, deps.registry, contract, now()), capability, role, stats) });
    }
    // Model yetenekleri (D8c-1, ADR-016): uygulama içi model (abonelik/yerel rota; ücretli rota kapalı), salt-okunur boş sandbox, çıktı şemaya göre doğrulanır ve
    // her zaman untrusted:true döner. YALNIZ kullanıcı (ajan 403, belirteçsiz 401). Girdi/çıktı metni denetim kaydına yazılmaz.
    if (method === "GET" && url.pathname === "/api/capabilities/model") {
      requireUser(actor);
      onlyParams(url, []);
      const md = modelDeps();
      return send(res, 200, { capabilities: listModelCapabilities(md), warnings: [SECRET_WARNING], sandbox: { worktrees: sandboxWorktreeCount(md.stateDir), limit: SANDBOX_WORKTREE_LIMIT } });
    }
    const mrm = /^\/api\/capabilities\/model\/runs\/([0-9a-f-]{36})$/.exec(url.pathname);
    if (method === "GET" && mrm) {
      requireUser(actor);
      onlyParams(url, []);
      const rec = getModelRun(modelDeps(), mrm[1] as string);
      if (!rec) throw new HttpError(404, "model yeteneği koşusu bulunamadı");
      return send(res, 200, { taskId: rec.taskId, capabilityId: rec.capabilityId, status: rec.status, providerId: rec.providerId, ...(rec.providerA ? { providerA: rec.providerA, providerB: rec.providerB } : {}), ...(rec.result ? { result: rec.result } : {}), ...(rec.error ? { error: rec.error } : {}), ...(rec.usage ? { usage: rec.usage } : {}) });
    }
    const mcm = /^\/api\/capabilities\/model\/([a-z][a-z-]{1,30})\/run$/.exec(url.pathname);
    if (method === "POST" && mcm) {
      requireUser(actor);
      requireJson(req);
      const body = await readBody(req);
      if (!isObject(body)) throw new HttpError(400, "body must be an object");
      expectKeys(body, ["input", "providerId"], "body");
      if (body.input === undefined) throw new HttpError(400, "input is required");
      const providerId = optString(body.providerId, "providerId", 100);
      if (providerId !== undefined && !PROVIDER_ID_RE.test(providerId)) throw new HttpError(400, "providerId ^[a-z0-9-]{1,40}$ biçiminde olmalı");
      if (!MODEL_CAPABILITY_ID.test(mcm[1] as string)) throw new HttpError(404, "bilinmeyen model yeteneği");
      const started = await startModelCapability(modelDeps(), { capabilityId: mcm[1] as string, input: body.input, ...(providerId !== undefined ? { providerId } : {}), actor });
      deps.onModelRun?.(started.done);
      return send(res, 202, { taskId: started.taskId, providerId: started.providerId, ...(started.providerA ? { providerA: started.providerA, providerB: started.providerB } : {}), ...(started.warnings ? { warnings: started.warnings } : {}) });
    }
    if (method === "GET" && url.pathname === "/api/analysis/offline") {
      onlyParams(url, []);
      return send(res, 200, { offline: buildOfflinePlan(providerSnapshots(deps.db, deps.registry, contract, now())) });
    }
    if (method === "GET" && url.pathname === "/api/analysis/expertise") {
      onlyParams(url, []);
      return send(res, 200, { expertise: expertiseReport(deps.db) });
    }
    if (method === "GET" && url.pathname === "/api/analysis/shadow-price") {
      onlyParams(url, []);
      const at = now();
      const used = collectUsageRecords(deps.db, at);
      return send(res, 200, { shadowPrice: computeShadowPrices({ providers: deps.registry.list().map((p) => p.id), usage: used.records, truncated: used.truncated, calls: collectObservations(deps.db).observations, now: at }) });
    }
    // D8c-3b: bağlam değiştirme ölçümü (madde 71). KISMİ gösterge, yalnız ölçüm (öneri yok); son 5000 denetim satırı, salt okunur.
    if (method === "GET" && url.pathname === "/api/analysis/switching") {
      onlyParams(url, ["days"]);
      return send(res, 200, { switching: switchingReport(deps.db, now(), intParam(url, "days", 1, 30) ?? DEFAULT_DAYS) });
    }
    if (method === "GET" && url.pathname === "/api/analysis/absence") {
      onlyParams(url, []);
      const providers = providerSnapshots(deps.db, deps.registry, contract, now());
      const report = await exclusiveScan(async () => analyzeAbsence(await loadAbsenceInputs(REPO_ROOT, providers))).catch(() => analysisUnavailable());
      if (report === BUSY) return send(res, 429, BUSY_BODY);
      return send(res, 200, { absence: report });
    }
    // Madde 33 (teknik borç merkezi): yerel sinyallerin SAYILARI ve örnekleri (dosya:satır); puan/öncelik yok, güncel paket sürümü için ağ kontrolü yok ("bilinmiyor").
    if (method === "GET" && url.pathname === "/api/analysis/tech-debt") {
      onlyParams(url, []);
      const report = await exclusiveScan(() => buildTechDebt(REPO_ROOT)).catch(() => analysisUnavailable());
      if (report === BUSY) return send(res, 429, BUSY_BODY);
      return send(res, 200, { techDebt: report });
    }
    // Madde 29 (sürüm etki analizi): iki git başvurusu arasındaki değişiklikler; yalnız okur (rev-parse + diff --name-status), başvurular katı doğrulanır, from/to zorunlu (tahmin yok).
    // git hata verirse 200 + status "unreadable" (dürüst okunamadı); başvuru biçimi hatası 400.
    if (method === "GET" && url.pathname === "/api/analysis/release-impact") {
      onlyParams(url, ["from", "to"]);
      const from = url.searchParams.get("from");
      const to = url.searchParams.get("to");
      if (from === null || to === null) throw new HttpError(400, "from ve to gerekli (git başvurusu: branch, etiket ya da sha)");
      const badFrom = validateRef(from);
      if (badFrom) throw new HttpError(400, `from: ${badFrom}`);
      const badTo = validateRef(to);
      if (badTo) throw new HttpError(400, `to: ${badTo}`);
      const report = await exclusiveScan(() => analyzeRelease(REPO_ROOT, from, to)).catch(() => analysisUnavailable());
      if (report === BUSY) return send(res, 429, BUSY_BODY);
      return send(res, 200, { releaseImpact: report });
    }
    // Madde 25 (veri analizi laboratuvarı): kullanıcının verdiği yerel dosyanın PROFİLİ (CSV/TSV/JSON dizi/NDJSON, en çok 8 MB). Yol politika denetiminden geçer (allowedDirs/trustedRepos, yasak/sır yolu reddi),
    // dosya safe-read ile okunur; çıktıda ham veri YOK (yalnız toplulaştırılmış sayılar). Salt okunur GET: kayıt/denetim satırı yazmaz.
    if (method === "GET" && url.pathname === "/api/analysis/data-profile") {
      onlyParams(url, ["path"]);
      const target = url.searchParams.get("path");
      if (target === null) throw new HttpError(400, "path gerekli (izinli klasördeki bir veri dosyasının mutlak yolu)");
      let profile: Awaited<ReturnType<typeof profileFile>> | typeof BUSY;
      try {
        profile = await exclusiveScan(() => profileFile(target, contract));
      } catch (err) {
        if (!(err instanceof DataProfileError)) return analysisUnavailable();
        const status = err.code === "secret_path" || err.code === "outside_policy" ? 403 : err.code === "missing" ? 404 : err.code === "too_large" ? 413 : 400;
        throw new HttpError(status, err.message);
      }
      if (profile === BUSY) return send(res, 429, BUSY_BODY);
      return send(res, 200, { dataProfile: profile });
    }
    const ssm = /^\/api\/subsessions\/([^/]+)\/(rename|pin|archive)$/.exec(url.pathname);
    if (method === "POST" && (url.pathname === "/api/subsessions" || ssm)) {
      requireUser(actor);
      requireJson(req);
      const body = await readBody(req);
      if (!isObject(body)) throw new HttpError(400, "body must be an object");
      if (!ssm) {
        expectKeys(body, ["provider", "roleHint", "name", "taskId"], "body");
        const created = subsessions.create(body);
        deps.audit.record({ initiator: actor, action: "subsession.create", decision: "allow", result: `subsession ${created.id}`, details: { id: created.id, name: created.name, provider: created.provider, model: created.model, modelSource: created.modelSource, taskId: created.taskId } });
        return send(res, 201, { subsession: created });
      }
      const sid = ssm[1] as string;
      if (!UUID_RE.test(sid)) throw new HttpError(400, "id must be a uuid");
      const verb = ssm[2] as string;
      if (verb === "rename") {
        expectKeys(body, ["name"], "body");
        const r = subsessions.rename(sid, body.name);
        deps.audit.record({ initiator: actor, action: "subsession.rename", decision: "allow", result: r.changed ? `subsession ${sid} renamed` : `subsession ${sid} unchanged`, details: { id: sid, oldName: r.oldName, newName: r.newName, changed: r.changed } });
        return send(res, 200, { subsession: r.subsession });
      }
      if (verb === "pin") {
        expectKeys(body, ["pinned"], "body");
        const s = subsessions.pin(sid, body.pinned);
        deps.audit.record({ initiator: actor, action: "subsession.pin", decision: "allow", result: `subsession ${sid} pinned=${s.pinned}`, details: { id: sid, pinned: s.pinned } });
        return send(res, 200, { subsession: s });
      }
      expectKeys(body, ["archived"], "body");
      const s = subsessions.archive(sid, body.archived);
      deps.audit.record({ initiator: actor, action: "subsession.archive", decision: "allow", result: `subsession ${sid} archived=${s.archived}`, details: { id: sid, archived: s.archived } });
      return send(res, 200, { subsession: s });
    }

    // Operational memory (Faz 5b). Reading and writing are user-only: an agent proposes a candidate through a task, a person records it.
    if (method === "GET" && url.pathname === "/api/memory/search") {
      const q = url.searchParams.get("q") ?? "";
      const scope = url.searchParams.get("scope") ?? undefined;
      const kind = url.searchParams.get("kind");
      if (kind !== null && !(MEMORY_KINDS as readonly string[]).includes(kind)) throw new HttpError(400, "kind is invalid");
      const limit = Number(url.searchParams.get("limit") ?? "20");
      return send(res, 200, { hits: memory.search(q, { ...(scope !== undefined ? { scope } : {}), ...(kind !== null ? { kinds: [kind as MemoryKind] } : {}), includeInactive: url.searchParams.get("inactive") === "1", limit: Number.isFinite(limit) ? limit : 20 }) });
    }
    if (method === "GET" && url.pathname === "/api/memory/flags") return send(res, 200, { contradictions: memory.openContradictions() });
    // D7 (yazan: Claude [İP:AgentMom Faz 11]): aşamalı getirme (44), proje hafızası derleyicisi (90), örtük bilgi önerileri (87). Hepsi YALNIZ okur ve yanıt döndürür;
    // hiçbiri hafızaya ya da dosyaya yazmaz (kaydetmek: POST /api/memory, dosyaya yazmak: POST /api/memory/export). Kullanıcı belirteci gerekir (GET kuralı).
    if (method === "GET" && url.pathname === "/api/memory/context") {
      onlyParams(url, ["q", "stage", "budget", "scope"]);
      const q = url.searchParams.get("q") ?? "";
      if (q.trim().length === 0 || q.length > 200) throw new HttpError(400, "q 1..200 karakterlik bir metin olmalı");
      const stage = intParam(url, "stage", 1, 3);
      const budget = intParam(url, "budget", 200, 20_000);
      const scope = scopeParam(url);
      return send(res, 200, progressiveRetrieve(memory, q, { ...(scope !== undefined ? { scope } : {}), ...(stage !== undefined ? { stage: stage as RetrievalStage } : {}), ...(budget !== undefined ? { budgetChars: budget } : {}) }));
    }
    if (method === "GET" && url.pathname === "/api/memory/compile") {
      onlyParams(url, ["scope", "maxChars"]);
      const scope = scopeParam(url);
      const maxChars = intParam(url, "maxChars", 2000, 60_000);
      return send(res, 200, compileProjectMemory({ store: memory, ledger: decisions, now }, { ...(scope !== undefined ? { scope } : {}), ...(maxChars !== undefined ? { maxChars } : {}) }));
    }
    if (method === "GET" && url.pathname === "/api/memory/implicit") {
      onlyParams(url, []);
      return send(res, 200, extractImplicit({ db: deps.db, memory, ledger: decisions, now }));
    }
    // D8a (yazan: Claude [İP:AgentMom Faz 11]): çelişki çözüm önerisi (64) ve bilgi yarı ömrü haritası (66). YALNIZ hesaplar/önerir: hiçbir kaydı emekli etmez,
    // hiçbir bayrağı çözmez, denetim kaydı yazmaz. Kullanıcı belirteci gerekir (GET kuralı).
    if (method === "GET" && url.pathname === "/api/memory/contradictions/resolutions") {
      onlyParams(url, []);
      return send(res, 200, suggestResolutions({ store: memory, now, decisionExists: (id) => deps.db.prepare("SELECT 1 AS x FROM decisions WHERE id = ?").get(id) !== undefined }));
    }
    if (method === "GET" && url.pathname === "/api/memory/halflife") {
      onlyParams(url, []);
      return send(res, 200, halfLifeMap({ store: memory, now }));
    }
    // D8a: dikkat bütçesi (93), öğrenme getirisi (97). Salt okunur sıralama/hesap.
    if (method === "GET" && url.pathname === "/api/attention") {
      onlyParams(url, ["budget"]);
      const budget = intParam(url, "budget", MIN_BUDGET, MAX_BUDGET);
      // Yalnız onay bekleyenler çekilir (ajanın ucuz görev yağmuruyla eski bir kritik görevi pencereden düşürmesi önlenir). 5000'i aşarsa en yeni ve en eski 2500'er görev alınır ve truncated bildirilir.
      const totalAwaiting = tasks.countByState("awaiting_approval");
      const awaiting = totalAwaiting <= 5000 ? tasks.listByState("awaiting_approval", 5000) : [...tasks.listByState("awaiting_approval", 2500, "oldest"), ...tasks.listByState("awaiting_approval", 2500, "newest")];
      const uniq = [...new Map(awaiting.map((t) => [t.id, t])).values()];
      return send(res, 200, planAttention(uniq, contract, { ...(budget !== undefined ? { budget } : {}), now: now(), totalAwaiting, truncated: totalAwaiting > uniq.length }));
    }
    if (method === "GET" && url.pathname === "/api/reasoning/learning") {
      onlyParams(url, []);
      return send(res, 200, learningReturn({ db: deps.db, now }));
    }
    // D8a: durumsuz hesaplama uçları (rakip hipotezler 62, bilgi değeri 63). KAYIT YOK, denetim kaydı YOK; yalnız kullanıcı.
    if (method === "POST" && (url.pathname === "/api/reasoning/hypotheses" || url.pathname === "/api/reasoning/voi")) {
      requireUser(actor);
      requireJson(req);
      const body = await readBody(req);
      if (!isObject(body)) throw new HttpError(400, "body must be an object");
      if (url.pathname === "/api/reasoning/hypotheses") {
        expectKeys(body, ["hypotheses", "evidence", "mode"], "body");
        return send(res, 200, { analysis: analyzeHypotheses(body) });
      }
      expectKeys(body, ["states", "options", "tests"], "body");
      return send(res, 200, { voi: evaluateVoi(body) });
    }
    if (method === "POST" && url.pathname === "/api/memory") {
      requireUser(actor);
      requireJson(req);
      const body = await readBody(req);
      if (!isObject(body)) throw new HttpError(400, "body must be an object");
      expectKeys(body, ["kind", "title", "body", "source", "scope", "confidence", "subject", "sourceRef", "observedAt", "validUntil", "supersedesId"], "body");
      const out = memory.add(body as unknown as MemoryInput);
      deps.audit.record({ initiator: actor, action: "memory.add", decision: "allow", result: `memory ${out.record.id}${out.duplicate ? " (duplicate)" : ""}`, details: { id: out.record.id, kind: out.record.kind, scope: out.record.scope, contradictions: out.contradictions, redacted: out.record.redacted } });
      return send(res, out.duplicate ? 200 : 201, { ...out, flags: memory.flagsFor(out.record) });
    }
    if (method === "POST" && url.pathname === "/api/memory/export") {
      requireUser(actor);
      requireJson(req);
      const body = await readBody(req);
      if (!isObject(body)) throw new HttpError(400, "body must be an object");
      expectKeys(body, ["dir", "ids", "scope", "label"], "body");
      const dir = optString(body.dir, "dir", 1000);
      if (!dir) throw new HttpError(400, "dir is required");
      const scope = optString(body.scope, "scope", 80);
      const label = optString(body.label, "label", 100);
      let ids: string[];
      if (body.ids !== undefined) {
        if (!Array.isArray(body.ids) || body.ids.length === 0 || body.ids.length > 200 || body.ids.some((i) => typeof i !== "string")) throw new HttpError(400, "ids must be 1..200 record ids");
        ids = body.ids as string[];
      } else {
        ids = memory.list({ ...(scope !== undefined ? { scope } : {}), limit: 200 }).filter((r) => r.status === "active" && r.exportedPath === null).map((r) => r.id);
      }
      // The export is a file write: the same policy gate as any other write applies, with the user's explicit approval for this call.
      const gate = (target: string): void => {
        const d = evaluate({ actor, action: "file.write", target, approval: { grantedBy: "user" } }, contract, now());
        if (d.decision !== "allow") throw new MemoryError("forbidden_dir", `policy refused the export directory: ${d.rule}: ${d.reason}`);
      };
      const out = exportRecords(memory, ids, dir, { gate, ...(label !== undefined ? { label } : {}), now });
      deps.audit.record({ initiator: actor, action: "memory.export", decision: "allow", result: `${out.written.length} written, ${out.skipped.length} skipped`, details: { dir, written: out.written.map((w) => w.id), skipped: out.skipped.map((w) => w.id) } });
      return send(res, 200, out);
    }

    // Skill lifecycle (Faz 5c): records and gates only, nothing is installed or run. All routes are user-only; an agent proposes through a task.
    if (method === "GET" && url.pathname === "/api/skills") return send(res, 200, { skills: skills.list() });
    const sm = /^\/api\/skills\/([0-9a-f-]{36})(?:\/(gate|advance|release|reject|revoke))?$/.exec(url.pathname);
    if (method === "GET" && sm && !sm[2]) {
      const sid = sm[1] as string;
      return send(res, 200, { skill: skills.get(sid), gates: skills.gateRecords(sid), versions: skills.versions(sid), events: skills.events(sid), missing: skills.missing(sid) });
    }
    if (method === "POST" && url.pathname === "/api/skills") {
      requireUser(actor);
      requireJson(req);
      const body = await readBody(req);
      if (!isObject(body)) throw new HttpError(400, "body must be an object");
      expectKeys(body, ["name", "origin", "description", "riskClass", "artifactSha256"], "body");
      return send(res, 201, { skill: skills.propose(body as { name: string; origin: string; description: string; riskClass: RiskClass; artifactSha256: string }, actor) });
    }
    if (method === "POST" && sm && sm[2]) {
      requireUser(actor);
      const sid = sm[1] as string;
      const verb = sm[2];
      if (verb === "advance") return send(res, 200, { skill: skills.advance(sid, actor) });
      requireJson(req);
      const body = await readBody(req);
      if (!isObject(body)) throw new HttpError(400, "body must be an object");
      if (verb === "gate") {
        expectKeys(body, ["gate", "verdict", "reviewer", "artifactSha256", "summary"], "body");
        return send(res, 201, { record: skills.addGateRecord(sid, body as { gate: Gate; verdict: SkillVerdict; reviewer: string; artifactSha256: string; summary: string }, actor) });
      }
      expectKeys(body, ["note"], "body");
      const note = typeof body.note === "string" ? body.note : "";
      if (verb === "release") return send(res, 200, { skill: skills.release(sid, actor, note || null) });
      if (verb === "reject") return send(res, 200, { skill: skills.reject(sid, actor, note) });
      return send(res, 200, { skill: skills.revoke(sid, actor, note) });
    }

    // Reasoning ledgers (Faz 7): decisions with expiry and assumptions, assumption debt, confidence calibration. User-only; records and arithmetic only.
    if (method === "GET" && url.pathname === "/api/decisions") return send(res, 200, { decisions: decisions.list({ onlyActive: url.searchParams.get("all") !== "1" }) });
    // D7 (yazan: Claude [İP:AgentMom Faz 11]): karar soy ağacı (89), salt okunur.
    if (method === "GET" && url.pathname === "/api/decisions/genealogy") {
      onlyParams(url, []);
      return send(res, 200, genealogyForest({ db: deps.db, ledger: decisions, now }));
    }
    const argm = /^\/api\/decisions\/([0-9a-f-]{36})\/argument$/.exec(url.pathname);
    if (method === "GET" && argm) {
      onlyParams(url, []);
      return send(res, 200, { argument: compileArgument({ db: deps.db, ledger: decisions, store: memory, now }, argm[1] as string) });
    }
    const gnm = /^\/api\/decisions\/([0-9a-f-]{36})\/genealogy$/.exec(url.pathname);
    if (method === "GET" && gnm) {
      onlyParams(url, []);
      return send(res, 200, { genealogy: genealogyOf({ db: deps.db, ledger: decisions, now }, gnm[1] as string) });
    }
    if (method === "GET" && url.pathname === "/api/assumption-debt") return send(res, 200, { debt: decisions.debt() });
    if (method === "GET" && url.pathname === "/api/calibration") return send(res, 200, { report: calibration.report(url.searchParams.get("source") ?? undefined) });
    const dm2 = /^\/api\/decisions\/([0-9a-f-]{36})(?:\/(retire))?$/.exec(url.pathname);
    if (method === "GET" && dm2 && !dm2[2]) return send(res, 200, { decision: decisions.get(dm2[1] as string) });
    const am = /^\/api\/assumptions\/([0-9a-f-]{36})$/.exec(url.pathname);
    if (method === "GET" && am) return send(res, 200, { events: decisions.assumptionEvents(am[1] as string) });
    const pm = /^\/api\/predictions\/([0-9a-f-]{36})\/resolve$/.exec(url.pathname);
    if (method === "POST" && (url.pathname === "/api/decisions" || url.pathname === "/api/predictions" || (dm2 && dm2[2]) || am || pm)) {
      requireUser(actor);
      requireJson(req);
      const body = await readBody(req);
      if (!isObject(body)) throw new HttpError(400, "body must be an object");
      if (url.pathname === "/api/decisions") {
        expectKeys(body, ["title", "rationale", "scope", "expiresAt", "assumptions", "supersedesId"], "body");
        return send(res, 201, { decision: decisions.record(body as unknown as Parameters<DecisionLedger["record"]>[0], actor) });
      }
      if (dm2 && dm2[2] === "retire") {
        expectKeys(body, [], "body");
        return send(res, 200, { decision: decisions.retire(dm2[1] as string, actor) });
      }
      if (am) {
        expectKeys(body, ["status", "evidence"], "body");
        return send(res, 200, { assumption: decisions.setAssumption(am[1] as string, body.status as AssumptionStatus, body.evidence as string, actor) });
      }
      if (url.pathname === "/api/predictions") {
        expectKeys(body, ["source", "claim", "confidence", "dueAt"], "body");
        return send(res, 201, { prediction: calibration.record(body as unknown as Parameters<Calibration["record"]>[0], actor) });
      }
      if (pm) {
        expectKeys(body, ["outcome", "evidence"], "body");
        return send(res, 200, { prediction: calibration.resolve(pm[1] as string, body.outcome as boolean, body.evidence as string, actor) });
      }
    }
    // D5b (yazan: Claude [İP:AgentMom Faz 11]): geçici yetenek izinleri (77), değişiklik defteri (78), olay tetiklemeli otomasyon (13). Hepsi YALNIZ kullanıcıdır.
    if (method === "GET" && url.pathname === "/api/grants") return send(res, 200, { grants: grants.list(), maxTtlMinutes: 1440, maxUses: 100, grantableActions: ["file.read", "file.write", "verification.run"] });
    if (method === "GET" && url.pathname === "/api/changes") return send(res, 200, { changes: changes.list({ ...(url.searchParams.get("kind") ? { kind: url.searchParams.get("kind") as string } : {}), ...(url.searchParams.get("taskId") ? { taskId: url.searchParams.get("taskId") as string } : {}) }) });
    if (method === "GET" && url.pathname === "/api/automation") {
      const at = now();
      return send(res, 200, { rules: automation.listRules().map((r) => automation.ruleView(r, at)), runs: automation.listRuns(), safeActions: ["notify", "record_task"], scheduleActions: ["notify", "record_task", "run_analysis"], analyses: ANALYSES, maxRunsPerHour: 30, maxScheduleRules: MAX_SCHEDULE_RULES });
    }
    if (method === "POST" && (url.pathname === "/api/grants" || url.pathname === "/api/changes" || url.pathname === "/api/automation/rules")) {
      requireUser(actor);
      requireJson(req);
      const body = await readBody(req);
      if (!isObject(body)) throw new HttpError(400, "body must be an object");
      if (url.pathname === "/api/grants") {
        expectKeys(body, ["action", "scopeDir", "reason", "ttlMinutes", "maxUses"], "body");
        const g = grants.create(body as unknown as Parameters<GrantStore["create"]>[0], actor, contract);
        changes.record({ kind: "grant", summary: `Geçici izin verildi: ${g.action}`, reason: g.reason, files: [g.scopeDir] }, actor);
        return send(res, 201, { grant: g });
      }
      if (url.pathname === "/api/changes") {
        expectKeys(body, ["kind", "summary", "reason", "taskId", "files"], "body");
        return send(res, 201, { change: changes.record({ ...(body as unknown as Parameters<ChangeLedger["record"]>[0]), kind: typeof body.kind === "string" ? body.kind : "manual" }, actor) });
      }
      expectKeys(body, ["name", "eventPattern", "trigger", "actionKind", "params", "cooldownSeconds"], "body");
      const rule = automation.createRule(body as unknown as Parameters<AutomationEngine["createRule"]>[0], actor);
      const when = rule.schedule ? `zamanlı ${JSON.stringify(rule.schedule)}` : rule.eventPattern;
      deps.audit.record({ initiator: actor, action: "automation.rule_create", decision: "allow", result: `rule ${rule.id}`, details: { ruleId: rule.id, eventPattern: rule.eventPattern, triggerKind: rule.triggerKind, ...(rule.schedule ? { schedule: rule.schedule } : {}), actionKind: rule.actionKind } });
      changes.record({ kind: "automation", summary: `Otomasyon kuralı eklendi: ${rule.name}`, reason: `${when} -> ${rule.actionKind}` }, actor);
      return send(res, 201, { rule: automation.ruleView(rule, now()) });
    }
    {
      const gm = /^\/api\/grants\/([0-9a-f-]{36})\/revoke$/.exec(url.pathname);
      const am = /^\/api\/automation\/rules\/([0-9a-f-]{36})\/(enable|disable)$/.exec(url.pathname);
      const rn = /^\/api\/automation\/rules\/([0-9a-f-]{36})\/run-now$/.exec(url.pathname);
      if (method === "POST" && rn) {
        requireUser(actor);
        requireJson(req);
        const body = await readBody(req);
        if (!isObject(body)) throw new HttpError(400, "body must be an object");
        expectKeys(body, [], "body");
        const { run, skippedReason } = await automation.runNow(rn[1] as string, actor, now());
        deps.audit.record({ initiator: actor, action: "automation.rule_run_now", decision: "allow", result: `rule ${rn[1]} ${run.outcome}`, details: { ruleId: rn[1], outcome: run.outcome } });
        changes.record({ kind: "automation", summary: `Otomasyon kuralı elle çalıştırıldı (${run.outcome})`, reason: "Kullanıcı denemesi" }, actor);
        return send(res, 200, { run, ...(skippedReason ? { skippedReason } : {}) });
      }
      if (method === "POST" && gm) {
        requireUser(actor);
        const g = grants.revoke(gm[1] as string, actor);
        changes.record({ kind: "grant", summary: `Geçici izin iptal edildi: ${g.action}`, reason: "Kullanıcı iptal etti", files: [g.scopeDir] }, actor);
        return send(res, 200, { grant: g });
      }
      if (method === "POST" && am) {
        requireUser(actor);
        const rule = automation.setEnabled(am[1] as string, am[2] === "enable", actor);
        deps.audit.record({ initiator: actor, action: `automation.rule_${am[2]}`, decision: "allow", result: `rule ${rule.id}`, details: { ruleId: rule.id } });
        changes.record({ kind: "automation", summary: `Otomasyon kuralı ${rule.enabled ? "açıldı" : "kapatıldı"}: ${rule.name}`, reason: "Kullanıcı kararı" }, actor);
        return send(res, 200, { rule });
      }
    }
    // D8c-2a (yazan: Claude [İP:AgentMom Faz 11]): İNTERNET ERİŞİMİ KATMANI. Varsayılan KAPALI; ayarı yalnız kullanıcı değiştirir; getirme yalnız kullanıcı belirteciyle,
    // izinli alan adı listesiyle ve onayla (approve:true) yapılır. Ajan belirteci 403. Ayrıntı: src/net/web-fetch.ts, ADR-016.
    if (method === "GET" && url.pathname === "/api/net/settings") {
      return send(res, 200, { settings: netSettings.get(), howToEnable: HOW_TO_ENABLE, limits: { maxDomains: MAX_DOMAINS, maxDomainLength: MAX_DOMAIN_LENGTH, maxConcurrent: NET_MAX_CONCURRENT, maxPerMinute: NET_MAX_PER_MINUTE, maxBodyBytes: NET_MAX_BODY, maxTextBytes: NET_MAX_TEXT, totalTimeoutMs: TOTAL_TIMEOUT_MS, connectTimeoutMs: CONNECT_TIMEOUT_MS, maxRedirects: NET_MAX_REDIRECTS } });
    }
    if (method === "GET" && url.pathname === "/api/net/fetches") {
      const rows = deps.db.prepare("SELECT id, ts, host, path_sha256, final_host, status, content_type, bytes, sha256, outcome, approved_by, purpose FROM net_fetches ORDER BY ts DESC, rowid DESC LIMIT 100").all() as unknown as Array<Record<string, string | number | null>>;
      return send(res, 200, { fetches: rows.map((r) => ({ id: r.id, ts: r.ts, host: r.host, pathSha256: r.path_sha256, finalHost: r.final_host, status: r.status, contentType: r.content_type, bytes: r.bytes, sha256: r.sha256, outcome: r.outcome, approvedBy: r.approved_by, purpose: r.purpose })) });
    }
    if (method === "POST" && url.pathname === "/api/net/settings") {
      requireUser(actor);
      requireJson(req);
      const body = await readBody(req);
      if (!isObject(body)) throw new HttpError(400, "body must be an object");
      expectKeys(body, ["enabled", "allowedDomains", "perUseApproval"], "body");
      return send(res, 200, { settings: netSettings.set({ enabled: body.enabled, allowedDomains: body.allowedDomains, perUseApproval: body.perUseApproval }, actor) });
    }
    // Onay bileti: YALNIZ kullanıcı ister; sunucu URL'yi doğrular ve 2 dk geçerli, tek kullanımlık, o URL'ye bağlı bir bilet verir (perUseApproval açıkken getirme bunu ister).
    if (method === "POST" && url.pathname === "/api/net/approve") {
      requireUser(actor);
      requireJson(req);
      const body = await readBody(req);
      if (!isObject(body)) throw new HttpError(400, "body must be an object");
      expectKeys(body, ["url"], "body");
      if (typeof body.url !== "string" || body.url.length === 0 || body.url.length > 2000) throw new HttpError(400, "url 1..2000 karakterli bir metin olmalı");
      const issued = sharedTickets.issue(body.url, netSettings.get());
      if ("ok" in issued) return send(res, issued.code === "net_disabled" || issued.code === "host_not_allowed" ? 403 : 400, { error: issued.message, code: issued.code, ...(issued.code === "net_disabled" ? { howToEnable: HOW_TO_ENABLE } : {}) });
      deps.audit.record({ initiator: actor, action: "net.approve", decision: "allow", result: "approval ticket issued", details: { ttlSeconds: 120 } });
      return send(res, 200, issued);
    }
    if (method === "POST" && url.pathname === "/api/net/fetch") {
      requireUser(actor);
      requireJson(req);
      const body = await readBody(req);
      if (!isObject(body)) throw new HttpError(400, "body must be an object");
      expectKeys(body, ["url", "ticket", "purpose"], "body");
      if (typeof body.url !== "string" || body.url.length === 0 || body.url.length > 2000) throw new HttpError(400, "url 1..2000 karakterli bir metin olmalı");
      if (body.ticket !== undefined && (typeof body.ticket !== "string" || body.ticket.length > 200)) throw new HttpError(400, "ticket geçersiz");
      const purpose = optString(body.purpose, "purpose", 200) ?? "kullanıcı isteği";
      const r = await fetchPublic({
        url: body.url,
        settings: netSettings.get(),
        approvedBy: actor,
        purpose,
        ...(typeof body.ticket === "string" ? { ticket: body.ticket } : {}),
        tickets: sharedTickets,
        db: deps.db,
        audit: deps.audit,
        limiter: netLimiter,
        now,
        ...(deps.net?.resolver ? { resolver: deps.net.resolver } : {}),
        ...(deps.net?.transportOverride ? { transportOverride: deps.net.transportOverride } : {}),
        ...(deps.net?.limits ? { limits: deps.net.limits } : {}),
      });
      if (r.ok) return send(res, 200, r);
      const forbidden = ["net_disabled", "host_not_allowed", "user_required", "approval_required", "private_address", "redirect_needs_approval", "bad_config"];
      const badRequest = ["invalid_url", "url_too_long", "scheme_not_allowed", "credentials_in_url", "ip_literal", "port_not_allowed", "secret_in_url"];
      const status = forbidden.includes(r.code) ? 403 : badRequest.includes(r.code) ? 400 : r.code === "rate_limited" ? 429 : r.code === "timeout" ? 504 : r.code === "unsupported_content" ? 415 : r.code === "audit_failed" ? 500 : 502;
      return send(res, status, { error: r.message, code: r.code, ...(r.code === "net_disabled" ? { howToEnable: HOW_TO_ENABLE } : {}), ...(r.status !== undefined ? { upstreamStatus: r.status } : {}), ...(r.redirectTo !== undefined ? { redirectTo: r.redirectTo } : {}) });
    }
    // Doğrulama laboratuvarı (D6a): yerel, deterministik, modelsiz sağlayıcılar (api / contracts / state). YALNIZ kullanıcı (ajan belirteci 403).
    // Denetim ayrıntısında "ok" anahtarı kullanılır: "passed" anahtarı sır maskeleyicisinin (pass*) kuralına takılıp [REDACTED] olur.
    // Sonuç KAYDEDİLMEZ: bir göreve bağlı değildir (görev bağı yok); yalnız yanıt olarak döner ve denetim kaydına sayılar yazılır (sır ya da gövde yazılmaz).
    if (method === "POST" && url.pathname === "/api/verification/labs") {
      requireUser(actor);
      requireJson(req);
      const body = await readBody(req);
      if (!isObject(body)) throw new HttpError(400, "body must be an object");
      expectKeys(body, ["kind", "spec"], "body");
      // Denetim ayrıntısına yalnız bilinen tür adı yazılır (kullanıcı metni ya da spec içeriği yazılmaz).
      const auditKind = isLabKind(body.kind) ? body.kind : "unknown";
      const refuse = (result: string): void => {
        deps.audit.record({ initiator: actor, action: "verification.lab", decision: "deny", result, details: { kind: auditKind } });
      };
      if (typeof body.kind !== "string") {
        refuse("invalid_spec");
        throw new LabSpecError("kind is required");
      }
      // a11y ve design laboratuvarları diskten okur: kök yalnız izinli klasörlerde (allowedDirs) ve yasak klasörlerin (forbiddenDirs) dışında olabilir (ihlal: 400 invalid_spec + denetim satırı).
      if ((body.kind === "a11y" || body.kind === "design") && isObject(body.spec) && typeof body.spec.root === "string") {
        const root = body.spec.root;
        const real = canon(root);
        const inAllowed = contract.allowedDirs.some((dir) => isInside(dir, root) && isInsideReal(dir, root));
        const touchesForbidden = (contract.forbiddenDirs ?? []).some((dir) => isInside(dir, root) || isInside(root, dir) || isInsideReal(dir, root) || isInsideReal(root, dir));
        if (!inAllowed || touchesForbidden || hasUnexpandedShortName(real)) {
          refuse("invalid_spec");
          throw new LabSpecError("spec.root must be inside an allowed directory and outside forbidden directories");
        }
      }
      // Aynı anda en çok bir laboratuvar koşusu.
      if (labRunning) {
        refuse("busy");
        return send(res, 429, { error: "another lab run is in progress", code: "busy" });
      }
      labRunning = true;
      // İstemci yanıt yazılmadan bağlantıyı keserse koşu iptal edilir.
      const abort = new AbortController();
      const onClose = (): void => {
        if (!res.writableEnded) abort.abort();
      };
      res.on("close", onClose);
      let run: Awaited<ReturnType<typeof runLab>>;
      try {
        const own = req.socket.localPort;
        run = await runLab(body.kind, body.spec, { signal: abort.signal, ...(own !== undefined ? { forbiddenPorts: [own] } : {}) });
      } catch (err) {
        if (err instanceof LabSpecError) refuse("invalid_spec");
        throw err;
      } finally {
        labRunning = false;
        res.off("close", onClose);
      }
      deps.audit.record({ initiator: actor, action: "verification.lab", decision: "allow", result: `${body.kind} ${run.status}`, details: { kind: body.kind, provider: run.provider, totals: { ok: run.totals.passed, failed: run.totals.failed, skipped: run.totals.skipped, error: run.totals.error } } });
      return send(res, 200, { run });
    }
    if (method === "POST" && url.pathname === "/api/tasks") {
      requireJson(req);
      const input = parseTaskBody(await readBody(req), actor);
      const decision = evaluateWithGrants(input.request, contract, now(), grants, deps.audit);
      const task = tasks.create({
        title: input.title,
        requestedAction: input.request.action,
        request: input.request,
        decision: decision.decision,
        ...(input.description !== undefined ? { description: input.description } : {}),
      });
      const next: TaskState = decision.decision === "allow" ? "approved" : decision.decision === "deny" ? "denied" : "awaiting_approval";
      const saved = tasks.transition(task.id, next, actor);
      deps.audit.record({
        initiator: input.request.actor,
        action: `task.create:${input.request.action}`,
        decision: decision.decision,
        result: `task ${saved.id} ${saved.state}`,
        details: { taskId: saved.id, rule: decision.rule, reason: decision.reason, request: input.request },
      });
      return send(res, decision.decision === "deny" ? 403 : 201, { task: withRisk(saved), decision });
    }

    const m = /^\/api\/tasks\/([0-9a-f-]{36})\/(approve|deny|run|evidence|contract|workflow|delivery|replay)$/.exec(url.pathname);
    if (m) {
      const id = m[1] as string;
      const verb = m[2] as string;
      if (method === "GET" && verb === "evidence") {
        tasks.require(id);
        return send(res, 200, { taskId: id, evidence: evidence.list(id) });
      }
      if (method === "GET" && verb === "delivery") {
        tasks.require(id);
        const reports = evidence.list(id).filter((e) => e.kind === "delivery");
        const latest = reports[reports.length - 1];
        if (!latest) throw new HttpError(404, "no delivery report yet");
        return send(res, 200, { taskId: id, rounds: reports.length, delivery: latest.data, createdAt: latest.createdAt });
      }
      // Hata oynatma paketi (madde 60): başarısız teslimin son "yeniden üretim paketi". YALNIZ kullanıcı; paket yalnız veridir (çalıştırma yok).
      if (method === "GET" && verb === "replay") {
        requireUser(actor);
        tasks.require(id);
        const bundles = evidence.list(id).filter((e) => e.kind === "replay");
        const latest = bundles[bundles.length - 1];
        if (!latest) throw new HttpError(404, "no replay bundle yet");
        const data = latest.data as { bundle: unknown; file: unknown };
        return send(res, 200, { taskId: id, rounds: bundles.length, replay: data.bundle, file: data.file, createdAt: latest.createdAt });
      }
      if (method === "POST" && (verb === "approve" || verb === "deny")) {
        requireUser(actor);
        const saved = tasks.transition(id, verb === "approve" ? "approved" : "denied", actor);
        deps.audit.record({ initiator: actor, action: `task.${verb}`, decision: verb === "approve" ? "allow" : "deny", result: `task ${saved.id} ${saved.state}`, details: { taskId: id } });
        changes.record({ kind: "task_decision", summary: `Görev ${verb === "approve" ? "onaylandı" : "reddedildi"}: ${saved.title}`, reason: `Kullanıcı kararı; istenen eylem ${saved.requestedAction}`, taskId: id }, actor);
        return send(res, 200, { task: withRisk(saved) });
      }
      if (method === "POST" && verb === "contract") {
        requireUser(actor);
        requireJson(req);
        tasks.require(id);
        const contractIn = validateContract(await readBody(req));
        deps.workflows.setContract(id, contractIn);
        changes.record({ kind: "task_contract", summary: `Görev sözleşmesi belirlendi (${contractIn.acceptance.length} kabul ölçütü)`, reason: "Kullanıcı sözleşme belirledi", taskId: id, files: contractIn.writeScopes }, actor);
        deps.audit.record({ initiator: actor, action: "task.contract", decision: "allow", result: `contract set for ${id}`, details: { taskId: id, criteria: contractIn.acceptance.length, writeScopes: contractIn.writeScopes } });
        return send(res, 200, { taskId: id, contract: contractIn });
      }
      if (method === "POST" && verb === "workflow") {
        requireUser(actor);
        requireJson(req);
        const body = await readBody(req);
        if (!isObject(body)) throw new HttpError(400, "body must be an object");
        expectKeys(body, ["repoPath", "definition"], "body");
        const repoPath = optString(body.repoPath, "repoPath", 1000);
        if (!repoPath) throw new HttpError(400, "repoPath is required");
        const task = tasks.require(id);
        if (task.state !== "approved") throw new HttpError(409, `task is ${task.state}, not approved`);
        const readable = evaluate({ actor: { kind: "system", id: "orchestrator" }, action: "file.read", target: canonicalPath(repoPath) }, contract, now());
        if (readable.decision !== "allow") throw new RunRefused(readable.rule, readable.reason, readable);
        if (!deps.workflows.getContract(id)) throw new HttpError(409, "set the task contract first (POST /api/tasks/:id/contract)");
        const definition = validateDefinition(body.definition, (pid) => deps.registry.get(pid) !== undefined);
        const workflowId = deps.workflows.create(id, canonicalPath(repoPath), definition);
        deps.audit.record({ initiator: actor, action: "workflow.created", decision: "allow", result: `workflow ${workflowId}`, details: { taskId: id, workflowId, steps: definition.steps.map((s) => s.role) } });
        const done = deps.engine.start(workflowId);
        deps.onWorkflow?.(done);
        done.catch(() => undefined);
        return send(res, 202, { taskId: id, workflowId });
      }
      if (method === "POST" && verb === "run") {
        requireUser(actor);
        requireJson(req);
        const body = await readBody(req);
        if (!isObject(body)) throw new HttpError(400, "body must be an object");
        expectKeys(body, ["providerId", "repoPath", "prompt", "timeoutMs"], "body");
        const providerId = optString(body.providerId, "providerId", 100);
        const repoPath = optString(body.repoPath, "repoPath", 1000);
        const prompt = optString(body.prompt, "prompt", 20_000);
        const timeoutMs = optNumber(body.timeoutMs, "timeoutMs");
        if (!providerId || !repoPath || !prompt) throw new HttpError(400, "providerId, repoPath and prompt are required");
        const started = await startRun(
          { tasks, audit: deps.audit, registry: deps.registry, evidence, contract, worktreeRoot: deps.worktreeRoot, now },
          { taskId: id, providerId, repoPath, prompt, ...(timeoutMs !== undefined ? { timeoutMs } : {}) },
          actor,
        );
        deps.onRun?.(started.done);
        started.done.catch(() => undefined);
        return send(res, 202, { taskId: id, attemptId: started.attemptId, worktreePath: started.worktreePath });
      }
    }
    // Görsel regresyon tabanı onayı (madde 52): YALNIZ kullanıcı (ajan 403). Son koşunun YENİ görüntüsü çalışma ağacına DEĞİL, kanıt köküne (baselines/<görev>/) kopyalanır;
    // uygulayıcı kendi tabanını kabul ettiremez. Kanıt bu göreve ait olmalıdır; dosya özeti koşu kaydındakiyle aynı olmalıdır. Denetim satırı: baseline.approve.
    const bm = /^\/api\/tasks\/([0-9a-f-]{36})\/baselines\/approve$/.exec(url.pathname);
    if (bm && method === "POST") {
      requireUser(actor);
      requireJson(req);
      const id = bm[1] as string;
      const body = await readBody(req);
      if (!isObject(body)) throw new HttpError(400, "body must be an object");
      expectKeys(body, ["name", "evidenceId"], "body");
      if (!isBaselineName(body.name)) throw new HttpError(400, "name must be a plain baseline file name ending in .png (letters, digits, . _ - ; no path, no ..)");
      const name = body.name;
      let evidenceId: string | undefined;
      if (body.evidenceId !== undefined) {
        if (typeof body.evidenceId !== "string" || !/^[A-Za-z0-9._-]{1,200}$/.test(body.evidenceId)) throw new HttpError(400, "evidenceId is invalid");
        evidenceId = body.evidenceId;
      }
      tasks.require(id);
      if (!deps.evidenceRoot) throw new HttpError(503, "baseline approval is not configured (no evidence root)");
      // Adayları yalnız BU görevin doğrulama koşusu kayıtlarından ara (en yeni önce): başka göreve ait kanıt bulunamaz (404).
      let found: { newEvidenceId: string; path: string; sha256: string } | undefined;
      for (const rec of evidence.list(id).filter((e) => e.kind === "verification:run").reverse()) {
        const data = rec.data as { baselines?: unknown; evidence?: unknown };
        if (!Array.isArray(data.baselines) || !Array.isArray(data.evidence)) continue;
        for (const b of data.baselines as unknown[]) {
          if (!isObject(b) || b.file !== name || typeof b.newEvidenceId !== "string") continue;
          if (evidenceId !== undefined && b.newEvidenceId !== evidenceId) continue;
          const item = (data.evidence as unknown[]).find((e) => isObject(e) && e.id === b.newEvidenceId);
          if (!isObject(item) || typeof item.path !== "string" || typeof item.sha256 !== "string") continue;
          found = { newEvidenceId: b.newEvidenceId, path: item.path, sha256: item.sha256 };
          break;
        }
        if (found) break;
      }
      if (!found) throw new HttpError(404, "no new image for this baseline name (and evidence id) was recorded by a verification run of this task");
      let approved: ReturnType<typeof approveBaseline>;
      try {
        approved = approveBaseline({ evidenceRoot: deps.evidenceRoot, taskId: id, name, sourcePath: found.path, expectedSha256: found.sha256 });
      } catch (err) {
        if (err instanceof BaselineError) {
          deps.audit.record({ initiator: actor, action: "baseline.approve", decision: "deny", result: err.code, details: { taskId: id, name, evidenceId: found.newEvidenceId } });
          throw new HttpError(err.code === "unavailable" ? 404 : err.code === "hash_mismatch" ? 409 : 400, err.message);
        }
        throw err;
      }
      deps.audit.record({
        initiator: actor,
        action: "baseline.approve",
        decision: "allow",
        result: `baseline ${name} approved for task ${id}`,
        details: { taskId: id, name, evidenceId: found.newEvidenceId, sha256: approved.sha256, bytes: approved.bytes, replaced: approved.replaced, previousSha256: approved.previousSha256 },
      });
      // Motor, koşu öncesi onaylı taban özetlerini bu görev kaydından okur (klasördeki dosya bu özetle eşleşmezse güvenilmez).
      evidence.add(id, null, "baseline.approve", `baseline ${name} approved`, { name, sha256: approved.sha256, evidenceId: found.newEvidenceId });
      return send(res, 200, { taskId: id, baseline: { name, evidenceId: found.newEvidenceId, sha256: approved.sha256, bytes: approved.bytes, replaced: approved.replaced } });
    }
    const wm = /^\/api\/workflows\/([0-9a-f-]{36})$/.exec(url.pathname);
    if (wm && method === "GET") {
      const snap = deps.workflows.get(wm[1] as string);
      if (!snap) throw new HttpError(404, "workflow not found");
      return send(res, 200, { ...snap, handoffs: deps.workflows.handoffs(snap.workflow.id) });
    }
    throw new HttpError(404, "not found or method not allowed");
  }

  return createServer((req, res) => {
    route(req, res).catch((err: unknown) => {
      if (res.headersSent) return res.destroy();
      if (err instanceof HttpError) return send(res, err.status, { error: err.message });
      if (err instanceof ValidationError) return send(res, 400, { error: err.message, code: err.code });
      if (err instanceof LabSpecError) return send(res, 400, { error: err.message, code: "invalid_spec" });
      if (err instanceof ModelCapabilityError) return send(res, err.status, { error: err.message, code: err.code, ...(err.code === "provider_unavailable" ? { reason: err.message } : {}), ...(err.code === "data_boundary_secret" ? { warnings: [SECRET_WARNING] } : {}), ...(err.extra ?? {}) });
      if (err instanceof RunRefused) return send(res, err.code === "user_required" ? 403 : 409, { error: err.message, code: err.code, ...(err.decision ? { decision: err.decision } : {}) });
      if (err instanceof ReasoningError) return send(res, err.code === "not_found" ? 404 : err.code === "rate_limited" ? 429 : err.code === "approval_requires_user" ? 403 : err.code === "invalid_field" ? 400 : 409, { error: err.message, code: err.code });
      if (err instanceof GrantError || err instanceof ChangeLedgerError || err instanceof AutomationError) return send(res, err.code === "not_found" ? 404 : err.code === "approval_requires_user" ? 403 : err.code === "invalid_field" || err.code === "scope_outside_contract" || err.code === "scope_forbidden" ? 400 : 409, { error: err.message, code: err.code });
      if (err instanceof NetError) return send(res, err.code === "approval_requires_user" ? 403 : 400, { error: err.message, code: err.code });
      if (err instanceof SkillError) return send(res, err.code === "not_found" ? 404 : err.code === "approval_requires_user" ? 403 : err.code === "invalid_field" ? 400 : 409, { error: err.message, code: err.code });
      if (err instanceof MemoryError) return send(res, err.code === "not_found" ? 404 : err.code === "conflict" ? 409 : err.code === "forbidden_dir" ? 403 : 400, { error: err.message, code: err.code });
      if (err instanceof SubsessionError) return send(res, err.code === "not_found" ? 404 : 400, { error: err.message, code: err.code });
      if (err instanceof TaskError) return send(res, err.code === "not_found" ? 404 : err.code === "approval_requires_user" ? 403 : 409, { error: err.message, code: err.code });
      send(res, 500, { error: "internal error" });
    });
  });
}
