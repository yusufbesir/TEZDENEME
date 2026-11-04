import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart' show MissingPluginException;
import 'package:flutter_tts/flutter_tts.dart';

/// flutter_tts sarmalayıcısı. Hatalar yutulur; ses yoksa uygulama çalışmaya devam eder.
/// Testte bu sınıf genişletilip `oku` geçersiz kılınır.
/// Dinleme hızı (SADE 8): [hizCarpani] temel hızı ölçekler; [okuHizla]
/// çarpanı yalnız o çağrı için uygular. yazan: [Claude#tts-hiz]
class Ses {
  Ses();

  FlutterTts? _tts;

  /// Konuşma hızı (0..1; flutter_tts ölçeği). Kelime defteri oynatıcısı
  /// (ÖZELLİK 82) hızı değiştirir; varsayılan 0,45.
  double konusmaHizi = 0.45;

  /// Kullanıcı hız çarpanı (ayar `sesHizi`, 0,7..1,2; 1,0 = temel hız).
  /// flutter_tts'e giden değer [ttsHizi] ile hesaplanır.
  double hizCarpani = 1.0;

  /// flutter_tts'e verilecek hız: temel hız × çarpan, 0..1 aralığına kırpılır.
  /// flutter_tts ölçeği platformlar arası 0..1'dir (Android/iOS'ta 0,5 doğal
  /// hız); temel hız (0,45) korunur, çarpan onu oransal ölçekler. Geçersiz
  /// (NaN, sonsuz, ≤0) çarpan 1,0 sayılır.
  static double ttsHizi(double temel, double carpan) {
    final c = (carpan.isFinite && carpan > 0) ? carpan : 1.0;
    return (temel * c).clamp(0.0, 1.0);
  }

  /// [oku] (ya da `yavas` ise [okuYavas]) gibi okur; [carpan] yalnız bu
  /// çağrı için uygulanır, sonra eski çarpan geri gelir. Böylece dinleme
  /// ekranındaki hız seçimi başka ekranlara (radyo, oynatıcı) sızmaz.
  Future<bool> okuHizla(
    String metin, {
    String dil = 'en-US',
    required double carpan,
    bool yavas = false,
  }) async {
    final eski = hizCarpani;
    hizCarpani = carpan;
    try {
      return yavas
          ? await okuYavas(metin, dil: dil)
          : await oku(metin, dil: dil);
    } finally {
      hizCarpani = eski;
    }
  }

  /// Süren okumayı keser (oynatıcı duraklatınca). Hata yutulur.
  Future<void> durdur() async {
    try {
      await _tts?.stop();
    } catch (e) {
      debugPrint('Ses durdurulamadı: $e');
    }
  }

  /// Yavaş okuma hızı (flutter_tts ölçeği; normal 0,45).
  static const double yavasHiz = 0.2;

  /// [oku] gibi okur ama konuşma hızı bu çağrı için [yavasHiz]'dır (dinleme
  /// sorularındaki "yavaş" düğmesi). Hız sonra eski değerine döner.
  Future<bool> okuYavas(String metin, {String dil = 'en-US'}) async {
    // Üst üste (çift dokunuş) çağrıda asıl hız yalnız ilk çağrıda saklanır;
    // ikinci çağrı yavaş hızı "eski hız" sanıp kalıcı bırakmasın.
    _kayitliHiz ??= konusmaHizi;
    konusmaHizi = yavasHiz;
    try {
      return await oku(metin, dil: dil);
    } finally {
      final kayitli = _kayitliHiz;
      if (kayitli != null) {
        konusmaHizi = kayitli;
        _kayitliHiz = null;
      }
    }
  }

  double? _kayitliHiz;

  /// Ses motoru bu cihazda yok (eklenti/motor bulunamadı); sonraki çağrılar
  /// boşuna denemez, sessizce false döner ("ses yok" durumu gösterilir).
  bool _motorYok = false;

  /// Motorun desteklemediği diller (ör. cihazda Türkçe ses paketi yok).
  final Set<String> _dilYok = {};

  /// flutter_tts bazı platformlarda başarısızlığı 0/false döndürür.
  static bool _basarisiz(Object? sonuc) => sonuc == 0 || sonuc == false;

  /// Motoru ve [dil]'i hazırlar. Motor ya da dil yoksa istisna fırlatmadan
  /// false döner (çağıran false'u "ses yok" olarak gösterir).
  Future<bool> _dilHazirla(FlutterTts tts, String dil) async {
    if (_motorYok || _dilYok.contains(dil)) return false;
    try {
      final uygun = await tts.isLanguageAvailable(dil);
      if (_basarisiz(uygun) || await tts.setLanguage(dil) == 0) {
        _dilYok.add(dil);
        debugPrint('Ses dili yok, sessiz geçildi: $dil');
        return false;
      }
      return true;
    } on MissingPluginException {
      _motorYok = true;
      debugPrint('Ses motoru yok, sessiz geçildi');
      return false;
    }
  }

  /// Başarıyla konuşma başlatıldıysa true; motor/dil yoksa ya da hata olursa
  /// fırlatmadan false.
  Future<bool> oku(String metin, {String dil = 'en-US'}) async {
    try {
      final tts = _tts ??= FlutterTts();
      if (!await _dilHazirla(tts, dil)) return false;
      await tts.setSpeechRate(ttsHizi(konusmaHizi, hizCarpani));
      await tts.stop();
      if (_basarisiz(await tts.speak(metin))) return false;
      return true;
    } on MissingPluginException {
      _motorYok = true;
      return false;
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
      if (_motorYok) return false;
      await tts.awaitSpeakCompletion(true);
      if (!await _dilHazirla(tts, dil)) return false;
      await tts.setSpeechRate(ttsHizi(konusmaHizi, hizCarpani));
      await tts.stop();
      if (_basarisiz(await tts.speak(metin).timeout(enCok))) return false;
      return true;
    } on MissingPluginException {
      _motorYok = true;
      return false;
    } catch (e) {
      debugPrint('Ses okunamadı: $e');
      return false;
    }
  }
}
