-- Down for 014 siler geçici izin, değişiklik defteri ve otomasyon kayıtlarını (yalnız geri alma; önce yedek alın).
DROP TRIGGER IF EXISTS automation_runs_no_delete;
DROP TRIGGER IF EXISTS automation_runs_no_update;
DROP TABLE IF EXISTS automation_runs;
DROP TRIGGER IF EXISTS automation_rules_content_immutable;
DROP TRIGGER IF EXISTS automation_rules_no_delete;
DROP TABLE IF EXISTS automation_rules;
DROP TRIGGER IF EXISTS change_ledger_no_delete;
DROP TRIGGER IF EXISTS change_ledger_no_update;
DROP TABLE IF EXISTS change_ledger;
DROP TRIGGER IF EXISTS capability_grants_uses_only_up;
DROP TRIGGER IF EXISTS capability_grants_content_immutable;
DROP TRIGGER IF EXISTS capability_grants_no_delete;
DROP TABLE IF EXISTS capability_grants;
