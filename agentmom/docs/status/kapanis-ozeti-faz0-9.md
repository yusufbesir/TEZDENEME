<!-- Sahip: Claude [İP:AgentMom Faz 9]. AgentMom Faz 0-9 kapanış özeti (2026-10-21). Değişiklik: yalnız ekleme. -->
# AgentMom Faz 0–9 kapanış özeti (2026-10-21)
Depo `yusufbesir/agentmom` (özel), TypeScript/Node 24, `node:sqlite`, yalnız yerel `D:`; **349 test**, tsc temiz. Her faz bağımsız güvenlik denetiminden geçti; kasa arşiv notları `D:\YusufII\HAFIZAM1\kasa\notlar\` altında.

## Fazlar
| Faz | Teslim |
|---|---|
| 0 | Keşif, mimari, 100 yeteneğin tek-sahip matrisi, risk kaydı |
| 1 | Çekirdek: yapılandırma katmanları, SQLite göçleri, politika motoru, denetim kaydı, sır soyutlaması, oturum belirteci |
| 2 | Sağlayıcı sözleşmesi + Claude Code / Codex / Gemini adaptörleri, kapasite matrisi (kanıtlı) |
| 3 | Görev yürütme dilimi, worktree yalıtımı, iş akışı (planla→uygula→incele→doğrula), kurtarma, devir, eşzamanlılık |
| 4 | Beyin Verify: yerel test koşucusu, Edge tarayıcı doğrulama, izlenebilirlik, teslim denetçisi, onarım koordinatörü |
| 5 | Gerçek çok adımlı deneme (Claude→Codex→Verify), bellek (FTS5 + Obsidian dışa aktarım), beceri yaşam döngüsü iskeleti |
| 6 | REA: kaynak kaydı, bulgu→öneri, onay iş akışı, politika sınırı (REA politikayı değiştiremez) |
| 7 | Karar son kullanma + varsayım borcu defteri, güven kalibrasyonu |
| 8 | Türkçe yerel Komuta Paneli + terminal komutu |
| 9 | Yedekleme/doğrulamalı geri yükleme, göç güvenliği, çökme dayanıklılığı, işletim el kitabı |

## Kalan sınırlar (dürüst liste)
- **Yalıtım sert sandbox değil:** Node izin modeli + git worktree; ağı kısıtlamaz. Docker bilinçli ertelendi. Codex salt-okunur kipi dosya sistemini okuyabilir; `D:\Arşiv` yalnız HEDEF olarak yasak, **sandbox içinden içine bakılabiliyor (Yusuf kabul etti)**. Codex sandbox hesabına `D:\YusufII` kökünde yazma hakkı verilmiş (daraltma betiği hazır, çalıştırılmadı).
- **Sağlayıcı kapasiteleri kısmi:** Claude/Codex birkaç gerçek çalıştırmayla `partial`; araç olayı ayrıntıları, yanıt-ortası iptal, Codex workspace-write doğrulanmadı. **Gemini kullanılamaz** (Google bireysel hesaplarda istemciyi kapattı); yürütme kapalı.
- **Model çıktısına güvenilmez:** Faz 5'te Codex yanlış pozitif verdi, Claude yanlış beyanda bulundu; karar verici testler + git kanıtıdır. Tek inceleyici yeterli değil.
- **Kimlik düzeyi bağımsızlık etiketle sınırlıdır** (beceri/REA/kalibrasyon: "kim" kanıtlı kimlik değil); tüm yönetim uçları yalnız kullanıcı belirteciyle çalışır.
- **Tek kullanıcı, tek makine, tek süreç:** çok kullanıcı/rol yok; aynı veritabanına iki sunucu süreci kilidi yok; belirteç dosyası ACL'i uygulanmıyor; `spentUsd` canlı değil.
- **Dedektörler sezgiseldir:** REA politika dedektörü fail-closed izin listesi (yanlış pozitif tercih edilir); sır taraması desen tabanlı; yedek manifestinde HMAC yok.
- **Test kapsamı:** yalnız Node test koşucusu; tarayıcı doğrulaması küçük bildirimsel senaryolar; gerçek model çağrısı yalnız Faz 5 denemesinde (221k giriş token, abonelik).

## Ertelenen yetenekler (matristen)
Görsel iş akışı editörü #16, mobil #20, uzaktan çalışma/devir #19, dağıtım ve sürüm yönetimi #22, gözlemlenebilirlik #8/#28, olay tetiklemeli otomasyon #13, portföy #15/#33/#79, uyarlanabilir arayüz #91–93, çok kullanıcı #31, API/veri/erişilebilirlik laboratuvarları #24/#25/#27, mutasyon testi/durum geçişi/hata oynatma #57–60, kıyaslama merkezi #12, güvenilir araç pazarı #32, Faz 7'den model akıl yürütmesi isteyenler #61–65, #81–87, #70, #73–74, #80, #97; ayrıca panelden henüz verilemeyen kararlar (REA/beceri kararları yalnız API'den).

## Yusuf'a kalan adımlar
1. **`D:\Programlar\AgentMom-giris\codex-sandbox-daralt.bat`** çift tıkla → UAC Evet → E (`D:\YusufII` üzerindeki geniş yazma hakkını yalnız `Projeler`'e daraltır); sonra bana "daralttım" de, doğrulamayı çalıştırayım. İstemezse: `codex-sandbox-geri-al.bat`.
2. **Gemini kararı:** beklemede (yürütme kapalı). Açılacaksa: Antigravity araştırması mı, API anahtarı mı (şu an yasak) yoksa bırakmak mı.
3. **Yedek düzeni:** düzenli yedek için zamanlayıcı kurmak ister misin (günde bir `npm run yedek -- yedekle`); eski yedekleri temizleme kararı sende (Geri Dönüşüm Kutusu).
4. **Elle çalıştırma:** `npm start` → `npm run agentmom -- ui`; işletim el kitabı `docs/isletim-el-kitabi.md`.
5. İzin/politika genişletmeleri (yeni klasör, ücretli rota, API anahtarı) yalnız senin kararınla `user-config.json` üzerinden yapılır.
