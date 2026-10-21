/// Konuşma tanımayı bir kez dinleyip son tanınan metni döndüren yardımcı
/// (eller serbest mod ve senaryolu konuşma ortak kullanır). Hatalar yutulur;
/// hiçbir şey duyulmazsa boş metin döner. Dinleme, [dinlemeSuresi] içinde ses
/// gelmezse ya da ilk anlamlı metinden sonra [sessizlik] kadar susulursa biter;
/// [iptal] tamamlanırsa hemen biter.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:async';

import '../motor/telaffuz.dart';
import 'konusma.dart';

Future<String> konusmayiDinle(
  KonusmaTanima konusma, {
  required String dil,
  Duration dinlemeSuresi = const Duration(seconds: 8),
  Duration sessizlik = const Duration(milliseconds: 1800),
  Completer<void>? iptal,
}) async {
  var son = '';
  final bitis = iptal ?? Completer<void>();
  Timer? sayac;
  StreamSubscription<String>? abone;
  void bitir() {
    if (!bitis.isCompleted) bitis.complete();
  }

  try {
    abone = konusma
        .dinle(dil: dil)
        .listen(
          (m) {
            son = m;
            if (telaffuzKelimeleri(m).isNotEmpty) {
              // İlk anlamlı metinden sonra susulunca biter.
              sayac?.cancel();
              sayac = Timer(sessizlik, bitir);
            }
          },
          onError: (_) => bitir(),
          onDone: bitir,
        );
    sayac = Timer(dinlemeSuresi, bitir);
    await bitis.future;
  } catch (_) {
    // Tanıma başlatılamadı: duyulan bir şey yok sayılır.
  }
  sayac?.cancel();
  // Abonelik iptali beklenmez: biten akışta iptal geç dönebilir.
  unawaited(abone?.cancel().catchError((Object _) {}) ?? Future<void>.value());
  try {
    await konusma.durdur();
  } catch (_) {}
  return son;
}
