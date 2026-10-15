/// Öğrenci durumu: XP, seri, aralıklı tekrar kartları, tamamlanan dersler.
/// Değiştirilemez (immutable); motor yeni kopya döndürür.
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

  static final _gunDeseni = RegExp(r'^\d{4}-\d{2}-\d{2}$');
  static bool gunGecerli(String s) => _gunDeseni.hasMatch(s);

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
      hatirlatmaSaati:
          hatirlatmaSil ? null : (hatirlatmaSaati ?? this.hatirlatmaSaati),
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
          if (k is String && k.length <= 120 && anahtarUygun(k) && d is int && d >= 0) {
            m[k] = d;
          }
        }
      }
      return m;
    }
    final sonGun = j['sonGun'];
    final saat = j['hatirlatmaSaati'];
    return OgrenciDurumu(
      xp: tamsayi(j['xp'], 0),
      seri: tamsayi(j['seri'], 0, max: 100000),
      enSeri: tamsayi(j['enSeri'], 0, max: 100000),
      sonGun: (sonGun is String && gunGecerli(sonGun)) ? sonGun : null,
      kartlar: kartlar,
      tamamlanan: sayac(j['tamamlanan'], (k) => !k.contains('#')),
      gunlukXp: sayac(j['gunlukXp'], gunGecerli),
      gunlukHedef: tamsayi(j['gunlukHedef'], 30, min: 10, max: 500),
      ad: (j['ad'] is String && (j['ad'] as String).length <= 40) ? j['ad'] as String : '',
      koyuTema: j['koyuTema'] is bool ? j['koyuTema'] as bool : null,
      sesAcik: j['sesAcik'] is bool ? j['sesAcik'] as bool : true,
      hatirlatmaSaati:
          (saat is String && RegExp(r'^\d{2}:\d{2}$').hasMatch(saat)) ? saat : null,
    );
  }
}
