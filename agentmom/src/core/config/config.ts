import { existsSync, readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { isInside } from "../policy/engine.ts";
import { ACTION_TYPES } from "../policy/types.ts";
import type { AutonomyContract } from "../policy/types.ts";

export interface AgentMomConfig {
  server: { port: number };
  db: { path: string };
  audit: { jsonlPath: string };
  policy: { defaultContract: AutonomyContract };
}

export const DEFAULT_CONFIG: AgentMomConfig = {
  server: { port: 8787 },
  db: { path: "data/agentmom.db" },
  audit: { jsonlPath: "data/audit.jsonl" },
  policy: {
    defaultContract: {
      id: "default",
      allowedActions: ["task.create", "file.read"],
      allowedDirs: [],
      allowedProviders: [],
      trustedRepos: [],
      forbiddenDirs: [],
      sensitiveDirs: [],
      budget: { maxUsd: 0, spentUsd: 0 },
      expiresAt: "2099-12-31T23:59:59Z",
      maxRuntimeMs: 600_000,
      approvalRequiredActions: ["shell.exec", "verification.run", "file.write"],
      paidRoute: "none",
    },
  },
};

type Node =
  | { type: "object"; props: Record<string, Node> }
  | { type: "number"; min?: number; max?: number; integer?: boolean }
  | { type: "string"; minLength?: number }
  | { type: "array"; items: Node }
  | { type: "enum"; values: readonly string[] };

const actionList: Node = { type: "array", items: { type: "enum", values: ACTION_TYPES } };

const SCHEMA: Node = {
  type: "object",
  props: {
    server: { type: "object", props: { port: { type: "number", min: 0, max: 65535, integer: true } } },
    db: { type: "object", props: { path: { type: "string", minLength: 1 } } },
    audit: { type: "object", props: { jsonlPath: { type: "string", minLength: 1 } } },
    policy: {
      type: "object",
      props: {
        defaultContract: {
          type: "object",
          props: {
            id: { type: "string", minLength: 1 },
            allowedActions: actionList,
            allowedDirs: { type: "array", items: { type: "string", minLength: 1 } },
            allowedProviders: { type: "array", items: { type: "string", minLength: 1 } },
            trustedRepos: { type: "array", items: { type: "string", minLength: 1 } },
            forbiddenDirs: { type: "array", items: { type: "string", minLength: 1 } },
            sensitiveDirs: { type: "array", items: { type: "string", minLength: 1 } },
            budget: {
              type: "object",
              props: { maxUsd: { type: "number", min: 0 }, spentUsd: { type: "number", min: 0 } },
            },
            expiresAt: { type: "string", minLength: 1 },
            maxRuntimeMs: { type: "number", min: 0, integer: true },
            approvalRequiredActions: actionList,
            paidRoute: { type: "enum", values: ["none", "approved"] },
          },
        },
      },
    },
  },
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// Validates one (possibly partial) layer; every key is optional but unknown keys and wrong types are errors.
export function validateLayer(value: unknown, node: Node = SCHEMA, path = "$"): string[] {
  const errors: string[] = [];
  switch (node.type) {
    case "object": {
      if (!isPlainObject(value)) return [`${path}: expected object`];
      for (const [key, v] of Object.entries(value)) {
        const child = node.props[key];
        if (!child) errors.push(`${path}.${key}: unknown key`);
        else errors.push(...validateLayer(v, child, `${path}.${key}`));
      }
      return errors;
    }
    case "number": {
      if (typeof value !== "number" || !Number.isFinite(value)) return [`${path}: expected finite number`];
      if (node.integer && !Number.isInteger(value)) errors.push(`${path}: expected integer`);
      if (node.min !== undefined && value < node.min) errors.push(`${path}: must be >= ${node.min}`);
      if (node.max !== undefined && value > node.max) errors.push(`${path}: must be <= ${node.max}`);
      return errors;
    }
    case "string": {
      if (typeof value !== "string") return [`${path}: expected string`];
      if (node.minLength !== undefined && value.length < node.minLength) errors.push(`${path}: too short`);
      return errors;
    }
    case "array": {
      if (!Array.isArray(value)) return [`${path}: expected array`];
      value.forEach((item, i) => errors.push(...validateLayer(item, node.items, `${path}[${i}]`)));
      return errors;
    }
    case "enum": {
      if (typeof value !== "string" || !node.values.includes(value)) return [`${path}: expected one of ${node.values.join(", ")}`];
      return errors;
    }
  }
}

// Objects merge key by key; arrays and scalars from a later layer replace earlier ones.
export function deepMerge(base: unknown, over: unknown): unknown {
  if (isPlainObject(base) && isPlainObject(over)) {
    const out: Record<string, unknown> = { ...base };
    for (const [k, v] of Object.entries(over)) out[k] = k in base ? deepMerge(base[k], v) : v;
    return out;
  }
  return over;
}

export interface ConfigLayerPaths {
  user?: string;
  project?: string;
  local?: string;
}

export interface LoadedConfig {
  config: AgentMomConfig;
  sources: string[];
}

export class ConfigError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`invalid configuration: ${problems.join("; ")}`);
    this.name = "ConfigError";
    this.problems = problems;
  }
}

function checkContract(config: AgentMomConfig): string[] {
  const c = config.policy.defaultContract;
  const problems: string[] = [];
  if (Number.isNaN(Date.parse(c.expiresAt))) problems.push("$.policy.defaultContract.expiresAt: not a valid date");
  if (c.budget.spentUsd > c.budget.maxUsd) problems.push("$.policy.defaultContract.budget: spentUsd exceeds maxUsd");
  return problems;
}

function isSafeRelativePath(p: string): boolean {
  return !isAbsolute(p) && !/^[a-zA-Z]:/.test(p) && !p.startsWith("\\") && !p.split(/[\\/]/).includes("..");
}

// Workspace files (project, local) may be untrusted, so they can only narrow the policy set by the defaults and the user layer.
export function wideningProblems(current: AutonomyContract, layer: unknown): string[] {
  const problems: string[] = [];
  if (!isPlainObject(layer)) return problems;
  const p = isPlainObject(layer.policy) ? layer.policy : undefined;
  const c = p && isPlainObject(p.defaultContract) ? p.defaultContract : undefined;
  if (c) {
    const widen = (field: string, msg: string) => problems.push(`$.policy.defaultContract.${field}: ${msg}`);
    const notIn = (list: unknown, allowed: readonly string[]) => (Array.isArray(list) ? list.filter((x) => !allowed.includes(x as string)) : []);
    for (const a of notIn(c.allowedActions, current.allowedActions)) widen("allowedActions", `cannot add ${String(a)}`);
    for (const a of notIn(c.allowedProviders, current.allowedProviders)) widen("allowedProviders", `cannot add ${String(a)}`);
    if (Array.isArray(c.forbiddenDirs)) {
      for (const d of current.forbiddenDirs ?? []) if (!c.forbiddenDirs.includes(d)) widen("forbiddenDirs", `cannot drop ${d}`);
    } else if ((current.forbiddenDirs ?? []).length > 0 && c.forbiddenDirs !== undefined) {
      widen("forbiddenDirs", "must keep the forbidden directories");
    }
    if (Array.isArray(c.sensitiveDirs)) {
      for (const d of current.sensitiveDirs ?? []) if (!c.sensitiveDirs.includes(d)) widen("sensitiveDirs", `cannot drop ${d}`);
    } else if ((current.sensitiveDirs ?? []).length > 0 && c.sensitiveDirs !== undefined) {
      widen("sensitiveDirs", "must keep the sensitive directories");
    }
    if (Array.isArray(c.trustedRepos)) {
      for (const d of c.trustedRepos) {
        if (typeof d === "string" && !current.trustedRepos.some((root) => isInside(root, d))) widen("trustedRepos", `${d} is not inside an already trusted repository`);
      }
    }
    if (Array.isArray(c.allowedDirs)) {
      for (const d of c.allowedDirs) {
        if (typeof d === "string" && !current.allowedDirs.some((root) => isInside(root, d))) widen("allowedDirs", `${d} is outside the directories already allowed`);
      }
    }
    if (Array.isArray(c.approvalRequiredActions)) {
      for (const a of current.approvalRequiredActions) if (!c.approvalRequiredActions.includes(a)) widen("approvalRequiredActions", `cannot drop ${a}`);
    }
    if (c.paidRoute === "approved" && current.paidRoute !== "approved") widen("paidRoute", "cannot grant paid-route approval");
    if (isPlainObject(c.budget)) {
      if (typeof c.budget.maxUsd === "number" && c.budget.maxUsd > current.budget.maxUsd) widen("budget.maxUsd", "cannot raise the budget");
      if (typeof c.budget.spentUsd === "number" && c.budget.spentUsd < current.budget.spentUsd) widen("budget.spentUsd", "cannot lower spent amount");
    }
    if (typeof c.maxRuntimeMs === "number" && c.maxRuntimeMs > current.maxRuntimeMs) widen("maxRuntimeMs", "cannot raise the runtime limit");
    if (typeof c.expiresAt === "string" && Date.parse(c.expiresAt) > Date.parse(current.expiresAt)) widen("expiresAt", "cannot extend the contract");
  }
  const db = isPlainObject(layer.db) ? layer.db : undefined;
  if (db && typeof db.path === "string" && !isSafeRelativePath(db.path)) problems.push("$.db.path: must be a relative path inside the data directory");
  const audit = isPlainObject(layer.audit) ? layer.audit : undefined;
  if (audit && typeof audit.jsonlPath === "string" && !isSafeRelativePath(audit.jsonlPath)) {
    problems.push("$.audit.jsonlPath: must be a relative path inside the data directory");
  }
  return problems;
}

// Precedence, lowest to highest: defaults, user, project, local. Only defaults and user may widen the policy.
export function loadConfig(paths: ConfigLayerPaths = {}): LoadedConfig {
  let merged: unknown = structuredClone(DEFAULT_CONFIG);
  const sources = ["default"];
  const problems: string[] = [];
  for (const [name, file] of [["user", paths.user], ["project", paths.project], ["local", paths.local]] as const) {
    if (!file || !existsSync(file)) continue;
    let layer: unknown;
    try {
      layer = JSON.parse(readFileSync(file, "utf8"));
    } catch (err) {
      problems.push(`${name} (${file}): invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
    const layerProblems = validateLayer(layer);
    if (layerProblems.length > 0) {
      problems.push(...layerProblems.map((p) => `${name} (${file}): ${p}`));
      continue;
    }
    if (name !== "user") {
      const widening = wideningProblems((merged as AgentMomConfig).policy.defaultContract, layer);
      if (widening.length > 0) {
        problems.push(...widening.map((p) => `${name} (${file}): ${p}`));
        continue;
      }
    }
    merged = deepMerge(merged, layer);
    sources.push(name);
  }
  const config = merged as AgentMomConfig;
  problems.push(...checkContract(config));
  if (problems.length > 0) throw new ConfigError(problems);
  return { config, sources };
}
