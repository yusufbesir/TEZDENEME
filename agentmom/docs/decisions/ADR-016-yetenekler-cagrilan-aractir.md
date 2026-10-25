<!-- Sahip: Claude [İP:AgentMom Faz 11]. Karar kaydı; değişiklik yalnız ekleme. Silme kararı yalnız Yusuf'undur. -->
# ADR-016: Yetenekler kendiliğinden çalışmaz; çağrılan araçlardır
Durum: kabul (2026-10-23, Yusuf: "bu özelliklerin kullanılması için zaten program içindeki model başvuracak, özellik kendi kendine çalışmaz. Kullanıcı o özelliği ilgilendiren bir istek istediğinde ya da zamanlanmış bir görev ayarladığında kullanılır. Kendi kendine kullanılabilen özellik yok.").

## Karar
- AgentMom'un 100 yeteneği özerk arka plan ajanları DEĞİLDİR. Her yetenek, yalnız şu üç yoldan biriyle ÇAĞRILAN bir araç/motordur:
  1. **Kullanıcı isteği:** kullanıcı arayüzden (düğme/form/komut paleti) ya da sohbette bir istek yazar.
  2. **Model aracı:** kullanıcı isteğini yanıtlayan uygulama içi model (mevcut sağlayıcı adaptörü, abonelik rotası) yetenek kataloğundan bir araç çağrısı ister; AgentMom çağrıyı politika motorundan, veri sınırından ve denetim kaydından geçirip çalıştırır.
  3. **Zamanlanmış görev:** kullanıcının kurduğu (kuralı yalnız kullanıcı oluşturur) zaman tetikleyicili görev; yedeği kullanıma göre başlatan denetimli zamanlayıcı gibi onaylı yollar da bu sınıftadır.
- **Kendiliğinden tetiklenme YOK:** hiçbir yetenek kendi başına başlamaz, kendiliğinden kayıt/karar/dosya yazmaz. Örtük bilgi çıkarıcı, çelişki çözücü, dikkat bütçesi vb. yalnız ÖNERİ üretir; uygulama kullanıcı onayıyla yapılır.
- **Model yeteneklerinin** (müzakere, çözüm uzayı, fikir aktarımı, tersine çevirme, ortaya çıkan davranış, strateji, niyet çözme) çalıştırılması yalnız mevcut sağlayıcı adaptöründen olur: abonelik rotası (ücretli rota/API anahtarı kapalı), salt-okunur sandbox, veri sınırı kuralları, onay ve bütçe, denetim kaydı. Model çıktısı GÜVENİLMEZ VERİDİR (enjeksiyon savunması: talimat olarak yürütülmez, katalog dışı araç çağrısı reddedilir, çıktı şemaya göre doğrulanır). Sağlayıcı yoksa/kapalıysa dürüstçe "kullanılamıyor" döner; yer tutucu yoktur.
- **Yetenek kataloğu (madde 99, iç yetenek aracısı):** her yetenek ad, açıklama, girdi/çıktı şeması, `salt okunur / yan etkili` işareti, `nasıl çağrılır` alanı (kullanıcı isteği / model aracı / zamanlanmış görev) ve işleyiciyle kayıtlıdır. Salt-okunur araçlar model tarafından onaysız çağrılabilir (politika yine değerlendirir); yan etkili araçlar onay ister. Kontrol listesine ve yetenek kayıt defterine "nasıl çağrılır" alanı eklenir.
- **Zamanlanmış görev (madde 13 genişlemesi):** olay tetikleyicisine zaman tetikleyicisi eklenir; zamanlanan şey katalog yeteneği ya da model görevidir. Her çalışma politika/onay/bütçe/denetimden geçer. Kullanıcı yokken onay gerektiren adım beklemede kalır, sessiz yürütme yoktur.

## Sonuçlar
- Mevcut analitik uçlar (D7, D8a, D8b) bu ilkeye uygundur: yan etkisizdir, yalnız kullanıcı belirteciyle çağrılır, kendiliğinden tetiklenmez. D8c'de aynı işleyiciler kataloğa kaydedilerek modele de açılır.
- Önceki kararlarla ilişki: ADR-014 (Jev/REA kapsam dışı), ADR-015 (geçici izin, veri sınırı, otomasyon). Yetenek çağrıları ADR-015'teki kuralları aşmaz: hiçbir yetenek izin veremez.
