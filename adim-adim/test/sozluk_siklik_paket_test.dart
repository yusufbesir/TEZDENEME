/// Sözlük kök/sıklık/paket testleri: köke göre arama ("went" → "go",
/// "running" → "run"), sıklık sıralaması (sık kelimeler önce, sonra
/// alfabetik), madde kök/sıklık alanları, ünite paketleri ve tarihe göre
/// deterministik günün kelimesi.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/sozluk/sozluk.dart';
import 'package:flutter_test/flutter_test.dart';

Kurs _dilKursu() => Kurs(
  id: 'ingilizce-9',
  ad: 'Test İngilizce',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'ingilizce-9.u1',
      ad: 'Fiiller',
      dersler: [
        Ders(
          id: 'ingilizce-9.u1.d1',
          ad: 'D1',
          alistirmalar: const [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'go', sag: 'gitmek'),
                (sol: 'run', sag: 'koşmak'),
                (sol: 'zebra', sag: 'zebra'),
                (sol: 'the', sag: 'belirli tanımlık'),
                (sol: 'zebra crossing', sag: 'yaya geçidi'),
                (sol: 'How much is this?', sag: 'Bu ne kadar?'),
              ],
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-9.u2',
      ad: 'Hayvanlar',
      dersler: [
        Ders(
          id: 'ingilizce-9.u2.d1',
          ad: 'D2',
          alistirmalar: const [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'cat', sag: 'kedi'),
                (sol: 'cats', sag: 'kediler'),
              ],
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-9.u3',
      ad: 'Boş Ünite',
      dersler: [
        Ders(
          id: 'ingilizce-9.u3.d1',
          ad: 'D3',
          alistirmalar: const [
            Yaz(soru: 'Yaz.', cevaplar: ['x']),
          ],
        ),
      ],
    ),
  ],
);

Kurs _kodKursu() => Kurs(
  id: 'html-9',
  ad: 'Test HTML',
  aciklama: '',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'html-9.u1',
      ad: 'Etiketler',
      dersler: [
        Ders(
          id: 'html-9.u1.d1',
          ad: 'E1',
          alistirmalar: const [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: '<p>', sag: 'Paragraf'),
                (sol: 'tags', sag: 'Etiketler'),
              ],
            ),
          ],
        ),
      ],
    ),
  ],
);

void main() {
  final kurslar = [_dilKursu(), _kodKursu()];
  final s = Sozluk.kurslardan(kurslar);

  group('kök ve sıklık alanları', () {
    test('İngilizce maddede kök ve sıklık hesaplanır', () {
      final go = s.maddeler.singleWhere((m) => m.kelime == 'go');
      expect(go.kok, 'go');
      expect(go.siklik, isNotNull);
      expect(go.kokFarkli, isFalse);

      final cats = s.maddeler.singleWhere((m) => m.kelime == 'cats');
      expect(cats.kok, 'cat');
      expect(cats.kokFarkli, isTrue);
      expect(cats.siklik, isNotNull);

      final zebra = s.maddeler.singleWhere((m) => m.kelime == 'zebra');
      expect(zebra.siklik, isNull);

      final gecit = s.maddeler.singleWhere((m) => m.kelime == 'zebra crossing');
      // Çok kelimeli ifadede kök normalize kelimedir, kök farklı sayılmaz.
      expect(gecit.kok, 'zebra crossing');
      expect(gecit.kokFarkli, isFalse);
      expect(gecit.siklik, isNull);
      final soru = s.maddeler.singleWhere(
        (m) => m.kelime == 'How much is this?',
      );
      expect(soru.kok, 'how much is this?');
      expect(soru.kokFarkli, isFalse);
    });

    test('kod maddesinde kök normalize kelime, sıklık yok', () {
      final tags = s.maddeler.singleWhere((m) => m.kelime == 'tags');
      expect(tags.kok, 'tags');
      expect(tags.siklik, isNull);
      expect(tags.kokFarkli, isFalse);
    });
  });

  group('köke göre arama', () {
    test('went → go; running → run; children → yok', () {
      expect(s.ara('went').map((m) => m.kelime).toList(), ['go']);
      expect(s.ara('Running').map((m) => m.kelime).toList(), ['run']);
      expect(s.ara('children'), isEmpty);
      // Sorguda noktalama ayrılır: "went." de 'go' bulur.
      expect(s.ara('went.').map((m) => m.kelime).toList(), ['go']);
    });

    test('kedi sorgusu kedileri de bulur; sık kelime önce', () {
      final kediler = s.ara('cat').map((m) => m.kelime).toList();
      expect(kediler, ['cat', 'cats']);
    });

    test('kod dilinde kök araması yapılmaz', () {
      // 'tags' kod maddesinin kökü 'tags'; 'tag' sorgusu başlangıç
      // eşleşmesiyle bulur ama 'went' gibi dönüşüm uygulanmaz.
      expect(s.ara('tag', dil: 'kod').map((m) => m.kelime).toList(), ['tags']);
      expect(s.ara('went', dil: 'kod'), isEmpty);
    });
  });

  group('sıralama', () {
    test('başlangıç eşleşmelerinde sık kelimeler önce, sonra alfabetik', () {
      // Boş sorgu alfabetik kalır (mevcut davranış).
      final hepsi = s.ara('', dil: 'en').map((m) => m.kelime).toList();
      expect(hepsi.first, 'cat');
      expect(hepsi.length, 8);
      // 'm' anlamlarda (tanımlık, gitmek, koşmak) ve 'How much' içinde geçer:
      // hepsi içerik eşleşmesi; sıklık the(1) < go < run, sıklıksız sonda.
      final anlamda = s.ara('m').map((m) => m.kelime).toList();
      expect(anlamda, ['the', 'go', 'run', 'How much is this?']);
    });

    test('sıklığı olmayan maddeler grup sonunda alfabetik', () {
      final z = s.ara('zebra').map((m) => m.kelime).toList();
      expect(z, ['zebra', 'zebra crossing']);
    });

    test('gerçek içerikte sık kelime başlangıç grubunda önde', () {
      final gercek = Sozluk.kurslardan(tumKurslar);
      final sonuc = gercek.ara('go', dil: 'en');
      expect(sonuc, isNotEmpty);
      // İlk sonuçlar sıklığı olanlar; sonra sıklıksızlar.
      var sikliksizGoruldu = false;
      for (final m in sonuc.takeWhile(
        (m) => Sozluk.normalize(m.kelime).startsWith('go'),
      )) {
        if (m.siklik == null) {
          sikliksizGoruldu = true;
        } else {
          expect(sikliksizGoruldu, isFalse, reason: '${m.kelime} geç geldi');
        }
      }
    });
  });

  group('paketler', () {
    test('ünite başına paket; boş ünite atlanır; sıra kurs/ünite sırası', () {
      final p = s.paketler(kurslar);
      expect(p.map((x) => x.ad).toList(), [
        'Fiiller',
        'Hayvanlar',
        'Etiketler',
      ]);
      expect(p[0].kursId, 'ingilizce-9');
      expect(p[0].uniteId, 'ingilizce-9.u1');
      expect(p[0].maddeler.map((m) => m.kelime).toSet(), {
        'go',
        'run',
        'zebra',
        'the',
        'zebra crossing',
        'How much is this?',
      });
      expect(p[1].maddeler.map((m) => m.kelime).toList(), ['cat', 'cats']);
      expect(p[2].kursId, 'html-9');
      expect(p[2].maddeler.length, 2);
      // Paket maddeleri sözlük maddeleriyle aynı nesnelerdir (süzme için).
      expect(s.maddeler.contains(p[1].maddeler.first), isTrue);
    });

    test('sözlükte olmayan kurs verilirse paket yok', () {
      expect(s.paketler([_kodKursu()]).length, 1);
      expect(s.paketler(const []), isEmpty);
    });
  });

  group('günün kelimesi', () {
    test('deterministik; İngilizce; sıklığı olan maddelerden', () {
      final a = s.gununKelimesi('2026-10-15');
      final b = s.gununKelimesi('2026-10-15');
      expect(a, isNotNull);
      expect(identical(a, b), isTrue);
      expect(a!.dil, 'en');
      expect(a.siklik, isNotNull);
    });

    test('tarih değişince kelime (en az bir günde) değişir', () {
      final gunler = List.generate(
        14,
        (i) => '2026-10-${(i + 1).toString().padLeft(2, '0')}',
      );
      final secimler = gunler.map((g) => s.gununKelimesi(g)!.kelime).toSet();
      expect(secimler.length, greaterThan(1));
    });

    test('İngilizce madde yoksa null; sıklıksız maddelerden de seçebilir', () {
      expect(
        Sozluk.kurslardan([_kodKursu()]).gununKelimesi('2026-10-15'),
        isNull,
      );
      final zebraKursu = Kurs(
        id: 'ingilizce-8',
        ad: 'Z',
        aciklama: '',
        alan: KursAlani.dil,
        uniteler: [
          Unite(
            id: 'ingilizce-8.u1',
            ad: 'Ü',
            dersler: [
              Ders(
                id: 'ingilizce-8.u1.d1',
                ad: 'D',
                alistirmalar: const [
                  Eslestir(
                    soru: 'Eşleştir.',
                    ciftler: [(sol: 'zebra', sag: 'zebra')],
                  ),
                ],
              ),
            ],
          ),
        ],
      );
      final z = Sozluk.kurslardan([zebraKursu]).gununKelimesi('2026-10-15');
      expect(z?.kelime, 'zebra');
    });
  });
}
