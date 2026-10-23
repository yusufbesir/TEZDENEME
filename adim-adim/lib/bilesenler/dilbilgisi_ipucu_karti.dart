/// Dilbilgisi ipucu kartı: başlık, kısa ipucu metni, örnek cümle ve
/// "İlgili alıştırmaya git" düğmesi. Pratik merkezi ipucu ekranında ve ünite
/// rehberinde ortak kullanılır.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dalga3]
library;

import 'package:flutter/material.dart';

import '../model/dilbilgisi_ipucu.dart';
import '../tema/tema.dart';

class DilbilgisiIpucuKarti extends StatelessWidget {
  const DilbilgisiIpucuKarti({
    super.key,
    required this.ipucu,
    required this.onGit,
    this.dersAdi,
  });

  final DilbilgisiIpucu ipucu;

  /// "İlgili alıştırmaya git" düğmesi.
  final VoidCallback onGit;

  /// Bağlı dersin adı (biliniyorsa düğmenin altında gösterilir).
  final String? dersAdi;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Semantics(
      container: true,
      label: 'Dilbilgisi ipucu: ${ipucu.baslik}. ${ipucu.metin}',
      child: Container(
        padding: const EdgeInsets.all(Olcu.b2),
        decoration: BoxDecoration(
          color: r.yuzey,
          border: Border.all(color: r.kenar),
          borderRadius: BorderRadius.circular(Olcu.kose),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ExcludeSemantics(
              child: Row(
                children: [
                  Icon(Icons.lightbulb_outline, color: r.ana),
                  const SizedBox(width: Olcu.b1),
                  Expanded(
                    child: Text(
                      'Dilbilgisi ipucu',
                      style: yazi.labelLarge?.copyWith(color: r.ana),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: Olcu.b1),
            Text(
              ipucu.baslik,
              key: const ValueKey('ipucu-baslik'),
              style: yazi.titleMedium,
            ),
            const SizedBox(height: Olcu.b1),
            Text(
              ipucu.metin,
              key: const ValueKey('ipucu-metin'),
              style: yazi.bodyMedium,
            ),
            const SizedBox(height: Olcu.b1),
            Text(
              ipucu.ornek,
              key: const ValueKey('ipucu-ornek'),
              style: yazi.bodyLarge?.copyWith(fontWeight: FontWeight.w600),
            ),
            Text(
              ipucu.ornekCeviri,
              style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
            ),
            const SizedBox(height: Olcu.b2),
            Align(
              alignment: Alignment.centerLeft,
              child: FilledButton.tonalIcon(
                key: ValueKey('ipucu-git-${ipucu.dersId}'),
                onPressed: onGit,
                icon: const Icon(Icons.play_arrow),
                label: Text(
                  dersAdi == null
                      ? 'İlgili alıştırmaya git'
                      : 'İlgili alıştırmaya git: $dersAdi',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
