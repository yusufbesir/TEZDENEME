/// Yarışma soru bankası: Go seviye 2 ve 3 (go-2, go-3), 6 kategori x 4 soru x 2 seviye = 48 soru (go-1, programlama_6.dart dosyasındadır).
/// Kategoriler Go konularına eşlenmiştir (genel kültür, tarih, yazım/stil, hesap, davranış, ekosistem).
/// Çıktı/davranış iddiası taşıyan sorular ilgili araçla (SQLite, PHP, Go) çalıştırılarak doğrulandı; tarih ve genel bilgi soruları elle kontrol edildi.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dalga14]
library;

import '../model.dart';

const List<YarismaSorusu> goSorulari = [
  YarismaSorusu(
    id: 'go-2.genelKultur.1',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.genelKultur,
    soru: 'Go fonksiyonları birden fazla değer döndürebilir mi?',
    secenekler: [
      'Hayır; yalnız bir değer döner',
      'Evet; ör. (int, error) döndürmek yaygındır',
      'Yalnız diziyle mümkündür',
      'Yalnız goroutine içinde mümkündür',
    ],
    dogru: 1,
    aciklama:
        'func bol(a, b int) (int, int) gibi birden çok dönüş değeri Go\'da olağandır.',
  ),
  YarismaSorusu(
    id: 'go-2.genelKultur.2',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.genelKultur,
    soru:
        'Bir slice\'a eleman eklemek için hangi yerleşik fonksiyon kullanılır?',
    secenekler: ['push', 'add', 'insert', 'append'],
    dogru: 3,
    aciklama:
        's = append(s, 4) yeni eleman eklenmiş slice döndürür; sonuç yeniden atanmalıdır.',
  ),
  YarismaSorusu(
    id: 'go-2.genelKultur.3',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.genelKultur,
    soru:
        'Map\'te bir anahtarın var olup olmadığını anlamak için hangi yazım kullanılır?',
    secenekler: ['v, ok := m[k]', 'm.has(k)', 'm.contains(k)', 'exists(m, k)'],
    dogru: 0,
    aciklama:
        'İkinci dönüş değeri (ok) anahtarın bulunup bulunmadığını söyler.',
  ),
  YarismaSorusu(
    id: 'go-2.genelKultur.4',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.genelKultur,
    soru: 'defer anahtar sözcüğü ne yapar?',
    secenekler: [
      'Çağrıyı yeni bir iş parçacığında başlatır',
      'Fonksiyonu siler',
      'Bir çağrıyı çevreleyen fonksiyon bitene kadar erteler',
      'Hataları yok sayar',
    ],
    dogru: 2,
    aciklama:
        'defer edilen çağrılar fonksiyondan çıkarken ters sırada (LIFO) çalışır; dosya kapatma gibi temizlik işleri için kullanılır.',
  ),
  YarismaSorusu(
    id: 'go-2.tarih.1',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.tarih,
    soru: 'Go\'nun maskotu olan Gopher\'ı kim tasarladı?',
    secenekler: ['Ken Thompson', 'Rob Pike', 'Larry Wall', 'Renée French'],
    dogru: 3,
    aciklama: 'Gopher maskotu illüstratör Renée French tarafından çizildi.',
  ),
  YarismaSorusu(
    id: 'go-2.tarih.2',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.tarih,
    soru: 'Go modülleri (go.mod) hangi sürümde tanıtıldı?',
    secenekler: ['Go 1.11', 'Go 1.0', 'Go 1.5', 'Go 1.18'],
    dogru: 0,
    aciklama:
        'Modül sistemi Ağustos 2018\'de Go 1.11 ile deneysel olarak, sonra varsayılan olarak yerleşti.',
  ),
  YarismaSorusu(
    id: 'go-2.tarih.3',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.tarih,
    soru: 'UTF-8 kodlamasını 1992\'de Plan 9 için hangi iki kişi tasarladı?',
    secenekler: [
      'Tim Berners-Lee ve Vint Cerf',
      'Bill Joy ve Linus Torvalds',
      'Ken Thompson ve Rob Pike',
      'Brian Kernighan ve Alan Kay',
    ],
    dogru: 2,
    aciklama:
        'UTF-8\'i Ken Thompson ve Rob Pike geliştirdi; ikisi de Go\'nun tasarımcılarındandır.',
  ),
  YarismaSorusu(
    id: 'go-2.tarih.4',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.tarih,
    soru: 'Go dilinin yaygın "Golang" adı neden kullanılır?',
    secenekler: [
      'Dilin gerçek adı Golang\'dır',
      'Resmi site alan adı golang.org idi; "Go" sözcüğü aramada belirsizdi',
      'Google ve Language kısaltmasıdır',
      'Go sözcüğü ticari marka olduğu için',
    ],
    dogru: 1,
    aciklama:
        'Dilin adı Go\'dur; Golang takma adı golang.org alan adından ve arama kolaylığından yaygınlaşmıştır.',
  ),
  YarismaSorusu(
    id: 'go-2.sanat.1',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.sanat,
    soru: 'Go\'da hata kontrolü için deyimsel (idiomatic) yazım hangisidir?',
    secenekler: [
      'if err != nil { ... }',
      'try { } catch { }',
      'if (err) throw err',
      'on error resume next',
    ],
    dogru: 0,
    aciklama:
        'Go\'da hatalar normal dönüş değeridir ve çağrıdan hemen sonra if err != nil ile kontrol edilir.',
  ),
  YarismaSorusu(
    id: 'go-2.sanat.2',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.sanat,
    soru:
        'Bir dönüş değerini kullanmak istemediğimizde hangi tanımlayıcı kullanılır?',
    secenekler: ['null', 'void', '_ (boş tanımlayıcı)', 'nil'],
    dogru: 2,
    aciklama:
        '_ atanan değeri yok sayar; Go kullanılmayan değişkene izin vermediğinden bu çok kullanılır.',
  ),
  YarismaSorusu(
    id: 'go-2.sanat.3',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.sanat,
    soru: 'for _, v := range dizi yazımındaki _ neyi yok sayar?',
    secenekler: [
      'Dizinin değerlerini',
      'Dizin (indeks) değerini',
      'Dizinin uzunluğunu',
      'Hataları',
    ],
    dogru: 1,
    aciklama:
        'range iki değer verir: önce indeks, sonra değer; _ indeksi yok sayar.',
  ),
  YarismaSorusu(
    id: 'go-2.sanat.4',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.sanat,
    soru:
        'make([]int, 0, 5) ile oluşturulan slice\'ın uzunluğu ve kapasitesi nedir?',
    secenekler: [
      'Uzunluk 5, kapasite 0',
      'Uzunluk 5, kapasite 5',
      'Uzunluk 0, kapasite 0',
      'Uzunluk 0, kapasite 5',
    ],
    dogru: 3,
    aciklama:
        'make([]T, uzunluk, kapasite): içi boş ama 5 elemanlık yer ayrılmış slice.',
  ),
  YarismaSorusu(
    id: 'go-2.matematik.1',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.matematik,
    soru: 's := []int{1, 2, 3}; s = append(s, 4, 5) sonrasında len(s) kaçtır?',
    secenekler: ['3', '2', '5', '6'],
    dogru: 2,
    aciklama: '3 elemana 2 eleman eklenince uzunluk 5 olur.',
  ),
  YarismaSorusu(
    id: 'go-2.matematik.2',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.matematik,
    soru: 's := []int{1, 2, 3, 4, 5}; fmt.Println(s[1:4]) ne yazdırır?',
    secenekler: ['[1 2 3 4]', '[2 3 4]', '[2 3 4 5]', '[1 2 3]'],
    dogru: 1,
    aciklama: 's[a:b] a dahil, b hariç elemanları verir: indeks 1, 2, 3.',
  ),
  YarismaSorusu(
    id: 'go-2.matematik.3',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.matematik,
    soru:
        'for i := 1; i <= 4; i++ { t += i } döngüsünden sonra t (başlangıçta 0) kaçtır?',
    secenekler: ['4', '6', '24', '10'],
    dogru: 3,
    aciklama: '1 + 2 + 3 + 4 = 10.',
  ),
  YarismaSorusu(
    id: 'go-2.matematik.4',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.matematik,
    soru:
        'm := map[string]int{"a": 1, "b": 2}; delete(m, "a") sonrasında len(m) kaçtır?',
    secenekler: ['1', '2', '0', 'Hata verir'],
    dogru: 0,
    aciklama: 'delete anahtarı ve değerini siler; geriye "b" kalır.',
  ),
  YarismaSorusu(
    id: 'go-2.fen.1',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.fen,
    soru: 'nil bir map\'e (var m map[string]int) yazmaya çalışırsak ne olur?',
    secenekler: [
      'Map otomatik oluşur',
      'Çalışma anında panic oluşur',
      'Derleme hatası olur',
      'Değer sessizce yok sayılır',
    ],
    dogru: 1,
    aciklama:
        'nil map\'ten okuma güvenlidir ama yazma panic verir: "assignment to entry in nil map". Önce make ile oluşturulmalıdır.',
  ),
  YarismaSorusu(
    id: 'go-2.fen.2',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.fen,
    soru: 'len("héllo") ifadesi kaçtır?',
    secenekler: ['5', '4', '7', '6'],
    dogru: 3,
    aciklama:
        'len bayt sayısını verir; é UTF-8\'de 2 bayttır. Karakter (rune) sayısı utf8.RuneCountInString ile bulunur.',
  ),
  YarismaSorusu(
    id: 'go-2.fen.3',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.fen,
    soru:
        'x := 1; defer fmt.Println(x); x = 2 kodundan sonra fonksiyon bitince ne yazdırılır?',
    secenekler: ['1', '2', '0', 'Hiçbir şey'],
    dogru: 0,
    aciklama:
        'defer çağrısının argümanları defer satırı çalıştığı anda hesaplanır; x o anda 1\'dir.',
  ),
  YarismaSorusu(
    id: 'go-2.fen.4',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.fen,
    soru: 'a := []int{1, 2, 3}; b := a[:2]; b[0] = 9 sonrasında a[0] kaçtır?',
    secenekler: ['1', '2', '9', 'Hata verir'],
    dogru: 2,
    aciklama:
        'Dilimler aynı alttaki diziyi paylaşır; b üzerindeki değişiklik a\'da da görünür.',
  ),
  YarismaSorusu(
    id: 'go-2.cografya.1',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.cografya,
    soru:
        'Metni sayıya çevirmek için (ör. "42" -> 42) hangi standart paket kullanılır?',
    secenekler: ['fmt only', 'math/text', 'cast', 'strconv'],
    dogru: 3,
    aciklama: 'strconv.Atoi("42") metni int\'e çevirir.',
  ),
  YarismaSorusu(
    id: 'go-2.cografya.2',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.cografya,
    soru: 'strings.ToUpper hangi pakette bulunur?',
    secenekler: ['strings', 'text', 'fmt', 'unicode/case'],
    dogru: 0,
    aciklama:
        'strings paketi metin işlemleri (ToUpper, Split, Contains, Join...) sunar.',
  ),
  YarismaSorusu(
    id: 'go-2.cografya.3',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.cografya,
    soru:
        'Bir int dilimini küçükten büyüğe sıralamak için hangi paket/işlev kullanılabilir?',
    secenekler: ['order.Ints', 'list.Sort', 'sort.Ints', 'math.Sort'],
    dogru: 2,
    aciklama: 'sort.Ints(s) tamsayı dilimini yerinde sıralar.',
  ),
  YarismaSorusu(
    id: 'go-2.cografya.4',
    alan: 'kod',
    seviyeKursId: 'go-2',
    kategori: YarismaKategori.cografya,
    soru: 'Programın komut satırı argümanlarına hangi paketle erişilir?',
    secenekler: ['cmd', 'os (os.Args)', 'flag only', 'sys'],
    dogru: 1,
    aciklama:
        'os.Args, program adı ve argümanları içeren bir dilimdir; os.Args[0] program adıdır.',
  ),
  YarismaSorusu(
    id: 'go-3.genelKultur.1',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.genelKultur,
    soru: 'Go\'da struct nedir?',
    secenekler: [
      'Bir tür döngü',
      'Alanları bir araya getiren, kullanıcı tanımlı bileşik veri türü',
      'Bir hata türü',
      'Yalnız sabit sayıları tutan tür',
    ],
    dogru: 1,
    aciklama:
        'type Kisi struct { Ad string; Yas int } gibi tanımlanır ve alanlara nokta ile erişilir.',
  ),
  YarismaSorusu(
    id: 'go-3.genelKultur.2',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.genelKultur,
    soru: 'Bir türün Go\'da bir arayüzü (interface) karşılaması nasıl olur?',
    secenekler: [
      'implements ile açıkça bildirilmelidir',
      'Arayüz adı tür adına eklenmelidir',
      'Yalnız aynı pakette olmalıdır',
      'Gerekli yöntemleri uygulaması yeterlidir (örtük)',
    ],
    dogru: 3,
    aciklama:
        'Go\'da arayüzler örtük karşılanır: yöntem kümesi uyuyorsa tür arayüzü karşılar.',
  ),
  YarismaSorusu(
    id: 'go-3.genelKultur.3',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.genelKultur,
    soru:
        'Bir fonksiyonu eşzamanlı olarak (goroutine olarak) başlatmak için hangi anahtar sözcük kullanılır?',
    secenekler: ['go', 'async', 'thread', 'spawn'],
    dogru: 0,
    aciklama: 'go f() çağrısı f\'yi yeni bir goroutine\'de çalıştırır.',
  ),
  YarismaSorusu(
    id: 'go-3.genelKultur.4',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.genelKultur,
    soru: 'Tam sayı taşıyan bir kanal (channel) nasıl oluşturulur?',
    secenekler: [
      'new Chan(int)',
      'chan.create(int)',
      'make(chan int)',
      'channel<int>()',
    ],
    dogru: 2,
    aciklama:
        'make(chan int) tamponsuz bir kanal oluşturur; ch <- v gönderir, <-ch alır.',
  ),
  YarismaSorusu(
    id: 'go-3.tarih.1',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.tarih,
    soru:
        'Go\'nun kanallara dayalı eşzamanlılık modeli hangi kuramdan esinlenmiştir?',
    secenekler: [
      'Aktör modeli yalnızca Erlang\'dan kopyalanmıştır',
      'Nesne yönelimli kalıtım',
      'Fonksiyonel lambda hesabı',
      'CSP (Communicating Sequential Processes, Tony Hoare)',
    ],
    dogru: 3,
    aciklama:
        'Go\'nun goroutine ve kanal modeli, Tony Hoare\'un 1978 tarihli CSP kuramından etkilenmiştir.',
  ),
  YarismaSorusu(
    id: 'go-3.tarih.2',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.tarih,
    soru: 'Hangi iki ünlü altyapı yazılımı Go ile yazılmıştır?',
    secenekler: [
      'Docker ve Kubernetes',
      'Windows ve Photoshop',
      'WordPress ve Drupal',
      'Linux çekirdeği ve Git',
    ],
    dogru: 0,
    aciklama:
        'Docker ve Kubernetes büyük ölçüde Go ile yazılmıştır; bu Go\'nun bulut altyapısında yaygınlaşmasını sağladı.',
  ),
  YarismaSorusu(
    id: 'go-3.tarih.3',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.tarih,
    soru: 'min ve max yerleşik fonksiyonları Go\'ya hangi sürümle eklendi?',
    secenekler: ['Go 1.0', 'Go 1.12', 'Go 1.21', 'Go 1.5'],
    dogru: 2,
    aciklama:
        'Go 1.21 (2023) min, max ve clear yerleşik fonksiyonlarını getirdi.',
  ),
  YarismaSorusu(
    id: 'go-3.tarih.4',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.tarih,
    soru:
        '"for i := range 3" gibi tamsayı üzerinde range kullanımı hangi sürümde geldi?',
    secenekler: ['Go 1.4', 'Go 1.22', 'Go 1.13', 'Go 1.0'],
    dogru: 1,
    aciklama:
        'Go 1.22 (2024) ile range doğrudan tamsayıyla kullanılabilir hale geldi (0, 1, 2).',
  ),
  YarismaSorusu(
    id: 'go-3.sanat.1',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.sanat,
    soru: 'Go\'da bir paketin dışına açılan (exported) bir isim nasıl yazılır?',
    secenekler: [
      'Büyük harfle başlar',
      'public sözcüğüyle işaretlenir',
      'Alt çizgiyle başlar',
      'Tamamı küçük harfle yazılır',
    ],
    dogru: 0,
    aciklama:
        'Büyük harfle başlayan isimler paket dışından erişilebilir, küçük harfle başlayanlar paket içine özeldir.',
  ),
  YarismaSorusu(
    id: 'go-3.sanat.2',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.sanat,
    soru: 'Go stil rehberine göre hata mesajları nasıl yazılmalıdır?',
    secenekler: [
      'Büyük harfle başlar ve ünlemle biter',
      'Tamamen büyük harfle yazılır',
      'Küçük harfle başlar ve noktalama ile bitmez',
      'Her zaman soru işaretiyle biter',
    ],
    dogru: 2,
    aciklama:
        'Hata mesajları başka mesajların içine eklenebildiği için küçük harfle başlar ve nokta ile bitmez.',
  ),
  YarismaSorusu(
    id: 'go-3.sanat.3',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.sanat,
    soru: 'Go\'da arayüzler için hangi tasarım ilkesi önerilir?',
    secenekler: [
      'Her arayüz en az 20 yöntem içermelidir',
      'Küçük arayüzler (az yöntem) tercih edilir',
      'Arayüz kullanmak yasaktır',
      'Arayüzler sınıf kalıtımıyla yazılmalıdır',
    ],
    dogru: 1,
    aciklama:
        'io.Reader ve io.Writer gibi tek yöntemli arayüzler esnek ve yeniden kullanılabilirdir; "arayüzler ne kadar büyükse soyutlama o kadar zayıftır" denir.',
  ),
  YarismaSorusu(
    id: 'go-3.sanat.4',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.sanat,
    soru: 'Bir test dosyasının adı hangi kalıba uymalıdır?',
    secenekler: ['test_*.go', '*.test', 'tests/*.go', '*_test.go'],
    dogru: 3,
    aciklama:
        'go test, adı _test.go ile biten dosyalardaki TestXxx(t *testing.T) fonksiyonlarını çalıştırır.',
  ),
  YarismaSorusu(
    id: 'go-3.matematik.1',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.matematik,
    soru:
        '10 goroutine, her biri mutex ile korunan sayacı 1 artırırsa, WaitGroup ile beklendikten sonra sayaç kaçtır?',
    secenekler: ['0', '1', '10', 'Belirsiz (yarış durumu)'],
    dogru: 2,
    aciklama:
        'Mutex, artırma işlemini kritik bölüme alır; böylece hiçbir artış kaybolmaz ve sonuç her zaman 10 olur.',
  ),
  YarismaSorusu(
    id: 'go-3.matematik.2',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.matematik,
    soru:
        'ch := make(chan int, 3); ch <- 1; ch <- 2 sonrasında len(ch) ve cap(ch) nedir?',
    secenekler: ['3 ve 2', '2 ve 3', '2 ve 2', '0 ve 3'],
    dogru: 1,
    aciklama:
        'Tamponlu kanalda len, şu an bekleyen eleman sayısını; cap tampon kapasitesini verir.',
  ),
  YarismaSorusu(
    id: 'go-3.matematik.3',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.matematik,
    soru:
        'Kanala 1, 2, 3 sayılarının karelerini gönderip hepsini toplarsak sonuç kaçtır?',
    secenekler: ['6', '9', '12', '14'],
    dogru: 3,
    aciklama: '1 + 4 + 9 = 14.',
  ),
  YarismaSorusu(
    id: 'go-3.matematik.4',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.matematik,
    soru:
        'Tamponsuz kanalda select { case v := <-ch: ... default: ... } ile kanalda veri yokken hangi dal çalışır?',
    secenekler: [
      'default',
      'case dalı',
      'İkisi birden',
      'Hiçbiri; select bekler',
    ],
    dogru: 0,
    aciklama:
        'default dalı varsa ve hiçbir case hazır değilse select beklemeden default\'u çalıştırır.',
  ),
  YarismaSorusu(
    id: 'go-3.fen.1',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.fen,
    soru:
        'func (c Sayac) Art() { c.n++ } gibi değer alıcılı bir yöntem sayaçtaki n\'yi kalıcı olarak artırır mı?',
    secenekler: [
      'Evet; her zaman artırır',
      'Hayır; yöntem kopya üzerinde çalışır',
      'Yalnızca ilk çağrıda artırır',
      'Derleme hatası verir',
    ],
    dogru: 1,
    aciklama:
        'Değer alıcısı nesnenin kopyasını alır; kalıcı değişiklik için işaretçi alıcısı (c *Sayac) gerekir.',
  ),
  YarismaSorusu(
    id: 'go-3.fen.2',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.fen,
    soru:
        'Alıcısı olmayan, gönderici de bulunmayan tamponsuz bir kanala ana goroutine\'den gönderim yaparsak ne olur?',
    secenekler: [
      'Değer kaybolur ve program devam eder',
      'Derleme hatası olur',
      'Kanal otomatik tampon açar',
      'Çalışma zamanı "deadlock" hatasıyla programı sonlandırır',
    ],
    dogru: 3,
    aciklama:
        'Tüm goroutine\'ler bloke olursa çalışma zamanı "all goroutines are asleep - deadlock!" ile çöker.',
  ),
  YarismaSorusu(
    id: 'go-3.fen.3',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.fen,
    soru:
        'defer içinde recover() kullanıp panic\'i yakaladıktan sonra program akışı nasıl devam eder?',
    secenekler: [
      'Panic yapan fonksiyon sonlanır, çağıran kod normal devam eder',
      'Program her zaman çöker',
      'Panic olan satırdan devam edilir',
      'Tüm goroutine\'ler durur',
    ],
    dogru: 0,
    aciklama:
        'recover panic\'i durdurur; panic eden fonksiyon bitmiş sayılır ve çağıran taraf çalışmaya devam eder.',
  ),
  YarismaSorusu(
    id: 'go-3.fen.4',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.fen,
    soru: 'Kapatılmış (close) bir kanaldan değer alırsak ne elde ederiz?',
    secenekler: [
      'Panic oluşur',
      'Program bekler',
      'Türün sıfır değeri ve ok = false',
      'Son gönderilen değer tekrar gelir',
    ],
    dogru: 2,
    aciklama:
        'Boşalmış ve kapatılmış kanaldan alım hemen sıfır değeri ile ok=false döndürür.',
  ),
  YarismaSorusu(
    id: 'go-3.cografya.1',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.cografya,
    soru:
        'Bir pakette yazılmış testleri çalıştırmak için hangi komut kullanılır?',
    secenekler: ['go check', 'go verify', 'go try', 'go test'],
    dogru: 3,
    aciklama: 'go test, *_test.go dosyalarındaki testleri derleyip çalıştırır.',
  ),
  YarismaSorusu(
    id: 'go-3.cografya.2',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.cografya,
    soru:
        'Yeni bir Go modülü başlatmak (go.mod oluşturmak) için hangi komut kullanılır?',
    secenekler: [
      'go mod init <modül-yolu>',
      'go new module',
      'go init module',
      'go create',
    ],
    dogru: 0,
    aciklama:
        'go mod init example.com/uygulama, dizinde go.mod dosyasını oluşturur.',
  ),
  YarismaSorusu(
    id: 'go-3.cografya.3',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.cografya,
    soru: 'go vet aracı ne işe yarar?',
    secenekler: [
      'Kodu otomatik biçimlendirir',
      'Programı yayımlar',
      'Derleyicinin yakalamadığı şüpheli kod kalıplarını bulur',
      'Bağımlılıkları indirir',
    ],
    dogru: 2,
    aciklama:
        'go vet, yanlış Printf biçimi gibi muhtemel hataları statik olarak bulur.',
  ),
  YarismaSorusu(
    id: 'go-3.cografya.4',
    alan: 'kod',
    seviyeKursId: 'go-3',
    kategori: YarismaKategori.cografya,
    soru: 'go build komutu normalde ne üretir?',
    secenekler: [
      'Yalnız HTML dosyası',
      'Çalıştırılabilir bir ikili (binary) dosya',
      'Bir Docker imajı',
      'Sanal makine bayt kodu (.class)',
    ],
    dogru: 1,
    aciklama:
        'go build, ana paketi tek bir çalıştırılabilir dosyaya derler; çalıştırmak için Go kurulumu gerekmez.',
  ),
];
