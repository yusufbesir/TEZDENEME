---
paths:
  - "adim-adim/windows/**"
  - "adim-adim/lib/guncelleme/**"
  - "adim-adim/docs/IMZA.md"
  - "**/*.nsh"
---

> **Özet:** Windows uygulamalarının kurulum, güncelleme, kaldırma ve klasör düzeni kuralı. Yalnızca ilgili yollar açılınca yüklenir. Sahibi: Yusuf. Kaynak: `docs/kurallar/guvenlik-ve-dosya.md` içinden taşındı, içerik değişmedi. Kural silinmez. [İP:Talimat düzeni#zkd4TM]

## Windows uygulamalarında kurulum, güncelleme, kaldırma ve klasör düzeni (kullanıcının kuralı, 2026-10-15; 2026-10-16'da genişletildi; bundan sonraki tüm uygulama geliştirme projeleri için)
- Yazılan her Windows uygulaması klasik Windows programları gibi dağıtılır: bir kurulum exe'si ve programı tamamen kaldıran bir kaldırma exe'si olur. Kaldırma programı Windows'un Uygulamalar listesinde de görünür; kullanıcı programı silmek istediğinde onu çalıştırması yeterlidir. Kaldırma sırasında kullanıcı verisinin ve ayarların da silinip silinmeyeceği kullanıcıya sorulur.
- Klasör düzeni, yaygın Windows uygulamalarında kullanılan düzen araştırılarak ona göre kurulur. Örneğin program dosyaları Program Files ya da %LOCALAPPDATA%\Programs altında, kullanıcı verisi ve ayarlar %APPDATA% ya da %LOCALAPPDATA% altında, kısayollar Başlat menüsünde tutulur.
- Güncelleme (yama) kurulduğunda, kurulum programı yeni sürümde artık kullanılmayan eski dosyaları kaldırır; oyun istemcilerinin güncellemelerinde olduğu gibi program boyutu sürekli büyümez. Tüm eski dosyalar silinmez, yalnızca yeni sürümde artık kullanılmayanlar silinir.
- Silmeyi Claude değil, programın kendisi (kurulum ve kaldırma programı) yapar. Bu, silme yasağının kullanıcının açıkça verdiği tek istisnasıdır ve şu sınırlarla uygulanır: yalnızca programın kendi kurulum klasöründeki kendi dosyaları (manifestle belirlenir) silinir; gerçek yol kurulum klasörü içinde doğrulanır, sembolik bağlantı/junction izlenmez; kullanıcı verisi, ayarlar ve programın ürettiği çıktılar güncellemede asla silinmez, kaldırmada yalnızca kullanıcı onaylarsa silinir; önce yeni sürüm kurulup doğrulanır, sonra eski dosyalar silinir; güncelleme başarısızsa eski sürüm yerinde kalır. Hafıza kasası ve Mem0 bu istisnanın dışındadır.
