// Yarışma soru bankası testleri.
// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
import 'package:adim_adim/yarisma/model.dart';
import 'package:adim_adim/yarisma/soru_bankasi.dart';
import 'package:adim_adim/yarisma/sorular/ingilizce_a2.dart';
import 'package:adim_adim/yarisma/sorular/ingilizce_b1.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('toplam 180 soru var: 108 İngilizce (A1+A2+B1) + 3x24 programlama', () {
    expect(tumSorular.length, 180);
    expect(sorulariBul('dil', 'ingilizce-1').length, 36);
    expect(sorulariBul('dil', 'ingilizce-2').length, 36);
    expect(sorulariBul('dil', 'ingilizce-3').length, 36);
    expect(
      sorulariBul('dil', 'ingilizce-1').length +
          sorulariBul('dil', 'ingilizce-2').length +
          sorulariBul('dil', 'ingilizce-3').length,
      108,
    );
    expect(sorulariBul('kod', 'html-1').length, 24);
    expect(sorulariBul('kod', 'css-1').length, 24);
    expect(sorulariBul('kod', 'js-1').length, 24);
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
    'her (alan, kursId, kategori) için en az 4 soru; A1, A2 ve B1 için 6',
    () {
      for (final alan in ['dil', 'kod']) {
        for (final sv in seviyeler(alan)) {
          for (final k in YarismaKategori.values) {
            final adet = sorulariBul(
              alan,
              sv.kursId,
            ).where((s) => s.kategori == k).length;
            expect(adet, greaterThanOrEqualTo(4), reason: '${sv.kursId} $k');
            if (sv.kursId == 'ingilizce-1' ||
                sv.kursId == 'ingilizce-2' ||
                sv.kursId == 'ingilizce-3') {
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
    ]);
    final kod = seviyeler('kod');
    expect(kod.map((s) => (s.kursId, s.etiket)), [
      ('html-1', 'HTML'),
      ('css-1', 'CSS'),
      ('js-1', 'JS'),
    ]);
    expect(seviyeler('bilinmeyen'), isEmpty);
  });

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
