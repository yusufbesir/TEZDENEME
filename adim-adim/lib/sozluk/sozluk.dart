/// Gömülü sözlük: kurs içeriğindeki eşleştirme çiftlerinden ve
/// `"X" ne demektir?` biçimli seçim sorularından üretilen kelime/anlam
/// listesi. Saf Dart; Flutter bağımlılığı yoktur (testi kolay olsun).
/// Arama büyük/küçük harf ve Türkçe harf (İ/ı/ş/ğ/ü/ö/ç) duyarsızdır;
/// başlangıç eşleşmeleri içerik eşleşmelerinden önce gelir.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/icerik.dart';

/// Tek bir sözlük maddesi. `dil`: 'en' (İngilizce) ya da 'kod' (HTML/CSS/JS).
class SozlukMaddesi {
  const SozlukMaddesi({
    required this.kelime,
    required this.anlam,
    required this.dil,
    required this.kursId,
    required this.dersId,
    required this.alistirmaIndeksi,
  });

  final String kelime;
  final String anlam;
  final String dil;
  final String kursId;
  final String dersId;

  /// Maddenin kaynağı olan alıştırmanın ders içindeki sırası (0 tabanlı).
  final int alistirmaIndeksi;

  /// Kaynak alıştırmanın aralıklı tekrar kart kimliği
  /// (`Ders.kartKimligi` ile aynı biçim: 'dersId#indeks').
  String get kartKimligi => '$dersId#$alistirmaIndeksi';

  @override
  String toString() => '$kelime: $anlam ($dil, $dersId)';
}

/// Kurslardan üretilen, aranabilir sözlük.
class Sozluk {
  Sozluk(List<SozlukMaddesi> maddeler)
    : maddeler = List.unmodifiable(
        List<SozlukMaddesi>.of(maddeler)..sort(_alfabetik),
      );

  /// Alfabetik sıralı, değiştirilemez tam liste.
  final List<SozlukMaddesi> maddeler;

  /// `"Hello" ne demektir?` biçimini yakalar; tırnak içi kelime olur.
  static final RegExp _neDemektir = RegExp(r'^"([^"]+)" ne demektir\?$');

  /// Tüm kurslardaki Eslestir çiftlerini ve "X ne demektir?" seçim
  /// sorularını tarar. Aynı kelime+anlam (normalize) tekrarı birleştirilir;
  /// ilk görülen ders (ve alıştırma indeksi) kalır.
  factory Sozluk.kurslardan(List<Kurs> kurslar) {
    final gorulen = <String>{};
    final sonuc = <SozlukMaddesi>[];
    void ekle(SozlukMaddesi m) {
      final kelime = m.kelime.trim();
      final anlam = m.anlam.trim();
      if (kelime.isEmpty || anlam.isEmpty) return;
      final anahtar = '${normalize(kelime)}\u0000${normalize(anlam)}';
      if (!gorulen.add(anahtar)) return;
      sonuc.add(
        SozlukMaddesi(
          kelime: kelime,
          anlam: anlam,
          dil: m.dil,
          kursId: m.kursId,
          dersId: m.dersId,
          alistirmaIndeksi: m.alistirmaIndeksi,
        ),
      );
    }

    for (final kurs in kurslar) {
      final dil = kurs.alan == KursAlani.kod ? 'kod' : 'en';
      for (final ders in kurs.tumDersler) {
        for (var i = 0; i < ders.alistirmalar.length; i++) {
          final a = ders.alistirmalar[i];
          switch (a) {
            case Eslestir(:final ciftler):
              for (final c in ciftler) {
                ekle(
                  SozlukMaddesi(
                    kelime: c.sol,
                    anlam: c.sag,
                    dil: dil,
                    kursId: kurs.id,
                    dersId: ders.id,
                    alistirmaIndeksi: i,
                  ),
                );
              }
            case Secim(:final soru, :final secenekler, :final dogru):
              final e = _neDemektir.firstMatch(soru.trim());
              if (e != null && dogru >= 0 && dogru < secenekler.length) {
                ekle(
                  SozlukMaddesi(
                    kelime: e.group(1)!,
                    anlam: secenekler[dogru],
                    dil: dil,
                    kursId: kurs.id,
                    dersId: ders.id,
                    alistirmaIndeksi: i,
                  ),
                );
              }
            default:
              break;
          }
        }
      }
    }
    return Sozluk(sonuc);
  }

  /// Arama için normalize: küçük harf, Türkçe harfler sadeleştirilir,
  /// kenar boşlukları atılır. ("İ"→"i", "ı"→"i", "ş"→"s", "ğ"→"g",
  /// "ü"→"u", "ö"→"o", "ç"→"c".)
  static String normalize(String s) {
    final b = StringBuffer();
    for (final r in s.trim().runes) {
      final ch = String.fromCharCode(r);
      switch (ch) {
        case 'İ' || 'I' || 'ı' || 'i':
          b.write('i');
        case 'Ş' || 'ş':
          b.write('s');
        case 'Ğ' || 'ğ':
          b.write('g');
        case 'Ü' || 'ü':
          b.write('u');
        case 'Ö' || 'ö':
          b.write('o');
        case 'Ç' || 'ç':
          b.write('c');
        default:
          b.write(ch.toLowerCase());
      }
    }
    return b.toString();
  }

  static int _alfabetik(SozlukMaddesi a, SozlukMaddesi b) {
    final k = normalize(a.kelime).compareTo(normalize(b.kelime));
    if (k != 0) return k;
    return normalize(a.anlam).compareTo(normalize(b.anlam));
  }

  /// Boş sorgu: tüm liste alfabetik. Aksi halde kelime ya da anlamda
  /// duyarsız eşleşme; önce başlangıç, sonra içerik eşleşmeleri (her grup
  /// alfabetik). [dil] verilirse yalnız o dildeki maddeler ('en' | 'kod').
  List<SozlukMaddesi> ara(String sorgu, {String? dil}) {
    final kaynak = dil == null
        ? maddeler
        : maddeler.where((m) => m.dil == dil).toList();
    final q = normalize(sorgu);
    if (q.isEmpty) return kaynak;
    final bas = <SozlukMaddesi>[];
    final ic = <SozlukMaddesi>[];
    for (final m in kaynak) {
      final k = normalize(m.kelime);
      final a = normalize(m.anlam);
      if (k.startsWith(q) || a.startsWith(q)) {
        bas.add(m);
      } else if (k.contains(q) || a.contains(q)) {
        ic.add(m);
      }
    }
    return [...bas, ...ic];
  }
}
