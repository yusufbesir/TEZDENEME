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

  /// Hemen gösterilen (zamanlanmamış) bildirim: bugün bekleyen tekrar sayısı.
  /// İzin yoksa ya da başlatılamadıysa false; hata fırlatmaz.
  Future<bool> tekrarBildirimi(int sayi);
  Future<void> iptal();
}

/// Gerçek uygulama servisi; statik `Bildirim` işlevlerine yönlenir.
class GercekBildirim implements BildirimServisi {
  const GercekBildirim();
  @override
  Future<bool> gunlukHatirlatma(String saat, {bool izinIste = true}) =>
      Bildirim.gunlukHatirlatma(saat, izinIste: izinIste);
  @override
  Future<bool> tekrarBildirimi(int sayi) => Bildirim.tekrarBildirimi(sayi);
  @override
  Future<void> iptal() => Bildirim.iptal();
}

/// flutter_local_notifications sarmalayıcısı. Başlatma/zamanlama hatası
/// uygulamayı durdurmaz.
abstract final class Bildirim {
  static final FlutterLocalNotificationsPlugin _eklenti =
      FlutterLocalNotificationsPlugin();
  static bool _hazir = false;

  /// Günlük hatırlatmanın kimliği (zamanlanmış).
  static const int _kimlik = 1;

  /// Açılıştaki "bekleyen tekrar" bildiriminin kimliği; hatırlatmadan ayrı
  /// tutulur ki onu ezmesin (aynı kimlik Windows/Android'de üzerine yazar).
  static const int _tekrarKimlik = 2;

  /// Windows toast etkinleştirme geri çağrısını tanımlayan GUID. Sabit
  /// olmalı: Windows, bildirimi uygulamayla bu GUID (ve appUserModelId) ile
  /// eşler; her açılışta değişseydi gösterilen bildirimler sahipsiz kalır ve
  /// tıklama uygulamaya dönmezdi. Uygulamaya özgüdür, bir kez üretildi.
  static const String _windowsGuid = '3f1c6b2e-8a4d-4c9b-9e7f-2d5a1b0c7e41';

  static Future<bool> _baslat() async {
    if (_hazir) return true;
    try {
      const ayar = InitializationSettings(
        android: AndroidInitializationSettings('@mipmap/ic_launcher'),
        iOS: DarwinInitializationSettings(),
        macOS: DarwinInitializationSettings(),
        linux: LinuxInitializationSettings(defaultActionName: 'Aç'),
        // Windows: flutter_local_notifications 20.x, WinRT toast. Verilmezse
        // initialize Windows'ta ArgumentError fırlatır ve hatırlatma kurulmaz.
        windows: WindowsInitializationSettings(
          appName: 'Adım Adım',
          appUserModelId: 'YusufBesir.AdimAdim',
          guid: _windowsGuid,
        ),
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
      // Gövde sabittir: zamanlanmış bildirimde o günkü tekrar sayısı
      // bilinemez; sayı, açılıştaki `tekrarBildirimi` ile verilir.
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

  /// Bugün bekleyen tekrar sayısını hemen gösterir (zamanlanmaz). İzin
  /// penceresi açmaz; izin verilmemişse ya da başlatılamadıysa false.
  /// Windows'ta `show` izin gerektirmez; Android 13+/iOS/macOS'ta izin daha
  /// önce verilmediyse sistem bildirimi sessizce düşürür.
  static Future<bool> tekrarBildirimi(int sayi) async {
    try {
      if (sayi <= 0) return false;
      if (!await _baslat()) return false;
      await _eklenti.show(
        id: _tekrarKimlik,
        title: 'Adım Adım',
        body: tekrarMetni(sayi),
        notificationDetails: const NotificationDetails(
          android: AndroidNotificationDetails(
            'bekleyen_tekrar',
            'Bekleyen tekrar',
            channelDescription: 'Açılışta bugün bekleyen tekrar sayısı',
          ),
          iOS: DarwinNotificationDetails(),
          macOS: DarwinNotificationDetails(),
          windows: WindowsNotificationDetails(),
        ),
      );
      return true;
    } catch (e) {
      debugPrint('Tekrar bildirimi gösterilemedi: $e');
      return false;
    }
  }

  /// Bildirim gövdesi: 'Bugün N tekrar bekliyor'.
  static String tekrarMetni(int sayi) => 'Bugün $sayi tekrar bekliyor';

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
