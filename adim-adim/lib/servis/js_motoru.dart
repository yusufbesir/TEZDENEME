/// Gerçek çevrimdışı JavaScript motoru (ÖZELLİK 69): flutter_js paketinin
/// QuickJS bağlaması (Windows'ta paketle gelen `quickjs_c_bridge.dll`,
/// Linux'ta `libquickjs_c_bridge_plugin.so`). Ağ uzantıları (fetch/XHR)
/// AÇILMAZ; kod ayrı bir isolate'te, [JsKoruma] bekçileriyle çalışır.
///
/// Sınırlar (dürüst not):
/// - flutter_js'in `timeout` parametresi çalışmayı kesmez (Linux'ta denendi);
///   süre sınırını [JsKoruma] bekçileri sağlar. Dart tarafındaki süre
///   dolunca isolate öldürülür ([calistirIsolate]); bekçinin göremediği tek
///   bir uzun yerel işlem bile bir sonraki çalıştırmayı etkilemez, çünkü
///   motor her çalıştırmada yeniden kurulur. Yerel kod içinde askıdaki
///   iş parçacığı işletim sistemi kesene kadar sürebilir.
/// - Bellek sınırı uygulanamaz: paketle gelen kütüphane `jsSetMemoryLimit`
///   simgesini dışa aktarmıyor.
/// - Kütüphane yüklenemezse (test ortamı, eksik DLL) sonuç "motor yok"tur.
library;

import 'dart:async';
import 'dart:convert';
import 'dart:isolate';

import 'package:flutter_js/flutter_js.dart';

import '../model/kod_calisma.dart';
import '../motor/kod_calistirici.dart';

class QuickJsCalistirici extends KodCalistirici {
  const QuickJsCalistirici({this.sureMs = JsKoruma.varsayilanSureMs});

  /// Bekçinin süre sınırı; Dart tarafı bunun üstüne pay bırakır.
  final int sureMs;

  @override
  String get ad => 'QuickJS (çevrimdışı)';

  @override
  Future<KodCalismaSonucu> calistir(String kod) async {
    final h = JsKoruma.hazirla(kod, sureMs: sureMs);
    if (h.hata != null) return KodCalismaSonucu(kod: kod, hata: h.hata);
    final betik = h.betik!;
    try {
      final ham = await calistirIsolate(
        () => _calistirSenkron(betik),
        Duration(milliseconds: sureMs + 3000),
      );
      if (ham == null) return KodCalismaSonucu.motorsuz(kod);
      return JsKoruma.sonucCoz(kod, jsonDecode(ham));
    } on TimeoutException {
      return KodCalismaSonucu(
        kod: kod,
        zamanAsimi: true,
        hata: JsKoruma.zamanAsimiAciklamasi,
      );
    } catch (e) {
      return KodCalismaSonucu(kod: kod, hata: 'Çalıştırılamadı: $e');
    }
  }
}

/// [is_] işini ayrı isolate'te çalıştırır; [sure] dolarsa isolate ÖLDÜRÜLÜR
/// (`Isolate.kill(immediate)`) ve [TimeoutException] fırlatılır. Her çağrı
/// kendi isolate'ini ve motorunu kurar; zaman aşımından sonra bir sonraki
/// çalıştırma temiz bir motorla başlar (asılı kalmış motor yeniden
/// kullanılmaz). Test edilebilsin diye motordan bağımsızdır.
Future<T> calistirIsolate<T>(T Function() is_, Duration sure) async {
  final alici = ReceivePort();
  final hata = ReceivePort();
  final isolate = await Isolate.spawn<_Is<T>>(
    _isleCalistir<T>,
    _Is<T>(is_, alici.sendPort),
    onError: hata.sendPort,
    errorsAreFatal: true,
  );
  final tamam = Completer<T>();
  final a = alici.listen((m) {
    if (!tamam.isCompleted) tamam.complete(m as T);
  });
  final h = hata.listen((m) {
    if (!tamam.isCompleted) {
      tamam.completeError(StateError('isolate hatası: $m'));
    }
  });
  try {
    return await tamam.future.timeout(sure);
  } finally {
    isolate.kill(priority: Isolate.immediate);
    await a.cancel();
    await h.cancel();
    alici.close();
    hata.close();
  }
}

class _Is<T> {
  const _Is(this.is_, this.port);
  final T Function() is_;
  final SendPort port;
}

void _isleCalistir<T>(_Is<T> i) => i.port.send(i.is_());

/// Isolate içinde: motoru kurar, betiği çalıştırır, JSON dizesi döndürür.
/// Kütüphane yüklenemezse null (motor yok).
String? _calistirSenkron(String betik) {
  QuickJsRuntime2 rt;
  try {
    rt = QuickJsRuntime2(stackSize: _yiginBayt);
  } catch (_) {
    return null;
  }
  try {
    final r = rt.evaluate(betik);
    if (r.isError) {
      return jsonEncode({'c': '', 'h': r.stringResult, 'z': false});
    }
    return r.stringResult;
  } finally {
    try {
      rt.dispose();
    } catch (_) {}
  }
}

/// QuickJS yığın sınırı. Isolate iş parçacığının yerel yığını ana iş
/// parçacığından küçüktür; paketin varsayılanı (1 MB) ile sonsuz özyineleme
/// isolate'te süreci çökertiyordu (Linux'ta görüldü). 256 KB ile QuickJS
/// "stack overflow" hatası verir.
const int _yiginBayt = 256 * 1024;
