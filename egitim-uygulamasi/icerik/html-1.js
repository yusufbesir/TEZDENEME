/* Kurs: HTML'ye Giris (html-1) - Adim Adim */
(function () {
  var sayac = 0;
  var K = function (sec, d) { var p = (sayac++ * 3 + 1) % sec.length; var dg = sec[d]; var diger = sec.filter(function (_, i) { return i !== d; }); diger.splice(p, 0, dg); return { s: diger, d: p }; };
  var S = function (soru, secenekler, dogru, aciklama) { var k = K(secenekler, dogru); return { tur: 'secim', soru: soru, secenekler: k.s, dogru: k.d, aciklama: aciklama }; };
  var B = function (soru, secenekler, dogru, aciklama) { var k = K(secenekler, dogru); return { tur: 'bosluk', soru: soru, secenekler: k.s, dogru: k.d, aciklama: aciklama }; };
  var Y = function (soru, cevaplar, aciklama) { return { tur: 'yaz', soru: soru, cevaplar: cevaplar, aciklama: aciklama }; };
  var R = function (soru, kelimeler, dogru, aciklama) { return { tur: 'sirala', soru: soru, kelimeler: kelimeler, dogru: dogru, aciklama: aciklama }; };
  var E = function (soru, ciftler, aciklama) { return { tur: 'eslestir', soru: soru, ciftler: ciftler, aciklama: aciklama }; };

  var kurs = {
    id: 'html-1',
    ad: 'HTML\'ye Giriş',
    aciklama: 'Bir ürün etiketi sayfasını adım adım kurarak HTML\'nin temelini öğren.',
    dil: 'tr',
    uniteler: [
      {
        id: 'html-1-u1',
        ad: 'Etiketler ve metin',
        dersler: [
          {
            id: 'html-1-u1-d1',
            ad: 'Etiket nedir? Başlık ve paragraf',
            alistirmalar: [
              S('HTML etiketleri hangi işaretlerin arasına yazılır?', ['< ve >', '{ ve }', '( ve )', '[ ve ]'], 0, 'Etiketler küçüktür ve büyüktür işaretleri arasında yazılır: <p>.'),
              S('Bir ürün adını en büyük başlık olarak yazmak için hangi etiket uygundur?', ['<h6>', '<h1>', '<p>', '<b>'], 1, 'h1 en önemli ve en büyük başlıktır, h6 en küçüğüdür.'),
              S('Paragraf için hangi etiket kullanılır?', ['<para>', '<text>', '<p>', '<pg>'], 2, 'Paragraf etiketi tek harfli <p> etiketidir.'),
              B('Etiket çiftinde kapanış etiketi şöyle yazılır: <p>Merhaba<___p>', ['/', '\\', '*', '#'], 0, 'Kapanış etiketi, etiket adından önce bir eğik çizgi (/) alır.'),
              B('<___>Barkod Okuyucu</h2> satırında açılış etiketi nedir?', ['h2', 'h1', '/h2', 'p'], 0, 'Kapanış etiketi </h2> olduğu için açılış etiketi <h2> olmalı.'),
              Y('Barkod Etiketi metnini ana başlık yapan etiketin adını yaz (sadece ad, işaret yok).', ['h1'], 'Ana başlık için h1 kullanılır.'),
              R('Doğru yazılmış paragrafı sırala.', ['</p>', 'Stokta', '<p>', 'var'], ['<p>', 'Stokta', 'var', '</p>'], 'Önce açılış etiketi, sonra metin, en sonda kapanış etiketi gelir.'),
              E('Etiketleri anlamlarıyla eşleştir.', [['<h1>', 'Ana başlık'], ['<p>', 'Paragraf'], ['<br>', 'Satır sonu'], ['<hr>', 'Yatay çizgi']], 'br satırı keser, hr yatay çizgi çizer.'),
              S('Aşağıdakilerden hangisi kapanış etiketi gerektirmez?', ['<p>', '<h1>', '<br>', '<h3>'], 2, 'br gibi boş etiketlerin kapanışı yoktur.')
            ]
          },
          {
            id: 'html-1-u1-d2',
            ad: 'Liste, bağlantı ve görsel',
            alistirmalar: [
              S('Sıra numaralı bir liste için hangi etiket kullanılır?', ['<ul>', '<ol>', '<li>', '<dl>'], 1, 'ol sıralı listedir (1, 2, 3...). ul işaretli listedir.'),
              S('Liste maddesi hangi etiketle yazılır?', ['<li>', '<item>', '<ls>', '<td>'], 0, 'Hem ul hem ol içindeki maddeler <li> ile yazılır.'),
              S('Bağlantının gideceği adres hangi özellikte yazılır?', ['src', 'href', 'alt', 'link'], 1, 'a etiketinde adres href özelliğine yazılır.'),
              B('<img ___="barkod.png" alt="Barkod">', ['src', 'href', 'url', 'path'], 0, 'Görselin dosya yolu img etiketinde src özelliğiyle verilir.'),
              B('<a href="urun.html">Ürüne git___a>', ['</', '<', '/', '<\\'], 0, 'Bağlantı </a> ile kapatılır.'),
              Y('Görsel yüklenmezse veya ekran okuyucu kullanılırsa okunan açıklama özelliğinin adını yaz.', ['alt'], 'alt özelliği görselin metin karşılığıdır.'),
              R('Bir bağlantıyı doğru sırada yaz.', ['Ana sayfa', '<a href="/">', '</a>'], ['<a href="/">', 'Ana sayfa', '</a>'], 'Açılış etiketi, bağlantı metni, kapanış etiketi sırası izlenir.'),
              E('Etiketi görevi ile eşleştir.', [['<ul>', 'İşaretli liste'], ['<ol>', 'Numaralı liste'], ['<a>', 'Bağlantı'], ['<img>', 'Görsel']], 'ul noktalı, ol numaralı liste yapar.'),
              S('Aşağıdakilerden hangisi geçerli bir görsel etiketidir?', ['<img src="a.png" alt="A">', '<image href="a.png">', '<img>a.png</img>', '<picture="a.png">'], 0, 'img etiketi src ve alt özelliklerini alır, içerik taşımaz.')
            ]
          }
        ]
      },
      {
        id: 'html-1-u2',
        ad: 'Form ve tablo',
        dersler: [
          {
            id: 'html-1-u2-d1',
            ad: 'Form elemanları',
            alistirmalar: [
              S('Bilgi toplamak için tüm alanları saran etiket hangisidir?', ['<form>', '<box>', '<input>', '<fieldset2>'], 0, 'Alanlar <form> etiketinin içine konur.'),
              S('Tek satırlık metin kutusu hangi tür ile yapılır?', ['<input type="text">', '<input type="line">', '<text>', '<input type="big">'], 0, 'Metin kutusu için type="text" kullanılır.'),
              S('label etiketi ne işe yarar?', ['Alanın adını belirtir', 'Rengi değiştirir', 'Sayfayı yeniler', 'Tablo çizer'], 0, 'label bir alana ad verir ve tıklanınca alana odaklanır.'),
              B('<input type="___" name="parola">', ['password', 'hidden2', 'star', 'secret'], 0, 'Yazılanı noktalarla gizleyen tür password türüdür.'),
              B('<button type="___">Gönder</button> düğmesi formu gönderir.', ['submit', 'send', 'go', 'post'], 0, 'Formu göndermek için type="submit" kullanılır.'),
              Y('Bir alanın boş bırakılmasını engelleyen mantıksal özelliğin adını yaz.', ['required'], 'required alanı zorunlu yapar.'),
              R('Etiketli bir alanı sırala.', ['<input id="kod">', '<label for="kod">', 'Barkod', '</label>'], ['<label for="kod">', 'Barkod', '</label>', '<input id="kod">'], 'Önce label ve metni, sonra for ile bağlanan input gelir.'),
              E('Input türünü işlevi ile eşleştir.', [['text', 'Düz yazı'], ['number', 'Sayı'], ['email', 'E-posta'], ['checkbox', 'Onay kutusu']], 'type değeri tarayıcının alanı nasıl göstereceğini belirler.'),
              S('label ile input\'u bağlamak için for değeri neye eşit olmalıdır?', ['input\'un id değerine', 'input\'un type değerine', 'form\'un adına', 'sayfa başlığına'], 0, 'for değeri, ilgili alanın id değeriyle aynı olmalıdır.')
            ]
          },
          {
            id: 'html-1-u2-d2',
            ad: 'Tablo',
            alistirmalar: [
              S('Tabloyu başlatan etiket hangisidir?', ['<table>', '<tab>', '<grid>', '<tr>'], 0, 'Tablo <table> ile başlar.'),
              S('Tablodaki bir satır hangi etiketle yazılır?', ['<tr>', '<td>', '<th>', '<row>'], 0, 'tr satırı (table row) temsil eder.'),
              S('Başlık hücresi için hangi etiket uygundur?', ['<th>', '<td>', '<hd>', '<tt>'], 0, 'th başlık hücresidir, genelde kalın ve ortalı görünür.'),
              B('<tr><___>Ürün</td><td>Fiyat</td></tr> satırında eksik etiket nedir?', ['td', 'tr', 'th2', 'table'], 0, 'Veri hücreleri <td> ile açılır, </td> ile kapanır.'),
              B('Bir hücreyi iki sütun genişliğinde yapmak için <td ___="2">.', ['colspan', 'rowspan', 'width2', 'span'], 0, 'colspan yatayda birleştirir, rowspan dikeyde.'),
              Y('Hücreyi iki satır yüksekliğinde yapan özelliğin adını yaz.', ['rowspan'], 'rowspan hücreyi satırlar boyunca uzatır.'),
              R('Bir tablo satırını doğru sırada yaz.', ['<td>5 TL</td>', '</tr>', '<tr>', '<td>Kalem</td>'], ['<tr>', '<td>Kalem</td>', '<td>5 TL</td>', '</tr>'], 'Satır tr ile başlar, hücreler içinde dizilir, tr ile biter.'),
              E('Tablo etiketini anlamıyla eşleştir.', [['<table>', 'Tablo'], ['<tr>', 'Satır'], ['<td>', 'Veri hücresi'], ['<th>', 'Başlık hücresi']], 'Etiket adlarının kısaltmalarını hatırla: table row, table data, table header.'),
              S('Tablo sütun düzeni için hangisi yanlış kullanımdır?', ['Sayfa yerleşimini tabloyla yapmak', 'Fiyat listesini tabloda göstermek', 'th ile başlık vermek', 'caption ile tabloya ad vermek'], 0, 'Tablo veri göstermek içindir; sayfa yerleşimi için CSS kullanılır.')
            ]
          }
        ]
      },
      {
        id: 'html-1-u3',
        ad: 'Anlamlı yapı',
        dersler: [
          {
            id: 'html-1-u3-d1',
            ad: 'Sayfa iskeleti',
            alistirmalar: [
              S('Bir HTML5 belgesinin ilk satırı genelde nedir?', ['<!DOCTYPE html>', '<html5>', '<start>', '<head>'], 0, 'DOCTYPE tarayıcıya belgenin HTML5 olduğunu söyler.'),
              S('Sayfa başlığı sekmede görünsün istiyorsan hangi etiketi kullanırsın?', ['<title>', '<h1>', '<header>', '<tab>'], 0, 'title head içinde yer alır ve sekme adını belirler.'),
              S('Kullanıcıya görünen içerik hangi etiketin içine yazılır?', ['<body>', '<head>', '<meta>', '<title>'], 0, 'Görünen her şey body içindedir.'),
              B('<html ___="tr"> ile sayfa dili belirtilir.', ['lang', 'dil', 'language', 'text'], 0, 'lang özelliği sayfanın dilini belirtir.'),
              B('<meta ___="UTF-8"> Türkçe karakterlerin düzgün görünmesini sağlar.', ['charset', 'code', 'font', 'lang'], 0, 'charset karakter kodlamasını belirler.'),
              Y('Gezinti bağlantılarını saran anlamlı etiketin adını yaz (sadece ad).', ['nav'], 'nav ana gezinme bağlantıları içindir.'),
              R('Basit bir belgenin ana bölümlerini sırala.', ['<body>', '<html>', '<head>'], ['<html>', '<head>', '<body>'], 'html kökü, head üst bilgiyi, body içeriği taşır.'),
              E('Bölümü etiketi ile eşleştir.', [['Üst bilgi', '<header>'], ['Ana içerik', '<main>'], ['Alt bilgi', '<footer>'], ['Gezinme', '<nav>']], 'Anlamlı etiketler bölümün görevini belli eder.'),
              S('head içine ne konur?', ['Sayfa hakkında bilgi (title, meta)', 'Ana içerik metni', 'Resimler', 'Tablolar'], 0, 'head görünmeyen bilgi içindir: başlık, kodlama, stil bağlantısı.')
            ]
          },
          {
            id: 'html-1-u3-d2',
            ad: 'Anlamlı etiketler',
            alistirmalar: [
              S('Tek başına anlam taşıyan bağımsız bir yazı (haber, ürün kartı) için hangi etiket uygundur?', ['<article>', '<div>', '<span>', '<aside>'], 0, 'article kendi başına bir bütün olan içeriktir.'),
              S('Ana içeriğin yanındaki yan bilgi kutusu için hangi etiket anlamlıdır?', ['<aside>', '<main>', '<footer>', '<title>'], 0, 'aside ana içerikle dolaylı ilgili yan içeriktir.'),
              S('Sayfada main etiketi kaç kez kullanılmalıdır?', ['Bir kez', 'Her bölümde', 'Hiç', 'Beş kez'], 0, 'Sayfanın ana içeriği tektir, main bir kez kullanılır.'),
              B('Konuya göre gruplanan bölüm için <___> kullanılır.', ['section', 'span', 'br', 'img'], 0, 'section tematik bir bölümü gruplar.'),
              B('Anlamı olmayan genel kutu <___> etiketidir.', ['div', 'article', 'nav', 'main'], 0, 'div anlamsız bir kaptır; uygun anlamlı etiket yoksa kullanılır.'),
              Y('Satır içi anlamsız kap etiketinin adını yaz.', ['span'], 'span metnin bir parçasını sarmak için kullanılır.'),
              R('Basit bir sayfa gövdesini sırala.', ['<footer>', '<main>', '<header>'], ['<header>', '<main>', '<footer>'], 'Genel düzen: üst bilgi, ana içerik, alt bilgi.'),
              E('Etiketi doğru kullanım ile eşleştir.', [['<header>', 'Logo ve başlık'], ['<nav>', 'Menü bağlantıları'], ['<article>', 'Ürün kartı'], ['<footer>', 'İletişim ve telif']], 'Anlamlı etiketler arama motorlarına ve ekran okuyuculara yardım eder.'),
              S('Anlamlı etiketlerin faydası nedir?', ['Erişilebilirlik ve okunabilirlik', 'Sayfayı otomatik renklendirmek', 'Dosyayı küçültmek', 'Sunucuyu hızlandırmak'], 0, 'Anlamlı yapı, makinelerin ve insanların sayfayı daha iyi anlamasını sağlar.')
            ]
          }
        ]
      }
    ]
  };

  if (typeof window !== 'undefined') { (window.ICERIK = window.ICERIK || []).push(kurs); }
  if (typeof module === 'object' && module.exports) { module.exports = kurs; }
})();
