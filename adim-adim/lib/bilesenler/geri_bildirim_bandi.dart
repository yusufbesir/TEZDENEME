import 'package:flutter/material.dart';

import '../tema/tema.dart';

/// Cevap sonrası alt bant: renk + simge + metin. Doğru: dogru rengi, yanlış: hata rengi.
class GeriBildirimBandi extends StatelessWidget {
  const GeriBildirimBandi({
    super.key,
    required this.dogruMu,
    required this.onDevam,
    this.aciklama,
    this.dogruCevap,
    this.devamEtiketi = 'Devam',
  });

  final bool dogruMu;
  final String? aciklama;

  /// Yanlış cevapta gösterilen doğru cevap metni.
  final String? dogruCevap;
  final String devamEtiketi;
  final VoidCallback onDevam;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final zemin = dogruMu ? r.dogru : r.hata;
    final baslik = dogruMu ? 'Doğru!' : 'Yanlış';
    final ayrinti = [
      if (!dogruMu && dogruCevap != null && dogruCevap!.isNotEmpty)
        'Doğru cevap: $dogruCevap',
      if (aciklama != null && aciklama!.isNotEmpty) aciklama!,
    ].join('\n');

    return Semantics(
      liveRegion: true,
      container: true,
      label: ayrinti.isEmpty ? baslik : '$baslik. $ayrinti',
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: 1),
        duration: Olcu.sure(context),
        builder: (context, t, child) => Opacity(
          opacity: t,
          child: Transform.translate(
            offset: Offset(0, (1 - t) * 24),
            child: child,
          ),
        ),
        child: Container(
          width: double.infinity,
          padding: const EdgeInsets.all(Olcu.b2),
          decoration: BoxDecoration(
            color: zemin,
            borderRadius: const BorderRadius.vertical(
              top: Radius.circular(Olcu.kose),
            ),
          ),
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      dogruMu ? Icons.check_circle : Icons.cancel,
                      color: r.anaUstu,
                      size: 28,
                    ),
                    const SizedBox(width: Olcu.b1),
                    Text(
                      baslik,
                      style: yazi.titleLarge?.copyWith(color: r.anaUstu),
                    ),
                  ],
                ),
                if (ayrinti.isNotEmpty) ...[
                  const SizedBox(height: Olcu.b1),
                  Text(
                    ayrinti,
                    style: yazi.bodyMedium?.copyWith(color: r.anaUstu),
                  ),
                ],
                const SizedBox(height: Olcu.b2),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    style: FilledButton.styleFrom(
                      backgroundColor: r.anaUstu,
                      foregroundColor: zemin,
                    ),
                    onPressed: onDevam,
                    child: Text(devamEtiketi),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
