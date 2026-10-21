// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// ÖZELLİK 51 testleri: ay ve yıl özeti yalnız kayıtlı verilerden hesaplanır
/// (biten ders, yeni kart, XP, çalışılan gün, süre, en iyi gün, en çok
/// çalışılan konu, en güçlü ünite), boş dönem, metin raporu ve ekran
/// (480x600 @1,5 taşma yok; Ay/Yıl geçişi; kopyalama).
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/motor/ozet.dart';
import 'package:adim_adim/uygulama.dart' show yonlendiriciProvider;
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

/// Eylül: 1 ders (4/5, 18 XP, 300 sn). Ekim: 2 ders (5/5 25 XP + 4/5 18 XP),
/// 600 sn, 2 yeni kart.
OgrenciDurumu _veri() {
  var d = const OgrenciDurumu(alan: 'dil', haftalikHedefGun: 7);
  d = Motor.dersBitir(d, sahteDers1, 4, 5, '2026-09-30', sureSn: 300);
  d = Motor.dersBitir(d, sahteDers2, 5, 5, '2026-10-01', sureSn: 600);
  d = Motor.dersBitir(d, sahteDers1, 4, 5, '2026-10-02');
  d = Motor.kartEkle(d, '$sahteDers1#0', '2026-10-01');
  d = Motor.kartEkle(d, '$sahteDers1#1', '2026-10-02');
  d = Motor.kartEkle(d, '$sahteDers1#1', '2026-10-03'); // yinelenen: sayılmaz
  return d;
}

void main() {
  group('hesap', () {
    test('aylar ve yıllar: kayıtlı olanlar, en yeni önce', () {
      final d = _veri();
      expect(Ozet.aylar(d), ['2026-10', '2026-09']);
      expect(Ozet.yillar(d), ['2026']);
      expect(Ozet.aylar(const OgrenciDurumu()), isEmpty);
    });

    test('ay özeti yalnız o ayın kayıtlarını toplar', () {
      final o = Ozet.ay(_veri(), '2026-10');
      expect(o.dersler, 2);
      expect(o.yeniKart, 2);
      expect(o.xp, 25 + 18);
      expect(o.aktifGun, 2);
      expect(o.sureSn, 600);
      expect(o.enIyiGun, '2026-10-01');
      expect(o.enIyiGunXp, 25);
      expect(o.enCokKurs, sahteKursId);
      expect(o.enCokKursDers, 2);
      expect(o.bos, isFalse);
    });

    test('yıl özeti ayları toplar', () {
      final o = Ozet.yil(_veri(), '2026');
      expect(o.dersler, 3);
      expect(o.xp, 18 + 25 + 18);
      expect(o.sureSn, 900);
      expect(o.aktifGun, 3);
      expect(o.enIyiGun, '2026-10-01');
      expect(o.enCokKursDers, 3);
    });

    test('kaydı olmayan dönem boştur; uydurma değer yok', () {
      final o = Ozet.ay(_veri(), '2025-01');
      expect(o.bos, isTrue);
      expect(o.enIyiGun, isNull);
      expect(o.enCokKurs, isNull);
      expect(Ozet.metin(o), contains('kayıtlı veri yok'));
      expect(Ozet.yil(const OgrenciDurumu(), '2026').bos, isTrue);
    });

    test('özellikten önceki kayıt: günlükteki ders kayıtları sayılır', () {
      final d = OgrenciDurumu(
        gunlukXp: const {'2026-08-05': 30},
        gunluk: const [
          GunlukKayit(gun: '2026-08-05', tur: GunlukKayit.turDers, xp: 30),
        ],
      );
      final o = Ozet.ay(d, '2026-08');
      expect(o.dersler, 1);
      expect(o.yeniKart, 0); // sayaç yok: 0, uydurma yok
      expect(o.enCokKurs, isNull);
    });

    test('en güçlü ünite: ustalığı en yüksek, hiç ders yoksa null', () {
      expect(Ozet.enGucluUnite(const OgrenciDurumu(), [sahteKurs]), isNull);
      final g = Ozet.enGucluUnite(_veri(), [sahteKurs])!;
      expect(g.kursAd, 'Sahte Kurs');
      expect(g.uniteAd, 'Sahte Ünite');
      expect(g.ustalik, greaterThan(0));
    });

    test('metin raporu satırları', () {
      final d = _veri();
      final m = Ozet.metin(
        Ozet.ay(d, '2026-10'),
        kursAdi: (id) => 'Kurs($id)',
        enGuclu: Ozet.enGucluUnite(d, [sahteKurs]),
      );
      expect(m, contains('Ekim 2026'));
      expect(m, contains('Biten ders: 2'));
      expect(m, contains('Yeni kart: 2'));
      expect(m, contains('Kazanılan XP: 43'));
      expect(m, contains('Çalışma süresi: 10 dk'));
      expect(m, contains('En iyi gün: 2026-10-01 (25 XP)'));
      expect(m, contains('En çok çalışılan konu: Kurs(sahte-1) (2 ders)'));
      expect(m, contains('En güçlü ünite: Sahte Ünite'));
    });

    test('başlık: ay adı ve yıl', () {
      expect(Ozet.baslik('2026-03'), 'Mart 2026');
      expect(Ozet.baslik('2026-12'), 'Aralık 2026');
      expect(Ozet.baslik('2026'), '2026');
    });
  });

  group('kart sayacı', () {
    test(
      'ilk kez oluşan kart ayın sayacını artırır, tekrar cevap artırmaz',
      () {
        var d = Motor.kartIsle(
          const OgrenciDurumu(),
          'a.u1.d1#0',
          true,
          '2026-10-05',
        );
        expect(d.aylikKart, {'2026-10': 1});
        d = Motor.kartIsle(d, 'a.u1.d1#0', false, '2026-10-06');
        expect(d.aylikKart, {'2026-10': 1});
        d = Motor.kartIsle(d, 'a.u1.d1#1', true, '2026-11-01');
        expect(d.aylikKart, {'2026-10': 1, '2026-11': 1});
      },
    );
  });

  group('ekran', () {
    testWidgets('Ay özeti, Yıl geçişi, boş dönem ve kopyalama', (tester) async {
      String? pano;
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (call) async {
          if (call.method == 'Clipboard.setData') {
            pano = (call.arguments as Map)['text'] as String?;
          }
          return null;
        },
      );
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        ),
      );
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(_veri()),
        boyut: const Size(480, 600),
        metinOlcegi: 1.5,
      );
      kap.read(yonlendiriciProvider).push('/ozet');
      await tester.pumpAndSettle();

      expect(find.text('Ekim 2026'), findsWidgets);
      expect(find.byKey(const ValueKey('ozet-baslik')), findsOneWidget);
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('ozet-ders')),
          matching: find.text('2'),
        ),
        findsOneWidget,
      );
      expect(
        find.textContaining('En güçlü ünite: Sahte Ünite'),
        findsOneWidget,
      );
      expect(find.textContaining('kelime öğrendin'), findsOneWidget);

      // Eylül'e geç.
      await dokun(tester, find.byKey(const ValueKey('ozet-donem-2026-09')));
      expect(
        tester.widget<Text>(find.byKey(const ValueKey('ozet-baslik'))).data,
        'Eylül 2026',
      );
      // Yıl.
      await dokun(tester, find.text('Yıl'));
      expect(
        tester.widget<Text>(find.byKey(const ValueKey('ozet-baslik'))).data,
        '2026',
      );
      expect(
        find.descendant(
          of: find.byKey(const ValueKey('ozet-ders')),
          matching: find.text('3'),
        ),
        findsOneWidget,
      );

      await dokun(tester, find.byKey(const ValueKey('ozet-kopyala')));
      expect(find.text('Özet kopyalandı'), findsOneWidget);
      expect(pano, contains('Adım Adım özeti: 2026'));
      expect(pano, contains('Biten ders: 3'));
      expect(tester.takeException(), isNull);
    });

    testWidgets('veri yokken bugünün ayı ve "kayıtlı veri yok"', (
      tester,
    ) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        boyut: const Size(480, 600),
        metinOlcegi: 1.5,
      );
      kap.read(yonlendiriciProvider).push('/ozet');
      await tester.pumpAndSettle();
      expect(
        tester.widget<Text>(find.byKey(const ValueKey('ozet-baslik'))).data,
        'Ekim 2026',
      );
      expect(find.byKey(const ValueKey('ozet-bos')), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
