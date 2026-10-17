// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Kelimeye kişisel not (özellik 26), model ve motor: yaz, güncelle, sil,
/// kırp, 200 karaktere kısalt, 500 not sınırı, JSON gidiş-dönüş, eski JSON
/// (alan yok → boş) ve bozuk girdilerin atlanması; DurumNotifier.notYaz.
library;

import 'dart:convert';

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const kart = 'ingilizce-1.u1.d1#3';

  group('Motor.notYaz', () {
    test('not yazar ve kırpar', () {
      final d = Motor.notYaz(const OgrenciDurumu(), kart, '  kedi = cat  ');
      expect(d.kelimeNotlari, {kart: 'kedi = cat'});
    });

    test('mevcut notu günceller, diğer notlara dokunmaz', () {
      var d = Motor.notYaz(const OgrenciDurumu(), kart, 'eski');
      d = Motor.notYaz(d, 'x.u1.d1#0', 'başka');
      d = Motor.notYaz(d, kart, 'yeni');
      expect(d.kelimeNotlari, {kart: 'yeni', 'x.u1.d1#0': 'başka'});
    });

    test('null, boş ya da yalnız boşluk notu siler', () {
      final d = Motor.notYaz(const OgrenciDurumu(), kart, 'bir şey');
      expect(Motor.notYaz(d, kart, null).kelimeNotlari, isEmpty);
      expect(Motor.notYaz(d, kart, '').kelimeNotlari, isEmpty);
      expect(Motor.notYaz(d, kart, '   ').kelimeNotlari, isEmpty);
    });

    test('olmayan notu silmek durumu değiştirmez', () {
      const d = OgrenciDurumu(xp: 7);
      expect(identical(Motor.notYaz(d, kart, null), d), isTrue);
    });

    test('200 karakterden uzun not kısaltılır', () {
      final uzun = 'a' * 250;
      final d = Motor.notYaz(const OgrenciDurumu(), kart, uzun);
      expect(d.kelimeNotlari[kart]!.length, OgrenciDurumu.notEnCokKarakter);
      expect(d.kelimeNotlari[kart], 'a' * 200);
    });

    test('tam 200 karakter olduğu gibi kalır', () {
      final tam = 'b' * 200;
      final d = Motor.notYaz(const OgrenciDurumu(), kart, tam);
      expect(d.kelimeNotlari[kart], tam);
    });

    test('500 not sınırı: yeni not eklenmez, mevcut not güncellenir', () {
      var d = const OgrenciDurumu();
      for (var i = 0; i < OgrenciDurumu.notEnCok; i++) {
        d = Motor.notYaz(d, 'k.u1.d1#$i', 'not $i');
      }
      expect(d.kelimeNotlari.length, OgrenciDurumu.notEnCok);
      final fazla = Motor.notYaz(d, 'k.u1.d1#999', 'sığmaz');
      expect(fazla.kelimeNotlari.length, OgrenciDurumu.notEnCok);
      expect(fazla.kelimeNotlari.containsKey('k.u1.d1#999'), isFalse);
      final guncel = Motor.notYaz(d, 'k.u1.d1#0', 'güncel');
      expect(guncel.kelimeNotlari['k.u1.d1#0'], 'güncel');
      expect(guncel.kelimeNotlari.length, OgrenciDurumu.notEnCok);
    });

    test('durum değiştirilemez: eski kopya aynı kalır', () {
      final a = Motor.notYaz(const OgrenciDurumu(), kart, 'ilk');
      final b = Motor.notYaz(a, kart, 'ikinci');
      expect(a.kelimeNotlari[kart], 'ilk');
      expect(b.kelimeNotlari[kart], 'ikinci');
      expect(() => a.kelimeNotlari[kart] = 'x', throwsUnsupportedError);
    });
  });

  group('OgrenciDurumu JSON', () {
    test('kelimeNotlari gidiş-dönüşte korunur', () {
      final d = Motor.notYaz(
        const OgrenciDurumu(xp: 5),
        kart,
        'Türkçe "kedi" gibi: cat',
      );
      final geri = OgrenciDurumu.fromJson(jsonDecode(jsonEncode(d.toJson())));
      expect(geri.kelimeNotlari, d.kelimeNotlari);
      expect(geri.xp, 5);
    });

    test('eski JSON (alan yok) → boş not haritası', () {
      final geri = OgrenciDurumu.fromJson({'surum': 1, 'xp': 3});
      expect(geri.kelimeNotlari, isEmpty);
      expect(geri.xp, 3);
    });

    test('bozuk girdiler atlanır: # içermeyen anahtar, metin olmayan değer, '
        'boş metin, 200 üstü metin, Map olmayan alan', () {
      final geri = OgrenciDurumu.fromJson({
        'kelimeNotlari': {
          kart: '  geçerli  ',
          'anahtarsiz': 'x',
          'a.u1.d1#1': 42,
          'a.u1.d1#2': '   ',
          'a.u1.d1#3': 'c' * 201,
          'a.u1.d1#4': 'c' * 200,
        },
      });
      expect(geri.kelimeNotlari, {kart: 'geçerli', 'a.u1.d1#4': 'c' * 200});
      expect(
        OgrenciDurumu.fromJson({'kelimeNotlari': 'liste değil'}).kelimeNotlari,
        isEmpty,
      );
      expect(
        OgrenciDurumu.fromJson({'kelimeNotlari': null}).kelimeNotlari,
        isEmpty,
      );
    });

    test('eski JSON 500 üstü not: en çok 500 okunur', () {
      final ham = {for (var i = 0; i < 600; i++) 'k.u1.d1#$i': 'n$i'};
      final geri = OgrenciDurumu.fromJson({'kelimeNotlari': ham});
      expect(geri.kelimeNotlari.length, OgrenciDurumu.notEnCok);
    });

    test('copyWith notları korur ve değiştirir', () {
      final d = Motor.notYaz(const OgrenciDurumu(), kart, 'n');
      expect(d.copyWith(xp: 9).kelimeNotlari, {kart: 'n'});
      expect(d.copyWith(kelimeNotlari: const {}).kelimeNotlari, isEmpty);
    });
  });

  test('DurumNotifier.notYaz depoya yazar ve siler', () async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    final kap = ProviderContainer(
      overrides: [
        depoProvider.overrideWithValue(depo),
        bugunProvider.overrideWithValue('2026-10-15'),
      ],
    );
    addTearDown(kap.dispose);
    await kap.read(durumProvider.future);
    await kap.read(durumProvider.notifier).notYaz(kart, ' hatırla ');
    expect((await depo.yukle()).kelimeNotlari, {kart: 'hatırla'});
    expect(kap.read(durumProvider).value!.kelimeNotlari[kart], 'hatırla');
    await kap.read(durumProvider.notifier).notYaz(kart, '');
    expect((await depo.yukle()).kelimeNotlari, isEmpty);
  });
}
