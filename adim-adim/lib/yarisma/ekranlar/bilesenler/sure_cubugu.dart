/// Soru süre çubuğu: saniye saniye geriye sayar; 0'da `onBitti` çağrılır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Renk: petrol (ana); son 5 saniyede hardal (vurgu). Kırmızı kullanılmaz
/// (docs/SADE-ARAYUZ-VE-YARISMA.md bölüm 7). Sayım `Timer.periodic` (1 sn).
/// Her yeni soru için üstten farklı `key` verilmeli (sayaç sıfırlanır).
library;

import 'dart:async';

import 'package:flutter/material.dart';

import '../../../tema/tema.dart';

class SureCubugu extends StatefulWidget {
  const SureCubugu({
    super.key,
    required this.toplam,
    required this.calisiyor,
    required this.onBitti,
  });

  /// Toplam süre (sn). Artarsa (ekstra süre) kalan süreye de eklenir.
  final int toplam;

  /// false iken sayım durur (cevap verildi).
  final bool calisiyor;
  final VoidCallback onBitti;

  /// Bu saniye ve altında renk hardala döner.
  static const int uyariSaniyesi = 5;

  @override
  State<SureCubugu> createState() => _SureCubuguDurumu();
}

class _SureCubuguDurumu extends State<SureCubugu> {
  late int _kalan = widget.toplam;
  Timer? _sayac;

  @override
  void initState() {
    super.initState();
    _gerekirseBaslat();
  }

  @override
  void didUpdateWidget(SureCubugu eski) {
    super.didUpdateWidget(eski);
    if (widget.toplam != eski.toplam) _kalan += widget.toplam - eski.toplam;
    if (widget.calisiyor) {
      _gerekirseBaslat();
    } else {
      _sayac?.cancel();
      _sayac = null;
    }
  }

  void _gerekirseBaslat() {
    if (!widget.calisiyor || _sayac != null || _kalan <= 0) return;
    _sayac = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;
      setState(() => _kalan--);
      if (_kalan <= 0) {
        _sayac?.cancel();
        _sayac = null;
        widget.onBitti();
      }
    });
  }

  @override
  void dispose() {
    _sayac?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final uyari = _kalan <= SureCubugu.uyariSaniyesi;
    final renk = uyari ? r.vurgu : r.ana;
    final oran = widget.toplam <= 0
        ? 0.0
        : (_kalan / widget.toplam).clamp(0.0, 1.0);
    return Semantics(
      container: true,
      label: 'Kalan süre: ${_kalan < 0 ? 0 : _kalan} saniye',
      child: ExcludeSemantics(
        child: Row(
          children: [
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(Olcu.b1),
                child: LinearProgressIndicator(
                  value: oran,
                  minHeight: 10,
                  color: renk,
                  backgroundColor: r.kenar,
                ),
              ),
            ),
            const SizedBox(width: Olcu.b1),
            SizedBox(
              width: 44,
              child: Text(
                '${_kalan < 0 ? 0 : _kalan} s',
                textAlign: TextAlign.end,
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: uyari ? r.vurgu : r.metin,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
