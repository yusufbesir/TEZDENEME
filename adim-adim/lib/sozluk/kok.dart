/// İngilizce kök bulucu (saf Dart, kural tabanlı, hafif). Küçük düzensiz
/// fiil/çoğul/sıfat tablosu ve son ek kuralları: ies→ie/y, es/s çoğul, ed,
/// ing (çift ünsüz düşer: running→run; düşen e geri gelir: making→make),
/// er/est, ly. Güvenli kural: ek düşürme yalnız sonuç sıklık listesinde ya
/// da verilen bilinen kümede olduğunda uygulanır; kelime sıklık listesinde
/// ise hiç dokunulmaz. Tek kelimeye uygulanır; çok kelimeli ifadelerde
/// `ifade` noktalamayı ayırıp her kelimeyi ayrı köke indirir.
/// Amaç sözlük aramasında "went"→"go", "running"→"run" eşleşmesi; dilbilimsel
/// tamlık hedeflenmez.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'siklik.dart';

class IngilizceKok {
  IngilizceKok._();

  /// Düzensiz biçimler: çekimli → kök.
  static const Map<String, String> duzensizler = {
    // be
    'am': 'be', 'is': 'be', 'are': 'be', 'was': 'be', 'were': 'be',
    'been': 'be', 'being': 'be',
    // have / do / go
    'has': 'have', 'had': 'have', 'having': 'have',
    'does': 'do', 'did': 'do', 'done': 'do', 'doing': 'do',
    'went': 'go', 'gone': 'go', 'goes': 'go', 'going': 'go',
    // sık düzensiz fiiller
    'ate': 'eat', 'eaten': 'eat',
    'saw': 'see', 'seen': 'see', 'seeing': 'see',
    'came': 'come', 'coming': 'come',
    'took': 'take', 'taken': 'take',
    'got': 'get', 'gotten': 'get',
    'made': 'make',
    'said': 'say',
    'knew': 'know', 'known': 'know',
    'thought': 'think',
    'bought': 'buy',
    'brought': 'bring',
    'taught': 'teach',
    'caught': 'catch',
    'gave': 'give', 'given': 'give',
    'wrote': 'write', 'written': 'write',
    'ran': 'run',
    'spoke': 'speak', 'spoken': 'speak',
    'told': 'tell',
    'found': 'find',
    'left': 'leave',
    'felt': 'feel',
    'met': 'meet',
    'read': 'read',
    'sat': 'sit',
    'stood': 'stand',
    'began': 'begin', 'begun': 'begin',
    'drank': 'drink', 'drunk': 'drink',
    'slept': 'sleep',
    'woke': 'wake', 'woken': 'wake',
    'flew': 'fly', 'flown': 'fly',
    'drove': 'drive', 'driven': 'drive',
    'swam': 'swim', 'swum': 'swim',
    'sang': 'sing', 'sung': 'sing',
    'broke': 'break', 'broken': 'break',
    'chose': 'choose', 'chosen': 'choose',
    'forgot': 'forget', 'forgotten': 'forget',
    'understood': 'understand',
    'paid': 'pay',
    'sold': 'sell',
    'built': 'build',
    'sent': 'send',
    'spent': 'spend',
    'lost': 'lose',
    'held': 'hold',
    'kept': 'keep',
    // düzensiz çoğullar
    'children': 'child', 'men': 'man', 'women': 'woman', 'people': 'person',
    'feet': 'foot', 'teeth': 'tooth', 'mice': 'mouse', 'geese': 'goose',
    'knives': 'knife', 'wives': 'wife',
    'shelves': 'shelf',
    // düzensiz sıfat dereceleri
    'better': 'good', 'best': 'good',
    'worse': 'bad', 'worst': 'bad',
    'more': 'much', 'most': 'much',
    'less': 'little', 'least': 'little',
    'farther': 'far', 'further': 'far',
  };

  /// Ek kuralı uygulanmayacak kelimeler (ek gibi biten kökler).
  static const Set<String> _dokunma = {
    'morning',
    'evening',
    'nothing',
    'something',
    'anything',
    'everything',
    'during',
    'spring',
    'string',
    'thing',
    'ring',
    'king',
    'wing',
    'bring',
    'sing',
    'always',
    'perhaps',
    'sometimes',
    'news',
    'series',
    'species',
    'means',
    'shoes',
    'yes',
    'this',
    'his',
    'bus',
    'us',
    'need',
    'feed',
    'speed',
    'red',
    'bed',
    'seed',
    'indeed',
    'hundred',
    'only',
    'early',
    'family',
    'ugly',
    'fly',
    'july',
    'reply',
    'supply',
    'apply',
    'lonely',
    'water',
    'under',
    'over',
    'after',
    'other',
    'another',
    'never',
    'ever',
    'number',
    'mother',
    'father',
    'brother',
    'sister',
    'teacher',
    'letter',
    'paper',
    'river',
    'flower',
    'dinner',
    'summer',
    'winter',
    'together',
    'weather',
    'answer',
    'order',
    'remember',
    'computer',
    'west',
    'east',
    'rest',
    'test',
    'best',
    'guest',
    'forest',
    'interest',
    'honest',
    'chest',
  };

  static const String _unluler = 'aeiou';

  static bool _unlu(String c) => _unluler.contains(c);

  static bool _unluVar(String s) =>
      s.runes.any((r) => _unlu(String.fromCharCode(r)));

  /// Çift ünsüz sonunu tekler (runn→run); ll/ss/ff/zz korunur.
  static String _ciftDus(String s) {
    if (s.length < 3) return s;
    final son = s[s.length - 1];
    if (son == s[s.length - 2] && !_unlu(son) && !'lsfz'.contains(son)) {
      return s.substring(0, s.length - 1);
    }
    return s;
  }

  /// Kök adayı kabul edilir mi: en az 3 harf ve bilinen kümede ya da
  /// sıklık listesinde. [sadeceBilinen]: sıklık listesi yetmez (er/est
  /// adayları için: butter→but, offer→off, shower→show olmasın).
  static bool _kabul(
    String aday,
    Set<String> bilinen, {
    bool sadeceBilinen = false,
  }) {
    if (aday.length < 3) return false;
    if (bilinen.contains(aday)) return true;
    return !sadeceBilinen && siklikSirasi(aday) != null;
  }

  /// Adaylardan ilk kabul edileni döndürür; yoksa null.
  static String? _ilkKabul(Iterable<String> adaylar, Set<String> bilinen) {
    for (final a in adaylar) {
      if (_kabul(a, bilinen)) return a;
    }
    return null;
  }

  /// Fiil çekim gövdesi adayları: ham gövde, çift ünsüzü düşmüş, e eklenmiş.
  static Iterable<String> _govdeAdaylari(String g) => [g, _ciftDus(g), '${g}e'];

  /// Tek kelimenin kökü. Küçük harfe çevirir, kenarları atar. Kelime sıklık
  /// listesindeyse olduğu gibi köktür (left, butter, more). Ek düşürme
  /// yalnız sonuç bilinen kümede ya da sıklık listesindeyse uygulanır;
  /// aksi halde kelime değişmez (bias, whereas, christmas). [bilinen]:
  /// sözlükteki kelimeler gibi ek kabul kümesi (sıklık listesi her zaman
  /// kabul edilir; er/est adayları yalnız bilinen kümeyle kabul edilir).
  static String bul(String kelime, {Set<String> bilinen = const {}}) {
    final k = kelime.trim().toLowerCase();
    if (k.isEmpty) return k;
    if (siklikSirasi(k) != null) return k;
    final d = duzensizler[k];
    if (d != null) return d;
    if (k.length <= 3 || _dokunma.contains(k)) return k;

    String? govde;
    if (k.endsWith('ies') && k.length > 4) {
      final g = k.substring(0, k.length - 3);
      govde = _ilkKabul(['${g}ie', '${g}y'], bilinen);
    } else if (k.endsWith('ied') && k.length > 4) {
      final g = k.substring(0, k.length - 3);
      govde = _ilkKabul(['${g}y', '${g}ie'], bilinen);
    } else if (k.endsWith('ing') && k.length > 5) {
      final g = k.substring(0, k.length - 3);
      if (_unluVar(g) && !_unlu(g[g.length - 1])) {
        govde = _ilkKabul(_govdeAdaylari(g), bilinen);
      }
    } else if (k.endsWith('ed') && k.length > 4) {
      final g = k.substring(0, k.length - 2);
      if (_unluVar(g) && !_unlu(g[g.length - 1])) {
        govde = _ilkKabul(_govdeAdaylari(g), bilinen);
      }
    } else if ((k.endsWith('est') && k.length > 5) ||
        (k.endsWith('er') && k.length > 4)) {
      // er/est belirsizdir (offer, shower, butter): yalnız bilinen kümede.
      final g = k.substring(0, k.length - (k.endsWith('est') ? 3 : 2));
      for (final aday in [g, '${g}e', _ciftDus(g)]) {
        if (_kabul(aday, bilinen, sadeceBilinen: true)) {
          govde = aday;
          break;
        }
      }
    } else if (k.endsWith('ily') && k.length > 5) {
      govde = _ilkKabul(['${k.substring(0, k.length - 3)}y'], bilinen);
    } else if (k.endsWith('ly') && k.length > 5) {
      final g = k.substring(0, k.length - 2);
      if (!_unlu(g[g.length - 1])) govde = _ilkKabul([g], bilinen);
    } else if (k.endsWith('sses')) {
      govde = _ilkKabul([k.substring(0, k.length - 2)], bilinen);
    } else if (k.endsWith('es') &&
        k.length > 4 &&
        (k.endsWith('shes') ||
            k.endsWith('ches') ||
            k.endsWith('xes') ||
            k.endsWith('zes') ||
            k.endsWith('oes'))) {
      govde = _ilkKabul([k.substring(0, k.length - 2)], bilinen);
    } else if (k.endsWith('s') &&
        !k.endsWith('ss') &&
        !k.endsWith('us') &&
        !k.endsWith('is')) {
      govde = _ilkKabul([k.substring(0, k.length - 1)], bilinen);
    }
    return govde ?? k;
  }

  /// Kelime ayırıcı: harf dizileri; içteki kesme işareti korunur (it's).
  static final RegExp _kelime = RegExp(r"[a-z]+(?:'[a-z]+)?");

  /// Çok kelimeli ifade: noktalama ayrılır, her kelime ayrı köke indirilir,
  /// tek boşlukla birleştirilir ("studied." → "study"; "it's" değişmez).
  static String ifade(String metin, {Set<String> bilinen = const {}}) {
    final kucuk = metin.trim().toLowerCase();
    return _kelime
        .allMatches(kucuk)
        .map((e) => bul(e.group(0)!, bilinen: bilinen))
        .join(' ');
  }
}
