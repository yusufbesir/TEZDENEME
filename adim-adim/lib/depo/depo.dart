/// Kalıcılık katmanı: öğrenci durumunu yükler/kaydeder.
/// Okuma hiçbir koşulda fırlatmaz; bozuk veri varsayılan duruma döner.
library;

import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

import '../model/durum.dart';

abstract class Depo {
  Future<OgrenciDurumu> yukle();
  Future<void> kaydet(OgrenciDurumu d);
  Future<void> sifirla();
}

/// Bellekte tutan depo; testler ve önizleme için.
class BellekDepo implements Depo {
  BellekDepo([OgrenciDurumu? ilk]) : _durum = ilk ?? const OgrenciDurumu();

  OgrenciDurumu _durum;

  @override
  Future<OgrenciDurumu> yukle() async => _durum;

  @override
  Future<void> kaydet(OgrenciDurumu d) async {
    _durum = d;
  }

  @override
  Future<void> sifirla() async {
    _durum = const OgrenciDurumu();
  }
}

/// Dosyada tutan depo: `<klasor>/adimadim/durum.v1.json`.
class DosyaDepo implements Depo {
  DosyaDepo(this.klasor);

  /// Uygulama destek klasörünü (path_provider) kullanır. Flutter gerekir.
  static Future<DosyaDepo> varsayilan() async =>
      DosyaDepo(await getApplicationSupportDirectory());

  /// En büyük kabul edilen dosya boyutu (2 MB).
  static const int enBuyukBayt = 2 * 1024 * 1024;

  final Directory klasor;

  File get _dosya => File(
    '${klasor.path}${Platform.pathSeparator}adimadim${Platform.pathSeparator}durum.v1.json',
  );
  File get _gecici => File('${_dosya.path}.tmp');

  @override
  Future<OgrenciDurumu> yukle() async {
    try {
      final f = _dosya;
      if (!await f.exists()) return const OgrenciDurumu();
      if (await f.length() > enBuyukBayt) return const OgrenciDurumu();
      final metin = utf8.decode(await f.readAsBytes());
      return OgrenciDurumu.fromJson(jsonDecode(metin));
    } catch (_) {
      return const OgrenciDurumu();
    }
  }

  @override
  Future<void> kaydet(OgrenciDurumu d) async {
    final f = _dosya;
    await f.parent.create(recursive: true);
    final gecici = _gecici;
    // Önce geçici dosyaya yaz ve diske aktar, sonra yeniden adlandır (atomik).
    await gecici.writeAsString(jsonEncode(d.toJson()), flush: true);
    await gecici.rename(f.path);
  }

  @override
  Future<void> sifirla() async {
    for (final f in [_dosya, _gecici]) {
      try {
        if (await f.exists()) await f.delete();
      } catch (_) {
        // Silinemeyen dosya sessizce yok sayılır.
      }
    }
  }
}
