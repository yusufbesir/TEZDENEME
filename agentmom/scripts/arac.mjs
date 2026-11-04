// Güvenilir araç pazarı komut satırı (madde 32). Sahip: Claude [İP:AgentMom devam]. Yerel, ağsız; aracı ÇALIŞTIRMAZ; yalnız kullanıcı çalıştırınca işler (ADR-016).
// "Pazar" = getirdiğiniz katalog klasörü (her alt klasör bir araç paketi: tool.json + dosyalar). Güven klasörüne yalnız YENİ onay/iptal kayıtları eklenir; hiçbir şey silinmez ya da ezilmez.
// Kullanım: node scripts/arac.mjs manifest-uret <arac-klasoru> --id <kimlik> --surum 1.0.0 --baslik <metin> --yayinci <metin> --giris <dosya> [--izin a,b]   -> tool.json'u STDOUT'a yazar (dosyayı siz kaydedersiniz)
//           node scripts/arac.mjs incele <arac-klasoru>                                   -> doğrular, izinleri ve riski gösterir (hiçbir şey yazmaz)
//           node scripts/arac.mjs degerlendir <arac-klasoru> --guven <klasor> --repo <klasor> [--durum <klasor>]
//           node scripts/arac.mjs onayla <arac-klasoru> --izin a,b --guven <klasor> --repo <klasor> [--durum <klasor>] [--yuksek-risk-onayliyorum]
//           node scripts/arac.mjs iptal <kimlik> <surum> --guven <klasor> --repo <klasor> [--durum <klasor>]
//           node scripts/arac.mjs katalog <katalog-klasoru> --guven <klasor> --repo <klasor> [--durum <klasor>]
// İzinler: read_workspace (düşük), write_workspace (orta), run_process (yüksek), network (yüksek). Anahtar/gizli bilgi izni yoktur.
import { createHash } from "node:crypto";
import { readdirSync, lstatSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { readRegular } from "../src/ops/capsule.ts";
import { PERMISSIONS, TOOL_SCHEMA, ToolError, approveTool, evaluateCatalog, evaluateTool, parseManifest, reviewPackage, revokeTool } from "../src/ops/tool-registry.ts";

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const v = argv[i + 1];
  if (v === undefined || v.startsWith("--")) {
    process.stderr.write(`invalid_input: ${name} bir değer istiyor\n`);
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
const guven = flag("--guven"), repo = flag("--repo"), durum = flag("--durum"), izin = flag("--izin");
const id = flag("--id"), surum = flag("--surum"), baslik = flag("--baslik"), yayinci = flag("--yayinci"), giris = flag("--giris");
const high = bool("--yuksek-risk-onayliyorum");
const [cmd, a, b] = argv;
if (argv.some((x) => x.startsWith("--"))) {
  process.stderr.write("invalid_input: bilinmeyen bağımsız değişken\n");
  process.exit(2);
}
const perms = izin === undefined ? [] : izin.split(",").filter(Boolean);
const trustOpts = () => {
  if (!guven || !repo) {
    process.stderr.write("invalid_input: --guven <klasor> ve --repo <klasor> zorunlu\n");
    process.exit(2);
  }
  const repoRoot = resolve(repo);
  return { trustDir: resolve(guven), repoRoot, stateDir: durum ? resolve(durum) : join(repoRoot, "data") };
};
const out = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");
try {
  if (cmd === "manifest-uret" && a) {
    if (!id || !surum || !baslik || !yayinci || !giris) throw new ToolError("invalid_input", "manifest-uret için --id --surum --baslik --yayinci --giris zorunlu");
    const dir = resolve(a);
    const files = [];
    const walk = (d) => {
      for (const n of readdirSync(d).sort()) {
        const p = join(d, n);
        const st = lstatSync(p);
        if (st.isDirectory() && !st.isSymbolicLink()) walk(p);
        else {
          const rel = relative(dir, p).split("\\").join("/");
          if (rel === "tool.json") continue;
          const buf = readRegular(p, rel);
          files.push({ path: rel, sha256: createHash("sha256").update(buf).digest("hex"), bytes: buf.length });
        }
      }
    };
    walk(dir);
    const manifest = { schema: TOOL_SCHEMA, id, version: surum, title: baslik, publisher: yayinci, permissions: perms, entry: giris, files };
    parseManifest(manifest);
    process.stdout.write(JSON.stringify(manifest, null, 2) + "\n");
  } else if (cmd === "incele" && a) {
    const r = reviewPackage(resolve(a));
    out({ id: r.manifest.id, version: r.manifest.version, publisher: r.manifest.publisher, permissions: r.manifest.permissions, risk: r.risk, digest: r.digest, ok: r.problems.length === 0, problems: r.problems });
    process.exit(r.problems.length === 0 ? 0 : 1);
  } else if (cmd === "degerlendir" && a) {
    const e = evaluateTool(resolve(a), trustOpts());
    out(e);
    process.exit(e.state === "trusted" ? 0 : 1);
  } else if (cmd === "onayla" && a) {
    const r = approveTool(resolve(a), perms, { ...trustOpts(), acceptHighRisk: high });
    out({ file: r.file, id: r.approval.id, version: r.approval.version, granted: r.approval.granted });
  } else if (cmd === "iptal" && a && b) {
    out(revokeTool(a, b, trustOpts()));
  } else if (cmd === "katalog" && a) {
    out(evaluateCatalog(resolve(a), trustOpts()));
  } else {
    process.stderr.write(`Kullanım: manifest-uret | incele | degerlendir | onayla | iptal | katalog (başlık yorumuna bakın). İzinler: ${Object.keys(PERMISSIONS).join(", ")}\n`);
    process.exit(2);
  }
} catch (e) {
  const code = e && typeof e === "object" && "code" in e ? String(e.code) : "error";
  process.stderr.write(`${code}: ${e instanceof Error ? e.message.split("\n")[0].slice(0, 300) : "beklenmeyen hata"}\n`);
  process.exit(code === "invalid_input" ? 2 : 1);
}
