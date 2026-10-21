// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Kolaylaştırma önerisi satırı (ÖZELLİK 50): üst üste iki başarısız ders
/// denemesinden sonra ders özetinde "daha kolay ders ya da tekrar" önerir.
/// Öneri yoksa hiçbir şey çizmez. Ceza yoktur; yok sayılabilir. Metin sarılır
/// (taşmaz).
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../motor/kolaylastirma.dart';
import '../tema/tema.dart';

class KolaylastirmaSatiri extends StatelessWidget {
  const KolaylastirmaSatiri({super.key, required this.oneri});

  /// null: öneri yok.
  final KolaylastirmaOnerisi? oneri;

  /// Önerinin rotası: kolay ders / yeniden dene -> ders, tekrar -> Tekrar
  /// sekmesi, zayıf -> zayıf noktalar dersi.
  static String rota(KolaylastirmaOnerisi o) => switch (o.tur) {
    'ders' || 'yeniden' => '/ders/${Uri.encodeComponent(o.dersId ?? '')}',
    'zayif' => '/mikro?mod=zayif',
    _ => '/tekrar',
  };

  @override
  Widget build(BuildContext context) {
    final o = oneri;
    if (o == null) return const SizedBox.shrink();
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Card(
      key: const ValueKey('kolaylastirma-onerisi'),
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(Icons.lightbulb_outline, color: r.vurgu),
                const SizedBox(width: Olcu.b1),
                Expanded(child: Text(o.mesaj, style: yazi.bodyMedium)),
              ],
            ),
            const SizedBox(height: Olcu.b1),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.tonal(
                key: const ValueKey('kolaylastirma-git'),
                style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
                onPressed: () => o.tur == 'tekrar'
                    ? context.go(rota(o))
                    : context.push(rota(o)),
                child: Text(o.etiket),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
