/// Yer imi koleksiyonları ve notlar (ÖZELLİK 72, CodeCamp/Livio/CodeGym):
/// ders adımları (alıştırma kartı kimliği) ve sözlük maddeleri koleksiyonlara
/// kaydedilir, kısa not eklenir; en son açılanlar "geçmiş" olarak tutulur.
/// Hepsi saf işlevdir; yeni kopya döndürür. Kart aralıklarına (SRS), hata
/// defterine ve XP'ye dokunmaz. Yer imi çözümü içerikten türetilir: içerik
/// kaldırılmışsa satır "bulunamadı" görünür ama kaydı silinebilir.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/durum.dart';
import '../model/icerik.dart';
import '../sozluk/sozluk.dart';
import 'motor.dart';

/// Çözülmüş yer imi: ekranda gösterilecek başlık, alt başlık ve açılacak rota
/// (null: içerik bulunamadı).
typedef YerImiGorunumu = ({String baslik, String altBaslik, String? rota});

abstract final class YerImleri {
  /// Ders adımı yer imi anahtarı (kart kimliği: dersId#indeks).
  static String adimAnahtari(String kartId) => '${YerImi.turAdim}:$kartId';

  /// Sözlük maddesi yer imi anahtarı: kart kimliği + kelime (bir eşleştirme
  /// alıştırması birden çok maddeyi aynı kart kimliğiyle verir).
  static String sozlukAnahtari(String kartId, String kelime) {
    final k = '${YerImi.turSozluk}:$kartId|${kelime.trim()}';
    return k.length > YerImi.anahtarEnCok
        ? k.substring(0, YerImi.anahtarEnCok)
        : k;
  }

  static String _kartKimligi(String anahtar) {
    final govde = anahtar.substring(anahtar.indexOf(':') + 1);
    final bar = govde.indexOf('|');
    return bar < 0 ? govde : govde.substring(0, bar);
  }

  static String? _kelime(String anahtar) {
    final bar = anahtar.indexOf('|');
    return bar < 0 ? null : anahtar.substring(bar + 1);
  }

  static YerImi? bul(OgrenciDurumu d, String anahtar) {
    for (final y in d.yerImleri) {
      if (y.anahtar == anahtar) return y;
    }
    return null;
  }

  static bool varMi(OgrenciDurumu d, String anahtar) => bul(d, anahtar) != null;

  /// Koleksiyon adını kırpar; boşsa ya da fazla uzunsa null.
  static String? adTemizle(String ad) {
    final k = ad.trim().replaceAll(RegExp(r'\s+'), ' ');
    if (k.isEmpty || k.length > YerImi.koleksiyonAdEnCok) return null;
    return k;
  }

  /// Tüm koleksiyon adları: "Genel" önce, sonra kayıtlı ve yer imlerinde
  /// geçenler (tekrarsız, ekleme sırasıyla).
  static List<String> koleksiyonAdlari(OgrenciDurumu d) {
    final sonuc = <String>[YerImi.varsayilanKoleksiyon];
    for (final k in d.koleksiyonlar) {
      if (!sonuc.contains(k)) sonuc.add(k);
    }
    for (final y in d.yerImleri) {
      if (!sonuc.contains(y.koleksiyon)) sonuc.add(y.koleksiyon);
    }
    return sonuc;
  }

  static List<YerImi> koleksiyonYerImleri(OgrenciDurumu d, String koleksiyon) =>
      [
        for (final y in d.yerImleri.reversed)
          if (y.koleksiyon == koleksiyon) y,
      ];

  static OgrenciDurumu _koleksiyonuKaydet(OgrenciDurumu d, String ad) {
    if (ad == YerImi.varsayilanKoleksiyon || d.koleksiyonlar.contains(ad)) {
      return d;
    }
    if (d.koleksiyonlar.length >= YerImi.koleksiyonEnCok) return d;
    return d.copyWith(
      koleksiyonlar: List.unmodifiable([...d.koleksiyonlar, ad]),
    );
  }

  /// Yer imi ekler; varsa dokunmaz. Koleksiyon sayısı sınırı aşılırsa
  /// "Genel"e düşer. En çok [YerImi.enCok] yer imi.
  static OgrenciDurumu ekle(
    OgrenciDurumu d,
    String anahtar,
    String bugun, {
    String koleksiyon = YerImi.varsayilanKoleksiyon,
    String not = '',
  }) {
    if (!YerImi.anahtarGecerli(anahtar) || varMi(d, anahtar)) return d;
    if (d.yerImleri.length >= YerImi.enCok) return d;
    var ad = adTemizle(koleksiyon) ?? YerImi.varsayilanKoleksiyon;
    var yeni = _koleksiyonuKaydet(d, ad);
    if (ad != YerImi.varsayilanKoleksiyon && !yeni.koleksiyonlar.contains(ad)) {
      ad = YerImi.varsayilanKoleksiyon;
    }
    final kirpikNot = not.trim();
    return yeni.copyWith(
      yerImleri: List.unmodifiable([
        ...yeni.yerImleri,
        YerImi(
          anahtar: anahtar,
          koleksiyon: ad,
          not: kirpikNot.length > YerImi.notEnCok
              ? kirpikNot.substring(0, YerImi.notEnCok)
              : kirpikNot,
          gun: bugun,
        ),
      ]),
    );
  }

  static OgrenciDurumu kaldir(OgrenciDurumu d, String anahtar) {
    if (!varMi(d, anahtar)) return d;
    return d.copyWith(
      yerImleri: List.unmodifiable([
        for (final y in d.yerImleri)
          if (y.anahtar != anahtar) y,
      ]),
      yerImiGecmisi: List.unmodifiable([
        for (final g in d.yerImiGecmisi)
          if (g != anahtar) g,
      ]),
    );
  }

  /// Yer imi varsa kaldırır, yoksa "Genel"e ekler.
  static OgrenciDurumu degistir(
    OgrenciDurumu d,
    String anahtar,
    String bugun,
  ) => varMi(d, anahtar) ? kaldir(d, anahtar) : ekle(d, anahtar, bugun);

  static OgrenciDurumu _guncelle(
    OgrenciDurumu d,
    String anahtar,
    YerImi Function(YerImi) f,
  ) {
    if (!varMi(d, anahtar)) return d;
    return d.copyWith(
      yerImleri: List.unmodifiable([
        for (final y in d.yerImleri) y.anahtar == anahtar ? f(y) : y,
      ]),
    );
  }

  /// Yer imi notunu yazar; boş metin notu siler; uzun metin kısaltılır.
  static OgrenciDurumu notYaz(OgrenciDurumu d, String anahtar, String? metin) {
    final k = metin?.trim() ?? '';
    final kisa = k.length > YerImi.notEnCok
        ? k.substring(0, YerImi.notEnCok)
        : k;
    return _guncelle(d, anahtar, (y) => y.copyWith(not: kisa));
  }

  /// Yer imini başka bir koleksiyona taşır (yeni ad açılır).
  static OgrenciDurumu tasi(
    OgrenciDurumu d,
    String anahtar,
    String koleksiyon,
  ) {
    final ad = adTemizle(koleksiyon);
    if (ad == null || !varMi(d, anahtar)) return d;
    final yeni = _koleksiyonuKaydet(d, ad);
    if (ad != YerImi.varsayilanKoleksiyon &&
        !yeni.koleksiyonlar.contains(ad) &&
        !yeni.yerImleri.any((y) => y.koleksiyon == ad)) {
      return d; // koleksiyon sınırı dolu
    }
    return _guncelle(yeni, anahtar, (y) => y.copyWith(koleksiyon: ad));
  }

  /// Boş koleksiyon açar (en çok [YerImi.koleksiyonEnCok]).
  static OgrenciDurumu koleksiyonEkle(OgrenciDurumu d, String ad) {
    final k = adTemizle(ad);
    if (k == null) return d;
    return _koleksiyonuKaydet(d, k);
  }

  /// Koleksiyonu siler; içindeki yer imleri "Genel"e geçer ("Genel" silinmez).
  static OgrenciDurumu koleksiyonSil(OgrenciDurumu d, String ad) {
    if (ad == YerImi.varsayilanKoleksiyon) return d;
    return d.copyWith(
      koleksiyonlar: List.unmodifiable([
        for (final k in d.koleksiyonlar)
          if (k != ad) k,
      ]),
      yerImleri: List.unmodifiable([
        for (final y in d.yerImleri)
          y.koleksiyon == ad
              ? y.copyWith(koleksiyon: YerImi.varsayilanKoleksiyon)
              : y,
      ]),
    );
  }

  /// Açılan yer imini geçmişin başına alır (tekrarsız, en çok
  /// [YerImi.gecmisEnCok]).
  static OgrenciDurumu gecmiseEkle(OgrenciDurumu d, String anahtar) {
    if (!varMi(d, anahtar)) return d;
    final liste = [
      anahtar,
      for (final g in d.yerImiGecmisi)
        if (g != anahtar) g,
    ];
    if (liste.length > YerImi.gecmisEnCok) liste.length = YerImi.gecmisEnCok;
    return d.copyWith(yerImiGecmisi: List.unmodifiable(liste));
  }

  static OgrenciDurumu gecmisiTemizle(OgrenciDurumu d) =>
      d.yerImiGecmisi.isEmpty ? d : d.copyWith(yerImiGecmisi: const []);

  /// Yer imini içerikten çözer: ders adımında soru ve doğru cevap (rota
  /// `/ders/<id>`), sözlük maddesinde kelime ve anlam (rota `/sozluk?q=`).
  static YerImiGorunumu coz(String anahtar, List<Kurs> kurslar, Sozluk sozluk) {
    final kartId = _kartKimligi(anahtar);
    final ayrac = kartId.lastIndexOf('#');
    final dersId = ayrac > 0 ? kartId.substring(0, ayrac) : kartId;
    if (anahtar.startsWith('${YerImi.turSozluk}:')) {
      final kelime = _kelime(anahtar) ?? '';
      for (final m in sozluk.maddeler) {
        if (m.kartKimligi == kartId && m.kelime == kelime) {
          return (
            baslik: m.kelime,
            altBaslik: m.anlam,
            rota: '/sozluk?q=${Uri.encodeQueryComponent(m.kelime)}',
          );
        }
      }
      return (
        baslik: kelime.isEmpty ? kartId : kelime,
        altBaslik: 'Madde bulunamadı',
        rota: null,
      );
    }
    final a = Motor.kartCoz(kurslar, kartId);
    if (a == null) {
      return (baslik: kartId, altBaslik: 'Adım bulunamadı', rota: null);
    }
    String ders = dersId;
    for (final k in kurslar) {
      final d = k.dersBul(dersId);
      if (d != null) {
        ders = d.ad;
        break;
      }
    }
    return (
      baslik: a.soru,
      altBaslik: '$ders · ${Motor.dogruCevapMetni(a)}',
      rota: '/ders/${Uri.encodeComponent(dersId)}',
    );
  }
}
