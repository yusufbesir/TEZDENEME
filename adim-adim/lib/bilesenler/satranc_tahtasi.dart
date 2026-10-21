/// Satranç tahtası bileşenleri: [SatrancTahtasi] (8x8 çizim, erişilebilir
/// kareler) ve [TahtaGirisi] (dokun-seç-dokun-oyna giriş denetleyicisi,
/// terfi seçimi dahil). Hamle alıştırması ve satranç modülünün bütün
/// ekranları (bulmaca, mini maç, serbest tahta, oyun sonu, solo...) bunu
/// kullanır. Taşlar Unicode satranç simgeleriyle çizilir (yazı tipi/asset
/// gömülmez).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';

import '../satranc/satranc.dart';
import '../tema/tema.dart';

/// Tahtanın en büyük kenarı (piksel).
const double satrancTahtaEnBuyukKenar = 420;

/// 8x8 tahta. Her kare erişilebilir bir düğmedir: "e4, beyaz at, seçili".
class SatrancTahtasi extends StatelessWidget {
  const SatrancTahtasi({
    super.key,
    required this.konum,
    required this.kenar,
    required this.beyazAltta,
    this.secili,
    this.hedefler = const {},
    this.sonKaynak,
    this.sonHedef,
    this.sonuc,
    this.etkin = true,
    this.onDokun,
    this.tasGoster = true,
    this.koordinatGoster = true,
    this.vurgu = const {},
    this.etiket,
  });

  static const Color acikKare = Color(0xFFF0D9B5);
  static const Color koyuKare = Color(0xFFB58863);

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
  final ValueChanged<int>? onDokun;

  /// false: taşlar çizilmez ve okuyucuya söylenmez (tahta görme antrenörü).
  final bool tasGoster;

  /// false: kenardaki sütun/sıra harfleri çizilmez ve kare adı okunmaz.
  final bool koordinatGoster;

  /// Ek vurgulu kareler (kare -> renk); ör. koordinat antrenöründe geri bildirim.
  final Map<int, Color> vurgu;

  /// Tahta için özel erişilebilirlik etiketi; null ise sıra/şah/mat yazılır.
  final String? etiket;

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
  static const double cerceve = 3;

  /// Metin sunumu seçicisi: simgeler emoji olarak çizilmesin.
  static const _metinSunumu = '︎';

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final kare = kenar / 8;
    final cerceveRengi = switch (sonuc) {
      true => r.dogru,
      false => r.hata,
      null => r.kenar,
    };
    final siraAdi = konum.beyazSirada ? 'beyaz' : 'siyah';
    final ek = konum.mat ? ', mat' : (konum.sah ? ', şah' : '');
    return Semantics(
      container: true,
      label: etiket ?? 'Satranç tahtası, sıra $siraAdi tarafta$ek',
      child: Container(
        decoration: BoxDecoration(
          border: Border.all(color: cerceveRengi, width: cerceve),
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
    final tas = tasGoster ? konum.tas(k) : null;
    final acik = (k ~/ 8 + k % 8).isOdd;
    final secildi = secili == k;
    final hedef = hedefler.contains(k);
    final son = k == sonKaynak || k == sonHedef;
    var zemin = acik ? acikKare : koyuKare;
    if (son) zemin = Color.alphaBlend(const Color(0x66E6C229), zemin);
    final v = vurgu[k];
    if (v != null) zemin = Color.alphaBlend(v, zemin);
    if (secildi) zemin = Color.alphaBlend(r.ana.withValues(alpha: 0.45), zemin);
    final ad = kareAdi(k);
    final etiketMetni = !koordinatGoster
        ? (tas == null ? 'kare' : tasTamAdi(tas))
        : [
            ad,
            tas == null ? 'boş' : tasTamAdi(tas),
            if (secildi) 'seçili',
            if (hedef) 'gidilebilir',
          ].join(', ');
    final koordinat = TextStyle(
      fontSize: boyut * 0.2,
      height: 1,
      color: acik ? koyuKare : acikKare,
      fontWeight: FontWeight.w700,
    );
    return Semantics(
      button: true,
      enabled: etkin,
      selected: secildi,
      label: etiketMetni,
      excludeSemantics: true,
      onTap: etkin && onDokun != null ? () => onDokun!(k) : null,
      child: GestureDetector(
        key: ValueKey('kare-$ad'),
        behavior: HitTestBehavior.opaque,
        onTap: etkin && onDokun != null ? () => onDokun!(k) : null,
        child: Container(
          width: boyut,
          height: boyut,
          color: zemin,
          child: Stack(
            alignment: Alignment.center,
            children: [
              if (koordinatGoster && sutun == 0)
                Positioned(
                  left: 2,
                  top: 2,
                  child: Text(
                    ad[1],
                    style: koordinat,
                    textScaler: TextScaler.noScaling,
                  ),
                ),
              if (koordinatGoster && satir == 7)
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

/// Dokun-seç-dokun-oyna giriş denetleyicisi: [SatrancTahtasi]'nı çizer,
/// seçim/gidilebilir kareleri tutar, terfide taş seçimini tahtanın altında
/// dört düğmeyle sorar ve hamleyi [onHamle] ile bildirir.
///
/// Kullanılabilir hamleler [hamleler] ile verilir (yoksa konumdaki bütün
/// yasal hamleler); böylece Solo gibi kısıtlı çalışmalar da kullanır.
/// [oynayanBeyaz] verilirse yalnız o rengin taşları seçilebilir (örn. mini
/// maçta kullanıcı tarafı); verilmezse sırası gelen taraf oynar.
class TahtaGirisi extends StatefulWidget {
  const TahtaGirisi({
    super.key,
    required this.konum,
    required this.onHamle,
    this.hamleler,
    this.beyazAltta,
    this.etkin = true,
    this.sonKaynak,
    this.sonHedef,
    this.sonuc,
    this.oynayanBeyaz,
    this.vurgu = const {},
  });

  final Konum konum;
  final ValueChanged<SatrancHamlesi> onHamle;
  final List<SatrancHamlesi>? hamleler;

  /// null: sırası gelen taraf altta (Hamle alıştırması gibi).
  final bool? beyazAltta;
  final bool etkin;
  final int? sonKaynak;
  final int? sonHedef;
  final bool? sonuc;
  final bool? oynayanBeyaz;
  final Map<int, Color> vurgu;

  @override
  State<TahtaGirisi> createState() => _TahtaGirisiDurumu();
}

class _TahtaGirisiDurumu extends State<TahtaGirisi> {
  int? _secili;
  List<SatrancHamlesi>? _terfiler;
  String? _uyari;

  List<SatrancHamlesi> get _hamleler =>
      widget.hamleler ?? widget.konum.yasalHamleler;

  @override
  void didUpdateWidget(TahtaGirisi eski) {
    super.didUpdateWidget(eski);
    // Konum değiştiyse seçim ve terfi sorusu sıfırlanır.
    if (eski.konum.fen != widget.konum.fen) {
      _secili = null;
      _terfiler = null;
      _uyari = null;
    }
  }

  bool _bizim(String? tas) {
    if (tas == null) return false;
    final beyaz = tas == tas.toUpperCase();
    return beyaz == (widget.oynayanBeyaz ?? widget.konum.beyazSirada);
  }

  void _dokun(int kare) {
    if (!widget.etkin || _terfiler != null) return;
    final tas = widget.konum.tas(kare);
    final secili = _secili;
    if (secili == null || kare == secili) {
      setState(() {
        _secili = (secili == null && _bizim(tas)) ? kare : null;
        _uyari = null;
      });
      return;
    }
    final adaylar = [
      for (final h in _hamleler)
        if (h.kaynak == secili && h.hedef == kare) h,
    ];
    if (adaylar.isEmpty) {
      setState(() {
        _secili = _bizim(tas) ? kare : null;
        _uyari = _bizim(tas) ? null : 'Bu taş o kareye gidemez.';
      });
      return;
    }
    if (adaylar.length > 1) {
      setState(() => _terfiler = adaylar);
      return;
    }
    setState(() {
      _secili = null;
      _uyari = null;
    });
    widget.onHamle(adaylar.single);
  }

  void _terfiSec(SatrancHamlesi h) {
    setState(() {
      _terfiler = null;
      _secili = null;
    });
    widget.onHamle(h);
  }

  static String _ilkHarfBuyuk(String s) =>
      s.isEmpty ? s : '${s[0].toUpperCase()}${s.substring(1)}';

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final hedefler = _secili == null
        ? const <int>{}
        : {
            for (final h in _hamleler)
              if (h.kaynak == _secili) h.hedef,
          };
    final beyazAltta = widget.beyazAltta ?? widget.konum.beyazSirada;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        LayoutBuilder(
          builder: (context, kisit) {
            // Çerçeve (2 x 3 px) tahtanın dışına eklenir.
            final kenar =
                kisit.maxWidth.clamp(0.0, satrancTahtaEnBuyukKenar) -
                2 * SatrancTahtasi.cerceve;
            return Center(
              child: SatrancTahtasi(
                konum: widget.konum,
                kenar: kenar < 0 ? 0 : kenar,
                beyazAltta: beyazAltta,
                secili: _secili,
                hedefler: hedefler,
                sonKaynak: widget.sonKaynak,
                sonHedef: widget.sonHedef,
                sonuc: widget.sonuc,
                etkin: widget.etkin && _terfiler == null,
                onDokun: _dokun,
                vurgu: widget.vurgu,
              ),
            );
          },
        ),
        if (_terfiler != null) ...[
          const SizedBox(height: Olcu.b1),
          Text('Piyon hangi taşa dönüşsün?', style: yazi.titleSmall),
          const SizedBox(height: Olcu.b1),
          Wrap(
            spacing: Olcu.b1,
            runSpacing: Olcu.b1,
            children: [
              for (final h in _terfiler!)
                OutlinedButton(
                  key: Key('terfi-${h.terfi}'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                  ),
                  onPressed: () => _terfiSec(h),
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
        if (_uyari != null)
          Semantics(
            liveRegion: true,
            child: Padding(
              padding: const EdgeInsets.only(top: Olcu.b1),
              child: Text(
                _uyari!,
                style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
              ),
            ),
          ),
      ],
    );
  }
}
