/// Yarışma Riverpod sağlayıcıları: depo ve kalıcı istatistik kaydı.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'depo.dart';
import 'motor.dart';

/// Yarışma deposu. Uygulama başlarken (main) ya da testte override edilir.
final yarismaDepoProvider = Provider<YarismaDepo>(
  (ref) => throw UnimplementedError('yarismaDepoProvider override edilmeli'),
);

class YarismaKayitNotifier extends AsyncNotifier<YarismaKayit> {
  @override
  Future<YarismaKayit> build() async {
    try {
      return await ref.read(yarismaDepoProvider).yukle();
    } catch (_) {
      return const YarismaKayit();
    }
  }

  /// Biten oyunu istatistiklere işler ve kaydeder. Kayıt hatası durumu bozmaz.
  Future<YarismaKayit> oyunuIsle(
    String alan,
    String kursId,
    YarismaOyunu oyun,
  ) async {
    final mevcut = state.value ?? const YarismaKayit();
    final yeni = mevcut.oyunuIsle(alan, kursId, oyun);
    state = AsyncData(yeni);
    try {
      await ref.read(yarismaDepoProvider).kaydet(yeni);
    } catch (_) {
      // Bellekteki durum geçerli kalır; bir sonraki kayıt yeniden dener.
    }
    return yeni;
  }
}

final yarismaKayitProvider =
    AsyncNotifierProvider<YarismaKayitNotifier, YarismaKayit>(
      YarismaKayitNotifier.new,
    );
