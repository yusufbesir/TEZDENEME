/// İlk açılış bayrağı (`ilkAcilisTamam`) birim testleri: JSON gidiş-dönüş,
/// eski kayıtta geriye uyumluluk (alan doluysa true, alan yoksa false),
/// copyWith ve DurumNotifier.alanSec / ilkAcilisTamamla.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:convert';

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

void main() {
  group('ilkAcilisTamam modeli', () {
    test('varsayılan false (alan seçilmemiş)', () {
      expect(const OgrenciDurumu().ilkAcilisTamam, isFalse);
    });

    test(
      'alan dolu, bayrak belirtilmemiş: mevcut kullanıcı sayılır (true)',
      () {
        expect(const OgrenciDurumu(alan: 'dil').ilkAcilisTamam, isTrue);
      },
    );

    test('açıkça false yazılmışsa alan dolu olsa da false kalır', () {
      const d = OgrenciDurumu(alan: 'kod', ilkAcilisTamam: false);
      expect(d.ilkAcilisTamam, isFalse);
    });

    test('JSON gidiş-dönüş: true ve false korunur', () {
      for (final v in [true, false]) {
        final d = OgrenciDurumu(alan: 'dil', ilkAcilisTamam: v);
        final j = jsonDecode(jsonEncode(d.toJson()));
        expect(j['ilkAcilisTamam'], v);
        expect(OgrenciDurumu.fromJson(j).ilkAcilisTamam, v);
      }
    });

    test('eski JSON: alan dolu, ilkAcilisTamam yok → true', () {
      final j = const OgrenciDurumu(alan: 'kod', xp: 50).toJson()
        ..remove('ilkAcilisTamam');
      final d = OgrenciDurumu.fromJson(j);
      expect(d.alan, 'kod');
      expect(d.ilkAcilisTamam, isTrue);
    });

    test('eski JSON: alan null, ilkAcilisTamam yok → false', () {
      final j = const OgrenciDurumu(xp: 5).toJson()..remove('ilkAcilisTamam');
      final d = OgrenciDurumu.fromJson(j);
      expect(d.alan, isNull);
      expect(d.ilkAcilisTamam, isFalse);
    });

    test('bozuk değer (string) belirtilmemiş sayılır', () {
      final j = const OgrenciDurumu(alan: 'dil').toJson()
        ..['ilkAcilisTamam'] = 'evet';
      expect(OgrenciDurumu.fromJson(j).ilkAcilisTamam, isTrue);
      final j2 = const OgrenciDurumu().toJson()..['ilkAcilisTamam'] = 1;
      expect(OgrenciDurumu.fromJson(j2).ilkAcilisTamam, isFalse);
    });

    test('copyWith bayrağı taşır ve değiştirir', () {
      const d = OgrenciDurumu(alan: 'dil', ilkAcilisTamam: false);
      expect(d.copyWith(xp: 3).ilkAcilisTamam, isFalse);
      expect(d.copyWith(ilkAcilisTamam: true).ilkAcilisTamam, isTrue);
      // Belirtilmemiş durumda alan seçilince true'ya döner (mevcut davranış).
      expect(
        const OgrenciDurumu().copyWith(alan: 'kod').ilkAcilisTamam,
        isTrue,
      );
    });
  });

  group('DurumNotifier', () {
    late ProviderContainer kap;
    late BellekDepo depo;

    setUp(() {
      depo = BellekDepo();
      kap = ProviderContainer(
        overrides: [
          depoProvider.overrideWithValue(depo),
          bildirimProvider.overrideWithValue(SahteBildirim()),
          bugunProvider.overrideWithValue('2026-10-15'),
        ],
      );
      addTearDown(kap.dispose);
    });

    test('alanSec(ilkAcilisTamam: false) akışı açık tutar', () async {
      await kap.read(durumProvider.future);
      final n = kap.read(durumProvider.notifier);
      final d = await n.alanSec('dil', ilkAcilisTamam: false);
      expect(d.alan, 'dil');
      expect(d.ilkAcilisTamam, isFalse);
      expect((await depo.yukle()).ilkAcilisTamam, isFalse);
    });

    test('alanSec tek başına mevcut davranışı korur (true)', () async {
      await kap.read(durumProvider.future);
      final d = await kap.read(durumProvider.notifier).alanSec('kod');
      expect(d.ilkAcilisTamam, isTrue);
    });

    test('ilkAcilisTamamla bayrağı true yapar ve kaydeder', () async {
      await kap.read(durumProvider.future);
      final n = kap.read(durumProvider.notifier);
      await n.alanSec('dil', ilkAcilisTamam: false);
      final d = await n.ilkAcilisTamamla();
      expect(d.ilkAcilisTamam, isTrue);
      expect((await depo.yukle()).ilkAcilisTamam, isTrue);
    });
  });
}
