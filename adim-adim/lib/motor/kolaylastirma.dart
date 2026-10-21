/// Kolaylaştırma önerisi (ÖZELLİK 50): üst üste iki başarısız ders denemesinde
/// daha kolay bir ders ya da tekrar önerilir. Ceza yoktur; öneri yalnız ders
/// özetinde gösterilir ve yok sayılabilir.
///
/// Başarısız deneme: ders puanı [Motor.basariEsigi] (%60) altında biten
/// bitiriş. Sayaç `OgrenciDurumu.ardisikBasarisiz`, `Motor.dersBitir` içinde
/// tutulur; başarılı bitiş sıfırlar.
///
/// Öneri sırası: (1) aynı kursta daha önce bitirilmiş, ortalama zorluğu
/// başarısız dersten düşük olan en kolay ders (eşitlikte ustalığı düşük olan);
/// (2) bekleyen tekrar kartı varsa Tekrar; (3) hata defteri doluysa zayıf
/// noktalar dersi; (4) aynı dersi yeniden dene.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/durum.dart';
import '../model/icerik.dart';
import 'ders_meta.dart';
import 'motor.dart';

/// Öneri türleri: 'ders' (kolay ders), 'tekrar' (Tekrar sekmesi), 'zayif'
/// (zayıf noktalar dersi), 'yeniden' (aynı dersi yeniden dene).
class KolaylastirmaOnerisi {
  const KolaylastirmaOnerisi({
    required this.tur,
    required this.mesaj,
    required this.etiket,
    this.dersId,
  });

  final String tur;
  final String mesaj;

  /// Eylem düğmesinin etiketi.
  final String etiket;

  /// 'ders' ve 'yeniden' türlerinde açılacak ders.
  final String? dersId;
}

abstract final class Kolaylastirma {
  /// Öneri için gereken ardışık başarısız deneme sayısı.
  static const int ardisikEsik = 2;

  /// Öneri gerekiyorsa üretir, gerekmiyorsa null.
  static KolaylastirmaOnerisi? oner(
    OgrenciDurumu d,
    List<Kurs> kurslar,
    String bugun,
  ) {
    final basarisiz = d.sonBasarisizDers;
    if (d.ardisikBasarisiz < ardisikEsik || basarisiz == null) return null;
    Kurs? kurs;
    Ders? ders;
    for (final k in kurslar) {
      final x = k.dersBul(basarisiz);
      if (x != null) {
        kurs = k;
        ders = x;
        break;
      }
    }
    if (kurs != null && ders != null) {
      final hedefZorluk = DersMeta.dersZorlugu(ders);
      Ders? en;
      for (final c in kurs.tumDersler) {
        if (c.id == basarisiz) break; // yalnız daha önceki dersler
        if (!Motor.dersBitmis(d, c.id)) continue;
        final z = DersMeta.dersZorlugu(c);
        if (c.alistirmalar.isEmpty || z >= hedefZorluk) continue;
        if (en == null) {
          en = c;
          continue;
        }
        final ez = DersMeta.dersZorlugu(en);
        if (z < ez ||
            (z == ez &&
                DersMeta.dersUstalik(d, c.id) <
                    DersMeta.dersUstalik(d, en.id))) {
          en = c;
        }
      }
      if (en != null) {
        return KolaylastirmaOnerisi(
          tur: 'ders',
          dersId: en.id,
          etiket: 'Kolay dersi aç',
          mesaj:
              'Üst üste iki denemede zorlandın. Önce daha kolay bir derse '
              'dön: ${en.ad} (~${DersMeta.dersDakika(en)} dk).',
        );
      }
    }
    final bekleyen = Motor.tekrarBekleyen(d, bugun).length;
    if (bekleyen > 0) {
      return KolaylastirmaOnerisi(
        tur: 'tekrar',
        etiket: 'Tekrara git',
        mesaj:
            'Üst üste iki denemede zorlandın. Önce bekleyen $bekleyen kartı '
            'tekrar et; sonra dersi yeniden dene.',
      );
    }
    if (d.hatalar.isNotEmpty) {
      return const KolaylastirmaOnerisi(
        tur: 'zayif',
        etiket: 'Zayıf noktalar dersi',
        mesaj:
            'Üst üste iki denemede zorlandın. Hata defterinden kısa bir '
            'zayıf noktalar dersi yap; sonra dersi yeniden dene.',
      );
    }
    return KolaylastirmaOnerisi(
      tur: 'yeniden',
      dersId: basarisiz,
      etiket: 'Dersi yeniden dene',
      mesaj:
          'Üst üste iki denemede zorlandın. Ders notunu ve açıklamaları '
          'dikkatle okuyup dersi yeniden dene; acele etme.',
    );
  }
}
