// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Çok kurslu öğrenme yolu (ÖZELLİK 74): yol -> seviye -> kurs, yüzde
/// ilerleme, gerçek kurs listesinden türetme (Web: HTML -> CSS -> JS).
library;

import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/ogrenme_yolu.dart';
import 'package:flutter_test/flutter_test.dart';

import 'yeni_ozellik_icerik.dart';

void main() {
  final tumu = tumKurslar;

  test('gerçek kurslar: Web yolu HTML -> CSS -> JS, seviye başına üçlü', () {
    final yollar = OgrenmeYolu.uret(const OgrenciDurumu(), tumu);
    final web = yollar.firstWhere((y) => y.kimlik == 'web');
    expect(web.ad, 'Web');
    expect(web.seviyeler, hasLength(3));
    for (final s in web.seviyeler) {
      expect(s.kurslar.map((k) => k.kurs.id.split('-').first), [
        'html',
        'css',
        'js',
      ]);
    }
    expect(web.seviyeler.map((s) => s.sira), [1, 2, 3]);
    expect(web.seviyeler.first.etiket, 'Seviye 1');
    expect(web.yuzde, 0);
  });

  test(
    'gerçek kurslar: İngilizce A1..B2 CEFR etiketleriyle, Python ayrı yol',
    () {
      final yollar = OgrenmeYolu.uret(const OgrenciDurumu(), tumu);
      final en = yollar.firstWhere((y) => y.kimlik == 'ingilizce');
      expect(en.ad, 'İngilizce');
      expect(en.seviyeler.map((s) => s.etiket), ['A1', 'A2', 'B1', 'B2']);
      expect(yollar.any((y) => y.kimlik == 'python'), isTrue);
      // Her kurs tam bir yolda ve tek kez geçer.
      final kimlikler = [
        for (final y in yollar) ...y.kurslar.map((k) => k.kurs.id),
      ];
      expect(kimlikler.toSet(), hasLength(kimlikler.length));
      expect(kimlikler.toSet(), {for (final k in tumu) k.id});
    },
  );

  test('yüzde: biten ve atlanan dersler sayılır; kurs, seviye ve yol', () {
    final html1 = tumu.firstWhere((k) => k.id == 'html-1');
    final dersler = html1.tumDersler.toList();
    final d = OgrenciDurumu(
      tamamlanan: {dersler[0].id: 2},
      atlananDersler: {dersler[1].id},
    );
    final yollar = OgrenmeYolu.uret(d, tumu);
    final web = yollar.firstWhere((y) => y.kimlik == 'web');
    final k = web.seviyeler.first.kurslar.first;
    expect(k.kurs.id, 'html-1');
    expect(k.biten, 2);
    expect(k.toplam, dersler.length);
    expect(k.yuzde, (100 * 2 / dersler.length).floor());
    expect(web.seviyeler.first.biten, 2);
    expect(web.biten, 2);
    expect(web.yuzde, lessThan(k.yuzde));
    // Hiç ders bitmeyen yol 0.
    expect(yollar.firstWhere((y) => y.kimlik == 'python').yuzde, 0);
  });

  test('tamamen bitmiş kurs %100', () {
    final d = OgrenciDurumu(
      tamamlanan: {for (final x in hayvanKursu.tumDersler) x.id: 1},
    );
    final y = OgrenmeYolu.uret(d, [hayvanKursu]).single;
    expect(y.yuzde, 100);
    expect(y.seviyeler.single.yuzde, 100);
    expect(y.seviyeler.single.kurslar.single.oran, 1);
  });

  test('tabloda olmayan taban kendi yolu; kimliksiz kurs seviye 1', () {
    final garip = Kurs(
      id: 'rusca-2',
      ad: 'Rusça B1',
      aciklama: '',
      alan: KursAlani.dil,
      uniteler: const [],
    );
    final yok = Kurs(
      id: 'tek',
      ad: 'Tek kurs',
      aciklama: '',
      alan: KursAlani.dil,
      uniteler: const [],
    );
    final y = OgrenmeYolu.uret(const OgrenciDurumu(), [garip, yok]);
    expect(y.map((x) => x.ad), ['Rusca', 'Tek']);
    expect(y.first.seviyeler.single.sira, 2);
    expect(y.first.seviyeler.single.etiket, 'B1');
    expect(y.last.seviyeler.single.sira, 1);
    expect(y.first.yuzde, 0); // ders yok: bölme hatası olmaz
  });

  test('yalnız verilen kurslar yola girer (alan süzgeci)', () {
    final kod = tumu.where((k) => k.alan == KursAlani.kod).toList();
    final yollar = OgrenmeYolu.uret(const OgrenciDurumu(), kod);
    expect(yollar.map((y) => y.kimlik).toSet(), {'web', 'python', 'sql'});
  });
}
