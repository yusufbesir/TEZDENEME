/// Eller serbest sesli mod oturum mantığı (ÖZELLİK 64): bir öğeyi cihaz TTS ile
/// okur, kullanıcının tekrarını konuşma tanımayla dinler ve tahmini telaffuz
/// puanıyla ([telaffuzTahmini]) değerlendirir. Ekrandan bağımsızdır: ses ve
/// tanıma servisleri enjekte edilir (testte sahte). Konuşma tanıma hazır
/// değilse ya da izin verilmediyse "yalnız dinleme" kipine zarifçe düşer
/// (mevcut 8.7 kalıbı). Ceza yok; kart aralıkları değişmez.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:async';

import '../motor/eller_serbest.dart';
import '../motor/telaffuz.dart';
import 'konusma.dart';
import 'konusma_dinle.dart';
import 'ses.dart';

/// Oturumun o anki adımı (arayüz ve ekran okuyucu durum satırı için).
enum ElleriSerbestAsama { okuyor, dinliyor, degerlendirdi, yalnizDinledi }

/// Bir öğenin sonucu: [tahmin] null ise yalnız dinlendi (konuşma tanıma yok
/// ya da bir şey duyulmadı); [deneme] kaçıncı denemede bitti.
typedef ElleriSerbestSonucu = ({
  ElleriSerbestOgesi oge,
  TelaffuzTahmini? tahmin,
  String soylenen,
  int deneme,
  bool gecti,
});

class ElleriSerbestOturumu {
  ElleriSerbestOturumu({
    required this.ses,
    required this.konusma,
    this.tekrarEt = true,
    this.dinlemeSuresi = const Duration(seconds: 8),
    this.sessizlik = const Duration(milliseconds: 1800),
    this.arayaBekleme = const Duration(milliseconds: 600),
  });

  final Ses ses;
  final KonusmaTanima konusma;

  /// false: yalnız dinleme kipi (tanıma kullanılmaz).
  bool tekrarEt;

  /// Hiç ses gelmezse en çok bekleme ve ilk metinden sonra susulduğunda
  /// bitiş süresi.
  final Duration dinlemeSuresi;
  final Duration sessizlik;
  final Duration arayaBekleme;

  /// Geçme puanı (tahmini telaffuz puanı, 0-100) ve öğe başına en çok deneme.
  static const int gecmePuani = 70;
  static const int enCokDeneme = 2;

  bool _durdu = false;
  Completer<void>? _bitis;

  bool get durdu => _durdu;

  /// Dinlemeyi/okumayı bırakır; çalışan [ogeyiIsle] en kısa adımda döner.
  Future<void> durdur() async {
    _durdu = true;
    final b = _bitis;
    if (b != null && !b.isCompleted) b.complete();
    try {
      await konusma.durdur();
    } catch (_) {}
  }

  /// Duraklatmadan sonra devam için bayrağı sıfırlar.
  void sifirla() => _durdu = false;

  /// Tanıma kullanılabilir mi (motor + model + izin)? Hazır değilse ya da izin
  /// yoksa [tekrarEt] false yapılır ve false döner.
  Future<bool> hazirla() async {
    var hazir = false;
    try {
      hazir = await konusma.hazirMi() && await konusma.izinIste();
    } catch (_) {
      hazir = false;
    }
    tekrarEt = tekrarEt && hazir;
    return hazir;
  }

  Future<String> _dinle(String dil) {
    final bitis = _bitis = Completer<void>();
    return konusmayiDinle(
      konusma,
      dil: dil,
      dinlemeSuresi: dinlemeSuresi,
      sessizlik: sessizlik,
      iptal: bitis,
    );
  }

  /// Bir öğeyi işler: okur; [tekrarEt] ise dinler, değerlendirir, gerekirse bir
  /// kez daha okuyup yeniden dener. [onAsama] adım değişimlerini bildirir.
  Future<ElleriSerbestSonucu?> ogeyiIsle(
    ElleriSerbestOgesi oge, {
    void Function(ElleriSerbestAsama asama, {TelaffuzTahmini? tahmin})? onAsama,
  }) async {
    var deneme = 0;
    TelaffuzTahmini? tahmin;
    var soylenen = '';
    while (true) {
      if (_durdu) return null;
      onAsama?.call(ElleriSerbestAsama.okuyor);
      await ses.okuBekle(oge.metin, dil: oge.dil);
      if (_durdu) return null;
      if (!tekrarEt) {
        onAsama?.call(ElleriSerbestAsama.yalnizDinledi);
        await Future<void>.delayed(arayaBekleme);
        return (oge: oge, tahmin: null, soylenen: '', deneme: 1, gecti: true);
      }
      deneme++;
      onAsama?.call(ElleriSerbestAsama.dinliyor);
      soylenen = await _dinle(oge.dil);
      if (_durdu) return null;
      tahmin = telaffuzKelimeleri(soylenen).isEmpty
          ? null
          : telaffuzTahmini(oge.metin, soylenen, dil: oge.dil);
      onAsama?.call(ElleriSerbestAsama.degerlendirdi, tahmin: tahmin);
      final gecti = tahmin != null && tahmin.puan >= gecmePuani;
      if (gecti || deneme >= enCokDeneme) {
        await Future<void>.delayed(arayaBekleme);
        return (
          oge: oge,
          tahmin: tahmin,
          soylenen: soylenen,
          deneme: deneme,
          gecti: gecti,
        );
      }
      await Future<void>.delayed(arayaBekleme);
    }
  }
}
