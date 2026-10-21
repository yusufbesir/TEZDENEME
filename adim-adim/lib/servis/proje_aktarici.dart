/// Projeyi tek .html dosyası olarak cihaza kaydeder (ÖZELLİK 70). Uygulama
/// tarayıcı motoru içermediği için gerçek görünüm, kaydedilen dosyanın
/// cihazdaki tarayıcıda açılmasıyla görülür. Klasör: İndirilenler (yoksa
/// Belgeler). Ağ kullanılmaz.
library;

import 'dart:io';

import 'package:path/path.dart' as yol;
import 'package:path_provider/path_provider.dart';

abstract class ProjeAktarici {
  const ProjeAktarici();

  /// [kok].html adıyla kaydeder; kaydedilen tam yolu döndürür. Hata
  /// fırlatabilir (çağıran yakalar).
  Future<String> kaydet(String kok, String html);
}

class DosyaProjeAktarici extends ProjeAktarici {
  const DosyaProjeAktarici();

  @override
  Future<String> kaydet(String kok, String html) async {
    Directory? klasor;
    try {
      klasor = await getDownloadsDirectory();
    } catch (_) {
      klasor = null;
    }
    klasor ??= await getApplicationDocumentsDirectory();
    final dosya = File(yol.join(klasor.path, 'adim-adim-$kok.html'));
    await dosya.writeAsString(html, flush: true);
    return dosya.path;
  }
}
