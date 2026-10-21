/// Çok kurslu öğrenme yolu (ÖZELLİK 74, `/ogrenme-yolu`): yol -> seviye ->
/// kurs ağacı, her düzeyde yüzde ilerleme (OgrenmeYolu; mevcut kurs
/// verisinden türetilir). Kursa dokunmak Yol sekmesinde o kursu seçer.
/// Profil'den `push` ile açılır.
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
import '../motor/ogrenme_yolu.dart';
import '../tema/tema.dart';

class OgrenmeYoluEkrani extends ConsumerWidget {
  const OgrenmeYoluEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final kurslar = ref.watch(alanKurslariProvider);
    final yollar = OgrenmeYolu.uret(durum, kurslar);
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;

    Widget ilerleme(double oran) => LinearProgressIndicator(
      value: oran,
      minHeight: 6,
      borderRadius: BorderRadius.circular(3),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Öğrenme yolu'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/profil'),
        ),
      ),
      body: SafeArea(
        child: SayfaGovdesi(
          child: yollar.isEmpty
              ? const Center(child: Text('Bu alanda kurs yok.'))
              : ListView(
                  key: const ValueKey('yol-liste'),
                  padding: const EdgeInsets.all(Olcu.b2),
                  children: [
                    for (final y in yollar)
                      Card(
                        key: ValueKey('yol-${y.kimlik}'),
                        child: Padding(
                          padding: const EdgeInsets.all(Olcu.b2),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(y.ad, style: yazi.titleLarge),
                                  ),
                                  Text(
                                    '%${y.yuzde}',
                                    key: ValueKey('yol-yuzde-${y.kimlik}'),
                                    style: yazi.titleMedium?.copyWith(
                                      color: r.ana,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              ilerleme(y.toplam == 0 ? 0 : y.biten / y.toplam),
                              for (final s in y.seviyeler) ...[
                                const SizedBox(height: Olcu.b2),
                                Text(
                                  '${s.etiket} · %${s.yuzde}',
                                  key: ValueKey(
                                    'yol-seviye-${y.kimlik}-${s.sira}',
                                  ),
                                  style: yazi.titleSmall,
                                ),
                                for (final k in s.kurslar)
                                  ListTile(
                                    key: ValueKey('yol-kurs-${k.kurs.id}'),
                                    contentPadding: EdgeInsets.zero,
                                    minVerticalPadding: Olcu.b1,
                                    title: Text(
                                      k.kurs.ad,
                                      maxLines: 2,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    subtitle: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          '${k.biten}/${k.toplam} ders · %${k.yuzde}',
                                          key: ValueKey(
                                            'yol-kurs-yuzde-${k.kurs.id}',
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        ilerleme(k.oran),
                                      ],
                                    ),
                                    trailing: const Icon(Icons.chevron_right),
                                    onTap: () {
                                      ref
                                          .read(secilenKursProvider.notifier)
                                          .sec(k.kurs.id);
                                      context.go('/yol');
                                    },
                                  ),
                              ],
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
        ),
      ),
    );
  }
}
