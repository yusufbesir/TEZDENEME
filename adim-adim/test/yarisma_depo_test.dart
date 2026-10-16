// Yarışma deposu ve istatistik testleri.
// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
import 'dart:convert';
import 'dart:io';

import 'package:adim_adim/yarisma/depo.dart';
import 'package:adim_adim/yarisma/model.dart';
import 'package:adim_adim/yarisma/motor.dart';
import 'package:adim_adim/yarisma/soru_bankasi.dart';
import 'package:flutter_test/flutter_test.dart';

final _sorular = sorulariBul('dil', 'ingilizce-1');

/// 1 doğru (tarih), 1 yanlış (fen), 1 taç (sanat) ile biten bir oyun üretir.
YarismaOyunu _bitenOyun({bool kazan = false}) {
  final m = YarismaMotoru(tohum: 1);
  var o = m.basla(_sorular);
  YarismaOyunu ac(YarismaOyunu x, YarismaKategori k) {
    final s = x.sorular.where((q) => q.kategori == k).first;
    return x.copyWith(
      asama: YarismaAsama.soruda,
      mevcutSoru: s,
      mevcutKategori: k,
    );
  }

  if (kazan) {
    for (final k in YarismaKategori.values) {
      o = o.copyWith(asama: YarismaAsama.tacKategoriSec);
      o = m.tacKategoriSec(o, k);
      o = m.cevapla(o, o.mevcutSoru!.dogru);
    }
    return o;
  }
  o = ac(o, YarismaKategori.tarih);
  o = m.cevapla(o, o.mevcutSoru!.dogru);
  o = o.copyWith(asama: YarismaAsama.tacKategoriSec);
  o = m.tacKategoriSec(o, YarismaKategori.sanat);
  o = m.cevapla(o, o.mevcutSoru!.dogru);
  for (var i = 0; i < 3; i++) {
    o = ac(o, YarismaKategori.fen);
    o = m.cevapla(o, (o.mevcutSoru!.dogru + 1) % 4);
  }
  return o;
}

void main() {
  test('oyunuIsle: bitmemiş oyunu işlemez', () {
    const k = YarismaKayit();
    final o = YarismaMotoru(tohum: 1).basla(_sorular);
    expect(identical(k.oyunuIsle('dil', 'ingilizce-1', o), k), isTrue);
  });

  test('oyunuIsle: istatistikleri günceller', () {
    final o = _bitenOyun();
    expect(o.asama, YarismaAsama.bitti);
    final k = const YarismaKayit().oyunuIsle('dil', 'ingilizce-1', o);
    final s = k.istatistik('dil', 'ingilizce-1');
    expect(s.oynanan, 1);
    expect(s.kazanilan, 0);
    expect(s.enIyiPuan, 60); // 10 + 50
    expect(s.toplamTac, 1);
    expect(s.kategoriDogru['tarih'], 1);
    expect(s.kategoriDogru['sanat'], 1);
    expect(s.kategoriYanlis['fen'], 3);
    expect(k.istatistikler.keys, ['dil/ingilizce-1']);

    // İkinci oyun: kazanılan, en iyi puan büyür, toplamlar birikir.
    final k2 = k.oyunuIsle('dil', 'ingilizce-1', _bitenOyun(kazan: true));
    final s2 = k2.istatistik('dil', 'ingilizce-1');
    expect(s2.oynanan, 2);
    expect(s2.kazanilan, 1);
    expect(s2.enIyiPuan, 300);
    expect(s2.toplamTac, 7);
    // Başka seviye ayrı tutulur.
    expect(k2.istatistik('kod', 'html-1').oynanan, 0);
    // Eski kayıt değişmez.
    expect(k.istatistik('dil', 'ingilizce-1').oynanan, 1);
  });

  test('oyunuIsle: daha düşük puan en iyiyi düşürmez', () {
    final yuksek = const YarismaKayit().oyunuIsle(
      'kod',
      'html-1',
      _bitenOyun(kazan: true),
    );
    final k = yuksek.oyunuIsle('kod', 'html-1', _bitenOyun());
    expect(k.istatistik('kod', 'html-1').enIyiPuan, 300);
  });

  test('JSON gidiş-dönüş', () {
    final k = const YarismaKayit()
        .oyunuIsle('dil', 'ingilizce-1', _bitenOyun())
        .oyunuIsle('kod', 'js-1', _bitenOyun(kazan: true));
    final json = jsonDecode(jsonEncode(k.toJson()));
    final geri = YarismaKayit.fromJson(json);
    expect(geri.toJson(), k.toJson());
    expect(json['surum'], 1);
    expect(geri.istatistik('kod', 'js-1').kazanilan, 1);
  });

  test('bozuk veri varsayılana döner ve fırlatmaz', () {
    for (final bozuk in <Object?>[
      null,
      'metin',
      42,
      <Object?>[],
      {'istatistikler': 5},
      {'istatistikler': <Object?>[]},
    ]) {
      expect(YarismaKayit.fromJson(bozuk).istatistikler, isEmpty);
    }
    final k = YarismaKayit.fromJson({
      'istatistikler': {
        'dil/ingilizce-1': {
          'oynanan': -4,
          'kazanilan': 'x',
          'enIyiPuan': 70,
          'toplamTac': null,
          'kategoriDogru': {'tarih': 3, 'yokKategori': 9, 'fen': -1},
          'kategoriYanlis': 'bozuk',
        },
        'gecersiz anahtar': {'oynanan': 5},
        'diger/x': {'oynanan': 5},
        'kod/html-1': 'bozuk',
      },
    });
    final s = k.istatistik('dil', 'ingilizce-1');
    expect(s.oynanan, 0);
    expect(s.kazanilan, 0);
    expect(s.enIyiPuan, 70);
    expect(s.toplamTac, 0);
    expect(s.kategoriDogru, {'tarih': 3, 'fen': 0});
    expect(s.kategoriYanlis, isEmpty);
    expect(k.istatistikler.keys.toSet(), {'dil/ingilizce-1', 'kod/html-1'});
    expect(k.istatistik('kod', 'html-1').oynanan, 0);
  });

  test('BellekYarismaDepo: kaydet, yükle, sıfırla', () async {
    final depo = BellekYarismaDepo();
    expect((await depo.yukle()).istatistikler, isEmpty);
    final k = const YarismaKayit().oyunuIsle(
      'dil',
      'ingilizce-1',
      _bitenOyun(),
    );
    await depo.kaydet(k);
    expect((await depo.yukle()).istatistik('dil', 'ingilizce-1').oynanan, 1);
    await depo.sifirla();
    expect((await depo.yukle()).istatistikler, isEmpty);
  });

  group('DosyaYarismaDepo', () {
    late Directory gecici;
    late DosyaYarismaDepo depo;

    setUp(() {
      gecici = Directory.systemTemp.createTempSync('yarisma_depo_');
      depo = DosyaYarismaDepo(gecici);
    });
    tearDown(() {
      if (gecici.existsSync()) gecici.deleteSync(recursive: true);
    });

    File dosya() => File(
      '${gecici.path}${Platform.pathSeparator}adimadim${Platform.pathSeparator}yarisma.v1.json',
    );

    test('dosya yoksa boş kayıt döner', () async {
      expect((await depo.yukle()).istatistikler, isEmpty);
    });

    test('yaz, oku, sıfırla', () async {
      final k = const YarismaKayit().oyunuIsle(
        'dil',
        'ingilizce-1',
        _bitenOyun(),
      );
      await depo.kaydet(k);
      expect(dosya().existsSync(), isTrue);
      expect(File('${dosya().path}.tmp').existsSync(), isFalse);
      final okunan = await depo.yukle();
      expect(okunan.toJson(), k.toJson());
      await depo.sifirla();
      expect(dosya().existsSync(), isFalse);
      expect((await depo.yukle()).istatistikler, isEmpty);
    });

    test('bozuk dosya kenara alınır ve boş kayıt döner', () async {
      await dosya().parent.create(recursive: true);
      await dosya().writeAsString('{bozuk json');
      expect((await depo.yukle()).istatistikler, isEmpty);
      expect(dosya().existsSync(), isFalse);
      final yedekler = dosya().parent
          .listSync()
          .where((e) => e.path.contains('.bozuk-'))
          .toList();
      expect(yedekler.length, 1);
      // Sıfırla yedekleri de siler.
      await depo.sifirla();
      expect(
        dosya().parent.listSync().where((e) => e.path.contains('.bozuk-')),
        isEmpty,
      );
    });

    test('Map olmayan JSON kenara alınır', () async {
      await dosya().parent.create(recursive: true);
      await dosya().writeAsString('[1,2,3]');
      expect((await depo.yukle()).istatistikler, isEmpty);
      expect(dosya().existsSync(), isFalse);
    });

    test('2 MB üstü dosya reddedilir', () async {
      await dosya().parent.create(recursive: true);
      await dosya().writeAsString(' ' * (DosyaYarismaDepo.enBuyukBayt + 1));
      expect((await depo.yukle()).istatistikler, isEmpty);
      expect(dosya().existsSync(), isFalse);
    });

    test('sembolik bağ izlenmez', () async {
      final hedef = File('${gecici.path}${Platform.pathSeparator}hedef.json');
      await hedef.writeAsString(
        jsonEncode(
          const YarismaKayit(
            istatistikler: {'dil/ingilizce-1': YarismaIstatistik(oynanan: 9)},
          ).toJson(),
        ),
      );
      await dosya().parent.create(recursive: true);
      try {
        await Link(dosya().path).create(hedef.path);
      } on FileSystemException {
        return; // Bu ortamda sembolik bağ kurulamıyor.
      }
      expect((await depo.yukle()).istatistikler, isEmpty);
    });

    test('art arda kayıtlar sıralanır, sonuncusu kalır', () async {
      final a = const YarismaKayit().oyunuIsle(
        'dil',
        'ingilizce-1',
        _bitenOyun(),
      );
      final b = a.oyunuIsle('dil', 'ingilizce-1', _bitenOyun(kazan: true));
      await Future.wait([depo.kaydet(a), depo.kaydet(b)]);
      expect((await depo.yukle()).toJson(), b.toJson());
    });
  });
}
