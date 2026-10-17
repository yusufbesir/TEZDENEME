---
description: Adım Adım için yeni içerik ve özellik önerileri (oyunlar, yazılım dilleri, yeni diller, orta/ileri düzeyler, gömülü sözlük); 2026-10-17 araştırma turu.
sahip: Yusuf (yusufbesir)
yazan: "[Claude#bulut] İP:Adım Adım öğrenme uygulaması#Dwv81f"
degistirme: Öneri belgesidir; karar Yusuf'undur. Madde silinmez; kabul/ret durumu maddenin başına yazılır, yeni öneriler sona eklenir.
---

# Yeni içerik ve özellik önerileri (2026-10-17)

Kaynak: Yusuf'un 17 Ekim isteği ("satranç, go gibi oyunlar; PHP, Python, Go, Django, Swift; mevcut eğitimlerin orta ve ileri düzeyleri; yeni diller; gömülü sözlük; en az 10 öneri"). Araştırma üç Haiku ajanıyla yapıldı (oyun eğitimi, yazılım dili eğitimi, yeni diller ve sözlük verisi); bulgu özetleri bölüm 5'te, kaynaklar bölüm 6'da. Koordinatörün esin notu (Brilliant "önce dene, sonra kural", yanlış cevapta ipucu, haftalık özet) 3. bölüme işlendi.

Jev'e erişilemedi (bulut ortamında `AI_GATEWAY_API_KEY` yok). Öncelik sıralaması Claude'un kör seçimidir; Jev görüşü alınamadı. Kritik kategori (mimari: yeni alan ve alıştırma türü) olduğu için karar zaten Yusuf'tadır.

Mevcut yapı: `KursAlani { dil, kod }`; alıştırma türleri Secim, Bosluk, Yaz, Sirala, Eslestir, Dinle, Kod; kurs = 6 ünite × 2 ders × 10 alıştırma (120) + 36 yarışma sorusu. Aşağıdaki maliyetler bu birime göredir ("1 kurs" = 120 alıştırma + 36 soru; geçmiş turlarda bir kurs implementer için yaklaşık 100–110K token, verifier için 60K token tuttu).

## 1. Öneriler (öncelik sırasıyla)

| # | Öneri | Alan | Kapsam | Yeni altyapı | Maliyet | Dayanak |
|---|---|---|---|---|---|---|
| 1 | **Gömülü sözlük** | ortak | Kelimeye dokun → anlam, örnek cümle, kaydet → Tekrar kartı | SQLite (sqflite/drift), yeni `Sozluk` servisi, `SozlukGirdisi` modeli | Orta (altyapı 1 tur + veri dönüştürme betiği) | LingQ ve Busuu kelime akışı; kaikki Wiktionary CC BY-SA 4.0; Tatoeba CC BY |
| 2 | **Python (başlangıç, orta, ileri)** | kod | 3 kurs | Yok (Kod/Bosluk/Sirala yeter); isteğe bağlı gerçek çalıştırma (bkz. 11) | 3 kurs | python.org tutorial 16 bölüm; Codecademy 20 ders/9 proje; Mimo/Sololearn kısa ders modeli |
| 3 | **HTML/CSS/JS orta ve ileri** | kod | 6 kurs (3 dil × 2 düzey) | Yok | 6 kurs; JS için 11 ile birleşince gerçek çalıştırma | MDN Curriculum (Ekim 2025): Core → Extensions |
| 4 | **Satranç (3 düzey)** | oyun (yeni) | Kurallar → taktik motifleri → açılış/orta/son oyun; taktik bulmaca ve "hamleyi bul" | `KursAlani.oyun`; yeni alıştırma türü `Hamle` (tahta + doğru hamle/hamle dizisi); chess_on_dart (MIT) kural motoru, squares (MIT) tahta | Altyapı 1 tur + 3 kurs | Chess.com 4 seviyeli yol; Lichess Practice (hataya özel mesaj, gizli ipucu); Chessable aralıklı tekrar (yalnız anlaşılan hatlar) |
| 5 | **Almanca A1–B1** | dil | 3 kurs | Yok (Dinle için flutter_tts Almanca sesi, Windows UWP) | 3 kurs | e-YDS en büyük ikinci dil (≈500 kontenjan); Duolingo küresel 5.; Babbel B2 kapsamı |
| 6 | **İngilizce C1** | dil | 1 kurs (akademik yazı, deyimler, nüans) | Yok | 1 kurs; cihaz yedek dalındaki C1 taslağı başlangıç noktası (kendi incelemesinden kalmıştı) | Busuu C1 yalnız İngilizcede; Babbel İspanyolca C1 |
| 7 | **Go (9x9 → 13x13 → 19x19)** | oyun | 3 kurs: kurallar ve yakalama, yaşam-ölüm (tsumego), orta oyun/sayım | 4'teki `Hamle` türü Go tahtasına genelleştirilir; golo (MIT) kurallar, gobo (MIT) tahta | 3 kurs (4'ten sonra) | Go Magic 9-13-19 yolu, %60 oyun/%40 quiz, Skill Tree kyu basamakları; tsumego "çok sayıda kolay problem" |
| 8 | **SQL (başlangıç, orta, ileri)** | kod | 3 kurs | Yok; isteğe bağlı sqflite ile gerçek sorgu çalıştırma (SQLite zaten 1 için gelir) | 3 kurs | freeCodeCamp çekirdeği (Python, JS, SQL); Codecademy |
| 9 | **PHP, Go, Swift (başlangıç + orta)** | kod | 6 kurs | Yok; gerçek çalıştırma yok (gerekçe bölüm 4) | 6 kurs | php.net Language Reference; Go Tour; Swift Book |
| 10 | **Django (başlangıç + orta)** | kod | 2 kurs, Python orta önkoşul; proje adımları (polls uygulaması) | Yok | 2 kurs | Django resmi tutorial; freeCodeCamp lab modeli (test süitli görev) |
| 11 | **Gerçek kod çalıştırma (JS, Python)** | kod | JS: flutter_js (MIT, QuickJS, Windows); Python: py_engine_desktop (MIT, gömülü 3.11, +10–30 MB) | Yeni `Calistir` alıştırma türü (kod yaz → çıktı eşleşsin) | Altyapı 1–2 tur | Sololearn/Codecademy derleyici; Piston genel API ücretsiz erişimi Şubat 2026'da kalktı → çevrimdışı tercih |
| 12 | **Arapça A1–A2, Japonca A1 (kana), Fransızca A1–A2, Rusça A1 (Kiril)** | dil | Alfabe/yazı ünitesi ile başlayan kurslar | Yazı sistemi ünitesi için Eslestir/Yaz yeter; sağdan sola metin için Arapça'da yerleşim testi | 2+1+2+1 kurs | e-YDS Arapça 400, Fransızca 300, Rusça 200; Duolingo Japonca küresel 4.; LingoDeer kana sırası |
| 13 | **Puzzle puanı ve kyu basamakları** | ortak | Oyun ve kod bulmacalarına Glicko benzeri puan (puan + belirsizlik); ipucu kullanımı puanı düşürür; tema bazlı başarı oranı | Motor'a `Puan` modeli; 8c-1 "seviye puanı" ile birleşir | Orta | Chess.com/Lichess puzzle rating; Codewars 8 kyu → 8 dan; puzzle↔oyun gücü R² ≈ 0,7 (tek başına yetmez) |
| 14 | **"Önce dene, sonra kural" ve kademeli ipucu** | ortak | Her dersin ilk alıştırması kural gösterilmeden; yanlışta 1) tema ipucu 2) hataya özel mesaj 3) çözüm | Alistirma'ya `ipuclari` listesi; DersEkrani'nda ipucu adımı | Küçük | Brilliant; Lichess Practice; deliberate practice (hemen, bilgilendirici geri bildirim) |
| 15 | **Sudoku, dama, tavla mini modülleri** | oyun | Kural + strateji dersleri, küçük bulmaca seti | `Hamle` türü yeterli | 1 kurs/oyun | Kaynak zayıf (araştırmada uygulama örneği bulunamadı); düşük öncelik |

## 2. Önerilen sıra ve gerekçe

1. **Sözlük (1)** önce: tüm dil kursları ondan yararlanır, altyapısı (SQLite) 8 ve 11 için de gerekir.
2. **Python (2) ve HTML/CSS/JS orta-ileri (3)**: altyapı gerektirmez, mevcut Kod/Bosluk/Sirala türleriyle hemen yazılabilir; Yusuf'un "orta ve ileri düzey" isteğini doğrudan karşılar.
3. **Satranç (4)** ve ardından **Go (7)**: tek yeni alıştırma türü (`Hamle`) iki oyunu da taşır; kural motorları MIT lisanslı ve Windows'ta listeli. Motor (Stockfish/KataGo) ilk sürümde yok: bulmacalar elle yazılır, rakip yok.
4. **Almanca (5)** ve **İngilizce C1 (6)**: dil tarafında genişleme; Dinle için Windows TTS Almanca sesinin cihazda kurulu olup olmadığı kontrol edilmeli.
5. Kalanlar (8–15) Yusuf'un seçimine göre.

Her kursta 6 ünite × 2 ders × 10 alıştırma ve 36 yarışma sorusu düzeni korunur; verifier dil bilgisi/olgu denetimi yapar.

## 3. Mimari etkiler (karar Yusuf'ta)

- `KursAlani` enum'una `oyun` eklenir; alan seçim ekranına üçüncü kart; `seviyeler('oyun')` satranç/go düzeylerini döner.
- Yeni `Hamle` alıştırması: tahta durumu (FEN ya da SGF/taş listesi), doğru hamle(ler), hataya özel mesajlar, isteğe bağlı ipucu. Satranç ve Go için aynı sınıf, `oyun` alanı ile ayrılır.
- Yeni `Calistir` alıştırması (11): kod + beklenen çıktı; çalıştırıcı yoksa `Kod` gibi davranır (çevrimdışı güvenli düşüş).
- `Sozluk` servisi: `assets/sozluk/<dil>.sqlite` (üretim betiği `arac/sozluk_uret.py`, kaynak kaikki JSONL + Tatoeba); `SelectableText` yerine kelime bazlı `GestureDetector` + overlay. Lisans notu (CC BY-SA 4.0 atıf) Ayarlar > Hakkında'da.
- İpucu adımı (14) `Alistirma.ipuclari` ile geriye dönük uyumlu (boş liste = eski davranış).

## 4. Gerçek kod çalıştırma: neden sınırlı

- JS: flutter_js MIT, QuickJS, Windows destekli (0.8.7, Ocak 2026) → uygun.
- Python: py_engine_desktop MIT, Windows/macOS/Linux x64, +10–30 MB, ilk açılış 2–8 sn → kabul edilebilir, isteğe bağlı indirme düşünülebilir.
- PHP/Go/Swift: masaüstünde yerel araç zinciri ya da WebAssembly paketi gerekir (Go wasm ≥2 MB ve WebView; PHP Playground tarayıcı odaklı; Swift için çözüm yok). Bu diller **Kod/Bosluk/Sirala** ile sınırlı kalır.
- Uzak çalıştırma (Piston, Judge0): Piston'un genel API'si Şubat 2026'da ücretsiz erişimi kaldırdı; kendi sunucu gerekir. Çevrimdışı ilke korunur.

## 5. Araştırma bulguları (özet)

**Oyunlar.** Chess.com Lessons 4 seviye (New/Beginner/Intermediate/Advanced), kurs>ders>alıştırma, rozet; Puzzles'ta puan, yanlış/ipucu başarısız sayılır, tema istatistiği. Lichess Practice: ana hat + hataya özel mesaj + gizli ipucu; "Learn from your mistakes". Lichess puzzle puanı Glicko-2 benzeri; puzzle↔oyun gücü R² ≈ 0,71–0,75. Chessable MoveTrainer aralıklı tekrar, eleştiri: kavram değil hamle pekiştirir. Go Magic: 9x9→13x13→19x19, her aşamada kural kursu + 20–30 quiz + 20–30 oyun, Skill Tree kyu basamakları. Tsumego: çok sayıda kolay problem, %80 çözülebilir zorluk. Paketler: chess_on_dart (MIT), chess 0.8.1 (eski), squares (MIT UI), stockfish (GPL-3, Windows listelenmiyor); golo (MIT, kurallar+SGF), gobo (MIT, Flame UI). Briç için BBO örnekleri; sudoku/tavla için kaynak yok.

**Yazılım dilleri.** Mimo: kısa dersler + bölüm sonu proje; Sololearn 48 kurs, derleyici, Pro sertifika; Codecademy Python 20 ders/9 proje/9 quiz, AI ipucu; Exercism ücretsiz track + mentor; freeCodeCamp CFSD 513 ders/83 lab; Swift Playgrounds yalnız Apple; Codewars 8 kyu→8 dan; Grasshopper kapandı (2023). Müfredat: python.org 16 bölüm; php.net Language Reference; MDN Curriculum Core/Extensions (Ekim 2025). Go Tour ve Swift Book başlıkları çekilemedi (model belleği, doğrulanmadı).

**Diller ve sözlük.** Duolingo 2025 küresel sıra: İng, İsp, Fr, Jap, Alm, Kor; Türkiye'de en hızlı büyüyen Çince. e-YDS 2026: Alm 500, Ar 400, Fr 300, Rus 200 kontenjan (ikincil kaynak). Busuu A1–B2 (C1 yalnız İng), Babbel A1–C1, Drops 5 dk oyun + Review Dojo, LingQ tıkla-kaydet. Veri: kaikki Wiktionary JSONL CC BY-SA 4.0 (tanımlar İngilizce; Türkçe tanım için tr.wiktionary); FreeDict tur-eng ~1026 madde (dar); Tatoeba CC BY 2.0 FR; Goethe Wortliste telifli (gömülemez); Oxford 3000 lisansı belirsiz. flutter_tts 4.2.5 Windows (UWP sesleri). Doğrulanamayan: Mondly, Oxford lisansı, Tatoeba Türkçe cümle sayısı.

## 6. Kaynaklar

- https://support.chess.com/en/articles/8609703-how-do-lessons-work-on-chess-com
- https://support.chess.com/en/articles/8602396-how-do-puzzle-ratings-work
- https://lichess.org/blog/WtDErSQAADJfhJJs/interactive-lessons
- https://lichess.org/blog/WFvLpiQAACMA8e9D/learn-from-your-mistakes
- https://lichess.org/@/ggSayItBack/blog/do-puzzles-matter-a-data-analysis/twAyjQDX
- https://notes.andymatuschak.org/zDr94hP6bG3jJYrdYy8B5hx
- https://gomagic.org/beginners-guide/ ; https://gomagic.org/skills/ ; https://gomagic.org/where-and-how-to-solve-go-problems/
- https://pub.dev/packages/chess_on_dart ; https://pub.dev/packages/squares ; https://pub.dev/packages/golo ; https://pub.dev/packages/gobo ; https://pub.dev/packages/stockfish
- https://pubmed.ncbi.nlm.nih.gov/16719566/ (Cepeda 2006, aralıklı tekrar)
- https://www.sololearn.com/en/courses ; https://www.codecademy.com/learn/python ; https://exercism.org/docs/using ; https://www.freecodecamp.org/news/freecodecamp-turns-10-major-curriculum-updates ; https://developer.apple.com/swift-playgrounds ; https://docs.codewars.com/gamification/ranks/
- https://docs.python.org/3/tutorial/index.html ; https://www.php.net/manual/en/langref.php ; https://docs.djangoproject.com/en/stable/intro/tutorial01/ ; https://developer.mozilla.org/en-US/curriculum/
- https://pub.dev/packages/flutter_js ; https://pub.dev/documentation/py_engine_desktop/latest/ ; https://github.com/engineer-man/piston ; https://judge0.com/llms.txt
- https://blog.duolingo.com/2024-duolingo-language-report/ ; https://support.babbel.com/hc/articles/205600508 ; https://www.busuu.com/en/it-works/courses ; https://lingq-support.groovehq.com/help/how-do-i-create-lingqs ; https://help.busuu.com/hc/en-us/articles/16941990776593
- https://kaikki.org/dictionary/Turkish/ ; https://tatoeba.org/en/downloads ; https://trwordnet.cs.hacettepe.edu.tr/ ; https://www.oxfordlearnersdictionaries.com/about/wordlists/ ; https://pub.dev/packages/flutter_tts
- https://rehberpanda.com/blog/2026-e-yds-almanca-fransizca-arapca-rusca-diller-rehber/ (ikincil; ÖSYM sayfası çekilemedi)
