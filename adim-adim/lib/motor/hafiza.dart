/// Bellek puanı ve çok modlu çalışma (ÖZELLİK 78, Quizlet): her ünite için
/// "hafıza puanı" (0..100) kartların kişisel unutma eğrisinin yarı ömründen
/// türetilir (KelimeBulutu.gucHesapla ile aynı logaritmik ölçek; saklanmaz).
/// Puan: ünitenin çalışılmış adımlarının (dersi bitmiş ya da kartı olan
/// alıştırmalar) güçlerinin ortalaması; kartı olmayan adım 0 sayılır. Aynı
/// ünite içeriğiyle dört mod çalışılır: kart (çevir), yazma, eşleştirme, test.
/// Modlar geçici destedir: SRS, hata defteri, XP ve günlük DEĞİŞMEZ (Pratik
/// kuralı). Kod kurslarında "kelime" yerine terim çiftleri kullanılır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:math' as math;

import '../model/durum.dart';
import '../model/icerik.dart';
import '../sozluk/sozluk.dart';
import 'ders_ogeleri.dart';
import 'kelime_bulutu.dart';
import 'pratik.dart';

enum CalismaModu {
  kart('Kart', 'Çevir ve kendini değerlendir'),
  yazma('Yazma', 'Anlamı gör, kelimeyi yaz'),
  eslestirme('Eşleştirme', 'Kelime ile anlamı eşle'),
  test('Test', 'Dört seçenekten doğru anlamı seç');

  const CalismaModu(this.ad, this.aciklama);
  final String ad;
  final String aciklama;
}

/// Test sorusu: [metin] için [secenekler] (anlamlar), [dogru] indeksi.
typedef HafizaTesti = ({String metin, List<String> secenekler, int dogru});

class UniteHafizasi {
  const UniteHafizasi({
    required this.kurs,
    required this.uniteIndeks,
    required this.puan,
    required this.adimSayisi,
    required this.kartSayisi,
    required this.zayifSayisi,
  });

  final Kurs kurs;
  final int uniteIndeks;

  /// 0..100.
  final int puan;

  /// Puana giren (çalışılmış) adım sayısı ve bunların kartı olanı.
  final int adimSayisi;
  final int kartSayisi;

  /// Yarı ömrü [Kart.ortaEsik] altında kalan kart sayısı.
  final int zayifSayisi;

  Unite get unite => kurs.uniteler[uniteIndeks];

  String get etiket => puan >= 70
      ? 'Güçlü'
      : puan >= 40
      ? 'Orta'
      : 'Zayıf';
}

abstract final class Hafiza {
  static const int testSecenek = 4;
  static const int testEnCok = 10;
  static const int eslestirmeEnAz = Pratik.eslestirmeEnAz;
  static const int eslestirmeEnCok = 6;

  /// Üniteyi çalışılmış sayan adımlar: dersi bitmiş ya da atlanmış dersin tüm
  /// adımları ve kartı olan adımlar. Kart kimliği -> güç (kartsız 0).
  static Map<String, double> _adimGuclari(OgrenciDurumu d, Unite u) {
    final m = <String, double>{};
    for (final ders in u.dersler) {
      final bitti = (d.tamamlanan[ders.id] ?? 0) > 0;
      for (var i = 0; i < ders.alistirmalar.length; i++) {
        final id = ders.kartKimligi(i);
        final kart = d.kartlar[id];
        if (!bitti && kart == null) continue;
        m[id] = kart == null ? 0.0 : KelimeBulutu.gucHesapla(kart.yariOmurGun);
      }
    }
    return m;
  }

  static UniteHafizasi uniteHafizasi(
    OgrenciDurumu d,
    Kurs kurs,
    int uniteIndeks,
  ) {
    final u = kurs.uniteler[uniteIndeks];
    final guc = _adimGuclari(d, u);
    var toplam = 0.0;
    var kart = 0;
    var zayif = 0;
    for (final e in guc.entries) {
      toplam += e.value;
      final k = d.kartlar[e.key];
      if (k != null) {
        kart++;
        if (k.yariOmurGun < Kart.ortaEsik) zayif++;
      }
    }
    final puan = guc.isEmpty ? 0 : (100 * toplam / guc.length).round();
    return UniteHafizasi(
      kurs: kurs,
      uniteIndeks: uniteIndeks,
      puan: puan.clamp(0, 100),
      adimSayisi: guc.length,
      kartSayisi: kart,
      zayifSayisi: zayif,
    );
  }

  /// Çalışılmış (puana giren adımı olan) tüm üniteler, kurs ve ünite sırasıyla.
  static List<UniteHafizasi> uniteler(OgrenciDurumu d, List<Kurs> kurslar) => [
    for (final k in kurslar)
      for (var i = 0; i < k.uniteler.length; i++)
        if (_adimGuclari(d, k.uniteler[i]).isNotEmpty) uniteHafizasi(d, k, i),
  ];

  /// Ünitenin çalışılabilir kelime/terim çiftleri (çalışılmış adımlardan;
  /// anlamı olan, en çok 3 kelimelik; metin ve anlam tekrarsız).
  static List<KelimeCifti> ogeler(OgrenciDurumu d, Kurs kurs, int uniteIndeks) {
    final u = kurs.uniteler[uniteIndeks];
    final guc = _adimGuclari(d, u);
    final sonuc = <KelimeCifti>[];
    final gorulen = <String>{};
    for (final ders in u.dersler) {
      for (final o in DersOgeleri.uret(ders, alan: kurs.alan).ogeler) {
        if (o.tur == OgeTuru.kalip) continue;
        final anlam = o.anlam;
        if (anlam == null || anlam.isEmpty) continue;
        if (anlam.length > 40 || anlam.contains('?')) continue;
        if (o.metin.split(RegExp(r'\s+')).length > 3) continue;
        if (!guc.containsKey(o.kartId)) continue;
        if (!gorulen.add('${o.metin}\u0000$anlam')) continue;
        sonuc.add((kartId: o.kartId, metin: o.metin, anlam: anlam));
      }
    }
    return sonuc;
  }

  /// Modun bu çiftlerle açılıp açılamayacağı (test ve eşleştirme için
  /// yeterince farklı anlam gerekir).
  static bool modAcik(CalismaModu m, List<KelimeCifti> c) {
    final farkli = {for (final x in c) x.anlam}.length;
    return switch (m) {
      CalismaModu.kart || CalismaModu.yazma => c.isNotEmpty,
      CalismaModu.eslestirme =>
        farkli >= eslestirmeEnAz && c.length >= eslestirmeEnAz,
      CalismaModu.test => farkli >= testSecenek,
    };
  }

  /// Yazma denetimi: büyük/küçük harf, baştaki/sondaki boşluk ve Türkçe harf
  /// farkı (ş/s, ı/i ...) yok sayılır; parantez içi ek ("(roman.)") atılır.
  static bool yazmaDogruMu(String girilen, String metin) {
    String n(String s) => Sozluk.normalize(
      s.replaceAll(RegExp(r'\s*\([^)]*\)\s*$'), ''),
    ).replaceAll(RegExp(r'\s+'), ' ');
    final g = n(girilen);
    return g.isNotEmpty && g == n(metin);
  }

  /// Çift karışımı (tohuma bağlı, deterministik).
  static List<KelimeCifti> karistir(List<KelimeCifti> c, {int tohum = 0}) =>
      [...c]..shuffle(math.Random(tohum));

  /// Eşleştirme için en çok [eslestirmeEnCok] çift; metinler ve anlamlar
  /// kendi içinde tekrarsız. Yeterli çift yoksa boş.
  static List<KelimeCifti> eslestirmeCiftleri(
    List<KelimeCifti> c, {
    int tohum = 0,
  }) {
    final m = <String>{};
    final a = <String>{};
    final benzersiz = [
      for (final x in karistir(c, tohum: tohum))
        if (m.add(x.metin) && a.add(x.anlam)) x,
    ];
    if (benzersiz.length < eslestirmeEnAz) return const [];
    return benzersiz.take(eslestirmeEnCok).toList();
  }

  /// Test soruları: her çift için 4 seçenek (doğru anlam + 3 farklı çeldirici).
  /// En çok [testEnCok] soru; farklı anlam sayısı 4'ten azsa boş.
  static List<HafizaTesti> testSorulari(
    List<KelimeCifti> c, {
    int tohum = 0,
    int adet = testEnCok,
  }) {
    final anlamlar = {for (final x in c) x.anlam}.toList()..sort();
    if (anlamlar.length < testSecenek) return const [];
    final rnd = math.Random(tohum);
    final sonuc = <HafizaTesti>[];
    for (final x in karistir(c, tohum: tohum).take(adet)) {
      final cel = [...anlamlar]
        ..remove(x.anlam)
        ..shuffle(rnd);
      final sec = [x.anlam, ...cel.take(testSecenek - 1)]..shuffle(rnd);
      sonuc.add((metin: x.metin, secenekler: sec, dogru: sec.indexOf(x.anlam)));
    }
    return sonuc;
  }
}
