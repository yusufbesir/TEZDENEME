/// Ünite ara sınavı (10 soru, geçme %70) ve seviye sertifika sınavı (20 soru,
/// geçme %80). Sorular kursun mevcut alıştırmalarından seçilir (Motor.
/// araSinavSec / sertifikaSec); oturum AlistirmaOturumu ile işler. Sınav XP,
/// seri ya da günlük kazandırmaz; yalnız en iyi sonuç kaydedilir. Kalınırsa
/// yanlış yapılan alıştırmalar tekrar destesine/hata defterine eklenir.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/alistirma_oturumu.dart';
import '../bilesenler/sayfa_govdesi.dart';
import '../bilesenler/sinav_oncesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../model/icerik.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

/// [uniteIndeks] null ise sertifika sınavıdır.
class SinavEkrani extends ConsumerStatefulWidget {
  const SinavEkrani({super.key, required this.kursId, this.uniteIndeks});
  final String kursId;
  final int? uniteIndeks;

  @override
  ConsumerState<SinavEkrani> createState() => _SinavDurumu();
}

class _SinavDurumu extends ConsumerState<SinavEkrani> {
  Kurs? _kurs;
  List<({int unite, String kartId, Alistirma alistirma})> _sorular = const [];
  final Map<int, bool> _cevaplar = {};
  ({SinavSonucu bu, SinavSonucu? enIyi, bool gecti})? _sonuc;
  bool _kaydediliyor = false;
  bool _basladi = false;

  bool get _sertifika => widget.uniteIndeks == null;
  double get _esik => _sertifika ? Motor.sertifikaEsik : Motor.araSinavEsik;

  @override
  void initState() {
    super.initState();
    final durum = ref.read(durumProvider).value;
    for (final k in ref.read(kurslarProvider)) {
      if (k.id == widget.kursId) _kurs = k;
    }
    final kurs = _kurs;
    if (durum != null && kurs != null) {
      final tohum = DateTime.now().millisecondsSinceEpoch;
      final u = widget.uniteIndeks;
      // Sınav yalnız hak edilmişse açılır; aksi halde "sınav yok" ekranı.
      if (u != null) {
        if (Motor.araSinavAcik(durum, kurs, u)) {
          _sorular = Motor.araSinavSec(kurs, u, tohum: tohum);
        }
      } else if (Motor.sertifikaSinaviAcik(durum, kurs)) {
        _sorular = Motor.sertifikaSec(kurs, tohum: tohum);
      }
    }
  }

  String get _baslik {
    final u = widget.uniteIndeks;
    final kurs = _kurs;
    if (u == null || kurs == null) return 'Seviye sertifika sınavı';
    return 'Ara sınav: ${kurs.uniteler[u].ad}';
  }

  void _cik() => context.canPop() ? context.pop() : context.go('/yol');

  Future<void> _kapatOnayi() async {
    final cik = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        icon: const Icon(Icons.warning_amber_rounded),
        title: const Text('Sınavdan çıkılsın mı?'),
        content: const Text('Şimdi çıkarsan sonuç kaydedilmez.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Devam et'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Çık'),
          ),
        ],
      ),
    );
    if (cik == true && mounted) _cik();
  }

  Future<void> _bitir() async {
    if (_kaydediliyor) return;
    _kaydediliyor = true;
    final kurs = _kurs!;
    final u = widget.uniteIndeks;
    final anahtar = u == null ? kurs.id : kurs.uniteler[u].id;
    final dogrular = [
      for (var i = 0; i < _sorular.length; i++) _cevaplar[i] ?? false,
    ];
    final yeni = await ref
        .read(durumProvider.notifier)
        .sinavBitir(
          anahtar: anahtar,
          sertifika: _sertifika,
          sorular: _sorular,
          dogrular: dogrular,
        );
    if (!mounted) return;
    final bu = SinavSonucu(
      dogru: dogrular.where((x) => x).length,
      toplam: dogrular.length,
      gun: ref.read(bugunProvider),
    );
    setState(
      () => _sonuc = (
        bu: bu,
        enIyi: (_sertifika ? yeni.sertifikalar : yeni.araSinavlar)[anahtar],
        gecti: Motor.sinavGecti(bu, _esik),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: _kurs == null || _sorular.isEmpty
            ? _Bos(onGeri: _cik)
            : _sonuc != null
            ? _Sonuc(
                baslik: _baslik,
                kursAdi: _kurs!.ad,
                sertifika: _sertifika,
                esikYuzde: (_esik * 100).round(),
                bu: _sonuc!.bu,
                enIyi: _sonuc!.enIyi,
                gecti: _sonuc!.gecti,
                onDon: _cik,
                onSertifika: () => context.pushReplacement(
                  '/sertifika?kurs=${Uri.encodeComponent(_kurs!.id)}',
                ),
              )
            : !_basladi
            ? SinavOncesiEkrani(
                baslik: _baslik,
                altBaslik: _kurs!.ad,
                simge: _sertifika ? Icons.workspace_premium : Icons.quiz,
                soruSayisi: _sorular.length,
                sureKurali:
                    'Süre sınırı yok. Sorular kursundaki alıştırmalardan '
                    'seçilir; sınavdan çıkarsan sonuç kaydedilmez.',
                gecmeKosulu: 'En az %${(_esik * 100).round()} doğru.',
                kazanc: _sertifika
                    ? 'Geçersen seviye sertifikanı alırsın. Sınav XP ve '
                          'seri kazandırmaz; yalnız en iyi puanın saklanır.'
                    : 'Ünite ustalığın için en iyi puanın saklanır. Sınav XP '
                          've seri kazandırmaz; yanlışların tekrar '
                          'destesine eklenir.',
                onBasla: () => setState(() => _basladi = true),
                onVazgec: _cik,
              )
            : AlistirmaOturumu(
                alistirmalar: [for (final s in _sorular) s.alistirma],
                // Kart (SRS) güncellemesi sınav bitince Motor.sinavBitir'de.
                onSonuc: (i, dogru) => _cevaplar[i] = dogru,
                onBitti: (_, _) => _bitir(),
                onKapat: _kapatOnayi,
                cikisOnayi: false,
              ),
      ),
    );
  }
}

class _Sonuc extends StatelessWidget {
  const _Sonuc({
    required this.baslik,
    required this.kursAdi,
    required this.sertifika,
    required this.esikYuzde,
    required this.bu,
    required this.enIyi,
    required this.gecti,
    required this.onDon,
    required this.onSertifika,
  });
  final String baslik;
  final String kursAdi;
  final bool sertifika;
  final int esikYuzde;
  final SinavSonucu bu;
  final SinavSonucu? enIyi;
  final bool gecti;
  final VoidCallback onDon;
  final VoidCallback onSertifika;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return SayfaGovdesi(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b3),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Icon(
              gecti ? Icons.verified : Icons.replay,
              size: 64,
              color: gecti ? r.ana : r.vurgu,
            ),
            const SizedBox(height: Olcu.b2),
            Text(
              key: const ValueKey('sinav-durum'),
              gecti ? 'Sınavı geçtin' : 'Bu sefer geçemedin',
              textAlign: TextAlign.center,
              style: yazi.headlineMedium,
            ),
            const SizedBox(height: Olcu.b1),
            Text(
              '$baslik · $kursAdi',
              textAlign: TextAlign.center,
              style: yazi.bodyLarge?.copyWith(color: r.metinIkincil),
            ),
            const SizedBox(height: Olcu.b3),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(Olcu.b2),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      key: const ValueKey('sinav-puan'),
                      'Puan: %${bu.yuzde} (${bu.dogru}/${bu.toplam})',
                      style: yazi.titleLarge,
                    ),
                    const SizedBox(height: Olcu.b1),
                    Text('Geçme eşiği: %$esikYuzde', style: yazi.bodyLarge),
                    if (enIyi != null) ...[
                      const SizedBox(height: Olcu.b1),
                      Text(
                        key: const ValueKey('sinav-en-iyi'),
                        'En iyi puan: %${enIyi!.yuzde} (${enIyi!.gun})',
                        style: yazi.bodyLarge,
                      ),
                    ],
                    const SizedBox(height: Olcu.b1),
                    Text(
                      gecti
                          ? 'Sınav XP ve seri kazandırmaz; sonucun kaydedildi.'
                          : 'Yanlış yaptığın alıştırmalar tekrar destesine '
                                'eklendi. Tekrar edip yeniden deneyebilirsin.',
                      style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: Olcu.b3),
            if (gecti && sertifika) ...[
              FilledButton.icon(
                key: const ValueKey('sinav-sertifika'),
                style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
                onPressed: onSertifika,
                icon: const Icon(Icons.workspace_premium),
                label: const Text('Sertifikayı gör'),
              ),
              const SizedBox(height: Olcu.b2),
            ],
            FilledButton(
              key: const ValueKey('sinav-don'),
              style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: onDon,
              child: const Text('Yola dön'),
            ),
          ],
        ),
      ),
    );
  }
}

class _Bos extends StatelessWidget {
  const _Bos({required this.onGeri});
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
            Icon(Icons.quiz_outlined, size: 48, color: r.ana),
            const SizedBox(height: Olcu.b2),
            Text(
              'Bu sınav şimdi açık değil',
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
