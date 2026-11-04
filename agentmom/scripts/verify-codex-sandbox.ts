// AgentMom: Codex sandbox DOĞRULAMA testi (salt okuma, model çağrısı yok). Yazan: Claude [İP:AgentMom Faz 6].
// Kullanım: node scripts/verify-codex-sandbox.ts baseline | elevated
// Ne yapar: `codex sandbox -- cmd /c type <yol>` ile sandbox içinden okuma dener ve sonucu sınıflar.
//   - kontrol: AgentMom'un kendi durum klasöründeki deneme dosyası OKUNABİLMELİ (aksi halde sandbox bozuk).
//   - yasak yollar: D:\Arşiv ve D:\YusufII\HAFIZAM1\anahtarlar altında VAR OLMAYAN bir dosya adı denenir. Dizin listelenmez, içerik okunmaz,
//     hiçbir şey yazılmaz, ACL'e dokunulmaz. "Erişim engellendi" = sandbox bu klasöre giremiyor (GEÇTİ);
//     "dosya bulunamadı" = sandbox klasörün içine bakabiliyor (KALDI: okunabilir); başka bir şey = BELİRSİZ.
// baseline: bugünkü (yükseltilmemiş) durumu ölçer; elevated: windows.sandbox="elevated" ile ölçer (kurulumdan sonra).
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const CODEX = "D:\\Programlar\\npm-global\\node_modules\\@openai\\codex\\node_modules\\@openai\\codex-win32-x64\\vendor\\x86_64-pc-windows-msvc\\bin\\codex.exe";
const mode = process.argv[2];
if (mode !== "baseline" && mode !== "elevated") {
  console.log("usage: node scripts/verify-codex-sandbox.ts baseline | elevated");
  process.exit(2);
}

const stateDir = "D:\\YusufII\\Projeler\\agentmom-state\\sandbox-probe";
mkdirSync(stateDir, { recursive: true });
const inside = join(stateDir, "inside.txt");
writeFileSync(inside, "agentmom-probe-inside\n");

// Windows prints these in the OEM code page, which arrives garbled as UTF-8: the patterns tolerate 1-4 odd characters.
const DENIED = /access is denied|eri.{1,4}im engellendi|reddedildi|permission denied|izin verilmiyor/i;
const NOTFOUND = /cannot find|belirtilen dosya.{1,4}bulam.{1,4}yor|belirtilen yolu.{1,4}bulam|bulunamad|not found|no such file/i;

interface Probe {
  name: string;
  path: string;
  expect: "readable" | "blocked";
}

const probes: Probe[] = [
  { name: "kontrol: AgentMom durum klasörü", path: inside, expect: "readable" },
  { name: "yasak: D:\\Arşiv", path: "D:\\Arşiv\\__agentmom_sandbox_probe_yok__.txt", expect: "blocked" },
  { name: "yasak: anahtarlar klasörü", path: "D:\\YusufII\\HAFIZAM1\\anahtarlar\\__agentmom_sandbox_probe_yok__.txt", expect: "blocked" },
];

const cfg = mode === "elevated" ? ["-c", 'windows.sandbox="elevated"'] : [];
const rows: Array<{ name: string; expect: string; observed: string; verdict: "GEÇTİ" | "KALDI" | "BELİRSİZ"; exit: number | null; detail: string }> = [];
for (const p of probes) {
  const r = spawnSync(CODEX, ["sandbox", ...cfg, "--", "cmd", "/c", "type", p.path], { encoding: "utf8", timeout: 60_000, windowsHide: true, cwd: resolve("D:\\YusufII\\Projeler\\agentmom") });
  const text = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  const readable = r.status === 0 && /agentmom-probe-inside/.test(text);
  const observed = readable ? "okundu" : DENIED.test(text) ? "erişim engellendi" : NOTFOUND.test(text) ? "dosya yok (klasöre girilebiliyor)" : "belirsiz";
  let verdict: "GEÇTİ" | "KALDI" | "BELİRSİZ";
  if (p.expect === "readable") verdict = readable ? "GEÇTİ" : "KALDI";
  else verdict = observed === "erişim engellendi" ? "GEÇTİ" : observed.startsWith("dosya yok") ? "KALDI" : "BELİRSİZ";
  rows.push({ name: p.name, expect: p.expect === "readable" ? "okunabilmeli" : "engellenmeli", observed, verdict, exit: r.status, detail: text.replace(/\s+/g, " ").trim().slice(0, 200) });
}

console.log(`Codex sandbox doğrulama (${mode}) — ${new Date().toISOString()}`);
for (const r of rows) console.log(`${r.verdict.padEnd(9)} ${r.name} | beklenen: ${r.expect} | gözlenen: ${r.observed} | çıkış: ${r.exit}`);
const ok = rows.every((r) => r.verdict === "GEÇTİ");
console.log(ok ? "SONUÇ: GEÇTİ (sandbox yasak klasörleri okuyamıyor)" : "SONUÇ: GEÇMEDİ — ayrıntı:");
if (!ok) for (const r of rows.filter((x) => x.verdict !== "GEÇTİ")) console.log(` - ${r.name}: ${r.detail}`);
const out = resolve("data", `sandbox-dogrulama-${mode}.json`);
mkdirSync(resolve("data"), { recursive: true });
writeFileSync(out, JSON.stringify({ mode, at: new Date().toISOString(), ok, rows }, null, 1));
console.log("kayıt:", out);
process.exit(ok ? 0 : 1);
