/// Kelime defteri oynatıcısı (ÖZELLİK 82, `/kelime-oynatici`): kelime defterini
/// sesli, otomatik çalan liste olarak oynatır (KelimeOynatici; cihaz TTS).
/// Oynat/duraklat, önceki/sonraki, hız (yavaş/normal/hızlı), "Anlamı da oku"
/// ve "Döngü". Yalnız dil kurslarında; ayarlarda ses kapalıysa oynatılamaz.
/// Ekrandan çıkınca okuma durur. Pratik merkezinden `push` ile açılır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../servis/kelime_oynatici.dart';
import '../tema/tema.dart';

class KelimeOynaticiEkrani extends ConsumerStatefulWidget {
  const KelimeOynaticiEkrani({super.key});

  @override
  ConsumerState<KelimeOynaticiEkrani> createState() => _OynaticiDurumu();
}

class _OynaticiDurumu extends ConsumerState<KelimeOynaticiEkrani> {
  KelimeOynatici? _oynatici;

  @override
  void initState() {
    super.initState();
    final durum = ref.read(durumProvider).value ?? const OgrenciDurumu();
    final ogeler = KelimeOynatici.liste(durum, ref.read(alanKurslariProvider));
    _oynatici = KelimeOynatici(ses: ref.read(sesProvider), ogeler: ogeler)
      ..addListener(_dinle);
  }

  void _dinle() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    final o = _oynatici;
    if (o != null) {
      o.removeListener(_dinle);
      unawaited(o.duraklat());
      o.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final o = _oynatici!;
    final sesAcik = ref.watch(
      durumProvider.select((d) => d.value?.sesAcik ?? true),
    );
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final simdiki = o.simdiki;

    Widget govde;
    if (o.ogeler.isEmpty) {
      govde = Center(
        child: Padding(
          padding: const EdgeInsets.all(Olcu.b3),
          child: Text(
            'Çalınacak kelime yok. Bir dil dersi bitirince ya da sözlükten '
            'kart ekleyince kelime defterin burada çalar.',
            key: const ValueKey('oynatici-bos'),
            textAlign: TextAlign.center,
            style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          ),
        ),
      );
    } else {
      govde = ListView(
        padding: const EdgeInsets.all(Olcu.b3),
        children: [
          Text(
            o.bitti ? 'Liste bitti' : '${o.indeks + 1} / ${o.ogeler.length}',
            key: const ValueKey('oynatici-sayac'),
            textAlign: TextAlign.center,
            style: yazi.labelLarge?.copyWith(color: r.metinIkincil),
          ),
          const SizedBox(height: Olcu.b2),
          LinearProgressIndicator(
            value: o.ogeler.isEmpty
                ? 0
                : (o.bitti ? 1 : o.indeks / o.ogeler.length),
            minHeight: 6,
            borderRadius: BorderRadius.circular(3),
          ),
          const SizedBox(height: Olcu.b3),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(Olcu.b3),
              child: Column(
                children: [
                  Text(
                    simdiki?.metin ?? 'Bitti',
                    key: const ValueKey('oynatici-kelime'),
                    textAlign: TextAlign.center,
                    style: yazi.headlineMedium,
                  ),
                  const SizedBox(height: Olcu.b1),
                  Text(
                    simdiki?.anlam ?? '',
                    key: const ValueKey('oynatici-anlam'),
                    textAlign: TextAlign.center,
                    style: yazi.titleMedium?.copyWith(color: r.metinIkincil),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: Olcu.b2),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton.outlined(
                key: const ValueKey('oynatici-onceki'),
                icon: const Icon(Icons.skip_previous),
                tooltip: 'Önceki',
                onPressed: () => unawaited(o.onceki()),
              ),
              const SizedBox(width: Olcu.b2),
              IconButton.filled(
                key: const ValueKey('oynatici-oynat'),
                iconSize: 36,
                icon: Icon(o.caliyor ? Icons.pause : Icons.play_arrow),
                tooltip: o.caliyor ? 'Duraklat' : 'Oynat',
                onPressed: !sesAcik
                    ? null
                    : () {
                        if (o.caliyor) {
                          unawaited(o.duraklat());
                        } else {
                          unawaited(o.devam());
                        }
                      },
              ),
              const SizedBox(width: Olcu.b2),
              IconButton.outlined(
                key: const ValueKey('oynatici-sonraki'),
                icon: const Icon(Icons.skip_next),
                tooltip: 'Sonraki',
                onPressed: () => unawaited(o.sonraki()),
              ),
            ],
          ),
          if (!sesAcik)
            Padding(
              padding: const EdgeInsets.only(top: Olcu.b1),
              child: Text(
                'Ses ayarlardan kapalı; oynatmak için sesi aç.',
                key: const ValueKey('oynatici-ses-kapali'),
                textAlign: TextAlign.center,
                style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
              ),
            ),
          const SizedBox(height: Olcu.b3),
          Text('Hız', style: yazi.titleSmall),
          const SizedBox(height: Olcu.b1),
          SegmentedButton<OynatmaHizi>(
            key: const ValueKey('oynatici-hiz'),
            showSelectedIcon: false,
            segments: [
              for (final h in OynatmaHizi.values)
                ButtonSegment(value: h, label: Text(h.ad)),
            ],
            selected: {o.hiz},
            onSelectionChanged: (s) {
              o.hiz = s.first;
              setState(() {});
            },
          ),
          SwitchListTile(
            key: const ValueKey('oynatici-anlam-oku'),
            contentPadding: EdgeInsets.zero,
            title: const Text('Anlamı da oku'),
            value: o.anlamOku,
            onChanged: (v) => setState(() => o.anlamOku = v),
          ),
          SwitchListTile(
            key: const ValueKey('oynatici-dongu'),
            contentPadding: EdgeInsets.zero,
            title: const Text('Döngü'),
            value: o.dongu,
            onChanged: (v) => setState(() => o.dongu = v),
          ),
        ],
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kelime defteri oynatıcı'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/pratik'),
        ),
      ),
      body: SafeArea(child: SayfaGovdesi(child: govde)),
    );
  }
}
