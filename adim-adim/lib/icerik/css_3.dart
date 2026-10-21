import '../model/icerik.dart';

/// CSS İleri Düzey
const Kurs css3 = Kurs(
  id: 'css-3',
  ad: 'CSS İleri Düzey',
  aciklama:
      'Barkod ve stok panelleriyle kademe, container query, :has(), nesting ve performans konularını öğren.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'css-3-u1',
      ad: 'Kademe ve seçiciler',
      dersler: [
        Ders(
          id: 'css-3-u1-d1',
          ad: 'Kademe ve özgüllük',
          alistirmalar: [
            Secim(
              soru: 'Hangi seçici en yüksek özgüllüğe sahiptir?',
              secenekler: ['.sepet.aktif', '#sepet', 'div.sepet', 'div p'],
              dogru: 1,
              aciklama: 'Özgüllükte id sınıftan, sınıf etiketten güçlüdür.',
            ),
            Secim(
              soru:
                  'Sonradan bildirilen bir @layer, özgüllük farkına rağmen nasıl davranır?',
              secenekler: [
                'Her zaman kaybeder',
                'Normal bildirimlerde önceki katmana üstün gelir',
                'Yalnız !important ile çalışır',
                'Katmanlar sırayı etkilemez',
              ],
              dogru: 1,
              aciklama: 'Katman sırası, özgüllükten önce değerlendirilir.',
            ),
            Bosluk(
              soru: '___ temel, bilesenler, araclar;',
              secenekler: ['@import', '@layer', '@scope', '@media'],
              dogru: 1,
              aciklama: '@layer katman sırasını tek satırda bildirir.',
            ),
            Bosluk(
              soru: 'p { color: red ___; }',
              secenekler: ['!important', '!force', '!priority', '!strong'],
              dogru: 0,
              aciklama:
                  '!important kademede normal bildirimleri geçer; ölçülü kullan.',
            ),
            Yaz(
              soru:
                  'Etiket seçicisi ile sınıf seçicisinden hangisi daha yüksek özgüllüğe sahiptir?',
              cevaplar: ['sınıf', 'sinif', 'sınıf seçicisi'],
              aciklama: 'Sınıf (0-1-0) etiketten (0-0-1) güçlüdür.',
            ),
            Sirala(
              soru: 'Katmanlı stili doğru sırala.',
              kelimeler: [
                '.kart { color: teal; }',
                '}',
                '@layer temel, bilesenler;',
                '@layer bilesenler {',
              ],
              dogru: [
                '@layer temel, bilesenler;',
                '@layer bilesenler {',
                '.kart { color: teal; }',
                '}',
              ],
              aciklama: 'Önce katman sırası bildirilir, sonra bloklar yazılır.',
            ),
            Eslestir(
              soru: 'Seçiciyi özgüllüğüyle eşleştir.',
              ciftler: [
                (sol: 'style="..."', sag: 'En yüksek (satır içi)'),
                (sol: '#id', sag: 'Yüksek'),
                (sol: '.sinif', sag: 'Orta'),
                (sol: 'etiket', sag: 'Düşük'),
                (sol: ':where()', sag: 'Sıfır özgüllük'),
              ],
              aciklama: 'Kademe: köken, katman, özgüllük, sıra.',
            ),
            Kod(
              soru: 'Sıfır özgüllüklü seçiciyi tamamla.',
              kod: ':___(.kart) a {\n  color: teal;\n}',
              secenekler: [':is', ':low', ':where'],
              dogru: 2,
              dil: 'css',
              aciklama:
                  ':where() özgüllüğü sıfırlar; :is() ise argümanın özgüllüğünü alır.',
            ),
            Tablo(
              soru: 'Özgüllük değerlerini tamamla (id-sınıf-etiket).',
              baslik: ['Seçici', 'Özgüllük'],
              satirlar: [
                ['p', '0-0-1'],
                ['.kart', '0-1-0'],
                ['#sepet', '1-0-0'],
                ['div.kart', '0-1-1'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
                (satir: 3, sutun: 1),
              ],
              secenekler: ['0-0-1', '0-1-0', '1-0-0', '0-1-1'],
              aciklama: 'Her bileşen kendi sütununa sayılır.',
            ),
            Isaretle(
              soru: 'Özgüllüğü sıfır olan sözde sınıfı işaretle.',
              cumle:
                  ':where() özgüllüğü sıfırlar ama :is() argümanın özgüllüğünü alır',
              dogru: [0],
              aciklama: ':where() hiç özgüllük eklemez.',
            ),
          ],
        ),
        Ders(
          id: 'css-3-u1-d2',
          ad: ':has() ve modern seçiciler',
          alistirmalar: [
            Secim(
              soru: ':has() sözde sınıfı ne işe yarar?',
              secenekler: [
                'İçinde belirli bir öğe bulunan öğeyi seçer',
                'Öğenin üzerine gelince çalışır',
                'Yalnız çocukları gizler',
                'Öğeyi siler',
              ],
              dogru: 0,
              aciklama: ':has() ebeveyn seçici gibi davranır.',
            ),
            Secim(
              soru: 'İçinde img bulunan .kart öğelerini hangi seçici seçer?',
              secenekler: [
                '.kart img',
                '.kart:contains(img)',
                '.kart:has(img)',
                '.kart > img:parent',
              ],
              dogru: 2,
              aciklama: ':has(img) kartın içinde img arar.',
            ),
            Bosluk(
              soru: '.kart:___(.indirim) { border-color: red; }',
              secenekler: ['with', 'has', 'includes', 'contains'],
              dogru: 1,
              aciklama: 'İçinde .indirim olan kartlar seçilir.',
            ),
            Bosluk(
              soru: 'form:focus-___ { outline: 3px solid teal; }',
              secenekler: ['inside', 'child', 'deep', 'within'],
              dogru: 3,
              aciklama: ':focus-within içinde odaklı öğe varsa eşleşir.',
            ),
            Yaz(
              soru:
                  'Kendisi veya torunlarından biri odaktaysa eşleşen sözde sınıfı yaz.',
              cevaplar: [':focus-within', 'focus-within'],
              aciklama: ':focus-within formlar için kullanışlıdır.',
            ),
            Sirala(
              soru: 'Stokta olmayan rafı soluklaştıran kuralı sırala.',
              kelimeler: ['opacity: 0.6;', '}', '.raf:has(.stokta-yok)', '{'],
              dogru: ['.raf:has(.stokta-yok)', '{', 'opacity: 0.6;', '}'],
              aciklama: 'Seçici, parantez, bildirim, kapanış sırası izlenir.',
            ),
            Eslestir(
              soru: 'Seçiciyi işleviyle eşleştir.',
              ciftler: [
                (sol: ':has()', sag: 'İçindekine göre ebeveyn seçer'),
                (sol: ':is()', sag: 'Seçici listesi'),
                (sol: ':where()', sag: 'Sıfır özgüllüklü liste'),
                (sol: ':not()', sag: 'Hariç tutar'),
                (sol: ':focus-within', sag: 'İçeride odak varsa'),
              ],
              aciklama: 'Modern seçiciler daha az sınıfla daha çok iş yapar.',
            ),
            Kod(
              soru: 'İşaretli onay kutusu olan satırı vurgula.',
              kod:
                  '.urun-satiri:___(input:checked) {\n  background: #eaf7ee;\n}',
              secenekler: ['if', 'has', 'contains'],
              dogru: 1,
              dil: 'css',
              aciklama:
                  ':has(input:checked) işaretli kutu içeren satırı seçer.',
            ),
            Tablo(
              soru: 'Seçicilerin seçtiklerini tamamla.',
              baslik: ['Seçici', 'Seçtiği'],
              satirlar: [
                ['.kart:has(img)', 'görsel içeren kart'],
                ['li:not(.pasif)', 'pasif olmayan li'],
                ['input:checked', 'işaretli kutu'],
                [':is(h1, h2)', 'h1 veya h2'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
                (satir: 3, sutun: 1),
              ],
              secenekler: [
                'görsel içeren kart',
                'pasif olmayan li',
                'işaretli kutu',
                'h1 veya h2',
              ],
              aciklama: 'Her seçici farklı bir koşula bakar.',
            ),
            Isaretle(
              soru: 'Ebeveyni içindekine göre seçen sözde sınıfı işaretle.',
              cumle: 'Kartı içindeki görsele bakarak :has() seçer',
              dogru: [4],
              aciklama: ':has() içeriğe göre seçim yapar.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'css-3-u2',
      ad: 'Modern düzen',
      dersler: [
        Ders(
          id: 'css-3-u2-d1',
          ad: 'Container queries',
          alistirmalar: [
            Secim(
              soru: '@container kuralı neye göre stil uygular?',
              secenekler: [
                'Görünüm penceresi boyutuna',
                'En yakın sorgulanabilir kapsayıcının boyutuna',
                'Cihaz sürümüne',
                'Yazı tipi boyutuna',
              ],
              dogru: 1,
              aciklama: 'Bileşen, bulunduğu alana göre uyum sağlar.',
            ),
            Secim(
              soru: 'container-type: inline-size ne yapar?',
              secenekler: [
                'Öğeyi gizler',
                'Yazı yönünü değiştirir',
                'Medya sorgusunu kapatır',
                'Öğeyi satır ekseni boyutu için sorgulanabilir kapsayıcı yapar',
              ],
              dogru: 3,
              aciklama:
                  'Önce kapsayıcı tanımlanır, sonra @container ile sorgulanır.',
            ),
            Bosluk(
              soru: '.raf { container-___: inline-size; }',
              secenekler: ['mode', 'kind', 'type', 'size'],
              dogru: 2,
              aciklama: 'container-type sorgu türünü belirler.',
            ),
            Bosluk(
              soru:
                  '@container (min-___: 400px) { .kart { flex-direction: row; } }',
              secenekler: ['width', 'size', 'screen', 'area'],
              dogru: 0,
              aciklama: 'Kapsayıcının genişliği sorgulanır.',
            ),
            Yaz(
              soru:
                  'Kapsayıcıya ad vermek için kullanılan özelliği yaz (container- ile başlar).',
              cevaplar: ['container-name'],
              aciklama:
                  'Adlı kapsayıcı @container ad (…) biçiminde hedeflenir.',
            ),
            Sirala(
              soru: 'Kapsayıcı sorgusunu doğru sırala.',
              kelimeler: [
                '@container (min-width: 480px) {',
                '.kart { flex-direction: row; }',
                '}',
                '.raf {',
                'container-type: inline-size;',
                '}',
              ],
              dogru: [
                '.raf {',
                'container-type: inline-size;',
                '}',
                '@container (min-width: 480px) {',
                '.kart { flex-direction: row; }',
                '}',
              ],
              aciklama: 'Önce kapsayıcı tanımlanır, sonra sorgu yazılır.',
            ),
            Eslestir(
              soru: 'Kavramı anlamıyla eşleştir.',
              ciftler: [
                (sol: '@media', sag: 'Görünüm penceresine göre'),
                (sol: '@container', sag: 'Kapsayıcıya göre'),
                (sol: 'container-type', sag: 'Sorgulanabilir yapar'),
                (sol: 'container-name', sag: 'Kapsayıcıya ad verir'),
                (sol: 'cqw', sag: 'Kapsayıcı genişliğinin yüzde biri'),
              ],
              aciklama: 'Container query bileşenleri bağımsız duyarlı yapar.',
            ),
            Kod(
              soru: 'Vitrin genişleyince ürün kartı ızgaraya dönsün.',
              kod:
                  '.vitrin {\n  container-type: inline-size;\n}\n___ (min-width: 500px) {\n  .urun-karti { display: grid; }\n}',
              secenekler: ['@media', '@scope', '@container'],
              dogru: 2,
              dil: 'css',
              aciklama: '@container, kapsayıcı genişliğini sorgular.',
            ),
            Tablo(
              soru: 'Özelliklerin işlevini tamamla.',
              baslik: ['Özellik', 'İşlev'],
              satirlar: [
                ['container-type', 'sorgulanabilir yapar'],
                ['container-name', 'ad verir'],
                ['@container', 'koşullu stil uygular'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: [
                'sorgulanabilir yapar',
                'ad verir',
                'koşullu stil uygular',
                'gizler',
              ],
              aciklama: 'Üç parça birlikte çalışır.',
            ),
            Isaretle(
              soru: 'Kuralın adını işaretle.',
              cumle:
                  'Bileşen kendi kapsayıcısının genişliğine göre @container ile uyum sağlar',
              dogru: [5],
              aciklama: '@container kapsayıcıya göre kural yazar.',
            ),
          ],
        ),
        Ders(
          id: 'css-3-u2-d2',
          ad: 'Nesting ve mantıksal özellikler',
          alistirmalar: [
            Secim(
              soru: 'İç içe CSS\'te & işareti neyi temsil eder?',
              secenekler: [
                'Tüm sayfayı',
                'Bir yorum satırını',
                'Yeni bir sınıfı',
                'Üst (dış) seçiciyi',
              ],
              dogru: 3,
              aciklama: '&:hover gibi yazımlarda & dış seçicinin yerine geçer.',
            ),
            Secim(
              soru: 'margin-inline-start hangi tarafı belirtir?',
              secenekler: [
                'Her zaman sol tarafı',
                'Üst tarafı',
                'Yazı yönüne göre satır başı tarafını',
                'Alt tarafı',
              ],
              dogru: 2,
              aciklama: 'Soldan sağa yazıda sol, sağdan sola yazıda sağ olur.',
            ),
            Bosluk(
              soru: '.kart { color: black; ___:hover { color: red; } }',
              secenekler: ['&', '@', '\$', '^'],
              dogru: 0,
              aciklama: 'İç içe kuralda &:hover, .kart:hover demektir.',
            ),
            Bosluk(
              soru: '.kutu { padding-___: 1rem; }',
              secenekler: ['horizontal', 'left-right', 'inline', 'x'],
              dogru: 2,
              aciklama: 'padding-inline satır ekseninin iki yanını doldurur.',
            ),
            Yaz(
              soru:
                  'Blok ekseninde (genelde üst ve alt) dış boşluğu veren mantıksal özelliği yaz.',
              cevaplar: ['margin-block'],
              aciklama:
                  'margin-block üst ve alt dış boşluğu tek seferde verir.',
            ),
            Sirala(
              soru: 'İç içe menüyü doğru sırala.',
              kelimeler: ['color: teal;', '}', '}', '.menu {', 'a {'],
              dogru: ['.menu {', 'a {', 'color: teal;', '}', '}'],
              aciklama: 'İçteki kural dış bloğun içine yazılır.',
            ),
            Eslestir(
              soru: 'Fiziksel özelliği mantıksalıyla eşleştir.',
              ciftler: [
                (sol: 'width', sag: 'inline-size'),
                (sol: 'height', sag: 'block-size'),
                (sol: 'margin-left', sag: 'margin-inline-start'),
                (sol: 'padding-top', sag: 'padding-block-start'),
                (sol: 'top', sag: 'inset-block-start'),
              ],
              aciklama:
                  'Mantıksal özellikler farklı yazı yönlerinde de çalışır.',
            ),
            Kod(
              soru: 'Kartın blok başına boşluk ver.',
              kod: '.kart {\n  padding-inline: 1rem;\n  ___: 2rem;\n}',
              secenekler: [
                'margin-top-start',
                'margin-block-start',
                'margin-start-block',
              ],
              dogru: 1,
              dil: 'css',
              aciklama:
                  'margin-block-start blok ekseninin başındaki dış boşluktur.',
            ),
            Tablo(
              soru: 'Mantıksal karşılıkları tamamla.',
              baslik: ['Fiziksel', 'Mantıksal'],
              satirlar: [
                ['width', 'inline-size'],
                ['height', 'block-size'],
                ['margin-left', 'margin-inline-start'],
                ['padding-top', 'padding-block-start'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
                (satir: 3, sutun: 1),
              ],
              secenekler: [
                'inline-size',
                'block-size',
                'margin-inline-start',
                'padding-block-start',
              ],
              aciklama: 'Yatay yazıda inline yatay, block dikeydir.',
            ),
            Isaretle(
              soru: 'Mantıksal özelliği işaretle.',
              cumle: 'width fiziksel inline-size ise mantıksaldır',
              dogru: [2],
              aciklama: 'inline-size yazı yönüne göre genişliktir.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'css-3-u3',
      ad: 'Efekt ve kaydırma',
      dersler: [
        Ders(
          id: 'css-3-u3-d1',
          ad: 'Dönüşüm ve filtreler',
          alistirmalar: [
            Secim(
              soru: 'perspective özelliği ne sağlar?',
              secenekler: [
                'Yazıyı büyütür',
                'Rengi koyulaştırır',
                'Gölge ekler',
                '3B dönüşümlere derinlik hissi verir',
              ],
              dogru: 3,
              aciklama:
                  'Perspective kapsayıcıda tanımlanır ve çocukların derinliğini etkiler.',
            ),
            Secim(
              soru: 'backdrop-filter: blur(8px) ne yapar?',
              secenekler: [
                'Öğenin kendisini bulanıklaştırır',
                'Öğenin arkasındaki içeriği bulanıklaştırır',
                'Öğeyi gizler',
                'Kenarlığı yumuşatır',
              ],
              dogru: 1,
              aciklama:
                  'filter öğenin kendisine, backdrop-filter arkasına uygulanır.',
            ),
            Bosluk(
              soru: '.kart:hover { transform: ___(-4px); }',
              secenekler: ['moveY', 'shiftY', 'slideY', 'translateY'],
              dogru: 3,
              aciklama: 'translateY öğeyi dikeyde taşır.',
            ),
            Bosluk(
              soru: '.cam { backdrop-___: blur(8px); }',
              secenekler: ['blur', 'effect', 'filter', 'mask'],
              dogru: 2,
              aciklama: 'Cam efekti için backdrop-filter kullanılır.',
            ),
            Yaz(
              soru:
                  'Öğeyi döndüren transform fonksiyonunun adını yaz (örnek: rotate(45deg)).',
              cevaplar: ['rotate'],
              aciklama: 'rotate(açı) öğeyi merkezi etrafında döndürür.',
            ),
            Sirala(
              soru: '3B sahneyi doğru sırala.',
              kelimeler: [
                'transform-style: preserve-3d;',
                '}',
                '.sahne {',
                'perspective: 800px;',
              ],
              dogru: [
                '.sahne {',
                'perspective: 800px;',
                'transform-style: preserve-3d;',
                '}',
              ],
              aciklama: 'Perspective ve preserve-3d birlikte derinlik kurar.',
            ),
            Eslestir(
              soru: 'Fonksiyonu etkisiyle eşleştir.',
              ciftler: [
                (sol: 'translate()', sag: 'Taşır'),
                (sol: 'scale()', sag: 'Boyutlandırır'),
                (sol: 'rotate()', sag: 'Döndürür'),
                (sol: 'filter', sag: 'Öğeye görsel efekt'),
                (sol: 'backdrop-filter', sag: 'Arka plana efekt'),
              ],
              aciklama: 'transform ve filter farklı katmanlarda çalışır.',
            ),
            Kod(
              soru: 'Etiket gölgesini bulanıklaştır.',
              kod: '.etiket {\n  filter: ___(4px);\n}',
              secenekler: ['soften', 'blur', 'smooth'],
              dogru: 1,
              dil: 'css',
              aciklama: 'filter: blur(r) yarıçapı kadar bulanıklık verir.',
            ),
            Tablo(
              soru: 'transform işlevlerini tamamla.',
              baslik: ['Fonksiyon', 'Etki'],
              satirlar: [
                ['translate', 'taşıma'],
                ['rotate', 'döndürme'],
                ['scale', 'ölçekleme'],
                ['skew', 'eğme'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
                (satir: 3, sutun: 1),
              ],
              secenekler: ['taşıma', 'döndürme', 'ölçekleme', 'eğme'],
              aciklama: 'Her fonksiyon farklı bir geometrik dönüşümdür.',
            ),
            Isaretle(
              soru: 'Arka plana bulanıklık uygulayan özelliği işaretle.',
              cumle: 'backdrop-filter arkadaki içeriği bulanıklaştırır',
              dogru: [0],
              aciklama: 'backdrop-filter öğenin arkasını etkiler.',
            ),
          ],
        ),
        Ders(
          id: 'css-3-u3-d2',
          ad: 'Scroll-snap ve scroll animasyonu',
          alistirmalar: [
            Secim(
              soru: 'scroll-snap-type: x mandatory ne yapar?',
              secenekler: [
                'Kaydırmayı kapatır',
                'Yalnız dikey kaydırır',
                'Öğeleri gizler',
                'Yatay kaydırmada öğelere zorunlu oturur',
              ],
              dogru: 3,
              aciklama:
                  'mandatory kaydırma sonunda bir oturma noktasına gidilmesini zorunlu kılar.',
            ),
            Secim(
              soru: 'animation-timeline: scroll() ne yapar?',
              secenekler: [
                'Animasyon ilerlemesini kaydırma konumuna bağlar',
                'Animasyonu hızlandırır',
                'Animasyonu durdurur',
                'Süreyi saniyeye çevirir',
              ],
              dogru: 0,
              aciklama:
                  'Zaman yerine kaydırma ilerlemesi animasyonu sürer; tarayıcı desteğini kontrol et.',
            ),
            Bosluk(
              soru: '.serit { overflow-x: auto; scroll-snap-type: x ___; }',
              secenekler: ['mandatory', 'force', 'strict', 'always'],
              dogru: 0,
              aciklama: 'Geçerli değerler mandatory ve proximity\'dir.',
            ),
            Bosluk(
              soru: '.kart { scroll-snap-___: start; }',
              secenekler: ['position', 'point', 'align', 'stop'],
              dogru: 2,
              aciklama: 'scroll-snap-align öğenin oturma noktasını belirler.',
            ),
            Yaz(
              soru:
                  'Animasyonu kaydırma ilerlemesine bağlayan özelliği yaz (animation- ile başlar).',
              cevaplar: ['animation-timeline'],
              aciklama: 'animation-timeline zaman çizelgesini seçer.',
            ),
            Sirala(
              soru: 'Okuma ilerleme çubuğunu doğru sırala.',
              kelimeler: [
                'animation-timeline: scroll();',
                '}',
                '.ilerleme {',
                'animation: buyu linear;',
              ],
              dogru: [
                '.ilerleme {',
                'animation: buyu linear;',
                'animation-timeline: scroll();',
                '}',
              ],
              aciklama:
                  'Animasyon tanımlanır, zaman çizelgesi kaydırmaya bağlanır.',
            ),
            Eslestir(
              soru: 'Özelliği anlamıyla eşleştir.',
              ciftler: [
                (sol: 'scroll-snap-type', sag: 'Kapsayıcıda oturma ekseni'),
                (sol: 'scroll-snap-align', sag: 'Öğenin oturma noktası'),
                (sol: 'scroll()', sag: 'En yakın kaydırıcının ilerlemesi'),
                (sol: 'view()', sag: 'Öğenin görünüm ilerlemesi'),
                (sol: 'scroll-behavior: smooth', sag: 'Yumuşak kaydırma'),
              ],
              aciklama: 'Kaydırma özellikleri deneyimi akıcılaştırır.',
            ),
            Kod(
              soru: 'Afiş şeridi yatayda oturarak kaysın.',
              kod:
                  '.afis-seridi {\n  overflow-x: auto;\n  scroll-snap-type: ___ mandatory;\n}',
              secenekler: ['both-x', 'x', 'horizontal'],
              dogru: 1,
              dil: 'css',
              aciklama: 'Eksen olarak x, y, block, inline veya both yazılır.',
            ),
            Tablo(
              soru: 'Özelliklerin yerini tamamla.',
              baslik: ['Özellik', 'Nereye yazılır'],
              satirlar: [
                ['scroll-snap-type', 'kapsayıcı'],
                ['scroll-snap-align', 'çocuk öğe'],
                ['animation-timeline', 'animasyonlu öğe'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: ['kapsayıcı', 'çocuk öğe', 'animasyonlu öğe', 'body'],
              aciklama: 'Type kapsayıcıya, align çocuğa yazılır.',
            ),
            Isaretle(
              soru: 'Kaydırma ilerlemesine bağlayan işlevi işaretle.',
              cumle:
                  'animation-timeline: scroll() ile animasyon kaydırmaya bağlanır',
              dogru: [1],
              aciklama: 'scroll() kaydırıcı ilerlemesini verir.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'css-3-u4',
      ad: 'Tercih ve performans',
      dersler: [
        Ders(
          id: 'css-3-u4-d1',
          ad: 'Erişilebilirlik ve tercihler',
          alistirmalar: [
            Secim(
              soru: 'prefers-reduced-motion: reduce neyi gösterir?',
              secenekler: [
                'Kullanıcı az hareket istediğini belirtmiştir',
                'Ekran kısmen karanlıktır',
                'Bağlantı yavaştır',
                'Yazı büyütülmüştür',
              ],
              dogru: 0,
              aciklama:
                  'Vestibüler rahatsızlığı olanlar için animasyonlar azaltılmalıdır.',
            ),
            Secim(
              soru: 'color-scheme: light dark ne bildirir?',
              secenekler: [
                'Yalnız koyu tema olduğunu',
                'Rengin karıştırıldığını',
                'Yazı tipinin değiştiğini',
                'Sayfanın açık ve koyu temayı desteklediğini',
              ],
              dogru: 3,
              aciklama: 'Tarayıcı yerleşik bileşenleri temaya göre boyar.',
            ),
            Bosluk(
              soru:
                  '@media (prefers-reduced-___: reduce) { .kart { transition: none; } }',
              secenekler: ['animation', 'movement', 'speed', 'motion'],
              dogru: 3,
              aciklama: 'Özellik adı prefers-reduced-motion\'dır.',
            ),
            Bosluk(
              soru:
                  '@media (prefers-color-___: dark) { :root { --zemin: #111; } }',
              secenekler: ['mode', 'theme', 'palette', 'scheme'],
              dogru: 3,
              aciklama: 'prefers-color-scheme açık veya koyu tercihi sorar.',
            ),
            Yaz(
              soru:
                  'Tema desteğini bildirmek için :root içinde "light dark" değeri alan özelliği yaz.',
              cevaplar: ['color-scheme'],
              aciklama: 'color-scheme tarayıcı varsayılan renklerini ayarlar.',
            ),
            Sirala(
              soru: 'Hareketi azaltan sorguyu doğru sırala.',
              kelimeler: [
                '* { animation-duration: 0.01ms; }',
                '}',
                '@media (prefers-reduced-motion: reduce) {',
              ],
              dogru: [
                '@media (prefers-reduced-motion: reduce) {',
                '* { animation-duration: 0.01ms; }',
                '}',
              ],
              aciklama: 'Sorgu koşulu sağlanınca blok uygulanır.',
            ),
            Eslestir(
              soru: 'Sorguyu anlamıyla eşleştir.',
              ciftler: [
                (sol: 'prefers-color-scheme', sag: 'Açık veya koyu tema'),
                (sol: 'prefers-reduced-motion', sag: 'Az hareket'),
                (sol: 'prefers-contrast', sag: 'Karşıtlık tercihi'),
                (sol: 'color-scheme', sag: 'Yerleşik UI renkleri'),
                (sol: ':focus-visible', sag: 'Klavye odak halkası'),
              ],
              aciklama:
                  'Kullanıcı tercihlerine saygı erişilebilirliğin parçasıdır.',
            ),
            Kod(
              soru: 'Az hareket tercihinde animasyonu kapat.',
              kod:
                  '@media (prefers-reduced-motion: reduce) {\n  .kart {\n    ___: none;\n  }\n}',
              secenekler: ['motion', 'movement', 'animation'],
              dogru: 2,
              dil: 'css',
              aciklama: 'animation: none animasyonu kapatır.',
            ),
            Tablo(
              soru: 'Sorguların anlamını tamamla.',
              baslik: ['Sorgu', 'Anlamı'],
              satirlar: [
                ['(prefers-color-scheme: dark)', 'koyu tema tercihi'],
                ['(prefers-reduced-motion: reduce)', 'az hareket tercihi'],
                ['(prefers-contrast: more)', 'yüksek karşıtlık tercihi'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: [
                'koyu tema tercihi',
                'az hareket tercihi',
                'yüksek karşıtlık tercihi',
                'yazı büyütme tercihi',
              ],
              aciklama: 'Tercih sorguları işletim sistemi ayarını okur.',
            ),
            Isaretle(
              soru: 'Klavye odağını gösteren sözde sınıfı işaretle.',
              cumle:
                  'Klavye kullanıcıları için :focus-visible odak halkasını gösterir',
              dogru: [3],
              aciklama: ':focus-visible klavye odağında çalışır.',
            ),
          ],
        ),
        Ders(
          id: 'css-3-u4-d2',
          ad: 'Performans ve @property',
          alistirmalar: [
            Secim(
              soru: 'content-visibility: auto ne sağlar?',
              secenekler: [
                'Öğeyi kalıcı gizler',
                'Öğeyi büyütür',
                'Ekran dışındaki öğenin render işini erteler',
                'Animasyonu hızlandırır',
              ],
              dogru: 2,
              aciklama: 'Uzun stok listelerinde ilk yüklemeyi hızlandırır.',
            ),
            Secim(
              soru: 'will-change nasıl kullanılmalıdır?',
              secenekler: [
                'Her öğeye uygulanmalı',
                'Tüm sayfaya * ile yazılmalı',
                'Gerçekten gereken öğede ve ölçülü',
                'Hiç kapatılmamalı',
              ],
              dogru: 2,
              aciklama: 'Aşırı kullanım bellek tüketir.',
            ),
            Bosluk(
              soru: '.liste-satiri { content-___: auto; }',
              secenekler: ['hidden', 'render', 'skip', 'visibility'],
              dogru: 3,
              aciklama: 'content-visibility ekran dışı çizimi atlar.',
            ),
            Bosluk(
              soru:
                  '@property --aci { syntax: "<angle>"; inherits: false; initial-___: 0deg; }',
              secenekler: ['state', 'default', 'start', 'value'],
              dogru: 3,
              aciklama: 'initial-value başlangıç değeridir.',
            ),
            Yaz(
              soru:
                  'İki rengi belirli oranda karıştıran CSS fonksiyonunun adını yaz.',
              cevaplar: ['color-mix', 'color-mix()'],
              aciklama: 'color-mix(in srgb, renk1, renk2) renkleri karıştırır.',
            ),
            Sirala(
              soru: '@property tanımını doğru sırala.',
              kelimeler: [
                'inherits: false;',
                'initial-value: 0;',
                '}',
                '@property --oran {',
                'syntax: "<number>";',
              ],
              dogru: [
                '@property --oran {',
                'syntax: "<number>";',
                'inherits: false;',
                'initial-value: 0;',
                '}',
              ],
              aciklama: 'syntax, inherits ve initial-value üç temel alandır.',
            ),
            Eslestir(
              soru: 'Özelliği amacıyla eşleştir.',
              ciftler: [
                (sol: 'contain', sag: 'Öğeyi izole eder'),
                (sol: 'will-change', sag: 'Önceden ipucu verir'),
                (sol: 'content-visibility', sag: 'Ekran dışını atlar'),
                (sol: '@property', sag: 'Özel özelliğe tür verir'),
                (sol: 'color-mix()', sag: 'Renk karıştırır'),
              ],
              aciklama:
                  'Performans ve gelişmiş özellikler birlikte kullanılabilir.',
            ),
            Kod(
              soru: 'Kırmızıyı yüzde otuzla beyaza karıştır.',
              kod:
                  '.zemin {\n  background: color-mix(in ___, red 30%, white);\n}',
              secenekler: ['mix', 'srgb', 'blend'],
              dogru: 1,
              dil: 'css',
              aciklama: 'in sonrasında renk uzayı (srgb, oklch vb.) yazılır.',
            ),
            Tablo(
              soru: 'Özelliklerin amacını tamamla.',
              baslik: ['Özellik', 'Amaç'],
              satirlar: [
                ['contain: layout', 'düzen etkisini sınırlar'],
                ['will-change: transform', 'dönüşüm ipucu verir'],
                ['content-visibility: auto', 'ekran dışını atlar'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: [
                'düzen etkisini sınırlar',
                'dönüşüm ipucu verir',
                'ekran dışını atlar',
                'rengi karıştırır',
              ],
              aciklama: 'Üçü de tarayıcı iş yükünü azaltır.',
            ),
            Isaretle(
              soru: 'Ekran dışı çizimi erteleyen özelliği işaretle.',
              cumle:
                  'content-visibility ekran dışı bölümlerin çizimini erteler',
              dogru: [0],
              aciklama: 'content-visibility render maliyetini düşürür.',
            ),
          ],
        ),
      ],
    ),
  ],
);
