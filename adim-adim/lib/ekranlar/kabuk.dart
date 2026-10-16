/// Gezinme kabuğu: 4 sekme (Yol, Yarışma, Tekrar, Profil); Tekrar'da rozet.
/// Düzen pencere genişliğine göre seçilir (LayoutBuilder): dar < 600 alt
/// çubuk, orta 600–899 daraltılmış rail, geniş >= 900 genişletilmiş rail.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../durum/saglayicilar.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

const _hedefler = <({String ad, IconData simge, IconData secili})>[
  (ad: 'Yol', simge: Icons.route_outlined, secili: Icons.route),
  (
    ad: 'Yarışma',
    simge: Icons.emoji_events_outlined,
    secili: Icons.emoji_events,
  ),
  (ad: 'Tekrar', simge: Icons.replay_outlined, secili: Icons.replay),
  (ad: 'Profil', simge: Icons.person_outline, secili: Icons.person),
];

/// Gezinme kabuğu: dar pencerede alt çubuk, orta/geniş pencerede yan ray.
class Kabuk extends ConsumerWidget {
  const Kabuk({super.key, required this.kabuk});
  final StatefulNavigationShell kabuk;

  static const _tekrarIndeksi = 2;

  /// Tekrar sekmesi simgesi: bekleyen kart varsa sayı rozetiyle sarılır.
  Widget _simge(IconData simge, int i, int bekleyen) {
    final ikon = Icon(simge);
    if (i != _tekrarIndeksi || bekleyen <= 0) return ikon;
    return Badge(label: Text('$bekleyen'), child: ikon);
  }

  void _git(int i) =>
      kabuk.goBranch(i, initialLocation: i == kabuk.currentIndex);

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Kayıt hatası başlayınca bir kez uyarır; hata geçince temizlenir.
    ref.listen<String?>(kayitHatasiProvider, (onceki, simdi) {
      if (simdi != null && onceki == null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'İlerleme kaydedilemedi. Depolama alanını kontrol et.',
            ),
          ),
        );
      }
    });
    final durum = ref.watch(durumProvider).value;
    final alanKurslari = ref.watch(alanKurslariProvider);
    final bugun = ref.watch(bugunProvider);
    // Yalnızca seçili alanın kurslarındaki kartlar sayılır.
    final bekleyen = durum == null
        ? 0
        : Motor.tekrarBekleyen(
            durum,
            bugun,
          ).where((id) => Motor.kartCoz(alanKurslari, id) != null).length;
    return LayoutBuilder(
      builder: (context, kisit) {
        final genislik = kisit.maxWidth;
        if (Olcu.dar(genislik)) {
          return Scaffold(
            body: kabuk,
            bottomNavigationBar: NavigationBar(
              selectedIndex: kabuk.currentIndex,
              onDestinationSelected: _git,
              destinations: [
                for (var i = 0; i < _hedefler.length; i++)
                  NavigationDestination(
                    icon: _simge(_hedefler[i].simge, i, bekleyen),
                    selectedIcon: _simge(_hedefler[i].secili, i, bekleyen),
                    label: _hedefler[i].ad,
                  ),
              ],
            ),
          );
        }
        final genis = Olcu.genis(genislik);
        return Scaffold(
          body: Row(
            children: [
              NavigationRail(
                extended: genis,
                minExtendedWidth: Olcu.railGenis,
                labelType: genis
                    ? NavigationRailLabelType.none
                    : NavigationRailLabelType.all,
                selectedIndex: kabuk.currentIndex,
                onDestinationSelected: _git,
                destinations: [
                  for (var i = 0; i < _hedefler.length; i++)
                    NavigationRailDestination(
                      icon: _simge(_hedefler[i].simge, i, bekleyen),
                      selectedIcon: _simge(_hedefler[i].secili, i, bekleyen),
                      label: Text(_hedefler[i].ad),
                    ),
                ],
              ),
              const VerticalDivider(width: 1),
              Expanded(child: kabuk),
            ],
          ),
        );
      },
    );
  }
}
