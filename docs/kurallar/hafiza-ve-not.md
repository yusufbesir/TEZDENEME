# Kurallar: Hafıza, not alma, silme ve Jev

> **Özet:** Model ataması, Obsidian kasasına not alma, hafızadan silme yasağı, not okuma, hafıza ve Jev kullanımı, ortak beyin ve silme biçimi kuralları. Sahibi: Yusuf. Kaynak: Proje talimatları kutusunun ayrıntılı hali (kural içeriği değiştirilmeden buraya taşındı). Değişiklik yalnızca kullanıcının isteğiyle yapılır; kural silinmez. [İP:Talimat düzeni#zkd4TM]

## Model ataması
Kullanıcı, iş parçacıklarına ve alt ajanlara görevin zorluğuna göre model atanmasını istedi; hepsine Opus 5.5 atanmayacak. Basit işler (kısa yanıt, prompt yazma, dosya listeleme, küçük düzenleme) için claude-haiku-5-5; orta işler (dosya kontrolü, düzenleme, kurulum, kod yazma) için claude-sonnet-5-5; zor işler (mimari kararlar, çok adımlı karmaşık analiz, riskli/geri alınamaz işlemler) için claude-opus-5-5 kullan.

## Not alma
Kullanıcının ana Obsidian kasası artık D:\YusufII\HAFIZAM1\kasa (Hafıza OS kurulumu). Eski Yusuf2 kasasının notları buraya kopyalandı. Bundan sonra yapılan her işlem için bu kasaya not al: Türkçe dil kurallarına uygun, son kullanıcının anlayacağı biçimde, konu başlıklarına ayrılmış ve madde madde. API anahtarı, şifre gibi gizli bilgileri notlara yazma. Notları araştırmada token tasarrufu için kaynak olarak kullanabilirsin. Ayrıntılı not kuralları kasada NOT-KURALLARI.md dosyasında, not haritası NOT-DİZİNİ.md dosyasında. "Benim Notlarım" klasörü kullanıcıya aittir; kullanıcı istemedikçe oraya yazma ve oradan silme. Her oturum, her iş parçacığı ve her ajan not tutmayı unutmaz (kullanıcının kuralı, 2026-10-16): yapılan her değişiklik, kurulum ve taşıma nota yazılır ki geri almak kolay olsun ve işler, programlar ve uygulamalar bozulmasın.

## Hafızadan silme yasağı (kullanıcının kesin kuralı)
Hafızadan (D:\YusufII\HAFIZAM1\kasa ve Mem0) hiçbir şekilde silme yapma. Not, klasör, satır ya da içerik silme; üzerine yazarak içerik kaybettirme. Değişiklik gerekiyorsa yalnızca ekleme yap ya da kullanıcıya öner. Bu kural tüm Claude oturumları ve hafızaya bağlanan diğer yapay zekalar (ör. ChatGPT) için geçerlidir.

## Not okuma kuralı
Hafızanın tamamını okuma, bu token tüketimini artırır. Her notun başında kısa bir özet bölümü olmalı ve notlar konu değiştikçe belirgin başlıklara ayrılmalı. Önce yalnızca özeti ve başlıkları oku, sadece gereken bölümü aç. Okuma işini görev için uygun en ucuz model (genellikle claude-haiku-5-5) yapsın.

## Hafıza ve Jev
Kullanıcı hakkındaki bilgileri (profil, rol, tercihler, şirket ve proje notları) önce D:\YusufII\HAFIZAM1\kasa ve Mem0 hafızasından oku; kullanıcıya tekrar sorma. Kasada notlar\ChatGPT aktarımı 2026-10-11 altında doğrulanmış profil notları var. Kullanıcı Jev'in tüm oturumlarda kullanılmasını istiyor; Jev karar verici ve orkestratör yardımcısı rolündedir. Özellikle kod yazma ve araştırma işleri Jev ile birlikte yapılmalı. Cihazda çalışan oturumlarda Hafıza OS hook'larını ve Jev puanlamalı hafıza aramasını kullan, kararları Jev ile birlikte al. Jev sunucularına (Vercel AI Gateway üzerinden TypeSafe) veri gönderilmesine kullanıcı izin verdi; bu izin yalnızca Jev için geçerli ve yerelde çalışan bir Jev sürümü çıkana kadar sürer.

- **Jev ve kararlar (kullanıcının kuralı, 2026-10-15):** Koordinatör ve iş parçacıkları tüm karar verme aşamalarında (yöntem, mimari, varsayılan seçimi, öneri) en uygun kararı Jev ile birlikte verir. Jev'e erişilemeyen bir oturumda bu açıkça belirtilir. Jev denetim işinde kullanılmaz; yalnızca karar verme işinde kullanılır.
- **Jev bağlantı yolu (kullanıcının kararı, 2026-10-15):** Jev'e Vercel AI Gateway üzerinden bağlanılmaya devam edilir. Bulut ortamı kurulmaz; Jev yalnızca kullanıcının bilgisayarından çalışır. Bulut oturumları Jev'e cihazdaki Hafıza OS oturumu üzerinden (koordinatör aracılığıyla) ulaşır. Jev hook'u karma modda (seçenek a, 0,8 eşik) çalışır.
- **Cihaz oturumlarında hafıza erişimi (2026-10-16):** Hafıza OS hook'ları kullanıcı düzeyinde kurulu; telefondan yönetilenler dahil cihazdaki her Claude Code oturumunda çalışır. Salt-okunur hafıza komutları (~\.claude\skills\hafiza-erisim: hafiza.py context, gorev_plani --jev) "bir şey çalıştırma" yasağının dışındadır. Brif yazarken bu komutları yasaklama.

## Ortak beyin (kullanıcının kuralı, 2026-10-15)
Kasada Claude, Codex (ChatGPT) ve Antigravity (Gemini) için ortak bir beyin ağı (beyin/Çekirdek Ağ, bölge haritaları, Uyku Ağı) vardır. Oturumlar bağlantıları ve derlemeyi düzenleyebilir. Kullanılmayan notlar "arşivlenirken" dosya taşınmaz, az kullanılan ağa bağlanır.
- Codex ve Antigravity de bu projedeki tüm kurallara uyar, kasayı kullanabilir ve yazabilir (yetkili). Her yapay zeka yazdığı her şeye kendi etiketini koyar (Claude için İP etiketi; Codex ve Antigravity için kendi sabit etiketleri) ki kimin ne yazdığı anlaşılsın.
- Kullanıcının izni olmadan kimse (Claude, Codex, Antigravity) hiçbir silme işlemi yapamaz. Hafıza kasasında yalnızca koşullu yer değiştirme yapılabilir: öncesi/sonrası SHA256 manifesti, doğrulama ve kayıt ile, içerik kaybı olmadan.

## Silme biçimi ve dosya açıklamaları (kullanıcının kesin kuralı, 2026-10-16; bilgisayardaki tüm yapay zekalar ve tüm oturumlar için)
- Silme kararı yalnızca kullanıcınındır. Kullanıcı bir silmeye karar verse bile silme yalnızca Windows Geri Dönüşüm Kutusu'na (çöp kutusuna) taşıma biçiminde yapılır; kalıcı silme (Remove-Item, del, rm, Shift+Delete, çöpü boşaltma vb.) hiçbir biçimde yapılmaz.
- Her dosyaya, tüm yapay zekaların (Claude, Codex/ChatGPT, Antigravity/Gemini) anlayacağı biçimde kısa bir açıklama yazılır: dosyanın ne olduğu, kime ait olduğu, hangi kurallarla değiştirilebileceği. Not ve metin dosyalarında başta özet/üst bilgi olarak; kod, ikili ya da biçimi bozulacak dosyalarda klasördeki bir açıklama (BENIOKU) dosyası ya da yan dosya olarak. Yapay zekalar dosyaları kullanıcının daha önce belirlediği kurallar çerçevesinde inceleyip değiştirebilir.
