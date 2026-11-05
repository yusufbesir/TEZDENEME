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

  /// Tanıyıcıya bildirilen gerçek örnekleme hızı. `record` Windows'ta
  /// istenen 16 kHz'i vermezse tanıma bozulur; ilk saniyede gelen bayt
  /// miktarından hız ölçülür ve yakın standart değere oturtulur.
  int _hiz = _ornekHizi;
  String _sonMetin = '';
  String? _hizNotu;

  static const List<int> _standartHizlar = [
    8000,
    11025,
    16000,
    22050,
    24000,
    32000,
    44100,
    48000,
  ];

  /// [bayt] baytın [sure] içinde geldiği varsayımıyla (16-bit, tek kanal)
  /// en yakın standart hızı verir; ölçüm standart bir hıza %12'den
  /// yakın değilse [_ornekHizi] döner (güvenilmez ölçüm yok sayılır).
  static int hizTahmini(int bayt, Duration sure) {
    final sn = sure.inMicroseconds / 1e6;
    if (sn <= 0 || bayt <= 0) return _ornekHizi;
    final olculen = bayt / 2 / sn;
    var en = _ornekHizi;
    var fark = double.infinity;
    for (final h in _standartHizlar) {
      final d = (olculen - h).abs() / h;
      if (d < fark) {
        fark = d;
        en = h;
      }
    }
    return fark <= 0.12 ? en : _ornekHizi;
  }

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
          // Greedy yerine beam search: aynı modelle daha az yanlış kelime.
          decodingMethod: 'modified_beam_search',
          maxActivePaths: 4,
          // Cümle ortası kısa duraksamada akış erken kapanmasın.
          rule2MinTrailingSilence: 1.6,
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
      _sonMetin = '';
      _hiz = _ornekHizi;
      _hizNotu = null;
      DateTime? ilkBayt;
      var toplamBayt = 0;
      var hizKarar = false;
      _sesAboneligi = ses.listen(
        (bayt) {
          if (kontrol.isClosed) return;
          try {
            final simdi = DateTime.now();
            ilkBayt ??= simdi;
            toplamBayt += bayt.lengthInBytes;
            if (!hizKarar &&
                simdi.difference(ilkBayt!).inMilliseconds >= 1000) {
              hizKarar = true;
              final h = hizTahmini(toplamBayt, simdi.difference(ilkBayt!));
              _hizNotu =
                  'ölçülen hız ≈ ${(toplamBayt / 2 / (simdi.difference(ilkBayt!).inMicroseconds / 1e6)).round()} Hz, kullanılan $h Hz';
              if (h != _hiz) {
                debugPrint('Mikrofon hızı ayarlandı: $_hizNotu');
                _hiz = h;
              }
            }
            akis.acceptWaveform(samples: _floata(bayt), sampleRate: _hiz);
            while (tanici.isReady(akis)) {
              tanici.decode(akis);
            }
            final metin = tanici.getResult(akis).text;
            if (metin != _sonMetin) {
              _sonMetin = metin;
              kontrol.add(metin);
            }
            // Konuşma arası sessizlik: son sonuç verilir, akış kapanır.
            if (tanici.isEndpoint(akis) && _sonMetin.trim().isNotEmpty) {
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
    } catch (e) {
      // Bilerek yutulur (temizlik); iz için kaydedilir.
      debugPrint('konusma_sherpa.dart: abonelik iptali hatası: $e');
    }
    try {
      if (await _kayit?.isRecording() ?? false) await _kayit?.stop();
    } catch (e) {
      // Bilerek yutulur (temizlik); iz için kaydedilir.
      debugPrint('konusma_sherpa.dart: kayıt durdurma hatası: $e');
    }
    // Akış açıkken: konuşmanın son kelimeleri çözücüde bekliyor olabilir.
    // Sessizlik doldurulup girdi bitirilerek tamamı alınır, sonra kapanır.
    final akis = _akis;
    _akis = null;
    final kontrol = _kontrol;
    _kontrol = null;
    if (akis != null) {
      try {
        final tanici = _tanici;
        if (tanici != null) {
          akis.acceptWaveform(
            samples: Float32List((_hiz * 0.6).round()),
            sampleRate: _hiz,
          );
          akis.inputFinished();
          while (tanici.isReady(akis)) {
            tanici.decode(akis);
          }
          final metin = tanici.getResult(akis).text;
          if (metin != _sonMetin) {
            _sonMetin = metin;
            if (kontrol != null && !kontrol.isClosed) kontrol.add(metin);
          }
        }
      } catch (e) {
        debugPrint('Son sonuç alınamadı: $e');
      }
      try {
        akis.free();
      } catch (e) {
        // Bilerek yutulur (temizlik); iz için kaydedilir.
        debugPrint('konusma_sherpa.dart: akış serbest bırakma hatası: $e');
      }
    }
    if (kontrol != null && !kontrol.isClosed) await kontrol.close();
  }

  @override
  Future<String> tani() async {
    final b = StringBuffer();
    try {
      b.writeln('Platform: ${Platform.operatingSystem}');
      final klasor = await _klasor();
      b.writeln('Model klasörü: $klasor');
      final d = dosyalariBul(klasor);
      b.writeln(
        d == null ? 'Model dosyaları: EKSİK' : 'Model dosyaları: tamam',
      );
      b.writeln('Mikrofon izni: ${await izinIste() ? 'var' : 'YOK'}');
      b.writeln('Son ölçüm: ${_hizNotu ?? 'henüz dinleme yapılmadı'}');
      b.writeln('Tanıma dili: yalnız İngilizce model');
    } catch (e) {
      b.writeln('Tanı hatası: $e');
    }
    return b.toString().trim();
  }

  /// Uygulama kapanırken kaynakları bırakır.
  Future<void> kapat() async {
    await durdur();
    try {
      _tanici?.free();
    } catch (e) {
      // Bilerek yutulur (temizlik); iz için kaydedilir.
      debugPrint('konusma_sherpa.dart: tanıyıcı serbest bırakma hatası: $e');
    }
    _tanici = null;
    try {
      await _kayit?.dispose();
    } catch (e) {
      // Bilerek yutulur (temizlik); iz için kaydedilir.
      debugPrint('konusma_sherpa.dart: kayıt kapatma hatası: $e');
    }
    _kayit = null;
  }
}
