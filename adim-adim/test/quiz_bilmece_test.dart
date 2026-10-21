// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Ders sonu kısa quiz ve günün bilmecesi birim testleri: quiz soru seçimi
/// (yanlışlar önce, deterministik doldurma, 3'ten az alıştırma), quiz XP ve
/// günlük kaydı (kartlar değişmez), bilmece seçiminin tarihe göre belirlenmesi,
/// aynı gün ikinci cevabın reddi, XP/günlük kayıtları ve durum JSON
/// gidiş-dönüşü (eski JSON'da `bilmece` alanı yok).
library;

import 'dart:convert';

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter_test/flutter_test.dart';

import 'sahte_icerik.dart';

const _gun = '2026-10-15';

Ders _ders(int n, {String id = 'q-1.u1.d1'}) => Ders(
  id: id,
  ad: 'Quiz Dersi',
  alistirmalar: [
    for (var i = 0; i < n; i++)
      Secim(soru: 'Soru $i', secenekler: ['a$i', 'b$i'], dogru: 0),
  ],
);

Kurs _kurs(int secimSayisi) => Kurs(
  id: 'q-1',
  ad: 'Quiz Kursu',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'q-1.u1',
      ad: 'Ü',
      dersler: [
        _ders(secimSayisi),
        const Ders(
          id: 'q-1.u1.d2',
          ad: 'Yaz dersi',
          alistirmalar: [
            Yaz(soru: 'yaz', cevaplar: ['x']),
          ],
        ),
      ],
    ),
  ],
);

void main() {
  group('quizSec', () {
    test('yanlışlar önce, kalan indeks sırasıyla dolar', () {
      final d = _ders(8);
      final s = Motor.quizSec(d, [5, 2]);
      expect(s.map((e) => e.kartId), [
        'q-1.u1.d1#5',
        'q-1.u1.d1#2',
        'q-1.u1.d1#0',
      ]);
      expect(s.length, Motor.quizAdet);
    });

    test('yanlış yoksa ilk üç alıştırma; sonuç deterministik', () {
      final d = _ders(8);
      final a = Motor.quizSec(d, const []);
      final b = Motor.quizSec(d, const []);
      expect(a.map((e) => e.kartId), [
        'q-1.u1.d1#0',
        'q-1.u1.d1#1',
        'q-1.u1.d1#2',
      ]);
      expect(b.map((e) => e.kartId), a.map((e) => e.kartId));
    });

    test('üçten fazla yanlış: ilk üç yanlış alınır', () {
      final s = Motor.quizSec(_ders(8), [7, 6, 5, 4]);
      expect(s.map((e) => e.kartId), [
        'q-1.u1.d1#7',
        'q-1.u1.d1#6',
        'q-1.u1.d1#5',
      ]);
    });

    test('yinelenen ve geçersiz indeksler atlanır', () {
      final s = Motor.quizSec(_ders(4), [3, 3, -1, 99]);
      expect(s.map((e) => e.kartId), [
        'q-1.u1.d1#3',
        'q-1.u1.d1#0',
        'q-1.u1.d1#1',
      ]);
    });

    test('ders 3\'ten az alıştırmaysa hepsi gelir', () {
      expect(Motor.quizSec(_ders(2), [1]).map((e) => e.kartId), [
        'q-1.u1.d1#1',
        'q-1.u1.d1#0',
      ]);
      expect(Motor.quizSec(_ders(0), [0]), isEmpty);
      expect(Motor.quizSec(_ders(5), [0], adet: 0), isEmpty);
    });

    test('yanlisListesiCoz', () {
      expect(Motor.yanlisListesiCoz('0,3,5'), [0, 3, 5]);
      expect(Motor.yanlisListesiCoz(' 2 , x, -1, 4'), [2, 4]);
      expect(Motor.yanlisListesiCoz(null), isEmpty);
      expect(Motor.yanlisListesiCoz(''), isEmpty);
    });
  });

  group('quizXp ve quizBitir', () {
    test('doğru başına 1 XP, sınırlar', () {
      expect(Motor.quizXp(3, 3), 3);
      expect(Motor.quizXp(1, 3), 1);
      expect(Motor.quizXp(0, 3), 0);
      expect(Motor.quizXp(9, 3), 3);
      expect(Motor.quizXp(-1, 3), 0);
      expect(Motor.quizXp(2, -1), 0);
    });

    test(
      'XP/seri işlenir, günlüğe quiz kaydı; kartlar ve tamamlanan değişmez',
      () {
        const d = OgrenciDurumu(
          kartlar: {'q-1.u1.d1#0': Kart(kutu: 2, sonraki: '2026-10-20')},
          tamamlanan: {'q-1.u1.d1': 1},
        );
        final y = Motor.quizBitir(d, 'q-1.u1.d1', 3, 3, _gun);
        expect(y.xp, 3);
        expect(y.gunlukXp[_gun], 3);
        expect(y.seri, 1);
        expect(y.sonGun, _gun);
        expect(y.kartlar, d.kartlar);
        expect(y.tamamlanan, d.tamamlanan);
        expect(y.gunluk, hasLength(1));
        final k = y.gunluk.single;
        expect(k.tur, GunlukKayit.turQuiz);
        expect(k.id, 'q-1.u1.d1');
        expect(k.dogru, 3);
        expect(k.toplam, 3);
        expect(k.xp, 3);
        expect(Motor.gunlukOzeti(y, _gun).xp, 3);
      },
    );

    test('toplam 0 ise durum değişmez', () {
      const d = OgrenciDurumu(xp: 7);
      expect(identical(Motor.quizBitir(d, 'x', 0, 0, _gun), d), isTrue);
    });
  });

  group('bilmeceSec', () {
    test('aynı tarihte aynı, farklı tarihlerde farklı soru seçilebilir', () {
      final kurslar = [_kurs(20)];
      final a = Motor.bilmeceSec(kurslar, _gun)!;
      final b = Motor.bilmeceSec(kurslar, _gun)!;
      expect(a.kartId, b.kartId);
      expect(a.kartId, startsWith('q-1.u1.d1#'));
      final gunler = List.generate(
        14,
        (i) => '2026-10-${(i + 1).toString().padLeft(2, '0')}',
      );
      final farkli = gunler
          .map((g) => Motor.bilmeceSec(kurslar, g)!.kartId)
          .toSet();
      expect(farkli.length, greaterThan(1));
    });

    test('yalnız Secim türü seçilir; Secim yoksa null', () {
      // Sahte kursta her derste bir Secim var (iki aday).
      final s = Motor.bilmeceSec([sahteKurs], _gun);
      expect(s, isNotNull);
      expect(s!.secim.soru, 'İki artı iki kaç eder?');
      expect(Motor.bilmeceSec([_kurs(0)], _gun), isNull);
      expect(Motor.bilmeceSec(const [], _gun), isNull);
    });

    test('metinOzeti FNV-1a deterministik', () {
      expect(Motor.metinOzeti('2026-10-15'), Motor.metinOzeti('2026-10-15'));
      expect(Motor.metinOzeti(''), 0x811c9dc5);
      expect(Motor.metinOzeti('a'), isNot(Motor.metinOzeti('b')));
    });
  });

  group('bilmeceCevapla', () {
    test('doğru: +2 XP, seri, günlük kaydı; bilmece alanı güne yazılır', () {
      const d = OgrenciDurumu();
      expect(Motor.bilmeceCevaplanabilir(d, _gun), isTrue);
      final y = Motor.bilmeceCevapla(d, true, _gun);
      expect(y.xp, Motor.bilmeceXp);
      expect(y.gunlukXp[_gun], 2);
      expect(y.seri, 1);
      expect(y.bilmece?.gun, _gun);
      expect(y.bilmece?.dogru, isTrue);
      expect(y.gunluk.single.tur, GunlukKayit.turBilmece);
      expect(y.gunluk.single.dogru, 1);
      expect(y.gunluk.single.toplam, 1);
      expect(y.gunluk.single.xp, 2);
      expect(Motor.bilmeceCevaplanabilir(y, _gun), isFalse);
      expect(Motor.bilmeceCevaplanabilir(y, '2026-10-16'), isTrue);
    });

    test('yanlış: XP yok, seri değişmez, kayıt ve alan yazılır', () {
      const d = OgrenciDurumu(xp: 10);
      final y = Motor.bilmeceCevapla(d, false, _gun);
      expect(y.xp, 10);
      expect(y.gunlukXp, isEmpty);
      expect(y.seri, 0);
      expect(y.bilmece?.gun, _gun);
      expect(y.bilmece?.dogru, isFalse);
      expect(y.gunluk.single.tur, GunlukKayit.turBilmece);
      expect(y.gunluk.single.dogru, 0);
      expect(y.gunluk.single.xp, 0);
    });

    test('aynı gün ikinci cevap reddedilir; ertesi gün kabul', () {
      final bir = Motor.bilmeceCevapla(const OgrenciDurumu(), false, _gun);
      final iki = Motor.bilmeceCevapla(bir, true, _gun);
      expect(identical(iki, bir), isTrue);
      expect(iki.xp, 0);
      expect(iki.gunluk, hasLength(1));
      final yarin = Motor.bilmeceCevapla(bir, true, '2026-10-16');
      expect(yarin.xp, 2);
      expect(yarin.bilmece?.gun, '2026-10-16');
      expect(yarin.gunluk, hasLength(2));
    });

    test('geçersiz gün: durum değişmez', () {
      const d = OgrenciDurumu();
      expect(identical(Motor.bilmeceCevapla(d, true, '2026-02-30'), d), isTrue);
    });
  });

  group('durum JSON', () {
    test('bilmece ve quiz/bilmece günlük kayıtları gidiş-dönüş', () {
      final d = Motor.bilmeceCevapla(
        Motor.quizBitir(
          const OgrenciDurumu(alan: 'kod'),
          'q-1.u1.d1',
          2,
          3,
          _gun,
        ),
        true,
        _gun,
      );
      final geri = OgrenciDurumu.fromJson(jsonDecode(jsonEncode(d.toJson())));
      expect(geri.bilmece?.gun, _gun);
      expect(geri.bilmece?.dogru, isTrue);
      expect(geri.xp, 4);
      expect(geri.gunluk.map((k) => k.tur), ['quiz', 'bilmece']);
      expect(geri.gunluk.first.id, 'q-1.u1.d1');
    });

    test('eski JSON (bilmece alanı yok) yüklenir; bilmece null', () {
      final d = OgrenciDurumu.fromJson({
        'surum': 1,
        'xp': 42,
        'alan': 'dil',
        'gunluk': [
          {'gun': _gun, 'tur': 'ders', 'id': 'a', 'dogru': 1, 'toplam': 1},
        ],
      });
      expect(d.xp, 42);
      expect(d.bilmece, isNull);
      expect(Motor.bilmeceCevaplanabilir(d, _gun), isTrue);
      expect(d.gunluk, hasLength(1));
    });

    test('bozuk bilmece alanı cevaplanmamış sayılır', () {
      expect(OgrenciDurumu.fromJson({'bilmece': 'metin'}).bilmece, isNull);
      expect(
        OgrenciDurumu.fromJson({
          'bilmece': {'gun': '2026-02-30', 'dogru': true},
        }).bilmece,
        isNull,
      );
      expect(
        OgrenciDurumu.fromJson({
          'bilmece': {'gun': _gun, 'dogru': 'evet'},
        }).bilmece,
        isNull,
      );
      expect(OgrenciDurumu.fromJson({'bilmece': null}).bilmece, isNull);
    });

    test('BilmeceDurumu JSON', () {
      const b = BilmeceDurumu(gun: _gun, dogru: false);
      final g = BilmeceDurumu.fromJson(jsonDecode(jsonEncode(b.toJson())))!;
      expect(g.gun, _gun);
      expect(g.dogru, isFalse);
    });

    test('GunlukKayit yeni türleri tanır', () {
      expect(GunlukKayit.fromJson({'gun': _gun, 'tur': 'quiz'})?.tur, 'quiz');
      expect(
        GunlukKayit.fromJson({'gun': _gun, 'tur': 'bilmece'})?.tur,
        'bilmece',
      );
    });
  });
}
