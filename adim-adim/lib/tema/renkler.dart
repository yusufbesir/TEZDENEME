import 'package:flutter/material.dart';

/// Adım Adım renk belirteçleri.
///
/// Renkler OKLCH (algısal olarak düzgün) uzayında seçildi ve sRGB'ye çevrildi.
/// Her açıklık (L) kademesi iki temada da aynı mantıkla kurulur; böylece açık
/// ve koyu tema arasında renk ilişkileri korunur. Bütün metin renkleri kendi
/// zeminlerinde WCAG 2.2 AA (en az 4.5:1) kontrastını sağlar; değerler
/// `docs/TASARIM.md` içinde tablo halinde verilmiştir.
///
/// Ana renk petrol/teal: Duolingo yeşili, Busuu turuncusu/mavisi, Memrise moru
/// ve Mimo'nun koyu-neon diliyle çakışmaz. Doğru (yeşil-mavi) ve hata (kızıl-
/// turuncu) renkleri Okabe-Ito renk körlüğü güvenli paletinin ton
/// mantığıyla seçildi; kırmızı-yeşil ayrımına dayanmaz ve her geri bildirim
/// ayrıca simge ve metinle verilir.
class AdimRenkleri extends ThemeExtension<AdimRenkleri> {
  const AdimRenkleri({
    required this.zemin,
    required this.yuzey,
    required this.metin,
    required this.metinIkincil,
    required this.ana,
    required this.anaUstu,
    required this.vurgu,
    required this.dogru,
    required this.hata,
    required this.kenar,
  });

  final Color zemin; // sayfa arka planı
  final Color yuzey; // kart, panel
  final Color metin;
  final Color metinIkincil;
  final Color ana; // petrol/teal, birincil eylem
  final Color anaUstu; // ana rengin üstündeki metin
  final Color vurgu; // hardal, rozet/seri/XP
  final Color dogru; // yeşil-mavi
  final Color hata; // kızıl-turuncu
  final Color kenar;

  /// Açık tema. OKLCH değerleri yorumlarda.
  static const acik = AdimRenkleri(
    zemin: Color(0xFFF7FBFB), // oklch(0.985 0.004 200)
    yuzey: Color(0xFFEAF2F2), // oklch(0.955 0.008 200)
    metin: Color(0xFF172428), // oklch(0.25 0.02 220)   15.3:1
    metinIkincil: Color(0xFF526065), // oklch(0.48 0.02 220)  6.3:1
    ana: Color(0xFF007277), // oklch(0.50 0.09 200)   5.5:1
    anaUstu: Color(0xFFFCFCFC),
    vurgu: Color(0xFF856309), // oklch(0.52 0.11 85)   5.2:1
    dogru: Color(0xFF007E57), // oklch(0.52 0.12 165)  4.9:1
    hata: Color(0xFFBF4306), // oklch(0.55 0.17 40)    5.0:1
    kenar: Color(0xFFCAD3D3), // oklch(0.86 0.01 200)
  );

  /// Koyu tema: saf siyah yerine düşük kromalı koyu petrol zemin; vurgu
  /// renklerinin açıklığı artırıldı, kroması hafif düşürüldü.
  static const koyu = AdimRenkleri(
    zemin: Color(0xFF10171A), // oklch(0.20 0.012 220)
    yuzey: Color(0xFF1D2629), // oklch(0.26 0.014 220)
    metin: Color(0xFFE7F1F1), // oklch(0.95 0.01 200)   15.7:1
    metinIkincil: Color(0xFFA4B1B2), // oklch(0.75 0.015 200)  8.2:1
    ana: Color(0xFF4FCDCD), // oklch(0.78 0.11 195)   9.4:1
    anaUstu: Color(0xFF0B181C),
    vurgu: Color(0xFFF0BB3B), // oklch(0.82 0.15 85)  10.2:1
    dogru: Color(0xFF51DAA7), // oklch(0.80 0.14 165) 10.3:1
    hata: Color(0xFFFF8D64), // oklch(0.76 0.15 40)    8.0:1
    kenar: Color(0xFF353F43), // oklch(0.36 0.015 220)
  );

  @override
  AdimRenkleri copyWith({
    Color? zemin,
    Color? yuzey,
    Color? metin,
    Color? metinIkincil,
    Color? ana,
    Color? anaUstu,
    Color? vurgu,
    Color? dogru,
    Color? hata,
    Color? kenar,
  }) {
    return AdimRenkleri(
      zemin: zemin ?? this.zemin,
      yuzey: yuzey ?? this.yuzey,
      metin: metin ?? this.metin,
      metinIkincil: metinIkincil ?? this.metinIkincil,
      ana: ana ?? this.ana,
      anaUstu: anaUstu ?? this.anaUstu,
      vurgu: vurgu ?? this.vurgu,
      dogru: dogru ?? this.dogru,
      hata: hata ?? this.hata,
      kenar: kenar ?? this.kenar,
    );
  }

  @override
  AdimRenkleri lerp(AdimRenkleri? other, double t) {
    if (other == null) return this;
    return AdimRenkleri(
      zemin: Color.lerp(zemin, other.zemin, t)!,
      yuzey: Color.lerp(yuzey, other.yuzey, t)!,
      metin: Color.lerp(metin, other.metin, t)!,
      metinIkincil: Color.lerp(metinIkincil, other.metinIkincil, t)!,
      ana: Color.lerp(ana, other.ana, t)!,
      anaUstu: Color.lerp(anaUstu, other.anaUstu, t)!,
      vurgu: Color.lerp(vurgu, other.vurgu, t)!,
      dogru: Color.lerp(dogru, other.dogru, t)!,
      hata: Color.lerp(hata, other.hata, t)!,
      kenar: Color.lerp(kenar, other.kenar, t)!,
    );
  }
}

extension AdimRenkBaglami on BuildContext {
  AdimRenkleri get renkler => Theme.of(this).extension<AdimRenkleri>()!;
}
