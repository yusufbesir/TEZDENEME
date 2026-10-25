-- REA (Faz 6): trusted-source registry, findings, recommendations and the adoption workflow. Records only; REA never executes research output.
CREATE TABLE rea_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('official_docs', 'release_notes', 'vault_note', 'repo_doc')),
  location TEXT NOT NULL,
  trust REAL NOT NULL CHECK (trust >= 0 AND trust <= 1),
  license TEXT NOT NULL,
  security_note TEXT NOT NULL,
  retrieved_at TEXT NOT NULL,
  content_sha256 TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (kind, location)
);

CREATE TABLE rea_findings (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES rea_sources(id),
  claim TEXT NOT NULL,
  evidence TEXT NOT NULL,
  locator TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (source_id, locator, claim)
);

CREATE TABLE rea_recommendations (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  target_area TEXT NOT NULL CHECK (target_area IN ('provider', 'policy', 'workflow', 'verify', 'memory', 'skills', 'docs', 'sandbox', 'other')),
  affected_paths_json TEXT NOT NULL,
  finding_ids_json TEXT NOT NULL,
  scores_json TEXT NOT NULL,
  priority REAL NOT NULL,
  checks_json TEXT NOT NULL,
  overlap_json TEXT NOT NULL,
  touches_policy INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL CHECK (state IN ('proposed', 'user_decision_required', 'experiment', 'benchmarked', 'awaiting_approval', 'adopted', 'rolled_back', 'rejected')),
  experiment_path TEXT,
  baseline_json TEXT,
  result_json TEXT,
  comparison_json TEXT,
  disabled_at TEXT,
  memory_record_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE rea_events (
  id TEXT PRIMARY KEY,
  recommendation_id TEXT NOT NULL REFERENCES rea_recommendations(id),
  from_state TEXT,
  to_state TEXT NOT NULL,
  actor_kind TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_rea_events_rec ON rea_events(recommendation_id);

CREATE TRIGGER rea_sources_no_delete BEFORE DELETE ON rea_sources BEGIN SELECT RAISE(ABORT, 'REA sources are never deleted'); END;
CREATE TRIGGER rea_findings_append_only BEFORE UPDATE ON rea_findings BEGIN SELECT RAISE(ABORT, 'REA findings are append-only'); END;
CREATE TRIGGER rea_findings_no_delete BEFORE DELETE ON rea_findings BEGIN SELECT RAISE(ABORT, 'REA findings are append-only'); END;
CREATE TRIGGER rea_events_append_only BEFORE UPDATE ON rea_events BEGIN SELECT RAISE(ABORT, 'REA events are append-only'); END;
CREATE TRIGGER rea_events_no_delete BEFORE DELETE ON rea_events BEGIN SELECT RAISE(ABORT, 'REA events are append-only'); END;
CREATE TRIGGER rea_recs_no_delete BEFORE DELETE ON rea_recommendations BEGIN SELECT RAISE(ABORT, 'REA recommendations are never deleted: reject or roll them back'); END;
-- What a recommendation SAYS is fixed at creation (including the policy flag); only workflow columns move.
CREATE TRIGGER rea_recs_content_immutable BEFORE UPDATE OF id, title, summary, target_area, affected_paths_json, finding_ids_json, scores_json, priority, checks_json, overlap_json, touches_policy, created_by, created_at ON rea_recommendations
BEGIN SELECT RAISE(ABORT, 'a recommendation is fixed once recorded'); END;
-- Final states stay final; a policy-touching recommendation can never reach experiment/adoption through REA.
CREATE TRIGGER rea_recs_final BEFORE UPDATE OF state ON rea_recommendations
WHEN OLD.state IN ('rejected', 'rolled_back')
BEGIN SELECT RAISE(ABORT, 'a rejected or rolled-back recommendation is final'); END;
CREATE TRIGGER rea_recs_policy_block BEFORE UPDATE OF state ON rea_recommendations
WHEN OLD.touches_policy = 1 AND NEW.state IN ('experiment', 'benchmarked', 'awaiting_approval', 'adopted')
BEGIN SELECT RAISE(ABORT, 'a recommendation that changes policy, permissions or approval rules never enters the adoption workflow'); END;
-- A recommendation can only be BORN at the start of the workflow, and a policy-touching one only as user_decision_required (no direct INSERT into experiment/adopted).
CREATE TRIGGER rea_recs_birth_state BEFORE INSERT ON rea_recommendations
WHEN NEW.state NOT IN ('proposed', 'user_decision_required') OR (NEW.touches_policy = 1 AND NEW.state != 'user_decision_required') OR (NEW.touches_policy = 0 AND NEW.state = 'user_decision_required')
BEGIN SELECT RAISE(ABORT, 'a recommendation starts as proposed, or as user_decision_required when it touches policy'); END;
CREATE TRIGGER rea_no_replace_recs BEFORE INSERT ON rea_recommendations WHEN EXISTS (SELECT 1 FROM rea_recommendations WHERE id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'REA records are append-only'); END;
