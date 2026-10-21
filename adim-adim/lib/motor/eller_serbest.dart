/// Eller serbest sesli mod (ÖZELLİK 64) için deste seçimi: ekrana bakmadan
/// çalışılacak kelime ve kalıplar. Öğrencinin tamamlanmış derslerinden (ya da
/// kart kümesindeki kartlarından) türetilir; yalnız dil kurslarında, anlamı
/// bilinen ve en çok [enCokKelime] kelimelik öğeler. Saf işlevdir; durum ve
/// kart aralıklarını değiştirmez (Pratik merkezi kuralı).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:math' as math;

import '../model/durum.dart';
import '../model/icerik.dart';
import 'ders_ogeleri.dart';

/// Oturumdaki bir öğe: okunacak/söylenecek [metin], Türkçe [anlam] ve dil.
class ElleriSerbestOgesi {
  const ElleriSerbestOgesi({
    required this.kartId,
    required this.metin,
    required this.anlam,
    required this.dil,
  });
  final String kartId;
  final String metin;
  final String? anlam;
  final String dil;
}

abstract final class ElleriSerbest {
  /// Bir oturumdaki en çok öğe ve öğedeki en çok kelime.
  static const int enCok = 10;
  static const int enCokKelime = 6;

  static final RegExp _parantez = RegExp(r'\s*\([^)]*\)\s*$');

  static int _kelimeSayisi(String s) =>
      s.trim().split(RegExp(r'\s+')).where((k) => k.isNotEmpty).length;

  /// Oturum destesi: zayıf (yarı ömrü kısa) kartlar önce, kalanı karışık;
  /// aynı [tohum] aynı deste. Dil olmayan kurslar ve anlamsız öğeler atlanır.
  static List<ElleriSerbestOgesi> deste(
    OgrenciDurumu d,
    List<Kurs> kurslar, {
    int tohum = 0,
  }) {
    final havuz = <ElleriSerbestOgesi>[];
    final gorulen = <String>{};
    for (final kurs in kurslar) {
      if (kurs.alan != KursAlani.dil) continue;
      for (final ders in kurs.tumDersler) {
        final bitti = (d.tamamlanan[ders.id] ?? 0) > 0;
        final oge = DersOgeleri.uret(ders, alan: kurs.alan);
        for (final o in oge.ogeler) {
          final dil = o.sesDili;
          if (dil == null) continue;
          if (o.tur == OgeTuru.fiil) continue; // Tablo hücreleri okunmaz.
          if (!bitti && !d.kartlar.containsKey(o.kartId)) continue;
          final anlam = o.anlam;
          // Yaz sorusundan gelen uzun/soru cümlesi anlam sayılmaz.
          final anlamTemiz =
              (anlam == null ||
                  anlam.isEmpty ||
                  anlam.length > 40 ||
                  anlam.contains('?'))
              ? null
              : anlam;
          final metin = o.metin.replaceAll(_parantez, '').trim();
          if (metin.isEmpty || _kelimeSayisi(metin) > enCokKelime) continue;
          if (!gorulen.add(metin.toLowerCase())) continue;
          havuz.add(
            ElleriSerbestOgesi(
              kartId: o.kartId,
              metin: metin,
              anlam: anlamTemiz,
              dil: dil,
            ),
          );
        }
      }
    }
    havuz.shuffle(math.Random(tohum));
    double yo(ElleriSerbestOgesi o) => d.kartlar[o.kartId]?.yariOmurGun ?? 1e9;
    final sirali = [
      ...havuz.where((o) => yo(o) < Kart.ortaEsik),
      ...havuz.where((o) => yo(o) >= Kart.ortaEsik),
    ];
    return List.unmodifiable(sirali.take(enCok));
  }
}
