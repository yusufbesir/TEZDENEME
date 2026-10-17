// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// "Öğrenme günlüğü" bölümü: son 7 günün (bugün dahil) gün başına satırı
/// (tarih, ders/tekrar/yarışma sayısı, doğru/toplam, XP). Kayıt yoksa
/// "Henüz kayıt yok". "Tümü" düğmesi alt sayfada tüm günleri (en çok
/// [GunlukKayit.enCok] kayıt) listeler.
library;

import 'package:flutter/material.dart';

import '../model/durum.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

const _aylar = [
  'Oca',
  'Şub',
  'Mar',
  'Nis',
  'May',
  'Haz',
  'Tem',
  'Ağu',
  'Eyl',
  'Eki',
  'Kas',
  'Ara',
];

/// 'YYYY-MM-DD' -> '15 Eki'; geçersizse olduğu gibi.
String gunEtiketi(String gun) {
  if (!OgrenciDurumu.gunGecerli(gun)) return gun;
  final ay = int.parse(gun.substring(5, 7));
  final g = int.parse(gun.substring(8, 10));
  return '$g ${_aylar[ay - 1]}';
}

/// Bir günün tür sayılarını kısa metne çevirir: "2 ders, 1 tekrar, 1 yarışma".
/// Mikro dersler "ders" sayısına katılır.
String gunlukTurMetni(OgrenciDurumu d, String gun) {
  var ders = 0, tekrar = 0, yarisma = 0;
  for (final k in d.gunluk) {
    if (k.gun != gun) continue;
    switch (k.tur) {
      case GunlukKayit.turDers:
      case GunlukKayit.turMikro:
        ders++;
      case GunlukKayit.turTekrar:
        tekrar++;
      case GunlukKayit.turYarisma:
        yarisma++;
    }
  }
  final parcalar = <String>[
    if (ders > 0) '$ders ders',
    if (tekrar > 0) '$tekrar tekrar',
    if (yarisma > 0) '$yarisma yarışma',
  ];
  return parcalar.join(', ');
}

/// 'YYYY-MM-DD' gününden geriye `n` gün.
String _gunGeri(String bugun, int n) {
  final p = bugun.split('-').map(int.parse).toList();
  final d = DateTime.utc(p[0], p[1], p[2] - n);
  String iki(int v) => v.toString().padLeft(2, '0');
  return '${d.year.toString().padLeft(4, '0')}-${iki(d.month)}-${iki(d.day)}';
}

class OgrenmeGunlugu extends StatelessWidget {
  const OgrenmeGunlugu({super.key, required this.durum, required this.bugun});

  final OgrenciDurumu durum;
  final String bugun;

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final gunler = OgrenciDurumu.gunGecerli(bugun)
        ? [for (var i = 0; i < 7; i++) _gunGeri(bugun, i)]
        : const <String>[];
    final kayitli = [
      for (final g in gunler)
        if (Motor.gunlukOzeti(durum, g).dersler > 0) g,
    ];
    return Column(
      key: const ValueKey('ogrenme-gunlugu'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Semantics(
                header: true,
                child: Text('Öğrenme günlüğü', style: yazi.titleMedium),
              ),
            ),
            if (durum.gunluk.isNotEmpty)
              TextButton(
                key: const ValueKey('gunluk-tumu'),
                onPressed: () => _tumunuGoster(context),
                child: const Text('Tümü'),
              ),
          ],
        ),
        const SizedBox(height: Olcu.b1),
        if (kayitli.isEmpty)
          Text(
            'Henüz kayıt yok',
            style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          )
        else
          Card(
            child: Column(
              children: [
                for (final g in kayitli)
                  GunlukSatiri(durum: durum, gun: g, bugunMu: g == bugun),
              ],
            ),
          ),
      ],
    );
  }

  void _tumunuGoster(BuildContext context) {
    final gunler = Motor.gunlukGunleri(durum);
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (c) => SafeArea(
        child: SizedBox(
          height: MediaQuery.sizeOf(c).height * 0.8,
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: Olcu.b3),
                child: Semantics(
                  header: true,
                  child: Text(
                    'Öğrenme günlüğü (${durum.gunluk.length} kayıt)',
                    style: Theme.of(c).textTheme.titleLarge,
                  ),
                ),
              ),
              const SizedBox(height: Olcu.b1),
              Expanded(
                child: ListView.builder(
                  key: const ValueKey('gunluk-tam-liste'),
                  padding: const EdgeInsets.fromLTRB(
                    Olcu.b2,
                    0,
                    Olcu.b2,
                    Olcu.b3,
                  ),
                  itemCount: gunler.length,
                  itemBuilder: (c, i) => GunlukSatiri(
                    durum: durum,
                    gun: gunler[i],
                    bugunMu: gunler[i] == bugun,
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

/// Bir günün satırı: tarih, tür sayıları, doğru/toplam, XP. Dar ekranda ve
/// büyük metinde taşmaz: ayrıntı metni alt satıra sarar.
class GunlukSatiri extends StatelessWidget {
  const GunlukSatiri({
    super.key,
    required this.durum,
    required this.gun,
    this.bugunMu = false,
  });

  final OgrenciDurumu durum;
  final String gun;
  final bool bugunMu;

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final ozet = Motor.gunlukOzeti(durum, gun);
    final tarih = bugunMu ? 'Bugün' : gunEtiketi(gun);
    final turler = gunlukTurMetni(durum, gun);
    final ayrinti =
        '$turler · ${ozet.dogru}/${ozet.toplam} doğru · ${ozet.xp} XP';
    return Semantics(
      label: '$tarih: $ayrinti',
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: Olcu.b2,
          vertical: Olcu.b1,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              tarih,
              style: yazi.titleSmall?.copyWith(
                fontWeight: bugunMu ? FontWeight.w800 : FontWeight.w600,
              ),
            ),
            Text(
              ayrinti,
              style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
            ),
          ],
        ),
      ),
    );
  }
}
