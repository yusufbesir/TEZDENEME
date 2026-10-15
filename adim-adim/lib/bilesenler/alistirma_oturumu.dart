import 'package:flutter/material.dart';

import '../model/icerik.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';
import 'alistirma/alistirma_karti.dart';
import 'alistirma/dogru_cevap.dart';
import 'geri_bildirim_bandi.dart';

/// Alıştırmaları sırayla sorar: cevap -> Kontrol et -> alt bant -> Devam.
/// Ders ve tekrar ekranları ortak kullanır.
class AlistirmaOturumu extends StatefulWidget {
  const AlistirmaOturumu({
    super.key,
    required this.alistirmalar,
    required this.onSonuc,
    required this.onBitti,
    required this.onKapat,
  });

  final List<Alistirma> alistirmalar;

  /// Her cevaptan sonra çağrılır: (alıştırma indeksi, doğru mu).
  final void Function(int indeks, bool dogruMu) onSonuc;

  /// Son "Bitir"den sonra çağrılır: (doğru sayısı, toplam).
  final void Function(int dogru, int toplam) onBitti;
  final VoidCallback onKapat;

  @override
  State<AlistirmaOturumu> createState() => _OturumDurumu();
}

class _OturumDurumu extends State<AlistirmaOturumu> {
  int _indeks = 0;
  int _dogru = 0;
  Object? _cevap;
  bool _kontrolEdildi = false;
  bool _dogruMu = false;

  Alistirma get _simdiki => widget.alistirmalar[_indeks];
  bool get _son => _indeks == widget.alistirmalar.length - 1;

  void _kontrol() {
    if (_cevap == null || _kontrolEdildi) return;
    final dogru = Motor.cevapDogruMu(_simdiki, _cevap);
    setState(() {
      _kontrolEdildi = true;
      _dogruMu = dogru;
      if (dogru) _dogru++;
    });
    widget.onSonuc(_indeks, dogru);
  }

  void _devam() {
    if (_son) {
      widget.onBitti(_dogru, widget.alistirmalar.length);
      return;
    }
    setState(() {
      _indeks++;
      _cevap = null;
      _kontrolEdildi = false;
      _dogruMu = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final toplam = widget.alistirmalar.length;
    final oran = (_indeks + (_kontrolEdildi ? 1 : 0)) / toplam;
    final r = context.renkler;
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
                style: Theme.of(
                  context,
                ).textTheme.labelLarge?.copyWith(color: r.metinIkincil),
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
                  key: ValueKey(_indeks),
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
            devamEtiketi: _son ? 'Bitir' : 'Devam',
            onDevam: _devam,
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
                  child: SizedBox(
                    width: double.infinity,
                    child: FilledButton(
                      onPressed: _cevap == null ? null : _kontrol,
                      child: const Text('Kontrol et'),
                    ),
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}
