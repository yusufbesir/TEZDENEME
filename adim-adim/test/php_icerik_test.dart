// PHP kursu (php-1, php-2, php-3) veri bütünlüğü testleri.
// Sahibi: Adım Adım test paketi; yazan: Claude (implementer, dalga6).
// Genel kurallar test/icerik_test.dart içindedir; burada PHP'ye özgü yapı,
// kimlik, alan süzgeci ve boş metin denetimleri vardır.
import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/motor/ogrenme_yolu.dart';
import 'package:flutter_test/flutter_test.dart';

final _php = [php1, php2, php3];

Iterable<Alistirma> _alistirmalar() =>
    _php.expand((k) => k.tumDersler).expand((d) => d.alistirmalar);

void main() {
  test('PHP kursları kayıtlı, programlama alanında ve kimlikleri doğru', () {
    expect(_php.map((k) => k.id), ['php-1', 'php-2', 'php-3']);
    for (final k in _php) {
      expect(kursBul(k.id), same(k));
      expect(k.alan, KursAlani.kod);
      expect(tumKurslar, contains(k));
    }
  });

  test('alan süzgeci PHP kurslarını kod alanında verir', () {
    final kod = Motor.alanKurslari(tumKurslar, 'kod').map((k) => k.id);
    expect(kod, containsAll(['php-1', 'php-2', 'php-3']));
    final dil = Motor.alanKurslari(tumKurslar, 'dil').map((k) => k.id);
    expect(dil.any((id) => id.startsWith('php')), isFalse);
  });

  test('toplam 6 ünite ve 24 ders; her ünite 4 ders', () {
    expect(_php.expand((k) => k.uniteler).length, 6);
    expect(_php.expand((k) => k.tumDersler).length, 24);
    for (final u in _php.expand((k) => k.uniteler)) {
      expect(u.dersler.length, 4, reason: u.id);
      expect(u.id, startsWith(u.dersler.first.id.split('-u').first));
    }
  });

  test('kimlikler benzersiz ve kurs önekiyle başlar', () {
    final idler = <String>[
      for (final k in _php) ...[
        k.id,
        for (final u in k.uniteler) ...[u.id, for (final d in u.dersler) d.id],
      ],
    ];
    expect(idler.toSet().length, idler.length);
    for (final k in _php) {
      for (final u in k.uniteler) {
        expect(u.id, startsWith('${k.id}-u'));
        for (final d in u.dersler) {
          expect(d.id, startsWith('${u.id}-d'));
        }
      }
    }
  });

  test('her ders açıklama notu taşır, 8-10 alıştırma ve bir Kod içerir', () {
    for (final d in _php.expand((k) => k.tumDersler)) {
      expect(d.dilbilgisiNotu?.trim(), isNotEmpty, reason: d.id);
      expect(d.alistirmalar.length, inInclusiveRange(8, 10), reason: d.id);
      final kodlar = d.alistirmalar.whereType<Kod>().toList();
      expect(kodlar, isNotEmpty, reason: d.id);
      for (final a in kodlar) {
        expect(a.dil, 'php', reason: d.id);
        expect(a.secenekler.length, 3, reason: d.id);
      }
    }
  });

  test('doğru cevap indeksleri geçerli, seçenekler benzersiz', () {
    for (final a in _alistirmalar()) {
      final (int dogru, List<String> sec) = switch (a) {
        Secim() => (a.dogru, a.secenekler),
        Bosluk() => (a.dogru, a.secenekler),
        Kod() => (a.dogru, a.secenekler),
        _ => (0, const <String>['x', 'y']),
      };
      expect(dogru, inInclusiveRange(0, sec.length - 1), reason: a.soru);
      expect(sec.toSet().length, sec.length, reason: a.soru);
    }
  });

  test('Tablo boşları, İşaretle indeksleri ve Sırala kümeleri tutarlı', () {
    for (final a in _alistirmalar()) {
      if (a is Tablo) {
        for (final b in a.bos) {
          expect(b.sutun, greaterThan(0), reason: a.soru);
          expect(a.secenekler, contains(a.hucre(b)), reason: a.soru);
        }
      }
      if (a is Isaretle) {
        for (final i in a.dogru) {
          expect(i, inInclusiveRange(0, a.kelimeler.length - 1));
        }
      }
      if (a is Sirala) {
        expect(
          ([...a.kelimeler]..sort()),
          ([...a.dogru]..sort()),
          reason: a.soru,
        );
        expect(a.kelimeler, isNot(a.dogru), reason: a.soru);
      }
      if (a is Eslestir) {
        expect(a.ciftler.length, inInclusiveRange(3, 5), reason: a.soru);
      }
      if (a is Yaz) expect(a.cevaplar, isNotEmpty, reason: a.soru);
    }
  });

  test('boş metin yok', () {
    for (final a in _alistirmalar()) {
      expect(a.soru.trim(), isNotEmpty);
      expect((a.aciklama ?? '').trim(), isNotEmpty, reason: a.soru);
      final json = a.toJson();
      for (final v in json.values) {
        if (v is String) expect(v.trim(), isNotEmpty, reason: a.soru);
        if (v is List) {
          for (final e in v) {
            if (e is String) expect(e.trim(), isNotEmpty, reason: a.soru);
          }
        }
      }
    }
  });

  test('her derste tam 10 alıştırma var (toplam 240)', () {
    for (final d in _php.expand((k) => k.tumDersler)) {
      expect(d.alistirmalar.length, 10, reason: d.id);
    }
    expect(_alistirmalar().length, 240);
  });

  test('öğrenme yolunda PHP tek yol, üç seviye', () {
    final yollar = OgrenmeYolu.uret(const OgrenciDurumu(), _php);
    expect(yollar.length, 1);
    expect(yollar.single.kimlik, 'php');
    expect(yollar.single.ad, 'PHP');
    expect(yollar.single.seviyeler.length, 3);
    expect(yollar.single.kurslar.map((k) => k.kurs.id), [
      'php-1',
      'php-2',
      'php-3',
    ]);
  });

  test('Kod alıştırmaları php dilinde ve boşluk içerir', () {
    for (final a in _alistirmalar().whereType<Kod>()) {
      expect(a.dil, 'php', reason: a.soru);
      expect(a.kod, contains('___'), reason: a.soru);
    }
  });
}
