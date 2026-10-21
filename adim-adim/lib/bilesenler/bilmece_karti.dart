// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// "Günün bilmecesi" kartı: alan kurslarının Secim alıştırmaları arasından
/// tarihe göre deterministik seçilen tek soru (Motor.bilmeceSec). Seçenekler
/// düğmedir; dokununca doğru/yanlış geri bildirimi ve doğru cevap görünür,
/// doğruda +2 XP (Motor.bilmeceCevapla). Aynı gün ikinci kez cevaplanamaz:
/// durumdaki `bilmece` alanı bugüne yazılmışsa düğmeler pasiftir ve sonuç
/// gösterilir. Secim alıştırması yoksa hiçbir şey çizmez.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../model/icerik.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

class BilmeceKarti extends ConsumerStatefulWidget {
  const BilmeceKarti({
    super.key,
    required this.durum,
    required this.kurslar,
    required this.bugun,
  });

  final OgrenciDurumu durum;
  final List<Kurs> kurslar;
  final String bugun;

  @override
  ConsumerState<BilmeceKarti> createState() => _BilmeceDurumu();
}

class _BilmeceDurumu extends ConsumerState<BilmeceKarti> {
  /// Bu oturumda dokunulan seçenek (vurgulamak için); kalıcı değildir.
  int? _secilen;
  bool _kaydediliyor = false;

  Future<void> _cevapla(Secim secim, int i) async {
    if (_kaydediliyor) return;
    if (!Motor.bilmeceCevaplanabilir(widget.durum, widget.bugun)) return;
    _kaydediliyor = true;
    setState(() => _secilen = i);
    await ref.read(durumProvider.notifier).bilmeceCevapla(i == secim.dogru);
    if (mounted) _kaydediliyor = false;
  }

  @override
  Widget build(BuildContext context) {
    final secilen = Motor.bilmeceSec(widget.kurslar, widget.bugun);
    if (secilen == null) return const SizedBox.shrink();
    final secim = secilen.secim;
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final cevap = widget.durum.bilmece;
    final cevaplandi = cevap != null && cevap.gun == widget.bugun;
    final dogruMetin = secim.secenekler[secim.dogru];

    Widget secenek(int i) {
      final metin = secim.secenekler[i];
      final dogruBu = i == secim.dogru;
      Color? kenar;
      IconData? simge;
      if (cevaplandi) {
        if (dogruBu) {
          kenar = r.dogru;
          simge = Icons.check_circle;
        } else if (_secilen == i) {
          kenar = r.hata;
          simge = Icons.cancel;
        }
      }
      return Padding(
        padding: const EdgeInsets.only(top: Olcu.b1),
        child: Semantics(
          button: true,
          label: cevaplandi && dogruBu
              ? '$metin, doğru cevap'
              : (cevaplandi && _secilen == i ? '$metin, yanlış' : metin),
          excludeSemantics: true,
          child: OutlinedButton.icon(
            key: ValueKey('bilmece-secenek-$i'),
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(Olcu.hedef),
              alignment: Alignment.centerLeft,
              side: kenar == null ? null : BorderSide(color: kenar, width: 2),
              foregroundColor: kenar,
            ),
            icon: Icon(simge ?? Icons.circle_outlined, size: 20),
            label: Text(metin, softWrap: true),
            onPressed: cevaplandi ? null : () => _cevapla(secim, i),
          ),
        ),
      );
    }

    final String sonucMetni;
    if (!cevaplandi) {
      sonucMetni = '';
    } else if (cevap.dogru) {
      sonucMetni = 'Doğru! +${Motor.bilmeceXp} XP. Yarın yeni bilmece var.';
    } else {
      sonucMetni = 'Yanlış. Doğru cevap: $dogruMetin. Yarın tekrar dene.';
    }

    return Card(
      key: const ValueKey('gunun-bilmecesi'),
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Icon(Icons.extension_outlined, color: r.ana),
                const SizedBox(width: Olcu.b1),
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text(
                      'Günün bilmecesi',
                      style: yazi.labelMedium?.copyWith(color: r.metinIkincil),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: Olcu.b1),
            Text(secim.soru, style: yazi.titleMedium),
            for (var i = 0; i < secim.secenekler.length; i++) secenek(i),
            if (cevaplandi) ...[
              const SizedBox(height: Olcu.b1),
              Semantics(
                liveRegion: true,
                child: Row(
                  children: [
                    Icon(
                      cevap.dogru ? Icons.check_circle : Icons.cancel,
                      color: cevap.dogru ? r.dogru : r.hata,
                      size: 20,
                    ),
                    const SizedBox(width: Olcu.b1),
                    Expanded(
                      child: Text(
                        sonucMetni,
                        key: const ValueKey('bilmece-sonuc'),
                        style: yazi.bodyMedium?.copyWith(
                          color: cevap.dogru ? r.dogru : r.hata,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
