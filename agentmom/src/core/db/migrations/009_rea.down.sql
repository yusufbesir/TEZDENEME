-- Down for 009 drops the REA records (rollback only).
DROP TRIGGER IF EXISTS rea_no_replace_recs;
DROP TRIGGER IF EXISTS rea_recs_birth_state;
DROP TRIGGER IF EXISTS rea_recs_policy_block;
DROP TRIGGER IF EXISTS rea_recs_final;
DROP TRIGGER IF EXISTS rea_recs_content_immutable;
DROP TRIGGER IF EXISTS rea_recs_no_delete;
DROP TRIGGER IF EXISTS rea_events_no_delete;
DROP TRIGGER IF EXISTS rea_events_append_only;
DROP TRIGGER IF EXISTS rea_findings_no_delete;
DROP TRIGGER IF EXISTS rea_findings_append_only;
DROP TRIGGER IF EXISTS rea_sources_no_delete;
DROP TABLE IF EXISTS rea_events;
DROP TABLE IF EXISTS rea_recommendations;
DROP TABLE IF EXISTS rea_findings;
DROP TABLE IF EXISTS rea_sources;
