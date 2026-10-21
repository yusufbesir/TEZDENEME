/// Seviye sertifikası: sertifika sınavı geçilmiş kurs için çevrimdışı,
/// Flutter widget'larıyla çizilmiş sertifika (ad, kurs, tarih, puan) ve
/// "Metni kopyala". Ağ ve PDF paketi kullanılmaz.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../model/icerik.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

/// 'YYYY-MM-DD' -> 'GG.AA.YYYY'.
String sertifikaTarihi(String gun) {
  final p = gun.split('-');
  return p.length == 3 ? '${p[2]}.${p[1]}.${p[0]}' : gun;
}

/// Kopyalanacak düz metin.
String sertifikaMetni(String ad, Kurs kurs, SinavSonucu s) =>
    'ADIM ADIM SERTİFİKASI\n'
    '$ad\n'
    '${kurs.ad} seviyesini başarıyla tamamlamıştır.\n'
    'Puan: %${s.yuzde} (${s.dogru}/${s.toplam})\n'
    'Tarih: ${sertifikaTarihi(s.gun)}';

class SertifikaEkrani extends ConsumerWidget {
  const SertifikaEkrani({super.key, required this.kursId});
  final String kursId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value;
    Kurs? kurs;
    for (final k in ref.watch(kurslarProvider)) {
      if (k.id == kursId) kurs = k;
    }
    final s = (durum == null || kurs == null)
        ? null
        : (Motor.sertifikaVar(durum, kurs)
              ? durum.sertifikalar[kurs.id]
              : null);
    void cik() => context.canPop() ? context.pop() : context.go('/yol');
    if (durum == null || kurs == null || s == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Sertifika')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(Olcu.b3),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Bu kurs için henüz sertifikan yok.'),
                const SizedBox(height: Olcu.b2),
                FilledButton(onPressed: cik, child: const Text('Yola dön')),
              ],
            ),
          ),
        ),
      );
    }
    final ad = durum.ad.trim().isEmpty
        ? 'Adım Adım öğrencisi'
        : durum.ad.trim();
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Sertifika')),
      body: SafeArea(
        child: SayfaGovdesi(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(Olcu.b3),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  key: const ValueKey('sertifika-kart'),
                  padding: const EdgeInsets.all(Olcu.b3),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.surface,
                    border: Border.all(color: r.ana, width: 4),
                    borderRadius: BorderRadius.circular(Olcu.b1),
                  ),
                  child: Column(
                    children: [
                      Icon(Icons.workspace_premium, size: 64, color: r.vurgu),
                      const SizedBox(height: Olcu.b1),
                      Text(
                        'SERTİFİKA',
                        style: yazi.titleMedium?.copyWith(letterSpacing: 4),
                      ),
                      const SizedBox(height: Olcu.b3),
                      Text(
                        'Bu belge',
                        style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                      ),
                      const SizedBox(height: Olcu.b1),
                      Text(
                        key: const ValueKey('sertifika-ad'),
                        ad,
                        textAlign: TextAlign.center,
                        style: yazi.headlineMedium,
                      ),
                      const SizedBox(height: Olcu.b1),
                      Text(
                        'kişisinin aşağıdaki seviyeyi başarıyla '
                        'tamamladığını gösterir.',
                        textAlign: TextAlign.center,
                        style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                      ),
                      const SizedBox(height: Olcu.b2),
                      Text(
                        key: const ValueKey('sertifika-kurs'),
                        kurs.ad,
                        textAlign: TextAlign.center,
                        style: yazi.titleLarge?.copyWith(color: r.ana),
                      ),
                      const SizedBox(height: Olcu.b3),
                      Text(
                        key: const ValueKey('sertifika-puan'),
                        'Puan: %${s.yuzde} (${s.dogru}/${s.toplam})',
                        style: yazi.bodyLarge,
                      ),
                      Text(
                        key: const ValueKey('sertifika-tarih'),
                        'Tarih: ${sertifikaTarihi(s.gun)}',
                        style: yazi.bodyLarge,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: Olcu.b3),
                OutlinedButton.icon(
                  key: const ValueKey('sertifika-kopyala'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: () async {
                    final mesaj = ScaffoldMessenger.of(context);
                    await Clipboard.setData(
                      ClipboardData(text: sertifikaMetni(ad, kurs!, s)),
                    );
                    mesaj
                      ..hideCurrentSnackBar()
                      ..showSnackBar(
                        const SnackBar(
                          content: Text('Sertifika metni kopyalandı'),
                        ),
                      );
                  },
                  icon: const Icon(Icons.copy),
                  label: const Text('Metni kopyala'),
                ),
                const SizedBox(height: Olcu.b2),
                FilledButton(
                  key: const ValueKey('sertifika-don'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: cik,
                  child: const Text('Yola dön'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
