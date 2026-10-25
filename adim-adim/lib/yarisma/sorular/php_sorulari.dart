/// Yarışma soru bankası: PHP seviye 2 ve 3 (php-2, php-3), 6 kategori x 4 soru x 2 seviye = 48 soru (php-1, programlama_5.dart dosyasındadır).
/// Kategoriler PHP konularına eşlenmiştir (genel kültür, tarih, yazım/stil, hesap, davranış, ekosistem).
/// Çıktı/davranış iddiası taşıyan sorular ilgili araçla (SQLite, PHP, Go) çalıştırılarak doğrulandı; tarih ve genel bilgi soruları elle kontrol edildi.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dalga14]
library;

import '../model.dart';

const List<YarismaSorusu> phpSorulari = [
  YarismaSorusu(
    id: 'php-2.genelKultur.1',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.genelKultur,
    soru:
        '\$dizi bir dizi iken sonuna yeni eleman eklemek için hangi yazım kullanılır?',
    secenekler: [
      '\$dizi.add(5);',
      '\$dizi[] = 5;',
      'push \$dizi 5;',
      '\$dizi->append(5);',
    ],
    dogru: 1,
    aciklama:
        'Köşeli parantezi boş bırakarak atama yapmak dizinin sonuna eleman ekler.',
  ),
  YarismaSorusu(
    id: 'php-2.genelKultur.2',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.genelKultur,
    soru:
        'foreach (\$renkler as \$anahtar => \$deger) satırındaki => işareti neyi belirtir?',
    secenekler: [
      'Karşılaştırmayı',
      'Atamayı',
      'Üs almayı',
      'Anahtar-değer çiftini',
    ],
    dogru: 3,
    aciklama:
        'foreach içinde \$anahtar => \$deger, her turda elemanın anahtarını ve değerini ayrı değişkenlere verir.',
  ),
  YarismaSorusu(
    id: 'php-2.genelKultur.3',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.genelKultur,
    soru:
        'Bir PHP fonksiyonundan çağırana değer geri göndermek için hangi deyim kullanılır?',
    secenekler: ['return', 'yield only', 'send', 'back'],
    dogru: 0,
    aciklama: 'return, değeri çağırana döndürür ve fonksiyonu sonlandırır.',
  ),
  YarismaSorusu(
    id: 'php-2.genelKultur.4',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.genelKultur,
    soru: 'sort(\$a) çağrısı ne yapar?',
    secenekler: [
      'Yeni bir sıralı dizi döndürür, \$a aynı kalır',
      'Diziyi siler',
      'Diziyi yerinde sıralar',
      'Diziyi sondan başa çevirir',
    ],
    dogru: 2,
    aciklama:
        'sort diziyi doğrudan değiştirir (referansla çalışır); sıralanmış kopya istenirse önce kopyalamak gerekir.',
  ),
  YarismaSorusu(
    id: 'php-2.tarih.1',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.tarih,
    soru: 'PHP 7.0 hangi yıl yayımlandı?',
    secenekler: ['2004', '2010', '2020', '2015'],
    dogru: 3,
    aciklama:
        'PHP 7.0 Aralık 2015\'te yayımlandı ve PHP 5.6\'ya göre belirgin hız artışı getirdi.',
  ),
  YarismaSorusu(
    id: 'php-2.tarih.2',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.tarih,
    soru: '"Zend" adı hangi iki kişinin adından türetilmiştir?',
    secenekler: [
      'Zeev Suraski ve Andi Gutmans',
      'Zeno ve Edsger',
      'Zed ve Dennis',
      'Zack ve Donald',
    ],
    dogru: 0,
    aciklama:
        'Zend, PHP motorunu yeniden yazan Zeev Suraski ve Andi Gutmans\'ın adlarından oluşur.',
  ),
  YarismaSorusu(
    id: 'php-2.tarih.3',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.tarih,
    soru: 'PHP\'nin paket yöneticisi Composer ilk olarak hangi yıl yayımlandı?',
    secenekler: ['1998', '2005', '2012', '2019'],
    dogru: 2,
    aciklama:
        'Composer, Nils Adermann ve Jordi Boggiano tarafından geliştirildi; ilk sürümü 2012\'de çıktı.',
  ),
  YarismaSorusu(
    id: 'php-2.tarih.4',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.tarih,
    soru:
        'Nesne yönelimli programlamayı belirgin biçimde güçlendiren PHP 5 hangi yıl çıktı?',
    secenekler: ['1995', '2004', '2009', '2016'],
    dogru: 1,
    aciklama:
        'PHP 5, 2004\'te Zend Engine 2 ile yeni nesne modeliyle yayımlandı.',
  ),
  YarismaSorusu(
    id: 'php-2.sanat.1',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.sanat,
    soru: 'PHP\'de [1, 2] ile array(1, 2) arasında ne fark vardır?',
    secenekler: [
      'Fark yoktur; ikisi de aynı diziyi üretir',
      'Yalnız biri geçerlidir',
      'Köşeli parantez nesne üretir',
      'array() hızlıdır, köşeli parantez hatalıdır',
    ],
    dogru: 0,
    aciklama:
        'Kısa dizi sözdizimi ([]) PHP 5.4\'te eklendi; array() ile birebir aynı sonucu verir.',
  ),
  YarismaSorusu(
    id: 'php-2.sanat.2',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.sanat,
    soru:
        'function selam(\$ad = "Dünya") { return "Merhaba \$ad"; } tanımında selam() çağrısı ne döndürür?',
    secenekler: ['Merhaba', 'Hata verir', 'Merhaba Dünya', 'Merhaba \$ad'],
    dogru: 2,
    aciklama: 'Varsayılan parametre değeri, argüman verilmediğinde kullanılır.',
  ),
  YarismaSorusu(
    id: 'php-2.sanat.3',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.sanat,
    soru: 'PSR-1 kod stiline göre PHP sınıf adları nasıl yazılır?',
    secenekler: [
      'snake_case (kullanici_hizmeti)',
      'StudlyCaps (ör. KullaniciHizmeti)',
      'hepsi büyük harf (KULLANICIHIZMETI)',
      'kebab-case (kullanici-hizmeti)',
    ],
    dogru: 1,
    aciklama:
        'PSR-1, sınıf adlarının StudlyCaps (PascalCase) olmasını, yöntem adlarının camelCase olmasını önerir.',
  ),
  YarismaSorusu(
    id: 'php-2.sanat.4',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.sanat,
    soru: '\$ad tanımlı değilken echo \$ad ?? "Misafir"; ne yazdırır?',
    secenekler: ['Boş satır', 'Hata verir', 'null', 'Misafir'],
    dogru: 3,
    aciklama:
        '?? (null birleştirme) işleci, sol taraf tanımsız veya null ise sağ tarafı kullanır ve uyarı üretmez.',
  ),
  YarismaSorusu(
    id: 'php-2.matematik.1',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.matematik,
    soru: 'array_sum([1, 2, 3, 4]) kaçtır?',
    secenekler: ['24', '4', '10', '1234'],
    dogru: 2,
    aciklama: '1 + 2 + 3 + 4 = 10.',
  ),
  YarismaSorusu(
    id: 'php-2.matematik.2',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.matematik,
    soru:
        '\$t = 0; for (\$i = 1; \$i <= 5; \$i++) { \$t += \$i; } döngüsünden sonra \$t kaçtır?',
    secenekler: ['10', '15', '5', '25'],
    dogru: 1,
    aciklama: '1 + 2 + 3 + 4 + 5 = 15.',
  ),
  YarismaSorusu(
    id: 'php-2.matematik.3',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.matematik,
    soru: 'count([1, [2, 3]]) ifadesi kaçtır?',
    secenekler: ['3', '1', '4', '2'],
    dogru: 3,
    aciklama:
        'count yalnızca üst düzey elemanları sayar: 1 ve [2, 3]. İç içe saymak için COUNT_RECURSIVE gerekir (o zaman 4).',
  ),
  YarismaSorusu(
    id: 'php-2.matematik.4',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.matematik,
    soru: 'count(range(1, 10, 3)) kaçtır?',
    secenekler: ['4', '3', '10', '9'],
    dogru: 0,
    aciklama: 'range(1, 10, 3) dizisi 1, 4, 7, 10 değerlerini üretir.',
  ),
  YarismaSorusu(
    id: 'php-2.fen.1',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.fen,
    soru: '\$a = [1, 2]; \$b = \$a; \$b[] = 3; sonrasında count(\$a) kaçtır?',
    secenekler: ['3', '2', '1', '0'],
    dogru: 1,
    aciklama:
        'PHP dizileri atamada değer olarak kopyalanır; \$b değişince \$a etkilenmez.',
  ),
  YarismaSorusu(
    id: 'php-2.fen.2',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.fen,
    soru:
        'Dışarıda \$x = 5; tanımlıyken, bir fonksiyonun içindeki isset(\$x) ifadesi ne döndürür?',
    secenekler: [
      'true',
      'null',
      '5',
      'false (fonksiyon kendi kapsamında çalışır)',
    ],
    dogru: 3,
    aciklama:
        'Fonksiyon içinde dış değişkenler görünmez; global anahtar sözcüğü veya parametre gerekir.',
  ),
  YarismaSorusu(
    id: 'php-2.fen.3',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.fen,
    soru: '"10" == "1e1" karşılaştırması PHP 8\'de ne döndürür?',
    secenekler: ['true', 'false', 'Hata verir', 'null'],
    dogru: 0,
    aciklama:
        'İki taraf da sayısal metin olduğundan sayı olarak karşılaştırılır: 10 == 10.',
  ),
  YarismaSorusu(
    id: 'php-2.fen.4',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.fen,
    soru: 'PHP_INT_MAX + 1 ifadesinin türü nedir (get_debug_type ile)?',
    secenekler: ['int', 'string', 'float', 'null'],
    dogru: 2,
    aciklama:
        'Tamsayı sınırı aşılınca PHP sonucu otomatik olarak float\'a çevirir.',
  ),
  YarismaSorusu(
    id: 'php-2.cografya.1',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.cografya,
    soru: 'Composer\'da projenin bağımlılıkları hangi dosyada tanımlanır?',
    secenekler: [
      'package.json',
      'requirements.txt',
      'pom.xml',
      'composer.json',
    ],
    dogru: 3,
    aciklama:
        'composer.json, PHP projesinin bağımlılıklarını ve ayarlarını tutar (package.json Node.js\'e aittir).',
  ),
  YarismaSorusu(
    id: 'php-2.cografya.2',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.cografya,
    soru:
        'Composer paketlerinin varsayılan arama deposunun (kayıt defterinin) adı nedir?',
    secenekler: ['Packagist', 'PyPI', 'npm', 'Maven Central'],
    dogru: 0,
    aciklama: 'Packagist, Composer\'ın varsayılan paket deposudur.',
  ),
  YarismaSorusu(
    id: 'php-2.cografya.3',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.cografya,
    soru: 'Laravel ve Symfony PHP için ne tür araçlardır?',
    secenekler: [
      'Veritabanı sunucuları',
      'Metin düzenleyicileri',
      'Web uygulama çatıları (framework)',
      'İşletim sistemleri',
    ],
    dogru: 2,
    aciklama:
        'Laravel ve Symfony, PHP ile web uygulaması geliştirmeyi kolaylaştıran çatılardır.',
  ),
  YarismaSorusu(
    id: 'php-2.cografya.4',
    alan: 'kod',
    seviyeKursId: 'php-2',
    kategori: YarismaKategori.cografya,
    soru: 'WordPress hangi programlama diliyle yazılmıştır?',
    secenekler: ['Java', 'PHP', 'Ruby', 'Go'],
    dogru: 1,
    aciklama:
        'WordPress PHP ile yazılmıştır ve web sitelerinin büyük bölümünde kullanılan bir içerik yönetim sistemidir.',
  ),
  YarismaSorusu(
    id: 'php-3.genelKultur.1',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.genelKultur,
    soru: 'Sınıftan nesne üretmek için hangi anahtar sözcük kullanılır?',
    secenekler: ['make', 'new', 'create', 'spawn'],
    dogru: 1,
    aciklama:
        '\$k = new Kullanici(); ifadesi Kullanici sınıfından yeni bir nesne oluşturur.',
  ),
  YarismaSorusu(
    id: 'php-3.genelKultur.2',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.genelKultur,
    soru:
        'Bir sınıfın yöntemi içinde nesnenin kendi özelliğine erişmek için hangi değişken kullanılır?',
    secenekler: ['\$self', '\$me', '\$object', '\$this'],
    dogru: 3,
    aciklama:
        '\$this, yöntemin çalıştığı geçerli nesneyi gösterir: \$this->ad.',
  ),
  YarismaSorusu(
    id: 'php-3.genelKultur.3',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.genelKultur,
    soru:
        'Bir sınıfın başka bir sınıftan kalıtım alması için hangi sözcük kullanılır?',
    secenekler: ['extends', 'inherits', 'implements only', 'derive'],
    dogru: 0,
    aciklama:
        'class Kedi extends Hayvan, Kedi sınıfının Hayvan\'ın özelliklerini miras almasını sağlar.',
  ),
  YarismaSorusu(
    id: 'php-3.genelKultur.4',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.genelKultur,
    soru: 'PHP\'de hataları yakalamak için hangi blok yapısı kullanılır?',
    secenekler: [
      'if / error',
      'check / handle',
      'try / catch',
      'guard / rescue',
    ],
    dogru: 2,
    aciklama:
        'try bloğunda fırlatılan istisna catch bloğunda yakalanır; finally her durumda çalışır.',
  ),
  YarismaSorusu(
    id: 'php-3.tarih.1',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.tarih,
    soru:
        'fn(\$x) => \$x * 2 biçimindeki ok fonksiyonları (arrow functions) hangi PHP sürümüyle eklendi?',
    secenekler: ['PHP 5.3', 'PHP 8.0', 'PHP 8.3', 'PHP 7.4'],
    dogru: 3,
    aciklama:
        'Ok fonksiyonları ve türlendirilmiş özellikler PHP 7.4 (Kasım 2019) ile geldi.',
  ),
  YarismaSorusu(
    id: 'php-3.tarih.2',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.tarih,
    soru: 'match ifadesi PHP\'ye hangi sürümle girdi?',
    secenekler: ['PHP 8.0', 'PHP 5.6', 'PHP 7.0', 'PHP 8.4'],
    dogru: 0,
    aciklama:
        'match (katı karşılaştırmalı switch alternatifi) PHP 8.0\'da eklendi.',
  ),
  YarismaSorusu(
    id: 'php-3.tarih.3',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.tarih,
    soru: 'enum (sıralama türü) PHP\'ye hangi sürümle eklendi?',
    secenekler: ['PHP 5.3', 'PHP 7.4', 'PHP 8.1', 'PHP 8.0'],
    dogru: 2,
    aciklama: 'Enum desteği PHP 8.1 ile (Kasım 2021) geldi.',
  ),
  YarismaSorusu(
    id: 'php-3.tarih.4',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.tarih,
    soru:
        'Facebook\'un PHP kodunu hızlandırmak için geliştirdiği sanal makine hangisidir?',
    secenekler: ['JVM', 'HHVM', 'CLR', 'V8'],
    dogru: 1,
    aciklama:
        'HHVM (HipHop Virtual Machine), Facebook tarafından PHP/Hack kodunu çalıştırmak için geliştirildi.',
  ),
  YarismaSorusu(
    id: 'php-3.sanat.1',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.sanat,
    soru: 'PHP sınıfında nesne oluşturulurken çalışan özel yöntemin adı nedir?',
    secenekler: ['__construct', '__init', '__start', '__new'],
    dogru: 0,
    aciklama:
        '__construct kurucu yöntemdir; new ile nesne üretilirken otomatik çağrılır.',
  ),
  YarismaSorusu(
    id: 'php-3.sanat.2',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.sanat,
    soru:
        'Bir sınıfın private özelliğine sınıf dışından doğrudan erişmeye çalışırsak ne olur?',
    secenekler: [
      'Değer normal okunur',
      'Değer sessizce null olur',
      'Error fırlatılır',
      'PHP özelliği public yapar',
    ],
    dogru: 2,
    aciklama:
        'private üyelere yalnızca sınıfın kendi yöntemleri erişebilir; dışarıdan erişim "Cannot access private property" hatası verir (kapsülleme).',
  ),
  YarismaSorusu(
    id: 'php-3.sanat.3',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.sanat,
    soru:
        'PHP 8\'de public function __construct(public string \$ad) {} yazımı ne sağlar?',
    secenekler: [
      'Sınıfı soyut yapar',
      'Kurucu parametresini aynı anda özellik olarak tanımlar ve atar',
      'Parametreyi her zaman gizler',
      'Nesneyi kopyalar',
    ],
    dogru: 1,
    aciklama: 'Constructor promotion, özellik tanımı ve atama kodunu kısaltır.',
  ),
  YarismaSorusu(
    id: 'php-3.sanat.4',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.sanat,
    soru: 'Sınıfta const ile tanımlanan sabite sınıf dışından nasıl erişilir?',
    secenekler: [
      '\$sinif->SABIT()',
      'Sinif.SABIT',
      '&Sinif:SABIT',
      'Sinif::SABIT',
    ],
    dogru: 3,
    aciklama:
        'Sınıf sabitleri :: (kapsam çözümleme) işleciyle okunur: Sinif::X.',
  ),
  YarismaSorusu(
    id: 'php-3.matematik.1',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.matematik,
    soru:
        'class A { public static \$n = 0; } A::\$n++; A::\$n++; sonrasında A::\$n kaçtır?',
    secenekler: ['0', '1', '2', 'Hata verir'],
    dogru: 2,
    aciklama:
        'static özellik tüm nesneler ve sınıf için tek bir paylaşılan değerdir; iki artırma ile 2 olur.',
  ),
  YarismaSorusu(
    id: 'php-3.matematik.2',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.matematik,
    soru: 'array_sum(array_map(fn(\$x) => \$x * 2, [1, 2, 3])) kaçtır?',
    secenekler: ['6', '12', '9', '18'],
    dogru: 1,
    aciklama: 'Dizi 2, 4, 6 olur; toplamı 12\'dir.',
  ),
  YarismaSorusu(
    id: 'php-3.matematik.3',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.matematik,
    soru: 'strlen("merhaba") kaçtır?',
    secenekler: ['6', '8', '5', '7'],
    dogru: 3,
    aciklama: '"merhaba" 7 harftir (ASCII harflerde bayt sayısı da 7\'dir).',
  ),
  YarismaSorusu(
    id: 'php-3.matematik.4',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.matematik,
    soru: 'round(3.14159, 2) ifadesinin sonucu nedir?',
    secenekler: ['3.14', '3.1', '3.15', '3'],
    dogru: 0,
    aciklama:
        'round, ikinci argümanla ondalık basamak sayısını belirler: 3.14.',
  ),
  YarismaSorusu(
    id: 'php-3.fen.1',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.fen,
    soru: 'htmlspecialchars("<b>") ifadesi hangi çıktıyı üretir?',
    secenekler: ['<b>', '&lt;b&gt;', 'b', '\\<b\\>'],
    dogru: 1,
    aciklama:
        'Özel HTML karakterleri varlıklara çevrilir; bu, kullanıcı girdisinin sayfada etiket gibi çalışmasını (XSS) engeller.',
  ),
  YarismaSorusu(
    id: 'php-3.fen.2',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.fen,
    soru:
        'try { throw new Exception("x"); } catch (Exception \$e) { echo \$e->getMessage(); } finally { echo "!"; } hangi çıktıyı verir?',
    secenekler: ['x', '!', 'Hata verir', 'x!'],
    dogru: 3,
    aciklama:
        'catch mesajı yazdırır, finally ise hata olsun olmasın sonda çalışır: önce x, sonra !.',
  ),
  YarismaSorusu(
    id: 'php-3.fen.3',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.fen,
    soru:
        'Nesne değişkeni atamasında \$b = \$a; \$b->x = 9; sonrasında \$a->x kaçtır (başlangıçta 1)?',
    secenekler: ['9', '1', '0', 'Hata verir'],
    dogru: 0,
    aciklama:
        'Nesneler tanıtıcı (handle) olarak kopyalanır: \$a ve \$b aynı nesneyi gösterir. Gerçek kopya için clone kullanılır.',
  ),
  YarismaSorusu(
    id: 'php-3.fen.4',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.fen,
    soru:
        'PHP 8.1\'de readonly olarak tanımlanmış bir özelliği ilk atamadan sonra değiştirmeye çalışırsak ne olur?',
    secenekler: [
      'Değer sessizce güncellenir',
      'Özellik silinir',
      'Error fırlatılır',
      'Uyarı vermeden yok sayılır',
    ],
    dogru: 2,
    aciklama:
        'readonly özellikler yalnız bir kez atanabilir; sonra değiştirmek "Cannot modify readonly property" hatası verir.',
  ),
  YarismaSorusu(
    id: 'php-3.cografya.1',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.cografya,
    soru: 'SQL enjeksiyonunu önlemek için PDO ile hangi yaklaşım kullanılır?',
    secenekler: [
      'Girdiyi sorgu metnine birleştirmek',
      'Girdiyi büyük harfe çevirmek',
      'Tablo adını gizlemek',
      'Hazırlanmış sorgu (prepare) ve parametre bağlama',
    ],
    dogru: 3,
    aciklama:
        '\$pdo->prepare("... WHERE id = ?") sonrası execute([\$id]) ile girdi komut olarak değil veri olarak işlenir.',
  ),
  YarismaSorusu(
    id: 'php-3.cografya.2',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.cografya,
    soru:
        'method="post" olan bir HTML formundan gelen alan değerleri PHP\'de hangi süper global dizide bulunur?',
    secenekler: ['\$_POST', '\$_GET', '\$_SESSION', '\$_SERVER'],
    dogru: 0,
    aciklama:
        'POST ile gönderilen form alanları \$_POST dizisinde, URL sorgu parametreleri \$_GET dizisinde toplanır.',
  ),
  YarismaSorusu(
    id: 'php-3.cografya.3',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.cografya,
    soru:
        'Kullanıcı parolalarını veritabanında güvenle saklamak için PHP\'de hangi yaklaşım önerilir?',
    secenekler: [
      'Parolayı düz metin olarak saklamak',
      'Parolayı base64 ile kodlamak',
      'password_hash ile özetleyip password_verify ile doğrulamak',
      'Parolayı strrev ile ters çevirmek',
    ],
    dogru: 2,
    aciklama:
        'password_hash, tuzlu ve yavaş bir özet üretir; password_verify bunu doğrular. Düz metin veya base64 güvenli değildir.',
  ),
  YarismaSorusu(
    id: 'php-3.cografya.4',
    alan: 'kod',
    seviyeKursId: 'php-3',
    kategori: YarismaKategori.cografya,
    soru:
        'Bir dosyanın içeriğini tek çağrıyla metin olarak okumak için hangi PHP işlevi kullanılır?',
    secenekler: [
      'read_all_text',
      'file_get_contents',
      'fopen_text',
      'get_file_string',
    ],
    dogru: 1,
    aciklama:
        'file_get_contents(yol), dosyanın tamamını metin olarak döndürür.',
  ),
];
