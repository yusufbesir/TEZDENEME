// Yazı boyutu ayarı (REA önerisi 10): kalıcı, kırpılır, eski kayıtta 1,0.
import 'package:adim_adim/model/durum.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('varsayılan 1,0 ve eski kayıtta 1,0', () {
    expect(const OgrenciDurumu().yaziOlcegi, 1.0);
    final j = const OgrenciDurumu().toJson()..remove('yaziOlcegi');
    expect(OgrenciDurumu.fromJson(j).yaziOlcegi, 1.0);
  });
  test('kalıcı', () {
    final d = const OgrenciDurumu().copyWith(yaziOlcegi: 1.3);
    expect(OgrenciDurumu.fromJson(d.toJson()).yaziOlcegi, 1.3);
  });
  test('aralık dışı ve bozuk değer kırpılır', () {
    expect(OgrenciDurumu.yaziOlcegiKirp(9), 1.5);
    expect(OgrenciDurumu.yaziOlcegiKirp(0.2), 1.0);
    expect(OgrenciDurumu.yaziOlcegiKirp('x'), 1.0);
    expect(OgrenciDurumu.yaziOlcegiKirp(double.nan), 1.0);
  });
}
