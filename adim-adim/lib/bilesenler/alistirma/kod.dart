import 'package:flutter/material.dart';

import '../../model/icerik.dart';
import '../../tema/tema.dart';
import 'secenek_listesi.dart';
import 'soru_basligi.dart';

/// Kod boşluğu: kod bloğunda `___` seçilen seçenekle dolar (JetBrains Mono).
class KodGorunumu extends StatefulWidget {
  const KodGorunumu({
    super.key,
    required this.alistirma,
    required this.kontrolEdildi,
    required this.onCevap,
  });
  final Kod alistirma;
  final bool kontrolEdildi;
  final ValueChanged<Object?> onCevap;

  @override
  State<KodGorunumu> createState() => _KodDurumu();
}

class _KodDurumu extends State<KodGorunumu> {
  int? _secili;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final a = widget.alistirma;
    final parcalar = a.kod.split('___');
    final doldurma = _secili == null ? '___' : a.secenekler[_secili!];
    final kodStili = yazi.bodyLarge?.copyWith(fontFamily: yaziKod, height: 1.5);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SoruBasligi(a.soru),
        Semantics(
          label:
              '${a.dil.toUpperCase()} kodu: ${parcalar.join(_secili == null ? 'boşluk' : doldurma)}',
          excludeSemantics: true,
          child: Container(
            width: double.infinity,
            margin: const EdgeInsets.only(bottom: Olcu.b3),
            padding: const EdgeInsets.all(Olcu.b2),
            decoration: BoxDecoration(
              color: r.yuzey,
              borderRadius: BorderRadius.circular(Olcu.kose),
              border: Border.all(color: r.kenar),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Text.rich(
                TextSpan(
                  style: kodStili,
                  children: [
                    for (var i = 0; i < parcalar.length; i++) ...[
                      TextSpan(text: parcalar[i]),
                      if (i < parcalar.length - 1)
                        TextSpan(
                          text: doldurma,
                          style: TextStyle(
                            color: r.ana,
                            fontWeight: FontWeight.w700,
                            backgroundColor: r.kenar,
                          ),
                        ),
                    ],
                  ],
                ),
              ),
            ),
          ),
        ),
        SecenekListesi(
          secenekler: a.secenekler,
          secili: _secili,
          dogru: a.dogru,
          kontrolEdildi: widget.kontrolEdildi,
          monospace: true,
          onSec: (i) {
            setState(() => _secili = i);
            widget.onCevap(i);
          },
        ),
      ],
    );
  }
}
