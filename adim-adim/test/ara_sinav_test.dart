// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Motor testi: ünite ara sınavı (10 soru, %70) ve seviye sertifika sınavı
/// (20 soru, %80): soru seçimi, açılma koşulları, en iyi sonuç kaydı, kalınca
/// kartların tekrar destesine/hata defterine eklenmesi, XP/seri verilmemesi
/// ve eski kayıtla uyum (JSON).
library;

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter_test/flutter_test.dart';

Ders _ders(String id, int n) => Ders(
  id: id,
  ad: id,
  alistirmalar: [
    for (var i = 0; i < n; i++)
      Secim(soru: '$id $i', secenekler: const ['a', 'b'], dogru: 1),
  ],
);

final Kurs _kurs = Kurs(
  id: 'as',
  ad: 'Sınav Kursu',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'as.u1',
      ad: 'Ünite 1',
      dersler: [_ders('as.u1.d1', 8), _ders('as.u1.d2', 8)],
    ),
    Unite(id: 'as.u2', ad: 'Ünite 2', dersler: [_ders('as.u2.d1', 12)]),
  ],
);

OgrenciDurumu _bitmis(Iterable<String> dersler) =>
    OgrenciDurumu(tamamlanan: {for (final d in dersler) d: 1});

List<bool> _dogrular(int n, int dogru) => [
  for (var i = 0; i < n; i++) i < dogru,
];

void main() {
  test('ara sınav yalnız ünitenin tüm dersleri bitince açılır', () {
    expect(Motor.araSinavAcik(const OgrenciDurumu(), _kurs, 0), isFalse);
    expect(Motor.araSinavAcik(_bitmis(['as.u1.d1']), _kurs, 0), isFalse);
    final d = _bitmis(['as.u1.d1', 'as.u1.d2']);
    expect(Motor.araSinavAcik(d, _kurs, 0), isTrue);
    expect(Motor.araSinavAcik(d, _kurs, 1), isFalse);
    expect(Motor.araSinavAcik(d, _kurs, 5), isFalse);
    // Atlanan dersler de bitmiş sayılır.
    expect(
      Motor.araSinavAcik(
        const OgrenciDurumu(atlananDersler: {'as.u1.d1', 'as.u1.d2'}),
        _kurs,
        0,
      ),
      isTrue,
    );
  });

  test('araSinavSec: 10 soru, iki dersten dönerek, tohumla deterministik', () {
    final a = Motor.araSinavSec(_kurs, 0, tohum: 7);
    expect(a, hasLength(Motor.araSinavAdet));
    expect(a.every((s) => s.unite == 0), isTrue);
    expect(a.map((s) => s.kartId).toSet(), hasLength(10));
    expect(a.where((s) => s.kartId.startsWith('as.u1.d1#')), hasLength(5));
    expect(a.where((s) => s.kartId.startsWith('as.u1.d2#')), hasLength(5));
    final b = Motor.araSinavSec(_kurs, 0, tohum: 7);
    expect([for (final s in a) s.kartId], [for (final s in b) s.kartId]);
    expect(Motor.araSinavSec(_kurs, 9), isEmpty);
  });

  test('sertifika: tüm ünite ara sınavları geçilince açılır, 20 soru', () {
    var d = _bitmis(_kurs.tumDersler.map((x) => x.id));
    expect(Motor.sertifikaSinaviAcik(d, _kurs), isFalse);
    d = d.copyWith(
      araSinavlar: {
        'as.u1': SinavSonucu(dogru: 7, toplam: 10, gun: '2026-10-15'),
      },
    );
    expect(Motor.araSinavGecildi(d, _kurs.uniteler[0]), isTrue);
    expect(Motor.sertifikaSinaviAcik(d, _kurs), isFalse);
    d = d.copyWith(
      araSinavlar: {
        ...d.araSinavlar,
        'as.u2': SinavSonucu(dogru: 6, toplam: 10, gun: '2026-10-15'),
      },
    );
    expect(Motor.sertifikaSinaviAcik(d, _kurs), isFalse, reason: '%60 geçmez');
    d = d.copyWith(
      araSinavlar: {
        ...d.araSinavlar,
        'as.u2': SinavSonucu(dogru: 10, toplam: 10, gun: '2026-10-16'),
      },
    );
    expect(Motor.sertifikaSinaviAcik(d, _kurs), isTrue);
    final s = Motor.sertifikaSec(_kurs, tohum: 3);
    expect(s, hasLength(Motor.sertifikaAdet));
    expect(s.where((x) => x.unite == 0), hasLength(10));
    expect(s.where((x) => x.unite == 1), hasLength(10));
  });

  test('eşikler: %70 ara sınav, %80 sertifika (sınırlar dahil)', () {
    const g = '2026-10-15';
    expect(
      Motor.sinavGecti(SinavSonucu(dogru: 7, toplam: 10, gun: g), 0.7),
      isTrue,
    );
    expect(
      Motor.sinavGecti(SinavSonucu(dogru: 6, toplam: 10, gun: g), 0.7),
      isFalse,
    );
    expect(
      Motor.sinavGecti(SinavSonucu(dogru: 16, toplam: 20, gun: g), 0.8),
      isTrue,
    );
    expect(
      Motor.sinavGecti(SinavSonucu(dogru: 15, toplam: 20, gun: g), 0.8),
      isFalse,
    );
    expect(Motor.sinavGecti(null, 0.7), isFalse);
  });

  test('sinavBitir geçince: kayıt yazılır, XP/seri/kart/günlük değişmez', () {
    final sorular = Motor.araSinavSec(_kurs, 0);
    final d = Motor.sinavBitir(
      const OgrenciDurumu(),
      anahtar: 'as.u1',
      sertifika: false,
      sorular: sorular,
      dogrular: _dogrular(10, 8),
      bugun: '2026-10-15',
    );
    expect(d.araSinavlar['as.u1']!.dogru, 8);
    expect(d.araSinavlar['as.u1']!.yuzde, 80);
    expect(d.araSinavlar['as.u1']!.gun, '2026-10-15');
    expect(d.xp, 0);
    expect(d.seri, 0);
    expect(d.kartlar, isEmpty);
    expect(d.hatalar, isEmpty);
    expect(d.gunluk, isEmpty);
    expect(d.tamamlanan, isEmpty);
    expect(d.sertifikalar, isEmpty);
  });

  test(
    'sinavBitir kalınca: yanlış kartlar desteye ve hata defterine girer',
    () {
      final sorular = Motor.araSinavSec(_kurs, 0);
      final d = Motor.sinavBitir(
        const OgrenciDurumu(),
        anahtar: 'as.u1',
        sertifika: false,
        sorular: sorular,
        dogrular: _dogrular(10, 6), // son 4 yanlış
        bugun: '2026-10-15',
      );
      final yanlis = sorular.skip(6).map((s) => s.kartId).toSet();
      expect(d.kartlar.keys.toSet(), yanlis);
      expect(d.kartlar.values.every((k) => k.sonCevap == false), isTrue);
      expect(
        d.hatalar
            .where((h) => h.tur == HataKaydi.turKart)
            .map((h) => h.id)
            .toSet(),
        yanlis,
      );
      expect(d.araSinavlar['as.u1']!.dogru, 6, reason: 'kalınca da kayıt var');
      expect(Motor.araSinavGecildi(d, _kurs.uniteler[0]), isFalse);
      expect(d.xp, 0);
      expect(d.seri, 0);
    },
  );

  test('en iyi sonuç korunur: kötü sonuç eskiyi ve tarihini ezmez', () {
    final sorular = Motor.araSinavSec(_kurs, 0);
    var d = Motor.sinavBitir(
      const OgrenciDurumu(),
      anahtar: 'as.u1',
      sertifika: false,
      sorular: sorular,
      dogrular: _dogrular(10, 9),
      bugun: '2026-10-10',
    );
    d = Motor.sinavBitir(
      d,
      anahtar: 'as.u1',
      sertifika: false,
      sorular: sorular,
      dogrular: _dogrular(10, 5),
      bugun: '2026-10-12',
    );
    expect(d.araSinavlar['as.u1']!.dogru, 9);
    expect(d.araSinavlar['as.u1']!.gun, '2026-10-10');
    d = Motor.sinavBitir(
      d,
      anahtar: 'as.u1',
      sertifika: false,
      sorular: sorular,
      dogrular: _dogrular(10, 10),
      bugun: '2026-10-14',
    );
    expect(d.araSinavlar['as.u1']!.dogru, 10);
    expect(d.araSinavlar['as.u1']!.gun, '2026-10-14');
  });

  test(
    'sertifika sınavı sertifikalar haritasına yazılır; geçince sertifika var',
    () {
      final sorular = Motor.sertifikaSec(_kurs);
      var d = Motor.sinavBitir(
        const OgrenciDurumu(),
        anahtar: 'as',
        sertifika: true,
        sorular: sorular,
        dogrular: _dogrular(20, 15),
        bugun: '2026-10-15',
      );
      expect(Motor.sertifikaVar(d, _kurs), isFalse);
      expect(d.araSinavlar, isEmpty);
      expect(d.kartlar, hasLength(5));
      d = Motor.sinavBitir(
        d,
        anahtar: 'as',
        sertifika: true,
        sorular: sorular,
        dogrular: _dogrular(20, 16),
        bugun: '2026-10-16',
      );
      expect(Motor.sertifikaVar(d, _kurs), isTrue);
      expect(d.sertifikalar['as']!.yuzde, 80);
      expect(d.xp, 0);
    },
  );

  test(
    'JSON gidiş-dönüş; eski kayıtta alanlar yok = boş; bozuk girdiler atılır',
    () {
      final d = Motor.sinavBitir(
        const OgrenciDurumu(),
        anahtar: 'as.u1',
        sertifika: false,
        sorular: Motor.araSinavSec(_kurs, 0),
        dogrular: _dogrular(10, 9),
        bugun: '2026-10-15',
      );
      final geri = OgrenciDurumu.fromJson(d.toJson());
      expect(geri.araSinavlar['as.u1']!.dogru, 9);
      expect(geri.araSinavlar['as.u1']!.toplam, 10);
      expect(geri.araSinavlar['as.u1']!.gun, '2026-10-15');

      final eski = OgrenciDurumu.fromJson({'surum': 1, 'xp': 40});
      expect(eski.xp, 40);
      expect(eski.araSinavlar, isEmpty);
      expect(eski.sertifikalar, isEmpty);

      final bozuk = OgrenciDurumu.fromJson({
        'araSinavlar': {
          'iyi': {'dogru': 3, 'toplam': 4, 'gun': '2026-10-01'},
          'asiri': {'dogru': 9, 'toplam': 4, 'gun': '2026-10-01'},
          'gunYok': {'dogru': 1, 'toplam': 4, 'gun': 'dün'},
          'tipYanlis': 'x',
          'a#b': {'dogru': 1, 'toplam': 4, 'gun': '2026-10-01'},
        },
        'sertifikalar': [1, 2],
      });
      expect(bozuk.araSinavlar.keys, ['iyi']);
      expect(bozuk.sertifikalar, isEmpty);
      expect(OgrenciDurumu.fromJson('çöp').araSinavlar, isEmpty);
    },
  );
}
