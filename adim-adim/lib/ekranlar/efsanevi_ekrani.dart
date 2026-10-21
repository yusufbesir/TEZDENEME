/// Efsanevi zor tekrar ekranı (ÖZELLİK 43): biten ünitenin ([Efsanevi.sec])
/// sorularını İPUCUSUZ ve SÜRELİ çözer (soru başına 15 sn, toplam süre geri
/// sayar). En az %90 doğru ve süre dolmadan bitirilirse ünite "altın" olur.
/// Başarısızlıkta ceza yoktur: kart aralıkları, hata defteri, XP ve seri
/// değişmez; istenildiği kadar yeniden denenir. Ana sayfada ünite sonundaki
/// "Efsanevi tekrar" düğmesinden açılır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/alistirma_oturumu.dart';
import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/icerik.dart';
import '../motor/efsanevi.dart';
import '../tema/tema.dart';

class EfsaneviEkrani extends ConsumerStatefulWidget {
  const EfsaneviEkrani({
    super.key,
    required this.kursId,
    required this.uniteIndeks,
  });
  final String kursId;
  final int uniteIndeks;

  @override
  ConsumerState<EfsaneviEkrani> createState() => _EfsaneviDurumu();
}

enum _Sonuc { yok, gecti, kaldi, sureDoldu }

class _EfsaneviDurumu extends ConsumerState<EfsaneviEkrani> {
  Kurs? _kurs;
  List<({int unite, String kartId, Alistirma alistirma})> _sorular = const [];
  int _tur = 0;
  int _kalanSn = 0;
  Timer? _sayac;
  _Sonuc _sonuc = _Sonuc.yok;
  int _dogru = 0;
  int _toplam = 0;
  bool _zatenAltin = false;

  @override
  void initState() {
    super.initState();
    final durum = ref.read(durumProvider).value;
    for (final k in ref.read(kurslarProvider)) {
      if (k.id == widget.kursId) _kurs = k;
    }
    final kurs = _kurs;
    if (durum != null &&
        kurs != null &&
        Efsanevi.acik(durum, kurs, widget.uniteIndeks)) {
      _zatenAltin = Efsanevi.altinMi(durum, kurs.uniteler[widget.uniteIndeks]);
      _baslat();
    }
  }

  void _baslat() {
    final kurs = _kurs!;
    _sorular = Efsanevi.sec(
      kurs,
      widget.uniteIndeks,
      tohum: DateTime.now().millisecondsSinceEpoch + _tur,
    );
    _tur++;
    _kalanSn = Efsanevi.sureSn(_sorular.length);
    _sonuc = _Sonuc.yok;
    _sayac?.cancel();
    _sayac = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted || _sonuc != _Sonuc.yok) return;
      setState(() => _kalanSn--);
      if (_kalanSn <= 0) {
        _sayac?.cancel();
        setState(() => _sonuc = _Sonuc.sureDoldu);
      }
    });
  }

  @override
  void dispose() {
    _sayac?.cancel();
    super.dispose();
  }

  void _cik() => context.canPop() ? context.pop() : context.go('/yol');

  Future<void> _bitti(int dogru, int toplam) async {
    if (_sonuc != _Sonuc.yok) return;
    _sayac?.cancel();
    final gecti = Efsanevi.gecti(dogru, toplam);
    setState(() {
      _dogru = dogru;
      _toplam = toplam;
      _sonuc = gecti ? _Sonuc.gecti : _Sonuc.kaldi;
    });
    if (gecti) {
      await ref
          .read(durumProvider.notifier)
          .efsaneviGecildi(_kurs!.uniteler[widget.uniteIndeks].id);
    }
  }

  static String _sureMetni(int sn) {
    final dk = sn ~/ 60;
    final s = sn % 60;
    return '$dk:${s.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final kurs = _kurs;
    return Scaffold(
      body: SafeArea(
        child: kurs == null || _sorular.isEmpty
            ? _Bos(onGeri: _cik)
            : _sonuc != _Sonuc.yok
            ? _SonucGorunumu(
                sonuc: _sonuc,
                uniteAd: kurs.uniteler[widget.uniteIndeks].ad,
                dogru: _dogru,
                toplam: _toplam,
                zatenAltin: _zatenAltin,
                onTekrar: () => setState(_baslat),
                onDon: _cik,
              )
            : Column(
                children: [
                  _SureSeridi(
                    kalan: _kalanSn,
                    toplam: Efsanevi.sureSn(_sorular.length),
                    metin: _sureMetni(_kalanSn),
                  ),
                  Expanded(
                    child: AlistirmaOturumu(
                      // Yeni denemede oturum sıfırlanır.
                      key: ValueKey('efsanevi-$_tur'),
                      alistirmalar: [for (final s in _sorular) s.alistirma],
                      ipucuAcik: false,
                      // Kart (SRS) ve hata defteri güncellenmez: ceza yok.
                      onSonuc: (_, _) {},
                      onBitti: _bitti,
                      onKapat: _cik,
                    ),
                  ),
                ],
              ),
      ),
    );
  }
}

class _SureSeridi extends StatelessWidget {
  const _SureSeridi({
    required this.kalan,
    required this.toplam,
    required this.metin,
  });
  final int kalan;
  final int toplam;
  final String metin;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final az = kalan <= 20;
    return Semantics(
      label: 'Kalan süre $metin',
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(Olcu.b2, Olcu.b1, Olcu.b2, 0),
        child: Row(
          children: [
            Icon(Icons.timer_outlined, color: az ? r.hata : r.vurgu),
            const SizedBox(width: Olcu.b1),
            Text(
              metin,
              key: const ValueKey('efsanevi-sure'),
              style: yazi.titleMedium?.copyWith(color: az ? r.hata : null),
            ),
            const SizedBox(width: Olcu.b2),
            Expanded(
              child: ClipRRect(
                borderRadius: BorderRadius.circular(Olcu.b1),
                child: LinearProgressIndicator(
                  value: toplam <= 0 ? 0 : (kalan / toplam).clamp(0.0, 1.0),
                  minHeight: 8,
                ),
              ),
            ),
            const SizedBox(width: Olcu.b2),
            Text(
              'İpucu yok',
              style: yazi.labelMedium?.copyWith(color: r.metinIkincil),
            ),
          ],
        ),
      ),
    );
  }
}

class _SonucGorunumu extends StatelessWidget {
  const _SonucGorunumu({
    required this.sonuc,
    required this.uniteAd,
    required this.dogru,
    required this.toplam,
    required this.zatenAltin,
    required this.onTekrar,
    required this.onDon,
  });
  final _Sonuc sonuc;
  final String uniteAd;
  final int dogru;
  final int toplam;
  final bool zatenAltin;
  final VoidCallback onTekrar;
  final VoidCallback onDon;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final gecti = sonuc == _Sonuc.gecti;
    final baslik = switch (sonuc) {
      _Sonuc.gecti =>
        zatenAltin ? 'Altın ünite yine seninle' : 'Ünite altın oldu',
      _Sonuc.sureDoldu => 'Süre doldu',
      _ => 'Bu sefer olmadı',
    };
    final aciklama = switch (sonuc) {
      _Sonuc.gecti =>
        '$dogru/$toplam doğru, ipucusuz ve süre içinde. Kart takvimin '
            'değişmedi.',
      _Sonuc.sureDoldu =>
        'Ceza yok: puanın, kartların ve serin olduğu gibi duruyor. '
            'İstediğin zaman yeniden deneyebilirsin.',
      _ =>
        '$dogru/$toplam doğru; geçmek için en az %90 gerekir. Ceza yok: '
            'kartların, hata defterin ve serin değişmedi.',
    };
    return SayfaGovdesi(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Icon(
              gecti ? Icons.workspace_premium : Icons.replay,
              size: 64,
              color: gecti ? r.vurgu : r.ana,
            ),
            const SizedBox(height: Olcu.b2),
            Text(
              baslik,
              key: const ValueKey('efsanevi-durum'),
              textAlign: TextAlign.center,
              style: yazi.headlineMedium,
            ),
            const SizedBox(height: Olcu.b1),
            Text(
              uniteAd,
              textAlign: TextAlign.center,
              style: yazi.bodyLarge?.copyWith(color: r.metinIkincil),
            ),
            const SizedBox(height: Olcu.b2),
            Text(aciklama, textAlign: TextAlign.center, style: yazi.bodyLarge),
            const SizedBox(height: Olcu.b3),
            if (!gecti) ...[
              FilledButton(
                key: const ValueKey('efsanevi-tekrar'),
                style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
                onPressed: onTekrar,
                child: const Text('Yeniden dene'),
              ),
              const SizedBox(height: Olcu.b2),
            ],
            OutlinedButton(
              key: const ValueKey('efsanevi-don'),
              style: OutlinedButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: onDon,
              child: const Text('Yola dön'),
            ),
          ],
        ),
      ),
    );
  }
}

class _Bos extends StatelessWidget {
  const _Bos({required this.onGeri});
  final VoidCallback onGeri;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b3),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.workspace_premium, size: 48, color: r.ana),
            const SizedBox(height: Olcu.b2),
            Text(
              'Efsanevi tekrar, ünite bitince açılır',
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: Olcu.b2),
            FilledButton(onPressed: onGeri, child: const Text('Yola dön')),
          ],
        ),
      ),
    );
  }
}
