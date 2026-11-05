/// Yol sekmesinde kurs grubu seçici: alandaki kurslar (İngilizce, Almanca, HTML, Python...)
/// tek uzun yolda alt alta durduğu için seçilen grubun yolu gösterilir; "Tümü" hepsini gösterir.
/// Seçim oturum boyunca korunur (kalıcı değildir).
/// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım özellikler#cihaz] Claude
/// Yalnız onu yazan yapay zekâ değiştirir; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../model/icerik.dart';

/// Seçili grup kimliği; null = Tümü.
class YolGrubuDenetcisi extends Notifier<String?> {
  @override
  String? build() => null;

  void sec(String? grup) => state = grup;
}

final yolGrubuProvider = NotifierProvider<YolGrubuDenetcisi, String?>(
  YolGrubuDenetcisi.new,
);

const Map<String, String> _grupAdlari = {
  'ingilizce': 'İngilizce',
  'almanca': 'Almanca',
  'fransizca': 'Fransızca',
  'rusca': 'Rusça',
  'arapca': 'Arapça',
  'korece': 'Korece',
  'japonca': 'Japonca',
  'cince': 'Çince',
  'html': 'HTML',
  'css': 'CSS',
  'js': 'JavaScript',
  'python': 'Python',
  'sql': 'SQL',
  'php': 'PHP',
  'go': 'Go',
  'satranc': 'Satranç',
};

/// Kurs kimliğinden grup kimliği: 'almanca-2' -> 'almanca'.
String kursGrubu(Kurs k) {
  final i = k.id.lastIndexOf('-');
  return i > 0 ? k.id.substring(0, i) : k.id;
}

/// Grup görünen adı; bilinmiyorsa kimliğin baş harfi büyütülür.
String grupAdi(String grup) =>
    _grupAdlari[grup] ??
    (grup.isEmpty ? grup : grup[0].toUpperCase() + grup.substring(1));

/// [kurslar] içindeki grupların sıralı (ilk görülme) listesi.
List<String> kursGruplari(List<Kurs> kurslar) {
  final sonuc = <String>[];
  for (final k in kurslar) {
    final g = kursGrubu(k);
    if (!sonuc.contains(g)) sonuc.add(g);
  }
  return sonuc;
}

/// Seçime göre görünecek kurslar; seçim yoksa ya da bu alanda yoksa hepsi.
List<Kurs> grupKurslari(List<Kurs> kurslar, String? secili) {
  if (secili == null) return kurslar;
  final filtre = [
    for (final k in kurslar)
      if (kursGrubu(k) == secili) k,
  ];
  return filtre.isEmpty ? kurslar : filtre;
}

/// Yatay kaydırılan grup çipleri; tek grup varsa hiçbir şey çizmez.
class YolGrubuSecici extends ConsumerWidget {
  const YolGrubuSecici({super.key, required this.kurslar});

  final List<Kurs> kurslar;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final gruplar = kursGruplari(kurslar);
    if (gruplar.length < 2) return const SizedBox.shrink();
    final secili = ref.watch(yolGrubuProvider);
    final gecerli = secili != null && gruplar.contains(secili) ? secili : null;
    void sec(String? g) => ref.read(yolGrubuProvider.notifier).sec(g);
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Semantics(
        label: 'Kurs seç',
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              Padding(
                padding: const EdgeInsets.only(right: 8),
                child: ChoiceChip(
                  key: const ValueKey('yol-grup-tumu'),
                  label: const Text('Tümü'),
                  selected: gecerli == null,
                  onSelected: (_) => sec(null),
                ),
              ),
              for (final g in gruplar)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: ChoiceChip(
                    key: ValueKey('yol-grup-$g'),
                    label: Text(grupAdi(g)),
                    selected: gecerli == g,
                    onSelected: (_) => sec(g),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
