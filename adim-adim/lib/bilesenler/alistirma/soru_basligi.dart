import 'package:flutter/material.dart';

import '../../tema/tema.dart';

/// Alıştırma soru metni (Nunito başlık).
class SoruBasligi extends StatelessWidget {
  const SoruBasligi(this.metin, {super.key, this.ipucu});
  final String metin;
  final String? ipucu;

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.only(bottom: Olcu.b3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            header: true,
            child: Text(metin, style: yazi.headlineSmall),
          ),
          if (ipucu != null) ...[
            const SizedBox(height: Olcu.b1),
            Text(
              ipucu!,
              style: yazi.bodyMedium?.copyWith(
                color: context.renkler.metinIkincil,
              ),
            ),
          ],
        ],
      ),
    );
  }
}
