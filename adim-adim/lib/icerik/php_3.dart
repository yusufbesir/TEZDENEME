// PHP kursu 3/3 (kurs kimliği: php-3). Alan: programlama (KursAlani.kod).
// Sahibi: Adım Adım uygulaması içerik ekibi; yazan: Claude (implementer, dalga6).
// PHP 8 sözdizimi; çıktı soruları php ile çalıştırılarak doğrulandı. Değişiklik: kurs
// kimlikleri ve alıştırma türleri test/icerik_test.dart kurallarına uymalıdır.
import '../model/icerik.dart';

/// PHP İleri Seviye
const Kurs php3 = Kurs(
  id: 'php-3',
  ad: 'PHP İleri Seviye',
  aciklama:
      'Sınıflar ve nesneler, kalıtım, form girdisi, güvenli çıktı, istisnalar ve PDO\'ya giriş.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'php-3-u1',
      ad: 'Nesne yönelimli programlama',
      dersler: [
        Ders(
          id: 'php-3-u1-d1',
          ad: 'Sınıf ve nesne',
          dilbilgisiNotu:
              'Sınıf, nesnelerin planıdır: class Araba { public \$renk = "kirmizi"; public function sur() { ... } } Nesne new ile üretilir: \$a = new Araba(); Özelliğe ve yönteme -> ile erişilir: \$a->renk, \$a->sur(). Sınıfın içinde geçerli nesneye \$this ile ulaşılır. Aynı sınıftan birbirinden bağımsız birçok nesne üretilebilir. Sınıf adları genelde Büyük harfle başlar.\n\nÖrnek:\nclass Araba {\n    public \$renk = "kirmizi";\n    public function sur() {\n        return "Araba " . \$this->renk;\n    }\n}\n\$a = new Araba();\necho \$a->sur();   // Araba kirmizi',
          alistirmalar: [
            Secim(
              soru:
                  'class A { public \$r = "mavi"; } \$a = new A(); echo \$a->r; çıktısı nedir?',
              secenekler: ['A', 'mavi', 'r', 'hata verir'],
              dogru: 1,
              aciklama: '-> ile nesnenin özelliği okunur.',
            ),
            Secim(
              soru:
                  'class S { public \$n = 0; } \$a = new S(); \$b = new S(); \$a->n = 5; echo \$b->n; çıktısı nedir?',
              secenekler: ['5', 'null', 'hata verir', '0'],
              dogru: 3,
              aciklama:
                  'Nesneler bağımsızdır; \$a\'nın değişmesi \$b\'yi etkilemez.',
            ),
            Secim(
              soru:
                  'class A { public function sur() { return "vrum"; } } \$a = new A(); echo \$a->sur(); çıktısı nedir?',
              secenekler: ['sur', 'vrum', 'A', 'hata verir'],
              dogru: 1,
              aciklama:
                  'Yöntem -> ile çağrılır ve döndürdüğü değer yazdırılır.',
            ),
            Bosluk(
              soru: 'Sınıftan nesne üretmek için ___ kullanılır.',
              secenekler: ['create', 'new', 'make'],
              dogru: 1,
              aciklama: 'new Sınıf() yeni bir nesne üretir.',
            ),
            Bosluk(
              soru: 'Nesnenin özelliğine ___ işaretiyle erişilir.',
              secenekler: ['.', '->', '=>', '::'],
              dogru: 1,
              aciklama: 'Örnek özellik ve yöntemler -> ile kullanılır.',
            ),
            Yaz(
              soru: 'Araba sınıfından a nesnesini üreten deyimi yaz.',
              cevaplar: [
                '\$a = new Araba();',
                '\$a = new Araba()',
                '\$a = new Araba;',
                '\$a = new Araba',
                '\$a=new Araba();',
                '\$a=new Araba()',
                '\$a=new Araba;',
                '\$a=new Araba',
              ],
              aciklama: 'new Araba() bir nesne üretir.',
            ),
            Sirala(
              soru: 'Nesne üretimini doğru sıraya diz.',
              kelimeler: ['=', 'new', 'Araba();', '\$a'],
              dogru: ['\$a', '=', 'new', 'Araba();'],
              aciklama: 'Değişken, atama, new ve sınıf adı sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'class', sag: 'sınıf tanımlar'),
                (sol: 'new', sag: 'nesne üretir'),
                (sol: '->', sag: 'özellik veya yönteme erişir'),
                (sol: '\$this', sag: 'geçerli nesne'),
              ],
              aciklama: 'Nesne yönelimli programlamanın temel parçaları.',
            ),
            Isaretle(
              soru: 'Nesne üretme sözcüğünü işaretle.',
              cumle: '\$a = new Araba();',
              dogru: [2],
              aciklama: 'new, sınıftan nesne üretir.',
            ),
            Kod(
              soru: 'Nesne üret.',
              kod: '\$a = ___ Araba();',
              secenekler: ['clone', 'class', 'new'],
              dogru: 2,
              dil: 'php',
              aciklama: 'Nesne new ile üretilir.',
            ),
          ],
        ),
        Ders(
          id: 'php-3-u1-d2',
          ad: 'Kurucu yöntem',
          dilbilgisiNotu:
              'Kurucu (__construct) nesne üretilirken otomatik çalışır ve başlangıç değerlerini atar: class Kitap { public \$ad; public function __construct(\$ad) { \$this->ad = \$ad; } } \$k = new Kitap("Sefiller"); Kurucuya argümanlar new\'den sonraki parantezde verilir. PHP 8\'de kurucu özellik tanıtımı vardır: public function __construct(public string \$ad) {} hem parametreyi hem özelliği tanımlar.\n\nÖrnek:\nclass Kitap {\n    public function __construct(\n        public string \$ad,\n        public int \$sayfa = 100\n    ) {}\n}\n\$k = new Kitap("Sefiller");\necho \$k->sayfa;   // 100',
          alistirmalar: [
            Secim(
              soru:
                  'class K { public \$ad; public function __construct(\$ad) { \$this->ad = \$ad; } } \$k = new K("Sefiller"); echo \$k->ad; çıktısı nedir?',
              secenekler: ['K', 'Sefiller', 'ad', 'hata verir'],
              dogru: 1,
              aciklama: 'Kurucu, verilen argümanı ad özelliğine atar.',
            ),
            Secim(
              soru:
                  'class K { public function __construct(public string \$ad, public int \$sayfa = 100) {} } \$k = new K("Sefiller"); echo \$k->sayfa; çıktısı nedir?',
              secenekler: ['0', 'Sefiller', 'hata verir', '100'],
              dogru: 3,
              aciklama:
                  'Kurucuda verilmeyen parametre varsayılan değerini alır ve özellik olur.',
            ),
            Secim(
              soru: 'Kurucu yöntem ne zaman çalışır?',
              secenekler: [
                'Nesne silinirken',
                'new ile nesne üretilirken',
                'Sınıf tanımlanırken',
                'Her yöntem çağrısında',
              ],
              dogru: 1,
              aciklama: 'Kurucu, nesne üretildiği anda bir kez çalışır.',
            ),
            Bosluk(
              soru: 'Kurucu yöntemin adı ___ olmalıdır.',
              secenekler: ['__init', '__construct', 'constructor'],
              dogru: 1,
              aciklama: 'PHP\'de kurucu __construct adını taşır.',
            ),
            Bosluk(
              soru: 'Sınıf içinde geçerli nesneye ___ ile ulaşılır.',
              secenekler: ['\$this', 'self', '\$self'],
              dogru: 0,
              aciklama: '\$this çalışmakta olan nesneyi gösterir.',
            ),
            Yaz(
              soru:
                  'Kurucuda ad parametresini nesnenin ad özelliğine atayan deyimi yaz.',
              cevaplar: [
                '\$this->ad = \$ad;',
                '\$this->ad = \$ad',
                '\$this->ad=\$ad;',
                '\$this->ad=\$ad',
              ],
              aciklama: '\$this->ad nesnenin ad özelliğidir.',
            ),
            Sirala(
              soru: 'Atamayı doğru sıraya diz.',
              kelimeler: ['=', '\$ad;', '\$this->ad'],
              dogru: ['\$this->ad', '=', '\$ad;'],
              aciklama:
                  'Önce özellik, sonra atama operatörü, sonra parametre yazılır.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: '__construct', sag: 'nesne üretilince çalışır'),
                (sol: '\$this->ad', sag: 'nesnenin ad özelliği'),
                (sol: 'new Kitap("A")', sag: 'kurucuya argüman verir'),
                (
                  sol: 'public string \$ad',
                  sag: 'parametre ve özelliği birlikte tanımlar',
                ),
              ],
              aciklama: 'Kurucu nesneyi başlangıç değerleriyle hazırlar.',
            ),
            Isaretle(
              soru: 'Kurucu yöntemin adını işaretle.',
              cumle: 'public function __construct(\$ad) {',
              dogru: [2],
              aciklama: '__construct kurucunun adıdır.',
            ),
            Kod(
              soru: 'Kurucuyu tanımla.',
              kod: 'class K {\n    public function ___(\$ad) {}\n}',
              secenekler: ['__init', 'constructor', '__construct'],
              dogru: 2,
              dil: 'php',
              aciklama: 'Kurucunun adı __construct\'tır.',
            ),
          ],
        ),
        Ders(
          id: 'php-3-u1-d3',
          ad: 'Görünürlük ve kapsülleme',
          dilbilgisiNotu:
              'Görünürlük, özelliğe ve yönteme kimlerin erişebileceğini belirler. public her yerden, protected sınıfın ve alt sınıfların içinden, private yalnız tanımlandığı sınıfın içinden erişilir. Özellikleri private yapıp getter/setter yöntemleriyle kontrollü açmak veriyi korur (kapsülleme). Yetkisiz erişim Error hatası verir.\n\nÖrnek:\nclass Hesap {\n    private \$bakiye = 0;\n    public function yatir(\$t) {\n        \$this->bakiye += \$t;\n    }\n    public function bakiye() {\n        return \$this->bakiye;\n    }\n}\n\$h = new Hesap();\n\$h->yatir(50);\necho \$h->bakiye();   // 50',
          alistirmalar: [
            Secim(
              soru:
                  'Hesap sınıfında \$h->yatir(50); \$h->yatir(25); echo \$h->bakiye(); çıktısı nedir?',
              secenekler: ['50', '75', '25', '0'],
              dogru: 1,
              aciklama: 'Bakiye iki yatırmayla 50 + 25 = 75 olur.',
            ),
            Secim(
              soru:
                  'class H { private \$b = 1; } \$h = new H(); try { echo \$h->b; } catch (Error \$e) { echo "hata"; } çıktısı nedir?',
              secenekler: ['1', 'b', 'null', 'hata'],
              dogru: 3,
              aciklama:
                  'private özelliğe sınıf dışından erişmek Error fırlatır.',
            ),
            Secim(
              soru:
                  'Hangi görünürlük yalnız tanımlandığı sınıfın içinden erişime izin verir?',
              secenekler: ['public', 'private', 'protected', 'global'],
              dogru: 1,
              aciklama: 'private en kısıtlayıcı düzeydir.',
            ),
            Bosluk(
              soru:
                  'Alt sınıfların erişebildiği, dışarıdan erişilemeyen düzey ___ düzeyidir.',
              secenekler: ['public', 'protected', 'private'],
              dogru: 1,
              aciklama: 'protected, sınıf ve alt sınıflar içinde erişilebilir.',
            ),
            Bosluk(
              soru: 'Özelliği ___ yapıp getter ile açmak veriyi korur.',
              secenekler: ['private', 'public', 'global'],
              dogru: 0,
              aciklama: 'Kapsülleme için özellik private yapılır.',
            ),
            Yaz(
              soru:
                  'bakiye özelliğini yalnız sınıf içinden erişilir yapan bildirimi yaz.',
              cevaplar: [
                'private \$bakiye;',
                'private \$bakiye',
                'private \$bakiye = 0;',
                'private \$bakiye = 0',
                'private \$bakiye=0;',
                'private \$bakiye=0',
              ],
              aciklama: 'private \$bakiye; özelliği gizler.',
            ),
            Sirala(
              soru: 'Bildirimi doğru sıraya diz.',
              kelimeler: ['\$bakiye', '=', '0;', 'private'],
              dogru: ['private', '\$bakiye', '=', '0;'],
              aciklama: 'Görünürlük, ad, atama ve değer sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Düzeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'public', sag: 'her yerden erişilir'),
                (sol: 'protected', sag: 'sınıf ve alt sınıflardan erişilir'),
                (sol: 'private', sag: 'yalnız kendi sınıfından erişilir'),
                (sol: 'getter', sag: 'özelliği okuyan açık yöntem'),
              ],
              aciklama: 'Görünürlük erişim sınırını belirler.',
            ),
            Isaretle(
              soru: 'Görünürlük sözcüğünü işaretle.',
              cumle: 'private \$bakiye = 0;',
              dogru: [0],
              aciklama: 'private erişimi sınırlar.',
            ),
            Kod(
              soru: 'Dışarıdan erişimi kapat.',
              kod: 'class H {\n    ___ \$sifre = "x";\n}',
              secenekler: ['public', 'global', 'private'],
              dogru: 2,
              dil: 'php',
              aciklama: 'private özelliğe yalnız sınıf içinden erişilir.',
            ),
          ],
        ),
        Ders(
          id: 'php-3-u1-d4',
          ad: 'Kalıtım',
          dilbilgisiNotu:
              'extends ile bir sınıf başka bir sınıfın özelliklerini ve yöntemlerini devralır: class Kopek extends Hayvan { } Alt sınıf devraldığı yöntemi aynı adla yeniden yazarak değiştirebilir (geçersiz kılma). parent:: üst sınıfın yöntemine ulaştırır; parent::__construct(...) üst kurucuyu çağırır. final sınıf miras alınamaz. Bir sınıf yalnızca tek sınıftan miras alır.\n\nÖrnek:\nclass Hayvan {\n    public function ses() {\n        return "...";\n    }\n}\nclass Kopek extends Hayvan {\n    public function ses() {\n        return "Hav";\n    }\n}\n\$k = new Kopek();\necho \$k->ses();   // Hav',
          alistirmalar: [
            Secim(
              soru:
                  'class H { public function ses() { return "..."; } } class K extends H { } \$k = new K(); echo \$k->ses(); çıktısı nedir?',
              secenekler: ['K', '...', 'hata verir', 'null'],
              dogru: 1,
              aciklama: 'K, H\'nin ses() yöntemini devralır.',
            ),
            Secim(
              soru:
                  'class H { public function ses() { return "..."; } } class K extends H { public function ses() { return "Hav"; } } \$k = new K(); echo \$k->ses(); çıktısı nedir?',
              secenekler: ['...', 'Hav...', 'hata verir', 'Hav'],
              dogru: 3,
              aciklama: 'Alt sınıftaki ses() üst sınıftakini geçersiz kılar.',
            ),
            Secim(
              soru:
                  'class H { public function ses() { return "ses"; } } class K extends H { public function ses() { return parent::ses() . "!"; } } \$k = new K(); echo \$k->ses(); çıktısı nedir?',
              secenekler: ['ses', 'ses!', '!', 'hata verir'],
              dogru: 1,
              aciklama:
                  'parent::ses() üst sınıfın "ses" değerini verir; sonuna ! eklenir.',
            ),
            Bosluk(
              soru: 'Bir sınıfı başka sınıftan türetmek için ___ kullanılır.',
              secenekler: ['implements', 'extends', 'inherits'],
              dogru: 1,
              aciklama: 'class Alt extends Ust biçiminde yazılır.',
            ),
            Bosluk(
              soru: 'Üst sınıfın yöntemine alt sınıftan ___:: ile ulaşılır.',
              secenekler: ['parent', 'super', 'self'],
              dogru: 0,
              aciklama: 'parent:: üst sınıfı gösterir.',
            ),
            Yaz(
              soru:
                  'Kopek sınıfını Hayvan sınıfından türeten başlığı yaz (süslü parantezi aç).',
              cevaplar: [
                'class Kopek extends Hayvan {',
                'class Kopek extends Hayvan{',
              ],
              aciklama: 'class Alt extends Ust { biçimindedir.',
            ),
            Sirala(
              soru: 'Sınıf başlığını doğru sıraya diz.',
              kelimeler: ['Kopek', 'extends', 'Hayvan', '{', 'class'],
              dogru: ['class', 'Kopek', 'extends', 'Hayvan', '{'],
              aciklama:
                  'class, alt sınıf, extends, üst sınıf ve süslü parantez sırasıyla gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'extends', sag: 'sınıfı türetir'),
                (sol: 'parent::', sag: 'üst sınıfa ulaşır'),
                (
                  sol: 'geçersiz kılma',
                  sag: 'alt sınıfta yöntemi yeniden yazma',
                ),
                (sol: 'final', sag: 'miras alınmasını engeller'),
              ],
              aciklama: 'Kalıtım kodun yeniden kullanılmasını sağlar.',
            ),
            Isaretle(
              soru: 'Üst sınıfın adını işaretle.',
              cumle: 'class Kopek extends Hayvan {',
              dogru: [3],
              aciklama: 'extends sözcüğünden sonra gelen ad üst sınıftır.',
            ),
            Kod(
              soru: 'Üst sınıfı çağır.',
              kod:
                  'class B extends A {\n    public function f() {\n        return ___::f();\n    }\n}',
              secenekler: ['super', 'base', 'parent'],
              dogru: 2,
              dil: 'php',
              aciklama: 'Üst sınıfa parent:: ile ulaşılır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'php-3-u2',
      ad: 'Web girdisi, güvenlik ve veritabanı',
      dersler: [
        Ders(
          id: 'php-3-u2-d1',
          ad: 'Form girdisi: \$_GET ve \$_POST',
          dilbilgisiNotu:
              'Tarayıcıdan gelen veriler süper global dizilerde bulunur. \$_GET adres çubuğundaki sorgu dizesini (?ad=Ali), \$_POST form gövdesiyle gönderilen veriyi taşır. Anahtar yoksa uyarı alırsın; bunu önlemek için null birleştirme ?? kullanılır: anahtar yoksa veya null ise sağdaki değer alınır. Gelen veri güvenilmezdir: doğrulanmalı ve çıktıda süzülmelidir. isset(\$_POST["x"]) gönderim olup olmadığını denetler.\n\nÖrnek:\n// /sayfa.php?ad=Ali\n\$ad = \$_GET["ad"] ?? "Misafir";\n\$yas = (int) (\$_POST["yas"] ?? 0);',
          alistirmalar: [
            Secim(
              soru: '\$d = []; echo \$d["ad"] ?? "Misafir"; çıktısı nedir?',
              secenekler: ['ad', 'Misafir', 'hata verir', 'null'],
              dogru: 1,
              aciklama: 'Anahtar yoksa ?? sağdaki değeri verir.',
            ),
            Secim(
              soru:
                  '\$_GET["ad"] = "Ali"; echo \$_GET["ad"] ?? "Misafir"; çıktısı nedir?',
              secenekler: ['Misafir', 'ad', 'null', 'Ali'],
              dogru: 3,
              aciklama:
                  'Anahtar tanımlı olduğundan ?? soldaki değeri kullanır.',
            ),
            Secim(
              soru: 'Adres çubuğundaki ?ad=Ali parametresini hangi dizi taşır?',
              secenekler: ['\$_POST', '\$_GET', '\$_COOKIE', '\$_FILES'],
              dogru: 1,
              aciklama: 'URL sorgu dizesi \$_GET\'e yazılır.',
            ),
            Bosluk(
              soru: 'Form gövdesiyle gönderilen veri ___ dizisinde bulunur.',
              secenekler: ['\$_GET', '\$_POST', '\$GLOBALS'],
              dogru: 1,
              aciklama: 'method="post" ile gönderilen alanlar \$_POST\'tadır.',
            ),
            Bosluk(
              soru:
                  'Anahtar yoksa varsayılan değer vermek için ___ operatörü kullanılır.',
              secenekler: ['??', '&&', '=>'],
              dogru: 0,
              aciklama: '?? null birleştirme operatörüdür.',
            ),
            Yaz(
              soru:
                  '_GET dizisinden "ad" değerini, yoksa "Misafir" olarak ad değişkenine atayan deyimi yaz.',
              cevaplar: [
                '\$ad = \$_GET["ad"] ?? "Misafir";',
                '\$ad = \$_GET["ad"] ?? "Misafir"',
                '\$ad=\$_GET["ad"]??"Misafir";',
                '\$ad=\$_GET["ad"]??"Misafir"',
                '\$ad = \$_GET[\'ad\'] ?? \'Misafir\';',
                '\$ad = \$_GET[\'ad\'] ?? \'Misafir\'',
                '\$ad=\$_GET[\'ad\']??\'Misafir\';',
                '\$ad=\$_GET[\'ad\']??\'Misafir\'',
              ],
              aciklama: '?? ile varsayılan değer verilir.',
            ),
            Sirala(
              soru: 'Atamayı doğru sıraya diz.',
              kelimeler: ['=', '\$_GET["ad"]', '??', '"Misafir";', '\$ad'],
              dogru: ['\$ad', '=', '\$_GET["ad"]', '??', '"Misafir";'],
              aciklama:
                  'Değişken, atama, kaynak, ?? ve varsayılan sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: '\$_GET', sag: 'adres satırındaki sorgu verisi'),
                (sol: '\$_POST', sag: 'form gövdesindeki veri'),
                (sol: '??', sag: 'yoksa varsayılan değer verir'),
                (sol: 'isset()', sag: 'değişken veya anahtar tanımlı mı'),
              ],
              aciklama: 'Form girdisini okurken bu araçlar kullanılır.',
            ),
            Isaretle(
              soru: 'Null birleştirme operatörünü işaretle.',
              cumle: '\$ad = \$_GET["ad"] ?? "Misafir";',
              dogru: [3],
              aciklama: '?? anahtar yoksa sağ tarafı kullanır.',
            ),
            Kod(
              soru: 'Varsayılan ver.',
              kod: '\$sehir = \$_POST["sehir"] ___ "Ankara";',
              secenekler: ['&&', '=>', '??'],
              dogru: 2,
              dil: 'php',
              aciklama: 'Gönderilmemişse "Ankara" kullanılır.',
            ),
          ],
        ),
        Ders(
          id: 'php-3-u2-d2',
          ad: 'htmlspecialchars ile güvenli çıktı',
          dilbilgisiNotu:
              'Kullanıcıdan gelen metni sayfaya olduğu gibi yazarsan kötü niyetli biri <script> gibi etiketler yerleştirebilir (XSS saldırısı). Bunu önlemek için çıktıda htmlspecialchars() kullanılır: özel karakterleri (&, <, >, ", \') HTML karşılıklarına çevirir (&amp; &lt; &gt; &quot; &#039;). Kaçışlama veriyi saklarken değil, sayfaya yazarken yapılır. Önerilen çağrı: htmlspecialchars(\$ad, ENT_QUOTES, "UTF-8").\n\nÖrnek:\n\$girdi = "<b>Merhaba</b>";\necho htmlspecialchars(\$girdi);\n// &lt;b&gt;Merhaba&lt;/b&gt;',
          alistirmalar: [
            Secim(
              soru: 'echo htmlspecialchars("<b>Merhaba</b>"); çıktısı nedir?',
              secenekler: [
                '<b>Merhaba</b>',
                '&lt;b&gt;Merhaba&lt;/b&gt;',
                'Merhaba',
                '&amp;b&amp;Merhaba',
              ],
              dogru: 1,
              aciklama: '< ve > karakterleri &lt; ve &gt; olur.',
            ),
            Secim(
              soru: 'echo htmlspecialchars("a & b"); çıktısı nedir?',
              secenekler: ['a & b', 'a &lt; b', 'a b', 'a &amp; b'],
              dogru: 3,
              aciklama: '& işareti &amp; olur.',
            ),
            Secim(
              soru: 'echo htmlspecialchars(\'"x"\'); çıktısı nedir?',
              secenekler: ['"x"', '&quot;x&quot;', '&#039;x&#039;', 'x'],
              dogru: 1,
              aciklama: 'Çift tırnak &quot; olarak kaçırılır.',
            ),
            Bosluk(
              soru: 'Kullanıcı girdisini sayfaya yazarken ___ ile kaçırırız.',
              secenekler: ['count()', 'htmlspecialchars()', 'sort()'],
              dogru: 1,
              aciklama: 'htmlspecialchars XSS riskini azaltır.',
            ),
            Bosluk(
              soru: '< karakteri htmlspecialchars ile ___ olur.',
              secenekler: ['&gt;', '&lt;', '&amp;', '&quot;'],
              dogru: 1,
              aciklama: '&lt; "less than" demektir.',
            ),
            Yaz(
              soru: 'ad değişkenini güvenli biçimde yazdıran deyimi yaz.',
              cevaplar: [
                'echo htmlspecialchars(\$ad);',
                'echo htmlspecialchars(\$ad)',
                'echo htmlspecialchars(\$ad, ENT_QUOTES, "UTF-8");',
                'echo htmlspecialchars(\$ad, ENT_QUOTES, "UTF-8")',
                'echo htmlspecialchars(\$ad, ENT_QUOTES, \'UTF-8\');',
                'echo htmlspecialchars(\$ad, ENT_QUOTES, \'UTF-8\')',
                'echo htmlspecialchars(\$ad, ENT_QUOTES);',
                'echo htmlspecialchars(\$ad, ENT_QUOTES)',
                'echo htmlspecialchars(\$ad,ENT_QUOTES,"UTF-8");',
                'echo htmlspecialchars(\$ad,ENT_QUOTES,"UTF-8")',
              ],
              aciklama: 'Çıktı htmlspecialchars ile kaçırılır.',
            ),
            Sirala(
              soru: 'Atamayı doğru sıraya diz.',
              kelimeler: ['=', 'htmlspecialchars(\$ad);', '\$guvenli'],
              dogru: ['\$guvenli', '=', 'htmlspecialchars(\$ad);'],
              aciklama: 'Değişken, atama ve işlev çağrısı sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Kavramı anlamıyla eşleştir.',
              ciftler: [
                (
                  sol: 'XSS',
                  sag: 'sayfaya zararlı betik yerleştirme saldırısı',
                ),
                (
                  sol: 'htmlspecialchars()',
                  sag: 'özel karakterleri HTML karşılığına çevirir',
                ),
                (sol: '&lt;', sag: '< işaretinin HTML karşılığı'),
                (sol: '&amp;', sag: '& işaretinin HTML karşılığı'),
              ],
              aciklama: 'Güvenli çıktı XSS\'e karşı temel savunmadır.',
            ),
            Isaretle(
              soru: 'Güvenli çıktı işlevini işaretle.',
              cumle: 'echo htmlspecialchars(\$ad);',
              dogru: [1],
              aciklama: 'htmlspecialchars çıktıdaki özel karakterleri kaçırır.',
            ),
            Kod(
              soru: 'Girdiyi kaçır.',
              kod: 'echo ___(\$yorum);',
              secenekler: ['strlen', 'count', 'htmlspecialchars'],
              dogru: 2,
              dil: 'php',
              aciklama: 'Yorum sayfaya yazılmadan önce kaçırılmalıdır.',
            ),
          ],
        ),
        Ders(
          id: 'php-3-u2-d3',
          ad: 'try, catch ve istisnalar',
          dilbilgisiNotu:
              'Hata çıkabilecek kod try bloğuna yazılır; istisna fırlatılırsa catch bloğu yakalar ve program çökmez. throw new Exception("mesaj"); ile kendi istisnanı fırlatırsın; \$e->getMessage() mesajı verir. finally bloğu hata olsa da olmasa da çalışır. Exception ve Error sınıfları Throwable arayüzünü uygular. intdiv(1, 0) gibi sıfıra bölme DivisionByZeroError fırlatır.\n\nÖrnek:\ntry {\n    throw new Exception("Bir sorun var");\n} catch (Exception \$e) {\n    echo \$e->getMessage();\n} finally {\n    echo " (bitti)";\n}',
          alistirmalar: [
            Secim(
              soru:
                  'try { throw new Exception("Bir sorun"); } catch (Exception \$e) { echo \$e->getMessage(); } çıktısı nedir?',
              secenekler: ['Exception', 'Bir sorun', 'hata verir', 'null'],
              dogru: 1,
              aciklama: 'getMessage fırlatılan istisnanın mesajını verir.',
            ),
            Secim(
              soru: 'try { echo "a"; } finally { echo "b"; } çıktısı nedir?',
              secenekler: ['a', 'b', 'ba', 'ab'],
              dogru: 3,
              aciklama: 'try çalışır, ardından finally her durumda çalışır.',
            ),
            Secim(
              soru:
                  'try { echo intdiv(1, 0); } catch (DivisionByZeroError \$e) { echo "bolunemez"; } çıktısı nedir?',
              secenekler: ['0', 'bolunemez', 'INF', 'hata verir'],
              dogru: 1,
              aciklama:
                  'Sıfıra bölme DivisionByZeroError fırlatır ve catch yakalar.',
            ),
            Bosluk(
              soru: 'İstisna fırlatmak için ___ anahtar sözcüğü kullanılır.',
              secenekler: ['raise', 'throw', 'catch'],
              dogru: 1,
              aciklama: 'throw new Exception(...) istisna fırlatır.',
            ),
            Bosluk(
              soru: 'Hata olsa da olmasa da çalışan blok ___ bloğudur.',
              secenekler: ['finally', 'catch', 'else'],
              dogru: 0,
              aciklama: 'finally temizlik işleri için kullanılır.',
            ),
            Yaz(
              soru: 'Hata mesajını yazdıran deyimi yaz (e istisna nesnesi).',
              cevaplar: ['echo \$e->getMessage();', 'echo \$e->getMessage()'],
              aciklama: 'getMessage() istisna mesajını döndürür.',
            ),
            Sirala(
              soru: 'İstisna fırlatmayı doğru sıraya diz.',
              kelimeler: ['new', 'Exception("Hata");', 'throw'],
              dogru: ['throw', 'new', 'Exception("Hata");'],
              aciklama: 'throw, new ve istisna sınıfı sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'try', sag: 'hata olabilecek kod'),
                (sol: 'catch', sag: 'hatayı yakalar'),
                (sol: 'throw', sag: 'istisna fırlatır'),
                (sol: 'finally', sag: 'her durumda çalışır'),
                (sol: 'getMessage()', sag: 'hata mesajını verir'),
              ],
              aciklama: 'İstisna yönetiminin temel parçaları.',
            ),
            Isaretle(
              soru: 'İstisna fırlatan sözcüğü işaretle.',
              cumle: 'throw new Exception("Hata");',
              dogru: [0],
              aciklama: 'throw istisnayı fırlatır.',
            ),
            Kod(
              soru: 'Hatayı yakala.',
              kod:
                  'try {\n    echo intdiv(1, 0);\n} ___ (DivisionByZeroError \$e) {\n    echo "hata";\n}',
              secenekler: ['except', 'rescue', 'catch'],
              dogru: 2,
              dil: 'php',
              aciklama: 'Fırlatılan istisna catch ile yakalanır.',
            ),
          ],
        ),
        Ders(
          id: 'php-3-u2-d4',
          ad: 'PDO ve hazırlanmış sorgular',
          dilbilgisiNotu:
              'PDO, PHP\'nin veritabanlarına (MySQL, SQLite, PostgreSQL...) bağlanma arayüzüdür. Kullanıcı girdisini SQL metnine doğrudan eklemek SQL enjeksiyonuna yol açar. Güvenli yol hazırlanmış sorgudur: sorguda yer tutucu (? veya :ad) bırakılır, değerler ayrıca gönderilir. Kavramsal akış:\n\n\$pdo = new PDO(\$dsn, \$kullanici, \$parola);\n\$sorgu = \$pdo->prepare("SELECT * FROM urunler WHERE id = :id");\n\$sorgu->execute(["id" => \$id]);\n\$satir = \$sorgu->fetch();   // tek satır\n\$hepsi = \$sorgu->fetchAll(); // tüm satırlar\n\nHataların istisna olarak fırlatılması için PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION ayarı kullanılır. Bu derste kod çalıştırılmaz; amaç mantığı kavramaktır.',
          alistirmalar: [
            Secim(
              soru: 'SQL enjeksiyonunu önlemenin doğru yolu nedir?',
              secenekler: [
                'Sorguyu büyük harfle yazmak',
                'Hazırlanmış sorgu kullanmak',
                'Girdiyi echo ile yazdırmak',
                'Sorgu sonuna noktalı virgül koymak',
              ],
              dogru: 1,
              aciklama:
                  'Değerler sorgu metninden ayrı gönderilirse girdi SQL olarak yorumlanmaz.',
            ),
            Secim(
              soru:
                  '"SELECT * FROM urunler WHERE id = :id" sorgusunda :id nedir?',
              secenekler: ['Sütun adı', 'Tablo adı', 'Sabit', 'Yer tutucu'],
              dogru: 3,
              aciklama: ':id, değerin sonradan bağlanacağı yer tutucudur.',
            ),
            Secim(
              soru:
                  'Sorgunun tüm sonuç satırlarını dizi olarak alan yöntem hangisidir?',
              secenekler: ['fetch()', 'fetchAll()', 'execute()', 'prepare()'],
              dogru: 1,
              aciklama: 'fetch tek satır, fetchAll tüm satırları verir.',
            ),
            Bosluk(
              soru:
                  'Hazırlanmış sorguda değerler sorgu metnine eklenmez, ___ ile ayrıca gönderilir.',
              secenekler: ['prepare()', 'execute()', 'fetch()'],
              dogru: 1,
              aciklama: 'execute yer tutucuların değerlerini alır.',
            ),
            Bosluk(
              soru: 'PDO ile tek bir sonuç satırı ___ ile alınır.',
              secenekler: ['fetch()', 'prepare()', 'execute()'],
              dogru: 0,
              aciklama: 'fetch() sıradaki tek satırı döndürür.',
            ),
            Yaz(
              soru:
                  'sorgu hazırlanmış sorgusuna id değerini "id" anahtarıyla gönderen çağrıyı yaz.',
              cevaplar: [
                '\$sorgu->execute(["id" => \$id]);',
                '\$sorgu->execute(["id" => \$id])',
                '\$sorgu->execute([":id" => \$id]);',
                '\$sorgu->execute([":id" => \$id])',
                '\$sorgu->execute(["id"=>\$id]);',
                '\$sorgu->execute(["id"=>\$id])',
                '\$sorgu->execute([\'id\' => \$id]);',
                '\$sorgu->execute([\'id\' => \$id])',
                '\$sorgu->execute([\':id\' => \$id]);',
                '\$sorgu->execute([\':id\' => \$id])',
              ],
              aciklama: 'execute, yer tutucu değerlerini bir dizi olarak alır.',
            ),
            Sirala(
              soru: 'Atamayı doğru sıraya diz.',
              kelimeler: ['=', '\$pdo->prepare(\$sql);', '\$sorgu'],
              dogru: ['\$sorgu', '=', '\$pdo->prepare(\$sql);'],
              aciklama: 'Değişken, atama ve prepare çağrısı sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Kavramı anlamıyla eşleştir.',
              ciftler: [
                (sol: 'PDO', sag: 'veritabanı bağlantı arayüzü'),
                (sol: 'prepare()', sag: 'sorguyu hazırlar'),
                (sol: 'execute()', sag: 'değerlerle çalıştırır'),
                (sol: 'fetch()', sag: 'tek satır alır'),
                (
                  sol: 'SQL enjeksiyonu',
                  sag: 'girdinin SQL\'e karışması saldırısı',
                ),
              ],
              aciklama: 'PDO ile güvenli sorgu akışının adımları.',
            ),
            Isaretle(
              soru: 'Yer tutucuyu işaretle.',
              cumle: 'WHERE id = :id',
              dogru: [3],
              aciklama: ':id değeri sonradan bağlanan yer tutucudur.',
            ),
            Kod(
              soru: 'Sorguyu hazırla.',
              kod: '\$sorgu = \$pdo->___("SELECT * FROM urunler");',
              secenekler: ['fetch', 'close', 'prepare'],
              dogru: 2,
              dil: 'php',
              aciklama: 'Sorgu önce prepare ile hazırlanır.',
            ),
          ],
        ),
      ],
    ),
  ],
);
