/// Soru bankası: tüm soruları toplar; alan ve seviyeye göre bulucular sunar.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'model.dart';
import 'sorular/ingilizce_a1.dart';
import 'sorular/ingilizce_a2.dart';
import 'sorular/ingilizce_b1.dart';
import 'sorular/ingilizce_b2.dart';
import 'sorular/oyun_sorulari.dart';
import 'sorular/programlama_1.dart';
import 'sorular/programlama_2.dart';
import 'sorular/programlama_3.dart';

/// Tüm sorular (değiştirilemez liste).
final List<YarismaSorusu> tumSorular = List.unmodifiable([
  ...ingilizceA1Sorulari,
  ...ingilizceA2Sorulari,
  ...ingilizceB1Sorulari,
  ...ingilizceB2Sorulari,
  ...programlama1Sorulari,
  ...programlama2Sorulari,
  ...programlama3Sorulari,
  ...oyunSorulari,
]);

/// Alan ve seviye (kurs) kimliğine uyan sorular; yoksa boş liste.
List<YarismaSorusu> sorulariBul(String alan, String kursId) => [
  for (final s in tumSorular)
    if (s.alan == alan && s.seviyeKursId == kursId) s,
];

/// Alanın seviyeleri; bilinmeyen alan için boş liste. 'oyun' alanında üç
/// seviye vardır (satranç kurslarının kimlikleriyle): Başlangıç, Orta, İleri.
List<YarismaSeviye> seviyeler(String alan) => switch (alan) {
  'dil' => const [
    YarismaSeviye(kursId: 'ingilizce-1', etiket: 'A1'),
    YarismaSeviye(kursId: 'ingilizce-2', etiket: 'A2'),
    YarismaSeviye(kursId: 'ingilizce-3', etiket: 'B1'),
    YarismaSeviye(kursId: 'ingilizce-4', etiket: 'B2'),
  ],
  'kod' => const [
    YarismaSeviye(kursId: 'html-1', etiket: 'HTML'),
    YarismaSeviye(kursId: 'css-1', etiket: 'CSS'),
    YarismaSeviye(kursId: 'js-1', etiket: 'JS'),
  ],
  'oyun' => const [
    YarismaSeviye(kursId: 'satranc-1', etiket: 'Başlangıç'),
    YarismaSeviye(kursId: 'satranc-2', etiket: 'Orta'),
    YarismaSeviye(kursId: 'satranc-3', etiket: 'İleri'),
  ],
  _ => const [],
};
