/// Gerekçeli kişisel öneri (ÖZELLİK 73, Brilliant): "Bunu öneriyoruz çünkü ..."
/// ve tahmini süre. Kural tabanlıdır (yapay zekâ yok), öğrenci durumundan
/// türetilir, saklanmaz. Sıra: (1) zamanı gelen tekrar kartları, (2) hata
/// defterindeki zayıf noktalar, (3) hafıza puanı en düşük ünite, (4) yoldaki
/// sıradaki ders. Her öneri bir rota ve tahmini dakika taşır. Durumu
/// değiştirmez.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/durum.dart';
import '../model/icerik.dart';
import 'ders_meta.dart';
import 'hafiza.dart';
import 'motor.dart';

enum OneriTuru { tekrar, zayifNokta, zayifUnite, siradakiDers }

class Oneri {
  const Oneri({
    required this.tur,
    required this.baslik,
    required this.gerekce,
    required this.dakika,
    required this.rota,
  });

  final OneriTuru tur;
  final String baslik;

  /// "Bunu öneriyoruz çünkü ..." ile başlayan tam cümle.
  final String gerekce;

  /// Tahmini süre (dakika, en az 1).
  final int dakika;
  final String rota;
}

abstract final class Oneriler {
  /// Bir tekrar kartı için varsayılan süre (saniye).
  static const int kartSaniye = 15;

  /// Bu puanın altındaki ünite "zayıf" önerilir.
  static const int zayifUnitePuani = 60;

  static const String _giris = 'Bunu öneriyoruz çünkü ';

  static int _dk(int sn) => sn <= 0 ? 1 : ((sn + 59) ~/ 60).clamp(1, 999);

  static List<Oneri> uret(
    OgrenciDurumu d,
    List<Kurs> kurslar,
    String bugun, {
    int enCok = 4,
  }) {
    final sonuc = <Oneri>[];

    // 1) Zamanı gelen tekrar (yalnız verilen kurslarda çözülebilenler).
    final bekleyen = [
      for (final id in Motor.tekrarBekleyen(d, bugun))
        if (Motor.kartCoz(kurslar, id) != null) id,
    ];
    if (bekleyen.isNotEmpty) {
      final gecikmis = bekleyen
          .where((id) => Motor.gunFarki(d.kartlar[id]!.sonraki, bugun) > 0)
          .length;
      sonuc.add(
        Oneri(
          tur: OneriTuru.tekrar,
          baslik: 'Bekleyen kartları tekrar et',
          gerekce:
              '$_giris${bekleyen.length} kartın tekrar zamanı geldi'
              '${gecikmis > 0 ? ' ($gecikmis tanesi gecikti)' : ''}; '
              'zamanında tekrar unutmayı yavaşlatır.',
          dakika: _dk(bekleyen.length * kartSaniye),
          rota: '/tekrar',
        ),
      );
    }

    // 2) Hata defterindeki zayıf noktalar (son 7 gün).
    final zayif = [
      for (final id in Motor.zayifKartlar(d, bugun))
        if (Motor.kartCoz(kurslar, id) != null) id,
    ];
    if (zayif.isNotEmpty) {
      sonuc.add(
        Oneri(
          tur: OneriTuru.zayifNokta,
          baslik: 'Zayıf noktalar dersi',
          gerekce:
              '${_giris}son 7 günde ${zayif.length} adımda yanlış yaptın; '
              'bu adımlara yeniden bakmak kalıcı öğrenmeyi sağlar.',
          dakika: 2,
          rota: '/mikro?mod=zayif',
        ),
      );
    }

    // 3) Hafıza puanı en düşük ünite.
    UniteHafizasi? enZayif;
    for (final h in Hafiza.uniteler(d, kurslar)) {
      if (h.kartSayisi == 0 || h.puan >= zayifUnitePuani) continue;
      if (enZayif == null || h.puan < enZayif.puan) enZayif = h;
    }
    if (enZayif != null) {
      sonuc.add(
        Oneri(
          tur: OneriTuru.zayifUnite,
          baslik: '${enZayif.unite.ad} ünitesini pekiştir',
          gerekce:
              '${_giris}bu ünitenin hafıza puanı ${enZayif.puan}; '
              'dört modlu çalışma puanı yükseltir.',
          dakika: 3,
          rota:
              '/calisma-modu?kurs=${Uri.encodeComponent(enZayif.kurs.id)}'
              '&unite=${enZayif.uniteIndeks}',
        ),
      );
    }

    // 4) Yoldaki sıradaki ders (ilk bitmemiş ders).
    for (final k in kurslar) {
      Ders? ders;
      for (final x in k.tumDersler) {
        if (!Motor.dersBitmis(d, x.id)) {
          ders = x;
          break;
        }
      }
      if (ders == null) continue;
      final toplam = k.tumDersler.length;
      final biten = k.tumDersler.where((x) => Motor.dersBitmis(d, x.id)).length;
      final bugunXp = d.gunlukXp[bugun] ?? 0;
      final kalanXp = d.gunlukHedef - bugunXp;
      sonuc.add(
        Oneri(
          tur: OneriTuru.siradakiDers,
          baslik: 'Sıradaki ders: ${ders.ad}',
          gerekce:
              '$_giris${k.ad} kursunda $biten/$toplam dersi bitirdin ve bu, '
              'yoldaki sıradaki ders'
              '${kalanXp > 0 ? '; günlük hedefine $kalanXp XP kaldı' : ''}.',
          dakika: DersMeta.dersDakika(ders).clamp(1, 999),
          rota: '/ders/${Uri.encodeComponent(ders.id)}',
        ),
      );
      break;
    }
    return sonuc.take(enCok).toList();
  }
}
