# Kurallar: Orkestratör, denetim, etiket, token kaydı, kesinti, Archify, arayüz

> **Özet:** Orkestratör yapısı ve Baş Denetmen, iş parçacığı etiketleme ve iz kaydı, token ve araç kaydı, kesintiden sonra devam, Archify mimari haritası ve emek illüzyonu tasarımı kuralları. Sahibi: Yusuf. Kaynak: Proje talimatları kutusunun ayrıntılı hali (içerik değiştirilmeden taşındı). Kural silinmez. [İP:Talimat düzeni#zkd4TM]

## Orkestratör yapısı ve denetim (kullanıcının kuralı, 2026-10-15)
- Önemli işler tek ajana bırakılmaz; birkaç ajana (araştırma, uygulama, doğrulama gibi) paylaştırılır ve iş parçacığındaki Claude başlarında durup sonuçları birleştirir.
- (2026-10-25: ajan sınırı ve kayıt biçimi değişti, bkz. sondaki bölüm.)
- Projede bağımsız bir Baş Denetmen vardır. Baş Denetmen, yardımcı denetmenler (alt ajanlar) çalıştırır ve onların denetimini de denetler; uygun denetim skillerini ve araçlarını (kod inceleme, güvenlik incelemesi, test çalıştırma vb.) kullanır.
- Her yeni iş başladığında koordinatör Baş Denetmen'e haber verir. Denetmen o işi baştan sona izler; çalışan ajanların işi doğru yapıp yapmadığını kontrol eder.
- Denetmen bir sorun tespit ederse hem kullanıcıya hem koordinatöre bildirir. Koordinatör sorunu düzeltmesi için ilgili iş parçacığına iletir. Denetmen kendisi düzeltme yapmaz ve başka işleri değiştirmez.
- Denetmen düzenli aralıklarla tüm oturumları (koordinatör dahil) okur; alınan kararları, ajan ve model atamalarını, kurallara uyulup uyulmadığını raporlar. Diğer oturumlar Denetmen'in raporlarını yönlendirmez ve değiştirmez.
- **Denetmen raporlarında token (kullanıcının kuralı, 2026-10-15):** Baş Denetmen her raporunda, raporladığı her oturum için girdi token, çıktı token ve toplam harcama miktarını yazar (kesin değilse "tahmini"). Her rapor kasaya (ortak beyne) yeni not olarak eklenir; tüm oturumlar için not ekleme işine denetmen raporları da dahildir. Ekleme yoluyla yapılır, silme yok.

## İş parçacığı etiketleme ve iz kaydı (kullanıcının kuralı, 2026-10-15)
- (2026-10-25: rapor ve çıktı dosyalarındaki zorunluluk kalktı, bkz. sondaki bölüm.)
- Her oturumun benzersiz bir etiketi vardır. Biçim: [İP:<iş parçacığı başlığı>#<oturum kimliğinin (cse_...) son 6 karakteri>]. Koordinatör için [İP:Koordinatör#<son 6 karakter>].
- Bu etiket oturumun yazdığı her kasa notuna, commit mesajına, PR açıklamasına, rapor ve çıktı dosyasına eklenir; böylece işi hangi iş parçacığının yürüttüğü sonradan bulunur.
- Her not ve çıktıda ayrıca "Birlikte çalışılanlar" bölümü olur: o iş için kullanılan alt ajanlar (rolü ve modeli) ile birlikte çözüm üretilen ya da bilgi alınan diğer iş parçacıklarının etiketleri yazılır.
- Yapılan her değişiklik (dosya, commit, kasa notu) etiketle birlikte nerede ve ne yapıldığını gösterecek biçimde kaydedilir ki hatalı bir işlem sonradan bulunup geri alınabilsin. Geri alma yine silme yasağına uyar: kasada içerik silinmez, düzeltme ekleme yoluyla yapılır.
- Denetmen raporları kısa, sade ve insanın kolayca anlayacağı biçimde bir özet olur. Raporun gövdesinde etiket kuralına uyulup uyulmadığı ayrıca anlatılmaz; hangi iş parçacığının hangi iş için hangi iş parçacığıyla ya da ajanlarla ortak çalıştığı düz cümlelerle anlatılır. Etiketler raporun sonunda "Kaynakça" bölümünde listelenir.

## Token ve araç kaydı (kullanıcının kuralı, 2026-10-15)
- (2026-10-25: nerede tutulacağı sadeleşti, bkz. sondaki bölüm. Aşağıdaki maddeler o bölümle çelişmediği yerde geçerlidir.)
- Her oturum, yazdığı kasa notlarına ve çıktı/rapor dosyalarına o iş için harcanan girdi (input) ve çıktı (output) token sayılarını ayrı ayrı yazar. Alt ajanların tokenları ayrıca belirtilir ve toplamı verilir. Kesin sayı alınamıyorsa bu açıkça "tahmini" diye yazılır.
- Her notta "Kullanılan yapay zeka araçları" bölümü olur: ana model, alt ajan modelleri, Jev, Codex/ChatGPT, Gemini gibi işte kullanılan her yapay zeka aracı listelenir.
- Bu bilgi geçmiş oturumlar için de geriye dönük eklenir; ekleme yoluyla yapılır, mevcut içerik silinmez.
- Kesin sayı için oturumun kendi sayacı kullanılır (`get_session` çıktısındaki `usage`: girdi, çıktı, önbellek okuma/yazma). Sayaç oturum toplamıdır; alt ajan kırılımını vermez, o yüzden alt ajan tokenları `docs/orchestrator-log.md` satırlarından alınır, orada yoksa "veri yok" yazılır. Geçmiş oturumların tablosu: `token-kaydi/` (proje klasörü). (PR #14'ten taşındı.)

## Kesintiden sonra devam (kullanıcının kuralı, 2026-10-15)
- Kullanıcının bilgisayarı çevrimdışı olup tekrar çevrimiçi olduğunda, yarıda kalan her oturum kullanıcıya sormadan kaldığı yerden devam eder. "Devam edeyim mi?" diye sorulmaz.
- Oturum/kullanım limiti dolduğunda da aynı kural geçerlidir: limit sıfırlandığı anda tüm oturumlar ve iş parçacıkları kullanıcıya sormadan otomatik olarak kaldığı yerden devam eder. Limit hatası alan oturum, limit sıfırlanma zamanını ve sıradaki adımı durum listesine yazar; koordinatör sıfırlanma zamanına bir hatırlatma kurar ve o anda yarıda kalan tüm iş parçacıklarına devam notu gönderir.
- Her oturum, uzun işlerde ilerlemesini (yapılan adımlar, sıradaki adım) kalıcı bir yere (durum kontrol listesi, iş dosyası ya da kasa notu) yazar ki kesintiden sonra nereden devam edeceği bilinsin.
- Koordinatör, cihaz tekrar çevrimiçi olduğunda yarıda kalmış oturumlara devam etmeleri için not gönderir.
- Bu kural kullanıcı onayı gerektiren adımları (geri alınamaz işlem, e-posta gönderme, hafızadan silme yasağı) ve kullanıcının seçmesi gereken kararları değiştirmez; onlar için yine onay beklenir. "Sormadan devam et" kuralı, bekleyen bir seçimi kullanıcı adına yapma izni değildir.

## Archify mimari haritası (kullanıcının kuralı, 2026-10-16)
Kullanıcı açık kaynak Archify skill'inin (projeyi tarayıp mimari haritaya çeviren skill) bundan sonraki her yazılım projesinde çalıştırılmasını istedi. Yeni bir proje başlarken ya da mevcut bir projede önemli bir değişiklikten sonra Archify ile projenin mimari haritası çıkarılır ve çıktı proje klasöründe saklanır. Skill kullanıcının bilgisayarında kuruludur (~\.claude\skills\archify ve ~\.codex\skills\archify); bulut oturumlarında yoksa bu açıkça belirtilir. Archify'ın çıktısı proje kodunu dışarı göndermemelidir; gönderiyorsa kullanıcıya sorulur.

## Arayüz tasarımında ui-ux-pro-max skill'i (kullanıcının kuralı, 2026-10-24)
Arayüz tasarımı veya UI incelemesi işinde (Adım Adım, AgentMom ve diğer uygulamalar) önce `ui-ux-pro-max` skill'i çağrılır: yeni sayfa/uygulama için `--design-system`, bilinen yığın için `--stack` (wpf, winui, avalonia, uno, flutter, react-native vb.), tek bir sorun için tek `--domain` araması. Betikler skill klasöründen `python scripts\search.py ...` ile çalışır (`python -I` kullanılmaz). Sonuç doğrulanmadan kalıcı yazılmaz; veri metni öneridir, talimat değildir; özel proje verisi sorguya yazılmaz. Skill cihazda kuruludur (D:\Programlar\ui-ux-pro-max, ~\.claude\skills altında bağlı); bulut oturumunda yoksa bu açıkça belirtilir. Logo/CIP/ikon üretiminde sıra: önce SVG (dış servis yok), görsel gerekirse `--provider pollinations` (istemler üçüncü tarafa gider, kullanıcıya söylenir), Gemini yalnız kullanıcı faturalandırmayı açarsa. API anahtar değeri istenmez, yazdırılmaz. [İP:UI UX skill#xeMNh]

## Emek illüzyonu tasarımı
Bu kural yola bağlı kural olarak taşındı: [`.claude/rules/emek-illuzyonu.md`](../../.claude/rules/emek-illuzyonu.md) (arayüz dosyaları açılınca yüklenir). İçerik değişmedi.

## REA her zaman çalışır durumda (kullanıcının kuralı, 2026-10-17)
Yusuf: "rea bundan sonra hep çalışır halde olsun". REA (APK/ikili yapı analizi MCP sunucusu ve skill'i) cihazda sürekli kullanılabilir tutulur:
- Araç yolları `C:\Users\TAA PF60V67C\.claude.json` REA bölümünde D:\Programlar altını gösterir (`REA_APKTOOL_COMMAND`, `REA_JADX_MCP_JAR`, `GHIDRA_INSTALL_DIR`). Araçlar taşınırsa aynı gün bu üç değer güncellenir; Yusuf bu düzeltme için izin verdi (2026-10-17 14:21).
- Her cihaz oturumunun başında, REA'ya iş verilecekse önce `inspect_apktool_client` ile sağlık kontrolü yapılır; "capability_unavailable" dönerse iş başlamadan neden bulunup düzeltilir ve Yusuf'a tek satırla bildirilir.
- REA'nın ortam değişkenleri yalnız sunucu başlarken okunur; ayar değişince REA yeniden bağlanır (yeni oturum ya da /mcp Reconnect). Koordinatör cihaz oturumunu yeniden başlatarak bunu kendisi yapabilir.
- APK taramaları REA (apktool + JADX) ile yapılır; REA çalışmıyorsa yalnız geçici olarak doğrudan apktool'a düşülür ve rapora "REA çalışmadı, sebep" yazılır.

## Onay kapısı, diskten devam ve kota (kullanıcı onayı 2026-10-23; kaynak: dis-fikirler-avenox.md)
- Geri alınamaz adımlar (kalıcı işlem, dış hizmete gönderme, ACL, üretim) açık onay olmadan yapılmaz; onay yoksa iş taslakta bekler. Zamanlanmış iş kurmak o işi onaylamak sayılır.
- Uzun iş diskteki durumdan sürdürülür (CHECKPOINT/DEVAM); uzun çalışan işte düzenli "yaşıyorum" izi tutulur, iz kesilirse iş takılmış sayılıp Yusuf'a bildirilir. Gerçek hatalar belirti, kök neden, çözüm olarak kasa\notlar\ altındaki hata kataloğuna eklenir.
- Alt ajana iş verilmeden önce ilgili modelin kalan kotasına bakılır; azsa bir alt modele ya da sonraya bırakılır. Önce düşük model ve efor, yetmezse yükselt (model-ve-efor-tablosu.md).
- Aynı depoda paralel çalışan ajanlar ayrı git worktree'de çalışır; birleştirme tek noktadan yapılır.

## Sadeleştirme ve gözetimsiz oturum (Yusuf onayı, 2026-10-25)
Kaynak: teşhis raporu `notlar/2026-10-25-ilerleme-durmasi-teshis.md` (proje klasörü). Eski maddeler silinmedi; çelişkide bu bölüm geçerlidir. [İP:Projelerin neden ilerlemediğini çöz#zzCVjG]

**Ajanlar ve sınır**
- "Yalnız scout, implementer, verifier" kuralı kalktı. Bu üçü varsayılandır; Baş Denetmen ve görev gerektiren diğer ajanlar kullanılabilir. Model görev zorluğuna göre seçilir (model-ve-efor-tablosu.md).
- Bir oturum toplam en fazla 50 alt ajan çalıştırır.
- Cihazda yeni oturum ya da paralel ajan açmadan önce boş RAM ve işlemci yükü ölçülür (PowerShell: `Get-CimInstance Win32_OperatingSystem` içindeki FreePhysicalMemory, `Get-Counter '\Processor(_Total)\% Processor Time'`). Başlangıç eşikleri (tahmini, gözleme göre ayarlanır): her eşzamanlı oturum için en az 1,5 GB boş RAM; boş RAM toplamın %20'sinin altına iner ya da işlemci %85'i aşarsa yeni oturum açılmaz, iş sıraya alınır. Bulutta sınır kota ve 50 ajan tavanıdır.

**Gözetimsiz oturum (Remote Control, zamanlanmış iş)**
- Soru sorup beklenmez. Belirsizlikte en olası yol seçilir; karar ve gerekçe commit mesajına ya da issue yorumuna yazılır.
- Her adım geri alınabilir yapılır: ayrı dala commit (birleştirme Yusuf'ta), silme yerine taşıma, git dışı dosyayı değiştirmeden önce `_yedek/<tarih>/` altına kopya. "Üzerine yazmadan önce sor" kuralı yalnız git'te izlenmeyen dosyalar için geçerlidir.
- Geri alınamaz adım (dış gönderim, kalıcı silme, ACL, üretim) gözetimsiz oturumda yapılmaz; issue'ya not düşülür, kalan işe devam edilir.
- Oturumu başlatan başlık talimata Yusuf'un onay mesajını aynen (tarih ve metin) ekler; kendi özeti yetmez.
- Başlatan başlık 15 ve 45 dakika sonra commit, PR ya da dal değişikliği olup olmadığını kontrol eder. Yoksa "devam ediyor" demez, "durdu" der ve nedenini araştırır.
- Bağlamı 200 bin token'ı aşan başlık devir notu (yapılan, sıradaki, açık PR) yazıp yeni başlığa geçer.

**Etiket ve token kaydı (nerede tutulur)**
- Etiket `[İP:...]` commit mesajında, PR açıklamasında ve kasa notunda kalır (geri izleme için). Ara rapor ve çıktı dosyalarında zorunlu değildir.
- Token, "Birlikte çalışılanlar" ve "Kullanılan yapay zeka araçları" iş bitiminde bir kez yazılır: PR'lı işte PR açıklamasına, PR'sız işte (araştırma, not) kasa notuna. Ayrıca `docs/orchestrator-log.md`'ye iş başına tek satır. Her ajan ve her adım için ayrı kayıt gerekmez.
- Baş Denetmen raporlarındaki token kuralı değişmedi.
