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

  // SADE 4 (güvenlik): yedek/ilerleme dosyası şema doğrulama. Bozuk JSON
  // örnekleri; geçersiz alan yalnız kendi varsayılanına döner, diğerleri kalır.
  group('şema doğrulama (OgrenciDurumu.fromJson)', () {
    final doluJson = dolu.toJson();

    test('negatif ve aralık dışı sayılar alan bazında varsayılana döner', () {
      final d = OgrenciDurumu.fromJson({
        ...doluJson,
        'xp': -5,
        'seri': 1 << 50,
        'enSeri': -1,
        'gunlukHedef': 5,
        'haftalikHedefGun': 99,
        'aylikHedefDers': 0,
        'gunlukDakikaHedefi': 100000,
        'geriKazanmaGun': 7,
        'eslestirmeEnIyiMs': -20,
        'oturumKartSayisi': 7,
      });
      expect(d.xp, 0);
      expect(d.seri, 0);
      expect(d.enSeri, 0);
      expect(d.gunlukHedef, 30);
      expect(d.haftalikHedefGun, OgrenciDurumu.varsayilanHaftalikHedef);
      expect(d.aylikHedefDers, OgrenciDurumu.varsayilanAylikHedef);
      expect(d.gunlukDakikaHedefi, 0);
      expect(d.geriKazanmaGun, 0);
      expect(d.eslestirmeEnIyiMs, isNull);
      expect(d.oturumKartSayisi, OgrenciDurumu.varsayilanOturumKarti);
      // Geçerli alanlar olduğu gibi kalır.
      expect(d.ad, 'Ayşe');
      expect(d.kartlar.keys, ['d1#0']);
      expect(d.tamamlanan, {'d1': 2});
    });

    test('yanlış türler (sayı yerine dize, harita yerine liste) atılır', () {
      final d = OgrenciDurumu.fromJson({
        ...doluJson,
        'xp': '12',
        'sesAcik': 'evet',
        'koyuTema': 1,
        'kartlar': [1, 2, 3],
        'gunlukXp': 'çok',
        'hatalar': {'a': 1},
        'gunluk': 'yok',
        'bilmece': 'dün doğru',
        'calismaPlani': [],
        'satranc': 42,
        'kodProjeleri': {'id': 'p'},
        'kelimeNotlari': ['not'],
      });
      expect(d.xp, 0);
      expect(d.sesAcik, isTrue);
      expect(d.koyuTema, isNull);
      expect(d.kartlar, isEmpty);
      expect(d.gunlukXp, isEmpty);
      expect(d.hatalar, isEmpty);
      expect(d.gunluk, isEmpty);
      expect(d.bilmece, isNull);
      expect(d.calismaPlani, isNull);
      expect(d.kodProjeleri, isEmpty);
      expect(d.kelimeNotlari, isEmpty);
      expect(d.tamamlanan, {'d1': 2});
      expect(d.seri, 4);
    });

    test('çok uzun dizeler kırpılır ya da atılır, diğer alanlar kalır', () {
      final uzun = 'a' * 10000;
      final d = OgrenciDurumu.fromJson({
        ...doluJson,
        'ad': 'ÇğŞ$uzun',
        'sonDersId': uzun,
        'sonBasarisizDers': uzun,
        'alan': uzun,
        'kelimeNotlari': {'d1#0': uzun, 'd1#1': 'kısa not'},
        'haftalikNotlar': {'2025-05-05': uzun},
        'kartlar': {
          '$uzun#0': {'kutu': 2, 'sonraki': '2025-05-14'},
          'd1#0': {'kutu': 3, 'sonraki': '2025-05-14'},
        },
      });
      expect(d.ad.runes.length, 40);
      expect(d.ad, startsWith('ÇğŞ'));
      expect(d.sonDersId, isNull);
      expect(d.sonBasarisizDers, isNull);
      expect(d.alan, isNull);
      expect(d.kelimeNotlari, {'d1#1': 'kısa not'});
      expect(
        d.haftalikNotlar['2025-05-05']!.length,
        OgrenciDurumu.haftalikNotEnCokKarakter,
      );
      expect(d.kartlar.keys, ['d1#0']);
      expect(d.xp, 345);
    });

    test('10k elemanlı liste ve haritalar üst sınırda kırpılır', () {
      String gun(int i) {
        final t = DateTime.utc(2000, 1, 1).add(Duration(days: i));
        return '${t.year.toString().padLeft(4, '0')}-'
            '${t.month.toString().padLeft(2, '0')}-'
            '${t.day.toString().padLeft(2, '0')}';
      }

      const n = 10000;
      final d = OgrenciDurumu.fromJson({
        'gunluk': [
          for (var i = 0; i < n; i++)
            {'gun': gun(i), 'tur': 'ders', 'id': 'd$i', 'xp': i},
        ],
        'hatalar': [
          for (var i = 0; i < n; i++)
            {'tur': 'kart', 'id': 'd$i#0', 'seviye': 's', 'gun': gun(i)},
        ],
        'gunlukXp': {for (var i = 0; i < n; i++) gun(i): i},
        'tamamlanan': {for (var i = 0; i < n; i++) 'ders$i': 1},
        'atlananDersler': [for (var i = 0; i < n; i++) 'ders$i'],
        'altinUniteler': [for (var i = 0; i < n; i++) 'u$i'],
        'araSinavlar': {
          for (var i = 0; i < n; i++)
            'u$i': {'dogru': 1, 'toplam': 2, 'gun': gun(0)},
        },
        'rozetler': [for (var i = 0; i < n; i++) 'r$i'],
        'koleksiyonlar': [for (var i = 0; i < n; i++) 'k$i'],
        'yerImleri': [
          for (var i = 0; i < n; i++) {'anahtar': 'adim:d$i#0'},
        ],
      });
      expect(d.gunluk.length, GunlukKayit.enCok);
      // En yeni kayıtlar (listenin sonu) tutulur.
      expect(d.gunluk.last.id, 'd${n - 1}');
      expect(d.hatalar.length, HataKaydi.enCok);
      expect(d.gunlukXp.length, OgrenciDurumu.gunlukXpEnCok);
      expect(d.gunlukXp.containsKey(gun(n - 1)), isTrue);
      expect(d.gunlukXp.containsKey(gun(0)), isFalse);
      expect(d.tamamlanan.length, OgrenciDurumu.sayacEnCok);
      expect(d.atlananDersler.length, OgrenciDurumu.kumeEnCok);
      expect(d.altinUniteler.length, OgrenciDurumu.kumeEnCok);
      expect(d.araSinavlar.length, OgrenciDurumu.sinavEnCok);
      expect(d.rozetler.length, OgrenciDurumu.rozetEnCok);
      expect(d.koleksiyonlar.length, YerImi.koleksiyonEnCok);
      expect(d.yerImleri.length, YerImi.enCok);
    });

    test('kart haritası üst sınırda kırpılır, geçersiz kartlar atlanır', () {
      final ham = <String, Object?>{
        for (var i = 0; i < OgrenciDurumu.kartEnCok + 500; i++)
          'd#$i': {'kutu': 1 + i % 5, 'sonraki': '2025-05-14'},
      };
      ham['bozuk#1'] = {'kutu': 9, 'sonraki': '2025-05-14'};
      ham['bozuk#2'] = {'kutu': 2, 'sonraki': '2025-02-30'};
      ham['bozuk#3'] = {'kutu': 'iki', 'sonraki': '2025-05-14'};
      ham['anahtarsiz'] = {'kutu': 2, 'sonraki': '2025-05-14'};
      ham[''] = {'kutu': 2, 'sonraki': '2025-05-14'};
      final d = OgrenciDurumu.fromJson({'xp': 9, 'kartlar': ham});
      expect(d.kartlar.length, OgrenciDurumu.kartEnCok);
      expect(d.kartlar.containsKey('bozuk#1'), isFalse);
      expect(d.kartlar.containsKey('bozuk#2'), isFalse);
      expect(d.kartlar.containsKey('bozuk#3'), isFalse);
      expect(d.kartlar.containsKey('anahtarsiz'), isFalse);
      expect(d.kartlar.containsKey(''), isFalse);
      expect(d.xp, 9);
    });

    test('geçersiz tarihler (takvim dışı, biçim dışı) alan bazında düşer', () {
      final d = OgrenciDurumu.fromJson({
        ...doluJson,
        'sonGun': '2025-02-30',
        'sonTekrarBildirimGunu': '10.05.2025',
        'geriKazanmaSon': '1999-01-01',
        'seriKorumaHafta': 20250510,
        'gunlukXp': {'2025-05-10': 35, '2025-13-01': 5, 'dün': 1},
        'bilmece': {'gun': '2025-5-1', 'dogru': true},
        'kelimeEklenme': {'elma': '2025-05-10', 'armut': '2025-05-32'},
      });
      expect(d.sonGun, isNull);
      expect(d.sonTekrarBildirimGunu, isNull);
      expect(d.geriKazanmaSon, isNull);
      expect(d.seriKorumaHafta, isNull);
      expect(d.gunlukXp, {'2025-05-10': 35});
      expect(d.bilmece, isNull);
      expect(d.kelimeEklenme, {'elma': '2025-05-10'});
      expect(d.xp, 345);
    });

    test('bilinmeyen alanlar hata vermez; yazılmaz, diğerleri korunur', () {
      final d = OgrenciDurumu.fromJson({
        ...doluJson,
        'gelecekAlan': {
          'ic': [1, 2, 3],
        },
        'baskaAlan': null,
        'surum': 99,
      });
      ayniMi(d, dolu);
      expect(d.toJson().containsKey('gelecekAlan'), isFalse);
      expect(d.toJson()['surum'], 1);
    });

    test('tüm alanlar bozuksa sonuç varsayılan durumla aynıdır', () {
      final hepsiBozuk = {
        for (final k in const OgrenciDurumu().toJson().keys) k: [1, 2],
        // [1, 2] çalışma saatleri için geçerli bir değerdir (0..23); bu alan
        // için aralık dışı ve türü yanlış girdilerden oluşan bozuk liste verilir.
        'calismaSaatleri': [24, -1, 'x', 2.5],
      };
      ayniMi(OgrenciDurumu.fromJson(hepsiBozuk), const OgrenciDurumu());
      ayniMi(OgrenciDurumu.fromJson(null), const OgrenciDurumu());
      ayniMi(OgrenciDurumu.fromJson('metin'), const OgrenciDurumu());
    });

    test('geriye uyum: eski geçerli JSON aynen yüklenir', () {
      final eski = {
        'surum': 1,
        'xp': 120,
        'seri': 2,
        'enSeri': 3,
        'sonGun': '2024-12-31',
        'kartlar': {
          'ingilizce-1-u1-d2#4': {'kutu': 4, 'sonraki': '2025-01-08'},
        },
        'tamamlanan': {'ingilizce-1-u1-d2': 1},
        'gunlukXp': {'2024-12-31': 20},
        'gunlukHedef': 30,
        'ad': 'Ali',
      };
      final d = OgrenciDurumu.fromJson(eski);
      expect(d.xp, 120);
      expect(d.seri, 2);
      expect(d.enSeri, 3);
      expect(d.sonGun, '2024-12-31');
      final kart = d.kartlar['ingilizce-1-u1-d2#4']!;
      expect(kart.kutu, 4);
      expect(kart.yariOmurGun, Kart.kutudanYariOmur(4));
      expect(d.tamamlanan, {'ingilizce-1-u1-d2': 1});
      expect(d.gunlukXp, {'2024-12-31': 20});
      expect(d.ad, 'Ali');
      expect(d.ilkAcilisTamam, isFalse);
      // Yeniden yazıp okumak aynı durumu verir.
      ayniMi(OgrenciDurumu.fromJson(d.toJson()), d);
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

    test('kök harita değilse dosya .bozuk-* olarak kenara alınır', () async {
      await yaz('[1,2,3]');
      ayniMi(await depo.yukle(), const OgrenciDurumu());
      expect(await dosya.exists(), isFalse);
      final kenar = await dosya.parent
          .list()
          .where((e) => e.path.contains('.bozuk-'))
          .toList();
      expect(kenar, hasLength(1));
      expect(await File(kenar.single.path).readAsString(), '[1,2,3]');
    });

    test(
      'kısmen bozuk dosya kenara alınmaz, geçerli alanlar yüklenir',
      () async {
        await yaz(
          jsonEncode({
            'xp': 77,
            'ad': 'x' * 5000,
            'kartlar': {
              'd1#0': 'bozuk',
              'd1#1': {'kutu': 2, 'sonraki': '2025-05-14'},
            },
            'gunluk': [for (var i = 0; i < 10000; i++) 'bozuk'],
          }),
        );
        final d = await depo.yukle();
        expect(d.xp, 77);
        expect(d.ad.length, 40);
        expect(d.kartlar.keys, ['d1#1']);
        expect(d.gunluk, isEmpty);
        expect(await dosya.exists(), isTrue);
        final liste = await dosya.parent.list().map((e) => e.path).toList();
        expect(liste.where((p) => p.contains('.bozuk-')), isEmpty);
      },
    );

    test(
      'artık .tmp varken yükleme ana dosyayı okur, kayıt .tmp bırakmaz',
      () async {
        await depo.kaydet(const OgrenciDurumu(xp: 11));
        await File('${dosya.path}.tmp').writeAsString('{yarım');
        expect((await depo.yukle()).xp, 11);
        await depo.kaydet(const OgrenciDurumu(xp: 12));
        expect(await File('${dosya.path}.tmp').exists(), isFalse);
        final j = jsonDecode(await dosya.readAsString()) as Map;
        expect(j['surum'], 1);
        expect(j['xp'], 12);
      },
    );

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
