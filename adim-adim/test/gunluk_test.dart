// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Öğrenme günlüğü ve "son ders" birim testleri: GunlukKayit JSON gidiş-dönüş,
/// 200 kayıt sınırı, geçersiz kayıtların atlanması, eski JSON uyumu, motorun
/// ders/mikro/tekrar/yarışma bitişinde kayıt eklemesi ve gunlukOzeti.
library;

import 'dart:convert';

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/yarisma/model.dart';
import 'package:adim_adim/yarisma/soru_bankasi.dart';
import 'package:flutter_test/flutter_test.dart';

const _gun = '2026-10-15';

void main() {
  group('GunlukKayit JSON', () {
    test('gidiş-dönüş tüm alanları korur', () {
      const k = GunlukKayit(
        gun: _gun,
        tur: GunlukKayit.turDers,
        id: 'k.u1.d1',
        dogru: 7,
        toplam: 8,
        xp: 24,
      );
      final geri = GunlukKayit.fromJson(jsonDecode(jsonEncode(k.toJson())));
      expect(geri, isNotNull);
      expect(geri!.gun, _gun);
      expect(geri.tur, GunlukKayit.turDers);
      expect(geri.id, 'k.u1.d1');
      expect(geri.dogru, 7);
      expect(geri.toplam, 8);
      expect(geri.xp, 24);
    });

    test('geçersiz gün, tür ya da biçim null döner', () {
      expect(GunlukKayit.fromJson({'gun': '2026-02-30', 'tur': 'ders'}), null);
      expect(GunlukKayit.fromJson({'gun': _gun, 'tur': 'bilinmez'}), null);
      expect(GunlukKayit.fromJson({'gun': _gun}), null);
      expect(GunlukKayit.fromJson('metin'), null);
      expect(GunlukKayit.fromJson(null), null);
    });

    test('eksik ya da bozuk sayaçlar 0, bozuk id null olur', () {
      final k = GunlukKayit.fromJson({
        'gun': _gun,
        'tur': 'tekrar',
        'dogru': -3,
        'toplam': 'x',
        'id': '',
      });
      expect(k, isNotNull);
      expect(k!.dogru, 0);
      expect(k.toplam, 0);
      expect(k.xp, 0);
      expect(k.id, null);
    });
  });

  group('OgrenciDurumu günlük ve sonDersId', () {
    test('toJson/fromJson gidiş-dönüş', () {
      const d = OgrenciDurumu(
        sonDersId: 'k.u1.d2',
        gunluk: [
          GunlukKayit(
            gun: _gun,
            tur: 'ders',
            id: 'k.u1.d2',
            dogru: 3,
            toplam: 4,
            xp: 16,
          ),
          GunlukKayit(gun: _gun, tur: 'yarisma', dogru: 5, toplam: 6, xp: 9),
        ],
      );
      final geri = OgrenciDurumu.fromJson(jsonDecode(jsonEncode(d.toJson())));
      expect(geri.sonDersId, 'k.u1.d2');
      expect(geri.gunluk, hasLength(2));
      expect(geri.gunluk[1].tur, 'yarisma');
      expect(jsonEncode(geri.toJson()), jsonEncode(d.toJson()));
    });

    test('eski JSON (alanlar yok) varsayılanla okunur', () {
      final d = OgrenciDurumu.fromJson({'surum': 1, 'xp': 10});
      expect(d.sonDersId, null);
      expect(d.gunluk, isEmpty);
    });

    test('geçersiz kayıtlar atlanır, geçerliler kalır', () {
      final d = OgrenciDurumu.fromJson({
        'gunluk': [
          {'gun': _gun, 'tur': 'ders', 'id': 'a'},
          {'gun': 'bozuk', 'tur': 'ders'},
          42,
          {'gun': _gun, 'tur': 'mikro'},
        ],
        'sonDersId': 'a#1',
      });
      expect(d.gunluk, hasLength(2));
      expect(d.gunluk.map((k) => k.tur), ['ders', 'mikro']);
      // Kart kimliği ('#' içeren) ders kimliği değildir.
      expect(d.sonDersId, null);
    });

    test('200 sınırı: okumada en eskiler düşer', () {
      final ham = [
        for (var i = 0; i < 250; i++) {'gun': _gun, 'tur': 'ders', 'id': 'd$i'},
      ];
      final d = OgrenciDurumu.fromJson({'gunluk': ham});
      expect(d.gunluk, hasLength(GunlukKayit.enCok));
      expect(d.gunluk.first.id, 'd50');
      expect(d.gunluk.last.id, 'd249');
    });
  });

  group('Motor günlük', () {
    test('dersBitir: sonDersId ve ders kaydı', () {
      final d = Motor.dersBitir(const OgrenciDurumu(), 'k.u1.d1', 7, 8, _gun);
      expect(d.sonDersId, 'k.u1.d1');
      expect(d.gunluk, hasLength(1));
      final k = d.gunluk.single;
      expect(k.tur, GunlukKayit.turDers);
      expect(k.id, 'k.u1.d1');
      expect(k.dogru, 7);
      expect(k.toplam, 8);
      expect(k.xp, Motor.dersXp(7, 8));
      expect(k.gun, _gun);
    });

    test('mikroBitir ve tekrarBitir kayıt ekler; tekrar XP değiştirmez', () {
      var d = Motor.mikroBitir(const OgrenciDurumu(), 4, 5, _gun);
      expect(d.gunluk.single.tur, GunlukKayit.turMikro);
      expect(d.gunluk.single.xp, Motor.mikroXp(4, 5));
      final xp = d.xp;
      d = Motor.tekrarBitir(d, 9, 10, _gun);
      expect(d.xp, xp);
      expect(d.gunluk, hasLength(2));
      expect(d.gunluk.last.tur, GunlukKayit.turTekrar);
      expect(d.gunluk.last.dogru, 9);
      expect(d.gunluk.last.toplam, 10);
      expect(d.gunluk.last.xp, 0);
      // Boş oturum kayıt üretmez; doğru toplamı aşamaz.
      expect(Motor.tekrarBitir(d, 1, 0, _gun).gunluk, hasLength(2));
      expect(Motor.tekrarBitir(d, 12, 10, _gun).gunluk.last.dogru, 10);
    });

    test('yarismaBitir: kazanılan XP ve sayılar kaydedilir', () {
      final soru = tumSorular.first;
      final d = Motor.yarismaBitir(
        const OgrenciDurumu(),
        120,
        _gun,
        yanlisSorular: [soru],
        dogru: 6,
        toplam: 8,
        kategori: YarismaKategori.values.first.kimlik,
      );
      expect(d.gunluk.single.tur, GunlukKayit.turYarisma);
      expect(d.gunluk.single.xp, 24);
      expect(d.gunluk.single.dogru, 6);
      expect(d.gunluk.single.toplam, 8);
      expect(d.gunluk.single.id, YarismaKategori.values.first.kimlik);
      expect(d.hatalar, hasLength(1));
    });

    test('gunlukEkle 200 sınırını korur, geçersiz günü eklemez', () {
      var d = const OgrenciDurumu();
      for (var i = 0; i < 205; i++) {
        d = Motor.dersBitir(d, 'k.u1.d$i', 1, 1, _gun);
      }
      expect(d.gunluk, hasLength(GunlukKayit.enCok));
      expect(d.gunluk.first.id, 'k.u1.d5');
      expect(d.gunluk.last.id, 'k.u1.d204');
      final ayni = Motor.gunlukEkle(
        d,
        const GunlukKayit(gun: 'bozuk', tur: 'ders'),
      );
      expect(identical(ayni, d), true);
    });

    test('gunlukOzeti günü toplar; gunlukGunleri en yeni önce', () {
      var d = Motor.dersBitir(const OgrenciDurumu(), 'a', 7, 8, '2026-10-14');
      d = Motor.dersBitir(d, 'b', 5, 8, _gun);
      d = Motor.tekrarBitir(d, 3, 4, _gun);
      d = Motor.yarismaBitir(d, 50, _gun, dogru: 2, toplam: 3);
      final o = Motor.gunlukOzeti(d, _gun);
      expect(o.dersler, 3);
      expect(o.dogru, 10);
      expect(o.toplam, 15);
      expect(o.xp, Motor.dersXp(5, 8) + 10);
      final bos = Motor.gunlukOzeti(d, '2026-10-01');
      expect(bos, (dersler: 0, dogru: 0, toplam: 0, xp: 0));
      expect(Motor.gunlukGunleri(d), [_gun, '2026-10-14']);
    });
  });
}
