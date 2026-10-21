/// Oyun sonu antrenörü (ÖZELLİK 53): temalara ayrılmış oyun sonu konumları.
/// "Pratik": serbestçe, geri alarak mat etmeyi dene. "Meydan okuma": en az
/// hamlede mat et; yıldız, rakibin en iyi savunmasına karşı gereken en az
/// hamleye göre verilir. Rakip, çevrimdışı derinlik-2 aramadır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../durum/saglayicilar.dart';
import '../../model/durum.dart';
import '../../motor/satranc_calisma.dart';
import '../../satranc/oyun.dart';
import '../../satranc/veri.dart';
import '../../tema/tema.dart';
import 'bilgisayar_oyunu.dart';
import 'ortak.dart';

String _yildizMetni(int n) => '★' * n + '☆' * (3 - n);

/// Konum listesi (gruplu).
class OyunSonuListesiEkrani extends ConsumerWidget {
  const OyunSonuListesiEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final s = durum.satranc;
    return satrancIskele(
      context,
      'Oyun sonu antrenörü',
      ListView(
        padding: const EdgeInsets.all(Olcu.b2),
        children: [
          Text(
            'Pratik: serbestçe dene, geri al. Meydan okuma: en az hamlede mat et.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: context.renkler.metinIkincil,
            ),
          ),
          for (final g in SatrancVeri.oyunSonuGruplari) ...[
            satrancBolum(context, g),
            for (final k in SatrancVeri.oyunSonlari.where((k) => k.grup == g))
              satrancKart(
                context,
                anahtar: ValueKey('oyunsonu-${k.id}'),
                simge: Icons.flag_outlined,
                baslik: k.ad,
                ayrinti: [
                  'En az ${k.enAz} hamlede mat',
                  if (s.oyunSonuPratik.contains(k.id)) 'pratik yapıldı',
                  if (s.oyunSonuEnIyi[k.id] case final e?)
                    'en iyi: $e hamle ${_yildizMetni(SatrancCalisma.yildiz(k.enAz, e))}',
                ].join(' · '),
                onTap: () => context.push('/satranc/oyunsonu/${k.id}'),
              ),
          ],
        ],
      ),
    );
  }
}

/// Tek konum: pratik ya da meydan okuma.
class OyunSonuEkrani extends ConsumerStatefulWidget {
  const OyunSonuEkrani({super.key, required this.konumId});
  final String konumId;

  @override
  ConsumerState<OyunSonuEkrani> createState() => _OyunSonuDurumu();
}

class _OyunSonuDurumu extends ConsumerState<OyunSonuEkrani> {
  bool _meydan = false;
  int _oyunNo = 0;
  ({String sonuc, String neden, int hamle})? _bitis;

  void _bitti(OyunSonuKonumu k, MacDurumu mac, String sonuc, String neden) {
    final hamle = mac.kullaniciHamleSayisi;
    final n = ref.read(durumProvider.notifier);
    if (sonuc == MacDurumu.kazandi) {
      if (_meydan) {
        n.satrancOyunSonuMeydan(k.id, hamle);
      } else {
        n.satrancOyunSonuPratik(k.id);
      }
    }
    setState(() => _bitis = (sonuc: sonuc, neden: neden, hamle: hamle));
  }

  @override
  Widget build(BuildContext context) {
    final k = SatrancVeri.oyunSonuBul(widget.konumId);
    if (k == null) {
      return satrancIskele(
        context,
        'Oyun sonu',
        satrancBosMesaj(context, 'Bu konum bulunamadı.'),
      );
    }
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final bitis = _bitis;
    final kazandi = bitis?.sonuc == MacDurumu.kazandi;
    final eski = durum.satranc.oyunSonuEnIyi[k.id];
    return satrancIskele(
      context,
      k.ad,
      SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SegmentedButton<bool>(
              key: const Key('oyunsonu-mod'),
              segments: const [
                ButtonSegment(
                  value: false,
                  icon: Icon(Icons.school_outlined),
                  label: Text('Pratik'),
                ),
                ButtonSegment(
                  value: true,
                  icon: Icon(Icons.emoji_events_outlined),
                  label: Text('Meydan okuma'),
                ),
              ],
              selected: {_meydan},
              onSelectionChanged: (s) => setState(() {
                _meydan = s.first;
                _oyunNo++;
                _bitis = null;
              }),
            ),
            const SizedBox(height: Olcu.b1),
            Text(
              _meydan
                  ? 'Hedef: ${k.enAz} hamlede mat (rakibin en iyi savunmasına '
                        'karşı en az). Daha çok hamlede de olur; yıldızlar '
                        'hamle sayına göre.'
                  : 'Hedef: mat et. İstediğin kadar dene, geri al.',
              key: const Key('oyunsonu-hedef'),
              style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
            ),
            if (eski != null)
              Text(
                'En iyi: $eski hamle ${_yildizMetni(SatrancCalisma.yildiz(k.enAz, eski))}',
                key: const Key('oyunsonu-en-iyi'),
                style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
              ),
            const SizedBox(height: Olcu.b2),
            BilgisayarOyunu(
              key: ValueKey('oyunsonu-$_oyunNo-$_meydan'),
              baslangic: MacDurumu.baslat(
                k.fen,
                kullaniciBeyaz: k.fen.split(' ')[1] == 'w',
                hamleSiniri: 120,
              ),
              geriAl: !_meydan,
              pesEt: true,
              onBitti: (mac, sonuc, neden) => _bitti(k, mac, sonuc, neden),
            ),
            if (bitis != null) ...[
              const SizedBox(height: Olcu.b2),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(Olcu.b2),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        kazandi
                            ? (_meydan
                                  ? 'Mat! ${bitis.hamle} hamlede ${_yildizMetni(SatrancCalisma.yildiz(k.enAz, bitis.hamle))}'
                                  : 'Mat! ${bitis.hamle} hamlede bitirdin.')
                            : 'Olmadı: ${bitis.neden}',
                        key: const Key('oyunsonu-sonuc'),
                        style: yazi.titleMedium?.copyWith(
                          color: kazandi ? r.dogru : r.hata,
                        ),
                      ),
                      const SizedBox(height: Olcu.b2),
                      OutlinedButton.icon(
                        key: const Key('oyunsonu-yeniden'),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                        ),
                        onPressed: () => setState(() {
                          _oyunNo++;
                          _bitis = null;
                        }),
                        icon: const Icon(Icons.replay),
                        label: const Text('Yeniden dene'),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
