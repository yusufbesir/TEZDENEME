// Oturum katmanı testleri: bellek içi eşlenik taşıma ve sahte saat ile iki uç.
// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım özellikler#cihaz] Claude
// Yalnız onu yazan yapay zekâ değiştirir; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
import 'dart:async';

import 'package:adim_adim/yarisma/arkadasla/aktarim.dart';
import 'package:adim_adim/yarisma/arkadasla/duello_motoru.dart';
import 'package:adim_adim/yarisma/arkadasla/oturum.dart';
import 'package:adim_adim/yarisma/arkadasla/protokol.dart';
import 'package:adim_adim/yarisma/model.dart';
import 'package:flutter_test/flutter_test.dart';

class BellekAktarimi implements DuelloAktarimi {
  BellekAktarimi();
  BellekAktarimi? es;
  final _gelen = StreamController<String>();
  final List<String> gidenler = [];

  static (BellekAktarimi, BellekAktarimi) cift() {
    final a = BellekAktarimi();
    final b = BellekAktarimi();
    a.es = b;
    b.es = a;
    return (a, b);
  }

  /// Karşıdan ham (hileli olabilir) mesaj enjekte eder.
  void enjekte(String m) => _gelen.add(m);

  @override
  Stream<String> get mesajlar => _gelen.stream;

  @override
  Future<void> gonder(String mesaj) async {
    gidenler.add(mesaj);
    es?._gelen.add(mesaj);
  }

  @override
  Future<void> kapat() async {
    if (!_gelen.isClosed) unawaited(_gelen.close());
  }
}

YarismaSorusu soru(String id, {int dogru = 0}) => YarismaSorusu(
  id: id,
  alan: 'dil',
  seviyeKursId: 'ingilizce-1',
  kategori: YarismaKategori.genelKultur,
  soru: 'Soru $id?',
  secenekler: const ['a', 'b', 'c', 'd'],
  dogru: dogru,
  aciklama: 'Açıklama',
);

List<YarismaSorusu> havuz([int n = 12]) => [
  for (var i = 0; i < n; i++) soru('q${i.toString().padLeft(2, '0')}'),
];

Future<void> bos() => Future<void>.delayed(Duration.zero);

void main() {
  test(
    'tam düello: iki uç aynı soruları görür, sıra ve puan tutarlı',
    () async {
      final (a, b) = BellekAktarimi.cift();
      var t = 0;
      final ev = DuelloOturumu(
        aktarim: a,
        havuz: havuz(),
        takmaAd: 'Ev',
        evSahibi: true,
        tohum: 2,
        saat: () => t,
      );
      final konuk = DuelloOturumu(
        aktarim: b,
        havuz: havuz(),
        takmaAd: 'Konuk',
        evSahibi: false,
        saat: () => t,
      );
      await ev.baslat();
      await konuk.baslat();
      await bos();
      expect(ev.durum, OturumDurumu.oynaniyor);
      expect(konuk.durum, OturumDurumu.oynaniyor);
      expect(konuk.rakipAdi, 'Ev');
      expect(
        [for (final s in ev.duello!.sorular) s.id],
        [for (final s in konuk.duello!.sorular) s.id],
      );
      // tohum çift: ilk sıra ev sahibinde; konukta ters.
      expect(ev.duello!.sira, Taraf.ben);
      expect(konuk.duello!.sira, Taraf.rakip);

      while (!ev.duello!.bitti) {
        final evSirada = ev.duello!.sira == Taraf.ben;
        final oyuncu = evSirada ? ev : konuk;
        t += 1000;
        expect(await oyuncu.cevapla(0), isNull);
        await bos();
      }
      await bos();
      expect(ev.durum, OturumDurumu.bitti);
      expect(konuk.durum, OturumDurumu.bitti);
      expect(ev.duello!.benimPuan, konuk.duello!.rakipPuan);
      expect(ev.duello!.rakipPuan, konuk.duello!.benimPuan);
    },
  );

  test('rakibin bildirdiği süre yok sayılır, yerel saat kullanılır', () async {
    final (a, b) = BellekAktarimi.cift();
    var t = 0;
    final ev = DuelloOturumu(
      aktarim: a,
      havuz: havuz(),
      takmaAd: 'Ev',
      evSahibi: true,
      tohum: 3,
      saat: () => t,
    );
    final konuk = DuelloOturumu(
      aktarim: b,
      havuz: havuz(),
      takmaAd: 'K',
      evSahibi: false,
      saat: () => t,
    );
    await ev.baslat();
    await konuk.baslat();
    await bos();
    // tohum tek: ilk sıra konukta. Konuk 14 sn sonra "gecenMs:1" yalan söylüyor.
    expect(ev.duello!.sira, Taraf.rakip);
    t += 14000;
    final id = ev.duello!.mevcutSoru!.id;
    b.es!.enjekte(Cevap(soruId: id, secenek: 0, gecenMs: 1).kodla());
    await bos();
    final kayit = ev.duello!.cevaplar.single;
    expect(kayit.gecenMs, 14000);
    expect(kayit.puan, dogruPuan); // hız bonusu yok
  });

  test('yerelde olmayan soru kimliği düelloyu reddeder', () async {
    final (a, b) = BellekAktarimi.cift();
    final konuk = DuelloOturumu(
      aktarim: b,
      havuz: havuz(),
      takmaAd: 'K',
      evSahibi: false,
    );
    await konuk.baslat();
    b.enjekte(
      Merhaba(
        surum: protokolSurumu,
        soruBankasiOzeti: soruBankasiOzetiHesapla(
          (havuz()..sort((x, y) => x.id.compareTo(y.id))).map(
            (s) => '${s.id}|${s.soru}|${s.secenekler.join('/')}|${s.dogru}',
          ),
        ),
        takmaAd: 'Ev',
      ).kodla(),
    );
    await bos();
    b.enjekte(
      const DuelloBasla(soruIdleri: ['yok'], ilkSiraSende: true).kodla(),
    );
    await bos();
    expect(konuk.durum, OturumDurumu.hata);
    expect(konuk.hata, 'bilinmeyen_soru');
    expect(b.gidenler, isNotEmpty);
  });

  test(
    'farklı soru bankası içeriği (aynı kimlik) uyuşmazlık sayılır',
    () async {
      final (a, b) = BellekAktarimi.cift();
      final ev = DuelloOturumu(
        aktarim: a,
        havuz: havuz(),
        takmaAd: 'Ev',
        evSahibi: true,
      );
      final yabanci = [for (final s in havuz()) soru(s.id, dogru: 1)];
      final konuk = DuelloOturumu(
        aktarim: b,
        havuz: yabanci,
        takmaAd: 'K',
        evSahibi: false,
      );
      await ev.baslat();
      await konuk.baslat();
      await bos();
      expect(ev.durum, OturumDurumu.hata);
      expect(ev.hata, 'soru_bankasi_uyusmuyor');
      expect(konuk.durum, OturumDurumu.hata);
    },
  );

  test('bozuk mesaj ve sırası olmayan cevap oturumu sonlandırır', () async {
    final (a, b) = BellekAktarimi.cift();
    final ev = DuelloOturumu(
      aktarim: a,
      havuz: havuz(),
      takmaAd: 'Ev',
      evSahibi: true,
    );
    await ev.baslat();
    a.enjekte('{bozuk');
    await bos();
    expect(ev.durum, OturumDurumu.hata);
    expect(ev.hata, startsWith('mesaj_'));
    expect(b.mesajlar, isNotNull);
  });

  test('düello başlamadan gelen cevap reddedilir', () async {
    final (a, _) = BellekAktarimi.cift();
    final ev = DuelloOturumu(
      aktarim: a,
      havuz: havuz(),
      takmaAd: 'Ev',
      evSahibi: true,
    );
    await ev.baslat();
    a.enjekte(const Cevap(soruId: 'q00', secenek: 0, gecenMs: 1).kodla());
    await bos();
    expect(ev.hata, 'beklenmeyen_cevap');
  });
}
