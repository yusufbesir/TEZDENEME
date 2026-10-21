/// Dil başına ayrı sözlük veri paketi (ÖZELLİK 60). Her dilin sözlük/kelime
/// verisi kendi yükleme biriminde ([DilPaketi]) durur: o dilin kursları
/// taranır, maddeler üretilir ve istendiğinde (tembel) bir kez yüklenir.
/// Davranış değişmez: [DilPaketleri.sozluk] tüm paketlerin birleşimidir ve
/// `Sozluk.kurslardan` ile aynı maddeleri verir. Yeni dil eklemek yalnız
/// `dil_tanimi.dart` tablosuna bir satır ve o dilin kursunu eklemektir.
/// Saf Dart.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/icerik.dart';
import 'dil_tanimi.dart';
import 'sozluk.dart';

/// Tek bir dilin sözlük veri paketi. Maddeler ilk erişimde üretilir.
class DilPaketi {
  DilPaketi(this.tanim, List<Kurs> kurslar)
    : kurslar = List.unmodifiable([
        for (final k in kurslar)
          if (kursDilKodu(k) == tanim.kod) k,
      ]);

  final DilTanimi tanim;

  /// Yalnız bu dile ait kurslar.
  final List<Kurs> kurslar;

  List<SozlukMaddesi>? _maddeler;
  Sozluk? _sozluk;

  /// Paket yüklendi mi (maddeler üretildi mi)?
  bool get yuklendi => _maddeler != null;

  /// Bu dilin ham maddeleri (kök/sıklık hesaplanmamış); ilk erişimde üretilir.
  List<SozlukMaddesi> get maddeler =>
      _maddeler ??= List.unmodifiable(Sozluk.kurslarMaddeleri(kurslar));

  /// Yalnız bu dilin aranabilir sözlüğü (kök ve sıklık hesaplı).
  Sozluk get sozluk => _sozluk ??= Sozluk(maddeler);

  @override
  String toString() =>
      'DilPaketi(${tanim.kod}, ${kurslar.length} kurs, '
      '${yuklendi ? _maddeler!.length : '?'} madde)';
}

/// Tüm dil paketleri; her paket ilk istendiğinde yüklenir.
class DilPaketleri {
  DilPaketleri(List<Kurs> kurslar)
    : _paketler = {for (final t in dilTanimlari) t.kod: DilPaketi(t, kurslar)};

  final Map<String, DilPaketi> _paketler;

  /// Tanımlı dil kodları ([dilTanimlari] sırasıyla).
  List<String> get kodlar => _paketler.keys.toList();

  /// Dilin paketi; tanımsız kod için null.
  DilPaketi? paket(String dil) => _paketler[dil];

  /// Kursu bulunan (boş olmayan) paketler.
  List<DilPaketi> get kullanilanlar => [
    for (final p in _paketler.values)
      if (p.kurslar.isNotEmpty) p,
  ];

  /// Şimdiye kadar yüklenen paketlerin dil kodları (testler için).
  List<String> get yuklenenler => [
    for (final e in _paketler.entries)
      if (e.value.yuklendi) e.key,
  ];

  Sozluk? _birlesik;

  /// Tüm dillerin birleşik sözlüğü (`Sozluk.kurslardan` ile aynı maddeler).
  Sozluk get sozluk =>
      _birlesik ??= Sozluk([for (final p in _paketler.values) ...p.maddeler]);
}
