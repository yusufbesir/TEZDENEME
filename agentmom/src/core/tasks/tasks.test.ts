import { test } from "node:test";
import assert from "node:assert/strict";
import { openDb } from "../db/db.ts";
import { migrate } from "../db/migrate.ts";
import { TASK_STATES, TaskError, TaskStore, canTransition } from "./tasks.ts";
import type { TaskState } from "./tasks.ts";

const user = { kind: "user", id: "yusuf" } as const;
const agent = { kind: "agent", id: "a1" } as const;

function store(): TaskStore {
  const db = openDb(":memory:");
  migrate(db);
  return new TaskStore(db);
}

function newTask(s: TaskStore) {
  return s.create({ title: "t", requestedAction: "file.read", request: { action: "file.read" }, decision: "allow" });
}

function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (err) {
    return err instanceof TaskError ? err.code : "other";
  }
  return undefined;
}

test("creates a pending task and reads it back", () => {
  const s = store();
  const t = newTask(s);
  assert.equal(t.state, "pending");
  assert.deepEqual(t.request, { action: "file.read" });
  assert.equal(s.list().length, 1);
  assert.equal(s.get("missing"), undefined);
});

test("happy path: pending -> approved -> running -> succeeded with an attempt", () => {
  const s = store();
  const t = newTask(s);
  s.transition(t.id, "approved", agent);
  const attempt = s.startAttempt(t.id, agent);
  assert.equal(s.require(t.id).state, "running");
  assert.equal(attempt.attemptNo, 1);
  const done = s.finishAttempt(attempt.id, { exitCode: 0 }, agent);
  assert.equal(done.state, "succeeded");
  assert.equal(s.require(t.id).state, "succeeded");
});

test("a failed attempt marks the task failed and allows a retry through pending", () => {
  const s = store();
  const t = newTask(s);
  s.transition(t.id, "approved", agent);
  const a1 = s.startAttempt(t.id, agent);
  assert.equal(s.finishAttempt(a1.id, { exitCode: 2, error: "boom" }, agent).state, "failed");
  assert.equal(s.require(t.id).state, "failed");
  s.transition(t.id, "pending", agent);
  s.transition(t.id, "approved", agent);
  assert.equal(s.startAttempt(t.id, agent).attemptNo, 2);
});

test("rejects invalid transitions and leaves the state unchanged", () => {
  const s = store();
  const t = newTask(s);
  assert.equal(code(() => s.transition(t.id, "running", agent)), "invalid_transition");
  assert.equal(code(() => s.transition(t.id, "succeeded", agent)), "invalid_transition");
  assert.equal(s.require(t.id).state, "pending");
  s.transition(t.id, "cancelled", agent);
  assert.equal(code(() => s.transition(t.id, "approved", user)), "invalid_transition");
});

test("terminal states have no exits", () => {
  for (const from of ["succeeded", "cancelled", "denied"] as TaskState[]) {
    for (const to of TASK_STATES) assert.equal(canTransition(from, to), false, `${from}->${to}`);
  }
});

test("only the user can approve an awaiting_approval task", () => {
  const s = store();
  const t = newTask(s);
  s.transition(t.id, "awaiting_approval", agent);
  assert.equal(code(() => s.transition(t.id, "approved", agent)), "approval_requires_user");
  assert.equal(s.require(t.id).state, "awaiting_approval");
  assert.equal(s.transition(t.id, "approved", user).state, "approved");
});

test("unknown task and double-finishing an attempt are errors", () => {
  const s = store();
  assert.equal(code(() => s.transition("nope", "approved", user)), "not_found");
  const t = newTask(s);
  s.transition(t.id, "approved", agent);
  const a = s.startAttempt(t.id, agent);
  s.finishAttempt(a.id, { exitCode: 0 }, agent);
  assert.equal(code(() => s.finishAttempt(a.id, { exitCode: 0 }, agent)), "invalid_transition");
});
