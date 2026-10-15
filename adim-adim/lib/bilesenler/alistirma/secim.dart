import 'package:flutter/material.dart';

import '../../model/icerik.dart';
import 'secenek_listesi.dart';
import 'soru_basligi.dart';

class SecimGorunumu extends StatefulWidget {
  const SecimGorunumu({
    super.key,
    required this.alistirma,
    required this.kontrolEdildi,
    required this.onCevap,
  });
  final Secim alistirma;
  final bool kontrolEdildi;
  final ValueChanged<Object?> onCevap;

  @override
  State<SecimGorunumu> createState() => _SecimDurumu();
}

class _SecimDurumu extends State<SecimGorunumu> {
  int? _secili;

  @override
  Widget build(BuildContext context) => Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SoruBasligi(widget.alistirma.soru),
          SecenekListesi(
            secenekler: widget.alistirma.secenekler,
            secili: _secili,
            dogru: widget.alistirma.dogru,
            kontrolEdildi: widget.kontrolEdildi,
            onSec: (i) {
              setState(() => _secili = i);
              widget.onCevap(i);
            },
          ),
        ],
      );
}
