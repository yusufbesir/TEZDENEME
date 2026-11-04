/// Çekim turu (saf işlevler): ders sonunda isteğe bağlı, en çok 5 soruluk
/// tekrar. Yalnızca bu oturumda yanlış yapılan alıştırmalar yeniden sorulur
/// (kısa quizden farkı: boşluk başka sorularla doldurulmaz). Hiçbir şey
/// saklanmaz; kısa quiz altyapısı yeniden kullanılır (`/mikro?mod=cekim`),
/// bitişte [Motor.quizBitir] küçük XP verir, kartlar (SRS) değişmez.
///
/// Sahibi Yusuf (yusufbesir), yazan: [Claude#cekim-turu]. Değiştirme kuralı:
/// testler geçmeden değişmez; silme yalnız Yusuf kararıyla.
library;

import '../model/icerik.dart';

abstract final class CekimTuru {
  /// Çekim turundaki en çok soru sayısı.
  static const int adet = 5;

  /// [ders]in [yanlislar] indekslerinden (verilen sırayla; geçersiz ve
  /// yinelenenler atlanır) en çok [sinir] soru.
  static List<({String kartId, Alistirma alistirma})> sec(
    Ders ders,
    List<int> yanlislar, {
    int sinir = adet,
  }) {
    final sonuc = <({String kartId, Alistirma alistirma})>[];
    final alinan = <int>{};
    for (final i in yanlislar) {
      if (sonuc.length >= sinir) break;
      if (i < 0 || i >= ders.alistirmalar.length) continue;
      if (!alinan.add(i)) continue;
      sonuc.add((kartId: ders.kartKimligi(i), alistirma: ders.alistirmalar[i]));
    }
    return sonuc;
  }

  /// Düğme için soru sayısı (0: düğme gösterilmez).
  static int soruSayisi(Ders ders, List<int> yanlislar) =>
      sec(ders, yanlislar).length;

  /// Çekim turu rotası; yanlış indeksleri sorgu parametresinde taşır.
  static String rota(String dersId, List<int> yanlislar) =>
      '/mikro?mod=cekim&ders=${Uri.encodeComponent(dersId)}'
      '&yanlis=${yanlislar.join(',')}';
}
