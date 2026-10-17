/// Öğrenci durumu: XP, seri, aralıklı tekrar kartları (yarı ömür), hata defteri,
/// haftalık hedef, tamamlanan dersler.
/// Değiştirilemez (immutable); motor yeni kopya döndürür.
/// Eski kayıtlar geriye uyumlu okunur: yeni alanlar yoksa varsayılan değer
/// (kartta yarı ömür eski Leitner kutusundan türetilir, hata defteri boş,
/// haftalık hedef 5).
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla.
library;

class Kart {
  const Kart({
    required this.kutu,
    required this.sonraki,
    this.yariOmurGun = 1.0,
    this.sonCevap,
  });

  /// En kısa ve en uzun yarı ömür (gün).
  static const double enAzYariOmur = 0.5;
  static const double enCokYariOmur = 180;

  /// Kelime sağlığı kümeleri (yarı ömür, gün): [ortaEsik] altı "zayıf",
  /// [ortaEsik]..[gucluEsik] arası "orta", [gucluEsik] üstü "güçlü".
  static const double ortaEsik = 2.0;
  static const double gucluEsik = 7.0;

  /// Leitner kutusu 1..5; yarı ömürden türetilen gösterge (Tekrar rozetleri).
  final int kutu;

  /// Bir sonraki tekrar günü, 'YYYY-MM-DD'.
  final String sonraki;

  /// Kişisel unutma eğrisinin yarı ömrü, gün (0,5..180). Settles & Meeder 2016,
  /// basitleştirilmiş: doğruda x2, yanlışta /2.
  final double yariOmurGun;

  /// Son cevap doğru muydu? null: bilinmiyor (eski kayıt ya da hiç cevaplanmadı).
  final bool? sonCevap;

  /// Yarı ömürden 1..5 gösterge kutusu: <2 gün 1, <4 gün 2, <8 gün 3,
  /// <16 gün 4, daha fazlası 5.
  static int kutuHesapla(double yariOmur) {
    if (yariOmur < 2) return 1;
    if (yariOmur < 4) return 2;
    if (yariOmur < 8) return 3;
    if (yariOmur < 16) return 4;
    return 5;
  }

  /// Eski Leitner kutusunun gün aralığı (1,2,4,8,16); yarı ömür alanı olmayan
  /// eski kayıtların başlangıç yarı ömrü.
  static double kutudanYariOmur(int kutu) =>
      (1 << (kutu < 1 ? 0 : (kutu > 5 ? 4 : kutu - 1))).toDouble();

  Map<String, Object?> toJson() => {
    'kutu': kutu,
    'sonraki': sonraki,
    'yariOmurGun': yariOmurGun,
    'sonCevap': sonCevap,
  };

  static Kart? fromJson(Object? j) {
    if (j is! Map) return null;
    final kutu = j['kutu'];
    final sonraki = j['sonraki'];
    if (kutu is! int || kutu < 1 || kutu > 5) return null;
    if (sonraki is! String || !OgrenciDurumu.gunGecerli(sonraki)) return null;
    final ham = j['yariOmurGun'];
    final yariOmur =
        (ham is num &&
            ham.isFinite &&
            ham >= enAzYariOmur &&
            ham <= enCokYariOmur)
        ? ham.toDouble()
        : kutudanYariOmur(kutu);
    final son = j['sonCevap'];
    return Kart(
      kutu: kutu,
      sonraki: sonraki,
      yariOmurGun: yariOmur,
      sonCevap: son is bool ? son : null,
    );
  }
}

/// Hata defteri kaydı: yanlış cevaplanan bir yarışma sorusu ya da alıştırma kartı.
class HataKaydi {
  const HataKaydi({
    required this.tur,
    required this.id,
    required this.seviye,
    required this.gun,
    this.kategori,
  });

  static const String turKart = 'kart';
  static const String turYarisma = 'yarisma';

  /// En çok saklanan kayıt sayısı; en eskisi düşer.
  static const int enCok = 200;

  /// 'kart' (alıştırma kartı, id = dersId#indeks) | 'yarisma' (soru id).
  final String tur;
  final String id;

  /// Yarışma kategorisinin kimliği ([YarismaKategori.kimlik]); kartta null.
  final String? kategori;

  /// Kurs/seviye kimliği, ör. 'ingilizce-1', 'html-1'.
  final String seviye;

  /// Yanlışın yapıldığı gün 'YYYY-MM-DD'.
  final String gun;

  Map<String, Object?> toJson() => {
    'tur': tur,
    'id': id,
    'kategori': kategori,
    'seviye': seviye,
    'gun': gun,
  };

  static HataKaydi? fromJson(Object? j) {
    if (j is! Map) return null;
    final tur = j['tur'];
    final id = j['id'];
    final seviye = j['seviye'];
    final gun = j['gun'];
    final kategori = j['kategori'];
    if (tur != turKart && tur != turYarisma) return null;
    if (id is! String || id.isEmpty || id.length > 120) return null;
    if (seviye is! String || seviye.length > 60) return null;
    if (gun is! String || !OgrenciDurumu.gunGecerli(gun)) return null;
    return HataKaydi(
      tur: tur as String,
      id: id,
      seviye: seviye,
      gun: gun,
      kategori: (kategori is String && kategori.length <= 30) ? kategori : null,
    );
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
    this.hatalar = const [],
    this.haftalikHedefGun = varsayilanHaftalikHedef,
  });

  /// Haftalık hedef (haftada çalışılacak gün) sınırları ve varsayılanı.
  static const int enAzHaftalikHedef = 3;
  static const int enCokHaftalikHedef = 7;
  static const int varsayilanHaftalikHedef = 5;

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

  /// Hata defteri, eskiden yeniye; en çok [HataKaydi.enCok] kayıt.
  final List<HataKaydi> hatalar;

  /// Haftada kaç gün çalışılacak (3..7, varsayılan 5). Haftalık ilerleme
  /// ayrıca saklanmaz; `gunlukXp`ten hesaplanır (Motor.haftaGunSayisi).
  final int haftalikHedefGun;

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
    List<HataKaydi>? hatalar,
    int? haftalikHedefGun,
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
      hatalar: hatalar ?? this.hatalar,
      haftalikHedefGun: haftalikHedefGun ?? this.haftalikHedefGun,
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
    'hatalar': [for (final h in hatalar) h.toJson()],
    'haftalikHedefGun': haftalikHedefGun,
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
    final hamHata = j['hatalar'];
    final hatalar = <HataKaydi>[];
    if (hamHata is List) {
      for (final e in hamHata) {
        final h = HataKaydi.fromJson(e);
        if (h != null) hatalar.add(h);
      }
    }
    final sonHatalar = hatalar.length > HataKaydi.enCok
        ? hatalar.sublist(hatalar.length - HataKaydi.enCok)
        : hatalar;
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
      hatalar: List.unmodifiable(sonHatalar),
      haftalikHedefGun: tamsayi(
        j['haftalikHedefGun'],
        varsayilanHaftalikHedef,
        min: enAzHaftalikHedef,
        max: enCokHaftalikHedef,
      ),
    );
  }
}
