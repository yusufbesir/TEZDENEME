// Proje kapsülü komut satırı (madde 79). Sahip: Claude [İP:AgentMom devam]. Yalnız kullanıcı çalıştırınca işler (ADR-016); kendiliğinden hiçbir şey yapmaz.
// Kullanım: node scripts/kapsul.mjs plan <proje-klasörü>
//           node scripts/kapsul.mjs olustur <proje-klasörü> <hedef-klasör> [--durum <klasör>]   -> hedefte YENİ kapsül klasörü
//           node scripts/kapsul.mjs dogrula <kapsül-klasörü>
//           node scripts/kapsul.mjs ac <kapsül-klasörü> <yeni-klasör> <proje-klasörü> [--durum <klasör>]   -> doğrulanmış kopya (kurulum yapmaz)
import { join, resolve } from "node:path";
import { CapsuleError, createCapsule, planCapsule, restoreCapsule, verifyCapsule } from "../src/ops/capsule.ts";

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(name);
  if (i < 0) return undefined;
  const v = argv[i + 1];
  argv.splice(i, 2);
  return v;
};
const state = flag("--durum");
const [cmd, a, b, c] = argv;
const out = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");
const usage = () => {
  process.stderr.write("Kullanım: node scripts/kapsul.mjs plan|olustur|dogrula|ac ... (başlık yorumuna bakın)\n");
  process.exit(2);
};
try {
  if (cmd === "plan" && a) out(planCapsule(resolve(a)));
  else if (cmd === "olustur" && a && b) {
    const repoRoot = resolve(a);
    const r = createCapsule({ repoRoot, destRoot: resolve(b), stateDir: state ? resolve(state) : join(repoRoot, "data") });
    out({ dir: r.dir, project: r.manifest.project, files: r.manifest.files.map((f) => f.name), restoreHint: r.manifest.restoreHint, notIncluded: r.manifest.notIncluded });
  } else if (cmd === "dogrula" && a) {
    const r = verifyCapsule(resolve(a));
    out({ ok: r.ok, problems: r.problems });
    process.exit(r.ok ? 0 : 1);
  } else if (cmd === "ac" && a && b && c) {
    const repoRoot = resolve(c);
    out(restoreCapsule({ capsuleDir: resolve(a), targetDir: resolve(b), repoRoot, stateDir: state ? resolve(state) : join(repoRoot, "data") }));
  } else usage();
} catch (e) {
  if (e instanceof CapsuleError) {
    process.stderr.write(`${e.code}: ${e.message}\n`);
    process.exit(1);
  }
  throw e;
}
