/// Hamle alıştırma türü: JSON gidiş-dönüş, cevap denetimi (tek hamle, hamle
/// dizisi, matKabul), doğru cevap metni, kademeli ipucu, hataya özel mesaj,
/// alan ('oyun') ve tahta bileşeni (dokun-seç-dokun-oyna, rakip cevabı,
/// terfi, ipucu sonrası sıfırlama, Semantics, 480x600 @1,5 taşmama).
library;

import 'package:adim_adim/bilesenler/alistirma_oturumu.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/tema/alan_renkleri.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:adim_adim/yarisma/soru_bankasi.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

const _tek = Hamle(
  soru: 'e2\'deki piyonu e4\'e oynat.',
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  hamleler: ['e2e4'],
  hataMesajlari: {'e2e3': 'Piyon iki kare gidebilir.'},
  aciklama: 'e4 merkezi tutar.',
);

const _pat = Hamle(
  soru: 'Mat et, pat yapma.',
  fen: '7k/4Q3/6K1/8/8/8/8/8 w - - 0 1',
  hamleler: ['e7e8'],
  matKabul: true,
  hataMesajlari: {'e7f7': 'Bu pat!'},
);

const _dizi = Hamle(
  soru: '2 hamlede mat et.',
  fen: '2rr2k1/5ppp/8/8/3Q4/8/5PPP/3R2K1 w - - 0 1',
  hamleler: ['d4d8', 'c8d8', 'd1d8'],
  matKabul: true,
);

const _terfi = Hamle(
  soru: 'Vezire terfi ettir.',
  fen: '8/4P3/8/8/8/8/k7/4K3 w - - 0 1',
  hamleler: ['e7e8q'],
);

Widget _oturum(List<Alistirma> liste, {void Function(int, bool)? onSonuc}) =>
    MaterialApp(
      theme: acikTema(),
      home: Scaffold(
        body: AlistirmaOturumu(
          alistirmalar: liste,
          onSonuc: onSonuc ?? (_, _) {},
          onBitti: (_, _) {},
          onKapat: () {},
        ),
      ),
    );

Future<void> _kare(WidgetTester tester, String ad) async {
  final f = find.byKey(ValueKey('kare-$ad'));
  await tester.ensureVisible(f);
  await tester.pumpAndSettle();
  await tester.tap(f);
  await tester.pumpAndSettle();
}

Future<void> _kontrol(WidgetTester tester) async {
  final f = find.text('Kontrol et');
  await tester.ensureVisible(f);
  await tester.tap(f);
  await tester.pumpAndSettle();
}

void main() {
  group('model', () {
    test('JSON gidiş-dönüş ve varsayılanlar', () {
      for (final a in [_tek, _pat, _dizi, _terfi]) {
        final geri = Alistirma.fromJson(a.toJson());
        expect(geri, isA<Hamle>());
        expect(geri.toJson(), a.toJson());
      }
      final j = _tek.toJson();
      expect(j['tur'], 'hamle');
      expect(j.containsKey('matKabul'), isFalse);
      expect(j.containsKey('oyun'), isFalse);
      expect(_pat.toJson()['matKabul'], true);
      final eski = Alistirma.fromJson({
        'tur': 'hamle',
        'soru': 's',
        'fen': '8/8/8/8/8/8/8/K6k w - - 0 1',
        'hamleler': ['a1a2'],
        'hataMesajlari': {'a1b1': 'm', 'bozuk': 5},
      });
      eski as Hamle;
      expect(eski.matKabul, isFalse);
      expect(eski.oyun, 'satranc');
      expect(eski.hataMesajlari, {'a1b1': 'm'});
      const go = Hamle(soru: 's', fen: 'x', hamleler: ['a'], oyun: 'go');
      expect((Alistirma.fromJson(go.toJson()) as Hamle).oyun, 'go');
    });

    test('oyuncu hamleleri çift indekslerdir', () {
      expect(_dizi.oyuncuHamleleri, ['d4d8', 'd1d8']);
      expect(_tek.oyuncuHamleleri, ['e2e4']);
    });

    test('KursAlani.oyun ve durum JSON', () {
      expect(KursAlani.values.map((e) => e.name), ['dil', 'kod', 'oyun']);
      expect(
        OgrenciDurumu.fromJson(const OgrenciDurumu(alan: 'oyun').toJson()).alan,
        'oyun',
      );
      expect(AlanRenkleri.ad('oyun'), 'Oyunlar');
      expect(AlanRenkleri.simge('oyun'), Icons.extension);
      expect(
        AlanRenkleri.kursRengi(KursAlani.oyun, Brightness.light),
        AlanRenkleri.oyunAcik,
      );
      expect(seviyeler('oyun').map((e) => e.kursId), [
        'satranc-1',
        'satranc-2',
        'satranc-3',
      ]);
    });
  });

  group('motor', () {
    test('tek hamle: doğru, yanlış, bozuk cevap', () {
      expect(Motor.cevapDogruMu(_tek, ['e2e4']), isTrue);
      expect(Motor.cevapDogruMu(_tek, ['E2E4']), isTrue);
      expect(Motor.cevapDogruMu(_tek, ['e2e3']), isFalse);
      expect(Motor.cevapDogruMu(_tek, 'e2e4'), isFalse);
      expect(Motor.cevapDogruMu(_tek, const []), isFalse);
      expect(Motor.cevapDogruMu(_tek, ['e2e4', 'e7e5']), isFalse);
      expect(Motor.cevapDogruMu(_tek, [3]), isFalse);
    });

    test('matKabul: başka mat hamlesi de doğru, pat yanlış', () {
      expect(Motor.cevapDogruMu(_pat, ['e7f8']), isTrue);
      expect(Motor.cevapDogruMu(_pat, ['e7g7']), isTrue);
      expect(Motor.cevapDogruMu(_pat, ['e7f7']), isFalse);
      expect(Motor.cevapDogruMu(_pat, ['e7e1']), isFalse);
      expect(Motor.cevapDogruMu(_pat, ['a1a2']), isFalse);
    });

    test('hamle dizisi: ara adım katı, son adım mat yeter', () {
      expect(Motor.cevapDogruMu(_dizi, ['d4d8', 'd1d8']), isTrue);
      expect(Motor.cevapDogruMu(_dizi, ['d1d8', 'd4d8']), isFalse);
      expect(Motor.cevapDogruMu(_dizi, ['d4d8']), isFalse);
      expect(Motor.cevapDogruMu(_dizi, ['d4d5', 'd1d8']), isFalse);
    });

    test('doğru cevap metni Türkçe notasyonla', () {
      expect(Motor.dogruCevapMetni(_tek), 'e4');
      expect(Motor.dogruCevapMetni(_pat), 'Ve8#');
      expect(Motor.dogruCevapMetni(_dizi), 'Vxd8+, sonra Kxd8#');
      expect(Motor.dogruCevapMetni(_terfi), 'e8=V');
      const bozuk = Hamle(soru: 's', fen: 'bozuk', hamleler: ['a1a2']);
      expect(Motor.dogruCevapMetni(bozuk), 'a1a2');
    });

    test('kademeli ipucu: genel, taş, çözüm', () {
      expect(Motor.ipucuUret(_dizi, 0), contains('şah çeken'));
      expect(Motor.ipucuUret(_dizi, 1), 'Oynanacak taş: d4 karesindeki vezir');
      expect(Motor.ipucuUret(_dizi, 2), 'Çözüm: Vxd8+, sonra Kxd8#');
      // Açıklama varsa ilk adım açıklamanın ilk cümlesidir.
      expect(Motor.ipucuUret(_tek, 0), 'e4 merkezi tutar.');
    });

    test('hataya özel mesaj', () {
      expect(Motor.hataMesaji(_tek, ['e2e3']), 'Piyon iki kare gidebilir.');
      expect(Motor.hataMesaji(_tek, ['e2e4']), isNull);
      expect(Motor.hataMesaji(_tek, ['d2d4']), isNull);
      expect(Motor.hataMesaji(_pat, ['e7f7']), 'Bu pat!');
      expect(Motor.hataMesaji(_tek, null), isNull);
      expect(
        Motor.hataMesaji(const Yaz(soru: 's', cevaplar: ['a']), 'b'),
        isNull,
      );
    });

    test('kart işleme ve hata defteri türden bağımsız', () {
      final d = Motor.kartIsle(
        const OgrenciDurumu(alan: 'oyun'),
        'satranc-1-u1-d1#5',
        false,
        '2026-10-21',
      );
      expect(d.kartlar['satranc-1-u1-d1#5'], isNotNull);
      expect(d.hatalar.single.seviye, 'satranc-1');
    });
  });

  group('arayüz', () {
    testWidgets('doğru hamle: seç, oyna, Kontrol et', (tester) async {
      final sonuclar = <bool>[];
      await tester.pumpWidget(
        _oturum([_tek], onSonuc: (_, d) => sonuclar.add(d)),
      );
      expect(find.textContaining('Beyaz oynar'), findsOneWidget);
      await _kare(tester, 'e2');
      expect(find.bySemanticsLabel('e2, beyaz piyon, seçili'), findsOneWidget);
      expect(find.bySemanticsLabel('e4, boş, gidilebilir'), findsOneWidget);
      await _kare(tester, 'e4');
      expect(find.textContaining('Hamlen: e4'), findsOneWidget);
      await _kontrol(tester);
      expect(find.text('Doğru!'), findsOneWidget);
      expect(sonuclar, [true]);
    });

    testWidgets('yanlış hamle: hata mesajı, ipucu sonrası tahta sıfırlanır', (
      tester,
    ) async {
      final sonuclar = <bool>[];
      await tester.pumpWidget(
        _oturum([_tek], onSonuc: (_, d) => sonuclar.add(d)),
      );
      await _kare(tester, 'e2');
      await _kare(tester, 'e3');
      await _kontrol(tester);
      expect(find.text('Yanlış'), findsOneWidget);
      expect(find.textContaining('Piyon iki kare gidebilir.'), findsOneWidget);
      expect(find.textContaining('Doğru cevap: e4'), findsOneWidget);
      expect(sonuclar, [false]);
      await tester.tap(find.byKey(const Key('ipucu-al')));
      await tester.pumpAndSettle();
      // Tahta baştan: piyon yine e2'de.
      expect(find.bySemanticsLabel('e2, beyaz piyon'), findsOneWidget);
      await _kare(tester, 'e2');
      await _kare(tester, 'e4');
      await _kontrol(tester);
      expect(find.text('Doğru!'), findsOneWidget);
      // İpucu sonrası deneme onSonuc'u değiştirmez.
      expect(sonuclar, [false]);
    });

    testWidgets('baştan al ve geçersiz hedef', (tester) async {
      await tester.pumpWidget(_oturum([_tek]));
      await _kare(tester, 'e2');
      await _kare(tester, 'e5');
      expect(find.text('Bu taş o kareye gidemez.'), findsOneWidget);
      await _kare(tester, 'e2');
      await _kare(tester, 'e3');
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNotNull,
      );
      await tester.ensureVisible(find.byKey(const Key('hamle-bastan')));
      await tester.tap(find.byKey(const Key('hamle-bastan')));
      await tester.pumpAndSettle();
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNull,
      );
      expect(find.bySemanticsLabel('e2, beyaz piyon'), findsOneWidget);
    });

    testWidgets('hamle dizisi: rakip otomatik cevap verir', (tester) async {
      await tester.pumpWidget(_oturum([_dizi]));
      await _kare(tester, 'd4');
      await _kare(tester, 'd8');
      expect(find.textContaining('Rakip Kxd8 oynadı'), findsOneWidget);
      expect(find.bySemanticsLabel('d8, siyah kale'), findsOneWidget);
      expect(
        tester.widget<FilledButton>(find.byType(FilledButton)).onPressed,
        isNull,
      );
      await _kare(tester, 'd1');
      await _kare(tester, 'd8');
      await _kontrol(tester);
      expect(find.text('Doğru!'), findsOneWidget);
    });

    testWidgets('matKabul: başka mat hamlesi kabul edilir', (tester) async {
      await tester.pumpWidget(_oturum([_pat]));
      await _kare(tester, 'e7');
      await _kare(tester, 'f8');
      await _kontrol(tester);
      expect(find.text('Doğru!'), findsOneWidget);
    });

    testWidgets('terfi seçimi', (tester) async {
      await tester.pumpWidget(_oturum([_terfi]));
      await _kare(tester, 'e7');
      await _kare(tester, 'e8');
      expect(find.text('Piyon hangi taşa dönüşsün?'), findsOneWidget);
      await tester.ensureVisible(find.byKey(const Key('terfi-q')));
      await tester.tap(find.byKey(const Key('terfi-q')));
      await tester.pumpAndSettle();
      await _kontrol(tester);
      expect(find.text('Doğru!'), findsOneWidget);
    });

    testWidgets('siyah oynarken tahta siyahın bakış açısından', (tester) async {
      await tester.pumpWidget(
        _oturum([
          const Hamle(
            soru: 'Siyah oynar.',
            fen: '6k1/8/8/8/8/8/1r3PPP/6K1 b - - 0 1',
            hamleler: ['b2b1'],
            matKabul: true,
          ),
        ]),
      );
      expect(find.textContaining('Siyah oynar'), findsWidgets);
      // Sol üstteki kare h1 (siyahın bakışı).
      final h1 = tester.getTopLeft(find.byKey(const ValueKey('kare-h1')));
      final a8 = tester.getTopLeft(find.byKey(const ValueKey('kare-a8')));
      expect(h1.dy, lessThan(a8.dy));
      expect(h1.dx, lessThan(a8.dx));
    });

    testWidgets('480x600 @1,5 ölçek: taşma yok', (tester) async {
      tester.view.physicalSize = const Size(480, 600);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      for (final a in [_tek, _dizi, _terfi]) {
        await tester.pumpWidget(_oturum([a]));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull, reason: a.soru);
      }
      await tester.pumpWidget(_oturum([_terfi]));
      await _kare(tester, 'e7');
      await _kare(tester, 'e8');
      expect(tester.takeException(), isNull);
      expect(find.text('Piyon hangi taşa dönüşsün?'), findsOneWidget);
      await tester.ensureVisible(find.byKey(const Key('terfi-n')));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const Key('terfi-n')));
      await tester.pumpAndSettle();
      await _kontrol(tester);
      expect(find.text('Yanlış'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('alan seçiminde Oyunlar kartı: alan oyun yazılır', (
      tester,
    ) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu()),
        boyut: const Size(480, 600),
        metinOlcegi: 1.5,
      );
      await tester.scrollUntilVisible(
        find.text('Oyunlar'),
        100,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.pumpAndSettle();
      expect(find.text('Oyunlar'), findsOneWidget);
      await tester.tap(find.text('Oyunlar'));
      await tester.pumpAndSettle();
      expect(kap.read(durumProvider).value!.alan, 'oyun');
      expect(tester.takeException(), isNull);
    });
  });
}
