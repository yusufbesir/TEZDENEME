import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'depo/depo.dart';
import 'durum/saglayicilar.dart';
import 'guncelleme/eski_surum_temizleyici.dart';
import 'servis/konusma_sherpa.dart';
import 'uygulama.dart';
import 'yarisma/depo.dart';
import 'yarisma/saglayicilar.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  _lisanslariKaydet();
  Depo depo;
  try {
    depo = await DosyaDepo.varsayilan();
  } catch (e) {
    debugPrint('Dosya deposu açılamadı, bellek deposu kullanılıyor: $e');
    depo = BellekDepo();
  }
  YarismaDepo yarismaDepo;
  try {
    yarismaDepo = await DosyaYarismaDepo.varsayilan();
  } catch (e) {
    debugPrint('Yarışma deposu açılamadı, bellek deposu kullanılıyor: $e');
    yarismaDepo = BellekYarismaDepo();
  }
  runApp(
    ProviderScope(
      overrides: [
        depoProvider.overrideWithValue(depo),
        yarismaDepoProvider.overrideWithValue(yarismaDepo),
        // Çevrimdışı konuşma tanıma yalnız Windows'ta; model yoksa hazır değil.
        if (Platform.isWindows)
          konusmaProvider.overrideWithValue(SherpaKonusma()),
      ],
      child: const AdimAdimUygulama(),
    ),
  );
  // Yalnızca Windows: eski sürüm dosyalarını arka planda temizle.
  if (Platform.isWindows) unawaited(_eskiSurumuTemizle());
}

/// Kullanıcıyı bloklamaz; hata fırlatmaz, sonucu Türkçe loglar.
Future<void> _eskiSurumuTemizle() async {
  try {
    final s = await EskiSurumTemizleyici.varsayilan().calistir();
    debugPrint(
      'Eski sürüm temizliği: ${s.durum.name}; silinen ${s.silinen.length}, '
      'atlanan ${s.atlanan.length}, hata ${s.hatalar.length}',
    );
    for (final h in s.hatalar) {
      debugPrint('Eski sürüm temizliği hatası: $h');
    }
  } catch (e) {
    debugPrint('Eski sürüm temizliği başarısız: $e');
  }
}

/// Yazı tipi lisanslarını (SIL OFL) uygulama lisans sayfasına ekler.
void _lisanslariKaydet() {
  const dosyalar = {
    'Nunito': 'assets/fonts/OFL-nunito.txt',
    'Inter': 'assets/fonts/OFL-inter.txt',
    'JetBrains Mono': 'assets/fonts/OFL-jetbrainsmono.txt',
  };
  LicenseRegistry.addLicense(() async* {
    for (final e in dosyalar.entries) {
      final metin = await rootBundle.loadString(e.value);
      yield LicenseEntryWithLineBreaks([e.key], metin);
    }
  });
}
