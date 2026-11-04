<!-- Sahip: Claude [İP:AgentMom Faz 11]. Dilim 2 test ve süreç kaydı; yalnız ekleme. Ekran görüntülerindeki "örnek veri" fixture'dır (gerçek veritabanına yazılmadı). -->
# Faz 11 · Dilim 2: masaüstü arayüzü (2026-10-22)

## Ne yapıldı
- **Orta bölüm artık sohbet akışı** (durum panosu kalktı; içerik sağ "Genel bakış" paneline taşındı). Üç sütun: sol menü · sohbet · sağ panel.
- Yeni modüller (her biri kendi dosyasında, `window.AM_*` sözleşmesiyle): `chat`, `sidebar`+`usermenu`, `panel`, `settings`+`help`+`usage` (Ayarlar, Yardım bölümü, Proje ayarları › Kullanım), `shell`+`palette`+`ring` (Ctrl+K, kısayollar, yeniden boyutlandırma, bağlam halkası), `safe` (güvenli markdown, durum gruplama, onay penceresi, ad temizleme), `icons`, `prefs`, `tokens.css` (koyu+açık tema).
- Sunucu: alt oturumlar (kullanıcının verdiği ad, sistemin yazdığı gerçek model, ad geçmişi, arşiv; silme yok), kullanım ve bağlam API'si (bilinmeyen = `null`, uydurma yok), `/api/help/<ad>` (sabit belge listesi), `/api/policy` (salt okunur özet), pencere kanıtı `/desktop/proof`.
- REA arayüz haritası: `docs/egitim/claude-masaustu-arayuz-haritasi.md` (11 bulgu AgentMom REA akışına kaydedildi). Antigravity, Cursor, OpenCode kurulup tarandı (`docs/testing/faz11/kurulum-kaydi.md`, eğitim belgesinin 11–15. bölümleri).

## Ekran görüntüleri (yalnız AgentMom penceresi)
`uygulama-penceresi-masaustu.png`, `uygulama-penceresi-dar.png` (gerçek uygulama penceresi, gerçek veri), `ui-masaustu*.png` ve `ui-dar*.png` (Edge, örnek veri). Referansla yan yana karşılaştırma: kasada; tablo: `orta-bolum-karsilastirma.md`.

## Testler
`npx tsc --noEmit` temiz. `npm test`: **581 test, 581 geçti, 0 todo**. Yeni: arayüz modül testleri (safe 21, chat 28, sidebar 18, panel 33, settings 50, shell 42), `ui-desktop.test.ts` (gerçek Edge: belirteç adres çubuğundan silinir, XSS yükü etkisiz, onay penceresi gerçek eylem+hedefi gösterir, sahte nesne onaylayamaz, 9 genişlikte taşma yok, eksik betik/sunucu hatasında okunur kart), `subsessions.test.ts` (12), bilet/kanıt/başlatıcı testleri.

## Bağımsız denetimler
- **Güvenlik (Opus, salt okunur): Geçti (koşullu), yüksek/kritik yok.** Düzeltilenler: B1 tarayıcı testleri yeni arayüze taşındı; B3 onay penceresi ayrıntısı ham metin; B4 yardım belgesi başlık yorumu; B5 `setView` doğrulamasız yedek yol kaldırıldı; B6 oltalama bağlantısı (metin≠adres) düz metne çevrilir; B2 (kanıtın aktarmaya karşı sınırı) `docs/guvenlik-sinirlari.md`'ye yazıldı. gitleaks: 2 bulgu = test içindeki sahte örnek; semgrep: yalnız çift yönlü karakterleri temizleyen kasıtlı düzenli ifadeler.
- Test yazımı sırasında ortaya çıkan 3 gerçek hata düzeltildi: eksik modül hata kartının veri yenilemesiyle silinmesi, core.js hiç yüklenmezse boş sayfa (artık "yükleniyor/yenileyin" notu), sohbet ve panelin KULLANILAMIYOR kuralının çelişmesi.

## Sınırlar / açık işler
- Düşünme blokları, mesaj eylemleri (kopyala/yeniden dene/düzenle), `@` anma, akış (streaming) yok; dosya yükleme yok (ek çipi yalnız gösterge).
- Kullanım verisi yalnız kalıcı kayıtlardan (token, kod değişikliği); önbellek yazma/okuma ve model adı bazı kayıtlarda tutulmuyor → `—`/"veri yok".
- Antigravity ve Cursor'un ana arayüzü giriş duvarı nedeniyle görülemedi (yalnız dosya yapısı); OpenCode görüldü.
- Eski `src/server/ui/feed.js` (Faz 10) artık sunulmuyor ama diskte duruyor; kaldırma kararı Yusuf'un (Geri Dönüşüm Kutusu).
- `masaustu/AgentMom.vbs` kurulu kopyası eski sürümle aynı; başlatıcı kodu proje klasöründen çalışır.
