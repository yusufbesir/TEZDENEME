// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Telaffuz puanı (ÖZELLİK 77): hece bölme, harf düzeyi benzerlik, 0-100
/// tahmini puan, hatalı hece ve eksik/fazla kelime davranışı.
library;

import 'package:adim_adim/motor/telaffuz.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('telaffuzHeceleri', () {
    test('Latin: ünlü gruplarına göre', () {
      expect(telaffuzHeceleri('banana'), ['ba', 'na', 'na']);
      expect(telaffuzHeceleri('hello'), ['hel', 'lo']);
      expect(telaffuzHeceleri('cat'), ['cat']);
    });

    test('İngilizce sessiz son e ayrı hece sayılmaz, Almanca sayılır', () {
      expect(telaffuzHeceleri('make', dil: 'en'), ['make']);
      expect(telaffuzHeceleri('Schule', dil: 'de'), ['Schu', 'le']);
    });

    test('Hangıl, Kana ve Han: her karakter bir hece', () {
      expect(telaffuzHeceleri('안녕'), ['안', '녕']);
      expect(telaffuzHeceleri('こんにちは'), ['こ', 'ん', 'に', 'ち', 'は']);
      expect(telaffuzHeceleri('きょう'), ['きょ', 'う']);
      expect(telaffuzHeceleri('你好'), ['你', '好']);
    });

    test('boş kelime boş liste', () => expect(telaffuzHeceleri('  '), isEmpty));
  });

  group('telaffuzBenzerligi', () {
    test('aynı 1, tamamen farklı 0, tek harf farkı orantılı', () {
      expect(telaffuzBenzerligi('cat', 'cat'), 1.0);
      expect(telaffuzBenzerligi('abc', 'xyz'), 0.0);
      expect(telaffuzBenzerligi('hello', 'hallo'), closeTo(0.8, 1e-9));
      expect(telaffuzBenzerligi('', ''), 1.0);
    });
  });

  group('telaffuzTahmini', () {
    test('tam eşleşme 100, hatalı hece yok', () {
      final t = telaffuzTahmini('Nice to meet you.', 'nice to meet you');
      expect(t.puan, 100);
      expect(t.hataliHeceler, isEmpty);
      expect(t.fazla, 0);
      expect(t.kelimeler.every((k) => k.dogru && k.duyuldu), isTrue);
    });

    test('puan her zaman 0..100', () {
      for (final s in ['', 'zzz qqq', 'a b c d e f g h', 'hello world']) {
        final t = telaffuzTahmini('hello world', s);
        expect(t.puan, inInclusiveRange(0, 100));
      }
      expect(telaffuzTahmini('hello world', '').puan, 0);
      expect(telaffuzTahmini('', 'hello').puan, 0);
    });

    test('tek harf hatası: puan düşer, yalnız o hece hatalı', () {
      // hel-lo ile hel-la: son hece hatalı.
      final t = telaffuzTahmini('hello', 'hella');
      expect(t.puan, 80);
      expect(t.hataliHeceler, ['lo']);
      expect(t.kelimeler.single.heceler.map((h) => h.dogru).toList(), [
        true,
        false,
      ]);
      expect(t.kelimeler.single.dogru, isTrue); // benzerlik 0.8: eşikte
    });

    test('eksik kelime: 0 alır, tüm heceleri hatalı', () {
      final t = telaffuzTahmini('I am from Turkey', 'I am Turkey');
      expect(t.kelimeler.map((k) => k.duyuldu).toList(), [
        true,
        true,
        false,
        true,
      ]);
      expect(t.puan, 75);
      expect(t.hataliHeceler, ['from']);
    });

    test('fazla kelime çeyrek kelime düşürür', () {
      final t = telaffuzTahmini('I have six cats', 'well I have six cats now');
      expect(t.fazla, 2);
      expect(t.puan, 88); // (4 - 0.5) / 4 = 0.875
    });

    test('farklı kelime duyuldu: benzerlik kadar kısmi puan', () {
      final t = telaffuzTahmini('banana', 'banano');
      expect(t.puan, 83);
      expect(t.hataliHeceler, ['na']);
    });

    test('Korece: hatalı karakter hece olarak gösterilir', () {
      final t = telaffuzTahmini('안녕하세요', '안녕하세오', dil: 'ko-KR');
      expect(t.hataliHeceler, ['요']);
      expect(t.puan, 80);
    });

    test('noktalama ve büyük harf puanı etkilemez', () {
      final t = telaffuzTahmini("I'm from Turkey!", "I’M FROM TURKEY");
      expect(t.puan, 100);
    });
  });
}
