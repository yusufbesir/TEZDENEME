// Test verisi soy ağacı testleri (madde 59). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Yalnız testlerin kendi mkTmp klasörleri; git varsa gerçek `git hash-object` çıktısıyla, yoksa atlanarak denenir.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mkTmp } from "../../testing/tmp.ts";
import { checkEvidenceFile, sha256Of } from "../evidence-files.ts";
import { LabSpecError } from "./rules.ts";
import { DATA_EXTENSIONS, LINEAGE_SCHEMA, MAX_DATA_FILE_BYTES, recordLineage, validateDataFiles, verifyLineage } from "./lineage.ts";
import type { LineageEntry } from "./lineage.ts";

const haveGit = ((): boolean => {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

const gitBlobOf = (buf: Buffer): string => createHash("sha1").update(`blob ${buf.length}\0`).update(buf).digest("hex");

function workspace(): { root: string; ev: string } {
  const root = mkTmp("agentmom-lin-");
  mkdirSync(join(root, "fixtures"), { recursive: true });
  writeFileSync(join(root, "fixtures", "users.json"), '{"users":[{"id":1,"name":"ada"}],"note":"SECRET-FIXTURE-CONTENT"}');
  writeFileSync(join(root, "fixtures", "rows.csv"), "id,name\n1,ada\n2,bob\n");
  writeFileSync(join(root, "seed.sql"), "INSERT INTO t VALUES (1);\n");
  return { root, ev: join(mkTmp("agentmom-lin-ev-"), "out") };
}

test("dataFiles validation: relative, forward slashes, data extensions, at most 50, no repeats", () => {
  assert.deepEqual(validateDataFiles(["a.json", "d/b.CSV", "c.yml"]), ["a.json", "d/b.CSV", "c.yml"]);
  for (const ext of DATA_EXTENSIONS) assert.deepEqual(validateDataFiles([`x${ext}`]), [`x${ext}`]);
  const bad = (v: unknown, re?: RegExp) => assert.throws(() => validateDataFiles(v), (e) => e instanceof LabSpecError && (re ? re.test(e.message) : true));
  bad([]);
  bad("a.json");
  bad(Array.from({ length: 51 }, (_, i) => `f${i}.json`), /1 to 50/);
  bad(["../a.json"]);
  bad(["a/../b.json"]);
  bad(["/abs/a.json"]);
  bad(["C:/a.json"]);
  bad(["a\\b.json"]);
  bad(["a//b.json"]);
  bad(["./a.json"]);
  bad(["a.exe"], /data extension/);
  bad(["a.mjs"]);
  bad(["noext"]);
  bad(["a.json", "A.JSON"], /repeat/);
  bad([7]);
  assert.equal(validateDataFiles(Array.from({ length: 50 }, (_, i) => `f${i}.json`)).length, 50);
});

test("recordLineage: path, sha256, bytes, git blob and the modified-by-task flag, written as a JSON report evidence file", () => {
  const { root, ev } = workspace();
  const rec = recordLineage({ root, dataFiles: ["fixtures/users.json", "fixtures/rows.csv", "seed.sql"], runId: "wf-r0", taskId: "task-1", changedFiles: ["FIXTURES\\Users.json", "./src/x.ts"], evidenceDir: ev });
  assert.equal(rec.schema, LINEAGE_SCHEMA);
  assert.deepEqual(rec.problems, []);
  assert.deepEqual(rec.entries.map((e) => e.path), ["fixtures/users.json", "fixtures/rows.csv", "seed.sql"]);
  const users = readFileSync(join(root, "fixtures", "users.json"));
  assert.equal(rec.entries[0]!.sha256, sha256Of(users));
  assert.equal(rec.entries[0]!.bytes, users.length);
  assert.deepEqual(rec.entries.map((e) => e.modifiedByTask), [true, false, false], "separators, case and ./ do not hide a changed file");
  assert.deepEqual(rec.modified, ["fixtures/users.json"]);
  if (haveGit) {
    for (const e of rec.entries) assert.equal(e.gitBlob, gitBlobOf(readFileSync(join(root, e.path))), `git blob of ${e.path}`);
    // Gerçek git ile aynı çıktı:
    assert.equal(rec.entries[1]!.gitBlob, execFileSync("git", ["hash-object", "--no-filters", "--", join(root, "fixtures", "rows.csv")], { encoding: "utf8" }).trim());
  }
  assert.equal(rec.evidence.kind, "report");
  assert.equal(checkEvidenceFile(rec.evidence), null, "the evidence file is intact");
  const onDisk = JSON.parse(readFileSync(rec.evidence.path!, "utf8")) as { schema: string; runId: string; taskId: string; entries: LineageEntry[]; modified: string[] };
  assert.equal(onDisk.schema, LINEAGE_SCHEMA);
  assert.equal(onDisk.runId, "wf-r0");
  assert.equal(onDisk.taskId, "task-1");
  assert.deepEqual(onDisk.entries, rec.entries);
  assert.deepEqual(onDisk.modified, ["fixtures/users.json"]);
  assert.ok(!readFileSync(rec.evidence.path!, "utf8").includes("SECRET-FIXTURE-CONTENT"), "file contents are never copied into the record");
});

test("recordLineage: without the task's changed files there is no modifiedByTask field; no git still gives a complete sha256 record", () => {
  const { root, ev } = workspace();
  const rec = recordLineage({ root, dataFiles: ["seed.sql"], runId: "r", evidenceDir: ev });
  assert.ok(!("modifiedByTask" in rec.entries[0]!));
  assert.deepEqual(rec.modified, []);
  assert.ok(!("taskId" in rec));
});

test("recordLineage: missing, too large and out-of-workspace files are problems (infra), not silently dropped", () => {
  const { root, ev } = workspace();
  const other = mkTmp("agentmom-lin-o-");
  writeFileSync(join(other, "x.json"), "{}");
  writeFileSync(join(root, "huge.json"), Buffer.alloc(MAX_DATA_FILE_BYTES + 1, 0x20));
  const files = ["fixtures/users.json", "gone.json", "huge.json"];
  try {
    symlinkSync(other, join(root, "link"), "junction");
    files.push("link/x.json");
  } catch {
    // bağ oluşturulamayan ortam
  }
  const rec = recordLineage({ root, dataFiles: files, runId: "p", evidenceDir: ev });
  assert.deepEqual(rec.entries.map((e) => e.path), ["fixtures/users.json"]);
  assert.match(rec.problems.find((p) => p.path === "gone.json")!.message, /does not exist/);
  assert.match(rec.problems.find((p) => p.path === "huge.json")!.message, /larger than 8192 KB/);
  if (files.length === 4) assert.match(rec.problems.find((p) => p.path === "link/x.json")!.message, /outside the workspace or goes through a symlink/);
  assert.equal(rec.problems.length, files.length - 1);
  assert.equal(checkEvidenceFile(rec.evidence), null);
  assert.throws(() => recordLineage({ root, dataFiles: ["../escape.json"], runId: "p", evidenceDir: ev }), LabSpecError);
  assert.throws(() => recordLineage({ root, dataFiles: ["tool.exe"], runId: "p", evidenceDir: ev }), LabSpecError);
});

test("verifyLineage: unchanged files are fine; changed content, changed size and missing files are reported as deviations", () => {
  const { root, ev } = workspace();
  const rec = recordLineage({ root, dataFiles: ["fixtures/users.json", "fixtures/rows.csv", "seed.sql"], runId: "v", evidenceDir: ev });
  assert.deepEqual(verifyLineage(rec.entries, root), { ok: true, deviations: [] });
  // aynı boyutta içerik değişimi
  const users = readFileSync(join(root, "fixtures", "users.json"), "utf8");
  writeFileSync(join(root, "fixtures", "users.json"), users.replace("ada", "bob"));
  // boyut değişimi
  writeFileSync(join(root, "fixtures", "rows.csv"), "id,name\n1,ada\n");
  const after = verifyLineage(rec.entries, root);
  assert.equal(after.ok, false);
  assert.deepEqual(after.deviations.map((d) => [d.path, d.kind]), [["fixtures/users.json", "changed"], ["fixtures/rows.csv", "size"]]);
  assert.equal(after.deviations[0]!.expected.sha256, rec.entries[0]!.sha256);
  assert.notEqual(after.deviations[0]!.actual!.sha256, rec.entries[0]!.sha256);
  // silinen dosya: yeni bir çalışma ağacında dosya yok
  const empty = mkTmp("agentmom-lin-empty-");
  const gone = verifyLineage(rec.entries, empty);
  assert.deepEqual(gone.deviations.map((d) => d.kind), ["missing", "missing", "missing"]);
  assert.throws(() => verifyLineage([{ path: "../x.json", sha256: "0".repeat(64), bytes: 1 }], root), LabSpecError);
  assert.throws(() => verifyLineage([{ path: "x.json", sha256: "short", bytes: 1 }], root), LabSpecError);
  assert.throws(() => verifyLineage("nope" as never, root), LabSpecError);
});
