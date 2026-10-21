/// Filtreli tekrar ve hatırlatma takvimi (ÖZELLİK 79): "Son 7 gün yanlışlar",
/// "Yalnız fiiller", "Zayıf kartlar", "Bir kursa ait" geçici desteleri ve
/// önümüzdeki 14 günde her gün kaç kartın beklediği. Geçici deste SRS'i,
/// hata defterini ve günlüğü GÜNCELLEMEZ (kart aralıkları bozulmaz).
/// Tekrar sekmesinden `push` ile açılır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/alistirma_oturumu.dart';
import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../model/icerik.dart';
import '../motor/pratik.dart';
import '../tema/tema.dart';

class FiltreliTekrarEkrani extends ConsumerStatefulWidget {
  const FiltreliTekrarEkrani({super.key});

  @override
  ConsumerState<FiltreliTekrarEkrani> createState() => _FiltreliDurumu();
}

class _FiltreliDurumu extends ConsumerState<FiltreliTekrarEkrani> {
  List<PratikKarti>? _oturum;
  ({int dogru, int toplam})? _sonuc;
  String? _kursId;

  static String _gunEtiketi(String gun, int sira) {
    if (sira == 0) return 'Bugün';
    if (sira == 1) return 'Yarın';
    final p = gun.split('-');
    return p.length == 3 ? '${p[2]}.${p[1]}' : gun;
  }

  @override
  Widget build(BuildContext context) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final kurslar = ref.watch(alanKurslariProvider);
    final bugun = ref.watch(bugunProvider);
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final kodMu = kurslar.isNotEmpty && kurslar.first.alan != KursAlani.dil;
    final kursId = kurslar.any((k) => k.id == _kursId)
        ? _kursId
        : (kurslar.isEmpty ? null : kurslar.first.id);

    void kapat() => context.canPop() ? context.pop() : context.go('/tekrar');

    final oturum = _oturum;
    if (oturum != null && _sonuc == null) {
      return Scaffold(
        body: SafeArea(
          child: AlistirmaOturumu(
            alistirmalar: [for (final o in oturum) o.alistirma],
            // Geçici deste: SRS ve hata defteri güncellenmez.
            onSonuc: (i, dogru) {},
            onBitti: (d, t) => setState(() => _sonuc = (dogru: d, toplam: t)),
            onKapat: () => setState(() => _oturum = null),
          ),
        ),
      );
    }

    Widget govde;
    final sonuc = _sonuc;
    if (sonuc != null) {
      govde = Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(Olcu.b3),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.check_circle, size: 64, color: r.dogru),
              const SizedBox(height: Olcu.b2),
              Text('Geçici deste bitti', style: yazi.titleLarge),
              const SizedBox(height: Olcu.b1),
              Text(
                '${sonuc.toplam} karttan ${sonuc.dogru} tanesini doğru bildin. '
                'Kart aralıkların değişmedi.',
                style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: Olcu.b3),
              FilledButton(
                onPressed: () => setState(() {
                  _sonuc = null;
                  _oturum = null;
                }),
                child: const Text('Tamam'),
              ),
            ],
          ),
        ),
      );
    } else {
      final takvim = Pratik.takvim(durum, bugun, kurslar: kurslar);
      final enCok = takvim.fold<int>(0, (m, g) => g.adet > m ? g.adet : m);
      final toplam = takvim.fold<int>(0, (t, g) => t + g.adet);

      Widget filtre(TekrarFiltresi f, {Widget? ek}) {
        final deste = Pratik.desteSec(durum, kurslar, bugun, f, kursId: kursId);
        final ad = Pratik.filtreAdi(f, kodMu: kodMu);
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(Olcu.b2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(ad, style: yazi.titleMedium),
                const SizedBox(height: Olcu.b1),
                Text(
                  deste.isEmpty
                      ? 'Bu filtrede kart yok.'
                      : '${deste.length} kart',
                  style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                ),
                if (ek != null) ek,
                const SizedBox(height: Olcu.b1),
                Align(
                  alignment: Alignment.centerLeft,
                  child: FilledButton(
                    key: ValueKey('filtre-${f.name}'),
                    onPressed: deste.isEmpty
                        ? null
                        : () => setState(() {
                            _oturum = deste;
                            _sonuc = null;
                          }),
                    child: const Text('Başla'),
                  ),
                ),
              ],
            ),
          ),
        );
      }

      govde = SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Geçici desteler kart aralıklarını değiştirmez; cevapların '
              'tekrar takvimini ve hata defterini etkilemez.',
              style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
            ),
            const SizedBox(height: Olcu.b2),
            filtre(TekrarFiltresi.sonYediGunYanlis),
            filtre(TekrarFiltresi.yalnizFiiller),
            filtre(TekrarFiltresi.zayifKartlar),
            filtre(
              TekrarFiltresi.kurs,
              ek: kurslar.isEmpty
                  ? null
                  : DropdownButton<String>(
                      key: const ValueKey('filtre-kurs-secici'),
                      isExpanded: true,
                      value: kursId,
                      items: [
                        for (final k in kurslar)
                          DropdownMenuItem(
                            value: k.id,
                            child: Text(
                              k.ad,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                      ],
                      onChanged: (v) => setState(() => _kursId = v),
                    ),
            ),
            const SizedBox(height: Olcu.b2),
            Semantics(
              header: true,
              child: Text('Hatırlatma takvimi', style: yazi.titleLarge),
            ),
            const SizedBox(height: Olcu.b1),
            Text(
              toplam == 0
                  ? 'Önümüzdeki 14 günde bekleyen tekrar yok.'
                  : 'Önümüzdeki 14 günde $toplam tekrar bekliyor.',
              style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
            ),
            const SizedBox(height: Olcu.b1),
            for (var i = 0; i < takvim.length; i++)
              _TakvimSatiri(
                etiket: _gunEtiketi(takvim[i].gun, i),
                adet: takvim[i].adet,
                gecikmis: takvim[i].gecikmis,
                oran: enCok == 0 ? 0 : takvim[i].adet / enCok,
              ),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Filtreli tekrar'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: kapat,
        ),
      ),
      body: SafeArea(child: SayfaGovdesi(child: govde)),
    );
  }
}

class _TakvimSatiri extends StatelessWidget {
  const _TakvimSatiri({
    required this.etiket,
    required this.adet,
    required this.gecikmis,
    required this.oran,
  });
  final String etiket;
  final int adet;
  final int gecikmis;
  final double oran;

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final ek = gecikmis > 0 ? ' ($gecikmis gecikmiş)' : '';
    return Semantics(
      label: '$etiket: $adet tekrar$ek',
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(
          children: [
            SizedBox(width: 72, child: Text(etiket, style: yazi.bodyMedium)),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: oran,
                  minHeight: 10,
                  color: r.ana,
                  backgroundColor: r.yuzey,
                ),
              ),
            ),
            const SizedBox(width: Olcu.b1),
            ConstrainedBox(
              constraints: const BoxConstraints(minWidth: 32),
              child: Text(
                '$adet',
                style: yazi.bodyMedium,
                textAlign: TextAlign.end,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
