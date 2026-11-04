// Go kursu 1/3 (kurs kimliği: go-1). Alan: programlama (KursAlani.kod).
// Sahibi: Adım Adım uygulaması içerik ekibi; yazan: Claude (implementer, dalga9).
// Go 1.2x sözdizimi; çıktı soruları go run ile çalıştırılarak, kod parçaları gofmt -e
// ile denetlenerek doğrulandı. Değişiklik: kurs kimlikleri ve alıştırma türleri
// test/icerik_test.dart kurallarına uymalıdır.
import '../model/icerik.dart';

/// Go'ya Giriş
const Kurs go1 = Kurs(
  id: 'go-1',
  ad: 'Go\'ya Giriş',
  aciklama:
      'Program yapısı, fmt ile yazdırma, değişkenler, temel türler, sabitler, if, switch ve for ile Go\'nun temellerini sıfırdan öğren.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'go-1-u1',
      ad: 'İlk adımlar',
      dersler: [
        Ders(
          id: 'go-1-u1-d1',
          ad: 'package main ve fmt.Println',
          dilbilgisiNotu:
              'Her Go dosyası package bildirimiyle başlar. Çalıştırılabilir program package main olmalı ve func main() içermelidir; program main fonksiyonundan başlar. import ile paket alınır; fmt biçimli yazdırma paketidir. fmt.Println değerlerin arasına boşluk koyar ve sonuna satır sonu ekler; fmt.Print ise hiçbir şey eklemez. Kullanılmayan bir import derleme hatasıdır. Yorum // ile (tek satır) veya /* ... */ ile (çok satır) yazılır. Çalıştırmak için: go run main.go\n\nÖrnek:\npackage main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Merhaba", "Go") // Merhaba Go\n    fmt.Print("A")\n    fmt.Print("B\\n")             // AB\n}',
          alistirmalar: [
            Secim(
              soru:
                  'Çalıştırılabilir bir Go programı hangi paket bildirimiyle başlar?',
              secenekler: [
                'package app',
                'package main',
                'package run',
                'package start',
              ],
              dogru: 1,
              aciklama:
                  'Çalıştırılabilir programlar package main olmalı ve func main() içermelidir.',
            ),
            Secim(
              soru: 'fmt.Println("Go", 1, 3) çıktısı nedir?',
              secenekler: ['Go 1 3', 'Go13', 'Go,1,3', '3 1 Go'],
              dogru: 0,
              aciklama:
                  'Println değerlerin arasına boşluk koyar ve sonuna satır sonu ekler.',
            ),
            Secim(
              soru: 'Bir paketi import edip hiç kullanmazsan ne olur?',
              secenekler: [
                'Uyarı verir, çalışır',
                'Derleme hatası verir',
                'Sessizce çalışır',
                'Paket otomatik silinir',
              ],
              dogru: 1,
              aciklama: 'Kullanılmayan import Go\'da derleme hatasıdır.',
            ),
            Bosluk(
              soru: 'Go programı ___ fonksiyonundan başlar.',
              secenekler: ['start', 'main', 'run', 'init'],
              dogru: 1,
              aciklama:
                  'Program giriş noktası main paketindeki main fonksiyonudur.',
            ),
            Bosluk(
              soru: 'Paket eklemek için ___ anahtar sözcüğü kullanılır.',
              secenekler: ['use', 'include', 'import', 'require'],
              dogru: 2,
              aciklama: 'Go\'da paketler import ile eklenir.',
            ),
            Yaz(
              soru: 'Ekrana Merhaba yazdıran fmt.Println satırını yaz.',
              cevaplar: [
                'fmt.Println("Merhaba")',
                'fmt.Println("Merhaba");',
                'fmt.Println(`Merhaba`)',
              ],
              aciklama:
                  'fmt.Println("Merhaba") metni yazar ve satır sonu ekler.',
            ),
            Sirala(
              soru: 'Programı doğru sıraya diz.',
              kelimeler: [
                '}',
                'fmt.Println("Selam")',
                'func main() {',
                'import "fmt"',
                'package main',
              ],
              dogru: [
                'package main',
                'import "fmt"',
                'func main() {',
                'fmt.Println("Selam")',
                '}',
              ],
              aciklama:
                  'Önce paket, sonra import, sonra main fonksiyonu gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'package main', sag: 'çalıştırılabilir program paketi'),
                (sol: 'import', sag: 'paket ekler'),
                (sol: 'func main()', sag: 'programın giriş noktası'),
                (sol: '//', sag: 'tek satırlık yorum'),
                (sol: 'fmt.Println', sag: 'satır sonu ekleyerek yazar'),
              ],
              aciklama: 'Bunlar bir Go programının temel parçalarıdır.',
            ),
            Isaretle(
              soru: 'Yazdırma çağrısını işaretle.',
              cumle: 'func main() { fmt.Println("Selam") }',
              dogru: [3],
              aciklama: 'fmt.Println değerleri ekrana yazdırır.',
            ),
            Kod(
              soru: 'Ekrana Merhaba yazdır.',
              kod: 'fmt.___("Merhaba")',
              secenekler: ['Println', 'println', 'Write'],
              dogru: 0,
              dil: 'go',
              aciklama:
                  'Dışa aktarılan fonksiyonlar büyük harfle başlar: fmt.Println.',
            ),
          ],
        ),
        Ders(
          id: 'go-1-u1-d2',
          ad: 'Printf ve biçim belirteçleri',
          dilbilgisiNotu:
              'fmt.Printf bir biçim dizgesiyle yazdırır ve satır sonu eklemez; \\n kendin yazmalısın. Belirteçler: %d tam sayı, %s metin, %f ondalık sayı (%.2f iki basamak), %v varsayılan biçim, %T değerin türü, %t bool, %q tırnaklı metin, %% yüzde işareti. %5d genişlik, %05d sıfırla doldurma verir. fmt.Sprintf aynı biçimi yazdırmak yerine string olarak döndürür.\n\nÖrnek:\nad := "Ece"\nyas := 20\nfmt.Printf("%s %d\\n", ad, yas)      // Ece 20\nfmt.Printf("%.2f\\n", 3.14159)       // 3.14\nfmt.Printf("%v %T\\n", yas, yas)     // 20 int\ns := fmt.Sprintf("%05d", 42)\nfmt.Println(s)                      // 00042',
          alistirmalar: [
            Secim(
              soru: 'fmt.Printf("%d + %d = %d\\n", 2, 3, 5) çıktısı nedir?',
              secenekler: ['2 + 3 = 5', '%d + %d = %d', '2 3 5', '5 = 2 + 3'],
              dogru: 0,
              aciklama: 'Her %d sırayla bir tam sayı ile değiştirilir.',
            ),
            Secim(
              soru: 'fmt.Printf("%.2f\\n", 2.0/3) çıktısı nedir?',
              secenekler: ['0.66', '0.67', '0.6667', '0.70'],
              dogru: 1,
              aciklama: '%.2f iki ondalık basamağa yuvarlar: 0.666... -> 0.67.',
            ),
            Secim(
              soru: 'fmt.Printf("%T\\n", 3.5) çıktısı nedir?',
              secenekler: ['float', 'float64', 'double', 'number'],
              dogru: 1,
              aciklama: 'Ondalık sabitin varsayılan türü float64\'tür.',
            ),
            Bosluk(
              soru: 'Tam sayı yazdırmak için ___ belirteci kullanılır.',
              secenekler: ['%s', '%d', '%f', '%t'],
              dogru: 1,
              aciklama: '%d tam sayıları yazdırır.',
            ),
            Bosluk(
              soru:
                  'Printf\'te satır sonu eklemek için dizgenin sonuna ___ yazılır.',
              secenekler: ['\\n', '/n', '<br>', '%n'],
              dogru: 0,
              aciklama:
                  'Printf satır sonunu kendiliğinden eklemez; \\n gerekir.',
            ),
            Yaz(
              soru:
                  'ad değişkenini %s ile yazdıran ve satır sonu ekleyen Printf satırını yaz.',
              cevaplar: [
                'fmt.Printf("%s\\n", ad)',
                'fmt.Printf("%s\\n",ad)',
                'fmt.Printf("%v\\n", ad)',
              ],
              aciklama: '%s metin içindir; \\n satır sonu ekler.',
            ),
            Sirala(
              soru: 'Printf çağrısını doğru sıraya diz.',
              kelimeler: [')', 'sayi', 'fmt.Printf("%d\\n",'],
              dogru: ['fmt.Printf("%d\\n",', 'sayi', ')'],
              aciklama: 'Önce biçim dizgesi, sonra yazdırılacak değer gelir.',
            ),
            Eslestir(
              soru: 'Belirteci anlamıyla eşleştir.',
              ciftler: [
                (sol: '%d', sag: 'tam sayı'),
                (sol: '%s', sag: 'metin'),
                (sol: '%f', sag: 'ondalık sayı'),
                (sol: '%T', sag: 'değerin türü'),
                (sol: '%v', sag: 'varsayılan biçim'),
              ],
              aciklama:
                  'Printf biçim belirteçlerinin temel kullanımları bunlardır.',
            ),
            Isaretle(
              soru: 'Satır sonu ekleyen fonksiyonu işaretle.',
              cumle: 'Print Println Printf',
              dogru: [1],
              aciklama: 'Yalnız Println sonuna satır sonu ekler.',
            ),
            Kod(
              soru: '7 sayısını yazdır.',
              kod: 'fmt.___("%d\\n", 7)',
              secenekler: ['Println', 'Printf', 'Sprint'],
              dogru: 1,
              dil: 'go',
              aciklama: 'Biçim belirteci kullanan fonksiyon Printf\'tir.',
            ),
          ],
        ),
        Ders(
          id: 'go-1-u1-d3',
          ad: 'Değişkenler: var ve :=',
          dilbilgisiNotu:
              'var ile değişken bildirilir: var yas int = 20. Tür değerden anlaşılıyorsa yazılmayabilir: var ad = "Ali". Kısa bildirim x := 5 yalnız fonksiyon içinde kullanılır ve türü değerden çıkarır. Sonraki atamalar = ile yapılır. Aynı satırda birden çok değişken tanımlanabilir: a, b := 1, 2; iki değer a, b = b, a ile takas edilir. Yerel bir değişken bildirilip kullanılmazsa derleme hatası olur. _ (boş tanımlayıcı) istenmeyen değerleri atar.\n\nÖrnek:\nvar yas int = 20\nvar ad = "Ali"\nboy := 1.75\na, b := 1, 2\na, b = b, a\nfmt.Println(yas, ad, boy, a, b) // 20 Ali 1.75 2 1',
          alistirmalar: [
            Secim(
              soru: 'x := 5; x = 7; fmt.Println(x) çıktısı nedir?',
              secenekler: ['5', '7', '57', 'hata'],
              dogru: 1,
              aciklama:
                  ':= ilk bildirimdir; sonraki = ataması değeri değiştirir.',
            ),
            Secim(
              soru: 'Bir yerel değişkeni bildirip hiç kullanmazsan ne olur?',
              secenekler: [
                'Derleme hatası verir',
                'Uyarı verir',
                'Sıfır değerle çalışır',
                'Çalışma anında hata verir',
              ],
              dogru: 0,
              aciklama:
                  'Kullanılmayan yerel değişken Go\'da derleme hatasıdır.',
            ),
            Secim(
              soru:
                  'a, b := 3, 4; a, b = b, a; fmt.Println(a, b) çıktısı nedir?',
              secenekler: ['3 4', '4 3', '4 4', '3 3'],
              dogru: 1,
              aciklama: 'a, b = b, a iki değeri takas eder.',
            ),
            Bosluk(
              soru:
                  'Kısa bildirim operatörü ___ yalnız fonksiyon içinde kullanılır.',
              secenekler: [':=', '=', '==', '=>'],
              dogru: 0,
              aciklama: ':= tür çıkarımıyla yeni değişken tanımlar.',
            ),
            Bosluk(
              soru: 'var ad ___ = "Ali" satırındaki boşluğa hangi tür gelir?',
              secenekler: ['int', 'bool', 'string'],
              dogru: 2,
              aciklama: '"Ali" bir metindir, türü string\'tir.',
            ),
            Yaz(
              soru: 'n adlı değişkeni kısa bildirimle 10 değerinde tanımla.',
              cevaplar: ['n := 10', 'n:=10', 'n := 10;'],
              aciklama: 'Kısa bildirim: ad := değer.',
            ),
            Sirala(
              soru: 'Bildirimi doğru sıraya diz.',
              kelimeler: ['5', '=', 'int', 'sayi', 'var'],
              dogru: ['var', 'sayi', 'int', '=', '5'],
              aciklama: 'var, ad, tür, = ve değer sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'var x int', sag: 'açık türle bildirim'),
                (sol: ':=', sag: 'kısa bildirim'),
                (sol: '_', sag: 'değeri atan boş tanımlayıcı'),
                (sol: 'x = 3', sag: 'var olan değişkene atama'),
              ],
              aciklama: 'Bildirim ve atama biçimleri farklıdır.',
            ),
            Isaretle(
              soru: 'Kısa bildirim operatörünü işaretle.',
              cumle: 'x := 5',
              dogru: [1],
              aciklama: ':= hem bildirir hem değer atar.',
            ),
            Kod(
              soru: 'yas değişkenine kısa bildirimle 30 ata.',
              kod: 'yas ___ 30',
              secenekler: [':=', '==', '->'],
              dogru: 0,
              dil: 'go',
              aciklama: 'Kısa bildirim için := kullanılır.',
            ),
          ],
        ),
        Ders(
          id: 'go-1-u1-d4',
          ad: 'Temel türler',
          dilbilgisiNotu:
              'Temel türler: int (tam sayı; boyutu platforma bağlıdır), float64 (ondalık), string (metin), bool (true/false). Farklı sayı türleri kendiliğinden karışmaz: int ile float64 toplamak için dönüştürme gerekir, ör. float64(i). Tam sayı bölmesi küsuratı atar (7/2 = 3); % kalanı verir. Metinler + ile birleştirilir. %T bir değerin türünü yazdırır.\n\nÖrnek:\ni := 7\nf := 2.5\nfmt.Println(i/2, i%2)        // 3 1\nfmt.Println(float64(i) * f)  // 17.5\nfmt.Println("Go" + "lang")   // Golang\nfmt.Printf("%T %T %T %T\\n", i, f, "s", true) // int float64 string bool',
          alistirmalar: [
            Secim(
              soru: 'fmt.Println(7 / 2) çıktısı nedir?',
              secenekler: ['3.5', '3', '4', '3.0'],
              dogru: 1,
              aciklama: 'İki tam sayının bölümü tam sayıdır; küsurat atılır.',
            ),
            Secim(
              soru: 'fmt.Println(7.0 / 2) çıktısı nedir?',
              secenekler: ['3', '3.5', '4', '3.0'],
              dogru: 1,
              aciklama: '7.0 ondalık sabit olduğu için bölüm 3.5 olur.',
            ),
            Secim(
              soru:
                  'var i int = 3; var f float64 = 2.0; fmt.Println(i * f) ne olur?',
              secenekler: ['6', '6.0', 'Derleme hatası verir', '3'],
              dogru: 2,
              aciklama:
                  'int ile float64 doğrudan çarpılamaz; dönüştürme gerekir.',
            ),
            Bosluk(
              soru: 'float64 değerini tam sayıya çevirmek için ___(x) yazılır.',
              secenekler: ['int', 'toInt', 'parse', 'cast'],
              dogru: 0,
              aciklama: 'Dönüşüm türün adıyla yapılır: int(x).',
            ),
            Bosluk(
              soru: 'Bölümden kalanı veren operatör ___ işaretidir.',
              secenekler: ['/', '%', '//', '&'],
              dogru: 1,
              aciklama: '% kalan (mod) operatörüdür.',
            ),
            Yaz(
              soru: 'x değişkenini float64\'e dönüştüren ifadeyi yaz.',
              cevaplar: ['float64(x)'],
              aciklama: 'Dönüşüm türün adıyla yapılır: float64(x).',
            ),
            Sirala(
              soru: 'Bildirimi doğru sıraya diz.',
              kelimeler: ['true', '=', 'bool', 'ok', 'var'],
              dogru: ['var', 'ok', 'bool', '=', 'true'],
              aciklama: 'var, ad, tür, = ve değer sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Türü anlamıyla eşleştir.',
              ciftler: [
                (sol: 'int', sag: 'tam sayı'),
                (sol: 'float64', sag: 'ondalık sayı'),
                (sol: 'string', sag: 'metin'),
                (sol: 'bool', sag: 'doğru/yanlış'),
                (sol: 'rune', sag: 'Unicode karakter'),
              ],
              aciklama: 'Bunlar Go\'nun temel türleridir.',
            ),
            Isaretle(
              soru: 'Değişkenin türünü işaretle.',
              cumle: 'var yas int = 25',
              dogru: [2],
              aciklama: 'Ad\'dan sonra gelen int türü gösterir.',
            ),
            Kod(
              soru: 'Ondalık puanı tanımla.',
              kod: 'var puan ___ = 9.5',
              secenekler: ['int', 'float64', 'string'],
              dogru: 1,
              dil: 'go',
              aciklama: '9.5 ondalıklı olduğu için float64 uygundur.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'go-1-u2',
      ad: 'Sabitler ve akış denetimi',
      dersler: [
        Ders(
          id: 'go-1-u2-d1',
          ad: 'Sabitler ve sıfır değerler',
          dilbilgisiNotu:
              'const ile sabit tanımlanır; sabit sonradan değiştirilemez. iota, const bloğunda 0\'dan başlayan ardışık sayılar üretir. Bir değişken bildirilip değer atanmazsa sıfır değerini alır: sayılar 0, string "" (boş metin), bool false; işaretçi, dilim ve map için nil. Bu yüzden Go\'da "başlatılmamış" değişken yoktur.\n\nÖrnek:\nconst Pi = 3.14\nconst (\n    A = iota\n    B\n    C\n)\nvar n int\nvar s string\nvar b bool\nvar f float64\nfmt.Println(Pi, A, B, C)               // 3.14 0 1 2\nfmt.Printf("%d %q %t %v\\n", n, s, b, f) // 0 "" false 0',
          alistirmalar: [
            Secim(
              soru: 'var s string; fmt.Printf("%q\\n", s) çıktısı nedir?',
              secenekler: ['""', 'nil', '0', 'null'],
              dogru: 0,
              aciklama:
                  'string\'in sıfır değeri boş metindir; %q onu "" olarak gösterir.',
            ),
            Secim(
              soru:
                  'const (a = iota; b; c) tanımından sonra fmt.Println(c) çıktısı nedir?',
              secenekler: ['0', '1', '2', '3'],
              dogru: 2,
              aciklama: 'iota 0\'dan başlar: a=0, b=1, c=2.',
            ),
            Secim(
              soru: 'const x = 5 tanımından sonra x = 6 yazılırsa ne olur?',
              secenekler: [
                'x 6 olur',
                'Derleme hatası verir',
                'Uyarı verir',
                'Çalışma anında panik olur',
              ],
              dogru: 1,
              aciklama: 'Sabite atama yapılamaz.',
            ),
            Bosluk(
              soru: 'bool türünün sıfır değeri ___ \'tür.',
              secenekler: ['true', 'false', 'nil', '0'],
              dogru: 1,
              aciklama: 'bool değişkenler false ile başlar.',
            ),
            Bosluk(
              soru: 'Sabit bloğunda ardışık sayı üretmek için ___ kullanılır.',
              secenekler: ['seq', 'iota', 'enum', 'next'],
              dogru: 1,
              aciklama:
                  'iota, const bloğunda satır sırasına göre 0, 1, 2... üretir.',
            ),
            Yaz(
              soru: 'Pi adlı 3.14 değerli bir sabit tanımla.',
              cevaplar: [
                'const Pi = 3.14',
                'const Pi=3.14',
                'const Pi = 3.14;',
              ],
              aciklama: 'Sabit const ile tanımlanır.',
            ),
            Sirala(
              soru: 'Sabit tanımını doğru sıraya diz.',
              kelimeler: ['3.14', '=', 'Pi', 'const'],
              dogru: ['const', 'Pi', '=', '3.14'],
              aciklama: 'const, ad, = ve değer sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Türü sıfır değeriyle eşleştir.',
              ciftler: [
                (sol: 'int', sag: '0'),
                (sol: 'string', sag: '""'),
                (sol: 'bool', sag: 'false'),
                (sol: 'işaretçi', sag: 'nil'),
              ],
              aciklama: 'Her türün bir sıfır değeri vardır.',
            ),
            Isaretle(
              soru: 'Sabit bildiren anahtar sözcüğü işaretle.',
              cumle: 'const Max = 10',
              dogru: [0],
              aciklama: 'const sabit tanımlar.',
            ),
            Kod(
              soru: 'Ardışık sabitler üret.',
              kod: 'const (\n    A = ___\n    B\n    C\n)',
              secenekler: ['iota', 'range', 'seq'],
              dogru: 0,
              dil: 'go',
              aciklama: 'A = iota yazınca B, C otomatik 1, 2 olur.',
            ),
          ],
        ),
        Ders(
          id: 'go-1-u2-d2',
          ad: 'if / else',
          dilbilgisiNotu:
              'Go\'da if koşulu parantez gerektirmez, ama süslü parantez zorunludur ve açılış parantezi aynı satırda olmalıdır. else, kapanan süslü parantezle aynı satıra yazılır. Koşul mutlaka bool olmalıdır; sayı veya metin koşul olamaz. if içinde kısa bildirim yapılabilir: if k := f(); k > 0 {...}; k yalnız o if/else zincirinde geçerlidir.\n\nÖrnek:\nsayi := 15\nif sayi%2 == 0 {\n    fmt.Println("çift")\n} else if sayi > 10 {\n    fmt.Println("tek ve büyük")\n} else {\n    fmt.Println("tek ve küçük")\n}\nif k := sayi * 2; k > 20 {\n    fmt.Println("k büyük", k)\n}',
          alistirmalar: [
            Secim(
              soru:
                  'x := 3; if x > 2 { fmt.Println("a") } else { fmt.Println("b") } çıktısı nedir?',
              secenekler: ['a', 'b', 'a b', 'hata'],
              dogru: 0,
              aciklama: '3 > 2 doğru olduğu için ilk dal çalışır.',
            ),
            Secim(
              soru: 'if 1 { ... } yazılırsa ne olur?',
              secenekler: [
                'Çalışır, 1 doğru sayılır',
                'Derleme hatası verir',
                'Hiç çalışmaz',
                'Uyarı verir',
              ],
              dogru: 1,
              aciklama: 'Koşul bool olmalıdır; sayı koşul olarak kullanılamaz.',
            ),
            Secim(
              soru:
                  'if v := 4; v > 5 { fmt.Println("A") } else { fmt.Println("B", v) } çıktısı nedir?',
              secenekler: ['A', 'B', 'B 4', 'A 4'],
              dogru: 2,
              aciklama:
                  'v else dalında da geçerlidir; 4 > 5 yanlış olduğundan "B 4" yazılır.',
            ),
            Bosluk(
              soru: 'Go\'da if koşulunu ___ içine almak gerekmez.',
              secenekler: [
                'parantez',
                'tırnak',
                'süslü parantez',
                'köşeli parantez',
              ],
              dogru: 0,
              aciklama: 'if sayi > 3 { ... } biçimi yeterlidir.',
            ),
            Bosluk(
              soru: 'else, kapanan süslü parantezle ___ satırda yazılır.',
              secenekler: ['aynı', 'sonraki', 'boş', 'yeni'],
              dogru: 0,
              aciklama: '} else { biçimi zorunludur.',
            ),
            Yaz(
              soru:
                  'n 5\'ten büyükse çalışacak if başlığını yaz (açılış süslü parantezle).',
              cevaplar: ['if n > 5 {', 'if n>5 {', 'if n > 5{'],
              aciklama: 'Koşul parantezsiz yazılır ve { aynı satırdadır.',
            ),
            Sirala(
              soru: 'Koşul başlığını doğru sıraya diz.',
              kelimeler: ['{', '0', '>', 'x', 'if'],
              dogru: ['if', 'x', '>', '0', '{'],
              aciklama: 'if, koşul ve açılış süslü parantezi sırayla gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'if', sag: 'koşullu dal'),
                (sol: 'else if', sag: 'ek koşul'),
                (sol: 'else', sag: 'hiçbiri doğru değilse'),
                (sol: 'if v := f(); v > 0', sag: 'kısa bildirimli koşul'),
              ],
              aciklama: 'Koşullu dallar bunlardır.',
            ),
            Isaretle(
              soru: 'Karşılaştırma operatörünü işaretle.',
              cumle: 'if sayi >= 10 {',
              dogru: [2],
              aciklama: '>= büyük veya eşit demektir.',
            ),
            Kod(
              soru: 'Reşit mi?',
              kod: 'if yas ___ 18 {\n    fmt.Println("reşit")\n}',
              secenekler: ['>=', '=>', '=<'],
              dogru: 0,
              dil: 'go',
              aciklama: 'Büyük eşit için >= yazılır.',
            ),
          ],
        ),
        Ders(
          id: 'go-1-u2-d3',
          ad: 'switch',
          dilbilgisiNotu:
              'switch bir değeri sırayla case değerleriyle karşılaştırır; eşleşen case çalışır ve break yazmak gerekmez (Go kendiliğinden çıkar). Bir case\'te birden çok değer olabilir: case 1, 2:. default hiçbiri uymazsa çalışır. İfadesiz switch (switch { case x > 5: ... }) bir if-else zinciri gibidir. Bir sonraki case\'in gövdesine geçmek için fallthrough yazılır.\n\nÖrnek:\ngun := 6\nswitch gun {\ncase 1, 2, 3, 4, 5:\n    fmt.Println("hafta içi")\ncase 6, 7:\n    fmt.Println("hafta sonu")\ndefault:\n    fmt.Println("geçersiz")\n}\npuan := 85\nswitch {\ncase puan >= 90:\n    fmt.Println("A")\ncase puan >= 80:\n    fmt.Println("B")\ndefault:\n    fmt.Println("C")\n}',
          alistirmalar: [
            Secim(
              soru:
                  'x := 2 için switch x { case 1: "bir"; case 2: "iki"; case 3: "üç" } hangi çıktıyı verir?',
              secenekler: ['iki', 'bir iki', 'iki üç', 'hata'],
              dogru: 0,
              aciklama:
                  'Go\'da case\'ler kendiliğinden biter; yalnız eşleşen çalışır.',
            ),
            Secim(
              soru:
                  'switch 1 { case 1: "a"; fallthrough; case 2: "b"; case 3: "c" } çıktısı nedir?',
              secenekler: ['a', 'a b', 'a b c', 'b'],
              dogru: 1,
              aciklama:
                  'fallthrough, bir sonraki case\'in gövdesini koşula bakmadan çalıştırır; case 3\'e geçilmez.',
            ),
            Secim(
              soru:
                  'puan := 75 için ifadesiz switch (>=90 "A", >=70 "B", varsayılan "C") çıktısı nedir?',
              secenekler: ['A', 'B', 'C', 'B C'],
              dogru: 1,
              aciklama: 'İlk doğru case çalışır: 75 >= 70.',
            ),
            Bosluk(
              soru: 'Go\'da switch case sonunda ___ yazmak gerekmez.',
              secenekler: ['break', 'return', 'continue', 'end'],
              dogru: 0,
              aciklama: 'Her case kendiliğinden biter.',
            ),
            Bosluk(
              soru: 'Hiçbir case eşleşmezse ___ dalı çalışır.',
              secenekler: ['else', 'default', 'other', 'catch'],
              dogru: 1,
              aciklama: 'Varsayılan dal default ile yazılır.',
            ),
            Yaz(
              soru:
                  'Bir sonraki case\'in gövdesine geçişi sağlayan anahtar sözcüğü yaz.',
              cevaplar: ['fallthrough'],
              aciklama: 'fallthrough sonraki case\'e geçirir.',
            ),
            Sirala(
              soru: 'switch iskeletini doğru sıraya diz.',
              kelimeler: ['}', 'fmt.Println("bir")', 'case 1:', 'switch x {'],
              dogru: ['switch x {', 'case 1:', 'fmt.Println("bir")', '}'],
              aciklama: 'switch, case, gövde, kapanış sırasıyla gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'case 1, 2:', sag: 'birden çok değer'),
                (sol: 'default:', sag: 'eşleşme yoksa'),
                (sol: 'switch {', sag: 'ifadesiz switch'),
                (sol: 'fallthrough', sag: 'sonraki case\'e geç'),
              ],
              aciklama: 'switch\'in temel yapı taşları bunlardır.',
            ),
            Isaretle(
              soru: 'default dalını işaretle.',
              cumle: 'case 1: default: case 2:',
              dogru: [2],
              aciklama: 'default: hiçbir case uymazsa çalışan daldır.',
            ),
            Kod(
              soru: 'Eşleşme yoksa "diğer" yaz.',
              kod:
                  'switch n {\ncase 1:\n    fmt.Println("bir")\n___:\n    fmt.Println("diğer")\n}',
              secenekler: ['default', 'else', 'otherwise'],
              dogru: 0,
              dil: 'go',
              aciklama: 'Varsayılan dal default: ile yazılır.',
            ),
          ],
        ),
        Ders(
          id: 'go-1-u2-d4',
          ad: 'for döngüsü',
          dilbilgisiNotu:
              'Go\'da tek döngü yapısı vardır: for. Üç parçalı biçim: for i := 0; i < 3; i++ {...}. Yalnız koşullu (while gibi): for koşul {...}. Sonsuz döngü: for {...} ve break ile çıkılır. continue sonraki tura geçer. Go 1.22 ve sonrasında for i := range 3 yazılarak 0, 1, 2 sayılabilir. while ve do-while anahtar sözcükleri yoktur.\n\nÖrnek:\ntoplam := 0\nfor i := 1; i <= 5; i++ {\n    toplam += i\n}\nfmt.Println(toplam) // 15\nn := 1\nfor n < 100 {\n    n *= 2\n}\nfmt.Println(n)      // 128\nfor i := range 3 {\n    if i == 1 {\n        continue\n    }\n    fmt.Println(i)  // 0, sonra 2\n}',
          alistirmalar: [
            Secim(
              soru: 'for i := 0; i < 4; i++ { fmt.Print(i) } çıktısı nedir?',
              secenekler: ['0123', '1234', '01234', '123'],
              dogru: 0,
              aciklama:
                  'i 0, 1, 2, 3 değerlerini alır; 4 için koşul yanlıştır.',
            ),
            Secim(
              soru:
                  'n := 1; for n < 50 { n *= 3 }; fmt.Println(n) çıktısı nedir?',
              secenekler: ['27', '81', '50', '243'],
              dogru: 1,
              aciklama:
                  'n sırayla 1, 3, 9, 27, 81 olur; 81 >= 50 olunca döngü biter.',
            ),
            Secim(
              soru:
                  'for i := 1; i <= 5; i++ { if i%2 == 0 { continue }; fmt.Print(i) } çıktısı nedir?',
              secenekler: ['135', '24', '12345', '15'],
              dogru: 0,
              aciklama:
                  'continue çift sayılarda turu atlar; yalnız tekler yazılır.',
            ),
            Bosluk(
              soru: 'Go\'da tek döngü anahtar sözcüğü ___ \'dur.',
              secenekler: ['while', 'for', 'loop', 'do'],
              dogru: 1,
              aciklama: 'Tüm döngüler for ile yazılır.',
            ),
            Bosluk(
              soru: 'Döngüyü hemen bitirmek için ___ kullanılır.',
              secenekler: ['stop', 'exit', 'break', 'end'],
              dogru: 2,
              aciklama: 'break döngüden çıkarır.',
            ),
            Yaz(
              soru: 'i\'yi 0\'dan 9\'a kadar sayan for başlığını yaz.',
              cevaplar: [
                'for i := 0; i < 10; i++ {',
                'for i:=0; i<10; i++ {',
                'for i := 0; i <= 9; i++ {',
              ],
              aciklama: 'Üç parça: başlangıç, koşul, artış.',
            ),
            Sirala(
              soru: 'Döngü başlığını doğru sıraya diz.',
              kelimeler: ['{', 'i++', 'i < 5;', 'i := 0;', 'for'],
              dogru: ['for', 'i := 0;', 'i < 5;', 'i++', '{'],
              aciklama: 'for, başlangıç, koşul, artış ve { sırasıyla gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'for i := 0; i < n; i++', sag: 'üç parçalı döngü'),
                (sol: 'for koşul {', sag: 'while benzeri döngü'),
                (sol: 'for {', sag: 'sonsuz döngü'),
                (sol: 'continue', sag: 'sonraki tura geç'),
                (sol: 'break', sag: 'döngüden çık'),
              ],
              aciklama: 'Go\'nun tek döngüsü for bu biçimlere sahiptir.',
            ),
            Isaretle(
              soru: 'Sayma için kullanılan sözcüğü işaretle.',
              cumle: 'for i := range 3 {',
              dogru: [3],
              aciklama: 'range 3, 0\'dan 2\'ye kadar sayar (Go 1.22+).',
            ),
            Kod(
              soru: '0, 1, 2 yazdır.',
              kod: 'for i := 0; i < 3; ___ {\n    fmt.Println(i)\n}',
              secenekler: ['i++', 'i+1', 'i=+1'],
              dogru: 0,
              dil: 'go',
              aciklama: 'i++ i\'yi bir artırır.',
            ),
          ],
        ),
      ],
    ),
  ],
);
