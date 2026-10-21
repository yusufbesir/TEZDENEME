import 'package:flutter/foundation.dart';
import 'package:flutter_tts/flutter_tts.dart';

/// flutter_tts sarmalayıcısı. Hatalar yutulur; ses yoksa uygulama çalışmaya devam eder.
/// Testte bu sınıf genişletilip `oku` geçersiz kılınır.
class Ses {
  Ses();

  FlutterTts? _tts;

  /// Konuşma hızı (0..1; flutter_tts ölçeği). Kelime defteri oynatıcısı
  /// (ÖZELLİK 82) hızı değiştirir; varsayılan 0,45.
  double konusmaHizi = 0.45;

  /// Süren okumayı keser (oynatıcı duraklatınca). Hata yutulur.
  Future<void> durdur() async {
    try {
      await _tts?.stop();
    } catch (e) {
      debugPrint('Ses durdurulamadı: $e');
    }
  }

  /// Başarıyla konuşma başlatıldıysa true; hata olursa false.
  Future<bool> oku(String metin, {String dil = 'en-US'}) async {
    try {
      final tts = _tts ??= FlutterTts();
      await tts.setLanguage(dil);
      await tts.setSpeechRate(konusmaHizi);
      await tts.stop();
      await tts.speak(metin);
      return true;
    } catch (e) {
      debugPrint('Ses okunamadı: $e');
      return false;
    }
  }

  /// [oku] gibi okur ama okuma BİTENE kadar bekler (eller serbest mod ve
  /// radyo: sıradaki adım ses bitince başlar). [enCok] güvenlik sınırıdır;
  /// TTS bitiş bildirmezse bile akış takılmaz. Hata olursa false.
  Future<bool> okuBekle(
    String metin, {
    String dil = 'en-US',
    Duration enCok = const Duration(seconds: 20),
  }) async {
    try {
      final tts = _tts ??= FlutterTts();
      await tts.awaitSpeakCompletion(true);
      await tts.setLanguage(dil);
      await tts.setSpeechRate(konusmaHizi);
      await tts.stop();
      await tts.speak(metin).timeout(enCok);
      return true;
    } catch (e) {
      debugPrint('Ses okunamadı: $e');
      return false;
    }
  }
}
