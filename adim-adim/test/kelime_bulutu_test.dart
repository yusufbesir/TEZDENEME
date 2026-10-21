// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Kelime bulutu ve profildeki öğrenilen kelime sayısı (ÖZELLİK 66): yalnız
/// öğrenilmiş (bitmiş ders ya da kartlı) kelimeler, güç/boyut hesabı, kod
/// kurslarının dışta kalması, profil satırı ve bulut ekranı.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/ders_ogeleri.dart';
import 'package:adim_adim/motor/kelime_bulutu.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

const _d1 = 'ingilizce-kb.u1.d1';
const _d2 = 'ingilizce-kb.u1.d2';

final Kurs _kurs = Kurs(
  id: 'ingilizce-kb',
  ad: 'Bulut Kursu',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'ingilizce-kb.u1',
      ad: 'Hayvanlar',
      dersler: [
        Ders(
          id: _d1,
          ad: 'Bir',
          alistirmalar: const [
            Eslestir(soru: 'Eşleştir', ciftler: [(sol: 'cat', sag: 'kedi')]),
            Eslestir(soru: 'Eşleştir', ciftler: [(sol: 'dog', sag: 'köpek')]),
          ],
        ),
        Ders(
          id: _d2,
          ad: 'İki',
          alistirmalar: const [
            Eslestir(soru: 'Eşleştir', ciftler: [(sol: 'bird', sag: 'kuş')]),
            Eslestir(soru: 'Eşleştir', ciftler: [(sol: 'cat', sag: 'kedi')]),
          ],
        ),
      ],
    ),
  ],
);

final Kurs _kod = Kurs(
  id: 'python-kb',
  ad: 'Kod',
  aciklama: '',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'python-kb.u1',
      ad: 'U',
      dersler: [
        Ders(
          id: 'python-kb.u1.d1',
          ad: 'D',
          alistirmalar: const [
            Eslestir(soru: 'E', ciftler: [(sol: 'print', sag: 'yazdır')]),
          ],
        ),
      ],
    ),
  ],
);

String _kartId(String ders, String metin) => DersOgeleri.uret(
  _kurs.tumDersler.firstWhere((d) => d.id == ders),
  alan: KursAlani.dil,
).tureGore(OgeTuru.kelime).firstWhere((o) => o.metin == metin).kartId;

void main() {
  group('Motor', () {
    test('hiç ders bitmediyse ve kart yoksa bulut boş', () {
      expect(KelimeBulutu.uret(const OgrenciDurumu(), [_kurs]), isEmpty);
      expect(KelimeBulutu.ogrenilenSayisi(const OgrenciDurumu(), [_kurs]), 0);
    });

    test('bitmiş dersin kelimeleri; tekrarsız (cat iki derste, bir kez)', () {
      const d = OgrenciDurumu(tamamlanan: {_d1: 1, _d2: 1});
      final b = KelimeBulutu.uret(d, [_kurs]);
      expect(b.map((k) => k.metin).toSet(), {'cat', 'dog', 'bird'});
      expect(KelimeBulutu.ogrenilenSayisi(d, [_kurs]), 3);
      expect(b.every((k) => k.kume == KelimeGucu.yeni), isTrue);
      expect(b.firstWhere((k) => k.metin == 'dog').anlam, 'köpek');
    });

    test('bitmemiş derste yalnız kartı olan kelime sayılır', () {
      final d = OgrenciDurumu(
        kartlar: {
          _kartId(_d2, 'bird'): const Kart(kutu: 1, sonraki: '2026-10-22'),
        },
      );
      final b = KelimeBulutu.uret(d, [_kurs]);
      expect(b.map((k) => k.metin), ['bird']);
    });

    test('küme eşikleri ve güçten sıralama', () {
      final kc = _kartId(_d1, 'cat');
      final kd = _kartId(_d1, 'dog');
      final kb = _kartId(_d2, 'bird');
      final d = OgrenciDurumu(
        tamamlanan: const {_d1: 1, _d2: 1},
        kartlar: {
          kc: const Kart(kutu: 3, sonraki: '2026-11-01', yariOmurGun: 30),
          kd: const Kart(kutu: 1, sonraki: '2026-10-22', yariOmurGun: 1),
          kb: const Kart(kutu: 2, sonraki: '2026-10-25', yariOmurGun: 4),
        },
      );
      final b = KelimeBulutu.uret(d, [_kurs]);
      expect(b.map((k) => k.metin), ['cat', 'bird', 'dog']);
      expect(b.map((k) => k.kume), [
        KelimeGucu.guclu,
        KelimeGucu.orta,
        KelimeGucu.zayif,
      ]);
      expect(b[0].guc, greaterThan(b[1].guc));
      expect(b[1].guc, greaterThan(b[2].guc));
    });

    test('güç 0..1, boyut 14..32 ve monoton', () {
      expect(KelimeBulutu.gucHesapla(Kart.enAzYariOmur), 0);
      expect(KelimeBulutu.gucHesapla(Kart.enCokYariOmur), closeTo(1, 1e-9));
      expect(KelimeBulutu.gucHesapla(9999), closeTo(1, 1e-9));
      expect(KelimeBulutu.gucHesapla(-5), 0);
      expect(KelimeBulutu.boyut(0), KelimeBulutu.enKucuk);
      expect(KelimeBulutu.boyut(1), KelimeBulutu.enBuyuk);
      expect(KelimeBulutu.boyut(5), KelimeBulutu.enBuyuk);
      expect(KelimeBulutu.boyut(0.5), greaterThan(KelimeBulutu.boyut(0.2)));
    });

    test('kod kursu sayılmaz; durum değişmez', () {
      const d = OgrenciDurumu(tamamlanan: {'python-kb.u1.d1': 1});
      expect(KelimeBulutu.uret(d, [_kod]), isEmpty);
      final once = d.toJson().toString();
      KelimeBulutu.uret(d, [_kod, _kurs]);
      expect(d.toJson().toString(), once);
    });
  });

  group('Arayüz', () {
    const biten = OgrenciDurumu(alan: 'dil', tamamlanan: {_d1: 1, _d2: 1});

    testWidgets('profilde kelime sayısı görünür ve buluta gider', (
      tester,
    ) async {
      await uygulamayiAc(tester, BellekDepo(biten), kurslar: [_kurs]);
      await dokun(tester, find.byIcon(Icons.person_outline));
      final sayi = find.byKey(const ValueKey('profil-kelime-sayisi'));
      await tester.ensureVisible(sayi);
      expect(tester.widget<Text>(sayi).data, '3 kelime öğrendin');
      await dokun(tester, find.byKey(const ValueKey('profil-kelime-bulutu')));
      expect(find.byKey(const ValueKey('kelime-bulutu')), findsOneWidget);
      expect(find.byKey(const ValueKey('kelime-bulutu-sayi')), findsOneWidget);
      expect(find.text('cat'), findsWidgets);
    });

    testWidgets('kodda profil satırı yok; boş bulutta mesaj', (tester) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [_kurs],
      );
      kap.read(yonlendiriciProvider).push('/kelime-bulutu');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('kelime-bulutu-bos')), findsOneWidget);
    });
  });
}
