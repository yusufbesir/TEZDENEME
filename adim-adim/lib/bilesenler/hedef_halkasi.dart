import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../tema/tema.dart';

/// Günlük XP hedef halkası: halka + ortada simge ve "12/30" metni.
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
      child: TweenAnimationBuilder<double>(
        tween: Tween(begin: 0, end: oran),
        duration: Olcu.sure(context, 250),
        builder: (context, deger, _) => SizedBox(
          width: boyut,
          height: boyut,
          child: CustomPaint(
            painter: _HalkaBoyaci(
              oran: deger,
              iz: r.kenar,
              ilerleme: tamam ? r.dogru : r.ana,
            ),
            child: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(
                    tamam ? Icons.check_circle : Icons.flag_outlined,
                    size: 20,
                    color: tamam ? r.dogru : r.ana,
                  ),
                  Text(
                    '$xp/$hedef',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  Text(
                    'XP',
                    style: Theme.of(
                      context,
                    ).textTheme.labelSmall?.copyWith(color: r.metinIkincil),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _HalkaBoyaci extends CustomPainter {
  _HalkaBoyaci({required this.oran, required this.iz, required this.ilerleme});
  final double oran;
  final Color iz;
  final Color ilerleme;

  @override
  void paint(Canvas canvas, Size size) {
    const kalinlik = 8.0;
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
      eski.oran != oran || eski.iz != iz || eski.ilerleme != ilerleme;
}
