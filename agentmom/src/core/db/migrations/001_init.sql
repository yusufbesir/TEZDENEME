CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  state TEXT NOT NULL CHECK (state IN ('pending','awaiting_approval','approved','running','succeeded','failed','cancelled','denied')),
  requested_action TEXT NOT NULL,
  request_json TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('allow','deny','require_approval')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE task_attempts (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  attempt_no INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('running','succeeded','failed')),
  started_at TEXT NOT NULL,
  ended_at TEXT,
  exit_code INTEGER,
  error TEXT,
  UNIQUE (task_id, attempt_no)
);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  ts TEXT NOT NULL,
  initiator_kind TEXT NOT NULL,
  initiator_id TEXT NOT NULL,
  action TEXT NOT NULL,
  decision TEXT NOT NULL,
  result TEXT NOT NULL,
  details_json TEXT NOT NULL
);
