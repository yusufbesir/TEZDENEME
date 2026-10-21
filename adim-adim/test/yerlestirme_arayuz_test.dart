// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Arayüz testi: yoldaki "Seviyemi belirle" düğmesi, sınavın akışı, sonuç
/// ekranı (atlanan ünite, önerilen başlangıç), atlananların yolda açık
/// görünmesi ve depoya yazılması; tüm üniteler bitmişse düğmenin gizlenmesi.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

final Kurs _kurs = Kurs(
  id: 'yk-1',
  ad: 'Yerleştirme Kursu',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    for (var u = 1; u <= 3; u++)
      Unite(
        id: 'yk-1.u$u',
        ad: 'Ünite $u',
        dersler: [
          Ders(
            id: 'yk-1.u$u.d1',
            ad: 'Ders $u',
            alistirmalar: [
              for (var i = 0; i < 5; i++)
                Secim(
                  soru: 'U$u S$i',
                  secenekler: ['yanlış U$u S$i', 'doğru U$u S$i'],
                  dogru: 1,
                ),
            ],
          ),
        ],
      ),
  ],
);

final _soruDeseni = RegExp(r'^U(\d) S\d$');

/// 15 soruyu çözer: [dogruUniteler] içindeki ünitelerde doğru, diğerlerinde yanlış.
Future<void> _coz(WidgetTester tester, Set<int> dogruUniteler) async {
  for (var n = 0; n < 15; n++) {
    final soru = tester
        .widgetList<Text>(find.byType(Text))
        .map((w) => w.data)
        .whereType<String>()
        .firstWhere(_soruDeseni.hasMatch);
    final unite = int.parse(_soruDeseni.firstMatch(soru)!.group(1)!);
    final dogru = dogruUniteler.contains(unite);
    await dokun(tester, find.text(dogru ? 'doğru $soru' : 'yanlış $soru'));
    await dokun(tester, find.text('Kontrol et'));
    final son = n == 14;
    await dokun(
      tester,
      find.text(son ? 'Bitir' : (dogru ? 'Devam' : 'Yine de geç')),
    );
  }
}

void main() {
  testWidgets('sınav: ilk ünite geçilir, ikinci kalır, üçüncü atlanmaz; '
      'XP/seri/kart değişmez; yolda açık görünür', (tester) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    final kap = await uygulamayiAc(tester, depo, kurslar: [_kurs]);
    await dokun(tester, find.byKey(const ValueKey('yerlestirme-yk-1')));
    expect(find.text('1/15'), findsOneWidget);

    await _coz(tester, {1, 3});

    expect(find.text('Seviye belirlendi'), findsOneWidget);
    expect(find.text('Atlanan ünite: 1'), findsOneWidget);
    expect(find.text('Önerilen başlangıç: Ders 2'), findsOneWidget);
    expect(tester.takeException(), isNull);

    final d = kap.read(durumProvider).value!;
    expect(d.atlananDersler, {'yk-1.u1.d1'});
    expect(d.xp, 0);
    expect(d.seri, 0);
    expect(d.kartlar, isEmpty);
    expect(d.tamamlanan, isEmpty);
    expect((await depo.yukle()).atlananDersler, {'yk-1.u1.d1'});

    await dokun(tester, find.byKey(const ValueKey('yerlestirme-don')));
    // Ünite 1 tamam, sıradaki Ders 2; Ders 3 hâlâ kilitli.
    expect(find.textContaining('Kilitli · önceki dersi bitir'), findsOneWidget);
    expect(find.text('Başla'), findsOneWidget);
    expect(find.byKey(const ValueKey('yerlestirme-yk-1')), findsOneWidget);
  });

  testWidgets('hepsi doğru: üç ünite atlanır, düğme kaybolur', (tester) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    final kap = await uygulamayiAc(tester, depo, kurslar: [_kurs]);
    await dokun(tester, find.byKey(const ValueKey('yerlestirme-yk-1')));
    await _coz(tester, {1, 2, 3});
    expect(find.text('Atlanan ünite: 3'), findsOneWidget);
    expect(find.text('Kursun tüm dersleri tamam.'), findsOneWidget);
    expect(kap.read(durumProvider).value!.atlananDersler, hasLength(3));
    await dokun(tester, find.byKey(const ValueKey('yerlestirme-don')));
    expect(find.byKey(const ValueKey('yerlestirme-yk-1')), findsNothing);
  });

  testWidgets('çıkışta onay; çıkılırsa hiçbir şey atlanmaz', (tester) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    final kap = await uygulamayiAc(tester, depo, kurslar: [_kurs]);
    await dokun(tester, find.byKey(const ValueKey('yerlestirme-yk-1')));
    await dokun(tester, find.byIcon(Icons.close));
    expect(find.text('Sınavdan çıkılsın mı?'), findsOneWidget);
    await dokun(tester, find.text('Çık'));
    expect(find.text('Seviyemi belirle'), findsOneWidget);
    expect(kap.read(durumProvider).value!.atlananDersler, isEmpty);
  });

  testWidgets('tüm dersler bitmişse "Seviyemi belirle" gösterilmez', (
    tester,
  ) async {
    final depo = BellekDepo(
      const OgrenciDurumu(
        alan: 'dil',
        tamamlanan: {'yk-1.u1.d1': 1},
        atlananDersler: {'yk-1.u2.d1', 'yk-1.u3.d1'},
      ),
    );
    await uygulamayiAc(tester, depo, kurslar: [_kurs]);
    expect(find.byKey(const ValueKey('yerlestirme-yk-1')), findsNothing);
  });
}
