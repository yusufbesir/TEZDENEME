/// Yer imi düğmesi (ÖZELLİK 72): sözlük maddesi ve ders öğesi satırlarında
/// dokununca yer imini "Genel" koleksiyonuna ekler/kaldırır. Koleksiyon ve not
/// düzenleme Yer imleri ekranındadır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../durum/saglayicilar.dart';
import '../tema/tema.dart';

class YerImiDugmesi extends ConsumerWidget {
  const YerImiDugmesi({super.key, required this.anahtar});

  /// 'adim:dersId#i' ya da 'sozluk:dersId#i|kelime' (YerImleri anahtarları).
  final String anahtar;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isli = ref.watch(
      durumProvider.select(
        (d) => d.value?.yerImleri.any((y) => y.anahtar == anahtar) ?? false,
      ),
    );
    return IconButton(
      key: ValueKey('yer-imi-$anahtar'),
      icon: Icon(
        isli ? Icons.bookmark : Icons.bookmark_border,
        color: isli ? context.renkler.ana : null,
      ),
      tooltip: isli ? 'Yer iminden kaldır' : 'Yer imine ekle',
      visualDensity: VisualDensity.compact,
      onPressed: () async {
        final mesajci = ScaffoldMessenger.of(context);
        await ref.read(durumProvider.notifier).yerImiDegistir(anahtar);
        mesajci
          ..hideCurrentSnackBar()
          ..showSnackBar(
            SnackBar(
              content: Text(
                isli ? 'Yer imi kaldırıldı' : 'Yer imine eklendi (Genel)',
              ),
              duration: const Duration(seconds: 2),
            ),
          );
      },
    );
  }
}
