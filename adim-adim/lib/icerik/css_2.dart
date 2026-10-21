import '../model/icerik.dart';

/// CSS Orta Düzey
const Kurs css2 = Kurs(
  id: 'css-2',
  ad: 'CSS Orta Düzey',
  aciklama:
      'Barkod ve market sayfalarıyla Flexbox, Grid, duyarlı tasarım, değişkenler ve animasyonu öğren.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'css-2-u1',
      ad: 'Esnek ve ızgara düzen',
      dersler: [
        Ders(
          id: 'css-2-u1-d1',
          ad: 'Flexbox',
          alistirmalar: [
            Secim(
              soru:
                  'Market raflarındaki ürün kartlarını yan yana dizmek için kapsayıcıya hangi bildirim yazılır?',
              secenekler: [
                'display: flex',
                'flex: display',
                'position: flex',
                'layout: flex',
              ],
              dogru: 0,
              aciklama:
                  'display: flex kapsayıcıyı esnek kutu yapar; doğrudan çocukları flex öğesi olur.',
            ),
            Bosluk(
              soru: '.raf { display: flex; ___: wrap; }',
              secenekler: ['wrap-flex', 'flex-wrap', 'flex-break', 'overflow'],
              dogru: 1,
              aciklama:
                  'Öğeler sığmayınca alt satıra inmesi için flex-wrap: wrap kullanılır.',
            ),
            Secim(
              soru: 'flex-grow: 1 verilen bir öğe ne yapar?',
              secenekler: [
                'Boş alanı paylaşarak büyür',
                'Küçülmeyi engeller',
                'Öğeyi gizler',
                'Ana ekseni değiştirir',
              ],
              dogru: 0,
              aciklama:
                  'flex-grow, kalan boş alanın öğeler arasında oranla paylaşılmasını sağlar.',
            ),
            Bosluk(
              soru: '.raf { display: flex; ___: 12px; }',
              secenekler: ['margin-gap', 'flex-space', 'padding-gap', 'gap'],
              dogru: 3,
              aciklama: 'gap, flex veya grid öğeleri arasına boşluk koyar.',
            ),
            Yaz(
              soru:
                  'Ana ekseni dikey yapmak için flex-direction özelliğine verilecek değeri yaz.',
              cevaplar: ['column'],
              aciklama:
                  'flex-direction: column öğeleri yukarıdan aşağı dizer; varsayılan değer row\'dur.',
            ),
            Sirala(
              soru: 'Esnek bir ürün satırını doğru sırala.',
              kelimeler: [
                'flex-wrap: wrap;',
                '}',
                '.urunler {',
                'display: flex;',
              ],
              dogru: ['.urunler {', 'display: flex;', 'flex-wrap: wrap;', '}'],
              aciklama:
                  'Önce seçici, sonra flex bildirimleri, en sonda kapanış parantezi gelir.',
            ),
            Eslestir(
              soru: 'Değeri etkisiyle eşleştir.',
              ciftler: [
                (
                  sol: 'space-between',
                  sag: 'İlk ve son öğe kenarda, aradaki boşluk eşit',
                ),
                (sol: 'center', sag: 'Öğeler ana eksende ortada'),
                (sol: 'flex-end', sag: 'Öğeler ana eksenin sonuna yaslı'),
                (
                  sol: 'align-items: center',
                  sag: 'Öğeler çapraz eksende ortada',
                ),
                (sol: 'flex-direction: row', sag: 'Ana eksen yatay'),
              ],
              aciklama:
                  'justify-content ana ekseni, align-items çapraz ekseni hizalar.',
            ),
            Kod(
              soru:
                  'Kart boş alanı doldursun, gerekirse küçülsün ve taban boyutu sıfır olsun.',
              kod: '.kart {\n  flex: ___;\n}',
              secenekler: ['0 0 auto', '1 1 0%', '1 0 100%'],
              dogru: 1,
              dil: 'css',
              aciklama: 'flex: 1 1 0% ; grow 1, shrink 1, basis 0% demektir.',
            ),
            Tablo(
              soru: 'flex kısa yazımlarını tamamla.',
              baslik: ['Kısa yazım', 'grow', 'shrink', 'basis'],
              satirlar: [
                ['flex: 1', '1', '1', '0%'],
                ['flex: auto', '1', '1', 'auto'],
                ['flex: none', '0', '0', 'auto'],
              ],
              bos: [
                (satir: 0, sutun: 3),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 2),
              ],
              secenekler: ['1', '0', '0%', 'auto'],
              aciklama: 'flex: 1 = 1 1 0%, auto = 1 1 auto, none = 0 0 auto.',
            ),
            Isaretle(
              soru: 'Çapraz ekseni hizalayan özelliği işaretle.',
              cumle:
                  'justify-content ana ekseni align-items ise çapraz ekseni hizalar',
              dogru: [3],
              aciklama: 'align-items çapraz eksendeki hizalamayı belirler.',
            ),
          ],
        ),
        Ders(
          id: 'css-2-u1-d2',
          ad: 'Grid',
          alistirmalar: [
            Secim(
              soru: '1fr ne anlama gelir?',
              secenekler: [
                '1 piksellik sütun',
                'Bir satır yüksekliği',
                'Tek sütunlu düzen',
                'Kalan boş alanın bir payı',
              ],
              dogru: 3,
              aciklama:
                  'fr birimi grid kapsayıcısındaki boş alanı oranla paylaştırır.',
            ),
            Secim(
              soru: 'grid-template-columns: repeat(3, 1fr) ne yapar?',
              secenekler: [
                'Üç satır oluşturur',
                'Tek sütunu üç kez büyütür',
                'Hücreleri üç kez tekrarlar',
                'Eşit genişlikte üç sütun oluşturur',
              ],
              dogru: 3,
              aciklama: 'repeat(sayı, ölçü) aynı sütun tanımını tekrarlar.',
            ),
            Bosluk(
              soru:
                  'Dört eşit sütun: .vitrin { display: grid; grid-template-___: repeat(4, 1fr); }',
              secenekler: ['cols', 'columns', 'column-count', 'layout'],
              dogru: 1,
              aciklama: 'Sütunlar grid-template-columns ile tanımlanır.',
            ),
            Bosluk(
              soru:
                  'grid-template-columns: repeat(auto-fit, minmax(160px, ___));',
              secenekler: ['wrap', 'flex', '100', '1fr'],
              dogru: 3,
              aciklama:
                  'minmax(en az, en çok) ile sütun en az 160px olur, kalan alanı 1fr ile paylaşır.',
            ),
            Yaz(
              soru:
                  'Grid satır ve sütunları arasına boşluk koyan kısa özelliğin adını yaz.',
              cevaplar: ['gap', 'grid-gap'],
              aciklama:
                  'gap hem satır hem sütun aralığını belirler (eski adı grid-gap).',
            ),
            Sirala(
              soru: 'Grid tanımını doğru sırala.',
              kelimeler: [
                'grid-template-columns: 1fr 2fr;',
                '}',
                '.vitrin {',
                'display: grid;',
              ],
              dogru: [
                '.vitrin {',
                'display: grid;',
                'grid-template-columns: 1fr 2fr;',
                '}',
              ],
              aciklama: 'Önce display: grid, sonra sütun şablonu yazılır.',
            ),
            Eslestir(
              soru: 'İfadeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'minmax(200px, 1fr)', sag: 'En az 200px, en çok 1fr'),
                (sol: 'repeat(3, 1fr)', sag: 'Üç eşit sütun'),
                (sol: 'auto-fit', sag: 'Sığdığı kadar sütun, boşları daralt'),
                (sol: '1fr', sag: 'Boş alandan bir pay'),
                (sol: 'grid-column: span 2', sag: 'Hücre iki sütun kaplar'),
              ],
              aciklama:
                  'Bu ifadeler sütun şablonlarının temel yapı taşlarıdır.',
            ),
            Kod(
              soru: 'Üç eşit sütunlu market rafını tamamla.',
              kod:
                  '.market-raf {\n  display: grid;\n  grid-template-columns: ___;\n  gap: 12px;\n}',
              secenekler: ['repeat(3, 1fr)', 'repeat(1fr, 3)', '3 * 1fr'],
              dogru: 0,
              dil: 'css',
              aciklama: 'repeat(3, 1fr) üç eşit sütun üretir.',
            ),
            Tablo(
              soru: 'Sütun şablonlarını tamamla.',
              baslik: ['Yazım', 'Sütun sayısı', 'Genişlik'],
              satirlar: [
                ['repeat(2, 1fr)', '2', 'eşit'],
                ['100px 1fr', '2', 'biri sabit biri esnek'],
                ['repeat(3, 80px)', '3', 'sabit 80px'],
              ],
              bos: [
                (satir: 0, sutun: 2),
                (satir: 1, sutun: 2),
                (satir: 2, sutun: 1),
              ],
              secenekler: [
                '2',
                '3',
                'eşit',
                'biri sabit biri esnek',
                'sabit 80px',
              ],
              aciklama:
                  'repeat sayıyı tekrarlar; 100px 1fr ise sabit ve esnek iki sütundur.',
            ),
            Isaretle(
              soru: 'Esnek (kesirli) birimi işaretle.',
              cumle: 'Sütunlar 200px sabit veya 1fr esnek olabilir',
              dogru: [4],
              aciklama: 'fr, kalan alanın payını belirten birimdir.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'css-2-u2',
      ad: 'Konum ve duyarlılık',
      dersler: [
        Ders(
          id: 'css-2-u2-d1',
          ad: 'Konumlandırma',
          alistirmalar: [
            Secim(
              soru: 'position özelliğinin varsayılan değeri nedir?',
              secenekler: ['relative', 'absolute', 'static', 'sticky'],
              dogru: 2,
              aciklama:
                  'Öğeler varsayılan olarak static, yani normal akıştadır.',
            ),
            Secim(
              soru: 'position: absolute olan öğe neye göre konumlanır?',
              secenekler: [
                'Her zaman sayfanın sol üst köşesine',
                'Konumlu (static olmayan) en yakın atasına',
                'Kendi eski yerine',
                'Yalnız body öğesine',
              ],
              dogru: 1,
              aciklama:
                  'Konumlu ata yoksa başlangıç kapsayıcısına göre konumlanır.',
            ),
            Bosluk(
              soru:
                  'Kartın köşesine yapışan rozet: .rozet { position: ___; top: 0; right: 0; }',
              secenekler: ['static', 'inline', 'float', 'absolute'],
              dogru: 3,
              aciklama: 'Kart relative iken rozet absolute ile köşeye oturur.',
            ),
            Bosluk(
              soru:
                  'Kaydırınca üstte yapışan başlık: .baslik { position: ___; top: 0; }',
              secenekler: ['scroll', 'sticky', 'stick', 'pinned'],
              dogru: 1,
              aciklama:
                  'sticky eşiğe gelene kadar akışta kalır, sonra yapışır.',
            ),
            Yaz(
              soru:
                  'Üst üste binen öğelerin katman sırasını belirleyen özelliği yaz.',
              cevaplar: ['z-index'],
              aciklama:
                  'z-index büyük olan öğe üstte görünür; konumlu öğelerde çalışır.',
            ),
            Sirala(
              soru: 'Sabit üst çubuğu doğru sırala.',
              kelimeler: [
                'top: 0;',
                'width: 100%;',
                '}',
                '.ust-bar {',
                'position: fixed;',
              ],
              dogru: [
                '.ust-bar {',
                'position: fixed;',
                'top: 0;',
                'width: 100%;',
                '}',
              ],
              aciklama: 'fixed öğe görünüm penceresine göre konumlanır.',
            ),
            Eslestir(
              soru: 'Değeri davranışıyla eşleştir.',
              ciftler: [
                (sol: 'static', sag: 'Normal akış'),
                (sol: 'relative', sag: 'Kendi yerine göre kaydırılır'),
                (sol: 'absolute', sag: 'Konumlu atasına göre yerleşir'),
                (sol: 'fixed', sag: 'Görünüm penceresine göre sabit'),
                (sol: 'sticky', sag: 'Kaydırınca eşikte yapışır'),
              ],
              aciklama: 'Her değer farklı bir konumlandırma bağlamı kurar.',
            ),
            Kod(
              soru: 'Rozeti kartın üst sağ köşesine yerleştir.',
              kod:
                  '.kart { position: relative; }\n.kart .rozet {\n  position: absolute;\n  ___: 0;\n  right: 0;\n}',
              secenekler: ['top', 'float', 'align'],
              dogru: 0,
              dil: 'css',
              aciklama: 'top: 0 öğeyi üst kenara, right: 0 sağ kenara yaslar.',
            ),
            Tablo(
              soru: 'position değerlerini tamamla.',
              baslik: ['Değer', 'Akışta yer kaplar', 'Referans'],
              satirlar: [
                ['static', 'evet', 'normal akış'],
                ['absolute', 'hayır', 'konumlu ata'],
                ['fixed', 'hayır', 'görünüm penceresi'],
              ],
              bos: [
                (satir: 1, sutun: 1),
                (satir: 1, sutun: 2),
                (satir: 2, sutun: 2),
              ],
              secenekler: [
                'evet',
                'hayır',
                'normal akış',
                'konumlu ata',
                'görünüm penceresi',
              ],
              aciklama: 'absolute ve fixed öğeler akıştan çıkar.',
            ),
            Isaretle(
              soru:
                  'Rozetin referans alacağı atada bulunması gereken değeri işaretle.',
              cumle: 'Rozet absolute olduğundan kartın değeri relative olmalı',
              dogru: [5],
              aciklama:
                  'Ata relative olunca absolute çocuk ona göre konumlanır.',
            ),
          ],
        ),
        Ders(
          id: 'css-2-u2-d2',
          ad: 'Duyarlı tasarım',
          alistirmalar: [
            Secim(
              soru: 'Mobil öncelikli (mobile-first) yaklaşım nedir?',
              secenekler: [
                'Önce masaüstü yazılır, max-width ile küçülür',
                'Yalnız telefon için ayrı site yapılır',
                'Önce küçük ekran stili yazılır, geniş ekranlar min-width ile eklenir',
                'Medya sorgusu hiç kullanılmaz',
              ],
              dogru: 2,
              aciklama:
                  'Mobil öncelikli yazımda temel stil küçük ekrana aittir.',
            ),
            Secim(
              soru: 'font-size: clamp(1rem, 2.5vw, 2rem) ne yapar?',
              secenekler: [
                'Sabit 2.5vw yapar',
                'Yalnız 1rem kullanır',
                'En az 1rem, en çok 2rem, arası 2.5vw',
                'Boyutu 2rem ile 2.5vw toplar',
              ],
              dogru: 2,
              aciklama:
                  'clamp(en az, tercih, en çok) değeri iki sınır arasında tutar.',
            ),
            Bosluk(
              soru:
                  '@media (___-width: 768px) { .raf { flex-direction: row; } }',
              secenekler: ['less', 'from', 'under', 'min'],
              dogru: 3,
              aciklama:
                  'min-width, ekran en az bu genişlikteyse kuralı uygular.',
            ),
            Bosluk(
              soru: 'Kök yazı boyutuna göre ölçü: h1 { font-size: 2___; }',
              secenekler: ['px', 'vh', 'ch', 'rem'],
              dogru: 3,
              aciklama: 'rem, html öğesinin yazı boyutuna göre ölçeklenir.',
            ),
            Yaz(
              soru: 'Medya sorgusunu başlatan @ kuralını yaz.',
              cevaplar: ['@media', 'media'],
              aciklama: 'Koşullu stiller @media bloğunda yazılır.',
            ),
            Sirala(
              soru: 'Geniş ekran kuralını doğru sırala.',
              kelimeler: [
                'grid-template-columns: 1fr 1fr;',
                '}',
                '}',
                '@media (min-width: 600px) {',
                '.liste {',
              ],
              dogru: [
                '@media (min-width: 600px) {',
                '.liste {',
                'grid-template-columns: 1fr 1fr;',
                '}',
                '}',
              ],
              aciklama: 'Medya bloğunun içinde seçici bloğu yer alır.',
            ),
            Eslestir(
              soru: 'Birimi/kuralı anlamıyla eşleştir.',
              ciftler: [
                (sol: 'vw', sag: 'Pencere genişliğinin yüzde biri'),
                (sol: 'rem', sag: 'Kök yazı boyutu çarpanı'),
                (sol: 'clamp()', sag: 'Alt ve üst sınırlı değer'),
                (sol: 'min-width', sag: 'Bu genişlikten itibaren'),
                (sol: 'max-width', sag: 'Bu genişliğe kadar'),
              ],
              aciklama: 'Duyarlı tasarım birimleri ve koşulları bunlardır.',
            ),
            Kod(
              soru: 'Başlık boyutu pencere genişliğiyle akıcı büyüsün.',
              kod: '.baslik {\n  font-size: clamp(1.25rem, ___, 2.5rem);\n}',
              secenekler: ['4', '4vw', 'vw(4)'],
              dogru: 1,
              dil: 'css',
              aciklama:
                  '4vw, pencere genişliğinin yüzde dördüdür; clamp onu sınırlar.',
            ),
            Tablo(
              soru: 'Birimleri tamamla.',
              baslik: ['Birim', 'Neye göre', 'Örnek'],
              satirlar: [
                ['px', 'sabit piksel', '16px'],
                ['rem', 'kök yazı boyutu', '1.5rem'],
                ['vw', 'pencere genişliği', '50vw'],
              ],
              bos: [
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
                (satir: 0, sutun: 2),
              ],
              secenekler: [
                'sabit piksel',
                'kök yazı boyutu',
                'pencere genişliği',
                '16px',
                '1.5rem',
              ],
              aciklama: 'rem köke, vw pencereye bağlıdır.',
            ),
            Isaretle(
              soru: 'Yaklaşımın adını oluşturan iki kelimeyi işaretle.',
              cumle:
                  'Önce küçük ekran stilleri yazılır buna mobil öncelikli denir',
              dogru: [6, 7],
              aciklama: 'Mobil öncelikli yaklaşım küçük ekranla başlar.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'css-2-u3',
      ad: 'Değişken ve hareket',
      dersler: [
        Ders(
          id: 'css-2-u3-d1',
          ad: 'Özel özellikler',
          alistirmalar: [
            Secim(
              soru: 'Özel özellik (CSS değişkeni) nasıl tanımlanır?',
              secenekler: [
                '\$ana-renk: #0a7c4a;',
                'var ana-renk = #0a7c4a;',
                '@ana-renk: #0a7c4a;',
                '--ana-renk: #0a7c4a;',
              ],
              dogru: 3,
              aciklama: 'Özel özellik adı iki tire ile başlar.',
            ),
            Secim(
              soru: 'var(--renk, red) ifadesindeki red neyi belirtir?',
              secenekler: [
                'Rengin koyu tonunu',
                'Değişkenin adını',
                'Zorunlu değeri',
                '--renk tanımlı değilse yedek değeri',
              ],
              dogru: 3,
              aciklama:
                  'var() ikinci argümanı yedek (fallback) olarak kullanır.',
            ),
            Bosluk(
              soru: ':root { ___ana-renk: #0a7c4a; }',
              secenekler: ['--', '\$', '@', '#'],
              dogru: 0,
              aciklama: 'Özel özellikler -- ile başlar.',
            ),
            Bosluk(
              soru: 'color: ___(--ana-renk);',
              secenekler: ['use', 'get', 'env', 'var'],
              dogru: 3,
              aciklama: 'Özel özelliğin değeri var() ile okunur.',
            ),
            Yaz(
              soru:
                  'Değişkenleri tüm sayfada kullanılır yapmak için tanımlandıkları seçiciyi yaz (iki nokta ile).',
              cevaplar: [':root'],
              aciklama:
                  ':root belgenin kök öğesini seçer, değişkenler buradan miras alınır.',
            ),
            Sirala(
              soru: 'Genişlik hesabını doğru sırala.',
              kelimeler: ['-', '2rem);', 'width:', 'calc(100%'],
              dogru: ['width:', 'calc(100%', '-', '2rem);'],
              aciklama: 'calc içinde işleç boşlukla çevrilidir.',
            ),
            Eslestir(
              soru: 'İfadeyi anlamıyla eşleştir.',
              ciftler: [
                (sol: '--renk: red', sag: 'Özel özellik tanımı'),
                (sol: 'var(--renk)', sag: 'Değeri kullanma'),
                (sol: 'calc()', sag: 'Birimli değer hesabı'),
                (sol: ':root', sag: 'Global değişken yeri'),
                (sol: 'var(--a, blue)', sag: 'Yedek değerli kullanım'),
              ],
              aciklama: 'Değişkenler tanımlanır, var() ile okunur.',
            ),
            Kod(
              soru: 'Boşluğu iki katına çıkar.',
              kod:
                  '.etiket {\n  --bosluk: 8px;\n  padding: calc(var(--bosluk) * ___);\n}',
              secenekler: ['2px', '"2"', '2'],
              dogru: 2,
              dil: 'css',
              aciklama: 'Çarpmada çarpanlardan biri birimsiz sayı olmalıdır.',
            ),
            Tablo(
              soru: 'calc sonuçlarını tamamla (--b: 10px).',
              baslik: ['İfade', 'Sonuç'],
              satirlar: [
                ['calc(10px + 5px)', '15px'],
                ['calc(var(--b) * 2)', '20px'],
                ['calc(var(--b) / 2)', '5px'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: ['15px', '20px', '5px', '10px'],
              aciklama: 'Toplama ve çarpma birimleri korur.',
            ),
            Isaretle(
              soru: 'Değişkenin kullanıldığı kısmı işaretle.',
              cumle: 'color: var(--ana-renk);',
              dogru: [1],
              aciklama: 'var(...) değişkeni okur.',
            ),
          ],
        ),
        Ders(
          id: 'css-2-u3-d2',
          ad: 'Geçiş ve animasyon',
          alistirmalar: [
            Secim(
              soru: 'transition ne yapar?',
              secenekler: [
                'Öğeyi gizler',
                'Bir değer değişimini yumuşak geçişle gösterir',
                'Yeni öğe ekler',
                'Yazı tipini değiştirir',
              ],
              dogru: 1,
              aciklama:
                  'Geçiş, başlangıç ve bitiş değerleri arasını süreye yayar.',
            ),
            Secim(
              soru: '@keyframes neyi tanımlar?',
              secenekler: [
                'Medya sorgusunu',
                'Animasyon adımlarını',
                'Yazı tipini',
                'Renk paletini',
              ],
              dogru: 1,
              aciklama: '@keyframes animasyonun adımlarını adlandırır.',
            ),
            Bosluk(
              soru: '.dugme { transition: background-color 0.3s ___; }',
              secenekler: ['ease-in-out', 'smooth', 'fade', 'linear-out'],
              dogru: 0,
              aciklama: 'ease-in-out yavaş başlar, hızlanır, yavaş biter.',
            ),
            Bosluk(
              soru: '.yukleniyor { animation: don 1s ___ infinite; }',
              secenekler: ['loop', 'linear', 'repeat', 'forever'],
              dogru: 1,
              aciklama: 'linear sabit hızdır; infinite sonsuz tekrar eder.',
            ),
            Yaz(
              soru: 'Animasyon adımlarını tanımlayan @ kuralını yaz.',
              cevaplar: ['@keyframes', 'keyframes'],
              aciklama: 'animation-name bu kuraldaki adı kullanır.',
            ),
            Sirala(
              soru: 'Animasyon tanımını doğru sırala.',
              kelimeler: [
                'to { opacity: 1; }',
                '}',
                '@keyframes belir {',
                'from { opacity: 0; }',
              ],
              dogru: [
                '@keyframes belir {',
                'from { opacity: 0; }',
                'to { opacity: 1; }',
                '}',
              ],
              aciklama: 'from başlangıç, to bitiş adımıdır.',
            ),
            Eslestir(
              soru: 'Özelliği anlamıyla eşleştir.',
              ciftler: [
                (sol: 'transition-duration', sag: 'Geçiş süresi'),
                (sol: 'animation-iteration-count', sag: 'Tekrar sayısı'),
                (sol: 'animation-delay', sag: 'Başlamadan önceki bekleme'),
                (sol: 'transition-timing-function', sag: 'İvme eğrisi'),
                (sol: '@keyframes', sag: 'Animasyon adımları'),
              ],
              aciklama: 'Zamanlama özellikleri geçiş ve animasyonu ayarlar.',
            ),
            Kod(
              soru: 'Fareyle üzerine gelince kart hafifçe büyüsün.',
              kod:
                  '.kart {\n  transition: transform 0.2s;\n}\n.kart:hover {\n  transform: ___;\n}',
              secenekler: ['grow(1.05)', 'zoom(1.05)', 'scale(1.05)'],
              dogru: 2,
              dil: 'css',
              aciklama: 'scale() öğeyi ölçekler.',
            ),
            Tablo(
              soru: 'Özellik işlevlerini tamamla.',
              baslik: ['Özellik', 'Örnek', 'Ne belirler'],
              satirlar: [
                ['transition-property', 'opacity', 'geçiş yapacak özellik'],
                ['animation-name', 'don', 'çalışacak @keyframes'],
                ['transition-duration', '0.3s', 'geçişin süresi'],
              ],
              bos: [
                (satir: 0, sutun: 2),
                (satir: 1, sutun: 2),
                (satir: 2, sutun: 2),
              ],
              secenekler: [
                'geçiş yapacak özellik',
                'çalışacak @keyframes',
                'geçişin süresi',
                'animasyon süresi',
              ],
              aciklama:
                  'Her özellik geçiş veya animasyonun ayrı bir yönünü belirler.',
            ),
            Isaretle(
              soru: 'Animasyon adımlarını tanımlayan kuralı işaretle.',
              cumle: 'Animasyonun adımları @keyframes kuralıyla tanımlanır',
              dogru: [2],
              aciklama: 'Adımlar @keyframes içinde yazılır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'css-2-u4',
      ad: 'Seçici ve yazı',
      dersler: [
        Ders(
          id: 'css-2-u4-d1',
          ad: 'Sözde sınıf ve öğeler',
          alistirmalar: [
            Secim(
              soru: ':hover sözde sınıfı ne zaman uygulanır?',
              secenekler: [
                'Öğe tıklanıp bırakıldığında',
                'Fare imleci öğenin üzerindeyken',
                'Sayfa yüklenirken',
                'Klavye ile odaklanınca',
              ],
              dogru: 1,
              aciklama: ':hover fare üstüne gelince etkindir.',
            ),
            Secim(
              soru: 'li:nth-child(2n) hangi öğeleri seçer?',
              secenekler: [
                'Yalnız ikinci li öğesini',
                'Tek sıradaki li öğelerini',
                'Son iki li öğesini',
                'Çift sıradaki li öğelerini',
              ],
              dogru: 3,
              aciklama: '2n çift sıraları (2, 4, 6...) ifade eder.',
            ),
            Bosluk(
              soru: '.fiyat::___ { content: " TL"; }',
              secenekler: ['end', 'append', 'suffix', 'after'],
              dogru: 3,
              aciklama: '::after öğenin içeriğinden sonra sahte öğe ekler.',
            ),
            Bosluk(
              soru: '.urun:___(.stokta-yok) { opacity: 1; }',
              secenekler: ['no', 'not', 'except', 'without'],
              dogru: 1,
              aciklama: ':not(seçici) belirtilen seçiciye uymayanları seçer.',
            ),
            Yaz(
              soru:
                  'İçeriğin önüne sahte öğe ekleyen sözde öğeyi yaz (iki iki nokta ile).',
              cevaplar: ['::before', ':before'],
              aciklama:
                  '::before içeriğin başına content ile metin veya görsel ekler.',
            ),
            Sirala(
              soru: 'Zebra satırı kuralını doğru sırala.',
              kelimeler: [
                'background: #f5f5f5;',
                '}',
                'li:nth-child(odd)',
                '{',
              ],
              dogru: ['li:nth-child(odd)', '{', 'background: #f5f5f5;', '}'],
              aciklama: 'odd tek sıradaki öğeleri seçer.',
            ),
            Eslestir(
              soru: 'Seçiciyi anlamıyla eşleştir.',
              ciftler: [
                (sol: ':hover', sag: 'Fare üstünde'),
                (sol: ':focus-visible', sag: 'Klavye odağı'),
                (sol: ':first-child', sag: 'İlk çocuk'),
                (sol: '::before', sag: 'Öğeden önce sahte içerik'),
                (sol: ':is()', sag: 'Seçici listesini kısaltır'),
              ],
              aciklama:
                  'Sözde sınıflar durumu, sözde öğeler sahte içeriği seçer.',
            ),
            Kod(
              soru: 'Üç başlık düzeyine tek kuralla stil ver.',
              kod: ':___(h1, h2, h3) {\n  margin-block: 0;\n}',
              secenekler: [':list', ':group', ':is'],
              dogru: 2,
              dil: 'css',
              aciklama: ':is() seçici listesini tek kuralda toplar.',
            ),
            Tablo(
              soru: 'Seçicilerin seçtiklerini tamamla.',
              baslik: ['Seçici', 'Seçtiği'],
              satirlar: [
                ['li:first-child', 'ilk li'],
                ['li:last-child', 'son li'],
                ['li:nth-child(2)', 'ikinci li'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: ['ilk li', 'son li', 'ikinci li', 'tüm li'],
              aciklama: 'first ilk, last son, nth sıra numarasıdır.',
            ),
            Isaretle(
              soru: 'Sözde sınıfı işaretle.',
              cumle: 'a:hover fare üzerindeki bağlantıyı seçer',
              dogru: [0],
              aciklama: 'Seçicideki :hover bir sözde sınıftır.',
            ),
          ],
        ),
        Ders(
          id: 'css-2-u4-d2',
          ad: 'Renk ve tipografi',
          alistirmalar: [
            Secim(
              soru: 'hsl() renk gösterimi neyi belirtir?',
              secenekler: [
                'Renk tonu, doygunluk ve açıklık',
                'Kırmızı, yeşil ve mavi',
                'Yalnız saydamlık',
                'Parlaklık ve kontrast',
              ],
              dogru: 0,
              aciklama: 'hsl(ton doygunluk açıklık) biçimindedir.',
            ),
            Secim(
              soru: 'line-height: 1.5 ne demektir?',
              secenekler: [
                'Satır 1,5 piksel olur',
                'Satır yüksekliği yazı boyutunun 1,5 katı',
                'Harf aralığı 1,5 katı',
                'Yazı 1,5 kat büyür',
              ],
              dogru: 1,
              aciklama: 'Birimsiz line-height yazı boyutuyla çarpılır.',
            ),
            Bosluk(
              soru:
                  '@font-___ { font-family: "Market"; src: url(market.woff2) format("woff2"); }',
              secenekler: ['type', 'face', 'import', 'load'],
              dogru: 1,
              aciklama: '@font-face özel yazı tipi tanımlar.',
            ),
            Bosluk(
              soru: 'color: rgb(255 0 0 / ___);',
              secenekler: ['half', '50px', '#50', '50%'],
              dogru: 3,
              aciklama: 'Eğik çizgiden sonra alfa (saydamlık) yazılır.',
            ),
            Yaz(
              soru:
                  'Inter bulunamazsa devreye girecek genel yedek ailesini yaz: font-family: Inter, ...;',
              cevaplar: ['sans-serif'],
              aciklama: 'Yedek aile listenin sonuna yazılır.',
            ),
            Sirala(
              soru: 'Yazı tipi listesini doğru sırala.',
              kelimeler: [
                'system-ui,',
                'sans-serif;',
                'font-family:',
                '"Inter",',
              ],
              dogru: ['font-family:', '"Inter",', 'system-ui,', 'sans-serif;'],
              aciklama: 'Tercih sırası soldan sağadır.',
            ),
            Eslestir(
              soru: 'Özelliği anlamıyla eşleştir.',
              ciftler: [
                (sol: 'hsl()', sag: 'Ton, doygunluk, açıklık'),
                (sol: 'rgb()', sag: 'Kırmızı, yeşil, mavi'),
                (
                  sol: 'font-display: swap',
                  sag: 'Yazı gelene dek yedek göster',
                ),
                (sol: 'letter-spacing', sag: 'Harf aralığı'),
                (sol: 'line-height', sag: 'Satır aralığı'),
              ],
              aciklama:
                  'Renk ve tipografi özellikleri okunabilirliği belirler.',
            ),
            Kod(
              soru: 'Okunaklı satır aralığı ver.',
              kod: 'body {\n  font-family: Inter, sans-serif;\n  ___: 1.6;\n}',
              secenekler: ['line-space', 'row-height', 'line-height'],
              dogru: 2,
              dil: 'css',
              aciklama: 'line-height satır aralığını belirler.',
            ),
            Tablo(
              soru: 'Renk kodlarını tamamla.',
              baslik: ['Renk kodu', 'Renk'],
              satirlar: [
                ['hsl(0 100% 50%)', 'kırmızı'],
                ['hsl(120 100% 50%)', 'yeşil'],
                ['hsl(240 100% 50%)', 'mavi'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: ['kırmızı', 'yeşil', 'mavi', 'sarı'],
              aciklama: '0 kırmızı, 120 yeşil, 240 mavi tondur.',
            ),
            Isaretle(
              soru: 'Üç kanallı renk gösterimini işaretle.',
              cumle: 'rgb kırmızı yeşil ve mavi değerleriyle renk tanımlar',
              dogru: [0],
              aciklama: 'rgb üç ışık kanalını kullanır.',
            ),
          ],
        ),
      ],
    ),
  ],
);
