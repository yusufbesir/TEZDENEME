/// Uygulama kilidi (PIN): saf model ve saf işlevler. PIN düz metin SAKLANMAZ;
/// rastgele tuz + yineli SHA-256 karması tutulur ([KilitAyari]). Yanlış
/// deneme sayacı ve bekleme süresi [DenemeKilidi] içindedir (saf; zaman
/// dışarıdan verilir). Biyometri yok (sonraki sürüm); yalnız 4-6 haneli PIN.
/// Okuma asla fırlatmaz; bozuk kayıt "kilit yok" sayılır (fail-open: veri
/// kaybı yerine kilitsiz açılış).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Yazan: [Claude#kilit-2026-11-04].
library;

import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';

/// Saklanan kilit ayarı: tuz (base64, 16 bayt), karma (hex SHA-256) ve
/// yineleme sayısı. Değiştirilemez.
class KilitAyari {
  const KilitAyari({
    required this.tuz,
    required this.karma,
    this.yineleme = varsayilanYineleme,
  });

  final String tuz;
  final String karma;
  final int yineleme;

  static const int varsayilanYineleme = 20000;
  static const int enAzYineleme = 1;
  static const int enCokYineleme = 1000000;
  static const int tuzBayt = 16;

  static const int enAzPin = 4;
  static const int enCokPin = 6;

  /// Üst üste bu kadar yanlıştan sonra [beklemeSuresi] kadar deneme kapanır.
  static const int enCokYanlis = 5;
  static const Duration beklemeSuresi = Duration(seconds: 30);

  static final _pinDeseni = RegExp(r'^[0-9]{4,6}$');
  static final _hexDeseni = RegExp(r'^[0-9a-f]{64}$');

  /// Yalnız 4-6 ASCII rakam.
  static bool pinGecerli(String pin) => _pinDeseni.hasMatch(pin);

  /// Rastgele tuz (base64). Üretimde [Random.secure]; test sabit üretici verir.
  static String tuzUret([Random? rastgele]) {
    final r = rastgele ?? Random.secure();
    final baytlar = List<int>.generate(tuzBayt, (_) => r.nextInt(256));
    return base64Encode(baytlar);
  }

  /// `tuz:pin` metninin [yineleme] kez zincirlenmiş SHA-256'sı (hex).
  static String karmaHesapla(
    String pin,
    String tuz, {
    int yineleme = varsayilanYineleme,
  }) {
    final tur = yineleme.clamp(enAzYineleme, enCokYineleme);
    List<int> veri = utf8.encode('$tuz:$pin');
    for (var i = 0; i < tur; i++) {
      veri = sha256.convert(veri).bytes;
    }
    return _hex(veri);
  }

  static String _hex(List<int> b) =>
      b.map((x) => x.toRadixString(16).padLeft(2, '0')).join();

  /// Geçerli PIN'den yeni ayar; geçersiz PIN [ArgumentError] fırlatır.
  static KilitAyari olustur(String pin, {Random? rastgele}) {
    if (!pinGecerli(pin)) {
      throw ArgumentError.value(pin, 'pin', 'PIN 4-6 rakam olmalı');
    }
    final tuz = tuzUret(rastgele);
    return KilitAyari(tuz: tuz, karma: karmaHesapla(pin, tuz));
  }

  /// PIN doğru mu? Geçersiz biçim doğrudan false; karşılaştırma sabit sürelidir.
  bool dogrula(String pin) {
    if (!pinGecerli(pin)) return false;
    return sabitSureliEsit(karmaHesapla(pin, tuz, yineleme: yineleme), karma);
  }

  /// Uzunluk farkı dışında erken çıkmayan karşılaştırma.
  static bool sabitSureliEsit(String a, String b) {
    if (a.length != b.length) return false;
    var fark = 0;
    for (var i = 0; i < a.length; i++) {
      fark |= a.codeUnitAt(i) ^ b.codeUnitAt(i);
    }
    return fark == 0;
  }

  Map<String, Object?> toJson() => {
    'tuz': tuz,
    'karma': karma,
    'yineleme': yineleme,
  };

  /// Asla fırlatmaz; bozuk ya da eksik kayıt null (kilit yok) döner.
  static KilitAyari? fromJson(Object? j) {
    if (j is! Map) return null;
    final tuz = j['tuz'];
    final karma = j['karma'];
    final yineleme = j['yineleme'];
    if (tuz is! String || tuz.isEmpty || tuz.length > 64) return null;
    if (karma is! String || !_hexDeseni.hasMatch(karma)) return null;
    if (yineleme is! int ||
        yineleme < enAzYineleme ||
        yineleme > enCokYineleme) {
      return null;
    }
    return KilitAyari(tuz: tuz, karma: karma, yineleme: yineleme);
  }
}

/// Yanlış deneme sayacı: [KilitAyari.enCokYanlis] üst üste yanlıştan sonra
/// [KilitAyari.beklemeSuresi] boyunca deneme kabul edilmez. Saf; "şimdi"
/// dışarıdan verilir. Bellekte tutulur, diske yazılmaz.
class DenemeKilidi {
  const DenemeKilidi({this.yanlis = 0, this.beklemeBitis});

  /// Üst üste yanlış sayısı (bekleme başlayınca sıfırlanır).
  final int yanlis;

  /// Bekleme bitiş anı; null: bekleme yok.
  final DateTime? beklemeBitis;

  bool bekliyorMu(DateTime simdi) =>
      beklemeBitis != null && simdi.isBefore(beklemeBitis!);

  /// Kalan bekleme; bekleme yoksa sıfır.
  Duration kalan(DateTime simdi) {
    final b = beklemeBitis;
    if (b == null || !simdi.isBefore(b)) return Duration.zero;
    return b.difference(simdi);
  }

  /// Bir yanlış deneme daha. Sınıra ulaşınca bekleme başlar, sayaç sıfırlanır.
  /// Bekleme sürerken çağrılırsa durum değişmez.
  DenemeKilidi yanlisDene(DateTime simdi) {
    if (bekliyorMu(simdi)) return this;
    final y = yanlis + 1;
    if (y >= KilitAyari.enCokYanlis) {
      return DenemeKilidi(
        yanlis: 0,
        beklemeBitis: simdi.add(KilitAyari.beklemeSuresi),
      );
    }
    return DenemeKilidi(yanlis: y, beklemeBitis: beklemeBitis);
  }

  /// Doğru PIN: sayaç ve bekleme temizlenir.
  DenemeKilidi sifirla() => const DenemeKilidi();
}
