/// Alan (İngilizce / Programlama) vurgu renkleri.
///
/// Bu dosya: eğitim alanlarının başlık ve sahanlık bandında kullanılan vurgu
/// renkleri. Sahibi Yusuf (yusufbesir). Değiştirme kuralı: renkler
/// docs/SADE-ARAYUZ-VE-YARISMA.md bölüm 7 ile uyumlu kalır, testler geçmeden
/// değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
///
/// Dayanak: mavi açıklık/yaratıcılık (Mehta & Zhu 2009), yeşil dikkat
/// yenilenmesi (Kaplan 1995; Lichtenfeld ve ark. 2012). Renkler Okabe-Ito
/// renk körlüğü güvenli paletinden; yalnızca başlıkta kullanılır, eylem
/// düğmeleri ana renkte kalır.
library;

import 'package:flutter/material.dart';

import '../model/icerik.dart';

abstract final class AlanRenkleri {
  /// İngilizce: mavi.
  static const Color dilAcik = Color(0xFF0072B2); // 5.6:1 açık zeminde
  static const Color dilKoyu = Color(0xFF56B4E9);

  /// Programlama: yeşil-mavi.
  static const Color kodAcik = Color(0xFF007E57);
  static const Color kodKoyu = Color(0xFF51DAA7);

  /// Alan kimliğine ('dil' | 'kod') göre vurgu rengi.
  static Color renk(String? alan, Brightness parlaklik) {
    final koyu = parlaklik == Brightness.dark;
    return switch (alan) {
      'kod' => koyu ? kodKoyu : kodAcik,
      _ => koyu ? dilKoyu : dilAcik,
    };
  }

  static Color kursRengi(KursAlani alan, Brightness parlaklik) =>
      renk(alan == KursAlani.kod ? 'kod' : 'dil', parlaklik);

  /// Alan adı (Türkçe, arayüzde gösterilen).
  static String ad(String? alan) => switch (alan) {
    'kod' => 'Programlama',
    'dil' => 'İngilizce',
    _ => 'Alan seçilmedi',
  };

  static IconData simge(String? alan) => switch (alan) {
    'kod' => Icons.code,
    _ => Icons.translate,
  };
}
