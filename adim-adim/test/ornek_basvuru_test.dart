// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Örnek programlarda arama ve dil başvuru sayfaları (ÖZELLİK 75): arama
/// başlık/kod/not üzerinde ve Türkçe harf duyarsız; başvuru maddeleri yalnız
/// örneklerde geçen terimlerdir ve not ile örnek bağlantısı taşır.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/icerik/ornek_programlar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/ornek_program.dart';
import 'package:adim_adim/motor/ornek_basvuru.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

void main() {
  test('arama: başlıkta, kodda ve notta; dil süzgeci; boş sorgu hepsi', () {
    expect(OrnekBasvuru.ara(tumOrnekler, ''), hasLength(tumOrnekler.length));
    final html = OrnekBasvuru.ara(tumOrnekler, '', dil: OrnekDili.html);
    expect(html.every((o) => o.dil == OrnekDili.html), isTrue);
    final baslik = OrnekBasvuru.ara(tumOrnekler, 'MERHABA');
    expect(baslik.map((o) => o.id), contains('html-ornek-1'));
    // Kodda geçen etiket (başlıkta yok): <ul>
    final kod = OrnekBasvuru.ara(tumOrnekler, '<ul>');
    expect(kod.map((o) => o.id), contains('html-ornek-2'));
    // Notta geçen sözcük.
    final not = OrnekBasvuru.ara(tumOrnekler, 'sıralı (numaralı) liste');
    expect(not.map((o) => o.id), contains('html-ornek-2'));
    expect(OrnekBasvuru.ara(tumOrnekler, 'zzzyokboyle'), isEmpty);
    expect(OrnekBasvuru.ara(tumOrnekler, '<ul>', dil: OrnekDili.css), isEmpty);
  });

  test('arama Türkçe harf duyarsız (İ/ı, ş, ğ)', () {
    final o = [
      const OrnekProgram(
        id: 'x',
        dil: OrnekDili.js,
        zorluk: OrnekZorlugu.kolay,
        baslik: 'Işık Şöleni',
        aciklama: 'Döngü örneği',
        gruplar: [(kod: 'let a = 1;', not: 'Değişken tanımı')],
      ),
    ];
    expect(OrnekBasvuru.ara(o, 'isik soleni'), hasLength(1));
    expect(OrnekBasvuru.ara(o, 'DONGU'), hasLength(1));
    expect(OrnekBasvuru.ara(o, 'degisken'), hasLength(1));
  });

  test('HTML başvurusu: etiketler örnek kodundan, alfabetik, notla', () {
    final b = OrnekBasvuru.basvuru(OrnekDili.html, tumOrnekler);
    expect(b, isNotEmpty);
    final terimler = b.map((m) => m.terim).toList();
    expect(terimler, [...terimler]..sort());
    expect(terimler, containsAll(['<html>', '<ul>', '<h1>']));
    final ul = b.firstWhere((m) => m.terim == '<ul>');
    expect(ul.not, contains('sırasız'));
    expect(ul.ornekler, contains('html-ornek-2'));
    // Her madde en az bir örnekte gerçekten geçer.
    for (final m in b) {
      expect(m.ornekler, isNotEmpty);
      for (final id in m.ornekler) {
        final o = ornekBul(id)!;
        expect(o.dil, OrnekDili.html);
        expect(
          o.kod.toLowerCase(),
          contains(m.terim.substring(0, m.terim.length - 1)),
          reason: '${m.terim} ${o.id}',
        );
      }
    }
  });

  test('CSS ve JS başvurusu: terimler örneklerde geçer, uydurma terim yok', () {
    final css = OrnekBasvuru.basvuru(OrnekDili.css, tumOrnekler);
    expect(css, isNotEmpty);
    for (final m in css) {
      final kodlar = [for (final id in m.ornekler) ornekBul(id)!.kod];
      expect(kodlar.any((k) => k.contains(m.terim)), isTrue, reason: m.terim);
    }
    final js = OrnekBasvuru.basvuru(OrnekDili.js, tumOrnekler);
    expect(js, isNotEmpty);
    for (final m in js) {
      final kodlar = [for (final id in m.ornekler) ornekBul(id)!.kod];
      final aranan = m.terim.startsWith('.')
          ? m.terim.substring(0, m.terim.length - 2) // '.push()' -> '.push'
          : m.terim;
      expect(kodlar.any((k) => k.contains(aranan)), isTrue, reason: m.terim);
    }
  });

  test('başvuru terimi çıkarma: sabit örnekle', () {
    const o = [
      OrnekProgram(
        id: 't-html',
        dil: OrnekDili.html,
        zorluk: OrnekZorlugu.kolay,
        baslik: 'a',
        aciklama: 'b',
        gruplar: [
          (
            kod: '<DIV class="x"><p>Merhaba</p></DIV>',
            not: 'Kutu ve paragraf.',
          ),
        ],
      ),
      OrnekProgram(
        id: 't-css',
        dil: OrnekDili.css,
        zorluk: OrnekZorlugu.kolay,
        baslik: 'a',
        aciklama: 'b',
        gruplar: [
          (
            kod:
                'a:hover { color: red; margin-top: 4px; }\n@media (min-width: 1px) { p { font-size: 2px; } }',
            not: 'Renk ve boşluk.',
          ),
        ],
      ),
      OrnekProgram(
        id: 't-js',
        dil: OrnekDili.js,
        zorluk: OrnekZorlugu.kolay,
        baslik: 'a',
        aciklama: 'b',
        gruplar: [
          (
            kod: 'const a = [];\na.push(1);\nconsole.log(a);\n// constant yok',
            not: 'Dizi.',
          ),
        ],
      ),
    ];
    expect(OrnekBasvuru.basvuru(OrnekDili.html, o).map((m) => m.terim), [
      '<div>',
      '<p>',
    ]);
    final css = OrnekBasvuru.basvuru(OrnekDili.css, o).map((m) => m.terim);
    expect(css, containsAll(['color', 'margin-top', 'font-size', '@media']));
    expect(css, isNot(contains('hover')));
    final js = OrnekBasvuru.basvuru(OrnekDili.js, o).map((m) => m.terim);
    expect(js, containsAll(['const', '.push()', '.log()']));
    expect(js, isNot(contains('let')));
    // Başka dilin örneği karışmaz.
    expect(OrnekBasvuru.basvuru(OrnekDili.html, [o[1]]), isEmpty);
  });

  test('başvuru araması terim ve notta', () {
    final b = OrnekBasvuru.basvuru(OrnekDili.html, tumOrnekler);
    expect(
      OrnekBasvuru.basvuruAra(b, '<ul>').map((m) => m.terim),
      contains('<ul>'),
    );
    expect(OrnekBasvuru.basvuruAra(b, 'SIRASIZ'), isNotEmpty);
    expect(OrnekBasvuru.basvuruAra(b, 'zzzyok'), isEmpty);
    expect(OrnekBasvuru.basvuruAra(b, ''), hasLength(b.length));
  });

  group('arayüz', () {
    testWidgets('listede arama süzer; sonuç yoksa mesaj; başvuruya geçilir', (
      tester,
    ) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'kod')),
        kurslar: [sahteKodKurs],
      );
      kap.read(yonlendiriciProvider).go('/ornekler');
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('ornek-satir-html-ornek-1')),
        findsOneWidget,
      );
      await tester.enterText(find.byKey(const ValueKey('ornek-ara')), 'zzzyok');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('ornek-sonuc-yok')), findsOneWidget);
      await tester.enterText(find.byKey(const ValueKey('ornek-ara')), '<ul>');
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('ornek-satir-html-ornek-2')),
        findsOneWidget,
      );
      expect(
        find.byKey(const ValueKey('ornek-satir-html-ornek-1')),
        findsNothing,
      );
      await dokun(tester, find.byKey(const ValueKey('ornek-basvuru')));
      // Tembel liste: uzun listede <ul> kartı henüz kurulmamış olabilir.
      expect(find.text('HTML başvurusu'), findsOneWidget);
    });

    testWidgets('başvuru ekranı: dil çipi, arama, örnek bağlantısı', (
      tester,
    ) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'kod')),
        kurslar: [sahteKodKurs],
      );
      kap.read(yonlendiriciProvider).go('/ornek-basvuru?dil=css');
      await tester.pumpAndSettle();
      expect(find.text('CSS başvurusu'), findsOneWidget);
      await dokun(tester, find.byKey(const ValueKey('basvuru-cip-html')));
      expect(find.text('HTML başvurusu'), findsOneWidget);
      await tester.enterText(find.byKey(const ValueKey('basvuru-ara')), '<ul>');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('basvuru-<ul>')), findsOneWidget);
      await dokun(
        tester,
        find.byKey(const ValueKey('basvuru-ornek-<ul>-html-ornek-2')),
      );
      expect(find.text(ornekBul('html-ornek-2')!.baslik), findsWidgets);
      expect(find.byKey(const ValueKey('ornek-kopyala')), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('480x600 ölçek 1,5 taşmaz', (tester) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'kod')),
        kurslar: [sahteKodKurs],
        boyut: const Size(480, 600),
        metinOlcegi: 1.5,
      );
      kap.read(yonlendiriciProvider).go('/ornekler');
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      kap.read(yonlendiriciProvider).go('/ornek-basvuru?dil=js');
      await tester.pumpAndSettle();
      expect(find.text('JavaScript başvurusu'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
