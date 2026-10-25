// Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Doğrulama laboratuvarı D6a: ortak bildirimsel kural dili ve laboratuvarların paylaştığı küçük yardımcılar.
// Kurallar VERİDİR, kod değildir: regex yok, eval yok, yol çözücü yalnız kendi (own) özelliklere bakar.
import { randomUUID } from "node:crypto";
import { redact, redactString } from "../../core/audit/redact.ts";
import { VERIFY_SCHEMA_VERSION, totalsOf } from "../schema.ts";
import type { EvidenceItem, Outcome, RunResult, RunStatus, TestResult } from "../schema.ts";

export class LabSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LabSpecError";
  }
}

export const MAX_PATH_DEPTH = 12;
export const MAX_RESULTS = 1000;
export const MAX_RULE_NODES = 200;
export const MAX_RULE_DEPTH = 8;
export const MAX_VALUE_CHARS = 500;
// Değerlendirme bütçesi: bir evaluateRule çağrısında ziyaret edilen öğe/düğüm sayısı ve (isteğe bağlı) son an. Aşınca RuleBudgetError fırlar.
export const MAX_EVAL_STEPS = 5_000_000;

export class RuleBudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RuleBudgetError";
  }
}

export interface EvalOptions {
  deadline?: number;
  maxSteps?: number;
}

class Budget {
  steps = 0;
  private nextClock = 1024;
  readonly max: number;
  readonly deadline: number | undefined;
  constructor(opts: EvalOptions | undefined) {
    this.max = opts?.maxSteps ?? MAX_EVAL_STEPS;
    this.deadline = opts?.deadline;
  }
  charge(n = 1): void {
    this.steps += n;
    if (this.steps > this.max) throw new RuleBudgetError(`kural değerlendirme bütçesi aşıldı (en çok ${this.max} adım)`);
    if (this.deadline !== undefined && this.steps >= this.nextClock) {
      this.nextClock = this.steps + 1024;
      if (Date.now() > this.deadline) throw new RuleBudgetError("kural değerlendirme bütçesi aşıldı (süre doldu)");
    }
  }
}

// ---------- ortak metin/sonuç yardımcıları ----------

const CONTROL = /[\u0000-\u001f\u007f-\u009f]/g;

// Sır taraması, kontrol karakteri temizliği ve uzunluk sınırı: laboratuvardan çıkan her serbest metin buradan geçer.
export function cleanText(value: unknown, max = 300): string {
  const raw = typeof value === "string" ? value : String(value);
  const s = redactString(raw.length > 20_000 ? raw.slice(0, 20_000) : raw).replace(CONTROL, " ");
  return s.length > max ? `${s.slice(0, Math.max(0, max - 1))}…` : s;
}

export const CRITERION_ID = /^[A-Za-z0-9_-]{1,40}$/;

export function criteriaIds(v: unknown, where: string): string[] {
  if (v === undefined) return [];
  if (!Array.isArray(v) || v.length > 10 || !v.every((c) => typeof c === "string" && CRITERION_ID.test(c))) throw new LabSpecError(`${where}: criteria must be up to 10 criterion ids`);
  return v as string[];
}

// Ölçüt eşlemesi provider.ts'deki criteriaFor ile yapılır; bu yardımcı yalnız adın sonuna eksik [ac:<id>] etiketlerini ekler.
export function tagName(name: string, criteria: string[]): string {
  const tags = criteria.filter((id) => !name.includes(`[ac:${id}]`)).map((id) => ` [ac:${id}]`).join("");
  return `${cleanText(name, 200)}${tags}`;
}

export function reqString(v: unknown, where: string, max: number): string {
  if (typeof v !== "string" || v.length === 0 || v.length > max) throw new LabSpecError(`${where} must be a non-empty string of at most ${max} characters`);
  if (CONTROL.test(v)) {
    CONTROL.lastIndex = 0;
    throw new LabSpecError(`${where} must not contain control characters`);
  }
  CONTROL.lastIndex = 0;
  return v;
}

export function plainObject(v: unknown, where: string, allowed: readonly string[]): Record<string, unknown> {
  if (v === null || typeof v !== "object" || Array.isArray(v)) throw new LabSpecError(`${where} must be an object`);
  const o = v as Record<string, unknown>;
  for (const k of Object.keys(o)) if (!allowed.includes(k)) throw new LabSpecError(`${where}: unknown field ${cleanText(k, 40)}`);
  return o;
}

export function boundedMs(v: unknown, where: string, max: number, dflt: number): number {
  if (v === undefined) return dflt;
  if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > max) throw new LabSpecError(`${where} must be an integer between 1 and ${max}`);
  return v;
}

export interface TestDraft {
  suite: string | null;
  name: string;
  outcome: Outcome;
  durationMs: number;
  message?: string;
  detail?: string;
  criteria?: string[];
  evidenceRefs?: string[];
}

// failed => ürün hatası, error => araç/girdi hatası (infra): sınıflandırma şemaya göre burada tek yerden verilir.
export function mkTest(index: number, d: TestDraft): TestResult {
  const failing = d.outcome === "failed" || d.outcome === "error";
  return {
    id: `t${index + 1}`,
    suite: d.suite,
    name: cleanText(d.name, 240),
    outcome: d.outcome,
    durationMs: Math.max(0, Math.round(d.durationMs)),
    error: failing ? { message: cleanText(d.message ?? "failed", 300), ...(d.detail ? { detail: cleanText(d.detail, 1000) } : {}) } : null,
    criteria: d.criteria ?? [],
    classification: failing ? (d.outcome === "failed" ? "product_defect" : "infra") : null,
    evidenceRefs: d.evidenceRefs ?? [],
    attempts: 1,
  };
}

const PROVIDER_DATA_MAX = 50_000;

export function mkRun(provider: string, startedMs: number, tests: TestResult[], evidence: EvidenceItem[], providerData: Record<string, unknown>, forced?: RunStatus): RunResult {
  const totals = totalsOf(tests);
  const status: RunStatus = forced ?? (totals.error > 0 ? "error" : totals.failed > 0 ? "failed" : "passed");
  let data = redact(providerData) as Record<string, unknown>;
  if (JSON.stringify(data).length > PROVIDER_DATA_MAX) data = { truncated: true };
  const ended = Date.now();
  return {
    schemaVersion: VERIFY_SCHEMA_VERSION,
    runId: randomUUID(),
    provider,
    startedAt: new Date(startedMs).toISOString(),
    endedAt: new Date(ended).toISOString(),
    durationMs: Math.max(0, ended - startedMs),
    status,
    tests,
    evidence: evidence.map((e) => ({ ...e, summary: cleanText(e.summary, 4000) })),
    totals,
    environment: { node: process.version, platform: process.platform },
    providerData: data,
  };
}

// ---------- yol çözücü ----------

const BANNED_KEYS = new Set(["__proto__", "constructor", "prototype"]);
const KEY_RE = /^[A-Za-z0-9_-]{1,64}$/;

export type Seg = { t: "key"; key: string } | { t: "idx"; idx: number } | { t: "all" };

export function isBannedKey(k: string): boolean {
  return BANNED_KEYS.has(k);
}

// Sözdizimi: a.b[0].c[*].d  (baştaki "$" kökü belirtir). Anahtarlar yalnız [A-Za-z0-9_-].
export function parsePath(path: string): Seg[] {
  if (typeof path !== "string" || path.length === 0 || path.length > 200) throw new LabSpecError("path must be a non-empty string of at most 200 characters");
  const segs: Seg[] = [];
  let i = 0;
  let bareKeyOk = true;
  if (path[0] === "$") {
    i = 1;
    bareKeyOk = false;
  }
  const n = path.length;
  while (i < n) {
    const c = path[i] as string;
    if (c === "[") {
      const end = path.indexOf("]", i);
      if (end < 0) throw new LabSpecError(`path "${cleanText(path, 60)}": missing ]`);
      const inner = path.slice(i + 1, end);
      if (inner === "*") segs.push({ t: "all" });
      else if (/^\d{1,6}$/.test(inner)) segs.push({ t: "idx", idx: Number(inner) });
      else throw new LabSpecError(`path "${cleanText(path, 60)}": bad index`);
      i = end + 1;
    } else {
      if (c === ".") {
        if (segs.length === 0 && bareKeyOk) throw new LabSpecError(`path "${cleanText(path, 60)}": leading dot`);
        i++;
        if (i >= n) throw new LabSpecError(`path "${cleanText(path, 60)}": trailing dot`);
      } else if (!bareKeyOk) {
        throw new LabSpecError(`path "${cleanText(path, 60)}": unexpected character`);
      }
      let j = i;
      while (j < n && /[A-Za-z0-9_-]/.test(path[j] as string)) j++;
      const key = path.slice(i, j);
      if (!KEY_RE.test(key)) throw new LabSpecError(`path "${cleanText(path, 60)}": bad key`);
      if (isBannedKey(key)) throw new LabSpecError(`path "${cleanText(path, 60)}": key ${key} is not allowed`);
      segs.push({ t: "key", key });
      i = j;
    }
    bareKeyOk = false;
    if (segs.length > MAX_PATH_DEPTH) throw new LabSpecError(`path is deeper than ${MAX_PATH_DEPTH}`);
  }
  return segs;
}

export interface Hit {
  path: string;
  found: boolean;
  value: unknown;
}

function isPlain(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function resolveSegs(subject: unknown, segs: Seg[], budget?: Budget): Hit[] {
  let cur: Hit[] = [{ path: "$", found: true, value: subject }];
  for (const seg of segs) {
    const next: Hit[] = [];
    for (const h of cur) {
      budget?.charge();
      if (!h.found) {
        next.push(h);
        continue;
      }
      if (seg.t === "key") {
        if (isPlain(h.value) && Object.hasOwn(h.value, seg.key)) next.push({ path: `${h.path}.${seg.key}`, found: true, value: h.value[seg.key] });
        else next.push({ path: `${h.path}.${seg.key}`, found: false, value: undefined });
      } else if (seg.t === "idx") {
        if (Array.isArray(h.value) && seg.idx < h.value.length) next.push({ path: `${h.path}[${seg.idx}]`, found: true, value: h.value[seg.idx] });
        else next.push({ path: `${h.path}[${seg.idx}]`, found: false, value: undefined });
      } else if (Array.isArray(h.value)) {
        h.value.forEach((v, idx) => next.push({ path: `${h.path}[${idx}]`, found: true, value: v }));
      } else {
        next.push({ path: `${h.path}[*]`, found: false, value: undefined });
      }
      if (next.length > MAX_RESULTS) throw new LabSpecError(`a path matched more than ${MAX_RESULTS} nodes`);
    }
    cur = next;
  }
  return cur;
}

export function resolvePath(subject: unknown, path: string, budget?: Budget): Hit[] {
  return resolveSegs(subject, parsePath(path), budget);
}

// ---------- kural şeması ----------

export const RULE_OPS = ["exists", "absent", "equals", "notEquals", "gt", "gte", "lt", "lte", "in", "startsWith", "endsWith", "contains", "unique", "sorted", "equalsPath", "sumEqualsPath", "lengthBetween", "type"] as const;
export type RuleOp = (typeof RULE_OPS)[number];

export interface LeafRule {
  op: RuleOp;
  path: string;
  value?: unknown;
  path2?: string;
  key?: string;
  order?: "asc" | "desc";
}
export type Rule = LeafRule | { all: Rule[] } | { any: Rule[] } | { not: Rule } | { implies: { if: Rule; then: Rule } };

const VALUE_OPS = new Set<RuleOp>(["equals", "notEquals", "gt", "gte", "lt", "lte", "in", "startsWith", "endsWith", "contains", "lengthBetween", "type"]);
const KEY_OPS = new Set<RuleOp>(["unique", "sorted", "sumEqualsPath"]);
const PATH2_OPS = new Set<RuleOp>(["equalsPath", "sumEqualsPath"]);
const TYPE_NAMES = ["string", "number", "boolean", "null", "array", "object"];

function copyJson(v: unknown, depth: number, where: string): unknown {
  if (depth > 6) throw new LabSpecError(`${where}: value is nested too deep`);
  if (v === null || typeof v === "boolean") return v;
  if (typeof v === "string") return v;
  if (typeof v === "number") {
    if (!Number.isFinite(v)) throw new LabSpecError(`${where}: numbers must be finite`);
    return v;
  }
  if (Array.isArray(v)) return v.map((x) => copyJson(x, depth + 1, where));
  if (isPlain(v)) {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) {
      if (isBannedKey(k)) throw new LabSpecError(`${where}: key ${k} is not allowed`);
      out[k] = copyJson(x, depth + 1, where);
    }
    return out;
  }
  throw new LabSpecError(`${where}: value must be plain JSON data`);
}

function checkValue(op: RuleOp, v: unknown, where: string): unknown {
  if (v === undefined) throw new LabSpecError(`${where}: ${op} needs a value`);
  const c = copyJson(v, 0, where);
  const size = typeof c === "string" ? c.length : JSON.stringify(c).length;
  if (size > MAX_VALUE_CHARS) throw new LabSpecError(`${where}: value is longer than ${MAX_VALUE_CHARS} characters`);
  if (["gt", "gte", "lt", "lte"].includes(op) && typeof c !== "number") throw new LabSpecError(`${where}: ${op} needs a number`);
  if ((op === "startsWith" || op === "endsWith") && typeof c !== "string") throw new LabSpecError(`${where}: ${op} needs a string`);
  if (op === "in" && (!Array.isArray(c) || c.length === 0 || c.length > 100)) throw new LabSpecError(`${where}: in needs a list of 1 to 100 values`);
  if (op === "type" && (typeof c !== "string" || !TYPE_NAMES.includes(c))) throw new LabSpecError(`${where}: type must be one of ${TYPE_NAMES.join(", ")}`);
  if (op === "lengthBetween") {
    if (!Array.isArray(c) || c.length !== 2 || !c.every((x) => typeof x === "number" && Number.isInteger(x) && x >= 0) || (c[0] as number) > (c[1] as number)) throw new LabSpecError(`${where}: lengthBetween needs [min, max] with 0 <= min <= max`);
  }
  return c;
}

export function validateRule(input: unknown): Rule {
  const counter = { nodes: 0 };
  return validateNode(input, 1, counter, "rule");
}

function validateNode(input: unknown, depth: number, counter: { nodes: number }, where: string): Rule {
  if (depth > MAX_RULE_DEPTH) throw new LabSpecError(`${where}: rule tree is deeper than ${MAX_RULE_DEPTH}`);
  if (++counter.nodes > MAX_RULE_NODES) throw new LabSpecError(`rule tree has more than ${MAX_RULE_NODES} nodes`);
  if (!isPlain(input)) throw new LabSpecError(`${where} must be an object`);
  const keys = Object.keys(input);
  if ("all" in input || "any" in input) {
    const k = "all" in input ? "all" : "any";
    if (keys.length !== 1) throw new LabSpecError(`${where}: ${k} takes no other fields`);
    const list = input[k];
    if (!Array.isArray(list) || list.length === 0 || list.length > MAX_RULE_NODES) throw new LabSpecError(`${where}: ${k} needs a non-empty list`);
    const children = list.map((c, i) => validateNode(c, depth + 1, counter, `${where}.${k}[${i}]`));
    return k === "all" ? { all: children } : { any: children };
  }
  if ("not" in input) {
    if (keys.length !== 1) throw new LabSpecError(`${where}: not takes no other fields`);
    return { not: validateNode(input.not, depth + 1, counter, `${where}.not`) };
  }
  if ("implies" in input) {
    if (keys.length !== 1) throw new LabSpecError(`${where}: implies takes no other fields`);
    const im = plainObject(input.implies, `${where}.implies`, ["if", "then"]);
    if (im.if === undefined || im.then === undefined) throw new LabSpecError(`${where}.implies needs if and then`);
    return { implies: { if: validateNode(im.if, depth + 1, counter, `${where}.implies.if`), then: validateNode(im.then, depth + 1, counter, `${where}.implies.then`) } };
  }
  const op = input.op;
  if (typeof op !== "string" || !(RULE_OPS as readonly string[]).includes(op)) throw new LabSpecError(`${where}: unknown rule type`);
  const o = op as RuleOp;
  const allowed = ["op", "path", ...(VALUE_OPS.has(o) ? ["value"] : []), ...(PATH2_OPS.has(o) ? ["path2"] : []), ...(KEY_OPS.has(o) ? ["key"] : []), ...(o === "sorted" ? ["order"] : [])];
  for (const k of keys) if (!allowed.includes(k)) throw new LabSpecError(`${where}: field ${cleanText(k, 40)} is not valid for ${o}`);
  if (typeof input.path !== "string") throw new LabSpecError(`${where}: path is required`);
  parsePath(input.path);
  const out: LeafRule = { op: o, path: input.path };
  if (VALUE_OPS.has(o)) out.value = checkValue(o, input.value, where);
  if (PATH2_OPS.has(o)) {
    if (typeof input.path2 !== "string") throw new LabSpecError(`${where}: ${o} needs path2`);
    if (parsePath(input.path2).some((s) => s.t === "all")) throw new LabSpecError(`${where}: path2 must not contain [*]`);
    out.path2 = input.path2;
  }
  if (input.key !== undefined) {
    if (typeof input.key !== "string" || !KEY_RE.test(input.key) || isBannedKey(input.key)) throw new LabSpecError(`${where}: bad key`);
    out.key = input.key;
  }
  if (input.order !== undefined) {
    if (input.order !== "asc" && input.order !== "desc") throw new LabSpecError(`${where}: order must be asc or desc`);
    out.order = input.order;
  }
  return out;
}

// ---------- değerlendirme ----------

export interface RuleResult {
  ok: boolean;
  detail: string;
}

const SENSITIVE_PATH = /(pass(word|wd)?|secret|token|api[-_]?key|authorization|credential|cookie|private)/i;

function show(v: unknown, path: string): string {
  if (SENSITIVE_PATH.test(path)) return "[gizli]";
  let s: string;
  try {
    s = v === undefined ? "undefined" : JSON.stringify(v);
  } catch {
    s = "[unprintable]";
  }
  return cleanText(s ?? "undefined", 120);
}

function deepEq(a: unknown, b: unknown, bud: Budget, depth = 0): boolean {
  bud.charge();
  if (depth > MAX_PATH_DEPTH) return false;
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => deepEq(x, b[i], bud, depth + 1));
  if (isPlain(a) && isPlain(b)) {
    const ka = Object.keys(a);
    return ka.length === Object.keys(b).length && ka.every((k) => Object.hasOwn(b, k) && deepEq(a[k], b[k], bud, depth + 1));
  }
  return false;
}

// "unique" için kurallı anahtar: deepEq ile aynı eşitlik (anahtar sırası önemsiz). Derinlik sınırını aşan değerler hiçbir şeye eşit sayılmaz (deepEq gibi).
function canon(v: unknown, bud: Budget, uniq: { n: number }, depth = 0): string {
  bud.charge();
  if (depth > MAX_PATH_DEPTH) return `!deep${uniq.n++}`;
  if (v === undefined) return "u";
  if (Array.isArray(v)) return `[${v.map((x) => canon(x, bud, uniq, depth + 1)).join(",")}]`;
  if (isPlain(v)) {
    const keys = Object.keys(v).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${canon(v[k], bud, uniq, depth + 1)}`).join(",")}}`;
  }
  return JSON.stringify(v) ?? "u";
}

function typeOf(v: unknown): string {
  return v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
}

const OK: RuleResult = { ok: true, detail: "" };
const fail = (detail: string): RuleResult => ({ ok: false, detail });

function pick(el: unknown, key: string | undefined): unknown {
  if (key === undefined) return el;
  return isPlain(el) && Object.hasOwn(el, key) ? el[key] : undefined;
}

function evalHit(rule: LeafRule, h: Hit, subject: unknown, bud: Budget): RuleResult {
  const at = h.path;
  const v = h.value;
  switch (rule.op) {
    case "exists":
      return h.found ? OK : fail(`${at} does not exist`);
    case "absent":
      return h.found ? fail(`${at} exists (${show(v, at)})`) : OK;
    default:
      break;
  }
  if (!h.found) return fail(`${at} does not exist`);
  switch (rule.op) {
    case "equals":
      return deepEq(v, rule.value, bud) ? OK : fail(`${at} is ${show(v, at)}, expected ${show(rule.value, at)}`);
    case "notEquals":
      return deepEq(v, rule.value, bud) ? fail(`${at} equals ${show(v, at)} but must not`) : OK;
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      if (typeof v !== "number") return fail(`${at} is not a number (${show(v, at)})`);
      const t = rule.value as number;
      const good = rule.op === "gt" ? v > t : rule.op === "gte" ? v >= t : rule.op === "lt" ? v < t : v <= t;
      return good ? OK : fail(`${at} is ${show(v, at)}, required ${rule.op} ${show(t, at)}`);
    }
    case "in":
      return (rule.value as unknown[]).some((x) => deepEq(x, v, bud)) ? OK : fail(`${at} is ${show(v, at)}, not in the allowed list`);
    case "startsWith":
      return typeof v === "string" && v.startsWith(rule.value as string) ? OK : fail(`${at} (${show(v, at)}) does not start with ${show(rule.value, at)}`);
    case "endsWith":
      return typeof v === "string" && v.endsWith(rule.value as string) ? OK : fail(`${at} (${show(v, at)}) does not end with ${show(rule.value, at)}`);
    case "contains": {
      const ok = typeof v === "string" ? typeof rule.value === "string" && v.includes(rule.value) : Array.isArray(v) && v.some((x) => deepEq(x, rule.value, bud));
      return ok ? OK : fail(`${at} (${show(v, at)}) does not contain ${show(rule.value, at)}`);
    }
    case "unique": {
      if (!Array.isArray(v)) return fail(`${at} is not a list`);
      const seen = new Map<string, number>();
      const uniq = { n: 0 };
      for (let i = 0; i < v.length; i++) {
        const item = pick(v[i], rule.key);
        const k = canon(item, bud, uniq);
        const first = seen.get(k);
        if (first !== undefined) return fail(`${at} has a duplicate: ${show(item, at)} at [${first}] and [${i}]`);
        seen.set(k, i);
      }
      return OK;
    }
    case "sorted": {
      if (!Array.isArray(v)) return fail(`${at} is not a list`);
      const items = v.map((e) => pick(e, rule.key));
      const dir = rule.order === "desc" ? -1 : 1;
      bud.charge(items.length);
      for (let i = 1; i < items.length; i++) {
        const a = items[i - 1];
        const b = items[i];
        const comparable = (typeof a === "number" && typeof b === "number") || (typeof a === "string" && typeof b === "string");
        if (!comparable) return fail(`${at}[${i}] cannot be compared with its predecessor`);
        if ((a as number | string) > (b as number | string) === (dir === 1)) {
          if (a !== b) return fail(`${at} is not sorted ${rule.order ?? "asc"}: ${show(a, at)} before ${show(b, at)} at [${i - 1}]`);
        }
      }
      return OK;
    }
    case "equalsPath": {
      const other = resolvePath(subject, rule.path2 as string, bud);
      const o = other[0];
      if (!o || !o.found) return fail(`${rule.path2} does not exist`);
      return deepEq(v, o.value, bud) ? OK : fail(`${at} is ${show(v, at)} but ${o.path} is ${show(o.value, o.path)}`);
    }
    case "lengthBetween": {
      const [lo, hi] = rule.value as [number, number];
      const len = typeof v === "string" || Array.isArray(v) ? v.length : -1;
      if (len < 0) return fail(`${at} has no length (${typeOf(v)})`);
      return len >= lo && len <= hi ? OK : fail(`${at} has length ${len}, required ${lo} to ${hi}`);
    }
    case "type":
      return typeOf(v) === rule.value ? OK : fail(`${at} is ${typeOf(v)}, expected ${show(rule.value, at)}`);
    default:
      return fail("unsupported rule");
  }
}

function sumOf(rule: LeafRule, hits: Hit[], bud: Budget): { sum: number } | { problem: string } {
  let sum = 0;
  for (const h of hits) {
    if (!h.found) return { problem: `${h.path} does not exist` };
    const items = Array.isArray(h.value) && hits.length === 1 ? h.value : [h.value];
    bud.charge(items.length);
    for (const el of items) {
      const x = pick(el, rule.key);
      if (typeof x !== "number" || !Number.isFinite(x)) return { problem: `${h.path} holds a non-number (${show(x, h.path)})` };
      sum += x;
    }
  }
  return { sum };
}

function evalLeaf(rule: LeafRule, subject: unknown, bud: Budget): RuleResult {
  bud.charge();
  const hits = resolvePath(subject, rule.path, bud);
  if (rule.op === "sumEqualsPath") {
    const s = sumOf(rule, hits, bud);
    if ("problem" in s) return fail(s.problem);
    const other = resolvePath(subject, rule.path2 as string, bud)[0];
    if (!other || !other.found) return fail(`${rule.path2} does not exist`);
    if (typeof other.value !== "number") return fail(`${other.path} is not a number`);
    return Math.abs(s.sum - other.value) < 1e-9 ? OK : fail(`sum of ${rule.path} is ${s.sum}, but ${other.path} is ${show(other.value, other.path)}`);
  }
  for (const h of hits) {
    const r = evalHit(rule, h, subject, bud);
    if (!r.ok) return r;
  }
  return OK;
}

// Bütçe (opts.maxSteps, varsayılan MAX_EVAL_STEPS) ve isteğe bağlı opts.deadline (Date.now tabanlı) aşılırsa RuleBudgetError fırlar.
export function evaluateRule(rule: Rule, subject: unknown, opts?: EvalOptions): RuleResult {
  return evalRule(rule, subject, new Budget(opts));
}

function evalRule(rule: Rule, subject: unknown, bud: Budget): RuleResult {
  bud.charge();
  if ("all" in rule) {
    for (const c of rule.all) {
      const r = evalRule(c, subject, bud);
      if (!r.ok) return r;
    }
    return OK;
  }
  if ("any" in rule) {
    let first = "";
    for (const c of rule.any) {
      const r = evalRule(c, subject, bud);
      if (r.ok) return OK;
      if (!first) first = r.detail;
    }
    return fail(`none of ${rule.any.length} alternatives held; first: ${first}`);
  }
  if ("not" in rule) return evalRule(rule.not, subject, bud).ok ? fail("a negated rule held") : OK;
  if ("implies" in rule) {
    const cond = evalRule(rule.implies.if, subject, bud);
    return cond.ok ? evalRule(rule.implies.then, subject, bud) : OK;
  }
  return evalLeaf(rule, subject, bud);
}
