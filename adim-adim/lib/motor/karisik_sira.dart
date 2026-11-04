/// Karışık sıra (saf motor işlevi): yeni oturumda aynı kart ya da aynı tür
/// art arda gelmesin. Kaynak fikir: serpiştirilmiş (karışık) çalışma ayırt
/// etmeyi ve kalıcılığı artırır. Tohuma bağlı, deterministik; girdi değişmez.
/// Sahibi Yusuf (yusufbesir); yazan: [Claude#guven-derecesi].
library;

import 'dart:math' as math;

abstract final class KarisikSira {
  /// Gün metninden ('YYYY-MM-DD' ya da herhangi bir metin) kararlı tohum;
  /// `String.hashCode` sürümler arası sabit sayılmaz, bu yüzden elle toplanır.
  static int tohumDan(String metin) {
    var t = 17;
    for (final c in metin.codeUnits) {
      t = (t * 31 + c) & 0x3fffffff;
    }
    return t;
  }

  /// [ogeler]'i tohumla karıştırıp sıralar: öncelikle önceki öğeyle aynı
  /// [kimlik]'i, sonra aynı [tur]'u taşımayan; adaylar arasında kalan sayısı en
  /// çok olan tür seçilir (sonda aynı türün birikmesini önler). Kaçınmak
  /// mümkün değilse (tek tür/kimlik kaldı) sıradaki öğe alınır. Aynı girdi ve
  /// tohum her zaman aynı sırayı verir; öğe kaybolmaz, eklenmez.
  static List<T> diz<T>(
    List<T> ogeler, {
    required Object Function(T) kimlik,
    required Object Function(T) tur,
    int tohum = 0,
  }) {
    final havuz = [...ogeler]..shuffle(math.Random(tohum));
    final kalan = <Object, int>{};
    final kalanKimlik = <Object, int>{};
    for (final o in havuz) {
      kalan.update(tur(o), (c) => c + 1, ifAbsent: () => 1);
      kalanKimlik.update(kimlik(o), (c) => c + 1, ifAbsent: () => 1);
    }
    final sonuc = <T>[];
    while (havuz.isNotEmpty) {
      final onceki = sonuc.isEmpty ? null : sonuc.last;
      var en = -1;
      var enCok = -1;
      var enKimlikSiz = -1;
      for (var i = 0; i < havuz.length; i++) {
        final o = havuz[i];
        if (onceki != null && kimlik(o) == kimlik(onceki)) continue;
        if (enKimlikSiz < 0) enKimlikSiz = i;
        if (onceki != null && tur(o) == tur(onceki)) continue;
        // Yinelenen kimlik önce (sonda yalnız onlar kalıp çakışmasın), sonra
        // en çok kalan tür.
        final c = (kalanKimlik[kimlik(o)] ?? 0) * 100000 + (kalan[tur(o)] ?? 0);
        if (c > enCok) {
          enCok = c;
          en = i;
        }
      }
      if (en < 0) en = enKimlikSiz < 0 ? 0 : enKimlikSiz;
      final secilen = havuz.removeAt(en);
      kalan.update(tur(secilen), (c) => c - 1);
      kalanKimlik.update(kimlik(secilen), (c) => c - 1);
      sonuc.add(secilen);
    }
    return sonuc;
  }
}
