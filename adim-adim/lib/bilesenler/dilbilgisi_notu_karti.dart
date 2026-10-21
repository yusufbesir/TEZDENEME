import 'package:flutter/material.dart';

import '../tema/tema.dart';
import 'sozluklu_secim.dart';

/// Ders başında, alıştırmalardan önce gösterilen kısa dilbilgisi notu kartı.
/// Kademeli ipucundan ayrıdır (ipucu yanlış cevaptan sonra gelir).
class DilbilgisiNotuKarti extends StatelessWidget {
  const DilbilgisiNotuKarti({
    super.key,
    required this.dersAdi,
    required this.not,
    required this.onBasla,
    required this.onKapat,
  });
  final String dersAdi;
  final String not;
  final VoidCallback onBasla;
  final VoidCallback onKapat;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Column(
      children: [
        Align(
          alignment: Alignment.centerLeft,
          child: IconButton(
            tooltip: 'Dersten çık',
            icon: const Icon(Icons.close),
            onPressed: onKapat,
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(Olcu.b2),
            child: Align(
              alignment: Alignment.topCenter,
              child: ConstrainedBox(
                constraints: const BoxConstraints(
                  maxWidth: Olcu.icerikGenislik,
                ),
                child: Semantics(
                  container: true,
                  label: 'Dilbilgisi notu: $not',
                  child: Container(
                    key: const Key('dilbilgisi-notu'),
                    padding: const EdgeInsets.all(Olcu.b3),
                    decoration: BoxDecoration(
                      color: r.yuzey,
                      border: Border.all(color: r.kenar),
                      borderRadius: BorderRadius.circular(Olcu.kose),
                    ),
                    child: ExcludeSemantics(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Icon(Icons.menu_book_outlined, color: r.ana),
                              const SizedBox(width: Olcu.b1),
                              Expanded(
                                child: Text(
                                  'Dilbilgisi notu',
                                  style: yazi.titleMedium,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: Olcu.b1),
                          Text(
                            dersAdi,
                            style: yazi.labelLarge?.copyWith(
                              color: r.metinIkincil,
                            ),
                          ),
                          const SizedBox(height: Olcu.b2),
                          SozlukluSecim(
                            child: Text(not, style: yazi.bodyLarge),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(Olcu.b2),
            child: Align(
              heightFactor: 1,
              child: ConstrainedBox(
                constraints: const BoxConstraints(
                  maxWidth: Olcu.icerikGenislik,
                ),
                child: SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    key: const Key('dilbilgisi-basla'),
                    onPressed: onBasla,
                    child: const Text('Alıştırmalara başla'),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}
