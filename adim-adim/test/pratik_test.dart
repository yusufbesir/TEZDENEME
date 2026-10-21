// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Filtreli tekrar, hatırlatma takvimi ve Pratik merkezi mantığı (özellik 79 ve
/// 44): geçici desteler, 14 günlük takvim, eşleştirme çiftleri ve en iyi süre,
/// artan zorluk turu, kelime kartları ve eski JSON ile geriye uyumluluk.
library;

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/ders_meta.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/motor/pratik.dart';
import 'package:flutter_test/flutter_test.dart';

const pratikKursId = 'pratik-1';
const pratikDers1 = 'pratik-1.u1.d1';
const pratikDers2 = 'pratik-1.u1.d2';

/// Ders 1: 8 çiftli eşleştirme (biri fiil), 2 seçim, boşluk, dinle, uzun yaz.
/// Ders 2: tek eşleştirme (tamamlanmamış ders).
final Kurs pratikKurs = Kurs(
  id: pratikKursId,
  ad: 'Pratik Kurs',
  aciklama: 'Pratik testleri.',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'pratik-1.u1',
      ad: 'Ünite',
      dersler: [
        Ders(
          id: pratikDers1,
          ad: 'Ders Bir',
          alistirmalar: const [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'to go', sag: 'gitmek'),
                (sol: 'cat', sag: 'kedi'),
                (sol: 'dog', sag: 'köpek'),
                (sol: 'bird', sag: 'kuş'),
                (sol: 'apple', sag: 'elma'),
                (sol: 'house', sag: 'ev'),
                (sol: 'book', sag: 'kitap'),
                (sol: 'water', sag: 'su'),
              ],
            ),
            Secim(soru: '2 + 2?', secenekler: ['3', '4'], dogru: 1),
            Secim(soru: '1 + 1?', secenekler: ['2', '5'], dogru: 0),
            Bosluk(
              soru: 'I ___ a student.',
              secenekler: ['am', 'is'],
              dogru: 0,
            ),
            Dinle(
              soru: 'Ne duydun?',
              okunacak: 'Good morning',
              secenekler: ['Good morning', 'Good evening'],
              dogru: 0,
            ),
            Yaz(
              soru: 'Cümleyi yaz.',
              cevaplar: ['I would like a coffee please'],
            ),
            Soyle(soru: 'Söyle.', metin: 'Hello', ceviri: 'Merhaba'),
          ],
        ),
        Ders(
          id: pratikDers2,
          ad: 'Ders İki',
          alistirmalar: const [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [(sol: 'to eat', sag: 'yemek')],
            ),
          ],
        ),
      ],
    ),
  ],
);

const bugun = '2026-10-15';
const _fiilKart = '$pratikDers1#0';

OgrenciDurumu _durum({
  Map<String, Kart> kartlar = const {},
  Map<String, int> tamamlanan = const {pratikDers1: 1},
}) => OgrenciDurumu(alan: 'dil', kartlar: kartlar, tamamlanan: tamamlanan);

void main() {
  final kurslar = [pratikKurs];

  group('hatırlatma takvimi', () {
    test('14 gün, gecikmişler bugüne sayılır, 14 günden sonrası dışarıda', () {
      final d = _durum(
        kartlar: {
          '$pratikDers1#1': const Kart(kutu: 1, sonraki: '2026-10-10'),
          '$pratikDers1#2': const Kart(kutu: 1, sonraki: bugun),
          '$pratikDers1#3': const Kart(kutu: 1, sonraki: '2026-10-18'),
          '$pratikDers1#4': const Kart(kutu: 1, sonraki: '2026-10-18'),
          '$pratikDers1#5': const Kart(kutu: 1, sonraki: '2026-10-28'),
          '$pratikDers1#6': const Kart(kutu: 1, sonraki: '2026-10-29'),
        },
      );
      final t = Pratik.takvim(d, bugun);
      expect(t, hasLength(14));
      expect(t.first.gun, bugun);
      expect(t.last.gun, '2026-10-28');
      expect(t[0].adet, 2);
      expect(t[0].gecikmis, 1);
      expect(t[3].gun, '2026-10-18');
      expect(t[3].adet, 2);
      expect(t[13].adet, 1);
      expect(t.fold<int>(0, (s, g) => s + g.adet), 5); // 29 Eki dışarıda
    });

    test('ay sonu geçişi ve kurs süzgeci', () {
      final d = _durum(
        kartlar: {
          '$pratikDers1#1': const Kart(kutu: 1, sonraki: '2026-11-02'),
          'baska-1.u1.d1#0': const Kart(kutu: 1, sonraki: '2026-11-02'),
        },
      );
      final t = Pratik.takvim(d, '2026-10-30', kurslar: kurslar);
      expect(t[3].gun, '2026-11-02');
      expect(t[3].adet, 1); // çözülemeyen kart sayılmaz
      expect(Pratik.takvim(d, '2026-10-30')[3].adet, 2);
    });

    test('kart yoksa tüm günler sıfır', () {
      expect(Pratik.takvim(_durum(), bugun).every((g) => g.adet == 0), isTrue);
    });
  });

  group('geçici desteler', () {
    test('son 7 gün yanlışlar: yalnız 7 gün içindeki çözülebilir kartlar', () {
      var d = _durum();
      d = Motor.kartIsle(d, '$pratikDers1#1', false, '2026-10-01'); // eski
      d = Motor.kartIsle(d, '$pratikDers1#2', false, '2026-10-12');
      d = Motor.kartIsle(d, '$pratikDers1#3', false, bugun);
      d = Motor.kartIsle(d, 'yok-1.u1.d1#0', false, bugun); // çözülemez
      final deste = Pratik.desteSec(
        d,
        kurslar,
        bugun,
        TekrarFiltresi.sonYediGunYanlis,
      );
      expect(
        [for (final k in deste) k.kartId],
        ['$pratikDers1#3', '$pratikDers1#2'],
      );
    });

    test(
      'yalnız fiiller: tamamlanmış dersin fiil öğeleri, ders 2 dışarıda',
      () {
        final deste = Pratik.desteSec(
          _durum(),
          kurslar,
          bugun,
          TekrarFiltresi.yalnizFiiller,
        );
        expect([for (final k in deste) k.kartId], [_fiilKart]);
        // Tamamlanmamış derste kart kümesine girmiş fiil de gelir.
        final d2 = _durum(
          tamamlanan: const {},
          kartlar: {'$pratikDers2#0': const Kart(kutu: 1, sonraki: bugun)},
        );
        final deste2 = Pratik.desteSec(
          d2,
          kurslar,
          bugun,
          TekrarFiltresi.yalnizFiiller,
        );
        expect([for (final k in deste2) k.kartId], ['$pratikDers2#0']);
      },
    );

    test('zayıf kartlar: yarı ömrü kısa olanlar', () {
      final d = _durum(
        kartlar: {
          '$pratikDers1#1': const Kart(
            kutu: 1,
            sonraki: bugun,
            yariOmurGun: 0.5,
          ),
          '$pratikDers1#2': const Kart(
            kutu: 5,
            sonraki: bugun,
            yariOmurGun: 30,
          ),
        },
      );
      final deste = Pratik.desteSec(
        d,
        kurslar,
        bugun,
        TekrarFiltresi.zayifKartlar,
      );
      expect([for (final k in deste) k.kartId], ['$pratikDers1#1']);
    });

    test(
      'bir kursa ait: o kursun kartları, vadesi yakın önce; üst sınır 20',
      () {
        final kartlar = {
          '$pratikDers1#2': const Kart(kutu: 1, sonraki: '2026-10-20'),
          '$pratikDers1#1': const Kart(kutu: 1, sonraki: '2026-10-16'),
          'baska-1.u1.d1#0': const Kart(kutu: 1, sonraki: bugun),
        };
        final deste = Pratik.desteSec(
          _durum(kartlar: kartlar),
          kurslar,
          bugun,
          TekrarFiltresi.kurs,
          kursId: pratikKursId,
        );
        expect(
          [for (final k in deste) k.kartId],
          ['$pratikDers1#1', '$pratikDers1#2'],
        );
        expect(
          Pratik.desteSec(
            _durum(kartlar: kartlar),
            kurslar,
            bugun,
            TekrarFiltresi.kurs,
          ),
          isEmpty,
        );
        expect(
          Pratik.desteSec(
            _durum(kartlar: kartlar),
            kurslar,
            bugun,
            TekrarFiltresi.kurs,
            kursId: 'olmayan',
          ),
          isEmpty,
        );
      },
    );

    test('deste seçimi durumu değiştirmez (SRS ve hata defteri sabit)', () {
      final d = Motor.kartIsle(_durum(), '$pratikDers1#1', false, bugun);
      final onceki = d.toJson().toString();
      for (final f in TekrarFiltresi.values) {
        Pratik.desteSec(d, kurslar, bugun, f, kursId: pratikKursId);
      }
      Pratik.takvim(d, bugun);
      expect(d.toJson().toString(), onceki);
    });
  });

  group('pratik merkezi', () {
    test('kelime havuzu: anlamlı, kısa, tamamlanmış dersten', () {
      final h = Pratik.kelimeHavuzu(_durum(), kurslar);
      expect(h, hasLength(9)); // 8 çift + Soyle (Hello)
      expect(h.any((c) => c.metin == 'cat' && c.anlam == 'kedi'), isTrue);
      // Yaz sorusu anlam olmaz (soru/uzun metin).
      expect(h.any((c) => c.anlam.contains('?')), isFalse);
      // Tamamlanmamış ders 2 dışarıda.
      expect(h.any((c) => c.metin == 'to eat'), isFalse);
    });

    test('eşleştirme: 4..8 çift, aynı tohum aynı sonuç, az havuzda boş', () {
      final d = _durum();
      final a = Pratik.eslestirmeCiftleri(d, kurslar, tohum: 3);
      expect(a, hasLength(8));
      expect({for (final c in a) c.metin}, hasLength(8));
      expect(
        [
          for (final c in Pratik.eslestirmeCiftleri(d, kurslar, tohum: 3))
            c.metin,
        ],
        [for (final c in a) c.metin],
      );
      expect(
        Pratik.eslestirmeCiftleri(_durum(tamamlanan: {}), kurslar),
        isEmpty,
      );
    });

    test('eşleştirme: zayıf kartlar önce gelir', () {
      final d = _durum(
        kartlar: {
          // Havuzu 8'den büyük yapmak için ders 2 de tamamlanmış sayılır.
          '$pratikDers2#0': const Kart(
            kutu: 1,
            sonraki: bugun,
            yariOmurGun: 0.5,
          ),
        },
      );
      final c = Pratik.eslestirmeCiftleri(d, kurslar, tohum: 9);
      expect(c, hasLength(8));
      expect(c.first.metin, 'to eat');
    });

    test('en iyi süre yalnız iyileşirse yazılır; JSON gidiş dönüş', () {
      var d = _durum();
      expect(d.eslestirmeEnIyiMs, isNull);
      d = Pratik.eslestirmeKaydet(d, 30000);
      expect(d.eslestirmeEnIyiMs, 30000);
      expect(Pratik.eslestirmeKaydet(d, 40000).eslestirmeEnIyiMs, 30000);
      expect(Pratik.eslestirmeKaydet(d, 20000).eslestirmeEnIyiMs, 20000);
      expect(Pratik.eslestirmeKaydet(d, 0), same(d));
      final geri = OgrenciDurumu.fromJson(d.toJson());
      expect(geri.eslestirmeEnIyiMs, 30000);
    });

    test('eski JSON: en iyi süre yok -> null; bozuk değer -> null', () {
      expect(OgrenciDurumu.fromJson({'xp': 5}).eslestirmeEnIyiMs, isNull);
      expect(
        OgrenciDurumu.fromJson({'eslestirmeEnIyiMs': -4}).eslestirmeEnIyiMs,
        isNull,
      );
      expect(
        OgrenciDurumu.fromJson({'eslestirmeEnIyiMs': 'x'}).eslestirmeEnIyiMs,
        isNull,
      );
    });

    test('süre metni', () {
      expect(Pratik.sureMetni(12300), '12,3 sn');
      expect(Pratik.sureMetni(65000), '1 dk 5 sn');
    });

    test('artan zorluk turu: kolaydan zora, Soyle yok, en çok 6', () {
      for (var tohum = 0; tohum < 5; tohum++) {
        final tur = Pratik.artanZorlukTuru(_durum(), kurslar, tohum: tohum);
        expect(tur.length, inInclusiveRange(1, Pratik.turAdet));
        expect(tur.any((t) => t.alistirma is Soyle), isFalse);
        final z = [
          for (final t in tur) DersMeta.adim(t.alistirma).zorluk.index,
        ];
        expect([...z]..sort(), z);
        expect({for (final t in tur) t.kartId}, hasLength(tur.length));
      }
      final tur = Pratik.artanZorlukTuru(_durum(), kurslar);
      expect(DersMeta.adim(tur.first.alistirma).zorluk, Zorluk.kolay);
      expect(DersMeta.adim(tur.last.alistirma).zorluk, Zorluk.zor);
    });

    test('kart destesi: en çok 20, havuz boşsa boş', () {
      expect(Pratik.kartDestesi(_durum(), kurslar), hasLength(9));
      expect(Pratik.kartDestesi(_durum(tamamlanan: {}), kurslar), isEmpty);
    });
  });
}
