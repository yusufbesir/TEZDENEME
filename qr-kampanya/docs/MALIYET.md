# Tahmini işletme maliyeti

> Etiket: [İP:Dinamik QR ve kampanya sistemi#tnmy6Q]

**Uyarı:** Aşağıdaki rakamlar kesin fiyat değildir, piyasa aralığına dayalı **tahmindir** ve bu belge hazırlanırken sağlayıcı sitelerinden doğrulanmamıştır. Döviz kuru, KDV ve kampanyalar fiyatı değiştirir. Satın almadan önce sağlayıcının güncel fiyat sayfasını kontrol edin.

## Özet

- **Yazılım lisansı: 0 TL.** Kullanılan bütün yazılımlar açık kaynaklı ve ücretsizdir.
- Zorunlu düzenli giderler yalnızca **alan adı** ve **VPS**'tir; sunucu dışı yedek düşük maliyetlidir.
- Ücretli üçüncü taraf hizmet gerekmez (HTTPS sertifikası Let's Encrypt ile ücretsiz).

## Kalem kalem

| Kalem | Tahmini aralık | Not |
|---|---|---|
| Alan adı (.com) | yılda yaklaşık 10-20 USD | `.com.tr` gibi uzantılarda fiyat ve şartlar farklıdır. **Yenileme ücreti** ilk yıl fiyatından yüksek olabilir. Mevcut firma alan adınızın alt alanını (`qr.firmaniz.com`) kullanırsanız ek ücret yoktur. |
| VPS (2 vCPU, 2-4 GB RAM, 40 GB disk) | ayda yaklaşık 4-12 EUR/USD | Hetzner, Contabo, DigitalOcean, Vultr, yerli sağlayıcılar. Binlerce QR kod ve orta düzey trafik için yeterli. |
| VPS sağlayıcısının otomatik anlık görüntü (snapshot) yedeği | genellikle VPS fiyatının %20'si civarı | İsteğe bağlı; sistemin kendi günlük yedeği zaten var. |
| Sunucu dışı yedek depolama | ayda 1 USD'nin altı ile birkaç USD | Birkaç GB için Backblaze B2 / Hetzner Storage Box / mevcut bulut depolama. |
| HTTPS sertifikası | 0 | Let's Encrypt, Caddy otomatik yeniler. |
| Yazılım lisansları | 0 | Django, PostgreSQL, Caddy, Docker Engine açık kaynak. |
| İlk geliştirme işçiliği | — | Bu proje yapay zekâ destekli geliştirildi; dışarıdan bir geliştiriciyle yapılsaydı maliyet ülkeye ve kapsama göre çok değişir. |
| Bakım ve güncelleme | ayda yaklaşık 1-2 saat | Güvenlik güncellemelerini uygulamak, yedek testini yapmak (bkz. BAKIM.md). Kendiniz yaparsanız işçilik maliyeti yoktur. |
| Vergiler | — | Yurt dışı sağlayıcılarda KDV/dijital hizmet vergisi faturaya eklenebilir; firma faturası için muhasebecinize danışın. |

## Kabaca toplam

İlk yıl: alan adı + 12 ay VPS + yedek depolama ≈ **yılda 70-180 USD civarı** (tahmin). Mevcut alan adınızın alt alanını kullanırsanız alan adı kalemi düşer.

## Ücretsiz çözümlerin sınırları

- Ücretsiz/çok ucuz VPS'lerde (ör. 1 GB RAM) PostgreSQL + uygulama sıkışabilir; 2 GB önerilir.
- Ücretsiz “dinamik QR” SaaS hizmetleri kodları kendi alan adlarında tutar; abonelik bitince basılı kodlar çalışmaz. Bu sistemin amacı tam olarak bu bağımlılığı ortadan kaldırmaktır.
- Tek sunucu, tek arıza noktasıdır. Sunucu dışı yedek ve geri yükleme testi bu riski azaltır ama kesintisiz çalışmayı garanti etmez.
