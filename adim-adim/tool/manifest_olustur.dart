// Kullanım: dart run tool/manifest_olustur.dart <klasor> <surum>
// Klasörü yürür, <klasor>/surum.manifest.json dosyasını yazar.
import 'dart:io';

import 'package:adim_adim/guncelleme/manifest_uretici.dart';

Future<void> main(List<String> args) async {
  if (args.length != 2) {
    stderr.writeln(
      'Kullanım: dart run tool/manifest_olustur.dart <klasor> <surum>',
    );
    exit(64);
  }
  final klasor = Directory(args[0]);
  if (!await klasor.exists()) {
    stderr.writeln('Klasör yok: ${args[0]}');
    exit(66);
  }
  try {
    final f = await manifestYaz(klasor, args[1]);
    stdout.writeln('Manifest yazıldı: ${f.path}');
  } catch (e) {
    stderr.writeln('Manifest üretilemedi: $e');
    exit(1);
  }
}
