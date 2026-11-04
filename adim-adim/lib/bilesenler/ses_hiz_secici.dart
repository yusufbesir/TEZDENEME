/// Dinleme konuşma hızı seçici (SADE araştırma maddesi 8): 0,7x / 0,85x /
/// 1x / 1,2x çipleri. Değer `OgrenciDurumu.sesHizi` ayarında kalıcıdır;
/// Dinle alıştırması, Dinle-yaz ekranı ve Ayarlar aynı bileşeni kullanır.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf
/// kararıyla ve yalnızca geri dönüşüm kutusuna. yazan: [Claude#tts-hiz]
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../tema/tema.dart';

/// Hız etiketi: 1,0 → "1x", 0,85 → "0,85x" (Türkçe ondalık virgülü).
String sesHiziEtiketi(double hiz) {
  var m = hiz.toStringAsFixed(2).replaceFirst(RegExp(r'0+$'), '');
  if (m.endsWith('.')) m = m.substring(0, m.length - 1);
  return '${m.replaceFirst('.', ',')}x';
}

class SesHizSecici extends ConsumerWidget {
  const SesHizSecici({super.key, this.sikisik = true});

  /// Küçük çipler (alıştırma içinde); false: ayarlar satırı için normal boy.
  final bool sikisik;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final r = context.renkler;
    final secili = ref.watch(
      durumProvider.select(
        (d) => d.value?.sesHizi ?? OgrenciDurumu.varsayilanSesHizi,
      ),
    );
    return Semantics(
      label: 'Konuşma hızı: ${sesHiziEtiketi(secili)}',
      child: Wrap(
        spacing: Olcu.b1,
        runSpacing: 4,
        alignment: WrapAlignment.center,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          Icon(Icons.speed, size: sikisik ? 18 : 22, color: r.metinIkincil),
          for (final h in OgrenciDurumu.sesHiziSecenekleri)
            ChoiceChip(
              key: ValueKey('ses-hiz-${sesHiziEtiketi(h)}'),
              label: Text(sesHiziEtiketi(h)),
              selected: (secili - h).abs() < 0.001,
              visualDensity: sikisik ? VisualDensity.compact : null,
              labelPadding: sikisik
                  ? const EdgeInsets.symmetric(horizontal: 4)
                  : null,
              tooltip: 'Konuşma hızı ${sesHiziEtiketi(h)}',
              onSelected: (_) =>
                  ref.read(durumProvider.notifier).ayarGuncelle(sesHizi: h),
            ),
        ],
      ),
    );
  }
}
