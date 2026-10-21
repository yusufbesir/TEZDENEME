// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Kelime defterini CSV dışa aktarma ve metin seçerek sözlükte açma (ÖZELLİK
/// 81): CSV biçimi, kaçışlar, formül önleme, notlar; sözlükteki pano düğmesi;
/// seçim menüsünden "Sözlükte ara".
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/bilesenler/sozluklu_secim.dart';
import 'package:adim_adim/ekranlar/sozluk_ekrani.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/kelime_defteri.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'yeni_ozellik_icerik.dart';

const _bitmis = {tDers1: 1, tDers2: 1};

void main() {
  group('CSV', () {
    test('hücre kaçışı: virgül, tırnak, satır sonu; formül önleme', () {
      expect(KelimeDefteri.hucre('cat'), 'cat');
      expect(KelimeDefteri.hucre('a,b'), '"a,b"');
      expect(KelimeDefteri.hucre('Dedi: "merhaba"'), '"Dedi: ""merhaba"""');
      expect(KelimeDefteri.hucre('iki\nsatır'), '"iki\nsatır"');
      expect(KelimeDefteri.hucre('=1+1'), "'=1+1");
      expect(KelimeDefteri.hucre('+90'), "'+90");
      expect(KelimeDefteri.hucre('-x'), "'-x");
      expect(KelimeDefteri.hucre('@ben'), "'@ben");
      expect(KelimeDefteri.hucre(''), '');
      // Formül öneki ve virgül birlikte.
      expect(KelimeDefteri.hucre('=a,b'), '"\'=a,b"');
    });

    test('boş defter yalnız başlık satırı', () {
      final csv = KelimeDefteri.csv(const OgrenciDurumu(alan: 'dil'), [
        hayvanKursu,
      ]);
      expect(
        csv,
        'kelime,anlam,kurs,ders,kutu,yari_omur_gun,sonraki_tekrar,not',
      );
      expect(KelimeDefteri.sayi(const OgrenciDurumu(), [hayvanKursu]), 0);
    });

    test('satırlar: kelime, anlam, kurs, ders, kart bilgisi ve not', () {
      final d = OgrenciDurumu(
        alan: 'dil',
        tamamlanan: _bitmis,
        kartlar: const {
          '$tDers1#0': Kart(kutu: 3, sonraki: '2026-11-01', yariOmurGun: 5.25),
        },
        kelimeNotlari: const {'$tDers1#0': 'kedi, "miyav"'},
      );
      final csv = KelimeDefteri.csv(d, [hayvanKursu]);
      final satirlar = csv.split('\r\n');
      expect(satirlar, hasLength(1 + hayvanSayisi));
      expect(
        satirlar.first,
        'kelime,anlam,kurs,ders,kutu,yari_omur_gun,sonraki_tekrar,not',
      );
      expect(
        satirlar[1],
        'cat,kedi,Deneme Kursu A1,Bir,3,5.3,2026-11-01,"kedi, ""miyav"""',
      );
      // Aynı alıştırmadan gelen kelime aynı kartı paylaşır (dog, cat ile).
      expect(
        satirlar[2],
        'dog,köpek,Deneme Kursu A1,Bir,3,5.3,2026-11-01,"kedi, ""miyav"""',
      );
      // Kartı olmayan kelimede kart sütunları boş.
      expect(satirlar[3], 'bird,kuş,Deneme Kursu A1,Bir,,,,');
      expect(KelimeDefteri.sayi(d, [hayvanKursu]), hayvanSayisi);
    });

    test('bitmemiş ders ve kartsız kelime deftere girmez', () {
      final d = OgrenciDurumu(alan: 'dil', tamamlanan: const {tDers1: 1});
      final satirlar = KelimeDefteri.csv(d, [hayvanKursu]).split('\r\n');
      expect(satirlar, hasLength(1 + 4)); // cat dog bird fish
      expect(satirlar.join('\n'), isNot(contains('horse')));
    });
  });

  group('Sözlükte ara seçimi', () {
    test('sorgu metni: boşluk teke iner, uzun ya da boş seçim reddedilir', () {
      expect(SozlukluSecim.sorguMetni('  good   morning '), 'good morning');
      expect(SozlukluSecim.sorguMetni('cat'), 'cat');
      expect(SozlukluSecim.sorguMetni(''), isNull);
      expect(SozlukluSecim.sorguMetni('   '), isNull);
      expect(SozlukluSecim.sorguMetni(null), isNull);
      expect(SozlukluSecim.sorguMetni('a' * 61), isNull);
      expect(SozlukluSecim.sorguMetni('a' * 60), hasLength(60));
    });

    test('rota sorguyu kodlar', () {
      expect(SozlukluSecim.rota('good morning'), '/sozluk?q=good+morning');
      expect(SozlukluSecim.rota('a&b'), '/sozluk?q=a%26b');
    });
  });

  group('arayüz', () {
    void panoDinle(WidgetTester tester, void Function(String?) f) {
      tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
        SystemChannels.platform,
        (call) async {
          if (call.method == 'Clipboard.setData') {
            f((call.arguments as Map)['text'] as String?);
          }
          return null;
        },
      );
      addTearDown(
        () => tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
          SystemChannels.platform,
          null,
        ),
      );
    }

    testWidgets('sözlükte CSV düğmesi kelime defterini panoya kopyalar', (
      tester,
    ) async {
      String? pano;
      panoDinle(tester, (t) => pano = t);
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil', tamamlanan: _bitmis)),
        kurslar: [hayvanKursu],
      );
      await dokun(tester, find.byTooltip('Sözlük'));
      await dokun(
        tester,
        find.byTooltip('Kelime defterini CSV olarak kopyala'),
      );
      expect(pano, isNotNull);
      expect(pano, startsWith('kelime,anlam,kurs,ders'));
      expect(pano, contains('cat,kedi,Deneme Kursu A1,Bir'));
      expect(pano!.split('\r\n'), hasLength(1 + hayvanSayisi));
      expect(
        find.text('Kelime defteri kopyalandı: $hayvanSayisi kelime (CSV)'),
        findsOneWidget,
      );
    });

    testWidgets('boş defterde yalnız başlık kopyalanır ve bilgi verilir', (
      tester,
    ) async {
      String? pano;
      panoDinle(tester, (t) => pano = t);
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [hayvanKursu],
      );
      await dokun(tester, find.byTooltip('Sözlük'));
      await dokun(
        tester,
        find.byTooltip('Kelime defterini CSV olarak kopyala'),
      );
      expect(
        pano,
        'kelime,anlam,kurs,ders,kutu,yari_omur_gun,sonraki_tekrar,not',
      );
      expect(
        find.text('Kelime defteri boş; yalnız başlık kopyalandı'),
        findsOneWidget,
      );
    });

    testWidgets('sözlük açılış sorgusu arama kutusuna yazılır', (tester) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [hayvanKursu],
      );
      kap.read(yonlendiriciProvider).go('/sozluk?q=dog');
      await tester.pumpAndSettle();
      expect(find.byType(SozlukEkrani), findsOneWidget);
      expect(
        tester.widget<TextField>(find.byType(TextField)).controller!.text,
        'dog',
      );
      expect(find.text('1 madde'), findsOneWidget);
    });

    testWidgets('metin seçilince menüde "Sözlükte ara" çıkar ve sözlüğü açar', (
      tester,
    ) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'kod')),
        kurslar: [hayvanKursu],
      );
      kap.read(yonlendiriciProvider).go('/ornek/html-ornek-1');
      await tester.pumpAndSettle();
      // Açıklamadaki tek kelimeye uzun bas.
      final aciklama = find.text(
        'En küçük tam HTML sayfası: başlık ve bir paragraf.',
      );
      expect(aciklama, findsOneWidget);
      // İlk kelimenin üzerine uzun bas ("En").
      await tester.longPressAt(
        tester.getTopLeft(aciklama) + const Offset(8, 8),
      );
      await tester.pumpAndSettle();
      final menu = find.text('Sözlükte ara');
      expect(menu, findsOneWidget);
      await tester.tap(menu);
      await tester.pumpAndSettle();
      expect(find.byType(SozlukEkrani), findsOneWidget);
      final sorgu = tester
          .widget<TextField>(find.byType(TextField))
          .controller!
          .text;
      expect(sorgu, isNotEmpty);
      expect(
        'En küçük tam HTML sayfası: başlık ve bir paragraf.',
        contains(sorgu),
      );
    });
  });
}
