/* Kurs: CSS'e Giris (css-1) - Adim Adim */
(function () {
  var sayac = 0;
  var K = function (sec, d) { var p = (sayac++ * 3 + 1) % sec.length; var dg = sec[d]; var diger = sec.filter(function (_, i) { return i !== d; }); diger.splice(p, 0, dg); return { s: diger, d: p }; };
  var S = function (soru, secenekler, dogru, aciklama) { var k = K(secenekler, dogru); return { tur: 'secim', soru: soru, secenekler: k.s, dogru: k.d, aciklama: aciklama }; };
  var B = function (soru, secenekler, dogru, aciklama) { var k = K(secenekler, dogru); return { tur: 'bosluk', soru: soru, secenekler: k.s, dogru: k.d, aciklama: aciklama }; };
  var Y = function (soru, cevaplar, aciklama) { return { tur: 'yaz', soru: soru, cevaplar: cevaplar, aciklama: aciklama }; };
  var R = function (soru, kelimeler, dogru, aciklama) { return { tur: 'sirala', soru: soru, kelimeler: kelimeler, dogru: dogru, aciklama: aciklama }; };
  var E = function (soru, ciftler, aciklama) { return { tur: 'eslestir', soru: soru, ciftler: ciftler, aciklama: aciklama }; };

  var kurs = {
    id: 'css-1',
    ad: 'CSS\'e Giriş',
    aciklama: 'Barkod etiketi sayfalarını şekillendirerek CSS\'in temelini öğren.',
    dil: 'tr',
    uniteler: [
      {
        id: 'css-1-u1',
        ad: 'Seçici, renk ve yazı',
        dersler: [
          {
            id: 'css-1-u1-d1',
            ad: 'Seçiciler',
            alistirmalar: [
              S('CSS kuralı hangi parçalardan oluşur?', ['Seçici ve bildirim bloğu', 'Yalnızca renk', 'Etiket ve görsel', 'Başlık ve alt bilgi'], 0, 'Bir kural, seçici ile süslü parantez içindeki bildirimlerden oluşur.'),
              S('Tüm p etiketlerini seçen seçici hangisidir?', ['p', '.p', '#p', '*p'], 0, 'Etiket seçicisi yalnızca etiket adıdır.'),
              S('class="etiket" olan öğeleri hangi seçici seçer?', ['.etiket', '#etiket', 'etiket()', '@etiket'], 0, 'Sınıf seçicisi nokta ile başlar.'),
              B('id\'si "baslik" olan öğeyi seçmek için ___baslik { color: red; } yazılır.', ['#', '.', '@', '$'], 0, 'id seçicisi diyez (#) ile başlar.'),
              B('p { color: red___ }', [';', ':', ',', '.'], 0, 'Her bildirim noktalı virgülle biter.'),
              Y('Bildirim bloğunu saran işaretlerin adını yaz (iki kelime: süslü ...).', ['süslü parantez', 'suslu parantez'], 'Bildirimler { ve } süslü parantezleri arasına yazılır.'),
              R('Doğru CSS kuralını sırala.', ['}', 'color: blue;', 'p {'], ['p {', 'color: blue;', '}'], 'Seçici, açılış parantezi, bildirim, kapanış parantezi sırası izlenir.'),
              E('Seçiciyi neyi seçtiği ile eşleştir.', [['h1', 'Tüm h1 etiketleri'], ['.kart', 'class="kart" olanlar'], ['#ust', 'id="ust" olan'], ['*', 'Her şey']], 'Nokta sınıfı, diyez id\'yi, yıldız tümünü seçer.'),
              S('Aynı öğede hem sınıf hem id kuralı çakışırsa genelde hangisi öncelikli olur?', ['id', 'etiket', 'sınıf', 'hepsi eşit'], 0, 'id seçicisi sınıftan, sınıf etiketten daha güçlüdür.')
            ]
          },
          {
            id: 'css-1-u1-d2',
            ad: 'Renk ve yazı',
            alistirmalar: [
              S('Yazı rengini değiştiren özellik hangisidir?', ['color', 'font-color', 'text-paint', 'ink'], 0, 'Yazı rengi color özelliğiyle verilir.'),
              S('Arka plan rengi için hangi özellik kullanılır?', ['background-color', 'bg', 'color-back', 'fill'], 0, 'background-color arka plan rengini belirler.'),
              S('Aşağıdakilerden hangisi geçerli bir renk değeridir?', ['#ff0000', '#gg0000', 'ff0000#', 'color(red)'], 0, 'Onaltılık renk # ile başlar ve 0-9, a-f karakterlerini içerir.'),
              B('h1 { font-___: 32px; }', ['size', 'big', 'height', 'scale'], 0, 'Yazı boyutu font-size ile ayarlanır.'),
              B('p { text-___: center; } paragrafı ortalar.', ['align', 'center', 'pos', 'move'], 0, 'Yazıyı hizalamak için text-align kullanılır.'),
              Y('Yazıyı kalın yapan özelliğin adını yaz (font ile başlar, tire ile).', ['font-weight'], 'font-weight kalınlığı belirler, örneğin bold.'),
              R('Bir bildirimi doğru sırada yaz.', ['red', ':', 'color', ';'], ['color', ':', 'red', ';'], 'Bildirim özellik, iki nokta, değer, noktalı virgül şeklindedir.'),
              E('Özelliği anlamıyla eşleştir.', [['color', 'Yazı rengi'], ['font-size', 'Yazı boyutu'], ['font-family', 'Yazı tipi'], ['text-align', 'Hizalama']], 'Özellik adları ne yaptıklarını anlatır.'),
              S('font-family: Arial, sans-serif; satırında sans-serif ne işe yarar?', ['Yedek yazı tipi ailesi', 'Yazıyı kalın yapar', 'Rengi gri yapar', 'Boyutu büyütür'], 0, 'Arial yoksa tarayıcı sans-serif ailesinden bir yazı tipi seçer.')
            ]
          }
        ]
      },
      {
        id: 'css-1-u2',
        ad: 'Kutu modeli ve flex',
        dersler: [
          {
            id: 'css-1-u2-d1',
            ad: 'Kutu modeli',
            alistirmalar: [
              S('Kutu modeli içten dışa hangi sırayla gider?', ['İçerik, padding, border, margin', 'Margin, border, padding, içerik', 'İçerik, margin, padding, border', 'Border, içerik, margin, padding'], 0, 'İçerik, iç boşluk (padding), kenarlık (border), dış boşluk (margin).'),
              S('Kenarlık ile içerik arasındaki boşluk hangisidir?', ['padding', 'margin', 'gap', 'outline'], 0, 'padding iç boşluktur.'),
              S('Öğeler arası dış boşluğu hangi özellik verir?', ['margin', 'padding', 'border', 'space'], 0, 'margin öğenin dışındaki boşluktur.'),
              B('.kart { ___: 1px solid black; }', ['border', 'edge', 'frame', 'line'], 0, 'border kısayoluyla kalınlık, çizgi türü ve renk verilir.'),
              B('.kart { width: 200px; ___: 10px; } öğenin içine 10px boşluk ekler.', ['padding', 'margin', 'gap', 'inset'], 0, 'İçe boşluk için padding kullanılır.'),
              Y('Genişlik ve yüksekliğe padding ile border\'ı da dahil eden box-sizing değerini yaz.', ['border-box'], 'box-sizing: border-box hesabı kolaylaştırır.'),
              R('margin: üst sağ alt sol kısayolunda üst 10px, sağ 20px, alt 30px, sol 40px olsun. Değerleri kısayolun sırasına diz.', ['30px', '10px', '40px', '20px'], ['10px', '20px', '30px', '40px'], 'Dört değerli kısayol saat yönünde: üst, sağ, alt, sol.'),
              E('Özelliği tanımıyla eşleştir.', [['margin', 'Dış boşluk'], ['padding', 'İç boşluk'], ['border', 'Kenarlık'], ['width', 'Genişlik']], 'Kutu modelinin dört temel parçası bunlardır.'),
              S('margin: 0 auto; bloğa ne yapar (genişlik verilmişse)?', ['Yatayda ortalar', 'Dikeyde ortalar', 'Gizler', 'Kenarlık ekler'], 0, 'Sol ve sağ margin auto olunca blok yatayda ortalanır.')
            ]
          },
          {
            id: 'css-1-u2-d2',
            ad: 'Flexbox',
            alistirmalar: [
              S('Flex düzenini başlatan bildirim hangisidir?', ['display: flex;', 'flex: on;', 'layout: flex;', 'position: flex;'], 0, 'Kapta display: flex yazılır, çocuklar flex öğesi olur.'),
              S('Flex öğelerini yatay eksende nasıl hizalarsın?', ['justify-content', 'align-text', 'flex-up', 'float'], 0, 'justify-content ana eksende (varsayılan yatay) hizalar.'),
              S('Çapraz eksende hizalama hangi özellikle yapılır?', ['align-items', 'justify-items2', 'text-align', 'flex-wrap'], 0, 'align-items çapraz ekseni (varsayılan dikey) düzenler.'),
              B('.sira { display: flex; flex-___: column; }', ['direction', 'side', 'way', 'flow2'], 0, 'flex-direction yönü belirler: row veya column.'),
              B('.sira { display: flex; ___: 10px; } öğeler arasına boşluk koyar.', ['gap', 'space', 'margin2', 'pad'], 0, 'gap flex ve grid öğeleri arasında boşluk bırakır.'),
              Y('Öğelerin sığmayınca alt satıra geçmesini sağlayan flex-wrap değerini yaz.', ['wrap'], 'flex-wrap: wrap öğeleri yeni satıra taşır.'),
              R('Flex kapı kuralını sırala.', ['}', 'display: flex;', '.kap {'], ['.kap {', 'display: flex;', '}'], 'Seçici, bildirim, kapanış sırası.'),
              E('justify-content değerini sonucuyla eşleştir.', [['center', 'Ortaya toplar'], ['space-between', 'Aralarında boşluk'], ['flex-start', 'Başa dayar'], ['flex-end', 'Sona dayar']], 'Değerler öğelerin ana eksendeki konumunu belirler.'),
              S('Flex kapında display: flex yazıldığında çocuklar varsayılan olarak nasıl dizilir?', ['Yan yana', 'Alt alta', 'Üst üste binerek', 'Gizlenir'], 0, 'Varsayılan yön row olduğu için çocuklar yan yana dizilir.')
            ]
          }
        ]
      },
      {
        id: 'css-1-u3',
        ad: 'Grid ve mobil uyum',
        dersler: [
          {
            id: 'css-1-u3-d1',
            ad: 'Grid',
            alistirmalar: [
              S('Izgara düzenini başlatan bildirim hangisidir?', ['display: grid;', 'grid: on;', 'layout: grid;', 'display: table2;'], 0, 'Kapta display: grid yazılır.'),
              S('Üç eşit sütun için hangisi doğrudur?', ['grid-template-columns: 1fr 1fr 1fr;', 'columns: 3px;', 'grid-rows: 3;', 'grid: 3 auto;'], 0, 'fr kalan alanın bir payını ifade eder.'),
              S('Izgarada hücreler arası boşluk hangi özellikle verilir?', ['gap', 'spacing2', 'cell-margin', 'between'], 0, 'gap satır ve sütun arası boşluktur.'),
              B('.izgara { display: grid; grid-template-___: 1fr 2fr; }', ['columns', 'cells', 'boxes', 'cols2'], 0, 'Sütunlar grid-template-columns ile tanımlanır.'),
              B('Bir öğeyi iki sütuna yaymak için grid-column: span ___;', ['2', 'two', 'x2', '*2'], 0, 'span 2 öğenin iki sütun kaplamasını sağlar.'),
              Y('Izgarada satırları tanımlayan özelliğin adını yaz.', ['grid-template-rows'], 'Satır boyutları grid-template-rows ile verilir.'),
              R('Izgara kuralını sırala.', ['grid-template-columns: 1fr 1fr;', '}', '.urunler {', 'display: grid;'], ['.urunler {', 'display: grid;', 'grid-template-columns: 1fr 1fr;', '}'], 'Önce seçici, sonra display, ardından sütun tanımı gelir.'),
              E('Birimi anlamıyla eşleştir.', [['px', 'Sabit piksel'], ['%', 'Kabın yüzdesi'], ['fr', 'Izgara payı'], ['rem', 'Kök yazı boyutuna göre']], 'Birim seçimi düzenin esnekliğini belirler.'),
              S('Flex ve grid arasındaki temel fark nedir?', ['Flex tek boyutlu, grid iki boyutlu düzen kurar', 'Flex renk, grid yazı içindir', 'İkisi aynıdır', 'Grid yalnızca tablolar içindir'], 0, 'Flex tek eksen, grid hem satır hem sütun için uygundur.')
            ]
          },
          {
            id: 'css-1-u3-d2',
            ad: 'Mobil uyum',
            alistirmalar: [
              S('Mobil uyumlu sayfa için head\'e hangi meta etiketi eklenir?', ['viewport', 'mobile', 'phone', 'screen'], 0, 'meta name="viewport" ekranın genişliğe göre ölçeklenmesini sağlar.'),
              S('Ekran genişliğine göre kural uygulayan CSS yapısı hangisidir?', ['@media', '@screen2', '@phone', '@width'], 0, '@media sorgusu ekran koşuluna göre kural çalıştırır.'),
              S('Görselin kabından taşmaması için hangisi kullanılır?', ['max-width: 100%;', 'width: 1000px;', 'overflow: none;', 'zoom: 1;'], 0, 'max-width: 100% görseli kabın genişliğine sığdırır.'),
              B('@media (max-___: 600px) { .menu { display: none; } }', ['width', 'size', 'screen', 'pixel'], 0, 'max-width: 600px, genişliği 600px ve altı olan ekranlar anlamına gelir.'),
              B('Mobil öncelikli yaklaşımda genelde ___-width sorgusu kullanılır.', ['min', 'max2', 'top', 'low'], 0, 'min-width ile küçük ekran temel alınır, büyüdükçe kural eklenir.'),
              Y('Yazı boyutunu kabın değil kök boyuta göre ölçen birimi yaz.', ['rem'], 'rem kök öğenin yazı boyutuna göre hesaplanır.'),
              R('Medya sorgusunu sırala.', ['}', '.kart { width: 100%; }', '@media (max-width: 600px) {'], ['@media (max-width: 600px) {', '.kart { width: 100%; }', '}'], 'Sorgu, içindeki kural ve kapanış parantezi sırası izlenir.'),
              E('Terimi anlamıyla eşleştir.', [['viewport', 'Görünür sayfa alanı'], ['@media', 'Koşullu kural'], ['breakpoint', 'Düzen değişim noktası'], ['responsive', 'Ekrana uyumlu']], 'Duyarlı tasarımın temel kavramları bunlardır.'),
              S('Telefonda yan yana sığmayan flex öğeleri için hangisi yardımcı olur?', ['flex-wrap: wrap;', 'display: none;', 'float: left;', 'position: fixed;'], 0, 'flex-wrap öğelerin gerektiğinde alt satıra geçmesini sağlar.')
            ]
          }
        ]
      }
    ]
  };

  if (typeof window !== 'undefined') { (window.ICERIK = window.ICERIK || []).push(kurs); }
  if (typeof module === 'object' && module.exports) { module.exports = kurs; }
})();
