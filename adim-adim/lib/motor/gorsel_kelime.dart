/// Görsel kelime kartları ve konu oyunları (ÖZELLİK 58). Kelimeye basit bir
/// Unicode emoji eşlenir; görsel varlık üretilmez. Eşleme YALNIZ doğru
/// eşleştirilebilen kelimelerde yapılır: tablo hem kelimeyi hem Türkçe
/// anlamını sabitler ("bed" + "yatak"); sözlükteki kelime aynı yazılsa da
/// anlamı tabloda yoksa (ör. "back" + "sırt") görsel verilmez. Tablo dil
/// başına bölünmüştür; yeni dil için yalnız o dilin listesi eklenir.
/// Eski emoji sürümlerinde (Windows'ta çıkmayabilir) görünmeyen simgelerden
/// kaçınıldı; ZWJ dizileri kullanılmaz.
///
/// Konu kategorileri tablodadır. Kelime havuzu sözlükten ([Sozluk]) ve ünite
/// paketlerinden ([Sozluk.paketler], ÖZELLİK 23) gelir: konu ve paket
/// süzgeçleri birlikte kullanılabilir. Oyunlar (dokun-eşleştir, kaydır) kart
/// aralıklarını (SRS), hata defterini ve XP'yi DEĞİŞTİRMEZ; ceza yoktur.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:math' as math;

import '../model/icerik.dart';
import '../sozluk/sozluk.dart';

/// Konu kategorisi: kısa kod, görünen ad ve simge.
typedef GorselKonu = ({String kod, String ad, String simge});

/// Konu kategorileri (sıra ekran sırasıdır).
const List<GorselKonu> gorselKonular = [
  (kod: 'yiyecek', ad: 'Yiyecek ve içecek', simge: '🍽️'),
  (kod: 'hayvan', ad: 'Hayvanlar', simge: '🐾'),
  (kod: 'aile', ad: 'Aile ve insanlar', simge: '👪'),
  (kod: 'ev', ad: 'Ev ve eşyalar', simge: '🏠'),
  (kod: 'renk', ad: 'Renkler', simge: '🎨'),
  (kod: 'sayi', ad: 'Sayılar', simge: '🔢'),
  (kod: 'hava', ad: 'Hava ve doğa', simge: '🌤️'),
  (kod: 'seyahat', ad: 'Seyahat ve şehir', simge: '✈️'),
  (kod: 'beden', ad: 'Vücut ve sağlık', simge: '🩺'),
];

/// Tablo satırı: kelime, kabul edilen Türkçe anlamlar, emoji, konu.
typedef _Giris = (String, List<String>, String, String);

/// İngilizce ('en') kelimeler.
const List<_Giris> _en = [
  // Yiyecek ve içecek
  ('bread', ['ekmek'], '🍞', 'yiyecek'),
  ('cheese', ['peynir'], '🧀', 'yiyecek'),
  ('milk', ['süt'], '🥛', 'yiyecek'),
  ('juice', ['meyve suyu'], '🥤', 'yiyecek'),
  ('tea', ['çay'], '🍵', 'yiyecek'),
  ('coffee', ['kahve'], '☕', 'yiyecek'),
  ('rice', ['pirinç'], '🍚', 'yiyecek'),
  ('apple', ['elma'], '🍎', 'yiyecek'),
  ('egg', ['yumurta'], '🥚', 'yiyecek'),
  ('menu', ['menü'], '🍽️', 'yiyecek'),
  ('water', ['su'], '💧', 'yiyecek'),
  // Hayvanlar
  ('cat', ['kedi'], '🐱', 'hayvan'),
  ('dog', ['köpek'], '🐶', 'hayvan'),
  ('bird', ['kuş'], '🐦', 'hayvan'),
  ('fish', ['balık'], '🐟', 'hayvan'),
  ('horse', ['at'], '🐴', 'hayvan'),
  ('cow', ['inek'], '🐄', 'hayvan'),
  ('rabbit', ['tavşan'], '🐰', 'hayvan'),
  ('mouse', ['fare'], '🐭', 'hayvan'),
  ('lion', ['aslan'], '🦁', 'hayvan'),
  ('elephant', ['fil'], '🐘', 'hayvan'),
  ('bear', ['ayı'], '🐻', 'hayvan'),
  ('sheep', ['koyun'], '🐑', 'hayvan'),
  ('pig', ['domuz'], '🐷', 'hayvan'),
  ('duck', ['ördek'], '🦆', 'hayvan'),
  ('monkey', ['maymun'], '🐒', 'hayvan'),
  ('chicken', ['tavuk'], '🐔', 'hayvan'),
  ('snake', ['yılan'], '🐍', 'hayvan'),
  ('frog', ['kurbağa'], '🐸', 'hayvan'),
  ('butterfly', ['kelebek'], '🦋', 'hayvan'),
  ('bee', ['arı'], '🐝', 'hayvan'),
  // Aile ve insanlar
  ('mother', ['anne'], '👩', 'aile'),
  ('father', ['baba'], '👨', 'aile'),
  ('brother', ['erkek kardeş'], '👦', 'aile'),
  ('sister', ['kız kardeş'], '👧', 'aile'),
  ('grandmother', ['büyükanne'], '👵', 'aile'),
  ('grandfather', ['büyükbaba'], '👴', 'aile'),
  ('baby', ['bebek'], '👶', 'aile'),
  ('child', ['çocuk'], '🧒', 'aile'),
  ('man', ['adam'], '👨', 'aile'),
  ('woman', ['kadın'], '👩', 'aile'),
  ('boy', ['erkek çocuk'], '👦', 'aile'),
  ('girl', ['kız çocuk'], '👧', 'aile'),
  ('doctor', ['doktor'], '🩺', 'aile'),
  // Ev ve eşyalar
  ('house', ['ev'], '🏠', 'ev'),
  ('bed', ['yatak'], '🛏️', 'ev'),
  ('bedroom', ['yatak odası'], '🛌', 'ev'),
  ('bathroom', ['banyo'], '🛁', 'ev'),
  ('kitchen', ['mutfak'], '🍳', 'ev'),
  ('garden', ['bahçe'], '🏡', 'ev'),
  ('door', ['kapı'], '🚪', 'ev'),
  ('key', ['anahtar'], '🔑', 'ev'),
  ('book', ['kitap'], '📖', 'ev'),
  ('screen', ['ekran'], '🖥️', 'ev'),
  // Renkler
  ('red', ['kırmızı'], '🔴', 'renk'),
  ('blue', ['mavi'], '🔵', 'renk'),
  ('black', ['siyah'], '⚫', 'renk'),
  ('white', ['beyaz'], '⚪', 'renk'),
  ('green', ['yeşil'], '💚', 'renk'),
  ('yellow', ['sarı'], '💛', 'renk'),
  ('orange', ['turuncu'], '🧡', 'renk'),
  ('purple', ['mor'], '💜', 'renk'),
  // Sayılar
  ('one', ['bir'], '1️⃣', 'sayi'),
  ('two', ['iki'], '2️⃣', 'sayi'),
  ('three', ['üç'], '3️⃣', 'sayi'),
  ('four', ['dört'], '4️⃣', 'sayi'),
  ('five', ['beş'], '5️⃣', 'sayi'),
  ('six', ['altı'], '6️⃣', 'sayi'),
  ('seven', ['yedi'], '7️⃣', 'sayi'),
  ('eight', ['sekiz'], '8️⃣', 'sayi'),
  ('nine', ['dokuz'], '9️⃣', 'sayi'),
  ('ten', ['on'], '🔟', 'sayi'),
  // Hava ve doğa
  ('sunny', ['güneşli'], '☀️', 'hava'),
  ('rainy', ['yağmurlu'], '🌧️', 'hava'),
  ('cloudy', ['bulutlu'], '☁️', 'hava'),
  ('snowy', ['karlı'], '❄️', 'hava'),
  ('windy', ['rüzgârlı', 'rüzgarlı'], '💨', 'hava'),
  ('sun', ['güneş'], '🌞', 'hava'),
  ('rain', ['yağmur'], '🌧️', 'hava'),
  ('snow', ['kar'], '❄️', 'hava'),
  ('moon', ['ay'], '🌙', 'hava'),
  ('star', ['yıldız'], '⭐', 'hava'),
  ('night', ['gece'], '🌙', 'hava'),
  ('morning', ['sabah'], '🌅', 'hava'),
  ('evening', ['akşam'], '🌆', 'hava'),
  ('tree', ['ağaç'], '🌳', 'hava'),
  ('flower', ['çiçek'], '🌸', 'hava'),
  ('sea', ['deniz'], '🌊', 'hava'),
  ('mountain', ['dağ'], '⛰️', 'hava'),
  // Seyahat ve şehir
  ('passport', ['pasaport'], '🛂', 'seyahat'),
  ('ticket', ['bilet'], '🎫', 'seyahat'),
  ('luggage', ['bagaj'], '🧳', 'seyahat'),
  ('shop', ['mağaza'], '🏪', 'seyahat'),
  ('car', ['araba'], '🚗', 'seyahat'),
  ('bus', ['otobüs'], '🚌', 'seyahat'),
  ('train', ['tren'], '🚆', 'seyahat'),
  ('plane', ['uçak'], '✈️', 'seyahat'),
  ('bicycle', ['bisiklet'], '🚲', 'seyahat'),
  ('hotel', ['otel'], '🏨', 'seyahat'),
  ('bank', ['banka'], '🏦', 'seyahat'),
  ('money', ['para'], '💰', 'seyahat'),
  ('price', ['fiyat'], '🏷️', 'seyahat'),
  // Vücut ve sağlık
  ('tooth', ['diş'], '🦷', 'beden'),
  ('hand', ['el'], '✋', 'beden'),
  ('eye', ['göz'], '👁️', 'beden'),
  ('ear', ['kulak'], '👂', 'beden'),
  ('nose', ['burun'], '👃', 'beden'),
  ('mouth', ['ağız'], '👄', 'beden'),
  ('heart', ['kalp'], '❤️', 'beden'),
];

/// Almanca ('de') kelimeler (sözlükte artikelli yazılır).
const List<_Giris> _de = [
  ('das Brot', ['ekmek'], '🍞', 'yiyecek'),
  ('der Käse', ['peynir'], '🧀', 'yiyecek'),
  ('die Milch', ['süt'], '🥛', 'yiyecek'),
  ('das Wasser', ['su'], '💧', 'yiyecek'),
  ('der Apfel', ['elma'], '🍎', 'yiyecek'),
  ('der Hund', ['köpek'], '🐶', 'hayvan'),
  ('die Katze', ['kedi'], '🐱', 'hayvan'),
  ('der Vogel', ['kuş'], '🐦', 'hayvan'),
  ('die Mutter', ['anne'], '👩', 'aile'),
  ('der Vater', ['baba'], '👨', 'aile'),
  ('der Bruder', ['erkek kardeş'], '👦', 'aile'),
  ('die Schwester', ['kız kardeş'], '👧', 'aile'),
  ('die Eltern', ['anne baba'], '👪', 'aile'),
  ('das Kind', ['çocuk'], '🧒', 'aile'),
  ('der Mann', ['adam'], '👨', 'aile'),
  ('die Frau', ['kadın'], '👩', 'aile'),
  ('der Arzt', ['doktor'], '🩺', 'aile'),
  ('das Buch', ['kitap'], '📖', 'ev'),
  ('das Haus', ['ev'], '🏠', 'ev'),
  ('der Müll', ['çöp'], '🗑️', 'ev'),
  ('die Nachrichten', ['haberler'], '📰', 'ev'),
  ('das Auto', ['araba'], '🚗', 'seyahat'),
  ('der Bahnhof', ['tren istasyonu'], '🚉', 'seyahat'),
  ('die Fahrkarte', ['bilet'], '🎫', 'seyahat'),
  ('das Fieber', ['ateş'], '🌡️', 'beden'),
];

/// Dil kodu -> tablo. Yeni dil için yalnız buraya bir liste eklenir.
const Map<String, List<_Giris>> _tablolar = {'en': _en, 'de': _de};

/// Görsel eşlemesi olan bir sözlük kelimesi.
class GorselKelime {
  const GorselKelime({
    required this.dil,
    required this.kelime,
    required this.anlam,
    required this.emoji,
    required this.konu,
    required this.kartId,
    required this.kursId,
    this.uniteId,
  });

  final String dil;
  final String kelime;
  final String anlam;
  final String emoji;

  /// [gorselKonular] kodlarından biri.
  final String konu;

  /// Kaynak alıştırmanın kart kimliği (`dersId#indeks`).
  final String kartId;
  final String kursId;

  /// Kelimenin geldiği ünite (paket süzgeci); bilinmiyorsa null.
  final String? uniteId;
}

/// Kaydır oyunu kartı: görsel + kelime + önerilen anlam; [dogruMu] öneri doğru mu.
class KaydirKarti {
  const KaydirKarti({
    required this.kelime,
    required this.onerilen,
    required this.dogruMu,
  });

  final GorselKelime kelime;
  final String onerilen;
  final bool dogruMu;
}

abstract final class GorselKelimeler {
  /// Tablo arama anahtarı: dil + normalize kelime -> girişler.
  static final Map<String, List<({List<String> anlamlar, _Giris giris})>>
  _dizin = () {
    final m = <String, List<({List<String> anlamlar, _Giris giris})>>{};
    for (final e in _tablolar.entries) {
      for (final g in e.value) {
        (m['${e.key}\u0000${Sozluk.normalize(g.$1)}'] ??= []).add((
          anlamlar: [for (final a in g.$2) Sozluk.normalize(a)],
          giris: g,
        ));
      }
    }
    return m;
  }();

  /// Tüm eşleme tablosu (denetim ve testler için): dil, kelime, kabul edilen
  /// anlamlar, emoji ve konu.
  static List<
    ({
      String dil,
      String kelime,
      List<String> anlamlar,
      String emoji,
      String konu,
    })
  >
  get tablo => [
    for (final e in _tablolar.entries)
      for (final g in e.value)
        (dil: e.key, kelime: g.$1, anlamlar: g.$2, emoji: g.$3, konu: g.$4),
  ];

  /// Tabloda görseli olan dil kodları.
  static List<String> get diller => _tablolar.keys.toList();

  /// Kelime ve anlam tabloyla eşleşiyorsa (emoji, konu); aksi halde null.
  /// Anlam eşleşmesi tam ve büyük/küçük harf ile Türkçe harf duyarsızdır.
  static ({String emoji, String konu})? eslesme(
    String dil,
    String kelime,
    String anlam,
  ) {
    final l = _dizin['$dil\u0000${Sozluk.normalize(kelime)}'];
    if (l == null) return null;
    final a = Sozluk.normalize(anlam);
    for (final x in l) {
      if (x.anlamlar.contains(a)) {
        return (emoji: x.giris.$3, konu: x.giris.$4);
      }
    }
    return null;
  }

  /// Sözlük maddelerinden görseli olanlar. Yalnız [kurslar]daki kurslardan
  /// gelenler alınır; ünite bilgisi [Sozluk.paketler] ile eklenir. Aynı dil +
  /// kelime + anlam tek kez; sıra sözlük sırasıdır.
  static List<GorselKelime> havuz(Sozluk sozluk, List<Kurs> kurslar) {
    final kursKimlikleri = {for (final k in kurslar) k.id};
    final uniteOf = <String, String>{};
    for (final p in sozluk.paketler(kurslar)) {
      for (final m in p.maddeler) {
        uniteOf[m.kartKimligi] = p.uniteId;
      }
    }
    final gorulen = <String>{};
    final sonuc = <GorselKelime>[];
    for (final m in sozluk.maddeler) {
      if (!kursKimlikleri.contains(m.kursId)) continue;
      final e = eslesme(m.dil, m.kelime, m.anlam);
      if (e == null) continue;
      if (!gorulen.add(
        '${m.dil}\u0000${Sozluk.normalize(m.kelime)}\u0000'
        '${Sozluk.normalize(m.anlam)}',
      )) {
        continue;
      }
      sonuc.add(
        GorselKelime(
          dil: m.dil,
          kelime: m.kelime,
          anlam: m.anlam,
          emoji: e.emoji,
          konu: e.konu,
          kartId: m.kartKimligi,
          kursId: m.kursId,
          uniteId: uniteOf[m.kartKimligi],
        ),
      );
    }
    return sonuc;
  }

  /// Havuzda en az bir kelimesi olan konular ve kelime sayıları ([gorselKonular]
  /// sırasıyla).
  static List<({GorselKonu konu, int adet})> konular(List<GorselKelime> havuz) {
    final sonuc = <({GorselKonu konu, int adet})>[];
    for (final k in gorselKonular) {
      final n = havuz.where((g) => g.konu == k.kod).length;
      if (n > 0) sonuc.add((konu: k, adet: n));
    }
    return sonuc;
  }

  /// Konu (ve/veya ünite paketi) süzgeci; null süzgeç uygulanmaz.
  static List<GorselKelime> suz(
    List<GorselKelime> havuz, {
    String? konu,
    String? uniteId,
  }) => [
    for (final g in havuz)
      if ((konu == null || g.konu == konu) &&
          (uniteId == null || g.uniteId == uniteId))
        g,
  ];

  /// Dokun-eşleştir turu: en çok [adet] kelime; görsel ve kelime kendi içinde
  /// tekrarsız (belirsiz eşleşme olmaz). [enAz]'dan azsa boş liste.
  static List<GorselKelime> eslestirmeTuru(
    List<GorselKelime> havuz, {
    int tohum = 0,
    int adet = 5,
    int enAz = 3,
  }) {
    final karisik = [...havuz]..shuffle(math.Random(tohum));
    final emojiler = <String>{};
    final kelimeler = <String>{};
    final sonuc = <GorselKelime>[];
    for (final g in karisik) {
      if (sonuc.length >= adet) break;
      if (emojiler.contains(g.emoji) || kelimeler.contains(g.kelime)) continue;
      emojiler.add(g.emoji);
      kelimeler.add(g.kelime);
      sonuc.add(g);
    }
    return sonuc.length < enAz ? const [] : sonuc;
  }

  /// Kaydır turu: en çok [adet] kart; yarısı (yukarı yuvarlanır) doğru, yarısı
  /// yanlış anlam önerir, sıra karışıktır. En az 2 farklı anlam gerekir;
  /// yoksa boş liste.
  static List<KaydirKarti> kaydirTuru(
    List<GorselKelime> havuz, {
    int tohum = 0,
    int adet = 10,
  }) {
    final anlamlar = {for (final g in havuz) Sozluk.normalize(g.anlam)};
    if (anlamlar.length < 2) return const [];
    final rnd = math.Random(tohum);
    final secilen = ([...havuz]..shuffle(rnd)).take(adet).toList();
    final sonuc = <KaydirKarti>[];
    for (var i = 0; i < secilen.length; i++) {
      final g = secilen[i];
      if (i.isEven) {
        sonuc.add(KaydirKarti(kelime: g, onerilen: g.anlam, dogruMu: true));
        continue;
      }
      final yanlis = [
        for (final x in havuz)
          if (Sozluk.normalize(x.anlam) != Sozluk.normalize(g.anlam)) x.anlam,
      ];
      sonuc.add(
        KaydirKarti(
          kelime: g,
          onerilen: yanlis[rnd.nextInt(yanlis.length)],
          dogruMu: false,
        ),
      );
    }
    return sonuc..shuffle(rnd);
  }
}
