/// Aylık meydan okuma, haftalık yan görev ve kişisel rekorlar (ÖZELLİK 49).
/// Hepsi saf işlevdir; durum değiştirmez. Veri `OgrenciDurumu`ndaki kayıtlı
/// sayaçlardan türetilir: ay başına biten ders (`aylikDers`; eski kayıtlarda
/// yoksa günlükteki 'ders' kayıtlarıyla tamamlanır), günlük XP ve süre.
///
/// Aylık meydan okuma: ayın tek büyük hedefi (varsayılan 30 ders). Ödül
/// yoktur (XP vermez); tamamlanınca "tamamlandı" gösterilir.
/// Haftalık yan görev: haftaya göre deterministik seçilen küçük görev
/// (tekrar oturumu, kısa quiz, mikro ders, bilmece, ders); ilerleme haftanın
/// günlük kayıtlarından sayılır (günlük en çok 200 kayıt tuttuğundan, bir
/// haftada 200'den fazla kayıt olursa fazlası sayılmaz).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/durum.dart';
import 'motor.dart';

/// Aylık meydan okuma durumu.
typedef AylikMeydan = ({
  String ay,
  int hedef,
  int ilerleme,
  bool tamam,
  int kalanGun,
  int gunlukGerekli,
});

/// Haftalık yan görev durumu.
class YanGorev {
  const YanGorev({
    required this.tur,
    required this.baslik,
    required this.hedef,
    required this.ilerleme,
  });

  /// Sayılan günlük kaydı türü ('tekrar' | 'quiz' | 'mikro' | 'bilmece' | 'ders').
  final String tur;
  final String baslik;
  final int hedef;
  final int ilerleme;

  bool get tamam => ilerleme >= hedef;
}

/// Kişisel rekor satırı: [deger] [birim] cinsinden, varsa [gun]'de.
class Rekor {
  const Rekor({
    required this.kod,
    required this.ad,
    required this.deger,
    required this.birim,
    this.gun,
  });

  final String kod;
  final String ad;
  final int deger;
  final String birim;

  /// Rekorun günü ('YYYY-MM-DD') ya da ayı ('YYYY-MM'); bilinmiyorsa null.
  final String? gun;

  String get metin => '$deger $birim';
}

abstract final class Meydan {
  /// Seçilebilir aylık hedefler (ders sayısı).
  static const List<int> hedefSecenekleri = [10, 20, 30, 45, 60];

  /// Haftalık yan görev havuzu: (tür, başlık, hedef). Hafta numarasına göre
  /// sırayla döner.
  static const List<({String tur, String baslik, int hedef})> _gorevler = [
    (tur: 'tekrar', baslik: 'Bu hafta 3 tekrar oturumu tamamla', hedef: 3),
    (tur: 'quiz', baslik: 'Bu hafta 3 kısa quiz çöz', hedef: 3),
    (tur: 'mikro', baslik: 'Bu hafta 4 mikro ders yap', hedef: 4),
    (tur: 'bilmece', baslik: 'Günün bilmecesini 3 gün çöz', hedef: 3),
    (tur: 'ders', baslik: 'Bu hafta 5 ders bitir', hedef: 5),
  ];

  /// 'YYYY-MM-DD' gününün ayı 'YYYY-MM'.
  static String ay(String gun) => gun.length >= 7 ? gun.substring(0, 7) : gun;

  /// Ay başına bitirilen ders: kayıtlı sayaç ile günlükteki 'ders' kayıtlarının
  /// büyüğü (sayaç yokken tutulmuş eski kayıtlar da sayılır).
  static Map<String, int> aylikDersler(OgrenciDurumu d) {
    final g = <String, int>{};
    for (final k in d.gunluk) {
      if (k.tur == GunlukKayit.turDers) g[ay(k.gun)] = (g[ay(k.gun)] ?? 0) + 1;
    }
    final sonuc = {...d.aylikDers};
    for (final e in g.entries) {
      if ((sonuc[e.key] ?? 0) < e.value) sonuc[e.key] = e.value;
    }
    return sonuc;
  }

  /// Ayın gün sayısı ('YYYY-MM'); geçersizse 30.
  static int ayGunSayisi(String ayKodu) {
    if (!OgrenciDurumu.ayGecerli(ayKodu)) return 30;
    final y = int.parse(ayKodu.substring(0, 4));
    final a = int.parse(ayKodu.substring(5, 7));
    return DateTime.utc(y, a + 1, 0).day;
  }

  /// Bugünün ayındaki meydan okuma durumu.
  static AylikMeydan aylik(OgrenciDurumu d, String bugun) {
    final a = ay(bugun);
    final ilerleme = aylikDersler(d)[a] ?? 0;
    final hedef = d.aylikHedefDers;
    final gun = OgrenciDurumu.gunGecerli(bugun)
        ? int.parse(bugun.substring(8, 10))
        : 1;
    final kalan = ayGunSayisi(a) - gun + 1;
    final eksik = hedef - ilerleme;
    final gerekli = eksik <= 0 || kalan <= 0 ? 0 : (eksik + kalan - 1) ~/ kalan;
    return (
      ay: a,
      hedef: hedef,
      ilerleme: ilerleme,
      tamam: ilerleme >= hedef,
      kalanGun: kalan,
      gunlukGerekli: gerekli,
    );
  }

  /// Aylık hedefi ayarlar (5..100 aralığına çekilir).
  static OgrenciDurumu hedefAyarla(OgrenciDurumu d, int hedef) => d.copyWith(
    aylikHedefDers: hedef.clamp(
      OgrenciDurumu.enAzAylikHedef,
      OgrenciDurumu.enCokAylikHedef,
    ),
  );

  /// Haftanın yan görevi: haftanın Pazartesi'sinden hafta numarası türetilir,
  /// görev havuzunda sırayla döner (aynı hafta aynı görev).
  static YanGorev yanGorev(OgrenciDurumu d, String bugun) {
    final pzt = Motor.haftaBaslangici(bugun);
    final t = DateTime.tryParse('${pzt}T00:00:00Z');
    final hafta = t == null ? 0 : t.millisecondsSinceEpoch ~/ (7 * 86400000);
    final g = _gorevler[hafta % _gorevler.length];
    var n = 0;
    for (final k in d.gunluk) {
      if (k.tur != g.tur) continue;
      final f = Motor.gunFarki(pzt, k.gun);
      if (f >= 0 && f <= 6) n++;
    }
    return YanGorev(
      tur: g.tur,
      baslik: g.baslik,
      hedef: g.hedef,
      ilerleme: n > g.hedef ? g.hedef : n,
    );
  }

  /// Kişisel rekorlar; değeri 0 olanlar listelenmez. Sıra: en uzun seri, en
  /// çok XP (gün), en çok XP (hafta), en uzun çalışma (gün), en çok ders (ay).
  static List<Rekor> rekorlar(OgrenciDurumu d) {
    final sonuc = <Rekor>[];
    if (d.enSeri > 0) {
      sonuc.add(
        Rekor(kod: 'seri', ad: 'En uzun seri', deger: d.enSeri, birim: 'gün'),
      );
    }
    String? enGun;
    var enXp = 0;
    final hafta = <String, int>{};
    for (final e in d.gunlukXp.entries) {
      if (e.value <= 0) continue;
      if (e.value > enXp || (e.value == enXp && e.key.compareTo(enGun!) > 0)) {
        enXp = e.value;
        enGun = e.key;
      }
      final h = Motor.haftaBaslangici(e.key);
      hafta[h] = (hafta[h] ?? 0) + e.value;
    }
    if (enXp > 0) {
      sonuc.add(
        Rekor(
          kod: 'xp-gun',
          ad: 'En çok XP (bir günde)',
          deger: enXp,
          birim: 'XP',
          gun: enGun,
        ),
      );
    }
    final enHafta = _enBuyuk(hafta);
    if (enHafta != null) {
      sonuc.add(
        Rekor(
          kod: 'xp-hafta',
          ad: 'En çok XP (bir haftada)',
          deger: enHafta.deger,
          birim: 'XP',
          gun: enHafta.anahtar,
        ),
      );
    }
    final enSure = _enBuyuk(d.gunlukSureSn);
    if (enSure != null && enSure.deger >= 60) {
      sonuc.add(
        Rekor(
          kod: 'sure-gun',
          ad: 'En uzun çalışma (bir günde)',
          deger: enSure.deger ~/ 60,
          birim: 'dk',
          gun: enSure.anahtar,
        ),
      );
    }
    final enAy = _enBuyuk(aylikDersler(d));
    if (enAy != null) {
      sonuc.add(
        Rekor(
          kod: 'ders-ay',
          ad: 'En çok ders (bir ayda)',
          deger: enAy.deger,
          birim: 'ders',
          gun: enAy.anahtar,
        ),
      );
    }
    return sonuc;
  }

  /// Haritadaki en büyük pozitif değer; eşitlikte en yeni anahtar. Yoksa null.
  static ({String anahtar, int deger})? _enBuyuk(Map<String, int> m) {
    String? ak;
    var av = 0;
    for (final e in m.entries) {
      if (e.value <= 0) continue;
      if (e.value > av || (e.value == av && e.key.compareTo(ak!) > 0)) {
        av = e.value;
        ak = e.key;
      }
    }
    return ak == null ? null : (anahtar: ak, deger: av);
  }
}
