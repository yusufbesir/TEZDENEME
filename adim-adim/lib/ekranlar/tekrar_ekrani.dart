/// Tekrar sekmesi: seçili alanın zamanı gelen (yarı ömür tabanlı) kartlarını
/// sorar; altında "Kelime sağlığı" panosu (Zayıf/Orta/Güçlü) ve "Hata defteri"
/// bölümü (yanlış kart ve yarışma soruları, "Zayıf noktalar dersi" düğmesi)
/// bulunur; "Filtreli tekrar ve takvim" ile "Pratik merkezi" düğmeleri
/// geçici deste ve pratik ekranlarını açar. Oturum bitince öğrenme günlüğüne tek 'tekrar' kaydı yazılır.
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/alistirma_oturumu.dart';
import '../bilesenler/kelime_sagligi_panosu.dart';
import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../model/icerik.dart';
import '../motor/motor.dart';
import '../tema/kategori_renkleri.dart';
import '../tema/tema.dart';
import '../yarisma/model.dart';
import '../yarisma/soru_bankasi.dart';

/// Aralıklı tekrar: zamanı gelen kartları sırayla sorar.
class TekrarEkrani extends ConsumerStatefulWidget {
  const TekrarEkrani({super.key});

  @override
  ConsumerState<TekrarEkrani> createState() => _TekrarDurumu();
}

class _TekrarDurumu extends ConsumerState<TekrarEkrani> {
  List<({String kartId, Alistirma alistirma})>? _oturum;
  ({int dogru, int toplam})? _sonuc;

  List<({String kartId, Alistirma alistirma})> _bekleyenler() {
    final durum = ref.read(durumProvider).value;
    if (durum == null) return const [];
    final bugun = ref.read(bugunProvider);
    // Yalnızca seçili alanın kurslarına ait kartlar; diğer alanın kartları
    // orada bekler, kaybolmaz.
    final kurslar = ref.read(alanKurslariProvider);
    return [
      for (final id in Motor.tekrarBekleyen(durum, bugun))
        if (Motor.kartCoz(kurslar, id) case final a?)
          (kartId: id, alistirma: a),
    ];
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(durumProvider);
    ref.watch(alanKurslariProvider);
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;

    if (_oturum != null && _sonuc == null) {
      final oturum = _oturum!;
      return SafeArea(
        child: AlistirmaOturumu(
          alistirmalar: [for (final o in oturum) o.alistirma],
          // Kişisel kelime notu: cevaptan sonra bantta gösterilir.
          notGetir: (i) =>
              ref.read(durumProvider).value?.kelimeNotlari[oturum[i].kartId],
          onSonuc: (i, dogru) => ref
              .read(durumProvider.notifier)
              .kartIsle(oturum[i].kartId, dogru),
          onBitti: (d, t) {
            // Oturum sonu: öğrenme günlüğüne tek 'tekrar' kaydı.
            ref.read(durumProvider.notifier).tekrarBitir(d, t);
            setState(() => _sonuc = (dogru: d, toplam: t));
          },
          onKapat: () => setState(() => _oturum = null),
        ),
      );
    }

    final sonuc = _sonuc;
    final List<({String kartId, Alistirma alistirma})> bekleyen = sonuc == null
        ? _bekleyenler()
        : const [];
    return SafeArea(
      child: SayfaGovdesi(
        child: Padding(
          padding: const EdgeInsets.all(Olcu.b3),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(
                header: true,
                child: Text('Tekrar', style: yazi.headlineMedium),
              ),
              const SizedBox(height: Olcu.b3),
              Expanded(
                child: Center(
                  child: SingleChildScrollView(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Center(
                          child: sonuc != null
                              ? _Mesaj(
                                  simge: Icons.check_circle,
                                  renk: r.dogru,
                                  baslik: 'Tekrar tamamlandı',
                                  metin:
                                      '${sonuc.toplam} karttan ${sonuc.dogru} tanesini doğru bildin.',
                                  dugme: 'Tamam',
                                  onTap: () => setState(() {
                                    _sonuc = null;
                                    _oturum = null;
                                  }),
                                )
                              : bekleyen.isEmpty
                              ? const _Mesaj(
                                  simge: Icons.task_alt,
                                  baslik: 'Bugün tekrar yok',
                                  metin:
                                      'Ders çözdükçe tekrar kartların burada birikir.',
                                )
                              : _Mesaj(
                                  simge: Icons.replay,
                                  renk: r.ana,
                                  baslik: '${bekleyen.length} kart bekliyor',
                                  metin:
                                      'Kısa bir tekrar, öğrendiklerini kalıcı yapar.',
                                  dugme: 'Tekrara başla',
                                  onTap: () => setState(() {
                                    _oturum = bekleyen;
                                    _sonuc = null;
                                  }),
                                ),
                        ),
                        const SizedBox(height: Olcu.b3),
                        Wrap(
                          spacing: Olcu.b2,
                          runSpacing: Olcu.b1,
                          alignment: WrapAlignment.center,
                          children: [
                            OutlinedButton.icon(
                              key: const ValueKey('filtreli-tekrar-ac'),
                              icon: const Icon(Icons.filter_alt_outlined),
                              label: const Text('Filtreli tekrar ve takvim'),
                              onPressed: () => context.push('/tekrar-filtre'),
                            ),
                            OutlinedButton.icon(
                              key: const ValueKey('pratik-merkezi-ac'),
                              icon: const Icon(Icons.fitness_center),
                              label: const Text('Pratik merkezi'),
                              onPressed: () => context.go('/pratik'),
                            ),
                          ],
                        ),
                        const SizedBox(height: Olcu.b4),
                        KelimeSagligiPanosu(
                          durum:
                              ref.read(durumProvider).value ??
                              const OgrenciDurumu(),
                          kurslar: ref.read(alanKurslariProvider),
                        ),
                        const SizedBox(height: Olcu.b4),
                        _HataDefteri(
                          durum:
                              ref.read(durumProvider).value ??
                              const OgrenciDurumu(),
                          kurslar: ref.read(alanKurslariProvider),
                          bugun: ref.read(bugunProvider),
                        ),
                      ],
                    ),
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

class _Mesaj extends StatelessWidget {
  const _Mesaj({
    required this.simge,
    required this.baslik,
    required this.metin,
    this.renk,
    this.dugme,
    this.onTap,
  });
  final IconData simge;
  final Color? renk;
  final String baslik;
  final String metin;
  final String? dugme;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(simge, size: 64, color: renk ?? r.metinIkincil),
        const SizedBox(height: Olcu.b2),
        Text(baslik, style: yazi.titleLarge, textAlign: TextAlign.center),
        const SizedBox(height: Olcu.b1),
        Text(
          metin,
          style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          textAlign: TextAlign.center,
        ),
        if (dugme != null) ...[
          const SizedBox(height: Olcu.b3),
          FilledButton(onPressed: onTap, child: Text(dugme!)),
        ],
      ],
    );
  }
}

/// Hata defteri bölümü: seçili alanın yanlış kartları ve yarışma soruları
/// (en yeni önce, en çok 20 satır) ve "Zayıf noktalar dersi" düğmesi.
class _HataDefteri extends StatelessWidget {
  const _HataDefteri({
    required this.durum,
    required this.kurslar,
    required this.bugun,
  });
  final OgrenciDurumu durum;
  final List<Kurs> kurslar;
  final String bugun;

  static const int _enCokSatir = 20;

  /// Kayıt metni ve (yarışmada) kategori; alanda çözülemiyorsa null.
  ({String metin, YarismaKategori? kategori})? _coz(HataKaydi h) {
    if (h.tur == HataKaydi.turKart) {
      final a = Motor.kartCoz(kurslar, h.id);
      return a == null ? null : (metin: a.soru, kategori: null);
    }
    for (final q in tumSorular) {
      if (q.id == h.id && q.alan == durum.alan) {
        return (metin: q.soru, kategori: q.kategori);
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final parlaklik = Theme.of(context).brightness;
    final satirlar = <({HataKaydi hata, String metin, YarismaKategori? kat})>[];
    for (final h in durum.hatalar.reversed) {
      final c = _coz(h);
      if (c != null) satirlar.add((hata: h, metin: c.metin, kat: c.kategori));
    }
    final zayifVar = Motor.zayifKartlar(
      durum,
      bugun,
    ).any((id) => Motor.kartCoz(kurslar, id) != null);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Semantics(
          header: true,
          child: Text('Hata defteri', style: yazi.titleLarge),
        ),
        const SizedBox(height: Olcu.b1),
        if (satirlar.isEmpty)
          Text(
            'Yanlış bildiklerin burada birikir.',
            style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          )
        else ...[
          Text(
            '${satirlar.length} kayıt',
            style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          ),
          const SizedBox(height: Olcu.b1),
          for (final s in satirlar.take(_enCokSatir))
            _HataSatiri(
              metin: s.metin,
              ayrinti:
                  '${s.kat?.ad ?? 'Alıştırma'} · ${s.hata.seviye} · ${s.hata.gun}',
              renk: s.kat == null
                  ? r.ana
                  : KategoriRenkleri.renk(s.kat!, parlaklik),
              simge: s.kat == null
                  ? Icons.style_outlined
                  : KategoriRenkleri.simge(s.kat!),
            ),
        ],
        const SizedBox(height: Olcu.b2),
        Align(
          alignment: Alignment.centerLeft,
          child: OutlinedButton.icon(
            icon: const Icon(Icons.track_changes),
            label: const Text('Zayıf noktalar dersi'),
            onPressed: zayifVar ? () => context.push('/mikro?mod=zayif') : null,
          ),
        ),
        if (!zayifVar)
          Padding(
            padding: const EdgeInsets.only(top: Olcu.b1),
            child: Text(
              'Son 7 günde yanlış yaptığın alıştırma yok.',
              style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
            ),
          ),
      ],
    );
  }
}

class _HataSatiri extends StatelessWidget {
  const _HataSatiri({
    required this.metin,
    required this.ayrinti,
    required this.renk,
    required this.simge,
  });
  final String metin;
  final String ayrinti;
  final Color renk;
  final IconData simge;

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    // Renk tek başına bilgi taşımaz: simge ve kategori adı da gösterilir.
    return Semantics(
      label: '$ayrinti. $metin',
      excludeSemantics: true,
      child: Container(
        margin: const EdgeInsets.only(bottom: Olcu.b1),
        padding: const EdgeInsets.symmetric(
          horizontal: Olcu.b2,
          vertical: Olcu.b1,
        ),
        decoration: BoxDecoration(
          border: Border(left: BorderSide(color: renk, width: 4)),
          color: r.yuzey,
        ),
        child: Row(
          children: [
            Icon(simge, color: renk),
            const SizedBox(width: Olcu.b2),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    metin,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: yazi.bodyMedium,
                  ),
                  Text(
                    ayrinti,
                    style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
