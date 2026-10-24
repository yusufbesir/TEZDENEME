/// Dil tanımları (ÖZELLİK 60): her dilin sözlük kodu, görünen adı, kurs
/// kimliği öneki, sesli okuma (TTS) dili ve kısa adı tek tabloda durur. Yeni
/// bir dil eklemek için yalnız buraya bir satır eklenir (ve o dilin kursu
/// `lib/icerik` altına konur); sözlük, paket ve ekranlar tablodan okur.
/// Saf Dart; Flutter bağımlılığı yoktur.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/icerik.dart';

/// Bir dilin tanımı. [kursOnek] kurs kimliğinin ilk parçasıdır
/// ('almanca-1' -> 'almanca'); kod kursları öneke değil alana göre tanınır.
class DilTanimi {
  const DilTanimi({
    required this.kod,
    required this.ad,
    required this.kursOnek,
    required this.ttsDili,
    required this.kisaAd,
    this.kodKursu = false,
  });

  /// Sözlük dil kodu: 'en', 'de', 'ko', 'ja', 'zh', 'kod'.
  final String kod;

  /// Filtre çipinde görünen ad.
  final String ad;

  /// Kurs kimliği öneki; kod tanımında boş.
  final String kursOnek;

  /// Sesli okuma dili (BCP-47); kod için boş (sesli okunmaz).
  final String ttsDili;

  /// Kurs kısa adı öneki ('İng.', 'Alm.').
  final String kisaAd;

  /// Programlama (kod) kurslarının tanımı mı?
  final bool kodKursu;
}

/// Tanımlı diller; sıra ekranlardaki çip sırasıdır. 'en' varsayılandır: öneki
/// tanınmayan dil kursu İngilizce sayılır (eski davranış).
const List<DilTanimi> dilTanimlari = [
  DilTanimi(
    kod: 'en',
    ad: 'İngilizce',
    kursOnek: 'ingilizce',
    ttsDili: 'en-US',
    kisaAd: 'İng.',
  ),
  DilTanimi(
    kod: 'de',
    ad: 'Almanca',
    kursOnek: 'almanca',
    ttsDili: 'de-DE',
    kisaAd: 'Alm.',
  ),
  DilTanimi(
    kod: 'fr',
    ad: 'Fransızca',
    kursOnek: 'fransizca',
    ttsDili: 'fr-FR',
    kisaAd: 'Fra.',
  ),
  DilTanimi(
    kod: 'ru',
    ad: 'Rusça',
    kursOnek: 'rusca',
    ttsDili: 'ru-RU',
    kisaAd: 'Rus.',
  ),
  DilTanimi(
    kod: 'ko',
    ad: 'Korece',
    kursOnek: 'korece',
    ttsDili: 'ko-KR',
    kisaAd: 'Kor.',
  ),
  DilTanimi(
    kod: 'ja',
    ad: 'Japonca',
    kursOnek: 'japonca',
    ttsDili: 'ja-JP',
    kisaAd: 'Jap.',
  ),
  DilTanimi(
    kod: 'zh',
    ad: 'Çince',
    kursOnek: 'cince',
    ttsDili: 'zh-CN',
    kisaAd: 'Çin.',
  ),
  DilTanimi(
    kod: 'kod',
    ad: 'Kod',
    kursOnek: '',
    ttsDili: '',
    kisaAd: '',
    kodKursu: true,
  ),
];

/// Dil kodundan tanım; bilinmeyen kod için null.
DilTanimi? dilTanimi(String kod) {
  for (final t in dilTanimlari) {
    if (t.kod == kod) return t;
  }
  return null;
}

/// Kursun sözlük dil kodu: kod kursu 'kod'; öneki tanımlı bir dile aitse o dil;
/// aksi halde 'en'.
String kursDilKodu(Kurs kurs) {
  if (kurs.alan == KursAlani.kod) return 'kod';
  final onek = kurs.id.split('-').first;
  for (final t in dilTanimlari) {
    if (!t.kodKursu && t.kursOnek == onek) return t.kod;
  }
  return 'en';
}
