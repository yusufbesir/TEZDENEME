/// Satranç kursları (satranc-1/2/3) içerik doğrulaması: yapı (4 ünite × 2
/// ders, ders başı 8-10 alıştırma), JSON gidiş-dönüş ve her Hamle
/// alıştırmasının kural motorunda denetimi: FEN geçerli, ana hat yasal,
/// mat iddiası (matKabul) zorlanmış mat aramasıyla doğrulanır ve ara
/// oyuncu hamleleri tek çözümdür; hata mesajı anahtarları yasal ve yanlış
/// hamlelerdir. Kurslar tumKurslar'a eklenmeden de çalışsın diye doğrudan
/// içe aktarılır.
library;

import 'dart:convert';

import 'package:adim_adim/icerik/satranc_1.dart';
import 'package:adim_adim/icerik/satranc_2.dart';
import 'package:adim_adim/icerik/satranc_3.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/satranc/satranc.dart';
import 'package:flutter_test/flutter_test.dart';

const _kurslar = [satranc1, satranc2, satranc3];

Iterable<(Ders, int, Alistirma)> _hepsi() sync* {
  for (final k in _kurslar) {
    for (final d in k.tumDersler) {
      for (var i = 0; i < d.alistirmalar.length; i++) {
        yield (d, i, d.alistirmalar[i]);
      }
    }
  }
}

void main() {
  test('kimlik, ad, alan ve yapı', () {
    expect(_kurslar.map((k) => k.id), ['satranc-1', 'satranc-2', 'satranc-3']);
    expect(_kurslar.map((k) => k.ad), [
      'Satranç Başlangıç',
      'Satranç Orta',
      'Satranç İleri',
    ]);
    for (final k in _kurslar) {
      expect(k.alan, KursAlani.oyun, reason: k.id);
      expect(k.uniteler.length, 4, reason: k.id);
      for (final u in k.uniteler) {
        expect(u.dersler.length, 2, reason: u.id);
        expect(u.id, startsWith('${k.id}-u'));
        for (final d in u.dersler) {
          expect(d.id, startsWith('${u.id}-d'));
          expect(d.alistirmalar.length, inInclusiveRange(8, 10), reason: d.id);
          // Ders kimliği motorun ünite/kurs çözümleyicisiyle okunur.
          expect(Motor.kursKimligi(d.id), k.id, reason: d.id);
        }
      }
    }
    final idler = [
      for (final k in _kurslar) ...[
        k.id,
        for (final u in k.uniteler) ...[u.id, for (final d in u.dersler) d.id],
      ],
    ];
    expect(idler.toSet().length, idler.length);
  });

  test('her kursta en az 15 Hamle; türler karışık', () {
    for (final k in _kurslar) {
      final tumu = k.tumDersler.expand((d) => d.alistirmalar).toList();
      expect(tumu.whereType<Hamle>().length, greaterThanOrEqualTo(15));
      final turler = tumu.map((a) => a.tur).toSet();
      expect(
        turler,
        containsAll(['hamle', 'secim', 'bosluk', 'eslestir', 'yaz']),
        reason: k.id,
      );
    }
  });

  test('Motor.alanKurslari oyun alanını seçer', () {
    final liste = Motor.alanKurslari(_kurslar, 'oyun');
    expect(liste.map((k) => k.id), ['satranc-1', 'satranc-2', 'satranc-3']);
    expect(Motor.alanKurslari(_kurslar, 'dil'), isEmpty);
  });

  test('JSON gidiş-dönüş', () {
    for (final (d, i, a) in _hepsi()) {
      final json = jsonEncode(a.toJson());
      final geri = Alistirma.fromJson(
        (jsonDecode(json) as Map).cast<String, Object?>(),
      );
      expect(jsonEncode(geri.toJson()), json, reason: '${d.id}#$i');
    }
  });

  test('diğer türler tutarlı', () {
    for (final (d, i, a) in _hepsi()) {
      final yer = '${d.id}#$i';
      switch (a) {
        case Secim(:final secenekler, :final dogru):
          expect(dogru, inInclusiveRange(0, secenekler.length - 1));
          expect(secenekler.toSet().length, secenekler.length, reason: yer);
        case Bosluk(:final soru, :final secenekler, :final dogru):
          expect(soru, contains('___'), reason: yer);
          expect(dogru, inInclusiveRange(0, secenekler.length - 1));
        case Eslestir(:final ciftler):
          expect(ciftler.length, inInclusiveRange(3, 5), reason: yer);
        case Yaz(:final cevaplar):
          expect(cevaplar, isNotEmpty, reason: yer);
        case Tablo(:final bos, :final secenekler):
          for (final b in bos) {
            expect(secenekler, contains(a.hucre(b)), reason: yer);
          }
        case Isaretle(:final dogru):
          for (final x in dogru) {
            expect(x, inInclusiveRange(0, a.kelimeler.length - 1));
          }
        default:
          break;
      }
    }
  });

  group('Hamle alıştırmaları kural motorunda', () {
    final hamleler = [
      for (final (d, i, a) in _hepsi())
        if (a is Hamle) (yer: '${d.id}#$i', a: a),
    ];

    test('FEN geçerli, ana hat yasal, tek sayıda hamle', () {
      expect(hamleler.length, greaterThanOrEqualTo(45));
      for (final (:yer, :a) in hamleler) {
        expect(Konum.fenGecerli(a.fen), isTrue, reason: yer);
        expect(a.hamleler, isNotEmpty, reason: yer);
        expect(a.hamleler.length.isOdd, isTrue, reason: yer);
        var k = Konum.fen(a.fen);
        for (final u in a.hamleler) {
          final s = k.uciOyna(u);
          expect(s, isNotNull, reason: '$yer: $u yasal değil');
          k = s!;
        }
        expect(Motor.cevapDogruMu(a, a.oyuncuHamleleri), isTrue, reason: yer);
        expect(Motor.hamleMetni(a), isNot(contains(a.hamleler.first)));
        expect(a.oyun, Hamle.varsayilanOyun);
      }
    });

    test('mat iddiaları: zorlanmış mat ve tek çözüm', () {
      var sayi = 0;
      for (final (:yer, :a) in hamleler) {
        if (!a.matKabul) continue;
        sayi++;
        final n = a.oyuncuHamleleri.length;
        var k = Konum.fen(a.fen);
        for (var i = 0; i < a.hamleler.length; i++) {
          if (i.isEven) {
            final kalan = n - i ~/ 2;
            final cozenler = [
              for (final h in k.yasalHamleler)
                if (k.hamleZorlarMat(h, kalan)) h.uci,
            ];
            expect(cozenler, contains(a.hamleler[i]), reason: yer);
            if (kalan > 1) {
              // Ara adımda tek çözüm olmalı: kullanıcı katı denetlenir.
              expect(cozenler, [a.hamleler[i]], reason: yer);
            }
          }
          k = k.uciOyna(a.hamleler[i])!;
        }
        expect(k.mat, isTrue, reason: '$yer son konum mat değil');
      }
      expect(sayi, greaterThanOrEqualTo(15));
    });

    test('mat değilse soru "mat" vaat etmez', () {
      for (final (:yer, :a) in hamleler) {
        if (a.matKabul) continue;
        expect(a.soru.toLowerCase(), isNot(contains('mat et')), reason: yer);
      }
    });

    test('hata mesajı anahtarları yasal ve yanlış hamleler', () {
      for (final (:yer, :a) in hamleler) {
        final k = Konum.fen(a.fen);
        for (final u in a.hataMesajlari.keys) {
          expect(k.uciBul(u), isNotNull, reason: '$yer: $u');
          expect(Motor.cevapDogruMu(a, [u]), isFalse, reason: '$yer: $u');
          expect(Motor.hataMesaji(a, [u]), a.hataMesajlari[u]);
        }
      }
    });
  });
}
