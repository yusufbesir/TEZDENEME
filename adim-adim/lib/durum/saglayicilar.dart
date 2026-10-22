/// Riverpod sağlayıcıları: depo, bugün, kurslar, öğrenci durumu ve alan kursları.
/// Durum yazımları (ders, mikro ders, yarışma, tekrar oturumu, kart, ayarlar;
/// hata defteri, öğrenme günlüğü, kelime notu, haftalık hedef, kısa quiz ve
/// günün bilmecesi dahil) tek yerden, `DurumNotifier` üzerinden yapılır.
/// Açılışta bugün bekleyen tekrar varsa (ayar açık, bugün gösterilmemiş)
/// hemen bir bildirim gösterilir (ÖZELLİK 29; Windows'ta widget yerine).
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla.
library;

import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../depo/depo.dart';
import '../icerik/icerik.dart';
import '../model/durum.dart';
import '../model/icerik.dart';
import '../model/satranc_durumu.dart';
import '../motor/basarimlar.dart';
import '../motor/efsanevi.dart';
import '../motor/gorevler.dart';
import '../motor/kod_calistirici.dart';
import '../motor/kod_projesi.dart';
import '../motor/meydan.dart';
import '../motor/motor.dart';
import '../motor/pratik.dart';
import '../motor/satranc_calisma.dart';
import '../motor/senaryo.dart';
import '../motor/sure.dart';
import '../motor/yer_imi.dart';
import '../servis/bildirim.dart';
import '../servis/js_motoru.dart';
import '../servis/proje_aktarici.dart';
import '../servis/konusma.dart';
import '../servis/ses.dart';
import '../sozluk/dil_paketi.dart';
import '../sozluk/fiil_cekimi.dart';
import '../sozluk/sozluk.dart';
import '../yarisma/model.dart';

/// Kalıcı depo. Uygulama başlarken (main) ya da testte override edilir.
final depoProvider = Provider<Depo>(
  (ref) => throw UnimplementedError('depoProvider override edilmeli'),
);

final sesProvider = Provider<Ses>((ref) => Ses());

/// Konuşma tanıma servisi. Gerçek motor (sherpa-onnx) `main.dart` ya da
/// uygulama kökünde override edilir; varsayılan "motor yok".
final konusmaProvider = Provider<KonusmaTanima>((ref) => const KonusmaYok());

/// Kod çalıştırıcı (ÖZELLİK 69): varsayılan cihazdaki QuickJS; testlerde
/// sahte uygulamayla override edilir. Motor yüklenemezse sonuç "motor yok".
final kodCalistiriciProvider = Provider<KodCalistirici>(
  (ref) => const QuickJsCalistirici(),
);

/// Projeyi .html dosyası olarak kaydeden servis (ÖZELLİK 70); testte sahte.
final projeAktariciProvider = Provider<ProjeAktarici>(
  (ref) => const DosyaProjeAktarici(),
);

final bildirimProvider = Provider<BildirimServisi>(
  (ref) => const GercekBildirim(),
);

/// Son kayıt hatasının mesajı (null: sorun yok). Arayüz bunu dinleyip uyarır.
class KayitHatasi extends Notifier<String?> {
  @override
  String? build() => null;
  void ayarla(String? mesaj) => state = mesaj;
}

final kayitHatasiProvider = NotifierProvider<KayitHatasi, String?>(
  KayitHatasi.new,
);

final kurslarProvider = Provider<List<Kurs>>((ref) => tumKurslar);

/// Dil başına sözlük veri paketleri (ÖZELLİK 60): her dilin maddeleri ayrı
/// yükleme biriminde, ilk istendiğinde üretilir.
final dilPaketleriProvider = Provider<DilPaketleri>(
  (ref) => DilPaketleri(ref.watch(kurslarProvider)),
);

/// Gömülü sözlük: dil paketlerinin birleşimi (kurs listesi varsayılan
/// tumKurslar); `Sozluk.kurslardan` ile aynı maddeleri verir.
final sozlukProvider = Provider<Sozluk>(
  (ref) => ref.watch(dilPaketleriProvider).sozluk,
);

/// Fiil çekim sözlüğü (ÖZELLİK 61): kurs tablolarından derlenen doğrulanmış
/// çekimler; uydurma çekim yok.
final fiilCekimleriProvider = Provider<FiilCekimleri>(
  (ref) => FiilCekimleri.kurslardan(ref.watch(kurslarProvider)),
);

/// Bugünün günü 'YYYY-MM-DD'. Testte sabitlenebilir.
final bugunProvider = Provider<String>((ref) {
  final simdi = DateTime.now();
  // Gece yarısı geçince kendini yeniler; uygulama açık kalsa da gün değişir.
  final yarin = DateTime(simdi.year, simdi.month, simdi.day + 1);
  final sayac = Timer(
    yarin.difference(simdi) + const Duration(seconds: 1),
    ref.invalidateSelf,
  );
  ref.onDispose(sayac.cancel);
  return Motor.bugun(simdi);
});

/// Ana sayfada seçili kurs kimliği (null: ilk kurs).
class SecilenKurs extends Notifier<String?> {
  @override
  String? build() => null;
  void sec(String id) => state = id;
}

final secilenKursProvider = NotifierProvider<SecilenKurs, String?>(
  SecilenKurs.new,
);

class DurumNotifier extends AsyncNotifier<OgrenciDurumu> {
  @override
  Future<OgrenciDurumu> build() async {
    OgrenciDurumu d;
    try {
      d = await ref.read(depoProvider).yukle();
    } catch (e) {
      debugPrint('Durum yüklenemedi: $e');
      d = const OgrenciDurumu();
    }
    final saat = d.hatirlatmaSaati;
    if (saat != null) {
      // Açılışta yalnızca yeniden zamanla; izin penceresi açma (izin ayarlarda istenir).
      unawaited(
        ref
            .read(bildirimProvider)
            .gunlukHatirlatma(saat, izinIste: false)
            .catchError((_) => false),
      );
    }
    // Açılışta bekleyen tekrar bildirimi: karar Motor'da (saf), günde en çok
    // bir kez. Gün, gösterim denemesiyle işaretlenir (başarısız olsa da aynı
    // gün yeniden denenmez; ertesi gün yine gösterilir) ve hemen kaydedilir.
    final bugun = ref.read(bugunProvider);
    final sayi = Motor.tekrarBildirimiGerekli(d, bugun);
    if (sayi != null) {
      d = d.copyWith(sonTekrarBildirimGunu: bugun);
      try {
        await ref.read(depoProvider).kaydet(d);
      } catch (e) {
        debugPrint('Tekrar bildirimi günü kaydedilemedi: $e');
      }
      unawaited(
        ref
            .read(bildirimProvider)
            .tekrarBildirimi(sayi)
            .catchError((_) => false),
      );
    }
    // Günün dersi hazır bildirimi (ÖZELLİK 63; ayar açıksa, günde bir kez).
    final adet = Motor.gunDersiBildirimiGerekli(
      d,
      ref.read(kurslarProvider),
      bugun,
    );
    if (adet != null) {
      d = d.copyWith(sonGunDersiBildirimGunu: bugun);
      try {
        await ref.read(depoProvider).kaydet(d);
      } catch (e) {
        debugPrint('Günün dersi bildirim günü kaydedilemedi: $e');
      }
      unawaited(
        ref
            .read(bildirimProvider)
            .gunDersiBildirimi(adet)
            .catchError((_) => false),
      );
    }
    return d;
  }

  OgrenciDurumu get _simdiki => state.value ?? const OgrenciDurumu();

  Future<OgrenciDurumu> _uygula(
    OgrenciDurumu Function(OgrenciDurumu) donustur,
  ) async {
    final yeni = donustur(_simdiki);
    state = AsyncData(yeni);
    try {
      await ref.read(depoProvider).kaydet(yeni);
      if (ref.read(kayitHatasiProvider) != null) {
        ref.read(kayitHatasiProvider.notifier).ayarla(null);
      }
    } catch (e) {
      debugPrint('Durum kaydedilemedi: $e');
      ref.read(kayitHatasiProvider.notifier).ayarla('$e');
    }
    return yeni;
  }

  Future<OgrenciDurumu> dersBitir(
    String dersId,
    int dogru,
    int toplam, {
    int sureSn = 0,
  }) {
    final bugun = ref.read(bugunProvider);
    return _uygula(
      (d) => Motor.dersBitir(d, dersId, dogru, toplam, bugun, sureSn: sureSn),
    );
  }

  /// Seviye belirleme sınavı sonucu: geçilen ünitelerin tamamlanmamış dersleri
  /// "atlandı" işaretlenir (XP/seri/kart yok).
  Future<OgrenciDurumu> yerlestirmeUygula(Kurs kurs, List<int> gecilen) =>
      _uygula((d) => Motor.yerlestirmeUygula(d, kurs, gecilen));

  /// Ünite ara sınavı ya da seviye sertifika sınavı bitişi (XP/seri yok;
  /// en iyi sonuç kaydı, kalınca yanlış kartlar tekrar destesine).
  Future<OgrenciDurumu> sinavBitir({
    required String anahtar,
    required bool sertifika,
    required List<({int unite, String kartId, Alistirma alistirma})> sorular,
    required List<bool> dogrular,
  }) {
    final bugun = ref.read(bugunProvider);
    return _uygula(
      (d) => Motor.sinavBitir(
        d,
        anahtar: anahtar,
        sertifika: sertifika,
        sorular: sorular,
        dogrular: dogrular,
        bugun: bugun,
      ),
    );
  }

  /// Alan seçimi: yalnızca 'dil', 'kod' ya da 'oyun'. [ilkAcilisTamam] verilirse
  /// ilk açılış bayrağı da yazılır (akışın 1. adımı false yazar ki uygulama
  /// kapanıp açılınca akış sürsün).
  Future<OgrenciDurumu> alanSec(String alan, {bool? ilkAcilisTamam}) {
    if (alan != 'dil' && alan != 'kod' && alan != 'oyun') {
      throw ArgumentError.value(
        alan,
        'alan',
        "'dil', 'kod' ya da 'oyun' olmalı",
      );
    }
    return _uygula(
      (d) => d.copyWith(alan: alan, ilkAcilisTamam: ilkAcilisTamam),
    );
  }

  /// İlk açılış ("Hoş geldin") akışı bitti; bir daha gösterilmez.
  Future<OgrenciDurumu> ilkAcilisTamamla() =>
      _uygula((d) => d.copyWith(ilkAcilisTamam: true));

  /// Günün / haftanın / ayın dersi bitişi (Motor.donemDersiBitir).
  Future<OgrenciDurumu> donemDersiBitir(String tur, int dogru, int toplam) {
    final bugun = ref.read(bugunProvider);
    return _uygula((d) => Motor.donemDersiBitir(d, tur, dogru, toplam, bugun));
  }

  /// Günlük çalışma süresine [sn] saniye ekler (ÖZELLİK 59, 80; süreli oturum,
  /// mikro ders). sn <= 0 ise hiçbir şey yazılmaz.
  Future<OgrenciDurumu> sureEkle(int sn) async {
    if (sn <= 0) return _simdiki;
    final bugun = ref.read(bugunProvider);
    return _uygula((d) => Motor.sureEkle(d, bugun, sn));
  }

  /// Tamamlanmış görevin sabit XP ödülünü verir (Gorevler.odulAl); görev
  /// tamam değilse ya da ödül alınmışsa durum değişmez.
  Future<OgrenciDurumu> gorevOdulAl(Gorev gorev) =>
      _uygula((d) => Gorevler.odulAl(d, gorev));

  /// Yeni kazanılan başarım rozetlerini kalıcı kayda ekler; yenisi yoksa
  /// hiçbir şey yazılmaz.
  Future<OgrenciDurumu> rozetleriIsle(List<Kurs> kurslar) async {
    if (Basarimlar.yeniKazanilan(_simdiki, kurslar).isEmpty) return _simdiki;
    return _uygula((d) => Basarimlar.rozetleriIsle(d, kurslar));
  }

  /// Günlük dakika hedefini ayarlar; 0 kapatır (ÖZELLİK 80).
  Future<OgrenciDurumu> dakikaHedefiAyarla(int dk) =>
      _uygula((d) => Sure.hedefAyarla(d, dk));

  /// Aylık meydan okuma hedefini (ders sayısı) ayarlar (ÖZELLİK 49).
  Future<OgrenciDurumu> aylikHedefAyarla(int hedef) =>
      _uygula((d) => Meydan.hedefAyarla(d, hedef));

  Future<OgrenciDurumu> mikroBitir(int dogru, int toplam) {
    final bugun = ref.read(bugunProvider);
    return _uygula((d) => Motor.mikroBitir(d, dogru, toplam, bugun));
  }

  /// [yanlisSorular]: oyunda yanlış bilinen sorular (hata defterine yazılır).
  /// [dogru]/[toplam]: öğrenme günlüğüne yazılan cevap sayıları.
  Future<OgrenciDurumu> yarismaBitir(
    int puan, {
    List<YarismaSorusu> yanlisSorular = const [],
    int dogru = 0,
    int toplam = 0,
  }) {
    final bugun = ref.read(bugunProvider);
    return _uygula(
      (d) => Motor.yarismaBitir(
        d,
        puan,
        bugun,
        yanlisSorular: yanlisSorular,
        dogru: dogru,
        toplam: toplam,
      ),
    );
  }

  /// Tekrar oturumu bitişi: öğrenme günlüğüne tek 'tekrar' kaydı.
  Future<OgrenciDurumu> tekrarBitir(int dogru, int toplam) {
    final bugun = ref.read(bugunProvider);
    return _uygula((d) => Motor.tekrarBitir(d, dogru, toplam, bugun));
  }

  /// Ders sonu kısa quiz bitişi: küçük XP ve günlüğe 'quiz' kaydı; kartlar
  /// ve `tamamlanan` değişmez.
  Future<OgrenciDurumu> quizBitir(String dersId, int dogru, int toplam) {
    final bugun = ref.read(bugunProvider);
    return _uygula((d) => Motor.quizBitir(d, dersId, dogru, toplam, bugun));
  }

  /// Okuma hikâyesi bitişi: XP/seri, `tamamlananHikayeler` ve 'hikaye' kaydı.
  Future<OgrenciDurumu> hikayeBitir(
    String hikayeId,
    int dogru,
    int toplam,
    int bilinmeyen,
  ) {
    final bugun = ref.read(bugunProvider);
    return _uygula(
      (d) => Motor.hikayeBitir(d, hikayeId, dogru, toplam, bilinmeyen, bugun),
    );
  }

  /// Günün bilmecesini cevaplar; aynı gün ikinci cevap durumu değiştirmez.
  Future<OgrenciDurumu> bilmeceCevapla(bool dogruMu) {
    final bugun = ref.read(bugunProvider);
    return _uygula((d) => Motor.bilmeceCevapla(d, dogruMu, bugun));
  }

  Future<OgrenciDurumu> kartIsle(String kartId, bool dogruMu) {
    final bugun = ref.read(bugunProvider);
    return _uygula((d) => Motor.kartIsle(d, kartId, dogruMu, bugun));
  }

  /// Pratik merkezi eşleştirme süresi: yalnız daha iyiyse en iyi süre olur.
  /// Kartlara, hata defterine ve XP'ye dokunmaz.
  Future<OgrenciDurumu> eslestirmeBitir(int ms) =>
      _uygula((d) => Pratik.eslestirmeKaydet(d, ms));

  /// Efsanevi zor tekrar geçildi (ÖZELLİK 43): ünite altın olur; kartlara,
  /// hata defterine, XP'ye ve seriye dokunmaz.
  Future<OgrenciDurumu> efsaneviGecildi(String uniteId) =>
      _uygula((d) => Efsanevi.altinYap(d, uniteId));

  /// Senaryolu konuşma bitti (ÖZELLİK 65): bitirme sayısı artar; XP, kart ve
  /// hata defterine dokunmaz.
  Future<OgrenciDurumu> senaryoBitir(String id) => _uygula(
    (d) => d.copyWith(senaryolar: Senaryolar.bitirildi(d.senaryolar, id)),
  );

  /// Kartı bugün sorulacak biçimde tekrar kümesine ekler; varsa dokunmaz.
  Future<OgrenciDurumu> kartEkle(String kartId) {
    final bugun = ref.read(bugunProvider);
    return _uygula((d) => Motor.kartEkle(d, kartId, bugun));
  }

  /// Birden çok kartı tek yazımda tekrar kümesine ekler (toplu ekleme).
  Future<OgrenciDurumu> kartlarEkle(Iterable<String> kartIdleri) {
    final bugun = ref.read(bugunProvider);
    final idler = kartIdleri.toSet();
    return _uygula((d) {
      var yeni = d;
      for (final id in idler) {
        yeni = Motor.kartEkle(yeni, id, bugun);
      }
      return yeni;
    });
  }

  // --- Satranç modülü (ÖZELLİK 47, 52-57) -------------------------------
  // Ders kartlarına, hata defterine, XP'ye ve seriye dokunmaz; ayrı deste.

  /// Günlük satranç bulmacasının ilk sonucu (aynı gün ikinci kez yazılmaz).
  Future<OgrenciDurumu> satrancGunlukBitir(bool dogru) {
    final bugun = ref.read(bugunProvider);
    return _uygula((d) => SatrancCalisma.gunlukBitir(d, bugun, dogru));
  }

  /// Tema bulmacası (ya da tekrar destesindeki bulmaca) sonucu.
  Future<OgrenciDurumu> satrancBulmacaSonucu(String id, bool dogru) {
    final bugun = ref.read(bugunProvider);
    return _uygula((d) => SatrancCalisma.bulmacaSonucu(d, id, dogru, bugun));
  }

  Future<OgrenciDurumu> satrancMacBitir(SatrancMaci mac) =>
      _uygula((d) => SatrancCalisma.macBitir(d, mac));

  Future<OgrenciDurumu> satrancOyunSonuPratik(String id) =>
      _uygula((d) => SatrancCalisma.oyunSonuPratikBitir(d, id));

  Future<OgrenciDurumu> satrancOyunSonuMeydan(String id, int hamle) =>
      _uygula((d) => SatrancCalisma.oyunSonuMeydanBitir(d, id, hamle));

  Future<OgrenciDurumu> satrancKoordinatBitir(String mod, int puan) =>
      _uygula((d) => SatrancCalisma.koordinatBitir(d, mod, puan));

  Future<OgrenciDurumu> satrancSoloBitir(String id) =>
      _uygula((d) => SatrancCalisma.soloBitir(d, id));

  Future<OgrenciDurumu> satrancAnalizBitir(
    String id,
    bool hamleDogru,
    bool gerekceDogru,
  ) => _uygula(
    (d) => SatrancCalisma.analizBitir(d, id, hamleDogru, gerekceDogru),
  );

  /// Ders sonu tahta meydan okuması bitişi (ustalık destesine de yazar).
  Future<OgrenciDurumu> satrancDersMeydanBitir(
    String dersId,
    int dogru,
    int toplam,
  ) {
    final bugun = ref.read(bugunProvider);
    return _uygula(
      (d) => SatrancCalisma.dersMeydanBitir(d, dersId, dogru, toplam, bugun),
    );
  }

  /// Ustalık kursu sorusunun sonucu.
  Future<OgrenciDurumu> satrancUstalikSonucu(String dersId, bool dogru) {
    final bugun = ref.read(bugunProvider);
    return _uygula(
      (d) => SatrancCalisma.ustalikSonucu(d, dersId, dogru, bugun),
    );
  }

  /// Kelimeye kişisel not yazar; boş/null metin notu siler.
  Future<OgrenciDurumu> notYaz(String kartId, String? metin) =>
      _uygula((d) => Motor.notYaz(d, kartId, metin));

  // --- Yer imleri (ÖZELLİK 72) ------------------------------------------
  // Kartlara, hata defterine, XP'ye ve seriye dokunmaz.

  /// Yer imi varsa kaldırır, yoksa "Genel" koleksiyonuna ekler.
  Future<OgrenciDurumu> yerImiDegistir(String anahtar) {
    final bugun = ref.read(bugunProvider);
    return _uygula((d) => YerImleri.degistir(d, anahtar, bugun));
  }

  // --- Kod projeleri ve oyun alanı (ÖZELLİK 70) ---------------------------

  /// Projeyi kaydeder; sınır aşılırsa durum değişmez ve neden döner.
  Future<String?> projeKaydet(KodProjesi p) async {
    final bugun = ref.read(bugunProvider);
    final r = KodProjeleri.kaydet(_simdiki, p, bugun);
    if (r.hata != null) return r.hata;
    await _uygula((d) => KodProjeleri.kaydet(d, p, bugun).durum);
    return null;
  }

  Future<OgrenciDurumu> projeSil(String id) =>
      _uygula((d) => KodProjeleri.sil(d, id));

  Future<OgrenciDurumu> yerImiNotYaz(String anahtar, String? metin) =>
      _uygula((d) => YerImleri.notYaz(d, anahtar, metin));

  Future<OgrenciDurumu> yerImiTasi(String anahtar, String koleksiyon) =>
      _uygula((d) => YerImleri.tasi(d, anahtar, koleksiyon));

  Future<OgrenciDurumu> koleksiyonEkle(String ad) =>
      _uygula((d) => YerImleri.koleksiyonEkle(d, ad));

  Future<OgrenciDurumu> koleksiyonSil(String ad) =>
      _uygula((d) => YerImleri.koleksiyonSil(d, ad));

  Future<OgrenciDurumu> yerImiAcildi(String anahtar) =>
      _uygula((d) => YerImleri.gecmiseEkle(d, anahtar));

  Future<OgrenciDurumu> yerImiGecmisiniTemizle() =>
      _uygula(YerImleri.gecmisiTemizle);

  /// Çalışma planını kaydeder; [plan] null ise siler.
  Future<OgrenciDurumu> planKaydet(CalismaPlani? plan) => _uygula(
    (d) => plan == null
        ? d.copyWith(calismaPlaniSil: true)
        : d.copyWith(calismaPlani: plan),
  );

  /// Verilen ayarları günceller. `koyuTemaSil`: sistem temasına dön;
  /// `hatirlatmaSil`: hatırlatmayı kapat; `tekrarBildirimiAcik`: açılıştaki
  /// bekleyen tekrar bildirimi. Hatırlatma açılırken bildirim izni
  /// verilmezse hatırlatma geri kapatılır ve false döner.
  Future<bool> ayarGuncelle({
    String? ad,
    bool? koyuTema,
    bool koyuTemaSil = false,
    bool? sesAcik,
    int? gunlukHedef,
    int? haftalikHedefGun,
    String? hatirlatmaSaati,
    bool hatirlatmaSil = false,
    bool? tekrarBildirimiAcik,
    bool? konusmaAcik,
    bool? gunDersiBildirimiAcik,
  }) async {
    await _uygula(
      (d) => d.copyWith(
        ad: ad,
        koyuTema: koyuTema,
        koyuTemaSil: koyuTemaSil,
        sesAcik: sesAcik,
        gunlukHedef: gunlukHedef,
        haftalikHedefGun: haftalikHedefGun?.clamp(
          OgrenciDurumu.enAzHaftalikHedef,
          OgrenciDurumu.enCokHaftalikHedef,
        ),
        hatirlatmaSaati: hatirlatmaSaati,
        hatirlatmaSil: hatirlatmaSil,
        tekrarBildirimiAcik: tekrarBildirimiAcik,
        konusmaAcik: konusmaAcik,
        gunDersiBildirimiAcik: gunDersiBildirimiAcik,
      ),
    );
    final bildirim = ref.read(bildirimProvider);
    try {
      if (hatirlatmaSil) {
        await bildirim.iptal();
      } else if (hatirlatmaSaati != null) {
        final izinli = await bildirim.gunlukHatirlatma(hatirlatmaSaati);
        if (!izinli) {
          await _uygula((d) => d.copyWith(hatirlatmaSil: true));
          return false;
        }
      }
    } catch (e) {
      debugPrint('Bildirim ayarı uygulanamadı: $e');
    }
    return true;
  }

  Future<void> sifirla() async {
    try {
      await ref.read(depoProvider).sifirla();
    } catch (e) {
      debugPrint('Sıfırlanamadı: $e');
    }
    try {
      await ref.read(bildirimProvider).iptal();
    } catch (_) {}
    state = const AsyncData(OgrenciDurumu());
  }
}

final durumProvider = AsyncNotifierProvider<DurumNotifier, OgrenciDurumu>(
  DurumNotifier.new,
);

/// Seçilen alandaki kurslar; durum yüklenmediyse ya da alan seçilmediyse boş.
final alanKurslariProvider = Provider<List<Kurs>>((ref) {
  final alan = ref.watch(durumProvider).value?.alan;
  return Motor.alanKurslari(ref.watch(kurslarProvider), alan);
});

/// Seçili alandaki zamanı gelmiş (bekleyen) tekrar kartı sayısı. Pratik
/// sekmesi rozeti, Pratik ekranı ve Görevler ekranı ortak kullanır; yalnızca
/// seçili alanın kurslarındaki kartlar sayılır.
final bekleyenTekrarProvider = Provider<int>((ref) {
  final durum = ref.watch(durumProvider).value;
  if (durum == null) return 0;
  final alanKurslari = ref.watch(alanKurslariProvider);
  final bugun = ref.watch(bugunProvider);
  return Motor.tekrarBekleyen(
    durum,
    bugun,
  ).where((id) => Motor.kartCoz(alanKurslari, id) != null).length;
});
