import 'package:flutter/material.dart';

import '../../model/icerik.dart';
import '../../tema/tema.dart';
import 'secenek_listesi.dart';

/// Boşluk doldurma: cümle içindeki `___` seçilen seçenekle dolar.
class BoslukGorunumu extends StatefulWidget {
  const BoslukGorunumu({
    super.key,
    required this.alistirma,
    required this.kontrolEdildi,
    required this.onCevap,
  });
  final Bosluk alistirma;
  final bool kontrolEdildi;
  final ValueChanged<Object?> onCevap;

  @override
  State<BoslukGorunumu> createState() => _BoslukDurumu();
}

class _BoslukDurumu extends State<BoslukGorunumu> {
  int? _secili;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final a = widget.alistirma;
    final parcalar = a.soru.split('___');
    final doldurma = _secili == null ? '____' : a.secenekler[_secili!];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Semantics(
          header: true,
          label: parcalar.join(_secili == null ? 'boşluk' : doldurma),
          excludeSemantics: true,
          child: Padding(
            padding: const EdgeInsets.only(bottom: Olcu.b3),
            child: Text.rich(
              TextSpan(
                style: yazi.headlineSmall,
                children: [
                  for (var i = 0; i < parcalar.length; i++) ...[
                    TextSpan(text: parcalar[i]),
                    if (i < parcalar.length - 1)
                      TextSpan(
                        text: ' $doldurma ',
                        style: TextStyle(
                          color: r.ana,
                          decoration: TextDecoration.underline,
                          decorationColor: r.ana,
                        ),
                      ),
                  ],
                ],
              ),
            ),
          ),
        ),
        SecenekListesi(
          secenekler: a.secenekler,
          secili: _secili,
          dogru: a.dogru,
          kontrolEdildi: widget.kontrolEdildi,
          onSec: (i) {
            setState(() => _secili = i);
            widget.onCevap(i);
          },
        ),
      ],
    );
  }
}
