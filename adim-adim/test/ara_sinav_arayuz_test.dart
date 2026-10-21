// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Arayüz testi: yolda ünite sonu "Ara sınav" düğmesi (yalnız ünite
/// bitince), kalınca yanlış kartların desteye girmesi ve XP/seri verilmemesi,
/// geçince en iyi puan kaydı, tüm ara sınavlar geçilince "Seviye sertifika
/// sınavı", sertifika ekranı (ad, kurs, puan, tarih) ve eski kayıtta düğme
/// olmaması.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

final Kurs _kurs = Kurs(
  id: 'as-1',
  ad: 'Sınav Kursu A1',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    for (var u = 1; u <= 2; u++)
      Unite(
        id: 'as-1.u$u',
        ad: 'Ünite $u',
        dersler: [
          Ders(
            id: 'as-1.u$u.d1',
            ad: 'Ders $u',
            alistirmalar: [
              for (var i = 0; i < 12; i++)
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

const _bitmis = OgrenciDurumu(
  alan: 'dil',
  ad: 'Ayşe Yılmaz',
  tamamlanan: {'as-1.u1.d1': 1, 'as-1.u2.d1': 1},
);

final _soruDeseni = RegExp(r'^U(\d) S\d+$');

/// [n] soruyu çözer; ilk [dogruSayisi] soru doğru, kalanı yanlış cevaplanır.
Future<void> _coz(WidgetTester tester, int n, int dogruSayisi) async {
  for (var k = 0; k < n; k++) {
    final soru = tester
        .widgetList<Text>(find.byType(Text))
        .map((w) => w.data)
        .whereType<String>()
        .firstWhere(_soruDeseni.hasMatch);
    final dogru = k < dogruSayisi;
    await dokun(tester, find.text(dogru ? 'doğru $soru' : 'yanlış $soru'));
    await dokun(tester, find.text('Kontrol et'));
    await dokun(
      tester,
      find.text(k == n - 1 ? 'Bitir' : (dogru ? 'Devam' : 'Yine de geç')),
    );
  }
}

void main() {
  testWidgets('ünite bitmeden ara sınav düğmesi yok (eski kayıt)', (
    tester,
  ) async {
    final depo = BellekDepo(
      const OgrenciDurumu(alan: 'dil', tamamlanan: {'as-1.u1.d1': 1}),
    );
    await uygulamayiAc(tester, depo, kurslar: [_kurs]);
    expect(find.byKey(const ValueKey('ara-sinav-as-1.u1')), findsOneWidget);
    expect(find.byKey(const ValueKey('ara-sinav-as-1.u2')), findsNothing);
    expect(find.byKey(const ValueKey('sertifika-sinavi-as-1')), findsNothing);
  });

  testWidgets('kalınca: yanlışlar desteye, XP/seri yok; sonra geçince en iyi '
      'puan kaydı', (tester) async {
    final depo = BellekDepo(_bitmis);
    final kap = await uygulamayiAc(tester, depo, kurslar: [_kurs]);
    await dokun(tester, find.byKey(const ValueKey('ara-sinav-as-1.u1')));
    expect(find.text('1/10'), findsOneWidget);

    await _coz(tester, 10, 6);
    expect(find.text('Bu sefer geçemedin'), findsOneWidget);
    expect(find.text('Puan: %60 (6/10)'), findsOneWidget);
    var d = kap.read(durumProvider).value!;
    expect(d.araSinavlar['as-1.u1']!.dogru, 6);
    expect(d.kartlar, hasLength(4));
    expect(d.hatalar, hasLength(4));
    expect(d.xp, 0);
    expect(d.seri, 0);
    expect(d.sertifikalar, isEmpty);
    expect((await depo.yukle()).araSinavlar['as-1.u1']!.dogru, 6);
    expect(find.byKey(const ValueKey('sinav-sertifika')), findsNothing);

    await dokun(tester, find.byKey(const ValueKey('sinav-don')));
    expect(find.text('Ara sınav (en iyi %60)'), findsOneWidget);

    await dokun(tester, find.byKey(const ValueKey('ara-sinav-as-1.u1')));
    await _coz(tester, 10, 8);
    expect(find.text('Sınavı geçtin'), findsOneWidget);
    expect(find.text('En iyi puan: %80 (2026-10-15)'), findsOneWidget);
    d = kap.read(durumProvider).value!;
    expect(d.araSinavlar['as-1.u1']!.dogru, 8);
    expect(d.xp, 0);
    expect(d.seri, 0);
    expect(tester.takeException(), isNull);
  });

  testWidgets('tüm ara sınavlar geçilince sertifika sınavı ve sertifika', (
    tester,
  ) async {
    final depo = BellekDepo(_bitmis);
    final kap = await uygulamayiAc(tester, depo, kurslar: [_kurs]);
    expect(find.byKey(const ValueKey('sertifika-sinavi-as-1')), findsNothing);
    for (final u in ['as-1.u1', 'as-1.u2']) {
      await dokun(tester, find.byKey(ValueKey('ara-sinav-$u')));
      await _coz(tester, 10, 10);
      await dokun(tester, find.byKey(const ValueKey('sinav-don')));
    }
    expect(find.byKey(const ValueKey('sertifika-sinavi-as-1')), findsOneWidget);
    expect(find.byKey(const ValueKey('sertifika-gor-as-1')), findsNothing);

    await dokun(tester, find.byKey(const ValueKey('sertifika-sinavi-as-1')));
    expect(find.text('1/20'), findsOneWidget);
    await _coz(tester, 20, 20);
    expect(find.text('Sınavı geçtin'), findsOneWidget);
    expect(kap.read(durumProvider).value!.sertifikalar['as-1']!.yuzde, 100);

    await dokun(tester, find.byKey(const ValueKey('sinav-sertifika')));
    expect(find.byKey(const ValueKey('sertifika-kart')), findsOneWidget);
    expect(find.text('Ayşe Yılmaz'), findsOneWidget);
    expect(find.text('Sınav Kursu A1'), findsOneWidget);
    expect(find.text('Puan: %100 (20/20)'), findsOneWidget);
    expect(find.text('Tarih: 15.10.2026'), findsOneWidget);
    expect(find.text('Metni kopyala'), findsOneWidget);
    expect(kap.read(durumProvider).value!.xp, 0);

    await dokun(tester, find.byKey(const ValueKey('sertifika-don')));
    expect(find.byKey(const ValueKey('sertifika-gor-as-1')), findsOneWidget);
  });

  testWidgets('sertifika sınavında kalınca sertifika oluşmaz', (tester) async {
    final depo = BellekDepo(
      _bitmis.copyWith(
        araSinavlar: {
          'as-1.u1': SinavSonucu(dogru: 10, toplam: 10, gun: '2026-10-01'),
          'as-1.u2': SinavSonucu(dogru: 7, toplam: 10, gun: '2026-10-01'),
        },
      ),
    );
    final kap = await uygulamayiAc(tester, depo, kurslar: [_kurs]);
    await dokun(tester, find.byKey(const ValueKey('sertifika-sinavi-as-1')));
    await _coz(tester, 20, 15);
    expect(find.text('Bu sefer geçemedin'), findsOneWidget);
    expect(find.byKey(const ValueKey('sinav-sertifika')), findsNothing);
    final d = kap.read(durumProvider).value!;
    expect(d.sertifikalar['as-1']!.dogru, 15);
    expect(d.kartlar, hasLength(5));
    await dokun(tester, find.byKey(const ValueKey('sinav-don')));
    expect(find.byKey(const ValueKey('sertifika-gor-as-1')), findsNothing);
  });
}
