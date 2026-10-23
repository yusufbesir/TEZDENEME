// PHP kursu 2/3 (kurs kimliği: php-2). Alan: programlama (KursAlani.kod).
// Sahibi: Adım Adım uygulaması içerik ekibi; yazan: Claude (implementer, dalga6).
// PHP 8 sözdizimi; çıktı soruları php ile çalıştırılarak doğrulandı. Değişiklik: kurs
// kimlikleri ve alıştırma türleri test/icerik_test.dart kurallarına uymalıdır.
import '../model/icerik.dart';

/// PHP Orta Seviye
const Kurs php2 = Kurs(
  id: 'php-2',
  ad: 'PHP Orta Seviye',
  aciklama:
      'Diziler, döngüler, fonksiyonlar ve hazır metin/dizi işlevleriyle PHP programlarını daha düzenli yaz.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'php-2-u1',
      ad: 'Diziler ve döngüler',
      dersler: [
        Ders(
          id: 'php-2-u1-d1',
          ad: 'Dizi temelleri',
          dilbilgisiNotu:
              'Dizi birden çok değeri tek değişkende tutar: \$meyveler = ["elma", "armut", "muz"]; İndeks 0\'dan başlar: \$meyveler[0] "elma"dır. Sona eleman eklemek için \$meyveler[] = "kiraz"; (veya array_push). count(\$dizi) eleman sayısını verir. sort(\$dizi) diziyi yerinde küçükten büyüğe sıralar. Eski yazım array(...) de geçerlidir.\n\nÖrnek:\n\$s = [30, 10, 20];\necho count(\$s);   // 3\nsort(\$s);         // 10, 20, 30\necho \$s[0];       // 10',
          alistirmalar: [
            Secim(
              soru:
                  '\$m = ["elma", "armut", "muz"]; echo \$m[1]; çıktısı nedir?',
              secenekler: ['elma', 'armut', 'muz', '1'],
              dogru: 1,
              aciklama: 'İndeks 0\'dan başladığı için \$m[1] ikinci elemandır.',
            ),
            Secim(
              soru:
                  '\$m = [1, 2, 3]; \$m[] = 4; echo count(\$m); çıktısı nedir?',
              secenekler: ['3', '5', '1', '4'],
              dogru: 3,
              aciklama:
                  '[] ile eklenen eleman sona gider; dizide 4 eleman olur.',
            ),
            Secim(
              soru:
                  '\$s = [30, 10, 20]; sort(\$s); echo \$s[0]; çıktısı nedir?',
              secenekler: ['30', '10', '20', '0'],
              dogru: 1,
              aciklama: 'sort küçükten büyüğe sıralar; ilk eleman 10 olur.',
            ),
            Bosluk(
              soru: 'Dizide ilk elemanın indeksi ___ olur.',
              secenekler: ['1', '0', '-1'],
              dogru: 1,
              aciklama: 'PHP dizilerinde indeks 0\'dan başlar.',
            ),
            Bosluk(
              soru: 'Eleman sayısını ___() işlevi verir.',
              secenekler: ['count', 'size', 'length'],
              dogru: 0,
              aciklama: 'count(\$dizi) dizideki eleman sayısını döndürür.',
            ),
            Yaz(
              soru: 'm dizisinin sonuna "kiraz" ekleyen deyimi yaz.',
              cevaplar: [
                '\$m[] = "kiraz";',
                '\$m[] = "kiraz"',
                '\$m[]="kiraz";',
                '\$m[]="kiraz"',
                '\$m[] = \'kiraz\';',
                '\$m[] = \'kiraz\'',
                '\$m[]=\'kiraz\';',
                '\$m[]=\'kiraz\'',
                'array_push(\$m, "kiraz");',
                'array_push(\$m, "kiraz")',
                'array_push(\$m, \'kiraz\');',
                'array_push(\$m, \'kiraz\')',
              ],
              aciklama: '\$m[] = ... sona yeni eleman ekler.',
            ),
            Sirala(
              soru: 'Komutları doğru sıraya diz.',
              kelimeler: ['echo', '\$sayilar[0];', 'sort(\$sayilar);'],
              dogru: ['sort(\$sayilar);', 'echo', '\$sayilar[0];'],
              aciklama: 'Önce sıralanır, sonra ilk eleman yazdırılır.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: '[]', sag: 'dizi tanımlar'),
                (sol: 'count()', sag: 'eleman sayısını verir'),
                (sol: 'sort()', sag: 'küçükten büyüğe sıralar'),
                (sol: '\$d[0]', sag: 'ilk eleman'),
              ],
              aciklama: 'Dizi işlemlerinin temel öğeleridir.',
            ),
            Isaretle(
              soru: 'İlk elemana erişimi işaretle.',
              cumle: 'echo \$d[0];',
              dogru: [1],
              aciklama: '\$d[0] dizinin ilk elemanıdır.',
            ),
            Kod(
              soru: 'Eleman sayısını yazdır.',
              kod: '\$d = [4, 5, 6];\necho ___(\$d);',
              secenekler: ['size', 'len', 'count'],
              dogru: 2,
              dil: 'php',
              aciklama: 'count(\$d) 3 yazdırır.',
            ),
          ],
        ),
        Ders(
          id: 'php-2-u1-d2',
          ad: 'İlişkisel diziler',
          dilbilgisiNotu:
              'İlişkisel dizide indeks yerine anahtar kullanılır: \$kisi = ["ad" => "Ayşe", "yas" => 25]; Değer \$kisi["ad"] ile okunur. Yeni anahtar eklemek: \$kisi["sehir"] = "Ankara"; isset(\$kisi["ad"]) anahtarın tanımlı ve null olmadığını, array_key_exists anahtarın varlığını denetler. array_keys anahtarları döndürür. in_array(değer, dizi) bir değerin dizide olup olmadığına bakar. array_merge iki diziyi birleştirir.\n\nÖrnek:\n\$kisi = ["ad" => "Ayşe", "yas" => 25];\necho \$kisi["yas"];               // 25\nvar_dump(isset(\$kisi["sehir"])); // bool(false)\nvar_dump(in_array(25, \$kisi));   // bool(true)',
          alistirmalar: [
            Secim(
              soru:
                  '\$k = ["ad" => "Ayse", "yas" => 25]; echo \$k["yas"]; çıktısı nedir?',
              secenekler: ['Ayse', '25', 'yas', '0'],
              dogru: 1,
              aciklama: 'Değer, anahtarı verilerek okunur.',
            ),
            Secim(
              soru:
                  '\$k = ["ad" => "Ayse"]; var_dump(isset(\$k["sehir"])); çıktısı nedir?',
              secenekler: ['bool(true)', 'NULL', 'string(0) ""', 'bool(false)'],
              dogru: 3,
              aciklama:
                  'sehir anahtarı tanımlı olmadığı için isset false verir.',
            ),
            Secim(
              soru:
                  'echo count(array_merge([1, 2], [3, 4, 5])); çıktısı nedir?',
              secenekler: ['2', '5', '3', '6'],
              dogru: 1,
              aciklama:
                  'array_merge iki diziyi birleştirir; sonuçta 5 eleman olur.',
            ),
            Bosluk(
              soru:
                  'İlişkisel dizide anahtar ile değer ___ işaretiyle bağlanır.',
              secenekler: ['->', '=', '::', '=>'],
              dogru: 3,
              aciklama: '"ad" => "Ayşe" biçiminde yazılır.',
            ),
            Bosluk(
              soru:
                  'Bir değerin dizide olup olmadığını ___() işleviyle denetleriz.',
              secenekler: ['in_array', 'has', 'contains'],
              dogru: 0,
              aciklama: 'in_array(değer, dizi) true veya false döndürür.',
            ),
            Yaz(
              soru: 'k dizisinin "sehir" anahtarına "Ankara" değerini ata.',
              cevaplar: [
                '\$k["sehir"] = "Ankara";',
                '\$k["sehir"] = "Ankara"',
                '\$k["sehir"]="Ankara";',
                '\$k["sehir"]="Ankara"',
                '\$k[\'sehir\'] = \'Ankara\';',
                '\$k[\'sehir\'] = \'Ankara\'',
                '\$k[\'sehir\']=\'Ankara\';',
                '\$k[\'sehir\']=\'Ankara\'',
              ],
              aciklama: 'Yeni anahtar atamayla eklenir.',
            ),
            Sirala(
              soru: 'Dizi elemanını doğru sıraya diz.',
              kelimeler: ['=>', '"Ali"', '"ad"'],
              dogru: ['"ad"', '=>', '"Ali"'],
              aciklama: 'Önce anahtar, sonra =>, sonra değer yazılır.',
            ),
            Eslestir(
              soru: 'İşlevi anlamıyla eşleştir.',
              ciftler: [
                (sol: '=>', sag: 'anahtarı değere bağlar'),
                (sol: 'isset()', sag: 'anahtar tanımlı ve null değil mi'),
                (sol: 'array_keys()', sag: 'anahtarları döndürür'),
                (sol: 'array_merge()', sag: 'dizileri birleştirir'),
                (sol: 'in_array()', sag: 'değer dizide mi'),
              ],
              aciklama: 'İlişkisel dizilerle sık kullanılan öğelerdir.',
            ),
            Isaretle(
              soru: 'Anahtarı işaretle.',
              cumle: '"ad" => "Ayse"',
              dogru: [0],
              aciklama: 'Okla bağlanan ilk parça anahtardır.',
            ),
            Kod(
              soru: 'Anahtarı denetle.',
              kod: 'if (___(\$k["ad"])) {\n    echo "var";\n}',
              secenekler: ['sort', 'count', 'isset'],
              dogru: 2,
              dil: 'php',
              aciklama: 'isset, anahtarın tanımlı olup olmadığına bakar.',
            ),
          ],
        ),
        Ders(
          id: 'php-2-u1-d3',
          ad: 'foreach döngüsü',
          dilbilgisiNotu:
              'foreach diziyi eleman eleman gezer: foreach (\$dizi as \$deger) { ... } İlişkisel dizide anahtar ve değeri birlikte almak için foreach (\$dizi as \$anahtar => \$deger) yazılır. break döngüyü bitirir, continue o turu atlayıp sonrakine geçer. Döngü değişkeni normalde elemanın kopyasıdır; elemanı yerinde değiştirmek için referans (&\$deger) gerekir.\n\nÖrnek:\n\$p = ["elma" => 10, "armut" => 15];\nforeach (\$p as \$ad => \$fiyat) {\n    echo \$ad . ": " . \$fiyat . " ";\n}',
          alistirmalar: [
            Secim(
              soru:
                  'foreach ([1, 2, 3] as \$s) { echo \$s * 2; } çıktısı nedir?',
              secenekler: ['123', '246', '6', '2 4 6'],
              dogru: 1,
              aciklama: 'Her eleman ikiyle çarpılıp bitişik yazdırılır.',
            ),
            Secim(
              soru:
                  '\$t = 0; foreach ([5, 10, 15] as \$x) { \$t += \$x; } echo \$t; çıktısı nedir?',
              secenekler: ['15', '5', '0', '30'],
              dogru: 3,
              aciklama: 'Elemanlar toplanır: 5 + 10 + 15 = 30.',
            ),
            Secim(
              soru:
                  'foreach (["a" => 1, "b" => 2] as \$k => \$v) { echo \$k; } çıktısı nedir?',
              secenekler: ['ba', 'ab', 'a', 'a1b'],
              dogru: 1,
              aciklama: 'Döngü her turda anahtarı yazdırır.',
            ),
            Bosluk(
              soru:
                  'Anahtar ve değeri birlikte almak için foreach (… as \$k ___ \$v) yazılır.',
              secenekler: ['->', '=', 'in', '=>'],
              dogru: 3,
              aciklama: 'as \$k => \$v hem anahtarı hem değeri verir.',
            ),
            Bosluk(
              soru:
                  'Bir döngü turunu atlayıp sonrakine geçmek için ___ kullanılır.',
              secenekler: ['continue', 'break', 'skip'],
              dogru: 0,
              aciklama: 'continue geçerli turu sonlandırır.',
            ),
            Yaz(
              soru:
                  'liste dizisini oge değişkeniyle gezen foreach satırını yaz (süslü parantezi aç).',
              cevaplar: [
                'foreach (\$liste as \$oge) {',
                'foreach(\$liste as \$oge){',
                'foreach (\$liste as \$oge){',
                'foreach(\$liste as \$oge) {',
              ],
              aciklama: 'foreach (dizi as değişken) { biçiminde yazılır.',
            ),
            Sirala(
              soru: 'foreach satırını doğru sıraya diz.',
              kelimeler: ['(\$d', 'as', '\$x)', '{', 'foreach'],
              dogru: ['foreach', '(\$d', 'as', '\$x)', '{'],
              aciklama:
                  'foreach, dizi, as, döngü değişkeni ve süslü parantez sırasıyla gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'foreach', sag: 'diziyi eleman eleman gezer'),
                (sol: 'as', sag: 'diziyi döngü değişkenine bağlar'),
                (sol: 'break', sag: 'döngüyü bitirir'),
                (sol: 'continue', sag: 'sonraki tura geçer'),
              ],
              aciklama: 'foreach ve döngü denetim sözcükleri.',
            ),
            Isaretle(
              soru: 'Döngü değişkenini işaretle.',
              cumle: 'foreach (\$d as \$x) {',
              dogru: [3],
              aciklama:
                  'as sözcüğünden sonraki değişken (\$x) her turda elemanı tutar.',
            ),
            Kod(
              soru: 'Fiyatları topla.',
              kod:
                  '\$t = 0;\nforeach ([1, 2, 3] as \$f) {\n    \$t ___ \$f;\n}',
              secenekler: ['=>', '.=', '+='],
              dogru: 2,
              dil: 'php',
              aciklama: '+= her elemanı toplama ekler.',
            ),
          ],
        ),
        Ders(
          id: 'php-2-u1-d4',
          ad: 'for ve while',
          dilbilgisiNotu:
              'for (başlangıç; koşul; artırma) { ... } sayaçlı döngüdür. while (koşul) { ... } koşul doğru olduğu sürece çalışır; do { ... } while (koşul); en az bir kez çalışır. Sonsuz döngüye dikkat: koşulu bir noktada yanlış yapacak bir değişiklik olmalıdır. break döngüyü bitirir, continue turu atlar.\n\nÖrnek:\nfor (\$i = 1; \$i <= 3; \$i++) {\n    echo \$i;   // 123\n}\n\$n = 3;\nwhile (\$n > 0) {\n    echo \$n;   // 321\n    \$n--;\n}',
          alistirmalar: [
            Secim(
              soru:
                  'for (\$i = 0; \$i < 5; \$i += 2) { echo \$i; } çıktısı nedir?',
              secenekler: ['01234', '024', '246', '135'],
              dogru: 1,
              aciklama: 'i 0, 2, 4 değerlerini alır; 6 koşulu bozar.',
            ),
            Secim(
              soru:
                  '\$n = 3; while (\$n > 0) { echo \$n; \$n--; } çıktısı nedir?',
              secenekler: ['123', '210', '3', '321'],
              dogru: 3,
              aciklama: 'n her turda bir azalır ve 0 olunca döngü biter.',
            ),
            Secim(
              soru:
                  '\$n = 10; do { echo "x"; } while (\$n < 5); çıktısı nedir?',
              secenekler: ['xxxxx', 'x', 'boş', '10'],
              dogru: 1,
              aciklama:
                  'do...while koşul yanlış olsa da gövdeyi bir kez çalıştırır.',
            ),
            Bosluk(
              soru: 'for döngüsünün üç bölümü ___ ile ayrılır.',
              secenekler: [',', ';', ':'],
              dogru: 1,
              aciklama: 'for (başlangıç; koşul; artırma) biçimindedir.',
            ),
            Bosluk(
              soru:
                  'En az bir kez çalışması garanti olan döngü ___ döngüsüdür.',
              secenekler: ['do ... while', 'while', 'for'],
              dogru: 0,
              aciklama: 'do...while koşulu gövdeden sonra denetler.',
            ),
            Yaz(
              soru:
                  '1\'den 5\'e kadar sayan for satırını yaz (i kullan, süslü parantezi aç).',
              cevaplar: [
                'for (\$i = 1; \$i <= 5; \$i++) {',
                'for (\$i=1; \$i<=5; \$i++) {',
                'for(\$i = 1; \$i <= 5; \$i++){',
                'for(\$i=1;\$i<=5;\$i++){',
                'for (\$i = 1; \$i < 6; \$i++) {',
              ],
              aciklama:
                  'for (\$i = 1; \$i <= 5; \$i++) bir ile beş arasında sayar.',
            ),
            Sirala(
              soru: 'while satırını doğru sıraya diz.',
              kelimeler: ['(\$n', '>', '0)', '{', 'while'],
              dogru: ['while', '(\$n', '>', '0)', '{'],
              aciklama: 'while, koşul ve süslü parantez sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Yapıyı anlamıyla eşleştir.',
              ciftler: [
                (sol: 'for', sag: 'sayaçlı döngü'),
                (sol: 'while', sag: 'koşul doğru olduğu sürece çalışır'),
                (sol: 'do...while', sag: 'en az bir kez çalışır'),
                (sol: '\$i++', sag: 'sayacı bir artırır'),
              ],
              aciklama: 'Döngü yapılarının görevleri farklıdır.',
            ),
            Isaretle(
              soru: 'Döngü koşulunu oluşturan parçaları işaretle.',
              cumle: 'for (\$i = 0; \$i < 3; \$i++) {',
              dogru: [4, 5, 6],
              aciklama: '\$i < 3 her turdan önce denetlenen koşuldur.',
            ),
            Kod(
              soru: 'Sayacı artır.',
              kod: 'for (\$i = 0; \$i < 3; ___) {\n    echo \$i;\n}',
              secenekler: ['\$i--', '\$i == 1', '\$i++'],
              dogru: 2,
              dil: 'php',
              aciklama: '\$i++ sayacı her turda bir artırır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'php-2-u2',
      ad: 'Fonksiyonlar ve hazır işlevler',
      dersler: [
        Ders(
          id: 'php-2-u2-d1',
          ad: 'Fonksiyon ve return',
          dilbilgisiNotu:
              'function anahtar sözcüğüyle tanımlanır: function selamla(\$ad) { return "Merhaba " . \$ad; } Çağırmak için ad ve parantez yazılır: echo selamla("Ali"); return değeri çağıran yere gönderir ve işlevi bitirir; return olmayan işlev null döndürür. Tanımdaki girdilere parametre, çağrıda verilen değerlere argüman denir.\n\nÖrnek:\nfunction topla(\$a, \$b) {\n    return \$a + \$b;\n}\necho topla(2, 3);   // 5',
          alistirmalar: [
            Secim(
              soru:
                  'function kare(\$x) { return \$x * \$x; } echo kare(4); çıktısı nedir?',
              secenekler: ['8', '16', '4', '44'],
              dogru: 1,
              aciklama: 'kare(4) 4 * 4 = 16 döndürür.',
            ),
            Secim(
              soru:
                  'function f() { echo "a"; return "b"; echo "c"; } echo f(); çıktısı nedir?',
              secenekler: ['abc', 'b', 'a', 'ab'],
              dogru: 3,
              aciklama:
                  'a yazılır, return "b" değeri döndürür ve işlevi bitirir; echo "c" çalışmaz. Dışarıdaki echo b yazar.',
            ),
            Secim(
              soru: 'function g() { } var_dump(g()); çıktısı nedir?',
              secenekler: ['int(0)', 'NULL', 'bool(false)', 'string(0) ""'],
              dogru: 1,
              aciklama: 'return olmayan işlev null döndürür.',
            ),
            Bosluk(
              soru: 'Fonksiyon tanımlamak için ___ anahtar sözcüğü yazılır.',
              secenekler: ['def', 'function', 'void'],
              dogru: 1,
              aciklama: 'PHP\'de fonksiyonlar function ile tanımlanır.',
            ),
            Bosluk(
              soru: 'Bir fonksiyonun değer göndermesini ___ sağlar.',
              secenekler: ['return', 'echo', 'break'],
              dogru: 0,
              aciklama: 'return değeri çağıran yere geri verir.',
            ),
            Yaz(
              soru:
                  'İki sayıyı toplayıp döndüren topla(\$a, \$b) fonksiyonunun return satırını yaz.',
              cevaplar: [
                'return \$a + \$b;',
                'return \$a + \$b',
                'return \$a+\$b;',
                'return \$a+\$b',
                'return \$b + \$a;',
                'return \$b + \$a',
                'return \$b+\$a;',
                'return \$b+\$a',
              ],
              aciklama: 'return \$a + \$b; toplamı döndürür.',
            ),
            Sirala(
              soru: 'Fonksiyonu doğru sıraya diz.',
              kelimeler: [
                'selamla()',
                '{',
                'return',
                '"Selam";',
                '}',
                'function',
              ],
              dogru: ['function', 'selamla()', '{', 'return', '"Selam";', '}'],
              aciklama:
                  'Başlık, süslü parantez, return ve kapanış sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'function', sag: 'fonksiyon tanımlar'),
                (sol: 'return', sag: 'değeri geri gönderir'),
                (sol: 'parametre', sag: 'tanımdaki girdi adı'),
                (sol: 'argüman', sag: 'çağrıda verilen değer'),
              ],
              aciklama: 'Fonksiyonun temel kavramları.',
            ),
            Isaretle(
              soru: 'Fonksiyon adını işaretle.',
              cumle: 'function selamla() {',
              dogru: [1],
              aciklama: 'function sözcüğünden sonraki ad fonksiyonun adıdır.',
            ),
            Kod(
              soru: 'Karesini döndür.',
              kod: 'function kare(\$x) {\n    ___ \$x * \$x;\n}',
              secenekler: ['echo', 'print', 'return'],
              dogru: 2,
              dil: 'php',
              aciklama: 'Değeri geri göndermek için return kullanılır.',
            ),
          ],
        ),
        Ders(
          id: 'php-2-u2-d2',
          ad: 'Varsayılan ve tipli parametreler',
          dilbilgisiNotu:
              'Parametreye varsayılan değer verilebilir: function selamla(\$ad = "Misafir") — argüman gelmezse varsayılan kullanılır; varsayılanlı parametreler sona yazılır. Tür bildirimi parametrenin önüne, dönüş türü parametre listesinden sonra iki nokta ile yazılır: function topla(int \$a, int \$b): int { ... } Dönüş yoksa : void yazılır. ?string null da kabul eder. PHP 8\'de adlandırılmış argüman vardır: selamla(ad: "Ali").\n\nÖrnek:\nfunction selamla(string \$ad = "Misafir"): string {\n    return "Merhaba " . \$ad;\n}\necho selamla();       // Merhaba Misafir\necho selamla("Ali");  // Merhaba Ali',
          alistirmalar: [
            Secim(
              soru:
                  'function s(\$ad = "Misafir") { return "Merhaba " . \$ad; } echo s(); çıktısı nedir?',
              secenekler: [
                'Merhaba',
                'Merhaba Misafir',
                'Merhaba Ali',
                'hata verir',
              ],
              dogru: 1,
              aciklama: 'Argüman verilmeyince varsayılan değer kullanılır.',
            ),
            Secim(
              soru:
                  'function t(int \$a, int \$b = 10): int { return \$a + \$b; } echo t(5); çıktısı nedir?',
              secenekler: ['5', '10', '50', '15'],
              dogru: 3,
              aciklama: 'b için varsayılan 10 kullanılır: 5 + 10 = 15.',
            ),
            Secim(
              soru:
                  'function k(int \$taban, int \$us = 2) { return \$taban ** \$us; } echo k(us: 3, taban: 2); çıktısı nedir?',
              secenekler: ['6', '8', '9', '5'],
              dogru: 1,
              aciklama:
                  'Adlandırılmış argümanlarda sıra önemsizdir: 2 üzeri 3 = 8.',
            ),
            Bosluk(
              soru: 'Tür bildirimi parametre adından ___ yazılır.',
              secenekler: ['sonra', 'önce', 'hiç'],
              dogru: 1,
              aciklama: 'int \$a biçiminde tür, adın önüne gelir.',
            ),
            Bosluk(
              soru:
                  'Dönüş türünü belirtmek için parametre listesinden sonra ___ yazılır.',
              secenekler: [':', '=>', '->'],
              dogru: 0,
              aciklama: 'function f(): int biçimindedir.',
            ),
            Yaz(
              soru:
                  'Varsayılan değeri 1 olan adet parametreli f fonksiyonunun başlığını yaz (süslü parantezi aç).',
              cevaplar: [
                'function f(\$adet = 1) {',
                'function f(\$adet=1) {',
                'function f(\$adet = 1){',
                'function f(\$adet=1){',
              ],
              aciklama: 'Varsayılan değer parametreden sonra = ile verilir.',
            ),
            Sirala(
              soru: 'Başlığı doğru sıraya diz.',
              kelimeler: ['f(int', '\$a):', 'int', '{', 'function'],
              dogru: ['function', 'f(int', '\$a):', 'int', '{'],
              aciklama:
                  'Tür, ad, dönüş türü ve süslü parantez sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'int \$a', sag: 'tam sayı parametre'),
                (sol: '= "Misafir"', sag: 'varsayılan değer'),
                (sol: '): string', sag: 'string dönüş türü'),
                (sol: '?int', sag: 'int veya null'),
              ],
              aciklama: 'Tür bildirimleri kodu daha güvenli yapar.',
            ),
            Isaretle(
              soru: 'Dönüş türünü işaretle.',
              cumle: 'function f(): string {',
              dogru: [2],
              aciklama: 'İki noktadan sonra gelen tür dönüş türüdür.',
            ),
            Kod(
              soru: 'Varsayılan değer ver.',
              kod: 'function f(\$x ___ 5) {\n    return \$x;\n}',
              secenekler: ['=>', ':', '='],
              dogru: 2,
              dil: 'php',
              aciklama: 'Varsayılan değer = ile atanır.',
            ),
          ],
        ),
        Ders(
          id: 'php-2-u2-d3',
          ad: 'Değişken kapsamı',
          dilbilgisiNotu:
              'Fonksiyon içinde tanımlanan değişken yereldir; dışarıdan görünmez. Fonksiyon dışındaki (global) değişken fonksiyon içinde otomatik görünmez: erişmek için global anahtar sözcüğü kullanılır, ancak parametre geçmek daha temiz bir yoldur. static ile tanımlanan yerel değişken çağrılar arasında değerini korur. Anonim fonksiyon dış değişkeni use ile alır.\n\nÖrnek:\n\$x = 10;\nfunction f() {\n    global \$x;\n    return \$x + 1;\n}\nfunction say() {\n    static \$n = 0;\n    return ++\$n;\n}',
          alistirmalar: [
            Secim(
              soru:
                  '\$x = 10; function f() { return isset(\$x) ? "var" : "yok"; } echo f(); çıktısı nedir?',
              secenekler: ['var', 'yok', '10', 'hata verir'],
              dogru: 1,
              aciklama:
                  'Dış değişken fonksiyon içinde otomatik görünmez; \$x tanımsızdır.',
            ),
            Secim(
              soru:
                  '\$x = 10; function f() { global \$x; return \$x + 1; } echo f(); çıktısı nedir?',
              secenekler: ['10', '1', 'hata verir', '11'],
              dogru: 3,
              aciklama: 'global \$x dış değişkeni içeri alır: 10 + 1 = 11.',
            ),
            Secim(
              soru:
                  'function say() { static \$n = 0; return ++\$n; } say(); say(); echo say(); çıktısı nedir?',
              secenekler: ['1', '3', '0', '2'],
              dogru: 1,
              aciklama:
                  'static değişken çağrılar arasında korunur; üçüncü çağrıda 3 olur.',
            ),
            Bosluk(
              soru:
                  'Fonksiyon içinde dış değişkene erişmek için ___ \$x; yazılır.',
              secenekler: ['static', 'global', 'public'],
              dogru: 1,
              aciklama: 'global anahtar sözcüğü dış değişkeni içeri alır.',
            ),
            Bosluk(
              soru:
                  'Çağrılar arasında değerini koruyan yerel değişken ___ ile tanımlanır.',
              secenekler: ['static', 'const', 'global'],
              dogru: 0,
              aciklama: 'static değişken ilk değerini yalnız bir kez alır.',
            ),
            Yaz(
              soru:
                  'Fonksiyon içinde sayac global değişkenini kullanıma açan deyimi yaz.',
              cevaplar: ['global \$sayac;', 'global \$sayac'],
              aciklama: 'global \$sayac; dış değişkeni içeri alır.',
            ),
            Sirala(
              soru: 'Tanımı doğru sıraya diz.',
              kelimeler: ['\$n', '=', '0;', 'static'],
              dogru: ['static', '\$n', '=', '0;'],
              aciklama: 'static, ad, atama ve ilk değer sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Kavramı anlamıyla eşleştir.',
              ciftler: [
                (sol: 'yerel değişken', sag: 'yalnız fonksiyon içinde görünür'),
                (sol: 'global', sag: 'dış değişkeni içeri alır'),
                (sol: 'static', sag: 'değeri çağrılar arasında korur'),
                (sol: 'use', sag: 'anonim fonksiyona dış değişken aktarır'),
              ],
              aciklama: 'Kapsam, değişkenin nerede görüneceğini belirler.',
            ),
            Isaretle(
              soru: 'Kapsam sözcüğünü işaretle.',
              cumle: 'global \$toplam;',
              dogru: [0],
              aciklama: 'global, dış değişkene erişim sağlar.',
            ),
            Kod(
              soru: 'Sayaç korunsun.',
              kod: 'function say() {\n    ___ \$n = 0;\n    return ++\$n;\n}',
              secenekler: ['global', 'const', 'static'],
              dogru: 2,
              dil: 'php',
              aciklama: 'static değişken çağrılar arasında değerini saklar.',
            ),
          ],
        ),
        Ders(
          id: 'php-2-u2-d4',
          ad: 'Hazır string ve dizi işlevleri',
          dilbilgisiNotu:
              'Sık kullanılan hazır işlevler: strlen(\$s) uzunluk (bayt), strtoupper/strtolower büyük/küçük harf, str_replace(\$ara, \$yerine, \$metin) değiştirme, explode(\$ayirac, \$metin) metni diziye bölme, implode(\$yapistirici, \$dizi) diziyi metne birleştirme. Dizi için: count, in_array, array_merge, sort. Türkçe karakterli metinde karakter sayısı için mb_strlen (mbstring eklentisi) kullanılır.\n\nÖrnek:\necho strlen("Merhaba");               // 7\necho str_replace("a", "o", "araba");   // orobo\nprint_r(explode(",", "a,b,c"));        // 3 elemanlı dizi\necho implode("-", [1, 2, 3]);          // 1-2-3',
          alistirmalar: [
            Secim(
              soru: 'echo strtoupper("php"); çıktısı nedir?',
              secenekler: ['php', 'PHP', 'Php', '3'],
              dogru: 1,
              aciklama: 'strtoupper tüm harfleri büyütür.',
            ),
            Secim(
              soru: 'echo str_replace("a", "o", "araba"); çıktısı nedir?',
              secenekler: ['araba', 'oroba', 'orbo', 'orobo'],
              dogru: 3,
              aciklama: 'Metindeki tüm a harfleri o ile değişir.',
            ),
            Secim(
              soru: 'echo count(explode(",", "a,b,c,d")); çıktısı nedir?',
              secenekler: ['3', '4', '7', '1'],
              dogru: 1,
              aciklama: 'explode virgülden böler ve 4 parça üretir.',
            ),
            Bosluk(
              soru: 'Metni ayraca göre diziye bölen işlev ___() adını taşır.',
              secenekler: ['implode', 'explode', 'strlen'],
              dogru: 1,
              aciklama: 'explode metni diziye böler.',
            ),
            Bosluk(
              soru: 'Diziyi metne birleştiren işlev ___() adını taşır.',
              secenekler: ['implode', 'explode', 'concat'],
              dogru: 0,
              aciklama:
                  'implode dizi elemanlarını bir yapıştırıcıyla birleştirir.',
            ),
            Yaz(
              soru: '"merhaba" metninin uzunluğunu yazdıran deyimi yaz.',
              cevaplar: [
                'echo strlen("merhaba");',
                'echo strlen("merhaba")',
                'echo strlen(\'merhaba\');',
                'echo strlen(\'merhaba\')',
              ],
              aciklama: 'strlen metnin uzunluğunu verir.',
            ),
            Sirala(
              soru: 'Deyimi doğru sıraya diz.',
              kelimeler: ['implode(",",', '\$d);', 'echo'],
              dogru: ['echo', 'implode(",",', '\$d);'],
              aciklama: 'echo, implode çağrısı ve dizi sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'İşlevi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'strlen()', sag: 'metnin uzunluğu'),
                (sol: 'str_replace()', sag: 'metin parçasını değiştirir'),
                (sol: 'in_array()', sag: 'değer dizide mi'),
                (sol: 'sort()', sag: 'diziyi sıralar'),
                (sol: 'array_merge()', sag: 'dizileri birleştirir'),
              ],
              aciklama: 'Hazır işlevler sık işleri tek çağrıda yapar.',
            ),
            Isaretle(
              soru: 'Büyük harfe çeviren işlevi işaretle.',
              cumle: 'echo strtoupper("ali");',
              dogru: [1],
              aciklama: 'strtoupper metni büyük harfe çevirir.',
            ),
            Kod(
              soru: 'Metni kelimelere böl.',
              kod: '\$k = ___(" ", "a b c");',
              secenekler: ['implode', 'strlen', 'explode'],
              dogru: 2,
              dil: 'php',
              aciklama: 'explode metni ayraca göre diziye böler.',
            ),
          ],
        ),
      ],
    ),
  ],
);
