/// Yarışma soru bankası: SQL seviye 2 ve 3 (sql-2, sql-3), 6 kategori x 4 soru x 2 seviye = 48 soru (sql-1, programlama_4.dart dosyasındadır).
/// Kategoriler SQL konularına eşlenmiştir (genel kültür, tarih, yazım/stil, hesap, davranış, ekosistem).
/// Çıktı/davranış iddiası taşıyan sorular ilgili araçla (SQLite, PHP, Go) çalıştırılarak doğrulandı; tarih ve genel bilgi soruları elle kontrol edildi.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dalga14]
library;

import '../model.dart';

const List<YarismaSorusu> sqlSorulari = [
  YarismaSorusu(
    id: 'sql-2.genelKultur.1',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.genelKultur,
    soru: 'Bir sütundaki satır sayısını sayan toplama fonksiyonu hangisidir?',
    secenekler: ['SIZE', 'COUNT', 'ROWS', 'TALLY'],
    dogru: 1,
    aciklama:
        'COUNT satırları sayar; COUNT(*) tüm satırları, COUNT(sütun) ise NULL olmayanları sayar.',
  ),
  YarismaSorusu(
    id: 'sql-2.genelKultur.2',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.genelKultur,
    soru: 'GROUP BY ne işe yarar?',
    secenekler: [
      'Sonucu alfabetik sıralar',
      'Tabloyu siler',
      'Satırları rastgele karıştırır',
      'Aynı değeri taşıyan satırları gruplar; her grup için toplama yapılabilir',
    ],
    dogru: 3,
    aciklama:
        'GROUP BY kategori, her kategori için ayrı COUNT/SUM/AVG hesaplanmasını sağlar.',
  ),
  YarismaSorusu(
    id: 'sql-2.genelKultur.3',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.genelKultur,
    soru:
        'Toplama sonucuna (ör. toplamı 100\'den büyük gruplar) koşul koymak için hangi yan tümce kullanılır?',
    secenekler: ['HAVING', 'WHERE', 'FILTER BY', 'ONLY'],
    dogru: 0,
    aciklama:
        'Gruplar oluştuktan sonra grup sonuçlarını süzmek HAVING\'in işidir; WHERE ise gruplamadan önce satırları süzer.',
  ),
  YarismaSorusu(
    id: 'sql-2.genelKultur.4',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.genelKultur,
    soru: 'COUNT(*) ile COUNT(sütun) arasındaki temel fark nedir?',
    secenekler: [
      'COUNT(*) yalnızca sayıları sayar',
      'İkisi her zaman aynı sonucu verir',
      'COUNT(sütun) NULL değerleri saymaz',
      'COUNT(sütun) tabloyu kilitler',
    ],
    dogru: 2,
    aciklama: 'x sütununda 1, NULL, 3 varsa COUNT(*) = 3, COUNT(x) = 2 olur.',
  ),
  YarismaSorusu(
    id: 'sql-2.tarih.1',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.tarih,
    soru: 'MySQL ilk olarak hangi yılda yayımlandı?',
    secenekler: ['1979', '1986', '2004', '1995'],
    dogru: 3,
    aciklama:
        'MySQL ilk kez 1995\'te yayımlandı; İsveçli MySQL AB şirketi tarafından geliştirildi.',
  ),
  YarismaSorusu(
    id: 'sql-2.tarih.2',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.tarih,
    soru:
        'PostgreSQL\'in atası olan POSTGRES projesi hangi üniversitede, kimin liderliğinde başladı?',
    secenekler: [
      'Berkeley\'de Michael Stonebraker',
      'MIT\'de Tim Berners-Lee',
      'Stanford\'da Larry Page',
      'Cambridge\'de Alan Turing',
    ],
    dogru: 0,
    aciklama:
        'POSTGRES, 1980\'lerde UC Berkeley\'de Michael Stonebraker liderliğinde başladı; PostgreSQL bu projeden türedi.',
  ),
  YarismaSorusu(
    id: 'sql-2.tarih.3',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.tarih,
    soru:
        'Ticari olarak satılan ilk SQL tabanlı ilişkisel veritabanı sistemi hangisidir?',
    secenekler: ['MySQL', 'SQLite', 'Oracle', 'PostgreSQL'],
    dogru: 2,
    aciklama:
        'Oracle (başlangıçta Relational Software Inc.), 1979\'da piyasaya sürdüğü sürümle ilk ticari SQL tabanlı ilişkisel sistem olarak bilinir.',
  ),
  YarismaSorusu(
    id: 'sql-2.tarih.4',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.tarih,
    soru:
        'E. F. Codd, ilişkisel modeldeki çalışmaları nedeniyle hangi ödülü aldı?',
    secenekler: [
      'Nobel Fizik Ödülü',
      'Turing Ödülü',
      'Fields Madalyası',
      'Pulitzer Ödülü',
    ],
    dogru: 1,
    aciklama:
        'Codd, ilişkisel veritabanı kuramına katkılarıyla 1981\'de ACM Turing Ödülü\'nü aldı.',
  ),
  YarismaSorusu(
    id: 'sql-2.sanat.1',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.sanat,
    soru: 'Bir SQL sorgusunda yan tümceler hangi sırayla yazılmalıdır?',
    secenekler: [
      'SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY',
      'FROM, SELECT, WHERE, HAVING, GROUP BY',
      'WHERE, SELECT, FROM, ORDER BY, GROUP BY',
      'ORDER BY, SELECT, FROM, WHERE, HAVING',
    ],
    dogru: 0,
    aciklama:
        'Yazım sırası sabittir; bu sıra dışında yazılan sorgu sözdizimi hatası verir.',
  ),
  YarismaSorusu(
    id: 'sql-2.sanat.2',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.sanat,
    soru:
        'SELECT SUM(stok) ___ toplam_stok FROM urun; boşluğa hangi sözcük gelirse sonuç sütunu toplam_stok adını alır?',
    secenekler: ['IS', 'LIKE', 'AS', 'BY'],
    dogru: 2,
    aciklama:
        'AS ile hesaplanan sütuna okunaklı ad verilir; ad vermezsek sütun adı SUM(stok) gibi kalır.',
  ),
  YarismaSorusu(
    id: 'sql-2.sanat.3',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.sanat,
    soru:
        'Metinleri birleştirmek için standart SQL ve SQLite\'ta hangi işleç kullanılır?',
    secenekler: ['+', '||', '&', '.'],
    dogru: 1,
    aciklama:
        '\'ab\' || \'cd\' ifadesi \'abcd\' verir. Bazı sistemler (SQL Server) + kullanır, ama standart olan || işlecidir.',
  ),
  YarismaSorusu(
    id: 'sql-2.sanat.4',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.sanat,
    soru: 'Standart SQL\'de metin sabiti hangi tırnakla yazılır?',
    secenekler: [
      'Çift tırnak: "Ali"',
      'Ters tırnak: `Ali`',
      'Köşeli parantez: [Ali]',
      'Tek tırnak: \'Ali\'',
    ],
    dogru: 3,
    aciklama:
        'Metin değerleri tek tırnakla yazılır; çift tırnak sütun/tablo adları (tanımlayıcılar) içindir.',
  ),
  YarismaSorusu(
    id: 'sql-2.matematik.1',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.matematik,
    soru: 'Bir tabloda x değerleri 10, 20 ve NULL ise AVG(x) kaçtır?',
    secenekler: ['10', '20', '15', '30'],
    dogru: 2,
    aciklama: 'AVG, NULL satırları hesaba katmaz: (10 + 20) / 2 = 15.',
  ),
  YarismaSorusu(
    id: 'sql-2.matematik.2',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.matematik,
    soru: 'x değerleri 4, 5 ve 6 ise SUM(x) kaçtır?',
    secenekler: ['120', '15', '14', '5'],
    dogru: 1,
    aciklama: '4 + 5 + 6 = 15.',
  ),
  YarismaSorusu(
    id: 'sql-2.matematik.3',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.matematik,
    soru: 'x değerleri 3, 9 ve 5 ise MAX(x) - MIN(x) kaçtır?',
    secenekler: ['9', '4', '12', '6'],
    dogru: 3,
    aciklama: 'En büyük 9, en küçük 3; fark 6\'dır.',
  ),
  YarismaSorusu(
    id: 'sql-2.matematik.4',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.matematik,
    soru: 'x değerleri 1, 1, 2, 3, 3 ise COUNT(DISTINCT x) kaçtır?',
    secenekler: ['3', '5', '2', '4'],
    dogru: 0,
    aciklama: 'Farklı değerler 1, 2 ve 3\'tür; DISTINCT tekrarları bir sayar.',
  ),
  YarismaSorusu(
    id: 'sql-2.fen.1',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.fen,
    soru: 'Tüm değerleri NULL olan bir sütunda SUM ne döndürür?',
    secenekler: ['0', 'NULL', '1', 'Hata verir'],
    dogru: 1,
    aciklama:
        'NULL değerler toplamaya girmez; hiç değer kalmazsa SUM, 0 değil NULL döndürür.',
  ),
  YarismaSorusu(
    id: 'sql-2.fen.2',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.fen,
    soru: 'Boş bir tabloda COUNT(*) ne döndürür?',
    secenekler: ['NULL', '1', 'Hata verir', '0'],
    dogru: 3,
    aciklama: 'Satır yoksa sayım 0\'dır (SUM veya AVG ise NULL döner).',
  ),
  YarismaSorusu(
    id: 'sql-2.fen.3',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.fen,
    soru:
        'g=a için v değerleri 1 ve 5, g=b için 2 ise "WHERE v > 1 GROUP BY g" sonrası a grubunun SUM(v) değeri kaçtır?',
    secenekler: ['5', '6', '1', '2'],
    dogru: 0,
    aciklama:
        'WHERE gruplamadan önce çalışır: v=1 satırı elenir, a grubunda yalnız 5 kalır.',
  ),
  YarismaSorusu(
    id: 'sql-2.fen.4',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.fen,
    soru:
        'SQLite\'ta ORDER BY x ASC ile sıralanırken NULL değerler nerede yer alır?',
    secenekler: [
      'En sonda',
      'Sonuçtan çıkarılır',
      'En başta',
      'Sıralamaya göre rastgele',
    ],
    dogru: 2,
    aciklama:
        'SQLite, NULL\'ı her değerden küçük sayar; artan sıralamada NULL\'lar en başta gelir (bu davranış sistemlere göre değişir).',
  ),
  YarismaSorusu(
    id: 'sql-2.cografya.1',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.cografya,
    soru: 'psql komutu hangi veritabanı sisteminin istemcisidir?',
    secenekler: ['MySQL', 'SQLite', 'Oracle', 'PostgreSQL'],
    dogru: 3,
    aciklama: 'psql, PostgreSQL\'in komut satırı istemcisidir.',
  ),
  YarismaSorusu(
    id: 'sql-2.cografya.2',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.cografya,
    soru: 'MySQL\'in adındaki "My" hangi kişiden gelir?',
    secenekler: [
      'Kurucu Monty Widenius\'un kızı My',
      'Mayıs ayından',
      '"Mighty" sözcüğünden',
      'Mısır tanrıçasından',
    ],
    dogru: 0,
    aciklama:
        'MySQL, kurucularından Michael "Monty" Widenius\'un kızı My\'nin adını taşır.',
  ),
  YarismaSorusu(
    id: 'sql-2.cografya.3',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.cografya,
    soru: 'Microsoft SQL Server\'ın kullandığı SQL lehçesi nasıl adlandırılır?',
    secenekler: ['PL/SQL', 'PL/pgSQL', 'T-SQL (Transact-SQL)', 'SQL/PSM'],
    dogru: 2,
    aciklama:
        'T-SQL, Microsoft SQL Server\'ın SQL uzantısıdır; PL/SQL Oracle\'a, PL/pgSQL PostgreSQL\'e aittir.',
  ),
  YarismaSorusu(
    id: 'sql-2.cografya.4',
    alan: 'kod',
    seviyeKursId: 'sql-2',
    kategori: YarismaKategori.cografya,
    soru:
        'SQLite için ayrı bir veritabanı sunucusu süreci çalıştırmak gerekir mi?',
    secenekler: [
      'Evet; her zaman ayrı sunucu gerekir',
      'Hayır; motor uygulamanın içine gömülüdür',
      'Evet; yalnızca bulutta çalışır',
      'Yalnızca Linux\'ta gerekir',
    ],
    dogru: 1,
    aciklama:
        'SQLite bir kitaplık olarak uygulamaya gömülür ve dosyaya doğrudan erişir; sunucu kurulumu gerekmez.',
  ),
  YarismaSorusu(
    id: 'sql-3.genelKultur.1',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.genelKultur,
    soru: 'INNER JOIN sonucunda hangi satırlar bulunur?',
    secenekler: [
      'Yalnız soldaki tablonun tüm satırları',
      'İki tabloda da eşleşen satırlar',
      'İki tablonun satırlarının hepsi, eşleşmese de',
      'Yalnız eşleşmeyen satırlar',
    ],
    dogru: 1,
    aciklama:
        'INNER JOIN yalnızca ON koşulunu sağlayan eşleşmiş satırları döndürür.',
  ),
  YarismaSorusu(
    id: 'sql-3.genelKultur.2',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.genelKultur,
    soru: 'LEFT JOIN ne yapar?',
    secenekler: [
      'Yalnız eşleşen satırları getirir',
      'Sağdaki tablonun tüm satırlarını siler',
      'Tabloları alfabetik sıralar',
      'Soldaki tablonun tüm satırlarını getirir; eşleşmeyenlerde sağ sütunlar NULL olur',
    ],
    dogru: 3,
    aciklama:
        'LEFT JOIN, soldaki tablodan hiçbir satırı kaybetmez; eşi olmayan satırın sağ taraf sütunları NULL gelir.',
  ),
  YarismaSorusu(
    id: 'sql-3.genelKultur.3',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.genelKultur,
    soru:
        'Bir tablodaki sütunun başka bir tablonun satırına işaret etmesini sağlayan kısıt hangisidir?',
    secenekler: ['FOREIGN KEY (yabancı anahtar)', 'UNIQUE', 'CHECK', 'DEFAULT'],
    dogru: 0,
    aciklama:
        'Yabancı anahtar, ilişkili tablodaki birincil/benzersiz anahtara referans verir ve tablolar arası ilişkiyi tanımlar.',
  ),
  YarismaSorusu(
    id: 'sql-3.genelKultur.4',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.genelKultur,
    soru: 'DELETE FROM t; ile DROP TABLE t; arasındaki fark nedir?',
    secenekler: [
      'İkisi de aynı işi yapar',
      'DELETE tabloyu, DROP yalnız satırları siler',
      'DELETE satırları siler, tablo kalır; DROP tabloyu tamamen kaldırır',
      'DROP yalnız tek satırı siler',
    ],
    dogru: 2,
    aciklama:
        'DELETE sonrası tablo boş olarak durur; DROP sonrası tabloya sorgu atınca "no such table" hatası alınır.',
  ),
  YarismaSorusu(
    id: 'sql-3.tarih.1',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.tarih,
    soru: 'Pencere (window) fonksiyonları SQL standardına hangi sürümle girdi?',
    secenekler: ['SQL-86', 'SQL-89', 'SQL:2023', 'SQL:2003'],
    dogru: 3,
    aciklama:
        'OVER(...) ile kullanılan pencere fonksiyonları SQL:2003 standardında tanımlandı (sonra SQL:2011 ile genişletildi).',
  ),
  YarismaSorusu(
    id: 'sql-3.tarih.2',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.tarih,
    soru:
        'WITH RECURSIVE ile özyinelemeli sorgular hangi SQL standardıyla gelmiştir?',
    secenekler: ['SQL:1999', 'SQL-86', 'SQL:2016', 'SQL-87'],
    dogru: 0,
    aciklama:
        'Özyinelemeli ortak tablo ifadeleri (recursive CTE), SQL:1999 standardıyla tanımlandı.',
  ),
  YarismaSorusu(
    id: 'sql-3.tarih.3',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.tarih,
    soru: 'MariaDB hangi veritabanından çatallanarak (fork) oluşmuştur?',
    secenekler: ['PostgreSQL', 'SQLite', 'MySQL', 'Oracle Database'],
    dogru: 2,
    aciklama:
        'MariaDB, MySQL\'in kurucusu Monty Widenius tarafından MySQL kod tabanından çatallanarak 2009\'da başlatıldı.',
  ),
  YarismaSorusu(
    id: 'sql-3.tarih.4',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.tarih,
    soru: 'Microsoft SQL Server\'ın ilk sürümü yaklaşık hangi yılda çıktı?',
    secenekler: ['1969', '1989', '1999', '2009'],
    dogru: 1,
    aciklama:
        'SQL Server 1.0, Sybase ile ortaklık içinde 1989\'da piyasaya çıktı.',
  ),
  YarismaSorusu(
    id: 'sql-3.sanat.1',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.sanat,
    soru:
        'FROM siparis s JOIN musteri m ON s.musteri_id = m.id sorgusundaki s ve m nedir?',
    secenekler: [
      'Tablo takma adları',
      'Sütun türleri',
      'Anahtar sözcükler',
      'Kullanıcı rolleri',
    ],
    dogru: 0,
    aciklama:
        'Takma adlar sorguyu kısaltır ve aynı adlı sütunları ayırt etmeyi sağlar (s.id ile m.id gibi).',
  ),
  YarismaSorusu(
    id: 'sql-3.sanat.2',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.sanat,
    soru:
        'INSERT INTO t (a, b) VALUES (1, 2) yazarken sütun listesini belirtmenin yararı nedir?',
    secenekler: [
      'Tabloyu daha hızlı siler',
      'Hata mesajlarını gizler',
      'Sütun sırası değişse bile değerler doğru sütuna gider',
      'Aynı satırı iki kez ekler',
    ],
    dogru: 2,
    aciklama:
        'Açık sütun listesi okunabilirliği artırır ve tablo yapısı değişince kodun bozulma riskini azaltır.',
  ),
  YarismaSorusu(
    id: 'sql-3.sanat.3',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.sanat,
    soru:
        'Karmaşık bir sorguyu adlandırılmış adımlara bölmek için kullanılan WITH ... AS yapısına ne denir?',
    secenekler: [
      'Tetikleyici (trigger)',
      'CTE (ortak tablo ifadesi)',
      'İndeks',
      'Görünüm kısıtı',
    ],
    dogru: 1,
    aciklama:
        'CTE, bir sorgu içinde geçici adlandırılmış sonuç kümesi tanımlar ve okunabilirliği artırır.',
  ),
  YarismaSorusu(
    id: 'sql-3.sanat.4',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.sanat,
    soru:
        'Üretim kodunda SELECT * yerine gerekli sütunları tek tek yazmak neden önerilir?',
    secenekler: [
      'SELECT * hiçbir zaman çalışmaz',
      'Sütun adı yazmak sorguyu kısaltır',
      'SELECT * veriyi kalıcı siler',
      'Tablo değişse bile sonucun biçimi öngörülebilir kalır',
    ],
    dogru: 3,
    aciklama:
        'Sütun listesi açıkça yazılırsa, sonradan eklenen sütunlar sorgunun çıktısını ve uygulama kodunu beklenmedik biçimde değiştirmez.',
  ),
  YarismaSorusu(
    id: 'sql-3.matematik.1',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.matematik,
    soru:
        'a tablosunda id = 1, 2, 3; b tablosunda a_id = 1, 1, 2 ise INNER JOIN kaç satır döndürür?',
    secenekler: ['6', '2', '3', '9'],
    dogru: 2,
    aciklama:
        '1 ile iki, 2 ile bir eşleşme var; 3\'ün eşi yok: toplam 3 satır.',
  ),
  YarismaSorusu(
    id: 'sql-3.matematik.2',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.matematik,
    soru:
        'Aynı tablolarda (a.id = 1, 2, 3 ve b.a_id = 1, 1, 2) LEFT JOIN kaç satır döndürür?',
    secenekler: ['3', '4', '6', '2'],
    dogru: 1,
    aciklama:
        'INNER JOIN\'in 3 satırına, eşi olmayan 3 numaralı a satırı da eklenir: 4 satır.',
  ),
  YarismaSorusu(
    id: 'sql-3.matematik.3',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.matematik,
    soru:
        'x = 1, 2, 3 için SUM(x) OVER (ORDER BY x) üçüncü satırda hangi değeri verir?',
    secenekler: ['3', '1', '9', '6'],
    dogru: 3,
    aciklama:
        'Pencere toplamı birikimlidir: 1, 3, 6. Üçüncü satırda 1 + 2 + 3 = 6.',
  ),
  YarismaSorusu(
    id: 'sql-3.matematik.4',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.matematik,
    soru:
        'x = 1, 2, 3, 10 iken SELECT COUNT(*) FROM t WHERE x > (SELECT AVG(x) FROM t) kaç döndürür?',
    secenekler: ['1', '2', '4', '0'],
    dogru: 0,
    aciklama: 'Ortalama 16 / 4 = 4\'tür; yalnız 10 değeri 4\'ten büyüktür.',
  ),
  YarismaSorusu(
    id: 'sql-3.fen.1',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.fen,
    soru:
        '3 satırlı bir tabloda WHERE olmadan UPDATE t SET x = 0; çalıştırılırsa kaç satır etkilenir?',
    secenekler: ['0', '3', '1', 'Hata verir'],
    dogru: 1,
    aciklama:
        'WHERE yoksa tüm satırlar güncellenir; UPDATE ve DELETE yazarken WHERE\'i unutmamak önemlidir.',
  ),
  YarismaSorusu(
    id: 'sql-3.fen.2',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.fen,
    soru:
        'PRIMARY KEY olan sütuna aynı değeri ikinci kez eklemeye çalışırsak ne olur?',
    secenekler: [
      'Eski satır sessizce silinir',
      'Değer otomatik değişir',
      'Satır iki kez eklenir',
      'Kısıt (constraint) hatası verir',
    ],
    dogru: 3,
    aciklama:
        'Birincil anahtar benzersizdir; tekrar eden değer UNIQUE constraint hatasıyla reddedilir.',
  ),
  YarismaSorusu(
    id: 'sql-3.fen.3',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.fen,
    soru:
        'LEFT JOIN\'de sağ tabloda eşleşmesi olmayan satırın sağ sütunlarında ne görünür?',
    secenekler: ['NULL', '0', 'Boş metin ("")', 'Önceki satırın değeri'],
    dogru: 0,
    aciklama: 'Eşleşme yoksa sağ taraf için değer bulunamaz ve NULL döner.',
  ),
  YarismaSorusu(
    id: 'sql-3.fen.4',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.fen,
    soru:
        'BEGIN; INSERT ...; ROLLBACK; işlem bittikten sonra eklenen satır tabloda bulunur mu?',
    secenekler: [
      'Evet; INSERT kalıcıdır',
      'Yalnız ilk satır kalır',
      'Hayır; ROLLBACK işlemi geri alır',
      'Tablo silinir',
    ],
    dogru: 2,
    aciklama:
        'Transaction içindeki değişiklikler COMMIT edilmezse ROLLBACK ile geri alınır (atomiklik).',
  ),
  YarismaSorusu(
    id: 'sql-3.cografya.1',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.cografya,
    soru:
        'Kullanıcı girdisinin SQL enjeksiyonuna yol açmasını önlemenin temel yöntemi nedir?',
    secenekler: [
      'Girdiyi sorguya doğrudan birleştirmek',
      'Sorguyu büyük harfle yazmak',
      'Tablo adını kısaltmak',
      'Parametreli (hazırlanmış) sorgular kullanmak',
    ],
    dogru: 3,
    aciklama:
        'Parametreli sorgularda girdi komut olarak değil veri olarak işlenir; PHP\'de PDO ile, Python\'da sqlite3 ile yapılabilir.',
  ),
  YarismaSorusu(
    id: 'sql-3.cografya.2',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.cografya,
    soru: 'CREATE INDEX ile genellikle ne amaçlanır?',
    secenekler: [
      'Aramaları hızlandırmak',
      'Tabloyu silmek',
      'Yedek almak',
      'Sütun adını değiştirmek',
    ],
    dogru: 0,
    aciklama:
        'İndeks, ilgili sütunda arama/sıralama/birleştirmeyi hızlandırır; karşılığında yazma işlemleri biraz maliyetlenir.',
  ),
  YarismaSorusu(
    id: 'sql-3.cografya.3',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.cografya,
    soru:
        'Bir sorguyu adlandırıp sanal tablo gibi kullanmayı sağlayan nesne hangisidir?',
    secenekler: ['TRIGGER', 'SEQUENCE', 'VIEW (görünüm)', 'ROLE'],
    dogru: 2,
    aciklama: 'CREATE VIEW ile kayıtlı bir SELECT, tablo gibi sorgulanabilir.',
  ),
  YarismaSorusu(
    id: 'sql-3.cografya.4',
    alan: 'kod',
    seviyeKursId: 'sql-3',
    kategori: YarismaKategori.cografya,
    soru:
        'Veritabanı işlemlerindeki ACID kısaltmasında "A" harfi neyi anlatır?',
    secenekler: [
      'Availability',
      'Atomicity (bölünmezlik)',
      'Authorization',
      'Archiving',
    ],
    dogru: 1,
    aciklama:
        'Atomiklik: bir işlem ya tamamen uygulanır ya da hiç uygulanmaz (ROLLBACK ile geri alınır).',
  ),
];
