/// `IngilizceKok` birim testleri: düzensiz tablo, son ek kuralları (ies, es/s,
/// ed, ing, er/est, ly), çift ünsüz ve düşen e düzeltmeleri, güvenli kural
/// (bilinmeyen kök → değişmez; sıklıktaki kelime → dokunulmaz), sınır
/// durumlar (boş, kısa, noktalama), çok kelimeli ifade ve sıklık dizini.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:adim_adim/sozluk/kok.dart';
import 'package:adim_adim/sozluk/siklik.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  String kok(String s) => IngilizceKok.bul(s);
  String kokB(String s, Set<String> bilinen) =>
      IngilizceKok.bul(s, bilinen: bilinen);

  group('düzensizler', () {
    test('fiiller', () {
      expect(kok('went'), 'go');
      expect(kok('Went'), 'go');
      expect(kok('was'), 'be');
      expect(kok('were'), 'be');
      expect(kok('had'), 'have');
      expect(kok('did'), 'do');
      expect(kok('does'), 'do');
      expect(kok('ate'), 'eat');
      expect(kok('thought'), 'think');
      expect(kok('written'), 'write');
    });

    test('çoğullar ve sıfat dereceleri', () {
      expect(kok('children'), 'child');
      expect(kok('men'), 'man');
      expect(kok('women'), 'woman');
      expect(kok('feet'), 'foot');
      expect(kok('better'), 'good');
      expect(kok('best'), 'good');
      expect(kok('worse'), 'bad');
      expect(IngilizceKok.duzensizler.length, greaterThanOrEqualTo(40));
    });
  });

  group('son ek kuralları', () {
    test('ies → y, ied → y', () {
      expect(kok('cities'), 'city');
      expect(kokB('studies', {'study'}), 'study');
      expect(kokB('studied', {'study'}), 'study');
      expect(kok('tried'), 'try');
      // ies → ie önce denenir: movies → movie (bilinen); bilinmiyorsa değişmez.
      expect(kokB('movies', {'movie'}), 'movie');
      expect(kok('movies'), 'movies');
      expect(kok('studies'), 'studies');
    });

    test('çoğul s / es', () {
      expect(kok('cats'), 'cat');
      expect(kok('books'), 'book');
      expect(kokB('boxes', {'box'}), 'box');
      expect(kokB('watches', {'watch'}), 'watch');
      expect(kokB('classes', {'class'}), 'class');
      expect(kokB('wishes', {'wish'}), 'wish');
      // ss/us/is ile bitenler çoğul sayılmaz.
      expect(kok('glass'), 'glass');
      expect(kok('this'), 'this');
      expect(kok('bus'), 'bus');
      // Kök bilinmiyorsa s düşmez.
      expect(kok('bias'), 'bias');
      expect(kok('whereas'), 'whereas');
      expect(kok('christmas'), 'christmas');
      expect(kok('Christmas'), 'christmas');
    });

    test('ed: düz, çift ünsüz, düşen e', () {
      expect(kok('wanted'), 'want');
      expect(kok('played'), 'play');
      expect(kokB('stopped', {'stop'}), 'stop');
      expect(kok('liked'), 'like');
      expect(kok('lived'), 'live');
      // Ek gibi biten kökler korunur.
      expect(kok('need'), 'need');
      expect(kok('red'), 'red');
      expect(kok('agreed'), 'agreed');
      // Kök bilinmiyorsa değişmez; bilinirse e geri gelir.
      expect(kok('Excited'), 'excited');
      expect(kokB('excited', {'excite'}), 'excite');
      expect(kok('provided'), 'provided');
    });

    test('ing: düz, çift ünsüz, düşen e', () {
      expect(kok('walking'), 'walk');
      expect(kok('running'), 'run');
      expect(kokB('swimming', {'swim'}), 'swim');
      expect(kok('swimming'), 'swimming');
      expect(kok('making'), 'make');
      expect(kok('dancing'), 'dancing');
      expect(kokB('dancing', {'dance'}), 'dance');
      expect(kok('writing'), 'write');
      expect(kok('going'), 'go');
      expect(kok('being'), 'be');
      expect(kok('morning'), 'morning');
      expect(kok('thing'), 'thing');
      expect(kok('sing'), 'sing');
    });

    test('er / est yalnız kök bilinen kümedeyse', () {
      // Sıklık listesi yetmez: faster→fast yalnız 'fast' bilinirse.
      expect(kokB('faster', {'fast'}), 'fast');
      expect(kok('faster'), 'faster');
      expect(kokB('smallest', {'small'}), 'small');
      // butter→but, offer→off, shower→show olmaz ('but', 'off', 'show'
      // sıklıkta olsa da); bigger→big yalnız 'big' bilinirse.
      expect(kokB('bigger', {'big'}), 'big');
      expect(kokB('biggest', {'big'}), 'big');
      expect(kok('bigger'), 'bigger');
      expect(kok('butter'), 'butter');
      expect(kok('offer'), 'offer');
      expect(kok('shower'), 'shower');
      // 'water', 'mother' kök değildir.
      expect(kok('water'), 'water');
      expect(kok('mother'), 'mother');
      // Bilinmeyen kök: değişmez; bilinen kümesi verilirse düşer.
      expect(kok('tallest'), 'tallest');
      expect(IngilizceKok.bul('tallest', bilinen: {'tall'}), 'tall');
      expect(IngilizceKok.bul('nicer', bilinen: {'nice'}), 'nice');
    });

    test('ly / ily', () {
      expect(kokB('quickly', {'quick'}), 'quick');
      expect(kok('quickly'), 'quickly');
      expect(kokB('suddenly', {'sudden'}), 'sudden');
      expect(kok('happily'), 'happy');
      expect(kok('only'), 'only');
      expect(kok('family'), 'family');
      expect(kok('early'), 'early');
    });
  });

  group('sıklıktaki kelimeye dokunulmaz', () {
    test('left, butter değil; more/most/is olduğu gibi', () {
      expect(kok('left'), 'left');
      expect(kok('Left'), 'left');
      expect(kok('most'), 'most');
      expect(kok('is'), 'is');
      expect(kok('other'), 'other');
      // Listede olmayan düzensizler dönüşür.
      expect(kok('was'), 'be');
    });
  });

  group('sınırlar', () {
    test('boş ve kısa kelimeler değişmez', () {
      expect(kok(''), '');
      expect(kok('   '), '');
      expect(kok('a'), 'a');
      expect(kok('yes'), 'yes');
      expect(kok('dog'), 'dog');
      expect(kok('CAT'), 'cat');
    });

    test('kökü bulunamayan kelime küçük harfle aynen döner', () {
      expect(kok('Table'), 'table');
      expect(kok('window'), 'window');
    });

    test('çok kelimeli ifadede her kelime ayrı köke iner', () {
      expect(IngilizceKok.ifade('Went running'), 'go run');
      expect(IngilizceKok.ifade('  black   cats '), 'black cat');
      expect(IngilizceKok.ifade('good morning'), 'good morning');
      expect(IngilizceKok.ifade('dog'), 'dog');
      expect(IngilizceKok.ifade(''), '');
      expect(IngilizceKok.ifade('no sooner'), 'no sooner');
      expect(IngilizceKok.ifade('provided that'), 'provided that');
    });

    test('ifade noktalamayı ayırır; kesme işareti korunur', () {
      expect(IngilizceKok.ifade('studied.', bilinen: {'study'}), 'study');
      expect(IngilizceKok.ifade("it's"), "it's");
      expect(IngilizceKok.ifade('How much is this?'), 'how much is this');
      expect(IngilizceKok.ifade('Hello, world!'), 'hello world');
    });
  });

  group('sıklık listesi', () {
    test('yaklaşık 300 benzersiz kelime, sıra 1 tabanlı', () {
      expect(ingilizceSiklik.length, inInclusiveRange(280, 320));
      expect(ingilizceSiklik.toSet().length, ingilizceSiklik.length);
      expect(siklikSirasi('the'), 1);
      expect(siklikSirasi('be'), 2);
      expect(siklikSirasi('GO'), lessThanOrEqualTo(100));
      expect(siklikSirasi('cat'), isNotNull);
      expect(siklikSirasi('xylophone'), isNull);
      expect(siklikSirasi(''), isNull);
    });
  });
}
