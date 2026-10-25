// Skill Hunter ve Skill Factory komut satırı (madde 35, 36). Sahip: Claude [İP:AgentMom devam]. Yerel, ağsız; beceri ÇALIŞTIRILMAZ; yalnız kullanıcı çalıştırınca işler (ADR-016).
// Kullanım: node scripts/beceri.mjs tara <klasor>                    -> klasördeki beceri adaylarını bulur ve ön süzgeçten geçirir (hiçbir şey yazmaz)
//           node scripts/beceri.mjs uret <spec.json> <hedef-klasor>  -> spec'ten YENİ <hedef>/<ad>/SKILL.md yazar (var olanın üzerine yazmaz)
// Çıkış: 0 tamam (bulgu ve atlanan yok), 1 sorun (herhangi bir bulgu/atlanan/ret), 2 hatalı kullanım. Adayı yaşam döngüsüne kaydetmek ve kapılar insana aittir.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { huntSkills } from "../src/skills/hunter.ts";
import { writeSkill } from "../src/skills/factory.ts";

const argv = process.argv.slice(2);
const [cmd, a, b] = argv;
if (argv.some((x) => x.startsWith("--"))) {
  process.stderr.write("invalid_input: bilinmeyen bağımsız değişken\n");
  process.exit(2);
}
try {
  if (cmd === "tara" && a && !b) {
    const r = huntSkills(resolve(a));
    process.stdout.write(JSON.stringify(r, null, 2) + "\n");
    process.exit(r.skipped.length === 0 && r.candidates.every((c) => c.findings.length === 0) ? 0 : 1);
  } else if (cmd === "uret" && a && b) {
    let raw;
    try {
      raw = JSON.parse(readFileSync(resolve(a), "utf8"));
    } catch {
      process.stderr.write("invalid_input: spec dosyası okunamadı ya da geçerli JSON değil\n");
      process.exit(2);
    }
    process.stdout.write(JSON.stringify(writeSkill(raw, resolve(b)), null, 2) + "\n");
  } else {
    process.stderr.write("Kullanım: tara <klasor> | uret <spec.json> <hedef-klasor>\n");
    process.exit(2);
  }
} catch (e) {
  const code = e && typeof e === "object" && "code" in e ? String(e.code) : "error";
  process.stderr.write(`${code}: ${e instanceof Error ? e.message.split("\n")[0].slice(0, 300) : "beklenmeyen hata"}\n`);
  process.exit(1);
}
