/// Ders sonu tekrar öğeleri (ÖZELLİK 62): bir dersin alıştırmalarından
/// türetilen (saklanmaz) kelime/terim, kalıp ve fiil/sözdizimi öğeleri.
/// Türetme: Eşleştir çiftleri (kelime; "to ..." ile başlayan sol fiil; üç
/// kelimeden uzun sol kalıp), "X ne demektir?" seçimi (kelime), Dinle okunacak
/// ve Söyle metni (tek kelime kelime, değilse kalıp), Yaz ilk cevabı, Sırala
/// doğru dizilimi, Boşluk/Kod doldurulmuş hâli (kalıp; kod kursunda Kod
/// sözdizimi) ve Tablo boş hücreleri (dil: fiil, kod: sözdizimi).
/// Her öğe, geldiği alıştırmanın kart kimliğini taşır; "Kartlara ekle" o kartı
/// ekler (Motor.kartEkle).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/icerik.dart';

/// Öğenin sekmesi. Dil kurslarında kelime/kalıp/fiil, kod kurslarında
/// terim/kalıp/söz dizimi.
enum OgeTuru { kelime, kalip, fiil }

class DersOgesi {
  const DersOgesi({
    required this.tur,
    required this.metin,
    this.anlam,
    required this.kartId,
    this.sesDili,
  });

  final OgeTuru tur;
  final String metin;
  final String? anlam;

  /// Geldiği alıştırmanın kart kimliği (dersId#indeks).
  final String kartId;

  /// Sesli okuma dili; null: sesli okuma yok (kod/oyun kursları).
  final String? sesDili;
}

class DersOgeleri {
  const DersOgeleri(this.ogeler, {required this.kodMu});

  final List<DersOgesi> ogeler;
  final bool kodMu;

  bool get bos => ogeler.isEmpty;

  List<DersOgesi> tureGore(OgeTuru t) => [
    for (final o in ogeler)
      if (o.tur == t) o,
  ];

  /// Sekme başlığı (dil: Kelime/Kalıp/Fiil; kod: Terim/Kalıp/Söz dizimi).
  String baslik(OgeTuru t) => switch (t) {
    OgeTuru.kelime => kodMu ? 'Terim' : 'Kelime',
    OgeTuru.kalip => 'Kalıp',
    OgeTuru.fiil => kodMu ? 'Söz dizimi' : 'Fiil',
  };

  /// Kurs kimliğinden varsayılan okuma dili ('ingilizce-1' -> 'en-US').
  static String kursSesDili(String kursId) {
    final k = kursId.toLowerCase();
    if (k.startsWith('almanca')) return 'de-DE';
    if (k.startsWith('fransizca')) return 'fr-FR';
    if (k.startsWith('korece')) return 'ko-KR';
    if (k.startsWith('japonca')) return 'ja-JP';
    if (k.startsWith('cince')) return 'zh-CN';
    return varsayilanSesDili;
  }

  static final RegExp _neDemektir = RegExp(r'^"([^"]+)" ne demektir\?$');

  static String _doldur(String metin, String cevap) =>
      metin.replaceFirst(RegExp(r'_{3,}'), cevap).trim();

  static int _kelimeSayisi(String s) =>
      s.trim().split(RegExp(r'\s+')).where((k) => k.isNotEmpty).length;

  /// [ders] için öğeleri türetir. [alan] kod/oyunsa sesli okuma dili null
  /// kalır; dil kurslarında [kursSesDili] (ya da alıştırmanın kendi dili).
  static DersOgeleri uret(
    Ders ders, {
    required KursAlani alan,
    String varsayilanDil = varsayilanSesDili,
  }) {
    final kodKursu = alan != KursAlani.dil;
    final ogeler = <DersOgesi>[];
    final gorulen = <String>{};

    void ekle(
      OgeTuru tur,
      String metin,
      String? anlam,
      int indeks, {
      String? dil,
    }) {
      metin = metin.trim();
      final a = anlam?.trim();
      if (metin.isEmpty) return;
      if (!gorulen.add('${tur.name}\u0000$metin\u0000${a ?? ''}')) return;
      ogeler.add(
        DersOgesi(
          tur: tur,
          metin: metin,
          anlam: (a == null || a.isEmpty) ? null : a,
          kartId: ders.kartKimligi(indeks),
          sesDili: kodKursu ? null : (dil ?? varsayilanDil),
        ),
      );
    }

    OgeTuru kelimeMiKalip(String s) =>
        _kelimeSayisi(s) <= 2 ? OgeTuru.kelime : OgeTuru.kalip;

    for (var i = 0; i < ders.alistirmalar.length; i++) {
      final a = ders.alistirmalar[i];
      switch (a) {
        case Eslestir(:final ciftler):
          for (final c in ciftler) {
            final sol = c.sol.trim();
            final tur = (!kodKursu && sol.toLowerCase().startsWith('to '))
                ? OgeTuru.fiil
                : (_kelimeSayisi(sol) > 3 ? OgeTuru.kalip : OgeTuru.kelime);
            ekle(tur, sol, c.sag, i);
          }
        case Secim(:final soru, :final secenekler, :final dogru):
          final e = _neDemektir.firstMatch(soru.trim());
          if (e != null && dogru >= 0 && dogru < secenekler.length) {
            ekle(OgeTuru.kelime, e.group(1)!, secenekler[dogru], i);
          }
        case Dinle(:final okunacak, :final dil):
          ekle(kelimeMiKalip(okunacak), okunacak, null, i, dil: dil);
        case Soyle(:final metin, :final ceviri, :final dil):
          ekle(kelimeMiKalip(metin), metin, ceviri, i, dil: dil);
        case Yaz(:final soru, :final cevaplar):
          if (cevaplar.isNotEmpty) {
            ekle(kelimeMiKalip(cevaplar.first), cevaplar.first, soru, i);
          }
        case Sirala(:final dogru):
          if (dogru.length > 1) ekle(OgeTuru.kalip, dogru.join(' '), null, i);
        case Bosluk(:final soru, :final secenekler, :final dogru):
          if (dogru >= 0 && dogru < secenekler.length && soru.contains('___')) {
            ekle(OgeTuru.kalip, _doldur(soru, secenekler[dogru]), null, i);
          }
        case Kod(:final kod, :final secenekler, :final dogru):
          if (dogru >= 0 && dogru < secenekler.length && kod.contains('___')) {
            // Kod kursunda doldurulmuş kod satırı söz dizimidir.
            ekle(OgeTuru.fiil, _doldur(kod, secenekler[dogru]), null, i);
          }
        case KodYaz(:final kod, :final cevaplar):
          if (cevaplar.isNotEmpty && kod.contains('___')) {
            ekle(OgeTuru.fiil, _doldur(kod, cevaplar.first), null, i);
          }
        case Tablo(:final baslik, :final satirlar, :final bos):
          for (final b in bos) {
            if (b.satir < 0 ||
                b.satir >= satirlar.length ||
                b.sutun < 0 ||
                b.sutun >= satirlar[b.satir].length) {
              continue;
            }
            final satir = satirlar[b.satir];
            final hucre = satir[b.sutun];
            final metin = b.sutun > 0 && satir.first.trim().isNotEmpty
                ? '${satir.first} $hucre'
                : hucre;
            final anlam = b.sutun < baslik.length ? baslik[b.sutun] : null;
            ekle(OgeTuru.fiil, metin, anlam, i);
          }
        default:
          break;
      }
    }
    return DersOgeleri(List.unmodifiable(ogeler), kodMu: kodKursu);
  }
}
