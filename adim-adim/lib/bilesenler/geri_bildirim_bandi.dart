import 'package:flutter/material.dart';

import '../tema/tema.dart';

/// Cevap sonrası alt bant: renk + simge + metin. Doğru: dogru rengi, yanlış: hata rengi.
/// İsteğe bağlı: kademeli ipuçları ([ipuclari]), kişisel kelime notu ([not])
/// ve ikinci bir düğme ([ekEtiket] + [onEk], ör. "İpucu al").
class GeriBildirimBandi extends StatelessWidget {
  const GeriBildirimBandi({
    super.key,
    required this.dogruMu,
    required this.onDevam,
    this.aciklama,
    this.dogruCevap,
    this.devamEtiketi = 'Devam',
    this.ipuclari = const [],
    this.not,
    this.ekEtiket,
    this.onEk,
    this.ekAnahtar,
  });

  final bool dogruMu;
  final String? aciklama;

  /// Yanlış cevapta gösterilen doğru cevap metni.
  final String? dogruCevap;
  final String devamEtiketi;
  final VoidCallback onDevam;

  /// Şimdiye dek alınan ipuçları (sırayla; son öğe çözüm olabilir).
  final List<String> ipuclari;

  /// Kullanıcının bu karta yazdığı kişisel not ("Senin notun: ...").
  final String? not;

  /// İkinci düğme (ör. "İpucu al"); [onEk] null ise gösterilmez.
  final String? ekEtiket;
  final VoidCallback? onEk;
  final Key? ekAnahtar;

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
    final notMetni = (not == null || not!.trim().isEmpty)
        ? null
        : 'Senin notun: ${not!.trim()}';
    final ekVar = ekEtiket != null && onEk != null;

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
                if (ipuclari.isNotEmpty) ...[
                  const SizedBox(height: Olcu.b1),
                  IpucuListesi(ipuclari: ipuclari, renk: r.anaUstu),
                ],
                if (notMetni != null) ...[
                  const SizedBox(height: Olcu.b1),
                  Text(
                    notMetni,
                    style: yazi.bodyMedium?.copyWith(
                      color: r.anaUstu,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ],
                const SizedBox(height: Olcu.b2),
                Row(
                  children: [
                    if (ekVar) ...[
                      Expanded(
                        child: OutlinedButton(
                          key: ekAnahtar,
                          style: OutlinedButton.styleFrom(
                            foregroundColor: r.anaUstu,
                            side: BorderSide(color: r.anaUstu),
                          ),
                          onPressed: onEk,
                          child: Text(ekEtiket!),
                        ),
                      ),
                      const SizedBox(width: Olcu.b1),
                    ],
                    Expanded(
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
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Alınan ipuçlarının listesi: "İpucu 1: ...", "İpucu 2: ..." ve çözüm
/// satırı (çözüm metni zaten "Çözüm:" ile başlar, numara eklenmez).
class IpucuListesi extends StatelessWidget {
  const IpucuListesi({super.key, required this.ipuclari, this.renk});
  final List<String> ipuclari;
  final Color? renk;

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < ipuclari.length; i++)
          Padding(
            padding: EdgeInsets.only(top: i == 0 ? 0 : 4),
            child: Text(
              ipuclari[i].startsWith('Çözüm:')
                  ? ipuclari[i]
                  : 'İpucu ${i + 1}: ${ipuclari[i]}',
              style: yazi.bodyMedium?.copyWith(color: renk),
            ),
          ),
      ],
    );
  }
}
