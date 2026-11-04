// D8b analitik testleri için sahte sağlayıcı anlık görüntüleri ve bellek içi veritabanı kurucusu. Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
// Yalnız testlerde kullanılır; model, ağ ve gerçek sağlayıcı yok.
import { AuditLog, SqliteAuditSink } from "../core/audit/audit.ts";
import { openDb } from "../core/db/db.ts";
import type { Db } from "../core/db/db.ts";
import { migrate } from "../core/db/migrate.ts";
import type { ProviderSnapshot } from "../analysis/snapshot.ts";

export function snap(id: string, caps: Record<string, string>, over: Partial<Omit<ProviderSnapshot, "capabilities">> = {}): ProviderSnapshot {
  return {
    id,
    displayName: `Sağlayıcı ${id}`,
    routeKind: "subscription",
    hasAdapter: true,
    disabled: false,
    allowedByPolicy: true,
    capabilities: Object.entries(caps).map(([operation, status]) => ({ operation, status })),
    lastSuccessAt: null,
    lastFailureAt: null,
    ...over,
  };
}

// Her çağrıda ts 1 sn ilerleyen denetim kaydı + bellek içi veritabanı.
export function memoryAudit(startIso = "2026-10-20T10:00:00.000Z"): { db: Db; audit: AuditLog; at: (offsetSec: number) => string; setClock: (iso: string) => void } {
  const db = openDb(":memory:");
  migrate(db);
  let t = Date.parse(startIso);
  const audit = new AuditLog([new SqliteAuditSink(db)], () => new Date(t));
  return { db, audit, at: (s) => new Date(Date.parse(startIso) + s * 1000).toISOString(), setClock: (iso) => void (t = Date.parse(iso)) };
}
