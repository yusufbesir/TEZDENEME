/// Günlük XP hedef halkası: halka + ortada simge ve "12/30" metni.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Hedef dolunca renk ana renkten doğru rengine geçer (≤250 ms).
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

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final oran = hedef <= 0 ? 0.0 : (xp / hedef).clamp(0.0, 1.0);
    final etiket = tamam
        ? 'Günlük hedef tamamlandı: $xp / $hedef XP'
        : 'Günlük hedef: $xp / $hedef XP';
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
            width: boyut,
            height: boyut,
            child: CustomPaint(
              painter: _HalkaBoyaci(
                oran: deger,
                iz: r.kenar,
                ilerleme: renk ?? r.ana,
                kalinlik: kucuk ? 5 : 8,
              ),
              child: Center(
                child: kucuk
                    ? Text(
                        '$xp/$hedef',
                        style: Theme.of(context).textTheme.labelSmall,
                      )
                    : Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            tamam ? Icons.check_circle : Icons.flag_outlined,
                            size: 20,
                            color: renk,
                          ),
                          Text(
                            '$xp/$hedef',
                            style: Theme.of(context).textTheme.titleMedium,
                          ),
                          Text(
                            'XP',
                            style: Theme.of(context).textTheme.labelSmall
                                ?.copyWith(color: r.metinIkincil),
                          ),
                        ],
                      ),
              ),
            ),
          ),
        ),
      ),
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
