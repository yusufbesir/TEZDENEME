-- Operational memory (Faz 5b). Records are append-only: content columns can never change (trigger below); a correction is a NEW record that supersedes the old one.
CREATE TABLE memory_records (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('fact', 'decision', 'incident', 'note', 'result')),
  subject TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  source TEXT NOT NULL,
  source_ref TEXT,
  scope TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  observed_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  valid_until TEXT,
  supersedes_id TEXT REFERENCES memory_records(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'retired')),
  content_hash TEXT NOT NULL,
  redacted INTEGER NOT NULL DEFAULT 0,
  exported_path TEXT
);
CREATE INDEX idx_memory_scope_subject ON memory_records(scope, subject);
CREATE INDEX idx_memory_status ON memory_records(status);

-- Flags are advisory markers a person resolves; nothing is resolved or deleted automatically.
CREATE TABLE memory_flags (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL REFERENCES memory_records(id),
  other_id TEXT REFERENCES memory_records(id),
  flag TEXT NOT NULL CHECK (flag IN ('contradiction')),
  detail TEXT NOT NULL,
  created_at TEXT NOT NULL,
  resolved_at TEXT,
  resolved_by TEXT
);
CREATE INDEX idx_memory_flags_record ON memory_flags(record_id);

-- Standalone FTS5 index over Turkish-folded text (the application folds ı/İ etc. before indexing and before querying).
CREATE VIRTUAL TABLE memory_fts USING fts5(record_id UNINDEXED, title, body, tokenize = 'unicode61 remove_diacritics 2');

CREATE TRIGGER memory_records_immutable BEFORE UPDATE OF id, kind, subject, title, body, source, source_ref, scope, confidence, observed_at, created_at, valid_until, supersedes_id, content_hash, redacted ON memory_records
BEGIN
  SELECT RAISE(ABORT, 'memory records are append-only: content cannot change, add a superseding record');
END;
CREATE TRIGGER memory_records_status_forward BEFORE UPDATE OF status ON memory_records
WHEN NOT (OLD.status = NEW.status OR (OLD.status = 'active' AND NEW.status IN ('superseded', 'retired')) OR (OLD.status = 'superseded' AND NEW.status = 'retired'))
BEGIN
  SELECT RAISE(ABORT, 'memory status only moves forward: active -> superseded/retired');
END;
-- INSERT OR REPLACE would silently rewrite a row without firing the delete trigger.
CREATE TRIGGER memory_records_no_replace BEFORE INSERT ON memory_records
WHEN EXISTS (SELECT 1 FROM memory_records WHERE id = NEW.id)
BEGIN
  SELECT RAISE(ABORT, 'memory records are append-only: an existing id cannot be replaced');
END;
CREATE TRIGGER memory_records_no_delete BEFORE DELETE ON memory_records
BEGIN
  SELECT RAISE(ABORT, 'memory records are never deleted: retire them instead');
END;
