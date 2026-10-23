/// Ortak "Oturum özeti" bileşeni: ders, mikro ders ve hızlı tekrar sonuç
/// ekranlarının altında doğru oranını, kazanılan XP'yi, bu oturumda yeni
/// kazanılan rozetleri, seri durumunu ve kısa bir kutlamayı (yıldızlar)
/// gösterir; 7./30. gün seri ve ilk ünite bitirme için ek kutlama kartı çıkar.
/// Animasyon basit ve ≤250 ms'dir; sistem animasyonları kapalıysa
/// (`Olcu.sure` = 0) statik görünür. Çevrimdışı, rastgele ödül/reklam yok.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';

import '../motor/oturum_ozeti.dart';
import '../tema/tema.dart';

class OturumOzeti extends StatelessWidget {
  const OturumOzeti({super.key, required this.veri});
  final OturumOzetiVeri veri;

  static IconData _rozetSimgesi(String anahtar) => switch (anahtar) {
    'seri' => Icons.local_fire_department,
    'ders' => Icons.menu_book,
    'xp' => Icons.bolt,
    'tekrar' => Icons.repeat,
    'yarisma' => Icons.emoji_events,
    'kurs' => Icons.school,
    'sertifika' => Icons.workspace_premium,
    'bilmece' => Icons.extension,
    'hikaye' => Icons.auto_stories,
    'hedef' => Icons.flag,
    'altin' => Icons.military_tech,
    _ => Icons.star,
  };

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final sure = Olcu.sure(context, 250);
    final seriMetni = veri.seri <= 0
        ? 'Seri durumu: henüz seri yok'
        : veri.seriArtti
        ? 'Seri durumu: ${veri.seri} gün (bugün +1)'
        : 'Seri durumu: ${veri.seri} gün (bugün zaten sayıldı)';

    Widget yildizlar() => Semantics(
      label: 'Yıldız: ${veri.yildiz}/3',
      excludeSemantics: true,
      child: Row(
        key: const ValueKey('oturum-yildizlar'),
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          for (var i = 0; i < 3; i++)
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              // Yıldızlar sırayla belirir; her biri en çok 250 ms.
              duration: sure == Duration.zero
                  ? Duration.zero
                  : Duration(milliseconds: 120 + i * 45),
              curve: Curves.easeOutBack,
              builder: (context, olcek, child) =>
                  Transform.scale(scale: olcek.clamp(0.0, 1.2), child: child),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: Olcu.b1 / 2),
                child: Icon(
                  i < veri.yildiz ? Icons.star : Icons.star_border,
                  size: 36,
                  color: i < veri.yildiz ? r.vurgu : r.metinIkincil,
                ),
              ),
            ),
        ],
      ),
    );

    return Column(
      key: const ValueKey('oturum-ozeti'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final k in veri.kilometreler) ...[
          Card(
            key: ValueKey('kilometre-${k.id}'),
            color: r.yuzey,
            child: Padding(
              padding: const EdgeInsets.all(Olcu.b2),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.celebration, color: r.vurgu, size: 32),
                  const SizedBox(width: Olcu.b2),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(k.baslik, style: yazi.titleMedium),
                        const SizedBox(height: Olcu.b1 / 2),
                        Text(k.aciklama, style: yazi.bodyMedium),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: Olcu.b1),
        ],
        Card(
          child: Padding(
            padding: const EdgeInsets.all(Olcu.b2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Oturum özeti',
                  style: yazi.titleMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: Olcu.b1),
                yildizlar(),
                const SizedBox(height: Olcu.b1),
                Text(
                  'Doğruluk: %${veri.yuzde} (${veri.dogru}/${veri.toplam})',
                  key: const ValueKey('oturum-oran'),
                  style: yazi.bodyLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: Olcu.b1 / 2),
                Text(
                  'XP: +${veri.xp}',
                  key: const ValueKey('oturum-xp'),
                  style: yazi.bodyLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: Olcu.b1 / 2),
                Text(
                  seriMetni,
                  key: const ValueKey('oturum-seri'),
                  style: yazi.bodyLarge,
                  textAlign: TextAlign.center,
                ),
                if (veri.yeniKelime > 0) ...[
                  const SizedBox(height: Olcu.b1 / 2),
                  Text(
                    '${veri.yeniKelime} yeni kelime',
                    key: const ValueKey('oturum-yeni-kelime'),
                    style: yazi.bodyLarge,
                    textAlign: TextAlign.center,
                  ),
                ],
                const SizedBox(height: Olcu.b1),
                if (veri.yeniRozetler.isEmpty)
                  Text(
                    'Bu oturumda yeni rozet yok.',
                    key: const ValueKey('oturum-rozet-yok'),
                    style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                    textAlign: TextAlign.center,
                  )
                else ...[
                  Text(
                    'Yeni rozet',
                    style: yazi.titleSmall,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: Olcu.b1 / 2),
                  for (final b in veri.yeniRozetler)
                    Semantics(
                      label: 'Yeni rozet: ${b.ad}. ${b.aciklama}',
                      excludeSemantics: true,
                      child: Padding(
                        key: ValueKey('oturum-rozet-${b.id}'),
                        padding: const EdgeInsets.symmetric(
                          vertical: Olcu.b1 / 2,
                        ),
                        child: Row(
                          children: [
                            Icon(_rozetSimgesi(b.simge), color: r.vurgu),
                            const SizedBox(width: Olcu.b1),
                            Expanded(
                              child: Text(
                                '${b.ad}: ${b.aciklama}',
                                style: yazi.bodyMedium,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }
}
