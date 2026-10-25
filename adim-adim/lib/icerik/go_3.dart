// Go kursu 3/3 (kurs kimliği: go-3). Alan: programlama (KursAlani.kod).
// Sahibi: Adım Adım uygulaması içerik ekibi; yazan: Claude (implementer, dalga9).
// Go 1.2x sözdizimi; çıktı soruları go run ile çalıştırılarak, kod parçaları gofmt -e
// ile denetlenerek doğrulandı. Değişiklik: kurs kimlikleri ve alıştırma türleri
// test/icerik_test.dart kurallarına uymalıdır.
import '../model/icerik.dart';

/// Go İleri Seviye
const Kurs go3 = Kurs(
  id: 'go-3',
  ad: 'Go İleri Seviye',
  aciklama:
      'struct ve yöntemler, arayüzler, paketler, goroutine ve kanallar, WaitGroup, select, panic/recover ve go test.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'go-3-u1',
      ad: 'Yapılar, yöntemler ve arayüzler',
      dersler: [
        Ders(
          id: 'go-3-u1-d1',
          ad: 'struct',
          dilbilgisiNotu:
              'struct, ilişkili alanları tek türde toplar: type Kisi struct { Ad string; Yas int }. Değer iki biçimde oluşturulur: Kisi{Ad: "Ali", Yas: 20} (alan adlarıyla, önerilen) ya da Kisi{"Ali", 20} (sırayla, tüm alanlar verilmeli). Alanlara nokta ile erişilir: k.Ad. Verilmeyen alanlar sıfır değerini alır. struct bir değer türüdür: atama kopya üretir. İşaretçi üzerinden de aynı nokta yazımı çalışır: p.Ad. Alanları karşılaştırılabilirse iki struct == ile karşılaştırılır.\n\nÖrnek:\ntype Kisi struct {\n    Ad  string\n    Yas int\n}\n\nk := Kisi{Ad: "Ali", Yas: 20}\nk.Yas++\nfmt.Println(k.Ad, k.Yas)     // Ali 21\nvar bos Kisi\nfmt.Printf("%+v\\n", bos)     // {Ad: Yas:0}\np := &k\np.Ad = "Veli"\nfmt.Println(k.Ad)            // Veli\nb := k\nb.Yas = 99\nfmt.Println(k.Yas, b.Yas)    // 21 99',
          alistirmalar: [
            Secim(
              soru:
                  'type P struct{ X, Y int } için p := P{1, 2}; p.X = 5; fmt.Println(p) çıktısı nedir?',
              secenekler: ['{5 2}', '{1 2}', '{5 5}', '[5 2]'],
              dogru: 0,
              aciklama:
                  'p.X = 5 yalnız X alanını değiştirir; struct {5 2} olarak yazılır.',
            ),
            Secim(
              soru:
                  'a := P{1, 2}; b := a; b.X = 9; fmt.Println(a.X) çıktısı nedir?',
              secenekler: ['1', '9', '2', 'hata'],
              dogru: 0,
              aciklama: 'struct değer türüdür; b, a\'nın kopyasıdır.',
            ),
            Secim(
              soru: 'fmt.Println(P{1, 2} == P{1, 2}) çıktısı nedir?',
              secenekler: ['true', 'false', 'hata', '1'],
              dogru: 0,
              aciklama:
                  'Alanları karşılaştırılabilir structlar == ile alan alan karşılaştırılır.',
            ),
            Bosluk(
              soru:
                  'Struct alanına erişim için k___Ad yazılır; boşluğa hangi işaret gelir?',
              secenekler: ['.', '->', '::', '#'],
              dogru: 0,
              aciklama:
                  'Go\'da alan erişimi nokta ile yapılır (işaretçide de).',
            ),
            Bosluk(
              soru: 'Başlatılmayan struct alanları ___ değerini alır.',
              secenekler: ['nil', 'sıfır', 'rastgele', 'boş string'],
              dogru: 1,
              aciklama: 'Her alan kendi türünün sıfır değeriyle başlar.',
            ),
            Yaz(
              soru:
                  'Kisi türünde k değişkenini Ad alanı "Ece" olacak şekilde alan adıyla oluştur.',
              cevaplar: [
                'k := Kisi{Ad: "Ece"}',
                'k:=Kisi{Ad:"Ece"}',
                'k := Kisi{Ad: "Ece"};',
              ],
              aciklama:
                  'Alan adıyla yazımda verilmeyen alanlar sıfır değer olur.',
            ),
            Sirala(
              soru: 'struct tanımını doğru sıraya diz.',
              kelimeler: ['{', 'struct', 'Kisi', 'type'],
              dogru: ['type', 'Kisi', 'struct', '{'],
              aciklama: 'type, ad, struct ve { sırasıyla gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'type T struct', sag: 'yeni struct türü'),
                (sol: 'T{A: 1}', sag: 'alan adlı değer'),
                (sol: 't.A', sag: 'alan erişimi'),
                (sol: '&t', sag: 'struct işaretçisi'),
              ],
              aciklama: 'struct kullanımının temel parçaları bunlardır.',
            ),
            Isaretle(
              soru: 'Tür adını işaretle.',
              cumle: 'type Kisi struct {',
              dogru: [1],
              aciklama: 'type\'tan sonra gelen ad yeni türün adıdır.',
            ),
            Kod(
              soru: 'Nokta türünü tanımla.',
              kod: 'type Nokta ___ {\n    X, Y int\n}',
              secenekler: ['struct', 'class', 'object'],
              dogru: 0,
              dil: 'go',
              aciklama: 'Go\'da bileşik veri türü struct ile tanımlanır.',
            ),
          ],
        ),
        Ders(
          id: 'go-3-u1-d2',
          ad: 'Yöntemler: değer ve işaretçi alıcı',
          dilbilgisiNotu:
              'Yöntem, alıcısı olan bir fonksiyondur: func (k Kisi) Selam() string. Değer alıcı (k Kisi) struct\'ın kopyası üzerinde çalışır; alanı değiştirmek çağıranı etkilemez. İşaretçi alıcı (k *Kisi) asıl değere ulaşır ve onu değiştirebilir; büyük structlarda kopya maliyeti de olmaz. c bir değişkense c.Artir() otomatik olarak (&c).Artir() olur. Aynı tür için alıcıları karıştırmamak iyi uygulamadır. Yöntemler aynı paketteki her türe tanımlanabilir.\n\nÖrnek:\ntype Sayac struct{ N int }\n\nfunc (s Sayac) Goster() int { return s.N }\nfunc (s *Sayac) Artir()     { s.N++ }\n\nfunc (s Sayac) YanlisArtir() { s.N++ }\n\nc := Sayac{}\nc.Artir()\nc.Artir()\nc.YanlisArtir()\nfmt.Println(c.Goster()) // 2',
          alistirmalar: [
            Secim(
              soru:
                  'Sayac için işaretçi alıcılı Artir yöntemi iki kez çağrılınca c.N kaç olur?',
              secenekler: ['0', '1', '2', 'hata'],
              dogru: 2,
              aciklama: 'İşaretçi alıcı asıl değeri değiştirir: iki kez artar.',
            ),
            Secim(
              soru:
                  'Değer alıcılı func (s Sayac) YanlisArtir() { s.N++ } üç kez çağrılınca c.N kaç olur?',
              secenekler: ['0', '1', '3', 'hata'],
              dogru: 0,
              aciklama:
                  'Değer alıcı kopya üzerinde çalışır; asıl değer değişmez.',
            ),
            Secim(
              soru:
                  'Goster yöntemi değer alıcılıysa fmt.Println(Sayac{N: 5}.Goster()) çıktısı nedir?',
              secenekler: ['0', '5', 'hata', '1'],
              dogru: 1,
              aciklama: 'Yöntem alıcının N alanını döndürür.',
            ),
            Bosluk(
              soru: 'Asıl değeri değiştirecek yöntemde ___ alıcı kullanılır.',
              secenekler: ['değer', 'işaretçi', 'boş', 'sabit'],
              dogru: 1,
              aciklama: 'İşaretçi alıcı asıl değere ulaşır.',
            ),
            Bosluk(
              soru: 'Değer alıcılı yöntem struct\'ın ___ üzerinde çalışır.',
              secenekler: ['kopyası', 'kendisi', 'adresi', 'kapasitesi'],
              dogru: 0,
              aciklama: 'Değer alıcı kopya alır; değişiklikler kopyada kalır.',
            ),
            Yaz(
              soru:
                  'Sayac türü için işaretçi alıcılı Artir yönteminin başlığını yaz (s alıcı adı).',
              cevaplar: [
                'func (s *Sayac) Artir() {',
                'func (s *Sayac) Artir(){',
                'func (s *Sayac)Artir() {',
              ],
              aciklama: 'İşaretçi alıcı (s *Sayac) biçiminde yazılır.',
            ),
            Sirala(
              soru: 'Yöntem başlığını doğru sıraya diz.',
              kelimeler: ['{', 'Artir()', '(s *Sayac)', 'func'],
              dogru: ['func', '(s *Sayac)', 'Artir()', '{'],
              aciklama: 'func, alıcı, ad ve { sırasıyla gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'func (t T) M()', sag: 'değer alıcı'),
                (sol: 'func (t *T) M()', sag: 'işaretçi alıcı'),
                (sol: 't.M()', sag: 'yöntem çağrısı'),
                (sol: 'alıcı', sag: 'yöntemin bağlı olduğu tür'),
              ],
              aciklama: 'Yöntem terimleri bunlardır.',
            ),
            Isaretle(
              soru: 'Alıcıyı işaretle.',
              cumle: 'func (s *Sayac) Artir() {',
              dogru: [1, 2],
              aciklama: 'İsimden önceki parantezli kısım alıcıdır.',
            ),
            Kod(
              soru: 'İşaretçi alıcılı yöntem yaz.',
              kod: 'func (s ___Sayac) Sifirla() {\n    s.N = 0\n}',
              secenekler: ['*', '&', '@'],
              dogru: 0,
              dil: 'go',
              aciklama: '*Sayac işaretçi alıcıdır.',
            ),
          ],
        ),
        Ders(
          id: 'go-3-u1-d3',
          ad: 'interface',
          dilbilgisiNotu:
              'interface bir yöntem kümesi tanımlar. Bir tür bu yöntemlerin hepsini sağlıyorsa arayüzü örtük olarak uygular; "implements" yazılmaz. Böylece farklı türler aynı arayüz değerinde tutulabilir. any (eski adıyla interface{}) her türü tutar. Bir arayüz değerinin içindeki gerçek türe v, ok := x.(T) ile (tür doğrulama) ya da switch x.(type) ile (tür anahtarı) ulaşılır. fmt, String() string yöntemi olan türleri bu yöntemle yazdırır.\n\nÖrnek:\ntype Sekil interface {\n    Alan() float64\n}\n\ntype Kare struct{ K float64 }\ntype Dikdortgen struct{ A, B float64 }\n\nfunc (k Kare) Alan() float64       { return k.K * k.K }\nfunc (d Dikdortgen) Alan() float64 { return d.A * d.B }\n\nfunc tur(x any) string {\n    switch x.(type) {\n    case int:\n        return "int"\n    case string:\n        return "string"\n    }\n    return "?"\n}\n\nsekiller := []Sekil{Kare{3}, Dikdortgen{2, 5}}\nfor _, s := range sekiller {\n    fmt.Println(s.Alan())     // 9, sonra 10\n}\nfmt.Println(tur(1), tur("a"), tur(2.5)) // int string ?',
          alistirmalar: [
            Secim(
              soru:
                  'Kare Alan() sağlıyorsa Sekil(Kare{2}).Alan() çağrısının çıktısı nedir?',
              secenekler: ['2', '4', '8', 'hata'],
              dogru: 1,
              aciklama:
                  'Kare{2}.Alan() = 2 * 2 = 4; arayüz değeri çağrıyı gerçek türe yönlendirir.',
            ),
            Secim(
              soru:
                  'var x any = "go"; s, ok := x.(string); fmt.Println(s, ok) çıktısı nedir?',
              secenekler: ['go true', 'go false', 'true', 'hata'],
              dogru: 0,
              aciklama: 'x içinde string var; doğrulama başarılıdır.',
            ),
            Secim(
              soru:
                  'var x any = 5; _, ok := x.(string); fmt.Println(ok) çıktısı nedir?',
              secenekler: ['true', 'false', 'panik', 'hata'],
              dogru: 1,
              aciklama:
                  'Virgüllü doğrulama panik üretmez; uymuyorsa ok false olur.',
            ),
            Bosluk(
              soru:
                  'Bir tür arayüzün tüm yöntemlerini taşıyorsa arayüzü ___ uygular.',
              secenekler: [
                'örtük olarak',
                'yalnız import ile',
                'extends ile',
                'new ile',
              ],
              dogru: 0,
              aciklama:
                  'Go\'da arayüz uygulamak için ayrı bir bildirim gerekmez.',
            ),
            Bosluk(
              soru: 'Her türü tutabilen boş arayüzün modern adı ___ \'dir.',
              secenekler: ['any', 'all', 'object', 'void'],
              dogru: 0,
              aciklama: 'any, interface{} ile aynıdır.',
            ),
            Yaz(
              soru:
                  'x any değerini string türüne doğrulayıp s ve ok değişkenlerine atayan ifadeyi yaz.',
              cevaplar: [
                's, ok := x.(string)',
                's,ok := x.(string)',
                's, ok := x.(string);',
              ],
              aciklama: 'Biçim: değer, ok := x.(Tür).',
            ),
            Sirala(
              soru: 'Arayüz tanımını doğru sıraya diz.',
              kelimeler: ['{', 'interface', 'Sekil', 'type'],
              dogru: ['type', 'Sekil', 'interface', '{'],
              aciklama: 'type, ad, interface ve { sırasıyla gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'interface', sag: 'yöntem sözleşmesi'),
                (sol: 'any', sag: 'her türü tutan arayüz'),
                (sol: 'x.(string)', sag: 'tür doğrulama'),
                (sol: 'String() string', sag: 'fmt\'nin kullandığı yöntem'),
                (sol: 'switch x.(type)', sag: 'tür anahtarı'),
              ],
              aciklama: 'Arayüzlerle ilgili temel yapılar bunlardır.',
            ),
            Isaretle(
              soru: 'Arayüz anahtar sözcüğünü işaretle.',
              cumle: 'type Sekil interface {',
              dogru: [2],
              aciklama: 'interface arayüz türü tanımlar.',
            ),
            Kod(
              soru: 'Metin döndüren yöntemi tanımla.',
              kod: 'type Hayvan interface {\n    Ses() ___\n}',
              secenekler: ['string', 'void', 'str'],
              dogru: 0,
              dil: 'go',
              aciklama: 'Go\'da metin türü string\'tir.',
            ),
          ],
        ),
        Ders(
          id: 'go-3-u1-d4',
          ad: 'Paketler ve dışa aktarma',
          dilbilgisiNotu:
              'Her klasör bir pakettir; dosyalar package adıyla başlar. Büyük harfle başlayan adlar (Println, Topla, Kisi, Ad) başka paketlerden kullanılabilir (dışa aktarılır); küçük harfle başlayanlar paketin içinde kalır. Modül oluşturmak için go mod init ornek.com/uyg komutu go.mod dosyasını üretir; paket yolu modül yolundan başlar: import "ornek.com/uyg/matematik". init() fonksiyonu main\'den önce kendiliğinden çalışır. Sık araçlar: go run, go build, go fmt, go vet, go test.\n\nÖrnek:\n// matematik/matematik.go\npackage matematik\n\nfunc Topla(a, b int) int { return a + b } // dışa aktarılır\nfunc gizli() int         { return 1 }     // yalnız pakette kullanılır',
          alistirmalar: [
            Secim(
              soru:
                  'Aşağıdaki adlardan hangisi başka bir pakete dışa aktarılır?',
              secenekler: ['topla', 'Topla', '_topla', 'toplaFn'],
              dogru: 1,
              aciklama: 'Dışa aktarılan adlar büyük harfle başlar.',
            ),
            Secim(
              soru: 'Başka bir paketten matematik.gizli() çağrılırsa ne olur?',
              secenekler: [
                'Derleme hatası verir',
                'Çalışır',
                'Çalışma anında panik olur',
                'Uyarı verir',
              ],
              dogru: 0,
              aciklama:
                  'Küçük harfle başlayan ad paketin dışından kullanılamaz.',
            ),
            Secim(
              soru: 'go mod init ornek.com/uyg komutu hangi dosyayı üretir?',
              secenekler: ['go.mod', 'go.sum', 'main.go', 'package.json'],
              dogru: 0,
              aciklama:
                  'go mod init modül tanımını içeren go.mod dosyasını oluşturur.',
            ),
            Bosluk(
              soru: 'Dışa aktarılan adlar ___ harfle başlar.',
              secenekler: ['küçük', 'büyük', 'alt çizgi', 'rakam'],
              dogru: 1,
              aciklama: 'Fmt paketinden Println çağırabilmemizin nedeni budur.',
            ),
            Bosluk(
              soru:
                  'Modül oluşturmak için go mod ___ ornek.com/uyg komutu çalıştırılır.',
              secenekler: ['init', 'new', 'create', 'start'],
              dogru: 0,
              aciklama: 'go mod init yeni bir modül başlatır.',
            ),
            Yaz(
              soru:
                  'Kaynak kodu standart biçime getiren go alt komutunu yaz (go ile başla).',
              cevaplar: ['go fmt', 'go fmt ./...', 'gofmt'],
              aciklama: 'go fmt (veya gofmt) kodu standart biçime sokar.',
            ),
            Sirala(
              soru: 'Import satırını doğru sıraya diz.',
              kelimeler: ['"fmt"', 'import'],
              dogru: ['import', '"fmt"'],
              aciklama: 'import anahtar sözcüğü paket yolundan önce gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'package', sag: 'dosyanın ait olduğu paket'),
                (sol: 'Topla', sag: 'dışa aktarılır'),
                (sol: 'topla', sag: 'pakete özel kalır'),
                (sol: 'go.mod', sag: 'modül tanım dosyası'),
                (sol: 'init()', sag: 'main\'den önce çalışır'),
              ],
              aciklama:
                  'Paket ve modül kavramlarının temel karşılıkları bunlardır.',
            ),
            Isaretle(
              soru: 'Dışa aktarılan adı işaretle.',
              cumle: 'Topla gizli',
              dogru: [0],
              aciklama: 'Büyük harfle başlayan ad dışa aktarılır.',
            ),
            Kod(
              soru: 'Başka paketlerden çağrılabilecek bir fonksiyon yaz.',
              kod:
                  'package matematik\n\nfunc ___(a, b int) int { return a + b }',
              secenekler: ['Topla', 'topla', '_topla'],
              dogru: 0,
              dil: 'go',
              aciklama: 'Dışa aktarmak için ad büyük harfle başlamalıdır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'go-3-u2',
      ad: 'Eşzamanlılık ve güvenilirlik',
      dersler: [
        Ders(
          id: 'go-3-u2-d1',
          ad: 'Goroutine ve kanal',
          dilbilgisiNotu:
              'Goroutine, go anahtar sözcüğüyle başlatılan hafif eşzamanlı bir işlevdir: go f(). main bitince program biter; çalışan goroutine\'ler beklenmez. Kanal (chan) goroutine\'ler arası iletişim aracıdır: ch := make(chan int); ch <- 5 gönderir, v := <-ch alır. Tamponsuz kanalda gönderme, alıcı hazır olana dek bekler (senkronizasyon). make(chan int, 3) tamponlu kanaldır: tampon dolana dek gönderme bloklanmaz. close(ch) kanalı kapatır; for v := range ch kapanana dek okur. Kapalı kanala göndermek panik üretir.\n\nÖrnek:\nfunc topla(a []int, ch chan int) {\n    t := 0\n    for _, v := range a {\n        t += v\n    }\n    ch <- t\n}\n\nch := make(chan int)\ngo topla([]int{1, 2, 3}, ch)\ngo topla([]int{4, 5, 6}, ch)\na, b := <-ch, <-ch\nfmt.Println(a + b)         // 21\ntamp := make(chan string, 2)\ntamp <- "x"\ntamp <- "y"\nclose(tamp)\nfor s := range tamp {\n    fmt.Print(s)           // xy\n}',
          alistirmalar: [
            Secim(
              soru:
                  'ch := make(chan int, 1); ch <- 7; fmt.Println(<-ch) çıktısı nedir?',
              secenekler: ['0', '7', 'hata', 'kilitlenir'],
              dogru: 1,
              aciklama: 'Tamponlu kanala gönderilen değer alınabilir.',
            ),
            Secim(
              soru:
                  'ch := make(chan int); go func() { ch <- 40 }(); fmt.Println(<-ch) çıktısı nedir?',
              secenekler: ['0', '40', 'hata', 'çıktı yok'],
              dogru: 1,
              aciklama:
                  'main kanaldan alana kadar bekler; goroutine 40 gönderir.',
            ),
            Secim(
              soru:
                  'ch := make(chan int, 5) kanalına 1, 2, 3 gönderilince fmt.Println(len(ch), cap(ch)) çıktısı nedir?',
              secenekler: ['3 5', '5 3', '3 3', '1 5'],
              dogru: 0,
              aciklama: 'len kanaldaki eleman sayısı, cap tampon boyutudur.',
            ),
            Bosluk(
              soru: 'Goroutine başlatmak için çağrının önüne ___ yazılır.',
              secenekler: ['async', 'go', 'thread', 'spawn'],
              dogru: 1,
              aciklama: 'go f() çağrıyı yeni bir goroutine\'de başlatır.',
            ),
            Bosluk(
              soru: 'Kanalı kapatmak için ___(ch) kullanılır.',
              secenekler: ['close', 'end', 'stop', 'exit'],
              dogru: 0,
              aciklama: 'close yerleşik bir fonksiyondur.',
            ),
            Yaz(
              soru: 'ch kanalına 5 değerini gönder.',
              cevaplar: ['ch <- 5', 'ch<-5', 'ch <- 5;'],
              aciklama: 'Gönderme: kanal <- değer.',
            ),
            Sirala(
              soru: 'Kanal oluşturmayı doğru sıraya diz.',
              kelimeler: ['make(chan int)', ':=', 'ch'],
              dogru: ['ch', ':=', 'make(chan int)'],
              aciklama: 'Önce ad, sonra :=, sonra make çağrısı gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'go f()', sag: 'goroutine başlatır'),
                (sol: 'ch <- v', sag: 'kanala gönderir'),
                (sol: 'v := <-ch', sag: 'kanaldan alır'),
                (sol: 'close(ch)', sag: 'kanalı kapatır'),
                (sol: 'make(chan int, 3)', sag: 'tamponlu kanal'),
              ],
              aciklama: 'Kanal işlemlerinin temel karşılıkları bunlardır.',
            ),
            Isaretle(
              soru: 'Kanaldan alma ifadesini işaretle.',
              cumle: 'v := <-ch',
              dogru: [2],
              aciklama: '<-ch kanaldan değer alır.',
            ),
            Kod(
              soru: 'Kanal oluştur.',
              kod: 'ch := make(___ int)',
              secenekler: ['chan', 'channel', 'pipe'],
              dogru: 0,
              dil: 'go',
              aciklama: 'Kanal türü chan ile yazılır.',
            ),
          ],
        ),
        Ders(
          id: 'go-3-u2-d2',
          ad: 'sync.WaitGroup ve Mutex',
          dilbilgisiNotu:
              'sync.WaitGroup goroutine\'lerin bitmesini bekler: wg.Add(1) sayacı artırır, wg.Done() bir azaltır (genelde defer wg.Done()), wg.Wait() sayaç 0 olana dek bekler. WaitGroup kopyalanmamalı; başka fonksiyona işaretçiyle verilir. Goroutine\'lerin çalışma sırası belirsizdir. Birden çok goroutine aynı veriyi değiştiriyorsa yarış durumu oluşur; sync.Mutex ile korunur: mu.Lock() ... mu.Unlock().\n\nÖrnek:\nvar wg sync.WaitGroup\nvar mu sync.Mutex\ntoplam := 0\nfor i := 1; i <= 10; i++ {\n    wg.Add(1)\n    go func() {\n        defer wg.Done()\n        mu.Lock()\n        toplam += i\n        mu.Unlock()\n    }()\n}\nwg.Wait()\nfmt.Println(toplam) // 55',
          alistirmalar: [
            Secim(
              soru:
                  'wg.Add(1); go func() { defer wg.Done(); fmt.Println("iş") }(); wg.Wait() sonrasında çıktı nedir?',
              secenekler: ['iş', 'çıktı yok', 'hata', 'iş iş'],
              dogru: 0,
              aciklama:
                  'Wait, goroutine Done diyene kadar bekler; "iş" yazılmış olur.',
            ),
            Secim(
              soru:
                  '100 goroutine her biri mutex altında n++ yapıp WaitGroup ile beklenirse n kaç olur?',
              secenekler: ['100', '99', 'belirsiz', '0'],
              dogru: 0,
              aciklama: 'Mutex yarış durumunu önler; her artış korunur.',
            ),
            Secim(
              soru:
                  'wg.Add(3) çağrıldıysa wg.Wait() kaç Done çağrısından sonra döner?',
              secenekler: ['1', '2', '3', '0'],
              dogru: 2,
              aciklama: 'Sayaç 3\'e ayarlandı; üç Done ile 0 olur.',
            ),
            Bosluk(
              soru: 'wg.___(1) bekleyecek goroutine sayısını artırır.',
              secenekler: ['Add', 'Plus', 'Inc', 'Push'],
              dogru: 0,
              aciklama: 'Add sayacı artırır.',
            ),
            Bosluk(
              soru: 'Goroutine bitince sayaç wg.___() ile azaltılır.',
              secenekler: ['Done', 'Close', 'Stop', 'End'],
              dogru: 0,
              aciklama: 'Done sayacı bir azaltır.',
            ),
            Yaz(
              soru:
                  'Tüm goroutine\'ler bitene kadar bekleyen wg çağrısını yaz.',
              cevaplar: ['wg.Wait()'],
              aciklama: 'Wait sayaç 0 olana dek bloklar.',
            ),
            Sirala(
              soru: 'Goroutine iskeletini doğru sıraya diz.',
              kelimeler: [
                '}()',
                'fmt.Println("iş")',
                'defer wg.Done()',
                'go func() {',
              ],
              dogru: [
                'go func() {',
                'defer wg.Done()',
                'fmt.Println("iş")',
                '}()',
              ],
              aciklama:
                  'go ile başlar, defer Done ile sayaç düşer, iş yapılır, çağrı }() ile biter.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'wg.Add(1)', sag: 'sayacı artırır'),
                (sol: 'wg.Done()', sag: 'sayacı azaltır'),
                (sol: 'wg.Wait()', sag: 'sayaç 0 olana dek bekler'),
                (sol: 'mu.Lock()', sag: 'kritik bölgeyi kilitler'),
                (sol: 'mu.Unlock()', sag: 'kilidi açar'),
              ],
              aciklama: 'WaitGroup ve Mutex çağrılarının görevleri bunlardır.',
            ),
            Isaretle(
              soru: 'Done çağrısını erteleyen sözcüğü işaretle.',
              cumle: 'defer wg.Done()',
              dogru: [0],
              aciklama: 'defer, Done\'ın goroutine sonunda çalışmasını sağlar.',
            ),
            Kod(
              soru: 'WaitGroup değişkeni tanımla.',
              kod: 'var wg ___.WaitGroup',
              secenekler: ['sync', 'wait', 'async'],
              dogru: 0,
              dil: 'go',
              aciklama: 'WaitGroup sync paketindedir.',
            ),
          ],
        ),
        Ders(
          id: 'go-3-u2-d3',
          ad: 'select',
          dilbilgisiNotu:
              'select, birden çok kanal işlemini aynı anda bekler. Hazır olan case çalışır; birden çoğu hazırsa biri rastgele seçilir. Hiçbiri hazır değilse ve default varsa default çalışır, yoksa select bloklanır. time.After(süre) süre dolunca değer gönderen bir kanaldır; zaman aşımı için kullanılır. for { select { ... } } kalıbı sürekli dinleme yapar.\n\nÖrnek:\na := make(chan string, 1)\nb := make(chan string, 1)\nb <- "b hazır"\nselect {\ncase m := <-a:\n    fmt.Println(m)\ncase m := <-b:\n    fmt.Println(m)             // b hazır\n}\nbos := make(chan int)\nselect {\ncase v := <-bos:\n    fmt.Println(v)\ndefault:\n    fmt.Println("veri yok")    // veri yok\n}\nselect {\ncase <-bos:\ncase <-time.After(10 * time.Millisecond):\n    fmt.Println("zaman aşımı") // zaman aşımı\n}',
          alistirmalar: [
            Secim(
              soru:
                  'Kanalda 3 varken select { case v := <-ch: "aldı", v; default: "boş" } çıktısı nedir?',
              secenekler: ['aldı 3', 'boş', 'aldı', 'hata'],
              dogru: 0,
              aciklama: 'Kanal hazır olduğu için ilk case çalışır.',
            ),
            Secim(
              soru: 'Kanal boşken aynı select ne yazar?',
              secenekler: ['aldı 0', 'boş', 'hiçbir şey', 'hata'],
              dogru: 1,
              aciklama: 'Hiçbir case hazır değilse default çalışır.',
            ),
            Secim(
              soru:
                  'select { case <-time.After(5 * time.Millisecond): fmt.Println("süre doldu") } ne yazar?',
              secenekler: ['süre doldu', 'hiçbir şey', 'hata', 'kilitlenir'],
              dogru: 0,
              aciklama:
                  'time.After süre dolunca değer gönderir ve case çalışır.',
            ),
            Bosluk(
              soru: 'Hiçbir case hazır değilse çalışan dal ___ \'tur.',
              secenekler: ['else', 'default', 'timeout', 'none'],
              dogru: 1,
              aciklama: 'select\'te hazır kanal yoksa default çalışır.',
            ),
            Bosluk(
              soru: 'Zaman aşımı kanalı için time.___(süre) kullanılır.',
              secenekler: ['After', 'Wait', 'Limit', 'Stop'],
              dogru: 0,
              aciklama:
                  'time.After süre dolunca değer gönderen bir kanal döndürür.',
            ),
            Yaz(
              soru: 'Bir case\'te ch kanalından v değerini alan satırı yaz.',
              cevaplar: [
                'case v := <-ch:',
                'case v:=<-ch:',
                'case v := <- ch:',
              ],
              aciklama: 'Alma durumu: case v := <-ch:',
            ),
            Sirala(
              soru: 'select iskeletini doğru sıraya diz.',
              kelimeler: ['}', 'fmt.Println(v)', 'case v := <-ch:', 'select {'],
              dogru: ['select {', 'case v := <-ch:', 'fmt.Println(v)', '}'],
              aciklama: 'select, case, gövde ve kapanış sırasıyla gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'select', sag: 'birden çok kanalı bekler'),
                (sol: 'default', sag: 'hiçbir kanal hazır değilse'),
                (sol: 'time.After', sag: 'zaman aşımı kanalı'),
                (sol: 'case v := <-ch', sag: 'alma durumu'),
                (sol: 'case ch <- v', sag: 'gönderme durumu'),
              ],
              aciklama: 'select yapısının parçaları bunlardır.',
            ),
            Isaretle(
              soru: 'Hazır kanal yoksa çalışan dalı işaretle.',
              cumle: 'select { case <-ch: default: }',
              dogru: [4],
              aciklama: 'default: hazır kanal yoksa çalışır.',
            ),
            Kod(
              soru: 'Hazır veri yoksa "yok" yaz.',
              kod:
                  'select {\ncase v := <-ch:\n    fmt.Println(v)\n___:\n    fmt.Println("yok")\n}',
              secenekler: ['default', 'else', 'none'],
              dogru: 0,
              dil: 'go',
              aciklama:
                  'default dalı select\'in engellenmeden devam etmesini sağlar.',
            ),
          ],
        ),
        Ders(
          id: 'go-3-u2-d4',
          ad: 'panic, recover ve go test',
          dilbilgisiNotu:
              'panic normal akışı durdurur; defer\'ler çalışır ve kurtarılmazsa program çöker. Dizi sınırını aşmak ya da nil map\'e yazmak panik üretir. Beklenen hatalar için panic değil error kullanılır. recover paniği yakalar, ama yalnız defer ile ertelenmiş fonksiyonun içinde işe yarar. Test: dosya adı _test.go ile biter, test fonksiyonu func TestAd(t *testing.T) biçimindedir ve t.Errorf başarısızlığı bildirir; go test ile çalışır. Örnek (topla_test.go): func TestTopla(t *testing.T) { if Topla(2, 3) != 5 { t.Errorf("beklenen 5") } }\n\nÖrnek:\nfunc guvenli(f func()) (hata any) {\n    defer func() {\n        hata = recover()\n    }()\n    f()\n    return nil\n}\n\nfmt.Println(guvenli(func() { panic("patladı") }))  // patladı\ns := []int{1, 2}\ni := 5\nfmt.Println(guvenli(func() { _ = s[i] }) != nil)   // true\nfmt.Println(guvenli(func() {}))                    // <nil>',
          alistirmalar: [
            Secim(
              soru:
                  'defer ile recover() çağrısı varken panic("hata") sonrası kurtarılan değer ne yazar?',
              secenekler: [
                'kurtarıldı: hata',
                'kurtarıldı: <nil>',
                'çöker',
                'hata',
              ],
              dogru: 0,
              aciklama: 'recover paniğe verilen değeri döndürür.',
            ),
            Secim(
              soru:
                  'Panik içeride recover ile yakalanırsa dışarıdaki Println("devam") çalışır mı?',
              secenekler: [
                'Evet, devam yazılır',
                'Hayır, program çöker',
                'Yalnız Windows\'ta',
                'Derleme hatası olur',
              ],
              dogru: 0,
              aciklama:
                  'Kurtarılan panik yalnız o fonksiyonu sonlandırır; çağıran devam eder.',
            ),
            Secim(
              soru: 'Go test dosyası hangi adla biter?',
              secenekler: ['_test.go', '.test', 'Test.go', '_check.go'],
              dogru: 0,
              aciklama:
                  'go test, adı _test.go ile biten dosyalardaki Test fonksiyonlarını bulur.',
            ),
            Bosluk(
              soru: 'recover yalnız ___ edilen fonksiyonda işe yarar.',
              secenekler: ['defer', 'import', 'go', 'select'],
              dogru: 0,
              aciklama:
                  'Panik sırasında yalnız ertelenmiş fonksiyonlar çalışır.',
            ),
            Bosluk(
              soru: 'Testleri çalıştıran komut go ___ \'tir.',
              secenekler: ['test', 'check', 'verify', 'try'],
              dogru: 0,
              aciklama: 'go test paketin testlerini çalıştırır.',
            ),
            Yaz(
              soru:
                  't.Errorf ile "hata" mesajlı başarısızlık bildiren satırı yaz.',
              cevaplar: ['t.Errorf("hata")', 't.Errorf("hata");'],
              aciklama:
                  't.Errorf testi başarısız işaretler ama çalışmayı sürdürür.',
            ),
            Sirala(
              soru: 'Test fonksiyonu başlığını doğru sıraya diz.',
              kelimeler: ['{', '*testing.T)', 'TestTopla(t', 'func'],
              dogru: ['func', 'TestTopla(t', '*testing.T)', '{'],
              aciklama: 'func, ad ve parametre, { sırasıyla gelir.',
            ),
            Eslestir(
              soru: 'Öğeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'panic("x")', sag: 'çalışmayı durdurur'),
                (sol: 'recover()', sag: 'paniği yakalar'),
                (sol: 't.Errorf', sag: 'testi başarısız işaretler'),
                (sol: '_test.go', sag: 'test dosyası eki'),
                (sol: 'go test', sag: 'testleri çalıştırır'),
              ],
              aciklama: 'Hata yönetimi ve test araçları bunlardır.',
            ),
            Isaretle(
              soru: 'Paniği yakalayan fonksiyonu işaretle.',
              cumle: 'defer func() { recover() }()',
              dogru: [3],
              aciklama: 'recover() paniği yakalar.',
            ),
            Kod(
              soru: 'Paniği yakala.',
              kod:
                  'defer func() {\n    if r := ___(); r != nil {\n        fmt.Println("yakalandı")\n    }\n}()',
              secenekler: ['recover', 'catch', 'rescue'],
              dogru: 0,
              dil: 'go',
              aciklama:
                  'Go\'da panik yakalayan yerleşik fonksiyon recover\'dır.',
            ),
          ],
        ),
      ],
    ),
  ],
);
