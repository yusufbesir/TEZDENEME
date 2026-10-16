/// Mikro ders ekranı: 2 dakikalık, 5 alıştırmalık kısa tekrar + yeni karışık ders.
/// Üç kip: normal, `mod=zayif` (hata defterindeki zayıf noktalar önce) ve
/// `mod=karisik` (ünite sonu serpiştirilmiş tekrar; `ders` parametresi).
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
  const MikroDersEkrani({super.key, this.mod, this.dersId});

  /// null: normal; 'zayif' | 'karisik'.
  final String? mod;

  /// 'karisik' kipinde biten ders kimliği.
  final String? dersId;

  @override
  ConsumerState<MikroDersEkrani> createState() => _MikroDurumu();
}

class _MikroDurumu extends ConsumerState<MikroDersEkrani> {
  late final List<({String kartId, Alistirma alistirma})> _liste;
  ({int dogru, int toplam, int xp, int seri})? _ozet;
  bool _kaydediliyor = false;

  @override
  void initState() {
    super.initState();
    final durum = ref.read(durumProvider).value;
    final kurslar = ref.read(alanKurslariProvider);
    final tohum = DateTime.now().millisecondsSinceEpoch;
    final bugun = ref.read(bugunProvider);
    if (durum == null) {
      _liste = const [];
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
        title: const Text('Mikro dersten çıkılsın mı?'),
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
    final yeni = await ref
        .read(durumProvider.notifier)
        .mikroBitir(dogru, toplam);
    if (!mounted) return;
    setState(
      () => _ozet = (
        dogru: dogru,
        toplam: toplam,
        xp: Motor.mikroXp(dogru, toplam),
        seri: yeni.seri,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: _liste.isEmpty
            ? _Bos(onGeri: _cik)
            : _ozet != null
            ? DersOzeti(
                baslik: switch (widget.mod) {
                  'zayif' => 'Zayıf noktalar dersi tamamlandı',
                  'karisik' => 'Karışık tekrar tamamlandı',
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
                onSonuc: (i, dogru) => ref
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
            Icon(Icons.timer_outlined, size: 48, color: r.ana),
            const SizedBox(height: Olcu.b2),
            Text(
              'Önce bir ders bitir',
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
