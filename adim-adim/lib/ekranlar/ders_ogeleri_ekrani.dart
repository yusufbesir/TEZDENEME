/// Ders sonu tekrar ekranı (`/ders-ogeleri/:id`): dersin alıştırmalarından
/// türetilen öğeler (DersOgeleri) üç sekmede; boş sekme gizlenir. Her satırda
/// sesli okuma (yalnız dil kurslarında) ve "Kartlara ekle"; üstte toplu
/// "Hepsini kartlara ekle".
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/icerik.dart';
import '../motor/ders_ogeleri.dart';
import '../tema/tema.dart';

class DersOgeleriEkrani extends ConsumerWidget {
  const DersOgeleriEkrani({super.key, required this.dersId});
  final String dersId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    Kurs? kurs;
    Ders? ders;
    for (final k in ref.watch(kurslarProvider)) {
      final d = k.dersBul(dersId);
      if (d != null) {
        kurs = k;
        ders = d;
        break;
      }
    }
    final durum = ref.watch(durumProvider).value;
    final ogeler = (kurs == null || ders == null)
        ? null
        : DersOgeleri.uret(
            ders,
            alan: kurs.alan,
            varsayilanDil: DersOgeleri.kursSesDili(kurs.id),
          );
    void cik() => context.canPop() ? context.pop() : context.go('/yol');
    if (ogeler == null || ogeler.bos || durum == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Bu dersin öğeleri')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(Olcu.b3),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Bu dersten türetilen öğe yok.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: Olcu.b2),
                FilledButton(onPressed: cik, child: const Text('Geri dön')),
              ],
            ),
          ),
        ),
      );
    }
    final turler = [
      for (final t in OgeTuru.values)
        if (ogeler.tureGore(t).isNotEmpty) t,
    ];
    final eklenecek = {
      for (final o in ogeler.ogeler)
        if (!durum.kartlar.containsKey(o.kartId)) o.kartId,
    };
    return DefaultTabController(
      length: turler.length,
      child: Scaffold(
        appBar: AppBar(
          title: Text(ders!.ad),
          bottom: TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              for (final t in turler)
                Tab(text: '${ogeler.baslik(t)} (${ogeler.tureGore(t).length})'),
            ],
          ),
        ),
        body: SafeArea(
          child: SayfaGovdesi(
            child: Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(
                    Olcu.b2,
                    Olcu.b2,
                    Olcu.b2,
                    Olcu.b1,
                  ),
                  child: SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      key: const ValueKey('ogeler-hepsini-ekle'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(48, 48),
                      ),
                      icon: const Icon(Icons.add_card),
                      label: Text(
                        eklenecek.isEmpty
                            ? 'Hepsi kartlarda'
                            : 'Hepsini kartlara ekle',
                        textAlign: TextAlign.center,
                      ),
                      onPressed: eklenecek.isEmpty
                          ? null
                          : () async {
                              final mesajci = ScaffoldMessenger.of(context);
                              await ref
                                  .read(durumProvider.notifier)
                                  .kartlarEkle(eklenecek);
                              mesajci
                                ..hideCurrentSnackBar()
                                ..showSnackBar(
                                  SnackBar(
                                    content: Text(
                                      '${eklenecek.length} tekrar kartı eklendi',
                                    ),
                                    duration: const Duration(seconds: 2),
                                  ),
                                );
                            },
                    ),
                  ),
                ),
                Expanded(
                  child: TabBarView(
                    children: [
                      for (final t in turler)
                        ListView(
                          key: ValueKey('ogeler-liste-${t.name}'),
                          padding: const EdgeInsets.all(Olcu.b1),
                          children: [
                            for (final o in ogeler.tureGore(t))
                              _OgeSatiri(
                                oge: o,
                                kartlarda: durum.kartlar.containsKey(o.kartId),
                                sesAcik: durum.sesAcik,
                              ),
                          ],
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _OgeSatiri extends ConsumerWidget {
  const _OgeSatiri({
    required this.oge,
    required this.kartlarda,
    required this.sesAcik,
  });
  final DersOgesi oge;
  final bool kartlarda;
  final bool sesAcik;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.only(left: Olcu.b2),
        child: Row(
          children: [
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: Olcu.b1),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      oge.metin,
                      style: yazi.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (oge.anlam != null)
                      Text(
                        oge.anlam!,
                        style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                      ),
                  ],
                ),
              ),
            ),
            if (oge.sesDili != null)
              IconButton(
                icon: const Icon(Icons.volume_up_outlined),
                tooltip: 'Oku',
                onPressed: sesAcik
                    ? () => ref
                          .read(sesProvider)
                          .oku(oge.metin, dil: oge.sesDili!)
                    : null,
              ),
            kartlarda
                ? IconButton(
                    icon: Icon(Icons.check_circle, color: r.dogru),
                    tooltip: 'Kartlarda',
                    onPressed: null,
                  )
                : IconButton(
                    icon: const Icon(Icons.add_card),
                    tooltip: 'Kartlara ekle',
                    onPressed: () async {
                      final mesajci = ScaffoldMessenger.of(context);
                      await ref
                          .read(durumProvider.notifier)
                          .kartEkle(oge.kartId);
                      mesajci
                        ..hideCurrentSnackBar()
                        ..showSnackBar(
                          const SnackBar(
                            content: Text('Tekrar kartı eklendi'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                    },
                  ),
          ],
        ),
      ),
    );
  }
}
