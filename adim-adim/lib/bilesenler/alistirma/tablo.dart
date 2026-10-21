import 'package:flutter/material.dart';

import '../../model/icerik.dart';
import '../../tema/tema.dart';
import 'soru_basligi.dart';

/// Tablo tamamlama (fiil çekimi vb.): boş hücreler seçenekten (`secenekler`
/// doluysa; önce boş hücreye, sonra seçeneğe dokun) ya da yazarak doldurulur.
/// Tablo dar ekranda yatay kayar. Tüm hücreler dolunca cevap
/// ([List<String>], boş hücre sırasıyla) bildirilir.
class TabloGorunumu extends StatefulWidget {
  const TabloGorunumu({
    super.key,
    required this.alistirma,
    required this.kontrolEdildi,
    required this.onCevap,
  });
  final Tablo alistirma;
  final bool kontrolEdildi;
  final ValueChanged<Object?> onCevap;

  @override
  State<TabloGorunumu> createState() => _TabloDurumu();
}

class _TabloDurumu extends State<TabloGorunumu> {
  static const double _hucreGenislik = 120;

  late final List<String?> _degerler = List.filled(
    widget.alistirma.bos.length,
    null,
  );
  late final List<TextEditingController> _denetciler = [
    for (final _ in widget.alistirma.bos) TextEditingController(),
  ];
  int _aktif = 0;

  bool get _secenekli => widget.alistirma.secenekler.isNotEmpty;

  @override
  void dispose() {
    for (final d in _denetciler) {
      d.dispose();
    }
    super.dispose();
  }

  void _bildir() {
    final tam = _degerler.every((d) => d != null && d.trim().isNotEmpty);
    widget.onCevap(tam ? [for (final d in _degerler) d!] : null);
  }

  void _yaz(int k, String v) {
    _degerler[k] = v.trim().isEmpty ? null : v;
    _bildir();
  }

  void _sec(String secenek) {
    if (widget.kontrolEdildi || _degerler.isEmpty) return;
    setState(() {
      _degerler[_aktif] = secenek;
      final siradaki = _degerler.indexWhere((d) => d == null);
      if (siradaki >= 0) _aktif = siradaki;
    });
    _bildir();
  }

  bool? _dogruMu(int k) {
    if (!widget.kontrolEdildi) return null;
    final d = _degerler[k];
    final dogru = widget.alistirma.hucre(widget.alistirma.bos[k]);
    if (d == null) return false;
    return _norm(d) == _norm(dogru);
  }

  static String _norm(String s) =>
      s.trim().toLowerCase().replaceAll(RegExp(r'\s+'), ' ');

  @override
  Widget build(BuildContext context) {
    final a = widget.alistirma;
    final r = context.renkler;
    final bosIndeks = <String, int>{
      for (var k = 0; k < a.bos.length; k++)
        '${a.bos[k].satir},${a.bos[k].sutun}': k,
    };
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SoruBasligi(
          a.soru,
          ipucu: _secenekli
              ? 'Boş hücreye dokun, sonra doğru seçeneği seç.'
              : 'Boş hücreleri yazarak doldur.',
        ),
        Semantics(
          container: true,
          label: 'Tablo, ${a.satirlar.length} satır, ${a.baslik.length} sütun',
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Table(
              defaultColumnWidth: const FixedColumnWidth(_hucreGenislik),
              border: TableBorder.all(color: r.kenar),
              defaultVerticalAlignment: TableCellVerticalAlignment.middle,
              children: [
                TableRow(
                  decoration: BoxDecoration(color: r.yuzey),
                  children: [
                    for (final b in a.baslik)
                      _metinHucre(b, kalin: true, baslik: true),
                  ],
                ),
                for (var s = 0; s < a.satirlar.length; s++)
                  TableRow(
                    children: [
                      for (var c = 0; c < a.satirlar[s].length; c++)
                        bosIndeks.containsKey('$s,$c')
                            ? _bosHucre(bosIndeks['$s,$c']!, s, c)
                            : _metinHucre(a.satirlar[s][c], kalin: c == 0),
                    ],
                  ),
              ],
            ),
          ),
        ),
        if (_secenekli) ...[
          const SizedBox(height: Olcu.b3),
          Wrap(
            spacing: Olcu.b1,
            runSpacing: Olcu.b1,
            children: [for (final o in a.secenekler) _secenekDugmesi(o)],
          ),
        ],
      ],
    );
  }

  Widget _metinHucre(String metin, {bool kalin = false, bool baslik = false}) {
    final yazi = Theme.of(context).textTheme.bodyLarge;
    return Semantics(
      header: baslik,
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b1),
        child: Text(
          metin,
          style: kalin ? yazi?.copyWith(fontWeight: FontWeight.w700) : yazi,
        ),
      ),
    );
  }

  Widget _bosHucre(int k, int satir, int sutun) {
    final a = widget.alistirma;
    final r = context.renkler;
    final dogru = _dogruMu(k);
    final renk = dogru == null ? r.kenar : (dogru ? r.dogru : r.hata);
    final etiket = '${a.satirlar[satir][0]}, ${a.baslik[sutun]}';
    if (!_secenekli) {
      return Padding(
        padding: const EdgeInsets.all(Olcu.b1),
        child: Semantics(
          label: etiket,
          child: TextField(
            controller: _denetciler[k],
            readOnly: widget.kontrolEdildi,
            autocorrect: false,
            enableSuggestions: false,
            maxLength: 40,
            textInputAction: k == a.bos.length - 1
                ? TextInputAction.done
                : TextInputAction.next,
            decoration: InputDecoration(
              isDense: true,
              counterText: '',
              hintText: '?',
              enabledBorder: dogru == null
                  ? null
                  : OutlineInputBorder(
                      borderSide: BorderSide(color: renk, width: 2),
                    ),
              suffixIcon: dogru == null
                  ? null
                  : Icon(
                      dogru ? Icons.check_circle : Icons.cancel,
                      color: renk,
                      size: 20,
                    ),
            ),
            onChanged: (v) => _yaz(k, v),
          ),
        ),
      );
    }
    final deger = _degerler[k];
    final aktif = _aktif == k && !widget.kontrolEdildi;
    final durum = dogru == null
        ? (deger ?? 'boş')
        : (dogru
              ? '$deger, doğru'
              : '${deger ?? 'boş'}, yanlış, doğru cevap ${a.hucre(a.bos[k])}');
    return Semantics(
      button: true,
      selected: aktif,
      enabled: !widget.kontrolEdildi,
      label: '$etiket: $durum',
      excludeSemantics: true,
      onTap: widget.kontrolEdildi ? null : () => setState(() => _aktif = k),
      child: InkWell(
        onTap: widget.kontrolEdildi ? null : () => setState(() => _aktif = k),
        child: Container(
          constraints: const BoxConstraints(minHeight: Olcu.hedef),
          margin: const EdgeInsets.all(2),
          padding: const EdgeInsets.all(Olcu.b1),
          decoration: BoxDecoration(
            color: aktif ? r.yuzey : null,
            border: Border.all(color: aktif ? r.ana : renk, width: 2),
            borderRadius: BorderRadius.circular(Olcu.b1),
          ),
          alignment: Alignment.centerLeft,
          child: Row(
            children: [
              if (dogru != null) ...[
                Icon(
                  dogru ? Icons.check_circle : Icons.cancel,
                  color: renk,
                  size: 20,
                ),
                const SizedBox(width: 4),
              ],
              Flexible(
                child: Text(
                  deger ?? '___',
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _secenekDugmesi(String o) {
    final r = context.renkler;
    final kontrol = widget.kontrolEdildi;
    return Semantics(
      button: true,
      enabled: !kontrol,
      label: o,
      hint: 'Seçili boş hücreye yerleştirmek için dokun',
      excludeSemantics: true,
      onTap: kontrol ? null : () => _sec(o),
      child: ConstrainedBox(
        constraints: const BoxConstraints(
          minHeight: Olcu.hedef,
          minWidth: Olcu.hedef,
        ),
        child: Material(
          color: r.zemin,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(Olcu.kose),
            side: BorderSide(color: r.kenar),
          ),
          child: InkWell(
            borderRadius: BorderRadius.circular(Olcu.kose),
            onTap: kontrol ? null : () => _sec(o),
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: Olcu.b2,
                vertical: Olcu.b1 + 4,
              ),
              child: Text(o, style: Theme.of(context).textTheme.bodyLarge),
            ),
          ),
        ),
      ),
    );
  }
}
