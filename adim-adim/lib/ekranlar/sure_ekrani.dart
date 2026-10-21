/// Süre takibi (ÖZELLİK 80) ve süreli kısa kelime oturumu (ÖZELLİK 59).
///
/// Süre takibi ekranı: "Bugün X dk" ve günlük dakika hedefi (ilerleme çubuğu,
/// hedef seçimi; hedef yoksa çalışma planındaki dakika), son 7 günün süresi,
/// 5/10/15 dk'lık kelime oturumu düğmeleri ve bölüm (ünite > ders) bazında
/// harcanan süre. Süre ders, mikro ders ve süreli oturumda kaydedilir.
///
/// Süreli oturum: seçilen dakika için geri sayım; öğrenilen kelimelerden
/// çoktan seçmeli sorular. Süre bitince ya da "Bitir"e basılınca oturum
/// özeti çıkar. Oturum kart aralıklarını (SRS), hata defterini, XP'yi ve
/// seriyi değiştirmez; ceza yoktur. Yalnız harcanan süre günlük süreye eklenir.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../motor/ders_meta.dart';
import '../motor/pratik.dart';
import '../motor/sure.dart';
import '../tema/tema.dart';

// ---------------------------------------------------------------------------
// Süre takibi
// ---------------------------------------------------------------------------

class SureEkrani extends ConsumerWidget {
  const SureEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final bugun = ref.watch(bugunProvider);
    final kurslar = ref.watch(alanKurslariProvider);
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;

    final hedef = Sure.hedefDk(durum);
    final bugunSn = Sure.bugunSn(durum, bugun);
    final gunler = Sure.sonGunler(durum, bugun);
    final uniteler = Sure.uniteSureleri(durum, kurslar);
    final plandan = durum.gunlukDakikaHedefi == 0 && hedef > 0;

    Widget baslik(String t) => Padding(
      padding: const EdgeInsets.only(top: Olcu.b3, bottom: Olcu.b1),
      child: Semantics(header: true, child: Text(t, style: yazi.titleMedium)),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Süre takibi'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/profil'),
        ),
      ),
      body: SafeArea(
        child: SayfaGovdesi(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(Olcu.b3),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(Olcu.b2),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          Sure.bugunMetni(durum, bugun),
                          key: const ValueKey('sure-bugun'),
                          style: yazi.headlineSmall,
                        ),
                        const SizedBox(height: Olcu.b1),
                        if (hedef > 0) ...[
                          Semantics(
                            label: 'Günlük dakika hedefi ilerlemesi',
                            value: '${(bugunSn / 60).floor()} / $hedef dk',
                            child: LinearProgressIndicator(
                              value: Sure.oran(durum, bugun),
                              minHeight: 10,
                              borderRadius: BorderRadius.circular(5),
                            ),
                          ),
                          const SizedBox(height: Olcu.b1),
                          Text(
                            Sure.hedefTamam(durum, bugun)
                                ? 'Günlük hedef tamam ($hedef dk).'
                                : 'Günlük hedef: $hedef dk'
                                      '${plandan ? ' (çalışma planından)' : ''}',
                            key: const ValueKey('sure-hedef-metni'),
                            style: yazi.bodyMedium?.copyWith(
                              color: r.metinIkincil,
                            ),
                          ),
                        ] else
                          Text(
                            'Günlük dakika hedefi yok. Aşağıdan seçebilirsin.',
                            key: const ValueKey('sure-hedef-metni'),
                            style: yazi.bodyMedium?.copyWith(
                              color: r.metinIkincil,
                            ),
                          ),
                        const SizedBox(height: Olcu.b2),
                        Text('Günlük dakika hedefi', style: yazi.labelLarge),
                        const SizedBox(height: Olcu.b1),
                        Wrap(
                          spacing: Olcu.b1,
                          runSpacing: Olcu.b1,
                          children: [
                            ChoiceChip(
                              key: const ValueKey('sure-hedef-0'),
                              label: const Text('Yok'),
                              selected: durum.gunlukDakikaHedefi == 0,
                              onSelected: (_) => ref
                                  .read(durumProvider.notifier)
                                  .dakikaHedefiAyarla(0),
                            ),
                            for (final h in Sure.hedefSecenekleri)
                              ChoiceChip(
                                key: ValueKey('sure-hedef-$h'),
                                label: Text('$h dk'),
                                selected: durum.gunlukDakikaHedefi == h,
                                onSelected: (_) => ref
                                    .read(durumProvider.notifier)
                                    .dakikaHedefiAyarla(h),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                baslik('Süreli kelime oturumu'),
                Text(
                  'Süre dolana kadar öğrendiğin kelimelerden sorular gelir. '
                  'Ceza yok; kart takvimi değişmez.',
                  style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                ),
                const SizedBox(height: Olcu.b1),
                Wrap(
                  spacing: Olcu.b1,
                  runSpacing: Olcu.b1,
                  children: [
                    for (final dk in Sure.oturumSecenekleri)
                      FilledButton.tonalIcon(
                        key: ValueKey('sure-oturum-$dk'),
                        style: FilledButton.styleFrom(
                          minimumSize: const Size(48, 48),
                        ),
                        onPressed: () => context.push('/sure/oturum?dk=$dk'),
                        icon: const Icon(Icons.hourglass_bottom),
                        label: Text('$dk dk'),
                      ),
                  ],
                ),
                baslik('Son 7 gün'),
                Card(
                  child: Column(
                    children: [
                      for (final g in gunler)
                        ListTile(
                          key: ValueKey('sure-gun-${g.gun}'),
                          dense: true,
                          title: Text(
                            g.gun == bugun ? 'Bugün' : _gunEtiketi(g.gun),
                          ),
                          trailing: Text(DersMeta.sureMetni(g.sn)),
                        ),
                    ],
                  ),
                ),
                baslik('Bölüm bazında süre'),
                if (uniteler.isEmpty)
                  Text(
                    'Henüz bölüm süresi yok. Ders bitirdikçe burada görünür.',
                    key: const ValueKey('sure-bolum-yok'),
                    style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                  )
                else
                  Card(
                    child: Column(
                      children: [
                        for (final u in uniteler)
                          ExpansionTile(
                            key: ValueKey('sure-unite-${u.unite.id}'),
                            title: Text(u.unite.ad),
                            subtitle: Text(
                              '${u.kursAd} · ${DersMeta.sureMetni(u.saniye)}',
                            ),
                            children: [
                              for (final x in u.dersler)
                                ListTile(
                                  dense: true,
                                  title: Text(x.ders.ad),
                                  trailing: Text(DersMeta.sureMetni(x.saniye)),
                                ),
                            ],
                          ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// 'YYYY-MM-DD' -> 'DD.MM'.
String _gunEtiketi(String g) =>
    g.length == 10 ? '${g.substring(8, 10)}.${g.substring(5, 7)}' : g;

// ---------------------------------------------------------------------------
// Süreli oturum
// ---------------------------------------------------------------------------

class SureliOturumEkrani extends ConsumerStatefulWidget {
  const SureliOturumEkrani({super.key, required this.dakika});

  /// Oturum uzunluğu (dakika); [Sure.oturumSecenekleri] dışındaysa 5.
  final int dakika;

  @override
  ConsumerState<SureliOturumEkrani> createState() => _OturumDurumu();
}

class _OturumDurumu extends ConsumerState<SureliOturumEkrani> {
  late final int _toplamSn;
  late final int _tohum;
  List<KelimeCifti> _deste = const [];
  late int _kalan;
  Timer? _sayac;
  int _sira = 0;
  int _dogru = 0;
  int _cevap = 0;
  int? _secilen;
  bool _bitti = false;
  bool _kaydedildi = false;

  bool get _calisiyor => !_bitti && _deste.isNotEmpty;

  @override
  void initState() {
    super.initState();
    final dk = Sure.oturumSecenekleri.contains(widget.dakika)
        ? widget.dakika
        : Sure.oturumSecenekleri.first;
    _toplamSn = dk * 60;
    _kalan = _toplamSn;
    _tohum = DateTime.now().microsecondsSinceEpoch;
    final durum = ref.read(durumProvider).value ?? const OgrenciDurumu();
    _deste = Sure.oturumDestesi(
      durum,
      ref.read(alanKurslariProvider),
      tohum: _tohum,
    );
    if (_deste.isNotEmpty) {
      _sayac = Timer.periodic(const Duration(seconds: 1), (_) {
        if (_kalan <= 1) {
          setState(() => _kalan = 0);
          _bitir();
        } else {
          setState(() => _kalan--);
        }
      });
    }
  }

  @override
  void dispose() {
    _sayac?.cancel();
    super.dispose();
  }

  /// Harcanan süreyi (sayaçtan) bir kez günlük süreye yazar.
  Future<void> _kaydet() async {
    if (_kaydedildi) return;
    _kaydedildi = true;
    await ref.read(durumProvider.notifier).sureEkle(_toplamSn - _kalan);
  }

  Future<void> _bitir() async {
    if (_bitti) return;
    _sayac?.cancel();
    _sayac = null;
    setState(() => _bitti = true);
    await _kaydet();
    if (mounted) setState(() {});
  }

  Future<void> _cik() async {
    if (_calisiyor) {
      _sayac?.cancel();
      _bitti = true;
      await _kaydet();
    }
    if (!mounted) return;
    context.canPop() ? context.pop() : context.go('/profil');
  }

  void _sec(SureSorusu soru, int i) {
    if (_secilen != null || _bitti) return;
    setState(() {
      _secilen = i;
      _cevap++;
      if (i == soru.dogru) _dogru++;
    });
  }

  void _sonraki() => setState(() {
    _secilen = null;
    _sira++;
  });

  String _sayac2(int sn) =>
      '${(sn ~/ 60).toString().padLeft(2, '0')}:'
      '${(sn % 60).toString().padLeft(2, '0')}';

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final bugun = ref.watch(bugunProvider);

    Widget govde;
    if (_deste.isEmpty) {
      govde = Center(
        child: Padding(
          padding: const EdgeInsets.all(Olcu.b3),
          child: Text(
            'Önce birkaç ders çöz; oturum için en az '
            '${Sure.enAzKelime} farklı kelime gerekir.',
            key: const ValueKey('oturum-bos'),
            style: yazi.bodyLarge,
            textAlign: TextAlign.center,
          ),
        ),
      );
    } else if (_bitti) {
      final hedef = Sure.hedefDk(durum);
      final yuzde = _cevap == 0 ? 0 : _dogru * 100 ~/ _cevap;
      govde = ListView(
        padding: const EdgeInsets.all(Olcu.b3),
        children: [
          Icon(Icons.check_circle, size: 64, color: r.dogru),
          const SizedBox(height: Olcu.b2),
          Text(
            'Oturum özeti',
            textAlign: TextAlign.center,
            style: yazi.headlineMedium,
          ),
          const SizedBox(height: Olcu.b2),
          Card(
            child: Column(
              children: [
                ListTile(
                  title: const Text('Süre'),
                  trailing: Text(
                    DersMeta.sureMetni(_toplamSn - _kalan),
                    key: const ValueKey('oturum-ozet-sure'),
                  ),
                ),
                ListTile(
                  title: const Text('Cevaplanan soru'),
                  trailing: Text(
                    '$_cevap',
                    key: const ValueKey('oturum-ozet-cevap'),
                  ),
                ),
                ListTile(
                  title: const Text('Doğru'),
                  trailing: Text(
                    '$_dogru (%$yuzde)',
                    key: const ValueKey('oturum-ozet-dogru'),
                  ),
                ),
                ListTile(
                  title: Text(Sure.bugunMetni(durum, bugun)),
                  subtitle: hedef > 0 ? Text('Günlük hedef: $hedef dk') : null,
                  key: const ValueKey('oturum-ozet-bugun'),
                ),
              ],
            ),
          ),
          const SizedBox(height: Olcu.b2),
          Text(
            'Kart takvimi, hata defteri ve XP değişmedi.',
            textAlign: TextAlign.center,
            style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
          ),
          const SizedBox(height: Olcu.b3),
          FilledButton(
            key: const ValueKey('oturum-kapat'),
            style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
            onPressed: _cik,
            child: const Text('Tamam'),
          ),
        ],
      );
    } else {
      final soru = Sure.soru(_deste, _sira, tohum: _tohum);
      final cevaplandi = _secilen != null;
      govde = ListView(
        padding: const EdgeInsets.all(Olcu.b3),
        children: [
          Semantics(
            label: 'Kalan süre',
            value: _sayac2(_kalan),
            child: Text(
              _sayac2(_kalan),
              key: const ValueKey('oturum-geri-sayim'),
              textAlign: TextAlign.center,
              style: yazi.displaySmall,
            ),
          ),
          const SizedBox(height: Olcu.b1),
          LinearProgressIndicator(
            value: 1 - _kalan / _toplamSn,
            minHeight: 6,
            borderRadius: BorderRadius.circular(3),
          ),
          const SizedBox(height: Olcu.b3),
          Text(
            'Bu kelimenin anlamı ne?',
            textAlign: TextAlign.center,
            style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          ),
          const SizedBox(height: Olcu.b1),
          Text(
            soru.metin,
            key: const ValueKey('oturum-kelime'),
            textAlign: TextAlign.center,
            style: yazi.headlineMedium,
          ),
          const SizedBox(height: Olcu.b2),
          for (var i = 0; i < soru.secenekler.length; i++)
            Padding(
              padding: const EdgeInsets.only(bottom: Olcu.b1),
              child: OutlinedButton(
                key: ValueKey('oturum-secenek-$i'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(48, 48),
                  backgroundColor: !cevaplandi
                      ? null
                      : (i == soru.dogru
                            ? r.dogru.withValues(alpha: 0.18)
                            : (i == _secilen
                                  ? r.hata.withValues(alpha: 0.18)
                                  : null)),
                ),
                onPressed: cevaplandi ? null : () => _sec(soru, i),
                child: Text(soru.secenekler[i]),
              ),
            ),
          if (cevaplandi) ...[
            const SizedBox(height: Olcu.b1),
            Text(
              _secilen == soru.dogru
                  ? 'Doğru'
                  : 'Doğrusu: ${soru.secenekler[soru.dogru]}',
              key: const ValueKey('oturum-geri-bildirim'),
              textAlign: TextAlign.center,
              style: yazi.titleMedium,
            ),
            const SizedBox(height: Olcu.b1),
            FilledButton(
              key: const ValueKey('oturum-sonraki'),
              style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: _sonraki,
              child: const Text('Sonraki'),
            ),
          ],
        ],
      );
    }

    return PopScope(
      canPop: !_calisiyor,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _cik();
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text('${_toplamSn ~/ 60} dk kelime oturumu'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            tooltip: 'Geri',
            onPressed: _cik,
          ),
          actions: [
            if (_calisiyor)
              TextButton(
                key: const ValueKey('oturum-bitir'),
                onPressed: _bitir,
                child: const Text('Bitir'),
              ),
          ],
        ),
        body: SafeArea(child: SayfaGovdesi(child: govde)),
      ),
    );
  }
}
