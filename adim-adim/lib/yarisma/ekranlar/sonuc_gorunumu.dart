/// Yarışma sonuç ekranı: puan, XP, taçlar, doğru/yanlış, kategori dökümü ve
/// yanlış bilinen soruların "Öğrenmek için" listesi.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Yalnızca gösterir; kaydetme işi `oyun_ekrani.dart`ta bir kez yapılır.
/// Puan/en iyi satırı ve bu turda kazanılan rozet çipleri yazan: [Claude#yarisma-rozet].
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../motor/basarimlar.dart';
import '../../tema/kategori_renkleri.dart';
import '../../tema/tema.dart';
import '../model.dart';
import '../motor.dart';
import 'bilesenler/tac.dart';

class SonucGorunumu extends StatelessWidget {
  const SonucGorunumu({
    super.key,
    required this.oyun,
    required this.onTekrar,
    required this.onLobi,
    this.enIyiPuan,
    this.yeniRozetler = const [],
  });

  final YarismaOyunu oyun;
  final VoidCallback onTekrar;
  final VoidCallback onLobi;

  /// Bu alan + seviyede kayıtlı en iyi puan (bilinmiyorsa null; bu turun puanı
  /// daha yüksekse satırda o gösterilir).
  final int? enIyiPuan;

  /// Bu turda yeni kazanılan rozet kimlikleri ([Basarimlar.tanimlar]);
  /// tanımsız kimlik gösterilmez.
  final List<String> yeniRozetler;

  /// "Puan: X · En iyi: Y" satırı; Y = max(kayıtlı en iyi, bu tur).
  String get puanSatiri {
    final enIyi = math.max(enIyiPuan ?? 0, oyun.puan);
    return 'Puan: ${oyun.puan} · En iyi: $enIyi';
  }

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final parlaklik = Theme.of(context).brightness;
    final sonuc = oyun.sonuc;
    final xp = YarismaMotoru.xpHesapla(oyun.puan);
    final kazandi = sonuc.kazandiMi;

    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(Olcu.b2),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Icon(
                    kazandi ? Icons.emoji_events : Icons.flag_outlined,
                    size: 56,
                    color: r.vurgu,
                  ),
                ),
                const SizedBox(height: Olcu.b1),
                Center(
                  child: Semantics(
                    header: true,
                    liveRegion: true,
                    child: Text(
                      kazandi ? 'Tüm taçları topladın!' : 'Oyun bitti',
                      textAlign: TextAlign.center,
                      style: yazi.headlineMedium,
                    ),
                  ),
                ),
                const SizedBox(height: Olcu.b2),
                Row(
                  children: [
                    _Olcut(baslik: 'Puan', deger: '${sonuc.puan}'),
                    _Olcut(baslik: 'Kazanılan XP', deger: '+$xp XP'),
                    _Olcut(
                      baslik: 'Doğru / yanlış',
                      deger: '${sonuc.dogru} / ${sonuc.yanlis}',
                    ),
                  ],
                ),
                const SizedBox(height: Olcu.b1),
                Center(
                  child: Text(
                    puanSatiri,
                    style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                  ),
                ),
                if (yeniRozetler.isNotEmpty) ...[
                  const SizedBox(height: Olcu.b1),
                  _RozetCipleri(idler: yeniRozetler),
                ],
                const SizedBox(height: Olcu.b2),
                Center(child: TacSirasi(taclar: oyun.taclar, boyut: 30)),
                Center(
                  child: Text(
                    '${sonuc.tacSayisi} / 6 taç',
                    style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                  ),
                ),
                const SizedBox(height: Olcu.b3),
                Semantics(
                  header: true,
                  child: Text('Kategoriler', style: yazi.titleLarge),
                ),
                const SizedBox(height: Olcu.b1),
                for (final k in YarismaKategori.values)
                  _KategoriSatiri(
                    kategori: k,
                    dogru: sonuc.kategoriDogru[k] ?? 0,
                    yanlis: sonuc.kategoriYanlis[k] ?? 0,
                    renk: KategoriRenkleri.renk(k, parlaklik),
                    tacli: oyun.taclar.contains(k),
                  ),
                const SizedBox(height: Olcu.b3),
                if (sonuc.yanlisBilinenler.isEmpty)
                  Text('Hiç yanlışın yok, harika!', style: yazi.bodyLarge)
                else ...[
                  Semantics(
                    header: true,
                    child: Text('Öğrenmek için', style: yazi.titleLarge),
                  ),
                  const SizedBox(height: Olcu.b1),
                  for (final s in sonuc.yanlisBilinenler) _YanlisKarti(soru: s),
                ],
              ],
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(
            Olcu.b2,
            Olcu.b1,
            Olcu.b2,
            Olcu.b2,
          ),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: onLobi,
                  child: const Text('Lobiye dön'),
                ),
              ),
              const SizedBox(width: Olcu.b2),
              Expanded(
                child: FilledButton(
                  onPressed: onTekrar,
                  child: const Text('Tekrar oyna'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Olcut extends StatelessWidget {
  const _Olcut({required this.baslik, required this.deger});
  final String baslik;
  final String deger;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Expanded(
      child: Semantics(
        container: true,
        label: '$baslik: $deger',
        child: ExcludeSemantics(
          child: Column(
            children: [
              Text(deger, style: yazi.titleLarge),
              Text(
                baslik,
                textAlign: TextAlign.center,
                style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Bu turda kazanılan rozetler: küçük çipler, animasyonsuz.
class _RozetCipleri extends StatelessWidget {
  const _RozetCipleri({required this.idler});
  final List<String> idler;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final tanimlar = [
      for (final id in idler)
        for (final t in Basarimlar.tanimlar)
          if (t.id == id) t,
    ];
    if (tanimlar.isEmpty) return const SizedBox.shrink();
    return Semantics(
      container: true,
      label: 'Yeni rozet: ${tanimlar.map((t) => t.ad).join(', ')}',
      child: ExcludeSemantics(
        child: Wrap(
          alignment: WrapAlignment.center,
          spacing: Olcu.b1,
          runSpacing: Olcu.b1,
          children: [
            for (final t in tanimlar)
              Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: Olcu.b2,
                  vertical: 4,
                ),
                decoration: BoxDecoration(
                  color: r.yuzey,
                  borderRadius: BorderRadius.circular(Olcu.kose),
                  border: Border.all(color: r.kenar),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.emoji_events, size: 16, color: r.vurgu),
                    const SizedBox(width: 4),
                    Text(t.ad, style: yazi.bodyMedium),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _KategoriSatiri extends StatelessWidget {
  const _KategoriSatiri({
    required this.kategori,
    required this.dogru,
    required this.yanlis,
    required this.renk,
    required this.tacli,
  });
  final YarismaKategori kategori;
  final int dogru;
  final int yanlis;
  final Color renk;
  final bool tacli;

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    return Semantics(
      container: true,
      label:
          '${kategori.ad}: $dogru doğru, $yanlis yanlış${tacli ? ', taç alındı' : ''}',
      child: ExcludeSemantics(
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 6),
          child: Row(
            children: [
              Icon(KategoriRenkleri.simge(kategori), color: renk),
              const SizedBox(width: Olcu.b2),
              Expanded(child: Text(kategori.ad, style: yazi.bodyLarge)),
              Text('$dogru doğru · $yanlis yanlış', style: yazi.bodyMedium),
              SizedBox(
                width: 28,
                child: tacli ? Icon(tacSimgesi, size: 20, color: renk) : null,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _YanlisKarti extends StatelessWidget {
  const _YanlisKarti({required this.soru});
  final YarismaSorusu soru;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.only(bottom: Olcu.b1),
      padding: const EdgeInsets.all(Olcu.b2),
      decoration: BoxDecoration(
        color: r.yuzey,
        borderRadius: BorderRadius.circular(Olcu.kose),
        border: Border.all(color: r.kenar),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(soru.soru, style: yazi.titleMedium),
          const SizedBox(height: 4),
          Text(
            'Doğru cevap: ${soru.secenekler[soru.dogru]}',
            style: yazi.bodyMedium?.copyWith(
              color: r.dogru,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 4),
          Text(soru.aciklama, style: yazi.bodyMedium),
        ],
      ),
    );
  }
}
