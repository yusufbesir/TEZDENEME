/// Tekrar sekmesi: seçili alanın zamanı gelen Leitner kartlarını sorar.
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../bilesenler/alistirma_oturumu.dart';
import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/icerik.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

/// Aralıklı tekrar: zamanı gelen kartları sırayla sorar.
class TekrarEkrani extends ConsumerStatefulWidget {
  const TekrarEkrani({super.key});

  @override
  ConsumerState<TekrarEkrani> createState() => _TekrarDurumu();
}

class _TekrarDurumu extends ConsumerState<TekrarEkrani> {
  List<({String kartId, Alistirma alistirma})>? _oturum;
  ({int dogru, int toplam})? _sonuc;

  List<({String kartId, Alistirma alistirma})> _bekleyenler() {
    final durum = ref.read(durumProvider).value;
    if (durum == null) return const [];
    final bugun = ref.read(bugunProvider);
    // Yalnızca seçili alanın kurslarına ait kartlar; diğer alanın kartları
    // orada bekler, kaybolmaz.
    final kurslar = ref.read(alanKurslariProvider);
    return [
      for (final id in Motor.tekrarBekleyen(durum, bugun))
        if (Motor.kartCoz(kurslar, id) case final a?)
          (kartId: id, alistirma: a),
    ];
  }

  @override
  Widget build(BuildContext context) {
    ref.watch(durumProvider);
    ref.watch(alanKurslariProvider);
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;

    if (_oturum != null && _sonuc == null) {
      final oturum = _oturum!;
      return SafeArea(
        child: AlistirmaOturumu(
          alistirmalar: [for (final o in oturum) o.alistirma],
          onSonuc: (i, dogru) => ref
              .read(durumProvider.notifier)
              .kartIsle(oturum[i].kartId, dogru),
          onBitti: (d, t) => setState(() => _sonuc = (dogru: d, toplam: t)),
          onKapat: () => setState(() => _oturum = null),
        ),
      );
    }

    final sonuc = _sonuc;
    final List<({String kartId, Alistirma alistirma})> bekleyen = sonuc == null
        ? _bekleyenler()
        : const [];
    return SafeArea(
      child: SayfaGovdesi(
        child: Padding(
          padding: const EdgeInsets.all(Olcu.b3),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Semantics(
                header: true,
                child: Text('Tekrar', style: yazi.headlineMedium),
              ),
              const SizedBox(height: Olcu.b3),
              Expanded(
                child: Center(
                  child: SingleChildScrollView(
                    child: sonuc != null
                        ? _Mesaj(
                            simge: Icons.check_circle,
                            renk: r.dogru,
                            baslik: 'Tekrar tamamlandı',
                            metin:
                                '${sonuc.toplam} karttan ${sonuc.dogru} tanesini doğru bildin.',
                            dugme: 'Tamam',
                            onTap: () => setState(() {
                              _sonuc = null;
                              _oturum = null;
                            }),
                          )
                        : bekleyen.isEmpty
                        ? const _Mesaj(
                            simge: Icons.task_alt,
                            baslik: 'Bugün tekrar yok',
                            metin:
                                'Ders çözdükçe tekrar kartların burada birikir.',
                          )
                        : _Mesaj(
                            simge: Icons.replay,
                            renk: r.ana,
                            baslik: '${bekleyen.length} kart bekliyor',
                            metin:
                                'Kısa bir tekrar, öğrendiklerini kalıcı yapar.',
                            dugme: 'Tekrara başla',
                            onTap: () => setState(() {
                              _oturum = bekleyen;
                              _sonuc = null;
                            }),
                          ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Mesaj extends StatelessWidget {
  const _Mesaj({
    required this.simge,
    required this.baslik,
    required this.metin,
    this.renk,
    this.dugme,
    this.onTap,
  });
  final IconData simge;
  final Color? renk;
  final String baslik;
  final String metin;
  final String? dugme;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(simge, size: 64, color: renk ?? r.metinIkincil),
        const SizedBox(height: Olcu.b2),
        Text(baslik, style: yazi.titleLarge, textAlign: TextAlign.center),
        const SizedBox(height: Olcu.b1),
        Text(
          metin,
          style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          textAlign: TextAlign.center,
        ),
        if (dugme != null) ...[
          const SizedBox(height: Olcu.b3),
          FilledButton(onPressed: onTap, child: Text(dugme!)),
        ],
      ],
    );
  }
}
