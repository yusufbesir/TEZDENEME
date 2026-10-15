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

final bildirimProvider = Provider<BildirimServisi>(
  (ref) => const GercekBildirim(),
);

/// Son kayıt hatasının mesajı (null: sorun yok). Arayüz bunu dinleyip uyarır.
class KayitHatasi extends Notifier<String?> {
  @override
  String? build() => null;
  void ayarla(String? mesaj) => state = mesaj;
}

final kayitHatasiProvider = NotifierProvider<KayitHatasi, String?>(
  KayitHatasi.new,
);

final kurslarProvider = Provider<List<Kurs>>((ref) => tumKurslar);

/// Bugünün günü 'YYYY-MM-DD'. Testte sabitlenebilir.
final bugunProvider = Provider<String>((ref) {
  final simdi = DateTime.now();
  // Gece yarısı geçince kendini yeniler; uygulama açık kalsa da gün değişir.
  final yarin = DateTime(simdi.year, simdi.month, simdi.day + 1);
  final sayac = Timer(
    yarin.difference(simdi) + const Duration(seconds: 1),
    ref.invalidateSelf,
  );
  ref.onDispose(sayac.cancel);
  return Motor.bugun(simdi);
});

/// Ana sayfada seçili kurs kimliği (null: ilk kurs).
class SecilenKurs extends Notifier<String?> {
  @override
  String? build() => null;
  void sec(String id) => state = id;
}

final secilenKursProvider = NotifierProvider<SecilenKurs, String?>(
  SecilenKurs.new,
);

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
      // Açılışta yalnızca yeniden zamanla; izin penceresi açma (izin ayarlarda istenir).
      unawaited(
        ref
            .read(bildirimProvider)
            .gunlukHatirlatma(saat, izinIste: false)
            .catchError((_) => false),
      );
    }
    return d;
  }

  OgrenciDurumu get _simdiki => state.value ?? const OgrenciDurumu();

  Future<OgrenciDurumu> _uygula(
    OgrenciDurumu Function(OgrenciDurumu) donustur,
  ) async {
    final yeni = donustur(_simdiki);
    state = AsyncData(yeni);
    try {
      await ref.read(depoProvider).kaydet(yeni);
      if (ref.read(kayitHatasiProvider) != null) {
        ref.read(kayitHatasiProvider.notifier).ayarla(null);
      }
    } catch (e) {
      debugPrint('Durum kaydedilemedi: $e');
      ref.read(kayitHatasiProvider.notifier).ayarla('$e');
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
  /// `hatirlatmaSil`: hatırlatmayı kapat. Hatırlatma açılırken bildirim izni
  /// verilmezse hatırlatma geri kapatılır ve false döner.
  Future<bool> ayarGuncelle({
    String? ad,
    bool? koyuTema,
    bool koyuTemaSil = false,
    bool? sesAcik,
    int? gunlukHedef,
    String? hatirlatmaSaati,
    bool hatirlatmaSil = false,
  }) async {
    await _uygula(
      (d) => d.copyWith(
        ad: ad,
        koyuTema: koyuTema,
        koyuTemaSil: koyuTemaSil,
        sesAcik: sesAcik,
        gunlukHedef: gunlukHedef,
        hatirlatmaSaati: hatirlatmaSaati,
        hatirlatmaSil: hatirlatmaSil,
      ),
    );
    final bildirim = ref.read(bildirimProvider);
    try {
      if (hatirlatmaSil) {
        await bildirim.iptal();
      } else if (hatirlatmaSaati != null) {
        final izinli = await bildirim.gunlukHatirlatma(hatirlatmaSaati);
        if (!izinli) {
          await _uygula((d) => d.copyWith(hatirlatmaSil: true));
          return false;
        }
      }
    } catch (e) {
      debugPrint('Bildirim ayarı uygulanamadı: $e');
    }
    return true;
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

final durumProvider = AsyncNotifierProvider<DurumNotifier, OgrenciDurumu>(
  DurumNotifier.new,
);
