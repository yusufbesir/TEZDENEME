import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../tema/tema.dart';

const _hedefler = <({String ad, IconData simge, IconData secili})>[
  (ad: 'Yol', simge: Icons.route_outlined, secili: Icons.route),
  (ad: 'Tekrar', simge: Icons.replay_outlined, secili: Icons.replay),
  (ad: 'Profil', simge: Icons.person_outline, secili: Icons.person),
  (ad: 'Ayarlar', simge: Icons.settings_outlined, secili: Icons.settings),
];

/// Gezinme kabuğu: mobilde alt çubuk, genişlikte (>= 900) yan ray.
class Kabuk extends StatelessWidget {
  const Kabuk({super.key, required this.kabuk});
  final StatefulNavigationShell kabuk;

  void _git(int i) => kabuk.goBranch(i, initialLocation: i == kabuk.currentIndex);

  @override
  Widget build(BuildContext context) {
    final genis = MediaQuery.sizeOf(context).width >= Olcu.genisEkran;
    if (genis) {
      return Scaffold(
        body: Row(
          children: [
            NavigationRail(
              extended: true,
              minExtendedWidth: 180,
              selectedIndex: kabuk.currentIndex,
              onDestinationSelected: _git,
              destinations: [
                for (final h in _hedefler)
                  NavigationRailDestination(
                    icon: Icon(h.simge),
                    selectedIcon: Icon(h.secili),
                    label: Text(h.ad),
                  ),
              ],
            ),
            const VerticalDivider(width: 1),
            Expanded(child: kabuk),
          ],
        ),
      );
    }
    return Scaffold(
      body: kabuk,
      bottomNavigationBar: NavigationBar(
        selectedIndex: kabuk.currentIndex,
        onDestinationSelected: _git,
        destinations: [
          for (final h in _hedefler)
            NavigationDestination(
              icon: Icon(h.simge),
              selectedIcon: Icon(h.secili),
              label: h.ad,
            ),
        ],
      ),
    );
  }
}
