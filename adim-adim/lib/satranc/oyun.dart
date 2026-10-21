/// Satranç modülünün saf oyun mantığı (arayüzden bağımsız): bulmaca kuralı,
/// bilgisayara karşı oyun ([MacDurumu]; mini maç ve oyun sonu antrenörü),
/// oyun sonu incelemesi, Solo ve koordinat dizisi. Hepsi çevrimdışıdır.
library;

import 'dart:math' as math;

import 'satranc.dart';
import 'veri.dart';
import 'yz.dart';

// ---------------------------------------------------------------------------
// Bulmaca kuralı
// ---------------------------------------------------------------------------

/// Bulmaca hamle denetimi ve rakip cevabı. Oyuncunun `adim`ı, kendi hamle
/// sırasıdır (0'dan başlar); rakip cevabı oyuncu hamlesinden sonra gelir.
abstract final class BulmacaKurali {
  /// Oyuncunun [h] hamlesi, bulmacanın [adim]. oyuncu hamlesi olarak doğru mu?
  /// [k] hamle öncesi konumdur.
  static bool dogruMu(SatrancBulmaca b, Konum k, SatrancHamlesi h, int adim) {
    if (b.matSayisi > 0) {
      final kalan = b.matSayisi - adim;
      return kalan > 0 && k.hamleZorlarMat(h, kalan);
    }
    final i = 2 * adim;
    if (i >= b.hamleler.length) return false;
    if (h.uci == b.hamleler[i]) return true;
    // Son hamlede en az o kadar değerli bir taş almak da kabul edilir.
    final son = adim == b.oyuncuHamleSayisi - 1;
    if (!son) return false;
    final beklenen = k.uciBul(b.hamleler[i]);
    if (beklenen?.alinan == null || h.alinan == null) return false;
    return SatrancYZ.deger(h.alinan!) >= SatrancYZ.deger(beklenen!.alinan!);
  }

  /// Doğru hamleden sonra bulmaca bitti mi? [sonra] hamle sonrası konumdur.
  static bool bitti(SatrancBulmaca b, Konum sonra, int adim) {
    if (b.matSayisi > 0 && sonra.mat) return true;
    return adim >= b.oyuncuHamleSayisi - 1;
  }

  /// Oyuncunun doğru hamlesinden sonra rakibin cevabı; yoksa null.
  /// [oynanan] ana hat hamlesiyse kayıtlı cevap, değilse (mat bulmacalarında
  /// başka bir mat yolu) UCI sırasında ilk yasal cevap oynanır.
  static SatrancHamlesi? rakipCevabi(
    SatrancBulmaca b,
    Konum sonra,
    int adim,
    SatrancHamlesi oynanan,
  ) {
    final i = 2 * adim;
    if (i + 1 < b.hamleler.length && oynanan.uci == b.hamleler[i]) {
      final h = sonra.uciBul(b.hamleler[i + 1]);
      if (h != null) return h;
    }
    final yasal = [...sonra.yasalHamleler]
      ..sort((a, c) => a.uci.compareTo(c.uci));
    if (yasal.isEmpty) return null;
    if (b.matSayisi > 0) return yasal.first;
    return null;
  }
}

// ---------------------------------------------------------------------------
// Bilgisayara karşı oyun (mini maç, oyun sonu antrenörü)
// ---------------------------------------------------------------------------

/// Oyun sonucu ve nedeni.
typedef MacSonucu = ({String sonuc, String neden});

/// Bilgisayara karşı oyunun değiştirilemez durumu. [oyna] yeni durum döner.
class MacDurumu {
  MacDurumu._(
    this.baslangicFen,
    this.kullaniciBeyaz,
    this.hamleSiniri,
    this.konum,
    this.gecmis,
    this._tekrar,
  );

  /// [fen] konumundan yeni oyun. [kullaniciBeyaz] oyuncunun rengi;
  /// [hamleSiniri] yarım hamle olarak üst sınırdır (aşılırsa berabere).
  factory MacDurumu.baslat(
    String fen, {
    required bool kullaniciBeyaz,
    int hamleSiniri = 160,
  }) {
    final k = Konum.fen(fen);
    return MacDurumu._(fen, kullaniciBeyaz, hamleSiniri, k, const [], {
      _anahtar(k): 1,
    });
  }

  final String baslangicFen;
  final bool kullaniciBeyaz;
  final int hamleSiniri;
  final Konum konum;

  /// Oynanan hamleler (UCI).
  final List<String> gecmis;
  final Map<String, int> _tekrar;

  static const String kazandi = 'kazandi';
  static const String yenildi = 'yenildi';
  static const String berabere = 'berabere';

  /// Konum anahtarı: taşlar + sıra + rok + geçerken (sayaçlar hariç).
  static String _anahtar(Konum k) => k.fen.split(' ').take(4).join(' ');

  bool get kullaniciSirada => konum.beyazSirada == kullaniciBeyaz;

  /// Oyuncunun şimdiye kadar oynadığı hamle sayısı.
  int get kullaniciHamleSayisi {
    final ilkBeyaz = Konum.fen(baslangicFen).beyazSirada;
    final ilkKullanici = ilkBeyaz == kullaniciBeyaz;
    return ilkKullanici ? (gecmis.length + 1) ~/ 2 : gecmis.length ~/ 2;
  }

  /// Yeterli mat materyali yok mu (K-K, K+fil/at - K)?
  static bool materyalYetersiz(Konum k) {
    var hafif = 0;
    for (var i = 0; i < 64; i++) {
      final t = k.tas(i);
      if (t == null) continue;
      final l = t.toLowerCase();
      if (l == 'k') continue;
      if (l == 'n' || l == 'b') {
        hafif++;
        continue;
      }
      return false; // piyon, kale ya da vezir var
    }
    return hafif <= 1;
  }

  /// Oyun bittiyse sonuç (oyuncu açısından) ve neden; sürüyorsa null.
  MacSonucu? get sonuc {
    if (konum.mat) {
      final oyuncuMatOldu = kullaniciSirada;
      return (
        sonuc: oyuncuMatOldu ? yenildi : kazandi,
        neden: oyuncuMatOldu ? 'Mat oldun.' : 'Mat ettin!',
      );
    }
    if (konum.pat) return (sonuc: berabere, neden: 'Pat: hamle yok.');
    if (materyalYetersiz(konum)) {
      return (sonuc: berabere, neden: 'Mat için yeterli taş kalmadı.');
    }
    if ((_tekrar[_anahtar(konum)] ?? 0) >= 3) {
      return (sonuc: berabere, neden: 'Aynı konum üç kez tekrarlandı.');
    }
    if (konum.yariHamle >= 100) {
      return (sonuc: berabere, neden: '50 hamle kuralı.');
    }
    if (gecmis.length >= hamleSiniri) {
      return (sonuc: berabere, neden: 'Hamle sınırına ulaşıldı.');
    }
    return null;
  }

  /// [h] hamlesini oynar (yasal olmalı).
  MacDurumu oyna(SatrancHamlesi h) {
    final yeni = konum.oyna(h);
    final a = _anahtar(yeni);
    final t = {..._tekrar, a: (_tekrar[a] ?? 0) + 1};
    return MacDurumu._(baslangicFen, kullaniciBeyaz, hamleSiniri, yeni, [
      ...gecmis,
      h.uci,
    ], t);
  }

  /// Bilgisayarın hamlesi (sırası bilgisayardaysa ve oyun sürüyorsa);
  /// derinlik 2, küçük bir tolerans içinde kararlı çeşitleme.
  SatrancHamlesi? bilgisayarHamlesi({int tolerans = 12}) {
    if (kullaniciSirada || sonuc != null) return null;
    return SatrancYZ.enIyi(konum, tohum: gecmis.length, tolerans: tolerans);
  }
}

// ---------------------------------------------------------------------------
// Oyun sonu incelemesi
// ---------------------------------------------------------------------------

/// İnceleme listesindeki bir yarım hamle.
class IncelemeAdimi {
  const IncelemeAdimi({
    required this.sira,
    required this.uci,
    required this.san,
    required this.beyaz,
    required this.kullanici,
    required this.fenOnce,
    required this.fenSonra,
    required this.maddi,
  });

  /// 0'dan yarım hamle sırası.
  final int sira;
  final String uci;

  /// Türkçe notasyon (Ş V K F A).
  final String san;
  final bool beyaz;
  final bool kullanici;
  final String fenOnce;
  final String fenSonra;

  /// Hamle sonrası maddi fark, beyaz açısından (santipiyon).
  final int maddi;

  /// "1. e4" ya da "1... e5" gibi numaralı gösterim.
  String get etiket =>
      beyaz ? '${sira ~/ 2 + 1}. $san' : '${sira ~/ 2 + 1}... $san';
}

/// Bir hamlenin basit değerlendirmesi.
class HamleDegerlendirmesi {
  const HamleDegerlendirmesi({
    required this.oneri,
    required this.oneriPuan,
    required this.oynananPuan,
    required this.kayip,
    required this.etiket,
  });

  /// Aramanın önerdiği en iyi hamle (Türkçe SAN); yoksa null.
  final String? oneri;

  /// Hamle yapanın açısından puanlar (santipiyon).
  final int oneriPuan;
  final int oynananPuan;

  /// Öneriye göre kayıp (>= 0, santipiyon).
  final int kayip;

  /// 'İyi hamle', 'Fena değil', 'Yanlış', 'Büyük hata', 'Mat!'.
  final String etiket;
}

abstract final class MacIncelemesi {
  /// Başlangıç FEN'i ve UCI hamlelerinden adım listesi. Bozuk bir hamlede
  /// kalan adımlar atlanır.
  static List<IncelemeAdimi> adimlar(
    String baslangicFen,
    List<String> ucis,
    bool kullaniciBeyaz,
  ) {
    final sonuc = <IncelemeAdimi>[];
    Konum k;
    try {
      k = Konum.fen(baslangicFen);
    } on FormatException {
      return sonuc;
    }
    for (var i = 0; i < ucis.length; i++) {
      final h = k.uciBul(ucis[i]);
      if (h == null) break;
      final san = turkceSan(k.san(h));
      final once = k.fen;
      final beyaz = k.beyazSirada;
      k = k.oyna(h);
      sonuc.add(
        IncelemeAdimi(
          sira: i,
          uci: h.uci,
          san: san,
          beyaz: beyaz,
          kullanici: beyaz == kullaniciBeyaz,
          fenOnce: once,
          fenSonra: k.fen,
          maddi: SatrancYZ.materyal(k),
        ),
      );
    }
    return sonuc;
  }

  /// [once] konumunda [oynanan] hamlesini, derinlik-2 aramayla öneriyle
  /// karşılaştırır. Kayıp eşikleri (santipiyon): <=30 iyi, <=100 fena değil,
  /// <=300 yanlış, daha fazlası büyük hata.
  static HamleDegerlendirmesi degerlendir(Konum once, String oynanan) {
    final puanlar = SatrancYZ.hamlePuanlari(once);
    if (puanlar.isEmpty) {
      return const HamleDegerlendirmesi(
        oneri: null,
        oneriPuan: 0,
        oynananPuan: 0,
        kayip: 0,
        etiket: 'İyi hamle',
      );
    }
    final en = puanlar.first;
    final oy = puanlar.firstWhere(
      (e) => e.hamle.uci == oynanan,
      orElse: () => en,
    );
    final kayip = (en.puan - oy.puan) < 0 ? 0 : en.puan - oy.puan;
    final matYapti = oy.puan >= SatrancYZ.mat - 1000;
    final etiket = matYapti
        ? 'Mat!'
        : kayip <= 30
        ? 'İyi hamle'
        : kayip <= 100
        ? 'Fena değil'
        : kayip <= 300
        ? 'Yanlış'
        : 'Büyük hata';
    return HamleDegerlendirmesi(
      oneri: turkceSan(once.san(en.hamle)),
      oneriPuan: en.puan,
      oynananPuan: oy.puan,
      kayip: kayip,
      etiket: etiket,
    );
  }
}

// ---------------------------------------------------------------------------
// Solo bulmaca
// ---------------------------------------------------------------------------

/// Solo oyunun durumu: yalnız beyaz oynar, her hamle bir (şah dışı) siyah
/// taşı alır; siyah taşlar kıpırdamaz. Sıra her hamlede beyaza döndürülür
/// ([Konum.sirayiDevret]).
class SoloOyunu {
  SoloOyunu._(this.konum, this.gecmis);

  /// [fen] konumundan başlar (sıra beyazda olmalı).
  factory SoloOyunu.baslat(String fen) => SoloOyunu._(Konum.fen(fen), const []);

  final Konum konum;
  final List<String> gecmis;

  static bool _hedefMi(String? t) =>
      t != null && t.toLowerCase() == t && t != 'k';

  /// Tahtada kalan alınacak (şah dışı siyah) taş sayısı.
  int get kalan {
    var n = 0;
    for (var i = 0; i < 64; i++) {
      if (_hedefMi(konum.tas(i))) n++;
    }
    return n;
  }

  /// Şu an oynanabilecek hamleler: yalnız (şah dışı) taş alanlar.
  List<SatrancHamlesi> get hamleler => [
    for (final h in konum.yasalHamleler)
      if (h.alinan != null && _hedefMi(h.alinan)) h,
  ];

  bool get bitti => kalan == 0;

  /// Taş kaldı ama alabilecek hamle yok: çözüm yanlış.
  bool get kilitli => kalan > 0 && hamleler.isEmpty;

  SoloOyunu oyna(SatrancHamlesi h) =>
      SoloOyunu._(konum.oyna(h).sirayiDevret(), [...gecmis, h.uci]);

  /// Çözüm sayısı (en çok [sinir]'a kadar sayılır); veri doğrulaması için.
  static int cozumSayisi(SoloOyunu o, {int sinir = 2}) {
    if (o.bitti) return 1;
    var toplam = 0;
    for (final h in o.hamleler) {
      toplam += cozumSayisi(o.oyna(h), sinir: sinir - toplam);
      if (toplam >= sinir) break;
    }
    return toplam;
  }
}

// ---------------------------------------------------------------------------
// Koordinat (tahta görme) antrenörü
// ---------------------------------------------------------------------------

abstract final class KoordinatAntrenoru {
  /// Süre (saniye).
  static const int sure = 30;

  /// Modlar: 'dokun' (söylenen kareye dokun), 'yaz' (işaretli karenin adını
  /// yaz).
  static const List<String> modlar = ['dokun', 'yaz'];

  /// [tohum]'a bağlı, art arda aynı kareyi vermeyen kare dizisi (0..63).
  static List<int> dizi(int tohum, {int adet = 120}) {
    final r = math.Random(tohum);
    final s = <int>[];
    var onceki = -1;
    for (var i = 0; i < adet; i++) {
      var k = r.nextInt(64);
      while (k == onceki) {
        k = r.nextInt(64);
      }
      s.add(k);
      onceki = k;
    }
    return s;
  }

  /// Yazılan metin hedef karenin adıyla eşleşiyor mu (büyük/küçük harf ve
  /// boşluk önemsiz)?
  static bool yazimDogru(String girdi, int kare) =>
      girdi.trim().toLowerCase() == kareAdi(kare);
}
