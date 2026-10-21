import 'package:flutter/material.dart';

import '../model/icerik.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';
import 'alistirma/alistirma_karti.dart';
import 'alistirma/dogru_cevap.dart';
import 'geri_bildirim_bandi.dart';

/// Alıştırmaları sırayla sorar: cevap -> Kontrol et -> alt bant -> Devam.
/// Ders ve tekrar ekranları ortak kullanır.
///
/// Kademeli ipucu ("önce dene, sonra kural"): yanlış cevaptan sonra bantta
/// "İpucu al" (key 'ipucu-al') ve "Yine de geç" bulunur. Her basışta bir adım
/// gösterilir (en çok [Motor.ipucuAdimSayisi]; son adım çözüm) ve soru yeniden
/// cevaplanabilir. İlk cevabın sonucu `onSonuc`a bir kez gider; ipucu sonrası
/// denemeler onSonuc'u ve doğru sayacını değiştirmez (kart puanı korunur).
class AlistirmaOturumu extends StatefulWidget {
  const AlistirmaOturumu({
    super.key,
    required this.alistirmalar,
    required this.onSonuc,
    required this.onBitti,
    required this.onKapat,
    this.notGetir,
    this.onIpucu,
  });

  final List<Alistirma> alistirmalar;

  /// Her sorunun ilk cevabından sonra çağrılır: (alıştırma indeksi, doğru mu).
  final void Function(int indeks, bool dogruMu) onSonuc;

  /// Son "Bitir"den sonra çağrılır: (doğru sayısı, toplam).
  final void Function(int dogru, int toplam) onBitti;
  final VoidCallback onKapat;

  /// Verilen alıştırmanın kişisel kelime notu (yoksa null); cevaptan sonra
  /// bantta "Senin notun: ..." olarak gösterilir.
  final String? Function(int indeks)? notGetir;

  /// Her "İpucu al" basışında çağrılır: (alıştırma indeksi, adım 1..3).
  final void Function(int indeks, int adim)? onIpucu;

  @override
  State<AlistirmaOturumu> createState() => _OturumDurumu();
}

class _OturumDurumu extends State<AlistirmaOturumu> {
  int _indeks = 0;
  int _dogru = 0;
  Object? _cevap;
  bool _kontrolEdildi = false;
  bool _dogruMu = false;

  /// Bu soruda alınan ipucu sayısı (0..Motor.ipucuAdimSayisi).
  int _ipucuAdim = 0;

  /// Bu sorunun ilk cevabı onSonuc'a bildirildi mi?
  bool _bildirildi = false;

  Alistirma get _simdiki => widget.alistirmalar[_indeks];
  bool get _son => _indeks == widget.alistirmalar.length - 1;
  bool get _ipucuKaldi => _ipucuAdim < Motor.ipucuAdimSayisi;

  List<String> get _ipuclar => [
    for (var i = 0; i < _ipucuAdim; i++) Motor.ipucuUret(_simdiki, i),
  ];

  /// "Bu alıştırmayı atla" ile geçilen konuşma alıştırması sayısı.
  int _atlanan = 0;

  void _kontrol() {
    if (_cevap == null || _kontrolEdildi) return;
    if (_cevap is SoyleAtlandi) {
      // Nötr geçiş: onSonuc çağrılmaz, doğru sayacı ve SRS değişmez.
      _atlanan++;
      _devam();
      return;
    }
    final dogru = Motor.cevapDogruMu(_simdiki, _cevap);
    final ilk = !_bildirildi;
    setState(() {
      _kontrolEdildi = true;
      _dogruMu = dogru;
      if (dogru && ilk) _dogru++;
      _bildirildi = true;
    });
    if (ilk) widget.onSonuc(_indeks, dogru);
  }

  /// Bir ipucu adımı daha gösterir ve soruyu yeniden cevaplamaya açar.
  void _ipucuAl() {
    if (!_ipucuKaldi) return;
    setState(() {
      _ipucuAdim++;
      _kontrolEdildi = false;
      _dogruMu = false;
      _cevap = null;
    });
    widget.onIpucu?.call(_indeks, _ipucuAdim);
  }

  void _devam() {
    if (_son) {
      // Atlanan alıştırmalar toplamdan düşer (en az 1).
      final toplam = widget.alistirmalar.length - _atlanan;
      widget.onBitti(_dogru, toplam < 1 ? 1 : toplam);
      return;
    }
    setState(() {
      _indeks++;
      _cevap = null;
      _kontrolEdildi = false;
      _dogruMu = false;
      _ipucuAdim = 0;
      _bildirildi = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final toplam = widget.alistirmalar.length;
    final oran = (_indeks + (_kontrolEdildi ? 1 : 0)) / toplam;
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final not = widget.notGetir?.call(_indeks);
    final yanlisVeIpucuVar = _kontrolEdildi && !_dogruMu && _ipucuKaldi;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(
            Olcu.b1,
            Olcu.b1,
            Olcu.b2,
            Olcu.b1,
          ),
          child: Row(
            children: [
              IconButton(
                tooltip: 'Dersten çık',
                icon: const Icon(Icons.close),
                onPressed: widget.onKapat,
              ),
              Expanded(
                child: Semantics(
                  label: 'Alıştırma ${_indeks + 1} / $toplam',
                  excludeSemantics: true,
                  child: TweenAnimationBuilder<double>(
                    tween: Tween(begin: 0, end: oran),
                    duration: Olcu.sure(context, 250),
                    builder: (context, v, _) => ClipRRect(
                      borderRadius: BorderRadius.circular(Olcu.b1),
                      child: LinearProgressIndicator(value: v, minHeight: 12),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: Olcu.b1),
              Text(
                '${_indeks + 1}/$toplam',
                style: yazi.labelLarge?.copyWith(color: r.metinIkincil),
              ),
            ],
          ),
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(Olcu.b2),
            child: Align(
              alignment: Alignment.topCenter,
              child: ConstrainedBox(
                constraints: const BoxConstraints(
                  maxWidth: Olcu.icerikGenislik,
                ),
                child: AlistirmaKarti(
                  // İpucu alınınca kart sıfırlanır: yeniden cevaplanır.
                  key: ValueKey('$_indeks-$_ipucuAdim'),
                  alistirma: _simdiki,
                  kontrolEdildi: _kontrolEdildi,
                  dogruMu: _dogruMu,
                  onCevap: (c) => setState(() => _cevap = c),
                  onGonder: _kontrol,
                ),
              ),
            ),
          ),
        ),
        if (_kontrolEdildi)
          GeriBildirimBandi(
            dogruMu: _dogruMu,
            aciklama: _simdiki.aciklama,
            dogruCevap: dogruCevapMetni(_simdiki),
            ipuclari: _ipuclar,
            not: not,
            devamEtiketi: _son
                ? 'Bitir'
                : (yanlisVeIpucuVar ? 'Yine de geç' : 'Devam'),
            onDevam: _devam,
            ekEtiket: yanlisVeIpucuVar ? 'İpucu al' : null,
            ekAnahtar: yanlisVeIpucuVar ? const Key('ipucu-al') : null,
            onEk: yanlisVeIpucuVar ? _ipucuAl : null,
          )
        else
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(Olcu.b2),
              child: Align(
                heightFactor: 1,
                child: ConstrainedBox(
                  constraints: const BoxConstraints(
                    maxWidth: Olcu.icerikGenislik,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (_ipucuAdim > 0) ...[
                        _IpucuPaneli(
                          ipuclari: _ipuclar,
                          onIpucu: _ipucuKaldi ? _ipucuAl : null,
                          onGec: _devam,
                          gecEtiketi: _son ? 'Bitir' : 'Yine de geç',
                        ),
                        const SizedBox(height: Olcu.b1),
                      ],
                      FilledButton(
                        onPressed: _cevap == null ? null : _kontrol,
                        child: const Text('Kontrol et'),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

/// İpucu alındıktan sonra, yeniden cevaplama sırasında görünen panel:
/// alınan ipuçları, "İpucu al" (kaldıysa) ve "Yine de geç".
class _IpucuPaneli extends StatelessWidget {
  const _IpucuPaneli({
    required this.ipuclari,
    required this.onIpucu,
    required this.onGec,
    required this.gecEtiketi,
  });

  final List<String> ipuclari;
  final VoidCallback? onIpucu;
  final VoidCallback onGec;
  final String gecEtiketi;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    return Container(
      padding: const EdgeInsets.all(Olcu.b2),
      decoration: BoxDecoration(
        color: r.yuzey,
        border: Border.all(color: r.kenar),
        borderRadius: BorderRadius.circular(Olcu.kose),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            children: [
              Icon(Icons.lightbulb_outline, color: r.ana),
              const SizedBox(width: Olcu.b1),
              Expanded(
                child: Text(
                  'Tekrar dene',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ),
            ],
          ),
          const SizedBox(height: Olcu.b1),
          IpucuListesi(ipuclari: ipuclari),
          const SizedBox(height: Olcu.b1),
          Row(
            children: [
              if (onIpucu != null) ...[
                Expanded(
                  child: OutlinedButton(
                    key: const Key('ipucu-al'),
                    onPressed: onIpucu,
                    child: const Text('İpucu al'),
                  ),
                ),
                const SizedBox(width: Olcu.b1),
              ],
              Expanded(
                child: TextButton(onPressed: onGec, child: Text(gecEtiketi)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
