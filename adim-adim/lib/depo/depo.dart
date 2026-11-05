/// Kalıcılık katmanı: öğrenci durumunu yükler/kaydeder.
/// Okuma hiçbir koşulda fırlatmaz; bozuk veri varsayılan duruma döner.
library;

import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

import '../model/durum.dart';
import 'package:flutter/foundation.dart';

abstract class Depo {
  Future<OgrenciDurumu> yukle();
  Future<void> kaydet(OgrenciDurumu d);
  Future<void> sifirla();

  /// Sıradaki (bekleyen) yazmaların bitmesini bekler; yeni yazma başlatmaz.
  /// Uygulama arka plana geçerken çağrılır. Hata fırlatmaz.
  Future<void> bosalt();
}

/// Bellekte tutan depo; testler ve önizleme için.
class BellekDepo implements Depo {
  BellekDepo([OgrenciDurumu? ilk]) : _durum = ilk ?? const OgrenciDurumu();

  OgrenciDurumu _durum;

  @override
  Future<OgrenciDurumu> yukle() async => _durum;

  @override
  Future<void> kaydet(OgrenciDurumu d) async {
    _durum = d;
  }

  @override
  Future<void> sifirla() async {
    _durum = const OgrenciDurumu();
  }

  @override
  Future<void> bosalt() async {}
}

/// Dosyada tutan depo: `<klasor>/adimadim/durum.v1.json`.
class DosyaDepo implements Depo {
  DosyaDepo(this.klasor, {this.goc, this.hedefSurum = DurumGocu.guncel});

  /// Göç adım tablosu; null ise [DurumGocu.varsayilanAdimlar] (testler için).
  final Map<int, Map<String, Object?> Function(Map<String, Object?>)>? goc;
  final int hedefSurum;

  /// Uygulama destek klasörünü (path_provider) kullanır. Flutter gerekir.
  static Future<DosyaDepo> varsayilan() async =>
      DosyaDepo(await getApplicationSupportDirectory());

  /// En büyük kabul edilen dosya boyutu (2 MB).
  static const int enBuyukBayt = 2 * 1024 * 1024;

  final Directory klasor;

  File get _dosya => File(
    '${klasor.path}${Platform.pathSeparator}adimadim${Platform.pathSeparator}durum.v1.json',
  );
  File get _gecici => File('${_dosya.path}.tmp');

  @override
  Future<OgrenciDurumu> yukle() async {
    try {
      final f = _dosya;
      if (!await f.exists()) return const OgrenciDurumu();
      // Sembolik bağ izlenmez; yalnızca gerçek dosya okunur.
      if (await FileSystemEntity.isLink(f.path)) return const OgrenciDurumu();
      if (await f.length() > enBuyukBayt) {
        await _bozukKenaraAl(f);
        return const OgrenciDurumu();
      }
      final baytlar = await f.readAsBytes();
      if (baytlar.length > enBuyukBayt) {
        await _bozukKenaraAl(f);
        return const OgrenciDurumu();
      }
      final ham = jsonDecode(utf8.decode(baytlar));
      if (ham is! Map) {
        await _bozukKenaraAl(f);
        return const OgrenciDurumu();
      }
      Map<String, Object?> json;
      try {
        final g = DurumGocu.uygula(ham, hedef: hedefSurum, adimlar: goc);
        if (g.gocYapildi || g.gelecek) {
          // Göçten (ya da gelecek sürüm dosyası üzerine yazılmadan) önce
          // geri alma kopyası; kopya alınamazsa yükleme yine sürer.
          await _geriAlmaKopyasi(baytlar);
        }
        json = g.json;
      } on StateError {
        // Göç başarısız: kopya alınır, asıl dosya kenara alınır (silinmez).
        await _geriAlmaKopyasi(baytlar);
        await _bozukKenaraAl(f);
        return const OgrenciDurumu();
      }
      return OgrenciDurumu.fromJson(json);
    } on FormatException {
      await _bozukKenaraAl(_dosya);
      return const OgrenciDurumu();
    } catch (_) {
      return const OgrenciDurumu();
    }
  }

  /// Bozuk dosyayı silmez ya da ezmez; tarih ekiyle kenara alır ki ilerleme
  /// gerekirse elle kurtarılabilsin.
  Future<void> _bozukKenaraAl(File f) async {
    try {
      final damga = DateTime.now().toIso8601String().replaceAll(':', '-');
      await f.rename('${f.path}.bozuk-$damga');
    } catch (_) {
      // Kenara alınamazsa bir sonraki kayıt üzerine yazar.
    }
  }

  /// Geri alma kopyası yuva sayısı; sınır aşılınca en eskisinin üzerine
  /// yazılır (hiçbir kopya silinmez).
  static const int geriAlmaYuvasi = 3;

  File _yuva(int i) => File('${_dosya.path}.geri-$i');

  /// [baytlar] (göç öncesi dosya içeriği) için kopya yazar: boş yuva varsa o,
  /// yoksa en eski yuva seçilir; geçici dosyaya yazılıp atomik yeniden
  /// adlandırılır (rename hedefin üzerine yazar, silme yok).
  /// Hata fırlatmaz; başarıysa true.
  Future<bool> _geriAlmaKopyasi(List<int> baytlar) async {
    try {
      var secilen = 0;
      DateTime? enEski;
      for (var i = 0; i < geriAlmaYuvasi; i++) {
        final y = _yuva(i);
        if (!await y.exists()) {
          secilen = i;
          break;
        }
        final m = await y.lastModified();
        if (enEski == null || m.isBefore(enEski)) {
          enEski = m;
          secilen = i;
        }
      }
      await _dosya.parent.create(recursive: true);
      final hedef = _yuva(secilen);
      final gecici = File('${hedef.path}.tmp');
      await gecici.writeAsBytes(baytlar, flush: true);
      await gecici.rename(hedef.path);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// Yazmalar sıraya alınır; iki kayıt aynı .tmp dosyasını paylaşmaz.
  Future<void> _kuyruk = Future.value();

  @override
  Future<void> bosalt() async {
    try {
      await _kuyruk;
    } catch (e) {
      // Bilerek yutulur (temizlik); iz için kaydedilir.
      debugPrint('depo.dart: yazma kuyruğu boşaltma hatası: $e');
    }
  }

  @override
  Future<void> kaydet(OgrenciDurumu d) {
    final sonuc = _kuyruk.then((_) => _yaz(d));
    _kuyruk = sonuc.catchError((_) {});
    return sonuc;
  }

  Future<void> _yaz(OgrenciDurumu d) async {
    final f = _dosya;
    await f.parent.create(recursive: true);
    final gecici = _gecici;
    // Önce geçici dosyaya yaz ve diske aktar, sonra yeniden adlandır (atomik).
    await gecici.writeAsString(jsonEncode(d.toJson()), flush: true);
    try {
      await gecici.rename(f.path);
    } on FileSystemException {
      // Windows'ta hedef o anda okunuyorsa rename kısa süre reddedilebilir.
      await Future<void>.delayed(const Duration(milliseconds: 50));
      await gecici.rename(f.path);
    }
  }

  /// Kullanıcının "verileri sıfırla" kararı: ana dosya, geçici dosya ve
  /// `.bozuk-*` yedekleri silinir; `.geri-*` kopyaları korunur.
  @override
  Future<void> sifirla() async {
    try {
      for (final f in [_dosya, _gecici]) {
        if (await f.exists()) await f.delete();
      }
      final klasorYolu = _dosya.parent;
      if (await klasorYolu.exists()) {
        final onek = '${_dosya.path}.bozuk-';
        await for (final e in klasorYolu.list()) {
          if (e is File && e.path.startsWith(onek)) await e.delete();
        }
        // `.geri-*` kopyalarına dokunulmaz (silme yasağı; kalıcı silme
        // yalnız kullanıcı kararıyla, ayrı bir adımda).
      }
    } catch (_) {
      // Silinemeyen dosya bir sonraki kayıtta ezilir.
    }
  }
}
