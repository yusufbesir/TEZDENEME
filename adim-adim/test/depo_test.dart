import 'dart:convert';
import 'dart:io';

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const dolu = OgrenciDurumu(
    xp: 345,
    seri: 4,
    enSeri: 9,
    sonGun: '2025-05-10',
    kartlar: {'d1#0': Kart(kutu: 3, sonraki: '2025-05-14')},
    tamamlanan: {'d1': 2},
    gunlukXp: {'2025-05-10': 35},
    gunlukHedef: 50,
    ad: 'Ayşe',
    koyuTema: true,
    sesAcik: false,
    hatirlatmaSaati: '08:30',
  );

  void ayniMi(OgrenciDurumu a, OgrenciDurumu b) {
    expect(jsonEncode(a.toJson()), jsonEncode(b.toJson()));
  }

  group('BellekDepo', () {
    test('ilk yükleme varsayılan durumdur', () async {
      final d = await BellekDepo().yukle();
      ayniMi(d, const OgrenciDurumu());
    });

    test('ilk durumla başlatılabilir', () async {
      ayniMi(await BellekDepo(dolu).yukle(), dolu);
    });

    test('kaydet sonra yükle aynı durumu verir', () async {
      final depo = BellekDepo();
      await depo.kaydet(dolu);
      ayniMi(await depo.yukle(), dolu);
    });

    test('sifirla varsayılana döndürür', () async {
      final depo = BellekDepo(dolu);
      await depo.sifirla();
      ayniMi(await depo.yukle(), const OgrenciDurumu());
    });

    test('ardışık kaydetme son değeri tutar', () async {
      final depo = BellekDepo();
      await depo.kaydet(dolu);
      await depo.kaydet(dolu.copyWith(xp: 1));
      expect((await depo.yukle()).xp, 1);
    });
  });

  group('DosyaDepo', () {
    late Directory gecici;
    late DosyaDepo depo;
    late File dosya;

    setUp(() async {
      gecici = await Directory.systemTemp.createTemp('adimadim_test_');
      depo = DosyaDepo(gecici);
      dosya = File(
        '${gecici.path}${Platform.pathSeparator}adimadim${Platform.pathSeparator}durum.v1.json',
      );
    });

    tearDown(() async {
      if (await gecici.exists()) await gecici.delete(recursive: true);
    });

    Future<void> yaz(String icerik) async {
      await dosya.parent.create(recursive: true);
      await dosya.writeAsString(icerik);
    }

    test('dosya yoksa varsayılan döner', () async {
      ayniMi(await depo.yukle(), const OgrenciDurumu());
      expect(await dosya.exists(), isFalse);
    });

    test('klasör bile yoksa varsayılan döner', () async {
      await gecici.delete(recursive: true);
      ayniMi(await depo.yukle(), const OgrenciDurumu());
    });

    test('gidiş-dönüş: kaydet sonra yükle eşit', () async {
      await depo.kaydet(dolu);
      ayniMi(await depo.yukle(), dolu);
    });

    test('yeni DosyaDepo örneği aynı veriyi okur', () async {
      await depo.kaydet(dolu);
      ayniMi(await DosyaDepo(gecici).yukle(), dolu);
    });

    test('dosya adı ve yeri sözleşmeye uygun, .tmp kalmaz', () async {
      await depo.kaydet(dolu);
      expect(await dosya.exists(), isTrue);
      expect(await File('${dosya.path}.tmp').exists(), isFalse);
      final liste = await dosya.parent.list().map((e) => e.path).toList();
      expect(liste, [dosya.path]);
    });

    test('üzerine yazma: son kayıt kazanır', () async {
      await depo.kaydet(dolu);
      await depo.kaydet(dolu.copyWith(xp: 7));
      expect((await depo.yukle()).xp, 7);
    });

    test('art arda eşzamanlı olmayan kayıtlar bozulmaz', () async {
      for (var i = 0; i < 20; i++) {
        await depo.kaydet(dolu.copyWith(xp: i));
      }
      expect((await depo.yukle()).xp, 19);
    });

    test('geçerli JSON dosyası olarak okunabilir', () async {
      await depo.kaydet(dolu);
      final j = jsonDecode(await dosya.readAsString());
      expect(j, isA<Map<String, Object?>>());
      expect((j as Map)['surum'], 1);
    });

    test('bozuk JSON varsayılan döndürür, fırlatmaz', () async {
      await yaz('{"xp": 5, ');
      ayniMi(await depo.yukle(), const OgrenciDurumu());
    });

    test('boş dosya varsayılan döndürür', () async {
      await yaz('');
      ayniMi(await depo.yukle(), const OgrenciDurumu());
    });

    test('geçersiz UTF-8 baytları varsayılan döndürür', () async {
      await dosya.parent.create(recursive: true);
      await dosya.writeAsBytes([0xff, 0xfe, 0xfd, 0x80]);
      ayniMi(await depo.yukle(), const OgrenciDurumu());
    });

    test('yanlış tip (liste, sayı, metin, null) varsayılan döndürür', () async {
      for (final icerik in ['[1,2,3]', '42', '"merhaba"', 'null', 'true']) {
        await yaz(icerik);
        ayniMi(await depo.yukle(), const OgrenciDurumu());
      }
    });

    test('alan tipleri yanlışsa alanlar varsayılana çekilir', () async {
      await yaz(
        jsonEncode({
          'xp': 'çok',
          'seri': -3,
          'kartlar': [1, 2],
          'tamamlanan': 'x',
          'gunlukHedef': 9999999,
          'sonGun': 'dün',
        }),
      );
      final d = await depo.yukle();
      expect(d.xp, 0);
      expect(d.seri, 0);
      expect(d.kartlar, isEmpty);
      expect(d.tamamlanan, isEmpty);
      expect(d.gunlukHedef, 30);
      expect(d.sonGun, isNull);
    });

    test('2 MB üstü dosya varsayılan döndürür', () async {
      final govde = jsonEncode({'xp': 500, 'ad': 'x'});
      final bosluk = ' ' * (DosyaDepo.enBuyukBayt + 1);
      await yaz('$govde$bosluk');
      expect(await dosya.length(), greaterThan(2 * 1024 * 1024));
      ayniMi(await depo.yukle(), const OgrenciDurumu());
    });

    test('tam 2 MB dosya hâlâ okunur', () async {
      final govde = jsonEncode({'xp': 500});
      final bosluk = ' ' * (DosyaDepo.enBuyukBayt - govde.length);
      await yaz('$govde$bosluk');
      expect(await dosya.length(), DosyaDepo.enBuyukBayt);
      expect((await depo.yukle()).xp, 500);
    });

    test('sifirla dosyayı siler, sonra varsayılan döner', () async {
      await depo.kaydet(dolu);
      await depo.sifirla();
      expect(await dosya.exists(), isFalse);
      ayniMi(await depo.yukle(), const OgrenciDurumu());
    });

    test('sifirla dosya yokken fırlatmaz', () async {
      await depo.sifirla();
      await depo.sifirla();
    });

    test('sifirla artakalan .tmp dosyasını da siler', () async {
      await yaz('{}');
      final tmp = File('${dosya.path}.tmp');
      await tmp.writeAsString('yarım');
      await depo.sifirla();
      expect(await tmp.exists(), isFalse);
      expect(await dosya.exists(), isFalse);
    });

    test('artakalan .tmp dosyası yüklemeyi etkilemez', () async {
      await depo.kaydet(dolu);
      await File('${dosya.path}.tmp').writeAsString('yarım yazılmış');
      ayniMi(await depo.yukle(), dolu);
    });

    test('okunamayan yol (dosya yerine klasör) varsayılan döndürür', () async {
      await dosya.create(recursive: true);
      await dosya.delete();
      await Directory(dosya.path).create();
      ayniMi(await depo.yukle(), const OgrenciDurumu());
    });
  });
}
