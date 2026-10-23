/// Kart kaydırma (Pratik merkezi) mantığı: kelime kartlarını "bildim /
/// bilmedim" diye sağa ya da sola kaydırma. Destesi [Pratik.kartDestesi]'dir
/// (zayıf kartlar önce, en çok 20). Her karar mevcut SRS motoruna işlenir
/// (DurumNotifier.kartIsle: bildim = doğru, bilmedim = yanlış ve hata defteri);
/// oturum bitince tek 'tekrar' günlük kaydı eklenir. Burada yalnız saf
/// işlevler vardır (yön kararı, sonuç özeti).
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dalga3]
library;

import '../model/durum.dart';
import '../model/icerik.dart';
import 'pratik.dart';

/// Kaydırma yönü: sağ = bildim, sol = bilmedim.
enum KaydirmaYonu { sag, sol }

abstract final class KartKaydirma {
  /// Kaydırmanın karar sayılması için gereken en az yatay uzaklık (mantıksal px).
  static const double esikPx = 96;

  /// Hızlı "fırlatma" hareketi için en az hız (px/sn).
  static const double hizEsigi = 700;

  /// Oturum destesi: zayıf kartlar önce, en çok [Pratik.kartDesteEnCok] kart.
  static List<KelimeCifti> deste(
    OgrenciDurumu d,
    List<Kurs> kurslar, {
    int tohum = 0,
  }) => Pratik.kartDestesi(d, kurslar, tohum: tohum);

  /// Sürükleme bittiğinde yön kararı: yeterince uzağa gidildiyse ya da hızlı
  /// fırlatıldıysa yön, yoksa null (kart yerine döner).
  static KaydirmaYonu? yon(double dx, {double hiz = 0}) {
    if (dx >= esikPx || (dx > 0 && hiz >= hizEsigi)) return KaydirmaYonu.sag;
    if (dx <= -esikPx || (dx < 0 && hiz <= -hizEsigi)) return KaydirmaYonu.sol;
    return null;
  }

  /// Oturum özeti: bildim/bilmedim sayıları ve bilinen yüzdesi (0..100).
  static ({int bildim, int bilmedim, int toplam, int yuzde}) ozet(
    int bildim,
    int bilmedim,
  ) {
    final toplam = bildim + bilmedim;
    final yuzde = toplam == 0 ? 0 : (bildim * 100 / toplam).round();
    return (bildim: bildim, bilmedim: bilmedim, toplam: toplam, yuzde: yuzde);
  }
}
