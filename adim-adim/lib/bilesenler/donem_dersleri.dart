// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Günün / haftanın / ayın dersi düğmeleri (ÖZELLİK 63): `/mikro?mod=donem`
/// rotasını açar. Tamamlanan dönemin düğmesi pasiftir ve onay simgesi taşır.
/// Öğrencinin tamamladığı ders yoksa (seçilecek alıştırma yok) hiçbir şey
/// çizmez. Düğmeler dar pencerede alt satıra sarılır (taşmaz).
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../model/durum.dart';
import '../model/icerik.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

class DonemDersleri extends StatelessWidget {
  const DonemDersleri({
    super.key,
    required this.durum,
    required this.kurslar,
    required this.bugun,
  });

  final OgrenciDurumu durum;

  /// Alan kursları.
  final List<Kurs> kurslar;
  final String bugun;

  @override
  Widget build(BuildContext context) {
    if (!Motor.donemDersiVar(durum, kurslar)) return const SizedBox.shrink();
    final r = context.renkler;
    return Wrap(
      key: const ValueKey('donem-dersleri'),
      spacing: Olcu.b1,
      runSpacing: Olcu.b1,
      children: [
        for (final tur in Motor.donemler)
          Builder(
            builder: (context) {
              final tamam = Motor.donemTamam(durum, tur, bugun);
              final ad = Motor.donemAdi(tur);
              return Semantics(
                button: true,
                label: tamam
                    ? '$ad tamamlandı'
                    : '$ad, ${Motor.donemAdet(tur)} alıştırma, '
                          '+${Motor.donemXp(tur)} XP',
                excludeSemantics: true,
                child: OutlinedButton.icon(
                  key: ValueKey('donem-$tur'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                  ),
                  icon: Icon(
                    tamam ? Icons.check_circle : Icons.event_note_outlined,
                    size: 20,
                    color: tamam ? r.dogru : null,
                  ),
                  label: Text(ad),
                  onPressed: tamam
                      ? null
                      : () => context.push('/mikro?mod=donem&donem=$tur'),
                ),
              );
            },
          ),
      ],
    );
  }
}
