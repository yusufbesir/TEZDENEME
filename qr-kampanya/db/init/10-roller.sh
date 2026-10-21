#!/bin/sh
# Veritabanı rollerini kurar (idempotent: istenildiği kadar tekrar çalıştırılabilir).
#   qr_sahip     : veritabanı ve bütün nesnelerin sahibi; migrasyonları yalnızca bu çalıştırır.
#   qr_uygulama  : web uygulamasının hesabı; yalnızca SELECT/INSERT/UPDATE/DELETE (+ dizilerde USAGE, SELECT).
# Süper kullanıcı (POSTGRES_USER) yalnızca bakım içindir; uygulama onunla bağlanmaz.
#
# İlk kurulumda postgres imajı bu dosyayı kendisi çalıştırır (/docker-entrypoint-initdb.d).
# Var olan bir veritabanında elle çalıştırmak için (örn. eski sürümden geçişte, geri yüklemeden sonra):
#   docker compose exec db sh /docker-entrypoint-initdb.d/10-roller.sh
# Parolalar ortamdan (POSTGRES_SAHIP_PAROLA, POSTGRES_UYGULAMA_PAROLA) okunur; komut satırına,
# günlüğe veya çıktıya yazılmaz (psql'e stdin + psql değişkeni ile verilir).
set -eu

[ -n "${POSTGRES_SAHIP_PAROLA:-}" ] || { echo "10-roller: POSTGRES_SAHIP_PAROLA tanımlı değil." >&2; exit 1; }
[ -n "${POSTGRES_UYGULAMA_PAROLA:-}" ] || { echo "10-roller: POSTGRES_UYGULAMA_PAROLA tanımlı değil." >&2; exit 1; }
[ "$POSTGRES_SAHIP_PAROLA" != "$POSTGRES_UYGULAMA_PAROLA" ] || { echo "10-roller: iki parola birbirinden farklı olmalı." >&2; exit 1; }

echo "10-roller: roller ve yetkiler uygulanıyor..."
psql --no-psqlrc --quiet --single-transaction -v ON_ERROR_STOP=1 \
  -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f - <<'SQL'
\getenv sahip_parola POSTGRES_SAHIP_PAROLA
\getenv uygulama_parola POSTGRES_UYGULAMA_PAROLA
\getenv veritabani POSTGRES_DB

-- Hata olsa bile parola içeren deyim sunucu günlüğüne yazılmasın.
SET log_statement = 'none';
SET log_min_error_statement = 'panic';

-- 1) Roller: yoksa oluştur, her seferinde öznitelikleri ve parolayı güncelle.
SELECT 'CREATE ROLE qr_sahip LOGIN' WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qr_sahip') \gexec
SELECT 'CREATE ROLE qr_uygulama LOGIN' WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qr_uygulama') \gexec
ALTER ROLE qr_sahip WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS INHERIT PASSWORD :'sahip_parola';
ALTER ROLE qr_uygulama WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS NOINHERIT PASSWORD :'uygulama_parola';

-- 2) Veritabanı ve public şema sahibi; bağlantı yetkisi yalnızca iki role.
ALTER DATABASE :"veritabani" OWNER TO qr_sahip;
REVOKE ALL ON DATABASE :"veritabani" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"veritabani" TO qr_sahip, qr_uygulama;
ALTER SCHEMA public OWNER TO qr_sahip;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO qr_uygulama;

-- 3) public şemadaki qr_sahip'e ait olmayan nesnelerin sahipliğini devret
--    (REASSIGN OWNED önyükleme süper kullanıcısında çalışmadığı için döngü).
--    Eklentiye ait nesneler ve tabloya bağlı diziler (sahibi tabloyla birlikte değişir) atlanır.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.oid, c.relname, c.relkind
      FROM pg_class c
     WHERE c.relnamespace = 'public'::regnamespace
       AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
       AND c.relowner <> 'qr_sahip'::regrole
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('ALTER %s %I.%I OWNER TO qr_sahip',
      CASE r.relkind WHEN 'v' THEN 'VIEW' WHEN 'm' THEN 'MATERIALIZED VIEW' WHEN 'f' THEN 'FOREIGN TABLE' ELSE 'TABLE' END,
      'public', r.relname);
  END LOOP;

  FOR r IN
    SELECT c.oid, c.relname
      FROM pg_class c
     WHERE c.relnamespace = 'public'::regnamespace
       AND c.relkind = 'S'
       AND c.relowner <> 'qr_sahip'::regrole
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype IN ('a', 'i', 'e'))
  LOOP
    EXECUTE format('ALTER SEQUENCE %I.%I OWNER TO qr_sahip', 'public', r.relname);
  END LOOP;

  FOR r IN
    SELECT p.oid::regprocedure AS imza, p.prokind
      FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.prokind IN ('f', 'p')
       AND p.proowner <> 'qr_sahip'::regrole
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('ALTER %s %s OWNER TO qr_sahip', CASE r.prokind WHEN 'p' THEN 'PROCEDURE' ELSE 'FUNCTION' END, r.imza);
  END LOOP;
END
$$;

-- 4) Yetkiler: önce sıfırla (fazla yetki kalmasın), sonra yalnızca gerekenleri ver.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, qr_uygulama;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC, qr_uygulama;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO qr_uygulama;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO qr_uygulama;

-- Gelecekte qr_sahip'in (migrasyonlarla) oluşturacağı nesneler için aynı yetkiler.
ALTER DEFAULT PRIVILEGES FOR ROLE qr_sahip IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO qr_uygulama;
ALTER DEFAULT PRIVILEGES FOR ROLE qr_sahip IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO qr_uygulama;

-- 5) Ek savunma (silme koruması tetikleyicilerine ek olarak): tablolar varsa yetkiyi geri al.
--    Uygulama kodu bu tablolarda bu işlemleri kullanmaz. İlk kurulumda tablolar henüz yoktur;
--    aynı geri almalar qr migrasyonu 0005 ile de uygulanır.
DO $$
BEGIN
  IF to_regclass('public.qr_denetimkaydi') IS NOT NULL THEN
    REVOKE UPDATE, DELETE ON public.qr_denetimkaydi FROM qr_uygulama;
  END IF;
  IF to_regclass('public.qr_qrkod') IS NOT NULL THEN
    REVOKE DELETE ON public.qr_qrkod FROM qr_uygulama;
  END IF;
  IF to_regclass('public.qr_kampanyasayfasi') IS NOT NULL THEN
    REVOKE DELETE ON public.qr_kampanyasayfasi FROM qr_uygulama;
  END IF;
  IF to_regclass('public.qr_hedefgecmisi') IS NOT NULL THEN
    REVOKE DELETE ON public.qr_hedefgecmisi FROM qr_uygulama;
  END IF;
  IF to_regclass('public.qr_linkagaci') IS NOT NULL THEN
    REVOKE DELETE ON public.qr_linkagaci FROM qr_uygulama;
  END IF;
END
$$;
SQL
echo "10-roller: tamam."
