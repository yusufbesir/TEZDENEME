/// Kod projeleri ve oyun alanı motoru (ÖZELLİK 70): kaydet/sil, şablon
/// hedefleri, tek HTML dosyasına birleştirme ve WebView gerektirmeyen basit
/// yapısal önizleme. Saf Dart; XP, seri ve kartlara dokunmaz.
///
/// Önizleme sınırı (dürüst not): uygulama tarayıcı motoru (WebView) içermez.
/// [KodProjeleri.onizleme] HTML'i yalnız yapı ve metin olarak çıkarır
/// (başlıklar, paragraflar, listeler, düğmeler, görsellerin alt metni,
/// girdiler); CSS ve JavaScript UYGULANMAZ. Gerçek görünüm için
/// [KodProjeleri.tekHtml] çıktısı panoya kopyalanır ya da .html dosyası
/// olarak kaydedilip tarayıcıda açılır.
library;

import '../icerik/projeler.dart';
import '../model/durum.dart';

enum OnizlemeTuru {
  sekme,
  baslik,
  paragraf,
  madde,
  dugme,
  gorsel,
  girdi,
  satir,
}

class OnizlemeOgesi {
  const OnizlemeOgesi(this.tur, this.metin, {this.duzey = 0});
  final OnizlemeTuru tur;
  final String metin;

  /// Başlık düzeyi (1-6); diğerlerinde 0.
  final int duzey;

  @override
  String toString() => '$tur($duzey): $metin';
}

abstract final class KodProjeleri {
  /// Önizlemede en çok öğe.
  static const int onizlemeEnCok = 300;

  /// Projeyi ekler ya da aynı kimliklisinin yerine koyar. Sınır aşılırsa
  /// durum değişmez ve Türkçe neden döner.
  static ({OgrenciDurumu durum, String? hata}) kaydet(
    OgrenciDurumu d,
    KodProjesi p,
    String bugun,
  ) {
    final hata = p.denetle();
    if (hata != null) return (durum: d, hata: hata);
    final yeni = p.copyWith(ad: p.ad.trim(), gun: bugun);
    final liste = [...d.kodProjeleri];
    final i = liste.indexWhere((e) => e.id == p.id);
    if (i < 0 && liste.length >= KodProjesi.enCokProje) {
      return (
        durum: d,
        hata:
            'En çok ${KodProjesi.enCokProje} proje kaydedilebilir; '
            'önce birini sil',
      );
    }
    if (i < 0) {
      liste.add(yeni);
    } else {
      liste[i] = yeni;
    }
    final toplam = liste.fold<int>(0, (t, e) => t + e.boyut);
    if (toplam > KodProjesi.toplamEnCokKarakter) {
      return (
        durum: d,
        hata:
            'Projelerin toplam boyutu sınırı aşıyor '
            '(${KodProjesi.toplamEnCokKarakter} karakter)',
      );
    }
    return (
      durum: d.copyWith(kodProjeleri: List.unmodifiable(liste)),
      hata: null,
    );
  }

  static OgrenciDurumu sil(OgrenciDurumu d, String id) => d.copyWith(
    kodProjeleri: List.unmodifiable(d.kodProjeleri.where((p) => p.id != id)),
  );

  static KodProjesi? bul(OgrenciDurumu d, String id) {
    for (final p in d.kodProjeleri) {
      if (p.id == id) return p;
    }
    return null;
  }

  /// Sıradaki boş oyun alanı kimliği ('oyun-1', 'oyun-2', ...).
  static String yeniOyunId(OgrenciDurumu d) {
    var enBuyuk = 0;
    for (final p in d.kodProjeleri) {
      if (!p.id.startsWith(KodProjesi.oyunOnek)) continue;
      final n = int.tryParse(p.id.substring(KodProjesi.oyunOnek.length));
      if (n != null && n > enBuyuk) enBuyuk = n;
    }
    return '${KodProjesi.oyunOnek}${enBuyuk + 1}';
  }

  /// Boş oyun alanı: index.html, style.css, script.js.
  static KodProjesi bosOyunAlani(String id, String ad) => KodProjesi(
    id: id,
    ad: ad,
    dosyalar: const [
      (
        ad: 'index.html',
        icerik:
            '<!DOCTYPE html>\n'
            '<html lang="tr">\n'
            '<head>\n'
            '  <meta charset="utf-8">\n'
            '  <title>Oyun alanı</title>\n'
            '  <link rel="stylesheet" href="style.css">\n'
            '</head>\n'
            '<body>\n'
            '  <h1>Merhaba</h1>\n'
            '  <script src="script.js"></script>\n'
            '</body>\n'
            '</html>\n',
      ),
      (ad: 'style.css', icerik: 'h1 {\n  color: teal;\n}\n'),
      (ad: 'script.js', icerik: 'console.log("Merhaba");\n'),
    ],
  );

  /// Şablon hedeflerinin durumu (sırayla).
  static List<bool> hedefler(ProjeSablonu s, KodProjesi p) => [
    for (final h in s.hedefler) h.saglandi(p),
  ];

  static bool tamam(ProjeSablonu s, KodProjesi? p) =>
      p != null && s.hedefler.isNotEmpty && hedefler(s, p).every((e) => e);

  /// Projenin tüm JS dosyaları (konsolda çalıştırmak için), dosya sırasıyla.
  static String jsBirlesik(KodProjesi p) =>
      [for (final f in p.uzantili('js')) f.icerik].join('\n');

  /// Projeyi tek, kendi başına açılabilen HTML'e birleştirir: `<link
  /// href="x.css">` ve `<script src="y.js">` etiketleri dosya içeriğiyle
  /// değiştirilir; bağlanmamış CSS head'in sonuna, JS body'nin sonuna
  /// eklenir. HTML dosyası yoksa basit bir iskelet kurulur.
  static String tekHtml(KodProjesi p) {
    final htmlDosya =
        p.icerik('index.html') ??
        (p.uzantili('html').isEmpty ? null : p.uzantili('html').first.icerik);
    var html =
        htmlDosya ??
        '<!DOCTYPE html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n'
            '<title>${_kac(p.ad)}</title>\n</head>\n<body>\n</body>\n</html>\n';
    final ekCss = StringBuffer();
    for (final f in p.uzantili('css')) {
      final css = f.icerik.replaceAll(
        RegExp('</style', caseSensitive: false),
        r'<\/style',
      );
      final desen = RegExp(
        '<link\\b[^>]*href\\s*=\\s*["\']${RegExp.escape(f.ad)}["\'][^>]*>',
        caseSensitive: false,
      );
      if (desen.hasMatch(html)) {
        html = html.replaceFirst(desen, '<style>\n$css\n</style>');
      } else {
        ekCss.write('<style>\n$css\n</style>\n');
      }
    }
    final ekJs = StringBuffer();
    for (final f in p.uzantili('js')) {
      final js = f.icerik.replaceAll(
        RegExp('</script', caseSensitive: false),
        r'<\/script',
      );
      final desen = RegExp(
        '<script\\b[^>]*src\\s*=\\s*["\']${RegExp.escape(f.ad)}["\'][^>]*>\\s*</script>',
        caseSensitive: false,
      );
      if (desen.hasMatch(html)) {
        html = html.replaceFirst(desen, '<script>\n$js\n</script>');
      } else {
        ekJs.write('<script>\n$js\n</script>\n');
      }
    }
    if (ekCss.isNotEmpty) {
      html = _oncesineEkle(html, '</head>', ekCss.toString());
    }
    if (ekJs.isNotEmpty) {
      html = _oncesineEkle(html, '</body>', ekJs.toString());
    }
    return html;
  }

  static String _oncesineEkle(String html, String etiket, String ek) {
    final i = html.toLowerCase().lastIndexOf(etiket);
    if (i < 0) return '$html\n$ek';
    return html.substring(0, i) + ek + html.substring(i);
  }

  static String _kac(String s) => s
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');

  /// Dosya adı için güvenli kök (Türkçe harfler sadeleşir).
  static String dosyaKoku(String ad) {
    const harf = {
      'ç': 'c',
      'ğ': 'g',
      'ı': 'i',
      'ö': 'o',
      'ş': 's',
      'ü': 'u',
      'Ç': 'c',
      'Ğ': 'g',
      'İ': 'i',
      'Ö': 'o',
      'Ş': 's',
      'Ü': 'u',
    };
    final b = StringBuffer();
    for (final c in ad.split('')) {
      b.write(harf[c] ?? c);
    }
    final kok = b
        .toString()
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
    if (kok.isEmpty) return 'proje';
    return kok.length > 40 ? kok.substring(0, 40) : kok;
  }

  // --- Basit önizleme -----------------------------------------------------

  static final _yorum = RegExp(r'<!--[\s\S]*?-->');
  static final _betikStil = RegExp(
    r'<(script|style|template)\b[^>]*>[\s\S]*?</\1\s*>',
    caseSensitive: false,
  );
  static final _baslik = RegExp(
    r'<title\b[^>]*>([\s\S]*?)</title\s*>',
    caseSensitive: false,
  );
  static final _head = RegExp(
    r'<head\b[^>]*>[\s\S]*?</head\s*>',
    caseSensitive: false,
  );
  static final _etiket = RegExp(r'<(/?)([a-zA-Z][a-zA-Z0-9-]*)([^>]*)>');
  static const _blok = {
    'p',
    'div',
    'section',
    'article',
    'header',
    'footer',
    'main',
    'nav',
    'aside',
    'form',
    'ul',
    'ol',
    'table',
    'blockquote',
    'pre',
    'figure',
    'figcaption',
    'label',
    'dl',
    'dt',
    'dd',
    'details',
    'summary',
    'body',
    'html',
    'fieldset',
    'legend',
    'caption',
    'thead',
    'tbody',
    'tfoot',
    'hr',
  };

  /// HTML'den yapısal önizleme öğeleri (metin olarak; hiçbir şey çalışmaz).
  static List<OnizlemeOgesi> onizleme(String html) {
    final sonuc = <OnizlemeOgesi>[];
    var h = html.replaceAll(_yorum, '');
    final t = _baslik.firstMatch(h);
    if (t != null) {
      final m = _metin(t.group(1)!);
      if (m.isNotEmpty) sonuc.add(OnizlemeOgesi(OnizlemeTuru.sekme, m));
    }
    h = h.replaceAll(_head, '').replaceAll(_betikStil, '');

    var tur = OnizlemeTuru.paragraf;
    var duzey = 0;
    final tampon = StringBuffer();
    void bosalt() {
      final m = _metin(tampon.toString());
      tampon.clear();
      if (m.isNotEmpty && sonuc.length < onizlemeEnCok) {
        sonuc.add(OnizlemeOgesi(tur, m, duzey: duzey));
      }
      tur = OnizlemeTuru.paragraf;
      duzey = 0;
    }

    void ekle(OnizlemeOgesi o) {
      if (sonuc.length < onizlemeEnCok) sonuc.add(o);
    }

    var konum = 0;
    for (final m in _etiket.allMatches(h)) {
      tampon.write(h.substring(konum, m.start));
      konum = m.end;
      final kapanis = m.group(1) == '/';
      final ad = m.group(2)!.toLowerCase();
      final nitelik = m.group(3) ?? '';
      final hb = RegExp(r'^h([1-6])$').firstMatch(ad);
      if (hb != null) {
        bosalt();
        if (!kapanis) {
          tur = OnizlemeTuru.baslik;
          duzey = int.parse(hb.group(1)!);
        }
      } else if (ad == 'li') {
        bosalt();
        if (!kapanis) tur = OnizlemeTuru.madde;
      } else if (ad == 'tr') {
        bosalt();
        if (!kapanis) tur = OnizlemeTuru.satir;
      } else if (ad == 'td' || ad == 'th') {
        if (!kapanis && tampon.toString().trim().isNotEmpty) {
          tampon.write(' | ');
        }
      } else if (ad == 'button') {
        bosalt();
        if (!kapanis) tur = OnizlemeTuru.dugme;
      } else if (ad == 'br') {
        tampon.write(_satirSonu);
      } else if (ad == 'img' && !kapanis) {
        bosalt();
        final alt = _nitelik(nitelik, 'alt');
        ekle(
          OnizlemeOgesi(
            OnizlemeTuru.gorsel,
            alt == null || alt.isEmpty ? '(alt metni yok)' : alt,
          ),
        );
      } else if ((ad == 'input' || ad == 'textarea' || ad == 'select') &&
          !kapanis) {
        bosalt();
        final ipucu =
            _nitelik(nitelik, 'placeholder') ??
            _nitelik(nitelik, 'value') ??
            _nitelik(nitelik, 'type') ??
            ad;
        ekle(OnizlemeOgesi(OnizlemeTuru.girdi, ipucu));
      } else if (_blok.contains(ad)) {
        bosalt();
      }
    }
    tampon.write(h.substring(konum));
    bosalt();
    return List.unmodifiable(sonuc);
  }

  static String? _nitelik(String nitelikler, String ad) {
    final m = RegExp(
      '\\b$ad\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))',
      caseSensitive: false,
    ).firstMatch(nitelikler);
    if (m == null) return null;
    return _metin(m.group(2) ?? m.group(3) ?? m.group(4) ?? '');
  }

  /// `<br>` işareti (kaynaktaki satır sonları boşluk sayılır).
  static const String _satirSonu = '\u0000';

  /// Etiket artıklarını atar, varlıkları çözer, boşlukları tarayıcı gibi
  /// sadeleştirir; yalnız `<br>` satır sonu olur.
  static String _metin(String s) {
    final temiz = s
        .replaceAll(RegExp(r'<[^>]*>'), '')
        .replaceAll('&nbsp;', ' ')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', "'")
        .replaceAll('&amp;', '&');
    return temiz
        .replaceAll(RegExp(r'\s+'), ' ')
        .split(_satirSonu)
        .map((l) => l.trim())
        .where((l) => l.isNotEmpty)
        .join('\n');
  }
}
