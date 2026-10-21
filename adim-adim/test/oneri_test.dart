// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Gerekçeli kişisel öneri (ÖZELLİK 73): kural tabanlı öneriler, gerekçe
/// metni ve tahmini süre; sıra, sınır ve durumun değişmemesi.
library;

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/oneri.dart';
import 'package:flutter_test/flutter_test.dart';

import 'yeni_ozellik_icerik.dart';

const _bugun = '2026-10-21';

Kart _kart(String sonraki, double yo) =>
    Kart(kutu: Kart.kutuHesapla(yo), sonraki: sonraki, yariOmurGun: yo);

void main() {
  final kurslar = [hayvanKursu];

  test('yeni kullanıcı: yalnız sıradaki ders, gerekçeli ve süreli', () {
    final o = Oneriler.uret(const OgrenciDurumu(alan: 'dil'), kurslar, _bugun);
    expect(o, hasLength(1));
    expect(o.single.tur, OneriTuru.siradakiDers);
    expect(o.single.baslik, 'Sıradaki ders: Bir');
    expect(o.single.gerekce, startsWith('Bunu öneriyoruz çünkü '));
    expect(o.single.gerekce, contains('0/3 dersi'));
    expect(o.single.gerekce, contains('günlük hedefine 30 XP kaldı'));
    expect(o.single.dakika, greaterThanOrEqualTo(1));
    expect(o.single.rota, '/ders/$tDers1');
  });

  test('günlük hedef tutulduysa gerekçede hedef kalmaz', () {
    final o = Oneriler.uret(
      const OgrenciDurumu(alan: 'dil', gunlukXp: {_bugun: 40}),
      kurslar,
      _bugun,
    );
    expect(o.single.gerekce, isNot(contains('günlük hedefine')));
  });

  test('bitmiş dersler atlanır: sıradaki ilk bitmemiş ders', () {
    final o = Oneriler.uret(
      const OgrenciDurumu(
        alan: 'dil',
        tamamlanan: {tDers1: 1},
        atlananDersler: {tDers2},
      ),
      kurslar,
      _bugun,
    );
    final s = o.firstWhere((x) => x.tur == OneriTuru.siradakiDers);
    expect(s.baslik, 'Sıradaki ders: Üç');
    expect(s.gerekce, contains('2/3 dersi'));
  });

  test('her şey bitince öneri yok', () {
    final o = Oneriler.uret(
      const OgrenciDurumu(
        alan: 'dil',
        tamamlanan: {tDers1: 1, tDers2: 1, tDers3: 1},
      ),
      kurslar,
      _bugun,
    );
    expect(o, isEmpty);
  });

  test('bekleyen tekrar önce gelir; sayı, gecikme ve süre gerekçede', () {
    final d = OgrenciDurumu(
      alan: 'dil',
      kartlar: {
        '$tDers1#0': _kart('2026-10-19', 2), // gecikmiş
        '$tDers1#1': _kart(_bugun, 2), // bugün
        '$tDers2#0': _kart('2026-11-01', 2), // henüz değil
        'olmayan.u1.d1#0': _kart('2026-10-01', 2), // çözülemez, sayılmaz
      },
    );
    final o = Oneriler.uret(d, kurslar, _bugun);
    expect(o.first.tur, OneriTuru.tekrar);
    expect(o.first.gerekce, startsWith('Bunu öneriyoruz çünkü 2 kartın'));
    expect(o.first.gerekce, contains('1 tanesi gecikti'));
    expect(o.first.dakika, 1); // 2 kart x 15 sn -> 1 dk
    expect(o.first.rota, '/tekrar');
  });

  test('çözülemeyen kartlar tekrar sayısına ve süresine girmez', () {
    final kartlar = <String, Kart>{
      for (var i = 0; i < 60; i++) '$tDers1#$i': _kart(_bugun, 5),
    };
    // Çözülebilir kart yalnız gerçek alıştırmalardır; süreyi doğrudan doğrula.
    final d = OgrenciDurumu(alan: 'dil', kartlar: kartlar);
    final o = Oneriler.uret(d, kurslar, _bugun);
    final t = o.firstWhere((x) => x.tur == OneriTuru.tekrar);
    expect(t.dakika, 1); // dersin yalnız 2 alıştırması çözülür
    expect(t.gerekce, contains('2 kartın'));
  });

  test('hata defterindeki son 7 gün zayıf noktası önerilir', () {
    final d = OgrenciDurumu(
      alan: 'dil',
      hatalar: [
        HataKaydi(
          tur: HataKaydi.turKart,
          id: '$tDers1#0',
          seviye: tKursId,
          gun: _bugun,
        ),
        HataKaydi(
          tur: HataKaydi.turKart,
          id: '$tDers1#1',
          seviye: tKursId,
          gun: '2026-10-01',
        ),
      ],
    );
    final o = Oneriler.uret(d, kurslar, _bugun);
    final z = o.firstWhere((x) => x.tur == OneriTuru.zayifNokta);
    expect(z.gerekce, contains('1 adımda yanlış yaptın'));
    expect(z.rota, '/mikro?mod=zayif');
    expect(z.dakika, 2);
  });

  test('düşük hafıza puanlı ünite önerilir, güçlü ünite önerilmez', () {
    OgrenciDurumu durum(double yo) => OgrenciDurumu(
      alan: 'dil',
      tamamlanan: const {tDers1: 1, tDers2: 1},
      kartlar: {
        for (final id in ['$tDers1#0', '$tDers1#1', '$tDers2#0'])
          id: _kart('2026-12-01', yo),
      },
    );
    final zayif = Oneriler.uret(durum(1), kurslar, _bugun);
    final u = zayif.firstWhere((x) => x.tur == OneriTuru.zayifUnite);
    expect(u.baslik, 'Hayvanlar ünitesini pekiştir');
    expect(u.gerekce, contains('hafıza puanı'));
    expect(u.rota, '/calisma-modu?kurs=$tKursId&unite=0');
    final guclu = Oneriler.uret(durum(Kart.enCokYariOmur), kurslar, _bugun);
    expect(guclu.any((x) => x.tur == OneriTuru.zayifUnite), isFalse);
  });

  test('sıra ve sınır: tekrar, zayıf nokta, zayıf ünite, sıradaki ders', () {
    final d = OgrenciDurumu(
      alan: 'dil',
      tamamlanan: const {tDers1: 1, tDers2: 1},
      kartlar: {
        '$tDers1#0': _kart('2026-10-19', 1),
        '$tDers1#1': _kart('2026-12-01', 1),
        '$tDers2#0': _kart('2026-12-01', 1),
      },
      hatalar: [
        HataKaydi(
          tur: HataKaydi.turKart,
          id: '$tDers1#0',
          seviye: tKursId,
          gun: _bugun,
        ),
      ],
    );
    final o = Oneriler.uret(d, kurslar, _bugun);
    expect(o.map((x) => x.tur), [
      OneriTuru.tekrar,
      OneriTuru.zayifNokta,
      OneriTuru.zayifUnite,
      OneriTuru.siradakiDers,
    ]);
    expect(Oneriler.uret(d, kurslar, _bugun, enCok: 2), hasLength(2));
    for (final x in o) {
      expect(x.gerekce, startsWith('Bunu öneriyoruz çünkü'));
      expect(x.dakika, greaterThanOrEqualTo(1));
    }
  });

  test('öneri üretmek durumu değiştirmez', () {
    final d = OgrenciDurumu(
      alan: 'dil',
      kartlar: {'$tDers1#0': _kart(_bugun, 2)},
    );
    final onceki = d.toJson().toString();
    Oneriler.uret(d, kurslar, _bugun);
    expect(d.toJson().toString(), onceki);
  });
}
