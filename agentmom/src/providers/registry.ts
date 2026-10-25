import type { Db } from "../core/db/db.ts";
import { CapabilityError, assertSupported } from "./contract.ts";
import type { CapabilityDeclaration, Operation, ProviderAdapter } from "./contract.ts";

export interface StoredProvider {
  id: string;
  displayName: string;
  contractVersion: string;
  routeKind: string;
  capabilities: CapabilityDeclaration[];
  // Turned off by the user (provider_state). A disabled provider is still listed but never resolved for use.
  disabled: boolean;
}

// Keeps adapters in memory and mirrors their declared capabilities into SQLite (providers, capabilities).
// Disabled providers (Faz 11 D3, provider_state; yazan: Claude [İP:AgentMom Faz 11 D3]) are FAIL-CLOSED: get() returns undefined and require()/forOperation()
// throw, so every execution path ends as "provider not available/refused"; nothing ever switches to another provider in their place.
export class ProviderRegistry {
  private readonly db: Db;
  private readonly adapters = new Map<string, ProviderAdapter>();
  private readonly now: () => Date;
  private readonly disabledIds = new Set<string>();

  constructor(db: Db, now: () => Date = () => new Date()) {
    this.db = db;
    this.now = now;
    const rows = db.prepare("SELECT provider_id FROM provider_state WHERE disabled = 1").all() as unknown as Array<{ provider_id: string }>;
    for (const r of rows) this.disabledIds.add(r.provider_id);
  }

  isDisabled(id: string): boolean {
    return this.disabledIds.has(id);
  }

  // Written to the database first, then to memory: if the write fails, the in-memory state does not change.
  setDisabled(id: string, disabled: boolean, changedBy: string): { changed: boolean } {
    const known = this.db.prepare("SELECT 1 AS x FROM providers WHERE id = ?").get(id);
    if (!known && !this.adapters.has(id)) throw new Error(`provider ${id} is not registered`);
    const changed = this.disabledIds.has(id) !== disabled;
    this.db
      .prepare(
        `INSERT INTO provider_state (provider_id, disabled, changed_at, changed_by) VALUES (?, ?, ?, ?)
         ON CONFLICT(provider_id) DO UPDATE SET disabled = excluded.disabled, changed_at = excluded.changed_at, changed_by = excluded.changed_by`,
      )
      .run(id, disabled ? 1 : 0, this.now().toISOString(), changedBy);
    if (disabled) this.disabledIds.add(id);
    else this.disabledIds.delete(id);
    return { changed };
  }

  stateOf(id: string): { disabled: boolean; changedAt: string | null; changedBy: string | null } {
    const r = this.db.prepare("SELECT disabled, changed_at, changed_by FROM provider_state WHERE provider_id = ?").get(id) as { disabled: number; changed_at: string | null; changed_by: string | null } | undefined;
    return { disabled: this.disabledIds.has(id), changedAt: r?.changed_at ?? null, changedBy: r?.changed_by ?? null };
  }

  // The adapter even when disabled: only for read-only metadata (display name, route kind), never for running anything.
  registeredAdapter(id: string): ProviderAdapter | undefined {
    return this.adapters.get(id);
  }

  // Stores the outcome of a LOCAL connection test: the adapter's own declarations are synced first, then the testConnection row gets the status the
  // caller derived from the report (never stronger than what was actually observed).
  recordConnectionTest(id: string, status: CapabilityDeclaration["status"], evidence: string, checkedAt: string): void {
    if (this.adapters.has(id)) this.refresh(id);
    this.db
      .prepare(
        `INSERT INTO capabilities (provider_id, operation, status, evidence_source, checked_at) VALUES (?, 'testConnection', ?, ?, ?)
         ON CONFLICT(provider_id, operation) DO UPDATE SET status = excluded.status, evidence_source = excluded.evidence_source, checked_at = excluded.checked_at`,
      )
      .run(id, status, evidence, checkedAt);
  }

  register(adapter: ProviderAdapter): void {
    if (this.adapters.has(adapter.id)) throw new Error(`provider ${adapter.id} is already registered`);
    this.adapters.set(adapter.id, adapter);
    const ts = this.now().toISOString();
    this.db
      .prepare(
        `INSERT INTO providers (id, display_name, contract_version, route_kind, registered_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET display_name = excluded.display_name, contract_version = excluded.contract_version,
         route_kind = excluded.route_kind, updated_at = excluded.updated_at`,
      )
      .run(adapter.id, adapter.displayName, adapter.contractVersion, adapter.routeKind, ts, ts);
    this.refresh(adapter.id);
  }

  refresh(id: string): void {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new Error(`provider ${id} is not registered`);
    const upsert = this.db.prepare(
      `INSERT INTO capabilities (provider_id, operation, status, evidence_source, checked_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(provider_id, operation) DO UPDATE SET status = excluded.status, evidence_source = excluded.evidence_source, checked_at = excluded.checked_at`,
    );
    this.db.exec("BEGIN IMMEDIATE");
    try {
      for (const c of adapter.describeCapabilities()) upsert.run(id, c.operation, c.status, c.evidenceSource, c.checkedAt);
      this.db.exec("COMMIT");
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  get(id: string): ProviderAdapter | undefined {
    if (this.disabledIds.has(id)) return undefined;
    return this.adapters.get(id);
  }

  require(id: string): ProviderAdapter {
    if (this.disabledIds.has(id)) throw new Error(`provider ${id} is disabled by the user`);
    const adapter = this.adapters.get(id);
    if (!adapter) throw new Error(`provider ${id} is not registered`);
    return adapter;
  }

  // Resolves an adapter only for an operation it actually supports.
  forOperation(id: string, operation: Operation): ProviderAdapter {
    const adapter = this.require(id);
    assertSupported(adapter, operation);
    return adapter;
  }

  list(): StoredProvider[] {
    const providers = this.db.prepare("SELECT id, display_name, contract_version, route_kind FROM providers ORDER BY id").all() as unknown as Array<Record<string, string>>;
    const caps = this.db.prepare("SELECT operation, status, evidence_source, checked_at FROM capabilities WHERE provider_id = ? ORDER BY operation");
    return providers.map((p) => ({
      id: p.id as string,
      displayName: p.display_name as string,
      contractVersion: p.contract_version as string,
      routeKind: p.route_kind as string,
      disabled: this.disabledIds.has(p.id as string),
      capabilities: (caps.all(p.id as string) as unknown as Array<Record<string, string>>).map((c) => ({
        operation: c.operation as Operation,
        status: c.status as CapabilityDeclaration["status"],
        evidenceSource: c.evidence_source as string,
        checkedAt: c.checked_at as string,
      })),
    }));
  }
}

export { CapabilityError };
