/// Sözlük ekranı: arama kutusu, dil filtre çipleri (Tümü / İngilizce / Kod)
/// ve sonuç listesi (kelime kalın, anlam altta, sağda kurs kısa adı ve
/// "Kartlara ekle" düğmesi; kart eklenmişse pasif "Kartlarda" onayı).
/// İngilizce maddelerde ses simgesi kelimeyi `Ses.oku` ile okur; kod
/// maddelerinde ses yok. Dar pencerede (480) taşmaz.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Kabuğun dışında, Yol sekmesindeki kitap simgesiyle `push` ile açılır.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../sozluk/sozluk.dart';
import '../tema/tema.dart';

class SozlukEkrani extends ConsumerStatefulWidget {
  const SozlukEkrani({super.key});

  @override
  ConsumerState<SozlukEkrani> createState() => _SozlukDurumu();
}

class _SozlukDurumu extends ConsumerState<SozlukEkrani> {
  final _sorgu = TextEditingController();

  /// null: Tümü; 'en': İngilizce; 'kod': Kod.
  String? _dil;

  @override
  void initState() {
    super.initState();
    _sorgu.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _sorgu.dispose();
    super.dispose();
  }

  /// Kurs kimliğinden kısa ad: 'ingilizce-1' → 'İng. 1', 'html-1' → 'HTML 1'.
  static String kursKisaAd(String kursId) {
    final parca = kursId.split('-');
    final ad = parca.first;
    final no = parca.length > 1 ? ' ${parca.last}' : '';
    switch (ad) {
      case 'ingilizce':
        return 'İng.$no';
      case 'html':
        return 'HTML$no';
      case 'css':
        return 'CSS$no';
      case 'js':
        return 'JS$no';
      default:
        return kursId;
    }
  }

  @override
  Widget build(BuildContext context) {
    final sozluk = ref.watch(sozlukProvider);
    final sonuclar = sozluk.ara(_sorgu.text, dil: _dil);
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;

    Widget cip(String etiket, String? deger) => FilterChip(
      label: Text(etiket),
      selected: _dil == deger,
      showCheckmark: false,
      onSelected: (_) => setState(() => _dil = deger),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Sözlük'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/yol'),
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
                  controller: _sorgu,
                  textInputAction: TextInputAction.search,
                  decoration: InputDecoration(
                    labelText: 'Kelime ya da anlam ara',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _sorgu.text.isEmpty
                        ? null
                        : IconButton(
                            icon: const Icon(Icons.clear),
                            tooltip: 'Temizle',
                            onPressed: _sorgu.clear,
                          ),
                  ),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: Olcu.b3),
                child: Wrap(
                  spacing: Olcu.b1,
                  runSpacing: Olcu.b1,
                  children: [
                    cip('Tümü', null),
                    cip('İngilizce', 'en'),
                    cip('Kod', 'kod'),
                  ],
                ),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  Olcu.b3,
                  Olcu.b1,
                  Olcu.b3,
                  0,
                ),
                child: Text(
                  '${sonuclar.length} madde',
                  style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
                ),
              ),
              Expanded(
                child: sonuclar.isEmpty
                    ? Center(child: Text('Sonuç yok', style: yazi.titleMedium))
                    : ListView.separated(
                        padding: const EdgeInsets.symmetric(
                          horizontal: Olcu.b2,
                          vertical: Olcu.b1,
                        ),
                        itemCount: sonuclar.length,
                        separatorBuilder: (_, _) => const Divider(height: 1),
                        itemBuilder: (context, i) =>
                            _MaddeSatiri(madde: sonuclar[i]),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MaddeSatiri extends ConsumerWidget {
  const _MaddeSatiri({required this.madde});
  final SozlukMaddesi madde;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final ingilizce = madde.dil == 'en';
    final kartId = madde.kartKimligi;
    final kartlarda = ref.watch(
      durumProvider.select(
        (d) => d.value?.kartlar.containsKey(kartId) ?? false,
      ),
    );
    return ListTile(
      dense: false,
      leading: ingilizce
          ? IconButton(
              icon: const Icon(Icons.volume_up_outlined),
              tooltip: 'Oku',
              onPressed: () => ref.read(sesProvider).oku(madde.kelime),
            )
          : const SizedBox(width: Olcu.hedef, child: Icon(Icons.code)),
      title: Text(
        madde.kelime,
        style: yazi.titleMedium?.copyWith(fontWeight: FontWeight.bold),
      ),
      subtitle: Text(madde.anlam),
      // Sağ taraf sıkı Row: kurs kısa adı + kart düğmesi. Yatay tutulur;
      // dikey Column büyük metin ölçeğinde ListTile yüksekliğini aşıyor.
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            _SozlukDurumu.kursKisaAd(madde.kursId),
            style: yazi.labelMedium?.copyWith(color: r.metinIkincil),
          ),
          kartlarda
              ? IconButton(
                  icon: Icon(Icons.check_circle, color: r.dogru),
                  tooltip: 'Kartlarda',
                  onPressed: null,
                  visualDensity: VisualDensity.compact,
                )
              : IconButton(
                  icon: const Icon(Icons.add_card),
                  tooltip: 'Kartlara ekle',
                  visualDensity: VisualDensity.compact,
                  onPressed: () async {
                    final mesajci = ScaffoldMessenger.of(context);
                    await ref.read(durumProvider.notifier).kartEkle(kartId);
                    mesajci
                      ..hideCurrentSnackBar()
                      ..showSnackBar(
                        const SnackBar(
                          content: Text('Tekrar kartı eklendi'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                  },
                ),
        ],
      ),
    );
  }
}
