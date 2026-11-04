/// Metinden kelime yakalama (SADE 5) saf işlev testleri: ayırma, noktalama
/// ve sayı atma, büyük/küçük harf, tekrar birleştirme, karakter ve kelime
/// sınırları, sözlük kümesi ve öğrenilmişliğe göre işaretleme.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Yazan: [Claude#pano-kelime].
library;

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/metin_kelime.dart';
import 'package:adim_adim/sozluk/sozluk.dart';
import 'package:flutter_test/flutter_test.dart';

import 'sahte_icerik.dart';

void main() {
  group('kelimeleriAyir', () {
    test('noktalama ve sayılar atılır, boşluklar ayraçtır', () {
      expect(
        MetinKelime.kelimeleriAyir('The cat, the dog; 3 birds! (ok)', 'en'),
        ['the', 'cat', 'dog', 'birds', 'ok'],
      );
    });

    test('büyük/küçük harf birleşir, sıra ilk görülmeye göredir', () {
      expect(MetinKelime.kelimeleriAyir('Cat CAT cat Dog dog', 'en'), [
        'cat',
        'dog',
      ]);
    });

    test("kesme işaretli kelime bütün kalır, aksanlı Latin harf korunur", () {
      expect(MetinKelime.kelimeleriAyir("Don't stop — café naïve", 'en'), [
        "don't",
        'stop',
        'café',
        'naïve',
      ]);
    });

    test('Türkçe dilinde İ→i, I→ı küçültmesi; boş metin boş liste', () {
      expect(MetinKelime.kelimeleriAyir('İstanbul ISPARTA', 'tr'), [
        'istanbul',
        'ısparta',
      ]);
      expect(MetinKelime.kelimeleriAyir('', 'en'), isEmpty);
      expect(MetinKelime.kelimeleriAyir('123 ... !!!', 'en'), isEmpty);
    });

    test('Latin dışı dil kodunda ayrıştırma yapılmaz', () {
      expect(MetinKelime.kelimeleriAyir('cat dog', 'ko'), isEmpty);
      expect(MetinKelime.kelimeleriAyir('cat dog', 'ja'), isEmpty);
    });

    test('metin 5.000 karakterde kesilir', () {
      // 4.998 'a' + boşluk + 'zzz': 'zzz' sınırın dışında kalır.
      final metin = '${'a' * 4998} zzz';
      expect(MetinKelime.enCokKarakter, 5000);
      expect(MetinKelime.kelimeleriAyir(metin, 'en'), ['a' * 4998, 'z']);
      // Sınır içinde kalan kelime bütün alınır.
      final icinde = '${'a' * 4990} zzz';
      expect(MetinKelime.kelimeleriAyir(icinde, 'en'), ['a' * 4990, 'zzz']);
    });

    test('en çok 200 tekil kelime', () {
      final metin = List.generate(250, (i) => 'w${_harf(i)}').join(' ');
      final sonuc = MetinKelime.kelimeleriAyir(metin, 'en');
      expect(MetinKelime.enCokKelime, 200);
      expect(sonuc.length, 200);
      expect(sonuc.first, 'w${_harf(0)}');
      expect(sonuc.last, 'w${_harf(199)}');
      // Tekrarlar sınırı tüketmez.
      final tekrarli = List.generate(250, (i) => 'w${_harf(i % 10)}').join(' ');
      expect(MetinKelime.kelimeleriAyir(tekrarli, 'en').length, 10);
    });
  });

  group('bilinmeyenler', () {
    final sozluk = Sozluk.kurslardan([sahteKurs]);
    final kume = MetinKelime.sozlukKumesi(sozluk);
    const kedi = '$sahteDers1#4';

    test('sözlük kümesi: sahte kursun cat/dog/bird maddeleri', () {
      expect(kume['cat']?.anlam, 'kedi');
      expect(kume['dog']?.anlam, 'köpek');
      expect(kume['bird']?.anlam, 'kuş');
      expect(kume['cat']?.kartKimligi, kedi);
      expect(kume.containsKey('zzz'), isFalse);
    });

    test('sözlükte olup öğrenilmemişler işaretlenir, olmayanlar ayrı', () {
      final s = MetinKelime.bilinmeyenler(
        ['the', 'cat', 'dog', 'zzz'],
        kume,
        const {},
      );
      expect(s.isaretli.map((m) => m.kelime), ['cat', 'dog']);
      expect(s.sozlukDisi, ['the', 'zzz']);
      expect(s.ogrenilmis, isEmpty);
    });

    test('öğrenilmiş kart ayrılır; zayıf kart işaretlenmeye devam eder', () {
      const guclu = Kart(kutu: 4, sonraki: '2026-10-20', yariOmurGun: 10);
      const zayif = Kart(kutu: 1, sonraki: '2026-10-16', yariOmurGun: 1);
      expect(MetinKelime.ogrenilmis(guclu), isTrue);
      expect(MetinKelime.ogrenilmis(zayif), isFalse);
      expect(MetinKelime.ogrenilmis(null), isFalse);

      final kartlar = {kedi: guclu, '$sahteDers1#99': zayif};
      expect(MetinKelime.ogrenilmisKartlar(kartlar), {kedi});

      // cat/dog aynı eşleştirme alıştırmasından gelir, kartı paylaşır:
      // kart öğrenilmişse ikisi de öğrenilmiş sayılır (bilinen sınır).
      final s = MetinKelime.isaretle('Cat and dog.', 'en', sozluk, kartlar);
      expect(s.ogrenilmis, ['cat', 'dog']);
      expect(s.isaretli, isEmpty);
      expect(s.sozlukDisi, ['and']);

      // Kart zayıfsa işaretlenmeye devam eder.
      final z = MetinKelime.isaretle('Cat and dog.', 'en', sozluk, {
        kedi: zayif,
      });
      expect(z.isaretli.map((m) => m.kelime), ['cat', 'dog']);
    });

    test('aynı maddeye giden iki kelime bir kez işaretlenir', () {
      // "cats" kökü "cat" maddesine gider; madde tek kez listelenir.
      final s = MetinKelime.isaretle('cat cats', 'en', sozluk, const {});
      expect(s.isaretli.length, 1);
      expect(s.isaretli.single.kelime, 'cat');
    });

    test('dil süzgeci: yalnız o dilin maddeleri eşleşir', () {
      final kod = MetinKelime.sozlukKumesi(sozluk, dil: 'kod');
      expect(kod.containsKey('cat'), isFalse);
      final en = MetinKelime.sozlukKumesi(sozluk, dil: 'en');
      expect(en.containsKey('cat'), isTrue);
    });
  });
}

/// Rakamsız ayırt edilir kelime eki (sayılar ayraçtır): 0→aa, 1→ab ...
String _harf(int i) =>
    String.fromCharCode(97 + i ~/ 26) + String.fromCharCode(97 + i % 26);
