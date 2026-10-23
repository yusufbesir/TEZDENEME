// SQL kursu 2/3 (kurs kimliği: sql-2). Alan: programlama (KursAlani.kod).
// Sahibi: Adım Adım uygulaması içerik ekibi; yazan: Claude (implementer, dalga5).
// Kurgusal market verisi (urunler, musteriler, siparisler); yalnız SQLite/PostgreSQL
// ortak standart SQL. Çıktı soruları sqlite3 ile doğrulandı. Değişiklik: kurs
// kimlikleri ve alıştırma türleri test/icerik_test.dart kurallarına uymalıdır.
import '../model/icerik.dart';

/// SQL Orta Düzey
const Kurs sql2 = Kurs(
  id: 'sql-2',
  ad: 'SQL Orta Düzey',
  aciklama:
      'COUNT, SUM, AVG, MIN, MAX ile hesapla; GROUP BY ve HAVING ile verileri grupla.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'sql-2-u1',
      ad: 'Toplama fonksiyonları',
      dersler: [
        Ders(
          id: 'sql-2-u1-d1',
          ad: 'COUNT',
          dilbilgisiNotu:
              'Toplama fonksiyonları birçok satırı tek değere indirir. COUNT(*) satır sayısını verir: SELECT COUNT(*) FROM urunler; COUNT(sütun) yalnız o sütunda NULL olmayan satırları sayar. COUNT(DISTINCT sütun) farklı değerleri sayar. WHERE ile birlikte yalnız süzülen satırlar sayılır.\n\nmusteriler (id | ad | sehir)\n1 | Ayşe | Ankara\n2 | Mehmet | İzmir\n3 | Zeynep | Ankara\n4 | Ali | NULL\n5 | Can | İstanbul',
          alistirmalar: [
            Secim(
              soru: 'SELECT COUNT(*) FROM urunler; sonucu kaçtır?',
              secenekler: ['6', '1', '5', '0'],
              dogru: 0,
              aciklama: 'urunler tablosunda 6 satır var.',
            ),
            Secim(
              soru: 'SELECT COUNT(*) FROM musteriler; sonucu kaçtır?',
              secenekler: ['4', '5', '1', '6'],
              dogru: 1,
              aciklama: 'musteriler tablosunda 5 satır var.',
            ),
            Secim(
              soru: 'SELECT COUNT(sehir) FROM musteriler; sonucu kaçtır?',
              secenekler: ['5', '1', '4', '0'],
              dogru: 2,
              aciklama: 'Ali\'nin şehri NULL olduğundan sayılmaz.',
            ),
            Bosluk(
              soru: 'COUNT(*) bir tablodaki ___ sayar.',
              secenekler: [
                'sütunları',
                'tabloları',
                'yalnız NULL\'ları',
                'satırları',
              ],
              dogru: 3,
              aciklama: 'COUNT(*) satır sayısını verir.',
            ),
            Bosluk(
              soru: 'COUNT(sehir), sehir değeri ___ olan satırları saymaz.',
              secenekler: ['NULL', '0', 'Ankara', 'tekrarlı'],
              dogru: 0,
              aciklama: 'COUNT(sütun) boş (NULL) değerleri atlar.',
            ),
            Yaz(
              soru: 'urunler tablosundaki satır sayısını getir.',
              cevaplar: [
                'SELECT COUNT(*) FROM urunler;',
                'SELECT COUNT(*) FROM urunler',
                'SELECT COUNT( * ) FROM urunler;',
                'SELECT COUNT( * ) FROM urunler',
              ],
              aciklama: 'COUNT(*) satır sayısını verir.',
            ),
            Sirala(
              soru: 'Sorguyu doğru sıraya diz.',
              kelimeler: ['FROM', 'COUNT(*)', 'musteriler', 'SELECT'],
              dogru: ['SELECT', 'COUNT(*)', 'FROM', 'musteriler'],
              aciklama: 'COUNT(*) SELECT listesine yazılır.',
            ),
            Eslestir(
              soru: 'İfadeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'COUNT(*)', sag: 'tüm satırların sayısı'),
                (
                  sol: 'COUNT(sehir)',
                  sag: 'şehri boş olmayan satırların sayısı',
                ),
                (
                  sol: 'COUNT(DISTINCT kategori)',
                  sag: 'farklı kategori sayısı',
                ),
                (sol: 'WHERE', sag: 'sayılacak satırları süzer'),
              ],
              aciklama: 'COUNT farklı biçimlerde farklı şeyleri sayar.',
            ),
            Isaretle(
              soru: 'Fonksiyon çağrısını işaretle.',
              cumle: 'SELECT COUNT(*) FROM urunler',
              dogru: [1],
              aciklama: 'COUNT(*) bir toplama fonksiyonudur.',
            ),
            Kod(
              soru: 'Sipariş satırı sayısını getir.',
              kod: 'SELECT ___(*)\nFROM siparisler;',
              secenekler: ['SUM', 'NAME', 'COUNT'],
              dogru: 2,
              dil: 'sql',
              aciklama: 'Satır sayısı için COUNT kullanılır.',
            ),
          ],
        ),
        Ders(
          id: 'sql-2-u1-d2',
          ad: 'SUM ve AVG',
          dilbilgisiNotu:
              'SUM toplamı, AVG ortalamayı verir: SELECT SUM(stok) FROM urunler; (toplam stok 240) ve SELECT AVG(fiyat) FROM urunler; (ortalama fiyat 37). İkisi de sayısal sütunlarda kullanılır ve NULL değerleri yok sayar. WHERE ile birlikte yalnız süzülen satırlar hesaba girer.\n\nurunler (id | ad | kategori | fiyat | stok)\n1 | Elma | Meyve | 12 | 40\n2 | Armut | Meyve | 18 | 25\n3 | Süt | İçecek | 30 | 60\n4 | Ayran | İçecek | 12 | 80\n5 | Peynir | Süt Ürünü | 90 | 15\n6 | Zeytin | Kahvaltılık | 60 | 20\n\nsiparisler (id | musteri_id | urun_id | adet)\n1 | 1 | 1 | 5\n2 | 1 | 3 | 2\n3 | 2 | 5 | 1\n4 | 3 | 2 | 4\n5 | 3 | 4 | 6',
          alistirmalar: [
            Secim(
              soru: 'SELECT SUM(stok) FROM urunler; sonucu kaçtır?',
              secenekler: ['40', '6', '220', '240'],
              dogru: 3,
              aciklama: '40+25+60+80+15+20 = 240.',
            ),
            Secim(
              soru: 'SELECT AVG(fiyat) FROM urunler; sonucu kaçtır?',
              secenekler: ['37', '220', '6', '36'],
              dogru: 0,
              aciklama: 'Fiyatların toplamı 222, 6\'ya bölünce 37.',
            ),
            Secim(
              soru: 'SELECT SUM(adet) FROM siparisler; sonucu kaçtır?',
              secenekler: ['6', '18', '5', '20'],
              dogru: 1,
              aciklama: '5+2+1+4+6 = 18.',
            ),
            Bosluk(
              soru: 'AVG, değerlerin ___ hesaplar.',
              secenekler: [
                'toplamını',
                'en büyüğünü',
                'ortalamasını',
                'sayısını',
              ],
              dogru: 2,
              aciklama: 'AVG ortalama (average) demektir.',
            ),
            Bosluk(
              soru:
                  'SELECT ___(fiyat) FROM urunler WHERE kategori = \'Meyve\'; sorgusu 30 verir.',
              secenekler: ['AVG', 'COUNT', 'MAX', 'SUM'],
              dogru: 3,
              aciklama: 'Elma (12) + Armut (18) = 30.',
            ),
            Yaz(
              soru: 'Toplam stok miktarını getiren sorguyu yaz.',
              cevaplar: [
                'SELECT SUM(stok) FROM urunler;',
                'SELECT SUM(stok) FROM urunler',
              ],
              aciklama: 'SUM(stok) stok sütununu toplar.',
            ),
            Eslestir(
              soru: 'Fonksiyonu anlamıyla eşleştir.',
              ciftler: [
                (sol: 'SUM', sag: 'toplam'),
                (sol: 'AVG', sag: 'ortalama'),
                (sol: 'COUNT', sag: 'satır sayısı'),
                (sol: 'WHERE', sag: 'hesaba girecek satırları süzer'),
              ],
              aciklama: 'SUM ve AVG sayısal sütunlarda çalışır.',
            ),
            Isaretle(
              soru: 'Ortalama fonksiyonunu işaretle.',
              cumle: 'SELECT AVG(fiyat) FROM urunler',
              dogru: [1],
              aciklama: 'AVG ortalama hesaplar.',
            ),
            Kod(
              soru: 'Toplam sipariş adedini getir.',
              kod: 'SELECT ___(adet)\nFROM siparisler;',
              secenekler: ['SUM', 'AVG', 'COUNT'],
              dogru: 0,
              dil: 'sql',
              aciklama: 'Toplam için SUM kullanılır; sonuç 18.',
            ),
            Sirala(
              soru: 'Sorguyu doğru sıraya diz.',
              kelimeler: ['FROM', 'AVG(fiyat)', 'urunler', 'SELECT'],
              dogru: ['SELECT', 'AVG(fiyat)', 'FROM', 'urunler'],
              aciklama: 'Fonksiyon SELECT listesine yazılır.',
            ),
          ],
        ),
        Ders(
          id: 'sql-2-u1-d3',
          ad: 'MIN ve MAX',
          dilbilgisiNotu:
              'MIN en küçük, MAX en büyük değeri verir: SELECT MIN(fiyat), MAX(fiyat) FROM urunler; sonuç 12 ve 90. Metin sütunlarında alfabetik en baştaki/en sondaki değeri bulurlar. Dikkat: en pahalı ürünün adını bulmak için ad ile MAX\'i aynı SELECT\'e yazma; ORDER BY fiyat DESC LIMIT 1 kullan.\n\nurunler (id | ad | kategori | fiyat | stok)\n1 | Elma | Meyve | 12 | 40\n2 | Armut | Meyve | 18 | 25\n3 | Süt | İçecek | 30 | 60\n4 | Ayran | İçecek | 12 | 80\n5 | Peynir | Süt Ürünü | 90 | 15\n6 | Zeytin | Kahvaltılık | 60 | 20',
          alistirmalar: [
            Secim(
              soru: 'SELECT MAX(fiyat) FROM urunler; sonucu kaçtır?',
              secenekler: ['60', '220', '90', '6'],
              dogru: 2,
              aciklama: 'En yüksek fiyat Peynir\'in 90\'ıdır.',
            ),
            Secim(
              soru: 'SELECT MIN(stok) FROM urunler; sonucu kaçtır?',
              secenekler: ['0', '20', '25', '15'],
              dogru: 3,
              aciklama: 'En düşük stok Peynir\'in 15\'idir.',
            ),
            Secim(
              soru:
                  'SELECT MIN(fiyat), MAX(fiyat) FROM urunler; hangi iki değeri verir?',
              secenekler: ['12 ve 90', '10 ve 90', '12 ve 60', '15 ve 90'],
              dogru: 0,
              aciklama: 'En ucuz 12, en pahalı 90.',
            ),
            Secim(
              soru: 'MAX bir metin sütununda kullanılabilir mi?',
              secenekler: [
                'Hayır; hata verir',
                'Evet; alfabetik sıraya göre sonuncuyu verir',
                'Evet; en uzun metni verir',
                'Evet; en kısa metni verir',
              ],
              dogru: 1,
              aciklama: 'Metinlerde MIN/MAX alfabetik sıraya göre çalışır.',
            ),
            Bosluk(
              soru: 'En küçük değeri bulmak için ___ fonksiyonu kullanılır.',
              secenekler: ['LOW', 'SMALL', 'MIN', 'FIRST'],
              dogru: 2,
              aciklama: 'MIN en küçüğü verir.',
            ),
            Bosluk(
              soru: 'SELECT ___(stok) FROM urunler; sorgusu 80 verir.',
              secenekler: ['MIN', 'SUM', 'AVG', 'MAX'],
              dogru: 3,
              aciklama: 'En yüksek stok Ayran\'ın 80\'idir.',
            ),
            Yaz(
              soru: 'En yüksek fiyatı getiren sorguyu yaz.',
              cevaplar: [
                'SELECT MAX(fiyat) FROM urunler;',
                'SELECT MAX(fiyat) FROM urunler',
              ],
              aciklama: 'MAX(fiyat) en büyük fiyatı verir.',
            ),
            Sirala(
              soru: 'İçeceklerin en düşük fiyatını getiren sorguyu diz.',
              kelimeler: [
                'WHERE',
                'urunler',
                'MIN(fiyat)',
                'kategori',
                'FROM',
                '\'İçecek\'',
                'SELECT',
                '=',
              ],
              dogru: [
                'SELECT',
                'MIN(fiyat)',
                'FROM',
                'urunler',
                'WHERE',
                'kategori',
                '=',
                '\'İçecek\'',
              ],
              aciklama: 'WHERE, FROM\'dan sonra gelir.',
            ),
            Eslestir(
              soru: 'Fonksiyonu anlamıyla eşleştir.',
              ciftler: [
                (sol: 'MIN', sag: 'en küçük değer'),
                (sol: 'MAX', sag: 'en büyük değer'),
                (sol: 'SUM', sag: 'toplam'),
                (sol: 'AVG', sag: 'ortalama'),
              ],
              aciklama: 'Dört temel toplama fonksiyonu.',
            ),
            Kod(
              soru: 'En pahalı içeceğin fiyatını getir.',
              kod:
                  'SELECT ___(fiyat)\nFROM urunler\nWHERE kategori = \'İçecek\';',
              secenekler: ['SUM', 'COUNT', 'MAX'],
              dogru: 2,
              dil: 'sql',
              aciklama: 'İçeceklerden Süt 30 ile en pahalıdır.',
            ),
          ],
        ),
        Ders(
          id: 'sql-2-u1-d4',
          ad: 'Hesaplama ve metin fonksiyonları',
          dilbilgisiNotu:
              'Sayı ve metinler için işlevler vardır: ROUND(sayi, n) n ondalığa yuvarlar; UPPER büyük, LOWER küçük harfe çevirir; LENGTH karakter sayısını verir; || iki metni birleştirir: \'Süt\' || \' taze\' sonucu \'Süt taze\'. Bunlar her satıra ayrı uygulanır: SELECT UPPER(ad) FROM urunler;',
          alistirmalar: [
            Secim(
              soru: 'SELECT UPPER(\'elma\'); sonucu nedir?',
              secenekler: ['elma', 'Elma', 'ELMA', '4'],
              dogru: 2,
              aciklama: 'UPPER metni büyük harfe çevirir.',
            ),
            Secim(
              soru: 'SELECT LENGTH(\'Peynir\'); sonucu kaçtır?',
              secenekler: ['5', '7', '1', '6'],
              dogru: 3,
              aciklama: 'Peynir 6 harflidir.',
            ),
            Secim(
              soru: 'SELECT ROUND(3.14159, 2); sonucu nedir?',
              secenekler: ['3.14', '3.1', '3.15', '3'],
              dogru: 0,
              aciklama: 'İki ondalığa yuvarlanır: 3.14.',
            ),
            Secim(
              soru: 'SELECT \'Süt\' || \' taze\'; sonucu nedir?',
              secenekler: [
                'Süt || taze',
                'Süt taze',
                'Süt+taze',
                '\'Süt\' \' taze\'',
              ],
              dogru: 1,
              aciklama: '|| iki metni art arda ekler.',
            ),
            Bosluk(
              soru:
                  'Metni küçük harfe çevirmek için ___ fonksiyonu kullanılır.',
              secenekler: ['SMALL', 'DOWN', 'LOWER', 'TRIM'],
              dogru: 2,
              aciklama: 'LOWER küçük harfe çevirir.',
            ),
            Bosluk(
              soru: 'İki metni birleştirmek için ___ işleci kullanılır.',
              secenekler: ['+', '&', '.', '||'],
              dogru: 3,
              aciklama: 'Standart SQL\'de metin birleştirme || ile yapılır.',
            ),
            Yaz(
              soru:
                  'urunler tablosunda ad sütununu büyük harfe çevirerek getir.',
              cevaplar: [
                'SELECT UPPER(ad) FROM urunler;',
                'SELECT UPPER(ad) FROM urunler',
              ],
              aciklama: 'UPPER(ad) her adı büyük harfe çevirir.',
            ),
            Sirala(
              soru: 'Sorguyu doğru sıraya diz.',
              kelimeler: [
                'LENGTH(ad)',
                'UPPER(ad),',
                'FROM',
                'SELECT',
                'urunler',
              ],
              dogru: ['SELECT', 'UPPER(ad),', 'LENGTH(ad)', 'FROM', 'urunler'],
              aciklama: 'Fonksiyonlar SELECT listesine virgülle yazılır.',
            ),
            Eslestir(
              soru: 'Fonksiyonu anlamıyla eşleştir.',
              ciftler: [
                (sol: 'UPPER', sag: 'büyük harfe çevirir'),
                (sol: 'LOWER', sag: 'küçük harfe çevirir'),
                (sol: 'LENGTH', sag: 'karakter sayısını verir'),
                (sol: 'ROUND', sag: 'sayıyı yuvarlar'),
              ],
              aciklama: 'Metin ve sayı fonksiyonları satır satır çalışır.',
            ),
            Kod(
              soru: 'Her ürün adının karakter sayısını getir.',
              kod: 'SELECT ___(ad) FROM urunler;',
              secenekler: ['COUNT', 'LENGTH', 'SIZE'],
              dogru: 1,
              dil: 'sql',
              aciklama: 'Karakter sayısı için LENGTH kullanılır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'sql-2-u2',
      ad: 'Gruplama',
      dersler: [
        Ders(
          id: 'sql-2-u2-d1',
          ad: 'GROUP BY',
          dilbilgisiNotu:
              'GROUP BY, aynı değeri taşıyan satırları gruplar ve her grup için tek satır üretir: SELECT kategori, COUNT(*) FROM urunler GROUP BY kategori; Sonuç: Meyve 2, İçecek 2, Süt Ürünü 1, Kahvaltılık 1. Standart SQL\'de SELECT listesinde yalnız gruplanan sütunlar ve toplama fonksiyonları bulunabilir. NULL değerler ayrı bir grup olur.\n\nurunler (id | ad | kategori | fiyat | stok)\n1 | Elma | Meyve | 12 | 40\n2 | Armut | Meyve | 18 | 25\n3 | Süt | İçecek | 30 | 60\n4 | Ayran | İçecek | 12 | 80\n5 | Peynir | Süt Ürünü | 90 | 15\n6 | Zeytin | Kahvaltılık | 60 | 20',
          alistirmalar: [
            Secim(
              soru:
                  'SELECT kategori, COUNT(*) FROM urunler GROUP BY kategori; kaç satır döndürür?',
              secenekler: ['6', '2', '4', '1'],
              dogru: 2,
              aciklama: 'Dört farklı kategori, dört grup.',
            ),
            Secim(
              soru: 'Bu sorguda Meyve kategorisi için COUNT(*) kaçtır?',
              secenekler: ['1', '3', '6', '2'],
              dogru: 3,
              aciklama: 'Elma ve Armut: 2 ürün.',
            ),
            Secim(
              soru: 'GROUP BY ne yapar?',
              secenekler: [
                'Aynı değeri taşıyan satırları gruplar',
                'Satırları sıralar',
                'Satırları siler',
                'Tabloları birleştirir',
              ],
              dogru: 0,
              aciklama: 'Her grup için tek sonuç satırı üretilir.',
            ),
            Secim(
              soru:
                  'musteriler tablosunu sehir\'e göre gruplarsak (NULL ayrı grup) kaç satır çıkar?',
              secenekler: ['5', '4', '3', '2'],
              dogru: 1,
              aciklama: 'Ankara, İzmir, İstanbul ve NULL: dört grup.',
            ),
            Bosluk(
              soru: 'SELECT kategori, SUM(stok) FROM urunler ___ BY kategori;',
              secenekler: ['ORDER', 'SORT', 'GROUP', 'SET'],
              dogru: 2,
              aciklama: 'Gruplama GROUP BY ile yapılır.',
            ),
            Bosluk(
              soru:
                  'GROUP BY kategori kullanan sorguda, standart SQL\'de SELECT listesine kategori ile birlikte ___ yazılabilir.',
              secenekler: ['ad', 'id', 'fiyat', 'COUNT(*)'],
              dogru: 3,
              aciklama:
                  'Gruplanmayan sütunlar doğrudan yazılamaz; toplama fonksiyonu gerekir.',
            ),
            Yaz(
              soru: 'Her şehirdeki müşteri sayısını getir (sehir ve sayı).',
              cevaplar: [
                'SELECT sehir, COUNT(*) FROM musteriler GROUP BY sehir;',
                'SELECT sehir, COUNT(*) FROM musteriler GROUP BY sehir',
              ],
              aciklama: 'sehir\'e göre gruplayıp COUNT(*) al.',
            ),
            Sirala(
              soru: 'Sorguyu doğru sıraya diz.',
              kelimeler: [
                'BY',
                'GROUP',
                'COUNT(*)',
                'kategori',
                'urunler',
                'FROM',
                'SELECT',
                'kategori,',
              ],
              dogru: [
                'SELECT',
                'kategori,',
                'COUNT(*)',
                'FROM',
                'urunler',
                'GROUP',
                'BY',
                'kategori',
              ],
              aciklama: 'GROUP BY, FROM\'dan sonra gelir.',
            ),
            Eslestir(
              soru: 'İfadeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'GROUP BY', sag: 'satırları gruplar'),
                (sol: 'COUNT(*)', sag: 'gruptaki satır sayısı'),
                (sol: 'SUM(stok)', sag: 'gruptaki toplam stok'),
                (sol: 'kategori', sag: 'gruplama ölçütü olan sütun'),
              ],
              aciklama: 'Her grup tek satıra indirgenir.',
            ),
            Kod(
              soru: 'Kategoriye göre toplam stoku getir.',
              kod: 'SELECT kategori, SUM(stok)\nFROM urunler\nGROUP BY ___;',
              secenekler: ['kategori', 'stok', 'SUM'],
              dogru: 0,
              dil: 'sql',
              aciklama: 'Gruplama ölçütü kategori sütunudur.',
            ),
          ],
        ),
        Ders(
          id: 'sql-2-u2-d2',
          ad: 'Gruplarda toplam ve ortalama',
          dilbilgisiNotu:
              'Bir sorguda birden çok toplama fonksiyonu kullanabilirsin: SELECT kategori, SUM(stok) AS toplam_stok, AVG(fiyat) AS ort_fiyat FROM urunler GROUP BY kategori; Sonuç: Meyve 65 ve 15; İçecek 140 ve 21; Süt Ürünü 15 ve 90; Kahvaltılık 20 ve 60. Gruplanmış sonucu ORDER BY SUM(stok) DESC gibi bir toplamla sıralayabilirsin.\n\nurunler (id | ad | kategori | fiyat | stok)\n1 | Elma | Meyve | 12 | 40\n2 | Armut | Meyve | 18 | 25\n3 | Süt | İçecek | 30 | 60\n4 | Ayran | İçecek | 12 | 80\n5 | Peynir | Süt Ürünü | 90 | 15\n6 | Zeytin | Kahvaltılık | 60 | 20',
          alistirmalar: [
            Secim(
              soru: 'Kategori başına SUM(stok): İçecek için sonuç kaçtır?',
              secenekler: ['60', '80', '140', '240'],
              dogru: 2,
              aciklama: 'Süt 60 + Ayran 80 = 140.',
            ),
            Secim(
              soru: 'Kategori başına AVG(fiyat): Meyve için sonuç kaçtır?',
              secenekler: ['30', '18', '16', '15'],
              dogru: 3,
              aciklama: '(12 + 18) / 2 = 15.',
            ),
            Secim(
              soru:
                  'Gruplanmış sonucu gruptaki toplam stoka göre büyükten küçüğe sıralamak için ne yazılır?',
              secenekler: [
                'ORDER BY SUM(stok) DESC',
                'SORT SUM(stok)',
                'GROUP BY SUM(stok)',
                'ORDER GROUP DESC',
              ],
              dogru: 0,
              aciklama: 'ORDER BY, toplama fonksiyonuyla da kullanılabilir.',
            ),
            Bosluk(
              soru:
                  'SELECT kategori, SUM(stok) ___ toplam_stok FROM urunler GROUP BY kategori;',
              secenekler: ['IS', 'AS', 'AT', 'TO'],
              dogru: 1,
              aciklama: 'Takma ad AS ile verilir.',
            ),
            Bosluk(
              soru:
                  'SELECT kategori, ___(fiyat) FROM urunler GROUP BY kategori; her kategorinin en yüksek fiyatını verir.',
              secenekler: ['MIN', 'SUM', 'MAX', 'COUNT'],
              dogru: 2,
              aciklama: 'En yüksek değer için MAX.',
            ),
            Yaz(
              soru:
                  'Her kategorinin ortalama fiyatını getir (kategori ve ortalama).',
              cevaplar: [
                'SELECT kategori, AVG(fiyat) FROM urunler GROUP BY kategori;',
                'SELECT kategori, AVG(fiyat) FROM urunler GROUP BY kategori',
              ],
              aciklama: 'AVG(fiyat) ile GROUP BY kategori.',
            ),
            Sirala(
              soru: 'Yan tümceleri doğru sıraya diz.',
              kelimeler: [
                'FROM urunler',
                'GROUP BY kategori',
                'SELECT kategori, COUNT(*)',
              ],
              dogru: [
                'SELECT kategori, COUNT(*)',
                'FROM urunler',
                'GROUP BY kategori',
              ],
              aciklama: 'SELECT, FROM, GROUP BY sırası.',
            ),
            Tablo(
              soru: 'Kategori sonuçlarını tamamla.',
              baslik: ['kategori', 'COUNT(*)', 'SUM(stok)'],
              satirlar: [
                ['Meyve', '2', '65'],
                ['İçecek', '2', '140'],
                ['Süt Ürünü', '1', '15'],
                ['Kahvaltılık', '1', '20'],
              ],
              bos: [
                (satir: 1, sutun: 2),
                (satir: 2, sutun: 1),
                (satir: 3, sutun: 2),
              ],
              secenekler: ['1', '2', '15', '20', '65', '140'],
              aciklama:
                  'İçeceklerin stoku 140; Süt Ürünü tek ürün; Kahvaltılık stoku 20.',
            ),
            Eslestir(
              soru: 'İfadeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'SUM(stok)', sag: 'gruptaki toplam stok'),
                (sol: 'AVG(fiyat)', sag: 'gruptaki ortalama fiyat'),
                (sol: 'MAX(fiyat)', sag: 'gruptaki en yüksek fiyat'),
                (sol: 'COUNT(*)', sag: 'gruptaki ürün sayısı'),
              ],
              aciklama: 'Her fonksiyon grup içindeki satırlara uygulanır.',
            ),
            Kod(
              soru: 'Her kategorideki ürün sayısını getir.',
              kod: 'SELECT kategori, ___(*)\nFROM urunler\nGROUP BY kategori;',
              secenekler: ['SUM', 'COUNT', 'MAX'],
              dogru: 1,
              dil: 'sql',
              aciklama: 'Satır sayısı için COUNT.',
            ),
          ],
        ),
        Ders(
          id: 'sql-2-u2-d3',
          ad: 'HAVING',
          dilbilgisiNotu:
              'HAVING, grupları toplam sonuçlarına göre süzer: SELECT kategori, COUNT(*) FROM urunler GROUP BY kategori HAVING COUNT(*) > 1; Bu sorgu yalnız Meyve ve İçecek\'i getirir. HAVING, GROUP BY\'dan sonra yazılır. Grupların toplam sonuçları: kategori başına SUM(stok) Meyve 65, İçecek 140, Süt Ürünü 15, Kahvaltılık 20; AVG(fiyat) 15, 21, 90, 60.\n\nurunler (id | ad | kategori | fiyat | stok)\n1 | Elma | Meyve | 12 | 40\n2 | Armut | Meyve | 18 | 25\n3 | Süt | İçecek | 30 | 60\n4 | Ayran | İçecek | 12 | 80\n5 | Peynir | Süt Ürünü | 90 | 15\n6 | Zeytin | Kahvaltılık | 60 | 20',
          alistirmalar: [
            Secim(
              soru: 'HAVING COUNT(*) > 1 ile kaç kategori kalır?',
              secenekler: ['4', '2', '1', '3'],
              dogru: 1,
              aciklama: 'Yalnız Meyve ve İçecek\'te birden fazla ürün var.',
            ),
            Secim(
              soru: 'HAVING SUM(stok) > 50 ile hangi kategoriler kalır?',
              secenekler: [
                'Yalnız İçecek',
                'Meyve, İçecek, Kahvaltılık',
                'Meyve ve İçecek',
                'Hepsi',
              ],
              dogru: 2,
              aciklama: 'Meyve 65, İçecek 140; diğerleri 50\'nin altında.',
            ),
            Secim(
              soru: 'HAVING AVG(fiyat) > 20 ile kaç kategori kalır?',
              secenekler: ['2', '4', '1', '3'],
              dogru: 3,
              aciklama: 'İçecek 21, Süt Ürünü 90, Kahvaltılık 60.',
            ),
            Secim(
              soru: 'HAVING neyi süzer?',
              secenekler: [
                'Grupları (toplam sonuçlarına göre)',
                'Tek tek satırları',
                'Sütun adlarını',
                'Tablo adını',
              ],
              dogru: 0,
              aciklama: 'HAVING, gruplama sonrası çalışır.',
            ),
            Bosluk(
              soru: 'GROUP BY kategori ___ COUNT(*) > 1',
              secenekler: ['WHERE', 'HAVING', 'IF', 'WHEN'],
              dogru: 1,
              aciklama: 'Grup koşulu HAVING ile yazılır.',
            ),
            Bosluk(
              soru: 'HAVING, ___ BY\'dan sonra yazılır.',
              secenekler: ['ORDER', 'SELECT', 'GROUP', 'LIMIT'],
              dogru: 2,
              aciklama: 'Sıra: GROUP BY, sonra HAVING.',
            ),
            Yaz(
              soru:
                  'Birden fazla ürünü olan kategorileri ve ürün sayılarını getir.',
              cevaplar: [
                'SELECT kategori, COUNT(*) FROM urunler GROUP BY kategori HAVING COUNT(*) > 1;',
                'SELECT kategori, COUNT(*) FROM urunler GROUP BY kategori HAVING COUNT(*) > 1',
              ],
              aciklama: 'GROUP BY ile grupla, HAVING ile süz.',
            ),
            Sirala(
              soru: 'Yan tümceleri doğru sıraya diz.',
              kelimeler: [
                'FROM urunler',
                'GROUP BY kategori',
                'SELECT kategori, SUM(stok)',
                'HAVING SUM(stok) > 50',
              ],
              dogru: [
                'SELECT kategori, SUM(stok)',
                'FROM urunler',
                'GROUP BY kategori',
                'HAVING SUM(stok) > 50',
              ],
              aciklama: 'HAVING, GROUP BY\'dan sonra gelir.',
            ),
            Eslestir(
              soru: 'Yan tümceyi görevi ile eşleştir.',
              ciftler: [
                (sol: 'WHERE', sag: 'satırları gruplamadan önce süzer'),
                (sol: 'GROUP BY', sag: 'satırları gruplar'),
                (sol: 'HAVING', sag: 'grupları süzer'),
                (sol: 'ORDER BY', sag: 'sonucu sıralar'),
              ],
              aciklama: 'Her yan tümce sorgunun farklı bir aşamasında çalışır.',
            ),
            Kod(
              soru: 'Birden fazla ürünü olan kategorileri getir.',
              kod:
                  'SELECT kategori, COUNT(*)\nFROM urunler\nGROUP BY kategori\n___ COUNT(*) > 1;',
              secenekler: ['HAVING', 'WHERE', 'AND'],
              dogru: 0,
              dil: 'sql',
              aciklama: 'Grup koşulu HAVING ile yazılır.',
            ),
          ],
        ),
        Ders(
          id: 'sql-2-u2-d4',
          ad: 'WHERE ile HAVING farkı ve sorgu sırası',
          dilbilgisiNotu:
              'WHERE satırları gruplamadan önce, HAVING grupları gruplamadan sonra süzer. Toplama fonksiyonları WHERE\'de kullanılamaz. Yazım sırası: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT. Örnek: SELECT kategori, COUNT(*) FROM urunler WHERE stok > 20 GROUP BY kategori HAVING COUNT(*) > 1; Önce stoğu 20\'den fazla 4 ürün kalır, sonra gruplanır; Meyve 2 ve İçecek 2 çıkar.\n\nurunler (id | ad | kategori | fiyat | stok)\n1 | Elma | Meyve | 12 | 40\n2 | Armut | Meyve | 18 | 25\n3 | Süt | İçecek | 30 | 60\n4 | Ayran | İçecek | 12 | 80\n5 | Peynir | Süt Ürünü | 90 | 15\n6 | Zeytin | Kahvaltılık | 60 | 20',
          alistirmalar: [
            Secim(
              soru:
                  'WHERE stok > 20 GROUP BY kategori HAVING COUNT(*) > 1 kaç satır verir?',
              secenekler: ['4', '2', '0', '1'],
              dogru: 1,
              aciklama:
                  'Stoğu 20\'den fazla ürünler Elma, Armut, Süt, Ayran; Meyve ve İçecek ikişer ürünlü.',
            ),
            Secim(
              soru: 'Hangisi doğru yazım sırasıdır?',
              secenekler: [
                'SELECT, WHERE, FROM, GROUP BY, ORDER BY, HAVING',
                'FROM, SELECT, GROUP BY, WHERE, HAVING, ORDER BY',
                'SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY',
                'SELECT, FROM, GROUP BY, WHERE, ORDER BY, HAVING',
              ],
              dogru: 2,
              aciklama: 'Yazım sırası sabittir.',
            ),
            Secim(
              soru:
                  '"Fiyatı 20\'den büyük ürünleri say" ve "ortalaması 20\'den büyük kategorileri bul" için sırayla ne gerekir?',
              secenekler: [
                'HAVING ve WHERE',
                'İkisi de WHERE',
                'İkisi de HAVING',
                'WHERE ve HAVING',
              ],
              dogru: 3,
              aciklama: 'Satır koşulu WHERE, grup koşulu HAVING ile yazılır.',
            ),
            Secim(
              soru: 'Hangi koşul WHERE içinde yazılamaz?',
              secenekler: [
                'COUNT(*) > 1',
                'fiyat > 10',
                'kategori = \'Meyve\'',
                'stok < 50',
              ],
              dogru: 0,
              aciklama:
                  'Toplama fonksiyonları WHERE\'de kullanılamaz; HAVING gerekir.',
            ),
            Bosluk(
              soru: 'Satırları gruplamadan önce süzmek için ___ kullanılır.',
              secenekler: ['HAVING', 'WHERE', 'LIMIT', 'ORDER BY'],
              dogru: 1,
              aciklama: 'Satır süzgeci WHERE\'dir.',
            ),
            Bosluk(
              soru: 'Grupların toplam sonuçlarını süzmek için ___ kullanılır.',
              secenekler: ['WHERE', 'FROM', 'HAVING', 'DISTINCT'],
              dogru: 2,
              aciklama: 'Grup süzgeci HAVING\'dir.',
            ),
            Yaz(
              soru:
                  'Stoğu 20\'den fazla ürünleri kategoriye göre gruplayıp her kategorideki ürün sayısını getir.',
              cevaplar: [
                'SELECT kategori, COUNT(*) FROM urunler WHERE stok > 20 GROUP BY kategori;',
                'SELECT kategori, COUNT(*) FROM urunler WHERE stok > 20 GROUP BY kategori',
              ],
              aciklama: 'Önce WHERE ile süz, sonra GROUP BY ile grupla.',
            ),
            Sirala(
              soru: 'Yan tümceleri doğru sıraya diz.',
              kelimeler: [
                'ORDER BY kategori',
                'WHERE stok > 20',
                'SELECT kategori, COUNT(*)',
                'FROM urunler',
                'GROUP BY kategori',
                'HAVING COUNT(*) > 1',
              ],
              dogru: [
                'SELECT kategori, COUNT(*)',
                'FROM urunler',
                'WHERE stok > 20',
                'GROUP BY kategori',
                'HAVING COUNT(*) > 1',
                'ORDER BY kategori',
              ],
              aciklama:
                  'Yazım sırası: SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY.',
            ),
            Eslestir(
              soru: 'Yan tümceyi görevi ile eşleştir.',
              ciftler: [
                (sol: 'SELECT', sag: 'listelenecek sütunlar'),
                (sol: 'FROM', sag: 'kaynak tablo'),
                (sol: 'WHERE', sag: 'satır süzgeci'),
                (sol: 'HAVING', sag: 'grup süzgeci'),
              ],
              aciklama: 'Dört yan tümce sorgunun omurgasıdır.',
            ),
            Kod(
              soru: 'Önce fiyatı 10\'dan büyük satırları süz, sonra grupla.',
              kod:
                  'SELECT kategori, SUM(stok)\nFROM urunler\n___ fiyat > 10\nGROUP BY kategori;',
              secenekler: ['HAVING', 'LIMIT', 'WHERE'],
              dogru: 2,
              dil: 'sql',
              aciklama: 'Satır süzgeci gruplamadan önce WHERE ile yazılır.',
            ),
          ],
        ),
      ],
    ),
  ],
);
