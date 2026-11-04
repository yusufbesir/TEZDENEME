-- D8c-2a (İnternet erişimi katmanı). Yazan: Claude [İP:AgentMom Faz 11]; sahip: Yusuf; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar.
-- 1) net_settings: internet erişimi ayarı. YALNIZ EKLENİR; geçerli ayar = en büyük seq (açık AUTOINCREMENT sütunu) satırı; hiç satır yoksa internet KAPALIDIR.
CREATE TABLE net_settings (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  id TEXT NOT NULL UNIQUE,
  enabled INTEGER NOT NULL CHECK (enabled IN (0, 1)),
  allowed_domains_json TEXT NOT NULL,
  per_use_approval INTEGER NOT NULL DEFAULT 1 CHECK (per_use_approval IN (0, 1)),
  set_by TEXT NOT NULL,
  set_at TEXT NOT NULL
);
CREATE INDEX idx_net_settings_set_at ON net_settings(set_at);
CREATE TRIGGER net_settings_no_update BEFORE UPDATE ON net_settings BEGIN SELECT RAISE(ABORT, 'net settings are append-only'); END;
CREATE TRIGGER net_settings_no_delete BEFORE DELETE ON net_settings BEGIN SELECT RAISE(ABORT, 'net settings are append-only'); END;

-- 2) net_fetches: her getirme denemesi (başarılı ya da başarısız). Yalnız eklenir. URL yolu/sorgusu ve içerik SAKLANMAZ; yalnız ana bilgisayar + yol özeti (sha256).
CREATE TABLE net_fetches (
  id TEXT PRIMARY KEY,
  ts TEXT NOT NULL,
  host TEXT NOT NULL,
  path_sha256 TEXT NOT NULL,
  final_host TEXT,
  final_path_sha256 TEXT,
  redirect_count INTEGER NOT NULL DEFAULT 0,
  status INTEGER,
  content_type TEXT,
  bytes INTEGER NOT NULL DEFAULT 0,
  sha256 TEXT,
  outcome TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  purpose TEXT NOT NULL
);
CREATE INDEX idx_net_fetches_ts ON net_fetches(ts);
CREATE TRIGGER net_fetches_no_update BEFORE UPDATE ON net_fetches BEGIN SELECT RAISE(ABORT, 'net fetch log is append-only'); END;
CREATE TRIGGER net_fetches_no_delete BEFORE DELETE ON net_fetches BEGIN SELECT RAISE(ABORT, 'net fetch log is append-only'); END;
