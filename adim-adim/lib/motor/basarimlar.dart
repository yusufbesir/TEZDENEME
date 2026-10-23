/// Başarımlar (rozetler): seri, ders, XP, tekrar, yarışma, kurs ve sertifika
/// rozetleri. [Basarimlar.hesapla] saf bir işlevdir: durumdan ve kurs
/// listesinden her rozetin ilerlemesini ve kazanılıp kazanılmadığını çıkarır.
/// Bir kez kazanılan rozet kalıcıdır (`OgrenciDurumu.rozetler`): öğrenme
/// günlüğü 200 kayıtla sınırlı olduğundan ya da günlük hedef değiştiğinden
/// rozet geri alınmaz. [Basarimlar.rozetleriIsle] yeni kazanılanları kayda
/// ekler. Ödül XP'si yoktur; rozet yalnız görünür bir başarıdır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/durum.dart';
import '../model/icerik.dart';
import 'motor.dart';

/// Tek rozetin hesaplanmış durumu.
class Basarim {
  const Basarim({
    required this.id,
    required this.ad,
    required this.aciklama,
    required this.simge,
    required this.ilerleme,
    required this.hedef,
    required this.kazanildi,
  });

  /// Kalıcı kimlik (küçük harf, rakam, alt çizgi).
  final String id;
  final String ad;

  /// Rozetin nasıl kazanıldığını anlatan kısa cümle.
  final String aciklama;

  /// Arayüzün simgeye eşlediği anahtar ('seri', 'ders', 'xp', 'tekrar',
  /// 'yarisma', 'kurs', 'sertifika', 'bilmece', 'hikaye', 'hedef', 'altin').
  final String simge;
  final int ilerleme;
  final int hedef;
  final bool kazanildi;

  /// Gösterilen ilerleme: hedefi aşsa da hedefle sınırlı.
  int get gosterilenIlerleme => ilerleme > hedef ? hedef : ilerleme;

  /// 0..1 aralığında doluluk oranı.
  double get oran => hedef <= 0 ? 1.0 : (ilerleme / hedef).clamp(0.0, 1.0);
}

abstract final class Basarimlar {
  /// "Tekrar ustası" için gereken güçlü kart sayısı (yarı ömür >= güçlü eşik).
  static const int tekrarUstasiKart = 25;

  /// Tüm rozetlerin sabit sırası (kimlik, ad, açıklama, simge, hedef).
  static const List<
    ({String id, String ad, String aciklama, String simge, int hedef})
  >
  tanimlar = [
    (
      id: 'seri_3',
      ad: '3 günlük seri',
      aciklama: 'Üst üste 3 gün çalış.',
      simge: 'seri',
      hedef: 3,
    ),
    (
      id: 'seri_7',
      ad: '7 günlük seri',
      aciklama: 'Üst üste 7 gün çalış.',
      simge: 'seri',
      hedef: 7,
    ),
    (
      id: 'seri_30',
      ad: '30 günlük seri',
      aciklama: 'Üst üste 30 gün çalış.',
      simge: 'seri',
      hedef: 30,
    ),
    (
      id: 'ilk_ders',
      ad: 'İlk adım',
      aciklama: 'İlk dersini bitir.',
      simge: 'ders',
      hedef: 1,
    ),
    (
      id: 'ders_10',
      ad: '10 ders',
      aciklama: '10 farklı ders bitir.',
      simge: 'ders',
      hedef: 10,
    ),
    (
      id: 'ders_50',
      ad: '50 ders',
      aciklama: '50 farklı ders bitir.',
      simge: 'ders',
      hedef: 50,
    ),
    (
      id: 'xp_100',
      ad: '100 XP',
      aciklama: 'Toplam 100 XP kazan.',
      simge: 'xp',
      hedef: 100,
    ),
    (
      id: 'xp_1000',
      ad: '1000 XP',
      aciklama: 'Toplam 1000 XP kazan.',
      simge: 'xp',
      hedef: 1000,
    ),
    (
      id: 'xp_5000',
      ad: '5000 XP',
      aciklama: 'Toplam 5000 XP kazan.',
      simge: 'xp',
      hedef: 5000,
    ),
    (
      id: 'ilk_tekrar',
      ad: 'İlk tekrar',
      aciklama: 'Bir tekrar oturumunu bitir.',
      simge: 'tekrar',
      hedef: 1,
    ),
    (
      id: 'tekrar_ustasi',
      ad: 'Tekrar ustası',
      aciklama: '25 kartı güçlü hâle getir.',
      simge: 'tekrar',
      hedef: tekrarUstasiKart,
    ),
    (
      id: 'mikro_ders',
      ad: 'Hızlı öğrenen',
      aciklama: 'Bir mikro ders yap.',
      simge: 'ders',
      hedef: 1,
    ),
    (
      id: 'tam_puan',
      ad: 'Tam puan',
      aciklama: 'Bir dersi hatasız bitir.',
      simge: 'xp',
      hedef: 1,
    ),
    (
      id: 'yarisma_ilk',
      ad: 'İlk galibiyet',
      aciklama: 'Bir yarışmayı başarıyla bitir.',
      simge: 'yarisma',
      hedef: 1,
    ),
    (
      id: 'gun_hedefi',
      ad: 'Hedefe ulaştın',
      aciklama: 'Bir günde günlük XP hedefini tamamla.',
      simge: 'hedef',
      hedef: 1,
    ),
    (
      id: 'bilmece',
      ad: 'Bilmece çözücü',
      aciklama: 'Günün bilmecesini doğru çöz.',
      simge: 'bilmece',
      hedef: 1,
    ),
    (
      id: 'ilk_hikaye',
      ad: 'Hikâye meraklısı',
      aciklama: 'Bir okuma hikâyesini bitir.',
      simge: 'hikaye',
      hedef: 1,
    ),
    (
      id: 'altin_unite',
      ad: 'Altın ünite',
      aciklama: 'Bir ünitenin efsanevi tekrarını geç.',
      simge: 'altin',
      hedef: 1,
    ),
    (
      id: 'kurs_bitir',
      ad: 'Kurs bitirdin',
      aciklama: 'Bir kursun bütün derslerini bitir.',
      simge: 'kurs',
      hedef: 1,
    ),
    (
      id: 'sertifika',
      ad: 'Sertifikalı',
      aciklama: 'Bir seviye sertifika sınavını geç.',
      simge: 'sertifika',
      hedef: 1,
    ),
  ];

  /// Rozet sayısı.
  static int get toplam => tanimlar.length;

  static int _dersSayisi(OgrenciDurumu d) =>
      d.tamamlanan.values.where((v) => v > 0).length;

  static bool _gunlukVar(OgrenciDurumu d, String tur) =>
      d.gunluk.any((k) => k.tur == tur);

  static bool _kursBitmis(OgrenciDurumu d, Kurs k) {
    final dersler = k.tumDersler.toList();
    return dersler.isNotEmpty &&
        dersler.every((x) => Motor.dersBitmis(d, x.id));
  }

  /// Her rozetin ilerlemesi (hedefe oranla). Bool koşullar 0/1 döner.
  static int _ilerleme(String id, OgrenciDurumu d, List<Kurs> kurslar) {
    int bir(bool b) => b ? 1 : 0;
    switch (id) {
      case 'seri_3':
      case 'seri_7':
      case 'seri_30':
        return d.enSeri > d.seri ? d.enSeri : d.seri;
      case 'ilk_ders':
      case 'ders_10':
      case 'ders_50':
        return _dersSayisi(d);
      case 'xp_100':
      case 'xp_1000':
      case 'xp_5000':
        return d.xp;
      case 'ilk_tekrar':
        return bir(_gunlukVar(d, GunlukKayit.turTekrar));
      case 'tekrar_ustasi':
        return d.kartlar.values
            .where((k) => k.yariOmurGun >= Kart.gucluEsik)
            .length;
      case 'mikro_ders':
        return bir(_gunlukVar(d, GunlukKayit.turMikro));
      case 'tam_puan':
        return bir(d.dersEnIyi.values.any((v) => v >= 100));
      case 'yarisma_ilk':
        return bir(
          d.gunluk.any(
            (k) =>
                k.tur == GunlukKayit.turYarisma &&
                k.toplam > 0 &&
                !Motor.basarisizMi(k.dogru, k.toplam),
          ),
        );
      case 'gun_hedefi':
        return bir(d.gunlukXp.values.any((v) => v > 0 && v >= d.gunlukHedef));
      case 'bilmece':
        return bir(d.bilmece?.dogru == true);
      case 'ilk_hikaye':
        return bir(d.tamamlananHikayeler.values.any((v) => v > 0));
      case 'altin_unite':
        return bir(d.altinUniteler.isNotEmpty);
      case 'kurs_bitir':
        return bir(kurslar.any((k) => _kursBitmis(d, k)));
      case 'sertifika':
        return bir(kurslar.any((k) => Motor.sertifikaVar(d, k)));
    }
    return 0;
  }

  /// Bütün rozetlerin durumu (sabit sırada). Daha önce kazanılıp
  /// `d.rozetler`e yazılmış rozet, güncel ilerleme düşse bile kazanılmış kalır.
  static List<Basarim> hesapla(OgrenciDurumu d, List<Kurs> kurslar) => [
    for (final t in tanimlar)
      Basarim(
        id: t.id,
        ad: t.ad,
        aciklama: t.aciklama,
        simge: t.simge,
        ilerleme: _ilerleme(t.id, d, kurslar),
        hedef: t.hedef,
        kazanildi:
            d.rozetler.contains(t.id) || _ilerleme(t.id, d, kurslar) >= t.hedef,
      ),
  ];

  /// Hesaplamaya göre kazanılmış ama henüz kayda geçmemiş rozet kimlikleri.
  static Set<String> yeniKazanilan(OgrenciDurumu d, List<Kurs> kurslar) => {
    for (final b in hesapla(d, kurslar))
      if (b.kazanildi && !d.rozetler.contains(b.id)) b.id,
  };

  /// Yeni kazanılan rozetleri kalıcı kayda ekler; yeni rozet yoksa aynı
  /// durum nesnesi döner.
  static OgrenciDurumu rozetleriIsle(OgrenciDurumu d, List<Kurs> kurslar) {
    final yeni = yeniKazanilan(d, kurslar);
    if (yeni.isEmpty) return d;
    return d.copyWith(rozetler: Set.unmodifiable({...d.rozetler, ...yeni}));
  }

  /// Kazanılmış rozet sayısı.
  static int kazanilanSayisi(List<Basarim> liste) =>
      liste.where((b) => b.kazanildi).length;
}
