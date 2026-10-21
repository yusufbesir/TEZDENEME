/// Sürüm manifesti: bir kurulumdaki dosyaların yol, boyut ve SHA-256 listesi.
/// Güncelleyici ve eski sürüm temizleyici aynı biçimi kullanır.
library;

/// Yeni (güncel) sürümün manifest dosyası adı.
const String surumManifestAdi = 'surum.manifest.json';

/// Önceki sürümün manifest dosyası adı (güncelleyici taşır).
const String eskiManifestAdi = 'eski.manifest.json';

/// Manifest biçimi ya da yolu geçersizse fırlatılır.
final class ManifestHatasi extends FormatException {
  const ManifestHatasi(super.message);
}

/// Yol manifest için güvenli mi? Yalnızca göreli, `/` ayırıcılı, `..`
/// içermeyen yollar kabul edilir. Sürücü harfi, ters bölü, mutlak yol,
/// boş parça ve `.` parçası reddedilir. Geçersizse nedeni döner, uygunsa null.
String? yolHatasi(String yol) {
  if (yol.isEmpty) return 'yol boş';
  if (yol.contains('\\')) return 'ters bölü içeriyor';
  if (yol.contains('\u0000')) return 'geçersiz karakter';
  if (yol.startsWith('/')) return 'mutlak yol';
  if (RegExp(r'^[A-Za-z]:').hasMatch(yol)) return 'sürücü harfi içeriyor';
  if (yol.contains(':')) return 'iki nokta içeriyor';
  for (final parca in yol.split('/')) {
    if (parca.isEmpty) return 'boş yol parçası';
    if (parca == '.' || parca == '..') return '"$parca" parçası içeriyor';
    if (parca.endsWith('.') || parca.endsWith(' ')) {
      return '"$parca" parçası nokta ya da boşlukla bitiyor';
    }
    if (_windowsAyrilmisAd(parca)) return '"$parca" Windows ayrılmış adı';
  }
  return null;
}

/// Windows ayrılmış aygıt adları (CON, PRN, AUX, NUL, COM1-9, LPT1-9).
/// Uzantılı biçimleri de (`nul.txt`) ayrılmıştır; büyük/küçük harf fark etmez.
bool _windowsAyrilmisAd(String parca) {
  final govde = parca.split('.').first.toUpperCase();
  const sabit = {'CON', 'PRN', 'AUX', 'NUL'};
  if (sabit.contains(govde)) return true;
  return RegExp(r'^(COM|LPT)[1-9]$').hasMatch(govde);
}

/// Manifestteki tek dosya kaydı.
final class ManifestDosyasi {
  const ManifestDosyasi({
    required this.yol,
    required this.boyut,
    required this.sha256,
  });

  final String yol;
  final int boyut;
  final String sha256;

  Map<String, Object?> toJson() => {
    'yol': yol,
    'boyut': boyut,
    'sha256': sha256,
  };

  /// [yolKati] false ise yol denetimi yapılmaz (çağıran adayı tek tek eler).
  factory ManifestDosyasi.fromJson(Object? json, {bool yolKati = true}) {
    if (json is! Map) throw const ManifestHatasi('dosya kaydı nesne değil');
    final yol = json['yol'];
    final boyut = json['boyut'];
    final sha = json['sha256'];
    if (yol is! String) throw const ManifestHatasi('yol metin olmalı');
    if (boyut is! int || boyut < 0) {
      throw ManifestHatasi('boyut geçersiz: $yol');
    }
    if (sha is! String || !RegExp(r'^[0-9a-fA-F]{64}$').hasMatch(sha)) {
      throw ManifestHatasi('sha256 geçersiz: $yol');
    }
    if (yolKati) {
      final h = yolHatasi(yol);
      if (h != null) throw ManifestHatasi('geçersiz yol "$yol": $h');
    }
    return ManifestDosyasi(yol: yol, boyut: boyut, sha256: sha.toLowerCase());
  }
}

/// Bir sürümün dosya listesi.
final class SurumManifesti {
  const SurumManifesti({required this.surum, required this.dosyalar});

  final String surum;
  final List<ManifestDosyasi> dosyalar;

  Map<String, Object?> toJson() => {
    'surum': surum,
    'dosyalar': [for (final d in dosyalar) d.toJson()],
  };

  /// Savunmacı okuma: biçim bozuksa [ManifestHatasi] fırlatır.
  /// [yolKati] false ise geçersiz yollu kayıtlar da okunur; bunları
  /// temizleyici aday aşamasında atlar.
  factory SurumManifesti.fromJson(Object? json, {bool yolKati = true}) {
    if (json is! Map) throw const ManifestHatasi('manifest nesne değil');
    final surum = json['surum'];
    final dosyalar = json['dosyalar'];
    if (surum is! String || surum.isEmpty) {
      throw const ManifestHatasi('surum metin olmalı');
    }
    if (dosyalar is! List) throw const ManifestHatasi('dosyalar liste olmalı');
    final liste = [
      for (final d in dosyalar) ManifestDosyasi.fromJson(d, yolKati: yolKati),
    ];
    final gorulen = <String>{};
    for (final d in liste) {
      if (!gorulen.add(d.yol)) throw ManifestHatasi('yinelenen yol: ${d.yol}');
    }
    return SurumManifesti(surum: surum, dosyalar: List.unmodifiable(liste));
  }
}
