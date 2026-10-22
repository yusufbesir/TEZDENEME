/// Başarımlar ekranı: ~20 rozet (seri, ders, XP, tekrar, yarışma, kurs,
/// sertifika...), kazanıldı/kilitli görünümü ve kilitli rozetlerde ilerleme
/// çubuğu. Kabuk dışı `/basarimlar` rotasıdır; Profil ve Görevler'den açılır.
/// Hesap motor/basarimlar.dart'tadır (saf işlev); ekran açılınca yeni
/// kazanılan rozetler kalıcı kayda yazılır. Renk tek başına bilgi taşımaz:
/// durum simge ve metinle de gösterilir.
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
import '../motor/basarimlar.dart';
import '../tema/tema.dart';

/// Rozet simge anahtarından simgeye eşleme.
IconData basarimSimgesi(String anahtar) => switch (anahtar) {
  'seri' => Icons.local_fire_department,
  'ders' => Icons.school_outlined,
  'xp' => Icons.bolt,
  'tekrar' => Icons.replay,
  'yarisma' => Icons.emoji_events,
  'kurs' => Icons.flag,
  'sertifika' => Icons.workspace_premium,
  'bilmece' => Icons.psychology_alt_outlined,
  'hikaye' => Icons.menu_book_outlined,
  'hedef' => Icons.track_changes,
  'altin' => Icons.star,
  _ => Icons.military_tech,
};

class BasarimlarEkrani extends ConsumerStatefulWidget {
  const BasarimlarEkrani({super.key});

  @override
  ConsumerState<BasarimlarEkrani> createState() => _BasarimlarDurumu();
}

class _BasarimlarDurumu extends ConsumerState<BasarimlarEkrani> {
  @override
  void initState() {
    super.initState();
    // Yeni kazanılan rozetleri kalıcı kayda yaz (yoksa hiçbir şey yazılmaz).
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      ref.read(durumProvider.notifier).rozetleriIsle(ref.read(kurslarProvider));
    });
  }

  @override
  Widget build(BuildContext context) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final liste = Basarimlar.hesapla(durum, ref.watch(kurslarProvider));
    final kazanilan = Basarimlar.kazanilanSayisi(liste);
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Başarımlar'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/profil'),
        ),
      ),
      body: SafeArea(
        child: SayfaGovdesi(
          child: ListView(
            padding: const EdgeInsets.all(Olcu.b2),
            children: [
              Semantics(
                label: '$kazanilan / ${liste.length} rozet kazanıldı',
                excludeSemantics: true,
                child: Card(
                  key: const ValueKey('basarim-ozet'),
                  child: Padding(
                    padding: const EdgeInsets.all(Olcu.b2),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          '$kazanilan/${liste.length} rozet',
                          style: yazi.titleLarge,
                        ),
                        const SizedBox(height: Olcu.b1),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: LinearProgressIndicator(
                            value: liste.isEmpty ? 0 : kazanilan / liste.length,
                            minHeight: 8,
                            color: r.vurgu,
                            backgroundColor: r.kenar,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: Olcu.b1),
              for (final b in liste) _RozetSatiri(basarim: b),
            ],
          ),
        ),
      ),
    );
  }
}

class _RozetSatiri extends StatelessWidget {
  const _RozetSatiri({required this.basarim});
  final Basarim basarim;

  @override
  Widget build(BuildContext context) {
    final b = basarim;
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final renk = b.kazanildi ? r.vurgu : r.metinIkincil;
    return Semantics(
      label:
          '${b.ad}. ${b.kazanildi ? 'Kazanıldı' : 'Kilitli, ${b.gosterilenIlerleme} / ${b.hedef}'}. ${b.aciklama}',
      excludeSemantics: true,
      child: Card(
        key: ValueKey('rozet-${b.id}'),
        child: Padding(
          padding: const EdgeInsets.all(Olcu.b2),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              CircleAvatar(
                backgroundColor: b.kazanildi ? r.vurgu : r.kenar,
                child: Icon(
                  b.kazanildi ? basarimSimgesi(b.simge) : Icons.lock_outline,
                  color: b.kazanildi ? r.anaUstu : r.metinIkincil,
                ),
              ),
              const SizedBox(width: Olcu.b2),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(b.ad, style: yazi.titleMedium),
                    Text(
                      b.aciklama,
                      style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
                    ),
                    if (!b.kazanildi) ...[
                      const SizedBox(height: Olcu.b1),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: LinearProgressIndicator(
                          value: b.oran,
                          minHeight: 6,
                          color: r.ana,
                          backgroundColor: r.kenar,
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              const SizedBox(width: Olcu.b1),
              Text(
                b.kazanildi
                    ? 'Kazanıldı'
                    : '${b.gosterilenIlerleme}/${b.hedef}',
                key: ValueKey('rozet-durum-${b.id}'),
                style: yazi.labelLarge?.copyWith(color: renk),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
