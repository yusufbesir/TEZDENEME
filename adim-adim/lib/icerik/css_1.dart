import '../model/icerik.dart';

/// CSS'e Giriş
const Kurs css1 = Kurs(
  id: 'css-1',
  ad: 'CSS\'e Giriş',
  aciklama:
      'Barkod etiketi sayfalarını şekillendirerek CSS\'in temelini öğren.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'css-1-u1',
      ad: 'Seçici, renk ve yazı',
      dersler: [
        Ders(
          id: 'css-1-u1-d1',
          ad: 'Seçiciler',
          alistirmalar: [
            Secim(
              soru: 'CSS kuralı hangi parçalardan oluşur?',
              secenekler: [
                'Yalnızca renk',
                'Seçici ve bildirim bloğu',
                'Etiket ve görsel',
                'Başlık ve alt bilgi',
              ],
              dogru: 1,
              aciklama:
                  'Bir kural, seçici ile süslü parantez içindeki bildirimlerden oluşur.',
            ),
            Secim(
              soru: 'Tüm p etiketlerini seçen seçici hangisidir?',
              secenekler: ['p', '.p', '#p', '*p'],
              dogru: 0,
              aciklama: 'Etiket seçicisi yalnızca etiket adıdır.',
            ),
            Secim(
              soru: 'class="etiket" olan öğeleri hangi seçici seçer?',
              secenekler: ['#etiket', 'etiket()', '@etiket', '.etiket'],
              dogru: 3,
              aciklama: 'Sınıf seçicisi nokta ile başlar.',
            ),
            Bosluk(
              soru:
                  'id\'si "baslik" olan öğeyi seçmek için ___baslik { color: red; } yazılır.',
              secenekler: ['.', '@', '#', '\$'],
              dogru: 2,
              aciklama: 'id seçicisi diyez (#) ile başlar.',
            ),
            Bosluk(
              soru: 'p { color: red___ }',
              secenekler: [':', ';', ',', '.'],
              dogru: 1,
              aciklama: 'Her bildirim noktalı virgülle biter.',
            ),
            Yaz(
              soru:
                  'Bildirim bloğunu saran işaretlerin adını yaz (iki kelime: süslü ...).',
              cevaplar: ['süslü parantez', 'suslu parantez'],
              aciklama:
                  'Bildirimler { ve } süslü parantezleri arasına yazılır.',
            ),
            Sirala(
              soru: 'Doğru CSS kuralını sırala.',
              kelimeler: ['}', 'color: blue;', 'p {'],
              dogru: ['p {', 'color: blue;', '}'],
              aciklama:
                  'Seçici, açılış parantezi, bildirim, kapanış parantezi sırası izlenir.',
            ),
            Eslestir(
              soru: 'Seçiciyi neyi seçtiği ile eşleştir.',
              ciftler: [
                (sol: 'h1', sag: 'Tüm h1 etiketleri'),
                (sol: '.kart', sag: 'class="kart" olanlar'),
                (sol: '#ust', sag: 'id="ust" olan'),
                (sol: '*', sag: 'Her şey'),
              ],
              aciklama: 'Nokta sınıfı, diyez id\'yi, yıldız tümünü seçer.',
            ),
            Secim(
              soru:
                  'Aynı öğede hem sınıf hem id kuralı çakışırsa genelde hangisi öncelikli olur?',
              secenekler: ['id', 'etiket', 'sınıf', 'hepsi eşit'],
              dogru: 0,
              aciklama: 'id seçicisi sınıftan, sınıf etiketten daha güçlüdür.',
            ),
            Kod(
              soru: 'Sınıfı seçen seçiciyi tamamla.',
              kod:
                  '/* <div class="kart"> öğesini seçer */\n___ {\n  color: red;\n}',
              secenekler: ['.kart', '#kart', 'kart.'],
              dogru: 0,
              dil: 'css',
              aciklama: 'Sınıf seçicisi nokta ile başlar: .kart',
            ),
          ],
        ),
        Ders(
          id: 'css-1-u1-d2',
          ad: 'Renk ve yazı',
          alistirmalar: [
            Secim(
              soru: 'Yazı rengini değiştiren özellik hangisidir?',
              secenekler: ['font-color', 'text-paint', 'ink', 'color'],
              dogru: 3,
              aciklama: 'Yazı rengi color özelliğiyle verilir.',
            ),
            Secim(
              soru: 'Arka plan rengi için hangi özellik kullanılır?',
              secenekler: ['bg', 'color-back', 'background-color', 'fill'],
              dogru: 2,
              aciklama: 'background-color arka plan rengini belirler.',
            ),
            Secim(
              soru: 'Aşağıdakilerden hangisi geçerli bir renk değeridir?',
              secenekler: ['#gg0000', '#ff0000', 'ff0000#', 'color(red)'],
              dogru: 1,
              aciklama:
                  'Onaltılık renk # ile başlar ve 0-9, a-f karakterlerini içerir.',
            ),
            Bosluk(
              soru: 'h1 { font-___: 32px; }',
              secenekler: ['size', 'big', 'height', 'scale'],
              dogru: 0,
              aciklama: 'Yazı boyutu font-size ile ayarlanır.',
            ),
            Bosluk(
              soru: 'p { text-___: center; } paragrafı ortalar.',
              secenekler: ['center', 'pos', 'move', 'align'],
              dogru: 3,
              aciklama: 'Yazıyı hizalamak için text-align kullanılır.',
            ),
            Yaz(
              soru:
                  'Yazıyı kalın yapan özelliğin adını yaz (font ile başlar, tire ile).',
              cevaplar: ['font-weight'],
              aciklama: 'font-weight kalınlığı belirler, örneğin bold.',
            ),
            Sirala(
              soru: 'Bir bildirimi doğru sırada yaz.',
              kelimeler: ['red', ':', 'color', ';'],
              dogru: ['color', ':', 'red', ';'],
              aciklama:
                  'Bildirim özellik, iki nokta, değer, noktalı virgül şeklindedir.',
            ),
            Eslestir(
              soru: 'Özelliği anlamıyla eşleştir.',
              ciftler: [
                (sol: 'color', sag: 'Yazı rengi'),
                (sol: 'font-size', sag: 'Yazı boyutu'),
                (sol: 'font-family', sag: 'Yazı tipi'),
                (sol: 'text-align', sag: 'Hizalama'),
              ],
              aciklama: 'Özellik adları ne yaptıklarını anlatır.',
            ),
            Secim(
              soru:
                  'font-family: Arial, sans-serif; satırında sans-serif ne işe yarar?',
              secenekler: [
                'Yazıyı kalın yapar',
                'Rengi gri yapar',
                'Yedek yazı tipi ailesi',
                'Boyutu büyütür',
              ],
              dogru: 2,
              aciklama:
                  'Arial yoksa tarayıcı sans-serif ailesinden bir yazı tipi seçer.',
            ),
            Kod(
              soru: 'Yazı rengini veren özelliği seç.',
              kod: 'p {\n  ___: blue;\n  font-size: 18px;\n}',
              secenekler: ['color', 'font-color', 'ink'],
              dogru: 0,
              dil: 'css',
              aciklama: 'Yazı rengi color özelliğiyle verilir.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'css-1-u2',
      ad: 'Kutu modeli ve flex',
      dersler: [
        Ders(
          id: 'css-1-u2-d1',
          ad: 'Kutu modeli',
          alistirmalar: [
            Secim(
              soru: 'Kutu modeli içten dışa hangi sırayla gider?',
              secenekler: [
                'Margin, border, padding, içerik',
                'İçerik, padding, border, margin',
                'İçerik, margin, padding, border',
                'Border, içerik, margin, padding',
              ],
              dogru: 1,
              aciklama:
                  'İçerik, iç boşluk (padding), kenarlık (border), dış boşluk (margin).',
            ),
            Secim(
              soru: 'Kenarlık ile içerik arasındaki boşluk hangisidir?',
              secenekler: ['padding', 'margin', 'gap', 'outline'],
              dogru: 0,
              aciklama: 'padding iç boşluktur.',
            ),
            Secim(
              soru: 'Öğeler arası dış boşluğu hangi özellik verir?',
              secenekler: ['padding', 'border', 'space', 'margin'],
              dogru: 3,
              aciklama: 'margin öğenin dışındaki boşluktur.',
            ),
            Bosluk(
              soru: '.kart { ___: 1px solid black; }',
              secenekler: ['edge', 'frame', 'border', 'line'],
              dogru: 2,
              aciklama:
                  'border kısayoluyla kalınlık, çizgi türü ve renk verilir.',
            ),
            Bosluk(
              soru:
                  '.kart { width: 200px; ___: 10px; } öğenin içine 10px boşluk ekler.',
              secenekler: ['margin', 'padding', 'gap', 'inset'],
              dogru: 1,
              aciklama: 'İçe boşluk için padding kullanılır.',
            ),
            Yaz(
              soru:
                  'Genişlik ve yüksekliğe padding ile border\'ı da dahil eden box-sizing değerini yaz.',
              cevaplar: ['border-box'],
              aciklama: 'box-sizing: border-box hesabı kolaylaştırır.',
            ),
            Sirala(
              soru:
                  'margin: üst sağ alt sol kısayolunda üst 10px, sağ 20px, alt 30px, sol 40px olsun. Değerleri kısayolun sırasına diz.',
              kelimeler: ['30px', '10px', '40px', '20px'],
              dogru: ['10px', '20px', '30px', '40px'],
              aciklama:
                  'Dört değerli kısayol saat yönünde: üst, sağ, alt, sol.',
            ),
            Eslestir(
              soru: 'Özelliği tanımıyla eşleştir.',
              ciftler: [
                (sol: 'margin', sag: 'Dış boşluk'),
                (sol: 'padding', sag: 'İç boşluk'),
                (sol: 'border', sag: 'Kenarlık'),
                (sol: 'width', sag: 'Genişlik'),
              ],
              aciklama: 'Kutu modelinin dört temel parçası bunlardır.',
            ),
            Secim(
              soru: 'margin: 0 auto; bloğa ne yapar (genişlik verilmişse)?',
              secenekler: [
                'Yatayda ortalar',
                'Dikeyde ortalar',
                'Gizler',
                'Kenarlık ekler',
              ],
              dogru: 0,
              aciklama: 'Sol ve sağ margin auto olunca blok yatayda ortalanır.',
            ),
            Kod(
              soru: 'İçeriğin etrafına iç boşluk veren özelliği seç.',
              kod: '.kutu {\n  ___: 16px;\n  border: 1px solid gray;\n}',
              secenekler: ['padding', 'margin', 'outline'],
              dogru: 0,
              dil: 'css',
              aciklama:
                  'padding içerik ile kenarlık arasındaki boşluktur; margin dış boşluktur.',
            ),
          ],
        ),
        Ders(
          id: 'css-1-u2-d2',
          ad: 'Flexbox',
          alistirmalar: [
            Secim(
              soru: 'Flex düzenini başlatan bildirim hangisidir?',
              secenekler: [
                'flex: on;',
                'layout: flex;',
                'position: flex;',
                'display: flex;',
              ],
              dogru: 3,
              aciklama:
                  'Kapta display: flex yazılır, çocuklar flex öğesi olur.',
            ),
            Secim(
              soru: 'Flex öğelerini yatay eksende nasıl hizalarsın?',
              secenekler: ['align-text', 'flex-up', 'justify-content', 'float'],
              dogru: 2,
              aciklama:
                  'justify-content ana eksende (varsayılan yatay) hizalar.',
            ),
            Secim(
              soru: 'Çapraz eksende hizalama hangi özellikle yapılır?',
              secenekler: [
                'justify-self',
                'align-items',
                'text-align',
                'flex-wrap',
              ],
              dogru: 1,
              aciklama:
                  'align-items çapraz ekseni (varsayılan dikey) düzenler.',
            ),
            Bosluk(
              soru: '.sira { display: flex; flex-___: column; }',
              secenekler: ['direction', 'side', 'way', 'grow'],
              dogru: 0,
              aciklama: 'flex-direction yönü belirler: row veya column.',
            ),
            Bosluk(
              soru:
                  '.sira { display: flex; ___: 10px; } öğeler arasına boşluk koyar.',
              secenekler: ['space', 'inset', 'pad', 'gap'],
              dogru: 3,
              aciklama: 'gap flex ve grid öğeleri arasında boşluk bırakır.',
            ),
            Yaz(
              soru:
                  'Öğelerin sığmayınca alt satıra geçmesini sağlayan flex-wrap değerini yaz.',
              cevaplar: ['wrap'],
              aciklama: 'flex-wrap: wrap öğeleri yeni satıra taşır.',
            ),
            Sirala(
              soru: 'Flex kap kuralını sırala.',
              kelimeler: ['}', 'display: flex;', '.kap {'],
              dogru: ['.kap {', 'display: flex;', '}'],
              aciklama: 'Seçici, bildirim, kapanış sırası.',
            ),
            Eslestir(
              soru: 'justify-content değerini sonucuyla eşleştir.',
              ciftler: [
                (sol: 'center', sag: 'Ortaya toplar'),
                (sol: 'space-between', sag: 'Aralarında boşluk'),
                (sol: 'flex-start', sag: 'Başa dayar'),
                (sol: 'flex-end', sag: 'Sona dayar'),
              ],
              aciklama: 'Değerler öğelerin ana eksendeki konumunu belirler.',
            ),
            Secim(
              soru:
                  'Flex kapında display: flex yazıldığında çocuklar varsayılan olarak nasıl dizilir?',
              secenekler: [
                'Alt alta',
                'Üst üste binerek',
                'Yan yana',
                'Gizlenir',
              ],
              dogru: 2,
              aciklama:
                  'Varsayılan yön row olduğu için çocuklar yan yana dizilir.',
            ),
            Kod(
              soru: 'Öğeleri esnek kutuya çeviren değeri seç.',
              kod: '.satir {\n  display: ___;\n  justify-content: center;\n}',
              secenekler: ['flex', 'block', 'table'],
              dogru: 0,
              dil: 'css',
              aciklama: 'display: flex, öğeleri esnek kutu düzenine sokar.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'css-1-u3',
      ad: 'Grid ve mobil uyum',
      dersler: [
        Ders(
          id: 'css-1-u3-d1',
          ad: 'Grid',
          alistirmalar: [
            Secim(
              soru: 'Izgara düzenini başlatan bildirim hangisidir?',
              secenekler: [
                'grid: on;',
                'display: grid;',
                'layout: grid;',
                'display: table;',
              ],
              dogru: 1,
              aciklama: 'Kapta display: grid yazılır.',
            ),
            Secim(
              soru: 'Üç eşit sütun için hangisi doğrudur?',
              secenekler: [
                'grid-template-columns: 1fr 1fr 1fr;',
                'columns: 3px;',
                'grid-rows: 3;',
                'grid: 3 auto;',
              ],
              dogru: 0,
              aciklama: 'fr kalan alanın bir payını ifade eder.',
            ),
            Secim(
              soru: 'Izgarada hücreler arası boşluk hangi özellikle verilir?',
              secenekler: ['border-spacing', 'cell-margin', 'between', 'gap'],
              dogru: 3,
              aciklama: 'gap satır ve sütun arası boşluktur.',
            ),
            Bosluk(
              soru: '.izgara { display: grid; grid-template-___: 1fr 2fr; }',
              secenekler: ['cells', 'boxes', 'columns', 'areas'],
              dogru: 2,
              aciklama: 'Sütunlar grid-template-columns ile tanımlanır.',
            ),
            Bosluk(
              soru: 'Bir öğeyi iki sütuna yaymak için grid-column: span ___;',
              secenekler: ['two', '2', 'x2', '*2'],
              dogru: 1,
              aciklama: 'span 2 öğenin iki sütun kaplamasını sağlar.',
            ),
            Yaz(
              soru: 'Izgarada satırları tanımlayan özelliğin adını yaz.',
              cevaplar: ['grid-template-rows'],
              aciklama: 'Satır boyutları grid-template-rows ile verilir.',
            ),
            Sirala(
              soru: 'Izgara kuralını sırala.',
              kelimeler: [
                'grid-template-columns: 1fr 1fr;',
                '}',
                '.urunler {',
                'display: grid;',
              ],
              dogru: [
                '.urunler {',
                'display: grid;',
                'grid-template-columns: 1fr 1fr;',
                '}',
              ],
              aciklama:
                  'Önce seçici, sonra display, ardından sütun tanımı gelir.',
            ),
            Eslestir(
              soru: 'Birimi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'px', sag: 'Sabit piksel'),
                (sol: '%', sag: 'Kabın yüzdesi'),
                (sol: 'fr', sag: 'Izgara payı'),
                (sol: 'rem', sag: 'Kök yazı boyutuna göre'),
              ],
              aciklama: 'Birim seçimi düzenin esnekliğini belirler.',
            ),
            Secim(
              soru: 'Flex ve grid arasındaki temel fark nedir?',
              secenekler: [
                'Flex tek boyutlu, grid iki boyutlu düzen kurar',
                'Flex renk, grid yazı içindir',
                'İkisi aynıdır',
                'Grid yalnızca tablolar içindir',
              ],
              dogru: 0,
              aciklama:
                  'Flex tek eksen, grid hem satır hem sütun için uygundur.',
            ),
            Kod(
              soru: 'Üç eşit sütunu tanımlayan değeri seç.',
              kod:
                  '.izgara {\n  display: grid;\n  grid-template-columns: ___;\n}',
              secenekler: ['repeat(3, 1fr)', '3 columns', 'grid(3)'],
              dogru: 0,
              dil: 'css',
              aciklama: 'repeat(3, 1fr) üç eşit genişlikte sütun oluşturur.',
            ),
          ],
        ),
        Ders(
          id: 'css-1-u3-d2',
          ad: 'Mobil uyum',
          alistirmalar: [
            Secim(
              soru:
                  'Mobil uyumlu sayfa için head\'e hangi meta etiketi eklenir?',
              secenekler: ['mobile', 'phone', 'screen', 'viewport'],
              dogru: 3,
              aciklama:
                  'meta name="viewport" ekranın genişliğe göre ölçeklenmesini sağlar.',
            ),
            Secim(
              soru:
                  'Ekran genişliğine göre kural uygulayan CSS yapısı hangisidir?',
              secenekler: ['@supports', '@phone', '@media', '@width'],
              dogru: 2,
              aciklama: '@media sorgusu ekran koşuluna göre kural çalıştırır.',
            ),
            Secim(
              soru: 'Görselin kabından taşmaması için hangisi kullanılır?',
              secenekler: [
                'width: 1000px;',
                'max-width: 100%;',
                'overflow: none;',
                'zoom: 1;',
              ],
              dogru: 1,
              aciklama: 'max-width: 100% görseli kabın genişliğine sığdırır.',
            ),
            Bosluk(
              soru: '@media (max-___: 600px) { .menu { display: none; } }',
              secenekler: ['width', 'size', 'screen', 'pixel'],
              dogru: 0,
              aciklama:
                  'max-width: 600px, genişliği 600px ve altı olan ekranlar anlamına gelir.',
            ),
            Bosluk(
              soru:
                  'Mobil öncelikli yaklaşımda genelde ___-width sorgusu kullanılır.',
              secenekler: ['max', 'top', 'low', 'min'],
              dogru: 3,
              aciklama:
                  'min-width ile küçük ekran temel alınır, büyüdükçe kural eklenir.',
            ),
            Yaz(
              soru:
                  'Yazı boyutunu kabın değil kök boyuta göre ölçen birimi yaz.',
              cevaplar: ['rem'],
              aciklama: 'rem kök öğenin yazı boyutuna göre hesaplanır.',
            ),
            Sirala(
              soru: 'Medya sorgusunu sırala.',
              kelimeler: [
                '}',
                '.kart { width: 100%; }',
                '@media (max-width: 600px) {',
              ],
              dogru: [
                '@media (max-width: 600px) {',
                '.kart { width: 100%; }',
                '}',
              ],
              aciklama:
                  'Sorgu, içindeki kural ve kapanış parantezi sırası izlenir.',
            ),
            Eslestir(
              soru: 'Terimi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'viewport', sag: 'Görünür sayfa alanı'),
                (sol: '@media', sag: 'Koşullu kural'),
                (sol: 'breakpoint', sag: 'Düzen değişim noktası'),
                (sol: 'responsive', sag: 'Ekrana uyumlu'),
              ],
              aciklama: 'Duyarlı tasarımın temel kavramları bunlardır.',
            ),
            Secim(
              soru:
                  'Telefonda yan yana sığmayan flex öğeleri için hangisi yardımcı olur?',
              secenekler: [
                'display: none;',
                'float: left;',
                'flex-wrap: wrap;',
                'position: fixed;',
              ],
              dogru: 2,
              aciklama:
                  'flex-wrap öğelerin gerektiğinde alt satıra geçmesini sağlar.',
            ),
            Kod(
              soru: 'Ekran genişliğine göre stil uygulayan kuralı seç.',
              kod: '___ (max-width: 600px) {\n  body { font-size: 14px; }\n}',
              secenekler: ['@media', '@screen', '@mobile'],
              dogru: 0,
              dil: 'css',
              aciklama: 'Mobil uyum için @media sorgusu kullanılır.',
            ),
          ],
        ),
      ],
    ),
  ],
);
