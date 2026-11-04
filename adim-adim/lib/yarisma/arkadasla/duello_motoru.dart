/// "Arkadaşla oyna" iki oyunculu, sıra tabanlı düello kuralları.
/// Saf ve deterministik Dart; Flutter/dart:io'ya bağımlı değildir. Durum değiştirilemezdir (immutable).
/// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım özellikler#cihaz] Claude
/// Yalnız onu yazan yapay zekâ değiştirir; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model.dart';

/// Düellodaki taraf: yerel oyuncu (ben) ya da karşı taraf (rakip).
enum Taraf { ben, rakip }

extension TarafUzanti on Taraf {
  Taraf get tersi => this == Taraf.ben ? Taraf.rakip : Taraf.ben;
}

/// Düello sabitleri.
const int duelloSoruAdedi = 10;
const int dogruPuan = 10;
const int hizliSinirMs = 5000;
const int hizliBonus = 5;
const int ortaSinirMs = 10000;
const int ortaBonus = 2;
const int sureAsimiMs = 15000;

/// Bir cevabın kaydı.
class CevapKaydi {
  const CevapKaydi({
    required this.taraf,
    required this.soruId,
    required this.secenek,
    required this.gecenMs,
    required this.dogru,
    required this.puan,
  });

  final Taraf taraf;
  final String soruId;
  final int secenek;
  final int gecenMs;

  /// Süre aşımı yanlış sayıldığı için aşımda false.
  final bool dogru;
  final int puan;
}

/// Düello sonucu (yerel oyuncu açısından).
enum DuelloSonucu { kazandi, kaybetti, berabere }

/// Cevap uygulama hatası nedenleri.
enum DuelloHatasi {
  bitti,
  bilinmeyenSoru,
  sirasiGelmedi,
  ikinciCevap,
  gecersizSecenek,
  gecersizSure,
}

/// Değiştirilemez düello durumu.
class DuelloDurumu {
  const DuelloDurumu({
    required this.sorular,
    required this.mevcutIndeks,
    required this.sira,
    required this.benimPuan,
    required this.rakipPuan,
    required this.cevaplar,
    required this.ilkSira,
  });

  final List<YarismaSorusu> sorular;

  /// Şu an oynanan sorunun indeksi; bittiyse sorular.length.
  final int mevcutIndeks;

  /// Şu an cevap vermesi beklenen taraf (bittiyse anlamsız).
  final Taraf sira;
  final int benimPuan;
  final int rakipPuan;
  final List<CevapKaydi> cevaplar;

  /// İlk sorunun ilk yanıtlayanı; sonraki sorularda dönüşümlüdür.
  final Taraf ilkSira;

  bool get bitti => mevcutIndeks >= sorular.length;

  YarismaSorusu? get mevcutSoru => bitti ? null : sorular[mevcutIndeks];

  /// Mevcut soruya verilmiş cevap sayısı (0 ya da 1).
  int get mevcutCevapSayisi {
    if (bitti) return 0;
    final id = sorular[mevcutIndeks].id;
    return cevaplar.where((c) => c.soruId == id).length;
  }

  /// [indeks]. sorunun ilk yanıtlayanı.
  Taraf ilkYanitlayan(int indeks) => indeks.isEven ? ilkSira : ilkSira.tersi;
}

/// [cevapUygula] sonucu: ya yeni [durum] ya da [hata].
class CevapSonucu {
  const CevapSonucu.tamam(DuelloDurumu this.durum) : hata = null;
  const CevapSonucu.hata(DuelloHatasi this.hata) : durum = null;

  final DuelloDurumu? durum;
  final DuelloHatasi? hata;

  bool get basarili => durum != null;
}

/// Düelloyu başlatır. Yalnız geçerli sorular kullanılır.
DuelloDurumu duelloBaslat({
  required List<YarismaSorusu> sorular,
  Taraf ilkSira = Taraf.ben,
}) {
  // Geçerli olmayanlar ve tekrar eden kimlikler (ilk görülen kalır) elenir;
  // aksi halde cevap sayımı kimlikle yapıldığından sıra bozulurdu.
  final gorulen = <String>{};
  final temiz = List<YarismaSorusu>.unmodifiable(
    sorular.where((s) => s.gecerliMi && gorulen.add(s.id)),
  );
  return DuelloDurumu(
    sorular: temiz,
    mevcutIndeks: 0,
    sira: ilkSira,
    benimPuan: 0,
    rakipPuan: 0,
    cevaplar: const [],
    ilkSira: ilkSira,
  );
}

/// Bir cevabın puanı: doğru 10 + hız bonusu; yanlış ya da süre aşımı 0.
int cevapPuani({required bool dogru, required int gecenMs}) {
  if (!dogru || gecenMs > sureAsimiMs) return 0;
  if (gecenMs <= hizliSinirMs) return dogruPuan + hizliBonus;
  if (gecenMs <= ortaSinirMs) return dogruPuan + ortaBonus;
  return dogruPuan;
}

/// [taraf]'ın cevabını uygular; kural ihlalinde durum DEĞİŞMEZ, hata döner.
CevapSonucu cevapUygula(
  DuelloDurumu durum,
  Taraf taraf,
  String soruId,
  int secenek,
  int gecenMs,
) {
  if (durum.bitti) return const CevapSonucu.hata(DuelloHatasi.bitti);
  if (secenek < 0 || secenek > 3) {
    return const CevapSonucu.hata(DuelloHatasi.gecersizSecenek);
  }
  if (gecenMs < 0) return const CevapSonucu.hata(DuelloHatasi.gecersizSure);

  final soru = durum.sorular[durum.mevcutIndeks];
  if (soruId != soru.id) {
    if (!durum.sorular.any((s) => s.id == soruId)) {
      return const CevapSonucu.hata(DuelloHatasi.bilinmeyenSoru);
    }
    // Ya zaten cevaplanmış eski soru ya da sırası gelmemiş ileri soru.
    final eski = durum.cevaplar.any(
      (c) => c.soruId == soruId && c.taraf == taraf,
    );
    return CevapSonucu.hata(
      eski ? DuelloHatasi.ikinciCevap : DuelloHatasi.sirasiGelmedi,
    );
  }
  if (durum.cevaplar.any((c) => c.soruId == soruId && c.taraf == taraf)) {
    return const CevapSonucu.hata(DuelloHatasi.ikinciCevap);
  }
  if (taraf != durum.sira) {
    return const CevapSonucu.hata(DuelloHatasi.sirasiGelmedi);
  }

  final suresiIcinde = gecenMs <= sureAsimiMs;
  final dogru = secenek == soru.dogru && suresiIcinde;
  final puan = cevapPuani(dogru: dogru, gecenMs: gecenMs);
  final kayit = CevapKaydi(
    taraf: taraf,
    soruId: soruId,
    secenek: secenek,
    gecenMs: gecenMs,
    dogru: dogru,
    puan: puan,
  );
  final yeniCevaplar = List<CevapKaydi>.unmodifiable([
    ...durum.cevaplar,
    kayit,
  ]);
  final ben = durum.benimPuan + (taraf == Taraf.ben ? puan : 0);
  final rakip = durum.rakipPuan + (taraf == Taraf.rakip ? puan : 0);

  final ikinciVerdi = durum.mevcutCevapSayisi == 1;
  final yeniIndeks = ikinciVerdi ? durum.mevcutIndeks + 1 : durum.mevcutIndeks;
  final yeniSira = ikinciVerdi ? durum.ilkYanitlayan(yeniIndeks) : taraf.tersi;

  return CevapSonucu.tamam(
    DuelloDurumu(
      sorular: durum.sorular,
      mevcutIndeks: yeniIndeks,
      sira: yeniSira,
      benimPuan: ben,
      rakipPuan: rakip,
      cevaplar: yeniCevaplar,
      ilkSira: durum.ilkSira,
    ),
  );
}

/// Sonucu hesaplar; oyun bitmediyse null.
DuelloSonucu? sonucHesapla(DuelloDurumu durum) {
  if (!durum.bitti) return null;
  if (durum.benimPuan > durum.rakipPuan) return DuelloSonucu.kazandi;
  if (durum.benimPuan < durum.rakipPuan) return DuelloSonucu.kaybetti;
  return DuelloSonucu.berabere;
}

/// Havuzdan [adet] soruyu seçer. Aynı soru kümesi ve aynı [tohum] iki cihazda
/// aynı diziyi üretir (havuz önce id'ye göre sıralanır; xorshift32 ile karıştırılır).
List<YarismaSorusu> duelloSorulariSec(
  List<YarismaSorusu> havuz,
  int tohum, {
  int adet = duelloSoruAdedi,
}) {
  final gorulen = <String>{};
  final gecerli = havuz.where((s) => s.gecerliMi && gorulen.add(s.id)).toList()
    ..sort((a, b) => a.id.compareTo(b.id));
  var x = ((tohum & 0xFFFFFFFF) ^ 0x9E3779B9) & 0xFFFFFFFF;
  if (x == 0) x = 1;
  int sonraki() {
    x ^= (x << 13) & 0xFFFFFFFF;
    x ^= x >> 17;
    x ^= (x << 5) & 0xFFFFFFFF;
    return x;
  }

  for (var i = gecerli.length - 1; i > 0; i--) {
    final j = sonraki() % (i + 1);
    final gecici = gecerli[i];
    gecerli[i] = gecerli[j];
    gecerli[j] = gecici;
  }
  final n = adet < 0 ? 0 : (adet > gecerli.length ? gecerli.length : adet);
  return List<YarismaSorusu>.unmodifiable(gecerli.take(n));
}
