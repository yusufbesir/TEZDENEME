DROP INDEX idx_evidence_task;
DROP TABLE task_evidence;
ALTER TABLE tasks DROP COLUMN approved_by;
