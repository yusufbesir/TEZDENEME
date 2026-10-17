/// `Motor.kartEkle` ve `DurumNotifier.kartEkle` testleri: yeni kart en az
/// yarı ömürle bugüne eklenir, tekrar bekleyenlere düşer, var olan karta
/// dokunulmaz, depoya yazılır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const bugun = '2026-10-15';
  const kartId = 'sahte-1.u1.d1#4';

  group('Motor.kartEkle', () {
    test('yeni kart en az yarı ömürle bugüne eklenir ve tekrar bekler', () {
      final d = Motor.kartEkle(const OgrenciDurumu(), kartId, bugun);
      final k = d.kartlar[kartId];
      expect(k, isNotNull);
      expect(k!.yariOmurGun, Kart.enAzYariOmur);
      expect(k.kutu, Kart.kutuHesapla(Kart.enAzYariOmur));
      expect(k.sonraki, bugun);
      expect(k.sonCevap, isNull);
      expect(Motor.tekrarBekleyen(d, bugun), contains(kartId));
    });

    test('var olan karta dokunmaz', () {
      const eski = Kart(kutu: 4, sonraki: '2026-12-01', yariOmurGun: 12);
      const d = OgrenciDurumu(kartlar: {kartId: eski});
      final sonuc = Motor.kartEkle(d, kartId, bugun);
      expect(identical(sonuc, d), isTrue);
      expect(sonuc.kartlar[kartId], same(eski));
    });

    test('diğer kartları ve alanları korur', () {
      const d = OgrenciDurumu(
        alan: 'dil',
        xp: 42,
        kartlar: {'a#0': Kart(kutu: 1, sonraki: '2026-10-20')},
      );
      final sonuc = Motor.kartEkle(d, kartId, bugun);
      expect(sonuc.kartlar.length, 2);
      expect(sonuc.kartlar['a#0']!.sonraki, '2026-10-20');
      expect(sonuc.xp, 42);
      expect(sonuc.alan, 'dil');
    });
  });

  group('DurumNotifier.kartEkle', () {
    test('depoya yazar; ikinci çağrı değiştirmez', () async {
      final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
      final kap = ProviderContainer(
        overrides: [
          depoProvider.overrideWithValue(depo),
          bugunProvider.overrideWithValue(bugun),
        ],
      );
      addTearDown(kap.dispose);
      await kap.read(durumProvider.future);
      final n = kap.read(durumProvider.notifier);

      await n.kartEkle(kartId);
      var d = await depo.yukle();
      expect(d.kartlar[kartId]?.sonraki, bugun);
      expect(d.kartlar[kartId]?.yariOmurGun, Kart.enAzYariOmur);

      await n.kartIsle(kartId, true);
      await n.kartEkle(kartId);
      d = await depo.yukle();
      expect(d.kartlar[kartId]?.sonCevap, isTrue);
      expect(d.kartlar[kartId]?.yariOmurGun, Kart.enAzYariOmur * 2);
      expect(kap.read(kayitHatasiProvider), isNull);
    });
  });
}
