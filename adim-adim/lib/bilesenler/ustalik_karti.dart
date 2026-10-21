/// Ustalık özeti kartı (ders ve ünite için): ustalık yüzdesi, en iyi puan,
/// toplam çalışma süresi, tahmini süre, temel kavram işareti ve (varsa)
/// zorluk dağılımı. Dar ekranda satırlar sarılır; taşma olmaz.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';

import '../motor/ders_meta.dart';
import '../tema/tema.dart';

class UstalikKarti extends StatelessWidget {
  const UstalikKarti({
    super.key,
    required this.ustalik,
    required this.enIyiPuan,
    required this.calismaSn,
    required this.tahminiDk,
    this.temel = false,
    this.dagilim,
  });

  final int ustalik;
  final int? enIyiPuan;
  final int calismaSn;
  final int tahminiDk;
  final bool temel;
  final Map<Zorluk, int>? dagilim;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    Widget satir(IconData simge, String etiket, String deger) => Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(simge, size: 20, color: r.ana),
          const SizedBox(width: Olcu.b1),
          Expanded(child: Text(etiket, style: yazi.bodyMedium)),
          const SizedBox(width: Olcu.b1),
          Text(deger, style: yazi.titleSmall),
        ],
      ),
    );
    final dag = dagilim == null
        ? null
        : [
            for (final z in Zorluk.values)
              if ((dagilim![z] ?? 0) > 0) '${z.etiket} ${dagilim![z]}',
          ].join(' · ');
    return Card(
      key: const ValueKey('ustalik-karti'),
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            satir(Icons.workspace_premium_outlined, 'Ustalık', '%$ustalik'),
            satir(
              Icons.military_tech_outlined,
              'En iyi puan',
              enIyiPuan == null ? '—' : '%$enIyiPuan',
            ),
            satir(
              Icons.timer_outlined,
              'Toplam çalışma',
              DersMeta.sureMetni(calismaSn),
            ),
            satir(Icons.schedule, 'Tahmini süre', '~$tahminiDk dk'),
            if (dag != null && dag.isNotEmpty)
              satir(Icons.signal_cellular_alt, 'Zorluk', dag),
            if (temel)
              Padding(
                padding: const EdgeInsets.only(top: Olcu.b1),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: Chip(
                    avatar: Icon(Icons.bookmark, size: 18, color: r.ana),
                    label: const Text('Temel kavram'),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
