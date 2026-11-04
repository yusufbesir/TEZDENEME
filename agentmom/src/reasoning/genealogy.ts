// Karar soy ağacı (madde 89). Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Karar defterindeki `supersedes_id` zincirinden bir kararın kökünü, halefini ve güncel halini çıkarır. SALT OKUNUR: hiçbir şey yazmaz,
// model/ağ/dosya kullanmaz. Bir karar en çok bir kararın yerine geçer ve en çok bir kez yerine geçilir (tekil), bu yüzden ağaç aslında zincirdir.
// Sınır: decisions.supersedes_id üzerinde indeks yok (eklemek migrasyon gerektirir; küçük veride sorun değil).
// Döngü koruması: ziyaret kümesi; derinlik sınırı 50; orman en çok 100 kök.
import type { Db } from "../core/db/db.ts";
import { ReasoningError } from "./reasoning.ts";
import type { DecisionLedger, ReviewState } from "./reasoning.ts";

export const MAX_DEPTH = 50;
export const MAX_ROOTS = 100;

export type GenealogyState = "active" | "superseded" | "expired";

export interface GenealogyNode {
  id: string;
  title: string;
  decidedAt: string;
  expiresAt: string;
  // active: geçerli; superseded: yerine yenisi geçti; expired: süresi doldu (ya da kullanıcı emekli etti ve halefi yok).
  state: GenealogyState;
  // Defterdeki ham durum (active / superseded / retired).
  status: "active" | "superseded" | "retired";
  supersedes: string | null;
  supersededBy: string | null;
  assumptions: Array<{ text: string; status: string }>;
  reviewState: ReviewState;
}

export interface Genealogy {
  root: string;
  // Kimlikler, en eskiden en yeniye.
  chain: string[];
  // Zincirin en yeni kararı GEÇERLİYSE onun kimliği; geçerli karar yoksa (süresi dolmuş / emekli) null.
  current: string | null;
  nodes: GenealogyNode[];
  depth: number;
  // Derinlik sınırına çarpıldıysa ya da döngü görüldüyse true (zincir eksik olabilir).
  truncated: boolean;
}

export interface GenealogySource {
  db: Db;
  ledger: DecisionLedger;
  now?: () => Date;
}

interface Edge {
  id: string;
  supersedes_id: string | null;
}

function edgeOf(db: Db, id: string): Edge | undefined {
  return db.prepare("SELECT id, supersedes_id FROM decisions WHERE id = ?").get(id) as unknown as Edge | undefined;
}

// Bir karar birden çok kararın yerine geçemez; yine de bozuk veride en eski halef alınır (kararlı).
function successorOf(db: Db, id: string): string | null {
  const r = db.prepare("SELECT id FROM decisions WHERE supersedes_id = ? ORDER BY decided_at, rowid LIMIT 1").get(id) as unknown as { id: string } | undefined;
  return r?.id ?? null;
}

export function genealogyOf(src: GenealogySource, decisionId: string): Genealogy {
  const now = (src.now ?? (() => new Date()))().getTime();
  if (typeof decisionId !== "string" || !edgeOf(src.db, decisionId)) throw new ReasoningError("not_found", "karar bulunamadı");
  const seen = new Set<string>([decisionId]);
  let truncated = false;
  const back: string[] = [];
  for (let cur = edgeOf(src.db, decisionId)?.supersedes_id ?? null; cur !== null; ) {
    if (seen.has(cur) || seen.size >= MAX_DEPTH) {
      truncated = true;
      break;
    }
    if (!edgeOf(src.db, cur)) break;
    seen.add(cur);
    back.push(cur);
    cur = edgeOf(src.db, cur)?.supersedes_id ?? null;
  }
  const forward: string[] = [];
  for (let cur = successorOf(src.db, decisionId); cur !== null; ) {
    if (seen.has(cur) || seen.size >= MAX_DEPTH) {
      truncated = true;
      break;
    }
    seen.add(cur);
    forward.push(cur);
    cur = successorOf(src.db, cur);
  }
  const chain = [...back.reverse(), decisionId, ...forward];
  const nodes: GenealogyNode[] = chain.map((id, i) => {
    const d = src.ledger.get(id);
    const next = chain[i + 1] ?? null;
    const state: GenealogyState = d.status === "superseded" ? "superseded" : d.status === "retired" ? (next !== null ? "superseded" : "expired") : Date.parse(d.expiresAt) < now ? "expired" : "active";
    return { id, title: d.title, decidedAt: d.decidedAt, expiresAt: d.expiresAt, state, status: d.status, supersedes: d.supersedesId, supersededBy: next, assumptions: d.assumptions.map((a) => ({ text: a.text, status: a.status })), reviewState: d.reviewState };
  });
  const head = nodes[nodes.length - 1] as GenealogyNode;
  return { root: chain[0] as string, chain, current: head.state === "active" ? head.id : null, nodes, depth: chain.length, truncated };
}

export interface ForestEntry {
  root: string;
  chain: string[];
  depth: number;
  current: string | null;
  headId: string;
  headTitle: string;
  headState: GenealogyState;
  headReviewState: ReviewState;
  truncated: boolean;
}

export interface GenealogyForest {
  totalRoots: number;
  // Kök sayısı 100'ü aştıysa yalnız en yeni 100 kök döner.
  truncated: boolean;
  trees: ForestEntry[];
}

// Kök = hiçbir kararın yerine geçmeyen karar. En yeni kök önce.
export function genealogyForest(src: GenealogySource): GenealogyForest {
  const total = (src.db.prepare("SELECT COUNT(*) AS n FROM decisions WHERE supersedes_id IS NULL").get() as unknown as { n: number }).n;
  const roots = src.db.prepare(`SELECT id FROM decisions WHERE supersedes_id IS NULL ORDER BY decided_at DESC, rowid DESC LIMIT ${MAX_ROOTS}`).all() as unknown as Array<{ id: string }>;
  const trees = roots.map((r) => {
    const g = genealogyOf(src, r.id);
    const head = g.nodes[g.nodes.length - 1] as GenealogyNode;
    return { root: g.root, chain: g.chain, depth: g.depth, current: g.current, headId: head.id, headTitle: head.title, headState: head.state, headReviewState: head.reviewState, truncated: g.truncated };
  });
  return { totalRoots: Number(total), truncated: Number(total) > trees.length, trees };
}
