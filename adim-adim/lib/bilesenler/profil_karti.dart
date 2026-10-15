import 'package:flutter/material.dart';

import '../model/durum.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

/// Özet kart: ad, seviye, XP çubuğu, seri. Geniş ekranda yol yanında gösterilir.
class ProfilKarti extends StatelessWidget {
  const ProfilKarti({super.key, required this.durum, this.bugun});
  final OgrenciDurumu durum;

  /// 'YYYY-MM-DD'; seri kopma kontrolü için (yoksa sistem saati).
  final String? bugun;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final sv = Motor.seviye(durum.xp);
    final ad = durum.ad.trim().isEmpty ? 'Öğrenci' : durum.ad.trim();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.account_circle_outlined, size: 40, color: r.ana),
                const SizedBox(width: Olcu.b2),
                Expanded(
                  child: Text(
                    ad,
                    style: yazi.titleLarge,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: Olcu.b2),
            Text('Seviye ${sv.no}', style: yazi.titleMedium),
            const SizedBox(height: Olcu.b1),
            Semantics(
              label: 'Seviye ilerlemesi: ${sv.bu} / ${sv.sonraki} XP',
              excludeSemantics: true,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(Olcu.b1),
                child: LinearProgressIndicator(value: sv.oran, minHeight: 12),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              '${sv.bu} / ${sv.sonraki} XP · toplam ${durum.xp} XP',
              style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
            ),
            const SizedBox(height: Olcu.b2),
            Row(
              children: [
                Icon(Icons.local_fire_department, color: r.vurgu),
                const SizedBox(width: Olcu.b1),
                Expanded(
                  child: Text(
                    '${Motor.gosterilenSeri(durum, bugun)} gün seri',
                    style: yazi.bodyLarge,
                  ),
                ),
              ],
            ),
            const SizedBox(height: Olcu.b1),
            Row(
              children: [
                Icon(Icons.emoji_events_outlined, color: r.vurgu),
                const SizedBox(width: Olcu.b1),
                Expanded(
                  child: Text(
                    'En uzun seri: ${durum.enSeri} gün',
                    style: yazi.bodyLarge,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
