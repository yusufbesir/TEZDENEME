-- Down for 011 drops the sub-session tables (rollback only; yazan: Claude [İP:AgentMom Faz 11]).
DROP TRIGGER IF EXISTS subsession_names_no_delete;
DROP TRIGGER IF EXISTS subsession_names_append_only;
DROP TRIGGER IF EXISTS subsessions_no_delete;
DROP TRIGGER IF EXISTS subsessions_system_fields_immutable;
DROP TABLE IF EXISTS subsession_name_history;
DROP TABLE IF EXISTS subsessions;
