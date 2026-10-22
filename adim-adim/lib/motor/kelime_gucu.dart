/// Kelime gücü (Busuu'nun kelime gücü çubuğundan esinli): her kelime kartı
/// dört kovadan birine girer (Yeni/Zayıf/Orta/Güçlü) ve 0..100 güç puanı alır.
/// Hepsi saf işlevdir; durum değiştirmez. 'Kelimelerim' ekranının listesi,
/// aranması ve sıralaması buradadır. Kovalar yarı ömür eşiklerini
/// ([Kart.ortaEsik], [Kart.gucluEsik]) kullanır, yani kelime sağlığı
/// panosuyla uyumludur; fark yalnız 'Yeni' kovasıdır.
///
/// Sahibi Yusuf (yusufbesir). Yazan: [İP:Adım Adım Windows sürümü#cihaz]
/// Claude. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf
/// kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:math' as math;

import '../model/durum.dart';
import '../model/icerik.dart';
import 'pratik.dart';

/// Güç kovası. Sıra: zayıftan güçlüye, 'Yeni' en başta.
enum GucKovasi {
  yeni('Yeni'),
  zayif('Zayıf'),
  orta('Orta'),
  guclu('Güçlü');

  const GucKovasi(this.ad);
  final String ad;
}

/// Sıralama ölçütü: alfabe (Türkçe sıra) ya da güce göre (zayıf önce).
enum KelimeSirasi { alfabe, guc }

/// Kelimelerim listesindeki bir satır.
typedef KelimeSatiri = ({
  String kartId,
  String metin,
  String anlam,
  GucKovasi kova,
  int puan,
  String? sonraki,
});

abstract final class KelimeGucu {
  /// Kartın kovası. Kart yoksa ya da hiç cevaplanmamış ve yarı ömrü zayıf
  /// eşiğinin altındaysa 'Yeni' (elle eklenen kart, henüz sorulmamış kelime);
  /// yarı ömür < [Kart.ortaEsik] 'Zayıf', [Kart.ortaEsik]..[Kart.gucluEsik]
  /// (sınırlar dahil) 'Orta', daha çoğu 'Güçlü'.
  static GucKovasi kova(Kart? k) {
    if (k == null) return GucKovasi.yeni;
    final yo = k.yariOmurGun;
    if (yo < Kart.ortaEsik) {
      return k.sonCevap == null ? GucKovasi.yeni : GucKovasi.zayif;
    }
    return yo <= Kart.gucluEsik ? GucKovasi.orta : GucKovasi.guclu;
  }

  /// Güç puanı 0..100: yarı ömrün (0,5..180 gün) logaritmik konumu. Kart yoksa
  /// 0. Yarı ömür aynıysa puan aynıdır, daha uzun yarı ömür daha yüksektir.
  static int puan(Kart? k) {
    if (k == null) return 0;
    final yo = k.yariOmurGun.clamp(Kart.enAzYariOmur, Kart.enCokYariOmur);
    final oran =
        math.log(yo / Kart.enAzYariOmur) /
        math.log(Kart.enCokYariOmur / Kart.enAzYariOmur);
    return (oran * 100).round().clamp(0, 100);
  }

  /// Öğrencinin kelime listesi: [Pratik.kelimeHavuzu] satırları, kartlarıyla
  /// birleştirilmiş. Sıra: Türkçe alfabe.
  static List<KelimeSatiri> liste(OgrenciDurumu d, List<Kurs> kurslar) {
    final satirlar = <KelimeSatiri>[
      for (final c in Pratik.kelimeHavuzu(d, kurslar))
        (
          kartId: c.kartId,
          metin: c.metin,
          anlam: c.anlam,
          kova: kova(d.kartlar[c.kartId]),
          puan: puan(d.kartlar[c.kartId]),
          sonraki: d.kartlar[c.kartId]?.sonraki,
        ),
    ];
    return sirala(satirlar, KelimeSirasi.alfabe);
  }

  /// Kova başına kelime sayısı (dört kova da anahtardır).
  static Map<GucKovasi, int> sayilar(Iterable<KelimeSatiri> satirlar) {
    final m = {for (final k in GucKovasi.values) k: 0};
    for (final s in satirlar) {
      m[s.kova] = m[s.kova]! + 1;
    }
    return m;
  }

  /// Süzme: [kova] verilirse yalnız o kova; [arama] verilirse (Türkçe büyük/
  /// küçük harf duyarsız; 'ı' ile 'i' ayrı harftir) kelimede ya da anlamda geçenler.
  static List<KelimeSatiri> suz(
    Iterable<KelimeSatiri> satirlar, {
    GucKovasi? kova,
    String arama = '',
  }) {
    final a = anahtar(arama.trim());
    return [
      for (final s in satirlar)
        if ((kova == null || s.kova == kova) &&
            (a.isEmpty ||
                anahtar(s.metin).contains(a) ||
                anahtar(s.anlam).contains(a)))
          s,
    ];
  }

  /// Sıralama (kararlı değil, ama tam sıralıdır: eşitlikte alfabe, sonra kimlik).
  /// [KelimeSirasi.guc]: önce kova (Yeni, Zayıf, Orta, Güçlü), sonra puan
  /// artan, sonra alfabe.
  static List<KelimeSatiri> sirala(
    Iterable<KelimeSatiri> satirlar,
    KelimeSirasi sira,
  ) {
    int alfa(KelimeSatiri x, KelimeSatiri y) {
      final c = anahtar(x.metin).compareTo(anahtar(y.metin));
      return c != 0 ? c : x.kartId.compareTo(y.kartId);
    }

    return satirlar.toList()..sort(switch (sira) {
      KelimeSirasi.alfabe => alfa,
      KelimeSirasi.guc => (x, y) {
        final k = x.kova.index.compareTo(y.kova.index);
        if (k != 0) return k;
        final p = x.puan.compareTo(y.puan);
        return p != 0 ? p : alfa(x, y);
      },
    });
  }

  static const String _alfabe = 'abcçdefgğhıijklmnoöpqrsştuüvwxyz';

  /// Karşılaştırma ve arama anahtarı: Türkçe küçük harfe çevirir ('I'→'ı',
  /// 'İ'→'i') ve harfleri Türkçe alfabe sırasına oturan tek karaktere
  /// eşler; alfabe dışı karakterler (rakam, noktalama) olduğu gibi kalır ve
  /// harflerden önce sıralanır. Aynı anahtar, aranan metnin kelimede geçip geçmediğini de sınar.
  static String anahtar(String s) {
    final b = StringBuffer();
    for (final r in s.runes) {
      var ch = String.fromCharCode(r);
      if (ch == 'I') {
        ch = 'ı';
      } else if (ch == 'İ') {
        ch = 'i';
      } else {
        ch = ch.toLowerCase();
      }
      final i = _alfabe.indexOf(ch);
      // Alfabe harfi: özel kullanım alanında sıralı bir karaktere eşle
      // (ç, ğ, ı, ö, ş, ü doğru yere girer). Diğerleri değişmez.
      b.writeCharCode(i < 0 ? ch.runes.first : 0xE000 + i);
    }
    return b.toString();
  }
}
