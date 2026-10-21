/// Eller serbest sesli mod ekranı (ÖZELLİK 64): ekrana bakmadan çalışma. Cihaz
/// TTS kelimeyi/kalıbı okur, kullanıcı tekrar eder, konuşma tanıma dinler ve
/// tahmini telaffuz puanıyla kontrol eder; tutmazsa bir kez daha okunur.
/// Konuşma tanıma modeli yoksa ya da mikrofon izni verilmezse "yalnız dinleme"
/// kipine zarifçe düşer (mevcut 8.7 kalıbı). Ceza yok; kart aralıkları, hata
/// defteri ve XP değişmez. Pratik merkezinden açılır; yalnız dil kurslarında.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../motor/eller_serbest.dart';
import '../motor/telaffuz.dart';
import '../servis/eller_serbest_oturumu.dart';
import '../servis/konusma.dart';
import '../tema/tema.dart';

enum _Kip { hazirlik, calisiyor, duraklatildi, bitti }

class EllerSerbestEkrani extends ConsumerStatefulWidget {
  const EllerSerbestEkrani({super.key});

  @override
  ConsumerState<EllerSerbestEkrani> createState() => _EllerSerbestDurumu();
}

class _EllerSerbestDurumu extends ConsumerState<EllerSerbestEkrani> {
  List<ElleriSerbestOgesi> _deste = const [];
  _Kip _kip = _Kip.hazirlik;

  /// null: tanıma hazırlığı denetleniyor.
  bool? _tanimaHazir;

  /// Kullanıcının seçtiği kip: true = tekrar et (tanıma gerekir).
  bool _tekrarEt = true;
  int _indeks = 0;
  ElleriSerbestAsama? _asama;
  TelaffuzTahmini? _sonTahmin;
  final List<ElleriSerbestSonucu> _sonuclar = [];
  ElleriSerbestOturumu? _oturum;
  late final KonusmaTanima _konusma;

  @override
  void initState() {
    super.initState();
    _konusma = ref.read(konusmaProvider);
    final durum = ref.read(durumProvider).value ?? const OgrenciDurumu();
    _deste = ElleriSerbest.deste(
      durum,
      ref.read(alanKurslariProvider),
      tohum: DateTime.now().millisecondsSinceEpoch,
    );
    _hazirligiDenetle();
  }

  @override
  void dispose() {
    _oturum?.durdur();
    super.dispose();
  }

  Future<void> _hazirligiDenetle() async {
    var hazir = false;
    try {
      hazir = await _konusma.hazirMi();
    } catch (_) {
      hazir = false;
    }
    if (!mounted) return;
    final konusmaAcik = ref.read(durumProvider).value?.konusmaAcik ?? true;
    setState(() {
      _tanimaHazir = hazir && konusmaAcik;
      _tekrarEt = hazir && konusmaAcik;
    });
  }

  Future<void> _baslat() async {
    if (_deste.isEmpty) return;
    final oturum = _oturum = ElleriSerbestOturumu(
      ses: ref.read(sesProvider),
      konusma: _konusma,
      tekrarEt: _tekrarEt,
    );
    setState(() {
      _kip = _Kip.calisiyor;
      _indeks = 0;
      _sonuclar.clear();
    });
    final hazir = await oturum.hazirla();
    if (_tekrarEt && !hazir && mounted) {
      // İzin verilmedi / tanıma açılamadı: yalnız dinlemeye düşer.
      setState(() => _tanimaHazir = false);
    }
    await _surdur();
  }

  /// Çalışan döngü; yeni döngü, öncekinin durduğundan emin olunca başlar.
  Future<void>? _aktif;

  Future<void> _surdur() async {
    final onceki = _aktif;
    if (onceki != null) await onceki;
    final kosu = _aktif = _dongu();
    await kosu;
  }

  Future<void> _dongu() async {
    final oturum = _oturum;
    if (oturum == null || !mounted) return;
    oturum.sifirla();
    while (mounted && _indeks < _deste.length) {
      final sonuc = await oturum.ogeyiIsle(
        _deste[_indeks],
        onAsama: (a, {tahmin}) {
          if (mounted) {
            setState(() {
              _asama = a;
              _sonTahmin = tahmin;
            });
          }
        },
      );
      if (!mounted) return;
      if (sonuc == null) return; // Duraklatıldı / durduruldu.
      setState(() {
        _sonuclar.add(sonuc);
        _indeks++;
        _sonTahmin = null;
      });
    }
    if (mounted && _indeks >= _deste.length) {
      setState(() => _kip = _Kip.bitti);
    }
  }

  Future<void> _duraklat() async {
    setState(() => _kip = _Kip.duraklatildi);
    await _oturum?.durdur();
  }

  Future<void> _devam() async {
    setState(() => _kip = _Kip.calisiyor);
    await _surdur();
  }

  Future<void> _bitir() async {
    await _oturum?.durdur();
    if (mounted) setState(() => _kip = _Kip.bitti);
  }

  String _asamaMetni() => switch (_asama) {
    ElleriSerbestAsama.okuyor => 'Dinle…',
    ElleriSerbestAsama.dinliyor => 'Şimdi sen söyle',
    ElleriSerbestAsama.degerlendirdi =>
      _sonTahmin == null
          ? 'Bir şey duyamadım'
          : (_sonTahmin!.puan >= ElleriSerbestOturumu.gecmePuani
                ? 'Güzel! Tahmini puan: ${_sonTahmin!.puan}/100'
                : 'Tekrar dinleyelim. Tahmini puan: ${_sonTahmin!.puan}/100'),
    ElleriSerbestAsama.yalnizDinledi => 'Dinledin',
    null => 'Hazırlanıyor…',
  };

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final sesAcik = ref.watch(durumProvider).value?.sesAcik ?? true;

    Widget iskele(Widget govde) => Scaffold(
      appBar: AppBar(
        title: const Text('Eller serbest'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/pratik'),
        ),
      ),
      body: SafeArea(child: SayfaGovdesi(child: govde)),
    );

    if (_deste.isEmpty) {
      return iskele(
        Center(
          child: Padding(
            padding: const EdgeInsets.all(Olcu.b3),
            child: Text(
              'Önce birkaç dil dersi çöz; eller serbest çalışma için '
              'kelimelerin burada toplanır.',
              key: const ValueKey('eller-serbest-bos'),
              style: yazi.bodyLarge,
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }

    if (_kip == _Kip.hazirlik) {
      final tanimaYok = _tanimaHazir == false;
      return iskele(
        ListView(
          padding: const EdgeInsets.all(Olcu.b3),
          children: [
            Icon(Icons.headset_mic_outlined, size: 56, color: r.ana),
            const SizedBox(height: Olcu.b2),
            Text(
              'Ekrana bakmadan çalış',
              style: yazi.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: Olcu.b1),
            Text(
              '${_deste.length} öğe: cihaz okur, sen tekrar edersin, '
              'konuşma tanıma kontrol eder. Ceza yok; tekrar takvimin '
              'değişmez.',
              style: yazi.bodyLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: Olcu.b2),
            if (_tanimaHazir == null)
              Text(
                'Konuşma tanıma hazırlanıyor…',
                style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                textAlign: TextAlign.center,
              )
            else if (tanimaYok)
              Row(
                key: const ValueKey('eller-serbest-tanima-yok'),
                children: [
                  Icon(Icons.mic_off, color: r.metinIkincil),
                  const SizedBox(width: Olcu.b1),
                  Expanded(
                    child: Text(
                      'Konuşma tanıma bu cihazda hazır değil; yalnız '
                      'dinleme kipinde çalışırsın.',
                      style: yazi.bodyLarge,
                    ),
                  ),
                ],
              )
            else
              SwitchListTile(
                key: const ValueKey('eller-serbest-tekrar'),
                contentPadding: EdgeInsets.zero,
                title: const Text('Tekrar et (konuşma tanımayla kontrol)'),
                value: _tekrarEt,
                onChanged: (v) => setState(() => _tekrarEt = v),
              ),
            if (!sesAcik)
              Padding(
                padding: const EdgeInsets.only(top: Olcu.b1),
                child: Text(
                  'Ses ayarlardan kapalı; açmadan sesli çalışılamaz.',
                  style: yazi.bodyMedium?.copyWith(color: r.hata),
                ),
              ),
            const SizedBox(height: Olcu.b3),
            FilledButton.icon(
              key: const ValueKey('eller-serbest-basla'),
              style: FilledButton.styleFrom(minimumSize: const Size(48, 56)),
              onPressed: (_tanimaHazir == null || !sesAcik) ? null : _baslat,
              icon: const Icon(Icons.play_arrow),
              label: Text(
                (_tekrarEt && !tanimaYok) ? 'Başla' : 'Yalnız dinleme başlat',
              ),
            ),
          ],
        ),
      );
    }

    if (_kip == _Kip.bitti) {
      final puanlilar = [
        for (final s in _sonuclar)
          if (s.tahmin != null) s.tahmin!.puan,
      ];
      final ort = puanlilar.isEmpty
          ? null
          : (puanlilar.reduce((a, b) => a + b) / puanlilar.length).round();
      return iskele(
        ListView(
          padding: const EdgeInsets.all(Olcu.b3),
          children: [
            Icon(Icons.check_circle_outline, size: 56, color: r.ana),
            const SizedBox(height: Olcu.b2),
            Text(
              'Oturum bitti',
              style: yazi.headlineSmall,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: Olcu.b1),
            Text(
              ort == null
                  ? '${_sonuclar.length} öğe dinlendi.'
                  : '${_sonuclar.length} öğe · ortalama tahmini puan $ort/100',
              key: const ValueKey('eller-serbest-ozet'),
              style: yazi.bodyLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: Olcu.b2),
            for (final s in _sonuclar)
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(
                  s.tahmin == null
                      ? Icons.hearing
                      : (s.gecti ? Icons.check_circle : Icons.replay),
                  color: s.tahmin != null && s.gecti ? r.dogru : r.metinIkincil,
                ),
                title: Text(s.oge.metin),
                subtitle: Text(
                  [
                    ?s.oge.anlam,
                    if (s.tahmin != null) 'Tahmini puan: ${s.tahmin!.puan}/100',
                    if (s.tahmin != null && s.tahmin!.hataliHeceler.isNotEmpty)
                      'Hatalı hece: ${s.tahmin!.hataliHeceler.join(', ')}',
                  ].join(' · '),
                ),
              ),
            const SizedBox(height: Olcu.b2),
            FilledButton(
              key: const ValueKey('eller-serbest-yeniden'),
              style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: () => setState(() {
                _kip = _Kip.hazirlik;
                _deste = ElleriSerbest.deste(
                  ref.read(durumProvider).value ?? const OgrenciDurumu(),
                  ref.read(alanKurslariProvider),
                  tohum: DateTime.now().millisecondsSinceEpoch,
                );
              }),
              child: const Text('Yeniden başla'),
            ),
          ],
        ),
      );
    }

    final oge = _deste[_indeks.clamp(0, _deste.length - 1)];
    final calisiyor = _kip == _Kip.calisiyor;
    return iskele(
      Padding(
        padding: const EdgeInsets.all(Olcu.b3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              '${_indeks + 1}/${_deste.length}',
              textAlign: TextAlign.center,
              style: yazi.labelLarge?.copyWith(color: r.metinIkincil),
            ),
            const SizedBox(height: Olcu.b1),
            LinearProgressIndicator(value: _indeks / _deste.length),
            Expanded(
              child: Center(
                child: SingleChildScrollView(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        oge.metin,
                        key: const ValueKey('eller-serbest-metin'),
                        textAlign: TextAlign.center,
                        style: yazi.headlineMedium,
                      ),
                      if (oge.anlam != null) ...[
                        const SizedBox(height: Olcu.b1),
                        Text(
                          oge.anlam!,
                          textAlign: TextAlign.center,
                          style: yazi.titleMedium?.copyWith(
                            color: r.metinIkincil,
                          ),
                        ),
                      ],
                      const SizedBox(height: Olcu.b3),
                      Semantics(
                        liveRegion: true,
                        child: Text(
                          calisiyor ? _asamaMetni() : 'Duraklatıldı',
                          key: const ValueKey('eller-serbest-durum'),
                          textAlign: TextAlign.center,
                          style: yazi.titleLarge?.copyWith(color: r.ana),
                        ),
                      ),
                      if (calisiyor &&
                          _asama == ElleriSerbestAsama.degerlendirdi &&
                          _sonTahmin != null &&
                          _sonTahmin!.hataliHeceler.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: Olcu.b1),
                          child: Text(
                            'Hatalı hece: ${_sonTahmin!.hataliHeceler.join(', ')}',
                            textAlign: TextAlign.center,
                            style: yazi.bodyMedium?.copyWith(color: r.hata),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ),
            Row(
              children: [
                Expanded(
                  child: calisiyor
                      ? OutlinedButton.icon(
                          key: const ValueKey('eller-serbest-duraklat'),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size(48, 56),
                          ),
                          onPressed: _duraklat,
                          icon: const Icon(Icons.pause),
                          label: const Text('Duraklat'),
                        )
                      : FilledButton.icon(
                          key: const ValueKey('eller-serbest-devam'),
                          style: FilledButton.styleFrom(
                            minimumSize: const Size(48, 56),
                          ),
                          onPressed: _devam,
                          icon: const Icon(Icons.play_arrow),
                          label: const Text('Devam'),
                        ),
                ),
                const SizedBox(width: Olcu.b2),
                Expanded(
                  child: OutlinedButton.icon(
                    key: const ValueKey('eller-serbest-bitir'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(48, 56),
                    ),
                    onPressed: _bitir,
                    icon: const Icon(Icons.stop),
                    label: const Text('Bitir'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
