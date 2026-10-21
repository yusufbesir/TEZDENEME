/// Ünite özeti: biten ünitenin kelime/terim, kalıp/sözdizimi satırları ve
/// dilbilgisi notları tek sayfada (türetilir, saklanmaz); "Metni kopyala" ve
/// kursun okuma hikâyesi varsa ona bağlantı.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../icerik/hikayeler.dart';
import '../model/hikaye.dart';
import '../model/icerik.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

class UniteOzetiEkrani extends ConsumerWidget {
  const UniteOzetiEkrani({
    super.key,
    required this.kursId,
    required this.uniteIndeks,
  });
  final String kursId;
  final int uniteIndeks;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value;
    Kurs? kurs;
    for (final k in ref.watch(kurslarProvider)) {
      if (k.id == kursId) kurs = k;
    }
    void cik() => context.canPop() ? context.pop() : context.go('/yol');
    final gecerli =
        durum != null &&
        kurs != null &&
        uniteIndeks >= 0 &&
        uniteIndeks < kurs.uniteler.length &&
        Motor.uniteBitmis(durum, kurs.uniteler[uniteIndeks]);
    if (!gecerli) {
      return Scaffold(
        appBar: AppBar(title: const Text('Ünite özeti')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(Olcu.b3),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'Özet, ünite bitince açılır.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: Olcu.b2),
                FilledButton(onPressed: cik, child: const Text('Yola dön')),
              ],
            ),
          ),
        ),
      );
    }
    final ozet = Motor.uniteOzeti(kurs, uniteIndeks);
    Hikaye? hikaye;
    for (final h in tumHikayeler) {
      if (h.kursId == kurs.id) {
        hikaye = h;
        break;
      }
    }
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    Widget baslik(String t) => Padding(
      padding: const EdgeInsets.only(top: Olcu.b3, bottom: Olcu.b1),
      child: Text(t, style: yazi.titleMedium?.copyWith(color: r.ana)),
    );
    return Scaffold(
      appBar: AppBar(title: const Text('Ünite özeti')),
      body: SafeArea(
        child: SayfaGovdesi(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(Olcu.b3),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(ozet.uniteAd, style: yazi.headlineSmall),
                if (ozet.kelimeler.isNotEmpty) ...[
                  baslik(ozet.kelimeBasligi),
                  for (final k in ozet.kelimeler)
                    Padding(
                      padding: const EdgeInsets.only(bottom: Olcu.b1),
                      child: Text.rich(
                        TextSpan(
                          children: [
                            TextSpan(
                              text: k.kelime,
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            TextSpan(text: ': ${k.anlam}'),
                          ],
                        ),
                      ),
                    ),
                ],
                if (ozet.kaliplar.isNotEmpty) ...[
                  baslik(ozet.kalipBasligi),
                  for (final k in ozet.kaliplar)
                    Padding(
                      padding: const EdgeInsets.only(bottom: Olcu.b1),
                      child: Text(k),
                    ),
                ],
                if (ozet.notlar.isNotEmpty) ...[
                  baslik('Dilbilgisi notları'),
                  for (final n in ozet.notlar)
                    Padding(
                      padding: const EdgeInsets.only(bottom: Olcu.b1),
                      child: Text.rich(
                        TextSpan(
                          children: [
                            TextSpan(
                              text: '${n.ders}: ',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            TextSpan(text: n.not),
                          ],
                        ),
                      ),
                    ),
                ],
                const SizedBox(height: Olcu.b3),
                OutlinedButton.icon(
                  key: const ValueKey('unite-ozeti-kopyala'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: () async {
                    final mesaj = ScaffoldMessenger.of(context);
                    await Clipboard.setData(ClipboardData(text: ozet.metin()));
                    mesaj
                      ..hideCurrentSnackBar()
                      ..showSnackBar(
                        const SnackBar(content: Text('Ünite özeti kopyalandı')),
                      );
                  },
                  icon: const Icon(Icons.copy),
                  label: const Text('Metni kopyala'),
                ),
                if (hikaye != null) ...[
                  const SizedBox(height: Olcu.b2),
                  OutlinedButton.icon(
                    key: const ValueKey('unite-ozeti-hikaye'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(48, 48),
                    ),
                    onPressed: () => context.push(
                      '/hikaye/${Uri.encodeComponent(hikaye!.id)}',
                    ),
                    icon: const Icon(Icons.menu_book_outlined),
                    label: const Text('Bu seviyenin hikâyesini oku'),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
