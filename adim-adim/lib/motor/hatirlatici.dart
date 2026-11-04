/// Akıllı hatırlatıcı (SADE madde 6): günde en çok bir bildirim. Saat, son
/// çalışmaların (en çok [OgrenciDurumu.calismaSaatiEnCok] kayıt) saat
/// ortancasıdır; kayıt yoksa [varsayilanSaat]. Bugün XP kazanılmışsa, bugün
/// zaten gönderilmişse ya da saat henüz gelmemişse gönderilmez. Saf işlevler;
/// servis çağrısı ve kayıt sağlayıcıda yapılır.
///
/// Sahibi Yusuf (yusufbesir); yazan: [Claude#sade6]. Testler geçmeden değişmez.
library;

import '../model/durum.dart';
import 'motor.dart';

abstract final class Hatirlatici {
  /// Çalışma saati kaydı yoksa kullanılan saat (19:00).
  static const int varsayilanSaat = 19;

  /// Sessiz saat aralığı: [sessizBaslangic] (dahil) ile [sessizBitis] (hariç)
  /// arası gönderilmez (22:00-08:00; gece yarısını aşar).
  static const int sessizBaslangic = 22;
  static const int sessizBitis = 8;

  /// [saat] sessiz aralıkta mı?
  static bool sessizMi(int saat) =>
      saat >= sessizBaslangic || saat < sessizBitis;

  /// Bildirim gövdesi.
  static const String metin =
      'Bugün henüz adım atmadın. Kısa bir ders seni bekliyor.';

  /// Önerilen hatırlatma saati (0..23): kayıtlı çalışma saatlerinin
  /// ortancası; çift sayıda kayıtta ortadaki iki değerin alt ortası (tam
  /// sayıya kırpılır). Kayıt yoksa [varsayilanSaat]; asla null dönmez.
  static int onerilenSaat(OgrenciDurumu d) {
    final saatler = d.calismaSaatleri.where((s) => s >= 0 && s <= 23).toList()
      ..sort();
    if (saatler.isEmpty) return varsayilanSaat;
    final n = saatler.length;
    if (n.isOdd) return saatler[n ~/ 2];
    return (saatler[n ~/ 2 - 1] + saatler[n ~/ 2]) ~/ 2;
  }

  /// Bugün gönderilsin mi? Ayar bakılmaz (bkz. [gerekli]). Bugün XP
  /// kazanılmamış, bugün gönderilmemiş ve [simdi] saati önerilen saate
  /// ulaşmışsa true.
  static bool bugunGonderilsinMi(OgrenciDurumu d, DateTime simdi) {
    final bugun = Motor.bugun(simdi);
    if ((d.gunlukXp[bugun] ?? 0) > 0) return false;
    if (d.sonHatirlatmaGunu == bugun) return false;
    if (sessizMi(simdi.hour)) return false;
    return simdi.hour >= onerilenSaat(d);
  }

  /// Ayar açıkken [bugunGonderilsinMi]; kapalıyken false.
  static bool gerekli(OgrenciDurumu d, DateTime simdi) =>
      d.akilliHatirlaticiAcik && bugunGonderilsinMi(d, simdi);

  /// Çalışma saatini (0..23) kaydeder; en yeni
  /// [OgrenciDurumu.calismaSaatiEnCok] kayıt tutulur. Geçersiz saat yok sayılır.
  static OgrenciDurumu calismaKaydet(OgrenciDurumu d, int saat) {
    if (saat < 0 || saat > 23) return d;
    final liste = [...d.calismaSaatleri, saat];
    final fazla = liste.length - OgrenciDurumu.calismaSaatiEnCok;
    return d.copyWith(
      calismaSaatleri: List.unmodifiable(
        fazla > 0 ? liste.sublist(fazla) : liste,
      ),
    );
  }
}
