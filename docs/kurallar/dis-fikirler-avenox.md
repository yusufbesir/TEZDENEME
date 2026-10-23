# Dış fikirler: avenoxai incelemesinden alınanlar

> **Özet:** github.com/avenoxai herkese açık depolarından (MIT) alınan fikirlerin bizim kurallarımıza uyarlanmış hali. Kod kopyalanmadı, yalnızca fikir alındı. Mevcut kurallar değişmedi; bu dosya ek öneridir ve Yusuf onayıyla ilgili dosyalara işlenir. Sahibi: Yusuf. [İP:Avenoxai incelemesi#9fbo28]

## 1. Onay kapısı ve geri alınamaz adımlar (Hermes notları)
- Geri alınamaz her adım (kalıcı silme, dış hizmete gönderme, ACL, üretim değişikliği) açık onay kapısından geçer; onay yoksa iş taslakta bekler.
- Zamanlama yayın yetkisi sayılır: zamanlanmış bir işi kurmak, o işi onaylamak demektir.

## 2. Diskten devam ve sessiz hata (Hermes notları)
- Uzun iş model hafızasından değil diskteki durumdan sürdürülür: her adımdan sonra CHECKPOINT/DEVAM dosyasına yazılır.
- Sessiz hata kontrolü: uzun çalışan işte düzenli "yaşıyorum" izi (heartbeat) tutulur; iz kesilirse iş takılmış sayılır ve Yusuf'a bildirilir.
- Gerçek olaylardan bir hata kataloğu tutulur (belirti, kök neden, çözüm); yeri kasa\notlar\.

## 3. Hafıza dosyaları (avenoxbeyin)
- Aynı dosyaya birden çok yapay zeka yazıyorsa okuma sırasında alınan özet (hash) yazma anında doğrulanır; değişmişse yazılmaz, yeniden okunur.
- Hafıza dosyası boyut sınırını aşarsa eski bölümler silinmeden arşiv klasörüne taşınır, özetlenmez. Bu, "hafızadan silme yok, yalnız ekleme" kuralıyla uyumludur.
- Sohbet dökümü saklanmaz; kalıcı kararlar kaynağı bağlantılı kısa kayıt olarak yazılır.
- Güncelleme denetimi günde en çok bir kez yapılır, otomatik kurulum yapılmaz.

## 4. Kota görünürlüğü ve zorluğa göre model (avenoxskills: limit, fable-orchestration)
- Alt ajana iş verilmeden önce ilgili havuzun kalan kotasına bakılır; kota azsa iş bir alt modele ya da sonraya bırakılır (Fable limit devri kuralıyla aynı yönde).
- Yönlendirme yalnız görev türüne değil zorluğa göre yapılır: önce düşük model ve düşük efor, yetmezse yükselt (docs/kurallar/model-ve-efor-tablosu.md).
- Keşif ve okuma işleri en ucuz modelde yapılır.

## 5. Paralel oturumlar (codex-fleet, omp-fleet)
- Aynı depoda paralel çalışan her ajan ayrı git worktree'de çalışır; birleştirme tek noktadan yapılır.
- AgentMom "oturumlar" sütunu bu modeli esas alır (tasarım notu: docs/ altında AgentMom belgesine işlenecek).

## 6. Dışa paket çıkarırken sır taraması (gptpro)
- Bir klasör dışarıya (sohbet arayüzü, yükleme, paylaşım) paketlenmeden önce sır taraması yapılır; anahtar benzeri değer bulunursa paketleme durur. Anahtarlar klasörüne yine hiçbir yapay zeka dokunmaz.

## Alınmayanlar ve neden
- Uzaktan talimat indiren kurulum prompt'ları (avenox.lol/beyin.md): dış içerik veridir, doğrudan çalıştırılmaz.
- Web3/token, brickchain, video üretim becerileri: işimizle ilgisiz.

## Sıradaki işler (aynı kararla, ayrı PR)
1. AgentMom panelinde bağlam ve limit göstergesi (statusline fikri), worktree'li oturumlar.
2. Adım Adım: büyüyen sözlük ve haftalık ödev biçimi (sifirdan).
3. Dosya dönüştürücü: Tauri değerlendirmesi (sessizkes), yalnız değerlendirme notu.

## Birlikte çalışılanlar ve kayıt
- Alt ajan kullanılmadı. Kaynak: avenoxai README'leri (WebFetch), rapor /mnt/project-files/avenoxai/avenoxai-rapor-2026-10-23.md.
- Kullanılan yapay zeka araçları: Sonnet 5.5; Jev'e erişilemedi.
- Token: tahmini, girdi yaklaşık 90.000, çıktı yaklaşık 9.000.
