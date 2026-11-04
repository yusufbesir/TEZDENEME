/// Uygulama kilidi ekranı ve kapısı. [KilitEkrani]: sayısal tuş takımı ile
/// 4-6 haneli PIN girişi; 5 yanlıştan sonra 30 sn bekleme (model/kilit.dart).
/// [KilitKapisi]: MaterialApp builder'ında içeriği sarar; kilit açıkken
/// uygulama açılışında ve 5 dakikadan uzun arka planda kaldıktan sonra ön
/// plana dönüşte kilit ekranını üste çizer. Kilitliyken ayarlar ve veri
/// sıfırlama dahil hiçbir ekrana erişilemez; "PIN'i unuttum" yalnız uyarı
/// metnidir. Biyometri yok (sonraki sürüm).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Yazan: [Claude#kilit-2026-11-04].
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../durum/saglayicilar.dart';
import '../model/kilit.dart';
import '../tema/tema.dart';

/// PIN giriş ekranı. [dogrula] saf doğrulayıcıdır; doğruysa [acildi] çağrılır.
/// [simdi] test için sabitlenebilir.
class KilitEkrani extends StatefulWidget {
  const KilitEkrani({
    super.key,
    required this.dogrula,
    required this.acildi,
    this.simdi,
  });

  final bool Function(String pin) dogrula;
  final VoidCallback acildi;
  final DateTime Function()? simdi;

  @override
  State<KilitEkrani> createState() => _KilitEkraniDurumu();
}

class _KilitEkraniDurumu extends State<KilitEkrani> {
  String _giris = '';
  String? _hata;
  DenemeKilidi _deneme = const DenemeKilidi();
  Timer? _sayac;
  bool _unuttumAcik = false;

  DateTime get _an => (widget.simdi ?? DateTime.now)();

  @override
  void dispose() {
    _sayac?.cancel();
    super.dispose();
  }

  bool get _bekliyor => _deneme.bekliyorMu(_an);

  void _tus(String rakam) {
    if (_bekliyor || _giris.length >= KilitAyari.enCokPin) return;
    setState(() {
      _giris += rakam;
      _hata = null;
    });
    if (_giris.length == KilitAyari.enCokPin) _gonder();
  }

  void _sil() {
    if (_giris.isEmpty) return;
    setState(() {
      _giris = _giris.substring(0, _giris.length - 1);
      _hata = null;
    });
  }

  void _gonder() {
    if (_bekliyor || _giris.length < KilitAyari.enAzPin) return;
    if (widget.dogrula(_giris)) {
      _sayac?.cancel();
      setState(() {
        _deneme = _deneme.sifirla();
        _giris = '';
        _hata = null;
      });
      widget.acildi();
      return;
    }
    final yeni = _deneme.yanlisDene(_an);
    setState(() {
      _deneme = yeni;
      _giris = '';
      _hata = 'Yanlış PIN';
    });
    if (yeni.bekliyorMu(_an)) _sayacBaslat();
  }

  /// Bekleme süresince her saniye kalan süreyi tazeler.
  void _sayacBaslat() {
    _sayac?.cancel();
    _sayac = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        if (!_bekliyor) {
          t.cancel();
          _hata = null;
        }
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final bekliyor = _bekliyor;
    final kalanSn = _deneme.kalan(_an).inSeconds;
    final hataMetni = bekliyor
        ? 'Çok fazla yanlış deneme. $kalanSn sn bekle.'
        : _hata;

    Widget tus(String etiket, {VoidCallback? basinca, Widget? simge}) =>
        Padding(
          padding: const EdgeInsets.all(Olcu.b1 / 2),
          child: SizedBox(
            width: 72,
            height: 64,
            child: etiket.isEmpty
                ? const SizedBox.shrink()
                : OutlinedButton(
                    key: ValueKey('kilit-tus-$etiket'),
                    onPressed: basinca,
                    child: simge ?? Text(etiket, style: yazi.headlineSmall),
                  ),
          ),
        );

    final satirlar = <List<Widget>>[
      [for (final d in ['1', '2', '3']) tus(d, basinca: () => _tus(d))],
      [for (final d in ['4', '5', '6']) tus(d, basinca: () => _tus(d))],
      [for (final d in ['7', '8', '9']) tus(d, basinca: () => _tus(d))],
      [
        tus(
          'sil',
          basinca: _giris.isEmpty ? null : _sil,
          simge: Semantics(
            label: 'Sil',
            child: Icon(Icons.backspace_outlined),
          ),
        ),
        tus('0', basinca: () => _tus('0')),
        tus(
          'tamam',
          basinca: (!bekliyor && _giris.length >= KilitAyari.enAzPin)
              ? _gonder
              : null,
          simge: Semantics(label: 'Tamam', child: Icon(Icons.check)),
        ),
      ],
    ];

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(Olcu.b3),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.lock_outline, size: 40, color: r.ana),
                  const SizedBox(height: Olcu.b2),
                  Text(
                    'PIN gir',
                    style: yazi.titleLarge,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: Olcu.b2),
                  Semantics(
                    label: '${_giris.length} hane girildi',
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        for (var i = 0; i < KilitAyari.enCokPin; i++)
                          Container(
                            width: 14,
                            height: 14,
                            margin: const EdgeInsets.symmetric(
                              horizontal: Olcu.b1 / 2,
                            ),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: i < _giris.length
                                  ? r.ana
                                  : Colors.transparent,
                              border: Border.all(color: r.ana),
                            ),
                          ),
                      ],
                    ),
                  ),
                  const SizedBox(height: Olcu.b1),
                  SizedBox(
                    height: 24,
                    child: hataMetni == null
                        ? null
                        : Text(
                            hataMetni,
                            key: const ValueKey('kilit-hata'),
                            style: yazi.bodyMedium?.copyWith(color: r.hata),
                            textAlign: TextAlign.center,
                          ),
                  ),
                  const SizedBox(height: Olcu.b1),
                  for (final s in satirlar)
                    Row(mainAxisAlignment: MainAxisAlignment.center, children: s),
                  const SizedBox(height: Olcu.b2),
                  TextButton(
                    key: const ValueKey('kilit-unuttum'),
                    onPressed: () =>
                        setState(() => _unuttumAcik = !_unuttumAcik),
                    child: const Text("PIN'i unuttum"),
                  ),
                  if (_unuttumAcik)
                    Text(
                      'PIN kurtarılamaz ve kilitliyken ayarlar açılamaz. '
                      'Uygulamayı kaldırıp yeniden kurarsan tüm ilerleme '
                      'silinir; verilerin yalnızca bu cihazda saklanır.',
                      style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                      textAlign: TextAlign.center,
                    ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Kilit kapısı: kilit açıksa açılışta ve uzun arka plan sonrası ön plana
/// dönüşte [KilitEkrani]ni içeriğin üstüne çizer.
class KilitKapisi extends ConsumerStatefulWidget {
  const KilitKapisi({
    super.key,
    required this.child,
    this.arkaPlanSiniri = const Duration(minutes: 5),
  });

  final Widget child;

  /// Bu süreden uzun arka planda kalınca dönüşte PIN yeniden sorulur.
  final Duration arkaPlanSiniri;

  @override
  ConsumerState<KilitKapisi> createState() => _KilitKapisiDurumu();
}

class _KilitKapisiDurumu extends ConsumerState<KilitKapisi>
    with WidgetsBindingObserver {
  bool _degerlendirildi = false;
  bool _kilitli = false;
  DateTime? _arkaPlanaGecis;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    switch (state) {
      case AppLifecycleState.paused:
      case AppLifecycleState.hidden:
        _arkaPlanaGecis ??= DateTime.now();
      case AppLifecycleState.resumed:
        final gecis = _arkaPlanaGecis;
        _arkaPlanaGecis = null;
        final kilit = ref.read(durumProvider).value?.kilit;
        if (kilit != null &&
            gecis != null &&
            DateTime.now().difference(gecis) > widget.arkaPlanSiniri &&
            !_kilitli) {
          setState(() => _kilitli = true);
        }
      case AppLifecycleState.inactive:
      case AppLifecycleState.detached:
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final durum = ref.watch(durumProvider);
    final kilit = durum.value?.kilit;
    // İlk yüklemede karar: kilit kayıtlıysa açılış kilitli başlar.
    if (!_degerlendirildi && durum.hasValue) {
      _degerlendirildi = true;
      _kilitli = kilit != null;
    }
    if (!_kilitli || kilit == null) return widget.child;
    return Stack(
      fit: StackFit.expand,
      children: [
        widget.child,
        KilitEkrani(
          dogrula: kilit.dogrula,
          acildi: () => setState(() => _kilitli = false),
        ),
      ],
    );
  }
}
