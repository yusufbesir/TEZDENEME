/// Ders ve mikro ders özet ekranı: kupa/onay simgesi, doğru sayısı, XP, seri;
/// isteğe bağlı iki ek eylem düğmesi (ör. "Karışık tekrar (5 soru)" ve
/// "Kısa quiz (3 soru)"); ikisi alt alta durur. İçerik pencereye sığmazsa
/// (kısa pencere + büyük yazı) sayfa kaydırılır, taşmaz.
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
    this.ekSimge = Icons.shuffle,
    this.ek2Etiket,
    this.onEk2,
    this.ek2Simge = Icons.quiz_outlined,
    this.ek3Etiket,
    this.onEk3,
    this.ek3Simge = Icons.style_outlined,
    this.bilgi,
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
  final IconData ekSimge;

  /// İkinci isteğe bağlı ek eylem (ör. "Kısa quiz (3 soru)"); ikisi birlikte
  /// verilir. Birinciyle birlikte de tek başına da gösterilebilir.
  final String? ek2Etiket;
  final VoidCallback? onEk2;
  final IconData ek2Simge;

  /// Üçüncü isteğe bağlı ek eylem (ör. "Bu dersin öğeleri"); ikisi birlikte
  /// verilir.
  final String? ek3Etiket;
  final VoidCallback? onEk3;
  final IconData ek3Simge;

  /// İsteğe bağlı bilgi bölümü (ör. ustalık kartı); özet kartının altında.
  final Widget? bilgi;

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
      child: LayoutBuilder(
        builder: (context, kisit) => SingleChildScrollView(
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: kisit.maxHeight),
            child: IntrinsicHeight(
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
                    if (bilgi != null) ...[
                      const SizedBox(height: Olcu.b2),
                      bilgi!,
                    ],
                    const Spacer(),
                    if (ekEtiket != null && onEk != null) ...[
                      OutlinedButton.icon(
                        icon: Icon(ekSimge),
                        label: Text(ekEtiket!),
                        onPressed: onEk,
                      ),
                      const SizedBox(height: Olcu.b2),
                    ],
                    if (ek2Etiket != null && onEk2 != null) ...[
                      OutlinedButton.icon(
                        key: const Key('ozet-ek2'),
                        icon: Icon(ek2Simge),
                        label: Text(ek2Etiket!),
                        onPressed: onEk2,
                      ),
                      const SizedBox(height: Olcu.b2),
                    ],
                    if (ek3Etiket != null && onEk3 != null) ...[
                      OutlinedButton.icon(
                        key: const Key('ozet-ek3'),
                        icon: Icon(ek3Simge),
                        label: Text(ek3Etiket!),
                        onPressed: onEk3,
                      ),
                      const SizedBox(height: Olcu.b2),
                    ],
                    FilledButton(
                      onPressed: onDon,
                      child: const Text('Yola dön'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
