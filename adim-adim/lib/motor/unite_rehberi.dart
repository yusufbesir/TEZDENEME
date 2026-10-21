/// Ünite rehber kitapçığı (ÖZELLİK 42, Duolingo D1): her ünitenin başında
/// açılabilen kısa rehber. Tümü mevcut ünite verisinden TÜRETİLİR (saklanmaz,
/// uydurma bilgi yok): anahtar kalıplar, örnek cümleler, anahtar kelimeler,
/// dilbilgisi notları, CEFR seviyesi (kurs adından) ve tahmini süre.
/// Uniteye özgü hazır bir diyalog verisi olmadığından "örnek diyalog" yerine
/// ünitenin gerçek cümleleri ("Örnek cümleler") gösterilir; dil kurslarında
/// diyalog için senaryolu konuşmaya (ÖZELLİK 65) bağlantı verilir.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/icerik.dart';
import 'ders_meta.dart';
import 'ders_ogeleri.dart';
import 'motor.dart';

/// Rehberdeki bir metin satırı ve (varsa) Türkçe anlamı.
typedef RehberSatiri = ({String metin, String? anlam});

class UniteRehberi {
  const UniteRehberi({
    required this.kursAd,
    required this.uniteAd,
    required this.cefr,
    required this.kodMu,
    required this.dersSayisi,
    required this.dakika,
    required this.sesDili,
    required this.kaliplar,
    required this.cumleler,
    required this.kelimeler,
    required this.notlar,
  });

  /// Rehberdeki en çok satır sayıları.
  static const int enCokKalip = 8;
  static const int enCokCumle = 5;
  static const int enCokKelime = 10;

  /// Dil kurslarında "anahtar kalıp" sayılan en çok kelime sayısı.
  static const int kisaKalip = 4;

  final String kursAd;
  final String uniteAd;

  /// 'A1'..'C2' (kurs adından); kod kurslarında ve belirtilmemişse null.
  final String? cefr;
  final bool kodMu;
  final int dersSayisi;

  /// Tahmini toplam süre (dakika).
  final int dakika;

  /// Sesli okuma dili; null: sesli okuma yok (kod/oyun kursları).
  final String? sesDili;
  final List<RehberSatiri> kaliplar;

  /// Örnek cümleler (yalnız dil kurslarında).
  final List<RehberSatiri> cumleler;
  final List<({String kelime, String anlam})> kelimeler;
  final List<({String ders, String not})> notlar;

  String get kalipBasligi => kodMu ? 'Anahtar söz dizimi' : 'Anahtar kalıplar';
  String get kelimeBasligi => kodMu ? 'Anahtar terimler' : 'Anahtar kelimeler';

  bool get bos =>
      kaliplar.isEmpty &&
      cumleler.isEmpty &&
      kelimeler.isEmpty &&
      notlar.isEmpty;

  static final RegExp _cefrDeseni = RegExp(r'\b(A1|A2|B1|B2|C1|C2)\b');

  /// Kurs adındaki CEFR düzeyi; yoksa null.
  static String? cefrBul(Kurs kurs) {
    if (kurs.alan != KursAlani.dil) return null;
    return _cefrDeseni.firstMatch(kurs.ad)?.group(1);
  }

  static int _kelimeSayisi(String s) =>
      s.trim().split(RegExp(r'\s+')).where((k) => k.isNotEmpty).length;

  /// [kurs]un [uniteIndeks]. ünitesi için rehber; geçersiz indekste null.
  static UniteRehberi? uret(Kurs kurs, int uniteIndeks) {
    if (uniteIndeks < 0 || uniteIndeks >= kurs.uniteler.length) return null;
    final unite = kurs.uniteler[uniteIndeks];
    final ozet = Motor.uniteOzeti(kurs, uniteIndeks);
    final kodKursu = kurs.alan != KursAlani.dil;
    final varsayilanDil = DersOgeleri.kursSesDili(kurs.id);

    final kaliplar = <RehberSatiri>[];
    final cumleler = <RehberSatiri>[];
    final gorulen = <String>{};
    String? sesDili;

    // Dil kurslarında kısa ifadeler (en çok [kisaKalip] kelime) "anahtar
    // kalıp", daha uzun tam cümleler "örnek cümle" olur; kod kurslarında her
    // söz dizimi satırı kalıptır.
    void ekle(String metin, String? anlam) {
      final m = metin.trim();
      if (m.isEmpty) return;
      if (!gorulen.add(m.toLowerCase())) return;
      final kisa = kodKursu || _kelimeSayisi(m) <= kisaKalip;
      (kisa ? kaliplar : cumleler).add((metin: m, anlam: anlam));
    }

    // Çevirisi bilinenler önce, sonra çevirisizler (kararlı).
    final ceviriliAday = <RehberSatiri>[];
    final cevirisizAday = <RehberSatiri>[];
    for (final ders in unite.dersler) {
      final oge = DersOgeleri.uret(
        ders,
        alan: kurs.alan,
        varsayilanDil: varsayilanDil,
      );
      for (final o in oge.tureGore(OgeTuru.kalip)) {
        sesDili ??= o.sesDili;
        (o.anlam != null ? ceviriliAday : cevirisizAday).add((
          metin: o.metin,
          anlam: o.anlam,
        ));
      }
      if (!kodKursu) {
        for (final a in ders.alistirmalar) {
          if (a is Soyle && _kelimeSayisi(a.metin) >= 2) {
            ceviriliAday.add((metin: a.metin, anlam: a.ceviri.trim()));
          }
        }
      }
    }
    for (final k in ceviriliAday) {
      ekle(k.metin, k.anlam);
    }
    for (final k in cevirisizAday) {
      ekle(k.metin, null);
    }
    for (final k in ozet.kaliplar) {
      ekle(k, null);
    }
    final kalipSon = kaliplar.take(enCokKalip).toList();
    final cumleSon = [
      ...cumleler.where((c) => c.anlam != null),
      ...cumleler.where((c) => c.anlam == null),
    ].take(enCokCumle).toList();

    return UniteRehberi(
      kursAd: kurs.ad,
      uniteAd: unite.ad,
      cefr: cefrBul(kurs),
      kodMu: kodKursu,
      dersSayisi: unite.dersler.length,
      dakika: DersMeta.uniteDakika(unite),
      sesDili: kodKursu ? null : (sesDili ?? varsayilanDil),
      kaliplar: List.unmodifiable(kalipSon),
      cumleler: List.unmodifiable(cumleSon),
      kelimeler: List.unmodifiable(ozet.kelimeler.take(enCokKelime)),
      notlar: List.unmodifiable(ozet.notlar),
    );
  }

  /// Panoya kopyalanacak düz metin.
  String metin() {
    final b = StringBuffer('Ünite rehberi: $uniteAd ($kursAd');
    if (cefr != null) b.write(', $cefr');
    b.write(')');
    void bolum(String baslik, Iterable<String> satirlar) {
      if (satirlar.isEmpty) return;
      b.write('\n\n$baslik');
      for (final s in satirlar) {
        b.write('\n- $s');
      }
    }

    String satir(RehberSatiri s) =>
        s.anlam == null ? s.metin : '${s.metin}: ${s.anlam}';
    bolum(kalipBasligi, kaliplar.map(satir));
    bolum('Örnek cümleler', cumleler.map(satir));
    bolum(kelimeBasligi, kelimeler.map((k) => '${k.kelime}: ${k.anlam}'));
    bolum('Dilbilgisi notları', notlar.map((n) => '${n.ders}: ${n.not}'));
    return b.toString();
  }
}
