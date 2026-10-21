// ÖZELLİK 70: bölüm sonu proje ve çok dosyalı oyun alanı (model, eski kayıt
// uyumu, boyut sınırları, hedefler, tek HTML, basit önizleme, arayüz).
import 'dart:convert';

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/icerik/projeler.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/kod_calisma.dart';
import 'package:adim_adim/motor/kod_calistirici.dart';
import 'package:adim_adim/motor/kod_projesi.dart';
import 'package:adim_adim/servis/proje_aktarici.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

class _SahteAktarici extends ProjeAktarici {
  final kayitlar = <String, String>{};
  @override
  Future<String> kaydet(String kok, String html) async {
    kayitlar[kok] = html;
    return '/sahte/adim-adim-$kok.html';
  }
}

class _SahteCalistirici extends KodCalistirici {
  final kodlar = <String>[];
  @override
  String get ad => 'Sahte';
  @override
  Future<KodCalismaSonucu> calistir(String kod) async {
    kodlar.add(kod);
    return KodCalismaSonucu(kod: kod, cikti: 'sahte çıktı');
  }
}

KodProjesi _proje(String id, {List<ProjeDosyasi>? dosyalar}) => KodProjesi(
  id: id,
  ad: 'Deneme',
  dosyalar:
      dosyalar ??
      const [
        (ad: 'index.html', icerik: '<h1>Merhaba</h1>'),
        (ad: 'style.css', icerik: 'h1 { color: red; }'),
      ],
);

void main() {
  group('model ve eski kayıt uyumu', () {
    test('eski kayıtta alan yoksa boş; JSON gidiş-dönüş', () {
      final eski = OgrenciDurumu.fromJson({'xp': 5});
      expect(eski.kodProjeleri, isEmpty);
      final d = eski.copyWith(kodProjeleri: [_proje('oyun-1')]);
      final geri = OgrenciDurumu.fromJson(
        jsonDecode(jsonEncode(d.toJson())) as Map<String, Object?>,
      );
      expect(geri.kodProjeleri.single.id, 'oyun-1');
      expect(geri.kodProjeleri.single.dosyalar.length, 2);
      expect(geri.kodProjeleri.single.icerik('style.css'), contains('red'));
      expect(geri.xp, 5);
    });

    test('bozuk girdiler atlanır', () {
      final liste = KodProjesi.listeCoz([
        'bozuk',
        {'id': 'kotu id', 'ad': 'x', 'dosyalar': []},
        {
          'id': 'oyun-1',
          'ad': 'A',
          'dosyalar': [
            {'ad': '../kotu.html', 'icerik': 'x'},
            {'ad': 'index.html', 'icerik': 'ok'},
            {'ad': 'index.html', 'icerik': 'tekrar'},
            {'ad': 'a.css', 'icerik': 5},
          ],
        },
        {
          'id': 'oyun-1',
          'ad': 'Aynı kimlik',
          'dosyalar': [
            {'ad': 'a.js', 'icerik': ''},
          ],
        },
        {
          'id': 'oyun-2',
          'ad': 'Dosyasız',
          'dosyalar': [
            {'ad': 'x.exe', 'icerik': ''},
          ],
        },
      ]);
      expect(liste.length, 1);
      expect(liste.single.dosyalar.map((f) => f.ad), ['index.html']);
    });

    test('okumada sayı ve toplam boyut sınırı uygulanır', () {
      final buyuk = 'x' * KodProjesi.dosyaEnCokKarakter;
      final ham = [
        for (var i = 1; i <= 20; i++)
          {
            'id': 'oyun-$i',
            'ad': 'P$i',
            'dosyalar': [
              {'ad': 'a.js', 'icerik': buyuk},
            ],
          },
      ];
      final liste = KodProjesi.listeCoz(ham);
      expect(liste.length, lessThanOrEqualTo(KodProjesi.enCokProje));
      final toplam = liste.fold<int>(0, (t, p) => t + p.boyut);
      expect(toplam, lessThanOrEqualTo(KodProjesi.toplamEnCokKarakter));
      // Sınırı aşan tek dosya okunmaz.
      final asiri = KodProjesi.fromJson({
        'id': 'oyun-1',
        'ad': 'A',
        'dosyalar': [
          {'ad': 'a.js', 'icerik': '${buyuk}y'},
        ],
      });
      expect(asiri, isNull);
    });
  });

  group('motor', () {
    test('kaydet ekler, aynı kimliği değiştirir, günü yazar', () {
      var r = KodProjeleri.kaydet(
        const OgrenciDurumu(),
        _proje('oyun-1'),
        '2026-10-21',
      );
      expect(r.hata, isNull);
      expect(r.durum.kodProjeleri.single.gun, '2026-10-21');
      r = KodProjeleri.kaydet(
        r.durum,
        _proje('oyun-1').copyWith(ad: '  Yeni ad  '),
        '2026-10-22',
      );
      expect(r.durum.kodProjeleri.single.ad, 'Yeni ad');
      expect(KodProjeleri.yeniOyunId(r.durum), 'oyun-2');
      expect(KodProjeleri.sil(r.durum, 'oyun-1').kodProjeleri, isEmpty);
      // XP, seri ve kartlara dokunmaz.
      expect(r.durum.xp, 0);
      expect(r.durum.kartlar, isEmpty);
    });

    test('geçersiz dosya adı, fazla dosya, uzun dosya reddedilir', () {
      const d = OgrenciDurumu();
      for (final dosyalar in [
        const [(ad: 'Index.HTML', icerik: '')],
        const [(ad: 'a.py', icerik: '')],
        [for (var i = 0; i < 7; i++) (ad: 'a$i.js', icerik: '')],
        [(ad: 'a.js', icerik: 'x' * (KodProjesi.dosyaEnCokKarakter + 1))],
        const [(ad: 'a.js', icerik: ''), (ad: 'a.js', icerik: '')],
        const <ProjeDosyasi>[],
      ]) {
        final r = KodProjeleri.kaydet(
          d,
          _proje('oyun-1', dosyalar: dosyalar),
          '2026-10-21',
        );
        expect(r.hata, isNotNull, reason: dosyalar.map((f) => f.ad).join());
        expect(r.durum.kodProjeleri, isEmpty);
      }
    });

    test('proje sayısı ve toplam boyut sınırı', () {
      var d = const OgrenciDurumu();
      final buyuk = 'x' * KodProjesi.dosyaEnCokKarakter;
      String? sonHata;
      for (var i = 1; i <= KodProjesi.enCokProje + 1; i++) {
        final r = KodProjeleri.kaydet(
          d,
          _proje('oyun-$i', dosyalar: [(ad: 'a.js', icerik: buyuk)]),
          '2026-10-21',
        );
        d = r.durum;
        sonHata = r.hata;
      }
      expect(sonHata, isNotNull);
      expect(d.kodProjeleri.length, lessThanOrEqualTo(KodProjesi.enCokProje));
      final toplam = d.kodProjeleri.fold<int>(0, (t, p) => t + p.boyut);
      expect(toplam, lessThanOrEqualTo(KodProjesi.toplamEnCokKarakter));
    });

    test('şablon hedefleri başta eksik, doğru kodla tamam', () {
      for (final s in projeSablonlari) {
        final p = s.yeniProje();
        expect(p.denetle(), isNull, reason: s.id);
        expect(KodProjeleri.hedefler(s, p).every((e) => !e), isTrue);
        expect(KodProjeleri.tamam(s, p), isFalse);
        expect(kursBul(s.kursId), isNotNull);
        expect(
          kursBul(s.kursId)!.uniteler.any((u) => u.id == s.uniteId),
          isTrue,
          reason: s.id,
        );
      }
      final sayac = projeSablonuBul('sayac')!;
      final p = sayac.yeniProje().copyWith(
        dosyalar: [
          sayac.dosyalar.first,
          (
            ad: 'script.js',
            icerik:
                'let sayac = 0;\n'
                'const sayi = document.getElementById("sayi");\n'
                'document.querySelector("#arttir").addEventListener("click", () => {\n'
                '  sayac++;\n'
                '  sayi.textContent = sayac;\n'
                '});\n',
          ),
        ],
      );
      expect(KodProjeleri.tamam(sayac, p), isTrue);
    });

    test('ders sonu projesi yalnız ünitenin son dersinde', () {
      expect(dersSonuProjesi(tumKurslar, 'js-1-u3-d2')?.id, 'sayac');
      expect(dersSonuProjesi(tumKurslar, 'js-1-u3-d1'), isNull);
      expect(dersSonuProjesi(tumKurslar, 'html-1-u3-d2')?.id, 'kartvizit');
      expect(dersSonuProjesi(tumKurslar, 'css-1-u3-d2')?.id, 'urun-kartlari');
    });

    test('tek HTML: bağlı dosyalar yerine konur, bağsızlar eklenir', () {
      final p = _proje(
        'oyun-1',
        dosyalar: const [
          (
            ad: 'index.html',
            icerik:
                '<html><head><link rel="stylesheet" href="style.css"></head>'
                '<body><script src="app.js"></script></body></html>',
          ),
          (ad: 'style.css', icerik: 'p { color: red; }'),
          (ad: 'ek.css', icerik: 'h1 { margin: 0; }'),
          (ad: 'app.js', icerik: 'const s = "</script>";'),
          (ad: 'ek.js', icerik: 'console.log(1);'),
        ],
      );
      final h = KodProjeleri.tekHtml(p);
      expect(h, isNot(contains('href="style.css"')));
      expect(h, isNot(contains('src="app.js"')));
      expect(h, contains('<style>\np { color: red; }\n</style>'));
      expect(h, contains('h1 { margin: 0; }\n</style>\n</head>'));
      expect(h, contains(r'const s = "<\/script>";'));
      expect(h.indexOf('console.log(1)'), lessThan(h.indexOf('</body>')));
      // HTML dosyası olmayan proje de açılabilir bir sayfa üretir.
      final yalniz = KodProjeleri.tekHtml(
        _proje('oyun-2', dosyalar: const [(ad: 'a.js', icerik: 'x();')]),
      );
      expect(yalniz, contains('<script>\nx();\n</script>'));
      expect(yalniz, contains('<title>Deneme</title>'));
    });

    test('basit önizleme: yapı ve metin, betik/stil gizli', () {
      final o = KodProjeleri.onizleme(
        '<html><head><title>Sekmem</title><style>p{}</style></head><body>'
        '<!-- yorum --><h1>Başlık &amp; alt</h1>\n<p>Bir\n   paragraf<br>ikinci</p>'
        '<ul><li>Elma</li><li>Armut</li></ul>'
        '<img src="k.jpg" alt="Kedi"><input placeholder="Adın">'
        '<button>Gönder</button><table><tr><th>Ad</th><td>Ada</td></tr></table>'
        '<script>alert("x")</script></body></html>',
      );
      String m(OnizlemeTuru t) =>
          o.where((e) => e.tur == t).map((e) => e.metin).join(';');
      expect(m(OnizlemeTuru.sekme), 'Sekmem');
      expect(o.firstWhere((e) => e.tur == OnizlemeTuru.baslik).duzey, 1);
      expect(m(OnizlemeTuru.baslik), 'Başlık & alt');
      expect(m(OnizlemeTuru.paragraf), 'Bir paragraf\nikinci');
      expect(m(OnizlemeTuru.madde), 'Elma;Armut');
      expect(m(OnizlemeTuru.gorsel), 'Kedi');
      expect(m(OnizlemeTuru.girdi), 'Adın');
      expect(m(OnizlemeTuru.dugme), 'Gönder');
      expect(m(OnizlemeTuru.satir), 'Ad | Ada');
      expect(o.any((e) => e.metin.contains('alert')), isFalse);
    });

    test('dosya kökü güvenli', () {
      expect(KodProjeleri.dosyaKoku('Kişisel Kartvizit!'), 'kisisel-kartvizit');
      expect(KodProjeleri.dosyaKoku('../..'), 'proje');
    });
  });

  group('arayüz', () {
    Future<({BellekDepo depo, _SahteAktarici aktarici, _SahteCalistirici js})>
    ac(WidgetTester tester, {OgrenciDurumu? durum}) async {
      final depo = BellekDepo(durum ?? const OgrenciDurumu(alan: 'kod'));
      final aktarici = _SahteAktarici();
      final js = _SahteCalistirici();
      final kap = await uygulamayiAc(
        tester,
        depo,
        kurslar: [kursBul('js-1')!],
        ekOverrides: [
          projeAktariciProvider.overrideWithValue(aktarici),
          kodCalistiriciProvider.overrideWithValue(js),
        ],
      );
      kap.read(yonlendiriciProvider).push('/projeler');
      await tester.pumpAndSettle();
      return (depo: depo, aktarici: aktarici, js: js);
    }

    testWidgets('şablon projesi: düzenle, hedef, önizle, kaydet, aktar', (
      tester,
    ) async {
      final r = await ac(tester);
      expect(find.text('Tıklama sayacı'), findsOneWidget);
      await dokun(tester, find.byKey(const ValueKey('proje-sablon-sayac')));
      expect(find.byKey(const ValueKey('proje-editor')), findsOneWidget);
      // index.html seçili; önizleme başlığı gösterir.
      await dokun(tester, find.byKey(const ValueKey('proje-onizle')));
      expect(find.byKey(const ValueKey('proje-onizleme')), findsOneWidget);
      expect(find.text('Sekme başlığı: Sayaç'), findsOneWidget);
      // script.js'e geç ve hedefleri karşılayan kodu yaz.
      await dokun(tester, find.byKey(const ValueKey('proje-dosya-script.js')));
      await tester.enterText(
        find.byKey(const ValueKey('proje-editor')),
        'let sayac = 0;\n'
        'const s = document.getElementById("sayi");\n'
        'document.querySelector("#arttir").addEventListener("click", () => {\n'
        '  sayac++;\n  s.textContent = sayac;\n});\n',
      );
      await tester.pumpAndSettle();
      expect(find.byIcon(Icons.check_circle), findsNWidgets(4));
      await dokun(tester, find.byKey(const ValueKey('proje-kaydet')));
      final kayit = (await r.depo.yukle()).kodProjeleri.single;
      expect(kayit.id, 'sablon-sayac');
      expect(kayit.icerik('script.js'), contains('textContent'));
      // Konsol: JS dosyaları sahte motora gider.
      await dokun(tester, find.byKey(const ValueKey('proje-konsol')));
      expect(r.js.kodlar.single, contains('addEventListener'));
      expect(find.textContaining('sahte çıktı'), findsOneWidget);
      // Dosyaya kaydet: tek HTML, script satır içi.
      await dokun(tester, find.byKey(const ValueKey('proje-dosyaya')));
      expect(r.aktarici.kayitlar['tiklama-sayaci'], contains('sayac++'));
      expect(
        r.aktarici.kayitlar['tiklama-sayaci'],
        isNot(contains('src="script.js"')),
      );
    });

    testWidgets('HTML panoya kopyalanır', (tester) async {
      String? pano;
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (c) async {
          if (c.method == 'Clipboard.setData') {
            pano = (c.arguments as Map)['text'] as String?;
          }
          return null;
        },
      );
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        ),
      );
      await ac(tester);
      await dokun(tester, find.byKey(const ValueKey('proje-sablon-kartvizit')));
      await dokun(tester, find.byKey(const ValueKey('proje-kopyala')));
      expect(pano, contains('<style>'));
      expect(pano, contains('Kartvizitim'));
    });

    testWidgets('oyun alanı: yeni, dosya ekle, kaydet, sil', (tester) async {
      final r = await ac(tester);
      await dokun(tester, find.byKey(const ValueKey('yeni-oyun-alani')));
      expect((await r.depo.yukle()).kodProjeleri.single.id, 'oyun-1');
      await dokun(tester, find.byKey(const ValueKey('proje-dosya-ekle')));
      await tester.enterText(find.byKey(const ValueKey('ad-alani')), 'oyun.js');
      await dokun(tester, find.text('Tamam'));
      expect(find.byKey(const ValueKey('proje-dosya-oyun.js')), findsOneWidget);
      await tester.enterText(
        find.byKey(const ValueKey('proje-editor')),
        'console.log(2);',
      );
      await tester.pump();
      await dokun(tester, find.byKey(const ValueKey('proje-kaydet')));
      final p = (await r.depo.yukle()).kodProjeleri.single;
      expect(p.icerik('oyun.js'), 'console.log(2);');
      // Geri dön ve sil.
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('proje-oyun-1')), findsOneWidget);
      await dokun(tester, find.byTooltip('Sil'));
      await dokun(tester, find.widgetWithText(FilledButton, 'Sil'));
      expect((await r.depo.yukle()).kodProjeleri, isEmpty);
    });

    testWidgets('kaydedilmemiş değişiklikte çıkışta sorulur', (tester) async {
      final r = await ac(tester);
      await dokun(tester, find.byKey(const ValueKey('proje-sablon-kartvizit')));
      await tester.enterText(
        find.byKey(const ValueKey('proje-editor')),
        '<h1>Ben</h1>',
      );
      await tester.pump();
      await tester.binding.handlePopRoute();
      await tester.pumpAndSettle();
      expect(find.text('Kaydedilmemiş değişiklik var'), findsOneWidget);
      await dokun(tester, find.widgetWithText(FilledButton, 'Kaydet'));
      expect(
        (await r.depo.yukle()).kodProjeleri.single.icerik('index.html'),
        '<h1>Ben</h1>',
      );
      expect(
        find.byKey(const ValueKey('proje-sablon-kartvizit')),
        findsOneWidget,
      );
    });

    testWidgets('ana sayfadaki örnek programlar satırında projeler düğmesi', (
      tester,
    ) async {
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'kod')),
        kurslar: [kursBul('js-1')!],
      );
      final dugme = find.byKey(const ValueKey('projeler-dugmesi'));
      expect(dugme, findsOneWidget);
      await dokun(tester, dugme);
      expect(find.text('Projeler ve oyun alanı'), findsOneWidget);
    });
  });
}
