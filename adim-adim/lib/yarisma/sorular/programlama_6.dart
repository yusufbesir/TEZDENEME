/// Yarışma soru bankası: Programlama seviye 6, Go (go-1), 6 kategori x 4 soru = 24 soru.
/// Olgular 2026-10-25'te elle doğrulandı; şüpheli soru silinmez, aciklama'ya 'KONTROL' notu eklenir.
/// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım Windows sürümü#cihaz] Claude. Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model.dart';

const List<YarismaSorusu> programlama6Sorulari = [
  YarismaSorusu(
    id: 'go-1.genelKultur.1',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.genelKultur,
    soru:
        'Go dilini hangi şirket geliştirmiştir?',
    secenekler: ['Google', 'Apple', 'Oracle', 'Meta'],
    dogru: 0,
    aciklama:
        'Go, Google\'da tasarlanan ve geliştirilen bir programlama dilidir.',
  ),
  YarismaSorusu(
    id: 'go-1.genelKultur.2',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.genelKultur,
    soru:
        'Go dilinin maskotu hangisidir?',
    secenekler: ['Kartal', 'Gopher', 'Penguen', 'Yılan'],
    dogru: 1,
    aciklama:
        'Go\'nun maskotu Gopher adlı sevimli bir kemirgendir.',
  ),
  YarismaSorusu(
    id: 'go-1.genelKultur.3',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.genelKultur,
    soru:
        'Aşağıdaki araçlardan hangisi Go ile yazılmıştır?',
    secenekler: ['Photoshop', 'Excel', 'Docker', 'Microsoft Word'],
    dogru: 2,
    aciklama:
        'Docker, büyük ölçüde Go ile yazılmış bir konteyner aracıdır.',
  ),
  YarismaSorusu(
    id: 'go-1.genelKultur.4',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.genelKultur,
    soru:
        'Go derleyicisi bir programı genellikle neye dönüştürür?',
    secenekler: ['Yalnızca bir HTML sayfasına', 'Bir PDF belgesine', 'Bir ses kaydına', 'Tek bir çalıştırılabilir dosyaya'],
    dogru: 3,
    aciklama:
        'Go, programı ek çalışma ortamı gerektirmeyen tek bir çalıştırılabilir dosyaya derler.',
  ),
  YarismaSorusu(
    id: 'go-1.tarih.1',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.tarih,
    soru:
        'Go 1.0 sürümü hangi yıl yayımlandı?',
    secenekler: ['2012', '2005', '2009', '2018'],
    dogru: 0,
    aciklama:
        'Go 1.0, Mart 2012\'de yayımlandı.',
  ),
  YarismaSorusu(
    id: 'go-1.tarih.2',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.tarih,
    soru:
        'Go dilinin tasarımcılarından hangisi aynı zamanda Unix\'in yaratıcılarındandır?',
    secenekler: ['Steve Jobs', 'Ken Thompson', 'Bill Gates', 'Tim Berners-Lee'],
    dogru: 1,
    aciklama:
        'Ken Thompson, Unix\'in yaratıcılarından ve Go\'nun tasarımcılarındandır.',
  ),
  YarismaSorusu(
    id: 'go-1.tarih.3',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.tarih,
    soru:
        'Titanik gemisi hangi yıl battı?',
    secenekler: ['1905', '1925', '1912', '1898'],
    dogru: 2,
    aciklama:
        'Titanik, Nisan 1912\'de battı.',
  ),
  YarismaSorusu(
    id: 'go-1.tarih.4',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.tarih,
    soru:
        'Türkiye Cumhuriyeti hangi yıl ilan edildi?',
    secenekler: ['1919', '1920', '1921', '1923'],
    dogru: 3,
    aciklama:
        'Cumhuriyet 29 Ekim 1923\'te ilan edildi.',
  ),
  YarismaSorusu(
    id: 'go-1.sanat.1',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.sanat,
    soru:
        '\'Venüs\'ün Doğuşu\' tablosunun ressamı kimdir?',
    secenekler: ['Botticelli', 'Rembrandt', 'Goya', 'Velázquez'],
    dogru: 0,
    aciklama:
        'Venüs\'ün Doğuşu, Sandro Botticelli\'nin eseridir.',
  ),
  YarismaSorusu(
    id: 'go-1.sanat.2',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.sanat,
    soru:
        'Sistina Şapeli\'nin tavan freskini kim yapmıştır?',
    secenekler: ['Tiziano', 'Michelangelo', 'Donatello', 'Giotto'],
    dogru: 1,
    aciklama:
        'Sistina Şapeli tavanını Michelangelo resmetti.',
  ),
  YarismaSorusu(
    id: 'go-1.sanat.3',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.sanat,
    soru:
        'Taç Mahal hangi ülkededir?',
    secenekler: ['Pakistan', 'Nepal', 'Hindistan', 'İran'],
    dogru: 2,
    aciklama:
        'Taç Mahal, Hindistan\'ın Agra kentindedir.',
  ),
  YarismaSorusu(
    id: 'go-1.sanat.4',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.sanat,
    soru:
        '\'Türk Marşı\' (Alla Turca) bölümünü içeren piyano sonatının bestecisi kimdir?',
    secenekler: ['Bach', 'Beethoven', 'Chopin', 'Mozart'],
    dogru: 3,
    aciklama:
        'Alla Turca, Mozart\'ın 11. Piyano Sonatı\'nın üçüncü bölümüdür.',
  ),
  YarismaSorusu(
    id: 'go-1.matematik.1',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.matematik,
    soru:
        'Go\'da x := 5; x += 3 işlemlerinden sonra x kaçtır?',
    secenekler: ['8', '5', '3', '53'],
    dogru: 0,
    aciklama:
        'x += 3, x = x + 3 demektir; 5 + 3 = 8.',
  ),
  YarismaSorusu(
    id: 'go-1.matematik.2',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.matematik,
    soru:
        'Go\'da iki tamsayı için 7 / 2 işleminin sonucu kaçtır?',
    secenekler: ['2', '3', '3.5', '4'],
    dogru: 1,
    aciklama:
        'Tamsayı bölmede kesir atılır; sonuç 3\'tür.',
  ),
  YarismaSorusu(
    id: 'go-1.matematik.3',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.matematik,
    soru:
        'Aşağıdakilerden hangisi asal sayıdır?',
    secenekler: ['27', '33', '17', '21'],
    dogru: 2,
    aciklama:
        '17 yalnızca 1 ve kendisine bölünür; diğerleri 3\'e bölünür.',
  ),
  YarismaSorusu(
    id: 'go-1.matematik.4',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.matematik,
    soru:
        '1\'den 10\'a kadar olan tamsayıların toplamı kaçtır?',
    secenekler: ['50', '45', '60', '55'],
    dogru: 3,
    aciklama:
        'n(n+1)/2 formülüyle 10 x 11 / 2 = 55.',
  ),
  YarismaSorusu(
    id: 'go-1.fen.1',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.fen,
    soru:
        'Su normal basınçta kaç °C\'de donar?',
    secenekler: ['0', '4', '-10', '10'],
    dogru: 0,
    aciklama:
        'Su normal basınçta 0 °C\'de donar.',
  ),
  YarismaSorusu(
    id: 'go-1.fen.2',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.fen,
    soru:
        'Güneş\'e en yakın gezegen hangisidir?',
    secenekler: ['Dünya', 'Merkür', 'Venüs', 'Mars'],
    dogru: 1,
    aciklama:
        'Güneş\'e en yakın gezegen Merkür\'dür.',
  ),
  YarismaSorusu(
    id: 'go-1.fen.3',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.fen,
    soru:
        'Güneş Sistemi\'nin en büyük gezegeni hangisidir?',
    secenekler: ['Neptün', 'Dünya', 'Jüpiter', 'Satürn'],
    dogru: 2,
    aciklama:
        'En büyük gezegen Jüpiter\'dir.',
  ),
  YarismaSorusu(
    id: 'go-1.fen.4',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.fen,
    soru:
        'DNA\'nın açılımı nedir?',
    secenekler: ['Dinamik nükleer atom', 'Dijital nükleotid ağı', 'Diferansiyel nitrojen asidi', 'Deoksiribonükleik asit'],
    dogru: 3,
    aciklama:
        'DNA, deoksiribonükleik asit anlamına gelir.',
  ),
  YarismaSorusu(
    id: 'go-1.cografya.1',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.cografya,
    soru:
        'Türkiye\'nin en uzun nehri hangisidir?',
    secenekler: ['Kızılırmak', 'Sakarya', 'Fırat', 'Yeşilırmak'],
    dogru: 0,
    aciklama:
        'Kızılırmak, tamamı Türkiye sınırları içinde akan en uzun nehirdir.',
  ),
  YarismaSorusu(
    id: 'go-1.cografya.2',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.cografya,
    soru:
        'Norveç\'in başkenti neresidir?',
    secenekler: ['Kopenhag', 'Oslo', 'Stockholm', 'Helsinki'],
    dogru: 1,
    aciklama:
        'Norveç\'in başkenti Oslo\'dur.',
  ),
  YarismaSorusu(
    id: 'go-1.cografya.3',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.cografya,
    soru:
        'Sahra Çölü hangi kıtadadır?',
    secenekler: ['Avustralya', 'Güney Amerika', 'Afrika', 'Asya'],
    dogru: 2,
    aciklama:
        'Sahra Çölü Afrika kıtasındadır.',
  ),
  YarismaSorusu(
    id: 'go-1.cografya.4',
    alan: 'kod',
    seviyeKursId: 'go-1',
    kategori: YarismaKategori.cografya,
    soru:
        'Türkiye\'nin en büyük gölü hangisidir?',
    secenekler: ['Tuz Gölü', 'Eğirdir Gölü', 'Beyşehir Gölü', 'Van Gölü'],
    dogru: 3,
    aciklama:
        'Van Gölü, Türkiye\'nin en büyük gölüdür.',
  ),
];
