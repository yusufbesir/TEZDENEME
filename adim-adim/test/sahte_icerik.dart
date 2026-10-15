import 'package:adim_adim/model/icerik.dart';

/// Arayüz testleri için küçük sahte içerik: 1 kurs, 1 ünite, 2 ders;
/// her derste her türden bir alıştırma.
const sahteKursId = 'sahte-1';
const sahteDers1 = 'sahte-1.u1.d1';
const sahteDers2 = 'sahte-1.u1.d2';

List<Alistirma> _alistirmalar() => const [
  Secim(
    soru: 'İki artı iki kaç eder?',
    secenekler: ['üç', 'dört', 'beş'],
    dogru: 1,
    aciklama: '2 + 2 = 4',
  ),
  Bosluk(
    soru: 'I ___ a student.',
    secenekler: ['am', 'is', 'are'],
    dogru: 0,
    aciklama: 'I ile am kullanılır.',
  ),
  Yaz(soru: '"Merhaba" İngilizce nasıl yazılır?', cevaplar: ['hello', 'hi']),
  Sirala(
    soru: 'Cümleyi diz.',
    kelimeler: ['am', 'I', 'happy'],
    dogru: ['I', 'am', 'happy'],
  ),
  Eslestir(
    soru: 'Eşleştir.',
    ciftler: [
      (sol: 'cat', sag: 'kedi'),
      (sol: 'dog', sag: 'köpek'),
      (sol: 'bird', sag: 'kuş'),
    ],
  ),
  Dinle(
    soru: 'Ne duydun?',
    okunacak: 'Good morning',
    secenekler: ['Good morning', 'Good evening'],
    dogru: 0,
  ),
  Kod(
    soru: 'Boşluğu doldur.',
    kod: '<p>___</p>',
    secenekler: ['Merhaba', '</div>'],
    dogru: 0,
    dil: 'html',
  ),
];

final Kurs sahteKurs = Kurs(
  id: sahteKursId,
  ad: 'Sahte Kurs',
  aciklama: 'Test için küçük kurs.',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'sahte-1.u1',
      ad: 'Sahte Ünite',
      dersler: [
        Ders(id: sahteDers1, ad: 'Ders Bir', alistirmalar: _alistirmalar()),
        Ders(id: sahteDers2, ad: 'Ders İki', alistirmalar: _alistirmalar()),
      ],
    ),
  ],
);
