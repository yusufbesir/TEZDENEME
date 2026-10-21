/// Öğrenci durumu: XP, seri, aralıklı tekrar kartları (yarı ömür), hata defteri,
/// haftalık hedef, tamamlanan dersler, son açılan ders, öğrenme günlüğü,
/// kelime notları (kişisel mnemonikler), günün bilmecesi cevabı, ilk açılış
/// akışının tamamlanma bayrağı ve açılıştaki "bekleyen tekrar" bildiriminin
/// ayarı/son gösterim günü.
/// Değiştirilemez (immutable); motor yeni kopya döndürür.
/// Eski kayıtlar geriye uyumlu okunur: yeni alanlar yoksa varsayılan değer
/// (`atlananDersler`: seviye belirleme sınavında atlanan dersler, boş küme)
/// (kartta yarı ömür eski Leitner kutusundan türetilir, hata defteri boş,
/// haftalık hedef 5, son ders yok, günlük boş, not yok, bilmece cevaplanmamış;
/// `ilkAcilisTamam` alanı yoksa alan doluysa true sayılır: mevcut kullanıcı
/// ilk açılış akışını görmez; tekrar bildirimi açık ve hiç gösterilmemiş).
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

/// Öğrenme günlüğü kaydı: bitirilen bir ders, mikro ders, tekrar oturumu,
/// yarışma, ders sonu kısa quiz ya da günün bilmecesi. Günlük, en çok [enCok]
/// kayıt tutar; en eskisi düşer.
class GunlukKayit {
  const GunlukKayit({
    required this.gun,
    required this.tur,
    this.id,
    this.dogru = 0,
    this.toplam = 0,
    this.xp = 0,
  });

  static const String turDers = 'ders';
  static const String turMikro = 'mikro';
  static const String turTekrar = 'tekrar';
  static const String turYarisma = 'yarisma';
  static const String turQuiz = 'quiz';
  static const String turBilmece = 'bilmece';
  static const String turHikaye = 'hikaye';
  static const List<String> turler = [
    turDers,
    turMikro,
    turTekrar,
    turYarisma,
    turQuiz,
    turBilmece,
    turHikaye,
  ];

  /// En çok saklanan kayıt sayısı; en eskisi düşer.
  static const int enCok = 200;

  /// Sayaçların üst sınırı (bozuk kayıtlara karşı).
  static const int _enCokSayi = 1 << 30;

  /// Kaydın günü 'YYYY-MM-DD'.
  final String gun;

  /// 'ders' | 'mikro' | 'tekrar' | 'yarisma' | 'quiz' | 'bilmece' | 'hikaye'.
  final String tur;

  /// Ders kimliği (ders, quiz) ya da kategori (yarışma); diğerlerinde null.
  final String? id;

  /// Doğru cevap sayısı ve toplam soru; yarışmada bilinmiyorsa 0/0.
  final int dogru;
  final int toplam;

  /// O kayıtla kazanılan XP.
  final int xp;

  Map<String, Object?> toJson() => {
    'gun': gun,
    'tur': tur,
    'id': id,
    'dogru': dogru,
    'toplam': toplam,
    'xp': xp,
  };

  /// Bozuk kaydı null döndürür (atlanır); eksik sayaçlar 0 sayılır.
  static GunlukKayit? fromJson(Object? j) {
    if (j is! Map) return null;
    final gun = j['gun'];
    final tur = j['tur'];
    final id = j['id'];
    if (gun is! String || !OgrenciDurumu.gunGecerli(gun)) return null;
    if (tur is! String || !turler.contains(tur)) return null;
    int sayi(Object? v) => (v is int && v >= 0 && v <= _enCokSayi) ? v : 0;
    return GunlukKayit(
      gun: gun,
      tur: tur,
      id: (id is String && id.isNotEmpty && id.length <= 120) ? id : null,
      dogru: sayi(j['dogru']),
      toplam: sayi(j['toplam']),
      xp: sayi(j['xp']),
    );
  }
}

/// Günün bilmecesinin cevabı: hangi gün cevaplandı ve doğru muydu.
/// Aynı gün ikinci cevap kabul edilmez (Motor.bilmeceCevapla).
class BilmeceDurumu {
  const BilmeceDurumu({required this.gun, required this.dogru});

  /// Cevabın günü 'YYYY-MM-DD'.
  final String gun;

  /// Cevap doğru muydu?
  final bool dogru;

  Map<String, Object?> toJson() => {'gun': gun, 'dogru': dogru};

  /// Bozuk kaydı null döndürür (cevaplanmamış sayılır).
  static BilmeceDurumu? fromJson(Object? j) {
    if (j is! Map) return null;
    final gun = j['gun'];
    final dogru = j['dogru'];
    if (gun is! String || !OgrenciDurumu.gunGecerli(gun)) return null;
    if (dogru is! bool) return null;
    return BilmeceDurumu(gun: gun, dogru: dogru);
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
    this.sonDersId,
    this.gunluk = const [],
    this.kelimeNotlari = const {},
    this.bilmece,
    bool? ilkAcilisTamam,
    this.sonTekrarBildirimGunu,
    this.tekrarBildirimiAcik = true,
    this.konusmaAcik = true,
    this.tamamlananHikayeler = const {},
    this.atlananDersler = const {},
    this.calismaPlani,
  }) : _ilkAcilisTamam = ilkAcilisTamam;

  /// Kelime notu sınırları: tek not en çok [notEnCokKarakter] karakter,
  /// toplam en çok [notEnCok] not (eski JSON'da fazlası atlanır).
  static const int notEnCokKarakter = 200;
  static const int notEnCok = 500;

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

  /// En son açılan/bitirilen dersin kimliği; "Kaldığın yerden devam" kartı.
  final String? sonDersId;

  /// Öğrenme günlüğü, eskiden yeniye; en çok [GunlukKayit.enCok] kayıt.
  final List<GunlukKayit> gunluk;

  /// Kelimeye kişisel not (mnemonik): kart kimliği ('dersId#i') -> not metni
  /// (en çok [notEnCokKarakter] karakter). Eski kayıtlarda boş.
  final Map<String, String> kelimeNotlari;

  /// Günün bilmecesinin son cevabı; null: hiç cevaplanmadı (eski kayıtlar).
  final BilmeceDurumu? bilmece;

  /// İlk açılış akışının ("Hoş geldin") açıkça kaydedilmiş sonucu; null:
  /// belirtilmemiş (eski kayıt ya da doğrudan kurulmuş durum).
  final bool? _ilkAcilisTamam;

  /// Açılıştaki "bekleyen tekrar" bildiriminin en son gösterildiği gün
  /// 'YYYY-MM-DD'; null: hiç gösterilmedi. Günde en çok bir kez gösterilir.
  final String? sonTekrarBildirimGunu;

  /// Açılışta bekleyen tekrar sayısı bildirilsin mi? Varsayılan true.
  final bool tekrarBildirimiAcik;

  /// Konuşma alıştırmaları (Soyle) derse dahil edilsin mi? Varsayılan true;
  /// kapalıysa ders akışında bu alıştırmalar çıkarılır.
  final bool konusmaAcik;

  /// Okuma hikâyeleri: hikâye kimliği -> kaç kez tamamlandı (eski kayıtta boş).
  final Map<String, int> tamamlananHikayeler;

  /// Seviye belirleme sınavıyla "atlandı" işaretlenen derslerin kimlikleri
  /// (eski kayıtta boş). Atlanan ders yolda tamamlanmış sayılır ve sonrasını
  /// açar (Motor.dersBitmis), ama `tamamlanan`a, XP/seriye ve kartlara yansımaz.
  final Set<String> atlananDersler;

  /// Çalışma planı (hedef + günde dakika + haftanın günleri); null: plan yok
  /// (eski kayıtlar). Haftalık hedefle (`haftalikHedefGun`) ayrı tutulur.
  final CalismaPlani? calismaPlani;

  /// İlk açılış akışı tamamlandı mı? Varsayılan false. Belirtilmemişse alan
  /// doluysa true sayılır: eski JSON'daki mevcut kullanıcı akışı görmez,
  /// alan seçilmemiş yeni kullanıcı görür.
  bool get ilkAcilisTamam => _ilkAcilisTamam ?? alan != null;

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
    String? sonDersId,
    List<GunlukKayit>? gunluk,
    Map<String, String>? kelimeNotlari,
    BilmeceDurumu? bilmece,
    bool? ilkAcilisTamam,
    String? sonTekrarBildirimGunu,
    bool? tekrarBildirimiAcik,
    bool? konusmaAcik,
    Map<String, int>? tamamlananHikayeler,
    Set<String>? atlananDersler,
    CalismaPlani? calismaPlani,
    bool calismaPlaniSil = false,
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
      sonDersId: sonDersId ?? this.sonDersId,
      gunluk: gunluk ?? this.gunluk,
      kelimeNotlari: kelimeNotlari ?? this.kelimeNotlari,
      bilmece: bilmece ?? this.bilmece,
      ilkAcilisTamam: ilkAcilisTamam ?? _ilkAcilisTamam,
      sonTekrarBildirimGunu:
          sonTekrarBildirimGunu ?? this.sonTekrarBildirimGunu,
      tekrarBildirimiAcik: tekrarBildirimiAcik ?? this.tekrarBildirimiAcik,
      konusmaAcik: konusmaAcik ?? this.konusmaAcik,
      tamamlananHikayeler: tamamlananHikayeler ?? this.tamamlananHikayeler,
      atlananDersler: atlananDersler ?? this.atlananDersler,
      calismaPlani: calismaPlaniSil
          ? null
          : (calismaPlani ?? this.calismaPlani),
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
    'sonDersId': sonDersId,
    'gunluk': [for (final g in gunluk) g.toJson()],
    'kelimeNotlari': kelimeNotlari,
    'bilmece': bilmece?.toJson(),
    'ilkAcilisTamam': ilkAcilisTamam,
    'sonTekrarBildirimGunu': sonTekrarBildirimGunu,
    'tekrarBildirimiAcik': tekrarBildirimiAcik,
    'konusmaAcik': konusmaAcik,
    'tamamlananHikayeler': tamamlananHikayeler,
    'atlananDersler': atlananDersler.toList()..sort(),
    'calismaPlani': calismaPlani?.toJson(),
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
    final hamGunluk = j['gunluk'];
    final gunluk = <GunlukKayit>[];
    if (hamGunluk is List) {
      for (final e in hamGunluk) {
        final g = GunlukKayit.fromJson(e);
        if (g != null) gunluk.add(g);
      }
    }
    final sonGunluk = gunluk.length > GunlukKayit.enCok
        ? gunluk.sublist(gunluk.length - GunlukKayit.enCok)
        : gunluk;
    final sonDers = j['sonDersId'];
    final sonTekrarGunu = j['sonTekrarBildirimGunu'];
    // Kelime notları: anahtar kart kimliği ('#' içerir), değer boş olmayan
    // metin (en çok notEnCokKarakter); fazlası ve bozuk girdiler atlanır.
    final notlar = <String, String>{};
    final hamNot = j['kelimeNotlari'];
    if (hamNot is Map) {
      for (final e in hamNot.entries) {
        if (notlar.length >= notEnCok) break;
        final k = e.key;
        final v = e.value;
        if (k is! String || k.isEmpty || k.length > 120 || !k.contains('#')) {
          continue;
        }
        if (v is! String) continue;
        final metin = v.trim();
        if (metin.isEmpty || metin.length > notEnCokKarakter) continue;
        notlar[k] = metin;
      }
    }
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
      sonDersId:
          (sonDers is String &&
              sonDers.isNotEmpty &&
              sonDers.length <= 120 &&
              !sonDers.contains('#'))
          ? sonDers
          : null,
      gunluk: List.unmodifiable(sonGunluk),
      kelimeNotlari: Map.unmodifiable(notlar),
      bilmece: BilmeceDurumu.fromJson(j['bilmece']),
      // Eski kayıtta alan yoksa null kalır; getter alan doluysa true sayar.
      ilkAcilisTamam: j['ilkAcilisTamam'] is bool
          ? j['ilkAcilisTamam'] as bool
          : null,
      // Eski kayıtta yoksa: hiç gösterilmedi, bildirim açık.
      sonTekrarBildirimGunu:
          (sonTekrarGunu is String && gunGecerli(sonTekrarGunu))
          ? sonTekrarGunu
          : null,
      tekrarBildirimiAcik: j['tekrarBildirimiAcik'] is bool
          ? j['tekrarBildirimiAcik'] as bool
          : true,
      konusmaAcik: j['konusmaAcik'] is bool ? j['konusmaAcik'] as bool : true,
      // Eski kayıtta yoksa boş; anahtar hikâye kimliği ('#' içermez).
      tamamlananHikayeler: sayac(
        j['tamamlananHikayeler'],
        (k) => !k.contains('#'),
      ),
      // Eski kayıtta yoksa boş; geçerli ders kimliği (en çok 120 karakter,
      // '#' içermez) olmayan girdiler atlanır.
      atlananDersler: Set.unmodifiable({
        if (j['atlananDersler'] is List)
          for (final e in j['atlananDersler'] as List)
            if (e is String &&
                e.isNotEmpty &&
                e.length <= 120 &&
                !e.contains('#'))
              e,
      }),
      // Eski kayıtta yoksa ya da bozuksa null (plan yok).
      calismaPlani: CalismaPlani.fromJson(j['calismaPlani']),
    );
  }
}

/// Çalışma planı: hangi kurs (ve istenirse hangi ünite), günde kaç dakika,
/// haftanın hangi günleri (1=Pazartesi .. 7=Pazar). Hesaplar Motor'dadır.
class CalismaPlani {
  const CalismaPlani({
    required this.kursId,
    this.uniteId,
    this.gunlukDakika = 15,
    this.gunler = const {1, 2, 3, 4, 5},
  });

  /// Seçilebilir günlük süreler (dakika).
  static const List<int> dakikaSecenekleri = [10, 15, 20, 30];

  final String kursId;

  /// Hedef ünite kimliği; null: kursun tamamı.
  final String? uniteId;
  final int gunlukDakika;
  final Set<int> gunler;

  CalismaPlani copyWith({
    String? kursId,
    String? uniteId,
    bool uniteSil = false,
    int? gunlukDakika,
    Set<int>? gunler,
  }) => CalismaPlani(
    kursId: kursId ?? this.kursId,
    uniteId: uniteSil ? null : (uniteId ?? this.uniteId),
    gunlukDakika: gunlukDakika ?? this.gunlukDakika,
    gunler: gunler ?? this.gunler,
  );

  Map<String, Object?> toJson() => {
    'kursId': kursId,
    'uniteId': uniteId,
    'gunlukDakika': gunlukDakika,
    'gunler': gunler.toList()..sort(),
  };

  /// Eksik/bozuk girdide null (plan yok); asla fırlatmaz. Dakika geçersizse
  /// 15, günler 1..7 dışındakiler atılır ve boşsa plan geçersizdir.
  static CalismaPlani? fromJson(Object? j) {
    if (j is! Map) return null;
    final k = j['kursId'];
    if (k is! String || k.isEmpty || k.length > 120) return null;
    final u = j['uniteId'];
    final dk = j['gunlukDakika'];
    final g = {
      if (j['gunler'] is List)
        for (final e in j['gunler'] as List)
          if (e is int && e >= 1 && e <= 7) e,
    };
    if (g.isEmpty) return null;
    return CalismaPlani(
      kursId: k,
      uniteId: u is String && u.isNotEmpty && u.length <= 120 ? u : null,
      gunlukDakika: dk is int && dakikaSecenekleri.contains(dk) ? dk : 15,
      gunler: Set.unmodifiable(g),
    );
  }

  @override
  bool operator ==(Object other) =>
      other is CalismaPlani &&
      other.kursId == kursId &&
      other.uniteId == uniteId &&
      other.gunlukDakika == gunlukDakika &&
      other.gunler.length == gunler.length &&
      other.gunler.containsAll(gunler);

  @override
  int get hashCode => Object.hash(
    kursId,
    uniteId,
    gunlukDakika,
    Object.hashAllUnordered(gunler),
  );
}
