// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Fiil çekim sözlüğü (ÖZELLİK 61): çekimler YALNIZ kurs tablolarından derlenir
/// (uydurma/kural yok); gerçek içerikte bilinen biçimler doğrulanır, kapsam
/// sınırı sabitlenir; sözlükte fiil maddesine dokununca tablo açılır, fiil
/// olmayan maddede açılmaz.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/sozluk/fiil_cekimi.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

final Kurs _kurs = Kurs(
  id: 'almanca-t',
  ad: 'Almanca Test',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'almanca-t.u1',
      ad: 'Fiiller',
      dersler: [
        Ders(
          id: 'almanca-t.u1.d1',
          ad: 'Ders',
          alistirmalar: const [
            Eslestir(
              soru: 'Eşleştir',
              ciftler: [(sol: 'sein', sag: 'olmak'), (sol: 'Haus', sag: 'ev')],
            ),
            Tablo(
              soru: 'sein Präsens',
              baslik: ['Zamir', 'sein'],
              satirlar: [
                ['ich', 'bin'],
                ['du', 'bist'],
                ['er', 'ist'],
              ],
              bos: [],
            ),
            // Fiil olmayan sütun (Partizip II) atlanmalı.
            Tablo(
              soru: 'Partizip',
              baslik: ['Zamir', 'gemacht'],
              satirlar: [
                ['ich', 'x'],
              ],
              bos: [],
            ),
          ],
        ),
      ],
    ),
  ],
);

void main() {
  group('Fiil çekimi derleme', () {
    final c = FiilCekimleri.kurslardan([_kurs]);

    test('yalnız tablodaki fiil ve kişiler; er -> er/sie/es', () {
      expect(c.hepsi.map((f) => f.fiil), ['sein']);
      final z = c.bul('sein', 'de')!.zamanlar.single;
      expect(z.ad, 'Präsens');
      expect(z.satirlar.map((s) => '${s.zamir}=${s.bicim}'), [
        'ich=bin',
        'du=bist',
        'er/sie/es=ist',
      ]);
    });

    test('anahtar: "(anlam)" ve "to " atılır, küçük harf', () {
      expect(FiilCekimleri.anahtar('Sein (olmak)'), 'sein');
      expect(FiilCekimleri.anahtar('to be'), 'be');
      expect(c.bul('sein (olmak)', 'de'), isNotNull);
      expect(c.bul('sein', 'en'), isNull);
      expect(c.bul('Haus', 'de'), isNull);
    });

    test('kod ve Korece kurslarında çekim yok', () {
      final kod = Kurs(
        id: 'python-t',
        ad: 'P',
        aciklama: '',
        alan: KursAlani.kod,
        uniteler: _kurs.uniteler,
      );
      expect(FiilCekimleri.kurslardan([kod]).hepsi, isEmpty);
    });
  });

  group('Gerçek içerik kapsamı', () {
    final c = FiilCekimleri.kurslardan(tumKurslar);
    String f(String fiil, String zaman, String zamir, {String dil = 'de'}) {
      final z = c.bul(fiil, dil)!.zamanlar.firstWhere((x) => x.ad == zaman);
      return z.satirlar.firstWhere((s) => s.zamir == zamir).bicim;
    }

    test('doğrulanmış temel biçimler', () {
      expect(f('sein', 'Präsens', 'ich'), 'bin');
      expect(f('sein', 'Präsens', 'er/sie/es'), 'ist');
      expect(f('sein', 'Präsens', 'ihr'), 'seid');
      expect(f('sein', 'Präteritum', 'ich'), 'war');
      expect(f('haben', 'Präsens', 'du'), 'hast');
      expect(f('haben', 'Präsens', 'er/sie/es'), 'hat');
      expect(f('können', 'Präsens', 'ich'), 'kann');
      expect(f('können', 'Konjunktiv II', 'wir'), 'könnten');
      expect(f('müssen', 'Präsens', 'du'), 'musst');
      expect(f('wollen', 'Präsens', 'er/sie/es'), 'will');
      expect(f('werden', 'Konjunktiv II', 'ich'), 'würde');
      expect(f('gehen', 'Präteritum', 'ich/er'), 'ging');
      expect(f('be', 'Present', 'I', dil: 'en'), 'am');
      expect(f('be', 'Present', 'we', dil: 'en'), 'are');
    });

    test(
      'kapsam: Almanca ve İngilizce fiiller sabit (genişleyince bilinçli)',
      () {
        final de = c.hepsi.where((x) => x.dil == 'de').map((x) => x.fiil);
        expect(
          de.toSet(),
          containsAll(['sein', 'haben', 'können', 'müssen', 'wollen']),
        );
        expect(c.hepsi.where((x) => x.dil == 'en').map((x) => x.fiil), ['be']);
      },
    );

    test('hiçbir zamanda aynı kişi iki kez yok, biçim boş değil', () {
      for (final fiil in c.hepsi) {
        for (final z in fiil.zamanlar) {
          final kisiler = z.satirlar.map((s) => s.zamir).toList();
          expect(kisiler.toSet().length, kisiler.length, reason: fiil.fiil);
          for (final s in z.satirlar) {
            expect(s.bicim.trim(), isNotEmpty);
          }
        }
      }
    });
  });

  group('Sözlük arayüzü', () {
    testWidgets('fiil maddesine dokununca tablo açılır; isim açılmaz', (
      tester,
    ) async {
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [_kurs],
      );
      await dokun(tester, find.byTooltip('Sözlük'));
      expect(find.byKey(const ValueKey('fiil-cekim-sein')), findsOneWidget);
      expect(find.byKey(const ValueKey('fiil-cekim-Haus')), findsNothing);
      await dokun(tester, find.byKey(const ValueKey('fiil-cekim-sein')));
      expect(find.byKey(const ValueKey('fiil-cekim-baslik')), findsOneWidget);
      expect(find.byKey(const ValueKey('fiil-cekim-Präsens')), findsOneWidget);
      expect(find.text('bist'), findsOneWidget);
      expect(find.byKey(const ValueKey('fiil-cekim-not')), findsOneWidget);
    });
  });
}
