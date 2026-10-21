/// Öğrenme motoru: XP, seviye, esnek seri ve haftalık hedef, yarı ömür tabanlı
/// aralıklı tekrar, hata defteri, öğrenme günlüğü, serpiştirilmiş ünite
/// tekrarı, kelime notları, kademeli ipucu, cevap kontrolü, ders sonu kısa
/// quiz ve günün bilmecesi.
/// Saf Dart; Flutter'a bağımlı değildir. Tüm işlevler yan etkisizdir.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla.
library;

import 'dart:math' as math;

import '../model/durum.dart';
import '../model/icerik.dart';
import '../yarisma/model.dart';

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
    final b = bugun ?? Motor.bugun();
    final fark = gunFarki(sonGun, b);
    if (fark < 0) return 0;
    if (fark <= 1) return d.seri;
    return _seriKopmadi(d, sonGun, b) ? d.seri : 0;
  }

  /// Günün haftasının Pazartesi'si 'YYYY-MM-DD'; geçersiz günde aynı metin.
  static String haftaBaslangici(String gun) {
    final t = _gunCoz(gun);
    if (t == null) return gun;
    final r = t.subtract(Duration(days: t.weekday - DateTime.monday));
    return _bicim(r.year, r.month, r.day);
  }

  /// [bugun] gününün haftasında (Pazartesi başlangıç) XP kazanılan gün sayısı.
  /// Ayrı sayaç tutulmaz; `gunlukXp`ten hesaplanır, bu yüzden eski kayıtlarda da çalışır.
  static int haftaGunSayisi(OgrenciDurumu d, String bugun) {
    if (!OgrenciDurumu.gunGecerli(bugun)) return 0;
    final pzt = haftaBaslangici(bugun);
    var n = 0;
    for (final e in d.gunlukXp.entries) {
      if (e.value <= 0) continue;
      final f = gunFarki(pzt, e.key);
      if (f >= 0 && f <= 6) n++;
    }
    return n;
  }

  /// Esnek seri: [sonGun] ile [bugun] arasında 1 günden uzun ara varsa seri
  /// yalnızca son çalışılan haftada hedef gün sayısı tutulmuşsa ve bugün aynı
  /// ya da hemen sonraki haftadaysa kopmaz (araya tam boş hafta girmemiş olur).
  static bool _seriKopmadi(OgrenciDurumu d, String sonGun, String bugun) {
    if (haftaGunSayisi(d, sonGun) < d.haftalikHedefGun) return false;
    final hafta = gunFarki(haftaBaslangici(sonGun), haftaBaslangici(bugun));
    return hafta == 0 || hafta == 7;
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
    } else if (son != null &&
        gunFarki(son, bugun) > 1 &&
        _seriKopmadi(d, son, bugun)) {
      yeniSeri = d.seri + 1; // haftalık hedef tutuldu: günlük ara seriyi bozmaz
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

  /// Ders bitişi: XP/seri, `tamamlanan`, `sonDersId` ve günlüğe 'ders' kaydı.
  static OgrenciDurumu dersBitir(
    OgrenciDurumu d,
    String dersId,
    int dogru,
    int toplam,
    String bugun,
  ) {
    final xp = dersXp(dogru, toplam);
    final yeni = _kazancIsle(d, xp, bugun).copyWith(
      tamamlanan: {...d.tamamlanan, dersId: (d.tamamlanan[dersId] ?? 0) + 1},
      sonDersId: dersId,
    );
    return gunlukEkle(
      yeni,
      GunlukKayit(
        gun: bugun,
        tur: GunlukKayit.turDers,
        id: dersId,
        dogru: dogru,
        toplam: toplam,
        xp: xp,
      ),
    );
  }

  /// Günlüğe kayıt ekler; liste en çok [GunlukKayit.enCok] kayıt tutar, en
  /// eskisi düşer. Günü geçersiz kayıt eklenmez (durum değişmeden döner).
  static OgrenciDurumu gunlukEkle(OgrenciDurumu d, GunlukKayit k) {
    if (!OgrenciDurumu.gunGecerli(k.gun)) return d;
    final liste = [...d.gunluk, k];
    final kes = liste.length > GunlukKayit.enCok
        ? liste.sublist(liste.length - GunlukKayit.enCok)
        : liste;
    return d.copyWith(gunluk: List.unmodifiable(kes));
  }

  /// Verilen günün günlük özeti: kayıt sayısı (ders + mikro + tekrar +
  /// yarışma + quiz + bilmece), doğru/toplam ve XP toplamları. Kayıt yoksa
  /// sıfırlar.
  static ({int dersler, int dogru, int toplam, int xp}) gunlukOzeti(
    OgrenciDurumu d,
    String gun,
  ) {
    var dersler = 0, dogru = 0, toplam = 0, xp = 0;
    for (final k in d.gunluk) {
      if (k.gun != gun) continue;
      dersler++;
      dogru += k.dogru;
      toplam += k.toplam;
      xp += k.xp;
    }
    return (dersler: dersler, dogru: dogru, toplam: toplam, xp: xp);
  }

  /// Günlükte kayıt bulunan günler, en yeni önce, tekrarsız.
  static List<String> gunlukGunleri(OgrenciDurumu d) {
    final gunler = <String>{for (final k in d.gunluk) k.gun}.toList()
      ..sort((a, b) => b.compareTo(a));
    return gunler;
  }

  /// Tekrar oturumu bitişi: XP değişmez (kartlar kartIsle ile işlenir);
  /// günlüğe tek 'tekrar' kaydı eklenir. Toplam 0 ise kayıt eklenmez.
  static OgrenciDurumu tekrarBitir(
    OgrenciDurumu d,
    int dogru,
    int toplam,
    String bugun,
  ) {
    if (toplam <= 0) return d;
    final t = toplam;
    final dg = dogru < 0 ? 0 : (dogru > t ? t : dogru);
    return gunlukEkle(
      d,
      GunlukKayit(gun: bugun, tur: GunlukKayit.turTekrar, dogru: dg, toplam: t),
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

  /// Mikro ders bitişi: XP, seri ve günlük XP güncellenir; `tamamlanan`
  /// değişmez. Günlüğe 'mikro' kaydı eklenir.
  static OgrenciDurumu mikroBitir(
    OgrenciDurumu d,
    int dogru,
    int toplam,
    String bugun,
  ) {
    final xp = mikroXp(dogru, toplam);
    return gunlukEkle(
      _kazancIsle(d, xp, bugun),
      GunlukKayit(
        gun: bugun,
        tur: GunlukKayit.turMikro,
        dogru: dogru,
        toplam: toplam,
        xp: xp,
      ),
    );
  }

  /// Ders sonu kısa quizin soru sayısı.
  static const int quizAdet = 3;

  /// Kısa quiz seçimi: [ders]in alıştırmalarından en çok [adet] tane. Önce bu
  /// oturumda yanlış yapılan indeksler ([yanlislar], verilen sırayla, geçersiz
  /// ve yinelenenler atlanır), kalan yer dersin diğer alıştırmalarından indeks
  /// sırasıyla doldurulur. Ders [adet]ten az alıştırmaysa hepsi gelir.
  static List<({String kartId, Alistirma alistirma})> quizSec(
    Ders ders,
    List<int> yanlislar, {
    int adet = quizAdet,
  }) {
    final sonuc = <({String kartId, Alistirma alistirma})>[];
    if (adet <= 0) return sonuc;
    final alinan = <int>{};
    void al(int i) {
      if (sonuc.length >= adet) return;
      if (i < 0 || i >= ders.alistirmalar.length) return;
      if (!alinan.add(i)) return;
      sonuc.add((kartId: ders.kartKimligi(i), alistirma: ders.alistirmalar[i]));
    }

    for (final i in yanlislar) {
      al(i);
    }
    for (var i = 0; i < ders.alistirmalar.length; i++) {
      al(i);
    }
    return sonuc;
  }

  /// '0,3,5' biçimindeki yanlış indeks listesini çözer; bozuk parçalar atlanır.
  static List<int> yanlisListesiCoz(String? metin) {
    if (metin == null || metin.trim().isEmpty) return const [];
    return [
      for (final p in metin.split(','))
        if (int.tryParse(p.trim()) case final i? when i >= 0) i,
    ];
  }

  /// Kısa quizin kazandıracağı XP: doğru başına 1 (3 doğru = +3). Küçük tutulur;
  /// quiz dersin kart (SRS) durumunu değiştirmez, yalnızca pekiştirir.
  static int quizXp(int dogru, int toplam) {
    final t = toplam < 0 ? 0 : toplam;
    return dogru < 0 ? 0 : (dogru > t ? t : dogru);
  }

  /// Kısa quiz bitişi: XP/seri işlenir (kartlar ve `tamamlanan` değişmez),
  /// günlüğe 'quiz' kaydı (id = dersId) eklenir. Toplam 0 ise durum değişmez.
  static OgrenciDurumu quizBitir(
    OgrenciDurumu d,
    String dersId,
    int dogru,
    int toplam,
    String bugun,
  ) {
    if (toplam <= 0) return d;
    final xp = quizXp(dogru, toplam);
    return gunlukEkle(
      _kazancIsle(d, xp, bugun),
      GunlukKayit(
        gun: bugun,
        tur: GunlukKayit.turQuiz,
        id: dersId,
        dogru: quizXp(dogru, toplam),
        toplam: toplam,
        xp: xp,
      ),
    );
  }

  /// Okuma hikâyesinin kazandıracağı XP: doğru başına 2 + bilinmeyen kelime
  /// sayısı kadar bonus (öğrenilen kelime), en çok [hikayeEnCokXp].
  static const int hikayeEnCokXp = 15;
  static int hikayeXp(int dogru, int toplam, int bilinmeyen) {
    final t = toplam < 0 ? 0 : toplam;
    final dg = dogru < 0 ? 0 : (dogru > t ? t : dogru);
    final bonus = bilinmeyen < 0 ? 0 : bilinmeyen;
    final xp = dg * 2 + bonus;
    return xp > hikayeEnCokXp ? hikayeEnCokXp : xp;
  }

  /// Kelime ön testi sonucu: bilinen / toplam, yüzde (0..100, yuvarlanmış).
  /// Toplam 0 ise 0.
  static int kelimeBilgisiYuzde(int bilinen, int toplam) {
    if (toplam <= 0) return 0;
    final b = bilinen < 0 ? 0 : (bilinen > toplam ? toplam : bilinen);
    return (b * 100 / toplam).round();
  }

  /// Hikâye bitişi: XP/seri işlenir (kartlar, `tamamlanan` ve `sonDersId`
  /// değişmez), `tamamlananHikayeler[id]` bir artar, günlüğe 'hikaye' kaydı
  /// (id = hikâye kimliği) eklenir. Toplam 0 ise durum değişmez.
  static OgrenciDurumu hikayeBitir(
    OgrenciDurumu d,
    String hikayeId,
    int dogru,
    int toplam,
    int bilinmeyen,
    String bugun,
  ) {
    if (toplam <= 0) return d;
    final xp = hikayeXp(dogru, toplam, bilinmeyen);
    final dg = dogru < 0 ? 0 : (dogru > toplam ? toplam : dogru);
    final yeni = _kazancIsle(d, xp, bugun).copyWith(
      tamamlananHikayeler: {
        ...d.tamamlananHikayeler,
        hikayeId: (d.tamamlananHikayeler[hikayeId] ?? 0) + 1,
      },
    );
    return gunlukEkle(
      yeni,
      GunlukKayit(
        gun: bugun,
        tur: GunlukKayit.turHikaye,
        id: hikayeId,
        dogru: dg,
        toplam: toplam,
        xp: xp,
      ),
    );
  }

  /// Günün bilmecesinin doğru cevaba XP'si.
  static const int bilmeceXp = 2;

  /// FNV-1a (32 bit) benzeri basit, platformdan bağımsız metin özeti
  /// (Sozluk.gununKelimesi ile aynı kalıp); deterministik günlük seçimlerde.
  static int metinOzeti(String s) {
    var h = 0x811c9dc5;
    for (final r in s.runes) {
      h ^= r;
      h = (h * 0x01000193) & 0xffffffff;
    }
    return h;
  }

  /// Günün bilmecesi: [kurslar]daki tüm Secim alıştırmaları arasından [bugun]
  /// metninin özetiyle deterministik seçilen tek soru; Secim yoksa null.
  static ({String kartId, Secim secim})? bilmeceSec(
    List<Kurs> kurslar,
    String bugun,
  ) {
    final havuz = <({String kartId, Secim secim})>[];
    for (final k in kurslar) {
      for (final ders in k.tumDersler) {
        for (var i = 0; i < ders.alistirmalar.length; i++) {
          final a = ders.alistirmalar[i];
          if (a is Secim) havuz.add((kartId: ders.kartKimligi(i), secim: a));
        }
      }
    }
    if (havuz.isEmpty) return null;
    return havuz[metinOzeti(bugun.trim()) % havuz.length];
  }

  /// Bugünün bilmecesi henüz cevaplanmadıysa true.
  static bool bilmeceCevaplanabilir(OgrenciDurumu d, String bugun) =>
      d.bilmece?.gun != bugun;

  /// Günün bilmecesini cevaplar: aynı gün ikinci cevap reddedilir (durum
  /// değişmez). Doğruda +[bilmeceXp] XP ve seri işlenir; yanlışta XP yok.
  /// Her iki durumda günlüğe 'bilmece' kaydı (dogru 0/1, toplam 1) eklenir
  /// ve `bilmece` alanı güne yazılır. Kartlar değişmez.
  static OgrenciDurumu bilmeceCevapla(
    OgrenciDurumu d,
    bool dogruMu,
    String bugun,
  ) {
    if (!OgrenciDurumu.gunGecerli(bugun)) return d;
    if (!bilmeceCevaplanabilir(d, bugun)) return d;
    final xp = dogruMu ? bilmeceXp : 0;
    final temel = dogruMu ? _kazancIsle(d, xp, bugun) : d;
    return gunlukEkle(
      temel.copyWith(
        bilmece: BilmeceDurumu(gun: bugun, dogru: dogruMu),
      ),
      GunlukKayit(
        gun: bugun,
        tur: GunlukKayit.turBilmece,
        dogru: dogruMu ? 1 : 0,
        toplam: 1,
        xp: xp,
      ),
    );
  }

  /// Yarışma bitişi: XP = max(5, puan ~/ 5); negatif puan 0 sayılır.
  /// Seri ve günlük XP güncellenir; `tamamlanan` değişmez. Günlüğe 'yarisma'
  /// kaydı eklenir ([dogru]/[toplam] verilmezse 0/0, [kategori] varsa id).
  /// [yanlisSorular]: oyunda yanlış bilinen sorular; hata defterine işlenir.
  static OgrenciDurumu yarismaBitir(
    OgrenciDurumu d,
    int puan,
    String bugun, {
    List<YarismaSorusu> yanlisSorular = const [],
    int dogru = 0,
    int toplam = 0,
    String? kategori,
  }) {
    final p = puan < 0 ? 0 : puan;
    final kazanc = p ~/ 5 < 5 ? 5 : p ~/ 5;
    var yeni = gunlukEkle(
      _kazancIsle(d, kazanc, bugun),
      GunlukKayit(
        gun: bugun,
        tur: GunlukKayit.turYarisma,
        id: kategori,
        dogru: dogru < 0 ? 0 : dogru,
        toplam: toplam < 0 ? 0 : toplam,
        xp: kazanc,
      ),
    );
    for (final s in yanlisSorular) {
      yeni = hataEkle(
        yeni,
        HataKaydi(
          tur: HataKaydi.turYarisma,
          id: s.id,
          kategori: s.kategori.kimlik,
          seviye: s.seviyeKursId,
          gun: bugun,
        ),
      );
    }
    return yeni;
  }

  /// Hata defterine kayıt ekler. Aynı tür+kimlik varsa eskisi düşer (yenisi
  /// sona gelir); liste en çok [HataKaydi.enCok] kayıt tutar, en eskisi düşer.
  static OgrenciDurumu hataEkle(OgrenciDurumu d, HataKaydi h) {
    final liste = [
      for (final e in d.hatalar)
        if (!(e.tur == h.tur && e.id == h.id)) e,
      h,
    ];
    final kes = liste.length > HataKaydi.enCok
        ? liste.sublist(liste.length - HataKaydi.enCok)
        : liste;
    return d.copyWith(hatalar: List.unmodifiable(kes));
  }

  /// Son 7 günün (bugün dahil) kart hatalarının kart kimlikleri, en yeni
  /// hata önce, tekrarsız. "Zayıf noktalar" mikro dersinin öncelikli kartları.
  static List<String> zayifKartlar(OgrenciDurumu d, String bugun) {
    final sonuc = <String>[];
    for (final h in d.hatalar.reversed) {
      if (h.tur != HataKaydi.turKart) continue;
      final fark = gunFarki(h.gun, bugun);
      if (fark < 0 || fark > 6) continue;
      if (!sonuc.contains(h.id)) sonuc.add(h.id);
    }
    return sonuc;
  }

  /// Kelime sağlığı: yalnız verilen kursların kartları, yarı ömre göre üç
  /// küme. Zayıf: < [Kart.ortaEsik]; orta: [Kart.ortaEsik]..[Kart.gucluEsik]
  /// (sınırlar dahil); güçlü: > [Kart.gucluEsik]. Her küme kimliğe göre sıralı.
  static ({List<String> zayif, List<String> orta, List<String> guclu})
  kelimeSagligi(OgrenciDurumu d, List<Kurs> kurslar) {
    final zayif = <String>[];
    final orta = <String>[];
    final guclu = <String>[];
    final anahtarlar = d.kartlar.keys.toList()..sort();
    for (final id in anahtarlar) {
      if (kartCoz(kurslar, id) == null) continue;
      final yo = d.kartlar[id]!.yariOmurGun;
      if (yo < Kart.ortaEsik) {
        zayif.add(id);
      } else if (yo <= Kart.gucluEsik) {
        orta.add(id);
      } else {
        guclu.add(id);
      }
    }
    return (zayif: zayif, orta: orta, guclu: guclu);
  }

  static final _dersKimligi = RegExp(r'^(.+?)[.\-]u(\d+)[.\-]d(\d+)$');

  /// Ders kimliğindeki ünite numarası: 'ingilizce-1.u2.d1' ve 'html-1-u2-d1'
  /// için 2; tanınmayan biçimde null.
  static int? uniteNo(String dersId) {
    final m = _dersKimligi.firstMatch(dersId);
    return m == null ? null : int.tryParse(m.group(2)!);
  }

  /// Ders kimliğindeki kurs kimliği ('ingilizce-1.u1.d1' -> 'ingilizce-1');
  /// tanınmayan biçimde null.
  static String? kursKimligi(String dersId) =>
      _dersKimligi.firstMatch(dersId)?.group(1);

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
  /// [oncelikliKartlar] (ör. hata defterindeki zayıf noktalar) verilirse bu
  /// kartlar, çözülebiliyorsa, zamanı gelen kartlardan bile önce gelir.
  static List<({String kartId, Alistirma alistirma})> mikroSec(
    OgrenciDurumu d,
    List<Kurs> kurslar,
    String bugun, {
    int adet = 5,
    int tohum = 0,
    List<String> oncelikliKartlar = const [],
  }) {
    final sonuc = <({String kartId, Alistirma alistirma})>[];
    if (adet <= 0) return sonuc;
    final alinan = <String>{};
    for (final id in oncelikliKartlar) {
      if (sonuc.length >= adet) return sonuc;
      final a = kartCoz(kurslar, id);
      if (a != null && alinan.add(id)) sonuc.add((kartId: id, alistirma: a));
    }
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

  /// Kartı elle tekrar kümesine ekler (ör. sözlükten "Kartlara ekle"):
  /// yarı ömür en az değerde, sonraki tekrar bugün; böylece hemen sorulur.
  /// Kart zaten varsa durum değişmeden döner.
  static OgrenciDurumu kartEkle(OgrenciDurumu d, String kartId, String bugun) {
    if (d.kartlar.containsKey(kartId)) return d;
    return d.copyWith(
      kartlar: {
        ...d.kartlar,
        kartId: Kart(
          kutu: Kart.kutuHesapla(Kart.enAzYariOmur),
          sonraki: bugun,
          yariOmurGun: Kart.enAzYariOmur,
        ),
      },
    );
  }

  /// Kelimeye kişisel not yazar. [metin] null ya da (kırpılmış) boşsa not
  /// silinir; uzun metin [OgrenciDurumu.notEnCokKarakter] karaktere kısaltılır.
  /// Yeni not eklenirken toplam [OgrenciDurumu.notEnCok] aşılacaksa durum
  /// değişmeden döner (mevcut notu güncellemek her zaman serbesttir).
  static OgrenciDurumu notYaz(OgrenciDurumu d, String kartId, String? metin) {
    final kirpik = metin?.trim() ?? '';
    if (kirpik.isEmpty) {
      if (!d.kelimeNotlari.containsKey(kartId)) return d;
      final kalan = {...d.kelimeNotlari}..remove(kartId);
      return d.copyWith(kelimeNotlari: Map.unmodifiable(kalan));
    }
    if (!d.kelimeNotlari.containsKey(kartId) &&
        d.kelimeNotlari.length >= OgrenciDurumu.notEnCok) {
      return d;
    }
    final kisa = kirpik.length > OgrenciDurumu.notEnCokKarakter
        ? kirpik.substring(0, OgrenciDurumu.notEnCokKarakter).trimRight()
        : kirpik;
    return d.copyWith(
      kelimeNotlari: Map.unmodifiable({...d.kelimeNotlari, kartId: kisa}),
    );
  }

  /// Kademeli ipucu sayısı: genel, hataya özel, çözüm.
  static const int ipucuAdimSayisi = 3;

  /// Kademeli ipucu. [adim] 0: genel ipucu (açıklamanın ilk cümlesi, yoksa
  /// türe göre sabit metin); 1: hataya özel (uzunluk, ilk/son harf, bir yanlış
  /// seçeneği eleme, ilk kelime); 2 ve üstü: çözüm (doğru cevap).
  /// [Alistirma.ipuclari] doluysa önce onlar sırayla verilir, sonra çözüm.
  static String ipucuUret(Alistirma a, int adim) {
    final n = adim < 0 ? 0 : adim;
    final ozel = a.ipuclari;
    if (ozel.isNotEmpty) {
      if (n < ozel.length && n < ipucuAdimSayisi - 1) return ozel[n];
      return 'Çözüm: ${dogruCevapMetni(a)}';
    }
    switch (n) {
      case 0:
        return _genelIpucu(a);
      case 1:
        return _ozelIpucu(a);
      default:
        return 'Çözüm: ${dogruCevapMetni(a)}';
    }
  }

  /// Yanlış cevapta gösterilecek doğru cevap metni (alıştırma türüne göre).
  static String dogruCevapMetni(Alistirma a) => switch (a) {
    Secim() => a.secenekler[a.dogru],
    Bosluk() => a.secenekler[a.dogru],
    Dinle() => a.secenekler[a.dogru],
    Kod() => a.secenekler[a.dogru],
    Soyle() => a.metin,
    Yaz() => a.cevaplar.isEmpty ? '' : a.cevaplar.first,
    Sirala() => a.dogru.join(' '),
    Eslestir() => a.ciftler.map((c) => '${c.sol} = ${c.sag}').join('; '),
  };

  /// Adım 0: açıklamanın ilk cümlesi; yoksa türe göre sabit metin.
  static String _genelIpucu(Alistirma a) {
    final aciklama = a.aciklama?.trim();
    if (aciklama != null && aciklama.isNotEmpty) {
      final m = RegExp(r'^.*?[.!?](?=\s|$)').firstMatch(aciklama);
      return m?.group(0) ?? aciklama;
    }
    return switch (a) {
      Secim() => 'Seçenekleri ele: açıkça yanlış olanları çıkar',
      Bosluk() => 'Boşluğun önündeki ve sonrasındaki kelimeye bak',
      Yaz() =>
        a.cevaplar.isEmpty || a.cevaplar.first.isEmpty
            ? 'Cevabı yazmayı dene'
            : 'İlk harfi: ${a.cevaplar.first[0]}',
      Sirala() => 'Cümle büyük harfle başlar, noktalama ile biter',
      Eslestir() => 'Bildiklerini önce eşle',
      Dinle() => 'Bir kez daha dinle, sonra yaz',
      Kod() => 'Söz dizimini kontrol et',
      Soyle() => 'Önce dinle, sonra yavaş ve net söyle',
    };
  }

  /// Adım 1: hataya özel ipucu.
  static String _ozelIpucu(Alistirma a) {
    String uzunlukVeHarf(String c) {
      if (c.isEmpty) return 'Cevabı yazmayı dene';
      if (c.length == 1) return 'Tek harf: $c';
      return '${c.length} harf, "${c[0]}" ile başlar, '
          '"${c[c.length - 1]}" ile biter';
    }

    String yanlisEle(List<String> secenekler, int dogru) {
      for (var i = 0; i < secenekler.length; i++) {
        if (i != dogru) return '"${secenekler[i]}" değil';
      }
      return 'Tek seçenek doğru';
    }

    return switch (a) {
      Yaz() => uzunlukVeHarf(a.cevaplar.isEmpty ? '' : a.cevaplar.first),
      Bosluk() => uzunlukVeHarf(a.secenekler[a.dogru]),
      Secim() => yanlisEle(a.secenekler, a.dogru),
      Dinle() => yanlisEle(a.secenekler, a.dogru),
      Kod() => yanlisEle(a.secenekler, a.dogru),
      Soyle() => 'İlk kelime: ${a.metin.split(' ').first}',
      Sirala() =>
        a.dogru.isEmpty
            ? 'Cümle büyük harfle başlar, noktalama ile biter'
            : 'İlk kelime: ${a.dogru.first}',
      Eslestir() =>
        a.ciftler.isEmpty
            ? 'Bildiklerini önce eşle'
            : 'Bir çift: ${a.ciftler.first.sol} = ${a.ciftler.first.sag}',
    };
  }

  /// Yarı ömür (Settles & Meeder 2016, basitleştirilmiş): doğruda yarı ömür x2
  /// (en çok 180 gün), yanlışta /2 (en az 0,5 gün). Sonraki tekrar = bugün +
  /// yarı ömür (tam sayıya yuvarlanır, en az 1 gün). Kart henüz yoksa yarı ömür
  /// 1 gün kabul edilir. `kutu` yarı ömürden türetilen 1..5 göstergedir.
  /// Yanlış cevap ayrıca hata defterine yazılır.
  static OgrenciDurumu kartIsle(
    OgrenciDurumu d,
    String kartId,
    bool dogruMu,
    String bugun,
  ) {
    final mevcut = d.kartlar[kartId]?.yariOmurGun ?? 1.0;
    final ham = dogruMu ? mevcut * 2 : mevcut / 2;
    final yariOmur = ham < Kart.enAzYariOmur
        ? Kart.enAzYariOmur
        : (ham > Kart.enCokYariOmur ? Kart.enCokYariOmur : ham);
    final aralik = yariOmur.round() < 1 ? 1 : yariOmur.round();
    final yeni = d.copyWith(
      kartlar: {
        ...d.kartlar,
        kartId: Kart(
          kutu: Kart.kutuHesapla(yariOmur),
          sonraki: _gunEkle(bugun, aralik),
          yariOmurGun: yariOmur,
          sonCevap: dogruMu,
        ),
      },
    );
    if (dogruMu) return yeni;
    final ayrac = kartId.lastIndexOf('#');
    final dersId = ayrac > 0 ? kartId.substring(0, ayrac) : kartId;
    return hataEkle(
      yeni,
      HataKaydi(
        tur: HataKaydi.turKart,
        id: kartId,
        seviye: kursKimligi(dersId) ?? '',
        gun: bugun,
      ),
    );
  }

  /// Serpiştirilmiş ünite tekrarı: [dersId] kendi ünitesinin son dersiyse ve
  /// aynı kursta önceki üniteler varsa, onlardan karışık [adet] alıştırma
  /// seçer; aksi halde boş liste. Seçimde türler serpiştirilir (az kullanılan
  /// tür önce, ardışık aynı tür yok) ve sıra [tohum]'a bağlıdır.
  static List<({String kartId, Alistirma alistirma})> serpistirmeSec(
    List<Kurs> kurslar,
    String dersId, {
    int adet = 5,
    int tohum = 0,
  }) {
    final sonuc = <({String kartId, Alistirma alistirma})>[];
    if (adet <= 0) return sonuc;
    for (final kurs in kurslar) {
      final n = kurs.uniteler.indexWhere(
        (u) => u.dersler.isNotEmpty && u.dersler.last.id == dersId,
      );
      if (n < 0) continue;
      // Önceki üniteler: ders kimliğinden okunan ünite numarası küçük olanlar;
      // numara okunamazsa sıra indeksine düşülür.
      final no = uniteNo(dersId) ?? (n + 1);
      final havuz = <({String kartId, Alistirma alistirma})>[];
      for (var i = 0; i < kurs.uniteler.length; i++) {
        final u = kurs.uniteler[i];
        final uNo = u.dersler.isEmpty ? null : uniteNo(u.dersler.first.id);
        final onceki = uNo != null ? uNo < no : i < n;
        if (!onceki) continue;
        for (final ders in u.dersler) {
          for (var k = 0; k < ders.alistirmalar.length; k++) {
            havuz.add((
              kartId: ders.kartKimligi(k),
              alistirma: ders.alistirmalar[k],
            ));
          }
        }
      }
      havuz.shuffle(math.Random(tohum));
      final turSayisi = <String, int>{};
      while (sonuc.length < adet && havuz.isNotEmpty) {
        final onceki = sonuc.isEmpty ? null : sonuc.last.alistirma.tur;
        var en = -1;
        var enAz = 1 << 30;
        for (var i = 0; i < havuz.length; i++) {
          final tur = havuz[i].alistirma.tur;
          if (tur == onceki) continue;
          final c = turSayisi[tur] ?? 0;
          if (c < enAz) {
            enAz = c;
            en = i;
          }
        }
        if (en < 0) en = 0; // yalnız aynı tür kaldı
        final secilen = havuz.removeAt(en);
        turSayisi.update(
          secilen.alistirma.tur,
          (c) => c + 1,
          ifAbsent: () => 1,
        );
        sonuc.add(secilen);
      }
      return sonuc;
    }
    return sonuc;
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

  /// Açılışta "bekleyen tekrar" bildirimi gösterilmeli mi? Gösterilecek
  /// sayıyı, gösterilmemeliyse null döndürür: ayar kapalıysa, bugün bekleyen
  /// kart yoksa ya da bildirim bugün zaten gösterildiyse null (günde en çok
  /// bir kez). Saf işlevdir; servis çağrısı sağlayıcıda yapılır.
  static int? tekrarBildirimiGerekli(OgrenciDurumu d, String bugun) {
    if (!d.tekrarBildirimiAcik) return null;
    if (d.sonTekrarBildirimGunu == bugun) return null;
    final sayi = tekrarBekleyen(d, bugun).length;
    return sayi > 0 ? sayi : null;
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
      case Soyle():
        return cevap == true;
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
