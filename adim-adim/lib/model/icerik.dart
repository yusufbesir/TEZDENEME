/// İçerik modeli: kurs > ünite > ders > alıştırma.
///
/// Alıştırma türleri (eski HTML sürümünün şemasıyla uyumlu):
/// secim, bosluk, yaz, sirala, eslestir, dinle (yeni: metin okunur, kullanıcı
/// duyduğunu seçer), soyle (yeni: cümleyi yüksek sesle söyler, telaffuz puanlanır), kod (yeni: kod parçasındaki boşluğu doldurur),
/// tablo (yeni: çekim tablosundaki boş hücreleri doldurur), isaretle (yeni:
/// cümlede doğru kelime(ler)e dokunur), hamle (yeni: oyun tahtasında doğru
/// hamleyi ya da hamle dizisini oynar; ilk sürümde satranç).
///
/// Kodda etkileşimli türler (ÖZELLİK 68, 69): kodbosluk (birden çok boşluğa
/// parça yerleştirir), kodsec (koddaki doğru satır(lar)a dokunur), kodyaz
/// (boşluğa anahtar sözcüğü yazar), kodcikti (kodun çıktısını yazar; Python
/// dahil, çalıştırma yok), kodcalistir (JS kodu cihazdaki motorda çalışır,
/// çıktı beklenenle karşılaştırılır; motor yoksa çözüm kodunun çıktısı
/// tahmin edilir).
library;

import 'kod_calisma.dart';

export 'kod_calisma.dart';

/// Dinle/Soyle alıştırmalarında konuşma ve tanıma dili (BCP-47) varsayılanı.
/// Korece/Japonca/Çince kursları 'ko-KR' / 'ja-JP' / 'zh-CN' verir.
const String varsayilanSesDili = 'en-US';

sealed class Alistirma {
  const Alistirma({
    required this.soru,
    this.aciklama,
    this.ipuclari = const [],
  });

  /// Soru metni. Boşluk türünde `___` yer tutucu bulunur.
  final String soru;

  /// Yanlış cevapta gösterilen kısa açıklama.
  final String? aciklama;

  /// Kademeli ipuçları (isteğe bağlı, sırayla). Boşsa Motor.ipucuUret türe
  /// göre otomatik türetir.
  final List<String> ipuclari;

  String get tur;

  Map<String, Object?> toJson();

  static Alistirma fromJson(Map<String, Object?> j) {
    final tur = j['tur'];
    final soru = j['soru'] as String;
    final aciklama = j['aciklama'] as String?;
    List<String> metinler(String k) =>
        (j[k] as List).map((e) => e as String).toList();
    final hamIpucu = j['ipuclari'];
    final ipuclari = hamIpucu is List
        ? hamIpucu.whereType<String>().toList()
        : const <String>[];
    switch (tur) {
      case 'secim':
        return Secim(
          soru: soru,
          secenekler: metinler('secenekler'),
          dogru: j['dogru'] as int,
          aciklama: aciklama,
          ipuclari: ipuclari,
        );
      case 'bosluk':
        return Bosluk(
          soru: soru,
          secenekler: metinler('secenekler'),
          dogru: j['dogru'] as int,
          aciklama: aciklama,
          ipuclari: ipuclari,
        );
      case 'yaz':
        return Yaz(
          soru: soru,
          cevaplar: metinler('cevaplar'),
          aciklama: aciklama,
          ipuclari: ipuclari,
        );
      case 'sirala':
        return Sirala(
          soru: soru,
          kelimeler: metinler('kelimeler'),
          dogru: metinler('dogru'),
          aciklama: aciklama,
          ipuclari: ipuclari,
        );
      case 'eslestir':
        return Eslestir(
          soru: soru,
          ciftler: (j['ciftler'] as List)
              .map((c) => (sol: (c as List)[0] as String, sag: c[1] as String))
              .toList(),
          aciklama: aciklama,
          ipuclari: ipuclari,
        );
      case 'dinle':
        return Dinle(
          soru: soru,
          okunacak: j['okunacak'] as String,
          secenekler: metinler('secenekler'),
          dogru: j['dogru'] as int,
          dil: j['dil'] as String? ?? varsayilanSesDili,
          aciklama: aciklama,
          ipuclari: ipuclari,
        );
      case 'soyle':
        return Soyle(
          soru: soru,
          metin: j['metin'] as String,
          ceviri: j['ceviri'] as String,
          dil: j['dil'] as String? ?? varsayilanSesDili,
          aciklama: aciklama,
          ipuclari: ipuclari,
        );
      case 'kod':
        return Kod(
          soru: soru,
          kod: j['kod'] as String,
          secenekler: metinler('secenekler'),
          dogru: j['dogru'] as int,
          dil: j['dil'] as String? ?? 'html',
          aciklama: aciklama,
          ipuclari: ipuclari,
        );
      case 'tablo':
        return Tablo(
          soru: soru,
          baslik: metinler('baslik'),
          satirlar: (j['satirlar'] as List)
              .map((r) => (r as List).map((e) => e as String).toList())
              .toList(),
          bos: (j['bos'] as List)
              .map((c) => (satir: (c as List)[0] as int, sutun: c[1] as int))
              .toList(),
          secenekler: j['secenekler'] == null
              ? const []
              : metinler('secenekler'),
          aciklama: aciklama,
          ipuclari: ipuclari,
        );
      case 'isaretle':
        return Isaretle(
          soru: soru,
          cumle: j['cumle'] as String,
          dogru: (j['dogru'] as List).map((e) => e as int).toList(),
          aciklama: aciklama,
          ipuclari: ipuclari,
        );
      case 'hamle':
        final hamHata = j['hataMesajlari'];
        return Hamle(
          soru: soru,
          fen: j['fen'] as String,
          hamleler: metinler('hamleler'),
          matKabul: j['matKabul'] == true,
          hataMesajlari: hamHata is Map
              ? {
                  for (final e in hamHata.entries)
                    if (e.key is String && e.value is String)
                      e.key as String: e.value as String,
                }
              : const {},
          oyun: j['oyun'] as String? ?? Hamle.varsayilanOyun,
          aciklama: aciklama,
          ipuclari: ipuclari,
        );
      case 'kodbosluk':
        return KodBoslukDoldur(
          soru: soru,
          kod: j['kod'] as String,
          dogru: metinler('dogru'),
          secenekler: metinler('secenekler'),
          dil: j['dil'] as String? ?? 'js',
          aciklama: aciklama,
          ipuclari: ipuclari,
        );
      case 'kodsec':
        return KodParcaSec(
          soru: soru,
          kod: j['kod'] as String,
          dogru: (j['dogru'] as List).map((e) => e as int).toList(),
          dil: j['dil'] as String? ?? 'js',
          aciklama: aciklama,
          ipuclari: ipuclari,
        );
      case 'kodyaz':
        return KodYaz(
          soru: soru,
          kod: j['kod'] as String,
          cevaplar: metinler('cevaplar'),
          dil: j['dil'] as String? ?? 'js',
          aciklama: aciklama,
          ipuclari: ipuclari,
        );
      case 'kodcikti':
        return KodCikti(
          soru: soru,
          kod: j['kod'] as String,
          beklenenCikti: j['beklenenCikti'] as String,
          dil: j['dil'] as String? ?? 'js',
          aciklama: aciklama,
          ipuclari: ipuclari,
        );
      case 'kodcalistir':
        return KodCalistir(
          soru: soru,
          baslangic: j['baslangic'] as String? ?? '',
          beklenenCikti: j['beklenenCikti'] as String,
          cozum: j['cozum'] as String,
          gerekenler: j['gerekenler'] == null
              ? const []
              : metinler('gerekenler'),
          aciklama: aciklama,
          ipuclari: ipuclari,
        );
      default:
        throw FormatException('Bilinmeyen alıştırma türü: $tur');
    }
  }
}

/// Çoktan seçmeli.
class Secim extends Alistirma {
  const Secim({
    required super.soru,
    required this.secenekler,
    required this.dogru,
    super.aciklama,
    super.ipuclari,
  });
  final List<String> secenekler;
  final int dogru;
  @override
  String get tur => 'secim';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'secenekler': secenekler,
    'dogru': dogru,
    'aciklama': aciklama,
    if (ipuclari.isNotEmpty) 'ipuclari': ipuclari,
  };
}

/// Boşluk doldurma: soru içinde `___`, seçeneklerden biri doğru.
class Bosluk extends Alistirma {
  const Bosluk({
    required super.soru,
    required this.secenekler,
    required this.dogru,
    super.aciklama,
    super.ipuclari,
  });
  final List<String> secenekler;
  final int dogru;
  @override
  String get tur => 'bosluk';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'secenekler': secenekler,
    'dogru': dogru,
    'aciklama': aciklama,
    if (ipuclari.isNotEmpty) 'ipuclari': ipuclari,
  };
}

/// Serbest yazma: kabul edilen cevap listesi.
class Yaz extends Alistirma {
  const Yaz({
    required super.soru,
    required this.cevaplar,
    super.aciklama,
    super.ipuclari,
  });
  final List<String> cevaplar;
  @override
  String get tur => 'yaz';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'cevaplar': cevaplar,
    'aciklama': aciklama,
    if (ipuclari.isNotEmpty) 'ipuclari': ipuclari,
  };
}

/// Parçaları sıraya dizme.
class Sirala extends Alistirma {
  const Sirala({
    required super.soru,
    required this.kelimeler,
    required this.dogru,
    super.aciklama,
    super.ipuclari,
  });
  final List<String> kelimeler; // karışık
  final List<String> dogru; // doğru sıra
  @override
  String get tur => 'sirala';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'kelimeler': kelimeler,
    'dogru': dogru,
    'aciklama': aciklama,
    if (ipuclari.isNotEmpty) 'ipuclari': ipuclari,
  };
}

/// Eşleştirme: 3-5 çift.
class Eslestir extends Alistirma {
  const Eslestir({
    required super.soru,
    required this.ciftler,
    super.aciklama,
    super.ipuclari,
  });
  final List<({String sol, String sag})> ciftler;
  @override
  String get tur => 'eslestir';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'ciftler': ciftler.map((c) => [c.sol, c.sag]).toList(),
    'aciklama': aciklama,
    if (ipuclari.isNotEmpty) 'ipuclari': ipuclari,
  };
}

/// Dinleme: `okunacak` metni sesli okunur, kullanıcı duyduğunu seçer.
class Dinle extends Alistirma {
  const Dinle({
    required super.soru,
    required this.okunacak,
    required this.secenekler,
    required this.dogru,
    this.dil = varsayilanSesDili,
    super.aciklama,
    super.ipuclari,
  });
  final String okunacak;
  final List<String> secenekler;
  final int dogru;

  /// Okuma (TTS) dili; yalnız varsayılandan farklıysa JSON'a yazılır.
  final String dil;
  @override
  String get tur => 'dinle';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'okunacak': okunacak,
    'secenekler': secenekler,
    'dogru': dogru,
    if (dil != varsayilanSesDili) 'dil': dil,
    'aciklama': aciklama,
    if (ipuclari.isNotEmpty) 'ipuclari': ipuclari,
  };
}

/// "Atla" cevabı: konuşma tanıma yokken `Soyle` alıştırması nötr geçilir
/// (oturum sonucu bildirmez; SRS'e yanlış yazılmaz).
final class SoyleAtlandi {
  const SoyleAtlandi();
}

/// Konuşma / telaffuz: `dil` dilindeki `metin` yüksek sesle söylenir, tanınan metin
/// kelime kelime puanlanır (`telaffuzPuani`). `soru` yönergedir, `ceviri`
/// Türkçe anlamıdır. Cevap: bool (eşik geçildi mi) ya da [atla].
class Soyle extends Alistirma {
  const Soyle({
    required super.soru,
    required this.metin,
    required this.ceviri,
    this.dil = varsayilanSesDili,
    super.aciklama,
    super.ipuclari,
  });
  final String metin;
  final String ceviri;

  /// Okuma ve konuşma tanıma dili; yalnız varsayılandan farklıysa JSON'a yazılır.
  final String dil;

  /// Atla cevabı (tek örnek).
  static const SoyleAtlandi atla = SoyleAtlandi();

  /// Bir alıştırmanın en çok kaç deneme hakkı olduğu.
  static const int enCokDeneme = 3;

  @override
  String get tur => 'soyle';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'metin': metin,
    'ceviri': ceviri,
    if (dil != varsayilanSesDili) 'dil': dil,
    'aciklama': aciklama,
    if (ipuclari.isNotEmpty) 'ipuclari': ipuclari,
  };
}

/// Kod boşluğu: `kod` içinde `___` yer tutucu, tek satırlık seçenekler.
class Kod extends Alistirma {
  const Kod({
    required super.soru,
    required this.kod,
    required this.secenekler,
    required this.dogru,
    this.dil = 'html',
    super.aciklama,
    super.ipuclari,
  });
  final String kod;
  final List<String> secenekler;
  final int dogru;
  final String dil; // html, css, js
  @override
  String get tur => 'kod';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'kod': kod,
    'secenekler': secenekler,
    'dogru': dogru,
    'dil': dil,
    'aciklama': aciklama,
    if (ipuclari.isNotEmpty) 'ipuclari': ipuclari,
  };
}

/// Tablo tamamlama: `satirlar` tam (doğru) hücre metinlerini içerir; `bos`
/// listesindeki (satır, sütun) hücreleri kullanıcı doldurur. Satır başlığı
/// 0. sütundadır; `baslik` sütun başlıklarıdır (satirlar ile aynı genişlik).
/// `secenekler` doluysa boşluklar seçenekten, boşsa yazarak doldurulur.
/// Cevap: `bos` sırasıyla [List<String>]; karşılaştırma [Motor.cevapDogruMu]
/// içinde Yaz türünün normalizasyonuyla yapılır.
class Tablo extends Alistirma {
  const Tablo({
    required super.soru,
    required this.baslik,
    required this.satirlar,
    required this.bos,
    this.secenekler = const [],
    super.aciklama,
    super.ipuclari,
  });
  final List<String> baslik;
  final List<List<String>> satirlar;
  final List<({int satir, int sutun})> bos;
  final List<String> secenekler;

  /// Boş hücrenin doğru metni.
  String hucre(({int satir, int sutun}) b) => satirlar[b.satir][b.sutun];

  @override
  String get tur => 'tablo';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'baslik': baslik,
    'satirlar': satirlar,
    'bos': bos.map((b) => [b.satir, b.sutun]).toList(),
    if (secenekler.isNotEmpty) 'secenekler': secenekler,
    'aciklama': aciklama,
    if (ipuclari.isNotEmpty) 'ipuclari': ipuclari,
  };
}

/// Cümlede işaretleme: `cumle` boşluklardan kelimelere bölünür; `dogru`
/// doğru kelimelerin indeksleridir (birden çok olabilir). Cevap: dokunulan
/// indekslerin [List<int>]'i (sıra önemsiz).
class Isaretle extends Alistirma {
  const Isaretle({
    required super.soru,
    required this.cumle,
    required this.dogru,
    super.aciklama,
    super.ipuclari,
  });
  final String cumle;
  final List<int> dogru;

  /// Cümlenin kelimeleri (boşluğa göre).
  List<String> get kelimeler =>
      cumle.trim().split(RegExp(r'\s+')).where((k) => k.isNotEmpty).toList();
  @override
  String get tur => 'isaretle';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'cumle': cumle,
    'dogru': dogru,
    'aciklama': aciklama,
    if (ipuclari.isNotEmpty) 'ipuclari': ipuclari,
  };
}

/// Tahtada hamle: `fen` başlangıç konumunda kullanıcı doğru hamleyi oynar.
/// `hamleler` UCI ana hattır ('e2e4', terfi 'e7e8q'): çift indeksler
/// kullanıcının, tek indeksler rakibin (otomatik oynanan) cevabıdır; tek
/// hamlelik bulmacada yalnız bir öğe. `matKabul` true ise kullanıcının son
/// hamlesi mat ettiği sürece kabul edilir (aynı konumda birden çok mat
/// hamlesi olabilir). `hataMesajlari`: yanlış hamle (UCI) -> ona özel mesaj.
/// Cevap: kullanıcının oynadığı hamlelerin (UCI) [List<String>]'i; doğru
/// olması için oyuncu hamleleriyle sırayla eşleşmeli.
/// `oyun`: tahta türü ('satranc'; Go gibi oyunlar için ayrılmış).
class Hamle extends Alistirma {
  const Hamle({
    required super.soru,
    required this.fen,
    required this.hamleler,
    this.matKabul = false,
    this.hataMesajlari = const {},
    this.oyun = varsayilanOyun,
    super.aciklama,
    super.ipuclari,
  });

  static const String varsayilanOyun = 'satranc';

  final String fen;
  final List<String> hamleler;
  final bool matKabul;
  final Map<String, String> hataMesajlari;
  final String oyun;

  /// Kullanıcının oynaması gereken hamleler (ana hattın çift indeksleri).
  List<String> get oyuncuHamleleri => [
    for (var i = 0; i < hamleler.length; i += 2) hamleler[i],
  ];

  @override
  String get tur => 'hamle';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'fen': fen,
    'hamleler': hamleler,
    if (matKabul) 'matKabul': true,
    if (hataMesajlari.isNotEmpty) 'hataMesajlari': hataMesajlari,
    if (oyun != varsayilanOyun) 'oyun': oyun,
    'aciklama': aciklama,
    if (ipuclari.isNotEmpty) 'ipuclari': ipuclari,
  };
}

/// Kodda çoklu boşluk (ÖZELLİK 68): `kod` içinde bir ya da daha çok `___`;
/// `dogru[i]` i. boşluğun parçasıdır. `secenekler` parça bankasıdır (doğru
/// parçaların hepsi ve çeldiriciler); bir parça birden çok kez kullanılabilir.
/// Cevap: boşluk sırasıyla [List<String>].
class KodBoslukDoldur extends Alistirma {
  const KodBoslukDoldur({
    required super.soru,
    required this.kod,
    required this.dogru,
    required this.secenekler,
    this.dil = 'js',
    super.aciklama,
    super.ipuclari,
  });
  final String kod;
  final List<String> dogru;
  final List<String> secenekler;
  final String dil;

  /// Koddaki boşluk sayısı.
  int get boslukSayisi => '___'.allMatches(kod).length;

  /// Boşlukları sırayla [parcalar] ile doldurur; null parça `___` kalır.
  String doldur(List<String?> parcalar) {
    final b = StringBuffer();
    final bolumler = kod.split('___');
    for (var i = 0; i < bolumler.length; i++) {
      b.write(bolumler[i]);
      if (i < bolumler.length - 1) {
        b.write(i < parcalar.length ? (parcalar[i] ?? '___') : '___');
      }
    }
    return b.toString();
  }

  @override
  String get tur => 'kodbosluk';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'kod': kod,
    'dogru': dogru,
    'secenekler': secenekler,
    'dil': dil,
    'aciklama': aciklama,
    if (ipuclari.isNotEmpty) 'ipuclari': ipuclari,
  };
}

/// Kod parçası seçme (ÖZELLİK 68): `kod` satırlara bölünür; `dogru` doğru
/// satırların indeksleridir (0'dan; birden çok olabilir). Cevap: dokunulan
/// satır indekslerinin [List<int>]'i (sıra önemsiz).
class KodParcaSec extends Alistirma {
  const KodParcaSec({
    required super.soru,
    required this.kod,
    required this.dogru,
    this.dil = 'js',
    super.aciklama,
    super.ipuclari,
  });
  final String kod;
  final List<int> dogru;
  final String dil;

  List<String> get satirlar => kod.split('\n');

  @override
  String get tur => 'kodsec';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'kod': kod,
    'dogru': dogru,
    'dil': dil,
    'aciklama': aciklama,
    if (ipuclari.isNotEmpty) 'ipuclari': ipuclari,
  };
}

/// Anahtar sözcüğü yazma / heceleme (ÖZELLİK 68): `kod` içinde tek `___`;
/// kullanıcı boşluğa geleni yazar. Karşılaştırma büyük/küçük harfe
/// DUYARLIDIR (kod dilleri öyledir); baştaki/sondaki boşluk yok sayılır.
/// Cevap: [String].
class KodYaz extends Alistirma {
  const KodYaz({
    required super.soru,
    required this.kod,
    required this.cevaplar,
    this.dil = 'js',
    super.aciklama,
    super.ipuclari,
  });
  final String kod;
  final List<String> cevaplar;
  final String dil;

  @override
  String get tur => 'kodyaz';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'kod': kod,
    'cevaplar': cevaplar,
    'dil': dil,
    'aciklama': aciklama,
    if (ipuclari.isNotEmpty) 'ipuclari': ipuclari,
  };
}

/// Çıktıyı yaz (ÖZELLİK 69, Python dahil): `kod` gösterilir, kullanıcı
/// çıktısını yazar; [ciktiAyni] ile `beklenenCikti`ya karşılaştırılır. Kod
/// ÇALIŞTIRILMAZ. Cevap: [String].
class KodCikti extends Alistirma {
  const KodCikti({
    required super.soru,
    required this.kod,
    required this.beklenenCikti,
    this.dil = 'js',
    super.aciklama,
    super.ipuclari,
  });
  final String kod;
  final String beklenenCikti;
  final String dil;

  @override
  String get tur => 'kodcikti';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'kod': kod,
    'beklenenCikti': beklenenCikti,
    'dil': dil,
    'aciklama': aciklama,
    if (ipuclari.isNotEmpty) 'ipuclari': ipuclari,
  };
}

/// Çalıştırılabilir ders (ÖZELLİK 69, yalnız JavaScript): kullanıcı
/// `baslangic` kodunu düzenler ve cihazdaki JS motorunda çalıştırır;
/// `console.log` çıktısı `beklenenCikti` ile karşılaştırılır ve koddaki
/// `gerekenler` (ör. 'for') aranır. `cozum` örnek çözümdür (ipucu ve motor
/// yokken çıktı tahmini için). Cevap: [KodCalismaSonucu] (motorla) ya da
/// [String] (motor yokken çözüm kodunun çıktı tahmini).
class KodCalistir extends Alistirma {
  const KodCalistir({
    required super.soru,
    required this.baslangic,
    required this.beklenenCikti,
    required this.cozum,
    this.gerekenler = const [],
    super.aciklama,
    super.ipuclari,
  });
  final String baslangic;
  final String beklenenCikti;
  final String cozum;
  final List<String> gerekenler;

  /// Yalnız JavaScript çalıştırılır.
  String get dil => 'js';

  @override
  String get tur => 'kodcalistir';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'baslangic': baslangic,
    'beklenenCikti': beklenenCikti,
    'cozum': cozum,
    if (gerekenler.isNotEmpty) 'gerekenler': gerekenler,
    'aciklama': aciklama,
    if (ipuclari.isNotEmpty) 'ipuclari': ipuclari,
  };
}

class Ders {
  const Ders({
    required this.id,
    required this.ad,
    required this.alistirmalar,
    this.dilbilgisiNotu,
  });
  final String id; // ör. ingilizce-1.u1.d1
  final String ad;

  /// İsteğe bağlı kısa dilbilgisi notu; varsa ders başında ayrı bir kartta
  /// gösterilir (yoksa kart yok).
  final String? dilbilgisiNotu;
  final List<Alistirma> alistirmalar; // her ders 8-10 alıştırma

  /// Aralıklı tekrar kart kimliği: dersId#indeks
  String kartKimligi(int indeks) => '$id#$indeks';
}

class Unite {
  const Unite({required this.id, required this.ad, required this.dersler});
  final String id;
  final String ad;
  final List<Ders> dersler;
}

/// Kurs alanı. JSON/durumda adıyla saklanır ('dil' | 'kod' | 'oyun').
enum KursAlani { dil, kod, oyun }

class Kurs {
  const Kurs({
    required this.id,
    required this.ad,
    required this.aciklama,
    required this.alan,
    required this.uniteler,
  });
  final String id; // ingilizce-1, html-1, css-1, js-1
  final String ad;
  final String aciklama;
  final KursAlani alan;
  final List<Unite> uniteler;

  Iterable<Ders> get tumDersler => uniteler.expand((u) => u.dersler);

  Ders? dersBul(String dersId) {
    for (final d in tumDersler) {
      if (d.id == dersId) return d;
    }
    return null;
  }
}
