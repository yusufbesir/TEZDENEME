-- Down for 016: VERİ KAYBI UYARISI. Zaman tetikleyicili (trigger_kind='schedule') kurallar ve onların çalışma kayıtları eski şemada gösterilemez; SİLİNİR.
-- Olay tetikleyicili kurallar ve kayıtları korunur. Önce yedek alın. Yazan: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
PRAGMA defer_foreign_keys = ON;
DROP TRIGGER IF EXISTS automation_runs_no_delete;
DELETE FROM automation_runs WHERE rule_id IN (SELECT id FROM automation_rules WHERE trigger_kind = 'schedule');
CREATE TRIGGER automation_runs_no_delete BEFORE DELETE ON automation_runs BEGIN SELECT RAISE(ABORT, 'automation runs are append-only'); END;
DROP TRIGGER IF EXISTS automation_rules_content_immutable;
DROP TRIGGER IF EXISTS automation_rules_no_delete;
DROP INDEX IF EXISTS idx_automation_rules_trigger;
CREATE TABLE automation_rules_bak AS SELECT id, name, event_pattern, action_kind, params_json, enabled, cooldown_s, created_by, created_at FROM automation_rules WHERE trigger_kind = 'event';
DROP TABLE automation_rules;
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
INSERT INTO automation_rules (id, name, event_pattern, action_kind, params_json, enabled, cooldown_s, created_by, created_at) SELECT id, name, event_pattern, action_kind, params_json, enabled, cooldown_s, created_by, created_at FROM automation_rules_bak;
DROP TABLE automation_rules_bak;
CREATE TRIGGER automation_rules_no_delete BEFORE DELETE ON automation_rules BEGIN SELECT RAISE(ABORT, 'automation rules are not deleted; disable them'); END;
CREATE TRIGGER automation_rules_content_immutable BEFORE UPDATE ON automation_rules
WHEN NEW.id IS NOT OLD.id OR NEW.name IS NOT OLD.name OR NEW.event_pattern IS NOT OLD.event_pattern OR NEW.action_kind IS NOT OLD.action_kind OR NEW.params_json IS NOT OLD.params_json OR NEW.cooldown_s IS NOT OLD.cooldown_s OR NEW.created_by IS NOT OLD.created_by OR NEW.created_at IS NOT OLD.created_at
BEGIN SELECT RAISE(ABORT, 'automation rule content is immutable; only enabled changes'); END;
