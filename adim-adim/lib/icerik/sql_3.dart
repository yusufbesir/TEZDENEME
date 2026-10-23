// SQL kursu 3/3 (kurs kimliği: sql-3). Alan: programlama (KursAlani.kod).
// Sahibi: Adım Adım uygulaması içerik ekibi; yazan: Claude (implementer, dalga5).
// Kurgusal market verisi (urunler, musteriler, siparisler); yalnız SQLite/PostgreSQL
// ortak standart SQL. Çıktı soruları sqlite3 ile doğrulandı. Değişiklik: kurs
// kimlikleri ve alıştırma türleri test/icerik_test.dart kurallarına uymalıdır.
import '../model/icerik.dart';

/// SQL İleri Düzey
const Kurs sql3 = Kurs(
  id: 'sql-3',
  ad: 'SQL İleri Düzey',
  aciklama:
      'JOIN ile tabloları birleştir; INSERT, UPDATE, DELETE, CREATE TABLE ve alt sorguyu öğren.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'sql-3-u1',
      ad: 'Tabloları birleştirme',
      dersler: [
        Ders(
          id: 'sql-3-u1-d1',
          ad: 'Anahtarlar ve ilişki',
          dilbilgisiNotu:
              'Veriler genelde birden çok tabloya bölünür. PRIMARY KEY (birincil anahtar) bir tablodaki her satırı tek başına belirler (id). FOREIGN KEY (yabancı anahtar) başka bir tablonun anahtarını gösterir: siparisler.musteri_id, musteriler.id\'yi, siparisler.urun_id ise urunler.id\'yi gösterir. Bir müşterinin birçok siparişi olabilir (bire-çok ilişki).\n\nmusteriler (id | ad | sehir)\n1 | Ayşe | Ankara\n2 | Mehmet | İzmir\n3 | Zeynep | Ankara\n4 | Ali | NULL\n5 | Can | İstanbul\n\nsiparisler (id | musteri_id | urun_id | adet)\n1 | 1 | 1 | 5\n2 | 1 | 3 | 2\n3 | 2 | 5 | 1\n4 | 3 | 2 | 4\n5 | 3 | 4 | 6',
          alistirmalar: [
            Secim(
              soru:
                  'Bir tablodaki her satırı tek başına belirleyen sütuna ne denir?',
              secenekler: [
                'Yabancı anahtar',
                'Birincil anahtar (PRIMARY KEY)',
                'Takma ad',
                'Süzgeç',
              ],
              dogru: 1,
              aciklama: 'Birincil anahtar değeri tekrarlanmaz.',
            ),
            Secim(
              soru: 'siparisler.musteri_id sütunu hangi tür anahtardır?',
              secenekler: [
                'Birincil anahtar',
                'Yinelenen anahtar',
                'Yabancı anahtar',
                'Hiçbiri',
              ],
              dogru: 2,
              aciklama:
                  'Başka tablonun anahtarını gösterdiği için yabancı anahtardır.',
            ),
            Secim(
              soru:
                  'siparisler.musteri_id hangi tablonun hangi sütununa işaret eder?',
              secenekler: [
                'urunler.id',
                'musteriler.ad',
                'siparisler.id',
                'musteriler.id',
              ],
              dogru: 3,
              aciklama: 'Siparişi veren müşterinin id\'sini tutar.',
            ),
            Secim(
              soru: 'Ayşe (id 1) kaç sipariş satırına sahiptir?',
              secenekler: ['2', '1', '3', '5'],
              dogru: 0,
              aciklama:
                  'siparisler tablosunda musteri_id değeri 1 olan iki satır var.',
            ),
            Secim(
              soru:
                  'Bir müşteri birçok sipariş verebiliyorsa müşteri-sipariş ilişkisi nedir?',
              secenekler: ['Bire-bir', 'Bire-çok', 'Çoktan-çoğa', 'İlişki yok'],
              dogru: 1,
              aciklama: 'Bir müşteriye karşılık çok sipariş: bire-çok.',
            ),
            Bosluk(
              soru: 'Birincil anahtar değeri tabloda ___ olmalıdır.',
              secenekler: ['NULL', 'tekrarlı', 'benzersiz', 'metin'],
              dogru: 2,
              aciklama: 'Her satırı tek başına belirlemesi için benzersizdir.',
            ),
            Bosluk(
              soru:
                  'siparisler tablosundaki urun_id, urunler tablosunun ___ sütununa bağlanır.',
              secenekler: ['ad', 'fiyat', 'kategori', 'id'],
              dogru: 3,
              aciklama: 'urun_id, urunler.id\'yi gösterir.',
            ),
            Yaz(
              soru: 'siparisler tablosundaki tüm satırları getir.',
              cevaplar: [
                'SELECT * FROM siparisler;',
                'SELECT * FROM siparisler',
              ],
              aciklama: 'SELECT * FROM siparisler; tüm satırları getirir.',
            ),
            Eslestir(
              soru: 'Terimi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'PRIMARY KEY', sag: 'satırı benzersiz belirler'),
                (sol: 'FOREIGN KEY', sag: 'başka tablodaki kaydı gösterir'),
                (sol: 'musteri_id', sag: 'siparişi veren müşterinin id\'si'),
                (sol: 'JOIN', sag: 'tabloları ilişkili sütundan birleştirir'),
              ],
              aciklama: 'Anahtarlar tabloları birbirine bağlar.',
            ),
            Kod(
              soru: 'Müşteri 1\'in siparişlerini getir.',
              kod: 'SELECT * FROM siparisler\nWHERE musteri_id ___ 1;',
              secenekler: ['<>', 'IS', '='],
              dogru: 2,
              dil: 'sql',
              aciklama: 'Eşitlik koşulu = ile yazılır.',
            ),
          ],
        ),
        Ders(
          id: 'sql-3-u1-d2',
          ad: 'INNER JOIN',
          dilbilgisiNotu:
              'JOIN, iki tabloyu ortak sütun üzerinden birleştirir. INNER JOIN yalnız iki tabloda da eşleşen satırları getirir: SELECT musteriler.ad, siparisler.adet FROM musteriler INNER JOIN siparisler ON siparisler.musteri_id = musteriler.id; ON, eşleşme koşuludur. Sütun hangi tablodansa tablo.sütun biçiminde yazılır. Sonuç: Ayşe 5, Ayşe 2, Mehmet 1, Zeynep 4, Zeynep 6 (5 satır). Siparişi olmayan Ali ve Can sonuçta görünmez.\n\nmusteriler (id | ad | sehir)\n1 | Ayşe | Ankara\n2 | Mehmet | İzmir\n3 | Zeynep | Ankara\n4 | Ali | NULL\n5 | Can | İstanbul\n\nsiparisler (id | musteri_id | urun_id | adet)\n1 | 1 | 1 | 5\n2 | 1 | 3 | 2\n3 | 2 | 5 | 1\n4 | 3 | 2 | 4\n5 | 3 | 4 | 6',
          alistirmalar: [
            Secim(
              soru:
                  'musteriler INNER JOIN siparisler (musteri_id = id) kaç satır verir?',
              secenekler: ['3', '2', '5', '10'],
              dogru: 2,
              aciklama: 'Her sipariş satırı bir müşteriyle eşleşir: 5 satır.',
            ),
            Secim(
              soru: 'INNER JOIN sonucunda siparişi olmayan Can görünür mü?',
              secenekler: [
                'Evet; adet NULL olarak',
                'Evet; adet 0 olarak',
                'Yalnız LIMIT varsa',
                'Hayır; eşleşen sipariş yok',
              ],
              dogru: 3,
              aciklama: 'INNER JOIN yalnız eşleşenleri getirir.',
            ),
            Secim(
              soru: 'Bu birleştirmede Zeynep için kaç satır çıkar?',
              secenekler: ['2', '1', '3', '0'],
              dogru: 0,
              aciklama: 'Zeynep\'in iki sipariş satırı var.',
            ),
            Secim(
              soru: 'INNER JOIN hangi satırları getirir?',
              secenekler: [
                'Soldaki tablonun tümünü',
                'İki tabloda eşleşenleri',
                'Sağdaki tablonun tümünü',
                'Yalnız eşleşmeyenleri',
              ],
              dogru: 1,
              aciklama: 'Kesişim: yalnız eşleşen satırlar.',
            ),
            Bosluk(
              soru:
                  'FROM musteriler INNER JOIN siparisler ___ siparisler.musteri_id = musteriler.id',
              secenekler: ['AT', 'IF', 'ON', 'BY'],
              dogru: 2,
              aciklama: 'Eşleşme koşulu ON ile yazılır.',
            ),
            Bosluk(
              soru: 'INNER JOIN yerine yalnız ___ de yazılabilir.',
              secenekler: ['MERGE', 'LINK', 'UNION', 'JOIN'],
              dogru: 3,
              aciklama: 'Yalın JOIN, INNER JOIN demektir.',
            ),
            Yaz(
              soru:
                  'musteriler ile siparisler\'i musteri_id eşleşmesiyle birleştirip müşteri adı ve adedi getir.',
              cevaplar: [
                'SELECT musteriler.ad, siparisler.adet FROM musteriler INNER JOIN siparisler ON siparisler.musteri_id = musteriler.id;',
                'SELECT musteriler.ad, siparisler.adet FROM musteriler INNER JOIN siparisler ON siparisler.musteri_id = musteriler.id',
                'SELECT musteriler.ad, siparisler.adet FROM musteriler JOIN siparisler ON siparisler.musteri_id = musteriler.id;',
                'SELECT musteriler.ad, siparisler.adet FROM musteriler JOIN siparisler ON siparisler.musteri_id = musteriler.id',
                'SELECT musteriler.ad, siparisler.adet FROM musteriler INNER JOIN siparisler ON musteriler.id = siparisler.musteri_id;',
                'SELECT musteriler.ad, siparisler.adet FROM musteriler INNER JOIN siparisler ON musteriler.id = siparisler.musteri_id',
                'SELECT musteriler.ad, siparisler.adet FROM musteriler JOIN siparisler ON musteriler.id = siparisler.musteri_id;',
                'SELECT musteriler.ad, siparisler.adet FROM musteriler JOIN siparisler ON musteriler.id = siparisler.musteri_id',
                'SELECT musteriler.ad, siparisler.adet FROM siparisler INNER JOIN musteriler ON siparisler.musteri_id = musteriler.id;',
                'SELECT musteriler.ad, siparisler.adet FROM siparisler INNER JOIN musteriler ON siparisler.musteri_id = musteriler.id',
                'SELECT musteriler.ad, siparisler.adet FROM siparisler JOIN musteriler ON siparisler.musteri_id = musteriler.id;',
                'SELECT musteriler.ad, siparisler.adet FROM siparisler JOIN musteriler ON siparisler.musteri_id = musteriler.id',
              ],
              aciklama: 'SELECT, FROM ... JOIN ... ON sırasıyla yazılır.',
            ),
            Sirala(
              soru: 'Yan tümceleri doğru sıraya diz.',
              kelimeler: [
                'FROM musteriler',
                'INNER JOIN siparisler',
                'SELECT musteriler.ad, siparisler.adet',
                'ON siparisler.musteri_id = musteriler.id',
              ],
              dogru: [
                'SELECT musteriler.ad, siparisler.adet',
                'FROM musteriler',
                'INNER JOIN siparisler',
                'ON siparisler.musteri_id = musteriler.id',
              ],
              aciklama: 'JOIN\'den sonra ON gelir.',
            ),
            Eslestir(
              soru: 'İfadeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'INNER JOIN', sag: 'yalnız eşleşen satırlar'),
                (sol: 'ON', sag: 'birleştirme koşulu'),
                (sol: 'musteriler.ad', sag: 'musteriler tablosunun ad sütunu'),
                (
                  sol: 'siparisler.adet',
                  sag: 'siparisler tablosunun adet sütunu',
                ),
              ],
              aciklama: 'tablo.sütun yazımı belirsizliği önler.',
            ),
            Kod(
              soru: 'Eşleşme koşulunu yaz.',
              kod:
                  'SELECT musteriler.ad, siparisler.adet\nFROM musteriler\nINNER JOIN siparisler\n___ siparisler.musteri_id = musteriler.id;',
              secenekler: ['WHERE', 'ON', 'HAVING'],
              dogru: 1,
              dil: 'sql',
              aciklama: 'JOIN koşulu ON ile verilir.',
            ),
          ],
        ),
        Ders(
          id: 'sql-3-u1-d3',
          ad: 'LEFT JOIN',
          dilbilgisiNotu:
              'LEFT JOIN, soldaki (FROM\'daki) tablonun tüm satırlarını getirir; sağ tabloda eşleşme yoksa sağ tablonun sütunları NULL olur. musteriler LEFT JOIN siparisler 7 satır verir: Ayşe 2, Mehmet 1, Zeynep 2, ayrıca siparişi olmayan Ali ve Can birer satır (adet NULL). Hiç siparişi olmayanları bulmak için WHERE siparisler.id IS NULL eklenir.\n\nmusteriler (id | ad | sehir)\n1 | Ayşe | Ankara\n2 | Mehmet | İzmir\n3 | Zeynep | Ankara\n4 | Ali | NULL\n5 | Can | İstanbul\n\nsiparisler (id | musteri_id | urun_id | adet)\n1 | 1 | 1 | 5\n2 | 1 | 3 | 2\n3 | 2 | 5 | 1\n4 | 3 | 2 | 4\n5 | 3 | 4 | 6',
          alistirmalar: [
            Secim(
              soru:
                  'musteriler LEFT JOIN siparisler (musteri_id = id) kaç satır verir?',
              secenekler: ['5', '2', '7', '3'],
              dogru: 2,
              aciklama: '5 eşleşen satır + eşleşmeyen Ali ve Can = 7.',
            ),
            Secim(
              soru:
                  'LEFT JOIN\'de siparişi olmayan Ali\'nin adet sütunu ne olur?',
              secenekler: ['0', 'Boş metin', 'Satır görünmez', 'NULL'],
              dogru: 3,
              aciklama:
                  'Eşleşmeyen satırlarda sağ tablonun sütunları NULL gelir.',
            ),
            Secim(
              soru:
                  'LEFT JOIN ... WHERE siparisler.id IS NULL kaç satır verir?',
              secenekler: ['2', '0', '5', '7'],
              dogru: 0,
              aciklama: 'Siparişi olmayan Ali ve Can.',
            ),
            Secim(
              soru: 'LEFT JOIN ile INNER JOIN farkı nedir?',
              secenekler: [
                'LEFT JOIN yalnız soldaki sütunları getirir',
                'LEFT JOIN soldaki tablonun eşleşmeyen satırlarını da tutar',
                'INNER JOIN eşleşmeyenleri de getirir',
                'Fark yoktur',
              ],
              dogru: 1,
              aciklama: 'LEFT JOIN sol tablonun tüm satırlarını korur.',
            ),
            Bosluk(
              soru:
                  'FROM musteriler ___ JOIN siparisler ON siparisler.musteri_id = musteriler.id',
              secenekler: ['ONLY', 'FIRST', 'LEFT', 'SIDE'],
              dogru: 2,
              aciklama: 'Soldaki tabloyu korumak için LEFT JOIN.',
            ),
            Bosluk(
              soru:
                  'Eşleşme bulunamayan satırlarda sağ tablonun sütunları ___ olur.',
              secenekler: ['0', 'boş metin', '-1', 'NULL'],
              dogru: 3,
              aciklama: 'Eşleşmeyenler NULL ile doldurulur.',
            ),
            Yaz(
              soru:
                  'Hiç siparişi olmayan müşterilerin adlarını getir (LEFT JOIN kullan).',
              cevaplar: [
                'SELECT musteriler.ad FROM musteriler LEFT JOIN siparisler ON siparisler.musteri_id = musteriler.id WHERE siparisler.id IS NULL;',
                'SELECT musteriler.ad FROM musteriler LEFT JOIN siparisler ON siparisler.musteri_id = musteriler.id WHERE siparisler.id IS NULL',
                'SELECT musteriler.ad FROM musteriler LEFT OUTER JOIN siparisler ON siparisler.musteri_id = musteriler.id WHERE siparisler.id IS NULL;',
                'SELECT musteriler.ad FROM musteriler LEFT OUTER JOIN siparisler ON siparisler.musteri_id = musteriler.id WHERE siparisler.id IS NULL',
                'SELECT musteriler.ad FROM musteriler LEFT JOIN siparisler ON musteriler.id = siparisler.musteri_id WHERE siparisler.id IS NULL;',
                'SELECT musteriler.ad FROM musteriler LEFT JOIN siparisler ON musteriler.id = siparisler.musteri_id WHERE siparisler.id IS NULL',
                'SELECT musteriler.ad FROM musteriler LEFT OUTER JOIN siparisler ON musteriler.id = siparisler.musteri_id WHERE siparisler.id IS NULL;',
                'SELECT musteriler.ad FROM musteriler LEFT OUTER JOIN siparisler ON musteriler.id = siparisler.musteri_id WHERE siparisler.id IS NULL',
              ],
              aciklama:
                  'LEFT JOIN yap, siparisler.id IS NULL ile eşleşmeyenleri seç.',
            ),
            Sirala(
              soru: 'Yan tümceleri doğru sıraya diz.',
              kelimeler: [
                'FROM musteriler',
                'LEFT JOIN siparisler',
                'SELECT musteriler.ad',
                'ON siparisler.musteri_id = musteriler.id',
                'WHERE siparisler.id IS NULL',
              ],
              dogru: [
                'SELECT musteriler.ad',
                'FROM musteriler',
                'LEFT JOIN siparisler',
                'ON siparisler.musteri_id = musteriler.id',
                'WHERE siparisler.id IS NULL',
              ],
              aciklama: 'Sıra: SELECT, FROM, JOIN, ON, WHERE.',
            ),
            Eslestir(
              soru: 'İfadeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'INNER JOIN', sag: 'yalnız eşleşenler'),
                (sol: 'LEFT JOIN', sag: 'soldaki tablonun tümü'),
                (sol: 'IS NULL', sag: 'eşleşmeyen satırları yakalar'),
                (sol: 'ON', sag: 'birleştirme koşulu'),
              ],
              aciklama: 'JOIN türü hangi satırların korunacağını belirler.',
            ),
            Kod(
              soru: 'Tüm müşterileri, siparişleriyle birlikte getir.',
              kod:
                  'SELECT musteriler.ad, siparisler.adet\nFROM musteriler\n___ JOIN siparisler\nON siparisler.musteri_id = musteriler.id;',
              secenekler: ['LEFT', 'INNER', 'ONLY'],
              dogru: 0,
              dil: 'sql',
              aciklama: 'Siparişi olmayanlar da gelsin diye LEFT JOIN gerekir.',
            ),
          ],
        ),
        Ders(
          id: 'sql-3-u1-d4',
          ad: 'Takma ad ve JOIN ile gruplama',
          dilbilgisiNotu:
              'Tablolara da takma ad verilir: FROM musteriler AS m INNER JOIN siparisler AS s ON s.musteri_id = m.id. Böylece m.ad, s.adet gibi kısa yazılır. Birleştirilmiş sonuç GROUP BY ile gruplanabilir: SELECT m.ad, SUM(s.adet) ... GROUP BY m.ad; Sonuç: Ayşe 7, Mehmet 1, Zeynep 10. Üç tablo birleştirmek için iki JOIN yazılır: siparisler s, urunler u ON s.urun_id = u.id. Ayşe\'nin harcaması SUM(s.adet * u.fiyat) = 5*12 + 2*30 = 120.\n\nurunler (id | ad | kategori | fiyat | stok)\n1 | Elma | Meyve | 12 | 40\n2 | Armut | Meyve | 18 | 25\n3 | Süt | İçecek | 30 | 60\n4 | Ayran | İçecek | 12 | 80\n5 | Peynir | Süt Ürünü | 90 | 15\n6 | Zeytin | Kahvaltılık | 60 | 20\n\nsiparisler (id | musteri_id | urun_id | adet)\n1 | 1 | 1 | 5\n2 | 1 | 3 | 2\n3 | 2 | 5 | 1\n4 | 3 | 2 | 4\n5 | 3 | 4 | 6',
          alistirmalar: [
            Secim(
              soru: 'Müşteri başına SUM(s.adet): Zeynep için sonuç kaçtır?',
              secenekler: ['4', '6', '10', '7'],
              dogru: 2,
              aciklama: '4 + 6 = 10.',
            ),
            Secim(
              soru: 'Ayşe\'nin toplam harcaması SUM(s.adet * u.fiyat) kaçtır?',
              secenekler: ['60', '7', '84', '120'],
              dogru: 3,
              aciklama: '5 x 12 + 2 x 30 = 60 + 60 = 120.',
            ),
            Secim(
              soru:
                  'Üç tabloyu (musteriler, siparisler, urunler) birleştirmek için kaç ON koşulu gerekir?',
              secenekler: ['2', '1', '3', '0'],
              dogru: 0,
              aciklama: 'Her JOIN kendi ON koşulunu ister: 2 JOIN, 2 ON.',
            ),
            Secim(
              soru: 'Takma ad (alias) ne işe yarar?',
              secenekler: [
                'Tabloyu siler',
                'Tablo adını kısaltıp sorguyu okunur kılar',
                'Tabloyu kopyalar',
                'Sorguyu hızlandırır',
              ],
              dogru: 1,
              aciklama: 'Alias yalnız o sorguda geçerli kısa bir addır.',
            ),
            Bosluk(
              soru: 'FROM musteriler ___ m',
              secenekler: ['IS', 'TO', 'AS', 'BY'],
              dogru: 2,
              aciklama: 'Tablo takma adı AS ile verilir.',
            ),
            Bosluk(
              soru: 'SELECT m.ad, SUM(s.adet) ... GROUP BY ___',
              secenekler: ['s.adet', 'SUM', 'm', 'm.ad'],
              dogru: 3,
              aciklama: 'Gruplama ölçütü SELECT\'teki gruplanmayan sütundur.',
            ),
            Yaz(
              soru:
                  'Her müşterinin adını ve toplam sipariş adedini getir (takma adlar m ve s; INNER JOIN).',
              cevaplar: [
                'SELECT m.ad, SUM(s.adet) FROM musteriler AS m INNER JOIN siparisler AS s ON s.musteri_id = m.id GROUP BY m.ad;',
                'SELECT m.ad, SUM(s.adet) FROM musteriler AS m INNER JOIN siparisler AS s ON s.musteri_id = m.id GROUP BY m.ad',
                'SELECT m.ad, SUM(s.adet) FROM musteriler AS m INNER JOIN siparisler AS s ON m.id = s.musteri_id GROUP BY m.ad;',
                'SELECT m.ad, SUM(s.adet) FROM musteriler AS m INNER JOIN siparisler AS s ON m.id = s.musteri_id GROUP BY m.ad',
                'SELECT m.ad, SUM(s.adet) FROM musteriler AS m JOIN siparisler AS s ON s.musteri_id = m.id GROUP BY m.ad;',
                'SELECT m.ad, SUM(s.adet) FROM musteriler AS m JOIN siparisler AS s ON s.musteri_id = m.id GROUP BY m.ad',
                'SELECT m.ad, SUM(s.adet) FROM musteriler AS m JOIN siparisler AS s ON m.id = s.musteri_id GROUP BY m.ad;',
                'SELECT m.ad, SUM(s.adet) FROM musteriler AS m JOIN siparisler AS s ON m.id = s.musteri_id GROUP BY m.ad',
                'SELECT m.ad, SUM(s.adet) FROM musteriler AS m INNER JOIN siparisler s ON s.musteri_id = m.id GROUP BY m.ad;',
                'SELECT m.ad, SUM(s.adet) FROM musteriler AS m INNER JOIN siparisler s ON s.musteri_id = m.id GROUP BY m.ad',
                'SELECT m.ad, SUM(s.adet) FROM musteriler AS m INNER JOIN siparisler s ON m.id = s.musteri_id GROUP BY m.ad;',
                'SELECT m.ad, SUM(s.adet) FROM musteriler AS m INNER JOIN siparisler s ON m.id = s.musteri_id GROUP BY m.ad',
                'SELECT m.ad, SUM(s.adet) FROM musteriler AS m JOIN siparisler s ON s.musteri_id = m.id GROUP BY m.ad;',
                'SELECT m.ad, SUM(s.adet) FROM musteriler AS m JOIN siparisler s ON s.musteri_id = m.id GROUP BY m.ad',
                'SELECT m.ad, SUM(s.adet) FROM musteriler AS m JOIN siparisler s ON m.id = s.musteri_id GROUP BY m.ad;',
                'SELECT m.ad, SUM(s.adet) FROM musteriler AS m JOIN siparisler s ON m.id = s.musteri_id GROUP BY m.ad',
                'SELECT m.ad, SUM(s.adet) FROM musteriler m INNER JOIN siparisler AS s ON s.musteri_id = m.id GROUP BY m.ad;',
                'SELECT m.ad, SUM(s.adet) FROM musteriler m INNER JOIN siparisler AS s ON s.musteri_id = m.id GROUP BY m.ad',
                'SELECT m.ad, SUM(s.adet) FROM musteriler m INNER JOIN siparisler AS s ON m.id = s.musteri_id GROUP BY m.ad;',
                'SELECT m.ad, SUM(s.adet) FROM musteriler m INNER JOIN siparisler AS s ON m.id = s.musteri_id GROUP BY m.ad',
                'SELECT m.ad, SUM(s.adet) FROM musteriler m JOIN siparisler AS s ON s.musteri_id = m.id GROUP BY m.ad;',
                'SELECT m.ad, SUM(s.adet) FROM musteriler m JOIN siparisler AS s ON s.musteri_id = m.id GROUP BY m.ad',
                'SELECT m.ad, SUM(s.adet) FROM musteriler m JOIN siparisler AS s ON m.id = s.musteri_id GROUP BY m.ad;',
                'SELECT m.ad, SUM(s.adet) FROM musteriler m JOIN siparisler AS s ON m.id = s.musteri_id GROUP BY m.ad',
                'SELECT m.ad, SUM(s.adet) FROM musteriler m INNER JOIN siparisler s ON s.musteri_id = m.id GROUP BY m.ad;',
                'SELECT m.ad, SUM(s.adet) FROM musteriler m INNER JOIN siparisler s ON s.musteri_id = m.id GROUP BY m.ad',
                'SELECT m.ad, SUM(s.adet) FROM musteriler m INNER JOIN siparisler s ON m.id = s.musteri_id GROUP BY m.ad;',
                'SELECT m.ad, SUM(s.adet) FROM musteriler m INNER JOIN siparisler s ON m.id = s.musteri_id GROUP BY m.ad',
                'SELECT m.ad, SUM(s.adet) FROM musteriler m JOIN siparisler s ON s.musteri_id = m.id GROUP BY m.ad;',
                'SELECT m.ad, SUM(s.adet) FROM musteriler m JOIN siparisler s ON s.musteri_id = m.id GROUP BY m.ad',
                'SELECT m.ad, SUM(s.adet) FROM musteriler m JOIN siparisler s ON m.id = s.musteri_id GROUP BY m.ad;',
                'SELECT m.ad, SUM(s.adet) FROM musteriler m JOIN siparisler s ON m.id = s.musteri_id GROUP BY m.ad',
              ],
              aciklama:
                  'JOIN\'den sonra GROUP BY m.ad ile müşteri başına topla.',
            ),
            Sirala(
              soru: 'Yan tümceleri doğru sıraya diz.',
              kelimeler: [
                'FROM musteriler AS m',
                'INNER JOIN siparisler AS s',
                'SELECT m.ad, SUM(s.adet)',
                'ON s.musteri_id = m.id',
                'GROUP BY m.ad',
              ],
              dogru: [
                'SELECT m.ad, SUM(s.adet)',
                'FROM musteriler AS m',
                'INNER JOIN siparisler AS s',
                'ON s.musteri_id = m.id',
                'GROUP BY m.ad',
              ],
              aciklama: 'JOIN ve ON, GROUP BY\'dan önce gelir.',
            ),
            Eslestir(
              soru: 'İfadeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'm', sag: 'musteriler için takma ad'),
                (sol: 's.adet', sag: 'siparisler tablosunun adet sütunu'),
                (sol: 'u.fiyat', sag: 'urunler tablosunun fiyat sütunu'),
                (sol: 'ON s.urun_id = u.id', sag: 'siparişi ürüne bağlar'),
              ],
              aciklama:
                  'Takma adlar ve tablo.sütun yazımı birleştirmeleri okunur kılar.',
            ),
            Kod(
              soru: 'Müşteri başına toplam adedi getir.',
              kod:
                  'SELECT m.ad, SUM(s.adet)\nFROM musteriler AS m\nINNER JOIN siparisler AS s ON s.musteri_id = m.id\n___ BY m.ad;',
              secenekler: ['ORDER', 'SORT', 'GROUP'],
              dogru: 2,
              dil: 'sql',
              aciklama: 'Müşteri başına toplam için GROUP BY.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'sql-3-u2',
      ad: 'Veriyi değiştirme ve tablo kurma',
      dersler: [
        Ders(
          id: 'sql-3-u2-d1',
          ad: 'INSERT',
          dilbilgisiNotu:
              'INSERT INTO tabloya yeni satır ekler: INSERT INTO urunler (id, ad, kategori, fiyat, stok) VALUES (7, \'Bal\', \'Kahvaltılık\', 120, 10); Sütun listesi ve VALUES değerleri aynı sayıda ve aynı sırada olmalıdır. Metinler tek tırnaklıdır. Yazılmayan sütun, DEFAULT ve NOT NULL yoksa NULL olur. Birden çok satır: VALUES (...), (...);\n\nurunler (id | ad | kategori | fiyat | stok)\n1 | Elma | Meyve | 12 | 40\n2 | Armut | Meyve | 18 | 25\n3 | Süt | İçecek | 30 | 60\n4 | Ayran | İçecek | 12 | 80\n5 | Peynir | Süt Ürünü | 90 | 15\n6 | Zeytin | Kahvaltılık | 60 | 20',
          alistirmalar: [
            Secim(
              soru: 'Tabloya yeni satır eklemek için hangi komut kullanılır?',
              secenekler: ['ADD ROW', 'PUSH', 'INSERT INTO', 'APPEND'],
              dogru: 2,
              aciklama: 'Satır eklemek için INSERT INTO kullanılır.',
            ),
            Secim(
              soru:
                  'INSERT INTO urunler (id, ad) VALUES (7, \'Bal\'); kaç satır ekler?',
              secenekler: ['2', '7', '0', '1'],
              dogru: 3,
              aciklama: 'Bir VALUES grubu, bir satır demektir.',
            ),
            Secim(
              soru:
                  'INSERT INTO urunler (id, ad, fiyat) VALUES (8, \'Su\', 5); sonrasında Su satırının kategori değeri ne olur? (DEFAULT ve NOT NULL yok)',
              secenekler: ['NULL', '0', '\'Su\'', 'Hata verir'],
              dogru: 0,
              aciklama: 'Değer verilmeyen sütun NULL olur.',
            ),
            Secim(
              soru:
                  'Sütun listesinde 3 sütun varsa VALUES içinde kaç değer olmalı?',
              secenekler: ['1', '3', '2', 'Fark etmez'],
              dogru: 1,
              aciklama: 'Sütun ve değer sayısı eşit olmalıdır.',
            ),
            Bosluk(
              soru: 'INSERT ___ urunler (id, ad) VALUES (9, \'Bal\');',
              secenekler: ['IN', 'TO', 'INTO', 'ON'],
              dogru: 2,
              aciklama: 'Biçim: INSERT INTO tablo.',
            ),
            Bosluk(
              soru: 'INSERT INTO urunler (id, ad) ___ (9, \'Bal\');',
              secenekler: ['SET', 'DATA', 'ROW', 'VALUES'],
              dogru: 3,
              aciklama: 'Değerler VALUES ile verilir.',
            ),
            Yaz(
              soru:
                  'urunler tablosuna id 7, ad \'Bal\' olan bir satır ekle (yalnız bu iki sütun).',
              cevaplar: [
                'INSERT INTO urunler (id, ad) VALUES (7, \'Bal\');',
                'INSERT INTO urunler (id, ad) VALUES (7, \'Bal\')',
                'INSERT INTO urunler(id, ad) VALUES (7, \'Bal\');',
                'INSERT INTO urunler(id, ad) VALUES (7, \'Bal\')',
                'INSERT INTO urunler (id,ad) VALUES (7,\'Bal\');',
                'INSERT INTO urunler (id,ad) VALUES (7,\'Bal\')',
                'INSERT INTO urunler(id,ad) VALUES(7,\'Bal\');',
                'INSERT INTO urunler(id,ad) VALUES(7,\'Bal\')',
                'INSERT INTO urunler (id, ad) VALUES(7, \'Bal\');',
                'INSERT INTO urunler (id, ad) VALUES(7, \'Bal\')',
              ],
              aciklama: 'INSERT INTO tablo (sütunlar) VALUES (değerler);',
            ),
            Sirala(
              soru: 'Komutu doğru sıraya diz.',
              kelimeler: [
                'INTO',
                'INSERT',
                '(7, \'Bal\')',
                'VALUES',
                '(id, ad)',
                'urunler',
              ],
              dogru: [
                'INSERT',
                'INTO',
                'urunler',
                '(id, ad)',
                'VALUES',
                '(7, \'Bal\')',
              ],
              aciklama: 'Önce hedef ve sütunlar, sonra VALUES ve değerler.',
            ),
            Eslestir(
              soru: 'İfadeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'INSERT INTO', sag: 'yeni satır ekler'),
                (sol: 'VALUES', sag: 'eklenecek değerler'),
                (sol: '(id, ad)', sag: 'doldurulacak sütunlar'),
                (sol: ';', sag: 'komutun sonu'),
              ],
              aciklama: 'INSERT komutunun parçaları.',
            ),
            Kod(
              soru: 'Yeni müşteri ekle.',
              kod:
                  'INSERT INTO musteriler (id, ad, sehir)\n___ (6, \'Deniz\', \'Bursa\');',
              secenekler: ['WHERE', 'VALUES', 'SET'],
              dogru: 1,
              dil: 'sql',
              aciklama: 'Değerler VALUES ile verilir.',
            ),
          ],
        ),
        Ders(
          id: 'sql-3-u2-d2',
          ad: 'UPDATE ve DELETE',
          dilbilgisiNotu:
              'UPDATE var olan satırları değiştirir: UPDATE urunler SET fiyat = 14 WHERE id = 1; SET ile yeni değer atanır, hesap da yapılabilir: SET stok = stok - 1. DELETE FROM satırları siler: DELETE FROM urunler WHERE id = 6; DİKKAT: WHERE yazmazsan tüm satırlar etkilenir. Güvenli yol: önce aynı WHERE ile SELECT çalıştırıp hangi satırların seçildiğine bak.\n\nurunler (id | ad | kategori | fiyat | stok)\n1 | Elma | Meyve | 12 | 40\n2 | Armut | Meyve | 18 | 25\n3 | Süt | İçecek | 30 | 60\n4 | Ayran | İçecek | 12 | 80\n5 | Peynir | Süt Ürünü | 90 | 15\n6 | Zeytin | Kahvaltılık | 60 | 20',
          alistirmalar: [
            Secim(
              soru:
                  'UPDATE urunler SET fiyat = 14; (WHERE yok) kaç satırı etkiler?',
              secenekler: [
                'Yalnız ilk satırı',
                'Hiçbirini',
                'Tüm satırları',
                'Yalnız son satırı',
              ],
              dogru: 2,
              aciklama: 'WHERE yoksa komut tablonun her satırına uygulanır.',
            ),
            Secim(
              soru:
                  'UPDATE urunler SET stok = stok - 1 WHERE id = 3; sonrasında Süt\'ün stoku kaçtır? (başlangıç 60)',
              secenekler: ['60', '1', '61', '59'],
              dogru: 3,
              aciklama: '60 - 1 = 59.',
            ),
            Secim(
              soru:
                  'DELETE FROM urunler WHERE fiyat > 50; hangi ürünleri siler?',
              secenekler: [
                'Peynir ve Zeytin',
                'Yalnız Peynir',
                'Peynir, Zeytin ve Süt',
                'Hepsini',
              ],
              dogru: 0,
              aciklama: 'Fiyatı 50\'den büyükler: Peynir (90), Zeytin (60).',
            ),
            Secim(
              soru:
                  'Bir satırın değerini değiştirmek için hangi komut kullanılır?',
              secenekler: ['MODIFY', 'UPDATE', 'CHANGE', 'ALTER ROW'],
              dogru: 1,
              aciklama: 'Değer değiştirmek için UPDATE kullanılır.',
            ),
            Bosluk(
              soru: 'UPDATE urunler ___ fiyat = 14 WHERE id = 1;',
              secenekler: ['TO', 'WITH', 'SET', 'IS'],
              dogru: 2,
              aciklama: 'Yeni değerler SET ile atanır.',
            ),
            Bosluk(
              soru: 'DELETE ___ urunler WHERE id = 6;',
              secenekler: ['INTO', 'OF', 'TABLE', 'FROM'],
              dogru: 3,
              aciklama: 'Biçim: DELETE FROM tablo.',
            ),
            Yaz(
              soru: 'id\'si 2 olan ürünün stokunu 30 yap.',
              cevaplar: [
                'UPDATE urunler SET stok = 30 WHERE id = 2;',
                'UPDATE urunler SET stok=30 WHERE id=2;',
                'UPDATE urunler SET stok = 30 WHERE id=2;',
                'UPDATE urunler SET stok=30 WHERE id = 2;',
              ],
              aciklama: 'UPDATE tablo SET sütun = değer WHERE koşul;',
            ),
            Sirala(
              soru: 'Komutu doğru sıraya diz.',
              kelimeler: [
                'urunler',
                'UPDATE',
                'id = 1',
                'WHERE',
                'fiyat = 15',
                'SET',
              ],
              dogru: [
                'UPDATE',
                'urunler',
                'SET',
                'fiyat = 15',
                'WHERE',
                'id = 1',
              ],
              aciklama: 'SET, WHERE\'den önce gelir.',
            ),
            Eslestir(
              soru: 'İfadeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'UPDATE', sag: 'mevcut satırı değiştirir'),
                (sol: 'SET', sag: 'yeni değeri atar'),
                (sol: 'DELETE FROM', sag: 'satırları siler'),
                (sol: 'WHERE', sag: 'hangi satırların etkileneceğini seçer'),
              ],
              aciklama:
                  'WHERE, değişiklik ve silmede en önemli güvenlik önlemidir.',
            ),
            Kod(
              soru: 'Stoğu 0 olan ürünleri sil.',
              kod: 'DELETE FROM urunler\n___ stok = 0;',
              secenekler: ['WHERE', 'SET', 'HAVING'],
              dogru: 0,
              dil: 'sql',
              aciklama: 'Silinecek satırlar WHERE ile seçilir.',
            ),
          ],
        ),
        Ders(
          id: 'sql-3-u2-d3',
          ad: 'CREATE TABLE ve veri tipleri',
          dilbilgisiNotu:
              'Yeni tablo CREATE TABLE ile kurulur: CREATE TABLE kategoriler (id INTEGER PRIMARY KEY, ad VARCHAR(50) NOT NULL, sira INTEGER DEFAULT 0); Sütun adından sonra tip yazılır. Yaygın tipler: INTEGER (tam sayı), NUMERIC(10, 2) (ondalıklı sayı, para), VARCHAR(n) ve TEXT (metin), DATE (tarih), BOOLEAN (doğru/yanlış). Kısıtlar: PRIMARY KEY (benzersiz kimlik), NOT NULL (boş olamaz), DEFAULT (değer verilmezse kullanılır).',
          alistirmalar: [
            Secim(
              soru: 'Yeni tablo oluşturmak için hangi komut kullanılır?',
              secenekler: [
                'NEW TABLE',
                'MAKE TABLE',
                'CREATE TABLE',
                'ADD TABLE',
              ],
              dogru: 2,
              aciklama: 'Tablo CREATE TABLE ile kurulur.',
            ),
            Secim(
              soru:
                  'Fiyat gibi ondalıklı para değerleri için hangi tip uygundur?',
              secenekler: ['INTEGER', 'DATE', 'BOOLEAN', 'NUMERIC(10, 2)'],
              dogru: 3,
              aciklama: 'NUMERIC, ondalıklı sayıları kesin saklar.',
            ),
            Secim(
              soru: 'NOT NULL ne demektir?',
              secenekler: [
                'Bu sütun boş (NULL) bırakılamaz',
                'Sütun yalnız sıfır olabilir',
                'Sütun silinemez',
                'Sütun metin olamaz',
              ],
              dogru: 0,
              aciklama: 'NOT NULL, değerin zorunlu olduğunu belirtir.',
            ),
            Secim(
              soru: 'DEFAULT 0 ne yapar?',
              secenekler: [
                'Değeri her zaman 0 yapar',
                'Değer verilmezse 0 kullanılır',
                'Sütunu siler',
                'Sütunu benzersiz yapar',
              ],
              dogru: 1,
              aciklama:
                  'DEFAULT, değer verilmeyen satırlara öntanımlı değeri atar.',
            ),
            Bosluk(
              soru:
                  'CREATE TABLE kategoriler (id INTEGER ___ KEY, ad VARCHAR(50));',
              secenekler: ['FOREIGN', 'UNIQUE', 'PRIMARY', 'MAIN'],
              dogru: 2,
              aciklama: 'PRIMARY KEY birincil anahtardır.',
            ),
            Bosluk(
              soru: 'Tarih bilgisi için ___ tipi kullanılır.',
              secenekler: ['TIMER', 'DAY', 'CALENDAR', 'DATE'],
              dogru: 3,
              aciklama: 'Tarihler DATE tipiyle saklanır.',
            ),
            Yaz(
              soru: 'Tek sütunlu (id INTEGER) etiketler tablosunu oluştur.',
              cevaplar: [
                'CREATE TABLE etiketler (id INTEGER);',
                'CREATE TABLE etiketler(id INTEGER);',
              ],
              aciklama: 'CREATE TABLE tablo (sütun TİP);',
            ),
            Sirala(
              soru: 'Komutu doğru sıraya diz.',
              kelimeler: [
                'ad TEXT)',
                'CREATE',
                'TABLE',
                '(id INTEGER,',
                'etiketler',
              ],
              dogru: [
                'CREATE',
                'TABLE',
                'etiketler',
                '(id INTEGER,',
                'ad TEXT)',
              ],
              aciklama: 'Tablo adından sonra parantez içinde sütunlar gelir.',
            ),
            Eslestir(
              soru: 'Tipi kullanım alanıyla eşleştir.',
              ciftler: [
                (sol: 'INTEGER', sag: 'tam sayı'),
                (sol: 'TEXT', sag: 'uzun metin'),
                (sol: 'DATE', sag: 'tarih'),
                (sol: 'NUMERIC(10, 2)', sag: 'ondalıklı sayı'),
              ],
              aciklama: 'Doğru tip, veriyi doğru saklar.',
            ),
            Kod(
              soru: 'Metin sütununun tipini yaz.',
              kod:
                  'CREATE TABLE kategoriler (\n  id INTEGER PRIMARY KEY,\n  ad ___(50) NOT NULL\n);',
              secenekler: ['INTEGER', 'DATE', 'VARCHAR'],
              dogru: 2,
              dil: 'sql',
              aciklama: '50 karakterlik metin için VARCHAR(50).',
            ),
          ],
        ),
        Ders(
          id: 'sql-3-u2-d4',
          ad: 'Alt sorgu',
          dilbilgisiNotu:
              'Alt sorgu, parantez içine alınmış bir SELECT\'tir ve dış sorgu onun sonucunu kullanır. Tek değer döndürürse karşılaştırmada kullanılır: WHERE fiyat > (SELECT AVG(fiyat) FROM urunler) (ortalama 37; Peynir ve Zeytin gelir). Liste döndürürse IN ile: WHERE id IN (SELECT urun_id FROM siparisler) sipariş verilmiş 5 ürünü getirir (Zeytin hiç sipariş edilmemiştir). İç sorgu önce çalışır.\n\nurunler (id | ad | kategori | fiyat | stok)\n1 | Elma | Meyve | 12 | 40\n2 | Armut | Meyve | 18 | 25\n3 | Süt | İçecek | 30 | 60\n4 | Ayran | İçecek | 12 | 80\n5 | Peynir | Süt Ürünü | 90 | 15\n6 | Zeytin | Kahvaltılık | 60 | 20\n\nsiparisler (id | musteri_id | urun_id | adet)\n1 | 1 | 1 | 5\n2 | 1 | 3 | 2\n3 | 2 | 5 | 1\n4 | 3 | 2 | 4\n5 | 3 | 4 | 6',
          alistirmalar: [
            Secim(
              soru:
                  'fiyat > (SELECT AVG(fiyat) FROM urunler) kaç ürün getirir?',
              secenekler: ['3', '4', '2', '6'],
              dogru: 2,
              aciklama:
                  'Ortalama 37; yalnız Peynir (90) ve Zeytin (60) üstündedir.',
            ),
            Secim(
              soru:
                  '(SELECT AVG(fiyat) FROM urunler) alt sorgusu hangi değeri verir?',
              secenekler: ['220', '6', '16', '37'],
              dogru: 3,
              aciklama: 'Fiyat ortalaması 37\'dir.',
            ),
            Secim(
              soru:
                  'WHERE id IN (SELECT urun_id FROM siparisler) kaç ürün getirir?',
              secenekler: ['5', '6', '3', '18'],
              dogru: 0,
              aciklama: 'Siparişlerde 5 farklı ürün var.',
            ),
            Secim(
              soru: 'Hangi ürün hiç sipariş edilmemiştir?',
              secenekler: ['Elma', 'Zeytin', 'Süt', 'Peynir'],
              dogru: 1,
              aciklama:
                  'urun_id değerleri 1, 3, 5, 2, 4; 6 numaralı Zeytin yok.',
            ),
            Bosluk(
              soru: 'Alt sorgu ___ içine alınır.',
              secenekler: [
                'tek tırnak',
                'köşeli parantez',
                'parantez ( )',
                'noktalı virgül',
              ],
              dogru: 2,
              aciklama: 'Alt sorgular parantezle yazılır.',
            ),
            Bosluk(
              soru: 'WHERE id ___ (SELECT urun_id FROM siparisler)',
              secenekler: ['ON', 'AT', 'OF', 'IN'],
              dogru: 3,
              aciklama: 'Liste döndüren alt sorguda IN kullanılır.',
            ),
            Yaz(
              soru:
                  'Fiyatı ortalama fiyattan yüksek ürünlerin adlarını getir (alt sorgu kullan).',
              cevaplar: [
                'SELECT ad FROM urunler WHERE fiyat > (SELECT AVG(fiyat) FROM urunler);',
                'SELECT ad FROM urunler WHERE fiyat > (SELECT AVG(fiyat) FROM urunler)',
              ],
              aciklama:
                  'Ortalamayı alt sorguyla hesapla, dış sorguda karşılaştır.',
            ),
            Sirala(
              soru: 'Parçaları doğru sıraya diz.',
              kelimeler: [
                'SELECT ad FROM urunler',
                '(SELECT MAX(fiyat) FROM urunler)',
                'WHERE fiyat >',
              ],
              dogru: [
                'SELECT ad FROM urunler',
                'WHERE fiyat >',
                '(SELECT MAX(fiyat) FROM urunler)',
              ],
              aciklama: 'Alt sorgu karşılaştırmanın sağ tarafına yazılır.',
            ),
            Eslestir(
              soru: 'İfadeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'iç sorgu', sag: 'önce çalışır'),
                (sol: 'dış sorgu', sag: 'iç sorgunun sonucunu kullanır'),
                (sol: 'IN (SELECT ...)', sag: 'liste içinde mi'),
                (sol: '(SELECT AVG(fiyat) ...)', sag: 'tek bir değer'),
              ],
              aciklama: 'Alt sorgu, sorgu içinde sorgudur.',
            ),
            Kod(
              soru: 'Ortalama fiyatın üstündeki ürünleri getir.',
              kod:
                  'SELECT ad FROM urunler\nWHERE fiyat > (SELECT ___(fiyat) FROM urunler);',
              secenekler: ['SUM', 'AVG', 'COUNT'],
              dogru: 1,
              dil: 'sql',
              aciklama: 'Ortalama için AVG.',
            ),
          ],
        ),
      ],
    ),
  ],
);
