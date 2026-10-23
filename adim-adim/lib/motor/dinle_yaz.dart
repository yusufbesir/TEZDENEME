/// Dinle ve yaz (Pratik merkezi, yalnız dil alanı) mantığı: okunan kelimeyi
/// yazarak yanıtlama. Havuz, öğrencinin tamamlanmış derslerinin (ya da kart
/// kümesindeki kartların) anlamı bilinen, en çok iki kelimelik kelime/fiil
/// öğeleridir. Yazılabilirlik için yalnız Latin alfabeli diller (İngilizce,
/// Almanca vb.; Korece/Japonca/Çince değil) alınır. Cevap kontrolü büyük/küçük
/// harf, boşluk ve sondaki noktalamayı yok sayar; aksan/umlaut eksikliği
/// "aksan farkı" olarak ayrıca bildirilir. Saf işlevler; durum değiştirmez
/// (SRS, XP ve hata defteri aynen kalır).
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dalga3]
library;

import 'dart:math' as math;

import '../model/durum.dart';
import '../model/icerik.dart';
import 'ders_ogeleri.dart';

/// Dinle ve yaz kartı: okunacak kelime, Türkçe anlamı ve TTS dili.
typedef DinleYazKarti = ({
  String kartId,
  String metin,
  String anlam,
  String sesDili,
});

/// Cevap kontrol sonucu.
enum DinleYazSonucu { dogru, aksanFarki, yanlis }

abstract final class DinleYaz {
  /// Bir oturumdaki en çok kelime sayısı.
  static const int oturumAdet = 8;

  /// Kelimede izin verilen en çok karakter (çok uzun kalıplar dışarıda kalır).
  static const int enCokUzunluk = 24;

  static final RegExp _latin = RegExp(r"^[A-Za-zÀ-ÿ' \-]+$");

  /// Sesli dil koduyla yazılabilir (Latin alfabeli) mi?
  static bool latinMi(String sesDili) {
    final d = sesDili.toLowerCase();
    return d.startsWith('en') ||
        d.startsWith('de') ||
        d.startsWith('fr') ||
        d.startsWith('es') ||
        d.startsWith('it') ||
        d.startsWith('tr');
  }

  /// Öğrencinin yazabileceği kelime havuzu (tekrarsız).
  static List<DinleYazKarti> havuz(OgrenciDurumu d, List<Kurs> kurslar) {
    final sonuc = <DinleYazKarti>[];
    final gorulen = <String>{};
    for (final k in kurslar) {
      if (k.alan != KursAlani.dil) continue;
      final dil = DersOgeleri.kursSesDili(k.id);
      for (final ders in k.tumDersler) {
        final bitti = (d.tamamlanan[ders.id] ?? 0) > 0;
        final oge = DersOgeleri.uret(ders, alan: k.alan, varsayilanDil: dil);
        for (final o in oge.ogeler) {
          if (o.tur == OgeTuru.kalip) continue;
          final anlam = o.anlam;
          final ses = o.sesDili;
          if (anlam == null || anlam.isEmpty || ses == null) continue;
          if (!latinMi(ses)) continue;
          if (anlam.length > 40 || anlam.contains('?')) continue;
          final metin = o.metin.trim();
          if (metin.length > enCokUzunluk || !_latin.hasMatch(metin)) continue;
          if (metin.split(RegExp(r'\s+')).length > 2) continue;
          if (!bitti && !d.kartlar.containsKey(o.kartId)) continue;
          if (!gorulen.add(metin.toLowerCase())) continue;
          sonuc.add((
            kartId: o.kartId,
            metin: metin,
            anlam: anlam,
            sesDili: ses,
          ));
        }
      }
    }
    return sonuc;
  }

  /// Oturum destesi: zayıf kartlar önce (karışık), en çok [oturumAdet] kelime.
  static List<DinleYazKarti> deste(
    OgrenciDurumu d,
    List<Kurs> kurslar, {
    int tohum = 0,
  }) {
    final h = havuz(d, kurslar)..shuffle(math.Random(tohum));
    double yo(DinleYazKarti c) => d.kartlar[c.kartId]?.yariOmurGun ?? 1e9;
    final sirali = [
      ...h.where((c) => yo(c) < Kart.ortaEsik),
      ...h.where((c) => yo(c) >= Kart.ortaEsik),
    ];
    return sirali.take(oturumAdet).toList();
  }

  /// Karşılaştırma için sadeleştirme: küçük harf, kenar boşlukları ve sondaki
  /// noktalama atılır, ardışık boşluklar tek boşluk olur.
  static String sadelestir(String s) => s
      .toLowerCase()
      .replaceAll(RegExp(r'\s+'), ' ')
      .trim()
      .replaceAll(RegExp(r'[.,!?;:]+$'), '')
      .trim();

  static const Map<String, String> _soy = {
    'ä': 'a',
    'ö': 'o',
    'ü': 'u',
    'ß': 'ss',
    'à': 'a',
    'á': 'a',
    'â': 'a',
    'ã': 'a',
    'å': 'a',
    'ç': 'c',
    'è': 'e',
    'é': 'e',
    'ê': 'e',
    'ë': 'e',
    'ì': 'i',
    'í': 'i',
    'î': 'i',
    'ï': 'i',
    'ñ': 'n',
    'ò': 'o',
    'ó': 'o',
    'ô': 'o',
    'õ': 'o',
    'ù': 'u',
    'ú': 'u',
    'û': 'u',
    'ý': 'y',
    'ÿ': 'y',
  };

  /// Aksanları atar (ä -> a); Almanca yazımı için ä/ö/ü -> ae/oe/ue de ayrıca
  /// denenir ([kontrol]).
  static String aksanSil(String s) =>
      s.split('').map((c) => _soy[c] ?? c).join();

  static String _umlautAc(String s) => s
      .replaceAll('ä', 'ae')
      .replaceAll('ö', 'oe')
      .replaceAll('ü', 'ue')
      .replaceAll('ß', 'ss');

  /// [yazilan] cevabını [dogru] kelimeyle karşılaştırır.
  static DinleYazSonucu kontrol(String yazilan, String dogru) {
    final y = sadelestir(yazilan);
    final d = sadelestir(dogru);
    if (y.isEmpty) return DinleYazSonucu.yanlis;
    if (y == d) return DinleYazSonucu.dogru;
    if (aksanSil(y) == aksanSil(d) || y == _umlautAc(d)) {
      return DinleYazSonucu.aksanFarki;
    }
    return DinleYazSonucu.yanlis;
  }

  /// Metin ipucu. Düzey 1: Türkçe anlam; düzey 2: anlam, harf sayısı ve ilk
  /// harf. Düzey 0 ya da altı: boş.
  static String ipucu(DinleYazKarti k, int duzey) {
    if (duzey <= 0) return '';
    if (duzey == 1) return 'Anlamı: ${k.anlam}';
    final ilk = k.metin.isEmpty ? '' : k.metin.substring(0, 1);
    final harf = k.metin.replaceAll(RegExp(r"[ '\-]"), '').length;
    return 'Anlamı: ${k.anlam} · $harf harf · ilk harf: $ilk';
  }
}
