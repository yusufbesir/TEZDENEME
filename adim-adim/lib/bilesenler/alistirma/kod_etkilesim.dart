import 'package:flutter/material.dart';

import '../../model/icerik.dart';
import '../../tema/tema.dart';
import 'soru_basligi.dart';

/// Kod bloğu kutusu (JetBrains Mono, yatay kaydırma). [cocuk] verilmezse
/// [metin] düz gösterilir. Kod her zaman metin olarak gösterilir, yorumlanmaz.
class KodKutusu extends StatelessWidget {
  const KodKutusu({
    super.key,
    this.metin = '',
    this.cocuk,
    this.dil,
    this.semantik,
  });
  final String metin;
  final Widget? cocuk;
  final String? dil;
  final String? semantik;

  static TextStyle? stil(BuildContext context) => Theme.of(
    context,
  ).textTheme.bodyLarge?.copyWith(fontFamily: yaziKod, height: 1.5);

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    return Semantics(
      label: semantik ?? '${(dil ?? '').toUpperCase()} kodu: $metin',
      excludeSemantics: true,
      child: Container(
        width: double.infinity,
        margin: const EdgeInsets.only(bottom: Olcu.b3),
        padding: const EdgeInsets.all(Olcu.b2),
        decoration: BoxDecoration(
          color: r.yuzey,
          borderRadius: BorderRadius.circular(Olcu.kose),
          border: Border.all(color: r.kenar),
        ),
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: cocuk ?? Text(metin, style: stil(context)),
        ),
      ),
    );
  }
}

/// Kodda çoklu boşluk (ÖZELLİK 68): parça bankasındaki bir parçaya dokunmak
/// sıradaki boş yere yerleştirir; dolu boşluğa dokunmak onu boşaltır.
class KodBoslukDoldurGorunumu extends StatefulWidget {
  const KodBoslukDoldurGorunumu({
    super.key,
    required this.alistirma,
    required this.kontrolEdildi,
    required this.onCevap,
  });
  final KodBoslukDoldur alistirma;
  final bool kontrolEdildi;
  final ValueChanged<Object?> onCevap;

  @override
  State<KodBoslukDoldurGorunumu> createState() => _KodBoslukDurumu();
}

class _KodBoslukDurumu extends State<KodBoslukDoldurGorunumu> {
  late final List<String?> _dolu = List.filled(
    widget.alistirma.boslukSayisi,
    null,
  );

  void _bildir() {
    widget.onCevap(
      _dolu.isNotEmpty && _dolu.every((e) => e != null)
          ? List<String>.from(_dolu)
          : null,
    );
  }

  void _yerlestir(String parca) {
    if (widget.kontrolEdildi) return;
    final i = _dolu.indexOf(null);
    if (i < 0) return;
    setState(() => _dolu[i] = parca);
    _bildir();
  }

  void _bosalt(int i) {
    if (widget.kontrolEdildi || _dolu[i] == null) return;
    setState(() => _dolu[i] = null);
    _bildir();
  }

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final a = widget.alistirma;
    final bolumler = a.kod.split('___');
    final kontrol = widget.kontrolEdildi;
    final stil = KodKutusu.stil(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SoruBasligi(
          a.soru,
          ipucu:
              'Parçaya dokun, sıradaki boşluğa yerleşir. '
              'Dolu boşluğa dokunursan boşalır.',
        ),
        KodKutusu(
          dil: a.dil,
          semantik:
              '${a.dil.toUpperCase()} kodu: ${a.doldur([for (final d in _dolu) d ?? 'boşluk'])}',
          cocuk: Wrap(
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              for (var i = 0; i < bolumler.length; i++) ...[
                Text(bolumler[i], style: stil),
                if (i < bolumler.length - 1) _bosluk(i, r, stil, kontrol),
              ],
            ],
          ),
        ),
        Wrap(
          spacing: Olcu.b1,
          runSpacing: Olcu.b1,
          children: [
            for (var i = 0; i < a.secenekler.length; i++)
              ActionChip(
                key: ValueKey('kod-parca-$i'),
                label: Text(
                  a.secenekler[i],
                  style: stil?.copyWith(fontSize: 15),
                ),
                onPressed: kontrol || !_dolu.contains(null)
                    ? null
                    : () => _yerlestir(a.secenekler[i]),
              ),
          ],
        ),
      ],
    );
  }

  Widget _bosluk(int i, AdimRenkleri r, TextStyle? stil, bool kontrol) {
    final d = _dolu[i];
    final a = widget.alistirma;
    final dogru =
        kontrol && i < a.dogru.length && d?.trim() == a.dogru[i].trim();
    final renk = kontrol ? (dogru ? r.dogru : r.hata) : r.ana;
    return Semantics(
      button: true,
      label: d == null
          ? 'Boşluk ${i + 1}, boş'
          : 'Boşluk ${i + 1}: $d${kontrol ? (dogru ? ', doğru' : ', yanlış') : ''}',
      excludeSemantics: true,
      child: InkWell(
        key: ValueKey('kod-bosluk-$i'),
        onTap: () => _bosalt(i),
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 2),
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: renk, width: 2)),
          ),
          child: Text(
            d ?? '   ',
            style: stil?.copyWith(color: renk, fontWeight: FontWeight.w700),
          ),
        ),
      ),
    );
  }
}

/// Kod parçası seçme (ÖZELLİK 68): koddaki doğru satır(lar)a dokunulur.
class KodParcaSecGorunumu extends StatefulWidget {
  const KodParcaSecGorunumu({
    super.key,
    required this.alistirma,
    required this.kontrolEdildi,
    required this.onCevap,
  });
  final KodParcaSec alistirma;
  final bool kontrolEdildi;
  final ValueChanged<Object?> onCevap;

  @override
  State<KodParcaSecGorunumu> createState() => _KodParcaSecDurumu();
}

class _KodParcaSecDurumu extends State<KodParcaSecGorunumu> {
  final Set<int> _secili = {};

  void _degistir(int i) {
    if (widget.kontrolEdildi) return;
    setState(() => _secili.contains(i) ? _secili.remove(i) : _secili.add(i));
    widget.onCevap(_secili.isEmpty ? null : (_secili.toList()..sort()));
  }

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final a = widget.alistirma;
    final satirlar = a.satirlar;
    final kontrol = widget.kontrolEdildi;
    final stil = KodKutusu.stil(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SoruBasligi(a.soru, ipucu: 'Doğru satıra dokun (birden çok olabilir).'),
        for (var i = 0; i < satirlar.length; i++)
          if (satirlar[i].trim().isNotEmpty)
            Builder(
              builder: (context) {
                final secili = _secili.contains(i);
                final dogruSatir = a.dogru.contains(i);
                final dogruIsaret = kontrol && dogruSatir;
                final yanlis = kontrol && secili && !dogruSatir;
                final kenar = dogruIsaret
                    ? r.dogru
                    : yanlis
                    ? r.hata
                    : secili
                    ? r.ana
                    : r.kenar;
                final durum = dogruIsaret
                    ? (secili ? 'doğru, seçili' : 'doğru satır, seçmedin')
                    : yanlis
                    ? 'yanlış seçim'
                    : secili
                    ? 'seçili'
                    : '';
                return Padding(
                  padding: const EdgeInsets.only(bottom: 4),
                  child: Semantics(
                    button: true,
                    selected: secili,
                    label:
                        'Satır ${i + 1}: ${satirlar[i].trim()}${durum.isEmpty ? '' : ', $durum'}',
                    excludeSemantics: true,
                    child: Material(
                      color: secili ? r.yuzey : r.zemin,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(Olcu.b1),
                        side: BorderSide(
                          color: kenar,
                          width: secili || dogruIsaret ? 2 : 1,
                        ),
                      ),
                      child: InkWell(
                        key: ValueKey('kod-satir-$i'),
                        borderRadius: BorderRadius.circular(Olcu.b1),
                        onTap: kontrol ? null : () => _degistir(i),
                        child: ConstrainedBox(
                          constraints: const BoxConstraints(
                            minHeight: Olcu.hedef - 8,
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: Olcu.b1,
                              vertical: 4,
                            ),
                            child: Row(
                              children: [
                                SizedBox(
                                  width: 28,
                                  child: Text(
                                    '${i + 1}',
                                    style: stil?.copyWith(
                                      color: r.metinIkincil,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                                Expanded(
                                  child: SingleChildScrollView(
                                    scrollDirection: Axis.horizontal,
                                    child: Text(satirlar[i], style: stil),
                                  ),
                                ),
                                if (dogruIsaret || yanlis)
                                  Icon(
                                    dogruIsaret
                                        ? Icons.check_circle
                                        : Icons.cancel,
                                    size: 20,
                                    color: kenar,
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
      ],
    );
  }
}

/// Yazarak cevaplanan kod alıştırmaları için ortak alan (tek ya da çok
/// satır, JetBrains Mono, otomatik düzeltme kapalı).
class KodYaziAlani extends StatelessWidget {
  const KodYaziAlani({
    super.key,
    required this.denetci,
    required this.etiket,
    required this.kontrolEdildi,
    required this.dogruMu,
    required this.onDegisti,
    this.cokSatir = false,
    this.onGonder,
    this.enCok = 200,
  });
  final TextEditingController denetci;
  final String etiket;
  final bool kontrolEdildi;
  final bool dogruMu;
  final ValueChanged<String> onDegisti;
  final bool cokSatir;
  final VoidCallback? onGonder;
  final int enCok;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final kontrol = kontrolEdildi;
    return TextField(
      controller: denetci,
      readOnly: kontrol,
      maxLength: enCok,
      minLines: cokSatir ? 3 : 1,
      maxLines: cokSatir ? 12 : 1,
      keyboardType: cokSatir ? TextInputType.multiline : TextInputType.text,
      textInputAction: cokSatir
          ? TextInputAction.newline
          : TextInputAction.done,
      autocorrect: false,
      enableSuggestions: false,
      style: KodKutusu.stil(context),
      decoration: InputDecoration(
        labelText: etiket,
        counterText: '',
        alignLabelWithHint: cokSatir,
        suffixIcon: kontrol
            ? Icon(
                dogruMu ? Icons.check_circle : Icons.cancel,
                color: dogruMu ? r.dogru : r.hata,
              )
            : null,
        enabledBorder: kontrol
            ? OutlineInputBorder(
                borderRadius: BorderRadius.circular(Olcu.kose),
                borderSide: BorderSide(
                  color: dogruMu ? r.dogru : r.hata,
                  width: 2,
                ),
              )
            : null,
      ),
      onChanged: onDegisti,
      onSubmitted: cokSatir
          ? null
          : (v) {
              if (!kontrol && v.trim().isNotEmpty) onGonder?.call();
            },
    );
  }
}

/// Anahtar sözcüğü yazma (ÖZELLİK 68): kodun boşluğu (`___`) yazılarak
/// doldurulur; büyük/küçük harf duyarlı.
class KodYazGorunumu extends StatefulWidget {
  const KodYazGorunumu({
    super.key,
    required this.alistirma,
    required this.kontrolEdildi,
    required this.dogruMu,
    required this.onCevap,
    required this.onGonder,
  });
  final KodYaz alistirma;
  final bool kontrolEdildi;
  final bool dogruMu;
  final ValueChanged<Object?> onCevap;
  final VoidCallback onGonder;

  @override
  State<KodYazGorunumu> createState() => _KodYazDurumu();
}

class _KodYazDurumu extends State<KodYazGorunumu> {
  final _denetci = TextEditingController();

  @override
  void dispose() {
    _denetci.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final a = widget.alistirma;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SoruBasligi(a.soru, ipucu: 'Büyük/küçük harfe dikkat et.'),
        KodKutusu(metin: a.kod, dil: a.dil),
        KodYaziAlani(
          key: const ValueKey('kod-yaz-alani'),
          denetci: _denetci,
          etiket: 'Boşluğa geleni yaz',
          kontrolEdildi: widget.kontrolEdildi,
          dogruMu: widget.dogruMu,
          onDegisti: (v) => widget.onCevap(v.trim().isEmpty ? null : v),
          onGonder: widget.onGonder,
          enCok: 80,
        ),
      ],
    );
  }
}

/// Çıktıyı yaz (ÖZELLİK 69): kod gösterilir, çıktısı yazılır; çalıştırma yok.
class KodCiktiGorunumu extends StatefulWidget {
  const KodCiktiGorunumu({
    super.key,
    required this.alistirma,
    required this.kontrolEdildi,
    required this.dogruMu,
    required this.onCevap,
  });
  final KodCikti alistirma;
  final bool kontrolEdildi;
  final bool dogruMu;
  final ValueChanged<Object?> onCevap;

  @override
  State<KodCiktiGorunumu> createState() => _KodCiktiDurumu();
}

class _KodCiktiDurumu extends State<KodCiktiGorunumu> {
  final _denetci = TextEditingController();

  @override
  void dispose() {
    _denetci.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final a = widget.alistirma;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SoruBasligi(
          a.soru,
          ipucu: 'Her çıktı satırını ayrı satıra yaz (Enter).',
        ),
        KodKutusu(metin: a.kod, dil: a.dil),
        KodYaziAlani(
          key: const ValueKey('kod-cikti-alani'),
          denetci: _denetci,
          etiket: 'Çıktı',
          cokSatir: true,
          kontrolEdildi: widget.kontrolEdildi,
          dogruMu: widget.dogruMu,
          onDegisti: (v) => widget.onCevap(v.trim().isEmpty ? null : v),
          enCok: 1000,
        ),
      ],
    );
  }
}
