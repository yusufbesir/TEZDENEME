/// Ders ve mikro ders özet ekranı: kupa/onay simgesi, doğru sayısı, XP, seri;
/// isteğe bağlı ek eylem düğmesi (ör. "Karışık tekrar (5 soru)").
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Animasyonlar (docs/SADE-ARAYUZ-VE-YARISMA.md bölüm 6): simge 0→1 ölçek,
/// XP sayacı 0'dan değere sayar; hepsi `Olcu.sure` ile ≤250 ms, hareketi
/// azalt açıksa 0.
library;

import 'package:flutter/material.dart';

import '../tema/tema.dart';
import 'sayfa_govdesi.dart';

class DersOzeti extends StatelessWidget {
  const DersOzeti({
    super.key,
    required this.baslik,
    this.altBaslik,
    required this.dogru,
    required this.toplam,
    required this.xp,
    required this.seri,
    required this.onDon,
    this.ekEtiket,
    this.onEk,
  });

  final String baslik;
  final String? altBaslik;
  final int dogru;
  final int toplam;
  final int xp;
  final int seri;
  final VoidCallback onDon;

  /// İsteğe bağlı ek eylem (ör. "Karışık tekrar (5 soru)"); ikisi birlikte verilir.
  final String? ekEtiket;
  final VoidCallback? onEk;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final tam = dogru == toplam;
    final sure = Olcu.sure(context, 250);

    Widget satir(IconData simge, Color renk, String etiket, Widget deger) =>
        Padding(
          padding: const EdgeInsets.symmetric(vertical: Olcu.b1),
          child: Row(
            children: [
              Icon(simge, color: renk, size: 32),
              const SizedBox(width: Olcu.b2),
              Expanded(child: Text(etiket, style: yazi.bodyLarge)),
              deger,
            ],
          ),
        );

    return SayfaGovdesi(
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Spacer(),
            Center(
              child: TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: 1),
                duration: sure,
                curve: Curves.easeOutBack,
                builder: (context, olcek, child) =>
                    Transform.scale(scale: olcek, child: child),
                child: Icon(
                  tam ? Icons.emoji_events : Icons.check_circle,
                  size: 64,
                  color: tam ? r.vurgu : r.dogru,
                ),
              ),
            ),
            const SizedBox(height: Olcu.b2),
            Text(
              baslik,
              textAlign: TextAlign.center,
              style: yazi.headlineMedium,
            ),
            if (altBaslik != null) ...[
              const SizedBox(height: Olcu.b1),
              Text(
                altBaslik!,
                textAlign: TextAlign.center,
                style: yazi.bodyLarge?.copyWith(color: r.metinIkincil),
              ),
            ],
            const SizedBox(height: Olcu.b3),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(Olcu.b2),
                child: Column(
                  children: [
                    Semantics(
                      label: 'Doğru: $dogru/$toplam',
                      excludeSemantics: true,
                      child: satir(
                        Icons.check_circle_outline,
                        r.dogru,
                        'Doğru',
                        Text('$dogru/$toplam', style: yazi.titleLarge),
                      ),
                    ),
                    Semantics(
                      label: 'Kazanılan XP: +$xp',
                      excludeSemantics: true,
                      child: satir(
                        Icons.bolt,
                        r.vurgu,
                        'Kazanılan XP',
                        TweenAnimationBuilder<int>(
                          tween: IntTween(begin: 0, end: xp),
                          duration: sure,
                          builder: (context, v, _) =>
                              Text('+$v', style: yazi.titleLarge),
                        ),
                      ),
                    ),
                    Semantics(
                      label: 'Seri: $seri gün',
                      excludeSemantics: true,
                      child: satir(
                        Icons.local_fire_department,
                        r.vurgu,
                        'Seri',
                        Text('$seri gün', style: yazi.titleLarge),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const Spacer(),
            if (ekEtiket != null && onEk != null) ...[
              OutlinedButton.icon(
                icon: const Icon(Icons.shuffle),
                label: Text(ekEtiket!),
                onPressed: onEk,
              ),
              const SizedBox(height: Olcu.b2),
            ],
            FilledButton(onPressed: onDon, child: const Text('Yola dön')),
          ],
        ),
      ),
    );
  }
}
