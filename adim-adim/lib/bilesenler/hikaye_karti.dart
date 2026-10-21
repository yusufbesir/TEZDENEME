// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// "Okuma hikâyeleri" kartı (yalnız dil alanı): aktif kurslardaki hikâyeler,
/// kurs başına kolay/orta/zor üç satır (seviye, başlık, kelime sayısı,
/// tamamlandı işareti). Satıra dokununca `/hikaye/:id` açılır. Birden çok
/// kurs varsa her kurs açılır bir başlıktır; ders ilerlemesine göre güncel
/// kurs açık gelir. Aktif kurslarda hikâye yoksa hiçbir şey çizmez.
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../icerik/hikayeler.dart';
import '../model/durum.dart';
import '../model/hikaye.dart';
import '../model/icerik.dart';
import '../tema/tema.dart';

class HikayeKarti extends StatelessWidget {
  const HikayeKarti({super.key, required this.durum, required this.kurslar});

  final OgrenciDurumu durum;
  final List<Kurs> kurslar;

  /// Hikâyesi olan kurslar ve hikâyeleri (kurs sırasıyla).
  static List<({Kurs kurs, List<Hikaye> hikayeler})> grupla(
    List<Kurs> kurslar,
  ) => [
    for (final k in kurslar)
      if (tumHikayeler.any((h) => h.kursId == k.id))
        (
          kurs: k,
          hikayeler: [
            for (final h in tumHikayeler)
              if (h.kursId == k.id) h,
          ],
        ),
  ];

  @override
  Widget build(BuildContext context) {
    final gruplar = grupla(kurslar);
    if (gruplar.isEmpty) return const SizedBox.shrink();
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    // Güncel kurs: ilk tamamlanmamış dersi olan kurs; yoksa ilki.
    var guncel = 0;
    for (var i = 0; i < gruplar.length; i++) {
      if (gruplar[i].kurs.tumDersler.any(
        (d) => (durum.tamamlanan[d.id] ?? 0) == 0,
      )) {
        guncel = i;
        break;
      }
    }
    return Card(
      key: const ValueKey('okuma-hikayeleri'),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: Olcu.b1),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(
                Olcu.b2,
                Olcu.b1,
                Olcu.b2,
                Olcu.b1,
              ),
              child: Row(
                children: [
                  Icon(Icons.auto_stories_outlined, color: r.ana),
                  const SizedBox(width: Olcu.b1),
                  Expanded(
                    child: Semantics(
                      header: true,
                      child: Text('Okuma hikâyeleri', style: yazi.titleMedium),
                    ),
                  ),
                ],
              ),
            ),
            for (var i = 0; i < gruplar.length; i++)
              gruplar.length == 1
                  ? _Satirlar(durum: durum, hikayeler: gruplar[i].hikayeler)
                  : ExpansionTile(
                      key: PageStorageKey('hikaye-kurs-${gruplar[i].kurs.id}'),
                      initiallyExpanded: i == guncel,
                      shape: const Border(),
                      collapsedShape: const Border(),
                      title: Text(
                        gruplar[i].kurs.ad,
                        style: yazi.titleSmall,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      subtitle: Text(
                        '${_biten(gruplar[i].hikayeler)}/${gruplar[i].hikayeler.length} hikâye tamam',
                        style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
                      ),
                      children: [
                        _Satirlar(
                          durum: durum,
                          hikayeler: gruplar[i].hikayeler,
                        ),
                      ],
                    ),
          ],
        ),
      ),
    );
  }

  int _biten(List<Hikaye> hikayeler) =>
      hikayeler.where((h) => (durum.tamamlananHikayeler[h.id] ?? 0) > 0).length;
}

class _Satirlar extends StatelessWidget {
  const _Satirlar({required this.durum, required this.hikayeler});
  final OgrenciDurumu durum;
  final List<Hikaye> hikayeler;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Column(
      children: [
        for (final h in hikayeler)
          Builder(
            builder: (context) {
              final kez = durum.tamamlananHikayeler[h.id] ?? 0;
              final bitti = kez > 0;
              return Semantics(
                button: true,
                label:
                    '${h.seviye.etiket}: ${h.baslik}, ${h.kelimeSayisi} kelime'
                    '${bitti ? ', tamamlandı' : ''}',
                excludeSemantics: true,
                child: ListTile(
                  key: ValueKey('hikaye-satir-${h.id}'),
                  minVerticalPadding: Olcu.b1,
                  leading: Icon(
                    bitti ? Icons.check_circle : Icons.radio_button_unchecked,
                    color: bitti ? r.dogru : r.metinIkincil,
                  ),
                  title: Text(
                    '${h.seviye.etiket} · ${h.baslik}',
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Text(
                    '${h.kelimeSayisi} kelime',
                    style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
                  ),
                  trailing: const Icon(Icons.chevron_right),
                  onTap: () =>
                      context.push('/hikaye/${Uri.encodeComponent(h.id)}'),
                ),
              );
            },
          ),
      ],
    );
  }
}
