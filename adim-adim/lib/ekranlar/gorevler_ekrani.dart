/// Görevler sekmesi: ortak üst çubuk, bu haftanın özeti (gün, ders, XP),
/// bugünün görevleri ve haftalık görevler (ilerleme çubuklu) ile Başarımlar
/// girişi. İlerleme mevcut durumdan hesaplanır (motor/gorevler.dart); tamamlanan
/// görevin sabit XP ödülü "Ödülü al" ile bir kez alınır. Rastgele ödül, reklam
/// ve ücret yoktur. Görev düğmesi ilgili sekmeye ya da ekrana götürür.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../bilesenler/ust_cubuk.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../motor/basarimlar.dart';
import '../motor/gorevler.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

class GorevlerEkrani extends ConsumerWidget {
  const GorevlerEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final bugun = ref.watch(bugunProvider);
    final bekleyen = ref.watch(bekleyenTekrarProvider);
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final gunluk = Gorevler.gunluk(durum, bugun, bekleyenTekrar: bekleyen);
    final haftalik = Gorevler.haftalik(durum, bugun);
    final rozetler = Basarimlar.hesapla(durum, ref.watch(kurslarProvider));
    final haftaGun = Motor.haftaGunSayisi(durum, bugun);
    final haftaXp = Gorevler.haftaXp(durum, bugun);

    return SafeArea(
      child: SayfaGovdesi(
        child: ListView(
          padding: const EdgeInsets.all(Olcu.b3),
          children: [
            const UstCubuk(),
            const SizedBox(height: Olcu.b2),
            Semantics(
              header: true,
              child: Text('Görevler', style: yazi.headlineMedium),
            ),
            const SizedBox(height: Olcu.b2),
            Card(
              key: const ValueKey('gorevler-hafta-ozeti'),
              child: ListTile(
                leading: Icon(Icons.calendar_month_outlined, color: r.ana),
                title: Text('Bu hafta $haftaGun/${durum.haftalikHedefGun} gün'),
                subtitle: Text('Haftalık XP: $haftaXp'),
              ),
            ),
            const SizedBox(height: Olcu.b3),
            _Baslik(
              metin: 'Bugünün görevleri',
              sayi: '${Gorevler.tamamSayisi(gunluk)}/${gunluk.length}',
            ),
            for (final g in gunluk) _GorevKarti(gorev: g, durum: durum),
            const SizedBox(height: Olcu.b3),
            _Baslik(
              metin: 'Haftalık görevler',
              sayi: '${Gorevler.tamamSayisi(haftalik)}/${haftalik.length}',
            ),
            for (final g in haftalik) _GorevKarti(gorev: g, durum: durum),
            const SizedBox(height: Olcu.b3),
            Card(
              child: ListTile(
                key: const ValueKey('gorevler-basarimlar'),
                leading: Icon(Icons.military_tech_outlined, color: r.vurgu),
                title: const Text('Başarımlar'),
                subtitle: Text(
                  '${Basarimlar.kazanilanSayisi(rozetler)}/${rozetler.length} rozet',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/basarimlar'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Baslik extends StatelessWidget {
  const _Baslik({required this.metin, required this.sayi});
  final String metin;
  final String sayi;

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    return Padding(
      padding: const EdgeInsets.only(bottom: Olcu.b1),
      child: Row(
        children: [
          Expanded(
            child: Semantics(
              header: true,
              child: Text(metin, style: yazi.titleLarge),
            ),
          ),
          Text(sayi, style: yazi.labelLarge?.copyWith(color: r.metinIkincil)),
        ],
      ),
    );
  }
}

/// Tek görev kartı: başlık, açıklama, ilerleme çubuğu, ödül ve eylem.
class _GorevKarti extends ConsumerWidget {
  const _GorevKarti({required this.gorev, required this.durum});
  final Gorev gorev;
  final OgrenciDurumu durum;

  void _git(BuildContext context, String rota) {
    // Sekmeye ait rotalar sekme değiştirir, diğerleri üste açılır.
    if (rota == '/yol') {
      context.go(rota);
    } else {
      context.push(rota);
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final g = gorev;
    final alindi = Gorevler.alindi(durum, g);
    final alinabilir = Gorevler.alinabilir(durum, g);
    final renk = g.tamam ? r.dogru : r.ana;
    return Card(
      key: ValueKey('gorev-${g.id}'),
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  g.tamam ? Icons.check_circle : Icons.radio_button_unchecked,
                  color: renk,
                ),
                const SizedBox(width: Olcu.b1),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(g.baslik, style: yazi.titleMedium),
                      Text(
                        g.ayrinti,
                        style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: Olcu.b1),
                Text(
                  '+${g.odulXp} XP',
                  style: yazi.labelLarge?.copyWith(color: r.vurgu),
                ),
              ],
            ),
            const SizedBox(height: Olcu.b1),
            Semantics(
              label: '${g.baslik}: ${g.gosterilenIlerleme} / ${g.hedef}',
              excludeSemantics: true,
              child: Row(
                children: [
                  Expanded(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        key: ValueKey('gorev-cubuk-${g.id}'),
                        value: g.oran,
                        minHeight: 8,
                        color: renk,
                        backgroundColor: r.kenar,
                      ),
                    ),
                  ),
                  const SizedBox(width: Olcu.b1),
                  Text(
                    '${g.gosterilenIlerleme}/${g.hedef}',
                    style: yazi.labelLarge,
                  ),
                ],
              ),
            ),
            if (alinabilir) ...[
              const SizedBox(height: Olcu.b1),
              Align(
                alignment: Alignment.centerRight,
                child: FilledButton.icon(
                  key: ValueKey('gorev-odul-${g.id}'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                  ),
                  icon: const Icon(Icons.card_giftcard),
                  label: const Text('Ödülü al'),
                  onPressed: () async {
                    final mesaj = ScaffoldMessenger.of(context);
                    await ref.read(durumProvider.notifier).gorevOdulAl(g);
                    mesaj.showSnackBar(
                      SnackBar(content: Text('+${g.odulXp} XP kazandın')),
                    );
                  },
                ),
              ),
            ] else if (alindi) ...[
              const SizedBox(height: Olcu.b1),
              Align(
                alignment: Alignment.centerRight,
                child: Text(
                  'Ödül alındı',
                  key: ValueKey('gorev-alindi-${g.id}'),
                  style: yazi.labelLarge?.copyWith(color: r.dogru),
                ),
              ),
            ] else if (g.rota != null) ...[
              const SizedBox(height: Olcu.b1),
              Align(
                alignment: Alignment.centerRight,
                child: OutlinedButton(
                  key: ValueKey('gorev-git-${g.id}'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                  ),
                  onPressed: () => _git(context, g.rota!),
                  child: const Text('Başla'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
