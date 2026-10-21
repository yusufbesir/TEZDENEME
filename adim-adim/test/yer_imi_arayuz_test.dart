// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Yer imi arayüzü (ÖZELLİK 72): sözlük maddesinde ve ders öğesinde yer imi
/// düğmesi, Profil satırı, Yer imleri ekranında koleksiyon, not, taşıma,
/// kaldırma, açma ve geçmiş; 480x600 ölçek 1,5 taşmaz.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/ekranlar/sozluk_ekrani.dart';
import 'package:adim_adim/ekranlar/yer_imleri_ekrani.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/yer_imi.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'yeni_ozellik_icerik.dart';

const _kart = '$tDers1#0';
final _madde = YerImleri.sozlukAnahtari(_kart, 'cat');

Finder _satir(String anahtar) => find.byKey(ValueKey('yer-imi-satir-$anahtar'));

void main() {
  testWidgets('sözlükte yer imi ekle/kaldır, Profil satırı ve ekran', (
    tester,
  ) async {
    final kap = await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'dil')),
      kurslar: [hayvanKursu],
    );
    await dokun(tester, find.byTooltip('Sözlük'));
    expect(find.byType(SozlukEkrani), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'cat');
    await tester.pumpAndSettle();
    final dugme = find.byKey(ValueKey('yer-imi-$_madde'));
    expect(find.byTooltip('Yer imine ekle'), findsOneWidget);
    await dokun(tester, dugme);
    expect(find.text('Yer imine eklendi (Genel)'), findsOneWidget);
    expect(kap.read(durumProvider).value!.yerImleri.single.anahtar, _madde);
    expect(find.byTooltip('Yer iminden kaldır'), findsOneWidget);
    await dokun(tester, dugme);
    expect(kap.read(durumProvider).value!.yerImleri, isEmpty);
    await dokun(tester, dugme);

    // Profil satırı yer imi sayısını gösterir ve ekranı açar.
    await dokun(tester, find.byTooltip('Geri'));
    await dokun(tester, find.byIcon(Icons.person_outline));
    final ozet = find.byKey(const ValueKey('profil-yer-imi-ozet'));
    await tester.ensureVisible(ozet);
    expect(tester.widget<Text>(ozet).data, '1 yer imi');
    await dokun(tester, find.byKey(const ValueKey('profil-yer-imleri')));
    expect(find.byType(YerImleriEkrani), findsOneWidget);
    expect(_satir(_madde), findsOneWidget);
    expect(find.text('cat'), findsOneWidget);
    expect(find.text('kedi'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('ders öğesinde yer imi: adım kaydedilir, ekranda ders adımı', (
    tester,
  ) async {
    final kap = await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'dil')),
      kurslar: [hayvanKursu],
    );
    kap.read(yonlendiriciProvider).go('/ders-ogeleri/$tDers1');
    await tester.pumpAndSettle();
    final anahtar = YerImleri.adimAnahtari('$tDers1#0');
    await dokun(tester, find.byKey(ValueKey('yer-imi-$anahtar')).first);
    expect(kap.read(durumProvider).value!.yerImleri.map((y) => y.anahtar), [
      anahtar,
    ]);
    kap.read(yonlendiriciProvider).go('/yer-imleri');
    await tester.pumpAndSettle();
    expect(_satir(anahtar), findsOneWidget);
    expect(find.textContaining('cat = kedi'), findsOneWidget);
  });

  testWidgets('not, taşı, açma geçmişi ve kaldır', (tester) async {
    final depo = BellekDepo(
      OgrenciDurumu(
        alan: 'dil',
        yerImleri: [
          YerImi(anahtar: _madde, gun: '2026-10-20'),
          YerImi(
            anahtar: YerImleri.adimAnahtari('$tDers1#1'),
            gun: '2026-10-20',
          ),
        ],
      ),
    );
    final kap = await uygulamayiAc(tester, depo, kurslar: [hayvanKursu]);
    kap.read(yonlendiriciProvider).go('/yer-imleri');
    await tester.pumpAndSettle();
    expect(find.byKey(const ValueKey('koleksiyon-cip-Genel')), findsOneWidget);

    // Not ekle.
    await dokun(tester, find.byKey(ValueKey('yer-imi-menu-$_madde')));
    await dokun(tester, find.text('Not ekle/düzenle'));
    await tester.enterText(find.byKey(const Key('not-metni')), 'kedi hayvanı');
    await dokun(tester, find.text('Kaydet'));
    expect(
      kap
          .read(durumProvider)
          .value!
          .yerImleri
          .firstWhere((y) => y.anahtar == _madde)
          .not,
      'kedi hayvanı',
    );
    expect(find.textContaining('Not: kedi hayvanı'), findsOneWidget);

    // Yeni koleksiyona taşı.
    await dokun(tester, find.byKey(ValueKey('yer-imi-menu-$_madde')));
    await dokun(tester, find.text('Koleksiyona taşı'));
    await dokun(tester, find.text('Yeni koleksiyon...'));
    await tester.enterText(find.byKey(const Key('koleksiyon-adi')), 'Sınav');
    await dokun(tester, find.text('Tamam'));
    final d = kap.read(durumProvider).value!;
    expect(d.koleksiyonlar, ['Sınav']);
    expect(
      d.yerImleri.firstWhere((y) => y.anahtar == _madde).koleksiyon,
      'Sınav',
    );
    // Seçili koleksiyon Sınav'a geçti: yalnız taşınan görünür.
    expect(_satir(_madde), findsOneWidget);
    expect(_satir(YerImleri.adimAnahtari('$tDers1#1')), findsNothing);

    // Genel'e dön: diğer yer imi görünür.
    await dokun(tester, find.byKey(const ValueKey('koleksiyon-cip-Genel')));
    expect(_satir(YerImleri.adimAnahtari('$tDers1#1')), findsOneWidget);

    // Yer imini aç: geçmişe yazılır, sözlük ekranı sorguyla açılır.
    await dokun(tester, find.byKey(const ValueKey('koleksiyon-cip-Sınav')));
    await dokun(tester, _satir(_madde));
    expect(find.byType(SozlukEkrani), findsOneWidget);
    expect(kap.read(durumProvider).value!.yerImiGecmisi, [_madde]);
    expect(
      tester.widget<TextField>(find.byType(TextField)).controller!.text,
      'cat',
    );
    await dokun(tester, find.byTooltip('Geri'));
    await dokun(tester, find.text('Geçmiş'));
    expect(_satir(_madde), findsOneWidget);
    await dokun(tester, find.byKey(const ValueKey('yer-imi-gecmis-temizle')));
    expect(kap.read(durumProvider).value!.yerImiGecmisi, isEmpty);
    expect(find.text('Henüz açtığın yer imi yok.'), findsOneWidget);

    // Kaldır.
    await dokun(tester, find.text('Koleksiyonlar'));
    await dokun(tester, find.byKey(const ValueKey('koleksiyon-cip-Sınav')));
    await dokun(tester, find.byKey(ValueKey('yer-imi-menu-$_madde')));
    await dokun(tester, find.text('Yer imini kaldır'));
    expect(
      kap.read(durumProvider).value!.yerImleri.any((y) => y.anahtar == _madde),
      isFalse,
    );
    // Koleksiyonu sil: Genel'e dönülür.
    await dokun(tester, find.byKey(const ValueKey('koleksiyon-sil')));
    expect(kap.read(durumProvider).value!.koleksiyonlar, isEmpty);
    expect(find.byKey(const ValueKey('koleksiyon-cip-Genel')), findsOneWidget);
  });

  testWidgets('boş koleksiyonda yönerge; 480x600 ölçek 1,5 taşmaz', (
    tester,
  ) async {
    final kap = await uygulamayiAc(
      tester,
      BellekDepo(
        OgrenciDurumu(
          alan: 'dil',
          yerImleri: [YerImi(anahtar: _madde)],
        ),
      ),
      kurslar: [hayvanKursu],
      boyut: const Size(480, 600),
      metinOlcegi: 1.5,
    );
    kap.read(yonlendiriciProvider).go('/yer-imleri');
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await dokun(tester, find.byKey(const ValueKey('koleksiyon-yeni')));
    await tester.enterText(find.byKey(const Key('koleksiyon-adi')), 'Boş');
    await dokun(tester, find.text('Tamam'));
    expect(find.textContaining('Bu koleksiyonda yer imi yok'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
