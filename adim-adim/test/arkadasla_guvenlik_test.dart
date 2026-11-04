// "Arkadaşla oyna" güvenlik sertleştirme testleri: ad taklidi karakterleri,
// derinlik ve boyut DoS, puan sınırı, tekrar eden soru kimlikleri.
// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım özellikler#cihaz] Claude
// Yalnız onu yazan yapay zekâ değiştirir; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
import 'dart:convert';

import 'package:adim_adim/yarisma/arkadasla/duello_motoru.dart';
import 'package:adim_adim/yarisma/arkadasla/protokol.dart';
import 'package:adim_adim/yarisma/model.dart';
import 'package:flutter_test/flutter_test.dart';

YarismaSorusu soru(String id) => YarismaSorusu(
  id: id,
  alan: 'dil',
  seviyeKursId: 'ingilizce-1',
  kategori: YarismaKategori.genelKultur,
  soru: 'Soru $id?',
  secenekler: const ['a', 'b', 'c', 'd'],
  dogru: 0,
  aciklama: 'Açıklama',
);

String merhaba(Object? ad) => jsonEncode({
  't': 'merhaba',
  'surum': 1,
  'ozet': soruBankasiOzetiHesapla(['a']),
  'takmaAd': ad,
});

void main() {
  group('takma ad ve kimlik karakterleri', () {
    test('bidi geçersiz kılma karakteri reddedilir', () {
      final r = ProtokolMesaji.coz(
        merhaba('${String.fromCharCode(0x202E)}evil'),
      );
      expect(r, isA<ProtokolHatasi>());
      expect((r as ProtokolHatasi).neden, 'takma_ad_hatali');
    });

    test('sıfır genişlikli karakter ve BOM reddedilir', () {
      for (final kod in [0x200B, 0x200D, 0x2060, 0xFEFF, 0x2028]) {
        final c = String.fromCharCode(kod);
        final r = ProtokolMesaji.coz(merhaba('a${c}b'));
        expect(
          r,
          isA<ProtokolHatasi>(),
          reason: 'kod noktası U+${kod.toRadixString(16)}',
        );
      }
    });

    test('C1 kontrol karakteri reddedilir', () {
      final c1 = String.fromCharCode(0x85);
      expect(ProtokolMesaji.coz(merhaba('a${c1}b')), isA<ProtokolHatasi>());
    });

    test('uzunluk karakter sayılır: emoji 1 sayılır', () {
      expect(ProtokolMesaji.coz(merhaba('😀' * 24)), isA<ProtokolTamam>());
      expect(ProtokolMesaji.coz(merhaba('😀' * 25)), isA<ProtokolHatasi>());
    });

    test('ardışık boşluklar teke iner', () {
      final r = ProtokolMesaji.coz(merhaba('  Ali    Veli  '));
      final m = (r as ProtokolTamam).mesaj as Merhaba;
      expect(m.takmaAd, 'Ali Veli');
    });

    test('Türkçe harfler ve rakamlar kabul edilir', () {
      final r = ProtokolMesaji.coz(merhaba('Şükrü İğdır 7'));
      expect((r as ProtokolTamam).mesaj, isA<Merhaba>());
    });

    test('soru kimliğinde bidi karakteri reddedilir', () {
      final r = ProtokolMesaji.coz(
        jsonEncode({
          't': 'cevap',
          'soruId': 'a${String.fromCharCode(0x202E)}b',
          'secenek': 0,
          'gecenMs': 1,
        }),
      );
      expect((r as ProtokolHatasi).neden, 'soru_id_hatali');
    });
  });

  group('boyut ve derinlik', () {
    test('çok derin iç içe dizi reddedilir, çökmez', () {
      final derin = '${'[' * 200}${']' * 200}';
      final r = ProtokolMesaji.coz(derin);
      expect((r as ProtokolHatasi).neden, 'cok_derin');
    });

    test(
      'sınırdaki derinlik kabul edilir; dize içindeki parantez sayılmaz',
      () {
        final r = ProtokolMesaji.coz('{"t":"hazir","x":"${'[' * 50}"}');
        expect(r, isA<ProtokolTamam>());
      },
    );

    test('kaçışlı tırnak dize sonu sayılmaz', () {
      final r = ProtokolMesaji.coz(r'{"t":"hazir","x":"\"[[[[[[[[[[[["}');
      expect(r, isA<ProtokolTamam>());
    });

    test('dev dize bayta çevrilmeden reddedilir', () {
      final r = ProtokolMesaji.coz('x' * 100000);
      expect((r as ProtokolHatasi).neden, 'cok_buyuk');
    });

    test('Sonuc üst sınırı soru sayısına bağlı', () {
      expect(enFazlaPuan, enFazlaSoruSayisi * 15);
      expect(
        ProtokolMesaji.coz(
          jsonEncode({'t': 'sonuc', 'benimPuanim': enFazlaPuan}),
        ),
        isA<ProtokolTamam>(),
      );
      expect(
        ProtokolMesaji.coz(
          jsonEncode({'t': 'sonuc', 'benimPuanim': enFazlaPuan + 1}),
        ),
        isA<ProtokolHatasi>(),
      );
    });
  });

  group('tekrar eden soru kimlikleri', () {
    test('duelloBaslat tekrar eden kimliği eler', () {
      final d = duelloBaslat(sorular: [soru('a'), soru('a'), soru('b')]);
      expect(d.sorular.map((s) => s.id), ['a', 'b']);
    });

    test('duelloSorulariSec tekrar eden kimliği eler', () {
      final s = duelloSorulariSec([soru('x'), soru('x'), soru('y')], 7);
      expect(s.map((e) => e.id).toSet().length, s.length);
      expect(s.length, 2);
    });
  });
}
