/// Pratik sekmesi (ÖZELLİK 44): ortak üst çubuk, Günlük karışım, Hızlı tekrar
/// (60 sn zamanlı), Tekrar (zamanı gelen kartlar) kartı, Kelimelerim, Hatalarım (hata defteri), Zamana karşı eşleştirme, Artan zorluk
/// turu ve Kelime kartları gibi etkinlikler. Hepsi çevrimdışı ve cezasızdır;
/// etkinlikler kart aralıklarını (SRS) ve hata defterini değiştirmez. Tekrar
/// ekranına (`/tekrar`, kabuk dışı) bu sekmeden `push` ile girilir; Tekrar
/// sekmesindeki bekleyen kart rozeti artık Pratik sekmesindedir.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/maskot_karti.dart';
import '../bilesenler/sayfa_govdesi.dart';
import '../bilesenler/ust_cubuk.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../motor/pratik.dart';
import '../motor/pratik_oturumlari.dart';
import '../motor/sure.dart';
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

    final bekleyen = ref.watch(bekleyenTekrarProvider);
    final yazi = Theme.of(context).textTheme;

    return SafeArea(
      child: SayfaGovdesi(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(Olcu.b2),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const UstCubuk(),
              const SizedBox(height: Olcu.b2),
              Semantics(
                header: true,
                child: Text('Pratik merkezi', style: yazi.headlineMedium),
              ),
              const SizedBox(height: Olcu.b1),
              Text(
                'Ceza yok, puan kaybı yok. Buradaki etkinlikler tekrar '
                'takvimini değiştirmez.',
                style: yazi.bodyMedium?.copyWith(
                  color: context.renkler.metinIkincil,
                ),
              ),
              const SizedBox(height: Olcu.b2),
              MaskotKarti(durum: durum, bugun: ref.watch(bugunProvider)),
              kart(
                anahtar: const ValueKey('pratik-karisim'),
                simge: Icons.shuffle,
                baslik: 'Günlük karışım',
                ayrinti:
                    'Tek dokunuşla ${GunlukKarisim.adet} kart: zayıf, '
                    'zamanı gelen ve yeni',
                onTap: () => context.push('/mikro?mod=karisim'),
              ),
              kart(
                anahtar: const ValueKey('pratik-hizli'),
                simge: Icons.bolt,
                baslik: 'Hızlı tekrar',
                ayrinti: '${HizliTekrar.sureSn} saniyede en çok kartı cevapla',
                onTap: () => context.push('/pratik/hizli'),
              ),
              kart(
                anahtar: const ValueKey('pratik-tekrar'),
                simge: Icons.replay,
                baslik: 'Tekrar',
                ayrinti: bekleyen == 0
                    ? 'Bugün bekleyen kart yok'
                    : '$bekleyen kart seni bekliyor',
                onTap: () => context.push('/tekrar'),
              ),
              kart(
                anahtar: const ValueKey('pratik-kelimelerim'),
                simge: Icons.library_books_outlined,
                baslik: 'Kelimelerim',
                ayrinti: kelimeSayisi == 0
                    ? 'Yeni, zayıf, orta ve güçlü kelimeler'
                    : '$kelimeSayisi kelime · güç kovalarına göre',
                onTap: () => context.push('/kelimelerim'),
              ),
              kart(
                anahtar: const ValueKey('pratik-hatalarim'),
                simge: Icons.rule,
                baslik: 'Hatalarım',
                ayrinti: hataSayisi == 0
                    ? 'Hata defteri boş'
                    : 'Hata defterinde $hataSayisi kayıt',
                onTap: () => context.push('/tekrar'),
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
                anahtar: const ValueKey('pratik-sureli'),
                simge: Icons.hourglass_bottom,
                baslik: 'Süreli kelime oturumu',
                ayrinti:
                    '5, 10 ya da 15 dk · ${Sure.bugunMetni(durum, ref.watch(bugunProvider))}',
                onTap: () => context.push('/sure'),
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
              kart(
                anahtar: const ValueKey('pratik-halat'),
                simge: Icons.sports_kabaddi_outlined,
                baslik: 'Halat çekme',
                ayrinti: 'Bilgisayara karşı bilgi yarışı, çevrimdışı',
                onTap: () => context.push('/halat'),
              ),
              kart(
                anahtar: const ValueKey('pratik-hafiza'),
                simge: Icons.psychology_outlined,
                baslik: 'Hafıza puanı ve çalışma modları',
                ayrinti: 'Ünite başına puan; kart, yazma, eşleştirme, test',
                onTap: () => context.push('/calisma-modlari'),
              ),
              // Yalnız dil kurslarında: sesli etkinlikler.
              if (durum.alan == 'dil') ...[
                kart(
                  anahtar: const ValueKey('pratik-gorsel'),
                  simge: Icons.image_outlined,
                  baslik: 'Görsel kelimeler',
                  ayrinti: 'Simgeli kartlar, konu oyunları',
                  onTap: () => context.push('/gorsel'),
                ),
                kart(
                  anahtar: const ValueKey('pratik-radyo'),
                  simge: Icons.radio,
                  baslik: 'Dinleme radyosu',
                  ayrinti: 'Kısa sesli bölümler: dinle, eşleştir, sırala',
                  onTap: () => context.push('/radyo'),
                ),
                kart(
                  anahtar: const ValueKey('pratik-oynatici'),
                  simge: Icons.queue_music_outlined,
                  baslik: 'Kelime defteri oynatıcı',
                  ayrinti: 'Kelimeleri sırayla sesli çalar',
                  onTap: () => context.push('/kelime-oynatici'),
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
    );
  }
}
