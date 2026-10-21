/// Efsanevi zor tekrar (ÖZELLİK 43, Duolingo D2): biten bir üniteyi İPUCUSUZ
/// ve SÜRELİ tekrar eder; geçince ünite "altın" olur.
///
/// KURAL (cezasız): Başarısızlıkta hiçbir şey değişmez; kart aralıkları
/// (SRS), hata defteri, XP, seri ve öğrenme günlüğü ETKİLENMEZ. Başarıda
/// yalnız [OgrenciDurumu.altinUniteler] kümesine ünite kimliği eklenir
/// (yine SRS'e dokunmaz). Sorular ara sınavla aynı seçicidir
/// ([Motor.araSinavSec]: ünitenin tüm derslerinden, konuşma hariç).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/durum.dart';
import '../model/icerik.dart';
import 'motor.dart';

abstract final class Efsanevi {
  /// Soru başına süre (saniye); toplam süre soru sayısıyla çarpılır.
  static const int soruBasinaSaniye = 15;

  /// Geçme oranı: en az %90 doğru (10 soruda en çok 1 yanlış).
  static const double gecmeOrani = 0.9;

  /// Oturumun toplam süresi (saniye).
  static int sureSn(int soruSayisi) => soruSayisi * soruBasinaSaniye;

  /// Efsanevi tekrar açık mı: ünite bitmiş (ya da atlanmış) ve sorulabilecek
  /// en az bir alıştırma var.
  static bool acik(OgrenciDurumu d, Kurs kurs, int uniteIndeks) =>
      Motor.araSinavAcik(d, kurs, uniteIndeks);

  /// Ünite altın mı?
  static bool altinMi(OgrenciDurumu d, Unite u) =>
      d.altinUniteler.contains(u.id);

  /// Oturum soruları (ipucusuz, süreli çözülür). Aynı [tohum] aynı sorular.
  static List<({int unite, String kartId, Alistirma alistirma})> sec(
    Kurs kurs,
    int uniteIndeks, {
    int tohum = 0,
  }) => Motor.araSinavSec(kurs, uniteIndeks, tohum: tohum);

  /// Sonuç geçti mi? Tam sayı karşılaştırması (kayan nokta hatası yok).
  static bool gecti(int dogru, int toplam) =>
      toplam > 0 && dogru * 10 >= toplam * 9;

  /// Başarıda ünite altın olur; başka hiçbir alan değişmez. Zaten altınsa
  /// aynı durum döner.
  static OgrenciDurumu altinYap(OgrenciDurumu d, String uniteId) {
    if (uniteId.isEmpty || uniteId.contains('#')) return d;
    if (d.altinUniteler.contains(uniteId)) return d;
    return d.copyWith(
      altinUniteler: Set.unmodifiable({...d.altinUniteler, uniteId}),
    );
  }
}
