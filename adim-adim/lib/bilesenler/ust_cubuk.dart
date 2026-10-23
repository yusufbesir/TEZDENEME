/// Ortak üst çubuk: alan simgesi ve adı, seri alevi, (isteğe bağlı) ek
/// eylemler ve günlük XP halkası. Yol, Pratik, Görevler ve Profil
/// sekmelerinin en üstünde görünür; Yarışma kendi düzenini korur.
/// Veriyi `durumProvider` ve `bugunProvider`dan okur. Alan adı bir başlık
/// (Semantics header) olarak işaretlenir. Dar yerde alan adı tek satıra
/// sığdırılır (kısalır), seri ve halka sabit kalır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../motor/motor.dart';
import '../tema/alan_renkleri.dart';
import '../tema/tema.dart';
import 'hedef_halkasi.dart';

class UstCubuk extends ConsumerWidget {
  const UstCubuk({super.key, this.halka = true, this.eylemler = const []});

  /// Günlük XP halkası gösterilsin mi? (Yol sekmesi geniş ekranda halkayı
  /// yan panelde gösterdiğinden orada false verir.)
  final bool halka;

  /// Seri alevinden sonra, halkadan önce gösterilen ek düğmeler.
  final List<Widget> eylemler;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final bugun = ref.watch(bugunProvider);
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final alanRengi = AlanRenkleri.renk(
      durum.alan,
      Theme.of(context).brightness,
    );
    final seri = Motor.gosterilenSeri(durum, bugun);
    return Row(
      key: const ValueKey('ust-cubuk'),
      children: [
        Icon(AlanRenkleri.simge(durum.alan), color: alanRengi),
        const SizedBox(width: Olcu.b1),
        Expanded(
          child: Semantics(
            header: true,
            child: Text(
              AlanRenkleri.ad(durum.alan),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: yazi.titleLarge?.copyWith(color: alanRengi),
            ),
          ),
        ),
        SeriAlevi(
          seri: seri,
          nabiz: durum.sonGun == bugun && seri > 0,
          renk: r.vurgu,
        ),
        ...eylemler,
        if (halka) ...[
          const SizedBox(width: Olcu.b2),
          HedefHalkasi(
            xp: durum.gunlukXp[bugun] ?? 0,
            hedef: durum.gunlukHedef,
            boyut: 56,
          ),
        ],
      ],
    );
  }
}

/// Seri göstergesi: sayı + alev; bugün çalışıldıysa alev bir kez nabız atar.
class SeriAlevi extends StatelessWidget {
  const SeriAlevi({
    super.key,
    required this.seri,
    required this.nabiz,
    required this.renk,
  });
  final int seri;
  final bool nabiz;
  final Color renk;

  @override
  Widget build(BuildContext context) {
    final alev = Icon(Icons.local_fire_department, color: renk);
    return Semantics(
      label: '$seri gün seri',
      excludeSemantics: true,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: Olcu.hedef),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('$seri', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(width: 4),
            if (nabiz)
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: 1),
                duration: Olcu.sure(context, 250),
                builder: (context, t, child) => Transform.scale(
                  scale: 1 + 0.15 * math.sin(math.pi * t),
                  child: child,
                ),
                child: alev,
              )
            else
              alev,
          ],
        ),
      ),
    );
  }
}
