import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../durum/saglayicilar.dart';
import '../../model/icerik.dart';
import '../../tema/tema.dart';
import 'secenek_listesi.dart';
import 'soru_basligi.dart';

/// Dinleme: hoparlör düğmesi metni okur; kullanıcı duyduğunu seçer.
/// Ses ayarda kapalıysa okunacak metin yazıyla gösterilir.
class DinleGorunumu extends ConsumerStatefulWidget {
  const DinleGorunumu({
    super.key,
    required this.alistirma,
    required this.kontrolEdildi,
    required this.onCevap,
  });
  final Dinle alistirma;
  final bool kontrolEdildi;
  final ValueChanged<Object?> onCevap;

  @override
  ConsumerState<DinleGorunumu> createState() => _DinleDurumu();
}

class _DinleDurumu extends ConsumerState<DinleGorunumu> {
  int? _secili;

  void _oku() => ref.read(sesProvider).oku(widget.alistirma.okunacak);

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final sesAcik = ref.watch(durumProvider).value?.sesAcik ?? true;
    final a = widget.alistirma;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SoruBasligi(a.soru),
        Center(
          child: Padding(
            padding: const EdgeInsets.only(bottom: Olcu.b3),
            child: Column(
              children: [
                Semantics(
                  button: true,
                  enabled: sesAcik,
                  label: 'Cümleyi dinle',
                  excludeSemantics: true,
                  onTap: sesAcik ? _oku : null,
                  child: SizedBox(
                    width: 96,
                    height: 96,
                    child: FilledButton(
                      onPressed: sesAcik ? _oku : null,
                      style: FilledButton.styleFrom(
                        shape: const CircleBorder(),
                        minimumSize: const Size(96, 96),
                        padding: EdgeInsets.zero,
                      ),
                      child: const Icon(Icons.volume_up, size: 40),
                    ),
                  ),
                ),
                const SizedBox(height: Olcu.b1),
                Text(sesAcik ? 'Dinlemek için dokun' : 'Ses kapalı',
                    style: yazi.bodyMedium?.copyWith(color: r.metinIkincil)),
                if (!sesAcik) ...[
                  const SizedBox(height: Olcu.b1),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.volume_off, color: r.vurgu, size: 20),
                      const SizedBox(width: Olcu.b1),
                      Flexible(
                        child: Text('Okunacak cümle: ${a.okunacak}',
                            style: yazi.bodyLarge),
                      ),
                    ],
                  ),
                ],
              ],
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
