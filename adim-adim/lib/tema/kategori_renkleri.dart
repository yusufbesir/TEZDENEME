/// Bilgi yarışması kategori renkleri ve simgeleri.
///
/// Bu dosya: 6 yarışma kategorisinin çark dilimi, üst bant ve taç rengi.
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: docs/SADE-ARAYUZ-VE-YARISMA.md
/// bölüm 5 tablosuyla uyumlu kalır, testler geçmeden değişmez; silme yalnız
/// Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
///
/// Renkler Okabe-Ito renk körlüğü güvenli paletinin mantığıyla seçildi;
/// koyu temada açıklık artırıldı. Hiçbir bilgi yalnızca renkle taşınmaz:
/// her kategorinin adı ve simgesi de gösterilir.
library;

import 'package:flutter/material.dart';

import '../yarisma/model.dart';

abstract final class KategoriRenkleri {
  static Color renk(YarismaKategori k, Brightness parlaklik) {
    final koyu = parlaklik == Brightness.dark;
    return switch (k) {
      YarismaKategori.genelKultur =>
        koyu ? const Color(0xFFF2A25C) : const Color(0xFFD55E00),
      YarismaKategori.tarih =>
        koyu ? const Color(0xFFF0BB3B) : const Color(0xFF856309),
      YarismaKategori.sanat =>
        koyu ? const Color(0xFFCC79A7) : const Color(0xFF7B3FA0),
      YarismaKategori.matematik =>
        koyu ? const Color(0xFF56B4E9) : const Color(0xFF0072B2),
      YarismaKategori.fen =>
        koyu ? const Color(0xFF51DAA7) : const Color(0xFF007E57),
      YarismaKategori.cografya =>
        koyu ? const Color(0xFF4FCDCD) : const Color(0xFF007277),
    };
  }

  /// Kategori renginin üstünde okunur metin rengi.
  static Color ustRenk(Brightness parlaklik) => parlaklik == Brightness.dark
      ? const Color(0xFF0B181C)
      : const Color(0xFFFCFCFC);

  static IconData simge(YarismaKategori k) => switch (k) {
    YarismaKategori.genelKultur => Icons.lightbulb_outline,
    YarismaKategori.tarih => Icons.account_balance_outlined,
    YarismaKategori.sanat => Icons.palette_outlined,
    YarismaKategori.matematik => Icons.calculate_outlined,
    YarismaKategori.fen => Icons.science_outlined,
    YarismaKategori.cografya => Icons.public_outlined,
  };
}
