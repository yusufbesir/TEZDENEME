/// Satranç modülünün öğrenci durumu (ÖZELLİK 47, 52-57): günlük bulmaca
/// sonuçları, çözülen bulmacalar, yanlış çözülenlerin ve bitirilen derslerin
/// tekrar destesi (ayrı yarı ömürlü kartlar), mini maç sayaçları ve son oyun,
/// koordinat en iyileri, oyun sonu, Solo, kendi analizin ve ders sonu tahta
/// meydan okuması kayıtları.
///
/// Tek alan olarak [OgrenciDurumu.satranc] içinde durur; eski kayıtlarda alan
/// yoksa boş durum okunur. Kartlar ders tekrar kartlarından (`kartlar`)
/// AYRIDIR: böylece Tekrar sekmesinin aralıkları ve sayıları bozulmaz.
/// Okuma asla fırlatmaz; bozuk girdiler sessizce atlanır, listeler sınırlıdır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'durum.dart';

/// Biten (ya da bırakılan) bir mini maç: inceleme için saklanır.
class SatrancMaci {
  const SatrancMaci({
    required this.konumId,
    required this.fen,
    required this.hamleler,
    required this.sonuc,
    required this.gun,
    this.kullaniciBeyaz = true,
  });

  static const String kazandi = 'kazandi';
  static const String yenildi = 'yenildi';
  static const String berabere = 'berabere';
  static const List<String> sonuclar = [kazandi, yenildi, berabere];

  /// En çok saklanan hamle sayısı (yarım hamle, UCI).
  static const int enCokHamle = 300;

  final String konumId;

  /// Başlangıç FEN'i.
  final String fen;

  /// Oynanan hamleler (UCI), beyaz/siyah sırayla.
  final List<String> hamleler;
  final String sonuc;
  final String gun;
  final bool kullaniciBeyaz;

  Map<String, Object?> toJson() => {
    'konumId': konumId,
    'fen': fen,
    'hamleler': hamleler,
    'sonuc': sonuc,
    'gun': gun,
    'kullaniciBeyaz': kullaniciBeyaz,
  };

  static final _uci = RegExp(r'^[a-h][1-8][a-h][1-8][qrbn]?$');

  static SatrancMaci? fromJson(Object? j) {
    if (j is! Map) return null;
    final id = j['konumId'];
    final fen = j['fen'];
    final sonuc = j['sonuc'];
    final gun = j['gun'];
    final ham = j['hamleler'];
    if (id is! String || id.isEmpty || id.length > 60) return null;
    if (fen is! String || fen.isEmpty || fen.length > 120) return null;
    if (sonuc is! String || !sonuclar.contains(sonuc)) return null;
    if (gun is! String || !OgrenciDurumu.gunGecerli(gun)) return null;
    if (ham is! List) return null;
    final hamleler = <String>[];
    for (final e in ham) {
      if (e is! String || !_uci.hasMatch(e)) return null;
      hamleler.add(e);
      if (hamleler.length > enCokHamle) return null;
    }
    return SatrancMaci(
      konumId: id,
      fen: fen,
      hamleler: List.unmodifiable(hamleler),
      sonuc: sonuc,
      gun: gun,
      kullaniciBeyaz: j['kullaniciBeyaz'] is bool
          ? j['kullaniciBeyaz'] as bool
          : true,
    );
  }
}

class SatrancDurumu {
  const SatrancDurumu({
    this.gunlukBulmaca = const {},
    this.cozulenBulmacalar = const {},
    this.tekrarKartlari = const {},
    this.macSayilari = const {},
    this.sonMac,
    this.koordinatEnIyi = const {},
    this.oyunSonuEnIyi = const {},
    this.oyunSonuPratik = const {},
    this.soloCozulen = const {},
    this.analizler = const {},
    this.dersMeydan = const {},
  });

  /// Sınırlar (eski/bozuk JSON'da fazlası atılır).
  static const int gunlukEnCok = 400;
  static const int kartEnCok = 300;
  static const int kumeEnCok = 200;

  /// Tekrar destesi kart anahtarı önekleri: bulmaca ve ustalık (ders).
  static const String bulmacaOnek = 'b:';
  static const String ustalikOnek = 'u:';

  /// Günlük bulmaca: gün 'YYYY-MM-DD' -> ilk denemede doğru mu.
  final Map<String, bool> gunlukBulmaca;

  /// Doğru çözülmüş tema bulmacalarının kimlikleri.
  final Set<String> cozulenBulmacalar;

  /// Satranç tekrar destesi: 'b:' + bulmaca kimliği (yanlış çözülen bulmaca) ve
  /// 'u:' + ders kimliği (ustalık kursu). Aynı yarı ömür kuralıyla ayrı kartlar.
  final Map<String, Kart> tekrarKartlari;

  /// Mini maç sayaçları: 'kazandi', 'yenildi', 'berabere'.
  final Map<String, int> macSayilari;

  /// Son mini maç (oyun sonu incelemesi için); yoksa null.
  final SatrancMaci? sonMac;

  /// Koordinat antrenörü en iyi skorları: 'dokun' ve 'yaz' (30 sn'de doğru).
  final Map<String, int> koordinatEnIyi;

  /// Oyun sonu meydan okuması: konum kimliği -> en az hamle.
  final Map<String, int> oyunSonuEnIyi;

  /// Pratik modunda matla bitirilen oyun sonu konumları.
  final Set<String> oyunSonuPratik;

  /// Çözülen Solo bulmacalar.
  final Set<String> soloCozulen;

  /// Kendi analizin: konum kimliği -> en iyi sonuç bitleri (1: hamle doğru,
  /// 2: gerekçe doğru; 3: ikisi de).
  final Map<String, int> analizler;

  /// Ders sonu tahta meydan okuması: ders kimliği -> en iyi doğru sayısı.
  final Map<String, int> dersMeydan;

  static const List<String> macAnahtarlari = [
    SatrancMaci.kazandi,
    SatrancMaci.yenildi,
    SatrancMaci.berabere,
  ];

  int get oynananMac =>
      macAnahtarlari.fold(0, (t, k) => t + (macSayilari[k] ?? 0));

  SatrancDurumu copyWith({
    Map<String, bool>? gunlukBulmaca,
    Set<String>? cozulenBulmacalar,
    Map<String, Kart>? tekrarKartlari,
    Map<String, int>? macSayilari,
    SatrancMaci? sonMac,
    Map<String, int>? koordinatEnIyi,
    Map<String, int>? oyunSonuEnIyi,
    Set<String>? oyunSonuPratik,
    Set<String>? soloCozulen,
    Map<String, int>? analizler,
    Map<String, int>? dersMeydan,
  }) => SatrancDurumu(
    gunlukBulmaca: gunlukBulmaca ?? this.gunlukBulmaca,
    cozulenBulmacalar: cozulenBulmacalar ?? this.cozulenBulmacalar,
    tekrarKartlari: tekrarKartlari ?? this.tekrarKartlari,
    macSayilari: macSayilari ?? this.macSayilari,
    sonMac: sonMac ?? this.sonMac,
    koordinatEnIyi: koordinatEnIyi ?? this.koordinatEnIyi,
    oyunSonuEnIyi: oyunSonuEnIyi ?? this.oyunSonuEnIyi,
    oyunSonuPratik: oyunSonuPratik ?? this.oyunSonuPratik,
    soloCozulen: soloCozulen ?? this.soloCozulen,
    analizler: analizler ?? this.analizler,
    dersMeydan: dersMeydan ?? this.dersMeydan,
  );

  Map<String, Object?> toJson() => {
    'gunlukBulmaca': gunlukBulmaca,
    'cozulenBulmacalar': cozulenBulmacalar.toList()..sort(),
    'tekrarKartlari': {
      for (final e in tekrarKartlari.entries) e.key: e.value.toJson(),
    },
    'macSayilari': macSayilari,
    'sonMac': sonMac?.toJson(),
    'koordinatEnIyi': koordinatEnIyi,
    'oyunSonuEnIyi': oyunSonuEnIyi,
    'oyunSonuPratik': oyunSonuPratik.toList()..sort(),
    'soloCozulen': soloCozulen.toList()..sort(),
    'analizler': analizler,
    'dersMeydan': dersMeydan,
  };

  /// Kimlik biçimi: harf, rakam, '-', '_', ':' ve '.'; en çok 60 karakter.
  static final _kimlik = RegExp(r'^[A-Za-z0-9_.:\-]{1,60}$');

  static bool kimlikGecerli(String s) => _kimlik.hasMatch(s);

  static Set<String> _kume(Object? v) {
    final s = <String>{};
    if (v is List) {
      for (final e in v) {
        if (s.length >= kumeEnCok) break;
        if (e is String && kimlikGecerli(e)) s.add(e);
      }
    }
    return Set.unmodifiable(s);
  }

  static Map<String, int> _sayac(
    Object? v, {
    int enCok = 1000000,
    bool Function(String)? anahtarUygun,
  }) {
    final m = <String, int>{};
    if (v is Map) {
      for (final e in v.entries) {
        if (m.length >= kumeEnCok) break;
        final k = e.key;
        final d = e.value;
        if (k is String &&
            kimlikGecerli(k) &&
            (anahtarUygun?.call(k) ?? true) &&
            d is int &&
            d >= 0 &&
            d <= enCok) {
          m[k] = d;
        }
      }
    }
    return Map.unmodifiable(m);
  }

  /// Bozuk ya da eksik alanları sessizce varsayılana çeker; asla fırlatmaz.
  static SatrancDurumu fromJson(Object? j) {
    if (j is! Map) return const SatrancDurumu();
    final gunluk = <String, bool>{};
    final hamGunluk = j['gunlukBulmaca'];
    if (hamGunluk is Map) {
      // En yeni günler korunur: gün metni sıralanabilir.
      final anahtarlar = [
        for (final k in hamGunluk.keys)
          if (k is String &&
              OgrenciDurumu.gunGecerli(k) &&
              hamGunluk[k] is bool)
            k,
      ]..sort();
      final kes = anahtarlar.length > gunlukEnCok
          ? anahtarlar.sublist(anahtarlar.length - gunlukEnCok)
          : anahtarlar;
      for (final k in kes) {
        gunluk[k] = hamGunluk[k] as bool;
      }
    }
    final kartlar = <String, Kart>{};
    final hamKart = j['tekrarKartlari'];
    if (hamKart is Map) {
      for (final e in hamKart.entries) {
        if (kartlar.length >= kartEnCok) break;
        final k = e.key;
        if (k is! String ||
            !kimlikGecerli(k) ||
            !(k.startsWith(bulmacaOnek) || k.startsWith(ustalikOnek))) {
          continue;
        }
        final kart = Kart.fromJson(e.value);
        if (kart != null) kartlar[k] = kart;
      }
    }
    final mac = <String, int>{};
    final hamMac = j['macSayilari'];
    if (hamMac is Map) {
      for (final k in macAnahtarlari) {
        final d = hamMac[k];
        if (d is int && d >= 0 && d <= 1000000) mac[k] = d;
      }
    }
    return SatrancDurumu(
      gunlukBulmaca: Map.unmodifiable(gunluk),
      cozulenBulmacalar: _kume(j['cozulenBulmacalar']),
      tekrarKartlari: Map.unmodifiable(kartlar),
      macSayilari: Map.unmodifiable(mac),
      sonMac: SatrancMaci.fromJson(j['sonMac']),
      koordinatEnIyi: _sayac(
        j['koordinatEnIyi'],
        enCok: 1000,
        anahtarUygun: (k) => k == 'dokun' || k == 'yaz',
      ),
      oyunSonuEnIyi: _sayac(j['oyunSonuEnIyi'], enCok: 1000),
      oyunSonuPratik: _kume(j['oyunSonuPratik']),
      soloCozulen: _kume(j['soloCozulen']),
      analizler: _sayac(j['analizler'], enCok: 3),
      dersMeydan: _sayac(j['dersMeydan'], enCok: 10),
    );
  }
}
