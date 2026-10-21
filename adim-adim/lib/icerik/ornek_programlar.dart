// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Örnek programlar kütüphanesi verisi (gömülü, özgün). Her dil için en az
/// 6 örnek; kod çalıştırılmaz. Kolay/orta zorluk.
library;

import '../model/ornek_program.dart';

const List<OrnekProgram> tumOrnekler = [..._html, ..._css, ..._js];

OrnekProgram? ornekBul(String id) {
  for (final o in tumOrnekler) {
    if (o.id == id) return o;
  }
  return null;
}

const List<OrnekProgram> _html = [
  OrnekProgram(
    id: 'html-ornek-1',
    dil: OrnekDili.html,
    zorluk: OrnekZorlugu.kolay,
    baslik: 'Merhaba sayfası',
    aciklama: 'En küçük tam HTML sayfası: başlık ve bir paragraf.',
    gruplar: [
      (
        kod: '<!DOCTYPE html>\n<html lang="tr">',
        not: 'Belgenin HTML5 olduğunu ve dilinin Türkçe olduğunu söyler.',
      ),
      (
        kod:
            '<head>\n  <meta charset="UTF-8">\n  <title>Merhaba</title>\n</head>',
        not:
            'Sekme başlığı ve karakter kodlaması gibi görünmeyen bilgiler burada durur.',
      ),
      (
        kod:
            '<body>\n  <h1>Merhaba!</h1>\n  <p>İlk sayfam.</p>\n</body>\n</html>',
        not:
            'Sayfada görünen her şey body içindedir: büyük başlık ve paragraf.',
      ),
    ],
  ),
  OrnekProgram(
    id: 'html-ornek-2',
    dil: OrnekDili.html,
    zorluk: OrnekZorlugu.kolay,
    baslik: 'Alışveriş listesi',
    aciklama: 'Madde işaretli bir liste ve numaralı bir liste.',
    gruplar: [
      (
        kod:
            '<h2>Alınacaklar</h2>\n<ul>\n  <li>Süt</li>\n  <li>Ekmek</li>\n  <li>Elma</li>\n</ul>',
        not: 'ul sırasız (noktalı) liste, her li bir maddedir.',
      ),
      (
        kod:
            '<h2>Yapılacak adımlar</h2>\n<ol>\n  <li>Marketi bul</li>\n  <li>Alışverişi yap</li>\n</ol>',
        not: 'ol sıralı (numaralı) listedir; sıra önemliyse bunu kullan.',
      ),
    ],
  ),
  OrnekProgram(
    id: 'html-ornek-3',
    dil: OrnekDili.html,
    zorluk: OrnekZorlugu.kolay,
    baslik: 'Bağlantı ve resim',
    aciklama: 'Başka sayfaya giden bir bağlantı ve alternatif metinli resim.',
    gruplar: [
      (
        kod: '<a href="https://example.com">Örnek siteye git</a>',
        not: 'a etiketi bağlantı yapar; href gidilecek adrestir.',
      ),
      (
        kod: '<img src="kedi.png" alt="Pencerede oturan bir kedi" width="200">',
        not:
            'img resim gösterir; alt metni ekran okuyucu için şarttır, width genişliği belirler.',
      ),
    ],
  ),
  OrnekProgram(
    id: 'html-ornek-4',
    dil: OrnekDili.html,
    zorluk: OrnekZorlugu.orta,
    baslik: 'İletişim formu',
    aciklama: 'Etiketli alanlar ve gönder düğmesi olan basit bir form.',
    gruplar: [
      (
        kod: '<form action="/gonder" method="post">',
        not: 'Form, verinin nereye ve hangi yöntemle gönderileceğini belirler.',
      ),
      (
        kod:
            '  <label for="ad">Adın</label>\n  <input id="ad" name="ad" type="text" required>',
        not:
            'label ile input for/id üzerinden bağlanır; required boş bırakılmasını engeller.',
      ),
      (
        kod:
            '  <label for="not">Mesajın</label>\n  <textarea id="not" name="mesaj" rows="4"></textarea>',
        not: 'textarea çok satırlı yazı alanıdır.',
      ),
      (
        kod: '  <button type="submit">Gönder</button>\n</form>',
        not: 'Düğmeye basılınca form gönderilir.',
      ),
    ],
  ),
  OrnekProgram(
    id: 'html-ornek-5',
    dil: OrnekDili.html,
    zorluk: OrnekZorlugu.orta,
    baslik: 'Basit tablo',
    aciklama: 'Başlık satırı ve iki veri satırı olan bir tablo.',
    gruplar: [
      (
        kod:
            '<table>\n  <thead>\n    <tr><th>Ürün</th><th>Fiyat</th></tr>\n  </thead>',
        not: 'thead başlık bölümüdür; th başlık hücresi, tr satırdır.',
      ),
      (
        kod:
            '  <tbody>\n    <tr><td>Defter</td><td>30 TL</td></tr>\n    <tr><td>Kalem</td><td>10 TL</td></tr>\n  </tbody>\n</table>',
        not: 'tbody veri satırlarını toplar; td normal hücredir.',
      ),
    ],
  ),
  OrnekProgram(
    id: 'html-ornek-6',
    dil: OrnekDili.html,
    zorluk: OrnekZorlugu.orta,
    baslik: 'Sayfa iskeleti',
    aciklama: 'Anlamlı etiketlerle üst bölüm, ana içerik ve alt bilgi.',
    gruplar: [
      (
        kod:
            '<header>\n  <h1>Günlüğüm</h1>\n  <nav><a href="#yazilar">Yazılar</a></nav>\n</header>',
        not:
            'header sayfanın üst bölümüdür; nav gezinme bağlantılarını toplar.',
      ),
      (
        kod:
            '<main id="yazilar">\n  <article>\n    <h2>İlk yazı</h2>\n    <p>Bugün HTML öğrendim.</p>\n  </article>\n</main>',
        not: 'main ana içeriği, article kendi başına anlamlı bir yazıyı sarar.',
      ),
      (
        kod: '<footer><p>Yusuf, 2026</p></footer>',
        not: 'footer alt bilgi alanıdır.',
      ),
    ],
  ),
];

const List<OrnekProgram> _css = [
  OrnekProgram(
    id: 'css-ornek-1',
    dil: OrnekDili.css,
    zorluk: OrnekZorlugu.kolay,
    baslik: 'Renk ve yazı tipi',
    aciklama: 'Sayfanın arka planını ve başlık rengini değiştirir.',
    gruplar: [
      (
        kod:
            'body {\n  background-color: #f5f5f0;\n  font-family: Arial, sans-serif;\n}',
        not:
            'body seçicisi tüm sayfayı etkiler: açık gri zemin ve Arial yazı tipi.',
      ),
      (
        kod: 'h1 {\n  color: darkblue;\n  text-align: center;\n}',
        not: 'Başlıklar koyu mavi olur ve ortalanır.',
      ),
    ],
  ),
  OrnekProgram(
    id: 'css-ornek-2',
    dil: OrnekDili.css,
    zorluk: OrnekZorlugu.kolay,
    baslik: 'Sınıf seçici',
    aciklama: 'Yalnız class verilen öğeleri vurgular.',
    gruplar: [
      (
        kod: '.onemli {\n  font-weight: bold;\n  color: crimson;\n}',
        not:
            'Nokta ile başlayan seçici sınıfı seçer; kalın ve kırmızı yazı verir.',
      ),
      (
        kod: '/* HTML: <p class="onemli">Dikkat!</p> */',
        not: 'Sınıfı kullanmak için etikete class="onemli" yazılır.',
      ),
    ],
  ),
  OrnekProgram(
    id: 'css-ornek-3',
    dil: OrnekDili.css,
    zorluk: OrnekZorlugu.kolay,
    baslik: 'Kutu modeli',
    aciklama: 'Bir kutuya iç boşluk, kenarlık ve dış boşluk verir.',
    gruplar: [
      (
        kod:
            '.kutu {\n  padding: 16px;\n  border: 2px solid #333;\n  margin: 24px;\n}',
        not:
            'padding içerik ile kenarlık arası, border çerçeve, margin kutunun dışındaki boşluktur.',
      ),
      (
        kod: '.kutu {\n  width: 300px;\n  box-sizing: border-box;\n}',
        not:
            'border-box ile 300px genişliğe iç boşluk ve kenarlık da dahil olur.',
      ),
    ],
  ),
  OrnekProgram(
    id: 'css-ornek-4',
    dil: OrnekDili.css,
    zorluk: OrnekZorlugu.orta,
    baslik: 'Flexbox ile yan yana',
    aciklama: 'Üç kutuyu yan yana dizer ve aralarında boşluk bırakır.',
    gruplar: [
      (
        kod: '.sira {\n  display: flex;\n  gap: 12px;\n}',
        not:
            'display: flex çocukları yan yana dizer, gap aralarına boşluk koyar.',
      ),
      (
        kod:
            '.sira > div {\n  flex: 1;\n  padding: 12px;\n  background: lightgray;\n}',
        not: 'flex: 1 her kutunun eşit genişlikte uzamasını sağlar.',
      ),
    ],
  ),
  OrnekProgram(
    id: 'css-ornek-5',
    dil: OrnekDili.css,
    zorluk: OrnekZorlugu.orta,
    baslik: 'Üzerine gelince değişen düğme',
    aciklama: 'Fare düğmenin üstüne gelince rengi yumuşakça değişir.',
    gruplar: [
      (
        kod:
            '.dugme {\n  background: teal;\n  color: white;\n  border: none;\n  border-radius: 8px;\n  padding: 10px 20px;\n}',
        not: 'Yuvarlak köşeli, turkuaz zeminli bir düğme çizer.',
      ),
      (
        kod: '.dugme:hover {\n  background: darkslategray;\n}',
        not: ':hover fare üstündeyken geçerli olan duruma stil verir.',
      ),
      (
        kod: '.dugme {\n  transition: background 0.3s;\n}',
        not: 'transition renk değişimini 0,3 saniyeye yayar.',
      ),
    ],
  ),
  OrnekProgram(
    id: 'css-ornek-6',
    dil: OrnekDili.css,
    zorluk: OrnekZorlugu.orta,
    baslik: 'Dar ekrana uyum',
    aciklama: 'Ekran darsa yan yana duran kutular alt alta geçer.',
    gruplar: [
      (
        kod: '.sira {\n  display: flex;\n  gap: 12px;\n}',
        not: 'Geniş ekranda kutular yan yana durur.',
      ),
      (
        kod:
            '@media (max-width: 600px) {\n  .sira {\n    flex-direction: column;\n  }\n}',
        not: 'Genişlik 600 pikselin altındaysa dizilim dikey olur.',
      ),
    ],
  ),
];

const List<OrnekProgram> _js = [
  OrnekProgram(
    id: 'js-ornek-1',
    dil: OrnekDili.js,
    zorluk: OrnekZorlugu.kolay,
    baslik: 'Değişken ve yazdırma',
    aciklama: 'İki değişkeni tanımlar ve bir cümle olarak yazdırır.',
    gruplar: [
      (
        kod: 'const ad = "Ayşe";\nlet yas = 20;',
        not: 'const değişmeyecek, let değişebilecek değer için kullanılır.',
      ),
      (
        kod: 'yas = yas + 1;\nconsole.log(ad + " " + yas + " yaşında");',
        not: 'Yaş bir artar; console.log sonucu konsola yazar.',
      ),
    ],
  ),
  OrnekProgram(
    id: 'js-ornek-2',
    dil: OrnekDili.js,
    zorluk: OrnekZorlugu.kolay,
    baslik: 'Çift mi tek mi',
    aciklama: 'Bir sayının çift ya da tek olduğunu söyler.',
    gruplar: [
      (kod: 'const sayi = 7;', not: 'Denenecek sayıyı saklar.'),
      (
        kod:
            'if (sayi % 2 === 0) {\n  console.log("çift");\n} else {\n  console.log("tek");\n}',
        not: '% bölümden kalanı verir; kalan 0 ise sayı çifttir.',
      ),
    ],
  ),
  OrnekProgram(
    id: 'js-ornek-3',
    dil: OrnekDili.js,
    zorluk: OrnekZorlugu.kolay,
    baslik: '1\'den 5\'e say',
    aciklama: 'Bir döngüyle sayıları sırayla yazdırır.',
    gruplar: [
      (
        kod: 'for (let i = 1; i <= 5; i++) {',
        not: 'i 1\'den başlar, 5\'e kadar birer birer artar.',
      ),
      (kod: '  console.log(i);\n}', not: 'Her turda o anki sayı yazdırılır.'),
    ],
  ),
  OrnekProgram(
    id: 'js-ornek-4',
    dil: OrnekDili.js,
    zorluk: OrnekZorlugu.orta,
    baslik: 'Toplayan fonksiyon',
    aciklama: 'İki sayıyı toplayan ve sonucu döndüren bir fonksiyon.',
    gruplar: [
      (
        kod: 'function topla(a, b) {\n  return a + b;\n}',
        not: 'topla iki parametre alır ve toplamı geri döndürür.',
      ),
      (
        kod: 'const sonuc = topla(3, 4);\nconsole.log(sonuc); // 7',
        not: 'Fonksiyon çağrılır, dönen değer değişkende saklanır.',
      ),
    ],
  ),
  OrnekProgram(
    id: 'js-ornek-5',
    dil: OrnekDili.js,
    zorluk: OrnekZorlugu.orta,
    baslik: 'Dizi üzerinde işlem',
    aciklama: 'Bir sayı dizisini ikiyle çarpar ve büyükleri süzer.',
    gruplar: [
      (
        kod: 'const sayilar = [1, 2, 3, 4, 5];',
        not: 'Köşeli parantez bir dizi oluşturur.',
      ),
      (
        kod: 'const ikiKat = sayilar.map(s => s * 2);',
        not: 'map her elemana işlemi uygular: [2, 4, 6, 8, 10].',
      ),
      (
        kod:
            'const buyuk = ikiKat.filter(s => s > 5);\nconsole.log(buyuk); // [6, 8, 10]',
        not: 'filter koşulu sağlayan elemanları tutar.',
      ),
    ],
  ),
  OrnekProgram(
    id: 'js-ornek-6',
    dil: OrnekDili.js,
    zorluk: OrnekZorlugu.orta,
    baslik: 'Düğmeye tıklayınca sayaç',
    aciklama: 'Düğmeye her basışta ekrandaki sayı bir artar.',
    gruplar: [
      (
        kod:
            '// HTML: <button id="dugme">Artır</button> <span id="sayi">0</span>',
        not: 'Sayfada bir düğme ve sayıyı gösteren bir span olduğunu varsayar.',
      ),
      (
        kod:
            'const dugme = document.getElementById("dugme");\nconst sayi = document.getElementById("sayi");\nlet say = 0;',
        not: 'İki öğeyi id ile bulur, sayacı 0\'dan başlatır.',
      ),
      (
        kod:
            'dugme.addEventListener("click", () => {\n  say++;\n  sayi.textContent = say;\n});',
        not: 'Tıklanınca sayaç artar ve yeni değer sayfada gösterilir.',
      ),
    ],
  ),
];
