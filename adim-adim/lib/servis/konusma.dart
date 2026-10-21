/// Konuşma tanıma arayüzü (ÖZELLİK 8.7: telaffuz / konuşma pratiği).
/// Motor bağımsızdır: gerçek tanıma `konusma_sherpa.dart`ta (yalnız Windows,
/// çevrimdışı), testte `SahteKonusma`, hazır motor yoksa `KonusmaYok` kullanılır.
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

/// Konuşmayı metne çeviren servis. Hatalar yutulur; hazır değilse arayüz
/// "Bu alıştırmayı atla" yolunu sunar.
abstract class KonusmaTanima {
  /// Tanıma bu cihazda kullanılabilir mi (motor + model + platform)?
  Future<bool> hazirMi();

  /// Mikrofon iznini ister; verildiyse true.
  Future<bool> izinIste();

  /// Dinlemeyi başlatır; tanınan metni (kısmi ve son sonuçlar) akıtır.
  /// [durdur] çağrılınca ya da konuşma bitince akış kapanır.
  Stream<String> dinle({required String dil});

  /// Dinlemeyi durdurur (kayıt açıksa kapatır).
  Future<void> durdur();
}

/// Testler için: sıradaki hazır yanıtı döndürür.
class SahteKonusma implements KonusmaTanima {
  SahteKonusma({
    this.hazir = true,
    this.izin = true,
    List<String> yanitlar = const [],
  }) : _yanitlar = List.of(yanitlar);

  bool hazir;
  bool izin;
  final List<String> _yanitlar;

  /// Her `dinle` çağrısının dili (sırayla).
  final dinlenenDiller = <String>[];
  int durdurmaSayisi = 0;

  /// Sonraki `dinle` çağrıları için yanıt ekler.
  void yanitEkle(String metin) => _yanitlar.add(metin);

  @override
  Future<bool> hazirMi() async => hazir;

  @override
  Future<bool> izinIste() async => izin;

  @override
  Stream<String> dinle({required String dil}) {
    dinlenenDiller.add(dil);
    if (_yanitlar.isEmpty) return const Stream<String>.empty();
    return Stream<String>.value(_yanitlar.removeAt(0));
  }

  @override
  Future<void> durdur() async => durdurmaSayisi++;
}

/// Motor yok: tanıma hazır değil. Arayüz "Konuşma tanıma bu cihazda hazır
/// değil" gösterir ve alıştırma atlanabilir.
class KonusmaYok implements KonusmaTanima {
  const KonusmaYok();

  @override
  Future<bool> hazirMi() async => false;

  @override
  Future<bool> izinIste() async => false;

  @override
  Stream<String> dinle({required String dil}) => const Stream<String>.empty();

  @override
  Future<void> durdur() async {}
}
