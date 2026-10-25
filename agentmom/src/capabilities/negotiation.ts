// Ajanlar arası müzakere çalıştırıcısı (madde 75, D8c-3a, ADR-016). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
// İki FARKLI sağlayıcı (A öneren, B eleştirmen) KULLANICI isteğiyle 1-2 turluk yapılandırılmış müzakere yapar. HER adım model-runner ile AYNI güvenlik hattından geçer:
// veri sınırı (secret girdi yalnız yerel rota), broker (execute doğrulanmış/kısmi, politika izinli, devre dışı değil, api_paid asla, unconfined okuma elenir),
// politika (provider.call + sandbox file.read, adımlardan ÖNCE), salt-okunur yalıtılmış sandbox (her adım kendi çalışma ağacında), nonce'lu sınırlayıcı, şema doğrulama.
// Tek eşzamanlı koşu kilidi TÜM müzakere boyunca tutulur (hata/zaman aşımında açılır); toplam süre en çok 10 dk. Önceki adımın çıktısı bir sonrakine GÜVENİLMEZ VERİ olarak verilir.
// Hiçbir şey kendiliğinden uygulanmaz; sonuç yalnız ÖNERİDİR. Denetime/kanıta ham girdi-çıktı metni yazılmaz (kanıt: redakte sonuç, <= 64 KB).
import type { ActionRequest, Actor, AutonomyContract } from "../core/policy/types.ts";
import { classifyData } from "../core/policy/data-boundary.ts";
import { evaluate } from "../core/policy/engine.ts";
import { RunRefused, startRun } from "../orchestrator/run-task.ts";
import { SYSTEM } from "../orchestrator/steps.ts";
import type { ProviderAdapter, Usage } from "../providers/contract.ts";
import { InputInvalid, OutputInvalid, extractJson, validateInput } from "./model/common.ts";
import { NEED_TWO_MESSAGE, SAME_PROVIDER_MESSAGE, deriveOutcome, negotiation, priorBlocks, stepPrompt, stepRole, stepRound, stepsFor, validateStep } from "./model/negotiation.ts";
import type { NegotiationStep, StepContext, TranscriptEntry } from "./model/negotiation.ts";
import { GRACE_MS, MAX_RUN_MS, ModelCapabilityError, SECRET_WARNING, assertSandboxCapacity, ensureAnalysisSandbox, evidenceData, select, usable } from "./model-runner.ts";
import type { ModelRunRecord, ModelRunnerDeps, Sandbox, StartedModelRun } from "./model-runner.ts";

export const MAX_NEGOTIATION_MS = 10 * 60 * 1000;
const PROVIDER_ID = /^[a-z0-9-]{1,40}$/;

// Liste ucu için dürüst kullanılabilirlik: en az İKİ farklı uygun sağlayıcı.
export function negotiationAvailability(deps: Pick<ModelRunnerDeps, "registry" | "snapshots">): { available: boolean; reason: string } {
  const u = usable(deps, "internal");
  if (u.adapters.length >= 2) return { available: true, reason: `${u.adapters.map((a) => a.id).join(", ")}` };
  return { available: false, reason: `${NEED_TWO_MESSAGE} (uygun: ${u.adapters.length}${u.reasons.length ? `; ${u.reasons.join(" | ")}` : ""})`.slice(0, 600) };
}

function parseRounds(raw: unknown): 1 | 2 {
  const v = raw !== null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>).rounds : undefined;
  if (v === undefined) return 2;
  if (v === 1 || v === 2) return v;
  throw new ModelCapabilityError("validation", "rounds 1 ya da 2 olmalı", 400);
}

function parseProvider(raw: unknown, key: "providerA" | "providerB"): string | undefined {
  const v = raw !== null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>)[key] : undefined;
  if (v === undefined) return undefined;
  if (typeof v !== "string" || !PROVIDER_ID.test(v)) throw new ModelCapabilityError("validation", `${key} ^[a-z0-9-]{1,40}$ biçiminde olmalı`, 400);
  return v;
}

interface StepOk {
  ok: true;
  text: string;
  usage: Usage | undefined;
}
interface StepFail {
  ok: false;
  code: string;
  message: string;
}

export async function startNegotiation(deps: ModelRunnerDeps, args: { input: unknown; actor: Actor }): Promise<StartedModelRun> {
  const now = deps.now ?? (() => new Date());
  const { actor } = args;
  if (actor.kind !== "user") throw new ModelCapabilityError("user_required", "model yeteneklerini yalnız kullanıcı çalıştırabilir", 403);
  let input;
  try {
    input = validateInput(negotiation, args.input);
  } catch (err) {
    if (err instanceof InputInvalid) throw new ModelCapabilityError("validation", err.message, 400);
    throw err;
  }
  const rounds = parseRounds(args.input);
  const pa = parseProvider(args.input, "providerA");
  const pb = parseProvider(args.input, "providerB");
  if (pa !== undefined && pa === pb) throw new ModelCapabilityError("validation", SAME_PROVIDER_MESSAGE, 400);

  // Veri sınırı: sınıf KULLANICI metninden hesaplanır; secret girdide yalnız yerel sağlayıcılar kabul edilir (iki tane gerekir).
  const userText = Object.values(input).flat().join("\n");
  const dataClass = classifyData({ text: userText }, deps.contract);
  const refuse = (code: string, message: string, status: number): never => {
    deps.audit.record({ initiator: actor, action: "capability.model.refused", decision: "deny", result: code, details: { capabilityId: "negotiation", dataClass } });
    throw new ModelCapabilityError(code, message, status);
  };
  const u = usable(deps, dataClass);
  const pick = (id: string): ProviderAdapter => {
    const s = select(deps, dataClass, id);
    if (!s.ok) return refuse(s.code, s.reason, s.code === "provider_unavailable" ? 503 : 403);
    return s.adapter;
  };
  let A: ProviderAdapter | undefined = pa !== undefined ? pick(pa) : undefined;
  let B: ProviderAdapter | undefined = pb !== undefined ? pick(pb) : undefined;
  A ??= u.adapters.find((a) => a.id !== B?.id);
  B ??= u.adapters.find((a) => a.id !== A?.id);
  if (!A || !B) {
    if (u.cloudSkippedForSecret) return refuse("data_boundary_secret", `girdi sır içeriyor; yalnız yerel rota kabul edilir. ${NEED_TWO_MESSAGE}: iki uygun YEREL sağlayıcı yok`, 403);
    return refuse("provider_unavailable", `${NEED_TWO_MESSAGE} (uygun: ${u.adapters.length}${u.reasons.length ? `; ${u.reasons.join(" | ")}` : ""})`.slice(0, 600), 503);
  }
  if (A.id === B.id) return refuse("validation", SAME_PROVIDER_MESSAGE, 400);
  const adapters = { A, B } as const;

  assertSandboxCapacity(deps);
  // Tek eşzamanlı koşu kilidi: TÜM müzakere boyunca tutulur.
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
    const runContract: AutonomyContract = { ...deps.contract, allowedDirs: [...deps.contract.allowedDirs, sandbox.repoPath] };
    // Adımlardan ÖNCE politika: her iki sağlayıcı için provider.call ve sandbox okuması.
    for (const ad of [A, B]) {
      const req: ActionRequest = { actor: { kind: actor.kind, id: actor.id }, action: "provider.call", provider: ad.id, route: { kind: ad.routeKind, providerId: ad.id }, dataClass };
      const d = evaluate({ ...req, approval: { grantedBy: "user" } }, deps.contract, now());
      if (d.decision !== "allow") return refuse("refused", d.reason, 403);
    }
    const readable = evaluate({ actor: SYSTEM, action: "file.read", target: sandbox.repoPath }, runContract, now());
    if (readable.decision !== "allow") return refuse(readable.rule, readable.reason, 403);

    // Üst görev: müzakerenin tamamı için kayıt (kanıt burada); her adımın kendi görevi vardır (startRun görev başına bir deneme çalıştırır).
    const parentReq: ActionRequest = { actor: { kind: actor.kind, id: actor.id }, action: "provider.call", provider: A.id, route: { kind: A.routeKind, providerId: A.id }, dataClass };
    // İstek kaydında ayrı alanlar: providerA/providerB (birleşik "A+B" etiketi kayda/aramaya girmez).
    const parent = deps.tasks.create({ title: "Model yeteneği: negotiation (madde 75)", requestedAction: "provider.call", request: { ...parentReq, providerA: A.id, providerB: B.id }, decision: "allow" });
    deps.tasks.transition(parent.id, "approved", actor);
    deps.tasks.transition(parent.id, "running", SYSTEM);
    const providerLabel = `${A.id}+${B.id}`;
    const running: ModelRunRecord = { taskId: parent.id, capabilityId: "negotiation", status: "running", providerId: providerLabel, providerA: A.id, providerB: B.id };
    try {
      deps.audit.record({ initiator: actor, action: "capability.model.start", decision: "allow", result: `task ${parent.id}`, details: { taskId: parent.id, capabilityId: "negotiation", providerA: A.id, providerB: B.id, routeKinds: [A.routeKind, B.routeKind], dataClass, rounds, steps: stepsFor(rounds).length, inputChars: userText.length, readOnly: true } });
      deps.state.remember(running);
    } catch {
      // best-effort
    }

    const deadline = Date.now() + Math.min(deps.negotiationTotalMs ?? MAX_NEGOTIATION_MS, MAX_NEGOTIATION_MS);

    // Tek adım: ayrı görev + ayrı çalışma ağacı (startRun), bekçi zamanlayıcı, tam yanıt metni.
    const runStep = async (adapter: ProviderAdapter, prompt: string, label: string): Promise<StepOk | StepFail> => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) return { ok: false, code: "timeout", message: "müzakere toplam süre sınırını aştı" };
      const req: ActionRequest = { actor: { kind: actor.kind, id: actor.id }, action: "provider.call", provider: adapter.id, route: { kind: adapter.routeKind, providerId: adapter.id }, dataClass };
      const task = deps.tasks.create({ title: `Müzakere adımı: ${label}`, requestedAction: "provider.call", request: req, decision: "allow" });
      deps.tasks.transition(task.id, "approved", actor);
      const timeoutMs = Math.max(1, Math.min(deps.runTimeoutMs ?? MAX_RUN_MS, MAX_RUN_MS, deps.contract.maxRuntimeMs, remaining));
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
            // görev başka durumda
          }
          return { ok: false, code: err.code, message: err.message };
        }
        throw err;
      }
      started.done.catch(() => undefined);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        const timedOut = new Promise<"timeout">((res) => {
          timer = setTimeout(() => res("timeout"), timeoutMs + (deps.graceMs ?? GRACE_MS));
        });
        const outcome = await Promise.race([started.done, timedOut]);
        if (outcome === "timeout") {
          if (executionId !== undefined) await Promise.race([adapter.cancel(executionId).catch(() => undefined), new Promise((r) => setTimeout(r, 2000).unref())]);
          return { ok: false, code: "timeout", message: "sağlayıcı süre sınırında yanıt vermedi; adım iptal edildi" };
        }
        if (outcome.status !== "succeeded") return { ok: false, code: outcome.errorCode ?? outcome.status, message: `sağlayıcı koşusu başarısız (${outcome.status})` };
        return { ok: true, text: outcome.fullText ?? outcome.summary ?? "", usage: outcome.usage };
      } finally {
        if (timer) clearTimeout(timer);
      }
    };

    const done = (async (): Promise<ModelRunRecord> => {
      const transcript: TranscriptEntry[] = [];
      let failure: { code: string; message: string; step: NegotiationStep } | undefined;
      let inTok: number | null = null;
      let outTok: number | null = null;
      let outputChars = 0;
      let ctx: StepContext = { proposalIds: new Set() };
      try {
        for (const step of stepsFor(rounds)) {
          const role = stepRole(step);
          const adapter = adapters[role];
          const prompt = stepPrompt(step, input, priorBlocks(transcript));
          const r = await runStep(adapter, prompt, `tur ${stepRound(step)} rol ${role} ${step}`);
          if (!r.ok) {
            failure = { code: r.code, message: r.message, step };
            break;
          }
          outputChars += r.text.length;
          if (r.usage?.inputTokens != null) inTok = (inTok ?? 0) + r.usage.inputTokens;
          if (r.usage?.outputTokens != null) outTok = (outTok ?? 0) + r.usage.outputTokens;
          let content: Record<string, unknown>;
          try {
            content = validateStep(step, extractJson(r.text), ctx);
          } catch (err) {
            if (!(err instanceof OutputInvalid)) throw err;
            failure = { code: "malformed_output", message: `${step} adımı çıktısı şemaya uymuyor: ${err.message}`, step };
            break;
          }
          if (step === "propose") ctx = { proposalIds: new Set((content.proposals as Array<{ id: string }>).map((p) => p.id)) };
          transcript.push({ round: stepRound(step), role, providerId: adapter.id, step, content });
        }
      } catch {
        failure = { code: "internal", message: "müzakere tamamlanamadı", step: stepsFor(rounds)[transcript.length] ?? "propose" };
      }

      const usage = inTok !== null || outTok !== null ? { inputTokens: inTok, outputTokens: outTok, costUsd: null, source: "reported" as const } : undefined;
      const providers = { A: A.id, B: B.id };
      let rec: ModelRunRecord;
      if (failure) {
        // Kısmi sonuç İŞARETLİ: o ana kadarki doğrulanmış transcript döner, sonuç (outcome) yoktur.
        rec = { ...running, status: "failed", error: { code: failure.code, message: `${failure.message} (adım: ${failure.step})` }, result: { transcript, providers, rounds, partial: true, completedSteps: transcript.length, untrusted: true } };
      } else {
        try {
          const outcome = deriveOutcome(transcript, rounds);
          const checked = negotiation.validateOutput({ transcript, outcome, providers, rounds });
          rec = { ...running, status: "done", result: { ...checked, untrusted: true } };
        } catch {
          rec = { ...running, status: "failed", error: { code: "internal", message: "müzakere sonucu üretilemedi" }, result: { transcript, providers, rounds, partial: true, completedSteps: transcript.length, untrusted: true } };
        }
      }
      if (usage) rec.usage = usage;
      try {
        try {
          // Kanıtta birleşik etiket yok: providerA/providerB ayrı alanlar.
          const { providerId: _label, ...ev } = evidenceData("negotiation", rec) as Record<string, unknown>;
          deps.evidence.add(parent.id, null, "capability.output", `negotiation: ${rec.status}`, { ...ev, providerA: A.id, providerB: B.id });
        } catch {
          // kanıt yazılamasa da sonuç verilir
        }
        try {
          deps.tasks.transition(parent.id, rec.status === "done" ? "succeeded" : "failed", SYSTEM);
        } catch {
          // görev durumu en iyi çaba
        }
        deps.audit.record({
          initiator: SYSTEM,
          action: "capability.model.finish",
          decision: rec.status === "done" ? "allow" : "n/a",
          result: rec.status,
          details: { taskId: parent.id, capabilityId: "negotiation", providerA: A.id, providerB: B.id, steps: transcript.length, errorCode: rec.error?.code ?? null, outcome: rec.status === "done" ? ((rec.result as { outcome?: { status?: string } }).outcome?.status ?? null) : null, outputChars, inputTokens: inTok, outputTokens: outTok },
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
    return { taskId: parent.id, providerId: providerLabel, providerA: A.id, providerB: B.id, done, ...(dataClass === "secret" ? { warnings: [SECRET_WARNING] } : {}) };
  } catch (err) {
    release();
    throw err;
  }
}
