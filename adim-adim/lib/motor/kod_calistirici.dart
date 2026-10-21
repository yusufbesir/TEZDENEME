/// Kod çalıştırıcı arayüzü ve JavaScript güvenlik hazırlığı (ÖZELLİK 69).
///
/// Saf Dart (Flutter'a bağımlı değil). Gerçek motor `lib/servis/js_motoru.dart`
/// içindeki QuickJS uygulamasıdır; testlerde sahte uygulama kullanılır.
///
/// Güvenlik: kullanıcı kodu ağ/dosya erişimi olmayan yalın bir JS bağlamında
/// çalışır (QuickJS'in std/os modülleri yüklenmez; fetch, XMLHttpRequest,
/// require, setTimeout yoktur). Sonsuz döngüye karşı [JsKoruma.hazirla] her
/// döngü ve fonksiyon gövdesinin başına bir süre/adım bekçisi ekler; bekçi
/// tetiklenince her çağrıda yeniden fırlatır (catch ile yutulamaz). eval,
/// Function yapıcısı, import ve require reddedilir.
library;

import '../model/kod_calisma.dart';

/// Bir dili (şimdilik yalnız 'js') çalıştıran motor.
abstract class KodCalistirici {
  const KodCalistirici();

  /// Kullanıcıya gösterilen ad (ör. "QuickJS (çevrimdışı)").
  String get ad;

  /// [kod]u çalıştırır; asla fırlatmaz. Motor yoksa
  /// [KodCalismaSonucu.motorsuz] döner.
  Future<KodCalismaSonucu> calistir(String kod);
}

/// Motoru olmayan ortam (test, desteklenmeyen platform): her çalıştırma
/// "motor yok" döner; ders türü çıktı tahminine düşer.
class MotorsuzCalistirici extends KodCalistirici {
  const MotorsuzCalistirici();

  @override
  String get ad => 'Motor yok';

  @override
  Future<KodCalismaSonucu> calistir(String kod) async =>
      KodCalismaSonucu.motorsuz(kod);
}

/// [JsKoruma.hazirla] sonucu: [betik] çalıştırılacak tam betik (sonucu JSON
/// dizesi döndürür) ya da [hata] (kod reddedildi).
typedef JsHazirlik = ({String? betik, String? hata});

abstract final class JsKoruma {
  /// Varsayılan süre sınırı (bekçinin kestiği an).
  static const int varsayilanSureMs = 2000;

  /// Bekçi çağrısı üst sınırı (döngü turu + fonksiyon çağrısı).
  static const int enCokAdim = 2000000;

  /// Kod ve çıktı sınırları.
  static const int kodEnCokKarakter = 20000;
  static const int ciktiEnCokKarakter = 10000;
  static const int ciktiEnCokSatir = 500;

  /// Bekçi tetiklenince fırlatılan özel ileti.
  static const String zamanIletisi = '__ADIM_ZAMAN_ASIMI__';

  static const String _bekci = '__adimK();';

  static const _yasakKelimeler = {
    'eval': 'eval kullanılamaz',
    'Function': 'Function yapıcısı kullanılamaz',
    'import': 'import kullanılamaz (modül yüklenmez)',
    'require': 'require kullanılamaz (modül yüklenmez)',
  };

  /// Kodu denetler, bekçileri ekler ve çalıştırma betiğine sarar.
  static JsHazirlik hazirla(String kod, {int sureMs = varsayilanSureMs}) {
    if (kod.length > kodEnCokKarakter) {
      return (
        betik: null,
        hata: 'Kod çok uzun (en çok $kodEnCokKarakter karakter)',
      );
    }
    final List<_Simge> simgeler;
    try {
      simgeler = _Tarayici(kod).tara();
    } on FormatException catch (e) {
      return (betik: null, hata: e.message);
    }
    final islenmis = _bekcileriEkle(kod, simgeler);
    if (islenmis.hata != null) return (betik: null, hata: islenmis.hata);
    return (betik: _sar(islenmis.kod!, sureMs), hata: null);
  }

  /// Bekçiler eklenmiş kod (test ve hata ayıklama için).
  static ({String? kod, String? hata}) bekciliKod(String kod) {
    try {
      return _bekcileriEkle(kod, _Tarayici(kod).tara());
    } on FormatException catch (e) {
      return (kod: null, hata: e.message);
    }
  }

  static ({String? kod, String? hata}) _bekcileriEkle(
    String kod,
    List<_Simge> s,
  ) {
    // Parantez ve süslü parantez eşleri.
    final es = List<int>.filled(s.length, -1);
    final yigin = <int>[];
    for (var i = 0; i < s.length; i++) {
      final m = s[i].metin;
      if (s[i].tur != _SimgeTuru.isaret) continue;
      if (m == '(' || m == '{' || m == '[') {
        yigin.add(i);
      } else if (m == ')' || m == '}' || m == ']') {
        if (yigin.isEmpty) {
          return (kod: null, hata: 'Parantezler dengeli değil');
        }
        final ac = yigin.removeLast();
        final beklenen = switch (m) {
          ')' => '(',
          '}' => '{',
          _ => '[',
        };
        if (s[ac].metin != beklenen) {
          return (kod: null, hata: 'Parantezler dengeli değil');
        }
        es[ac] = i;
        es[i] = ac;
      }
    }
    if (yigin.isNotEmpty) return (kod: null, hata: 'Parantezler dengeli değil');

    bool isaret(int i, String m) =>
        i >= 0 &&
        i < s.length &&
        s[i].tur == _SimgeTuru.isaret &&
        s[i].metin == m;
    bool kelime(int i, String m) =>
        i >= 0 &&
        i < s.length &&
        s[i].tur == _SimgeTuru.kelime &&
        s[i].metin == m;
    bool ozellikMi(int i) => isaret(i - 1, '.') || isaret(i - 1, '?.');

    // Ekleme: konum -> metin; değiştirme: simge indeksi -> metin.
    final ekle = <int, String>{};
    final degistir = <int, String>{};
    final doKapanislari = <int>{};

    for (var i = 0; i < s.length; i++) {
      final t = s[i];
      if (t.tur == _SimgeTuru.kelime && !ozellikMi(i)) {
        final yasak = _yasakKelimeler[t.metin];
        if (yasak != null) {
          // `Function` yalnız çağrı/yapıcı olarak; `import`/`require` her zaman.
          if (t.metin != 'Function' || isaret(i + 1, '(')) {
            return (kod: null, hata: yasak);
          }
        }
      }
      if (t.tur == _SimgeTuru.kelime &&
          t.metin == 'constructor' &&
          ozellikMi(i)) {
        return (kod: null, hata: '.constructor erişimi kullanılamaz');
      }
      if (t.tur != _SimgeTuru.kelime || ozellikMi(i)) continue;
      if (t.metin == 'do') {
        if (!isaret(i + 1, '{')) {
          return (kod: null, hata: 'do gövdesini süslü parantez { } içine al');
        }
        doKapanislari.add(es[i + 1]);
      } else if (t.metin == 'for' || t.metin == 'while') {
        var p = i + 1;
        if (t.metin == 'for' && kelime(p, 'await')) p++;
        if (!isaret(p, '(')) continue;
        final kapa = es[p];
        final govde = kapa + 1;
        if (isaret(govde, '{')) continue; // bekçi '{' kuralıyla eklenir
        if (t.metin == 'while' && doKapanislari.contains(i - 1)) continue;
        if (isaret(govde, ';')) {
          degistir[govde] = '{$_bekci}';
          continue;
        }
        return (
          kod: null,
          hata: '${t.metin} döngüsünün gövdesini süslü parantez { } içine al',
        );
      }
    }

    for (var i = 0; i < s.length; i++) {
      if (!isaret(i, '{')) continue;
      final onceki = i - 1;
      var bekci = false;
      if (isaret(onceki, ')')) {
        final ac = es[onceki];
        bekci = !kelime(ac - 1, 'switch');
      } else if (isaret(onceki, '=>')) {
        bekci = true;
      } else if (onceki >= 0 && s[onceki].tur == _SimgeTuru.kelime) {
        bekci = const {
          'else',
          'try',
          'finally',
          'do',
        }.contains(s[onceki].metin);
      }
      if (bekci) ekle[s[i].bitis] = _bekci;
    }

    final b = StringBuffer();
    var konum = 0;
    final noktalar = <int>{
      ...ekle.keys,
      for (final i in degistir.keys) s[i].baslangic,
    }.toList()..sort();
    final degistirKonum = {
      for (final e in degistir.entries) s[e.key].baslangic: e,
    };
    for (final n in noktalar) {
      b.write(kod.substring(konum, n));
      konum = n;
      final d = degistirKonum[n];
      if (d != null) {
        b.write(d.value);
        konum = s[d.key].bitis;
      }
      final e = ekle[n];
      if (e != null) b.write(e);
    }
    b.write(kod.substring(konum));
    return (kod: b.toString(), hata: null);
  }

  /// Kullanıcı kodunu çalıştırma betiğine sarar. Betik sonucu JSON dizesidir:
  /// {"c": çıktı, "h": hata iletisi ya da null, "z": zaman aşımı}.
  static String _sar(String kod, int sureMs) =>
      '''
(function () {
  var __adimSatir = [], __adimBoy = 0, __adimKesildi = false;
  function __adimBicim(v) {
    var t = typeof v;
    if (t === "string") return v;
    if (t === "number" || t === "boolean" || t === "bigint" || t === "symbol" || v === undefined || v === null) return String(v);
    if (t === "function") return "[Function]";
    try { var j = JSON.stringify(v); if (j !== undefined) return j; } catch (e) {}
    return String(v);
  }
  function __adimYaz(args) {
    if (__adimKesildi) return;
    var p = [];
    for (var i = 0; i < args.length; i++) p.push(__adimBicim(args[i]));
    var s = p.join(" ");
    if (__adimSatir.length >= $ciktiEnCokSatir || __adimBoy + s.length > $ciktiEnCokKarakter) {
      __adimKesildi = true;
      __adimSatir.push("… (çıktı kısaltıldı)");
      return;
    }
    __adimBoy += s.length + 1;
    __adimSatir.push(s);
  }
  var __adimBitis = Date.now() + $sureMs, __adimSay = 0, __adimDur = false;
  function __adimK() {
    if (__adimDur || ++__adimSay > $enCokAdim || Date.now() > __adimBitis) {
      __adimDur = true;
      throw new Error("$zamanIletisi");
    }
  }
  var console = {
    log: function () { __adimYaz(arguments); },
    info: function () { __adimYaz(arguments); },
    warn: function () { __adimYaz(arguments); },
    error: function () { __adimYaz(arguments); }
  };
  var setTimeout = undefined, setInterval = undefined, clearTimeout = undefined,
      clearInterval = undefined, sendMessage = undefined, fetch = undefined,
      XMLHttpRequest = undefined;
  var __adimHata = null;
  try {
    (function () {
$kod
    })();
  } catch (e) {
    if (__adimDur) __adimHata = "$zamanIletisi";
    else __adimHata = (e && e.name ? e.name + ": " + e.message : String(e));
  }
  return JSON.stringify({ c: __adimSatir.join("\\n"), h: __adimHata, z: __adimDur });
})()
''';

  /// Betiğin döndürdüğü JSON'u sonuca çevirir (geçersizse hata sonucu).
  static KodCalismaSonucu sonucCoz(String kod, Object? ham) {
    if (ham is! Map) {
      return KodCalismaSonucu(kod: kod, hata: 'Motor geçersiz sonuç döndürdü');
    }
    final cikti = ham['c'] is String ? ham['c'] as String : '';
    final z = ham['z'] == true || ham['h'] == zamanIletisi;
    final h = ham['h'];
    return KodCalismaSonucu(
      kod: kod,
      cikti: cikti,
      zamanAsimi: z,
      hata: z
          ? 'Süre sınırı aşıldı (sonsuz döngü olabilir)'
          : (h is String ? h : null),
    );
  }
}

enum _SimgeTuru { kelime, isaret, deger }

class _Simge {
  const _Simge(this.tur, this.metin, this.baslangic, this.bitis);
  final _SimgeTuru tur;
  final String metin;
  final int baslangic;
  final int bitis;
}

/// Küçük JS sözcük tarayıcısı: dize, şablon dizesi (`${}` iç kodu dahil),
/// yorum ve düzenli ifade değişmezlerini atlar; kelime ve işaretleri verir.
class _Tarayici {
  _Tarayici(this.k);
  final String k;
  int i = 0;
  final List<_Simge> s = [];

  /// Şablon ifadesi içindeyken her `${` için süslü parantez derinliği.
  final List<int> _sablonDerinlik = [];

  static final _kelimeBas = RegExp(r'[A-Za-z_$À-￿]');
  static final _kelimeDevam = RegExp(r'[A-Za-z0-9_$À-￿]');
  static const _ucluIsaret = [
    '===',
    '!==',
    '...',
    '**=',
    '>>>',
    '<<=',
    '>>=',
    '&&=',
    '||=',
    '??=',
  ];
  static const _ikiliIsaret = [
    '=>',
    '==',
    '!=',
    '<=',
    '>=',
    '&&',
    '||',
    '??',
    '?.',
    '++',
    '--',
    '+=',
    '-=',
    '*=',
    '/=',
    '%=',
    '**',
    '<<',
    '>>',
    '&=',
    '|=',
    '^=',
  ];
  static const _regexOncesiKelime = {
    'return',
    'typeof',
    'case',
    'do',
    'else',
    'in',
    'of',
    'new',
    'delete',
    'void',
    'throw',
    'instanceof',
    'yield',
    'await',
  };

  List<_Simge> tara() {
    while (i < k.length) {
      final c = k[i];
      if (c == ' ' || c == '\t' || c == '\n' || c == '\r') {
        i++;
      } else if (c == '/' && _bak(1) == '/') {
        while (i < k.length && k[i] != '\n') {
          i++;
        }
      } else if (c == '/' && _bak(1) == '*') {
        final son = k.indexOf('*/', i + 2);
        if (son < 0) throw const FormatException('Kapanmamış /* yorum');
        i = son + 2;
      } else if (c == '"' || c == "'") {
        _dize(c);
      } else if (c == '`') {
        i++;
        _sablon();
      } else if (c == '/' && _regexOlabilir()) {
        _regex();
      } else if (_kelimeBas.hasMatch(c)) {
        final b = i;
        while (i < k.length && _kelimeDevam.hasMatch(k[i])) {
          i++;
        }
        s.add(_Simge(_SimgeTuru.kelime, k.substring(b, i), b, i));
      } else if (RegExp(r'[0-9]').hasMatch(c) ||
          (c == '.' && RegExp(r'[0-9]').hasMatch(_bak(1)))) {
        final b = i;
        while (i < k.length && RegExp(r'[0-9A-Za-z_.]').hasMatch(k[i])) {
          i++;
        }
        s.add(_Simge(_SimgeTuru.deger, k.substring(b, i), b, i));
      } else if (c == '}' &&
          _sablonDerinlik.isNotEmpty &&
          _sablonDerinlik.last == 0) {
        // Şablon ifadesinin sonu: şablon dizesine dön.
        _sablonDerinlik.removeLast();
        i++;
        _sablon();
      } else {
        final b = i;
        var m = c;
        for (final aday in [..._ucluIsaret, ..._ikiliIsaret]) {
          if (k.startsWith(aday, i)) {
            m = aday;
            break;
          }
        }
        // '?.' ardından rakam gelirse üçlü işleçtir ('a?.5:1').
        if (m == '?.' && RegExp(r'[0-9]').hasMatch(_bak(2))) m = '?';
        i += m.length;
        if (_sablonDerinlik.isNotEmpty) {
          if (m == '{') _sablonDerinlik[_sablonDerinlik.length - 1]++;
          if (m == '}') _sablonDerinlik[_sablonDerinlik.length - 1]--;
        }
        s.add(_Simge(_SimgeTuru.isaret, m, b, i));
      }
    }
    if (_sablonDerinlik.isNotEmpty) {
      throw const FormatException('Kapanmamış şablon dizesi');
    }
    return s;
  }

  String _bak(int n) => i + n < k.length ? k[i + n] : '';

  void _dize(String tirnak) {
    final b = i;
    i++;
    while (i < k.length && k[i] != tirnak) {
      if (k[i] == '\\') i++;
      if (i < k.length && k[i] == '\n') {
        throw const FormatException('Kapanmamış dize');
      }
      i++;
    }
    if (i >= k.length) throw const FormatException('Kapanmamış dize');
    i++;
    s.add(_Simge(_SimgeTuru.deger, k.substring(b, i), b, i));
  }

  /// Açılış backtick'inden (ya da `}`den) sonra: dize sonuna ya da `${`e kadar.
  void _sablon() {
    final b = i;
    while (i < k.length) {
      final c = k[i];
      if (c == '\\') {
        i += 2;
        continue;
      }
      if (c == '`') {
        i++;
        s.add(_Simge(_SimgeTuru.deger, '`', b, i));
        return;
      }
      if (c == r'$' && _bak(1) == '{') {
        i += 2;
        s.add(_Simge(_SimgeTuru.deger, '`', b, i));
        _sablonDerinlik.add(0);
        return;
      }
      i++;
    }
    throw const FormatException('Kapanmamış şablon dizesi');
  }

  bool _regexOlabilir() {
    if (s.isEmpty) return true;
    final o = s.last;
    if (o.tur == _SimgeTuru.deger) return false;
    if (o.tur == _SimgeTuru.kelime) {
      return _regexOncesiKelime.contains(o.metin);
    }
    return !const {')', ']', '}', '++', '--'}.contains(o.metin);
  }

  void _regex() {
    final b = i;
    i++;
    var sinif = false;
    while (i < k.length) {
      final c = k[i];
      if (c == '\n') throw const FormatException('Kapanmamış düzenli ifade');
      if (c == '\\') {
        i += 2;
        continue;
      }
      if (c == '[') sinif = true;
      if (c == ']') sinif = false;
      if (c == '/' && !sinif) break;
      i++;
    }
    if (i >= k.length) throw const FormatException('Kapanmamış düzenli ifade');
    i++;
    while (i < k.length && RegExp(r'[a-z]').hasMatch(k[i])) {
      i++;
    }
    s.add(_Simge(_SimgeTuru.deger, k.substring(b, i), b, i));
  }
}
