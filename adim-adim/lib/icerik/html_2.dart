import '../model/icerik.dart';

/// HTML Orta Düzey
const Kurs html2 = Kurs(
  id: 'html-2',
  ad: 'HTML Orta Düzey',
  aciklama:
      'Form, tablo, anlamsal yapı, erişilebilirlik ve çoklu ortamla bir market stok sayfasını olgunlaştır.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'html-2-u1',
      ad: 'Formlar',
      dersler: [
        Ders(
          id: 'html-2-u1-d1',
          ad: 'Form ve girdi türleri',
          alistirmalar: [
            Secim(
              soru: 'E-posta adresi almak için doğru input türü hangisidir?',
              secenekler: [
                'type="mail"',
                'type="email"',
                'type="text-mail"',
                'type="at"',
              ],
              dogru: 1,
              aciklama:
                  'type="email" tarayıcıya e-posta biçimini denetletir ve mobilde uygun klavyeyi açar.',
            ),
            Secim(
              soru:
                  'Aynı gruptaki radio düğmelerinden yalnız birinin seçilmesi için hangi nitelik ortak olmalıdır?',
              secenekler: ['id', 'value', 'name', 'for'],
              dogru: 2,
              aciklama:
                  'Aynı name değerini paylaşan radio düğmeleri tek bir grup oluşturur.',
            ),
            Bosluk(
              soru: '<input type="___" name="adet"> alanı yalnız sayı alsın.',
              secenekler: ['number', 'count', 'digit', 'numeric'],
              dogru: 0,
              aciklama:
                  'type="number" sayısal giriş sağlar ve min, max, step ile birlikte kullanılır.',
            ),
            Bosluk(
              soru: '<form ___="/siparis" method="post">',
              secenekler: ['href', 'src', 'action', 'target'],
              dogru: 2,
              aciklama:
                  'action, form gönderildiğinde verinin gideceği adresi belirler.',
            ),
            Yaz(
              soru:
                  'Yazılanı noktalarla gizleyen input türünün adını yaz (sadece değer).',
              cevaplar: ['password'],
              aciklama: 'type="password" girilen karakterleri gizler.',
            ),
            Sirala(
              soru: 'Tarih seçici alanı doğru sırada yaz.',
              kelimeler: ['name="tarih">', '<input', 'type="date"'],
              dogru: ['<input', 'type="date"', 'name="tarih">'],
              aciklama:
                  'Önce etiket adı, sonra type, sonra name niteliği gelir.',
            ),
            Eslestir(
              soru: 'type değerini kullanım amacıyla eşleştir.',
              ciftler: [
                (sol: 'email', sag: 'E-posta adresi'),
                (sol: 'checkbox', sag: 'Çoklu seçim kutusu'),
                (sol: 'radio', sag: 'Tek seçimli düğme'),
                (sol: 'date', sag: 'Tarih seçici'),
              ],
              aciklama:
                  'checkbox birden çok, radio yalnız tek seçime izin verir.',
            ),
            Tablo(
              soru: 'Alan ve input türü tablosunu tamamla.',
              baslik: ['Alan', 'type değeri'],
              satirlar: [
                ['Parola', 'password'],
                ['Renk', 'color'],
                ['Dosya', 'file'],
                ['Telefon', 'tel'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 3, sutun: 1)],
              secenekler: ['color', 'tel', 'password', 'file'],
              aciklama: 'color renk seçici, tel telefon alanı açar.',
            ),
            Isaretle(
              soru: 'Giriş türünü belirleyen niteliği işaretle.',
              cumle: '<input type="email" name="eposta">',
              dogru: [1],
              aciklama: 'type niteliği alanın türünü belirler.',
            ),
            Kod(
              soru:
                  'Çok satırlı metin alanının yüksekliğini veren niteliği seç.',
              kod: '<textarea name="not" ___="3"></textarea>',
              secenekler: ['rows', 'lines', 'height'],
              dogru: 0,
              dil: 'html',
              aciklama: 'textarea alanında satır sayısı rows ile belirlenir.',
            ),
          ],
        ),
        Ders(
          id: 'html-2-u1-d2',
          ad: 'Doğrulama nitelikleri',
          alistirmalar: [
            Secim(
              soru: 'Alanın boş bırakılmasını engelleyen nitelik hangisidir?',
              secenekler: ['optional', 'required', 'mandatory', 'notempty'],
              dogru: 1,
              aciklama:
                  'required yazılan alan boşken form gönderilmez ve tarayıcı uyarı verir.',
            ),
            Secim(
              soru: 'Sayı alanında en küçük değeri hangi nitelik belirler?',
              secenekler: ['floor', 'start', 'min', 'lower'],
              dogru: 2,
              aciklama: 'min en küçük, max en büyük kabul edilen değerdir.',
            ),
            Bosluk(
              soru: '<input type="text" ___="13" name="barkod">',
              secenekler: ['maxlength', 'size', 'limit', 'max'],
              dogru: 0,
              aciklama:
                  'maxlength yazılabilecek en çok karakter sayısını sınırlar.',
            ),
            Bosluk(
              soru:
                  'Düzenli ifadeyle denetim yapan nitelik: <input ___="[0-9]+">',
              secenekler: ['regex', 'pattern', 'match', 'format'],
              dogru: 1,
              aciklama: 'pattern, değerin uyması gereken düzenli ifadeyi alır.',
            ),
            Yaz(
              soru:
                  'Formun tarayıcı doğrulamasını kapatan form niteliğinin adını yaz.',
              cevaplar: ['novalidate'],
              aciklama: 'form etiketine eklenen novalidate doğrulamayı atlar.',
            ),
            Sirala(
              soru: '0 ile 100 arası sayı alanını sırala.',
              kelimeler: ['max="100">', '<input', 'min="0"', 'type="number"'],
              dogru: ['<input', 'type="number"', 'min="0"', 'max="100">'],
              aciklama:
                  'Etiket adı, tür, alt sınır, üst sınır sırasıyla yazıldı.',
            ),
            Eslestir(
              soru: 'Niteliği görevi ile eşleştir.',
              ciftler: [
                (sol: 'required', sag: 'Boş bırakılamaz'),
                (sol: 'pattern', sag: 'Düzenli ifadeyle denetler'),
                (sol: 'step', sag: 'Sayı artış adımı'),
                (sol: 'placeholder', sag: 'Silik ipucu metni'),
              ],
              aciklama:
                  'placeholder doğrulama yapmaz, yalnızca ipucu gösterir.',
            ),
            Tablo(
              soru: 'Nitelik ve görev tablosunu tamamla.',
              baslik: ['Nitelik', 'Görev'],
              satirlar: [
                ['min', 'En küçük değer'],
                ['maxlength', 'En çok karakter'],
                ['required', 'Zorunlu alan'],
                ['step', 'Adım aralığı'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 3, sutun: 1)],
              secenekler: [
                'En çok karakter',
                'Adım aralığı',
                'En küçük değer',
                'Zorunlu alan',
              ],
              aciklama:
                  'maxlength karakter sayısını, step sayının artış adımını belirler.',
            ),
            Isaretle(
              soru: 'Alanı zorunlu yapan niteliği işaretle.',
              cumle: '<input name="ad" required maxlength="40">',
              dogru: [2],
              aciklama: 'required, değer almayan mantıksal bir niteliktir.',
            ),
            Kod(
              soru: '13 haneli barkod için hangi nitelik gerekir?',
              kod: '<input type="text" name="barkod" ___="[0-9]{13}">',
              secenekler: ['pattern', 'regex', 'format'],
              dogru: 0,
              dil: 'html',
              aciklama: '[0-9]{13} tam 13 rakam anlamına gelen kalıptır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'html-2-u2',
      ad: 'Tablo ve sayfa yapısı',
      dersler: [
        Ders(
          id: 'html-2-u2-d1',
          ad: 'Tablolar',
          alistirmalar: [
            Secim(
              soru: 'Tabloda bir satırı hangi etiket oluşturur?',
              secenekler: ['<tr>', '<td>', '<th>', '<row>'],
              dogru: 0,
              aciklama: 'tr (table row) satırdır; hücreler onun içine yazılır.',
            ),
            Secim(
              soru: 'Başlık hücresi için hangi etiket kullanılır?',
              secenekler: ['<td>', '<head>', '<th>', '<tc>'],
              dogru: 2,
              aciklama:
                  'th başlık hücresidir; ekran okuyucular bunu başlık olarak duyurur.',
            ),
            Bosluk(
              soru: '<td ___="2">Toplam</td> hücresi iki sütun kaplasın.',
              secenekler: ['rowspan', 'colspan', 'span', 'cols'],
              dogru: 1,
              aciklama: 'colspan yatayda, rowspan dikeyde hücre birleştirir.',
            ),
            Bosluk(
              soru: '<table><___>Stok Listesi</caption>',
              secenekler: ['title', 'caption', 'legend', 'head'],
              dogru: 1,
              aciklama:
                  'caption tablonun başlığıdır ve table etiketinin ilk çocuğu olur.',
            ),
            Yaz(
              soru: 'Hücreyi alt satırlarla birleştiren niteliğin adını yaz.',
              cevaplar: ['rowspan'],
              aciklama: 'rowspan hücrenin kaç satır kaplayacağını belirtir.',
            ),
            Sirala(
              soru: 'Tek hücreli bir satırı sırala.',
              kelimeler: ['</td>', '<tr>', 'Süt', '</tr>', '<td>'],
              dogru: ['<tr>', '<td>', 'Süt', '</td>', '</tr>'],
              aciklama:
                  'Satır açılır, hücre açılır, metin yazılır, ikisi de kapanır.',
            ),
            Eslestir(
              soru: 'Tablo bölümünü görevi ile eşleştir.',
              ciftler: [
                (sol: 'thead', sag: 'Başlık bölümü'),
                (sol: 'tbody', sag: 'Gövde bölümü'),
                (sol: 'tfoot', sag: 'Alt bilgi bölümü'),
                (sol: 'caption', sag: 'Tablo başlığı'),
              ],
              aciklama: 'Bu bölümler tabloyu anlamlı parçalara ayırır.',
            ),
            Tablo(
              soru: 'Etiket ve görev tablosunu tamamla.',
              baslik: ['Etiket', 'Görev'],
              satirlar: [
                ['<table>', 'Tabloyu başlatır'],
                ['<tr>', 'Satır'],
                ['<th>', 'Başlık hücresi'],
                ['<td>', 'Veri hücresi'],
              ],
              bos: [(satir: 2, sutun: 1), (satir: 3, sutun: 1)],
              secenekler: [
                'Başlık hücresi',
                'Veri hücresi',
                'Satır',
                'Tabloyu başlatır',
              ],
              aciklama: 'th başlık, td veri hücresidir.',
            ),
            Isaretle(
              soru: 'Satırdaki başlık hücrelerini işaretle.',
              cumle: '<tr> <th>Ürün</th> <td>Süt</td> <th>Adet</th> </tr>',
              dogru: [1, 3],
              aciklama: 'th ile yazılanlar başlık hücreleridir.',
            ),
            Kod(
              soru: 'Boşluğa tablo başlığı etiketini yaz.',
              kod:
                  '<table>\n  <___>Haftalık Stok</caption>\n  <tr><th>Ürün</th><th>Adet</th></tr>\n</table>',
              secenekler: ['caption', 'title', 'head'],
              dogru: 0,
              dil: 'html',
              aciklama:
                  'Kapanış etiketi </caption> olduğu için açılış caption olur.',
            ),
          ],
        ),
        Ders(
          id: 'html-2-u2-d2',
          ad: 'Anlamsal yapı etiketleri',
          alistirmalar: [
            Secim(
              soru:
                  'Sayfanın veya bölümün üst kısmı için hangi etiket uygundur?',
              secenekler: ['<header>', '<footer>', '<aside>', '<main>'],
              dogru: 0,
              aciklama:
                  'header giriş içeriğini, logoyu ve başlığı barındırır; sayfada birden çok olabilir.',
            ),
            Secim(
              soru: 'Sayfanın ana içeriği hangi etiketle sarılır?',
              secenekler: ['<section>', '<div>', '<article>', '<main>'],
              dogru: 3,
              aciklama:
                  'main sayfanın asıl içeriğini sarar ve sayfada tek bir görünür main olmalıdır.',
            ),
            Bosluk(
              soru: 'Gezinti bağlantılarını saran etiket: <___>...</nav>',
              secenekler: ['menu', 'nav', 'links', 'navbar'],
              dogru: 1,
              aciklama: 'nav ana gezinti bağlantıları için kullanılır.',
            ),
            Bosluk(
              soru: 'Yan içerik için <___>Kampanya kutusu</aside> yazılır.',
              secenekler: ['aside', 'side', 'sidebar', 'margin'],
              dogru: 0,
              aciklama: 'aside ana içerikle dolaylı ilişkili yan içeriktir.',
            ),
            Yaz(
              soru:
                  'Tek başına anlamlı yazıyı (haber, blog yazısı) saran etiketin adını yaz.',
              cevaplar: ['article'],
              aciklama: 'article tek başına dağıtılabilir bağımsız içeriktir.',
            ),
            Sirala(
              soru: 'Sayfa iskeletini yukarıdan aşağıya sırala.',
              kelimeler: ['<main>', '<footer>', '<header>'],
              dogru: ['<header>', '<main>', '<footer>'],
              aciklama: 'Üst bölüm, ana içerik, alt bilgi sırası yaygındır.',
            ),
            Eslestir(
              soru: 'Etiketi anlamıyla eşleştir.',
              ciftler: [
                (sol: '<header>', sag: 'Üst bölüm'),
                (sol: '<nav>', sag: 'Gezinti'),
                (sol: '<aside>', sag: 'Yan içerik'),
                (sol: '<footer>', sag: 'Alt bilgi'),
                (sol: '<article>', sag: 'Bağımsız içerik'),
              ],
              aciklama:
                  'Anlamsal etiketler arama motoruna ve ekran okuyucuya yapıyı anlatır.',
            ),
            Tablo(
              soru: 'İçerik ve etiket tablosunu tamamla.',
              baslik: ['İçerik', 'Etiket'],
              satirlar: [
                ['Ana menü', 'nav'],
                ['Ürün yazısı', 'article'],
                ['Sayfa altı', 'footer'],
                ['Yan reklam kutusu', 'aside'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 3, sutun: 1)],
              secenekler: ['nav', 'article', 'footer', 'aside'],
              aciklama: 'Menü nav, yan kutu aside ile işaretlenir.',
            ),
            Isaretle(
              soru:
                  'Ana içeriği saran açılış ve kapanış etiketlerini işaretle.',
              cumle: '<header> <nav> <main> </main> <footer>',
              dogru: [2, 3],
              aciklama: 'main etiketi açılış ve kapanışıyla ana içeriği sarar.',
            ),
            Kod(
              soru: 'Boşluğa ana içeriği saran etiketi yaz.',
              kod:
                  '<body>\n  <header>Market</header>\n  <___>\n    <article>Süt</article>\n  </main>\n</body>',
              secenekler: ['main', 'div', 'aside'],
              dogru: 0,
              dil: 'html',
              aciklama:
                  'Kapanış etiketi </main> olduğu için açılış main olmalı.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'html-2-u3',
      ad: 'Erişilebilirlik ve çoklu ortam',
      dersler: [
        Ders(
          id: 'html-2-u3-d1',
          ad: 'Erişilebilirlik temelleri',
          alistirmalar: [
            Secim(
              soru: 'Yalnızca süs amaçlı bir görselde alt nasıl bırakılır?',
              secenekler: [
                'Boş: alt=""',
                'Hiç yazılmaz',
                'alt="resim"',
                'alt="görsel"',
              ],
              dogru: 0,
              aciklama:
                  'Süs görselinde boş alt, ekran okuyucunun görseli atlamasını sağlar.',
            ),
            Secim(
              soru: 'label etiketinin for değeri hangi nitelikle eşleşmelidir?',
              secenekler: [
                'input name',
                'input type',
                'input id',
                'input value',
              ],
              dogru: 2,
              aciklama:
                  'for değeri, bağlanacak alanın id değerine eşit olmalıdır.',
            ),
            Bosluk(
              soru: '<button ___-label="Menüyü kapat">X</button>',
              secenekler: ['aria', 'data', 'role', 'alt'],
              dogru: 0,
              aciklama:
                  'aria-label, metni olmayan öğeye görünmeyen erişilebilir ad verir.',
            ),
            Bosluk(
              soru: '<div ___="button" tabindex="0">Ekle</div>',
              secenekler: ['type', 'class', 'role', 'aria'],
              dogru: 2,
              aciklama:
                  'role öğenin anlamsal rolünü bildirir. Mümkünse gerçek button kullanmak daha iyidir.',
            ),
            Yaz(
              soru: 'Öğeyi klavyeyle Tab sırasına sokan niteliğin adını yaz.',
              cevaplar: ['tabindex'],
              aciklama:
                  'tabindex="0" öğeyi doğal sıraya göre odaklanabilir yapar.',
            ),
            Sirala(
              soru: 'Etiket satırını doğru sırada yaz.',
              kelimeler: ['</label>', 'Barkod', '<label', 'for="barkod">'],
              dogru: ['<label', 'for="barkod">', 'Barkod', '</label>'],
              aciklama:
                  'Önce etiket ve for niteliği, sonra metin, sonra kapanış gelir.',
            ),
            Eslestir(
              soru: 'Niteliği görevi ile eşleştir.',
              ciftler: [
                (sol: 'alt', sag: 'Görselin metin karşılığı'),
                (sol: 'label', sag: 'Form alanı etiketi'),
                (sol: 'aria-label', sag: 'Görünmeyen erişilebilir ad'),
                (sol: 'tabindex', sag: 'Klavye odak sırası'),
              ],
              aciklama:
                  'Hepsi yardımcı teknolojilerin sayfayı anlamasına katkı verir.',
            ),
            Tablo(
              soru: 'Durum ve doğru yaklaşım tablosunu tamamla.',
              baslik: ['Durum', 'Doğru yaklaşım'],
              satirlar: [
                ['Bilgi veren görsel', 'Anlamlı alt'],
                ['Süs görseli', 'Boş alt'],
                ['Metinsiz ikon düğme', 'aria-label'],
                ['Form alanı', 'label'],
              ],
              bos: [(satir: 2, sutun: 1), (satir: 3, sutun: 1)],
              secenekler: ['Anlamlı alt', 'Boş alt', 'aria-label', 'label'],
              aciklama: 'İkon düğmeye aria-label, form alanına label verilir.',
            ),
            Isaretle(
              soru: 'Erişilebilir adı veren niteliğin tamamını işaretle.',
              cumle:
                  '<button type="button" aria-label="Sepete ekle">+</button>',
              dogru: [2, 3],
              aciklama:
                  'aria-label değeri iki kelimedir; ikisi de işaretlenmelidir.',
            ),
            Kod(
              soru: 'Etiketi alana bağlayan niteliği seç.',
              kod:
                  '<input id="adet" type="number">\n<label ___="adet">Adet</label>',
              secenekler: ['for', 'id', 'name'],
              dogru: 0,
              dil: 'html',
              aciklama: 'for="adet", id="adet" olan alana bağlanır.',
            ),
          ],
        ),
        Ders(
          id: 'html-2-u3-d2',
          ad: 'Çoklu ortam',
          alistirmalar: [
            Secim(
              soru:
                  'img için farklı boyutlu görsel listesi hangi nitelikle verilir?',
              secenekler: ['sizeset', 'multisrc', 'srcset', 'imgset'],
              dogru: 2,
              aciklama:
                  'srcset, tarayıcının ekrana uygun dosyayı seçebilmesi için aday listesi verir.',
            ),
            Secim(
              soru:
                  'Farklı görsel biçimleri arasından seçim yaptıran etiket hangisidir?',
              secenekler: ['<multi>', '<picture>', '<figure>', '<media>'],
              dogru: 1,
              aciklama:
                  'picture içindeki source etiketleri sırayla denenir, son çare img olur.',
            ),
            Bosluk(
              soru:
                  '<video src="tanitim.mp4" ___></video> oynatma düğmeleri görünsün.',
              secenekler: ['controls', 'buttons', 'player', 'ui'],
              dogru: 0,
              aciklama:
                  'controls tarayıcının yerleşik oynatıcı denetimlerini açar.',
            ),
            Bosluk(
              soru:
                  '<iframe ___="https://ornek.com/harita" title="Harita"></iframe>',
              secenekler: ['href', 'src', 'link', 'url'],
              dogru: 1,
              aciklama:
                  'iframe gömülecek sayfanın adresini src ile alır; title erişilebilirlik için gerekir.',
            ),
            Yaz(
              soru: 'Ses dosyası gömen etiketin adını yaz.',
              cevaplar: ['audio'],
              aciklama: 'audio etiketi controls niteliğiyle oynatıcı gösterir.',
            ),
            Sirala(
              soru: 'Video etiketini sırala.',
              kelimeler: ['controls>', '</video>', '<video', 'src="a.mp4"'],
              dogru: ['<video', 'src="a.mp4"', 'controls>', '</video>'],
              aciklama:
                  'Açılış, kaynak, denetimler ve kapanış sırasıyla yazılır.',
            ),
            Eslestir(
              soru: 'Etiketi görevi ile eşleştir.',
              ciftler: [
                (sol: '<audio>', sag: 'Ses oynatma'),
                (sol: '<video>', sag: 'Video oynatma'),
                (sol: '<picture>', sag: 'Görsel kaynak seçimi'),
                (sol: '<iframe>', sag: 'Başka sayfa gömme'),
                (sol: '<source>', sag: 'Alternatif kaynak'),
              ],
              aciklama:
                  'source, audio, video ve picture içinde alternatif sunar.',
            ),
            Tablo(
              soru: 'Etiket ve önemli nitelik tablosunu tamamla.',
              baslik: ['Etiket', 'Önemli nitelik'],
              satirlar: [
                ['<img>', 'alt'],
                ['<video>', 'controls'],
                ['<iframe>', 'title'],
                ['<audio>', 'controls'],
              ],
              bos: [(satir: 2, sutun: 1), (satir: 3, sutun: 1)],
              secenekler: ['alt', 'controls', 'title'],
              aciklama: 'iframe için title, audio için controls önemlidir.',
            ),
            Isaretle(
              soru: 'Video yüklenmeden önce görünen kapak niteliğini işaretle.',
              cumle: '<video src="a.mp4" poster="kapak.jpg" controls>',
              dogru: [2],
              aciklama: 'poster, video oynatılmadan önce gösterilen görseldir.',
            ),
            Kod(
              soru: 'picture içindeki yedek etiketi seç.',
              kod:
                  '<picture>\n  <source srcset="urun.webp" type="image/webp">\n  <___ src="urun.jpg" alt="Ürün">\n</picture>',
              secenekler: ['img', 'image', 'video'],
              dogru: 0,
              dil: 'html',
              aciklama: 'picture her zaman bir img etiketiyle son bulur.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'html-2-u4',
      ad: 'Meta, bağlantı ve veri',
      dersler: [
        Ders(
          id: 'html-2-u4-d1',
          ad: 'Meta etiketleri ve SEO',
          alistirmalar: [
            Secim(
              soru:
                  'Mobil cihazlarda doğru ölçek için hangi meta adı kullanılır?',
              secenekler: [
                'name="mobile"',
                'name="screen"',
                'name="viewport"',
                'name="scale"',
              ],
              dogru: 2,
              aciklama:
                  'viewport meta etiketi sayfa genişliğini cihaz genişliğine uydurur.',
            ),
            Secim(
              soru: 'Arama sonucundaki kısa sayfa özeti hangisiyle verilir?',
              secenekler: [
                '<meta name="summary">',
                '<meta name="description">',
                '<meta name="results">',
                '<meta name="seo">',
              ],
              dogru: 1,
              aciklama:
                  'description arama motorlarının özet olarak gösterebileceği metindir.',
            ),
            Bosluk(
              soru: '<meta ___="UTF-8">',
              secenekler: ['charset', 'encoding', 'lang', 'type'],
              dogru: 0,
              aciklama:
                  'charset karakter kodlamasını bildirir; Türkçe karakterler için UTF-8 kullanılır.',
            ),
            Bosluk(
              soru: '<meta property="og:___" content="Barkod Okuyucu">',
              secenekler: ['name', 'title', 'label', 'text'],
              dogru: 1,
              aciklama: 'og:title paylaşım önizlemesindeki başlıktır.',
            ),
            Yaz(
              soru:
                  'Sekmede ve arama sonuçlarında görünen başlık etiketinin adını yaz.',
              cevaplar: ['title'],
              aciklama: 'title head içinde bulunur ve sayfaya özgü olmalıdır.',
            ),
            Sirala(
              soru: 'Açıklama meta etiketini sırala.',
              kelimeler: [
                'content="Market stok sayfası">',
                '<meta',
                'name="description"',
              ],
              dogru: [
                '<meta',
                'name="description"',
                'content="Market stok sayfası">',
              ],
              aciklama: 'name özelliği türü, content değeri taşır.',
            ),
            Eslestir(
              soru: 'Etiketi görevi ile eşleştir.',
              ciftler: [
                (sol: '<title>', sag: 'Sekme başlığı'),
                (sol: 'description', sag: 'Arama özeti'),
                (sol: 'og:image', sag: 'Paylaşım görseli'),
                (sol: 'viewport', sag: 'Mobil ölçek'),
                (sol: 'canonical', sag: 'Asıl sayfa adresi'),
              ],
              aciklama:
                  'canonical, link etiketiyle yinelenen sayfalarda asıl adresi gösterir.',
            ),
            Tablo(
              soru: 'Meta ve amaç tablosunu tamamla.',
              baslik: ['Meta', 'Amaç'],
              satirlar: [
                ['og:title', 'Paylaşım başlığı'],
                ['og:image', 'Paylaşım görseli'],
                ['viewport', 'Mobil ölçek'],
                ['description', 'Arama özeti'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 3, sutun: 1)],
              secenekler: [
                'Paylaşım başlığı',
                'Paylaşım görseli',
                'Mobil ölçek',
                'Arama özeti',
              ],
              aciklama:
                  'Open Graph meta etiketleri paylaşım kartını oluşturur.',
            ),
            Isaretle(
              soru: 'Open Graph başlığını tanımlayan niteliği işaretle.',
              cumle: '<meta property="og:title" content="Stok Takip">',
              dogru: [1],
              aciklama: 'Open Graph etiketlerinde adı property niteliği taşır.',
            ),
            Kod(
              soru: 'Boşluğa meta adını yaz.',
              kod:
                  '<meta name="___" content="width=device-width, initial-scale=1">',
              secenekler: ['viewport', 'screen', 'device'],
              dogru: 0,
              dil: 'html',
              aciklama: 'width=device-width sayfayı cihaz genişliğine uydurur.',
            ),
          ],
        ),
        Ders(
          id: 'html-2-u4-d2',
          ad: 'Bağlantı, kaynak ve data nitelikleri',
          alistirmalar: [
            Secim(
              soru: 'Aynı sayfadaki bir bölüme atlamak için hangisi doğrudur?',
              secenekler: [
                'href="stok" ve name="stok"',
                'src="#stok" ve id="stok"',
                'href="#stok" ve id="stok"',
                'href="@stok" ve id="stok"',
              ],
              dogru: 2,
              aciklama:
                  '# işareti sayfa içi hedefi, id ise hedef öğeyi gösterir.',
            ),
            Secim(
              soru: 'Bağlantıyı yeni sekmede açan nitelik hangisidir?',
              secenekler: [
                'target="_new"',
                'target="_blank"',
                'open="tab"',
                'href="_blank"',
              ],
              dogru: 1,
              aciklama: 'target="_blank" yeni sekme veya pencere açar.',
            ),
            Bosluk(
              soru:
                  '<a href="katalog.pdf" ___>Katalog</a> tıklayınca indirilsin.',
              secenekler: ['download', 'save', 'file', 'get'],
              dogru: 0,
              aciklama: 'download niteliği dosyanın indirilmesini ister.',
            ),
            Bosluk(
              soru: '<link rel="___" href="stil.css">',
              secenekler: ['style', 'css', 'stylesheet', 'sheet'],
              dogru: 2,
              aciklama: 'rel="stylesheet" CSS dosyasını sayfaya bağlar.',
            ),
            Yaz(
              soru: 'Özel veri niteliklerinin başındaki ön ek hangi sözcüktür?',
              cevaplar: ['data'],
              aciklama: 'data-* nitelikleri öğeye özel bilgi taşır.',
            ),
            Sirala(
              soru: 'Barkod bilgisi taşıyan liste öğesini sırala.',
              kelimeler: ['</li>', 'Süt', '<li', 'data-barkod="869001">'],
              dogru: ['<li', 'data-barkod="869001">', 'Süt', '</li>'],
              aciklama:
                  'data-barkod niteliği açılış etiketinin içinde yazılır.',
            ),
            Eslestir(
              soru: 'Kavramı görevi ile eşleştir.',
              ciftler: [
                (sol: 'a href', sag: 'Bağlantı adresi'),
                (sol: 'link rel', sag: 'CSS bağlama'),
                (sol: 'script src', sag: 'Betik yükleme'),
                (sol: 'data-*', sag: 'Özel veri'),
                (sol: 'dataset', sag: 'JS ile veri okuma'),
              ],
              aciklama:
                  'dataset, JavaScript içinden data-* niteliklerine erişir.',
            ),
            Tablo(
              soru: 'Nitelik ve anlam tablosunu tamamla.',
              baslik: ['Nitelik', 'Anlam'],
              satirlar: [
                ['href', 'Bağlantı adresi'],
                ['target', 'Açılış hedefi'],
                ['download', 'Dosyayı indirir'],
                ['data-stok', 'Özel veri'],
              ],
              bos: [(satir: 2, sutun: 1), (satir: 3, sutun: 1)],
              secenekler: [
                'Bağlantı adresi',
                'Açılış hedefi',
                'Dosyayı indirir',
                'Özel veri',
              ],
              aciklama:
                  'data-stok gibi nitelikler tarayıcıyı etkilemeden veri taşır.',
            ),
            Isaretle(
              soru: 'Özel veri niteliğini işaretle.',
              cumle: '<li id="urun" data-stok="12" class="kart">',
              dogru: [2],
              aciklama: 'data- ile başlayan nitelik özel veri niteliğidir.',
            ),
            Kod(
              soru: 'dataset üzerinden barkoda ulaşan özelliği seç.',
              kod:
                  '<button data-barkod="869001">Ekle</button>\n<script>\n  const b = document.querySelector("button");\n  console.log(b.dataset.___);\n</script>',
              secenekler: ['barkod', 'data-barkod', 'dataset'],
              dogru: 0,
              dil: 'html',
              aciklama:
                  'data-barkod niteliği dataset.barkod olarak okunur; tireli adlar camelCase olur.',
            ),
          ],
        ),
      ],
    ),
  ],
);
