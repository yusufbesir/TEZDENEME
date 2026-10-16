/// Arayüz testleri: gezinme, Yol, Tekrar, Profil, Ayarlar ve düzen akışları.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden kod
/// değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Ortak yardımcılar test/arayuz_yardimci.dart içindedir.
library;

import 'package:adim_adim/bilesenler/profil_karti.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

/// Profil sekmesine geçip sağ üstteki dişliyle Ayarlar'ı açar.
Future<void> ayarlariAc(WidgetTester tester) async {
  await dokun(
    tester,
    find.descendant(
      of: find.byType(NavigationBar),
      matching: find.text('Profil'),
    ),
  );
  await dokun(tester, find.byTooltip('Ayarlar'));
}

Future<void> kontrolEtDogru(WidgetTester tester, {bool son = false}) async {
  await dokun(tester, find.text('Kontrol et'));
  expect(find.text('Doğru!'), findsOneWidget);
  await dokun(tester, find.text(son ? 'Bitir' : 'Devam'));
}

void main() {
  testWidgets('ders akışı: doğru cevaplar -> geri bildirim -> özet', (
    tester,
  ) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    final ses = SahteSes();
    final kap = await uygulamayiAc(tester, depo, ses: ses);

    expect(find.text('Sahte Ünite'), findsOneWidget);
    expect(find.textContaining('Sıradaki ders'), findsOneWidget);
    expect(find.textContaining('Kilitli'), findsOneWidget);

    await dokun(tester, find.textContaining('Ders Bir'));

    // Secim
    await dokun(tester, find.text('dört'));
    await kontrolEtDogru(tester);
    // Bosluk
    await dokun(tester, find.text('am'));
    await kontrolEtDogru(tester);
    // Yaz
    await tester.enterText(find.byType(TextField), '  Hello! ');
    await tester.pump();
    await kontrolEtDogru(tester);
    // Sirala
    for (final k in ['I', 'am', 'happy']) {
      await dokun(tester, find.text(k));
    }
    await kontrolEtDogru(tester);
    // Eslestir
    for (final c in [('cat', 'kedi'), ('dog', 'köpek'), ('bird', 'kuş')]) {
      await dokun(tester, find.text(c.$1));
      await dokun(tester, find.text(c.$2));
    }
    await kontrolEtDogru(tester);
    // Dinle
    await dokun(tester, find.byIcon(Icons.volume_up));
    expect(ses.okunanlar, ['Good morning']);
    await dokun(tester, find.text('Good morning'));
    await kontrolEtDogru(tester);
    // Kod
    await dokun(tester, find.text('Merhaba'));
    await kontrolEtDogru(tester, son: true);

    expect(find.text('Ders tamamlandı'), findsOneWidget);
    expect(find.text('7/7'), findsOneWidget);
    expect(find.text('+29'), findsOneWidget); // 10 + 7*2 + 5 tam puan

    final d = kap.read(durumProvider).value!;
    expect(d.xp, 29);
    expect(d.seri, 1);
    expect(d.tamamlanan[sahteDers1], 1);
    expect(d.kartlar.length, 7);
    expect((await depo.yukle()).xp, 29);

    await dokun(tester, find.text('Yola dön'));
    expect(find.textContaining('Tamamlandı'), findsOneWidget);
  });

  testWidgets('yanlış cevap: hata bandı, doğru cevap ve açıklama gösterilir', (
    tester,
  ) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    await uygulamayiAc(tester, depo);
    await dokun(tester, find.textContaining('Ders Bir'));
    await dokun(tester, find.text('beş'));
    await dokun(tester, find.text('Kontrol et'));
    expect(find.text('Yanlış'), findsOneWidget);
    expect(find.textContaining('Doğru cevap: dört'), findsOneWidget);
    expect(find.byIcon(Icons.cancel), findsWidgets);
  });

  testWidgets('ayar değişikliği kalıcı olur ve sıfırlama onay ister', (
    tester,
  ) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    final bildirim = SahteBildirim();
    await uygulamayiAc(tester, depo, bildirim: bildirim);

    await ayarlariAc(tester);
    await dokun(tester, find.text('Koyu'));
    expect((await depo.yukle()).koyuTema, true);

    await dokun(tester, find.byType(SwitchListTile).first);
    expect((await depo.yukle()).sesAcik, false);

    await dokun(tester, find.byType(SwitchListTile).last);
    expect((await depo.yukle()).hatirlatmaSaati, '20:00');
    expect(bildirim.cagrilar, ['kur:20:00']);

    // Sıfırla: önce vazgeç, sonra onayla.
    await dokun(tester, find.text('Verileri sıfırla'));
    expect(find.text('Tüm veriler silinsin mi?'), findsOneWidget);
    await dokun(tester, find.text('Vazgeç'));
    expect((await depo.yukle()).koyuTema, true);

    await dokun(tester, find.text('Verileri sıfırla'));
    await dokun(tester, find.text('Sıfırla'));
    final sifir = await depo.yukle();
    expect(sifir.koyuTema, isNull);
    expect(sifir.sesAcik, true);
  });

  testWidgets('geniş ekranda iki sütun: yol + profil kartı, yan ray', (
    tester,
  ) async {
    await uygulamayiAc(tester, null, boyut: const Size(1200, 900));
    expect(find.byType(NavigationRail), findsOneWidget);
    expect(
      tester.widget<NavigationRail>(find.byType(NavigationRail)).destinations,
      hasLength(4),
    );
    expect(find.byType(NavigationBar), findsNothing);
    expect(find.byType(ProfilKarti), findsOneWidget);
    expect(find.text('Sahte Ünite'), findsOneWidget);
  });

  testWidgets('dar ekranda alt gezinme çubuğu', (tester) async {
    await uygulamayiAc(tester, null, boyut: const Size(400, 800));
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationRail), findsNothing);
    expect(find.byType(ProfilKarti), findsNothing);
  });

  testWidgets('seri kopmuşsa ekranda 0 görünür', (tester) async {
    final depo = BellekDepo(
      const OgrenciDurumu(
        xp: 50,
        seri: 5,
        enSeri: 5,
        sonGun: '2026-10-01',
        alan: 'dil',
      ),
    );
    await uygulamayiAc(tester, depo, boyut: const Size(1200, 900));
    expect(find.text('0 gün seri'), findsWidgets);
    expect(find.text('5 gün seri'), findsNothing);
  });

  testWidgets('bildirim izni reddedilince anahtar kapanır ve uyarı çıkar', (
    tester,
  ) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    final bildirim = SahteBildirim()..izin = false;
    await uygulamayiAc(tester, depo, bildirim: bildirim);
    await ayarlariAc(tester);
    await dokun(tester, find.byType(SwitchListTile).last);
    expect(find.text('Bildirim izni verilmedi'), findsOneWidget);
    expect((await depo.yukle()).hatirlatmaSaati, isNull);
    expect(
      tester.widget<SwitchListTile>(find.byType(SwitchListTile).last).value,
      false,
    );
  });

  testWidgets('alan seçilmemişse Alan seç ekranı açılır; Programlama yalnız '
      'kod kurslarını listeler', (tester) async {
    final kap = await uygulamayiAc(
      tester,
      BellekDepo(),
      kurslar: [sahteKurs, sahteKodKurs],
    );
    expect(find.text('Ne öğrenmek istiyorsun?'), findsOneWidget);
    expect(find.text('İngilizce'), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);

    await dokun(tester, find.text('Programlama'));
    expect(kap.read(durumProvider).value!.alan, 'kod');
    expect(find.text('Sahte Kod Kursu'), findsOneWidget);
    expect(find.text('Sahte Kurs'), findsNothing);
    expect(find.byType(NavigationBar), findsOneWidget);
  });

  testWidgets('dil alanında kod kursu adı görünmez', (tester) async {
    await uygulamayiAc(tester, null, kurslar: [sahteKurs, sahteKodKurs]);
    expect(find.text('Sahte Kurs'), findsOneWidget);
    expect(find.text('Sahte Kod Kursu'), findsNothing);
  });

  testWidgets('2 dakikalık ders: özet, XP artar, tamamlanan değişmez', (
    tester,
  ) async {
    final mikroKurs = Kurs(
      id: 'mikro-1',
      ad: 'Mikro Kurs',
      aciklama: 'Yalnız seçim sorulu kurs.',
      alan: KursAlani.dil,
      uniteler: [
        Unite(
          id: 'mikro-1.u1',
          ad: 'Mikro Ünite',
          dersler: [
            Ders(
              id: 'mikro-1.u1.d1',
              ad: 'Mikro Ders',
              alistirmalar: [
                for (var i = 0; i < 5; i++)
                  Secim(
                    soru: 'Soru $i',
                    secenekler: ['yanlış$i', 'doğru$i'],
                    dogru: 1,
                  ),
              ],
            ),
          ],
        ),
      ],
    );
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    final kap = await uygulamayiAc(tester, depo, kurslar: [mikroKurs]);

    await dokun(tester, find.text('2 dakikalık ders'));
    final dogruSik = find.byWidgetPredicate(
      (w) => w is Text && RegExp(r'^doğru\d$').hasMatch(w.data ?? ''),
    );
    for (var i = 0; i < 5; i++) {
      await dokun(tester, dogruSik);
      await kontrolEtDogru(tester, son: i == 4);
    }

    expect(find.text('Mikro ders tamamlandı'), findsOneWidget);
    expect(find.text('+18'), findsOneWidget); // 5 + 5*2 + 3 tam puan
    final d = kap.read(durumProvider).value!;
    expect(d.xp, 18);
    expect(d.tamamlanan, isEmpty);
    expect(d.kartlar.length, 5);

    await dokun(tester, find.text('Yola dön'));
    expect(find.textContaining('Mikro Ders'), findsOneWidget);
  });

  testWidgets('alt çubukta 4 hedef var, Ayarlar sekmesi yok', (tester) async {
    await uygulamayiAc(tester, null, boyut: const Size(400, 800));
    final cubuk = find.byType(NavigationBar);
    expect(find.byType(NavigationDestination), findsNWidgets(4));
    for (final ad in ['Yol', 'Yarışma', 'Tekrar', 'Profil']) {
      expect(
        find.descendant(of: cubuk, matching: find.text(ad)),
        findsOneWidget,
      );
    }
    expect(
      find.descendant(of: cubuk, matching: find.text('Ayarlar')),
      findsNothing,
    );
  });

  testWidgets('Tekrar sekmesi rozeti yalnız alan kurslarının bekleyen '
      'kartlarını sayar', (tester) async {
    const gecmis = Kart(kutu: 1, sonraki: '2026-10-14');
    final depo = BellekDepo(
      OgrenciDurumu(
        alan: 'dil',
        kartlar: {
          '$sahteDers1#0': gecmis,
          '$sahteDers1#1': gecmis,
          '$sahteKodDers1#0': gecmis, // kod alanı: sayılmaz
          'yok.ders#0': gecmis, // çözülemeyen kart: sayılmaz
          '$sahteDers2#0': const Kart(kutu: 2, sonraki: '2026-10-20'),
        },
      ),
    );
    await uygulamayiAc(
      tester,
      depo,
      boyut: const Size(400, 800),
      kurslar: [sahteKurs, sahteKodKurs],
    );
    final rozet = find.byType(Badge);
    expect(rozet, findsOneWidget);
    expect(
      find.descendant(of: rozet, matching: find.text('2')),
      findsOneWidget,
    );
  });

  testWidgets('bekleyen kart yoksa Tekrar rozeti görünmez', (tester) async {
    await uygulamayiAc(tester, null, boyut: const Size(400, 800));
    expect(find.byType(Badge), findsNothing);
  });
}
