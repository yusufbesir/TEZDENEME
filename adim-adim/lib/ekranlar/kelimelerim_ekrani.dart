/// Kelimelerim: öğrencinin kelimelerini güç kovasına (Yeni/Zayıf/Orta/Güçlü)
/// göre listeler. Arama kutusu, kovaya göre süzme (sayılı seçim çipleri) ve
/// alfabe ya da güce göre sıralama vardır. Güç hesabı ve süzme/sıralama saf
/// işlevlerdedir ([KelimeGucu]); kelime sağlığı panosundan ve Pratik
/// merkezinden açılır. Yalnız okur; kart durumunu değiştirmez.
///
/// Sahibi Yusuf (yusufbesir). Yazan: [İP:Adım Adım Windows sürümü#cihaz]
/// Claude. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf
/// kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../motor/kelime_gucu.dart';
import '../tema/tema.dart';

class KelimelerimEkrani extends ConsumerStatefulWidget {
  const KelimelerimEkrani({super.key, this.baslangicKovasi});

  /// Açılışta seçili kova (ör. panodan 'zayif'); tanınmazsa tümü.
  final String? baslangicKovasi;

  @override
  ConsumerState<KelimelerimEkrani> createState() => _KelimelerimDurumu();
}

class _KelimelerimDurumu extends ConsumerState<KelimelerimEkrani> {
  final _arama = TextEditingController();
  late GucKovasi? _kova = _kovaCoz(widget.baslangicKovasi);
  KelimeSirasi _sira = KelimeSirasi.alfabe;

  static GucKovasi? _kovaCoz(String? ad) {
    for (final k in GucKovasi.values) {
      if (k.name == ad) return k;
    }
    return null;
  }

  @override
  void dispose() {
    _arama.dispose();
    super.dispose();
  }

  Color _renk(BuildContext context, GucKovasi k) {
    final r = context.renkler;
    return switch (k) {
      GucKovasi.yeni => r.ana,
      GucKovasi.zayif => r.hata,
      GucKovasi.orta => r.vurgu,
      GucKovasi.guclu => r.dogru,
    };
  }

  IconData _simge(GucKovasi k) => switch (k) {
    GucKovasi.yeni => Icons.fiber_new_outlined,
    GucKovasi.zayif => Icons.trending_down,
    GucKovasi.orta => Icons.trending_flat,
    GucKovasi.guclu => Icons.trending_up,
  };

  @override
  Widget build(BuildContext context) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final tum = KelimeGucu.liste(durum, ref.watch(alanKurslariProvider));
    final sayilar = KelimeGucu.sayilar(tum);
    final gosterilen = KelimeGucu.sirala(
      KelimeGucu.suz(tum, kova: _kova, arama: _arama.text),
      _sira,
    );
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Kelimelerim'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/pratik'),
        ),
      ),
      body: SafeArea(
        child: SayfaGovdesi(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  Olcu.b3,
                  Olcu.b2,
                  Olcu.b3,
                  Olcu.b1,
                ),
                child: TextField(
                  key: const ValueKey('kelime-arama'),
                  controller: _arama,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    labelText: 'Kelime ya da anlam ara',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _arama.text.isEmpty
                        ? null
                        : IconButton(
                            tooltip: 'Aramayı temizle',
                            icon: const Icon(Icons.clear),
                            onPressed: () => setState(_arama.clear),
                          ),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: Olcu.b3),
                child: Wrap(
                  spacing: Olcu.b1,
                  runSpacing: Olcu.b1,
                  children: [
                    ChoiceChip(
                      key: const ValueKey('kova-hepsi'),
                      label: Text('Hepsi ${tum.length}'),
                      selected: _kova == null,
                      onSelected: (_) => setState(() => _kova = null),
                    ),
                    for (final k in GucKovasi.values)
                      ChoiceChip(
                        key: ValueKey('kova-${k.name}'),
                        avatar: Icon(
                          _simge(k),
                          size: 18,
                          color: _renk(context, k),
                        ),
                        label: Text('${k.ad} ${sayilar[k]}'),
                        selected: _kova == k,
                        onSelected: (_) => setState(() => _kova = k),
                      ),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  Olcu.b3,
                  Olcu.b1,
                  Olcu.b3,
                  Olcu.b1,
                ),
                child: Wrap(
                  spacing: Olcu.b1,
                  runSpacing: Olcu.b1,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text('Sırala:', style: yazi.bodyMedium),
                    ChoiceChip(
                      key: const ValueKey('sira-alfabe'),
                      label: const Text('Alfabe'),
                      selected: _sira == KelimeSirasi.alfabe,
                      onSelected: (_) =>
                          setState(() => _sira = KelimeSirasi.alfabe),
                    ),
                    ChoiceChip(
                      key: const ValueKey('sira-guc'),
                      label: const Text('Güce göre'),
                      selected: _sira == KelimeSirasi.guc,
                      onSelected: (_) =>
                          setState(() => _sira = KelimeSirasi.guc),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: tum.isEmpty
                    ? _Bos(
                        metin:
                            'Önce birkaç ders çöz; kelimelerin burada '
                            'güç kovalarına ayrılır.',
                      )
                    : gosterilen.isEmpty
                    ? const _Bos(metin: 'Bu süzgece uyan kelime yok.')
                    : ListView.builder(
                        padding: const EdgeInsets.only(bottom: Olcu.b3),
                        itemCount: gosterilen.length,
                        itemBuilder: (context, i) {
                          final s = gosterilen[i];
                          final renk = _renk(context, s.kova);
                          // Renk tek başına bilgi taşımaz: simge ve kova adı
                          // da gösterilir.
                          return Semantics(
                            label:
                                '${s.metin}, ${s.anlam}. ${s.kova.ad}, '
                                'güç ${s.puan}',
                            excludeSemantics: true,
                            child: ListTile(
                              key: ValueKey('kelime-${s.kartId}-${s.metin}'),
                              isThreeLine: true,
                              leading: Icon(_simge(s.kova), color: renk),
                              title: Text(
                                s.metin,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                              subtitle: Text(
                                '${s.anlam}\nGüç ${s.puan}/100',
                                maxLines: 3,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(color: r.metinIkincil),
                              ),
                              trailing: ConstrainedBox(
                                constraints: const BoxConstraints(maxWidth: 88),
                                child: Text(
                                  s.kova.ad,
                                  style: yazi.labelLarge?.copyWith(color: renk),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Bos extends StatelessWidget {
  const _Bos({required this.metin});
  final String metin;

  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(Olcu.b3),
      child: Text(
        metin,
        style: Theme.of(context).textTheme.bodyLarge,
        textAlign: TextAlign.center,
      ),
    ),
  );
}
