-- Provider on/off state (Faz 11, D3; yazan: Claude [İP:AgentMom Faz 11 D3], sahip: Yusuf; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar).
-- Only the user turns a provider off or on (server checks the token); a disabled provider is never used and nothing switches to another provider
-- in its place (fail-closed). Rows are never deleted: turning a provider back on is an update of the same row.
CREATE TABLE provider_state (
  provider_id TEXT PRIMARY KEY REFERENCES providers(id),
  disabled INTEGER NOT NULL DEFAULT 0 CHECK (disabled IN (0, 1)),
  changed_at TEXT,
  changed_by TEXT
);
CREATE TRIGGER provider_state_no_delete BEFORE DELETE ON provider_state BEGIN SELECT RAISE(ABORT, 'provider state is never deleted: enable or disable instead'); END;
