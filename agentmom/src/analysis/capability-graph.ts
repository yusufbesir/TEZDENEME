// Yetenek ve bağımlılık grafiği + yetenek düzeyinde etki analizi (madde 47 ve 10, D10). Sahip: Claude [İP:AgentMom devam]; yalnız yazan yapay zeka değiştirir.
// SALT OKUNUR, modelsiz, ağsız, kendiliğinden çalışmaz (ADR-016): yalnız kullanıcı komutuyla (scripts/yetenek-grafi.mjs) ya da testte çağrılır.
// Girdi iki kaynaktır: (1) docs/status/100-yetenek-durum.json içindeki yetenek -> kanıt dosyası eşlemesi, (2) src/analysis/impact.ts içe aktarma grafiği (madde 70).
// Kenar kuralı: A yeteneğinin bir kanıt dosyası, B yeteneğinin kanıt dosyasını DOĞRUDAN içe aktarıyorsa ve o dosya A'nın da kanıtı değilse A -> B (A, B'ye bağlı).
// Test dosyaları kenar KAYNAĞI olmaz (testler başka yeteneğin düzeneğini kurmak için içe aktarır; bu üretim bağımlılığı değildir).
// Çok yeteneğin ortak kanıtı olan dosyalar (> COMMON_OWNERS sahip) ne kaynak ne hedef olarak kenar üretir, ayrı listelenir: aksi halde her yetenek her yeteneğe bağlı görünür.
// Uydurma yok: kanıt listesinde olup grafikte bulunmayan dosya (belge, SQL, UI betiği ...) ayrı sayılır; etkisi 'bilinmiyor' kalır.
import { analyzeImpact, validateFileParam } from "./impact.ts";
import type { ImportGraph } from "./impact.ts";

export const COMMON_OWNERS = 3;
export const MAX_CHANGED = 50;
export const MAX_DEPTH_PARAM = 6;
export const VIA_EXAMPLES = 3;
const LIST_CAP = 500;
const SAFE_OTHER = /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[\p{L}\p{N}._\-/]{1,200}$/u;

export class GraphInputError extends Error {}

// impact.ts'in tarama özeti: kesilen ya da büyük diye atlanan dosya varsa grafik eksiktir.
export interface ScanInfo {
  truncated: boolean;
  skippedLarge: number;
}
const incomplete = (graph: ImportGraph, scan?: ScanInfo): boolean => graph.truncated || graph.stats.skippedFiles > 0 || graph.stats.unresolvedInSrc > 0 || !!scan?.truncated || (scan?.skippedLarge ?? 0) > 0;
// Çıktıya giren her metinden satır sonu, denetim ve biçim karakterleri atılır (başka depodan gelen ad/durum/dosya adı çıktıyı bozamaz).
const clean = (s: string): string => s.replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, " ");

export interface Capability {
  n: number;
  ad: string;
  durum: string;
  kanit: string[];
}

// Katı biçim denetimi: 1..100 arası tekil numara, dize alanlar, göreli kanıt yolları.
export function parseCapabilities(raw: unknown): Capability[] {
  const items = (raw as { items?: unknown } | null)?.items;
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) throw new GraphInputError("items 1..100 elemanlı bir dizi olmalı");
  const seen = new Set<number>();
  const out: Capability[] = [];
  for (const it of items as Array<Record<string, unknown>>) {
    const n = it?.n;
    const ad = it?.tr;
    const durum = it?.durum;
    const kanit = it?.kanit;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 100) throw new GraphInputError("n 1..100 arası tam sayı olmalı");
    if (seen.has(n)) throw new GraphInputError(`n tekrarlandı: ${n}`);
    seen.add(n);
    if (typeof ad !== "string" || ad.length === 0 || ad.length > 200) throw new GraphInputError(`madde ${n}: tr 1..200 karakter olmalı`);
    if (typeof durum !== "string" || durum.length === 0 || durum.length > 40) throw new GraphInputError(`madde ${n}: durum geçersiz`);
    if (!Array.isArray(kanit) || kanit.length > 200) throw new GraphInputError(`madde ${n}: kanit en çok 200 elemanlı dizi olmalı`);
    for (const k of kanit) {
      if (typeof k !== "string" || k.length === 0 || k.length > 200 || k.startsWith("/") || k.includes("\\") || k.includes("\0") || k.split("/").some((seg) => seg === ".." || seg === "." || seg === "")) throw new GraphInputError(`madde ${n}: kanit yolu göreli ve düz olmalı`);
    }
    out.push({ n, ad, durum, kanit: [...new Set(kanit as string[])] });
  }
  return out.sort((a, b) => a.n - b.n);
}

export interface CapNode {
  n: number;
  ad: string;
  durum: string;
  files: number;
  outsideGraph: number;
}

export interface CapEdge {
  from: number;
  to: number;
  count: number;
  via: Array<[string, string]>;
}

export interface CapabilityGraph {
  nodes: CapNode[];
  edges: CapEdge[];
  commonFiles: Array<{ file: string; owners: number[] }>;
  outsideGraph: Array<{ file: string; owners: number[] }>;
  cycles: number[][];
  isolated: number[];
  graphIncomplete: boolean;
}

const isTestFile = (p: string): boolean => /\.test\.(ts|js|mjs)$/.test(p);
const cmp = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

function ownersOf(caps: Capability[]): Map<string, number[]> {
  const owners = new Map<string, number[]>();
  for (const c of caps) for (const f of c.kanit) (owners.get(f) ?? owners.set(f, []).get(f)!).push(c.n);
  return owners;
}

// Yetenek düzeyinde döngüler (iki ya da daha çok yetenek birbirine bağlıysa): yinelemesiz Tarjan, boyuta göre sıralı.
function capCycles(nodes: number[], adj: Map<number, number[]>): number[][] {
  let index = 0;
  const idx = new Map<number, number>();
  const low = new Map<number, number>();
  const onStack = new Set<number>();
  const stack: number[] = [];
  const out: number[][] = [];
  for (const root of nodes) {
    if (idx.has(root)) continue;
    const work: Array<{ v: number; i: number }> = [{ v: root, i: 0 }];
    idx.set(root, index);
    low.set(root, index++);
    stack.push(root);
    onStack.add(root);
    while (work.length > 0) {
      const top = work[work.length - 1]!;
      const next = adj.get(top.v) ?? [];
      if (top.i < next.length) {
        const w = next[top.i++]!;
        if (!idx.has(w)) {
          idx.set(w, index);
          low.set(w, index++);
          stack.push(w);
          onStack.add(w);
          work.push({ v: w, i: 0 });
        } else if (onStack.has(w)) low.set(top.v, Math.min(low.get(top.v)!, idx.get(w)!));
      } else {
        work.pop();
        const parent = work[work.length - 1];
        if (parent) low.set(parent.v, Math.min(low.get(parent.v)!, low.get(top.v)!));
        if (low.get(top.v) === idx.get(top.v)) {
          const comp: number[] = [];
          let w: number;
          do {
            w = stack.pop()!;
            onStack.delete(w);
            comp.push(w);
          } while (w !== top.v);
          if (comp.length > 1) out.push(comp.sort((a, b) => a - b));
        }
      }
    }
  }
  return out.sort((a, b) => b.length - a.length || a[0]! - b[0]!);
}

export function buildCapabilityGraph(caps: Capability[], graph: ImportGraph, scan?: ScanInfo): CapabilityGraph {
  const owners = ownersOf(caps);
  const inGraph = new Set(graph.files);
  const edgeMap = new Map<string, CapEdge>();
  for (const c of caps) {
    for (const f of c.kanit) {
      if (!inGraph.has(f) || isTestFile(f) || (owners.get(f)?.length ?? 0) > COMMON_OWNERS) continue;
      for (const g of graph.imports.get(f) ?? []) {
        const gOwners = owners.get(g);
        if (!gOwners || gOwners.length > COMMON_OWNERS || gOwners.includes(c.n)) continue;
        for (const b of gOwners) {
          const key = `${c.n}>${b}`;
          const e = edgeMap.get(key) ?? { from: c.n, to: b, count: 0, via: [] };
          e.count++;
          if (e.via.length < VIA_EXAMPLES) e.via.push([f, g]);
          edgeMap.set(key, e);
        }
      }
    }
  }
  const edges = [...edgeMap.values()].sort((a, b) => a.from - b.from || a.to - b.to);
  const adj = new Map<number, number[]>();
  for (const e of edges) (adj.get(e.from) ?? adj.set(e.from, []).get(e.from)!).push(e.to);
  const touched = new Set<number>();
  for (const e of edges) {
    touched.add(e.from);
    touched.add(e.to);
  }
  const nodes: CapNode[] = caps.map((c) => ({ n: c.n, ad: c.ad, durum: c.durum, files: c.kanit.filter((f) => inGraph.has(f)).length, outsideGraph: c.kanit.filter((f) => !inGraph.has(f)).length }));
  const commonFiles = [...owners].filter(([f, o]) => inGraph.has(f) && o.length > COMMON_OWNERS).map(([file, o]) => ({ file, owners: o })).sort((a, b) => b.owners.length - a.owners.length || cmp(a.file, b.file));
  const outsideGraph = [...owners].filter(([f]) => !inGraph.has(f)).map(([file, o]) => ({ file, owners: o })).sort((a, b) => cmp(a.file, b.file));
  return {
    nodes,
    edges,
    commonFiles,
    outsideGraph,
    cycles: capCycles(caps.map((c) => c.n), adj),
    isolated: caps.filter((c) => !touched.has(c.n)).map((c) => c.n),
    graphIncomplete: incomplete(graph, scan),
  };
}

// ---- yetenek düzeyinde etki (madde 10) --------------------------------------------------------------------------------
export interface CapabilityHit {
  n: number;
  ad: string;
  durum: string;
  // 0 = değişen dosya yeteneğin kendi kanıtı; k > 0 = kanıt dosyalarından biri değişen dosyaya k adım uzaklıkta bağımlı.
  distance: number;
  files: string[];
  moreFiles: number;
}

export interface CapabilityImpact {
  changed: string[];
  unknown: string[];
  depth: number;
  hits: CapabilityHit[];
  tests: string[];
  dependents: number;
  truncated: boolean;
  graphIncomplete: boolean;
  note: string;
}

export function capabilityImpact(caps: Capability[], graph: ImportGraph, changed: string[], depth: number, scan?: ScanInfo): CapabilityImpact {
  if (!Number.isInteger(depth) || depth < 1 || depth > MAX_DEPTH_PARAM) throw new GraphInputError(`depth 1..${MAX_DEPTH_PARAM} arası tam sayı olmalı`);
  if (changed.length === 0 || changed.length > MAX_CHANGED) throw new GraphInputError(`dosya sayısı 1..${MAX_CHANGED} olmalı`);
  for (const f of changed) {
    const bad = validateFileParam(f);
    // src/ dışındaki (betik, SQL, belge) güvenli göreli yollar hata değil 'unknown' olur: tek dosya bütün çağrıyı düşürmez.
    if (bad && !SAFE_OTHER.test(f)) throw new GraphInputError(`${clean(f).slice(0, 60)}: ${bad}`);
  }
  const uniq = [...new Set(changed)].sort(cmp);
  const unknown = uniq.filter((f) => !graph.imports.has(f));
  const known = uniq.filter((f) => graph.imports.has(f));
  const dist = new Map<string, number>();
  const tests = new Set<string>();
  let truncated = false;
  for (const f of known) {
    dist.set(f, 0);
    const rep = analyzeImpact(graph, f, depth);
    if (!rep) continue;
    truncated ||= rep.truncated;
    for (const layer of rep.layers) {
      for (const g of [...layer.files, ...layer.tests]) if (!dist.has(g) || dist.get(g)! > layer.distance) dist.set(g, layer.distance);
    }
    // Çalıştırılacak testler derinlikle KESİLMEZ: bu dosyaya doğrudan ya da dolaylı bağlı tüm testler (sınırsız yarıçap).
    const full = analyzeImpact(graph, f, graph.files.length);
    if (full) {
      truncated ||= full.truncated;
      for (const t of full.affectedTests) tests.add(t.file);
    }
    if (rep.isTest) tests.add(f);
  }
  const owners = ownersOf(caps);
  const byCap = new Map<number, { distance: number; files: Set<string> }>();
  for (const [file, d] of dist) {
    for (const n of owners.get(file) ?? []) {
      const cur = byCap.get(n) ?? { distance: d, files: new Set<string>() };
      if (d < cur.distance) cur.distance = d;
      cur.files.add(file);
      byCap.set(n, cur);
    }
  }
  const byN = new Map(caps.map((c) => [c.n, c]));
  const hits: CapabilityHit[] = [...byCap]
    .map(([n, v]) => ({ n, ad: byN.get(n)!.ad, durum: byN.get(n)!.durum, distance: v.distance, files: [...v.files].sort(cmp).slice(0, 10), moreFiles: Math.max(0, v.files.size - 10) }))
    .sort((a, b) => a.distance - b.distance || a.n - b.n);
  const testList = [...tests].sort(cmp);
  if (testList.length > LIST_CAP) truncated = true;
  return {
    changed: uniq,
    unknown,
    depth,
    hits,
    tests: testList.slice(0, LIST_CAP),
    dependents: dist.size - known.length,
    truncated,
    graphIncomplete: incomplete(graph, scan),
    note: "Etki yalnız src/ içe aktarma grafiğinden ve kanıt listesinden çıkarılır: çalışma zamanı bağımlılığı (dinamik ad, dosya okuma, HTTP) ve kanıt listesinde olmayan dosyalar görünmez; 'unknown' dosyalar (src/ dışı dosyalar dahil) için etki bilinmiyor. Çalıştırılacak testler derinlikten bağımsız, tüm bağımlı testlerdir; etkilenen yetenekler ise seçilen derinliğe kadardır.",
  };
}

// ---- çıktı biçimleri ----------------------------------------------------------------------------------------------------
const mdCell = (s: string): string => clean(s).replace(/[|\\`<>]/g, " ").slice(0, 120);

export function renderMermaid(g: CapabilityGraph): string {
  const lines = ["graph LR"];
  for (const n of g.nodes) if (!g.isolated.includes(n.n)) lines.push(`  c${n.n}["${n.n}: ${clean(n.ad).replace(/["\\]/g, " ").slice(0, 60)}"]`);
  for (const e of g.edges) lines.push(`  c${e.from} -->|${e.count}| c${e.to}`);
  return lines.join("\n") + "\n";
}

export function renderSummary(g: CapabilityGraph): string {
  const lines: string[] = [];
  lines.push(`Yetenek sayısı: ${g.nodes.length}; kenar: ${g.edges.length}; yalnız duran (kenarsız) yetenek: ${g.isolated.length}; döngü: ${g.cycles.length}`);
  lines.push(`Ortak kanıt dosyası (> ${COMMON_OWNERS} sahip, kenar üretmez): ${g.commonFiles.length}; grafik dışı kanıt (belge, SQL, UI betiği ...): ${g.outsideGraph.length}`);
  if (g.graphIncomplete) lines.push("UYARI: içe aktarma grafiği eksik olabilir (süre bütçesi aşıldı ya da çözümlenemeyen/atlanan dosya var).");
  const deg = new Map<number, number>();
  for (const e of g.edges) deg.set(e.to, (deg.get(e.to) ?? 0) + 1);
  const top = [...deg].sort((a, b) => b[1] - a[1] || a[0] - b[0]).slice(0, 10);
  lines.push("", "En çok bağımlısı olan yetenekler (kaç yetenek buna bağlı):");
  for (const [n, d] of top) lines.push(`- ${n} ${mdCell(g.nodes.find((x) => x.n === n)!.ad)}: ${d}`);
  if (g.cycles.length > 0) {
    lines.push("", "Karşılıklı bağlı yetenek kümeleri:");
    for (const c of g.cycles.slice(0, 10)) lines.push(`- ${c.length} yetenek: ${c.slice(0, 15).join(", ")}${c.length > 15 ? ` ... (+${c.length - 15})` : ""}`);
  }
  return lines.join("\n") + "\n";
}

export function renderImpact(r: CapabilityImpact): string {
  const lines: string[] = [];
  lines.push(`Değişen dosya: ${r.changed.length} (derinlik ${r.depth}); grafikte bulunmayan: ${r.unknown.length}; bağımlı dosya: ${r.dependents}; çalıştırılacak test: ${r.tests.length}`);
  if (r.unknown.length > 0) lines.push(`Grafikte yok (etkisi bilinmiyor): ${r.unknown.map(mdCell).join(", ")}`);
  if (r.truncated) lines.push("UYARI: liste sınırı aşıldı, sonuç kesildi.");
  if (r.graphIncomplete) lines.push("UYARI: içe aktarma grafiği eksik olabilir.");
  lines.push("", "Etkilenen yetenekler (0 = kendi kanıtı, k = k adım uzaklıkta bağımlı):");
  for (const h of r.hits) lines.push(`- ${h.n} ${mdCell(h.ad)} [${mdCell(h.durum)}] mesafe ${h.distance}: ${h.files.map(mdCell).join(", ")}${h.moreFiles > 0 ? ` (+${h.moreFiles} dosya)` : ""}`);
  if (r.hits.length === 0) lines.push("- (hiçbiri)");
  lines.push("", "Çalıştırılacak testler:");
  for (const t of r.tests) lines.push(`- ${mdCell(t)}`);
  if (r.tests.length === 0) lines.push("- (hiçbiri bulunamadı)");
  lines.push("", r.note);
  return lines.join("\n") + "\n";
}
