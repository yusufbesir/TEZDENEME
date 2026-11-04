// Sahibi Yusuf (yusufbesir). Yazan: [Claude#dalga11]. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Fransızca A1 kursu: yapı, ses dili, sözlük ve dil tanımı.
library;

import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/ders_ogeleri.dart';
import 'package:adim_adim/sozluk/dil_tanimi.dart';
import 'package:adim_adim/sozluk/sozluk.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'yapı: 4 ünite x 3 ders, kimlikler önekli, Almanca A1 ile aynı boyut',
    () {
      expect(fransizcaA1.id, 'fransizca-1');
      expect(fransizcaA1.ad, 'Fransızca A1: Başlangıç');
      expect(fransizcaA1.alan, KursAlani.dil);
      expect(kursBul('fransizca-1'), same(fransizcaA1));
      expect(fransizcaA1.uniteler.length, almancaA1.uniteler.length);
      expect(fransizcaA1.tumDersler.length, almancaA1.tumDersler.length);
      for (final u in fransizcaA1.uniteler) {
        expect(u.id, startsWith('fransizca-1.u'));
        expect(u.dersler.length, 3, reason: u.id);
        for (final d in u.dersler) {
          expect(d.id, startsWith('${u.id}.d'));
          expect(d.dilbilgisiNotu, isNotEmpty, reason: d.id);
        }
      }
    },
  );

  test('her derste Dinle (fr-FR, 3 seçenek) ve Yaz var', () {
    for (final d in fransizcaA1.tumDersler) {
      final dinle = d.alistirmalar.whereType<Dinle>().toList();
      expect(dinle, isNotEmpty, reason: d.id);
      for (final a in dinle) {
        expect(a.dil, 'fr-FR', reason: d.id);
        expect(a.secenekler.length, 3, reason: d.id);
        expect(a.secenekler[a.dogru], a.okunacak, reason: d.id);
      }
      expect(d.alistirmalar.whereType<Yaz>(), isNotEmpty, reason: d.id);
    }
  });

  test('Tablo ve İşaretle indeksleri tutarlı', () {
    for (final d in fransizcaA1.tumDersler) {
      for (final a in d.alistirmalar) {
        if (a is Tablo) {
          for (final b in a.bos) {
            expect(a.secenekler, contains(a.hucre(b)), reason: d.id);
          }
        }
        if (a is Isaretle) {
          for (final i in a.dogru) {
            expect(i, lessThan(a.kelimeler.length), reason: a.cumle);
          }
        }
      }
    }
  });

  test('ses dili, dil tanımı ve sözlük', () {
    expect(DersOgeleri.kursSesDili('fransizca-1'), 'fr-FR');
    expect(kursDilKodu(fransizcaA1), 'fr');
    expect(Sozluk.kursDili(fransizcaA1), 'fr');
    final t = dilTanimi('fr')!;
    expect(t.ad, 'Fransızca');
    expect(t.ttsDili, 'fr-FR');
    final s = Sozluk.kurslardan([fransizcaA1]);
    expect(s.maddeler, isNotEmpty);
    expect(s.maddeler.every((m) => m.dil == 'fr'), isTrue);
    expect(s.ara('ekmek', dil: 'fr').map((m) => m.kelime), contains('le pain'));
  });
}
