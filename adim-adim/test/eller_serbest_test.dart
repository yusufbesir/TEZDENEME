// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Eller serbest sesli mod (ÖZELLİK 64): deste seçimi (yalnız dil kursu,
/// bitmiş ders, fiil tablosu yok), oturum mantığı (okuma, tekrar, yeniden
/// deneme, duraklatma), konuşma tanıma yokken yalnız dinlemeye düşme ve ekran.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/eller_serbest.dart';
import 'package:adim_adim/servis/eller_serbest_oturumu.dart';
import 'package:adim_adim/servis/konusma.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

const _ders = 'ingilizce-eh.u1.d1';

final Kurs _kurs = Kurs(
  id: 'ingilizce-eh',
  ad: 'Eller Serbest',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'ingilizce-eh.u1',
      ad: 'Hayvanlar',
      dersler: [
        Ders(
          id: _ders,
          ad: 'Ders',
          alistirmalar: const [
            Eslestir(
              soru: 'Eşleştir',
              ciftler: [
                (sol: 'cat', sag: 'kedi'),
                (sol: 'dog', sag: 'köpek'),
                (sol: 'bird', sag: 'kuş'),
              ],
            ),
            Tablo(
              soru: 'be Present',
              baslik: ['Özne', 'Be fiili'],
              satirlar: [
                ['I', 'am'],
              ],
              bos: [],
            ),
          ],
        ),
      ],
    ),
  ],
);

final Kurs _kod = Kurs(
  id: 'python-eh',
  ad: 'Kod',
  aciklama: '',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'python-eh.u1',
      ad: 'U',
      dersler: [
        Ders(
          id: 'python-eh.u1.d1',
          ad: 'D',
          alistirmalar: const [
            Eslestir(soru: 'E', ciftler: [(sol: 'print', sag: 'yazdır')]),
          ],
        ),
      ],
    ),
  ],
);

const _biten = OgrenciDurumu(alan: 'dil', tamamlanan: {_ders: 1}, xp: 30);

const _oge = ElleriSerbestOgesi(
  kartId: 'k',
  metin: 'cat',
  anlam: 'kedi',
  dil: 'en-US',
);

ElleriSerbestOturumu _oturum(
  SahteSes ses,
  KonusmaTanima k, {
  bool tekrar = true,
}) => ElleriSerbestOturumu(
  ses: ses,
  konusma: k,
  tekrarEt: tekrar,
  dinlemeSuresi: const Duration(milliseconds: 60),
  sessizlik: const Duration(milliseconds: 10),
  arayaBekleme: const Duration(milliseconds: 1),
);

void main() {
  group('Deste', () {
    test('yalnız bitmiş dersin kelimeleri; fiil tablosu hücresi yok', () {
      final d = ElleriSerbest.deste(_biten, [_kurs]);
      expect(d.map((o) => o.metin).toSet(), {'cat', 'dog', 'bird'});
      expect(d.every((o) => o.dil == 'en-US'), isTrue);
      expect(d.firstWhere((o) => o.metin == 'cat').anlam, 'kedi');
    });

    test('bitmemiş ve kartsız ders boş deste verir', () {
      expect(ElleriSerbest.deste(const OgrenciDurumu(), [_kurs]), isEmpty);
    });

    test('kod kursu atlanır; deste en çok enCok; tohum deterministik', () {
      expect(
        ElleriSerbest.deste(
          const OgrenciDurumu(tamamlanan: {'python-eh.u1.d1': 1}),
          [_kod],
        ),
        isEmpty,
      );
      List<String> k(int t) => ElleriSerbest.deste(_biten, [
        _kurs,
      ], tohum: t).map((o) => o.metin).toList();
      expect(k(2), k(2));
      expect(k(1).length, lessThanOrEqualTo(ElleriSerbest.enCok));
    });

    test('durum değişmez (saf işlev)', () {
      final once = _biten.toJson().toString();
      ElleriSerbest.deste(_biten, [_kurs]);
      expect(_biten.toJson().toString(), once);
    });
  });

  group('Oturum', () {
    test('doğru tekrar: bir kez okur, geçer, puan 100', () async {
      final ses = SahteSes();
      final k = SahteKonusma(yanitlar: ['cat']);
      final o = _oturum(ses, k);
      expect(await o.hazirla(), isTrue);
      final asamalar = <ElleriSerbestAsama>[];
      final s = await o.ogeyiIsle(
        _oge,
        onAsama: (a, {tahmin}) => asamalar.add(a),
      );
      expect(s!.gecti, isTrue);
      expect(s.deneme, 1);
      expect(s.tahmin!.puan, 100);
      expect(ses.okunanlar, ['cat']);
      expect(k.dinlenenDiller, ['en-US']);
      expect(asamalar, [
        ElleriSerbestAsama.okuyor,
        ElleriSerbestAsama.dinliyor,
        ElleriSerbestAsama.degerlendirdi,
      ]);
    });

    test('yanlış tekrar: bir kez daha okur, en çok enCokDeneme', () async {
      final ses = SahteSes();
      final k = SahteKonusma(yanitlar: ['xyz', 'qqq']);
      final o = _oturum(ses, k);
      await o.hazirla();
      final s = await o.ogeyiIsle(_oge);
      expect(s!.gecti, isFalse);
      expect(s.deneme, ElleriSerbestOturumu.enCokDeneme);
      expect(ses.okunanlar, ['cat', 'cat']);
    });

    test('ikinci denemede doğru söylerse geçer', () async {
      final ses = SahteSes();
      final k = SahteKonusma(yanitlar: ['xyz', 'cat']);
      final o = _oturum(ses, k);
      await o.hazirla();
      final s = await o.ogeyiIsle(_oge);
      expect(s!.gecti, isTrue);
      expect(s.deneme, 2);
    });

    test('hiçbir şey duyulmazsa tahmin null, geçmedi', () async {
      final o = _oturum(SahteSes(), SahteKonusma());
      await o.hazirla();
      final s = await o.ogeyiIsle(_oge);
      expect(s!.tahmin, isNull);
      expect(s.gecti, isFalse);
    });

    test('tanıma yok (KonusmaYok): yalnız dinlemeye düşer, dinlemez', () async {
      final ses = SahteSes();
      final o = _oturum(ses, const KonusmaYok());
      expect(await o.hazirla(), isFalse);
      expect(o.tekrarEt, isFalse);
      final s = await o.ogeyiIsle(_oge);
      expect(s!.tahmin, isNull);
      expect(s.gecti, isTrue);
      expect(ses.okunanlar, ['cat']);
    });

    test('izin verilmezse de yalnız dinlemeye düşer', () async {
      final k = SahteKonusma(izin: false, yanitlar: ['cat']);
      final o = _oturum(SahteSes(), k);
      expect(await o.hazirla(), isFalse);
      expect(o.tekrarEt, isFalse);
      expect(k.dinlenenDiller, isEmpty);
    });

    test('durdurunca öğe null döner; sifirla ile devam edilir', () async {
      final o = _oturum(SahteSes(), SahteKonusma(yanitlar: ['cat']));
      await o.hazirla();
      await o.durdur();
      expect(o.durdu, isTrue);
      expect(await o.ogeyiIsle(_oge), isNull);
      o.sifirla();
      expect((await o.ogeyiIsle(_oge))!.gecti, isTrue);
    });
  });

  group('Ekran', () {
    testWidgets('boş desteyle yönlendirme mesajı', (tester) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [_kurs],
      );
      kap.read(yonlendiriciProvider).push('/eller-serbest');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('eller-serbest-bos')), findsOneWidget);
    });

    testWidgets('tanıma yokken uyarı gösterir ve yalnız dinleme çalışır', (
      tester,
    ) async {
      final ses = SahteSes();
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(_biten),
        kurslar: [_kurs],
        ses: ses,
        konusma: const KonusmaYok(),
      );
      kap.read(yonlendiriciProvider).push('/eller-serbest');
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('eller-serbest-tanima-yok')),
        findsOneWidget,
      );
      expect(find.byKey(const ValueKey('eller-serbest-tekrar')), findsNothing);
      await tester.tap(find.byKey(const ValueKey('eller-serbest-basla')));
      for (var i = 0; i < 20; i++) {
        await tester.pump(const Duration(milliseconds: 700));
      }
      expect(ses.okunanlar.toSet(), {'cat', 'dog', 'bird'});
      expect(find.byKey(const ValueKey('eller-serbest-ozet')), findsOneWidget);
      expect(find.textContaining('3 öğe dinlendi'), findsOneWidget);
    });

    testWidgets('tanımayla: doğru tekrar puanı özetlenir; durum değişmez', (
      tester,
    ) async {
      final ses = SahteSes();
      final k = SahteKonusma(yanitlar: ['cat', 'dog', 'bird']);
      final depo = BellekDepo(_biten);
      final kap = await uygulamayiAc(
        tester,
        depo,
        kurslar: [_kurs],
        ses: ses,
        konusma: k,
      );
      kap.read(yonlendiriciProvider).push('/eller-serbest');
      await tester.pumpAndSettle();
      expect(
        find.byKey(const ValueKey('eller-serbest-tekrar')),
        findsOneWidget,
      );
      await tester.tap(find.byKey(const ValueKey('eller-serbest-basla')));
      for (var i = 0; i < 40; i++) {
        await tester.pump(const Duration(milliseconds: 700));
      }
      expect(find.byKey(const ValueKey('eller-serbest-ozet')), findsOneWidget);
      expect(find.textContaining('ortalama tahmini puan'), findsOneWidget);
      final d = await depo.yukle();
      expect(d.xp, 30);
      expect(d.kartlar, isEmpty);
    });

    testWidgets('duraklat ve devam çalışır', (tester) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(_biten),
        kurslar: [_kurs],
        konusma: const KonusmaYok(),
      );
      kap.read(yonlendiriciProvider).push('/eller-serbest');
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('eller-serbest-basla')));
      await tester.pump(const Duration(milliseconds: 100));
      await tester.tap(find.byKey(const ValueKey('eller-serbest-duraklat')));
      await tester.pump(const Duration(milliseconds: 100));
      expect(find.text('Duraklatıldı'), findsOneWidget);
      expect(find.byKey(const ValueKey('eller-serbest-devam')), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('eller-serbest-devam')));
      for (var i = 0; i < 20; i++) {
        await tester.pump(const Duration(milliseconds: 700));
      }
      expect(find.byKey(const ValueKey('eller-serbest-ozet')), findsOneWidget);
    });
  });
}
