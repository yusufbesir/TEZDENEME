/// Konuşma alıştırması (ÖZELLİK 8.7): cümle + çeviri, "Dinle", büyük mikrofon
/// düğmesi, kelime kelime sonuç (yeşil/kırmızı), yüzde ve "Tekrar dene"
/// (en çok [Soyle.enCokDeneme]). Tanıma hazır değilse "Bu alıştırmayı atla".
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../durum/saglayicilar.dart';
import '../../model/icerik.dart';
import '../../servis/konusma.dart';
import '../../motor/telaffuz.dart';
import '../../tema/tema.dart';
import 'soru_basligi.dart';

enum _Asama { bosta, dinliyor, bitti }

/// Konuşma alıştırması görünümü. Cevap: bool (eşik geçildi mi) ya da
/// [Soyle.atla]; ikincisinde `onGonder` hemen çağrılır.
class SoyleGorunumu extends ConsumerStatefulWidget {
  const SoyleGorunumu({
    super.key,
    required this.alistirma,
    required this.kontrolEdildi,
    required this.onCevap,
    required this.onGonder,
  });
  final Soyle alistirma;
  final bool kontrolEdildi;
  final ValueChanged<Object?> onCevap;
  final VoidCallback onGonder;

  @override
  ConsumerState<SoyleGorunumu> createState() => _SoyleDurumu();
}

class _SoyleDurumu extends ConsumerState<SoyleGorunumu> {
  /// null: tanıma hazırlığı denetleniyor.
  bool? _hazir;
  _Asama _asama = _Asama.bosta;
  int _deneme = 0;
  ({double oran, List<({String kelime, bool dogru})> kelimeler})? _puan;
  String? _mesaj;
  bool _sesHatasi = false;
  Completer<void>? _bitis;
  String _son = '';

  static const _zamanAsimi = Duration(seconds: 20);

  /// dispose içinde `ref` kullanılamaz; servis başta saklanır.
  late final KonusmaTanima _konusma;

  @override
  void initState() {
    super.initState();
    _konusma = ref.read(konusmaProvider);
    _hazirligiDenetle();
  }

  @override
  void dispose() {
    if (_asama == _Asama.dinliyor) {
      // Kayıt açık kalmasın.
      unawaited(_konusma.durdur().catchError((_) {}));
    }
    super.dispose();
  }

  Future<void> _hazirligiDenetle() async {
    var hazir = false;
    try {
      hazir = await _konusma.hazirMi();
    } catch (_) {
      hazir = false;
    }
    if (mounted) setState(() => _hazir = hazir);
  }

  Future<void> _dinleCumle() async {
    final tamam = await ref
        .read(sesProvider)
        .oku(widget.alistirma.metin, dil: widget.alistirma.dil);
    if (!tamam && mounted && !_sesHatasi) setState(() => _sesHatasi = true);
  }

  Future<void> _konus() async {
    if (_asama != _Asama.bosta) return;
    final konusma = _konusma;
    setState(() {
      _mesaj = null;
      _son = '';
    });
    try {
      if (!await konusma.izinIste()) {
        if (mounted) {
          setState(() {
            _hazir = false;
            _mesaj = 'Mikrofon izni verilmedi';
          });
        }
        return;
      }
    } catch (_) {
      if (mounted) setState(() => _hazir = false);
      return;
    }
    if (!mounted) return;
    setState(() => _asama = _Asama.dinliyor);
    final bitis = _bitis = Completer<void>();
    StreamSubscription<String>? abone;
    Timer? sayac;
    try {
      abone = konusma
          .dinle(dil: widget.alistirma.dil)
          .listen(
            (m) => _son = m,
            onError: (_) {
              if (!bitis.isCompleted) bitis.complete();
            },
            onDone: () {
              if (!bitis.isCompleted) bitis.complete();
            },
          );
      sayac = Timer(_zamanAsimi, () {
        if (!bitis.isCompleted) bitis.complete();
      });
      await bitis.future;
    } catch (_) {
      // Tanıma başlatılamadı: duyulan bir şey yok sayılır.
    }
    sayac?.cancel();
    // Temizlik sonucu beklemez: sonuç hemen gösterilir.
    unawaited(_temizle(abone, konusma));
    if (!mounted) return;
    _degerlendir(_son);
  }

  Future<void> _temizle(
    StreamSubscription<String>? abone,
    KonusmaTanima konusma,
  ) async {
    try {
      await abone?.cancel();
    } catch (_) {}
    try {
      await konusma.durdur();
    } catch (_) {}
  }

  /// "Dinlemeyi bitir": akışı kapatıp o ana kadar tanınanı değerlendirir.
  void _bitir() {
    final b = _bitis;
    if (b != null && !b.isCompleted) b.complete();
  }

  void _degerlendir(String soylenen) {
    if (telaffuzKelimeleri(soylenen).isEmpty) {
      setState(() {
        _asama = _Asama.bosta;
        _mesaj = 'Bir şey duyamadım; mikrofona dokunup tekrar söyle';
      });
      return;
    }
    final puan = telaffuzPuani(widget.alistirma.metin, soylenen);
    final dogru = telaffuzDogruMu(puan.oran);
    final deneme = _deneme + 1;
    final bitti = dogru || deneme >= Soyle.enCokDeneme;
    setState(() {
      _puan = puan;
      _deneme = deneme;
      _asama = bitti ? _Asama.bitti : _Asama.bosta;
    });
    if (bitti) widget.onCevap(dogru);
  }

  void _atla() {
    widget.onCevap(Soyle.atla);
    widget.onGonder();
  }

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final a = widget.alistirma;
    final sesAcik = ref.watch(durumProvider).value?.sesAcik ?? true;
    final konusmaAcik = ref.watch(durumProvider).value?.konusmaAcik ?? true;
    final hazir = konusmaAcik && _hazir == true;
    final hazirDegil = !konusmaAcik || _hazir == false;
    final dinliyor = _asama == _Asama.dinliyor;
    final bitti = _asama == _Asama.bitti;
    final puan = _puan;
    final etkin = !widget.kontrolEdildi;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SoruBasligi(a.soru),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(Olcu.b2),
          decoration: BoxDecoration(
            color: r.yuzey,
            border: Border.all(color: r.kenar),
            borderRadius: BorderRadius.circular(Olcu.kose),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(a.metin, style: yazi.titleLarge),
              const SizedBox(height: Olcu.b1),
              Text(
                a.ceviri,
                style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
              ),
            ],
          ),
        ),
        const SizedBox(height: Olcu.b2),
        Align(
          alignment: Alignment.centerLeft,
          child: Semantics(
            button: true,
            enabled: sesAcik,
            label: 'Cümleyi dinle',
            excludeSemantics: true,
            onTap: sesAcik ? _dinleCumle : null,
            child: OutlinedButton.icon(
              key: const Key('soyle-dinle'),
              onPressed: sesAcik ? _dinleCumle : null,
              icon: const Icon(Icons.volume_up),
              label: const Text('Dinle'),
            ),
          ),
        ),
        if (_sesHatasi && sesAcik) ...[
          const SizedBox(height: Olcu.b1),
          Text(
            'Ses kullanılamıyor; cümle yazılı gösterildi',
            style: yazi.bodyMedium?.copyWith(color: r.hata),
          ),
        ],
        const SizedBox(height: Olcu.b3),
        if (hazirDegil)
          _Hazirdegil(
            mesaj: !konusmaAcik
                ? 'Konuşma alıştırmaları ayarlardan kapalı'
                : (_mesaj ?? 'Konuşma tanıma bu cihazda hazır değil'),
            onAtla: etkin ? _atla : null,
          )
        else if (_hazir == null)
          Text(
            'Konuşma tanıma hazırlanıyor…',
            style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          )
        else if (!bitti)
          Center(
            child: Column(
              children: [
                Semantics(
                  button: true,
                  enabled: hazir && etkin,
                  label: dinliyor ? 'Dinlemeyi bitir' : 'Konuş',
                  excludeSemantics: true,
                  onTap: dinliyor ? _bitir : _konus,
                  child: SizedBox(
                    width: 96,
                    height: 96,
                    child: FilledButton(
                      key: const Key('soyle-mikrofon'),
                      onPressed: etkin ? (dinliyor ? _bitir : _konus) : null,
                      style: FilledButton.styleFrom(
                        shape: const CircleBorder(),
                        minimumSize: const Size(96, 96),
                        padding: EdgeInsets.zero,
                        backgroundColor: dinliyor ? r.hata : null,
                      ),
                      child: Icon(dinliyor ? Icons.stop : Icons.mic, size: 40),
                    ),
                  ),
                ),
                const SizedBox(height: Olcu.b1),
                Text(
                  dinliyor
                      ? 'Dinliyorum… bitirmek için dokun'
                      : (_deneme == 0 ? 'Konuş' : 'Tekrar dene'),
                  style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                  textAlign: TextAlign.center,
                ),
                if (_mesaj != null) ...[
                  const SizedBox(height: Olcu.b1),
                  Text(
                    _mesaj!,
                    style: yazi.bodyMedium?.copyWith(color: r.hata),
                    textAlign: TextAlign.center,
                  ),
                ],
              ],
            ),
          ),
        if (puan != null) ...[
          const SizedBox(height: Olcu.b3),
          _Sonuc(
            puan: puan,
            deneme: _deneme,
            bitti: bitti,
            metin: a.metin,
            dogruRenk: r.dogru,
            hataRenk: r.hata,
          ),
        ],
      ],
    );
  }
}

class _Hazirdegil extends StatelessWidget {
  const _Hazirdegil({required this.mesaj, required this.onAtla});
  final String mesaj;
  final VoidCallback? onAtla;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Icon(Icons.mic_off, color: r.metinIkincil),
            const SizedBox(width: Olcu.b1),
            Expanded(child: Text(mesaj, style: yazi.bodyLarge)),
          ],
        ),
        const SizedBox(height: Olcu.b2),
        OutlinedButton(
          key: const Key('soyle-atla'),
          onPressed: onAtla,
          child: const Text('Bu alıştırmayı atla'),
        ),
      ],
    );
  }
}

class _Sonuc extends StatelessWidget {
  const _Sonuc({
    required this.puan,
    required this.deneme,
    required this.bitti,
    required this.metin,
    required this.dogruRenk,
    required this.hataRenk,
  });
  final ({double oran, List<({String kelime, bool dogru})> kelimeler}) puan;
  final int deneme;
  final bool bitti;
  final String metin;
  final Color dogruRenk;
  final Color hataRenk;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final yuzde = (puan.oran * 100).round();
    final gecti = telaffuzDogruMu(puan.oran);
    final dogrular = [
      for (final k in puan.kelimeler)
        if (k.dogru) k.kelime,
    ];
    final yanlislar = [
      for (final k in puan.kelimeler)
        if (!k.dogru) k.kelime,
    ];
    return Semantics(
      container: true,
      label:
          'Sonuç yüzde $yuzde, deneme $deneme / ${Soyle.enCokDeneme}. '
          'Doğru kelimeler: ${dogrular.isEmpty ? 'yok' : dogrular.join(', ')}. '
          'Eksik ya da yanlış: ${yanlislar.isEmpty ? 'yok' : yanlislar.join(', ')}',
      excludeSemantics: true,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text.rich(
            key: const Key('soyle-kelimeler'),
            TextSpan(
              children: [
                for (final k in puan.kelimeler)
                  TextSpan(
                    text: '${k.kelime} ',
                    style: yazi.titleMedium?.copyWith(
                      color: k.dogru ? dogruRenk : hataRenk,
                      fontWeight: FontWeight.w700,
                      decoration: k.dogru ? null : TextDecoration.underline,
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: Olcu.b1),
          Text(
            '%$yuzde (deneme $deneme/${Soyle.enCokDeneme})',
            key: const Key('soyle-yuzde'),
            style: yazi.bodyLarge?.copyWith(
              color: gecti ? dogruRenk : r.metinIkincil,
              fontWeight: FontWeight.w700,
            ),
          ),
          if (bitti && !gecti) ...[
            const SizedBox(height: Olcu.b1),
            Text('Doğru söylenişi: $metin', style: yazi.bodyLarge),
          ],
        ],
      ),
    );
  }
}
