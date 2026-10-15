import 'dart:convert';
import 'dart:io';

import 'package:crypto/crypto.dart';
import 'package:adim_adim/guncelleme/eski_surum_temizleyici.dart';
import 'package:adim_adim/guncelleme/manifest.dart';
import 'package:adim_adim/guncelleme/manifest_uretici.dart';
import 'package:flutter_test/flutter_test.dart';

final _s = Platform.pathSeparator;

String _p(Directory k, String goreli) =>
    '${k.path}$_s${goreli.replaceAll('/', _s)}';

Future<void> _yaz(Directory k, String goreli, String icerik) async {
  final f = File(_p(k, goreli));
  await f.parent.create(recursive: true);
  await f.writeAsString(icerik);
}

Future<void> _manifest(
  Directory k,
  String ad,
  String surum,
  List<String> yollar,
) async {
  final dosyalar = <ManifestDosyasi>[];
  for (final y in yollar) {
    final f = File(_p(k, y));
    dosyalar.add(
      ManifestDosyasi(
        yol: y,
        boyut: await f.length(),
        sha256: await dosyaSha256(f),
      ),
    );
  }
  await File(_p(k, ad)).writeAsString(
    jsonEncode(SurumManifesti(surum: surum, dosyalar: dosyalar).toJson()),
  );
}

/// Elle (dosya olmadan) eski manifest yazar; verilen kayıtlar olduğu gibi.
Future<void> _eskiHam(Directory k, List<Map<String, Object?>> kayitlar) => File(
  _p(k, eskiManifestAdi),
).writeAsString(jsonEncode({'surum': '1.0.0', 'dosyalar': kayitlar}));

Map<String, Object?> _kayit(String yol, String icerik) => {
  'yol': yol,
  'boyut': utf8.encode(icerik).length,
  'sha256': sha256Metin(icerik),
};

String sha256Metin(String s) => sha256.convert(utf8.encode(s)).toString();

void main() {
  late Directory gecici;
  late Directory kurulum;
  late Directory dis;

  setUp(() async {
    gecici = await Directory.systemTemp.createTemp('guncelleme_test_');
    kurulum = await Directory(_p(gecici, 'kurulum')).create();
    dis = await Directory(_p(gecici, 'dis')).create();
  });
  tearDown(() async {
    if (await gecici.exists()) await gecici.delete(recursive: true);
  });

  /// Ortak: yeni sürüm (a, ortak) kurulu; eski sürümde ayrıca b ve d/e var.
  Future<void> normalKurulum() async {
    await _yaz(kurulum, 'uygulama.exe', 'yeni exe');
    await _yaz(kurulum, 'ortak.dll', 'ortak');
    await _yaz(kurulum, 'eski.dll', 'eski dll');
    await _yaz(kurulum, 'data/eski/e.bin', 'e verisi');
    await _manifest(kurulum, surumManifestAdi, '2.0.0', [
      'uygulama.exe',
      'ortak.dll',
    ]);
    await _eskiHam(kurulum, [
      _kayit('uygulama.exe', 'eski exe'),
      _kayit('ortak.dll', 'ortak'),
      _kayit('eski.dll', 'eski dll'),
      _kayit('data/eski/e.bin', 'e verisi'),
    ]);
  }

  test('(a) eski manifest yoksa gerekYok, dosyalara dokunulmaz', () async {
    await _yaz(kurulum, 'a.txt', 'a');
    final s = await EskiSurumTemizleyici(kurulum).calistir();
    expect(s.durum, TemizlikDurumu.gerekYok);
    expect(File(_p(kurulum, 'a.txt')).existsSync(), isTrue);
  });

  test('(b) normal akış: eski silinir, ortak kalır, boş dizin gider', () async {
    await normalKurulum();
    final s = await EskiSurumTemizleyici(kurulum).calistir();
    expect(s.durum, TemizlikDurumu.tamam);
    expect(s.silinen, unorderedEquals(['eski.dll', 'data/eski/e.bin']));
    expect(File(_p(kurulum, 'eski.dll')).existsSync(), isFalse);
    expect(File(_p(kurulum, 'ortak.dll')).existsSync(), isTrue);
    expect(File(_p(kurulum, 'uygulama.exe')).existsSync(), isTrue);
    expect(Directory(_p(kurulum, 'data')).existsSync(), isFalse);
    expect(File(_p(kurulum, eskiManifestAdi)).existsSync(), isFalse);
    expect(File(_p(kurulum, surumManifestAdi)).existsSync(), isTrue);
  });

  test('(c) yeni sürümde eksik dosya: hiçbir şey silinmez', () async {
    await normalKurulum();
    await File(_p(kurulum, 'ortak.dll')).delete();
    final s = await EskiSurumTemizleyici(kurulum).calistir();
    expect(s.durum, TemizlikDurumu.dogrulanamadi);
    expect(s.silinen, isEmpty);
    expect(File(_p(kurulum, 'eski.dll')).existsSync(), isTrue);
    expect(File(_p(kurulum, 'data/eski/e.bin')).existsSync(), isTrue);
    expect(File(_p(kurulum, eskiManifestAdi)).existsSync(), isTrue);
  });

  test('(c) yeni sürümde özet farkı: hiçbir şey silinmez', () async {
    await normalKurulum();
    await File(_p(kurulum, 'ortak.dll')).writeAsString('bozuk');
    final s = await EskiSurumTemizleyici(kurulum).calistir();
    expect(s.durum, TemizlikDurumu.dogrulanamadi);
    expect(File(_p(kurulum, 'eski.dll')).existsSync(), isTrue);
    expect(File(_p(kurulum, eskiManifestAdi)).existsSync(), isTrue);
  });

  test('(c) yeni manifest yoksa dogrulanamadi', () async {
    await normalKurulum();
    await File(_p(kurulum, surumManifestAdi)).delete();
    final s = await EskiSurumTemizleyici(kurulum).calistir();
    expect(s.durum, TemizlikDurumu.dogrulanamadi);
    expect(File(_p(kurulum, 'eski.dll')).existsSync(), isTrue);
    expect(File(_p(kurulum, eskiManifestAdi)).existsSync(), isTrue);
  });

  test('(d) ../dis.txt ve mutlak yol atlanır, dış dosya kalır', () async {
    await normalKurulum();
    await File(_p(dis, 'dis.txt')).writeAsString('dis');
    await File(_p(gecici, 'kok.txt')).writeAsString('kok');
    final mutlak = _p(dis, 'dis.txt').replaceAll('\\', '/');
    await _eskiHam(kurulum, [
      _kayit('../dis.txt', 'dis'),
      _kayit('../kok.txt', 'kok'),
      _kayit(mutlak, 'dis'),
      _kayit('eski.dll', 'eski dll'),
    ]);
    final s = await EskiSurumTemizleyici(kurulum).calistir();
    expect(s.silinen, ['eski.dll']);
    expect(s.atlanan.keys, containsAll(['../dis.txt', '../kok.txt', mutlak]));
    expect(File(_p(dis, 'dis.txt')).existsSync(), isTrue);
    expect(File(_p(gecici, 'kok.txt')).existsSync(), isTrue);
  });

  test(
    '(e) sembolik bağlantı aday ise atlanır, hedef silinmez',
    () async {
      await normalKurulum();
      await File(_p(dis, 'hedef.txt')).writeAsString('hedef');
      await Link(_p(kurulum, 'baglanti.txt')).create(_p(dis, 'hedef.txt'));
      await _eskiHam(kurulum, [_kayit('baglanti.txt', 'hedef')]);
      final s = await EskiSurumTemizleyici(kurulum).calistir();
      expect(s.silinen, isEmpty);
      expect(s.atlanan.keys, contains('baglanti.txt'));
      expect(File(_p(dis, 'hedef.txt')).existsSync(), isTrue);
      expect(Link(_p(kurulum, 'baglanti.txt')).existsSync(), isTrue);
    },
    skip: Platform.isWindows ? 'Windows’ta Link oluşturma yetki ister' : false,
  );

  test(
    '(e) link olan ara dizin atlanır, dışarıdaki dosya silinmez',
    () async {
      await normalKurulum();
      await File(_p(dis, 'x.bin')).writeAsString('x');
      await Link(_p(kurulum, 'kopru')).create(dis.path);
      await _eskiHam(kurulum, [_kayit('kopru/x.bin', 'x')]);
      final s = await EskiSurumTemizleyici(kurulum).calistir();
      expect(s.silinen, isEmpty);
      expect(s.atlanan.keys, contains('kopru/x.bin'));
      expect(File(_p(dis, 'x.bin')).existsSync(), isTrue);
      expect(Link(_p(kurulum, 'kopru')).existsSync(), isTrue);
    },
    skip: Platform.isWindows ? 'Windows’ta Link oluşturma yetki ister' : false,
  );

  test(
    '(f) kullanıcı verisi yolları eski manifestte olsa da silinmez',
    () async {
      await normalKurulum();
      await _yaz(kurulum, 'adimadim/durum.v1.json', '{}');
      await _yaz(kurulum, 'durum.v1.json', '{}');
      await _yaz(kurulum, 'durum.v1.json.bozuk-123', '{');
      await _eskiHam(kurulum, [
        _kayit('adimadim/durum.v1.json', '{}'),
        _kayit('durum.v1.json', '{}'),
        _kayit('durum.v1.json.bozuk-123', '{'),
        _kayit('eski.dll', 'eski dll'),
      ]);
      final s = await EskiSurumTemizleyici(kurulum).calistir();
      expect(s.silinen, ['eski.dll']);
      expect(s.atlanan.length, 3);
      expect(File(_p(kurulum, 'adimadim/durum.v1.json')).existsSync(), isTrue);
      expect(File(_p(kurulum, 'durum.v1.json')).existsSync(), isTrue);
      expect(File(_p(kurulum, 'durum.v1.json.bozuk-123')).existsSync(), isTrue);
      expect(Directory(_p(kurulum, 'adimadim')).existsSync(), isTrue);
    },
  );

  test('(g) özeti değişmiş dosya atlanır', () async {
    await normalKurulum();
    await File(_p(kurulum, 'eski.dll')).writeAsString('kullanici degistirdi');
    final s = await EskiSurumTemizleyici(kurulum).calistir();
    expect(s.atlanan.keys, contains('eski.dll'));
    expect(File(_p(kurulum, 'eski.dll')).existsSync(), isTrue);
    expect(s.silinen, ['data/eski/e.bin']);
    expect(s.durum, TemizlikDurumu.kismi);
  });

  group('(h) manifest fromJson', () {
    final sha = 'a' * 64;
    Map<String, Object?> m(Object? yol, {Object? boyut = 1, Object? h}) => {
      'surum': '1.0.0',
      'dosyalar': [
        {'yol': yol, 'boyut': boyut, 'sha256': h ?? sha},
      ],
    };

    test('geçerli manifest gidiş-dönüş', () {
      final x = SurumManifesti.fromJson(m('a/b.txt'));
      expect(SurumManifesti.fromJson(x.toJson()).toJson(), x.toJson());
    });
    test('tehlikeli yollar reddedilir', () {
      for (final y in [
        '../a',
        'a/../b',
        '/a',
        'C:/a',
        'C:a',
        r'a\b',
        '',
        'a//b',
        './a',
        'a/.',
        'adimadim.',
        'a/b. ',
        'a /b',
        'CON',
        'con',
        'nul.txt',
        'a/COM1',
        'LPT9.log',
      ]) {
        expect(
          () => SurumManifesti.fromJson(m(y)),
          throwsA(isA<ManifestHatasi>()),
          reason: y,
        );
      }
    });
    test('ayrılmış ada benzeyen sıradan adlar kabul edilir', () {
      for (final y in ['CON1', 'COM0', 'COM10', 'nulx', 'a.con', 'lpt']) {
        expect(SurumManifesti.fromJson(m(y)).dosyalar, hasLength(1), reason: y);
      }
    });
    test('yolKati false ise yol kabul edilir', () {
      expect(
        SurumManifesti.fromJson(m('../a'), yolKati: false).dosyalar,
        hasLength(1),
      );
    });
    test('bozuk biçimler reddedilir', () {
      expect(
        () => SurumManifesti.fromJson(null),
        throwsA(isA<ManifestHatasi>()),
      );
      expect(
        () => SurumManifesti.fromJson({'surum': 1, 'dosyalar': []}),
        throwsA(isA<ManifestHatasi>()),
      );
      expect(
        () => SurumManifesti.fromJson({'surum': '1', 'dosyalar': 5}),
        throwsA(isA<ManifestHatasi>()),
      );
      expect(
        () => SurumManifesti.fromJson(m('a', boyut: -1)),
        throwsA(isA<ManifestHatasi>()),
      );
      expect(
        () => SurumManifesti.fromJson(m('a', boyut: '1')),
        throwsA(isA<ManifestHatasi>()),
      );
      expect(
        () => SurumManifesti.fromJson(m('a', h: 'xyz')),
        throwsA(isA<ManifestHatasi>()),
      );
      expect(
        () => SurumManifesti.fromJson(m(5)),
        throwsA(isA<ManifestHatasi>()),
      );
    });
    test('yinelenen yol reddedilir', () {
      final j = m('a');
      (j['dosyalar']! as List).add((j['dosyalar']! as List).first);
      expect(() => SurumManifesti.fromJson(j), throwsA(isA<ManifestHatasi>()));
    });
  });

  group('(i) manifest üretici', () {
    test(
      'dosyaları sıralı ve /-ayırıcılı üretir, manifestleri hariç tutar',
      () async {
        await _yaz(kurulum, 'b.txt', 'bb');
        await _yaz(kurulum, 'alt/a.txt', 'a');
        await _yaz(kurulum, surumManifestAdi, 'eski');
        await _yaz(kurulum, eskiManifestAdi, 'eski');
        final m = await manifestUret(kurulum, '3.1.0');
        expect(m.surum, '3.1.0');
        expect(m.dosyalar.map((d) => d.yol), ['alt/a.txt', 'b.txt']);
        expect(m.dosyalar[1].boyut, 2);
        expect(
          m.dosyalar[0].sha256,
          await dosyaSha256(File(_p(kurulum, 'alt/a.txt'))),
        );
        expect(m.dosyalar[0].sha256, hasLength(64));
      },
    );
    test(
      'bağlantıları izlemez',
      () async {
        await File(_p(dis, 'd.txt')).writeAsString('d');
        await _yaz(kurulum, 'a.txt', 'a');
        await Link(_p(kurulum, 'kopru')).create(dis.path);
        await Link(_p(kurulum, 'dosya_baglanti')).create(_p(dis, 'd.txt'));
        final m = await manifestUret(kurulum, '1');
        expect(m.dosyalar.map((d) => d.yol), ['a.txt']);
      },
      skip: Platform.isWindows
          ? 'Windows’ta Link oluşturma yetki ister'
          : false,
    );
    test(
      'manifestYaz yazdığı dosya yeniden okunabilir ve temizleyiciyle uyumlu',
      () async {
        await _yaz(kurulum, 'a.txt', 'a');
        final f = await manifestYaz(kurulum, '1.2.3');
        expect(f.path.endsWith(surumManifestAdi), isTrue);
        final okunan = SurumManifesti.fromJson(
          jsonDecode(await f.readAsString()),
        );
        expect(okunan.dosyalar.single.yol, 'a.txt');
      },
    );
    test('boş sürüm reddedilir', () async {
      expect(() => manifestUret(kurulum, ' '), throwsArgumentError);
    });
  });
}
