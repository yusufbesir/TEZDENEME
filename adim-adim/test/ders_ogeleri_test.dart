// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Ders sonu tekrar öğeleri (ÖZELLİK 62): DersOgeleri türetme mantığı, ders
/// sonundaki "Bu dersin öğeleri" düğmesi, üç sekme (boş sekme gizli), tek
/// dokunuşla okuma, kartlara ekleme, toplu ekleme ve 480x600 @1,5 taşma.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/ders_ogeleri.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

const _ders = Ders(
  id: 'almanca-t.u1.d1',
  ad: 'Öğe Dersi',
  alistirmalar: [
    Eslestir(
      soru: 'E',
      ciftler: [
        (sol: 'Hallo', sag: 'Merhaba'),
        (sol: 'to go', sag: 'gitmek'),
        (sol: 'Wie geht es dir heute', sag: 'Bugün nasılsın'),
      ],
    ),
    Secim(
      soru: '"Katze" ne demektir?',
      secenekler: ['Köpek', 'Kedi'],
      dogru: 1,
    ),
    Dinle(
      soru: 'Dinle',
      okunacak: 'Wie geht es dir',
      secenekler: ['Wie geht es dir', 'Gute Nacht'],
      dogru: 0,
      dil: 'de-DE',
    ),
    Yaz(soru: '"Teşekkürler" Almanca?', cevaplar: ['Danke']),
    Sirala(
      soru: 'Sırala',
      kelimeler: ['bin', 'Ich', 'müde'],
      dogru: ['Ich', 'bin', 'müde'],
    ),
    Tablo(
      soru: 'Tablo',
      baslik: ['Zamir', 'sein'],
      satirlar: [
        ['ich', 'bin'],
        ['du', 'bist'],
      ],
      bos: [(satir: 0, sutun: 1), (satir: 1, sutun: 1)],
    ),
    // Aynı çift tekrar: öğe yinelenmez.
    Eslestir(soru: 'E2', ciftler: [(sol: 'Hallo', sag: 'Merhaba')]),
  ],
);

Kurs _kurs(String id, KursAlani alan, Ders ders) => Kurs(
  id: id,
  ad: 'Öğe Kursu',
  aciklama: '',
  alan: alan,
  uniteler: [
    Unite(id: '$id.u1', ad: 'Ünite', dersler: [ders]),
  ],
);

void main() {
  group('DersOgeleri.uret', () {
    test('dil kursu: kelime, kalıp ve fiil; tekrarlar birleşir', () {
      final o = DersOgeleri.uret(_ders, alan: KursAlani.dil);
      expect(o.kodMu, isFalse);
      expect(o.tureGore(OgeTuru.kelime).map((e) => e.metin), [
        'Hallo',
        'Katze',
        'Danke',
      ]);
      expect(o.tureGore(OgeTuru.kalip).map((e) => e.metin), [
        'Wie geht es dir heute',
        'Wie geht es dir',
        'Ich bin müde',
      ]);
      expect(o.tureGore(OgeTuru.fiil).map((e) => e.metin), [
        'to go',
        'ich bin',
        'du bist',
      ]);
      expect(o.baslik(OgeTuru.kelime), 'Kelime');
      expect(o.baslik(OgeTuru.fiil), 'Fiil');
      final katze = o.tureGore(OgeTuru.kelime)[1];
      expect(katze.anlam, 'Kedi');
      expect(katze.kartId, 'almanca-t.u1.d1#1');
      // Dinle kendi dilini, diğerleri kurs dilini kullanır.
      final dinle = o.tureGore(OgeTuru.kalip)[1];
      expect(dinle.sesDili, 'de-DE');
      expect(o.tureGore(OgeTuru.kelime).first.sesDili, 'en-US');
      expect(o.tureGore(OgeTuru.fiil).last.anlam, 'sein');
    });

    test('kurs kimliğinden okuma dili', () {
      expect(DersOgeleri.kursSesDili('almanca-a1'), 'de-DE');
      expect(DersOgeleri.kursSesDili('korece-1'), 'ko-KR');
      expect(DersOgeleri.kursSesDili('japonca-1'), 'ja-JP');
      expect(DersOgeleri.kursSesDili('cince-1'), 'zh-CN');
      expect(DersOgeleri.kursSesDili('ingilizce-1'), 'en-US');
    });

    test('kod kursu: terim/kalıp/söz dizimi, sesli okuma yok', () {
      const d = Ders(
        id: 'html-t.u1.d1',
        ad: 'Kod',
        alistirmalar: [
          Eslestir(soru: 'E', ciftler: [(sol: '<p>', sag: 'paragraf')]),
          Kod(
            soru: 'Doldur',
            kod: '<b>___</b>',
            secenekler: ['kalın', 'x'],
            dogru: 0,
          ),
          Bosluk(soru: 'Bir ___ etiketi', secenekler: ['h1'], dogru: 0),
        ],
      );
      final o = DersOgeleri.uret(d, alan: KursAlani.kod);
      expect(o.kodMu, isTrue);
      expect(o.baslik(OgeTuru.kelime), 'Terim');
      expect(o.baslik(OgeTuru.fiil), 'Söz dizimi');
      expect(o.tureGore(OgeTuru.fiil).single.metin, '<b>kalın</b>');
      expect(o.tureGore(OgeTuru.kalip).single.metin, 'Bir h1 etiketi');
      expect(o.ogeler.every((e) => e.sesDili == null), isTrue);
    });

    test('öğe çıkmayan ders boş; geçersiz tablo hücresi atlanır', () {
      const d = Ders(
        id: 'x.u1.d1',
        ad: 'B',
        alistirmalar: [
          Hamle(soru: 'h', fen: '8/8/8/8/8/8/8/8 w - - 0 1', hamleler: ['a']),
          Tablo(
            soru: 't',
            baslik: ['a'],
            satirlar: [
              ['x'],
            ],
            bos: [(satir: 3, sutun: 0)],
          ),
        ],
      );
      expect(DersOgeleri.uret(d, alan: KursAlani.dil).bos, isTrue);
    });
  });

  group('arayüz', () {
    Future<ProviderContainer> ac(
      WidgetTester tester,
      Kurs kurs, {
      BellekDepo? depo,
      SahteSes? ses,
      Size boyut = const Size(500, 1600),
      double olcek = 1.0,
      OgrenciDurumu durum = const OgrenciDurumu(alan: 'dil'),
    }) async {
      final kap = await uygulamayiAc(
        tester,
        depo ?? BellekDepo(durum),
        kurslar: [kurs],
        ses: ses,
        boyut: boyut,
        metinOlcegi: olcek,
      );
      kap
          .read(yonlendiriciProvider)
          .push(
            '/ders-ogeleri/${Uri.encodeComponent(kurs.uniteler[0].dersler[0].id)}',
          );
      await tester.pumpAndSettle();
      return kap;
    }

    testWidgets('üç sekme, okuma, tek ve toplu kart ekleme, 480x600 @1,5', (
      tester,
    ) async {
      final ses = SahteSes();
      final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
      final kap = await ac(
        tester,
        _kurs('almanca-t', KursAlani.dil, _ders),
        depo: depo,
        ses: ses,
        boyut: const Size(480, 600),
        olcek: 1.5,
      );
      expect(find.text('Kelime (3)'), findsOneWidget);
      expect(find.text('Kalıp (3)'), findsOneWidget);
      expect(find.text('Fiil (3)'), findsOneWidget);
      expect(find.text('Hallo'), findsOneWidget);
      expect(tester.takeException(), isNull);

      // Tek dokunuşla okuma (kurs dili Almanca).
      await dokun(tester, find.byTooltip('Oku').first);
      expect(ses.okunanlar, ['Hallo']);

      // Tek kart ekleme.
      await dokun(tester, find.byTooltip('Kartlara ekle').first);
      expect(kap.read(durumProvider).value!.kartlar.keys, [
        'almanca-t.u1.d1#0',
      ]);
      expect(find.byTooltip('Kartlarda'), findsOneWidget);

      // Diğer sekmeler gezilebilir, taşma yok.
      await dokun(tester, find.text('Kalıp (3)'));
      expect(find.text('Wie geht es dir'), findsOneWidget);
      await dokun(tester, find.text('Fiil (3)'));
      expect(find.text('ich bin'), findsOneWidget);
      expect(tester.takeException(), isNull);

      // Toplu ekleme: kalan tüm alıştırma kartları.
      await dokun(tester, find.byKey(const ValueKey('ogeler-hepsini-ekle')));
      final d = kap.read(durumProvider).value!;
      expect(d.kartlar.keys.toSet(), {
        for (final i in [0, 1, 2, 3, 4, 5]) 'almanca-t.u1.d1#$i',
      });
      expect((await depo.yukle()).kartlar, hasLength(6));
      expect(find.text('Hepsi kartlarda'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });

    testWidgets('boş sekme gizlenir; ses kapalıysa okuma devre dışı', (
      tester,
    ) async {
      const ders = Ders(
        id: 'almanca-t.u1.d1',
        ad: 'Sade',
        alistirmalar: [
          Eslestir(soru: 'E', ciftler: [(sol: 'Hallo', sag: 'Merhaba')]),
        ],
      );
      await ac(
        tester,
        _kurs('almanca-t', KursAlani.dil, ders),
        durum: const OgrenciDurumu(alan: 'dil', sesAcik: false),
      );
      expect(find.text('Kelime (1)'), findsOneWidget);
      expect(find.text('Kalıp (1)'), findsNothing);
      expect(find.text('Fiil (1)'), findsNothing);
      final dugme = tester.widget<IconButton>(
        find.widgetWithIcon(IconButton, Icons.volume_up_outlined),
      );
      expect(dugme.onPressed, isNull);
    });

    testWidgets('kod kursunda okuma düğmesi yok, sekmeler terim/söz dizimi', (
      tester,
    ) async {
      const ders = Ders(
        id: 'html-t.u1.d1',
        ad: 'Kod',
        alistirmalar: [
          Eslestir(soru: 'E', ciftler: [(sol: '<p>', sag: 'paragraf')]),
          Kod(
            soru: 'Doldur',
            kod: '<b>___</b>',
            secenekler: ['kalın', 'x'],
            dogru: 0,
          ),
        ],
      );
      await ac(
        tester,
        _kurs('html-t', KursAlani.kod, ders),
        durum: const OgrenciDurumu(alan: 'kod'),
      );
      expect(find.text('Terim (1)'), findsOneWidget);
      expect(find.text('Söz dizimi (1)'), findsOneWidget);
      expect(find.byTooltip('Oku'), findsNothing);
      expect(find.byIcon(Icons.volume_up_outlined), findsNothing);
    });

    testWidgets('öğesi olmayan ders için bilgi mesajı', (tester) async {
      const ders = Ders(
        id: 'x-t.u1.d1',
        ad: 'Boş',
        alistirmalar: [
          Secim(soru: 'Soru?', secenekler: ['a', 'b'], dogru: 0),
        ],
      );
      await ac(tester, _kurs('x-t', KursAlani.dil, ders));
      expect(find.text('Bu dersten türetilen öğe yok.'), findsOneWidget);
    });

    testWidgets('ders sonunda "Bu dersin öğeleri" düğmesi ekranı açar', (
      tester,
    ) async {
      const ders = Ders(
        id: 'almanca-t.u1.d1',
        ad: 'Tek Soru',
        alistirmalar: [
          Secim(
            soru: '"Katze" ne demektir?',
            secenekler: ['Köpek', 'Kedi'],
            dogru: 1,
          ),
        ],
      );
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [_kurs('almanca-t', KursAlani.dil, ders)],
        boyut: const Size(480, 600),
        metinOlcegi: 1.5,
      );
      final baslat = find.textContaining('Tek Soru');
      await tester.scrollUntilVisible(
        baslat,
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await dokun(tester, baslat);
      await dokun(tester, find.text('Kedi'));
      await dokun(tester, find.text('Kontrol et'));
      await dokun(tester, find.text('Bitir'));
      expect(find.text('Ders tamamlandı'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await dokun(tester, find.byKey(const Key('ozet-ek3')));
      expect(find.text('Katze'), findsOneWidget);
      expect(find.text('Kelime (1)'), findsOneWidget);
      expect(tester.takeException(), isNull);
    });
  });
}
