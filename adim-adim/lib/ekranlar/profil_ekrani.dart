/// Profil sekmesi: alan satırı, istatistikler, son 7 gün XP grafiği ve
/// "Öğrenme günlüğü" bölümü (son 7 gün, "Tümü" ile tam liste); Ayarlar
/// sağ üstteki dişliyle açılır.
/// Grafik yüksekliği metin ölçeğiyle büyür; gün etiketleri tek satırdır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/donem_dersleri.dart';
import '../bilesenler/geri_kazanma_satiri.dart';
import '../bilesenler/ogrenme_gunlugu.dart';
import '../bilesenler/profil_karti.dart';
import '../bilesenler/sayfa_govdesi.dart';
import '../bilesenler/ust_cubuk.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../motor/basarimlar.dart';
import '../motor/kelime_bulutu.dart';
import '../motor/meydan.dart';
import '../motor/motor.dart';
import '../motor/oneri.dart';
import '../motor/sure.dart';
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
    final kurslar = ref.watch(alanKurslariProvider);
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;

    final gunler = [for (var i = 6; i >= 0; i--) _gunGeri(bugun, i)];
    final degerler = [for (final g in gunler) durum.gunlukXp[g.gun] ?? 0];
    final enCok = degerler.fold<int>(0, (a, b) => a > b ? a : b);
    final bitenDers = durum.tamamlanan.values.where((v) => v > 0).length;
    final meydan = Meydan.aylik(durum, bugun);
    final oneriler = Oneriler.uret(durum, kurslar, bugun, enCok: 1);
    final ogrenilenKelime = durum.alan == 'dil'
        ? KelimeBulutu.ogrenilenSayisi(durum, kurslar)
        : 0;
    final rozetler = Basarimlar.hesapla(durum, ref.watch(kurslarProvider));

    return SafeArea(
      child: SayfaGovdesi(
        child: ListView(
          padding: const EdgeInsets.all(Olcu.b3),
          children: [
            const UstCubuk(),
            const SizedBox(height: Olcu.b1),
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
            ListTile(
              key: const ValueKey('profil-basarimlar'),
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.military_tech_outlined, color: r.ana),
              title: const Text('Başarımlar'),
              subtitle: Text(
                '${Basarimlar.kazanilanSayisi(rozetler)}/${rozetler.length} rozet',
                key: const ValueKey('profil-basarim-ozet'),
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/basarimlar'),
            ),
            ListTile(
              key: const ValueKey('profil-pratik-merkezi'),
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.fitness_center, color: r.ana),
              title: const Text('Pratik merkezi'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.go('/pratik'),
            ),
            // Meydan okuma (49, 51) ve süre takibi (59, 80) satırları.
            ListTile(
              key: const ValueKey('profil-meydan'),
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.flag_outlined, color: r.ana),
              title: const Text('Meydan okuma ve rekorlar'),
              subtitle: Text(
                'Bu ay ${meydan.ilerleme}/${meydan.hedef} ders',
                key: const ValueKey('profil-meydan-ozet'),
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/meydan'),
            ),
            ListTile(
              key: const ValueKey('profil-sure'),
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.timer_outlined, color: r.ana),
              title: const Text('Süre takibi'),
              subtitle: Text(
                Sure.bugunMetni(durum, bugun),
                key: const ValueKey('profil-sure-ozet'),
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/sure'),
            ),
            ListTile(
              key: const ValueKey('profil-oneri'),
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.tips_and_updates_outlined, color: r.ana),
              title: const Text('Sana öneri'),
              subtitle: Text(
                oneriler.isEmpty ? 'Şimdilik öneri yok' : oneriler.first.baslik,
                key: const ValueKey('profil-oneri-ozet'),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/oneri'),
            ),
            ListTile(
              key: const ValueKey('profil-ogrenme-yolu'),
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.alt_route, color: r.ana),
              title: const Text('Öğrenme yolu'),
              subtitle: Text(
                'Yol, seviye ve kurs ilerlemen',
                key: const ValueKey('profil-yol-ozet'),
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/ogrenme-yolu'),
            ),
            ListTile(
              key: const ValueKey('profil-yer-imleri'),
              contentPadding: EdgeInsets.zero,
              leading: Icon(Icons.bookmarks_outlined, color: r.ana),
              title: const Text('Yer imleri'),
              subtitle: Text(
                durum.yerImleri.isEmpty
                    ? 'Adımları ve sözlük maddelerini kaydet'
                    : '${durum.yerImleri.length} yer imi',
                key: const ValueKey('profil-yer-imi-ozet'),
              ),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => context.push('/yer-imleri'),
            ),
            if (durum.alan == 'dil')
              ListTile(
                key: const ValueKey('profil-kelime-bulutu'),
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.cloud_outlined, color: r.ana),
                title: const Text('Kelime bulutu'),
                subtitle: Text(
                  '$ogrenilenKelime kelime öğrendin',
                  key: const ValueKey('profil-kelime-sayisi'),
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/kelime-bulutu'),
              ),
            if (durum.alan == 'dil')
              ListTile(
                key: const ValueKey('profil-kelime-agaci'),
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.park_outlined, color: r.ana),
                title: const Text('Kelime ağacı'),
                subtitle: const Text('Konulara göre büyüyen dalların'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => context.push('/kelime-agaci'),
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
            GeriKazanmaSatiri(durum: durum, bugun: bugun),
            if (Motor.donemDersiVar(durum, kurslar)) ...[
              const SizedBox(height: Olcu.b3),
              Text('Günün, haftanın, ayın dersi', style: yazi.titleMedium),
              const SizedBox(height: Olcu.b1),
              DonemDersleri(durum: durum, kurslar: kurslar, bugun: bugun),
            ],
            const SizedBox(height: Olcu.b3),
            Text('Son 7 gün (XP)', style: yazi.titleMedium),
            const SizedBox(height: Olcu.b2),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(Olcu.b2),
                child: SizedBox(
                  // Etiketler büyüyünce grafik de uzar (kesilmez).
                  height:
                      160 +
                      60 * (MediaQuery.textScalerOf(context).scale(1) - 1),
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
            const SizedBox(height: Olcu.b3),
            OgrenmeGunlugu(durum: durum, bugun: bugun),
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
          LayoutBuilder(
            builder: (context, k) {
              // Küçültme yok: labelMedium (12), sonra labelSmall (11), sonra "1,2k".
              final sigan = siganMetin(
                context,
                adaylar: ['$deger', kisaSayi(deger)],
                stiller: [yazi.labelMedium!, yazi.labelSmall!],
                genislik: k.maxWidth,
              );
              return Text(
                sigan.metin,
                maxLines: 1,
                softWrap: false,
                overflow: TextOverflow.ellipsis,
                style: sigan.stil,
              );
            },
          ),
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
            maxLines: 1,
            softWrap: false,
            overflow: TextOverflow.ellipsis,
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
