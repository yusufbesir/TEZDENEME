-- Hesap verebilirlik zinciri (madde 95, D5a; yazan: Claude [İP:AgentMom D5a], sahip: Yusuf; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar).
-- Her yeni denetim satırı bir öncekinin özetine bağlanır: hash = sha256(prev_hash + kanonik JSON(id, ts, initiator, action, decision, result, details)).
-- Sütunlar boş olabilir: bu migrasyondan önceki satırlar zincire girmez (geriye dönük özet uydurulmaz). Denetim kaydı yalnız eklenir:
-- satır değiştirilemez ve silinemez (tetikleyiciler); zincirin bozulması GET /api/audit/verify ile tespit edilir.
ALTER TABLE audit_events ADD COLUMN prev_hash TEXT;
ALTER TABLE audit_events ADD COLUMN hash TEXT;
CREATE INDEX idx_audit_hash ON audit_events(hash) WHERE hash IS NOT NULL;
CREATE TRIGGER audit_events_no_update BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT, 'audit events are append-only'); END;
CREATE TRIGGER audit_events_no_delete BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT, 'audit events are append-only'); END;