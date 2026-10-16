/// Öğrenme motoru: XP, seviye, seri, aralıklı tekrar (Leitner) ve cevap kontrolü.
/// Saf Dart; Flutter'a bağımlı değildir. Tüm işlevler yan etkisizdir.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla.
library;

import 'dart:math' as math;

import '../model/durum.dart';
import '../model/icerik.dart';

/// Seviye bilgisi.
class Seviye {
  const Seviye({
    required this.no,
    required this.bu,
    required this.sonraki,
    required this.oran,
  });

  /// Seviye numarası (1'den başlar).
  final int no;

  /// Seviye içinde kazanılmış XP.
  final int bu;

  /// Bu seviyeyi geçmek için gereken XP.
  final int sonraki;

  /// İlerleme oranı, 0..1.
  final double oran;
}

abstract final class Motor {
  /// Leitner kutularının gün aralıkları (kutu 1..5).
  static const List<int> _araliklar = [1, 2, 4, 8, 16];

  /// Seviye hesabında taşmayı önlemek için XP üst sınırı.
  static const int _xpUst = 1 << 50;

  /// Yerel saate göre 'YYYY-MM-DD'.
  static String bugun([DateTime? simdi]) {
    final t = simdi ?? DateTime.now();
    return _bicim(t.year, t.month, t.day);
  }

  static String _bicim(int y, int a, int g) {
    final yil = y.toString().padLeft(4, '0');
    final ay = a.toString().padLeft(2, '0');
    final gun = g.toString().padLeft(2, '0');
    return '$yil-$ay-$gun';
  }

  /// 'YYYY-MM-DD' metnini UTC gece yarısı olarak çözer; geçersizse null.
  static DateTime? _gunCoz(String s) {
    if (!OgrenciDurumu.gunGecerli(s)) return null;
    final y = int.tryParse(s.substring(0, 4));
    final a = int.tryParse(s.substring(5, 7));
    final g = int.tryParse(s.substring(8, 10));
    if (y == null || a == null || g == null) return null;
    return DateTime.utc(y, a, g);
  }

  /// [gun] gününe [n] gün ekler (UTC üzerinden, yaz saati etkisi yok).
  static String _gunEkle(String gun, int n) {
    final t = _gunCoz(gun);
    if (t == null) return gun;
    final r = t.add(Duration(days: n));
    return _bicim(r.year, r.month, r.day);
  }

  /// b - a gün sayısı. Geçersiz girdide 0 döner.
  static int gunFarki(String a, String b) {
    final ta = _gunCoz(a);
    final tb = _gunCoz(b);
    if (ta == null || tb == null) return 0;
    return tb.difference(ta).inDays;
  }

  /// Seviye n için gereken XP: 100 + 25*(n-1).
  /// m seviye tamamlamak için toplam XP: 12.5 m^2 + 87.5 m (kapalı formül).
  static Seviye seviye(int xp) {
    final x = xp < 0 ? 0 : (xp > _xpUst ? _xpUst : xp);
    int toplam(int m) => (25 * m * m + 175 * m) ~/ 2;
    // Kapalı formülle tahmin, ardından tam sayı düzeltmesi.
    var m = ((-87.5 + math.sqrt(87.5 * 87.5 + 50.0 * x)) / 25).floor();
    if (m < 0) m = 0;
    while (m > 0 && toplam(m) > x) {
      m--;
    }
    while (toplam(m + 1) <= x) {
      m++;
    }
    final gereken = 100 + 25 * m;
    final bu = x - toplam(m);
    return Seviye(no: m + 1, bu: bu, sonraki: gereken, oran: bu / gereken);
  }

  /// Bir dersin kazandıracağı XP: 10 + doğru*2 (+5 tam puan).
  /// Doğru sayısı 0..toplam aralığına çekilir; toplam 0 ise tam puan bonusu yok.
  static int dersXp(int dogru, int toplam) {
    final t = toplam < 0 ? 0 : toplam;
    final d = dogru < 0 ? 0 : (dogru > t ? t : dogru);
    final bonus = (t > 0 && d == t) ? 5 : 0;
    return 10 + d * 2 + bonus;
  }

  /// Ekranda gösterilecek seri. Son çalışma günü bugünden ya da dünden eskiyse
  /// seri fiilen kopmuştur; ders bitirilmeden sayı güncellenmez, bu yüzden
  /// gösterimde 0 verilir.
  static int gosterilenSeri(OgrenciDurumu d, [String? bugun]) {
    final sonGun = d.sonGun;
    if (sonGun == null) return 0;
    final fark = gunFarki(sonGun, bugun ?? Motor.bugun());
    if (fark < 0 || fark > 1) return 0;
    return d.seri;
  }

  /// XP kazancını işler: toplam XP, günlük XP, seri, en iyi seri ve son gün.
  /// `tamamlanan` ve kartlara dokunmaz. dersBitir, mikroBitir ve yarismaBitir paylaşır.
  static OgrenciDurumu _kazancIsle(OgrenciDurumu d, int kazanc, String bugun) {
    int yeniSeri;
    final son = d.sonGun;
    if (son == bugun) {
      yeniSeri = d.seri;
    } else if (son != null && gunFarki(son, bugun) == 1) {
      yeniSeri = d.seri + 1;
    } else {
      yeniSeri = 1;
    }
    final enSeri = yeniSeri > d.enSeri ? yeniSeri : d.enSeri;
    return d.copyWith(
      xp: d.xp + kazanc,
      seri: yeniSeri,
      enSeri: enSeri,
      sonGun: bugun,
      gunlukXp: {...d.gunlukXp, bugun: (d.gunlukXp[bugun] ?? 0) + kazanc},
    );
  }

  static OgrenciDurumu dersBitir(
    OgrenciDurumu d,
    String dersId,
    int dogru,
    int toplam,
    String bugun,
  ) {
    final yeni = _kazancIsle(d, dersXp(dogru, toplam), bugun);
    return yeni.copyWith(
      tamamlanan: {...d.tamamlanan, dersId: (d.tamamlanan[dersId] ?? 0) + 1},
    );
  }

  /// Mikro dersin kazandıracağı XP: 5 + doğru*2 (+3 tam puan).
  /// Sınırlar dersXp ile aynıdır; toplam 0 ise tam puan bonusu yok.
  static int mikroXp(int dogru, int toplam) {
    final t = toplam < 0 ? 0 : toplam;
    final d = dogru < 0 ? 0 : (dogru > t ? t : dogru);
    final bonus = (t > 0 && d == t) ? 3 : 0;
    return 5 + d * 2 + bonus;
  }

  /// Mikro ders bitişi: XP, seri ve günlük XP güncellenir; `tamamlanan` değişmez.
  static OgrenciDurumu mikroBitir(
    OgrenciDurumu d,
    int dogru,
    int toplam,
    String bugun,
  ) => _kazancIsle(d, mikroXp(dogru, toplam), bugun);

  /// Yarışma bitişi: XP = max(5, puan ~/ 5); negatif puan 0 sayılır.
  /// Seri ve günlük XP güncellenir; `tamamlanan` değişmez.
  static OgrenciDurumu yarismaBitir(OgrenciDurumu d, int puan, String bugun) {
    final p = puan < 0 ? 0 : puan;
    final kazanc = p ~/ 5 < 5 ? 5 : p ~/ 5;
    return _kazancIsle(d, kazanc, bugun);
  }

  /// Seçilen alana ait kurslar: 'dil' → dil, 'kod' → kod, diğer → boş.
  static List<Kurs> alanKurslari(List<Kurs> kurslar, String? alan) {
    final KursAlani hedef;
    switch (alan) {
      case 'dil':
        hedef = KursAlani.dil;
      case 'kod':
        hedef = KursAlani.kod;
      default:
        return const [];
    }
    return [
      for (final k in kurslar)
        if (k.alan == hedef) k,
    ];
  }

  /// Kart kimliğinden (dersId#indeks) alıştırmayı bulur; bulunamazsa null.
  static Alistirma? kartCoz(List<Kurs> kurslar, String kartId) {
    final ayrac = kartId.lastIndexOf('#');
    if (ayrac <= 0) return null;
    final dersId = kartId.substring(0, ayrac);
    final indeks = int.tryParse(kartId.substring(ayrac + 1));
    if (indeks == null || indeks < 0) return null;
    for (final k in kurslar) {
      final d = k.dersBul(dersId);
      if (d != null) {
        return indeks < d.alistirmalar.length ? d.alistirmalar[indeks] : null;
      }
    }
    return null;
  }

  /// Mikro ders seçimi (en çok [adet]): önce zamanı gelen tekrar kartları,
  /// kalan yerler sıradaki dersten ve tamamlanmış derslerden doldurulur.
  /// Dolgu karışıktır; mümkünse aynı türden ardışık iki alıştırma gelmez.
  /// Aynı kart iki kez gelmez. [tohum] aynıysa sonuç aynıdır.
  static List<({String kartId, Alistirma alistirma})> mikroSec(
    OgrenciDurumu d,
    List<Kurs> kurslar,
    String bugun, {
    int adet = 5,
    int tohum = 0,
  }) {
    final sonuc = <({String kartId, Alistirma alistirma})>[];
    if (adet <= 0) return sonuc;
    final alinan = <String>{};
    for (final id in tekrarBekleyen(d, bugun)) {
      if (sonuc.length >= adet) return sonuc;
      final a = kartCoz(kurslar, id);
      if (a != null && alinan.add(id)) sonuc.add((kartId: id, alistirma: a));
    }

    // Dolgu havuzu: kurslar sırasında ilk tamamlanmamış ders + tamamlanmışlar.
    final havuz = <({String kartId, Alistirma alistirma})>[];
    var siradakiBulundu = false;
    for (final k in kurslar) {
      for (final ders in k.tumDersler) {
        final bitti = (d.tamamlanan[ders.id] ?? 0) > 0;
        final al = bitti || !siradakiBulundu;
        if (!bitti) siradakiBulundu = true;
        if (!al) continue;
        for (var i = 0; i < ders.alistirmalar.length; i++) {
          final id = ders.kartKimligi(i);
          if (!alinan.contains(id)) {
            havuz.add((kartId: id, alistirma: ders.alistirmalar[i]));
          }
        }
      }
    }
    havuz.shuffle(math.Random(tohum));

    while (sonuc.length < adet && havuz.isNotEmpty) {
      final onceki = sonuc.isEmpty ? null : sonuc.last.alistirma.runtimeType;
      var i = havuz.indexWhere((h) => h.alistirma.runtimeType != onceki);
      if (i < 0) i = 0;
      final secilen = havuz.removeAt(i);
      alinan.add(secilen.kartId);
      sonuc.add(secilen);
    }
    return sonuc;
  }

  /// Leitner: doğru → kutu+1 (en çok 5), yanlış → kutu 1.
  /// Kart henüz yoksa kutu 1 kabul edilir.
  static OgrenciDurumu kartIsle(
    OgrenciDurumu d,
    String kartId,
    bool dogruMu,
    String bugun,
  ) {
    final mevcut = d.kartlar[kartId]?.kutu ?? 1;
    final kutu = dogruMu ? (mevcut + 1 > 5 ? 5 : mevcut + 1) : 1;
    final sonraki = _gunEkle(bugun, _araliklar[kutu - 1]);
    return d.copyWith(
      kartlar: {
        ...d.kartlar,
        kartId: Kart(kutu: kutu, sonraki: sonraki),
      },
    );
  }

  /// Zamanı gelen kartlar: önce en eski tarih, eşitse kimliğe göre.
  static List<String> tekrarBekleyen(OgrenciDurumu d, String bugun) {
    final liste =
        d.kartlar.entries
            .where((e) => e.value.sonraki.compareTo(bugun) <= 0)
            .toList()
          ..sort((x, y) {
            final c = x.value.sonraki.compareTo(y.value.sonraki);
            return c != 0 ? c : x.key.compareTo(y.key);
          });
    return [for (final e in liste) e.key];
  }

  /// Serbest yazı karşılaştırması için normalleştirir.
  static String _normalle(String s) {
    var r = s
        // Kıvrık kesme ve tırnak işaretleri (iOS/Android klavyeleri) düz hale getirilir.
        .replaceAll(RegExp('[\u2018\u2019\u02BC\u00B4`]'), "'")
        .replaceAll(RegExp('[\u201C\u201D]'), '"')
        .replaceAll('İ', 'i')
        .replaceAll('I', 'i')
        .replaceAll('ı', 'i')
        .toLowerCase()
        .replaceAll(RegExp(r'\s+'), ' ')
        .trim();
    // Sondaki . ! ? işaretlerini (ve aralarındaki boşlukları) at.
    r = r.replaceAll(RegExp(r'[.!?\s]+$'), '');
    return r;
  }

  static bool cevapDogruMu(Alistirma a, Object? cevap) {
    switch (a) {
      case Secim():
        return cevap is int && cevap == a.dogru;
      case Bosluk():
        return cevap is int && cevap == a.dogru;
      case Dinle():
        return cevap is int && cevap == a.dogru;
      case Kod():
        return cevap is int && cevap == a.dogru;
      case Yaz():
        if (cevap is! String) return false;
        final c = _normalle(cevap);
        if (c.isEmpty) return false;
        return a.cevaplar.any((k) => _normalle(k) == c);
      case Sirala():
        if (cevap is! List || cevap.length != a.dogru.length) return false;
        for (var i = 0; i < cevap.length; i++) {
          final e = cevap[i];
          if (e is! String || e != a.dogru[i]) return false;
        }
        return true;
      case Eslestir():
        if (cevap is! List || cevap.length != a.ciftler.length) return false;
        final kalan = List<({String sol, String sag})>.of(a.ciftler);
        for (final e in cevap) {
          if (e is! ({String sol, String sag})) return false;
          final i = kalan.indexWhere((k) => k.sol == e.sol && k.sag == e.sag);
          if (i < 0) return false;
          kalan.removeAt(i);
        }
        return kalan.isEmpty;
    }
  }
}
