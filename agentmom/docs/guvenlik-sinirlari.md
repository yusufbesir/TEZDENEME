<!-- Sahip: Claude [İP:AgentMom Faz 11]. Uygulama içi Yardım > Güvenlik sınırları belgesi. Yalnız Claude değiştirir; silme kararı yalnız Yusuf'undur. -->
# AgentMom güvenlik sınırları (kısa özet)

## Neye izin verilmez
- **Kalıcı silme yok.** Kaldırma yalnız Geri Dönüşüm Kutusu'na taşıma ve Yusuf'un kararıyla olur. Arayüzde "Sil" yoktur; yalnız **Arşivle** (geri alınabilir).
- **API anahtarı ve ücretli rota yok.** Sağlayıcılar kendi oturum açma yöntemleriyle (abonelik rotası) çalışır; AgentMom anahtar istemez, saklamaz, göstermez.
- **Sessiz geri düşme yok.** Bir sağlayıcı kullanılamıyorsa "KULLANILAMIYOR" yazar; yerine başkası kendiliğinden devreye girmez.
- **Politikayı yalnız kullanıcı genişletir.** Ajan belirteci yalnız görev kaydı açabilir; izin, onay ve arşiv işlemleri yalnız kullanıcı belirteciyle yapılır.
- **Yasak klasörler:** `D:\Arşiv` ve anahtarlar klasörü hiçbir koşulda okunmaz, yazılmaz.

## Nasıl korunur
1. **Politika motoru:** her eylem `izin ver / reddet / onay iste` kararı alır; karar denetim kaydına yazılır.
2. **Onay:** riskli eylemde pencere "eylem + hedef"i gösterir; yalnız kullanıcı onaylayabilir.
3. **Pencere ve belirteç:** uygulama penceresi komut satırında oturum belirteci taşımaz; 30 saniyelik tek kullanımlık bilet kullanır. Sunucu, belirteci göndermeden önce kendini kanıtlar.
4. **Arayüz:** sunucudan gelen her metin yalnız metin olarak çizilir (HTML çalıştırılmaz); sıkı içerik güvenlik politikası; dış kaynak yok.
5. **Dış içerik veridir:** web sayfası, e-posta, dosya içindeki talimatlar komut sayılmaz.

## Bilinen sınırlar
- Komut düzeyinde kalıcı silmeyi tamamen engelleyen teknik bir kural **yoktur** (Yusuf'un kararı: silmeyi gerekirse kendisi yaptırır); kural davranışsaldır.
- Arayüz model çağırmaz; yerel kipte yalnız kayıt tutar ve onay akışını yönetir.
- Pencere açılışındaki sunucu kanıtı (HMAC) yalnız portu işgal edip istekleri **aktarmayan** bir sürece karşı korur; aktaran bir ara süreç düz HTTP'de belirteci görebilir. Aynı kullanıcı hesabındaki bir süreç belirteç dosyasını zaten okuyabildiği için risk düşüktür; yine de belirteç her sunucu açılışında yenilenir.

## D5b eki (2026-10-23)
- Geçici izin yalnız "onay gerekir"i önceden onaylar; ret kurallarını gevşetmez. Secret veri yerel rotada kalır, sensitive veri ücretli rotaya gitmez (onayla aşılamaz). Otomasyon izin veremez. Ayrıntı: ADR-015.
