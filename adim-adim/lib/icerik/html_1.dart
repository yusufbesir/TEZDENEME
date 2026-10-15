import '../model/icerik.dart';

/// HTML'ye Giriş
const Kurs html1 = Kurs(
  id: 'html-1',
  ad: 'HTML\'ye Giriş',
  aciklama:
      'Bir ürün etiketi sayfasını adım adım kurarak HTML\'nin temelini öğren.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'html-1-u1',
      ad: 'Etiketler ve metin',
      dersler: [
        Ders(
          id: 'html-1-u1-d1',
          ad: 'Etiket nedir? Başlık ve paragraf',
          alistirmalar: [
            Secim(
              soru: 'HTML etiketleri hangi işaretlerin arasına yazılır?',
              secenekler: ['{ ve }', '< ve >', '( ve )', '[ ve ]'],
              dogru: 1,
              aciklama:
                  'Etiketler küçüktür ve büyüktür işaretleri arasında yazılır: <p>.',
            ),
            Secim(
              soru:
                  'Bir ürün adını en büyük başlık olarak yazmak için hangi etiket uygundur?',
              secenekler: ['<h1>', '<h6>', '<p>', '<b>'],
              dogru: 0,
              aciklama: 'h1 en önemli ve en büyük başlıktır, h6 en küçüğüdür.',
            ),
            Secim(
              soru: 'Paragraf için hangi etiket kullanılır?',
              secenekler: ['<para>', '<text>', '<pg>', '<p>'],
              dogru: 3,
              aciklama: 'Paragraf etiketi tek harfli <p> etiketidir.',
            ),
            Bosluk(
              soru:
                  'Etiket çiftinde kapanış etiketi şöyle yazılır: <p>Merhaba<___p>',
              secenekler: ['\\', '*', '/', '#'],
              dogru: 2,
              aciklama:
                  'Kapanış etiketi, etiket adından önce bir eğik çizgi (/) alır.',
            ),
            Bosluk(
              soru: '<___>Barkod Okuyucu</h2> satırında açılış etiketi nedir?',
              secenekler: ['h1', 'h2', '/h2', 'p'],
              dogru: 1,
              aciklama:
                  'Kapanış etiketi </h2> olduğu için açılış etiketi <h2> olmalı.',
            ),
            Yaz(
              soru:
                  'Barkod Etiketi metnini ana başlık yapan etiketin adını yaz (sadece ad, işaret yok).',
              cevaplar: ['h1'],
              aciklama: 'Ana başlık için h1 kullanılır.',
            ),
            Sirala(
              soru: 'Doğru yazılmış paragrafı sırala.',
              kelimeler: ['</p>', 'Stokta', '<p>', 'var'],
              dogru: ['<p>', 'Stokta', 'var', '</p>'],
              aciklama:
                  'Önce açılış etiketi, sonra metin, en sonda kapanış etiketi gelir.',
            ),
            Eslestir(
              soru: 'Etiketleri anlamlarıyla eşleştir.',
              ciftler: [
                (sol: '<h1>', sag: 'Ana başlık'),
                (sol: '<p>', sag: 'Paragraf'),
                (sol: '<br>', sag: 'Satır sonu'),
                (sol: '<hr>', sag: 'Yatay çizgi'),
              ],
              aciklama: 'br satırı keser, hr yatay çizgi çizer.',
            ),
            Secim(
              soru: 'Aşağıdakilerden hangisi kapanış etiketi gerektirmez?',
              secenekler: ['<br>', '<p>', '<h1>', '<h3>'],
              dogru: 0,
              aciklama: 'br gibi boş etiketlerin kapanışı yoktur.',
            ),
            Kod(
              soru: 'Boşluğa hangi etiket gelmelidir?',
              kod: '<h1>Barkod Etiketi</h1>\n<___>Ürün stokta var.</p>',
              secenekler: ['p', 'h2', 'li'],
              dogru: 0,
              dil: 'html',
              aciklama:
                  'Kapanış etiketi </p> olduğu için açılış etiketi <p> olmalıdır.',
            ),
          ],
        ),
        Ders(
          id: 'html-1-u1-d2',
          ad: 'Liste, bağlantı ve görsel',
          alistirmalar: [
            Secim(
              soru: 'Sıra numaralı bir liste için hangi etiket kullanılır?',
              secenekler: ['<ul>', '<li>', '<dl>', '<ol>'],
              dogru: 3,
              aciklama:
                  'ol sıralı listedir (1, 2, 3...). ul işaretli listedir.',
            ),
            Secim(
              soru: 'Liste maddesi hangi etiketle yazılır?',
              secenekler: ['<item>', '<ls>', '<li>', '<td>'],
              dogru: 2,
              aciklama: 'Hem ul hem ol içindeki maddeler <li> ile yazılır.',
            ),
            Secim(
              soru: 'Bağlantının gideceği adres hangi özellikte yazılır?',
              secenekler: ['src', 'href', 'alt', 'link'],
              dogru: 1,
              aciklama: 'a etiketinde adres href özelliğine yazılır.',
            ),
            Bosluk(
              soru: '<img ___="barkod.png" alt="Barkod">',
              secenekler: ['src', 'href', 'url', 'path'],
              dogru: 0,
              aciklama:
                  'Görselin dosya yolu img etiketinde src özelliğiyle verilir.',
            ),
            Bosluk(
              soru: '<a href="urun.html">Ürüne git___a>',
              secenekler: ['<', '/', '<\\', '</'],
              dogru: 3,
              aciklama: 'Bağlantı </a> ile kapatılır.',
            ),
            Yaz(
              soru:
                  'Görsel yüklenmezse veya ekran okuyucu kullanılırsa okunan açıklama özelliğinin adını yaz.',
              cevaplar: ['alt'],
              aciklama: 'alt özelliği görselin metin karşılığıdır.',
            ),
            Sirala(
              soru: 'Bir bağlantıyı doğru sırada yaz.',
              kelimeler: ['Ana sayfa', '<a href="/">', '</a>'],
              dogru: ['<a href="/">', 'Ana sayfa', '</a>'],
              aciklama:
                  'Açılış etiketi, bağlantı metni, kapanış etiketi sırası izlenir.',
            ),
            Eslestir(
              soru: 'Etiketi görevi ile eşleştir.',
              ciftler: [
                (sol: '<ul>', sag: 'İşaretli liste'),
                (sol: '<ol>', sag: 'Numaralı liste'),
                (sol: '<a>', sag: 'Bağlantı'),
                (sol: '<img>', sag: 'Görsel'),
              ],
              aciklama: 'ul noktalı, ol numaralı liste yapar.',
            ),
            Secim(
              soru: 'Aşağıdakilerden hangisi geçerli bir görsel etiketidir?',
              secenekler: [
                '<image href="a.png">',
                '<img>a.png</img>',
                '<img src="a.png" alt="A">',
                '<picture="a.png">',
              ],
              dogru: 2,
              aciklama:
                  'img etiketi src ve alt özelliklerini alır, içerik taşımaz.',
            ),
            Kod(
              soru: 'Liste maddesinin etiketini tamamla.',
              kod: '<ul>\n  <___>Kalem</li>\n  <li>Defter</li>\n</ul>',
              secenekler: ['li', 'ul', 'p'],
              dogru: 0,
              dil: 'html',
              aciklama: 'Liste maddeleri <li> ile yazılır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'html-1-u2',
      ad: 'Form ve tablo',
      dersler: [
        Ders(
          id: 'html-1-u2-d1',
          ad: 'Form elemanları',
          alistirmalar: [
            Secim(
              soru: 'Bilgi toplamak için tüm alanları saran etiket hangisidir?',
              secenekler: ['<box>', '<form>', '<input>', '<section>'],
              dogru: 1,
              aciklama: 'Alanlar <form> etiketinin içine konur.',
            ),
            Secim(
              soru: 'Tek satırlık metin kutusu hangi tür ile yapılır?',
              secenekler: [
                '<input type="text">',
                '<input type="line">',
                '<text>',
                '<input type="big">',
              ],
              dogru: 0,
              aciklama: 'Metin kutusu için type="text" kullanılır.',
            ),
            Secim(
              soru: 'label etiketi ne işe yarar?',
              secenekler: [
                'Rengi değiştirir',
                'Sayfayı yeniler',
                'Tablo çizer',
                'Alanın adını belirtir',
              ],
              dogru: 3,
              aciklama:
                  'label bir alana ad verir ve tıklanınca alana odaklanır.',
            ),
            Bosluk(
              soru:
                  'Yazılanı noktalarla gizleyen alan: <input type="___" name="parola">',
              secenekler: ['hidden', 'star', 'password', 'secret'],
              dogru: 2,
              aciklama: 'Yazılanı noktalarla gizleyen tür password türüdür.',
            ),
            Bosluk(
              soru:
                  '<button type="___">Gönder</button> düğmesi formu gönderir.',
              secenekler: ['send', 'submit', 'go', 'post'],
              dogru: 1,
              aciklama: 'Formu göndermek için type="submit" kullanılır.',
            ),
            Yaz(
              soru:
                  'Bir alanın boş bırakılmasını engelleyen mantıksal özelliğin adını yaz.',
              cevaplar: ['required'],
              aciklama: 'required alanı zorunlu yapar.',
            ),
            Sirala(
              soru: 'Etiketli bir alanı sırala.',
              kelimeler: [
                '<input id="kod">',
                '<label for="kod">',
                'Barkod',
                '</label>',
              ],
              dogru: [
                '<label for="kod">',
                'Barkod',
                '</label>',
                '<input id="kod">',
              ],
              aciklama:
                  'Önce label ve metni, sonra for ile bağlanan input gelir.',
            ),
            Eslestir(
              soru: 'Input türünü işlevi ile eşleştir.',
              ciftler: [
                (sol: 'text', sag: 'Düz yazı'),
                (sol: 'number', sag: 'Sayı'),
                (sol: 'email', sag: 'E-posta'),
                (sol: 'checkbox', sag: 'Onay kutusu'),
              ],
              aciklama:
                  'type değeri tarayıcının alanı nasıl göstereceğini belirler.',
            ),
            Secim(
              soru:
                  'label ile input\'u bağlamak için for değeri neye eşit olmalıdır?',
              secenekler: [
                'input\'un id değerine',
                'input\'un type değerine',
                'form\'un adına',
                'sayfa başlığına',
              ],
              dogru: 0,
              aciklama:
                  'for değeri, ilgili alanın id değeriyle aynı olmalıdır.',
            ),
            Kod(
              soru: 'Alanı zorunlu yapan özelliği seç.',
              kod:
                  '<form>\n  <label for="ad">Ad</label>\n  <input id="ad" type="text" ___>\n</form>',
              secenekler: ['required', 'href', 'rowspan'],
              dogru: 0,
              dil: 'html',
              aciklama: 'required, alanın boş bırakılmasını engeller.',
            ),
          ],
        ),
        Ders(
          id: 'html-1-u2-d2',
          ad: 'Tablo',
          alistirmalar: [
            Secim(
              soru: 'Tabloyu başlatan etiket hangisidir?',
              secenekler: ['<tab>', '<grid>', '<tr>', '<table>'],
              dogru: 3,
              aciklama: 'Tablo <table> ile başlar.',
            ),
            Secim(
              soru: 'Tablodaki bir satır hangi etiketle yazılır?',
              secenekler: ['<td>', '<th>', '<tr>', '<row>'],
              dogru: 2,
              aciklama: 'tr satırı (table row) temsil eder.',
            ),
            Secim(
              soru: 'Başlık hücresi için hangi etiket uygundur?',
              secenekler: ['<td>', '<th>', '<hd>', '<tt>'],
              dogru: 1,
              aciklama:
                  'th başlık hücresidir, genelde kalın ve ortalı görünür.',
            ),
            Bosluk(
              soru:
                  '<tr><___>Ürün</td><td>Fiyat</td></tr> satırında eksik etiket nedir?',
              secenekler: ['td', 'tr', 'thead', 'table'],
              dogru: 0,
              aciklama: 'Veri hücreleri <td> ile açılır, </td> ile kapanır.',
            ),
            Bosluk(
              soru:
                  'Bir hücreyi iki sütun genişliğinde yapmak için <td ___="2">.',
              secenekler: ['rowspan', 'width', 'span', 'colspan'],
              dogru: 3,
              aciklama: 'colspan yatayda birleştirir, rowspan dikeyde.',
            ),
            Yaz(
              soru:
                  'Hücreyi iki satır yüksekliğinde yapan özelliğin adını yaz.',
              cevaplar: ['rowspan'],
              aciklama: 'rowspan hücreyi satırlar boyunca uzatır.',
            ),
            Sirala(
              soru: 'Bir tablo satırını doğru sırada yaz.',
              kelimeler: ['<td>5 TL</td>', '</tr>', '<tr>', '<td>Kalem</td>'],
              dogru: ['<tr>', '<td>Kalem</td>', '<td>5 TL</td>', '</tr>'],
              aciklama:
                  'Satır tr ile başlar, hücreler içinde dizilir, tr ile biter.',
            ),
            Eslestir(
              soru: 'Tablo etiketini anlamıyla eşleştir.',
              ciftler: [
                (sol: '<table>', sag: 'Tablo'),
                (sol: '<tr>', sag: 'Satır'),
                (sol: '<td>', sag: 'Veri hücresi'),
                (sol: '<th>', sag: 'Başlık hücresi'),
              ],
              aciklama:
                  'Etiket adlarının kısaltmalarını hatırla: table row, table data, table header.',
            ),
            Secim(
              soru: 'Tablo sütun düzeni için hangisi yanlış kullanımdır?',
              secenekler: [
                'Fiyat listesini tabloda göstermek',
                'th ile başlık vermek',
                'Sayfa yerleşimini tabloyla yapmak',
                'caption ile tabloya ad vermek',
              ],
              dogru: 2,
              aciklama:
                  'Tablo veri göstermek içindir; sayfa yerleşimi için CSS kullanılır.',
            ),
            Kod(
              soru: 'Başlık hücresinin etiketini tamamla.',
              kod:
                  '<table>\n  <tr>\n    <___>Ürün</th>\n    <th>Fiyat</th>\n  </tr>\n</table>',
              secenekler: ['th', 'tr', 'table'],
              dogru: 0,
              dil: 'html',
              aciklama: 'Başlık hücresi <th> ile açılır ve </th> ile kapanır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'html-1-u3',
      ad: 'Anlamlı yapı',
      dersler: [
        Ders(
          id: 'html-1-u3-d1',
          ad: 'Sayfa iskeleti',
          alistirmalar: [
            Secim(
              soru: 'Bir HTML5 belgesinin ilk satırı genelde nedir?',
              secenekler: ['<html5>', '<!DOCTYPE html>', '<start>', '<head>'],
              dogru: 1,
              aciklama: 'DOCTYPE tarayıcıya belgenin HTML5 olduğunu söyler.',
            ),
            Secim(
              soru:
                  'Sayfa başlığı sekmede görünsün istiyorsan hangi etiketi kullanırsın?',
              secenekler: ['<title>', '<h1>', '<header>', '<tab>'],
              dogru: 0,
              aciklama: 'title head içinde yer alır ve sekme adını belirler.',
            ),
            Secim(
              soru: 'Kullanıcıya görünen içerik hangi etiketin içine yazılır?',
              secenekler: ['<head>', '<meta>', '<title>', '<body>'],
              dogru: 3,
              aciklama: 'Görünen her şey body içindedir.',
            ),
            Bosluk(
              soru: '<html ___="tr"> ile sayfa dili belirtilir.',
              secenekler: ['dil', 'language', 'lang', 'text'],
              dogru: 2,
              aciklama: 'lang özelliği sayfanın dilini belirtir.',
            ),
            Bosluk(
              soru:
                  '<meta ___="UTF-8"> Türkçe karakterlerin düzgün görünmesini sağlar.',
              secenekler: ['code', 'charset', 'font', 'lang'],
              dogru: 1,
              aciklama: 'charset karakter kodlamasını belirler.',
            ),
            Yaz(
              soru:
                  'Gezinti bağlantılarını saran anlamlı etiketin adını yaz (sadece ad).',
              cevaplar: ['nav'],
              aciklama: 'nav ana gezinme bağlantıları içindir.',
            ),
            Sirala(
              soru: 'Basit bir belgenin ana bölümlerini sırala.',
              kelimeler: ['<body>', '<html>', '<head>'],
              dogru: ['<html>', '<head>', '<body>'],
              aciklama: 'html kökü, head üst bilgiyi, body içeriği taşır.',
            ),
            Eslestir(
              soru: 'Bölümü etiketi ile eşleştir.',
              ciftler: [
                (sol: 'Üst bilgi', sag: '<header>'),
                (sol: 'Ana içerik', sag: '<main>'),
                (sol: 'Alt bilgi', sag: '<footer>'),
                (sol: 'Gezinme', sag: '<nav>'),
              ],
              aciklama: 'Anlamlı etiketler bölümün görevini belli eder.',
            ),
            Secim(
              soru: 'head içine ne konur?',
              secenekler: [
                'Sayfa hakkında bilgi (title, meta)',
                'Ana içerik metni',
                'Resimler',
                'Tablolar',
              ],
              dogru: 0,
              aciklama:
                  'head görünmeyen bilgi içindir: başlık, kodlama, stil bağlantısı.',
            ),
            Kod(
              soru: 'Sayfa dilini belirten özelliği seç.',
              kod:
                  '<!DOCTYPE html>\n<html ___="tr">\n  <head>\n    <title>Barkod</title>\n  </head>\n</html>',
              secenekler: ['lang', 'class', 'href'],
              dogru: 0,
              dil: 'html',
              aciklama: 'lang özelliği sayfanın dilini belirtir.',
            ),
          ],
        ),
        Ders(
          id: 'html-1-u3-d2',
          ad: 'Anlamlı etiketler',
          alistirmalar: [
            Secim(
              soru:
                  'Tek başına anlam taşıyan bağımsız bir yazı (haber, ürün kartı) için hangi etiket uygundur?',
              secenekler: ['<div>', '<span>', '<aside>', '<article>'],
              dogru: 3,
              aciklama: 'article kendi başına bir bütün olan içeriktir.',
            ),
            Secim(
              soru:
                  'Ana içeriğin yanındaki yan bilgi kutusu için hangi etiket anlamlıdır?',
              secenekler: ['<main>', '<footer>', '<aside>', '<title>'],
              dogru: 2,
              aciklama: 'aside ana içerikle dolaylı ilgili yan içeriktir.',
            ),
            Secim(
              soru: 'Sayfada main etiketi kaç kez kullanılmalıdır?',
              secenekler: ['Her bölümde', 'Bir kez', 'Hiç', 'Beş kez'],
              dogru: 1,
              aciklama: 'Sayfanın ana içeriği tektir, main bir kez kullanılır.',
            ),
            Bosluk(
              soru: 'Konuya göre gruplanan bölüm için <___> kullanılır.',
              secenekler: ['section', 'span', 'br', 'img'],
              dogru: 0,
              aciklama: 'section tematik bir bölümü gruplar.',
            ),
            Bosluk(
              soru: 'Anlamı olmayan genel kutu <___> etiketidir.',
              secenekler: ['article', 'nav', 'main', 'div'],
              dogru: 3,
              aciklama:
                  'div anlamsız bir kaptır; uygun anlamlı etiket yoksa kullanılır.',
            ),
            Yaz(
              soru: 'Satır içi anlamsız kap etiketinin adını yaz.',
              cevaplar: ['span'],
              aciklama: 'span metnin bir parçasını sarmak için kullanılır.',
            ),
            Sirala(
              soru: 'Basit bir sayfa gövdesini sırala.',
              kelimeler: ['<footer>', '<main>', '<header>'],
              dogru: ['<header>', '<main>', '<footer>'],
              aciklama: 'Genel düzen: üst bilgi, ana içerik, alt bilgi.',
            ),
            Eslestir(
              soru: 'Etiketi doğru kullanım ile eşleştir.',
              ciftler: [
                (sol: '<header>', sag: 'Logo ve başlık'),
                (sol: '<nav>', sag: 'Menü bağlantıları'),
                (sol: '<article>', sag: 'Ürün kartı'),
                (sol: '<footer>', sag: 'İletişim ve telif'),
              ],
              aciklama:
                  'Anlamlı etiketler arama motorlarına ve ekran okuyuculara yardım eder.',
            ),
            Secim(
              soru: 'Anlamlı etiketlerin faydası nedir?',
              secenekler: [
                'Sayfayı otomatik renklendirmek',
                'Dosyayı küçültmek',
                'Erişilebilirlik ve okunabilirlik',
                'Sunucuyu hızlandırmak',
              ],
              dogru: 2,
              aciklama:
                  'Anlamlı yapı, makinelerin ve insanların sayfayı daha iyi anlamasını sağlar.',
            ),
            Kod(
              soru: 'Ana içerik etiketini tamamla.',
              kod:
                  '<body>\n  <header>Başlık</header>\n  <___>Ana içerik</main>\n  <footer>Alt bilgi</footer>\n</body>',
              secenekler: ['main', 'nav', 'aside'],
              dogru: 0,
              dil: 'html',
              aciklama:
                  'Kapanış etiketi </main> olduğu için açılış etiketi <main> olmalıdır.',
            ),
          ],
        ),
      ],
    ),
  ],
);
