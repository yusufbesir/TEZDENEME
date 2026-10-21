import 'package:flutter/material.dart';

import '../tema/tema.dart';

enum BasamakDurumu { tamam, siradaki, kilitli }

/// Yol düğümü: bir ders = bir basamak.
/// Tamamlanan: dolu ana renk + onay simgesi. Sıradaki: vurgulu, hafif büyük,
/// "Başla" etiketi. Kilitli: soluk + kilit simgesi.
class Basamak extends StatelessWidget {
  const Basamak({
    super.key,
    required this.no,
    required this.ad,
    required this.durum,
    required this.alistirmaSayisi,
    this.tekrarSayisi = 0,
    this.tahminiDakika,
    this.temel = false,
    this.onTap,
  });

  final int no;
  final String ad;
  final BasamakDurumu durum;
  final int alistirmaSayisi;
  final int tekrarSayisi;

  /// Tahmini süre (dakika) ve temel kavram işareti (ÖZELLİK 71); null: gösterme.
  final int? tahminiDakika;
  final bool temel;
  final VoidCallback? onTap;

  String get _durumMetni => switch (durum) {
    BasamakDurumu.tamam =>
      tekrarSayisi > 1 ? 'Tamamlandı · $tekrarSayisi kez' : 'Tamamlandı',
    BasamakDurumu.siradaki => 'Sıradaki ders',
    BasamakDurumu.kilitli => 'Kilitli · önceki dersi bitir',
  };

  String? get _metaMetni => tahminiDakika == null
      ? null
      : '~$tahminiDakika dk${temel ? ' · Temel kavram' : ''}';

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final tamam = durum == BasamakDurumu.tamam;
    final sira = durum == BasamakDurumu.siradaki;
    final kilitli = durum == BasamakDurumu.kilitli;

    final zemin = tamam ? r.ana : r.yuzey;
    final onRenk = tamam ? r.anaUstu : (kilitli ? r.metinIkincil : r.metin);
    final ikincil = tamam ? r.anaUstu : r.metinIkincil;
    final simge = tamam
        ? Icons.check_circle
        : (kilitli ? Icons.lock_outline : Icons.play_circle_fill);

    final icerik = Material(
      color: zemin,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Olcu.kose),
        side: BorderSide(
          color: sira ? r.ana : (tamam ? r.ana : r.kenar),
          width: sira ? 3 : 1,
        ),
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(Olcu.kose),
        onTap: onTap,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 72),
          child: Padding(
            padding: const EdgeInsets.all(Olcu.b2),
            child: Row(
              children: [
                SizedBox(
                  width: Olcu.hedef,
                  height: Olcu.hedef,
                  child: Icon(
                    simge,
                    size: sira ? 40 : 32,
                    color: sira ? r.ana : onRenk,
                  ),
                ),
                const SizedBox(width: Olcu.b2),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '$no. $ad',
                        style: yazi.titleMedium?.copyWith(color: onRenk),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$_durumMetni · $alistirmaSayisi alıştırma',
                        style: yazi.bodySmall?.copyWith(color: ikincil),
                      ),
                      if (_metaMetni != null)
                        Text(
                          _metaMetni!,
                          style: yazi.bodySmall?.copyWith(color: ikincil),
                        ),
                    ],
                  ),
                ),
                if (sira) ...[
                  const SizedBox(width: Olcu.b1),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: Olcu.b2,
                      vertical: Olcu.b1,
                    ),
                    decoration: BoxDecoration(
                      color: r.ana,
                      borderRadius: BorderRadius.circular(Olcu.kose),
                    ),
                    child: Text(
                      'Başla',
                      style: yazi.labelLarge?.copyWith(color: r.anaUstu),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );

    return Semantics(
      container: true,
      button: !kilitli,
      enabled: !kilitli,
      label:
          '$no. ders, $ad. $_durumMetni. $alistirmaSayisi alıştırma.'
          '${_metaMetni == null ? '' : ' $_metaMetni.'}',
      excludeSemantics: true,
      onTap: onTap,
      child: AnimatedScale(
        scale: sira ? 1.03 : 1,
        duration: Olcu.sure(context),
        child: icerik,
      ),
    );
  }
}
