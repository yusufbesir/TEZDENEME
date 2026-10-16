import 'package:flutter/material.dart';

import '../../model/icerik.dart';
import '../../tema/tema.dart';
import 'soru_basligi.dart';

/// Eşleştirme: soldan bir öğe seç, sağdan eşini seç. Eşleşen çiftler aynı
/// numarayı taşır (renge ek olarak sayı + simge). Eşleşmiş öğeye dokunmak eşi bozar.
class EslestirGorunumu extends StatefulWidget {
  const EslestirGorunumu({
    super.key,
    required this.alistirma,
    required this.kontrolEdildi,
    required this.onCevap,
  });
  final Eslestir alistirma;
  final bool kontrolEdildi;
  final ValueChanged<Object?> onCevap;

  @override
  State<EslestirGorunumu> createState() => _EslestirDurumu();
}

class _EslestirDurumu extends State<EslestirGorunumu> {
  late final List<int> _sagSira = _karistir();
  final Map<int, int> _eslesen =
      {}; // sol indeks -> sag indeks (ciftler indeksi)
  int? _seciliSol;

  List<int> _karistir() {
    final n = widget.alistirma.ciftler.length;
    final liste = List.generate(n, (i) => i);
    // Deterministik karıştırma: soru metnine bağlı, her seferinde aynı sıra.
    var tohum = widget.alistirma.soru.hashCode & 0x7fffffff;
    for (var i = n - 1; i > 0; i--) {
      tohum = (tohum * 1103515245 + 12345) & 0x7fffffff;
      final j = tohum % (i + 1);
      final gecici = liste[i];
      liste[i] = liste[j];
      liste[j] = gecici;
    }
    // Karışmamışsa (özdeş sıra) bir kaydır.
    if (n > 1 && List.generate(n, (i) => i).toString() == liste.toString()) {
      liste.add(liste.removeAt(0));
    }
    return liste;
  }

  List<({String sol, String sag})> get _ciftler => widget.alistirma.ciftler;

  void _solSec(int i) {
    if (widget.kontrolEdildi) return;
    setState(() {
      if (_eslesen.containsKey(i)) {
        _eslesen.remove(i);
        _seciliSol = i;
      } else {
        _seciliSol = _seciliSol == i ? null : i;
      }
    });
    _bildir();
  }

  void _sagSec(int sag) {
    if (widget.kontrolEdildi) return;
    setState(() {
      final mevcut = _eslesen.entries
          .where((e) => e.value == sag)
          .map((e) => e.key);
      if (mevcut.isNotEmpty) {
        _eslesen.remove(mevcut.first);
      } else if (_seciliSol != null) {
        _eslesen[_seciliSol!] = sag;
        _seciliSol = null;
      }
    });
    _bildir();
  }

  void _bildir() {
    if (_eslesen.length != _ciftler.length) {
      widget.onCevap(null);
      return;
    }
    widget.onCevap(<({String sol, String sag})>[
      for (final e in _eslesen.entries)
        (sol: _ciftler[e.key].sol, sag: _ciftler[e.value].sag),
    ]);
  }

  int? _numara(int sol) {
    if (!_eslesen.containsKey(sol)) return null;
    return sol + 1;
  }

  int? _sagNumara(int sag) {
    for (final e in _eslesen.entries) {
      if (e.value == sag) return e.key + 1;
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SoruBasligi(
          widget.alistirma.soru,
          ipucu: 'Önce soldan, sonra sağdan bir öğe seç.',
        ),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                children: [
                  for (var i = 0; i < _ciftler.length; i++)
                    _oge(
                      metin: _ciftler[i].sol,
                      numara: _numara(i),
                      secili: _seciliSol == i,
                      dogru: widget.kontrolEdildi && _eslesen[i] == i,
                      yanlis:
                          widget.kontrolEdildi &&
                          _eslesen.containsKey(i) &&
                          _eslesen[i] != i,
                      onTap: () => _solSec(i),
                    ),
                ],
              ),
            ),
            const SizedBox(width: Olcu.b2),
            Expanded(
              child: Column(
                children: [
                  for (final s in _sagSira)
                    _oge(
                      metin: _ciftler[s].sag,
                      numara: _sagNumara(s),
                      secili: false,
                      dogru: widget.kontrolEdildi && _sagNumara(s) == s + 1,
                      yanlis:
                          widget.kontrolEdildi &&
                          _sagNumara(s) != null &&
                          _sagNumara(s) != s + 1,
                      onTap: () => _sagSec(s),
                    ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _oge({
    required String metin,
    required int? numara,
    required bool secili,
    required bool dogru,
    required bool yanlis,
    required VoidCallback onTap,
  }) {
    final r = context.renkler;
    final kenar = dogru
        ? r.dogru
        : yanlis
        ? r.hata
        : (secili || numara != null)
        ? r.ana
        : r.kenar;
    final durum = dogru
        ? 'doğru eşleşme'
        : yanlis
        ? 'yanlış eşleşme'
        : numara != null
        ? 'eşleşti, numara $numara'
        : secili
        ? 'seçili'
        : '';
    return Padding(
      padding: const EdgeInsets.only(bottom: Olcu.b1),
      child: Semantics(
        button: true,
        selected: secili,
        label: durum.isEmpty ? metin : '$metin, $durum',
        excludeSemantics: true,
        onTap: widget.kontrolEdildi ? null : onTap,
        child: Material(
          color: secili ? r.yuzey : r.zemin,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Olcu.kose),
            side: BorderSide(
              color: kenar,
              width: (secili || numara != null) ? 2 : 1,
            ),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(Olcu.kose),
            onTap: widget.kontrolEdildi ? null : onTap,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 56),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: Olcu.b2,
                  vertical: Olcu.b1,
                ),
                child: Row(
                  children: [
                    if (numara != null) ...[
                      Icon(
                        dogru
                            ? Icons.check_circle
                            : yanlis
                            ? Icons.cancel
                            : Icons.link,
                        color: kenar,
                        size: 20,
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '$numara',
                        style: Theme.of(
                          context,
                        ).textTheme.labelLarge?.copyWith(color: kenar),
                      ),
                      const SizedBox(width: Olcu.b1),
                    ],
                    Expanded(
                      child: Text(
                        metin,
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
