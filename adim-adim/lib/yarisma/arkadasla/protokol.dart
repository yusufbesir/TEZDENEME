/// Arkadaşla düello için ağdan bağımsız mesaj protokolü.
/// Saf Dart; Flutter ve dart:io'ya bağımlı değildir. Mesajlar değiştirilemez.
/// Karşıdan gelen her şey güvenilmeyen girdidir: bozuk, uzun ya da yanlış
/// tipli mesaj çökme yerine [ProtokolHatasi] döndürür; istisna fırlatmaz.
/// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım özellikler#cihaz] Claude. Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:convert';

import 'package:crypto/crypto.dart';

/// Protokol sürümü; iki taraf aynı sürümü konuşmuyorsa düello başlamaz.
const int protokolSurumu = 1;

/// Tek mesajın en fazla UTF-8 bayt sayısı.
const int enFazlaMesajBayt = 4096;

/// Takma adın en fazla karakter sayısı.
const int enFazlaTakmaAd = 24;

/// Bir düellodaki en fazla soru sayısı.
const int enFazlaSoruSayisi = 20;

/// Soru kimliğinin en fazla uzunluğu.
const int enFazlaKimlikUzunlugu = 64;

/// Bir cevabın geçerli kabul edilen en uzun süresi (ms); üstü reddedilir.
const int enFazlaGecenMs = 600000;

/// Mesajdaki en fazla JSON iç içe geçme derinliği (gerçek mesajlar ≤ 3).
const int enFazlaDerinlik = 8;

/// Bir düellodaki gerçekçi en yüksek puan: soru başına 10 puan + 5 hız bonusu.
const int enFazlaPuan = enFazlaSoruSayisi * 15;

/// Soru kimliklerinden havuz özeti (sha256, 64 onaltılık karakter). Kimlik
/// SIRASI önemlidir: iki cihaz aynı soru bankası sırasıyla çağırmalıdır.
String soruBankasiOzetiHesapla(Iterable<String> idler) =>
    sha256.convert(utf8.encode(idler.join('\n'))).toString();

final RegExp _ozetDeseni = RegExp(r'^[0-9a-f]{64}$');

/// [ProtokolMesaji.coz] sonucu: [ProtokolTamam] ya da [ProtokolHatasi].
sealed class ProtokolSonucu {
  const ProtokolSonucu();
}

/// Çözme başarılı.
class ProtokolTamam extends ProtokolSonucu {
  const ProtokolTamam(this.mesaj);

  final ProtokolMesaji mesaj;
}

/// Çözme başarısız. [neden] kısa, kararlı bir kod (ör. 'bozuk_json').
class ProtokolHatasi extends ProtokolSonucu {
  const ProtokolHatasi(this.neden);

  final String neden;

  @override
  String toString() => 'ProtokolHatasi($neden)';
}

/// Düello mesajı (taraflar arası).
sealed class ProtokolMesaji {
  const ProtokolMesaji();

  /// Mesaj türü (JSON'daki `t` alanı).
  String get tur;

  /// Türe özgü alanlar (`t` hariç).
  Map<String, Object?> alanlar();

  /// Tek satır JSON metni.
  String kodla() => jsonEncode({'t': tur, ...alanlar()});

  /// Karşıdan gelen metni çözer. Metin olmayan girdi 'metin_degil' olur.
  /// Hiçbir durumda istisna fırlatmaz.
  static ProtokolSonucu coz(Object? girdi) {
    if (girdi is! String) return const ProtokolHatasi('metin_degil');
    // UTF-16 birim sayısı bayt sayısından büyük olamaz; dev dizeyi bayta
    // çevirip belleği şişirmeden önce ele.
    if (girdi.length > enFazlaMesajBayt ||
        utf8.encode(girdi).length > enFazlaMesajBayt) {
      return const ProtokolHatasi('cok_buyuk');
    }
    if (_enFazlaDerinlik(girdi) > enFazlaDerinlik) {
      return const ProtokolHatasi('cok_derin');
    }
    Object? ham;
    try {
      ham = jsonDecode(girdi);
    } on FormatException {
      return const ProtokolHatasi('bozuk_json');
    } catch (_) {
      // Beklenmeyen çözücü hatası da çökme değil, hata sonucu olur.
      return const ProtokolHatasi('bozuk_json');
    }
    if (ham is! Map) return const ProtokolHatasi('nesne_degil');
    return _coz(ham);
  }

  /// Zaten çözülmüş bir haritadan mesaj üretir (boyut sınırı aynen geçerli).
  static ProtokolSonucu fromJson(Map<Object?, Object?> ham) {
    try {
      if (utf8.encode(jsonEncode(ham)).length > enFazlaMesajBayt) {
        return const ProtokolHatasi('cok_buyuk');
      }
    } on Object {
      return const ProtokolHatasi('bozuk_json');
    }
    return _coz(ham);
  }
}

/// Bağlantı kurulur kurulmaz her iki tarafın gönderdiği ilk mesaj.
class Merhaba extends ProtokolMesaji {
  const Merhaba({
    required this.surum,
    required this.soruBankasiOzeti,
    required this.takmaAd,
  });

  final int surum;
  final String soruBankasiOzeti;
  final String takmaAd;

  @override
  String get tur => 'merhaba';

  @override
  Map<String, Object?> alanlar() => {
    'surum': surum,
    'ozet': soruBankasiOzeti,
    'takmaAd': takmaAd,
  };
}

/// "Düelloya hazırım" mesajı.
class Hazir extends ProtokolMesaji {
  const Hazir();

  @override
  String get tur => 'hazir';

  @override
  Map<String, Object?> alanlar() => const {};
}

/// Ev sahibinin gönderdiği soru dizisi. [ilkSiraSende] gönderenin bakış
/// açısındandır: true ise ilk soruda önce gönderen yanıtlar.
class DuelloBasla extends ProtokolMesaji {
  const DuelloBasla({required this.soruIdleri, required this.ilkSiraSende});

  final List<String> soruIdleri;
  final bool ilkSiraSende;

  @override
  String get tur => 'basla';

  @override
  Map<String, Object?> alanlar() => {
    'soruIdleri': soruIdleri,
    'ilkSiraSende': ilkSiraSende,
  };
}

/// Gönderenin bir soruya verdiği cevap.
class Cevap extends ProtokolMesaji {
  const Cevap({
    required this.soruId,
    required this.secenek,
    required this.gecenMs,
  });

  final String soruId;

  /// 0..3.
  final int secenek;
  final int gecenMs;

  @override
  String get tur => 'cevap';

  @override
  Map<String, Object?> alanlar() => {
    'soruId': soruId,
    'secenek': secenek,
    'gecenMs': gecenMs,
  };
}

/// Düello sonunda gönderenin kendi hesapladığı puan; çapraz doğrulama için.
class Sonuc extends ProtokolMesaji {
  const Sonuc({required this.benimPuanim});

  final int benimPuanim;

  @override
  String get tur => 'sonuc';

  @override
  Map<String, Object?> alanlar() => {'benimPuanim': benimPuanim};
}

/// Gönderen düelloyu bırakıyor.
class Ayril extends ProtokolMesaji {
  const Ayril();

  @override
  String get tur => 'ayril';

  @override
  Map<String, Object?> alanlar() => const {};
}

ProtokolSonucu _coz(Map<Object?, Object?> ham) {
  final t = ham['t'];
  if (t is! String) return const ProtokolHatasi('tur_yok');
  switch (t) {
    case 'merhaba':
      final surum = ham['surum'];
      if (surum is! int || surum < 0 || surum > 1000) {
        return const ProtokolHatasi('surum_hatali');
      }
      final ozet = ham['ozet'];
      if (ozet is! String || !_ozetDeseni.hasMatch(ozet)) {
        return const ProtokolHatasi('ozet_hatali');
      }
      final ad = _takmaAd(ham['takmaAd']);
      if (ad == null) return const ProtokolHatasi('takma_ad_hatali');
      return ProtokolTamam(
        Merhaba(surum: surum, soruBankasiOzeti: ozet, takmaAd: ad),
      );
    case 'hazir':
      return const ProtokolTamam(Hazir());
    case 'basla':
      final idler = ham['soruIdleri'];
      if (idler is! List ||
          idler.isEmpty ||
          idler.length > enFazlaSoruSayisi) {
        return const ProtokolHatasi('soru_idleri_hatali');
      }
      final liste = <String>[];
      for (final e in idler) {
        if (!_kimlikGecerli(e)) return const ProtokolHatasi('soru_id_hatali');
        liste.add(e as String);
      }
      if (liste.toSet().length != liste.length) {
        return const ProtokolHatasi('soru_idleri_hatali');
      }
      final sira = ham['ilkSiraSende'];
      if (sira is! bool) return const ProtokolHatasi('sira_hatali');
      return ProtokolTamam(
        DuelloBasla(soruIdleri: List.unmodifiable(liste), ilkSiraSende: sira),
      );
    case 'cevap':
      final id = ham['soruId'];
      if (!_kimlikGecerli(id)) return const ProtokolHatasi('soru_id_hatali');
      final s = ham['secenek'];
      if (s is! int || s < 0 || s > 3) {
        return const ProtokolHatasi('secenek_hatali');
      }
      final ms = ham['gecenMs'];
      if (ms is! int || ms < 0 || ms > enFazlaGecenMs) {
        return const ProtokolHatasi('sure_hatali');
      }
      return ProtokolTamam(
        Cevap(soruId: id as String, secenek: s, gecenMs: ms),
      );
    case 'sonuc':
      final p = ham['benimPuanim'];
      if (p is! int || p < 0 || p > enFazlaPuan) {
        return const ProtokolHatasi('puan_hatali');
      }
      return ProtokolTamam(Sonuc(benimPuanim: p));
    case 'ayril':
      return const ProtokolTamam(Ayril());
    default:
      return const ProtokolHatasi('bilinmeyen_tur');
  }
}

/// Arayüzde ad taklidine ya da metin yönü kandırmacasına yol açan karakterler:
/// kontrol (C0/C1), sıfır genişlikli, satır/paragraf ayırıcı, bidi
/// denetimleri ve BOM.
bool _kontrolKarakteriVar(String s) {
  for (final c in s.runes) {
    if (c < 0x20 ||
        (c >= 0x7f && c <= 0x9f) ||
        (c >= 0x200b && c <= 0x200f) ||
        (c >= 0x2028 && c <= 0x202e) ||
        (c >= 0x2060 && c <= 0x206f) ||
        c == 0xfeff) {
      return true;
    }
  }
  return false;
}

bool _kimlikGecerli(Object? d) =>
    d is String &&
    d.isNotEmpty &&
    d.runes.length <= enFazlaKimlikUzunlugu &&
    !_kontrolKarakteriVar(d);

String? _takmaAd(Object? d) {
  if (d is! String) return null;
  // Önce özgün metne bak: BOM ve U+2028 gibi karakterler Dart'ta boşluk
  // sayıldığından daraltma onları düz boşluğa çevirip gizlerdi.
  if (_kontrolKarakteriVar(d)) return null;
  // Ardışık boşluklar teke iner; uzunluk UTF-16 birimi değil karakter sayılır.
  final temiz = d.trim().replaceAll(RegExp(r'\s+'), ' ');
  if (temiz.isEmpty || temiz.runes.length > enFazlaTakmaAd) return null;
  return temiz;
}

/// JSON iç içe geçme derinliğini (dize içindekiler sayılmadan) bulur. Kötü
/// niyetli çok derin dizilerin çözücüyü yormasını önlemek için kullanılır.
int _enFazlaDerinlik(String s) {
  var derinlik = 0;
  var en = 0;
  var dizeIcinde = false;
  var kacis = false;
  for (var i = 0; i < s.length; i++) {
    final c = s.codeUnitAt(i);
    if (dizeIcinde) {
      if (kacis) {
        kacis = false;
      } else if (c == 0x5c) {
        kacis = true;
      } else if (c == 0x22) {
        dizeIcinde = false;
      }
      continue;
    }
    if (c == 0x22) {
      dizeIcinde = true;
    } else if (c == 0x5b || c == 0x7b) {
      derinlik++;
      if (derinlik > en) en = derinlik;
    } else if (c == 0x5d || c == 0x7d) {
      derinlik--;
    }
  }
  return en;
}
