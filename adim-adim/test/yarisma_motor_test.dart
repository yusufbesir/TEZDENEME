// Yarışma motoru testleri (sabit tohumla deterministik).
// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
import 'package:adim_adim/yarisma/model.dart';
import 'package:adim_adim/yarisma/motor.dart';
import 'package:adim_adim/yarisma/soru_bankasi.dart';
import 'package:flutter_test/flutter_test.dart';

final _sorular = sorulariBul('dil', 'ingilizce-1');

YarismaMotoru _motor([int tohum = 1]) => YarismaMotoru(tohum: tohum);

/// Belirli kategoriden soru açılmış durum kurar (çark şansına bağlı olmadan).
YarismaOyunu _soruda(YarismaOyunu o, YarismaKategori k, {int sira = 0}) {
  final soru = o.sorular.where((s) => s.kategori == k).toList()[sira];
  return o.copyWith(
    asama: YarismaAsama.soruda,
    mevcutSoru: soru,
    mevcutKategori: k,
    buSorudaGucKullanildi: false,
    silinenSikler: const {},
    ciftSansAktif: false,
    sureSaniye: YarismaMotoru.varsayilanSure,
  );
}

int _yanlisSik(YarismaOyunu o) => (o.mevcutSoru!.dogru + 1) % 4;

void main() {
  test('başlangıç durumu', () {
    final o = _motor().basla(_sorular);
    expect(o.can, 3);
    expect(o.puan, 0);
    expect(o.ardisik, 0);
    expect(o.taclar, isEmpty);
    expect(o.asama, YarismaAsama.carkBekliyor);
    expect(o.mevcutSoru, isNull);
    expect(o.sureSaniye, 20);
    expect(o.guclendiriciler.bomba, isTrue);
    expect(o.guclendiriciler.ciftSans, isTrue);
    expect(o.guclendiriciler.ekstraSure, isTrue);
    expect(o.guclendiriciler.gec, isTrue);
    expect(o.cevapGecmisi, isEmpty);
  });

  test('basla: kategorisi eksik soru listesini reddeder', () {
    final eksik = _sorular
        .where((s) => s.kategori != YarismaKategori.sanat)
        .toList();
    expect(() => _motor().basla(eksik), throwsArgumentError);
  });

  test(
    'çark: dilim 0..6, aynı tohumla aynı sonuç, kategori dilimi soru açar',
    () {
      final a = _motor(7).basla(_sorular);
      final b = _motor(7).basla(_sorular);
      final ma = _motor(7), mb = _motor(7);
      for (var i = 0; i < 20; i++) {
        final ra = ma.carkCevir(a);
        final rb = mb.carkCevir(b);
        expect(ra.dilim, rb.dilim);
        expect(ra.dilim, inInclusiveRange(0, 6));
        if (ra.dilim == 6) {
          expect(ra.oyun.asama, YarismaAsama.tacKategoriSec);
        } else {
          expect(ra.oyun.asama, YarismaAsama.soruda);
          expect(ra.oyun.mevcutKategori, YarismaKategori.values[ra.dilim]);
          expect(ra.oyun.mevcutSoru!.kategori, ra.oyun.mevcutKategori);
        }
      }
    },
  );

  test('çark yalnızca çark beklerken çevrilir', () {
    final m = _motor();
    final o = _soruda(m.basla(_sorular), YarismaKategori.tarih);
    final r = m.carkCevir(o);
    expect(r.dilim, -1);
    expect(identical(r.oyun, o), isTrue);
  });

  test('doğru cevap +10 puan ve ardışık +1', () {
    final m = _motor();
    var o = _soruda(m.basla(_sorular), YarismaKategori.matematik);
    o = m.cevapla(o, o.mevcutSoru!.dogru);
    expect(o.puan, 10);
    expect(o.ardisik, 1);
    expect(o.asama, YarismaAsama.carkBekliyor);
    expect(o.can, 3);
  });

  test('3 doğru üst üste taç kategorisi seçimine götürür', () {
    final m = _motor();
    var o = m.basla(_sorular);
    for (var i = 0; i < 3; i++) {
      o = _soruda(o, YarismaKategori.values[i]);
      o = m.cevapla(o, o.mevcutSoru!.dogru);
    }
    expect(o.puan, 30);
    expect(o.ardisik, 3);
    expect(o.asama, YarismaAsama.tacKategoriSec);
  });

  test('taç sorusu doğru: taç eklenir, +50 puan, çarka döner', () {
    final m = _motor();
    var o = m
        .basla(_sorular)
        .copyWith(asama: YarismaAsama.tacKategoriSec, ardisik: 3, puan: 30);
    o = m.tacKategoriSec(o, YarismaKategori.tarih);
    expect(o.asama, YarismaAsama.tacSorusunda);
    expect(o.mevcutSoru!.kategori, YarismaKategori.tarih);
    o = m.cevapla(o, o.mevcutSoru!.dogru);
    expect(o.taclar, {YarismaKategori.tarih});
    expect(o.puan, 80);
    expect(o.ardisik, 0);
    expect(o.asama, YarismaAsama.carkBekliyor);
  });

  test('taç sorusu yanlış: can gitmez, ardışık sıfırlanır', () {
    final m = _motor();
    var o = m
        .basla(_sorular)
        .copyWith(asama: YarismaAsama.tacKategoriSec, ardisik: 3);
    o = m.tacKategoriSec(o, YarismaKategori.fen);
    o = m.cevapla(o, _yanlisSik(o));
    expect(o.can, 3);
    expect(o.ardisik, 0);
    expect(o.taclar, isEmpty);
    expect(o.asama, YarismaAsama.carkBekliyor);
  });

  test('alınmış kategori taç için seçilemez', () {
    final m = _motor();
    final o = m
        .basla(_sorular)
        .copyWith(
          asama: YarismaAsama.tacKategoriSec,
          taclar: {YarismaKategori.sanat},
        );
    final r = m.tacKategoriSec(o, YarismaKategori.sanat);
    expect(identical(r, o), isTrue);
  });

  test('6 taç toplanınca kazandi', () {
    final m = _motor();
    var o = m.basla(_sorular);
    for (final k in YarismaKategori.values) {
      o = o.copyWith(asama: YarismaAsama.tacKategoriSec, ardisik: 3);
      o = m.tacKategoriSec(o, k);
      o = m.cevapla(o, o.mevcutSoru!.dogru);
    }
    expect(o.taclar.length, 6);
    expect(o.asama, YarismaAsama.kazandi);
    expect(o.bittiMi, isTrue);
    expect(o.sonuc.kazandiMi, isTrue);
    // Bittikten sonra cevap işlenmez.
    expect(identical(m.cevapla(o, 0), o), isTrue);
  });

  test('3 yanlış oyunu bitirir', () {
    final m = _motor();
    var o = m.basla(_sorular);
    for (var i = 0; i < 3; i++) {
      expect(o.asama, isNot(YarismaAsama.bitti));
      o = _soruda(o, YarismaKategori.cografya, sira: i);
      o = m.cevapla(o, _yanlisSik(o));
      expect(o.can, 2 - i);
    }
    expect(o.asama, YarismaAsama.bitti);
    expect(o.can, 0);
    expect(o.ardisik, 0);
  });

  test('yanlış cevap ardışık sayacı sıfırlar', () {
    final m = _motor();
    var o = _soruda(m.basla(_sorular), YarismaKategori.tarih);
    o = m.cevapla(o, o.mevcutSoru!.dogru);
    o = _soruda(o, YarismaKategori.sanat);
    o = m.cevapla(o, _yanlisSik(o));
    expect(o.ardisik, 0);
    expect(o.can, 2);
  });

  test('çift şans ilk yanlışta kurtarır, ikinci yanlış can götürür', () {
    final m = _motor();
    var o = _soruda(m.basla(_sorular), YarismaKategori.fen);
    o = m.ciftSansKullan(o);
    expect(o.ciftSansAktif, isTrue);
    final yanlis = _yanlisSik(o);
    o = m.cevapla(o, yanlis);
    expect(o.can, 3);
    expect(o.ciftSansAktif, isFalse);
    expect(o.silinenSikler, {yanlis});
    expect(o.asama, YarismaAsama.soruda);
    expect(o.cevapGecmisi, isEmpty);
    // Silinmiş şık tekrar işlenmez.
    expect(identical(m.cevapla(o, yanlis), o), isTrue);
    final ikinci = [
      for (var i = 0; i < 4; i++)
        if (i != o.mevcutSoru!.dogru && i != yanlis) i,
    ].first;
    o = m.cevapla(o, ikinci);
    expect(o.can, 2);
    expect(o.asama, YarismaAsama.carkBekliyor);
  });

  test('bomba doğru şıkkı silmez ve tam 2 şık siler', () {
    for (var tohum = 0; tohum < 30; tohum++) {
      final m = _motor(tohum);
      var o = _soruda(m.basla(_sorular), YarismaKategori.values[tohum % 6]);
      o = m.bombaKullan(o);
      expect(o.silinenSikler.length, 2, reason: 'tohum $tohum');
      expect(o.silinenSikler.contains(o.mevcutSoru!.dogru), isFalse);
      expect(o.guclendiriciler.bomba, isFalse);
      // Kalan doğru şık hâlâ cevaplanabilir.
      final d = m.cevapla(o, o.mevcutSoru!.dogru);
      expect(d.puan, 10);
    }
  });

  test('soru başına tek güçlendirici; kullanılmışsa durum aynen döner', () {
    final m = _motor();
    var o = _soruda(m.basla(_sorular), YarismaKategori.tarih);
    o = m.bombaKullan(o);
    expect(o.buSorudaGucKullanildi, isTrue);
    expect(identical(m.ciftSansKullan(o), o), isTrue);
    expect(identical(m.ekstraSureKullan(o), o), isTrue);
    expect(identical(m.gecKullan(o), o), isTrue);
    expect(identical(m.bombaKullan(o), o), isTrue);
    // Yeni soruda hak yenilenir (kullanılmamış güçlendiriciler için).
    o = m.cevapla(o, o.mevcutSoru!.dogru);
    o = _soruda(o, YarismaKategori.sanat);
    expect(o.buSorudaGucKullanildi, isFalse);
    final c = m.ciftSansKullan(o);
    expect(c.ciftSansAktif, isTrue);
    // Bomba oyun başına tek: tekrar kullanılamaz.
    expect(
      identical(m.bombaKullan(_soruda(c, YarismaKategori.fen)), c),
      isFalse,
    );
    final yeniSoru = _soruda(c, YarismaKategori.fen);
    expect(identical(m.bombaKullan(yeniSoru), yeniSoru), isTrue);
  });

  test('güçlendirici çark beklerken kullanılamaz', () {
    final m = _motor();
    final o = m.basla(_sorular);
    expect(identical(m.bombaKullan(o), o), isTrue);
    expect(identical(m.ciftSansKullan(o), o), isTrue);
    expect(identical(m.ekstraSureKullan(o), o), isTrue);
    expect(identical(m.gecKullan(o), o), isTrue);
  });

  test('ekstra süre +15 s ekler; sonraki soruda süre 20 olur', () {
    final m = _motor();
    var o = _soruda(m.basla(_sorular), YarismaKategori.tarih);
    o = m.ekstraSureKullan(o);
    expect(o.sureSaniye, 35);
    expect(o.guclendiriciler.ekstraSure, isFalse);
    o = m.cevapla(o, o.mevcutSoru!.dogru);
    o = _soruda(o, YarismaKategori.sanat);
    expect(o.sureSaniye, 20);
  });

  test('geç: aynı kategoriden başka soru getirir', () {
    for (var tohum = 0; tohum < 10; tohum++) {
      final m = _motor(tohum);
      var o = _soruda(m.basla(_sorular), YarismaKategori.matematik);
      final eski = o.mevcutSoru!.id;
      o = m.gecKullan(o);
      expect(o.mevcutSoru!.id, isNot(eski));
      expect(o.mevcutSoru!.kategori, YarismaKategori.matematik);
      expect(o.guclendiriciler.gec, isFalse);
      expect(o.asama, YarismaAsama.soruda);
      expect(o.buSorudaGucKullanildi, isTrue);
    }
  });

  test('süre bitti yanlış gibidir; çift şans kurtarmaz', () {
    final m = _motor();
    var o = _soruda(m.basla(_sorular), YarismaKategori.tarih);
    o = m.ciftSansKullan(o);
    o = m.sureBitti(o);
    expect(o.can, 2);
    expect(o.ardisik, 0);
    expect(o.asama, YarismaAsama.carkBekliyor);
    expect(o.cevapGecmisi.single.dogru, isFalse);
    // Çarkta süre bitti etkisizdir.
    expect(identical(m.sureBitti(o), o), isTrue);
  });

  test('süre bitti taç sorusunda can götürmez', () {
    final m = _motor();
    var o = m
        .basla(_sorular)
        .copyWith(asama: YarismaAsama.tacKategoriSec, ardisik: 3);
    o = m.tacKategoriSec(o, YarismaKategori.sanat);
    o = m.sureBitti(o);
    expect(o.can, 3);
    expect(o.ardisik, 0);
    expect(o.asama, YarismaAsama.carkBekliyor);
  });

  test('aynı oyunda soru tekrar etmez; havuz bitince sıfırlanır', () {
    // Her kategoride 2 soruluk küçük havuz.
    final kucuk = <YarismaSorusu>[
      for (final k in YarismaKategori.values)
        ..._sorular.where((s) => s.kategori == k).take(2),
    ];
    final m = _motor(3);
    var o = m.basla(kucuk);
    final cekilen = {for (final k in YarismaKategori.values) k: <String>[]};
    for (var i = 0; i < 200; i++) {
      final r = m.carkCevir(o);
      o = r.oyun;
      if (r.dilim == 6) {
        o = o.copyWith(asama: YarismaAsama.carkBekliyor);
        continue;
      }
      cekilen[o.mevcutKategori]!.add(o.mevcutSoru!.id);
      o = o.copyWith(asama: YarismaAsama.carkBekliyor, ardisik: 0);
    }
    for (final e in cekilen.entries) {
      expect(e.value.length, greaterThan(6), reason: '${e.key}');
      for (var i = 0; i + 1 < e.value.length; i += 2) {
        expect(
          e.value[i],
          isNot(e.value[i + 1]),
          reason: '${e.key} tur ${i ~/ 2}',
        );
      }
    }
  });

  test('sonuc: doğru/yanlış toplamı, kategori kırılımı, yanlış bilinenler', () {
    final m = _motor();
    var o = m.basla(_sorular);
    o = _soruda(o, YarismaKategori.tarih);
    o = m.cevapla(o, o.mevcutSoru!.dogru);
    o = _soruda(o, YarismaKategori.tarih, sira: 1);
    final yanlisSoru = o.mevcutSoru!;
    o = m.cevapla(o, _yanlisSik(o));
    o = _soruda(o, YarismaKategori.fen);
    o = m.cevapla(o, o.mevcutSoru!.dogru);
    final s = o.sonuc;
    expect(s.puan, 20);
    expect(s.dogru, 2);
    expect(s.yanlis, 1);
    expect(s.kategoriDogru[YarismaKategori.tarih], 1);
    expect(s.kategoriYanlis[YarismaKategori.tarih], 1);
    expect(s.kategoriDogru[YarismaKategori.fen], 1);
    expect(s.yanlisBilinenler.single.id, yanlisSoru.id);
    expect(s.yanlisBilinenler.single.aciklama, isNotEmpty);
    expect(s.dogruOrani, closeTo(2 / 3, 1e-9));
    expect(s.tacSayisi, 0);
    expect(s.kazandiMi, isFalse);
  });

  test('durum değiştirilemez: geçişler eskiyi bozmaz', () {
    final m = _motor();
    final o = _soruda(m.basla(_sorular), YarismaKategori.tarih);
    final yeni = m.cevapla(o, _yanlisSik(o));
    expect(o.can, 3);
    expect(yeni.can, 2);
    expect(() => o.taclar.add(YarismaKategori.fen), throwsUnsupportedError);
    expect(() => o.cevapGecmisi.clear(), throwsUnsupportedError);
  });

  test('xpHesapla: puan ÷ 5, en az 5', () {
    expect(YarismaMotoru.xpHesapla(0), 5);
    expect(YarismaMotoru.xpHesapla(24), 5);
    expect(YarismaMotoru.xpHesapla(25), 5);
    expect(YarismaMotoru.xpHesapla(30), 6);
    expect(YarismaMotoru.xpHesapla(250), 50);
  });
}
