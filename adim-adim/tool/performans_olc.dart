/// Sahibi: Yusuf; mikro-ölçüm betiği (başlangıç yolu, sözlük, motor, durum JSON) — yazan: [Claude#performans]
/// Çalıştır: `dart run tool/performans_olc.dart` (saf Dart, Flutter gerekmez).
// ignore_for_file: avoid_print
library;

import 'dart:convert';

import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/sozluk/dil_paketi.dart';
import 'package:adim_adim/sozluk/fiil_cekimi.dart';

double _ms(void Function() f, {int tekrar = 1}) {
  // Çok tekrarlı ölçümde bir ısınma turu atılır (AOT'ye daha yakın sayı).
  if (tekrar > 1) f();
  final s = Stopwatch()..start();
  for (var i = 0; i < tekrar; i++) {
    f();
  }
  s.stop();
  return s.elapsedMicroseconds / 1000 / tekrar;
}

void _yaz(String ad, double ms) =>
    print('${ad.padRight(46)} ${ms.toStringAsFixed(2).padLeft(10)} ms');

void main() {
  _yaz('icerik: tumKurslar ilk erisim', _ms(() => tumKurslar.length));
  _yaz(
    'icerik: kurs/ders/alistirma tarama',
    _ms(() {
      var n = 0;
      for (final k in tumKurslar) {
        for (final d in k.tumDersler) {
          n += d.alistirmalar.length;
        }
      }
      if (n < 0) print(n);
    }),
  );

  late DilPaketleri paketler;
  void sozlukKur() {
    paketler = DilPaketleri(tumKurslar);
    for (final p in paketler.kullanilanlar) {
      p.sozluk.maddeler.length;
    }
  }

  _yaz('sozluk: tum diller, ilk (soguk)', _ms(sozlukKur));
  _yaz('sozluk: tum diller, sicak x5', _ms(sozlukKur, tekrar: 5));
  _yaz(
    'fiil cekimleri: kurslardan',
    _ms(() => FiilCekimleri.kurslardan(tumKurslar)),
  );

  final en = paketler.paket('en')!.sozluk;
  _yaz('sozluk: ara("go") x50', _ms(() => en.ara('go'), tekrar: 50));
  _yaz('sozluk: ara("") x50', _ms(() => en.ara(''), tekrar: 50));

  // Gercekci buyuk durum: tum kartlardan en cok 20000 kart.
  final kartlar = <String, Kart>{};
  outer:
  for (final k in tumKurslar) {
    for (final d in k.tumDersler) {
      for (var i = 0; i < d.alistirmalar.length; i++) {
        if (kartlar.length >= OgrenciDurumu.kartEnCok) break outer;
        final gun = (kartlar.length % 28 + 1).toString().padLeft(2, '0');
        kartlar['${d.id}#$i'] = Kart(
          kutu: 1 + (kartlar.length % 5),
          sonraki: '2026-11-$gun',
          yariOmurGun: 1.0 + (kartlar.length % 9),
        );
      }
    }
  }
  print('kart sayisi: ${kartlar.length}');
  final d = OgrenciDurumu(kartlar: kartlar);
  const bugun = '2026-11-15';

  List<String> bek = const [];
  _yaz(
    'motor: tekrarBekleyen x20',
    _ms(() => bek = Motor.tekrarBekleyen(d, bugun), tekrar: 20),
  );
  print('bekleyen: ${bek.length}');
  _yaz(
    'motor: bekleyenTekrar sayaci (kartCoz) x3',
    _ms(() {
      bek.where((id) => Motor.kartCoz(tumKurslar, id) != null).length;
    }, tekrar: 3),
  );
  _yaz(
    'motor: mikroSec(5) x3',
    _ms(() => Motor.mikroSec(d, tumKurslar, bugun), tekrar: 3),
  );

  late String json;
  _yaz(
    'durum: toJson+jsonEncode x5',
    _ms(() => json = jsonEncode(d.toJson()), tekrar: 5),
  );
  print('json karakter: ${json.length}');
  _yaz(
    'durum: jsonDecode+fromJson x5',
    _ms(() => OgrenciDurumu.fromJson(jsonDecode(json)), tekrar: 5),
  );
}
