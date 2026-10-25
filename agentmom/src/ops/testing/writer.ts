// Test helper (Faz 9): a process that keeps writing memory records, one transaction each, and prints "ack <n>" AFTER each commit.
// The test kills it with SIGKILL mid-flight and then checks that every acknowledged record survived and nothing half-written did.
import { openDb } from "../../core/db/db.ts";
import { migrate } from "../../core/db/migrate.ts";
import { MemoryStore } from "../../memory/store.ts";

const db = openDb(process.argv[2] as string);
migrate(db);
const store = new MemoryStore(db);
let n = 0;
for (;;) {
  n++;
  store.add({ kind: "note", title: `kayit ${n}`, body: `govde numarasi ${n} ${"x".repeat(200)}`, source: "writer", scope: "crash-test", confidence: 0.5 });
  process.stdout.write(`ack ${n}\n`);
}
