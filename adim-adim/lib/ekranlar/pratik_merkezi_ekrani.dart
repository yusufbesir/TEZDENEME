/// Pratik merkezi (ÖZELLİK 44): tek ekranda Hatalarım (hata defteri),
/// Zamana karşı eşleştirme, Artan zorluk turu ve Kelime kartları. Hepsi
/// çevrimdışı ve cezasızdır; etkinlikler kart aralıklarını (SRS) ve hata
/// defterini değiştirmez. Tekrar sekmesinden ve Profil'den `push` ile açılır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../motor/pratik.dart';
import '../tema/tema.dart';

class PratikMerkeziEkrani extends ConsumerWidget {
  const PratikMerkeziEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final kurslar = ref.watch(alanKurslariProvider);
    final enIyi = durum.eslestirmeEnIyiMs;
    final hataSayisi = durum.hatalar.length;
    final kelimeSayisi = Pratik.kelimeHavuzu(durum, kurslar).length;

    Widget kart({
      required Key anahtar,
      required IconData simge,
      required String baslik,
      required String ayrinti,
      required VoidCallback onTap,
    }) => Card(
      child: ListTile(
        key: anahtar,
        minVerticalPadding: Olcu.b1,
        leading: Icon(simge, color: context.renkler.ana),
        title: Text(baslik),
        subtitle: Text(ayrinti),
        trailing: const Icon(Icons.chevron_right),
        onTap: onTap,
      ),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Pratik merkezi'),
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
            padding: const EdgeInsets.all(Olcu.b2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Ceza yok, puan kaybı yok. Buradaki etkinlikler tekrar '
                  'takvimini değiştirmez.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: context.renkler.metinIkincil,
                  ),
                ),
                const SizedBox(height: Olcu.b2),
                kart(
                  anahtar: const ValueKey('pratik-hatalarim'),
                  simge: Icons.rule,
                  baslik: 'Hatalarım',
                  ayrinti: hataSayisi == 0
                      ? 'Hata defteri boş'
                      : 'Hata defterinde $hataSayisi kayıt',
                  onTap: () => context.go('/tekrar'),
                ),
                kart(
                  anahtar: const ValueKey('pratik-eslestirme'),
                  simge: Icons.timer_outlined,
                  baslik: 'Zamana karşı eşleştirme',
                  ayrinti: enIyi == null
                      ? 'Kelimelerini süreyle eşleştir'
                      : 'En iyi süre: ${Pratik.sureMetni(enIyi)}',
                  onTap: () => context.push('/pratik/eslestirme'),
                ),
                kart(
                  anahtar: const ValueKey('pratik-tur'),
                  simge: Icons.stairs_outlined,
                  baslik: 'Artan zorluk turu',
                  ayrinti: 'Kolaydan zora ${Pratik.turAdet} alıştırma',
                  onTap: () => context.push('/pratik/tur'),
                ),
                kart(
                  anahtar: const ValueKey('pratik-kartlar'),
                  simge: Icons.flip_outlined,
                  baslik: 'Kelime kartları',
                  ayrinti: kelimeSayisi == 0
                      ? 'Kartları çevirerek çalış'
                      : '$kelimeSayisi kelime hazır',
                  onTap: () => context.push('/pratik/kartlar'),
                ),
                // Yalnız dil kurslarında: sesli etkinlikler.
                if (durum.alan == 'dil') ...[
                  kart(
                    anahtar: const ValueKey('pratik-radyo'),
                    simge: Icons.radio,
                    baslik: 'Dinleme radyosu',
                    ayrinti: 'Kısa sesli bölümler: dinle, eşleştir, sırala',
                    onTap: () => context.push('/radyo'),
                  ),
                  kart(
                    anahtar: const ValueKey('pratik-eller-serbest'),
                    simge: Icons.headset_mic_outlined,
                    baslik: 'Eller serbest',
                    ayrinti: 'Ekrana bakmadan: dinle, tekrar et',
                    onTap: () => context.push('/eller-serbest'),
                  ),
                  kart(
                    anahtar: const ValueKey('pratik-senaryo'),
                    simge: Icons.forum_outlined,
                    baslik: 'Senaryolu konuşma',
                    ayrinti: 'Kısa sohbetler: seç, yaz ya da söyle',
                    onTap: () => context.push('/senaryolar'),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
