/// "Arkadaşla oyna" soyut taşıma: iki uç arasında satır tabanlı metin mesajı.
/// LAN (dart:io) ve Android Nearby aynı arayüzü uygular. Mesaj doğrulaması protokol.dart'ta yapılır.
/// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım özellikler#cihaz] Claude
/// Yalnız onu yazan yapay zekâ değiştirir; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

abstract class DuelloAktarimi {
  /// Karşıdan gelen ham mesajlar (güvenilmeyen girdi). Bağlantı kapanınca akış biter.
  Stream<String> get mesajlar;

  /// Tek mesaj gönderir; satır sonu içeremez.
  Future<void> gonder(String mesaj);

  Future<void> kapat();
}
