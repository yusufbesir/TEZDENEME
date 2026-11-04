/// Kelime ağacı ekranı: öğrenilen kelimeler konuya (ünite) göre dallanır;
/// her dal öğrenildikçe tohumdan meyveli ağaca büyür. Aşama simgeye ek olarak
/// yazıyla da söylenir. Profil'deki "Kelime ağacı" satırından açılır. Yalnız
/// dil kurslarında.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../motor/kelime_agaci.dart';
import '../tema/tema.dart';

class KelimeAgaciEkrani extends ConsumerWidget {
  const KelimeAgaciEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final dallar = KelimeAgaci.uret(durum, ref.watch(alanKurslariProvider));
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kelime ağacı'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/profil'),
        ),
      ),
      body: SafeArea(
        child: SayfaGovdesi(
          child: dallar.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(Olcu.b3),
                    child: Text(
                      'Henüz dal yok. Dil dersleri bitirdikçe konuların '
                      'büyür.',
                      key: const ValueKey('kelime-agaci-bos'),
                      style: yazi.bodyLarge,
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              : ListView(
                  key: const ValueKey('kelime-agaci'),
                  padding: const EdgeInsets.all(Olcu.b3),
                  children: [
                    for (final dal in dallar)
                      Card(
                        child: ExpansionTile(
                          key: ValueKey('dal-${dal.uniteId}'),
                          leading: Text(
                            dal.asama.simge,
                            style: const TextStyle(fontSize: 28),
                          ),
                          title: Text(dal.uniteAdi),
                          subtitle: Text(
                            '${dal.asama.etiket}: '
                            '${dal.ogrenilen.length}/${dal.toplam} kelime',
                          ),
                          children: [
                            Padding(
                              padding: const EdgeInsets.fromLTRB(
                                Olcu.b3,
                                0,
                                Olcu.b3,
                                Olcu.b2,
                              ),
                              child: dal.ogrenilen.isEmpty
                                  ? Text(
                                      'Bu konunun dersini bitirince kelimeler '
                                      'burada görünür.',
                                      style: yazi.bodySmall?.copyWith(
                                        color: r.metinIkincil,
                                      ),
                                    )
                                  : Wrap(
                                      spacing: Olcu.b2,
                                      runSpacing: Olcu.b1,
                                      children: [
                                        for (final k in dal.ogrenilen)
                                          Chip(
                                            label: Text(
                                              '${k.metin} · ${k.anlam}',
                                            ),
                                          ),
                                      ],
                                    ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
        ),
      ),
    );
  }
}
