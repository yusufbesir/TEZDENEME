import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'depo/depo.dart';
import 'durum/saglayicilar.dart';
import 'uygulama.dart';

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
  runApp(ProviderScope(
    overrides: [depoProvider.overrideWithValue(depo)],
    child: const AdimAdimUygulama(),
  ));
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
