/// Kod çalıştırma sonucu ve çıktı karşılaştırması (ÖZELLİK 69). Saf Dart;
/// motorun kendisi `lib/motor/kod_calistirici.dart` (arayüz) ve
/// `lib/servis/js_motoru.dart` (gerçek QuickJS) içindedir.
library;

/// Bir kod çalıştırmasının sonucu. [kod] çalıştırılan kullanıcı kodudur
/// (gerekli öğeler bunda aranır).
class KodCalismaSonucu {
  const KodCalismaSonucu({
    required this.kod,
    this.cikti = '',
    this.hata,
    this.zamanAsimi = false,
    this.motorYok = false,
  });

  /// Bu cihazda çalıştırma motoru yok (ör. test ortamı ya da kütüphane
  /// yüklenemedi).
  const KodCalismaSonucu.motorsuz(this.kod)
    : cikti = '',
      hata = null,
      zamanAsimi = false,
      motorYok = true;

  final String kod;

  /// `console.log` çıktısı (satırlar `\n` ile).
  final String cikti;

  /// Çalışma ya da güvenlik denetimi hatası (Türkçe ya da motorun iletisi).
  final String? hata;

  /// Süre/adım sınırı aşıldı.
  final bool zamanAsimi;

  final bool motorYok;

  bool get basarili => hata == null && !zamanAsimi && !motorYok;
}

/// Çıktıyı karşılaştırma için normalleştirir: satır sonları `\n`, her
/// satırın sonundaki boşluklar ve en sondaki boş satırlar atılır.
String ciktiNormalle(String s) {
  final satirlar = s
      .replaceAll('\r\n', '\n')
      .replaceAll('\r', '\n')
      .split('\n')
      .map((l) => l.trimRight())
      .toList();
  while (satirlar.isNotEmpty && satirlar.last.isEmpty) {
    satirlar.removeLast();
  }
  return satirlar.join('\n');
}

/// İki çıktı aynı mı ([ciktiNormalle] sonrası; büyük/küçük harf duyarlı)?
/// Boş beklenen çıktı hiçbir zaman eşleşmez.
bool ciktiAyni(String gercek, String beklenen) {
  final b = ciktiNormalle(beklenen);
  return b.isNotEmpty && ciktiNormalle(gercek) == b;
}
