// Ajan/model kıyaslama komut satırı (madde 12). Sahip: Claude [İP:AgentMom devam]. SALT OKUNUR: sağlayıcı koşturmaz, hiçbir şey yazmaz, ağ ve model yok (ADR-016).
// Kullanım: node scripts/kiyas.mjs karsilastir <vaka-kumesi.json> <sonuc1.json> [<sonuc2.json> ...] [--json]
//           node scripts/kiyas.mjs sablon                  -> örnek vaka kümesi ve sonuç dosyası biçimini yazar
import { readRegular } from "../src/ops/capsule.ts";
import { BenchmarkError, RESULTS_SCHEMA, SUITE_SCHEMA, compare, parseRun, parseSuite, renderComparison } from "../src/analysis/benchmark.ts";

const argv = process.argv.slice(2);
const json = argv.includes("--json");
if (json) argv.splice(argv.indexOf("--json"), 1);
const [cmd, ...files] = argv;
if (files.some((f) => f.startsWith("--"))) {
  process.stderr.write("invalid_input: bilinmeyen bağımsız değişken\n");
  process.exit(2);
}
const read = (p) => {
  try {
    return JSON.parse(readRegular(p, p).toString("utf8"));
  } catch (e) {
    if (e instanceof BenchmarkError) throw e;
    throw new BenchmarkError(`okunamadı ya da JSON değil: ${String(p).slice(0, 80)}`);
  }
};
try {
  if (cmd === "sablon" && files.length === 0) {
    process.stdout.write(JSON.stringify({ schema: SUITE_SCHEMA, id: "ornek-1", title: "Örnek vaka kümesi", cases: [{ id: "v1", title: "Küçük bir hatayı düzelt", category: "implement" }] }, null, 2) + "\n");
    process.stdout.write(JSON.stringify({ schema: RESULTS_SCHEMA, suiteId: "ornek-1", runAt: "2026-01-01T00:00:00Z", provider: "claude-code", model: "model-adi", results: [{ caseId: "v1", passed: true, ms: 12000, tokens: 3400 }] }, null, 2) + "\n");
  } else if (cmd === "karsilastir" && files.length >= 2) {
    const suite = parseSuite(read(files[0]));
    const runs = files.slice(1).map((f) => parseRun(read(f), suite));
    const c = compare(suite, runs);
    process.stdout.write(json ? JSON.stringify(c, null, 2) + "\n" : renderComparison(c));
  } else {
    process.stderr.write("Kullanım: karsilastir <vaka-kumesi.json> <sonuc.json...> [--json] | sablon\n");
    process.exit(2);
  }
} catch (e) {
  const bad = e instanceof BenchmarkError;
  process.stderr.write(`${bad ? "invalid_input" : "error"}: ${String(e?.message ?? e).split("\n")[0].slice(0, 300)}\n`);
  process.exit(bad ? 2 : 1);
}
