import '../model/icerik.dart';

/// JavaScript İleri Düzey
const Kurs js3 = Kurs(
  id: 'js-3',
  ad: 'JavaScript İleri Düzey',
  aciklama:
      'Sınıflar, olay döngüsü, Proxy, tasarım kalıpları, performans ve test araçlarıyla ileri düzey JavaScript.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'js-3-u1',
      ad: 'Sınıflar ve üreteçler',
      dersler: [
        Ders(
          id: 'js-3-u1-d1',
          ad: 'Prototip ve sınıf',
          alistirmalar: [
            Secim(
              soru:
                  'Bir nesnede olmayan özellik okunurken JavaScript nereye bakar?',
              secenekler: [
                'Prototip zincirinde bir üst nesneye',
                'Doğrudan hata fırlatır',
                'Rastgele bir nesneye',
                'Yerel depoya',
              ],
              dogru: 0,
              aciklama:
                  'Özellik bulunamazsa arama prototip zinciri boyunca yukarı doğru sürer.',
            ),
            Secim(
              soru:
                  'Alt sınıfın yapıcısında üst sınıfın yapıcısını çağırmak için ne kullanılır?',
              secenekler: [
                'super(...)',
                'parent(...)',
                'base(...)',
                'this.super(...)',
              ],
              dogru: 0,
              aciklama:
                  'Alt sınıf constructor içinde this kullanmadan önce super çağrılmalıdır.',
            ),
            Bosluk(
              soru:
                  'class Meyve ___ Urun { } Meyve sınıfı Urun den miras alır.',
              secenekler: ['extends', 'inherits', 'implements', 'from'],
              dogru: 0,
              aciklama: 'Sınıf mirası extends anahtar sözcüğüyle kurulur.',
            ),
            Bosluk(
              soru:
                  'class Kasa { ___toplam = 0; } alanı sınıf dışından erişilemez yapar.',
              secenekler: ['#', '_', '@', '&'],
              dogru: 0,
              aciklama:
                  'Önüne # konan alan gerçek anlamda özeldir; dışarıdan okunamaz.',
            ),
            Yaz(
              soru:
                  'Yöntemi nesne üretmeden sınıf adıyla çağırmayı sağlayan anahtar sözcüğü yaz.',
              cevaplar: ['static'],
              aciklama:
                  'static yöntemler sınıfın kendisine aittir, örneklere değil.',
            ),
            Sirala(
              soru: 'Getter tanımını sırala.',
              kelimeler: [
                '}',
                'this.adet',
                'get',
                'return',
                '{',
                '*',
                'toplam()',
                'this.fiyat;',
              ],
              dogru: [
                'get',
                'toplam()',
                '{',
                'return',
                'this.adet',
                '*',
                'this.fiyat;',
                '}',
              ],
              aciklama:
                  'get ile tanımlanan özellik parantezsiz okunur: nesne.toplam.',
            ),
            Eslestir(
              soru: 'Terimi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'prototype', sag: 'ortak yöntemlerin tutulduğu nesne'),
                (sol: 'extends', sag: 'alt sınıf oluşturur'),
                (sol: 'super', sag: 'üst sınıfa erişir'),
                (sol: 'static', sag: 'sınıfın kendisine aittir'),
                (sol: 'get', sag: 'özellik okunurken çalışır'),
              ],
              aciklama:
                  'Sınıflar, prototip tabanlı mirasın daha okunaklı bir yazımıdır.',
            ),
            Isaretle(
              soru: 'Özel alanı belirten yazımı işaretle.',
              cumle:
                  'Özel alan #gizli adıyla yazılır ve sınıf dışından okunamaz.',
              dogru: [2],
              aciklama:
                  '# ile başlayan ad, yalnızca sınıf gövdesinde kullanılabilir.',
            ),
            Tablo(
              soru: 'Sözcüğün görevini tamamla.',
              baslik: ['Sözcük', 'Görevi'],
              satirlar: [
                ['constructor', 'nesne oluşturulurken çalışır'],
                ['extends', 'başka sınıftan miras alır'],
                ['super', 'üst sınıfı çağırır'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: [
                'nesne oluşturulurken çalışır',
                'başka sınıftan miras alır',
                'üst sınıfı çağırır',
                'dosya içe aktarır',
              ],
              aciklama:
                  'constructor örnek kurar, extends miras verir, super üst sınıfa uzanır.',
            ),
            Kod(
              soru: 'Setter üzerinden fiyatı atayan satırı tamamla.',
              kod:
                  'class Urun {\n  #fiyat = 10;\n  get fiyat() { return this.#fiyat; }\n  set fiyat(v) { this.#fiyat = v; }\n}\nconst u = new Urun();\nu.___ = 25;',
              secenekler: ['fiyat', '#fiyat', 'set fiyat'],
              dogru: 0,
              dil: 'js',
              aciklama:
                  'Dışarıdan u.fiyat yazılır; #fiyat sınıf dışında sözdizimi hatası olur.',
            ),
          ],
        ),
        Ders(
          id: 'js-3-u1-d2',
          ad: 'İteratör ve üreteç',
          alistirmalar: [
            Secim(
              soru:
                  'for...of döngüsü bir nesneyi dolaşırken hangi protokolü kullanır?',
              secenekler: [
                'Symbol.iterator',
                'Symbol.async',
                'Object.keys',
                'toString',
              ],
              dogru: 0,
              aciklama:
                  'Gezilebilir nesne, Symbol.iterator yöntemiyle bir iteratör verir.',
            ),
            Secim(
              soru: 'function* ile tanımlanan fonksiyona ne denir?',
              secenekler: ['Üreteç (generator)', 'Kapanış', 'Sınıf', 'Modül'],
              dogru: 0,
              aciklama: 'Üreteçler yield ile değerleri tek tek üretir.',
            ),
            Bosluk(
              soru:
                  'function* say() { ___ "a"; } üretecin değer vermesini sağlar.',
              secenekler: ['yield', 'return', 'await', 'emit'],
              dogru: 0,
              aciklama: 'yield değeri üretir ve üreteci durakladır.',
            ),
            Bosluk(
              soru:
                  'const it = say(); it.___(); üretecin sıradaki değerini ister.',
              secenekler: ['next', 'run', 'step', 'get'],
              dogru: 0,
              aciklama:
                  'next() { value, done } biçiminde bir sonuç nesnesi döndürür.',
            ),
            Yaz(
              soru:
                  'next() sonucunda akışın bitip bitmediğini söyleyen özelliğin adını yaz.',
              cevaplar: ['done'],
              aciklama:
                  'done true olunca üretecin üretecek değeri kalmamıştır.',
            ),
            Sirala(
              soru: 'Üreteç tanımını sırala.',
              kelimeler: ['}', 'yield', 'sayac()', 'function*', '{', '1;'],
              dogru: ['function*', 'sayac()', '{', 'yield', '1;', '}'],
              aciklama: 'function* anahtarı üreteç tanımının başında durur.',
            ),
            Eslestir(
              soru: 'Terimi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'yield', sag: 'değer üretip durakla'),
                (sol: 'next()', sag: 'sıradaki değeri ister'),
                (sol: 'done', sag: 'akış bitti mi'),
                (sol: 'value', sag: 'üretilen değer'),
              ],
              aciklama:
                  'next() her çağrıda value ve done içeren bir nesne verir.',
            ),
            Isaretle(
              soru: 'Üretecin gövdesini adım adım ilerleten yöntemi işaretle.',
              cumle: 'Üreteç gövdesi next yöntemiyle adım adım ilerler.',
              dogru: [2],
              aciklama:
                  'Gövde, her next() çağrısında bir sonraki yield e kadar çalışır.',
            ),
            Tablo(
              soru:
                  'function* g() { yield 7; yield 8; } üretecinin çağrı sonuçlarını tamamla.',
              baslik: ['Çağrı', 'Sonuç'],
              satirlar: [
                ['const it = g(); it.next().value', '7'],
                ['it.next().value (ikinci çağrı)', '8'],
                ['it.next().done (üçüncü çağrı)', 'true'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: ['7', '8', 'true', 'false'],
              aciklama:
                  'İlk iki çağrı 7 ve 8 verir; üçüncüde üreteç biter ve done true olur.',
            ),
            Kod(
              soru: 'Üretecin ürettiği ürünleri dolaşan döngüyü tamamla.',
              kod:
                  'function* stok() {\n  yield "süt";\n  yield "ekmek";\n}\nfor (const u of ___) {\n  console.log(u);\n}',
              secenekler: ['stok()', 'stok', 'new stok'],
              dogru: 0,
              dil: 'js',
              aciklama:
                  'Üreteç önce çağrılıp iteratör alınır; for...of onu dolaşır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'js-3-u2',
      ad: 'Olay döngüsü ve veri yapıları',
      dersler: [
        Ders(
          id: 'js-3-u2-d1',
          ad: 'Olay döngüsü',
          alistirmalar: [
            Secim(
              soru:
                  'Çıktı sırası nedir?\nconsole.log("A");\nsetTimeout(() => console.log("B"), 0);\nconsole.log("C");',
              secenekler: ['A C B', 'A B C', 'B A C', 'C A B'],
              dogru: 0,
              aciklama:
                  'Senkron kod önce biter; setTimeout geri çağrısı macrotask olarak sonra çalışır.',
            ),
            Secim(
              soru:
                  'Çıktı sırası nedir?\nasync function f() { console.log("ilk"); await null; console.log("son"); }\nf();\nconsole.log("orta");',
              secenekler: [
                'ilk orta son',
                'ilk son orta',
                'orta ilk son',
                'son orta ilk',
              ],
              dogru: 0,
              aciklama:
                  'await sonrası kod microtask olur; senkron "orta" önce yazılır.',
            ),
            Bosluk(
              soru: 'Çağrı yığını boşalınca önce ___ kuyruğu boşaltılır.',
              secenekler: ['microtask', 'macrotask', 'animasyon', 'heap'],
              dogru: 0,
              aciklama:
                  'Microtask kuyruğu, bir sonraki macrotask çalışmadan önce tamamen işlenir.',
            ),
            Bosluk(
              soru:
                  '___(() => console.log("m")); işlevi microtask kuyruğuna ekler.',
              secenekler: [
                'queueMicrotask',
                'setTimeout',
                'setInterval',
                'requestAnimationFrame',
              ],
              dogru: 0,
              aciklama:
                  'queueMicrotask geri çağrıyı doğrudan microtask kuyruğuna koyar.',
            ),
            Yaz(
              soru:
                  'Promise geri çağrılarını tutan kuyruğun İngilizce adını yaz (…queue).',
              cevaplar: ['microtask', 'microtask queue', 'microtask kuyruğu'],
              aciklama:
                  'then ve await sonrası kodlar microtask kuyruğundan çalışır.',
            ),
            Sirala(
              soru:
                  'Çıktı sırasını diz:\nconsole.log("A");\nPromise.resolve().then(() => console.log("B"));\nsetTimeout(() => console.log("C"), 0);',
              kelimeler: ['C', 'A', 'B'],
              dogru: ['A', 'B', 'C'],
              aciklama:
                  'Önce senkron A, sonra microtask B, en son macrotask C yazılır.',
            ),
            Eslestir(
              soru: 'Kavramı görevi ile eşleştir.',
              ciftler: [
                (sol: 'çağrı yığını', sag: 'çalışan kodun sırası'),
                (
                  sol: 'microtask kuyruğu',
                  sag: 'Promise then ve queueMicrotask',
                ),
                (sol: 'macrotask kuyruğu', sag: 'setTimeout ve olaylar'),
                (sol: 'olay döngüsü', sag: 'kuyrukları yığına sırayla taşır'),
              ],
              aciklama:
                  'Olay döngüsü yığın boşken önce microtask, sonra sıradaki macrotask i çalıştırır.',
            ),
            Isaretle(
              soru: 'Önce çalışan yapıyı işaretle.',
              cumle: 'Önce then geri çağrısı çalışır, sonra setTimeout.',
              dogru: [1],
              aciklama:
                  'Promise then geri çağrısı microtask olduğu için setTimeout tan önce çalışır.',
            ),
            Tablo(
              soru: 'Yapıların hangi kuyruğa girdiğini tamamla.',
              baslik: ['Yapı', 'Kuyruk'],
              satirlar: [
                ['Promise.then', 'microtask'],
                ['setTimeout', 'macrotask'],
                ['queueMicrotask', 'microtask'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: ['microtask', 'macrotask', 'yığın'],
              aciklama:
                  'then ve queueMicrotask microtask; setTimeout macrotask kuyruğuna girer.',
            ),
            Kod(
              soru: 'Çıktı başla, önce, sonra olsun: boşluğu doldur.',
              kod:
                  'console.log("başla");\nsetTimeout(() => console.log("sonra"), 0);\n___.resolve().then(() => console.log("önce"));',
              secenekler: ['Promise', 'Event', 'Timeout'],
              dogru: 0,
              dil: 'js',
              aciklama:
                  'Promise.resolve().then microtask olduğundan setTimeout tan önce çalışır.',
            ),
          ],
        ),
        Ders(
          id: 'js-3-u2-d2',
          ad: 'Map, Set, WeakMap ve Symbol',
          alistirmalar: [
            Secim(
              soru:
                  'Yinelenen değerleri otomatik eleyen koleksiyon hangisidir?',
              secenekler: ['Set', 'Map', 'WeakMap', 'Array'],
              dogru: 0,
              aciklama: 'Set her değeri yalnızca bir kez tutar.',
            ),
            Secim(
              soru: 'new Set([4, 4, 5, 5, 6]).size kaçtır?',
              secenekler: ['3', '5', '1', '0'],
              dogru: 0,
              aciklama: 'Benzersiz değerler 4, 5 ve 6 olduğundan boyut 3 tür.',
            ),
            Bosluk(
              soru:
                  'const m = new Map(); m.___("barkod", 8690); anahtar-değer ekler.',
              secenekler: ['set', 'put', 'add', 'push'],
              dogru: 0,
              aciklama:
                  'Map e çift eklemek için set(anahtar, değer) kullanılır.',
            ),
            Bosluk(
              soru: 'WeakMap anahtarları ___ olmak zorundadır.',
              secenekler: ['nesne', 'sayı', 'metin', 'boolean'],
              dogru: 0,
              aciklama:
                  'WeakMap yalnızca nesne anahtar kabul eder ve onları zayıf tutar.',
            ),
            Yaz(
              soru: 'Benzersiz değer üreten ilkel türün adını yaz.',
              cevaplar: ['Symbol', 'symbol'],
              aciklama: 'Symbol() her çağrıda eşsiz bir değer üretir.',
            ),
            Sirala(
              soru: 'Set oluşturan satırı sırala.',
              kelimeler: ['"b"]);', 'new', 'const', 'kume', 'Set(["a",', '='],
              dogru: ['const', 'kume', '=', 'new', 'Set(["a",', '"b"]);'],
              aciklama: 'Set, new ile ve gezilebilir bir değerle kurulur.',
            ),
            Eslestir(
              soru: 'Yapıyı özelliğiyle eşleştir.',
              ciftler: [
                (sol: 'Map', sag: 'her türden anahtar-değer çifti'),
                (sol: 'Set', sag: 'benzersiz değerler'),
                (sol: 'WeakMap', sag: 'anahtarı zayıf tutulan nesneler'),
                (sol: 'Symbol', sag: 'benzersiz kimlik'),
              ],
              aciklama: 'Her yapı farklı bir veri saklama ihtiyacını karşılar.',
            ),
            Isaretle(
              soru: 'Her türden anahtar kabul eden yapıyı işaretle.',
              cumle:
                  'Map her türden anahtar alır, düz nesne yalnızca metin ve Symbol alır.',
              dogru: [0],
              aciklama:
                  'Düz nesne anahtarları metin veya Symbol olabilir; Map in kısıtı yoktur.',
            ),
            Tablo(
              soru: 'İfadelerin sonucunu tamamla.',
              baslik: ['İfade', 'Sonuç'],
              satirlar: [
                ['new Set([1, 1, 3]).has(3)', 'true'],
                ['new Map([["a", 5]]).get("a")', '5'],
                ['Symbol("x") === Symbol("x")', 'false'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: ['true', '5', 'false', 'undefined'],
              aciklama:
                  'Set 3 ü içerir; Map "a" için 5 verir; her Symbol eşsizdir.',
            ),
            Kod(
              soru: 'Aynı barkodu iki kez ekleyince bir kez sayan yapıyı seç.',
              kod:
                  'const okunan = new ___();\nokunan.add("8690001");\nokunan.add("8690001");\nconsole.log(okunan.size);',
              secenekler: ['Set', 'Map', 'Array'],
              dogru: 0,
              dil: 'js',
              aciklama: 'Set tekrarları eler; size 1 yazar.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'js-3-u3',
      ad: 'Proxy ve tasarım kalıpları',
      dersler: [
        Ders(
          id: 'js-3-u3-d1',
          ad: 'Proxy ve Reflect',
          alistirmalar: [
            Secim(
              soru: 'Proxy ne sağlar?',
              secenekler: [
                'Nesne işlemlerine (okuma, yazma) araya girip müdahale etmeyi',
                'Nesneyi silmeyi',
                'Dosya okumayı',
                'Ağ isteği atmayı',
              ],
              dogru: 0,
              aciklama:
                  'Proxy, bir nesne üzerindeki işlemleri tuzaklarla yakalar.',
            ),
            Secim(
              soru: 'Proxy içinde özellik okumayı yakalayan tuzak hangisidir?',
              secenekler: ['get', 'read', 'fetch', 'peek'],
              dogru: 0,
              aciklama: 'get tuzağı, özellik okunduğunda çalışır.',
            ),
            Bosluk(
              soru:
                  'new Proxy(hedef, { ___(h, o, d) { h[o] = d; return true; } }) yazmayı yakalar.',
              secenekler: ['set', 'put', 'write', 'assign'],
              dogru: 0,
              aciklama:
                  'set tuzağı hedef, özellik adı ve değeri alır; true döndürmelidir.',
            ),
            Bosluk(
              soru:
                  'Reflect.___(hedef, "ad") hedefteki özelliğin değerini okur.',
              secenekler: ['get', 'read', 'fetch', 'load'],
              dogru: 0,
              aciklama:
                  'Reflect, nesne işlemlerinin işlev biçimidir; Proxy ile uyumlu çalışır.',
            ),
            Yaz(
              soru:
                  'Nesne işlemlerini yakalamak için new ile kullanılan sınıfın adını yaz.',
              cevaplar: ['Proxy', 'proxy'],
              aciklama:
                  'new Proxy(hedef, işleyici) sarmalayıcı bir nesne üretir.',
            ),
            Sirala(
              soru: 'Proxy oluşturan satırı sırala.',
              kelimeler: [
                'islemci);',
                'new',
                'p',
                'const',
                'Proxy(hedef,',
                '=',
              ],
              dogru: ['const', 'p', '=', 'new', 'Proxy(hedef,', 'islemci);'],
              aciklama: 'Proxy hedef nesne ve işleyici nesneyle kurulur.',
            ),
            Eslestir(
              soru: 'Tuzağı yakaladığı işlemle eşleştir.',
              ciftler: [
                (sol: 'get', sag: 'özellik okunurken'),
                (sol: 'set', sag: 'özellik yazılırken'),
                (sol: 'has', sag: 'in operatörü kullanılırken'),
                (sol: 'deleteProperty', sag: 'delete işlemi yapılırken'),
              ],
              aciklama: 'Her tuzak belirli bir nesne işlemine karşılık gelir.',
            ),
            Isaretle(
              soru:
                  'Yazma sırasında doğrulama yapılabilen tuzağın adını işaretle.',
              cumle: 'set tuzağı yazmayı doğrular, get tuzağı okumayı yakalar.',
              dogru: [0],
              aciklama:
                  'set tuzağında geçersiz değer için hata fırlatılabilir.',
            ),
            Tablo(
              soru: 'Tuzakların yakaladığı işlemi tamamla.',
              baslik: ['Tuzak', 'Yakaladığı'],
              satirlar: [
                ['get', 'özellik okuma'],
                ['set', 'özellik yazma'],
                ['deleteProperty', 'özellik silme'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: [
                'özellik okuma',
                'özellik yazma',
                'özellik silme',
                'fonksiyon çağırma',
              ],
              aciklama:
                  'apply fonksiyon çağrısını yakalar; burada kullanılmadı.',
            ),
            Kod(
              soru: 'Olmayan ürün için 0 döndüren tuzağı tamamla.',
              kod:
                  'const stok = new Proxy({}, {\n  get: (h, o) => o in h ? h[o] : ___\n});\nconsole.log(stok.sut);',
              secenekler: ['0', '"yok"', 'h'],
              dogru: 0,
              dil: 'js',
              aciklama: 'Özellik yoksa 0 döner; çıktı 0 olur.',
            ),
          ],
        ),
        Ders(
          id: 'js-3-u3-d2',
          ad: 'Tasarım kalıpları',
          alistirmalar: [
            Secim(
              soru: 'Gözlemci (observer) kalıbı ne yapar?',
              secenekler: [
                'Bir olay olunca kayıtlı dinleyicilere haber verir',
                'Dosyaları sıkıştırır',
                'Değişkenleri siler',
                'Sayfayı yeniler',
              ],
              dogru: 0,
              aciklama: 'Yayıncı değişince tüm abonelerine bildirim gönderir.',
            ),
            Secim(
              soru: 'Modül kalıbının (IIFE ile) temel amacı nedir?',
              secenekler: [
                'Özel değişkenleri gizleyip yalnız seçilen kısmı dışa açmak',
                'Kodu hızlandırmak',
                'Hata yakalamak',
                'Tarayıcıyı kapatmak',
              ],
              dogru: 0,
              aciklama:
                  'Kapanış sayesinde iç durum gizlenir, yalnız döndürülen API görünür.',
            ),
            Bosluk(
              soru:
                  'const sayac = (function () { let n = 0; return { artir: () => ++n }; })___; fonksiyon hemen çağrılır.',
              secenekler: ['()', '[]', '{}', '.'],
              dogru: 0,
              aciklama:
                  'IIFE, fonksiyonu tanımlar tanımlamaz () ile çalıştırır.',
            ),
            Bosluk(
              soru:
                  'abone(f) { this.aboneler.___(f); } dinleyiciyi listeye ekler.',
              secenekler: ['push', 'pop', 'shift', 'join'],
              dogru: 0,
              aciklama: 'push dizinin sonuna yeni abone ekler.',
            ),
            Yaz(
              soru:
                  'Uygulamada yalnızca tek örnek bulunmasını sağlayan kalıbın İngilizce adını yaz.',
              cevaplar: ['singleton', 'Singleton'],
              aciklama:
                  'Singleton kalıbı, sınıfın tek bir paylaşılan örneğini sunar.',
            ),
            Sirala(
              soru: 'Abone olma satırını sırala.',
              kelimeler: ['=>', 'goster(mesaj));', 'yayin.abone(mesaj'],
              dogru: ['yayin.abone(mesaj', '=>', 'goster(mesaj));'],
              aciklama: 'abone, olay gelince çalışacak geri çağrıyı kaydeder.',
            ),
            Eslestir(
              soru: 'Kalıbı kullanımıyla eşleştir.',
              ciftler: [
                (sol: 'Modül', sag: 'özel durumu kapsüller'),
                (sol: 'Gözlemci', sag: 'olayı abonelere duyurur'),
                (sol: 'Singleton', sag: 'tek örnek paylaşılır'),
                (sol: 'Fabrika', sag: 'nesneyi bir fonksiyonla üretir'),
              ],
              aciklama:
                  'Kalıplar tekrar eden tasarım sorunlarına hazır çözümler sunar.',
            ),
            Isaretle(
              soru: 'Aboneleri tutan tarafı işaretle.',
              cumle: 'Yayıncı aboneleri tutar, olay olunca hepsini çağırır.',
              dogru: [0],
              aciklama:
                  'Yayıncı abone listesini saklar ve olayda hepsini çağırır.',
            ),
            Tablo(
              soru: 'Kalıp-kullanım tablosunu tamamla.',
              baslik: ['Kalıp', 'Kullanım'],
              satirlar: [
                ['Gözlemci', 'olaya abone olma'],
                ['Singleton', 'tek paylaşılan örnek'],
                ['Fabrika', 'nesne üreten fonksiyon'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: [
                'olaya abone olma',
                'tek paylaşılan örnek',
                'nesne üreten fonksiyon',
                'dosya yükleme',
              ],
              aciklama: 'Her kalıp belirli bir tasarım ihtiyacını karşılar.',
            ),
            Kod(
              soru: 'Tüm abonelere haber veren yöntemi seç.',
              kod:
                  'class Yayin {\n  #aboneler = [];\n  abone(f) { this.#aboneler.push(f); }\n  yayinla(v) { this.#aboneler.___(f => f(v)); }\n}',
              secenekler: ['forEach', 'push', 'sort'],
              dogru: 0,
              dil: 'js',
              aciklama: 'forEach her aboneyi sırayla çağırarak değeri iletir.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'js-3-u4',
      ad: 'Performans ve araçlar',
      dersler: [
        Ders(
          id: 'js-3-u4-d1',
          ad: 'debounce, throttle ve requestAnimationFrame',
          alistirmalar: [
            Secim(
              soru: 'debounce ne yapar?',
              secenekler: [
                'Çağrılar durduktan belirli süre sonra bir kez çalıştırır',
                'Her çağrıda hemen çalıştırır',
                'Fonksiyonu siler',
                'Çağrıyı iki katına çıkarır',
              ],
              dogru: 0,
              aciklama:
                  'Her yeni çağrı beklemeyi sıfırlar; sakin kalınca işlev çalışır.',
            ),
            Secim(
              soru: 'throttle ne sağlar?',
              secenekler: [
                'Fonksiyonun belirli aralıkta en çok bir kez çalışmasını',
                'Fonksiyonun hiç çalışmamasını',
                'Fonksiyonun her tuşta çalışmasını',
                'Hataların yutulmasını',
              ],
              dogru: 0,
              aciklama:
                  'Kaydırma gibi sık olaylarda çalışma sayısını sınırlar.',
            ),
            Bosluk(
              soru:
                  '___(kareCiz); çağrısı tarayıcının bir sonraki çiziminde kare çizdirir.',
              secenekler: [
                'requestAnimationFrame',
                'setTimeout',
                'setInterval',
                'queueMicrotask',
              ],
              dogru: 0,
              aciklama:
                  'requestAnimationFrame animasyonu ekran yenilemesiyle eşler.',
            ),
            Bosluk(
              soru:
                  'zaman = ___(() => f(), 300); bekleme sonrası işlevi çalıştırır.',
              secenekler: [
                'setTimeout',
                'setInterval',
                'clearTimeout',
                'queueMicrotask',
              ],
              dogru: 0,
              aciklama:
                  'debounce, önceki zamanlayıcıyı iptal edip yenisini setTimeout ile kurar.',
            ),
            Yaz(
              soru:
                  'Bekleyen setTimeout zamanlayıcısını iptal eden fonksiyonun adını yaz.',
              cevaplar: ['clearTimeout'],
              aciklama:
                  'clearTimeout, setTimeout ın döndürdüğü kimliği iptal eder.',
            ),
            Sirala(
              soru: 'Arama kutusuna debounce bağlayan satırı sırala.',
              kelimeler: [
                '300));',
                'input.addEventListener("input",',
                'debounce(ara,',
              ],
              dogru: [
                'input.addEventListener("input",',
                'debounce(ara,',
                '300));',
              ],
              aciklama: 'Dinleyici olarak debounce ile sarılmış işlev verilir.',
            ),
            Eslestir(
              soru: 'Teknik veya işlevi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'debounce', sag: 'yazma bitince tek çağrı'),
                (sol: 'throttle', sag: 'belirli aralıkla çağrı'),
                (
                  sol: 'requestAnimationFrame',
                  sag: 'ekran yenilemesiyle senkron çizim',
                ),
                (sol: 'clearTimeout', sag: 'bekleyen zamanlayıcıyı iptal'),
                (sol: 'cancelAnimationFrame', sag: 'bekleyen kareyi iptal'),
              ],
              aciklama: 'Bu araçlar gereksiz işi azaltıp arayüzü akıcı tutar.',
            ),
            Isaretle(
              soru: 'Her tuşta istek atmayı önleyen tekniği işaretle.',
              cumle:
                  'Arama kutusunda her tuşta istek atmamak için debounce kullanılır.',
              dogru: [7],
              aciklama:
                  'debounce, kullanıcı yazmayı bırakana kadar isteği erteler.',
            ),
            Tablo(
              soru: 'Durum-teknik tablosunu tamamla.',
              baslik: ['Durum', 'Teknik'],
              satirlar: [
                ['Arama kutusu yazımı', 'debounce'],
                ['Kaydırma olayı', 'throttle'],
                ['Animasyon kareleri', 'requestAnimationFrame'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: [
                'debounce',
                'throttle',
                'requestAnimationFrame',
                'setInterval',
              ],
              aciklama:
                  'Yazımda debounce, kaydırmada throttle, animasyonda requestAnimationFrame uygundur.',
            ),
            Kod(
              soru: 'debounce içindeki zamanlayıcıyı kuran çağrıyı seç.',
              kod:
                  'function debounce(f, ms) {\n  let zaman;\n  return (...args) => {\n    clearTimeout(zaman);\n    zaman = ___(() => f(...args), ms);\n  };\n}',
              secenekler: [
                'setTimeout',
                'setInterval',
                'requestAnimationFrame',
              ],
              dogru: 0,
              dil: 'js',
              aciklama:
                  'Her çağrıda eski zamanlayıcı iptal edilir, yenisi setTimeout ile kurulur.',
            ),
          ],
        ),
        Ders(
          id: 'js-3-u4-d2',
          ad: 'Test ve araçlar',
          alistirmalar: [
            Secim(
              soru: 'Jest tarzı testte değer denetimi hangisidir?',
              secenekler: [
                'expect(topla(3, 4)).toBe(7)',
                'test(topla(3, 4)).equals(7)',
                'topla(3, 4).expect(7)',
                'check topla(3, 4) is 7',
              ],
              dogru: 0,
              aciklama: 'expect değeri alır, toBe beklenen sonucu denetler.',
            ),
            Secim(
              soru: 'package.json dosyası ne için kullanılır?',
              secenekler: [
                'Proje bağımlılıklarını ve komutlarını tanımlamak',
                'Resim saklamak',
                'Tarayıcı geçmişi tutmak',
                'CSS yazmak',
              ],
              dogru: 0,
              aciklama:
                  'package.json paketleri, sürümleri ve npm komutlarını listeler.',
            ),
            Bosluk(
              soru: 'npm ___ lodash komutu lodash paketini projeye ekler.',
              secenekler: ['install', 'remove', 'publish', 'login'],
              dogru: 0,
              aciklama: 'npm install paketi indirir ve package.json a yazar.',
            ),
            Bosluk(
              soru:
                  'Jest ile bir testi ___("toplama", () => { }) biçiminde tanımlarız.',
              secenekler: ['test', 'run', 'check', 'verify'],
              dogru: 0,
              aciklama:
                  'test (veya it) adı ve işlevi alarak bir test tanımlar.',
            ),
            Yaz(
              soru:
                  'Birçok modülü tarayıcı için tek pakette birleştiren araç türünün İngilizce adını yaz (ör. webpack).',
              cevaplar: ['bundler', 'paketleyici'],
              aciklama:
                  'Bundler modülleri ve bağımlılıkları birleştirip optimize eder.',
            ),
            Sirala(
              soru: 'Jest i geliştirme bağımlılığı olarak kuran komutu sırala.',
              kelimeler: ['jest', 'npm', '--save-dev', 'install'],
              dogru: ['npm', 'install', '--save-dev', 'jest'],
              aciklama:
                  '--save-dev paketi yalnız geliştirme bağımlılığı olarak kaydeder.',
            ),
            Eslestir(
              soru: 'Aracı görevi ile eşleştir.',
              ciftler: [
                (sol: 'npm', sag: 'paket yöneticisi'),
                (sol: 'bundler', sag: 'modülleri birleştirir'),
                (sol: 'Jest', sag: 'test çalıştırma aracı'),
                (sol: 'package.json', sag: 'bağımlılık listesi'),
                (sol: 'ESLint', sag: 'kod kalitesini denetler'),
              ],
              aciklama: 'Modern JavaScript projeleri bu araçlarla yönetilir.',
            ),
            Isaretle(
              soru: 'Beklenen değeri denetleyen yöntemi işaretle.',
              cumle:
                  'expect ile değer verilir, toBe ile beklenen sonuç denetlenir.',
              dogru: [4],
              aciklama:
                  'toBe, expect e verilen değerin beklenene eşit olup olmadığına bakar.',
            ),
            Tablo(
              soru: 'Araç-görev tablosunu tamamla.',
              baslik: ['Araç', 'Görevi'],
              satirlar: [
                ['npm', 'paket yöneticisi'],
                ['Jest', 'birim test çalıştırıcı'],
                ['ESLint', 'kod denetleyici'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: [
                'paket yöneticisi',
                'birim test çalıştırıcı',
                'kod denetleyici',
                'görsel düzenleyici',
              ],
              aciklama:
                  'npm paket kurar, Jest test eder, ESLint kodu denetler.',
            ),
            Kod(
              soru: 'Beklenen değeri denetleyen eşleştiriciyi seç.',
              kod:
                  'function topla(a, b) { return a + b; }\ntest("toplama", () => {\n  expect(topla(3, 4)).___(7);\n});',
              secenekler: ['toBe', 'toRun', 'toSet'],
              dogru: 0,
              dil: 'js',
              aciklama: 'toBe(7), sonucun 7 olduğunu denetler; test geçer.',
            ),
          ],
        ),
      ],
    ),
  ],
);
