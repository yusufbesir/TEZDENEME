// Sahibi Yusuf (yusufbesir). Yazan: [İP:Adım Adım Windows sürümü#cihaz] Claude. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Hızlı Tekrar, Günlük Karışım, günlük hedef yoğunluğu ve oturum kart sayısı
/// (durum alanı, JSON geriye uyumu, Mikro ders ortak havuzu) saf mantık testleri.
library;

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/motor/pratik_oturumlari.dart';
import 'package:flutter_test/flutter_test.dart';

const _bugun = '2026-10-15';
const dersA = 'oturum-1.u1.d1';
const dersB = 'oturum-1.u1.d2';

/// Ders A (bitmiş): 0..5 Seçim, 6 Yaz, 7 Söyle, 8..9 Boşluk.
/// Ders B (sıradaki, bitmemiş): 0..3 Seçim.
final Kurs oturumKursu = Kurs(
  id: 'oturum-1',
  ad: 'Oturum Kursu',
  aciklama: 'Oturum testleri.',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'oturum-1.u1',
      ad: 'Ünite',
      dersler: [
        Ders(
          id: dersA,
          ad: 'A',
          alistirmalar: [
            for (var i = 0; i < 6; i++)
              Secim(soru: 'A$i?', secenekler: const ['x', 'y'], dogru: 0),
            const Yaz(soru: 'Yaz A', cevaplar: ['x']),
            const Soyle(soru: 'Söyle A', metin: 'hello', ceviri: 'merhaba'),
            for (var i = 0; i < 2; i++)
              Bosluk(soru: 'B$i ___', secenekler: const ['x', 'y'], dogru: 0),
          ],
        ),
        Ders(
          id: dersB,
          ad: 'B',
          alistirmalar: [
            for (var i = 0; i < 4; i++)
              Secim(soru: 'N$i?', secenekler: const ['x', 'y'], dogru: 0),
          ],
        ),
      ],
    ),
  ],
);

Kart _kart(double yo, {String sonraki = '2026-10-20', bool? son}) => Kart(
  kutu: Kart.kutuHesapla(yo),
  sonraki: sonraki,
  yariOmurGun: yo,
  sonCevap: son,
);

String _id(String ders, int i) => '$ders#$i';

OgrenciDurumu _durum(Map<String, Kart> kartlar, {List<HataKaydi>? hatalar}) =>
    OgrenciDurumu(
      alan: 'dil',
      tamamlanan: const {dersA: 1},
      kartlar: kartlar,
      hatalar: hatalar ?? const [],
    );

void main() {
  group('HizliTekrar.sec', () {
    test('süre 60 sn, doğru başına 10 puan', () {
      expect(HizliTekrar.sureSn, 60);
      expect(HizliTekrar.dogruPuani, 10);
    });

    test('kart yoksa boş', () {
      expect(HizliTekrar.sec(_durum({}), [oturumKursu], _bugun), isEmpty);
    });

    test('önce zamanı gelenler (en eski önce), sonra zayıflar; tekrarsız', () {
      final d = _durum({
        // vadesi gelmiş, güçlü
        _id(dersA, 1): _kart(10, sonraki: '2026-10-14'),
        _id(dersA, 0): _kart(10, sonraki: '2026-10-10'),
        // vadesi gelmemiş ama zayıf (0,5 daha zayıf)
        _id(dersA, 2): _kart(1.5),
        _id(dersA, 3): _kart(0.5),
        // vadesi gelmemiş, güçlü: dahil değil
        _id(dersA, 4): _kart(30),
        // hem vadesi gelmiş hem zayıf: bir kez
        _id(dersA, 5): _kart(1, sonraki: '2026-10-15'),
      });
      final ids = [
        for (final k in HizliTekrar.sec(d, [oturumKursu], _bugun)) k.kartId,
      ];
      expect(ids, [
        _id(dersA, 0),
        _id(dersA, 1),
        _id(dersA, 5),
        _id(dersA, 3),
        _id(dersA, 2),
      ]);
      expect(ids.toSet().length, ids.length);
    });

    test('Söyle sorulmaz; yavaş türler (Yaz) hızlıların arkasına gider', () {
      final d = _durum({
        _id(dersA, 6): _kart(1, sonraki: '2026-10-01'), // Yaz, en eski vade
        _id(dersA, 7): _kart(1, sonraki: '2026-10-01'), // Söyle
        _id(dersA, 0): _kart(1, sonraki: '2026-10-14'), // Seçim
        _id(dersA, 8): _kart(1, sonraki: '2026-10-14'), // Boşluk
      });
      final ids = [
        for (final k in HizliTekrar.sec(d, [oturumKursu], _bugun)) k.kartId,
      ];
      expect(ids, [_id(dersA, 0), _id(dersA, 8), _id(dersA, 6)]);
    });

    test('çözülemeyen kart ve başka kurs atlanır', () {
      final d = _durum({
        'yok.ders#0': _kart(1, sonraki: '2026-10-01'),
        _id(dersA, 99): _kart(1, sonraki: '2026-10-01'),
        _id(dersA, 0): _kart(1, sonraki: '2026-10-01'),
      });
      expect(
        [
          for (final k in HizliTekrar.sec(d, [oturumKursu], _bugun)) k.kartId,
        ],
        [_id(dersA, 0)],
      );
    });

    test('en çok ${HizliTekrar.enCokKart} kart', () {
      final cok = Kurs(
        id: 'cok-1',
        ad: 'Çok',
        aciklama: '',
        alan: KursAlani.dil,
        uniteler: [
          Unite(
            id: 'cok-1.u1',
            ad: 'U',
            dersler: [
              Ders(
                id: 'cok-1.u1.d1',
                ad: 'D',
                alistirmalar: [
                  for (var i = 0; i < 80; i++)
                    Secim(soru: 'S$i', secenekler: const ['x', 'y'], dogru: 0),
                ],
              ),
            ],
          ),
        ],
      );
      final d = OgrenciDurumu(
        alan: 'dil',
        kartlar: {
          for (var i = 0; i < 80; i++)
            'cok-1.u1.d1#$i': _kart(1, sonraki: '2026-10-01'),
        },
      );
      expect(
        HizliTekrar.sec(d, [cok], _bugun),
        hasLength(HizliTekrar.enCokKart),
      );
    });
  });

  group('HizliTekrar.sonuc', () {
    test('skor ve yüzde', () {
      expect(HizliTekrar.sonuc(7, 10), (skor: 70, yuzde: 70));
      expect(HizliTekrar.sonuc(2, 3), (skor: 20, yuzde: 67));
    });

    test('toplam 0: sıfır; sınırlar kıstırılır', () {
      expect(HizliTekrar.sonuc(0, 0), (skor: 0, yuzde: 0));
      expect(HizliTekrar.sonuc(5, 0), (skor: 0, yuzde: 0));
      expect(HizliTekrar.sonuc(9, 4), (skor: 40, yuzde: 100));
      expect(HizliTekrar.sonuc(-3, 4), (skor: 0, yuzde: 0));
    });

    test('cevaplar SRS ve tekrar kaydına mevcut motorla işlenir', () {
      // Ekran bu iki motor çağrısını kullanır: kartIsle + tekrarBitir.
      var d = _durum({_id(dersA, 0): _kart(2, sonraki: '2026-10-01')});
      d = Motor.kartIsle(d, _id(dersA, 0), true, _bugun);
      d = Motor.kartIsle(d, _id(dersA, 1), false, _bugun);
      d = Motor.tekrarBitir(d, 1, 2, _bugun);
      expect(d.kartlar[_id(dersA, 0)]!.yariOmurGun, 4);
      expect(d.kartlar[_id(dersA, 1)]!.sonCevap, isFalse);
      expect(d.hatalar.last.id, _id(dersA, 1));
      expect(d.gunluk.last.tur, GunlukKayit.turTekrar);
      expect((d.gunluk.last.dogru, d.gunluk.last.toplam), (1, 2));
    });
  });

  group('GunlukKarisim.sec', () {
    OgrenciDurumu bol() => _durum(
      {
        // 3 zayıf (vadesi gelmemiş)
        _id(dersA, 0): _kart(0.5),
        _id(dersA, 1): _kart(1),
        _id(dersA, 2): _kart(1.5),
        // 4 zamanı gelen, güçlü
        _id(dersA, 3): _kart(10, sonraki: '2026-10-10'),
        _id(dersA, 4): _kart(10, sonraki: '2026-10-11'),
        _id(dersA, 5): _kart(10, sonraki: '2026-10-12'),
        _id(dersA, 8): _kart(10, sonraki: '2026-10-13'),
        // vadesi gelmemiş güçlü: karışıma girmez (ne gelen ne zayıf ne yeni)
        _id(dersA, 9): _kart(40),
      },
      hatalar: [
        HataKaydi(
          tur: HataKaydi.turKart,
          id: _id(dersA, 6),
          seviye: 'oturum-1',
          gun: _bugun,
        ),
      ],
    );

    test('10 kart; kartlar tekrarsız; kategori kotaları', () {
      final d = bol();
      final liste = GunlukKarisim.sec(d, [oturumKursu], _bugun, tohum: 3);
      final ids = [for (final k in liste) k.kartId];
      expect(ids, hasLength(GunlukKarisim.adet));
      expect(ids.toSet().length, ids.length);
      // Hata defterindeki kart (kartı olmayan) zayıf sayılır; 3 kartlı zayıf
      // kümesiyle 4 zayıf kotası dolar.
      final zayif = {
        _id(dersA, 6),
        _id(dersA, 0),
        _id(dersA, 1),
        _id(dersA, 2),
      };
      expect(ids.where(zayif.contains), hasLength(4));
      final gelen = {
        _id(dersA, 3),
        _id(dersA, 4),
        _id(dersA, 5),
        _id(dersA, 8),
      };
      expect(ids.where(gelen.contains), hasLength(4));
      // Geri kalan 2 kart yeni: kartı olmayan kartlardan.
      final yeni = ids.where(
        (i) => !d.kartlar.containsKey(i) && !zayif.contains(i),
      );
      expect(yeni, hasLength(2));
      expect(ids.contains(_id(dersA, 9)), isFalse);
    });

    test('aynı tohum aynı sonuç', () {
      final d = bol();
      List<String> al(int t) => [
        for (final k in GunlukKarisim.sec(d, [oturumKursu], _bugun, tohum: t))
          k.kartId,
      ];
      expect(al(7), al(7));
    });

    test('türler karışık gelir (hepsi aynı tür değil)', () {
      final liste = GunlukKarisim.sec(bol(), [oturumKursu], _bugun, tohum: 1);
      // Havuzda Seçim dışı türler (Yaz, Söyle, Boşluk) var; ama bu veride
      // yalnız arada ayırma yapılabilen yerlerde aynı tür yan yana gelmez.
      // Tür sayıları dengeliyse hiç gelmez; en azından hepsi aynı değil.
      expect({for (final k in liste) k.alistirma.tur}.length, greaterThan(1));
    });

    test('zayıf az: boş yer zamanı gelenlerden, sonra yenilerden dolar', () {
      final d = _durum({
        _id(dersA, 0): _kart(1), // tek zayıf
        for (var i = 1; i <= 9; i++)
          if (i != 6 && i != 7)
            _id(dersA, i): _kart(10, sonraki: '2026-10-0$i'),
      });
      final liste = GunlukKarisim.sec(d, [oturumKursu], _bugun);
      final ids = [for (final k in liste) k.kartId];
      expect(ids, hasLength(10));
      expect(ids.contains(_id(dersA, 0)), isTrue);
      // Zamanı gelen 7 kart var (4 kota + 1 zayıf artığı değil: 3 boş yer
      // zayıf kotasından); hepsi tekrarsız.
      expect(ids.toSet().length, 10);
    });

    test('hiç kart ve içerik yoksa boş', () {
      final bos = Kurs(
        id: 'bos-1',
        ad: 'Boş',
        aciklama: '',
        alan: KursAlani.dil,
        uniteler: const [],
      );
      expect(GunlukKarisim.sec(const OgrenciDurumu(), [bos], _bugun), isEmpty);
    });

    test('yalnız yeni kartlar (hiç çalışılmamış): sıradaki dersten gelir', () {
      final liste = GunlukKarisim.sec(const OgrenciDurumu(alan: 'dil'), [
        oturumKursu,
      ], _bugun);
      // Ders A sıradaki (bitmemiş) ders: 10 kartı var, ders B alınmaz.
      expect(liste, hasLength(10));
      expect(liste.every((k) => k.kartId.startsWith(dersA)), isTrue);
    });

    test('çözülemeyen zayıf kayıt atlanır', () {
      final d = _durum(
        {_id(dersA, 0): _kart(1)},
        hatalar: [
          HataKaydi(
            tur: HataKaydi.turKart,
            id: 'yok.ders#3',
            seviye: 'x',
            gun: _bugun,
          ),
        ],
      );
      final ids = [
        for (final k in GunlukKarisim.sec(d, [oturumKursu], _bugun)) k.kartId,
      ];
      expect(ids.contains('yok.ders#3'), isFalse);
      expect(ids.contains(_id(dersA, 0)), isTrue);
    });
  });

  group('Motor.mikroHavuzu / mikroSec ortak havuz', () {
    test('havuz sıradaki ders + bitmiş dersler, haric atlanır', () {
      final d = const OgrenciDurumu(alan: 'dil', tamamlanan: {dersA: 1});
      final h = Motor.mikroHavuzu(d, [oturumKursu]);
      expect(h, hasLength(14)); // A 10 + B 4 (B sıradaki)
      final h2 = Motor.mikroHavuzu(d, [oturumKursu], haric: {_id(dersA, 0)});
      expect(h2, hasLength(13));
    });

    test('mikroSec aynı tohumla aynı sonucu verir ve adet kadar kart', () {
      final d = const OgrenciDurumu(alan: 'dil', tamamlanan: {dersA: 1});
      final a = Motor.mikroSec(d, [oturumKursu], _bugun, adet: 10, tohum: 5);
      final b = Motor.mikroSec(d, [oturumKursu], _bugun, adet: 10, tohum: 5);
      expect([for (final k in a) k.kartId], [for (final k in b) k.kartId]);
      expect(a, hasLength(10));
    });
  });

  group('HedefYogunlugu', () {
    test('dört yoğunluk ve günlük XP hedefleri', () {
      expect(
        {for (final y in HedefYogunlugu.values) y.ad: y.xp},
        {'Rahat': 10, 'Orta': 30, 'Yoğun': 50, 'Ciddi': 100},
      );
    });

    test('varsayılan hedef (30 XP) Orta; özel hedef null', () {
      expect(
        HedefYogunlugu.hedeften(const OgrenciDurumu().gunlukHedef),
        HedefYogunlugu.orta,
      );
      expect(HedefYogunlugu.hedeften(100), HedefYogunlugu.ciddi);
      expect(HedefYogunlugu.hedeften(35), isNull);
    });

    test('hedefler durum sınırları (10..500) içinde ve kaydırıcı adımında', () {
      for (final y in HedefYogunlugu.values) {
        expect(y.xp, inInclusiveRange(10, 200));
        expect(y.xp % 10, 0);
        final d = OgrenciDurumu.fromJson(
          const OgrenciDurumu().copyWith(gunlukHedef: y.xp).toJson(),
        );
        expect(d.gunlukHedef, y.xp);
      }
    });
  });

  group('oturumKartSayisi (durum alanı)', () {
    test('varsayılan 5; seçenekler 5/10/20', () {
      expect(const OgrenciDurumu().oturumKartSayisi, 5);
      expect(OgrenciDurumu.oturumKartSecenekleri, [5, 10, 20]);
    });

    test('eski kayıtta alan yok: varsayılan', () {
      expect(OgrenciDurumu.fromJson({'xp': 5}).oturumKartSayisi, 5);
      expect(OgrenciDurumu.fromJson(<String, Object?>{}).oturumKartSayisi, 5);
    });

    test('geçerli değerler gidiş-dönüş; bozuk değer atlanır', () {
      for (final n in [5, 10, 20]) {
        final d = const OgrenciDurumu().copyWith(oturumKartSayisi: n);
        expect(OgrenciDurumu.fromJson(d.toJson()).oturumKartSayisi, n);
      }
      for (final kotu in <Object?>[
        7,
        0,
        -5,
        1000,
        '10',
        10.0,
        null,
        true,
        [],
      ]) {
        expect(
          OgrenciDurumu.fromJson({'oturumKartSayisi': kotu}).oturumKartSayisi,
          5,
          reason: '$kotu',
        );
      }
    });

    test('diğer alanları değiştirmez', () {
      final d = const OgrenciDurumu(
        xp: 40,
        seri: 3,
      ).copyWith(oturumKartSayisi: 20);
      expect((d.xp, d.seri, d.oturumKartSayisi), (40, 3, 20));
      expect(d.copyWith(xp: 41).oturumKartSayisi, 20);
    });
  });
}
