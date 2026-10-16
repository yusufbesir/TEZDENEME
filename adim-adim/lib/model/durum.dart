/// Öğrenci durumu: XP, seri, aralıklı tekrar kartları, tamamlanan dersler.
/// Değiştirilemez (immutable); motor yeni kopya döndürür.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla.
library;

class Kart {
  const Kart({required this.kutu, required this.sonraki});

  /// Leitner kutusu 1..5.
  final int kutu;

  /// Bir sonraki tekrar günü, 'YYYY-MM-DD'.
  final String sonraki;

  Map<String, Object?> toJson() => {'kutu': kutu, 'sonraki': sonraki};

  static Kart? fromJson(Object? j) {
    if (j is! Map) return null;
    final kutu = j['kutu'];
    final sonraki = j['sonraki'];
    if (kutu is! int || kutu < 1 || kutu > 5) return null;
    if (sonraki is! String || !OgrenciDurumu.gunGecerli(sonraki)) return null;
    return Kart(kutu: kutu, sonraki: sonraki);
  }
}

class OgrenciDurumu {
  const OgrenciDurumu({
    this.xp = 0,
    this.seri = 0,
    this.enSeri = 0,
    this.sonGun,
    this.kartlar = const {},
    this.tamamlanan = const {},
    this.gunlukXp = const {},
    this.gunlukHedef = 30,
    this.ad = '',
    this.koyuTema,
    this.sesAcik = true,
    this.hatirlatmaSaati,
    this.alan,
  });

  final int xp;
  final int seri;
  final int enSeri;
  final String? sonGun; // son çalışılan gün 'YYYY-MM-DD'
  final Map<String, Kart> kartlar; // kartKimliği -> Kart
  final Map<String, int> tamamlanan; // dersId -> kaç kez bitirildi
  final Map<String, int> gunlukXp; // gün -> o gün kazanılan XP
  final int gunlukHedef; // XP
  final String ad; // kullanıcı adı (isteğe bağlı)
  final bool? koyuTema; // null: sistem
  final bool sesAcik;
  final String? hatirlatmaSaati; // 'HH:MM', null: kapalı
  final String? alan; // 'dil' | 'kod'; null: henüz seçilmedi

  static final _gunDeseni = RegExp(r'^\d{4}-\d{2}-\d{2}$');

  /// Biçim ve takvim denetimi: 'YYYY-MM-DD', 2000-2100 arası, gerçek bir gün
  /// (ör. 2026-02-30 geçersiz).
  static bool gunGecerli(String s) {
    if (!_gunDeseni.hasMatch(s)) return false;
    final yil = int.parse(s.substring(0, 4));
    final ay = int.parse(s.substring(5, 7));
    final gun = int.parse(s.substring(8, 10));
    if (yil < 2000 || yil > 2100 || ay < 1 || ay > 12 || gun < 1) return false;
    final t = DateTime.utc(yil, ay, gun);
    return t.year == yil && t.month == ay && t.day == gun;
  }

  /// 'HH:MM', 00-23 ve 00-59 aralığında.
  static bool saatGecerli(String s) {
    if (!RegExp(r'^\d{2}:\d{2}$').hasMatch(s)) return false;
    final saat = int.parse(s.substring(0, 2));
    final dakika = int.parse(s.substring(3, 5));
    return saat <= 23 && dakika <= 59;
  }

  OgrenciDurumu copyWith({
    int? xp,
    int? seri,
    int? enSeri,
    String? sonGun,
    Map<String, Kart>? kartlar,
    Map<String, int>? tamamlanan,
    Map<String, int>? gunlukXp,
    int? gunlukHedef,
    String? ad,
    bool? koyuTema,
    bool koyuTemaSil = false,
    bool? sesAcik,
    String? hatirlatmaSaati,
    bool hatirlatmaSil = false,
    String? alan,
  }) {
    return OgrenciDurumu(
      xp: xp ?? this.xp,
      seri: seri ?? this.seri,
      enSeri: enSeri ?? this.enSeri,
      sonGun: sonGun ?? this.sonGun,
      kartlar: kartlar ?? this.kartlar,
      tamamlanan: tamamlanan ?? this.tamamlanan,
      gunlukXp: gunlukXp ?? this.gunlukXp,
      gunlukHedef: gunlukHedef ?? this.gunlukHedef,
      ad: ad ?? this.ad,
      koyuTema: koyuTemaSil ? null : (koyuTema ?? this.koyuTema),
      sesAcik: sesAcik ?? this.sesAcik,
      hatirlatmaSaati: hatirlatmaSil
          ? null
          : (hatirlatmaSaati ?? this.hatirlatmaSaati),
      alan: alan ?? this.alan,
    );
  }

  Map<String, Object?> toJson() => {
    'surum': 1,
    'xp': xp,
    'seri': seri,
    'enSeri': enSeri,
    'sonGun': sonGun,
    'kartlar': {for (final e in kartlar.entries) e.key: e.value.toJson()},
    'tamamlanan': tamamlanan,
    'gunlukXp': gunlukXp,
    'gunlukHedef': gunlukHedef,
    'ad': ad,
    'koyuTema': koyuTema,
    'sesAcik': sesAcik,
    'hatirlatmaSaati': hatirlatmaSaati,
    'alan': alan,
  };

  /// Bozuk ya da eksik alanları sessizce varsayılana çeker; asla fırlatmaz.
  /// Anahtarlar yalnızca beklenen biçimde (ders/kart kimliği, gün) kabul edilir.
  static OgrenciDurumu fromJson(Object? j) {
    if (j is! Map) return const OgrenciDurumu();
    int tamsayi(Object? v, int varsayilan, {int min = 0, int max = 1 << 40}) =>
        (v is int && v >= min && v <= max) ? v : varsayilan;
    final kartlar = <String, Kart>{};
    final hamKart = j['kartlar'];
    if (hamKart is Map) {
      for (final e in hamKart.entries) {
        final k = e.key;
        if (k is! String || k.length > 120 || !k.contains('#')) continue;
        final kart = Kart.fromJson(e.value);
        if (kart != null) kartlar[k] = kart;
      }
    }
    Map<String, int> sayac(Object? v, bool Function(String) anahtarUygun) {
      final m = <String, int>{};
      if (v is Map) {
        for (final e in v.entries) {
          final k = e.key;
          final d = e.value;
          if (k is String &&
              k.length <= 120 &&
              anahtarUygun(k) &&
              d is int &&
              d >= 0 &&
              d <= (1 << 40)) {
            m[k] = d;
          }
        }
      }
      return m;
    }

    final sonGun = j['sonGun'];
    final saat = j['hatirlatmaSaati'];
    final alan = j['alan'];
    return OgrenciDurumu(
      xp: tamsayi(j['xp'], 0),
      seri: tamsayi(j['seri'], 0, max: 100000),
      enSeri: tamsayi(j['enSeri'], 0, max: 100000),
      sonGun: (sonGun is String && gunGecerli(sonGun)) ? sonGun : null,
      kartlar: kartlar,
      tamamlanan: sayac(j['tamamlanan'], (k) => !k.contains('#')),
      gunlukXp: sayac(j['gunlukXp'], gunGecerli),
      gunlukHedef: tamsayi(j['gunlukHedef'], 30, min: 10, max: 500),
      ad: j['ad'] is String
          ? String.fromCharCodes((j['ad'] as String).runes.take(40))
          : '',
      koyuTema: j['koyuTema'] is bool ? j['koyuTema'] as bool : null,
      sesAcik: j['sesAcik'] is bool ? j['sesAcik'] as bool : true,
      hatirlatmaSaati: (saat is String && saatGecerli(saat)) ? saat : null,
      alan: (alan == 'dil' || alan == 'kod') ? alan as String : null,
    );
  }
}
