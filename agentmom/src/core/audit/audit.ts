// Denetim kaydı: kanallar (SQLite/JSONL/bellek) ve D5a'da eklenen özet zinciri. Sahip: Yusuf. Zincir bölümünü yazan: Claude [İP:AgentMom D5a]; yalnız yazan yapay zeka değiştirir.
import { createHash, randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Db } from "../db/db.ts";
import { redact, redactString } from "./redact.ts";

export interface AuditInput {
  initiator: { kind: string; id: string };
  action: string;
  decision: string;
  result: string;
  details?: unknown;
}

export interface AuditEvent {
  id: string;
  ts: string;
  initiator: { kind: string; id: string };
  action: string;
  decision: string;
  result: string;
  details: unknown;
}

export interface AuditSink {
  write(event: AuditEvent): void;
}

// Hesap verebilirlik zinciri (madde 95, D5a; bu bölümü yazan: Claude [İP:AgentMom D5a]). İlk zincirli satırın prev_hash'i GENESIS'tir.
export const AUDIT_GENESIS = "0".repeat(64);

// Kanonik JSON: nesne anahtarları her düzeyde sıralanır, diziler sırasını korur. Aynı veri her zaman aynı metni verir.
export function canonicalJson(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v ?? null);
  if (Array.isArray(v)) return `[${v.map((x) => canonicalJson(x === undefined ? null : x)).join(",")}]`;
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o).filter((k) => o[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(",")}}`;
}

export interface ChainFields {
  id: string;
  ts: string;
  initiator: { kind: string; id: string };
  action: string;
  decision: string;
  result: string;
  details: unknown;
}

export function chainHash(prevHash: string, f: ChainFields): string {
  const body = canonicalJson({ id: f.id, ts: f.ts, initiator: { kind: f.initiator.kind, id: f.initiator.id }, action: f.action, decision: f.decision, result: f.result, details: f.details ?? null });
  return createHash("sha256").update(prevHash).update(body).digest("hex");
}

export class SqliteAuditSink implements AuditSink {
  private readonly db: Db;
  private hasChain = false;

  constructor(db: Db) {
    this.db = db;
  }

  // Migrasyon 013 öncesi bir veritabanında zincir sütunları yoktur: o zaman eski biçimde yazılır (zincirsiz).
  private chained(): boolean {
    if (this.hasChain) return true;
    const cols = this.db.prepare("PRAGMA table_info(audit_events)").all() as unknown as Array<{ name: string }>;
    this.hasChain = cols.some((c) => c.name === "hash") && cols.some((c) => c.name === "prev_hash");
    return this.hasChain;
  }

  write(e: AuditEvent): void {
    const detailsJson = JSON.stringify(e.details ?? null);
    if (!this.chained()) {
      this.db
        .prepare("INSERT INTO audit_events (id, ts, initiator_kind, initiator_id, action, decision, result, details_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
        .run(e.id, e.ts, e.initiator.kind, e.initiator.id, e.action, e.decision, e.result, detailsJson);
      return;
    }
    // Son özeti okuma ve yeni satırı yazma tek işlemde: iki yazıcı aynı prev_hash'e bağlanamaz. Dış bir işlem açıksa onun içinde kayıt noktası kullanılır.
    const own = !this.db.isTransaction;
    this.db.exec(own ? "BEGIN IMMEDIATE" : "SAVEPOINT audit_chain");
    try {
      const last = this.db.prepare("SELECT hash FROM audit_events WHERE hash IS NOT NULL ORDER BY rowid DESC LIMIT 1").get() as { hash: string } | undefined;
      const prev = last?.hash ?? AUDIT_GENESIS;
      const hash = chainHash(prev, { id: e.id, ts: e.ts, initiator: e.initiator, action: e.action, decision: e.decision, result: e.result, details: JSON.parse(detailsJson) });
      this.db
        .prepare("INSERT INTO audit_events (id, ts, initiator_kind, initiator_id, action, decision, result, details_json, prev_hash, hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(e.id, e.ts, e.initiator.kind, e.initiator.id, e.action, e.decision, e.result, detailsJson, prev, hash);
      this.db.exec(own ? "COMMIT" : "RELEASE audit_chain");
    } catch (err) {
      if (own) this.db.exec("ROLLBACK");
      else this.db.exec("ROLLBACK TO audit_chain; RELEASE audit_chain");
      throw err;
    }
  }
}

export interface ChainRow {
  id: string;
  ts: string;
  initiator_kind: string;
  initiator_id: string;
  action: string;
  decision: string;
  result: string;
  details_json: string;
  prev_hash: string | null;
  hash: string | null;
}

export interface ChainReport {
  ok: boolean;
  total: number;
  chained: number;
  // Zincir başladıktan SONRA özetsiz eklenmiş satırlar (uygulama dışı bir yoldan eklenmiş olabilir): bu durum ok=false sayılır ve ilk böyle satır firstBreak olur.
  unchainedAfterStart: number;
  firstBreak: null | { id: string; ts: string };
  checkedAt: string;
}

// Saf doğrulayıcı: satırlar ekleme sırasıyla verilir. Özetsiz satırlar zincire girmez; her zincirli satır bir öncekine bağlı olmalı ve kendi özeti yeniden hesaplanınca tutmalıdır.
export function verifyChainRows(rows: Iterable<ChainRow>, checkedAt: string): ChainReport {
  let total = 0;
  let chained = 0;
  let unchainedAfterStart = 0;
  let lastHash: string | null = null;
  let firstBreak: ChainReport["firstBreak"] = null;
  for (const r of rows) {
    total++;
    if (r.hash === null || r.hash === undefined) {
      if (lastHash !== null) {
        unchainedAfterStart++;
        if (!firstBreak) firstBreak = { id: r.id, ts: r.ts };
      }
      continue;
    }
    chained++;
    if (firstBreak) {
      lastHash = r.hash;
      continue;
    }
    let details: unknown;
    let parsed = true;
    try {
      details = JSON.parse(r.details_json);
    } catch {
      parsed = false;
    }
    const expectedPrev = lastHash ?? AUDIT_GENESIS;
    const recomputed = parsed ? chainHash(r.prev_hash ?? "", { id: r.id, ts: r.ts, initiator: { kind: r.initiator_kind, id: r.initiator_id }, action: r.action, decision: r.decision, result: r.result, details }) : null;
    if (r.prev_hash !== expectedPrev || recomputed !== r.hash) firstBreak = { id: r.id, ts: r.ts };
    lastHash = r.hash;
  }
  return { ok: firstBreak === null, total, chained, unchainedAfterStart, firstBreak, checkedAt };
}

export function verifyAuditChain(db: Db, now: () => Date = () => new Date()): ChainReport {
  const cols = db.prepare("PRAGMA table_info(audit_events)").all() as unknown as Array<{ name: string }>;
  const checkedAt = now().toISOString();
  if (!cols.some((c) => c.name === "hash")) {
    const n = (db.prepare("SELECT count(*) AS n FROM audit_events").get() as { n: number }).n;
    return { ok: true, total: Number(n), chained: 0, unchainedAfterStart: 0, firstBreak: null, checkedAt };
  }
  const it = db.prepare("SELECT id, ts, initiator_kind, initiator_id, action, decision, result, details_json, prev_hash, hash FROM audit_events ORDER BY rowid").iterate() as unknown as Iterable<ChainRow>;
  return verifyChainRows(it, checkedAt);
}

export class JsonlAuditSink implements AuditSink {
  private readonly path: string;

  constructor(path: string) {
    this.path = path;
    mkdirSync(dirname(path), { recursive: true });
  }

  write(e: AuditEvent): void {
    appendFileSync(this.path, JSON.stringify(e) + "\n", "utf8");
  }
}

export class MemoryAuditSink implements AuditSink {
  readonly events: AuditEvent[] = [];

  write(e: AuditEvent): void {
    this.events.push(e);
  }
}

// A sink failure propagates: an action must not proceed without its audit record.
export class AuditLog {
  private readonly sinks: AuditSink[];
  private readonly now: () => Date;

  constructor(sinks: AuditSink[], now: () => Date = () => new Date()) {
    this.sinks = sinks;
    this.now = now;
  }

  record(input: AuditInput): AuditEvent {
    const event: AuditEvent = {
      id: randomUUID(),
      ts: this.now().toISOString(),
      initiator: { kind: redactString(input.initiator.kind), id: redactString(input.initiator.id) },
      action: redactString(input.action),
      decision: redactString(input.decision),
      result: redactString(input.result),
      details: redact(input.details ?? null),
    };
    for (const sink of this.sinks) sink.write(event);
    return event;
  }
}

export function listAudit(db: Db, limit = 100): AuditEvent[] {
  const rows = db
    .prepare("SELECT id, ts, initiator_kind, initiator_id, action, decision, result, details_json FROM audit_events ORDER BY ts DESC, rowid DESC LIMIT ?")
    .all(Math.max(1, Math.min(limit, 1000))) as unknown as Array<Record<string, string>>;
  return rows.map((r) => ({
    id: r.id as string,
    ts: r.ts as string,
    initiator: { kind: r.initiator_kind as string, id: r.initiator_id as string },
    action: r.action as string,
    decision: r.decision as string,
    result: r.result as string,
    details: JSON.parse(r.details_json as string),
  }));
}
