/// Ayın ve yılın özeti (ÖZELLİK 51): çevrimdışı rapor. Ay / Yıl seçilir;
/// biten ders, yeni kart (öğrenilen kelime sayısı için yaklaşık ölçü), XP,
/// çalışılan gün, çalışma süresi, en iyi gün, en çok çalışılan konu ve en
/// güçlü ünite gösterilir. Yalnız kayıtlı verilerden hesaplanır; kaydı
/// olmayan dönemler "kayıtlı veri yok" der. "Metni kopyala" raporu panoya alır.
/// Meydan okuma ekranından `push` ile açılır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../motor/ders_meta.dart';
import '../motor/kelime_bulutu.dart';
import '../motor/ozet.dart';
import '../tema/tema.dart';

class OzetEkrani extends ConsumerStatefulWidget {
  const OzetEkrani({super.key});

  @override
  ConsumerState<OzetEkrani> createState() => _OzetDurumu();
}

class _OzetDurumu extends ConsumerState<OzetEkrani> {
  /// true: yıl; false: ay.
  bool _yil = false;

  /// Seçili dönem anahtarı; null: en yeni (yoksa bugünün ayı/yılı).
  String? _secili;

  @override
  Widget build(BuildContext context) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final bugun = ref.watch(bugunProvider);
    final kurslar = ref.watch(alanKurslariProvider);
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;

    final donemler = _yil ? Ozet.yillar(durum) : Ozet.aylar(durum);
    // Hiç veri yoksa bugünün dönemi seçilir ve "kayıtlı veri yok" görünür.
    final varsayilan = _yil ? bugun.substring(0, 4) : bugun.substring(0, 7);
    final anahtar = (_secili != null && donemler.contains(_secili))
        ? _secili!
        : (donemler.isEmpty ? varsayilan : donemler.first);
    final o = _yil ? Ozet.yil(durum, anahtar) : Ozet.ay(durum, anahtar);
    final guclu = Ozet.enGucluUnite(durum, kurslar);
    final kursAdlari = {for (final k in ref.watch(kurslarProvider)) k.id: k.ad};
    String kursAdi(String id) => kursAdlari[id] ?? id;
    final ogrenilenKelime = durum.alan == 'dil'
        ? KelimeBulutu.ogrenilenSayisi(durum, kurslar)
        : null;

    Widget satir(IconData simge, String etiket, String deger, {Key? key}) =>
        Padding(
          key: key,
          padding: const EdgeInsets.symmetric(
            horizontal: Olcu.b2,
            vertical: Olcu.b1,
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(simge, color: r.ana),
              const SizedBox(width: Olcu.b2),
              Expanded(flex: 5, child: Text(etiket)),
              const SizedBox(width: Olcu.b1),
              Expanded(
                flex: 6,
                child: Text(
                  deger,
                  textAlign: TextAlign.end,
                  style: yazi.titleSmall,
                ),
              ),
            ],
          ),
        );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ay ve yıl özeti'),
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
                SegmentedButton<bool>(
                  key: const ValueKey('ozet-tur'),
                  segments: const [
                    ButtonSegment(value: false, label: Text('Ay')),
                    ButtonSegment(value: true, label: Text('Yıl')),
                  ],
                  selected: {_yil},
                  onSelectionChanged: (s) => setState(() {
                    _yil = s.first;
                    _secili = null;
                  }),
                ),
                if (donemler.length > 1) ...[
                  const SizedBox(height: Olcu.b2),
                  Wrap(
                    spacing: Olcu.b1,
                    runSpacing: Olcu.b1,
                    children: [
                      for (final d in donemler)
                        ChoiceChip(
                          key: ValueKey('ozet-donem-$d'),
                          label: Text(Ozet.baslik(d)),
                          selected: d == anahtar,
                          onSelected: (_) => setState(() => _secili = d),
                        ),
                    ],
                  ),
                ],
                const SizedBox(height: Olcu.b2),
                Semantics(
                  header: true,
                  child: Text(
                    Ozet.baslik(anahtar),
                    key: const ValueKey('ozet-baslik'),
                    style: yazi.headlineSmall,
                  ),
                ),
                const SizedBox(height: Olcu.b1),
                if (o.bos)
                  Text(
                    'Bu dönem için kayıtlı veri yok.',
                    key: const ValueKey('ozet-bos'),
                    style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                  )
                else
                  Card(
                    child: Column(
                      children: [
                        satir(
                          Icons.task_alt,
                          'Biten ders',
                          '${o.dersler}',
                          key: const ValueKey('ozet-ders'),
                        ),
                        satir(
                          Icons.style_outlined,
                          'Yeni kart (kelime)',
                          '${o.yeniKart}',
                          key: const ValueKey('ozet-kart'),
                        ),
                        satir(Icons.bolt, 'Kazanılan XP', '${o.xp}'),
                        satir(
                          Icons.calendar_today_outlined,
                          'Çalışılan gün',
                          '${o.aktifGun}',
                        ),
                        satir(
                          Icons.timer_outlined,
                          'Çalışma süresi',
                          DersMeta.sureMetni(o.sureSn),
                        ),
                        satir(
                          Icons.emoji_events_outlined,
                          'En iyi gün',
                          o.enIyiGun == null
                              ? 'Kayıt yok'
                              : '${o.enIyiGun} · ${o.enIyiGunXp} XP',
                          key: const ValueKey('ozet-en-iyi-gun'),
                        ),
                        satir(
                          Icons.school_outlined,
                          'En çok çalışılan konu',
                          o.enCokKurs == null
                              ? 'Kayıt yok'
                              : '${kursAdi(o.enCokKurs!)} (${o.enCokKursDers} ders)',
                          key: const ValueKey('ozet-konu'),
                        ),
                      ],
                    ),
                  ),
                const SizedBox(height: Olcu.b1),
                if (guclu != null)
                  Text(
                    'En güçlü ünite: ${guclu.uniteAd} (${guclu.kursAd}, '
                    'ustalık %${guclu.ustalik})',
                    key: const ValueKey('ozet-guclu'),
                    style: yazi.bodyMedium,
                  ),
                if (ogrenilenKelime != null)
                  Padding(
                    padding: const EdgeInsets.only(top: Olcu.b1),
                    child: Text(
                      'Şu ana kadar $ogrenilenKelime kelime öğrendin '
                      '(tüm zamanlar).',
                      key: const ValueKey('ozet-kelime-toplam'),
                      style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
                    ),
                  ),
                const SizedBox(height: Olcu.b3),
                OutlinedButton.icon(
                  key: const ValueKey('ozet-kopyala'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: () async {
                    final mesaj = ScaffoldMessenger.of(context);
                    await Clipboard.setData(
                      ClipboardData(
                        text: Ozet.metin(o, kursAdi: kursAdi, enGuclu: guclu),
                      ),
                    );
                    mesaj
                      ..hideCurrentSnackBar()
                      ..showSnackBar(
                        const SnackBar(content: Text('Özet kopyalandı')),
                      );
                  },
                  icon: const Icon(Icons.copy),
                  label: const Text('Metni kopyala'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
