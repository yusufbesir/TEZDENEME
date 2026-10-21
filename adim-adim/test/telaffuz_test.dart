// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Telaffuz puanlama (ÖZELLİK 8.7): tam eşleşme, büyük/küçük harf ve noktalama,
/// eksik ve fazla kelime, eşik; Soyle JSON gidiş-dönüşü; içerikte Soyle sayısı;
/// ayar alanı JSON uyumluluğu; sahte ve "yok" konuşma servisleri.
library;

import 'dart:convert';

import 'package:adim_adim/icerik/ingilizce_a1.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/motor/telaffuz.dart';
import 'package:adim_adim/servis/konusma.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('telaffuzPuani', () {
    test('tam eşleşme: oran 1, tüm kelimeler doğru', () {
      final p = telaffuzPuani('Nice to meet you.', 'nice to meet you');
      expect(p.oran, 1.0);
      expect(p.kelimeler.map((k) => k.dogru), everyElement(isTrue));
      expect(p.kelimeler.map((k) => k.kelime).join(' '), 'Nice to meet you.');
      expect(telaffuzDogruMu(p.oran), isTrue);
    });

    test('büyük/küçük harf ve noktalama yok sayılır', () {
      final p = telaffuzPuani("Hello, my name is Ali!", 'HELLO MY NAME IS ALI');
      expect(p.oran, 1.0);
      final k = telaffuzPuani("I'm from Turkey.", "I’M FROM TURKEY");
      expect(k.oran, 1.0);
    });

    test('eksik kelime: oran düşer, eksik kelime kırmızı', () {
      final p = telaffuzPuani('I am from Turkey', 'I am Turkey');
      expect(p.oran, closeTo(0.75, 1e-9));
      expect(p.kelimeler.map((k) => k.dogru).toList(), [
        true,
        true,
        false,
        true,
      ]);
      expect(telaffuzDogruMu(p.oran), isFalse);
    });

    test('fazla kelime cezalandırılmaz (hedef kelimeler bulunduysa)', () {
      final p = telaffuzPuani('I have six cats', 'well I have six cats now');
      expect(p.oran, 1.0);
      expect(p.kelimeler.every((k) => k.dogru), isTrue);
    });

    test('sıra bozuksa eşleşme düşer', () {
      final p = telaffuzPuani('my bag is black', 'black is bag my');
      expect(p.oran, lessThan(0.8));
    });

    test('eşik: 4/5 doğru (0,8), 3/4 değil', () {
      final p = telaffuzPuani('one two three four five', 'one two three five');
      expect(p.oran, closeTo(0.8, 1e-9));
      expect(telaffuzDogruMu(p.oran), isTrue);
      expect(telaffuzDogruMu(0.79), isFalse);
      expect(telaffuzEsigi, 0.8);
    });

    test('boş söylenen ve boş hedef', () {
      expect(telaffuzPuani('Hello there', '').oran, 0.0);
      expect(telaffuzPuani('', 'hello').oran, 0.0);
      expect(telaffuzPuani('', '').kelimeler, isEmpty);
    });
  });

  group('Soyle modeli', () {
    const s = Soyle(
      soru: 'Cümleyi yüksek sesle söyle.',
      metin: 'I am from Turkey.',
      ceviri: "Türkiye'denim.",
      aciklama: 'Yavaş söyle.',
    );

    test('JSON gidiş-dönüş', () {
      final json = jsonDecode(jsonEncode(s.toJson())) as Map<String, Object?>;
      expect(json['tur'], 'soyle');
      final geri = Alistirma.fromJson(json);
      expect(geri, isA<Soyle>());
      geri as Soyle;
      expect(geri.metin, s.metin);
      expect(geri.ceviri, s.ceviri);
      expect(geri.aciklama, s.aciklama);
      expect(jsonEncode(geri.toJson()), jsonEncode(s.toJson()));
    });

    test('Motor: cevap bool, doğru cevap metni, ipuçları', () {
      expect(Motor.cevapDogruMu(s, true), isTrue);
      expect(Motor.cevapDogruMu(s, false), isFalse);
      expect(Motor.cevapDogruMu(s, null), isFalse);
      expect(Motor.dogruCevapMetni(s), 'I am from Turkey.');
      expect(Motor.ipucuUret(s, 1), 'İlk kelime: I');
      expect(Motor.ipucuUret(s, 2), 'Çözüm: I am from Turkey.');
    });
  });

  test('İngilizce A1 ilk üç ünitenin her dersinde tam 1 Soyle var', () {
    final ilkUc = ingilizceA1.uniteler.take(3).toList();
    expect(ilkUc.length, 3);
    var toplam = 0;
    for (final u in ilkUc) {
      for (final d in u.dersler) {
        final n = d.alistirmalar.whereType<Soyle>().length;
        expect(n, 1, reason: d.id);
        toplam += n;
      }
    }
    expect(toplam, 6);
    for (final u in ingilizceA1.uniteler.skip(3)) {
      for (final d in u.dersler) {
        expect(d.alistirmalar.whereType<Soyle>(), isEmpty, reason: d.id);
      }
    }
  });

  group('konusmaAcik ayarı', () {
    test('varsayılan true, JSON gidiş-dönüş', () {
      expect(const OgrenciDurumu().konusmaAcik, isTrue);
      final kapali = const OgrenciDurumu().copyWith(konusmaAcik: false);
      final geri = OgrenciDurumu.fromJson(
        jsonDecode(jsonEncode(kapali.toJson())) as Map<String, Object?>,
      );
      expect(geri.konusmaAcik, isFalse);
    });

    test('eski JSON (alan yok) ve bozuk değer: true', () {
      expect(OgrenciDurumu.fromJson(const {'surum': 1}).konusmaAcik, isTrue);
      expect(
        OgrenciDurumu.fromJson(const {'konusmaAcik': 'x'}).konusmaAcik,
        isTrue,
      );
    });
  });

  group('konuşma servisleri', () {
    test('SahteKonusma verilen metni döndürür', () async {
      final k = SahteKonusma(yanitlar: ['hello there']);
      expect(await k.hazirMi(), isTrue);
      expect(await k.izinIste(), isTrue);
      expect(await k.dinle(dil: 'en-US').toList(), ['hello there']);
      expect(k.dinlenenDiller, ['en-US']);
      expect(await k.dinle(dil: 'en-US').toList(), isEmpty);
    });

    test('KonusmaYok hazır değil', () async {
      const k = KonusmaYok();
      expect(await k.hazirMi(), isFalse);
      expect(await k.izinIste(), isFalse);
      expect(await k.dinle(dil: 'en-US').toList(), isEmpty);
      await k.durdur();
    });
  });
}
