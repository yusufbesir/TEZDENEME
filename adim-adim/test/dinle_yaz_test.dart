// Sahibi Yusuf (yusufbesir). Yazan: [Claude#dalga3]. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Dinle ve yaz testleri: saf mantık (havuz, cevap kontrolü, ipucu) ve ekran
/// (okuma, yazma, ses yoksa metin ipucu, sonuç; durum değişmez).
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/dinle_yaz.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

const kkDers = 'kk-1.u1.d1';

Secim _s(String kelime, String anlam) => Secim(
  soru: '"$kelime" ne demektir?',
  secenekler: [anlam, 'başka'],
  dogru: 0,
);

/// 6 İngilizce kelime (her biri ayrı kart).
final Kurs kelimeKursu = Kurs(
  id: 'kk-1',
  ad: 'Kelime Kursu',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'kk-1.u1',
      ad: 'U',
      dersler: [
        Ders(
          id: kkDers,
          ad: 'D',
          alistirmalar: [
            _s('cat', 'kedi'),
            _s('dog', 'köpek'),
            _s('house', 'ev'),
            _s('apple', 'elma'),
            _s('book', 'kitap'),
            _s('water', 'su'),
          ],
        ),
      ],
    ),
  ],
);

/// Elenmesi gereken öğeler: çok kelimeli ifade ve rakamlı metin.
final Kurs _karisikKurs = Kurs(
  id: 'kk-2',
  ad: 'Karışık',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'kk-2.u1',
      ad: 'U',
      dersler: [
        Ders(
          id: 'kk-2.u1.d1',
          ad: 'D',
          alistirmalar: [
            _s('Mädchen', 'kız'),
            _s('how are you today', 'bugün nasılsın'),
            _s('room 5', 'oda'),
          ],
        ),
      ],
    ),
  ],
);

/// Korece kursun sesli dili Latin değildir: havuza girmez.
final Kurs _koreceKurs = Kurs(
  id: 'korece-1',
  ad: 'Korece',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'korece-1.u1',
      ad: 'U',
      dersler: [
        Ders(
          id: 'korece-1.u1.d1',
          ad: 'D',
          alistirmalar: [_s('annyeong', 'merhaba')],
        ),
      ],
    ),
  ],
);

class _SessizSes extends SahteSes {
  @override
  Future<bool> oku(String metin, {String dil = 'en-US'}) async {
    okunanlar.add(metin);
    return false;
  }
}

OgrenciDurumu _durum() =>
    const OgrenciDurumu(alan: 'dil', tamamlanan: {kkDers: 1});

Future<ProviderContainer> _ac(
  WidgetTester tester, {
  SahteSes? ses,
  OgrenciDurumu? durum,
  Size boyut = const Size(500, 1000),
  double olcek = 1.0,
}) async {
  final kap = await uygulamayiAc(
    tester,
    BellekDepo(durum ?? _durum()),
    kurslar: [kelimeKursu],
    ses: ses,
    boyut: boyut,
    metinOlcegi: olcek,
  );
  kap.read(yonlendiriciProvider).push('/pratik/dinle-yaz?tohum=1');
  await tester.pump();
  await tester.pump(const Duration(seconds: 1));
  return kap;
}

/// Son okunan kelime (ekrandaki kelime).
String _okunan(SahteSes ses) => ses.okunanlar.last;

void main() {
  group('mantık', () {
    test('havuz: yalnız yazılabilir tek/çift kelimelik öğeler, tekrarsız', () {
      final h = DinleYaz.havuz(_durum(), [kelimeKursu]);
      expect(h.map((c) => c.metin).toSet(), {
        'cat',
        'dog',
        'house',
        'apple',
        'book',
        'water',
      });
      expect(h.every((c) => c.sesDili == 'en-US'), isTrue);
      expect(h.firstWhere((c) => c.metin == 'cat').anlam, 'kedi');
    });

    test(
      'havuz: çok kelimeli, rakamlı ve Latin olmayan dil dışarıda kalır',
      () {
        const d = OgrenciDurumu(
          alan: 'dil',
          tamamlanan: {'kk-2.u1.d1': 1, 'korece-1.u1.d1': 1},
        );
        final h = DinleYaz.havuz(d, [_karisikKurs, _koreceKurs]);
        expect(h.map((c) => c.metin), ['Mädchen']);
      },
    );

    test('havuz: tamamlanmamış ders ve kartsız öğe alınmaz', () {
      expect(
        DinleYaz.havuz(const OgrenciDurumu(alan: 'dil'), [kelimeKursu]),
        isEmpty,
      );
    });

    test('havuz: kod kursları dışarıda kalır', () {
      final kod = Kurs(
        id: 'kod-1',
        ad: 'K',
        aciklama: '',
        alan: KursAlani.kod,
        uniteler: kelimeKursu.uniteler,
      );
      expect(
        DinleYaz.havuz(
          const OgrenciDurumu(alan: 'kod', tamamlanan: {kkDers: 1}),
          [kod],
        ),
        isEmpty,
      );
    });

    test('deste: en çok oturumAdet ve tohumla deterministik', () {
      final a = DinleYaz.deste(_durum(), [kelimeKursu], tohum: 3);
      final b = DinleYaz.deste(_durum(), [kelimeKursu], tohum: 3);
      expect(a.length, 6);
      expect(a.map((c) => c.metin), b.map((c) => c.metin));
      expect(DinleYaz.oturumAdet, 8);
    });

    test('kontrol: büyük/küçük harf, boşluk, noktalama yok sayılır', () {
      expect(DinleYaz.kontrol('Cat', 'cat'), DinleYazSonucu.dogru);
      expect(DinleYaz.kontrol('  cat. ', 'cat'), DinleYazSonucu.dogru);
      expect(DinleYaz.kontrol('to  eat', 'to eat'), DinleYazSonucu.dogru);
      expect(DinleYaz.kontrol('dog', 'cat'), DinleYazSonucu.yanlis);
      expect(DinleYaz.kontrol('', 'cat'), DinleYazSonucu.yanlis);
    });

    test('kontrol: aksan/umlaut eksikliği ayrı bildirilir', () {
      expect(DinleYaz.kontrol('madchen', 'Mädchen'), DinleYazSonucu.aksanFarki);
      expect(
        DinleYaz.kontrol('maedchen', 'Mädchen'),
        DinleYazSonucu.aksanFarki,
      );
      expect(DinleYaz.kontrol('strasse', 'Straße'), DinleYazSonucu.aksanFarki);
      expect(DinleYaz.kontrol('Mädchen', 'Mädchen'), DinleYazSonucu.dogru);
      expect(DinleYaz.kontrol('mudchen', 'Mädchen'), DinleYazSonucu.yanlis);
    });

    test('ipucu: kademeli (anlam, sonra harf sayısı ve ilk harf)', () {
      const k = (
        kartId: 'x#0',
        metin: 'apple',
        anlam: 'elma',
        sesDili: 'en-US',
      );
      expect(DinleYaz.ipucu(k, 0), '');
      expect(DinleYaz.ipucu(k, 1), 'Anlamı: elma');
      expect(DinleYaz.ipucu(k, 2), 'Anlamı: elma · 5 harf · ilk harf: a');
    });
  });

  group('ekran', () {
    testWidgets('açılışta kelime okunur; doğru yazınca geri bildirim', (
      tester,
    ) async {
      final ses = SahteSes();
      final kap = await _ac(tester, ses: ses);
      expect(ses.okunanlar, hasLength(1));
      expect(find.text('1 / 6'), findsOneWidget);
      final once = kap.read(durumProvider).value!.toJson().toString();
      await tester.enterText(
        find.byKey(const ValueKey('dy-yaz')),
        _okunan(ses),
      );
      await tester.tap(find.byKey(const ValueKey('dy-kontrol')));
      await tester.pumpAndSettle();
      expect(find.text('Doğru!'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('dy-sonraki')));
      await tester.pumpAndSettle();
      expect(find.text('2 / 6'), findsOneWidget);
      expect(ses.okunanlar, hasLength(2));
      expect(
        kap.read(durumProvider).value!.toJson().toString(),
        once,
        reason: 'dinle ve yaz durumu değiştirmez',
      );
    });

    testWidgets('yanlış yazınca doğrusu gösterilir; Dinle yeniden okur', (
      tester,
    ) async {
      final ses = SahteSes();
      await _ac(tester, ses: ses);
      final dogru = _okunan(ses);
      await tester.tap(find.byKey(const ValueKey('dy-dinle')));
      await tester.pumpAndSettle();
      expect(ses.okunanlar, [dogru, dogru]);
      await tester.enterText(find.byKey(const ValueKey('dy-yaz')), 'zzz');
      await tester.tap(find.byKey(const ValueKey('dy-kontrol')));
      await tester.pumpAndSettle();
      expect(find.text('Doğrusu: $dogru'), findsOneWidget);
    });

    testWidgets('İpucu düğmesi kademeli ipucu verir', (tester) async {
      final ses = SahteSes();
      await _ac(tester, ses: ses);
      expect(find.byKey(const ValueKey('dy-ipucu-metin')), findsNothing);
      await tester.tap(find.byKey(const ValueKey('dy-ipucu')));
      await tester.pumpAndSettle();
      expect(find.textContaining('Anlamı:'), findsOneWidget);
      expect(find.textContaining('ilk harf'), findsNothing);
      await tester.tap(find.byKey(const ValueKey('dy-ipucu')));
      await tester.pumpAndSettle();
      expect(find.textContaining('ilk harf'), findsOneWidget);
    });

    testWidgets('ses çalışmıyorsa metin ipucuna döner', (tester) async {
      final ses = _SessizSes();
      await _ac(tester, ses: ses);
      expect(find.byKey(const ValueKey('dy-sesyok')), findsOneWidget);
      expect(find.textContaining('ilk harf'), findsOneWidget);
      // Yazarak ilerlenebilir.
      final kelime = ses.okunanlar.last;
      await tester.enterText(find.byKey(const ValueKey('dy-yaz')), kelime);
      await tester.tap(find.byKey(const ValueKey('dy-kontrol')));
      await tester.pumpAndSettle();
      expect(find.text('Doğru!'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('dy-sonraki')));
      await tester.pumpAndSettle();
      // Sonraki kelimede ipucu açık kalır.
      expect(find.textContaining('ilk harf'), findsOneWidget);
    });

    testWidgets('bütün kelimeler bitince sonuç; Tekrar dene yeniden başlatır', (
      tester,
    ) async {
      final ses = SahteSes();
      await _ac(tester, ses: ses);
      for (var i = 0; i < 6; i++) {
        await tester.enterText(
          find.byKey(const ValueKey('dy-yaz')),
          _okunan(ses),
        );
        await tester.tap(find.byKey(const ValueKey('dy-kontrol')));
        await tester.pumpAndSettle();
        await tester.tap(find.byKey(const ValueKey('dy-sonraki')));
        await tester.pumpAndSettle();
      }
      expect(find.text('Oturum bitti'), findsOneWidget);
      expect(find.text('Doğru: 6 / 6'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('dy-yeniden')));
      await tester.pumpAndSettle();
      expect(find.text('1 / 6'), findsOneWidget);
    });

    testWidgets('kelime yoksa bilgi metni', (tester) async {
      await _ac(tester, durum: const OgrenciDurumu(alan: 'dil'));
      expect(find.byKey(const ValueKey('dy-bos')), findsOneWidget);
    });

    testWidgets('kod alanında yazılacak kelime yok (bilgi metni)', (
      tester,
    ) async {
      await _ac(
        tester,
        durum: const OgrenciDurumu(alan: 'kod', tamamlanan: {kkDers: 1}),
      );
      expect(find.byKey(const ValueKey('dy-bos')), findsOneWidget);
    });

    testWidgets('Pratik merkezi: Dinle ve yaz kartı ekranı açar', (
      tester,
    ) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(_durum()),
        kurslar: [kelimeKursu],
      );
      kap.read(yonlendiriciProvider).go('/pratik');
      await tester.pumpAndSettle();
      final f = find.byKey(const ValueKey('pratik-dinle-yaz'));
      await tester.ensureVisible(f);
      expect(f, findsOneWidget);
      await tester.tap(f);
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('dy-dinle')), findsOneWidget);
    });

    testWidgets('Pratik merkezi: kod alanında Dinle ve yaz kartı yok', (
      tester,
    ) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'kod')),
        kurslar: [kelimeKursu],
      );
      kap.read(yonlendiriciProvider).go('/pratik');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('pratik-dinle-yaz')), findsNothing);
      expect(find.byKey(const ValueKey('pratik-ipucu')), findsNothing);
    });

    testWidgets('360x640, ölçek 1,5: taşma yok', (tester) async {
      await _ac(tester, boyut: const Size(360, 640), olcek: 1.5);
      expect(tester.takeException(), isNull);
      await tester.enterText(find.byKey(const ValueKey('dy-yaz')), 'x');
      await tester.tap(find.byKey(const ValueKey('dy-kontrol')));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });
}
