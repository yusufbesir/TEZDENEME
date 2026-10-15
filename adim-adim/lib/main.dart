import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'depo/depo.dart';
import 'durum/saglayicilar.dart';
import 'uygulama.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
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
