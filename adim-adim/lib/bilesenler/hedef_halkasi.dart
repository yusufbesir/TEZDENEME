/// Günlük XP hedef halkası: halka + ortada simge ve "12/30" metni.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Hedef dolunca renk ana renkten doğru rengine geçer (≤250 ms).
/// Halka verilen alana LayoutBuilder ile uyar; yazı çapla orantılıdır ama 11 px
/// altına inmez, sığmayan sayı grubu FittedBox ile ölçeklenir.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../tema/tema.dart';

class HedefHalkasi extends StatelessWidget {
  const HedefHalkasi({
    super.key,
    required this.xp,
    required this.hedef,
    this.boyut = 96,
  });

  final int xp;
  final int hedef;
  final double boyut;

  /// Küçük halka (üst şerit): yalnızca "xp/hedef" yazar.
  bool get kucuk => boyut < 72;

  bool get tamam => hedef > 0 && xp >= hedef;

  /// Metin boyutunun alt sınırı (px): halka küçülse de okunur kalır.
  static const double enKucukYazi = 11;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final oran = hedef <= 0 ? 0.0 : (xp / hedef).clamp(0.0, 1.0);
    final etiket = tamam
        ? 'Günlük hedef tamamlandı: $xp / $hedef XP'
        : 'Günlük hedef: $xp / $hedef XP';
    return LayoutBuilder(
      builder: (context, kisit) {
        // Verilen alana sığ: istenen boyut, mevcut en/boydan büyük olamaz.
        final cap = math.min(
          boyut,
          math.min(
            kisit.maxWidth.isFinite ? kisit.maxWidth : boyut,
            kisit.maxHeight.isFinite ? kisit.maxHeight : boyut,
          ),
        );
        final kucukMu = cap < 72;
        final yazi = Theme.of(context).textTheme;
        // Yazı boyutu halka çapıyla orantılı; 11 px altına inmez.
        final sayiBoyutu = math.max(enKucukYazi, cap * 0.165);
        final altBoyut = math.max(enKucukYazi, cap * 0.115);
        return Semantics(
          label: etiket,
          excludeSemantics: true,
          child: TweenAnimationBuilder<Color?>(
            // Hedef dolunca renk ana renkten doğru rengine geçer.
            tween: ColorTween(end: tamam ? r.dogru : r.ana),
            duration: Olcu.sure(context, 250),
            builder: (context, renk, _) => TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: oran),
              duration: Olcu.sure(context, 250),
              builder: (context, deger, _) => SizedBox(
                width: cap,
                height: cap,
                child: CustomPaint(
                  painter: _HalkaBoyaci(
                    oran: deger,
                    iz: r.kenar,
                    ilerleme: renk ?? r.ana,
                    kalinlik: kucukMu ? 5 : 8,
                  ),
                  child: Padding(
                    padding: EdgeInsets.all(kucukMu ? 8 : 14),
                    child: Center(
                      // Yalnız sayı/ikon grubu gerekirse ölçeklenir.
                      child: FittedBox(
                        fit: BoxFit.scaleDown,
                        child: kucukMu
                            ? Text(
                                '$xp/$hedef',
                                maxLines: 1,
                                style: yazi.labelSmall?.copyWith(
                                  fontSize: altBoyut,
                                ),
                              )
                            : Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    tamam
                                        ? Icons.check_circle
                                        : Icons.flag_outlined,
                                    size: math.max(16, cap * 0.21),
                                    color: renk,
                                  ),
                                  Text(
                                    '$xp/$hedef',
                                    maxLines: 1,
                                    style: yazi.titleMedium?.copyWith(
                                      fontSize: sayiBoyutu,
                                    ),
                                  ),
                                  Text(
                                    'XP',
                                    style: yazi.labelSmall?.copyWith(
                                      fontSize: altBoyut,
                                      color: r.metinIkincil,
                                    ),
                                  ),
                                ],
                              ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

class _HalkaBoyaci extends CustomPainter {
  _HalkaBoyaci({
    required this.oran,
    required this.iz,
    required this.ilerleme,
    required this.kalinlik,
  });
  final double oran;
  final Color iz;
  final Color ilerleme;
  final double kalinlik;

  @override
  void paint(Canvas canvas, Size size) {
    final alan = Offset.zero & size;
    final daire = alan.deflate(kalinlik / 2);
    final boya = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = kalinlik
      ..strokeCap = StrokeCap.round;
    canvas.drawArc(daire, 0, math.pi * 2, false, boya..color = iz);
    if (oran > 0) {
      canvas.drawArc(
        daire,
        -math.pi / 2,
        math.pi * 2 * oran,
        false,
        boya..color = ilerleme,
      );
    }
  }

  @override
  bool shouldRepaint(_HalkaBoyaci eski) =>
      eski.oran != oran ||
      eski.kalinlik != kalinlik ||
      eski.iz != iz ||
      eski.ilerleme != ilerleme;
}
