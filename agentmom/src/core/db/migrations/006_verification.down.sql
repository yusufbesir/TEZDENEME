DROP TABLE verification_runs;
ALTER TABLE workflows DROP COLUMN repair_feedback_json;
ALTER TABLE workflows DROP COLUMN repair_round;
ALTER TABLE task_contracts DROP COLUMN verification_json;
