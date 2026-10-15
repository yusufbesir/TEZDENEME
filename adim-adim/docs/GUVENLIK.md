# Güvenlik incelemesi ve kararlar

İz etiketi: [İP:Adım Adım öğrenme uygulaması#Dwv81f] · Tarih: 2026-10-15

## Özet
- Bağımsız güvenlik denetçisi (claude-sonnet-5-5) 14 bulgu verdi: 1 yüksek, 6 orta, 6 düşük, 1 bilgi. Yüksek ve orta bulguların hepsi bu sürümde ele alındı; biri (zaman dilimi) belgelenmiş sınırlama olarak kaldı.
- Uygulama ağ isteği yapmaz; yayın (release) manifestinde İnternet izni yok. Kullanıcı girdisi hiçbir yerde kod, HTML ya da düzenli ifade olarak yorumlanmaz.

## Bulgular ve yapılanlar
| Önem | Bulgu | Karar |
|---|---|---|
| Yüksek | Android 13+ bildirim izni manifestte ve kodda yoktu | POST_NOTIFICATIONS eklendi; hatırlatma açılırken izin istenir, reddedilirse anahtar kapanır ve kullanıcı uyarılır |
| Orta | Bulut yedeği açık; "veri yalnızca cihazda" sözüyle çelişiyordu | allowBackup=false ve data_extraction_rules ile yedek ve cihaz aktarımı kapatıldı |
| Orta | Bozuk veri dosyası sessizce eziliyor, kayıt hatası yutuluyordu | Bozuk dosya `.bozuk-<tarih>` ekiyle kenara alınır (silinmez); kayıt hatasında kullanıcıya uyarı gösterilir |
| Orta | Eşzamanlı kayıtlar aynı geçici dosyayı paylaşıyordu | Yazmalar kuyruğa alındı; Windows'ta reddedilen yeniden adlandırma bir kez yinelenir |
| Orta | Hatırlatma saati UTC'ye çevrilerek kuruluyor; yaz/kış saati geçişinde 1 saat kayabilir | Uygulama her açılışta yeniden zamanlar; tam çözüm için yerel zaman dilimi paketi gerekir, sonraki sürüme bırakıldı |
| Orta | Cihaz yeniden başlayınca hatırlatma kayboluyordu | RECEIVE_BOOT_COMPLETED ve bildirim alıcıları eklendi |
| Orta | Yazı tipi lisans metinleri ve lisans sayfası yoktu | OFL metinleri assets/fonts altına eklendi, Ayarlar'da Lisanslar sayfası açıldı |
| Düşük | Tarih ve saat denetimi yalnızca biçimseldi; sayaçlarda üst sınır yoktu | Takvim denetimi (2000-2100, gerçek gün), saat 00-23/00-59, sayaç üst sınırı eklendi |
| Düşük | Kullanıcı adında kontrol ve çift yönlü Unicode karakterleri filtrelenmiyordu | Kaydetmeden önce ayıklanır ve 40 karaktere kırpılır |
| Düşük | Sembolik bağ ve okuma sırasında büyüyen dosya denetimi yoktu | Bağ reddedilir; okunan bayt sayısı da sınırlanır |
| Düşük | Ses hatası sessizce yutuluyordu | Dinleme alıştırmasında bir kez uyarı gösterilir ve cümle yazılı verilir |
| Düşük | Kullanılmayan paketler (drift, sqlite3_flutter_libs, shared_preferences) | Kaldırıldı |

## Doğrulanamayanlar
- Paket sürümleri için güncel güvenlik duyuruları bu ortamda pub.dev'e erişilemediği için denetlenemedi. İnternetli bir ortamda `dart pub outdated` ve bağımlılık duyuruları ayrıca kontrol edilmeli.
- Gerçek cihazda bildirim ve ses denenmedi (bu ortamda Android/iOS/Windows derleyici yok).
