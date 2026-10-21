// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Öneri 72-83 testleri için ortak küçük içerik: iki ünitelik dil kursu
/// ('ingilizce-t1': Hayvanlar 6 çift, Renkler 4 çift) ve bir kod kursu.
library;

import 'package:adim_adim/model/icerik.dart';

const tKursId = 'ingilizce-t1';
const tDers1 = 'ingilizce-t1.u1.d1';
const tDers2 = 'ingilizce-t1.u1.d2';
const tDers3 = 'ingilizce-t1.u2.d1';

final Kurs hayvanKursu = Kurs(
  id: tKursId,
  ad: 'Deneme Kursu A1',
  aciklama: '',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'ingilizce-t1.u1',
      ad: 'Hayvanlar',
      dersler: [
        Ders(
          id: tDers1,
          ad: 'Bir',
          alistirmalar: const [
            Eslestir(
              soru: 'Eşleştir',
              ciftler: [(sol: 'cat', sag: 'kedi'), (sol: 'dog', sag: 'köpek')],
            ),
            Eslestir(
              soru: 'Eşleştir',
              ciftler: [(sol: 'bird', sag: 'kuş'), (sol: 'fish', sag: 'balık')],
            ),
          ],
        ),
        Ders(
          id: tDers2,
          ad: 'İki',
          alistirmalar: const [
            Eslestir(
              soru: 'Eşleştir',
              ciftler: [(sol: 'horse', sag: 'at'), (sol: 'cow', sag: 'inek')],
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-t1.u2',
      ad: 'Renkler',
      dersler: [
        Ders(
          id: tDers3,
          ad: 'Üç',
          alistirmalar: const [
            Eslestir(
              soru: 'Eşleştir',
              ciftler: [
                (sol: 'red', sag: 'kırmızı'),
                (sol: 'blue', sag: 'mavi'),
                (sol: 'green', sag: 'yeşil'),
                (sol: 'yellow', sag: 'sarı'),
              ],
            ),
          ],
        ),
      ],
    ),
  ],
);

/// Hayvanlar ünitesinin 6 kelimesi (Bir ve İki dersleri bitmiş).
const hayvanSayisi = 6;
