// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Kelime ağacı: konuya (ünite) göre dallar, büyüme aşamaları, kod kursunun
/// dışta kalması, profil satırı ve ağaç ekranı.
library;

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/kelime_agaci.dart';
import 'package:adim_adim/motor/kelime_bulutu.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

const _d1 = 'ingilizce-ka.u1.d1';
const _d2 = 'ingilizce-ka.u2.d1';

Ders _ders(String id, List<(String, String)> ciftler) => Ders(
  id: id,
  ad: id,
  alistirmalar: [
    for (final c in ciftler)
      Eslestir(soru: 'Eşleştir', ciftler: [(sol: c.$1, sag: c.$2)]),
  ],
);

final Kurs _kurs = Kurs(
  id: 'ingilizce-ka',
  ad: 'Ağaç Kursu',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'ingilizce-ka.u1',
      ad: 'Hayvanlar',
      dersler: [
        _ders(_d1, [('cat', 'kedi'), ('dog', 'köpek')]),
      ],
    ),
    Unite(
      id: 'ingilizce-ka.u2',
      ad: 'Renkler',
      dersler: [
        _ders(_d2, [('red', 'kırmızı'), ('blue', 'mavi')]),
      ],
    ),
  ],
);

final Kurs _kod = Kurs(
  id: 'python-ka',
  ad: 'Kod',
  aciklama: '',
  alan: KursAlani.kod,
  uniteler: [
    Unite(
      id: 'python-ka.u1',
      ad: 'U',
      dersler: [
        _ders('python-ka.u1.d1', [('print', 'yazdır')]),
      ],
    ),
  ],
);

void main() {
  group('Motor', () {
    test('ders bitmeden tüm dallar boş: tohum, 0/toplam', () {
      final dallar = KelimeAgaci.uret(const OgrenciDurumu(), [_kurs]);
      expect(dallar.map((d) => d.uniteAdi), ['Hayvanlar', 'Renkler']);
      for (final d in dallar) {
        expect(d.asama, DalAsamasi.tohum);
        expect(d.toplam, 2);
        expect(d.ogrenilen, isEmpty);
      }
    });

    test('bitmiş ders dalı meyveli ağaç yapar, diğer dal tohum kalır', () {
      const d = OgrenciDurumu(tamamlanan: {_d1: 1});
      final dallar = KelimeAgaci.uret(d, [_kurs]);
      final hayvan = dallar.firstWhere((x) => x.uniteAdi == 'Hayvanlar');
      expect(hayvan.asama, DalAsamasi.meyveli);
      expect(hayvan.ogrenilen.map((k) => k.metin).toSet(), {'cat', 'dog'});
      expect(
        dallar.firstWhere((x) => x.uniteAdi == 'Renkler').asama,
        DalAsamasi.tohum,
      );
    });

    test('aşama eşikleri', () {
      AgacDali dal(int ogr, int toplam) => AgacDali(
        uniteId: 'u',
        kursAdi: 'k',
        uniteAdi: 'u',
        toplam: toplam,
        ogrenilen: List.generate(
          ogr,
          (i) => BulutKelimesi(
            metin: 'k$i',
            anlam: 'a',
            guc: 0,
            kume: KelimeGucu.yeni,
          ),
        ),
      );
      expect(dal(0, 10).asama, DalAsamasi.tohum);
      expect(dal(2, 10).asama, DalAsamasi.filiz);
      expect(dal(5, 10).asama, DalAsamasi.fidan);
      expect(dal(8, 10).asama, DalAsamasi.agac);
      expect(dal(10, 10).asama, DalAsamasi.meyveli);
    });

    test('kod kursu ağaçta yok', () {
      expect(KelimeAgaci.uret(const OgrenciDurumu(), [_kod]), isEmpty);
    });
  });

  group('Ekran', () {
    testWidgets('profilde satır var, ağaç ekranı dalları gösterir', (
      tester,
    ) async {
      await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil', tamamlanan: {_d1: 1})),
        kurslar: [_kurs],
      );
      await dokun(tester, find.byIcon(Icons.person_outline));
      final satir = find.byKey(const ValueKey('profil-kelime-agaci'));
      await tester.ensureVisible(satir);
      await dokun(tester, satir);
      expect(find.byKey(const ValueKey('kelime-agaci')), findsOneWidget);
      expect(find.text('Hayvanlar'), findsOneWidget);
      expect(find.textContaining('Meyveli ağaç: 2/2 kelime'), findsOneWidget);
      expect(find.textContaining('Tohum: 0/2 kelime'), findsOneWidget);
    });

    testWidgets('kurs yokken boş mesaj', (tester) async {
      final kap = await uygulamayiAc(
        tester,
        BellekDepo(const OgrenciDurumu(alan: 'dil')),
        kurslar: [_kod],
      );
      kap.read(yonlendiriciProvider).push('/kelime-agaci');
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('kelime-agaci-bos')), findsOneWidget);
    });
  });
}
