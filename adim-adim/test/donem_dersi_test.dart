// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// ÖZELLİK 63 birim testleri: günün/haftanın/ayın dersi seçimi (takvime bağlı,
/// deterministik, Soyle hariç, yalnız tamamlanan derslerden), tamamlama XP'si
/// ve kaydı, ikinci kez XP yok, bildirim kararı ve eski JSON uyumu.
library;

import 'dart:convert';

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter_test/flutter_test.dart';

import 'sahte_icerik.dart';

/// 3 dersli kurs: 8 Secim + 8 Soyle + 8 Yaz (24 alıştırma, 16'sı uygun).
Kurs _buyuk({KursAlani alan = KursAlani.dil}) => Kurs(
  id: 'b-1',
  ad: 'Büyük',
  aciklama: '',
  alan: alan,
  uniteler: [
    Unite(
      id: 'b-1.u1',
      ad: 'U',
      dersler: [
        Ders(
          id: 'b-1.u1.d1',
          ad: 'D1',
          alistirmalar: [
            for (var i = 0; i < 8; i++)
              Secim(soru: 's$i', secenekler: const ['a', 'b'], dogru: 0),
          ],
        ),
        Ders(
          id: 'b-1.u1.d2',
          ad: 'D2',
          alistirmalar: [
            for (var i = 0; i < 8; i++)
              Soyle(soru: 'söyle', metin: 'hello $i', ceviri: 'merhaba'),
          ],
        ),
        Ders(
          id: 'b-1.u1.d3',
          ad: 'D3',
          alistirmalar: [
            for (var i = 0; i < 8; i++)
              Yaz(soru: 'yaz$i', cevaplar: const ['x']),
          ],
        ),
      ],
    ),
  ],
);

const _bitmis = OgrenciDurumu(
  alan: 'dil',
  tamamlanan: {'b-1.u1.d1': 1, 'b-1.u1.d2': 1, 'b-1.u1.d3': 1},
);

List<String> _idler(List<({String kartId, Alistirma alistirma})> l) => [
  for (final o in l) o.kartId,
];

void main() {
  group('sabitler', () {
    test('adet, XP ve anahtarlar', () {
      expect([for (final t in Motor.donemler) Motor.donemAdet(t)], [8, 12, 16]);
      expect([for (final t in Motor.donemler) Motor.donemXp(t)], [10, 25, 50]);
      // 2026-10-21 Çarşamba; haftanın Pazartesi'si 2026-10-19.
      expect(Motor.donemAnahtari('gunluk', '2026-10-21'), 'g:2026-10-21');
      expect(Motor.donemAnahtari('haftalik', '2026-10-21'), 'h:2026-10-19');
      expect(Motor.donemAnahtari('aylik', '2026-10-21'), 'a:2026-10');
    });
  });

  group('donemDersiSec', () {
    test('tamamlanan ders yoksa boş', () {
      final l = Motor.donemDersiSec(
        const OgrenciDurumu(),
        [sahteKurs],
        'gunluk',
        '2026-10-21',
      );
      expect(l, isEmpty);
      expect(Motor.donemDersiVar(const OgrenciDurumu(), [sahteKurs]), isFalse);
    });

    test('yalnız tamamlanan derslerden, tekrarsız, adet sınırı', () {
      final d = const OgrenciDurumu(tamamlanan: {sahteDers1: 1});
      final l = Motor.donemDersiSec(d, [sahteKurs], 'gunluk', '2026-10-21');
      expect(l.length, 7); // dersin yalnız 7 alıştırması var
      expect(_idler(l).toSet().length, 7);
      expect(l.every((o) => o.kartId.startsWith('$sahteDers1#')), isTrue);
      final iki = const OgrenciDurumu(
        tamamlanan: {sahteDers1: 1, sahteDers2: 2},
      );
      expect(
        Motor.donemDersiSec(iki, [sahteKurs], 'gunluk', '2026-10-21').length,
        8,
      );
    });

    test('Soyle hariç; haftalık 12, aylık 16 (havuz 16)', () {
      final kurs = _buyuk();
      for (final tur in Motor.donemler) {
        final l = Motor.donemDersiSec(_bitmis, [kurs], tur, '2026-10-21');
        expect(l.any((o) => o.alistirma is Soyle), isFalse, reason: tur);
        expect(l.length, Motor.donemAdet(tur), reason: tur);
      }
      expect(Motor.donemDersiVar(_bitmis, [kurs]), isTrue);
      // Yalnız Soyle'li ders tamamlandıysa seçilecek şey yok.
      expect(
        Motor.donemDersiVar(const OgrenciDurumu(tamamlanan: {'b-1.u1.d2': 1}), [
          kurs,
        ]),
        isFalse,
      );
    });

    test('deterministik: aynı gün aynı, farklı gün farklı sıra', () {
      final kurs = _buyuk();
      final a = _idler(
        Motor.donemDersiSec(_bitmis, [kurs], 'gunluk', '2026-10-21'),
      );
      final b = _idler(
        Motor.donemDersiSec(_bitmis, [kurs], 'gunluk', '2026-10-21'),
      );
      final c = _idler(
        Motor.donemDersiSec(_bitmis, [kurs], 'gunluk', '2026-10-22'),
      );
      expect(a, b);
      expect(a, isNot(c));
    });

    test('haftalık seçim hafta içinde, aylık ay içinde sabit', () {
      final kurs = _buyuk();
      List<String> h(String g) =>
          _idler(Motor.donemDersiSec(_bitmis, [kurs], 'haftalik', g));
      List<String> a(String g) =>
          _idler(Motor.donemDersiSec(_bitmis, [kurs], 'aylik', g));
      expect(h('2026-10-19'), h('2026-10-25'));
      expect(h('2026-10-19'), isNot(h('2026-10-26')));
      expect(a('2026-10-01'), a('2026-10-31'));
      expect(a('2026-10-01'), isNot(a('2026-11-01')));
    });

    test('ardışık aynı tür mümkün olduğunca gelmez', () {
      final l = Motor.donemDersiSec(
        _bitmis,
        [_buyuk()],
        'gunluk',
        '2026-10-21',
      );
      for (var i = 1; i < l.length; i++) {
        expect(
          l[i].alistirma.runtimeType == l[i - 1].alistirma.runtimeType,
          isFalse,
          reason: 'sıra $i',
        );
      }
    });
  });

  group('donemDersiBitir', () {
    test('XP, kayıt, seri ve günlük; ikinci kez XP yok', () {
      var d = const OgrenciDurumu();
      d = Motor.donemDersiBitir(d, 'gunluk', 6, 8, '2026-10-21');
      expect(d.xp, 10);
      expect(d.seri, 1);
      expect(d.gunlukXp['2026-10-21'], 10);
      expect(d.donemDersleri, {'g:2026-10-21'});
      expect(d.gunluk.last.tur, GunlukKayit.turMikro);
      expect(d.gunluk.last.id, 'donem-gunluk');
      expect(d.gunluk.last.dogru, 6);
      expect(Motor.donemTamam(d, 'gunluk', '2026-10-21'), isTrue);
      expect(Motor.donemTamam(d, 'gunluk', '2026-10-22'), isFalse);
      final yine = Motor.donemDersiBitir(d, 'gunluk', 8, 8, '2026-10-21');
      expect(identical(yine, d), isTrue);
      // Haftalık ve aylık bağımsızdır.
      d = Motor.donemDersiBitir(d, 'haftalik', 12, 12, '2026-10-21');
      d = Motor.donemDersiBitir(d, 'aylik', 16, 16, '2026-10-21');
      expect(d.xp, 10 + 25 + 50);
      expect(d.donemDersleri, {'g:2026-10-21', 'h:2026-10-19', 'a:2026-10'});
      // Aynı haftanın başka günü haftalık dersi yine tamam sayar.
      expect(Motor.donemTamam(d, 'haftalik', '2026-10-25'), isTrue);
      expect(Motor.donemTamam(d, 'haftalik', '2026-10-26'), isFalse);
    });

    test('geçersiz tür ya da toplam 0: durum değişmez', () {
      const d = OgrenciDurumu();
      expect(
        identical(Motor.donemDersiBitir(d, 'yillik', 1, 1, '2026-10-21'), d),
        isTrue,
      );
      expect(
        identical(Motor.donemDersiBitir(d, 'gunluk', 0, 0, '2026-10-21'), d),
        isTrue,
      );
    });

    test('kümeye en çok 400 anahtar; en eskiler düşer', () {
      var d = OgrenciDurumu(
        donemDersleri: {
          for (var i = 0; i < 400; i++)
            'a:${2000 + i ~/ 12}-${(i % 12 + 1).toString().padLeft(2, '0')}',
        },
      );
      d = Motor.donemDersiBitir(d, 'gunluk', 1, 1, '2026-10-21');
      expect(d.donemDersleri.length, 400);
      expect(d.donemDersleri, contains('g:2026-10-21'));
      expect(d.donemDersleri, isNot(contains('a:2000-01')));
    });
  });

  group('gunDersiBildirimiGerekli', () {
    final kurslar = [_buyuk()];
    OgrenciDurumu d0({bool acik = true, String? son}) => _bitmis.copyWith(
      gunDersiBildirimiAcik: acik,
      sonGunDersiBildirimGunu: son,
    );

    test('varsayılan kapalı', () {
      expect(const OgrenciDurumu().gunDersiBildirimiAcik, isFalse);
      expect(
        Motor.gunDersiBildirimiGerekli(d0(acik: false), kurslar, 'x'),
        null,
      );
    });

    test('açık: alıştırma sayısı; bugün gösterildiyse ya da tamamsa null', () {
      expect(Motor.gunDersiBildirimiGerekli(d0(), kurslar, '2026-10-21'), 8);
      expect(
        Motor.gunDersiBildirimiGerekli(
          d0(son: '2026-10-21'),
          kurslar,
          '2026-10-21',
        ),
        isNull,
      );
      expect(
        Motor.gunDersiBildirimiGerekli(
          Motor.donemDersiBitir(d0(), 'gunluk', 8, 8, '2026-10-21'),
          kurslar,
          '2026-10-21',
        ),
        isNull,
      );
      expect(
        Motor.gunDersiBildirimiGerekli(
          const OgrenciDurumu(alan: 'dil', gunDersiBildirimiAcik: true),
          kurslar,
          '2026-10-21',
        ),
        isNull,
      );
    });

    test('alan dışı kurslar sayılmaz', () {
      expect(
        Motor.gunDersiBildirimiGerekli(
          d0().copyWith(alan: 'kod'),
          kurslar,
          '2026-10-21',
        ),
        isNull,
      );
    });
  });

  group('OgrenciDurumu JSON', () {
    test('eski kayıtta alanlar varsayılan', () {
      final d = OgrenciDurumu.fromJson(jsonDecode('{"xp": 5}'));
      expect(d.donemDersleri, isEmpty);
      expect(d.gunDersiBildirimiAcik, isFalse);
      expect(d.sonGunDersiBildirimGunu, isNull);
    });

    test('gidiş-dönüş; bozuk anahtarlar atlanır', () {
      final d = OgrenciDurumu(
        donemDersleri: const {'g:2026-10-21', 'h:2026-10-19', 'a:2026-10'},
        gunDersiBildirimiAcik: true,
        sonGunDersiBildirimGunu: '2026-10-21',
      );
      final yeni = OgrenciDurumu.fromJson(jsonDecode(jsonEncode(d.toJson())));
      expect(yeni.donemDersleri, d.donemDersleri);
      expect(yeni.gunDersiBildirimiAcik, isTrue);
      expect(yeni.sonGunDersiBildirimGunu, '2026-10-21');
      final bozuk = OgrenciDurumu.fromJson({
        'donemDersleri': ['x', 5, 'g:2026-10-21', 'a:2026-1'],
        'gunDersiBildirimiAcik': 'evet',
        'sonGunDersiBildirimGunu': 'dün',
      });
      expect(bozuk.donemDersleri, {'g:2026-10-21'});
      expect(bozuk.gunDersiBildirimiAcik, isFalse);
      expect(bozuk.sonGunDersiBildirimGunu, isNull);
    });
  });
}
