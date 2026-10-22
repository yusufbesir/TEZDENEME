// Sahibi Yusuf (yusufbesir). Yazan: [İP:Adım Adım Windows sürümü#cihaz] Claude. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Pratik merkezi dalga 2 arayüz testleri: Hızlı Tekrar (60 sn zamanlı mod,
/// skor ve doğru oranı, SRS ve tekrar kaydı), Günlük Karışım (10 kart, Mikro
/// ders ortak akışı), Kelimelerim (kovalar, arama, sıralama, panodan bağlantı)
/// ve Ayarlar (hedef yoğunluğu, oturum kart sayısı). Taşma: 360x640, ölçek 1,5.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'pratik_oturumlari_test.dart' show dersA, oturumKursu;

const _bugun = '2026-10-15';
const _kucuk = Size(360, 640);

Kart _kart(double yo, {String sonraki = '2026-10-01', bool? son = true}) =>
    Kart(
      kutu: Kart.kutuHesapla(yo),
      sonraki: sonraki,
      yariOmurGun: yo,
      sonCevap: son,
    );

/// Hızlı tekrar durumu: ders A bitmiş; A#0 ve A#1 (Seçim) vadesi geçmiş.
OgrenciDurumu _hizliDurum() => OgrenciDurumu(
  alan: 'dil',
  tamamlanan: const {dersA: 1},
  kartlar: {
    '$dersA#0': _kart(2, sonraki: '2026-10-01'),
    '$dersA#1': _kart(2, sonraki: '2026-10-02'),
  },
);

/// Sayaç (periyodik zamanlayıcı) çalışırken pumpAndSettle kullanılmaz.
Future<void> _tikla(WidgetTester tester, Finder f) async {
  await tester.ensureVisible(f);
  await tester.tap(f);
  await tester.pump(const Duration(milliseconds: 400));
}

Future<ProviderContainer> _ac(
  WidgetTester tester,
  OgrenciDurumu durum, {
  List<Kurs>? kurslar,
  Size boyut = const Size(480, 800),
  double olcek = 1.0,
  BellekDepo? depo,
}) => uygulamayiAc(
  tester,
  depo ?? BellekDepo(durum),
  kurslar: kurslar ?? [oturumKursu],
  boyut: boyut,
  metinOlcegi: olcek,
);

Future<void> _git(
  WidgetTester tester,
  ProviderContainer kap,
  String yol,
) async {
  kap.read(yonlendiriciProvider).push(yol);
  await tester.pump();
  await tester.pump(const Duration(seconds: 1));
}

Future<void> _pratigeGit(WidgetTester tester) => dokun(
  tester,
  find.descendant(
    of: find.byType(NavigationBar),
    matching: find.text('Pratik'),
  ),
);

OgrenciDurumu _durumOku(ProviderContainer kap) =>
    kap.read(durumProvider).value!;

/// Seçim sorusunu cevaplar ('x' doğru, 'y' yanlış), Kontrol et ve ilerler.
Future<void> _cevapla(
  WidgetTester tester, {
  bool dogru = true,
  bool son = false,
}) async {
  await _tikla(tester, find.text(dogru ? 'x' : 'y'));
  await _tikla(tester, find.text('Kontrol et'));
  await _tikla(
    tester,
    find.text(son ? 'Bitir' : (dogru ? 'Devam' : 'Yine de geç')),
  );
}

void tasmaYok(WidgetTester tester, String nerede) {
  final hata = tester.takeException();
  expect(hata, isNull, reason: '$nerede: $hata');
}

void main() {
  group('Pratik merkezi girişleri', () {
    testWidgets('Günlük karışım, Hızlı tekrar ve Kelimelerim kartları var', (
      tester,
    ) async {
      await _ac(tester, _hizliDurum());
      await _pratigeGit(tester);
      for (final k in [
        'pratik-karisim',
        'pratik-hizli',
        'pratik-kelimelerim',
      ]) {
        expect(find.byKey(ValueKey(k)), findsOneWidget, reason: k);
      }
      expect(find.text('Günlük karışım'), findsOneWidget);
      expect(find.text('Hızlı tekrar'), findsOneWidget);
      expect(find.text('Kelimelerim'), findsOneWidget);
    });
  });

  group('Hızlı Tekrar', () {
    testWidgets('kartlar tükenince sonuç: skor, doğru oranı; SRS ve kayıt', (
      tester,
    ) async {
      final kap = await _ac(tester, _hizliDurum());
      await _pratigeGit(tester);
      await dokun(tester, find.byKey(const ValueKey('pratik-hizli')));
      expect(find.textContaining('2 kart hazır'), findsOneWidget);
      await _tikla(tester, find.byKey(const ValueKey('hizli-basla')));
      expect(find.byKey(const ValueKey('hizli-sayac')), findsOneWidget);
      await _cevapla(tester);
      await _cevapla(tester, son: true);
      expect(find.text('Hepsini bitirdin'), findsOneWidget);
      expect(find.text('Skor: 20'), findsOneWidget);
      expect(find.text('Doğru oranı: %100 (2/2)'), findsOneWidget);
      final d = _durumOku(kap);
      // Doğru: yarı ömür 2 -> 4 gün; sonraki tekrar 4 gün sonra.
      expect(d.kartlar['$dersA#0']!.yariOmurGun, 4);
      expect(d.kartlar['$dersA#0']!.sonraki, '2026-10-19');
      expect(d.kartlar['$dersA#1']!.sonCevap, isTrue);
      expect(d.gunluk, hasLength(1));
      expect(d.gunluk.last.tur, GunlukKayit.turTekrar);
      expect((d.gunluk.last.dogru, d.gunluk.last.toplam), (2, 2));
      expect(d.xp, 0, reason: 'Tekrar gibi XP vermez');
    });

    testWidgets(
      'yanlış cevap: oran düşer, kart zayıflar, hata defterine yazılır',
      (tester) async {
        final kap = await _ac(tester, _hizliDurum());
        await _pratigeGit(tester);
        await dokun(tester, find.byKey(const ValueKey('pratik-hizli')));
        await _tikla(tester, find.byKey(const ValueKey('hizli-basla')));
        await _cevapla(tester, dogru: false);
        await _cevapla(tester, son: true);
        expect(find.text('Skor: 10'), findsOneWidget);
        expect(find.text('Doğru oranı: %50 (1/2)'), findsOneWidget);
        final d = _durumOku(kap);
        expect(d.kartlar['$dersA#0']!.yariOmurGun, 1);
        expect(d.kartlar['$dersA#0']!.sonCevap, isFalse);
        expect(d.hatalar.map((h) => h.id), contains('$dersA#0'));
        expect((d.gunluk.last.dogru, d.gunluk.last.toplam), (1, 2));
      },
    );

    testWidgets('60 sn dolunca oturum biter; açık soru sayılmaz', (
      tester,
    ) async {
      final kap = await _ac(tester, _hizliDurum());
      await _pratigeGit(tester);
      await dokun(tester, find.byKey(const ValueKey('pratik-hizli')));
      await _tikla(tester, find.byKey(const ValueKey('hizli-basla')));
      expect(find.text('60 sn'), findsOneWidget);
      await _cevapla(tester); // 1. kart doğru
      await tester.pump(const Duration(seconds: 5));
      expect(find.text('54 sn'), findsOneWidget);
      // 2. kart açık, cevaplanmadan süre biter.
      await tester.pump(const Duration(seconds: 60));
      expect(find.text('Süre doldu'), findsOneWidget);
      expect(find.text('Skor: 10'), findsOneWidget);
      expect(find.text('Doğru oranı: %100 (1/1)'), findsOneWidget);
      final d = _durumOku(kap);
      expect((d.gunluk.last.dogru, d.gunluk.last.toplam), (1, 1));
      expect(d.kartlar['$dersA#1']!.sonraki, '2026-10-02');
      // Sayaç durdu: daha fazla süre geçse de sonuç değişmez.
      await tester.pump(const Duration(seconds: 30));
      expect(_durumOku(kap).gunluk, hasLength(1));
    });

    testWidgets('hiç cevap yoksa kayıt yazılmaz, oran %0', (tester) async {
      final kap = await _ac(tester, _hizliDurum());
      await _pratigeGit(tester);
      await dokun(tester, find.byKey(const ValueKey('pratik-hizli')));
      await _tikla(tester, find.byKey(const ValueKey('hizli-basla')));
      await tester.pump(const Duration(seconds: 61));
      expect(find.text('Süre doldu'), findsOneWidget);
      expect(find.text('Skor: 0'), findsOneWidget);
      expect(find.text('Doğru oranı: %0 (0/0)'), findsOneWidget);
      expect(find.text('Hiç kart cevaplamadın.'), findsOneWidget);
      expect(_durumOku(kap).gunluk, isEmpty);
    });

    testWidgets('Tekrar dene: biten kartlar artık beklemez, boş durum', (
      tester,
    ) async {
      await _ac(tester, _hizliDurum());
      await _pratigeGit(tester);
      await dokun(tester, find.byKey(const ValueKey('pratik-hizli')));
      await _tikla(tester, find.byKey(const ValueKey('hizli-basla')));
      await _cevapla(tester);
      await _cevapla(tester, son: true);
      await _tikla(tester, find.byKey(const ValueKey('hizli-yeniden')));
      expect(find.text('Şimdilik tekrar edilecek kart yok'), findsOneWidget);
      expect(find.byKey(const ValueKey('hizli-basla')), findsNothing);
    });

    testWidgets('bekleyen ya da zayıf kart yoksa boş durum', (tester) async {
      await _ac(tester, const OgrenciDurumu(alan: 'dil'));
      await _pratigeGit(tester);
      await dokun(tester, find.byKey(const ValueKey('pratik-hizli')));
      expect(find.text('Şimdilik tekrar edilecek kart yok'), findsOneWidget);
      expect(find.byKey(const ValueKey('hizli-basla')), findsNothing);
    });

    testWidgets(
      'kapat düğmesi: cevap yoksa çıkar, cevap varsa sonuç gösterir',
      (tester) async {
        final kap = await _ac(tester, _hizliDurum());
        await _pratigeGit(tester);
        await dokun(tester, find.byKey(const ValueKey('pratik-hizli')));
        await _tikla(tester, find.byKey(const ValueKey('hizli-basla')));
        await _tikla(tester, find.byTooltip('Dersten çık'));
        expect(find.text('Pratik merkezi'), findsOneWidget);
        // İkinci deneme: bir cevaptan sonra kapatınca sonuç.
        await dokun(tester, find.byKey(const ValueKey('pratik-hizli')));
        await _tikla(tester, find.byKey(const ValueKey('hizli-basla')));
        await _cevapla(tester);
        await _tikla(tester, find.byTooltip('Dersten çık'));
        expect(find.text('Doğru oranı: %100 (1/1)'), findsOneWidget);
        expect(_durumOku(kap).gunluk, hasLength(1));
      },
    );

    testWidgets('360x640, ölçek 1,5: giriş, oturum ve sonuç taşmaz', (
      tester,
    ) async {
      await _ac(tester, _hizliDurum(), boyut: _kucuk, olcek: 1.5);
      await _pratigeGit(tester);
      tasmaYok(tester, 'pratik merkezi');
      await dokun(tester, find.byKey(const ValueKey('pratik-hizli')));
      tasmaYok(tester, 'giriş');
      await _tikla(tester, find.byKey(const ValueKey('hizli-basla')));
      tasmaYok(tester, 'oturum');
      await _cevapla(tester);
      await _cevapla(tester, son: true);
      expect(find.text('Hepsini bitirdin'), findsOneWidget);
      tasmaYok(tester, 'sonuç');
    });
  });

  group('Günlük Karışım', () {
    /// Ders 1 (bitmiş): 14 Seçim; ders 2 (sıradaki): 4 Seçim. Hepsi 'x' doğru.
    final karisimKursu = Kurs(
      id: 'karisim-1',
      ad: 'Karışım',
      aciklama: '',
      alan: KursAlani.dil,
      uniteler: [
        Unite(
          id: 'karisim-1.u1',
          ad: 'U',
          dersler: [
            Ders(
              id: 'karisim-1.u1.d1',
              ad: 'D1',
              alistirmalar: [
                for (var i = 0; i < 14; i++)
                  Secim(soru: 'S$i?', secenekler: const ['x', 'y'], dogru: 0),
              ],
            ),
            Ders(
              id: 'karisim-1.u1.d2',
              ad: 'D2',
              alistirmalar: [
                for (var i = 0; i < 4; i++)
                  Secim(soru: 'N$i?', secenekler: const ['x', 'y'], dogru: 0),
              ],
            ),
          ],
        ),
      ],
    );
    const d1 = 'karisim-1.u1.d1';

    OgrenciDurumu karisimDurum({int kartSayisi = 5}) => OgrenciDurumu(
      alan: 'dil',
      tamamlanan: const {d1: 1},
      oturumKartSayisi: kartSayisi,
      kartlar: {
        // 3 zayıf, vadesi gelmemiş
        '$d1#0': _kart(0.5, sonraki: '2026-10-20'),
        '$d1#1': _kart(1, sonraki: '2026-10-20'),
        '$d1#2': _kart(1.5, sonraki: '2026-10-20'),
        // 4 vadesi gelmiş, güçlü
        '$d1#3': _kart(10, sonraki: '2026-10-10'),
        '$d1#4': _kart(10, sonraki: '2026-10-11'),
        '$d1#5': _kart(10, sonraki: '2026-10-12'),
        '$d1#6': _kart(10, sonraki: '2026-10-13'),
      },
    );

    testWidgets('tek dokunuşla 10 kart; bitişte mikro ders XP ve kaydı', (
      tester,
    ) async {
      final kap = await _ac(tester, karisimDurum(), kurslar: [karisimKursu]);
      await _pratigeGit(tester);
      await dokun(tester, find.byKey(const ValueKey('pratik-karisim')));
      for (var i = 0; i < 10; i++) {
        await _cevapla(tester, son: i == 9);
        if (i < 9) {
          expect(find.text('Günlük karışım tamamlandı'), findsNothing);
        }
      }
      await tester.pumpAndSettle();
      expect(find.text('Günlük karışım tamamlandı'), findsOneWidget);
      final d = _durumOku(kap);
      expect(d.gunluk.last.tur, GunlukKayit.turMikro);
      expect((d.gunluk.last.dogru, d.gunluk.last.toplam), (10, 10));
      expect(d.xp, Motor.mikroXp(10, 10));
      expect(d.gunlukXp[_bugun], Motor.mikroXp(10, 10));
      // 10 kartın hepsi SRS'e işlendi: 7 mevcut kart + 3 yeni... en az 10 kart
      // cevaplandı (sonCevap dolu).
      expect(
        d.kartlar.values.where((k) => k.sonCevap == true).length,
        greaterThanOrEqualTo(10),
      );
      expect(d.tamamlanan, {d1: 1}, reason: 'ders tamamlanmış sayılmaz');
    });

    testWidgets('kart sayısı ayarı Günlük karışımı etkilemez (hep 10)', (
      tester,
    ) async {
      final kap = await _ac(
        tester,
        karisimDurum(kartSayisi: 20),
        kurslar: [karisimKursu],
      );
      await _pratigeGit(tester);
      await dokun(tester, find.byKey(const ValueKey('pratik-karisim')));
      for (var i = 0; i < 10; i++) {
        await _cevapla(tester, son: i == 9);
      }
      await tester.pumpAndSettle();
      expect(find.text('Günlük karışım tamamlandı'), findsOneWidget);
      expect(_durumOku(kap).gunluk.last.toplam, 10);
    });

    for (final (ayar, beklenen) in [(5, 5), (10, 10)]) {
      testWidgets('Mikro ders oturum kart sayısı ayarı: $ayar kart', (
        tester,
      ) async {
        final kap = await _ac(
          tester,
          karisimDurum(kartSayisi: ayar),
          kurslar: [karisimKursu],
        );
        await _git(tester, kap, '/mikro');
        for (var i = 0; i < beklenen; i++) {
          await _cevapla(tester, son: i == beklenen - 1);
        }
        await tester.pumpAndSettle();
        expect(find.text('Mikro ders tamamlandı'), findsOneWidget);
        expect(_durumOku(kap).gunluk.last.toplam, beklenen);
      });
    }

    testWidgets('içerik yoksa Önce bir ders bitir', (tester) async {
      final bos = Kurs(
        id: 'bos-1',
        ad: 'Boş',
        aciklama: '',
        alan: KursAlani.dil,
        uniteler: const [],
      );
      final kap = await _ac(
        tester,
        const OgrenciDurumu(alan: 'dil'),
        kurslar: [bos],
      );
      await _git(tester, kap, '/mikro?mod=karisim');
      expect(find.text('Önce bir ders bitir'), findsOneWidget);
    });

    testWidgets('360x640, ölçek 1,5: taşma yok', (tester) async {
      final kap = await _ac(
        tester,
        karisimDurum(),
        kurslar: [karisimKursu],
        boyut: _kucuk,
        olcek: 1.5,
      );
      await _git(tester, kap, '/mikro?mod=karisim');
      tasmaYok(tester, 'karışım oturumu');
      for (var i = 0; i < 10; i++) {
        await _cevapla(tester, son: i == 9);
      }
      await tester.pumpAndSettle();
      tasmaYok(tester, 'karışım özeti');
    });
  });

  group('Kelimelerim', () {
    /// 4 Eşleştir sorusu, her biri 2 kelime çifti: kartlar #0..#3.
    final kelimeKursu = Kurs(
      id: 'kw-1',
      ad: 'Kelime',
      aciklama: '',
      alan: KursAlani.dil,
      uniteler: [
        Unite(
          id: 'kw-1.u1',
          ad: 'U',
          dersler: [
            Ders(
              id: 'kw-1.u1.d1',
              ad: 'D',
              alistirmalar: const [
                Eslestir(
                  soru: 'E0',
                  ciftler: [
                    (sol: 'apple', sag: 'elma'),
                    (sol: 'ant', sag: 'karınca'),
                  ],
                ),
                Eslestir(
                  soru: 'E1',
                  ciftler: [
                    (sol: 'cat', sag: 'kedi'),
                    (sol: 'çay', sag: 'tea'),
                  ],
                ),
                Eslestir(
                  soru: 'E2',
                  ciftler: [
                    (sol: 'dal', sag: 'branch'),
                    (sol: 'ışık', sag: 'light'),
                  ],
                ),
                Eslestir(
                  soru: 'E3',
                  ciftler: [
                    (sol: 'iyi', sag: 'good'),
                    (sol: 'zeki', sag: 'clever'),
                  ],
                ),
              ],
            ),
          ],
        ),
      ],
    );
    const kd = 'kw-1.u1.d1';
    final durum = OgrenciDurumu(
      alan: 'dil',
      tamamlanan: const {kd: 1},
      kartlar: {
        // #0: kart yok (Yeni)
        '$kd#1': _kart(0.5, sonraki: '2026-10-20', son: false), // Zayıf
        '$kd#2': _kart(4, sonraki: '2026-10-20'), // Orta
        '$kd#3': _kart(30, sonraki: '2026-10-20'), // Güçlü
      },
    );

    Finder satir(String metin) => find.byWidgetPredicate(
      (w) =>
          w.key is ValueKey<String> &&
          (w.key! as ValueKey<String>).value.endsWith('-$metin') &&
          (w.key! as ValueKey<String>).value.startsWith('kelime-kw'),
    );

    int satirSayisi(WidgetTester t) => find
        .byWidgetPredicate(
          (w) =>
              w.key is ValueKey<String> &&
              (w.key! as ValueKey<String>).value.startsWith('kelime-kw'),
        )
        .evaluate()
        .length;

    testWidgets('Pratik kartından açılır; kova sayıları ve 8 kelime', (
      tester,
    ) async {
      await _ac(
        tester,
        durum,
        kurslar: [kelimeKursu],
        boyut: const Size(480, 1600),
      );
      await _pratigeGit(tester);
      await dokun(tester, find.byKey(const ValueKey('pratik-kelimelerim')));
      expect(find.text('Hepsi 8'), findsOneWidget);
      expect(find.text('Yeni 2'), findsOneWidget);
      expect(find.text('Zayıf 2'), findsOneWidget);
      expect(find.text('Orta 2'), findsOneWidget);
      expect(find.text('Güçlü 2'), findsOneWidget);
      expect(satirSayisi(tester), 8);
      // Alfabe: ant, apple, cat, çay, dal, ışık, iyi, zeki
      final ant = tester.getTopLeft(satir('ant')).dy;
      final cay = tester.getTopLeft(satir('çay')).dy;
      final isik = tester.getTopLeft(satir('ışık')).dy;
      final iyi = tester.getTopLeft(satir('iyi')).dy;
      expect(ant < cay && cay < isik && isik < iyi, isTrue);
    });

    testWidgets('kova çipi süzer ve satırda kova adı ile puan görünür', (
      tester,
    ) async {
      await _ac(
        tester,
        durum,
        kurslar: [kelimeKursu],
        boyut: const Size(480, 1600),
      );
      await _pratigeGit(tester);
      await dokun(tester, find.byKey(const ValueKey('pratik-kelimelerim')));
      await dokun(tester, find.byKey(const ValueKey('kova-zayif')));
      expect(satirSayisi(tester), 2);
      expect(satir('cat'), findsOneWidget);
      expect(satir('çay'), findsOneWidget);
      expect(find.text('Zayıf'), findsNWidgets(2)); // iki satırın kova etiketi
      await dokun(tester, find.byKey(const ValueKey('kova-guclu')));
      expect(satirSayisi(tester), 2);
      expect(satir('zeki'), findsOneWidget);
      await dokun(tester, find.byKey(const ValueKey('kova-hepsi')));
      expect(satirSayisi(tester), 8);
    });

    testWidgets('arama kelimeyi ve anlamı arar; sonuç yoksa mesaj', (
      tester,
    ) async {
      await _ac(
        tester,
        durum,
        kurslar: [kelimeKursu],
        boyut: const Size(480, 1600),
      );
      await _pratigeGit(tester);
      await dokun(tester, find.byKey(const ValueKey('pratik-kelimelerim')));
      await tester.enterText(
        find.byKey(const ValueKey('kelime-arama')),
        'IŞIK',
      );
      await tester.pumpAndSettle();
      expect(satirSayisi(tester), 1);
      expect(satir('ışık'), findsOneWidget);
      await tester.enterText(find.byKey(const ValueKey('kelime-arama')), 'tea');
      await tester.pumpAndSettle();
      expect(satir('çay'), findsOneWidget);
      await tester.enterText(find.byKey(const ValueKey('kelime-arama')), 'zzz');
      await tester.pumpAndSettle();
      expect(find.text('Bu süzgece uyan kelime yok.'), findsOneWidget);
      await dokun(tester, find.byTooltip('Aramayı temizle'));
      expect(satirSayisi(tester), 8);
    });

    testWidgets('güce göre sırala: Yeni, Zayıf, Orta, Güçlü', (tester) async {
      await _ac(
        tester,
        durum,
        kurslar: [kelimeKursu],
        boyut: const Size(480, 1600),
      );
      await _pratigeGit(tester);
      await dokun(tester, find.byKey(const ValueKey('pratik-kelimelerim')));
      await dokun(tester, find.byKey(const ValueKey('sira-guc')));
      final y = tester.getTopLeft(satir('ant')).dy; // Yeni
      final z = tester.getTopLeft(satir('cat')).dy; // Zayıf
      final o = tester.getTopLeft(satir('dal')).dy; // Orta
      final g = tester.getTopLeft(satir('iyi')).dy; // Güçlü
      expect(y < z && z < o && o < g, isTrue);
      await dokun(tester, find.byKey(const ValueKey('sira-alfabe')));
      expect(
        tester.getTopLeft(satir('apple')).dy <
            tester.getTopLeft(satir('cat')).dy,
        isTrue,
      );
    });

    testWidgets('Tekrar sayfasındaki kelime sağlığı panosundan açılır', (
      tester,
    ) async {
      await _ac(
        tester,
        durum,
        kurslar: [kelimeKursu],
        boyut: const Size(480, 1600),
      );
      await tekrarEkraniniAc(tester);
      await dokun(tester, find.byKey(const ValueKey('kelimelerim-ac')));
      expect(find.text('Hepsi 8'), findsOneWidget);
      expect(satirSayisi(tester), 8);
    });

    testWidgets('kova parametresiyle açılış: yalnız o kova seçili', (
      tester,
    ) async {
      final kap = await _ac(
        tester,
        durum,
        kurslar: [kelimeKursu],
        boyut: const Size(480, 1600),
      );
      await _git(tester, kap, '/kelimelerim?kova=orta');
      await tester.pumpAndSettle();
      expect(satirSayisi(tester), 2);
      expect(satir('dal'), findsOneWidget);
      expect(
        tester
            .widget<ChoiceChip>(find.byKey(const ValueKey('kova-orta')))
            .selected,
        isTrue,
      );
      // Tanınmayan kova: tümü.
      kap.read(yonlendiriciProvider).pop();
      await tester.pumpAndSettle();
      await _git(tester, kap, '/kelimelerim?kova=bilinmez');
      await tester.pumpAndSettle();
      expect(satirSayisi(tester), 8);
    });

    testWidgets('kelime yoksa boş durum mesajı', (tester) async {
      final kap = await _ac(tester, const OgrenciDurumu(alan: 'dil'));
      await _git(tester, kap, '/kelimelerim');
      await tester.pumpAndSettle();
      expect(find.textContaining('Önce birkaç ders çöz'), findsOneWidget);
      expect(find.text('Hepsi 0'), findsOneWidget);
    });

    testWidgets('360x640, ölçek 1,5: taşma yok', (tester) async {
      final kap = await _ac(
        tester,
        durum,
        kurslar: [kelimeKursu],
        boyut: _kucuk,
        olcek: 1.5,
      );
      await _git(tester, kap, '/kelimelerim');
      await tester.pumpAndSettle();
      tasmaYok(tester, 'liste');
      await dokun(tester, find.byKey(const ValueKey('kova-guclu')));
      await dokun(tester, find.byKey(const ValueKey('sira-guc')));
      tasmaYok(tester, 'süzülmüş');
    });
  });

  group('Ayarlar: hedef yoğunluğu ve oturum kart sayısı', () {
    Future<ProviderContainer> ayarlar(
      WidgetTester tester,
      OgrenciDurumu d, {
      Size boyut = const Size(480, 900),
      double olcek = 1.0,
      BellekDepo? depo,
    }) async {
      final kap = await _ac(tester, d, boyut: boyut, olcek: olcek, depo: depo);
      await _git(tester, kap, '/ayarlar');
      await tester.pumpAndSettle();
      return kap;
    }

    ChoiceChip cip(WidgetTester tester, String ad) =>
        tester.widget<ChoiceChip>(find.byKey(ValueKey('yogunluk-$ad')));

    testWidgets('varsayılan 30 XP: Orta seçili; Yoğun günlük hedefi 50 yapar', (
      tester,
    ) async {
      final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
      final kap = await ayarlar(
        tester,
        const OgrenciDurumu(alan: 'dil'),
        depo: depo,
      );
      expect(cip(tester, 'orta').selected, isTrue);
      expect(cip(tester, 'yogun').selected, isFalse);
      await dokun(tester, find.byKey(const ValueKey('yogunluk-yogun')));
      expect(_durumOku(kap).gunlukHedef, 50);
      expect(cip(tester, 'yogun').selected, isTrue);
      expect(cip(tester, 'orta').selected, isFalse);
      expect(find.text('50 XP', skipOffstage: false), findsWidgets);
      expect((await depo.yukle()).gunlukHedef, 50, reason: 'kaydedildi');
    });

    testWidgets('dört yoğunluk dört hedefe karşılık gelir', (tester) async {
      final kap = await ayarlar(tester, const OgrenciDurumu(alan: 'dil'));
      final beklenen = {'rahat': 10, 'orta': 30, 'yogun': 50, 'ciddi': 100};
      for (final e in beklenen.entries) {
        await dokun(tester, find.byKey(ValueKey('yogunluk-${e.key}')));
        expect(_durumOku(kap).gunlukHedef, e.value, reason: e.key);
        expect(cip(tester, e.key).selected, isTrue);
      }
      expect(find.text('Rahat · 10 XP'), findsOneWidget);
      expect(find.text('Ciddi · 100 XP'), findsOneWidget);
    });

    testWidgets('özel hedef (kaydırıcı): hiçbir yoğunluk seçili değil', (
      tester,
    ) async {
      await ayarlar(tester, const OgrenciDurumu(alan: 'dil', gunlukHedef: 35));
      for (final ad in ['rahat', 'orta', 'yogun', 'ciddi']) {
        expect(cip(tester, ad).selected, isFalse, reason: ad);
      }
    });

    testWidgets('kaydırıcı hedefi değişince yoğunluk çipi uyar', (
      tester,
    ) async {
      final kap = await ayarlar(tester, const OgrenciDurumu(alan: 'dil'));
      await kap.read(durumProvider.notifier).ayarGuncelle(gunlukHedef: 100);
      await tester.pumpAndSettle();
      expect(cip(tester, 'ciddi').selected, isTrue);
    });

    testWidgets('hedef değişimi bugünkü ilerlemeyi bozmaz (XP, seri sabit)', (
      tester,
    ) async {
      final kap = await ayarlar(
        tester,
        const OgrenciDurumu(
          alan: 'dil',
          xp: 120,
          seri: 4,
          gunlukXp: {_bugun: 20},
        ),
      );
      await dokun(tester, find.byKey(const ValueKey('yogunluk-ciddi')));
      final d = _durumOku(kap);
      expect((d.xp, d.seri, d.gunlukXp[_bugun]), (120, 4, 20));
    });

    testWidgets(
      'oturum başına kart sayısı: 5 / 10 / 20 seçilir ve kaydedilir',
      (tester) async {
        final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
        final kap = await ayarlar(
          tester,
          const OgrenciDurumu(alan: 'dil'),
          depo: depo,
        );
        final dugme = find.byKey(const ValueKey('ayar-kart-sayisi'));
        await tester.scrollUntilVisible(
          dugme,
          200,
          scrollable: find.byType(Scrollable).first,
        );
        expect(tester.widget<SegmentedButton<int>>(dugme).selected, {5});
        for (final n in [10, 20, 5]) {
          await dokun(
            tester,
            find.descendant(of: dugme, matching: find.text('$n kart')),
          );
          expect(_durumOku(kap).oturumKartSayisi, n);
          expect(tester.widget<SegmentedButton<int>>(dugme).selected, {n});
          expect((await depo.yukle()).oturumKartSayisi, n);
        }
      },
    );

    testWidgets('geçersiz kart sayısı ayarı yok sayılır', (tester) async {
      final kap = await ayarlar(
        tester,
        const OgrenciDurumu(alan: 'dil', oturumKartSayisi: 10),
      );
      await kap.read(durumProvider.notifier).ayarGuncelle(oturumKartSayisi: 7);
      expect(_durumOku(kap).oturumKartSayisi, 10);
    });

    testWidgets(
      'Ses anahtarı korunur: yeni ses efekti/animasyon anahtarı eklenmedi',
      (tester) async {
        await ayarlar(tester, const OgrenciDurumu(alan: 'dil'));
        expect(find.text('Ses'), findsWidgets);
        expect(find.textContaining('efekt'), findsNothing);
        expect(find.textContaining('Animasyon'), findsNothing);
      },
    );

    testWidgets('360x640, ölçek 1,5: Ayarlar taşmaz', (tester) async {
      await ayarlar(
        tester,
        const OgrenciDurumu(alan: 'dil'),
        boyut: _kucuk,
        olcek: 1.5,
      );
      tasmaYok(tester, 'ayarlar');
      await tester.scrollUntilVisible(
        find.byKey(const ValueKey('ayar-kart-sayisi')),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      tasmaYok(tester, 'ayarlar oturum');
    });
  });
}
