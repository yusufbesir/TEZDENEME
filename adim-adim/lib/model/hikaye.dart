// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Okuma hikâyesi modeli: yalnız dil kurslarında; kelime ön testi, okuma ve
/// anlama soruları için kısa, özgün İngilizce metin.
library;

import 'icerik.dart';

enum HikayeSeviyesi {
  kolay('Kolay'),
  orta('Orta'),
  zor('Zor');

  const HikayeSeviyesi(this.etiket);

  /// Arayüzde gösterilen Türkçe ad.
  final String etiket;
}

typedef AnahtarKelime = ({String kelime, String anlam});

class Hikaye {
  const Hikaye({
    required this.id,
    required this.kursId,
    required this.seviye,
    required this.baslik,
    required this.paragraflar,
    required this.anahtarKelimeler,
    required this.sorular,
    this.bosluklar,
  });

  /// Ör. 'hikaye-a1-kolay'.
  final String id;

  /// 'ingilizce-1' .. 'ingilizce-5' (C1 için henüz hikâye yok).
  final String kursId;
  final HikayeSeviyesi seviye;
  final String baslik;
  final List<String> paragraflar;

  /// 5-8 anahtar kelime; her biri metinde geçer.
  final List<AnahtarKelime> anahtarKelimeler;

  /// 3-4 anlama sorusu (çoktan seçmeli).
  final List<Secim> sorular;

  /// İsteğe bağlı: "boşluklu okuma" için gizlenecek anahtar kelime indeksleri.
  /// Boşsa [boslukIndeksleri] metinden otomatik seçer.
  final List<int>? bosluklar;

  /// Boşluklu okuma için gizlenecek anahtar kelime indeksleri (metinde geçiş
  /// sırasına göre). Metinde bulunmayan kelime seçilmez; en fazla [en] tane,
  /// metne eşit aralıkla yayılır. Saf ve deterministiktir.
  List<int> boslukIndeksleri({int en = 4}) {
    final metin = paragraflar.join('\n');
    final bulunan = <({int indeks, int konum})>[];
    for (var i = 0; i < anahtarKelimeler.length; i++) {
      final m = RegExp(
        '\\b${RegExp.escape(anahtarKelimeler[i].kelime)}\\b',
        caseSensitive: false,
      ).firstMatch(metin);
      if (m != null) bulunan.add((indeks: i, konum: m.start));
    }
    bulunan.sort((a, b) => a.konum.compareTo(b.konum));
    final ayarli = bosluklar;
    if (ayarli != null) {
      final izinli = bulunan.map((b) => b.indeks).toSet();
      return [
        for (final b in bulunan)
          if (ayarli.contains(b.indeks) && izinli.contains(b.indeks)) b.indeks,
      ];
    }
    if (bulunan.length <= en) return [for (final b in bulunan) b.indeks];
    return [
      for (var k = 0; k < en; k++)
        bulunan[(k * (bulunan.length - 1) / (en - 1)).round()].indeks,
    ];
  }

  /// Metindeki kelime sayısı (boşlukla ayrılmış parçalar).
  int get kelimeSayisi => paragraflar
      .expand((p) => p.split(RegExp(r'\s+')))
      .where((k) => k.isNotEmpty)
      .length;
}
