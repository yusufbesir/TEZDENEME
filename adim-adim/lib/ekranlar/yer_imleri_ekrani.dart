/// Yer imleri (ÖZELLİK 72, `/yer-imleri`): ders adımları ve sözlük maddeleri
/// koleksiyonlarda; her yer iminde not, taşı ve kaldır. İkinci sekme "Geçmiş":
/// en son açılan yer imleri. Yer imine dokunmak ilgili ders ya da sözlüğü açar.
/// Kart aralıklarına, hata defterine ve XP'ye dokunmaz. Profil'den `push` ile
/// açılır.
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
import '../motor/yer_imi.dart';
import '../tema/tema.dart';
import 'sozluk_ekrani.dart' show NotPenceresi;

class YerImleriEkrani extends ConsumerStatefulWidget {
  const YerImleriEkrani({super.key});

  @override
  ConsumerState<YerImleriEkrani> createState() => _YerImleriDurumu();
}

class _YerImleriDurumu extends ConsumerState<YerImleriEkrani> {
  String _koleksiyon = YerImi.varsayilanKoleksiyon;

  Future<String?> _adSor(String baslik, {String? ilk}) => showDialog<String>(
    context: context,
    builder: (_) => _AdPenceresi(baslik: baslik, ilk: ilk),
  );

  Future<void> _yeniKoleksiyon() async {
    final ad = await _adSor('Yeni koleksiyon');
    final temiz = ad == null ? null : YerImleri.adTemizle(ad);
    if (temiz == null) return;
    await ref.read(durumProvider.notifier).koleksiyonEkle(temiz);
    if (mounted) setState(() => _koleksiyon = temiz);
  }

  Future<void> _tasi(YerImi y) async {
    final durum = ref.read(durumProvider).value ?? const OgrenciDurumu();
    final secim = await showDialog<String>(
      context: context,
      builder: (ctx) => SimpleDialog(
        title: const Text('Koleksiyona taşı'),
        children: [
          for (final k in YerImleri.koleksiyonAdlari(durum))
            SimpleDialogOption(
              onPressed: () => Navigator.pop(ctx, k),
              child: Text(k),
            ),
          SimpleDialogOption(
            onPressed: () => Navigator.pop(ctx, ''),
            child: const Text('Yeni koleksiyon...'),
          ),
        ],
      ),
    );
    if (secim == null || !mounted) return;
    var hedef = secim;
    if (secim.isEmpty) {
      final ad = await _adSor('Yeni koleksiyon');
      if (ad == null) return;
      hedef = ad;
    }
    final temiz = YerImleri.adTemizle(hedef);
    if (temiz == null) return;
    await ref.read(durumProvider.notifier).yerImiTasi(y.anahtar, temiz);
    if (mounted) setState(() => _koleksiyon = temiz);
  }

  Future<void> _not(YerImi y) async {
    final sonuc = await showDialog<String?>(
      context: context,
      builder: (_) => NotPenceresi(mevcut: y.not.isEmpty ? null : y.not),
    );
    if (sonuc == null) return;
    await ref.read(durumProvider.notifier).yerImiNotYaz(y.anahtar, sonuc);
  }

  void _ac(YerImi y, YerImiGorunumu g) {
    if (g.rota == null) return;
    ref.read(durumProvider.notifier).yerImiAcildi(y.anahtar);
    context.push(g.rota!);
  }

  @override
  Widget build(BuildContext context) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final kurslar = ref.watch(kurslarProvider);
    final sozluk = ref.watch(sozlukProvider);
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final adlar = YerImleri.koleksiyonAdlari(durum);
    final secili = adlar.contains(_koleksiyon)
        ? _koleksiyon
        : YerImi.varsayilanKoleksiyon;
    final liste = YerImleri.koleksiyonYerImleri(durum, secili);

    Widget satir(YerImi y, {required bool menu}) {
      final g = YerImleri.coz(y.anahtar, kurslar, sozluk);
      return Card(
        child: ListTile(
          key: ValueKey('yer-imi-satir-${y.anahtar}'),
          minVerticalPadding: Olcu.b1,
          leading: Icon(
            y.tur == YerImi.turSozluk ? Icons.menu_book_outlined : Icons.route,
            color: r.ana,
          ),
          title: Text(g.baslik, maxLines: 2, overflow: TextOverflow.ellipsis),
          subtitle: Text(
            [
              g.altBaslik,
              if (y.not.isNotEmpty) 'Not: ${y.not}',
              if (!menu) y.koleksiyon,
            ].join('\n'),
            maxLines: 4,
            overflow: TextOverflow.ellipsis,
          ),
          isThreeLine: y.not.isNotEmpty,
          onTap: g.rota == null ? null : () => _ac(y, g),
          trailing: !menu
              ? null
              : PopupMenuButton<String>(
                  key: ValueKey('yer-imi-menu-${y.anahtar}'),
                  tooltip: 'Yer imi işlemleri',
                  onSelected: (s) async {
                    switch (s) {
                      case 'not':
                        await _not(y);
                      case 'tasi':
                        await _tasi(y);
                      case 'kaldir':
                        await ref
                            .read(durumProvider.notifier)
                            .yerImiDegistir(y.anahtar);
                    }
                  },
                  itemBuilder: (_) => const [
                    PopupMenuItem(
                      value: 'not',
                      child: Text('Not ekle/düzenle'),
                    ),
                    PopupMenuItem(
                      value: 'tasi',
                      child: Text('Koleksiyona taşı'),
                    ),
                    PopupMenuItem(
                      value: 'kaldir',
                      child: Text('Yer imini kaldır'),
                    ),
                  ],
                ),
        ),
      );
    }

    final gecmis = [
      for (final a in durum.yerImiGecmisi)
        if (YerImleri.bul(durum, a) case final y?) y,
    ];

    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Yer imleri'),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            tooltip: 'Geri',
            onPressed: () =>
                context.canPop() ? context.pop() : context.go('/profil'),
          ),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Koleksiyonlar'),
              Tab(text: 'Geçmiş'),
            ],
          ),
        ),
        body: SafeArea(
          child: SayfaGovdesi(
            child: TabBarView(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      padding: const EdgeInsets.fromLTRB(
                        Olcu.b2,
                        Olcu.b2,
                        Olcu.b2,
                        Olcu.b1,
                      ),
                      child: Row(
                        children: [
                          for (final k in adlar) ...[
                            ChoiceChip(
                              key: ValueKey('koleksiyon-cip-$k'),
                              label: Text(
                                '$k (${YerImleri.koleksiyonYerImleri(durum, k).length})',
                              ),
                              selected: k == secili,
                              showCheckmark: false,
                              onSelected: (_) =>
                                  setState(() => _koleksiyon = k),
                            ),
                            const SizedBox(width: Olcu.b1),
                          ],
                          ActionChip(
                            key: const ValueKey('koleksiyon-yeni'),
                            avatar: const Icon(Icons.add),
                            label: const Text('Yeni'),
                            onPressed: _yeniKoleksiyon,
                          ),
                        ],
                      ),
                    ),
                    if (secili != YerImi.varsayilanKoleksiyon)
                      Align(
                        alignment: Alignment.centerRight,
                        child: TextButton.icon(
                          key: const ValueKey('koleksiyon-sil'),
                          icon: const Icon(Icons.delete_outline),
                          label: const Text('Koleksiyonu sil'),
                          onPressed: () async {
                            await ref
                                .read(durumProvider.notifier)
                                .koleksiyonSil(secili);
                            if (mounted) {
                              setState(
                                () => _koleksiyon = YerImi.varsayilanKoleksiyon,
                              );
                            }
                          },
                        ),
                      ),
                    Expanded(
                      child: liste.isEmpty
                          ? Center(
                              child: Padding(
                                padding: const EdgeInsets.all(Olcu.b3),
                                child: Text(
                                  'Bu koleksiyonda yer imi yok. Sözlükte ya da '
                                  '"Bu dersin öğeleri" ekranında yer imi '
                                  'simgesine dokun.',
                                  textAlign: TextAlign.center,
                                  style: yazi.bodyMedium?.copyWith(
                                    color: r.metinIkincil,
                                  ),
                                ),
                              ),
                            )
                          : ListView(
                              key: const ValueKey('yer-imi-liste'),
                              padding: const EdgeInsets.all(Olcu.b1),
                              children: [
                                for (final y in liste) satir(y, menu: true),
                              ],
                            ),
                    ),
                  ],
                ),
                gecmis.isEmpty
                    ? Center(
                        child: Text(
                          'Henüz açtığın yer imi yok.',
                          style: yazi.bodyMedium?.copyWith(
                            color: r.metinIkincil,
                          ),
                        ),
                      )
                    : Column(
                        children: [
                          Align(
                            alignment: Alignment.centerRight,
                            child: TextButton(
                              key: const ValueKey('yer-imi-gecmis-temizle'),
                              onPressed: () => ref
                                  .read(durumProvider.notifier)
                                  .yerImiGecmisiniTemizle(),
                              child: const Text('Geçmişi temizle'),
                            ),
                          ),
                          Expanded(
                            child: ListView(
                              key: const ValueKey('yer-imi-gecmis-liste'),
                              padding: const EdgeInsets.all(Olcu.b1),
                              children: [
                                for (final y in gecmis) satir(y, menu: false),
                              ],
                            ),
                          ),
                        ],
                      ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Koleksiyon adı penceresi: TextField (en çok 30 karakter), Vazgeç, Tamam.
class _AdPenceresi extends StatefulWidget {
  const _AdPenceresi({required this.baslik, this.ilk});
  final String baslik;
  final String? ilk;

  @override
  State<_AdPenceresi> createState() => _AdPenceresiDurumu();
}

class _AdPenceresiDurumu extends State<_AdPenceresi> {
  late final _denetleyici = TextEditingController(text: widget.ilk ?? '');

  @override
  void dispose() {
    _denetleyici.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.baslik),
      content: TextField(
        key: const Key('koleksiyon-adi'),
        controller: _denetleyici,
        autofocus: true,
        maxLength: YerImi.koleksiyonAdEnCok,
        decoration: const InputDecoration(hintText: 'Koleksiyon adı'),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Vazgeç'),
        ),
        FilledButton(
          onPressed: () => Navigator.pop(context, _denetleyici.text),
          child: const Text('Tamam'),
        ),
      ],
    );
  }
}
