<!-- Sahip: Claude [İP:AgentMom Faz 11]. Dilim 3 (tek ekran + §14 navigasyon) test ve süreç kaydı; yalnız ekleme. Ekran görüntüleri gerçek veriyle alındı (fixture yok). -->
# Faz 11 · Dilim 3: tek ekran, §14 ana navigasyon, sağlayıcı detayı (2026-10-22)

## Ne yapıldı
- **Tek pencere, iki durumlu orta alan:** `AM.view.page === "chat"` sohbet; aksi halde `#pageView` (pages.js çerçevesi). Sol menü Claude masaüstü stilinde: Yeni + Ara + katlanır **Yönetim** grubu (13 sayfa) + kullanıcı adlı alt oturumlar + kullanıcı satırı.
- **13 sayfa (gerçek veri, dürüst etiketler):** Genel Bakış · Projeler · Görevler ve İş Akışları · AI Bağlantıları ve Sağlayıcılar (liste + DETAY) · Modeller ve Ajanlar · Entegrasyonlar ve Yetenekler (100 yetenek tablosu, dilim planı, sağlayıcı kayıt defteri) · Beceriler · Araştırma ve REA · Hafıza ve Bilgi · Beyin Verify · Kullanım ve Maliyetler · Güvenlik ve Yetkiler · Denetim Kayıtları. Ayarlar modal kalır. Yetenekler 100 üst menü yapılmadı; ilgili sayfanın içinde.
- **Sağlayıcı detay sayfası (§14):** bağlantı durumu, yetkilendirme yöntemi, yetenek tablosu (durum + kanıt + tarih; kullanılabilir olmayan kullanılabilir gibi gösterilmez), modeller, sağlık, izinler, kullanım/fatura yolu (abonelik; ücretli rota kapalı), limitler ("Bilinmiyor: sağlayıcı bildirmedi"), son başarılı işlem, sürüm, bilinen sınırlar (belge), son hatalar; **Test** (yerel, model çağrısı yok), **Devre dışı bırak/Etkinleştir** (fail-closed: devre dışı sağlayıcı hiçbir yürütme yolunda çalışmaz, yerine başkası girmez); Yeniden bağlan/Güncelle/Bağlantıyı kes: komut ÇALIŞTIRMAZ, açıklama + kopyalanabilir komut.
- **Sunucu:** migrasyon 012 `provider_state` (silinemez), `GET /api/providers/:id`, `POST /api/providers/:id/test|disable|enable`, `GET /api/workflows`, `GET /api/verification/runs`, `GET /api/capabilities` (docs/status/100-yetenek-durum.json), `/api/help` listesine claude-code/codex/gemini/yetenekler. Çekirdekte beyaz listeli genel `loadData` (modüller ağ isteği yapmaz) ve `providerAction`.

## Test
`npx tsc --noEmit` temiz; `npm test`: **786 test, 786 geçti**. Yeni: pages (46), page-providers (53), page-more (63), providers-api (11), sidebar gezinme (2); rota listesi 43 sabit dosya. Gerçek Edge ile 13 sayfa ve sağlayıcı detayı: yatay taşma 0, konsol hatası 0 (320–1440 px).
Ekranlar: `docs/testing/faz11/d3-*.png`.

## Açık / dürüst notlar
- Sır-referans listesi (23) ve tek-sahip yetki modeli (31) D3b ile Güvenlik sayfasına eklendi. Sır değerleri zaten hiçbir sayfada gösterilmez.
- Sayfaların bazıları ince ya da salt okunur (Projeler tek proje; Beyin Verify yalnız kayıt listesi). Çerçevenin sayfa başlığı ile bazı sayfaların kendi başlığı çift görünüyor (görsel, işlev etkilenmez).
- `lastSuccess` iş akışı adımlarını kapsamaz (iş akışları `run.finished` yazmıyor); devre dışı sağlayıcı hata metni "kayıtlı değil" der, "devre dışı" demez (kod doğru: `unknown_provider`); yeniden başlatmada test sonucu adaptörün başlangıç durumuna döner.
- OpenCode/Cursor/Antigravity: kuruldu, adaptör YOK (Planlı, D10).

## Bağımsız güvenlik denetimi (Opus, salt okunur): Geçti, kritik/yüksek yok
Bulgular ve işlem: (1) [orta] yedeğe geçişte devre dışı sağlayıcının rota bilgisi düşüp `provider.switch` denetimi atlanıyordu → `registeredAdapter` ile düzeltildi; (2) [düşük] devre dışı bırakma süren koşuda yalnız yeni çözümlemede etkiliydi → her deneme öncesi `isDisabled` denetimi eklendi (fail-closed); (3) test ucu zaman aşımı adaptörü iptal etmiyor (en çok 40 sn süreç, sağlayıcı başına 15 sn hız sınırı) → kabul edildi, belgelendi; (4) ham bidi/görünmez karakterler düzenli ifadelerde (semgrep) → 9 dosyada `\uXXXX` kaçışına çevrildi; (5) `/api/help/<ad>` düz nesne araması → `Object.hasOwn`; (6) "not registered" mesajı → devre dışıysa "disabled by the user"; (7) `loadData` parametreli anahtar birikimi → aynı adın en yeni 12 anahtarı. gitleaks: yalnız test içindeki sahte örnekler. Son test: **786/786**.
