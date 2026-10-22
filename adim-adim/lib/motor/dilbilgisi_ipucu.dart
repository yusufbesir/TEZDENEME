/// Dilbilgisi ipucu mantığı: ipuçlarını kursa/üniteye/derse göre bulur ve
/// öğrencinin sıradaki dersine en yakın ipucunu seçer. Saf işlevler; durum
/// değiştirmez. İpuçları [tumDilbilgisiIpuclari] sabit listesindedir ve ünite
/// rehberiyle (UniteRehberi) aynı ünite/ders kimliklerini kullanır.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dalga3]
library;

import '../icerik/dilbilgisi_ipuclari.dart';
import '../model/dilbilgisi_ipucu.dart';
import '../model/durum.dart';
import '../model/icerik.dart';

abstract final class DilbilgisiIpuclari {
  /// Verilen listedeki ipuçlarından [kursId]'ye ait olanlar (liste sırası).
  static List<DilbilgisiIpucu> kursIcin(
    String kursId, {
    List<DilbilgisiIpucu> kaynak = tumDilbilgisiIpuclari,
  }) => [
    for (final i in kaynak)
      if (i.kursId == kursId) i,
  ];

  /// Bir ünitenin ipuçları (örn. 'ingilizce-1.u1').
  static List<DilbilgisiIpucu> uniteIcin(
    String uniteId, {
    List<DilbilgisiIpucu> kaynak = tumDilbilgisiIpuclari,
  }) => [
    for (final i in kaynak)
      if (i.uniteId == uniteId) i,
  ];

  /// Bir dersin ipucu; yoksa null.
  static DilbilgisiIpucu? dersIcin(
    String dersId, {
    List<DilbilgisiIpucu> kaynak = tumDilbilgisiIpuclari,
  }) {
    for (final i in kaynak) {
      if (i.dersId == dersId) return i;
    }
    return null;
  }

  /// Verilen kurslarda ipucu olan derslerin ipuçları, kurs/ünite/ders sırasıyla.
  /// Kursta artık bulunmayan derse bağlı ipucu (içerik değişirse) atlanır:
  /// her ipucu mutlaka var olan bir derse bağlanır.
  static List<DilbilgisiIpucu> kurslarIcin(
    List<Kurs> kurslar, {
    List<DilbilgisiIpucu> kaynak = tumDilbilgisiIpuclari,
  }) {
    final sonuc = <DilbilgisiIpucu>[];
    for (final k in kurslar) {
      for (final ders in k.tumDersler) {
        final i = dersIcin(ders.id, kaynak: kaynak);
        if (i != null) sonuc.add(i);
      }
    }
    return sonuc;
  }

  /// Açılışta gösterilecek ipucunun [liste] içindeki indeksi: ilk
  /// tamamlanmamış dersin ipucu; hepsi bitmişse ya da eşleşme yoksa 0.
  /// [liste] boşsa -1.
  static int baslangicIndeksi(OgrenciDurumu d, List<DilbilgisiIpucu> liste) {
    if (liste.isEmpty) return -1;
    for (var i = 0; i < liste.length; i++) {
      if ((d.tamamlanan[liste[i].dersId] ?? 0) <= 0) return i;
    }
    return 0;
  }
}
