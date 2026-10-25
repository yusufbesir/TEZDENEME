-- Reasoning ledgers (Faz 7, M14): decisions with expiry and assumptions (#67, #69) and confidence calibration (#68). Records only; no model, no network.
CREATE TABLE decisions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  rationale TEXT NOT NULL,
  scope TEXT NOT NULL,
  made_by TEXT NOT NULL,
  decided_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  supersedes_id TEXT REFERENCES decisions(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'superseded', 'retired')),
  memory_record_id TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE decision_assumptions (
  id TEXT PRIMARY KEY,
  decision_id TEXT NOT NULL REFERENCES decisions(id),
  text TEXT NOT NULL,
  check_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'unvalidated' CHECK (status IN ('unvalidated', 'holds', 'broken')),
  evidence TEXT,
  checked_by TEXT,
  checked_at TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX idx_assumptions_decision ON decision_assumptions(decision_id);

CREATE TABLE assumption_events (
  id TEXT PRIMARY KEY,
  assumption_id TEXT NOT NULL REFERENCES decision_assumptions(id),
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  evidence TEXT NOT NULL,
  actor_kind TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE predictions (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  claim TEXT NOT NULL,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  due_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  recorded_by TEXT NOT NULL DEFAULT 'unknown',
  outcome INTEGER CHECK (outcome IN (0, 1)),
  resolved_at TEXT,
  evidence TEXT
);
CREATE INDEX idx_predictions_source ON predictions(source);

CREATE TRIGGER decisions_content_immutable BEFORE UPDATE OF id, title, rationale, scope, made_by, decided_at, expires_at, supersedes_id, memory_record_id, created_at ON decisions
BEGIN SELECT RAISE(ABORT, 'a decision is fixed once recorded: record a superseding decision'); END;
CREATE TRIGGER decisions_status_forward BEFORE UPDATE OF status ON decisions
WHEN NOT (OLD.status = NEW.status OR (OLD.status = 'active' AND NEW.status IN ('superseded', 'retired')) OR (OLD.status = 'superseded' AND NEW.status = 'retired'))
BEGIN SELECT RAISE(ABORT, 'decision status only moves forward'); END;
CREATE TRIGGER decisions_no_delete BEFORE DELETE ON decisions BEGIN SELECT RAISE(ABORT, 'decisions are never deleted'); END;
CREATE TRIGGER decisions_birth BEFORE INSERT ON decisions WHEN NEW.status != 'active' OR EXISTS (SELECT 1 FROM decisions WHERE id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'a decision starts active and cannot be replaced'); END;

CREATE TRIGGER assumptions_content_immutable BEFORE UPDATE OF id, decision_id, text, check_by, created_at ON decision_assumptions
BEGIN SELECT RAISE(ABORT, 'an assumption is fixed once recorded'); END;
CREATE TRIGGER assumptions_no_delete BEFORE DELETE ON decision_assumptions BEGIN SELECT RAISE(ABORT, 'assumptions are never deleted'); END;
CREATE TRIGGER assumptions_birth BEFORE INSERT ON decision_assumptions WHEN NEW.status != 'unvalidated' OR EXISTS (SELECT 1 FROM decision_assumptions WHERE id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'an assumption starts unvalidated and cannot be replaced'); END;
-- A status change needs a matching logged event (events are written first), and an event must start from the real current status.
CREATE TRIGGER assumptions_status_needs_event BEFORE UPDATE OF status, evidence, checked_by, checked_at ON decision_assumptions
WHEN NEW.status = OLD.status OR (SELECT to_status FROM assumption_events WHERE assumption_id = NEW.id ORDER BY rowid DESC LIMIT 1) IS NOT NEW.status
BEGIN SELECT RAISE(ABORT, 'an assumption status change needs a matching logged event'); END;
CREATE TRIGGER assumption_events_real_from BEFORE INSERT ON assumption_events
WHEN NEW.from_status IS NOT (SELECT status FROM decision_assumptions WHERE id = NEW.assumption_id) OR NEW.from_status = NEW.to_status OR EXISTS (SELECT 1 FROM assumption_events WHERE id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'an assumption event must start from the real current status'); END;
CREATE TRIGGER assumption_events_append_only BEFORE UPDATE ON assumption_events BEGIN SELECT RAISE(ABORT, 'assumption events are append-only'); END;
CREATE TRIGGER assumption_events_no_delete BEFORE DELETE ON assumption_events BEGIN SELECT RAISE(ABORT, 'assumption events are append-only'); END;

CREATE TRIGGER predictions_content_immutable BEFORE UPDATE OF id, source, claim, confidence, due_at, created_at, recorded_by ON predictions
BEGIN SELECT RAISE(ABORT, 'a prediction is fixed once recorded (no re-writing confidence after the fact)'); END;
CREATE TRIGGER predictions_resolve_once BEFORE UPDATE OF outcome, resolved_at, evidence ON predictions WHEN OLD.outcome IS NOT NULL
BEGIN SELECT RAISE(ABORT, 'a prediction is resolved once'); END;
CREATE TRIGGER predictions_no_delete BEFORE DELETE ON predictions BEGIN SELECT RAISE(ABORT, 'predictions are never deleted (deleting misses would fake calibration)'); END;
CREATE TRIGGER predictions_birth BEFORE INSERT ON predictions WHEN NEW.outcome IS NOT NULL OR EXISTS (SELECT 1 FROM predictions WHERE id = NEW.id)
BEGIN SELECT RAISE(ABORT, 'a prediction starts unresolved and cannot be replaced'); END;
