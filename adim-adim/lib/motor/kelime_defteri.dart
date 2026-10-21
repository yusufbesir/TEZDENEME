/// Kelime defteri dışa aktarma (ÖZELLİK 81): öğrencinin kelime havuzunu
/// (tamamlanmış derslerin ya da kart kümesindeki kartların kelime/terim
/// öğeleri; Pratik.kelimeHavuzu) CSV metni yapar. Sütunlar: kelime, anlam,
/// kurs, ders, kutu, yari_omur_gun, sonraki_tekrar, not. Biçim RFC 4180
/// (virgül ayraç, çift tırnak kaçışı, satır sonu CRLF). Hücre =, +, -, @
/// ile başlıyorsa tablo programlarında formül sanılmasın diye başına
/// kesme işareti eklenir. Metin uygulamanın mevcut kopyalama kalıbıyla
/// (pano) paylaşılır; dosya yolu ya da klasör seçimi yoktur.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/durum.dart';
import '../model/icerik.dart';
import 'pratik.dart';

abstract final class KelimeDefteri {
  static const List<String> baslik = [
    'kelime',
    'anlam',
    'kurs',
    'ders',
    'kutu',
    'yari_omur_gun',
    'sonraki_tekrar',
    'not',
  ];

  /// Tek hücreyi CSV için hazırlar (formül önleme + tırnak kaçışı).
  static String hucre(String s) {
    var v = s;
    if (v.isNotEmpty && '=+-@\t'.contains(v[0])) v = "'$v";
    if (v.contains(',') ||
        v.contains('"') ||
        v.contains('\n') ||
        v.contains('\r')) {
      v = '"${v.replaceAll('"', '""')}"';
    }
    return v;
  }

  /// Kelime defterindeki satır sayısı.
  static int sayi(OgrenciDurumu d, List<Kurs> kurslar) =>
      Pratik.kelimeHavuzu(d, kurslar).length;

  /// CSV metni; başlık satırı her zaman vardır.
  static String csv(OgrenciDurumu d, List<Kurs> kurslar) {
    final b = StringBuffer(baslik.join(','));
    for (final c in Pratik.kelimeHavuzu(d, kurslar)) {
      final ayrac = c.kartId.lastIndexOf('#');
      final dersId = ayrac > 0 ? c.kartId.substring(0, ayrac) : c.kartId;
      var kursAd = '';
      var dersAd = dersId;
      for (final k in kurslar) {
        final ders = k.dersBul(dersId);
        if (ders != null) {
          kursAd = k.ad;
          dersAd = ders.ad;
          break;
        }
      }
      final kart = d.kartlar[c.kartId];
      final satir = [
        c.metin,
        c.anlam,
        kursAd,
        dersAd,
        kart == null ? '' : '${kart.kutu}',
        kart == null ? '' : kart.yariOmurGun.toStringAsFixed(1),
        kart?.sonraki ?? '',
        d.kelimeNotlari[c.kartId] ?? '',
      ];
      b.write('\r\n${satir.map(hucre).join(',')}');
    }
    return b.toString();
  }
}
