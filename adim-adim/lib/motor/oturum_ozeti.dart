/// Oturum özeti ve kilometre taşları (saf işlevler): ders, mikro ders ve hızlı
/// tekrar bittiğinde doğru oranı, kazanılan XP, bu oturumda yeni kazanılan
/// rozetler (mevcut [Basarimlar] motoru: önceki ve sonraki durum farkı), seri
/// durumu ve kilometre taşları (7. ve 30. gün seri, ilk ünite bitirme) türetilir.
/// Hiçbir şey saklanmaz, XP/rozet verilmez; yalnız gösterim verisidir.
/// Bugünkü hatalar ve zayıf konu ([bugunkuHatalar], [zayifKonu]) de buradan
/// türetilir; hata defteri kaydı [HataKaydi] değişmez.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#bugunku-hatalar] (bugünkü hatalar ve zayıf konu bölümü)
library;

import '../model/durum.dart';
import '../model/icerik.dart';
import '../yarisma/model.dart';
import 'basarimlar.dart';
import 'motor.dart';

/// Kutlanan tek kilometre taşı.
class Kilometre {
  const Kilometre({
    required this.id,
    required this.baslik,
    required this.aciklama,
  });

  /// 'seri_7', 'seri_30' ya da 'ilk_unite'.
  final String id;
  final String baslik;
  final String aciklama;
}

/// Bir oturumun gösterilecek özeti.
class OturumOzetiVeri {
  const OturumOzetiVeri({
    required this.dogru,
    required this.toplam,
    required this.xp,
    required this.seri,
    required this.seriArtti,
    required this.yeniRozetler,
    required this.kilometreler,
    this.yeniKelime = 0,
    this.enSikHece,
  });

  final int dogru;
  final int toplam;
  final int xp;

  /// Oturum sonundaki seri (gün).
  final int seri;

  /// Seri bu oturumla bir gün arttı mı (bugünün serisi ilk kez sayıldı)?
  final bool seriArtti;
  final List<Basarim> yeniRozetler;
  final List<Kilometre> kilometreler;

  /// Bu oturumda Kelimelerim listesine eklenen yeni kelime sayısı.
  final int yeniKelime;

  /// Oturumda en sık hatalı çıkan hece (telaffuz tahmini); veri yoksa null.
  final String? enSikHece;

  /// Bu oturumdaki yanlış sayısı (toplam - doğru, en az 0).
  int get yanlis => (toplam - dogru).clamp(0, toplam < 0 ? 0 : toplam);

  /// Doğru yüzdesi (tam sayı, 0..100); toplam 0 ise 0.
  int get yuzde => toplam <= 0 ? 0 : (dogru * 100 ~/ toplam).clamp(0, 100);

  /// Üç üzerinden yıldız: %50+ bir, %80+ iki, %100 üç (toplam > 0).
  int get yildiz {
    if (toplam <= 0) return 0;
    if (dogru >= toplam) return 3;
    if (yuzde >= 80) return 2;
    if (yuzde >= 50) return 1;
    return 0;
  }
}

abstract final class OturumOzetiMotoru {
  /// Seri kilometre taşları (gün).
  static const List<int> seriTaslari = [7, 30];

  /// Oturum sonunda listelenen en çok bugünkü hata sayısı.
  static const int bugunkuHataEnCok = 5;

  /// Bugün ([bugun], 'YYYY-MM-DD') eklenen hata kayıtlarının sayısı (tümü).
  static int bugunkuHataSayisi(OgrenciDurumu d, String bugun) {
    var n = 0;
    for (final h in d.hatalar) {
      if (h.gun == bugun) n++;
    }
    return n;
  }

  /// Bugün eklenen hata kayıtları: en yeni önce, en çok [bugunkuHataEnCok].
  /// Hata defteri sona ekler ([Motor.hataEkle]); bu yüzden ters sırayla gezilir.
  static List<HataKaydi> bugunkuHatalar(OgrenciDurumu d, String bugun) {
    final sonuc = <HataKaydi>[];
    for (final h in d.hatalar.reversed) {
      if (h.gun != bugun) continue;
      sonuc.add(h);
      if (sonuc.length >= bugunkuHataEnCok) break;
    }
    return sonuc;
  }

  /// Bir hata kaydının konusu: kart hatasında ünite adı (kurslarda
  /// çözülemezse ders kimliğinin ünite öneki), yarışma hatasında kategori adı
  /// (yoksa seviye/kurs kimliği).
  static String hataKonusu(HataKaydi h, List<Kurs> kurslar) {
    if (h.tur == HataKaydi.turYarisma) {
      final k = h.kategori == null ? null : kategoriCoz(h.kategori!);
      return k?.ad ?? (h.seviye.isEmpty ? h.id : h.seviye);
    }
    final ayrac = h.id.lastIndexOf('#');
    final dersId = ayrac > 0 ? h.id.substring(0, ayrac) : h.id;
    for (final k in kurslar) {
      for (final u in k.uniteler) {
        for (final d in u.dersler) {
          if (d.id == dersId) return u.ad;
        }
      }
    }
    final nokta = dersId.lastIndexOf('.');
    return nokta > 0 ? dersId.substring(0, nokta) : dersId;
  }

  /// Bugünkü hataların en çok toplandığı konu (ünite/kategori adı); eşitlikte
  /// en son hata yapılan konu kazanır. Bugün hata yoksa null.
  static String? zayifKonu(
    OgrenciDurumu d,
    String bugun, {
    List<Kurs> kurslar = const [],
  }) {
    final sayi = <String, int>{};
    // Harita ekleme sırası = en yeniden en eskiye ilk görülme sırası.
    for (final h in d.hatalar.reversed) {
      if (h.gun != bugun) continue;
      final konu = hataKonusu(h, kurslar);
      sayi[konu] = (sayi[konu] ?? 0) + 1;
    }
    String? secim;
    var enCok = 0;
    for (final e in sayi.entries) {
      // Katı büyüktür: eşitlikte önce görülen (daha yeni) konu kalır.
      if (e.value > enCok) {
        enCok = e.value;
        secim = e.key;
      }
    }
    return secim;
  }

  /// Soru metnini tek satıra kısaltır: boşluklar sadeleşir, [enCok]
  /// karakterden uzunsa sonuna "…" eklenir.
  static String kisalt(String metin, {int enCok = 60}) {
    final tek = metin.replaceAll(RegExp(r'\s+'), ' ').trim();
    if (tek.length <= enCok) return tek;
    return '${tek.substring(0, enCok - 1).trimRight()}…';
  }

  /// Biten (ya da atlanan) ünite sayısı, verilen kurslarda.
  static int bitenUnite(OgrenciDurumu d, List<Kurs> kurslar) {
    var n = 0;
    for (final k in kurslar) {
      for (final u in k.uniteler) {
        if (Motor.uniteBitmis(d, u)) n++;
      }
    }
    return n;
  }

  /// Önceki ve sonraki durum arasında yeni kazanılan rozetler (sabit sırada).
  static List<Basarim> yeniRozetler(
    OgrenciDurumu onceki,
    OgrenciDurumu sonraki,
    List<Kurs> kurslar,
  ) {
    final eski = {
      for (final b in Basarimlar.hesapla(onceki, kurslar))
        if (b.kazanildi) b.id,
    };
    return [
      for (final b in Basarimlar.hesapla(sonraki, kurslar))
        if (b.kazanildi && !eski.contains(b.id)) b,
    ];
  }

  /// Bu oturumda ilk kez aşılan kilometre taşları: 7. ve 30. gün seri, ilk
  /// ünite bitirme.
  static List<Kilometre> kilometreler(
    OgrenciDurumu onceki,
    OgrenciDurumu sonraki,
    List<Kurs> kurslar,
  ) {
    final sonuc = <Kilometre>[];
    for (final gun in seriTaslari) {
      if (onceki.seri < gun && sonraki.seri >= gun) {
        sonuc.add(
          Kilometre(
            id: 'seri_$gun',
            baslik: '$gun günlük seri!',
            aciklama: gun == 7
                ? 'Üst üste bir hafta çalıştın. Böyle devam.'
                : 'Üst üste bir ay çalıştın. Gerçek bir alışkanlık.',
          ),
        );
      }
    }
    if (bitenUnite(onceki, kurslar) == 0) {
      Unite? ilk;
      for (final k in kurslar) {
        for (final u in k.uniteler) {
          if (ilk == null && Motor.uniteBitmis(sonraki, u)) ilk = u;
        }
      }
      if (ilk != null) {
        sonuc.add(
          Kilometre(
            id: 'ilk_unite',
            baslik: 'İlk üniteni bitirdin!',
            aciklama: '${ilk.ad} tamamlandı. İlk büyük adım atıldı.',
          ),
        );
      }
    }
    return sonuc;
  }

  /// Telaffuz sonuçlarındaki ([TelaffuzTahmini.hataliHeceler]) en sık hatalı
  /// hece; eşitlikte önce görülen kazanır. Boşsa null.
  static String? enSikHece(Iterable<Iterable<String>> hataliHeceler) {
    final sayi = <String, int>{};
    for (final liste in hataliHeceler) {
      for (final h in liste) {
        final k = h.trim().toLowerCase();
        if (k.isNotEmpty) sayi[k] = (sayi[k] ?? 0) + 1;
      }
    }
    String? secim;
    var enCok = 0;
    for (final e in sayi.entries) {
      if (e.value > enCok) {
        enCok = e.value;
        secim = e.key;
      }
    }
    return secim;
  }

  /// Oturum özetini hesaplar.
  static OturumOzetiVeri hesapla({
    required OgrenciDurumu onceki,
    required OgrenciDurumu sonraki,
    required List<Kurs> kurslar,
    required int dogru,
    required int toplam,
    required int xp,
    int yeniKelime = 0,
    Iterable<Iterable<String>> hataliHeceler = const [],
  }) => OturumOzetiVeri(
    dogru: dogru,
    toplam: toplam,
    xp: xp,
    seri: sonraki.seri,
    seriArtti: sonraki.seri > onceki.seri,
    yeniRozetler: yeniRozetler(onceki, sonraki, kurslar),
    kilometreler: kilometreler(onceki, sonraki, kurslar),
    yeniKelime: yeniKelime,
    enSikHece: enSikHece(hataliHeceler),
  );
}
