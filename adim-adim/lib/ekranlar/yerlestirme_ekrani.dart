/// Seviye belirleme (yerleştirme) sınavı: kursun mevcut alıştırmalarından,
/// henüz bitmemiş ünitelerde ünite ünite sorar (en çok 20 soru). Bir ünitede
/// doğru oranı %80 ve üstüyse ünite "atlandı" olur; ilk başarısız üniteden
/// sonrası atlanmaz. Atlanan dersler tamamlanmış sayılır ama XP, seri ve
/// aralıklı tekrar kartlarına dokunulmaz (Motor.yerlestirmeUygula).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/alistirma_oturumu.dart';
import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/icerik.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

class YerlestirmeEkrani extends ConsumerStatefulWidget {
  const YerlestirmeEkrani({super.key, required this.kursId});
  final String kursId;

  @override
  ConsumerState<YerlestirmeEkrani> createState() => _YerlestirmeDurumu();
}

class _YerlestirmeDurumu extends ConsumerState<YerlestirmeEkrani> {
  Kurs? _kurs;
  List<({int unite, String kartId, Alistirma alistirma})> _sorular = const [];
  final Map<int, bool> _cevaplar = {};
  ({int atlanan, String? oneri})? _sonuc;
  bool _kaydediliyor = false;

  @override
  void initState() {
    super.initState();
    final durum = ref.read(durumProvider).value;
    for (final k in ref.read(kurslarProvider)) {
      if (k.id == widget.kursId) _kurs = k;
    }
    if (durum != null && _kurs != null) {
      _sorular = Motor.yerlestirmeSec(
        durum,
        _kurs!,
        tohum: DateTime.now().millisecondsSinceEpoch,
      );
    }
  }

  void _cik() => context.canPop() ? context.pop() : context.go('/yol');

  Future<void> _kapatOnayi() async {
    final cik = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        icon: const Icon(Icons.warning_amber_rounded),
        title: const Text('Sınavdan çıkılsın mı?'),
        content: const Text('Şimdi çıkarsan hiçbir ünite atlanmaz.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Devam et'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Çık'),
          ),
        ],
      ),
    );
    if (cik == true && mounted) _cik();
  }

  Future<void> _bitir() async {
    if (_kaydediliyor) return;
    _kaydediliyor = true;
    final kurs = _kurs!;
    final degerlendirme = Motor.yerlestirmeDegerlendir(_sorular, [
      for (var i = 0; i < _sorular.length; i++) _cevaplar[i] ?? false,
    ]);
    final yeni = await ref
        .read(durumProvider.notifier)
        .yerlestirmeUygula(kurs, degerlendirme.gecilen);
    if (!mounted) return;
    final oneri = [
      for (final d in kurs.tumDersler)
        if (!Motor.dersBitmis(yeni, d.id)) d,
    ];
    setState(
      () => _sonuc = (
        atlanan: degerlendirme.gecilen.length,
        oneri: oneri.isEmpty ? null : oneri.first.ad,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: _kurs == null || _sorular.isEmpty
            ? _Bos(onGeri: _cik)
            : _sonuc != null
            ? _Sonuc(
                kurs: _kurs!.ad,
                atlanan: _sonuc!.atlanan,
                oneri: _sonuc!.oneri,
                onDon: _cik,
              )
            : AlistirmaOturumu(
                alistirmalar: [for (final s in _sorular) s.alistirma],
                // Sınav kart (SRS) durumunu değiştirmez.
                onSonuc: (i, dogru) => _cevaplar[i] = dogru,
                onBitti: (_, _) => _bitir(),
                onKapat: _kapatOnayi,
              ),
      ),
    );
  }
}

class _Sonuc extends StatelessWidget {
  const _Sonuc({
    required this.kurs,
    required this.atlanan,
    required this.oneri,
    required this.onDon,
  });
  final String kurs;
  final int atlanan;
  final String? oneri;
  final VoidCallback onDon;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return SayfaGovdesi(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Icon(Icons.fast_forward, size: 64, color: r.ana),
            const SizedBox(height: Olcu.b2),
            Text(
              'Seviye belirlendi',
              textAlign: TextAlign.center,
              style: yazi.headlineMedium,
            ),
            const SizedBox(height: Olcu.b1),
            Text(
              kurs,
              textAlign: TextAlign.center,
              style: yazi.bodyLarge?.copyWith(color: r.metinIkincil),
            ),
            const SizedBox(height: Olcu.b3),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(Olcu.b2),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      key: const ValueKey('yerlestirme-atlanan'),
                      atlanan == 0
                          ? 'Atlanan ünite yok'
                          : 'Atlanan ünite: $atlanan',
                      style: yazi.titleLarge,
                    ),
                    const SizedBox(height: Olcu.b1),
                    Text(
                      key: const ValueKey('yerlestirme-oneri'),
                      oneri == null
                          ? 'Kursun tüm dersleri tamam.'
                          : 'Önerilen başlangıç: $oneri',
                      style: yazi.bodyLarge,
                    ),
                    const SizedBox(height: Olcu.b1),
                    Text(
                      'Atlanan dersler tamamlanmış sayılır; XP ve seri '
                      'kazandırmaz.',
                      style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: Olcu.b3),
            FilledButton(
              key: const ValueKey('yerlestirme-don'),
              style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: onDon,
              child: const Text('Yola dön'),
            ),
          ],
        ),
      ),
    );
  }
}

class _Bos extends StatelessWidget {
  const _Bos({required this.onGeri});
  final VoidCallback onGeri;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b3),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.fast_forward, size: 48, color: r.ana),
            const SizedBox(height: Olcu.b2),
            Text(
              'Bu kurs için sınav yok',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: Olcu.b2),
            FilledButton(onPressed: onGeri, child: const Text('Yola dön')),
          ],
        ),
      ),
    );
  }
}
