// AgentMom yedekleme komutu (Faz 9, #30). Yazan: Claude [İP:AgentMom Faz 9].
// Kullanım (sunucu çalışırken de güvenlidir; SQLite tutarlı anlık görüntü alır):
//   node src/cli/yedek.ts yedekle
//   node src/cli/yedek.ts dogrula <yedek-klasoru>
//   node src/cli/yedek.ts geri-yukle <yedek-klasoru> <YENI-hedef-klasoru>
// Yedekler yalnızca eklenir (üzerine yazılmaz, silinmez); anahtar/belirteç içermez; canlı veritabanına geri yükleme dokunmaz.
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadConfig } from "../core/config/config.ts";
import { resolveInsideRoot } from "../core/config/safe-path.ts";
import { openDb } from "../core/db/db.ts";
import { isInside } from "../core/policy/engine.ts";
import { BackupError, createBackup, ensureBackupRoot, restoreBackup, verifyBackup } from "../ops/backup.ts";

const root = process.cwd();
const stateDir = resolve(process.env.AGENTMOM_STATE_DIR ?? join(root, "..", "agentmom-state"));
const backupRoot = resolve(process.env.AGENTMOM_BACKUP_DIR ?? join(root, "..", "agentmom-yedek"));
const defaultUserConfig = resolve(root, "..", "agentmom-config", "user-config.json");
const userConfig = process.env.AGENTMOM_USER_CONFIG ?? (existsSync(defaultUserConfig) ? defaultUserConfig : undefined);

const HELP = "Komutlar: yedekle | dogrula <yedek-klasoru> | geri-yukle <yedek-klasoru> <yeni-hedef-klasoru>";

function main(): number {
  const [cmd, a, b] = process.argv.slice(2);
  try {
    if (cmd === "yedekle") {
      const { config } = loadConfig({ ...(userConfig ? { user: userConfig } : {}), project: join(root, "agentmom.config.json"), local: join(root, "agentmom.local.json") });
      const dbPath = resolveInsideRoot(root, config.db.path);
      if (!existsSync(dbPath)) {
        console.error(`Veritabanı bulunamadı: ${dbPath} (sunucu hiç çalıştırılmadı mı?)`);
        return 1;
      }
      ensureBackupRoot(backupRoot, { repoRoot: root, stateDir });
      if (userConfig && (isInside(stateDir, userConfig) || isInside(root, userConfig))) throw new BackupError("invalid_config", "the user configuration lives where agents work: refusing to back it up as trusted");
      const db = openDb(dbPath);
      const configFiles = [
        ...(userConfig ? [{ name: "user-config.json", path: userConfig }] : []),
        ...["agentmom.config.json", "agentmom.local.json"].filter((n) => existsSync(join(root, n))).map((n) => ({ name: n, path: join(root, n) })),
      ];
      const made = createBackup({ db, destRoot: backupRoot, repoRoot: root, stateDir, configFiles, reason: "manuel" });
      db.close();
      const v = verifyBackup(made.dir);
      console.log(`Yedek alındı: ${made.dir}`);
      console.log(`Şema sürümü: ${made.manifest.schemaVersion} · dosya: ${made.manifest.files.map((f) => `${f.name} (${f.bytes} B)`).join(", ")}`);
      console.log(`Doğrulama: ${v.ok ? "GEÇTİ" : "KALDI: " + v.problems.join("; ")}`);
      console.log("Not: anahtar ve belirteç dosyaları yedeğe dahil edilmez; eski yedekleri silmek sizin kararınızdır (Geri Dönüşüm Kutusu).");
      return v.ok ? 0 : 1;
    }
    if (cmd === "dogrula" && a) {
      const v = verifyBackup(resolve(a));
      console.log(v.ok ? `GEÇTİ${v.needsMigration ? " (yedek bu kod sürümünden eski: geri yüklemeden sonra göç uygulanır)" : ""}` : `KALDI:\n - ${v.problems.join("\n - ")}`);
      if (v.manifest) console.log(`Oluşturulma: ${v.manifest.createdAt} · sebep: ${v.manifest.reason} · şema: ${v.manifest.schemaVersion}`);
      return v.ok ? 0 : 1;
    }
    if (cmd === "geri-yukle" && a && b) {
      const r = restoreBackup({ backupDir: resolve(a), targetDir: resolve(b), repoRoot: root, stateDir });
      console.log(`Doğrulanmış kopya yazıldı: ${r.dir}`);
      console.log(`Dosyalar: ${r.files.join(", ")}${r.needsMigration ? " · göç gerekir (sunucu açılışında otomatik, önce yedek alınır)" : ""}`);
      console.log("Canlı veritabanına DOKUNULMADI. Değiştirmek için: sunucuyu durdurun, eski data\\agentmom.db* dosyalarını Geri Dönüşüm Kutusu'na taşıyın, yeni agentmom.db'yi data\\ klasörüne koyun. Ayrıntı: docs/isletim-el-kitabi.md");
      return 0;
    }
    console.error(HELP);
    return 2;
  } catch (e) {
    console.error(e instanceof BackupError ? `Reddedildi (${e.code}): ${e.message}` : `Hata: ${(e as Error).message}`);
    return 1;
  }
}

if (import.meta.main) process.exit(main());
