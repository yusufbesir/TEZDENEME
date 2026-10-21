/// Meydan okuma ve rekorlar (ÖZELLİK 49): aylık meydan okuma (ayın tek büyük
/// hedefi, varsayılan 30 ders; ilerleme çubuğu, kalan gün ve günlük gereken
/// ders, hedef seçimi), haftalık yan görev ve kişisel rekorlar (en uzun seri,
/// en çok XP, en uzun çalışma, en çok ders). Ödül/XP yoktur; ceza yoktur.
/// Alt düğme "Ay ve yıl özeti"ni açar (ÖZELLİK 51). Profil'deki satırdan
/// `push` ile açılır.
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
import '../motor/meydan.dart';
import '../motor/ozet.dart';
import '../tema/tema.dart';

/// "2026-10-19" -> "19 Ekim"; "2026-10" -> "Ekim 2026"; bozuksa aynı metin.
String _gunMetni(String? g) {
  if (g == null) return '';
  if (g.length == 7) return Ozet.baslik(g);
  if (!OgrenciDurumu.gunGecerli(g)) return g;
  final ay = Ozet.baslik(g.substring(0, 7)).split(' ').first;
  return '${int.parse(g.substring(8, 10))} $ay';
}

class MeydanEkrani extends ConsumerWidget {
  const MeydanEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final bugun = ref.watch(bugunProvider);
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final m = Meydan.aylik(durum, bugun);
    final gorev = Meydan.yanGorev(durum, bugun);
    final rekorlar = Meydan.rekorlar(durum);

    Widget baslik(String t) => Padding(
      padding: const EdgeInsets.only(top: Olcu.b3, bottom: Olcu.b1),
      child: Semantics(header: true, child: Text(t, style: yazi.titleMedium)),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Meydan okuma ve rekorlar'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/profil'),
        ),
      ),
      body: SafeArea(
        child: SayfaGovdesi(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(Olcu.b3),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                baslik('Aylık meydan okuma · ${Ozet.baslik(m.ay)}'),
                Card(
                  key: const ValueKey('meydan-aylik'),
                  child: Padding(
                    padding: const EdgeInsets.all(Olcu.b2),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${m.ilerleme} / ${m.hedef} ders',
                          key: const ValueKey('meydan-aylik-sayi'),
                          style: yazi.headlineSmall,
                        ),
                        const SizedBox(height: Olcu.b1),
                        Semantics(
                          label: 'Aylık hedef ilerlemesi',
                          value: '${m.ilerleme} / ${m.hedef}',
                          child: LinearProgressIndicator(
                            value: m.hedef == 0
                                ? 0
                                : (m.ilerleme / m.hedef).clamp(0.0, 1.0),
                            minHeight: 10,
                            borderRadius: BorderRadius.circular(5),
                          ),
                        ),
                        const SizedBox(height: Olcu.b1),
                        Text(
                          m.tamam
                              ? 'Tamamlandı. Bu ayın meydan okumasını bitirdin.'
                              : (m.gunlukGerekli > 0
                                    ? 'Ayın kalan ${m.kalanGun} gününde günde '
                                          '${m.gunlukGerekli} ders yeter.'
                                    : 'Ay bitti; hedefe ulaşılamadı.'),
                          key: const ValueKey('meydan-aylik-ozet'),
                          style: yazi.bodyMedium?.copyWith(
                            color: r.metinIkincil,
                          ),
                        ),
                        const SizedBox(height: Olcu.b2),
                        Text('Aylık hedef (ders)', style: yazi.labelLarge),
                        const SizedBox(height: Olcu.b1),
                        Wrap(
                          spacing: Olcu.b1,
                          runSpacing: Olcu.b1,
                          children: [
                            for (final h in {
                              ...Meydan.hedefSecenekleri,
                              durum.aylikHedefDers,
                            }.toList()..sort())
                              ChoiceChip(
                                key: ValueKey('meydan-hedef-$h'),
                                label: Text('$h'),
                                selected: durum.aylikHedefDers == h,
                                onSelected: (_) => ref
                                    .read(durumProvider.notifier)
                                    .aylikHedefAyarla(h),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                baslik('Haftalık yan görev'),
                Card(
                  key: const ValueKey('meydan-gorev'),
                  child: ListTile(
                    leading: Icon(
                      gorev.tamam ? Icons.check_circle : Icons.flag_outlined,
                      color: gorev.tamam ? r.dogru : r.ana,
                    ),
                    title: Text(gorev.baslik),
                    subtitle: Text(
                      gorev.tamam
                          ? 'Tamamlandı (${gorev.ilerleme}/${gorev.hedef})'
                          : '${gorev.ilerleme}/${gorev.hedef}',
                      key: const ValueKey('meydan-gorev-ilerleme'),
                    ),
                  ),
                ),
                baslik('Kişisel rekorlar'),
                if (rekorlar.isEmpty)
                  Text(
                    'Henüz rekor yok. İlk dersini bitirince burada görünür.',
                    key: const ValueKey('meydan-rekor-yok'),
                    style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                  )
                else
                  Card(
                    child: Column(
                      children: [
                        for (final k in rekorlar)
                          ListTile(
                            key: ValueKey('rekor-${k.kod}'),
                            leading: Icon(
                              Icons.emoji_events_outlined,
                              color: r.vurgu,
                            ),
                            title: Text(k.ad),
                            subtitle: k.gun == null
                                ? null
                                : Text(_gunMetni(k.gun)),
                            trailing: Text(k.metin, style: yazi.titleMedium),
                          ),
                      ],
                    ),
                  ),
                const SizedBox(height: Olcu.b3),
                OutlinedButton.icon(
                  key: const ValueKey('meydan-ozet-ac'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: () => context.push('/ozet'),
                  icon: const Icon(Icons.insights_outlined),
                  label: const Text('Ay ve yıl özeti'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
