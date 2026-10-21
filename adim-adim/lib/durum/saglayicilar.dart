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
import '../motor/motor.dart';
import '../servis/bildirim.dart';
import '../servis/konusma.dart';
import '../servis/ses.dart';
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

/// Gömülü sözlük: kurs listesinden (varsayılan tumKurslar) bir kez üretilir.
final sozlukProvider = Provider<Sozluk>(
  (ref) => Sozluk.kurslardan(ref.watch(kurslarProvider)),
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

  Future<OgrenciDurumu> dersBitir(String dersId, int dogru, int toplam) {
    final bugun = ref.read(bugunProvider);
    return _uygula((d) => Motor.dersBitir(d, dersId, dogru, toplam, bugun));
  }

  /// Seviye belirleme sınavı sonucu: geçilen ünitelerin tamamlanmamış dersleri
  /// "atlandı" işaretlenir (XP/seri/kart yok).
  Future<OgrenciDurumu> yerlestirmeUygula(Kurs kurs, List<int> gecilen) =>
      _uygula((d) => Motor.yerlestirmeUygula(d, kurs, gecilen));

  /// Alan seçimi: yalnızca 'dil' ya da 'kod'. [ilkAcilisTamam] verilirse
  /// ilk açılış bayrağı da yazılır (akışın 1. adımı false yazar ki uygulama
  /// kapanıp açılınca akış sürsün).
  Future<OgrenciDurumu> alanSec(String alan, {bool? ilkAcilisTamam}) {
    if (alan != 'dil' && alan != 'kod') {
      throw ArgumentError.value(alan, 'alan', "'dil' ya da 'kod' olmalı");
    }
    return _uygula(
      (d) => d.copyWith(alan: alan, ilkAcilisTamam: ilkAcilisTamam),
    );
  }

  /// İlk açılış ("Hoş geldin") akışı bitti; bir daha gösterilmez.
  Future<OgrenciDurumu> ilkAcilisTamamla() =>
      _uygula((d) => d.copyWith(ilkAcilisTamam: true));

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

  /// Kartı bugün sorulacak biçimde tekrar kümesine ekler; varsa dokunmaz.
  Future<OgrenciDurumu> kartEkle(String kartId) {
    final bugun = ref.read(bugunProvider);
    return _uygula((d) => Motor.kartEkle(d, kartId, bugun));
  }

  /// Kelimeye kişisel not yazar; boş/null metin notu siler.
  Future<OgrenciDurumu> notYaz(String kartId, String? metin) =>
      _uygula((d) => Motor.notYaz(d, kartId, metin));

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
