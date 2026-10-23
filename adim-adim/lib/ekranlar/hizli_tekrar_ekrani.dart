/// Hızlı Tekrar (Pratik merkezi): 60 saniyede mümkün olduğunca çok bekleyen ya
/// da zayıf kartı cevapla. Kart seçimi [HizliTekrar.sec], cevaplar mevcut SRS
/// motoruna işlenir ([DurumNotifier.kartIsle]; yanlış cevap hata defterine de
/// yazılır), bitişte tek 'tekrar' günlük kaydı eklenir ([DurumNotifier.tekrarBitir]).
/// Süre bitince ya da kartlar tükenince sonuç ekranı skoru ve doğru oranını
/// gösterir. Cevaplanmamış açık soru sayılmaz. XP verilmez, ceza yoktur.
///
/// Sahibi Yusuf (yusufbesir). Yazan: [İP:Adım Adım Windows sürümü#cihaz]
/// Claude. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf
/// kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/alistirma_oturumu.dart';
import '../bilesenler/oturum_ozeti.dart';
import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../motor/oturum_ozeti.dart';
import '../motor/pratik_oturumlari.dart';
import '../tema/tema.dart';

enum _Evre { giris, oturum, sonuc }

class HizliTekrarEkrani extends ConsumerStatefulWidget {
  const HizliTekrarEkrani({super.key});

  @override
  ConsumerState<HizliTekrarEkrani> createState() => _HizliTekrarDurumu();
}

class _HizliTekrarDurumu extends ConsumerState<HizliTekrarEkrani> {
  _Evre _evre = _Evre.giris;
  List<OturumKarti> _liste = const [];
  final ValueNotifier<int> _kalan = ValueNotifier<int>(HizliTekrar.sureSn);
  Timer? _sayac;
  int _dogru = 0;
  int _toplam = 0;
  bool _sureDoldu = false;

  /// Yalnız oturumdaki bütün kartlar gerçekten cevaplanıp bittiğinde true;
  /// kullanıcı ortada çıkarsa false kalır (başlık yanıltıcı olmasın).
  bool _hepsiBitti = false;
  bool _kaydedildi = false;

  /// Oturum başındaki durum ve ortak Oturum özeti verisi.
  OgrenciDurumu? _onceki;
  OturumOzetiVeri? _veri;

  /// Oturum her başladığında artar; oturum bileşeninin durumu sıfırlansın diye.
  int _tur = 0;

  @override
  void dispose() {
    _sayac?.cancel();
    _kalan.dispose();
    super.dispose();
  }

  void _cik() => context.canPop() ? context.pop() : context.go('/pratik');

  void _basla(List<OturumKarti> liste) {
    _sayac?.cancel();
    setState(() {
      _liste = liste;
      _dogru = 0;
      _toplam = 0;
      _sureDoldu = false;
      _hepsiBitti = false;
      _kaydedildi = false;
      _veri = null;
      _onceki = ref.read(durumProvider).value;
      _kalan.value = HizliTekrar.sureSn;
      _tur++;
      _evre = _Evre.oturum;
    });
    _sayac = Timer.periodic(const Duration(seconds: 1), (_) {
      _kalan.value = _kalan.value - 1;
      if (_kalan.value <= 0) {
        _sureDoldu = true;
        _bitir();
      }
    });
  }

  void _bitir() {
    _sayac?.cancel();
    _sayac = null;
    if (_kaydedildi) return;
    _kaydedildi = true;
    if (_toplam > 0) {
      ref.read(durumProvider.notifier).tekrarBitir(_dogru, _toplam);
      // Durum eşzamanlı güncellenir; özet bu ana göre hesaplanır.
      final onceki = _onceki;
      final sonraki = ref.read(durumProvider).value;
      if (onceki != null && sonraki != null) {
        _veri = OturumOzetiMotoru.hesapla(
          onceki: onceki,
          sonraki: sonraki,
          kurslar: ref.read(kurslarProvider),
          dogru: _dogru,
          toplam: _toplam,
          xp: sonraki.xp - onceki.xp,
        );
      }
    }
    if (mounted) setState(() => _evre = _Evre.sonuc);
  }

  @override
  Widget build(BuildContext context) {
    switch (_evre) {
      case _Evre.oturum:
        return Scaffold(
          body: SafeArea(
            child: Column(
              children: [
                _SayacSeridi(kalan: _kalan),
                Expanded(
                  child: AlistirmaOturumu(
                    key: ValueKey('hizli-oturum-$_tur'),
                    alistirmalar: [for (final k in _liste) k.alistirma],
                    onSonuc: (i, dogru) {
                      if (_kaydedildi) return;
                      _toplam++;
                      if (dogru) _dogru++;
                      ref
                          .read(durumProvider.notifier)
                          .kartIsle(_liste[i].kartId, dogru);
                    },
                    onBitti: (_, _) {
                      _hepsiBitti = true;
                      _bitir();
                    },
                    onKapat: () => _toplam > 0 ? _bitir() : _cik(),
                    cikisOnayi: false,
                  ),
                ),
              ],
            ),
          ),
        );
      case _Evre.sonuc:
        return _iskele(
          _Sonuc(
            dogru: _dogru,
            toplam: _toplam,
            sureDoldu: _sureDoldu,
            hepsiBitti: _hepsiBitti,
            onYeniden: () => setState(() => _evre = _Evre.giris),
            onBitir: _cik,
            ozet: _veri,
          ),
        );
      case _Evre.giris:
        final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
        final liste = HizliTekrar.sec(
          durum,
          ref.watch(alanKurslariProvider),
          ref.watch(bugunProvider),
        );
        return _iskele(_Giris(liste: liste, onBasla: () => _basla(liste)));
    }
  }

  Widget _iskele(Widget govde) => Scaffold(
    appBar: AppBar(
      title: const Text('Hızlı tekrar'),
      leading: IconButton(
        icon: const Icon(Icons.arrow_back),
        tooltip: 'Geri',
        onPressed: _cik,
      ),
    ),
    body: SafeArea(
      child: SayfaGovdesi(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(Olcu.b3),
            child: govde,
          ),
        ),
      ),
    ),
  );
}

/// Oturumun üstündeki geri sayım: kalan saniye ve ilerleme çubuğu.
class _SayacSeridi extends StatelessWidget {
  const _SayacSeridi({required this.kalan});
  final ValueNotifier<int> kalan;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return ValueListenableBuilder<int>(
      valueListenable: kalan,
      builder: (context, sn, _) {
        final az = sn <= 10;
        return Padding(
          padding: const EdgeInsets.fromLTRB(
            Olcu.b3,
            Olcu.b1,
            Olcu.b3,
            Olcu.b1,
          ),
          child: Semantics(
            label: 'Kalan süre: $sn saniye',
            excludeSemantics: true,
            child: Row(
              children: [
                Icon(Icons.timer_outlined, color: az ? r.hata : r.ana),
                const SizedBox(width: Olcu.b1),
                Text(
                  '$sn sn',
                  key: const ValueKey('hizli-sayac'),
                  style: yazi.titleMedium?.copyWith(color: az ? r.hata : null),
                ),
                const SizedBox(width: Olcu.b2),
                Expanded(
                  child: LinearProgressIndicator(
                    value: (sn / HizliTekrar.sureSn).clamp(0.0, 1.0),
                    minHeight: 8,
                    borderRadius: BorderRadius.circular(Olcu.b1),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _Giris extends StatelessWidget {
  const _Giris({required this.liste, required this.onBasla});
  final List<OturumKarti> liste;
  final VoidCallback onBasla;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final bos = liste.isEmpty;
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(
          bos ? Icons.task_alt : Icons.bolt,
          size: 64,
          color: bos ? r.metinIkincil : r.ana,
        ),
        const SizedBox(height: Olcu.b2),
        Text(
          bos ? 'Şimdilik tekrar edilecek kart yok' : 'Hızlı tekrar',
          style: yazi.titleLarge,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: Olcu.b1),
        Text(
          bos
              ? 'Ders çözdükçe bekleyen ve zayıf kartların burada birikir.'
              : '${HizliTekrar.sureSn} saniyede mümkün olduğunca çok kart '
                    'cevapla. ${liste.length} kart hazır (bekleyen ve zayıf '
                    'kartlar). Ceza yok; cevapların tekrar takvimine işlenir.',
          style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: Olcu.b3),
        if (!bos)
          FilledButton.icon(
            key: const ValueKey('hizli-basla'),
            icon: const Icon(Icons.play_arrow),
            label: const Text('Başla'),
            onPressed: onBasla,
          ),
      ],
    );
  }
}

class _Sonuc extends StatelessWidget {
  const _Sonuc({
    required this.dogru,
    required this.toplam,
    required this.sureDoldu,
    required this.hepsiBitti,
    required this.onYeniden,
    required this.onBitir,
    this.ozet,
  });
  final int dogru;
  final int toplam;
  final bool sureDoldu;
  final bool hepsiBitti;
  final VoidCallback onYeniden;
  final VoidCallback onBitir;
  final OturumOzetiVeri? ozet;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final s = HizliTekrar.sonuc(dogru, toplam);
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Icon(Icons.emoji_events_outlined, size: 64, color: r.vurgu),
        const SizedBox(height: Olcu.b2),
        Semantics(
          header: true,
          child: Text(
            sureDoldu
                ? 'Süre doldu'
                : (hepsiBitti ? 'Hepsini bitirdin' : 'Oturum bitti'),
            style: yazi.titleLarge,
            textAlign: TextAlign.center,
          ),
        ),
        const SizedBox(height: Olcu.b2),
        Text(
          'Skor: ${s.skor}',
          key: const ValueKey('hizli-skor'),
          style: yazi.headlineMedium,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: Olcu.b1),
        Text(
          'Doğru oranı: %${s.yuzde} ($dogru/$toplam)',
          key: const ValueKey('hizli-oran'),
          style: yazi.titleMedium,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: Olcu.b1),
        Text(
          toplam == 0
              ? 'Hiç kart cevaplamadın.'
              : 'Cevapların tekrar kayıtlarına işlendi.',
          style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          textAlign: TextAlign.center,
        ),
        if (ozet != null) ...[
          const SizedBox(height: Olcu.b2),
          OturumOzeti(veri: ozet!),
        ],
        const SizedBox(height: Olcu.b3),
        FilledButton(
          key: const ValueKey('hizli-yeniden'),
          onPressed: onYeniden,
          child: const Text('Tekrar dene'),
        ),
        const SizedBox(height: Olcu.b1),
        OutlinedButton(
          key: const ValueKey('hizli-bitir'),
          onPressed: onBitir,
          child: const Text('Bitir'),
        ),
      ],
    );
  }
}
