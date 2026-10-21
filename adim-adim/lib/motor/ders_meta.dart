/// Ders adımı meta verisi ve ustalık puanı (ÖZELLİK 71). Hepsi içerikten ve
/// öğrenci durumundan türetilir; içerik dosyalarına alan eklenmez.
///
/// Zorluk: türe göre taban puan (1 kolay, 2 orta, 3 zor) + uzunluk/boyut
/// artışı. Süre: türe göre taban saniye + öğe sayısı/uzunluk katkısı.
/// Ustalık (ders): hiç bitirilmediyse 0; yoksa 0,7 x en iyi puan + 0,3 x
/// tekrar (en çok 3 bitiriş sayılır). Ünite ustalığı derslerin ortalamasıdır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/durum.dart';
import '../model/icerik.dart';

enum Zorluk {
  kolay('Kolay'),
  orta('Orta'),
  zor('Zor');

  const Zorluk(this.etiket);
  final String etiket;
}

class AdimMeta {
  const AdimMeta({required this.zorluk, required this.saniye});
  final Zorluk zorluk;

  /// Tahmini süre (saniye).
  final int saniye;
}

class DersMeta {
  const DersMeta._();

  /// Bir bitirişte sayılan en çok çalışma süresi (boşta bırakılan ders
  /// toplamı şişirmesin): 1 saat.
  static const int oturumEnCokSaniye = 3600;

  /// Ustalıkta tekrar katkısının tavan bitiriş sayısı.
  static const int tekrarTavan = 3;

  /// Alıştırmanın zorluğu ve tahmini süresi (türe ve uzunluğa göre).
  static AdimMeta adim(Alistirma a) {
    int puan;
    int sn;
    switch (a) {
      case Secim():
        puan = 1;
        sn = 15;
      case Bosluk():
        puan = 1;
        sn = 15;
      case Dinle():
        puan = 2;
        sn = 20;
      case Isaretle(:final dogru):
        puan = 2;
        sn = 20 + 4 * dogru.length;
      case Eslestir(:final ciftler):
        puan = ciftler.length >= 5 ? 3 : 2;
        sn = 15 + 8 * ciftler.length;
      case Sirala(:final dogru):
        puan = dogru.length >= 7 ? 3 : 2;
        sn = 15 + 4 * dogru.length;
      case Kod(:final kod):
        puan = kod.length > 80 ? 3 : 2;
        sn = 25 + kod.length ~/ 8;
      case Yaz(:final cevaplar):
        final uzun = cevaplar.fold<int>(
          0,
          (m, c) => c.length > m ? c.length : m,
        );
        puan = uzun >= 20 ? 4 : 3;
        sn = 25 + uzun ~/ 2;
      case Tablo(:final bos):
        puan = bos.length >= 4 ? 4 : 3;
        sn = 15 + 12 * bos.length;
      case Soyle(:final metin):
        puan = 3;
        sn = 25 + metin.length ~/ 3;
      case Hamle(:final oyuncuHamleleri):
        puan = oyuncuHamleleri.length >= 2 ? 4 : 3;
        sn = 30 + 20 * oyuncuHamleleri.length;
    }
    sn += a.soru.length ~/ 12;
    final z = puan <= 1 ? Zorluk.kolay : (puan <= 3 ? Zorluk.orta : Zorluk.zor);
    return AdimMeta(zorluk: z, saniye: sn);
  }

  /// Dersin ortalama zorluk puanı: adımların zorluğu kolay 1, orta 2, zor 3
  /// olarak ortalanır; alıştırması olmayan ders 0 (ÖZELLİK 50 karşılaştırması).
  static double dersZorlugu(Ders d) {
    if (d.alistirmalar.isEmpty) return 0;
    final t = d.alistirmalar.fold<int>(
      0,
      (s, a) => s + adim(a).zorluk.index + 1,
    );
    return t / d.alistirmalar.length;
  }

  /// Dersin tüm alıştırmalarının tahmini süresi (saniye).
  static int dersSaniye(Ders d) =>
      d.alistirmalar.fold<int>(0, (t, a) => t + adim(a).saniye);

  /// Dersin tahmini süresi, tam dakikaya yukarı yuvarlanır (en az 1).
  static int dersDakika(Ders d) {
    final sn = dersSaniye(d);
    return sn <= 0 ? 0 : (sn + 59) ~/ 60;
  }

  /// Ünitenin tahmini süresi (dakika).
  static int uniteDakika(Unite u) =>
      (u.dersler.fold<int>(0, (t, d) => t + dersSaniye(d)) + 59) ~/ 60;

  /// Zorluk dağılımı (kolay/orta/zor adet).
  static Map<Zorluk, int> dagilim(Ders d) {
    final m = {for (final z in Zorluk.values) z: 0};
    for (final a in d.alistirmalar) {
      final z = adim(a).zorluk;
      m[z] = m[z]! + 1;
    }
    return m;
  }

  /// Temel kavram: dersin ilk alıştırması (adım 0) her zaman temel adımdır.
  static bool adimTemelMi(int indeks) => indeks == 0;

  /// Temel kavram dersi: dilbilgisi/konu notu olan ders.
  static bool dersTemelMi(Ders d) =>
      d.dilbilgisiNotu?.trim().isNotEmpty ?? false;

  /// Dersin en iyi puanı (yüzde); hiç kaydı yoksa null.
  static int? enIyiPuan(OgrenciDurumu d, String dersId) => d.dersEnIyi[dersId];

  /// Dersin toplam çalışma süresi (saniye).
  static int calismaSaniye(OgrenciDurumu d, String dersId) =>
      d.dersSureSn[dersId] ?? 0;

  /// Ders ustalığı 0..100.
  static int dersUstalik(OgrenciDurumu d, String dersId) {
    final kez = d.tamamlanan[dersId] ?? 0;
    if (kez <= 0) return 0;
    final iyi = d.dersEnIyi[dersId] ?? 0;
    final tekrar = (kez > tekrarTavan ? tekrarTavan : kez) * 100 / tekrarTavan;
    return (0.7 * iyi + 0.3 * tekrar).round().clamp(0, 100);
  }

  /// Ünite ustalığı: derslerin ustalık ortalaması (yuvarlanır).
  static int uniteUstalik(OgrenciDurumu d, Unite u) {
    if (u.dersler.isEmpty) return 0;
    final t = u.dersler.fold<int>(0, (s, x) => s + dersUstalik(d, x.id));
    return (t / u.dersler.length).round();
  }

  /// Ünitenin en iyi puanı: kaydı olan derslerin en iyi puan ortalaması;
  /// kayıt yoksa null.
  static int? uniteEnIyiPuan(OgrenciDurumu d, Unite u) {
    final p = [
      for (final x in u.dersler)
        if (d.dersEnIyi[x.id] != null) d.dersEnIyi[x.id]!,
    ];
    if (p.isEmpty) return null;
    return (p.fold<int>(0, (s, x) => s + x) / p.length).round();
  }

  /// Ünitenin toplam çalışma süresi (saniye).
  static int uniteSaniye(OgrenciDurumu d, Unite u) =>
      u.dersler.fold<int>(0, (s, x) => s + calismaSaniye(d, x.id));

  /// "1 sa 5 dk", "12 dk", "45 sn" gibi kısa süre metni.
  static String sureMetni(int sn) {
    if (sn <= 0) return '0 dk';
    if (sn < 60) return '$sn sn';
    final dk = sn ~/ 60;
    if (dk < 60) return '$dk dk';
    final sa = dk ~/ 60;
    final kalan = dk % 60;
    return kalan == 0 ? '$sa sa' : '$sa sa $kalan dk';
  }
}
