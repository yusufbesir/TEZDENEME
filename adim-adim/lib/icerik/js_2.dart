import '../model/icerik.dart';

/// JavaScript Orta Düzey
const Kurs js2 = Kurs(
  id: 'js-2',
  ad: 'JavaScript Orta Düzey',
  aciklama:
      'Dizi yöntemleri, nesneler, olaylar, Promise, fetch ve modüller: stok ve barkod örnekleriyle gerçek uygulamaya hazırlan.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'js-2-u1',
      ad: 'Dizi yöntemleri',
      dersler: [
        Ders(
          id: 'js-2-u1-d1',
          ad: 'map, filter ve reduce',
          alistirmalar: [
            Secim(
              soru:
                  'Her elemanı dönüştürüp sonucu yeni bir dizi olarak veren yöntem hangisidir?',
              secenekler: ['push', 'map', 'find', 'includes'],
              dogru: 1,
              aciklama:
                  'map, her elemana verilen fonksiyonu uygular ve sonuçlardan yeni dizi üretir.',
            ),
            Secim(
              soru: '[1, 2, 3].map(x => x * 2) ifadesinin sonucu nedir?',
              secenekler: ['[1, 2, 3]', '[2, 4, 6]', '[1, 4, 9]', '6'],
              dogru: 1,
              aciklama: 'Her eleman 2 ile çarpılır: [2, 4, 6].',
            ),
            Bosluk(
              soru:
                  'const pahali = fiyatlar.___(f => f > 100); yalnız 100 liradan pahalı olanları seçer.',
              secenekler: ['map', 'filter', 'reduce', 'sort'],
              dogru: 1,
              aciklama:
                  'filter, koşulu sağlayan elemanlardan yeni bir dizi oluşturur.',
            ),
            Bosluk(
              soru:
                  '[10, 20, 30].reduce((t, x) => t + x, ___) toplamı sıfırdan başlatır.',
              secenekler: ['0', '[]', 'null', '""'],
              dogru: 0,
              aciklama:
                  'Toplama başlangıç değeri 0 olur; reduce ikinci argümanıyla başlangıcı alır.',
            ),
            Yaz(
              soru:
                  'Koşulu sağlayan elemanları yeni diziye toplayan yöntemin adını yaz.',
              cevaplar: ['filter'],
              aciklama:
                  'filter koşula uyanları seçer, diğerlerini dışarıda bırakır.',
            ),
            Sirala(
              soru: 'Ürün adlarını çıkaran satırı sırala.',
              kelimeler: ['=', 'urunler.map(u => u.ad);', 'const', 'adlar'],
              dogru: ['const', 'adlar', '=', 'urunler.map(u => u.ad);'],
              aciklama:
                  'Önce const, sonra değişken adı, eşittir ve map çağrısı gelir.',
            ),
            Eslestir(
              soru: 'Yöntemi görevi ile eşleştir.',
              ciftler: [
                (sol: 'map', sag: 'her elemanı dönüştürür'),
                (sol: 'filter', sag: 'koşula uyanları seçer'),
                (sol: 'reduce', sag: 'diziyi tek değere indirir'),
                (sol: 'forEach', sag: 'yeni dizi üretmez'),
              ],
              aciklama:
                  'map ve filter yeni dizi verir, reduce tek değer verir, forEach bir şey döndürmez.',
            ),
            Isaretle(
              soru: 'Yeni dizi üreten iki yöntemi işaretle.',
              cumle: 'map ve filter yeni dizi üretir, forEach üretmez.',
              dogru: [0, 2],
              aciklama:
                  'map ve filter yeni dizi döndürür; forEach undefined verir.',
            ),
            Tablo(
              soru: 'İfade-sonuç tablosunu tamamla.',
              baslik: ['İfade', 'Sonuç'],
              satirlar: [
                ['[1, 2, 3].map(x => x + 1)', '[2, 3, 4]'],
                ['[1, 5, 8].filter(x => x > 4)', '[5, 8]'],
                ['[1, 2, 3].reduce((t, x) => t + x, 0)', '6'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 1, sutun: 1)],
              secenekler: ['[2, 3, 4]', '[5, 8]', '[1, 5]', '6'],
              aciklama:
                  'map her elemana 1 ekler; filter 4 den büyükleri tutar: [5, 8].',
            ),
            Kod(
              soru: 'Stok adetlerini toplayan yöntemi seç.',
              kod:
                  'const adetler = [2, 4, 6];\nconst toplam = adetler.___((t, x) => t + x, 0);\nconsole.log(toplam);',
              secenekler: ['reduce', 'map', 'filter'],
              dogru: 0,
              dil: 'js',
              aciklama:
                  'Birden çok değeri tek değerde birleştirmek için reduce kullanılır; sonuç 12 olur.',
            ),
          ],
        ),
        Ders(
          id: 'js-2-u1-d2',
          ad: 'find, some, every ve sort',
          alistirmalar: [
            Secim(
              soru:
                  'Koşulu sağlayan ilk elemanın kendisini döndüren yöntem hangisidir?',
              secenekler: ['filter', 'find', 'some', 'map'],
              dogru: 1,
              aciklama:
                  'find ilk eşleşen elemanı verir; bulamazsa undefined döner.',
            ),
            Secim(
              soru: '[10, 9, 1].sort() sonucu nedir?',
              secenekler: [
                '[1, 9, 10]',
                '[1, 10, 9]',
                '[10, 9, 1]',
                '[9, 10, 1]',
              ],
              dogru: 1,
              aciklama:
                  'Karşılaştırma verilmezse elemanlar metin gibi sıralanır: "1", "10", "9".',
            ),
            Bosluk(
              soru: 'adetler.___(a => a > 0) tüm adetler pozitifse true döner.',
              secenekler: ['some', 'every', 'find', 'filter'],
              dogru: 1,
              aciklama: 'every, tüm elemanlar koşulu sağlıyorsa true verir.',
            ),
            Bosluk(
              soru:
                  'sayilar.sort((a, b) => a ___ b) sayıları küçükten büyüğe dizer.',
              secenekler: ['-', '+', '>', '&&'],
              dogru: 0,
              aciklama:
                  'a - b negatifse a önce gelir; böylece artan sıralama olur.',
            ),
            Yaz(
              soru:
                  'Koşulu sağlayan en az bir eleman varsa true döndüren yöntemin adını yaz.',
              cevaplar: ['some'],
              aciklama: 'some, bir elemanın bile uyması durumunda true verir.',
            ),
            Sirala(
              soru: 'Stoku biten ilk ürünü bulan satırı sırala.',
              kelimeler: [
                '0);',
                'const',
                '=>',
                'ilk',
                'u.adet',
                '=',
                '===',
                'urunler.find(u',
              ],
              dogru: [
                'const',
                'ilk',
                '=',
                'urunler.find(u',
                '=>',
                'u.adet',
                '===',
                '0);',
              ],
              aciklama: 'find içindeki ok fonksiyonu koşulu ifade eder.',
            ),
            Eslestir(
              soru: 'Yöntemi görevi ile eşleştir.',
              ciftler: [
                (sol: 'find', sag: 'ilk eşleşen elemanı verir'),
                (sol: 'findIndex', sag: 'ilk eşleşenin indeksini verir'),
                (sol: 'some', sag: 'en az biri uyuyor mu'),
                (sol: 'every', sag: 'hepsi uyuyor mu'),
                (sol: 'includes', sag: 'değer dizide var mı'),
              ],
              aciklama:
                  'Her yöntem farklı bir arama veya denetim sorusuna cevap verir.',
            ),
            Isaretle(
              soru: 'find yöntemi bulamazsa dönen değeri işaretle.',
              cumle: 'find bulamazsa undefined döndürür, filter ise boş dizi.',
              dogru: [2],
              aciklama:
                  'find eşleşme yoksa undefined, filter ise boş dizi döndürür.',
            ),
            Tablo(
              soru: 'Her ifadenin sonucunu tamamla.',
              baslik: ['İfade', 'Sonuç'],
              satirlar: [
                ['[4, 7, 9].find(x => x > 5)', '7'],
                ['[4, 7, 9].some(x => x > 10)', 'false'],
                ['[4, 7, 9].every(x => x > 3)', 'true'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: ['7', 'false', 'true', '9'],
              aciklama:
                  '5 ten büyük ilk sayı 7; hiçbiri 10 dan büyük değil; hepsi 3 ten büyük.',
            ),
            Kod(
              soru: 'Stoku sıfır olan ilk ürünü bulan yöntemi seç.',
              kod:
                  'const urunler = [{ ad: "süt", adet: 0 }, { ad: "ekmek", adet: 4 }];\nconst biten = urunler.___(u => u.adet === 0);\nconsole.log(biten.ad);',
              secenekler: ['find', 'map', 'sort'],
              dogru: 0,
              dil: 'js',
              aciklama: 'find eşleşen ürün nesnesini verir; çıktı "süt" olur.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'js-2-u2',
      ad: 'Nesne ve fonksiyon',
      dersler: [
        Ders(
          id: 'js-2-u2-d1',
          ad: 'Nesne, yıkma, spread ve rest',
          alistirmalar: [
            Secim(
              soru:
                  'const u = { ad: "süt", fiyat: 30 }; sonrasında u.fiyat ifadesi neyi verir?',
              secenekler: ['30', '"fiyat"', 'undefined', '{ ad: "süt" }'],
              dogru: 0,
              aciklama: 'Nokta gösterimi özelliğin değerini okur.',
            ),
            Secim(
              soru: 'function topla(...sayilar) içindeki ...sayilar nedir?',
              secenekler: [
                'rest parametresi',
                'spread operatörü',
                'varsayılan değer',
                'yıkma ataması',
              ],
              dogru: 0,
              aciklama:
                  'Parametre listesindeki ... kalan argümanları bir dizide toplar (rest).',
            ),
            Bosluk(
              soru:
                  'const { ad, ___ } = urun; urun nesnesinden fiyat özelliğini de alır.',
              secenekler: ['fiyat', '"fiyat"', 'urun.fiyat', '[fiyat]'],
              dogru: 0,
              aciklama:
                  'Nesne yıkmada süslü parantez içine özellik adı olduğu gibi yazılır.',
            ),
            Bosluk(
              soru:
                  'const kopya = { ___urun, adet: 5 }; urun özelliklerini yeni nesneye yayar.',
              secenekler: ['...', '..', '::', '**'],
              dogru: 0,
              aciklama: 'Yayma (spread) operatörü üç noktadır.',
            ),
            Yaz(
              soru: 'Nesnede olmayan bir özelliğe erişince dönen değeri yaz.',
              cevaplar: ['undefined'],
              aciklama: 'Olmayan özellik hata vermez, undefined döndürür.',
            ),
            Sirala(
              soru: 'Nesne yıkma satırını sırala.',
              kelimeler: ['urun;', '}', '=', 'const', '{', 'ad'],
              dogru: ['const', '{', 'ad', '}', '=', 'urun;'],
              aciklama:
                  'const, süslü parantez içinde ad, eşittir ve kaynak nesne.',
            ),
            Eslestir(
              soru: 'İfadeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'Object.keys', sag: 'özellik adlarını verir'),
                (sol: 'Object.values', sag: 'özellik değerlerini verir'),
                (sol: 'Object.entries', sag: '[ad, değer] çiftlerini verir'),
                (sol: 'urun?.ad', sag: 'urun yoksa undefined verir'),
              ],
              aciklama:
                  '?. isteğe bağlı zincirleme, null veya undefined üzerinde hata vermez.',
            ),
            Isaretle(
              soru: 'Nesnenin yüzeysel kopyasını oluşturan ifadeyi işaretle.',
              cumle:
                  '...urun nesneyi yüzeysel kopyalar, iç nesneleri kopyalamaz.',
              dogru: [0],
              aciklama:
                  'Spread yalnızca üst düzey özellikleri kopyalar; iç nesneler paylaşılır.',
            ),
            Tablo(
              soru: 'Yıkma ifadelerinin sonucunu tamamla.',
              baslik: ['İfade', 'Sonuç'],
              satirlar: [
                ['const { ad } = { ad: "süt" }; ad', '"süt"'],
                ['const [x, y] = [5, 8]; y', '8'],
                ['const { a = 1 } = {}; a', '1'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: ['"süt"', '8', '1', 'undefined'],
              aciklama:
                  'Dizi yıkmada sıra, nesne yıkmada ad önemlidir; eksik özellikte varsayılan değer kullanılır.',
            ),
            Kod(
              soru: 'Nesneyi yıkarak ad ve fiyatı al.',
              kod:
                  'const urun = { ad: "süt", fiyat: 30 };\nconst { ad, fiyat } = ___;\nconsole.log(ad, fiyat);',
              secenekler: ['urun', 'ad', '{ urun }'],
              dogru: 0,
              dil: 'js',
              aciklama:
                  'Yıkma, sağ taraftaki kaynak nesneden özellikleri alır.',
            ),
          ],
        ),
        Ders(
          id: 'js-2-u2-d2',
          ad: 'Ok fonksiyonu, kapanış ve callback',
          alistirmalar: [
            Secim(
              soru: 'const topla = (a, b) => a + b; ifadesi nedir?',
              secenekler: ['ok fonksiyonu', 'sınıf', 'nesne', 'döngü'],
              dogru: 0,
              aciklama: '=> sözdizimi ok fonksiyonunu tanımlar.',
            ),
            Secim(
              soru: 'Kapanış (closure) nedir?',
              secenekler: [
                'Fonksiyonun tanımlandığı kapsamdaki değişkenlere erişmeye devam etmesi',
                'Fonksiyonun hata fırlatması',
                'Dosyanın kapatılması',
                'Dizinin sona ermesi',
              ],
              dogru: 0,
              aciklama:
                  'Kapanış, iç fonksiyonun dış kapsamdaki değişkenleri hatırlamasıdır.',
            ),
            Bosluk(
              soru:
                  'islem(4, ___) çağrısında callback, sayıyı üçle çarpmalıdır.',
              secenekler: [
                'x => x * 3',
                'x * 3',
                '(x) { x * 3 }',
                'x -> x * 3',
              ],
              dogru: 0,
              aciklama:
                  'Callback bir fonksiyondur; ok fonksiyonu x => x * 3 biçiminde yazılır.',
            ),
            Bosluk(
              soru:
                  'function etiket(ad, adet ___ 1) { } adet verilmezse 1 olsun.',
              secenekler: ['=', '==', '=>', ':'],
              dogru: 0,
              aciklama:
                  'Varsayılan parametre değeri parametre adından sonra = ile verilir.',
            ),
            Yaz(
              soru:
                  'Bir yöntem içinde nesnenin kendisine işaret eden anahtar sözcüğü yaz.',
              cevaplar: ['this'],
              aciklama: 'this, yöntemin çağrıldığı nesneyi gösterir.',
            ),
            Sirala(
              soru: 'Ok fonksiyonu tanımını sırala.',
              kelimeler: [
                'b;',
                '=>',
                'const',
                'topla',
                '(a,',
                '=',
                'a',
                '+',
                'b)',
              ],
              dogru: ['const', 'topla', '=', '(a,', 'b)', '=>', 'a', '+', 'b;'],
              aciklama: 'Önce ad ve parametreler, sonra ok ve gövde gelir.',
            ),
            Eslestir(
              soru: 'Kavramı açıklamasıyla eşleştir.',
              ciftler: [
                (sol: 'ok fonksiyonu', sag: 'kendi this değeri yoktur'),
                (
                  sol: 'callback',
                  sag: 'başka fonksiyona argüman olarak verilir',
                ),
                (sol: 'kapanış', sag: 'dış değişkeni hatırlayan fonksiyon'),
                (
                  sol: 'rest parametresi',
                  sag: 'kalan argümanları dizide toplar',
                ),
              ],
              aciklama:
                  'Bu dört kavram fonksiyonları esnek kullanmanın temelidir.',
            ),
            Isaretle(
              soru:
                  'Ok fonksiyonunda kendi değeri olmayan anahtar sözcüğü işaretle.',
              cumle:
                  'Ok fonksiyonu kendi this değerini oluşturmaz, çevresindekini kullanır.',
              dogru: [3],
              aciklama:
                  'Ok fonksiyonu this değerini çevreleyen kapsamdan alır.',
            ),
            Tablo(
              soru: 'Çağrıların sonuçlarını tamamla.',
              baslik: ['İfade', 'Sonuç'],
              satirlar: [
                ['const f = x => x * 3; f(5)', '15'],
                ['const g = (a, b = 10) => a + b; g(1)', '11'],
                ['((...r) => r.length)(7, 8, 9)', '3'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: ['15', '11', '3', '10'],
              aciklama:
                  'f(5) 15 verir; g(1) varsayılan b ile 11 olur; rest üç argüman toplar.',
            ),
            Kod(
              soru: 'Her çağrıda artan bir sayaç kapanışı tamamla.',
              kod:
                  'function sayacYap() {\n  let n = 0;\n  return () => ___n;\n}\nconst s = sayacYap();\ns();\nconsole.log(s());',
              secenekler: ['++', 'n', '--'],
              dogru: 0,
              dil: 'js',
              aciklama:
                  '() => ++n her çağrıda n değerini artırıp yeni değeri döndürür; ikinci çağrıda 2 yazılır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'js-2-u3',
      ad: 'Olaylar ve asenkron kod',
      dersler: [
        Ders(
          id: 'js-2-u3-d1',
          ad: 'DOM olayları ve delegasyon',
          alistirmalar: [
            Secim(
              soru:
                  'Bir düğmeye tıklama dinleyicisi eklemek için hangisi kullanılır?',
              secenekler: [
                'btn.addEventListener("click", islev)',
                'btn.onclickAdd(islev)',
                'btn.listen(islev)',
                'btn.click = islev()',
              ],
              dogru: 0,
              aciklama:
                  'addEventListener olay adını ve işlevi alır, işlevi çağırmaz.',
            ),
            Secim(
              soru: 'Olay yayılımında (bubbling) olay hangi yönde ilerler?',
              secenekler: [
                'Hedef elemandan üst atalara doğru',
                'Üst elemandan yalnız hedefe doğru',
                'Yalnızca kardeş elemanlara',
                'Hiçbir yöne',
              ],
              dogru: 0,
              aciklama:
                  'Olay, hedeften başlayıp ata elemanlara doğru yükselir.',
            ),
            Bosluk(
              soru:
                  'form.addEventListener("submit", e => { e.___(); }); sayfanın yeniden yüklenmesini engeller.',
              secenekler: [
                'preventDefault',
                'stopPropagation',
                'stop',
                'cancel',
              ],
              dogru: 0,
              aciklama:
                  'preventDefault, olayın varsayılan davranışını durdurur.',
            ),
            Bosluk(
              soru:
                  'Olayın üst atalara yayılmasını durdurmak için e.___() çağrılır.',
              secenekler: [
                'stopPropagation',
                'preventDefault',
                'stopDefault',
                'removeEvent',
              ],
              dogru: 0,
              aciklama: 'stopPropagation olayın yayılımını keser.',
            ),
            Yaz(
              soru:
                  'Olayı başlatan elemana işaret eden e. özelliğinin adını yaz.',
              cevaplar: ['target'],
              aciklama: 'e.target, olayın gerçekte tetiklendiği elemandır.',
            ),
            Sirala(
              soru: 'Dinleyici eklemeyi sırala.',
              kelimeler: [
                '});',
                'btn.addEventListener("click",',
                'sayac++;',
                '() => {',
              ],
              dogru: [
                'btn.addEventListener("click",',
                '() => {',
                'sayac++;',
                '});',
              ],
              aciklama:
                  'Önce olay adı, sonra işlev gövdesi, en son kapanış gelir.',
            ),
            Eslestir(
              soru: 'Terimi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'click', sag: 'tıklanınca tetiklenir'),
                (sol: 'submit', sag: 'form gönderilince tetiklenir'),
                (sol: 'yayılım', sag: 'olayın üst atalara çıkması'),
                (sol: 'delegasyon', sag: 'ortak atadaki tek dinleyici'),
                (sol: 'preventDefault', sag: 'varsayılan davranışı engeller'),
              ],
              aciklama:
                  'Delegasyon, yayılımdan yararlanarak çok elemanı tek dinleyiciyle yönetir.',
            ),
            Isaretle(
              soru:
                  'Delegasyonda dinleyicinin eklendiği yeri anlatan iki kelimeyi işaretle.',
              cumle: 'Delegasyonda dinleyici ortak ata elemana eklenir.',
              dogru: [2, 3],
              aciklama:
                  'Dinleyici ortak atada durur; hedefi e.target ile ayırt ederiz.',
            ),
            Tablo(
              soru: 'Olay-zaman tablosunu tamamla.',
              baslik: ['Olay', 'Ne zaman'],
              satirlar: [
                ['click', 'tıklanınca'],
                ['submit', 'form gönderilince'],
                ['keydown', 'tuşa basılınca'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: [
                'tıklanınca',
                'form gönderilince',
                'tuşa basılınca',
                'sayfa kapanınca',
              ],
              aciklama: 'Her olay adı bir kullanıcı eylemine karşılık gelir.',
            ),
            Kod(
              soru: 'Düğmeye dinleyici ekleyen yöntemi seç.',
              kod:
                  'const btn = document.querySelector("#ekle");\nbtn.___("click", () => {\n  stok++;\n});',
              secenekler: ['addEventListener', 'appendChild', 'querySelector'],
              dogru: 0,
              dil: 'js',
              aciklama:
                  'Olay dinlemek için addEventListener kullanılır; appendChild eleman ekler.',
            ),
          ],
        ),
        Ders(
          id: 'js-2-u3-d2',
          ad: 'Promise ve async/await',
          alistirmalar: [
            Secim(
              soru: 'Promise hangi durumlardan birinde olabilir?',
              secenekler: [
                'pending, fulfilled, rejected',
                'open, closed, locked',
                'start, run, end',
                'true, false, null',
              ],
              dogru: 0,
              aciklama:
                  'Bekliyor (pending), tamamlandı (fulfilled) veya reddedildi (rejected).',
            ),
            Secim(
              soru: 'async olarak tanımlanan bir fonksiyon ne döndürür?',
              secenekler: [
                'Her zaman bir Promise',
                'Doğrudan değeri',
                'undefined',
                'Bir dizi',
              ],
              dogru: 0,
              aciklama:
                  'async fonksiyonun dönüş değeri otomatik olarak Promise içine sarılır.',
            ),
            Bosluk(
              soru:
                  'async function yukle() { const veri = ___ getir(); } Promise bitene kadar bekler.',
              secenekler: ['await', 'async', 'yield', 'wait'],
              dogru: 0,
              aciklama: 'await, Promise sonuçlanana kadar işlevi bekletir.',
            ),
            Bosluk(
              soru:
                  'getir().___(v => goster(v)); Promise başarılı olunca çalışır.',
              secenekler: ['then', 'catch', 'finally', 'resolve'],
              dogru: 0,
              aciklama: 'then, başarılı sonucu alan geri çağrıyı bağlar.',
            ),
            Yaz(
              soru: 'Promise reddedilince çalışan yöntemin adını yaz (.___).',
              cevaplar: ['catch'],
              aciklama: 'catch, reddedilen Promise hatasını yakalar.',
            ),
            Sirala(
              soru: 'Bekleyerek veri alan satırı sırala.',
              kelimeler: ['getir();', 'await', '=', 'const', 'v'],
              dogru: ['const', 'v', '=', 'await', 'getir();'],
              aciklama:
                  'await ifadesi atamanın sağında, çağrının önünde durur.',
            ),
            Eslestir(
              soru: 'Terimi görevi ile eşleştir.',
              ciftler: [
                (sol: 'resolve', sag: 'Promise başarıyla tamamlanır'),
                (sol: 'reject', sag: 'Promise hata ile sonuçlanır'),
                (sol: 'Promise.all', sag: 'hepsi bitince tek sonuç verir'),
                (sol: 'then', sag: 'başarı sonrası çalışır'),
                (sol: 'await', sag: 'Promise bitene kadar bekler'),
              ],
              aciklama: 'Bu yapılar asenkron işlerin sonucunu yönetir.',
            ),
            Isaretle(
              soru:
                  'await ile birlikte kullanılması gereken fonksiyon türünü işaretle.',
              cumle: 'await ifadesi async fonksiyon içinde kullanılır.',
              dogru: [2],
              aciklama:
                  'await, async fonksiyonlarda (ve modül düzeyinde) kullanılır.',
            ),
            Tablo(
              soru: 'Promise durumlarının anlamını tamamla.',
              baslik: ['Durum', 'Anlamı'],
              satirlar: [
                ['pending', 'işlem sürüyor'],
                ['fulfilled', 'başarıyla bitti'],
                ['rejected', 'hata ile bitti'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: [
                'işlem sürüyor',
                'başarıyla bitti',
                'hata ile bitti',
                'iptal edildi',
              ],
              aciklama: 'Bir Promise bir kez sonuçlanınca durumu değişmez.',
            ),
            Kod(
              soru: 'Gecikmeyi bekleyen anahtar sözcüğü seç.',
              kod:
                  'const gecikme = ms => new Promise(coz => setTimeout(coz, ms));\nasync function calis() {\n  ___ gecikme(500);\n  console.log("bitti");\n}',
              secenekler: ['await', 'return', 'async'],
              dogru: 0,
              dil: 'js',
              aciklama:
                  'await gecikme Promise i bitene kadar bekler, sonra bitti yazılır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'js-2-u4',
      ad: 'Veri, hata ve modüller',
      dersler: [
        Ders(
          id: 'js-2-u4-d1',
          ad: 'fetch, JSON ve hata yönetimi',
          alistirmalar: [
            Secim(
              soru: 'JSON metnini nesneye çeviren yöntem hangisidir?',
              secenekler: [
                'JSON.parse(metin)',
                'JSON.stringify(metin)',
                'JSON.object(metin)',
                'Object.json(metin)',
              ],
              dogru: 0,
              aciklama: 'parse metni nesneye, stringify nesneyi metne çevirir.',
            ),
            Secim(
              soru: 'try ... catch ne işe yarar?',
              secenekler: [
                'Fırlatılan hatayı yakalayıp programın çökmesini önler',
                'Döngüyü hızlandırır',
                'Değişken tanımlar',
                'Dosya kaydeder',
              ],
              dogru: 0,
              aciklama: 'try bloğundaki hata catch bloğuna yönlendirilir.',
            ),
            Bosluk(
              soru:
                  'const veri = await yanit.___(); yanıt gövdesini JSON olarak okur.',
              secenekler: ['json', 'parse', 'stringify', 'get'],
              dogru: 0,
              aciklama:
                  'Response nesnesinin json() yöntemi gövdeyi nesneye çevirir.',
            ),
            Bosluk(
              soru:
                  'try { riskli(); } ___ (hata) { console.log(hata.message); }',
              secenekler: ['catch', 'except', 'error', 'else'],
              dogru: 0,
              aciklama: 'JavaScript te hata yakalama bloğu catch ile yazılır.',
            ),
            Yaz(
              soru: 'Nesneyi JSON metnine çeviren JSON yönteminin adını yaz.',
              cevaplar: ['stringify', 'JSON.stringify'],
              aciklama: 'JSON.stringify nesneyi metne dönüştürür.',
            ),
            Sirala(
              soru: 'Hata fırlatan satırı sırala.',
              kelimeler: ['yok");', 'new', 'throw', 'Error("stok'],
              dogru: ['throw', 'new', 'Error("stok', 'yok");'],
              aciklama: 'throw ifadesi bir Error nesnesi fırlatır.',
            ),
            Eslestir(
              soru: 'Yapıyı görevi ile eşleştir.',
              ciftler: [
                (sol: 'JSON.parse', sag: 'metni nesneye çevirir'),
                (sol: 'JSON.stringify', sag: 'nesneyi metne çevirir'),
                (sol: 'throw', sag: 'hata fırlatır'),
                (sol: 'finally', sag: 'hata olsa da olmasa da çalışır'),
                (sol: 'response.ok', sag: 'istek başarılı mı'),
              ],
              aciklama:
                  'Bu yapılar veri alışverişini ve hata yönetimini tamamlar.',
            ),
            Isaretle(
              soru: 'Başarıyı denetlemek için bakılacak özelliği işaretle.',
              cumle: 'fetch 404 için reddedilmez, response.ok denetlenmelidir.',
              dogru: [4],
              aciklama:
                  'fetch yalnızca ağ hatasında reddeder; HTTP hataları için response.ok bakılır.',
            ),
            Tablo(
              soru: 'JSON ifadelerinin sonucunu tamamla.',
              baslik: ['İfade', 'Sonuç'],
              satirlar: [
                ['JSON.stringify({ a: 1 })', '{"a":1}'],
                ['JSON.parse("[5,6]").length', '2'],
                ['typeof JSON.parse("true")', 'boolean'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: ['{"a":1}', '2', 'boolean', 'object'],
              aciklama:
                  'stringify metin üretir; "[5,6]" iki elemanlı dizi olur; "true" mantıksal değere çevrilir.',
            ),
            Kod(
              soru: 'Geçersiz JSON hatasını yakalayan bloğu seç.',
              kod:
                  'try {\n  const veri = JSON.parse("{ hatali");\n} ___ (e) {\n  console.log("geçersiz JSON");\n}',
              secenekler: ['catch', 'finally', 'else'],
              dogru: 0,
              dil: 'js',
              aciklama:
                  'JSON.parse hata fırlatır; catch bu hatayı yakalar ve mesaj yazılır.',
            ),
          ],
        ),
        Ders(
          id: 'js-2-u4-d2',
          ad: 'Modüller ve localStorage',
          alistirmalar: [
            Secim(
              soru:
                  'ES modülünde başka dosyadan değer almak için hangi sözcük kullanılır?',
              secenekler: ['import', 'require', 'include', 'use'],
              dogru: 0,
              aciklama: 'ES modüllerinde import ile içe aktarılır.',
            ),
            Secim(
              soru: 'localStorage ne tutar?',
              secenekler: [
                'Tarayıcıda kalıcı anahtar-değer metinlerini',
                'Sunucudaki veritabanını',
                'Yalnızca çerezleri',
                'Sadece sayfa açıkken kalan verileri',
              ],
              dogru: 0,
              aciklama:
                  'Veriler metin olarak saklanır ve sayfa kapansa da kalır.',
            ),
            Bosluk(
              soru:
                  'export ___ function topla(a, b) { return a + b; } modülün varsayılan dışa aktarımıdır.',
              secenekler: ['default', 'main', 'all', 'base'],
              dogru: 0,
              aciklama: 'export default, modülün ana değerini belirtir.',
            ),
            Bosluk(
              soru:
                  'localStorage.___("sepet", JSON.stringify(sepet)); sepeti kaydeder.',
              secenekler: ['setItem', 'addItem', 'save', 'put'],
              dogru: 0,
              aciklama: 'Yazma için setItem(anahtar, değer) kullanılır.',
            ),
            Yaz(
              soru: 'localStorage tan bir değeri okuyan yöntemin adını yaz.',
              cevaplar: ['getItem'],
              aciklama:
                  'getItem(anahtar) saklanan metni verir; yoksa null döner.',
            ),
            Sirala(
              soru: 'İçe aktarma satırını sırala.',
              kelimeler: ['"./hesap.js";', 'from', '{', 'import', '}', 'topla'],
              dogru: ['import', '{', 'topla', '}', 'from', '"./hesap.js";'],
              aciklama:
                  'import, adlar ve from ile dosya yolu sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Yapıyı görevi ile eşleştir.',
              ciftler: [
                (sol: 'import', sag: 'başka modülden alır'),
                (sol: 'export', sag: 'modülden dışarı açar'),
                (sol: 'setItem', sag: 'yerel depoya yazar'),
                (sol: 'getItem', sag: 'yerel depodan okur'),
                (sol: 'removeItem', sag: 'yerel depodan siler'),
              ],
              aciklama:
                  'Modüller kodu böler, localStorage veriyi kalıcı tutar.',
            ),
            Isaretle(
              soru:
                  'Script etiketinde modül olduğunu bildiren özniteliği işaretle.',
              cumle:
                  'Modül dosyası script etiketinde type="module" ile yüklenir.',
              dogru: [4],
              aciklama:
                  'type="module" ile tarayıcı dosyayı ES modülü olarak yükler.',
            ),
            Tablo(
              soru: 'localStorage çağrılarının sonucunu tamamla.',
              baslik: ['Çağrı', 'Sonuç'],
              satirlar: [
                ['localStorage.setItem("k", "5")', 'kaydeder'],
                ['localStorage.getItem("k")', '"5"'],
                ['localStorage.getItem("yok")', 'null'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: ['"5"', 'null', 'undefined', '5'],
              aciklama:
                  'Değerler metin saklanır; olmayan anahtar için null döner.',
            ),
            Kod(
              soru: 'Kayıtlı sepeti okuyan yöntemi seç.',
              kod: 'const sepet = JSON.parse(localStorage.___("sepet")) || [];',
              secenekler: ['getItem', 'setItem', 'clear'],
              dogru: 0,
              dil: 'js',
              aciklama:
                  'Okumak için getItem kullanılır; JSON.parse metni diziye çevirir.',
            ),
          ],
        ),
      ],
    ),
  ],
);
