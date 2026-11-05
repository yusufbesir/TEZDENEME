/// Windows ses yedeği: flutter_tts (WinRT) cihazda dili bulamazsa (ör. yalnız Türkçe
/// OneCore sesi kurulu) yüklü SAPI sesiyle (System.Speech) okur. Metin komut satırına
/// GÖMÜLMEZ; ortam değişkeniyle geçer (komut enjeksiyonu yok). Başka platformda kullanılmaz.
/// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım özellikler#cihaz] Claude
/// Yalnız onu yazan yapay zekâ değiştirir; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';

/// Okunacak metnin en çok uzunluğu (karakter).
const int sapiEnFazlaMetin = 2000;

/// flutter_tts hızını (0..1, 0,5 doğal) SAPI hızına (-10..10) çevirir.
int sapiHizi(double ttsHizi) {
  if (!ttsHizi.isFinite) return 0;
  return ((ttsHizi - 0.5) * 20).round().clamp(-10, 10);
}

/// Dil kodunu (en-US, tr_TR, de) SAPI kültür önekine çevirir: yalnız harf, en çok 3.
String sapiDilOnEki(String dil) {
  final m = RegExp(r'^[A-Za-z]{2,3}').firstMatch(dil.trim());
  return (m?.group(0) ?? 'en').toLowerCase();
}

const String _betik =
    r"Add-Type -AssemblyName System.Speech; "
    r"$s = New-Object System.Speech.Synthesis.SpeechSynthesizer; "
    r"$o = $env:ADIM_DIL; "
    r"$v = $s.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -like ($o + '*') } | Select-Object -First 1; "
    r"if (-not $v) { exit 3 }; "
    r"$s.SelectVoice($v.VoiceInfo.Name); "
    r"$s.Rate = [int]$env:ADIM_HIZ; "
    r"$s.Speak($env:ADIM_METIN)";

class SesWindowsYedek {
  Process? _surec;

  static bool get kullanilabilir => !kIsWeb && Platform.isWindows;

  /// Okumayı başlatır. Ses/dil yoksa ya da başlamazsa false. [bekle] true ise
  /// okuma bitene ya da [enCok] dolana kadar bekler.
  Future<bool> oku(
    String metin, {
    required String dil,
    required double ttsHizi,
    bool bekle = false,
    Duration enCok = const Duration(seconds: 30),
  }) async {
    if (!kullanilabilir) return false;
    final temiz = metin.trim();
    if (temiz.isEmpty) return false;
    await durdur();
    try {
      final govde = temiz.length > sapiEnFazlaMetin
          ? temiz.substring(0, sapiEnFazlaMetin)
          : temiz;
      final surec = await Process.start(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          _betik,
        ],
        environment: {
          'ADIM_DIL': sapiDilOnEki(dil),
          'ADIM_HIZ': '${sapiHizi(ttsHizi)}',
          'ADIM_METIN': govde,
        },
        runInShell: false,
      );
      _surec = surec;
      // Çıktıları boşalt (tampon dolup takılmasın).
      unawaited(surec.stdout.drain<void>());
      unawaited(surec.stderr.drain<void>());
      if (bekle) {
        final kod = await surec.exitCode.timeout(
          enCok,
          onTimeout: () {
            surec.kill();
            return 0;
          },
        );
        return kod == 0;
      }
      // Hemen biten (ses yok = 3) süreç başarısızdır; sürüyorsa başladı sayılır.
      final erken = await surec.exitCode
          .then<int?>((k) => k)
          .timeout(const Duration(milliseconds: 1500), onTimeout: () => null);
      return erken == null || erken == 0;
    } catch (e) {
      debugPrint('Windows ses yedeği çalışmadı: $e');
      return false;
    }
  }

  /// Süren okumayı keser (yalnız kendi başlattığı süreci).
  Future<void> durdur() async {
    final s = _surec;
    _surec = null;
    try {
      s?.kill();
    } catch (_) {}
  }
}
