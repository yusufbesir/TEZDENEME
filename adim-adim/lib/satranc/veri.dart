/// Satranç modülünün gömülü içeriği: tema bulmacaları, oyun sonu konumları,
/// Solo bulmacaları, kendi analizin konumları ve mini maç başlangıç
/// konumları. Çevrimdışıdır; ağ ya da dış veri yok.
///
/// DOĞRULAMA: her FEN, ana hat ve iddia (mat, kazanılan taş, çözüm sayısı,
/// en az hamle) `test/satranc_modulu_test.dart` içinde kural motorunda ve
/// arama ile denetlenir; konumları kendim kurup motorla doğruladım, hazır
/// bir bulmaca veri tabanından alınmadılar.
///
/// Ana hat (UCI): çift indeksler oynayanın, tek indeksler rakibin hamlesidir
/// (Hamle alıştırmasıyla aynı sözleşme). Tema adları Türkçe satranç terimleri.
library;

import 'satranc.dart';

/// Bulmaca temaları (sıralı).
class BulmacaTemasi {
  const BulmacaTemasi(this.id, this.ad, this.aciklama);
  final String id;
  final String ad;
  final String aciklama;
}

/// Tek bir bulmaca. [matSayisi] > 0 ise "N hamlede mat" bulmacasıdır: oyuncunun
/// her hamlesi, kalan hamle sayısında zorla mat veren herhangi bir hamle
/// olabilir (birden çok doğru yol kabul edilir). 0 ise ilk hamle [hamleler]
/// [0] olmalıdır; son hamle için en az o kadar değerli bir taş alma da kabul
/// edilir.
class SatrancBulmaca {
  const SatrancBulmaca({
    required this.id,
    required this.tema,
    required this.fen,
    required this.hamleler,
    required this.aciklama,
    required this.ipucu,
    this.matSayisi = 0,
  });

  /// 'catal-1' biçimi: tema kimliği + sıra.
  final String id;
  final String tema;
  final String fen;
  final List<String> hamleler;
  final String aciklama;
  final String ipucu;
  final int matSayisi;

  /// Oyuncunun oynaması gereken hamle sayısı (ana hat).
  int get oyuncuHamleSayisi => (hamleler.length + 1) ~/ 2;

  /// Oyuncunun tarafı beyaz mı (FEN'de sıra).
  bool get beyazOynar => fen.split(' ')[1] == 'w';
}

/// Oyun sonu antrenörü konumu: oyuncu tarafı mat etmeye çalışır; [enAz],
/// rakibin en iyi savunmasına karşı zorla mat için gereken en az hamledir.
class OyunSonuKonumu {
  const OyunSonuKonumu({
    required this.id,
    required this.grup,
    required this.ad,
    required this.fen,
    required this.enAz,
  });
  final String id;
  final String grup;
  final String ad;
  final String fen;
  final int enAz;
}

/// Solo bulmaca: yalnız beyaz oynar, her hamle bir taş alır (şah alınmaz,
/// siyah taşlar hareket etmez); tüm siyah taşlar (şah hariç) alınınca biter.
/// [cozum] tek geçerli diziyi (UCI) verir.
class SoloBulmaca {
  const SoloBulmaca({
    required this.id,
    required this.fen,
    required this.cozum,
    required this.ipucu,
  });
  final String id;
  final String fen;
  final List<String> cozum;
  final String ipucu;
}

/// "Kendi analizin, sonra çözüm" konumu: oyuncu en iyi hamleyi ve gerekçesini
/// seçer, sonra yazılı çözümle karşılaştırır.
class AnalizKonumu {
  const AnalizKonumu({
    required this.id,
    required this.fen,
    required this.enIyi,
    required this.gerekceler,
    required this.dogruGerekce,
    required this.cozum,
  });
  final String id;
  final String fen;

  /// En iyi hamle (UCI).
  final String enIyi;
  final List<String> gerekceler;
  final int dogruGerekce;

  /// Yazılı çözüm metni (gerekçenin açıklaması).
  final String cozum;
}

/// Mini maç başlangıç konumu: oyuncu [kullaniciBeyaz] tarafıyla oynar.
class MiniMacKonumu {
  const MiniMacKonumu({
    required this.id,
    required this.ad,
    required this.aciklama,
    required this.fen,
    this.kullaniciBeyaz = true,
  });
  final String id;
  final String ad;
  final String aciklama;
  final String fen;
  final bool kullaniciBeyaz;
}

abstract final class SatrancVeri {
  static const List<BulmacaTemasi> temalar = [
    BulmacaTemasi(
      'catal',
      'Çatal',
      'Tek taşla iki hedefe birden saldır; biri kurtulunca öbürünü al.',
    ),
    BulmacaTemasi('sis', 'Şiş', 'Değerli taşı çek, arkasındaki taşı kazan.'),
    BulmacaTemasi(
      'acmaz',
      'Açmaz (bağ)',
      'Hareket edemeyen taşa saldır; kaçamayacağı için kazanılır.',
    ),
    BulmacaTemasi(
      'kesif',
      'Keşif saldırısı',
      'Bir taş çekilerek arkasındaki taşın saldırısını aç.',
    ),
    BulmacaTemasi(
      'mat1',
      'Tek hamlede mat',
      'Şahı kaçamayacağı biçimde şah altına al.',
    ),
    BulmacaTemasi(
      'mat2',
      '2 hamlede mat',
      'Rakip ne oynarsa oynasın ikinci hamlede mat et.',
    ),
  ];

  static BulmacaTemasi? temaBul(String id) {
    for (final t in temalar) {
      if (t.id == id) return t;
    }
    return null;
  }

  static const List<SatrancBulmaca> bulmacalar = [
    // --- Çatal ---------------------------------------------------------
    SatrancBulmaca(
      id: 'catal-1',
      tema: 'catal',
      fen: 'r3k3/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1',
      hamleler: ['d5c7', 'e8d7', 'c7a8'],
      aciklama:
          'Ac7+ şaha şah çeker ve a8\'deki kaleye aynı anda saldırır (at '
          'çatalı). Şah kaçınca Axa8 ile kale kazanılır.',
      ipucu: 'Atın hem şaha hem kaleye birden saldıracağı kareyi ara.',
    ),
    SatrancBulmaca(
      id: 'catal-2',
      tema: 'catal',
      fen: '6k1/ppp5/4n1r1/8/5P2/8/6PP/6K1 w - - 0 1',
      hamleler: ['f4f5', 'g6f6', 'f5e6'],
      aciklama:
          'f5 piyonu e6\'daki ata ve g6\'daki kaleye aynı anda saldırır '
          '(piyon çatalı). Kale kaçınca fxe6 ile at kazanılır.',
      ipucu: 'Bir piyon iki taşa birden saldırabilir.',
    ),
    SatrancBulmaca(
      id: 'catal-3',
      tema: 'catal',
      fen: '4k3/ppp3pp/8/2b5/8/8/5PPP/3Q2K1 w - - 0 1',
      hamleler: ['d1h5', 'e8d7', 'h5c5'],
      aciklama:
          'Vh5+ şah çeker ve beşinci sıradaki c5 filine saldırır (vezir '
          'çatalı). Şah kaçınca Vxc5 ile fil kazanılır.',
      ipucu: 'Şah çeken ve beşinci sıradaki taşa da bakan bir vezir hamlesi.',
    ),
    SatrancBulmaca(
      id: 'catal-4',
      tema: 'catal',
      fen: '2q3k1/5ppp/2N5/8/8/8/5PPP/6K1 w - - 0 1',
      hamleler: ['c6e7', 'g8f8', 'e7c8'],
      aciklama:
          'Ae7+ şaha şah çeker ve c8\'deki vezire saldırır (at çatalı). '
          'Şah kaçınca Axc8 ile vezir kazanılır.',
      ipucu: 'At e7\'ye gidince hangi iki taşa birden bakar?',
    ),
    // --- Şiş -----------------------------------------------------------
    SatrancBulmaca(
      id: 'sis-1',
      tema: 'sis',
      fen: '4k2r/8/8/8/8/8/5PPP/2R3K1 w - - 0 1',
      hamleler: ['c1c8', 'e8d7', 'c8h8'],
      aciklama:
          'Kc8+ şahı sıradan çıkmaya zorlar; arkasındaki h8 kalesi açıkta '
          'kalır (şiş). Şah çekilince Kxh8 ile kale kazanılır.',
      ipucu: 'Şahı ve arkasındaki taşı aynı sırada yakala.',
    ),
    SatrancBulmaca(
      id: 'sis-2',
      tema: 'sis',
      fen: '2q5/8/4k3/8/8/8/4B3/6K1 w - - 0 1',
      hamleler: ['e2g4', 'e6d6', 'g4c8'],
      aciklama:
          'Fg4+ şahı çaprazdan çeker; şah çekilince arkasındaki c8 veziri '
          'açıkta kalır (şiş). Fxc8 ile vezir kazanılır.',
      ipucu: 'Şahla vezir aynı çaprazda: filin şah çekeceği kareyi bul.',
    ),
    SatrancBulmaca(
      id: 'sis-3',
      tema: 'sis',
      fen: '8/1r2k3/8/8/8/7Q/8/6K1 w - - 0 1',
      hamleler: ['h3h7', 'e7d6', 'h7b7'],
      aciklama:
          'Vh7+ şahı yedinci sıradan çeker; arkasındaki b7 kalesi açıkta '
          'kalır (şiş). Vxb7 ile kale kazanılır.',
      ipucu: 'Vezirin yedinci sıraya şah çekerek girmesi.',
    ),
    SatrancBulmaca(
      id: 'sis-4',
      tema: 'sis',
      fen: '7R/8/8/8/3k4/8/8/3b2K1 w - - 0 1',
      hamleler: ['h8d8', 'd4e4', 'd8d1'],
      aciklama:
          'Kd8+ şahı d hattından çeker; arkasındaki d1 fili açıkta kalır '
          '(şiş). Kxd1 ile fil kazanılır.',
      ipucu: 'Kale şahı ve arkasındaki taşı aynı hatta yakalar.',
    ),
    // --- Açmaz ---------------------------------------------------------
    SatrancBulmaca(
      id: 'acmaz-1',
      tema: 'acmaz',
      fen: '4k3/pp1p4/4n3/8/3P4/8/8/4R1K1 w - - 0 1',
      hamleler: ['d4d5', 'e8e7', 'd5e6'],
      aciklama:
          'e6\'daki at, şaha karşı e hattında bağlıdır (açmaz) ve hareket '
          'edemez. d5 piyonu ona saldırır; kaçamayacağı için dxe6 ile '
          'kazanılır.',
      ipucu: 'Hareket edemeyen taşa piyonla saldır.',
    ),
    SatrancBulmaca(
      id: 'acmaz-2',
      tema: 'acmaz',
      fen: '4k3/1p6/2n5/1B6/3P4/8/8/6K1 w - - 0 1',
      hamleler: ['d4d5', 'e8d7', 'd5c6'],
      aciklama:
          'c6\'daki at, b5 fili yüzünden şaha karşı çaprazda bağlıdır. d5 '
          'piyonu ona saldırır; at kaçamaz, dxc6+ ile kazanılır.',
      ipucu: 'At şaha karşı bağlı; ona bir piyonla saldır.',
    ),
    SatrancBulmaca(
      id: 'acmaz-3',
      tema: 'acmaz',
      fen: '4k3/pp1p4/4b3/8/3P4/8/8/4R1K1 w - - 0 1',
      hamleler: ['d4d5', 'e8e7', 'd5e6'],
      aciklama:
          'e6\'daki fil e hattında şaha karşı bağlıdır ve oynayamaz. d5 '
          'piyonu ona saldırır; dxe6 ile fil kazanılır.',
      ipucu: 'Fil kıpırdayamıyor: bir piyonla saldır.',
    ),
    // --- Keşif ---------------------------------------------------------
    SatrancBulmaca(
      id: 'kesif-1',
      tema: 'kesif',
      fen: '3q2k1/5p1p/8/3B4/8/8/8/3R2K1 w - - 0 1',
      hamleler: ['d5f7', 'g8f7', 'd1d8'],
      aciklama:
          'Ff7+ şah çeker; fil d hattından çekildiği için d1 kalesi d8\'deki '
          'vezire açılır (keşif saldırısı). Şah fili alsa da Kxd8 ile vezir '
          'kazanılır.',
      ipucu: 'Fil çekilince arkasındaki kale ne görür?',
    ),
    SatrancBulmaca(
      id: 'kesif-2',
      tema: 'kesif',
      fen: '3q2k1/4p2p/8/3N4/8/8/8/3R2K1 w - - 0 1',
      hamleler: ['d5f6', 'g8f7', 'd1d8'],
      aciklama:
          'Af6+ şah çeker; at d hattından ayrıldığı için kale d8\'deki '
          'vezire açılır (keşif saldırısı). Axe7+ da şah çeker ama vezir '
          'atı alır; f6 daha güçlüdür.',
      ipucu:
          'Atı öyle oyna ki hem şah çeksin hem kale vezire bakmaya başlasın.',
    ),
    SatrancBulmaca(
      id: 'kesif-3',
      tema: 'kesif',
      fen: '3qkr2/3p1p2/8/8/4N3/8/8/4R1K1 w - - 0 1',
      hamleler: ['e4d6'],
      matSayisi: 1,
      aciklama:
          'Ad6 çifte şah verir: at ve e1\'deki kale aynı anda şah çeker. '
          'Çifte şahta yalnız şah oynar; kaçış karesi olmadığı için mat. '
          '(Af6 da aynı çifte şah matıdır.)',
      ipucu: 'Atı hem kendisi şah çekecek hem kale hattını açacak yere oyna.',
    ),
    // --- Tek hamlede mat -----------------------------------------------
    SatrancBulmaca(
      id: 'mat1-1',
      tema: 'mat1',
      fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
      hamleler: ['d1d8'],
      matSayisi: 1,
      aciklama:
          'Kd8#: şahın önündeki kendi piyonları kaçış karelerini kapatır '
          '(arka sıra matı).',
      ipucu: 'Şahın kendi piyonları yolunu kapatmış.',
    ),
    SatrancBulmaca(
      id: 'mat1-2',
      tema: 'mat1',
      fen:
          'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
      hamleler: ['h5f7'],
      matSayisi: 1,
      aciklama:
          'Vxf7#: f7 piyonu Fc4 ile korunur, şah veziri alamaz ve kaçacak '
          'karesi yoktur.',
      ipucu: 'f7 kareyi kim koruyor, kim saldırıyor?',
    ),
    SatrancBulmaca(
      id: 'mat1-3',
      tema: 'mat1',
      fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
      hamleler: ['g5f7'],
      matSayisi: 1,
      aciklama:
          'Af7# (boğulma matı): şahın bütün kaçış kareleri kendi taşlarıyla '
          'dolu, at şah çeker.',
      ipucu: 'Şah kendi taşlarıyla çevrili; at şah çekebilir mi?',
    ),
    SatrancBulmaca(
      id: 'mat1-4',
      tema: 'mat1',
      fen: '7k/8/6K1/8/8/8/8/1Q6 w - - 0 1',
      hamleler: ['b1b8'],
      matSayisi: 1,
      aciklama:
          'Vb8#: vezir son sırada şah çeker, beyaz şah g7 ve h7\'yi, vezir '
          'g8\'i kapatır.',
      ipucu: 'Vezir son sıraya inebilir mi?',
    ),
    // --- 2 hamlede mat -------------------------------------------------
    SatrancBulmaca(
      id: 'mat2-1',
      tema: 'mat2',
      fen: '3r2k1/5ppp/8/8/8/8/4RPPP/4R1K1 w - - 0 1',
      hamleler: ['e2e8', 'd8e8', 'e1e8'],
      matSayisi: 2,
      aciklama:
          'Ke8+! Kxe8 zorunludur (şah kaçamaz); ardından arkadaki kale Kxe8# '
          'ile arka sıra matını verir.',
      ipucu: 'Kaleni feda et: rakip almak zorunda.',
    ),
    SatrancBulmaca(
      id: 'mat2-2',
      tema: 'mat2',
      fen: '7k/8/8/8/8/8/1R6/R5K1 w - - 0 1',
      hamleler: ['a1a7', 'h8g8', 'b2b8'],
      matSayisi: 2,
      aciklama:
          'Basamak matı: Ka7 yedinci sırayı kapatır, şah son sırada kalır '
          've ikinci kale (Kb8#) mat eder. (Kb7 ve Ka8# de çalışır.)',
      ipucu: 'İki kaleyle şahı sıra sıra köşeye it.',
    ),
    SatrancBulmaca(
      id: 'mat2-3',
      tema: 'mat2',
      fen: '6k1/8/5K2/8/8/3Q4/8/8 w - - 0 1',
      hamleler: ['d3g6', 'g8h8', 'g6g7'],
      matSayisi: 2,
      aciklama:
          'Vg6 şahı iki kareye sıkıştırır; şah h8 ya da f8\'e gitse de ikinci '
          'hamlede Vg7# (ya da Vf7#) mat eder.',
      ipucu:
          'Vezirle şahın kaçış karelerini kes, sonra şahının desteğiyle mat et.',
    ),
  ];

  /// Temaya göre bulmacalar.
  static List<SatrancBulmaca> temaBulmacalari(String tema) => [
    for (final b in bulmacalar)
      if (b.tema == tema) b,
  ];

  static SatrancBulmaca? bulmacaBul(String id) {
    for (final b in bulmacalar) {
      if (b.id == id) return b;
    }
    return null;
  }

  // --- Oyun sonu antrenörü -------------------------------------------
  static const List<OyunSonuKonumu> oyunSonlari = [
    OyunSonuKonumu(
      id: 'vezir-1',
      grup: 'Vezir ve şah',
      ad: 'Vezirle mat 1',
      fen: '8/8/8/8/2K5/7Q/2k5/8 w - - 0 1',
      enAz: 3,
    ),
    OyunSonuKonumu(
      id: 'vezir-2',
      grup: 'Vezir ve şah',
      ad: 'Vezirle mat 2',
      fen: '8/8/2Q5/8/2K5/8/1k6/8 w - - 0 1',
      enAz: 3,
    ),
    OyunSonuKonumu(
      id: 'vezir-3',
      grup: 'Vezir ve şah',
      ad: 'Vezirle mat 3',
      fen: '4k3/1Q6/2K5/8/8/8/8/8 w - - 0 1',
      enAz: 2,
    ),
    OyunSonuKonumu(
      id: 'vezir-4',
      grup: 'Vezir ve şah',
      ad: 'Vezirle mat 4',
      fen: '8/4Q3/k2K4/8/8/8/8/8 w - - 0 1',
      enAz: 2,
    ),
    OyunSonuKonumu(
      id: 'kale-1',
      grup: 'Kale ve şah',
      ad: 'Kaleyle mat 1',
      fen: '5k2/8/7K/8/4R3/8/8/8 w - - 0 1',
      enAz: 2,
    ),
    OyunSonuKonumu(
      id: 'kale-2',
      grup: 'Kale ve şah',
      ad: 'Kaleyle mat 2',
      fen: '7k/8/5K2/8/8/8/8/1R6 w - - 0 1',
      enAz: 2,
    ),
    OyunSonuKonumu(
      id: 'kale-3',
      grup: 'Kale ve şah',
      ad: 'Kaleyle mat 3',
      fen: '8/8/4R3/8/5K2/8/7k/8 w - - 0 1',
      enAz: 3,
    ),
    OyunSonuKonumu(
      id: 'kale-4',
      grup: 'Kale ve şah',
      ad: 'Kaleyle mat 4',
      fen: '8/k7/8/1K6/4R3/8/8/8 w - - 0 1',
      enAz: 3,
    ),
    OyunSonuKonumu(
      id: 'ikikale-1',
      grup: 'İki kale',
      ad: 'Basamak matı 1',
      fen: '8/5R2/6R1/8/8/8/7K/1k6 w - - 0 1',
      enAz: 2,
    ),
    OyunSonuKonumu(
      id: 'ikikale-2',
      grup: 'İki kale',
      ad: 'Basamak matı 2',
      fen: '3R4/8/3R4/8/8/7k/4K3/8 w - - 0 1',
      enAz: 2,
    ),
    OyunSonuKonumu(
      id: 'ikikale-3',
      grup: 'İki kale',
      ad: 'Basamak matı 3',
      fen: '8/8/R7/8/3R1K2/8/8/5k2 w - - 0 1',
      enAz: 3,
    ),
  ];

  /// Oyun sonu grupları (sıralı, tekrarsız).
  static List<String> get oyunSonuGruplari => [
    for (final g in {for (final k in oyunSonlari) k.grup}) g,
  ];

  static OyunSonuKonumu? oyunSonuBul(String id) {
    for (final k in oyunSonlari) {
      if (k.id == id) return k;
    }
    return null;
  }

  // --- Solo bulmacalar -----------------------------------------------
  static const List<SoloBulmaca> soloBulmacalar = [
    SoloBulmaca(
      id: 'solo-1',
      fen: '7k/8/2N5/8/1bb5/3pp3/1n6/K7 w - - 0 1',
      cozum: ['c6b4', 'b4d3', 'd3b2', 'b2c4', 'c4e3'],
      ipucu: 'Önce b4\'teki file git; her hamlede bir taş alınır.',
    ),
    SoloBulmaca(
      id: 'solo-2',
      fen: '7k/8/8/8/1p1n4/r4N2/1pb5/K7 w - - 0 1',
      cozum: ['a1b2', 'f3d4', 'd4c2', 'c2b4', 'b2a3'],
      ipucu: 'Şah da taş alabilir; hangi taş önce gitmeli?',
    ),
    SoloBulmaca(
      id: 'solo-3',
      fen: '7k/5p2/6B1/7n/b7/1p6/8/Kr6 w - - 0 1',
      cozum: ['a1b1', 'g6h5', 'h5f7', 'f7b3', 'b3a4'],
      ipucu: 'Şahın alabileceği bir taş var; oradan başla.',
    ),
    SoloBulmaca(
      id: 'solo-4',
      fen: '7k/p2r4/8/8/3R4/3p4/n3p3/K7 w - - 0 1',
      cozum: ['d4d3', 'd3d7', 'd7a7', 'a7a2', 'a2e2'],
      ipucu: 'Kale önce d3\'teki piyonu almalı.',
    ),
    SoloBulmaca(
      id: 'solo-5',
      fen: '7k/2b5/8/n3r3/8/p4n2/1Q6/K7 w - - 0 1',
      cozum: ['b2e5', 'e5c7', 'c7a5', 'a5a3', 'a3f3'],
      ipucu: 'Vezirin her hamlesi sonrakini hazırlamalı; kaleyle başla.',
    ),
    SoloBulmaca(
      id: 'solo-6',
      fen: '7k/7p/5p2/8/1nQ4p/2p5/8/K7 w - - 0 1',
      cozum: ['c4b4', 'b4c3', 'c3f6', 'f6h4', 'h4h7'],
      ipucu: 'Vezirle önce b4\'teki atı al.',
    ),
  ];

  static SoloBulmaca? soloBul(String id) {
    for (final s in soloBulmacalar) {
      if (s.id == id) return s;
    }
    return null;
  }

  // --- Kendi analizin ------------------------------------------------
  static const List<AnalizKonumu> analizler = [
    AnalizKonumu(
      id: 'analiz-1',
      fen: 'r3k3/pp3ppp/8/3N4/8/8/PPP2PPP/4K3 w - - 0 1',
      enIyi: 'd5c7',
      gerekceler: [
        'Merkezdeki atı geri çekip güvenceye alıyor.',
        'Piyon yapısını bozmadan vezir kanadını açıyor.',
        'Şah çekerken aynı anda a8 kalesine saldırıyor (at çatalı).',
        'Kaleyi hemen takas etmeye zorluyor.',
      ],
      dogruGerekce: 2,
      cozum:
          'En iyi hamle Ac7+. At c7\'den hem e8\'deki şaha hem a8\'deki kaleye '
          'saldırır; şah kaçınca Axa8 ile kale kazanılır. Çatal arayışında '
          'önce "şah çeken at hamlesi var mı?" diye sor.',
    ),
    AnalizKonumu(
      id: 'analiz-2',
      fen: '2k5/pp1b4/2n5/8/1P6/8/8/2R3K1 w - - 0 1',
      enIyi: 'b4b5',
      gerekceler: [
        'Piyon, şahın önünü açar.',
        'Piyon, c hattında bağlı olan ata saldırıp onu kazandırır.',
        'Kaleyi c7\'ye getirmeye hazırlanır.',
        'Rakibin filini hemen alır.',
      ],
      dogruGerekce: 1,
      cozum:
          'En iyi hamle b5. c6\'daki at kaleye karşı şahla aynı hatta bağlı, '
          'yani kıpırdayamaz. b5 piyonu ona saldırır; bxc6 Fxc6 ile bir '
          'piyon karşılığında at kazanılır. Önce bağlı taşları ara.',
    ),
    AnalizKonumu(
      id: 'analiz-3',
      fen: '2r5/8/4k3/8/8/8/6B1/6K1 w - - 0 1',
      enIyi: 'g2h3',
      gerekceler: [
        'Fil, şahın karesini kapatıp mat hazırlar.',
        'Fil, kaleye saldırıp onu c8\'den çıkarır.',
        'Fil, merkeze gelip piyon desteği alır.',
        'Fil, şaha şah çekerek şahı yerinden oynatır; arkasındaki kale açıkta kalır (şiş).',
      ],
      dogruGerekce: 3,
      cozum:
          'En iyi hamle Fh3+. Şah ve c8 kalesi aynı çaprazda; şah çekilince '
          'Fxc8 ile kale kazanılır (şiş). Şiş, değerli taşa saldırıp arkasındaki '
          'taşı almaktır.',
    ),
    AnalizKonumu(
      id: 'analiz-4',
      fen: '6k1/5ppp/8/8/8/2Q5/6PP/6K1 w - - 0 1',
      enIyi: 'c3c8',
      gerekceler: [
        'Vezir son sıraya iner; şahın önü kendi piyonlarıyla kapalı olduğu için mat olur.',
        'Vezir, piyonları alıp materyal kazanır.',
        'Vezir şahı kovalayıp pat riskini artırır.',
        'Vezir, kaleyle takasa zorlar.',
      ],
      dogruGerekce: 0,
      cozum:
          'En iyi hamle Vc8#. Siyah şah g8\'de, f7-g7-h7 piyonları kaçış '
          'karelerini kapatıyor (arka sıra matı). Önce şah çeken ve mat eden '
          'hamlelere bak.',
    ),
    AnalizKonumu(
      id: 'analiz-5',
      fen: '5r1k/6pp/4Q3/3B2N1/8/8/8/6K1 w - - 0 1',
      enIyi: 'e6g8',
      gerekceler: [
        'Vezir, f8 kalesini alıp materyal kazanır.',
        'Vezir, şaha şah çekip piyonları toplar.',
        'Vezir feda edilir: Kxg8 zorunludur, ardından Af7# boğulma matı gelir.',
        'Vezir geri çekilip savunmayı güçlendirir.',
      ],
      dogruGerekce: 2,
      cozum:
          'En iyi hamle Vg8+!. Fil d5 g8\'i korur; Kxg8 dışında hamle yok '
          '(şah veziri alamaz). Ardından Af7# boğulma matıdır. Mat varsa '
          'önce şah çeken fedaları hesapla.',
    ),
  ];

  static AnalizKonumu? analizBul(String id) {
    for (final a in analizler) {
      if (a.id == id) return a;
    }
    return null;
  }

  // --- Mini maç ------------------------------------------------------
  static const List<MiniMacKonumu> miniMaclar = [
    MiniMacKonumu(
      id: 'italyan',
      ad: 'İtalyan Oyunu (beyaz)',
      aciklama: '1.e4 e5 2.At f3 At c6 3.Fc4 sonrası; sıra siyahta.',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
      kullaniciBeyaz: false,
    ),
    MiniMacKonumu(
      id: 'ispanyol',
      ad: 'İspanyol Oyunu (beyaz)',
      aciklama: 'Madde eşit, kapalı İspanyol yapısı; sıra beyazda.',
      fen: 'r1bqk2r/1pppbppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 4 6',
    ),
    MiniMacKonumu(
      id: 'vezir-avantaji',
      ad: 'Vezir avantajı',
      aciklama: 'Beyazın fazladan veziri var; kısa sürede matı bul.',
      fen: '4k3/pppp1ppp/8/8/8/8/PPPP1PPP/3QK3 w - - 0 1',
    ),
    MiniMacKonumu(
      id: 'kale-sonu',
      ad: 'Kale sonu (eşit)',
      aciklama: 'Her tarafta kale ve üç piyon; dikkatli oyna.',
      fen: '8/5pk1/6p1/7p/7P/6P1/5PK1/r6R w - - 0 1',
    ),
    MiniMacKonumu(
      id: 'baslangic',
      ad: 'Baştan oyun (beyaz)',
      aciklama: 'Standart başlangıç konumu.',
      fen: Konum.baslangicFen,
    ),
  ];

  static MiniMacKonumu? miniMacBul(String id) {
    for (final m in miniMaclar) {
      if (m.id == id) return m;
    }
    return null;
  }
}
