// One-time entry ticket rules. Owner: Claude [IP:AgentMom Faz 11].
import { test } from "node:test";
import assert from "node:assert/strict";
import { EntryTickets } from "./desktop-entry.ts";

test("a ticket is single-use and expires after 30 seconds", () => {
  let t = 1000;
  const tk = new EntryTickets(() => t);
  const a = tk.issue();
  assert.equal(tk.redeem(a), true);
  assert.equal(tk.redeem(a), false);
  const b = tk.issue();
  t += 30_001;
  assert.equal(tk.redeem(b), false);
});
test("junk and non-string tickets are refused; only 4 stay open", () => {
  const tk = new EntryTickets();
  for (const x of [undefined, null, 5, "", "short", "x".repeat(200), "a b c d e f g h i j k l m n"]) assert.equal(tk.redeem(x), false);
  const first = tk.issue();
  for (let i = 0; i < 4; i++) tk.issue();
  assert.equal(tk.redeem(first), false, "the oldest open ticket is dropped past the limit");
});
