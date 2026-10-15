import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../depo/depo.dart';
import '../icerik/icerik.dart';
import '../model/durum.dart';
import '../model/icerik.dart';
import '../motor/motor.dart';
import '../servis/bildirim.dart';
import '../servis/ses.dart';

/// Kalıcı depo. Uygulama başlarken (main) ya da testte override edilir.
final depoProvider = Provider<Depo>(
  (ref) => throw UnimplementedError('depoProvider override edilmeli'),
);

final sesProvider = Provider<Ses>((ref) => Ses());

final bildirimProvider =
    Provider<BildirimServisi>((ref) => const GercekBildirim());

final kurslarProvider = Provider<List<Kurs>>((ref) => tumKurslar);

/// Bugünün günü 'YYYY-MM-DD'. Testte sabitlenebilir.
final bugunProvider = Provider<String>((ref) => Motor.bugun());

/// Ana sayfada seçili kurs kimliği (null: ilk kurs).
class SecilenKurs extends Notifier<String?> {
  @override
  String? build() => null;
  void sec(String id) => state = id;
}

final secilenKursProvider =
    NotifierProvider<SecilenKurs, String?>(SecilenKurs.new);

class DurumNotifier extends AsyncNotifier<OgrenciDurumu> {
  @override
  Future<OgrenciDurumu> build() async {
    OgrenciDurumu d;
    try {
      d = await ref.read(depoProvider).yukle();
    } catch (e) {
      debugPrint('Durum yüklenemedi: $e');
      d = const OgrenciDurumu();
    }
    final saat = d.hatirlatmaSaati;
    if (saat != null) {
      unawaited(ref.read(bildirimProvider).gunlukHatirlatma(saat));
    }
    return d;
  }

  OgrenciDurumu get _simdiki => state.value ?? const OgrenciDurumu();

  Future<OgrenciDurumu> _uygula(
      OgrenciDurumu Function(OgrenciDurumu) donustur) async {
    final yeni = donustur(_simdiki);
    state = AsyncData(yeni);
    try {
      await ref.read(depoProvider).kaydet(yeni);
    } catch (e) {
      debugPrint('Durum kaydedilemedi: $e');
    }
    return yeni;
  }

  Future<OgrenciDurumu> dersBitir(String dersId, int dogru, int toplam) {
    final bugun = ref.read(bugunProvider);
    return _uygula((d) => Motor.dersBitir(d, dersId, dogru, toplam, bugun));
  }

  Future<OgrenciDurumu> kartIsle(String kartId, bool dogruMu) {
    final bugun = ref.read(bugunProvider);
    return _uygula((d) => Motor.kartIsle(d, kartId, dogruMu, bugun));
  }

  /// Verilen ayarları günceller. `koyuTemaSil`: sistem temasına dön;
  /// `hatirlatmaSil`: hatırlatmayı kapat.
  Future<void> ayarGuncelle({
    String? ad,
    bool? koyuTema,
    bool koyuTemaSil = false,
    bool? sesAcik,
    int? gunlukHedef,
    String? hatirlatmaSaati,
    bool hatirlatmaSil = false,
  }) async {
    await _uygula((d) => d.copyWith(
          ad: ad,
          koyuTema: koyuTema,
          koyuTemaSil: koyuTemaSil,
          sesAcik: sesAcik,
          gunlukHedef: gunlukHedef,
          hatirlatmaSaati: hatirlatmaSaati,
          hatirlatmaSil: hatirlatmaSil,
        ));
    final bildirim = ref.read(bildirimProvider);
    try {
      if (hatirlatmaSil) {
        await bildirim.iptal();
      } else if (hatirlatmaSaati != null) {
        await bildirim.gunlukHatirlatma(hatirlatmaSaati);
      }
    } catch (e) {
      debugPrint('Bildirim ayarı uygulanamadı: $e');
    }
  }

  Future<void> sifirla() async {
    try {
      await ref.read(depoProvider).sifirla();
    } catch (e) {
      debugPrint('Sıfırlanamadı: $e');
    }
    try {
      await ref.read(bildirimProvider).iptal();
    } catch (_) {}
    state = const AsyncData(OgrenciDurumu());
  }
}

final durumProvider =
    AsyncNotifierProvider<DurumNotifier, OgrenciDurumu>(DurumNotifier.new);
