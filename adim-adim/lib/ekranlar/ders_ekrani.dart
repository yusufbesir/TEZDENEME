import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/alistirma_oturumu.dart';
import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/icerik.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

/// Ders akışı: alıştırmalar -> özet (doğru sayısı, XP, seri).
class DersEkrani extends ConsumerStatefulWidget {
  const DersEkrani({super.key, required this.dersId});
  final String dersId;

  @override
  ConsumerState<DersEkrani> createState() => _DersDurumu();
}

class _DersDurumu extends ConsumerState<DersEkrani> {
  ({int dogru, int toplam, int xp, int seri})? _ozet;
  bool _kaydediliyor = false;

  Ders? _dersBul() {
    for (final k in ref.read(kurslarProvider)) {
      final d = k.dersBul(widget.dersId);
      if (d != null) return d;
    }
    return null;
  }

  void _cik() => context.canPop() ? context.pop() : context.go('/yol');

  Future<void> _kapatOnayi() async {
    final cik = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        icon: const Icon(Icons.warning_amber_rounded),
        title: const Text('Dersten çıkılsın mı?'),
        content: const Text('Şimdi çıkarsan bu dersteki ilerleme kaydedilmez.'),
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

  Future<void> _bitir(Ders ders, int dogru, int toplam) async {
    if (_kaydediliyor) return;
    _kaydediliyor = true;
    final yeni = await ref
        .read(durumProvider.notifier)
        .dersBitir(ders.id, dogru, toplam);
    if (!mounted) return;
    setState(
      () => _ozet = (
        dogru: dogru,
        toplam: toplam,
        xp: Motor.dersXp(dogru, toplam),
        seri: yeni.seri,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ders = _dersBul();
    return Scaffold(
      body: SafeArea(
        child: ders == null || ders.alistirmalar.isEmpty
            ? _Bulunamadi(onGeri: _cik)
            : _ozet != null
            ? _Ozet(ozet: _ozet!, onDon: _cik, dersAdi: ders.ad)
            : AlistirmaOturumu(
                alistirmalar: ders.alistirmalar,
                onSonuc: (i, dogru) => ref
                    .read(durumProvider.notifier)
                    .kartIsle(ders.kartKimligi(i), dogru),
                onBitti: (d, t) => _bitir(ders, d, t),
                onKapat: _kapatOnayi,
              ),
      ),
    );
  }
}

class _Bulunamadi extends StatelessWidget {
  const _Bulunamadi({required this.onGeri});
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
            Icon(Icons.error_outline, size: 48, color: r.hata),
            const SizedBox(height: Olcu.b2),
            Text(
              'Bu ders bulunamadı.',
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

class _Ozet extends StatelessWidget {
  const _Ozet({required this.ozet, required this.onDon, required this.dersAdi});
  final ({int dogru, int toplam, int xp, int seri}) ozet;
  final VoidCallback onDon;
  final String dersAdi;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final tam = ozet.dogru == ozet.toplam;
    Widget satir(IconData simge, Color renk, String baslik, String deger) =>
        Padding(
          padding: const EdgeInsets.symmetric(vertical: Olcu.b1),
          child: Semantics(
            label: '$baslik: $deger',
            excludeSemantics: true,
            child: Row(
              children: [
                Icon(simge, color: renk, size: 32),
                const SizedBox(width: Olcu.b2),
                Expanded(child: Text(baslik, style: yazi.bodyLarge)),
                Text(deger, style: yazi.titleLarge),
              ],
            ),
          ),
        );
    return SayfaGovdesi(
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Spacer(),
            Icon(
              tam ? Icons.emoji_events : Icons.check_circle,
              size: 64,
              color: tam ? r.vurgu : r.dogru,
            ),
            const SizedBox(height: Olcu.b2),
            Text(
              'Ders tamamlandı',
              textAlign: TextAlign.center,
              style: yazi.headlineMedium,
            ),
            const SizedBox(height: Olcu.b1),
            Text(
              dersAdi,
              textAlign: TextAlign.center,
              style: yazi.bodyLarge?.copyWith(color: r.metinIkincil),
            ),
            const SizedBox(height: Olcu.b3),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(Olcu.b2),
                child: Column(
                  children: [
                    satir(
                      Icons.check_circle_outline,
                      r.dogru,
                      'Doğru',
                      '${ozet.dogru}/${ozet.toplam}',
                    ),
                    satir(Icons.bolt, r.vurgu, 'Kazanılan XP', '+${ozet.xp}'),
                    satir(
                      Icons.local_fire_department,
                      r.vurgu,
                      'Seri',
                      '${ozet.seri} gün',
                    ),
                  ],
                ),
              ),
            ),
            const Spacer(),
            FilledButton(onPressed: onDon, child: const Text('Yola dön')),
          ],
        ),
      ),
    );
  }
}
