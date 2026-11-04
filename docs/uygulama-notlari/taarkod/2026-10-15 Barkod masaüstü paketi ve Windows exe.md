# 2026-10-15 Barkod masaüstü paketi ve Windows exe

İz etiketi: [İP:Barkod sıra şifreleme uygulaması#ixQ4SM]

## Özet
- Barkod uygulaması Electron ile masaüstü uygulamasına paketlendi; Windows için kurulumlu ve taşınabilir iki .exe üretildi.
- Konum: proje dosyaları, barkod-sifreleme/masaustu/cikti. Her biri yaklaşık 104 MB.

## Ayrıntılar
- Kurulum: kullanıcı başına (yönetici izni gerekmez), klasör seçilebilir, masaüstü ve başlat menüsü kısayolu, kaldırıcı, Türkçe sihirbaz.
- Güvenlik: sayfa yalnızca yerel dosyayı açar; ağ, yeni pencere ve izin istekleri engelli; geliştirici araçları kapalı.
- .exe dosyaları imzasız; Windows SmartScreen uyarı verebilir.
- Linux'ta derlendi, Windows'ta kurulup denenmedi. İlk denemeyi Windows'ta yapın.
- Yeniden derleme: masaustu/README.md.

## Birlikte çalışılanlar
- implementer / claude-sonnet-5-5: Electron paketleme ve .exe üretimi
- verifier / claude-sonnet-5-5: bağımsız paket denetimi
- Bilgi alınan diğer iş parçacıkları: yok
