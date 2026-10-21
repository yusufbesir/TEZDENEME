/// Sözlük ekranı: arama kutusu, dil filtre çipleri (Tümü / İngilizce / Kod),
/// yatay kayan ünite paket çipleri (seçilen paket listeyi süzer) ve sonuç
/// listesi (kelime kalın, anlam altta, sağda kurs kısa adı ve "Kartlara ekle"
/// düğmesi; kart eklenmişse pasif "Kartlarda" onayı). Her maddede "Not"
/// düğmesi kişisel not (mnemonik, en çok 200 karakter) yazdırır; not varsa
/// anlamın altında italik tek satır "Not: ..." görünür. İngilizce maddede
/// sıklık rozeti ("Çok sık" ≤100, "Sık" ≤300) ve kök farklıysa "kök: go"
/// bilgisi görünür. İngilizce maddelerde ses simgesi kelimeyi `Ses.oku` ile
/// okur; kod maddelerinde ses yok. Dar pencerede (480) taşmaz.
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
import '../model/durum.dart';
import '../sozluk/sozluk.dart';
import '../tema/tema.dart';

class SozlukEkrani extends ConsumerStatefulWidget {
  const SozlukEkrani({super.key});

  @override
  ConsumerState<SozlukEkrani> createState() => _SozlukDurumu();
}

class _SozlukDurumu extends ConsumerState<SozlukEkrani> {
  final _sorgu = TextEditingController();

  /// null: Tümü; 'en': İngilizce; 'ko' | 'ja' | 'zh': Korece, Japonca, Çince;
  /// 'kod': Kod.
  String? _dil;

  /// Seçili kelime paketinin ünite kimliği (null: paket süzgeci yok).
  String? _paketId;

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
      case 'korece':
        return 'Kor.$no';
      case 'japonca':
        return 'Jap.$no';
      case 'cince':
        return 'Çin.$no';
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
    final paketler = sozluk.paketler(ref.watch(kurslarProvider));
    final secili = _paketId == null
        ? null
        : paketler.where((p) => p.uniteId == _paketId).firstOrNull;
    var sonuclar = sozluk.ara(_sorgu.text, dil: _dil);
    if (secili != null) {
      final kume = Set<SozlukMaddesi>.identity()..addAll(secili.maddeler);
      sonuclar = sonuclar.where(kume.contains).toList();
    }
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
              // Dil çipleri tek satırda yatay kayar: 6 çip dar ekranda (480 px,
              // 1,5 ölçek) birkaç satıra sarılıp listeyi aşağı itiyordu.
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: Olcu.b3),
                child: Row(
                  children: [
                    cip('Tümü', null),
                    const SizedBox(width: Olcu.b1),
                    cip('İngilizce', 'en'),
                    const SizedBox(width: Olcu.b1),
                    cip('Korece', 'ko'),
                    const SizedBox(width: Olcu.b1),
                    cip('Japonca', 'ja'),
                    const SizedBox(width: Olcu.b1),
                    cip('Çince', 'zh'),
                    const SizedBox(width: Olcu.b1),
                    cip('Kod', 'kod'),
                  ],
                ),
              ),
              if (paketler.isNotEmpty)
                // Paketler: yatay kayan ünite çipleri; dar ekranda taşmaz.
                SizedBox(
                  height: Olcu.hedef,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.fromLTRB(
                      Olcu.b3,
                      Olcu.b1,
                      Olcu.b3,
                      0,
                    ),
                    itemCount: paketler.length,
                    separatorBuilder: (_, _) => const SizedBox(width: Olcu.b1),
                    itemBuilder: (context, i) {
                      final p = paketler[i];
                      return Center(
                        child: FilterChip(
                          avatar: const Icon(Icons.inventory_2_outlined),
                          label: Text(p.ad),
                          tooltip:
                              '${kursKisaAd(p.kursId)} paketi, '
                              '${p.maddeler.length} madde',
                          selected: _paketId == p.uniteId,
                          onSelected: (sec) =>
                              setState(() => _paketId = sec ? p.uniteId : null),
                        ),
                      );
                    },
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
                  secili == null
                      ? '${sonuclar.length} madde'
                      : '${sonuclar.length} madde · ${secili.ad}',
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

/// Sözlük dil kodundan TTS dili ('ko' → 'ko-KR'); bilinmeyen 'en-US'.
String _sesDili(String dil) => switch (dil) {
  'ko' => 'ko-KR',
  'ja' => 'ja-JP',
  'zh' => 'zh-CN',
  _ => 'en-US',
};

/// Okunacak metin: Korece/Japonca/Çince maddelerde sondaki "(romanizasyon)"
/// atılır; yalnız hedef yazı okunur.
String _okunacakMetin(SozlukMaddesi m) => m.dil == 'en'
    ? m.kelime
    : m.kelime.replaceAll(RegExp(r'\s*\([^)]*\)\s*$'), '').trim();

class _MaddeSatiri extends ConsumerWidget {
  const _MaddeSatiri({required this.madde});
  final SozlukMaddesi madde;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final ingilizce = madde.dil == 'en';
    final sesli = madde.dil != 'kod';
    final kartId = madde.kartKimligi;
    final kartlarda = ref.watch(
      durumProvider.select(
        (d) => d.value?.kartlar.containsKey(kartId) ?? false,
      ),
    );
    final not = ref.watch(
      durumProvider.select((d) => d.value?.kelimeNotlari[kartId]),
    );
    return ListTile(
      dense: false,
      leading: sesli
          ? IconButton(
              icon: const Icon(Icons.volume_up_outlined),
              tooltip: 'Oku',
              onPressed: () => ref
                  .read(sesProvider)
                  .oku(_okunacakMetin(madde), dil: _sesDili(madde.dil)),
            )
          : const SizedBox(width: Olcu.hedef, child: Icon(Icons.code)),
      title: Text(
        madde.kelime,
        style: yazi.titleMedium?.copyWith(fontWeight: FontWeight.bold),
      ),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(madde.anlam),
          if (ingilizce && madde.kokFarkli)
            Text(
              'kök: ${madde.kok}',
              style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
            ),
          if (not != null)
            Text(
              'Not: $not',
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: yazi.bodySmall?.copyWith(
                color: r.metinIkincil,
                fontStyle: FontStyle.italic,
              ),
            ),
        ],
      ),
      // Sağ taraf sıkı Row: kurs kısa adı + kart düğmesi. Yatay tutulur;
      // dikey Column büyük metin ölçeğinde ListTile yüksekliğini aşıyor.
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (ingilizce && siklikEtiketi(madde.siklik) != null) ...[
            SiklikRozeti(etiket: siklikEtiketi(madde.siklik)!),
            const SizedBox(width: Olcu.b1),
          ],
          Text(
            _SozlukDurumu.kursKisaAd(madde.kursId),
            style: yazi.labelMedium?.copyWith(color: r.metinIkincil),
          ),
          IconButton(
            icon: Icon(
              not == null ? Icons.sticky_note_2_outlined : Icons.sticky_note_2,
              color: not == null ? null : r.ana,
            ),
            tooltip: not == null ? 'Not' : 'Notu düzenle',
            visualDensity: VisualDensity.compact,
            onPressed: () => notDuzenle(context, ref, kartId, not),
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

/// Kişisel not penceresini açar ve sonucu yazar: null → Vazgeç (dokunma),
/// '' → Sil, metin → Kaydet (boş metinle Kaydet de notu siler).
Future<void> notDuzenle(
  BuildContext context,
  WidgetRef ref,
  String kartId,
  String? mevcut,
) async {
  final sonuc = await showDialog<String?>(
    context: context,
    builder: (_) => NotPenceresi(mevcut: mevcut),
  );
  if (sonuc == null) return;
  await ref.read(durumProvider.notifier).notYaz(kartId, sonuc);
}

/// Kişisel not penceresi: TextField (en çok 200 karakter), Vazgeç, (not
/// varsa) Sil ve Kaydet. Denetleyici pencereyle birlikte yaşar; kapanış
/// animasyonu sırasında kullanılmaya devam edebilir, bu yüzden burada tutulur.
class NotPenceresi extends StatefulWidget {
  const NotPenceresi({super.key, this.mevcut});
  final String? mevcut;

  @override
  State<NotPenceresi> createState() => _NotPenceresiDurumu();
}

class _NotPenceresiDurumu extends State<NotPenceresi> {
  late final _denetleyici = TextEditingController(text: widget.mevcut ?? '');

  @override
  void dispose() {
    _denetleyici.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Kişisel not'),
      content: TextField(
        key: const Key('not-metni'),
        controller: _denetleyici,
        autofocus: true,
        maxLength: OgrenciDurumu.notEnCokKarakter,
        maxLines: 3,
        minLines: 1,
        decoration: const InputDecoration(
          hintText: 'Hatırlatıcı, benzetme ya da örnek cümle',
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Vazgeç'),
        ),
        if (widget.mevcut != null)
          TextButton(
            onPressed: () => Navigator.pop(context, ''),
            child: const Text('Sil'),
          ),
        FilledButton(
          onPressed: () => Navigator.pop(context, _denetleyici.text),
          child: const Text('Kaydet'),
        ),
      ],
    );
  }
}

/// Sıklık sırasından rozet metni: ≤100 "Çok sık", ≤300 "Sık", yoksa null.
String? siklikEtiketi(int? siklik) {
  if (siklik == null) return null;
  if (siklik <= 100) return 'Çok sık';
  if (siklik <= 300) return 'Sık';
  return null;
}

/// Küçük sıklık etiketi (ana renkte ince çerçeve). Badge değildir.
class SiklikRozeti extends StatelessWidget {
  const SiklikRozeti({super.key, required this.etiket});
  final String etiket;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: Olcu.b1, vertical: 2),
      decoration: BoxDecoration(
        border: Border.all(color: r.ana),
        borderRadius: BorderRadius.circular(Olcu.kose),
      ),
      child: Text(
        etiket,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(color: r.ana),
      ),
    );
  }
}
