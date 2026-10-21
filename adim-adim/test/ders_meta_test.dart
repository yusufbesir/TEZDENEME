// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Ders adımı meta verisi ve ustalık puanı (ÖZELLİK 71): zorluk/süre
/// hesabı, temel kavram, durum alanları (eski kayıtla uyum, JSON turu),
/// Motor.dersBitir kaydı, ustalık hesabı; yol listesinde dakika/temel işareti,
/// ders sonu ve ünite özetinde ustalık kartı, 480x600 @1,5 taşma.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/ders_meta.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

const _kolay = Secim(soru: 'Kedi?', secenekler: ['a', 'b'], dogru: 0);

void main() {
  group('DersMeta.adim', () {
    test('türe göre zorluk ve süre', () {
      expect(DersMeta.adim(_kolay).zorluk, Zorluk.kolay);
      expect(DersMeta.adim(_kolay).saniye, 15);
      const yaz = Yaz(soru: 'Yaz', cevaplar: ['Danke']);
      expect(DersMeta.adim(yaz).zorluk, Zorluk.orta);
      expect(DersMeta.adim(yaz).saniye, 27); // 25 + 5~/2
      const uzunYaz = Yaz(
        soru: 'Yaz',
        cevaplar: ['Wie geht es dir heute abend'],
      );
      expect(DersMeta.adim(uzunYaz).zorluk, Zorluk.zor);
      const dinle = Dinle(
        soru: 'D',
        okunacak: 'x',
        secenekler: ['x', 'y'],
        dogru: 0,
      );
      expect(DersMeta.adim(dinle).zorluk, Zorluk.orta);
      const kisaEs = Eslestir(
        soru: 'E',
        ciftler: [(sol: 'a', sag: 'b'), (sol: 'c', sag: 'd')],
      );
      const uzunEs = Eslestir(
        soru: 'E',
        ciftler: [
          (sol: 'a', sag: 'b'),
          (sol: 'c', sag: 'd'),
          (sol: 'e', sag: 'f'),
          (sol: 'g', sag: 'h'),
          (sol: 'i', sag: 'j'),
        ],
      );
      expect(DersMeta.adim(kisaEs).zorluk, Zorluk.orta);
      expect(DersMeta.adim(uzunEs).zorluk, Zorluk.orta); // puan 3 -> orta
      expect(DersMeta.adim(uzunEs).saniye, 55);
      expect(DersMeta.adim(kisaEs).saniye, 31);
      const tablo = Tablo(
        soru: 'T',
        baslik: ['a', 'b'],
        satirlar: [
          ['x', 'y'],
          ['z', 'w'],
          ['p', 'q'],
          ['r', 's'],
        ],
        bos: [
          (satir: 0, sutun: 1),
          (satir: 1, sutun: 1),
          (satir: 2, sutun: 1),
          (satir: 3, sutun: 1),
        ],
      );
      expect(DersMeta.adim(tablo).zorluk, Zorluk.zor);
      const soyle = Soyle(soru: 'S', metin: 'Hello there', ceviri: 'Selam');
      expect(DersMeta.adim(soyle).zorluk, Zorluk.orta);
      const hamle = Hamle(
        soru: 'H',
        fen: 'f',
        hamleler: ['e2e4', 'e7e5', 'g1f3'],
      );
      expect(DersMeta.adim(hamle).zorluk, Zorluk.zor);
    });

    test('uzun soru süreyi uzatır', () {
      const uzun = Secim(
        soru: 'Bu oldukça uzun bir soru metnidir, tam yirmi dört',
        secenekler: ['a', 'b'],
        dogru: 0,
      );
      expect(DersMeta.adim(uzun).saniye, greaterThan(15));
    });
  });

  group('DersMeta ders/ünite', () {
    const ders = Ders(
      id: 'k.u1.d1',
      ad: 'D',
      alistirmalar: [_kolay, _kolay, _kolay, _kolay], // 60 sn
    );
    test('dakika yukarı yuvarlanır; dağılım; temel kavram', () {
      expect(DersMeta.dersSaniye(ders), 60);
      expect(DersMeta.dersDakika(ders), 1);
      const uzun = Ders(
        id: 'k.u1.d2',
        ad: 'U',
        alistirmalar: [_kolay, _kolay, _kolay, _kolay, _kolay],
      );
      expect(DersMeta.dersDakika(uzun), 2); // 75 sn
      expect(
        DersMeta.dersDakika(const Ders(id: 'x', ad: 'B', alistirmalar: [])),
        0,
      );
      expect(DersMeta.dagilim(ders)[Zorluk.kolay], 4);
      expect(DersMeta.dagilim(ders)[Zorluk.zor], 0);
      expect(DersMeta.adimTemelMi(0), isTrue);
      expect(DersMeta.adimTemelMi(1), isFalse);
      expect(DersMeta.dersTemelMi(ders), isFalse);
      expect(
        DersMeta.dersTemelMi(
          const Ders(
            id: 'k.u1.d3',
            ad: 'N',
            alistirmalar: [_kolay],
            dilbilgisiNotu: ' not ',
          ),
        ),
        isTrue,
      );
      expect(
        DersMeta.dersTemelMi(
          const Ders(
            id: 'k.u1.d4',
            ad: 'N',
            alistirmalar: [_kolay],
            dilbilgisiNotu: '  ',
          ),
        ),
        isFalse,
      );
      expect(
        DersMeta.uniteDakika(Unite(id: 'u', ad: 'U', dersler: [ders, uzun])),
        3, // 135 sn
      );
    });

    test('süre metni', () {
      expect(DersMeta.sureMetni(0), '0 dk');
      expect(DersMeta.sureMetni(45), '45 sn');
      expect(DersMeta.sureMetni(125), '2 dk');
      expect(DersMeta.sureMetni(3600), '1 sa');
      expect(DersMeta.sureMetni(3900), '1 sa 5 dk');
    });
  });

  group('durum alanları', () {
    test('eski kayıtta yoksa varsayılan boş', () {
      final d = OgrenciDurumu.fromJson({'xp': 5});
      expect(d.dersEnIyi, isEmpty);
      expect(d.dersSureSn, isEmpty);
      expect(DersMeta.enIyiPuan(d, 'k.u1.d1'), isNull);
      expect(DersMeta.calismaSaniye(d, 'k.u1.d1'), 0);
      expect(DersMeta.dersUstalik(d, 'k.u1.d1'), 0);
    });

    test('JSON turu korunur; bozuk girdi atılır', () {
      const d = OgrenciDurumu(
        dersEnIyi: {'k.u1.d1': 80},
        dersSureSn: {'k.u1.d1': 300},
      );
      final r = OgrenciDurumu.fromJson(d.toJson());
      expect(r.dersEnIyi, {'k.u1.d1': 80});
      expect(r.dersSureSn, {'k.u1.d1': 300});
      final bozuk = OgrenciDurumu.fromJson({
        'dersEnIyi': {'a.b': 150, 'c#1': 50, 'd': 'x', 'e': -3, 'f': 90},
        'dersSureSn': 'metin',
      });
      expect(bozuk.dersEnIyi, {'f': 90});
      expect(bozuk.dersSureSn, isEmpty);
    });

    test('copyWith diğer alanları korur', () {
      const d = OgrenciDurumu(xp: 7, dersEnIyi: {'a': 1});
      final y = d.copyWith(dersSureSn: {'a': 9});
      expect(y.xp, 7);
      expect(y.dersEnIyi, {'a': 1});
      expect(y.dersSureSn, {'a': 9});
    });
  });

  group('Motor.dersBitir ustalık verisi', () {
    test('en iyi puan düşmez, süre birikir ve tavanlanır', () {
      var d = Motor.dersBitir(
        const OgrenciDurumu(),
        'k.u1.d1',
        3,
        4,
        '2026-10-15',
        sureSn: 100,
      );
      expect(d.dersEnIyi['k.u1.d1'], 75);
      expect(d.dersSureSn['k.u1.d1'], 100);
      d = Motor.dersBitir(d, 'k.u1.d1', 1, 4, '2026-10-15', sureSn: 50);
      expect(d.dersEnIyi['k.u1.d1'], 75);
      expect(d.dersSureSn['k.u1.d1'], 150);
      d = Motor.dersBitir(d, 'k.u1.d1', 4, 4, '2026-10-15', sureSn: 99999);
      expect(d.dersEnIyi['k.u1.d1'], 100);
      expect(d.dersSureSn['k.u1.d1'], 150 + 3600);
      expect(d.tamamlanan['k.u1.d1'], 3);
      // Süre verilmezse 0 eklenir (eski çağrı biçimi).
      final e = Motor.dersBitir(
        const OgrenciDurumu(),
        'k.u1.d2',
        2,
        2,
        '2026-10-15',
      );
      expect(e.dersSureSn['k.u1.d2'], 0);
      expect(e.dersEnIyi['k.u1.d2'], 100);
    });

    test('ustalık: bitirilmediyse 0, en iyi puan ve tekrarla artar', () {
      const u = Unite(
        id: 'k.u1',
        ad: 'U',
        dersler: [
          Ders(id: 'k.u1.d1', ad: 'a', alistirmalar: [_kolay]),
          Ders(id: 'k.u1.d2', ad: 'b', alistirmalar: [_kolay]),
        ],
      );
      const bos = OgrenciDurumu();
      expect(DersMeta.uniteUstalik(bos, u), 0);
      expect(DersMeta.uniteEnIyiPuan(bos, u), isNull);
      const d = OgrenciDurumu(
        tamamlanan: {'k.u1.d1': 1, 'k.u1.d2': 3},
        dersEnIyi: {'k.u1.d1': 100, 'k.u1.d2': 50},
        dersSureSn: {'k.u1.d1': 600, 'k.u1.d2': 125},
      );
      expect(DersMeta.dersUstalik(d, 'k.u1.d1'), 80); // 70 + 10
      expect(DersMeta.dersUstalik(d, 'k.u1.d2'), 65); // 35 + 30
      expect(DersMeta.uniteUstalik(d, u), 73); // 72,5 yukarı
      expect(DersMeta.uniteEnIyiPuan(d, u), 75);
      expect(DersMeta.uniteSaniye(d, u), 725);
      // Eski kayıt: bitirilmiş ama en iyi puan yok -> yalnız tekrar katkısı.
      const eski = OgrenciDurumu(tamamlanan: {'k.u1.d1': 1});
      expect(DersMeta.dersUstalik(eski, 'k.u1.d1'), 10);
      // Ustalık en çok 100.
      const tam = OgrenciDurumu(
        tamamlanan: {'k.u1.d1': 9},
        dersEnIyi: {'k.u1.d1': 100},
      );
      expect(DersMeta.dersUstalik(tam, 'k.u1.d1'), 100);
    });
  });

  group('arayüz', () {
    Kurs kurs(Ders d, {String id = 'ingilizce-1'}) => Kurs(
      id: id,
      ad: 'Meta Kursu',
      aciklama: '',
      alan: KursAlani.dil,
      uniteler: [
        Unite(id: '$id.u1', ad: 'Meta Ünitesi', dersler: [d]),
      ],
    );

    testWidgets('yol listesinde dakika ve temel kavram, dar ekranda taşmaz', (
      tester,
    ) async {
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [
          kurs(
            const Ders(
              id: 'ingilizce-1.u1.d1',
              ad: 'Notlu Ders',
              dilbilgisiNotu: 'Bir not.',
              alistirmalar: [_kolay, _kolay, _kolay, _kolay],
            ),
          ),
        ],
        boyut: const Size(480, 600),
        metinOlcegi: 1.5,
      );
      final meta = find.textContaining('~1 dk · Temel kavram');
      await tester.scrollUntilVisible(
        meta,
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(meta, findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('ders sonu özetinde ustalık kartı ve kayıt', (tester) async {
      final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
      final kap = await uygulamayiAc(
        tester,
        depo,
        kurslar: [
          kurs(
            const Ders(
              id: 'ingilizce-1.u1.d1',
              ad: 'Tek Soru',
              dilbilgisiNotu: 'Not.',
              alistirmalar: [_kolay],
            ),
          ),
        ],
        boyut: const Size(480, 600),
        metinOlcegi: 1.5,
      );
      final baslat = find.textContaining('Tek Soru');
      await tester.scrollUntilVisible(
        baslat,
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await dokun(tester, baslat);
      // Dilbilgisi notu kartı önce gelir.
      await dokun(tester, find.byType(FilledButton).first);
      await dokun(tester, find.text('a'));
      await dokun(tester, find.text('Kontrol et'));
      await dokun(tester, find.text('Bitir'));
      expect(find.text('Ders tamamlandı'), findsOneWidget);
      final kart = find.byKey(const ValueKey('ustalik-karti'));
      expect(kart, findsOneWidget);
      expect(
        find.descendant(of: kart, matching: find.text('%80')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: kart, matching: find.text('%100')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: kart, matching: find.text('Temel kavram')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: kart, matching: find.text('~1 dk')),
        findsOneWidget,
      );
      final d = kap.read(durumProvider).value!;
      expect(d.dersEnIyi['ingilizce-1.u1.d1'], 100);
      expect(d.dersSureSn.containsKey('ingilizce-1.u1.d1'), isTrue);
      expect((await depo.yukle()).dersEnIyi['ingilizce-1.u1.d1'], 100);
      expect(tester.takeException(), isNull);
    });

    testWidgets('ünite özetinde ustalık kartı, 480x600 @1,5', (tester) async {
      final k = Kurs(
        id: 'ingilizce-1',
        ad: 'Meta Kursu',
        aciklama: '',
        alan: KursAlani.dil,
        uniteler: [
          Unite(
            id: 'ingilizce-1.u1',
            ad: 'Meta Ünitesi',
            dersler: const [
              Ders(
                id: 'ingilizce-1.u1.d1',
                ad: 'Bir',
                alistirmalar: [
                  Secim(
                    soru: '"Cat" ne demektir?',
                    secenekler: ['Kedi', 'Köpek'],
                    dogru: 0,
                  ),
                ],
              ),
              Ders(id: 'ingilizce-1.u1.d2', ad: 'İki', alistirmalar: [_kolay]),
            ],
          ),
        ],
      );
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(
          const OgrenciDurumu(
            alan: 'dil',
            tamamlanan: {'ingilizce-1.u1.d1': 1, 'ingilizce-1.u1.d2': 3},
            dersEnIyi: {'ingilizce-1.u1.d1': 100, 'ingilizce-1.u1.d2': 50},
            dersSureSn: {'ingilizce-1.u1.d1': 600, 'ingilizce-1.u1.d2': 125},
          ),
        ),
        kurslar: [k],
        boyut: const Size(480, 600),
        metinOlcegi: 1.5,
      );
      kap
          .read(yonlendiriciProvider)
          .push('/unite-ozeti?kurs=ingilizce-1&unite=0');
      await tester.pumpAndSettle();
      final kart = find.byKey(const ValueKey('ustalik-karti'));
      expect(kart, findsOneWidget);
      expect(
        find.descendant(of: kart, matching: find.text('%73')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: kart, matching: find.text('%75')),
        findsOneWidget,
      );
      expect(
        find.descendant(of: kart, matching: find.text('12 dk')),
        findsOneWidget,
      );
      expect(find.text('Meta Ünitesi'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
