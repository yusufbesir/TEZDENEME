/// "Başlamadan önce" ekranı: ara sınav, seviye sertifika sınavı ve efsanevi
/// tekrar başlamadan önce soru sayısını, süre/kuralı, geçme koşulunu ve
/// kazanılacak şeyi kısaca anlatır; "Başla" ve "Vazgeç" düğmeleri vardır.
/// Saf sunum bileşenidir (durum değiştirmez); sınav verisi çağıran ekrandan
/// gelir. Çevrimdışı, ödül/reklam yok.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';

import '../tema/tema.dart';
import 'sayfa_govdesi.dart';

/// Açıklama ekranındaki tek satır (simge + başlık + metin).
class SinavOncesiSatiri {
  const SinavOncesiSatiri({
    required this.simge,
    required this.baslik,
    required this.metin,
  });
  final IconData simge;
  final String baslik;
  final String metin;
}

class SinavOncesiEkrani extends StatelessWidget {
  const SinavOncesiEkrani({
    super.key,
    required this.baslik,
    required this.altBaslik,
    required this.simge,
    required this.soruSayisi,
    required this.sureKurali,
    required this.gecmeKosulu,
    required this.kazanc,
    required this.onBasla,
    required this.onVazgec,
  });

  /// Örn. "Ara sınav: Selamlaşma".
  final String baslik;

  /// Örn. kurs adı.
  final String altBaslik;
  final IconData simge;
  final int soruSayisi;

  /// Süre/kural metni ("Süre sınırı yok", "Toplam 2:30, ipucu yok" ...).
  final String sureKurali;
  final String gecmeKosulu;
  final String kazanc;
  final VoidCallback onBasla;
  final VoidCallback onVazgec;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final satirlar = [
      SinavOncesiSatiri(
        simge: Icons.format_list_numbered,
        baslik: 'Soru sayısı',
        metin: '$soruSayisi soru',
      ),
      SinavOncesiSatiri(
        simge: Icons.timer_outlined,
        baslik: 'Süre ve kurallar',
        metin: sureKurali,
      ),
      SinavOncesiSatiri(
        simge: Icons.flag_outlined,
        baslik: 'Geçme koşulu',
        metin: gecmeKosulu,
      ),
      SinavOncesiSatiri(
        simge: Icons.emoji_events_outlined,
        baslik: 'Ne kazanırsın',
        metin: kazanc,
      ),
    ];
    return SayfaGovdesi(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Icon(simge, size: 56, color: r.ana),
            const SizedBox(height: Olcu.b2),
            Text(
              'Başlamadan önce',
              key: const ValueKey('sinav-oncesi-baslik'),
              textAlign: TextAlign.center,
              style: yazi.headlineMedium,
            ),
            const SizedBox(height: Olcu.b1),
            Text(
              '$baslik · $altBaslik',
              textAlign: TextAlign.center,
              style: yazi.bodyLarge?.copyWith(color: r.metinIkincil),
            ),
            const SizedBox(height: Olcu.b3),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(Olcu.b2),
                child: Column(
                  children: [
                    for (final s in satirlar)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: Olcu.b1),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(s.simge, color: r.ana),
                            const SizedBox(width: Olcu.b2),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(s.baslik, style: yazi.titleSmall),
                                  Text(s.metin, style: yazi.bodyLarge),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: Olcu.b3),
            FilledButton(
              key: const ValueKey('sinav-basla'),
              style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: onBasla,
              child: const Text('Başla'),
            ),
            const SizedBox(height: Olcu.b2),
            OutlinedButton(
              key: const ValueKey('sinav-vazgec'),
              style: OutlinedButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: onVazgec,
              child: const Text('Vazgeç'),
            ),
          ],
        ),
      ),
    );
  }
}
