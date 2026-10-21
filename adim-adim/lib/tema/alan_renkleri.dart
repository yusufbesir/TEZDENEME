/// Alan (İngilizce / Programlama / Oyunlar) vurgu renkleri.
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

  /// Oyunlar (satranç): Okabe-Ito turuncusunun koyulaştırılmışı (açık
  /// zeminde yaklaşık 5:1) ve kendisi (koyu zeminde).
  static const Color oyunAcik = Color(0xFFA85000);
  static const Color oyunKoyu = Color(0xFFE69F00);

  /// Alan kimliğine ('dil' | 'kod' | 'oyun') göre vurgu rengi.
  static Color renk(String? alan, Brightness parlaklik) {
    final koyu = parlaklik == Brightness.dark;
    return switch (alan) {
      'kod' => koyu ? kodKoyu : kodAcik,
      'oyun' => koyu ? oyunKoyu : oyunAcik,
      _ => koyu ? dilKoyu : dilAcik,
    };
  }

  static Color kursRengi(KursAlani alan, Brightness parlaklik) =>
      renk(alan.name, parlaklik);

  /// Alan adı (Türkçe, arayüzde gösterilen).
  static String ad(String? alan) => switch (alan) {
    'kod' => 'Programlama',
    'dil' => 'İngilizce',
    'oyun' => 'Oyunlar',
    _ => 'Alan seçilmedi',
  };

  static IconData simge(String? alan) => switch (alan) {
    'kod' => Icons.code,
    'oyun' => Icons.extension,
    _ => Icons.translate,
  };
}
