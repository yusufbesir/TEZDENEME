/// Gerçek konuşma tanıma (ÖZELLİK 8.7): sherpa-onnx (çevrimdışı, Apache-2.0)
/// ile akışlı İngilizce tanıma; ses `record` paketiyle mikrofondan alınır.
///
/// Yalnız Windows'ta ve model klasörü varsa hazırdır; her şey try/catch ile
/// sarılıdır, hata olursa `false` / boş akış döner (uygulama çökmez, arayüz
/// "Bu alıştırmayı atla" sunar). Model dosyaları depoya eklenmez ve kendiliğinden
/// indirilmez; kurulum: `docs/KONUSMA-TANIMA-KURULUM.md`.
/// BU DOSYA KONTEYNERDE ÇALIŞTIRILAMAZ (mikrofon ve Windows yok): cihazda
/// doğrulanacak.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:sherpa_onnx/sherpa_onnx.dart' as sherpa;

import 'konusma.dart';

/// sherpa-onnx tabanlı çevrimdışı tanıma.
class SherpaKonusma implements KonusmaTanima {
  SherpaKonusma({this.modelYolu});

  /// Model klasörü. null ise uygulama destek dizini altında
  /// [varsayilanModelAdi] kullanılır.
  String? modelYolu;

  /// Varsayılan klasör adı: `<uygulama dizini>/modeller/<ad>`.
  static const String varsayilanModelAdi = 'sherpa-onnx-streaming-zipformer-en';

  static const int _ornekHizi = 16000;
  static bool _baglandi = false;

  AudioRecorder? _kayit;
  sherpa.OnlineRecognizer? _tanici;
  sherpa.OnlineStream? _akis;
  StreamController<String>? _kontrol;
  StreamSubscription<Uint8List>? _sesAboneligi;

  Future<String> _klasor() async {
    final verilen = modelYolu;
    if (verilen != null && verilen.isNotEmpty) return verilen;
    final dizin = await getApplicationSupportDirectory();
    return p.join(dizin.path, 'modeller', varsayilanModelAdi);
  }

  /// Klasördeki model dosyalarını bulur (int8 varsa onu seçer); eksikse null.
  static ({
    String kodlayici,
    String cozucu,
    String birlestirici,
    String tokens,
  })?
  dosyalariBul(String klasor) {
    try {
      final d = Directory(klasor);
      if (!d.existsSync()) return null;
      final adlar = d
          .listSync()
          .whereType<File>()
          .map((f) => p.basename(f.path))
          .toList();
      String? sec(String onek) {
        final onnx = adlar
            .where((a) => a.startsWith(onek) && a.endsWith('.onnx'))
            .toList();
        if (onnx.isEmpty) return null;
        final int8 = onnx.where((a) => a.contains('int8')).toList();
        return p.join(klasor, (int8.isNotEmpty ? int8 : onnx).first);
      }

      final k = sec('encoder');
      final c = sec('decoder');
      final b = sec('joiner');
      final t = adlar.contains('tokens.txt')
          ? p.join(klasor, 'tokens.txt')
          : null;
      if (k == null || c == null || b == null || t == null) return null;
      return (kodlayici: k, cozucu: c, birlestirici: b, tokens: t);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<bool> hazirMi() async {
    try {
      if (!Platform.isWindows) return false;
      return dosyalariBul(await _klasor()) != null;
    } catch (e) {
      debugPrint('Konuşma tanıma hazır değil: $e');
      return false;
    }
  }

  @override
  Future<bool> izinIste() async {
    try {
      final kayit = _kayit ??= AudioRecorder();
      return await kayit.hasPermission();
    } catch (e) {
      debugPrint('Mikrofon izni alınamadı: $e');
      return false;
    }
  }

  @override
  Stream<String> dinle({required String dil}) {
    final kontrol = StreamController<String>();
    _kontrol = kontrol;
    unawaited(_baslat(kontrol));
    return kontrol.stream;
  }

  Future<void> _baslat(StreamController<String> kontrol) async {
    try {
      final dosyalar = dosyalariBul(await _klasor());
      if (dosyalar == null) throw StateError('Model dosyaları bulunamadı');
      if (!_baglandi) {
        sherpa.initBindings();
        _baglandi = true;
      }
      final tanici = _tanici ??= sherpa.OnlineRecognizer(
        sherpa.OnlineRecognizerConfig(
          model: sherpa.OnlineModelConfig(
            transducer: sherpa.OnlineTransducerModelConfig(
              encoder: dosyalar.kodlayici,
              decoder: dosyalar.cozucu,
              joiner: dosyalar.birlestirici,
            ),
            tokens: dosyalar.tokens,
            numThreads: 2,
            debug: false,
          ),
        ),
      );
      final akis = _akis = tanici.createStream();
      final kayit = _kayit ??= AudioRecorder();
      final ses = await kayit.startStream(
        const RecordConfig(
          encoder: AudioEncoder.pcm16bits,
          sampleRate: _ornekHizi,
          numChannels: 1,
        ),
      );
      var sonMetin = '';
      _sesAboneligi = ses.listen(
        (bayt) {
          if (kontrol.isClosed) return;
          try {
            akis.acceptWaveform(samples: _floata(bayt), sampleRate: _ornekHizi);
            while (tanici.isReady(akis)) {
              tanici.decode(akis);
            }
            final metin = tanici.getResult(akis).text;
            if (metin != sonMetin) {
              sonMetin = metin;
              kontrol.add(metin);
            }
            // Konuşma arası sessizlik: son sonuç verilir, akış kapanır.
            if (tanici.isEndpoint(akis) && sonMetin.trim().isNotEmpty) {
              unawaited(durdur());
            }
          } catch (e) {
            debugPrint('Konuşma tanıma hatası: $e');
            unawaited(durdur());
          }
        },
        onError: (Object e) {
          debugPrint('Mikrofon hatası: $e');
          unawaited(durdur());
        },
        onDone: () => unawaited(durdur()),
      );
    } catch (e) {
      debugPrint('Konuşma tanıma başlatılamadı: $e');
      await durdur();
    }
  }

  /// 16-bit işaretli little-endian PCM -> [-1, 1] aralığında Float32.
  static Float32List _floata(Uint8List bayt) {
    final veri = ByteData.sublistView(bayt);
    final n = bayt.lengthInBytes ~/ 2;
    final cikis = Float32List(n);
    for (var i = 0; i < n; i++) {
      cikis[i] = veri.getInt16(i * 2, Endian.little) / 32768.0;
    }
    return cikis;
  }

  @override
  Future<void> durdur() async {
    final abonelik = _sesAboneligi;
    _sesAboneligi = null;
    try {
      await abonelik?.cancel();
    } catch (_) {}
    try {
      if (await _kayit?.isRecording() ?? false) await _kayit?.stop();
    } catch (_) {}
    try {
      _akis?.free();
    } catch (_) {}
    _akis = null;
    final kontrol = _kontrol;
    _kontrol = null;
    if (kontrol != null && !kontrol.isClosed) await kontrol.close();
  }

  /// Uygulama kapanırken kaynakları bırakır.
  Future<void> kapat() async {
    await durdur();
    try {
      _tanici?.free();
    } catch (_) {}
    _tanici = null;
    try {
      await _kayit?.dispose();
    } catch (_) {}
    _kayit = null;
  }
}
