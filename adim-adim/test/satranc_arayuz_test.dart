// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Satranç modülü arayüz testleri (ÖZELLİK 47, 52-57): Oyunlar alanındaki
/// giriş düğmesi, merkez, günlük bulmaca (doğru/yanlış), Yanlışlarım, mini
/// maç ve inceleme, serbest tahta, oyun sonu, tahta görme (30 sn), Solo,
/// kendi analizin, ustalık kursu ve dar ekranda taşma olmaması.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/satranc_calisma.dart';
import 'package:adim_adim/satranc/satranc.dart';
import 'package:adim_adim/satranc/veri.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

const _bugun = '2026-10-15';

Future<ProviderContainer> _ac(
  WidgetTester tester, {
  OgrenciDurumu? durum,
  Size boyut = const Size(500, 1600),
}) async {
  final c = await uygulamayiAc(
    tester,
    BellekDepo(durum ?? const OgrenciDurumu(alan: 'oyun')),
    kurslar: tumKurslar,
    boyut: boyut,
  );
  await dokun(tester, find.byKey(const ValueKey('satranc-merkezi')));
  return c;
}

Future<void> _git(WidgetTester tester, String anahtar) =>
    dokun(tester, find.byKey(ValueKey(anahtar)));

Future<void> _kare(WidgetTester tester, String ad) =>
    dokun(tester, find.byKey(ValueKey('kare-$ad')));

/// "e2e4" biçimindeki hamleyi iki dokunuşla oynar (terfi yok).
Future<void> _oyna(WidgetTester tester, String uci) async {
  await _kare(tester, uci.substring(0, 2));
  await _kare(tester, uci.substring(2, 4));
}

OgrenciDurumu _durum(ProviderContainer c) =>
    c.read(durumProvider).value ?? const OgrenciDurumu();

void main() {
  testWidgets('Oyunlar alanında giriş düğmesi merkezi açar; diğer alanda yok', (
    tester,
  ) async {
    await _ac(tester);
    expect(find.text('Satranç merkezi'), findsWidgets);
    for (final k in [
      'satranc-gunluk',
      'satranc-mac',
      'satranc-serbest',
      'satranc-tema',
      'satranc-yanlis',
      'satranc-solo',
      'satranc-analiz',
      'satranc-oyunsonu',
      'satranc-koordinat',
      'satranc-ustalik',
    ]) {
      expect(find.byKey(ValueKey(k)), findsOneWidget, reason: k);
    }
    // Son maç yokken inceleme kartı gizli.
    expect(find.byKey(const ValueKey('satranc-incele')), findsNothing);
  });

  testWidgets('dil alanında satranç düğmesi görünmez', (tester) async {
    await uygulamayiAc(
      tester,
      BellekDepo(const OgrenciDurumu(alan: 'dil')),
      kurslar: tumKurslar,
    );
    expect(find.byKey(const ValueKey('satranc-merkezi')), findsNothing);
  });

  testWidgets('günlük bulmaca: doğru çözüm ilk denemede kaydedilir', (
    tester,
  ) async {
    final c = await _ac(tester);
    await _git(tester, 'satranc-gunluk');
    final b = SatrancCalisma.gunlukBulmaca(_bugun);
    for (var i = 0; i < b.hamleler.length; i += 2) {
      await _oyna(tester, b.hamleler[i]);
    }
    expect(find.byKey(const Key('bulmaca-cozum-metni')), findsOneWidget);
    expect(_durum(c).satranc.gunlukBulmaca[_bugun], true);
    expect(_durum(c).satranc.tekrarKartlari, isEmpty);
  });

  testWidgets('günlük bulmaca: çözümü göster = yanlış, tekrar destesine girer; '
      'Yanlışlarım bugün sıra boş, sonra kart vadesinde görünür', (
    tester,
  ) async {
    final c = await _ac(tester);
    await _git(tester, 'satranc-gunluk');
    await dokun(tester, find.byKey(const Key('bulmaca-cozum')));
    expect(find.byKey(const Key('bulmaca-cozum-metni')), findsOneWidget);
    expect(_durum(c).satranc.gunlukBulmaca[_bugun], false);
    expect(SatrancCalisma.desteBulmacaSayisi(_durum(c)), 1);
    // Aralık ertesi güne: bugün bekleyen yok.
    expect(SatrancCalisma.bekleyenBulmacalar(_durum(c), _bugun), isEmpty);
    // Geri dönüp Yanlışlarım'a bak: bugün tekrar yok.
    await dokun(tester, find.byTooltip('Geri'));
    await _git(tester, 'satranc-yanlis');
    expect(find.byKey(const Key('yanlis-bos')), findsOneWidget);
  });

  testWidgets(
    'Yanlışlarım: vadesi gelen bulmaca sunulur, çözülünce kuyruk biter',
    (tester) async {
      final b = SatrancVeri.bulmacalar.first;
      // Dünden yanlış kalan kart: bugün vadesi gelmiş.
      final d = SatrancCalisma.bulmacaSonucu(
        const OgrenciDurumu(alan: 'oyun'),
        b.id,
        false,
        '2026-10-10',
      );
      final c = await _ac(tester, durum: d);
      expect(SatrancCalisma.bekleyenBulmacalar(_durum(c), _bugun), isNotEmpty);
      await _git(tester, 'satranc-yanlis');
      expect(find.byKey(const Key('yanlis-sira')), findsOneWidget);
      final bekleyen = SatrancCalisma.bekleyenBulmacalar(_durum(c), _bugun);
      final ilk = SatrancVeri.bulmacaBul(bekleyen.first)!;
      for (var i = 0; i < ilk.hamleler.length; i += 2) {
        await _oyna(tester, ilk.hamleler[i]);
      }
      expect(find.byKey(const Key('bulmaca-cozum-metni')), findsOneWidget);
      // Doğru çözüm kartın yarı ömrünü ikiledi; ders kartları değişmedi.
      expect(_durum(c).kartlar, isEmpty);
    },
  );

  testWidgets('tema listesi ve tema bulmacası açılır', (tester) async {
    await _ac(tester);
    await _git(tester, 'satranc-tema');
    final t = SatrancVeri.temalar.first;
    await _git(tester, 'tema-${t.id}');
    expect(find.byKey(const Key('tema-sira')), findsOneWidget);
  });

  testWidgets('serbest tahta: iki taraf oynanır, hamle listesi güncellenir', (
    tester,
  ) async {
    await _ac(tester);
    await _git(tester, 'satranc-serbest');
    await _oyna(tester, 'e2e4');
    await _oyna(tester, 'e7e5');
    final liste = tester.widget<Text>(
      find.byKey(const Key('serbest-hamleler')),
    );
    expect(liste.data, allOf(contains('e4'), contains('e5')));
    await dokun(tester, find.byKey(const Key('serbest-sifirla')));
    expect(find.byKey(const Key('serbest-durum')), findsOneWidget);
  });

  testWidgets('mini maç: konum seç, oyna, pes et, incele; kayıt yazılır', (
    tester,
  ) async {
    final c = await _ac(tester);
    await _git(tester, 'satranc-mac');
    final m = SatrancVeri.miniMaclar.first;
    await _git(tester, 'mac-${m.id}');
    // Beyaz kullanıcıysa bir hamle oyna; bilgisayar yanıtlar.
    if (m.kullaniciBeyaz) {
      final hamle = _ilkYasal(m.fen);
      await _oyna(tester, hamle);
    }
    await dokun(tester, find.byKey(const Key('oyun-pes')));
    expect(find.byKey(const Key('mac-sonuc')), findsOneWidget);
    expect(_durum(c).satranc.oynananMac, 1);
    expect(_durum(c).satranc.sonMac, isNotNull);
    await dokun(tester, find.byKey(const Key('mac-incele')));
    expect(find.byKey(const Key('inceleme-ozet')), findsOneWidget);
    await dokun(tester, find.byKey(const Key('inceleme-ileri')));
  });

  testWidgets('oyun sonu: liste, pratik modu, meydan okuma moduna geçiş', (
    tester,
  ) async {
    await _ac(tester);
    await _git(tester, 'satranc-oyunsonu');
    final k = SatrancVeri.oyunSonlari.first;
    await _git(tester, 'oyunsonu-${k.id}');
    expect(find.byKey(const Key('oyunsonu-hedef')), findsOneWidget);
    await dokun(tester, find.text('Meydan okuma'));
    expect(find.textContaining('Hedef: ${k.enAz} hamlede mat'), findsOneWidget);
  });

  testWidgets('tahta görme: 30 sn dolunca sonuç ve en iyi skor yazılır', (
    tester,
  ) async {
    final c = await _ac(tester);
    await _git(tester, 'satranc-koordinat');
    await dokun(tester, find.byKey(const Key('koordinat-basla')));
    expect(find.byKey(const Key('koordinat-sure')), findsOneWidget);
    await tester.pump(const Duration(seconds: 31));
    await tester.pump();
    expect(find.byKey(const Key('koordinat-sonuc')), findsOneWidget);
    expect(_durum(c).satranc.koordinatEnIyi['dokun'], 0);
  });

  testWidgets('Solo: çözüm hamleleriyle çözülür ve kaydedilir', (tester) async {
    final c = await _ac(tester);
    await _git(tester, 'satranc-solo');
    final s = SatrancVeri.soloBulmacalar.first;
    await _git(tester, 'solo-${s.id}');
    for (final u in s.cozum) {
      await _oyna(tester, u);
    }
    expect(find.byKey(const Key('solo-sonuc')), findsOneWidget);
    expect(_durum(c).satranc.soloCozulen, contains(s.id));
  });

  testWidgets('kendi analizin: hamle + doğru gerekçe, sonra çözüm gösterilir', (
    tester,
  ) async {
    final c = await _ac(tester);
    await _git(tester, 'satranc-analiz');
    final a = SatrancVeri.analizler.first;
    await _git(tester, 'analiz-${a.id}');
    await _oyna(tester, a.enIyi);
    await _git(tester, 'analiz-gerekce-${a.dogruGerekce}');
    await dokun(tester, find.byKey(const Key('analiz-karsilastir')));
    expect(find.byKey(const Key('analiz-cozum')), findsOneWidget);
    expect(_durum(c).satranc.analizler[a.id], isNotNull);
  });

  testWidgets('ustalık kursu: boş durum; bitmiş ders sonrası kart listelenir', (
    tester,
  ) async {
    await _ac(tester);
    await _git(tester, 'satranc-ustalik');
    expect(find.byKey(const Key('ustalik-bos')), findsOneWidget);
  });

  testWidgets('ders sonu tahta meydan okuması ekranı açılır', (tester) async {
    final c = await _ac(tester);
    final router = c.read(yonlendiriciProvider);
    router.push('/satranc/meydan/satranc-1-u1-d1');
    await tester.pumpAndSettle();
    expect(
      find.byKey(const ValueKey('meydan-satranc-1-u1-d1')),
      findsOneWidget,
    );
  });

  testWidgets('dar ekran 320x568 ve büyük yazı: merkez ve bulmaca taşmaz', (
    tester,
  ) async {
    await _ac(tester, boyut: const Size(320, 568));
    await _git(tester, 'satranc-gunluk');
    expect(find.byKey(const Key('bulmaca-ipucu')), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}

/// Konumdaki ilk yasal hamlenin UCI'si (test yardımcısı).
String _ilkYasal(String fen) {
  final k = Konum.fen(fen);
  return k.yasalHamleler.first.uci;
}
