-- Sub-sessions (Faz 11, dilim 2; yazan: Claude [İP:AgentMom Faz 11], sahip: Yusuf; yalnız sahibi değiştirir). The name is user data, the model is system data
-- (fixed at creation from a run record), nothing is ever deleted: archiving is a flag. Records only; no model, no network.
CREATE TABLE subsessions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 60),
  role_hint TEXT,
  provider TEXT NOT NULL,
  model TEXT,
  model_source TEXT NOT NULL DEFAULT 'unknown' CHECK (model_source IN ('run', 'declared', 'unknown')),
  state TEXT NOT NULL DEFAULT 'idle' CHECK (state IN ('idle', 'running', 'awaiting_approval', 'done', 'failed', 'unavailable')),
  pinned INTEGER NOT NULL DEFAULT 0 CHECK (pinned IN (0, 1)),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1)),
  unread INTEGER NOT NULL DEFAULT 0 CHECK (unread IN (0, 1)),
  task_id TEXT REFERENCES tasks(id),
  steps_done INTEGER,
  steps_total INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  rename_count INTEGER NOT NULL DEFAULT 0 CHECK (rename_count >= 0)
);
CREATE INDEX idx_subsessions_updated ON subsessions(updated_at);

CREATE TABLE subsession_name_history (
  id TEXT PRIMARY KEY,
  subsession_id TEXT NOT NULL REFERENCES subsessions(id),
  old_name TEXT NOT NULL,
  new_name TEXT NOT NULL,
  changed_by TEXT NOT NULL CHECK (changed_by = 'user'),
  at TEXT NOT NULL
);
CREATE INDEX idx_subsession_names ON subsession_name_history(subsession_id);

-- The model, its source, the provider and the creation time are system data: a rename (or anything else) cannot change them.
CREATE TRIGGER subsessions_system_fields_immutable BEFORE UPDATE OF id, provider, model, model_source, created_at ON subsessions
BEGIN SELECT RAISE(ABORT, 'subsession model/provider are system data and fixed at creation'); END;
CREATE TRIGGER subsessions_no_delete BEFORE DELETE ON subsessions BEGIN SELECT RAISE(ABORT, 'subsessions are never deleted: archive instead'); END;
CREATE TRIGGER subsession_names_append_only BEFORE UPDATE ON subsession_name_history BEGIN SELECT RAISE(ABORT, 'name history is append-only'); END;
CREATE TRIGGER subsession_names_no_delete BEFORE DELETE ON subsession_name_history BEGIN SELECT RAISE(ABORT, 'name history is append-only'); END;
