/// Ayın ve yılın özeti (ÖZELLİK 51): çevrimdışı rapor. Yalnız kayıtlı
/// verilerden hesaplanır: ay başına biten ders ve yeni kart sayaçları, günlük
/// XP, günlük süre, kurs başına ders sayacı ve ders ustalığı. Kayıt yoksa
/// (ör. özellikten önceki aylar) o değer 0/yok gösterilir; uydurma yapılmaz.
///
/// "Öğrenilen kelime": o dönemde ilk kez oluşan tekrar kartı sayısı (kart
/// ders alıştırmasından ya da sözlükten eklenir; kelime dışı kartlar da
/// sayılır). "En çok çalışılan konu": dönemde en çok ders bitirilen kurs.
/// "En güçlü ünite": ustalığı (DersMeta.uniteUstalik) en yüksek ünite; bu
/// genel bir ölçüdür, döneme göre değişmez.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/durum.dart';
import '../model/icerik.dart';
import 'ders_meta.dart';
import 'meydan.dart';

/// Bir ayın ya da yılın özeti.
class DonemOzeti {
  const DonemOzeti({
    required this.anahtar,
    required this.dersler,
    required this.yeniKart,
    required this.xp,
    required this.aktifGun,
    required this.sureSn,
    this.enIyiGun,
    this.enIyiGunXp = 0,
    this.enCokKurs,
    this.enCokKursDers = 0,
  });

  /// 'YYYY-MM' (ay) ya da 'YYYY' (yıl).
  final String anahtar;
  final int dersler;
  final int yeniKart;
  final int xp;

  /// XP kazanılan gün sayısı.
  final int aktifGun;
  final int sureSn;

  /// En çok XP kazanılan gün ve XP'si; XP yoksa null.
  final String? enIyiGun;
  final int enIyiGunXp;

  /// Dönemde en çok ders bitirilen kurs kimliği ve ders sayısı.
  final String? enCokKurs;
  final int enCokKursDers;

  /// Dönemde hiç kayıt yok mu?
  bool get bos =>
      dersler == 0 && yeniKart == 0 && xp == 0 && aktifGun == 0 && sureSn == 0;
}

abstract final class Ozet {
  /// Kayıtlı verisi olan aylar, en yeni önce.
  static List<String> aylar(OgrenciDurumu d) {
    final k = <String>{
      for (final a in Meydan.aylikDersler(d).keys) a,
      ...d.aylikKart.keys,
      for (final a in d.aylikKurs.keys) a.substring(0, 7),
      for (final g in d.gunlukXp.keys) g.substring(0, 7),
      for (final g in d.gunlukSureSn.keys) g.substring(0, 7),
    }..removeWhere((a) => !OgrenciDurumu.ayGecerli(a));
    return k.toList()..sort((a, b) => b.compareTo(a));
  }

  /// Kayıtlı verisi olan yıllar, en yeni önce.
  static List<String> yillar(OgrenciDurumu d) {
    final y = {for (final a in aylar(d)) a.substring(0, 4)};
    return y.toList()..sort((a, b) => b.compareTo(a));
  }

  /// 'YYYY-MM' ayının özeti.
  static DonemOzeti ay(OgrenciDurumu d, String ayKodu) =>
      _hesapla(d, ayKodu, (g) => g.startsWith(ayKodu));

  /// 'YYYY' yılının özeti.
  static DonemOzeti yil(OgrenciDurumu d, String yilKodu) =>
      _hesapla(d, yilKodu, (g) => g.startsWith(yilKodu));

  static DonemOzeti _hesapla(
    OgrenciDurumu d,
    String anahtar,
    bool Function(String) icinde,
  ) {
    var dersler = 0, kart = 0;
    for (final e in Meydan.aylikDersler(d).entries) {
      if (icinde(e.key)) dersler += e.value;
    }
    for (final e in d.aylikKart.entries) {
      if (icinde(e.key)) kart += e.value;
    }
    var xp = 0, aktif = 0, enXp = 0;
    String? enGun;
    for (final e in d.gunlukXp.entries) {
      if (!icinde(e.key) || e.value <= 0) continue;
      xp += e.value;
      aktif++;
      if (e.value > enXp || (e.value == enXp && e.key.compareTo(enGun!) > 0)) {
        enXp = e.value;
        enGun = e.key;
      }
    }
    var sure = 0;
    for (final e in d.gunlukSureSn.entries) {
      if (icinde(e.key)) sure += e.value;
    }
    final kurs = <String, int>{};
    for (final e in d.aylikKurs.entries) {
      if (!icinde(e.key.substring(0, 7))) continue;
      final id = e.key.substring(8);
      kurs[id] = (kurs[id] ?? 0) + e.value;
    }
    String? enKurs;
    var enKursDers = 0;
    for (final e in kurs.entries) {
      if (e.value > enKursDers ||
          (e.value == enKursDers && e.key.compareTo(enKurs!) < 0)) {
        enKurs = e.key;
        enKursDers = e.value;
      }
    }
    return DonemOzeti(
      anahtar: anahtar,
      dersler: dersler,
      yeniKart: kart,
      xp: xp,
      aktifGun: aktif,
      sureSn: sure,
      enIyiGun: enGun,
      enIyiGunXp: enXp,
      enCokKurs: enKurs,
      enCokKursDers: enKursDers,
    );
  }

  /// En güçlü ünite: en az bir dersi bitirilmiş üniteler arasında ustalığı en
  /// yüksek olan (eşitlikte kurs/ünite sırasındaki ilk). Hiç yoksa null.
  static ({String kursAd, String uniteAd, int ustalik})? enGucluUnite(
    OgrenciDurumu d,
    List<Kurs> kurslar,
  ) {
    ({String kursAd, String uniteAd, int ustalik})? en;
    for (final k in kurslar) {
      for (final u in k.uniteler) {
        if (!u.dersler.any((x) => (d.tamamlanan[x.id] ?? 0) > 0)) continue;
        final us = DersMeta.uniteUstalik(d, u);
        if (en == null || us > en.ustalik) {
          en = (kursAd: k.ad, uniteAd: u.ad, ustalik: us);
        }
      }
    }
    return en;
  }

  /// 'YYYY-MM' için "Ekim 2026"; 'YYYY' için yıl.
  static String baslik(String anahtar) {
    const aylar = [
      'Ocak',
      'Şubat',
      'Mart',
      'Nisan',
      'Mayıs',
      'Haziran',
      'Temmuz',
      'Ağustos',
      'Eylül',
      'Ekim',
      'Kasım',
      'Aralık',
    ];
    if (anahtar.length == 7 && OgrenciDurumu.ayGecerli(anahtar)) {
      return '${aylar[int.parse(anahtar.substring(5, 7)) - 1]} '
          '${anahtar.substring(0, 4)}';
    }
    return anahtar;
  }

  /// Kopyalanabilir düz metin raporu. [kursAdi] kurs kimliğinden ad bulur
  /// (bulamazsa kimliği yazar); [enGuclu] [enGucluUnite] sonucudur.
  static String metin(
    DonemOzeti o, {
    String Function(String kursId)? kursAdi,
    ({String kursAd, String uniteAd, int ustalik})? enGuclu,
  }) {
    final b = StringBuffer('Adım Adım özeti: ${baslik(o.anahtar)}\n');
    if (o.bos) {
      b.write('Bu dönem için kayıtlı veri yok.');
      return b.toString();
    }
    b
      ..writeln('Biten ders: ${o.dersler}')
      ..writeln('Yeni kart: ${o.yeniKart}')
      ..writeln('Kazanılan XP: ${o.xp}')
      ..writeln('Çalışılan gün: ${o.aktifGun}')
      ..writeln('Çalışma süresi: ${DersMeta.sureMetni(o.sureSn)}');
    if (o.enIyiGun != null) {
      b.writeln('En iyi gün: ${o.enIyiGun} (${o.enIyiGunXp} XP)');
    }
    if (o.enCokKurs != null) {
      b.writeln(
        'En çok çalışılan konu: '
        '${kursAdi?.call(o.enCokKurs!) ?? o.enCokKurs} '
        '(${o.enCokKursDers} ders)',
      );
    }
    if (enGuclu != null) {
      b.writeln(
        'En güçlü ünite: ${enGuclu.uniteAd} (${enGuclu.kursAd}, '
        'ustalık %${enGuclu.ustalik})',
      );
    }
    return b.toString().trimRight();
  }
}
