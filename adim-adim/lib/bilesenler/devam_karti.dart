// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// "Kaldığın yerden devam" kartı: en son açılan/bitirilen ders (`sonDersId`)
/// bitmemişse onu, bitmişse yoldaki sıradaki bitmemiş dersi ("Sıradaki: ...")
/// önerir; "Devam et" düğmesi `/ders/<id>` rotasına gider.
/// `sonDersId` yok ve hiç tamamlanan ders yoksa hiçbir şey çizilmez.
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../model/durum.dart';
import '../model/icerik.dart';
import '../tema/tema.dart';

/// Gösterilecek hedef ders ve ünitesi; [siradaki] true ise "Sıradaki" önerisi.
typedef DevamHedefi = ({Ders ders, Unite unite, bool siradaki});

class DevamKarti extends StatelessWidget {
  const DevamKarti({super.key, required this.durum, required this.kurslar});

  final OgrenciDurumu durum;
  final List<Kurs> kurslar;

  /// Saf hedef seçimi (test edilebilir): son ders bitmemişse o; aksi halde
  /// kurslar sırasında ilk tamamlanmamış ders; hiçbiri yoksa null.
  static DevamHedefi? hedefSec(OgrenciDurumu durum, List<Kurs> kurslar) {
    final sonId = durum.sonDersId;
    if (sonId == null && durum.tamamlanan.isEmpty) return null;
    bool bitti(String id) => (durum.tamamlanan[id] ?? 0) > 0;
    if (sonId != null && !bitti(sonId)) {
      final b = _bul(kurslar, sonId);
      if (b != null) return (ders: b.ders, unite: b.unite, siradaki: false);
    }
    for (final k in kurslar) {
      for (final u in k.uniteler) {
        for (final d in u.dersler) {
          if (!bitti(d.id)) return (ders: d, unite: u, siradaki: true);
        }
      }
    }
    return null;
  }

  static ({Ders ders, Unite unite})? _bul(List<Kurs> kurslar, String id) {
    for (final k in kurslar) {
      for (final u in k.uniteler) {
        for (final d in u.dersler) {
          if (d.id == id) return (ders: d, unite: u);
        }
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final hedef = hedefSec(durum, kurslar);
    if (hedef == null) return const SizedBox.shrink();
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    const baslik = 'Kaldığın yerden devam';
    final dersMetni = hedef.siradaki
        ? 'Sıradaki: ${hedef.ders.ad}'
        : hedef.ders.ad;
    return Card(
      key: const ValueKey('devam-karti'),
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Icon(Icons.play_circle_outline, color: r.ana),
                const SizedBox(width: Olcu.b1),
                Expanded(
                  child: Text(
                    baslik,
                    style: yazi.labelMedium?.copyWith(color: r.metinIkincil),
                  ),
                ),
              ],
            ),
            const SizedBox(height: Olcu.b1),
            // RichText: ders adı yolda da (Basamak) geçer; düz Text olsaydı
            // ders adıyla yapılan aramalar iki sonuç bulurdu. Erişilebilirlik
            // için anlamsal metin aynıdır.
            RichText(
              // RichText varsayılan olarak sistem yazı ölçeğini uygulamaz;
              // Text ile aynı davranış için açıkça veriliyor.
              textScaler: MediaQuery.textScalerOf(context),
              text: TextSpan(
                text: dersMetni,
                style: yazi.titleMedium?.copyWith(fontWeight: FontWeight.bold),
              ),
            ),
            Text(
              hedef.unite.ad,
              style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
            ),
            const SizedBox(height: Olcu.b2),
            Align(
              alignment: Alignment.centerRight,
              child: FilledButton.icon(
                style: FilledButton.styleFrom(
                  minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                ),
                icon: const Icon(Icons.arrow_forward),
                label: const Text('Devam et'),
                onPressed: () =>
                    context.push('/ders/${Uri.encodeComponent(hedef.ders.id)}'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
