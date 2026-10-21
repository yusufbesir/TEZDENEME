// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Seviye belirleme sınavı motor testleri: soru seçimi, %80 eşiği, ilk
/// başarısız üniteden sonrasının atlanmaması, XP/seri/kart değişmemesi,
/// yalnız tamamlanmamış derslerin atlanması, kilit mantığı ve eski kayıtlar.
library;

import 'package:adim_adim/bilesenler/devam_karti.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter_test/flutter_test.dart';

Ders _ders(String id, int adet, {bool soyle = false}) => Ders(
  id: id,
  ad: 'Ders $id',
  alistirmalar: [
    for (var i = 0; i < adet; i++)
      Secim(soru: '$id/$i', secenekler: const ['a', 'b'], dogru: 1),
    if (soyle) const Soyle(soru: 'Söyle', metin: 'hi', ceviri: 'selam'),
  ],
);

Kurs _kurs(int uniteSayisi, {int dersAdet = 5}) => Kurs(
  id: 'k-1',
  ad: 'Kurs',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    for (var u = 1; u <= uniteSayisi; u++)
      Unite(
        id: 'k-1.u$u',
        ad: 'Ünite $u',
        dersler: [_ders('k-1.u$u.d1', dersAdet, soyle: true)],
      ),
  ],
);

void main() {
  test(
    'soru seçimi: ünite sırasıyla, ünite başına 5, konuşma yok, tohumlu',
    () {
      final k = _kurs(3);
      final s = Motor.yerlestirmeSec(const OgrenciDurumu(), k, tohum: 7);
      expect(s, hasLength(15));
      expect(
        [for (final x in s) x.unite],
        [...List.filled(5, 0), ...List.filled(5, 1), ...List.filled(5, 2)],
      );
      expect(s.any((x) => x.alistirma is Soyle), isFalse);
      expect(
        [
          for (final x in Motor.yerlestirmeSec(
            const OgrenciDurumu(),
            k,
            tohum: 7,
          ))
            x.kartId,
        ],
        [for (final x in s) x.kartId],
      );
    },
  );

  test('en çok 20 soru: çok ünitede ilk 6 ünite, 3 er soru', () {
    final s = Motor.yerlestirmeSec(const OgrenciDurumu(), _kurs(10));
    expect(s.length, lessThanOrEqualTo(Motor.yerlestirmeEnCok));
    expect(s.map((x) => x.unite).toSet(), {0, 1, 2, 3, 4, 5});
    expect(s, hasLength(18));
    final iki = Motor.yerlestirmeSec(const OgrenciDurumu(), _kurs(2));
    expect(iki, hasLength(10)); // ünite başı en çok 5
  });

  test('tamamlanmış/atlanmış üniteler sorulmaz; hepsi bitmişse boş', () {
    final k = _kurs(3);
    final d = const OgrenciDurumu(
      tamamlanan: {'k-1.u1.d1': 1},
      atlananDersler: {'k-1.u2.d1'},
    );
    final s = Motor.yerlestirmeSec(d, k);
    expect({for (final x in s) x.unite}, {2});
    final hepsi = d.copyWith(atlananDersler: {'k-1.u2.d1', 'k-1.u3.d1'});
    expect(Motor.yerlestirmeSec(hepsi, k), isEmpty);
  });

  test('değerlendirme: %80 eşiği, ilk başarısız üniteden sonrası geçilmez', () {
    final k = _kurs(3);
    final s = Motor.yerlestirmeSec(const OgrenciDurumu(), k);
    // Ünite 0: 4/5 (geçer), ünite 1: 3/5 (kalır), ünite 2: 5/5 (sayılmaz).
    final dogrular = [
      ...[true, true, true, true, false],
      ...[true, true, true, false, false],
      ...List.filled(5, true),
    ];
    final r = Motor.yerlestirmeDegerlendir(s, dogrular);
    expect(r.gecilen, [0]);
    expect(r.kalan, 1);
    final hepsi = Motor.yerlestirmeDegerlendir(s, List.filled(15, true));
    expect(hepsi.gecilen, [0, 1, 2]);
    expect(hepsi.kalan, isNull);
    expect(
      Motor.yerlestirmeDegerlendir(s, List.filled(15, false)).gecilen,
      isEmpty,
    );
  });

  test('uygula: dersler atlanır, XP/seri/kart/tamamlanan/günlük değişmez, '
      'yalnız tamamlanmamışlar', () {
    final k = Kurs(
      id: 'k-1',
      ad: 'K',
      aciklama: '',
      alan: KursAlani.dil,
      uniteler: [
        Unite(
          id: 'k-1.u1',
          ad: 'U1',
          dersler: [_ders('k-1.u1.d1', 3), _ders('k-1.u1.d2', 3)],
        ),
        Unite(id: 'k-1.u2', ad: 'U2', dersler: [_ders('k-1.u2.d1', 3)]),
      ],
    );
    const d = OgrenciDurumu(xp: 40, seri: 2, tamamlanan: {'k-1.u1.d1': 2});
    final y = Motor.yerlestirmeUygula(d, k, [0, 99, -1]);
    expect(y.atlananDersler, {'k-1.u1.d2'}); // d1 zaten tamam, u2 geçilmedi
    expect(y.xp, 40);
    expect(y.seri, 2);
    expect(y.tamamlanan, d.tamamlanan);
    expect(y.kartlar, isEmpty);
    expect(y.gunluk, isEmpty);
    expect(identical(Motor.yerlestirmeUygula(y, k, [0]), y), isTrue);
  });

  test('kilit: atlananlar açık sayılır; sıradaki ders ve devam kartı', () {
    final k = _kurs(3);
    const d = OgrenciDurumu(atlananDersler: {'k-1.u1.d1', 'k-1.u2.d1'});
    expect(Motor.dersBitmis(d, 'k-1.u1.d1'), isTrue);
    expect(Motor.dersBitmis(d, 'k-1.u3.d1'), isFalse);
    expect(Motor.uniteBitmis(d, k.uniteler[0]), isTrue);
    final h = DevamKarti.hedefSec(d, [k]);
    expect(h?.ders.id, 'k-1.u3.d1');
    expect(h?.siradaki, isTrue);
  });

  test(
    'JSON: gidiş-dönüş; eski kayıtta alan yok -> boş; bozuk girdi atlanır',
    () {
      const d = OgrenciDurumu(atlananDersler: {'b.u1.d2', 'a.u1.d1'});
      final j = d.toJson();
      expect(j['atlananDersler'], ['a.u1.d1', 'b.u1.d2']);
      expect(OgrenciDurumu.fromJson(j).atlananDersler, d.atlananDersler);
      expect(OgrenciDurumu.fromJson({'xp': 3}).atlananDersler, isEmpty);
      expect(
        OgrenciDurumu.fromJson({
          'atlananDersler': ['ok.u1.d1', 5, '', 'x#1', null],
        }).atlananDersler,
        {'ok.u1.d1'},
      );
      expect(
        OgrenciDurumu.fromJson({'atlananDersler': 'yanlış'}).atlananDersler,
        isEmpty,
      );
    },
  );
}
