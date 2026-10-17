/// Sözlük birim testleri: madde üretimi (sayı, tekrar yok), Türkçe duyarsız
/// arama, başlangıç eşleşmesinin önceliği ve dil filtresi.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/sozluk/sozluk.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final sozluk = Sozluk.kurslardan(tumKurslar);

  test('gerçek içerikten 100\'den çok madde üretir', () {
    expect(sozluk.maddeler.length, greaterThan(100));
    expect(sozluk.maddeler.any((m) => m.dil == 'en'), isTrue);
    expect(sozluk.maddeler.any((m) => m.dil == 'kod'), isTrue);
  });

  test('aynı kelime+anlam tekrarı yok; liste alfabetik', () {
    final anahtarlar = sozluk.maddeler
        .map(
          (m) => '${Sozluk.normalize(m.kelime)}|${Sozluk.normalize(m.anlam)}',
        )
        .toList();
    expect(anahtarlar.toSet().length, anahtarlar.length);
    for (var i = 1; i < sozluk.maddeler.length; i++) {
      final a = Sozluk.normalize(sozluk.maddeler[i - 1].kelime);
      final b = Sozluk.normalize(sozluk.maddeler[i].kelime);
      expect(a.compareTo(b) <= 0, isTrue, reason: '$a > $b');
    }
  });

  test('"X ne demektir?" seçim sorusundan madde üretir (Hello → Merhaba)', () {
    final hello = sozluk.maddeler.where(
      (m) => m.kelime == 'Hello' && m.anlam == 'Merhaba',
    );
    expect(hello.length, 1);
    expect(hello.first.kursId, 'ingilizce-1');
    expect(hello.first.dil, 'en');
  });

  test('arama büyük/küçük harf ve Türkçe harf duyarsız', () {
    expect(sozluk.ara('HELLO').any((m) => m.kelime == 'Hello'), isTrue);
    expect(sozluk.ara('merhaba').any((m) => m.anlam == 'Merhaba'), isTrue);
    expect(sozluk.ara('MERHABA').any((m) => m.anlam == 'Merhaba'), isTrue);
    // İ/ı dönüşümü: "ingilizce" ile "İngilizce" aynı.
    expect(Sozluk.normalize('İngilizce'), 'ingilizce');
    expect(Sozluk.normalize('ŞĞÜÖÇI'), 'sguoci');
  });

  test('boş sorgu tüm listeyi döndürür', () {
    expect(sozluk.ara(''), sozluk.maddeler);
    expect(sozluk.ara('   '), sozluk.maddeler);
  });

  test('dil filtresi çalışır', () {
    expect(sozluk.ara('', dil: 'en').every((m) => m.dil == 'en'), isTrue);
    expect(sozluk.ara('', dil: 'kod').every((m) => m.dil == 'kod'), isTrue);
    expect(
      sozluk.ara('', dil: 'en').length + sozluk.ara('', dil: 'kod').length,
      sozluk.maddeler.length,
    );
  });

  test('başlangıç eşleşmeleri içerik eşleşmelerinden önce gelir', () {
    final kurs = Kurs(
      id: 'test-1',
      ad: 'Test',
      aciklama: '',
      alan: KursAlani.dil,
      uniteler: [
        Unite(
          id: 'test-1.u1',
          ad: 'Ü',
          dersler: [
            Ders(
              id: 'test-1.u1.d1',
              ad: 'D',
              alistirmalar: const [
                Eslestir(
                  soru: 'Eşleştir.',
                  ciftler: [
                    (sol: 'black cat', sag: 'kara kedi'),
                    (sol: 'cat', sag: 'kedi'),
                    (sol: 'catalog', sag: 'katalog'),
                    (sol: 'dog', sag: 'köpek'),
                  ],
                ),
                Eslestir(soru: 'Tekrar.', ciftler: [(sol: 'Cat', sag: 'KEDİ')]),
              ],
            ),
          ],
        ),
      ],
    );
    final s = Sozluk.kurslardan([kurs]);
    // Tekrar ("Cat"/"KEDİ") birleştirildi; ilk görülen kaldı.
    expect(s.maddeler.length, 4);
    expect(s.maddeler.where((m) => m.kelime == 'cat').length, 1);

    final sonuc = s.ara('cat').map((m) => m.kelime).toList();
    expect(sonuc, ['cat', 'catalog', 'black cat']);
    expect(s.ara('kedi').map((m) => m.kelime).toList(), ['cat', 'black cat']);
    expect(s.ara('yok'), isEmpty);
  });
}
