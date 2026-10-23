import 'package:flutter/material.dart';

import '../model/dilbilgisi_ipucu.dart';
import '../model/icerik.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';
import 'alistirma/alistirma_karti.dart';
import 'alistirma/dogru_cevap.dart';
import 'cikis_sayfasi.dart';
import 'geri_bildirim_bandi.dart';
import 'kombo.dart';

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
    this.ipucuAcik = true,
    this.ust,
    this.dilbilgisiIpucu,
    this.cikisOnayi = true,
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

  /// false: kademeli ipucu kapalı (efsanevi zor tekrar); yanlış cevaptan sonra
  /// yalnız "Devam" görünür.
  final bool ipucuAcik;

  /// Her sorunun üstüne (alıştırma kartından önce) konan ek bileşen; ör. radyo
  /// etkinliklerinde "dinle" düğmesi. Parametre alıştırma indeksidir.
  final Widget? Function(int indeks)? ust;

  /// Dersin dilbilgisi ipucu; yanlış cevapta bantta kısa "İpucu" kutusu olarak
  /// görünür (null: yalnız doğru cevap ve açıklama).
  final DilbilgisiIpucu? dilbilgisiIpucu;

  /// true: en az bir soru cevaplandıktan sonra kapat düğmesi ve sistem geri
  /// hareketi "İlerlemeni kaybedeceksin" alt sayfasını açar; hiç cevap yoksa
  /// sormadan [onKapat] çağrılır. Kendi onay penceresi olan ekranlar false verir.
  final bool cikisOnayi;

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

  /// Bu oturumda cevaplanan (ilk cevabı verilen) soru sayısı.
  int _cevaplanan = 0;

  /// Art arda doğru sayısı (yalnız ilk cevaplar; yanlışta sıfırlanır).
  int _kombo = 0;

  /// Çıkış alt sayfası şu an açık mı (çift açılmayı önler).
  bool _cikisAcik = false;

  Alistirma get _simdiki => widget.alistirmalar[_indeks];
  bool get _son => _indeks == widget.alistirmalar.length - 1;
  bool get _ipucuKaldi =>
      widget.ipucuAcik && _ipucuAdim < Motor.ipucuAdimSayisi;

  List<String> get _ipuclar => [
    for (var i = 0; i < _ipucuAdim; i++) Motor.ipucuUret(_simdiki, i),
  ];

  /// Bant açıklaması: yanlış cevaba özel mesaj (Hamle türünde
  /// `hataMesajlari`) varsa önce o, sonra alıştırmanın açıklaması.
  String? get _aciklama {
    final ozel = _dogruMu ? null : Motor.hataMesaji(_simdiki, _cevap);
    final genel = _simdiki.aciklama;
    if (ozel == null || ozel.isEmpty) return genel;
    return (genel == null || genel.isEmpty) ? ozel : '$ozel\n$genel';
  }

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
      if (ilk) {
        _cevaplanan++;
        _kombo = Kombo.sonraki(_kombo, dogru);
      }
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

  /// Çıkış isteği (kapat düğmesi ya da sistem geri hareketi): hiç cevap yoksa
  /// ya da onay kapalıysa doğrudan çıkar; aksi halde alt sayfa sorar.
  Future<void> _cikisIste() async {
    if (!widget.cikisOnayi || _cevaplanan == 0) {
      widget.onKapat();
      return;
    }
    if (_cikisAcik) return;
    _cikisAcik = true;
    final cik = await cikisSayfasiGoster(context);
    _cikisAcik = false;
    if (cik && mounted) widget.onKapat();
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

  /// Alıştırma kartı; [AlistirmaOturumu.ust] varsa onun altında.
  Widget _kart() {
    final kart = AlistirmaKarti(
      // İpucu alınınca kart sıfırlanır: yeniden cevaplanır.
      key: ValueKey('$_indeks-$_ipucuAdim'),
      alistirma: _simdiki,
      kontrolEdildi: _kontrolEdildi,
      dogruMu: _dogruMu,
      onCevap: (c) => setState(() => _cevap = c),
      onGonder: _kontrol,
    );
    final ust = widget.ust?.call(_indeks);
    if (ust == null) return kart;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [ust, kart],
    );
  }

  @override
  Widget build(BuildContext context) {
    final toplam = widget.alistirmalar.length;
    final oran = (_indeks + (_kontrolEdildi ? 1 : 0)) / toplam;
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final not = widget.notGetir?.call(_indeks);
    final yanlisVeIpucuVar = _kontrolEdildi && !_dogruMu && _ipucuKaldi;
    final komboRenk = Kombo.renk(r, Kombo.asama(_kombo));
    final komboEtiket = Kombo.etiket(_kombo);
    final icerik = Column(
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
                onPressed: _cikisIste,
              ),
              Expanded(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Semantics(
                      label: 'Alıştırma ${_indeks + 1} / $toplam',
                      excludeSemantics: true,
                      child: TweenAnimationBuilder<double>(
                        tween: Tween(begin: 0, end: oran),
                        duration: Olcu.sure(context, 250),
                        builder: (context, v, _) =>
                            TweenAnimationBuilder<Color?>(
                              key: const Key('ilerleme-cubugu'),
                              tween: ColorTween(end: komboRenk),
                              duration: Olcu.sure(context, 250),
                              builder: (context, renk, _) => ClipRRect(
                                borderRadius: BorderRadius.circular(Olcu.b1),
                                child: LinearProgressIndicator(
                                  value: v,
                                  minHeight: 12,
                                  color: renk,
                                  backgroundColor: r.kenar,
                                ),
                              ),
                            ),
                      ),
                    ),
                    if (komboEtiket != null)
                      Align(
                        alignment: Alignment.centerRight,
                        child: Semantics(
                          label: 'Art arda $_kombo doğru',
                          excludeSemantics: true,
                          child: Padding(
                            padding: const EdgeInsets.only(top: 4),
                            child: Text(
                              komboEtiket,
                              key: const Key('kombo-etiketi'),
                              style: yazi.labelLarge?.copyWith(
                                color: r.metin,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ),
                      ),
                  ],
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
                child: _kart(),
              ),
            ),
          ),
        ),
        if (_kontrolEdildi)
          GeriBildirimBandi(
            dogruMu: _dogruMu,
            aciklama: _aciklama,
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
            dilbilgisiIpucu: widget.dilbilgisiIpucu,
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
    return PopScope(
      canPop: !widget.cikisOnayi || _cevaplanan == 0,
      onPopInvokedWithResult: (gecti, _) {
        if (!gecti) _cikisIste();
      },
      child: icerik,
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
