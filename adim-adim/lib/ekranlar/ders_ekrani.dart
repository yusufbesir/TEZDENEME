/// Ders ekranı: alıştırmalar -> özet (doğru sayısı, XP, seri). Ünitenin son
/// dersinde özetin altında "Karışık tekrar (5 soru)" önerisi çıkar
/// (önceki ünitelerden serpiştirilmiş 5 alıştırma; XP mikro ders gibi).
/// Her dersin sonunda ayrıca "Kısa quiz (3 soru)" düğmesi bulunur: bu
/// oturumda yanlış yapılanlar önce, `/mikro?mod=quiz&ders=<id>&yanlis=0,3`.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/alistirma_oturumu.dart';
import '../bilesenler/ders_ozeti.dart';
import '../bilesenler/dilbilgisi_notu_karti.dart';
import '../bilesenler/kolaylastirma_satiri.dart';
import '../bilesenler/oturum_ozeti.dart';
import '../bilesenler/ustalik_karti.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../model/icerik.dart';
import '../icerik/projeler.dart';
import '../motor/ders_meta.dart';
import '../motor/ders_ogeleri.dart';
import '../motor/dilbilgisi_ipucu.dart';
import '../motor/kolaylastirma.dart';
import '../motor/motor.dart';
import '../motor/oturum_ozeti.dart';
import '../motor/satranc_calisma.dart';
import '../tema/tema.dart';

/// Ders akışı: alıştırmalar -> özet (doğru sayısı, XP, seri).
class DersEkrani extends ConsumerStatefulWidget {
  const DersEkrani({super.key, required this.dersId});
  final String dersId;

  @override
  ConsumerState<DersEkrani> createState() => _DersDurumu();
}

class _DersDurumu extends ConsumerState<DersEkrani> {
  ({int dogru, int toplam, int xp, int seri})? _ozet;
  bool _kaydediliyor = false;

  /// Oturum başındaki durum (özet için rozet/seri/ünite farkı).
  OgrenciDurumu? _onceki;
  OturumOzetiVeri? _veri;

  /// Ders ekranı açıldığından beri geçen süre (ustalık için çalışma süresi).
  final Stopwatch _sure = Stopwatch()..start();

  /// Ders başındaki dilbilgisi notu kartı geçildi mi?
  bool _notGecildi = false;

  /// Bu oturumda ilk cevabı yanlış olan alıştırma indeksleri (sırayla).
  final List<int> _yanlislar = [];

  @override
  void initState() {
    super.initState();
    _onceki = ref.read(durumProvider).value;
  }

  Ders? _dersBul() {
    for (final k in ref.read(kurslarProvider)) {
      final d = k.dersBul(widget.dersId);
      if (d != null) return d;
    }
    return null;
  }

  /// Bu ders ünitesinin son dersiyse ve önceki ünite alıştırması varsa true.
  bool _karisikVar(Ders ders) =>
      Motor.serpistirmeSec(ref.read(kurslarProvider), ders.id).isNotEmpty;

  /// Bu dersten türetilen tekrar öğesi var mı ("Bu dersin öğeleri" düğmesi)?
  bool _ogeVar(Ders ders) {
    for (final k in ref.read(kurslarProvider)) {
      if (k.dersBul(ders.id) != null) {
        return !DersOgeleri.uret(ders, alan: k.alan).bos;
      }
    }
    return false;
  }

  void _cik() => context.canPop() ? context.pop() : context.go('/yol');

  /// Kısa quiz rotası: ders kimliği ve yanlış indeksleri sorgu parametresinde.
  String _quizRotasi(Ders ders) {
    final yanlis = _yanlislar.join(',');
    return '/mikro?mod=quiz&ders=${Uri.encodeComponent(ders.id)}'
        '${yanlis.isEmpty ? '' : '&yanlis=$yanlis'}';
  }

  Future<void> _bitir(Ders ders, int dogru, int toplam) async {
    if (_kaydediliyor) return;
    _kaydediliyor = true;
    final yeni = await ref
        .read(durumProvider.notifier)
        .dersBitir(ders.id, dogru, toplam, sureSn: _sure.elapsed.inSeconds);
    if (!mounted) return;
    final xp = Motor.dersXp(dogru, toplam);
    final onceki = _onceki;
    // Büyüyen sözlük: oturumda Kelimelerim havuzuna giren yeni kelimeler.
    final yeniKelime = onceki == null
        ? 0
        : await ref
              .read(durumProvider.notifier)
              .yeniKelimeleriIsle(onceki, ref.read(kurslarProvider));
    if (!mounted) return;
    _veri = onceki == null
        ? null
        : OturumOzetiMotoru.hesapla(
            onceki: onceki,
            sonraki: yeni,
            kurslar: ref.read(kurslarProvider),
            dogru: dogru,
            toplam: toplam,
            xp: xp,
            yeniKelime: yeniKelime,
          );
    setState(
      () => _ozet = (dogru: dogru, toplam: toplam, xp: xp, seri: yeni.seri),
    );
  }

  /// Dersin gösterilecek alıştırmalarının özgün indeksleri. Ayarlarda konuşma
  /// alıştırmaları kapalıysa [Soyle] olanlar çıkarılır (kart kimliği ve quiz
  /// için özgün indeks korunur).
  List<int> _gosterilenler(Ders ders) {
    final acik = ref.watch(durumProvider).value?.konusmaAcik ?? true;
    return [
      for (var i = 0; i < ders.alistirmalar.length; i++)
        if (acik || ders.alistirmalar[i] is! Soyle) i,
    ];
  }

  Widget? _ustalik(Ders ders) {
    final d = ref.watch(durumProvider).value;
    if (d == null) return null;
    final ustalik = _ustalikKarti(d, ders);
    // Kolaylaştırma önerisi (ÖZELLİK 50): üst üste iki başarısız denemeden sonra.
    final oneri = Kolaylastirma.oner(
      d,
      ref.read(kurslarProvider),
      ref.read(bugunProvider),
    );
    final kart = oneri == null
        ? ustalik
        : Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              KolaylastirmaSatiri(oneri: oneri),
              const SizedBox(height: Olcu.b1),
              ustalik,
            ],
          );
    // Ünitenin son dersi ve ünitenin projesi varsa (ÖZELLİK 70).
    final proje = dersSonuProjesi(ref.read(kurslarProvider), ders.id);
    if (proje != null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          kart,
          const SizedBox(height: Olcu.b1),
          TextButton.icon(
            key: const ValueKey('bolum-projesi'),
            icon: const Icon(Icons.construction),
            label: Text('Bölüm sonu projesi: ${proje.ad}'),
            onPressed: () =>
                context.push('/proje/${Uri.encodeComponent(proje.projeId)}'),
          ),
        ],
      );
    }
    // Satranç dersleri: ders sonu tahta meydan okuması (ÖZELLİK 56).
    if (!SatrancCalisma.dersMeydanVar(ref.read(kurslarProvider), ders.id)) {
      return kart;
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        kart,
        const SizedBox(height: Olcu.b1),
        OutlinedButton.icon(
          key: const ValueKey('ders-tahta-meydan'),
          style: OutlinedButton.styleFrom(minimumSize: const Size(48, 48)),
          onPressed: () =>
              context.push('/satranc/meydan/${Uri.encodeComponent(ders.id)}'),
          icon: const Icon(Icons.extension_outlined),
          label: const Text('Tahta meydan okuması'),
        ),
      ],
    );
  }

  Widget _ustalikKarti(OgrenciDurumu d, Ders ders) {
    return UstalikKarti(
      ustalik: DersMeta.dersUstalik(d, ders.id),
      enIyiPuan: DersMeta.enIyiPuan(d, ders.id),
      calismaSn: DersMeta.calismaSaniye(d, ders.id),
      tahminiDk: DersMeta.dersDakika(ders),
      temel: DersMeta.dersTemelMi(ders),
      dagilim: DersMeta.dagilim(ders),
    );
  }

  @override
  Widget build(BuildContext context) {
    final ders = _dersBul();
    final idx = ders == null ? const <int>[] : _gosterilenler(ders);
    return Scaffold(
      body: SafeArea(
        child: ders == null || idx.isEmpty
            ? _Bulunamadi(onGeri: _cik)
            : (ders.dilbilgisiNotu?.trim().isNotEmpty ?? false) &&
                  !_notGecildi &&
                  _ozet == null
            ? DilbilgisiNotuKarti(
                dersAdi: ders.ad,
                not: ders.dilbilgisiNotu!.trim(),
                onBasla: () => setState(() => _notGecildi = true),
                onKapat: _cik,
              )
            : _ozet != null
            ? DersOzeti(
                baslik: 'Ders tamamlandı',
                altBaslik: ders.ad,
                dogru: _ozet!.dogru,
                toplam: _ozet!.toplam,
                xp: _ozet!.xp,
                seri: _ozet!.seri,
                onDon: _cik,
                ekEtiket: _karisikVar(ders) ? 'Karışık tekrar (5 soru)' : null,
                onEk: _karisikVar(ders)
                    ? () => context.push(
                        '/mikro?mod=karisik&ders=${Uri.encodeComponent(ders.id)}',
                      )
                    : null,
                ek2Etiket: 'Kısa quiz (${Motor.quizAdet} soru)',
                onEk2: () => context.push(_quizRotasi(ders)),
                ek3Etiket: _ogeVar(ders) ? 'Bu dersin öğeleri' : null,
                onEk3: _ogeVar(ders)
                    ? () => context.push(
                        '/ders-ogeleri/${Uri.encodeComponent(ders.id)}',
                      )
                    : null,
                bilgi: _ustalik(ders),
                oturum: _veri == null ? null : OturumOzeti(veri: _veri!),
              )
            : AlistirmaOturumu(
                alistirmalar: [for (final i in idx) ders.alistirmalar[i]],
                // Kişisel kelime notu: cevaptan sonra bantta gösterilir.
                notGetir: (i) => ref
                    .read(durumProvider)
                    .value
                    ?.kelimeNotlari[ders.kartKimligi(idx[i])],
                onSonuc: (i, dogru) {
                  final ozgun = idx[i];
                  if (!dogru) _yanlislar.add(ozgun);
                  ref
                      .read(durumProvider.notifier)
                      .kartIsle(ders.kartKimligi(ozgun), dogru);
                },
                onBitti: (d, t) => _bitir(ders, d, t),
                onKapat: _cik,
                dilbilgisiIpucu: DilbilgisiIpuclari.dersIcin(ders.id),
              ),
      ),
    );
  }
}

class _Bulunamadi extends StatelessWidget {
  const _Bulunamadi({required this.onGeri});
  final VoidCallback onGeri;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b3),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: r.hata),
            const SizedBox(height: Olcu.b2),
            Text(
              'Bu ders bulunamadı.',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: Olcu.b2),
            FilledButton(onPressed: onGeri, child: const Text('Yola dön')),
          ],
        ),
      ),
    );
  }
}
