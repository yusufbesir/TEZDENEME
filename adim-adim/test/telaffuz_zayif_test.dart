// Telaffuz en zayıf hece sayacı testleri.
// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım özellikler#cihaz] Claude
// Yalnız onu yazan yapay zekâ değiştirir; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
import 'package:adim_adim/motor/telaffuz.dart';
import 'package:adim_adim/motor/telaffuz_zayif.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('sayar ve en sık heceleri sıralar', () {
    var k = const ZayifHeceKaydi();
    k = k.ekle(['tion', 'ough']);
    k = k.ekle(['tion']);
    k = k.ekle(['Tion', 'a']);
    final e = k.enSik(adet: 2);
    expect(e.first, (hece: 'tion', sayi: 3));
    expect(e.length, 2);
    expect(e[1].sayi, 1);
  });

  test('değiştirilemez: eski kayıt bozulmaz', () {
    const a = ZayifHeceKaydi();
    final b = a.ekle(['x']);
    expect(a.sayilar, isEmpty);
    expect(b.sayilar['x'], 1);
    expect(() => b.sayilar['x'] = 5, throwsUnsupportedError);
  });

  test('boş ve aşırı uzun hece yok sayılır', () {
    final k = const ZayifHeceKaydi().ekle(['', '   ', 'a' * 13, 'ok']);
    expect(k.sayilar.keys, ['ok']);
  });

  test('tür sınırı aşılmaz, en az görülen atılır', () {
    var k = const ZayifHeceKaydi();
    for (var i = 0; i < zayifHeceEnFazlaTur + 50; i++) {
      k = k.ekle(['h$i', 'h$i']);
    }
    expect(k.sayilar.length, lessThanOrEqualTo(zayifHeceEnFazlaTur));
  });

  test('bozuk kalıcı veri çökertmez', () {
    expect(ZayifHeceKaydi.fromJson(null).sayilar, isEmpty);
    expect(ZayifHeceKaydi.fromJson('x').sayilar, isEmpty);
    final k = ZayifHeceKaydi.fromJson({
      'a': 2,
      'b': 'x',
      3: 1,
      'c': -4,
      ' ': 1,
    });
    expect(k.sayilar, {'a': 2});
    expect(ZayifHeceKaydi.fromJson(k.toJson()).sayilar, {'a': 2});
  });

  test('telaffuzTahmini çıktısıyla uyumlu', () {
    final t = telaffuzTahmini('nation station', 'nation');
    final k = const ZayifHeceKaydi().ekle(t.hataliHeceler);
    expect(k.enSik(), isNotEmpty);
  });
}
