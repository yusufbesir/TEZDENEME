/// Art arda doğru (kombo): ilerleme çubuğu rengi ve "x3 seri" etiketi için saf
/// işlevler. 3 art arda doğruda çubuk "ısınır" (doğru rengi), 5'te "sıcak"
/// olur (vurgu/hardal rengi); yanlışta seri sıfırlanır ve renk ana renge döner.
/// Kırmızı/hata rengi kullanılmaz; renk tek başına anlam taşımaz, etiket de var.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dalga7]
library;

import 'package:flutter/painting.dart';

import '../tema/renkler.dart';

/// Kombonun görsel aşaması.
enum KomboAsamasi { normal, isinma, sicak }

abstract final class Kombo {
  /// Çubuğun ısınmaya başladığı ve sıcak olduğu art arda doğru sayıları.
  static const int isinmaEsigi = 3;
  static const int sicakEsigi = 5;

  /// Yeni serinin değeri: doğruysa bir artar, yanlışta sıfırlanır.
  static int sonraki(int seri, bool dogruMu) => dogruMu ? seri + 1 : 0;

  static KomboAsamasi asama(int seri) => seri >= sicakEsigi
      ? KomboAsamasi.sicak
      : seri >= isinmaEsigi
      ? KomboAsamasi.isinma
      : KomboAsamasi.normal;

  /// Aşamanın çubuk rengi; yalnızca tema renklerinden (kırmızı yok).
  static Color renk(AdimRenkleri r, KomboAsamasi a) => switch (a) {
    KomboAsamasi.normal => r.ana,
    KomboAsamasi.isinma => r.dogru,
    KomboAsamasi.sicak => r.vurgu,
  };

  /// "x3 seri" etiketi; seri eşiğin altındaysa null.
  static String? etiket(int seri) => seri >= isinmaEsigi ? 'x$seri seri' : null;
}
