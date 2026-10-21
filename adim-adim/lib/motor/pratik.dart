/// Filtreli tekrar, hatırlatma takvimi ve Pratik merkezi mantığı (ÖZELLİK 79
/// ve 44). Hepsi saf işlevdir; durum değiştirmez (yalnız [eslestirmeKaydet]
/// yeni kopya döndürür).
///
/// KURAL (geçici deste): Filtreli tekrar ve Pratik merkezi etkinlikleri SRS'i
/// (kart yarı ömrü, sonraki tekrar günü), hata defterini, XP'yi ve öğrenme
/// günlüğünü GÜNCELLEMEZ; ceza yoktur. Yalnız "Zamana karşı eşleştirme" en iyi
/// süresi saklanır. Böylece kartların aralık takvimi bozulmaz.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:math' as math;

import '../model/durum.dart';
import '../model/icerik.dart';
import 'ders_meta.dart';
import 'ders_ogeleri.dart';
import 'motor.dart';

/// Geçici tekrar destesi türü.
enum TekrarFiltresi { sonYediGunYanlis, yalnizFiiller, zayifKartlar, kurs }

typedef PratikKarti = ({String kartId, Alistirma alistirma});

/// Takvimde bir gün: [adet] o gün (ya da bugün için gecikmişler dahil)
/// bekleyen kart, [gecikmis] bunların vadesi bugünden önce olanı.
typedef TekrarGunu = ({String gun, int adet, int gecikmis});

/// Kelime kartı / eşleştirme için çift.
typedef KelimeCifti = ({String kartId, String metin, String anlam});

abstract final class Pratik {
  /// Geçici deste ve tur uzunlukları.
  static const int desteEnCok = 20;
  static const int takvimGun = 14;
  static const int eslestirmeEnAz = 4;
  static const int eslestirmeEnCok = 8;
  static const int turAdet = 6;
  static const int kartDesteEnCok = 20;

  static String filtreAdi(TekrarFiltresi f, {bool kodMu = false}) =>
      switch (f) {
        TekrarFiltresi.sonYediGunYanlis => 'Son 7 gün yanlışlar',
        TekrarFiltresi.yalnizFiiller =>
          kodMu ? 'Yalnız söz dizimi' : 'Yalnız fiiller',
        TekrarFiltresi.zayifKartlar => 'Zayıf kartlar',
        TekrarFiltresi.kurs => 'Bir kursa ait',
      };

  static List<PratikKarti> _coz(List<Kurs> kurslar, Iterable<String> idler) {
    final sonuc = <PratikKarti>[];
    final gorulen = <String>{};
    for (final id in idler) {
      if (!gorulen.add(id)) continue;
      final a = Motor.kartCoz(kurslar, id);
      if (a != null) sonuc.add((kartId: id, alistirma: a));
      if (sonuc.length >= desteEnCok) break;
    }
    return sonuc;
  }

  /// Seçilen filtreye göre geçici deste (en çok [desteEnCok] kart, tekrarsız).
  /// [kursId] yalnız [TekrarFiltresi.kurs] için: o kursun, öğrencinin kart
  /// kümesindeki kartları, vadesi en yakın önce.
  /// Yalnız fiiller: tamamlanmış derslerin ya da kart kümesindeki kartların
  /// fiil (kod kursunda söz dizimi) öğeleri.
  static List<PratikKarti> desteSec(
    OgrenciDurumu d,
    List<Kurs> kurslar,
    String bugun,
    TekrarFiltresi filtre, {
    String? kursId,
  }) {
    switch (filtre) {
      case TekrarFiltresi.sonYediGunYanlis:
        return _coz(kurslar, Motor.zayifKartlar(d, bugun));
      case TekrarFiltresi.zayifKartlar:
        return _coz(kurslar, Motor.kelimeSagligi(d, kurslar).zayif);
      case TekrarFiltresi.kurs:
        if (kursId == null) return const [];
        final kurs = kurslar.where((k) => k.id == kursId);
        if (kurs.isEmpty) return const [];
        final k = kurs.first;
        final idler = [
          for (final e in d.kartlar.entries)
            if (k.dersBul(_dersId(e.key) ?? '') != null) e.key,
        ];
        idler.sort((x, y) {
          final c = d.kartlar[x]!.sonraki.compareTo(d.kartlar[y]!.sonraki);
          return c != 0 ? c : x.compareTo(y);
        });
        return _coz(kurslar, idler);
      case TekrarFiltresi.yalnizFiiller:
        final idler = <String>[];
        for (final k in kurslar) {
          for (final ders in k.tumDersler) {
            final bitti = (d.tamamlanan[ders.id] ?? 0) > 0;
            final oge = DersOgeleri.uret(ders, alan: k.alan);
            for (final o in oge.tureGore(OgeTuru.fiil)) {
              if (bitti || d.kartlar.containsKey(o.kartId)) idler.add(o.kartId);
            }
          }
        }
        return _coz(kurslar, idler);
    }
  }

  static String? _dersId(String kartId) {
    final i = kartId.lastIndexOf('#');
    return i > 0 ? kartId.substring(0, i) : null;
  }

  static String _gunEkle(String gun, int n) {
    final t = DateTime.tryParse('${gun}T00:00:00Z');
    if (t == null) return gun;
    final r = t.add(Duration(days: n));
    String iki(int x) => x.toString().padLeft(2, '0');
    return '${r.year.toString().padLeft(4, '0')}-${iki(r.month)}-${iki(r.day)}';
  }

  /// Hatırlatma takvimi: bugünden başlayarak [gun] gün; her gün için o gün
  /// vadesi gelen kart sayısı (kart vade tarihlerinden). Vadesi geçmiş kartlar
  /// bugüne sayılır ([TekrarGunu.gecikmis]). [kurslar] verilirse yalnız o
  /// kurslarda çözülebilen kartlar sayılır (Tekrar sekmesiyle aynı küme).
  static List<TekrarGunu> takvim(
    OgrenciDurumu d,
    String bugun, {
    List<Kurs>? kurslar,
    int gun = takvimGun,
  }) {
    final adet = List<int>.filled(gun, 0);
    var gecikmis = 0;
    for (final e in d.kartlar.entries) {
      if (kurslar != null && Motor.kartCoz(kurslar, e.key) == null) continue;
      final fark = Motor.gunFarki(bugun, e.value.sonraki);
      if (fark <= 0) {
        adet[0]++;
        if (fark < 0) gecikmis++;
      } else if (fark < gun) {
        adet[fark]++;
      }
    }
    return [
      for (var i = 0; i < gun; i++)
        (
          gun: _gunEkle(bugun, i),
          adet: adet[i],
          gecikmis: i == 0 ? gecikmis : 0,
        ),
    ];
  }

  /// Öğrencinin kelime havuzu: tamamlanmış derslerin ya da kart kümesindeki
  /// kartların kelime ve fiil öğeleri; anlamı olan, en çok 3 kelimelik, aynı
  /// metin+anlam tekrarsız.
  static List<KelimeCifti> kelimeHavuzu(OgrenciDurumu d, List<Kurs> kurslar) {
    final sonuc = <KelimeCifti>[];
    final gorulen = <String>{};
    for (final k in kurslar) {
      for (final ders in k.tumDersler) {
        final bitti = (d.tamamlanan[ders.id] ?? 0) > 0;
        final oge = DersOgeleri.uret(ders, alan: k.alan);
        for (final o in oge.ogeler) {
          if (o.tur == OgeTuru.kalip) continue;
          final anlam = o.anlam;
          if (anlam == null || anlam.isEmpty) continue;
          // Yaz sorusundan gelen uzun/soru cümlesi anlam sayılmaz.
          if (anlam.length > 40 || anlam.contains('?')) continue;
          if (o.metin.split(RegExp(r'\s+')).length > 3) continue;
          if (!bitti && !d.kartlar.containsKey(o.kartId)) continue;
          if (!gorulen.add('${o.metin}\u0000$anlam')) continue;
          sonuc.add((kartId: o.kartId, metin: o.metin, anlam: anlam));
        }
      }
    }
    return sonuc;
  }

  /// Eşleştirme için 4..8 çift: önce zayıf (yarı ömrü kısa) kartlar, kalanı
  /// karışık. Havuz [eslestirmeEnAz]'dan küçükse boş liste (oyun açılmaz).
  /// Metinler ve anlamlar kendi içinde tekrarsızdır (belirsiz eşleşme olmaz).
  static List<KelimeCifti> eslestirmeCiftleri(
    OgrenciDurumu d,
    List<Kurs> kurslar, {
    int tohum = 0,
  }) {
    final havuz = kelimeHavuzu(d, kurslar)..shuffle(math.Random(tohum));
    final metinler = <String>{};
    final anlamlar = <String>{};
    final benzersiz = <KelimeCifti>[
      for (final c in havuz)
        if (metinler.add(c.metin) && anlamlar.add(c.anlam)) c,
    ];
    double yo(KelimeCifti c) => d.kartlar[c.kartId]?.yariOmurGun ?? 1e9;
    // Kararlı: zayıf kartlar öne (karışık sıra korunur).
    final sirali = [
      ...benzersiz.where((c) => yo(c) < Kart.ortaEsik),
      ...benzersiz.where((c) => yo(c) >= Kart.ortaEsik),
    ];
    if (sirali.length < eslestirmeEnAz) return const [];
    return sirali.take(eslestirmeEnCok).toList();
  }

  /// Eşleştirme süresini kaydeder: yalnız daha iyiyse (ya da ilkse) yazılır.
  static OgrenciDurumu eslestirmeKaydet(OgrenciDurumu d, int ms) {
    if (ms <= 0) return d;
    final eski = d.eslestirmeEnIyiMs;
    if (eski != null && eski <= ms) return d;
    return d.copyWith(eslestirmeEnIyiMs: ms);
  }

  /// Süre metni: 1 dakikadan kısaysa '12,3 sn', değilse '1 dk 5 sn'.
  static String sureMetni(int ms) {
    final sn = ms ~/ 1000;
    if (sn >= 60) return '${sn ~/ 60} dk ${sn % 60} sn';
    return '$sn,${(ms % 1000) ~/ 100} sn';
  }

  /// Artan zorluk turu: [turAdet] alıştırma, kolaydan zora (zorluk
  /// [DersMeta.adim]'den). Havuz: tamamlanmış dersler ve ilk tamamlanmamış
  /// ders. Her düzeyden eşit pay (2-2-2); eksik düzey komşudan tamamlanır.
  /// Konuşma (Soyle) alıştırmaları dışarıda bırakılır. Sıra [tohum]'a bağlıdır.
  static List<PratikKarti> artanZorlukTuru(
    OgrenciDurumu d,
    List<Kurs> kurslar, {
    int tohum = 0,
    int adet = turAdet,
  }) {
    final havuz = <PratikKarti>[];
    var siradakiBulundu = false;
    for (final k in kurslar) {
      for (final ders in k.tumDersler) {
        final bitti = (d.tamamlanan[ders.id] ?? 0) > 0;
        final al = bitti || !siradakiBulundu;
        if (!bitti) siradakiBulundu = true;
        if (!al) continue;
        for (var i = 0; i < ders.alistirmalar.length; i++) {
          final a = ders.alistirmalar[i];
          if (a is Soyle) continue;
          havuz.add((kartId: ders.kartKimligi(i), alistirma: a));
        }
      }
    }
    havuz.shuffle(math.Random(tohum));
    final duzey = <int, List<PratikKarti>>{
      for (final z in Zorluk.values) z.index: [],
    };
    for (final h in havuz) {
      duzey[DersMeta.adim(h.alistirma).zorluk.index]!.add(h);
    }
    final secilen = <PratikKarti>[];
    final pay = (adet / Zorluk.values.length).ceil();
    for (final z in Zorluk.values) {
      secilen.addAll(duzey[z.index]!.take(pay));
    }
    // Eksik kalan yerleri kalan alıştırmalardan doldur.
    for (final z in Zorluk.values) {
      for (final h in duzey[z.index]!.skip(pay)) {
        if (secilen.length >= adet) break;
        secilen.add(h);
      }
    }
    final kes = secilen.take(adet).toList();
    // Kararlı sıralama: kolay -> zor.
    final sirali = [
      for (final z in Zorluk.values)
        ...kes.where((h) => DersMeta.adim(h.alistirma).zorluk == z),
    ];
    return sirali;
  }

  /// Kelime kartları destesi (çevirme): zayıf kartlar önce, en çok
  /// [kartDesteEnCok] kart.
  static List<KelimeCifti> kartDestesi(
    OgrenciDurumu d,
    List<Kurs> kurslar, {
    int tohum = 0,
  }) {
    final havuz = kelimeHavuzu(d, kurslar)..shuffle(math.Random(tohum));
    double yo(KelimeCifti c) => d.kartlar[c.kartId]?.yariOmurGun ?? 1e9;
    final sirali = [
      ...havuz.where((c) => yo(c) < Kart.ortaEsik),
      ...havuz.where((c) => yo(c) >= Kart.ortaEsik),
    ];
    return sirali.take(kartDesteEnCok).toList();
  }
}
