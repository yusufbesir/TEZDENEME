/// Yarışma sekmesi (lobi): seviye seçici, 6 kategori kartı, istatistik ve "Oyna".
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Tek birincil eylem "Oyna"dır. Oyun tam ekran sayfa olarak kök Navigator'a
/// itilir (rota kaydı sonra uygulama.dart'a eklenecek).
/// docs/SADE-ARAYUZ-VE-YARISMA.md bölüm 5 ve 7.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/icerik.dart';
import '../tema/kategori_renkleri.dart';
import '../tema/tema.dart';
import '../yarisma/depo.dart';
import '../yarisma/ekranlar/bilesenler/tac.dart';
import '../yarisma/ekranlar/oyun_ekrani.dart';
import '../yarisma/model.dart';
import '../yarisma/saglayicilar.dart';
import '../yarisma/soru_bankasi.dart';

/// app yönlendiricisinin kullandığı eski ad ile uyum.
typedef YarismaYerTutucu = YarismaEkrani;

/// Varsayılan seviye: alan kurslarında tamamlanan dersi olan SON seviye;
/// yoksa ilk seviye. Seviye yoksa null.
String? varsayilanSeviye(
  List<YarismaSeviye> seviyeler,
  List<Kurs> alanKurslari,
  Map<String, int> tamamlanan,
) {
  if (seviyeler.isEmpty) return null;
  String? son;
  for (final s in seviyeler) {
    for (final k in alanKurslari) {
      if (k.id != s.kursId) continue;
      if (k.tumDersler.any((d) => (tamamlanan[d.id] ?? 0) > 0)) son = s.kursId;
    }
  }
  return son ?? seviyeler.first.kursId;
}

class YarismaEkrani extends ConsumerStatefulWidget {
  const YarismaEkrani({super.key});

  @override
  ConsumerState<YarismaEkrani> createState() => _YarismaEkraniDurumu();
}

class _YarismaEkraniDurumu extends ConsumerState<YarismaEkrani> {
  String? _secilen;

  void _oyna(String alan, String kursId) {
    Navigator.of(context, rootNavigator: true).push(
      MaterialPageRoute<void>(
        fullscreenDialog: true,
        builder: (_) => YarismaOyunEkrani(alan: alan, kursId: kursId),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final durum = ref.watch(durumProvider).value;
    final alan = durum?.alan ?? '';
    final liste = seviyeler(alan);
    final varsayilan = varsayilanSeviye(
      liste,
      ref.watch(alanKurslariProvider),
      durum?.tamamlanan ?? const {},
    );
    final secili = liste.any((s) => s.kursId == _secilen)
        ? _secilen
        : varsayilan;
    final kayit = ref.watch(yarismaKayitProvider).value ?? const YarismaKayit();
    final ist = secili == null
        ? const YarismaIstatistik()
        : kayit.istatistik(alan, secili);
    final parlaklik = Theme.of(context).brightness;

    return SafeArea(
      child: SayfaGovdesi(
        child: Column(
          children: [
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(Olcu.b3),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Semantics(
                      header: true,
                      child: Text(
                        'Bilgi Yarışması',
                        style: yazi.headlineMedium,
                      ),
                    ),
                    const SizedBox(height: Olcu.b2),
                    if (liste.isEmpty)
                      Text('Önce bir alan seç.', style: yazi.bodyLarge)
                    else ...[
                      SegmentedButton<String>(
                        showSelectedIcon: false,
                        style: SegmentedButton.styleFrom(
                          minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                        ),
                        segments: [
                          for (final s in liste)
                            ButtonSegment(
                              value: s.kursId,
                              label: Text(s.etiket),
                            ),
                        ],
                        selected: {?secili},
                        onSelectionChanged: (v) =>
                            setState(() => _secilen = v.first),
                      ),
                      const SizedBox(height: Olcu.b3),
                      GridView.count(
                        crossAxisCount: 2,
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        mainAxisSpacing: Olcu.b2,
                        crossAxisSpacing: Olcu.b2,
                        childAspectRatio: 1.45,
                        children: [
                          for (final k in YarismaKategori.values)
                            _KategoriKarti(
                              kategori: k,
                              dogru: ist.kategoriDogru[k.kimlik] ?? 0,
                              yanlis: ist.kategoriYanlis[k.kimlik] ?? 0,
                              renk: KategoriRenkleri.renk(k, parlaklik),
                            ),
                        ],
                      ),
                      const SizedBox(height: Olcu.b3),
                      Row(
                        children: [
                          _Istatistik(baslik: 'Oynanan', deger: ist.oynanan),
                          _Istatistik(
                            baslik: 'Kazanılan',
                            deger: ist.kazanilan,
                          ),
                          _Istatistik(
                            baslik: 'En iyi puan',
                            deger: ist.enIyiPuan,
                          ),
                          _Istatistik(
                            baslik: 'Taç',
                            deger: ist.toplamTac,
                            simge: tacSimgesi,
                            simgeRengi: r.vurgu,
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(
                Olcu.b3,
                Olcu.b1,
                Olcu.b3,
                Olcu.b3,
              ),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: secili == null ? null : () => _oyna(alan, secili),
                  child: const Text('Oyna'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _KategoriKarti extends StatelessWidget {
  const _KategoriKarti({
    required this.kategori,
    required this.dogru,
    required this.yanlis,
    required this.renk,
  });

  final YarismaKategori kategori;
  final int dogru;
  final int yanlis;
  final Color renk;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Semantics(
      container: true,
      label: '${kategori.ad}: $dogru doğru, $yanlis yanlış',
      child: ExcludeSemantics(
        child: ClipRRect(
          borderRadius: BorderRadius.circular(Olcu.kose),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: r.yuzey,
              border: Border.all(color: r.kenar),
              borderRadius: BorderRadius.circular(Olcu.kose),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(height: 4, color: renk),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.all(Olcu.b2),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(KategoriRenkleri.simge(kategori), color: renk),
                        const SizedBox(height: 4),
                        Text(
                          kategori.ad,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          style: yazi.titleSmall,
                        ),
                        Text(
                          '$dogru doğru · $yanlis yanlış',
                          style: yazi.bodySmall?.copyWith(
                            color: r.metinIkincil,
                          ),
                        ),
                      ],
                    ),
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

class _Istatistik extends StatelessWidget {
  const _Istatistik({
    required this.baslik,
    required this.deger,
    this.simge,
    this.simgeRengi,
  });

  final String baslik;
  final int deger;
  final IconData? simge;
  final Color? simgeRengi;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Expanded(
      child: Semantics(
        container: true,
        label: '$baslik: $deger',
        child: ExcludeSemantics(
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (simge != null) Icon(simge, size: 20, color: simgeRengi),
                  Text('$deger', style: yazi.titleLarge),
                ],
              ),
              Text(
                baslik,
                textAlign: TextAlign.center,
                style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
