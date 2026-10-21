/// Kelime sağlığı panosu: seçili alanın tüm kartlarını yarı ömre göre üç
/// kümede gösterir (Zayıf / Orta / Güçlü). Her küme: sayı, tek yatay yığılı
/// çubukta renkli pay ve dokununca o kümenin kartlarını listeleyen alt sayfa.
/// Eşikler [Kart.ortaEsik] ve [Kart.gucluEsik]; kümeleme [Motor.kelimeSagligi].
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';

import '../model/durum.dart';
import '../model/icerik.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

/// Tekrar sekmesinin üstünde duran küçük pano.
class KelimeSagligiPanosu extends StatelessWidget {
  const KelimeSagligiPanosu({
    super.key,
    required this.durum,
    required this.kurslar,
  });

  final OgrenciDurumu durum;
  final List<Kurs> kurslar;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final saglik = Motor.kelimeSagligi(durum, kurslar);
    final kumeler = <_Kume>[
      _Kume(
        ad: 'Zayıf',
        aciklama: 'Yarı ömrü ${_gun(Kart.ortaEsik)} günden az',
        kartlar: saglik.zayif,
        renk: r.hata,
        simge: Icons.trending_down,
      ),
      _Kume(
        ad: 'Orta',
        aciklama:
            'Yarı ömrü ${_gun(Kart.ortaEsik)}–${_gun(Kart.gucluEsik)} gün',
        kartlar: saglik.orta,
        renk: r.vurgu,
        simge: Icons.trending_flat,
      ),
      _Kume(
        ad: 'Güçlü',
        aciklama: 'Yarı ömrü ${_gun(Kart.gucluEsik)} günden çok',
        kartlar: saglik.guclu,
        renk: r.dogru,
        simge: Icons.trending_up,
      ),
    ];
    final toplam = kumeler.fold<int>(0, (t, k) => t + k.kartlar.length);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          header: true,
          child: Text('Kelime sağlığı', style: yazi.titleLarge),
        ),
        const SizedBox(height: Olcu.b1),
        if (toplam == 0)
          Text(
            'Henüz kart yok',
            style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          )
        else ...[
          // Tek yatay yığılı çubuk; sıfır paylı küme çizilmez.
          Semantics(
            label: [
              for (final k in kumeler) '${k.ad} ${k.kartlar.length}',
            ].join(', '),
            excludeSemantics: true,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(Olcu.b1),
              child: SizedBox(
                height: 12,
                child: Row(
                  children: [
                    for (final k in kumeler)
                      if (k.kartlar.isNotEmpty)
                        Expanded(
                          flex: k.kartlar.length,
                          child: ColoredBox(color: k.renk),
                        ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: Olcu.b1),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              for (final k in kumeler)
                Expanded(
                  child: _KumeDugmesi(
                    kume: k,
                    onTap: () => _listeAc(context, k),
                  ),
                ),
            ],
          ),
        ],
      ],
    );
  }

  static String _gun(double g) =>
      g == g.roundToDouble() ? g.round().toString() : g.toString();

  void _listeAc(BuildContext context, _Kume kume) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      useSafeArea: true,
      builder: (_) => _KumeListesi(kume: kume, durum: durum, kurslar: kurslar),
    );
  }
}

class _Kume {
  const _Kume({
    required this.ad,
    required this.aciklama,
    required this.kartlar,
    required this.renk,
    required this.simge,
  });
  final String ad;
  final String aciklama;
  final List<String> kartlar;
  final Color renk;
  final IconData simge;
}

/// Sayı + küme adı; renk tek başına bilgi taşımaz, simge de gösterilir.
class _KumeDugmesi extends StatelessWidget {
  const _KumeDugmesi({required this.kume, required this.onTap});
  final _Kume kume;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final n = kume.kartlar.length;
    return Semantics(
      button: true,
      label: '${kume.ad}: $n kart. ${kume.aciklama}',
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(Olcu.b1),
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: Olcu.hedef),
          child: Padding(
            padding: const EdgeInsets.symmetric(
              horizontal: Olcu.b1,
              vertical: Olcu.b1,
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(kume.simge, size: 18, color: kume.renk),
                    const SizedBox(width: 4),
                    Text(
                      kisaSayi(n),
                      style: yazi.titleMedium?.copyWith(color: kume.renk),
                    ),
                  ],
                ),
                Text(
                  kume.ad,
                  textAlign: TextAlign.center,
                  style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Alt sayfa: kümenin kartları; her satırda kısaltılmış soru, kutu ve
/// sonraki tekrar günü.
class _KumeListesi extends StatelessWidget {
  const _KumeListesi({
    required this.kume,
    required this.durum,
    required this.kurslar,
  });
  final _Kume kume;
  final OgrenciDurumu durum;
  final List<Kurs> kurslar;

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final satirlar = <({String soru, Kart kart})>[];
    for (final id in kume.kartlar) {
      final a = Motor.kartCoz(kurslar, id);
      final k = durum.kartlar[id];
      if (a != null && k != null) satirlar.add((soru: a.soru, kart: k));
    }
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: Olcu.b3),
          child: Row(
            children: [
              Icon(kume.simge, color: kume.renk),
              const SizedBox(width: Olcu.b1),
              Expanded(
                child: Semantics(
                  header: true,
                  child: Text(
                    '${kume.ad} · ${satirlar.length} kart',
                    style: yazi.titleLarge,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(Olcu.b3, 0, Olcu.b3, Olcu.b1),
          child: Text(
            kume.aciklama,
            style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
          ),
        ),
        if (satirlar.isEmpty)
          Padding(
            padding: const EdgeInsets.all(Olcu.b3),
            child: Text(
              'Bu kümede kart yok.',
              style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
            ),
          )
        else
          Flexible(
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: satirlar.length,
              itemBuilder: (context, i) {
                final s = satirlar[i];
                return ListTile(
                  leading: Icon(Icons.style_outlined, color: kume.renk),
                  title: Text(
                    s.soru,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  subtitle: Text(
                    'Kutu ${s.kart.kutu} · Sonraki ${s.kart.sonraki}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
}
