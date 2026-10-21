import '../model/icerik.dart';

/// Python İleri Düzey
const Kurs python3 = Kurs(
  id: 'python-3',
  ad: 'Python İleri Düzey',
  aciklama:
      'Üreteçten dekoratöre, dataclass\'tan asyncio\'ya; günlük örneklerle Python\'un ileri özelliklerini öğren.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'python-3-u1',
      ad: 'Üreteç ve dekoratör',
      dersler: [
        Ders(
          id: 'python-3-u1-d1',
          ad: 'Yineleyici ve üreteç',
          alistirmalar: [
            Secim(
              soru:
                  'Bir listeden yineleyici (iterator) elde etmek için hangi yerleşik işlev kullanılır?',
              secenekler: [
                'iter(liste)',
                'next(liste)',
                'list(liste)',
                'range(liste)',
              ],
              dogru: 0,
              aciklama:
                  'iter() yinelenebilir bir nesneden yineleyici üretir; öğeleri next() ile alırsın.',
            ),
            Secim(
              soru:
                  'it = iter([10, 20])\nnext(it)\nprint(next(it))\nBu kodun çıktısı nedir?',
              secenekler: ['10', '20', '[10, 20]', 'StopIteration'],
              dogru: 1,
              aciklama:
                  'İlk next() 10\'u tüketir, ikinci next() 20\'yi verir ve print onu yazar.',
            ),
            Tablo(
              soru: 'Kavram-örnek tablosunu tamamla.',
              baslik: ['Kavram', 'Örnek'],
              satirlar: [
                ['yineleyici üretmek', 'iter(liste)'],
                ['sonraki öğeyi almak', 'next(it)'],
                ['üreteç ifadesi', '(x for x in liste)'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 1, sutun: 1)],
              secenekler: ['iter(liste)', 'next(it)', 'len(it)'],
              aciklama:
                  'iter() yineleyici üretir, next() sıradaki öğeyi verir.',
            ),
            Bosluk(
              soru:
                  'it = iter(["elma", "armut"])\n___(it) ifadesi "elma" değerini verir.',
              secenekler: ['next', 'iter', 'list', 'len'],
              dogru: 0,
              aciklama: 'next() yineleyiciden sıradaki öğeyi alır.',
            ),
            Bosluk(
              soru:
                  'def sayac():\n    for i in range(3):\n        ___ i\nÜreteç işlevi değer üretmek için hangi anahtar sözcüğü kullanır?',
              secenekler: ['yield', 'return', 'print', 'break'],
              dogru: 0,
              aciklama:
                  'yield değeri üretir ve işlevi o noktada duraklatır; return ise işlevi bitirir.',
            ),
            Yaz(
              soru:
                  'Yineleyicide öğe kalmadığında next() hangi hatayı yükseltir? (hata adını yaz)',
              cevaplar: ['StopIteration', 'stopiteration'],
              aciklama:
                  'Öğeler bitince next() StopIteration yükseltir; for döngüsü bunu sessizce yakalar.',
            ),
            Sirala(
              soru: 'Üreteç ifadesini doğru sırala.',
              kelimeler: ['for x in range(4))', '=', 'kareler', '(x * x'],
              dogru: ['kareler', '=', '(x * x', 'for x in range(4))'],
              aciklama:
                  'Üreteç ifadesi parantez içinde "ifade for değişken in kaynak" biçimindedir.',
            ),
            Eslestir(
              soru: 'Kavramı görevi ile eşleştir.',
              ciftler: [
                (sol: 'iter(x)', sag: 'yineleyici üretir'),
                (sol: 'next(it)', sag: 'sıradaki öğeyi verir'),
                (sol: 'yield', sag: 'üreteç işlevinde değer üretir'),
                (sol: '(x for x in a)', sag: 'üreteç ifadesi'),
              ],
              aciklama: 'Üreteçler değerleri tek tek, ihtiyaç oldukça üretir.',
            ),
            Isaretle(
              soru: 'Aşağıdaki işlevi üreteç yapan anahtar sözcüğü işaretle.',
              cumle: 'def sayac(): yield 5',
              dogru: [2],
              aciklama: 'İçinde yield bulunan işlev üreteç işlevidir.',
            ),
            Kod(
              soru: 'Üreteç işlevini tamamla; çıktı [0, 1, 2] olsun.',
              kod:
                  'def sayac():\n    for i in range(3):\n        ___ i\n\nprint(list(sayac()))',
              secenekler: ['yield', 'return', 'print'],
              dogru: 0,
              dil: 'python',
              aciklama:
                  'yield her turda değeri üretir; list() bunları toplayıp [0, 1, 2] verir.',
            ),
          ],
        ),
        Ders(
          id: 'python-3-u1-d2',
          ad: 'Dekoratör ve kapanış',
          alistirmalar: [
            Secim(
              soru:
                  'def carp(n):\n    def ic(x):\n        return x * n\n    return ic\n\nuc = carp(3)\nprint(uc(5))\nÇıktı nedir?',
              secenekler: ['8', '15', '35', '125'],
              dogru: 1,
              aciklama:
                  'ic işlevi dış işlevdeki n = 3 değerini hatırlar (kapanış); 5 * 3 = 15.',
            ),
            Secim(
              soru:
                  'def hesapla(): ... satırının üstündeki @dekor, hangi atamaya eşdeğerdir?',
              secenekler: [
                'hesapla = dekor(hesapla)',
                'dekor = hesapla(dekor)',
                'hesapla = hesapla(dekor)',
                'dekor(hesapla())',
              ],
              dogru: 0,
              aciklama:
                  '@dekor, işlevi dekor işlevine verip sonucu aynı ada atamakla aynıdır.',
            ),
            Tablo(
              soru: 'Öğe-görev tablosunu tamamla.',
              baslik: ['Öğe', 'Görevi'],
              satirlar: [
                ['@dekor', 'hesapla = dekor(hesapla)'],
                ['nonlocal', 'dış değişkeni iç işlevde değiştirir'],
                ['functools.wraps', 'sarmalanan işlevin adını korur'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: [
                'dış değişkeni iç işlevde değiştirir',
                'sarmalanan işlevin adını korur',
                'işlevi siler',
              ],
              aciklama:
                  'nonlocal dış kapsamdaki değişkeni değiştirir; wraps sarmalanan işlevin adını ve belgesini korur.',
            ),
            Bosluk(
              soru:
                  'def sayac():\n    sayi = 0\n    def artir():\n        ___ sayi\n        sayi += 1\n        return sayi\n    return artir\nİç işlev dış değişkeni değiştirebilsin.',
              secenekler: ['nonlocal', 'global', 'static', 'outer'],
              dogru: 0,
              aciklama:
                  'nonlocal, bir üst işlev kapsamındaki değişkeni değiştirmeni sağlar.',
            ),
            Bosluk(
              soru:
                  'def sar(f):\n    def ic(*args):\n        return f(___)\n    return ic\nSarmalayıcı aldığı argümanları f\'ye aktarsın.',
              secenekler: ['*args', 'args[', '{args}', '&args'],
              dogru: 0,
              aciklama:
                  '*args hem toplar hem açar; f(*args) argümanları olduğu gibi iletir.',
            ),
            Yaz(
              soru:
                  'Dekoratör uygularken işlev adının önüne hangi simge konur?',
              cevaplar: ['@', 'at'],
              aciklama: '@ simgesi dekoratör söz dizimidir: @dekor.',
            ),
            Sirala(
              soru: 'Dekoratör kullanımını doğru sırala.',
              kelimeler: ['pass', '@zamanla', 'def hesapla():'],
              dogru: ['@zamanla', 'def hesapla():', 'pass'],
              aciklama: 'Dekoratör, işlev tanımının hemen üstünde yer alır.',
            ),
            Eslestir(
              soru: 'Terimi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'kapanış', sag: 'dış değişkeni hatırlayan iç işlev'),
                (sol: '@', sag: 'dekoratör söz dizimi'),
                (sol: '*args', sag: 'konumsal argümanları toplar'),
                (sol: '**kwargs', sag: 'adlı argümanları toplar'),
              ],
              aciklama:
                  'Dekoratörler çoğunlukla kapanış ve *args/**kwargs ile yazılır.',
            ),
            Isaretle(
              soru:
                  'Aşağıdaki satırda dekoratör olarak uygulanan işlevi işaretle.',
              cumle: '@zamanla def rapor(): pass',
              dogru: [0],
              aciklama:
                  '@zamanla, rapor işlevine zamanla dekoratörünü uygular.',
            ),
            Kod(
              soru:
                  'Dekoratörün sarmalayıcıyı döndürmesini sağla (çağırmadan).',
              kod:
                  'def selam(f):\n    def ic():\n        print("başla")\n        f()\n    return ___',
              secenekler: ['ic', 'ic()', 'f'],
              dogru: 0,
              dil: 'python',
              aciklama:
                  'Dekoratör iç işlevin kendisini döndürür; ic() yazarsan hemen çalıştırmış olursun.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'python-3-u2',
      ad: 'Bağlam yöneticisi ve kalıtım',
      dersler: [
        Ders(
          id: 'python-3-u2-d1',
          ad: 'Bağlam yöneticisi',
          alistirmalar: [
            Secim(
              soru:
                  'with open("not.txt") as f: yapısının en büyük yararı nedir?',
              secenekler: [
                'Blok bitince dosya otomatik kapanır',
                'Dosya daha hızlı okunur',
                'Dosya şifrelenir',
                'Hata hiç oluşmaz',
              ],
              dogru: 0,
              aciklama:
                  'with, hata olsa bile çıkışta temizliği (dosyayı kapatmayı) garanti eder.',
            ),
            Secim(
              soru:
                  'with bloğuna girerken Python nesnenin hangi özel yöntemini çağırır?',
              secenekler: ['__enter__', '__init__', '__start__', '__open__'],
              dogru: 0,
              aciklama: 'Girişte __enter__, çıkışta __exit__ çağrılır.',
            ),
            Tablo(
              soru: 'Yöntem-zaman tablosunu tamamla.',
              baslik: ['Yöntem', 'Ne zaman çalışır'],
              satirlar: [
                ['__enter__', 'with bloğuna girerken'],
                ['__exit__', 'bloktan çıkarken'],
                ['__del__', 'nesne silinirken'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 1, sutun: 1)],
              secenekler: [
                'with bloğuna girerken',
                'bloktan çıkarken',
                'nesne silinirken',
              ],
              aciklama: '__enter__ girişte, __exit__ çıkışta çalışır.',
            ),
            Bosluk(
              soru: '___ open("rapor.txt") as f:\n    veri = f.read()',
              secenekler: ['with', 'using', 'try', 'as'],
              dogru: 0,
              aciklama: 'Bağlam yöneticisi with anahtar sözcüğüyle kullanılır.',
            ),
            Bosluk(
              soru:
                  'from contextlib import contextmanager\n\n___\ndef kilit():\n    yield\nİşlevi bağlam yöneticisine çeviren dekoratör hangisidir?',
              secenekler: [
                '@contextmanager',
                '@property',
                '@staticmethod',
                '@wraps',
              ],
              dogru: 0,
              aciklama:
                  '@contextmanager, yield içeren bir işlevi with ile kullanılabilir yapar.',
            ),
            Yaz(
              soru:
                  'with bloğundan çıkarken, hata olsa bile çalışan özel yöntemin adını yaz.',
              cevaplar: ['__exit__', 'exit'],
              aciklama:
                  '__exit__ blok bitince (hatalı ya da hatasız) çağrılır.',
            ),
            Sirala(
              soru: 'with satırını doğru sırala.',
              kelimeler: ['as', 'f:', 'with', 'open("a.txt")'],
              dogru: ['with', 'open("a.txt")', 'as', 'f:'],
              aciklama: 'Biçim: with ifade as ad:',
            ),
            Eslestir(
              soru: 'Öğeyi görevi ile eşleştir.',
              ciftler: [
                (sol: 'with', sag: 'bloğu yönetir'),
                (sol: '__enter__', sag: 'girişte çalışır'),
                (sol: '__exit__', sag: 'çıkışta çalışır'),
                (sol: 'contextlib.suppress', sag: 'belirli hatayı yutar'),
              ],
              aciklama:
                  'contextlib, bağlam yöneticileri için hazır araçlar sunar.',
            ),
            Isaretle(
              soru: 'Bağlam yöneticisini oluşturan ifadeyi işaretle.',
              cumle: 'with open("log.txt") as dosya:',
              dogru: [1],
              aciklama:
                  'open("log.txt") with bloğuna verilen bağlam yöneticisidir; dosya ise as ile verilen addır.',
            ),
            Kod(
              soru: 'Bağlam yöneticisinin gövdesinin çalışacağı yeri belirle.',
              kod:
                  'from contextlib import contextmanager\n\n@contextmanager\ndef kilit():\n    print("aç")\n    ___\n    print("kapat")',
              secenekler: ['yield', 'return', 'pass'],
              dogru: 0,
              dil: 'python',
              aciklama:
                  'yield noktasında with bloğunun gövdesi çalışır; öncesi giriş, sonrası çıkıştır.',
            ),
          ],
        ),
        Ders(
          id: 'python-3-u2-d2',
          ad: 'Kalıtım ve özel yöntemler',
          alistirmalar: [
            Secim(
              soru:
                  'class Kedi(Hayvan): içinde üst sınıfın kurucusunu çağırmanın doğru yolu hangisidir?',
              secenekler: [
                'super().__init__(ad)',
                'Kedi.__init__(ad)',
                'self.super(ad)',
                'parent(ad)',
              ],
              dogru: 0,
              aciklama:
                  'super() üst sınıfa erişir; super().__init__(...) onun kurucusunu çalıştırır.',
            ),
            Secim(
              soru: '__repr__ yöntemi ne işe yarar?',
              secenekler: [
                'Nesnenin metin gösterimini döndürür',
                'Nesneyi siler',
                'İki nesneyi toplar',
                'Nesnenin boyutunu verir',
              ],
              dogru: 0,
              aciklama:
                  '__repr__, nesnenin (özellikle hata ayıklarken görülen) metin gösterimini üretir.',
            ),
            Tablo(
              soru: 'İşlem-özel yöntem tablosunu tamamla.',
              baslik: ['İşlem', 'Özel yöntem'],
              satirlar: [
                ['a == b', '__eq__'],
                ['a < b', '__lt__'],
                ['a + b', '__add__'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 1, sutun: 1)],
              secenekler: ['__eq__', '__lt__', '__add__'],
              aciklama: '== için __eq__, < için __lt__ kullanılır.',
            ),
            Bosluk(
              soru:
                  'class Kedi(Hayvan):\n    def __init__(self, ad):\n        ___().__init__(ad)',
              secenekler: ['super', 'parent', 'self', 'base'],
              dogru: 0,
              aciklama: 'super() üst sınıfın yöntemlerine erişim sağlar.',
            ),
            Bosluk(
              soru:
                  'class Urun:\n    ___\n    def ad(self):\n        return self._ad\nYöntemi nitelik gibi okunabilir yapan dekoratör hangisidir?',
              secenekler: ['@property', '@classmethod', '@getter', '@cached'],
              dogru: 0,
              aciklama:
                  '@property yöntemi parantezsiz, nitelik gibi kullanmanı sağlar.',
            ),
            Yaz(
              soru:
                  'a < b karşılaştırması için çağrılan özel yöntemin adını yaz.',
              cevaplar: ['__lt__', 'lt'],
              aciklama: '__lt__ "less than" (küçüktür) anlamındadır.',
            ),
            Sirala(
              soru: '__repr__ tanımını doğru sırala.',
              kelimeler: ['return', '"Kedi"', 'def', '__repr__(self):'],
              dogru: ['def', '__repr__(self):', 'return', '"Kedi"'],
              aciklama:
                  'Önce def ve yöntem adı, sonra return ve döndürülen metin gelir.',
            ),
            Eslestir(
              soru: 'Özel yöntemi görevi ile eşleştir.',
              ciftler: [
                (sol: '__init__', sag: 'nesne kurulurken'),
                (sol: '__repr__', sag: 'metin gösterimi'),
                (sol: '__eq__', sag: '== karşılaştırması'),
                (sol: '__lt__', sag: '< karşılaştırması'),
              ],
              aciklama:
                  'Çift alt çizgili özel yöntemler Python\'un yerleşik davranışlarını özelleştirir.',
            ),
            Isaretle(
              soru: 'Cümlede üst (temel) sınıfın adını işaretle.',
              cumle: 'Kedi sınıfı Hayvan sınıfından miras alır',
              dogru: [2],
              aciklama: 'Miras alınan sınıf üst sınıftır; Kedi alt sınıftır.',
            ),
            Kod(
              soru:
                  'İki noktanın x değerlerini == ile karşılaştırabilmek için yöntemi tamamla.',
              kod:
                  'class Nokta:\n    def __init__(self, x):\n        self.x = x\n\n    def ___(self, diger):\n        return self.x == diger.x',
              secenekler: ['__eq__', '__lt__', '__init__'],
              dogru: 0,
              dil: 'python',
              aciklama: '== işleci __eq__ yöntemini çağırır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'python-3-u3',
      ad: 'Veri ve koleksiyonlar',
      dersler: [
        Ders(
          id: 'python-3-u3-d1',
          ad: 'Dataclass ve tür ipuçları',
          alistirmalar: [
            Secim(
              soru:
                  '@dataclass ile süslenen bir sınıfa Python otomatik olarak ne ekler?',
              secenekler: [
                '__init__ ve __repr__ yöntemleri',
                'Veritabanı bağlantısı',
                'Ağ erişimi',
                'Sabit bellek ayırma',
              ],
              dogru: 0,
              aciklama:
                  'dataclass, alanlara göre __init__, __repr__ ve __eq__ gibi yöntemleri üretir.',
            ),
            Secim(
              soru:
                  'def topla(a: int, b: int) -> int: işlevine str gönderirsen ne olur?',
              secenekler: [
                'Tür ipuçları çalışırken zorunlu denetlenmez',
                'Python hemen TypeError verir',
                'Değer otomatik int olur',
                'Program derlenmez',
              ],
              dogru: 0,
              aciklama:
                  'Tür ipuçları belgeleme ve araçlar içindir; çalışma zamanında Python onları zorlamaz.',
            ),
            Tablo(
              soru: 'Tür ipucu-anlam tablosunu tamamla.',
              baslik: ['Tür ipucu', 'Anlamı'],
              satirlar: [
                ['list[int]', 'tam sayı listesi'],
                ['Optional[str]', 'str ya da None'],
                ['dict[str, int]', 'metin anahtarlı, tam sayı değerli sözlük'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 1, sutun: 1)],
              secenekler: [
                'tam sayı listesi',
                'str ya da None',
                'metin listesi',
              ],
              aciklama:
                  'list[int] tam sayı listesi, Optional[str] ise str ya da None demektir.',
            ),
            Bosluk(
              soru:
                  'def bul(ad: str) -> ___[str]:\n    ...\nSonuç str ya da None olabilsin.',
              secenekler: ['Optional', 'Any', 'Final', 'Literal'],
              dogru: 0,
              aciklama: 'Optional[str], str | None ile aynı anlama gelir.',
            ),
            Bosluk(
              soru:
                  'notlar: ___[int] = [80, 90]\nTam sayı listesi için tür ipucunu tamamla.',
              secenekler: ['list', 'Array', 'Liste', 'arr'],
              dogru: 0,
              aciklama:
                  'Python 3.9 ve sonrasında list[int] doğrudan kullanılabilir.',
            ),
            Yaz(
              soru:
                  'Sınıfı otomatik __init__ ve __repr__ ile donatan dekoratörün adını yaz (@ olmadan).',
              cevaplar: ['dataclass', '@dataclass'],
              aciklama:
                  'dataclasses modülündeki @dataclass dekoratörü bu işi yapar.',
            ),
            Sirala(
              soru: 'Dataclass tanımını doğru sırala.',
              kelimeler: ['ad: str', 'class Urun:', '@dataclass'],
              dogru: ['@dataclass', 'class Urun:', 'ad: str'],
              aciklama:
                  'Önce dekoratör, sonra sınıf, sonra tür ipuçlu alanlar gelir.',
            ),
            Eslestir(
              soru: 'Tür ipucunu anlamıyla eşleştir.',
              ciftler: [
                (sol: 'int', sag: 'tam sayı'),
                (sol: 'str', sag: 'metin'),
                (sol: 'list[float]', sag: 'ondalık sayı listesi'),
                (sol: 'None', sag: 'boş değer'),
              ],
              aciklama: 'Tür ipuçları kodun ne beklediğini açıkça söyler.',
            ),
            Isaretle(
              soru: 'Satırdaki tür ipucunu işaretle.',
              cumle: 'ad: str = "kalem"',
              dogru: [1],
              aciklama:
                  'str, ad değişkeninin tür ipucudur; "kalem" ise varsayılan değerdir.',
            ),
            Kod(
              soru: 'Dataclass nesnesinin fiyat alanına eriş.',
              kod:
                  'from dataclasses import dataclass\n\n@dataclass\nclass Urun:\n    ad: str\n    fiyat: float\n\nu = Urun("kalem", 12.5)\nprint(u.___)',
              secenekler: ['fiyat', 'price', 'fiyat()'],
              dogru: 0,
              dil: 'python',
              aciklama:
                  'Alanlara nokta ile erişilir: u.fiyat. Çıktı 12.5 olur.',
            ),
          ],
        ),
        Ders(
          id: 'python-3-u3-d2',
          ad: 'collections ve itertools',
          alistirmalar: [
            Secim(
              soru:
                  'from collections import Counter\nsayac = Counter(["a", "b", "a", "a"])\nprint(sayac["a"])\nÇıktı nedir?',
              secenekler: ['1', '2', '3', '4'],
              dogru: 2,
              aciklama: '"a" listede üç kez geçtiği için sayacı 3\'tür.',
            ),
            Secim(
              soru:
                  'from collections import defaultdict\nd = defaultdict(list)\nd["a"].append(1)\nprint(d["a"])\nÇıktı nedir?',
              secenekler: ['[1]', 'KeyError', '[]', 'None'],
              dogru: 0,
              aciklama:
                  'Eksik anahtar için defaultdict boş liste üretir; ardından 1 eklenir.',
            ),
            Tablo(
              soru: 'Araç-kullanım tablosunu tamamla.',
              baslik: ['Araç', 'Kullanım'],
              satirlar: [
                ['Counter', 'öğeleri sayar'],
                ['defaultdict', 'eksik anahtara varsayılan değer verir'],
                ['deque', 'iki uçtan hızlı ekleme ve çıkarma'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: [
                'öğeleri sayar',
                'eksik anahtara varsayılan değer verir',
                'iki uçtan hızlı ekleme ve çıkarma',
              ],
              aciklama:
                  'Counter sayar, defaultdict varsayılan üretir, deque çift uçlu kuyruktur.',
            ),
            Bosluk(
              soru:
                  'from collections import ___\nkuyruk = deque()\nÇift uçlu kuyruk sınıfını içe aktar.',
              secenekler: ['deque', 'Counter', 'chain', 'queue'],
              dogru: 0,
              aciklama: 'deque, collections modülünde bulunur.',
            ),
            Bosluk(
              soru:
                  'import itertools\nlist(itertools.___([1, 2], [3]))\nÇıktının [1, 2, 3] olması için hangi işlev gerekir?',
              secenekler: ['chain', 'groupby', 'count', 'cycle'],
              dogru: 0,
              aciklama: 'chain, birden çok yinelenebiri uç uca ekler.',
            ),
            Yaz(
              soru: 'Öğeleri sayan collections sınıfının adını yaz.',
              cevaplar: ['Counter', 'counter'],
              aciklama: 'Counter, öğelerin kaç kez geçtiğini sayar.',
            ),
            Sirala(
              soru: 'İçe aktarma satırını doğru sırala.',
              kelimeler: ['import', 'Counter', 'from', 'collections'],
              dogru: ['from', 'collections', 'import', 'Counter'],
              aciklama: 'Biçim: from modül import ad',
            ),
            Eslestir(
              soru: 'Aracı görevi ile eşleştir.',
              ciftler: [
                (sol: 'Counter', sag: 'öğeleri sayar'),
                (sol: 'defaultdict', sag: 'eksik anahtara varsayılan verir'),
                (sol: 'deque', sag: 'çift uçlu kuyruk'),
                (sol: 'chain', sag: 'yinelenebirleri birleştirir'),
                (sol: 'groupby', sag: 'ardışık aynı anahtarları gruplar'),
              ],
              aciklama:
                  'groupby yalnızca ardışık eşit anahtarları gruplar; önce sıralamak gerekebilir.',
            ),
            Isaretle(
              soru: 'Satırda içe aktarılan işlevi işaretle.',
              cumle: 'from itertools import chain',
              dogru: [3],
              aciklama: 'import\'tan sonra gelen chain, içe aktarılan addır.',
            ),
            Kod(
              soru: 'En sık geçen öğeyi bulmak için yöntemi tamamla.',
              kod:
                  'from collections import Counter\n\nsayac = Counter("banana")\nprint(sayac.___(1))',
              secenekler: ['most_common', 'sort', 'top'],
              dogru: 0,
              dil: 'python',
              aciklama: 'most_common(1), en sık öğeyi verir: [(\'a\', 3)].',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'python-3-u4',
      ad: 'Eşzamanlılık ve proje düzeni',
      dersler: [
        Ders(
          id: 'python-3-u4-d1',
          ad: 'Eşzamanlılık temelleri',
          alistirmalar: [
            Secim(
              soru:
                  'threading.Thread(target=f) ile oluşturulan iş parçacığını başlatan yöntem hangisidir?',
              secenekler: ['start()', 'run()', 'begin()', 'go()'],
              dogru: 0,
              aciklama:
                  'start() yeni iş parçacığını başlatır; run() ise işi bulunduğun iş parçacığında çalıştırır.',
            ),
            Secim(
              soru:
                  'async def ile tanımlanan bir işlevi doğrudan çağırmak ne döndürür?',
              secenekler: [
                'Bir coroutine nesnesi',
                'Sonucu hemen',
                'None',
                'Yeni bir iş parçacığı',
              ],
              dogru: 0,
              aciklama:
                  'Coroutine nesnesi, await ya da asyncio.run ile çalıştırılana kadar bekler.',
            ),
            Tablo(
              soru: 'Kavram-açıklama tablosunu tamamla.',
              baslik: ['Kavram', 'Açıklama'],
              satirlar: [
                ['threading', 'iş parçacıklarıyla eşzamanlılık'],
                ['asyncio', 'olay döngüsüyle eşzamanlılık'],
                ['await', 'coroutine sonucunu bekler'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: [
                'iş parçacıklarıyla eşzamanlılık',
                'olay döngüsüyle eşzamanlılık',
                'coroutine sonucunu bekler',
              ],
              aciklama:
                  'asyncio olay döngüsüyle çalışır; await bir coroutine\'in bitmesini bekler.',
            ),
            Bosluk(
              soru:
                  'async def getir():\n    sonuc = ___ asyncio.sleep(1)\nBir coroutine\'in bitmesini bekleyen anahtar sözcüğü seç.',
              secenekler: ['await', 'yield', 'async', 'wait'],
              dogru: 0,
              aciklama:
                  'await, coroutine bitene kadar bu işlevi askıya alır ve olay döngüsünü serbest bırakır.',
            ),
            Bosluk(
              soru:
                  't = threading.Thread(target=indir)\nt.start()\nt.___()\nİş parçacığının bitmesini bekle.',
              secenekler: ['join', 'wait', 'end', 'stop'],
              dogru: 0,
              aciklama: 'join(), ilgili iş parçacığı bitene kadar bekler.',
            ),
            Yaz(
              soru:
                  'asyncio.___(ana()) ile program girişinde bir coroutine çalıştırılır. Boşluğa gelen işlev adını yaz.',
              cevaplar: ['run', 'asyncio.run'],
              aciklama:
                  'asyncio.run, olay döngüsünü açar, coroutine\'i çalıştırır ve kapatır.',
            ),
            Sirala(
              soru: 'Coroutine tanımını doğru sırala.',
              kelimeler: ['await', 'async', 'bekle()', 'def', 'ana():'],
              dogru: ['async', 'def', 'ana():', 'await', 'bekle()'],
              aciklama:
                  'async def ile tanımlanan işlevin içinde await kullanılabilir.',
            ),
            Eslestir(
              soru: 'Öğeyi görevi ile eşleştir.',
              ciftler: [
                (sol: 'Thread', sag: 'iş parçacığı oluşturur'),
                (sol: 'Lock', sag: 'ortak veriyi korur'),
                (sol: 'async def', sag: 'coroutine tanımlar'),
                (sol: 'await', sag: 'coroutine sonucunu bekler'),
              ],
              aciklama:
                  'Lock, aynı anda tek iş parçacığının kritik bölüme girmesini sağlar.',
            ),
            Isaretle(
              soru: 'Beklemeyi sağlayan anahtar sözcüğü işaretle.',
              cumle: 'sonuc = await getir()',
              dogru: [2],
              aciklama: 'await, getir() coroutine\'inin sonucunu bekler.',
            ),
            Kod(
              soru: 'Coroutine\'i çalıştıran işlevi tamamla.',
              kod:
                  'import asyncio\n\nasync def selam():\n    print("merhaba")\n\nasyncio.___(selam())',
              secenekler: ['run', 'start', 'wait'],
              dogru: 0,
              dil: 'python',
              aciklama:
                  'asyncio.run(selam()) coroutine\'i çalıştırır ve "merhaba" yazdırır.',
            ),
          ],
        ),
        Ders(
          id: 'python-3-u4-d2',
          ad: 'Test ve paketleme',
          alistirmalar: [
            Secim(
              soru: 'assert toplam(2, 3) == 5 ifadesi yanlış çıkarsa ne olur?',
              secenekler: [
                'AssertionError yükselir',
                'Sessizce geçilir',
                'Program yeniden başlar',
                'Değer 0 olur',
              ],
              dogru: 0,
              aciklama:
                  'assert koşul yanlışsa AssertionError yükseltir; pytest bunu test hatası olarak gösterir.',
            ),
            Secim(
              soru:
                  'Proje için .venv adlı sanal ortamı oluşturan komut hangisidir?',
              secenekler: [
                'python -m venv .venv',
                'pip venv .venv',
                'python venv install',
                'venv run .venv',
              ],
              dogru: 0,
              aciklama:
                  'python -m venv .venv, proje klasöründe yalıtılmış bir ortam oluşturur.',
            ),
            Tablo(
              soru: 'Komut-görev tablosunu tamamla.',
              baslik: ['Komut', 'Görevi'],
              satirlar: [
                ['pip install requests', 'paket kurar'],
                ['python -m venv .venv', 'sanal ortam oluşturur'],
                ['pytest', 'testleri çalıştırır'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 1, sutun: 1)],
              secenekler: [
                'paket kurar',
                'sanal ortam oluşturur',
                'paketi siler',
              ],
              aciklama: 'pip paket kurar, venv sanal ortam oluşturur.',
            ),
            Bosluk(
              soru:
                  'if __name__ == "___":\n    ana()\nDosya doğrudan çalıştırıldığında ana() çağrılsın.',
              secenekler: ['__main__', 'main', '__init__', '__name__'],
              dogru: 0,
              aciklama:
                  'Dosya doğrudan çalıştırılınca __name__ değeri "__main__" olur; içe aktarılınca olmaz.',
            ),
            Bosluk(
              soru:
                  'class TestToplam(unittest.TestCase):\n    def test_toplam(self):\n        self.___(toplam(2, 3), 5)\nİki değerin eşitliğini denetleyen unittest yöntemini seç.',
              secenekler: ['assertEqual', 'assertSame', 'check', 'verify'],
              dogru: 0,
              aciklama:
                  'assertEqual(a, b), a ile b eşit değilse testi başarısız yapar.',
            ),
            Yaz(
              soru:
                  'Python paketlerini kurmak için kullanılan komut satırı aracının adını yaz.',
              cevaplar: ['pip', 'pip3'],
              aciklama: 'pip, paketleri PyPI\'dan kurar: pip install paket.',
            ),
            Sirala(
              soru: 'Sanal ortam komutunu doğru sırala.',
              kelimeler: ['venv', '.venv', 'python', '-m'],
              dogru: ['python', '-m', 'venv', '.venv'],
              aciklama: 'python -m modül ad: venv modülünü çalıştırır.',
            ),
            Eslestir(
              soru: 'Aracı görevi ile eşleştir.',
              ciftler: [
                (sol: 'pip install', sag: 'paket kurar'),
                (sol: 'venv', sag: 'sanal ortam oluşturur'),
                (sol: 'pytest', sag: 'testleri çalıştırır'),
                (sol: 'assert', sag: 'koşulu denetler'),
              ],
              aciklama:
                  'Bu dört araç, test edilebilir bir Python projesinin temelidir.',
            ),
            Isaretle(
              soru: 'Testleri çalıştıran modülün adını işaretle.',
              cumle: 'python -m pytest test_hesap.py',
              dogru: [2],
              aciklama:
                  '-m ile çalıştırılan modül pytest\'tir; test_hesap.py ise test dosyasıdır.',
            ),
            Kod(
              soru: 'Testin denetim ifadesini tamamla.',
              kod:
                  'def topla(a, b):\n    return a + b\n\ndef test_topla():\n    ___ topla(2, 3) == 5',
              secenekler: ['assert', 'return', 'print'],
              dogru: 0,
              dil: 'python',
              aciklama:
                  'pytest testlerinde sade assert kullanılır; yanlışsa test başarısız olur.',
            ),
          ],
        ),
      ],
    ),
  ],
);
