// Go kursu 2/3 (kurs kimliği: go-2). Alan: programlama (KursAlani.kod).
// Sahibi: Adım Adım uygulaması içerik ekibi; yazan: Claude (implementer, dalga9).
// Go 1.2x sözdizimi; çıktı soruları go run ile çalıştırılarak, kod parçaları gofmt -e
// ile denetlenerek doğrulandı. Değişiklik: kurs kimlikleri ve alıştırma türleri
// test/icerik_test.dart kurallarına uymalıdır.
import '../model/icerik.dart';

/// Go Orta Seviye
const Kurs go2 = Kurs(
  id: 'go-2',
  ad: 'Go Orta Seviye',
  aciklama:
      'Fonksiyonlar, dilimler, map, range, string ve rune, hata değerleri, defer ve işaretçilerle Go programlarını daha düzenli yaz.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'go-2-u1',
      ad: 'Fonksiyonlar ve koleksiyonlar',
      dersler: [
        Ders(
          id: 'go-2-u1-d1',
          ad: 'Fonksiyonlar ve çoklu dönüş',
          dilbilgisiNotu:
              'Fonksiyon func ad(parametreler) dönüşTürü { ... } biçiminde yazılır. Aynı türden ardışık parametreler türü paylaşır: func topla(a, b int) int. Go\'da bir fonksiyon birden çok değer döndürebilir: func bol(a, b int) (int, int); sonuçlar a, b := bol(17, 5) ile alınır, istenmeyen _ ile atılır. Parametre türünün önüne ... koyarsan fonksiyon istenen sayıda argüman alır (variadic) ve içeride dilim olarak görünür. Fonksiyonlar değer olarak da taşınabilir.\n\nÖrnek:\nfunc bolme(a, b int) (int, int) {\n    return a / b, a % b\n}\n\nfunc topla(sayilar ...int) int {\n    t := 0\n    for _, s := range sayilar {\n        t += s\n    }\n    return t\n}\n\nb, k := bolme(17, 5)\nfmt.Println(b, k)             // 3 2\nfmt.Println(topla(1, 2, 3))   // 6',
          alistirmalar: [
            Secim(
              soru:
                  'func takas(a, b string) (string, string) { return b, a } için x, y := takas("a", "b"); fmt.Println(x, y) çıktısı nedir?',
              secenekler: ['a b', 'b a', 'ab', 'hata'],
              dogru: 1,
              aciklama: 'Fonksiyon iki değeri ters sırayla döndürür.',
            ),
            Secim(
              soru:
                  'func topla(sayilar ...int) int, argümansız çağrılırsa (topla()) ne döner?',
              secenekler: ['Derleme hatası', '0', 'nil', '-1'],
              dogru: 1,
              aciklama: 'Hiç argüman verilmezse dilim boştur ve toplam 0 olur.',
            ),
            Secim(
              soru:
                  'func kare(x int) int { return x * x } için fmt.Println(kare(kare(3))) çıktısı nedir?',
              secenekler: ['9', '27', '81', '243'],
              dogru: 2,
              aciklama: 'kare(3) = 9, kare(9) = 81.',
            ),
            Bosluk(
              soru:
                  'İki değer döndüren fonksiyonda dönüş türleri ___ içinde yazılır.',
              secenekler: [
                'köşeli parantez',
                'parantez',
                'süslü parantez',
                'tırnak',
              ],
              dogru: 1,
              aciklama: 'func f() (int, error) biçimi.',
            ),
            Bosluk(
              soru:
                  'İstenen sayıda argüman almak için parametre türünün önüne ___ konur.',
              secenekler: ['...', '*', '&', '[]'],
              dogru: 0,
              aciklama: 'func f(sayilar ...int) variadic fonksiyondur.',
            ),
            Yaz(
              soru:
                  'a ve b int alıp int döndüren topla fonksiyonunun başlığını yaz.',
              cevaplar: [
                'func topla(a, b int) int {',
                'func topla(a int, b int) int {',
                'func topla(a,b int) int {',
              ],
              aciklama: 'Aynı türden parametreler türü paylaşabilir.',
            ),
            Sirala(
              soru: 'Fonksiyon başlığını doğru sıraya diz.',
              kelimeler: ['{', 'int', 'kare(x int)', 'func'],
              dogru: ['func', 'kare(x int)', 'int', '{'],
              aciklama: 'func, ad ve parametre, dönüş türü, { sırasıyla gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'return a, b', sag: 'iki değer döndürür'),
                (sol: '_', sag: 'istenmeyen dönüşü atar'),
                (sol: '...int', sag: 'istenen sayıda int argüman'),
                (sol: 'func f() (n int)', sag: 'adlandırılmış dönüş'),
              ],
              aciklama: 'Go fonksiyonlarının temel özellikleri bunlardır.',
            ),
            Isaretle(
              soru: 'Dönüş türünü işaretle.',
              cumle: 'func topla(a, b int) int {',
              dogru: [4],
              aciklama: 'Parametre listesinden sonra gelen int dönüş türüdür.',
            ),
            Kod(
              soru: 'İki değer döndür.',
              kod: 'func f() ___ {\n    return 1, 2\n}',
              secenekler: ['(int, int)', 'int, int', '[int, int]'],
              dogru: 0,
              dil: 'go',
              aciklama: 'Birden çok dönüş türü parantez içinde yazılır.',
            ),
          ],
        ),
        Ders(
          id: 'go-2-u1-d2',
          ad: 'Diziler ve dilimler (slice)',
          dilbilgisiNotu:
              'Dizi sabit uzunlukludur ve uzunluk türün parçasıdır: [3]int. Pratikte çoğunlukla dilim (slice) kullanılır: []int{1, 2, 3}. len(s) eleman sayısı, cap(s) kapasitedir. append(s, x) yeni eleman ekler ve dilimi döndürür; sonucu değişkene atamak gerekir: s = append(s, x). s[a:b] a dahil, b hariç bir alt dilim verir. Alt dilimler aynı alttaki diziyi paylaşır; birinde değişiklik diğerinde de görünür. make([]int, uzunluk, kapasite) önceden boyut ayırır.\n\nÖrnek:\ns := []int{10, 20, 30}\ns = append(s, 40)\nfmt.Println(s, len(s))       // [10 20 30 40] 4\nfmt.Println(s[1:3])          // [20 30]\nvar d [3]string\nd[0] = "x"\nfmt.Printf("%q\\n", d)        // ["x" "" ""]\nt := make([]int, 2, 5)\nfmt.Println(len(t), cap(t))  // 2 5',
          alistirmalar: [
            Secim(
              soru:
                  's := []int{1, 2, 3}; s = append(s, 4); fmt.Println(len(s)) çıktısı nedir?',
              secenekler: ['3', '4', '5', 'hata'],
              dogru: 1,
              aciklama: 'append bir eleman ekler: uzunluk 4 olur.',
            ),
            Secim(
              soru:
                  's := []int{5, 6, 7, 8, 9}; fmt.Println(s[1:4]) çıktısı nedir?',
              secenekler: ['[5 6 7 8]', '[6 7 8]', '[6 7 8 9]', '[6 7]'],
              dogru: 1,
              aciklama: 's[1:4] indeks 1\'den 3\'e kadar alır (4 hariç).',
            ),
            Secim(
              soru:
                  'a := []int{1, 2, 3}; b := a[:2]; b[0] = 99; fmt.Println(a) çıktısı nedir?',
              secenekler: ['[1 2 3]', '[99 2 3]', '[99 2]', '[1 2]'],
              dogru: 1,
              aciklama: 'Alt dilim aynı diziyi paylaşır, a da değişir.',
            ),
            Bosluk(
              soru: 'make([]int, 3) ile oluşan dilimin len değeri ___ \'tür.',
              secenekler: ['0', '3', '2', '4'],
              dogru: 1,
              aciklama: 'make([]int, 3) üç sıfırlı elemanlı dilim oluşturur.',
            ),
            Bosluk(
              soru: 'append\'in döndürdüğü dilimi değişkene ___ gerekir.',
              secenekler: ['atamak', 'silmek', 'yazdırmak', 'kopyalamak'],
              dogru: 0,
              aciklama: 's = append(s, x) biçiminde kullanılır.',
            ),
            Yaz(
              soru: 's dilimine 7 ekleyen deyimi yaz.',
              cevaplar: [
                's = append(s, 7)',
                's=append(s,7)',
                's = append(s, 7);',
              ],
              aciklama: 'append sonucu s\'e atanır.',
            ),
            Sirala(
              soru: 'Ekleme deyimini doğru sıraya diz.',
              kelimeler: ['5)', 'append(s,', '=', 's'],
              dogru: ['s', '=', 'append(s,', '5)'],
              aciklama: 'Önce s, sonra =, sonra append çağrısı gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'len(s)', sag: 'eleman sayısı'),
                (sol: 'cap(s)', sag: 'kapasite'),
                (sol: 's[1:3]', sag: '1. ve 2. indeks arası alt dilim'),
                (sol: '[3]int', sag: 'sabit uzunluklu dizi'),
                (sol: 'make([]int, n)', sag: 'n elemanlı dilim'),
              ],
              aciklama:
                  'Dizi ve dilim işlemlerinin temel karşılıkları bunlardır.',
            ),
            Isaretle(
              soru: 'Eleman ekleyen fonksiyonu işaretle.',
              cumle: 's = append(s, 4)',
              dogru: [2],
              aciklama: 'append, dilime eleman ekler.',
            ),
            Kod(
              soru: 'Dilime eleman ekle.',
              kod: 'sayilar := []int{1, 2}\nsayilar = ___(sayilar, 3)',
              secenekler: ['append', 'push', 'add'],
              dogru: 0,
              dil: 'go',
              aciklama: 'Go\'da eleman ekleyen yerleşik fonksiyon append\'tir.',
            ),
          ],
        ),
        Ders(
          id: 'go-2-u1-d3',
          ad: 'Map',
          dilbilgisiNotu:
              'map anahtar-değer tablosudur: map[string]int. Oluşturma: m := map[string]int{"a": 1} veya make(map[string]int). Yazma m[k] = v; okuma m[k]. Olmayan anahtar okunursa değer türünün sıfır değeri döner; anahtarın gerçekten olup olmadığı v, ok := m[k] ile anlaşılır. delete(m, k) kaydı siler, len(m) kayıt sayısını verir. Sıralama garanti edilmez. nil bir map\'e yazmak panik üretir.\n\nÖrnek:\nyas := map[string]int{"Ali": 20, "Ece": 22}\nyas["Can"] = 25\nfmt.Println(len(yas), yas["Ali"])  // 3 20\nv, ok := yas["Yok"]\nfmt.Println(v, ok)                  // 0 false\ndelete(yas, "Ali")\n_, varMi := yas["Ali"]\nfmt.Println(varMi)                  // false',
          alistirmalar: [
            Secim(
              soru:
                  'm := map[string]int{"a": 1}; fmt.Println(m["b"]) çıktısı nedir?',
              secenekler: ['0', 'nil', '1', 'hata'],
              dogru: 0,
              aciklama:
                  'Olmayan anahtar için değer türünün sıfır değeri döner.',
            ),
            Secim(
              soru:
                  'm := map[string]bool{}; m["x"] = true; _, ok := m["y"]; fmt.Println(ok) çıktısı nedir?',
              secenekler: ['true', 'false', 'nil', 'hata'],
              dogru: 1,
              aciklama: '"y" anahtarı yoktur, ok false olur.',
            ),
            Secim(
              soru:
                  'm := map[string]int{"a": 1, "b": 2}; delete(m, "a"); fmt.Println(len(m)) çıktısı nedir?',
              secenekler: ['0', '1', '2', 'hata'],
              dogru: 1,
              aciklama: 'delete bir kaydı siler; geriye bir kayıt kalır.',
            ),
            Bosluk(
              soru: 'Olmayan anahtar okunursa değer türünün ___ değeri döner.',
              secenekler: ['nil', 'sıfır', 'hata', 'son'],
              dogru: 1,
              aciklama: 'Map okuması hata vermez; sıfır değer döner.',
            ),
            Bosluk(
              soru: 'Kaydı silmek için ___ fonksiyonu kullanılır.',
              secenekler: ['remove', 'delete', 'pop', 'drop'],
              dogru: 1,
              aciklama: 'delete(m, anahtar) kaydı siler.',
            ),
            Yaz(
              soru: 'puan map\'ine "Ali" anahtarı için 90 değerini ata.',
              cevaplar: [
                'puan["Ali"] = 90',
                'puan["Ali"]=90',
                'puan["Ali"] = 90;',
              ],
              aciklama: 'Atama m[anahtar] = değer biçimindedir.',
            ),
            Sirala(
              soru: 'Map oluşturmayı doğru sıraya diz.',
              kelimeler: ['make(map[string]int)', ':=', 'm'],
              dogru: ['m', ':=', 'make(map[string]int)'],
              aciklama: 'Önce ad, sonra :=, sonra make çağrısı gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'map[string]int', sag: 'string anahtar, int değer'),
                (sol: 'v, ok := m[k]', sag: 'anahtar var mı denetimi'),
                (sol: 'delete(m, k)', sag: 'kaydı siler'),
                (sol: 'len(m)', sag: 'kayıt sayısı'),
              ],
              aciklama: 'Map işlemlerinin temel karşılıkları bunlardır.',
            ),
            Isaretle(
              soru: 'Anahtarın varlığını gösteren değişkeni işaretle.',
              cumle: 'v, ok := m["a"]',
              dogru: [1],
              aciklama: 'ok, anahtarın bulunup bulunmadığını söyler.',
            ),
            Kod(
              soru: 'Boş map oluştur.',
              kod: 'm := ___(map[string]int)',
              secenekler: ['make', 'new', 'map'],
              dogru: 0,
              dil: 'go',
              aciklama: 'Map\'ler make ile oluşturulur.',
            ),
          ],
        ),
        Ders(
          id: 'go-2-u1-d4',
          ad: 'range ile gezinme',
          dilbilgisiNotu:
              'range dilim, dizi, map, string ve kanal üzerinde gezer. Dilimde for i, v := range s indeks ve değeri verir; yalnız indeks için for i := range s, yalnız değer için for _, v := range s yazılır. Map\'te anahtar ve değer gelir, sıra rastgeledir. String\'te bayt konumu ve rune gelir. Go 1.22 ve sonrasında for i := range 5 yazılarak 0\'dan 4\'e sayılır.\n\nÖrnek:\nrenkler := []string{"kırmızı", "mavi"}\nfor i, r := range renkler {\n    fmt.Println(i, r)   // 0 kırmızı, sonra 1 mavi\n}\nt := 0\nfor _, v := range []int{4, 5, 6} {\n    t += v\n}\nfmt.Println(t)          // 15\nfor i := range 3 {\n    fmt.Print(i, " ")   // 0 1 2\n}',
          alistirmalar: [
            Secim(
              soru:
                  't := 0; for _, v := range []int{1, 2, 3} { t += v * v }; fmt.Println(t) çıktısı nedir?',
              secenekler: ['6', '9', '14', '36'],
              dogru: 2,
              aciklama: '1 + 4 + 9 = 14.',
            ),
            Secim(
              soru:
                  'for i, r := range "aç" { fmt.Println(i, string(r)) } çıktısı nedir?',
              secenekler: ['0 a 1 ç', '0 a 2 ç', '1 a 2 ç', '0 97 1 231'],
              dogru: 0,
              aciklama:
                  'a bir bayttır, ç iki bayttır; ç\'nin başlangıç konumu 1\'dir.',
            ),
            Secim(
              soru:
                  'm := map[string]int{"a": 1}; for k, v := range m { fmt.Println(k, v) } çıktısı nedir?',
              secenekler: ['a 1', '1 a', '0 a', 'a'],
              dogru: 0,
              aciklama: 'range map\'te anahtar ve değeri verir.',
            ),
            Bosluk(
              soru: 'Kullanmadığın değeri ___ ile atarız.',
              secenekler: ['_', '#', '-', '*'],
              dogru: 0,
              aciklama: '_ (boş tanımlayıcı) değeri yok sayar.',
            ),
            Bosluk(
              soru:
                  'range ile dilimde ilk değer ___, ikincisi eleman değeridir.',
              secenekler: ['indeks', 'kapasite', 'uzunluk'],
              dogru: 0,
              aciklama: 'for i, v := range s: i indeks, v eleman değeridir.',
            ),
            Yaz(
              soru:
                  's dilimi üzerinde indeks ve değer veren range başlığını yaz.',
              cevaplar: [
                'for i, v := range s {',
                'for i,v := range s {',
                'for i, v := range s{',
              ],
              aciklama: 'Biçim: for indeks, değer := range dilim {',
            ),
            Sirala(
              soru: 'range başlığını doğru sıraya diz.',
              kelimeler: ['{', 's', 'range', ':=', 'v', '_,', 'for'],
              dogru: ['for', '_,', 'v', ':=', 'range', 's', '{'],
              aciklama:
                  'for, değişkenler, :=, range, dilim ve { sırasıyla gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'for i, v := range s', sag: 'indeks ve değer'),
                (sol: 'for i := range s', sag: 'yalnız indeks'),
                (sol: 'for _, v := range s', sag: 'yalnız değer'),
                (sol: 'for k, v := range m', sag: 'map anahtar ve değer'),
                (sol: 'for i := range 5', sag: '0\'dan 4\'e say'),
              ],
              aciklama: 'range\'in bu biçimleri sık kullanılır.',
            ),
            Isaretle(
              soru: 'Atılan (kullanılmayan) değeri gösteren işareti işaretle.',
              cumle: 'for _, v := range s {',
              dogru: [1],
              aciklama: '_, ilk değeri yok sayar.',
            ),
            Kod(
              soru: 'Değerleri yazdır.',
              kod: 'for ___, v := range []int{1, 2} {\n    fmt.Println(v)\n}',
              secenekler: ['_', '\$', 'nil'],
              dogru: 0,
              dil: 'go',
              aciklama: 'İndeks gerekmiyorsa _ yazılır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'go-2-u2',
      ad: 'Metin, hata ve işaretçi',
      dersler: [
        Ders(
          id: 'go-2-u2-d1',
          ad: 'String ve rune',
          dilbilgisiNotu:
              'string, UTF-8 kodlanmış değişmez bir bayt dizisidir. len(s) bayt sayısını verir; "ç" gibi harfler 2 bayt tutar. rune, tek bir Unicode karakteri (int32) temsil eder ve tek tırnakla yazılır: \'g\'. Karakter sayısı için []rune(s) uzunluğuna bakılır. s[i] bir bayt (byte) verir. strings paketi sık kullanılır: ToUpper, Contains, Split, Join, Repeat, TrimSpace, Fields. strconv.Itoa sayıyı metne, strconv.Atoi metni sayıya çevirir.\n\nÖrnek:\ns := "Çay"\nfmt.Println(len(s), len([]rune(s)))                // 4 3\nfmt.Println(strings.ToUpper("go"), strings.Contains("merhaba", "erh")) // GO true\nparca := strings.Split("a,b,c", ",")\nfmt.Println(len(parca), strings.Join(parca, "-")) // 3 a-b-c\nfmt.Println(strconv.Itoa(42) + "!")               // 42!\nfmt.Println("abc"[0])                             // 97',
          alistirmalar: [
            Secim(
              soru: 'fmt.Println(len("şeker")) çıktısı nedir?',
              secenekler: ['5', '6', '7', '4'],
              dogru: 1,
              aciklama: 'ş harfi UTF-8\'de 2 bayttır; toplam 6 bayt.',
            ),
            Secim(
              soru: 'fmt.Println(len([]rune("şeker"))) çıktısı nedir?',
              secenekler: ['5', '6', '7', '4'],
              dogru: 0,
              aciklama: '[]rune dönüşümü karakterleri sayar: 5.',
            ),
            Secim(
              soru: 'fmt.Println(strings.Repeat("ab", 3)) çıktısı nedir?',
              secenekler: ['ab3', 'ababab', 'aaabbb', 'ab ab ab'],
              dogru: 1,
              aciklama: 'Repeat metni verilen sayıda arka arkaya tekrarlar.',
            ),
            Bosluk(
              soru: 'string\'in bayt sayısını ___ fonksiyonu verir.',
              secenekler: ['len', 'cap', 'size', 'count'],
              dogru: 0,
              aciklama: 'len(s) bayt sayısını döndürür.',
            ),
            Bosluk(
              soru: 'Karakter sayısı için string önce ___ türüne çevrilir.',
              secenekler: ['[]rune', '[]int', '[]char', '[]string'],
              dogru: 0,
              aciklama: 'len([]rune(s)) Unicode karakter sayısını verir.',
            ),
            Yaz(
              soru: 's metnini büyük harfe çeviren strings çağrısını yaz.',
              cevaplar: ['strings.ToUpper(s)'],
              aciklama: 'strings.ToUpper metni büyük harfe çevirir.',
            ),
            Sirala(
              soru: 'strings.Split çağrısını doğru sıraya diz.',
              kelimeler: [')', '","', 'strings.Split(s,'],
              dogru: ['strings.Split(s,', '","', ')'],
              aciklama: 'Önce metin, sonra ayraç gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'len(s)', sag: 'bayt sayısı'),
                (sol: '[]rune(s)', sag: 'karakter dilimi'),
                (sol: 'strings.Split', sag: 'metni parçalara böler'),
                (sol: 'strconv.Itoa(5)', sag: '"5" üretir'),
                (sol: 'strconv.Atoi("5")', sag: '5 ve hata döndürür'),
              ],
              aciklama: 'Metin işleme için temel çağrılar bunlardır.',
            ),
            Isaretle(
              soru: 'rune değerini işaretle.',
              cumle: 'r := \'g\'',
              dogru: [2],
              aciklama: 'Tek tırnaklı \'g\' bir rune sabitidir.',
            ),
            Kod(
              soru: 'Metni büyük harfe çevir.',
              kod: 'ust := strings.___("go")',
              secenekler: ['ToUpper', 'Upper', 'Capital'],
              dogru: 0,
              dil: 'go',
              aciklama: 'strings.ToUpper doğru adlandırmadır.',
            ),
          ],
        ),
        Ders(
          id: 'go-2-u2-d2',
          ad: 'error değeri ve if err != nil',
          dilbilgisiNotu:
              'Go\'da hatalar istisna değil, değerdir. error yerleşik bir arayüzdür; hata yoksa değeri nil olur. Hata verebilen fonksiyonlar son dönüş değeri olarak error döndürür ve çağıran hemen denetler: if err != nil { ... }. errors.New("metin") sabit hata, fmt.Errorf("kod %d", 7) biçimli hata üretir. strconv.Atoi geçersiz metinde hata döndürür.\n\nÖrnek:\nfunc bol(a, b int) (int, error) {\n    if b == 0 {\n        return 0, errors.New("sıfıra bölme")\n    }\n    return a / b, nil\n}\n\ns, err := bol(10, 2)\nfmt.Println(s, err)           // 5 <nil>\n_, err = bol(1, 0)\nif err != nil {\n    fmt.Println("hata:", err) // hata: sıfıra bölme\n}\nn, err := strconv.Atoi("12x")\nfmt.Println(n, err != nil)    // 0 true',
          alistirmalar: [
            Secim(
              soru:
                  'n, err := strconv.Atoi("42"); fmt.Println(n+1, err) çıktısı nedir?',
              secenekler: ['43 <nil>', '42 <nil>', '43 hata', '43'],
              dogru: 0,
              aciklama:
                  'Dönüşüm başarılıdır; hata nil olur ve nil <nil> olarak yazılır.',
            ),
            Secim(
              soru:
                  '_, err := strconv.Atoi("abc"); fmt.Println(err) çıktısı nedir?',
              secenekler: [
                '<nil>',
                'strconv.Atoi: parsing "abc": invalid syntax',
                '0',
                'abc',
              ],
              dogru: 1,
              aciklama:
                  'Atoi geçersiz metinde ayrıntılı bir hata mesajı döndürür.',
            ),
            Secim(
              soru:
                  'err := fmt.Errorf("kod %d", 7); fmt.Println(err) çıktısı nedir?',
              secenekler: ['kod %d', 'kod 7', '7', '<nil>'],
              dogru: 1,
              aciklama: 'Errorf biçimli bir hata değeri oluşturur.',
            ),
            Bosluk(
              soru: 'Hata olmadığında error değeri ___ olur.',
              secenekler: ['0', 'nil', '""', 'false'],
              dogru: 1,
              aciklama: 'Hatasız durumda error nil\'dir.',
            ),
            Bosluk(
              soru:
                  'Yeni bir hata değeri oluşturmak için errors.___("metin") yazılır.',
              secenekler: ['New', 'Make', 'Create', 'Error'],
              dogru: 0,
              aciklama: 'errors.New sabit metinli hata üretir.',
            ),
            Yaz(
              soru: 'err hata değerini denetleyen if başlığını yaz.',
              cevaplar: ['if err != nil {', 'if err!=nil {', 'if err != nil{'],
              aciklama: 'Hata varsa err nil\'den farklıdır.',
            ),
            Sirala(
              soru: 'Denetimi doğru sıraya diz.',
              kelimeler: ['{', 'nil', '!=', 'err', 'if'],
              dogru: ['if', 'err', '!=', 'nil', '{'],
              aciklama: 'if, err, !=, nil ve { sırasıyla gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'error', sag: 'hata arayüzü'),
                (sol: 'nil', sag: 'hata yok'),
                (sol: 'errors.New', sag: 'sabit metinli hata'),
                (sol: 'fmt.Errorf', sag: 'biçimli hata'),
                (
                  sol: 'strconv.Atoi',
                  sag: 'metni sayıya çevirir, hata verebilir',
                ),
              ],
              aciklama: 'Go\'da hata yönetiminin temel parçaları bunlardır.',
            ),
            Isaretle(
              soru: 'Hatanın varlığını denetleyen operatörü işaretle.',
              cumle: 'if err != nil {',
              dogru: [2],
              aciklama: 'err != nil, hata olduğu anlamına gelir.',
            ),
            Kod(
              soru: 'Hata varsa çık.',
              kod:
                  'v, err := strconv.Atoi("5")\nif err ___ nil {\n    return\n}\nfmt.Println(v)',
              secenekler: ['!=', '==', '=>'],
              dogru: 0,
              dil: 'go',
              aciklama: 'Hata varsa err nil\'den farklıdır.',
            ),
          ],
        ),
        Ders(
          id: 'go-2-u2-d3',
          ad: 'defer',
          dilbilgisiNotu:
              'defer, bir çağrıyı çevreleyen fonksiyon bitene kadar erteler. Birden çok defer son giren önce çıkar (LIFO) sırasıyla çalışır. Ertelenen çağrının argümanları defer satırı çalıştığı anda hesaplanır. En tipik kullanım temizliktir: dosyayı kapatmak (defer f.Close()), kilidi bırakmak (defer mu.Unlock()). defer\'ler fonksiyon panikle bitse de çalışır.\n\nÖrnek:\nfunc main() {\n    defer fmt.Println("son")\n    for i := 1; i <= 3; i++ {\n        defer fmt.Println("defer", i)\n    }\n    fmt.Println("başla")\n}',
          alistirmalar: [
            Secim(
              soru: 'defer fmt.Println("a"); fmt.Println("b") çıktısı nedir?',
              secenekler: ['a b', 'b a', 'a', 'b'],
              dogru: 1,
              aciklama: 'defer, fonksiyon bitene kadar bekler; önce b yazılır.',
            ),
            Secim(
              soru:
                  'Sırayla defer Println(1), defer Println(2), defer Println(3) çalışırsa çıktı nedir?',
              secenekler: ['1 2 3', '3 2 1', '2 1 3', '2 3 1'],
              dogru: 1,
              aciklama: 'defer çağrıları ters sırada (LIFO) çalışır.',
            ),
            Secim(
              soru:
                  'x := 5; defer fmt.Println(x); x = 7; fmt.Println("x:", x) çıktısı nedir?',
              secenekler: ['x: 7 7', 'x: 7 5', '5 x: 7', 'x: 5 5'],
              dogru: 1,
              aciklama:
                  'defer satırında x değeri (5) hesaplanır; önce "x: 7", sonra 5 yazılır.',
            ),
            Bosluk(
              soru: 'defer edilen çağrı fonksiyon ___ çalışır.',
              secenekler: [
                'başlarken',
                'dönerken',
                'yazılırken',
                'hata verince',
              ],
              dogru: 1,
              aciklama: 'Ertelenen çağrılar fonksiyondan çıkarken çalışır.',
            ),
            Bosluk(
              soru: 'Birden çok defer ___ sırayla çalışır.',
              secenekler: ['aynı', 'ters', 'rastgele', 'alfabetik'],
              dogru: 1,
              aciklama: 'Son eklenen defer ilk çalışır.',
            ),
            Yaz(
              soru: 'f dosyasını fonksiyon sonunda kapatacak satırı yaz.',
              cevaplar: ['defer f.Close()'],
              aciklama: 'defer f.Close() temizlik için tipik kullanımdır.',
            ),
            Sirala(
              soru: 'Ertelenen kapatmayı doğru sıraya diz.',
              kelimeler: ['f.Close()', 'defer'],
              dogru: ['defer', 'f.Close()'],
              aciklama: 'defer anahtar sözcüğü çağrıdan önce gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'defer', sag: 'çağrıyı fonksiyon sonuna erteler'),
                (sol: 'LIFO', sag: 'son eklenen önce çalışır'),
                (sol: 'defer f.Close()', sag: 'kaynak temizliği'),
                (
                  sol: 'defer fmt.Println(x)',
                  sag: 'x değeri defer satırında alınır',
                ),
              ],
              aciklama: 'defer\'in davranışı bunlardır.',
            ),
            Isaretle(
              soru: 'Ertelemeyi sağlayan anahtar sözcüğü işaretle.',
              cumle: 'defer file.Close()',
              dogru: [0],
              aciklama: 'defer çağrıyı erteler.',
            ),
            Kod(
              soru: 'Temizliği ertele.',
              kod: '___ fmt.Println("temizlik")',
              secenekler: ['defer', 'later', 'finally'],
              dogru: 0,
              dil: 'go',
              aciklama: 'Go\'da erteleme defer ile yapılır.',
            ),
          ],
        ),
        Ders(
          id: 'go-2-u2-d4',
          ad: 'İşaretçi temelleri',
          dilbilgisiNotu:
              'İşaretçi, bir değişkenin bellek adresini tutar. &x x\'in adresini verir; *p işaretçinin gösterdiği değere erişir (*int, int işaretçi türüdür). Go\'da argümanlar kopyalanarak geçer; bir fonksiyonun çağıranın değişkenini değiştirebilmesi için işaretçi geçilir. İşaretçinin sıfır değeri nil\'dir; nil işaretçiyi * ile okumak panik üretir. new(int) sıfır değerli bir int\'e işaretçi döndürür. Go\'da işaretçi aritmetiği yoktur.\n\nÖrnek:\nfunc artir(p *int) {\n    *p = *p + 1\n}\n\nfunc kopya(n int) {\n    n = 100\n}\n\nx := 5\nartir(&x)\nfmt.Println(x)         // 6\nkopya(x)\nfmt.Println(x)         // 6\np := &x\n*p = 20\nfmt.Println(x, *p)     // 20 20\nvar q *int\nfmt.Println(q == nil)  // true',
          alistirmalar: [
            Secim(
              soru: 'x := 1; p := &x; *p = 9; fmt.Println(x) çıktısı nedir?',
              secenekler: ['1', '9', 'adres', 'hata'],
              dogru: 1,
              aciklama: 'p, x\'i gösterir; *p = 9 x\'i değiştirir.',
            ),
            Secim(
              soru:
                  'func f(n int) { n = 10 } fonksiyonu x := 3 için f(x) çağrıldıktan sonra x kaçtır?',
              secenekler: ['3', '10', '0', 'hata'],
              dogru: 0,
              aciklama: 'n, x\'in kopyasıdır; x değişmez.',
            ),
            Secim(
              soru: 'var p *int; fmt.Println(p == nil) çıktısı nedir?',
              secenekler: ['true', 'false', '0', 'hata'],
              dogru: 0,
              aciklama: 'Başlatılmamış işaretçi nil\'dir.',
            ),
            Bosluk(
              soru:
                  'Bir değişkenin adresini almak için ___ operatörü kullanılır.',
              secenekler: ['*', '&', '@', '#'],
              dogru: 1,
              aciklama: '&x, x\'in adresini verir.',
            ),
            Bosluk(
              soru:
                  'İşaretçinin gösterdiği değere erişmek için işaretçinin önüne ___ yazılır.',
              secenekler: ['&', '*', '@', '\$'],
              dogru: 1,
              aciklama: '*p gösterilen değerdir.',
            ),
            Yaz(
              soru: 'x\'in adresini p değişkenine kısa bildirimle ata.',
              cevaplar: ['p := &x', 'p:=&x', 'p := &x;'],
              aciklama: '&x adresi verir.',
            ),
            Sirala(
              soru: 'Değer atamasını doğru sıraya diz.',
              kelimeler: ['10', '=', '*p'],
              dogru: ['*p', '=', '10'],
              aciklama: 'İşaretçinin gösterdiği yere 10 atanır.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: '&x', sag: 'x\'in adresi'),
                (sol: '*p', sag: 'p\'nin gösterdiği değer'),
                (sol: '*int', sag: 'int işaretçi türü'),
                (sol: 'nil', sag: 'hiçbir yeri göstermeyen işaretçi'),
                (sol: 'new(int)', sag: 'sıfır değerli int işaretçisi'),
              ],
              aciklama: 'İşaretçilerle ilgili temel kavramlar bunlardır.',
            ),
            Isaretle(
              soru: 'Adres alma operatörünü içeren kısmı işaretle.',
              cumle: 'p := &x',
              dogru: [2],
              aciklama: '&x, x\'in adresidir.',
            ),
            Kod(
              soru: 'İşaretçi parametresi al.',
              kod: 'func sifirla(p ___) {\n    *p = 0\n}',
              secenekler: ['*int', '&int', 'int'],
              dogru: 0,
              dil: 'go',
              aciklama: '*int, int işaretçi türüdür.',
            ),
          ],
        ),
      ],
    ),
  ],
);
