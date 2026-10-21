/// Hafıza puanı ve çok modlu çalışma (ÖZELLİK 78): `/calisma-modlari` çalışılmış
/// ünitelerin hafıza puanını (yarı ömürden, Hafiza) listeler; `/calisma-modu`
/// seçilen ünitenin aynı içeriğiyle dört mod sunar: kart (çevir), yazma,
/// eşleştirme ve test. Modlar geçici destedir: kart aralıkları (SRS), hata
/// defteri, XP ve günlük DEĞİŞMEZ. Pratik merkezinden `push` ile açılır.
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
import '../model/icerik.dart';
import '../motor/hafiza.dart';
import '../motor/pratik.dart' show KelimeCifti;
import '../tema/tema.dart';

class CalismaModlariEkrani extends ConsumerWidget {
  const CalismaModlariEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final kurslar = ref.watch(alanKurslariProvider);
    final liste = Hafiza.uniteler(durum, kurslar);
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Hafıza puanı'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/pratik'),
        ),
      ),
      body: SafeArea(
        child: SayfaGovdesi(
          child: liste.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(Olcu.b3),
                    child: Text(
                      'Henüz çalışılmış ünite yok. Bir ders bitirince ünite '
                      'burada hafıza puanıyla görünür.',
                      textAlign: TextAlign.center,
                      style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                    ),
                  ),
                )
              : ListView(
                  key: const ValueKey('hafiza-liste'),
                  padding: const EdgeInsets.all(Olcu.b2),
                  children: [
                    Text(
                      'Puan, kartlarının unutma eğrisinin yarı ömründen '
                      'hesaplanır; çalıştıkça yükselir. Modlar tekrar '
                      'takvimini değiştirmez.',
                      style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                    ),
                    const SizedBox(height: Olcu.b2),
                    for (final h in liste)
                      Card(
                        child: ListTile(
                          key: ValueKey(
                            'hafiza-unite-${h.kurs.id}-${h.uniteIndeks}',
                          ),
                          minVerticalPadding: Olcu.b1,
                          title: Text(
                            h.unite.ad,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '${h.kurs.ad} · ${h.kartSayisi} kart'
                                '${h.zayifSayisi > 0 ? ' · ${h.zayifSayisi} zayıf' : ''}',
                              ),
                              const SizedBox(height: 4),
                              LinearProgressIndicator(
                                value: h.puan / 100,
                                minHeight: 6,
                                borderRadius: BorderRadius.circular(3),
                              ),
                            ],
                          ),
                          trailing: Text(
                            '${h.puan}',
                            key: ValueKey(
                              'hafiza-puan-${h.kurs.id}-${h.uniteIndeks}',
                            ),
                            style: yazi.titleLarge?.copyWith(color: r.ana),
                          ),
                          onTap: () => context.push(
                            '/calisma-modu?kurs=${Uri.encodeComponent(h.kurs.id)}'
                            '&unite=${h.uniteIndeks}',
                          ),
                        ),
                      ),
                  ],
                ),
        ),
      ),
    );
  }
}

class CalismaModuEkrani extends ConsumerStatefulWidget {
  const CalismaModuEkrani({
    super.key,
    required this.kursId,
    required this.uniteIndeks,
  });
  final String kursId;
  final int uniteIndeks;

  @override
  ConsumerState<CalismaModuEkrani> createState() => _ModDurumu();
}

class _ModDurumu extends ConsumerState<CalismaModuEkrani> {
  CalismaModu? _mod;
  int _tohum = 1;

  @override
  Widget build(BuildContext context) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    Kurs? kurs;
    for (final k in ref.watch(kurslarProvider)) {
      if (k.id == widget.kursId) kurs = k;
    }
    final gecerli =
        kurs != null &&
        widget.uniteIndeks >= 0 &&
        widget.uniteIndeks < kurs.uniteler.length;
    void geri() => context.canPop() ? context.pop() : context.go('/pratik');
    if (!gecerli) {
      return Scaffold(
        appBar: AppBar(title: const Text('Çalışma modları')),
        body: Center(
          child: FilledButton(onPressed: geri, child: const Text('Geri dön')),
        ),
      );
    }
    final h = Hafiza.uniteHafizasi(durum, kurs, widget.uniteIndeks);
    final ciftler = Hafiza.ogeler(durum, kurs, widget.uniteIndeks);
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final mod = _mod;

    Widget govde;
    if (mod == null) {
      govde = ListView(
        padding: const EdgeInsets.all(Olcu.b2),
        children: [
          Text(
            'Hafıza puanı: ${h.puan} (${h.etiket})',
            key: const ValueKey('mod-puan'),
            style: yazi.titleMedium,
          ),
          const SizedBox(height: 4),
          Text(
            '${ciftler.length} ${kurs.alan == KursAlani.dil ? 'kelime' : 'terim'} '
            'ile çalış. Ceza yok; tekrar takvimi değişmez.',
            style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          ),
          const SizedBox(height: Olcu.b2),
          for (final m in CalismaModu.values)
            Card(
              child: ListTile(
                key: ValueKey('mod-${m.name}'),
                minVerticalPadding: Olcu.b1,
                enabled: Hafiza.modAcik(m, ciftler),
                title: Text(m.ad),
                subtitle: Text(
                  Hafiza.modAcik(m, ciftler)
                      ? m.aciklama
                      : 'Bu mod için yeterli farklı kelime yok',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: Hafiza.modAcik(m, ciftler)
                    ? () => setState(() {
                        _mod = m;
                        _tohum++;
                      })
                    : null,
              ),
            ),
        ],
      );
    } else {
      final cik = IconButton(
        key: const ValueKey('mod-kapat'),
        icon: const Icon(Icons.close),
        tooltip: 'Modlara dön',
        onPressed: () => setState(() => _mod = null),
      );
      final oturum = switch (mod) {
        CalismaModu.kart => _KartOturumu(
          key: ValueKey('kart-$_tohum'),
          ciftler: Hafiza.karistir(ciftler, tohum: _tohum),
          onYeniden: () => setState(() => _tohum++),
        ),
        CalismaModu.yazma => _YazmaOturumu(
          key: ValueKey('yazma-$_tohum'),
          ciftler: Hafiza.karistir(ciftler, tohum: _tohum),
          onYeniden: () => setState(() => _tohum++),
        ),
        CalismaModu.eslestirme => _EslestirmeOturumu(
          key: ValueKey('esles-$_tohum'),
          ciftler: Hafiza.eslestirmeCiftleri(ciftler, tohum: _tohum),
          onYeniden: () => setState(() => _tohum++),
        ),
        CalismaModu.test => _TestOturumu(
          key: ValueKey('test-$_tohum'),
          sorular: Hafiza.testSorulari(ciftler, tohum: _tohum),
          onYeniden: () => setState(() => _tohum++),
        ),
      };
      govde = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Align(alignment: Alignment.centerRight, child: cik),
          Expanded(child: oturum),
        ],
      );
    }
    return Scaffold(
      appBar: AppBar(
        title: Text(
          mod == null ? kurs.uniteler[widget.uniteIndeks].ad : mod.ad,
        ),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: geri,
        ),
      ),
      body: SafeArea(child: SayfaGovdesi(child: govde)),
    );
  }
}

/// Oturum sonu özeti: [dogru]/[toplam] ve "Yeniden" düğmesi.
class _Sonuc extends StatelessWidget {
  const _Sonuc({
    required this.dogru,
    required this.toplam,
    required this.onYeniden,
  });
  final int dogru;
  final int toplam;
  final VoidCallback onYeniden;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b3),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.check_circle, size: 56, color: context.renkler.dogru),
            const SizedBox(height: Olcu.b2),
            Text(
              '$toplam sorudan $dogru doğru',
              key: const ValueKey('oturum-sonuc'),
              style: Theme.of(context).textTheme.titleLarge,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: Olcu.b2),
            FilledButton(
              key: const ValueKey('oturum-yeniden'),
              onPressed: onYeniden,
              child: const Text('Yeniden'),
            ),
          ],
        ),
      ),
    );
  }
}

class _KartOturumu extends StatefulWidget {
  const _KartOturumu({
    super.key,
    required this.ciftler,
    required this.onYeniden,
  });
  final List<KelimeCifti> ciftler;
  final VoidCallback onYeniden;

  @override
  State<_KartOturumu> createState() => _KartDurumu();
}

class _KartDurumu extends State<_KartOturumu> {
  int _i = 0;
  bool _arka = false;
  int _bildim = 0;

  void _ileri(bool bildim) => setState(() {
    if (bildim) _bildim++;
    _i++;
    _arka = false;
  });

  @override
  Widget build(BuildContext context) {
    final c = widget.ciftler;
    if (_i >= c.length) {
      return _Sonuc(
        dogru: _bildim,
        toplam: c.length,
        onYeniden: widget.onYeniden,
      );
    }
    final yazi = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.all(Olcu.b2),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('${_i + 1} / ${c.length}', textAlign: TextAlign.center),
          const SizedBox(height: Olcu.b2),
          Expanded(
            child: Card(
              child: InkWell(
                key: const ValueKey('kart-cevir'),
                onTap: () => setState(() => _arka = !_arka),
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(Olcu.b2),
                    child: Text(
                      _arka ? c[_i].anlam : c[_i].metin,
                      key: const ValueKey('kart-yuz'),
                      textAlign: TextAlign.center,
                      style: yazi.headlineMedium,
                    ),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: Olcu.b2),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  key: const ValueKey('kart-bilmedim'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: () => _ileri(false),
                  child: const Text('Tekrar'),
                ),
              ),
              const SizedBox(width: Olcu.b2),
              Expanded(
                child: FilledButton(
                  key: const ValueKey('kart-bildim'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: () => _ileri(true),
                  child: const Text('Bildim'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _YazmaOturumu extends StatefulWidget {
  const _YazmaOturumu({
    super.key,
    required this.ciftler,
    required this.onYeniden,
  });
  final List<KelimeCifti> ciftler;
  final VoidCallback onYeniden;

  @override
  State<_YazmaOturumu> createState() => _YazmaDurumu();
}

class _YazmaDurumu extends State<_YazmaOturumu> {
  final _alan = TextEditingController();
  int _i = 0;
  int _dogru = 0;
  bool? _sonuc;

  @override
  void dispose() {
    _alan.dispose();
    super.dispose();
  }

  void _kontrol() {
    final dogru = Hafiza.yazmaDogruMu(_alan.text, widget.ciftler[_i].metin);
    setState(() {
      _sonuc = dogru;
      if (dogru) _dogru++;
    });
  }

  void _sonraki() => setState(() {
    _i++;
    _sonuc = null;
    _alan.clear();
  });

  @override
  Widget build(BuildContext context) {
    final c = widget.ciftler;
    if (_i >= c.length) {
      return _Sonuc(
        dogru: _dogru,
        toplam: c.length,
        onYeniden: widget.onYeniden,
      );
    }
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return ListView(
      padding: const EdgeInsets.all(Olcu.b2),
      children: [
        Text('${_i + 1} / ${c.length}', textAlign: TextAlign.center),
        const SizedBox(height: Olcu.b2),
        Text(
          c[_i].anlam,
          key: const ValueKey('yazma-soru'),
          textAlign: TextAlign.center,
          style: yazi.headlineSmall,
        ),
        const SizedBox(height: Olcu.b2),
        TextField(
          key: const ValueKey('yazma-alan'),
          controller: _alan,
          enabled: _sonuc == null,
          autocorrect: false,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _sonuc == null ? _kontrol() : null,
          decoration: const InputDecoration(labelText: 'Karşılığını yaz'),
        ),
        const SizedBox(height: Olcu.b2),
        if (_sonuc != null) ...[
          Text(
            _sonuc! ? 'Doğru' : 'Yanlış. Doğrusu: ${c[_i].metin}',
            key: const ValueKey('yazma-geri-bildirim'),
            style: yazi.titleMedium?.copyWith(
              color: _sonuc! ? r.dogru : r.hata,
            ),
          ),
          const SizedBox(height: Olcu.b2),
          FilledButton(
            key: const ValueKey('yazma-sonraki'),
            style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
            onPressed: _sonraki,
            child: Text(_i + 1 >= c.length ? 'Bitir' : 'Sonraki'),
          ),
        ] else
          FilledButton(
            key: const ValueKey('yazma-kontrol'),
            style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
            onPressed: _kontrol,
            child: const Text('Kontrol et'),
          ),
      ],
    );
  }
}

class _EslestirmeOturumu extends StatefulWidget {
  const _EslestirmeOturumu({
    super.key,
    required this.ciftler,
    required this.onYeniden,
  });
  final List<KelimeCifti> ciftler;
  final VoidCallback onYeniden;

  @override
  State<_EslestirmeOturumu> createState() => _EslestirmeDurumu();
}

class _EslestirmeDurumu extends State<_EslestirmeOturumu> {
  final _bulunan = <int>{};
  int? _sol;
  int _yanlis = 0;
  late final List<int> _karisikSag = () {
    // Sağ sütun kararlı ama sol sütundan farklı sırada: bir kaydırma.
    final n = widget.ciftler.length;
    return [for (var i = 0; i < n; i++) (i + n ~/ 2 + 1) % n];
  }();

  void _sec(int sol, int sag) {
    setState(() {
      if (sol == sag) {
        _bulunan.add(sol);
      } else {
        _yanlis++;
      }
      _sol = null;
    });
  }

  int? _sag;

  @override
  Widget build(BuildContext context) {
    final c = widget.ciftler;
    if (c.isEmpty) {
      return const Center(child: Text('Eşleştirme için yeterli kelime yok.'));
    }
    if (_bulunan.length == c.length) {
      return _Sonuc(
        dogru: c.length,
        toplam: c.length + _yanlis,
        onYeniden: widget.onYeniden,
      );
    }
    final r = context.renkler;
    Widget dugme(
      Key k,
      String metin,
      bool bulundu,
      bool secili,
      VoidCallback f,
    ) => Padding(
      padding: const EdgeInsets.only(bottom: Olcu.b1),
      child: OutlinedButton(
        key: k,
        style: OutlinedButton.styleFrom(
          minimumSize: const Size(48, 48),
          backgroundColor: bulundu
              ? r.dogru.withValues(alpha: 0.18)
              : (secili ? r.ana.withValues(alpha: 0.18) : null),
        ),
        onPressed: bulundu ? null : f,
        child: Text(metin, textAlign: TextAlign.center),
      ),
    );
    return ListView(
      padding: const EdgeInsets.all(Olcu.b2),
      children: [
        Text(
          'Eşleşen: ${_bulunan.length}/${c.length} · Yanlış: $_yanlis',
          key: const ValueKey('esles-durum'),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: Olcu.b2),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                children: [
                  for (var k = 0; k < c.length; k++)
                    dugme(
                      ValueKey('esles-sol-$k'),
                      c[k].metin,
                      _bulunan.contains(k),
                      _sol == k,
                      () {
                        if (_sag != null) {
                          final s = _sag!;
                          _sag = null;
                          _sec(k, s);
                        } else {
                          setState(() => _sol = k);
                        }
                      },
                    ),
                ],
              ),
            ),
            const SizedBox(width: Olcu.b1),
            Expanded(
              child: Column(
                children: [
                  for (final k in _karisikSag)
                    dugme(
                      ValueKey('esles-sag-$k'),
                      c[k].anlam,
                      _bulunan.contains(k),
                      _sag == k,
                      () {
                        if (_sol != null) {
                          _sec(_sol!, k);
                        } else {
                          setState(() => _sag = k);
                        }
                      },
                    ),
                ],
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _TestOturumu extends StatefulWidget {
  const _TestOturumu({
    super.key,
    required this.sorular,
    required this.onYeniden,
  });
  final List<HafizaTesti> sorular;
  final VoidCallback onYeniden;

  @override
  State<_TestOturumu> createState() => _TestDurumu();
}

class _TestDurumu extends State<_TestOturumu> {
  int _i = 0;
  int _dogru = 0;
  int? _secilen;

  @override
  Widget build(BuildContext context) {
    final s = widget.sorular;
    if (s.isEmpty) {
      return const Center(child: Text('Test için yeterli kelime yok.'));
    }
    if (_i >= s.length) {
      return _Sonuc(
        dogru: _dogru,
        toplam: s.length,
        onYeniden: widget.onYeniden,
      );
    }
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final q = s[_i];
    return ListView(
      padding: const EdgeInsets.all(Olcu.b2),
      children: [
        Text('${_i + 1} / ${s.length}', textAlign: TextAlign.center),
        const SizedBox(height: Olcu.b2),
        Text(
          q.metin,
          key: const ValueKey('test-soru'),
          textAlign: TextAlign.center,
          style: yazi.headlineSmall,
        ),
        const SizedBox(height: Olcu.b2),
        for (var k = 0; k < q.secenekler.length; k++)
          Padding(
            padding: const EdgeInsets.only(bottom: Olcu.b1),
            child: OutlinedButton(
              key: ValueKey('test-sec-$k'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(48, 48),
                backgroundColor: _secilen == null
                    ? null
                    : (k == q.dogru
                          ? r.dogru.withValues(alpha: 0.18)
                          : (k == _secilen
                                ? r.hata.withValues(alpha: 0.18)
                                : null)),
              ),
              onPressed: _secilen != null
                  ? null
                  : () => setState(() {
                      _secilen = k;
                      if (k == q.dogru) _dogru++;
                    }),
              child: Text(q.secenekler[k], textAlign: TextAlign.center),
            ),
          ),
        if (_secilen != null) ...[
          const SizedBox(height: Olcu.b1),
          FilledButton(
            key: const ValueKey('test-sonraki'),
            style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
            onPressed: () => setState(() {
              _i++;
              _secilen = null;
            }),
            child: Text(_i + 1 >= s.length ? 'Bitir' : 'Sonraki'),
          ),
        ],
      ],
    );
  }
}
