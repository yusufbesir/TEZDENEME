ALTER TABLE tasks ADD COLUMN approved_by TEXT;

CREATE TABLE task_evidence (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id),
  attempt_id TEXT,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_evidence_task ON task_evidence(task_id);
