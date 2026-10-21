/// Kelime bulutu ve öğrenme göstergesi (ÖZELLİK 66, Mondly): öğrenilen
/// kelimelerin güce göre büyüyen bulutu ve profildeki "öğrendiğin kelime
/// sayısı". Türetilir, saklanmaz: bir kelime, tamamlanmış bir dersin ya da
/// tekrar kümesindeki bir kartın kelime öğesiyse (anlamı bilinen, en çok üç
/// kelimelik) "öğrenilmiş" sayılır. Güç, kartın kişisel unutma eğrisinin yarı
/// ömründen gelir (Kart.yariOmurGun; 0,5..180 gün, logaritmik ölçek); kartı
/// olmayan (dersi bitmiş ama tekrar kümesine girmemiş) kelime "yeni" ve en
/// zayıf boyutta gösterilir. Yalnız dil kursları; kod/oyun kurslarında bulut
/// yoktur. Kart aralıklarına dokunmaz.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:math' as math;

import '../model/durum.dart';
import '../model/icerik.dart';
import 'ders_ogeleri.dart';

/// Kelimenin güç kümesi: Kelime sağlığı eşikleriyle aynı ([Kart.ortaEsik],
/// [Kart.gucluEsik]); kartı olmayan "yeni".
enum KelimeGucu {
  yeni('Yeni'),
  zayif('Zayıf'),
  orta('Orta'),
  guclu('Güçlü');

  const KelimeGucu(this.etiket);
  final String etiket;
}

class BulutKelimesi {
  const BulutKelimesi({
    required this.metin,
    required this.anlam,
    required this.guc,
    required this.kume,
  });

  final String metin;
  final String anlam;

  /// 0..1 (büyüklük için); yeni kelime 0.
  final double guc;
  final KelimeGucu kume;
}

abstract final class KelimeBulutu {
  /// Bulutta gösterilen en çok kelime.
  static const int enCokGosterim = 60;

  /// Yazı boyutu aralığı (mantıksal px): güç 0 → [enKucuk], güç 1 → [enBuyuk].
  static const double enKucuk = 14;
  static const double enBuyuk = 32;

  static final RegExp _parantez = RegExp(r'\s*\([^)]*\)\s*$');

  /// Yarı ömürden 0..1 güç (logaritmik).
  static double gucHesapla(double yariOmurGun) {
    final y = yariOmurGun.clamp(Kart.enAzYariOmur, Kart.enCokYariOmur);
    return math.log(y / Kart.enAzYariOmur) /
        math.log(Kart.enCokYariOmur / Kart.enAzYariOmur);
  }

  static KelimeGucu kume(Kart? kart) {
    if (kart == null) return KelimeGucu.yeni;
    if (kart.yariOmurGun < Kart.ortaEsik) return KelimeGucu.zayif;
    if (kart.yariOmurGun < Kart.gucluEsik) return KelimeGucu.orta;
    return KelimeGucu.guclu;
  }

  /// Güçten yazı boyutu.
  static double boyut(double guc) =>
      enKucuk + (enBuyuk - enKucuk) * guc.clamp(0.0, 1.0);

  /// Öğrenilen tüm kelimeler, güçlüden zayıfa (eşitlikte alfabetik).
  static List<BulutKelimesi> uret(OgrenciDurumu d, List<Kurs> kurslar) {
    final sonuc = <BulutKelimesi>[];
    final gorulen = <String>{};
    for (final kurs in kurslar) {
      if (kurs.alan != KursAlani.dil) continue;
      for (final ders in kurs.tumDersler) {
        final bitti = (d.tamamlanan[ders.id] ?? 0) > 0;
        final oge = DersOgeleri.uret(ders, alan: kurs.alan);
        for (final o in oge.tureGore(OgeTuru.kelime)) {
          final anlam = o.anlam;
          if (anlam == null || anlam.isEmpty) continue;
          // Yaz sorusundan gelen uzun/soru cümlesi anlam sayılmaz.
          if (anlam.length > 40 || anlam.contains('?')) continue;
          final kart = d.kartlar[o.kartId];
          if (!bitti && kart == null) continue;
          final metin = o.metin.replaceAll(_parantez, '').trim();
          if (metin.isEmpty || metin.split(RegExp(r'\s+')).length > 3) continue;
          if (!gorulen.add(metin.toLowerCase())) continue;
          sonuc.add(
            BulutKelimesi(
              metin: metin,
              anlam: anlam,
              guc: kart == null ? 0.0 : gucHesapla(kart.yariOmurGun),
              kume: kume(kart),
            ),
          );
        }
      }
    }
    sonuc.sort((a, b) {
      final c = b.guc.compareTo(a.guc);
      return c != 0
          ? c
          : a.metin.toLowerCase().compareTo(b.metin.toLowerCase());
    });
    return List.unmodifiable(sonuc);
  }

  /// Profil göstergesi: öğrenilen (tekrarsız) kelime sayısı.
  static int ogrenilenSayisi(OgrenciDurumu d, List<Kurs> kurslar) =>
      uret(d, kurslar).length;
}
