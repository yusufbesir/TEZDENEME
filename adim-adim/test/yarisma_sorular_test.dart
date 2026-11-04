// Yarışma soru bankası testleri.
// Sahibi: Yusuf (yusufbesir); yazan (SQL, PHP, Go, C1 testleri): [İP:Adım Adım Windows sürümü#cihaz] Claude. Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
import 'package:adim_adim/yarisma/model.dart';
import 'package:adim_adim/yarisma/motor.dart';
import 'package:adim_adim/yarisma/soru_bankasi.dart';
import 'package:adim_adim/yarisma/sorular/ingilizce_a2.dart';
import 'package:adim_adim/yarisma/sorular/ingilizce_b1.dart';
import 'package:adim_adim/yarisma/sorular/ingilizce_b2.dart';
import 'package:adim_adim/yarisma/sorular/ingilizce_c1.dart';
import 'package:adim_adim/yarisma/sorular/oyun_sorulari.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('toplam 558 soru var: 180 İngilizce + 12x24 programlama + 90 oyun', () {
    expect(tumSorular.length, 558);
    expect(sorulariBul('oyun', 'satranc-1').length, 30);
    expect(sorulariBul('oyun', 'satranc-2').length, 30);
    expect(sorulariBul('oyun', 'satranc-3').length, 30);
    expect(sorulariBul('dil', 'ingilizce-1').length, 36);
    expect(sorulariBul('dil', 'ingilizce-2').length, 36);
    expect(sorulariBul('dil', 'ingilizce-3').length, 36);
    expect(sorulariBul('dil', 'ingilizce-4').length, 36);
    expect(
      sorulariBul('dil', 'ingilizce-1').length +
          sorulariBul('dil', 'ingilizce-2').length +
          sorulariBul('dil', 'ingilizce-3').length +
          sorulariBul('dil', 'ingilizce-4').length,
      144,
    );
    expect(sorulariBul('kod', 'html-1').length, 24);
    expect(sorulariBul('kod', 'css-1').length, 24);
    expect(sorulariBul('kod', 'js-1').length, 24);
    expect(sorulariBul('dil', 'ingilizce-5').length, 36);
    for (final dil in ['sql', 'php', 'go']) {
      for (final no in [1, 2, 3]) {
        expect(sorulariBul('kod', '$dil-$no').length, 24, reason: '$dil-$no');
      }
    }
  });

  test('tüm sorular geçerli', () {
    for (final s in tumSorular) {
      expect(s.gecerliMi, isTrue, reason: s.id);
    }
  });

  test('id benzersiz ve <kursId>.<kategori>.<sıra> biçiminde', () {
    final idler = tumSorular.map((s) => s.id).toList();
    expect(idler.toSet().length, idler.length);
    for (final s in tumSorular) {
      expect(s.id, startsWith('${s.seviyeKursId}.${s.kategori.kimlik}.'));
    }
  });

  test(
    'her (alan, kursId, kategori) için en az 4 soru; A1, A2, B1, B2 ve C1 için 6',
    () {
      for (final alan in ['dil', 'kod', 'oyun']) {
        for (final sv in seviyeler(alan)) {
          for (final k in YarismaKategori.values) {
            final adet = sorulariBul(
              alan,
              sv.kursId,
            ).where((s) => s.kategori == k).length;
            expect(adet, greaterThanOrEqualTo(4), reason: '${sv.kursId} $k');
            if (sv.kursId == 'ingilizce-1' ||
                sv.kursId == 'ingilizce-2' ||
                sv.kursId == 'ingilizce-3' ||
                sv.kursId == 'ingilizce-4' ||
                sv.kursId == 'ingilizce-5') {
              expect(adet, 6, reason: '${sv.kursId} $k');
            }
          }
        }
      }
    },
  );

  test('seviyeler listesi doğru', () {
    final dil = seviyeler('dil');
    expect(dil.map((s) => (s.kursId, s.etiket)), [
      ('ingilizce-1', 'A1'),
      ('ingilizce-2', 'A2'),
      ('ingilizce-3', 'B1'),
      ('ingilizce-4', 'B2'),
      ('ingilizce-5', 'C1'),
    ]);
    final kod = seviyeler('kod');
    expect(kod.map((s) => (s.kursId, s.etiket)), [
      ('html-1', 'HTML'),
      ('css-1', 'CSS'),
      ('js-1', 'JS'),
      ('sql-1', 'SQL1'),
      ('sql-2', 'SQL2'),
      ('sql-3', 'SQL3'),
      ('php-1', 'PHP1'),
      ('php-2', 'PHP2'),
      ('php-3', 'PHP3'),
      ('go-1', 'Go1'),
      ('go-2', 'Go2'),
      ('go-3', 'Go3'),
    ]);
    final oyun = seviyeler('oyun');
    expect(oyun.map((s) => (s.kursId, s.etiket)), [
      ('satranc-1', 'Başlangıç'),
      ('satranc-2', 'Orta'),
      ('satranc-3', 'İleri'),
    ]);
    expect(seviyeler('bilinmeyen'), isEmpty);
  });

  test(
    'oyun soruları: alan oyun, kategori başına 5, her seviye oynanabilir',
    () {
      expect(oyunSorulari.length, 90);
      for (final s in oyunSorulari) {
        expect(s.gecerliMi, isTrue, reason: s.id);
        expect(s.alan, 'oyun', reason: s.id);
        expect(s.id, startsWith('${s.seviyeKursId}.${s.kategori.kimlik}.'));
      }
      for (final sv in seviyeler('oyun')) {
        for (final k in YarismaKategori.values) {
          expect(
            sorulariBul('oyun', sv.kursId).where((s) => s.kategori == k).length,
            5,
            reason: '${sv.kursId} $k',
          );
        }
        // Motor her kategoride soru bulabilmeli (aksi halde ArgumentError).
        expect(
          () => YarismaMotoru(tohum: 1).basla(sorulariBul('oyun', sv.kursId)),
          returnsNormally,
        );
      }
      // Doğru şık indeksleri dağılmış: her indeks en az 20 kez.
      for (var i = 0; i < 4; i++) {
        expect(
          oyunSorulari.where((s) => s.dogru == i).length,
          greaterThanOrEqualTo(20),
          reason: 'indeks $i',
        );
      }
      // Soru metinleri benzersiz; açıklama boş değil.
      expect(oyunSorulari.map((s) => s.soru).toSet().length, 90);
    },
  );

  test('A2 soruları geçerli, alan dil, kursId ingilizce-2', () {
    for (final s in ingilizceA2Sorulari) {
      expect(s.gecerliMi, isTrue, reason: s.id);
      expect(s.alan, 'dil', reason: s.id);
      expect(s.seviyeKursId, 'ingilizce-2', reason: s.id);
      expect(s.id, startsWith('ingilizce-2.${s.kategori.kimlik}.'));
    }
    expect(ingilizceA2Sorulari.length, 36);
  });

  test('B1 soruları geçerli, alan dil, kursId ingilizce-3', () {
    for (final s in ingilizceB1Sorulari) {
      expect(s.gecerliMi, isTrue, reason: s.id);
      expect(s.alan, 'dil', reason: s.id);
      expect(s.seviyeKursId, 'ingilizce-3', reason: s.id);
      expect(s.id, startsWith('ingilizce-3.${s.kategori.kimlik}.'));
    }
    expect(ingilizceB1Sorulari.length, 36);
    for (final k in YarismaKategori.values) {
      expect(ingilizceB1Sorulari.where((s) => s.kategori == k).length, 6);
    }
  });

  test('B2 soruları geçerli, alan dil, kursId ingilizce-4', () {
    for (final s in ingilizceB2Sorulari) {
      expect(s.gecerliMi, isTrue, reason: s.id);
      expect(s.alan, 'dil', reason: s.id);
      expect(s.seviyeKursId, 'ingilizce-4', reason: s.id);
      expect(s.id, startsWith('ingilizce-4.${s.kategori.kimlik}.'));
    }
    expect(ingilizceB2Sorulari.length, 36);
    for (final k in YarismaKategori.values) {
      expect(ingilizceB2Sorulari.where((s) => s.kategori == k).length, 6);
    }
    // Doğru şık indeksleri dağılmış olmalı (her indeks en az 6 kez).
    for (var i = 0; i < 4; i++) {
      expect(
        ingilizceB2Sorulari.where((s) => s.dogru == i).length,
        greaterThanOrEqualTo(6),
        reason: 'indeks $i',
      );
    }
  });

  test('C1 soruları geçerli, alan dil, kursId ingilizce-5', () {
    for (final s in ingilizceC1Sorulari) {
      expect(s.gecerliMi, isTrue, reason: s.id);
      expect(s.alan, 'dil', reason: s.id);
      expect(s.seviyeKursId, 'ingilizce-5', reason: s.id);
      expect(s.id, startsWith('ingilizce-5.${s.kategori.kimlik}.'));
    }
    expect(ingilizceC1Sorulari.length, 36);
    for (final k in YarismaKategori.values) {
      expect(ingilizceC1Sorulari.where((s) => s.kategori == k).length, 6);
    }
    for (var i = 0; i < 4; i++) {
      expect(
        ingilizceC1Sorulari.where((s) => s.dogru == i).length,
        greaterThanOrEqualTo(6),
        reason: 'indeks $i',
      );
    }
  });

  test('SQL, PHP ve Go soruları: alan kod, 24 soru, kategori başına 4', () {
    for (final kurs in [
      'sql-1',
      'sql-2',
      'sql-3',
      'php-1',
      'php-2',
      'php-3',
      'go-1',
      'go-2',
      'go-3',
    ]) {
      final liste = sorulariBul('kod', kurs);
      expect(liste.length, 24, reason: kurs);
      for (final s in liste) {
        expect(s.gecerliMi, isTrue, reason: s.id);
        expect(s.id, startsWith('$kurs.${s.kategori.kimlik}.'));
      }
      for (final k in YarismaKategori.values) {
        expect(
          liste.where((s) => s.kategori == k).length,
          4,
          reason: '$kurs $k',
        );
      }
      for (var i = 0; i < 4; i++) {
        expect(
          liste.where((s) => s.dogru == i).length,
          greaterThanOrEqualTo(4),
          reason: '$kurs indeks $i',
        );
      }
      // Motor her kategoride soru bulabilmeli.
      expect(() => YarismaMotoru(tohum: 1).basla(liste), returnsNormally);
    }
  });

  test('tumSorular değiştirilemez', () {
    expect(() => tumSorular.add(tumSorular.first), throwsUnsupportedError);
  });

  test('kategori uzantısı: ad, kimlik, coz', () {
    expect(YarismaKategori.fen.ad, 'Fen ve Fizik');
    expect(YarismaKategori.cografya.ad, 'Coğrafya');
    for (final k in YarismaKategori.values) {
      expect(YarismaKategoriUzanti.coz(k.kimlik), k);
    }
    expect(YarismaKategoriUzanti.coz('yok'), isNull);
  });

  test('gecerliMi: bozuk soruları reddeder', () {
    YarismaSorusu yap({
      List<String> sik = const ['a', 'b', 'c', 'd'],
      int dogru = 0,
      String soru = 'Soru?',
    }) => YarismaSorusu(
      id: 'x.tarih.1',
      alan: 'dil',
      seviyeKursId: 'x',
      kategori: YarismaKategori.tarih,
      soru: soru,
      secenekler: sik,
      dogru: dogru,
      aciklama: 'Açıklama.',
    );
    expect(yap().gecerliMi, isTrue);
    expect(yap(sik: ['a', 'b', 'c']).gecerliMi, isFalse);
    expect(yap(dogru: 4).gecerliMi, isFalse);
    expect(yap(dogru: -1).gecerliMi, isFalse);
    expect(yap(sik: ['a', 'a', 'c', 'd']).gecerliMi, isFalse);
    expect(yap(sik: ['a', ' ', 'c', 'd']).gecerliMi, isFalse);
    expect(yap(soru: '').gecerliMi, isFalse);
  });
}
