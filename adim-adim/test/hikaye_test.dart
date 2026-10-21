// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Okuma hikâyeleri: içerik doğrulama, Motor.hikayeXp / kelimeBilgisiYuzde /
/// hikayeBitir ve OgrenciDurumu JSON uyumluluğu.
library;

import 'package:adim_adim/bilesenler/ogrenme_gunlugu.dart';
import 'package:adim_adim/icerik/hikayeler.dart';
import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/hikaye.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter_test/flutter_test.dart';

const _bugun = '2026-10-15';

RegExp _desen(String kelime) =>
    RegExp('\\b${RegExp.escape(kelime)}\\b', caseSensitive: false);

void main() {
  group('hikâye içeriği', () {
    test('12 hikâye; kimlikler benzersiz', () {
      expect(tumHikayeler, hasLength(12));
      expect({for (final h in tumHikayeler) h.id}, hasLength(12));
    });

    test('kurs kimlikleri geçerli ve yalnız İngilizce (dil) kurslarında', () {
      for (final h in tumHikayeler) {
        final kurs = kursBul(h.kursId);
        expect(kurs, isNotNull, reason: h.id);
        expect(kurs!.alan, KursAlani.dil, reason: h.id);
      }
      for (final k in tumKurslar.where((k) => k.alan == KursAlani.kod)) {
        expect(tumHikayeler.where((h) => h.kursId == k.id), isEmpty);
      }
    });

    test('her kursta her seviyeden tam bir hikâye', () {
      for (final kid in [
        'ingilizce-1',
        'ingilizce-2',
        'ingilizce-3',
        'ingilizce-4',
      ]) {
        final seviyeler = [
          for (final h in tumHikayeler)
            if (h.kursId == kid) h.seviye,
        ];
        expect(seviyeler, hasLength(3), reason: kid);
        expect(seviyeler.toSet(), HikayeSeviyesi.values.toSet(), reason: kid);
      }
    });

    test(
      'kelime sayısı aralıkları: kolay 60-90, orta 100-140, zor 150-200',
      () {
        for (final h in tumHikayeler) {
          final (en, cok) = switch (h.seviye) {
            HikayeSeviyesi.kolay => (60, 90),
            HikayeSeviyesi.orta => (100, 140),
            HikayeSeviyesi.zor => (150, 200),
          };
          expect(
            h.kelimeSayisi,
            inInclusiveRange(en, cok),
            reason: '${h.id}: ${h.kelimeSayisi}',
          );
        }
      },
    );

    test('sorular, anahtar kelimeler ve metin tutarlı', () {
      for (final h in tumHikayeler) {
        expect(h.baslik.trim(), isNotEmpty, reason: h.id);
        expect(h.paragraflar, isNotEmpty, reason: h.id);
        expect(h.sorular.length, inInclusiveRange(3, 4), reason: h.id);
        for (final s in h.sorular) {
          expect(s.secenekler.length, greaterThanOrEqualTo(2), reason: h.id);
          expect(s.dogru, inInclusiveRange(0, s.secenekler.length - 1));
          expect(s.secenekler.toSet(), hasLength(s.secenekler.length));
        }
        expect(h.anahtarKelimeler.length, inInclusiveRange(5, 8), reason: h.id);
        final metin = h.paragraflar.join(' ');
        final kelimeler = [for (final k in h.anahtarKelimeler) k.kelime];
        expect(kelimeler.toSet(), hasLength(kelimeler.length), reason: h.id);
        for (final k in h.anahtarKelimeler) {
          expect(k.anlam.trim(), isNotEmpty, reason: '${h.id}/${k.kelime}');
          expect(
            _desen(k.kelime).hasMatch(metin),
            isTrue,
            reason: '${h.id}: "${k.kelime}" metinde geçmiyor',
          );
        }
      }
    });

    test('doğru seçenek konumları çeşitli (hep aynı değil)', () {
      final konumlar = {
        for (final h in tumHikayeler)
          for (final s in h.sorular) s.dogru,
      };
      expect(konumlar.length, greaterThanOrEqualTo(3));
    });

    test('hikayeBul ve kurslarinHikayeleri', () {
      expect(hikayeBul('hikaye-a1-kolay')?.kursId, 'ingilizce-1');
      expect(hikayeBul('yok'), isNull);
      final iki = kurslarinHikayeleri(['ingilizce-2', 'ingilizce-1']);
      expect(iki, hasLength(6));
      expect(iki.first.kursId, 'ingilizce-2');
      expect(kurslarinHikayeleri(['html-1']), isEmpty);
    });
  });

  group('Motor.hikayeXp', () {
    test('doğru başına 2 + bilinmeyen kadar bonus, en çok 15', () {
      expect(Motor.hikayeXp(0, 4, 0), 0);
      expect(Motor.hikayeXp(3, 4, 0), 6);
      expect(Motor.hikayeXp(3, 4, 2), 8);
      expect(Motor.hikayeXp(4, 4, 8), 15);
      expect(Motor.hikayeXp(4, 4, 7), 15);
      expect(Motor.hikayeXp(4, 4, 6), 14);
    });

    test('sınırlar: negatif ve taşan değerler kırpılır', () {
      expect(Motor.hikayeXp(-3, 4, -2), 0);
      expect(Motor.hikayeXp(9, 4, 0), 8); // doğru toplamı aşamaz
      expect(Motor.hikayeXp(2, -1, 3), 3); // toplam < 0: doğru 0
      expect(Motor.hikayeXp(100, 100, 100), 15);
    });

    test('kelimeBilgisiYuzde', () {
      expect(Motor.kelimeBilgisiYuzde(0, 0), 0);
      expect(Motor.kelimeBilgisiYuzde(0, 6), 0);
      expect(Motor.kelimeBilgisiYuzde(6, 6), 100);
      expect(Motor.kelimeBilgisiYuzde(4, 6), 67);
      expect(Motor.kelimeBilgisiYuzde(1, 8), 13); // 12,5 yukarı yuvarlanır
      expect(Motor.kelimeBilgisiYuzde(9, 6), 100);
      expect(Motor.kelimeBilgisiYuzde(-1, 6), 0);
    });
  });

  group('Motor.hikayeBitir', () {
    final kart = Kart(kutu: 2, sonraki: '2026-10-20');
    final temel = OgrenciDurumu(
      alan: 'dil',
      kartlar: {'d#0': kart},
      tamamlanan: const {'d': 1},
      sonDersId: 'd',
    );

    test('XP/seri işlenir; kartlar, tamamlanan ve sonDersId değişmez', () {
      final y = Motor.hikayeBitir(temel, 'hikaye-a1-kolay', 3, 4, 2, _bugun);
      expect(y.xp, 8);
      expect(y.seri, 1);
      expect(y.gunlukXp[_bugun], 8);
      expect(y.sonGun, _bugun);
      expect(y.kartlar, temel.kartlar);
      expect(y.tamamlanan, temel.tamamlanan);
      expect(y.sonDersId, 'd');
    });

    test('tamamlananHikayeler artar; günlüğe hikaye kaydı yazılır', () {
      var y = Motor.hikayeBitir(temel, 'hikaye-a1-kolay', 3, 4, 2, _bugun);
      expect(y.tamamlananHikayeler, {'hikaye-a1-kolay': 1});
      y = Motor.hikayeBitir(y, 'hikaye-a1-kolay', 4, 4, 0, _bugun);
      y = Motor.hikayeBitir(y, 'hikaye-a1-orta', 4, 4, 0, _bugun);
      expect(y.tamamlananHikayeler, {
        'hikaye-a1-kolay': 2,
        'hikaye-a1-orta': 1,
      });
      expect(y.gunluk, hasLength(3));
      final k = y.gunluk.first;
      expect(k.tur, GunlukKayit.turHikaye);
      expect(k.id, 'hikaye-a1-kolay');
      expect(k.dogru, 3);
      expect(k.toplam, 4);
      expect(k.xp, 8);
      expect(k.gun, _bugun);
    });

    test('toplam 0 ise durum değişmez', () {
      expect(
        identical(Motor.hikayeBitir(temel, 'x', 0, 0, 3, _bugun), temel),
        isTrue,
      );
    });

    test('doğru sayısı toplamı aşarsa günlükte kırpılır', () {
      final y = Motor.hikayeBitir(temel, 'h', 9, 4, 0, _bugun);
      expect(y.gunluk.single.dogru, 4);
    });

    test('günlük tur metni "hikâye" içerir', () {
      final y = Motor.hikayeBitir(temel, 'hikaye-a1-kolay', 3, 4, 0, _bugun);
      expect(gunlukTurMetni(y, _bugun), '1 hikâye');
      final z = Motor.hikayeBitir(y, 'hikaye-a1-orta', 3, 4, 0, _bugun);
      expect(gunlukTurMetni(z, _bugun), '2 hikâye');
      final d = Motor.dersBitir(z, 'd', 3, 4, _bugun);
      expect(gunlukTurMetni(d, _bugun), '1 ders, 2 hikâye');
    });
  });

  group('JSON', () {
    test('gidiş-dönüş tamamlananHikayeler ve hikaye günlük kaydı', () {
      final y = Motor.hikayeBitir(
        const OgrenciDurumu(alan: 'dil'),
        'hikaye-b1-zor',
        3,
        4,
        5,
        _bugun,
      );
      final geri = OgrenciDurumu.fromJson(y.toJson());
      expect(geri.tamamlananHikayeler, {'hikaye-b1-zor': 1});
      expect(geri.gunluk.single.tur, GunlukKayit.turHikaye);
      expect(geri.gunluk.single.id, 'hikaye-b1-zor');
      expect(geri.xp, y.xp);
    });

    test('eski JSON (alan yok) boş harita verir', () {
      final eski = OgrenciDurumu.fromJson({'surum': 1, 'xp': 10});
      expect(eski.tamamlananHikayeler, isEmpty);
      expect(eski.xp, 10);
    });

    test('bozuk girdiler atlanır, fırlatmaz', () {
      final d = OgrenciDurumu.fromJson({
        'tamamlananHikayeler': {
          'iyi': 2,
          'kotu#anahtar': 1,
          'negatif': -1,
          'metin': 'x',
        },
      });
      expect(d.tamamlananHikayeler, {'iyi': 2});
      expect(
        OgrenciDurumu.fromJson({'tamamlananHikayeler': 5}).tamamlananHikayeler,
        isEmpty,
      );
    });

    test('copyWith diğer alanları korur', () {
      const d = OgrenciDurumu(tamamlananHikayeler: {'a': 1}, xp: 5);
      expect(d.copyWith(xp: 6).tamamlananHikayeler, {'a': 1});
      expect(d.copyWith(tamamlananHikayeler: {'b': 2}).xp, 5);
    });
  });
}
