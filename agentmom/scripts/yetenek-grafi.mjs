// Yetenek bağımlılık grafiği ve yetenek düzeyinde etki analizi komut satırı (madde 47 ve 10). Sahip: Claude [İP:AgentMom devam]. SALT OKUNUR: hiçbir şey yazmaz; ağ ve model yok; yalnız kullanıcı çalıştırınca işler (ADR-016).
// Kullanım: node scripts/yetenek-grafi.mjs ozet   [--repo <klasör>]                      -> kenar/döngü/ortak dosya özeti
//           node scripts/yetenek-grafi.mjs mermaid [--repo <klasör>]                      -> Mermaid grafiği (stdout)
//           node scripts/yetenek-grafi.mjs etki <dosya> [<dosya>...] [--derinlik 1..6] [--repo <klasör>] [--json]   -> değişen dosyaların etkilediği yetenekler ve çalıştırılacak testler
import { lstatSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { loadImportGraph } from "../src/analysis/impact.ts";
import { GraphInputError, buildCapabilityGraph, capabilityImpact, parseCapabilities, renderImpact, renderMermaid, renderSummary } from "../src/analysis/capability-graph.ts";

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const v = argv[i + 1];
  if (v === undefined || v.startsWith("--")) {
    process.stderr.write(`${name} bir değer istiyor\n`);
    process.exit(2);
  }
  argv.splice(i, 2);
  return v;
};
const bool = (name) => {
  const i = argv.indexOf(name);
  if (i < 0) return false;
  argv.splice(i, 1);
  return true;
};
const repo = resolve(flag("--repo") ?? process.cwd());
const depthArg = flag("--derinlik");
const asJson = bool("--json");
const [cmd, ...rest] = argv;
if (!["ozet", "mermaid", "etki"].includes(cmd ?? "")) {
  process.stderr.write("Kullanım: ozet | mermaid | etki <dosya...> [--derinlik N] [--repo <klasör>] [--json]\n");
  process.exit(2);
}
if (rest.some((a) => a.startsWith("--")) || (cmd !== "etki" && rest.length > 0)) {
  process.stderr.write("invalid_input: bilinmeyen ya da fazla bağımsız değişken\n");
  process.exit(2);
}
try {
  const statusPath = join(repo, "docs", "status", "100-yetenek-durum.json");
  const st = lstatSync(statusPath);
  if (!st.isFile() || st.size > 2 * 1024 * 1024) throw new GraphInputError("100-yetenek-durum.json bulunamadı ya da çok büyük");
  const caps = parseCapabilities(JSON.parse(readFileSync(statusPath, "utf8")));
  const { graph, scan } = await loadImportGraph(repo);
  if (cmd === "etki") {
    if (depthArg !== undefined && !/^[1-6]$/.test(depthArg)) throw new GraphInputError("--derinlik 1..6 arası tek haneli tam sayı olmalı");
    const depth = depthArg === undefined ? 3 : Number(depthArg);
    const r = capabilityImpact(caps, graph, rest, depth, scan);
    process.stdout.write(asJson ? JSON.stringify(r, null, 2) + "\n" : renderImpact(r));
  } else {
    const g = buildCapabilityGraph(caps, graph, scan);
    process.stdout.write(cmd === "mermaid" ? renderMermaid(g) : renderSummary(g));
  }
} catch (e) {
  const code = e instanceof GraphInputError ? "invalid_input" : "error";
  process.stderr.write(`${code}: ${String(e?.message ?? e).split("\n")[0].slice(0, 300)}\n`);
  process.exit(e instanceof GraphInputError ? 2 : 1);
}
