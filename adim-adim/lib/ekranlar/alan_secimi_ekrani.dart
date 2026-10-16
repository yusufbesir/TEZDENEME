/// Alan seçimi: tam ekran, iki büyük kart (İngilizce / Programlama).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Seçim `alanSec` ile saklanır ve yola gidilir; diğer alanın ilerlemesi
/// silinmez (docs/SADE-ARAYUZ-VE-YARISMA.md bölüm 4).
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../tema/alan_renkleri.dart';
import '../tema/tema.dart';

class AlanSecimiEkrani extends ConsumerWidget {
  const AlanSecimiEkrani({super.key});

  Future<void> _sec(BuildContext context, WidgetRef ref, String alan) async {
    await ref.read(durumProvider.notifier).alanSec(alan);
    if (context.mounted) context.go('/yol');
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final yazi = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: SayfaGovdesi(
          child: ListView(
            padding: const EdgeInsets.all(Olcu.b3),
            children: [
              const SizedBox(height: Olcu.b4),
              Semantics(
                header: true,
                child: Text(
                  'Ne öğrenmek istiyorsun?',
                  style: yazi.headlineMedium,
                ),
              ),
              const SizedBox(height: Olcu.b3),
              _AlanKarti(
                alan: 'dil',
                baslik: 'İngilizce',
                altMetin: 'Kelime, cümle ve dinleme',
                onTap: () => _sec(context, ref, 'dil'),
              ),
              const SizedBox(height: Olcu.b2),
              _AlanKarti(
                alan: 'kod',
                baslik: 'Programlama',
                altMetin: 'HTML, CSS ve JavaScript',
                onTap: () => _sec(context, ref, 'kod'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _AlanKarti extends StatelessWidget {
  const _AlanKarti({
    required this.alan,
    required this.baslik,
    required this.altMetin,
    required this.onTap,
  });
  final String alan;
  final String baslik;
  final String altMetin;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final vurgu = AlanRenkleri.renk(alan, Theme.of(context).brightness);
    return Semantics(
      button: true,
      label: '$baslik. $altMetin',
      excludeSemantics: true,
      onTap: onTap,
      child: Material(
        color: r.yuzey,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Olcu.kose),
          side: BorderSide(color: vurgu, width: 2),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(Olcu.kose),
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 120),
            child: Padding(
              padding: const EdgeInsets.all(Olcu.b3),
              child: Row(
                children: [
                  Icon(AlanRenkleri.simge(alan), size: 48, color: vurgu),
                  const SizedBox(width: Olcu.b3),
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(baslik, style: yazi.titleLarge),
                        const SizedBox(height: 4),
                        Text(
                          altMetin,
                          style: yazi.bodyMedium?.copyWith(
                            color: r.metinIkincil,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right, color: r.metinIkincil),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
