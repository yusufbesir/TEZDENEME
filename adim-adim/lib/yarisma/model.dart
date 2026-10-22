/// Yarışma modelleri: kategori, soru ve seviye bağlantısı.
/// Saf Dart; Flutter'a bağımlı değildir. Değiştirilemez (immutable).
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

/// Yarışmanın 6 kategorisi (Trivia Crack düzeni).
enum YarismaKategori { genelKultur, tarih, sanat, matematik, fen, cografya }

extension YarismaKategoriUzanti on YarismaKategori {
  /// Arayüzde görünen ad.
  String get ad => switch (this) {
    YarismaKategori.genelKultur => 'Genel Kültür',
    YarismaKategori.tarih => 'Tarih',
    YarismaKategori.sanat => 'Sanat',
    YarismaKategori.matematik => 'Matematik',
    YarismaKategori.fen => 'Fen ve Fizik',
    YarismaKategori.cografya => 'Coğrafya',
  };

  /// JSON için kararlı kimlik (enum adı).
  String get kimlik => name;

  /// Kimlikten kategori; bilinmeyen kimlik için null.
  static YarismaKategori? coz(String kimlik) {
    for (final k in YarismaKategori.values) {
      if (k.name == kimlik) return k;
    }
    return null;
  }
}

/// Sorular için kısa yol: `YarismaKategori.coz`.
YarismaKategori? kategoriCoz(String kimlik) =>
    YarismaKategoriUzanti.coz(kimlik);

/// Tek bir çoktan seçmeli yarışma sorusu.
class YarismaSorusu {
  const YarismaSorusu({
    required this.id,
    required this.alan,
    required this.seviyeKursId,
    required this.kategori,
    required this.soru,
    required this.secenekler,
    required this.dogru,
    required this.aciklama,
  });

  /// `kursId.kategori.sıra` biçimi, ör. 'ingilizce-1.tarih.3'.
  final String id;

  /// 'dil' | 'kod' | 'oyun'.
  final String alan;

  /// Ör. 'ingilizce-1', 'html-1', 'satranc-1'.
  final String seviyeKursId;
  final YarismaKategori kategori;
  final String soru;

  /// Tam 4 şık.
  final List<String> secenekler;

  /// Doğru şıkkın indeksi (0..3).
  final int dogru;
  final String aciklama;

  /// 4 şık, doğru indeks aralıkta, boş metin yok, şıklar birbirinden farklı.
  bool get gecerliMi {
    if (id.trim().isEmpty ||
        soru.trim().isEmpty ||
        aciklama.trim().isEmpty ||
        (alan != 'dil' && alan != 'kod' && alan != 'oyun') ||
        seviyeKursId.trim().isEmpty) {
      return false;
    }
    if (secenekler.length != 4) return false;
    if (dogru < 0 || dogru > 3) return false;
    if (secenekler.any((s) => s.trim().isEmpty)) return false;
    return secenekler.toSet().length == 4;
  }
}

/// Bir alandaki seviye: kurs kimliği ve kısa etiket.
class YarismaSeviye {
  const YarismaSeviye({required this.kursId, required this.etiket});

  final String kursId;
  final String etiket;
}
