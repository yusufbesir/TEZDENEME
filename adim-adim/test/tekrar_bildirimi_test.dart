/// ÖZELLİK 29 birim testleri: açılıştaki "bekleyen tekrar" bildirimi kararı
/// (Motor.tekrarBildirimiGerekli), bildirim metni ve OgrenciDurumu'nun yeni
/// alanlarının JSON gidiş-dönüşü / eski JSON varsayılanları.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:convert';

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/servis/bildirim.dart';
import 'package:flutter_test/flutter_test.dart';

const _bugun = '2026-10-15';

OgrenciDurumu _bekleyenli({int sayi = 2, String? sonGun, bool acik = true}) =>
    OgrenciDurumu(
      alan: 'dil',
      kartlar: {
        for (var i = 0; i < sayi; i++)
          'd1#$i': const Kart(kutu: 1, sonraki: '2026-10-14'),
        // Yarının kartı sayılmaz.
        'd1#99': const Kart(kutu: 1, sonraki: '2026-10-16'),
      },
      sonTekrarBildirimGunu: sonGun,
      tekrarBildirimiAcik: acik,
    );

void main() {
  group('Motor.tekrarBildirimiGerekli', () {
    test('bekleyen kart yok → null', () {
      expect(
        Motor.tekrarBildirimiGerekli(const OgrenciDurumu(alan: 'dil'), _bugun),
        isNull,
      );
      expect(
        Motor.tekrarBildirimiGerekli(_bekleyenli(sayi: 0), _bugun),
        isNull,
      );
    });

    test('bekleyen var, bugün gösterilmemiş → sayı (bugünkü ve geçmiş)', () {
      expect(Motor.tekrarBildirimiGerekli(_bekleyenli(sayi: 3), _bugun), 3);
      expect(
        Motor.tekrarBildirimiGerekli(
          _bekleyenli(sayi: 1, sonGun: '2026-10-14'),
          _bugun,
        ),
        1,
      );
    });

    test('aynı gün gösterilmiş → null', () {
      expect(
        Motor.tekrarBildirimiGerekli(_bekleyenli(sonGun: _bugun), _bugun),
        isNull,
      );
    });

    test('ayar kapalı → null', () {
      expect(
        Motor.tekrarBildirimiGerekli(_bekleyenli(acik: false), _bugun),
        isNull,
      );
    });
  });

  test('Bildirim.tekrarMetni: tekil ve çoğul', () {
    expect(Bildirim.tekrarMetni(1), 'Bugün 1 tekrar bekliyor');
    expect(Bildirim.tekrarMetni(12), 'Bugün 12 tekrar bekliyor');
  });

  group('OgrenciDurumu JSON (yeni alanlar)', () {
    test('gidiş-dönüş alanları korur', () {
      final d = _bekleyenli(sonGun: _bugun, acik: false);
      final geri = OgrenciDurumu.fromJson(jsonDecode(jsonEncode(d.toJson())));
      expect(geri.sonTekrarBildirimGunu, _bugun);
      expect(geri.tekrarBildirimiAcik, isFalse);
      expect(geri.kartlar.length, d.kartlar.length);
    });

    test('eski JSON (alanlar yok) → hiç gösterilmedi, açık', () {
      final d = OgrenciDurumu.fromJson({'surum': 1, 'xp': 5, 'alan': 'dil'});
      expect(d.sonTekrarBildirimGunu, isNull);
      expect(d.tekrarBildirimiAcik, isTrue);
      expect(d.xp, 5);
    });

    test('bozuk değerler varsayılana çekilir', () {
      final d = OgrenciDurumu.fromJson({
        'sonTekrarBildirimGunu': '2026-13-99',
        'tekrarBildirimiAcik': 'evet',
      });
      expect(d.sonTekrarBildirimGunu, isNull);
      expect(d.tekrarBildirimiAcik, isTrue);
    });

    test('copyWith yalnız verilen alanı değiştirir', () {
      const d = OgrenciDurumu();
      final a = d.copyWith(sonTekrarBildirimGunu: _bugun);
      expect(a.sonTekrarBildirimGunu, _bugun);
      expect(a.tekrarBildirimiAcik, isTrue);
      final b = a.copyWith(tekrarBildirimiAcik: false);
      expect(b.sonTekrarBildirimGunu, _bugun);
      expect(b.tekrarBildirimiAcik, isFalse);
    });
  });
}
