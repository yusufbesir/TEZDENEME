// Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Doğrulama laboratuvarı D6a / madde 24: API test laboratuvarı. YALNIZ yerel (127.0.0.1, localhost, [::1]) http hedeflerine, node:http ile istek atar.
// Sert sınırlar: redirect takip edilmez, yanıt gövdesi 1 MiB ile kesilir, adım/toplam zaman aşımı sınırlıdır, başlıklar izin listesindendir,
// Authorization değeri hiçbir kanıt ya da hata metninde görünmez. Yer tutucular yalnız önceki adımlarda kaydedilmiş değişkenlerden dolar.
import { randomUUID } from "node:crypto";
import { request as httpRequest } from "node:http";
import type { ClientRequest } from "node:http";
import { redactString } from "../../core/audit/redact.ts";
import { criteriaFor } from "../provider.ts";
import type { VerificationHandle, VerificationProvider } from "../provider.ts";
import type { EvidenceItem, RunResult, RunStatus, TestResult } from "../schema.ts";
import { LabSpecError, boundedMs, cleanText, criteriaIds, evaluateRule, mkRun, mkTest, parsePath, plainObject, reqString, resolveSegs, tagName, validateRule } from "./rules.ts";
import type { Rule, TestDraft } from "./rules.ts";

export const API_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] as const;
export type ApiMethod = (typeof API_METHODS)[number];

export interface ApiExpect {
  status: number | number[];
  headerEquals?: Record<string, string>;
  json?: Rule[];
  bodyContains?: string;
  maxMs?: number;
}
export interface ApiStepSpec {
  name: string;
  method: ApiMethod;
  path: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  body?: unknown;
  expect: ApiExpect;
  save?: Record<string, string>;
  criteria?: string[];
}
export interface ApiLabRequest {
  baseUrl: string;
  headers?: Record<string, string>;
  steps: ApiStepSpec[];
  stepTimeoutMs?: number;
  timeoutMs?: number;
}

export const MAX_STEPS = 40;
export const MAX_RESPONSE_BYTES = 1024 * 1024;
export const MAX_STEP_TIMEOUT_MS = 10_000;
export const MAX_TOTAL_TIMEOUT_MS = 60_000;
const MAX_BODY_BYTES = 64 * 1024;
export const ALLOWED_HEADERS = ["accept", "content-type", "authorization", "x-request-id", "if-none-match", "idempotency-key"] as const;

const BASE_RE = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\]):(\d{1,5})\/?$/;
const PLACEHOLDER = /\{\{([A-Za-z_][A-Za-z0-9_]{0,39})\}\}/g;
const VAR_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,39}$/;
const QUERY_KEY = /^[A-Za-z0-9_.-]{1,64}$/;
// %25 (çift kodlama: %252e gibi), kodlanmış nokta/bölü/ters bölü ve kontrol karakterleri.
const BAD_ENCODING = /%(?:[01][0-9a-f]|25|2e|2f|5c|7f)/i;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+\/=-]{6,}/gi;

interface PlanStep {
  name: string;
  method: ApiMethod;
  path: string;
  query: Array<[string, string]>;
  headers: Record<string, string>;
  body: unknown;
  hasBody: boolean;
  expect: ApiExpect;
  save: Array<[string, string]>;
  criteria: string[];
}
interface Plan {
  host: string;
  port: number;
  headers: Record<string, string>;
  steps: PlanStep[];
  stepTimeoutMs: number;
  timeoutMs: number;
  // Kaydedilen değişkenlerden Authorization başlığında kullanılanlar: değerleri alındığı anda maskelenir.
  authVars: Set<string>;
  authLiterals: string[];
}

// Yol kuralı hem çalıştırmadan önce hem yer tutucular dolduktan SONRA uygulanır.
export function checkApiPath(path: string): string | null {
  if (path.length === 0 || path.length > 500) return "path must be 1 to 500 characters";
  if (!path.startsWith("/")) return "path must start with /";
  if (path.includes("..")) return "path must not contain ..";
  if (path.includes("\\")) return "path must not contain a backslash";
  if (path.includes("//")) return "path must not contain //";
  if (path.split("/").includes(".")) return "path must not contain a single-dot segment";
  if (/[\u0000- \u007f-\u009f?#]/.test(path)) return "path must not contain control characters, spaces, ? or #";
  if (BAD_ENCODING.test(path)) return "path must not contain encoded dots, slashes or control characters";
  return null;
}

function placeholdersIn(s: string): string[] {
  return [...s.matchAll(PLACEHOLDER)].map((m) => m[1] as string);
}

function walkStrings(v: unknown, fn: (s: string) => void, depth = 0): void {
  if (depth > 12) throw new LabSpecError("body is nested too deep");
  if (typeof v === "string") fn(v);
  else if (Array.isArray(v)) for (const x of v) walkStrings(x, fn, depth + 1);
  else if (v !== null && typeof v === "object") for (const x of Object.values(v)) walkStrings(x, fn, depth + 1);
}

function mapStrings(v: unknown, fn: (s: string) => string): unknown {
  if (typeof v === "string") return fn(v);
  if (Array.isArray(v)) return v.map((x) => mapStrings(x, fn));
  if (v !== null && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapStrings(x, fn)]));
  return v;
}

function strRecord(v: unknown, where: string, maxEntries: number, maxLen: number): Record<string, string> {
  if (v === undefined) return {};
  const o = plainObject(v, where, Object.keys(v !== null && typeof v === "object" ? v : {}));
  const entries = Object.entries(o);
  if (entries.length > maxEntries) throw new LabSpecError(`${where} has more than ${maxEntries} entries`);
  const out: Record<string, string> = {};
  for (const [k, x] of entries) {
    if (k === "__proto__") throw new LabSpecError(`${where}: key not allowed`);
    out[k] = reqString(x, `${where}.${cleanText(k, 40)}`, maxLen);
  }
  return out;
}

function headerRecord(v: unknown, where: string): Record<string, string> {
  const raw = strRecord(v, where, 10, 1000);
  const out: Record<string, string> = {};
  for (const [k, x] of Object.entries(raw)) {
    const name = k.toLowerCase();
    if (name === "host") throw new LabSpecError(`${where}: the Host header cannot be set`);
    if (!(ALLOWED_HEADERS as readonly string[]).includes(name)) throw new LabSpecError(`${where}: header ${cleanText(k, 40)} is not allowed (allowed: ${ALLOWED_HEADERS.join(", ")})`);
    if (Object.hasOwn(out, name)) throw new LabSpecError(`${where}: header ${name} is given twice`);
    out[name] = x;
  }
  return out;
}

export interface ApiValidateOptions {
  // Hedef olamayacak portlar (ör. AgentMom'un kendi dinlediği port).
  forbiddenPorts?: readonly number[];
}

export function validateApiRequest(input: unknown, opts?: ApiValidateOptions): Plan {
  const o = plainObject(input, "spec", ["baseUrl", "headers", "steps", "stepTimeoutMs", "timeoutMs"]);
  const m = typeof o.baseUrl === "string" ? BASE_RE.exec(o.baseUrl) : null;
  if (!m) throw new LabSpecError("baseUrl must be http://127.0.0.1:<port>, http://localhost:<port> or http://[::1]:<port>");
  const port = Number(m[2]);
  if (port < 1 || port > 65535) throw new LabSpecError("baseUrl port must be between 1 and 65535");
  if (opts?.forbiddenPorts?.includes(port)) throw new LabSpecError("baseUrl must not point at AgentMom's own port (kendi portu)");
  const host = m[1] === "[::1]" ? "::1" : (m[1] as string);
  const baseHeaders = headerRecord(o.headers, "headers");
  if (!Array.isArray(o.steps) || o.steps.length === 0 || o.steps.length > MAX_STEPS) throw new LabSpecError(`spec.steps must list 1 to ${MAX_STEPS} steps`);
  const declared = new Set<string>();
  const authVars = new Set<string>();
  const authLiterals: string[] = [];
  if (baseHeaders.authorization) {
    authLiterals.push(baseHeaders.authorization);
    if (placeholdersIn(baseHeaders.authorization).length) throw new LabSpecError("headers: placeholders are only allowed inside steps");
  }
  const steps = o.steps.map((raw, i): PlanStep => {
    const where = `steps[${i}]`;
    const s = plainObject(raw, where, ["name", "method", "path", "query", "headers", "body", "expect", "save", "criteria"]);
    if (typeof s.method !== "string" || !(API_METHODS as readonly string[]).includes(s.method)) throw new LabSpecError(`${where}.method must be one of ${API_METHODS.join(", ")}`);
    const method = s.method as ApiMethod;
    const path = reqString(s.path, `${where}.path`, 500);
    const pathProblem = checkApiPath(path);
    if (pathProblem) throw new LabSpecError(`${where}: ${pathProblem}`);
    const query = strRecord(s.query, `${where}.query`, 20, 500);
    for (const k of Object.keys(query)) if (!QUERY_KEY.test(k)) throw new LabSpecError(`${where}.query: bad key ${cleanText(k, 40)}`);
    const headers = headerRecord(s.headers, `${where}.headers`);
    const hasBody = s.body !== undefined;
    let body: unknown;
    if (hasBody) {
      if (method === "GET" || method === "HEAD") throw new LabSpecError(`${where}: ${method} cannot have a body`);
      let text: string;
      try {
        text = JSON.stringify(s.body);
      } catch {
        throw new LabSpecError(`${where}.body must be plain JSON data`);
      }
      if (typeof text !== "string" || Buffer.byteLength(text) > MAX_BODY_BYTES) throw new LabSpecError(`${where}.body must be JSON of at most ${MAX_BODY_BYTES / 1024} KiB`);
      body = JSON.parse(text);
    }
    // Yer tutucular yalnız path / query değerleri / başlık değerleri / gövde dizgilerinde ve yalnız ÖNCEKİ adımlarda kaydedilmiş değişkenler için geçerlidir.
    const used = new Set<string>();
    for (const t of [path, ...Object.values(query), ...Object.values(headers)]) for (const n of placeholdersIn(t)) used.add(n);
    if (hasBody) walkStrings(body, (t) => placeholdersIn(t).forEach((n) => used.add(n)));
    for (const n of used) if (!declared.has(n)) throw new LabSpecError(`${where}: variable ${n} is not saved by an earlier step`);
    if (headers.authorization) {
      authLiterals.push(headers.authorization);
      for (const n of placeholdersIn(headers.authorization)) authVars.add(n);
    }
    const e = plainObject(s.expect, `${where}.expect`, ["status", "headerEquals", "json", "bodyContains", "maxMs"]);
    const statusOk = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 100 && n <= 599;
    if (!(statusOk(e.status) || (Array.isArray(e.status) && e.status.length > 0 && e.status.length <= 20 && e.status.every(statusOk)))) throw new LabSpecError(`${where}.expect.status must be a status code or a list of up to 20 status codes`);
    const expect: ApiExpect = { status: e.status as number | number[] };
    if (e.headerEquals !== undefined) expect.headerEquals = Object.fromEntries(Object.entries(strRecord(e.headerEquals, `${where}.expect.headerEquals`, 20, 500)).map(([k, v]) => [k.toLowerCase(), v]));
    if (e.json !== undefined) {
      if (!Array.isArray(e.json) || e.json.length > 50) throw new LabSpecError(`${where}.expect.json must be a list of at most 50 rules`);
      expect.json = e.json.map((r) => validateRule(r));
    }
    if (e.bodyContains !== undefined) expect.bodyContains = reqString(e.bodyContains, `${where}.expect.bodyContains`, 500);
    if (e.maxMs !== undefined) expect.maxMs = boundedMs(e.maxMs, `${where}.expect.maxMs`, MAX_TOTAL_TIMEOUT_MS, 0);
    const saveRaw = strRecord(s.save, `${where}.save`, 20, 200);
    const save: Array<[string, string]> = Object.entries(saveRaw).map(([name, p]) => {
      if (!VAR_NAME.test(name)) throw new LabSpecError(`${where}.save: bad variable name ${cleanText(name, 40)}`);
      if (parsePath(p).some((g) => g.t === "all")) throw new LabSpecError(`${where}.save: a saved path must not contain [*]`);
      return [name, p];
    });
    for (const [name] of save) declared.add(name);
    return { name: reqString(s.name, `${where}.name`, 200), method, path, query: Object.entries(query), headers, body, hasBody, expect, save, criteria: criteriaIds(s.criteria, where) };
  });
  return {
    host,
    port,
    headers: baseHeaders,
    steps,
    stepTimeoutMs: boundedMs(o.stepTimeoutMs, "spec.stepTimeoutMs", MAX_STEP_TIMEOUT_MS, 5000),
    timeoutMs: boundedMs(o.timeoutMs, "spec.timeoutMs", MAX_TOTAL_TIMEOUT_MS, 30_000),
    authVars,
    authLiterals,
  };
}

interface Reply {
  status: number;
  headers: Record<string, string>;
  text: string;
  truncated: boolean;
  ms: number;
}

class StepProblem extends Error {
  readonly kind: "input" | "timeout" | "network" | "cancelled";
  constructor(kind: StepProblem["kind"], message: string) {
    super(message);
    this.kind = kind;
  }
}

export class ApiLabProvider implements VerificationProvider<ApiLabRequest> {
  readonly id = "api-lab";

  // Girdi hatası çalışmadan ÖNCE LabSpecError olarak fırlar.
  run(request: ApiLabRequest, opts?: ApiValidateOptions): VerificationHandle {
    const plan = validateApiRequest(request, opts);
    const runId = randomUUID();
    const state: { cancelled: boolean; current?: ClientRequest } = { cancelled: false };
    const result = this.execute(plan, state);
    return {
      runId,
      result,
      cancel: async () => {
        state.cancelled = true;
        state.current?.destroy();
        await result;
      },
    };
  }

  private send(plan: Plan, step: PlanStep, headers: Record<string, string>, path: string, payload: string | undefined, timeoutMs: number, state: { cancelled: boolean; current?: ClientRequest }): Promise<Reply> {
    return new Promise((resolve, reject) => {
      const t0 = Date.now();
      let settled = false;
      const done = (fn: () => void): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn();
      };
      const req = httpRequest({ host: plan.host, port: plan.port, method: step.method, path, headers, agent: false }, (res) => {
        const chunks: Buffer[] = [];
        let size = 0;
        let truncated = false;
        const finish = (): void =>
          done(() => {
            const h: Record<string, string> = {};
            for (const [k, v] of Object.entries(res.headers)) if (v !== undefined) h[k] = Array.isArray(v) ? v.join(", ") : v;
            resolve({ status: res.statusCode ?? 0, headers: h, text: Buffer.concat(chunks).toString("utf8"), truncated, ms: Date.now() - t0 });
          });
        res.on("data", (c: Buffer) => {
          if (settled) return;
          const room = MAX_RESPONSE_BYTES - size;
          if (c.length > room) {
            chunks.push(c.subarray(0, room));
            size += room;
            truncated = true;
            finish();
            res.destroy();
            return;
          }
          chunks.push(c);
          size += c.length;
        });
        res.on("end", finish);
        res.on("error", (e) => done(() => reject(new StepProblem("network", e.message))));
        res.on("close", () => {
          if (!res.complete) done(() => reject(new StepProblem("network", "the connection closed before the response was complete")));
        });
      });
      const timer = setTimeout(() => {
        done(() => reject(new StepProblem("timeout", `no complete response within ${timeoutMs} ms`)));
        req.destroy();
      }, timeoutMs);
      state.current = req;
      req.on("error", (e) =>
        done(() => {
          if (state.cancelled) reject(new StepProblem("cancelled", "cancelled"));
          else reject(new StepProblem("network", e.message));
        }),
      );
      if (payload !== undefined) req.write(payload);
      req.end();
    });
  }

  private async execute(plan: Plan, state: { cancelled: boolean; current?: ClientRequest }): Promise<RunResult> {
    const started = Date.now();
    const deadline = started + plan.timeoutMs;
    const vars = new Map<string, string>();
    const secrets = new Set<string>();
    const addSecret = (value: string): void => {
      if (value.length === 0) return;
      secrets.add(value);
      const sp = value.indexOf(" ");
      if (sp >= 0 && value.length - sp - 1 >= 3) secrets.add(value.slice(sp + 1));
    };
    for (const lit of plan.authLiterals) addSecret(lit);
    // Önce tam eşleşen sırlar (en uzun önce), sonra "Bearer <belirteç>" kalıbı maskelenir; kesme/kısaltma HER ZAMAN maskelemeden sonra yapılır.
    const mask = (text: string): string => {
      let s = text;
      for (const sec of [...secrets].sort((a, b) => b.length - a.length)) if (s.includes(sec)) s = s.split(sec).join("[gizli]");
      return s.replace(BEARER, "Bearer [gizli]");
    };
    const mk = (i: number, d: TestDraft): TestResult => mkTest(i, { ...d, name: mask(d.name), ...(d.message !== undefined ? { message: mask(d.message) } : {}), ...(d.detail !== undefined ? { detail: mask(d.detail) } : {}) });
    // Sonuçlar tembel kurulur: tüm adımlar bittiğinde (sonradan öğrenilen sırlar dahil) son bir maskeleme geçişiyle üretilir.
    const pending: Array<() => TestResult> = [];
    const lines: string[] = [];
    let status: RunStatus | undefined;
    let requests = 0;
    let truncatedBodies = 0;

    const fill = (s: string, encode: boolean): string =>
      s.replace(PLACEHOLDER, (_m, name: string) => {
        const v = vars.get(name);
        if (v === undefined) throw new StepProblem("input", `variable ${name} is not available (the step that saves it did not provide it)`);
        return encode ? encodeURIComponent(v) : v;
      });

    for (const [i, step] of plan.steps.entries()) {
      const name = tagName(step.name, step.criteria);
      const criteria = criteriaFor(name);
      const base = { suite: "api", name, criteria };
      if (state.cancelled || Date.now() >= deadline) {
        if (!state.cancelled) status = "timed_out";
        pending.push(() => mk(i, { ...base, outcome: "skipped", durationMs: 0 }));
        continue;
      }
      const t0 = Date.now();
      try {
        const path = fill(step.path, true);
        const pathProblem = checkApiPath(path);
        if (pathProblem) throw new StepProblem("input", `the path is not allowed after variable substitution: ${pathProblem}`);
        const qs = new URLSearchParams();
        for (const [k, v] of step.query) qs.append(k, fill(v, false));
        const fullPath = qs.size ? `${path}?${qs.toString()}` : path;
        const headers: Record<string, string> = {};
        for (const [k, v] of Object.entries({ ...plan.headers, ...step.headers })) {
          const val = fill(v, false);
          if (/[\u0000-\u001f\u007f]/.test(val)) throw new StepProblem("input", `header ${k} contains control characters after variable substitution`);
          headers[k] = val;
        }
        if (headers.authorization) addSecret(headers.authorization);
        let payload: string | undefined;
        if (step.hasBody) {
          payload = JSON.stringify(mapStrings(step.body, (s) => fill(s, false)));
          if (Buffer.byteLength(payload) > MAX_BODY_BYTES) throw new StepProblem("input", "the request body is too large after variable substitution");
          if (!headers["content-type"]) headers["content-type"] = "application/json";
          headers["content-length"] = String(Buffer.byteLength(payload));
        }
        headers.connection = "close";
        const stepTimeout = Math.max(1, Math.min(plan.stepTimeoutMs, deadline - Date.now()));
        requests++;
        let reply: Reply;
        try {
          reply = await this.send(plan, step, headers, fullPath, payload, stepTimeout, state);
        } finally {
          delete state.current;
        }
        if (reply.truncated) truncatedBodies++;
        lines.push(`${step.method} ${path} -> ${reply.status} ${reply.ms} ms${reply.truncated ? " (body truncated at 1 MiB)" : ""}`);

        const violations: string[] = [];
        const wanted = Array.isArray(step.expect.status) ? step.expect.status : [step.expect.status];
        if (!wanted.includes(reply.status)) violations.push(`status ${reply.status}, expected ${wanted.join(" or ")}`);
        for (const [h, v] of Object.entries(step.expect.headerEquals ?? {})) {
          const got = reply.headers[h];
          if (got !== v) violations.push(`header ${h} is ${got === undefined ? "missing" : JSON.stringify(cleanText(h === "authorization" ? "[gizli]" : got, 80))}, expected ${JSON.stringify(cleanText(v, 80))}`);
        }
        if (step.expect.bodyContains !== undefined && !reply.text.includes(step.expect.bodyContains)) violations.push("the response body does not contain the expected text");
        if (step.expect.maxMs !== undefined && step.expect.maxMs > 0 && reply.ms > step.expect.maxMs) violations.push(`took ${reply.ms} ms, limit ${step.expect.maxMs} ms`);
        let parsed: { ok: true; value: unknown } | { ok: false } | null = null;
        const json = (): { ok: true; value: unknown } | { ok: false } => {
          if (parsed) return parsed;
          if (reply.truncated) return (parsed = { ok: false });
          try {
            parsed = { ok: true, value: JSON.parse(reply.text) };
          } catch {
            parsed = { ok: false };
          }
          return parsed;
        };
        if (step.expect.json?.length) {
          const j = json();
          if (!j.ok) violations.push(reply.truncated ? "the response body was truncated, so it cannot be checked as JSON" : "the response body is not valid JSON");
          else
            for (const rule of step.expect.json) {
              const r = evaluateRule(rule, j.value, { deadline });
              if (!r.ok) {
                violations.push(r.detail);
                break;
              }
            }
        }
        for (const [varName, p] of step.save) {
          const j = json();
          const hit = j.ok ? resolveSegs(j.value, parsePath(p))[0] : undefined;
          if (!hit || !hit.found || !["string", "number", "boolean"].includes(typeof hit.value)) {
            violations.push(`cannot save ${varName}: ${p} is missing or not a plain value in the response`);
            continue;
          }
          const text = String(hit.value);
          if (text.length > 500) {
            violations.push(`cannot save ${varName}: the value is longer than 500 characters`);
            continue;
          }
          vars.set(varName, text);
          if (plan.authVars.has(varName) || text.length >= 6) addSecret(text);
        }
        const dur = Date.now() - t0;
        if (violations.length === 0) pending.push(() => mk(i, { ...base, outcome: "passed", durationMs: dur }));
        else {
          const rawHead = reply.text.slice(0, 2000);
          const code = reply.status;
          pending.push(() => {
            const excerpt = rawHead.length > 0 ? ` | response: ${redactString(mask(rawHead)).slice(0, 200)}` : "";
            return mk(i, { ...base, outcome: "failed", durationMs: dur, message: violations[0] as string, detail: `${violations.slice(1).join("; ")}${violations.length > 1 ? " " : ""}[${step.method} ${path} -> ${code}]${excerpt}` });
          });
        }
      } catch (e) {
        const dur = Date.now() - t0;
        if (e instanceof StepProblem) {
          if (e.kind === "cancelled") {
            pending.push(() => mk(i, { ...base, outcome: "skipped", durationMs: dur }));
            continue;
          }
          if (e.kind === "timeout" && Date.now() >= deadline - 5) status = "timed_out";
          lines.push(`${step.method} ${step.path} -> ${e.kind}`);
          pending.push(() => mk(i, { ...base, outcome: "error", durationMs: dur, message: e.kind === "timeout" ? "the request timed out" : e.kind === "network" ? "the request could not be completed" : "the step could not be prepared", detail: e.message }));
        } else {
          pending.push(() => mk(i, { ...base, outcome: "error", durationMs: dur, message: "the step could not be evaluated", detail: e instanceof Error ? e.message : String(e) }));
        }
      }
    }

    const tests = pending.map((p) => p());
    const evidence: EvidenceItem[] = [{ id: "api-log", kind: "log", summary: mask(lines.join("\n")) || "no requests were sent" }];
    for (const t of tests) if (t.outcome === "failed" || t.outcome === "error") t.evidenceRefs = [evidence[0]!.id];
    return mkRun(this.id, started, tests, evidence, { lab: "api", target: `${plan.host}:${plan.port}`, steps: plan.steps.length, requests, truncatedBodies }, state.cancelled ? "cancelled" : status);
  }
}
