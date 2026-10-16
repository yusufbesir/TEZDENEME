/// Yarışma kalıcılığı: alan + seviye başına istatistikler (`yarisma.v1.json`).
/// Okuma hiçbir koşulda fırlatmaz; bozuk veri varsayılana döner.
/// Ana durum dosyasından bağımsız şemadır.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

import 'model.dart';
import 'motor.dart';

int _negatifsizInt(Object? v) => v is int && v > 0 ? v : 0;

Map<String, int> _kategoriHaritasi(Object? ham) {
  final sonuc = <String, int>{};
  if (ham is! Map) return sonuc;
  for (final e in ham.entries) {
    final anahtar = e.key;
    if (anahtar is! String || YarismaKategoriUzanti.coz(anahtar) == null) {
      continue;
    }
    sonuc[anahtar] = _negatifsizInt(e.value);
  }
  return sonuc;
}

/// Bir alan + seviye için birikmiş istatistik. Değiştirilemez.
class YarismaIstatistik {
  const YarismaIstatistik({
    this.oynanan = 0,
    this.kazanilan = 0,
    this.enIyiPuan = 0,
    this.toplamTac = 0,
    this.kategoriDogru = const {},
    this.kategoriYanlis = const {},
  });

  final int oynanan;
  final int kazanilan;
  final int enIyiPuan;
  final int toplamTac;

  /// Kategori kimliği ([YarismaKategori.kimlik]) -> toplam doğru.
  final Map<String, int> kategoriDogru;

  /// Kategori kimliği -> toplam yanlış.
  final Map<String, int> kategoriYanlis;

  Map<String, Object?> toJson() => {
    'oynanan': oynanan,
    'kazanilan': kazanilan,
    'enIyiPuan': enIyiPuan,
    'toplamTac': toplamTac,
    'kategoriDogru': kategoriDogru,
    'kategoriYanlis': kategoriYanlis,
  };

  /// Asla fırlatmaz; bozuk alanlar 0 ya da boş harita olur.
  static YarismaIstatistik fromJson(Object? j) {
    if (j is! Map) return const YarismaIstatistik();
    return YarismaIstatistik(
      oynanan: _negatifsizInt(j['oynanan']),
      kazanilan: _negatifsizInt(j['kazanilan']),
      enIyiPuan: _negatifsizInt(j['enIyiPuan']),
      toplamTac: _negatifsizInt(j['toplamTac']),
      kategoriDogru: Map.unmodifiable(_kategoriHaritasi(j['kategoriDogru'])),
      kategoriYanlis: Map.unmodifiable(_kategoriHaritasi(j['kategoriYanlis'])),
    );
  }
}

/// Kök nesne: anahtar `alan/kursId` biçimindedir.
class YarismaKayit {
  const YarismaKayit({this.istatistikler = const {}});

  static const int surum = 1;

  final Map<String, YarismaIstatistik> istatistikler;

  static String anahtar(String alan, String kursId) => '$alan/$kursId';

  /// Alan + seviye istatistiği; yoksa boş istatistik.
  YarismaIstatistik istatistik(String alan, String kursId) =>
      istatistikler[anahtar(alan, kursId)] ?? const YarismaIstatistik();

  /// Biten oyunu istatistiklere işler (saf). Oyun bitmediyse kayıt aynen döner.
  YarismaKayit oyunuIsle(String alan, String kursId, YarismaOyunu bitenOyun) {
    if (!bitenOyun.bittiMi) return this;
    final eski = istatistik(alan, kursId);
    final sonuc = bitenOyun.sonuc;
    Map<String, int> topla(
      Map<String, int> eskiHarita,
      Map<YarismaKategori, int> yeni,
    ) {
      final harita = {...eskiHarita};
      for (final e in yeni.entries) {
        if (e.value == 0) continue;
        harita[e.key.kimlik] = (harita[e.key.kimlik] ?? 0) + e.value;
      }
      return Map.unmodifiable(harita);
    }

    final yeni = YarismaIstatistik(
      oynanan: eski.oynanan + 1,
      kazanilan: eski.kazanilan + (sonuc.kazandiMi ? 1 : 0),
      enIyiPuan: sonuc.puan > eski.enIyiPuan ? sonuc.puan : eski.enIyiPuan,
      toplamTac: eski.toplamTac + sonuc.tacSayisi,
      kategoriDogru: topla(eski.kategoriDogru, sonuc.kategoriDogru),
      kategoriYanlis: topla(eski.kategoriYanlis, sonuc.kategoriYanlis),
    );
    return YarismaKayit(
      istatistikler: Map.unmodifiable({
        ...istatistikler,
        anahtar(alan, kursId): yeni,
      }),
    );
  }

  Map<String, Object?> toJson() => {
    'surum': surum,
    'istatistikler': {
      for (final e in istatistikler.entries) e.key: e.value.toJson(),
    },
  };

  /// Asla fırlatmaz; bozuk giriş boş kayıt olur, bozuk anahtarlar atlanır.
  static YarismaKayit fromJson(Object? j) {
    try {
      if (j is! Map) return const YarismaKayit();
      final ham = j['istatistikler'];
      if (ham is! Map) return const YarismaKayit();
      final sonuc = <String, YarismaIstatistik>{};
      for (final e in ham.entries) {
        final k = e.key;
        if (k is! String || !_anahtarDeseni.hasMatch(k)) continue;
        sonuc[k] = YarismaIstatistik.fromJson(e.value);
      }
      return YarismaKayit(istatistikler: Map.unmodifiable(sonuc));
    } catch (_) {
      return const YarismaKayit();
    }
  }

  static final _anahtarDeseni = RegExp(r'^(dil|kod)/[a-z0-9-]{1,40}$');
}

abstract class YarismaDepo {
  Future<YarismaKayit> yukle();
  Future<void> kaydet(YarismaKayit k);
  Future<void> sifirla();
}

/// Bellekte tutan depo; testler ve önizleme için.
class BellekYarismaDepo implements YarismaDepo {
  BellekYarismaDepo([YarismaKayit? ilk]) : _kayit = ilk ?? const YarismaKayit();

  YarismaKayit _kayit;

  @override
  Future<YarismaKayit> yukle() async => _kayit;

  @override
  Future<void> kaydet(YarismaKayit k) async {
    _kayit = k;
  }

  @override
  Future<void> sifirla() async {
    _kayit = const YarismaKayit();
  }
}

/// Dosyada tutan depo: `<klasor>/adimadim/yarisma.v1.json`.
class DosyaYarismaDepo implements YarismaDepo {
  DosyaYarismaDepo(this.klasor);

  /// Uygulama destek klasörünü (path_provider) kullanır. Flutter gerekir.
  static Future<DosyaYarismaDepo> varsayilan() async =>
      DosyaYarismaDepo(await getApplicationSupportDirectory());

  /// En büyük kabul edilen dosya boyutu (2 MB).
  static const int enBuyukBayt = 2 * 1024 * 1024;

  final Directory klasor;

  File get _dosya => File(
    '${klasor.path}${Platform.pathSeparator}adimadim${Platform.pathSeparator}yarisma.v1.json',
  );
  File get _gecici => File('${_dosya.path}.tmp');

  @override
  Future<YarismaKayit> yukle() async {
    try {
      final f = _dosya;
      if (!await f.exists()) return const YarismaKayit();
      // Sembolik bağ izlenmez; yalnızca gerçek dosya okunur.
      if (await FileSystemEntity.isLink(f.path)) return const YarismaKayit();
      if (await f.length() > enBuyukBayt) {
        await _bozukKenaraAl(f);
        return const YarismaKayit();
      }
      final baytlar = await f.readAsBytes();
      if (baytlar.length > enBuyukBayt) {
        await _bozukKenaraAl(f);
        return const YarismaKayit();
      }
      final ham = jsonDecode(utf8.decode(baytlar));
      if (ham is! Map) {
        await _bozukKenaraAl(f);
        return const YarismaKayit();
      }
      return YarismaKayit.fromJson(ham);
    } on FormatException {
      await _bozukKenaraAl(_dosya);
      return const YarismaKayit();
    } catch (_) {
      return const YarismaKayit();
    }
  }

  /// Bozuk dosyayı silmez ya da ezmez; tarih ekiyle kenara alır.
  Future<void> _bozukKenaraAl(File f) async {
    try {
      final damga = DateTime.now().toIso8601String().replaceAll(':', '-');
      await f.rename('${f.path}.bozuk-$damga');
    } catch (_) {
      // Kenara alınamazsa bir sonraki kayıt üzerine yazar.
    }
  }

  /// Yazmalar sıraya alınır; iki kayıt aynı .tmp dosyasını paylaşmaz.
  Future<void> _kuyruk = Future.value();

  @override
  Future<void> kaydet(YarismaKayit k) {
    final sonuc = _kuyruk.then((_) => _yaz(k));
    _kuyruk = sonuc.catchError((_) {});
    return sonuc;
  }

  Future<void> _yaz(YarismaKayit k) async {
    final f = _dosya;
    await f.parent.create(recursive: true);
    final gecici = _gecici;
    // Önce geçici dosyaya yaz ve diske aktar, sonra yeniden adlandır (atomik).
    await gecici.writeAsString(jsonEncode(k.toJson()), flush: true);
    try {
      await gecici.rename(f.path);
    } on FileSystemException {
      await Future<void>.delayed(const Duration(milliseconds: 50));
      await gecici.rename(f.path);
    }
  }

  /// Ana dosya, geçici dosya ve `.bozuk-*` yedekleri birlikte silinir.
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
      }
    } catch (_) {
      // Silinemeyen dosya bir sonraki kayıtta ezilir.
    }
  }
}
