import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
// timezone, flutter_local_notifications'ın geçişli bağımlılığıdır; zamanlama
// API'si TZDateTime ister. Yeni paket eklenmediği için doğrudan içe aktarılır.
import 'package:timezone/timezone.dart' as tz;

/// Bildirim servisinin arayüzü (testte sahtesi sağlanır).
abstract class BildirimServisi {
  /// İzin verilmez ya da kurulamazsa false döner.
  /// [izinIste] false ise izin penceresi açılmaz; izin yoksa false döner.
  Future<bool> gunlukHatirlatma(String saat, {bool izinIste = true});
  Future<void> iptal();
}

/// Gerçek uygulama servisi; statik `Bildirim` işlevlerine yönlenir.
class GercekBildirim implements BildirimServisi {
  const GercekBildirim();
  @override
  Future<bool> gunlukHatirlatma(String saat, {bool izinIste = true}) =>
      Bildirim.gunlukHatirlatma(saat, izinIste: izinIste);
  @override
  Future<void> iptal() => Bildirim.iptal();
}

/// flutter_local_notifications sarmalayıcısı. Başlatma/zamanlama hatası
/// uygulamayı durdurmaz.
abstract final class Bildirim {
  static final FlutterLocalNotificationsPlugin _eklenti =
      FlutterLocalNotificationsPlugin();
  static bool _hazir = false;
  static const int _kimlik = 1;

  static Future<bool> _baslat() async {
    if (_hazir) return true;
    try {
      const ayar = InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
        macOS: DarwinInitializationSettings(),
        linux: LinuxInitializationSettings(defaultActionName: 'Aç'),
      );
      await _eklenti.initialize(settings: ayar);
      _hazir = true;
    } catch (e) {
      debugPrint('Bildirim başlatılamadı: $e');
    }
    return _hazir;
  }

  /// 'HH:MM' biçimindeki saatte her gün tekrarlanan hatırlatma kurar.
  /// Saat, cihazın yerel saatinden UTC'ye çevrilerek zamanlanır.
  ///
  /// SINIRLAMA: Yerel saat tz paketi kullanılmadan (tz.local ayarlanmadan)
  /// UTC'ye çevrildiği için günlük tekrar UTC saatinde sabit kalır; yaz/kış
  /// saati geçişinde hatırlatma yerel saate göre 1 saat kayar. Kalıcı çözüm
  /// cihaz saat dilimini veren bir paket gerektirir (eklenmedi).
  ///
  /// Önce bildirim izni istenir (Android 13+, iOS, macOS); verilmezse false.
  static Future<bool> gunlukHatirlatma(
    String saat, {
    bool izinIste = true,
  }) async {
    try {
      final parcalar = saat.split(':');
      final s = int.parse(parcalar[0]);
      final d = int.parse(parcalar[1]);
      if (s < 0 || s > 23 || d < 0 || d > 59) return false;
      if (!await _baslat()) return false;
      if (izinIste && !await _izinIste()) return false;
      final simdi = DateTime.now();
      var hedef = DateTime(simdi.year, simdi.month, simdi.day, s, d);
      if (!hedef.isAfter(simdi)) {
        hedef = DateTime(simdi.year, simdi.month, simdi.day + 1, s, d);
      }
      final u = hedef.toUtc();
      final zaman = tz.TZDateTime.utc(u.year, u.month, u.day, u.hour, u.minute);
      await _eklenti.zonedSchedule(
        id: _kimlik,
        title: 'Adım Adım',
        body: 'Bugünkü adımını atma zamanı. Kısa bir ders seni bekliyor.',
        scheduledDate: zaman,
        notificationDetails: const NotificationDetails(
          android: AndroidNotificationDetails(
            'gunluk_hatirlatma',
            'Günlük hatırlatma',
            channelDescription: 'Her gün çalışma hatırlatması',
          ),
          iOS: DarwinNotificationDetails(),
          macOS: DarwinNotificationDetails(),
        ),
        androidScheduleMode: AndroidScheduleMode.inexactAllowWhileIdle,
        matchDateTimeComponents: DateTimeComponents.time,
      );
      return true;
    } catch (e) {
      debugPrint('Hatırlatma kurulamadı: $e');
      return false;
    }
  }

  static Future<bool> _izinIste() async {
    final android = _eklenti
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();
    if (android != null) {
      return await android.requestNotificationsPermission() ?? false;
    }
    final ios = _eklenti
        .resolvePlatformSpecificImplementation<
          IOSFlutterLocalNotificationsPlugin
        >();
    if (ios != null) {
      return await ios.requestPermissions(
            alert: true,
            badge: true,
            sound: true,
          ) ??
          false;
    }
    final mac = _eklenti
        .resolvePlatformSpecificImplementation<
          MacOSFlutterLocalNotificationsPlugin
        >();
    if (mac != null) {
      return await mac.requestPermissions(
            alert: true,
            badge: true,
            sound: true,
          ) ??
          false;
    }
    return true;
  }

  static Future<void> iptal() async {
    try {
      if (!await _baslat()) return;
      await _eklenti.cancel(id: _kimlik);
    } catch (e) {
      debugPrint('Hatırlatma iptal edilemedi: $e');
    }
  }
}
