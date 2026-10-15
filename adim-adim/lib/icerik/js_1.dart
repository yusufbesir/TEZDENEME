import '../model/icerik.dart';

/// JavaScript'e Giriş
const Kurs js1 = Kurs(
  id: 'js-1',
  ad: 'JavaScript\'e Giriş',
  aciklama:
      'Barkod ve stok örnekleriyle programlamanın temelini ve DOM\'u öğren.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'js-1-u1',
      ad: 'Değişken, tür ve koşul',
      dersler: [
        Ders(
          id: 'js-1-u1-d1',
          ad: 'Değişken ve veri türü',
          alistirmalar: [
            Secim(
              soru:
                  'Değeri sonradan değişmeyecek bir değişken nasıl tanımlanır?',
              secenekler: [
                'let barkod = "123";',
                'const barkod = "123";',
                'var barkod;',
                'int barkod = "123";',
              ],
              dogru: 1,
              aciklama: 'const sabit tanımlar; yeniden atama yapılamaz.',
            ),
            Secim(
              soru: 'let stok = 5; satırından sonra stok hangi türdedir?',
              secenekler: ['number', 'string', 'boolean', 'array'],
              dogru: 0,
              aciklama: 'Tırnaksız sayı number türündedir.',
            ),
            Secim(
              soru: '"42" hangi türdedir?',
              secenekler: ['number', 'boolean', 'object', 'string'],
              dogru: 3,
              aciklama: 'Tırnak içindeki değer metindir (string).',
            ),
            Bosluk(
              soru: '___ fiyat = 25; fiyat sonra değişebilir.',
              secenekler: ['int', 'set', 'let', 'num'],
              dogru: 2,
              aciklama: 'Değişebilen değişken let ile tanımlanır.',
            ),
            Bosluk(
              soru: 'let aktif = ___; mantıksal bir değerdir.',
              secenekler: ['dogru', 'true', '"evet"', 'yes'],
              dogru: 1,
              aciklama: 'Boolean değerleri true ve false\'tur.',
            ),
            Yaz(
              soru: '"abc" ifadesinin veri türünün adını İngilizce yaz.',
              cevaplar: ['string'],
              aciklama: 'Metin türü string olarak adlandırılır.',
            ),
            Sirala(
              soru: 'Değişken tanımını sırala.',
              kelimeler: ['=', 'adet', 'let', '3;'],
              dogru: ['let', 'adet', '=', '3;'],
              aciklama: 'Önce let, sonra ad, eşittir, değer gelir.',
            ),
            Eslestir(
              soru: 'Değeri türüyle eşleştir.',
              ciftler: [
                (sol: '"selam"', sag: 'string'),
                (sol: '12', sag: 'number'),
                (sol: 'true', sag: 'boolean'),
                (sol: 'null', sag: 'boş değer'),
              ],
              aciklama: 'Her değerin bir türü vardır.',
            ),
            Secim(
              soru: 'typeof 7 ifadesinin sonucu nedir?',
              secenekler: ['"number"', '"seven"', '"digit"', '"int"'],
              dogru: 0,
              aciklama: 'typeof türün adını metin olarak verir.',
            ),
            Kod(
              soru: 'Değeri sonradan değişecek değişkeni tanımla.',
              kod: '___ stok = 5;\nstok = 8;',
              secenekler: ['let', 'const', 'fixed'],
              dogru: 0,
              dil: 'js',
              aciklama:
                  'const ile tanımlanan değişken yeniden atanamaz; değişecekse let kullanılır.',
            ),
          ],
        ),
        Ders(
          id: 'js-1-u1-d2',
          ad: 'Koşullar',
          alistirmalar: [
            Secim(
              soru: 'Bir koşula göre kod çalıştıran yapı hangisidir?',
              secenekler: ['for', 'let', 'return', 'if'],
              dogru: 3,
              aciklama: 'if koşul doğruysa bloğu çalıştırır.',
            ),
            Secim(
              soru: 'Eşitliği tür dahil denetleyen operatör hangisidir?',
              secenekler: ['=', '==>', '===', '=:'],
              dogru: 2,
              aciklama:
                  '=== değer ve türü birlikte karşılaştırır, = ise atama yapar.',
            ),
            Secim(
              soru: '5 > 3 ifadesinin sonucu nedir?',
              secenekler: ['false', 'true', '5', 'undefined'],
              dogru: 1,
              aciklama: '5, 3\'ten büyük olduğu için sonuç true olur.',
            ),
            Bosluk(
              soru:
                  'if (stok ___ 0) { yaz("Tükendi"); } stok sıfırsa çalışsın.',
              secenekler: ['===', '=', '=>', '!'],
              dogru: 0,
              aciklama: 'Karşılaştırma için === kullanılır.',
            ),
            Bosluk(
              soru:
                  'if (a > 5) { ... } ___ { ... } koşul yanlışsa çalışan bölüm.',
              secenekler: ['then', 'otherwise', 'elif', 'else'],
              dogru: 3,
              aciklama: 'JavaScript\'te alternatif dal else ile yazılır.',
            ),
            Yaz(
              soru: '"Hem a hem b doğru" anlamındaki mantıksal operatörü yaz.',
              cevaplar: ['&&'],
              aciklama: '&& (ve) iki koşul da doğruysa true verir.',
            ),
            Sirala(
              soru: 'Koşul yapısını sırala.',
              kelimeler: ['}', 'if (x > 0) {', 'yaz("pozitif");'],
              dogru: ['if (x > 0) {', 'yaz("pozitif");', '}'],
              aciklama: 'if satırı, gövde, kapanış parantezi.',
            ),
            Eslestir(
              soru: 'Operatörü anlamıyla eşleştir.',
              ciftler: [
                (sol: '&&', sag: 've'),
                (sol: '||', sag: 'veya'),
                (sol: '!', sag: 'değil'),
                (sol: '!==', sag: 'eşit değil'),
              ],
              aciklama: 'Mantıksal operatörler koşulları birleştirir.',
            ),
            Secim(
              soru: 'let n = 4; n % 2 === 0 ifadesi neyi sınar?',
              secenekler: [
                'Sayının yüzdesini',
                'Sayının tek olduğunu',
                'Sayının çift olduğunu',
                'Sayının 2 katını',
              ],
              dogru: 2,
              aciklama: '% kalanı verir; kalan 0 ise sayı çifttir.',
            ),
            Kod(
              soru: 'Koşul yapısını tamamla.',
              kod:
                  'let yas = 20;\n___ (yas >= 18) {\n  console.log("Yetişkin");\n}',
              secenekler: ['if', 'else', 'function'],
              dogru: 0,
              dil: 'js',
              aciklama: 'Koşula göre kod çalıştırmak için if kullanılır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'js-1-u2',
      ad: 'Döngü, fonksiyon ve veri',
      dersler: [
        Ders(
          id: 'js-1-u2-d1',
          ad: 'Döngüler ve fonksiyonlar',
          alistirmalar: [
            Secim(
              soru: 'Belirli sayıda tekrar için en yaygın döngü hangisidir?',
              secenekler: ['if', 'for', 'else', 'switch'],
              dogru: 1,
              aciklama: 'for sayacı olan tekrarlar için uygundur.',
            ),
            Secim(
              soru: 'for (let i = 0; i < 3; i++) döngüsü kaç kez çalışır?',
              secenekler: ['3', '2', '4', '0'],
              dogru: 0,
              aciklama: 'i değeri 0, 1, 2 için çalışır, toplam 3 kez.',
            ),
            Secim(
              soru: 'Fonksiyon nasıl tanımlanır?',
              secenekler: [
                'topla = function a b',
                'def topla(a, b)',
                'func topla: a, b',
                'function topla(a, b) { return a + b; }',
              ],
              dogru: 3,
              aciklama: 'JavaScript\'te function anahtar sözcüğü kullanılır.',
            ),
            Bosluk(
              soru: 'function karesi(x) { ___ x * x; }',
              secenekler: ['give', 'back', 'return', 'out'],
              dogru: 2,
              aciklama: 'return değeri çağıran yere döndürür.',
            ),
            Bosluk(
              soru: 'let i = 0; ___ (i < 3) { i++; }',
              secenekler: ['when', 'while', 'until', 'loop'],
              dogru: 1,
              aciklama: 'while koşul doğru olduğu sürece tekrar eder.',
            ),
            Yaz(
              soru: 'i değerini bir artıran kısa yazımı yaz (i ile).',
              cevaplar: ['i++'],
              aciklama: 'i++ değeri bir artırır.',
            ),
            Sirala(
              soru: 'Fonksiyonu sırala.',
              kelimeler: ['}', 'return 1;', 'function bir() {'],
              dogru: ['function bir() {', 'return 1;', '}'],
              aciklama: 'Önce tanım satırı, gövde, kapanış.',
            ),
            Eslestir(
              soru: 'Anahtar sözcüğü görevi ile eşleştir.',
              ciftler: [
                (sol: 'for', sag: 'Sayaçlı döngü'),
                (sol: 'while', sag: 'Koşullu döngü'),
                (sol: 'function', sag: 'Fonksiyon tanımı'),
                (sol: 'return', sag: 'Değer döndürme'),
              ],
              aciklama: 'Bu sözcükler programın akışını yönetir.',
            ),
            Secim(
              soru:
                  'topla(2, 3) çağrısı function topla(a, b) { return a + b; } için ne verir?',
              secenekler: ['5', '23', '2', 'undefined'],
              dogru: 0,
              aciklama: 'Sayılar toplanır, sonuç 5 olur.',
            ),
            Kod(
              soru: 'Fonksiyonun sonucunu döndüren anahtar sözcüğü seç.',
              kod: 'function topla(a, b) {\n  ___ a + b;\n}',
              secenekler: ['return', 'print', 'give'],
              dogru: 0,
              dil: 'js',
              aciklama: 'return, fonksiyonun sonucunu çağırana geri verir.',
            ),
          ],
        ),
        Ders(
          id: 'js-1-u2-d2',
          ad: 'Dizi ve nesne',
          alistirmalar: [
            Secim(
              soru: 'Dizi nasıl yazılır?',
              secenekler: [
                '{a, b, c}',
                '(a, b, c)',
                '<a, b, c>',
                '["a", "b", "c"]',
              ],
              dogru: 3,
              aciklama: 'Diziler köşeli parantez içindedir.',
            ),
            Secim(
              soru: '["x", "y", "z"][0] değeri nedir?',
              secenekler: ['"y"', '"z"', '"x"', 'undefined'],
              dogru: 2,
              aciklama: 'Dizi indeksi 0\'dan başlar.',
            ),
            Secim(
              soru:
                  'urun = { ad: "Kalem", fiyat: 5 }; ifadesinde urun.fiyat nedir?',
              secenekler: ['"Kalem"', '5', 'fiyat', 'undefined'],
              dogru: 1,
              aciklama: 'Nesne özelliğine nokta ile erişilir.',
            ),
            Bosluk(
              soru:
                  'let kodlar = ["A", "B"]; kodlar.___("C"); diziye sona eleman ekler.',
              secenekler: ['push', 'add', 'append', 'put'],
              dogru: 0,
              aciklama: 'push sona eleman ekler.',
            ),
            Bosluk(
              soru: 'let n = ["a", "b", "c"].___; sonuç 3 olur.',
              secenekler: ['size', 'count', 'len', 'length'],
              dogru: 3,
              aciklama: 'length dizideki eleman sayısıdır.',
            ),
            Yaz(
              soru:
                  'Dizideki her elemanı dolaşan ve her biri için fonksiyon çağıran yöntemin adını yaz.',
              cevaplar: ['forEach', 'foreach'],
              aciklama:
                  'forEach her eleman için verilen fonksiyonu çalıştırır.',
            ),
            Sirala(
              soru: 'Nesne tanımını sırala.',
              kelimeler: ['}', 'ad: "Pil"', 'let urun = {'],
              dogru: ['let urun = {', 'ad: "Pil"', '}'],
              aciklama: 'Önce açılış, sonra özellik, en sonda kapanış.',
            ),
            Eslestir(
              soru: 'Yapıyı yazımı ile eşleştir.',
              ciftler: [
                (sol: 'Dizi', sag: '[1, 2]'),
                (sol: 'Nesne', sag: '{ a: 1 }'),
                (sol: 'Metin', sag: '"a"'),
                (sol: 'Sayı', sag: '1'),
              ],
              aciklama: 'Dizi köşeli, nesne süslü parantez kullanır.',
            ),
            Secim(
              soru: 'urun["ad"] ifadesi neye eşdeğerdir?',
              secenekler: ['urun(ad)', 'urun[ad]', 'urun.ad', 'urun->ad'],
              dogru: 2,
              aciklama:
                  'Nesne özelliğine nokta ya da köşeli parantezle erişilir.',
            ),
            Kod(
              soru: 'Dizinin ilk öğesini yazdırmak için indeksi seç.',
              kod:
                  'let meyveler = ["elma", "armut"];\nconsole.log(meyveler[___]);',
              secenekler: ['0', '1', '-1'],
              dogru: 0,
              dil: 'js',
              aciklama: 'Dizi indeksleri 0\'dan başlar.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'js-1-u3',
      ad: 'DOM ve olaylar',
      dersler: [
        Ders(
          id: 'js-1-u3-d1',
          ad: 'DOM\'da öğe seçme ve değiştirme',
          alistirmalar: [
            Secim(
              soru: 'DOM nedir?',
              secenekler: [
                'Bir CSS dosyası',
                'Sayfanın JavaScript ile erişilebilen ağaç yapısı',
                'Bir veritabanı',
                'Bir tarayıcı adı',
              ],
              dogru: 1,
              aciklama: 'DOM, sayfa öğelerinin nesne ağacıdır.',
            ),
            Secim(
              soru: 'id\'si "sonuc" olan öğeyi hangisi seçer?',
              secenekler: [
                'document.getElementById("sonuc")',
                'document.sonuc',
                'get("#sonuc")',
                'document.id("sonuc")',
              ],
              dogru: 0,
              aciklama: 'getElementById, id\'ye göre öğeyi bulur.',
            ),
            Secim(
              soru: 'CSS seçici ile ilk eşleşen öğeyi hangisi bulur?',
              secenekler: [
                'document.findAll',
                'document.pick',
                'document.css',
                'document.querySelector',
              ],
              dogru: 3,
              aciklama:
                  'querySelector bir CSS seçici alır ve ilk eşleşeni döndürür.',
            ),
            Bosluk(
              soru:
                  'let el = document.getElementById("kod"); el.___ = "ABC-123"; yazıyı değiştirir.',
              secenekler: ['value', 'write', 'textContent', 'say'],
              dogru: 2,
              aciklama: 'textContent bir öğenin metnini güvenle değiştirir.',
            ),
            Bosluk(
              soru: 'el.classList.___("gizli"); öğeye sınıf ekler.',
              secenekler: ['push', 'add', 'put', 'new'],
              dogru: 1,
              aciklama: 'classList.add sınıf ekler, remove çıkarır.',
            ),
            Yaz(
              soru:
                  'Yeni bir HTML öğesi oluşturan document yönteminin adını yaz.',
              cevaplar: ['createElement', 'document.createElement'],
              aciklama: 'createElement belirtilen etiketten yeni öğe üretir.',
            ),
            Sirala(
              soru: 'Öğeyi seçip metnini değiştiren iki satırı sırala.',
              kelimeler: [
                'el.textContent = "Selam";',
                'let el = document.querySelector("h1");',
              ],
              dogru: [
                'let el = document.querySelector("h1");',
                'el.textContent = "Selam";',
              ],
              aciklama: 'Önce öğe seçilir, sonra özellik değiştirilir.',
            ),
            Eslestir(
              soru: 'Yöntemi görevi ile eşleştir.',
              ciftler: [
                (sol: 'getElementById', sag: 'id ile seç'),
                (sol: 'querySelector', sag: 'CSS seçici ile seç'),
                (sol: 'createElement', sag: 'Yeni öğe üret'),
                (sol: 'appendChild', sag: 'Öğeyi ekle'),
              ],
              aciklama: 'DOM yöntemleri sayfayı okur ve değiştirir.',
            ),
            Secim(
              soru:
                  'Kullanıcıdan gelen metni sayfaya güvenle basmak için hangisi tercih edilir?',
              secenekler: [
                'textContent',
                'innerHTML',
                'outerHTML',
                'document.write',
              ],
              dogru: 0,
              aciklama:
                  'textContent metni HTML olarak yorumlamaz; kod enjeksiyonunu önler.',
            ),
            Kod(
              soru: 'id ile öğe seçen yöntemi tamamla.',
              kod: 'const baslik = document.___("baslik");',
              secenekler: ['getElementById', 'getElement', 'findId'],
              dogru: 0,
              dil: 'js',
              aciklama: 'getElementById, id değerine göre öğeyi seçer.',
            ),
          ],
        ),
        Ders(
          id: 'js-1-u3-d2',
          ad: 'Olaylar',
          alistirmalar: [
            Secim(
              soru: 'Düğmeye tıklanınca çalışacak kod nasıl bağlanır?',
              secenekler: [
                'düğme.click = islev()',
                'düğme.on("tikla")',
                'düğme.run(islev)',
                'düğme.addEventListener("click", islev)',
              ],
              dogru: 3,
              aciklama: 'addEventListener bir olaya dinleyici bağlar.',
            ),
            Secim(
              soru: 'Form gönderildiğinde sayfanın yenilenmesini ne durdurur?',
              secenekler: [
                'event.stop()',
                'return null',
                'event.preventDefault()',
                'form.cancel',
              ],
              dogru: 2,
              aciklama:
                  'preventDefault olayın varsayılan davranışını iptal eder.',
            ),
            Secim(
              soru: 'Tuşa basma olayının adı nedir?',
              secenekler: ['keyup', 'keydown', 'typed', 'keyclick'],
              dogru: 1,
              aciklama: 'keydown, tuşa basıldığı an tetiklenir.',
            ),
            Bosluk(
              soru: 'btn.addEventListener("___", function () { ... });',
              secenekler: ['click', 'tik', 'push', 'tap'],
              dogru: 0,
              aciklama: 'Tıklama olayının adı click\'tir.',
            ),
            Bosluk(
              soru:
                  'document.addEventListener("___", baslat); sayfa DOM\'u hazır olunca çalışır.',
              secenekler: [
                'ready',
                'start',
                'beforeunload',
                'DOMContentLoaded',
              ],
              dogru: 3,
              aciklama: 'DOMContentLoaded HTML ayrıştırıldığında tetiklenir.',
            ),
            Yaz(
              soru:
                  'Olay işleyicisine gelen bilgi nesnesine genelde verilen kısa adı yaz (e ile başlayan sözcük).',
              cevaplar: ['event', 'e'],
              aciklama:
                  'Olay nesnesi genelde event ya da e olarak adlandırılır.',
            ),
            Sirala(
              soru: 'Tıklama dinleyicisini sırala.',
              kelimeler: [
                '});',
                'btn.addEventListener("click", function () {',
                'sayac++;',
              ],
              dogru: [
                'btn.addEventListener("click", function () {',
                'sayac++;',
                '});',
              ],
              aciklama: 'Dinleyici açılır, gövde yazılır, kapatılır.',
            ),
            Eslestir(
              soru: 'Olayı tetikleyen eylem ile eşleştir.',
              ciftler: [
                (sol: 'click', sag: 'Tıklama'),
                (sol: 'input', sag: 'Alana yazma'),
                (sol: 'submit', sag: 'Form gönderme'),
                (sol: 'keydown', sag: 'Tuşa basma'),
              ],
              aciklama:
                  'Her olay türü farklı bir kullanıcı eylemine karşılık gelir.',
            ),
            Secim(
              soru: 'Alana yazılan değeri okumak için hangisi kullanılır?',
              secenekler: ['alan.text', 'alan.say', 'alan.value', 'alan.get'],
              dogru: 2,
              aciklama: 'Girdi alanlarının içeriği value özelliğinde tutulur.',
            ),
            Kod(
              soru: 'Tıklama olayını dinleyen yöntemi seç.',
              kod: 'dugme.___("click", () => {\n  alert("Tıklandı");\n});',
              secenekler: ['addEventListener', 'onClickAdd', 'listen'],
              dogru: 0,
              dil: 'js',
              aciklama: 'addEventListener, bir olaya dinleyici ekler.',
            ),
          ],
        ),
      ],
    ),
  ],
);
