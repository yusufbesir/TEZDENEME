/// Gömülü sözlük: kurs içeriğindeki eşleştirme çiftlerinden ve
/// `"X" ne demektir?` biçimli seçim sorularından üretilen kelime/anlam
/// listesi. Saf Dart; Flutter bağımlılığı yoktur (testi kolay olsun).
/// Arama büyük/küçük harf ve Türkçe harf (İ/ı/ş/ğ/ü/ö/ç) duyarsızdır;
/// İngilizce maddelerde köke göre de eşleşir ("went" → "go"). Sıra:
/// başlangıç eşleşmeleri, sonra sıklık (sık kelimeler önce), sonra alfabetik.
/// Ünite bazlı kelime paketleri ve tarihe göre deterministik "günün kelimesi"
/// de buradan üretilir.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/icerik.dart';
import 'kok.dart';
import 'siklik.dart';

/// Tek bir sözlük maddesi. `dil`: 'en' (İngilizce), 'ko' (Korece), 'ja'
/// (Japonca), 'zh' (Çince) ya da 'kod' (HTML/CSS/JS).
class SozlukMaddesi {
  const SozlukMaddesi({
    required this.kelime,
    required this.anlam,
    required this.dil,
    required this.kursId,
    required this.dersId,
    required this.alistirmaIndeksi,
    this.kok = '',
    this.siklik,
  });

  final String kelime;
  final String anlam;
  final String dil;
  final String kursId;
  final String dersId;

  /// Maddenin kaynağı olan alıştırmanın ders içindeki sırası (0 tabanlı).
  final int alistirmaIndeksi;

  /// Kelimenin kökü (küçük harf). `Sozluk` kurulurken hesaplanır; yalnız
  /// tek kelimeli (boşluksuz, noktalamasız) İngilizce maddede ek düşürülür;
  /// çok kelimeli ifadelerde ve İngilizce dışı maddelerde normalize kelimedir.
  final String kok;

  /// Kökün İngilizce sıklık sırası (1 en sık); listede yoksa null.
  final int? siklik;

  /// Kaynak alıştırmanın aralıklı tekrar kart kimliği
  /// (`Ders.kartKimligi` ile aynı biçim: 'dersId#indeks').
  String get kartKimligi => '$dersId#$alistirmaIndeksi';

  /// Kök kelimenin kendisinden farklı mı (ekranda "kök: go" bilgisi için)?
  bool get kokFarkli => dil == 'en' && kok != Sozluk.normalize(kelime);

  SozlukMaddesi _kokle(String kok, int? siklik) => SozlukMaddesi(
    kelime: kelime,
    anlam: anlam,
    dil: dil,
    kursId: kursId,
    dersId: dersId,
    alistirmaIndeksi: alistirmaIndeksi,
    kok: kok,
    siklik: siklik,
  );

  @override
  String toString() => '$kelime: $anlam ($dil, $dersId)';
}

/// Ünite bazlı kelime paketi: ünite adı, kurs kimliği ve maddeleri.
class KelimePaketi {
  const KelimePaketi({
    required this.ad,
    required this.kursId,
    required this.uniteId,
    required this.maddeler,
  });

  final String ad;
  final String kursId;
  final String uniteId;
  final List<SozlukMaddesi> maddeler;

  @override
  String toString() => '$ad ($kursId, ${maddeler.length} madde)';
}

/// Kurslardan üretilen, aranabilir sözlük.
class Sozluk {
  /// Her maddeye kök ve sıklık hesaplanır; liste alfabetik sıralanır.
  Sozluk(List<SozlukMaddesi> maddeler) {
    // Bilinen kelimeler: sözlükteki tek kelimeli İngilizce maddeler. er/est
    // gibi belirsiz ekler yalnız kök bu kümede ya da sıklık listesindeyse düşer.
    _bilinen = {
      for (final m in maddeler)
        if (m.dil == 'en' && !m.kelime.trim().contains(' '))
          m.kelime.trim().toLowerCase(),
    };
    final liste = <SozlukMaddesi>[];
    for (final m in maddeler) {
      final tek = _tekKelime.hasMatch(m.kelime.trim());
      if (m.dil == 'en' && tek) {
        final kok = IngilizceKok.bul(m.kelime, bilinen: _bilinen);
        liste.add(m._kokle(kok, siklikSirasi(kok)));
      } else {
        liste.add(m._kokle(normalize(m.kelime), null));
      }
    }
    liste.sort(_alfabetik);
    this.maddeler = List.unmodifiable(liste);
    // Arama için kelime bazlı ifade kökü ("zebra crossing" → "zebra cross").
    _ifadeKoku = Map.identity();
    for (final m in this.maddeler) {
      if (m.dil == 'en') {
        _ifadeKoku[m] = IngilizceKok.ifade(m.kelime, bilinen: _bilinen);
      }
    }
  }

  /// Alfabetik sıralı, değiştirilemez tam liste.
  late final List<SozlukMaddesi> maddeler;

  late final Set<String> _bilinen;

  /// İngilizce maddelerin kelime bazlı ifade kökü (yalnız aramada kullanılır).
  late final Map<SozlukMaddesi, String> _ifadeKoku;

  /// Tek kelime: yalnız Latin harfleri (boşluk, kesme, noktalama yok).
  static final RegExp _tekKelime = RegExp(r'^[A-Za-z]+$');

  /// `"Hello" ne demektir?` biçimini yakalar; tırnak içi kelime olur.
  static final RegExp _neDemektir = RegExp(r'^"([^"]+)" ne demektir\?$');

  /// Tüm kurslardaki Eslestir çiftlerini ve "X ne demektir?" seçim
  /// sorularını tarar. Aynı kelime+anlam (normalize) tekrarı birleştirilir;
  /// ilk görülen ders (ve alıştırma indeksi) kalır.
  factory Sozluk.kurslardan(List<Kurs> kurslar) {
    final gorulen = <String>{};
    final sonuc = <SozlukMaddesi>[];
    void ekle(SozlukMaddesi m) {
      final kelime = m.kelime.trim();
      final anlam = m.anlam.trim();
      if (kelime.isEmpty || anlam.isEmpty) return;
      final anahtar = '${normalize(kelime)}\u0000${normalize(anlam)}';
      if (!gorulen.add(anahtar)) return;
      sonuc.add(
        SozlukMaddesi(
          kelime: kelime,
          anlam: anlam,
          dil: m.dil,
          kursId: m.kursId,
          dersId: m.dersId,
          alistirmaIndeksi: m.alistirmaIndeksi,
        ),
      );
    }

    for (final kurs in kurslar) {
      if (kurs.alan == KursAlani.oyun) continue; // Oyun kurslarında sözlük yok.
      final dil = kursDili(kurs);
      for (final ders in kurs.tumDersler) {
        for (var i = 0; i < ders.alistirmalar.length; i++) {
          final a = ders.alistirmalar[i];
          switch (a) {
            case Eslestir(:final ciftler):
              for (final c in ciftler) {
                ekle(
                  SozlukMaddesi(
                    kelime: c.sol,
                    anlam: c.sag,
                    dil: dil,
                    kursId: kurs.id,
                    dersId: ders.id,
                    alistirmaIndeksi: i,
                  ),
                );
              }
            case Secim(:final soru, :final secenekler, :final dogru):
              final e = _neDemektir.firstMatch(soru.trim());
              if (e != null && dogru >= 0 && dogru < secenekler.length) {
                ekle(
                  SozlukMaddesi(
                    kelime: e.group(1)!,
                    anlam: secenekler[dogru],
                    dil: dil,
                    kursId: kurs.id,
                    dersId: ders.id,
                    alistirmaIndeksi: i,
                  ),
                );
              }
            default:
              break;
          }
        }
      }
    }
    return Sozluk(sonuc);
  }

  /// Kursun sözlük dili: kod kursu 'kod'; Korece 'ko', Japonca 'ja', Çince
  /// 'zh' (kurs kimliğinin önekinden); diğer dil kursları 'en'.
  static String kursDili(Kurs kurs) {
    if (kurs.alan == KursAlani.kod) return 'kod';
    return switch (kurs.id.split('-').first) {
      'almanca' => 'de',
      'korece' => 'ko',
      'japonca' => 'ja',
      'cince' => 'zh',
      _ => 'en',
    };
  }

  /// Arama için normalize: küçük harf, Türkçe harfler sadeleştirilir,
  /// kenar boşlukları atılır. ("İ"→"i", "ı"→"i", "ş"→"s", "ğ"→"g",
  /// "ü"→"u", "ö"→"o", "ç"→"c".)
  static String normalize(String s) {
    final b = StringBuffer();
    for (final r in s.trim().runes) {
      final ch = String.fromCharCode(r);
      switch (ch) {
        case 'İ' || 'I' || 'ı' || 'i':
          b.write('i');
        case 'Ş' || 'ş':
          b.write('s');
        case 'Ğ' || 'ğ':
          b.write('g');
        case 'Ü' || 'ü':
          b.write('u');
        case 'Ö' || 'ö':
          b.write('o');
        case 'Ç' || 'ç':
          b.write('c');
        default:
          b.write(ch.toLowerCase());
      }
    }
    return b.toString();
  }

  static int _alfabetik(SozlukMaddesi a, SozlukMaddesi b) {
    final k = normalize(a.kelime).compareTo(normalize(b.kelime));
    if (k != 0) return k;
    return normalize(a.anlam).compareTo(normalize(b.anlam));
  }

  /// Sıklık (sık kelimeler önce, listede olmayanlar sonda), sonra alfabetik.
  static int _siklikSonraAlfabetik(SozlukMaddesi a, SozlukMaddesi b) {
    final sa = a.siklik, sb = b.siklik;
    if (sa != sb) {
      if (sa == null) return 1;
      if (sb == null) return -1;
      return sa.compareTo(sb);
    }
    return _alfabetik(a, b);
  }

  /// Boş sorgu: tüm liste alfabetik. Aksi halde kelime ya da anlamda
  /// duyarsız eşleşme; İngilizce maddelerde sorgunun kökü madde köküne
  /// eşitse de başlangıç eşleşmesi sayılır ("went" → "go"). Önce başlangıç,
  /// sonra içerik eşleşmeleri; her grup sıklık, sonra alfabetik sıralıdır.
  /// [dil] verilirse yalnız o dildeki maddeler ('en' | 'ko' | 'ja' | 'zh' | 'kod').
  List<SozlukMaddesi> ara(String sorgu, {String? dil}) {
    final kaynak = dil == null
        ? maddeler
        : maddeler.where((m) => m.dil == dil).toList();
    final q = normalize(sorgu);
    if (q.isEmpty) return kaynak;
    final qKok = IngilizceKok.ifade(q, bilinen: _bilinen);
    final bas = <SozlukMaddesi>[];
    final ic = <SozlukMaddesi>[];
    for (final m in kaynak) {
      final k = normalize(m.kelime);
      final a = normalize(m.anlam);
      final kokEsit = m.dil == 'en' && _ifadeKoku[m] == qKok;
      if (k.startsWith(q) || a.startsWith(q) || kokEsit) {
        bas.add(m);
      } else if (k.contains(q) || a.contains(q)) {
        ic.add(m);
      }
    }
    bas.sort(_siklikSonraAlfabetik);
    ic.sort(_siklikSonraAlfabetik);
    return [...bas, ...ic];
  }

  /// Ünite bazlı kelime paketleri: her ünite için o ünitenin derslerinden
  /// gelen maddeler (alfabetik). Maddesi olmayan ünite atlanır. Sıra kurs ve
  /// ünite sırasıdır.
  List<KelimePaketi> paketler(List<Kurs> kurslar) {
    final dersUnite = <String, Unite>{};
    for (final kurs in kurslar) {
      for (final u in kurs.uniteler) {
        for (final d in u.dersler) {
          dersUnite[d.id] = u;
        }
      }
    }
    final grup = <String, List<SozlukMaddesi>>{};
    for (final m in maddeler) {
      final u = dersUnite[m.dersId];
      if (u != null) (grup[u.id] ??= []).add(m);
    }
    final sonuc = <KelimePaketi>[];
    for (final kurs in kurslar) {
      for (final u in kurs.uniteler) {
        final liste = grup[u.id];
        if (liste == null || liste.isEmpty) continue;
        sonuc.add(
          KelimePaketi(
            ad: u.ad,
            kursId: kurs.id,
            uniteId: u.id,
            maddeler: List.unmodifiable(liste),
          ),
        );
      }
    }
    return sonuc;
  }

  /// Günün kelimesi: [bugun] ('YYYY-MM-DD') metninden deterministik seçilen
  /// İngilizce madde. Sıklığı olan maddeler varsa yalnız onlardan seçilir;
  /// İngilizce madde yoksa null. Aynı tarih aynı maddeyi verir.
  SozlukMaddesi? gununKelimesi(String bugun) {
    final en = maddeler.where((m) => m.dil == 'en').toList();
    if (en.isEmpty) return null;
    final sik = en.where((m) => m.siklik != null).toList();
    final aday = sik.isNotEmpty ? sik : en;
    return aday[_hash(bugun.trim()) % aday.length];
  }

  /// FNV-1a (32 bit) benzeri basit, platformdan bağımsız metin özeti.
  static int _hash(String s) {
    var h = 0x811c9dc5;
    for (final r in s.runes) {
      h ^= r;
      h = (h * 0x01000193) & 0xffffffff;
    }
    return h;
  }
}
