/// Yarışma soru bankası: Programlama seviye 4, SQL (sql-1), 6 kategori x 4 soru = 24 soru.
/// Olgular 2026-10-25'te elle doğrulandı; şüpheli soru silinmez, aciklama'ya 'KONTROL' notu eklenir.
/// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım Windows sürümü#cihaz] Claude. Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model.dart';

const List<YarismaSorusu> programlama4Sorulari = [
  YarismaSorusu(
    id: 'sql-1.genelKultur.1',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.genelKultur,
    soru:
        'SQL kısaltması neyin açılımıdır?',
    secenekler: ['Structured Query Language', 'Simple Query Logic', 'Sequential Query Language', 'System Quality Layer'],
    dogru: 0,
    aciklama:
        'SQL, Structured Query Language, yani yapılandırılmış sorgu dilidir.',
  ),
  YarismaSorusu(
    id: 'sql-1.genelKultur.2',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.genelKultur,
    soru:
        'SQLite veritabanının en belirgin özelliği nedir?',
    secenekler: ['Bir grafik tasarım dili olması', 'Ayrı sunucu gerektirmeden tek dosyada çalışması', 'Yalnızca bulutta çalışması', 'Yalnızca Windows\'ta çalışması'],
    dogru: 1,
    aciklama:
        'SQLite gömülü ve sunucusuzdur; veritabanı tek bir dosyada tutulur.',
  ),
  YarismaSorusu(
    id: 'sql-1.genelKultur.3',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.genelKultur,
    soru:
        'Bir tablodaki verileri okumak için hangi SQL komutu kullanılır?',
    secenekler: ['DELETE', 'CREATE', 'SELECT', 'INSERT'],
    dogru: 2,
    aciklama:
        'Veri okumak için SELECT kullanılır; INSERT ekler, DELETE siler, CREATE nesne oluşturur.',
  ),
  YarismaSorusu(
    id: 'sql-1.genelKultur.4',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.genelKultur,
    soru:
        'Aşağıdakilerden hangisi açık kaynaklı bir ilişkisel veritabanı yönetim sistemidir?',
    secenekler: ['Illustrator', 'Figma', 'Notepad', 'PostgreSQL'],
    dogru: 3,
    aciklama:
        'PostgreSQL, açık kaynaklı bir ilişkisel veritabanı yönetim sistemidir.',
  ),
  YarismaSorusu(
    id: 'sql-1.tarih.1',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.tarih,
    soru:
        'İlişkisel veritabanı modelini 1970\'te ortaya atan bilgisayar bilimcisi kimdir?',
    secenekler: ['Edgar F. Codd', 'Dennis Ritchie', 'Ken Thompson', 'Alan Kay'],
    dogru: 0,
    aciklama:
        'Edgar F. Codd, IBM\'de çalışırken 1970\'te ilişkisel modeli önerdi.',
  ),
  YarismaSorusu(
    id: 'sql-1.tarih.2',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.tarih,
    soru:
        'SQL\'in ilk sürümü (SEQUEL) hangi şirketin araştırma laboratuvarında geliştirildi?',
    secenekler: ['Google', 'IBM', 'Microsoft', 'Apple'],
    dogru: 1,
    aciklama:
        'SEQUEL, 1970\'lerin başında IBM\'de geliştirildi; sonra adı SQL oldu.',
  ),
  YarismaSorusu(
    id: 'sql-1.tarih.3',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.tarih,
    soru:
        'SQL ilk kez hangi yıl ANSI standardı olarak kabul edildi?',
    secenekler: ['1999', '2005', '1986', '1971'],
    dogru: 2,
    aciklama:
        'İlk ANSI SQL standardı (SQL-86) 1986\'da kabul edildi.',
  ),
  YarismaSorusu(
    id: 'sql-1.tarih.4',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.tarih,
    soru:
        'SQLite\'ı 2000 yılında geliştirmeye başlayan kişi kimdir?',
    secenekler: ['Michael Stonebraker', 'Larry Ellison', 'Monty Widenius', 'D. Richard Hipp'],
    dogru: 3,
    aciklama:
        'SQLite\'ı D. Richard Hipp 2000 yılında geliştirmeye başladı.',
  ),
  YarismaSorusu(
    id: 'sql-1.sanat.1',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.sanat,
    soru:
        'Veritabanı tasarımında tabloların ilişkilerini göstermek için hangi diyagram kullanılır?',
    secenekler: ['Varlık-ilişki (ER) diyagramı', 'Gantt şeması', 'Pasta grafiği', 'Isı haritası'],
    dogru: 0,
    aciklama:
        'ER (varlık-ilişki) diyagramı tabloları ve aralarındaki ilişkileri gösterir.',
  ),
  YarismaSorusu(
    id: 'sql-1.sanat.2',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.sanat,
    soru:
        'Mona Lisa tablosunun ressamı kimdir?',
    secenekler: ['Caravaggio', 'Leonardo da Vinci', 'Rafael', 'Michelangelo'],
    dogru: 1,
    aciklama:
        'Mona Lisa, Leonardo da Vinci\'nin eseridir.',
  ),
  YarismaSorusu(
    id: 'sql-1.sanat.3',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.sanat,
    soru:
        '\'Yıldızlı Gece\' tablosunun ressamı kimdir?',
    secenekler: ['Paul Gauguin', 'Edgar Degas', 'Vincent van Gogh', 'Claude Monet'],
    dogru: 2,
    aciklama:
        'Yıldızlı Gece, Vincent van Gogh\'un 1889 tarihli eseridir.',
  ),
  YarismaSorusu(
    id: 'sql-1.sanat.4',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.sanat,
    soru:
        'Süleymaniye Camii\'ni hangi mimar yapmıştır?',
    secenekler: ['Mimar Kemaleddin', 'Vedat Tek', 'Sedefkâr Mehmed Ağa', 'Mimar Sinan'],
    dogru: 3,
    aciklama:
        'Süleymaniye Camii, Mimar Sinan tarafından 16. yüzyılda yapıldı.',
  ),
  YarismaSorusu(
    id: 'sql-1.matematik.1',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.matematik,
    soru:
        'Bir tabloda 7 satır varsa SELECT COUNT(*) sorgusu ne döndürür?',
    secenekler: ['7', '6', '8', '1'],
    dogru: 0,
    aciklama:
        'COUNT(*) tablodaki satır sayısını verir: 7.',
  ),
  YarismaSorusu(
    id: 'sql-1.matematik.2',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.matematik,
    soru:
        'SELECT 2 + 3 * 4; sorgusunun sonucu kaçtır?',
    secenekler: ['9', '14', '20', '24'],
    dogru: 1,
    aciklama:
        'Önce çarpma yapılır: 3 x 4 = 12, sonra 2 + 12 = 14.',
  ),
  YarismaSorusu(
    id: 'sql-1.matematik.3',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.matematik,
    soru:
        '5 satırlık bir tablo ile 4 satırlık bir tablonun CROSS JOIN\'i kaç satır üretir?',
    secenekler: ['1', '16', '20', '9'],
    dogru: 2,
    aciklama:
        'CROSS JOIN tüm çiftleri üretir: 5 x 4 = 20 satır.',
  ),
  YarismaSorusu(
    id: 'sql-1.matematik.4',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.matematik,
    soru:
        'SELECT 17 % 5; sorgusunun sonucu kaçtır?',
    secenekler: ['3', '12', '5', '2'],
    dogru: 3,
    aciklama:
        '17 bölü 5\'ten kalan 2\'dir.',
  ),
  YarismaSorusu(
    id: 'sql-1.fen.1',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.fen,
    soru:
        'Bir bayt kaç bitten oluşur?',
    secenekler: ['8', '4', '16', '10'],
    dogru: 0,
    aciklama:
        'Bir bayt 8 bittir.',
  ),
  YarismaSorusu(
    id: 'sql-1.fen.2',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.fen,
    soru:
        'SSD\'lerin HDD\'lerden temel farkı nedir?',
    secenekler: ['Yalnızca ses kaydeder', 'Hareketli mekanik parçaları yoktur', 'Manyetik disk içerirler', 'Veriyi kağıda yazarlar'],
    dogru: 1,
    aciklama:
        'SSD flash bellek kullanır, dönen disk ve okuma kafası içermez.',
  ),
  YarismaSorusu(
    id: 'sql-1.fen.3',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.fen,
    soru:
        'Su deniz seviyesinde kaç °C\'de kaynar?',
    secenekler: ['80', '110', '100', '90'],
    dogru: 2,
    aciklama:
        'Su deniz seviyesinde 100 °C\'de kaynar.',
  ),
  YarismaSorusu(
    id: 'sql-1.fen.4',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.fen,
    soru:
        'Işığın boşluktaki hızı yaklaşık kaç km/s\'dir?',
    secenekler: ['30.000', '3.000', '3.000.000', '300.000'],
    dogru: 3,
    aciklama:
        'Işık boşlukta saniyede yaklaşık 300.000 km yol alır.',
  ),
  YarismaSorusu(
    id: 'sql-1.cografya.1',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.cografya,
    soru:
        'Brezilya\'nın başkenti neresidir?',
    secenekler: ['Brasília', 'Rio de Janeiro', 'São Paulo', 'Salvador'],
    dogru: 0,
    aciklama:
        'Brezilya\'nın başkenti Brasília\'dır.',
  ),
  YarismaSorusu(
    id: 'sql-1.cografya.2',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.cografya,
    soru:
        'Kanada\'nın başkenti neresidir?',
    secenekler: ['Montréal', 'Ottawa', 'Toronto', 'Vancouver'],
    dogru: 1,
    aciklama:
        'Kanada\'nın başkenti Ottawa\'dır.',
  ),
  YarismaSorusu(
    id: 'sql-1.cografya.3',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.cografya,
    soru:
        'Fuji Dağı hangi ülkededir?',
    secenekler: ['Güney Kore', 'Nepal', 'Japonya', 'Çin'],
    dogru: 2,
    aciklama:
        'Fuji Dağı Japonya\'dadır.',
  ),
  YarismaSorusu(
    id: 'sql-1.cografya.4',
    alan: 'kod',
    seviyeKursId: 'sql-1',
    kategori: YarismaKategori.cografya,
    soru:
        'Nil Nehri hangi kıtadadır?',
    secenekler: ['Asya', 'Güney Amerika', 'Avrupa', 'Afrika'],
    dogru: 3,
    aciklama:
        'Nil Nehri Afrika kıtasındadır.',
  ),
];
