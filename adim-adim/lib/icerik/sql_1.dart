// SQL kursu 1/3 (kurs kimliği: sql-1). Alan: programlama (KursAlani.kod).
// Sahibi: Adım Adım uygulaması içerik ekibi; yazan: Claude (implementer, dalga5).
// Kurgusal market verisi (urunler, musteriler, siparisler); yalnız SQLite/PostgreSQL
// ortak standart SQL. Çıktı soruları sqlite3 ile doğrulandı. Değişiklik: kurs
// kimlikleri ve alıştırma türleri test/icerik_test.dart kurallarına uymalıdır.
import '../model/icerik.dart';

/// SQL'e Giriş
const Kurs sql1 = Kurs(
  id: 'sql-1',
  ad: 'SQL\'e Giriş',
  aciklama:
      'Market tablosu üzerinde SELECT, WHERE, ORDER BY ve LIMIT ile SQL sorgularının temelini sıfırdan öğren.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'sql-1-u1',
      ad: 'İlk sorgular',
      dersler: [
        Ders(
          id: 'sql-1-u1-d1',
          ad: 'Tablo ve SELECT',
          dilbilgisiNotu:
              'Veritabanında veriler tablolarda tutulur. Tablo; sütunlardan (özellikler) ve satırlardan (kayıtlar) oluşur. Veriyi okumak için SELECT ile sütunları, FROM ile tabloyu belirtirsin: SELECT ad FROM urunler; Sorgu noktalı virgülle biter. Bu kursta şu kurgusal tabloyu kullanacağız:\n\nurunler (id | ad | kategori | fiyat | stok)\n1 | Elma | Meyve | 12 | 40\n2 | Armut | Meyve | 18 | 25\n3 | Süt | İçecek | 30 | 60\n4 | Ayran | İçecek | 12 | 80\n5 | Peynir | Süt Ürünü | 90 | 15\n6 | Zeytin | Kahvaltılık | 60 | 20',
          alistirmalar: [
            Secim(
              soru:
                  'Verileri tablolardan okumak için hangi SQL komutu kullanılır?',
              secenekler: ['FROM', 'WHERE', 'SELECT', 'ORDER'],
              dogru: 2,
              aciklama: 'SELECT, hangi sütunların okunacağını söyler.',
            ),
            Secim(
              soru: 'Bir tabloda satır neyi temsil eder?',
              secenekler: [
                'Tek bir özelliği',
                'Veritabanının tamamını',
                'Bir fonksiyonu',
                'Tek bir kaydı',
              ],
              dogru: 3,
              aciklama:
                  'Satır tek bir kayıttır; sütun ise o kaydın bir özelliğidir.',
            ),
            Secim(
              soru: 'SELECT ad FROM urunler; sorgusu kaç satır döndürür?',
              secenekler: ['6', '1', '2', '0'],
              dogru: 0,
              aciklama:
                  'urunler tablosunda 6 satır var; her satırın adı getirilir.',
            ),
            Bosluk(
              soru: 'SELECT ad ___ urunler;',
              secenekler: ['WHERE', 'FROM', 'INTO', 'TABLE'],
              dogru: 1,
              aciklama: 'Tablo adı FROM sözcüğünden sonra yazılır.',
            ),
            Bosluk(
              soru: 'SELECT ___ FROM urunler; sorgusu tüm sütunları getirir.',
              secenekler: ['ALL', 'ad', '*', '#'],
              dogru: 2,
              aciklama: 'Yıldız (*) tüm sütunlar demektir.',
            ),
            Yaz(
              soru: 'urunler tablosundaki tüm sütunları getiren sorguyu yaz.',
              cevaplar: [
                'SELECT * FROM urunler;',
                'SELECT * FROM urunler',
                'SELECT *FROM urunler;',
                'SELECT *FROM urunler',
              ],
              aciklama:
                  'SELECT * FROM urunler; tüm sütun ve satırları getirir.',
            ),
            Sirala(
              soru: 'Sorguyu doğru sıraya diz.',
              kelimeler: ['FROM', 'ad', 'urunler', 'SELECT'],
              dogru: ['SELECT', 'ad', 'FROM', 'urunler'],
              aciklama: 'Önce SELECT ve sütun, sonra FROM ve tablo adı gelir.',
            ),
            Eslestir(
              soru: 'Terimi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'tablo', sag: 'satır ve sütunlardan oluşan veri kümesi'),
                (sol: 'satır', sag: 'tek bir kayıt'),
                (sol: 'sütun', sag: 'bir özellik, örneğin fiyat'),
                (sol: 'SELECT', sag: 'veri okuma komutu'),
              ],
              aciklama:
                  'Tablo satırlardan (kayıt) ve sütunlardan (özellik) oluşur.',
            ),
            Isaretle(
              soru: 'Sorguda tablo adını işaretle.',
              cumle: 'SELECT fiyat FROM urunler',
              dogru: [3],
              aciklama: 'Tablo adı FROM sözcüğünden sonra gelir.',
            ),
            Kod(
              soru: 'ad sütununu getir.',
              kod: 'SELECT ___ FROM urunler;',
              secenekler: ['WHERE', 'ad', ';'],
              dogru: 1,
              dil: 'sql',
              aciklama: 'Okunacak sütun SELECT ile FROM arasına yazılır.',
            ),
          ],
        ),
        Ders(
          id: 'sql-1-u1-d2',
          ad: 'Sütun seçme ve takma ad',
          dilbilgisiNotu:
              'Birden çok sütun için adları virgülle ayır: SELECT ad, fiyat FROM urunler; Sütunlar yazdığın sırayla gelir. AS ile sonuç sütununa takma ad verebilirsin: SELECT fiyat AS tl_fiyat FROM urunler; Sütunlarla hesap da yapılır: SELECT ad, fiyat * 2 AS cift_fiyat FROM urunler;\n\nurunler (id | ad | kategori | fiyat | stok)\n1 | Elma | Meyve | 12 | 40\n2 | Armut | Meyve | 18 | 25\n3 | Süt | İçecek | 30 | 60\n4 | Ayran | İçecek | 12 | 80\n5 | Peynir | Süt Ürünü | 90 | 15\n6 | Zeytin | Kahvaltılık | 60 | 20',
          alistirmalar: [
            Secim(
              soru:
                  'SELECT ad, fiyat FROM urunler; sorgusu kaç sütun döndürür?',
              secenekler: ['1', '2', '6', '3'],
              dogru: 1,
              aciklama: 'Virgülle ayrılmış iki sütun adı yazıldı.',
            ),
            Secim(
              soru: 'Sütuna takma ad vermek için hangi sözcük kullanılır?',
              secenekler: ['AKA', 'NAME', 'AS', 'LIKE'],
              dogru: 2,
              aciklama: 'AS, sonuç sütununa yeni bir ad verir.',
            ),
            Secim(
              soru:
                  'SELECT ad, fiyat * 2 AS cift FROM urunler; sorgusunda Elma satırının cift değeri kaçtır?',
              secenekler: ['16', '40', '14', '24'],
              dogru: 3,
              aciklama: 'Elma\'nın fiyatı 12; 12 * 2 = 24.',
            ),
            Bosluk(
              soru: 'SELECT fiyat ___ tl_fiyat FROM urunler;',
              secenekler: ['AS', 'IS', 'TO', 'BY'],
              dogru: 0,
              aciklama: 'Takma ad AS ile verilir.',
            ),
            Bosluk(
              soru:
                  'SELECT ad, ___ FROM urunler; sorgusu ad ile birlikte stok sütununu da getirir.',
              secenekler: ['SELECT', 'stok', ';', 'AS'],
              dogru: 1,
              aciklama: 'İkinci sütun adı virgülden sonra yazılır.',
            ),
            Yaz(
              soru: 'urunler tablosundan yalnız ad ve fiyat sütunlarını getir.',
              cevaplar: [
                'SELECT ad, fiyat FROM urunler;',
                'SELECT ad, fiyat FROM urunler',
                'SELECT ad,fiyat FROM urunler;',
                'SELECT ad,fiyat FROM urunler',
              ],
              aciklama: 'Sütunlar virgülle ayrılır.',
            ),
            Sirala(
              soru: 'Sorguyu doğru sıraya diz.',
              kelimeler: ['fiyat', 'ad,', 'FROM', 'SELECT', 'urunler'],
              dogru: ['SELECT', 'ad,', 'fiyat', 'FROM', 'urunler'],
              aciklama:
                  'Sütun adları virgülle ayrılarak SELECT\'ten sonra yazılır.',
            ),
            Eslestir(
              soru: 'Terimi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'SELECT ad, fiyat', sag: 'iki sütun getirir'),
                (sol: 'SELECT *', sag: 'tüm sütunları getirir'),
                (sol: 'AS', sag: 'takma ad verir'),
                (sol: 'fiyat * 2', sag: 'hesaplanan sütun'),
              ],
              aciklama:
                  'Sütun seçme, takma ad ve hesaplama SELECT listesinde yapılır.',
            ),
            Isaretle(
              soru: 'Takma adı işaretle.',
              cumle: 'SELECT fiyat AS tl FROM urunler',
              dogru: [3],
              aciklama: 'AS\'ten sonra gelen sözcük takma addır.',
            ),
            Kod(
              soru: 'Hesaplanan sütuna cift_fiyat adını ver.',
              kod: 'SELECT fiyat * 2 ___ cift_fiyat\nFROM urunler;',
              secenekler: ['IS', 'SET', 'AS'],
              dogru: 2,
              dil: 'sql',
              aciklama: 'Takma ad AS ile verilir.',
            ),
          ],
        ),
        Ders(
          id: 'sql-1-u1-d3',
          ad: 'Tekrarları ayıklama: DISTINCT',
          dilbilgisiNotu:
              'Bir sütunda aynı değer birçok satırda tekrar edebilir. DISTINCT, yinelenen satırları teke indirir: SELECT DISTINCT kategori FROM urunler; Bu sorgu Meyve, İçecek, Süt Ürünü ve Kahvaltılık değerlerini birer kez listeler. DISTINCT, SELECT\'ten hemen sonra yazılır.\n\nurunler (id | ad | kategori | fiyat | stok)\n1 | Elma | Meyve | 12 | 40\n2 | Armut | Meyve | 18 | 25\n3 | Süt | İçecek | 30 | 60\n4 | Ayran | İçecek | 12 | 80\n5 | Peynir | Süt Ürünü | 90 | 15\n6 | Zeytin | Kahvaltılık | 60 | 20',
          alistirmalar: [
            Secim(
              soru:
                  'SELECT DISTINCT kategori FROM urunler; kaç satır döndürür?',
              secenekler: ['4', '6', '2', '3'],
              dogru: 0,
              aciklama:
                  'Dört farklı kategori var: Meyve, İçecek, Süt Ürünü, Kahvaltılık.',
            ),
            Secim(
              soru: 'DISTINCT ne yapar?',
              secenekler: [
                'Satırları sıralar',
                'Yinelenen satırları teke indirir',
                'Satırları siler',
                'Yalnız ilk satırı getirir',
              ],
              dogru: 1,
              aciklama:
                  'DISTINCT yalnızca sonuçta tekrarları eler; tablodan veri silmez.',
            ),
            Secim(
              soru: 'SELECT DISTINCT fiyat FROM urunler; kaç satır döndürür?',
              secenekler: ['6', '4', '5', '3'],
              dogru: 2,
              aciklama:
                  'Elma ve Ayran\'ın fiyatı 12 olduğundan 6 fiyat 5 farklı değere iner.',
            ),
            Bosluk(
              soru: 'SELECT ___ kategori FROM urunler;',
              secenekler: ['UNIQUE', 'ONLY', 'SINGLE', 'DISTINCT'],
              dogru: 3,
              aciklama: 'Tekrarsız liste için DISTINCT kullanılır.',
            ),
            Bosluk(
              soru: 'DISTINCT, SELECT\'ten ___ yazılır.',
              secenekler: [
                'hemen sonra',
                'hemen önce',
                'WHERE\'den sonra',
                'FROM\'dan sonra',
              ],
              dogru: 0,
              aciklama: 'Biçim: SELECT DISTINCT sütun FROM tablo.',
            ),
            Yaz(
              soru:
                  'kategori sütunundaki farklı değerleri tek tek listeleyen sorguyu yaz.',
              cevaplar: [
                'SELECT DISTINCT kategori FROM urunler;',
                'SELECT DISTINCT kategori FROM urunler',
              ],
              aciklama: 'DISTINCT, SELECT ile sütun adı arasına yazılır.',
            ),
            Sirala(
              soru: 'Sorguyu doğru sıraya diz.',
              kelimeler: ['kategori', 'DISTINCT', 'FROM', 'SELECT', 'urunler'],
              dogru: ['SELECT', 'DISTINCT', 'kategori', 'FROM', 'urunler'],
              aciklama: 'DISTINCT, SELECT\'ten hemen sonra gelir.',
            ),
            Eslestir(
              soru: 'Terimi anlamıyla eşleştir.',
              ciftler: [
                (
                  sol: 'SELECT kategori',
                  sag: 'her satırın kategorisi, tekrarlarıyla',
                ),
                (sol: 'SELECT DISTINCT kategori', sag: 'tekrarsız kategoriler'),
                (sol: 'DISTINCT', sag: 'yinelenenleri eler'),
                (sol: 'SELECT *', sag: 'tüm sütunlar'),
              ],
              aciklama:
                  'DISTINCT yalnız sonuçtaki yinelenen satırları kaldırır.',
            ),
            Isaretle(
              soru: 'DISTINCT sözcüğünü işaretle.',
              cumle: 'SELECT DISTINCT sehir FROM musteriler',
              dogru: [1],
              aciklama: 'DISTINCT, SELECT\'ten hemen sonra yazılır.',
            ),
            Kod(
              soru: 'Müşterilerin şehirlerini tekrarsız getir.',
              kod: 'SELECT ___ sehir\nFROM musteriler;',
              secenekler: ['DISTINCT', 'COUNT', 'ORDER'],
              dogru: 0,
              dil: 'sql',
              aciklama: 'Tekrarları elemek için DISTINCT gerekir.',
            ),
          ],
        ),
        Ders(
          id: 'sql-1-u1-d4',
          ad: 'Yorum ve yazım kuralları',
          dilbilgisiNotu:
              'SQL anahtar sözcüklerinde büyük/küçük harf fark etmez (select = SELECT); okunurluk için büyük yazılır. Sorgu birden çok satıra bölünebilir ve ; ile biter. Metin değerleri tek tırnak içinde yazılır: \'Elma\'. Tek satırlık yorum -- ile başlar; çok satırlı yorum /* ile başlayıp */ ile biter. Yorumları veritabanı çalıştırmaz.',
          alistirmalar: [
            Secim(
              soru: 'SQL\'de tek satırlık yorum hangi simgeyle başlar?',
              secenekler: ['#', '//', '<!--', '--'],
              dogru: 3,
              aciklama: 'Standart SQL yorumu iki tire (--) ile başlar.',
            ),
            Secim(
              soru: 'Metin değeri hangi tırnakla yazılır?',
              secenekler: [
                '\'Elma\' gibi tek tırnakla',
                '"Elma" gibi çift tırnakla',
                'Tırnak gerekmez',
                '`Elma` gibi ters tırnakla',
              ],
              dogru: 0,
              aciklama:
                  'Standart SQL\'de metin değerleri tek tırnak içine alınır.',
            ),
            Secim(
              soru:
                  'select ad from urunler; ile SELECT ad FROM urunler; arasında fark var mıdır?',
              secenekler: [
                'Var; küçük harfli sorgu hata verir',
                'Yok; anahtar sözcüklerde harf boyutu önemsizdir',
                'Var; büyük harfli sorgu daha hızlıdır',
                'Var; yalnız ilki çalışır',
              ],
              dogru: 1,
              aciklama: 'Anahtar sözcükler büyük/küçük harfe duyarlı değildir.',
            ),
            Bosluk(
              soru: 'SQL sorgusu bitince sonuna ___ işareti konur.',
              secenekler: [':', '.', ';', ','],
              dogru: 2,
              aciklama: 'Sorgular noktalı virgülle biter.',
            ),
            Bosluk(
              soru: 'Çok satırlı yorum /* ile başlar ve ___ ile biter.',
              secenekler: ['/*', '--', ';', '*/'],
              dogru: 3,
              aciklama: 'Çok satırlı yorum */ ile kapatılır.',
            ),
            Yaz(
              soru: 'Elma metnini SQL\'deki doğru yazılışıyla yaz.',
              cevaplar: ['\'Elma\''],
              aciklama: 'Metin değeri tek tırnak içinde yazılır.',
            ),
            Sirala(
              soru: 'Yorum satırını doğru sıraya diz.',
              kelimeler: ['kontrolü', 'stok', '--'],
              dogru: ['--', 'stok', 'kontrolü'],
              aciklama: 'Yorum iki tireyle başlar, sonrası açıklamadır.',
            ),
            Eslestir(
              soru: 'Simgeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: '--', sag: 'tek satırlık yorum'),
                (sol: '/* ... */', sag: 'çok satırlı yorum'),
                (sol: ';', sag: 'sorgunun sonu'),
                (sol: '\'Ali\'', sag: 'metin değeri'),
              ],
              aciklama: 'Bu simgeler SQL yazımının temel taşlarıdır.',
            ),
            Isaretle(
              soru: 'Yorum kısmını işaretle (-- dahil).',
              cumle: 'SELECT ad FROM urunler -- ürün adları',
              dogru: [4, 5, 6],
              aciklama: '-- işaretinden satır sonuna kadar her şey yorumdur.',
            ),
            Kod(
              soru: 'İlk satırı yorum satırı yap.',
              kod: '___ Tüm ürün adları\nSELECT ad FROM urunler;',
              secenekler: ['//', '--', '#'],
              dogru: 1,
              dil: 'sql',
              aciklama: 'SQL yorumu -- ile başlar.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'sql-1-u2',
      ad: 'Süzme ve sıralama',
      dersler: [
        Ders(
          id: 'sql-1-u2-d1',
          ad: 'WHERE ve karşılaştırma',
          dilbilgisiNotu:
              'WHERE, yalnız koşulu sağlayan satırları getirir: SELECT ad FROM urunler WHERE fiyat > 20; Karşılaştırma işleçleri: = (eşit), <> (eşit değil), <, >, <=, >=. Metinler tek tırnakla: WHERE kategori = \'Meyve\'. Sıra: SELECT, FROM, WHERE.\n\nurunler (id | ad | kategori | fiyat | stok)\n1 | Elma | Meyve | 12 | 40\n2 | Armut | Meyve | 18 | 25\n3 | Süt | İçecek | 30 | 60\n4 | Ayran | İçecek | 12 | 80\n5 | Peynir | Süt Ürünü | 90 | 15\n6 | Zeytin | Kahvaltılık | 60 | 20',
          alistirmalar: [
            Secim(
              soru:
                  'SELECT ad FROM urunler WHERE fiyat > 20; kaç satır döndürür?',
              secenekler: ['2', '4', '3', '6'],
              dogru: 2,
              aciklama:
                  'Fiyatı 20\'den büyük olanlar: Süt (30), Peynir (90), Zeytin (60).',
            ),
            Secim(
              soru: 'SQL\'de "eşit mi" karşılaştırması hangi simgeyle yapılır?',
              secenekler: ['==', '===', ':=', '='],
              dogru: 3,
              aciklama: 'SQL\'de eşitlik tek eşittir (=) ile sorulur.',
            ),
            Secim(
              soru: 'Aşağıdakilerden hangisi "eşit değil" anlamına gelir?',
              secenekler: ['<>', '=/=', '=!', '><'],
              dogru: 0,
              aciklama: 'Standart SQL\'de eşit değil <> ile yazılır.',
            ),
            Bosluk(
              soru: 'SELECT ad FROM urunler ___ kategori = \'Meyve\';',
              secenekler: ['WHEN', 'WHERE', 'IF', 'FILTER'],
              dogru: 1,
              aciklama: 'Satır süzmek için WHERE kullanılır.',
            ),
            Bosluk(
              soru:
                  'fiyat ___ 90 koşulu fiyatı 90 veya daha büyük olanları seçer.',
              secenekler: ['>', '=>', '>=', '=='],
              dogru: 2,
              aciklama: 'Büyük veya eşit için >= yazılır.',
            ),
            Yaz(
              soru: 'Fiyatı 50\'den büyük ürünlerin adını getir.',
              cevaplar: [
                'SELECT ad FROM urunler WHERE fiyat > 50;',
                'SELECT ad FROM urunler WHERE fiyat > 50',
              ],
              aciklama: 'Koşul WHERE\'den sonra yazılır.',
            ),
            Sirala(
              soru:
                  'Stoğu 30\'dan az olan ürünlerin adını getiren sorguyu diz.',
              kelimeler: [
                'ad',
                '30',
                'urunler',
                '<',
                'WHERE',
                'FROM',
                'stok',
                'SELECT',
              ],
              dogru: [
                'SELECT',
                'ad',
                'FROM',
                'urunler',
                'WHERE',
                'stok',
                '<',
                '30',
              ],
              aciklama: 'Önce SELECT ve FROM, sonra WHERE ve koşul gelir.',
            ),
            Tablo(
              soru: 'Koşul-satır sayısı tablosunu tamamla.',
              baslik: ['Koşul', 'Satır sayısı'],
              satirlar: [
                ['fiyat = 12', '2'],
                ['fiyat > 20', '3'],
                ['fiyat <= 12', '2'],
                ['fiyat >= 90', '1'],
              ],
              bos: [
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
                (satir: 3, sutun: 1),
              ],
              secenekler: ['1', '2', '3', '6'],
              aciklama:
                  'Elma ve Ayran 12; 20\'den büyükler Süt, Peynir, Zeytin; yalnız Peynir 90 veya üstü.',
            ),
            Eslestir(
              soru: 'İşleci anlamıyla eşleştir.',
              ciftler: [
                (sol: '=', sag: 'eşit mi'),
                (sol: '<>', sag: 'eşit değil mi'),
                (sol: '<=', sag: 'küçük veya eşit mi'),
                (sol: '>', sag: 'büyük mü'),
              ],
              aciklama: 'Karşılaştırma işleçleri koşul kurar.',
            ),
            Kod(
              soru: 'İçecek kategorisindeki ürünleri getir.',
              kod: 'SELECT ad FROM urunler\nWHERE kategori ___ \'İçecek\';',
              secenekler: ['==', ':=', '='],
              dogru: 2,
              dil: 'sql',
              aciklama: 'Eşitlik koşulu tek = ile yazılır.',
            ),
          ],
        ),
        Ders(
          id: 'sql-1-u2-d2',
          ad: 'AND, OR, NOT',
          dilbilgisiNotu:
              'Koşulları birleştirmek için: AND her iki koşul da doğruysa; OR en az biri doğruysa; NOT koşulu tersine çevirir. Örnek: WHERE kategori = \'Meyve\' AND fiyat > 15. AND, OR\'dan önce işlenir; emin değilsen parantez kullan.\n\nurunler (id | ad | kategori | fiyat | stok)\n1 | Elma | Meyve | 12 | 40\n2 | Armut | Meyve | 18 | 25\n3 | Süt | İçecek | 30 | 60\n4 | Ayran | İçecek | 12 | 80\n5 | Peynir | Süt Ürünü | 90 | 15\n6 | Zeytin | Kahvaltılık | 60 | 20',
          alistirmalar: [
            Secim(
              soru:
                  'WHERE kategori = \'Meyve\' AND fiyat > 15 kaç satır getirir?',
              secenekler: ['2', '1', '4', '6'],
              dogru: 1,
              aciklama: 'Meyvelerden yalnız Armut (18) 15\'ten pahalıdır.',
            ),
            Secim(
              soru:
                  'WHERE kategori = \'Meyve\' OR kategori = \'İçecek\' kaç satır getirir?',
              secenekler: ['2', '6', '4', '3'],
              dogru: 2,
              aciklama: '2 meyve + 2 içecek = 4 satır.',
            ),
            Secim(
              soru: 'NOT ne yapar?',
              secenekler: [
                'Koşulu hep doğru yapar',
                'İki koşulu birleştirir',
                'Satırları sıralar',
                'Koşulun sonucunu tersine çevirir',
              ],
              dogru: 3,
              aciklama: 'NOT, koşulu olumsuzlar.',
            ),
            Bosluk(
              soru:
                  'WHERE fiyat > 10 ___ stok < 50: iki koşulun da sağlanması gerekir.',
              secenekler: ['AND', 'OR', 'NOT', 'XOR'],
              dogru: 0,
              aciklama: 'İkisinin birden sağlanması AND ile ifade edilir.',
            ),
            Bosluk(
              soru:
                  'WHERE kategori = \'Meyve\' ___ kategori = \'Süt Ürünü\': biri sağlansa yeter.',
              secenekler: ['AND', 'OR', 'NOT', 'BUT'],
              dogru: 1,
              aciklama: 'Biri yeterliyse OR kullanılır.',
            ),
            Yaz(
              soru:
                  'Fiyatı 20\'den küçük ve stoğu 30\'dan büyük ürünlerin adını getir.',
              cevaplar: [
                'SELECT ad FROM urunler WHERE fiyat < 20 AND stok > 30;',
                'SELECT ad FROM urunler WHERE fiyat < 20 AND stok > 30',
              ],
              aciklama: 'İki koşul AND ile bağlanır.',
            ),
            Sirala(
              soru: 'Koşulu doğru sıraya diz.',
              kelimeler: [
                '10',
                '50',
                'fiyat',
                'WHERE',
                '>',
                'stok',
                'AND',
                '<',
              ],
              dogru: ['WHERE', 'fiyat', '>', '10', 'AND', 'stok', '<', '50'],
              aciklama: 'Her koşul sütun, işleç, değer sırasıyla yazılır.',
            ),
            Isaretle(
              soru: 'Koşulları birleştiren sözcüğü işaretle.',
              cumle: 'WHERE fiyat > 20 AND stok < 30',
              dogru: [4],
              aciklama: 'AND iki koşulu bağlar.',
            ),
            Eslestir(
              soru: 'Sözcüğü anlamıyla eşleştir.',
              ciftler: [
                (sol: 'AND', sag: 'iki koşul da doğru'),
                (sol: 'OR', sag: 'en az bir koşul doğru'),
                (sol: 'NOT', sag: 'koşulu tersine çevirir'),
                (sol: '( )', sag: 'öncelik belirler'),
              ],
              aciklama: 'Mantıksal işleçler koşulları birleştirir.',
            ),
            Kod(
              soru: 'Yalnız ucuz içecekleri getir (iki koşul birden).',
              kod:
                  'SELECT ad FROM urunler\nWHERE kategori = \'İçecek\' ___ fiyat < 20;',
              secenekler: ['AND', 'OR', 'NOT'],
              dogru: 0,
              dil: 'sql',
              aciklama:
                  'İki koşulun birden sağlanması için AND gerekir; sonuç Ayran.',
            ),
          ],
        ),
        Ders(
          id: 'sql-1-u2-d3',
          ad: 'LIKE, IN, BETWEEN ve NULL',
          dilbilgisiNotu:
              'LIKE ile kalıp araması: ad LIKE \'A%\' (% her uzunlukta karakter, _ tek karakter). IN, listedeki değerlerden biri mi diye bakar: kategori IN (\'Meyve\', \'İçecek\'). BETWEEN a AND b uç değerler dahil aralığı seçer. Boş değer NULL ile gösterilir; NULL kontrolü = ile değil IS NULL veya IS NOT NULL ile yapılır.\n\nmusteriler (id | ad | sehir)\n1 | Ayşe | Ankara\n2 | Mehmet | İzmir\n3 | Zeynep | Ankara\n4 | Ali | NULL\n5 | Can | İstanbul',
          alistirmalar: [
            Secim(
              soru: 'ad LIKE \'A%\' hangi değerleri eşler?',
              secenekler: [
                'A ile başlayanları',
                'A ile bitenleri',
                'İçinde A geçenleri',
                'Yalnız "A" olanı',
              ],
              dogru: 0,
              aciklama:
                  'A harfinden sonra gelen % herhangi bir karakter dizisi demektir.',
            ),
            Secim(
              soru:
                  'fiyat BETWEEN 12 AND 30 koşulu 12 ve 30 değerlerini de kapsar mı?',
              secenekler: [
                'Hayır, ikisi de hariçtir',
                'Evet, uç değerler dahildir',
                'Yalnız 12 dahildir',
                'Yalnız 30 dahildir',
              ],
              dogru: 1,
              aciklama: 'BETWEEN uç değerleri de içerir.',
            ),
            Secim(
              soru: 'musteriler tablosunda sehir IS NULL kaç satır getirir?',
              secenekler: ['0', '2', '1', '5'],
              dogru: 2,
              aciklama: 'Yalnız Ali\'nin şehri boştur.',
            ),
            Secim(
              soru: 'NULL için doğru karşılaştırma hangisidir?',
              secenekler: [
                'sehir = NULL',
                'sehir == NULL',
                'sehir EQUALS NULL',
                'sehir IS NULL',
              ],
              dogru: 3,
              aciklama:
                  'NULL "bilinmeyen" demektir; kontrolü IS NULL ile yapılır.',
            ),
            Bosluk(
              soru: 'kategori ___ (\'Meyve\', \'İçecek\')',
              secenekler: ['IN', 'AT', 'HAS', 'OF'],
              dogru: 0,
              aciklama: 'Liste içinde mi sorusu IN ile sorulur.',
            ),
            Bosluk(
              soru: 'ad ___ \'A%\'',
              secenekler: ['EQUAL', 'LIKE', 'MATCH', 'IS'],
              dogru: 1,
              aciklama: 'Kalıp araması için LIKE kullanılır.',
            ),
            Yaz(
              soru:
                  'Fiyatı 12 ile 30 arasında (uçlar dahil) olan ürünlerin adlarını BETWEEN ile getir.',
              cevaplar: [
                'SELECT ad FROM urunler WHERE fiyat BETWEEN 12 AND 30;',
                'SELECT ad FROM urunler WHERE fiyat BETWEEN 12 AND 30',
              ],
              aciklama: 'BETWEEN alt AND üst biçiminde yazılır.',
            ),
            Sirala(
              soru: 'Şehri boş olan müşterileri seçen koşulu diz.',
              kelimeler: ['sehir', 'NULL', 'IS', 'WHERE'],
              dogru: ['WHERE', 'sehir', 'IS', 'NULL'],
              aciklama: 'Boşluk kontrolü IS NULL ile yapılır.',
            ),
            Eslestir(
              soru: 'Simgeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: '%', sag: 'herhangi uzunlukta karakter dizisi'),
                (sol: '_', sag: 'tek bir karakter'),
                (sol: 'IN', sag: 'listedeki değerlerden biri'),
                (sol: 'IS NULL', sag: 'değer boş'),
              ],
              aciklama: 'LIKE kalıplarında % ve _ joker karakterlerdir.',
            ),
            Kod(
              soru: 'Şehri boş olan müşterileri getir.',
              kod: 'SELECT ad FROM musteriler\nWHERE sehir ___ NULL;',
              secenekler: ['=', 'LIKE', 'IS'],
              dogru: 2,
              dil: 'sql',
              aciklama: 'NULL kontrolü IS NULL ile yapılır.',
            ),
          ],
        ),
        Ders(
          id: 'sql-1-u2-d4',
          ad: 'ORDER BY ve LIMIT',
          dilbilgisiNotu:
              'ORDER BY sonucu sıralar: ORDER BY fiyat DESC. ASC küçükten büyüğe (varsayılan), DESC büyükten küçüğe sıralar. Birden çok sütun virgülle verilir: ORDER BY fiyat, ad (fiyatlar eşitse ad\'a bakar). LIMIT n yalnız ilk n satırı getirir. Sıra: SELECT, FROM, WHERE, ORDER BY, LIMIT. (LIMIT, SQLite ve PostgreSQL\'de çalışır.)\n\nurunler (id | ad | kategori | fiyat | stok)\n1 | Elma | Meyve | 12 | 40\n2 | Armut | Meyve | 18 | 25\n3 | Süt | İçecek | 30 | 60\n4 | Ayran | İçecek | 12 | 80\n5 | Peynir | Süt Ürünü | 90 | 15\n6 | Zeytin | Kahvaltılık | 60 | 20',
          alistirmalar: [
            Secim(
              soru:
                  'SELECT ad FROM urunler ORDER BY fiyat DESC LIMIT 1; hangi ürünü getirir?',
              secenekler: ['Peynir', 'Elma', 'Ayran', 'Zeytin'],
              dogru: 0,
              aciklama: 'En yüksek fiyat 90 ile Peynir\'dir.',
            ),
            Secim(
              soru: 'ORDER BY\'da yön belirtilmezse ne olur?',
              secenekler: [
                'Azalan sıralanır',
                'Artan (ASC) sıralanır',
                'Hata verir',
                'Sıralama yapılmaz',
              ],
              dogru: 1,
              aciklama: 'Varsayılan sıralama ASC\'dir.',
            ),
            Secim(
              soru:
                  'ORDER BY fiyat, ad ile fiyatı eşit olan ürünler nasıl sıralanır?',
              secenekler: [
                'Rastgele',
                'id\'ye göre',
                'ad\'a göre',
                'Sondan başa',
              ],
              dogru: 2,
              aciklama: 'İkinci sütun eşitlikleri bozmak için kullanılır.',
            ),
            Secim(
              soru:
                  'SELECT ad FROM urunler ORDER BY fiyat, ad LIMIT 2; hangi adları sırayla getirir?',
              secenekler: [
                'Elma, Ayran',
                'Ayran, Armut',
                'Elma, Armut',
                'Ayran, Elma',
              ],
              dogru: 3,
              aciklama:
                  'İkisi de 12 TL; ad\'a göre Ayran, Elma\'dan önce gelir.',
            ),
            Bosluk(
              soru: 'SELECT ad FROM urunler ORDER BY stok ___;',
              secenekler: ['DESC', 'DOWN', 'REVERSE', 'BIG'],
              dogru: 0,
              aciklama: 'Azalan sıralama için DESC yazılır.',
            ),
            Bosluk(
              soru: 'SELECT ad FROM urunler ___ 3;',
              secenekler: ['TOP', 'LIMIT', 'FIRST', 'TAKE'],
              dogru: 1,
              aciklama: 'Satır sayısını sınırlamak için LIMIT kullanılır.',
            ),
            Yaz(
              soru:
                  'En pahalı üç ürünün adını, fiyata göre büyükten küçüğe getir.',
              cevaplar: [
                'SELECT ad FROM urunler ORDER BY fiyat DESC LIMIT 3;',
                'SELECT ad FROM urunler ORDER BY fiyat DESC LIMIT 3',
              ],
              aciklama: 'ORDER BY ... DESC ile sırala, LIMIT 3 ile kes.',
            ),
            Sirala(
              soru: 'Sorguyu doğru sıraya diz.',
              kelimeler: [
                'SELECT',
                'BY',
                'FROM',
                'LIMIT',
                'ORDER',
                'urunler',
                'fiyat',
                '3',
                'ad',
              ],
              dogru: [
                'SELECT',
                'ad',
                'FROM',
                'urunler',
                'ORDER',
                'BY',
                'fiyat',
                'LIMIT',
                '3',
              ],
              aciklama: 'ORDER BY, LIMIT\'ten önce gelir.',
            ),
            Eslestir(
              soru: 'İfadeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'ORDER BY', sag: 'sonucu sıralar'),
                (sol: 'DESC', sag: 'büyükten küçüğe'),
                (sol: 'ASC', sag: 'küçükten büyüğe'),
                (sol: 'LIMIT', sag: 'satır sayısını sınırlar'),
              ],
              aciklama: 'Sıralama ve sınırlama sonuç üzerinde çalışır.',
            ),
            Kod(
              soru: 'Stoğu 20\'den fazla ürünlerin en pahalı ikisini getir.',
              kod:
                  'SELECT ad, fiyat FROM urunler\nWHERE stok > 20\nORDER BY fiyat ___\nLIMIT 2;',
              secenekler: ['ASC', 'DESC', 'ALL'],
              dogru: 1,
              dil: 'sql',
              aciklama:
                  'En pahalılar için büyükten küçüğe (DESC) sıralanır: Süt, Armut.',
            ),
          ],
        ),
      ],
    ),
  ],
);
