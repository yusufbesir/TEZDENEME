// PHP kursu 1/3 (kurs kimliği: php-1). Alan: programlama (KursAlani.kod).
// Sahibi: Adım Adım uygulaması içerik ekibi; yazan: Claude (implementer, dalga6).
// PHP 8 sözdizimi; çıktı soruları php ile çalıştırılarak doğrulandı. Değişiklik: kurs
// kimlikleri ve alıştırma türleri test/icerik_test.dart kurallarına uymalıdır.
import '../model/icerik.dart';

/// PHP'ye Giriş
const Kurs php1 = Kurs(
  id: 'php-1',
  ad: 'PHP\'ye Giriş',
  aciklama:
      'PHP etiketi, değişkenler, türler, operatörler ve if/switch/match ile sunucu tarafı programlamanın temelini sıfırdan öğren.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'php-1-u1',
      ad: 'İlk adımlar',
      dersler: [
        Ders(
          id: 'php-1-u1-d1',
          ad: 'PHP etiketi ve echo',
          dilbilgisiNotu:
              'PHP kodu <?php açılış etiketiyle başlar. Dosyada yalnız PHP varsa kapanış etiketi (?>) yazılmaz. Her deyim noktalı virgülle biter. Ekrana yazdırmak için echo kullanılır; birden çok değer virgülle verilebilir. print de yazdırır ama tek değer alır. Tek satırlık yorum // veya # ile, çok satırlı yorum /* ... */ ile yazılır. PHP sunucuda çalışır; tarayıcıya yalnız çıktısı (çoğunlukla HTML) gider.\n\nÖrnek:\n<?php\n// selamlama\necho "Merhaba Dünya";\necho "Ev", "de";   // Evde',
          alistirmalar: [
            Secim(
              soru: 'PHP kodu hangi açılış etiketiyle başlar?',
              secenekler: ['<php>', '<?php', '<?script', '<%php'],
              dogru: 1,
              aciklama: 'PHP bloğu <?php etiketiyle açılır.',
            ),
            Secim(
              soru: 'PHP kodu nerede çalışır?',
              secenekler: [
                'Tarayıcıda',
                'Yazıcıda',
                'Sabit diskte',
                'Sunucuda',
              ],
              dogru: 3,
              aciklama:
                  'PHP sunucuda çalışır; tarayıcıya yalnız üretilen çıktı gönderilir.',
            ),
            Secim(
              soru: 'echo "Ev", "de"; kodunun çıktısı nedir?',
              secenekler: ['Ev, de', 'Evde', 'Ev de', 'de'],
              dogru: 1,
              aciklama:
                  'echo virgülle ayrılmış değerleri birleştirmeden art arda yazar.',
            ),
            Bosluk(
              soru: 'Her PHP deyimi ___ ile biter.',
              secenekler: [':', '.', ',', ';'],
              dogru: 3,
              aciklama: 'Deyimler noktalı virgülle biter.',
            ),
            Bosluk(
              soru: 'Tek satırlık yorum ___ ile başlar.',
              secenekler: ['<!--', '//', '**', '%%'],
              dogru: 1,
              aciklama: 'Tek satırlık yorum // (veya #) ile yazılır.',
            ),
            Yaz(
              soru: 'Ekrana Merhaba yazdıran komutu yaz.',
              cevaplar: [
                'echo "Merhaba";',
                'echo "Merhaba"',
                'echo \'Merhaba\';',
                'echo \'Merhaba\'',
              ],
              aciklama: 'echo "Merhaba"; ekrana Merhaba yazar.',
            ),
            Sirala(
              soru: 'Dosyayı doğru sıraya diz.',
              kelimeler: ['echo', '"Selam";', '?>', '<?php'],
              dogru: ['<?php', 'echo', '"Selam";', '?>'],
              aciklama:
                  'Önce açılış etiketi, sonra echo ve metin, en sonda kapanış etiketi gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: '<?php', sag: 'PHP kodunu başlatan etiket'),
                (sol: 'echo', sag: 'ekrana yazdırır'),
                (sol: '//', sag: 'tek satırlık yorum'),
                (sol: ';', sag: 'deyimi bitirir'),
              ],
              aciklama:
                  'Etiket, komut, yorum ve noktalı virgül PHP dosyasının temel parçalarıdır.',
            ),
            Isaretle(
              soru: 'Yazdırma komutunu işaretle.',
              cumle: 'echo "Merhaba";',
              dogru: [0],
              aciklama: 'echo, değeri ekrana yazdıran komuttur.',
            ),
            Kod(
              soru: 'Ekrana Selam yazdır.',
              kod: '___ "Selam";',
              secenekler: ['say', 'cout', 'echo'],
              dogru: 2,
              dil: 'php',
              aciklama: 'PHP\'de yazdırmak için echo kullanılır.',
            ),
          ],
        ),
        Ders(
          id: 'php-1-u1-d2',
          ad: 'Değişkenler',
          dilbilgisiNotu:
              'Değişken adı \$ ile başlar: \$ad = "Ayşe"; \$yas = 25; Ad harf veya alt çizgiyle başlar, rakamla başlayamaz ve büyük/küçük harf duyarlıdır (\$ad ile \$Ad farklıdır). Tür bildirmezsin; PHP değerden anlar. Değişmeyen değerler için const kullanılır: const PI = 3.14; (sabitte \$ yoktur). Çift tırnaklı metinde değişken doğrudan yazılabilir: echo "Merhaba \$ad"; tek tırnakta ise olduğu gibi kalır.\n\nÖrnek:\n\$ad = "Ayşe";\n\$yas = 25;\necho "\$ad \$yas yaşında";',
          alistirmalar: [
            Secim(
              soru: 'Hangi değişken adı geçerlidir?',
              secenekler: ['sayi', '\$sayi1', '\$1sayi', '\$sayi-1'],
              dogru: 1,
              aciklama: 'Ad \$ ile başlar ve rakamla başlamaz; tire içeremez.',
            ),
            Secim(
              soru: '\$a = 5; \$b = \$a; \$a = 8; echo \$b; çıktısı nedir?',
              secenekler: ['8', '13', '0', '5'],
              dogru: 3,
              aciklama:
                  '\$b, atama anındaki değeri (5) kopyalamıştır; sonradan \$a değişse de \$b 5 kalır.',
            ),
            Secim(
              soru: '\$ad ve \$Ad aynı değişken midir?',
              secenekler: [
                'Evet, aynı değişkendir',
                'Yalnız sınıf içinde aynıdır',
                'Hayır, farklı değişkenlerdir',
              ],
              dogru: 2,
              aciklama: 'Değişken adları büyük/küçük harf duyarlıdır.',
            ),
            Bosluk(
              soru: 'PHP değişken adı ___ işaretiyle başlar.',
              secenekler: ['@', '#', '&', '\$'],
              dogru: 3,
              aciklama: 'Her değişken adı dolar işaretiyle başlar.',
            ),
            Bosluk(
              soru:
                  'Çift tırnaklı metinde değişken ___ yazılabilir; tek tırnakta olduğu gibi kalır.',
              secenekler: ['doğrudan', 'asla', 'yalnız sayılarla'],
              dogru: 0,
              aciklama:
                  '"Merhaba \$ad" değişkenin değerini yazar; \'Merhaba \$ad\' yazmaz.',
            ),
            Yaz(
              soru: 'ad değişkenine "Ali" metnini atayan deyimi yaz.',
              cevaplar: [
                '\$ad = "Ali";',
                '\$ad = "Ali"',
                '\$ad="Ali";',
                '\$ad="Ali"',
                '\$ad = \'Ali\';',
                '\$ad = \'Ali\'',
                '\$ad=\'Ali\';',
                '\$ad=\'Ali\'',
              ],
              aciklama: 'Atama = ile yapılır.',
            ),
            Sirala(
              soru: 'Atamayı doğru sıraya diz.',
              kelimeler: ['=', '30;', '\$yas'],
              dogru: ['\$yas', '=', '30;'],
              aciklama:
                  'Önce değişken, sonra atama operatörü, sonra değer gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: '\$', sag: 'değişken adının ilk işareti'),
                (sol: '=', sag: 'değeri değişkene atar'),
                (sol: 'const', sag: 'değiştirilemeyen sabit tanımlar'),
                (sol: '\$Ad', sag: '\$ad\'dan farklı bir değişken'),
              ],
              aciklama: 'Değişkenler \$ ile başlar ve harf duyarlıdır.',
            ),
            Isaretle(
              soru: 'Değişken adını işaretle.',
              cumle: '\$sayi = 10;',
              dogru: [0],
              aciklama: 'Değişken adı \$ ile başlayan kısımdır.',
            ),
            Kod(
              soru: 'Yaşı 20 olan değişkeni tanımla.',
              kod: '___ = 20;',
              secenekler: ['yas', '&yas', '\$yas'],
              dogru: 2,
              dil: 'php',
              aciklama: 'Değişken adı \$ ile başlar.',
            ),
          ],
        ),
        Ders(
          id: 'php-1-u1-d3',
          ad: 'Veri türleri',
          dilbilgisiNotu:
              'Temel türler: string (metin), int (tam sayı), float (ondalık), bool (true/false), array (dizi) ve null (değer yok). Ondalık ayraç noktadır: 3.14. gettype(\$x) türün adını döndürür (ondalık için "double" der); var_dump(\$x) tür ve değeri birlikte gösterir. Tırnaklı "5" bir stringdir, tırnaksız 5 ise int\'tir.\n\nÖrnek:\n\$a = 5;      // int\n\$b = 2.5;    // float\n\$c = "5";    // string\n\$d = true;   // bool',
          alistirmalar: [
            Secim(
              soru: 'gettype(3.14) hangi sözcüğü döndürür?',
              secenekler: ['integer', 'double', 'string', 'decimal'],
              dogru: 1,
              aciklama: 'gettype ondalık sayılar için "double" döndürür.',
            ),
            Secim(
              soru: 'var_dump(true); çıktısı nedir?',
              secenekler: ['true', 'bool(1)', '1', 'bool(true)'],
              dogru: 3,
              aciklama: 'var_dump önce türü, sonra değeri yazar.',
            ),
            Secim(
              soru: 'Hangisi bir string değeridir?',
              secenekler: ['43', '"42"', '4.5', 'true'],
              dogru: 1,
              aciklama: 'Tırnak içindeki değer string olur.',
            ),
            Bosluk(
              soru: '5 sayısı ___ türündedir.',
              secenekler: ['string', 'float', 'bool', 'int'],
              dogru: 3,
              aciklama: 'Ondalıksız sayı int türündedir.',
            ),
            Bosluk(
              soru: 'Değer yokluğunu gösteren özel değer ___ yazılır.',
              secenekler: ['null', 'void', 'none'],
              dogru: 0,
              aciklama: 'null, değerin olmadığını belirtir.',
            ),
            Yaz(
              soru: 'x değişkeninin türünü döndüren işlev çağrısını yaz.',
              cevaplar: [
                'gettype(\$x);',
                'gettype(\$x)',
                'echo gettype(\$x);',
                'echo gettype(\$x)',
              ],
              aciklama: 'gettype(\$x) türün adını döndürür.',
            ),
            Sirala(
              soru: 'Atamayı doğru sıraya diz.',
              kelimeler: ['=', 'true;', '\$ok'],
              dogru: ['\$ok', '=', 'true;'],
              aciklama: 'Değişken, atama operatörü ve değer sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Türü anlamıyla eşleştir.',
              ciftler: [
                (sol: 'int', sag: 'tam sayı'),
                (sol: 'float', sag: 'ondalık sayı'),
                (sol: 'bool', sag: 'true veya false'),
                (sol: 'string', sag: 'metin'),
              ],
              aciklama: 'Her tür farklı tip değeri tutar.',
            ),
            Isaretle(
              soru: 'Ondalık sayıyı işaretle.',
              cumle: '\$a = 5; \$b = 2.5; \$c = "x";',
              dogru: [5],
              aciklama: '2.5 noktalı olduğu için float\'tır.',
            ),
            Kod(
              soru: 'Mantıksal değer ata.',
              kod: '\$acik = ___;',
              secenekler: ['dogru', 'evet', 'true'],
              dogru: 2,
              dil: 'php',
              aciklama: 'Mantıksal değerler true ve false\'tur.',
            ),
          ],
        ),
        Ders(
          id: 'php-1-u1-d4',
          ad: 'Metin ve birleştirme',
          dilbilgisiNotu:
              'Metin tek veya çift tırnakla yazılır. Çift tırnakta değişkenler ve \\n gibi kaçış dizileri çalışır; tek tırnakta olduğu gibi yazılır. Metinleri birleştirmek için nokta (.) operatörü kullanılır: "Merhaba " . \$ad. Sonuna eklemek için .= kullanılır. Karmaşık ifadeleri çift tırnağa süslü parantezle gömebilirsin: "{\$dizi[\'a\']}".\n\nÖrnek:\n\$ad = "Ali";\necho \'Merhaba \$ad\';   // Merhaba \$ad\necho "Merhaba \$ad";   // Merhaba Ali\n\$s = "a";\n\$s .= "b";           // ab',
          alistirmalar: [
            Secim(
              soru: '\$ad = "Ali"; echo \'Merhaba \$ad\'; çıktısı nedir?',
              secenekler: ['Merhaba Ali', 'Merhaba \$ad', 'Merhaba', 'Ali'],
              dogru: 1,
              aciklama:
                  'Tek tırnakta değişken çözümlenmez; metin olduğu gibi yazılır.',
            ),
            Secim(
              soru:
                  '\$ad = "Ali"; echo "Merhaba " . \$ad . "!"; çıktısı nedir?',
              secenekler: ['Merhaba !', 'MerhabaAli!', 'Ali!', 'Merhaba Ali!'],
              dogru: 3,
              aciklama: 'Nokta operatörü üç parçayı art arda birleştirir.',
            ),
            Secim(
              soru:
                  '\$s = "a"; \$s .= "b"; \$s .= "c"; echo \$s; çıktısı nedir?',
              secenekler: ['a', 'abc', 'cba', 'a b c'],
              dogru: 1,
              aciklama: '.= sağdaki metni değişkenin sonuna ekler.',
            ),
            Bosluk(
              soru: 'Metinleri birleştiren operatör ___ işaretidir.',
              secenekler: ['+', '&', '|', '.'],
              dogru: 3,
              aciklama:
                  'PHP\'de birleştirme için nokta kullanılır, + sayılar içindir.',
            ),
            Bosluk(
              soru: 'Tek tırnaklı metinde değişken adı ___.',
              secenekler: [
                'olduğu gibi yazılır',
                'değerine dönüşür',
                'hata verir',
              ],
              dogru: 0,
              aciklama: 'Tek tırnakta değişken çözümlenmez.',
            ),
            Yaz(
              soru: '"Merhaba " metni ile ad değişkenini birleştirip yazdır.',
              cevaplar: [
                'echo "Merhaba " . \$ad;',
                'echo "Merhaba " . \$ad',
                'echo "Merhaba ".\$ad;',
                'echo "Merhaba ".\$ad',
              ],
              aciklama: 'Nokta operatörü iki metni birleştirir.',
            ),
            Sirala(
              soru: 'Yazdırma deyimini doğru sıraya diz.',
              kelimeler: ['"Selam"', '.', '\$ad;', 'echo'],
              dogru: ['echo', '"Selam"', '.', '\$ad;'],
              aciklama: 'echo, ilk metin, nokta ve değişken sırasıyla gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: '.', sag: 'metinleri birleştirir'),
                (sol: '.=', sag: 'sağdaki metni sona ekler'),
                (sol: '"..."', sag: 'değişkenleri çözümler'),
                (sol: '\'...\'', sag: 'metni olduğu gibi bırakır'),
              ],
              aciklama:
                  'Nokta birleştirir, tırnak türü değişken çözümlemeyi belirler.',
            ),
            Isaretle(
              soru: 'Birleştirme operatörünü işaretle.',
              cumle: 'echo "a" . "b";',
              dogru: [2],
              aciklama: 'Nokta metinleri birleştirir.',
            ),
            Kod(
              soru: 'Adı selamla.',
              kod: 'echo "Merhaba " ___ \$ad;',
              secenekler: ['+', '&', '.'],
              dogru: 2,
              dil: 'php',
              aciklama: 'Birleştirme operatörü noktadır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'php-1-u2',
      ad: 'Operatörler ve karar verme',
      dersler: [
        Ders(
          id: 'php-1-u2-d1',
          ad: 'Aritmetik operatörler',
          dilbilgisiNotu:
              '+ toplama, - çıkarma, * çarpma, / bölme, % mod (kalan), ** üs alma operatörleridir. / tam bölünmediğinde ondalık verir (10 / 4 = 2.5). Tam sayı bölümü için intdiv(7, 2) kullanılır (3). \$i++ bir artırır, \$i-- bir azaltır; kısa atamalar: += -= *= /=. Öncelik matematikteki gibidir; parantez önceliği değiştirir.\n\nÖrnek:\necho 7 % 3;        // 1\necho 2 ** 3;       // 8\necho intdiv(7, 2); // 3\n\$x = 5;\n\$x += 2;           // 7',
          alistirmalar: [
            Secim(
              soru: 'echo 7 % 3; çıktısı nedir?',
              secenekler: ['2', '1', '3', '0'],
              dogru: 1,
              aciklama: '7 ÷ 3 işleminde bölüm 2, kalan 1\'dir.',
            ),
            Secim(
              soru: 'echo 2 ** 3; çıktısı nedir?',
              secenekler: ['6', '5', '9', '8'],
              dogru: 3,
              aciklama: '** üs alır: 2 üzeri 3 = 8.',
            ),
            Secim(
              soru: 'echo 10 / 4; çıktısı nedir?',
              secenekler: ['2', '2.5', '3', '2,5'],
              dogru: 1,
              aciklama: '/ tam bölünmezse ondalık sonuç verir.',
            ),
            Bosluk(
              soru: 'Bölmeden kalanı veren operatör ___ işaretidir.',
              secenekler: ['/', '**', '&', '%'],
              dogru: 3,
              aciklama: 'Mod operatörü % kalanı verir.',
            ),
            Bosluk(
              soru: 'Tam sayı bölümü için ___(7, 2) kullanılır.',
              secenekler: ['intdiv', 'divmod', 'quot'],
              dogru: 0,
              aciklama: 'intdiv(7, 2) sonucu 3\'tür.',
            ),
            Yaz(
              soru: 'x değişkenini 1 artıran kısa deyimi yaz.',
              cevaplar: [
                '\$x++;',
                '\$x++',
                '++\$x;',
                '++\$x',
                '\$x += 1;',
                '\$x += 1',
                '\$x+=1;',
                '\$x+=1',
                '\$x = \$x + 1;',
                '\$x = \$x + 1',
              ],
              aciklama: '\$x++ değişkeni bir artırır.',
            ),
            Sirala(
              soru: 'Kısa atamayı doğru sıraya diz.',
              kelimeler: ['+=', '\$sayi;', '\$toplam'],
              dogru: ['\$toplam', '+=', '\$sayi;'],
              aciklama:
                  'Önce değişken, sonra operatör, sonra eklenecek değer yazılır.',
            ),
            Eslestir(
              soru: 'Operatörü anlamıyla eşleştir.',
              ciftler: [
                (sol: '%', sag: 'bölmeden kalan'),
                (sol: '**', sag: 'üs alma'),
                (sol: 'intdiv()', sag: 'tam sayı bölümü'),
                (sol: '+=', sag: 'ekleyip atar'),
              ],
              aciklama: 'Her operatör farklı bir işlemi yapar.',
            ),
            Isaretle(
              soru: 'Üs alma operatörünü işaretle.',
              cumle: 'echo 3 ** 2;',
              dogru: [2],
              aciklama: '** üs alma operatörüdür.',
            ),
            Kod(
              soru: 'Kalanı hesapla.',
              kod: 'echo 10 ___ 3;',
              secenekler: ['/', '**', '%'],
              dogru: 2,
              dil: 'php',
              aciklama: '10 % 3 = 1 olur.',
            ),
          ],
        ),
        Ders(
          id: 'php-1-u2-d2',
          ad: 'Karşılaştırma ve mantık',
          dilbilgisiNotu:
              '== değerleri tür dönüşümüyle karşılaştırır; === hem değeri hem türü karşılaştırır ve çoğunlukla tercih edilir. != (veya <>) eşit değil, !== tür dahil eşit değil demektir. <, >, <=, >= büyüklük karşılaştırır. Mantıksal operatörler: && (ve), || (veya), ! (değil). <=> (uzay gemisi) -1, 0 veya 1 döndürür.\n\nÖrnek:\nvar_dump(5 == "5");    // bool(true)\nvar_dump(5 === "5");   // bool(false)\nvar_dump(3 <=> 7);     // int(-1)',
          alistirmalar: [
            Secim(
              soru: 'var_dump(5 == "5"); çıktısı nedir?',
              secenekler: [
                'bool(false)',
                'bool(true)',
                'int(5)',
                'string(1) "5"',
              ],
              dogru: 1,
              aciklama:
                  '== türü dönüştürerek karşılaştırır; 5 ile "5" eşit sayılır.',
            ),
            Secim(
              soru: 'var_dump(5 === "5"); çıktısı nedir?',
              secenekler: ['bool(true)', 'int(0)', 'NULL', 'bool(false)'],
              dogru: 3,
              aciklama:
                  '=== türü de karşılaştırır; int ile string eşit değildir.',
            ),
            Secim(
              soru: 'var_dump(true && false); çıktısı nedir?',
              secenekler: ['bool(true)', 'bool(false)', 'int(1)', 'NULL'],
              dogru: 1,
              aciklama: '&& iki taraf da doğruysa true verir.',
            ),
            Bosluk(
              soru:
                  'Değer ve türü birlikte karşılaştıran operatör ___ işaretidir.',
              secenekler: ['==', '=', '!=', '==='],
              dogru: 3,
              aciklama: '=== sıkı eşitlik operatörüdür.',
            ),
            Bosluk(
              soru: '"Veya" mantıksal operatörü ___ yazılır.',
              secenekler: ['&&', '||', '!', '=>'],
              dogru: 1,
              aciklama: '|| iki koşuldan biri doğruysa true verir.',
            ),
            Yaz(
              soru:
                  'a değişkeninin 10\'a tür dahil eşit olup olmadığını denetleyen ifadeyi yaz.',
              cevaplar: ['\$a === 10', '\$a === 10;', '\$a===10', '\$a===10;'],
              aciklama: '=== tür dahil eşitlik arar.',
            ),
            Sirala(
              soru: 'Karşılaştırmayı doğru sıraya diz.',
              kelimeler: ['===', '\$b;', '\$a'],
              dogru: ['\$a', '===', '\$b;'],
              aciklama: 'Sol değer, operatör ve sağ değer sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Operatörü anlamıyla eşleştir.',
              ciftler: [
                (sol: '==', sag: 'değer eşitliği'),
                (sol: '===', sag: 'değer ve tür eşitliği'),
                (sol: '&&', sag: 've'),
                (sol: '!', sag: 'değil'),
                (sol: '<=>', sag: '-1, 0 veya 1 döndürür'),
              ],
              aciklama:
                  'Karşılaştırma ve mantık operatörlerinin görevleri farklıdır.',
            ),
            Isaretle(
              soru: 'Tür dahil eşitlik operatörünü işaretle.',
              cumle: 'if (\$a === \$b) {',
              dogru: [2],
              aciklama: '=== hem değeri hem türü karşılaştırır.',
            ),
            Kod(
              soru: 'Sonuç bool(false) olsun.',
              kod: 'var_dump(5 ___ "5");',
              secenekler: ['==', '<=', '==='],
              dogru: 2,
              dil: 'php',
              aciklama: '5 === "5" türler farklı olduğu için false verir.',
            ),
          ],
        ),
        Ders(
          id: 'php-1-u2-d3',
          ad: 'if, elseif ve else',
          dilbilgisiNotu:
              'if (koşul) { ... } elseif (koşul2) { ... } else { ... } yapısında koşul doğruysa ilk uygun blok çalışır, diğerleri atlanır. else hiçbir koşul doğru değilse çalışır. Kısa biçim üçlü operatördür: \$mesaj = \$yas >= 18 ? "yetişkin" : "çocuk"; Süslü parantez tek satırlık blokta zorunlu değildir ama okunurluk için önerilir.\n\nÖrnek:\n\$not = 70;\nif (\$not >= 85) {\n    echo "A";\n} elseif (\$not >= 60) {\n    echo "B";\n} else {\n    echo "C";\n}',
          alistirmalar: [
            Secim(
              soru: '\$not = 70 iken yukarıdaki örnek ne yazar?',
              secenekler: ['A', 'B', 'C', 'ABC'],
              dogru: 1,
              aciklama:
                  '70, 85\'ten küçük ama 60\'tan büyüktür; elseif bloğu çalışır.',
            ),
            Secim(
              soru:
                  '\$s = 5; if (\$s > 3) { echo "buyuk"; } else { echo "kucuk"; } çıktısı nedir?',
              secenekler: ['kucuk', 'buyukkucuk', 'hiçbir şey', 'buyuk'],
              dogru: 3,
              aciklama: '5 > 3 doğru olduğundan if bloğu çalışır.',
            ),
            Secim(
              soru:
                  '\$yas = 20; echo \$yas >= 18 ? "yetiskin" : "cocuk"; çıktısı nedir?',
              secenekler: ['cocuk', 'yetiskin', 'true', '20'],
              dogru: 1,
              aciklama: 'Üçlü operatör koşul doğruysa ilk değeri verir.',
            ),
            Bosluk(
              soru:
                  'Birinci koşul yanlışsa ikinci koşulu denemek için ___ kullanılır.',
              secenekler: ['else', 'switch', 'break', 'elseif'],
              dogru: 3,
              aciklama: 'elseif yeni bir koşul ekler.',
            ),
            Bosluk(
              soru: 'Hiçbir koşul doğru değilse ___ bloğu çalışır.',
              secenekler: ['elseif', 'else', 'case', 'default'],
              dogru: 1,
              aciklama: 'else son çare bloğudur.',
            ),
            Yaz(
              soru:
                  'x değişkeni 10\'dan büyükse çalışacak if satırını yaz (süslü parantezi aç).',
              cevaplar: [
                'if (\$x > 10) {',
                'if(\$x > 10){',
                'if (\$x > 10){',
                'if(\$x>10){',
                'if (\$x>10) {',
              ],
              aciklama:
                  'Koşul parantez içine, blok süslü parantez içine yazılır.',
            ),
            Sirala(
              soru: 'Koşul satırını doğru sıraya diz.',
              kelimeler: ['(\$yas', '>=', '18)', '{', 'if'],
              dogru: ['if', '(\$yas', '>=', '18)', '{'],
              aciklama: 'if, koşul ve süslü parantez sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Yapıyı anlamıyla eşleştir.',
              ciftler: [
                (sol: 'if', sag: 'koşul doğruysa çalışır'),
                (
                  sol: 'elseif',
                  sag: 'önceki koşullar yanlışsa yeni koşul dener',
                ),
                (sol: 'else', sag: 'hiçbir koşul doğru değilse çalışır'),
                (sol: '? :', sag: 'tek satırlık koşullu değer'),
              ],
              aciklama: 'Her yapı akışın farklı bir kolunu kontrol eder.',
            ),
            Isaretle(
              soru: 'Koşul ifadesini işaretle.',
              cumle: 'if (\$yas >= 18) {',
              dogru: [1, 2, 3],
              aciklama: 'Parantez içindeki \$yas >= 18 koşuldur.',
            ),
            Kod(
              soru: 'Notu değerlendir.',
              kod:
                  'if (\$not >= 50) {\n    echo "gecti";\n} ___ {\n    echo "kaldi";\n}',
              secenekler: ['elseif', 'case', 'else'],
              dogru: 2,
              dil: 'php',
              aciklama: 'Koşul yanlışsa çalışacak blok else ile yazılır.',
            ),
          ],
        ),
        Ders(
          id: 'php-1-u2-d4',
          ad: 'switch ve match',
          dilbilgisiNotu:
              'switch, bir değeri sırayla case değerleriyle (gevşek ==) karşılaştırır. Her case sonuna break yazılmazsa akış sonraki case\'e düşer. default hiçbiri uymazsa çalışır. PHP 8\'in match ifadesi bir değer döndürür, sıkı (===) karşılaştırır, break gerektirmez; eşleşme yoksa ve default yoksa UnhandledMatchError atar.\n\nÖrnek:\n\$gun = 2;\n\$ad = match (\$gun) {\n    1 => "Pazartesi",\n    2 => "Salı",\n    default => "Başka",\n};\necho \$ad;   // Salı',
          alistirmalar: [
            Secim(
              soru:
                  '\$x = 1 iken switch (\$x) { case 1: echo "a"; case 2: echo "b"; break; case 3: echo "c"; } ne yazar?',
              secenekler: ['a', 'ab', 'abc', 'b'],
              dogru: 1,
              aciklama:
                  'case 1 çalışır, break olmadığı için case 2\'ye düşer; orada break ile durur.',
            ),
            Secim(
              soru:
                  '\$n = 2; echo match (\$n) { 1 => "bir", 2 => "iki", default => "baska" }; ne yazar?',
              secenekler: ['bir', 'baska', '2', 'iki'],
              dogru: 3,
              aciklama:
                  'match 2 değerini 2 koluyla eşleştirir ve değerini döndürür.',
            ),
            Secim(
              soru:
                  '\$n = "2"; echo match (\$n) { 2 => "int", default => "baska" }; ne yazar?',
              secenekler: ['int', 'baska', '2', 'hata verir'],
              dogru: 1,
              aciklama:
                  'match sıkı karşılaştırır; "2" stringi 2 int\'ine eşit değildir, default çalışır.',
            ),
            Bosluk(
              soru: 'switch\'te case\'ten sonra akışı kesmek için ___ yazılır.',
              secenekler: ['stop', 'break', 'end'],
              dogru: 1,
              aciklama: 'break yazılmazsa sonraki case de çalışır.',
            ),
            Bosluk(
              soru: 'match ifadesi eşleşme bulamazsa ve ___ yoksa hata atar.',
              secenekler: ['default', 'else', 'break'],
              dogru: 0,
              aciklama: 'match\'te default kolu eşleşmeyen değerleri yakalar.',
            ),
            Yaz(
              soru: 'Hiçbir case uymazsa çalışacak switch etiketini yaz.',
              cevaplar: ['default:', 'default'],
              aciklama: 'default etiketi iki nokta ile biter.',
            ),
            Sirala(
              soru: 'case satırını doğru sıraya diz.',
              kelimeler: ['1:', 'echo', '"bir";', 'break;', 'case'],
              dogru: ['case', '1:', 'echo', '"bir";', 'break;'],
              aciklama: 'case, değer, işlem ve break sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'switch', sag: 'değeri case\'lerle karşılaştırır'),
                (sol: 'break', sag: 'case\'ten çıkar'),
                (sol: 'default', sag: 'hiçbiri uymazsa çalışır'),
                (sol: 'match', sag: 'değer döndürür, sıkı karşılaştırır'),
              ],
              aciklama: 'switch ve match çoklu seçim için kullanılır.',
            ),
            Isaretle(
              soru: 'Değer döndüren yapıyı işaretle.',
              cumle: '\$a = match (\$n) { 1 => "bir" };',
              dogru: [2],
              aciklama: 'match ifade olduğu için bir değer döndürür.',
            ),
            Kod(
              soru: 'Seçilen günü yazdır.',
              kod:
                  'switch (\$gun) {\n    case 1:\n        echo "Pzt";\n        ___;\n    default:\n        echo "Diger";\n}',
              secenekler: ['stop', 'end', 'break'],
              dogru: 2,
              dil: 'php',
              aciklama:
                  'break, case\'ten sonra diğer kollara düşmeyi engeller.',
            ),
          ],
        ),
      ],
    ),
  ],
);
