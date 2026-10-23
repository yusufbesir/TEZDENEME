/// Kelime çeviri balonu için anlam bulma: sözlükteki İngilizce maddelerden
/// verilen kelimenin (tam eşleşme, yoksa kök eşleşmesi) Türkçe anlamını
/// döndürür; bilinmiyorsa null (balon açılmaz). Saf işlev, durum değiştirmez.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dalga7]
library;

import '../sozluk/kok.dart';
import '../sozluk/sozluk.dart';

abstract final class KelimeAnlami {
  /// [kelime] için anlam; en az 2 harfli olmalı. Önce tam eşleşme, sonra kök
  /// eşleşmesi ("went" -> "go"). Bulunamazsa null.
  static String? bul(Sozluk sozluk, String kelime) {
    final n = Sozluk.normalize(kelime);
    if (n.length < 2) return null;
    final adaylar = [
      for (final m in sozluk.maddeler)
        if (m.dil == 'en' && m.anlam.trim().isNotEmpty) m,
    ];
    for (final m in adaylar) {
      if (Sozluk.normalize(m.kelime) == n) return m.anlam.trim();
    }
    final kok = IngilizceKok.bul(n);
    for (final m in adaylar) {
      if (m.kok == kok && !m.kelime.trim().contains(' ')) return m.anlam.trim();
    }
    return null;
  }
}
