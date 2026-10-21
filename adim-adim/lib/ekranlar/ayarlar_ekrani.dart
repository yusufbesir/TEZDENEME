/// Ayarlar ekranı: ad, görünüm, ses, günlük ve haftalık hedef, hatırlatma
/// (günlük saat ve açılıştaki bekleyen tekrar bildirimi), veri sıfırlama.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Kabuğun dışında, Profil'deki dişliyle `push` ile açılır.
/// Hedef etiketi sabit genişlik yerine içeriğe göre genişler.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../tema/tema.dart';

class AyarlarEkrani extends ConsumerStatefulWidget {
  const AyarlarEkrani({super.key});

  @override
  ConsumerState<AyarlarEkrani> createState() => _AyarlarDurumu();
}

class _AyarlarDurumu extends ConsumerState<AyarlarEkrani> {
  final _ad = TextEditingController();
  final _adOdak = FocusNode();
  bool _adYuklendi = false;

  @override
  void initState() {
    super.initState();
    _adOdak.addListener(() {
      if (!_adOdak.hasFocus) _adKaydet();
    });
  }

  @override
  void dispose() {
    _ad.dispose();
    _adOdak.dispose();
    super.dispose();
  }

  /// Kontrol karakterlerini ve çift yönlü Unicode karakterlerini ayıklar,
  /// 40 karakterle (rune) sınırlar.
  static String adTemizle(String ham) {
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

  void _adKaydet() {
    final yeni = adTemizle(_ad.text);
    final mevcut = ref.read(durumProvider).value?.ad ?? '';
    if (yeni != mevcut) {
      ref.read(durumProvider.notifier).ayarGuncelle(ad: yeni);
    }
  }

  Future<void> _saatSec(String? mevcut) async {
    final p = (mevcut ?? '20:00').split(':');
    var saat = int.tryParse(p[0]) ?? 20;
    var dakika = int.tryParse(p.length > 1 ? p[1] : '0') ?? 0;
    final sec = await showDialog<String>(
      context: context,
      builder: (c) => StatefulBuilder(
        builder: (c, setS) => AlertDialog(
          title: const Text('Hatırlatma saati'),
          content: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              DropdownButton<int>(
                value: saat,
                items: [
                  for (var h = 0; h < 24; h++)
                    DropdownMenuItem(
                      value: h,
                      child: Text(h.toString().padLeft(2, '0')),
                    ),
                ],
                onChanged: (v) => setS(() => saat = v ?? saat),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: Olcu.b1),
                child: Text(':'),
              ),
              DropdownButton<int>(
                value: dakika - dakika % 5,
                items: [
                  for (var m = 0; m < 60; m += 5)
                    DropdownMenuItem(
                      value: m,
                      child: Text(m.toString().padLeft(2, '0')),
                    ),
                ],
                onChanged: (v) => setS(() => dakika = v ?? dakika),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(c),
              child: const Text('Vazgeç'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: () => Navigator.pop(
                c,
                '${saat.toString().padLeft(2, '0')}:${(dakika - dakika % 5).toString().padLeft(2, '0')}',
              ),
              child: const Text('Kaydet'),
            ),
          ],
        ),
      ),
    );
    if (sec != null) {
      await _hatirlatmaAyarla(sec);
    }
  }

  /// Hatırlatmayı kurar; bildirim izni verilmezse anahtar kapanır ve uyarılır.
  Future<void> _hatirlatmaAyarla(String saat) async {
    final tamam = await ref
        .read(durumProvider.notifier)
        .ayarGuncelle(hatirlatmaSaati: saat);
    if (!tamam && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              Icon(Icons.notifications_off_outlined),
              SizedBox(width: Olcu.b1),
              Expanded(child: Text('Bildirim izni verilmedi')),
            ],
          ),
        ),
      );
    }
  }

  Future<void> _sifirlaOnayi() async {
    final onay = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        icon: Icon(Icons.warning_amber_rounded, color: c.renkler.hata),
        title: const Text('Tüm veriler silinsin mi?'),
        content: const Text(
          'XP, seri, tekrar kartları ve ayarların silinir. Bu işlem geri alınamaz.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Vazgeç'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(
              minimumSize: const Size(48, 48),
              backgroundColor: c.renkler.hata,
              foregroundColor: c.renkler.anaUstu,
            ),
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Sıfırla'),
          ),
        ],
      ),
    );
    if (onay == true) {
      await ref.read(durumProvider.notifier).sifirla();
      _ad.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.check_circle_outline),
                SizedBox(width: Olcu.b1),
                Expanded(child: Text('Veriler sıfırlandı.')),
              ],
            ),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    if (!_adYuklendi && ref.read(durumProvider).hasValue) {
      _ad.text = durum.ad;
      _adYuklendi = true;
    }
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final notifier = ref.read(durumProvider.notifier);

    Widget bolum(String baslik) => Padding(
      padding: const EdgeInsets.only(top: Olcu.b3, bottom: Olcu.b1),
      child: Semantics(
        header: true,
        child: Text(baslik, style: yazi.titleMedium),
      ),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ayarlar'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/profil'),
        ),
      ),
      body: SafeArea(
        child: SayfaGovdesi(
          child: ListView(
            padding: const EdgeInsets.all(Olcu.b3),
            children: [
              bolum('Profil'),
              TextField(
                controller: _ad,
                focusNode: _adOdak,
                maxLength: 40,
                textInputAction: TextInputAction.done,
                decoration: const InputDecoration(
                  labelText: 'Adın (isteğe bağlı)',
                  prefixIcon: Icon(Icons.person_outline),
                ),
                onSubmitted: (_) => _adKaydet(),
              ),
              bolum('Görünüm'),
              SizedBox(
                width: double.infinity,
                child: SegmentedButton<bool?>(
                  showSelectedIcon: true,
                  segments: const [
                    ButtonSegment(
                      value: null,
                      icon: Icon(Icons.brightness_auto),
                      label: Text('Sistem'),
                    ),
                    ButtonSegment(
                      value: false,
                      icon: Icon(Icons.light_mode_outlined),
                      label: Text('Açık'),
                    ),
                    ButtonSegment(
                      value: true,
                      icon: Icon(Icons.dark_mode_outlined),
                      label: Text('Koyu'),
                    ),
                  ],
                  selected: {durum.koyuTema},
                  onSelectionChanged: (s) {
                    final v = s.first;
                    if (v == null) {
                      notifier.ayarGuncelle(koyuTemaSil: true);
                    } else {
                      notifier.ayarGuncelle(koyuTema: v);
                    }
                  },
                ),
              ),
              bolum('Ses'),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                secondary: Icon(
                  durum.sesAcik ? Icons.volume_up : Icons.volume_off,
                  color: r.ana,
                ),
                title: const Text('Ses'),
                subtitle: Text(
                  durum.sesAcik
                      ? 'Dinleme alıştırmaları sesli okunur'
                      : 'Kapalı: dinleme cümlesi yazıyla gösterilir',
                ),
                value: durum.sesAcik,
                onChanged: (v) => notifier.ayarGuncelle(sesAcik: v),
              ),
              bolum('Günlük hedef'),
              Semantics(
                label: 'Günlük hedef: ${durum.gunlukHedef} XP',
                child: Row(
                  children: [
                    Expanded(
                      child: Slider(
                        min: 10,
                        max: 200,
                        divisions: 19,
                        value: durum.gunlukHedef.clamp(10, 200).toDouble(),
                        label: '${durum.gunlukHedef} XP',
                        onChanged: (v) =>
                            notifier.ayarGuncelle(gunlukHedef: v.round()),
                      ),
                    ),
                    // Sabit genişlik yok: metin ölçeğiyle birlikte genişler.
                    ConstrainedBox(
                      constraints: const BoxConstraints(minWidth: 72),
                      child: Text(
                        '${durum.gunlukHedef} XP',
                        softWrap: false,
                        textAlign: TextAlign.end,
                        style: yazi.titleMedium,
                      ),
                    ),
                  ],
                ),
              ),
              bolum('Haftalık hedef'),
              Semantics(
                label: 'Haftalık hedef: haftada ${durum.haftalikHedefGun} gün',
                child: Row(
                  children: [
                    Expanded(
                      child: Slider(
                        min: OgrenciDurumu.enAzHaftalikHedef.toDouble(),
                        max: OgrenciDurumu.enCokHaftalikHedef.toDouble(),
                        divisions:
                            OgrenciDurumu.enCokHaftalikHedef -
                            OgrenciDurumu.enAzHaftalikHedef,
                        value: durum.haftalikHedefGun
                            .clamp(
                              OgrenciDurumu.enAzHaftalikHedef,
                              OgrenciDurumu.enCokHaftalikHedef,
                            )
                            .toDouble(),
                        label: '${durum.haftalikHedefGun} gün',
                        onChanged: (v) =>
                            notifier.ayarGuncelle(haftalikHedefGun: v.round()),
                      ),
                    ),
                    SizedBox(
                      width: 72,
                      child: Text(
                        'Haftada ${durum.haftalikHedefGun} gün',
                        textAlign: TextAlign.end,
                        style: yazi.titleMedium,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                'Haftada bu kadar gün çalışırsan günlük ara verdiğinde bile serin kopmaz.',
                style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
              ),
              bolum('Hatırlatma'),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                secondary: Icon(
                  durum.hatirlatmaSaati == null
                      ? Icons.notifications_off_outlined
                      : Icons.notifications_active_outlined,
                  color: r.ana,
                ),
                title: const Text('Günlük hatırlatma'),
                subtitle: Text(
                  durum.hatirlatmaSaati == null
                      ? 'Kapalı'
                      : 'Her gün ${durum.hatirlatmaSaati}',
                ),
                value: durum.hatirlatmaSaati != null,
                onChanged: (v) => v
                    ? _hatirlatmaAyarla('20:00')
                    : notifier.ayarGuncelle(hatirlatmaSil: true),
              ),
              if (durum.hatirlatmaSaati != null)
                Align(
                  alignment: Alignment.centerLeft,
                  child: OutlinedButton.icon(
                    icon: const Icon(Icons.schedule),
                    label: Text('Saati değiştir (${durum.hatirlatmaSaati})'),
                    onPressed: () => _saatSec(durum.hatirlatmaSaati),
                  ),
                ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                secondary: Icon(Icons.repeat_outlined, color: r.ana),
                title: const Text('Açılışta bekleyen tekrar bildirimi'),
                subtitle: const Text(
                  'Uygulama açılırken bugün bekleyen tekrar sayısını bildirir',
                ),
                value: durum.tekrarBildirimiAcik,
                onChanged: (v) => notifier.ayarGuncelle(tekrarBildirimiAcik: v),
              ),
              bolum('Veriler'),
              Text(
                'Tüm verilerin yalnızca bu cihazda saklanır.',
                style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
              ),
              const SizedBox(height: Olcu.b2),
              Align(
                alignment: Alignment.centerLeft,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: r.hata,
                    side: BorderSide(color: r.hata),
                  ),
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Verileri sıfırla'),
                  onPressed: _sifirlaOnayi,
                ),
              ),
              bolum('Hakkında'),
              ListTile(
                contentPadding: EdgeInsets.zero,
                leading: Icon(Icons.description_outlined, color: r.ana),
                title: const Text('Lisanslar'),
                onTap: () => showLicensePage(
                  context: context,
                  applicationName: 'Adım Adım',
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
