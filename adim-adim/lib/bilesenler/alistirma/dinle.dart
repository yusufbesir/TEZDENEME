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
  bool _sesHatasi = false;

  Future<void> _oku({bool yavas = false}) async {
    final ses = ref.read(sesProvider);
    final a = widget.alistirma;
    final tamam = yavas
        ? await ses.okuYavas(a.okunacak, dil: a.dil)
        : await ses.oku(a.okunacak, dil: a.dil);
    if (!tamam && mounted && !_sesHatasi) setState(() => _sesHatasi = true);
  }

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final sesAcik = ref.watch(durumProvider).value?.sesAcik ?? true;
    final a = widget.alistirma;
    // Ses kapalıyken ya da ses servisi çalışmıyorsa düğmeler pasif; cümle yazıyla gösterilir.
    final dugmeAktif = sesAcik && !_sesHatasi;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SoruBasligi(a.soru),
        Center(
          child: Padding(
            padding: const EdgeInsets.only(bottom: Olcu.b3),
            child: Column(
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    _SesDugmesi(
                      anahtar: const Key('dinle-normal'),
                      etiket: 'Cümleyi dinle',
                      gorunenEtiket: 'Normal',
                      simge: Icons.volume_up,
                      boyut: 96,
                      aktif: dugmeAktif,
                      onBas: _oku,
                    ),
                    const SizedBox(width: Olcu.b3),
                    _SesDugmesi(
                      anahtar: const Key('dinle-yavas'),
                      etiket: 'Cümleyi yavaş dinle',
                      gorunenEtiket: 'Yavaş',
                      simge: Icons.slow_motion_video,
                      boyut: 64,
                      aktif: dugmeAktif,
                      onBas: () => _oku(yavas: true),
                    ),
                  ],
                ),
                const SizedBox(height: Olcu.b1),
                Text(
                  sesAcik ? 'Dinlemek için dokun' : 'Ses kapalı',
                  style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                ),
                if (_sesHatasi && sesAcik) ...[
                  const SizedBox(height: Olcu.b1),
                  Text(
                    'Ses kullanılamıyor; cümle yazılı gösterildi',
                    style: yazi.bodyMedium?.copyWith(color: r.hata),
                  ),
                ],
                if (!sesAcik || _sesHatasi) ...[
                  const SizedBox(height: Olcu.b1),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.volume_off, color: r.vurgu, size: 20),
                      const SizedBox(width: Olcu.b1),
                      Flexible(
                        child: Text(
                          'Okunacak cümle: ${a.okunacak}',
                          style: yazi.bodyLarge,
                        ),
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

/// Yuvarlak ses düğmesi + altında görünür etiket ("Normal" / "Yavaş").
class _SesDugmesi extends StatelessWidget {
  const _SesDugmesi({
    required this.anahtar,
    required this.etiket,
    required this.gorunenEtiket,
    required this.simge,
    required this.boyut,
    required this.aktif,
    required this.onBas,
  });

  final Key anahtar;
  final String etiket;
  final String gorunenEtiket;
  final IconData simge;
  final double boyut;
  final bool aktif;
  final VoidCallback onBas;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Semantics(
          button: true,
          enabled: aktif,
          label: etiket,
          excludeSemantics: true,
          onTap: aktif ? onBas : null,
          child: SizedBox(
            width: boyut,
            height: boyut,
            child: FilledButton(
              key: anahtar,
              onPressed: aktif ? onBas : null,
              style: FilledButton.styleFrom(
                shape: const CircleBorder(),
                minimumSize: Size(boyut, boyut),
                padding: EdgeInsets.zero,
              ),
              child: Icon(simge, size: boyut * 0.42),
            ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          gorunenEtiket,
          style: Theme.of(
            context,
          ).textTheme.labelLarge?.copyWith(color: r.metinIkincil),
        ),
      ],
    );
  }
}
