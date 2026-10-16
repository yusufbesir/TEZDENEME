/// Soru bankası: tüm soruları toplar; alan ve seviyeye göre bulucular sunar.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'model.dart';
import 'sorular/ingilizce_a1.dart';
import 'sorular/programlama_1.dart';
import 'sorular/programlama_2.dart';
import 'sorular/programlama_3.dart';

/// Tüm sorular (değiştirilemez liste).
final List<YarismaSorusu> tumSorular = List.unmodifiable([
  ...ingilizceA1Sorulari,
  ...programlama1Sorulari,
  ...programlama2Sorulari,
  ...programlama3Sorulari,
]);

/// Alan ve seviye (kurs) kimliğine uyan sorular; yoksa boş liste.
List<YarismaSorusu> sorulariBul(String alan, String kursId) => [
  for (final s in tumSorular)
    if (s.alan == alan && s.seviyeKursId == kursId) s,
];

/// Alanın seviyeleri; bilinmeyen alan için boş liste.
List<YarismaSeviye> seviyeler(String alan) => switch (alan) {
  'dil' => const [YarismaSeviye(kursId: 'ingilizce-1', etiket: 'A1')],
  'kod' => const [
    YarismaSeviye(kursId: 'html-1', etiket: 'HTML'),
    YarismaSeviye(kursId: 'css-1', etiket: 'CSS'),
    YarismaSeviye(kursId: 'js-1', etiket: 'JS'),
  ],
  _ => const [],
};
