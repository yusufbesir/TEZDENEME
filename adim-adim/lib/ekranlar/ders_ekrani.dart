/// Ders ekranı: alıştırmalar -> özet (doğru sayısı, XP, seri). Ünitenin son
/// dersinde özetin altında "Karışık tekrar (5 soru)" önerisi çıkar
/// (önceki ünitelerden serpiştirilmiş 5 alıştırma; XP mikro ders gibi).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/alistirma_oturumu.dart';
import '../bilesenler/ders_ozeti.dart';
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

  /// Bu ders ünitesinin son dersiyse ve önceki ünite alıştırması varsa true.
  bool _karisikVar(Ders ders) =>
      Motor.serpistirmeSec(ref.read(kurslarProvider), ders.id).isNotEmpty;

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
            ? DersOzeti(
                baslik: 'Ders tamamlandı',
                altBaslik: ders.ad,
                dogru: _ozet!.dogru,
                toplam: _ozet!.toplam,
                xp: _ozet!.xp,
                seri: _ozet!.seri,
                onDon: _cik,
                ekEtiket: _karisikVar(ders) ? 'Karışık tekrar (5 soru)' : null,
                onEk: _karisikVar(ders)
                    ? () => context.push(
                        '/mikro?mod=karisik&ders=${Uri.encodeComponent(ders.id)}',
                      )
                    : null,
              )
            : AlistirmaOturumu(
                alistirmalar: ders.alistirmalar,
                // Kişisel kelime notu: cevaptan sonra bantta gösterilir.
                notGetir: (i) => ref
                    .read(durumProvider)
                    .value
                    ?.kelimeNotlari[ders.kartKimligi(i)],
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
