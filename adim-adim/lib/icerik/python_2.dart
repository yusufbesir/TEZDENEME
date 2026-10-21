import '../model/icerik.dart';

/// Python Orta Düzey
const Kurs python2 = Kurs(
  id: 'python-2',
  ad: 'Python Orta Düzey',
  aciklama:
      'Barkod, stok ve market örnekleriyle fonksiyon, kavrama, dosya, hata, modül ve sınıfları öğren.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'python-2-u1',
      ad: 'Fonksiyonlar',
      dersler: [
        Ders(
          id: 'python-2-u1-d1',
          ad: 'Argüman türleri',
          alistirmalar: [
            Secim(
              soru:
                  'def toplam(a, b=10):\n    return a + b\n\ntoplam(5) çağrısının sonucu nedir?',
              secenekler: ['15', '5', '10', 'Hata'],
              dogru: 0,
              aciklama:
                  'b verilmediği için varsayılan 10 kullanılır: 5 + 10 = 15.',
            ),
            Secim(
              soru: 'Hangi çağrı anahtar argüman kullanır?',
              secenekler: [
                'indirim(100, oran=20)',
                'indirim(100, 20)',
                'indirim(*100)',
                'indirim[100]',
              ],
              dogru: 0,
              aciklama:
                  'oran=20 biçiminde ad belirterek verilen değer anahtar argümandır.',
            ),
            Bosluk(
              soru: 'def etiket(ad, ucret ___ 0):  # varsayılan değer işareti',
              secenekler: ['=', ':', '->', '=='],
              dogru: 0,
              aciklama:
                  'Varsayılan değer parametre adından sonra = ile verilir.',
            ),
            Bosluk(
              soru:
                  'def toplam(___): return sum(args)  # tüm konumsal argümanları demet yapar',
              secenekler: ['*args', '**args', 'args*', '&args'],
              dogru: 0,
              aciklama:
                  '*args fazladan gelen konumsal argümanları bir demette toplar.',
            ),
            Yaz(
              soru:
                  'def f(**kwargs) içinde kwargs hangi türdedir? (İngilizce tür adı)',
              cevaplar: ['dict', 'sözlük', 'sozluk'],
              aciklama:
                  '**kwargs anahtar argümanları bir sözlükte (dict) toplar.',
            ),
            Sirala(
              soru: 'Fonksiyon tanımını sırala.',
              kelimeler: ['b=0):', 'a', 'return', '-', 'def', 'b', 'cikar(a,'],
              dogru: ['def', 'cikar(a,', 'b=0):', 'return', 'a', '-', 'b'],
              aciklama:
                  'Önce def ve ad, sonra parametreler, gövdede return gelir.',
            ),
            Eslestir(
              soru: 'Söz dizimini anlamıyla eşleştir.',
              ciftler: [
                (sol: '*args', sag: 'konumsal argümanları demet yapar'),
                (sol: '**kwargs', sag: 'anahtar argümanları sözlük yapar'),
                (sol: 'b=0', sag: 'varsayılan değer'),
                (sol: 'return', sag: 'sonucu geri verir'),
              ],
              aciklama:
                  'Tek yıldız konumsal, çift yıldız anahtar argümanları toplar.',
            ),
            Kod(
              soru: 'Çıktı "ekmek 8" olsun.',
              kod:
                  'def urun_yaz(ad, fiyat=10):\n    print(ad, fiyat)\n\nurun_yaz("ekmek", ___)',
              secenekler: ['fiyat=8', 'fiyat:8', 'fiyat==8'],
              dogru: 0,
              dil: 'python',
              aciklama: 'Anahtar argüman = ile verilir: fiyat=8.',
            ),
            Tablo(
              soru: 'f(a, b=3) için çağrı sonuçlarını tamamla.',
              baslik: ['Çağrı', 'Sonuç'],
              satirlar: [
                ['f(2)', '6'],
                ['f(2, 5)', '10'],
                ['f(a=4)', '12'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: ['6', '10', '12', '4'],
              aciklama: 'def f(a, b=3): return a * b. b verilmezse 3 alınır.',
            ),
            Isaretle(
              soru: 'Varsayılan değeri olan parametreyi işaretle.',
              cumle: 'def indirim(fiyat, oran=10):',
              dogru: [2],
              aciklama: 'oran=10 parametresinin varsayılan değeri 10\'dur.',
            ),
          ],
        ),
        Ders(
          id: 'python-2-u1-d2',
          ad: 'Kapsam, lambda ve sıralama',
          alistirmalar: [
            Secim(
              soru:
                  'stok = 10\ndef azalt():\n    stok = 5\nazalt()\nprint(stok)\n\nÇıktı nedir?',
              secenekler: ['10', '5', '0', 'Hata'],
              dogru: 0,
              aciklama:
                  'Fonksiyon içindeki stok yerel bir değişkendir; dıştaki stok değişmez.',
            ),
            Secim(
              soru: 'sorted([30, 5, 18]) sonucu nedir?',
              secenekler: [
                '[5, 18, 30]',
                '[30, 18, 5]',
                '[5, 30, 18]',
                '[18, 5, 30]',
              ],
              dogru: 0,
              aciklama: 'sorted varsayılan olarak küçükten büyüğe sıralar.',
            ),
            Bosluk(
              soru:
                  'def azalt():\n    ___ stok\n    stok = stok - 1  # dıştaki stok değişkenini değiştirir',
              secenekler: ['global', 'local', 'static', 'import'],
              dogru: 0,
              aciklama:
                  'global bildirimi, fonksiyonun dıştaki değişkeni değiştirmesini sağlar.',
            ),
            Bosluk(
              soru: 'sorted(urunler, ___=len)  # ölçüt olarak uzunluğu kullan',
              secenekler: ['key', 'by', 'rule', 'sort'],
              dogru: 0,
              aciklama: 'sorted ve sort, ölçütü key parametresiyle alır.',
            ),
            Yaz(
              soru:
                  'sorted(x, reverse=___) azalan sıra verir. Boşluğa ne yazılır?',
              cevaplar: ['True', 'true'],
              aciklama: 'reverse=True sıralamayı büyükten küçüğe çevirir.',
            ),
            Sirala(
              soru: 'Fiyata göre sıralama çağrısını sırala.',
              kelimeler: ['u[1])', 'key=lambda', 'sorted(urunler,', 'u:'],
              dogru: ['sorted(urunler,', 'key=lambda', 'u:', 'u[1])'],
              aciklama:
                  'lambda u: u[1] her ürünün ikinci elemanını (fiyat) ölçüt yapar.',
            ),
            Eslestir(
              soru: 'Kavramı anlamıyla eşleştir.',
              ciftler: [
                (sol: 'global', sag: 'fonksiyonda dış değişkeni değiştirir'),
                (sol: 'lambda', sag: 'adsız kısa fonksiyon'),
                (sol: 'key=', sag: 'sıralama ölçütü'),
                (sol: 'reverse=True', sag: 'azalan sıra'),
                (sol: 'sorted()', sag: 'yeni sıralı liste verir'),
              ],
              aciklama:
                  'sorted yeni liste üretir, orijinal listeyi değiştirmez.',
            ),
            Kod(
              soru: 'Ürünleri fiyata (ikinci eleman) göre sırala.',
              kod:
                  'urunler = [("süt", 30), ("ekmek", 8), ("çay", 90)]\nurunler.sort(key=___)',
              secenekler: ['lambda u: u[1]', 'lambda u: u[0]', 'u[1]'],
              dogru: 0,
              dil: 'python',
              aciklama:
                  'key bir fonksiyon ister; lambda u: u[1] fiyatı döndürür.',
            ),
            Tablo(
              soru: 'f = [40, 15, 25] için sonuçları tamamla.',
              baslik: ['İfade', 'Sonuç'],
              satirlar: [
                ['sorted(f)', '[15, 25, 40]'],
                ['sorted(f, reverse=True)', '[40, 25, 15]'],
                ['max(f)', '40'],
                ['min(f)', '15'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: ['[15, 25, 40]', '[40, 25, 15]', '40', '15'],
              aciklama:
                  'sorted küçükten büyüğe, reverse=True ile tersine sıralar.',
            ),
            Isaretle(
              soru: 'Sıralamayı azalan yapan argümanı işaretle.',
              cumle: 'sorted(urunler, key=len, reverse=True)',
              dogru: [2],
              aciklama: 'reverse=True büyükten küçüğe sıralar.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'python-2-u2',
      ad: 'Kavramalar ve dizeler',
      dersler: [
        Ders(
          id: 'python-2-u2-d1',
          ad: 'Liste, sözlük ve küme kavramaları',
          alistirmalar: [
            Secim(
              soru: '[x * 2 for x in [1, 2, 3]] sonucu nedir?',
              secenekler: ['[2, 4, 6]', '[1, 2, 3]', '[1, 4, 9]', '[2, 3, 4]'],
              dogru: 0,
              aciklama: 'Her eleman 2 ile çarpılır: 2, 4, 6.',
            ),
            Secim(
              soru:
                  'fiyatlar = [15, 40, 20, 90]\n[f for f in fiyatlar if f > 20] sonucu nedir?',
              secenekler: [
                '[40, 90]',
                '[20, 40, 90]',
                '[15, 20]',
                '[15, 40, 20, 90]',
              ],
              dogru: 0,
              aciklama: 'Yalnız 20\'den büyük olanlar kalır: 40 ve 90.',
            ),
            Bosluk(
              soru: 'uzunluk = {ad: len(ad) ___ ad in ["süt", "ekmek"]}',
              secenekler: ['for', 'in', 'if', 'while'],
              dogru: 0,
              aciklama:
                  'Kavramalar "ifade for değişken in dizi" kalıbıyla yazılır.',
            ),
            Bosluk(
              soru: 'tekler = [n for n in range(10) ___ n % 2 == 1]',
              secenekler: ['if', 'when', 'where', 'then'],
              dogru: 0,
              aciklama: 'Koşul, kavramanın sonunda if ile eklenir.',
            ),
            Yaz(
              soru:
                  '{x for x in [3, 3, 7]} kümesinde kaç eleman olur? (rakamla yaz)',
              cevaplar: ['2', 'iki'],
              aciklama: 'Küme yinelenenleri atar: {3, 7}.',
            ),
            Sirala(
              soru: 'Kareler listesini kuran satırı sırala.',
              kelimeler: [
                'n',
                'range(4)]',
                'kareler',
                'for',
                '*',
                'in',
                '=',
                '[n',
                'n',
              ],
              dogru: [
                'kareler',
                '=',
                '[n',
                '*',
                'n',
                'for',
                'n',
                'in',
                'range(4)]',
              ],
              aciklama: 'Önce ifade (n * n), sonra for ve dizi gelir.',
            ),
            Eslestir(
              soru: 'Yazımı adıyla eşleştir.',
              ciftler: [
                (sol: '[x for x in a]', sag: 'liste kavraması'),
                (sol: '{x for x in a}', sag: 'küme kavraması'),
                (sol: '{x: 0 for x in a}', sag: 'sözlük kavraması'),
                (sol: '(x for x in a)', sag: 'üreteç ifadesi'),
              ],
              aciklama:
                  'Parantez türü ve iki nokta işareti kavramanın türünü belirler.',
            ),
            Kod(
              soru: 'Çıktı 3 olsun.',
              kod:
                  'adlar = ["süt", "ekmek", "çay"]\nuzunluk = {a: ___ for a in adlar}\nprint(uzunluk["çay"])',
              secenekler: ['len(a)', 'a.len()', 'length(a)'],
              dogru: 0,
              dil: 'python',
              aciklama:
                  'len("çay") 3 verir; sözlük değeri olarak len(a) kullanılır.',
            ),
            Tablo(
              soru: 'a = [1, 2, 3, 4] için kavrama sonuçlarını tamamla.',
              baslik: ['Kavrama', 'Sonuç'],
              satirlar: [
                ['[n for n in a if n > 2]', '[3, 4]'],
                ['[n * n for n in a]', '[1, 4, 9, 16]'],
                ['{n % 2 for n in a}', '{0, 1}'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: ['[3, 4]', '[1, 4, 9, 16]', '{0, 1}', '[1, 2]'],
              aciklama:
                  'Küme kavraması 1, 0, 1, 0 değerlerinden {0, 1} üretir.',
            ),
            Isaretle(
              soru: 'Filtre koşulunu başlatan anahtar sözcüğü işaretle.',
              cumle: 'tekler = [n for n in range(10) if n % 2 == 1]',
              dogru: [7],
              aciklama: 'Koşul if ile başlar; for ise döngüyü kurar.',
            ),
          ],
        ),
        Ders(
          id: 'python-2-u2-d2',
          ad: 'Dize yöntemleri ve dilimleme',
          alistirmalar: [
            Secim(
              soru: 'barkod = "8690504123456"\nbarkod[:3] sonucu nedir?',
              secenekler: ['869', '8690', '690', '86'],
              dogru: 0,
              aciklama: '[:3] baştan 3 karakter alır: 869.',
            ),
            Secim(
              soru: 'barkod = "8690504123456"\nbarkod[-3:] sonucu nedir?',
              secenekler: ['456', '654', '345', '123'],
              dogru: 0,
              aciklama: '[-3:] son 3 karakteri alır.',
            ),
            Bosluk(
              soru: '"  süt  ".___()  # baştaki ve sondaki boşlukları siler',
              secenekler: ['strip', 'split', 'trim', 'clean'],
              dogru: 0,
              aciklama:
                  'strip() iki uçtaki boşlukları temizler; Python\'da trim yoktur.',
            ),
            Bosluk(
              soru: '"süt,ekmek,çay".___(",")  # virgülden böler, liste verir',
              secenekler: ['split', 'join', 'strip', 'find'],
              dogru: 0,
              aciklama: 'split verilen ayraca göre dizeyi listeye böler.',
            ),
            Yaz(
              soru: '"market"[1:4] sonucunu yaz.',
              cevaplar: ['ark'],
              aciklama:
                  'm=0, a=1, r=2, k=3: 1\'den 4\'e kadar (4 hariç) "ark".',
            ),
            Sirala(
              soru: 'Sıfırları tireyle değiştiren satırı sırala.',
              kelimeler: ['"-")', 'yeni', 'barkod.replace("0",', '='],
              dogru: ['yeni', '=', 'barkod.replace("0",', '"-")'],
              aciklama: 'replace(eski, yeni) yeni bir dize döndürür.',
            ),
            Eslestir(
              soru: 'Yöntemi işleviyle eşleştir.',
              ciftler: [
                (sol: 's.upper()', sag: 'tümünü büyük harf yapar'),
                (sol: 's.split(",")', sag: 'virgülden bölüp liste yapar'),
                (sol: 's.replace(a, b)', sag: 'a yerine b koyar'),
                (sol: 's.startswith(x)', sag: 'x ile başlıyor mu denetler'),
                (sol: 's.find(x)', sag: 'x konumunu verir'),
              ],
              aciklama:
                  'Dize yöntemleri orijinali değiştirmez, yeni dize döndürür.',
            ),
            Kod(
              soru: 'Barkodun ilk 3 hanesini (ülke kodu) al.',
              kod: 'barkod = "8690504123456"\nulke = barkod[___]\nprint(ulke)',
              secenekler: [':3', '3:', '-3:'],
              dogru: 0,
              dil: 'python',
              aciklama: '[:3] baştan 3 karakter verir; çıktı 869 olur.',
            ),
            Tablo(
              soru: 's = "market" için sonuçları tamamla.',
              baslik: ['İfade', 'Sonuç'],
              satirlar: [
                ['s[0]', 'm'],
                ['s[2:4]', 'rk'],
                ['s[::-1]', 'tekram'],
                ['len(s)', '6'],
              ],
              bos: [
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
                (satir: 3, sutun: 1),
              ],
              secenekler: ['rk', 'tekram', '6', 'ar'],
              aciklama:
                  '[2:4] r ve k harflerini, [::-1] ters çevrilmiş dizeyi verir.',
            ),
            Isaretle(
              soru: 'Dize yöntemlerini işaretle.',
              cumle: 'len upper split append strip',
              dogru: [1, 2, 4],
              aciklama:
                  'upper, split ve strip dize yöntemidir; append listeye aittir.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'python-2-u3',
      ad: 'Dosya ve hata yönetimi',
      dersler: [
        Ders(
          id: 'python-2-u3-d1',
          ad: 'Dosya okuma ve yazma',
          alistirmalar: [
            Secim(
              soru: 'with open("stok.txt") as f: yapısının yararı nedir?',
              secenekler: [
                'Blok bitince dosya otomatik kapanır',
                'Dosya daha hızlı okunur',
                'Dosya şifrelenir',
                'Dosya silinir',
              ],
              dogru: 0,
              aciklama:
                  'with, hata olsa bile dosyanın kapanmasını garanti eder.',
            ),
            Secim(
              soru: 'open("rapor.txt", "w") ne yapar?',
              secenekler: [
                'Yazmak için açar; var olan içeriği siler',
                'Dosyanın sonuna ekler',
                'Yalnız okumak için açar',
                'Dosyayı siler ve kapatır',
              ],
              dogru: 0,
              aciklama: '"w" modu dosyayı sıfırlayıp yazmaya hazırlar.',
            ),
            Bosluk(
              soru: 'open("satis.txt", "___")  # dosyanın sonuna ekleme yapar',
              secenekler: ['a', 'r', 'w', 'x'],
              dogru: 0,
              aciklama: '"a" (append) mevcut içeriği korur, sona ekler.',
            ),
            Bosluk(
              soru: 'with open("stok.txt") ___ f:',
              secenekler: ['as', 'is', 'in', 'to'],
              dogru: 0,
              aciklama: 'Dosya nesnesine as ile bir ad verilir.',
            ),
            Yaz(
              soru:
                  'Dosyanın tüm içeriğini tek dize olarak okuyan f yönteminin adını yaz.',
              cevaplar: ['read', 'read()', 'f.read', 'f.read()'],
              aciklama: 'f.read() tüm içeriği bir dize olarak döndürür.',
            ),
            Sirala(
              soru: 'Dosyayı güvenli açan satırı sırala.',
              kelimeler: ['f:', 'with', 'as', 'open("stok.txt")'],
              dogru: ['with', 'open("stok.txt")', 'as', 'f:'],
              aciklama: 'Kalıp: with open(...) as ad:',
            ),
            Eslestir(
              soru: 'Modu veya yöntemi anlamıyla eşleştir.',
              ciftler: [
                (sol: '"r"', sag: 'okuma'),
                (sol: '"w"', sag: 'yazma, eskiyi siler'),
                (sol: '"a"', sag: 'sona ekleme'),
                (sol: 'f.readlines()', sag: 'satırları liste yapar'),
                (sol: 'f.write(x)', sag: 'dosyaya yazar'),
              ],
              aciklama: 'Mod tek harfle belirtilir: r, w, a.',
            ),
            Kod(
              soru: 'Dosyaya bir satır yaz.',
              kod:
                  'with open("stok.txt", "w", encoding="utf-8") as f:\n    f.___("süt: 30")',
              secenekler: ['write', 'add', 'put'],
              dogru: 0,
              dil: 'python',
              aciklama: 'Dosyaya metin yazan yöntem write\'tır.',
            ),
            Tablo(
              soru: 'line = "süt,30" için sonuçları tamamla.',
              baslik: ['İfade', 'Sonuç'],
              satirlar: [
                ['line.split(",")[0]', 'süt'],
                ['line.split(",")[1]', '30'],
                ['int(line.split(",")[1]) + 5', '35'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: ['süt', '30', '35'],
              aciklama:
                  'split dizeyi böler; int ile sayıya çevrilen 30\'a 5 eklenince 35 olur.',
            ),
            Isaretle(
              soru: 'Dosya nesnesinin yöntemlerini işaretle.',
              cumle: 'read write print readlines input',
              dogru: [0, 1, 3],
              aciklama:
                  'read, write ve readlines dosya yöntemidir; print ve input yerleşik fonksiyondur.',
            ),
          ],
        ),
        Ders(
          id: 'python-2-u3-d2',
          ad: 'Hata yakalama',
          alistirmalar: [
            Secim(
              soru:
                  'try:\n    n = int("abc")\nexcept ValueError:\n    print("geçersiz")\n\nÇıktı nedir?',
              secenekler: [
                'geçersiz',
                'abc',
                'Hata mesajı ve program durur',
                'Hiçbir şey',
              ],
              dogru: 0,
              aciklama: 'int("abc") ValueError üretir ve except bloğu çalışır.',
            ),
            Secim(
              soru: 'finally bloğu ne zaman çalışır?',
              secenekler: [
                'Hata olsun olmasın her durumda',
                'Yalnız hata olursa',
                'Yalnız hata olmazsa',
                'Hiçbir zaman',
              ],
              dogru: 0,
              aciklama: 'finally temizlik işleri için her durumda çalışır.',
            ),
            Bosluk(
              soru:
                  'try:\n    a / b\n___ ZeroDivisionError:\n    print("bölünemez")',
              secenekler: ['except', 'catch', 'rescue', 'error'],
              dogru: 0,
              aciklama: 'Python\'da hata yakalama except ile yapılır.',
            ),
            Bosluk(
              soru: '___ ValueError("negatif stok")  # hata fırlat',
              secenekler: ['raise', 'throw', 'error', 'new'],
              dogru: 0,
              aciklama: 'Hata fırlatmak için raise kullanılır.',
            ),
            Yaz(
              soru: '10 / 0 işlemi hangi hatayı üretir? (hata adını yaz)',
              cevaplar: ['ZeroDivisionError', 'zerodivisionerror'],
              aciklama: 'Sıfıra bölme ZeroDivisionError üretir.',
            ),
            Sirala(
              soru: 'Hata olursa varsayılan değer atayan yapıyı sırala.',
              kelimeler: [
                'ValueError:',
                'x',
                'try:',
                '=',
                'except',
                'int(s)',
                '0',
                '=',
                'x',
              ],
              dogru: [
                'try:',
                'x',
                '=',
                'int(s)',
                'except',
                'ValueError:',
                'x',
                '=',
                '0',
              ],
              aciklama: 'Önce try bloğu, ardından except ve yedek değer gelir.',
            ),
            Eslestir(
              soru: 'Anahtar sözcüğü işleviyle eşleştir.',
              ciftler: [
                (sol: 'try', sag: 'denenecek kod'),
                (sol: 'except', sag: 'hata olunca çalışır'),
                (sol: 'else', sag: 'hata olmazsa çalışır'),
                (sol: 'finally', sag: 'her durumda çalışır'),
                (sol: 'raise', sag: 'hata fırlatır'),
              ],
              aciklama:
                  'try-except-else-finally birlikte tam bir hata yönetimi kurar.',
            ),
            Kod(
              soru: 'Sıfıra bölünce 0 yazdırılsın.',
              kod:
                  'def bol(a, b):\n    try:\n        return a / b\n    except ___:\n        return 0\n\nprint(bol(5, 0))',
              secenekler: ['ZeroDivisionError', 'ValueError', 'KeyError'],
              dogru: 0,
              dil: 'python',
              aciklama:
                  'Sıfıra bölme ZeroDivisionError üretir; yakalanınca 0 döner.',
            ),
            Tablo(
              soru: 'İfadenin ürettiği hata türünü tamamla.',
              baslik: ['İfade', 'Hata'],
              satirlar: [
                ['int("abc")', 'ValueError'],
                ['[1, 2][5]', 'IndexError'],
                ['{"a": 1}["b"]', 'KeyError'],
                ['"5" + 3', 'TypeError'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 3, sutun: 1),
              ],
              secenekler: ['ValueError', 'IndexError', 'KeyError', 'TypeError'],
              aciklama:
                  'Her hata türü farklı bir sorunu anlatır: değer, indeks, anahtar, tür.',
            ),
            Isaretle(
              soru: 'Hata yakalamaya ait anahtar sözcükleri işaretle.',
              cumle: 'try print except len finally',
              dogru: [0, 2, 4],
              aciklama: 'try, except ve finally hata yönetimi sözcükleridir.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'python-2-u4',
      ad: 'Modüller ve sınıflar',
      dersler: [
        Ders(
          id: 'python-2-u4-d1',
          ad: 'Modüller ve import',
          alistirmalar: [
            Secim(
              soru: 'import math\nprint(math.sqrt(16))\n\nÇıktı nedir?',
              secenekler: ['4.0', '4', '16', 'Hata'],
              dogru: 0,
              aciklama:
                  'math.sqrt her zaman ondalıklı sayı (float) döndürür: 4.0.',
            ),
            Secim(
              soru: 'random.randint(1, 6) hangi değerleri verebilir?',
              secenekler: [
                '1 ile 6 arası tam sayı (6 dahil)',
                '1 ile 5 arası tam sayı',
                '0 ile 6 arası kesirli sayı',
                'Yalnız 6',
              ],
              dogru: 0,
              aciklama: 'randint her iki uç değeri de içerir.',
            ),
            Bosluk(
              soru: '___ math\nprint(math.pi)',
              secenekler: ['import', 'include', 'using', 'require'],
              dogru: 0,
              aciklama: 'Python\'da modül import ile yüklenir.',
            ),
            Bosluk(
              soru: 'json.___(sozluk)  # sözlüğü JSON metnine çevirir',
              secenekler: ['dumps', 'loads', 'parse', 'encode'],
              dogru: 0,
              aciklama:
                  'dumps nesneyi JSON metnine, loads JSON metnini nesneye çevirir.',
            ),
            Yaz(
              soru: 'math.floor(7.9) sonucunu yaz.',
              cevaplar: ['7'],
              aciklama: 'floor aşağı yuvarlar: 7.',
            ),
            Sirala(
              soru: 'Yalnız ceil fonksiyonunu alan satırı sırala.',
              kelimeler: ['ceil', 'import', 'math', 'from'],
              dogru: ['from', 'math', 'import', 'ceil'],
              aciklama: 'Kalıp: from modül import ad.',
            ),
            Eslestir(
              soru: 'Çağrıyı işleviyle eşleştir.',
              ciftler: [
                (sol: 'math.sqrt(x)', sag: 'karekök'),
                (sol: 'random.choice(liste)', sag: 'rastgele eleman'),
                (sol: 'date.today()', sag: 'bugünün tarihi'),
                (sol: 'json.loads(s)', sag: 'JSON metni → Python nesnesi'),
                (sol: 'json.dumps(x)', sag: 'Python nesnesi → JSON metni'),
              ],
              aciklama: 'Standart kütüphane modülleri sık işleri hazır çözer.',
            ),
            Kod(
              soru:
                  '23 ürünü 6\'lı kolilere koy; gereken koli sayısı yazdırılsın.',
              kod: 'import math\nkoli = math.___(23 / 6)\nprint(koli)',
              secenekler: ['ceil', 'floor', 'sqrt'],
              dogru: 0,
              dil: 'python',
              aciklama: '23 / 6 yaklaşık 3,83; yukarı yuvarlayan ceil 4 verir.',
            ),
            Tablo(
              soru: 'math işlevlerinin sonuçlarını tamamla.',
              baslik: ['İfade', 'Sonuç'],
              satirlar: [
                ['math.floor(4.7)', '4'],
                ['math.ceil(4.2)', '5'],
                ['math.sqrt(9)', '3.0'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: ['4', '5', '3.0', '3'],
              aciklama:
                  'floor aşağı, ceil yukarı yuvarlar; sqrt float döndürür.',
            ),
            Isaretle(
              soru: 'Standart kütüphane modüllerini işaretle.',
              cumle: 'math random requests datetime json',
              dogru: [0, 1, 3, 4],
              aciklama:
                  'requests üçüncü taraf pakettir; diğerleri Python ile gelir.',
            ),
          ],
        ),
        Ders(
          id: 'python-2-u4-d2',
          ad: 'Sınıf ve nesne',
          alistirmalar: [
            Secim(
              soru: 'Nesne oluşturulurken otomatik çalışan yöntem hangisidir?',
              secenekler: ['__init__', '__start__', '__main__', '__self__'],
              dogru: 0,
              aciklama: '__init__ kurucu yöntemdir; nesne üretilince çalışır.',
            ),
            Secim(
              soru:
                  'class Urun:\n    def __init__(self, ad, fiyat):\n        self.ad = ad\n        self.fiyat = fiyat\n    def indirimli(self, oran):\n        return self.fiyat * (100 - oran) / 100\n\nu = Urun("süt", 40)\nprint(u.indirimli(25))\n\nÇıktı nedir?',
              secenekler: ['30.0', '30', '10.0', '75.0'],
              dogru: 0,
              aciklama: '40 * 75 / 100 = 30.0; bölme her zaman float verir.',
            ),
            Bosluk(
              soru:
                  'def goster(___):  # yöntemin ilk parametresi nesnenin kendisidir',
              secenekler: ['self', 'this', 'cls', 'me'],
              dogru: 0,
              aciklama: 'Python\'da geleneksel ad self\'tir.',
            ),
            Bosluk(
              soru:
                  'u = ___("süt", 40)  # sınıf fonksiyon gibi çağrılarak nesne üretilir',
              secenekler: ['Urun', 'new Urun', 'Urun.__init__', 'class Urun'],
              dogru: 0,
              aciklama: 'Python\'da new yoktur; sınıf adı çağrılır.',
            ),
            Yaz(
              soru:
                  'Bir sınıftan üretilen örneğe ne denir? (Türkçe tek sözcük)',
              cevaplar: ['nesne', 'örnek', 'ornek'],
              aciklama:
                  'Sınıf şablondur, ondan üretilen her örnek bir nesnedir.',
            ),
            Sirala(
              soru: 'Kurucu yöntemin başlığını sırala.',
              kelimeler: ['fiyat):', 'def', 'ad,', '__init__(self,'],
              dogru: ['def', '__init__(self,', 'ad,', 'fiyat):'],
              aciklama: 'İlk parametre her zaman self olur.',
            ),
            Eslestir(
              soru: 'Terimi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'class', sag: 'sınıf tanımlar'),
                (sol: '__init__', sag: 'kurucu yöntem'),
                (sol: 'self', sag: 'nesnenin kendisi'),
                (sol: 'self.ad', sag: 'nesnenin özniteliği'),
                (sol: 'u.indirimli(25)', sag: 'yöntem çağrısı'),
              ],
              aciklama:
                  'Öznitelikler self ile saklanır, yöntemler nokta ile çağrılır.',
            ),
            Kod(
              soru: 'Sepete ürün ekle; çıktı 1 olsun.',
              kod:
                  'class Sepet:\n    def __init__(self):\n        self.urunler = []\n    def ekle(self, ad):\n        self.urunler.___(ad)\n\ns = Sepet()\ns.ekle("süt")\nprint(len(s.urunler))',
              secenekler: ['append', 'add', 'push'],
              dogru: 0,
              dil: 'python',
              aciklama: 'Listeye eleman eklemek için append kullanılır.',
            ),
            Tablo(
              soru: 'u = Urun("süt", 40) için sonuçları tamamla.',
              baslik: ['İfade', 'Sonuç'],
              satirlar: [
                ['u.ad', 'süt'],
                ['u.fiyat', '40'],
                ['u.indirimli(50)', '20.0'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: ['süt', '40', '20.0', 'Urun'],
              aciklama: 'indirimli(50): 40 * 50 / 100 = 20.0.',
            ),
            Isaretle(
              soru: 'Kurucu yöntemin adını işaretle.',
              cumle: 'class Urun: def __init__(self, ad)',
              dogru: [3],
              aciklama:
                  '__init__ nesne oluşturulurken çalışan kurucu yöntemdir.',
            ),
          ],
        ),
      ],
    ),
  ],
);
