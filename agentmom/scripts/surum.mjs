// Sürüm kaydı komut satırı (madde 22). Sahip: Claude [İP:AgentMom devam]. Yalnız kullanıcı çalıştırınca işler (ADR-016); kendiliğinden hiçbir şey yapmaz.
// Kullanım: node scripts/surum.mjs durum <proje-klasörü>                  -> sürüm, commit, kontroller (salt okunur)
//           node scripts/surum.mjs onizle <proje-klasörü> patch|minor|major -> sonraki sürüm numarası (hiçbir şey değişmez)
//           node scripts/surum.mjs yaz <proje-klasörü>                     -> docs/surumler/<sürüm>.md YENİ dosya (var olanın üzerine yazmaz)
import { ReleaseError, checkRelease, nextVersion, readRelease, resolveRepo, writeNotes } from "../src/ops/release.ts";

const [cmd, a, b] = process.argv.slice(2);
const out = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");
try {
  if (cmd === "durum" && a) {
    const r = checkRelease(resolveRepo(a));
    out(r);
    process.exit(r.ok ? 0 : 1);
  } else if (cmd === "onizle" && a && b) {
    const info = readRelease(resolveRepo(a));
    out({ current: info.version, next: nextVersion(info.version, b), note: "yalnız önizleme: package.json değiştirilmedi" });
  } else if (cmd === "yaz" && a) {
    const r = writeNotes(resolveRepo(a));
    out({ path: r.path });
  } else {
    process.stderr.write("Kullanım: node scripts/surum.mjs durum|onizle|yaz ... (başlık yorumuna bakın)\n");
    process.exit(2);
  }
} catch (e) {
  if (e instanceof ReleaseError) {
    process.stderr.write(`${e.code}: ${e.message}\n`);
    process.exit(1);
  }
  throw e;
}
