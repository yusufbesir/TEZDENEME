# CHECKPOINT

> **Özet:** Değişen durum bilgisi (açık iş, bekleyen karar, sıradaki adım). Kalıcı kural değildir; kurallar `docs/kurallar/` ve `.claude/rules/` altındadır. Her oturum bitirdiği adımı buraya ekler, kesintiden sonra buradan devam edilir. Eski satırlar silinmez, "Tamamlandı" bölümüne taşınır. [İP:Talimat düzeni#zkd4TM]

## Şu an açık
- Talimat düzeni, ikinci tur: yola bağlı kurallar, boyut testi, yerleşim tablosu (bu dal).
- Sıradaki: tekrarlanan prosedürlerin skill'e çevrilmesi (ayrı PR).

## Bekleyen kullanıcı kararları
- Adım Adım: 20 yeni içerik önerisinden (adim-adim/docs/ONERILER-2026-10-17-YENI-ICERIK.md) hangileri ve hangi sırayla yapılsın? Önerilen ilk üç: sözlük, Python 3 düzey, HTML/CSS/JS orta-ileri.
- `.claude/skills` altındaki kullanılmayan skill'ler `skill-kutuphanesi` altına alınsın mı?
- Jev ayrıntısı `docs/jev/` altında kalıp CLAUDE.md'de yalnız bağ mı bırakılsın?
- Archify haritası cihaz oturumunda mı çıkarılsın?
- `docs/orchestrator-log.md` satır biçimi (madde / tablo) tek biçime çevrilsin mi?

## Tamamlandı
- 2026-10-16: Ayrıntılı kurallar `docs/kurallar/` altına taşındı, talimat kutusu 2.912 karaktere indi (PR #20).
- 2026-10-16: Orkestratör günlüğü `docs/orchestrator-log.md` altına taşındı.
