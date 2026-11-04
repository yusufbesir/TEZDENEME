<!-- Sahip: Claude [İP:AgentMom Faz 9]. AgentMom işletim el kitabı (kısa). Değişiklik: yalnız ekleme/düzeltme; silme yalnız Yusuf'un kararıyla ve Geri Dönüşüm Kutusu'na taşıyarak. -->
# AgentMom işletim el kitabı

Her şey yereldir: yalnız bu bilgisayar, yalnız `D:`; Docker, bulut, dış hizmet yok. Komutlar `D:\YusufII\Projeler\agentmom` içinden çalıştırılır; Node için `PATH`'e `D:\n8n\nodejs` eklenmiş olmalıdır.

## 1. Başlatma ve durdurma
- Başlat: `npm start` (sunucu yalnız `127.0.0.1:8787`'de dinler).
- Durdur: pencerede `Ctrl+C` (açık veritabanı temiz kapanır). Çökme olursa sorun değil: veritabanı çökme sonrası da tutarlı açılır, yarım kalan iş akışları ilk bitmemiş adımdan devam eder.
- Yapılandırma: kullanıcı katmanı `D:\YusufII\Projeler\agentmom-config\user-config.json` (yalnız siz genişletebilirsiniz; ajanların çalıştığı klasörlerin dışındadır). Durum ve belirteç: `D:\YusufII\Projeler\agentmom-state\`.

## 2. Günlük bakış
- **Etkileşimli oturum (Claude Code tarzı):** `npm run agentmom` (argümansız, terminalde). `/yardim` komutları listeler: `/durum /gorevler /onay /borc /kararlar /rea /beceriler /saglayicilar /izle /yedek /hafiza /ui /cik`. `/onay` her görev için eylem + hedefi gösterir, cevap yalnız o anda yazdığınız satırdır (varsayılan: atla). Serbest metin yazarsanız yalnız bir görev KAYDI açılır (önce sorulur; ajan başlatılmaz).
- **Panel (Claude masaüstü görünümlü):** oturumdan `/ui` ya da `npm run agentmom -- ui`. Üç sütun: görevler · akış (izin kartları, katlanır kartlar, komut kutusu) · sağ konu paneli; telefonda tek sütun. Kullanılamayan sağlayıcı "KULLANILAMIYOR" diye gösterilir ve yerine başkası kendiliğinden geçmez.
- Tek komutluk özet: `npm run agentmom -- durum`.
- Denetim kaydı: panelde değil, `GET /api/audit` ve `data\audit.jsonl`.

## 3. Yedekleme (güvenli, sunucu çalışırken de)
- Yedek al: `npm run yedek -- yedekle`
  - Yer: `D:\YusufII\Projeler\agentmom-yedek\agentmom-yedek-<tarih>-<kod>\` (her seferinde YENİ klasör; hiçbir şey üzerine yazılmaz ya da silinmez).
  - İçerik: veritabanının tutarlı anlık görüntüsü + yapılandırma dosyaları + `manifest.json` (SHA-256'lar, şema sürümü, tablo sayıları).
  - **İçermez:** oturum belirteci, `agentmom-state` ağacı, kimlik bilgileri, anahtar klasörü. Yapılandırmada ya da veritabanında anahtar benzeri metin bulunursa yedek **reddedilir** (hiçbir şey yazılmaz).
- Doğrula: `npm run yedek -- dogrula <yedek-klasörü>` (hash'ler, bütünlük denetimi, yabancı anahtar denetimi, göç geçmişi, beklenen şema ve koruyucu tetikleyiciler).
- Sıklık önerisi: günde bir kez ve büyük işlerden önce. Eski yedekleri silmek sizin kararınızdır (Geri Dönüşüm Kutusu'na taşıyın; AgentMom hiçbir yedeği silmez).

## 4. Geri yükleme (canlı veriye asla dokunmaz)
1. Önce doğrulayın: `npm run yedek -- dogrula <yedek>`.
2. Doğrulanmış KOPYAYI yeni klasöre yazın: `npm run yedek -- geri-yukle <yedek> <YENİ-klasör>` (klasör var olmamalı).
3. Canlı veritabanını değiştirmek için (bilinçli adım): sunucuyu durdurun → `data\agentmom.db`, `agentmom.db-wal`, `agentmom.db-shm` dosyalarını **Geri Dönüşüm Kutusu'na taşıyın** (silmeyin) → yeni klasördeki `agentmom.db`'yi `data\` içine koyun → `npm start`.
4. Yedek bu kod sürümünden eskiyse açılışta bekleyen göçler uygulanır; **önce otomatik bir yedek alınır** (aşağıya bakın).
5. Yapılandırma dosyaları için aynı klasördeki kopyaları elle yerine koyun (kullanıcı yapılandırmasını `agentmom-config` içine).

## 5. Şema sürümleme ve göç güvenliği
- Göçler `src\core\db\migrations\NNN_ad.sql` (+ `.down.sql`) dosyalarıdır; uygulanmış bir göç dosyası **değiştirilemez** (sağlama toplamı denetlenir, değişirse sunucu açılmaz).
- Her göç kendi işleminde çalışır; hata olursa geri alınır ve kaydedilmez.
- Mevcut bir veritabanında bekleyen göç varsa sunucu açılırken **önce doğrulanmış bir yedek** alınır (`reason: before migration …`). Yedek alınamazsa sunucu **başlamaz** ve veritabanı göçülmez.
- Kodun bilmediği (daha yeni) bir göç içeren veritabanı reddedilir: eski kodla yeni veritabanı açılmaz.
- Elle geri alma (yıkıcıdır): yalnız bir yedek aldıktan sonra, `rollback` işlevi ile (testli).

## 6. Sorun giderme
| Belirti | Ne yapılır |
|---|---|
| Panel/terminal "sunucuya ulaşılamadı" | `npm start` çalışıyor mu; port 8787 başka bir şeyde mi |
| "Belirteç geçersiz" | Sunucu yeniden başlayınca belirteç yenilenir; `npm run agentmom -- ui` ile yeniden açın |
| Sunucu "refusing to migrate" diyor | Yedek klasörü yazılabilir mi; `AGENTMOM_BACKUP_DIR`; mesajdaki sebep |
| "database is locked" / çökme sonrası | Sunucuyu kapatıp tekrar açın; veritabanı tutarlıdır (WAL). Sürerse son yedeği doğrulayıp geri yükleyin |
| Yedek "KALDI" | Mesajdaki dosya/hash/şema satırına bakın; o yedeği kullanmayın, bir öncekini doğrulayın |
| İş akışı yarım kaldı | Sunucu açılışında otomatik devam eder (`resumed N interrupted workflow(s)`) |

## 7. Kesin sınırlar (kod ve testle zorunlu)
- `D:\Arşiv` ve `D:\YusufII\HAFIZAM1\anahtarlar`: hiçbir komut bunlara yazmaz/okumaz; yedek hedefi olamaz.
- C: yalnız araçların kendi durum dosyaları. Kalıcı silme yok; silme yalnız Geri Dönüşüm Kutusu'na taşıma ve yalnız sizin kararınızla.
- Ajanlar politika, izin ve onay kurallarını değiştiremez; onay ve yayın kararları yalnız kullanıcıdadır.

## Otomatik yedek (Faz 11)
Yedek sabit saatte değil KULLANIMA göre alınır: son yedekten beri yeterli değişiklik olduysa ve kullanım sakinleştiyse ya da uygulama kapanırken. Hiç değişiklik yoksa yedek alınmaz. Her karar denetim kaydına yazılır; durum ve uyarılar panelde (Genel bakış) ve Ayarlar › Yedekleme'de görünür. Elle yedek: Ayarlar › Yedekleme › "Şimdi yedek al" ya da `npm run yedek -- yedekle`. Ayrıntı: `docs/decisions/ADR-013-kullanim-tabanli-yedek.md`.
