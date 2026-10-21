/// Mikro ders ekranı: 2 dakikalık, 5 alıştırmalık kısa tekrar + yeni karışık ders.
/// Beş kip: normal, `mod=zayif` (hata defterindeki zayıf noktalar önce),
/// `mod=karisik` (ünite sonu serpiştirilmiş tekrar; `ders` parametresi) ve
/// `mod=quiz` (ders sonu kısa quiz; `ders` ve `yanlis=0,3` parametreleri:
/// kartlar değişmez, Motor.quizBitir küçük XP ve 'quiz' günlük kaydı yazar) ve
/// `mod=donem` (ÖZELLİK 63: `donem=gunluk|haftalik|aylik`; takvime bağlı,
/// tamamlanan derslerden karışık; bitişte Motor.donemDersiBitir sabit XP verir).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Seçim `Motor.mikroSec` ile yapılır; bitişte `mikroBitir` XP ve seriyi
/// işler, `tamamlanan` değişmez (docs/SADE-ARAYUZ-VE-YARISMA.md bölüm 4).
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/alistirma_oturumu.dart';
import '../bilesenler/ders_ozeti.dart';
import '../durum/saglayicilar.dart';
import '../model/icerik.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

class MikroDersEkrani extends ConsumerStatefulWidget {
  const MikroDersEkrani({
    super.key,
    this.mod,
    this.dersId,
    this.yanlis,
    this.donem,
  });

  /// null: normal; 'zayif' | 'karisik' | 'quiz'.
  final String? mod;

  /// 'karisik' ve 'quiz' kiplerinde biten ders kimliği.
  final String? dersId;

  /// 'quiz' kipinde bu oturumda yanlış yapılan indeksler, '0,3,5' biçiminde.
  final String? yanlis;

  /// 'donem' kipinde dönem: 'gunluk' | 'haftalik' | 'aylik'.
  final String? donem;

  @override
  ConsumerState<MikroDersEkrani> createState() => _MikroDurumu();
}

class _MikroDurumu extends ConsumerState<MikroDersEkrani> {
  late final List<({String kartId, Alistirma alistirma})> _liste;
  ({int dogru, int toplam, int xp, int seri})? _ozet;
  bool _kaydediliyor = false;

  /// Ekran açıldığından beri geçen süre (günlük süre takibi, ÖZELLİK 80).
  final Stopwatch _sure = Stopwatch()..start();

  bool get _quiz => widget.mod == 'quiz';

  /// Dönem dersi kipi ve geçerli dönem türü (aksi halde null).
  String? get _donem =>
      widget.mod == 'donem' && Motor.donemler.contains(widget.donem)
      ? widget.donem
      : null;
  bool _donemTamamdi = false;

  Ders? _dersBul(String id) {
    for (final k in ref.read(kurslarProvider)) {
      final d = k.dersBul(id);
      if (d != null) return d;
    }
    return null;
  }

  @override
  void initState() {
    super.initState();
    final durum = ref.read(durumProvider).value;
    final kurslar = ref.read(alanKurslariProvider);
    final tohum = DateTime.now().millisecondsSinceEpoch;
    final bugun = ref.read(bugunProvider);
    if (durum == null) {
      _liste = const [];
    } else if (widget.mod == 'donem') {
      final tur = _donem;
      _donemTamamdi = tur != null && Motor.donemTamam(durum, tur, bugun);
      _liste = (tur == null || _donemTamamdi)
          ? const []
          : Motor.donemDersiSec(durum, kurslar, tur, bugun);
    } else if (_quiz) {
      final ders = widget.dersId == null ? null : _dersBul(widget.dersId!);
      _liste = ders == null
          ? const []
          : Motor.quizSec(ders, Motor.yanlisListesiCoz(widget.yanlis));
    } else if (widget.mod == 'karisik' && widget.dersId != null) {
      _liste = Motor.serpistirmeSec(
        ref.read(kurslarProvider),
        widget.dersId!,
        tohum: tohum,
      );
    } else {
      _liste = Motor.mikroSec(
        durum,
        kurslar,
        bugun,
        adet: 5,
        tohum: tohum,
        oncelikliKartlar: widget.mod == 'zayif'
            ? Motor.zayifKartlar(durum, bugun)
            : const [],
      );
    }
  }

  void _cik() => context.canPop() ? context.pop() : context.go('/yol');

  Future<void> _kapatOnayi() async {
    final cik = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        icon: const Icon(Icons.warning_amber_rounded),
        title: Text(
          _quiz
              ? 'Quizden çıkılsın mı?'
              : (_donem != null
                    ? '${Motor.donemAdi(_donem!)} bırakılsın mı?'
                    : 'Mikro dersten çıkılsın mı?'),
        ),
        content: const Text('Şimdi çıkarsan bu dersteki ilerleme kaydedilmez.'),
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

  Future<void> _bitir(int dogru, int toplam) async {
    if (_kaydediliyor) return;
    _kaydediliyor = true;
    final bildirici = ref.read(durumProvider.notifier);
    final donem = _donem;
    final yeni = donem != null
        ? await bildirici.donemDersiBitir(donem, dogru, toplam)
        : _quiz
        ? await bildirici.quizBitir(widget.dersId ?? '', dogru, toplam)
        : await bildirici.mikroBitir(dogru, toplam);
    // Harcanan süre günlük süreye eklenir (bir oturumda en çok 1 saat).
    await bildirici.sureEkle(_sure.elapsed.inSeconds.clamp(0, 3600));
    if (!mounted) return;
    setState(
      () => _ozet = (
        dogru: dogru,
        toplam: toplam,
        xp: donem != null
            ? Motor.donemXp(donem)
            : _quiz
            ? Motor.quizXp(dogru, toplam)
            : Motor.mikroXp(dogru, toplam),
        seri: yeni.seri,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: _liste.isEmpty
            ? _Bos(
                onGeri: _cik,
                baslik: widget.mod == 'donem'
                    ? (_donemTamamdi
                          ? '${Motor.donemAdi(_donem!)} tamamlandı'
                          : 'Önce bir ders bitir')
                    : 'Önce bir ders bitir',
              )
            : _ozet != null
            ? DersOzeti(
                baslik: switch (widget.mod) {
                  'zayif' => 'Zayıf noktalar dersi tamamlandı',
                  'karisik' => 'Karışık tekrar tamamlandı',
                  'quiz' => 'Quiz tamamlandı',
                  'donem' => '${Motor.donemAdi(_donem ?? '')} tamamlandı',
                  _ => 'Mikro ders tamamlandı',
                },
                dogru: _ozet!.dogru,
                toplam: _ozet!.toplam,
                xp: _ozet!.xp,
                seri: _ozet!.seri,
                onDon: _cik,
              )
            : AlistirmaOturumu(
                alistirmalar: [for (final o in _liste) o.alistirma],
                // Kişisel kelime notu: cevaptan sonra bantta gösterilir.
                notGetir: (i) => ref
                    .read(durumProvider)
                    .value
                    ?.kelimeNotlari[_liste[i].kartId],
                // Quiz kart (SRS) durumunu değiştirmez; yalnızca pekiştirir.
                onSonuc: _quiz
                    ? (_, _) {}
                    : (i, dogru) => ref
                          .read(durumProvider.notifier)
                          .kartIsle(_liste[i].kartId, dogru),
                onBitti: _bitir,
                onKapat: _kapatOnayi,
              ),
      ),
    );
  }
}

class _Bos extends StatelessWidget {
  const _Bos({required this.onGeri, required this.baslik});
  final VoidCallback onGeri;
  final String baslik;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b3),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.timer_outlined, size: 48, color: r.ana),
            const SizedBox(height: Olcu.b2),
            Text(
              baslik,
              textAlign: TextAlign.center,
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
