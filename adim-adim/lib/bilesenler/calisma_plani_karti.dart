// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// "Çalışma planı" kartı (ana sayfa): plan varsa bugünkü hedef (X ders),
/// genel ilerleme ve tahmini bitiş; yoksa "Plan oluştur" çağrısı. Karta
/// dokununca `/plan` (oluştur/düzenle/sil) açılır.
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../model/durum.dart';
import '../model/icerik.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

const _aylar = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
];

/// 'YYYY-MM-DD' -> '21 Ekim 2026'; geçersizse aynı metin.
String planTarihMetni(String gun) {
  if (!OgrenciDurumu.gunGecerli(gun)) return gun;
  final a = int.parse(gun.substring(5, 7));
  final g = int.parse(gun.substring(8, 10));
  return '$g ${_aylar[a - 1]} ${gun.substring(0, 4)}';
}

class CalismaPlaniKarti extends StatelessWidget {
  const CalismaPlaniKarti({
    super.key,
    required this.durum,
    required this.kurslar,
    required this.bugun,
  });

  final OgrenciDurumu durum;
  final List<Kurs> kurslar;
  final String bugun;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final ozet = Motor.planOzeti(durum, kurslar, bugun);
    final List<Widget> icerik;
    if (ozet == null) {
      icerik = [
        Text(
          'Günde kaç dakika ve hangi günler çalışacağını seç; tahmini bitiş '
          'tarihini ve günlük ders hedefini görelim.',
          style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
        ),
        const SizedBox(height: Olcu.b2),
        Align(
          alignment: Alignment.centerRight,
          child: FilledButton.icon(
            key: const ValueKey('plan-olustur'),
            style: FilledButton.styleFrom(
              minimumSize: const Size(Olcu.hedef, Olcu.hedef),
            ),
            icon: const Icon(Icons.add),
            label: const Text('Plan oluştur'),
            onPressed: () => context.push('/plan'),
          ),
        ),
      ];
    } else {
      final bitenSayi = ozet.toplam - ozet.kalan;
      final hedefMetni = ozet.kalan == 0
          ? 'Planın hedefi tamamlandı'
          : ozet.bugunCalisma
          ? 'Bugünkü hedef: ${ozet.gunlukDers} ders'
          : 'Bugün dinlenme günü';
      icerik = [
        Text(
          hedefMetni,
          style: yazi.titleMedium?.copyWith(fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: Olcu.b1),
        ClipRRect(
          borderRadius: BorderRadius.circular(Olcu.b1),
          child: LinearProgressIndicator(
            value: ozet.toplam == 0 ? 0 : bitenSayi / ozet.toplam,
            minHeight: Olcu.b1,
          ),
        ),
        const SizedBox(height: Olcu.b1),
        Text(
          '$bitenSayi / ${ozet.toplam} ders tamamlandı',
          style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
        ),
        if (ozet.bitis != null)
          Text(
            'Tahmini bitiş: ${planTarihMetni(ozet.bitis!)}',
            style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          ),
        const SizedBox(height: Olcu.b1),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            key: const ValueKey('plan-duzenle'),
            style: TextButton.styleFrom(
              minimumSize: const Size(Olcu.hedef, Olcu.hedef),
            ),
            onPressed: () => context.push('/plan'),
            child: const Text('Planı düzenle'),
          ),
        ),
      ];
    }
    return Card(
      key: const ValueKey('calisma-plani-karti'),
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Icon(Icons.event_note_outlined, color: r.ana),
                const SizedBox(width: Olcu.b1),
                Expanded(
                  child: Text(
                    'Çalışma planı',
                    style: yazi.labelMedium?.copyWith(color: r.metinIkincil),
                  ),
                ),
              ],
            ),
            const SizedBox(height: Olcu.b1),
            ...icerik,
          ],
        ),
      ),
    );
  }
}
