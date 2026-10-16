/// Profil sekmesi: alan satırı, istatistikler, son 7 gün XP grafiği; Ayarlar
/// sağ üstteki dişliyle açılır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/profil_karti.dart';
import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../motor/motor.dart';
import '../tema/alan_renkleri.dart';
import '../tema/tema.dart';

const _gunAdlari = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

/// 'YYYY-MM-DD' gününden geriye `n` gün; (gün, kısa ad) döndürür.
({String gun, String ad}) _gunGeri(String bugun, int n) {
  final p = bugun.split('-').map(int.parse).toList();
  final d = DateTime.utc(p[0], p[1], p[2] - n);
  String iki(int v) => v.toString().padLeft(2, '0');
  return (
    gun: '${d.year.toString().padLeft(4, '0')}-${iki(d.month)}-${iki(d.day)}',
    ad: _gunAdlari[d.weekday - 1],
  );
}

class ProfilEkrani extends ConsumerWidget {
  const ProfilEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final bugun = ref.watch(bugunProvider);
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;

    final gunler = [for (var i = 6; i >= 0; i--) _gunGeri(bugun, i)];
    final degerler = [for (final g in gunler) durum.gunlukXp[g.gun] ?? 0];
    final enCok = degerler.fold<int>(0, (a, b) => a > b ? a : b);
    final bitenDers = durum.tamamlanan.values.where((v) => v > 0).length;

    return SafeArea(
      child: SayfaGovdesi(
        child: ListView(
          padding: const EdgeInsets.all(Olcu.b3),
          children: [
            Row(
              children: [
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text('Profil', style: yazi.headlineMedium),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.settings_outlined),
                  tooltip: 'Ayarlar',
                  constraints: const BoxConstraints(
                    minWidth: Olcu.hedef,
                    minHeight: Olcu.hedef,
                  ),
                  onPressed: () => context.push('/ayarlar'),
                ),
              ],
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: Icon(
                AlanRenkleri.simge(durum.alan),
                color: AlanRenkleri.renk(
                  durum.alan,
                  Theme.of(context).brightness,
                ),
              ),
              title: Text('Alan: ${AlanRenkleri.ad(durum.alan)}'),
              trailing: TextButton(
                onPressed: () => context.push('/alan-sec'),
                child: const Text('Değiştir'),
              ),
            ),
            const SizedBox(height: Olcu.b2),
            ProfilKarti(durum: durum, bugun: bugun),
            const SizedBox(height: Olcu.b2),
            Row(
              children: [
                Expanded(
                  child: _Istatistik(
                    simge: Icons.bolt,
                    etiket: 'Toplam XP',
                    deger: '${durum.xp}',
                  ),
                ),
                const SizedBox(width: Olcu.b2),
                Expanded(
                  child: _Istatistik(
                    simge: Icons.task_alt,
                    etiket: 'Biten ders',
                    deger: '$bitenDers',
                  ),
                ),
              ],
            ),
            const SizedBox(height: Olcu.b2),
            Row(
              children: [
                Expanded(
                  child: _Istatistik(
                    simge: Icons.local_fire_department,
                    etiket: 'Seri',
                    deger: '${Motor.gosterilenSeri(durum, bugun)} gün',
                  ),
                ),
                const SizedBox(width: Olcu.b2),
                Expanded(
                  child: _Istatistik(
                    simge: Icons.emoji_events_outlined,
                    etiket: 'En uzun seri',
                    deger: '${durum.enSeri} gün',
                  ),
                ),
              ],
            ),
            const SizedBox(height: Olcu.b3),
            Text('Son 7 gün (XP)', style: yazi.titleMedium),
            const SizedBox(height: Olcu.b2),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(Olcu.b2),
                child: SizedBox(
                  height: 160,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      for (var i = 0; i < gunler.length; i++)
                        Expanded(
                          child: _Cubuk(
                            ad: gunler[i].ad,
                            deger: degerler[i],
                            oran: enCok == 0 ? 0 : degerler[i] / enCok,
                            bugunMu: i == gunler.length - 1,
                            renk: r.ana,
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Istatistik extends StatelessWidget {
  const _Istatistik({
    required this.simge,
    required this.etiket,
    required this.deger,
  });
  final IconData simge;
  final String etiket;
  final String deger;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Semantics(
      label: '$etiket: $deger',
      excludeSemantics: true,
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(Olcu.b2),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(simge, color: r.vurgu),
              const SizedBox(height: Olcu.b1),
              Text(deger, style: yazi.titleLarge),
              Text(
                etiket,
                style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Cubuk extends StatelessWidget {
  const _Cubuk({
    required this.ad,
    required this.deger,
    required this.oran,
    required this.bugunMu,
    required this.renk,
  });
  final String ad;
  final int deger;
  final double oran;
  final bool bugunMu;
  final Color renk;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Semantics(
      label: '${bugunMu ? 'Bugün' : ad}: $deger XP',
      excludeSemantics: true,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          Text('$deger', style: yazi.labelMedium),
          const SizedBox(height: 4),
          Flexible(
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: oran),
              duration: Olcu.sure(context, 250),
              builder: (context, v, _) => Container(
                width: 24,
                height: 8 + 80 * v,
                decoration: BoxDecoration(
                  color: deger == 0 ? r.kenar : renk,
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            ad,
            style: yazi.labelSmall?.copyWith(
              color: bugunMu ? r.metin : r.metinIkincil,
              fontWeight: bugunMu ? FontWeight.w800 : FontWeight.w400,
              decoration: bugunMu ? TextDecoration.underline : null,
            ),
          ),
        ],
      ),
    );
  }
}
