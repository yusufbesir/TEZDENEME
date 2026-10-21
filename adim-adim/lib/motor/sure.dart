/// Süre takibi ve süreli kısa kelime oturumu (ÖZELLİK 59 ve 80). Saf işlevler;
/// durum değiştirenler yeni kopya döndürür.
///
/// Günlük dakika hedefi: `gunlukDakikaHedefi` (0 ise çalışma planındaki günlük
/// dakika, o da yoksa hedef yok). Bugünkü süre `gunlukSureSn`dedir; ders
/// bitişi, mikro ders ve süreli oturum ekler (Motor.sureEkle). Ders ve ünite
/// başına süre zaten `dersSureSn`dedir (DersMeta.calismaSaniye/uniteSaniye);
/// burada yalnız bölüm (kurs > ünite > ders) dökümü derlenir.
///
/// Süreli oturum: 5/10/15 dk, geri sayım; öğrencinin öğrendiği kelimelerden
/// (Pratik.kelimeHavuzu) çoktan seçmeli sorular. KURAL (Pratik ile aynı):
/// oturum kart aralıklarını (SRS), hata defterini, XP'yi ve seriyi
/// DEĞİŞTİRMEZ; yalnız harcanan süre günlük süreye eklenir. Ceza yoktur.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:math' as math;

import '../model/durum.dart';
import '../model/icerik.dart';
import 'ders_meta.dart';
import 'motor.dart';
import 'pratik.dart';

/// Oturum sorusu: [metin] kelimesinin anlamı hangisi?
class SureSorusu {
  const SureSorusu({
    required this.kartId,
    required this.metin,
    required this.secenekler,
    required this.dogru,
  });

  final String kartId;
  final String metin;

  /// 3..4 anlam seçeneği; hepsi birbirinden farklıdır.
  final List<String> secenekler;

  /// Doğru seçeneğin indeksi.
  final int dogru;
}

/// Bir ünitenin süre dökümü: toplam saniye ve süresi olan dersler.
typedef UniteSuresi = ({
  String kursAd,
  Unite unite,
  int saniye,
  List<({Ders ders, int saniye})> dersler,
});

abstract final class Sure {
  /// Süreli oturum uzunlukları (dakika).
  static const List<int> oturumSecenekleri = [5, 10, 15];

  /// Günlük dakika hedefi seçenekleri (0 = kapalı ayrıca sunulur).
  static const List<int> hedefSecenekleri = [5, 10, 15, 20, 30, 45, 60];

  /// Oturum destesi en çok bu kadar kelime; bitince başa döner.
  static const int desteEnCok = 40;

  /// Soru için en az gereken farklı kelime (3 seçenek için).
  static const int enAzKelime = 3;

  /// Bugünkü çalışma süresi (saniye).
  static int bugunSn(OgrenciDurumu d, String bugun) =>
      d.gunlukSureSn[bugun] ?? 0;

  /// Etkin günlük dakika hedefi: elle ayarlanan; yoksa çalışma planındaki
  /// günlük dakika; yoksa 0 (hedef yok).
  static int hedefDk(OgrenciDurumu d) => d.gunlukDakikaHedefi > 0
      ? d.gunlukDakikaHedefi
      : (d.calismaPlani?.gunlukDakika ?? 0);

  /// Bugünkü hedef oranı 0..1 (hedef yoksa 0).
  static double oran(OgrenciDurumu d, String bugun) {
    final h = hedefDk(d);
    if (h <= 0) return 0;
    final o = bugunSn(d, bugun) / (h * 60);
    return o > 1 ? 1 : o;
  }

  /// Bugünkü hedef tutuldu mu? Hedef yoksa false.
  static bool hedefTamam(OgrenciDurumu d, String bugun) {
    final h = hedefDk(d);
    return h > 0 && bugunSn(d, bugun) >= h * 60;
  }

  /// Günlük süreye [sn] saniye ekler (bkz. Motor.sureEkle).
  static OgrenciDurumu ekle(OgrenciDurumu d, String bugun, int sn) =>
      Motor.sureEkle(d, bugun, sn);

  /// Günlük dakika hedefini ayarlar; 0 kapatır (çalışma planı varsa o geçer).
  static OgrenciDurumu hedefAyarla(OgrenciDurumu d, int dk) => d.copyWith(
    gunlukDakikaHedefi: dk.clamp(0, OgrenciDurumu.enCokDakikaHedefi),
  );

  /// "Bugün 12 dk" / "Bugün 45 sn" / "Bugün 0 dk".
  static String bugunMetni(OgrenciDurumu d, String bugun) =>
      'Bugün ${DersMeta.sureMetni(bugunSn(d, bugun))}';

  /// Bugünden geriye [gun] günün süreleri, en eskiden bugüne.
  static List<({String gun, int sn})> sonGunler(
    OgrenciDurumu d,
    String bugun, {
    int gun = 7,
  }) {
    final t = DateTime.tryParse('${bugun}T00:00:00Z');
    if (t == null) return const [];
    String iki(int x) => x.toString().padLeft(2, '0');
    return [
      for (var i = gun - 1; i >= 0; i--)
        () {
          final r = t.subtract(Duration(days: i));
          final g =
              '${r.year.toString().padLeft(4, '0')}-${iki(r.month)}-'
              '${iki(r.day)}';
          return (gun: g, sn: d.gunlukSureSn[g] ?? 0);
        }(),
    ];
  }

  /// Bölüm bazında süre dökümü: [kurslar] içinde süresi olan üniteler (ders
  /// süreleri `dersSureSn`den), kurs ve ünite sırasıyla.
  static List<UniteSuresi> uniteSureleri(OgrenciDurumu d, List<Kurs> kurslar) {
    final sonuc = <UniteSuresi>[];
    for (final k in kurslar) {
      for (final u in k.uniteler) {
        final toplam = DersMeta.uniteSaniye(d, u);
        if (toplam <= 0) continue;
        sonuc.add((
          kursAd: k.ad,
          unite: u,
          saniye: toplam,
          dersler: [
            for (final x in u.dersler)
              if (DersMeta.calismaSaniye(d, x.id) > 0)
                (ders: x, saniye: DersMeta.calismaSaniye(d, x.id)),
          ],
        ));
      }
    }
    return sonuc;
  }

  /// Bir kursun toplam çalışma süresi (saniye).
  static int kursSaniye(OgrenciDurumu d, Kurs k) =>
      k.uniteler.fold<int>(0, (s, u) => s + DersMeta.uniteSaniye(d, u));

  /// Oturum destesi: öğrencinin kelime havuzundan anlamı ve metni tekrarsız
  /// en çok [desteEnCok] kelime, [tohum]'a göre karışık (zayıf kartlar önce).
  /// Farklı anlamlı kelime sayısı [enAzKelime]'den azsa boş liste.
  static List<KelimeCifti> oturumDestesi(
    OgrenciDurumu d,
    List<Kurs> kurslar, {
    int tohum = 0,
  }) {
    final havuz = Pratik.kelimeHavuzu(d, kurslar)..shuffle(math.Random(tohum));
    final metinler = <String>{};
    final anlamlar = <String>{};
    final benzersiz = [
      for (final c in havuz)
        if (metinler.add(c.metin) && anlamlar.add(c.anlam)) c,
    ];
    double yo(KelimeCifti c) => d.kartlar[c.kartId]?.yariOmurGun ?? 1e9;
    final sirali = [
      ...benzersiz.where((c) => yo(c) < Kart.ortaEsik),
      ...benzersiz.where((c) => yo(c) >= Kart.ortaEsik),
    ];
    if (sirali.length < enAzKelime) return const [];
    return sirali.take(desteEnCok).toList();
  }

  /// [deste]nin [sira]. sorusu (deste bitince başa döner): 3 yanlış seçenek
  /// ([deste] 4'ten küçükse mümkün olanı) ve karışık doğru yeri, [tohum]'a
  /// bağlıdır.
  static SureSorusu soru(List<KelimeCifti> deste, int sira, {int tohum = 0}) {
    final c = deste[sira % deste.length];
    final rnd = math.Random(tohum * 7919 + sira);
    final yanlis = [
      for (final x in deste)
        if (x.anlam != c.anlam) x.anlam,
    ]..shuffle(rnd);
    final secenekler = [c.anlam, ...yanlis.take(3)]..shuffle(rnd);
    return SureSorusu(
      kartId: c.kartId,
      metin: c.metin,
      secenekler: secenekler,
      dogru: secenekler.indexOf(c.anlam),
    );
  }
}
