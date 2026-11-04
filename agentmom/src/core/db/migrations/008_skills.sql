-- Skill lifecycle (Faz 5c): records and policy gates only. Nothing here fetches, installs or runs a third-party skill.
CREATE TABLE skill_candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  origin TEXT NOT NULL,
  description TEXT NOT NULL,
  risk_class TEXT NOT NULL CHECK (risk_class IN ('contained', 'privileged', 'remote')),
  artifact_sha256 TEXT NOT NULL CHECK (length(artifact_sha256) = 64),
  state TEXT NOT NULL CHECK (state IN ('candidate', 'researching', 'security_review', 'isolated_test', 'awaiting_approval', 'released', 'rejected', 'revoked')),
  proposed_by TEXT NOT NULL,
  current_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (name, artifact_sha256)
);

-- One row per gate result. Rows are never edited or deleted; a failed gate is answered by a new record, not by rewriting history.
CREATE TABLE skill_gate_records (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skill_candidates(id),
  gate TEXT NOT NULL CHECK (gate IN ('research', 'security_review', 'isolated_test')),
  verdict TEXT NOT NULL CHECK (verdict IN ('pass', 'fail', 'info')),
  reviewer TEXT NOT NULL,
  artifact_sha256 TEXT NOT NULL CHECK (length(artifact_sha256) = 64),
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_skill_gate_skill ON skill_gate_records(skill_id, gate);

CREATE TABLE skill_versions (
  skill_id TEXT NOT NULL REFERENCES skill_candidates(id),
  version INTEGER NOT NULL,
  artifact_sha256 TEXT NOT NULL,
  released_by TEXT NOT NULL,
  released_at TEXT NOT NULL,
  revoked_at TEXT,
  PRIMARY KEY (skill_id, version)
);

CREATE TABLE skill_events (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL REFERENCES skill_candidates(id),
  from_state TEXT,
  to_state TEXT NOT NULL,
  actor_kind TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_skill_events_skill ON skill_events(skill_id);

CREATE TRIGGER skill_gate_records_immutable BEFORE UPDATE ON skill_gate_records
BEGIN
  SELECT RAISE(ABORT, 'skill gate records are append-only');
END;
CREATE TRIGGER skill_gate_records_no_delete BEFORE DELETE ON skill_gate_records
BEGIN
  SELECT RAISE(ABORT, 'skill gate records are append-only');
END;
CREATE TRIGGER skill_events_immutable BEFORE UPDATE ON skill_events
BEGIN
  SELECT RAISE(ABORT, 'skill events are append-only');
END;
CREATE TRIGGER skill_events_no_delete BEFORE DELETE ON skill_events
BEGIN
  SELECT RAISE(ABORT, 'skill events are append-only');
END;
-- A released version's hash can never change.
CREATE TRIGGER skill_versions_hash_immutable BEFORE UPDATE OF skill_id, version, artifact_sha256, released_by, released_at ON skill_versions
BEGIN
  SELECT RAISE(ABORT, 'a released skill version cannot be modified, only revoked');
END;
CREATE TRIGGER skill_versions_no_delete BEFORE DELETE ON skill_versions
BEGIN
  SELECT RAISE(ABORT, 'a released skill version cannot be deleted, only revoked');
END;
-- The artifact a candidate describes is fixed at proposal time.
CREATE TRIGGER skill_candidates_artifact_immutable BEFORE UPDATE OF name, origin, description, risk_class, artifact_sha256, proposed_by ON skill_candidates
BEGIN
  SELECT RAISE(ABORT, 'a skill candidate is fixed once proposed: propose a new candidate for a changed artifact');
END;
CREATE TRIGGER skill_candidates_state_guard BEFORE UPDATE OF state ON skill_candidates
WHEN OLD.state IN ('rejected', 'revoked') OR (OLD.state = 'released' AND NEW.state != 'revoked' AND NEW.state != 'released')
BEGIN
  SELECT RAISE(ABORT, 'a rejected or revoked skill is final; a released one can only be revoked');
END;
CREATE TRIGGER skill_candidates_version_forward BEFORE UPDATE OF current_version ON skill_candidates
WHEN NEW.current_version < OLD.current_version
BEGIN
  SELECT RAISE(ABORT, 'skill version numbers only move forward');
END;
CREATE TRIGGER skill_versions_revoke_once BEFORE UPDATE OF revoked_at ON skill_versions
WHEN OLD.revoked_at IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'a revoked skill version stays revoked');
END;
CREATE TRIGGER skill_no_replace_candidates BEFORE INSERT ON skill_candidates WHEN EXISTS (SELECT 1 FROM skill_candidates WHERE id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'skill records are append-only: an existing id cannot be replaced'); END;
CREATE TRIGGER skill_no_replace_gates BEFORE INSERT ON skill_gate_records WHEN EXISTS (SELECT 1 FROM skill_gate_records WHERE id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'skill records are append-only: an existing id cannot be replaced'); END;
CREATE TRIGGER skill_no_replace_events BEFORE INSERT ON skill_events WHEN EXISTS (SELECT 1 FROM skill_events WHERE id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'skill records are append-only: an existing id cannot be replaced'); END;
CREATE TRIGGER skill_no_replace_versions BEFORE INSERT ON skill_versions WHEN EXISTS (SELECT 1 FROM skill_versions WHERE skill_id = NEW.skill_id AND version = NEW.version)
BEGIN SELECT RAISE(ABORT, 'skill records are append-only: a released version cannot be replaced'); END;
CREATE TRIGGER skill_candidates_no_delete BEFORE DELETE ON skill_candidates
BEGIN
  SELECT RAISE(ABORT, 'skill candidates are never deleted: reject or revoke them');
END;
