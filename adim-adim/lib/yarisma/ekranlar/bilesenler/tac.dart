/// Yarışma taç bileşenleri: taç sırası (6 küçük taç) ve taç kazanım animasyonu.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Animasyon süresi en çok 250 ms (`Olcu.sure`); hareketi azalt açıksa 0 ms.
library;

import 'package:flutter/material.dart';

import '../../../tema/kategori_renkleri.dart';
import '../../../tema/tema.dart';
import '../../model.dart';

/// Taç simgesi (tüm yarışma arayüzünde aynı).
const IconData tacSimgesi = Icons.workspace_premium;

/// 6 küçük taç: kazanılanlar kategori renginde dolu, kalanlar soluk çizgili.
class TacSirasi extends StatelessWidget {
  const TacSirasi({super.key, required this.taclar, this.boyut = 22});

  final Set<YarismaKategori> taclar;
  final double boyut;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final parlaklik = Theme.of(context).brightness;
    return Semantics(
      container: true,
      label: '${taclar.length} taç, 6 taçtan',
      child: ExcludeSemantics(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final k in YarismaKategori.values)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 2),
                child: Icon(
                  taclar.contains(k)
                      ? tacSimgesi
                      : Icons.workspace_premium_outlined,
                  size: boyut,
                  color: taclar.contains(k)
                      ? KategoriRenkleri.renk(k, parlaklik)
                      : r.kenar,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

/// Taç kazanıldığında: simge 0→1 ölçeklenir ve 12 px yukarı kayar (≤250 ms).
class TacKazanimi extends StatelessWidget {
  const TacKazanimi({super.key, required this.kategori});

  final YarismaKategori kategori;

  @override
  Widget build(BuildContext context) {
    final parlaklik = Theme.of(context).brightness;
    final renk = KategoriRenkleri.renk(kategori, parlaklik);
    return Semantics(
      liveRegion: true,
      label: '${kategori.ad} tacını kazandın',
      child: ExcludeSemantics(
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: 1),
              duration: Olcu.sure(context),
              builder: (context, t, child) => Transform.translate(
                offset: Offset(0, (1 - t) * 12),
                child: Transform.scale(scale: t, child: child),
              ),
              child: Icon(tacSimgesi, size: 40, color: renk),
            ),
            const SizedBox(width: Olcu.b1),
            Text(
              'Taç kazandın: ${kategori.ad}',
              style: Theme.of(context).textTheme.titleMedium,
            ),
          ],
        ),
      ),
    );
  }
}
