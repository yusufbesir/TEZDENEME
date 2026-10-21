/// Güncellemeden sonra eski sürümde kalan, yeni sürümde olmayan dosyaları
/// güvenle siler. Kurallar için bkz. docs/GUNCELLEME.md.
///
/// Değişmezler:
/// - Yalnızca kurulum klasörü içindeki, manifestle tanımlı dosyalar silinir.
/// - Bağlantı (symlink/junction) olan dosya ya da ara dizin izlenmez, atlanır.
/// - Kullanıcı verisi (durum.v1.json, .bozuk-*, adimadim/) asla silinmez.
/// - Önce yeni sürüm doğrulanır; doğrulanamazsa hiçbir şey silinmez.
library;

import 'dart:convert';
import 'dart:io';

import 'manifest.dart';
import 'manifest_uretici.dart';

enum TemizlikDurumu { gerekYok, tamam, kismi, dogrulanamadi }

final class TemizlikSonucu {
  const TemizlikSonucu({
    required this.durum,
    this.silinen = const [],
    this.atlanan = const {},
    this.hatalar = const [],
  });

  final TemizlikDurumu durum;
  final List<String> silinen;

  /// yol → atlanma nedeni.
  final Map<String, String> atlanan;
  final List<String> hatalar;

  @override
  String toString() =>
      'TemizlikSonucu($durum, silinen: ${silinen.length}, '
      'atlanan: ${atlanan.length}, hata: ${hatalar.length})';
}

final class EskiSurumTemizleyici {
  EskiSurumTemizleyici(this.kurulumKlasoru);

  /// Çalışan uygulamanın bulunduğu klasör.
  static EskiSurumTemizleyici varsayilan() =>
      EskiSurumTemizleyici(File(Platform.resolvedExecutable).parent);

  final Directory kurulumKlasoru;

  static final String _ayirici = Platform.pathSeparator;
  static final bool _buyukKucukDuyarsiz = Platform.isWindows;

  Future<TemizlikSonucu> calistir() async {
    final eskiDosya = File(_birlestir(kurulumKlasoru.path, [eskiManifestAdi]));
    try {
      if (FileSystemEntity.typeSync(eskiDosya.path, followLinks: false) ==
          FileSystemEntityType.notFound) {
        return const TemizlikSonucu(durum: TemizlikDurumu.gerekYok);
      }
    } catch (e) {
      return TemizlikSonucu(
        durum: TemizlikDurumu.dogrulanamadi,
        hatalar: ['Eski manifest denetlenemedi: $e'],
      );
    }

    // Kurulum klasörünün gerçek yolu.
    final String kok;
    try {
      kok = await kurulumKlasoru.resolveSymbolicLinks();
    } catch (e) {
      return TemizlikSonucu(
        durum: TemizlikDurumu.dogrulanamadi,
        hatalar: ['Kurulum klasörü çözülemedi: $e'],
      );
    }

    // Kural 4: önce yeni sürüm doğrulanır.
    final SurumManifesti yeni;
    final SurumManifesti eski;
    try {
      yeni = await _manifestOku(kok, surumManifestAdi, yolKati: true);
      final hata = await _yeniSurumuDogrula(kok, yeni);
      if (hata != null) {
        return TemizlikSonucu(
          durum: TemizlikDurumu.dogrulanamadi,
          hatalar: ['Yeni sürüm doğrulanamadı: $hata'],
        );
      }
      // Geçersiz yollu adaylar tek tek atlanabilsin diye yol denetimi gevşek.
      eski = await _manifestOku(kok, eskiManifestAdi, yolKati: false);
    } catch (e) {
      return TemizlikSonucu(
        durum: TemizlikDurumu.dogrulanamadi,
        hatalar: ['Manifest okunamadı: $e'],
      );
    }

    final yeniYollar = {for (final d in yeni.dosyalar) d.yol};
    final silinen = <String>[];
    final atlanan = <String, String>{};
    final hatalar = <String>[];
    final silinenDizinler = <String>{};

    for (final aday in eski.dosyalar) {
      if (yeniYollar.contains(aday.yol)) continue;
      try {
        final neden = await _adayiDegerlendir(kok, aday);
        if (neden != null) {
          if (neden != _zatenYok) atlanan[aday.yol] = neden;
          continue;
        }
        final parcalar = aday.yol.split('/');
        await File(_birlestir(kok, parcalar)).delete();
        silinen.add(aday.yol);
        for (var i = parcalar.length - 1; i >= 1; i--) {
          silinenDizinler.add(parcalar.sublist(0, i).join('/'));
        }
      } catch (e) {
        hatalar.add('${aday.yol}: $e');
      }
    }

    // Boş kalan dizinler: en derinden başlayarak, yalnızca kurulum içinde.
    final dizinler = silinenDizinler.toList()
      ..sort((a, b) => b.split('/').length.compareTo(a.split('/').length));
    for (final d in dizinler) {
      try {
        await _bosDizinSil(kok, d);
      } catch (e) {
        hatalar.add('Dizin $d: $e');
      }
    }

    // Silme hatası yoksa manifest kaldırılır; varsa yeniden deneme için kalır.
    if (hatalar.isEmpty) {
      try {
        await eskiDosya.delete();
      } catch (e) {
        hatalar.add('$eskiManifestAdi silinemedi: $e');
      }
    }

    return TemizlikSonucu(
      durum: hatalar.isEmpty && atlanan.isEmpty
          ? TemizlikDurumu.tamam
          : TemizlikDurumu.kismi,
      silinen: silinen,
      atlanan: atlanan,
      hatalar: hatalar,
    );
  }

  static const String _zatenYok = '\u0000zaten-yok';

  Future<SurumManifesti> _manifestOku(
    String kok,
    String ad, {
    required bool yolKati,
  }) async {
    final f = File(_birlestir(kok, [ad]));
    if (FileSystemEntity.typeSync(f.path, followLinks: false) !=
        FileSystemEntityType.file) {
      throw ManifestHatasi('$ad normal dosya değil ya da yok');
    }
    final json = jsonDecode(await f.readAsString());
    return SurumManifesti.fromJson(json, yolKati: yolKati);
  }

  /// Yeni manifestteki her dosya mevcut, boyut ve SHA-256 eşleşmeli.
  /// Sorun varsa açıklama, yoksa null döner.
  Future<String?> _yeniSurumuDogrula(String kok, SurumManifesti yeni) async {
    for (final d in yeni.dosyalar) {
      final yol = _birlestir(kok, d.yol.split('/'));
      final tur = FileSystemEntity.typeSync(yol, followLinks: false);
      if (tur != FileSystemEntityType.file) {
        return '${d.yol} eksik ya da normal dosya değil';
      }
      final f = File(yol);
      if (await f.length() != d.boyut) return '${d.yol} boyutu uyuşmuyor';
      if (await dosyaSha256(f) != d.sha256) return '${d.yol} özeti uyuşmuyor';
    }
    return null;
  }

  /// Aday silinebilirse null; atlanacaksa nedeni döner.
  Future<String?> _adayiDegerlendir(String kok, ManifestDosyasi aday) async {
    final yolHata = yolHatasi(aday.yol);
    if (yolHata != null) return 'güvensiz yol ($yolHata)';
    final parcalar = aday.yol.split('/');
    if (_dislanmisMi(parcalar)) return 'korunan veri ya da manifest yolu';

    // Ara dizinler: link olmamalı ve gerçek yolu beklenen yol olmalı.
    for (var i = 1; i < parcalar.length; i++) {
      final dizin = _birlestir(kok, parcalar.sublist(0, i));
      final tur = FileSystemEntity.typeSync(dizin, followLinks: false);
      if (tur == FileSystemEntityType.notFound) return _zatenYok;
      if (tur != FileSystemEntityType.directory ||
          await FileSystemEntity.isLink(dizin)) {
        return 'ara dizin bağlantı ya da dizin değil: ${parcalar.sublist(0, i).join('/')}';
      }
      final gercek = await Directory(dizin).resolveSymbolicLinks();
      if (!_ayniYol(gercek, dizin)) {
        return 'ara dizin kurulum klasörü dışına çözülüyor';
      }
    }

    final yol = _birlestir(kok, parcalar);
    if (await FileSystemEntity.isLink(yol)) return 'bağlantı (izlenmez)';
    final tur = FileSystemEntity.typeSync(yol, followLinks: false);
    if (tur == FileSystemEntityType.notFound) return _zatenYok;
    if (tur != FileSystemEntityType.file) return 'normal dosya değil';
    final gercek = await File(yol).resolveSymbolicLinks();
    if (!_ayniYol(gercek, yol)) return 'gerçek yol kurulum klasörü dışında';

    // Kullanıcı değiştirmişse dokunma.
    if (await dosyaSha256(File(yol)) != aday.sha256) {
      return 'dosya değişmiş (özet uyuşmuyor)';
    }
    return null;
  }

  Future<void> _bosDizinSil(String kok, String goreliDizin) async {
    final parcalar = goreliDizin.split('/');
    if (yolHatasi(goreliDizin) != null || _dislanmisMi(parcalar)) return;
    for (var i = 1; i <= parcalar.length; i++) {
      final ara = _birlestir(kok, parcalar.sublist(0, i));
      if (await FileSystemEntity.isLink(ara)) return;
    }
    final yol = _birlestir(kok, parcalar);
    if (FileSystemEntity.typeSync(yol, followLinks: false) !=
        FileSystemEntityType.directory) {
      return;
    }
    final gercek = await Directory(yol).resolveSymbolicLinks();
    if (!_ayniYol(gercek, yol)) return;
    final d = Directory(yol);
    if (await d.list(followLinks: false).isEmpty) {
      await d.delete(); // Özyinelemesiz: yalnızca boşsa silinir.
    }
  }

  /// Kesin dışlama: kullanıcı verisi ve manifest dosyaları.
  static bool _dislanmisMi(List<String> parcalar) {
    for (final p in parcalar.map((e) => e.toLowerCase())) {
      if (p == 'adimadim' ||
          p.startsWith('durum.v1.json') ||
          p.contains('.bozuk-')) {
        return true;
      }
    }
    final son = parcalar.last.toLowerCase();
    return parcalar.length == 1 &&
        (son == surumManifestAdi || son == eskiManifestAdi);
  }

  static String _birlestir(String kok, List<String> parcalar) =>
      parcalar.isEmpty ? kok : '$kok$_ayirici${parcalar.join(_ayirici)}';

  static bool _ayniYol(String a, String b) {
    String duzelt(String s) {
      var r = s.replaceAll('\\', '/');
      while (r.length > 1 && r.endsWith('/')) {
        r = r.substring(0, r.length - 1);
      }
      return _buyukKucukDuyarsiz ? r.toLowerCase() : r;
    }

    return duzelt(a) == duzelt(b);
  }
}
