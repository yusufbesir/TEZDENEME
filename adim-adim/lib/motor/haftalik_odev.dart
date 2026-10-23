/// Haftalık ödev ve büyüyen sözlük (saf işlevler). Haftalık ödev: hafta sonunda
/// (Cumartesi, Pazar) o haftanın en zayıf 5 kelimesi önerilir; ödev, kısa
/// tekrar ("Zayıf noktalar dersi") ve "Bu hafta ne öğrendim?" serbest notudur.
/// Not yerelde durum dosyasında saklanır (en çok 52 hafta, 500 karakter).
/// Büyüyen sözlük: bir oturumda Kelimelerim havuzuna giren yeni kelimeler
/// bulunur ve ilk eklenme günü kaydedilir ("yeni" etiketi, "bu hafta eklenen"
/// süzgeci). Ağ yok, rastgele ödül yok.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/durum.dart';
import '../model/icerik.dart';
import 'kelime_gucu.dart';
import 'motor.dart';
import 'pratik.dart';

abstract final class HaftalikOdev {
  /// Ödevde önerilen en zayıf kelime sayısı.
  static const int zayifAdet = 5;

  /// Ödev hafta sonunda (Cumartesi, Pazar) açıktır; geçersiz günde kapalı.
  static bool acik(String bugun) {
    if (!OgrenciDurumu.gunGecerli(bugun)) return false;
    final p = bugun.split('-').map(int.parse).toList();
    final w = DateTime.utc(p[0], p[1], p[2]).weekday;
    return w == DateTime.saturday || w == DateTime.sunday;
  }

  /// Günün haftası: Pazartesi günü 'YYYY-MM-DD' (not anahtarı).
  static String hafta(String bugun) => Motor.haftaBaslangici(bugun);

  /// En zayıf [zayifAdet] kelime: kartı olan (en az bir kez sorulmuş) kelimeler
  /// güç puanına göre artan, eşitlikte alfabe. Kart yoksa boş liste.
  static List<KelimeSatiri> zayifKelimeler(
    OgrenciDurumu d,
    List<Kurs> kurslar,
  ) {
    final adaylar = [
      for (final s in KelimeGucu.liste(d, kurslar))
        if (d.kartlar.containsKey(s.kartId)) s,
    ];
    final sirali = KelimeGucu.sirala(adaylar, KelimeSirasi.guc);
    // 'Yeni' kovası güce göre sıralamada başta; ödevde gerçekten zayıf olanlar
    // (puan artan) öne alınır.
    sirali.sort((a, b) {
      final p = a.puan.compareTo(b.puan);
      if (p != 0) return p;
      return KelimeGucu.anahtar(a.metin).compareTo(KelimeGucu.anahtar(b.metin));
    });
    return sirali.take(zayifAdet).toList();
  }

  /// [bugun] haftasının notu (yoksa boş metin).
  static String not(OgrenciDurumu d, String bugun) =>
      d.haftalikNotlar[hafta(bugun)] ?? '';

  /// Notu kaydeder: kırpılır, [OgrenciDurumu.haftalikNotEnCokKarakter]'e
  /// kısaltılır; boşsa o haftanın notu silinir; en yeni
  /// [OgrenciDurumu.haftalikNotEnCok] hafta tutulur.
  static OgrenciDurumu notKaydet(OgrenciDurumu d, String bugun, String metin) {
    final h = hafta(bugun);
    if (!OgrenciDurumu.gunGecerli(h)) return d;
    var t = metin.trim();
    if (t.length > OgrenciDurumu.haftalikNotEnCokKarakter) {
      t = t.substring(0, OgrenciDurumu.haftalikNotEnCokKarakter);
    }
    final yeni = Map<String, String>.of(d.haftalikNotlar);
    if (t.isEmpty) {
      if (yeni.remove(h) == null) return d;
    } else {
      yeni[h] = t;
    }
    final anahtarlar = yeni.keys.toList()..sort();
    while (anahtarlar.length > OgrenciDurumu.haftalikNotEnCok) {
      yeni.remove(anahtarlar.removeAt(0));
    }
    return d.copyWith(haftalikNotlar: Map.unmodifiable(yeni));
  }

  /// Geçmiş notlar, en yeni hafta önce. [bugun] verilirse o haftanın notu
  /// listeye girmez.
  static List<({String hafta, String not})> gecmis(
    OgrenciDurumu d, {
    String? bugun,
  }) {
    final hari = bugun == null ? null : hafta(bugun);
    final anahtarlar = d.haftalikNotlar.keys.where((k) => k != hari).toList()
      ..sort((a, b) => b.compareTo(a));
    return [for (final k in anahtarlar) (hafta: k, not: d.haftalikNotlar[k]!)];
  }
}

/// Büyüyen sözlük: yeni kelimelerin bulunması ve eklenme gününün kaydı.
abstract final class YeniKelimeler {
  /// [sonraki] durumda Kelimelerim havuzunda olup [onceki] durumda olmayan
  /// kelimelerin kart kimlikleri (havuz sırasıyla).
  static List<String> bul(
    OgrenciDurumu onceki,
    OgrenciDurumu sonraki,
    List<Kurs> kurslar,
  ) {
    final eski = {
      for (final c in Pratik.kelimeHavuzu(onceki, kurslar)) c.kartId,
    };
    return [
      for (final c in Pratik.kelimeHavuzu(sonraki, kurslar))
        if (!eski.contains(c.kartId)) c.kartId,
    ];
  }

  /// Yeni kelimelerin eklenme gününü yazar (var olan kaydı değiştirmez);
  /// en yeni [OgrenciDurumu.kelimeEklenmeEnCok] kayıt tutulur.
  static OgrenciDurumu isle(OgrenciDurumu d, Iterable<String> ids, String gun) {
    if (!OgrenciDurumu.gunGecerli(gun)) return d;
    final yeni = Map<String, String>.of(d.kelimeEklenme);
    var degisti = false;
    for (final id in ids) {
      if (id.isEmpty || id.length > 80 || yeni.containsKey(id)) continue;
      yeni[id] = gun;
      degisti = true;
    }
    if (!degisti) return d;
    return d.copyWith(kelimeEklenme: OgrenciDurumu.kelimeEklenmeCoz(yeni));
  }

  /// Kelime [bugun] haftasında (Pazartesi başlangıç) mı eklendi?
  static bool buHafta(OgrenciDurumu d, String kartId, String bugun) {
    final g = d.kelimeEklenme[kartId];
    return g != null && g.compareTo(Motor.haftaBaslangici(bugun)) >= 0;
  }

  /// Bu hafta eklenen kelime kimlikleri.
  static Set<String> buHaftaKimlikleri(OgrenciDurumu d, String bugun) => {
    for (final e in d.kelimeEklenme.entries)
      if (buHafta(d, e.key, bugun)) e.key,
  };
}
