import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { redact, redactString } from "../core/audit/redact.ts";
import { buildChildEnv } from "../providers/child-env.ts";
import { killTree } from "../providers/cli-adapter.ts";
import { classifyFailure } from "./classify.ts";
import { saveEvidence } from "./evidence-files.ts";
import { parseJunit } from "./junit.ts";
import type { ParsedCase } from "./junit.ts";
import { findLinks } from "./links.ts";
import { criteriaFor } from "./provider.ts";
import type { VerificationHandle, VerificationProvider } from "./provider.ts";
import { VERIFY_SCHEMA_VERSION, totalsOf } from "./schema.ts";
import type { EvidenceItem, RunResult, RunStatus, TestResult } from "./schema.ts";

export interface LocalTestsRequest {
  cwd: string;
  files: string[];
  timeoutMs: number;
  evidenceDir: string;
  retryFailures?: boolean;
  criteriaMap?: Record<string, string[]>;
  maxOutputBytes?: number;
}

const TEST_FILE = /\.(test|spec)\.(ts|mjs|js|cjs)$/;
const DEFAULT_MAX_OUTPUT = 4 * 1024 * 1024;
const NAME_MAX = 200;

// Names come from agent-written code: masked and capped before they reach reports or repair feedback.
function cleanName(s: string): string {
  return redactString(s).slice(0, NAME_MAX);
}

export function validateTestFiles(cwd: string, files: string[]): string[] {
  if (files.length === 0 || files.length > 100) throw new Error("files must list 1 to 100 test files");
  return files.map((f) => {
    const norm = f.replace(/\\/g, "/");
    const parts = norm.split("/");
    if (norm.startsWith("/") || /^[a-zA-Z]:/.test(norm) || parts.includes("..") || norm.includes("\0")) throw new Error(`test file must be relative to the workspace: ${f}`);
    // A name starting with "-" would be read as a node option (--test-reporter=..., --allow-fs-write=...), not as a file.
    if (parts.some((p) => p.startsWith("-"))) throw new Error(`test file path components must not start with "-": ${f}`);
    if (!TEST_FILE.test(norm)) throw new Error(`not a test file name (*.test.ts|mjs|js|cjs): ${f}`);
    if (!existsSync(resolve(cwd, norm))) throw new Error(`test file not found: ${f}`);
    return norm;
  });
}

interface FilePass {
  file: string;
  cases: ParsedCase[];
  stdout: string;
  stderr: string;
  exitCode: number | null;
  runLevel: "timeout" | "spawn_error" | "crash" | "cancelled" | null;
  spawnError: string | null;
  incoherent: string | null;
  linkViolation: string[] | null;
}

// Runs the project's own node:test files and turns the JUnit output into the common schema. Only the child's stdout/stderr are read.
// Every test file runs in its OWN process: with isolation off inside one process, a test could print forged results or exit early,
// so a file can only ever speak for itself, and its exit code must agree with what it reported.
export class LocalTestProvider implements VerificationProvider<LocalTestsRequest> {
  readonly id = "local-tests";

  run(req: LocalTestsRequest): VerificationHandle {
    const runId = randomUUID();
    let current: ChildProcess | undefined;
    let cancelled = false;
    const result = this.execute(runId, req, (c) => (current = c), () => cancelled);
    return {
      runId,
      result,
      cancel: async () => {
        cancelled = true;
        if (current) killTree(current);
        await result;
      },
    };
  }

  private passOne(req: LocalTestsRequest, file: string, deadline: number, setChild: (c: ChildProcess) => void, isCancelled: () => boolean): Promise<FilePass> {
    return new Promise((resolveP) => {
      const max = req.maxOutputBytes ?? DEFAULT_MAX_OUTPUT;
      let stdout = "";
      let stderr = "";
      let timedOut = false;
      let overflow = false;
      let spawnError: string | null = null;
      const left = deadline - Date.now();
      if (left <= 0) {
        resolveP({ file, cases: [], stdout, stderr, exitCode: null, runLevel: "timeout", spawnError: null, incoherent: null, linkViolation: null });
        return;
      }
      // Agent-written code runs here. Node's permission model limits it to reading the workspace, writing only the scratch dir and spawning nothing.
      // Defense in depth, not a hard sandbox: the network is NOT restricted by it (Docker isolation was deliberately postponed by Yusuf, 2026-10-21).
      // A fresh scratch directory per process, and a re-scan of both directories right before every start (earlier files or retries could have left links).
      const scratchRoot = join(req.evidenceDir, "tmp");
      mkdirSync(scratchRoot, { recursive: true });
      // One scratch dir per test file (shared by its retry so flaky detection can work), never shared between files.
      const scratch = join(scratchRoot, `f-${file.replace(/[^A-Za-z0-9]+/g, "_").slice(-60)}`);
      mkdirSync(scratch, { recursive: true });
      const violation = [...findLinks(req.cwd), ...findLinks(scratch)];
      if (violation.length > 0) {
        resolveP({ file, cases: [], stdout, stderr, exitCode: null, runLevel: null, spawnError: null, incoherent: null, linkViolation: violation });
        return;
      }
      const child = spawn(
        process.execPath,
        ["--permission", `--allow-fs-read=${resolve(req.cwd)}`, `--allow-fs-read=${resolve(scratch)}`, `--allow-fs-write=${resolve(scratch)}`, "--test-isolation=none", "--test", "--test-reporter=junit", `./${file}`],
        { cwd: req.cwd, env: buildChildEnv({ tempDir: scratch }), stdio: ["ignore", "pipe", "pipe"], windowsHide: true, shell: false },
      );
      setChild(child);
      const timer = setTimeout(() => {
        timedOut = true;
        killTree(child);
      }, left);
      child.stdout.on("data", (d: Buffer) => {
        if (stdout.length + d.length > max) {
          overflow = true;
          killTree(child);
          return;
        }
        stdout += d.toString("utf8");
      });
      child.stderr.on("data", (d: Buffer) => {
        if (stderr.length < 256 * 1024) stderr += d.toString("utf8");
      });
      child.on("error", (err: NodeJS.ErrnoException) => {
        spawnError = err.code ?? "spawn_error";
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        const runLevel = isCancelled() ? "cancelled" : timedOut ? "timeout" : spawnError ? "spawn_error" : overflow ? "crash" : null;
        const cases = runLevel ? [] : parseJunit(stdout).map((c) => ({ ...c, file: resolve(req.cwd, file) }));
        let incoherent: string | null = null;
        if (!runLevel) {
          const anyFailed = cases.some((c) => c.outcome === "failed");
          if (cases.length === 0) incoherent = `${file} produced no test results (exit ${code})`;
          else if (code === 0 && anyFailed) incoherent = `${file} exited 0 but reported failing tests`;
          else if (code !== 0 && !anyFailed) incoherent = `${file} exited ${code} but reported no failing test (results cannot be trusted)`;
        }
        resolveP({ file, cases, stdout, stderr, exitCode: code, runLevel, spawnError, incoherent, linkViolation: null });
      });
    });
  }

  private async execute(runId: string, req: LocalTestsRequest, setChild: (c: ChildProcess) => void, isCancelled: () => boolean): Promise<RunResult> {
    const startedAt = new Date();
    const evidence: EvidenceItem[] = [];
    const files = validateTestFiles(req.cwd, req.files);
    const deadline = Date.now() + req.timeoutMs;
    const tests: TestResult[] = [];
    const used = new Map<string, number>();
    const add = (t: Omit<TestResult, "id">, base: string) => {
      const n = (used.get(base) ?? 0) + 1;
      used.set(base, n);
      tests.push({ id: n === 1 ? base : `${base}#${n}`, ...t });
    };

    const links = findLinks(req.cwd);
    let firstRunLevel: FilePass["runLevel"] = null;
    const exitCodes: Record<string, number | null> = {};
    const retriedKeys: string[] = [];

    if (links.length > 0) {
      evidence.push(saveEvidence(req.evidenceDir, `${runId}-links`, "log", "symlinks/junctions found in the workspace", `${links.slice(0, 50).join("\n")}\n`, "log"));
      add({ suite: null, name: "workspace", outcome: "error", durationMs: 0, error: { message: `the workspace contains ${links.length} symlink/junction(s); refusing to run tests that could follow them outside the workspace`, detail: links.slice(0, 10).join(", ") }, criteria: [], classification: "environment", evidenceRefs: [`${runId}-links`], attempts: 1 }, "workspace");
    } else {
      const passes: FilePass[] = [];
      for (const file of files) {
        const p = await this.passOne(req, file, deadline, setChild, isCancelled);
        passes.push(p);
        if (p.linkViolation) {
          add({ suite: null, name: "workspace", outcome: "error", durationMs: 0, error: { message: `symlink/junction/hard link appeared before running ${p.file}; refusing to run`, detail: p.linkViolation.slice(0, 10).join(", ") }, criteria: [], classification: "environment", evidenceRefs: [], attempts: 1 }, "workspace");
          break;
        }
        exitCodes[file] = p.exitCode;
        evidence.push(saveEvidence(req.evidenceDir, `${runId}-${passes.length}-stdout`, "log", `junit output of ${file}`, redactString(p.stdout) || "(no output)\n", "xml"));
        if (p.stderr.trim()) evidence.push(saveEvidence(req.evidenceDir, `${runId}-${passes.length}-stderr`, "log", `stderr of ${file}`, redactString(p.stderr), "log"));
        if (p.runLevel) {
          firstRunLevel = p.runLevel;
          break;
        }
      }
      const logRefs = evidence.map((e) => e.id);

      // Retry once, only the files that failed: a failure that passes on retry is flaky, never a clean pass.
      const retried = new Map<string, ParsedCase>();
      if (req.retryFailures && !firstRunLevel) {
        for (const p of passes.filter((x) => x.cases.some((c) => c.outcome === "failed") && !x.incoherent)) {
          const second = await this.passOne(req, p.file, deadline, setChild, isCancelled);
          evidence.push(saveEvidence(req.evidenceDir, `${runId}-retry-${p.file.replace(/[^A-Za-z0-9]+/g, "_").slice(-40)}`, "log", `junit output of the retry of ${p.file}`, redactString(second.stdout) || "(no output)\n", "xml"));
          if (!second.incoherent && !second.runLevel) for (const c of second.cases) retried.set(`${p.file}::${c.suite ?? ""}::${c.name}`, c);
        }
      }
      const allRefs = evidence.map((e) => e.id);

      for (const p of passes) {
        if (p.runLevel) {
          const level = p.runLevel;
          const message = level === "timeout" ? `test run exceeded ${req.timeoutMs} ms and was killed` : level === "cancelled" ? "test run was cancelled" : level === "spawn_error" ? `could not start node (${p.spawnError})` : "test output exceeded its size limit";
          add({ suite: null, name: "run", outcome: "error", durationMs: 0, error: { message, detail: redactString(p.stderr).slice(0, 2000) }, criteria: [], classification: classifyFailure({ message, runLevel: level }), evidenceRefs: allRefs, attempts: 1 }, "run");
          continue;
        }
        if (p.incoherent) {
          add({ suite: null, name: `file ${p.file}`, outcome: "error", durationMs: 0, error: { message: p.incoherent, detail: redactString(p.stderr).slice(0, 2000) }, criteria: [], classification: "infra", evidenceRefs: allRefs, attempts: 1 }, `file:${p.file}`);
          continue;
        }
        for (const c of p.cases) {
          const key = `${p.file}::${c.suite ?? ""}::${c.name}`;
          const retry = retried.get(key);
          const failedFirst = c.outcome === "failed";
          const passedOnRetry = failedFirst && retry?.outcome === "passed";
          if (retry) retriedKeys.push(key);
          const name = cleanName(c.name);
          add(
            {
              suite: c.suite ? cleanName(c.suite) : null,
              name,
              outcome: failedFirst ? "failed" : c.outcome,
              durationMs: (failedFirst && retry ? retry : c).timeMs,
              error: failedFirst ? { message: redactString(c.message ?? "").slice(0, 1000), detail: redactString(c.detail ?? "").slice(0, 3000) } : null,
              criteria: criteriaFor(`${c.suite ?? ""} ${c.name}`, req.criteriaMap),
              classification: failedFirst ? classifyFailure({ message: c.message ?? "", detail: c.detail ?? "", passedOnRetry }) : null,
              evidenceRefs: failedFirst ? allRefs : [],
              attempts: retry ? 2 : 1,
            },
            `${p.file}: ${c.suite ? cleanName(c.suite) + " > " : ""}${name}`,
          );
        }
      }
      void logRefs;
    }

    const endedAt = new Date();
    const status: RunStatus = firstRunLevel === "timeout" ? "timed_out" : firstRunLevel === "cancelled" ? "cancelled" : tests.some((t) => t.outcome === "error") ? "error" : tests.some((t) => t.outcome === "failed") ? "failed" : "passed";
    return {
      schemaVersion: VERIFY_SCHEMA_VERSION,
      runId,
      provider: this.id,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationMs: endedAt.getTime() - startedAt.getTime(),
      status,
      tests,
      evidence,
      totals: totalsOf(tests),
      environment: { node: process.version, platform: process.platform },
      providerData: redact({ files, exitCodes, retried: retriedKeys, retryEnabled: req.retryFailures === true, processPerFile: true }) as Record<string, unknown>,
    };
  }
}
