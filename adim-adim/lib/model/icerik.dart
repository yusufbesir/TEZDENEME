/// İçerik modeli: kurs > ünite > ders > alıştırma.
///
/// Alıştırma türleri (eski HTML sürümünün şemasıyla uyumlu):
/// secim, bosluk, yaz, sirala, eslestir, dinle (yeni: metin okunur, kullanıcı
/// duyduğunu seçer), kod (yeni: kod parçasındaki boşluğu doldurur).
library;

sealed class Alistirma {
  const Alistirma({required this.soru, this.aciklama});

  /// Soru metni. Boşluk türünde `___` yer tutucu bulunur.
  final String soru;

  /// Yanlış cevapta gösterilen kısa açıklama.
  final String? aciklama;

  String get tur;

  Map<String, Object?> toJson();

  static Alistirma fromJson(Map<String, Object?> j) {
    final tur = j['tur'];
    final soru = j['soru'] as String;
    final aciklama = j['aciklama'] as String?;
    List<String> metinler(String k) =>
        (j[k] as List).map((e) => e as String).toList();
    switch (tur) {
      case 'secim':
        return Secim(
          soru: soru,
          secenekler: metinler('secenekler'),
          dogru: j['dogru'] as int,
          aciklama: aciklama,
        );
      case 'bosluk':
        return Bosluk(
          soru: soru,
          secenekler: metinler('secenekler'),
          dogru: j['dogru'] as int,
          aciklama: aciklama,
        );
      case 'yaz':
        return Yaz(
          soru: soru,
          cevaplar: metinler('cevaplar'),
          aciklama: aciklama,
        );
      case 'sirala':
        return Sirala(
          soru: soru,
          kelimeler: metinler('kelimeler'),
          dogru: metinler('dogru'),
          aciklama: aciklama,
        );
      case 'eslestir':
        return Eslestir(
          soru: soru,
          ciftler: (j['ciftler'] as List)
              .map((c) => (sol: (c as List)[0] as String, sag: c[1] as String))
              .toList(),
          aciklama: aciklama,
        );
      case 'dinle':
        return Dinle(
          soru: soru,
          okunacak: j['okunacak'] as String,
          secenekler: metinler('secenekler'),
          dogru: j['dogru'] as int,
          aciklama: aciklama,
        );
      case 'kod':
        return Kod(
          soru: soru,
          kod: j['kod'] as String,
          secenekler: metinler('secenekler'),
          dogru: j['dogru'] as int,
          dil: j['dil'] as String? ?? 'html',
          aciklama: aciklama,
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
  };
}

/// Boşluk doldurma: soru içinde `___`, seçeneklerden biri doğru.
class Bosluk extends Alistirma {
  const Bosluk({
    required super.soru,
    required this.secenekler,
    required this.dogru,
    super.aciklama,
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
  };
}

/// Serbest yazma: kabul edilen cevap listesi.
class Yaz extends Alistirma {
  const Yaz({required super.soru, required this.cevaplar, super.aciklama});
  final List<String> cevaplar;
  @override
  String get tur => 'yaz';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'cevaplar': cevaplar,
    'aciklama': aciklama,
  };
}

/// Parçaları sıraya dizme.
class Sirala extends Alistirma {
  const Sirala({
    required super.soru,
    required this.kelimeler,
    required this.dogru,
    super.aciklama,
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
  };
}

/// Eşleştirme: 3-5 çift.
class Eslestir extends Alistirma {
  const Eslestir({required super.soru, required this.ciftler, super.aciklama});
  final List<({String sol, String sag})> ciftler;
  @override
  String get tur => 'eslestir';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'ciftler': ciftler.map((c) => [c.sol, c.sag]).toList(),
    'aciklama': aciklama,
  };
}

/// Dinleme: `okunacak` metni sesli okunur, kullanıcı duyduğunu seçer.
class Dinle extends Alistirma {
  const Dinle({
    required super.soru,
    required this.okunacak,
    required this.secenekler,
    required this.dogru,
    super.aciklama,
  });
  final String okunacak;
  final List<String> secenekler;
  final int dogru;
  @override
  String get tur => 'dinle';
  @override
  Map<String, Object?> toJson() => {
    'tur': tur,
    'soru': soru,
    'okunacak': okunacak,
    'secenekler': secenekler,
    'dogru': dogru,
    'aciklama': aciklama,
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
  };
}

class Ders {
  const Ders({required this.id, required this.ad, required this.alistirmalar});
  final String id; // ör. ingilizce-1.u1.d1
  final String ad;
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

enum KursAlani { dil, kod }

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
