/// Dilbilgisi ipucu modeli: bir ünitenin/dersin sabit, kısa ipucu metni.
/// Saf Dart; Flutter'a bağımlı değildir. Değiştirilemez (immutable).
/// Veri: lib/icerik/dilbilgisi_ipuclari.dart; mantık: lib/motor/dilbilgisi_ipucu.dart.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dalga3]
library;

/// Tek dilbilgisi ipucu. [dersId], ipucunun bağlandığı dersin kimliğidir
/// (ör. 'ingilizce-1.u1.d2'); ünite ve kurs kimliği bundan türetilir.
class DilbilgisiIpucu {
  const DilbilgisiIpucu({
    required this.dersId,
    required this.baslik,
    required this.metin,
    required this.ornek,
    required this.ornekCeviri,
  });

  /// Bağlı ders ('kurs.uN.dN').
  final String dersId;

  /// Kısa başlık, ör. "Be fiili".
  final String baslik;

  /// İpucu metni (1-2 cümle).
  final String metin;

  /// Örnek cümle (hedef dilde) ve Türkçe karşılığı.
  final String ornek;
  final String ornekCeviri;

  /// Kurs kimliği: 'ingilizce-1.u1.d2' -> 'ingilizce-1'.
  String get kursId => dersId.split('.').first;

  /// Ünite kimliği: 'ingilizce-1.u1.d2' -> 'ingilizce-1.u1'.
  String get uniteId {
    final p = dersId.split('.');
    return p.length >= 2 ? '${p[0]}.${p[1]}' : dersId;
  }

  /// Boş metin yok ve ders kimliği 'kurs.uN.dN' biçiminde.
  bool get gecerliMi =>
      RegExp(r'^[a-z0-9\-]+\.u\d+\.d\d+$').hasMatch(dersId) &&
      baslik.trim().isNotEmpty &&
      metin.trim().isNotEmpty &&
      ornek.trim().isNotEmpty &&
      ornekCeviri.trim().isNotEmpty;
}
