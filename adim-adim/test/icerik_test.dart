import 'dart:convert';

import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:flutter_test/flutter_test.dart';

Iterable<Ders> _dersler() => tumKurslar.expand((k) => k.tumDersler);

Iterable<Alistirma> _alistirmalar() => _dersler().expand((d) => d.alistirmalar);

List<String> _sirali(List<String> l) => [...l]..sort();

void main() {
  test('on kurs ve kursBul', () {
    expect(tumKurslar.map((k) => k.id), [
      'ingilizce-1',
      'ingilizce-2',
      'ingilizce-3',
      'ingilizce-4',
      'ingilizce-5',
      'almanca-1',
      'almanca-2',
      'almanca-3',
      'fransizca-1',
      'korece-1',
      'japonca-1',
      'cince-1',
      'html-1',
      'css-1',
      'js-1',
      'html-2',
      'html-3',
      'css-2',
      'css-3',
      'js-2',
      'js-3',
      'python-1',
      'python-2',
      'python-3',
      'sql-1',
      'sql-2',
      'sql-3',
      'php-1',
      'php-2',
      'php-3',
      'go-1',
      'go-2',
      'go-3',
      'satranc-1',
      'satranc-2',
      'satranc-3',
    ]);
    expect(kursBul('css-1'), same(css1));
    expect(kursBul('yok'), isNull);
    expect(ingilizceA1.alan, KursAlani.dil);
    expect(ingilizceA2.alan, KursAlani.dil);
    expect(ingilizceB1.alan, KursAlani.dil);
    expect(ingilizceB2.alan, KursAlani.dil);
    expect(ingilizceC1.alan, KursAlani.dil);
    for (final k in [
      almancaA1,
      almancaA2,
      almancaB1,
      fransizcaA1,
      koreceA1,
      japoncaA1,
      cinceA1,
    ]) {
      expect(k.alan, KursAlani.dil);
    }
    for (final k in [
      html1,
      css1,
      js1,
      html2,
      html3,
      css2,
      css3,
      js2,
      js3,
      python1,
      python2,
      python3,
      sql1,
      sql2,
      sql3,
      php1,
      php2,
      php3,
      go1,
      go2,
      go3,
    ]) {
      expect(k.alan, KursAlani.kod);
    }
  });

  test('kurs, ünite ve ders sayıları', () {
    expect(ingilizceA1.uniteler.length, greaterThanOrEqualTo(4));
    expect(ingilizceA1.tumDersler.length, greaterThanOrEqualTo(12));
    for (final k in [
      html1,
      css1,
      js1,
      html2,
      html3,
      css2,
      css3,
      js2,
      js3,
      python1,
      python2,
      python3,
      sql1,
      sql2,
      sql3,
      php1,
      php2,
      php3,
      go1,
      go2,
      go3,
    ]) {
      expect(k.tumDersler.length, greaterThanOrEqualTo(6));
    }
  });

  test('kurs, ünite ve ders kimlikleri benzersiz', () {
    final idler = <String>[
      for (final k in tumKurslar) ...[
        k.id,
        for (final u in k.uniteler) ...[u.id, for (final d in u.dersler) d.id],
      ],
    ];
    expect(idler.toSet().length, idler.length);
  });

  test('her ders 8-10 alıştırma içerir (konuşma alıştırması ayrı sayılır)', () {
    for (final d in _dersler()) {
      final sayi = d.alistirmalar.where((a) => a is! Soyle).length;
      expect(sayi, inInclusiveRange(8, 10), reason: d.id);
    }
  });

  test('dogru indeksleri seçenek aralığında', () {
    for (final a in _alistirmalar()) {
      final (int dogru, int n) = switch (a) {
        Secim() => (a.dogru, a.secenekler.length),
        Bosluk() => (a.dogru, a.secenekler.length),
        Dinle() => (a.dogru, a.secenekler.length),
        Kod() => (a.dogru, a.secenekler.length),
        _ => (0, 2),
      };
      expect(dogru, inInclusiveRange(0, n - 1), reason: a.soru);
      expect(n, greaterThanOrEqualTo(2), reason: a.soru);
    }
  });

  test('Sirala.dogru ile kelimeler aynı küme', () {
    var sayi = 0;
    for (final a in _alistirmalar()) {
      if (a is Sirala) {
        sayi++;
        expect(_sirali(a.kelimeler), _sirali(a.dogru), reason: a.soru);
      }
    }
    expect(sayi, greaterThan(0));
  });

  test('Eslestir 3-5 çift', () {
    for (final a in _alistirmalar()) {
      if (a is Eslestir) {
        expect(a.ciftler.length, inInclusiveRange(3, 5), reason: a.soru);
      }
    }
  });

  test('Kod ve Bosluk sorularında ___ var', () {
    for (final a in _alistirmalar()) {
      if (a is Kod) expect(a.kod, contains('___'), reason: a.soru);
      if (a is Bosluk) expect(a.soru, contains('___'), reason: a.soru);
    }
  });

  test('her İngilizce derste Dinle, her kod dersinde Kod var', () {
    for (final d in [
      ...ingilizceA1.tumDersler,
      ...ingilizceA2.tumDersler,
      ...ingilizceB1.tumDersler,
      ...ingilizceB2.tumDersler,
      ...ingilizceC1.tumDersler,
    ]) {
      final dinle = d.alistirmalar.whereType<Dinle>().toList();
      expect(dinle, isNotEmpty, reason: d.id);
      for (final a in dinle) {
        expect(a.secenekler, contains(a.okunacak), reason: d.id);
        expect(a.secenekler.length, 3, reason: d.id);
        expect(a.secenekler[a.dogru], a.okunacak, reason: d.id);
      }
    }
    for (final k in [
      html1,
      css1,
      js1,
      html2,
      html3,
      css2,
      css3,
      js2,
      js3,
      python1,
      python2,
      python3,
      sql1,
      sql2,
      sql3,
      php1,
      php2,
      php3,
      go1,
      go2,
      go3,
    ]) {
      final dil = k.id.split('-').first;
      for (final d in k.tumDersler) {
        final kodlar = d.alistirmalar.whereType<Kod>().toList();
        expect(kodlar, isNotEmpty, reason: d.id);
        for (final a in kodlar) {
          expect(a.dil, dil, reason: d.id);
          expect(a.secenekler.length, 3, reason: d.id);
        }
      }
    }
  });

  test(
    'Yaz alıştırmalarında en az bir cevap var, kart kimlikleri benzersiz',
    () {
      for (final a in _alistirmalar()) {
        if (a is Yaz) expect(a.cevaplar, isNotEmpty, reason: a.soru);
      }
      final kartlar = <String>[
        for (final d in _dersler())
          for (var i = 0; i < d.alistirmalar.length; i++) d.kartKimligi(i),
      ];
      expect(kartlar.toSet().length, kartlar.length);
    },
  );

  test('marka adı içermez', () {
    final yasak = RegExp(
      'duolingo|busuu|memrise|talkpal|mimo',
      caseSensitive: false,
    );
    for (final a in _alistirmalar()) {
      expect(yasak.hasMatch(jsonEncode(a.toJson())), isFalse, reason: a.soru);
    }
  });

  test('her kurs JSON gidiş-dönüşte eşit', () {
    for (final k in tumKurslar) {
      for (final d in k.tumDersler) {
        final json = jsonEncode(d.alistirmalar.map((a) => a.toJson()).toList());
        final geri = (jsonDecode(json) as List)
            .map((e) => Alistirma.fromJson((e as Map).cast<String, Object?>()))
            .toList();
        expect(geri.length, d.alistirmalar.length);
        for (var i = 0; i < geri.length; i++) {
          expect(geri[i].tur, d.alistirmalar[i].tur);
          expect(
            jsonEncode(geri[i].toJson()),
            jsonEncode(d.alistirmalar[i].toJson()),
            reason: '${d.id}#$i',
          );
        }
      }
    }
  });

  test('hiçbir seçenek metni yapay "2" ekiyle bitmez', () {
    // Haklı istisnalar: grid span sayı seçenekleri ve gerçek h2 başlık etiketi.
    const istisna = {'2', 'x2', '*2', 'h2', '/h2'};
    final sonuc = RegExp(r'2$');
    for (final a in _alistirmalar()) {
      final secenekler = switch (a) {
        Secim() => a.secenekler,
        Bosluk() => a.secenekler,
        Dinle() => a.secenekler,
        Kod() => a.secenekler,
        _ => const <String>[],
      };
      for (final s in secenekler) {
        if (istisna.contains(s)) continue;
        expect(
          sonuc.hasMatch(s.trimRight()),
          isFalse,
          reason: '$s / ${a.soru}',
        );
      }
    }
  });

  test('Dinle açıklamaları benzersiz ve dolu', () {
    final acik = [
      for (final a in _alistirmalar())
        if (a is Dinle) a.aciklama ?? '',
    ];
    expect(acik, isNotEmpty);
    expect(acik.every((e) => e.isNotEmpty), isTrue);
    expect(acik.toSet().length, acik.length);
  });
}
