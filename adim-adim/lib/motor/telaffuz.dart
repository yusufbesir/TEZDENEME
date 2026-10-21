/// Telaffuz puanlama (ÖZELLİK 8.7): hedef cümle ile söylenen (tanınan) metni
/// kelime kelime karşılaştırır. Saf işlevdir; motor ve arayüzden bağımsızdır.
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

/// Kelime düzeyinde "doğru" sayılma eşiği (eşleşen / hedef kelime).
const double telaffuzEsigi = 0.8;

/// Normalleştirir: küçük harf, kıvrık kesme düzleştirme, harf-rakam-kesme
/// dışını boşluk yap (Hangıl/Kana/Han harfleri korunur; kana ve han harfleri
/// tek tek birim sayılır). Kelime listesi döner.
List<String> telaffuzKelimeleri(String s) {
  final r = s
      .replaceAll(RegExp('[‘’ʼ´`]'), "'")
      .replaceAll('İ', 'i')
      .replaceAll('I', 'i')
      .toLowerCase()
      // Hangıl, Kana ve Han harfleri korunur (Korece/Japonca/Çince Soyle).
      .replaceAll(RegExp(r"[^a-z0-9À-ɏı'가-힣぀-ヿ一-鿿 ]"), ' ')
      // Japonca/Çince boşluksuz yazılır: her kana/han harfi ayrı birim olur.
      .replaceAllMapped(RegExp('[぀-ヿ一-鿿]'), (m) => ' ${m[0]} ')
      .replaceAll(RegExp(r"(^|\s)'+|'+(\s|$)"), ' ')
      .trim();
  if (r.isEmpty) return const [];
  return r.split(RegExp(r'\s+'));
}

/// Hedefle söyleneni karşılaştırır. Kelimeler hedef sırasıyla döner; her biri
/// söylenende (sıra korunarak, LCS ile) bulunduysa `dogru`. `oran` =
/// eşleşen / hedef kelime sayısı (0..1). Hedef boşsa oran 0.
({double oran, List<({String kelime, bool dogru})> kelimeler}) telaffuzPuani(
  String hedef,
  String soylenen,
) {
  final h = telaffuzKelimeleri(hedef);
  final s = telaffuzKelimeleri(soylenen);
  // Gösterim için özgün kelimeler (büyük harf/noktalama ayıklanmış değil, yalnız
  // boşlukla bölünmüş) hedefle aynı sayıdaysa onlar kullanılır.
  final gosterim = hedef.trim().isEmpty
      ? const <String>[]
      : hedef.trim().split(RegExp(r'\s+'));
  final etiket = gosterim.length == h.length ? gosterim : h;

  final n = h.length;
  final m = s.length;
  final tablo = List.generate(n + 1, (_) => List.filled(m + 1, 0));
  for (var i = 1; i <= n; i++) {
    for (var j = 1; j <= m; j++) {
      tablo[i][j] = h[i - 1] == s[j - 1]
          ? tablo[i - 1][j - 1] + 1
          : (tablo[i - 1][j] >= tablo[i][j - 1]
                ? tablo[i - 1][j]
                : tablo[i][j - 1]);
    }
  }
  final eslesen = List.filled(n, false);
  var i = n;
  var j = m;
  while (i > 0 && j > 0) {
    if (h[i - 1] == s[j - 1]) {
      eslesen[i - 1] = true;
      i--;
      j--;
    } else if (tablo[i - 1][j] >= tablo[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return (
    oran: n == 0 ? 0.0 : tablo[n][m] / n,
    kelimeler: [
      for (var k = 0; k < n; k++) (kelime: etiket[k], dogru: eslesen[k]),
    ],
  );
}

/// Oran eşiği geçti mi?
bool telaffuzDogruMu(double oran) => oran >= telaffuzEsigi;

// ---------------------------------------------------------------------------
// Telaffuz puanı (ÖZELLİK 77): 0-100 TAHMİNİ puan ve hatalı hece gösterimi
// ---------------------------------------------------------------------------
//
// DÜRÜSTLÜK: Bu puan sesin kendisini değil, konuşma tanımanın yazıya çevirdiği
// metni hedef metinle karşılaştırır (harf düzeyinde benzerlik). Tanıma motoru
// bozuk söyleneni "düzeltip" doğru yazabilir ya da doğru söyleneni yanlış
// duyabilir; bu yüzden sonuç her yerde "tahmini" etiketiyle gösterilir.
// Heceler de sezgiseldir (Latin yazıda ünlü gruplarına göre; Hangıl, Kana ve
// Han yazısında her karakter bir hece/mora sayılır).

/// Bir hecenin hedefle uyumu.
typedef TelaffuzHecesi = ({String hece, bool dogru});

/// Hedef kelimenin puanı: [benzerlik] 0..1 (harf düzeyi), [duyuldu] tanınan
/// metinde karşılığı bulundu mu, [heceler] hece hece uyum.
typedef TelaffuzKelimesi = ({
  String kelime,
  double benzerlik,
  bool duyuldu,
  bool dogru,
  List<TelaffuzHecesi> heceler,
});

/// Tahmini telaffuz sonucu: [puan] 0..100, kelimeler hedef sırasıyla,
/// [hataliHeceler] hatalı (ya da hiç duyulmayan) heceler, [fazla] hedefte
/// olmayan fazladan duyulan kelime sayısı.
typedef TelaffuzTahmini = ({
  int puan,
  List<TelaffuzKelimesi> kelimeler,
  List<String> hataliHeceler,
  int fazla,
});

final RegExp _cjk = RegExp('[가-힣぀-ヿ一-鿿]');
final RegExp _kucukKana = RegExp('[ゃゅょぁぃぅぇぉャュョァィゥェォっッー]');

/// Kelimeyi hecelere böler (sezgisel). [dil] 'en' ile başlıyorsa sondaki
/// sessiz "e" ayrı hece sayılmaz (make, like). Boş kelime boş liste verir.
List<String> telaffuzHeceleri(String kelime, {String dil = 'en'}) {
  final k = kelime.trim();
  if (k.isEmpty) return const [];
  if (_cjk.hasMatch(k)) {
    final sonuc = <String>[];
    for (final r in k.runes) {
      final ch = String.fromCharCode(r);
      if (sonuc.isNotEmpty && _kucukKana.hasMatch(ch)) {
        sonuc[sonuc.length - 1] += ch;
      } else {
        sonuc.add(ch);
      }
    }
    return sonuc;
  }
  const ulu = 'aeiouyäöüéèêëàâáíìîïóòôúùûıåæœ';
  final harfler = k.toLowerCase().split('');
  bool unlu(int i) => ulu.contains(harfler[i]);
  // Ünlü grupları [başlangıç, bitiş).
  final gruplar = <(int, int)>[];
  var i = 0;
  while (i < harfler.length) {
    if (unlu(i)) {
      var j = i;
      while (j < harfler.length && unlu(j)) {
        j++;
      }
      gruplar.add((i, j));
      i = j;
    } else {
      i++;
    }
  }
  if (dil.startsWith('en') &&
      gruplar.length > 1 &&
      harfler.last == 'e' &&
      gruplar.last.$1 == harfler.length - 1 &&
      gruplar.last.$1 > 0 &&
      !unlu(harfler.length - 2)) {
    gruplar.removeLast();
  }
  if (gruplar.length <= 1) return [k];
  // Sınırlar: iki ünlü grubu arasında 1 ünsüz varsa ondan önce, daha fazla
  // varsa ilk ünsüzden sonra.
  final sinirlar = <int>[];
  for (var g = 0; g < gruplar.length - 1; g++) {
    final bitis = gruplar[g].$2;
    final sonrakiBas = gruplar[g + 1].$1;
    final aradaki = sonrakiBas - bitis;
    sinirlar.add(aradaki <= 1 ? bitis : bitis + 1);
  }
  final sonuc = <String>[];
  var bas = 0;
  for (final s in sinirlar) {
    sonuc.add(k.substring(bas, s));
    bas = s;
  }
  sonuc.add(k.substring(bas));
  return sonuc;
}

/// Düzenleme uzaklığı hizalaması: [h]nin her karakteri için, [s]deki bir
/// karakterle birebir eşleşti mi? Ayrıca uzaklığı döndürür.
({int uzaklik, List<bool> eslesen}) _harfHizala(
  List<String> h,
  List<String> s,
) {
  final n = h.length;
  final m = s.length;
  final t = List.generate(n + 1, (_) => List.filled(m + 1, 0));
  for (var i = 0; i <= n; i++) {
    t[i][0] = i;
  }
  for (var j = 0; j <= m; j++) {
    t[0][j] = j;
  }
  for (var i = 1; i <= n; i++) {
    for (var j = 1; j <= m; j++) {
      final maliyet = h[i - 1] == s[j - 1] ? 0 : 1;
      var en = t[i - 1][j - 1] + maliyet;
      if (t[i - 1][j] + 1 < en) en = t[i - 1][j] + 1;
      if (t[i][j - 1] + 1 < en) en = t[i][j - 1] + 1;
      t[i][j] = en;
    }
  }
  final eslesen = List.filled(n, false);
  var i = n;
  var j = m;
  while (i > 0 && j > 0) {
    final maliyet = h[i - 1] == s[j - 1] ? 0 : 1;
    if (t[i][j] == t[i - 1][j - 1] + maliyet) {
      if (maliyet == 0) eslesen[i - 1] = true;
      i--;
      j--;
    } else if (t[i][j] == t[i - 1][j] + 1) {
      i--;
    } else {
      j--;
    }
  }
  return (uzaklik: t[n][m], eslesen: eslesen);
}

/// İki kelimenin harf düzeyi benzerliği, 0..1 (1: aynı).
double telaffuzBenzerligi(String a, String b) {
  final x = a.split('');
  final y = b.split('');
  if (x.isEmpty && y.isEmpty) return 1.0;
  final en = x.length > y.length ? x.length : y.length;
  return 1.0 - _harfHizala(x, y).uzaklik / en;
}

/// Hedef metne göre söylenenin TAHMİNİ puanı (0-100) ve hatalı heceleri.
/// Kelimeler sıra korunarak hizalanır (bir kelimenin yerine başka bir kelime
/// duyulduysa harf benzerliği puanlanır; hiç duyulmayan kelime 0 alır).
/// Fazladan duyulan her kelime puandan çeyrek kelime düşürür. [dil] BCP-47 ya
/// da kısa kod ('en-US', 'de'); yalnız heceleme kuralında kullanılır.
TelaffuzTahmini telaffuzTahmini(
  String hedef,
  String soylenen, {
  String dil = 'en',
}) {
  final h = telaffuzKelimeleri(hedef);
  final s = telaffuzKelimeleri(soylenen);
  final gosterim = hedef.trim().isEmpty
      ? const <String>[]
      : hedef.trim().split(RegExp(r'\s+'));
  final etiket = gosterim.length == h.length ? gosterim : h;
  final n = h.length;
  final m = s.length;
  if (n == 0) {
    return (puan: 0, kelimeler: const [], hataliHeceler: const [], fazla: m);
  }
  const fazlaMaliyet = 0.25;
  double maliyet(int i, int j) => 1.0 - telaffuzBenzerligi(h[i], s[j]);
  // dp[i][j]: ilk i hedef ve ilk j söylenen kelimenin en küçük toplam maliyeti.
  final dp = List.generate(n + 1, (_) => List.filled(m + 1, 0.0));
  for (var i = 1; i <= n; i++) {
    dp[i][0] = i.toDouble();
  }
  for (var j = 1; j <= m; j++) {
    dp[0][j] = j * fazlaMaliyet;
  }
  for (var i = 1; i <= n; i++) {
    for (var j = 1; j <= m; j++) {
      var en = dp[i - 1][j - 1] + maliyet(i - 1, j - 1);
      final atla = dp[i - 1][j] + 1.0;
      final fazla = dp[i][j - 1] + fazlaMaliyet;
      if (atla < en) en = atla;
      if (fazla < en) en = fazla;
      dp[i][j] = en;
    }
  }
  // Geri izleme: her hedef kelimeye eşlenen söylenen kelime (ya da -1).
  final eslenen = List.filled(n, -1);
  var fazlaSayisi = 0;
  var i = n;
  var j = m;
  while (i > 0 || j > 0) {
    if (i > 0 &&
        j > 0 &&
        (dp[i][j] - (dp[i - 1][j - 1] + maliyet(i - 1, j - 1))).abs() < 1e-9) {
      eslenen[i - 1] = j - 1;
      i--;
      j--;
    } else if (i > 0 && (dp[i][j] - (dp[i - 1][j] + 1.0)).abs() < 1e-9) {
      i--;
    } else {
      fazlaSayisi++;
      j--;
    }
  }
  var toplamMaliyet = 0.0;
  final kelimeler = <TelaffuzKelimesi>[];
  final hataliler = <String>[];
  for (var k = 0; k < n; k++) {
    final temizEtiket = etiket[k].replaceAll(
      RegExp(r"[^\p{L}\p{N}']", unicode: true),
      '',
    );
    final hecler = telaffuzHeceleri(temizEtiket, dil: dil);
    final duyuldu = eslenen[k] >= 0;
    final benzerlik = duyuldu ? telaffuzBenzerligi(h[k], s[eslenen[k]]) : 0.0;
    toplamMaliyet += 1.0 - benzerlik;
    // Hece uyumu: normalleştirilmiş kelimenin harf hizalamasından; hecenin
    // normalleştirilmiş harfleri sırayla hedef harflerine denk düşer.
    final eslesen = duyuldu
        ? _harfHizala(h[k].split(''), s[eslenen[k]].split('')).eslesen
        : List.filled(h[k].length, false);
    final heceler = <TelaffuzHecesi>[];
    var konum = 0;
    for (final hc in hecler) {
      final uz = _normalHarfSayisi(hc);
      var tam = duyuldu;
      for (var c = 0; c < uz && konum + c < eslesen.length; c++) {
        if (!eslesen[konum + c]) tam = false;
      }
      konum += uz;
      heceler.add((hece: hc, dogru: tam));
      if (!tam) _heceEkle(hataliler, hc);
    }
    kelimeler.add((
      kelime: etiket[k],
      benzerlik: benzerlik,
      duyuldu: duyuldu,
      dogru: duyuldu && benzerlik >= telaffuzEsigi,
      heceler: heceler,
    ));
  }
  final ham = (n - toplamMaliyet - fazlaMaliyet * fazlaSayisi) / n;
  final puan = (ham * 100).round().clamp(0, 100);
  return (
    puan: puan,
    kelimeler: kelimeler,
    hataliHeceler: hataliler,
    fazla: fazlaSayisi,
  );
}

void _heceEkle(List<String> liste, String hece) {
  final temiz = hece.trim();
  if (temiz.isNotEmpty && !liste.contains(temiz)) liste.add(temiz);
}

/// Hecenin, [telaffuzKelimeleri] normalleştirmesinden sonra kalan harf sayısı.
int _normalHarfSayisi(String hece) => hece
    .replaceAll('İ', 'i')
    .replaceAll('I', 'i')
    .toLowerCase()
    .replaceAll(RegExp(r"[^a-z0-9À-ɏı'가-힣぀-ヿ一-鿿]"), '')
    .length;

/// Tanınan metinde hiç kelime yok mu (sessizlik / anlamsız ses)?
bool telaffuzSessiz(String soylenen) => telaffuzKelimeleri(soylenen).isEmpty;
