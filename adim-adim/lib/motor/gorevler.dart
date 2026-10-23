/// Günlük ve haftalık görevler (Görevler sekmesi). Hepsi saf işlevdir:
/// ilerleme mevcut durumdan HESAPLANIR (günlük XP, öğrenme günlüğü, bilmece,
/// bekleyen tekrar kartı); ayrı sayaç tutulmaz. Tek kalıcı kayıt, ödülü
/// alınmış görevlerin anahtarlarıdır (`OgrenciDurumu.alinanGorevler`).
/// Ödül sabit XP'dir (rastgele ödül, reklam, ücret yok); yalnız toplam XP'ye
/// eklenir, günlük XP'ye eklenmez (böylece "XP kazan" görevi kendini
/// beslemez). Günlük görevler günün kayıtlarından, haftalık görevler
/// Pazartesi'den başlayan haftanın kayıtlarından sayılır; günlük en çok 200
/// kayıt tuttuğundan, bir günde/haftada bundan fazla kayıt sayılmaz.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/durum.dart';
import 'motor.dart';

/// Tek bir görev: kimlik, metin, ilerleme/hedef ve sabit XP ödülü.
class Gorev {
  const Gorev({
    required this.id,
    required this.anahtar,
    required this.baslik,
    required this.ayrinti,
    required this.ilerleme,
    required this.hedef,
    required this.odulXp,
    required this.haftalik,
    this.rota,
  });

  /// Kısa kimlik ('ders', 'xp', 'tekrar', 'mikro', 'bilmece', 'hafta_gun' ...).
  final String id;

  /// Ödül kaydı anahtarı: 'g:YYYY-MM-DD|id' ya da 'h:PazartesiGünü|id'.
  final String anahtar;
  final String baslik;
  final String ayrinti;
  final int ilerleme;
  final int hedef;
  final int odulXp;
  final bool haftalik;

  /// Görevi yapmaya götüren rota (varsa); ekran düğmesi kullanır.
  final String? rota;

  bool get tamam => ilerleme >= hedef;

  /// 0..1 aralığında doluluk oranı.
  double get oran => hedef <= 0 ? 1.0 : (ilerleme / hedef).clamp(0.0, 1.0);

  /// Gösterilen ilerleme: hedefi aşsa da hedefle sınırlı.
  int get gosterilenIlerleme => ilerleme > hedef ? hedef : ilerleme;
}

abstract final class Gorevler {
  /// Günlük görev ödülleri (sabit XP).
  static const int dersOdul = 10;
  static const int xpOdul = 10;
  static const int tekrarOdul = 10;
  static const int mikroOdul = 5;
  static const int bilmeceOdul = 5;

  /// Haftalık görev ödülleri ve hedefleri (sabit XP).
  static const int haftaGunOdul = 30;
  static const int haftaDersOdul = 25;
  static const int haftaDersHedef = 5;
  static const int haftaXpOdul = 25;

  /// Haftalık XP hedefi, günlük hedefin bu kadar katıdır (en az 100 XP).
  static const int haftaXpCarpan = 4;

  /// Günlük hedef XP'si ne olursa olsun görev hedefi için alt sınır.
  static const int enAzXpHedefi = 10;

  static int _sayGun(OgrenciDurumu d, String gun, String tur) {
    var n = 0;
    for (final k in d.gunluk) {
      if (k.gun == gun && k.tur == tur) n++;
    }
    return n;
  }

  /// [bugun] gününün haftasında (Pazartesi başlangıç) biten 'ders' kayıtları.
  static int _haftaDers(OgrenciDurumu d, String bugun) {
    final pzt = Motor.haftaBaslangici(bugun);
    var n = 0;
    for (final k in d.gunluk) {
      if (k.tur != GunlukKayit.turDers) continue;
      final f = Motor.gunFarki(pzt, k.gun);
      if (f >= 0 && f <= 6) n++;
    }
    return n;
  }

  /// Haftanın (Pazartesi'den başlayan) toplam XP'si.
  static int haftaXp(OgrenciDurumu d, String bugun) {
    if (!OgrenciDurumu.gunGecerli(bugun)) return 0;
    final pzt = Motor.haftaBaslangici(bugun);
    var n = 0;
    for (final e in d.gunlukXp.entries) {
      final f = Motor.gunFarki(pzt, e.key);
      if (f >= 0 && f <= 6) n += e.value;
    }
    return n;
  }

  /// Haftalık XP görevinin hedefi: günlük hedefin 4 katı (en az 100).
  static int haftaXpHedefi(OgrenciDurumu d) {
    final h = d.gunlukHedef * haftaXpCarpan;
    return h < 100 ? 100 : h;
  }

  /// Bugünün görevleri. [bekleyenTekrar]: seçili alandaki zamanı gelmiş
  /// kart sayısı; tekrar görevi yalnız bekleyen kart varsa ya da bugün tekrar
  /// yapılmışsa listelenir (yapılacak iş yokken görev göstermemek için).
  static List<Gorev> gunluk(
    OgrenciDurumu d,
    String bugun, {
    int bekleyenTekrar = 0,
  }) {
    if (!OgrenciDurumu.gunGecerli(bugun)) return const [];
    final xp = d.gunlukXp[bugun] ?? 0;
    final xpHedef = d.gunlukHedef < enAzXpHedefi ? enAzXpHedefi : d.gunlukHedef;
    final tekrar = _sayGun(d, bugun, GunlukKayit.turTekrar);
    return [
      Gorev(
        id: 'ders',
        anahtar: 'g:$bugun|ders',
        baslik: 'Bir ders bitir',
        ayrinti: 'Yoldan bir ders tamamla.',
        ilerleme: _sayGun(d, bugun, GunlukKayit.turDers),
        hedef: 1,
        odulXp: dersOdul,
        haftalik: false,
        rota: '/yol',
      ),
      Gorev(
        id: 'xp',
        anahtar: 'g:$bugun|xp',
        baslik: '$xpHedef XP kazan',
        ayrinti: 'Günlük hedefine ulaş.',
        ilerleme: xp,
        hedef: xpHedef,
        odulXp: xpOdul,
        haftalik: false,
        rota: '/yol',
      ),
      if (bekleyenTekrar > 0 || tekrar > 0)
        Gorev(
          id: 'tekrar',
          anahtar: 'g:$bugun|tekrar',
          baslik: 'Tekrar kartlarını bitir',
          ayrinti: bekleyenTekrar > 0
              ? '$bekleyenTekrar kart seni bekliyor.'
              : 'Bugünkü tekrarı bitirdin.',
          ilerleme: tekrar,
          hedef: 1,
          odulXp: tekrarOdul,
          haftalik: false,
          rota: '/tekrar',
        ),
      Gorev(
        id: 'mikro',
        anahtar: 'g:$bugun|mikro',
        baslik: 'Mikro ders yap',
        ayrinti: '2 dakikalık kısa bir ders.',
        ilerleme: _sayGun(d, bugun, GunlukKayit.turMikro),
        hedef: 1,
        odulXp: mikroOdul,
        haftalik: false,
        rota: '/mikro',
      ),
      Gorev(
        id: 'bilmece',
        anahtar: 'g:$bugun|bilmece',
        baslik: 'Günün bilmecesini çöz',
        ayrinti: 'Yol sekmesindeki bilmeceyi cevapla.',
        ilerleme: d.bilmece?.gun == bugun ? 1 : 0,
        hedef: 1,
        odulXp: bilmeceOdul,
        haftalik: false,
        rota: '/yol',
      ),
    ];
  }

  /// Bu haftanın görevleri.
  static List<Gorev> haftalik(OgrenciDurumu d, String bugun) {
    if (!OgrenciDurumu.gunGecerli(bugun)) return const [];
    final pzt = Motor.haftaBaslangici(bugun);
    final xpHedef = haftaXpHedefi(d);
    return [
      Gorev(
        id: 'hafta_gun',
        anahtar: 'h:$pzt|hafta_gun',
        baslik: 'Haftada ${d.haftalikHedefGun} gün çalış',
        ayrinti: 'Haftalık hedefin: ${d.haftalikHedefGun} gün.',
        ilerleme: Motor.haftaGunSayisi(d, bugun),
        hedef: d.haftalikHedefGun,
        odulXp: haftaGunOdul,
        haftalik: true,
      ),
      Gorev(
        id: 'hafta_ders',
        anahtar: 'h:$pzt|hafta_ders',
        baslik: 'Bu hafta $haftaDersHedef ders bitir',
        ayrinti: 'Yoldan dersler tamamla.',
        ilerleme: _haftaDers(d, bugun),
        hedef: haftaDersHedef,
        odulXp: haftaDersOdul,
        haftalik: true,
        rota: '/yol',
      ),
      Gorev(
        id: 'hafta_xp',
        anahtar: 'h:$pzt|hafta_xp',
        baslik: 'Bu hafta $xpHedef XP kazan',
        ayrinti: 'Haftalık XP hedefi.',
        ilerleme: haftaXp(d, bugun),
        hedef: xpHedef,
        odulXp: haftaXpOdul,
        haftalik: true,
        rota: '/yol',
      ),
    ];
  }

  /// Görevin ödülü alınmış mı?
  static bool alindi(OgrenciDurumu d, Gorev g) =>
      d.alinanGorevler.contains(g.anahtar);

  /// Ödül alınabilir mi: görev tamam ve ödül daha önce alınmamış.
  static bool alinabilir(OgrenciDurumu d, Gorev g) => g.tamam && !alindi(d, g);

  /// Ödülü verir: sabit XP toplam XP'ye eklenir (günlük XP'ye eklenmez) ve
  /// anahtar kaydedilir. Görev tamam değilse ya da ödül zaten alınmışsa durum
  /// değişmeden döner (çift ödül yok).
  static OgrenciDurumu odulAl(OgrenciDurumu d, Gorev g) {
    if (!alinabilir(d, g)) return d;
    return d.copyWith(
      xp: d.xp + g.odulXp,
      alinanGorevler: Set.unmodifiable(
        OgrenciDurumu.gorevAnahtarlariKirp({...d.alinanGorevler, g.anahtar}),
      ),
    );
  }

  /// Günlük görevlerden tamamlanan sayısı.
  static int tamamSayisi(List<Gorev> liste) =>
      liste.where((g) => g.tamam).length;
}
