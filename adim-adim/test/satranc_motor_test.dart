import 'package:adim_adim/satranc/satranc.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('perft (bilinen düğüm sayıları)', () {
    test('başlangıç konumu', () {
      final k = Konum.fen(Konum.baslangicFen);
      expect(k.perft(1), 20);
      expect(k.perft(2), 400);
      expect(k.perft(3), 8902);
    });

    test('kiwipete (rok, geçerken, terfi)', () {
      final k = Konum.fen(
        'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
      );
      expect(k.perft(1), 48);
      expect(k.perft(2), 2039);
      expect(k.perft(3), 97862);
    });

    test('konum 3 (geçerken ve açmaz)', () {
      final k = Konum.fen('8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1');
      expect(k.perft(1), 14);
      expect(k.perft(2), 191);
      expect(k.perft(3), 2812);
      expect(k.perft(4), 43238);
    });

    test('konum 4 (terfi ve rok)', () {
      final k = Konum.fen(
        'r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1',
      );
      expect(k.perft(1), 6);
      expect(k.perft(2), 264);
      expect(k.perft(3), 9467);
    });

    test('konum 5', () {
      final k = Konum.fen(
        'rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8',
      );
      expect(k.perft(1), 44);
      expect(k.perft(2), 1486);
      expect(k.perft(3), 62379);
    });
  });

  group('FEN', () {
    test('gidiş-dönüş', () {
      for (final f in [
        Konum.baslangicFen,
        'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1',
        '8/8/8/3pP3/8/8/8/K6k w - d6 0 2',
      ]) {
        expect(Konum.fen(f).fen, f);
      }
    });

    test('geçersiz FEN reddedilir', () {
      for (final f in [
        '',
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP w KQkq - 0 1', // 7 sıra
        'rnbqkbnr/pppppppp/9/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQ1BNR w kq - 0 1', // beyaz şah yok
        'P6k/8/8/8/8/8/8/K7 w - - 0 1', // 8. sırada piyon
        '7k/8/8/8/8/8/8/K6R w K - 0 1', // rok hakkı uyumsuz
        'k7/8/8/8/8/8/8/K6r w - - 0 1'.replaceFirst('w', 'b'), // beyaz şahta
        '8/8/8/3pP3/8/8/8/K6k w - e6 0 1', // geçerken önünde piyon yok
        '8/8/8/8/8/8/8/K6k x - - 0 1',
      ]) {
        expect(Konum.fenGecerli(f), isFalse, reason: f);
      }
    });
  });

  group('kurallar', () {
    test('rok: kısa ve uzun, kale yer değiştirir, hak düşer', () {
      final k = Konum.fen('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
      final kisa = k.uciOyna('e1g1')!;
      expect(kisa.tas(6), 'K');
      expect(kisa.tas(5), 'R');
      expect(kisa.tas(7), isNull);
      expect(kisa.rokHaklari, 'kq');
      final uzun = kisa.uciOyna('e8c8')!;
      expect(uzun.tas(58), 'k');
      expect(uzun.tas(59), 'r');
      expect(uzun.rokHaklari, '');
    });

    test('şah çekilirken ya da geçtiği kare tehditteyken rok yok', () {
      final tehdit = Konum.fen('4k3/8/8/8/8/8/5r2/R3K2R w KQ - 0 1');
      expect(tehdit.uciBul('e1g1'), isNull);
      expect(tehdit.uciBul('e1c1'), isNotNull);
      final sahta = Konum.fen('4k3/4r3/8/8/8/8/8/R3K2R w KQ - 0 1');
      expect(sahta.sah, isTrue);
      expect(sahta.uciBul('e1g1'), isNull);
      expect(sahta.uciBul('e1c1'), isNull);
    });

    test('geçerken alma', () {
      final k = Konum.fen('4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2');
      final h = k.uciBul('e5d6')!;
      expect(h.gecerken, isTrue);
      final s = k.oyna(h);
      expect(s.tas(kareNo('d5')!), isNull);
      expect(s.tas(kareNo('d6')!), 'P');
      expect(k.san(h), 'exd6');
    });

    test('terfi: dört seçenek, SAN', () {
      final k = Konum.fen('8/4P3/8/8/8/8/k7/4K3 w - - 0 1');
      final terfiler = k.kareHamleleri(kareNo('e7')!);
      expect(terfiler.map((h) => h.terfi), ['q', 'r', 'b', 'n']);
      expect(k.uciOyna('e7e8n')!.tas(kareNo('e8')!), 'N');
      expect(k.san(k.uciBul('e7e8q')!), 'e8=Q');
    });

    test('mat ve pat', () {
      final mat = Konum.fen(
        'rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3',
      );
      expect(mat.mat, isTrue);
      expect(mat.pat, isFalse);
      final pat = Konum.fen('7k/5Q2/6K1/8/8/8/8/8 b - - 0 1');
      expect(pat.pat, isTrue);
      expect(pat.mat, isFalse);
    });

    test('açmazdaki taş şahı açık bırakamaz', () {
      final k = Konum.fen('4k3/4r3/8/8/8/8/4N3/4K3 w - - 0 1');
      expect(k.kareHamleleri(kareNo('e2')!), isEmpty);
    });

    test('SAN: belirsizlik giderme, şah ve mat işareti, Türkçe', () {
      final k = Konum.fen('6k1/5ppp/8/8/8/8/8/R3R1K1 w - - 0 1');
      final h = k.uciBul('a1d1')!;
      expect(k.san(h), 'Rad1');
      final mat = k.uciBul('e1e8')!;
      expect(k.san(mat), 'Re8#');
      expect(turkceSan('Re8#'), 'Ke8#');
      expect(turkceSan('Nxf7+'), 'Axf7+');
      expect(turkceSan('Kg2'), 'Şg2');
      expect(turkceSan('Qh5'), 'Vh5');
      expect(turkceSan('Bb5'), 'Fb5');
      expect(turkceSan('O-O'), 'O-O');
    });

    test('mat-in-N araması', () {
      // Koridor matı: tek hamle.
      final k1 = Konum.fen('6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1');
      expect(k1.matZorlanir(1), isTrue);
      expect(k1.hamleZorlarMat(k1.uciBul('e1e8')!, 1), isTrue);
      expect(k1.hamleZorlarMat(k1.uciBul('e1e7')!, 1), isFalse);
      // Başlangıç konumunda 2 hamlede mat yok.
      expect(Konum.fen(Konum.baslangicFen).matZorlanir(2), isFalse);
    });

    test('yasal olmayan hamle oynanamaz', () {
      final k = Konum.fen(Konum.baslangicFen);
      expect(k.uciOyna('e2e5'), isNull);
      expect(() => k.oyna(k.uciBul('e2e4')!), returnsNormally);
      expect(kareAdi(0), 'a1');
      expect(kareAdi(63), 'h8');
      expect(kareNo('e4'), 28);
      expect(kareNo('i9'), isNull);
      expect(tasTamAdi('N'), 'beyaz at');
      expect(tasTamAdi('q'), 'siyah vezir');
    });
  });
}
