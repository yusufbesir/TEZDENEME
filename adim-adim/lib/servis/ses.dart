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

  /// Son okumada olağandışı bir durum olduysa kısa not (tanı ekranı gösterir).
  String? sonUyari;

  /// Motoru ve [dil]'i hazırlar. Motor ya da dil yoksa istisna fırlatmadan
  /// false döner (çağıran false'u "ses yok" olarak gösterir).
  ///
  /// Windows eklentisi `isLanguageAvailable` yöntemini hiç bilmez
  /// (MissingPluginException); bu "motor yok" demek DEĞİLDİR. Önceki sürümde
  /// bu istisna ses motorunu kalıcı "yok" işaretleyip hoparlörü tamamen
  /// susturuyordu. Şimdi bilinmiyor sayılır, doğrudan `setLanguage` denenir;
  /// tam dil bulunamazsa aynı dil ailesinden ("en-GB") ya da varsayılan
  /// sesten yararlanılır.
  Future<bool> _dilHazirla(FlutterTts tts, String dil) async {
    if (_motorYok || _dilYok.contains(dil)) return false;
    try {
      var bilinmiyor = false;
      Object? uygun;
      try {
        uygun = await tts.isLanguageAvailable(dil);
      } on MissingPluginException {
        bilinmiyor = true;
      }
      if (!bilinmiyor && _basarisiz(uygun)) {
        _dilYok.add(dil);
        debugPrint('Ses dili yok, sessiz geçildi: $dil');
        return false;
      }
      if (_basarisiz(await tts.setLanguage(dil))) {
        if (!bilinmiyor) {
          _dilYok.add(dil);
          debugPrint('Ses dili yok, sessiz geçildi: $dil');
          return false;
        }
        // Windows: tam eşleşme yok; aynı aileden bir dil ara.
        final aile = dil.split(RegExp('[-_]')).first.toLowerCase();
        String? yedek;
        try {
          final diller = await tts.getLanguages;
          if (diller is List) {
            for (final d in diller) {
              final ad = d.toString();
              if (ad.toLowerCase().startsWith(aile)) {
                yedek = ad;
                break;
              }
            }
          }
        } catch (e) {
          debugPrint('Ses dilleri okunamadı: $e');
        }
        if (yedek != null && !_basarisiz(await tts.setLanguage(yedek))) {
          sonUyari = '$dil yok, $yedek kullanıldı';
          return true;
        }
        // Hiç eşleşme yok: sessiz kalmak yerine varsayılan sesle oku.
        sonUyari = '$dil sesi yok; varsayılan ses kullanıldı';
        debugPrint(sonUyari);
        return true;
      }
      sonUyari = null;
      return true;
    } on MissingPluginException {
      _motorYok = true;
      debugPrint('Ses motoru yok, sessiz geçildi');
      return false;
    }
  }

  /// Sorun giderme: motor, sesler, diller ve deneme okumasının sonucu.
  Future<String> tani({String dil = 'en-US'}) async {
    final b = StringBuffer();
    try {
      final tts = _tts ??= FlutterTts();
      b.writeln('Motor işaretli yok: $_motorYok');
      try {
        final diller = await tts.getLanguages;
        b.writeln('Diller: ${diller is List ? diller.join(', ') : diller}');
      } catch (e) {
        b.writeln('Diller okunamadı: $e');
      }
      try {
        final sesler = await tts.getVoices;
        final adlar = sesler is List
            ? sesler
                  .map((v) => v is Map ? '${v['name']} (${v['locale']})' : '$v')
                  .toList()
            : [sesler];
        b.writeln('Sesler (${adlar.length}): ${adlar.take(8).join('; ')}');
      } catch (e) {
        b.writeln('Sesler okunamadı: $e');
      }
      _motorYok = false;
      _dilYok.remove(dil);
      final ok = await oku('Sound test. One, two, three.', dil: dil);
      b.writeln('Deneme okuması ($dil): ${ok ? 'başlatıldı' : 'BAŞARISIZ'}');
      if (sonUyari != null) b.writeln('Uyarı: $sonUyari');
    } catch (e) {
      b.writeln('Tanı hatası: $e');
    }
    return b.toString().trim();
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
