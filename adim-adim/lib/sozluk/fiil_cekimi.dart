/// Fiil çekim sözlüğü (ÖZELLİK 61): sözlükte fiil maddesine dokununca zamanlara
/// göre çekim tablosu. YALNIZCA ELDE DOĞRULANMIŞ VERİ gösterilir: çekimler,
/// kurs içeriğindeki Tablo alıştırmalarının tam (doğru) satırlarından derlenir;
/// hiçbir çekim uydurulmaz ve kuralla üretilmez. Bu yüzden kapsam, derslerdeki
/// tablolarla sınırlıdır (Almanca: sein, haben, lernen, können, möchten,
/// müssen, wollen, werden ve Präteritum/Konjunktiv II tabloları; İngilizce:
/// be) ve tablolarda yer almayan kişiler gösterilmez. Kodlama, Korece,
/// Japonca ve Çince kurslarında çekim tablosu yoktur.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/icerik.dart';
import 'sozluk.dart';

/// Bir zamanın satırı: kişi (zamir) ve fiil biçimi.
typedef CekimSatiri = ({String zamir, String bicim});

/// Bir fiilin tek zamandaki çekimi.
class CekimZamani {
  const CekimZamani({required this.ad, required this.satirlar});

  /// Ör. 'Präsens', 'Präteritum', 'Konjunktiv II', 'Present'.
  final String ad;
  final List<CekimSatiri> satirlar;
}

/// Bir fiilin tüm doğrulanmış çekimleri.
class FiilCekimi {
  const FiilCekimi({
    required this.fiil,
    required this.dil,
    required this.zamanlar,
  });

  /// Mastar/sözlük biçimi, küçük harf (ör. 'sein', 'be').
  final String fiil;

  /// Sözlük dil kodu: 'de' | 'en'.
  final String dil;
  final List<CekimZamani> zamanlar;
}

class FiilCekimleri {
  FiilCekimleri._(this._harita);

  final Map<String, FiilCekimi> _harita;

  /// Çekimi olan tüm fiiller (dil, fiil sırasıyla).
  List<FiilCekimi> get hepsi {
    final l = _harita.values.toList()
      ..sort((a, b) {
        final c = a.dil.compareTo(b.dil);
        return c != 0 ? c : a.fiil.compareTo(b.fiil);
      });
    return List.unmodifiable(l);
  }

  static const List<String> _almanZamirSirasi = [
    'ich',
    'du',
    'er/sie/es',
    'wir',
    'ihr',
    'sie/Sie',
  ];
  static const List<String> _ingilizceZamirSirasi = [
    'I',
    'you',
    'he',
    'she',
    'it',
    'we',
    'they',
  ];

  static final RegExp _almanMastar = RegExp(r'^[a-zäöüß]+n$');

  /// Zamir etiketini tekilleştirir: 'er', 'sie (o)', 'er / sie / es' →
  /// 'er/sie/es'.
  static String zamirAdi(String z) {
    final t = z.trim().replaceAll(RegExp(r'\s*/\s*'), '/');
    final k = t.toLowerCase();
    if (k == 'er' || k == 'sie (o)' || k == 'er/sie/es') return 'er/sie/es';
    return t;
  }

  /// Sözlük maddesi/sözcüğü mastar anahtarına çevirir: küçük harf, sondaki
  /// "(anlam)" ve baştaki İngilizce "to " atılır.
  static String anahtar(String kelime) => kelime
      .replaceAll(RegExp(r'\s*\([^)]*\)\s*$'), '')
      .trim()
      .toLowerCase()
      .replaceFirst(RegExp(r'^to\s+'), '');

  /// Kurslardaki Tablo alıştırmalarından çekimleri derler. Aynı fiil, zaman ve
  /// kişi için tabloların verdiği ilk biçim kalır (içerik testi çelişki
  /// olmadığını doğrular).
  factory FiilCekimleri.kurslardan(List<Kurs> kurslar) {
    // dil -> fiil -> zaman -> zamir -> biçim
    final veri = <String, Map<String, Map<String, Map<String, String>>>>{};
    void ekle(String dil, String fiil, String zaman, String zamir, String b) {
      final bicim = b.trim();
      if (fiil.isEmpty || bicim.isEmpty || zamir.trim().isEmpty) return;
      ((veri[dil] ??= {})[fiil] ??= {})[zaman] ??= {};
      veri[dil]![fiil]![zaman]!.putIfAbsent(zamirAdi(zamir), () => bicim);
    }

    for (final kurs in kurslar) {
      if (kurs.alan != KursAlani.dil) continue;
      final dil = Sozluk.kursDili(kurs);
      if (dil != 'de' && dil != 'en') continue;
      for (final ders in kurs.tumDersler) {
        for (final a in ders.alistirmalar) {
          if (a is! Tablo || a.baslik.length < 2) continue;
          final b0 = a.baslik.first.trim();
          final soru = a.soru;
          if (dil == 'de' && (b0 == 'Zamir' || b0 == 'Özne')) {
            // Kişi sütunlu çekim tablosu: sütun başlığı fiilin mastarı.
            final zaman = soru.contains('Präteritum')
                ? 'Präteritum'
                : 'Präsens';
            for (var j = 1; j < a.baslik.length; j++) {
              final fiil = a.baslik[j].trim();
              // Partizip II vb. sütunlar atlanır.
              if (!_almanMastar.hasMatch(fiil)) continue;
              for (final satir in a.satirlar) {
                if (satir.length > j) {
                  ekle(dil, fiil, zaman, satir[0], satir[j]);
                }
              }
            }
          } else if (dil == 'de' &&
              b0 == 'Infinitiv' &&
              soru.contains('Konjunktiv II')) {
            for (final satir in a.satirlar) {
              final fiil = satir.first.trim().toLowerCase();
              if (!_almanMastar.hasMatch(fiil)) continue;
              for (var j = 1; j < a.baslik.length && j < satir.length; j++) {
                ekle(dil, fiil, 'Konjunktiv II', a.baslik[j], satir[j]);
              }
            }
          } else if (dil == 'de' &&
              b0 == 'Infinitiv' &&
              a.baslik.length == 2 &&
              a.baslik[1].contains('Präteritum')) {
            // Modal fiiller: 'ich / er (Präteritum)' sütunu.
            for (final satir in a.satirlar) {
              final fiil = satir.first.trim().toLowerCase();
              if (!_almanMastar.hasMatch(fiil)) continue;
              ekle(dil, fiil, 'Präteritum', 'ich/er', satir[1]);
            }
          } else if (dil == 'de' &&
              b0 == 'Infinitiv' &&
              a.baslik.length == 3 &&
              a.baslik[1] == 'Präteritum' &&
              a.baslik[2] == 'Perfekt') {
            // Temel biçimler: ich/er için Präteritum ve tablodaki Perfekt biçimi.
            for (final satir in a.satirlar) {
              final fiil = satir.first.trim().toLowerCase();
              if (!_almanMastar.hasMatch(fiil)) continue;
              ekle(dil, fiil, 'Präteritum', 'ich/er', satir[1]);
              ekle(dil, fiil, 'Perfekt', 'Perfekt biçimi', satir[2]);
            }
          } else if (dil == 'en' &&
              b0 == 'Özne' &&
              a.baslik.length == 2 &&
              a.baslik[1].trim() == 'Be fiili') {
            for (final satir in a.satirlar) {
              if (satir.length > 1) {
                ekle(dil, 'be', 'Present', satir[0], satir[1]);
              }
            }
          }
        }
      }
    }

    final harita = <String, FiilCekimi>{};
    for (final d in veri.entries) {
      final sira = d.key == 'de' ? _almanZamirSirasi : _ingilizceZamirSirasi;
      for (final f in d.value.entries) {
        final zamanlar = <CekimZamani>[];
        for (final z in f.value.entries) {
          final satirlar = [
            for (final e in z.value.entries) (zamir: e.key, bicim: e.value),
          ];
          int sirasi(String zamir) {
            final i = sira.indexOf(zamir);
            return i < 0 ? sira.length : i;
          }

          // Kararlı: bilinen sıraya göre, bilinmeyenler ekleniş sırasıyla sonda.
          final sirali = [
            for (var s = 0; s <= sira.length; s++)
              ...satirlar.where((x) => sirasi(x.zamir) == s),
          ];
          zamanlar.add(
            CekimZamani(ad: z.key, satirlar: List.unmodifiable(sirali)),
          );
        }
        const zamanSirasi = [
          'Present',
          'Präsens',
          'Präteritum',
          'Perfekt',
          'Konjunktiv II',
        ];
        zamanlar.sort(
          (a, b) =>
              zamanSirasi.indexOf(a.ad).compareTo(zamanSirasi.indexOf(b.ad)),
        );
        harita['${d.key}:${f.key}'] = FiilCekimi(
          fiil: f.key,
          dil: d.key,
          zamanlar: List.unmodifiable(zamanlar),
        );
      }
    }
    return FiilCekimleri._(Map.unmodifiable(harita));
  }

  /// Sözlük maddesinin ([dil]: 'de' | 'en') çekimi; yoksa null.
  FiilCekimi? bul(String kelime, String dil) =>
      _harita['$dil:${anahtar(kelime)}'];
}
