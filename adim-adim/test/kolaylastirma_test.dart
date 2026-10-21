// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// ÖZELLİK 50 testleri: üst üste başarısız deneme sayacı, kolaylaştırma
/// önerisi (kolay ders, tekrar, zayıf noktalar, yeniden dene), eski kayıt
/// uyumu ve ders özetindeki öneri satırı (480x600 @1,5 taşma yok).
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/kolaylastirma.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/uygulama.dart' show yonlendiriciProvider;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

const _bugun = '2026-10-15';

/// 4 ders: d1 kolay (seçim), d2 en kolay (seçim, daha önce), d3 zor (yazma),
/// d4 zor (yazma). Zorluk: seçim 1, yazma 2 (orta).
final Kurs _kurs = Kurs(
  id: 'kol-1',
  ad: 'Kolay Kurs',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'kol-1.u1',
      ad: 'Ünite',
      dersler: [
        Ders(
          id: 'kol-1.u1.d1',
          ad: 'Karışık Ders',
          alistirmalar: const [
            Secim(soru: 'Bir', secenekler: ['a', 'b'], dogru: 0),
            Yaz(soru: 'İki', cevaplar: ['x']),
          ],
        ),
        Ders(
          id: 'kol-1.u1.d2',
          ad: 'Kolay Ders',
          alistirmalar: const [
            Secim(soru: 'Üç', secenekler: ['a', 'b'], dogru: 0),
            Secim(soru: 'Dört', secenekler: ['a', 'b'], dogru: 1),
          ],
        ),
        Ders(
          id: 'kol-1.u1.d3',
          ad: 'Zor Ders',
          alistirmalar: const [
            Yaz(soru: 'Beş', cevaplar: ['x']),
          ],
        ),
        Ders(
          id: 'kol-1.u1.d4',
          ad: 'Zor Ders İki',
          alistirmalar: const [
            Yaz(soru: 'Altı', cevaplar: ['x']),
          ],
        ),
      ],
    ),
  ],
);

/// Başarısız (0/2) ders bitişi.
OgrenciDurumu _kotu(OgrenciDurumu d, String id) =>
    Motor.dersBitir(d, id, 0, 2, _bugun);

/// Başarılı (2/2) ders bitişi.
OgrenciDurumu _iyi(OgrenciDurumu d, String id) =>
    Motor.dersBitir(d, id, 2, 2, _bugun);

void main() {
  group('sayaç', () {
    test('başarı eşiği %60: 3/5 başarılı, 2/5 başarısız, toplam 0 değil', () {
      expect(Motor.basarisizMi(3, 5), isFalse);
      expect(Motor.basarisizMi(2, 5), isTrue);
      expect(Motor.basarisizMi(0, 0), isFalse);
      expect(Motor.basarisizMi(6, 10), isFalse);
      expect(Motor.basarisizMi(5, 10), isTrue);
    });

    test('başarısız bitişler artar, başarılı bitiş sıfırlar', () {
      var d = _kotu(const OgrenciDurumu(), 'kol-1.u1.d3');
      expect(d.ardisikBasarisiz, 1);
      expect(d.sonBasarisizDers, 'kol-1.u1.d3');
      d = _kotu(d, 'kol-1.u1.d4');
      expect(d.ardisikBasarisiz, 2);
      expect(d.sonBasarisizDers, 'kol-1.u1.d4');
      d = _iyi(d, 'kol-1.u1.d1');
      expect(d.ardisikBasarisiz, 0);
      expect(d.sonBasarisizDers, isNull);
    });

    test('toplamı 0 olan bitiş sayacı değiştirmez', () {
      final d = _kotu(const OgrenciDurumu(), 'kol-1.u1.d3');
      final e = Motor.dersBitir(d, 'kol-1.u1.d3', 0, 0, _bugun);
      expect(e.ardisikBasarisiz, 1);
    });
  });

  group('öneri', () {
    test('tek başarısız denemede öneri yok', () {
      final d = _kotu(const OgrenciDurumu(), 'kol-1.u1.d3');
      expect(Kolaylastirma.oner(d, [_kurs], _bugun), isNull);
    });

    test('iki başarısızda daha önce bitmiş en kolay ders önerilir', () {
      // d1 (karışık) ve d2 (kolay) bitmiş; d3, d4 başarısız.
      var d = _iyi(_iyi(const OgrenciDurumu(), 'kol-1.u1.d1'), 'kol-1.u1.d2');
      d = _kotu(_kotu(d, 'kol-1.u1.d3'), 'kol-1.u1.d4');
      final o = Kolaylastirma.oner(d, [_kurs], _bugun)!;
      expect(o.tur, 'ders');
      expect(o.dersId, 'kol-1.u1.d2'); // en düşük ortalama zorluk
      expect(o.mesaj, contains('Kolay Ders'));
    });

    test(
      'bitmemiş ya da daha zor dersler önerilmez; tekrar bekliyorsa tekrar',
      () {
        // d1 bitmedi; yalnız d3 bitmiş (başarısız dersle aynı zorlukta, öneri yok).
        var d = _kotu(
          _kotu(const OgrenciDurumu(), 'kol-1.u1.d3'),
          'kol-1.u1.d4',
        );
        d = d.copyWith(
          kartlar: {
            ...d.kartlar,
            'kol-1.u1.d1#0': const Kart(kutu: 1, sonraki: _bugun),
            'kol-1.u1.d1#1': const Kart(kutu: 1, sonraki: '2026-10-10'),
          },
        );
        final o = Kolaylastirma.oner(d, [_kurs], _bugun)!;
        expect(o.tur, 'tekrar');
        expect(o.mesaj, contains('2 kartı'));
      },
    );

    test('tekrar yok ama hata defteri doluysa zayıf noktalar dersi', () {
      var d = _kotu(_kotu(const OgrenciDurumu(), 'kol-1.u1.d3'), 'kol-1.u1.d4');
      d = d.copyWith(
        hatalar: const [
          HataKaydi(
            tur: HataKaydi.turKart,
            id: 'kol-1.u1.d1#0',
            seviye: 'kol-1',
            gun: _bugun,
          ),
        ],
      );
      expect(Kolaylastirma.oner(d, [_kurs], _bugun)!.tur, 'zayif');
    });

    test(
      'hiçbiri yoksa aynı dersi yeniden dene; ders bulunamazsa da çalışır',
      () {
        final d = _kotu(
          _kotu(const OgrenciDurumu(), 'kol-1.u1.d3'),
          'kol-1.u1.d4',
        );
        final o = Kolaylastirma.oner(d, [_kurs], _bugun)!;
        expect(o.tur, 'yeniden');
        expect(o.dersId, 'kol-1.u1.d4');
        // Başarısız ders içerikte yoksa (ör. kurs kaldırıldı) kolay ders aranmaz.
        final y = Kolaylastirma.oner(d, const [], _bugun)!;
        expect(y.tur, 'yeniden');
      },
    );

    test('atlanan (seviye sınavı) ders de "bitmiş" sayılır', () {
      var d = const OgrenciDurumu(atlananDersler: {'kol-1.u1.d2'});
      d = _kotu(_kotu(d, 'kol-1.u1.d3'), 'kol-1.u1.d4');
      expect(Kolaylastirma.oner(d, [_kurs], _bugun)!.dersId, 'kol-1.u1.d2');
    });
  });

  group('eski kayıt', () {
    test('sayaç alanları yoksa 0/null; kaydedilip geri okunur', () {
      final eski = OgrenciDurumu.fromJson({'xp': 3});
      expect(eski.ardisikBasarisiz, 0);
      expect(eski.sonBasarisizDers, isNull);
      expect(Kolaylastirma.oner(eski, [_kurs], _bugun), isNull);
      final d = _kotu(const OgrenciDurumu(), 'kol-1.u1.d3');
      final geri = OgrenciDurumu.fromJson(d.toJson());
      expect(geri.ardisikBasarisiz, 1);
      expect(geri.sonBasarisizDers, 'kol-1.u1.d3');
    });
  });

  group('arayüz', () {
    testWidgets(
      'ikinci başarısız denemeden sonra özette kolay ders önerisi çıkar',
      (tester) async {
        // d2 bitmiş (kolay), d3 daha önce bir kez başarısız olmuş.
        final depo = BellekDepo(
          OgrenciDurumu(
            alan: 'dil',
            tamamlanan: const {'kol-1.u1.d1': 1, 'kol-1.u1.d2': 1},
            ardisikBasarisiz: 1,
            sonBasarisizDers: 'kol-1.u1.d3',
          ),
        );
        final kap = await uygulamayiAc(
          tester,
          depo,
          kurslar: [_kurs],
          boyut: const Size(480, 600),
          metinOlcegi: 1.5,
        );
        kap.read(yonlendiriciProvider).push('/ders/kol-1.u1.d3');
        await tester.pumpAndSettle();
        await tester.enterText(find.byType(TextField), 'yanlış');
        await tester.pump();
        await dokun(tester, find.text('Kontrol et'));
        expect(find.text('Yanlış'), findsOneWidget);
        await dokun(tester, find.text('Bitir'));

        expect(find.text('Ders tamamlandı'), findsOneWidget);
        expect(kap.read(durumProvider).value!.ardisikBasarisiz, 2);
        expect(
          find.byKey(const ValueKey('kolaylastirma-onerisi')),
          findsOneWidget,
        );
        expect(find.textContaining('Kolay Ders'), findsWidgets);

        // Düğme önerilen derse götürür.
        await dokun(tester, find.byKey(const ValueKey('kolaylastirma-git')));
        expect(find.textContaining('Üç'), findsOneWidget);
        expect(tester.takeException(), isNull);
      },
    );

    testWidgets('başarılı bitişte öneri satırı yoktur', (tester) async {
      final depo = BellekDepo(
        const OgrenciDurumu(
          alan: 'dil',
          tamamlanan: {'kol-1.u1.d1': 1, 'kol-1.u1.d2': 1},
          ardisikBasarisiz: 2,
          sonBasarisizDers: 'kol-1.u1.d3',
        ),
      );
      final kap = await uygulamayiAc(tester, depo, kurslar: [_kurs]);
      await dokun(tester, find.textContaining('Zor Ders').first);
      await tester.enterText(find.byType(TextField), 'x');
      await tester.pump();
      await dokun(tester, find.text('Kontrol et'));
      await dokun(tester, find.text('Bitir'));
      expect(find.text('Ders tamamlandı'), findsOneWidget);
      expect(kap.read(durumProvider).value!.ardisikBasarisiz, 0);
      expect(find.byKey(const ValueKey('kolaylastirma-onerisi')), findsNothing);
    });
  });
}
