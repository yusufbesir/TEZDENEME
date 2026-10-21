/// Satranç modülünün durum mantığı (ÖZELLİK 47, 52-57). Saf işlevler: yeni
/// [OgrenciDurumu] kopyası döndürür. Hamle kuralları `lib/satranc/` altındadır.
///
/// KURAL (ayrı deste): satranç tekrar destesi (yanlış çözülen bulmacalar ve
/// ustalık kursu) `OgrenciDurumu.kartlar`'dan AYRIDIR; aynı yarı ömür kuralıyla
/// ([Motor.kartHesapla]) güncellenir ama Tekrar sekmesindeki kartların
/// aralıklarını, hata defterini, XP'yi ve seriyi DEĞİŞTİRMEZ. Çevrimdışı ve
/// cezasızdır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/durum.dart';
import '../model/icerik.dart';
import '../model/satranc_durumu.dart';
import '../satranc/veri.dart';
import 'motor.dart';

/// Ders sonu tahta meydan okumasında bir konum: dersteki [indeks]. alıştırma.
typedef DersKonumu = ({int indeks, Hamle alistirma});

/// Ustalık kursunda sırası gelen ders.
typedef UstalikDersi = ({Ders ders, String kursAdi, bool yeni});

abstract final class SatrancCalisma {
  /// Ders sonu meydan okumasındaki en çok konum sayısı.
  static const int dersMeydanEnCok = 3;

  /// Bu yarı ömrün (gün) üstüne çıkan (doğru cevapla) tekrar kartı "öğrenildi"
  /// sayılıp desteden çıkar (kutu 5).
  static const double ogrenildiYariOmur = 16;

  /// FNV-1a: süreçler arası kararlı tohum.
  static int tohum(String metin) {
    var h = 0x811c9dc5;
    for (final c in metin.codeUnits) {
      h = ((h ^ c) * 0x01000193) & 0x7fffffff;
    }
    return h;
  }

  // --- Günlük bulmaca (47) --------------------------------------------

  /// O günün bulmacası: tarihe göre deterministik, bütün bulmaca havuzundan.
  static SatrancBulmaca gunlukBulmaca(String gun) =>
      SatrancVeri.bulmacalar[tohum('gunluk:$gun') %
          SatrancVeri.bulmacalar.length];

  /// Bugünkü bulmaca cevaplanmış mı ve sonucu (null: henüz cevaplanmadı).
  static bool? gunlukSonuc(OgrenciDurumu d, String gun) =>
      d.satranc.gunlukBulmaca[gun];

  /// Günlük bulmacanın İLK sonucunu kaydeder (aynı gün ikinci kez durum
  /// değiştirmez). Yanlışsa bulmaca tekrar destesine de girer.
  static OgrenciDurumu gunlukBitir(OgrenciDurumu d, String gun, bool dogru) {
    if (!OgrenciDurumu.gunGecerli(gun) ||
        d.satranc.gunlukBulmaca.containsKey(gun)) {
      return d;
    }
    final b = gunlukBulmaca(gun);
    final s = d.satranc;
    var yeni = d.copyWith(
      satranc: s.copyWith(gunlukBulmaca: {...s.gunlukBulmaca, gun: dogru}),
    );
    yeni = bulmacaSonucu(yeni, b.id, dogru, gun);
    return yeni;
  }

  // --- Tema bulmacaları ve tekrar destesi (52) ------------------------

  /// Tema bulmacasının sonucu (ilk deneme): doğruysa "çözüldü" işaretlenir;
  /// yanlışsa tekrar destesine girer (yarı ömür /2, ertesi gün); destedeki
  /// bir bulmaca doğru çözülürse yarı ömrü x2 olur ve [ogrenildiYariOmur]'e
  /// ulaşınca desteden çıkar.
  static OgrenciDurumu bulmacaSonucu(
    OgrenciDurumu d,
    String bulmacaId,
    bool dogru,
    String bugun,
  ) {
    if (SatrancVeri.bulmacaBul(bulmacaId) == null) return d;
    final s = d.satranc;
    final cozulen = dogru
        ? {...s.cozulenBulmacalar, bulmacaId}
        : s.cozulenBulmacalar;
    final anahtar = '${SatrancDurumu.bulmacaOnek}$bulmacaId';
    final kartlar = {...s.tekrarKartlari};
    final mevcut = kartlar[anahtar];
    if (!dogru) {
      kartlar[anahtar] = Motor.kartHesapla(mevcut, false, bugun);
    } else if (mevcut != null) {
      final yeni = Motor.kartHesapla(mevcut, true, bugun);
      if (yeni.yariOmurGun >= ogrenildiYariOmur) {
        kartlar.remove(anahtar);
      } else {
        kartlar[anahtar] = yeni;
      }
    }
    return d.copyWith(
      satranc: s.copyWith(
        cozulenBulmacalar: cozulen,
        tekrarKartlari: _kes(kartlar),
      ),
    );
  }

  /// Tekrar destesi sınırı: en geç tekrar günü olanlar korunur.
  static Map<String, Kart> _kes(Map<String, Kart> kartlar) {
    if (kartlar.length <= SatrancDurumu.kartEnCok) return kartlar;
    final sirali = kartlar.entries.toList()
      ..sort((a, b) => b.value.sonraki.compareTo(a.value.sonraki));
    return {
      for (final e in sirali.take(SatrancDurumu.kartEnCok)) e.key: e.value,
    };
  }

  /// Bugün tekrarı gelen yanlış bulmacaların kimlikleri (en eski vade önce).
  static List<String> bekleyenBulmacalar(OgrenciDurumu d, String bugun) {
    final liste =
        d.satranc.tekrarKartlari.entries
            .where(
              (e) =>
                  e.key.startsWith(SatrancDurumu.bulmacaOnek) &&
                  e.value.sonraki.compareTo(bugun) <= 0,
            )
            .toList()
          ..sort((x, y) {
            final c = x.value.sonraki.compareTo(y.value.sonraki);
            return c != 0 ? c : x.key.compareTo(y.key);
          });
    return [
      for (final e in liste)
        if (SatrancVeri.bulmacaBul(
              e.key.substring(SatrancDurumu.bulmacaOnek.length),
            ) !=
            null)
          e.key.substring(SatrancDurumu.bulmacaOnek.length),
    ];
  }

  /// Destedeki (yanlış çözülmüş) bulmaca sayısı.
  static int desteBulmacaSayisi(OgrenciDurumu d) => d
      .satranc
      .tekrarKartlari
      .keys
      .where((k) => k.startsWith(SatrancDurumu.bulmacaOnek))
      .length;

  // --- Mini maç (47) --------------------------------------------------

  /// Biten mini maçı kaydeder (sayaç + son oyun). Bozuk sonuç yok sayılır.
  static OgrenciDurumu macBitir(OgrenciDurumu d, SatrancMaci mac) {
    if (!SatrancMaci.sonuclar.contains(mac.sonuc)) return d;
    final s = d.satranc;
    final hamleler = mac.hamleler.length > SatrancMaci.enCokHamle
        ? mac.hamleler.sublist(0, SatrancMaci.enCokHamle)
        : mac.hamleler;
    return d.copyWith(
      satranc: s.copyWith(
        macSayilari: {
          ...s.macSayilari,
          mac.sonuc: (s.macSayilari[mac.sonuc] ?? 0) + 1,
        },
        sonMac: SatrancMaci(
          konumId: mac.konumId,
          fen: mac.fen,
          hamleler: List.unmodifiable(hamleler),
          sonuc: mac.sonuc,
          gun: mac.gun,
          kullaniciBeyaz: mac.kullaniciBeyaz,
        ),
      ),
    );
  }

  // --- Oyun sonu antrenörü (53) ---------------------------------------

  /// Meydan okuma yıldızı: en az hamleye eşit/altı 3, +2'ye kadar 2, aksi 1.
  static int yildiz(int enAz, int hamle) {
    if (hamle <= enAz) return 3;
    if (hamle <= enAz + 2) return 2;
    return 1;
  }

  /// Pratik modunda matla bitirilen konumu kaydeder.
  static OgrenciDurumu oyunSonuPratikBitir(OgrenciDurumu d, String id) {
    if (SatrancVeri.oyunSonuBul(id) == null) return d;
    final s = d.satranc;
    if (s.oyunSonuPratik.contains(id)) return d;
    return d.copyWith(
      satranc: s.copyWith(oyunSonuPratik: {...s.oyunSonuPratik, id}),
    );
  }

  /// Meydan okuma: mat edildiyse en az hamle (yalnız daha iyiyse) kaydedilir.
  static OgrenciDurumu oyunSonuMeydanBitir(
    OgrenciDurumu d,
    String id,
    int hamle,
  ) {
    if (SatrancVeri.oyunSonuBul(id) == null || hamle < 1) return d;
    final s = d.satranc;
    final eski = s.oyunSonuEnIyi[id];
    if (eski != null && eski <= hamle) return d;
    return d.copyWith(
      satranc: s.copyWith(oyunSonuEnIyi: {...s.oyunSonuEnIyi, id: hamle}),
    );
  }

  // --- Koordinat antrenörü (54) ---------------------------------------

  /// 30 sn'lik turun skorunu kaydeder (yalnız daha iyiyse).
  static OgrenciDurumu koordinatBitir(OgrenciDurumu d, String mod, int puan) {
    if (!KoordinatModu.gecerli(mod) || puan < 0) return d;
    final s = d.satranc;
    final eski = s.koordinatEnIyi[mod];
    if (eski != null && eski >= puan) return d;
    return d.copyWith(
      satranc: s.copyWith(koordinatEnIyi: {...s.koordinatEnIyi, mod: puan}),
    );
  }

  // --- Solo (57) --------------------------------------------------------

  static OgrenciDurumu soloBitir(OgrenciDurumu d, String id) {
    if (SatrancVeri.soloBul(id) == null) return d;
    final s = d.satranc;
    if (s.soloCozulen.contains(id)) return d;
    return d.copyWith(satranc: s.copyWith(soloCozulen: {...s.soloCozulen, id}));
  }

  // --- Kendi analizin (55) ----------------------------------------------

  /// Bit değeri: 1 hamle doğru, 2 gerekçe doğru. En iyi sonuç bit olarak
  /// korunur (bit birleşimi); düşmez.
  static int analizBitleri(bool hamleDogru, bool gerekceDogru) =>
      (hamleDogru ? 1 : 0) | (gerekceDogru ? 2 : 0);

  static OgrenciDurumu analizBitir(
    OgrenciDurumu d,
    String id,
    bool hamleDogru,
    bool gerekceDogru,
  ) {
    if (SatrancVeri.analizBul(id) == null) return d;
    final s = d.satranc;
    final yeni =
        (s.analizler[id] ?? 0) | analizBitleri(hamleDogru, gerekceDogru);
    if (yeni == (s.analizler[id] ?? -1)) return d;
    return d.copyWith(
      satranc: s.copyWith(analizler: {...s.analizler, id: yeni}),
    );
  }

  // --- Ders sonu meydan okuması ve ustalık kursu (56) --------------------

  /// Satranç (oyun alanı) kurslarından, bu ders için meydan okuma konumları:
  /// dersin Hamle alıştırmalarından en çok [dersMeydanEnCok], sondan başlayarak
  /// (derse en yeni öğrenilenler), özgün sırada.
  static List<DersKonumu> dersKonumlari(Ders ders) {
    final hepsi = <DersKonumu>[
      for (var i = 0; i < ders.alistirmalar.length; i++)
        if (ders.alistirmalar[i] is Hamle)
          (indeks: i, alistirma: ders.alistirmalar[i] as Hamle),
    ];
    final son = hepsi.length > dersMeydanEnCok
        ? hepsi.sublist(hepsi.length - dersMeydanEnCok)
        : hepsi;
    return son;
  }

  /// Bu ders ders sonu meydan okuması sunar mı (oyun alanı kursu ve en az bir
  /// tahta konumu)?
  static bool dersMeydanVar(List<Kurs> kurslar, String dersId) {
    for (final k in kurslar) {
      final d = k.dersBul(dersId);
      if (d != null) {
        return k.alan == KursAlani.oyun && dersKonumlari(d).isNotEmpty;
      }
    }
    return false;
  }

  /// Ders sonu meydan okuması bitişi: en iyi doğru sayısı saklanır (düşmez).
  /// Ders ustalık destesine de girer: hepsi doğruysa yarı ömür x2, değilse /2.
  static OgrenciDurumu dersMeydanBitir(
    OgrenciDurumu d,
    String dersId,
    int dogru,
    int toplam,
    String bugun,
  ) {
    if (!SatrancDurumu.kimlikGecerli(dersId) || toplam < 1) return d;
    final s = d.satranc;
    final dg = dogru < 0 ? 0 : (dogru > toplam ? toplam : dogru);
    final eski = s.dersMeydan[dersId] ?? 0;
    final anahtar = '${SatrancDurumu.ustalikOnek}$dersId';
    final kartlar = {...s.tekrarKartlari};
    kartlar[anahtar] = Motor.kartHesapla(kartlar[anahtar], dg == toplam, bugun);
    return d.copyWith(
      satranc: s.copyWith(
        dersMeydan: {...s.dersMeydan, dersId: dg > eski ? dg : eski},
        tekrarKartlari: _kes(kartlar),
      ),
    );
  }

  /// Ustalık kursu: bitirilmiş satranç derslerinden sırası gelenler (kartı
  /// yok = yeni, ya da vadesi bugün/geçmiş). Kurs ve ders sırasıyla.
  static List<UstalikDersi> ustalikDersleri(
    OgrenciDurumu d,
    List<Kurs> kurslar,
    String bugun,
  ) {
    final sonuc = <UstalikDersi>[];
    for (final k in kurslar) {
      if (k.alan != KursAlani.oyun) continue;
      for (final ders in k.tumDersler) {
        if (!Motor.dersBitmis(d, ders.id)) continue;
        if (dersKonumlari(ders).isEmpty) continue;
        final kart =
            d.satranc.tekrarKartlari['${SatrancDurumu.ustalikOnek}${ders.id}'];
        if (kart == null) {
          sonuc.add((ders: ders, kursAdi: k.ad, yeni: true));
        } else if (kart.sonraki.compareTo(bugun) <= 0) {
          sonuc.add((ders: ders, kursAdi: k.ad, yeni: false));
        }
      }
    }
    return sonuc;
  }

  /// Ustalık sorusu: dersin konumlarından, güne ve derse göre dönen biri.
  static DersKonumu ustalikKonumu(Ders ders, String bugun) {
    final liste = dersKonumlari(ders);
    return liste[tohum('${ders.id}:$bugun') % liste.length];
  }

  /// Ustalık sonucu: kart yarı ömrü güncellenir (doğru x2, yanlış /2).
  static OgrenciDurumu ustalikSonucu(
    OgrenciDurumu d,
    String dersId,
    bool dogru,
    String bugun,
  ) {
    if (!SatrancDurumu.kimlikGecerli(dersId)) return d;
    final s = d.satranc;
    final anahtar = '${SatrancDurumu.ustalikOnek}$dersId';
    final kartlar = {...s.tekrarKartlari};
    kartlar[anahtar] = Motor.kartHesapla(kartlar[anahtar], dogru, bugun);
    return d.copyWith(satranc: s.copyWith(tekrarKartlari: _kes(kartlar)));
  }
}

/// Koordinat antrenörü modu denetimi.
abstract final class KoordinatModu {
  static bool gecerli(String m) => m == 'dokun' || m == 'yaz';
}
