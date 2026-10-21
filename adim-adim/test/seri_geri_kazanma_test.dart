// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// ÖZELLİK 48 testleri: seri kırılınca kopan değer saklanır; 3 gün üst üste
/// günlük hedef tutulunca seri eski değer +3 olarak döner; araya bir gün
/// girerse ilerleme sıfırlanır; esnek seri bozulmaz; eski JSON uyumu; ana
/// sayfa ve Profil satırı; 480x600 @1,5 taşma yok.
library;

import 'dart:convert';

import 'package:adim_adim/bilesenler/geri_kazanma_satiri.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

/// Günlük hedefi (30 XP) aşan ders (35 XP).
OgrenciDurumu _hedefli(OgrenciDurumu d, String gun) =>
    Motor.dersBitir(d, 'k.u1.d1', 10, 10, gun);

/// Hedefin altında kalan ders (12 XP).
OgrenciDurumu _hafif(OgrenciDurumu d, String gun) =>
    Motor.dersBitir(d, 'k.u1.d1', 1, 2, gun);

/// 2026-10-01..05 arası 5 günlük seri; haftalık hedef 7 (esnek seri devre dışı).
OgrenciDurumu _besGunluk() {
  var d = const OgrenciDurumu(haftalikHedefGun: 7);
  for (final g in [
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
    '2026-10-05',
  ]) {
    d = _hedefli(d, g);
  }
  return d;
}

void main() {
  group('Motor: seri geri kazanma', () {
    test('seri kırılınca kopan değer saklanır, ilerleme 0', () {
      final d = _hafif(_besGunluk(), '2026-10-10');
      expect(d.seri, 1);
      expect(d.kirilanSeri, 5);
      expect(d.geriKazanmaGun, 0);
    });

    test('3 gün üst üste hedef: seri eski değer +3 olarak döner', () {
      var d = _hedefli(_besGunluk(), '2026-10-10');
      expect(d.geriKazanmaGun, 1);
      expect(Motor.geriKazanma(d, '2026-10-10')?.ilerleme, 1);
      d = _hedefli(d, '2026-10-11');
      expect(d.geriKazanmaGun, 2);
      expect(d.seri, 2);
      d = _hedefli(d, '2026-10-12');
      expect(d.seri, 8);
      expect(d.enSeri, 8);
      expect(d.kirilanSeri, 0);
      expect(d.geriKazanmaGun, 0);
      expect(Motor.geriKazanma(d, '2026-10-12'), isNull);
      // Sonraki gün seri 9'dan devam eder.
      expect(_hedefli(d, '2026-10-13').seri, 9);
    });

    test('aynı gün ikinci ders ilerlemeyi çift saymaz', () {
      var d = _hedefli(_besGunluk(), '2026-10-10');
      d = _hedefli(d, '2026-10-10');
      expect(d.geriKazanmaGun, 1);
    });

    test('hedefin altında kalan gün sayılmaz; sonra tamamlanırsa sayılır', () {
      var d = _hafif(_besGunluk(), '2026-10-10');
      expect(d.geriKazanmaGun, 0);
      d = _hedefli(d, '2026-10-10'); // aynı gün hedef aşıldı (12 + 35)
      expect(d.geriKazanmaGun, 1);
    });

    test('bir gün atlanırsa ilerleme sıfırlanır', () {
      var d = _hedefli(_besGunluk(), '2026-10-10');
      d = _hedefli(d, '2026-10-11');
      expect(Motor.geriKazanma(d, '2026-10-12')?.ilerleme, 2);
      expect(Motor.geriKazanma(d, '2026-10-13')?.ilerleme, 0);
      d = _hedefli(d, '2026-10-14'); // 12. ve 13. atlandı
      expect(d.geriKazanmaGun, 1);
      expect(d.seri, 1);
      expect(d.kirilanSeri, 5); // eski değer korunur
    });

    test('ilerleme sırasında yeniden kopma kopan değeri korur', () {
      var d = _hedefli(_besGunluk(), '2026-10-10');
      d = _hedefli(d, '2026-10-11');
      d = _hafif(d, '2026-10-15');
      expect(d.kirilanSeri, 5); // 2 günlük seri 5'i ezmez
      expect(d.geriKazanmaGun, 0);
    });

    test('kısa seri (3 günden az) için geri kazanma yok', () {
      var d = const OgrenciDurumu(haftalikHedefGun: 7);
      d = _hedefli(_hedefli(d, '2026-10-01'), '2026-10-02');
      d = _hedefli(d, '2026-10-09');
      expect(d.kirilanSeri, 0);
      expect(Motor.geriKazanma(d, '2026-10-09'), isNull);
    });

    test('esnek seri bozulmaz: haftalık hedef tutulduysa kopma yok', () {
      // Hedef 3 gün: Pzt-Sal-Çar çalışıldı, Cuma'ya atlandı → seri sürer.
      var d = const OgrenciDurumu(haftalikHedefGun: 3);
      for (final g in ['2026-10-12', '2026-10-13', '2026-10-14']) {
        d = _hedefli(d, g);
      }
      d = _hedefli(d, '2026-10-16');
      expect(d.seri, 4);
      expect(d.kirilanSeri, 0);
      expect(Motor.gosterilenSeri(d, '2026-10-16'), 4);
    });

    test('henüz ders işlenmeden de kopan seri gösterilir', () {
      final d = _besGunluk();
      expect(Motor.geriKazanma(d, '2026-10-06'), isNull); // dünden devam
      final g = Motor.geriKazanma(d, '2026-10-10');
      expect(g?.kirilan, 5);
      expect(g?.ilerleme, 0);
      expect(g?.bugunTamam, isFalse);
    });

    test('yeni seri eskisine yetişirse bekleyen geri kazanma silinir', () {
      var d = _hafif(_besGunluk(), '2026-10-10'); // kirilan 5, seri 1
      for (var g = 11; g <= 14; g++) {
        d = _hafif(d, '2026-10-$g');
      }
      expect(d.seri, 5);
      expect(d.kirilanSeri, 0);
    });
  });

  group('OgrenciDurumu: eski kayıt uyumu', () {
    test('alanlar yoksa varsayılan', () {
      final d = OgrenciDurumu.fromJson(
        jsonDecode('{"xp": 40, "seri": 4, "sonGun": "2026-10-01"}'),
      );
      expect(d.kirilanSeri, 0);
      expect(d.geriKazanmaGun, 0);
      expect(d.geriKazanmaSon, isNull);
    });

    test('gidiş-dönüş ve bozuk değerler', () {
      final d = OgrenciDurumu(
        kirilanSeri: 9,
        geriKazanmaGun: 2,
        geriKazanmaSon: '2026-10-11',
      );
      final yeni = OgrenciDurumu.fromJson(jsonDecode(jsonEncode(d.toJson())));
      expect(yeni.kirilanSeri, 9);
      expect(yeni.geriKazanmaGun, 2);
      expect(yeni.geriKazanmaSon, '2026-10-11');
      final bozuk = OgrenciDurumu.fromJson({
        'kirilanSeri': -3,
        'geriKazanmaGun': 7,
        'geriKazanmaSon': 'dün',
      });
      expect(bozuk.kirilanSeri, 0);
      expect(bozuk.geriKazanmaGun, 0);
      expect(bozuk.geriKazanmaSon, isNull);
    });
  });

  group('Arayüz', () {
    // uygulamayiAc bugünü 2026-10-15 yapar.
    final kopuk = OgrenciDurumu(
      alan: 'dil',
      seri: 12,
      enSeri: 12,
      sonGun: '2026-10-05',
      geriKazanmaGun: 2,
      geriKazanmaSon: '2026-10-14',
      kirilanSeri: 12,
    );

    testWidgets('ana sayfada satır görünür (bir ilerleme günü)', (
      tester,
    ) async {
      await uygulamayiAc(tester, BellekDepo(kopuk));
      final satir = find.byKey(const ValueKey('geri-kazanma-satiri'));
      expect(satir, findsOneWidget);
      expect(
        GeriKazanmaSatiri.metin(kopuk, '2026-10-15'),
        'Seri geri kazanma: 2/3 gün · eski seri 12 · bugünkü hedefi tamamla',
      );
      expect(find.textContaining('Seri geri kazanma: 2/3 gün'), findsOneWidget);
    });

    testWidgets('bekleyen yoksa satır çizilmez', (tester) async {
      await uygulamayiAc(tester, BellekDepo(const OgrenciDurumu(alan: 'dil')));
      expect(find.byKey(const ValueKey('geri-kazanma-satiri')), findsNothing);
    });

    testWidgets('Profil sekmesinde satır görünür', (tester) async {
      await uygulamayiAc(tester, BellekDepo(kopuk));
      await dokun(tester, find.text('Profil'));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('geri-kazanma-satiri')), findsOneWidget);
    });

    testWidgets('480x600 @1,5: ana sayfa ve Profil taşmaz', (tester) async {
      await uygulamayiAc(
        tester,
        BellekDepo(kopuk),
        kurslar: [sahteKurs],
        boyut: const Size(480, 600),
        metinOlcegi: 1.5,
      );
      expect(find.byKey(const ValueKey('geri-kazanma-satiri')), findsOneWidget);
      expect(tester.takeException(), isNull);
      await dokun(tester, find.text('Profil'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
    });
  });
}
