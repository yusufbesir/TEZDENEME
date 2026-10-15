import 'package:flutter/material.dart';

import '../../model/icerik.dart';
import '../../tema/tema.dart';
import 'soru_basligi.dart';

/// Serbest yazma. Kontrol sonrası alan kilitlenir; doğru/yanlış simge ve metinle gösterilir.
class YazGorunumu extends StatefulWidget {
  const YazGorunumu({
    super.key,
    required this.alistirma,
    required this.kontrolEdildi,
    required this.dogruMu,
    required this.onCevap,
    required this.onGonder,
  });
  final Yaz alistirma;
  final bool kontrolEdildi;
  final bool dogruMu;
  final ValueChanged<Object?> onCevap;
  final VoidCallback onGonder;

  @override
  State<YazGorunumu> createState() => _YazDurumu();
}

class _YazDurumu extends State<YazGorunumu> {
  final _denetci = TextEditingController();

  @override
  void dispose() {
    _denetci.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final kontrol = widget.kontrolEdildi;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SoruBasligi(widget.alistirma.soru),
        TextField(
          controller: _denetci,
          readOnly: kontrol,
          autofocus: true,
          maxLength: 200,
          textInputAction: TextInputAction.done,
          autocorrect: false,
          enableSuggestions: false,
          decoration: InputDecoration(
            labelText: 'Cevabını yaz',
            counterText: '',
            suffixIcon: kontrol
                ? Icon(widget.dogruMu ? Icons.check_circle : Icons.cancel,
                    color: widget.dogruMu ? r.dogru : r.hata)
                : null,
            enabledBorder: kontrol
                ? OutlineInputBorder(
                    borderRadius: BorderRadius.circular(Olcu.kose),
                    borderSide: BorderSide(
                        color: widget.dogruMu ? r.dogru : r.hata, width: 2),
                  )
                : null,
          ),
          onChanged: (v) => widget.onCevap(v.trim().isEmpty ? null : v),
          onSubmitted: (v) {
            if (!kontrol && v.trim().isNotEmpty) widget.onGonder();
          },
        ),
      ],
    );
  }
}
