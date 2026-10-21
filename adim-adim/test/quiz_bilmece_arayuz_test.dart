// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Arayüz testleri: ders sonu özetinde "Karışık tekrar" ve "Kısa quiz (3 soru)"
/// düğmeleri birlikte görünür ve 480x600 @1,5 ölçekte taşmaz; quiz yanlışları
/// önce sorar, kartları değiştirmez, küçük XP ve 'quiz' günlük kaydı yazar;
/// ana sayfadaki "Günün bilmecesi" kartı cevaplanır, geri bildirim verir,
/// aynı gün ikinci cevabı kabul etmez ve kod alanında da görünür.
library;

import 'package:adim_adim/bilesenler/alistirma_oturumu.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

final _bilmece = find.byKey(const ValueKey('gunun-bilmecesi'));

/// İki üniteli kurs: ilk ünite tek Secim dersi, ikinci ünite 4 Secim'lik tek
/// ders (ünite sonu → "Karışık tekrar" da çıkar).
final Kurs _ikiUnite = Kurs(
  id: 'qk-1',
  ad: 'Quiz Kursu',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'qk-1.u1',
      ad: 'Birinci Ünite',
      dersler: const [
        Ders(
          id: 'qk-1.u1.d1',
          ad: 'Ders Önce',
          alistirmalar: [
            Secim(soru: 'Önceki soru', secenekler: ['evet', 'hayır'], dogru: 0),
          ],
        ),
      ],
    ),
    Unite(
      id: 'qk-1.u2',
      ad: 'İkinci Ünite',
      dersler: [
        Ders(
          id: 'qk-1.u2.d1',
          ad: 'Ders Son',
          alistirmalar: [
            for (var i = 0; i < 4; i++)
              Secim(
                soru: 'Soru $i',
                secenekler: ['yanlış$i', 'doğru$i'],
                dogru: 1,
                aciklama: 'Açıklama $i',
              ),
          ],
        ),
      ],
    ),
  ],
);

Future<void> _kontrolVeDevam(WidgetTester tester, {bool son = false}) async {
  await dokun(tester, find.text('Kontrol et'));
  await dokun(tester, find.text(son ? 'Bitir' : 'Devam'));
}

void main() {
  testWidgets('ders sonunda iki ek düğme; quiz yanlışları önce sorar, '
      'kartları değiştirmez, XP ve quiz kaydı yazar', (tester) async {
    final depo = BellekDepo(
      const OgrenciDurumu(alan: 'dil', tamamlanan: {'qk-1.u1.d1': 1}),
    );
    final kap = await uygulamayiAc(tester, depo, kurslar: [_ikiUnite]);
    await dokun(tester, find.textContaining('Ders Son'));

    // Soru 0 doğru, Soru 1 yanlış, Soru 2 doğru, Soru 3 yanlış.
    await dokun(tester, find.text('doğru0'));
    await _kontrolVeDevam(tester);
    await dokun(tester, find.text('yanlış1'));
    await dokun(tester, find.text('Kontrol et'));
    await dokun(tester, find.text('Yine de geç'));
    await dokun(tester, find.text('doğru2'));
    await _kontrolVeDevam(tester);
    await dokun(tester, find.text('yanlış3'));
    await dokun(tester, find.text('Kontrol et'));
    await dokun(tester, find.text('Bitir'));

    expect(find.text('Ders tamamlandı'), findsOneWidget);
    expect(find.text('Karışık tekrar (5 soru)'), findsOneWidget);
    expect(find.text('Kısa quiz (3 soru)'), findsOneWidget);
    expect(tester.takeException(), isNull);

    final onceki = kap.read(durumProvider).value!;
    expect(onceki.kartlar, hasLength(4));
    final xpOnce = onceki.xp;

    await dokun(tester, find.text('Kısa quiz (3 soru)'));
    expect(find.byType(AlistirmaOturumu), findsOneWidget);
    // Yanlışlar önce: Soru 1, Soru 3; sonra indeks sırasıyla Soru 0.
    expect(find.text('Soru 1'), findsOneWidget);
    expect(find.text('1/3'), findsOneWidget);
    await dokun(tester, find.text('doğru1'));
    await _kontrolVeDevam(tester);
    expect(find.text('Soru 3'), findsOneWidget);
    await dokun(tester, find.text('doğru3'));
    await _kontrolVeDevam(tester);
    expect(find.text('Soru 0'), findsOneWidget);
    await dokun(tester, find.text('yanlış0'));
    await dokun(tester, find.text('Kontrol et'));
    await dokun(tester, find.text('Bitir'));

    expect(find.text('Quiz tamamlandı'), findsOneWidget);
    expect(find.text('+2'), findsOneWidget);
    expect(find.text('Kısa quiz (3 soru)'), findsNothing);
    final sonra = kap.read(durumProvider).value!;
    expect(sonra.xp, xpOnce + 2);
    expect(sonra.kartlar, onceki.kartlar); // SRS değişmedi
    expect(sonra.tamamlanan, onceki.tamamlanan);
    expect(sonra.gunluk.last.tur, GunlukKayit.turQuiz);
    expect(sonra.gunluk.last.id, 'qk-1.u2.d1');
    expect(sonra.gunluk.last.dogru, 2);
    expect(sonra.gunluk.last.toplam, 3);
    expect((await depo.yukle()).gunluk.last.tur, GunlukKayit.turQuiz);

    await dokun(tester, find.text('Yola dön'));
    expect(find.text('Ders tamamlandı'), findsOneWidget);
  });

  testWidgets('480x600 @1,5: özette iki ek düğme taşmaz', (tester) async {
    final depo = BellekDepo(
      const OgrenciDurumu(alan: 'dil', tamamlanan: {'qk-1.u1.d1': 1}),
    );
    await uygulamayiAc(
      tester,
      depo,
      kurslar: [_ikiUnite],
      boyut: const Size(480, 600),
      metinOlcegi: 1.5,
    );
    final dersSon = find.textContaining('Ders Son');
    await tester.scrollUntilVisible(dersSon, 200);
    await tester.pumpAndSettle();
    await dokun(tester, dersSon);
    for (var i = 0; i < 4; i++) {
      await dokun(tester, find.text('doğru$i'));
      await _kontrolVeDevam(tester, son: i == 3);
    }
    expect(find.text('Ders tamamlandı'), findsOneWidget);
    expect(find.text('Karışık tekrar (5 soru)'), findsOneWidget);
    expect(find.byKey(const Key('ozet-ek2')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets(
    'quiz: ders 3\'ten az alıştırmaysa hepsi; yanlış yoksa ilk sıradan',
    (tester) async {
      await uygulamayiAc(tester, null, kurslar: [_ikiUnite]);
      await dokun(tester, find.textContaining('Ders Önce'));
      await dokun(tester, find.text('evet'));
      await dokun(tester, find.text('Kontrol et'));
      await dokun(tester, find.text('Bitir'));
      // İlk ünitede önceki ünite yok: karışık tekrar yok, quiz var.
      expect(find.text('Karışık tekrar (5 soru)'), findsNothing);
      await dokun(tester, find.text('Kısa quiz (3 soru)'));
      expect(find.text('1/1'), findsOneWidget);
      expect(find.text('Önceki soru'), findsOneWidget);
    },
  );

  testWidgets('günün bilmecesi: cevaplanır, geri bildirim, +2 XP, '
      'aynı gün ikinci cevap yok, depoya yazılır', (tester) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    final kap = await uygulamayiAc(tester, depo);
    expect(_bilmece, findsOneWidget);
    expect(find.text('Günün bilmecesi'), findsOneWidget);
    final secilen = Motor.bilmeceSec([sahteKurs], '2026-10-15')!;
    expect(
      find.descendant(of: _bilmece, matching: find.text(secilen.secim.soru)),
      findsOneWidget,
    );
    expect(find.byKey(const ValueKey('bilmece-sonuc')), findsNothing);

    // Doğru seçenek: 'dört'.
    await dokun(
      tester,
      find.byKey(ValueKey('bilmece-secenek-${secilen.secim.dogru}')),
    );
    expect(find.textContaining('Doğru! +2 XP'), findsOneWidget);
    var d = kap.read(durumProvider).value!;
    expect(d.xp, 2);
    expect(d.bilmece?.gun, '2026-10-15');
    expect(d.bilmece?.dogru, isTrue);
    expect(d.gunluk.single.tur, GunlukKayit.turBilmece);
    expect((await depo.yukle()).bilmece?.dogru, isTrue);

    // Düğmeler pasif: tekrar dokunmak durumu değiştirmez.
    for (var i = 0; i < secilen.secim.secenekler.length; i++) {
      final b = tester.widget<OutlinedButton>(
        find.byKey(ValueKey('bilmece-secenek-$i')),
      );
      expect(b.onPressed, isNull);
    }
    await tester.tap(find.byKey(const ValueKey('bilmece-secenek-0')));
    await tester.pumpAndSettle();
    d = kap.read(durumProvider).value!;
    expect(d.xp, 2);
    expect(d.gunluk, hasLength(1));
    expect(tester.takeException(), isNull);
  });

  testWidgets('bilmece yanlış: XP yok, doğru cevap gösterilir', (tester) async {
    final kap = await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'dil')),
    );
    final secilen = Motor.bilmeceSec([sahteKurs], '2026-10-15')!;
    final yanlis = secilen.secim.dogru == 0 ? 1 : 0;
    await dokun(tester, find.byKey(ValueKey('bilmece-secenek-$yanlis')));
    expect(
      find.textContaining(
        'Yanlış. Doğru cevap: ${secilen.secim.secenekler[secilen.secim.dogru]}',
      ),
      findsOneWidget,
    );
    final d = kap.read(durumProvider).value!;
    expect(d.xp, 0);
    expect(d.bilmece?.dogru, isFalse);
    expect(d.gunluk.single.tur, GunlukKayit.turBilmece);
    expect(d.gunluk.single.xp, 0);
  });

  testWidgets(
    'bugün cevaplanmış kayıtla açılış: sonuç görünür, düğmeler pasif',
    (tester) async {
      await uygulamayiAc(
        tester,
        BellekDepo(
          const OgrenciDurumu(
            alan: 'dil',
            bilmece: BilmeceDurumu(gun: '2026-10-15', dogru: true),
          ),
        ),
      );
      expect(find.textContaining('Doğru! +2 XP'), findsOneWidget);
      expect(
        tester
            .widget<OutlinedButton>(
              find.byKey(const ValueKey('bilmece-secenek-0')),
            )
            .onPressed,
        isNull,
      );
    },
  );

  testWidgets('eski günün cevabı bugünü kilitlemez', (tester) async {
    await uygulamayiAc(
      tester,
      BellekDepo(
        const OgrenciDurumu(
          alan: 'dil',
          bilmece: BilmeceDurumu(gun: '2026-10-14', dogru: false),
        ),
      ),
    );
    expect(find.byKey(const ValueKey('bilmece-sonuc')), findsNothing);
    expect(
      tester
          .widget<OutlinedButton>(
            find.byKey(const ValueKey('bilmece-secenek-0')),
          )
          .onPressed,
      isNotNull,
    );
  });

  testWidgets('kod alanında da bilmece kartı var; Secim yoksa yok', (
    tester,
  ) async {
    await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'kod')),
      kurslar: [sahteKurs, sahteKodKurs],
    );
    expect(find.byKey(const ValueKey('gunun-kelimesi')), findsNothing);
    expect(_bilmece, findsOneWidget);
    expect(find.text('HTML neyin kısaltmasıdır?'), findsOneWidget);

    final secimsiz = Kurs(
      id: 'ss-1',
      ad: 'Seçimsiz',
      aciklama: '',
      alan: KursAlani.kod,
      uniteler: const [
        Unite(
          id: 'ss-1.u1',
          ad: 'Ü',
          dersler: [
            Ders(
              id: 'ss-1.u1.d1',
              ad: 'D',
              alistirmalar: [
                Yaz(soru: 'yaz', cevaplar: ['x']),
              ],
            ),
          ],
        ),
      ],
    );
    await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'kod')),
      kurslar: [secimsiz],
    );
    expect(_bilmece, findsNothing);
  });

  testWidgets('480x600 @1,5: bilmece kartı cevaplanmış ve cevaplanmamış '
      'durumda taşmaz', (tester) async {
    await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'dil', sonDersId: sahteDers1)),
      boyut: const Size(480, 600),
      metinOlcegi: 1.5,
    );
    expect(tester.takeException(), isNull);
    await tester.scrollUntilVisible(_bilmece, 200);
    await tester.pumpAndSettle();
    expect(_bilmece, findsOneWidget);
    expect(tester.takeException(), isNull);
    await dokun(tester, find.byKey(const ValueKey('bilmece-secenek-0')));
    expect(find.byKey(const ValueKey('bilmece-sonuc')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
