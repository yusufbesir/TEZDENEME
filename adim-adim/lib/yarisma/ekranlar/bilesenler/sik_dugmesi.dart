/// Yarışma şık düğmesi: en az 56 dp yüksek; doğru/yanlış/elenmiş durumları.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Doğru: yeşil-mavi parlama (AnimatedContainer, ≤250 ms). Yanlış seçilen:
/// 2 kez ±6 px yatay sarsıntı (≤250 ms). Durum yalnızca renkle verilmez:
/// simge ve anlamsal etiket de vardır.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../tema/tema.dart';

enum SikDurumu {
  /// Seçilebilir.
  normal,

  /// Bomba ya da çift şansla elendi: devre dışı, soluk.
  silindi,

  /// Cevap sonrası doğru şık.
  dogru,

  /// Cevap sonrası oyuncunun seçtiği yanlış şık.
  yanlisSecilen,

  /// Cevap sonrası diğer şıklar.
  soluk,
}

class SikDugmesi extends StatelessWidget {
  const SikDugmesi({
    super.key,
    required this.harf,
    required this.metin,
    required this.durum,
    required this.onTap,
  });

  final String harf;
  final String metin;
  final SikDurumu durum;
  final VoidCallback? onTap;

  /// Dokunulabilir mi.
  bool get etkin => durum == SikDurumu.normal && onTap != null;

  /// En küçük yükseklik (dp).
  static const double enAzYukseklik = 56;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final dogru = durum == SikDurumu.dogru;
    final yanlis = durum == SikDurumu.yanlisSecilen;
    final zemin = dogru ? r.dogru : r.yuzey;
    final kenar = dogru
        ? r.dogru
        : yanlis
        ? r.hata
        : r.kenar;
    final metinRengi = dogru ? r.anaUstu : r.metin;
    final saydamlik = switch (durum) {
      SikDurumu.silindi => 0.4,
      SikDurumu.soluk => 0.55,
      _ => 1.0,
    };
    final ek = switch (durum) {
      SikDurumu.silindi => ', elendi',
      SikDurumu.dogru => ', doğru cevap',
      SikDurumu.yanlisSecilen => ', seçtiğin cevap yanlış',
      _ => '',
    };

    return Semantics(
      button: true,
      enabled: etkin,
      label: '$harf şıkkı: $metin$ek',
      onTap: etkin ? onTap : null,
      excludeSemantics: true,
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: yanlis ? 1.0 : 0.0),
        duration: Olcu.sure(context),
        builder: (context, t, child) => Transform.translate(
          offset: Offset(math.sin(t * 4 * math.pi) * 6, 0),
          child: child,
        ),
        child: Opacity(
          opacity: saydamlik,
          child: AnimatedContainer(
            duration: Olcu.sure(context),
            constraints: const BoxConstraints(minHeight: enAzYukseklik),
            decoration: BoxDecoration(
              color: zemin,
              borderRadius: BorderRadius.circular(Olcu.kose),
              border: Border.all(color: kenar, width: dogru || yanlis ? 2 : 1),
            ),
            child: Material(
              type: MaterialType.transparency,
              child: InkWell(
                borderRadius: BorderRadius.circular(Olcu.kose),
                onTap: etkin ? onTap : null,
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: Olcu.b2,
                    vertical: Olcu.b1,
                  ),
                  child: Row(
                    children: [
                      Text(
                        harf,
                        style: yazi.titleMedium?.copyWith(
                          color: metinRengi,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(width: Olcu.b2),
                      Expanded(
                        child: Text(
                          metin,
                          style: yazi.bodyLarge?.copyWith(
                            color: metinRengi,
                            decoration: durum == SikDurumu.silindi
                                ? TextDecoration.lineThrough
                                : null,
                          ),
                        ),
                      ),
                      if (dogru)
                        Icon(Icons.check_circle, color: r.anaUstu)
                      else if (yanlis)
                        Icon(Icons.cancel_outlined, color: r.hata),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
