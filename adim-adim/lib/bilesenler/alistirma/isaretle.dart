import 'package:flutter/material.dart';

import '../../model/icerik.dart';
import '../../tema/tema.dart';
import 'soru_basligi.dart';
import 'yon.dart';

/// Cümlede işaretleme: cümle kelimelere bölünür; doğru kelime(ler)e dokunulur
/// (tekrar dokunmak seçimi kaldırır). Kontrol sonrası doğru kelimeler onay
/// simgesiyle, yanlış seçilenler çarpıyla gösterilir.
class IsaretleGorunumu extends StatefulWidget {
  const IsaretleGorunumu({
    super.key,
    required this.alistirma,
    required this.kontrolEdildi,
    required this.onCevap,
  });
  final Isaretle alistirma;
  final bool kontrolEdildi;
  final ValueChanged<Object?> onCevap;

  @override
  State<IsaretleGorunumu> createState() => _IsaretleDurumu();
}

class _IsaretleDurumu extends State<IsaretleGorunumu> {
  final Set<int> _secili = {};

  void _degistir(int i) {
    if (widget.kontrolEdildi) return;
    setState(() => _secili.contains(i) ? _secili.remove(i) : _secili.add(i));
    widget.onCevap(_secili.isEmpty ? null : (_secili.toList()..sort()));
  }

  @override
  Widget build(BuildContext context) {
    final kelimeler = widget.alistirma.kelimeler;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SoruBasligi(
          widget.alistirma.soru,
          ipucu: 'Doğru kelimeye dokun (birden çok olabilir).',
        ),
        Wrap(
          // Arapça cümle sağdan sola akar (ilk kelime sağda).
          textDirection: parcaYonu(kelimeler),
          spacing: Olcu.b1,
          runSpacing: Olcu.b1,
          children: [
            for (var i = 0; i < kelimeler.length; i++) _kelime(i, kelimeler[i]),
          ],
        ),
      ],
    );
  }

  Widget _kelime(int i, String metin) {
    final r = context.renkler;
    final kontrol = widget.kontrolEdildi;
    final secili = _secili.contains(i);
    final dogruKelime = widget.alistirma.dogru.contains(i);
    final dogruSecim = kontrol && dogruKelime;
    final yanlisSecim = kontrol && secili && !dogruKelime;
    final kenar = dogruSecim
        ? r.dogru
        : yanlisSecim
        ? r.hata
        : secili
        ? r.ana
        : r.kenar;
    final durum = dogruSecim
        ? (secili ? 'doğru, seçili' : 'doğru cevap, seçmedin')
        : yanlisSecim
        ? 'yanlış seçim'
        : secili
        ? 'seçili'
        : '';
    return Semantics(
      button: true,
      selected: secili,
      enabled: !kontrol,
      label: durum.isEmpty ? metin : '$metin, $durum',
      excludeSemantics: true,
      onTap: kontrol ? null : () => _degistir(i),
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          minHeight: Olcu.hedef,
          minWidth: Olcu.hedef,
        ),
        child: Material(
          color: secili ? r.yuzey : r.zemin,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Olcu.kose),
            side: BorderSide(color: kenar, width: secili || kontrol ? 2 : 1),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(Olcu.kose),
            onTap: kontrol ? null : () => _degistir(i),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: Olcu.b2,
                vertical: Olcu.b1 + 4,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (dogruSecim || yanlisSecim) ...[
                    Icon(
                      dogruSecim ? Icons.check_circle : Icons.cancel,
                      size: 20,
                      color: kenar,
                    ),
                    const SizedBox(width: Olcu.b1),
                  ],
                  Flexible(
                    child: Text(
                      metin,
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
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
