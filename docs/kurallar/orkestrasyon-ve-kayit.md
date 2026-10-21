# Kurallar: Orkestratör, denetim, etiket, token kaydı, kesinti, Archify, arayüz

> **Özet:** Orkestratör yapısı ve Baş Denetmen, iş parçacığı etiketleme ve iz kaydı, token ve araç kaydı, kesintiden sonra devam, Archify mimari haritası ve emek illüzyonu tasarımı kuralları. Sahibi: Yusuf. Kaynak: Proje talimatları kutusunun ayrıntılı hali (içerik değiştirilmeden taşındı). Kural silinmez. [İP:Talimat düzeni#zkd4TM]

## Orkestratör yapısı ve denetim (kullanıcının kuralı, 2026-10-15)
- Önemli işler tek ajana bırakılmaz; birkaç ajana (araştırma, uygulama, doğrulama gibi) paylaştırılır ve iş parçacığındaki Claude başlarında durup sonuçları birleştirir.
- Projede bağımsız bir Baş Denetmen vardır. Baş Denetmen, yardımcı denetmenler (alt ajanlar) çalıştırır ve onların denetimini de denetler; uygun denetim skillerini ve araçlarını (kod inceleme, güvenlik incelemesi, test çalıştırma vb.) kullanır.
- Her yeni iş başladığında koordinatör Baş Denetmen'e haber verir. Denetmen o işi baştan sona izler; çalışan ajanların işi doğru yapıp yapmadığını kontrol eder.
- Denetmen bir sorun tespit ederse hem kullanıcıya hem koordinatöre bildirir. Koordinatör sorunu düzeltmesi için ilgili iş parçacığına iletir. Denetmen kendisi düzeltme yapmaz ve başka işleri değiştirmez.
- Denetmen düzenli aralıklarla tüm oturumları (koordinatör dahil) okur; alınan kararları, ajan ve model atamalarını, kurallara uyulup uyulmadığını raporlar. Diğer oturumlar Denetmen'in raporlarını yönlendirmez ve değiştirmez.
- **Denetmen raporlarında token (kullanıcının kuralı, 2026-10-15):** Baş Denetmen her raporunda, raporladığı her oturum için girdi token, çıktı token ve toplam harcama miktarını yazar (kesin değilse "tahmini"). Her rapor kasaya (ortak beyne) yeni not olarak eklenir; tüm oturumlar için not ekleme işine denetmen raporları da dahildir. Ekleme yoluyla yapılır, silme yok.

## İş parçacığı etiketleme ve iz kaydı (kullanıcının kuralı, 2026-10-15)
- Her oturumun benzersiz bir etiketi vardır. Biçim: [İP:<iş parçacığı başlığı>#<oturum kimliğinin (cse_...) son 6 karakteri>]. Koordinatör için [İP:Koordinatör#<son 6 karakter>].
- Bu etiket oturumun yazdığı her kasa notuna, commit mesajına, PR açıklamasına, rapor ve çıktı dosyasına eklenir; böylece işi hangi iş parçacığının yürüttüğü sonradan bulunur.
- Her not ve çıktıda ayrıca "Birlikte çalışılanlar" bölümü olur: o iş için kullanılan alt ajanlar (rolü ve modeli) ile birlikte çözüm üretilen ya da bilgi alınan diğer iş parçacıklarının etiketleri yazılır.
- Yapılan her değişiklik (dosya, commit, kasa notu) etiketle birlikte nerede ve ne yapıldığını gösterecek biçimde kaydedilir ki hatalı bir işlem sonradan bulunup geri alınabilsin. Geri alma yine silme yasağına uyar: kasada içerik silinmez, düzeltme ekleme yoluyla yapılır.
- Denetmen raporları kısa, sade ve insanın kolayca anlayacağı biçimde bir özet olur. Raporun gövdesinde etiket kuralına uyulup uyulmadığı ayrıca anlatılmaz; hangi iş parçacığının hangi iş için hangi iş parçacığıyla ya da ajanlarla ortak çalıştığı düz cümlelerle anlatılır. Etiketler raporun sonunda "Kaynakça" bölümünde listelenir.

## Token ve araç kaydı (kullanıcının kuralı, 2026-10-15)
- Her oturum, yazdığı kasa notlarına ve çıktı/rapor dosyalarına o iş için harcanan girdi (input) ve çıktı (output) token sayılarını ayrı ayrı yazar. Alt ajanların tokenları ayrıca belirtilir ve toplamı verilir. Kesin sayı alınamıyorsa bu açıkça "tahmini" diye yazılır.
- Her notta "Kullanılan yapay zeka araçları" bölümü olur: ana model, alt ajan modelleri, Jev, Codex/ChatGPT, Gemini gibi işte kullanılan her yapay zeka aracı listelenir.
- Bu bilgi geçmiş oturumlar için de geriye dönük eklenir; ekleme yoluyla yapılır, mevcut içerik silinmez.

## Kesintiden sonra devam (kullanıcının kuralı, 2026-10-15)
- Kullanıcının bilgisayarı çevrimdışı olup tekrar çevrimiçi olduğunda, yarıda kalan her oturum kullanıcıya sormadan kaldığı yerden devam eder. "Devam edeyim mi?" diye sorulmaz.
- Oturum/kullanım limiti dolduğunda da aynı kural geçerlidir: limit sıfırlandığı anda tüm oturumlar ve iş parçacıkları kullanıcıya sormadan otomatik olarak kaldığı yerden devam eder. Limit hatası alan oturum, limit sıfırlanma zamanını ve sıradaki adımı durum listesine yazar; koordinatör sıfırlanma zamanına bir hatırlatma kurar ve o anda yarıda kalan tüm iş parçacıklarına devam notu gönderir.
- Her oturum, uzun işlerde ilerlemesini (yapılan adımlar, sıradaki adım) kalıcı bir yere (durum kontrol listesi, iş dosyası ya da kasa notu) yazar ki kesintiden sonra nereden devam edeceği bilinsin.
- Koordinatör, cihaz tekrar çevrimiçi olduğunda yarıda kalmış oturumlara devam etmeleri için not gönderir.
- Bu kural kullanıcı onayı gerektiren adımları (geri alınamaz işlem, e-posta gönderme, hafızadan silme yasağı) ve kullanıcının seçmesi gereken kararları değiştirmez; onlar için yine onay beklenir. "Sormadan devam et" kuralı, bekleyen bir seçimi kullanıcı adına yapma izni değildir.

## Archify mimari haritası (kullanıcının kuralı, 2026-10-16)
Kullanıcı açık kaynak Archify skill'inin (projeyi tarayıp mimari haritaya çeviren skill) bundan sonraki her yazılım projesinde çalıştırılmasını istedi. Yeni bir proje başlarken ya da mevcut bir projede önemli bir değişiklikten sonra Archify ile projenin mimari haritası çıkarılır ve çıktı proje klasöründe saklanır. Skill kullanıcının bilgisayarında kuruludur (~\.claude\skills\archify ve ~\.codex\skills\archify); bulut oturumlarında yoksa bu açıkça belirtilir. Archify'ın çıktısı proje kodunu dışarı göndermemelidir; gönderiyorsa kullanıcıya sorulur.

## Emek illüzyonu tasarımı
Bu kural yola bağlı kural olarak taşındı: [`.claude/rules/emek-illuzyonu.md`](../../.claude/rules/emek-illuzyonu.md) (arayüz dosyaları açılınca yüklenir). İçerik değişmedi.

## REA her zaman çalışır durumda (kullanıcının kuralı, 2026-10-17)
Yusuf: "rea bundan sonra hep çalışır halde olsun". REA (APK/ikili yapı analizi MCP sunucusu ve skill'i) cihazda sürekli kullanılabilir tutulur:
- Araç yolları `C:\Users\TAA PF60V67C\.claude.json` REA bölümünde D:\Programlar altını gösterir (`REA_APKTOOL_COMMAND`, `REA_JADX_MCP_JAR`, `GHIDRA_INSTALL_DIR`). Araçlar taşınırsa aynı gün bu üç değer güncellenir; Yusuf bu düzeltme için izin verdi (2026-10-17 14:21).
- Her cihaz oturumunun başında, REA'ya iş verilecekse önce `inspect_apktool_client` ile sağlık kontrolü yapılır; "capability_unavailable" dönerse iş başlamadan neden bulunup düzeltilir ve Yusuf'a tek satırla bildirilir.
- REA'nın ortam değişkenleri yalnız sunucu başlarken okunur; ayar değişince REA yeniden bağlanır (yeni oturum ya da /mcp Reconnect). Koordinatör cihaz oturumunu yeniden başlatarak bunu kendisi yapabilir.
- APK taramaları REA (apktool + JADX) ile yapılır; REA çalışmıyorsa yalnız geçici olarak doğrudan apktool'a düşülür ve rapora "REA çalışmadı, sebep" yazılır.
