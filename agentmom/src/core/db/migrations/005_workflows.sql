CREATE TABLE task_contracts (
  task_id TEXT PRIMARY KEY REFERENCES tasks(id),
  goal TEXT NOT NULL,
  acceptance_json TEXT NOT NULL,
  write_scopes_json TEXT NOT NULL,
  constraints_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE workflows (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  repo_path TEXT NOT NULL,
  definition_json TEXT NOT NULL,
  worktree_path TEXT,
  attempt_id TEXT,
  state TEXT NOT NULL CHECK (state IN ('pending','running','succeeded','failed')),
  error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE workflow_steps (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows(id),
  idx INTEGER NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('plan','implement','review','verify')),
  state TEXT NOT NULL CHECK (state IN ('pending','running','succeeded','failed','interrupted')),
  attempts INTEGER NOT NULL DEFAULT 0,
  provider_idx INTEGER NOT NULL DEFAULT 0,
  provider_attempts INTEGER NOT NULL DEFAULT 0,
  provider_id TEXT,
  output_json TEXT,
  error TEXT,
  started_at TEXT,
  ended_at TEXT,
  UNIQUE (workflow_id, idx)
);

CREATE TABLE workflow_handoffs (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows(id),
  from_idx INTEGER,
  to_idx INTEGER NOT NULL,
  contract_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE scope_claims (
  id TEXT PRIMARY KEY,
  workflow_id TEXT NOT NULL REFERENCES workflows(id),
  repo_path TEXT NOT NULL,
  scopes_json TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('active','released')),
  created_at TEXT NOT NULL,
  released_at TEXT
);
CREATE INDEX idx_scope_claims_state ON scope_claims(state);
