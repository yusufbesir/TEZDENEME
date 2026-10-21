// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Kademeli ipucu (özellik 14), motor: Motor.ipucuUret her alıştırma türü için
/// adım 0 (genel), 1 (hataya özel), 2 (çözüm); açıklama varsa ilk cümlesi;
/// Alistirma.ipuclari doluysa öncelikli; JSON'da ipuclari okunur/yazılır.
library;

import 'dart:convert';

import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  const secim = Secim(
    soru: 'Kaç?',
    secenekler: ['üç', 'dört', 'beş'],
    dogru: 1,
  );
  const bosluk = Bosluk(
    soru: 'I ___ a student.',
    secenekler: ['am', 'is', 'are'],
    dogru: 0,
  );
  const yaz = Yaz(soru: 'Merhaba?', cevaplar: ['hello', 'hi']);
  const sirala = Sirala(
    soru: 'Diz.',
    kelimeler: ['am', 'I', 'happy'],
    dogru: ['I', 'am', 'happy'],
  );
  const eslestir = Eslestir(
    soru: 'Eşleştir.',
    ciftler: [(sol: 'cat', sag: 'kedi'), (sol: 'dog', sag: 'köpek')],
  );
  const dinle = Dinle(
    soru: 'Ne duydun?',
    okunacak: 'Good morning',
    secenekler: ['Good morning', 'Good evening'],
    dogru: 0,
  );
  const kod = Kod(
    soru: 'Doldur.',
    kod: '<p>___</p>',
    secenekler: ['Merhaba', '</div>'],
    dogru: 0,
  );

  group('ipucuUret adım 0 (genel, açıklama yok)', () {
    test('türe göre sabit metin', () {
      expect(
        Motor.ipucuUret(secim, 0),
        'Seçenekleri ele: açıkça yanlış olanları çıkar',
      );
      expect(
        Motor.ipucuUret(bosluk, 0),
        'Boşluğun önündeki ve sonrasındaki kelimeye bak',
      );
      expect(Motor.ipucuUret(yaz, 0), 'İlk harfi: h');
      expect(
        Motor.ipucuUret(sirala, 0),
        'Cümle büyük harfle başlar, noktalama ile biter',
      );
      expect(Motor.ipucuUret(eslestir, 0), 'Bildiklerini önce eşle');
      expect(Motor.ipucuUret(dinle, 0), 'Bir kez daha dinle, sonra yaz');
      expect(Motor.ipucuUret(kod, 0), 'Söz dizimini kontrol et');
    });

    test('açıklama varsa ilk cümlesi', () {
      const a = Secim(
        soru: 's',
        secenekler: ['a', 'b'],
        dogru: 0,
        aciklama: 'Birinci cümle. İkinci cümle!',
      );
      expect(Motor.ipucuUret(a, 0), 'Birinci cümle.');
      const b = Yaz(soru: 's', cevaplar: ['x'], aciklama: 'Noktasız açıklama');
      expect(Motor.ipucuUret(b, 0), 'Noktasız açıklama');
      const c = Yaz(soru: 's', cevaplar: ['x'], aciklama: '2 + 2 = 4');
      expect(Motor.ipucuUret(c, 0), '2 + 2 = 4');
      // Sayı içindeki nokta cümle sonu sayılmaz.
      const d = Yaz(
        soru: 's',
        cevaplar: ['x'],
        aciklama: 'Sürüm 1.5 iyi. Son.',
      );
      expect(Motor.ipucuUret(d, 0), 'Sürüm 1.5 iyi.');
    });

    test('negatif adım 0 gibi davranır', () {
      expect(Motor.ipucuUret(kod, -3), Motor.ipucuUret(kod, 0));
    });
  });

  group('ipucuUret adım 1 (hataya özel)', () {
    test('Yaz/Bosluk: uzunluk, ilk ve son harf', () {
      expect(Motor.ipucuUret(yaz, 1), '5 harf, "h" ile başlar, "o" ile biter');
      expect(
        Motor.ipucuUret(bosluk, 1),
        '2 harf, "a" ile başlar, "m" ile biter',
      );
      const tek = Bosluk(soru: '___', secenekler: ['a', 'b'], dogru: 1);
      expect(Motor.ipucuUret(tek, 1), 'Tek harf: b');
    });

    test('Secim/Dinle/Kod: bir yanlış seçeneği eler', () {
      expect(Motor.ipucuUret(secim, 1), '"üç" değil');
      expect(Motor.ipucuUret(dinle, 1), '"Good evening" değil');
      expect(Motor.ipucuUret(kod, 1), '"</div>" değil');
    });

    test('Sirala: ilk kelime; Eslestir: bir çift', () {
      expect(Motor.ipucuUret(sirala, 1), 'İlk kelime: I');
      expect(Motor.ipucuUret(eslestir, 1), 'Bir çift: cat = kedi');
    });
  });

  group('ipucuUret adım 2 (çözüm)', () {
    test('her türde doğru cevap', () {
      expect(Motor.ipucuUret(secim, 2), 'Çözüm: dört');
      expect(Motor.ipucuUret(bosluk, 2), 'Çözüm: am');
      expect(Motor.ipucuUret(yaz, 2), 'Çözüm: hello');
      expect(Motor.ipucuUret(sirala, 2), 'Çözüm: I am happy');
      expect(Motor.ipucuUret(eslestir, 2), 'Çözüm: cat = kedi; dog = köpek');
      expect(Motor.ipucuUret(dinle, 2), 'Çözüm: Good morning');
      expect(Motor.ipucuUret(kod, 2), 'Çözüm: Merhaba');
    });

    test('2 üstü adımlar da çözüm verir', () {
      expect(Motor.ipucuUret(secim, 7), 'Çözüm: dört');
    });

    test('ipucuAdimSayisi 3', () {
      expect(Motor.ipucuAdimSayisi, 3);
    });
  });

  group('Alistirma.ipuclari öncelikli', () {
    const ozel = Secim(
      soru: 's',
      secenekler: ['a', 'b'],
      dogru: 1,
      aciklama: 'Açıklama.',
      ipuclari: ['Birinci özel', 'İkinci özel'],
    );

    test('adım 0 ve 1 özel ipuçları, adım 2 çözüm', () {
      expect(Motor.ipucuUret(ozel, 0), 'Birinci özel');
      expect(Motor.ipucuUret(ozel, 1), 'İkinci özel');
      expect(Motor.ipucuUret(ozel, 2), 'Çözüm: b');
    });

    test('tek özel ipucu: adım 1 de çözüm', () {
      const tek = Yaz(soru: 's', cevaplar: ['go'], ipuclari: ['Hareket fiili']);
      expect(Motor.ipucuUret(tek, 0), 'Hareket fiili');
      expect(Motor.ipucuUret(tek, 1), 'Çözüm: go');
    });

    test('3 ve üstü özel ipucu: 3. adım yine çözüm (fazlası kullanılmaz)', () {
      const cok = Yaz(soru: 's', cevaplar: ['go'], ipuclari: ['a', 'b', 'c']);
      expect(Motor.ipucuUret(cok, 0), 'a');
      expect(Motor.ipucuUret(cok, 1), 'b');
      expect(Motor.ipucuUret(cok, 2), 'Çözüm: go');
    });

    test('varsayılan ipuclari boş', () {
      expect(secim.ipuclari, isEmpty);
      expect(yaz.ipuclari, isEmpty);
      expect(eslestir.ipuclari, isEmpty);
    });
  });

  group('JSON', () {
    test('ipuclari yazılır ve okunur; boşsa anahtar yazılmaz', () {
      const ozel = Yaz(soru: 's', cevaplar: ['x'], ipuclari: ['i1', 'i2']);
      final j = ozel.toJson();
      expect(j['ipuclari'], ['i1', 'i2']);
      final geri = Alistirma.fromJson(
        (jsonDecode(jsonEncode(j)) as Map).cast<String, Object?>(),
      );
      expect(geri.ipuclari, ['i1', 'i2']);
      expect(secim.toJson().containsKey('ipuclari'), isFalse);
    });

    test('eski JSON (ipuclari yok) ve bozuk ipuclari → boş liste', () {
      final eski = Alistirma.fromJson({
        'tur': 'yaz',
        'soru': 's',
        'cevaplar': ['x'],
      });
      expect(eski.ipuclari, isEmpty);
      final bozuk = Alistirma.fromJson({
        'tur': 'yaz',
        'soru': 's',
        'cevaplar': ['x'],
        'ipuclari': 'metin',
      });
      expect(bozuk.ipuclari, isEmpty);
      final karisik = Alistirma.fromJson({
        'tur': 'yaz',
        'soru': 's',
        'cevaplar': ['x'],
        'ipuclari': ['iyi', 3, null],
      });
      expect(karisik.ipuclari, ['iyi']);
    });

    test('her tür ipuclari ile gidiş-dönüş', () {
      final liste = <Alistirma>[
        const Secim(soru: 's', secenekler: ['a'], dogru: 0, ipuclari: ['i']),
        const Bosluk(soru: '___', secenekler: ['a'], dogru: 0, ipuclari: ['i']),
        const Yaz(soru: 's', cevaplar: ['a'], ipuclari: ['i']),
        const Sirala(
          soru: 's',
          kelimeler: ['a'],
          dogru: ['a'],
          ipuclari: ['i'],
        ),
        const Eslestir(
          soru: 's',
          ciftler: [(sol: 'a', sag: 'b')],
          ipuclari: ['i'],
        ),
        const Dinle(
          soru: 's',
          okunacak: 'a',
          secenekler: ['a'],
          dogru: 0,
          ipuclari: ['i'],
        ),
        const Kod(
          soru: 's',
          kod: '___',
          secenekler: ['a'],
          dogru: 0,
          ipuclari: ['i'],
        ),
      ];
      for (final a in liste) {
        final geri = Alistirma.fromJson(
          (jsonDecode(jsonEncode(a.toJson())) as Map).cast<String, Object?>(),
        );
        expect(geri.tur, a.tur);
        expect(geri.ipuclari, ['i'], reason: a.tur);
        expect(jsonEncode(geri.toJson()), jsonEncode(a.toJson()));
      }
    });
  });
}
