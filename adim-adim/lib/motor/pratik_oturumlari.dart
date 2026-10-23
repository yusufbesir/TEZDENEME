/// Pratik merkezinin iki yeni oturumu ve günlük hedef yoğunluğu (saf işlevler).
///
/// Hızlı Tekrar (Memrise'tan esinli): [HizliTekrar.sureSn] saniyede mümkün
/// olduğunca çok bekleyen ya da zayıf kartı cevaplatır; her cevap mevcut
/// SRS'e ([Motor.kartIsle]) işlenir, bitişte tek 'tekrar' günlük kaydı yazılır
/// ([Motor.tekrarBitir]). XP verilmez (Tekrar ekranıyla aynı).
/// Günlük Karışım (Drops/Duolingo'dan esinli): tek dokunuşla 10 kartlık
/// karışık oturum; zayıf + zamanı gelen + yeni kart kotaları, havuz
/// [Motor.mikroHavuzu] ile ortaktır. Oturum Mikro ders ekranında
/// (`/mikro?mod=karisim`) çalışır ve [Motor.mikroBitir] ile bitirilir.
/// Günlük hedef yoğunluğu (Rahat/Orta/Yoğun/Ciddi) günlük XP hedefine çevrilir;
/// ayrı bir alan saklanmaz, `gunlukHedef` ile her zaman tutarlıdır.
///
/// Sahibi Yusuf (yusufbesir). Yazan: [İP:Adım Adım Windows sürümü#cihaz]
/// Claude. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf
/// kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:math' as math;

import '../model/durum.dart';
import '../model/icerik.dart';
import 'motor.dart';

typedef OturumKarti = ({String kartId, Alistirma alistirma});

/// Hızlı Tekrar: zamanlı mod seçimi ve sonuç hesabı.
abstract final class HizliTekrar {
  /// Oturum süresi, saniye.
  static const int sureSn = 60;

  /// Bir oturumda sorulabilecek en çok kart.
  static const int enCokKart = 60;

  /// Doğru başına skor.
  static const int dogruPuani = 10;

  /// Hızlı cevaplanan türler; zamanlı modda önce bunlar sorulur.
  static const Set<String> _hizliTurler = {'secim', 'bosluk', 'kod', 'dinle'};

  /// Zamanlı modda hiç sorulmayan türler (mikrofon gerektirir).
  static const Set<String> _disarida = {'soyle'};

  /// Havuz: önce zamanı gelen kartlar (en eski önce), sonra zayıf kartlar
  /// (yarı ömrü [Kart.ortaEsik] altı, en kısa önce); yalnız çözülebilen
  /// kartlar, tekrarsız. Hızlı türler öne alınır (kararlı sıra), en çok
  /// [enCokKart] kart. Havuz boşsa boş liste.
  static List<OturumKarti> sec(
    OgrenciDurumu d,
    List<Kurs> kurslar,
    String bugun,
  ) {
    final alinan = <String>{};
    final liste = <OturumKarti>[];
    void ekle(String id) {
      if (!alinan.add(id)) return;
      final a = Motor.kartCoz(kurslar, id);
      if (a == null || _disarida.contains(a.tur)) return;
      liste.add((kartId: id, alistirma: a));
    }

    Motor.tekrarBekleyen(d, bugun).forEach(ekle);
    final zayif = Motor.kelimeSagligi(d, kurslar).zayif
      ..sort((x, y) {
        final c = d.kartlar[x]!.yariOmurGun.compareTo(
          d.kartlar[y]!.yariOmurGun,
        );
        return c != 0 ? c : x.compareTo(y);
      });
    zayif.forEach(ekle);
    final sirali = [
      ...liste.where((k) => _hizliTurler.contains(k.alistirma.tur)),
      ...liste.where((k) => !_hizliTurler.contains(k.alistirma.tur)),
    ];
    return sirali.take(enCokKart).toList();
  }

  /// Sonuç: skor = doğru x [dogruPuani]; yüzde 0..100 (toplam 0 ise 0).
  static ({int skor, int yuzde}) sonuc(int dogru, int toplam) {
    final t = toplam < 0 ? 0 : toplam;
    final dg = dogru < 0 ? 0 : (dogru > t ? t : dogru);
    return (skor: dg * dogruPuani, yuzde: t == 0 ? 0 : (dg * 100 / t).round());
  }
}

/// Günlük Karışım: zayıf + zamanı gelen + yeni kartlardan karışık oturum.
abstract final class GunlukKarisim {
  /// Oturumdaki kart sayısı.
  static const int adet = 10;

  /// Kotalar (toplam [adet]): zayıf 4, zamanı gelen 4, yeni 2. Bir kümede
  /// yeterli kart yoksa boş yer sırayla zayıf, zamanı gelen, yeni kümelerinden
  /// doldurulur.
  static const int kotaZayif = 4;
  static const int kotaGelen = 4;

  /// Karışımı seçer. Zayıf: son 7 gün hata defteri kartları, ardından yarı
  /// ömrü kısa kartlar. Zamanı gelen: vadesi bugün ya da geçmiş kartlar. Yeni:
  /// henüz kartı olmayan, mikro ders havuzundaki kartlar ([Motor.mikroHavuzu]).
  /// Sonuç kümeler arasında dönüşümlü, ardışık aynı tür olmayacak biçimde
  /// dizilir; aynı [tohum] aynı sonucu verir. Hiç kart yoksa boş liste.
  static List<OturumKarti> sec(
    OgrenciDurumu d,
    List<Kurs> kurslar,
    String bugun, {
    int tohum = 0,
  }) {
    final kullanilan = <String>{};
    List<OturumKarti> coz(Iterable<String> idler) {
      final sonuc = <OturumKarti>[];
      for (final id in idler) {
        final a = Motor.kartCoz(kurslar, id);
        if (a != null && kullanilan.add(id)) {
          sonuc.add((kartId: id, alistirma: a));
        }
      }
      return sonuc;
    }

    final zayifSirali = Motor.kelimeSagligi(d, kurslar).zayif
      ..sort((x, y) {
        final c = d.kartlar[x]!.yariOmurGun.compareTo(
          d.kartlar[y]!.yariOmurGun,
        );
        return c != 0 ? c : x.compareTo(y);
      });
    final zayif = coz([...Motor.zayifKartlar(d, bugun), ...zayifSirali]);
    final gelen = coz(Motor.tekrarBekleyen(d, bugun));
    final yeni = Motor.mikroHavuzu(
      d,
      kurslar,
      haric: {...kullanilan, ...d.kartlar.keys},
    )..shuffle(math.Random(tohum));

    const kotaYeni = adet - kotaZayif - kotaGelen;
    final alZayif = math.min(kotaZayif, zayif.length);
    final alGelen = math.min(kotaGelen, gelen.length);
    final alYeni = math.min(kotaYeni, yeni.length);
    var kalan = adet - alZayif - alGelen - alYeni;
    final al = [alZayif, alGelen, alYeni];
    final mevcut = [zayif.length, gelen.length, yeni.length];
    for (var k = 0; k < 3 && kalan > 0; k++) {
      final ek = math.min(kalan, mevcut[k] - al[k]);
      al[k] += ek;
      kalan -= ek;
    }
    final kumeler = [
      zayif.take(al[0]).toList(),
      gelen.take(al[1]).toList(),
      yeni.take(al[2]).toList(),
    ];

    // Kümeler arası dönüşümlü diz.
    final karisik = <OturumKarti>[];
    for (var i = 0; karisik.length < al[0] + al[1] + al[2]; i++) {
      for (final k in kumeler) {
        if (i < k.length) karisik.add(k[i]);
      }
    }
    // Ardışık aynı türü ayır (mümkünse).
    final sonuc = <OturumKarti>[];
    while (karisik.isNotEmpty) {
      final onceki = sonuc.isEmpty ? null : sonuc.last.alistirma.tur;
      var i = karisik.indexWhere((k) => k.alistirma.tur != onceki);
      if (i < 0) i = 0;
      sonuc.add(karisik.removeAt(i));
    }
    return sonuc;
  }
}

/// Günlük hedef yoğunluğu: ad ve günlük XP hedefi. Değerler ayar kaydırıcısının
/// 10 XP adımlarına oturur; ayrı alan yoktur, yoğunluk `gunlukHedef`ten bulunur.
enum HedefYogunlugu {
  rahat('Rahat', 10),
  orta('Orta', 30),
  yogun('Yoğun', 50),
  ciddi('Ciddi', 100);

  const HedefYogunlugu(this.ad, this.xp);

  /// Arayüzde görünen ad.
  final String ad;

  /// Günlük XP hedefi.
  final int xp;

  /// Hedef XP'ye karşılık gelen yoğunluk; hiçbiri değilse (kaydırıcıyla
  /// ayarlanmış özel hedef) null.
  static HedefYogunlugu? hedeften(int gunlukHedef) {
    for (final y in values) {
      if (y.xp == gunlukHedef) return y;
    }
    return null;
  }
}
