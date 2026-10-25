-- Down for 007 drops operational memory (data is lost by design of a rollback; the kasa export files stay).
DROP TRIGGER IF EXISTS memory_records_no_delete;
DROP TRIGGER IF EXISTS memory_records_no_replace;
DROP TRIGGER IF EXISTS memory_records_status_forward;
DROP TRIGGER IF EXISTS memory_records_immutable;
DROP TABLE IF EXISTS memory_fts;
DROP TABLE IF EXISTS memory_flags;
DROP TABLE IF EXISTS memory_records;
