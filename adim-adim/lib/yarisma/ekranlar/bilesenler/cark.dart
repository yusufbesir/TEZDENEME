/// Şans çarkı: 7 dilim (6 kategori + taç), üstte sabit işaretçi.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Dönüş 1.200 ms, `Curves.easeOutCubic` (belge bölüm 6: 250 ms kuralının TEK
/// istisnası). Hareketi azalt açıksa çark dönmez, hedef dilimde anında durur.
/// Hedef dilimi dışarıdan verilir (motorun `carkCevir` sonucu); çark yalnızca
/// o dilimi işaretçinin altına getirir. Dilim simgeleri yarıçapa oranlıdır.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../tema/kategori_renkleri.dart';
import '../../../tema/tema.dart';
import '../../model.dart';
import '../../motor.dart';
import 'tac.dart';

class Cark extends StatefulWidget {
  const Cark({
    super.key,
    required this.hedefDilim,
    required this.donusNo,
    required this.onBitti,
    this.boyut = 280,
  });

  /// 0..5 kategori, 6 taç; henüz çevrilmediyse null.
  final int? hedefDilim;

  /// Her yeni dönüşte artan sayaç; değişince çark `hedefDilim`e doğru döner.
  final int donusNo;

  /// Çark durduğunda bir kez çağrılır.
  final VoidCallback onBitti;
  final double boyut;

  /// Dönüş süresi (tek istisna).
  static const Duration donusSuresi = Duration(milliseconds: 1200);

  /// Dönüşte atılan en az tam tur.
  static const int tamTur = 4;

  static const double _dilimAcisi = 2 * math.pi / YarismaMotoru.dilimSayisi;

  /// Dilimin çark üzerindeki orta açısı (üstten saat yönünde, radyan).
  static double dilimOrtasi(int dilim) => dilim * _dilimAcisi + _dilimAcisi / 2;

  /// Dilim işaretçinin altında dururken çarkın dönüş açısı ([0, 2π)).
  static double durmaAcisi(int dilim) => (-dilimOrtasi(dilim)) % (2 * math.pi);

  @override
  State<Cark> createState() => _CarkDurumu();
}

class _CarkDurumu extends State<Cark> with SingleTickerProviderStateMixin {
  late final AnimationController _k = AnimationController(
    vsync: this,
    duration: Cark.donusSuresi,
  )..addStatusListener(_durumDegisti);
  double _bas = 0;
  double _bit = 0;

  @override
  void dispose() {
    _k.dispose();
    super.dispose();
  }

  void _durumDegisti(AnimationStatus s) {
    if (s != AnimationStatus.completed) return;
    _durdu();
    widget.onBitti();
  }

  void _durdu() {
    final son = _bit % (2 * math.pi);
    setState(() {
      _bas = son;
      _bit = son;
    });
  }

  @override
  void didUpdateWidget(Cark eski) {
    super.didUpdateWidget(eski);
    final dilim = widget.hedefDilim;
    if (widget.donusNo == eski.donusNo || dilim == null) return;
    const tur = 2 * math.pi;
    final fark = (Cark.durmaAcisi(dilim) - _bas) % tur;
    _bit = _bas + tur * Cark.tamTur + fark;
    if (MediaQuery.maybeDisableAnimationsOf(context) == true) {
      // Hareketi azalt: dönme yok, hedefte anında dur.
      _k.value = 0;
      _bas = _bit % tur;
      _bit = _bas;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) widget.onBitti();
      });
    } else {
      _k.forward(from: 0);
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final parlaklik = Theme.of(context).brightness;
    final renkler = [
      for (final k in YarismaKategori.values)
        KategoriRenkleri.renk(k, parlaklik),
      r.vurgu,
    ];
    final simgeler = [
      for (final k in YarismaKategori.values) KategoriRenkleri.simge(k),
      tacSimgesi,
    ];
    final ustRenk = KategoriRenkleri.ustRenk(parlaklik);
    return Semantics(
      label: 'Şans çarkı: 6 kategori ve bir taç dilimi',
      image: true,
      child: ExcludeSemantics(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CustomPaint(
              size: const Size(28, 22),
              painter: _IsaretciCizici(r.metin),
            ),
            SizedBox(
              width: widget.boyut,
              height: widget.boyut,
              child: AnimatedBuilder(
                animation: _k,
                builder: (context, _) {
                  final aci =
                      _bas +
                      (_bit - _bas) * Curves.easeOutCubic.transform(_k.value);
                  return CustomPaint(
                    painter: _CarkCizici(
                      aci: aci,
                      renkler: renkler,
                      simgeler: simgeler,
                      simgeRengi: ustRenk,
                      kenar: r.zemin,
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _IsaretciCizici extends CustomPainter {
  _IsaretciCizici(this.renk);
  final Color renk;

  @override
  void paint(Canvas canvas, Size size) {
    final yol = Path()
      ..moveTo(0, 0)
      ..lineTo(size.width, 0)
      ..lineTo(size.width / 2, size.height)
      ..close();
    canvas.drawPath(yol, Paint()..color = renk);
  }

  @override
  bool shouldRepaint(_IsaretciCizici eski) => eski.renk != renk;
}

class _CarkCizici extends CustomPainter {
  _CarkCizici({
    required this.aci,
    required this.renkler,
    required this.simgeler,
    required this.simgeRengi,
    required this.kenar,
  });

  final double aci;
  final List<Color> renkler;
  final List<IconData> simgeler;
  final Color simgeRengi;
  final Color kenar;

  @override
  void paint(Canvas canvas, Size size) {
    final merkez = size.center(Offset.zero);
    final yaricap = size.shortestSide / 2;
    final kutu = Rect.fromCircle(center: merkez, radius: yaricap - 2);
    final dilim = 2 * math.pi / renkler.length;
    canvas.save();
    canvas.translate(merkez.dx, merkez.dy);
    canvas.rotate(aci);
    canvas.translate(-merkez.dx, -merkez.dy);
    for (var i = 0; i < renkler.length; i++) {
      final baslangic = -math.pi / 2 + i * dilim;
      canvas.drawArc(kutu, baslangic, dilim, true, Paint()..color = renkler[i]);
      canvas.drawArc(
        kutu,
        baslangic,
        dilim,
        true,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 3
          ..color = kenar,
      );
      _simgeCiz(canvas, merkez, yaricap, baslangic + dilim / 2, i);
    }
    canvas.restore();
    // Orta göbek.
    canvas.drawCircle(merkez, yaricap * 0.12, Paint()..color = kenar);
  }

  void _simgeCiz(
    Canvas canvas,
    Offset merkez,
    double yaricap,
    double a,
    int i,
  ) {
    final uzaklik = yaricap * 0.66;
    final ikon = simgeler[i];
    final tp = TextPainter(
      text: TextSpan(
        text: String.fromCharCode(ikon.codePoint),
        style: TextStyle(
          fontSize: yaricap * 0.2, // çark yarıçapıyla orantılı (320 px'te 32)
          fontFamily: ikon.fontFamily,
          package: ikon.fontPackage,
          color: simgeRengi,
        ),
      ),
      textDirection: TextDirection.ltr,
    )..layout();
    canvas.save();
    canvas.translate(
      merkez.dx + math.cos(a) * uzaklik,
      merkez.dy + math.sin(a) * uzaklik,
    );
    canvas.rotate(a + math.pi / 2);
    tp.paint(canvas, Offset(-tp.width / 2, -tp.height / 2));
    canvas.restore();
  }

  @override
  bool shouldRepaint(_CarkCizici eski) =>
      eski.aci != aci ||
      eski.renkler != renkler ||
      eski.simgeRengi != simgeRengi ||
      eski.kenar != kenar;
}
