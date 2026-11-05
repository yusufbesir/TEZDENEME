/// Telaffuz "en zayıf ses" özeti (kart 2): oturumlardaki hatalı hecelerin birikimli sayımı.
/// Saf Dart; depolama ve arayüz dışarıdadır (toJson/fromJson ile kalıcılaştırılır).
/// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım özellikler#cihaz] Claude
/// Yalnız onu yazan yapay zekâ değiştirir; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

/// Bellekte tutulan en çok farklı hece (kayıt şişmesini sınırlar).
const int zayifHeceEnFazlaTur = 200;

/// Tek bir hecenin kabul edilen en çok uzunluğu (karakter).
const int zayifHeceEnFazlaUzunluk = 12;

/// En sık hatalı hece sayacı. Değiştirilemez: her işlem yeni nesne döner.
class ZayifHeceKaydi {
  const ZayifHeceKaydi([this.sayilar = const {}]);

  final Map<String, int> sayilar;

  /// Dışarıdan gelen (kalıcı depo) veriyi güvenle okur; bozuk girdi boş kayıt verir.
  factory ZayifHeceKaydi.fromJson(Object? ham) {
    if (ham is! Map) return const ZayifHeceKaydi();
    final cikti = <String, int>{};
    for (final e in ham.entries) {
      final k = e.key;
      final v = e.value;
      if (k is! String || v is! int || v <= 0) continue;
      final hece = _temizle(k);
      if (hece == null) continue;
      cikti[hece] = (cikti[hece] ?? 0) + v;
      if (cikti.length >= zayifHeceEnFazlaTur) break;
    }
    return ZayifHeceKaydi(Map.unmodifiable(cikti));
  }

  Map<String, int> toJson() => Map.of(sayilar);

  /// Bir oturumun hatalı hecelerini ekler.
  ZayifHeceKaydi ekle(Iterable<String> hataliHeceler) {
    final yeni = Map<String, int>.of(sayilar);
    for (final h in hataliHeceler) {
      final t = _temizle(h);
      if (t == null) continue;
      if (!yeni.containsKey(t) && yeni.length >= zayifHeceEnFazlaTur) {
        // Tür sınırı doluysa en az görülen heceyi çıkar.
        final enAz = yeni.entries.reduce((a, b) => a.value <= b.value ? a : b);
        yeni.remove(enAz.key);
      }
      yeni[t] = (yeni[t] ?? 0) + 1;
    }
    return ZayifHeceKaydi(Map.unmodifiable(yeni));
  }

  /// En sık hatalı [adet] hece; eşitlikte alfabetik.
  List<({String hece, int sayi})> enSik({int adet = 5}) {
    final liste =
        [for (final e in sayilar.entries) (hece: e.key, sayi: e.value)]
          ..sort((a, b) {
            final c = b.sayi.compareTo(a.sayi);
            return c != 0 ? c : a.hece.compareTo(b.hece);
          });
    return liste.take(adet < 0 ? 0 : adet).toList();
  }
}

String? _temizle(String s) {
  final t = s.trim().toLowerCase();
  if (t.isEmpty || t.runes.length > zayifHeceEnFazlaUzunluk) return null;
  return t;
}
