import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';

/// flutter_tts sarmalayıcısı. Hatalar yutulur; ses yoksa uygulama çalışmaya devam eder.
/// Testte bu sınıf genişletilip `oku` geçersiz kılınır.
class Ses {
  Ses();

  FlutterTts? _tts;

  /// Başarıyla konuşma başlatıldıysa true; hata olursa false.
  Future<bool> oku(String metin, {String dil = 'en-US'}) async {
    try {
      final tts = _tts ??= FlutterTts();
      await tts.setLanguage(dil);
      await tts.setSpeechRate(0.45);
      await tts.stop();
      await tts.speak(metin);
      return true;
    } catch (e) {
      debugPrint('Ses okunamadı: $e');
      return false;
    }
  }
}
