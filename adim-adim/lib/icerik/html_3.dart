import '../model/icerik.dart';

/// HTML İleri Düzey
const Kurs html3 = Kurs(
  id: 'html-3',
  ad: 'HTML İleri Düzey',
  aciklama:
      'Dialog, Web Components, performans, güvenlik, yapılandırılmış veri, canvas ve PWA ile market uygulamasını profesyonelleştir.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'html-3-u1',
      ad: 'Etkileşimli öğeler ve bileşenler',
      dersler: [
        Ders(
          id: 'html-3-u1-d1',
          ad: 'dialog, details ve popover',
          alistirmalar: [
            Secim(
              soru:
                  'dialog öğesini modal olarak açan JavaScript yöntemi hangisidir?',
              secenekler: [
                'dialog.open()',
                'dialog.showModal()',
                'dialog.popup()',
                'dialog.display()',
              ],
              dogru: 1,
              aciklama:
                  'showModal() diyaloğu üst katmanda açar ve arkadaki sayfayı etkileşime kapatır.',
            ),
            Secim(
              soru:
                  'JavaScript yazmadan açılıp kapanan bölüm için hangi etiket kullanılır?',
              secenekler: ['<toggle>', '<fold>', '<details>', '<expand>'],
              dogru: 2,
              aciklama:
                  'details, summary ile birlikte yerleşik aç-kapa davranışı verir.',
            ),
            Bosluk(
              soru: '<details><___>Ürün ayrıntısı</summary>Raf 3</details>',
              secenekler: ['legend', 'summary', 'caption', 'title'],
              dogru: 1,
              aciklama: 'summary details kapalıyken görünen başlıktır.',
            ),
            Bosluk(
              soru: '<div id="ipucu" ___>Stok azaldı</div>',
              secenekler: ['hidden', 'dialog', 'popover', 'tooltip'],
              dogru: 2,
              aciklama:
                  'popover niteliği öğeyi başlangıçta gizli, üst katmanda açılabilir yapar.',
            ),
            Yaz(
              soru: 'Düğmeyi bir popover öğesine bağlayan niteliğin adını yaz.',
              cevaplar: ['popovertarget'],
              aciklama:
                  'popovertarget, hedef popover öğesinin id değerini alır.',
            ),
            Sirala(
              soru: 'Popover düğmesini sırala.',
              kelimeler: [
                '</button>',
                '<button',
                'Menü',
                'popovertarget="menu">',
              ],
              dogru: ['<button', 'popovertarget="menu">', 'Menü', '</button>'],
              aciklama: 'Niteliğin değeri hedef popover öğesinin id değeridir.',
            ),
            Eslestir(
              soru: 'Kavramı görevi ile eşleştir.',
              ciftler: [
                (sol: '<dialog>', sag: 'Diyalog penceresi'),
                (sol: '<details>', sag: 'Aç-kapa bölüm'),
                (sol: '<summary>', sag: 'Görünen başlık'),
                (sol: 'popovertarget', sag: 'Popover tetikleyici'),
                (sol: 'close()', sag: 'Diyaloğu kapatır'),
              ],
              aciklama: 'Bu yerleşik öğeler az kodla etkileşim sağlar.',
            ),
            Tablo(
              soru: 'Yöntem ve görev tablosunu tamamla.',
              baslik: ['Yöntem', 'Görev'],
              satirlar: [
                ['show()', 'Modalsız açar'],
                ['showModal()', 'Modal açar'],
                ['close()', 'Kapatır'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: ['Modalsız açar', 'Modal açar', 'Kapatır'],
              aciklama:
                  'showModal() arka planı etkileşime kapatır, show() kapatmaz.',
            ),
            Isaretle(
              soru: 'Başlık olarak görünen öğeyi işaretle.',
              cumle: '<details> <summary>Detay</summary> Raf 3 </details>',
              dogru: [1],
              aciklama: 'summary, details kapalıyken görünen kısımdır.',
            ),
            Kod(
              soru: 'Diyaloğu modal açan yöntemi seç.',
              kod:
                  '<dialog id="onay">Silinsin mi?</dialog>\n<script>\n  document.getElementById("onay").___();\n</script>',
              secenekler: ['showModal', 'openModal', 'popup'],
              dogru: 0,
              dil: 'html',
              aciklama: 'showModal() standart yöntemdir; diğerleri yoktur.',
            ),
          ],
        ),
        Ders(
          id: 'html-3-u1-d2',
          ad: 'template, slot ve Web Components',
          alistirmalar: [
            Secim(
              soru:
                  'Sayfada görünmeyen, sonradan kopyalanıp kullanılan HTML parçası için hangi etiket kullanılır?',
              secenekler: ['<template>', '<slot>', '<script>', '<defer>'],
              dogru: 0,
              aciklama:
                  'template içeriği işlenmez; JavaScript ile kopyalanınca görünür.',
            ),
            Secim(
              soru: 'Özel öğe adı için hangisi geçerlidir?',
              secenekler: [
                'urunKarti',
                'URUNKARTI',
                'urun-karti',
                'urun_karti',
              ],
              dogru: 2,
              aciklama:
                  'Özel öğe adları küçük harfli olmalı ve tire içermelidir.',
            ),
            Bosluk(
              soru: '<slot ___="baslik"></slot>',
              secenekler: ['id', 'name', 'for', 'ref'],
              dogru: 1,
              aciklama:
                  'Adlandırılmış slot, slot="baslik" olan çocuğu karşılar.',
            ),
            Bosluk(
              soru:
                  'Özel öğeyi kaydeden çağrı: customElements.___("urun-karti", UrunKarti);',
              secenekler: ['add', 'register', 'define', 'create'],
              dogru: 2,
              aciklama: 'customElements.define ad ile sınıfı eşleştirir.',
            ),
            Yaz(
              soru:
                  'template.content üzerinde kopya almak için çağrılan yöntemin adını yaz (parantezsiz).',
              cevaplar: ['cloneNode', 'clonenode'],
              aciklama: 'cloneNode(true) şablonun derin kopyasını üretir.',
            ),
            Sirala(
              soru: 'Özel öğe sınıfının başlığını sırala.',
              kelimeler: ['HTMLElement', 'class', 'extends', 'UrunKarti'],
              dogru: ['class', 'UrunKarti', 'extends', 'HTMLElement'],
              aciklama:
                  'Özel öğeler genellikle HTMLElement sınıfından türetilir.',
            ),
            Eslestir(
              soru: 'Kavramı görevi ile eşleştir.',
              ciftler: [
                (sol: '<template>', sag: 'Hazır şablon'),
                (sol: '<slot>', sag: 'İçerik yuvası'),
                (sol: 'customElements.define', sag: 'Öğe kaydı'),
                (sol: 'attachShadow', sag: 'Gölge DOM kurar'),
                (sol: 'connectedCallback', sag: 'Sayfaya eklenince çalışır'),
              ],
              aciklama:
                  'Web Components bu dört yerleşik özelliğin birleşimidir.',
            ),
            Tablo(
              soru: 'Kavram ve rol tablosunu tamamla.',
              baslik: ['Kavram', 'Rol'],
              satirlar: [
                ['template', 'Şablon tutar'],
                ['slot', 'Yuva açar'],
                ['shadow DOM', 'Stil yalıtımı'],
                ['customElements', 'Öğe kaydı'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: [
                'Şablon tutar',
                'Yuva açar',
                'Stil yalıtımı',
                'Öğe kaydı',
              ],
              aciklama: 'Gölge DOM bileşenin stilini dış sayfadan yalıtır.',
            ),
            Isaretle(
              soru: 'Özel öğenin açılış ve kapanış etiketlerini işaretle.',
              cumle: '<urun-karti> <span slot="ad">Süt</span> </urun-karti>',
              dogru: [0, 3],
              aciklama: 'Tireli etiket adı özel öğeye aittir.',
            ),
            Kod(
              soru: 'Şablondaki yuvayı açan etiketi seç.',
              kod:
                  '<template id="kart">\n  <p><___ name="ad"></slot></p>\n</template>',
              secenekler: ['slot', 'span', 'div'],
              dogru: 0,
              dil: 'html',
              aciklama:
                  'Kapanış etiketi </slot> olduğu için açılış slot olmalı.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'html-3-u2',
      ad: 'Performans ve güvenlik',
      dersler: [
        Ders(
          id: 'html-3-u2-d1',
          ad: 'Yükleme performansı',
          alistirmalar: [
            Secim(
              soru:
                  'Görsel ekrana yaklaşınca yüklensin istiyorsan hangisini yazarsın?',
              secenekler: [
                'loading="lazy"',
                'defer="lazy"',
                'async="img"',
                'fetch="late"',
              ],
              dogru: 0,
              aciklama: 'loading="lazy" ekran dışındaki görselleri erteler.',
            ),
            Secim(
              soru: 'async betik nasıl çalışır?',
              secenekler: [
                'Her zaman sırayla çalışır',
                'İndirilir inmez çalışır, sıra garanti değildir',
                'Yalnızca tıklanınca çalışır',
                'Hiç çalışmaz',
              ],
              dogru: 1,
              aciklama:
                  'async betikler indikleri anda çalışır; sıra garanti edilmez.',
            ),
            Bosluk(
              soru:
                  '<script src="app.js" ___></script> ayrıştırma bitince sırayla çalışsın.',
              secenekler: ['async', 'defer', 'module', 'lazy'],
              dogru: 1,
              aciklama:
                  'defer betikleri sayfa ayrıştırıldıktan sonra sırayla çalıştırır.',
            ),
            Bosluk(
              soru: '<link rel="___" href="font.woff" as="font" crossorigin>',
              secenekler: ['prefetch', 'preload', 'import', 'include'],
              dogru: 1,
              aciklama:
                  'preload, bu sayfa için gereken kaynağı erkenden indirir.',
            ),
            Yaz(
              soru:
                  'Sonraki sayfada gerekecek kaynağı boş zamanda indiren rel değerini yaz.',
              cevaplar: ['prefetch'],
              aciklama:
                  'prefetch düşük öncelikle sonraki gezinti için önbelleğe alır.',
            ),
            Sirala(
              soru: 'Ertelenmiş görseli sırala.',
              kelimeler: [
                'alt="Süt">',
                '<img',
                'loading="lazy"',
                'src="urun.jpg"',
              ],
              dogru: ['<img', 'src="urun.jpg"', 'loading="lazy"', 'alt="Süt">'],
              aciklama:
                  'Etiket adı, kaynak, yükleme davranışı ve alt metin yazıldı.',
            ),
            Eslestir(
              soru: 'Kavramı davranışı ile eşleştir.',
              ciftler: [
                (sol: 'preload', sag: 'Bu sayfa için hemen yükle'),
                (sol: 'prefetch', sag: 'Sonraki sayfa için al'),
                (sol: 'preconnect', sag: 'Sunucuya önceden bağlan'),
                (sol: 'defer', sag: 'Ayrıştırma sonrası çalıştır'),
                (sol: 'async', sag: 'İner inmez çalıştır'),
              ],
              aciklama:
                  'Doğru ipucu doğru zamanda kullanılırsa sayfa daha hızlı açılır.',
            ),
            Tablo(
              soru: 'Nitelik ve davranış tablosunu tamamla.',
              baslik: ['Nitelik', 'Davranış'],
              satirlar: [
                ['defer', 'Sırayla çalışır'],
                ['async', 'İner inmez çalışır'],
                ['lazy', 'Görünür olunca yükler'],
                ['preload', 'Hemen yükler'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: [
                'Sırayla çalışır',
                'İner inmez çalışır',
                'Görünür olunca yükler',
                'Hemen yükler',
              ],
              aciklama:
                  'lazy görselleri, async betikleri ertelemeden farklı biçimde yönetir.',
            ),
            Isaretle(
              soru: 'Görseli ertelemeyi sağlayan niteliği işaretle.',
              cumle:
                  '<img src="raf.jpg" loading="lazy" width="320" height="200">',
              dogru: [2],
              aciklama:
                  'width ve height ise düzen kaymasını önlemek için yer ayırır.',
            ),
            Kod(
              soru: 'Sunucuya önceden bağlanma ipucunu seç.',
              kod: '<link rel="___" href="https://cdn.ornek.com">',
              secenekler: ['preconnect', 'connect', 'prejoin'],
              dogru: 0,
              dil: 'html',
              aciklama:
                  'preconnect DNS, TCP ve TLS adımlarını önceden tamamlar.',
            ),
          ],
        ),
        Ders(
          id: 'html-3-u2-d2',
          ad: 'Güvenlik: CSP, noopener ve sandbox',
          alistirmalar: [
            Secim(
              soru:
                  'target="_blank" bağlantıda açılan sayfanın window.opener erişimini hangisi keser?',
              secenekler: [
                'rel="open"',
                'rel="secure"',
                'rel="noopener"',
                'rel="blank"',
              ],
              dogru: 2,
              aciklama:
                  'noopener açılan sayfanın size window.opener ile erişmesini engeller.',
            ),
            Secim(
              soru:
                  'iframe içeriğinin yetkilerini kısıtlayan nitelik hangisidir?',
              secenekler: ['safe', 'sandbox', 'secure', 'jail'],
              dogru: 1,
              aciklama:
                  'sandbox betik, form, açılır pencere gibi yetkileri kapatır.',
            ),
            Bosluk(
              soru:
                  '<meta http-equiv="Content-Security-Policy" content="default-src ___">',
              secenekler: ["'self'", '*', 'self', 'open'],
              dogru: 0,
              aciklama:
                  "CSP içinde 'self' tırnaklı yazılır ve yalnızca kendi kaynağına izin verir.",
            ),
            Bosluk(
              soru:
                  '<a href="https://ornek.com" target="_blank" rel="noopener ___">',
              secenekler: ['nofollow', 'noindex', 'nocache', 'noreferrer'],
              dogru: 3,
              aciklama: 'noreferrer, hedef siteye Referer bilgisini göndermez.',
            ),
            Yaz(
              soru:
                  'Kullanıcı bağlantılarında arama motoruna güven aktarmayan rel değerini yaz.',
              cevaplar: ['nofollow'],
              aciklama:
                  'nofollow arama motorlarına bağlantıyı takip etmemeyi önerir.',
            ),
            Sirala(
              soru:
                  'Önce etiket adı, sonra sandbox, en sonda src gelecek şekilde sırala.',
              kelimeler: ['src="harita.html">', '<iframe', 'sandbox'],
              dogru: ['<iframe', 'sandbox', 'src="harita.html">'],
              aciklama: 'sandbox değer almadan da tüm kısıtlamaları uygular.',
            ),
            Eslestir(
              soru: 'Kavramı koruduğu şeyle eşleştir.',
              ciftler: [
                (sol: 'CSP', sag: 'İzinsiz betik çalışması'),
                (sol: 'noopener', sag: 'Açan sayfaya erişim'),
                (sol: 'noreferrer', sag: 'Referer bilgisi'),
                (sol: 'sandbox', sag: 'Gömülü içerik yetkisi'),
                (sol: 'integrity', sag: 'Dosya değişmemesi'),
              ],
              aciklama: 'integrity (SRI) dosyanın özet değerini doğrular.',
            ),
            Tablo(
              soru: 'Önlem ve koruma tablosunu tamamla.',
              baslik: ['Önlem', 'Koruma'],
              satirlar: [
                ['CSP', 'İzinsiz betik'],
                ['noopener', 'Açan sayfa erişimi'],
                ['sandbox', 'Gömülü içerik yetkisi'],
                ['integrity', 'Dosya değişikliği'],
              ],
              bos: [(satir: 2, sutun: 1), (satir: 3, sutun: 1)],
              secenekler: [
                'İzinsiz betik',
                'Açan sayfa erişimi',
                'Gömülü içerik yetkisi',
                'Dosya değişikliği',
              ],
              aciklama:
                  'CSP meta ile verilebilir ancak frame-ancestors gibi bazı kurallar yalnız HTTP başlığıyla çalışır.',
            ),
            Isaretle(
              soru: 'Güvenlik için eklenen rel değerini işaretle.',
              cumle: '<a href="/yonet" target="_blank" rel="noopener">',
              dogru: [3],
              aciklama:
                  'rel="noopener" yeni sekmeden dönüş saldırılarını önler.',
            ),
            Kod(
              soru: 'iframe yetkilerini kısıtlayan niteliği seç.',
              kod: '<iframe src="harita.html" ___ title="Harita"></iframe>',
              secenekler: ['sandbox', 'secure', 'safe'],
              dogru: 0,
              dil: 'html',
              aciklama:
                  'sandbox niteliği değer almadan en katı kısıtlamayı uygular.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'html-3-u3',
      ad: 'Yapılandırılmış veri ve ileri formlar',
      dersler: [
        Ders(
          id: 'html-3-u3-d1',
          ad: 'Mikro veri ve JSON-LD',
          alistirmalar: [
            Secim(
              soru: 'JSON-LD verisi hangi script türüyle yazılır?',
              secenekler: [
                'type="application/ld+json"',
                'type="text/json"',
                'type="text/ld"',
                'type="data/json"',
              ],
              dogru: 0,
              aciklama:
                  'application/ld+json içeriği çalıştırılmaz; arama motorlarına veri olarak sunulur.',
            ),
            Secim(
              soru: 'JSON-LD içinde @context için yaygın değer hangisidir?',
              secenekler: [
                'https://json.org',
                'https://schema.org',
                'https://html.spec',
                'https://w3.org/ld',
              ],
              dogru: 1,
              aciklama:
                  'schema.org ürün, makale gibi türlerin ortak sözlüğüdür.',
            ),
            Bosluk(
              soru: '<div itemscope itemtype="https://schema.org/___">',
              secenekler: ['Barcode', 'Goods', 'Product', 'Stuff'],
              dogru: 2,
              aciklama: 'Product, ürünler için schema.org türüdür.',
            ),
            Bosluk(
              soru: '<span ___="name">Süt 1L</span>',
              secenekler: ['itemid', 'itemprop', 'itemtype', 'prop'],
              dogru: 1,
              aciklama: 'itemprop mikro verideki özelliğin adını verir.',
            ),
            Yaz(
              soru:
                  'Mikro veride bir veri kapsamını başlatan mantıksal niteliğin adını yaz.',
              cevaplar: ['itemscope'],
              aciklama: 'itemscope, itemtype ile birlikte bir öğe tanımlar.',
            ),
            Sirala(
              soru: 'JSON-LD script etiketini sırala.',
              kelimeler: [
                '</script>',
                '{"@type":"Product"}',
                '<script',
                'type="application/ld+json">',
              ],
              dogru: [
                '<script',
                'type="application/ld+json">',
                '{"@type":"Product"}',
                '</script>',
              ],
              aciklama:
                  'Veri script etiketinin içine, geçerli JSON olarak yazılır.',
            ),
            Eslestir(
              soru: 'Kavramı görevi ile eşleştir.',
              ciftler: [
                (sol: 'itemscope', sag: 'Veri kapsamı başlatır'),
                (sol: 'itemtype', sag: 'Şema türü'),
                (sol: 'itemprop', sag: 'Özellik adı'),
                (sol: '@context', sag: 'JSON-LD sözlüğü'),
                (sol: '@type', sag: 'JSON-LD türü'),
              ],
              aciklama:
                  'Mikro veri HTML niteliklerinde, JSON-LD ayrı bir blokta yazılır.',
            ),
            Tablo(
              soru: 'Özellik ve örnek değer tablosunu tamamla.',
              baslik: ['Özellik', 'Örnek değer'],
              satirlar: [
                ['name', 'Süt 1L'],
                ['sku', 'SUT-001'],
                ['price', '42.50'],
                ['availability', 'InStock'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 3, sutun: 1)],
              secenekler: ['Süt 1L', 'SUT-001', '42.50', 'InStock'],
              aciklama: 'sku stok kodu, availability stok durumudur.',
            ),
            Isaretle(
              soru: 'Kapsamı başlatan niteliği işaretle.',
              cumle: '<div itemscope itemtype="https://schema.org/Product">',
              dogru: [1],
              aciklama:
                  'itemscope değersiz bir niteliktir ve kapsamı başlatır.',
            ),
            Kod(
              soru: 'Boşluğa schema.org türünü yaz.',
              kod:
                  '<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "___",\n  "name": "Süt 1L"\n}\n</script>',
              secenekler: ['Product', 'Article', 'Person'],
              dogru: 0,
              dil: 'html',
              aciklama: 'Ürün bilgisi için Product türü kullanılır.',
            ),
          ],
        ),
        Ders(
          id: 'html-3-u3-d2',
          ad: 'İleri form: doğrulama API, datalist, autocomplete',
          alistirmalar: [
            Secim(
              soru:
                  'Alanın geçerli olup olmadığını true veya false döndüren yöntem hangisidir?',
              secenekler: [
                'input.checkValidity()',
                'input.isValid()',
                'input.verify()',
                'input.validate()',
              ],
              dogru: 0,
              aciklama:
                  'checkValidity() geçerliyse true döner; geçersizse invalid olayı tetikler.',
            ),
            Secim(
              soru:
                  'Tarayıcıya hangi bilgiyi otomatik dolduracağını söyleyen nitelik hangisidir?',
              secenekler: ['autofill', 'autocomplete', 'autoinput', 'memory'],
              dogru: 1,
              aciklama:
                  'autocomplete="email" gibi değerler otomatik doldurmayı yönlendirir.',
            ),
            Bosluk(
              soru: '<input list="birimler"> <___ id="birimler"></___>',
              secenekler: ['select', 'menu', 'datalist', 'list'],
              dogru: 2,
              aciklama:
                  'datalist yazarken öneri sunar; kullanıcı listede olmayan değer de yazabilir.',
            ),
            Bosluk(
              soru: '<input type="email" autocomplete="___">',
              secenekler: ['mail', 'address', 'email', 'at'],
              dogru: 2,
              aciklama: 'email standart autocomplete belirtecidir.',
            ),
            Yaz(
              soru: 'Özel hata mesajı atayan yöntemin adını yaz (parantezsiz).',
              cevaplar: ['setCustomValidity', 'setcustomvalidity'],
              aciklama:
                  'setCustomValidity("") boş metinle çağrılırsa hata temizlenir.',
            ),
            Sirala(
              soru: 'datalist bağlı alanı sırala.',
              kelimeler: ['name="birim">', '<input', 'list="birimler"'],
              dogru: ['<input', 'list="birimler"', 'name="birim">'],
              aciklama: 'list değeri datalist öğesinin id değeridir.',
            ),
            Eslestir(
              soru: 'Yöntemi görevi ile eşleştir.',
              ciftler: [
                (sol: 'checkValidity()', sag: 'Geçerli mi diye sorar'),
                (sol: 'reportValidity()', sag: 'Hata balonunu gösterir'),
                (sol: 'setCustomValidity()', sag: 'Özel hata mesajı verir'),
                (sol: 'validity.valueMissing', sag: 'Zorunlu alan boş'),
                (sol: 'datalist', sag: 'Öneri listesi'),
              ],
              aciklama:
                  'reportValidity() hem denetler hem de kullanıcıya hatayı gösterir.',
            ),
            Tablo(
              soru: 'validity üyesi ve anlamı tablosunu tamamla.',
              baslik: ['Üye', 'Anlam'],
              satirlar: [
                ['valid', 'Tüm kurallar sağlanıyor'],
                ['valueMissing', 'Zorunlu alan boş'],
                ['patternMismatch', 'Kalıba uymuyor'],
                ['tooShort', 'Çok kısa'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: [
                'Tüm kurallar sağlanıyor',
                'Zorunlu alan boş',
                'Kalıba uymuyor',
                'Çok kısa',
              ],
              aciklama: 'validity nesnesi hatanın nedenini ayrı ayrı bildirir.',
            ),
            Isaretle(
              soru: 'Alanı öneri listesine bağlayan niteliği işaretle.',
              cumle: '<input list="birimler" name="birim">',
              dogru: [1],
              aciklama: 'list niteliği datalist öğesinin id değerine bağlanır.',
            ),
            Kod(
              soru: 'Özel hata mesajını atayan yöntemi seç.',
              kod:
                  '<script>\n  const kutu = document.querySelector("#barkod");\n  kutu.___("Barkod 13 haneli olmalı");\n</script>',
              secenekler: ['setCustomValidity', 'setError', 'alert'],
              dogru: 0,
              dil: 'html',
              aciklama: 'Mesaj boş değilse alan geçersiz sayılır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'html-3-u4',
      ad: 'Grafik ve PWA',
      dersler: [
        Ders(
          id: 'html-3-u4-d1',
          ad: 'canvas ve satır içi SVG',
          alistirmalar: [
            Secim(
              soru:
                  'JavaScript ile piksel piksel çizim yapılan yüzey hangisidir?',
              secenekler: ['<svg>', '<canvas>', '<draw>', '<paint>'],
              dogru: 1,
              aciklama:
                  'canvas bir piksel yüzeyidir; çizim getContext ile alınan bağlamla yapılır.',
            ),
            Secim(
              soru:
                  'Büyütülünce bozulmayan, XML tabanlı vektör çizim etiketi hangisidir?',
              secenekler: ['<canvas>', '<img>', '<svg>', '<bitmap>'],
              dogru: 2,
              aciklama: 'SVG vektördür ve şekilleri DOM öğesi olarak kalır.',
            ),
            Bosluk(
              soru:
                  '<svg width="100" height="100"><___ cx="50" cy="50" r="40" /></svg>',
              secenekler: ['round', 'oval', 'circle', 'dot'],
              dogru: 2,
              aciklama: 'circle merkez (cx, cy) ve yarıçap (r) ile tanımlanır.',
            ),
            Bosluk(
              soru: 'const ctx = canvas.getContext("___");',
              secenekler: ['2d', 'canvas', 'draw', 'flat'],
              dogru: 0,
              aciklama: '"2d" iki boyutlu çizim bağlamını verir.',
            ),
            Yaz(
              soru: 'SVG içinde düz çizgi çizen etiketin adını yaz.',
              cevaplar: ['line'],
              aciklama: 'line, x1 y1 x2 y2 niteliklerini alır.',
            ),
            Sirala(
              soru: 'SVG kapsayıcısını sırala.',
              kelimeler: ['</svg>', '<svg', 'viewBox="0 0 100 100">'],
              dogru: ['<svg', 'viewBox="0 0 100 100">', '</svg>'],
              aciklama:
                  'viewBox koordinat sistemini tanımlar ve ölçeklemeyi sağlar.',
            ),
            Eslestir(
              soru: 'Kavramı görevi ile eşleştir.',
              ciftler: [
                (sol: 'canvas', sag: 'Piksel çizim'),
                (sol: 'svg', sag: 'Vektör çizim'),
                (sol: 'getContext', sag: 'Çizim bağlamı alır'),
                (sol: 'viewBox', sag: 'SVG koordinat penceresi'),
                (sol: 'fillRect', sag: 'Dolu dikdörtgen çizer'),
              ],
              aciklama:
                  'Etkileşimli ve büyütülen grafikler için SVG, yoğun çizim için canvas uygundur.',
            ),
            Tablo(
              soru: 'canvas ve svg karşılaştırmasını tamamla.',
              baslik: ['Özellik', 'canvas', 'svg'],
              satirlar: [
                ['Çizim türü', 'Piksel', 'Vektör'],
                ['Şekil DOM öğesi mi', 'Hayır', 'Evet'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 1, sutun: 2)],
              secenekler: ['Piksel', 'Vektör', 'Hayır', 'Evet'],
              aciklama:
                  'SVG şekilleri DOM içinde olduğundan CSS ve olaylarla yönetilebilir.',
            ),
            Isaretle(
              soru: 'Yarıçapı belirten niteliği işaretle.',
              cumle: '<circle cx="50" cy="50" r="40" />',
              dogru: [3],
              aciklama: 'r (radius) çemberin yarıçapıdır.',
            ),
            Kod(
              soru: 'Çizim bağlamını alan yöntemi seç.',
              kod:
                  '<canvas id="grafik" width="200" height="100"></canvas>\n<script>\n  const ctx = document.getElementById("grafik").___("2d");\n</script>',
              secenekler: ['getContext', 'getCanvas', 'getDraw'],
              dogru: 0,
              dil: 'html',
              aciklama:
                  'getContext("2d") ile fillRect gibi çizim yöntemlerine erişilir.',
            ),
          ],
        ),
        Ders(
          id: 'html-3-u4-d2',
          ad: 'PWA temelleri',
          alistirmalar: [
            Secim(
              soru:
                  'Uygulamanın adı, simgeleri ve açılış adresi hangi dosyada tanımlanır?',
              secenekler: [
                'style.css',
                'sitemap.xml',
                'Web uygulama manifesti (manifest.json)',
                'robots.txt',
              ],
              dogru: 2,
              aciklama:
                  'Web app manifest, uygulamanın kurulum bilgilerini JSON olarak verir.',
            ),
            Secim(
              soru: 'Manifest dosyası sayfaya hangi bağlantıyla eklenir?',
              secenekler: [
                'rel="manifest"',
                'rel="app"',
                'rel="pwa"',
                'rel="install"',
              ],
              dogru: 0,
              aciklama:
                  '<link rel="manifest" href="manifest.json"> ile bağlanır.',
            ),
            Bosluk(
              soru: 'Manifestte: { "name": "Stok Takip", "___": "standalone" }',
              secenekler: ['mode', 'view', 'display', 'screen'],
              dogru: 2,
              aciklama:
                  'display: standalone uygulamayı tarayıcı çubuğu olmadan açar.',
            ),
            Bosluk(
              soru: 'Manifestte: { "name": "Stok Takip", "___": "/" }',
              secenekler: ['home', 'start_url', 'root', 'path'],
              dogru: 1,
              aciklama: 'start_url uygulama açılırken yüklenecek adrestir.',
            ),
            Yaz(
              soru:
                  'Service worker için gerekli güvenli bağlantı protokolünü yaz (localhost hariç).',
              cevaplar: ['https'],
              aciklama:
                  'Service worker yalnız güvenli bağlamda (HTTPS veya localhost) çalışır.',
            ),
            Sirala(
              soru: 'Manifest bağlantısını sırala.',
              kelimeler: ['href="manifest.json">', '<link', 'rel="manifest"'],
              dogru: ['<link', 'rel="manifest"', 'href="manifest.json">'],
              aciklama: 'link etiketi head içinde yer alır.',
            ),
            Eslestir(
              soru: 'Kavramı görevi ile eşleştir.',
              ciftler: [
                (sol: 'manifest', sag: 'Uygulama bilgileri'),
                (sol: 'service worker', sag: 'Arka plan ağ aracısı'),
                (sol: 'start_url', sag: 'Açılış adresi'),
                (sol: 'icons', sag: 'Uygulama simgeleri'),
                (sol: 'standalone', sag: 'Çubuksuz görünüm'),
              ],
              aciklama:
                  'Manifest ve service worker bir PWA\'nın iki temel parçasıdır.',
            ),
            Tablo(
              soru: 'Parça ve görev tablosunu tamamla.',
              baslik: ['Parça', 'Görev'],
              satirlar: [
                ['manifest', 'Ad ve simge bilgisi'],
                ['service worker', 'Çevrimdışı destek'],
                ['HTTPS', 'Güvenli bağlam'],
                ['icons', 'Ana ekran simgesi'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 3, sutun: 1)],
              secenekler: [
                'Ad ve simge bilgisi',
                'Çevrimdışı destek',
                'Güvenli bağlam',
                'Ana ekran simgesi',
              ],
              aciklama:
                  'Service worker istekleri yakalayıp önbellekten yanıt verebilir.',
            ),
            Isaretle(
              soru: 'Manifest bağlantısının rel değerini işaretle.',
              cumle: '<link rel="manifest" href="manifest.json">',
              dogru: [1],
              aciklama: 'rel="manifest" bağlantının türünü belirtir.',
            ),
            Kod(
              soru: 'Service worker kaydını yapan yöntemi seç.',
              kod:
                  '<script>\n  if ("serviceWorker" in navigator) {\n    navigator.serviceWorker.___("/sw.js");\n  }\n</script>',
              secenekler: ['register', 'install', 'load'],
              dogru: 0,
              dil: 'html',
              aciklama:
                  'register() betik dosyasını service worker olarak kaydeder.',
            ),
          ],
        ),
      ],
    ),
  ],
);
