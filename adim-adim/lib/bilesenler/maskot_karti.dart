/// Çalışma arkadaşı kartı (ÖZELLİK 83): maskotun emojisi, aşama adı, ruh hâli
/// ve sonraki aşamaya ilerleme çubuğu. Yalnız okur (Maskot).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';

import '../model/durum.dart';
import '../motor/maskot.dart';
import '../tema/tema.dart';

class MaskotKarti extends StatelessWidget {
  const MaskotKarti({super.key, required this.durum, required this.bugun});
  final OgrenciDurumu durum;
  final String bugun;

  @override
  Widget build(BuildContext context) {
    final m = Maskot.durum(durum, bugun);
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Card(
      key: const ValueKey('maskot-karti'),
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Row(
          children: [
            ExcludeSemantics(
              child: Text(
                m.asama.emoji,
                key: const ValueKey('maskot-emoji'),
                style: const TextStyle(fontSize: 44),
              ),
            ),
            const SizedBox(width: Olcu.b2),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Çalışma arkadaşın: ${m.asama.ad}',
                    key: const ValueKey('maskot-ad'),
                    style: yazi.titleMedium,
                  ),
                  Text(
                    m.ruhHali,
                    style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
                  ),
                  const SizedBox(height: 4),
                  LinearProgressIndicator(
                    value: m.ilerleme,
                    minHeight: 6,
                    borderRadius: BorderRadius.circular(3),
                  ),
                  Text(
                    m.sonraki == null
                        ? 'En üst aşamadasın'
                        : 'Sonraki: ${m.sonraki!.emoji} ${m.sonraki!.ad} '
                              '(${m.sonraki!.esikXp} XP)',
                    key: const ValueKey('maskot-sonraki'),
                    style: yazi.labelSmall?.copyWith(color: r.metinIkincil),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
