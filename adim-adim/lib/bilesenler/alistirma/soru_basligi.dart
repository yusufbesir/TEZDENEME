import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../durum/saglayicilar.dart';
import '../../motor/kelime_anlami.dart';
import '../../tema/tema.dart';

/// Alıştırma soru metni (Nunito başlık).
///
/// Kelime çeviri balonu: soru metnindeki İngilizce kelimeye dokununca anlamı
/// sözlükte/ders verisinde biliniyorsa metnin altında küçük bir balon
/// ("cat = kedi") açılır; anlam bilinmiyorsa hiçbir şey açılmaz. Balona ya da
/// aynı kelimeye tekrar dokunmak onu kapatır. `"X" ne demektir?` sorularında
/// cevabı vermemek için balon kapalıdır. Metin düz `Text` olarak kalır;
/// dokunulan kelime, metin yerleşimi (TextPainter) ile bulunur.
class SoruBasligi extends StatefulWidget {
  const SoruBasligi(this.metin, {super.key, this.ipucu});
  final String metin;
  final String? ipucu;

  @override
  State<SoruBasligi> createState() => _SoruBasligiDurumu();
}

class _SoruBasligiDurumu extends State<SoruBasligi> {
  static final RegExp _kelime = RegExp(r"[A-Za-z]+(?:'[A-Za-z]+)?");

  ({String kelime, String anlam})? _balon;

  /// Cevabı ele vermemek için "ne demektir?" sorularında balon yok.
  bool get _balonAcik => !widget.metin.contains('ne demektir');

  /// Sağlayıcı kapsamı yoksa (yalın widget testleri) null; sözlük yalnız
  /// dokunuşta okunur, soru çizilirken hesaplanmaz.
  String? _anlam(String kelime) {
    try {
      final kap = ProviderScope.containerOf(context, listen: false);
      return KelimeAnlami.bul(kap.read(sozlukProvider), kelime);
    } catch (_) {
      return null;
    }
  }

  /// Dokunulan noktadaki İngilizce kelime (yoksa null).
  String? _kelimeBul(Offset nokta, double genislik, TextStyle? stil) {
    final tp = TextPainter(
      text: TextSpan(text: widget.metin, style: stil),
      textDirection: Directionality.of(context),
      textScaler: MediaQuery.textScalerOf(context),
    )..layout(maxWidth: genislik);
    final ofset = tp.getPositionForOffset(nokta).offset;
    tp.dispose();
    for (final m in _kelime.allMatches(widget.metin)) {
      if (ofset >= m.start && ofset < m.end) return m.group(0);
    }
    return null;
  }

  void _dokun(Offset nokta, double genislik, TextStyle? stil) {
    final kelime = _kelimeBul(nokta, genislik, stil);
    if (kelime == null) return;
    final anlam = _anlam(kelime);
    setState(() {
      _balon = (anlam == null || _balon?.kelime == kelime)
          ? null
          : (kelime: kelime, anlam: anlam);
    });
  }

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final stil = yazi.headlineSmall;
    return Padding(
      padding: const EdgeInsets.only(bottom: Olcu.b3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            header: true,
            child: LayoutBuilder(
              builder: (context, kutu) => GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTapUp: _balonAcik
                    ? (d) => _dokun(d.localPosition, kutu.maxWidth, stil)
                    : null,
                child: Text(widget.metin, style: stil),
              ),
            ),
          ),
          if (_balon != null) ...[
            const SizedBox(height: Olcu.b1),
            Semantics(
              liveRegion: true,
              container: true,
              label: '${_balon!.kelime}: ${_balon!.anlam}',
              excludeSemantics: true,
              child: GestureDetector(
                key: const Key('kelime-balonu'),
                onTap: () => setState(() => _balon = null),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: Olcu.b2,
                    vertical: Olcu.b1,
                  ),
                  decoration: BoxDecoration(
                    color: r.yuzey,
                    border: Border.all(color: r.ana),
                    borderRadius: BorderRadius.circular(Olcu.kose),
                  ),
                  child: Text(
                    '${_balon!.kelime} = ${_balon!.anlam}',
                    style: yazi.bodyMedium?.copyWith(color: r.metin),
                  ),
                ),
              ),
            ),
          ],
          if (widget.ipucu != null) ...[
            const SizedBox(height: Olcu.b1),
            Text(
              widget.ipucu!,
              style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
            ),
          ],
        ],
      ),
    );
  }
}
