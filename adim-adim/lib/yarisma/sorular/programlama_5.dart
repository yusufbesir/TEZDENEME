/// Yarışma soru bankası: Programlama seviye 5, PHP (php-1), 6 kategori x 4 soru = 24 soru.
/// Olgular 2026-10-25'te elle doğrulandı; şüpheli soru silinmez, aciklama'ya 'KONTROL' notu eklenir.
/// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım Windows sürümü#cihaz] Claude. Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model.dart';

const List<YarismaSorusu> programlama5Sorulari = [
  YarismaSorusu(
    id: 'php-1.genelKultur.1',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.genelKultur,
    soru:
        'PHP dilini ilk geliştiren kişi kimdir?',
    secenekler: ['Rasmus Lerdorf', 'James Gosling', 'Guido van Rossum', 'Brendan Eich'],
    dogru: 0,
    aciklama:
        'PHP\'yi Rasmus Lerdorf 1990\'ların ortasında geliştirmeye başladı.',
  ),
  YarismaSorusu(
    id: 'php-1.genelKultur.2',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.genelKultur,
    soru:
        'PHP kısaltmasının bugünkü açılımı nedir?',
    secenekler: ['Programmed Hyper Protocol', 'PHP: Hypertext Preprocessor', 'Personal Hosting Platform', 'Private HTML Page'],
    dogru: 1,
    aciklama:
        'PHP, özyinelemeli bir kısaltmadır: PHP: Hypertext Preprocessor.',
  ),
  YarismaSorusu(
    id: 'php-1.genelKultur.3',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.genelKultur,
    soru:
        'PHP kodu genellikle nerede çalıştırılır?',
    secenekler: ['Yazıcıda', 'Ekran kartında', 'Web sunucusunda', 'Kullanıcının tarayıcısında'],
    dogru: 2,
    aciklama:
        'PHP sunucu tarafı bir dildir; kod sunucuda çalışır, tarayıcıya sonuç gider.',
  ),
  YarismaSorusu(
    id: 'php-1.genelKultur.4',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.genelKultur,
    soru:
        'Aşağıdaki içerik yönetim sistemlerinden hangisi PHP ile yazılmıştır?',
    secenekler: ['Unity', 'Photoshop', 'Excel', 'WordPress'],
    dogru: 3,
    aciklama:
        'WordPress PHP ile yazılmış bir içerik yönetim sistemidir.',
  ),
  YarismaSorusu(
    id: 'php-1.tarih.1',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.tarih,
    soru:
        'PHP 8.0 hangi yıl yayımlandı?',
    secenekler: ['2020', '2012', '2016', '2024'],
    dogru: 0,
    aciklama:
        'PHP 8.0, Kasım 2020\'de yayımlandı.',
  ),
  YarismaSorusu(
    id: 'php-1.tarih.2',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.tarih,
    soru:
        'WordPress ilk kez hangi yıl yayımlandı?',
    secenekler: ['2018', '2003', '1995', '2010'],
    dogru: 1,
    aciklama:
        'WordPress ilk sürümü 2003\'te yayımlandı.',
  ),
  YarismaSorusu(
    id: 'php-1.tarih.3',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.tarih,
    soru:
        'Apollo 11 görevinde insanlar Ay\'a ilk kez hangi yıl indi?',
    secenekler: ['1965', '1975', '1969', '1961'],
    dogru: 2,
    aciklama:
        'Apollo 11, Temmuz 1969\'da Ay\'a indi.',
  ),
  YarismaSorusu(
    id: 'php-1.tarih.4',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.tarih,
    soru:
        'Facebook\'un ilk sürümü hangi dille yazılmıştır?',
    secenekler: ['Go', 'Swift', 'Kotlin', 'PHP'],
    dogru: 3,
    aciklama:
        'Facebook\'un ilk sürümü PHP ile yazıldı.',
  ),
  YarismaSorusu(
    id: 'php-1.sanat.1',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.sanat,
    soru:
        '\'Don Kişot\' romanının yazarı kimdir?',
    secenekler: ['Miguel de Cervantes', 'Victor Hugo', 'Dante', 'Goethe'],
    dogru: 0,
    aciklama:
        'Don Kişot, İspanyol yazar Miguel de Cervantes\'in eseridir.',
  ),
  YarismaSorusu(
    id: 'php-1.sanat.2',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.sanat,
    soru:
        '\'Yaşlı Adam ve Deniz\' kitabının yazarı kimdir?',
    secenekler: ['John Steinbeck', 'Ernest Hemingway', 'Mark Twain', 'Jack London'],
    dogru: 1,
    aciklama:
        'Yaşlı Adam ve Deniz, Ernest Hemingway\'in 1952 tarihli romanıdır.',
  ),
  YarismaSorusu(
    id: 'php-1.sanat.3',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.sanat,
    soru:
        '\'Hamlet\' oyununun yazarı kimdir?',
    secenekler: ['Oscar Wilde', 'Tolstoy', 'William Shakespeare', 'Molière'],
    dogru: 2,
    aciklama:
        'Hamlet, William Shakespeare\'in ünlü trajedisidir.',
  ),
  YarismaSorusu(
    id: 'php-1.sanat.4',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.sanat,
    soru:
        'Orhan Pamuk hangi yıl Nobel Edebiyat Ödülü\'nü aldı?',
    secenekler: ['1996', '2001', '2011', '2006'],
    dogru: 3,
    aciklama:
        'Orhan Pamuk 2006\'da Nobel Edebiyat Ödülü\'nü aldı.',
  ),
  YarismaSorusu(
    id: 'php-1.matematik.1',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.matematik,
    soru:
        'PHP\'de echo 10 % 3; ne yazdırır?',
    secenekler: ['1', '3', '0', '10'],
    dogru: 0,
    aciklama:
        '10 bölü 3\'ten kalan 1\'dir.',
  ),
  YarismaSorusu(
    id: 'php-1.matematik.2',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.matematik,
    soru:
        'PHP\'de echo 2 ** 3; ne yazdırır?',
    secenekler: ['9', '8', '6', '5'],
    dogru: 1,
    aciklama:
        '** üs alma işlecidir: 2 üzeri 3 = 8.',
  ),
  YarismaSorusu(
    id: 'php-1.matematik.3',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.matematik,
    soru:
        'PHP\'de echo 7 <=> 3; ne yazdırır?',
    secenekler: ['-1', 'true', '1', '0'],
    dogru: 2,
    aciklama:
        'Uzay gemisi işleci soldaki büyükse 1 döndürür.',
  ),
  YarismaSorusu(
    id: 'php-1.matematik.4',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.matematik,
    soru:
        'PHP\'de echo intdiv(17, 5); ne yazdırır?',
    secenekler: ['4', '2', '3.4', '3'],
    dogru: 3,
    aciklama:
        'intdiv tamsayı bölümü verir: 17 / 5 işleminin tam kısmı 3\'tür.',
  ),
  YarismaSorusu(
    id: 'php-1.fen.1',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.fen,
    soru:
        'Işık yılı neyin ölçü birimidir?',
    secenekler: ['Uzaklık', 'Süre', 'Hız', 'Kütle'],
    dogru: 0,
    aciklama:
        'Işık yılı, ışığın bir yılda aldığı yoldur; bir uzaklık birimidir.',
  ),
  YarismaSorusu(
    id: 'php-1.fen.2',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.fen,
    soru:
        'Elektrik akımının SI birimi nedir?',
    secenekler: ['Ohm', 'Amper', 'Volt', 'Watt'],
    dogru: 1,
    aciklama:
        'Elektrik akımının birimi amperdir.',
  ),
  YarismaSorusu(
    id: 'php-1.fen.3',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.fen,
    soru:
        'Güneş Sistemi\'nde kaç gezegen vardır?',
    secenekler: ['7', '10', '8', '9'],
    dogru: 2,
    aciklama:
        'Güneş Sistemi\'nde 8 gezegen vardır.',
  ),
  YarismaSorusu(
    id: 'php-1.fen.4',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.fen,
    soru:
        'Sesin havadaki hızı yaklaşık kaç m/s\'dir?',
    secenekler: ['34', '3400', '34.300', '343'],
    dogru: 3,
    aciklama:
        'Ses, 20 °C\'de havada yaklaşık 343 m/s hızla yayılır.',
  ),
  YarismaSorusu(
    id: 'php-1.cografya.1',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.cografya,
    soru:
        'İstanbul Boğazı hangi iki denizi birbirine bağlar?',
    secenekler: ['Karadeniz ve Marmara', 'Ege ve Akdeniz', 'Marmara ve Ege', 'Karadeniz ve Hazar'],
    dogru: 0,
    aciklama:
        'İstanbul Boğazı Karadeniz ile Marmara Denizi\'ni bağlar.',
  ),
  YarismaSorusu(
    id: 'php-1.cografya.2',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.cografya,
    soru:
        'Mısır\'ın başkenti neresidir?',
    secenekler: ['Gize', 'Kahire', 'İskenderiye', 'Luksor'],
    dogru: 1,
    aciklama:
        'Mısır\'ın başkenti Kahire\'dir.',
  ),
  YarismaSorusu(
    id: 'php-1.cografya.3',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.cografya,
    soru:
        'Hindistan\'ın başkenti neresidir?',
    secenekler: ['Kalküta', 'Bangalore', 'Yeni Delhi', 'Mumbai'],
    dogru: 2,
    aciklama:
        'Hindistan\'ın başkenti Yeni Delhi\'dir.',
  ),
  YarismaSorusu(
    id: 'php-1.cografya.4',
    alan: 'kod',
    seviyeKursId: 'php-1',
    kategori: YarismaKategori.cografya,
    soru:
        'Güney Kutbu hangi kıtadadır?',
    secenekler: ['Avustralya', 'Güney Amerika', 'Afrika', 'Antarktika'],
    dogru: 3,
    aciklama:
        'Güney Kutbu Antarktika kıtasındadır.',
  ),
];
