/// Dinleme radyosu (ÖZELLİK 46, Duolingo D5): dil kurslarının her ünitesinden
/// türetilen kısa sesli bölümler. Cümleler cihaz TTS ile okunur (çevrimdışı);
/// bölümde "radyo gibi" art arda dinlenir, sonra üç etkinlik türü sorulur:
/// dinle-eşleştir (duyduğunun Türkçe anlamını seç), dinle-tanı (duyduğun
/// yazılı cümleyi seç) ve dinle-sırala (duyduğun cümleyi kelimelerden diz).
/// Hepsi mevcut ders verisinden (Söyle, Dinle, Sırala, uzun Eşleştir çiftleri)
/// türetilir, saklanmaz. Yalnız dil kurslarında; kod/oyun kurslarında bölüm
/// yoktur. Etkinlikler kart aralıklarını, hata defterini ve XP'yi
/// değiştirmez (Pratik merkezi kuralı).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:math' as math;

import '../model/icerik.dart';
import 'ders_ogeleri.dart';

enum RadyoTuru { dinleEslestir, dinleTani, dinleSirala }

/// Bölümdeki bir cümle: metin, (varsa) Türkçe anlamı ve okuma dili.
class RadyoCumlesi {
  const RadyoCumlesi({required this.metin, this.anlam, required this.dil});
  final String metin;
  final String? anlam;
  final String dil;
}

class RadyoBolumu {
  const RadyoBolumu({
    required this.kursId,
    required this.kursAd,
    required this.uniteIndeks,
    required this.uniteId,
    required this.ad,
    required this.dil,
    required this.cumleler,
  });

  final String kursId;
  final String kursAd;
  final int uniteIndeks;
  final String uniteId;
  final String ad;
  final String dil;
  final List<RadyoCumlesi> cumleler;
}

/// Bir radyo sorusu: etkinlik türü, soru ([alistirma]) ve okunacak cümle.
class RadyoSorusu {
  const RadyoSorusu({
    required this.tur,
    required this.alistirma,
    required this.okunacak,
    required this.dil,
  });
  final RadyoTuru tur;
  final Alistirma alistirma;
  final String okunacak;
  final String dil;
}

abstract final class Radyo {
  /// Bölümde en az bu kadar cümle olmalı (seçenek üretmek için).
  static const int enAzCumle = 3;

  /// Bölümdeki en çok cümle ve bir oturumdaki en çok soru.
  static const int enCokCumle = 8;
  static const int enCokSoru = 6;

  static final RegExp _parantez = RegExp(r'\s*\([^)]*\)\s*$');

  static int _kelimeSayisi(String s) =>
      s.trim().split(RegExp(r'\s+')).where((k) => k.isNotEmpty).length;

  /// Dil kurslarının bölümleri (ünite başına bir; yeterli cümlesi olmayan
  /// ünite atlanır). Kod ve oyun kursları atlanır.
  static List<RadyoBolumu> bolumler(List<Kurs> kurslar) {
    final sonuc = <RadyoBolumu>[];
    for (final kurs in kurslar) {
      if (kurs.alan != KursAlani.dil) continue;
      final varsayilan = DersOgeleri.kursSesDili(kurs.id);
      for (var ui = 0; ui < kurs.uniteler.length; ui++) {
        final unite = kurs.uniteler[ui];
        final cumleler = <RadyoCumlesi>[];
        final gorulen = <String>{};
        void ekle(String metin, String? anlam, String dil) {
          final m = metin.replaceAll(_parantez, '').trim();
          if (_kelimeSayisi(m) < 2) return;
          if (cumleler.length >= enCokCumle) return;
          if (!gorulen.add(m.toLowerCase())) return;
          final a = anlam?.trim();
          cumleler.add(
            RadyoCumlesi(
              metin: m,
              anlam: (a == null || a.isEmpty) ? null : a,
              dil: dil,
            ),
          );
        }

        for (final ders in unite.dersler) {
          for (final a in ders.alistirmalar) {
            switch (a) {
              case Soyle(:final metin, :final ceviri, :final dil):
                ekle(metin, ceviri, dil);
              case Dinle(:final okunacak, :final dil):
                ekle(okunacak, null, dil);
              case Sirala(:final dogru):
                if (dogru.length >= 3) ekle(dogru.join(' '), null, varsayilan);
              case Eslestir(:final ciftler):
                for (final c in ciftler) {
                  if (_kelimeSayisi(c.sol) >= 3) ekle(c.sol, c.sag, varsayilan);
                }
              default:
                break;
            }
          }
        }
        if (cumleler.length < enAzCumle) continue;
        // Çevirisi bilinenler öne (kararlı).
        final sirali = [
          ...cumleler.where((c) => c.anlam != null),
          ...cumleler.where((c) => c.anlam == null),
        ];
        sonuc.add(
          RadyoBolumu(
            kursId: kurs.id,
            kursAd: kurs.ad,
            uniteIndeks: ui,
            uniteId: unite.id,
            ad: unite.ad,
            dil: varsayilan,
            cumleler: List.unmodifiable(sirali),
          ),
        );
      }
    }
    return sonuc;
  }

  /// Kursun ünite indeksine ait bölüm; yoksa null.
  static RadyoBolumu? bolumBul(
    List<Kurs> kurslar,
    String kursId,
    int uniteIndeks,
  ) {
    for (final b in bolumler(kurslar)) {
      if (b.kursId == kursId && b.uniteIndeks == uniteIndeks) return b;
    }
    return null;
  }

  /// Bölümün etkinlik soruları (en çok [enCokSoru]); aynı [tohum] aynı sorular.
  /// Sıra: dinle-tanı, dinle-eşleştir, dinle-sırala (olanlar), kalanı tanıyla
  /// tamamlanır. Seçenekler bölümün kendi cümlelerinden gelir.
  static List<RadyoSorusu> sorular(RadyoBolumu b, {int tohum = 0}) {
    final rnd = math.Random(tohum);
    final cumleler = b.cumleler;
    final sonuc = <RadyoSorusu>[];
    final cevirili = [
      for (final c in cumleler)
        if (c.anlam != null) c,
    ];

    List<T> karistir<T>(Iterable<T> k) => k.toList()..shuffle(rnd);

    // Dinle-tanı: duyduğu yazılı cümleyi seç (üç seçenek).
    RadyoSorusu tani(RadyoCumlesi c) {
      final diger = karistir(
        cumleler.where((x) => x.metin != c.metin).map((x) => x.metin),
      ).take(2);
      final secenekler = karistir([c.metin, ...diger]);
      return RadyoSorusu(
        tur: RadyoTuru.dinleTani,
        okunacak: c.metin,
        dil: c.dil,
        alistirma: Dinle(
          soru: 'Duyduğun cümleyi seç.',
          okunacak: c.metin,
          secenekler: secenekler,
          dogru: secenekler.indexOf(c.metin),
          dil: c.dil,
          aciklama: '${c.metin}${c.anlam == null ? '' : ': ${c.anlam}'}',
        ),
      );
    }

    // Dinle-eşleştir: duyduğunun Türkçe anlamını seç.
    RadyoSorusu eslestir(RadyoCumlesi c) {
      final diger = karistir(
        cevirili.where((x) => x.anlam != c.anlam).map((x) => x.anlam!),
      ).take(2);
      final secenekler = karistir([c.anlam!, ...diger]);
      return RadyoSorusu(
        tur: RadyoTuru.dinleEslestir,
        okunacak: c.metin,
        dil: c.dil,
        alistirma: Dinle(
          soru: 'Duyduğunun anlamını seç.',
          okunacak: c.metin,
          secenekler: secenekler,
          dogru: secenekler.indexOf(c.anlam!),
          dil: c.dil,
          aciklama: '${c.metin}: ${c.anlam}',
        ),
      );
    }

    // Dinle-sırala: duyduğu cümleyi kelimelerden diz.
    RadyoSorusu? sirala(RadyoCumlesi c) {
      final kelimeler = c.metin
          .split(RegExp(r'\s+'))
          .where((k) => k.isNotEmpty)
          .toList();
      if (kelimeler.length < 3 ||
          kelimeler.toSet().length != kelimeler.length) {
        return null;
      }
      var karisik = karistir(kelimeler);
      // Başlangıçta zaten doğru sırada olmasın.
      for (var i = 0; i < 5 && _ayniSira(karisik, kelimeler); i++) {
        karisik = karistir(kelimeler);
      }
      if (_ayniSira(karisik, kelimeler)) {
        karisik = [...kelimeler.skip(1), kelimeler.first];
      }
      return RadyoSorusu(
        tur: RadyoTuru.dinleSirala,
        okunacak: c.metin,
        dil: c.dil,
        alistirma: Sirala(
          soru: 'Duyduğun cümleyi sırala.',
          kelimeler: karisik,
          dogru: kelimeler,
          aciklama: c.metin,
        ),
      );
    }

    final tanilar = karistir(cumleler);
    sonuc.addAll(tanilar.take(2).map(tani));
    if (cevirili.length >= enAzCumle) {
      sonuc.addAll(karistir(cevirili).take(2).map(eslestir));
    }
    for (final c in karistir(cumleler)) {
      if (sonuc.where((s) => s.tur == RadyoTuru.dinleSirala).length >= 2) break;
      final s = sirala(c);
      if (s != null) sonuc.add(s);
    }
    // Kalan yerleri farklı cümlelerle dinle-tanı ile doldur.
    final kullanilan = {for (final s in sonuc) s.okunacak};
    for (final c in tanilar) {
      if (sonuc.length >= enCokSoru) break;
      if (kullanilan.add(c.metin)) sonuc.add(tani(c));
    }
    return sonuc.take(enCokSoru).toList();
  }

  static bool _ayniSira(List<String> a, List<String> b) {
    if (a.length != b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i] != b[i]) return false;
    }
    return true;
  }
}
