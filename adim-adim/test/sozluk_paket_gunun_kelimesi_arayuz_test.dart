/// Arayüz testleri: ana sayfadaki "Günün kelimesi" kartı 480x600'de taşmaz,
/// sesi okur ve "Kartlara ekle" ile kartı öğrenci durumuna yazar; sözlükte
/// paket çipi listeyi ünite maddeleriyle süzer, sıklık rozeti ve kök bilgisi
/// görünür.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/ekranlar/ana_sayfa.dart';
import 'package:adim_adim/ekranlar/sozluk_ekrani.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/sozluk/sozluk.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

/// Eşleştirme çifti içeren küçük kod kursu (paket çipi testi için).
final Kurs _kodKurs = Kurs(
  id: 'html-9',
  ad: 'Sözlük Kod Kursu',
  aciklama: 'Sözlük testi için.',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'html-9.u1',
      ad: 'Etiketler',
      dersler: [
        Ders(
          id: 'html-9.u1.d1',
          ad: 'Etiket Dersi',
          alistirmalar: const [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: '<p>', sag: 'Paragraf'),
                (sol: 'went', sag: 'gitti'),
              ],
            ),
          ],
        ),
      ],
    ),
  ],
);

void main() {
  testWidgets('günün kelimesi kartı 480x600 ölçek 1,5: taşmaz, okur, ekler', (
    tester,
  ) async {
    final ses = SahteSes();
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    final kap = await uygulamayiAc(
      tester,
      depo,
      kurslar: [sahteKurs, _kodKurs],
      ses: ses,
      boyut: const Size(480, 600),
      metinOlcegi: 1.5,
    );
    expect(tester.takeException(), isNull);

    final kart = find.byKey(const ValueKey('gunun-kelimesi'));
    expect(kart, findsOneWidget);
    expect(find.text('Günün kelimesi'), findsOneWidget);

    // Seçilen madde sözlüğün deterministik seçimiyle aynıdır.
    final madde = kap.read(sozlukProvider).gununKelimesi('2026-10-15')!;
    expect(madde.dil, 'en');
    expect(
      find.descendant(of: kart, matching: find.text(madde.kelime)),
      findsOneWidget,
    );
    expect(
      find.descendant(of: kart, matching: find.text(madde.anlam)),
      findsOneWidget,
    );

    // Ses düğmesi kelimeyi okur.
    await dokun(
      tester,
      find.descendant(of: kart, matching: find.byTooltip('Oku')),
    );
    expect(ses.okunanlar, [madde.kelime]);

    // Kartlara ekle: durum ve depo güncellenir, düğme pasif onaya döner.
    await dokun(
      tester,
      find.descendant(of: kart, matching: find.byTooltip('Kartlara ekle')),
    );
    expect(find.text('Tekrar kartı eklendi'), findsOneWidget);
    expect(tester.takeException(), isNull);
    final durum = kap.read(durumProvider).value!;
    expect(durum.kartlar[madde.kartKimligi]?.sonraki, '2026-10-15');
    expect((await depo.yukle()).kartlar.containsKey(madde.kartKimligi), isTrue);
    expect(
      find.descendant(of: kart, matching: find.byTooltip('Kartlara ekle')),
      findsNothing,
    );
    final onay = find.descendant(
      of: kart,
      matching: find.byTooltip('Kartlarda'),
    );
    expect(onay, findsOneWidget);
    expect(
      tester
          .widget<IconButton>(
            find.ancestor(of: onay, matching: find.byType(IconButton)),
          )
          .onPressed,
      isNull,
    );
  });

  testWidgets('kod alanında günün kelimesi kartı yok', (tester) async {
    await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'kod')),
      kurslar: [sahteKurs, sahteKodKurs],
    );
    expect(find.byType(AnaSayfa), findsOneWidget);
    expect(find.byKey(const ValueKey('gunun-kelimesi')), findsNothing);
  });

  testWidgets('günün kelimesi tarihe göre değişir (sabit tarih testi)', (
    tester,
  ) async {
    final kap = await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'dil')),
      kurslar: [sahteKurs],
    );
    final s = kap.read(sozlukProvider);
    final gunler = List.generate(
      14,
      (i) => '2026-10-${(i + 1).toString().padLeft(2, '0')}',
    );
    expect(
      gunler.map((g) => s.gununKelimesi(g)!.kelime).toSet().length,
      greaterThan(1),
    );
  });

  testWidgets('paket çipi listeyi süzer; rozet ve kök bilgisi', (tester) async {
    await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'dil')),
      kurslar: [sahteKurs, _kodKurs],
      boyut: const Size(480, 600),
    );
    await dokun(tester, find.byTooltip('Sözlük'));
    expect(find.byType(SozlukEkrani), findsOneWidget);
    expect(tester.takeException(), isNull);

    // İki paket çipi: 'Sahte Ünite' (dil) ve 'Etiketler' (kod).
    expect(find.widgetWithText(FilterChip, 'Sahte Ünite'), findsOneWidget);
    expect(find.widgetWithText(FilterChip, 'Etiketler'), findsOneWidget);
    expect(find.text('5 madde'), findsOneWidget);

    await dokun(tester, find.widgetWithText(FilterChip, 'Etiketler'));
    expect(find.text('2 madde · Etiketler'), findsOneWidget);
    expect(find.text('<p>'), findsOneWidget);
    expect(find.text('cat'), findsNothing);
    expect(tester.takeException(), isNull);

    // Çipe yeniden dokunmak süzgeci kaldırır.
    await dokun(tester, find.widgetWithText(FilterChip, 'Etiketler'));
    expect(find.text('5 madde'), findsOneWidget);
    expect(find.text('cat'), findsOneWidget);

    // Paket + arama birlikte: 'Sahte Ünite' paketinde 'cat'.
    await dokun(tester, find.widgetWithText(FilterChip, 'Sahte Ünite'));
    await tester.enterText(find.byType(TextField), 'cat');
    await tester.pumpAndSettle();
    expect(find.text('1 madde · Sahte Ünite'), findsOneWidget);

    // 'cat' sıklık listesinde (≤300): rozet görünür; kök aynı: kök bilgisi yok.
    expect(find.byType(SiklikRozeti), findsOneWidget);
    expect(find.textContaining('kök:'), findsNothing);
    await dokun(tester, find.widgetWithText(FilterChip, 'Sahte Ünite'));
    await dokun(tester, find.byTooltip('Temizle'));

    // 'went' kod kursunda: kök farklı olsa da dil 'kod' olduğu için
    // kök bilgisi ve rozet yok.
    await tester.enterText(find.byType(TextField), 'went');
    await tester.pumpAndSettle();
    expect(find.widgetWithText(ListTile, 'went'), findsOneWidget);
    expect(find.textContaining('kök:'), findsNothing);
  });

  testWidgets('İngilizce maddede kök bilgisi görünür ve köke göre bulunur', (
    tester,
  ) async {
    final kurs = Kurs(
      id: 'ingilizce-9',
      ad: 'Kök Kursu',
      aciklama: '',
      alan: KursAlani.dil,
      uniteler: [
        Unite(
          id: 'ingilizce-9.u1',
          ad: 'Kök Ünitesi',
          dersler: [
            Ders(
              id: 'ingilizce-9.u1.d1',
              ad: 'D',
              alistirmalar: const [
                Eslestir(
                  soru: 'Eşleştir.',
                  ciftler: [
                    (sol: 'running', sag: 'koşuyor'),
                    (sol: 'the', sag: 'belirli tanımlık'),
                  ],
                ),
              ],
            ),
          ],
        ),
      ],
    );
    await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'dil')),
      kurslar: [kurs],
      boyut: const Size(480, 600),
    );
    await dokun(tester, find.byTooltip('Sözlük'));
    await tester.enterText(find.byType(TextField), 'run');
    await tester.pumpAndSettle();
    expect(find.text('running'), findsOneWidget);
    expect(find.text('kök: run'), findsOneWidget);
    // 'the' sıklık 1: "Çok sık" rozeti.
    await tester.enterText(find.byType(TextField), 'the');
    await tester.pumpAndSettle();
    expect(find.text('Çok sık'), findsOneWidget);
    expect(tester.takeException(), isNull);
    expect(Sozluk.normalize('the'), 'the');
  });
}
