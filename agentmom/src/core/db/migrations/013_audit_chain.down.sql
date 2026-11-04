-- Down for 013 removes the audit hash chain and the append-only triggers (explicit rollback only; yazan: Claude [İP:AgentMom D5a]). Rows are kept.
DROP TRIGGER IF EXISTS audit_events_no_delete;
DROP TRIGGER IF EXISTS audit_events_no_update;
DROP INDEX IF EXISTS idx_audit_hash;
ALTER TABLE audit_events DROP COLUMN hash;
ALTER TABLE audit_events DROP COLUMN prev_hash;