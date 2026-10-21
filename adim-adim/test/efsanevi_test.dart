// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Efsanevi zor tekrar (ÖZELLİK 43): geçme eşiği ve süre, ünitenin altın
/// olması, başarısızlıkta HİÇBİR durum değişmemesi (SRS, hata defteri, XP),
/// ipucusuz akış, süre dolması, eski kayıtla uyumluluk ve ana sayfa düğmesi.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/efsanevi.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

const _kursId = 'efs-1';
const _ders = 'efs-1.u1.d1';

final Kurs _kurs = Kurs(
  id: _kursId,
  ad: 'Efsanevi Kurs',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'efs-1.u1',
      ad: 'Efsane Ünitesi',
      dersler: [
        Ders(
          id: _ders,
          ad: 'Ders Bir',
          alistirmalar: [
            for (var i = 0; i < 10; i++)
              Secim(
                soru: 'Soru $i',
                secenekler: const ['yanlis', 'dogru'],
                dogru: 1,
                ipuclari: const ['İlk ipucu'],
              ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'efs-1.u2',
      ad: 'İkinci',
      dersler: [
        Ders(
          id: 'efs-1.u2.d1',
          ad: 'Ders İki',
          alistirmalar: const [
            Secim(soru: 'S', secenekler: ['a', 'b'], dogru: 0),
          ],
        ),
      ],
    ),
  ],
);

const _biten = OgrenciDurumu(
  alan: 'dil',
  tamamlanan: {_ders: 1},
  xp: 120,
  hatalar: [
    HataKaydi(tur: 'kart', id: '$_ders#2', seviye: _kursId, gun: '2026-10-10'),
  ],
  kartlar: {'$_ders#1': Kart(kutu: 2, sonraki: '2026-10-20')},
);

Future<ProviderContainer> _ac(
  WidgetTester tester, {
  OgrenciDurumu durum = _biten,
}) => uygulamayiAc(tester, BellekDepo(durum), kurslar: [_kurs]);

Future<void> _git(WidgetTester tester, ProviderContainer kap) async {
  kap.read(yonlendiriciProvider).push('/efsanevi?kurs=$_kursId&unite=0');
  await tester.pump();
  await tester.pump(const Duration(seconds: 1));
}

/// Sayaç çalışırken pumpAndSettle kullanılamaz.
Future<void> _tikla(WidgetTester tester, Finder f) async {
  await tester.ensureVisible(f);
  await tester.tap(f);
  await tester.pump(const Duration(milliseconds: 300));
}

Future<void> _cevapla(WidgetTester tester, bool dogru) async {
  await _tikla(tester, find.text(dogru ? 'dogru' : 'yanlis'));
  await _tikla(tester, find.text('Kontrol et'));
  final bitir = find.text('Bitir');
  await _tikla(
    tester,
    bitir.evaluate().isNotEmpty ? bitir : find.text('Devam'),
  );
}

void main() {
  group('Efsanevi motoru', () {
    test('geçme eşiği %90, tam sayı karşılaştırması', () {
      expect(Efsanevi.gecti(10, 10), isTrue);
      expect(Efsanevi.gecti(9, 10), isTrue);
      expect(Efsanevi.gecti(8, 10), isFalse);
      expect(Efsanevi.gecti(18, 20), isTrue);
      expect(Efsanevi.gecti(17, 20), isFalse);
      expect(Efsanevi.gecti(0, 0), isFalse);
      expect(Efsanevi.gecti(1, 1), isTrue);
    });

    test('süre: soru başına 15 sn', () {
      expect(Efsanevi.soruBasinaSaniye, 15);
      expect(Efsanevi.sureSn(10), 150);
      expect(Efsanevi.sureSn(0), 0);
    });

    test('yalnız biten ünitede açık; sorular tohumla deterministik', () {
      expect(Efsanevi.acik(const OgrenciDurumu(), _kurs, 0), isFalse);
      expect(Efsanevi.acik(_biten, _kurs, 0), isTrue);
      expect(Efsanevi.acik(_biten, _kurs, 1), isFalse);
      expect(Efsanevi.acik(_biten, _kurs, 9), isFalse);
      final a = Efsanevi.sec(_kurs, 0, tohum: 3).map((s) => s.kartId).toList();
      final b = Efsanevi.sec(_kurs, 0, tohum: 3).map((s) => s.kartId).toList();
      expect(a, b);
      expect(a.length, Motor.araSinavAdet);
    });

    test(
      'altinYap yalnız altinUniteler alanını değiştirir (SRS dokunulmaz)',
      () {
        final yeni = Efsanevi.altinYap(_biten, 'efs-1.u1');
        expect(yeni.altinUniteler, {'efs-1.u1'});
        expect(Efsanevi.altinMi(yeni, _kurs.uniteler[0]), isTrue);
        expect(Efsanevi.altinMi(yeni, _kurs.uniteler[1]), isFalse);
        final a = Map.of(yeni.toJson())..remove('altinUniteler');
        final b = Map.of(_biten.toJson())..remove('altinUniteler');
        expect(a, b);
        // Tekrar altın yapmak aynı durumu döndürür; geçersiz kimlik yok sayılır.
        expect(identical(Efsanevi.altinYap(yeni, 'efs-1.u1'), yeni), isTrue);
        expect(identical(Efsanevi.altinYap(yeni, 'x#1'), yeni), isTrue);
        expect(identical(Efsanevi.altinYap(yeni, ''), yeni), isTrue);
      },
    );
  });

  group('durum uyumluluğu', () {
    test('eski kayıtta altinUniteler yok: boş küme', () {
      final d = OgrenciDurumu.fromJson({'surum': 1, 'xp': 5, 'alan': 'dil'});
      expect(d.altinUniteler, isEmpty);
      expect(d.xp, 5);
    });

    test('gidiş-dönüş ve bozuk girdiler atılır', () {
      final d = OgrenciDurumu.fromJson({
        'altinUniteler': ['a.u1', 'b#2', 5, '', 'a.u1', 'c.u3'],
      });
      expect(d.altinUniteler, {'a.u1', 'c.u3'});
      final tekrar = OgrenciDurumu.fromJson(d.toJson());
      expect(tekrar.altinUniteler, {'a.u1', 'c.u3'});
      expect(
        OgrenciDurumu.fromJson({'altinUniteler': 'x'}).altinUniteler,
        isEmpty,
      );
    });
  });

  group('arayüz', () {
    testWidgets('düğme yalnız ünite bitince; altın olunca etiket ve simge', (
      tester,
    ) async {
      await _ac(tester, durum: const OgrenciDurumu(alan: 'dil'));
      expect(find.byKey(const ValueKey('efsanevi-efs-1.u1')), findsNothing);
    });

    testWidgets('bitmiş ünitede düğme; doğru cevaplarla ünite altın olur', (
      tester,
    ) async {
      final kap = await _ac(tester);
      expect(find.byKey(const ValueKey('efsanevi-efs-1.u1')), findsOneWidget);
      expect(find.text('Efsanevi tekrar'), findsOneWidget);
      await dokun(tester, find.byKey(const ValueKey('efsanevi-efs-1.u1')));
      // Süre şeridi: 10 soru x 15 sn = 2:30; ipucu yok.
      expect(find.byKey(const ValueKey('efsanevi-sure')), findsOneWidget);
      expect(find.text('2:30'), findsOneWidget);
      expect(find.text('İpucu yok'), findsOneWidget);
      for (var i = 0; i < 10; i++) {
        await _cevapla(tester, true);
      }
      expect(find.text('Ünite altın oldu'), findsOneWidget);
      final d = kap.read(durumProvider).value!;
      expect(d.altinUniteler, {'efs-1.u1'});
      // SRS, hata defteri ve XP değişmedi.
      expect(d.kartlar, _biten.kartlar);
      expect(d.hatalar.length, 1);
      expect(d.xp, 120);
      await _tikla(tester, find.byKey(const ValueKey('efsanevi-don')));
      await tester.pumpAndSettle();
      expect(find.text('Efsanevi tekrar (altın)'), findsOneWidget);
    });

    testWidgets('yanlış cevaptan sonra ipucu yok; kalınca ceza yok', (
      tester,
    ) async {
      final kap = await _ac(tester);
      await _git(tester, kap);
      // İlk soruyu yanlış cevapla: bantta "İpucu al" çıkmamalı.
      await _tikla(tester, find.text('yanlis'));
      await _tikla(tester, find.text('Kontrol et'));
      expect(find.text('Yanlış'), findsOneWidget);
      expect(find.byKey(const Key('ipucu-al')), findsNothing);
      expect(find.text('İpucu al'), findsNothing);
      expect(find.text('Yine de geç'), findsNothing);
      await _tikla(tester, find.text('Devam'));
      // İkinci yanlış: toplam 2 yanlış -> %80, geçemez.
      await _cevapla(tester, false);
      for (var i = 0; i < 8; i++) {
        await _cevapla(tester, true);
      }
      expect(find.text('Bu sefer olmadı'), findsOneWidget);
      expect(find.textContaining('8/10 doğru'), findsOneWidget);
      final d = kap.read(durumProvider).value!;
      // Ceza yok: hiçbir alan değişmedi.
      expect(d.toJson(), _biten.toJson());
      expect(d.altinUniteler, isEmpty);
      // Yeniden dene yeni oturum açar.
      await _tikla(tester, find.byKey(const ValueKey('efsanevi-tekrar')));
      expect(find.byKey(const ValueKey('efsanevi-sure')), findsOneWidget);
      expect(find.text('2:30'), findsOneWidget);
    });

    testWidgets('bir yanlışa izin var (9/10 geçer)', (tester) async {
      final kap = await _ac(tester);
      await _git(tester, kap);
      await _cevapla(tester, false);
      for (var i = 0; i < 9; i++) {
        await _cevapla(tester, true);
      }
      expect(find.text('Ünite altın oldu'), findsOneWidget);
      expect(kap.read(durumProvider).value!.altinUniteler, {'efs-1.u1'});
    });

    testWidgets('süre dolunca "Süre doldu"; hiçbir şey değişmez', (
      tester,
    ) async {
      final kap = await _ac(tester);
      await _git(tester, kap);
      await tester.pump(const Duration(seconds: 151));
      expect(find.text('Süre doldu'), findsOneWidget);
      expect(find.textContaining('Ceza yok'), findsOneWidget);
      final d = kap.read(durumProvider).value!;
      expect(d.toJson(), _biten.toJson());
    });

    testWidgets('açık olmayan ünitede "bitince açılır" ekranı', (tester) async {
      final kap = await _ac(tester, durum: const OgrenciDurumu(alan: 'dil'));
      await _git(tester, kap);
      expect(
        find.text('Efsanevi tekrar, ünite bitince açılır'),
        findsOneWidget,
      );
    });
  });
}
