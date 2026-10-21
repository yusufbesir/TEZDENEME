/// Görsel kelime kartları ve konu oyunları (ÖZELLİK 58). Liste: kelime +
/// basit Unicode emoji (yalnız doğru eşleştirilebilen kelimelerde, bkz.
/// GorselKelimeler), konu çipleri (yiyecek, hayvanlar, ...) ve ünite paketi
/// çipleri (ÖZELLİK 23 kelime paketleriyle birleşir; konu ve paket birlikte
/// süzer). İki oyun: "Dokun-eşleştir" (görsele dokun, sonra kelimesine) ve
/// "Kaydır" (kart doğru eşleşmeyse sağa, yanlışsa sola kaydır ya da
/// Evet/Hayır'a dokun). Oyunlar ceza içermez; kart aralıklarını (SRS), hata
/// defterini ve XP'yi değiştirmez. Pratik merkezi'nden `push` ile açılır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../motor/gorsel_kelime.dart';
import '../sozluk/dil_tanimi.dart';
import '../tema/tema.dart';

enum _Mod { liste, eslestir, kaydir }

class GorselKelimeEkrani extends ConsumerStatefulWidget {
  const GorselKelimeEkrani({super.key});

  @override
  ConsumerState<GorselKelimeEkrani> createState() => _GorselDurumu();
}

class _GorselDurumu extends ConsumerState<GorselKelimeEkrani> {
  _Mod _mod = _Mod.liste;
  String? _konu;
  String? _uniteId;

  // Dokun-eşleştir
  List<GorselKelime> _tur = const [];
  List<int> _sagSira = const [];
  final Set<int> _eslesen = {};
  int? _solSecili;
  bool _yanlis = false;
  int _deneme = 0;

  // Kaydır
  List<KaydirKarti> _kartlar = const [];
  int _kart = 0;
  int _dogru = 0;
  String? _sonGeriBildirim;

  List<GorselKelime> _suzulmus(List<GorselKelime> havuz) =>
      GorselKelimeler.suz(havuz, konu: _konu, uniteId: _uniteId);

  void _eslestirmeBaslat(List<GorselKelime> liste) {
    final tohum = DateTime.now().microsecondsSinceEpoch;
    final tur = GorselKelimeler.eslestirmeTuru(liste, tohum: tohum);
    setState(() {
      _mod = _Mod.eslestir;
      _tur = tur;
      _sagSira = List.generate(tur.length, (i) => i)
        ..shuffle(math.Random(tohum + 1));
      _eslesen.clear();
      _solSecili = null;
      _yanlis = false;
      _deneme = 0;
    });
  }

  void _kaydirBaslat(List<GorselKelime> liste) {
    final tohum = DateTime.now().microsecondsSinceEpoch;
    setState(() {
      _mod = _Mod.kaydir;
      _kartlar = GorselKelimeler.kaydirTuru(liste, tohum: tohum);
      _kart = 0;
      _dogru = 0;
      _sonGeriBildirim = null;
    });
  }

  void _cevapla(bool evet) {
    if (_kart >= _kartlar.length) return;
    final k = _kartlar[_kart];
    final dogru = evet == k.dogruMu;
    setState(() {
      if (dogru) _dogru++;
      _sonGeriBildirim = dogru
          ? 'Doğru'
          : 'Yanlış: ${k.kelime.kelime} = ${k.kelime.anlam}';
      _kart++;
    });
  }

  void _solaDokun(int i) {
    if (_eslesen.contains(i)) return;
    setState(() {
      _solSecili = i;
      _yanlis = false;
    });
  }

  void _sagaDokun(int cift) {
    if (_eslesen.contains(cift)) return;
    final sol = _solSecili;
    if (sol == null) return;
    setState(() {
      _deneme++;
      if (sol == cift) {
        _eslesen.add(cift);
        _solSecili = null;
        _yanlis = false;
      } else {
        _yanlis = true; // ceza yok: yalnızca "tekrar dene"
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final sozluk = ref.watch(sozlukProvider);
    final kurslar = ref.watch(alanKurslariProvider);
    final havuz = GorselKelimeler.havuz(sozluk, kurslar);
    final liste = _suzulmus(havuz);
    final konular = GorselKelimeler.konular(havuz);
    final paketler = [
      for (final p in sozluk.paketler(kurslar))
        if (havuz.any((g) => g.uniteId == p.uniteId)) p,
    ];

    Widget govde;
    if (_mod == _Mod.eslestir) {
      govde = _eslestirmeGovdesi(context);
    } else if (_mod == _Mod.kaydir) {
      govde = _kaydirGovdesi(context);
    } else if (havuz.isEmpty) {
      govde = Center(
        child: Padding(
          padding: const EdgeInsets.all(Olcu.b3),
          child: Text(
            'Bu kurslarda görsel eşleşen kelime yok. İngilizce ya da Almanca '
            'dersleri açıldıkça burada görünür.',
            key: const ValueKey('gorsel-bos'),
            style: yazi.bodyLarge,
            textAlign: TextAlign.center,
          ),
        ),
      );
    } else {
      govde = SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(
              'Kelimeler basit simgelerle gelir. Oyunlarda ceza yok; kart '
              'takvimi değişmez.',
              style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
            ),
            const SizedBox(height: Olcu.b2),
            Text('Konu', style: yazi.labelLarge),
            const SizedBox(height: Olcu.b1),
            Wrap(
              spacing: Olcu.b1,
              runSpacing: Olcu.b1,
              children: [
                FilterChip(
                  key: const ValueKey('gorsel-konu-hepsi'),
                  label: Text('Tümü (${havuz.length})'),
                  selected: _konu == null,
                  showCheckmark: false,
                  onSelected: (_) => setState(() => _konu = null),
                ),
                for (final k in konular)
                  FilterChip(
                    key: ValueKey('gorsel-konu-${k.konu.kod}'),
                    label: Text('${k.konu.simge} ${k.konu.ad} (${k.adet})'),
                    selected: _konu == k.konu.kod,
                    showCheckmark: false,
                    onSelected: (s) =>
                        setState(() => _konu = s ? k.konu.kod : null),
                  ),
              ],
            ),
            if (paketler.isNotEmpty) ...[
              const SizedBox(height: Olcu.b2),
              Text('Kelime paketi (ünite)', style: yazi.labelLarge),
              const SizedBox(height: Olcu.b1),
              Wrap(
                spacing: Olcu.b1,
                runSpacing: Olcu.b1,
                children: [
                  for (final p in paketler)
                    FilterChip(
                      key: ValueKey('gorsel-paket-${p.uniteId}'),
                      avatar: const Icon(Icons.inventory_2_outlined),
                      label: Text(p.ad),
                      selected: _uniteId == p.uniteId,
                      showCheckmark: false,
                      onSelected: (s) =>
                          setState(() => _uniteId = s ? p.uniteId : null),
                    ),
                ],
              ),
            ],
            const SizedBox(height: Olcu.b2),
            Wrap(
              spacing: Olcu.b1,
              runSpacing: Olcu.b1,
              children: [
                FilledButton.icon(
                  key: const ValueKey('gorsel-eslestir'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: GorselKelimeler.eslestirmeTuru(liste).isEmpty
                      ? null
                      : () => _eslestirmeBaslat(liste),
                  icon: const Icon(Icons.touch_app_outlined),
                  label: const Text('Dokun-eşleştir'),
                ),
                FilledButton.tonalIcon(
                  key: const ValueKey('gorsel-kaydir'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: GorselKelimeler.kaydirTuru(liste).isEmpty
                      ? null
                      : () => _kaydirBaslat(liste),
                  icon: const Icon(Icons.swipe),
                  label: const Text('Kaydır oyunu'),
                ),
              ],
            ),
            const SizedBox(height: Olcu.b1),
            if (liste.length < 3)
              Text(
                'Oyunlar için bu süzgeçte en az 3 kelime gerekir.',
                key: const ValueKey('gorsel-az'),
                style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
              ),
            const SizedBox(height: Olcu.b1),
            Text('${liste.length} kelime', style: yazi.bodySmall),
            for (final g in liste)
              ListTile(
                key: ValueKey('gorsel-kart-${g.dil}-${g.kelime}'),
                contentPadding: EdgeInsets.zero,
                leading: Text(
                  g.emoji,
                  style: const TextStyle(fontSize: 32),
                  semanticsLabel: g.anlam,
                ),
                title: Text(
                  g.kelime,
                  style: yazi.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                subtitle: Text(g.anlam),
                trailing: IconButton(
                  icon: const Icon(Icons.volume_up_outlined),
                  tooltip: 'Oku',
                  onPressed: () => ref
                      .read(sesProvider)
                      .oku(g.kelime, dil: dilTanimi(g.dil)?.ttsDili ?? 'en-US'),
                ),
              ),
          ],
        ),
      );
    }

    return PopScope(
      canPop: _mod == _Mod.liste,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) setState(() => _mod = _Mod.liste);
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(switch (_mod) {
            _Mod.eslestir => 'Dokun-eşleştir',
            _Mod.kaydir => 'Kaydır oyunu',
            _Mod.liste => 'Görsel kelimeler',
          }),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            tooltip: 'Geri',
            onPressed: () {
              if (_mod != _Mod.liste) {
                setState(() => _mod = _Mod.liste);
              } else {
                context.canPop() ? context.pop() : context.go('/pratik');
              }
            },
          ),
        ),
        body: SafeArea(child: SayfaGovdesi(child: govde)),
      ),
    );
  }

  Widget _eslestirmeGovdesi(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final bitti = _tur.isNotEmpty && _eslesen.length == _tur.length;
    if (bitti) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(Olcu.b3),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.emoji_events, size: 64, color: r.vurgu),
              const SizedBox(height: Olcu.b2),
              Text(
                'Hepsini eşleştirdin',
                key: const ValueKey('eslestir-bitti'),
                style: yazi.headlineSmall,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: Olcu.b1),
              Text('${_tur.length} çift, $_deneme dokunuş'),
              const SizedBox(height: Olcu.b3),
              FilledButton(
                key: const ValueKey('eslestir-yeni'),
                style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
                onPressed: () => _eslestirmeBaslat(
                  _suzulmus(
                    GorselKelimeler.havuz(
                      ref.read(sozlukProvider),
                      ref.read(alanKurslariProvider),
                    ),
                  ),
                ),
                child: const Text('Yeni tur'),
              ),
              TextButton(
                key: const ValueKey('eslestir-liste'),
                onPressed: () => setState(() => _mod = _Mod.liste),
                child: const Text('Listeye dön'),
              ),
            ],
          ),
        ),
      );
    }
    return SingleChildScrollView(
      padding: const EdgeInsets.all(Olcu.b2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Önce görsele, sonra kelimesine dokun.',
            style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          ),
          const SizedBox(height: Olcu.b1),
          if (_yanlis)
            Text(
              'Olmadı, tekrar dene.',
              key: const ValueKey('eslestir-yanlis'),
              style: yazi.bodyMedium?.copyWith(color: r.hata),
            ),
          const SizedBox(height: Olcu.b1),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  children: [
                    for (var i = 0; i < _tur.length; i++)
                      Padding(
                        padding: const EdgeInsets.only(bottom: Olcu.b1),
                        child: SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            key: ValueKey('eslestir-sol-$i'),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(48, 56),
                              backgroundColor: _eslesen.contains(i)
                                  ? r.dogru.withValues(alpha: 0.18)
                                  : (_solSecili == i
                                        ? r.ana.withValues(alpha: 0.18)
                                        : null),
                            ),
                            onPressed: _eslesen.contains(i)
                                ? null
                                : () => _solaDokun(i),
                            child: Text(
                              _tur[i].emoji,
                              style: const TextStyle(fontSize: 28),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
              const SizedBox(width: Olcu.b2),
              Expanded(
                child: Column(
                  children: [
                    for (final i in _sagSira)
                      Padding(
                        padding: const EdgeInsets.only(bottom: Olcu.b1),
                        child: SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            key: ValueKey('eslestir-sag-$i'),
                            style: OutlinedButton.styleFrom(
                              minimumSize: const Size(48, 56),
                              backgroundColor: _eslesen.contains(i)
                                  ? r.dogru.withValues(alpha: 0.18)
                                  : null,
                            ),
                            onPressed: _eslesen.contains(i)
                                ? null
                                : () => _sagaDokun(i),
                            child: Text(_tur[i].kelime),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _kaydirGovdesi(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    if (_kart >= _kartlar.length) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(Olcu.b3),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.emoji_events, size: 64, color: r.vurgu),
              const SizedBox(height: Olcu.b2),
              Text(
                '$_dogru / ${_kartlar.length} doğru',
                key: const ValueKey('kaydir-bitti'),
                style: yazi.headlineSmall,
              ),
              const SizedBox(height: Olcu.b3),
              FilledButton(
                key: const ValueKey('kaydir-yeni'),
                style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
                onPressed: () => _kaydirBaslat(
                  _suzulmus(
                    GorselKelimeler.havuz(
                      ref.read(sozlukProvider),
                      ref.read(alanKurslariProvider),
                    ),
                  ),
                ),
                child: const Text('Yeni tur'),
              ),
              TextButton(
                key: const ValueKey('kaydir-liste'),
                onPressed: () => setState(() => _mod = _Mod.liste),
                child: const Text('Listeye dön'),
              ),
            ],
          ),
        ),
      );
    }
    final k = _kartlar[_kart];
    return SingleChildScrollView(
      padding: const EdgeInsets.all(Olcu.b2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Eşleşme doğruysa sağa, yanlışsa sola kaydır.',
            style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          ),
          const SizedBox(height: Olcu.b1),
          Text(
            '${_kart + 1} / ${_kartlar.length}',
            key: const ValueKey('kaydir-sayac'),
            style: yazi.labelLarge,
          ),
          const SizedBox(height: Olcu.b1),
          Dismissible(
            key: ValueKey('kaydir-kart-$_kart'),
            direction: DismissDirection.horizontal,
            background: Container(
              color: r.dogru.withValues(alpha: 0.25),
              alignment: Alignment.centerLeft,
              padding: const EdgeInsets.only(left: Olcu.b3),
              child: const Icon(Icons.check),
            ),
            secondaryBackground: Container(
              color: r.hata.withValues(alpha: 0.25),
              alignment: Alignment.centerRight,
              padding: const EdgeInsets.only(right: Olcu.b3),
              child: const Icon(Icons.close),
            ),
            onDismissed: (yon) => _cevapla(yon == DismissDirection.startToEnd),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(Olcu.b3),
                child: Column(
                  children: [
                    Text(k.kelime.emoji, style: const TextStyle(fontSize: 72)),
                    const SizedBox(height: Olcu.b1),
                    Text(
                      k.kelime.kelime,
                      key: const ValueKey('kaydir-kelime'),
                      style: yazi.headlineSmall,
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: Olcu.b1),
                    Text(
                      '= ${k.onerilen} ?',
                      key: const ValueKey('kaydir-onerilen'),
                      style: yazi.titleLarge,
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: Olcu.b2),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  key: const ValueKey('kaydir-hayir'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: () => _cevapla(false),
                  icon: const Icon(Icons.close),
                  label: const Text('Hayır'),
                ),
              ),
              const SizedBox(width: Olcu.b2),
              Expanded(
                child: FilledButton.icon(
                  key: const ValueKey('kaydir-evet'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: () => _cevapla(true),
                  icon: const Icon(Icons.check),
                  label: const Text('Evet'),
                ),
              ),
            ],
          ),
          if (_sonGeriBildirim != null) ...[
            const SizedBox(height: Olcu.b2),
            Text(
              _sonGeriBildirim!,
              key: const ValueKey('kaydir-geri-bildirim'),
              textAlign: TextAlign.center,
              style: yazi.titleMedium,
            ),
          ],
        ],
      ),
    );
  }
}
