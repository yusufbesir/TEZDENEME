// "Arkadaşla oyna" düello motoru testleri: puan, bonus, süre aşımı, sıra, tohum.
// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım özellikler#cihaz] Claude
// Yalnız onu yazan yapay zekâ değiştirir; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
import 'package:adim_adim/yarisma/arkadasla/duello_motoru.dart';
import 'package:adim_adim/yarisma/model.dart';
import 'package:flutter_test/flutter_test.dart';

YarismaSorusu soru(int n, {int dogru = 0, bool gecerli = true}) =>
    YarismaSorusu(
      id: 'k.t.${n.toString().padLeft(3, '0')}',
      alan: 'dil',
      seviyeKursId: 'ingilizce-1',
      kategori: YarismaKategori.tarih,
      soru: 'Soru $n?',
      secenekler: gecerli ? ['a$n', 'b$n', 'c$n', 'd$n'] : ['x', 'x', 'c', 'd'],
      dogru: dogru,
      aciklama: 'Açıklama $n',
    );

List<YarismaSorusu> havuz(int adet) => [for (var i = 0; i < adet; i++) soru(i)];

DuelloDurumu uygula(DuelloDurumu d, Taraf t, String id, int sec, int ms) {
  final s = cevapUygula(d, t, id, sec, ms);
  expect(s.basarili, isTrue, reason: 'hata: ${s.hata}');
  return s.durum!;
}

/// Her iki taraf da sırayla mevcut soruyu cevaplar.
DuelloDurumu turOyna(
  DuelloDurumu d, {
  int benSec = 0,
  int rakipSec = 0,
  int benMs = 1000,
  int rakipMs = 1000,
}) {
  final id = d.mevcutSoru!.id;
  final ilk = d.sira;
  var y = uygula(
    d,
    ilk,
    id,
    ilk == Taraf.ben ? benSec : rakipSec,
    ilk == Taraf.ben ? benMs : rakipMs,
  );
  final ikinci = ilk.tersi;
  y = uygula(
    y,
    ikinci,
    id,
    ikinci == Taraf.ben ? benSec : rakipSec,
    ikinci == Taraf.ben ? benMs : rakipMs,
  );
  return y;
}

void main() {
  group('puanlama', () {
    test('hızlı doğru 15 puan (<=5000 ms)', () {
      expect(cevapPuani(dogru: true, gecenMs: 0), 15);
      expect(cevapPuani(dogru: true, gecenMs: 5000), 15);
    });
    test('orta doğru 12 puan (<=10000 ms)', () {
      expect(cevapPuani(dogru: true, gecenMs: 5001), 12);
      expect(cevapPuani(dogru: true, gecenMs: 10000), 12);
    });
    test('yavaş doğru 10 puan (<=15000 ms)', () {
      expect(cevapPuani(dogru: true, gecenMs: 10001), 10);
      expect(cevapPuani(dogru: true, gecenMs: 15000), 10);
    });
    test('süre aşımı (>15000) yanlış sayılır, 0 puan', () {
      expect(cevapPuani(dogru: true, gecenMs: 15001), 0);
    });
    test('yanlış cevap 0 puan', () {
      expect(cevapPuani(dogru: false, gecenMs: 100), 0);
    });
    test('motor: doğru cevap puanı taraf hanesine yazılır', () {
      var d = duelloBaslat(sorular: havuz(2));
      d = uygula(d, Taraf.ben, d.mevcutSoru!.id, 0, 3000);
      expect(d.benimPuan, 15);
      expect(d.rakipPuan, 0);
      d = uygula(d, Taraf.rakip, d.mevcutSoru!.id, 0, 12000);
      expect(d.rakipPuan, 10);
    });
    test('motor: süre aşımı kaydı dogru=false', () {
      var d = duelloBaslat(sorular: havuz(1));
      d = uygula(d, Taraf.ben, d.mevcutSoru!.id, 0, 16000);
      expect(d.benimPuan, 0);
      expect(d.cevaplar.single.dogru, isFalse);
    });
    test('motor: yanlış şık 0 puan', () {
      var d = duelloBaslat(sorular: havuz(1));
      d = uygula(d, Taraf.ben, d.mevcutSoru!.id, 2, 100);
      expect(d.benimPuan, 0);
    });
  });

  group('sıra ve ilerleme', () {
    test('başlangıçta sıra ilkSira, 0. indeks', () {
      final d = duelloBaslat(sorular: havuz(3), ilkSira: Taraf.rakip);
      expect(d.sira, Taraf.rakip);
      expect(d.mevcutIndeks, 0);
      expect(d.bitti, isFalse);
    });
    test('ilk cevaptan sonra sıra diğer tarafa geçer, indeks aynı', () {
      var d = duelloBaslat(sorular: havuz(3));
      d = uygula(d, Taraf.ben, d.mevcutSoru!.id, 0, 100);
      expect(d.sira, Taraf.rakip);
      expect(d.mevcutIndeks, 0);
    });
    test('iki cevaptan sonra sonraki soruya geçilir, ilk yanıtlayan döner', () {
      var d = duelloBaslat(sorular: havuz(3));
      d = turOyna(d);
      expect(d.mevcutIndeks, 1);
      expect(d.sira, Taraf.rakip);
      d = turOyna(d);
      expect(d.mevcutIndeks, 2);
      expect(d.sira, Taraf.ben);
    });
    test('10 soru sonunda oyun biter', () {
      var d = duelloBaslat(sorular: havuz(10));
      for (var i = 0; i < 10; i++) {
        d = turOyna(d);
      }
      expect(d.bitti, isTrue);
      expect(d.cevaplar, hasLength(20));
      expect(d.mevcutSoru, isNull);
    });
    test('geçersiz sorular başlangıçta elenir', () {
      final d = duelloBaslat(
        sorular: [soru(1), soru(2, gecerli: false), soru(3)],
      );
      expect(d.sorular, hasLength(2));
    });
  });

  group('hata durumları', () {
    test('sırası gelmeyen taraf cevap veremez', () {
      final d = duelloBaslat(sorular: havuz(2));
      final s = cevapUygula(d, Taraf.rakip, d.mevcutSoru!.id, 0, 100);
      expect(s.hata, DuelloHatasi.sirasiGelmedi);
      expect(s.durum, isNull);
    });
    test('aynı taraf aynı soruya ikinci cevap veremez', () {
      var d = duelloBaslat(sorular: havuz(2));
      final id = d.mevcutSoru!.id;
      d = uygula(d, Taraf.ben, id, 0, 100);
      final s = cevapUygula(d, Taraf.ben, id, 1, 100);
      expect(s.hata, isNotNull);
    });
    test('biten soruya geri dönüp cevap vermek ikinciCevap', () {
      var d = duelloBaslat(sorular: havuz(2));
      final eskiId = d.mevcutSoru!.id;
      d = turOyna(d);
      final s = cevapUygula(d, d.sira, eskiId, 0, 100);
      expect(s.hata, DuelloHatasi.ikinciCevap);
    });
    test('sırası gelmemiş (ileri) soru reddedilir', () {
      final d = duelloBaslat(sorular: havuz(3));
      final s = cevapUygula(d, Taraf.ben, d.sorular[2].id, 0, 100);
      expect(s.hata, DuelloHatasi.sirasiGelmedi);
    });
    test('bilinmeyen soru reddedilir', () {
      final d = duelloBaslat(sorular: havuz(2));
      expect(
        cevapUygula(d, Taraf.ben, 'yok', 0, 100).hata,
        DuelloHatasi.bilinmeyenSoru,
      );
    });
    test('geçersiz seçenek reddedilir', () {
      final d = duelloBaslat(sorular: havuz(2));
      final id = d.mevcutSoru!.id;
      expect(
        cevapUygula(d, Taraf.ben, id, 4, 100).hata,
        DuelloHatasi.gecersizSecenek,
      );
      expect(
        cevapUygula(d, Taraf.ben, id, -1, 100).hata,
        DuelloHatasi.gecersizSecenek,
      );
    });
    test('negatif süre reddedilir', () {
      final d = duelloBaslat(sorular: havuz(2));
      expect(
        cevapUygula(d, Taraf.ben, d.mevcutSoru!.id, 0, -1).hata,
        DuelloHatasi.gecersizSure,
      );
    });
    test('bitmiş oyuna cevap reddedilir', () {
      var d = duelloBaslat(sorular: havuz(1));
      d = turOyna(d);
      expect(
        cevapUygula(d, Taraf.ben, 'k.t.000', 0, 100).hata,
        DuelloHatasi.bitti,
      );
    });
    test('reddedilen cevap durumu değiştirmez', () {
      final d = duelloBaslat(sorular: havuz(2));
      cevapUygula(d, Taraf.rakip, d.mevcutSoru!.id, 0, 100);
      expect(d.cevaplar, isEmpty);
      expect(d.benimPuan, 0);
    });
  });

  group('sonuç', () {
    test('bitmeden sonuç null', () {
      expect(sonucHesapla(duelloBaslat(sorular: havuz(2))), isNull);
    });
    test('kazandı', () {
      var d = duelloBaslat(sorular: havuz(2));
      d = turOyna(d, benSec: 0, rakipSec: 1);
      d = turOyna(d, benSec: 0, rakipSec: 1);
      expect(sonucHesapla(d), DuelloSonucu.kazandi);
    });
    test('kaybetti', () {
      var d = duelloBaslat(sorular: havuz(2));
      d = turOyna(d, benSec: 3, rakipSec: 0);
      d = turOyna(d, benSec: 3, rakipSec: 0);
      expect(sonucHesapla(d), DuelloSonucu.kaybetti);
    });
    test('berabere', () {
      var d = duelloBaslat(sorular: havuz(3));
      for (var i = 0; i < 3; i++) {
        d = turOyna(d);
      }
      expect(d.benimPuan, d.rakipPuan);
      expect(sonucHesapla(d), DuelloSonucu.berabere);
    });
    test('hız bonusu sonucu belirleyebilir', () {
      var d = duelloBaslat(sorular: havuz(1));
      d = turOyna(d, benMs: 1000, rakipMs: 9000);
      expect(d.benimPuan, 15);
      expect(d.rakipPuan, 12);
      expect(sonucHesapla(d), DuelloSonucu.kazandi);
    });
  });

  group('duelloSorulariSec', () {
    test('aynı tohum aynı dizi', () {
      final h = havuz(40);
      final a = duelloSorulariSec(h, 12345).map((s) => s.id).toList();
      final b = duelloSorulariSec(h, 12345).map((s) => s.id).toList();
      expect(a, b);
      expect(a, hasLength(10));
    });
    test('havuz sırasından bağımsız (iki cihazda farklı sırada olsa da)', () {
      final h = havuz(40);
      final ters = h.reversed.toList();
      expect(
        duelloSorulariSec(ters, 7).map((s) => s.id).toList(),
        duelloSorulariSec(h, 7).map((s) => s.id).toList(),
      );
    });
    test('farklı tohum genelde farklı dizi', () {
      final h = havuz(40);
      expect(
        duelloSorulariSec(h, 1).map((s) => s.id).toList(),
        isNot(duelloSorulariSec(h, 2).map((s) => s.id).toList()),
      );
    });
    test('tekrar yok', () {
      final ids = duelloSorulariSec(havuz(40), 99).map((s) => s.id).toList();
      expect(ids.toSet(), hasLength(ids.length));
    });
    test('geçersiz sorular kullanılmaz', () {
      final h = [...havuz(12), soru(100, gecerli: false)];
      final sec = duelloSorulariSec(h, 5, adet: 13);
      expect(sec.every((s) => s.gecerliMi), isTrue);
      expect(sec, hasLength(12));
    });
    test('havuz küçükse eldekini döner, adet sınırı çalışır', () {
      expect(duelloSorulariSec(havuz(4), 3), hasLength(4));
      expect(duelloSorulariSec(havuz(30), 3, adet: 5), hasLength(5));
      expect(duelloSorulariSec(havuz(30), 3, adet: 0), isEmpty);
    });
    test('tohum 0 ve negatif tohum çalışır', () {
      expect(duelloSorulariSec(havuz(20), 0), hasLength(10));
      expect(duelloSorulariSec(havuz(20), -5), hasLength(10));
    });
  });
}
