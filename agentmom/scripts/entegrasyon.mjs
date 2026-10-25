// Entegrasyon merkezi komut satırı (madde 46, 48, 54). Sahip: Claude [İP:AgentMom devam]. Yerel, ağsız; hiçbir entegrasyonu bağlamaz ya da çalıştırmaz; yalnız kullanıcı çalıştırınca işler (ADR-016).
// Günlük: <klasor>/entegrasyon-olaylari.jsonl (yalnız ekleme). Bu komutu çalıştıran kişi "user" sayılır; "--ajan" ile "agent" olarak kaydedilir (ajan yüksek riskte onaylayamaz/etkinleştiremez).
// Kullanım: node scripts/entegrasyon.mjs liste <klasor>
//           node scripts/entegrasyon.mjs <bildir|yapilandir|onayla|etkinlestir|kapat|kaldir> <klasor> <tur> <kimlik> [--risk low|medium|high] [--baslik <metin>] [--istege-bagli] [--not <metin>] [--ajan]
//           node scripts/entegrasyon.mjs testsprite <klasor> [--anahtar-var]     -> TestSprite'ı yüksek riskli ve kapalı olarak bildirir, hazırlık engellerini yazar
// Türler: provider, ide, mcp, skill, tool.
import { resolve } from "node:path";
import { IntegrationCenter } from "../src/providers/integration-center.ts";
import { declareTestSprite, testspriteReadiness } from "../src/providers/testsprite.ts";

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
const risk = flag("--risk"), title = flag("--baslik"), note = flag("--not");
const optional = bool("--istege-bagli"), asAgent = bool("--ajan"), keyThere = bool("--anahtar-var");
const [cmd, dir, kind, id, ...rest] = argv;
if (rest.length > 0 || argv.some((x) => x.startsWith("--"))) {
  process.stderr.write("invalid_input: bilinmeyen bağımsız değişken\n");
  process.exit(2);
}
const ACTION = { bildir: "discover", yapilandir: "configure", onayla: "approve", etkinlestir: "enable", kapat: "disable", kaldir: "remove" };
const out = (o) => process.stdout.write(JSON.stringify(o, null, 2) + "\n");
const actor = asAgent ? { kind: "agent", id: "cli-ajan" } : { kind: "user", id: "cli-kullanici" };
try {
  if (!dir) {
    process.stderr.write("Kullanım: liste | bildir | yapilandir | onayla | etkinlestir | kapat | kaldir | testsprite (başlık yorumuna bakın)\n");
    process.exit(2);
  }
  const center = new IntegrationCenter(resolve(dir));
  if (cmd === "liste" && !kind) {
    const o = center.overview();
    out(o);
    process.exit(o.problems.length === 0 ? 0 : 1);
  } else if (cmd === "testsprite" && !kind) {
    const v = declareTestSprite(center, actor);
    out({ integration: v, readiness: testspriteReadiness(center, keyThere) });
  } else if (Object.hasOwn(ACTION, cmd) && kind && id) {
    out(center.record({ kind, id, action: ACTION[cmd], actor, ...(risk ? { risk } : {}), ...(title ? { title } : {}), ...(note ? { note } : {}), ...(optional ? { optional: true } : {}) }));
  } else {
    process.stderr.write("Kullanım: liste | bildir | yapilandir | onayla | etkinlestir | kapat | kaldir | testsprite (başlık yorumuna bakın)\n");
    process.exit(2);
  }
} catch (e) {
  const code = e && typeof e === "object" && "code" in e ? String(e.code) : "error";
  process.stderr.write(`${code}: ${e instanceof Error ? e.message.split("\n")[0].slice(0, 300) : "beklenmeyen hata"}\n`);
  process.exit(1);
}
