// Otomatik belge üretici kabuğu (madde 21). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Depoyu OKUR (src altı, src/server/app.ts, docs/status/100-yetenek-durum.json), saf işlevlerden (src/docs/autodoc.ts) belgeyi üretir ve YALNIZ
// docs/status/otomatik-dokuman.md dosyasına yazar. Başka hiçbir dosyaya yazmaz, dizin oluşturmaz. Tarih/saat yazmaz: aynı girdi => bayt bayt aynı çıktı.
// Kullanım: node scripts/dokuman-uret.mjs               -> belgeyi üretir (varsa üzerine yazar: üretilmiş dosyadır)
//           node scripts/dokuman-uret.mjs --dogrula     -> yazmadan karşılaştırır; belge yok ya da bayatsa çıkış kodu 1
//           --kok <dizin>                               -> depo kökü (varsayılan: bu betiğin üst klasörü); testler için
import { existsSync, lstatSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildDocument } from "../src/docs/autodoc.ts";

const TEXT_EXT = new Set([".ts", ".js", ".mjs", ".css", ".html", ".sql", ".json", ".md", ".txt", ".ps1", ".sh"]);
const OUT_REL = "docs/status/otomatik-dokuman.md";

function usage(msg) {
  process.stderr.write(`${msg}\nKullanım: node scripts/dokuman-uret.mjs [--dogrula] [--kok <dizin>]\n`);
  process.exit(2);
}

const args = process.argv.slice(2);
let check = false;
let root = resolve(import.meta.dirname, "..");
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--dogrula") check = true;
  else if (args[i] === "--kok" && typeof args[i + 1] === "string") root = resolve(args[++i]);
  else usage(`Bilinmeyen bağımsız değişken: ${args[i]}`);
}

// src altındaki tüm dosyalar (sembolik bağlantılar atlanır), "/" ayraçlı yollarla, kod noktası sırasıyla.
function walk(dirAbs, rel, out) {
  for (const name of readdirSync(dirAbs).sort()) {
    const abs = join(dirAbs, name);
    const st = lstatSync(abs);
    if (st.isSymbolicLink()) continue;
    const r = `${rel}/${name}`;
    if (st.isDirectory()) walk(abs, r, out);
    else if (st.isFile()) {
      const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")).toLowerCase() : "";
      out.push({ path: r, content: TEXT_EXT.has(ext) ? readFileSync(abs, "utf8") : null });
    }
  }
}

const srcDir = join(root, "src");
if (!existsSync(srcDir)) usage(`src klasörü bulunamadı: ${srcDir}`);
const srcFiles = [];
walk(srcDir, "src", srcFiles);
const readIf = (rel) => (existsSync(join(root, rel)) ? readFileSync(join(root, rel), "utf8") : null);
const doc = buildDocument({ srcFiles, appSource: readIf("src/server/app.ts"), checklistJson: readIf("docs/status/100-yetenek-durum.json") });

const outPath = join(root, OUT_REL);
if (check) {
  const current = existsSync(outPath) ? readFileSync(outPath, "utf8").replace(/\r\n?/g, "\n") : null;
  if (current === null) {
    process.stderr.write(`Belge yok: ${OUT_REL}. Üretmek için: node scripts/dokuman-uret.mjs\n`);
    process.exit(1);
  }
  if (current !== doc) {
    process.stderr.write(`Belge BAYAT: ${OUT_REL} depoyla uyuşmuyor. Yeniden üretin: node scripts/dokuman-uret.mjs\n`);
    process.exit(1);
  }
  process.stdout.write(`Belge güncel: ${OUT_REL}\n`);
} else {
  if (!existsSync(join(root, "docs", "status"))) usage("docs/status klasörü yok; betik klasör oluşturmaz.");
  // Sembolik bağ / kavşak (junction) üzerinden başka yere yazmayı önle: docs, docs/status ve çıktı dosyası bağlantı olamaz.
  for (const p of [join(root, "docs"), join(root, "docs", "status"), outPath]) {
    if (existsSync(p) && lstatSync(p).isSymbolicLink()) usage(`Yazma reddedildi: ${p} bir sembolik bağ ya da kavşak.`);
  }
  writeFileSync(outPath, doc, { encoding: "utf8" });
  process.stdout.write(`Yazıldı: ${OUT_REL} (${doc.length} karakter)\n`);
}
