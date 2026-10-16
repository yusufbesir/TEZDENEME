// İngilizce B2 kursu içerik testleri.
// Sahibi: Yusuf (yusufbesir). İçerik testleri geçmeden değişmez; silme yalnız Yusuf kararıyla.
import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final dersler = ingilizceB2.tumDersler.toList();
  final alistirmalar = dersler.expand((d) => d.alistirmalar).toList();

  test('kurs kimliği, alan ve 6 ünite x 2 ders', () {
    expect(ingilizceB2.id, 'ingilizce-4');
    expect(ingilizceB2.alan, KursAlani.dil);
    expect(ingilizceB2.uniteler.length, 6);
    expect(dersler.length, 12);
    for (final u in ingilizceB2.uniteler) {
      expect(u.dersler.length, 2, reason: u.id);
    }
  });

  test('toplam 120 alıştırma, ders başına tam 10', () {
    expect(alistirmalar.length, 120);
    for (final d in dersler) {
      expect(d.alistirmalar.length, 10, reason: d.id);
    }
  });

  test('her derste en az 2 Dinle', () {
    for (final d in dersler) {
      expect(
        d.alistirmalar.whereType<Dinle>().length,
        greaterThanOrEqualTo(2),
        reason: d.id,
      );
    }
  });

  test('kimlikler benzersiz ve ingilizce-4. önekli', () {
    final idler = <String>[
      for (final u in ingilizceB2.uniteler) ...[
        u.id,
        ...u.dersler.map((d) => d.id),
      ],
    ];
    expect(idler.toSet().length, idler.length);
    for (final id in idler) {
      expect(id, startsWith('ingilizce-4.'));
    }
  });

  test('dogru indeksi aralıkta, Dinle okunacak seçenekte', () {
    for (final a in alistirmalar) {
      final (int dogru, List<String> sec) = switch (a) {
        Secim() => (a.dogru, a.secenekler),
        Bosluk() => (a.dogru, a.secenekler),
        Dinle() => (a.dogru, a.secenekler),
        _ => (0, const ['x']),
      };
      expect(dogru, inInclusiveRange(0, sec.length - 1), reason: a.soru);
      expect(sec.toSet().length, sec.length, reason: a.soru);
      if (a is Dinle) expect(sec[a.dogru], a.okunacak, reason: a.soru);
    }
  });

  test('Eslestir çiftleri dolu, Sirala en az 3 parça ve aynı küme', () {
    for (final a in alistirmalar) {
      if (a is Eslestir) {
        expect(a.ciftler.length, inInclusiveRange(3, 5), reason: a.soru);
        for (final c in a.ciftler) {
          expect(c.sol.trim(), isNotEmpty);
          expect(c.sag.trim(), isNotEmpty);
        }
      }
      if (a is Sirala) {
        expect(a.dogru.length, greaterThanOrEqualTo(3), reason: a.soru);
        expect([...a.kelimeler]..sort(), [...a.dogru]..sort(), reason: a.soru);
      }
      if (a is Yaz) expect(a.cevaplar, isNotEmpty, reason: a.soru);
      if (a is Bosluk) expect(a.soru, contains('___'), reason: a.soru);
    }
  });

  test('her ders tür çeşitliliği içerir', () {
    for (final d in dersler) {
      final turler = d.alistirmalar.map((a) => a.tur).toSet();
      expect(turler.length, greaterThanOrEqualTo(5), reason: d.id);
    }
  });

  test('dersler arasında tür sırası aynı değil', () {
    final diziler = dersler
        .map((d) => d.alistirmalar.map((a) => a.tur).join(','))
        .toSet();
    expect(diziler.length, greaterThanOrEqualTo(10));
  });

  test('Yaz cevapları ve Sirala doğru sırası boş sözcük içermez', () {
    for (final a in alistirmalar) {
      if (a is Yaz) {
        for (final c in a.cevaplar) {
          expect(c.trim(), isNotEmpty, reason: a.soru);
        }
      }
      if (a is Sirala) {
        for (final k in a.dogru) {
          expect(k.trim(), isNotEmpty, reason: a.soru);
        }
      }
    }
  });
}
