/// Fiil çekim tablosu penceresi (ÖZELLİK 61): sözlükte fiil maddesine
/// dokununca açılan alt sayfa; zaman zaman kişi/biçim tabloları. Veri yalnız
/// kurs tablolarından derlenmiş, doğrulanmış çekimlerdir ([FiilCekimleri]).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';

import '../sozluk/fiil_cekimi.dart';
import '../tema/tema.dart';

/// Alt sayfayı açar. [anlam] maddenin Türkçe anlamıdır (başlıkta gösterilir).
Future<void> fiilCekimiGoster(
  BuildContext context,
  FiilCekimi cekim, {
  String? anlam,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (c) => FiilCekimTablosu(cekim: cekim, anlam: anlam),
  );
}

class FiilCekimTablosu extends StatelessWidget {
  const FiilCekimTablosu({super.key, required this.cekim, this.anlam});
  final FiilCekimi cekim;
  final String? anlam;

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    return SafeArea(
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.sizeOf(context).height * 0.8,
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(Olcu.b3, 0, Olcu.b3, Olcu.b3),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Semantics(
                header: true,
                child: Text(
                  anlam == null ? cekim.fiil : '${cekim.fiil} · $anlam',
                  key: const ValueKey('fiil-cekim-baslik'),
                  style: yazi.titleLarge,
                ),
              ),
              const SizedBox(height: Olcu.b1),
              Text(
                'Çekimler derslerdeki tablolardan derlendi; derslerde '
                'geçmeyen kişiler ve zamanlar burada yer almaz.',
                key: const ValueKey('fiil-cekim-not'),
                style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
              ),
              for (final z in cekim.zamanlar) ...[
                const SizedBox(height: Olcu.b2),
                Text(z.ad, style: yazi.titleMedium?.copyWith(color: r.ana)),
                const SizedBox(height: Olcu.b1),
                Table(
                  key: ValueKey('fiil-cekim-${z.ad}'),
                  columnWidths: const {
                    0: IntrinsicColumnWidth(),
                    1: FlexColumnWidth(),
                  },
                  border: TableBorder(
                    horizontalInside: BorderSide(color: r.kenar),
                  ),
                  children: [
                    for (final s in z.satirlar)
                      TableRow(
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              vertical: Olcu.b1,
                              horizontal: Olcu.b1,
                            ),
                            child: Text(
                              s.zamir,
                              style: yazi.bodyLarge?.copyWith(
                                color: r.metinIkincil,
                              ),
                            ),
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              vertical: Olcu.b1,
                              horizontal: Olcu.b1,
                            ),
                            child: Text(
                              s.bicim,
                              style: yazi.bodyLarge?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ],
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
