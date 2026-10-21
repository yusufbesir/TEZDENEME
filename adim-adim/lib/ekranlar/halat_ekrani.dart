/// Halat çekme bilgi yarışı (ÖZELLİK 83, `/halat`): bilgisayara karşı, çevrimdışı,
/// yarışma sorularından (HalatOyunu). Halat 11 hücrelik bir çizgidir; oyuncu
/// sağa, bilgisayar sola çeker. Altta çalışma arkadaşı maskot (Maskot). Puan,
/// XP ve satın alma yoktur; kart aralıklarına dokunmaz. `tohum` parametresi
/// (testler için) soru sırasını ve bilgisayarın cevaplarını sabitler.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/maskot_karti.dart';
import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../motor/halat.dart';
import '../tema/tema.dart';
import '../yarisma/ekranlar/bilesenler/sik_dugmesi.dart';
import '../yarisma/model.dart';
import '../yarisma/soru_bankasi.dart';
import 'yarisma_ekrani.dart' show varsayilanSeviye;

class HalatEkrani extends ConsumerStatefulWidget {
  const HalatEkrani({super.key, this.tohum});
  final int? tohum;

  @override
  ConsumerState<HalatEkrani> createState() => _HalatDurumu();
}

class _HalatDurumu extends ConsumerState<HalatEkrani> {
  HalatOyunu? _oyun;
  int? _secilen;
  HalatTuru? _tur;

  /// Cevaplanmış sorunun kendisi: oyun son cevapla bitse de geri bildirim
  /// ekranında soru görünür kalır.
  YarismaSorusu? _cevaplanan;
  int _sayac = 0;

  HalatOyunu? _kur() {
    final durum = ref.read(durumProvider).value ?? const OgrenciDurumu();
    final alan = durum.alan ?? '';
    final kursId = varsayilanSeviye(
      seviyeler(alan),
      ref.read(alanKurslariProvider),
      durum.tamamlanan,
    );
    if (kursId == null) return null;
    final sorular = sorulariBul(alan, kursId);
    if (sorular.isEmpty) return null;
    final tohum =
        (widget.tohum ?? DateTime.now().millisecondsSinceEpoch) + _sayac;
    return HalatOyunu(sorular: sorular, tohum: tohum);
  }

  @override
  void initState() {
    super.initState();
    _oyun = _kur();
  }

  void _yeniden() => setState(() {
    _sayac++;
    _oyun = _kur();
    _secilen = null;
    _tur = null;
  });

  @override
  Widget build(BuildContext context) {
    final oyun = _oyun;
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final bugun = ref.watch(bugunProvider);

    Widget govde;
    if (oyun == null) {
      govde = Center(
        child: Padding(
          padding: const EdgeInsets.all(Olcu.b3),
          child: Text(
            'Bu alanda halat çekme için yarışma sorusu yok.',
            key: const ValueKey('halat-bos'),
            textAlign: TextAlign.center,
            style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          ),
        ),
      );
    } else {
      final soru = _secilen != null ? _cevaplanan : oyun.soru;
      final cevapVerildi = _secilen != null;
      // Halat çizgisi: konum -mesafe..+mesafe, 11 hücre; işaretli hücre 🔴.
      final hucreler = HalatOyunu.mesafe * 2 + 1;
      final isaret = oyun.konum + HalatOyunu.mesafe;
      final halat = Row(
        key: const ValueKey('halat-cizgi'),
        children: [
          const Text('🤖'),
          for (var i = 0; i < hucreler; i++)
            Expanded(
              child: Container(
                height: 14,
                margin: const EdgeInsets.symmetric(horizontal: 1),
                decoration: BoxDecoration(
                  color: i == isaret ? r.vurgu : r.kenar,
                  borderRadius: BorderRadius.circular(4),
                ),
              ),
            ),
          const Text('🧑'),
        ],
      );
      if (oyun.bitti && _secilen == null) {
        final s = oyun.sonuc;
        govde = ListView(
          padding: const EdgeInsets.all(Olcu.b3),
          children: [
            halat,
            const SizedBox(height: Olcu.b3),
            Text(
              switch (s) {
                HalatSonucu.oyuncu => 'Halatı sen çektin! 🎉',
                HalatSonucu.bilgisayar => 'Bu sefer bilgisayar kazandı.',
                _ => 'Berabere kaldınız.',
              },
              key: const ValueKey('halat-sonuc'),
              textAlign: TextAlign.center,
              style: yazi.headlineSmall,
            ),
            const SizedBox(height: Olcu.b1),
            Text(
              '${oyun.tur} sorudan ${oyun.oyuncuDogru} doğru',
              textAlign: TextAlign.center,
              style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
            ),
            const SizedBox(height: Olcu.b3),
            FilledButton(
              key: const ValueKey('halat-yeniden'),
              style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: _yeniden,
              child: const Text('Yeniden oyna'),
            ),
            const SizedBox(height: Olcu.b3),
            MaskotKarti(durum: durum, bugun: bugun),
          ],
        );
      } else {
        govde = ListView(
          padding: const EdgeInsets.all(Olcu.b3),
          children: [
            halat,
            const SizedBox(height: Olcu.b1),
            Text(
              'Tur ${_secilen != null ? oyun.tur : oyun.tur + 1} / ${oyun.sorular.length}',
              key: const ValueKey('halat-tur'),
              textAlign: TextAlign.center,
              style: yazi.labelLarge?.copyWith(color: r.metinIkincil),
            ),
            const SizedBox(height: Olcu.b2),
            Text(
              soru!.soru,
              key: const ValueKey('halat-soru'),
              style: yazi.titleLarge,
            ),
            const SizedBox(height: Olcu.b2),
            for (var k = 0; k < soru.secenekler.length; k++)
              Padding(
                padding: const EdgeInsets.only(bottom: Olcu.b1),
                child: SikDugmesi(
                  key: ValueKey('halat-sik-$k'),
                  harf: String.fromCharCode(65 + k),
                  metin: soru.secenekler[k],
                  durum: !cevapVerildi
                      ? SikDurumu.normal
                      : (k == soru.dogru
                            ? SikDurumu.dogru
                            : (k == _secilen
                                  ? SikDurumu.yanlisSecilen
                                  : SikDurumu.soluk)),
                  onTap: cevapVerildi
                      ? null
                      : () => setState(() {
                          _cevaplanan = soru;
                          _secilen = k;
                          _tur = oyun.cevapla(k);
                        }),
                ),
              ),
            if (cevapVerildi && _tur != null) ...[
              const SizedBox(height: Olcu.b1),
              Text(
                '${_tur!.oyuncuDogru ? 'Doğru! Halat sana geldi.' : 'Yanlış.'} '
                '${_tur!.bilgisayarDogru ? 'Bilgisayar da bildi, halat ona gitti.' : 'Bilgisayar bilemedi.'}',
                key: const ValueKey('halat-geri-bildirim'),
                style: yazi.bodyMedium,
              ),
              const SizedBox(height: Olcu.b1),
              FilledButton(
                key: const ValueKey('halat-sonraki'),
                style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
                onPressed: () => setState(() {
                  _secilen = null;
                  _tur = null;
                }),
                child: Text(oyun.bitti ? 'Sonucu gör' : 'Sonraki soru'),
              ),
            ],
          ],
        );
      }
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text('Halat çekme'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/pratik'),
        ),
      ),
      body: SafeArea(child: SayfaGovdesi(child: govde)),
    );
  }
}
