// Otomatik dokümantasyon: SAF işlevler (madde 21). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Dosya sistemine DOKUNMAZ: girdi olarak {yol, içerik} listeleri alır, metin üretir. Dosyaları okuyup tek çıktıyı yazan kabuk scripts/dokuman-uret.mjs'dir.
// Deterministik: tarih/saat yok, sıralama kod noktasına göre (yerel ayara bağlı değil), satır sonları LF. Aynı girdi => bayt bayt aynı çıktı.
// Model/ağ yok. Çıkarımlar "ham ve basit"tir: çözümlenemeyenler uydurulmaz, ayrı listede açıkça belirtilir.

import { redactString } from "../core/audit/redact.ts";

export interface SourceFile {
  path: string;
  content: string;
}

export const GENERATED_HEADER = [
  "<!--",
  "ÜRETİLMİŞ DOSYA: scripts/dokuman-uret.mjs; elle değiştirmeyin; sahibi Claude [İP:AgentMom Faz 11].",
  "Ne bu: depodan deterministik üretilen otomatik belge (modül haritası, HTTP uç tablosu, migrasyon listesi, yetenek kontrol listesi sayımları).",
  "Kim değiştirir: yalnız scripts/dokuman-uret.mjs (node scripts/dokuman-uret.mjs). Güncel mi diye bakmak için: node scripts/dokuman-uret.mjs --dogrula.",
  "Silme yalnız Yusuf'un kararıyla ve Geri Dönüşüm Kutusu'na taşıyarak yapılır.",
  "-->",
].join("\n");

const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const lf = (s: string): string => s.replace(/\r\n?/g, "\n");
// Markdown tablo hücresi: boru, satır sonu ve baştaki/sondaki boşluk etkisizleştirilir.
const cell = (s: string): string => s.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

// ---- açıklama çıkarımı ------------------------------------------------------------------------------------------------
// Dosyanın başındaki yorumdan ilk cümleyi alır. Desteklenen yorum biçimleri: `//` satırları, `/* ... */`, `<!-- ... -->`, `--` satırları (SQL).
export function leadingComment(content: string): string {
  const lines = lf(content).split("\n");
  let i = 0;
  while (i < lines.length && (lines[i] as string).trim() === "") i++;
  if ((lines[i] ?? "").startsWith("#!")) i++;
  const picked: string[] = [];
  const first = (lines[i] ?? "").trim();
  if (first.startsWith("/*")) {
    const end = lines.slice(i).findIndex((l) => l.includes("*/"));
    const block = lines.slice(i, end < 0 ? i + 1 : i + end + 1).join("\n");
    picked.push(block.replace(/^\/\*+/, "").replace(/\*+\/\s*$/, "").replace(/^\s*\*\s?/gm, ""));
  } else if (first.startsWith("<!--")) {
    const end = lines.slice(i).findIndex((l) => l.includes("-->"));
    const block = lines.slice(i, end < 0 ? i + 1 : i + end + 1).join("\n");
    picked.push(block.replace(/^<!--/, "").replace(/-->\s*$/, ""));
  } else {
    const prefix = first.startsWith("//") ? "//" : first.startsWith("--") ? "--" : null;
    if (prefix) {
      for (; i < lines.length && picked.length < 4; i++) {
        const l = (lines[i] as string).trim();
        if (!l.startsWith(prefix)) break;
        const t = l.slice(prefix.length).trim();
        if (t === "" || /^@ts-|^eslint|^prettier/.test(t)) break;
        picked.push(t);
      }
    }
  }
  return picked.join(" ").replace(/\s+/g, " ").trim();
}

// İlk cümle: ". " / "! " / "? " ya da satır sonuna kadar; "Sahip:", "Owner:" gibi künye parçaları cümleye dahil edilmez.
export function firstSentence(text: string, max = 200): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t === "") return "";
  const m = /^(.*?[.!?])(?=\s|$)/.exec(t);
  const s = (m ? (m[1] as string) : t).trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function describeFile(path: string, content: string | null): string {
  if (content === null) return "(ikili ya da okunmayan dosya)";
  const s = firstSentence(redactString(leadingComment(content))); // önce maskele, sonra kes
  return s === "" ? "(açıklama yok)" : s;
}

// ---- modül haritası ------------------------------------------------------------------------------------------------------
// `src` altındaki her klasör ve dosya. İçerik null ise (ikili dosya) açıklama yerine işaret yazılır.
export function moduleMap(files: Array<{ path: string; content: string | null }>): string {
  const sorted = [...files].sort((a, b) => cmp(a.path, b.path));
  const dirs = new Map<string, Array<{ path: string; content: string | null }>>();
  for (const f of sorted) {
    const dir = f.path.includes("/") ? f.path.slice(0, f.path.lastIndexOf("/")) : "(kök)";
    dirs.set(dir, [...(dirs.get(dir) ?? []), f]);
  }
  const out: string[] = ["## Modül haritası", "", `src altında ${sorted.length} dosya, ${dirs.size} klasör. Açıklama = dosya başındaki yorumun ilk cümlesi.`, ""];
  for (const dir of [...dirs.keys()].sort(cmp)) {
    const list = dirs.get(dir) as Array<{ path: string; content: string | null }>;
    out.push(`### ${dir}/`, "", "| Dosya | Açıklama |", "| --- | --- |");
    for (const f of list) out.push(`| ${cell(f.path.slice(f.path.lastIndexOf("/") + 1))} | ${cell(describeFile(f.path, f.content))} |`);
    out.push("");
  }
  return out.join("\n");
}

// ---- HTTP uçları -------------------------------------------------------------------------------------------------------
export interface RouteInfo {
  method: string;
  path: string;
}

export interface RouteScan {
  routes: RouteInfo[];
  unresolved: string[];
}

// Kayıtlı düzenli ifadenin okunabilir yola çevrilmesi (basit): gruplar :id / :param / {a|b} / [/a] olur.
export function regexToPath(source: string): string {
  let s = source.replace(/^\/\^?/, "").replace(/\$?\/[a-z]*$/, "");
  s = s.replace(/\\\//g, "/");
  s = s.replace(/\(\[0-9a-f-\]\{36\}\)/g, ":id").replace(/\(\[\^\/\]\+\)/g, ":param");
  s = s.replace(/\(\?:\/\(([A-Za-z0-9_|-]+)\)\)\?/g, "[/$1]");
  s = s.replace(/\(([A-Za-z0-9_|-]+\|[A-Za-z0-9_|-]+)\)/g, "{$1}");
  s = s.replace(/\([^()]*\)/g, ":param");
  return s;
}

// app.ts kaynağında `url.pathname === "..."`, `url.pathname.startsWith("...")` ve `const ad = /^...$/.exec(url.pathname)` kalıplarını arar.
// Yöntem, aynı `if` satırındaki `method === "X"` ifadelerinden alınır; yoksa "*". Bir düzenli ifade hiçbir yöntemli satırda kullanılmıyorsa çözümlenemedi sayılır.
export function extractRoutes(appSource: string): RouteScan {
  const found = new Set<string>();
  const defs = new Map<string, { source: string; used: boolean }>();
  const unresolved = new Set<string>();
  const add = (method: string, path: string): void => void found.add(`${method} ${path}`);
  for (const raw of lf(appSource).split("\n")) {
    const l = raw.trim();
    if (l.startsWith("//") || l.startsWith("*") || l.startsWith("/*")) continue;
    const def = /^(?:const|let)\s+(\w+)\s*=\s*(\/\^.*\/[a-z]*)\.exec\(url\.pathname\)/.exec(l);
    if (def) {
      const prev = defs.get(def[1] as string);
      if (prev && !prev.used) unresolved.add(`${regexToPath(prev.source)} (düzenli ifade; yöntem satırda belirlenemedi)`);
      defs.set(def[1] as string, { source: def[2] as string, used: false });
      continue;
    }
    const methods = [...l.matchAll(/method === "([A-Z]+)"/g)].map((m) => m[1] as string);
    const ms = methods.length ? [...new Set(methods)] : ["*"];
    for (const m of l.matchAll(/url\.pathname === "([^"]+)"/g)) for (const x of ms) add(x, m[1] as string);
    for (const m of l.matchAll(/url\.pathname\.startsWith\("([^"]+)"\)/g)) for (const x of ms) add(x, `${m[1] as string}*`);
    if (methods.length > 0) {
      for (const [name, d] of defs) {
        if (new RegExp(`(^|[^\\w.])${name}([^\\w]|$)`).test(l)) {
          d.used = true;
          for (const x of ms) add(x, regexToPath(d.source));
        }
      }
    }
  }
  for (const d of defs.values()) if (!d.used) unresolved.add(`${regexToPath(d.source)} (düzenli ifade; yöntem satırda belirlenemedi)`);
  const all = [...found].map((k) => ({ method: k.slice(0, k.indexOf(" ")), path: k.slice(k.indexOf(" ") + 1) }));
  // İç içe koşullarda yöntemi olmayan satırlar ("*") aynı yol için yöntemli bir satır varsa gürültüdür ve atılır.
  const withMethod = new Set(all.filter((r) => r.method !== "*").map((r) => r.path));
  const routes = all.filter((r) => r.method !== "*" || !withMethod.has(r.path)).sort((a, b) => cmp(a.path, b.path) || cmp(a.method, b.method));
  return { routes, unresolved: [...unresolved].sort(cmp) };
}

export function routeTable(appSource: string): string {
  const scan = extractRoutes(appSource);
  const out: string[] = ["## HTTP uçları (src/server/app.ts)", "", `Ham çıkarım: ${scan.routes.length} uç. Yöntem "*" = satırda yöntem koşulu yok. Yol parametreleri :id / :param / {a|b} olarak gösterilir.`, "", "| Yöntem | Yol |", "| --- | --- |"];
  for (const r of scan.routes) out.push(`| ${r.method} | ${cell(r.path)} |`);
  out.push("", "### Çözümlenemedi", "");
  if (scan.unresolved.length === 0) out.push("- (yok)");
  else for (const u of scan.unresolved) out.push(`- ${u.replace(/\s+/g, " ").trim()}`);
  out.push("");
  return out.join("\n");
}

// ---- migrasyonlar --------------------------------------------------------------------------------------------------------
// `NNN_ad.sql` dosyaları (".down.sql" hariç): ad + başlık yorumunun ilk cümlesi.
export function migrationList(files: SourceFile[]): string {
  const ups = files.filter((f) => /\/migrations\/\d+_[^/]+\.sql$/.test(f.path) && !f.path.endsWith(".down.sql")).sort((a, b) => cmp(a.path, b.path));
  const out: string[] = ["## Migrasyonlar (src/core/db/migrations)", "", `${ups.length} ileri migrasyon.`, "", "| Migrasyon | Başlık |", "| --- | --- |"];
  for (const f of ups) out.push(`| ${cell(f.path.slice(f.path.lastIndexOf("/") + 1))} | ${cell(describeFile(f.path, f.content))} |`);
  out.push("");
  return out.join("\n");
}

// ---- kontrol listesi sayımları -----------------------------------------------------------------------------------------
// docs/status/100-yetenek-durum.json içeriğinden durum sayımları (öğelerden yeniden sayılır; özetle çelişirse not düşer).
export function checklistCounts(json: string | null): string {
  const out: string[] = ["## Yetenek kontrol listesi sayımları (docs/status/100-yetenek-durum.json)", ""];
  if (json === null) return [...out, "- Durum dosyası okunamadı.", ""].join("\n");
  let parsed: { summary?: Record<string, unknown>; items?: Array<{ durum?: unknown }> };
  try {
    parsed = JSON.parse(json) as typeof parsed;
  } catch {
    return [...out, "- Durum dosyası geçerli JSON değil.", ""].join("\n");
  }
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const names = ["Doğrulandı", "Kısmi", "Planlı", "Desteklenmiyor", "Kapsam dışı"];
  const counts = names.map((n) => items.filter((i) => i.durum === n).length);
  const other = items.length - counts.reduce((a, b) => a + b, 0);
  out.push("| Durum | Sayı |", "| --- | --- |");
  names.forEach((n, i) => out.push(`| ${n} | ${counts[i] as number} |`));
  if (other > 0) out.push(`| Tanımsız durum | ${other} |`);
  out.push(`| Toplam | ${items.length} |`, "");
  const sum = parsed.summary;
  if (sum && typeof sum.total === "number" && sum.total !== items.length) out.push(`Uyarı: özet toplamı (${sum.total}) öğe sayısıyla (${items.length}) uyuşmuyor.`, "");
  return out.join("\n");
}

// ---- tüm belge -----------------------------------------------------------------------------------------------------------
export interface DocInputs {
  // src altındaki her dosya (yol depo köküne göre, "/" ayraçlı: "src/..."); ikili dosyada content null.
  srcFiles: Array<{ path: string; content: string | null }>;
  // src/server/app.ts içeriği (yoksa null).
  appSource: string | null;
  // docs/status/100-yetenek-durum.json içeriği (yoksa null).
  checklistJson: string | null;
}

export function buildDocument(input: DocInputs): string {
  const migrations = input.srcFiles.filter((f): f is SourceFile => f.content !== null && f.path.startsWith("src/core/db/migrations/"));
  const parts = [
    GENERATED_HEADER,
    "",
    "# AgentMom otomatik belge",
    "",
    "Bu belge depodan deterministik üretilir (tarih/saat içermez). Elle değiştirmeyin; kaynak değişince `node scripts/dokuman-uret.mjs` ile yeniden üretin.",
    "",
    moduleMap(input.srcFiles),
    input.appSource === null ? "## HTTP uçları (src/server/app.ts)\n\n- Kaynak okunamadı.\n" : routeTable(input.appSource),
    migrationList(migrations),
    checklistCounts(input.checklistJson),
  ];
  return lf(parts.join("\n")).replace(/\n{3,}/g, "\n\n").replace(/\s+$/, "") + "\n";
}
