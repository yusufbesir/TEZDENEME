/// Yol sekmesinde alandaki kursları gruba göre süzen çip satırı. Alanda tek
/// grup varsa hiç görünmez. Seçim `OgrenciDurumu.yolGrubu` içinde saklanır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../durum/saglayicilar.dart';
import '../model/icerik.dart';
import '../sozluk/dil_tanimi.dart';

/// Kurs kimliğinin grup öneki ('almanca-2' -> 'almanca').
String kursGrubu(Kurs k) {
  final i = k.id.indexOf('-');
  return i <= 0 ? k.id : k.id.substring(0, i);
}

/// Alandaki kursların grupları, ilk görülme sırasıyla.
List<String> kursGruplari(List<Kurs> kurslar) {
  final cikis = <String>[];
  for (final k in kurslar) {
    final g = kursGrubu(k);
    if (!cikis.contains(g)) cikis.add(g);
  }
  return cikis;
}

/// [secili] boşsa ya da alanda yoksa tümü, değilse yalnız o grubun kursları.
List<Kurs> kurslariSuz(List<Kurs> kurslar, String secili) {
  if (secili.isEmpty || !kursGruplari(kurslar).contains(secili)) {
    return kurslar;
  }
  return [
    for (final k in kurslar)
      if (kursGrubu(k) == secili) k,
  ];
}

const Map<String, String> _kodAdlari = {
  'html': 'HTML',
  'css': 'CSS',
  'js': 'JavaScript',
  'python': 'Python',
  'sql': 'SQL',
  'php': 'PHP',
  'go': 'Go',
  'satranc': 'Satranç',
};

/// Grubun görünen adı.
String kursGrubuAdi(String grup) {
  for (final d in dilTanimlari) {
    if (d.kursOnek == grup) return d.ad;
  }
  return _kodAdlari[grup] ??
      (grup.isEmpty ? grup : grup[0].toUpperCase() + grup.substring(1));
}

class KursGrubuSecici extends ConsumerWidget {
  const KursGrubuSecici({
    super.key,
    required this.kurslar,
    required this.secili,
  });

  final List<Kurs> kurslar;
  final String secili;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gruplar = kursGruplari(kurslar);
    if (gruplar.length < 2) return const SizedBox.shrink();
    final gecerli = gruplar.contains(secili) ? secili : '';
    Widget cip(String grup, String ad) => Padding(
      padding: const EdgeInsets.only(right: 8),
      child: ChoiceChip(
        key: ValueKey('kurs-grubu-${grup.isEmpty ? 'tumu' : grup}'),
        label: Text(ad),
        selected: gecerli == grup,
        onSelected: (_) => ref.read(durumProvider.notifier).yolGrubuSec(grup),
      ),
    );
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          cip('', 'Tümü'),
          for (final g in gruplar) cip(g, kursGrubuAdi(g)),
        ],
      ),
    );
  }
}
