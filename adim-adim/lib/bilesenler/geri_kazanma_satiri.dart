// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Seri geri kazanma satırı (ÖZELLİK 48): seri koptuysa "Seri geri kazanma:
/// 1/3 gün · eski seri 12" yazar. Ücretsiz, cezasız: 3 gün üst üste günlük
/// hedef tutulunca seri eski değer +3 olarak geri gelir. Bekleyen geri
/// kazanma yoksa hiçbir şey çizmez. Metin sarılır (taşmaz).
library;

import 'package:flutter/material.dart';

import '../model/durum.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

class GeriKazanmaSatiri extends StatelessWidget {
  const GeriKazanmaSatiri({
    super.key,
    required this.durum,
    required this.bugun,
  });

  final OgrenciDurumu durum;
  final String bugun;

  /// Satırın metni; bekleyen geri kazanma yoksa null (test edilebilir).
  static String? metin(OgrenciDurumu durum, String bugun) {
    final g = Motor.geriKazanma(durum, bugun);
    if (g == null) return null;
    final ek = g.bugunTamam ? ' · bugün tamam' : ' · bugünkü hedefi tamamla';
    return 'Seri geri kazanma: ${g.ilerleme}/${Motor.geriKazanmaGunSayisi} gün'
        ' · eski seri ${g.kirilan}$ek';
  }

  @override
  Widget build(BuildContext context) {
    final m = metin(durum, bugun);
    if (m == null) return const SizedBox.shrink();
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Padding(
      key: const ValueKey('geri-kazanma-satiri'),
      padding: const EdgeInsets.only(top: Olcu.b1),
      child: Semantics(
        label: m,
        excludeSemantics: true,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(Icons.restore, size: 18, color: r.vurgu),
            const SizedBox(width: Olcu.b1),
            Expanded(
              child: Text(
                m,
                style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
