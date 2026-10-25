// 100 yetenek kontrol listesi tutarlılığı (Faz 11). Sahip: Claude [İP:AgentMom Faz 11].
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

test("the 100-capability checklist has exactly 100 rows, valid statuses and every cited evidence file exists", () => {
  const out = execFileSync(process.execPath, ["scripts/kontrol-listesi-uret.mjs", "--dogrula"], { encoding: "utf8" });
  assert.match(out, /toplam 100/);
  const md = readFileSync("docs/status/100-yetenek-kontrol-listesi.md", "utf8");
  const rows = md.split("\n").filter((l) => /^\| \d+ \| /.test(l) && /\*\*(Doğrulandı|Kısmi|Planlı|Desteklenmiyor|Kapsam dışı)\*\*/.test(l));
  assert.equal(rows.length, 100);
  const ids = rows.map((r) => Number(/^\| (\d+) \|/.exec(r)?.[1]));
  assert.deepEqual(ids, Array.from({ length: 100 }, (_, i) => i + 1));
});
