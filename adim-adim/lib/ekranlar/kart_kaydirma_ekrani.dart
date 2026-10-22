/// Kart kaydırma ekranı (Pratik merkezi): kelime kartını çevirip "bildim"
/// (sağa kaydır) ya da "bilmedim" (sola kaydır) de. Kaydırma yerine alttaki
/// iki düğme de kullanılabilir (erişilebilirlik). Her karar mevcut SRS
/// motoruna işlenir (DurumNotifier.kartIsle); oturum bitince ya da kullanıcı
/// ortada çıkarsa en az bir kart cevaplandıysa tek 'tekrar' günlük kaydı
/// eklenir. XP ve ceza yoktur. Hareket azaltma açıksa kart kaydırılırken
/// dönmez (yalnız kayar).
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dalga3]
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../motor/kart_kaydirma.dart';
import '../motor/pratik.dart';
import '../tema/tema.dart';

class KartKaydirmaEkrani extends ConsumerStatefulWidget {
  const KartKaydirmaEkrani({super.key, this.tohum});

  /// Deste karışımı için tohum (testte sabitlenir); null: zamana bağlı.
  final int? tohum;

  @override
  ConsumerState<KartKaydirmaEkrani> createState() => _KaydirmaDurumu();
}

class _KaydirmaDurumu extends ConsumerState<KartKaydirmaEkrani> {
  late List<KelimeCifti> _deste;
  int _indeks = 0;
  double _dx = 0;
  bool _cevrik = false;
  int _bildim = 0;
  int _bilmedim = 0;
  bool _kaydedildi = false;
  int _tur = 0;

  @override
  void initState() {
    super.initState();
    _deste = _destele();
  }

  List<KelimeCifti> _destele() => KartKaydirma.deste(
    ref.read(durumProvider).value ?? const OgrenciDurumu(),
    ref.read(alanKurslariProvider),
    tohum: (widget.tohum ?? DateTime.now().microsecondsSinceEpoch) + _tur,
  );

  bool get _bitti => _indeks >= _deste.length;
  int get _cevaplanan => _bildim + _bilmedim;

  /// Oturumu günlüğe bir kez yazar (hiç kart cevaplanmadıysa yazmaz).
  void _kaydet() {
    if (_kaydedildi || _cevaplanan == 0) return;
    _kaydedildi = true;
    ref.read(durumProvider.notifier).tekrarBitir(_bildim, _cevaplanan);
  }

  void _karar(bool bildim) {
    if (_bitti) return;
    final kart = _deste[_indeks];
    ref.read(durumProvider.notifier).kartIsle(kart.kartId, bildim);
    setState(() {
      if (bildim) {
        _bildim++;
      } else {
        _bilmedim++;
      }
      _indeks++;
      _dx = 0;
      _cevrik = false;
    });
    if (_bitti) _kaydet();
  }

  void _yeniden() => setState(() {
    _tur++;
    _deste = _destele();
    _indeks = 0;
    _dx = 0;
    _cevrik = false;
    _bildim = 0;
    _bilmedim = 0;
    _kaydedildi = false;
  });

  void _cik() {
    _kaydet();
    if (context.canPop()) {
      context.pop();
    } else {
      context.go('/pratik');
    }
  }

  Widget _iskele(Widget govde) => Scaffold(
    appBar: AppBar(
      title: const Text('Kart kaydırma'),
      leading: IconButton(
        icon: const Icon(Icons.arrow_back),
        tooltip: 'Geri',
        onPressed: _cik,
      ),
    ),
    body: SafeArea(child: SayfaGovdesi(child: govde)),
  );

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    if (_deste.isEmpty) {
      return _iskele(
        Center(
          child: Padding(
            padding: const EdgeInsets.all(Olcu.b3),
            child: Text(
              'Önce birkaç ders çöz; kelimelerin burada toplanır.',
              key: const ValueKey('kaydir-bos'),
              style: yazi.bodyLarge,
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    }
    if (_bitti) {
      final o = KartKaydirma.ozet(_bildim, _bilmedim);
      return _iskele(
        SingleChildScrollView(
          padding: const EdgeInsets.all(Olcu.b3),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(Icons.swipe, size: 64, color: r.ana),
              const SizedBox(height: Olcu.b2),
              Semantics(
                header: true,
                child: Text(
                  'Deste bitti',
                  style: yazi.titleLarge,
                  textAlign: TextAlign.center,
                ),
              ),
              const SizedBox(height: Olcu.b2),
              Text(
                'Bildim: ${o.bildim} · Bilmedim: ${o.bilmedim}',
                key: const ValueKey('kaydir-sonuc'),
                style: yazi.headlineSmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: Olcu.b1),
              Text(
                'Bilinen oran: %${o.yuzde}',
                key: const ValueKey('kaydir-oran'),
                style: yazi.titleMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: Olcu.b1),
              Text(
                'Cevapların tekrar kayıtlarına işlendi.',
                style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: Olcu.b3),
              FilledButton(
                key: const ValueKey('kaydir-yeniden'),
                onPressed: _yeniden,
                child: const Text('Tekrar dene'),
              ),
              const SizedBox(height: Olcu.b1),
              OutlinedButton(
                key: const ValueKey('kaydir-bitir'),
                onPressed: _cik,
                child: const Text('Bitir'),
              ),
            ],
          ),
        ),
      );
    }

    final kart = _deste[_indeks];
    final metin = _cevrik ? kart.anlam : kart.metin;
    final hareketAzalt = MediaQuery.of(context).disableAnimations;
    final aci = hareketAzalt ? 0.0 : (_dx / 1200).clamp(-0.3, 0.3);
    final oran = (_dx.abs() / KartKaydirma.esikPx).clamp(0.0, 1.0);
    final renk = _dx > 0 ? r.ana : r.vurgu;
    return _iskele(
      SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              '${_indeks + 1} / ${_deste.length}',
              key: const ValueKey('kaydir-sayac'),
              style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: Olcu.b1),
            Text(
              'Sağa kaydır: bildim · Sola kaydır: bilmedim',
              style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: Olcu.b2),
            GestureDetector(
              key: const ValueKey('kaydir-kart'),
              behavior: HitTestBehavior.opaque,
              onHorizontalDragUpdate: (g) => setState(() => _dx += g.delta.dx),
              onHorizontalDragEnd: (g) {
                final yon = KartKaydirma.yon(_dx, hiz: g.primaryVelocity ?? 0);
                if (yon == null) {
                  setState(() => _dx = 0);
                } else {
                  _karar(yon == KaydirmaYonu.sag);
                }
              },
              onTap: () => setState(() => _cevrik = !_cevrik),
              child: Transform.translate(
                offset: Offset(math.max(-400, math.min(400, _dx)), 0),
                child: Transform.rotate(
                  angle: aci,
                  child: Semantics(
                    button: true,
                    label: _cevrik
                        ? 'Anlam: $metin. Çevirmek için dokun'
                        : 'Kelime: $metin. Çevirmek için dokun',
                    excludeSemantics: true,
                    child: Card(
                      color: Color.lerp(r.yuzey, renk, oran * 0.25),
                      child: ConstrainedBox(
                        constraints: const BoxConstraints(minHeight: 200),
                        child: Padding(
                          padding: const EdgeInsets.all(Olcu.b3),
                          child: Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  _cevrik ? 'Anlam' : 'Kelime',
                                  style: yazi.labelMedium?.copyWith(
                                    color: r.metinIkincil,
                                  ),
                                ),
                                const SizedBox(height: Olcu.b1),
                                Text(
                                  metin,
                                  key: const ValueKey('kaydir-metin'),
                                  style: yazi.headlineSmall,
                                  textAlign: TextAlign.center,
                                ),
                                const SizedBox(height: Olcu.b2),
                                Text(
                                  'Çevirmek için dokun',
                                  style: yazi.bodySmall?.copyWith(
                                    color: r.metinIkincil,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: Olcu.b2),
            Wrap(
              spacing: Olcu.b2,
              runSpacing: Olcu.b1,
              alignment: WrapAlignment.center,
              children: [
                OutlinedButton.icon(
                  key: const ValueKey('kaydir-bilmedim'),
                  onPressed: () => _karar(false),
                  icon: const Icon(Icons.close),
                  label: const Text('Bilmedim'),
                ),
                FilledButton.icon(
                  key: const ValueKey('kaydir-bildim'),
                  onPressed: () => _karar(true),
                  icon: const Icon(Icons.check),
                  label: const Text('Bildim'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
