// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Bellek puanı ve çok modlu çalışma motoru (ÖZELLİK 78): ünite hafıza puanı
/// yarı ömürden, çalışılmış ünitelerin listesi, dört modun içeriği ve
/// denetimi; durum değişmez.
library;

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/hafiza.dart';
import 'package:flutter_test/flutter_test.dart';

import 'yeni_ozellik_icerik.dart';

const _bitmis = {tDers1: 1, tDers2: 1};

OgrenciDurumu _durum({Map<String, Kart> kartlar = const {}}) =>
    OgrenciDurumu(alan: 'dil', tamamlanan: _bitmis, kartlar: kartlar);

Kart _kart(double yo) =>
    Kart(kutu: Kart.kutuHesapla(yo), sonraki: '2026-10-22', yariOmurGun: yo);

void main() {
  final kurs = hayvanKursu;

  test('hiç çalışılmamış ünite listede yok; kartsız bitmiş ders puanı 0', () {
    expect(Hafiza.uniteler(const OgrenciDurumu(), [kurs]), isEmpty);
    final h = Hafiza.uniteHafizasi(_durum(), kurs, 0);
    expect(h.puan, 0);
    expect(h.adimSayisi, 3);
    expect(h.kartSayisi, 0);
    expect(h.etiket, 'Zayıf');
    // Renkler ünitesi hiç çalışılmadı.
    expect(Hafiza.uniteler(_durum(), [kurs]).map((x) => x.unite.ad), [
      'Hayvanlar',
    ]);
  });

  test('puan: adımların yarı ömür gücünün ortalaması (kartsız adım 0)', () {
    final d = _durum(
      kartlar: {
        '$tDers1#0': _kart(Kart.enCokYariOmur), // güç 1
        '$tDers1#1': _kart(Kart.enAzYariOmur), // güç 0
      },
    );
    final h = Hafiza.uniteHafizasi(d, kurs, 0);
    expect(h.puan, 33); // (1 + 0 + 0) / 3
    expect(h.kartSayisi, 2);
    expect(h.zayifSayisi, 1);
  });

  test('puan yarı ömürle monoton artar, üst sınır 100', () {
    int puan(double yo) => Hafiza.uniteHafizasi(
      _durum(
        kartlar: {
          for (final id in ['$tDers1#0', '$tDers1#1', '$tDers2#0'])
            id: _kart(yo),
        },
      ),
      kurs,
      0,
    ).puan;
    final a = puan(1);
    final b = puan(8);
    final c = puan(60);
    expect(b, greaterThan(a));
    expect(c, greaterThan(b));
    expect(puan(Kart.enCokYariOmur), 100);
    expect(puan(Kart.enAzYariOmur), 0);
    expect(
      Hafiza.uniteHafizasi(
        _durum(
          kartlar: {
            for (final id in ['$tDers1#0', '$tDers1#1', '$tDers2#0'])
              id: _kart(Kart.enCokYariOmur),
          },
        ),
        kurs,
        0,
      ).etiket,
      'Güçlü',
    );
  });

  test('kartı olan ama dersi bitmemiş adım da puana girer', () {
    final d = OgrenciDurumu(
      alan: 'dil',
      kartlar: {'$tDers3#0': _kart(Kart.enCokYariOmur)},
    );
    final l = Hafiza.uniteler(d, [kurs]);
    expect(l, hasLength(1));
    expect(l.single.unite.ad, 'Renkler');
    expect(l.single.puan, 100);
    expect(l.single.adimSayisi, 1);
  });

  test('öğeler: ünitenin çalışılmış adımlarından, tekrarsız', () {
    final c = Hafiza.ogeler(_durum(), kurs, 0);
    expect(c.map((x) => x.metin).toSet(), {
      'cat', 'dog', 'bird', 'fish', 'horse', 'cow', //
    });
    expect(c, hasLength(hayvanSayisi));
    // Renkler ünitesi çalışılmadığı için boş.
    expect(Hafiza.ogeler(_durum(), kurs, 1), isEmpty);
  });

  test('mod açıklığı: yeterli farklı kelime yoksa test/eşleştirme kapalı', () {
    final c = Hafiza.ogeler(_durum(), kurs, 0);
    for (final m in CalismaModu.values) {
      expect(Hafiza.modAcik(m, c), isTrue, reason: m.name);
    }
    final az = c.take(3).toList();
    expect(Hafiza.modAcik(CalismaModu.kart, az), isTrue);
    expect(Hafiza.modAcik(CalismaModu.yazma, az), isTrue);
    expect(Hafiza.modAcik(CalismaModu.eslestirme, az), isFalse);
    expect(Hafiza.modAcik(CalismaModu.test, az), isFalse);
    expect(Hafiza.modAcik(CalismaModu.kart, const []), isFalse);
  });

  test('yazma denetimi: büyük/küçük harf, Türkçe harf, parantez, boş', () {
    expect(Hafiza.yazmaDogruMu('CAT', 'cat'), isTrue);
    expect(Hafiza.yazmaDogruMu('  cat ', 'cat'), isTrue);
    expect(Hafiza.yazmaDogruMu('seker', 'şeker'), isTrue);
    expect(Hafiza.yazmaDogruMu('안녕', '안녕 (annyeong)'), isTrue);
    expect(Hafiza.yazmaDogruMu('dog', 'cat'), isFalse);
    expect(Hafiza.yazmaDogruMu('   ', 'cat'), isFalse);
    expect(Hafiza.yazmaDogruMu('good  morning', 'Good morning'), isTrue);
  });

  test('eşleştirme çiftleri: 4..6, tekrarsız, tohumla deterministik', () {
    final c = Hafiza.ogeler(_durum(), kurs, 0);
    final e = Hafiza.eslestirmeCiftleri(c, tohum: 3);
    expect(
      e.length,
      inInclusiveRange(Hafiza.eslestirmeEnAz, Hafiza.eslestirmeEnCok),
    );
    expect(e.map((x) => x.metin).toSet(), hasLength(e.length));
    expect(e.map((x) => x.anlam).toSet(), hasLength(e.length));
    expect(
      Hafiza.eslestirmeCiftleri(c, tohum: 3).map((x) => x.metin),
      e.map((x) => x.metin),
    );
    expect(Hafiza.eslestirmeCiftleri(c.take(3).toList()), isEmpty);
  });

  test(
    'test soruları: 4 farklı seçenek, doğru anlam yerinde, tohumla aynı',
    () {
      final c = Hafiza.ogeler(_durum(), kurs, 0);
      final s = Hafiza.testSorulari(c, tohum: 5);
      expect(s, hasLength(c.length));
      for (final q in s) {
        expect(q.secenekler, hasLength(Hafiza.testSecenek));
        expect(q.secenekler.toSet(), hasLength(Hafiza.testSecenek));
        final cift = c.firstWhere((x) => x.metin == q.metin);
        expect(q.secenekler[q.dogru], cift.anlam);
      }
      expect(
        Hafiza.testSorulari(c, tohum: 5).map((q) => q.secenekler.join('|')),
        s.map((q) => q.secenekler.join('|')),
      );
      expect(Hafiza.testSorulari(c.take(3).toList()), isEmpty);
      expect(Hafiza.testSorulari(c, adet: 2), hasLength(2));
    },
  );

  test('hesap durumu değiştirmez (kartlar aynı kalır)', () {
    final d = _durum(kartlar: {'$tDers1#0': _kart(3)});
    Hafiza.uniteler(d, [kurs]);
    Hafiza.ogeler(d, kurs, 0);
    expect(d.kartlar['$tDers1#0']!.yariOmurGun, 3);
    expect(d.kartlar, hasLength(1));
  });
}
