/// En sık kullanılan İngilizce kelimeler (yaklaşık 300, yaygın bilinen
/// sıklık sırasına göre; kök/sözlük biçimleriyle). Sözlükte sıralama ve
/// "Çok sık" / "Sık" rozeti için kullanılır. Saf Dart.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

/// Sık kelimeler; dizin + 1 sıklık sırasıdır (1 en sık).
const List<String> ingilizceSiklik = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'person', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see',
  'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
  'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work',
  'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
  'give', 'day', 'most', 'us',
  // 101-200
  'is', 'water', 'long', 'find', 'here', 'thing', 'many', 'tell', 'very',
  'through', 'down', 'should', 'call', 'world', 'school', 'still', 'try',
  'last', 'ask', 'need', 'too', 'feel', 'three', 'state', 'never', 'become',
  'between', 'high', 'really', 'something', 'another', 'much', 'family',
  'own', 'leave', 'put', 'old', 'while', 'mean', 'keep', 'student', 'why',
  'let', 'great', 'same', 'big', 'group', 'begin', 'seem', 'country', 'help',
  'talk', 'where', 'turn', 'problem', 'every', 'start', 'hand', 'might',
  'show', 'part', 'against', 'place', 'such', 'again', 'few', 'case', 'week',
  'company', 'system', 'each', 'right', 'program', 'hear', 'question',
  'during', 'play', 'government', 'run', 'small', 'number', 'off', 'always',
  'move', 'night', 'live', 'point', 'believe', 'hold', 'today', 'bring',
  'happen', 'next', 'without', 'before', 'large', 'million', 'must', 'home',
  // 201-300
  'under', 'house', 'read', 'eat', 'morning', 'drink', 'cat', 'dog', 'book',
  'city', 'friend', 'love', 'write', 'sleep', 'walk', 'open', 'close',
  'name', 'car', 'food', 'child', 'man', 'woman', 'boy', 'girl', 'mother',
  'father', 'sister', 'brother', 'teacher', 'door', 'window', 'table',
  'chair', 'room', 'street', 'money', 'buy', 'sell', 'pay', 'learn',
  'teach', 'speak', 'listen', 'understand', 'remember', 'forget', 'answer',
  'word', 'sentence', 'language', 'english', 'yes', 'please', 'thank',
  'sorry', 'hello', 'goodbye', 'happy', 'sad', 'hot', 'cold', 'fast',
  'slow', 'early', 'late', 'young', 'bad', 'little', 'far', 'near', 'left',
  'red', 'blue', 'green', 'black', 'white', 'color', 'sun', 'rain', 'tree',
  'flower', 'bird', 'fish', 'apple', 'bread', 'milk', 'tea', 'coffee',
  'sea', 'mountain', 'river', 'hour', 'minute', 'month', 'tomorrow',
  'yesterday', 'light', 'dark', 'strong', 'weak',
];

/// Kökün (küçük harf) sıklık sırası (1 = en sık); listede yoksa null.
/// Bir kelime listede iki kez geçerse ilk (daha sık) sırası döner.
int? siklikSirasi(String kok) {
  final i = _dizin[kok.trim().toLowerCase()];
  return i == null ? null : i + 1;
}

/// Hızlı arama için tek seferlik dizin (ilk görülen sıra kalır).
final Map<String, int> _dizin = () {
  final m = <String, int>{};
  for (var i = 0; i < ingilizceSiklik.length; i++) {
    m.putIfAbsent(ingilizceSiklik[i], () => i);
  }
  return m;
}();
