/// SADE madde 6 birim testleri: akıllı hatırlatıcı (Hatirlatici.onerilenSaat,
/// bugunGonderilsinMi, calismaKaydet), OgrenciDurumu'nun yeni alanlarının
/// JSON gidiş-dönüşü ve eski JSON varsayılanları, sağlayıcıda açılış/ön plan
/// denetimi.
///
/// Sahibi Yusuf (yusufbesir); yazan: [Claude#sade6]. Testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:convert';

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/hatirlatici.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

const _bugun = '2026-10-15';
final _aksam = DateTime(2026, 10, 15, 20, 30); // 20:30
final _sabah = DateTime(2026, 10, 15, 9, 0); // 09:00

OgrenciDurumu _durum({
  List<int> saatler = const [],
  int bugunXp = 0,
  String? sonGun,
  bool acik = true,
}) => OgrenciDurumu(
  alan: 'dil',
  calismaSaatleri: saatler,
  gunlukXp: bugunXp > 0 ? {_bugun: bugunXp} : const {},
  sonHatirlatmaGunu: sonGun,
  akilliHatirlaticiAcik: acik,
);

void main() {
  group('Hatirlatici.onerilenSaat', () {
    test('kayıt yoksa varsayılan 19', () {
      expect(Hatirlatici.onerilenSaat(const OgrenciDurumu()), 19);
      expect(Hatirlatici.varsayilanSaat, 19);
    });

    test('tek sayıda kayıt → ortanca', () {
      expect(Hatirlatici.onerilenSaat(_durum(saatler: [21, 8, 18])), 18);
      expect(Hatirlatici.onerilenSaat(_durum(saatler: [7])), 7);
    });

    test('çift sayıda kayıt → ortadaki ikinin alt ortası', () {
      expect(Hatirlatici.onerilenSaat(_durum(saatler: [20, 10, 22, 12])), 16);
      expect(Hatirlatici.onerilenSaat(_durum(saatler: [21, 20])), 20);
    });

    test('geçersiz saatler yok sayılır; hepsi geçersizse varsayılan', () {
      expect(Hatirlatici.onerilenSaat(_durum(saatler: [-1, 24, 15])), 15);
      expect(Hatirlatici.onerilenSaat(_durum(saatler: [-1, 99])), 19);
    });
  });

  group('Hatirlatici.bugunGonderilsinMi', () {
    test('bugün XP var → false', () {
      expect(
        Hatirlatici.bugunGonderilsinMi(_durum(bugunXp: 10), _aksam),
        isFalse,
      );
    });

    test('aynı gün ikinci kez → false', () {
      expect(
        Hatirlatici.bugunGonderilsinMi(_durum(sonGun: _bugun), _aksam),
        isFalse,
      );
    });

    test('saat erken → false', () {
      expect(Hatirlatici.bugunGonderilsinMi(_durum(), _sabah), isFalse);
      // Önerilen saat 18 iken 17:59 erken, 18:00 tam zamanı.
      final d = _durum(saatler: [18]);
      expect(
        Hatirlatici.bugunGonderilsinMi(d, DateTime(2026, 10, 15, 17, 59)),
        isFalse,
      );
      expect(
        Hatirlatici.bugunGonderilsinMi(d, DateTime(2026, 10, 15, 18, 0)),
        isTrue,
      );
    });

    test('erken gün (dün gönderilmiş, bugün XP yok, saat geldi) → true', () {
      expect(
        Hatirlatici.bugunGonderilsinMi(_durum(sonGun: '2026-10-14'), _aksam),
        isTrue,
      );
      expect(Hatirlatici.bugunGonderilsinMi(_durum(), _aksam), isTrue);
      // Dünkü XP bugünü etkilemez.
      final dunXp = const OgrenciDurumu(gunlukXp: {'2026-10-14': 50});
      expect(Hatirlatici.bugunGonderilsinMi(dunXp, _aksam), isTrue);
    });

    test('gerekli: ayar kapalıyken false, açıkken karar aynı', () {
      expect(Hatirlatici.gerekli(_durum(acik: false), _aksam), isFalse);
      expect(Hatirlatici.gerekli(_durum(), _aksam), isTrue);
      expect(Hatirlatici.gerekli(_durum(bugunXp: 5), _aksam), isFalse);
    });
  });

  group('Hatirlatici.calismaKaydet', () {
    test('saat eklenir, en çok 14 kayıt tutulur (en eskisi düşer)', () {
      var d = const OgrenciDurumu();
      for (var i = 0; i < 20; i++) {
        d = Hatirlatici.calismaKaydet(d, i % 24);
      }
      expect(d.calismaSaatleri.length, OgrenciDurumu.calismaSaatiEnCok);
      expect(d.calismaSaatleri.first, 6);
      expect(d.calismaSaatleri.last, 19);
    });

    test('geçersiz saat yok sayılır', () {
      final d = Hatirlatici.calismaKaydet(const OgrenciDurumu(), 24);
      expect(d.calismaSaatleri, isEmpty);
      expect(
        Hatirlatici.calismaKaydet(const OgrenciDurumu(), -1).calismaSaatleri,
        isEmpty,
      );
    });
  });

  group('OgrenciDurumu JSON', () {
    test('yeni alanlar gidiş-dönüşte korunur', () {
      final d = _durum(saatler: [9, 21, 18], sonGun: _bugun, acik: true);
      final geri = OgrenciDurumu.fromJson(jsonDecode(jsonEncode(d.toJson())));
      expect(geri.calismaSaatleri, [9, 21, 18]);
      expect(geri.sonHatirlatmaGunu, _bugun);
      expect(geri.akilliHatirlaticiAcik, isTrue);
    });

    test('eski JSON: alan yoksa kapalı, hiç gönderilmemiş, saat yok', () {
      final geri = OgrenciDurumu.fromJson({'xp': 10, 'alan': 'dil'});
      expect(geri.akilliHatirlaticiAcik, isFalse);
      expect(geri.sonHatirlatmaGunu, isNull);
      expect(geri.calismaSaatleri, isEmpty);
    });

    test('bozuk değerler varsayılana çekilir, fazla kayıt kırpılır', () {
      final geri = OgrenciDurumu.fromJson({
        'akilliHatirlaticiAcik': 'evet',
        'sonHatirlatmaGunu': '2026-02-30',
        'calismaSaatleri': ['x', 25, -3, ...List<int>.generate(16, (i) => i)],
      });
      expect(geri.akilliHatirlaticiAcik, isFalse);
      expect(geri.sonHatirlatmaGunu, isNull);
      expect(geri.calismaSaatleri, List<int>.generate(14, (i) => i + 2));
    });
  });

  group('DurumNotifier', () {
    test('XP kazanılınca çalışma saati kaydedilir', () async {
      final depo = BellekDepo(_durum(bugunXp: 0, acik: false));
      final kap = ProviderContainer(
        overrides: [
          depoProvider.overrideWithValue(depo),
          bildirimProvider.overrideWithValue(SahteBildirim()),
          saatProvider.overrideWithValue(() => _aksam),
        ],
      );
      addTearDown(kap.dispose);
      await kap.read(durumProvider.future);
      final notifier = kap.read(durumProvider.notifier);
      await notifier.mikroBitir(5, 5);
      final d = kap.read(durumProvider).value!;
      expect(d.xp, greaterThan(0));
      expect(d.calismaSaatleri, [_aksam.hour]);
    });

    test(
      'ön plan denetimi: gerekliyse bir kez gönderir ve günü işaretler',
      () async {
        final bildirim = SahteBildirim();
        // Ayar açık, bugün XP yok, saat kaydı 0 → önerilen saat 00:00, hep geç.
        final depo = BellekDepo(_durum(saatler: [0], acik: true));
        final kap = ProviderContainer(
          overrides: [
            depoProvider.overrideWithValue(depo),
            bildirimProvider.overrideWithValue(bildirim),
            saatProvider.overrideWithValue(() => _aksam),
          ],
        );
        addTearDown(kap.dispose);
        // Açılış denetimi enjekte edilen akşam saatini kullanır.
        await kap.read(durumProvider.future);
        await Future<void>.delayed(Duration.zero);
        int adet() => bildirim.cagrilar.where((c) => c == 'akilli').length;
        expect(adet(), 1);
        expect(
          kap.read(durumProvider).value!.sonHatirlatmaGunu,
          Motor.bugun(_aksam),
        );
        // Aynı gün ön plana dönüş: ikinci gönderim yok.
        await kap.read(durumProvider.notifier).akilliHatirlaticiKontrol();
        await Future<void>.delayed(Duration.zero);
        expect(adet(), 1);
      },
    );

    test('ayar kapalıyken açılışta gönderilmez', () async {
      final bildirim = SahteBildirim();
      final depo = BellekDepo(_durum(saatler: [0], acik: false));
      final kap = ProviderContainer(
        overrides: [
          depoProvider.overrideWithValue(depo),
          bildirimProvider.overrideWithValue(bildirim),
          saatProvider.overrideWithValue(() => _aksam),
        ],
      );
      addTearDown(kap.dispose);
      await kap.read(durumProvider.future);
      await Future<void>.delayed(Duration.zero);
      expect(bildirim.cagrilar, isNot(contains('akilli')));
    });
  });

  group('sessiz saat', () {
    test('22:00-08:00 arası gönderilmez, aralık dışında gönderilir', () {
      final d = _durum(saatler: [23, 23, 23], acik: true);
      expect(Hatirlatici.sessizMi(22), isTrue);
      expect(Hatirlatici.sessizMi(3), isTrue);
      expect(Hatirlatici.sessizMi(8), isFalse);
      expect(Hatirlatici.sessizMi(21), isFalse);
      // Alışılan saat sessiz aralıkta olsa bile gece 23:30'da gönderilmez.
      expect(Hatirlatici.gerekli(d, DateTime(2026, 10, 15, 23, 30)), isFalse);
      final e = _durum(saatler: [0, 0, 0], acik: true);
      expect(Hatirlatici.gerekli(e, DateTime(2026, 10, 15, 3, 0)), isFalse);
      expect(Hatirlatici.gerekli(e, _sabah), isTrue);
    });
  });
}
