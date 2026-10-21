/// Pratik merkezi etkinlik ekranları (ÖZELLİK 44): Zamana karşı eşleştirme
/// (4-8 çift, süre sayacı, en iyi süre), Artan zorluk turu ve Kelime kartları
/// (çevirme). Hepsi çevrimdışı ve cezasızdır: yanlış eşleştirme süre eklemez;
/// kart aralıkları, hata defteri ve XP değişmez. Yalnız en iyi eşleştirme
/// süresi saklanır. Süre, 100 ms'lik sayaç adımlarından hesaplanır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:async';
import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/alistirma_oturumu.dart';
import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../motor/ders_meta.dart';
import '../motor/pratik.dart';
import '../tema/tema.dart';

Widget _iskele(BuildContext context, String baslik, Widget govde) => Scaffold(
  appBar: AppBar(
    title: Text(baslik),
    leading: IconButton(
      icon: const Icon(Icons.arrow_back),
      tooltip: 'Geri',
      onPressed: () => context.canPop() ? context.pop() : context.go('/profil'),
    ),
  ),
  body: SafeArea(child: SayfaGovdesi(child: govde)),
);

Widget _bosMesaj(BuildContext context, String metin) => Center(
  child: Padding(
    padding: const EdgeInsets.all(Olcu.b3),
    child: Text(
      metin,
      style: Theme.of(context).textTheme.bodyLarge,
      textAlign: TextAlign.center,
    ),
  ),
);

const String _veriYok = 'Önce birkaç ders çöz; kelimelerin burada toplanır.';

// ---------------------------------------------------------------------------
// Zamana karşı eşleştirme
// ---------------------------------------------------------------------------

class EslestirmeEkrani extends ConsumerStatefulWidget {
  const EslestirmeEkrani({super.key});

  @override
  ConsumerState<EslestirmeEkrani> createState() => _EslestirmeDurumu();
}

class _EslestirmeDurumu extends ConsumerState<EslestirmeEkrani> {
  List<KelimeCifti> _ciftler = const [];
  List<int> _sagSira = const [];
  final Set<int> _eslesen = {};
  int? _secilenSol;
  int? _yanlisSag;
  final ValueNotifier<int> _ms = ValueNotifier<int>(0);
  Timer? _sayac;
  bool _bitti = false;
  bool _yeniEnIyi = false;
  int? _oncekiEnIyi;
  bool _hazir = false;

  @override
  void initState() {
    super.initState();
    _yeniOyun();
  }

  void _yeniOyun() {
    final durum = ref.read(durumProvider).value ?? const OgrenciDurumu();
    final kurslar = ref.read(alanKurslariProvider);
    final tohum = DateTime.now().microsecondsSinceEpoch;
    _ciftler = Pratik.eslestirmeCiftleri(durum, kurslar, tohum: tohum);
    _sagSira = List.generate(_ciftler.length, (i) => i)
      ..shuffle(math.Random(tohum));
    _eslesen.clear();
    _secilenSol = null;
    _yanlisSag = null;
    _bitti = false;
    _yeniEnIyi = false;
    _ms.value = 0;
    _sayac?.cancel();
    _sayac = null;
    if (_ciftler.isNotEmpty) {
      _sayac = Timer.periodic(const Duration(milliseconds: 100), (_) {
        _ms.value += 100;
      });
    }
    _hazir = true;
  }

  @override
  void dispose() {
    _sayac?.cancel();
    _ms.dispose();
    super.dispose();
  }

  void _solaDokun(int i) {
    if (_bitti || _eslesen.contains(i)) return;
    setState(() {
      _secilenSol = i;
      _yanlisSag = null;
    });
  }

  void _sagaDokun(int cift) {
    if (_bitti || _eslesen.contains(cift)) return;
    final sol = _secilenSol;
    if (sol == null) {
      setState(() => _yanlisSag = null);
      return;
    }
    if (sol == cift) {
      setState(() {
        _eslesen.add(cift);
        _secilenSol = null;
        _yanlisSag = null;
      });
      if (_eslesen.length == _ciftler.length) _bitir();
    } else {
      // Ceza yok: yalnızca "tekrar dene" bilgisi.
      setState(() => _yanlisSag = cift);
    }
  }

  void _bitir() {
    _sayac?.cancel();
    _sayac = null;
    final ms = _ms.value;
    final onceki = ref.read(durumProvider).value?.eslestirmeEnIyiMs;
    setState(() {
      _bitti = true;
      _oncekiEnIyi = onceki;
      _yeniEnIyi = ms > 0 && (onceki == null || ms < onceki);
    });
    ref.read(durumProvider.notifier).eslestirmeBitir(ms);
  }

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    if (_hazir && _ciftler.isEmpty) {
      return _iskele(
        context,
        'Zamana karşı eşleştirme',
        _bosMesaj(context, _veriYok),
      );
    }
    final enIyi = ref.watch(durumProvider).value?.eslestirmeEnIyiMs;

    Widget kutu({
      required Key anahtar,
      required String metin,
      required bool secili,
      required bool tamam,
      required bool hata,
      required VoidCallback onTap,
    }) {
      final renk = tamam
          ? r.dogru
          : hata
          ? r.hata
          : (secili ? r.ana : r.metinIkincil);
      return Semantics(
        button: true,
        selected: secili,
        label: tamam ? '$metin, eşleşti' : metin,
        excludeSemantics: true,
        child: Material(
          color: r.yuzey,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
            side: BorderSide(color: renk, width: secili || hata ? 3 : 1),
          ),
          child: InkWell(
            key: anahtar,
            borderRadius: BorderRadius.circular(8),
            onTap: tamam ? null : onTap,
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: Olcu.hedef),
              child: Padding(
                padding: const EdgeInsets.symmetric(
                  horizontal: Olcu.b1,
                  vertical: Olcu.b1,
                ),
                child: Row(
                  children: [
                    if (tamam) ...[
                      Icon(Icons.check, color: r.dogru, size: 20),
                      const SizedBox(width: 4),
                    ],
                    Expanded(
                      child: Text(
                        metin,
                        style: yazi.bodyMedium?.copyWith(
                          color: tamam ? r.metinIkincil : null,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    final govde = _bitti
        ? Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(Olcu.b3),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.emoji_events_outlined, size: 64, color: r.ana),
                  const SizedBox(height: Olcu.b2),
                  Text(
                    'Süren: ${Pratik.sureMetni(_ms.value)}',
                    style: yazi.titleLarge,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: Olcu.b1),
                  Text(
                    _yeniEnIyi
                        ? 'Yeni en iyi süre!'
                        : (_oncekiEnIyi == null
                              ? ''
                              : 'En iyi süre: ${Pratik.sureMetni(_oncekiEnIyi!)}'),
                    style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: Olcu.b3),
                  Wrap(
                    spacing: Olcu.b2,
                    runSpacing: Olcu.b1,
                    alignment: WrapAlignment.center,
                    children: [
                      FilledButton(
                        key: const ValueKey('eslestirme-tekrar'),
                        onPressed: () => setState(_yeniOyun),
                        child: const Text('Yeniden oyna'),
                      ),
                      OutlinedButton(
                        onPressed: () => context.canPop()
                            ? context.pop()
                            : context.go('/pratik'),
                        child: const Text('Kapat'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          )
        : SingleChildScrollView(
            padding: const EdgeInsets.all(Olcu.b2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: ValueListenableBuilder<int>(
                        valueListenable: _ms,
                        builder: (c, ms, _) => Semantics(
                          label: 'Süre ${Pratik.sureMetni(ms)}',
                          excludeSemantics: true,
                          child: Text(
                            Pratik.sureMetni(ms),
                            key: const ValueKey('eslestirme-sure'),
                            style: yazi.titleLarge,
                          ),
                        ),
                      ),
                    ),
                    if (enIyi != null)
                      Flexible(
                        child: Text(
                          'En iyi: ${Pratik.sureMetni(enIyi)}',
                          style: yazi.bodyMedium?.copyWith(
                            color: r.metinIkincil,
                          ),
                          textAlign: TextAlign.end,
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: Olcu.b1),
                Text(
                  _yanlisSag != null
                      ? 'Olmadı, tekrar dene. Ceza yok.'
                      : 'Soldan bir kelime seç, sağdan karşılığına dokun.',
                  style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                ),
                const SizedBox(height: Olcu.b2),
                for (var i = 0; i < _ciftler.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: Olcu.b1),
                    child: IntrinsicHeight(
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Expanded(
                            child: kutu(
                              anahtar: ValueKey('esl-sol-$i'),
                              metin: _ciftler[i].metin,
                              secili: _secilenSol == i,
                              tamam: _eslesen.contains(i),
                              hata: false,
                              onTap: () => _solaDokun(i),
                            ),
                          ),
                          const SizedBox(width: Olcu.b1),
                          Expanded(
                            child: kutu(
                              anahtar: ValueKey('esl-sag-${_sagSira[i]}'),
                              metin: _ciftler[_sagSira[i]].anlam,
                              secili: false,
                              tamam: _eslesen.contains(_sagSira[i]),
                              hata: _yanlisSag == _sagSira[i],
                              onTap: () => _sagaDokun(_sagSira[i]),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          );
    return _iskele(context, 'Zamana karşı eşleştirme', govde);
  }
}

// ---------------------------------------------------------------------------
// Artan zorluk turu
// ---------------------------------------------------------------------------

class ArtanZorlukEkrani extends ConsumerStatefulWidget {
  const ArtanZorlukEkrani({super.key});

  @override
  ConsumerState<ArtanZorlukEkrani> createState() => _TurDurumu();
}

class _TurDurumu extends ConsumerState<ArtanZorlukEkrani> {
  List<PratikKarti>? _oturum;
  ({int dogru, int toplam})? _sonuc;

  List<PratikKarti> _sec() => Pratik.artanZorlukTuru(
    ref.read(durumProvider).value ?? const OgrenciDurumu(),
    ref.read(alanKurslariProvider),
    tohum: DateTime.now().microsecondsSinceEpoch,
  );

  @override
  Widget build(BuildContext context) {
    ref.watch(durumProvider);
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final oturum = _oturum;
    if (oturum != null && _sonuc == null) {
      return Scaffold(
        body: SafeArea(
          child: AlistirmaOturumu(
            alistirmalar: [for (final o in oturum) o.alistirma],
            // Pratik: SRS ve hata defteri güncellenmez.
            onSonuc: (i, dogru) {},
            onBitti: (d, t) => setState(() => _sonuc = (dogru: d, toplam: t)),
            onKapat: () => setState(() => _oturum = null),
          ),
        ),
      );
    }
    final sonuc = _sonuc;
    final Widget govde;
    if (sonuc != null) {
      govde = Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(Olcu.b3),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.check_circle, size: 64, color: r.dogru),
              const SizedBox(height: Olcu.b2),
              Text('Tur tamamlandı', style: yazi.titleLarge),
              const SizedBox(height: Olcu.b1),
              Text(
                '${sonuc.toplam} alıştırmadan ${sonuc.dogru} tanesini doğru bildin.',
                style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: Olcu.b3),
              FilledButton(
                onPressed: () => setState(() {
                  _sonuc = null;
                  _oturum = null;
                }),
                child: const Text('Tamam'),
              ),
            ],
          ),
        ),
      );
    } else {
      final tur = _sec();
      if (tur.isEmpty) {
        govde = _bosMesaj(context, _veriYok);
      } else {
        final sayi = {for (final z in Zorluk.values) z: 0};
        for (final t in tur) {
          final z = DersMeta.adim(t.alistirma).zorluk;
          sayi[z] = sayi[z]! + 1;
        }
        govde = Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(Olcu.b3),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.stairs_outlined, size: 64, color: r.ana),
                const SizedBox(height: Olcu.b2),
                Text(
                  'Kolaydan zora ${tur.length} alıştırma',
                  style: yazi.titleLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: Olcu.b1),
                Text(
                  [
                    for (final z in Zorluk.values)
                      if (sayi[z]! > 0) '${sayi[z]} ${z.etiket.toLowerCase()}',
                  ].join(' · '),
                  key: const ValueKey('tur-dagilim'),
                  style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: Olcu.b3),
                FilledButton(
                  key: const ValueKey('tur-basla'),
                  onPressed: () => setState(() {
                    _oturum = tur;
                    _sonuc = null;
                  }),
                  child: const Text('Başla'),
                ),
              ],
            ),
          ),
        );
      }
    }
    return _iskele(context, 'Artan zorluk turu', govde);
  }
}

// ---------------------------------------------------------------------------
// Kelime kartları (çevirme)
// ---------------------------------------------------------------------------

class KelimeKartlariEkrani extends ConsumerStatefulWidget {
  const KelimeKartlariEkrani({super.key});

  @override
  ConsumerState<KelimeKartlariEkrani> createState() => _KartlarDurumu();
}

class _KartlarDurumu extends ConsumerState<KelimeKartlariEkrani> {
  late final List<KelimeCifti> _deste;
  int _indeks = 0;
  bool _cevrik = false;

  @override
  void initState() {
    super.initState();
    _deste = Pratik.kartDestesi(
      ref.read(durumProvider).value ?? const OgrenciDurumu(),
      ref.read(alanKurslariProvider),
      tohum: DateTime.now().microsecondsSinceEpoch,
    );
  }

  void _git(int n) => setState(() {
    _indeks = (_indeks + n).clamp(0, _deste.length - 1);
    _cevrik = false;
  });

  @override
  Widget build(BuildContext context) {
    if (_deste.isEmpty) {
      return _iskele(context, 'Kelime kartları', _bosMesaj(context, _veriYok));
    }
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final kart = _deste[_indeks];
    final metin = _cevrik ? kart.anlam : kart.metin;
    return _iskele(
      context,
      'Kelime kartları',
      SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              '${_indeks + 1} / ${_deste.length}',
              key: const ValueKey('kart-sayac'),
              style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: Olcu.b1),
            Semantics(
              button: true,
              label: _cevrik
                  ? 'Anlam: $metin. Çevirmek için dokun'
                  : 'Kelime: $metin. Çevirmek için dokun',
              excludeSemantics: true,
              child: Card(
                color: r.yuzey,
                child: InkWell(
                  key: const ValueKey('kart-cevir'),
                  borderRadius: BorderRadius.circular(Olcu.kose),
                  onTap: () => setState(() => _cevrik = !_cevrik),
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(minHeight: 180),
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
            const SizedBox(height: Olcu.b2),
            Wrap(
              spacing: Olcu.b2,
              runSpacing: Olcu.b1,
              alignment: WrapAlignment.center,
              children: [
                OutlinedButton(
                  key: const ValueKey('kart-onceki'),
                  onPressed: _indeks > 0 ? () => _git(-1) : null,
                  child: const Text('Önceki'),
                ),
                FilledButton(
                  key: const ValueKey('kart-sonraki'),
                  onPressed: _indeks < _deste.length - 1 ? () => _git(1) : null,
                  child: const Text('Sonraki'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
