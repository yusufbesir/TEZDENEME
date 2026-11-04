-- Down for 015: VERİ KAYBI UYARISI. Bu betik internet erişimi ayar geçmişini (net_settings) ve getirme günlüğünü (net_fetches) siler. Önce yedek alın.
-- Geri alma sonrası internet erişimi (ayar satırı olmadığı için) kapalı kalır. Yazan: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir.
DROP TRIGGER IF EXISTS net_fetches_no_delete;
DROP TRIGGER IF EXISTS net_fetches_no_update;
DROP TABLE IF EXISTS net_fetches;
DROP TRIGGER IF EXISTS net_settings_no_delete;
DROP TRIGGER IF EXISTS net_settings_no_update;
DROP TABLE IF EXISTS net_settings;
