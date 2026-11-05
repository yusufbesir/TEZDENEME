// Yol sekmesinde kurs grubu süzme: 1.8.0'da yalnız İngilizce/HTML/Satranç
// görünüyordu; diğer diller ve kod kursları çok aşağıda kalıyordu.
import 'package:adim_adim/bilesenler/kurs_grubu_secici.dart';
import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final dil = [
    for (final k in tumKurslar)
      if (k.alan.name == 'dil') k,
  ];
  final kod = [
    for (final k in tumKurslar)
      if (k.alan.name == 'kod') k,
  ];

  test('dil alanında tüm diller ayrı grup', () {
    final g = kursGruplari(dil);
    for (final a in [
      'ingilizce',
      'almanca',
      'fransizca',
      'rusca',
      'arapca',
      'korece',
      'japonca',
      'cince',
    ]) {
      expect(g, contains(a), reason: a);
    }
  });

  test('kod alanında HTML, Python, SQL, PHP, Go ayrı grup', () {
    final g = kursGruplari(kod);
    for (final a in ['html', 'css', 'js', 'python', 'sql', 'php', 'go']) {
      expect(g, contains(a), reason: a);
    }
  });

  test('süzme: seçili grup yalnız kendi kurslarını verir', () {
    final alm = kurslariSuz(dil, 'almanca');
    expect(alm, isNotEmpty);
    expect(alm.every((k) => kursGrubu(k) == 'almanca'), isTrue);
  });

  test('boş ya da bilinmeyen seçim tümünü verir', () {
    expect(kurslariSuz(dil, ''), dil);
    expect(kurslariSuz(dil, 'yok-boyle'), dil);
  });

  test('yolGrubu durumda kalıcı; eski kayıtta boş', () {
    final d = const OgrenciDurumu().copyWith(yolGrubu: 'almanca');
    expect(OgrenciDurumu.fromJson(d.toJson()).yolGrubu, 'almanca');
    expect(const OgrenciDurumu().yolGrubu, '');
  });
}
