// Sahibi Yusuf (yusufbesir). Yazan: [İP:Adım Adım Windows sürümü#cihaz] Claude. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Kelime gücü saf mantığı: kovalar (Yeni/Zayıf/Orta/Güçlü), güç puanı,
/// Türkçe alfabe sıralaması, arama ve kovaya göre süzme.
library;

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/kelime_gucu.dart';
import 'package:flutter_test/flutter_test.dart';

const kgDers1 = 'kg-1.u1.d1';

/// Tek Eşleştir sorusu: 6 kelime çifti (kelime havuzuna girer). Çiftler tek
/// alıştırmada olduğundan kart kimliği hep '$kgDers1#0'dır.
final Kurs kgKursu = Kurs(
  id: 'kg-1',
  ad: 'KG',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'kg-1.u1',
      ad: 'U',
      dersler: [
        Ders(
          id: kgDers1,
          ad: 'D',
          alistirmalar: const [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'cat', sag: 'kedi'),
                (sol: 'çay', sag: 'tea'),
                (sol: 'ışık', sag: 'light'),
                (sol: 'Zeki', sag: 'clever'),
                (sol: 'dal', sag: 'branch'),
                (sol: 'iyi', sag: 'good'),
              ],
            ),
          ],
        ),
      ],
    ),
  ],
);

Kart _kart(double yo, {bool? son = true}) => Kart(
  kutu: Kart.kutuHesapla(yo),
  sonraki: '2026-10-20',
  yariOmurGun: yo,
  sonCevap: son,
);

KelimeSatiri _satir(
  String metin,
  GucKovasi kova,
  int puan, {
  String anlam = 'a',
  String id = 'x',
}) => (
  kartId: id,
  metin: metin,
  anlam: anlam,
  kova: kova,
  puan: puan,
  sonraki: null,
);

List<String> _metinler(Iterable<KelimeSatiri> l) => [
  for (final s in l) s.metin,
];

void main() {
  group('KelimeGucu.kova', () {
    test('kart yok: Yeni', () {
      expect(KelimeGucu.kova(null), GucKovasi.yeni);
    });

    test('hiç cevaplanmamış ve zayıf eşiğin altı: Yeni', () {
      expect(KelimeGucu.kova(_kart(0.5, son: null)), GucKovasi.yeni);
      expect(KelimeGucu.kova(_kart(1.99, son: null)), GucKovasi.yeni);
    });

    test('cevaplanmış ve eşik altı: Zayıf', () {
      expect(KelimeGucu.kova(_kart(0.5, son: false)), GucKovasi.zayif);
      expect(KelimeGucu.kova(_kart(1.99, son: true)), GucKovasi.zayif);
    });

    test('eşikler: 2 ve 7 gün orta; 7 üstü güçlü (sonCevap fark etmez)', () {
      expect(KelimeGucu.kova(_kart(2.0, son: null)), GucKovasi.orta);
      expect(KelimeGucu.kova(_kart(7.0)), GucKovasi.orta);
      expect(KelimeGucu.kova(_kart(7.01)), GucKovasi.guclu);
      expect(KelimeGucu.kova(_kart(180, son: null)), GucKovasi.guclu);
    });

    test('kova adları ve sırası', () {
      expect(
        [for (final k in GucKovasi.values) k.ad],
        ['Yeni', 'Zayıf', 'Orta', 'Güçlü'],
      );
    });
  });

  group('KelimeGucu.puan', () {
    test('uçlar: kart yok 0, en kısa yarı ömür 0, en uzun 100', () {
      expect(KelimeGucu.puan(null), 0);
      expect(KelimeGucu.puan(_kart(Kart.enAzYariOmur)), 0);
      expect(KelimeGucu.puan(_kart(Kart.enCokYariOmur)), 100);
    });

    test('yarı ömürle tekdüze artar ve 0..100 içinde kalır', () {
      var onceki = -1;
      for (final yo in [0.5, 1, 2, 4, 8, 16, 32, 64, 128, 180]) {
        final p = KelimeGucu.puan(_kart(yo.toDouble()));
        expect(p, inInclusiveRange(0, 100));
        expect(p, greaterThanOrEqualTo(onceki));
        onceki = p;
      }
    });

    test('sınır dışı yarı ömür kıstırılır', () {
      expect(KelimeGucu.puan(_kart(1000)), 100);
      expect(KelimeGucu.puan(_kart(0.01)), 0);
    });
  });

  group('KelimeGucu.anahtar / sirala (Türkçe alfabe)', () {
    test('Türkçe sıra: c < ç < d, ı < i, o < ö, s < ş, u < ü', () {
      final sirali = KelimeGucu.sirala([
        _satir('ütü', GucKovasi.yeni, 0),
        _satir('şeker', GucKovasi.yeni, 0),
        _satir('dal', GucKovasi.yeni, 0),
        _satir('çay', GucKovasi.yeni, 0),
        _satir('cam', GucKovasi.yeni, 0),
        _satir('ışık', GucKovasi.yeni, 0),
        _satir('iyi', GucKovasi.yeni, 0),
        _satir('ölçü', GucKovasi.yeni, 0),
        _satir('okul', GucKovasi.yeni, 0),
        _satir('sarı', GucKovasi.yeni, 0),
        _satir('uçak', GucKovasi.yeni, 0),
      ], KelimeSirasi.alfabe);
      expect(_metinler(sirali), [
        'cam',
        'çay',
        'dal',
        'ışık',
        'iyi',
        'okul',
        'ölçü',
        'sarı',
        'şeker',
        'uçak',
        'ütü',
      ]);
    });

    test('büyük harf (I, İ) küçük harfle aynı yerde sıralanır', () {
      expect(KelimeGucu.anahtar('I'), KelimeGucu.anahtar('ı'));
      expect(KelimeGucu.anahtar('İ'), KelimeGucu.anahtar('i'));
      expect(KelimeGucu.anahtar('Zeki'), KelimeGucu.anahtar('zeki'));
      expect(
        KelimeGucu.anahtar('Işık').compareTo(KelimeGucu.anahtar('iyi')) < 0,
        isTrue,
      );
    });

    test('güce göre: kova sırası, sonra puan, sonra alfabe', () {
      final sirali = KelimeGucu.sirala([
        _satir('d', GucKovasi.guclu, 90, id: '1'),
        _satir('b', GucKovasi.zayif, 20, id: '2'),
        _satir('a', GucKovasi.zayif, 20, id: '3'),
        _satir('c', GucKovasi.zayif, 10, id: '4'),
        _satir('e', GucKovasi.yeni, 0, id: '5'),
        _satir('f', GucKovasi.orta, 50, id: '6'),
      ], KelimeSirasi.guc);
      expect(_metinler(sirali), ['e', 'c', 'a', 'b', 'f', 'd']);
    });

    test('girdi listesini değiştirmez', () {
      final girdi = [
        _satir('b', GucKovasi.yeni, 0),
        _satir('a', GucKovasi.yeni, 0),
      ];
      KelimeGucu.sirala(girdi, KelimeSirasi.alfabe);
      expect(girdi.first.metin, 'b');
    });
  });

  group('KelimeGucu.suz / sayilar', () {
    final satirlar = [
      _satir('cat', GucKovasi.yeni, 0, anlam: 'kedi', id: '1'),
      _satir('çay', GucKovasi.zayif, 10, anlam: 'tea', id: '2'),
      _satir('Işık', GucKovasi.orta, 40, anlam: 'light', id: '3'),
      _satir('iyi', GucKovasi.guclu, 80, anlam: 'good', id: '4'),
    ];

    test('sayılar dört kovayı da içerir', () {
      expect(KelimeGucu.sayilar(satirlar), {
        GucKovasi.yeni: 1,
        GucKovasi.zayif: 1,
        GucKovasi.orta: 1,
        GucKovasi.guclu: 1,
      });
      expect(KelimeGucu.sayilar(const []).values, everyElement(0));
    });

    test('kovaya göre süzme', () {
      expect(_metinler(KelimeGucu.suz(satirlar, kova: GucKovasi.zayif)), [
        'çay',
      ]);
      expect(KelimeGucu.suz(satirlar), hasLength(4));
    });

    test('arama: kelimede ya da anlamda, büyük/küçük harf duyarsız', () {
      expect(_metinler(KelimeGucu.suz(satirlar, arama: 'ışık')), ['Işık']);
      expect(_metinler(KelimeGucu.suz(satirlar, arama: 'IŞIK')), ['Işık']);
      expect(_metinler(KelimeGucu.suz(satirlar, arama: 'TEA')), ['çay']);
      expect(_metinler(KelimeGucu.suz(satirlar, arama: ' ke ')), ['cat']);
      expect(KelimeGucu.suz(satirlar, arama: 'zzz'), isEmpty);
    });

    test('kova ve arama birlikte', () {
      expect(
        KelimeGucu.suz(satirlar, kova: GucKovasi.guclu, arama: 'cat'),
        isEmpty,
      );
      expect(
        KelimeGucu.suz(satirlar, kova: GucKovasi.yeni, arama: 'cat'),
        hasLength(1),
      );
    });
  });

  group('KelimeGucu.liste (kelime havuzu + kartlar)', () {
    test('tamamlanan dersin kelimeleri; kartı olmayan Yeni; alfabe sırası', () {
      final d = const OgrenciDurumu(alan: 'dil', tamamlanan: {kgDers1: 1});
      final l = KelimeGucu.liste(d, [kgKursu]);
      expect(_metinler(l), ['cat', 'çay', 'dal', 'ışık', 'iyi', 'Zeki']);
      expect(l.every((s) => s.kova == GucKovasi.yeni && s.puan == 0), isTrue);
      expect(l.every((s) => s.sonraki == null), isTrue);
    });

    test('kart varsa kova ve puan karttan; çiftler aynı kartı paylaşır', () {
      final d = OgrenciDurumu(
        alan: 'dil',
        tamamlanan: const {kgDers1: 1},
        kartlar: {'$kgDers1#0': _kart(20)},
      );
      final l = KelimeGucu.liste(d, [kgKursu]);
      expect(l, hasLength(6));
      expect(l.every((s) => s.kova == GucKovasi.guclu), isTrue);
      expect(l.every((s) => s.puan == KelimeGucu.puan(_kart(20))), isTrue);
      expect(l.first.sonraki, '2026-10-20');
      expect(KelimeGucu.sayilar(l)[GucKovasi.guclu], 6);
    });

    test('ders bitmemiş ve kart yoksa liste boş', () {
      expect(
        KelimeGucu.liste(const OgrenciDurumu(alan: 'dil'), [kgKursu]),
        isEmpty,
      );
    });
  });
}
