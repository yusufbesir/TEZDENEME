// Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Doğrulama laboratuvarı D6a / madde 57: durum geçiş laboratuvarı. Bir durum makinesini yapısal olarak denetler, yasak yolları BFS ile arar
// ve verilen olay izlerini oynatır. Yerel, deterministik, modelsiz.
import { randomUUID } from "node:crypto";
import { criteriaFor } from "../provider.ts";
import type { VerificationHandle, VerificationProvider } from "../provider.ts";
import type { RunResult, TestResult } from "../schema.ts";
import { CRITERION_ID, LabSpecError, cleanText, mkRun, mkTest, plainObject, reqString } from "./rules.ts";

export interface Transition {
  from: string;
  event: string;
  to: string;
}
export interface Machine {
  initial: string;
  states: string[];
  final: string[];
  transitions: Transition[];
}
export interface NeverReach {
  from: string;
  to: string;
  name?: string;
}
export interface Trace {
  name: string;
  steps: Array<{ event: string; expect?: string }>;
  expectFinal?: boolean;
}
export interface StateRequest {
  machine: { initial: string; states: string[]; final?: string[]; transitions: Transition[] };
  neverReach?: NeverReach[];
  traces?: Trace[];
  criteria?: Record<string, string[]>;
}

export interface StatePlan {
  machine: Machine;
  neverReach: NeverReach[];
  traces: Trace[];
  criteria?: Record<string, string[]>;
}
// İş akışı doğrulama planındaki satır içi durum makinesi (doğrulanmış biçim).
export type StateSpec = StatePlan;

export const MAX_STATES = 200;
export const MAX_TRANSITIONS = 1000;
export const MAX_TRACES = 50;
export const MAX_TRACE_STEPS = 200;
export const MAX_NEVER_REACH = 100;
const NAME_MAX = 100;

function strList(v: unknown, where: string, max: number): string[] {
  if (!Array.isArray(v) || v.length > max) throw new LabSpecError(`${where} must be a list of at most ${max} names`);
  return v.map((x, i) => reqString(x, `${where}[${i}]`, NAME_MAX));
}

export function validateStateRequest(input: unknown): StatePlan {
  const o = plainObject(input, "spec", ["machine", "neverReach", "traces", "criteria"]);
  const m = plainObject(o.machine, "machine", ["initial", "states", "final", "transitions"]);
  if (!Array.isArray(m.transitions) || m.transitions.length > MAX_TRANSITIONS) throw new LabSpecError(`machine.transitions must be a list of at most ${MAX_TRANSITIONS}`);
  const states = strList(m.states, "machine.states", MAX_STATES);
  if (states.length === 0) throw new LabSpecError("machine.states must not be empty");
  const machine: Machine = {
    initial: reqString(m.initial, "machine.initial", NAME_MAX),
    states,
    final: m.final === undefined ? [] : strList(m.final, "machine.final", MAX_STATES),
    transitions: m.transitions.map((t, i) => {
      const x = plainObject(t, `transitions[${i}]`, ["from", "event", "to"]);
      return { from: reqString(x.from, `transitions[${i}].from`, NAME_MAX), event: reqString(x.event, `transitions[${i}].event`, NAME_MAX), to: reqString(x.to, `transitions[${i}].to`, NAME_MAX) };
    }),
  };
  const nr = o.neverReach === undefined ? [] : o.neverReach;
  if (!Array.isArray(nr) || nr.length > MAX_NEVER_REACH) throw new LabSpecError(`neverReach must be a list of at most ${MAX_NEVER_REACH}`);
  const neverReach = nr.map((raw, i): NeverReach => {
    const x = plainObject(raw, `neverReach[${i}]`, ["from", "to", "name"]);
    return { from: reqString(x.from, `neverReach[${i}].from`, NAME_MAX), to: reqString(x.to, `neverReach[${i}].to`, NAME_MAX), ...(x.name !== undefined ? { name: reqString(x.name, `neverReach[${i}].name`, 200) } : {}) };
  });
  const tr = o.traces === undefined ? [] : o.traces;
  if (!Array.isArray(tr) || tr.length > MAX_TRACES) throw new LabSpecError(`traces must be a list of at most ${MAX_TRACES}`);
  const traces = tr.map((raw, i): Trace => {
    const x = plainObject(raw, `traces[${i}]`, ["name", "steps", "expectFinal"]);
    if (!Array.isArray(x.steps) || x.steps.length > MAX_TRACE_STEPS) throw new LabSpecError(`traces[${i}].steps must be a list of at most ${MAX_TRACE_STEPS}`);
    if (x.expectFinal !== undefined && typeof x.expectFinal !== "boolean") throw new LabSpecError(`traces[${i}].expectFinal must be a boolean`);
    return {
      name: reqString(x.name, `traces[${i}].name`, 200),
      steps: x.steps.map((s, j) => {
        const st = plainObject(s, `traces[${i}].steps[${j}]`, ["event", "expect"]);
        return { event: reqString(st.event, `traces[${i}].steps[${j}].event`, NAME_MAX), ...(st.expect !== undefined ? { expect: reqString(st.expect, `traces[${i}].steps[${j}].expect`, NAME_MAX) } : {}) };
      }),
      ...(x.expectFinal !== undefined ? { expectFinal: x.expectFinal } : {}),
    };
  });
  let criteria: Record<string, string[]> | undefined;
  if (o.criteria !== undefined) {
    const c = plainObject(o.criteria, "criteria", Object.keys(o.criteria as object));
    const entries = Object.entries(c);
    if (entries.length > 50) throw new LabSpecError("criteria lists at most 50 ids");
    criteria = {};
    for (const [id, needles] of entries) {
      if (!CRITERION_ID.test(id) || id === "__proto__") throw new LabSpecError("criteria: bad criterion id");
      if (!Array.isArray(needles) || needles.length > 20 || !needles.every((n) => typeof n === "string" && n.length <= 200)) throw new LabSpecError("criteria: each id maps to a list of at most 20 name fragments");
      criteria[id] = needles as string[];
    }
  }
  return { machine, neverReach, traces, ...(criteria ? { criteria } : {}) };
}

interface Graph {
  out: Map<string, Transition[]>;
}

function graphOf(m: Machine): Graph {
  const out = new Map<string, Transition[]>();
  for (const t of m.transitions) {
    const list = out.get(t.from);
    if (list) list.push(t);
    else out.set(t.from, [t]);
  }
  return { out };
}

// Genişlik öncelikli arama. `to` verilirse en az bir geçişli bir yol aranır (to === from ise bu bir döngüdür).
function bfs(g: Graph, from: string, to: string | null): { reached: Set<string>; path: Transition[] | null } {
  const prev = new Map<string, Transition | null>([[from, null]]);
  const seen = new Set<string>([from]);
  const queue: string[] = [from];
  while (queue.length) {
    const cur = queue.shift() as string;
    for (const t of g.out.get(cur) ?? []) {
      if (to !== null && t.to === to) {
        const path: Transition[] = [t];
        for (let p = prev.get(t.from); p; p = prev.get(p.from)) path.unshift(p);
        return { reached: seen, path };
      }
      if (!seen.has(t.to)) {
        seen.add(t.to);
        prev.set(t.to, t);
        queue.push(t.to);
      }
    }
  }
  return { reached: seen, path: null };
}

function pathText(p: Transition[]): string {
  return p.map((t, i) => `${i === 0 ? t.from : ""} -(${t.event})-> ${t.to}`.trim()).join(" ");
}

function list(items: string[], max = 10): string {
  const shown = items.slice(0, max).map((s) => cleanText(s, 60)).join(", ");
  return items.length > max ? `${shown} (+${items.length - max} more)` : shown;
}

export class StateLabProvider implements VerificationProvider<StateRequest> {
  readonly id = "state-lab";

  run(request: StateRequest): VerificationHandle {
    const req = validateStateRequest(request);
    const runId = randomUUID();
    return { runId, result: Promise.resolve(this.execute(req)), cancel: async () => {} };
  }

  private execute(req: StatePlan): RunResult {
    const started = Date.now();
    const m = req.machine;
    const declared = new Set(m.states);
    const finals = new Set(m.final);
    const g = graphOf(m);
    const tests: TestResult[] = [];
    const add = (suite: string, name: string, problems: string[] | "skip", message: string): void => {
      const crit = criteriaFor(name, req.criteria);
      tests.push(problems === "skip" ? mkTest(tests.length, { suite, name, outcome: "skipped", durationMs: 0, criteria: crit }) : problems.length === 0 ? mkTest(tests.length, { suite, name, outcome: "passed", durationMs: 0, criteria: crit }) : mkTest(tests.length, { suite, name, outcome: "failed", durationMs: 0, message, detail: problems.join("; "), criteria: crit }));
    };

    add("structure", "initial state is declared", declared.has(m.initial) ? [] : [`initial state ${cleanText(m.initial, 60)} is not in states`], "undeclared initial state");
    const undeclared: string[] = [];
    for (const t of m.transitions) {
      if (!declared.has(t.from)) undeclared.push(`${t.from} (from, event ${t.event})`);
      if (!declared.has(t.to)) undeclared.push(`${t.to} (to, event ${t.event})`);
    }
    for (const f of m.final) if (!declared.has(f)) undeclared.push(`${f} (final)`);
    add("structure", "transitions and final states use declared states", undeclared.length ? [`undeclared: ${list([...new Set(undeclared)])}`] : [], "undeclared state used");

    const targets = new Map<string, Set<string>>();
    for (const t of m.transitions) {
      const key = `${t.from}\u0000${t.event}`;
      const set = targets.get(key) ?? new Set<string>();
      set.add(t.to);
      targets.set(key, set);
    }
    const ambiguous: string[] = [];
    for (const [key, set] of targets) if (set.size > 1) ambiguous.push(`${key.replace("\u0000", " + ")} -> ${[...set].join(" | ")}`);
    add("structure", "deterministic: one target per state and event", ambiguous.length ? [`ambiguous: ${list(ambiguous, 5)}`] : [], "nondeterministic transitions");

    const reach = bfs(g, m.initial, null).reached;
    const unreachable = m.states.filter((s) => !reach.has(s));
    add("structure", "every state is reachable from the initial state", unreachable.length ? [`unreachable: ${list([...new Set(unreachable)])}`] : [], "unreachable states");

    const dead = [...new Set(m.states)].filter((s) => !finals.has(s) && (g.out.get(s)?.length ?? 0) === 0);
    add("structure", "no dead ends: every non-final state has an exit", dead.length ? [`dead ends: ${list(dead)}`] : [], "dead-end states");

    if (m.final.length === 0) add("structure", "final states are reachable", "skip", "");
    else {
      const missing = [...new Set(m.final)].filter((s) => !reach.has(s));
      add("structure", "final states are reachable", missing.length ? [`unreachable final: ${list(missing)}`] : [], "unreachable final states");
    }

    for (const n of req.neverReach) {
      const name = n.name ? cleanText(n.name, 200) : `never reach: ${cleanText(n.from, 60)} -> ${cleanText(n.to, 60)}`;
      const crit = criteriaFor(name, req.criteria);
      if (!declared.has(n.from) || !declared.has(n.to)) {
        tests.push(mkTest(tests.length, { suite: "neverReach", name, outcome: "error", durationMs: 0, message: "neverReach names a state that is not declared", detail: `${n.from} -> ${n.to}`, criteria: crit }));
        continue;
      }
      const found = bfs(g, n.from, n.to).path;
      tests.push(found ? mkTest(tests.length, { suite: "neverReach", name, outcome: "failed", durationMs: 0, message: "a forbidden path exists", detail: pathText(found), criteria: crit }) : mkTest(tests.length, { suite: "neverReach", name, outcome: "passed", durationMs: 0, criteria: crit }));
    }

    for (const tr of req.traces) {
      const name = cleanText(tr.name, 200);
      const crit = criteriaFor(name, req.criteria);
      const t0 = Date.now();
      const done = (outcome: "passed" | "failed" | "error", message?: string, detail?: string): void => {
        tests.push(mkTest(tests.length, { suite: "trace", name, outcome, durationMs: Date.now() - t0, ...(message ? { message } : {}), ...(detail ? { detail } : {}), criteria: crit }));
      };
      if (!declared.has(m.initial)) {
        done("error", "the trace cannot start: the initial state is not declared");
        continue;
      }
      let cur = m.initial;
      let problem: string | null = null;
      for (const [i, step] of tr.steps.entries()) {
        const options = (g.out.get(cur) ?? []).filter((t) => t.event === step.event);
        const dests = new Set(options.map((t) => t.to));
        if (options.length === 0) {
          problem = `step ${i + 1}: event ${cleanText(step.event, 60)} is not allowed in state ${cleanText(cur, 60)}`;
          break;
        }
        if (dests.size > 1) {
          problem = `step ${i + 1}: event ${cleanText(step.event, 60)} in state ${cleanText(cur, 60)} is ambiguous (${list([...dests], 5)})`;
          break;
        }
        cur = [...dests][0] as string;
        if (step.expect !== undefined && step.expect !== cur) {
          problem = `step ${i + 1}: expected state ${cleanText(step.expect, 60)} but reached ${cleanText(cur, 60)}`;
          break;
        }
      }
      if (!problem && tr.expectFinal !== undefined && finals.has(cur) !== tr.expectFinal) problem = tr.expectFinal ? `the trace ended in ${cleanText(cur, 60)}, which is not final` : `the trace ended in final state ${cleanText(cur, 60)}`;
      if (problem) done("failed", "trace rejected", problem);
      else done("passed");
    }

    return mkRun(this.id, started, tests, [], { lab: "state", states: m.states.length, transitions: m.transitions.length, neverReach: req.neverReach.length, traces: req.traces.length });
  }
}
