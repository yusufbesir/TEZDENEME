import 'package:flutter/material.dart';

import '../../model/icerik.dart';
import 'bosluk.dart';
import 'dinle.dart';
import 'eslestir.dart';
import 'kod.dart';
import 'secim.dart';
import 'sirala.dart';
import 'yaz.dart';

/// Alıştırma türüne göre doğru widget'ı seçer.
/// `onCevap`: kullanıcı cevabı hazır olunca değeri, eksikse null verir.
class AlistirmaKarti extends StatelessWidget {
  const AlistirmaKarti({
    super.key,
    required this.alistirma,
    required this.kontrolEdildi,
    required this.dogruMu,
    required this.onCevap,
    required this.onGonder,
  });

  final Alistirma alistirma;
  final bool kontrolEdildi;
  final bool dogruMu;
  final ValueChanged<Object?> onCevap;
  final VoidCallback onGonder;

  @override
  Widget build(BuildContext context) => switch (alistirma) {
    final Secim a => SecimGorunumu(
      alistirma: a,
      kontrolEdildi: kontrolEdildi,
      onCevap: onCevap,
    ),
    final Bosluk a => BoslukGorunumu(
      alistirma: a,
      kontrolEdildi: kontrolEdildi,
      onCevap: onCevap,
    ),
    final Yaz a => YazGorunumu(
      alistirma: a,
      kontrolEdildi: kontrolEdildi,
      dogruMu: dogruMu,
      onCevap: onCevap,
      onGonder: onGonder,
    ),
    final Sirala a => SiralaGorunumu(
      alistirma: a,
      kontrolEdildi: kontrolEdildi,
      dogruMu: dogruMu,
      onCevap: onCevap,
    ),
    final Eslestir a => EslestirGorunumu(
      alistirma: a,
      kontrolEdildi: kontrolEdildi,
      onCevap: onCevap,
    ),
    final Dinle a => DinleGorunumu(
      alistirma: a,
      kontrolEdildi: kontrolEdildi,
      onCevap: onCevap,
    ),
    final Kod a => KodGorunumu(
      alistirma: a,
      kontrolEdildi: kontrolEdildi,
      onCevap: onCevap,
    ),
  };
}
