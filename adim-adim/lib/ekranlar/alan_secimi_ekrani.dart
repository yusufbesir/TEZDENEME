/// Alan seçimi: tam ekran, iki büyük kart (İngilizce / Programlama).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Seçim `alanSec` ile saklanır ve yola gidilir; diğer alanın ilerlemesi
/// silinmez (docs/SADE-ARAYUZ-VE-YARISMA.md bölüm 4).
///
/// İlk açılışta (`durum.ilkAcilisTamam` false) ekran kısa bir "Hoş geldin"
/// akışına dönüşür: 1) alan, 2) ad + günlük hedef + haftalık hedef,
/// 3) hatırlatma (isteğe bağlı), sonra "Hazırsın" özeti ve "Başla". Tüm
/// seçimler mevcut `alanSec` / `ayarGuncelle` ile yazılır; "Başla"
/// `ilkAcilisTamamla` ile akışı kapatır. Mevcut kullanıcı (Profil'den
/// "Değiştir") yalnız tek adımlı alan seçimini görür.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../tema/alan_renkleri.dart';
import '../tema/tema.dart';

/// Günlük hedef hazır seçenekleri (XP); ayarlardaki 10–200 sınırı içinde.
class HedefSecenegi {
  const HedefSecenegi(this.ad, this.xp);
  final String ad;
  final int xp;

  static const List<HedefSecenegi> hepsi = [
    HedefSecenegi('Hafif', 20),
    HedefSecenegi('Orta', 50),
    HedefSecenegi('Yoğun', 100),
  ];
}

class AlanSecimiEkrani extends ConsumerStatefulWidget {
  const AlanSecimiEkrani({super.key});

  /// Akıştaki numaralı adım sayısı (özet ayrıca).
  static const int adimSayisi = 3;

  @override
  ConsumerState<AlanSecimiEkrani> createState() => _AlanSecimiDurumu();
}

class _AlanSecimiDurumu extends ConsumerState<AlanSecimiEkrani> {
  /// İlk açılış akışı mı (true) yoksa tek adımlı alan değiştirme mi (false).
  /// Ekran açılırken bir kez belirlenir; akış sırasında değişmez.
  late final bool _sihirbaz;

  /// 0: alan, 1: ad ve hedefler, 2: hatırlatma, 3: özet.
  int _adim = 0;

  final _ad = TextEditingController();
  late int _hedef;
  late int _haftaGun;
  int _saat = 20;
  int _dakika = 0;

  @override
  void initState() {
    super.initState();
    final durum = ref.read(durumProvider).value ?? const OgrenciDurumu();
    _sihirbaz = !durum.ilkAcilisTamam;
    _ad.text = durum.ad;
    _hedef = durum.gunlukHedef;
    _haftaGun = durum.haftalikHedefGun.clamp(
      OgrenciDurumu.enAzHaftalikHedef,
      OgrenciDurumu.enCokHaftalikHedef,
    );
    final saat = durum.hatirlatmaSaati;
    if (saat != null) {
      final p = saat.split(':');
      _saat = int.tryParse(p[0]) ?? 20;
      final d = int.tryParse(p.length > 1 ? p[1] : '0') ?? 0;
      _dakika = d - d % 5;
    }
  }

  @override
  void dispose() {
    _ad.dispose();
    super.dispose();
  }

  /// Kontrol karakterlerini ayıklar, 40 karakterle (rune) sınırlar.
  static String _adTemizle(String ham) {
    final temiz = ham
        .replaceAll(
          RegExp(
            r'[\u0000-\u001F\u007F-\u009F\u200E\u200F\u202A-\u202E\u2066-\u2069]',
          ),
          '',
        )
        .trim();
    final r = temiz.runes.toList();
    return r.length > 40 ? String.fromCharCodes(r.take(40)).trim() : temiz;
  }

  Future<void> _alanSec(String alan) async {
    final notifier = ref.read(durumProvider.notifier);
    if (!_sihirbaz) {
      await notifier.alanSec(alan);
      if (mounted) context.go('/yol');
      return;
    }
    // Akış bitmeden kapanırsa yeniden açılışta akış sürsün: bayrak false.
    await notifier.alanSec(alan, ilkAcilisTamam: false);
    if (mounted) setState(() => _adim = 1);
  }

  /// 2. adım: ad ve hedefleri yazar, 3. adıma geçer.
  Future<void> _hedefleriKaydet() async {
    final notifier = ref.read(durumProvider.notifier);
    final ad = _adTemizle(_ad.text);
    final mevcut = ref.read(durumProvider).value;
    await notifier.ayarGuncelle(
      ad: ad != (mevcut?.ad ?? '') ? ad : null,
      gunlukHedef: _hedef,
      haftalikHedefGun: _haftaGun,
    );
    if (mounted) setState(() => _adim = 2);
  }

  /// 3. adım: hatırlatmayı kurar; izin verilmezse uyarır ve "Şimdi değil"
  /// gibi davranır (akış bozulmaz).
  Future<void> _hatirlat() async {
    final saat =
        '${_saat.toString().padLeft(2, '0')}:'
        '${_dakika.toString().padLeft(2, '0')}';
    final tamam = await ref
        .read(durumProvider.notifier)
        .ayarGuncelle(hatirlatmaSaati: saat);
    if (!mounted) return;
    if (!tamam) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              Icon(Icons.notifications_off_outlined),
              SizedBox(width: Olcu.b1),
              Expanded(
                child: Text(
                  'Bildirim izni verilmedi; hatırlatmayı Ayarlar\'dan açabilirsin.',
                ),
              ),
            ],
          ),
        ),
      );
    }
    setState(() => _adim = 3);
  }

  Future<void> _basla() async {
    await ref.read(durumProvider.notifier).ilkAcilisTamamla();
    if (mounted) context.go('/yol');
  }

  void _geri() {
    if (_adim > 0) setState(() => _adim -= 1);
  }

  void _atla() {
    if (_adim == 1 || _adim == 2) setState(() => _adim += 1);
  }

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();

    final govde = switch (_adim) {
      0 => _alanAdimi(yazi, r),
      1 => _hedefAdimi(yazi, r),
      2 => _hatirlatmaAdimi(yazi, r),
      _ => _ozetAdimi(yazi, r, durum),
    };

    return Scaffold(
      body: SafeArea(
        child: SayfaGovdesi(
          child: Column(
            children: [
              if (_sihirbaz) _AdimGostergesi(adim: _adim),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(Olcu.b3),
                  children: govde,
                ),
              ),
              if (_sihirbaz) _dugmeler(),
            ],
          ),
        ),
      ),
    );
  }

  /// Alt düğme sırası: Geri (1. adım hariç), Atla (2–3. adım), İleri
  /// (2. adım), Başla (özet). OverflowBar dar ekranda alt alta sarar.
  Widget _dugmeler() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(Olcu.b3, 0, Olcu.b3, Olcu.b2),
      child: OverflowBar(
        alignment: MainAxisAlignment.spaceBetween,
        overflowAlignment: OverflowBarAlignment.end,
        spacing: Olcu.b1,
        overflowSpacing: Olcu.b1,
        children: [
          if (_adim > 0)
            TextButton.icon(
              style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: _geri,
              icon: const Icon(Icons.arrow_back),
              label: const Text('Geri'),
            )
          else
            const SizedBox.shrink(),
          OverflowBar(
            spacing: Olcu.b1,
            overflowSpacing: Olcu.b1,
            overflowAlignment: OverflowBarAlignment.end,
            children: [
              if (_adim == 1 || _adim == 2)
                TextButton(
                  style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
                  onPressed: _atla,
                  child: const Text('Atla'),
                ),
              if (_adim == 1)
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: _hedefleriKaydet,
                  icon: const Icon(Icons.arrow_forward),
                  label: const Text('İleri'),
                ),
              if (_adim == 3)
                FilledButton.icon(
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: _basla,
                  icon: const Icon(Icons.rocket_launch_outlined),
                  label: const Text('Başla'),
                ),
            ],
          ),
        ],
      ),
    );
  }

  List<Widget> _alanAdimi(TextTheme yazi, AdimRenkleri r) => [
    if (_sihirbaz) ...[
      const SizedBox(height: Olcu.b2),
      Text(
        'Hoş geldin',
        style: yazi.titleMedium?.copyWith(color: r.metinIkincil),
      ),
      const SizedBox(height: Olcu.b1),
    ] else
      const SizedBox(height: Olcu.b4),
    Semantics(
      header: true,
      child: Text('Ne öğrenmek istiyorsun?', style: yazi.headlineMedium),
    ),
    const SizedBox(height: Olcu.b3),
    _AlanKarti(
      alan: 'dil',
      baslik: 'İngilizce',
      altMetin: 'Kelime, cümle ve dinleme',
      onTap: () => _alanSec('dil'),
    ),
    const SizedBox(height: Olcu.b2),
    _AlanKarti(
      alan: 'kod',
      baslik: 'Programlama',
      altMetin: 'HTML, CSS ve JavaScript',
      onTap: () => _alanSec('kod'),
    ),
  ];

  List<Widget> _hedefAdimi(TextTheme yazi, AdimRenkleri r) => [
    Semantics(
      header: true,
      child: Text('Sana nasıl hitap edelim?', style: yazi.headlineMedium),
    ),
    const SizedBox(height: Olcu.b2),
    TextField(
      controller: _ad,
      maxLength: 40,
      textInputAction: TextInputAction.done,
      decoration: const InputDecoration(
        labelText: 'Adın (isteğe bağlı)',
        prefixIcon: Icon(Icons.person_outline),
      ),
    ),
    const SizedBox(height: Olcu.b3),
    Semantics(
      header: true,
      child: Text('Günlük hedefin', style: yazi.titleMedium),
    ),
    const SizedBox(height: Olcu.b1),
    Semantics(
      label: 'Günlük hedef: $_hedef XP',
      child: Wrap(
        spacing: Olcu.b1,
        runSpacing: Olcu.b1,
        children: [
          for (final s in HedefSecenegi.hepsi)
            ChoiceChip(
              key: ValueKey('hedef-${s.xp}'),
              label: Text('${s.ad} · ${s.xp} XP'),
              selected: _hedef == s.xp,
              onSelected: (_) => setState(() => _hedef = s.xp),
            ),
        ],
      ),
    ),
    const SizedBox(height: Olcu.b3),
    Semantics(
      header: true,
      child: Text('Haftada kaç gün?', style: yazi.titleMedium),
    ),
    const SizedBox(height: Olcu.b1),
    Semantics(
      label: 'Haftalık hedef: haftada $_haftaGun gün',
      child: Wrap(
        spacing: Olcu.b1,
        runSpacing: Olcu.b1,
        children: [
          for (
            var g = OgrenciDurumu.enAzHaftalikHedef;
            g <= OgrenciDurumu.enCokHaftalikHedef;
            g++
          )
            ChoiceChip(
              key: ValueKey('hafta-$g'),
              label: Text('$g gün'),
              selected: _haftaGun == g,
              onSelected: (_) => setState(() => _haftaGun = g),
            ),
        ],
      ),
    ),
    const SizedBox(height: Olcu.b2),
    Text(
      'Haftada bu kadar gün çalışırsan günlük ara verdiğinde bile serin kopmaz.',
      style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
    ),
  ];

  List<Widget> _hatirlatmaAdimi(TextTheme yazi, AdimRenkleri r) => [
    Semantics(
      header: true,
      child: Text('Günlük hatırlatma', style: yazi.headlineMedium),
    ),
    const SizedBox(height: Olcu.b1),
    Text(
      'İstersen her gün aynı saatte kısa bir hatırlatma gönderelim. '
      'Bunu sonra Ayarlar\'dan da değiştirebilirsin.',
      style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
    ),
    const SizedBox(height: Olcu.b3),
    Semantics(
      label:
          'Hatırlatma saati: ${_saat.toString().padLeft(2, '0')}:'
          '${_dakika.toString().padLeft(2, '0')}',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          DropdownButton<int>(
            key: const ValueKey('saat-sec'),
            value: _saat,
            items: [
              for (var h = 0; h < 24; h++)
                DropdownMenuItem(
                  value: h,
                  child: Text(h.toString().padLeft(2, '0')),
                ),
            ],
            onChanged: (v) => setState(() => _saat = v ?? _saat),
          ),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: Olcu.b1),
            child: Text(':'),
          ),
          DropdownButton<int>(
            key: const ValueKey('dakika-sec'),
            value: _dakika,
            items: [
              for (var m = 0; m < 60; m += 5)
                DropdownMenuItem(
                  value: m,
                  child: Text(m.toString().padLeft(2, '0')),
                ),
            ],
            onChanged: (v) => setState(() => _dakika = v ?? _dakika),
          ),
        ],
      ),
    ),
    const SizedBox(height: Olcu.b3),
    OverflowBar(
      spacing: Olcu.b1,
      overflowSpacing: Olcu.b1,
      children: [
        FilledButton.icon(
          style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
          onPressed: _hatirlat,
          icon: const Icon(Icons.notifications_active_outlined),
          label: const Text('Hatırlat'),
        ),
        OutlinedButton(
          style: OutlinedButton.styleFrom(minimumSize: const Size(48, 48)),
          onPressed: _atla,
          child: const Text('Şimdi değil'),
        ),
      ],
    ),
  ];

  List<Widget> _ozetAdimi(TextTheme yazi, AdimRenkleri r, OgrenciDurumu durum) {
    Widget satir(IconData simge, String etiket, String deger) => ListTile(
      contentPadding: EdgeInsets.zero,
      leading: Icon(simge, color: r.ana),
      title: Text(etiket),
      subtitle: Text(deger),
    );
    return [
      Semantics(
        header: true,
        child: Text('Hazırsın', style: yazi.headlineMedium),
      ),
      const SizedBox(height: Olcu.b1),
      Text(
        durum.ad.isEmpty
            ? 'İlk dersin seni bekliyor.'
            : '${durum.ad}, ilk dersin seni bekliyor.',
        style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
      ),
      const SizedBox(height: Olcu.b2),
      satir(
        AlanRenkleri.simge(durum.alan),
        'Alan',
        AlanRenkleri.ad(durum.alan),
      ),
      satir(Icons.bolt, 'Günlük hedef', '${durum.gunlukHedef} XP'),
      satir(
        Icons.calendar_today_outlined,
        'Haftalık hedef',
        'Haftada ${durum.haftalikHedefGun} gün',
      ),
      satir(
        durum.hatirlatmaSaati == null
            ? Icons.notifications_off_outlined
            : Icons.notifications_active_outlined,
        'Hatırlatma',
        durum.hatirlatmaSaati == null
            ? 'Kapalı'
            : 'Her gün ${durum.hatirlatmaSaati}',
      ),
    ];
  }
}

/// Adım göstergesi: "Adım 1/3" metni ve ilerleme çubuğu; özet adımında
/// "Özet" (başlık "Hazırsın"). Semantics ile okunur.
class _AdimGostergesi extends StatelessWidget {
  const _AdimGostergesi({required this.adim});
  final int adim;

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    const toplam = AlanSecimiEkrani.adimSayisi;
    final ozet = adim >= toplam;
    final etiket = ozet ? 'Özet' : 'Adım ${adim + 1}/$toplam';
    final oran = ozet ? 1.0 : (adim + 1) / (toplam + 1);
    return Semantics(
      label: ozet ? 'Akış tamamlandı' : 'Adım ${adim + 1} / $toplam',
      excludeSemantics: true,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(Olcu.b3, Olcu.b2, Olcu.b3, 0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              etiket,
              style: yazi.labelLarge?.copyWith(color: r.metinIkincil),
            ),
            const SizedBox(height: Olcu.b1),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(value: oran, minHeight: 6),
            ),
          ],
        ),
      ),
    );
  }
}

class _AlanKarti extends StatelessWidget {
  const _AlanKarti({
    required this.alan,
    required this.baslik,
    required this.altMetin,
    required this.onTap,
  });
  final String alan;
  final String baslik;
  final String altMetin;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final vurgu = AlanRenkleri.renk(alan, Theme.of(context).brightness);
    return Semantics(
      button: true,
      label: '$baslik. $altMetin',
      excludeSemantics: true,
      onTap: onTap,
      child: Material(
        color: r.yuzey,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(Olcu.kose),
          side: BorderSide(color: vurgu, width: 2),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(Olcu.kose),
          onTap: onTap,
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 120),
            child: Padding(
              padding: const EdgeInsets.all(Olcu.b3),
              child: Row(
                children: [
                  Icon(AlanRenkleri.simge(alan), size: 48, color: vurgu),
                  const SizedBox(width: Olcu.b3),
                  Expanded(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(baslik, style: yazi.titleLarge),
                        const SizedBox(height: 4),
                        Text(
                          altMetin,
                          style: yazi.bodyMedium?.copyWith(
                            color: r.metinIkincil,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right, color: r.metinIkincil),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
