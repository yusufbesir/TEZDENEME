/// Metinden kelime yakalama (SADE 5): yapıştırılan bir metni Latin alfabeli
/// kelimelere ayırır, sözlükteki karşılıklarını bulur ve öğrencinin henüz
/// öğrenmediği ya da zayıf olduğu kelimeleri işaretler. Saf Dart; Flutter
/// bağımlılığı yoktur. Sınırlar: metin en çok [enCokKarakter] karakter,
/// sonuç en çok [enCokKelime] tekil kelime. Öğrenilmişlik ölçütü mevcut
/// kart modelidir: kart var ve yarı ömrü [Kart.ortaEsik] altında değilse
/// kelime "öğrenilmiş" sayılır; kart yoksa ya da zayıfsa işaretlenir.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Yazan: [Claude#pano-kelime].
library;

import '../model/durum.dart';
import '../sozluk/kok.dart';
import '../sozluk/sozluk.dart';

/// Ayrıştırma sonucu: sözlükte olup işaretlenen maddeler (metindeki sıra),
/// sözlükte olup zaten öğrenilmiş kelimeler ve sözlükte bulunmayanlar.
typedef KelimeAyrimi = ({
  List<SozlukMaddesi> isaretli,
  List<String> ogrenilmis,
  List<String> sozlukDisi,
});

abstract final class MetinKelime {
  /// Metin üst sınırı (karakter); fazlası kesilir.
  static const int enCokKarakter = 5000;

  /// Tekil kelime üst sınırı; fazlası atılır.
  static const int enCokKelime = 200;

  /// Latin harfli kelime; içte tek kesme işareti olabilir ("don't").
  /// Sayılar ve noktalama ayraçtır.
  static final RegExp _kelime = RegExp(
    r"\p{Script=Latin}+(?:['’]\p{Script=Latin}+)*",
    unicode: true,
  );

  /// Yalnız ASCII harf: İngilizce kök düşürme bu kelimelerde denenir.
  static final RegExp _tekLatin = RegExp(r'^[a-z]+$');

  /// Latin alfabesi kullanmayan dil kodları; bu dillerde metin ayrıştırılmaz.
  static const Set<String> _latinDisi = {'ko', 'ja', 'zh', 'ru', 'ar'};

  /// [metin]i kelimelere ayırır: noktalama ve sayılar atılır, küçük harfe
  /// çevrilir, tekrarlar tek (ilk görülme sırası korunur). [dil] 'tr' ise
  /// Türkçe küçültme (İ→i, I→ı) uygulanır; Latin dışı dil kodlarında boş
  /// liste döner. Metin [enCokKarakter]'de kesilir, sonuç [enCokKelime]'yi
  /// aşmaz.
  static List<String> kelimeleriAyir(String metin, String dil) {
    if (_latinDisi.contains(dil)) return const [];
    final kaynak = metin.length > enCokKarakter
        ? metin.substring(0, enCokKarakter)
        : metin;
    final gorulen = <String>{};
    final sonuc = <String>[];
    for (final e in _kelime.allMatches(kaynak)) {
      final k = _kucult(e.group(0)!.replaceAll('’', "'"), dil);
      if (gorulen.add(k)) {
        sonuc.add(k);
        if (sonuc.length >= enCokKelime) break;
      }
    }
    return sonuc;
  }

  static String _kucult(String s, String dil) => dil == 'tr'
      ? s.replaceAll('İ', 'i').replaceAll('I', 'ı').toLowerCase()
      : s.toLowerCase();

  /// Kart öğrenilmiş sayılır mı? Kart yoksa hayır; varsa yarı ömrü
  /// [Kart.ortaEsik] ve üstündeyse evet (zayıf kart işaretlenmeye devam eder).
  static bool ogrenilmis(Kart? kart) =>
      kart != null && kart.yariOmurGun >= Kart.ortaEsik;

  /// [kelimeler]i (küçük harf) üç kümeye ayırır: [sozlukBilinenKumesi]
  /// anahtarı normalize kelime, değeri sözlük maddesi; [ogrencininBildikleri]
  /// öğrenilmiş sayılan kart kimlikleri. Sözlükte olup öğrenilmemiş olanlar
  /// işaretlenir; aynı madde iki kelimeden gelirse bir kez sayılır. Bilinen
  /// sınır: öğrenilmişlik kart (alıştırma) düzeyindedir; aynı eşleştirme
  /// alıştırmasındaki kelimeler aynı kartı paylaşır.
  static KelimeAyrimi bilinmeyenler(
    List<String> kelimeler,
    Map<String, SozlukMaddesi> sozlukBilinenKumesi,
    Set<String> ogrencininBildikleri,
  ) {
    final isaretli = <SozlukMaddesi>[];
    // Aynı madde (örn. "cat" ve "cats") bir kez; aynı karta giden farklı
    // kelimeler (aynı eşleştirme alıştırmasındaki cat/dog) ayrı ayrı kalır.
    final gorulenMaddeler = Set<SozlukMaddesi>.identity();
    final ogrenilmis = <String>[];
    final sozlukDisi = <String>[];
    // Doğrudan eşleşme yoksa İngilizce kök denenir ("cats" → "cat",
    // "went" → "go"); bilinen küme sözlük anahtarlarıdır.
    final anahtarlar = sozlukBilinenKumesi.keys.toSet();
    for (final k in kelimeler) {
      final n = Sozluk.normalize(k);
      final m =
          sozlukBilinenKumesi[n] ??
          (_tekLatin.hasMatch(n)
              ? sozlukBilinenKumesi[IngilizceKok.bul(n, bilinen: anahtarlar)]
              : null);
      if (m == null) {
        sozlukDisi.add(k);
      } else if (ogrencininBildikleri.contains(m.kartKimligi)) {
        ogrenilmis.add(k);
      } else if (gorulenMaddeler.add(m)) {
        isaretli.add(m);
      }
    }
    return (
      isaretli: isaretli,
      ogrenilmis: ogrenilmis,
      sozlukDisi: sozlukDisi,
    );
  }

  /// Sözlükten arama kümesi: normalize kelime → madde. Yalnız tek kelimeli
  /// maddeler alınır; İngilizce maddede kök de anahtar olur ("went" → go).
  /// Aynı anahtarda sık olan (sıklık sırası küçük) madde kalır. [dil]
  /// verilirse yalnız o dilin maddeleri.
  static Map<String, SozlukMaddesi> sozlukKumesi(Sozluk sozluk, {String? dil}) {
    final kume = <String, SozlukMaddesi>{};
    void koy(String anahtar, SozlukMaddesi m) {
      if (anahtar.isEmpty) return;
      final eski = kume[anahtar];
      if (eski == null || _dahaSik(m, eski)) kume[anahtar] = m;
    }

    for (final m in sozluk.maddeler) {
      if (dil != null && m.dil != dil) continue;
      final kelime = m.kelime.trim();
      if (kelime.contains(RegExp(r'\s'))) continue;
      koy(Sozluk.normalize(kelime), m);
      if (m.dil == 'en' && m.kokFarkli) koy(m.kok, m);
    }
    return kume;
  }

  static bool _dahaSik(SozlukMaddesi a, SozlukMaddesi b) {
    final sa = a.siklik, sb = b.siklik;
    if (sa == null) return false;
    if (sb == null) return true;
    return sa < sb;
  }

  /// Öğrencinin öğrenilmiş saydığı kart kimlikleri ([ogrenilmis] ölçütü).
  static Set<String> ogrenilmisKartlar(Map<String, Kart> kartlar) => {
    for (final e in kartlar.entries)
      if (ogrenilmis(e.value)) e.key,
  };

  /// Tek adımda: metni ayır, sözlük kümesiyle eşle, öğrenciye göre işaretle.
  static KelimeAyrimi isaretle(
    String metin,
    String dil,
    Sozluk sozluk,
    Map<String, Kart> kartlar, {
    String? sozlukDili,
  }) => bilinmeyenler(
    kelimeleriAyir(metin, dil),
    sozlukKumesi(sozluk, dil: sozlukDili),
    ogrenilmisKartlar(kartlar),
  );
}
