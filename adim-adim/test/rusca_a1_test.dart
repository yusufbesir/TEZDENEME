// Sahibi Yusuf (yusufbesir). Yazan: [Claude#dalga12]. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Rusça A1 kursu: yapı, Kiril yazı kuralları, ses dili, sözlük ve dil tanımı.
library;

import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/ders_ogeleri.dart';
import 'package:adim_adim/motor/dinle_yaz.dart';
import 'package:adim_adim/sozluk/dil_tanimi.dart';
import 'package:adim_adim/sozluk/sozluk.dart';
import 'package:flutter_test/flutter_test.dart';

final RegExp _kiril = RegExp('[Ѐ-ӿ]');

void main() {
  test('yapı: 4 ünite x 3 ders, kimlikler önekli, 9-10 alıştırma', () {
    expect(ruscaA1.id, 'rusca-1');
    expect(ruscaA1.ad, 'Rusça A1: Başlangıç');
    expect(ruscaA1.alan, KursAlani.dil);
    expect(kursBul('rusca-1'), same(ruscaA1));
    expect(ruscaA1.uniteler.length, almancaA1.uniteler.length);
    expect(ruscaA1.tumDersler.length, 12);
    for (final u in ruscaA1.uniteler) {
      expect(u.id, startsWith('rusca-1.u'));
      expect(u.dersler.length, 3, reason: u.id);
      for (final d in u.dersler) {
        expect(d.id, startsWith('${u.id}.d'));
        expect(d.dilbilgisiNotu, isNotEmpty, reason: d.id);
        expect(d.alistirmalar.length, inInclusiveRange(9, 10), reason: d.id);
        expect(
          d.alistirmalar.map((a) => a.tur).toSet().length,
          greaterThanOrEqualTo(5),
          reason: d.id,
        );
      }
    }
  });

  test('her derste Dinle (ru-RU, 3 benzersiz Kiril seçenek) ve Yaz var', () {
    for (final d in ruscaA1.tumDersler) {
      final dinle = d.alistirmalar.whereType<Dinle>().toList();
      expect(dinle, isNotEmpty, reason: d.id);
      for (final a in dinle) {
        expect(a.dil, 'ru-RU', reason: d.id);
        expect(a.secenekler.length, 3, reason: d.id);
        expect(a.secenekler.toSet().length, 3, reason: d.id);
        expect(a.secenekler[a.dogru], a.okunacak, reason: d.id);
        expect(_kiril.hasMatch(a.okunacak), isTrue, reason: d.id);
      }
      expect(d.alistirmalar.whereType<Yaz>(), isNotEmpty, reason: d.id);
    }
  });

  test(
    'Yaz: klavye gerekmez (ilk cevap Kiril değil), Kiril da kabul edilir',
    () {
      for (final a in ruscaA1.tumDersler.expand((d) => d.alistirmalar)) {
        if (a is! Yaz) continue;
        expect(a.cevaplar, isNotEmpty, reason: a.soru);
        expect(_kiril.hasMatch(a.cevaplar.first), isFalse, reason: a.soru);
      }
    },
  );

  test('Eşleştir solunda Kiril sözcüğün yanında Latin okunuş var', () {
    final okunus = RegExp(r'\([A-Za-zçğıöşüÇĞİÖŞÜ \-]+\)\s*$');
    for (final a in ruscaA1.tumDersler.expand((d) => d.alistirmalar)) {
      if (a is! Eslestir) continue;
      for (final c in a.ciftler) {
        if (_kiril.hasMatch(c.sol) && c.sol.length > 3) {
          expect(c.sol, matches(okunus), reason: c.sol);
        }
      }
    }
  });

  test('Tablo, İşaretle, Sırala, Seçim, Boşluk ve Eşleştir tutarlı', () {
    for (final d in ruscaA1.tumDersler) {
      for (final a in d.alistirmalar) {
        switch (a) {
          case Tablo():
            for (final b in a.bos) {
              expect(a.secenekler, contains(a.hucre(b)), reason: d.id);
            }
          case Isaretle():
            for (final i in a.dogru) {
              expect(i, lessThan(a.kelimeler.length), reason: a.cumle);
            }
          case Sirala():
            expect([...a.kelimeler]..sort(), [...a.dogru]..sort());
            expect(a.kelimeler.join(' '), isNot(a.dogru.join(' ')));
          case Secim():
            expect(a.dogru, inInclusiveRange(0, a.secenekler.length - 1));
            expect(a.secenekler.toSet().length, a.secenekler.length);
          case Bosluk():
            expect(a.soru, contains('___'));
            expect(a.dogru, inInclusiveRange(0, a.secenekler.length - 1));
          case Eslestir():
            expect(a.ciftler.length, inInclusiveRange(3, 5));
            expect(
              a.ciftler.map((c) => c.sol).toSet().length,
              a.ciftler.length,
            );
            expect(
              a.ciftler.map((c) => c.sag).toSet().length,
              a.ciftler.length,
            );
          default:
            break;
        }
      }
    }
  });

  test('ses dili, dil tanımı, Dinle-yaz dışı ve sözlük', () {
    expect(DersOgeleri.kursSesDili('rusca-1'), 'ru-RU');
    expect(DinleYaz.latinMi('ru-RU'), isFalse);
    expect(kursDilKodu(ruscaA1), 'ru');
    expect(Sozluk.kursDili(ruscaA1), 'ru');
    final t = dilTanimi('ru')!;
    expect(t.ad, 'Rusça');
    expect(t.ttsDili, 'ru-RU');
    expect(t.kisaAd, 'Rus.');
    final s = Sozluk.kurslardan([ruscaA1]);
    expect(s.maddeler, isNotEmpty);
    expect(s.maddeler.every((m) => m.dil == 'ru'), isTrue);
    expect(
      s.ara('süt', dil: 'ru').map((m) => m.kelime),
      contains('молоко (malakO)'),
    );
  });
}
