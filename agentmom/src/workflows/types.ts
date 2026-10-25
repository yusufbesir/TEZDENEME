import { ScenarioError, validateScenario } from "../verify/scenario.ts";
import type { ScenarioStep } from "../verify/scenario.ts";
import { expandTemplates, validateTemplateList } from "../verify/scenario-library.ts";
import { validateA11yPlan } from "../verify/labs/a11y.ts";
import type { A11yPlan } from "../verify/labs/a11y.ts";
import { validateDesignPlan } from "../verify/labs/design.ts";
import type { DesignPlan } from "../verify/labs/design.ts";
import { validateContractList } from "../verify/labs/contracts.ts";
import type { ContractSpec } from "../verify/labs/contracts.ts";
import { validateDataFiles } from "../verify/labs/lineage.ts";
import { validateMutationPlan } from "../verify/labs/mutation.ts";
import type { MutationPlan } from "../verify/labs/mutation.ts";
import { LabSpecError } from "../verify/labs/rules.ts";
import { validateStateRequest } from "../verify/labs/state.ts";
import type { StateSpec } from "../verify/labs/state.ts";
import { normalizeScope } from "./scopes.ts";

export const ROLES = ["plan", "implement", "review", "verify"] as const;
export type Role = (typeof ROLES)[number];

export class ValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ValidationError";
    this.code = code;
  }
}

export interface AcceptanceCriterion {
  id: string;
  text: string;
}

// How the work is proven: project test files run by the local test provider, and/or a declarative browser scenario against a site in the workspace.
// Tests claim criteria with [ac:<id>] tags in their names; a criterion no test claims stays unverified.
export interface VerificationPlan {
  localTests?: { files: string[]; retryFailures?: boolean };
  // true = tests that the implementer itself wrote or changed do not count as proof (the delivery stays unverified).
  requireTrustedTests?: boolean;
  browser?: { siteDir: string; steps: ScenarioStep[]; stepTimeoutMs?: number };
  // Davranış sözleşmeleri / değişmezler (madde 56): konu, çalışma ağacındaki bir JSON dosyasıdır (subjectFile, çalışma ağacına göreli); kod ÇALIŞTIRILMAZ.
  contracts?: { subjectFile: string; contracts: ContractSpec[] };
  // Durum geçiş denetimi (madde 57): satır içi makine + neverReach + traces; çalışma ağacına hiç dokunmaz.
  states?: StateSpec;
  // Erişilebilirlik laboratuvarı (madde 27): çalışma ağacındaki statik HTML dosyaları (files) + açıkça verilen kontrast çiftleri. Kod ÇALIŞTIRILMAZ.
  a11y?: A11yPlan;
  // Tasarım laboratuvarı (madde 49 + 50): projenin tasarım sözleşmesi (spec satır içi ya da çalışma ağacındaki specFile) çalışma ağacındaki HTML/CSS dosyalarına karşı denetlenir. Kod ÇALIŞTIRILMAZ.
  design?: DesignPlan;
  // Mutasyon testi (madde 58): localTests GEÇTİKTEN sonra, çalışma ağacının geçici KOPYASINDA kaynak dosyalar küçük değişikliklere uğratılır ve localTests dosyaları yeniden koşulur. localTests ZORUNLUDUR.
  mutation?: MutationPlan;
  // Test verisi soy ağacı (madde 59): koşuların kullandığı veri dosyaları (fixture). TEK BAŞINA plan sayılmaz; yukarıdakilerin yanında geçerli ek alandır.
  dataFiles?: string[];
  timeoutMs: number;
}

// What "done" means for a task: a goal, checkable acceptance criteria, the paths the work may touch, and constraints.
export interface TaskContract {
  goal: string;
  acceptance: AcceptanceCriterion[];
  writeScopes: string[];
  constraints: string[];
  verification?: VerificationPlan;
}

export interface StepDefinition {
  role: Role;
  providerId?: string;
  fallbackProviders?: string[];
  maxAttempts?: number;
}

export interface WorkflowDefinition {
  steps: StepDefinition[];
  allowSameProviderReview?: boolean;
}

export interface Verdict {
  approved: boolean;
  criteria: Array<{ id: string; met: boolean; note?: string }>;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function str(v: unknown, name: string, max: number): string {
  if (typeof v !== "string" || v.trim().length === 0 || v.length > max) throw new ValidationError("invalid_field", `${name} must be a non-empty string of at most ${max} characters`);
  return v;
}

function onlyKeys(o: Record<string, unknown>, allowed: string[], where: string): void {
  for (const k of Object.keys(o)) if (!allowed.includes(k)) throw new ValidationError("unknown_field", `${where}: unknown field ${k}`);
}

export function validateContract(input: unknown): TaskContract {
  if (!isObj(input)) throw new ValidationError("invalid_contract", "contract must be an object");
  onlyKeys(input, ["goal", "acceptance", "writeScopes", "constraints", "verification"], "contract");
  const goal = str(input.goal, "goal", 4000);
  if (!Array.isArray(input.acceptance) || input.acceptance.length === 0 || input.acceptance.length > 20) {
    throw new ValidationError("invalid_acceptance", "acceptance must list 1 to 20 criteria");
  }
  const seen = new Set<string>();
  const acceptance = input.acceptance.map((c, i) => {
    if (!isObj(c)) throw new ValidationError("invalid_acceptance", `acceptance[${i}] must be an object`);
    onlyKeys(c, ["id", "text"], `acceptance[${i}]`);
    const id = str(c.id, `acceptance[${i}].id`, 40);
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new ValidationError("invalid_acceptance", `acceptance[${i}].id may only use letters, digits, - and _`);
    if (seen.has(id)) throw new ValidationError("invalid_acceptance", `duplicate acceptance id ${id}`);
    seen.add(id);
    return { id, text: str(c.text, `acceptance[${i}].text`, 1000) };
  });
  const scopesIn = input.writeScopes ?? [];
  if (!Array.isArray(scopesIn) || scopesIn.length > 50) throw new ValidationError("invalid_scopes", "writeScopes must be an array of at most 50 paths");
  let writeScopes: string[];
  try {
    writeScopes = scopesIn.map((s) => normalizeScope(str(s, "writeScopes[]", 300)));
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError("invalid_scopes", err instanceof Error ? err.message : "invalid scope");
  }
  const consIn = input.constraints ?? [];
  if (!Array.isArray(consIn) || consIn.length > 20) throw new ValidationError("invalid_constraints", "constraints must be an array of at most 20 strings");
  const constraints = consIn.map((c) => str(c, "constraints[]", 500));
  const verification = input.verification === undefined ? undefined : validateVerification(input.verification);
  return { goal, acceptance, writeScopes, constraints, ...(verification ? { verification } : {}) };
}

const TEST_FILE = /\.(test|spec)\.(ts|mjs|js|cjs)$/;

export function validateVerification(input: unknown): VerificationPlan {
  if (!isObj(input)) throw new ValidationError("invalid_verification", "verification must be an object");
  onlyKeys(input, ["localTests", "browser", "contracts", "states", "a11y", "design", "mutation", "dataFiles", "timeoutMs", "requireTrustedTests"], "verification");
  if (input.localTests === undefined && input.browser === undefined && input.contracts === undefined && input.states === undefined && input.a11y === undefined && input.design === undefined) throw new ValidationError("invalid_verification", "verification needs at least one of localTests, browser, contracts, states, a11y or design");
  const plan: VerificationPlan = { timeoutMs: 120_000 };
  if (input.timeoutMs !== undefined) {
    if (typeof input.timeoutMs !== "number" || !Number.isInteger(input.timeoutMs) || input.timeoutMs < 1000 || input.timeoutMs > 600_000) throw new ValidationError("invalid_verification", "timeoutMs must be an integer from 1000 to 600000");
    plan.timeoutMs = input.timeoutMs;
  }
  if (input.requireTrustedTests === true) plan.requireTrustedTests = true;
  if (input.localTests !== undefined) {
    const lt = input.localTests;
    if (!isObj(lt)) throw new ValidationError("invalid_verification", "localTests must be an object");
    onlyKeys(lt, ["files", "retryFailures"], "localTests");
    if (!Array.isArray(lt.files) || lt.files.length === 0 || lt.files.length > 50) throw new ValidationError("invalid_verification", "localTests.files must list 1 to 50 test files");
    const files = lt.files.map((f) => {
      const p = str(f, "localTests.files[]", 300).replace(/\\/g, "/");
      if (p.startsWith("/") || /^[a-zA-Z]:/.test(p) || p.split("/").some((x) => x === ".." || x.startsWith("-")) || !TEST_FILE.test(p)) throw new ValidationError("invalid_verification", `not a workspace-relative test file name: ${p}`);
      return p;
    });
    plan.localTests = { files, ...(lt.retryFailures === true ? { retryFailures: true } : {}) };
  }
  if (input.browser !== undefined) {
    const b = input.browser;
    if (!isObj(b)) throw new ValidationError("invalid_verification", "browser must be an object");
    onlyKeys(b, ["siteDir", "steps", "templates", "stepTimeoutMs"], "browser");
    let siteDir: string;
    let steps: ScenarioStep[];
    try {
      siteDir = normalizeScope(str(b.siteDir, "browser.siteDir", 300));
      // steps ve templates birlikte ya da tek başına verilebilir; şablonlar adımlara GENİŞLETİLİR ve tek bir senaryo olarak (toplam MAX_STEPS) doğrulanır.
      // Şablon yalnız veridir; saklanan plan genişletilmiş adımları taşır (tekrar doğrulanırsa çift genişleme olmaz).
      if (b.steps === undefined && b.templates === undefined) throw new ValidationError("invalid_verification", "browser needs steps, templates or both");
      const explicit = b.steps === undefined ? [] : validateScenario(b.steps);
      const fromTemplates = b.templates === undefined ? [] : expandTemplates(validateTemplateList(b.templates));
      steps = validateScenario([...explicit, ...fromTemplates]);
    } catch (err) {
      if (err instanceof ValidationError) throw err;
      throw new ValidationError("invalid_verification", err instanceof ScenarioError || err instanceof Error ? err.message : "invalid browser plan");
    }
    const st = b.stepTimeoutMs;
    if (st !== undefined && (typeof st !== "number" || !Number.isInteger(st) || st < 200 || st > 60_000)) throw new ValidationError("invalid_verification", "stepTimeoutMs must be an integer from 200 to 60000");
    plan.browser = { siteDir, steps, ...(st !== undefined ? { stepTimeoutMs: st as number } : {}) };
  }
  if (input.contracts !== undefined) {
    const c = input.contracts;
    if (!isObj(c)) throw new ValidationError("invalid_verification", "contracts must be an object");
    onlyKeys(c, ["subjectFile", "contracts"], "contracts");
    const subjectFile = validateSubjectFile(c.subjectFile);
    try {
      plan.contracts = { subjectFile, contracts: validateContractList(c.contracts) };
    } catch (err) {
      if (err instanceof LabSpecError) throw new ValidationError("invalid_verification", `contracts: ${err.message}`);
      throw err;
    }
  }
  if (input.states !== undefined) {
    try {
      plan.states = validateStateRequest(input.states);
    } catch (err) {
      if (err instanceof LabSpecError) throw new ValidationError("invalid_verification", `states: ${err.message}`);
      throw err;
    }
  }
  if (input.a11y !== undefined) {
    try {
      plan.a11y = validateA11yPlan(input.a11y);
    } catch (err) {
      if (err instanceof LabSpecError) throw new ValidationError("invalid_verification", `a11y: ${err.message}`);
      throw err;
    }
  }
  if (input.design !== undefined) {
    try {
      plan.design = validateDesignPlan(input.design);
    } catch (err) {
      if (err instanceof LabSpecError) throw new ValidationError("invalid_verification", `design: ${err.message}`);
      throw err;
    }
  }
  if (input.mutation !== undefined) {
    if (plan.localTests === undefined) throw new ValidationError("invalid_verification", "mutation needs localTests (the mutants are run against the localTests files)");
    try {
      plan.mutation = validateMutationPlan(input.mutation);
    } catch (err) {
      if (err instanceof LabSpecError) throw new ValidationError("invalid_verification", `mutation: ${err.message}`);
      throw err;
    }
    const tests = new Set(plan.localTests.files.map((f) => f.toLowerCase()));
    if (plan.mutation.files.some((f) => tests.has(f.toLowerCase()))) throw new ValidationError("invalid_verification", "mutation.files must not include a localTests file");
  }
  if (input.dataFiles !== undefined) {
    try {
      plan.dataFiles = validateDataFiles(input.dataFiles);
    } catch (err) {
      if (err instanceof LabSpecError) throw new ValidationError("invalid_verification", `dataFiles: ${err.message}`);
      throw err;
    }
  }
  return plan;
}

// Çalışma ağacına göreli, .json uzantılı, en çok 300 karakterlik dosya adı: mutlak yol, sürücü harfi, "..", "." parçası, ters bölü ve kontrol karakteri yok.
export const SUBJECT_FILE_MAX = 300;
export function validateSubjectFile(v: unknown): string {
  const p = str(v, "contracts.subjectFile", SUBJECT_FILE_MAX);
  if (p.includes("\\") || p.startsWith("/") || /^[a-zA-Z]:/.test(p) || /[\u0000-\u001f\u007f]/.test(p)) throw new ValidationError("invalid_verification", "contracts.subjectFile must be a workspace-relative path with forward slashes");
  const parts = p.split("/");
  if (parts.some((x) => x === "" || x === "." || x === "..")) throw new ValidationError("invalid_verification", "contracts.subjectFile must not contain empty, . or .. segments");
  if (!/\.json$/i.test(p)) throw new ValidationError("invalid_verification", "contracts.subjectFile must be a .json file");
  return p;
}

const ORDER: Record<Role, number> = { plan: 0, implement: 1, review: 2, verify: 3 };

export function validateDefinition(input: unknown, isRegistered: (providerId: string) => boolean): WorkflowDefinition {
  if (!isObj(input)) throw new ValidationError("invalid_definition", "definition must be an object");
  onlyKeys(input, ["steps", "allowSameProviderReview"], "definition");
  if (!Array.isArray(input.steps) || input.steps.length === 0 || input.steps.length > 4) throw new ValidationError("invalid_definition", "steps must list 1 to 4 steps");
  const steps: StepDefinition[] = [];
  let last = -1;
  for (const [i, raw] of input.steps.entries()) {
    if (!isObj(raw)) throw new ValidationError("invalid_definition", `steps[${i}] must be an object`);
    onlyKeys(raw, ["role", "providerId", "fallbackProviders", "maxAttempts"], `steps[${i}]`);
    if (typeof raw.role !== "string" || !(ROLES as readonly string[]).includes(raw.role)) throw new ValidationError("invalid_role", `steps[${i}].role is invalid`);
    const role = raw.role as Role;
    if (ORDER[role] <= last) throw new ValidationError("invalid_order", "steps must follow plan -> implement -> review -> verify, each at most once");
    last = ORDER[role];
    const step: StepDefinition = { role };
    if (role === "verify") {
      if (raw.providerId !== undefined || raw.fallbackProviders !== undefined) throw new ValidationError("invalid_definition", "verify is deterministic and takes no provider");
    } else {
      const providerId = str(raw.providerId, `steps[${i}].providerId`, 100);
      const fallbacks = raw.fallbackProviders === undefined ? [] : Array.isArray(raw.fallbackProviders) ? raw.fallbackProviders.map((f) => str(f, "fallbackProviders[]", 100)) : null;
      if (fallbacks === null || fallbacks.length > 3) throw new ValidationError("invalid_definition", "fallbackProviders must be an array of at most 3 provider ids");
      for (const id of [providerId, ...fallbacks]) if (!isRegistered(id)) throw new ValidationError("unknown_provider", `provider ${id} is not registered`);
      step.providerId = providerId;
      if (fallbacks.length) step.fallbackProviders = fallbacks;
    }
    if (raw.maxAttempts !== undefined) {
      if (typeof raw.maxAttempts !== "number" || !Number.isInteger(raw.maxAttempts) || raw.maxAttempts < 1 || raw.maxAttempts > 3) throw new ValidationError("invalid_definition", "maxAttempts must be an integer from 1 to 3");
      step.maxAttempts = raw.maxAttempts;
    }
    steps.push(step);
  }
  const roles = steps.map((s) => s.role);
  if (roles.includes("review") && !roles.includes("implement")) throw new ValidationError("invalid_definition", "review needs an implement step");
  if (roles.includes("verify") && !(roles.includes("implement") && roles.includes("review"))) throw new ValidationError("invalid_definition", "verify needs implement and review steps");
  const allowSame = input.allowSameProviderReview === true;
  const impl = steps.find((s) => s.role === "implement");
  const rev = steps.find((s) => s.role === "review");
  if (impl && rev && !allowSame) {
    const implementers = new Set([impl.providerId, ...(impl.fallbackProviders ?? [])]);
    if ([rev.providerId, ...(rev.fallbackProviders ?? [])].every((p) => p !== undefined && implementers.has(p))) {
      throw new ValidationError("review_not_independent", "the reviewer must be a different provider from the implementer (or set allowSameProviderReview)");
    }
    if (rev.providerId === impl.providerId) throw new ValidationError("review_not_independent", "the reviewer's primary provider must differ from the implementer's");
  }
  return { steps, ...(allowSame ? { allowSameProviderReview: true } : {}) };
}
