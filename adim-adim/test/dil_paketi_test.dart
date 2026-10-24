// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// ÖZELLİK 60 testleri: dil başına ayrı sözlük veri paketi. Davranış
/// değişmez (gerçek içerikte eski birleşik üretimle aynı maddeler), her paket
/// yalnız kendi dilini içerir ve tembel yüklenir; dil tanımları tablosu.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/sozluk/dil_paketi.dart';
import 'package:adim_adim/sozluk/dil_tanimi.dart';
import 'package:adim_adim/sozluk/sozluk.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'sahte_icerik.dart';

String _ozet(SozlukMaddesi m) =>
    '${m.dil}|${m.kelime}|${m.anlam}|${m.kursId}|${m.dersId}|'
    '${m.alistirmaIndeksi}|${m.kok}|${m.siklik}';

void main() {
  group('dil tanımları', () {
    test('tablo: kodlar, tekil kodlar ve önekler, TTS dilleri', () {
      expect(dilTanimlari.map((t) => t.kod), [
        'en',
        'de',
        'fr',
        'ko',
        'ja',
        'zh',
        'kod',
      ]);
      expect({for (final t in dilTanimlari) t.kod}.length, dilTanimlari.length);
      final onekler = [
        for (final t in dilTanimlari)
          if (!t.kodKursu) t.kursOnek,
      ];
      expect(onekler.toSet().length, onekler.length);
      expect(dilTanimi('de')!.ttsDili, 'de-DE');
      expect(dilTanimi('fr')!.ttsDili, 'fr-FR');
      expect(dilTanimi('ko')!.ttsDili, 'ko-KR');
      expect(dilTanimi('ja')!.ttsDili, 'ja-JP');
      expect(dilTanimi('zh')!.ttsDili, 'zh-CN');
      expect(dilTanimi('en')!.ttsDili, 'en-US');
      expect(dilTanimi('kod')!.ttsDili, isEmpty);
      expect(dilTanimi('xx'), isNull);
    });

    test('kursDilKodu: tüm gerçek kurslar tanımlı bir dile düşer', () {
      final kodlar = {for (final t in dilTanimlari) t.kod};
      for (final k in tumKurslar) {
        expect(kodlar, contains(kursDilKodu(k)), reason: k.id);
        expect(Sozluk.kursDili(k), kursDilKodu(k));
      }
      // Bilinmeyen önek eski davranışla İngilizce sayılır; kod alanı 'kod'.
      expect(kursDilKodu(sahteKurs), 'en');
      expect(kursDilKodu(sahteKodKurs), 'kod');
    });
  });

  group('davranış değişmedi', () {
    test('gerçek içerikte birleşik sözlük eski üretimle aynıdır', () {
      // Eski yol: tüm kurslar tek taramada, tek tekrar süzgeciyle.
      final eski = Sozluk(Sozluk.kurslarMaddeleri(tumKurslar));
      final yeni = Sozluk.kurslardan(tumKurslar);
      expect(yeni.maddeler.length, eski.maddeler.length);
      expect(
        yeni.maddeler.map(_ozet).toList(),
        eski.maddeler.map(_ozet).toList(),
      );
      expect(yeni.maddeler, isNotEmpty);
    });

    test('paketlerin birleşimi Sozluk.kurslardan ile aynı', () {
      final p = DilPaketleri(tumKurslar);
      expect(
        p.sozluk.maddeler.map(_ozet).toList(),
        Sozluk.kurslardan(tumKurslar).maddeler.map(_ozet).toList(),
      );
    });

    test('arama ve paketler (ünite) aynı sonucu verir', () {
      final p = DilPaketleri(tumKurslar).sozluk;
      final eski = Sozluk(Sozluk.kurslarMaddeleri(tumKurslar));
      for (final q in ['went', 'su', 'hello', 'ekmek']) {
        expect(p.ara(q).map(_ozet).toList(), eski.ara(q).map(_ozet).toList());
      }
      expect(
        p.paketler(tumKurslar).map((x) => '${x.uniteId}:${x.maddeler.length}'),
        eski
            .paketler(tumKurslar)
            .map((x) => '${x.uniteId}:${x.maddeler.length}'),
      );
      expect(
        p.gununKelimesi('2026-10-21')?.kelime,
        eski.gununKelimesi('2026-10-21')?.kelime,
      );
    });
  });

  group('paketler', () {
    test('her paket yalnız kendi dilini içerir; yükleme tembeldir', () {
      final p = DilPaketleri(tumKurslar);
      expect(p.yuklenenler, isEmpty);
      final de = p.paket('de')!;
      expect(de.yuklendi, isFalse);
      expect(de.maddeler, isNotEmpty);
      expect(de.maddeler.every((m) => m.dil == 'de'), isTrue);
      expect(de.kurslar.every((k) => kursDilKodu(k) == 'de'), isTrue);
      expect(p.yuklenenler, ['de']); // yalnız istenen paket yüklendi
      expect(p.paket('en')!.yuklendi, isFalse);
      expect(p.paket('xx'), isNull);
      // Paket sözlüğü yalnız o dilin maddelerini arar.
      expect(de.sozluk.maddeler.every((m) => m.dil == 'de'), isTrue);
      expect(de.sozluk.ara('ekmek'), isNotEmpty);
      expect(identical(de.maddeler, de.maddeler), isTrue); // önbellek
    });

    test(
      'paket kurs listesi: ilgili dil, kullanılanlar yalnız dolu paketler',
      () {
        final p = DilPaketleri([sahteKurs, sahteKodKurs]);
        expect(p.kodlar, ['en', 'de', 'fr', 'ko', 'ja', 'zh', 'kod']);
        expect(p.kullanilanlar.map((x) => x.tanim.kod), ['en', 'kod']);
        expect(p.paket('en')!.kurslar.single.id, sahteKursId);
        expect(p.paket('de')!.maddeler, isEmpty);
        expect(p.paket('kod')!.maddeler.every((m) => m.dil == 'kod'), isTrue);
        expect(
          p.sozluk.maddeler.length,
          p.paket('en')!.maddeler.length + p.paket('kod')!.maddeler.length,
        );
      },
    );

    test('dil sayıları toplamı birleşik sözlüğe eşit', () {
      final p = DilPaketleri(tumKurslar);
      var toplam = 0;
      for (final k in p.kodlar) {
        toplam += p.paket(k)!.maddeler.length;
      }
      expect(toplam, p.sozluk.maddeler.length);
      expect(p.paket('en')!.maddeler.length, greaterThan(0));
      expect(p.paket('kod')!.maddeler.length, greaterThan(0));
    });

    test('oyun kurslarında sözlük yok', () {
      final oyun = Kurs(
        id: 'satranc-x',
        ad: 'Oyun',
        aciklama: '',
        alan: KursAlani.oyun,
        uniteler: sahteKurs.uniteler,
      );
      expect(Sozluk.kurslarMaddeleri([oyun]), isEmpty);
    });
  });

  group('sağlayıcı', () {
    test('sozlukProvider dil paketlerinin birleşimini verir', () {
      final kap = ProviderContainer(
        overrides: [
          depoProvider.overrideWithValue(BellekDepo(const OgrenciDurumu())),
          kurslarProvider.overrideWithValue([sahteKurs]),
        ],
      );
      addTearDown(kap.dispose);
      expect(
        identical(
          kap.read(sozlukProvider),
          kap.read(dilPaketleriProvider).sozluk,
        ),
        isTrue,
      );
      expect(
        kap.read(sozlukProvider).maddeler.map((m) => m.kelime).toSet(),
        containsAll(['cat', 'dog', 'bird']),
      );
    });
  });
}
