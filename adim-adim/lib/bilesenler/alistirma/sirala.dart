import 'package:flutter/material.dart';

import '../../model/icerik.dart';
import '../../tema/tema.dart';
import 'soru_basligi.dart';
import 'yon.dart';

/// Parçaları sıraya dizme: havuzdaki parçaya dokun, cevap satırına eklenir;
/// cevap satırındaki parçaya dokun, havuza döner.
class SiralaGorunumu extends StatefulWidget {
  const SiralaGorunumu({
    super.key,
    required this.alistirma,
    required this.kontrolEdildi,
    required this.dogruMu,
    required this.onCevap,
  });
  final Sirala alistirma;
  final bool kontrolEdildi;
  final bool dogruMu;
  final ValueChanged<Object?> onCevap;

  @override
  State<SiralaGorunumu> createState() => _SiralaDurumu();
}

class _SiralaDurumu extends State<SiralaGorunumu> {
  late final List<int> _havuz = List.generate(
    widget.alistirma.kelimeler.length,
    (i) => i,
  );
  final List<int> _secilen = [];

  List<String> get _kelimeler => widget.alistirma.kelimeler;

  void _bildir() => widget.onCevap(
    _havuz.isEmpty ? [for (final i in _secilen) _kelimeler[i]] : null,
  );

  void _ekle(int i) {
    if (widget.kontrolEdildi) return;
    setState(() {
      _havuz.remove(i);
      _secilen.add(i);
    });
    _bildir();
  }

  void _cikar(int i) {
    if (widget.kontrolEdildi) return;
    setState(() {
      _secilen.remove(i);
      _havuz.add(i);
      _havuz.sort();
    });
    _bildir();
  }

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final kontrol = widget.kontrolEdildi;
    final yon = parcaYonu(_kelimeler);
    final renk = kontrol ? (widget.dogruMu ? r.dogru : r.hata) : r.kenar;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SoruBasligi(
          widget.alistirma.soru,
          ipucu: 'Parçalara dokunarak doğru sıraya diz.',
        ),
        Semantics(
          label: _secilen.isEmpty
              ? 'Cevap alanı boş'
              : 'Cevabın: ${_secilen.map((i) => _kelimeler[i]).join(' ')}',
          container: true,
          child: Container(
            width: double.infinity,
            constraints: const BoxConstraints(minHeight: 72),
            padding: const EdgeInsets.all(Olcu.b1),
            decoration: BoxDecoration(
              color: r.yuzey,
              borderRadius: BorderRadius.circular(Olcu.kose),
              border: Border.all(color: renk, width: kontrol ? 2 : 1),
            ),
            child: Wrap(
              // Arapça parçalar sağdan sola akar (ilk seçilen sağda).
              textDirection: _secilen.isEmpty ? null : yon,
              spacing: Olcu.b1,
              runSpacing: Olcu.b1,
              crossAxisAlignment: WrapCrossAlignment.center,
              children: [
                if (kontrol)
                  Icon(
                    widget.dogruMu ? Icons.check_circle : Icons.cancel,
                    color: renk,
                  ),
                if (_secilen.isEmpty && !kontrol)
                  Padding(
                    padding: const EdgeInsets.all(Olcu.b1),
                    child: Text(
                      'Cevabın burada görünecek',
                      style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                    ),
                  ),
                for (final i in _secilen) _parca(i, () => _cikar(i), true),
              ],
            ),
          ),
        ),
        const SizedBox(height: Olcu.b3),
        Wrap(
          textDirection: yon,
          spacing: Olcu.b1,
          runSpacing: Olcu.b1,
          children: [for (final i in _havuz) _parca(i, () => _ekle(i), false)],
        ),
      ],
    );
  }

  Widget _parca(int i, VoidCallback onTap, bool secildi) {
    final r = context.renkler;
    return Semantics(
      button: true,
      label: _kelimeler[i],
      hint: secildi
          ? 'Havuza geri koymak için dokun'
          : 'Cevaba eklemek için dokun',
      excludeSemantics: true,
      onTap: widget.kontrolEdildi ? null : onTap,
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          minHeight: Olcu.hedef,
          minWidth: Olcu.hedef,
        ),
        child: Material(
          color: secildi ? r.ana : r.zemin,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Olcu.kose),
            side: BorderSide(color: secildi ? r.ana : r.kenar),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(Olcu.kose),
            onTap: widget.kontrolEdildi ? null : onTap,
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: Olcu.b2,
                vertical: Olcu.b1 + 4,
              ),
              child: Text(
                _kelimeler[i],
                style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                  color: secildi ? r.anaUstu : r.metin,
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
