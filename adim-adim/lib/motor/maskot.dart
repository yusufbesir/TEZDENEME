/// Çalışma arkadaşı maskotu (ÖZELLİK 83): çalıştıkça gelişen basit bir
/// arkadaş. Aşama toplam XP'den türetilir (yumurta -> civciv -> ... -> kartal),
/// ruh hâli son çalışma gününden. Saklanmaz, satın alma ve özelleştirme yoktur;
/// çizim yerleşik emoji ile yapılır. Yalnız okur, durumu değiştirmez.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/durum.dart';
import 'motor.dart';

class MaskotAsamasi {
  const MaskotAsamasi(this.sira, this.emoji, this.ad, this.esikXp);
  final int sira;
  final String emoji;
  final String ad;

  /// Bu aşamaya geçmek için gereken toplam XP.
  final int esikXp;
}

class MaskotDurumu {
  const MaskotDurumu({
    required this.asama,
    required this.sonraki,
    required this.ilerleme,
    required this.ruhHali,
  });
  final MaskotAsamasi asama;

  /// Sonraki aşama; null: son aşama.
  final MaskotAsamasi? sonraki;

  /// Sonraki aşamaya doğru ilerleme 0..1 (son aşamada 1).
  final double ilerleme;

  /// Kısa Türkçe ruh hâli cümlesi.
  final String ruhHali;
}

abstract final class Maskot {
  static const List<MaskotAsamasi> asamalar = [
    MaskotAsamasi(0, '🥚', 'Yumurta', 0),
    MaskotAsamasi(1, '🐣', 'Civciv', 50),
    MaskotAsamasi(2, '🐥', 'Yavru kuş', 250),
    MaskotAsamasi(3, '🐦', 'Kuş', 750),
    MaskotAsamasi(4, '🦉', 'Baykuş', 2000),
    MaskotAsamasi(5, '🦅', 'Kartal', 5000),
  ];

  static MaskotAsamasi asamaBul(int xp) {
    var a = asamalar.first;
    for (final x in asamalar) {
      if (xp >= x.esikXp) a = x;
    }
    return a;
  }

  static MaskotDurumu durum(OgrenciDurumu d, String bugun) {
    final a = asamaBul(d.xp);
    final sonraki = a.sira + 1 < asamalar.length ? asamalar[a.sira + 1] : null;
    final ilerleme = sonraki == null
        ? 1.0
        : ((d.xp - a.esikXp) / (sonraki.esikXp - a.esikXp)).clamp(0.0, 1.0);
    final son = d.sonGun;
    final fark = son == null ? null : Motor.gunFarki(son, bugun);
    final String ruh;
    if (fark == null) {
      ruh = 'Seninle ilk dersi bekliyor.';
    } else if (fark <= 0) {
      ruh = 'Bugün çalıştığın için çok mutlu!';
    } else if (fark <= 2) {
      ruh = 'Seni bekliyor; küçük bir ders yeter.';
    } else {
      ruh = 'Seni özledi. Birlikte başlayalım mı?';
    }
    return MaskotDurumu(
      asama: a,
      sonraki: sonraki,
      ilerleme: ilerleme,
      ruhHali: ruh,
    );
  }
}
