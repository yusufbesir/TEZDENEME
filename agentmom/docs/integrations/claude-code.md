# Entegrasyon: Claude Code CLI
Sahip modül: M4 Sağlayıcı ve Ajan Ekosistemi (`src/providers/claude-code.ts`). Tarih: 2026-10-21. Rota: abonelik (`subscription`).

## Cihaz durumu (gerçek)
- Yol: `D:\Programlar\npm-global\node_modules\@anthropic-ai\claude-code\bin\claude.exe` (npm `@anthropic-ai/claude-code` 2.1.306, yerel ikili; `claude.cmd` yerine doğrudan ikili çalıştırılır, kabuk yok).
- `claude --version` → 2.1.306. `claude auth status`: **`loggedIn: true`, `authMethod: claude.ai`, `apiProvider: firstParty`, abonelik `max`** (2026-10-21 17:28'de Yusuf giriş yaptı; ücretli API anahtarı değil, anahtar ortam değişkeni de tanımlı değil).
- Ayrıca `C:\Users\…\.local\bin\claude.exe` var (dokunulmadı).

## Kapasite beyanı (kanıta göre)
| İşlem | Durum | Kanıt |
|---|---|---|
| describeCapabilities, validateConfiguration, getStatus, dispose | verified | yerel |
| testConnection | verified | `--version` ve `auth status` gerçek çalıştırıldı |
| execute, streamEvents, collectEvidence, getUsage | **partial** | **gerçek çalıştırma 2026-10-21** (abonelik, `--safe-mode`, plan kipi, "pong"): `system/init`, `assistant`, `rate_limit_event`, `result` (usage, `total_cost_usd`, `modelUsage`) gözlendi; kayıt `src/providers/testing/claude-real-run.jsonl`. Başarısızlık, iptal, `acceptEdits` ve araç olayları gerçek çıktıyla doğrulanmadı |
| cancel | unverified | yalnız sahte süreç |

## Çalıştırma
`claude -p --output-format stream-json --verbose --no-session-persistence --safe-mode --permission-mode <plan|acceptEdits> --permission-prompts none --tools <liste> --allowedTools <liste> [--model m]`; istem stdin'den. İzin kipi ve araç listesi **sözleşmeden** türetilir (`policy-map.ts`); `bypassPermissions`/`--dangerously-skip-permissions` hiçbir koşulda kullanılmaz. Ortam: izin listesi (API anahtarları ve belirteçler geçirilmez), `TEMP` D:'ye yönlendirilir.

## Sınırlar ve riskler
- **Bash reddedilir** (`checkSandbox`): doğrulanmış işletim sistemi düzeyi izolasyon yok. Dosya araçları çalışma dizinine bağlıdır çünkü istemler kapalıdır (dışarısı otomatik reddedilir) — bu davranış gerçek çalıştırmayla doğrulanmadı.
- Çalışma dizini repo ayarlarını (`.claude/settings`, kancalar) okuyabilir; `--bare` abonelik girişiyle uyumsuz olduğu için kullanılmadı. Güvenilmeyen repo için risk: kullanıcı ayarı gerekir.
- Giriş yapılırsa yapılacak ilk iş: `stream-json` olay türlerini bir kez gerçek çalıştırmayla doğrulamak ve kapasiteyi güncellemek.

## Gerçek çalıştırmadan çıkan bulgular (2026-10-21)
- **`--safe-mode` zorunlu:** onsuz CLI, kullanıcı profilindeki tüm eklenti, beceri, kanca ve MCP sunucularını işçiye yükledi (tek kelimelik istem için ≈558k önbellek token; liste fiyatı eşdeğeri 2,23 $). `--safe-mode` ile aynı iş ≈6,7k token ve 0,014 $ liste eşdeğeri. Adaptöre kalıcı eklendi.
- **Maliyet alanı abonelikte tahsilat değildir:** `total_cost_usd` ve `modelUsage.*.costBasis: "list"` liste fiyatı eşdeğeridir. `Usage.costBasis = "list"` olarak işaretlenir; bütçe kararlarında kullanılmaz.
- Gerçek akışta çok sayıda `system` satırı olabilir (kanca/durum); yalnız `subtype: init` oturum başlangıcı sayılır. `rate_limit_event` yok sayılır.
- Bu çalıştırmada API anahtarı ortamı çocuk sürece geçirilmedi (`apiProvider: firstParty`, abonelik).
