// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Yer imi koleksiyonları ve notlar (ÖZELLİK 72): ekleme/kaldırma, not,
/// taşıma, koleksiyon yönetimi, geçmiş, sınırlar, çözümleme ve eski/bozuk
/// kayıtlarla uyumlu JSON.
library;

import 'dart:convert';

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/yer_imi.dart';
import 'package:adim_adim/sozluk/sozluk.dart';
import 'package:flutter_test/flutter_test.dart';

import 'yeni_ozellik_icerik.dart';

const _bugun = '2026-10-21';
final _adim = YerImleri.adimAnahtari('$tDers1#0');
final _madde = YerImleri.sozlukAnahtari('$tDers1#0', 'cat');

void main() {
  test(
    'ekle: Genel koleksiyonuna, tarih ve boş not; ikinci ekleme dokunmaz',
    () {
      var d = YerImleri.ekle(const OgrenciDurumu(), _adim, _bugun);
      expect(d.yerImleri, hasLength(1));
      expect(d.yerImleri.single.koleksiyon, 'Genel');
      expect(d.yerImleri.single.gun, _bugun);
      expect(d.yerImleri.single.not, '');
      expect(d.yerImleri.single.tur, YerImi.turAdim);
      expect(identical(YerImleri.ekle(d, _adim, _bugun), d), isTrue);
      d = YerImleri.ekle(d, _madde, _bugun);
      expect(d.yerImleri.last.tur, YerImi.turSozluk);
    },
  );

  test('geçersiz anahtar eklenmez', () {
    final d = const OgrenciDurumu();
    expect(identical(YerImleri.ekle(d, 'yanlis', _bugun), d), isTrue);
    expect(identical(YerImleri.ekle(d, 'adim:kartsiz', _bugun), d), isTrue);
  });

  test('degistir: ekler, ikinci çağrıda kaldırır ve geçmişten de siler', () {
    var d = YerImleri.degistir(const OgrenciDurumu(), _adim, _bugun);
    d = YerImleri.gecmiseEkle(d, _adim);
    expect(d.yerImiGecmisi, [_adim]);
    d = YerImleri.degistir(d, _adim, _bugun);
    expect(d.yerImleri, isEmpty);
    expect(d.yerImiGecmisi, isEmpty);
  });

  test('not yaz: kırpar, 200 karaktere kısaltır, boş not siler', () {
    var d = YerImleri.ekle(const OgrenciDurumu(), _adim, _bugun);
    d = YerImleri.notYaz(d, _adim, '  kedi  ');
    expect(d.yerImleri.single.not, 'kedi');
    d = YerImleri.notYaz(d, _adim, 'a' * 500);
    expect(d.yerImleri.single.not.length, YerImi.notEnCok);
    d = YerImleri.notYaz(d, _adim, '   ');
    expect(d.yerImleri.single.not, '');
    // Olmayan yer imine not yazılmaz.
    expect(identical(YerImleri.notYaz(d, _madde, 'x'), d), isTrue);
  });

  test('taşı: yeni koleksiyon açılır; koleksiyon listesi ve sıra', () {
    var d = YerImleri.ekle(const OgrenciDurumu(), _adim, _bugun);
    d = YerImleri.ekle(d, _madde, _bugun);
    d = YerImleri.tasi(d, _madde, '  Sınav   kelimeleri ');
    expect(d.koleksiyonlar, ['Sınav kelimeleri']);
    expect(YerImleri.koleksiyonAdlari(d), ['Genel', 'Sınav kelimeleri']);
    expect(
      YerImleri.koleksiyonYerImleri(d, 'Sınav kelimeleri').single.anahtar,
      _madde,
    );
    expect(YerImleri.koleksiyonYerImleri(d, 'Genel').single.anahtar, _adim);
    // Boş ad geçersiz: taşıma olmaz.
    expect(identical(YerImleri.tasi(d, _adim, '  '), d), isTrue);
  });

  test('koleksiyon ekle/sil: silinen koleksiyonun yer imleri Genel olur', () {
    var d = YerImleri.koleksiyonEkle(const OgrenciDurumu(), 'Yol');
    expect(d.koleksiyonlar, ['Yol']);
    d = YerImleri.koleksiyonEkle(d, 'Yol'); // tekrarsız
    d = YerImleri.koleksiyonEkle(d, 'Genel'); // örtük
    expect(d.koleksiyonlar, ['Yol']);
    d = YerImleri.ekle(d, _adim, _bugun, koleksiyon: 'Yol');
    expect(d.yerImleri.single.koleksiyon, 'Yol');
    d = YerImleri.koleksiyonSil(d, 'Yol');
    expect(d.koleksiyonlar, isEmpty);
    expect(d.yerImleri.single.koleksiyon, 'Genel');
    expect(identical(YerImleri.koleksiyonSil(d, 'Genel'), d), isTrue);
  });

  test('koleksiyon sayısı ve ad uzunluğu sınırlı', () {
    var d = const OgrenciDurumu();
    for (var i = 0; i < YerImi.koleksiyonEnCok + 5; i++) {
      d = YerImleri.koleksiyonEkle(d, 'K$i');
    }
    expect(d.koleksiyonlar, hasLength(YerImi.koleksiyonEnCok));
    expect(YerImleri.adTemizle('x' * 31), isNull);
    expect(YerImleri.adTemizle('  '), isNull);
  });

  test('geçmiş: en yeni başta, tekrarsız, en çok 30; temizlenir', () {
    var d = const OgrenciDurumu();
    for (var i = 0; i < 35; i++) {
      d = YerImleri.ekle(d, YerImleri.adimAnahtari('$tDers1#$i'), _bugun);
      d = YerImleri.gecmiseEkle(d, YerImleri.adimAnahtari('$tDers1#$i'));
    }
    expect(d.yerImiGecmisi, hasLength(YerImi.gecmisEnCok));
    expect(d.yerImiGecmisi.first, YerImleri.adimAnahtari('$tDers1#34'));
    d = YerImleri.gecmiseEkle(d, YerImleri.adimAnahtari('$tDers1#20'));
    expect(d.yerImiGecmisi.first, YerImleri.adimAnahtari('$tDers1#20'));
    expect(
      d.yerImiGecmisi.where((a) => a == YerImleri.adimAnahtari('$tDers1#20')),
      hasLength(1),
    );
    d = YerImleri.gecmisiTemizle(d);
    expect(d.yerImiGecmisi, isEmpty);
    // Yer imi olmayan anahtar geçmişe girmez.
    expect(
      identical(YerImleri.gecmiseEkle(d, YerImleri.adimAnahtari('x#1')), d),
      isTrue,
    );
  });

  test('toplam yer imi sayısı sınırlı', () {
    var d = const OgrenciDurumu();
    for (var i = 0; i < YerImi.enCok + 10; i++) {
      d = YerImleri.ekle(d, YerImleri.adimAnahtari('$tDers1#$i'), _bugun);
    }
    expect(d.yerImleri, hasLength(YerImi.enCok));
  });

  test(
    'çöz: ders adımı soru ve doğru cevap, sözlük maddesi anlam, kayıp içerik',
    () {
      final kurslar = [hayvanKursu];
      final sozluk = Sozluk.kurslardan(kurslar);
      final a = YerImleri.coz(_adim, kurslar, sozluk);
      expect(a.baslik, 'Eşleştir');
      expect(a.altBaslik, contains('cat = kedi'));
      expect(a.rota, '/ders/$tDers1');
      final m = YerImleri.coz(_madde, kurslar, sozluk);
      expect(m.baslik, 'cat');
      expect(m.altBaslik, 'kedi');
      expect(m.rota, '/sozluk?q=cat');
      final yok = YerImleri.coz(
        YerImleri.adimAnahtari('yok.u1.d1#0'),
        kurslar,
        sozluk,
      );
      expect(yok.rota, isNull);
      final yokMadde = YerImleri.coz(
        YerImleri.sozlukAnahtari('$tDers1#0', 'zzz'),
        kurslar,
        sozluk,
      );
      expect(yokMadde.rota, isNull);
    },
  );

  test('JSON gidiş dönüş korunur', () {
    var d = YerImleri.ekle(const OgrenciDurumu(), _adim, _bugun, not: 'önemli');
    d = YerImleri.ekle(d, _madde, _bugun, koleksiyon: 'Sınav');
    d = YerImleri.gecmiseEkle(d, _madde);
    final j = jsonDecode(jsonEncode(d.toJson())) as Map<String, Object?>;
    final geri = OgrenciDurumu.fromJson(j);
    expect(geri.yerImleri.map((y) => y.anahtar), [_adim, _madde]);
    expect(geri.yerImleri.first.not, 'önemli');
    expect(geri.yerImleri.last.koleksiyon, 'Sınav');
    expect(geri.koleksiyonlar, ['Sınav']);
    expect(geri.yerImiGecmisi, [_madde]);
  });

  test('eski kayıtta alan yoksa boş; bozuk girdiler atlanır', () {
    final eski = OgrenciDurumu.fromJson({'surum': 1, 'xp': 5});
    expect(eski.yerImleri, isEmpty);
    expect(eski.koleksiyonlar, isEmpty);
    expect(eski.yerImiGecmisi, isEmpty);
    final bozuk = OgrenciDurumu.fromJson({
      'yerImleri': [
        42,
        {'anahtar': 'yanlis'},
        {'anahtar': _adim, 'koleksiyon': '', 'not': 5, 'gun': 'bozuk'},
        {'anahtar': _adim}, // tekrar
        {'anahtar': _madde, 'koleksiyon': 'x' * 99, 'not': 'a' * 999},
      ],
      'koleksiyonlar': ['  ', 7, 'Tamam', 'Tamam', 'y' * 99],
      'yerImiGecmisi': ['bozuk', _adim, _adim, 3],
    });
    expect(bozuk.yerImleri, hasLength(2));
    expect(bozuk.yerImleri.first.koleksiyon, 'Genel');
    expect(bozuk.yerImleri.first.not, '');
    expect(bozuk.yerImleri.first.gun, isNull);
    expect(bozuk.yerImleri.last.koleksiyon, 'Genel');
    expect(bozuk.yerImleri.last.not.length, YerImi.notEnCok);
    expect(bozuk.koleksiyonlar, ['Tamam']);
    expect(bozuk.yerImiGecmisi, [_adim]);
  });
}
