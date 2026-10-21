/// Kişisel öneriler (ÖZELLİK 73, `/oneri`): kural tabanlı "Bunu öneriyoruz
/// çünkü ..." kartları ve tahmini süre (Oneriler). Her kartta "Başla" ilgili
/// ekranı açar. Durumu değiştirmez; yapay zekâ yoktur. Profil'den `push` ile
/// açılır.
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
import '../motor/oneri.dart';
import '../tema/tema.dart';

IconData _simge(OneriTuru t) => switch (t) {
  OneriTuru.tekrar => Icons.replay,
  OneriTuru.zayifNokta => Icons.rule,
  OneriTuru.zayifUnite => Icons.psychology_outlined,
  OneriTuru.siradakiDers => Icons.play_circle_outline,
};

class OneriEkrani extends ConsumerWidget {
  const OneriEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final kurslar = ref.watch(alanKurslariProvider);
    final bugun = ref.watch(bugunProvider);
    final oneriler = Oneriler.uret(durum, kurslar, bugun);
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Sana öneri'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/profil'),
        ),
      ),
      body: SafeArea(
        child: SayfaGovdesi(
          child: oneriler.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(Olcu.b3),
                    child: Text(
                      'Şimdilik öneri yok: bekleyen tekrarın ve zayıf noktan '
                      'görünmüyor. İstersen yoldan yeni bir ders başlat.',
                      key: const ValueKey('oneri-bos'),
                      textAlign: TextAlign.center,
                      style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                    ),
                  ),
                )
              : ListView(
                  key: const ValueKey('oneri-liste'),
                  padding: const EdgeInsets.all(Olcu.b2),
                  children: [
                    for (final o in oneriler)
                      Card(
                        key: ValueKey('oneri-${o.tur.name}'),
                        child: Padding(
                          padding: const EdgeInsets.all(Olcu.b2),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Icon(_simge(o.tur), color: r.ana),
                                  const SizedBox(width: Olcu.b1),
                                  Expanded(
                                    child: Text(
                                      o.baslik,
                                      style: yazi.titleMedium,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: Olcu.b1),
                              Text(
                                o.gerekce,
                                style: yazi.bodyMedium?.copyWith(
                                  color: r.metinIkincil,
                                ),
                              ),
                              const SizedBox(height: Olcu.b1),
                              Row(
                                children: [
                                  Expanded(
                                    child: Text(
                                      '~${o.dakika} dk',
                                      key: ValueKey('oneri-sure-${o.tur.name}'),
                                      style: yazi.labelLarge,
                                    ),
                                  ),
                                  FilledButton(
                                    key: ValueKey('oneri-basla-${o.tur.name}'),
                                    style: FilledButton.styleFrom(
                                      minimumSize: const Size(48, 48),
                                    ),
                                    onPressed: () => o.tur == OneriTuru.tekrar
                                        ? context.go(o.rota)
                                        : context.push(o.rota),
                                    child: const Text('Başla'),
                                  ),
                                ],
                              ),
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
