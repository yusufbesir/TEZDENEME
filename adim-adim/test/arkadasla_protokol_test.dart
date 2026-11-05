// "Arkadaşla oyna" protokolü testleri: gidiş-dönüş, güvenilmeyen girdi, özet.
// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım özellikler#cihaz] Claude
// Yalnız onu yazan yapay zekâ değiştirir; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
import 'dart:convert';

import 'package:adim_adim/yarisma/arkadasla/protokol.dart';
import 'package:flutter_test/flutter_test.dart';

ProtokolMesaji? coz(String s) {
  final r = ProtokolMesaji.coz(s);
  return r is ProtokolTamam ? r.mesaj : null;
}

String hata(Object? girdi) {
  final r = ProtokolMesaji.coz(girdi);
  expect(r, isA<ProtokolHatasi>(), reason: 'girdi: $girdi');
  return (r as ProtokolHatasi).neden;
}

void main() {
  final ozet = soruBankasiOzetiHesapla(['a', 'b']);

  group('gidiş-dönüş', () {
    test('Merhaba', () {
      final m = coz(
        Merhaba(
          surum: protokolSurumu,
          soruBankasiOzeti: ozet,
          takmaAd: 'Yusuf',
        ).kodla(),
      );
      expect(m, isA<Merhaba>());
      final h = m! as Merhaba;
      expect(h.surum, protokolSurumu);
      expect(h.soruBankasiOzeti, ozet);
      expect(h.takmaAd, 'Yusuf');
    });

    test('Hazir', () => expect(coz(const Hazir().kodla()), isA<Hazir>()));

    test('DuelloBasla', () {
      final m = coz(
        const DuelloBasla(
          soruIdleri: ['x.1', 'x.2'],
          ilkSiraSende: true,
        ).kodla(),
      );
      final b = m! as DuelloBasla;
      expect(b.soruIdleri, ['x.1', 'x.2']);
      expect(b.ilkSiraSende, isTrue);
    });

    test('Cevap', () {
      final m = coz(
        const Cevap(soruId: 'q', secenek: 3, gecenMs: 1234).kodla(),
      );
      final c = m! as Cevap;
      expect(c.soruId, 'q');
      expect(c.secenek, 3);
      expect(c.gecenMs, 1234);
    });

    test('Sonuc', () {
      final m = coz(const Sonuc(benimPuanim: 87).kodla());
      expect((m! as Sonuc).benimPuanim, 87);
    });

    test('Ayril', () => expect(coz(const Ayril().kodla()), isA<Ayril>()));

    test('fromJson haritadan çalışır', () {
      final r = ProtokolMesaji.fromJson({'t': 'hazir'});
      expect(r, isA<ProtokolTamam>());
    });

    test('tür alanları kararlı', () {
      expect(const Hazir().tur, 'hazir');
      expect(const Ayril().tur, 'ayril');
      expect(const Cevap(soruId: 'q', secenek: 0, gecenMs: 0).tur, 'cevap');
    });
  });

  group('güvenilmeyen girdi', () {
    test('bozuk JSON', () => expect(hata('{bozuk'), 'bozuk_json'));
    test('metin değil', () => expect(hata(42), 'metin_degil'));
    test('null', () => expect(hata(null), 'metin_degil'));
    test('nesne değil', () => expect(hata('[1,2]'), 'nesne_degil'));
    test('tür yok', () => expect(hata('{}'), 'tur_yok'));
    test('tür yanlış tipli', () => expect(hata('{"t":5}'), 'tur_yok'));
    test(
      'bilinmeyen tür',
      () => expect(hata('{"t":"hile"}'), 'bilinmeyen_tur'),
    );

    test('Merhaba: takma ad 24 sınırı', () {
      String yap(String ad) =>
          jsonEncode({'t': 'merhaba', 'surum': 1, 'ozet': ozet, 'takmaAd': ad});
      expect(coz(yap('a' * 24)), isA<Merhaba>());
      expect(hata(yap('a' * 25)), 'takma_ad_hatali');
      expect(hata(yap('   ')), 'takma_ad_hatali');
    });

    test('Merhaba: eksik ya da yanlış tipli alanlar', () {
      expect(hata('{"t":"merhaba"}'), 'surum_hatali');
      expect(
        hata(
          jsonEncode({
            't': 'merhaba',
            'surum': '1',
            'ozet': ozet,
            'takmaAd': 'a',
          }),
        ),
        'surum_hatali',
      );
      expect(
        hata(
          jsonEncode({
            't': 'merhaba',
            'surum': 1,
            'ozet': 'kisa',
            'takmaAd': 'a',
          }),
        ),
        'ozet_hatali',
      );
      expect(
        hata(
          jsonEncode({'t': 'merhaba', 'surum': 1, 'ozet': ozet, 'takmaAd': 7}),
        ),
        'takma_ad_hatali',
      );
    });

    test('DuelloBasla: öğe sayısı ve id uzunluğu sınırı', () {
      String yap(Object idler, [Object? sira = true]) =>
          jsonEncode({'t': 'basla', 'soruIdleri': idler, 'ilkSiraSende': sira});
      expect(coz(yap(List.generate(20, (i) => 'id$i'))), isA<DuelloBasla>());
      expect(hata(yap(List.generate(21, (i) => 'id$i'))), 'soru_idleri_hatali');
      expect(hata(yap(<String>[])), 'soru_idleri_hatali');
      expect(hata(yap(['a' * 65])), 'soru_id_hatali');
      expect(coz(yap(['a' * 64])), isA<DuelloBasla>());
      expect(hata(yap([1, 2])), 'soru_id_hatali');
      expect(hata(yap('metin')), 'soru_idleri_hatali');
      expect(hata(yap(['a'], 'evet')), 'sira_hatali');
    });

    test('Cevap: seçenek ve süre sınırları', () {
      String yap(Object? id, Object? s, Object? ms) =>
          jsonEncode({'t': 'cevap', 'soruId': id, 'secenek': s, 'gecenMs': ms});
      expect(coz(yap('q', 0, 0)), isA<Cevap>());
      expect(hata(yap('q', 4, 10)), 'secenek_hatali');
      expect(hata(yap('q', -1, 10)), 'secenek_hatali');
      expect(hata(yap('q', 1.5, 10)), 'secenek_hatali');
      expect(hata(yap('q', 1, -5)), 'sure_hatali');
      expect(hata(yap('q', 1, 'hızlı')), 'sure_hatali');
      expect(hata(yap(null, 1, 5)), 'soru_id_hatali');
      expect(hata(yap('', 1, 5)), 'soru_id_hatali');
    });

    test('Sonuc: puan sınırı', () {
      expect(hata('{"t":"sonuc","benimPuanim":-1}'), 'puan_hatali');
      expect(hata('{"t":"sonuc","benimPuanim":"9"}'), 'puan_hatali');
      expect(hata('{"t":"sonuc"}'), 'puan_hatali');
    });

    test('4096 baytı aşan mesaj reddedilir', () {
      final dev = jsonEncode({
        't': 'merhaba',
        'surum': 1,
        'ozet': ozet,
        'takmaAd': 'a',
        'cop': 'x' * 5000,
      });
      expect(hata(dev), 'cok_buyuk');
    });

    test('bayt sınırı karakter değil UTF-8 baytıdır', () {
      // 2000 adet 2 baytlık karakter = 4000 bayt + sarmalayıcı > 4096 olmayabilir; 2100 ile aşar.
      final dev = jsonEncode({'t': 'hazir', 'cop': 'ğ' * 2100});
      expect(hata(dev), 'cok_buyuk');
    });

    test('fromJson aşırı büyük haritayı da reddeder', () {
      final r = ProtokolMesaji.fromJson({'t': 'hazir', 'cop': 'x' * 5000});
      expect(r, isA<ProtokolHatasi>());
    });

    test('rastgele çöp girdiler çökmez', () {
      for (final s in [
        '',
        ' ',
        'null',
        'true',
        '"x"',
        '{"t":null}',
        '\u0000',
        '{{{{',
      ]) {
        expect(() => ProtokolMesaji.coz(s), returnsNormally);
        expect(ProtokolMesaji.coz(s), isA<ProtokolHatasi>());
      }
    });
  });

  group('soruBankasiOzetiHesapla', () {
    test('sha256 hex, 64 karakter, deterministik', () {
      final a = soruBankasiOzetiHesapla(['a', 'b', 'c']);
      expect(a, hasLength(64));
      expect(a, matches(RegExp(r'^[0-9a-f]{64}$')));
      expect(soruBankasiOzetiHesapla(['a', 'b', 'c']), a);
    });

    test('sıra bağımsız DEĞİL, sıralıdır', () {
      expect(
        soruBankasiOzetiHesapla(['a', 'b']),
        isNot(soruBankasiOzetiHesapla(['b', 'a'])),
      );
    });

    test('farklı kümeler farklı özet verir', () {
      expect(
        soruBankasiOzetiHesapla(['a', 'b']),
        isNot(soruBankasiOzetiHesapla(['a', 'b', 'c'])),
      );
      expect(
        soruBankasiOzetiHesapla(['ab']),
        isNot(soruBankasiOzetiHesapla(['a', 'b'])),
      );
    });

    test('boş liste hata vermez', () {
      expect(soruBankasiOzetiHesapla([]), hasLength(64));
    });
  });
}
