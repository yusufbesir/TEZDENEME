// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Kelime defteri oynatıcısı (ÖZELLİK 82): çalma listesi, sıralı sesli okuma,
/// anlamı da okuma, duraklat/devam, atlama, hız ve döngü; ekran.
library;

import 'dart:async';

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/ekranlar/kelime_oynatici_ekrani.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/servis/kelime_oynatici.dart';
import 'package:adim_adim/servis/ses.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'yeni_ozellik_icerik.dart';

class _KayitSes extends Ses {
  final okunan = <({String metin, String dil, double hiz})>[];
  int durdurma = 0;

  @override
  Future<bool> okuBekle(
    String metin, {
    String dil = 'en-US',
    Duration enCok = const Duration(seconds: 20),
  }) async {
    okunan.add((metin: metin, dil: dil, hiz: konusmaHizi));
    return true;
  }

  @override
  Future<bool> oku(String metin, {String dil = 'en-US'}) async => true;

  @override
  Future<void> durdur() async => durdurma++;
}

const _a = OynatmaOgesi(metin: 'cat', anlam: 'kedi', dil: 'en-US');
const _b = OynatmaOgesi(metin: 'dog', anlam: 'köpek', dil: 'en-US');
const _c = OynatmaOgesi(metin: 'Haus', anlam: 'ev', dil: 'de-DE');

Future<void> _yut() async {
  for (var i = 0; i < 20; i++) {
    await Future<void>.delayed(Duration.zero);
  }
}

void main() {
  group('liste', () {
    test('zayıf kartlar önce; dil kursu dili; kod kursu hariç', () {
      final d = OgrenciDurumu(
        alan: 'dil',
        tamamlanan: const {tDers1: 1},
        kartlar: const {
          // fish/bird kartı (#1) zayıf: önce gelir.
          '$tDers1#1': Kart(kutu: 1, sonraki: '2026-10-20', yariOmurGun: 1),
        },
      );
      final kod = Kurs(
        id: 'js-t',
        ad: 'JS',
        aciklama: '',
        alan: KursAlani.kod,
        uniteler: [
          Unite(
            id: 'js-t.u1',
            ad: 'u',
            dersler: [
              Ders(
                id: 'js-t.u1.d1',
                ad: 'd',
                alistirmalar: const [
                  Eslestir(soru: 'e', ciftler: [(sol: 'let', sag: 'değişken')]),
                ],
              ),
            ],
          ),
        ],
      );
      final l = KelimeOynatici.liste(d, [hayvanKursu, kod]);
      expect(l.map((x) => x.metin).toList(), ['bird', 'fish', 'cat', 'dog']);
      expect(l.every((x) => x.dil == 'en-US'), isTrue);
      expect(l.first.anlam, 'kuş');
      expect(
        KelimeOynatici.liste(const OgrenciDurumu(), [hayvanKursu]),
        isEmpty,
      );
    });

    test('Almanca kursunda okuma dili de-DE', () {
      final k = Kurs(
        id: 'almanca-t',
        ad: 'Almanca',
        aciklama: '',
        alan: KursAlani.dil,
        uniteler: [
          Unite(
            id: 'almanca-t.u1',
            ad: 'u',
            dersler: [
              Ders(
                id: 'almanca-t.u1.d1',
                ad: 'd',
                alistirmalar: const [
                  Eslestir(soru: 'e', ciftler: [(sol: 'Haus', sag: 'ev')]),
                ],
              ),
            ],
          ),
        ],
      );
      final l = KelimeOynatici.liste(
        const OgrenciDurumu(tamamlanan: {'almanca-t.u1.d1': 1}),
        [k],
      );
      expect(l.single.dil, 'de-DE');
    });

    test('en çok 100 öğe', () {
      final k = Kurs(
        id: 'ingilizce-b',
        ad: 'B',
        aciklama: '',
        alan: KursAlani.dil,
        uniteler: [
          Unite(
            id: 'ingilizce-b.u1',
            ad: 'u',
            dersler: [
              Ders(
                id: 'ingilizce-b.u1.d1',
                ad: 'd',
                alistirmalar: [
                  for (var i = 0; i < 150; i++)
                    Eslestir(soru: 'e', ciftler: [(sol: 'w$i', sag: 'a$i')]),
                ],
              ),
            ],
          ),
        ],
      );
      final l = KelimeOynatici.liste(
        const OgrenciDurumu(tamamlanan: {'ingilizce-b.u1.d1': 1}),
        [k],
      );
      expect(l, hasLength(KelimeOynatici.enCok));
    });
  });

  group('oynatma', () {
    test('sırayla okur, bitince durur; hız konuşma hızına yansır', () async {
      final ses = _KayitSes();
      final bekleme = <Duration>[];
      final o = KelimeOynatici(
        ses: ses,
        ogeler: const [_a, _b, _c],
        hiz: OynatmaHizi.hizli,
        bekle: (d) async => bekleme.add(d),
      );
      await o.oynat();
      expect(ses.okunan.map((x) => x.metin), ['cat', 'dog', 'Haus']);
      expect(ses.okunan.map((x) => x.dil), ['en-US', 'en-US', 'de-DE']);
      expect(
        ses.okunan.every((x) => x.hiz == OynatmaHizi.hizli.konusmaHizi),
        isTrue,
      );
      expect(bekleme, everyElement(OynatmaHizi.hizli.bekleme));
      expect(o.caliyor, isFalse);
      expect(o.bitti, isTrue);
      // Bittikten sonra oynat baştan başlar.
      await o.oynat();
      expect(ses.okunan, hasLength(6));
      expect(ses.okunan[3].metin, 'cat');
    });

    test(
      'hız dilimleri: yavaş < normal < hızlı konuşma hızı, bekleme azalır',
      () {
        expect(
          OynatmaHizi.yavas.konusmaHizi,
          lessThan(OynatmaHizi.normal.konusmaHizi),
        );
        expect(
          OynatmaHizi.normal.konusmaHizi,
          lessThan(OynatmaHizi.hizli.konusmaHizi),
        );
        expect(
          OynatmaHizi.yavas.bekleme,
          greaterThan(OynatmaHizi.normal.bekleme),
        );
        expect(
          OynatmaHizi.normal.bekleme,
          greaterThan(OynatmaHizi.hizli.bekleme),
        );
      },
    );

    test('anlamı da oku: kelime sonra Türkçe anlam', () async {
      final ses = _KayitSes();
      final o = KelimeOynatici(
        ses: ses,
        ogeler: const [_a, _b],
        anlamOku: true,
        bekle: (_) async {},
      );
      await o.oynat();
      expect(ses.okunan.map((x) => x.metin), ['cat', 'kedi', 'dog', 'köpek']);
      expect(ses.okunan.map((x) => x.dil), [
        'en-US',
        'tr-TR',
        'en-US',
        'tr-TR',
      ]);
    });

    test('duraklat ilerlemeyi keser; devam aynı öğeden sürer', () async {
      final ses = _KayitSes();
      var cagri = 0;
      final tutucu = Completer<void>();
      final o = KelimeOynatici(
        ses: ses,
        ogeler: const [_a, _b, _c],
        bekle: (_) {
          cagri++;
          return cagri == 1 ? tutucu.future : Future<void>.value();
        },
      );
      unawaited(o.oynat());
      await _yut();
      expect(o.caliyor, isTrue);
      expect(ses.okunan.map((x) => x.metin), ['cat']);
      await o.duraklat();
      expect(o.caliyor, isFalse);
      expect(ses.durdurma, 1);
      tutucu.complete();
      await _yut();
      // Duraklatılınca sıradakine geçilmedi.
      expect(ses.okunan.map((x) => x.metin), ['cat']);
      expect(o.indeks, 0);
      // Devam: aynı öğe yeniden, sonra gerisi.
      await o.devam();
      expect(ses.okunan.map((x) => x.metin), ['cat', 'cat', 'dog', 'Haus']);
      expect(o.bitti, isTrue);
    });

    test('duraklat çalmıyorken etkisiz', () async {
      final ses = _KayitSes();
      final o = KelimeOynatici(
        ses: ses,
        ogeler: const [_a],
        bekle: (_) async {},
      );
      await o.duraklat();
      expect(ses.durdurma, 0);
    });

    test(
      'git/sonraki/önceki sınırlara kırpılır; çalarken oradan sürer',
      () async {
        final ses = _KayitSes();
        final o = KelimeOynatici(
          ses: ses,
          ogeler: const [_a, _b, _c],
          bekle: (_) async {},
        );
        await o.onceki();
        expect(o.indeks, 0);
        await o.sonraki();
        expect(o.indeks, 1);
        await o.git(99);
        expect(o.indeks, 2);
        expect(o.simdiki, _c);
        await o.git(0);
        expect(ses.okunan, isEmpty, reason: 'çalmıyorken atlama okumaz');
        // Çalarken atla: yeni öğeden okumaya sürer.
        final tutucu = Completer<void>();
        var cagri = 0;
        final p = KelimeOynatici(
          ses: ses,
          ogeler: const [_a, _b, _c],
          bekle: (_) => ++cagri == 1 ? tutucu.future : Future<void>.value(),
        );
        unawaited(p.oynat());
        await _yut();
        await p.git(2);
        await _yut();
        expect(ses.okunan.map((x) => x.metin), ['cat', 'Haus']);
        tutucu.complete();
        await _yut();
        expect(p.bitti, isTrue);
      },
    );

    test('döngü: bitince baştan başlar; duraklatınca durur', () async {
      final ses = _KayitSes();
      var tur = 0;
      late final KelimeOynatici o;
      o = KelimeOynatici(
        ses: ses,
        ogeler: const [_a, _b],
        dongu: true,
        bekle: (_) async {
          if (++tur == 5) await o.duraklat();
        },
      );
      await o.oynat();
      expect(ses.okunan.map((x) => x.metin).take(5), [
        'cat',
        'dog',
        'cat',
        'dog',
        'cat',
      ]);
      expect(o.caliyor, isFalse);
    });

    test('boş liste: oynat bir şey yapmaz', () async {
      final ses = _KayitSes();
      final o = KelimeOynatici(ses: ses, ogeler: const [], bekle: (_) async {});
      await o.oynat();
      expect(o.caliyor, isFalse);
      expect(o.bitti, isFalse);
      expect(o.simdiki, isNull);
      await o.git(3);
      expect(ses.okunan, isEmpty);
    });
  });

  group('ekran', () {
    final bitmis = OgrenciDurumu(alan: 'dil', tamamlanan: const {tDers1: 1});

    testWidgets('boş defterde bilgi metni', (tester) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [hayvanKursu],
      );
      kap.read(yonlendiriciProvider).go('/kelime-oynatici');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('oynatici-bos')), findsOneWidget);
    });

    testWidgets('oynat, duraklat, sonraki, önceki, hız ve anahtarlar', (
      tester,
    ) async {
      final ses = SahteSes();
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(bitmis),
        kurslar: [hayvanKursu],
        ses: ses,
      );
      await dokun(tester, find.byIcon(Icons.person_outline));
      kap.read(yonlendiriciProvider).go('/pratik');
      await tester.pumpAndSettle();
      await dokun(tester, find.byKey(const ValueKey('pratik-oynatici')));
      expect(find.byType(KelimeOynaticiEkrani), findsOneWidget);
      final sayac = find.byKey(const ValueKey('oynatici-sayac'));
      expect(tester.widget<Text>(sayac).data, '1 / 4');
      await dokun(tester, find.byKey(const ValueKey('oynatici-sonraki')));
      expect(tester.widget<Text>(sayac).data, '2 / 4');
      await dokun(tester, find.byKey(const ValueKey('oynatici-onceki')));
      expect(tester.widget<Text>(sayac).data, '1 / 4');

      // Hız ve anahtarlar.
      await dokun(tester, find.text('Yavaş'));
      await dokun(tester, find.byKey(const ValueKey('oynatici-anlam-oku')));
      await dokun(tester, find.byKey(const ValueKey('oynatici-dongu')));

      // Oynat: TTS okur (sahte ses anında), bekleme gerçek zamanlı; duraklat.
      await tester.tap(find.byKey(const ValueKey('oynatici-oynat')));
      await tester.pump();
      await tester.pump(const Duration(milliseconds: 10));
      expect(ses.okunanlar.first, isNotEmpty);
      expect(find.byTooltip('Duraklat'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('oynatici-oynat')));
      await tester.pump();
      expect(find.byTooltip('Oynat'), findsOneWidget);
      expect(ses.durdurmaSayisi, 1);
      // Ekrandan çık: bekleyen zamanlayıcılar bitsin.
      kap.read(yonlendiriciProvider).go('/yol');
      await tester.pump(const Duration(seconds: 10));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });

    testWidgets('ses kapalıyken oynat devre dışı ve uyarı görünür', (
      tester,
    ) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(
          OgrenciDurumu(
            alan: 'dil',
            tamamlanan: const {tDers1: 1},
            sesAcik: false,
          ),
        ),
        kurslar: [hayvanKursu],
      );
      kap.read(yonlendiriciProvider).go('/kelime-oynatici');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('oynatici-ses-kapali')), findsOneWidget);
      expect(
        tester
            .widget<IconButton>(find.byKey(const ValueKey('oynatici-oynat')))
            .onPressed,
        isNull,
      );
    });

    testWidgets('480x600 ölçek 1,5 taşmaz', (tester) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(bitmis),
        kurslar: [hayvanKursu],
        boyut: const Size(480, 600),
        metinOlcegi: 1.5,
      );
      kap.read(yonlendiriciProvider).go('/kelime-oynatici');
      await tester.pumpAndSettle();
      expect(find.byType(KelimeOynaticiEkrani), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
