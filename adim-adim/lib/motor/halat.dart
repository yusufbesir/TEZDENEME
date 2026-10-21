/// Halat çekme bilgi yarışı (ÖZELLİK 83, Trivia Crack Lite): bilgisayara karşı,
/// çevrimdışı ve mevcut yarışma sorularından. Her turda oyuncu soruyu yanıtlar;
/// doğruysa halat 1 adım oyuncu tarafına gelir. Bilgisayar da (belirli bir
/// doğruluk oranıyla, tohuma bağlı ve deterministik) yanıtlar; doğruysa halat
/// 1 adım ona gider. İkisi de doğruysa konum değişmez. Konum [mesafe]'ye
/// ulaşan taraf kazanır; sorular biterse (en çok [enCokTur] tur) önde olan
/// kazanır, eşitlikte berabere. Durum, XP, kart ve hata defterine dokunmaz;
/// puan ve satın alma yoktur.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:math' as math;

import '../yarisma/model.dart';

enum HalatSonucu { devam, oyuncu, bilgisayar, berabere }

typedef HalatTuru = ({bool oyuncuDogru, bool bilgisayarDogru, int konum});

class HalatOyunu {
  HalatOyunu({
    required List<YarismaSorusu> sorular,
    int tohum = 0,
    this.bilgisayarOrani = varsayilanBilgisayarOrani,
    int enCok = enCokTur,
  }) : sorular = List.unmodifiable(
         ([...sorular]..shuffle(math.Random(tohum))).take(enCok),
       ) {
    final rnd = math.Random(tohum + 7919);
    _bilgisayar = [
      for (var i = 0; i < this.sorular.length; i++)
        rnd.nextDouble() < bilgisayarOrani,
    ];
  }

  static const int mesafe = 5;
  static const int enCokTur = 12;
  static const double varsayilanBilgisayarOrani = 0.55;

  final List<YarismaSorusu> sorular;
  final double bilgisayarOrani;
  late final List<bool> _bilgisayar;

  /// Halat konumu: +[mesafe] oyuncu kazanır, -[mesafe] bilgisayar kazanır.
  int konum = 0;
  int tur = 0;
  int oyuncuDogru = 0;

  YarismaSorusu? get soru => tur < sorular.length ? sorular[tur] : null;

  HalatSonucu get sonuc {
    if (konum >= mesafe) return HalatSonucu.oyuncu;
    if (konum <= -mesafe) return HalatSonucu.bilgisayar;
    if (tur >= sorular.length) {
      if (konum > 0) return HalatSonucu.oyuncu;
      if (konum < 0) return HalatSonucu.bilgisayar;
      return HalatSonucu.berabere;
    }
    return HalatSonucu.devam;
  }

  bool get bitti => sonuc != HalatSonucu.devam;

  /// Oyuncunun [secim] (0..3) cevabını işler ve turun sonucunu döndürür.
  /// Oyun bittiyse ya da soru yoksa null.
  HalatTuru? cevapla(int secim) {
    final s = soru;
    if (s == null || bitti) return null;
    final dogru = secim == s.dogru;
    final bilg = _bilgisayar[tur];
    if (dogru) {
      konum++;
      oyuncuDogru++;
    }
    if (bilg) konum--;
    tur++;
    return (oyuncuDogru: dogru, bilgisayarDogru: bilg, konum: konum);
  }
}
