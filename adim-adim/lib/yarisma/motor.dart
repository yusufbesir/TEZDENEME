/// Yarışma motoru: saf Dart, yan etkisiz oyun durumu ve geçişler (taç koşusu).
/// Her geçiş yeni bir [YarismaOyunu] döndürür; eski durum değişmez.
/// Rastgelelik [Random] ile enjekte edilir; sabit tohumla deterministiktir.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:math';

import 'model.dart';

/// Oyunun hangi adımda olduğu.
enum YarismaAsama {
  /// Çarkın çevrilmesi bekleniyor.
  carkBekliyor,

  /// Kategori sorusu cevap bekliyor.
  soruda,

  /// Oyuncu, henüz almadığı bir kategoriyi taç sorusu için seçecek.
  tacKategoriSec,

  /// Taç sorusu cevap bekliyor.
  tacSorusunda,

  /// 6 taç toplandı.
  kazandi,

  /// Can kalmadı.
  bitti,
}

/// Oyuncunun kalan güçlendiricileri (her biri oyun başına bir adet).
class Guclendiriciler {
  const Guclendiriciler({
    this.bomba = true,
    this.ciftSans = true,
    this.ekstraSure = true,
    this.gec = true,
  });

  final bool bomba;
  final bool ciftSans;
  final bool ekstraSure;
  final bool gec;

  Guclendiriciler copyWith({
    bool? bomba,
    bool? ciftSans,
    bool? ekstraSure,
    bool? gec,
  }) => Guclendiriciler(
    bomba: bomba ?? this.bomba,
    ciftSans: ciftSans ?? this.ciftSans,
    ekstraSure: ekstraSure ?? this.ekstraSure,
    gec: gec ?? this.gec,
  );
}

/// Oyun sonu özeti.
class YarismaSonucu {
  const YarismaSonucu({
    required this.puan,
    required this.tacSayisi,
    required this.dogru,
    required this.yanlis,
    required this.kategoriDogru,
    required this.kategoriYanlis,
    required this.yanlisBilinenler,
    required this.kazandiMi,
  });

  final int puan;
  final int tacSayisi;
  final int dogru;
  final int yanlis;
  final Map<YarismaKategori, int> kategoriDogru;
  final Map<YarismaKategori, int> kategoriYanlis;

  /// Yanlış bilinen sorular; arayüz açıklamalarını ("öğrenmek için") gösterir.
  final List<YarismaSorusu> yanlisBilinenler;
  final bool kazandiMi;

  /// 0..1 arası doğru oranı; hiç cevap yoksa 0.
  double get dogruOrani {
    final toplam = dogru + yanlis;
    return toplam == 0 ? 0 : dogru / toplam;
  }
}

/// Değiştirilemez oyun durumu.
class YarismaOyunu {
  YarismaOyunu({
    required List<YarismaSorusu> sorular,
    this.can = YarismaMotoru.baslangicCan,
    this.puan = 0,
    this.ardisik = 0,
    Set<YarismaKategori> taclar = const {},
    Set<String> kullanilanSoruIdler = const {},
    this.asama = YarismaAsama.carkBekliyor,
    this.mevcutSoru,
    this.mevcutKategori,
    this.guclendiriciler = const Guclendiriciler(),
    this.buSorudaGucKullanildi = false,
    Set<int> silinenSikler = const {},
    this.ciftSansAktif = false,
    this.sureSaniye = YarismaMotoru.varsayilanSure,
    List<({String soruId, bool dogru})> cevapGecmisi = const [],
  }) : sorular = List.unmodifiable(sorular),
       taclar = Set.unmodifiable(taclar),
       kullanilanSoruIdler = Set.unmodifiable(kullanilanSoruIdler),
       silinenSikler = Set.unmodifiable(silinenSikler),
       cevapGecmisi = List.unmodifiable(cevapGecmisi);

  /// Oyunun soru havuzu.
  final List<YarismaSorusu> sorular;
  final int can;
  final int puan;

  /// Üst üste doğru sayısı (0..3).
  final int ardisik;
  final Set<YarismaKategori> taclar;
  final Set<String> kullanilanSoruIdler;
  final YarismaAsama asama;
  final YarismaSorusu? mevcutSoru;
  final YarismaKategori? mevcutKategori;
  final Guclendiriciler guclendiriciler;
  final bool buSorudaGucKullanildi;
  final Set<int> silinenSikler;
  final bool ciftSansAktif;
  final int sureSaniye;

  /// Kesinleşen cevaplar (çift şansla kurtarılan yanlışlar sayılmaz).
  final List<({String soruId, bool dogru})> cevapGecmisi;

  /// Oyun bittiyse (kazanıldı ya da can bitti) true.
  bool get bittiMi =>
      asama == YarismaAsama.kazandi || asama == YarismaAsama.bitti;

  /// Oyun özeti.
  YarismaSonucu get sonuc {
    final kimlikten = {for (final s in sorular) s.id: s};
    final kDogru = <YarismaKategori, int>{
      for (final k in YarismaKategori.values) k: 0,
    };
    final kYanlis = <YarismaKategori, int>{
      for (final k in YarismaKategori.values) k: 0,
    };
    var dogru = 0;
    var yanlis = 0;
    final yanlisSorular = <YarismaSorusu>[];
    for (final c in cevapGecmisi) {
      final soru = kimlikten[c.soruId];
      if (soru == null) continue;
      if (c.dogru) {
        dogru++;
        kDogru[soru.kategori] = kDogru[soru.kategori]! + 1;
      } else {
        yanlis++;
        kYanlis[soru.kategori] = kYanlis[soru.kategori]! + 1;
        yanlisSorular.add(soru);
      }
    }
    return YarismaSonucu(
      puan: puan,
      tacSayisi: taclar.length,
      dogru: dogru,
      yanlis: yanlis,
      kategoriDogru: Map.unmodifiable(kDogru),
      kategoriYanlis: Map.unmodifiable(kYanlis),
      yanlisBilinenler: List.unmodifiable(yanlisSorular),
      kazandiMi: asama == YarismaAsama.kazandi,
    );
  }

  YarismaOyunu copyWith({
    int? can,
    int? puan,
    int? ardisik,
    Set<YarismaKategori>? taclar,
    Set<String>? kullanilanSoruIdler,
    YarismaAsama? asama,
    YarismaSorusu? mevcutSoru,
    YarismaKategori? mevcutKategori,
    Guclendiriciler? guclendiriciler,
    bool? buSorudaGucKullanildi,
    Set<int>? silinenSikler,
    bool? ciftSansAktif,
    int? sureSaniye,
    List<({String soruId, bool dogru})>? cevapGecmisi,
  }) => YarismaOyunu(
    sorular: sorular,
    can: can ?? this.can,
    puan: puan ?? this.puan,
    ardisik: ardisik ?? this.ardisik,
    taclar: taclar ?? this.taclar,
    kullanilanSoruIdler: kullanilanSoruIdler ?? this.kullanilanSoruIdler,
    asama: asama ?? this.asama,
    mevcutSoru: mevcutSoru ?? this.mevcutSoru,
    mevcutKategori: mevcutKategori ?? this.mevcutKategori,
    guclendiriciler: guclendiriciler ?? this.guclendiriciler,
    buSorudaGucKullanildi: buSorudaGucKullanildi ?? this.buSorudaGucKullanildi,
    silinenSikler: silinenSikler ?? this.silinenSikler,
    ciftSansAktif: ciftSansAktif ?? this.ciftSansAktif,
    sureSaniye: sureSaniye ?? this.sureSaniye,
    cevapGecmisi: cevapGecmisi ?? this.cevapGecmisi,
  );
}

/// Oyun kurallarını uygulayan saf motor. Durum tutmaz; yalnızca [Random] taşır.
class YarismaMotoru {
  YarismaMotoru({Random? rastgele, int? tohum})
    : _rastgele = rastgele ?? Random(tohum);

  static const int baslangicCan = 3;
  static const int varsayilanSure = 20;
  static const int ekstraSureSaniye = 15;
  static const int dogruPuani = 10;
  static const int tacPuani = 50;
  static const int ardisikHedefi = 3;

  /// Çark dilim sayısı: 6 kategori + 1 taç. İndeks 6 = taç.
  static const int dilimSayisi = 7;
  static const int tacDilimi = 6;

  Random _rastgele;

  /// Yeni oyun başlatır. `tohum` verilirse rastgelelik o tohumla yeniden kurulur.
  /// Her kategoride en az bir soru yoksa [ArgumentError] fırlatır.
  YarismaOyunu basla(List<YarismaSorusu> sorular, {int? tohum}) {
    if (tohum != null) _rastgele = Random(tohum);
    for (final k in YarismaKategori.values) {
      if (!sorular.any((s) => s.kategori == k)) {
        throw ArgumentError.value(
          sorular,
          'sorular',
          '${k.ad} kategorisinde soru yok',
        );
      }
    }
    return YarismaOyunu(sorular: sorular);
  }

  /// Çarkı çevirir. `dilim` 0..5 kategori, 6 taç; geçersiz aşamada -1 ve aynı oyun.
  ({YarismaOyunu oyun, int dilim}) carkCevir(YarismaOyunu o) {
    if (o.asama != YarismaAsama.carkBekliyor) return (oyun: o, dilim: -1);
    final dilim = _rastgele.nextInt(dilimSayisi);
    if (dilim == tacDilimi) {
      return (
        oyun: o.copyWith(
          asama: YarismaAsama.tacKategoriSec,
          silinenSikler: const {},
          ciftSansAktif: false,
        ),
        dilim: dilim,
      );
    }
    final kategori = YarismaKategori.values[dilim];
    return (oyun: _soruyaGec(o, kategori, YarismaAsama.soruda), dilim: dilim);
  }

  /// Şıkkı cevaplar. Geçersiz aşama, aralık dışı ya da silinmiş şık: durum aynen döner.
  YarismaOyunu cevapla(YarismaOyunu o, int sik) {
    final soru = o.mevcutSoru;
    final tacMi = o.asama == YarismaAsama.tacSorusunda;
    if (!tacMi && o.asama != YarismaAsama.soruda) return o;
    if (soru == null || sik < 0 || sik > 3 || o.silinenSikler.contains(sik)) {
      return o;
    }
    if (sik == soru.dogru) return _dogru(o, soru, tacMi);
    if (o.ciftSansAktif) {
      // Çift şans: yanlış sayılmaz, şık elenir, soru sürer.
      return o.copyWith(
        ciftSansAktif: false,
        silinenSikler: {...o.silinenSikler, sik},
      );
    }
    return _yanlis(o, soru, tacMi);
  }

  /// Süre doldu: yanlış cevap gibi işler; çift şans burada kurtarmaz.
  YarismaOyunu sureBitti(YarismaOyunu o) {
    final soru = o.mevcutSoru;
    final tacMi = o.asama == YarismaAsama.tacSorusunda;
    if (!tacMi && o.asama != YarismaAsama.soruda) return o;
    if (soru == null) return o;
    return _yanlis(o, soru, tacMi);
  }

  /// Taç sorusu için henüz alınmamış bir kategori seçer.
  YarismaOyunu tacKategoriSec(YarismaOyunu o, YarismaKategori k) {
    if (o.asama != YarismaAsama.tacKategoriSec || o.taclar.contains(k)) {
      return o;
    }
    return _soruyaGec(o, k, YarismaAsama.tacSorusunda);
  }

  /// Bomba: doğru olmayan iki şıkkı rastgele siler.
  YarismaOyunu bombaKullan(YarismaOyunu o) {
    if (!_gucKullanilabilir(o) || !o.guclendiriciler.bomba) return o;
    final soru = o.mevcutSoru!;
    final adaylar = [
      for (var i = 0; i < 4; i++)
        if (i != soru.dogru && !o.silinenSikler.contains(i)) i,
    ]..shuffle(_rastgele);
    return o.copyWith(
      silinenSikler: {...o.silinenSikler, ...adaylar.take(2)},
      guclendiriciler: o.guclendiriciler.copyWith(bomba: false),
      buSorudaGucKullanildi: true,
    );
  }

  /// Çift şans: bu soruda bir yanlış cevap kurtarılır.
  YarismaOyunu ciftSansKullan(YarismaOyunu o) {
    if (!_gucKullanilabilir(o) || !o.guclendiriciler.ciftSans) return o;
    return o.copyWith(
      ciftSansAktif: true,
      guclendiriciler: o.guclendiriciler.copyWith(ciftSans: false),
      buSorudaGucKullanildi: true,
    );
  }

  /// Ekstra süre: +15 saniye.
  YarismaOyunu ekstraSureKullan(YarismaOyunu o) {
    if (!_gucKullanilabilir(o) || !o.guclendiriciler.ekstraSure) return o;
    return o.copyWith(
      sureSaniye: o.sureSaniye + ekstraSureSaniye,
      guclendiriciler: o.guclendiriciler.copyWith(ekstraSure: false),
      buSorudaGucKullanildi: true,
    );
  }

  /// Geç: aynı kategoriden başka bir soruya geçer. Başka soru yoksa durum aynen döner.
  YarismaOyunu gecKullan(YarismaOyunu o) {
    if (!_gucKullanilabilir(o) || !o.guclendiriciler.gec) return o;
    final yeni = _soruyaGec(
      o,
      o.mevcutKategori!,
      o.asama,
      haric: o.mevcutSoru!.id,
    );
    if (identical(yeni, o)) return o;
    return yeni.copyWith(
      guclendiriciler: o.guclendiriciler.copyWith(gec: false),
      buSorudaGucKullanildi: true,
    );
  }

  /// Oyun sonu XP'si: puan ÷ 5, en az 5.
  static int xpHesapla(int puan) => max(5, puan ~/ 5);

  // --- iç yardımcılar ---

  bool _gucKullanilabilir(YarismaOyunu o) =>
      (o.asama == YarismaAsama.soruda ||
          o.asama == YarismaAsama.tacSorusunda) &&
      o.mevcutSoru != null &&
      o.mevcutKategori != null &&
      !o.buSorudaGucKullanildi;

  /// Kategoriden kullanılmamış rastgele soru seçer; havuz bittiyse o kategorinin
  /// kullanılanlarını sıfırlar. `haric` soru (ve yeni soru tek ise) seçilmez.
  /// Seçilecek soru yoksa `o` aynen döner.
  YarismaOyunu _soruyaGec(
    YarismaOyunu o,
    YarismaKategori k,
    YarismaAsama asama, {
    String? haric,
  }) {
    final havuz = [
      for (final s in o.sorular)
        if (s.kategori == k && s.id != haric) s,
    ];
    if (havuz.isEmpty) return o;
    var kullanilan = {...o.kullanilanSoruIdler};
    var adaylar = [
      for (final s in havuz)
        if (!kullanilan.contains(s.id)) s,
    ];
    if (adaylar.isEmpty) {
      // Havuz bitti: yalnızca bu kategorinin kayıtları sıfırlanır.
      kullanilan.removeAll([
        for (final s in o.sorular)
          if (s.kategori == k) s.id,
      ]);
      adaylar = havuz;
    }
    final secilen = adaylar[_rastgele.nextInt(adaylar.length)];
    kullanilan.add(secilen.id);
    if (haric != null) kullanilan.add(haric);
    return o.copyWith(
      asama: asama,
      mevcutSoru: secilen,
      mevcutKategori: k,
      kullanilanSoruIdler: kullanilan,
      buSorudaGucKullanildi: false,
      silinenSikler: const {},
      ciftSansAktif: false,
      sureSaniye: varsayilanSure,
    );
  }

  YarismaOyunu _dogru(YarismaOyunu o, YarismaSorusu soru, bool tacMi) {
    final gecmis = [...o.cevapGecmisi, (soruId: soru.id, dogru: true)];
    if (tacMi) {
      final taclar = {...o.taclar, soru.kategori};
      return o.copyWith(
        puan: o.puan + tacPuani,
        ardisik: 0,
        taclar: taclar,
        asama: taclar.length >= YarismaKategori.values.length
            ? YarismaAsama.kazandi
            : YarismaAsama.carkBekliyor,
        ciftSansAktif: false,
        cevapGecmisi: gecmis,
      );
    }
    final ardisik = min(o.ardisik + 1, ardisikHedefi);
    return o.copyWith(
      puan: o.puan + dogruPuani,
      ardisik: ardisik,
      asama: ardisik >= ardisikHedefi
          ? YarismaAsama.tacKategoriSec
          : YarismaAsama.carkBekliyor,
      ciftSansAktif: false,
      cevapGecmisi: gecmis,
    );
  }

  YarismaOyunu _yanlis(YarismaOyunu o, YarismaSorusu soru, bool tacMi) {
    final gecmis = [...o.cevapGecmisi, (soruId: soru.id, dogru: false)];
    if (tacMi) {
      // Taç sorusunda yanlış: can gitmez, sayaç sıfırlanır.
      return o.copyWith(
        ardisik: 0,
        asama: YarismaAsama.carkBekliyor,
        ciftSansAktif: false,
        cevapGecmisi: gecmis,
      );
    }
    final can = o.can - 1;
    return o.copyWith(
      can: can,
      ardisik: 0,
      asama: can <= 0 ? YarismaAsama.bitti : YarismaAsama.carkBekliyor,
      ciftSansAktif: false,
      cevapGecmisi: gecmis,
    );
  }
}
