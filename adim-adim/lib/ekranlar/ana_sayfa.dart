/// Yol sekmesi: alan şeridi (alan adı, seri, hedef halkası), "2 dakikalık
/// ders" düğmesi, "Kaldığın yerden devam" kartı (DevamKarti), dil alanında küçük "Günün kelimesi" kartı (kelime, anlam,
/// ses, "Kartlara ekle"; kaydırılabilir alanda), her alanda hemen altında
/// "Günün bilmecesi" kartı (BilmeceKarti), dil alanında hemen altında
/// "Okuma hikâyeleri" kartı (HikayeKarti) ve alan kurslarının tek
/// doğrusal basamak yolu. Seri göstergesinin altında "Bu hafta 3/5 gün"
/// haftalık hedef satırı bulunur.
/// Yerleşim kullanılabilir genişliğe göre seçilir (LayoutBuilder): yan panel
/// (Öğrenci kartı + günlük hedef) yalnız panele en az Olcu.panelMin kalıyorsa
/// ve pencere geniş (>= 900) ise yanda durur; yoksa tek sütundur.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/basamak.dart';
import '../bilesenler/bilmece_karti.dart';
import '../bilesenler/calisma_plani_karti.dart';
import '../bilesenler/devam_karti.dart';
import '../bilesenler/hedef_halkasi.dart';
import '../bilesenler/hikaye_karti.dart';
import '../bilesenler/profil_karti.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../model/icerik.dart';
import '../motor/ders_meta.dart';
import '../motor/motor.dart';
import '../tema/alan_renkleri.dart';
import '../tema/tema.dart';

/// Yol sekmesi: alan şeridi + tek doğrusal "basamak" yolu.
class AnaSayfa extends ConsumerWidget {
  const AnaSayfa({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final kurslar = ref.watch(alanKurslariProvider);
    final bugun = ref.watch(bugunProvider);

    if (durum.alan == null || kurslar.isEmpty) {
      return _AlanYok(alanVar: durum.alan != null);
    }

    final pencereGenis = Olcu.genis(MediaQuery.sizeOf(context).width);

    return SafeArea(
      child: LayoutBuilder(
        builder: (context, kisit) {
          // İki sütun: yol en az yolMinGenislik, panel en az panelMin kalırsa.
          final iki =
              pencereGenis &&
              kisit.maxWidth - Olcu.panelMin >= Olcu.yolMinGenislik;
          final yol = _YolListesi(
            kurslar: kurslar,
            durum: durum,
            bugun: bugun,
            seritteHalka: !iki,
          );
          if (!iki) return yol;
          final panelGenislik = (kisit.maxWidth * 0.4).clamp(
            Olcu.panelMin,
            Olcu.panelMax,
          );
          return Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: yol),
              SizedBox(
                width: panelGenislik,
                height: kisit.maxHeight,
                child: _YanPanel(durum: durum, bugun: bugun, kurslar: kurslar),
              ),
            ],
          );
        },
      ),
    );
  }
}

/// Yan panel: Öğrenci kartı + günlük hedef; görünür kaydırma çubuğu.
class _YanPanel extends StatefulWidget {
  const _YanPanel({
    required this.durum,
    required this.bugun,
    required this.kurslar,
  });
  final OgrenciDurumu durum;
  final List<Kurs> kurslar;
  final String bugun;

  @override
  State<_YanPanel> createState() => _YanPanelDurumu();
}

class _YanPanelDurumu extends State<_YanPanel> {
  final _kaydirma = ScrollController();

  @override
  void dispose() {
    _kaydirma.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scrollbar(
      controller: _kaydirma,
      thumbVisibility: true,
      child: SingleChildScrollView(
        controller: _kaydirma,
        padding: const EdgeInsets.fromLTRB(0, Olcu.b3, Olcu.b3, Olcu.b3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ProfilKarti(durum: widget.durum, bugun: widget.bugun),
            const SizedBox(height: Olcu.b2),
            _GunlukKart(durum: widget.durum, bugun: widget.bugun),
            const SizedBox(height: Olcu.b2),
            CalismaPlaniKarti(
              durum: widget.durum,
              kurslar: widget.kurslar,
              bugun: widget.bugun,
            ),
          ],
        ),
      ),
    );
  }
}

/// Alan seçilmemişse (yönlendirme gecikirse) basit boş durum.
class _AlanYok extends StatelessWidget {
  const _AlanYok({required this.alanVar});
  final bool alanVar;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b3),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              alanVar ? 'Bu alanda henüz kurs yok.' : 'Önce bir alan seç.',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: Olcu.b2),
            FilledButton(
              onPressed: () => context.go('/alan-sec'),
              child: const Text('Alan seç'),
            ),
          ],
        ),
      ),
    );
  }
}

class _GunlukKart extends StatelessWidget {
  const _GunlukKart({required this.durum, required this.bugun});
  final OgrenciDurumu durum;
  final String bugun;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b3),
        child: Row(
          children: [
            HedefHalkasi(
              xp: durum.gunlukXp[bugun] ?? 0,
              hedef: durum.gunlukHedef,
            ),
            const SizedBox(width: Olcu.b3),
            Expanded(
              child: Text(
                'Bugünkü hedefin ${durum.gunlukHedef} XP',
                style: Theme.of(context).textTheme.titleMedium,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _YolListesi extends StatelessWidget {
  const _YolListesi({
    required this.kurslar,
    required this.durum,
    required this.bugun,
    required this.seritteHalka,
  });
  final List<Kurs> kurslar;
  final OgrenciDurumu durum;
  final String bugun;

  /// Tek sütunda hedef halkası üst şeritte görünür (yan panel yoksa).
  final bool seritteHalka;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final parlaklik = Theme.of(context).brightness;
    final alanRengi = AlanRenkleri.renk(durum.alan, parlaklik);
    final bugunXp = durum.gunlukXp[bugun] ?? 0;
    final seri = Motor.gosterilenSeri(durum, bugun);
    final alistirmaVar = kurslar.any(
      (k) => k.tumDersler.any((d) => d.alistirmalar.isNotEmpty),
    );

    // Sıradaki ders: alan kurslarında ilk tamamlanmamış ders.
    String? siradakiId;
    for (final k in kurslar) {
      for (final d in k.tumDersler) {
        if (!Motor.dersBitmis(durum, d.id)) {
          siradakiId = d.id;
          break;
        }
      }
      if (siradakiId != null) break;
    }

    final ogeler = <Widget>[
      // Üst şerit: alan simgesi + adı, seri alevi, küçük hedef halkası.
      Row(
        children: [
          Icon(AlanRenkleri.simge(durum.alan), color: alanRengi),
          const SizedBox(width: Olcu.b1),
          Expanded(
            child: Semantics(
              header: true,
              child: Text(
                AlanRenkleri.ad(durum.alan),
                style: yazi.titleLarge?.copyWith(color: alanRengi),
              ),
            ),
          ),
          _SeriAlevi(
            seri: seri,
            nabiz: durum.sonGun == bugun && seri > 0,
            renk: r.vurgu,
          ),
          // Sözlük girişi: ana sayfanın ayrı bir AppBar'ı olmadığı için üst
          // şeritte durur; kabuk dışı '/sozluk' rotasına gider.
          IconButton(
            icon: const Icon(Icons.menu_book_outlined),
            tooltip: 'Sözlük',
            onPressed: () => context.push('/sozluk'),
          ),
          if (seritteHalka) ...[
            const SizedBox(width: Olcu.b2),
            HedefHalkasi(xp: bugunXp, hedef: durum.gunlukHedef, boyut: 56),
          ],
        ],
      ),
      Align(
        alignment: Alignment.centerRight,
        child: Semantics(
          label:
              'Bu hafta ${Motor.haftaGunSayisi(durum, bugun)} / ${durum.haftalikHedefGun} gün',
          excludeSemantics: true,
          child: Text(
            'Bu hafta ${Motor.haftaGunSayisi(durum, bugun)}/${durum.haftalikHedefGun} gün',
            style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
          ),
        ),
      ),
      const SizedBox(height: Olcu.b2),
      ConstrainedBox(
        constraints: const BoxConstraints(minHeight: Olcu.hedef),
        child: OutlinedButton.icon(
          icon: const Icon(Icons.timer_outlined),
          label: const Text('2 dakikalık ders'),
          onPressed: alistirmaVar ? () => context.push('/mikro') : null,
        ),
      ),
      const SizedBox(height: Olcu.b3),
      // Kaldığın yerden devam: Günün kelimesinin üstünde; gösterilecek ders
      // yoksa kendisi boş çizer.
      if (DevamKarti.hedefSec(durum, kurslar) != null) ...[
        DevamKarti(durum: durum, kurslar: kurslar),
        const SizedBox(height: Olcu.b3),
      ],
      // Günün kelimesi yalnız dil alanında; kaydırılabilir listenin içinde
      // durur, böylece dar/kısa pencerede yol taşmaz.
      if (durum.alan == 'dil') ...[
        GununKelimesiKarti(bugun: bugun),
        const SizedBox(height: Olcu.b3),
      ],
      // Günün bilmecesi her alanda; Secim alıştırması yoksa kendisi boş çizer.
      if (Motor.bilmeceSec(kurslar, bugun) != null) ...[
        BilmeceKarti(durum: durum, kurslar: kurslar, bugun: bugun),
        const SizedBox(height: Olcu.b3),
      ],
      // Okuma hikâyeleri yalnız dil alanında, bilmecenin altında; aktif
      // kurslarda hikâye yoksa kendisi boş çizer.
      if (durum.alan == 'dil' && HikayeKarti.grupla(kurslar).isNotEmpty) ...[
        HikayeKarti(durum: durum, kurslar: kurslar),
        const SizedBox(height: Olcu.b3),
      ],
      // Çalışma planı: yan panel yoksa (tek sütun) hikâye/örnek kartlarının arasında; yan
      // panel varsa orada durur.
      if (seritteHalka) ...[
        CalismaPlaniKarti(durum: durum, kurslar: kurslar, bugun: bugun),
        const SizedBox(height: Olcu.b3),
      ],
      // Örnek programlar kütüphanesi yalnız kod alanında.
      if (durum.alan == 'kod') ...[
        const _OrnekProgramlarKarti(),
        const SizedBox(height: Olcu.b3),
      ],
    ];

    var dersNo = 0;
    for (final kurs in kurslar) {
      final tumu = kurs.tumDersler.toList();
      final kursBiten = tumu.where((d) => Motor.dersBitmis(durum, d.id)).length;
      // Sahanlık bandı: kurs adı, alan renginde 3 px alt çizgi, biten/toplam.
      ogeler.add(
        Semantics(
          header: true,
          label: '${kurs.ad}. $kursBiten / ${tumu.length} ders tamam.',
          excludeSemantics: true,
          child: Container(
            padding: const EdgeInsets.symmetric(
              horizontal: Olcu.b2,
              vertical: Olcu.b1,
            ),
            decoration: BoxDecoration(
              border: Border(bottom: BorderSide(color: alanRengi, width: 3)),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    kurs.ad,
                    style: yazi.titleLarge?.copyWith(color: alanRengi),
                  ),
                ),
                Text(
                  '$kursBiten/${tumu.length}',
                  style: yazi.labelLarge?.copyWith(color: r.metinIkincil),
                ),
              ],
            ),
          ),
        ),
      );
      ogeler.add(const SizedBox(height: Olcu.b2));
      if (Motor.yerlestirmeSec(durum, kurs).isNotEmpty) {
        ogeler.add(
          Align(
            alignment: Alignment.centerLeft,
            child: OutlinedButton.icon(
              key: ValueKey('yerlestirme-${kurs.id}'),
              style: OutlinedButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: () => context.push(
                '/yerlestirme?kurs=${Uri.encodeComponent(kurs.id)}',
              ),
              icon: const Icon(Icons.fast_forward),
              label: const Text('Seviyemi belirle'),
            ),
          ),
        );
        ogeler.add(const SizedBox(height: Olcu.b2));
      }
      for (var ui = 0; ui < kurs.uniteler.length; ui++) {
        final unite = kurs.uniteler[ui];
        final biten = unite.dersler
            .where((d) => Motor.dersBitmis(durum, d.id))
            .length;
        ogeler.add(
          Semantics(
            header: true,
            label: '${unite.ad}. $biten / ${unite.dersler.length} ders tamam.',
            excludeSemantics: true,
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: Olcu.b2,
                vertical: Olcu.b1,
              ),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: r.ana, width: 3)),
              ),
              child: Row(
                children: [
                  Icon(Icons.flag, color: r.ana),
                  const SizedBox(width: Olcu.b1),
                  Expanded(child: Text(unite.ad, style: yazi.titleMedium)),
                  Text(
                    '$biten/${unite.dersler.length}',
                    style: yazi.labelLarge?.copyWith(color: r.metinIkincil),
                  ),
                ],
              ),
            ),
          ),
        );
        ogeler.add(const SizedBox(height: Olcu.b2));
        for (var i = 0; i < unite.dersler.length; i++) {
          final ders = unite.dersler[i];
          dersNo++;
          final kez = durum.tamamlanan[ders.id] ?? 0;
          final BasamakDurumu bd = Motor.dersBitmis(durum, ders.id)
              ? BasamakDurumu.tamam
              : (ders.id == siradakiId
                    ? BasamakDurumu.siradaki
                    : BasamakDurumu.kilitli);
          ogeler.add(
            Padding(
              padding: EdgeInsets.only(
                left: (i % 3) * Olcu.b2,
                bottom: Olcu.b2,
              ),
              child: Basamak(
                no: dersNo,
                ad: ders.ad,
                durum: bd,
                alistirmaSayisi: ders.alistirmalar.length,
                tekrarSayisi: kez,
                tahminiDakika: DersMeta.dersDakika(ders),
                temel: DersMeta.dersTemelMi(ders),
                onTap: bd == BasamakDurumu.kilitli
                    ? () => ScaffoldMessenger.of(context)
                        ..hideCurrentSnackBar()
                        ..showSnackBar(
                          const SnackBar(
                            content: Row(
                              children: [
                                Icon(Icons.lock_outline),
                                SizedBox(width: Olcu.b1),
                                Expanded(
                                  child: Text(
                                    'Bu dersi açmak için önce önceki dersi bitir.',
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                    : () =>
                          context.push('/ders/${Uri.encodeComponent(ders.id)}'),
              ),
            ),
          );
        }
        final sinavAcik = Motor.araSinavAcik(durum, kurs, ui);
        final ozetAcik =
            Motor.uniteBitmis(durum, unite) && !Motor.uniteOzeti(kurs, ui).bos;
        if (sinavAcik || ozetAcik) {
          final sonuc = durum.araSinavlar[unite.id];
          ogeler.add(
            Align(
              alignment: Alignment.centerLeft,
              child: Wrap(
                spacing: Olcu.b1,
                runSpacing: Olcu.b1,
                children: [
                  if (sinavAcik)
                    OutlinedButton.icon(
                      key: ValueKey('ara-sinav-${unite.id}'),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(48, 48),
                      ),
                      onPressed: () => context.push(
                        '/sinav?kurs=${Uri.encodeComponent(kurs.id)}&unite=$ui',
                      ),
                      icon: Icon(
                        Motor.araSinavGecildi(durum, unite)
                            ? Icons.check_circle
                            : Icons.quiz_outlined,
                      ),
                      label: Text(
                        sonuc == null
                            ? 'Ara sınav'
                            : 'Ara sınav (en iyi %${sonuc.yuzde})',
                      ),
                    ),
                  if (ozetAcik)
                    OutlinedButton.icon(
                      key: ValueKey('unite-ozeti-${unite.id}'),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(48, 48),
                      ),
                      onPressed: () => context.push(
                        '/unite-ozeti?kurs=${Uri.encodeComponent(kurs.id)}&unite=$ui',
                      ),
                      icon: const Icon(Icons.summarize_outlined),
                      label: const Text('Ünite özeti'),
                    ),
                ],
              ),
            ),
          );
        }
        ogeler.add(const SizedBox(height: Olcu.b2));
      }
      if (Motor.sertifikaSinaviAcik(durum, kurs)) {
        ogeler.add(
          Align(
            alignment: Alignment.centerLeft,
            child: Wrap(
              spacing: Olcu.b1,
              runSpacing: Olcu.b1,
              children: [
                OutlinedButton.icon(
                  key: ValueKey('sertifika-sinavi-${kurs.id}'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: () => context.push(
                    '/sinav?kurs=${Uri.encodeComponent(kurs.id)}',
                  ),
                  icon: const Icon(Icons.workspace_premium),
                  label: const Text('Seviye sertifika sınavı'),
                ),
                if (Motor.sertifikaVar(durum, kurs))
                  FilledButton.icon(
                    key: ValueKey('sertifika-gor-${kurs.id}'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(48, 48),
                    ),
                    onPressed: () => context.push(
                      '/sertifika?kurs=${Uri.encodeComponent(kurs.id)}',
                    ),
                    icon: const Icon(Icons.verified),
                    label: const Text('Sertifikayı gör'),
                  ),
              ],
            ),
          ),
        );
        ogeler.add(const SizedBox(height: Olcu.b2));
      }
    }
    if (siradakiId == null) {
      ogeler.add(
        Row(
          children: [
            Icon(Icons.emoji_events, color: r.vurgu),
            const SizedBox(width: Olcu.b1),
            Expanded(
              child: Text(
                'Bu kursun tüm derslerini bitirdin. Tebrikler!',
                style: yazi.titleMedium,
              ),
            ),
          ],
        ),
      );
    }

    return Align(
      alignment: Alignment.topCenter,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: Olcu.icerikGenislik),
        child: ListView(
          padding: const EdgeInsets.all(Olcu.b3),
          children: ogeler,
        ),
      ),
    );
  }
}

/// Seri alevi: "12" + alev simgesi. Bugün ilk ders bitmişse bir kez nabız atar
/// (1 → 1,15 → 1; en çok 250 ms, hareketi azalt açıksa 0).
class _SeriAlevi extends StatelessWidget {
  const _SeriAlevi({
    required this.seri,
    required this.nabiz,
    required this.renk,
  });
  final int seri;
  final bool nabiz;
  final Color renk;

  @override
  Widget build(BuildContext context) {
    final alev = Icon(Icons.local_fire_department, color: renk);
    return Semantics(
      label: '$seri gün seri',
      excludeSemantics: true,
      child: ConstrainedBox(
        constraints: const BoxConstraints(minHeight: Olcu.hedef),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('$seri', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(width: 4),
            if (nabiz)
              TweenAnimationBuilder<double>(
                tween: Tween(begin: 0, end: 1),
                duration: Olcu.sure(context, 250),
                builder: (context, t, child) => Transform.scale(
                  scale: 1 + 0.15 * math.sin(math.pi * t),
                  child: child,
                ),
                child: alev,
              )
            else
              alev,
          ],
        ),
      ),
    );
  }
}

/// Günün kelimesi kartı: tarihten deterministik seçilen İngilizce madde;
/// kelime, anlam, ses düğmesi ve "Kartlara ekle" (eklenmişse pasif
/// "Kartlarda"). İngilizce madde yoksa hiçbir şey çizmez.
class GununKelimesiKarti extends ConsumerWidget {
  const GununKelimesiKarti({super.key, required this.bugun});
  final String bugun;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final madde = ref.watch(sozlukProvider).gununKelimesi(bugun);
    if (madde == null) return const SizedBox.shrink();
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final kartId = madde.kartKimligi;
    final kartlarda = ref.watch(
      durumProvider.select(
        (d) => d.value?.kartlar.containsKey(kartId) ?? false,
      ),
    );
    return Card(
      key: const ValueKey('gunun-kelimesi'),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(Olcu.b3, Olcu.b2, Olcu.b1, Olcu.b2),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Günün kelimesi',
                    style: yazi.labelMedium?.copyWith(color: r.metinIkincil),
                  ),
                  Text(
                    madde.kelime,
                    style: yazi.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(madde.anlam, style: yazi.bodyMedium),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.volume_up_outlined),
              tooltip: 'Oku',
              onPressed: () => ref.read(sesProvider).oku(madde.kelime),
            ),
            kartlarda
                ? IconButton(
                    icon: Icon(Icons.check_circle, color: r.dogru),
                    tooltip: 'Kartlarda',
                    onPressed: null,
                  )
                : IconButton(
                    icon: const Icon(Icons.add_card),
                    tooltip: 'Kartlara ekle',
                    onPressed: () async {
                      final mesajci = ScaffoldMessenger.of(context);
                      await ref.read(durumProvider.notifier).kartEkle(kartId);
                      mesajci
                        ..hideCurrentSnackBar()
                        ..showSnackBar(
                          const SnackBar(
                            content: Text('Tekrar kartı eklendi'),
                            duration: Duration(seconds: 2),
                          ),
                        );
                    },
                  ),
          ],
        ),
      ),
    );
  }
}

/// Kod alanı: "Örnek programlar" kütüphanesine giriş kartı.
class _OrnekProgramlarKarti extends StatelessWidget {
  const _OrnekProgramlarKarti();

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    return Card(
      key: const ValueKey('ornek-programlar-karti'),
      child: ListTile(
        minVerticalPadding: Olcu.b1,
        leading: Icon(Icons.code, color: r.ana),
        title: const Text('Örnek programlar'),
        subtitle: Text(
          'HTML, CSS ve JavaScript için açıklamalı kısa örnekler',
          style: Theme.of(
            context,
          ).textTheme.bodySmall?.copyWith(color: r.metinIkincil),
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => context.push('/ornekler'),
      ),
    );
  }
}
