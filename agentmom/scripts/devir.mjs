// Devir paketi komut satırı (madde 19). Sahip: Claude [İP:AgentMom devam]. Yalnız kullanıcı çalıştırınca işler (ADR-016); ağ yok, yükleme yok, uzaktan çalıştırma yok.
// Kullanım: node scripts/devir.mjs olustur <girdi.json> <hedef-klasör> [--repo <proje-klasörü>] [--durum <klasör>]   -> hedefte YENİ devir klasörü
//           node scripts/devir.mjs dogrula <devir-klasörü>
//           node scripts/devir.mjs oku <devir-klasörü>                                                      -> doğrular, okunur metni yazar (hiçbir şey yazmaz)
// girdi.json alanları: title, goal, status (not_started|in_progress|blocked|review), origin, done[], next[], openQuestions[], constraints[], files[] (yalnız göreli adlar)
import { join, resolve } from "node:path";
import { readRegular } from "../src/ops/capsule.ts";
import { createPacket, openPacket, verifyPacket } from "../src/ops/handoff-packet.ts";

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const v = argv[i + 1];
  argv.splice(i, 2);
  return v;
};
const repoArg = argv.includes("--repo");
const repo = flag("--repo");
const state = flag("--durum");
if (repoArg && (!repo || repo.startsWith("--"))) {
  process.stderr.write("--repo bir klasör yolu istiyor\n");
  process.exit(2);
}
const [cmd, a, b] = argv;
const out = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");
try {
  if (cmd === "olustur" && a && b) {
    if (!repo) {
      process.stderr.write("olustur için --repo <proje-klasörü> zorunlu (paketin depo içine yazılmasını engellemek için)\n");
      process.exit(2);
    }
    const repoRoot = resolve(repo);
    let input;
    try {
      input = JSON.parse(readRegular(resolve(a), "girdi.json").toString("utf8"));
    } catch {
      process.stderr.write("invalid_input: girdi.json okunamadı ya da geçerli JSON değil\n");
      process.exit(1);
    }
    const r = createPacket({ input, destRoot: resolve(b), repoRoot, stateDir: state ? resolve(state) : join(repoRoot, "data") });
    out({ dir: r.dir, title: r.data.title, status: r.data.status });
  } else if (cmd === "dogrula" && a) {
    const r = verifyPacket(resolve(a));
    out({ ok: r.ok, problems: r.problems });
    process.exit(r.ok ? 0 : 1);
  } else if (cmd === "oku" && a) {
    process.stdout.write(openPacket(resolve(a)).text);
  } else {
    process.stderr.write("Kullanım: node scripts/devir.mjs olustur|dogrula|oku ... (başlık yorumuna bakın)\n");
    process.exit(2);
  }
} catch (e) {
  // Beklenen her hata (hedef kuralı, bozuk girdi, dosya sistemi) tek satırlık iletidir; yığın izi basılmaz.
  const code = e && typeof e === "object" && "code" in e ? String(e.code) : "error";
  process.stderr.write(`${code}: ${e instanceof Error ? e.message : "beklenmeyen hata"}\n`);
  process.exit(1);
}
