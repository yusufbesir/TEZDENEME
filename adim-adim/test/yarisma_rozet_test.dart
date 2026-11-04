// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Yarışma rozetleri (motor/basarimlar.dart) saf testleri: ilk/10 tur,
/// hatasız tur, 3 gün üst üste; ve sonuç görünümü puan/rozet satırı widget
/// testi. Yazan: [Claude#yarisma-rozet].
library;

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/basarimlar.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:adim_adim/yarisma/ekranlar/sonuc_gorunumu.dart';
import 'package:adim_adim/yarisma/motor.dart';
import 'package:adim_adim/yarisma/soru_bankasi.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'sahte_icerik.dart';

const _yeniIdler = [
  'yarisma_oyna_1',
  'yarisma_oyna_10',
  'yarisma_hatasiz',
  'yarisma_seri_3',
];

Basarim _b(OgrenciDurumu d, String id) =>
    Basarimlar.hesapla(d, [sahteKurs]).firstWhere((x) => x.id == id);

GunlukKayit _yarisma(String gun, {int dogru = 3, int toplam = 5}) =>
    GunlukKayit(
      gun: gun,
      tur: GunlukKayit.turYarisma,
      dogru: dogru,
      toplam: toplam,
      xp: 5,
    );

void main() {
  group('yarışma rozetleri', () {
    test('dört yeni rozet tanımlı, kimlikleri geçerli, simgesi yarisma', () {
      for (final id in _yeniIdler) {
        final t = Basarimlar.tanimlar.firstWhere((t) => t.id == id);
        expect(t.simge, 'yarisma', reason: id);
        expect(OgrenciDurumu.rozetGecerli(id), isTrue, reason: id);
      }
      // Eski "İlk galibiyet" rozeti korunur.
      expect(Basarimlar.tanimlar.any((t) => t.id == 'yarisma_ilk'), isTrue);
    });

    test('boş durumda hiçbir yarışma rozeti kazanılmamış', () {
      const d = OgrenciDurumu();
      for (final id in _yeniIdler) {
        expect(_b(d, id).kazanildi, isFalse, reason: id);
        expect(_b(d, id).ilerleme, 0, reason: id);
      }
    });

    test('ilk yarışma: tek tur yeter; ders kaydı sayılmaz', () {
      const ders = OgrenciDurumu(
        gunluk: [GunlukKayit(gun: '2026-10-15', tur: GunlukKayit.turDers)],
      );
      expect(_b(ders, 'yarisma_oyna_1').kazanildi, isFalse);
      final d = Motor.yarismaBitir(
        const OgrenciDurumu(),
        40,
        '2026-10-15',
        dogru: 2,
        toplam: 5,
      );
      expect(_b(d, 'yarisma_oyna_1').kazanildi, isTrue);
      expect(_b(d, 'yarisma_oyna_10').ilerleme, 1);
      expect(_b(d, 'yarisma_oyna_10').kazanildi, isFalse);
    });

    test('10 yarışma: aynı gün 10 tur da sayılır', () {
      final d = OgrenciDurumu(
        gunluk: [for (var i = 0; i < 10; i++) _yarisma('2026-10-15')],
      );
      expect(_b(d, 'yarisma_oyna_10').kazanildi, isTrue);
      final dokuz = OgrenciDurumu(
        gunluk: [for (var i = 0; i < 9; i++) _yarisma('2026-10-15')],
      );
      expect(_b(dokuz, 'yarisma_oyna_10').ilerleme, 9);
      expect(_b(dokuz, 'yarisma_oyna_10').kazanildi, isFalse);
    });

    test('hatasız tur: dogru == toplam > 0; 0/0 kayıt sayılmaz', () {
      bool hatasiz(int dogru, int toplam) => _b(
        OgrenciDurumu(
          gunluk: [_yarisma('2026-10-15', dogru: dogru, toplam: toplam)],
        ),
        'yarisma_hatasiz',
      ).kazanildi;
      expect(hatasiz(5, 5), isTrue);
      expect(hatasiz(4, 5), isFalse);
      expect(hatasiz(0, 0), isFalse);
    });

    test('3 gün üst üste: ardışık günler; boşluk seriyi bozar', () {
      final ardisik = OgrenciDurumu(
        gunluk: [
          _yarisma('2026-10-13'),
          _yarisma('2026-10-14'),
          _yarisma('2026-10-14'), // aynı gün ikinci tur tek gün sayılır
          _yarisma('2026-10-15'),
        ],
      );
      expect(Basarimlar.yarismaGunSerisi(ardisik), 3);
      expect(_b(ardisik, 'yarisma_seri_3').kazanildi, isTrue);

      final bosluklu = OgrenciDurumu(
        gunluk: [
          _yarisma('2026-10-13'),
          _yarisma('2026-10-14'),
          _yarisma('2026-10-16'),
        ],
      );
      expect(Basarimlar.yarismaGunSerisi(bosluklu), 2);
      expect(_b(bosluklu, 'yarisma_seri_3').ilerleme, 2);
      expect(_b(bosluklu, 'yarisma_seri_3').kazanildi, isFalse);

      // Ay sınırı ve bozuk tarih.
      final aySiniri = OgrenciDurumu(
        gunluk: [
          _yarisma('2026-10-30'),
          _yarisma('2026-10-31'),
          _yarisma('2026-11-01'),
          _yarisma('bozuk'),
        ],
      );
      expect(Basarimlar.yarismaGunSerisi(aySiniri), 3);
    });

    test('rozetleriIsle yeni yarışma rozetlerini kalıcı kayda ekler', () {
      final d = Motor.yarismaBitir(
        const OgrenciDurumu(),
        50,
        '2026-10-15',
        dogru: 5,
        toplam: 5,
      );
      final yeni = Basarimlar.yeniKazanilan(d, [sahteKurs]);
      expect(yeni, containsAll(['yarisma_oyna_1', 'yarisma_hatasiz']));
      final sonra = Basarimlar.rozetleriIsle(d, [sahteKurs]);
      expect(sonra.rozetler, containsAll(yeni));
      expect(
        identical(Basarimlar.rozetleriIsle(sonra, [sahteKurs]), sonra),
        isTrue,
      );
    });
  });

  group('sonuç görünümü', () {
    testWidgets('Puan · En iyi satırı ve yeni rozet çipleri görünür', (
      tester,
    ) async {
      final oyun = YarismaOyunu(
        sorular: sorulariBul('dil', 'ingilizce-1'),
        can: 0,
        puan: 40,
        asama: YarismaAsama.bitti,
      );
      Widget kur(SonucGorunumu g) => MaterialApp(
        theme: acikTema(),
        home: Scaffold(body: g),
      );

      await tester.pumpWidget(
        kur(
          SonucGorunumu(
            oyun: oyun,
            onTekrar: () {},
            onLobi: () {},
            enIyiPuan: 90,
            yeniRozetler: const ['yarisma_oyna_1', 'yok_boyle_rozet'],
          ),
        ),
      );
      expect(find.text('Puan: 40 · En iyi: 90'), findsOneWidget);
      expect(find.text('İlk yarışma'), findsOneWidget);
      expect(find.text('Oyun bitti'), findsOneWidget);

      // En iyi bilinmiyorsa ya da bu tur daha yüksekse turun puanı yazılır;
      // rozet yoksa çip yok.
      await tester.pumpWidget(
        kur(SonucGorunumu(oyun: oyun, onTekrar: () {}, onLobi: () {})),
      );
      expect(find.text('Puan: 40 · En iyi: 40'), findsOneWidget);
      expect(find.text('İlk yarışma'), findsNothing);
      await tester.pumpWidget(
        kur(
          SonucGorunumu(
            oyun: oyun,
            onTekrar: () {},
            onLobi: () {},
            enIyiPuan: 10,
          ),
        ),
      );
      expect(find.text('Puan: 40 · En iyi: 40'), findsOneWidget);
    });
  });
}
