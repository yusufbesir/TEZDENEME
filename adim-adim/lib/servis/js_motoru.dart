/// Gerçek çevrimdışı JavaScript motoru (ÖZELLİK 69): flutter_js paketinin
/// QuickJS bağlaması (Windows'ta paketle gelen `quickjs_c_bridge.dll`,
/// Linux'ta `libquickjs_c_bridge_plugin.so`). Ağ uzantıları (fetch/XHR)
/// AÇILMAZ; kod ayrı bir isolate'te, [JsKoruma] bekçileriyle çalışır.
///
/// Sınırlar (dürüst not):
/// - flutter_js'in `timeout` parametresi çalışmayı kesmez (Linux'ta denendi);
///   süre sınırını [JsKoruma] bekçileri sağlar. Bekçinin göremediği tek bir
///   uzun yerel işlem (ör. dev bir `"x".repeat(1e9)`) Dart tarafındaki süre
///   dolunca "zaman aşımı" olarak bildirilir, ancak arka plandaki isolate
///   yerel kod bitene kadar kapanmaz.
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
      final ham = await Isolate.run(
        () => _calistirSenkron(betik),
      ).timeout(Duration(milliseconds: sureMs + 3000));
      if (ham == null) return KodCalismaSonucu.motorsuz(kod);
      return JsKoruma.sonucCoz(kod, jsonDecode(ham));
    } on TimeoutException {
      return KodCalismaSonucu(
        kod: kod,
        zamanAsimi: true,
        hata: 'Süre sınırı aşıldı (sonsuz döngü olabilir)',
      );
    } catch (e) {
      return KodCalismaSonucu(kod: kod, hata: 'Çalıştırılamadı: $e');
    }
  }
}

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
