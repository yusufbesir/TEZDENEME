# Durum (2026-10-21)
Faz 10 (Yusuf talimatı): Komuta Paneli Claude masaüstü görünümüne dönüştürüldü (3 sütun, koyu tema, satır içi izin kartı, telefonda tek sütun) ve `npm run agentmom` etkileşimli oturum oldu; REA + alt ajanlara bölme (Haiku/Sonnet/Sonnet/Opus); "falldown olmasın" (sessiz geri düşme yok, arayüz çökmez); 359/359; `docs/testing/faz10-test-sonucu.md`, ADR-011.
Faz 8 (M1 #1 çekirdeği) eklendi: yerel Türkçe Komuta Paneli (`/`, belirteç URL parçasında) + `npm run agentmom -- durum|gorevler|onay|borc|kararlar|ui`; `docs/testing/faz8-test-sonucu.md`, ADR-009, 338/338.
Faz 7 (M14 küçük dilim) eklendi: karar son kullanma + varsayım borcu defteri, güven kalibrasyonu; `docs/testing/faz7-test-sonucu.md`, ADR-008, 334/334. Codex sandbox kuruldu; `D:\YusufII` kökünde geniş yazma girdisi var (daraltma betiği hazır, Yusuf kararı bekliyor).
Faz 6 (REA, M6 küçük dilim) eklendi: kaynak kaydı, bulgu→öneri, onay iş akışı, politika sınırı; `docs/testing/faz6-test-sonucu.md`, ADR-007, 320/320. Karar (Yusuf, 18:23): Gemini beklemede; Codex sandbox kurulumu onaylı (hazırlık sürüyor).
Faz: 5 — (a) gerçek çok adımlı iş akışı denemesi (Claude→Codex→Beyin Verify), (b) bellek (FTS5 + Obsidian dışa aktarma), (c) beceri yaşam döngüsü iskeleti. Ayrıntı: `docs/testing/faz5-test-sonucu.md`, karar: ADR-006. Faz 4 ve öncesi aşağıda.

## Çalışan (çalıştırılarak kanıtlandı)
- **Faz 1–3:** çekirdek, kimlik doğrulama, Credential Manager, sağlayıcı sözleşmesi + adaptörler, görev yürütme dilimi, iş akışı (planla → uygula → inceleme → doğrula), kurtarma, yeniden deneme, devir, ≤3 eşzamanlılık, kapsam çakışma tespiti.
- **Yetki/yol politikası (Yusuf kararı 17:06):** üç sağlayıcı aynı yetki katmanında; kullanıcı yapılandırması `D:\YusufII\Projeler\agentmom-config\user-config.json` (ajanların çalıştığı ağaçlardan ayrı; o ağaçlarda bulunursa sunucu başlamaz): güvenilen kök `D:/YusufII/Projeler`, `forbiddenDirs: D:/Arşiv` (HEDEF olarak hepsi için kapalı; Codex'in OKUMASI engellenemez), ücretli rota kapalı, `file.write` ve `shell.exec` kullanıcı onayı ister.
- **Ortak doğrulama şeması (sürüm 1)** + deterministik başarısızlık sınıflandırması (product_defect / environment / flaky / infra).
- **Yerel test koşucusu:** `node --test`, JUnit → şema; her dosya kendi süreci; çıkış kodu tutarlılığı; zaman aşımı; iptal; flaky için tek yeniden deneme; Node izin modeli (yalnız çalışma alanını okur, yalnız scratch'e yazar, süreç/symlink yok); symlink/junction/hard link taraması.
- **Tarayıcı sağlayıcısı:** kurulu Edge + `playwright-core` (D:), ayrı süreç, bildirimsel senaryo, yalnız 127.0.0.1, dış istek/WebSocket/service worker engelli, ekran görüntüsü kanıtı (D:, SHA-256).
- **İzlenebilirlik:** kriter kimliği → test (`[ac:id]`); eşlemesiz kriter `unverified` + zayıf test uyarısı; etiket şişirme engeli; kendi yazdığı test uyarısı / `requireTrustedTests`.
- **Kanıt tamlık denetimi** ve **bağımsız teslim denetçisi** (passed / failed / unverified; ham sonuç ve dosyalardan karar verir).
- **Tek onarım koordinatörü:** yalnız ilk ürün hatası implement'e döner; en çok 2 tur (sert üst sınır 3); unverified / ortam / altyapı / flaky onarılmaz; plan tekrarlanmaz.
- Uçlar: sözleşmede `verification` planı, `GET /api/tasks/:id/delivery`.
- **Test:** `npm test` 269/269; `npm run typecheck` temiz. Ayrıntı: `docs/testing/faz4-test-sonucu.md`, karar: ADR-005.

## Doğrulanmayan / eksik
- İş akışı gerçek modellerle bir kez denendi (Faz 5a, 5 çağrı, 221k giriş token); tek küçük görev, genelleme yok. **Girişler:** Claude Code girişli (abonelik `claude.ai`/max; gerçek tek çağrı başarılı, olay şeması doğrulandı, kapasite `partial`); Codex girişli (ChatGPT hesabı); **Gemini girişi yapıldı ama Google istemciyi bireysel hesaplar için kapattı** (`IneligibleTierError UNSUPPORTED_CLIENT`, Antigravity'ye geçiş); Gemini yürütmesi kapalı (Yusuf kararı bekliyor). API anahtarı hiçbir sağlayıcıda kullanılmıyor (ortamda tanımlı değil, çocuk süreçlere geçmiyor).
- Node izin modeli sert sandbox değil, **ağı kısıtlamaz**. Docker bilinçli olarak ertelendi (Yusuf, 2026-10-21). Elevated Windows sandbox (Codex) **ertelendi**: UAC + makine genelinde hesap/güvenlik duvarı/ACL; plan ve geri alma kasada.
- Yalnız Node test koşucusu; başka dil/çerçeve yok. Tarayıcı kapsamı küçük bildirimsel senaryolar (görsel kalite, erişilebilirlik, piksel karşılaştırma yok).
- Doğrulama, ajanın yazdığı test kalitesine bağlı; kısmen hafifletildi (etiket sınırı, uyarı, `requireTrustedTests`).
- Windows belirteç dosyası izinleri uygulanmıyor (ACL onayı). `spentUsd` canlı değil. Arayüz ve terminal komutu yok. Aynı DB'ye iki sunucu süreci kilidi yok.

## Açık riskler / Yusuf kararı gerekenler
1. Codex salt-okunur kipi dizin kısıtlı değil: elevated sandbox için UAC adımı ve onay (kasa notu: ne oluşturur, nasıl geri alınır). Şimdilik güvenilen kök + `D:/Arşiv` yasağı.
2. Gemini girişinin tamamlanması (`D:\Programlar\AgentMom-giris\gemini-giris.bat`: "Login with Google", API anahtarı girme); sonra tek küçük çağrıyla yeniden denenir.
3. Ücretli rota / API anahtarı: kapalı, onay gerekir.
4. Temizlik: D: ve C: AgentMom test artıkları bu turda Geri Dönüşüm Kutusu'na taşındı (C:'de 100 dizin, onaylı); `data/test-tmp` her test çalıştırmasında yeniden oluşur.

## Sonraki
Girişler yapılınca gerçek doğrulama çağrıları; Faz 5 adayları: yaşayan dokümantasyon, bilgi/hafıza (M7), beceri (M9), görsel kalite ve erişilebilirlik laboratuvarı (M11), elevated sandbox (onaya bağlı).


## Faz 5 eklemesi
- Gerçek bulgular: Codex ilk incelemede yanlış pozitif verdi; Claude onarımda dosyayı değiştirmeden değiştirdim dedi (git diff yakaladı). Karar verici = testler + git kanıtı, model beyanı değil.
- Bekleyen kararlar: Gemini (bırak/Antigravity araştır), elevated sandbox (UAC+ACL onayı).
- Not: kullanıcı yapılandırmasına `kasa/notlar` (izin) ve `anahtarlar` (yasak) eklendi.

## Faz 11 · Dilim 1 (2026-10-22) [İP:AgentMom Faz 11]
- Masaüstü uygulaması kabuğu çalışıyor: Edge uygulama kipi penceresi, özgün simge, tek-örnek, düzgün kapanış, belirteçsiz açılış (tek kullanımlık bilet). Kurulu: `D:\Programlar\AgentMom\`. Ayrıntı ve kanıt: `docs/testing/faz11-dilim1.md`; eğitim belgesi: `docs/egitim/masaustu-ajan-uygulamalari.md`.
- Kalıcı silmeyi koda bağlama: Yusuf iptal etti (2026-10-22 07:48); çalışma `beklemede/faz11-silme-yasagi` dalında, ana dalda değil. Kural yalnız davranışsal.
- Sıradaki: dilim 2 (3 sütunlu masaüstü arayüz, Ayarlar/Yardım, sol menü, sağ panel, kullanıcı menüsü, kullanım halkası).

## Faz 11 · Dilim 2 (2026-10-22) [İP:AgentMom Faz 11]
- Masaüstü arayüzü yeniden yapıldı: orta bölüm sohbet akışı; sol menü (kullanıcı adlı alt oturumlar + gerçek model rozeti), sağ Genel bakış paneli, Ayarlar (+ Yardım: eğitim belgesi), Proje ayarları › Kullanım, bağlam halkası, Ctrl+K, kullanıcı menüsü, açık/koyu tema. 581/581 test; bağımsız güvenlik denetimi geçti. Ayrıntı: `docs/testing/faz11-dilim2.md`, karşılaştırma: `docs/testing/faz11/orta-bolum-karsilastirma.md`.
- Kalıcı silme koda bağlanmadı (Yusuf'un kararı); iş `beklemede/faz11-silme-yasagi` dalında.
