// İngilizce C1 kursu içerik testleri.
// yazan: [Claude#dalga10]
// Sahibi: Yusuf (yusufbesir). İçerik testleri geçmeden değişmez; silme yalnız Yusuf kararıyla.
import 'package:adim_adim/motor/dilbilgisi_ipucu.dart';
import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final dersler = ingilizceC1.tumDersler.toList();
  final alistirmalar = dersler.expand((d) => d.alistirmalar).toList();

  test('kurs kimliği, alan ve 3 ünite x 4 ders', () {
    expect(ingilizceC1.id, 'ingilizce-5');
    expect(ingilizceC1.alan, KursAlani.dil);
    expect(ingilizceC1.uniteler.length, 3);
    expect(dersler.length, 12);
    for (final u in ingilizceC1.uniteler) {
      expect(u.dersler.length, 4, reason: u.id);
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

  test('kimlikler benzersiz ve ingilizce-5. önekli', () {
    final idler = <String>[
      for (final u in ingilizceC1.uniteler) ...[
        u.id,
        ...u.dersler.map((d) => d.id),
      ],
    ];
    expect(idler.toSet().length, idler.length);
    for (final id in idler) {
      expect(id, startsWith('ingilizce-5.'));
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

  test('metinler dolu: ders adı, dilbilgisi notu, soru, açıklama', () {
    for (final d in dersler) {
      expect(d.ad.trim(), isNotEmpty, reason: d.id);
      expect(d.dilbilgisiNotu?.trim() ?? '', isNotEmpty, reason: d.id);
    }
    for (final a in alistirmalar) {
      expect(a.soru.trim(), isNotEmpty);
      expect((a.aciklama ?? '').trim(), isNotEmpty, reason: a.soru);
    }
  });

  test('Dinle seçenekleri ve Secim/Bosluk seçenekleri boş değil', () {
    for (final a in alistirmalar) {
      final sec = switch (a) {
        Secim() => a.secenekler,
        Bosluk() => a.secenekler,
        Dinle() => a.secenekler,
        _ => const <String>[],
      };
      for (final s in sec) {
        expect(s.trim(), isNotEmpty, reason: a.soru);
      }
      if (a is Dinle) expect(a.dil, 'en-US');
    }
  });

  test('doğru indeksler tek bir konuma yığılmaz', () {
    final konum = <int>{};
    for (final a in alistirmalar) {
      if (a is Secim) konum.add(a.dogru);
      if (a is Bosluk) konum.add(a.dogru);
    }
    expect(konum.length, 3);
  });

  test('her derse dilbilgisi ipucu bağlı (en az 8, ders başına 1)', () {
    final ipuclari = DilbilgisiIpuclari.kursIcin('ingilizce-5');
    expect(ipuclari.length, greaterThanOrEqualTo(8));
    for (final d in dersler) {
      expect(DilbilgisiIpuclari.dersIcin(d.id), isNotNull, reason: d.id);
    }
  });
}
