import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/basamak.dart';
import '../bilesenler/hedef_halkasi.dart';
import '../bilesenler/profil_karti.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../model/icerik.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

/// Yol sekmesi: kurs seçimi + "basamak" yolu + seri, hedef halkası, tekrar sayısı.
class AnaSayfa extends ConsumerWidget {
  const AnaSayfa({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final kurslar = ref.watch(kurslarProvider);
    final bugun = ref.watch(bugunProvider);
    final genis = MediaQuery.sizeOf(context).width >= Olcu.genisEkran;

    if (kurslar.isEmpty) {
      return const Center(child: Text('Henüz kurs yok.'));
    }
    final secilenId = ref.watch(secilenKursProvider);
    final kurs = kurslar.firstWhere(
      (k) => k.id == secilenId,
      orElse: () => kurslar.first,
    );

    final yol = _YolListesi(
      kurs: kurs,
      durum: durum,
      bugun: bugun,
      kurslar: kurslar,
    );

    return SafeArea(
      child: genis
          ? Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(flex: 3, child: yol),
                Expanded(
                  flex: 2,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.fromLTRB(
                      0,
                      Olcu.b3,
                      Olcu.b3,
                      Olcu.b3,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        ProfilKarti(durum: durum, bugun: bugun),
                        const SizedBox(height: Olcu.b2),
                        _GunlukKart(durum: durum, bugun: bugun),
                      ],
                    ),
                  ),
                ),
              ],
            )
          : yol,
    );
  }
}

class _GunlukKart extends StatelessWidget {
  const _GunlukKart({required this.durum, required this.bugun});
  final OgrenciDurumu durum;
  final String bugun;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b3),
        child: Row(
          children: [
            HedefHalkasi(
              xp: durum.gunlukXp[bugun] ?? 0,
              hedef: durum.gunlukHedef,
            ),
            const SizedBox(width: Olcu.b3),
            Expanded(
              child: Text(
                'Bugünkü hedefin ${durum.gunlukHedef} XP',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _YolListesi extends ConsumerWidget {
  const _YolListesi({
    required this.kurs,
    required this.durum,
    required this.bugun,
    required this.kurslar,
  });
  final Kurs kurs;
  final OgrenciDurumu durum;
  final String bugun;
  final List<Kurs> kurslar;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final genis = MediaQuery.sizeOf(context).width >= Olcu.genisEkran;
    final tekrar = Motor.tekrarBekleyen(durum, bugun).length;
    final bugunXp = durum.gunlukXp[bugun] ?? 0;

    // Sıradaki ders: kursta ilk tamamlanmamış ders.
    String? siradakiId;
    for (final d in kurs.tumDersler) {
      if ((durum.tamamlanan[d.id] ?? 0) == 0) {
        siradakiId = d.id;
        break;
      }
    }

    final ogeler = <Widget>[
      if (!genis)
        Row(
          children: [
            HedefHalkasi(xp: bugunXp, hedef: durum.gunlukHedef, boyut: 88),
            const SizedBox(width: Olcu.b2),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _Rozet(
                    simge: Icons.local_fire_department,
                    metin: '${Motor.gosterilenSeri(durum, bugun)} gün seri',
                    renk: r.vurgu,
                  ),
                  const SizedBox(height: Olcu.b1),
                  _Rozet(
                    simge: Icons.replay,
                    metin: '$tekrar kart tekrar bekliyor',
                    renk: r.ana,
                    onTap: () => context.go('/tekrar'),
                  ),
                ],
              ),
            ),
          ],
        )
      else
        Wrap(
          spacing: Olcu.b2,
          runSpacing: Olcu.b1,
          children: [
            _Rozet(
              simge: Icons.local_fire_department,
              metin: '${Motor.gosterilenSeri(durum, bugun)} gün seri',
              renk: r.vurgu,
            ),
            _Rozet(
              simge: Icons.replay,
              metin: '$tekrar kart tekrar bekliyor',
              renk: r.ana,
              onTap: () => context.go('/tekrar'),
            ),
          ],
        ),
      const SizedBox(height: Olcu.b3),
      Text('Kurs seç', style: yazi.titleMedium),
      const SizedBox(height: Olcu.b1),
      Wrap(
        spacing: Olcu.b1,
        runSpacing: Olcu.b1,
        children: [
          for (final k in kurslar)
            ChoiceChip(
              selected: k.id == kurs.id,
              showCheckmark: true,
              label: Text(k.ad),
              materialTapTargetSize: MaterialTapTargetSize.padded,
              onSelected: (_) =>
                  ref.read(secilenKursProvider.notifier).sec(k.id),
            ),
        ],
      ),
      const SizedBox(height: Olcu.b1),
      Text(
        kurs.aciklama,
        style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
      ),
      const SizedBox(height: Olcu.b3),
    ];

    var dersNo = 0;
    for (final unite in kurs.uniteler) {
      final biten = unite.dersler
          .where((d) => (durum.tamamlanan[d.id] ?? 0) > 0)
          .length;
      ogeler.add(
        Semantics(
          header: true,
          label: '${unite.ad}. $biten / ${unite.dersler.length} ders tamam.',
          excludeSemantics: true,
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: Olcu.b2,
              vertical: Olcu.b1,
            ),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: r.ana, width: 3)),
            ),
            child: Row(
              children: [
                Icon(Icons.flag, color: r.ana),
                const SizedBox(width: Olcu.b1),
                Expanded(child: Text(unite.ad, style: yazi.titleMedium)),
                Text(
                  '$biten/${unite.dersler.length}',
                  style: yazi.labelLarge?.copyWith(color: r.metinIkincil),
                ),
              ],
            ),
          ),
        ),
      );
      ogeler.add(const SizedBox(height: Olcu.b2));
      for (var i = 0; i < unite.dersler.length; i++) {
        final ders = unite.dersler[i];
        dersNo++;
        final kez = durum.tamamlanan[ders.id] ?? 0;
        final BasamakDurumu bd = kez > 0
            ? BasamakDurumu.tamam
            : (ders.id == siradakiId
                  ? BasamakDurumu.siradaki
                  : BasamakDurumu.kilitli);
        ogeler.add(
          Padding(
            padding: EdgeInsets.only(left: (i % 3) * Olcu.b2, bottom: Olcu.b2),
            child: Basamak(
              no: dersNo,
              ad: ders.ad,
              durum: bd,
              alistirmaSayisi: ders.alistirmalar.length,
              tekrarSayisi: kez,
              onTap: bd == BasamakDurumu.kilitli
                  ? () => ScaffoldMessenger.of(context)
                      ..hideCurrentSnackBar()
                      ..showSnackBar(
                        const SnackBar(
                          content: Row(
                            children: [
                              Icon(Icons.lock_outline),
                              SizedBox(width: Olcu.b1),
                              Expanded(
                                child: Text(
                                  'Bu dersi açmak için önce önceki dersi bitir.',
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                  : () => context.push('/ders/${Uri.encodeComponent(ders.id)}'),
            ),
          ),
        );
      }
      ogeler.add(const SizedBox(height: Olcu.b2));
    }
    if (siradakiId == null) {
      ogeler.add(
        Row(
          children: [
            Icon(Icons.emoji_events, color: r.vurgu),
            const SizedBox(width: Olcu.b1),
            Expanded(
              child: Text(
                'Bu kursun tüm derslerini bitirdin. Tebrikler!',
                style: yazi.titleMedium,
              ),
            ),
          ],
        ),
      );
    }

    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: Olcu.icerikGenislik),
        child: ListView(
          padding: const EdgeInsets.all(Olcu.b3),
          children: ogeler,
        ),
      ),
    );
  }
}

class _Rozet extends StatelessWidget {
  const _Rozet({
    required this.simge,
    required this.metin,
    required this.renk,
    this.onTap,
  });
  final IconData simge;
  final String metin;
  final Color renk;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    return Semantics(
      button: onTap != null,
      label: metin,
      excludeSemantics: true,
      onTap: onTap,
      child: Material(
        color: r.yuzey,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Olcu.kose),
          side: BorderSide(color: r.kenar),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(Olcu.kose),
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: Olcu.hedef),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: Olcu.b2),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(simge, color: renk),
                  const SizedBox(width: Olcu.b1),
                  Flexible(
                    child: Text(
                      metin,
                      style: Theme.of(context).textTheme.labelLarge,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
