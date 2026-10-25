# Entegrasyon: Gemini CLI
Sahip modül: M4 (`src/providers/gemini.ts`). Tarih: 2026-10-21. Rota: abonelik. Durum: **adaptör var, yürütme varsayılan KAPALI, hiç gerçek model çağrısı yapılmadı**.

## Cihaz durumu (gerçek)
- Yol: `D:\n8n\nodejs\node.exe D:\n8n\nodejs\node_modules\@google\gemini-cli\bundle\gemini.js` (0.64.0; `gemini.cmd` yerine doğrudan Node ile, kabuk yok).
- Giriş durumu **bilinmiyor**: Gemini CLI'ın giriş durumu komutu yok; doğrulamak ancak bir model çağrısıyla mümkün olur ve bu yapılmadı. `testConnection` dürüstçe `reachable: true, authenticated: null` döner.

## Kapasite beyanı
testConnection → partial (yalnız `--version`). execute ve diğer yürütme işlemleri → **unavailable** (varsayılan; testlerde sahte süreçle `unverified`): `-p … -o stream-json --approval-mode plan` bayrakları `--help` çıktısından doğrulandı; `stream-json` satır şekli belgeye dayanıyor ve **gerçek çıktıyla doğrulanmadı**.

## Sınırlar
- Yürütme `allowUnverifiedExecution` verilmedikçe reddedilir (araç / eklenti / MCP / çalışma alanı ayarı kısıtı doğrulanmadı; `-e none` bayrağı eklenmiş ama etkisi doğrulanmadı).
- Açıldığında yalnız salt-okunur `plan` kipi; yazılabilir sandbox ve okuma dışı araçlar (`checkSandbox`) reddedilir: Gemini'nin araç/yazma kısıtlarının nasıl uygulandığı doğrulanmadı.
- Orkestratör/politika koduna **dokunmadan** eklendi (kanıt: `docs/testing/faz2-test-sonucu.md`, commit `4e09bd4`).
- Sıradaki adım: Yusuf giriş yaparsa tek küçük gerçek çağrıyla olay şeması doğrulanacak.

## Gerçek deneme (2026-10-21, 17:30): başarısız, giriş tamamlanmamış
Yusuf `gemini-giris.bat` ile giriş yaptığını bildirdi; ancak `~\.gemini` içinde `settings.json` ve `oauth_creds.json` yok (yalnız `installation_id`). Tek gerçek çağrı (`gemini -p ... -o stream-json --approval-mode plan -e none`, salt-okunur, API anahtarı ortamı yok) model çağrısına varmadan **çıkış kodu 41** ile bitti: "Please set an Auth method in your settings.json or specify one of: GEMINI_API_KEY, GOOGLE_GENAI_USE_VERTEXAI, GOOGLE_GENAI_USE_GCA". Ek bulgu: "Approval mode overridden to default because the current folder is not trusted": güvenilmeyen klasörde `--approval-mode plan` yok sayılıp varsayılana dönüyor (headless'ta araç kullanımı onay bekleyeceğinden fiilen reddedilir). `--skip-trust` kullanılmaz: ajan yazımı klasörü güvenilir saymak çalışma alanı ayarlarını açar.
Gerçek stderr `src/providers/testing/gemini-real-auth-error.txt` olarak saklandı; adaptör bunu `auth_required` olarak sınıflar (test). Yürütme **kapalı kalır**; giriş tamamlanınca tek küçük çağrı yeniden denenir (API anahtarı girilmez).

## Güncelleme (2026-10-21, 17:50): giriş BAŞARILI, hizmet tarafı reddediyor
Yusuf girişi tamamladı: `~\.gemini` içinde `oauth_creds.json` ve `google_accounts.json` oluştu, ayar `security.auth.selectedType = "oauth-personal"` (Google hesabı; API anahtarı değil). Ardından gerçek çağrı (`gemini -p ... -o text`) **Google tarafından reddedildi**: `IneligibleTierError: This client is no longer supported for Gemini Code Assist for individuals. To continue using Gemini, please migrate to the Antigravity suite of products: https://antigravity.google` (`reasonCode: UNSUPPORTED_CLIENT`, `tierId: free-tier`). Yani bireysel hesapta Gemini CLI hizmeti kapatılmış; giriş ya da ayar hatası değil. Yusuf'un "developer sayfasına yönlendiriyor" gözlemi bu geçiş sayfasıdır.
- Gerçek hata `src/providers/testing/gemini-real-ineligible.txt` olarak saklandı; adaptör `unavailable` sınıflar (test).
- Ek bulgu: headless'ta "klasör güvenilir değil" (çıkış 55); `--skip-trust` ve `GEMINI_CLI_TRUST_WORKSPACE` bilerek kullanılmadı.
- Yürütme **kapalı kalır**. Seçenekler (Yusuf kararı): Antigravity ürün ailesine geçiş (ayrı araç, araştırma gerekir), Gemini API anahtarı (ücretli/kota; şu an yasak) ya da Gemini'yi kullanmamak. Öneri: şimdilik Claude Code + Codex.
