/// Sözlük ekranı arayüz testleri: 480x600'de taşmadan çizilir, aramayla
/// liste daralır, çip filtresi çalışır, ses simgesi sahte sesi çağırır,
/// "Kartlara ekle" kartı öğrenci durumuna yazar ve düğme "Kartlarda" olur.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/ekranlar/sozluk_ekrani.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

/// Eşleştirme çifti içeren küçük kod kursu (sahteKodKurs'ta eşleştirme yok).
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
                (sol: '<br>', sag: 'Satır sonu'),
              ],
            ),
          ],
        ),
      ],
    ),
  ],
);

/// Sahte kurslarla uygulamayı açar ve Yol sekmesindeki kitap simgesiyle
/// sözlüğe gider. Sahte dil kursunda cat/dog/bird, kod kursunda <p>/<br>
/// eşleştirme çiftleri bulunur.
Future<SahteSes> _sozlugeGit(WidgetTester tester, {Size? boyut}) async {
  final ses = SahteSes();
  await uygulamayiAc(
    tester,
    BellekDepo(const OgrenciDurumu(alan: 'dil')),
    kurslar: [sahteKurs, _kodKurs],
    ses: ses,
    boyut: boyut ?? const Size(500, 1600),
  );
  await dokun(tester, find.byTooltip('Sözlük'));
  expect(find.byType(SozlukEkrani), findsOneWidget);
  return ses;
}

void main() {
  testWidgets('480x600 ve 1,5 metin ölçeğinde taşmadan çizilir', (
    tester,
  ) async {
    final ses = SahteSes();
    await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'dil')),
      kurslar: [sahteKurs, _kodKurs],
      ses: ses,
      boyut: const Size(480, 600),
      metinOlcegi: 1.5,
    );
    await dokun(tester, find.byTooltip('Sözlük'));
    expect(find.byType(SozlukEkrani), findsOneWidget);
    // Tembel liste: dar ekranda ve büyük yazıda yer imi düğmesi satırı
    // uzattığı için yalnız ilk satırların kurulduğu doğrulanır.
    expect(find.byType(ListTile), findsWidgets);
    expect(tester.takeException(), isNull);
  });

  testWidgets('arama listeyi daraltır; sonuç yoksa "Sonuç yok"', (
    tester,
  ) async {
    await _sozlugeGit(tester);
    expect(find.text('cat'), findsOneWidget);
    expect(find.text('dog'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'KEDİ');
    await tester.pumpAndSettle();
    expect(find.text('cat'), findsOneWidget);
    expect(find.text('dog'), findsNothing);
    expect(find.text('1 madde'), findsOneWidget);

    await tester.enterText(find.byType(TextField), 'zzz');
    await tester.pumpAndSettle();
    expect(find.text('Sonuç yok'), findsOneWidget);

    // Temizle düğmesi aramayı sıfırlar.
    await dokun(tester, find.byTooltip('Temizle'));
    expect(find.text('cat'), findsOneWidget);
    expect(find.text('Sonuç yok'), findsNothing);
  });

  testWidgets('dil çipleri filtreler; kod maddesinde ses yok', (tester) async {
    final ses = await _sozlugeGit(tester);
    final okuSayisiTumu = find.byTooltip('Oku').evaluate().length;
    expect(okuSayisiTumu, greaterThan(0));

    await dokun(tester, find.text('Kod'));
    expect(find.text('cat'), findsNothing);
    expect(find.byTooltip('Oku'), findsNothing);
    expect(find.byIcon(Icons.code), findsWidgets);

    await dokun(tester, find.text('İngilizce'));
    expect(find.text('cat'), findsOneWidget);
    expect(find.byIcon(Icons.code), findsNothing);

    // Ses simgesi sahte sesi kelimeyle çağırır.
    await tester.enterText(find.byType(TextField), 'cat');
    await tester.pumpAndSettle();
    await dokun(tester, find.byTooltip('Oku').first);
    expect(ses.okunanlar, ['cat']);

    await dokun(tester, find.text('Tümü'));
    expect(find.byIcon(Icons.code), findsNothing); // sorgu hâlâ 'cat'
    await dokun(tester, find.byTooltip('Temizle'));
    expect(find.byIcon(Icons.code), findsWidgets);
  });

  testWidgets('geri düğmesi Yol sekmesine döner', (tester) async {
    await _sozlugeGit(tester);
    await dokun(tester, find.byTooltip('Geri'));
    expect(find.byType(SozlukEkrani), findsNothing);
    expect(find.text('Sahte Ünite'), findsOneWidget);
  });

  testWidgets(
    'Kartlara ekle: kart durumda, düğme Kartlarda olur, 480x600 taşmaz',
    (tester) async {
      final ses = SahteSes();
      final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
      final kap = await uygulamayiAc(
        tester,
        depo,
        kurslar: [sahteKurs, _kodKurs],
        ses: ses,
        boyut: const Size(480, 600),
      );
      await dokun(tester, find.byTooltip('Sözlük'));
      expect(find.byType(SozlukEkrani), findsOneWidget);
      expect(tester.takeException(), isNull);

      await tester.enterText(find.byType(TextField), 'cat');
      await tester.pumpAndSettle();
      expect(find.text('1 madde'), findsOneWidget);
      expect(find.byTooltip('Kartlara ekle'), findsOneWidget);
      expect(find.byTooltip('Kartlarda'), findsNothing);

      await dokun(tester, find.byTooltip('Kartlara ekle'));
      expect(find.text('Tekrar kartı eklendi'), findsOneWidget);
      expect(tester.takeException(), isNull);

      // sahteKurs'ta cat/kedi eşleştirmesi Ders Bir'in 4. alıştırmasıdır.
      const kartId = '$sahteDers1#4';
      final durum = kap.read(durumProvider).value!;
      expect(durum.kartlar[kartId]?.sonraki, '2026-10-15');
      expect((await depo.yukle()).kartlar.containsKey(kartId), isTrue);

      // Düğme pasif onay simgesine döner.
      expect(find.byTooltip('Kartlara ekle'), findsNothing);
      final kartlarda = find.byTooltip('Kartlarda');
      expect(kartlarda, findsOneWidget);
      expect(find.byIcon(Icons.check_circle), findsOneWidget);
      final dugme = tester.widget<IconButton>(
        find.ancestor(of: kartlarda, matching: find.byType(IconButton)),
      );
      expect(dugme.onPressed, isNull);

      // Tekrar sekmesi rozeti bekleyen kartı sayar.
      await dokun(tester, find.byTooltip('Geri'));
      expect(find.byType(Badge), findsOneWidget);
      expect(find.text('1'), findsWidgets);
      expect(tester.takeException(), isNull);
    },
  );
}
