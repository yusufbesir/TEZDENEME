import '../model/icerik.dart';
import 'etkilesimli_kod.dart';

/// Python'a Giriş
const Kurs python1 = Kurs(
  id: 'python-1',
  ad: 'Python\'a Giriş',
  aciklama:
      'Market, stok ve barkod örnekleriyle Python\'un temelini sıfırdan öğren.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'python-1-u1',
      ad: 'İlk adımlar',
      dersler: [
        Ders(
          id: 'python-1-u1-d1',
          ad: 'print ve yorum',
          alistirmalar: [
            Secim(
              soru: 'Ekrana yazı yazdıran Python fonksiyonu hangisidir?',
              secenekler: ['print', 'echo', 'console.log', 'write'],
              dogru: 0,
              aciklama: 'Python\'da ekrana yazdırmak için print() kullanılır.',
            ),
            Secim(
              soru: 'Python\'da tek satırlık yorum hangi simgeyle başlar?',
              secenekler: ['//', '#', '--', '<!--'],
              dogru: 1,
              aciklama:
                  '# işaretinden sonrası yorumdur; Python onu çalıştırmaz.',
            ),
            Tablo(
              soru: 'Komut-çıktı tablosunu tamamla.',
              baslik: ['Kod', 'Ekrandaki çıktı'],
              satirlar: [
                ['print("Elma")', 'Elma'],
                ['print(3 + 4)', '7'],
                ['print("3 + 4")', '3 + 4'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: ['Elma', '7', '3 + 4', '34'],
              aciklama:
                  'Tırnaksız ifade hesaplanır (7); tırnak içindeki metin olduğu gibi yazılır.',
            ),
            Bosluk(
              soru: '___("Merhaba") ekrana Merhaba yazdırır.',
              secenekler: ['print', 'say', 'echo', 'show'],
              dogru: 0,
              aciklama: 'Yazdırma işini print() fonksiyonu yapar.',
            ),
            Bosluk(
              soru:
                  'Bir satırın başına ___ koyarsan Python o satırı yorum sayar.',
              secenekler: ['#', '//', '%', '&'],
              dogru: 0,
              aciklama: 'Yorum satırı # ile başlar.',
            ),
            Yaz(
              soru: 'Ekrana Barkod yazdıran tek satırlık kodu yaz.',
              cevaplar: ['print("Barkod")', 'print(\'Barkod\')'],
              aciklama: 'Metin tırnak içinde print() fonksiyonuna verilir.',
            ),
            Sirala(
              soru: 'Komutu doğru sıraya diz.',
              kelimeler: ['"Merhaba"', ')', 'print', '('],
              dogru: ['print', '(', '"Merhaba"', ')'],
              aciklama:
                  'Fonksiyon adı, açan parantez, metin, kapatan parantez.',
            ),
            Eslestir(
              soru: 'Sembolü anlamıyla eşleştir.',
              ciftler: [
                (sol: 'print', sag: 'ekrana yazdırır'),
                (sol: '#', sag: 'yorum başlatır'),
                (sol: '"Elma"', sag: 'metin değeri'),
                (sol: '()', sag: 'fonksiyon çağrısı'),
              ],
              aciklama: 'Her sembolün Python\'da belirli bir görevi vardır.',
            ),
            Isaretle(
              soru: 'Satırdaki yorum kısmını işaretle (# dahil).',
              cumle: 'stok = 5 # kalan adet',
              dogru: [3, 4, 5],
              aciklama: '# işaretinden satır sonuna kadar her şey yorumdur.',
            ),
            Kod(
              soru: 'İlk satırı yorum satırı yap.',
              kod: '___ Müşteriyi selamla\nprint("Selam")',
              secenekler: ['#', '//', '/*'],
              dogru: 0,
              dil: 'python',
              aciklama:
                  'Python\'da yorum # ile yazılır; // ve /* */ Python\'a ait değildir.',
            ),
          ],
        ),
        Ders(
          id: 'python-1-u1-d2',
          ad: 'Değişken ve veri türleri',
          alistirmalar: [
            Secim(
              soru: 'adet = 5 satırından sonra adet hangi türdedir?',
              secenekler: ['int', 'str', 'float', 'bool'],
              dogru: 0,
              aciklama: 'Ondalıksız sayı int (tam sayı) türündedir.',
            ),
            Secim(
              soru: 'fiyat = 12.5 satırından sonra fiyat hangi türdedir?',
              secenekler: ['int', 'str', 'float', 'bool'],
              dogru: 2,
              aciklama: 'Ondalık sayılar float türündedir.',
            ),
            Tablo(
              soru: 'Değer-tür tablosunu tamamla.',
              baslik: ['Değer', 'Tür'],
              satirlar: [
                ['7', 'int'],
                ['"7"', 'str'],
                ['7.0', 'float'],
                ['True', 'bool'],
              ],
              bos: [
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
                (satir: 3, sutun: 1),
              ],
              secenekler: ['int', 'str', 'float', 'bool'],
              aciklama:
                  'Tırnak içi str, noktalı sayı float, True/False bool\'dur.',
            ),
            Bosluk(
              soru: 'Bir değerin türünü öğrenmek için ___(stok) yazılır.',
              secenekler: ['type', 'kind', 'typeof', 'class'],
              dogru: 0,
              aciklama: 'type() fonksiyonu değerin türünü verir.',
            ),
            Bosluk(
              soru: 'aktif = ___ satırı mantıksal doğru değerini atar.',
              secenekler: ['True', 'true', '"True"', 'TRUE'],
              dogru: 0,
              aciklama:
                  'Python\'da mantıksal değerler büyük harfle başlar: True, False.',
            ),
            Yaz(
              soru: 'int("42") ifadesinin ürettiği değerin türünü yaz.',
              cevaplar: ['int'],
              aciklama: 'int() metni tam sayıya çevirir; sonuç int türündedir.',
            ),
            Sirala(
              soru: 'Değişken tanımını sırala.',
              kelimeler: ['5', 'adet', '='],
              dogru: ['adet', '=', '5'],
              aciklama: 'Önce ad, sonra eşittir, sonra değer yazılır.',
            ),
            Eslestir(
              soru: 'Değeri türüyle eşleştir.',
              ciftler: [
                (sol: '42', sag: 'int'),
                (sol: '3.14', sag: 'float'),
                (sol: '"market"', sag: 'str'),
                (sol: 'False', sag: 'bool'),
              ],
              aciklama: 'Her değerin bir türü vardır.',
            ),
            Isaretle(
              soru: 'Satırda değişkenin adını işaretle.',
              cumle: 'urun_adi = "Süt"',
              dogru: [0],
              aciklama: 'Eşittirin solundaki urun_adi değişkenin adıdır.',
            ),
            Kod(
              soru: 'Çıktının 6 olması için hangi fonksiyon gerekir?',
              kod: 'adet = "5"\nprint(___(adet) + 1)',
              secenekler: ['int', 'str', 'bool'],
              dogru: 0,
              dil: 'python',
              aciklama:
                  '"5" metindir; int() ile sayıya çevrilince 5 + 1 = 6 olur.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'python-1-u2',
      ad: 'Girdi ve işleçler',
      dersler: [
        Ders(
          id: 'python-1-u2-d1',
          ad: 'input ve f-string',
          alistirmalar: [
            Secim(
              soru:
                  'Kullanıcıdan klavyeyle yazı almak için hangisi kullanılır?',
              secenekler: ['input()', 'print()', 'read()', 'scan()'],
              dogru: 0,
              aciklama: 'input() kullanıcının yazdığı metni alır.',
            ),
            Secim(
              soru: 'input() her zaman hangi türde değer döndürür?',
              secenekler: ['str', 'int', 'float', 'bool'],
              dogru: 0,
              aciklama: 'Sayı girilse bile input() metin (str) döndürür.',
            ),
            Tablo(
              soru: 'ad = "Ali" olsun. Çıktı tablosunu tamamla.',
              baslik: ['Kod', 'Çıktı'],
              satirlar: [
                ['print(f"Merhaba {ad}")', 'Merhaba Ali'],
                ['print(f"{ad} geldi")', 'Ali geldi'],
                ['print(f"ad")', 'ad'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: ['Merhaba Ali', 'Ali geldi', 'ad', '{ad}'],
              aciklama:
                  'Süslü parantez içindeki değişken değeriyle yer değiştirir; parantezsiz ad düz metindir.',
            ),
            Bosluk(
              soru:
                  'print(___"Toplam: {tutar} TL") f-string için eksik harf hangisidir?',
              secenekler: ['f', 'r', '\$', '%'],
              dogru: 0,
              aciklama:
                  'Tırnaktan önce f yazılırsa süslü parantezler değerle doldurulur.',
            ),
            Bosluk(
              soru:
                  'adet = ___(input("Adet: ")) girilen yazıyı tam sayıya çevirir.',
              secenekler: ['int', 'str', 'print', 'len'],
              dogru: 0,
              aciklama: 'int() metni tam sayıya dönüştürür.',
            ),
            Yaz(
              soru: 'ad = "Ece" iken print(f"Merhaba {ad}") ne yazdırır?',
              cevaplar: ['Merhaba Ece'],
              aciklama: '{ad} yerine Ece gelir.',
            ),
            Sirala(
              soru: 'Girdiyi değişkene atayan satırı sırala.',
              kelimeler: ['input("Adın: ")', '=', 'ad'],
              dogru: ['ad', '=', 'input("Adın: ")'],
              aciklama: 'Değişken adı, eşittir, sonra input çağrısı gelir.',
            ),
            Eslestir(
              soru: 'Fonksiyonu görevine eşleştir.',
              ciftler: [
                (sol: 'input()', sag: 'klavyeden girdi alır'),
                (sol: 'int()', sag: 'tam sayıya çevirir'),
                (sol: 'float()', sag: 'ondalıklı sayıya çevirir'),
                (sol: 'str()', sag: 'metne çevirir'),
              ],
              aciklama: 'Dönüştürme fonksiyonları türün adını taşır.',
            ),
            Isaretle(
              soru: 'Tür dönüştürme fonksiyonlarını işaretle.',
              cumle: 'int float print str input',
              dogru: [0, 1, 3],
              aciklama: 'int, float ve str değerin türünü değiştirir.',
            ),
            Kod(
              soru: 'Kullanıcıdan fiyatı alacak fonksiyonu seç.',
              kod: 'fiyat = float(___("Fiyat: "))\nprint(fiyat)',
              secenekler: ['input', 'print', 'int'],
              dogru: 0,
              dil: 'python',
              aciklama:
                  'Girdi input() ile alınır, float() ile ondalıklı sayıya çevrilir.',
            ),
          ],
        ),
        Ders(
          id: 'python-1-u2-d2',
          ad: 'İşleçler',
          alistirmalar: [
            Secim(
              soru: 'print(7 // 2) ne yazdırır?',
              secenekler: ['3', '3.5', '4', '1'],
              dogru: 0,
              aciklama: '// tam bölme yapar; 7 bölü 2 tam kısmı 3\'tür.',
            ),
            Secim(
              soru: 'print(7 % 2) ne yazdırır?',
              secenekler: ['0', '1', '3', '3.5'],
              dogru: 1,
              aciklama: '% kalanı verir; 7 bölü 2 işleminde kalan 1\'dir.',
            ),
            Tablo(
              soru: 'İşlem-sonuç tablosunu tamamla.',
              baslik: ['İfade', 'Sonuç'],
              satirlar: [
                ['10 / 4', '2.5'],
                ['10 // 4', '2'],
                ['10 % 3', '1'],
                ['2 ** 3', '8'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 2, sutun: 1),
                (satir: 3, sutun: 1),
              ],
              aciklama: '/ ondalıklı bölme, % kalan, ** üs alma işlemidir.',
            ),
            Bosluk(
              soru: '2 ___ 3 ifadesi 8 verir (2 üssü 3).',
              secenekler: ['**', '^', '*', '//'],
              dogru: 0,
              aciklama: 'Üs alma ** ile yapılır; ^ başka bir işleçtir.',
            ),
            Bosluk(
              soru: 'if stok ___ 0: stok sıfıra eşitse çalışsın.',
              secenekler: ['==', '=', '===', '=>'],
              dogru: 0,
              aciklama:
                  'Eşitlik karşılaştırması == ile yapılır; = atama yapar.',
            ),
            Yaz(
              soru: 'print(3 + 4 * 2) ne yazdırır?',
              cevaplar: ['11'],
              aciklama: 'Önce çarpma yapılır: 4 * 2 = 8, sonra 3 + 8 = 11.',
            ),
            Sirala(
              soru: 'Kalan stok hesabını sırala.',
              kelimeler: ['stok', '-', 'satilan', 'kalan', '='],
              dogru: ['kalan', '=', 'stok', '-', 'satilan'],
              aciklama: 'Sonuç değişkeni, eşittir, sonra işlem yazılır.',
            ),
            Eslestir(
              soru: 'İşleci anlamıyla eşleştir.',
              ciftler: [
                (sol: '==', sag: 'eşit mi'),
                (sol: '!=', sag: 'eşit değil mi'),
                (sol: '%', sag: 'kalanı verir'),
                (sol: '//', sag: 'tam bölüm'),
                (sol: '**', sag: 'üs alma'),
              ],
              aciklama: 'Her işlecin kendine özgü bir görevi vardır.',
            ),
            Isaretle(
              soru: 'Mantıksal işleçleri işaretle.',
              cumle: 'and + or * not',
              dogru: [0, 2, 4],
              aciklama: 'and, or ve not mantıksal işleçlerdir.',
            ),
            Kod(
              soru:
                  'Çıktının 3 olması için (17 bölü 5, tam kısmı) boşluğa ne gelir?',
              kod: 'a = 17\nb = 5\nprint(a ___ b)',
              secenekler: ['//', '%', '/'],
              dogru: 0,
              dil: 'python',
              aciklama: '17 // 5 = 3; % kalan (2), / ise 3.4 verirdi.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'python-1-u3',
      ad: 'Akış denetimi',
      dersler: [
        Ders(
          id: 'python-1-u3-d1',
          ad: 'if, elif ve else',
          alistirmalar: [
            Secim(
              soru: 'Python bir if bloğunun içeriğini nasıl belirler?',
              secenekler: [
                'Süslü parantezlerle',
                'İki nokta ve girintiyle',
                'end sözcüğüyle',
                'Noktalı virgülle',
              ],
              dogru: 1,
              aciklama: 'Koşuldan sonra : konur ve blok girintili yazılır.',
            ),
            Secim(
              soru: 'if\'ten sonra ikinci bir koşul denemek için ne yazılır?',
              secenekler: ['else if', 'elif', 'elseif', 'otherwise'],
              dogru: 1,
              aciklama: 'Python\'da zincirleme koşul elif ile yazılır.',
            ),
            Tablo(
              soru:
                  'Kural: stok == 0 ise "Tükendi", stok < 5 ise "Azaldı", değilse "Yeterli". Tabloyu tamamla.',
              baslik: ['stok', 'Ekrana yazılan'],
              satirlar: [
                ['0', 'Tükendi'],
                ['3', 'Azaldı'],
                ['20', 'Yeterli'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: ['Tükendi', 'Azaldı', 'Yeterli'],
              aciklama:
                  '3 sıfır değil ama 5\'ten küçük; 20 ise hiçbir koşulu sağlamaz.',
            ),
            Bosluk(
              soru:
                  'if stok == 0___\n    print("Bitti")\nKoşul satırının sonuna ne gelir?',
              secenekler: [':', ';', '{', 'then'],
              dogru: 0,
              aciklama: 'if satırı iki nokta ile biter.',
            ),
            Bosluk(
              soru:
                  'Hiçbir koşul doğru değilse çalışacak bölüm ___: ile başlar.',
              secenekler: ['else', 'elif', 'if', 'then'],
              dogru: 0,
              aciklama: 'else, öncekilerin hiçbiri doğru değilse çalışır.',
            ),
            Yaz(
              soru:
                  'yas = 20\nif yas >= 18:\n    print("Yetişkin")\nelse:\n    print("Çocuk")\nÇıktı nedir?',
              cevaplar: ['Yetişkin'],
              aciklama: '20 >= 18 doğru olduğu için if bloğu çalışır.',
            ),
            Sirala(
              soru: 'if satırını oluştur.',
              kelimeler: [':', 'stok', '==', 'if', '0'],
              dogru: ['if', 'stok', '==', '0', ':'],
              aciklama: 'Önce if, sonra koşul, en sonda iki nokta gelir.',
            ),
            Eslestir(
              soru: 'Anahtar sözcüğü görevine eşleştir.',
              ciftler: [
                (sol: 'if', sag: 'koşul doğruysa çalışır'),
                (sol: 'elif', sag: 'sonraki koşulu dener'),
                (sol: 'else', sag: 'hiçbiri doğru değilse'),
                (sol: 'and', sag: 'iki koşul birlikte doğru'),
              ],
              aciklama: 'Koşul zinciri if, elif ve else ile kurulur.',
            ),
            Isaretle(
              soru: 'Koşul yapısının anahtar sözcüklerini işaretle.',
              cumle: 'if elif else stok print',
              dogru: [0, 1, 2],
              aciklama: 'if, elif ve else koşul bloklarını oluşturur.',
            ),
            Kod(
              soru: 'Eksik anahtar sözcüğü seç.',
              kod:
                  'puan = 70\nif puan >= 50:\n    print("Geçti")\n___:\n    print("Kaldı")',
              secenekler: ['else', 'elif', 'end'],
              dogru: 0,
              dil: 'python',
              aciklama: 'Koşul sağlanmazsa çalışacak bölüm else ile yazılır.',
            ),
          ],
        ),
        Ders(
          id: 'python-1-u3-d2',
          ad: 'for, while ve range',
          alistirmalar: [
            Secim(
              soru: 'range(3) için hangisi doğrudur?',
              secenekler: [
                'Üç değer üretir; ilki 0',
                'Üç değer üretir; ilki 1',
                'Dört değer üretir; ilki 0',
                'Tek değer üretir: 3',
              ],
              dogru: 0,
              aciklama:
                  'range(3) 0, 1 ve 2 değerlerini üretir; bitiş değeri dahil değildir.',
            ),
            Secim(
              soru: 'Koşul doğru olduğu sürece tekrar eden döngü hangisidir?',
              secenekler: ['while', 'for', 'if', 'def'],
              dogru: 0,
              aciklama: 'while koşul doğru kaldıkça tekrar eder.',
            ),
            Tablo(
              soru: 'range ifadelerinin ürettiği değerleri tamamla.',
              baslik: ['İfade', 'Üretilen değerler'],
              satirlar: [
                ['range(3)', '0 1 2'],
                ['range(1, 4)', '1 2 3'],
                ['range(0, 10, 5)', '0 5'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: ['0 1 2', '1 2 3', '0 5', '5 10'],
              aciklama: 'range(başla, bitir, adım): bitiş dahil değildir.',
            ),
            Bosluk(
              soru: 'for i in ___(5): ifadesi 0\'dan 4\'e kadar sayar.',
              secenekler: ['range', 'list', 'while', 'count'],
              dogru: 0,
              aciklama: 'range() sayı dizisi üretir.',
            ),
            Bosluk(
              soru:
                  'while sayac < 3:\n    sayac ___ 1\nSayaç her turda bir artsın.',
              secenekler: ['+=', '==', '=>', '++'],
              dogru: 0,
              aciklama: 'Python\'da artırma += ile yapılır; ++ yoktur.',
            ),
            Yaz(
              soru: 'for i in range(4):\n    print(i)\nSon satırda ne yazılır?',
              cevaplar: ['3'],
              aciklama: 'i sırayla 0, 1, 2, 3 olur; son satır 3\'tür.',
            ),
            Sirala(
              soru: 'for satırını oluştur.',
              kelimeler: ['range(5):', 'in', 'i', 'for'],
              dogru: ['for', 'i', 'in', 'range(5):'],
              aciklama: 'for, değişken, in, dizi ve iki nokta sırasıyla gelir.',
            ),
            Eslestir(
              soru: 'Anahtar sözcüğü görevine eşleştir.',
              ciftler: [
                (sol: 'for', sag: 'diziyi tek tek dolaşır'),
                (sol: 'while', sag: 'koşul sürdükçe tekrar eder'),
                (sol: 'break', sag: 'döngüyü bitirir'),
                (sol: 'continue', sag: 'sonraki tura geçer'),
              ],
              aciklama: 'break döngüyü keser, continue yalnız o turu atlar.',
            ),
            Isaretle(
              soru: 'Döngüyü kesen veya atlayan sözcükleri işaretle.',
              cumle: 'for print break len continue',
              dogru: [2, 4],
              aciklama: 'break döngüyü bitirir, continue sonraki tura geçer.',
            ),
            Kod(
              soru:
                  'Çıktının 6 olması için (1 + 2 + 3) bitiş değeri ne olmalı?',
              kod:
                  'toplam = 0\nfor i in range(1, ___):\n    toplam += i\nprint(toplam)',
              secenekler: ['4', '3', '5'],
              dogru: 0,
              dil: 'python',
              aciklama: 'range(1, 4) 1, 2, 3 üretir; toplamları 6\'dır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'python-1-u4',
      ad: 'Veri yapıları ve fonksiyon',
      dersler: [
        Ders(
          id: 'python-1-u4-d1',
          ad: 'Liste ve demet',
          alistirmalar: [
            Secim(
              soru: 'Python\'da liste hangi parantezle yazılır?',
              secenekler: [
                'Köşeli: [ ]',
                'Yuvarlak: ( )',
                'Süslü: { }',
                'Açılı: < >',
              ],
              dogru: 0,
              aciklama:
                  'Liste köşeli parantezle yazılır; demet yuvarlak parantez kullanır.',
            ),
            Secim(
              soru:
                  'urunler = ["süt", "ekmek", "yumurta"] için urunler[0] nedir?',
              secenekler: ['süt', 'ekmek', 'yumurta', '0'],
              dogru: 0,
              aciklama: 'İndeks 0\'dan başlar; ilk eleman süt\'tür.',
            ),
            Tablo(
              soru:
                  'urunler = ["süt", "ekmek", "çay"] olsun. Sonuçları tamamla.',
              baslik: ['İfade', 'Sonuç'],
              satirlar: [
                ['urunler[0]', 'süt'],
                ['urunler[1]', 'ekmek'],
                ['urunler[-1]', 'çay'],
                ['len(urunler)', '3'],
              ],
              bos: [
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
                (satir: 3, sutun: 1),
              ],
              secenekler: ['süt', 'ekmek', 'çay', '3'],
              aciklama: '-1 son elemanı verir; len() eleman sayısını verir.',
            ),
            Bosluk(
              soru: 'urunler.___("su") ifadesi listeden "su" elemanını siler.',
              secenekler: ['remove', 'delete', 'cut', 'erase'],
              dogru: 0,
              aciklama: 'Değere göre silmek için remove() kullanılır.',
            ),
            Bosluk(
              soru:
                  'koordinat = (3, 5) gibi değiştirilemeyen koleksiyonun türü ___ \'dır.',
              secenekler: ['tuple', 'list', 'dict', 'str'],
              dogru: 0,
              aciklama:
                  'Yuvarlak parantezli değiştirilemez koleksiyona tuple (demet) denir.',
            ),
            Yaz(
              soru: 'sayilar = [4, 8, 15]\nprint(len(sayilar)) ne yazdırır?',
              cevaplar: ['3'],
              aciklama: 'Listede üç eleman vardır.',
            ),
            Sirala(
              soru: 'Liste tanımını sırala.',
              kelimeler: ['"çay"]', '=', 'urunler', '["süt",'],
              dogru: ['urunler', '=', '["süt",', '"çay"]'],
              aciklama:
                  'Önce ad, sonra eşittir, sonra köşeli parantezli elemanlar gelir.',
            ),
            Eslestir(
              soru: 'Yazımı görevine eşleştir.',
              ciftler: [
                (sol: 'append()', sag: 'sona eleman ekler'),
                (sol: 'len()', sag: 'eleman sayısını verir'),
                (sol: '[0]', sag: 'ilk elemanı alır'),
                (sol: '[-1]', sag: 'son elemanı alır'),
              ],
              aciklama: 'Liste işlemleri indeks ve yöntemlerle yapılır.',
            ),
            Isaretle(
              soru: 'Listeyi değiştiren yöntemleri işaretle.',
              cumle: 'append len remove count',
              dogru: [0, 2],
              aciklama:
                  'append ekler, remove siler; len ve count listeyi değiştirmez.',
            ),
            Kod(
              soru: 'Sepete ekmek ekle; çıktı 3 olsun.',
              kod:
                  'sepet = ["süt", "çay"]\nsepet.___("ekmek")\nprint(len(sepet))',
              secenekler: ['append', 'add', 'len'],
              dogru: 0,
              dil: 'python',
              aciklama: 'append() sona eleman ekler; liste üç elemanlı olur.',
            ),
          ],
        ),
        Ders(
          id: 'python-1-u4-d2',
          ad: 'Sözlük ve fonksiyon',
          alistirmalar: [
            Secim(
              soru: 'Aşağıdakilerden hangisi sözlüktür (dict)?',
              secenekler: [
                '{"süt": 25}',
                '["süt", 25]',
                '("süt", 25)',
                '"süt: 25"',
              ],
              dogru: 0,
              aciklama:
                  'Sözlük süslü parantez içinde anahtar: değer çiftleri tutar.',
            ),
            Secim(
              soru:
                  'Python\'da fonksiyon tanımlayan anahtar sözcük hangisidir?',
              secenekler: ['def', 'func', 'function', 'fn'],
              dogru: 0,
              aciklama: 'Fonksiyonlar def ile tanımlanır.',
            ),
            Tablo(
              soru:
                  'fiyat = {"süt": 25, "ekmek": 10, "çay": 40} olsun. Sonuçları tamamla.',
              baslik: ['İfade', 'Sonuç'],
              satirlar: [
                ['fiyat["süt"]', '25'],
                ['fiyat["çay"]', '40'],
                ['len(fiyat)', '3'],
                ['"ekmek" in fiyat', 'True'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 2, sutun: 1),
                (satir: 3, sutun: 1),
              ],
              secenekler: ['25', '40', '3', 'True', '10'],
              aciklama:
                  'Anahtarla değere ulaşılır; len() çift sayısını, in anahtar varlığını verir.',
            ),
            Bosluk(
              soru:
                  'def topla(a, b):\n    ___ a + b\nSonucu geri veren sözcük hangisidir?',
              secenekler: ['return', 'print', 'give', 'yield'],
              dogru: 0,
              aciklama: 'return, fonksiyonun sonucunu çağırana geri verir.',
            ),
            Bosluk(
              soru:
                  'fiyat.___("süt") sözlükte anahtarın değerini hata vermeden okur.',
              secenekler: ['get', 'take', 'find', 'read'],
              dogru: 0,
              aciklama: 'get() anahtar yoksa hata yerine None döndürür.',
            ),
            Yaz(
              soru:
                  'def iki_kat(x):\n    return x * 2\nprint(iki_kat(5)) ne yazdırır?',
              cevaplar: ['10'],
              aciklama: 'x = 5 iken 5 * 2 = 10 döner.',
            ),
            Sirala(
              soru: 'Fonksiyon başlığını sırala.',
              kelimeler: ['b):', 'topla(a,', 'def'],
              dogru: ['def', 'topla(a,', 'b):'],
              aciklama: 'def, ad ve parametreler, sonda iki nokta.',
            ),
            Eslestir(
              soru: 'Yapıyı görevine eşleştir.',
              ciftler: [
                (sol: 'def', sag: 'fonksiyon tanımlar'),
                (sol: 'return', sag: 'sonucu geri verir'),
                (sol: '{"a": 1}', sag: 'sözlük'),
                (sol: '.keys()', sag: 'anahtarları verir'),
              ],
              aciklama:
                  'Sözlük anahtar-değer çifti tutar; fonksiyon def ile yazılır.',
            ),
            Isaretle(
              soru: 'Fonksiyonla ilgili anahtar sözcükleri işaretle.',
              cumle: 'def for return if',
              dogru: [0, 2],
              aciklama: 'def fonksiyonu tanımlar, return sonucu döndürür.',
            ),
            Kod(
              soru: '%10 indirimle çıktı 90.0 olsun.',
              kod:
                  'def indirim(fiyat):\n    return fiyat * ___\n\nprint(indirim(100))',
              secenekler: ['0.9', '0.1', '9'],
              dogru: 0,
              dil: 'python',
              aciklama:
                  '100 * 0.9 = 90.0; %10 indirimde fiyatın %90\'ı ödenir.',
            ),
          ],
        ),
      ],
    ),
    pythonEtkilesimliUnite,
  ],
);
