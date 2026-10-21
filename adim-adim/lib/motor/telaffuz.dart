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
