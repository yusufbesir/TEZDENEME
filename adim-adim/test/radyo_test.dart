// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Dinleme radyosu (ÖZELLİK 46): bölümlerin yalnız ünite cümlelerinden
/// türemesi, kod kurslarında boş olması, tohumla deterministik sorular, radyo
/// akışının okuBekle çağırması ve etkinliklerin durumu DEĞİŞTİRMEMESİ.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/radyo.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

const _kursId = 'almanca-radyo';

final Kurs _kurs = Kurs(
  id: _kursId,
  ad: 'Almanca Radyo',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: '$_kursId.u1',
      ad: 'Kafe',
      dersler: [
        Ders(
          id: '$_kursId.u1.d1',
          ad: 'Ders',
          alistirmalar: const [
            Soyle(
              soru: 'Söyle',
              metin: 'Ich möchte einen Kaffee',
              ceviri: 'Bir kahve istiyorum',
              dil: 'de-DE',
            ),
            Soyle(
              soru: 'Söyle',
              metin: 'Wie viel kostet das',
              ceviri: 'Bu ne kadar',
              dil: 'de-DE',
            ),
            Dinle(
              soru: 'Dinle',
              okunacak: 'Guten Morgen zusammen',
              secenekler: ['a', 'b'],
              dogru: 0,
              dil: 'de-DE',
            ),
            Sirala(
              soru: 'Sırala',
              kelimeler: ['Tisch', 'Ich', 'brauche', 'einen'],
              dogru: ['Ich', 'brauche', 'einen', 'Tisch'],
            ),
            Secim(soru: 'Seç', secenekler: ['x', 'y'], dogru: 0),
          ],
        ),
      ],
    ),
    Unite(
      id: '$_kursId.u2',
      ad: 'Az cümleli',
      dersler: [
        Ders(
          id: '$_kursId.u2.d1',
          ad: 'Ders',
          alistirmalar: const [
            Soyle(soru: 'S', metin: 'Guten Tag', ceviri: 'İyi günler'),
          ],
        ),
      ],
    ),
  ],
);

final Kurs _kod = Kurs(
  id: 'python-radyo',
  ad: 'Python',
  aciklama: '',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'python-radyo.u1',
      ad: 'Giriş',
      dersler: [
        Ders(
          id: 'python-radyo.u1.d1',
          ad: 'Ders',
          alistirmalar: const [
            Soyle(soru: 'S', metin: 'print hello world', ceviri: 'x'),
            Soyle(soru: 'S', metin: 'for i in range', ceviri: 'x'),
            Soyle(soru: 'S', metin: 'if x is none', ceviri: 'x'),
          ],
        ),
      ],
    ),
  ],
);

void main() {
  group('Radyo motoru', () {
    test('bölüm yalnız ünite cümlelerinden; az cümleli ünite atlanır', () {
      final b = Radyo.bolumler([_kurs]);
      expect(b.length, 1);
      expect(b.single.uniteId, '$_kursId.u1');
      expect(b.single.dil, 'de-DE');
      final metinler = b.single.cumleler.map((c) => c.metin).toSet();
      expect(metinler, {
        'Ich möchte einen Kaffee',
        'Wie viel kostet das',
        'Guten Morgen zusammen',
        'Ich brauche einen Tisch',
      });
      // Çevirisi bilinenler öne gelir.
      expect(b.single.cumleler.first.anlam, isNotNull);
      expect(b.single.cumleler.last.anlam, isNull);
    });

    test('kod kurslarında bölüm yok', () {
      expect(Radyo.bolumler([_kod]), isEmpty);
      expect(Radyo.bolumBul([_kod], _kod.id, 0), isNull);
    });

    test('bolumBul doğru üniteyi bulur, olmayanı null verir', () {
      expect(Radyo.bolumBul([_kurs], _kursId, 0)?.ad, 'Kafe');
      expect(Radyo.bolumBul([_kurs], _kursId, 1), isNull);
      expect(Radyo.bolumBul([_kurs], 'yok', 0), isNull);
    });

    test('sorular tohumla deterministik, en çok enCokSoru', () {
      final b = Radyo.bolumBul([_kurs], _kursId, 0)!;
      String ozet(List<RadyoSorusu> s) =>
          s.map((x) => '${x.tur}|${x.okunacak}').join(';');
      final a = Radyo.sorular(b, tohum: 4);
      final c = Radyo.sorular(b, tohum: 4);
      expect(ozet(a), ozet(c));
      expect(a, isNotEmpty);
      expect(a.length, lessThanOrEqualTo(Radyo.enCokSoru));
    });

    test('her sorunun okunacak cümlesi bölümün kendi cümlesi', () {
      final b = Radyo.bolumBul([_kurs], _kursId, 0)!;
      final kume = b.cumleler.map((c) => c.metin).toSet();
      for (var t = 0; t < 5; t++) {
        for (final s in Radyo.sorular(b, tohum: t)) {
          expect(kume, contains(s.okunacak));
          expect(s.dil, 'de-DE');
        }
      }
    });

    test('dinle-tanı sorusunun doğru seçeneği okunan cümledir', () {
      final b = Radyo.bolumBul([_kurs], _kursId, 0)!;
      for (final s in Radyo.sorular(b, tohum: 1)) {
        final a = s.alistirma;
        if (a is Dinle) {
          expect(a.secenekler[a.dogru], s.okunacak);
          expect(a.secenekler.toSet().length, a.secenekler.length);
        }
        if (a is Sirala) {
          expect(a.dogru.join(' '), s.okunacak);
          expect(a.kelimeler.toList()..sort(), a.dogru.toList()..sort());
        }
      }
    });
  });

  group('Radyo arayüzü', () {
    const baslangic = OgrenciDurumu(
      alan: 'dil',
      xp: 50,
      kartlar: {'k#1': Kart(kutu: 2, sonraki: '2026-10-20')},
    );

    testWidgets('dil kursunda liste ve bölüm açılır; radyo okuBekle çağırır', (
      tester,
    ) async {
      final ses = SahteSes();
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(baslangic),
        kurslar: [_kurs],
        ses: ses,
      );
      kap.read(yonlendiriciProvider).push('/radyo');
      await tester.pumpAndSettle();
      expect(find.byKey(ValueKey('radyo-$_kursId.u1')), findsOneWidget);
      await tester.tap(find.byKey(ValueKey('radyo-$_kursId.u1')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('radyo-cumle-0')), findsOneWidget);

      await tester.tap(find.byKey(const ValueKey('radyo-cal')));
      // 4 cümle x 400 ms ara.
      for (var i = 0; i < 12; i++) {
        await tester.pump(const Duration(milliseconds: 500));
      }
      expect(ses.okunanlar.length, 4);
      expect(ses.okunanlar.toSet(), contains('Ich brauche einen Tisch'));
      expect(find.byKey(const ValueKey('radyo-cal')), findsOneWidget);
    });

    testWidgets('etkinlikten çıkınca durum (SRS, XP, hata) değişmez', (
      tester,
    ) async {
      final depo = BellekDepo(baslangic);
      final kap = await uygulamayiAc(tester, depo, kurslar: [_kurs]);
      kap.read(yonlendiriciProvider).push('/radyo/bolum?kurs=$_kursId&unite=0');
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('radyo-etkinlik')));
      await tester.pumpAndSettle();
      // Birkaç soruyu geç: kapat düğmesiyle çıkış durumu bozmamalı.
      await tester.tap(find.byTooltip('Dersten çık'));
      await tester.pumpAndSettle();
      final d = (await depo.yukle());
      expect(d.xp, 50);
      expect(d.kartlar['k#1']!.kutu, 2);
      expect(d.hatalar, isEmpty);
    });

    testWidgets('kod alanında liste boş mesajı gösterir', (tester) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'kod')),
        kurslar: [_kod],
      );
      kap.read(yonlendiriciProvider).push('/radyo');
      await tester.pumpAndSettle();
      expect(find.textContaining('yalnız dil kurslarında'), findsOneWidget);
    });
  });
}
