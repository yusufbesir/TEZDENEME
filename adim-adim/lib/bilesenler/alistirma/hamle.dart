import 'package:flutter/material.dart';

import '../../model/icerik.dart';
import '../../satranc/satranc.dart';
import '../../tema/tema.dart';
import 'soru_basligi.dart';

/// Tahtada hamle (satranç): 8x8 tahta, dokun-seç-dokun-oyna. Taşlar Unicode
/// satranç simgeleriyle çizilir (yazı tipi/asset gömülmez). Tahta, sırası
/// gelen tarafın (oyuncunun) bakış açısından gösterilir.
///
/// Akış: kullanıcı hamlesini oynar; ana hatta rakip cevabı varsa ve hamle
/// doğruysa rakip otomatik oynar ve sıra yeniden kullanıcıya geçer. Dizi
/// bitince ya da yanlış hamle oynanınca cevap (oynanan UCI hamleleri)
/// `onCevap` ile verilir; değerlendirmeyi oturum ("Kontrol et") yapar.
/// "Baştan al" konumu sıfırlar ve cevabı geri çeker. Terfide taş seçimi
/// tahtanın altında dört düğmeyle yapılır.
class HamleGorunumu extends StatefulWidget {
  const HamleGorunumu({
    super.key,
    required this.alistirma,
    required this.kontrolEdildi,
    required this.dogruMu,
    required this.onCevap,
  });
  final Hamle alistirma;
  final bool kontrolEdildi;
  final bool dogruMu;
  final ValueChanged<Object?> onCevap;

  /// Tahta kare renkleri (iki temada aynı; taşlar koyu çizilir).
  static const Color acikKare = Color(0xFFF0D9B5);
  static const Color koyuKare = Color(0xFFB58863);

  /// Tahtanın en büyük kenarı (piksel).
  static const double enBuyukKenar = 420;

  @override
  State<HamleGorunumu> createState() => _HamleDurumu();
}

class _HamleDurumu extends State<HamleGorunumu> {
  Konum? _baslangic;
  late Konum _konum;
  final List<String> _oynanan = [];
  int? _secili;
  List<SatrancHamlesi>? _terfiler;
  int? _sonKaynak;
  int? _sonHedef;

  /// Dizi bitti (son hamle oynandı ya da yanlış hamle): giriş kapalı.
  bool _bitti = false;
  String? _durum;

  @override
  void initState() {
    super.initState();
    _yukle();
  }

  @override
  void didUpdateWidget(HamleGorunumu eski) {
    super.didUpdateWidget(eski);
    // Aynı yerde başka bir alıştırma gösterilirse tahta yeniden kurulur.
    if (!identical(eski.alistirma, widget.alistirma)) _yukle();
  }

  void _yukle() {
    _oynanan.clear();
    _secili = null;
    _terfiler = null;
    _sonKaynak = null;
    _sonHedef = null;
    _bitti = false;
    _durum = null;
    try {
      _baslangic = Konum.fen(widget.alistirma.fen);
      _konum = _baslangic!;
    } on FormatException {
      _baslangic = null;
    }
  }

  bool get _girisAcik => !widget.kontrolEdildi && !_bitti && _terfiler == null;

  void _bastan() {
    final b = _baslangic;
    if (b == null) return;
    setState(() {
      _konum = b;
      _oynanan.clear();
      _secili = null;
      _terfiler = null;
      _sonKaynak = null;
      _sonHedef = null;
      _bitti = false;
      _durum = null;
    });
    widget.onCevap(null);
  }

  void _dokun(int kare) {
    if (!_girisAcik) return;
    final tas = _konum.tas(kare);
    final bizim = tas != null && _beyaz(tas) == _konum.beyazSirada;
    final secili = _secili;
    if (secili == null || kare == secili) {
      setState(() {
        _secili = (secili == null && bizim) ? kare : null;
        _durum = null;
      });
      return;
    }
    final hamleler = [
      for (final h in _konum.kareHamleleri(secili))
        if (h.hedef == kare) h,
    ];
    if (hamleler.isEmpty) {
      setState(() {
        _secili = bizim ? kare : null;
        _durum = bizim ? null : 'Bu taş o kareye gidemez.';
      });
      return;
    }
    if (hamleler.length > 1) {
      setState(() => _terfiler = hamleler);
      return;
    }
    _oyna(hamleler.single);
  }

  void _oyna(SatrancHamlesi h) {
    final a = widget.alistirma;
    final beklenen = a.oyuncuHamleleri;
    final san = turkceSan(_konum.san(h));
    var konum = _konum.oyna(h);
    _oynanan.add(h.uci);
    final i = _oynanan.length - 1;
    final sonMu = i >= beklenen.length - 1;
    final dogru =
        i < beklenen.length &&
        (h.uci == beklenen[i] || (sonMu && a.matKabul && konum.mat));
    var kaynak = h.kaynak, hedef = h.hedef;
    String durum;
    var bitti = false;
    if (!dogru || sonMu) {
      bitti = true;
      durum = 'Hamlen: $san. Kontrol et ya da baştan al.';
    } else {
      // Rakibin ana hattaki cevabı otomatik oynanır.
      final cevap = 2 * i + 1 < a.hamleler.length
          ? konum.uciBul(a.hamleler[2 * i + 1])
          : null;
      if (cevap == null) {
        bitti = true;
        durum = 'Hamlen: $san. Kontrol et ya da baştan al.';
      } else {
        final rakipSan = turkceSan(konum.san(cevap));
        konum = konum.oyna(cevap);
        kaynak = cevap.kaynak;
        hedef = cevap.hedef;
        durum = 'İyi hamle: $san. Rakip $rakipSan oynadı; sıra sende.';
      }
    }
    setState(() {
      _konum = konum;
      _secili = null;
      _terfiler = null;
      _sonKaynak = kaynak;
      _sonHedef = hedef;
      _bitti = bitti;
      _durum = durum;
    });
    if (bitti) widget.onCevap(List<String>.of(_oynanan));
  }

  static bool _beyaz(String tas) => tas.toUpperCase() == tas;

  @override
  Widget build(BuildContext context) {
    final a = widget.alistirma;
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final b = _baslangic;
    if (b == null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SoruBasligi(a.soru),
          Text('Tahta yüklenemedi.', style: TextStyle(color: r.hata)),
        ],
      );
    }
    final oyuncuBeyaz = b.beyazSirada;
    final renkAdi = oyuncuBeyaz ? 'Beyaz' : 'Siyah';
    final hedefler = _secili == null
        ? const <int>{}
        : {for (final h in _konum.kareHamleleri(_secili!)) h.hedef};
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SoruBasligi(
          a.soru,
          ipucu: '$renkAdi oynar. Taşa, sonra gideceği kareye dokun.',
        ),
        LayoutBuilder(
          builder: (context, kisit) {
            // Çerçeve (2 x 3 px) tahtanın dışına eklenir.
            final kenar =
                kisit.maxWidth.clamp(0.0, HamleGorunumu.enBuyukKenar) - 6;
            return Center(
              child: _Tahta(
                konum: _konum,
                kenar: kenar,
                beyazAltta: oyuncuBeyaz,
                secili: _secili,
                hedefler: hedefler,
                sonKaynak: _sonKaynak,
                sonHedef: _sonHedef,
                sonuc: widget.kontrolEdildi ? widget.dogruMu : null,
                etkin: _girisAcik,
                onDokun: _dokun,
              ),
            );
          },
        ),
        const SizedBox(height: Olcu.b1),
        if (_terfiler != null) _terfiSecimi(r, yazi),
        if (_durum != null)
          Semantics(
            liveRegion: true,
            child: Padding(
              padding: const EdgeInsets.only(top: Olcu.b1),
              child: Text(
                _durum!,
                style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
              ),
            ),
          ),
        if (_oynanan.isNotEmpty && !widget.kontrolEdildi)
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: TextButton.icon(
              key: const Key('hamle-bastan'),
              style: TextButton.styleFrom(
                minimumSize: const Size(Olcu.hedef, Olcu.hedef),
              ),
              onPressed: _bastan,
              icon: const Icon(Icons.restart_alt),
              label: const Text('Baştan al'),
            ),
          ),
      ],
    );
  }

  Widget _terfiSecimi(AdimRenkleri r, TextTheme yazi) {
    final terfiler = _terfiler!;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Piyon hangi taşa dönüşsün?', style: yazi.titleSmall),
        const SizedBox(height: Olcu.b1),
        Wrap(
          spacing: Olcu.b1,
          runSpacing: Olcu.b1,
          children: [
            for (final h in terfiler)
              OutlinedButton(
                key: Key('terfi-${h.terfi}'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                ),
                onPressed: () => _oyna(h),
                child: Text(_ilkHarfBuyuk(tasAdi(h.terfi!))),
              ),
            TextButton(
              style: TextButton.styleFrom(
                minimumSize: const Size(Olcu.hedef, Olcu.hedef),
              ),
              onPressed: () => setState(() {
                _terfiler = null;
                _secili = null;
              }),
              child: const Text('Vazgeç'),
            ),
          ],
        ),
      ],
    );
  }

  static String _ilkHarfBuyuk(String s) =>
      s.isEmpty ? s : '${s[0].toUpperCase()}${s.substring(1)}';
}

/// 8x8 tahta. Her kare erişilebilir bir düğmedir: "e4, beyaz at, seçili".
class _Tahta extends StatelessWidget {
  const _Tahta({
    required this.konum,
    required this.kenar,
    required this.beyazAltta,
    required this.secili,
    required this.hedefler,
    required this.sonKaynak,
    required this.sonHedef,
    required this.sonuc,
    required this.etkin,
    required this.onDokun,
  });

  final Konum konum;
  final double kenar;
  final bool beyazAltta;
  final int? secili;
  final Set<int> hedefler;
  final int? sonKaynak;
  final int? sonHedef;

  /// Kontrol sonrası: true doğru, false yanlış, null henüz kontrol yok.
  final bool? sonuc;
  final bool etkin;
  final ValueChanged<int> onDokun;

  static const _dolu = {
    'k': '♚',
    'q': '♛',
    'r': '♜',
    'b': '♝',
    'n': '♞',
    'p': '♟',
  };
  static const _bos = {
    'k': '♔',
    'q': '♕',
    'r': '♖',
    'b': '♗',
    'n': '♘',
    'p': '♙',
  };

  /// Çerçeve kalınlığı (tahtanın dış kenarına eklenir).
  static const double _cerceve = 3;

  /// Metin sunumu seçicisi: simgeler emoji olarak çizilmesin.
  static const _metinSunumu = '︎';

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final kare = kenar / 8;
    final cerceve = switch (sonuc) {
      true => r.dogru,
      false => r.hata,
      null => r.kenar,
    };
    final siraAdi = konum.beyazSirada ? 'beyaz' : 'siyah';
    final ek = konum.mat ? ', mat' : (konum.sah ? ', şah' : '');
    return Semantics(
      container: true,
      label: 'Satranç tahtası, sıra $siraAdi tarafta$ek',
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: cerceve, width: _cerceve),
        ),
        child: SizedBox(
          width: kenar,
          height: kenar,
          child: Column(
            children: [
              for (var satir = 0; satir < 8; satir++)
                Row(
                  children: [
                    for (var sutun = 0; sutun < 8; sutun++)
                      _kare(
                        context,
                        beyazAltta
                            ? (7 - satir) * 8 + sutun
                            : satir * 8 + (7 - sutun),
                        kare,
                        satir,
                        sutun,
                      ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _kare(
    BuildContext context,
    int k,
    double boyut,
    int satir,
    int sutun,
  ) {
    final r = context.renkler;
    final tas = konum.tas(k);
    final acik = (k ~/ 8 + k % 8).isOdd;
    final secildi = secili == k;
    final hedef = hedefler.contains(k);
    final son = k == sonKaynak || k == sonHedef;
    var zemin = acik ? HamleGorunumu.acikKare : HamleGorunumu.koyuKare;
    if (son) zemin = Color.alphaBlend(const Color(0x66E6C229), zemin);
    if (secildi) zemin = Color.alphaBlend(r.ana.withValues(alpha: 0.45), zemin);
    final ad = kareAdi(k);
    final etiket = [
      ad,
      tas == null ? 'boş' : tasTamAdi(tas),
      if (secildi) 'seçili',
      if (hedef) 'gidilebilir',
    ].join(', ');
    final koordinat = TextStyle(
      fontSize: boyut * 0.2,
      height: 1,
      color: acik ? HamleGorunumu.koyuKare : HamleGorunumu.acikKare,
      fontWeight: FontWeight.w700,
    );
    return Semantics(
      button: true,
      enabled: etkin,
      selected: secildi,
      label: etiket,
      excludeSemantics: true,
      onTap: etkin ? () => onDokun(k) : null,
      child: GestureDetector(
        key: ValueKey('kare-$ad'),
        behavior: HitTestBehavior.opaque,
        onTap: etkin ? () => onDokun(k) : null,
        child: Container(
          width: boyut,
          height: boyut,
          color: zemin,
          child: Stack(
            alignment: Alignment.center,
            children: [
              if (sutun == 0)
                Positioned(
                  left: 2,
                  top: 2,
                  child: Text(
                    ad[1],
                    style: koordinat,
                    textScaler: TextScaler.noScaling,
                  ),
                ),
              if (satir == 7)
                Positioned(
                  right: 2,
                  bottom: 2,
                  child: Text(
                    ad[0],
                    style: koordinat,
                    textScaler: TextScaler.noScaling,
                  ),
                ),
              if (tas != null) _tasSimgesi(tas, boyut),
              if (hedef)
                Container(
                  width: tas == null ? boyut * 0.28 : boyut * 0.9,
                  height: tas == null ? boyut * 0.28 : boyut * 0.9,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: tas == null ? const Color(0x5514282C) : null,
                    border: tas == null
                        ? null
                        : Border.all(color: const Color(0x8814282C), width: 3),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _tasSimgesi(String tas, double boyut) {
    final l = tas.toLowerCase();
    final stil = TextStyle(fontSize: boyut * 0.78, height: 1);
    Widget metin(String s, Color renk) => Text(
      '$s$_metinSunumu',
      style: stil.copyWith(color: renk),
      textScaler: TextScaler.noScaling,
      textAlign: TextAlign.center,
    );
    return SizedBox(
      width: boyut,
      height: boyut,
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: _beyaz(tas)
            ? Stack(
                alignment: Alignment.center,
                children: [
                  metin(_dolu[l]!, const Color(0xFFFFFFFF)),
                  metin(_bos[l]!, const Color(0xFF111111)),
                ],
              )
            : metin(_dolu[l]!, const Color(0xFF111111)),
      ),
    );
  }

  static bool _beyaz(String tas) => tas.toUpperCase() == tas;
}
