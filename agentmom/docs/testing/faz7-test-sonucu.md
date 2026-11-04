<!-- Sahip: Claude [İP:AgentMom Faz 7]. Faz 7 (M14 küçük dilim) test sonucu. Değişiklik: yalnız ekleme/düzeltme. -->
# Faz 7 test sonucu (2026-10-21): karar/varsayım defteri + güven kalibrasyonu
Tam paket **334/334 geçti**, tsc temiz (`faz7-test-ciktisi.txt`). Karar ve kapsam seçimi: ADR-008 (yetenek matrisinden: #67, #69, #68).

## Ne var
- **Karar son kullanma sözleşmesi (#69):** her karar gelecekte bir tarihte (en çok 366 gün) sona erer; hafıza kaydına geçerlilik tarihi olarak yazılır (geri çağrı süresi dolmuş kararı bayraklar); yerine geçen/emekli karar hafıza geri çağrısından çıkar.
- **Varsayım borcu defteri (#67):** karar varsayımları kontrol tarihiyle taşır; `unvalidated → holds|broken` yalnız kanıtlı, kayıtlı olayla; **ajan yalnız "broken" bildirebilir, "holds" yalnız kullanıcı**. İnceleme durumu hesaplanır (`review_due`, `at_risk`); borç listesi kırık → gecikmiş → bekleyen.
- **Güven kalibrasyonu (#68):** tahmin önceden, gelecek bir kontrol tarihiyle ve değişmez güvenle kaydedilir; çözümü yalnız kullanıcı; Brier, 5 kova, güven−doğruluk farkı; **az veri "iyi kalibre" demek değildir**; çözülmemiş gecikmiş tahmin payı yüksekse `biased_sample` (yalnız iyi sonuçlar işlenerek sahte kalibrasyon yapılamaz).
- Salt-ekleme SQL tetikleyicileri (içerik, güven, geçmiş değişmez; silme yok; doğuş durumu zorunlu; durum değişimi eşleşen olay ister). Kullanıcı-yalnız HTTP uçları: `/api/decisions`, `/api/assumptions/:id`, `/api/assumption-debt`, `/api/predictions`, `/api/calibration`.
- Model, internet, dosya erişimi, politika değişikliği YOK (kaynak testi sabitler).

## Gerçek küçük deneme (`scripts/e2e-reasoning-demo.sh`, çıktı `faz7-demo-ciktisi.txt`)
Bu projenin gerçek kararları ve ölçümleri deftere işlendi (izole durum klasörü): Docker ertelendi, Gemini beklemede, Codex sandbox kuruldu, tek inceleyiciye güvenilmez. Gerçek ölçümler kanıt olarak varsayımlara bağlandı: **"Elevated sandbox yazma kapsamını yalnız Projeler ile sınırlar" = KIRIK** (kanıt: `D:\YusufII` kökünde Modify), **"Codex incelemesi aynı girdide kararlı" = KIRIK** (kanıt: aynı blob önce reddedildi, sonra onaylandı), "sandbox anahtarları okuyamaz" = geçerli. Borç listesi kırıkları en üstte gösterdi; tahmin yokken kalibrasyon raporu `insufficient_data` dedi.

## Bağımsız güvenlik denetimi (guvenlik-denetcisi, Sonnet) — GEÇTİ (kritik/yüksek yok), orta ×5 + düşük düzeltildi
(1) Emekli/yerine geçen kararın hafıza kaydı canlı kalıyordu → kapatılıyor. (2) Aynı sözcüklü ikinci karar hafızada ilk kayda çöküyordu → karar kimliği gövdeye eklendi. (3) Doğrudan SQL ile olaysız `holds` → tetikleyici: durum değişimi eşleşen olay ve gerçek `from` ister. (4) Modül düzeyinde aktör denetimi yoktu → karar kaydı/yerine geçme yalnız kullanıcı, tahmine `recorded_by`. (5) `dueAt` üst sınırsızdı, yanlılık uyarısı hükmü düşürmüyordu → ≤366 gün, `biased_sample`. Düşük: katı ISO tarih (2026-02-30 vb. reddedilir), scope/source doğrulama+maskeleme, kanıt uzunluğu maskeleme sonrası, `POST /decisions/:id` 404. Kabul edilen: çok süreçli yarış (tek süreç kullanım), demo betiğinde belirteç curl argümanında (yerel döngü, dosyaya yazılmaz). SAVEPOINT iç içe hata yolu için test eklendi.
