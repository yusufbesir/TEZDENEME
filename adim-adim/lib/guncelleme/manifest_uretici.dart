/// Bir klasörden sürüm manifesti üretir (tool/manifest_olustur.dart kullanır).
/// Bağlantıları (symlink/junction) izlemez ve manifeste almaz.
library;

import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';

import 'manifest.dart';

/// Dosyanın SHA-256 değerini (küçük harf hex) akıştan hesaplar.
Future<String> dosyaSha256(File dosya) async {
  final ozet = await sha256.bind(dosya.openRead()).first;
  return ozet.toString();
}

/// [klasor] altındaki normal dosyaları yürür; kökteki manifest dosyalarını
/// ve bağlantıları atlar. Yollar `/` ayırıcılı ve sıralıdır.
Future<SurumManifesti> manifestUret(Directory klasor, String surum) async {
  if (surum.trim().isEmpty) {
    throw ArgumentError('surum boş olamaz');
  }
  final kok = klasor.absolute.path;
  final dosyalar = <ManifestDosyasi>[];
  await for (final e in klasor.list(recursive: true, followLinks: false)) {
    if (e is! File) continue; // Link ve Directory atlanır.
    var goreli = e.path.substring(kok.length);
    goreli = goreli.replaceAll('\\', '/');
    while (goreli.startsWith('/')) {
      goreli = goreli.substring(1);
    }
    if (goreli == surumManifestAdi || goreli == eskiManifestAdi) continue;
    final hata = yolHatasi(goreli);
    if (hata != null) {
      throw ManifestHatasi('manifest için uygun olmayan yol "$goreli": $hata');
    }
    dosyalar.add(
      ManifestDosyasi(
        yol: goreli,
        boyut: await e.length(),
        sha256: await dosyaSha256(e),
      ),
    );
  }
  dosyalar.sort((a, b) => a.yol.compareTo(b.yol));
  return SurumManifesti(surum: surum, dosyalar: dosyalar);
}

/// Manifesti [klasor]/surum.manifest.json olarak yazar; yazılan dosyayı döner.
Future<File> manifestYaz(Directory klasor, String surum) async {
  final m = await manifestUret(klasor, surum);
  final f = File('${klasor.path}${Platform.pathSeparator}$surumManifestAdi');
  await f.writeAsString(
    '${const JsonEncoder.withIndent('  ').convert(m.toJson())}\n',
  );
  return f;
}
