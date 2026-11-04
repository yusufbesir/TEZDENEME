// Sahibi Yusuf (yusufbesir). Yazan: [Claude#tts-hiz]. Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Dinleme konuşma hızı (SADE 8): `sesHizi` JSON gidiş-dönüşü, `Ses.ttsHizi`
/// dönüşümü ve Dinle-yaz ekranındaki hız seçici (TTS gerçek çağrılmaz).
library;

import 'package:adim_adim/bilesenler/ses_hiz_secici.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/servis/ses.dart';
import 'package:adim_adim/uygulama.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

const _ders = 'sh-1.u1.d1';

Secim _s(String kelime, String anlam) => Secim(
  soru: '"$kelime" ne demektir?',
  secenekler: [anlam, 'başka'],
  dogru: 0,
);

final Kurs _kurs = Kurs(
  id: 'sh-1',
  ad: 'Ses Hızı Kursu',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'sh-1.u1',
      ad: 'U',
      dersler: [
        Ders(
          id: _ders,
          ad: 'D',
          alistirmalar: [
            _s('cat', 'kedi'),
            _s('dog', 'köpek'),
            _s('house', 'ev'),
            _s('apple', 'elma'),
            _s('book', 'kitap'),
            _s('water', 'su'),
          ],
        ),
      ],
    ),
  ],
);

void main() {
  group('model: sesHizi JSON', () {
    test('gidiş-dönüş değeri korur', () {
      const d = OgrenciDurumu(alan: 'dil', sesHizi: 0.85);
      final j = d.toJson();
      expect(j['sesHizi'], 0.85);
      expect(OgrenciDurumu.fromJson(j).sesHizi, 0.85);
    });

    test('eski kayıtta alan yoksa ya da sayı değilse 1,0', () {
      expect(OgrenciDurumu.fromJson({'alan': 'dil'}).sesHizi, 1.0);
      expect(OgrenciDurumu.fromJson({'sesHizi': 'hızlı'}).sesHizi, 1.0);
      expect(OgrenciDurumu.fromJson({'sesHizi': double.nan}).sesHizi, 1.0);
      expect(const OgrenciDurumu().sesHizi, 1.0);
    });

    test('aralık dışı değer 0,7..1,2 aralığına kırpılır', () {
      expect(OgrenciDurumu.fromJson({'sesHizi': 3}).sesHizi, 1.2);
      expect(OgrenciDurumu.fromJson({'sesHizi': 0.1}).sesHizi, 0.7);
      expect(OgrenciDurumu.fromJson({'sesHizi': -2.0}).sesHizi, 0.7);
      expect(OgrenciDurumu.sesHiziKirp(1.2), 1.2);
      expect(OgrenciDurumu.sesHiziKirp(0.7), 0.7);
    });
  });

  group('Ses.ttsHizi (saf işlev)', () {
    test('çarpan 1,0 temel hızı korur', () {
      expect(Ses.ttsHizi(0.45, 1.0), 0.45);
      expect(Ses.ttsHizi(Ses.yavasHiz, 1.0), Ses.yavasHiz);
    });

    test('çarpan temel hızı oransal ölçekler', () {
      expect(Ses.ttsHizi(0.45, 1.2), closeTo(0.54, 1e-9));
      expect(Ses.ttsHizi(0.45, 0.7), closeTo(0.315, 1e-9));
      expect(Ses.ttsHizi(0.5, 0.85), closeTo(0.425, 1e-9));
    });

    test('sonuç 0..1 aralığına kırpılır; geçersiz çarpan 1,0 sayılır', () {
      expect(Ses.ttsHizi(0.9, 1.2), 1.0);
      expect(Ses.ttsHizi(0.45, double.nan), 0.45);
      expect(Ses.ttsHizi(0.45, 0), 0.45);
      expect(Ses.ttsHizi(0.45, double.infinity), 0.45);
    });

    test('okuHizla çarpanı yalnız o çağrı için uygular', () async {
      final ses = SahteSes();
      ses.hizCarpani = 1.0;
      await ses.okuHizla('cat', carpan: 1.2);
      expect(ses.carpanlar, [1.2]);
      expect(ses.hizCarpani, 1.0);
    });
  });

  group('etiket', () {
    test('Türkçe ondalık virgülü, sondaki sıfırlar atılır', () {
      expect(sesHiziEtiketi(1.0), '1x');
      expect(sesHiziEtiketi(0.85), '0,85x');
      expect(sesHiziEtiketi(0.7), '0,7x');
      expect(sesHiziEtiketi(1.2), '1,2x');
    });
  });

  testWidgets('Dinle-yaz: hız seçici görünür, değiştirir ve kalıcıdır', (
    tester,
  ) async {
    final ses = SahteSes();
    final depo = BellekDepo(
      const OgrenciDurumu(alan: 'dil', tamamlanan: {_ders: 1}),
    );
    final kap = await uygulamayiAc(
      tester,
      depo,
      kurslar: [_kurs],
      ses: ses,
      boyut: const Size(500, 1000),
    );
    kap.read(yonlendiriciProvider).push('/pratik/dinle-yaz?tohum=1');
    await tester.pump();
    await tester.pump(const Duration(seconds: 1));

    // Dört çip görünür; varsayılan 1x seçili, ilk okuma çarpanı 1,0.
    for (final e in ['0,7x', '0,85x', '1x', '1,2x']) {
      expect(find.byKey(ValueKey('ses-hiz-$e')), findsOneWidget);
    }
    expect(ses.carpanlar, [1.0]);

    await tester.tap(find.byKey(const ValueKey('ses-hiz-1,2x')));
    await tester.pumpAndSettle();
    expect(kap.read(durumProvider).value!.sesHizi, 1.2);
    expect((await depo.yukle()).sesHizi, 1.2);

    // Dinle düğmesi yeni çarpanla okur; seçim çağrı sonrası sızmaz.
    await tester.tap(find.byKey(const ValueKey('dy-dinle')));
    await tester.pumpAndSettle();
    expect(ses.carpanlar.last, 1.2);
    expect(ses.hizCarpani, 1.0);
  });
}
