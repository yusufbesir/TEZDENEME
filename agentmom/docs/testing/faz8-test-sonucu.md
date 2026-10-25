<!-- Sahip: Claude [İP:AgentMom Faz 8]. Faz 8 (M1 #1 çekirdeği) test sonucu. Değişiklik: yalnız ekleme/düzeltme. -->
# Faz 8 test sonucu (2026-10-21): yerel Komuta Paneli + terminal komutu
Tam paket **338/338 geçti**, tsc temiz (`faz8-test-ciktisi.txt`). Karar: ADR-009. Docker, dış paket, model çağrısı, internet YOK.

## Ne var
- **Panel** (`/`, aynı sunucudan, yalnızca 127.0.0.1): sağlık, onay kuyruğu (onayla/reddet), varsayım borcu, incelemesi gereken kararlar, kullanıcı kararı bekleyen REA önerileri, onay bekleyen beceriler, görevler, sağlayıcılar; Türkçe, açık/koyu tema, telefon genişliği. Ekran görüntüleri: `faz8-panel-masaustu.png`, `faz8-panel-telefon-koyu.png` (gerçek veriyle, Edge).
- **Terminal:** `npm run agentmom -- durum | gorevler | onay | borc | kararlar | ui`.
- Eylem yüzeyi yalnız görev onayı/reddi; her eylem eylem+hedef+başlığı gösteren bir onay penceresinden geçer.

## Kanıt
- **Gerçek Edge testi:** belirteç URL parçasından sekmeye alınır ve adres çubuğundan silinir (açık sekmede `hashchange` ile de); `localStorage`/çerez boş; ajan kaynaklı `<img onerror>` başlığı düz metin kalır (`window.__pwned` tanımsız); onayla ve reddet çalışır ve denetim kaydında `user` olarak görünür; onay penceresi iptal edilince hiçbir şey değişmez; çift yönlü (RLO) karakter ve satır sonu temizlenir; yanlış belirteç girişe döner; sayfa dışına tek istek yok. Test sırasında bulunan ve düzeltilen gerçek hata: panel açıkken `ui` komutu yalnızca parçayı değiştirince belirteç yakalanmıyordu. CSP'nin `unsafe-eval` yasağı da gerçek tarayıcıda doğrulandı (Playwright'ın dize-eval yöntemi engellendi).
- **Başlıklar ve yollar:** 3 sabit yol; `/ui`, `/ui/`, `..`, `%2e%2e`, `/package.json`, `//etc/passwd` → 404; POST → 404; yanlış Host/Origin → 403; `/api` belirteçsiz 401. Kaynak testi: satır içi betik/stil/olay yok, tehlikeli DOM kalıpları yok, dış URL yok.
- **CLI:** durum/görev/onay/borç/karar çıktıları; belirteç hiçbir çıktıya yazılmaz; `ui` yalnız URL parçasıyla açar; loopback dışı ve `127.0.0.1.evil` adresleri reddedilir; yanlış/kısa/okunamayan belirteç, bağlantı hatası, bilinmeyen komut düzgün çıkış kodu; terminal kaçış dizileri temizlenir.

## Bağımsız güvenlik denetimi (guvenlik-denetcisi, Sonnet) — GEÇTİ (kritik/yüksek yok)
Orta ×2: (1) onay penceresi yalnız başlığı gösteriyordu, başlık ajan kontrollüdür → eylem ve hedef de gösterilir, görünmez/çift yönlü karakterler temizlenir; (2) liste yenilemesi → pencere sayfayı bloke eder (zamanlayıcı çalışmaz) ve imleç/odak onay kuyruğundayken yenileme duraklar. Düşük düzeltilen: CLI 10 sn zaman aşımı, `Object.hasOwn` ile sözlük araması. Kabul edilen: belirteç `cmd start` süreç argümanında kısa süre görünür (yerel kullanıcı bağlamı); `AGENTMOM_URL` ile loopback'te başka porta gidebilir (yerel kötü niyetli süreç gerekir); JSON yanıtlarında `nosniff` yok (içerik türü JSON). Test boşlukları kapatıldı (iptal yolu, deny, bidi/satır sonu); yenileme sırasında DOM kayması ve tarayıcı geçmişinde belirteç testi yapılmadı (belgelendi).
