import 'package:flutter/material.dart';

import '../tema/tema.dart';

/// İçeriği ortalar ve geniş ekranda okunur bir genişlikle sınırlar.
class SayfaGovdesi extends StatelessWidget {
  const SayfaGovdesi({super.key, required this.child, this.genislik});
  final Widget child;
  final double? genislik;

  @override
  Widget build(BuildContext context) => Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints:
              BoxConstraints(maxWidth: genislik ?? Olcu.icerikGenislik),
          child: child,
        ),
      );
}
