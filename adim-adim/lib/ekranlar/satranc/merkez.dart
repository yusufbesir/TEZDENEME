/// Satranç merkezi (ÖZELLİK 47, 52-57): satranç modülünün giriş ekranı.
/// Günlük bulmaca, mini maç, serbest tahta, tema bulmacaları, yanlışlarım
/// (tekrar destesi), oyun sonu antrenörü, tahta görme, kendi analizin, Solo
/// ve ustalık kursu. Hepsi çevrimdışıdır; lig, topluluk ya da çevrim içi
/// rakip yoktur. Oyunlar alanının Yol sayfasındaki "Satranç merkezi"
/// düğmesinden `push` ile açılır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../bilesenler/sayfa_govdesi.dart';
import '../../durum/saglayicilar.dart';
import '../../model/durum.dart';
import '../../model/satranc_durumu.dart';
import '../../motor/satranc_calisma.dart';
import '../../satranc/veri.dart';
import '../../tema/tema.dart';
import 'ortak.dart';

class SatrancMerkeziEkrani extends ConsumerWidget {
  const SatrancMerkeziEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final bugun = ref.watch(bugunProvider);
    final kurslar = ref.watch(kurslarProvider);
    final s = durum.satranc;
    final gunluk = SatrancCalisma.gunlukSonuc(durum, bugun);
    final cozulen = s.cozulenBulmacalar.length;
    final bekleyen = SatrancCalisma.bekleyenBulmacalar(durum, bugun).length;
    final ustalik = SatrancCalisma.ustalikDersleri(durum, kurslar, bugun);

    Widget kart(
      String anahtar,
      IconData simge,
      String baslik,
      String ayrinti,
      String yol,
    ) => satrancKart(
      context,
      anahtar: ValueKey(anahtar),
      simge: simge,
      baslik: baslik,
      ayrinti: ayrinti,
      onTap: () => context.push(yol),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Satranç merkezi'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/yol'),
        ),
      ),
      body: SafeArea(
        child: SayfaGovdesi(
          child: ListView(
            padding: const EdgeInsets.all(Olcu.b2),
            children: [
              Text(
                'Çevrimdışı çalışma alanı: rakip, lig ya da derece yok. '
                'Buradaki etkinlikler ders kartlarının tekrar takvimini '
                'değiştirmez.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: context.renkler.metinIkincil,
                ),
              ),
              satrancBolum(context, 'Bugün'),
              kart(
                'satranc-gunluk',
                Icons.today_outlined,
                'Günlük bulmaca',
                gunluk == null
                    ? 'Bugünün bulmacası seni bekliyor'
                    : gunluk
                    ? 'Bugün ilk denemede çözdün'
                    : 'Bugün bir deneme yaptın; tekrar destende',
                '/satranc/gunluk',
              ),
              kart(
                'satranc-mac',
                Icons.sports_esports_outlined,
                'Mini maç',
                s.oynananMac == 0
                    ? 'Hazır konumdan bilgisayara karşı kısa oyun'
                    : '${s.oynananMac} oyun: ${s.macSayilari[SatrancMaci.kazandi] ?? 0} kazandın',
                '/satranc/mac',
              ),
              kart(
                'satranc-serbest',
                Icons.grid_on_outlined,
                'Serbest tahta',
                'İki tarafı da sen oyna, konum yükle',
                '/satranc/serbest',
              ),
              if (s.sonMac != null)
                kart(
                  'satranc-incele',
                  Icons.manage_search,
                  'Oyun incelemesi',
                  'Son mini maçının hamle listesi ve değerlendirmesi',
                  '/satranc/inceleme',
                ),
              satrancBolum(context, 'Bulmacalar'),
              kart(
                'satranc-tema',
                Icons.extension_outlined,
                'Tema bulmacaları',
                '$cozulen/${SatrancVeri.bulmacalar.length} çözüldü: çatal, şiş, açmaz, mat...',
                '/satranc/tema',
              ),
              kart(
                'satranc-yanlis',
                Icons.rule,
                'Yanlışlarım',
                bekleyen > 0
                    ? '$bekleyen bulmaca tekrarını bekliyor'
                    : SatrancCalisma.desteBulmacaSayisi(durum) == 0
                    ? 'İlk denemede yanlış çözdüklerin burada tekrar edilir'
                    : 'Bugün tekrar yok',
                '/satranc/yanlislar',
              ),
              kart(
                'satranc-solo',
                Icons.filter_1_outlined,
                'Solo bulmaca',
                '${s.soloCozulen.length}/${SatrancVeri.soloBulmacalar.length} çözüldü: her hamlede bir taş al',
                '/satranc/solo',
              ),
              kart(
                'satranc-analiz',
                Icons.psychology_alt_outlined,
                'Kendi analizin',
                'Önce kendin çöz, sonra yazılı çözümle karşılaştır',
                '/satranc/analiz',
              ),
              satrancBolum(context, 'Antrenman'),
              kart(
                'satranc-oyunsonu',
                Icons.flag_outlined,
                'Oyun sonu antrenörü',
                'Pratik ve en az hamlede mat meydan okuması',
                '/satranc/oyunsonu',
              ),
              kart(
                'satranc-koordinat',
                Icons.visibility_outlined,
                'Tahta görme',
                s.koordinatEnIyi.isEmpty
                    ? '30 saniyede kareleri bil'
                    : 'En iyi: ${s.koordinatEnIyi.values.reduce((a, b) => a > b ? a : b)}',
                '/satranc/koordinat',
              ),
              kart(
                'satranc-ustalik',
                Icons.workspace_premium_outlined,
                'Ustalık kursu',
                ustalik.isEmpty
                    ? 'Bitirdiğin dersler aralıklı tekrar edilir'
                    : '${ustalik.length} ders tekrarını bekliyor',
                '/satranc/ustalik',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
