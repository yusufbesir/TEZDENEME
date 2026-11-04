// Sahibi Yusuf (yusufbesir), yazan: [Claude#cekim-turu]. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla.

/// Çekim turu: saf motor (yalnız yanlışlar, en çok 5, geçersiz/yinelenen atlanır,
/// rota) ve ders sonu özetinde tek düğme (yalnız yanlış varsa; kartlar değişmez).
library;

import 'package:adim_adim/bilesenler/alistirma_oturumu.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/cekim_turu.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

final Ders _ders = Ders(
  id: 'ck.u1.d1',
  ad: 'Ders Çekim',
  alistirmalar: [
    for (var i = 0; i < 8; i++)
      Secim(soru: 'Soru $i', secenekler: ['yanlış$i', 'doğru$i'], dogru: 1),
  ],
);

final Kurs _kurs = Kurs(
  id: 'ck',
  ad: 'Çekim Kursu',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(id: 'ck.u1', ad: 'Ünite', dersler: [_ders]),
  ],
);

Future<void> _kontrolVeDevam(WidgetTester tester, {bool son = false}) async {
  await dokun(tester, find.text('Kontrol et'));
  await dokun(tester, find.text(son ? 'Bitir' : 'Devam'));
}

void main() {
  group('CekimTuru.sec', () {
    test('yalnız yanlışlar, verilen sırayla; boşluk doldurulmaz', () {
      final s = CekimTuru.sec(_ders, [3, 1]);
      expect(
        [for (final o in s) o.kartId],
        [_ders.kartKimligi(3), _ders.kartKimligi(1)],
      );
    });

    test('en çok 5; geçersiz ve yinelenenler atlanır', () {
      final s = CekimTuru.sec(_ders, [0, 0, -1, 99, 1, 2, 3, 4, 5, 6]);
      expect(s, hasLength(5));
      expect(s.map((o) => o.kartId), [
        for (final i in [0, 1, 2, 3, 4]) _ders.kartKimligi(i),
      ]);
    });

    test('yanlış yoksa boş; soruSayisi 0', () {
      expect(CekimTuru.sec(_ders, const []), isEmpty);
      expect(CekimTuru.soruSayisi(_ders, const [99]), 0);
      expect(CekimTuru.soruSayisi(_ders, [1, 2]), 2);
    });

    test('rota', () {
      expect(
        CekimTuru.rota('ck.u1.d1', [2, 5]),
        '/mikro?mod=cekim&ders=ck.u1.d1&yanlis=2,5',
      );
    });
  });

  testWidgets(
    'ders sonunda yanlış varsa çekim turu düğmesi; kartlar değişmez',
    (tester) async {
      final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
      final kap = await uygulamayiAc(tester, depo, kurslar: [_kurs]);
      await dokun(tester, find.textContaining('Ders Çekim'));

      // Soru 0 doğru, Soru 1 yanlış, kalanı doğru.
      await dokun(tester, find.text('doğru0'));
      await _kontrolVeDevam(tester);
      await dokun(tester, find.text('yanlış1'));
      await dokun(tester, find.text('Kontrol et'));
      await dokun(tester, find.text('Yine de geç'));
      for (var i = 2; i < 8; i++) {
        await dokun(tester, find.text('doğru$i'));
        await _kontrolVeDevam(tester, son: i == 7);
      }
      expect(find.text('Ders tamamlandı'), findsOneWidget);
      expect(find.text('5 soruluk çekim turu'), findsOneWidget);

      final onceki = kap.read(durumProvider).value!;
      await dokun(tester, find.text('5 soruluk çekim turu'));
      expect(find.byType(AlistirmaOturumu), findsOneWidget);
      expect(find.text('Soru 1'), findsOneWidget);
      expect(find.text('1/1'), findsOneWidget);
      await dokun(tester, find.text('doğru1'));
      await dokun(tester, find.text('Kontrol et'));
      await dokun(tester, find.text('Bitir'));

      expect(find.text('Çekim turu tamamlandı'), findsOneWidget);
      final sonra = kap.read(durumProvider).value!;
      expect(sonra.kartlar, onceki.kartlar); // SRS değişmedi
      expect(sonra.tamamlanan, onceki.tamamlanan);
      expect(sonra.xp, onceki.xp + 1); // yalnız doğru başına 1 (quiz akışı)
      expect(tester.takeException(), isNull);
    },
  );

  testWidgets('hiç yanlış yoksa çekim turu düğmesi yok', (tester) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    await uygulamayiAc(tester, depo, kurslar: [_kurs]);
    await dokun(tester, find.textContaining('Ders Çekim'));
    for (var i = 0; i < 8; i++) {
      await dokun(tester, find.text('doğru$i'));
      await _kontrolVeDevam(tester, son: i == 7);
    }
    expect(find.text('Ders tamamlandı'), findsOneWidget);
    expect(find.text('5 soruluk çekim turu'), findsNothing);
  });
}
