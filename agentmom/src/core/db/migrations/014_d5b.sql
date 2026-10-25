-- D5b (madde 77, 78, 13). Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
-- 1) Geçici yetenek izinleri: kullanıcı, kapsamlı (eylem + klasör), süreli (en çok 24 sa) ve kullanım sayılı izin verir. Silinemez; yalnız uses ve revoked_* değişir.
CREATE TABLE capability_grants (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  scope_dir TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  max_uses INTEGER NOT NULL CHECK (max_uses BETWEEN 1 AND 100),
  uses INTEGER NOT NULL DEFAULT 0 CHECK (uses >= 0),
  revoked_at TEXT,
  revoked_by TEXT
);
CREATE INDEX idx_grants_action ON capability_grants(action, expires_at);
CREATE TRIGGER capability_grants_no_delete BEFORE DELETE ON capability_grants BEGIN SELECT RAISE(ABORT, 'capability grants are append-only'); END;
CREATE TRIGGER capability_grants_content_immutable BEFORE UPDATE ON capability_grants
WHEN NEW.id IS NOT OLD.id OR NEW.action IS NOT OLD.action OR NEW.scope_dir IS NOT OLD.scope_dir OR NEW.reason IS NOT OLD.reason OR NEW.created_by IS NOT OLD.created_by OR NEW.created_at IS NOT OLD.created_at OR NEW.expires_at IS NOT OLD.expires_at OR NEW.max_uses IS NOT OLD.max_uses
BEGIN SELECT RAISE(ABORT, 'capability grant content is immutable'); END;
CREATE TRIGGER capability_grants_uses_only_up BEFORE UPDATE ON capability_grants
WHEN NEW.uses < OLD.uses OR NEW.uses > NEW.max_uses OR (OLD.revoked_at IS NOT NULL AND (NEW.revoked_at IS NOT OLD.revoked_at OR NEW.revoked_by IS NOT OLD.revoked_by))
BEGIN SELECT RAISE(ABORT, 'grant uses only increase and a revocation is final'); END;

-- 2) Anlamsal değişiklik defteri: ne değişti, neden, kim, hangi görev/denetim kaydıyla bağlı. Yalnız eklenir.
CREATE TABLE change_ledger (
  id TEXT PRIMARY KEY,
  ts TEXT NOT NULL,
  kind TEXT NOT NULL,
  summary TEXT NOT NULL,
  reason TEXT NOT NULL,
  actor_kind TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  task_id TEXT,
  audit_id TEXT,
  files_json TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX idx_change_ledger_ts ON change_ledger(ts);
CREATE INDEX idx_change_ledger_task ON change_ledger(task_id);
CREATE TRIGGER change_ledger_no_update BEFORE UPDATE ON change_ledger BEGIN SELECT RAISE(ABORT, 'change ledger is append-only'); END;
CREATE TRIGGER change_ledger_no_delete BEFORE DELETE ON change_ledger BEGIN SELECT RAISE(ABORT, 'change ledger is append-only'); END;

-- 3) Olay tetiklemeli otomasyon: kurallar (yalnız kullanıcı oluşturur) ve çalışma kayıtları. Kural eylemleri yalnız "bildir" ve "görev kaydı aç"tır; görev kaydı politika motorundan geçer.
CREATE TABLE automation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  event_pattern TEXT NOT NULL,
  action_kind TEXT NOT NULL CHECK (action_kind IN ('notify', 'record_task')),
  params_json TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  cooldown_s INTEGER NOT NULL CHECK (cooldown_s BETWEEN 10 AND 86400),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TRIGGER automation_rules_no_delete BEFORE DELETE ON automation_rules BEGIN SELECT RAISE(ABORT, 'automation rules are not deleted; disable them'); END;
CREATE TRIGGER automation_rules_content_immutable BEFORE UPDATE ON automation_rules
WHEN NEW.id IS NOT OLD.id OR NEW.name IS NOT OLD.name OR NEW.event_pattern IS NOT OLD.event_pattern OR NEW.action_kind IS NOT OLD.action_kind OR NEW.params_json IS NOT OLD.params_json OR NEW.cooldown_s IS NOT OLD.cooldown_s OR NEW.created_by IS NOT OLD.created_by OR NEW.created_at IS NOT OLD.created_at
BEGIN SELECT RAISE(ABORT, 'automation rule content is immutable; only enabled changes'); END;
CREATE TABLE automation_runs (
  id TEXT PRIMARY KEY,
  rule_id TEXT NOT NULL REFERENCES automation_rules(id),
  ts TEXT NOT NULL,
  event_action TEXT NOT NULL,
  event_id TEXT,
  outcome TEXT NOT NULL,
  message TEXT NOT NULL
);
CREATE INDEX idx_automation_runs_rule ON automation_runs(rule_id, ts);
CREATE TRIGGER automation_runs_no_update BEFORE UPDATE ON automation_runs BEGIN SELECT RAISE(ABORT, 'automation runs are append-only'); END;
CREATE TRIGGER automation_runs_no_delete BEFORE DELETE ON automation_runs BEGIN SELECT RAISE(ABORT, 'automation runs are append-only'); END;
