-- Zaman tetikleyicili otomasyon (madde 13 genişlemesi, ADR-016). Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
-- automation_rules: trigger_kind ('event'|'schedule') + schedule_json eklenir ve action_kind kısıtına 'run_analysis' girer. SQLite CHECK kısıtını değiştiremez:
-- tablo YENİDEN OLUŞTURULUR (yedek kopya + eskiyi bırak + yeni tablo + geri yükle + yedeği bırak); kurallar ve çalışma kayıtları aynen korunur.
-- automation_runs bu tabloya yabancı anahtarla bağlıdır: işlem sonuna kadar yabancı anahtar denetimi ertelenir (kopya aynı kimlikleri taşıdığı için sonda ihlal kalmaz).
-- Zaman tetikleyicili kuralda event_pattern '' olur (olay dinlemez). automation_runs.outcome serbest metindir; yeni değerler: scheduled_ok, missed.
PRAGMA defer_foreign_keys = ON;
CREATE TABLE automation_rules_bak AS SELECT id, name, event_pattern, action_kind, params_json, enabled, cooldown_s, created_by, created_at FROM automation_rules;
DROP TABLE automation_rules;
CREATE TABLE automation_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  event_pattern TEXT NOT NULL,
  action_kind TEXT NOT NULL CHECK (action_kind IN ('notify', 'record_task', 'run_analysis')),
  params_json TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  cooldown_s INTEGER NOT NULL CHECK (cooldown_s BETWEEN 10 AND 86400),
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL,
  trigger_kind TEXT NOT NULL DEFAULT 'event' CHECK (trigger_kind IN ('event', 'schedule')),
  schedule_json TEXT,
  CHECK ((trigger_kind = 'event' AND event_pattern <> '' AND schedule_json IS NULL AND action_kind IN ('notify', 'record_task')) OR (trigger_kind = 'schedule' AND event_pattern = '' AND schedule_json IS NOT NULL))
);
INSERT INTO automation_rules (id, name, event_pattern, action_kind, params_json, enabled, cooldown_s, created_by, created_at) SELECT id, name, event_pattern, action_kind, params_json, enabled, cooldown_s, created_by, created_at FROM automation_rules_bak;
DROP TABLE automation_rules_bak;
CREATE INDEX idx_automation_rules_trigger ON automation_rules(trigger_kind, enabled);
CREATE TRIGGER automation_rules_no_delete BEFORE DELETE ON automation_rules BEGIN SELECT RAISE(ABORT, 'automation rules are not deleted; disable them'); END;
CREATE TRIGGER automation_rules_content_immutable BEFORE UPDATE ON automation_rules
WHEN NEW.id IS NOT OLD.id OR NEW.name IS NOT OLD.name OR NEW.event_pattern IS NOT OLD.event_pattern OR NEW.action_kind IS NOT OLD.action_kind OR NEW.params_json IS NOT OLD.params_json OR NEW.cooldown_s IS NOT OLD.cooldown_s OR NEW.created_by IS NOT OLD.created_by OR NEW.created_at IS NOT OLD.created_at OR NEW.trigger_kind IS NOT OLD.trigger_kind OR NEW.schedule_json IS NOT OLD.schedule_json
BEGIN SELECT RAISE(ABORT, 'automation rule content is immutable; only enabled changes'); END;
