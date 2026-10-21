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
  });

  /// Ör. 'hikaye-a1-kolay'.
  final String id;

  /// 'ingilizce-1' .. 'ingilizce-4'.
  final String kursId;
  final HikayeSeviyesi seviye;
  final String baslik;
  final List<String> paragraflar;

  /// 5-8 anahtar kelime; her biri metinde geçer.
  final List<AnahtarKelime> anahtarKelimeler;

  /// 3-4 anlama sorusu (çoktan seçmeli).
  final List<Secim> sorular;

  /// Metindeki kelime sayısı (boşlukla ayrılmış parçalar).
  int get kelimeSayisi => paragraflar
      .expand((p) => p.split(RegExp(r'\s+')))
      .where((k) => k.isNotEmpty)
      .length;
}
