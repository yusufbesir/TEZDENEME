/* Kurs: JavaScript'e Giris (js-1) - Adim Adim */
(function () {
  var sayac = 0;
  var K = function (sec, d) { var p = (sayac++ * 3 + 1) % sec.length; var dg = sec[d]; var diger = sec.filter(function (_, i) { return i !== d; }); diger.splice(p, 0, dg); return { s: diger, d: p }; };
  var S = function (soru, secenekler, dogru, aciklama) { var k = K(secenekler, dogru); return { tur: 'secim', soru: soru, secenekler: k.s, dogru: k.d, aciklama: aciklama }; };
  var B = function (soru, secenekler, dogru, aciklama) { var k = K(secenekler, dogru); return { tur: 'bosluk', soru: soru, secenekler: k.s, dogru: k.d, aciklama: aciklama }; };
  var Y = function (soru, cevaplar, aciklama) { return { tur: 'yaz', soru: soru, cevaplar: cevaplar, aciklama: aciklama }; };
  var R = function (soru, kelimeler, dogru, aciklama) { return { tur: 'sirala', soru: soru, kelimeler: kelimeler, dogru: dogru, aciklama: aciklama }; };
  var E = function (soru, ciftler, aciklama) { return { tur: 'eslestir', soru: soru, ciftler: ciftler, aciklama: aciklama }; };

  var kurs = {
    id: 'js-1',
    ad: 'JavaScript\'e Giriş',
    aciklama: 'Barkod ve stok örnekleriyle programlamanın temelini ve DOM\'u öğren.',
    dil: 'tr',
    uniteler: [
      {
        id: 'js-1-u1',
        ad: 'Değişken, tür ve koşul',
        dersler: [
          {
            id: 'js-1-u1-d1',
            ad: 'Değişken ve veri türü',
            alistirmalar: [
              S('Değeri sonradan değişmeyecek bir değişken nasıl tanımlanır?', ['const barkod = "123";', 'let barkod = "123";', 'var barkod;', 'int barkod = "123";'], 0, 'const sabit tanımlar; yeniden atama yapılamaz.'),
              S('let stok = 5; satırından sonra stok hangi türdedir?', ['number', 'string', 'boolean', 'array'], 0, 'Tırnaksız sayı number türündedir.'),
              S('"42" hangi türdedir?', ['string', 'number', 'boolean', 'object'], 0, 'Tırnak içindeki değer metindir (string).'),
              B('___ fiyat = 25; fiyat sonra değişebilir.', ['let', 'int', 'set', 'num'], 0, 'Değişebilen değişken let ile tanımlanır.'),
              B('let aktif = ___; mantıksal bir değerdir.', ['true', 'dogru', '"evet"', 'yes'], 0, 'Boolean değerleri true ve false\'tur.'),
              Y('"abc" ifadesinin veri türünün adını İngilizce yaz.', ['string'], 'Metin türü string olarak adlandırılır.'),
              R('Değişken tanımını sırala.', ['=', 'adet', 'let', '3;'], ['let', 'adet', '=', '3;'], 'Önce let, sonra ad, eşittir, değer gelir.'),
              E('Değeri türüyle eşleştir.', [['"selam"', 'string'], ['12', 'number'], ['true', 'boolean'], ['null', 'boş değer']], 'Her değerin bir türü vardır.'),
              S('typeof 7 ifadesinin sonucu nedir?', ['"number"', '"seven"', '"digit"', '"int"'], 0, 'typeof türün adını metin olarak verir.')
            ]
          },
          {
            id: 'js-1-u1-d2',
            ad: 'Koşullar',
            alistirmalar: [
              S('Bir koşula göre kod çalıştıran yapı hangisidir?', ['if', 'for', 'let', 'return'], 0, 'if koşul doğruysa bloğu çalıştırır.'),
              S('Eşitliği tür dahil denetleyen operatör hangisidir?', ['===', '=', '==>', '=:'], 0, '=== değer ve türü birlikte karşılaştırır, = ise atama yapar.'),
              S('5 > 3 ifadesinin sonucu nedir?', ['true', 'false', '5', 'undefined'], 0, '5, 3\'ten büyük olduğu için sonuç true olur.'),
              B('if (stok ___ 0) { yaz("Tükendi"); } stok sıfırsa çalışsın.', ['===', '=', '=>', '!'], 0, 'Karşılaştırma için === kullanılır.'),
              B('if (a > 5) { ... } ___ { ... } koşul yanlışsa çalışan bölüm.', ['else', 'then', 'otherwise', 'elif'], 0, 'JavaScript\'te alternatif dal else ile yazılır.'),
              Y('"Hem a hem b doğru" anlamındaki mantıksal operatörü yaz.', ['&&'], '&& (ve) iki koşul da doğruysa true verir.'),
              R('Koşul yapısını sırala.', ['}', 'if (x > 0) {', 'yaz("pozitif");'], ['if (x > 0) {', 'yaz("pozitif");', '}'], 'if satırı, gövde, kapanış parantezi.'),
              E('Operatörü anlamıyla eşleştir.', [['&&', 've'], ['||', 'veya'], ['!', 'değil'], ['!==', 'eşit değil']], 'Mantıksal operatörler koşulları birleştirir.'),
              S('let n = 4; n % 2 === 0 ifadesi neyi sınar?', ['Sayının çift olduğunu', 'Sayının yüzdesini', 'Sayının tek olduğunu', 'Sayının 2 katını'], 0, '% kalanı verir; kalan 0 ise sayı çifttir.')
            ]
          }
        ]
      },
      {
        id: 'js-1-u2',
        ad: 'Döngü, fonksiyon ve veri',
        dersler: [
          {
            id: 'js-1-u2-d1',
            ad: 'Döngüler ve fonksiyonlar',
            alistirmalar: [
              S('Belirli sayıda tekrar için en yaygın döngü hangisidir?', ['for', 'if', 'else', 'switch2'], 0, 'for sayacı olan tekrarlar için uygundur.'),
              S('for (let i = 0; i < 3; i++) döngüsü kaç kez çalışır?', ['3', '2', '4', '0'], 0, 'i değeri 0, 1, 2 için çalışır, toplam 3 kez.'),
              S('Fonksiyon nasıl tanımlanır?', ['function topla(a, b) { return a + b; }', 'topla = function a b', 'def topla(a, b)', 'func topla: a, b'], 0, 'JavaScript\'te function anahtar sözcüğü kullanılır.'),
              B('function karesi(x) { ___ x * x; }', ['return', 'give', 'back', 'out'], 0, 'return değeri çağıran yere döndürür.'),
              B('let i = 0; ___ (i < 3) { i++; }', ['while', 'when', 'until', 'loop'], 0, 'while koşul doğru olduğu sürece tekrar eder.'),
              Y('i değerini bir artıran kısa yazımı yaz (i ile).', ['i++'], 'i++ değeri bir artırır.'),
              R('Fonksiyonu sırala.', ['}', 'return 1;', 'function bir() {'], ['function bir() {', 'return 1;', '}'], 'Önce tanım satırı, gövde, kapanış.'),
              E('Anahtar sözcüğü görevi ile eşleştir.', [['for', 'Sayaçlı döngü'], ['while', 'Koşullu döngü'], ['function', 'Fonksiyon tanımı'], ['return', 'Değer döndürme']], 'Bu sözcükler programın akışını yönetir.'),
              S('topla(2, 3) çağrısı function topla(a, b) { return a + b; } için ne verir?', ['5', '23', '2', 'undefined'], 0, 'Sayılar toplanır, sonuç 5 olur.')
            ]
          },
          {
            id: 'js-1-u2-d2',
            ad: 'Dizi ve nesne',
            alistirmalar: [
              S('Dizi nasıl yazılır?', ['["a", "b", "c"]', '{a, b, c}', '(a, b, c)', '<a, b, c>'], 0, 'Diziler köşeli parantez içindedir.'),
              S('["x", "y", "z"][0] değeri nedir?', ['"x"', '"y"', '"z"', 'undefined'], 0, 'Dizi indeksi 0\'dan başlar.'),
              S('urun = { ad: "Kalem", fiyat: 5 }; ifadesinde urun.fiyat nedir?', ['5', '"Kalem"', 'fiyat', 'undefined'], 0, 'Nesne özelliğine nokta ile erişilir.'),
              B('let kodlar = ["A", "B"]; kodlar.___("C"); diziye sona eleman ekler.', ['push', 'add', 'append', 'put'], 0, 'push sona eleman ekler.'),
              B('let n = ["a", "b", "c"].___; sonuç 3 olur.', ['length', 'size', 'count', 'len'], 0, 'length dizideki eleman sayısıdır.'),
              Y('Dizideki her elemanı dolaşan ve her biri için fonksiyon çağıran yöntemin adını yaz.', ['forEach', 'foreach'], 'forEach her eleman için verilen fonksiyonu çalıştırır.'),
              R('Nesne tanımını sırala.', ['}', 'ad: "Pil"', 'let urun = {'], ['let urun = {', 'ad: "Pil"', '}'], 'Önce açılış, sonra özellik, en sonda kapanış.'),
              E('Yapıyı yazımı ile eşleştir.', [['Dizi', '[1, 2]'], ['Nesne', '{ a: 1 }'], ['Metin', '"a"'], ['Sayı', '1']], 'Dizi köşeli, nesne süslü parantez kullanır.'),
              S('urun["ad"] ifadesi neye eşdeğerdir?', ['urun.ad', 'urun(ad)', 'urun[ad]', 'urun->ad'], 0, 'Nesne özelliğine nokta ya da köşeli parantezle erişilir.')
            ]
          }
        ]
      },
      {
        id: 'js-1-u3',
        ad: 'DOM ve olaylar',
        dersler: [
          {
            id: 'js-1-u3-d1',
            ad: 'DOM\'da öğe seçme ve değiştirme',
            alistirmalar: [
              S('DOM nedir?', ['Sayfanın JavaScript ile erişilebilen ağaç yapısı', 'Bir CSS dosyası', 'Bir veritabanı', 'Bir tarayıcı adı'], 0, 'DOM, sayfa öğelerinin nesne ağacıdır.'),
              S('id\'si "sonuc" olan öğeyi hangisi seçer?', ['document.getElementById("sonuc")', 'document.sonuc', 'get("#sonuc")', 'document.id("sonuc")'], 0, 'getElementById, id\'ye göre öğeyi bulur.'),
              S('CSS seçici ile ilk eşleşen öğeyi hangisi bulur?', ['document.querySelector', 'document.findAll', 'document.pick', 'document.css'], 0, 'querySelector bir CSS seçici alır ve ilk eşleşeni döndürür.'),
              B('let el = document.getElementById("kod"); el.___ = "ABC-123"; yazıyı değiştirir.', ['textContent', 'text2', 'write', 'say'], 0, 'textContent bir öğenin metnini güvenle değiştirir.'),
              B('el.classList.___("gizli"); öğeye sınıf ekler.', ['add', 'push', 'put', 'new'], 0, 'classList.add sınıf ekler, remove çıkarır.'),
              Y('Yeni bir HTML öğesi oluşturan document yönteminin adını yaz.', ['createElement', 'document.createElement'], 'createElement belirtilen etiketten yeni öğe üretir.'),
              R('Öğeyi seçip metnini değiştiren iki satırı sırala.', ['el.textContent = "Selam";', 'let el = document.querySelector("h1");'], ['let el = document.querySelector("h1");', 'el.textContent = "Selam";'], 'Önce öğe seçilir, sonra özellik değiştirilir.'),
              E('Yöntemi görevi ile eşleştir.', [['getElementById', 'id ile seç'], ['querySelector', 'CSS seçici ile seç'], ['createElement', 'Yeni öğe üret'], ['appendChild', 'Öğeyi ekle']], 'DOM yöntemleri sayfayı okur ve değiştirir.'),
              S('Kullanıcıdan gelen metni sayfaya güvenle basmak için hangisi tercih edilir?', ['textContent', 'innerHTML', 'outerHTML', 'document.write'], 0, 'textContent metni HTML olarak yorumlamaz; kod enjeksiyonunu önler.')
            ]
          },
          {
            id: 'js-1-u3-d2',
            ad: 'Olaylar',
            alistirmalar: [
              S('Düğmeye tıklanınca çalışacak kod nasıl bağlanır?', ['düğme.addEventListener("click", islev)', 'düğme.click = islev()', 'düğme.on("tikla")', 'düğme.run(islev)'], 0, 'addEventListener bir olaya dinleyici bağlar.'),
              S('Form gönderildiğinde sayfanın yenilenmesini ne durdurur?', ['event.preventDefault()', 'event.stop()', 'return null', 'form.cancel'], 0, 'preventDefault olayın varsayılan davranışını iptal eder.'),
              S('Tuşa basma olayının adı nedir?', ['keydown', 'press2', 'typed', 'keyclick'], 0, 'keydown, tuşa basıldığı an tetiklenir.'),
              B('btn.addEventListener("___", function () { ... });', ['click', 'tik', 'push', 'tap'], 0, 'Tıklama olayının adı click\'tir.'),
              B('document.addEventListener("___", baslat); sayfa DOM\'u hazır olunca çalışır.', ['DOMContentLoaded', 'ready', 'start', 'load2'], 0, 'DOMContentLoaded HTML ayrıştırıldığında tetiklenir.'),
              Y('Olay işleyicisine gelen bilgi nesnesine genelde verilen kısa adı yaz (e ile başlayan sözcük).', ['event', 'e'], 'Olay nesnesi genelde event ya da e olarak adlandırılır.'),
              R('Tıklama dinleyicisini sırala.', ['});', 'btn.addEventListener("click", function () {', 'sayac++;'], ['btn.addEventListener("click", function () {', 'sayac++;', '});'], 'Dinleyici açılır, gövde yazılır, kapatılır.'),
              E('Olayı tetikleyen eylem ile eşleştir.', [['click', 'Tıklama'], ['input', 'Alana yazma'], ['submit', 'Form gönderme'], ['keydown', 'Tuşa basma']], 'Her olay türü farklı bir kullanıcı eylemine karşılık gelir.'),
              S('Alana yazılan değeri okumak için hangisi kullanılır?', ['alan.value', 'alan.text', 'alan.say', 'alan.get'], 0, 'Girdi alanlarının içeriği value özelliğinde tutulur.')
            ]
          }
        ]
      }
    ]
  };

  if (typeof window !== 'undefined') { (window.ICERIK = window.ICERIK || []).push(kurs); }
  if (typeof module === 'object' && module.exports) { module.exports = kurs; }
})();
