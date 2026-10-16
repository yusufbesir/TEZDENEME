/// Hata defteri birim testleri: kayıt kuralları, 200 sınırı, yarışma yanlışları,
/// son 7 gün "zayıf noktalar" seçimi ve eski JSON ile geriye uyumluluk.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf
/// kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:convert';

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/yarisma/model.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

YarismaSorusu soru(String id, YarismaKategori k, {String kurs = 'html-1'}) =>
    YarismaSorusu(
      id: id,
      alan: 'kod',
      seviyeKursId: kurs,
      kategori: k,
      soru: 'Soru $id',
      secenekler: const ['a', 'b', 'c', 'd'],
      dogru: 0,
      aciklama: 'açıklama',
    );

void main() {
  const bugun = '2026-10-15';

  group('kart hataları', () {
    test('yanlış cevap hata defterine yazılır, doğru yazılmaz', () {
      var d = Motor.kartIsle(
        const OgrenciDurumu(),
        'ingilizce-1.u1.d1#2',
        true,
        bugun,
      );
      expect(d.hatalar, isEmpty);
      d = Motor.kartIsle(d, 'ingilizce-1.u1.d1#2', false, bugun);
      expect(d.hatalar, hasLength(1));
      final h = d.hatalar.single;
      expect(h.tur, HataKaydi.turKart);
      expect(h.id, 'ingilizce-1.u1.d1#2');
      expect(h.seviye, 'ingilizce-1');
      expect(h.gun, bugun);
      expect(h.kategori, isNull);
    });

    test('html biçimli ders kimliğinden de seviye çözülür', () {
      final d = Motor.kartIsle(
        const OgrenciDurumu(),
        'html-1-u2-d1#0',
        false,
        bugun,
      );
      expect(d.hatalar.single.seviye, 'html-1');
    });

    test(
      'aynı kart yine yanlışsa tek kayıt kalır, sona ve yeni güne taşınır',
      () {
        var d = Motor.kartIsle(
          const OgrenciDurumu(),
          'k.u1.d1#0',
          false,
          '2026-10-10',
        );
        d = Motor.kartIsle(d, 'k.u1.d1#1', false, '2026-10-11');
        d = Motor.kartIsle(d, 'k.u1.d1#0', false, bugun);
        expect([for (final h in d.hatalar) h.id], ['k.u1.d1#1', 'k.u1.d1#0']);
        expect(d.hatalar.last.gun, bugun);
      },
    );

    test('yanlış kart tekrar çözülünce kart güncellenir, defter silinmez', () {
      var d = Motor.kartIsle(const OgrenciDurumu(), 'k.u1.d1#0', false, bugun);
      d = Motor.kartIsle(d, 'k.u1.d1#0', true, bugun);
      expect(d.hatalar, hasLength(1));
      expect(d.kartlar['k.u1.d1#0']!.sonCevap, true);
    });
  });

  group('200 kayıt sınırı', () {
    test('en eski kayıt düşer', () {
      var d = const OgrenciDurumu();
      for (var i = 0; i < 205; i++) {
        d = Motor.kartIsle(d, 'k.u1.d1#$i', false, bugun);
      }
      expect(d.hatalar, hasLength(HataKaydi.enCok));
      expect(HataKaydi.enCok, 200);
      expect(d.hatalar.first.id, 'k.u1.d1#5');
      expect(d.hatalar.last.id, 'k.u1.d1#204');
    });

    test('hataEkle girdi durumu değiştirmez', () {
      const ilk = OgrenciDurumu();
      Motor.hataEkle(
        ilk,
        const HataKaydi(tur: 'kart', id: 'a#0', seviye: 'a', gun: bugun),
      );
      expect(ilk.hatalar, isEmpty);
    });
  });

  group('yarışma yanlışları', () {
    test('yarismaBitir yanlış soruları kategori ve seviyeyle kaydeder', () {
      final d = Motor.yarismaBitir(
        const OgrenciDurumu(),
        100,
        bugun,
        yanlisSorular: [
          soru('html-1.tarih.1', YarismaKategori.tarih),
          soru('css-1.fen.2', YarismaKategori.fen, kurs: 'css-1'),
        ],
      );
      expect(d.xp, 20); // XP kuralı aynen
      expect(d.hatalar, hasLength(2));
      expect(d.hatalar[0].tur, HataKaydi.turYarisma);
      expect(d.hatalar[0].id, 'html-1.tarih.1');
      expect(d.hatalar[0].kategori, 'tarih');
      expect(d.hatalar[0].seviye, 'html-1');
      expect(d.hatalar[0].gun, bugun);
      expect(d.hatalar[1].kategori, 'fen');
      expect(d.hatalar[1].seviye, 'css-1');
      expect(
        YarismaKategoriUzanti.coz(d.hatalar[1].kategori!),
        YarismaKategori.fen,
      );
    });

    test('yanlisSorular verilmezse hata eklenmez (eski çağrı biçimi)', () {
      final d = Motor.yarismaBitir(const OgrenciDurumu(), 100, bugun);
      expect(d.hatalar, isEmpty);
    });

    test('aynı soru ve aynı kimlikli kart birbirini ezmez', () {
      var d = Motor.yarismaBitir(
        const OgrenciDurumu(),
        0,
        bugun,
        yanlisSorular: [soru('x', YarismaKategori.sanat)],
      );
      d = Motor.hataEkle(
        d,
        const HataKaydi(tur: 'kart', id: 'x', seviye: 's', gun: bugun),
      );
      expect(d.hatalar, hasLength(2));
    });
  });

  group('zayifKartlar (son 7 gün)', () {
    HataKaydi kart(String id, String gun) =>
        HataKaydi(tur: HataKaydi.turKart, id: id, seviye: 'k', gun: gun);

    test('bugün dahil 7 gün; 8 gün öncesi ve gelecek hariç', () {
      final d = OgrenciDurumu(
        hatalar: [
          kart('eski#0', '2026-10-08'), // 7 gün önce: dışarıda
          kart('sinir#0', '2026-10-09'), // 6 gün önce: içeride
          kart('dun#0', '2026-10-14'),
          kart('gelecek#0', '2026-10-20'),
        ],
      );
      expect(Motor.zayifKartlar(d, bugun), ['dun#0', 'sinir#0']);
    });

    test('yarışma kayıtları sayılmaz, tekrarlar teke iner, en yeni önce', () {
      final d = OgrenciDurumu(
        hatalar: [
          kart('a#0', '2026-10-12'),
          const HataKaydi(
            tur: HataKaydi.turYarisma,
            id: 'q1',
            seviye: 'k',
            gun: bugun,
          ),
          kart('b#0', '2026-10-13'),
          kart('a#0', '2026-10-15'),
        ],
      );
      expect(Motor.zayifKartlar(d, bugun), ['a#0', 'b#0']);
    });

    test('hata yoksa boş', () {
      expect(Motor.zayifKartlar(const OgrenciDurumu(), bugun), isEmpty);
    });
  });

  group('JSON ve eski kayıt uyumu', () {
    // Hata defteri / haftalık hedef / yarı ömür öncesi biçim.
    const eskiJson = '''
{"surum":1,"xp":120,"seri":4,"enSeri":6,"sonGun":"2026-10-14",
 "kartlar":{"k.u1.d1#0":{"kutu":3,"sonraki":"2026-10-18"}},
 "tamamlanan":{"k.u1.d1":2},"gunlukXp":{"2026-10-14":40},
 "gunlukHedef":50,"ad":"Ayşe","koyuTema":true,"sesAcik":false,
 "hatirlatmaSaati":"20:00","alan":"dil"}''';

    test('eski JSON bozulmadan okunur, yeni alanlar varsayılan olur', () {
      final d = OgrenciDurumu.fromJson(jsonDecode(eskiJson));
      expect(d.xp, 120);
      expect(d.seri, 4);
      expect(d.enSeri, 6);
      expect(d.sonGun, '2026-10-14');
      expect(d.tamamlanan, {'k.u1.d1': 2});
      expect(d.gunlukXp, {'2026-10-14': 40});
      expect(d.gunlukHedef, 50);
      expect(d.ad, 'Ayşe');
      expect(d.koyuTema, true);
      expect(d.sesAcik, false);
      expect(d.hatirlatmaSaati, '20:00');
      expect(d.alan, 'dil');
      expect(d.kartlar['k.u1.d1#0']!.kutu, 3);
      expect(d.kartlar['k.u1.d1#0']!.sonraki, '2026-10-18');
      expect(d.kartlar['k.u1.d1#0']!.yariOmurGun, 4.0);
      expect(d.kartlar['k.u1.d1#0']!.sonCevap, isNull);
      expect(d.hatalar, isEmpty);
      expect(d.haftalikHedefGun, 5);
    });

    test('eski kayıt yeni biçimde yazılıp tekrar okunabilir', () {
      final d = OgrenciDurumu.fromJson(jsonDecode(eskiJson));
      final yeni = OgrenciDurumu.fromJson(jsonDecode(jsonEncode(d.toJson())));
      expect(yeni.xp, d.xp);
      expect(yeni.kartlar['k.u1.d1#0']!.yariOmurGun, 4.0);
      expect(yeni.haftalikHedefGun, 5);
      expect(yeni.hatalar, isEmpty);
    });

    test('hatalar gidiş dönüşte korunur', () {
      const d = OgrenciDurumu(
        hatalar: [
          HataKaydi(
            tur: HataKaydi.turYarisma,
            id: 'q',
            kategori: 'tarih',
            seviye: 'html-1',
            gun: bugun,
          ),
          HataKaydi(tur: HataKaydi.turKart, id: 'k#0', seviye: 'k', gun: bugun),
        ],
      );
      final r = OgrenciDurumu.fromJson(jsonDecode(jsonEncode(d.toJson())));
      expect(r.hatalar, hasLength(2));
      expect(r.hatalar[0].kategori, 'tarih');
      expect(r.hatalar[0].tur, HataKaydi.turYarisma);
      expect(r.hatalar[1].kategori, isNull);
      expect(r.hatalar[1].id, 'k#0');
    });

    test('bozuk hata kayıtları atılır, geçerliler kalır, asla fırlatmaz', () {
      final d = OgrenciDurumu.fromJson({
        'hatalar': [
          'metin',
          42,
          null,
          {'tur': 'baska', 'id': 'a', 'seviye': 's', 'gun': bugun},
          {'tur': 'kart', 'id': '', 'seviye': 's', 'gun': bugun},
          {'tur': 'kart', 'id': 'a#0', 'seviye': 's', 'gun': '2026-02-30'},
          {'tur': 'kart', 'id': 'a#0', 'seviye': 's'},
          {'tur': 'kart', 'id': 'ok#0', 'seviye': 'k', 'gun': bugun},
        ],
      });
      expect([for (final h in d.hatalar) h.id], ['ok#0']);
      expect(OgrenciDurumu.fromJson({'hatalar': 'x'}).hatalar, isEmpty);
      expect(
        OgrenciDurumu.fromJson({
          'hatalar': {'a': 1},
        }).hatalar,
        isEmpty,
      );
    });

    test('dosyada 200den fazla kayıt varsa en yeni 200 okunur', () {
      final d = OgrenciDurumu.fromJson({
        'hatalar': [
          for (var i = 0; i < 250; i++)
            {'tur': 'kart', 'id': 'k#$i', 'seviye': 'k', 'gun': bugun},
        ],
      });
      expect(d.hatalar, hasLength(200));
      expect(d.hatalar.first.id, 'k#50');
      expect(d.hatalar.last.id, 'k#249');
    });
  });

  group('DurumNotifier (kalıcılık)', () {
    test('yarismaBitir ve kartIsle hata defterini depoya yazar', () async {
      final depo = BellekDepo();
      final kap = ProviderContainer(
        overrides: [
          depoProvider.overrideWithValue(depo),
          bugunProvider.overrideWithValue(bugun),
        ],
      );
      addTearDown(kap.dispose);
      await kap.read(durumProvider.future);
      final n = kap.read(durumProvider.notifier);
      await n.yarismaBitir(
        50,
        yanlisSorular: [soru('html-1.fen.4', YarismaKategori.fen)],
      );
      await n.kartIsle('html-1-u1-d1#3', false);
      await n.ayarGuncelle(haftalikHedefGun: 9);
      final d = await depo.yukle();
      expect(
        [for (final h in d.hatalar) h.id],
        ['html-1.fen.4', 'html-1-u1-d1#3'],
      );
      expect(d.hatalar.last.seviye, 'html-1');
      expect(d.haftalikHedefGun, 7); // 3..7 aralığına çekilir
    });
  });
}
