/// Tasarım sabitleri, kırılma noktaları (dar/orta/geniş) ve açık/koyu tema.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Kırılma noktaları ve metin ölçeği sınırı yalnız burada tanımlanır.
/// `kisaSayi` ve `siganMetin`: yazıyı küçültmeden sığdırma yardımcıları.
library;

import 'package:flutter/material.dart';

import 'renkler.dart';

export 'renkler.dart';

/// Tasarım sabitleri: köşe 16, dokunma hedefi en az 48, boşluk 8'in katları.
abstract final class Olcu {
  static const double kose = 16;
  static const double hedef = 48;
  static const double b1 = 8;
  static const double b2 = 16;
  static const double b3 = 24;
  static const double b4 = 32;
  static const double icerikGenislik = 720;

  // Kırılma noktaları (pencere genişliği, mantıksal px) — tek yerde.
  /// Altı: dar (alt gezinme çubuğu, tek sütun, 56 px hedef halkası).
  static const double darEkran = 600;

  /// 600–899: orta (daraltılmış NavigationRail, tek sütun).
  /// >= 900: geniş (genişletilmiş rail; yeterli yer varsa iki sütun).
  static const double genisEkran = 900;

  /// Rail genişlikleri (daraltılmış / genişletilmiş) ve ayırıcı çizgi.
  static const double railDar = 80;
  static const double railGenis = 180;

  /// Yol sütununun en az genişliği ve yan panelin sınırları.
  static const double yolMinGenislik = 360;
  static const double panelMin = 300;
  static const double panelMax = 420;

  /// Metin ölçeği sınırları: hiçbir yerde 1,0'ın altına inmez.
  static const double metinOlcekEn = 1.0;
  static const double metinOlcekEnCok = 1.3;

  static bool dar(double genislik) => genislik < darEkran;
  static bool genis(double genislik) => genislik >= genisEkran;

  /// Animasyonlar en çok 250 ms; sistem animasyonları kapattıysa 0.
  static Duration sure(BuildContext context, [int ms = 200]) {
    final kisa = ms > 250 ? 250 : ms;
    return MediaQuery.maybeDisableAnimationsOf(context) == true
        ? Duration.zero
        : Duration(milliseconds: kisa);
  }
}

/// Büyük sayıyı kısaltır: 999 ve altı olduğu gibi, üstü "1,2k" biçiminde.
String kisaSayi(int n) {
  if (n.abs() < 1000) return '$n';
  final bin = n.abs() / 1000;
  final metin = bin >= 100 || bin == bin.roundToDouble()
      ? bin.round().toString()
      : bin.toStringAsFixed(1).replaceAll('.', ',');
  return '${n < 0 ? '-' : ''}${metin}k';
}

/// Metnin yazı boyutunu KÜÇÜLTMEDEN sığdırır: önce stiller (büyükten küçüğe),
/// her stilde adaylar (uzundan kısaya) denenir; ilk sığan döner. Hiçbiri
/// sığmazsa son stil + son aday döner (taşan kısım ellipsis ile kesilir).
/// Yazı boyutu hiçbir zaman verilen stillerin en küçüğünün altına inmez.
({String metin, TextStyle stil}) siganMetin(
  BuildContext context, {
  required List<String> adaylar,
  required List<TextStyle> stiller,
  required double genislik,
}) {
  final olcek = MediaQuery.textScalerOf(context);
  for (final stil in stiller) {
    for (final aday in adaylar) {
      final tp = TextPainter(
        text: TextSpan(text: aday, style: stil),
        textDirection: TextDirection.ltr,
        textScaler: olcek,
        maxLines: 1,
      )..layout();
      if (tp.width <= genislik) return (metin: aday, stil: stil);
    }
  }
  return (metin: adaylar.last, stil: stiller.last);
}

const String yaziBaslik = 'Nunito';
const String yaziGovde = 'Inter';
const String yaziKod = 'JetBrainsMono';

ThemeData acikTema() => _tema(Brightness.light, AdimRenkleri.acik);
ThemeData koyuTema() => _tema(Brightness.dark, AdimRenkleri.koyu);

ThemeData _tema(Brightness parlaklik, AdimRenkleri r) {
  final sema = ColorScheme(
    brightness: parlaklik,
    primary: r.ana,
    onPrimary: r.anaUstu,
    secondary: r.vurgu,
    onSecondary: r.anaUstu,
    error: r.hata,
    onError: r.anaUstu,
    surface: r.zemin,
    onSurface: r.metin,
    onSurfaceVariant: r.metinIkincil,
    outline: r.kenar,
    outlineVariant: r.kenar,
    surfaceContainerLowest: r.zemin,
    surfaceContainerLow: r.yuzey,
    surfaceContainer: r.yuzey,
    surfaceContainerHigh: r.yuzey,
    surfaceContainerHighest: r.yuzey,
    primaryContainer: r.yuzey,
    onPrimaryContainer: r.metin,
    secondaryContainer: r.yuzey,
    onSecondaryContainer: r.metin,
  );

  final taban = ThemeData(brightness: parlaklik).textTheme.apply(
    fontFamily: yaziGovde,
    bodyColor: r.metin,
    displayColor: r.metin,
  );
  TextStyle? baslik(TextStyle? s) =>
      s?.copyWith(fontFamily: yaziBaslik, fontWeight: FontWeight.w700);
  final yazi = taban.copyWith(
    displayLarge: baslik(taban.displayLarge),
    displayMedium: baslik(taban.displayMedium),
    displaySmall: baslik(taban.displaySmall),
    headlineLarge: baslik(taban.headlineLarge),
    headlineMedium: baslik(taban.headlineMedium),
    headlineSmall: baslik(taban.headlineSmall),
    titleLarge: baslik(taban.titleLarge),
    titleMedium: baslik(taban.titleMedium)?.copyWith(fontSize: 16),
  );

  final sekil = RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(Olcu.kose),
  );
  const minBoyut = Size(Olcu.hedef, Olcu.hedef);

  return ThemeData(
    useMaterial3: true,
    brightness: parlaklik,
    colorScheme: sema,
    scaffoldBackgroundColor: r.zemin,
    canvasColor: r.zemin,
    textTheme: yazi,
    extensions: <ThemeExtension<dynamic>>[r],
    appBarTheme: AppBarTheme(
      backgroundColor: r.zemin,
      foregroundColor: r.metin,
      elevation: 0,
      scrolledUnderElevation: 0,
      titleTextStyle: yazi.titleLarge,
    ),
    cardTheme: CardThemeData(
      color: r.yuzey,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(Olcu.kose),
        side: BorderSide(color: r.kenar),
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(Olcu.hedef, 56),
        shape: sekil,
        textStyle: yazi.titleMedium,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: minBoyut,
        shape: sekil,
        side: BorderSide(color: r.kenar),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(minimumSize: minBoyut, shape: sekil),
    ),
    iconButtonTheme: IconButtonThemeData(
      style: IconButton.styleFrom(minimumSize: minBoyut),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: r.yuzey,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Olcu.kose),
        borderSide: BorderSide(color: r.kenar),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Olcu.kose),
        borderSide: BorderSide(color: r.kenar),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(Olcu.kose),
        borderSide: BorderSide(color: r.ana, width: 2),
      ),
    ),
    chipTheme: ChipThemeData(
      shape: sekil,
      side: BorderSide(color: r.kenar),
      backgroundColor: r.yuzey,
      selectedColor: r.ana,
      labelStyle: yazi.bodyMedium,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: r.yuzey,
      indicatorColor: r.ana,
      iconTheme: WidgetStateProperty.resolveWith(
        (durumlar) => IconThemeData(
          color: durumlar.contains(WidgetState.selected)
              ? r.anaUstu
              : r.metinIkincil,
        ),
      ),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (durumlar) => yazi.labelMedium!.copyWith(
          color: durumlar.contains(WidgetState.selected)
              ? r.metin
              : r.metinIkincil,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
    navigationRailTheme: NavigationRailThemeData(
      backgroundColor: r.yuzey,
      indicatorColor: r.ana,
      selectedIconTheme: IconThemeData(color: r.anaUstu),
      unselectedIconTheme: IconThemeData(color: r.metinIkincil),
      selectedLabelTextStyle: yazi.labelMedium!.copyWith(
        color: r.metin,
        fontWeight: FontWeight.w600,
      ),
      unselectedLabelTextStyle: yazi.labelMedium!.copyWith(
        color: r.metinIkincil,
      ),
    ),
    dividerTheme: DividerThemeData(color: r.kenar, space: 1),
    dialogTheme: DialogThemeData(backgroundColor: r.zemin, shape: sekil),
    progressIndicatorTheme: ProgressIndicatorThemeData(
      color: r.ana,
      linearTrackColor: r.kenar,
    ),
    sliderTheme: SliderThemeData(
      activeTrackColor: r.ana,
      inactiveTrackColor: r.kenar,
      thumbColor: r.ana,
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith(
        (d) => d.contains(WidgetState.selected) ? r.anaUstu : r.metinIkincil,
      ),
      trackColor: WidgetStateProperty.resolveWith(
        (d) => d.contains(WidgetState.selected) ? r.ana : r.yuzey,
      ),
      trackOutlineColor: WidgetStateProperty.resolveWith(
        (d) => d.contains(WidgetState.selected) ? r.ana : r.metinIkincil,
      ),
    ),
  );
}
