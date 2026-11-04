// Sahibi: Yusuf; yazan: [Claude#goc-zinciri]. Sürüm göç zinciri ve geri alma kopyası.
import 'dart:convert';
import 'dart:io';

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('DurumGocu (saf)', () {
    test('güncel sürüm aynen döner, göç yok', () {
      final g = DurumGocu.uygula({'surum': 1, 'xp': 5});
      expect(g.gocYapildi, isFalse);
      expect(g.gelecek, isFalse);
      expect(g.json['xp'], 5);
    });

    test('surum yoksa ya da bozuksa 1 sayılır', () {
      expect(DurumGocu.surumuOku({}), 1);
      expect(DurumGocu.surumuOku({'surum': 'x'}), 1);
      expect(DurumGocu.surumuOku({'surum': -3}), 1);
      expect(DurumGocu.surumuOku({'surum': 2}), 2);
    });

    test('adımlar sırayla uygulanır ve girdi değişmez', () {
      final girdi = <Object?, Object?>{'surum': 1, 'xp': 10};
      final g = DurumGocu.uygula(
        girdi,
        hedef: 3,
        adimlar: {
          1: (j) => {...j, 'a': 'bir'},
          2: (j) => {...j, 'b': '${j['a']}-iki'},
        },
      );
      expect(g.eskiSurum, 1);
      expect(g.yeniSurum, 3);
      expect(g.gocYapildi, isTrue);
      expect(g.json['surum'], 3);
      expect(g.json['b'], 'bir-iki');
      expect(girdi.containsKey('a'), isFalse);
    });

    test('eksik adım StateError verir', () {
      expect(
        () => DurumGocu.uygula({'surum': 1}, hedef: 2, adimlar: {}),
        throwsStateError,
      );
    });

    test('fırlatan adım StateError olarak sarılır', () {
      expect(
        () => DurumGocu.uygula(
          {'surum': 1},
          hedef: 2,
          adimlar: {1: (j) => throw const FormatException('kötü')},
        ),
        throwsStateError,
      );
    });

    test('gelecek sürüm dokunulmadan döner', () {
      final g = DurumGocu.uygula({'surum': 9, 'xp': 1});
      expect(g.gelecek, isTrue);
      expect(g.gocYapildi, isFalse);
      expect(g.json['surum'], 9);
    });
  });

  group('DosyaDepo göç ve geri alma kopyası', () {
    late Directory gecici;

    setUp(() async {
      gecici = await Directory.systemTemp.createTemp('adimadim_goc_');
    });
    tearDown(() async {
      if (await gecici.exists()) await gecici.delete(recursive: true);
    });

    File ana() => File(
      '${gecici.path}${Platform.pathSeparator}adimadim${Platform.pathSeparator}durum.v1.json',
    );
    File yuva(int i) => File('${ana().path}.geri-$i');

    Future<void> yaz(Object json) async {
      await ana().parent.create(recursive: true);
      await ana().writeAsString(jsonEncode(json));
    }

    final adimlar = <int, Map<String, Object?> Function(Map<String, Object?>)>{
      1: (j) => {...j, 'xp': (j['xp'] as int) + 100},
    };

    test('eski sürüm göçle yüklenir; öncesinde kopya alınır', () async {
      await yaz({'surum': 1, 'xp': 7});
      final depo = DosyaDepo(gecici, goc: adimlar, hedefSurum: 2);
      final d = await depo.yukle();
      expect(d.xp, 107);
      expect(await yuva(0).exists(), isTrue);
      final kopya = jsonDecode(await yuva(0).readAsString()) as Map;
      expect(kopya['xp'], 7);
      expect(kopya['surum'], 1);
      // Asıl dosya henüz dokunulmamış.
      expect((jsonDecode(await ana().readAsString()) as Map)['xp'], 7);
    });

    test('güncel sürümde kopya alınmaz', () async {
      await yaz({'surum': 1, 'xp': 7});
      await DosyaDepo(gecici).yukle();
      expect(await yuva(0).exists(), isFalse);
    });

    test('gelecek sürüm yüklenir, dosya kopyalanır ve ezilmez', () async {
      await yaz({'surum': 99, 'xp': 33, 'yeniAlan': 1});
      final depo = DosyaDepo(gecici);
      final d = await depo.yukle();
      expect(d.xp, 33);
      expect(await yuva(0).exists(), isTrue);
      expect((jsonDecode(await yuva(0).readAsString()) as Map)['surum'], 99);
      expect((jsonDecode(await ana().readAsString()) as Map)['surum'], 99);
    });

    test('göç adımı başarısızsa dosya kenara alınır, veri kaybolmaz', () async {
      await yaz({'surum': 1, 'xp': 7});
      final depo = DosyaDepo(
        gecici,
        goc: {1: (j) => throw StateError('patladı')},
        hedefSurum: 2,
      );
      final d = await depo.yukle();
      expect(d.xp, 0);
      expect(await yuva(0).exists(), isTrue);
      final dosyalar = await ana().parent.list().map((e) => e.path).toList();
      expect(dosyalar.any((p) => p.contains('.bozuk-')), isTrue);
    });

    test('bozuk JSON göç yolunu tetiklemez, eskisi gibi kenara alınır', () async {
      await ana().parent.create(recursive: true);
      await ana().writeAsString('{bozuk');
      final d = await DosyaDepo(gecici).yukle();
      expect(d.xp, 0);
      expect(await yuva(0).exists(), isFalse);
    });

    test('kök harita değilse kopya yok, kenara alınır', () async {
      await yaz([1, 2, 3]);
      final d = await DosyaDepo(gecici).yukle();
      expect(d.xp, 0);
      expect(await yuva(0).exists(), isFalse);
    });

    test('yuva sınırı: dolunca en eski üzerine yazılır, sayı artmaz', () async {
      final depo = DosyaDepo(gecici, goc: adimlar, hedefSurum: 2);
      for (var i = 1; i <= 5; i++) {
        await yaz({'surum': 1, 'xp': i});
        await depo.yukle();
        // Yuva zamanları ayrışsın.
        await Future<void>.delayed(const Duration(milliseconds: 30));
      }
      final yuvalar = [for (var i = 0; i < 3; i++) yuva(i)];
      for (final y in yuvalar) {
        expect(await y.exists(), isTrue);
      }
      expect(await File('${ana().path}.geri-3').exists(), isFalse);
      final xpler = [
        for (final y in yuvalar)
          (jsonDecode(await y.readAsString()) as Map)['xp'],
      ];
      // 1 ve 2 üzerine yazıldı: en yeni üç kopya (3, 4, 5) kalır.
      expect(xpler.toSet(), {3, 4, 5});
      // .tmp artığı yok.
      expect(await File('${yuva(0).path}.tmp').exists(), isFalse);
    });

    test('sifirla geri alma kopyalarını da kaldırır', () async {
      await yaz({'surum': 1, 'xp': 7});
      final depo = DosyaDepo(gecici, goc: adimlar, hedefSurum: 2);
      await depo.yukle();
      await depo.sifirla();
      expect(await yuva(0).exists(), isFalse);
    });

    test('bosalt bekleyen yazmaları bitirir', () async {
      final depo = DosyaDepo(gecici);
      unawaited2(depo.kaydet(const OgrenciDurumu(xp: 12)));
      await depo.bosalt();
      expect((jsonDecode(await ana().readAsString()) as Map)['xp'], 12);
    });
  });
}

void unawaited2(Future<void> f) {}
