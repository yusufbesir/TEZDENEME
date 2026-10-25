ALTER TABLE task_contracts ADD COLUMN verification_json TEXT;
ALTER TABLE workflows ADD COLUMN repair_round INTEGER NOT NULL DEFAULT 0;
ALTER TABLE workflows ADD COLUMN repair_feedback_json TEXT;

CREATE TABLE verification_runs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  workflow_id TEXT REFERENCES workflows(id),
  round INTEGER NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  result_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
