/// Ünite rehber kitapçığı ekranı (ÖZELLİK 42): ünitenin başında açılabilen
/// kısa rehber. İçerik [UniteRehberi.uret] ile ünite verisinden türetilir:
/// CEFR düzeyi, anahtar kalıplar, örnek cümleler (dil kurslarında sesli),
/// anahtar kelimeler ve dilbilgisi notları. Ana sayfada ünite başlığındaki
/// rehber düğmesinden açılır; ünite bittiyse özete bağlantı da gösterilir.
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
import '../model/icerik.dart';
import '../icerik/senaryolar.dart';
import '../motor/motor.dart';
import '../motor/senaryo.dart';
import '../motor/unite_rehberi.dart';
import '../tema/tema.dart';

class UniteRehberiEkrani extends ConsumerWidget {
  const UniteRehberiEkrani({
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
    final rehber = kurs == null ? null : UniteRehberi.uret(kurs, uniteIndeks);
    if (kurs == null || rehber == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Ünite rehberi')),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(Olcu.b3),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Rehber bulunamadı.', textAlign: TextAlign.center),
                const SizedBox(height: Olcu.b2),
                FilledButton(onPressed: cik, child: const Text('Yola dön')),
              ],
            ),
          ),
        ),
      );
    }
    final bitti =
        durum != null && Motor.uniteBitmis(durum, kurs.uniteler[uniteIndeks]);
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final sesDili = rehber.sesDili;

    Widget baslik(String t) => Padding(
      padding: const EdgeInsets.only(top: Olcu.b3, bottom: Olcu.b1),
      child: Semantics(
        header: true,
        child: Text(t, style: yazi.titleMedium?.copyWith(color: r.ana)),
      ),
    );

    Widget satir(RehberSatiri s, {Key? anahtar}) => Padding(
      padding: const EdgeInsets.only(bottom: Olcu.b1),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (sesDili != null)
            SizedBox(
              width: Olcu.hedef,
              height: Olcu.hedef,
              child: IconButton(
                key: anahtar,
                icon: const Icon(Icons.volume_up_outlined),
                tooltip: 'Oku',
                onPressed: () =>
                    ref.read(sesProvider).oku(s.metin, dil: sesDili),
              ),
            ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: Olcu.b1),
              child: Text.rich(
                TextSpan(
                  children: [
                    TextSpan(
                      text: s.metin,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    if (s.anlam != null) TextSpan(text: ': ${s.anlam}'),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Ünite rehberi'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: cik,
        ),
      ),
      body: SafeArea(
        child: SayfaGovdesi(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(Olcu.b3),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(rehber.uniteAd, style: yazi.headlineSmall),
                const SizedBox(height: Olcu.b1),
                Text(
                  rehber.kursAd,
                  style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                ),
                const SizedBox(height: Olcu.b2),
                Wrap(
                  spacing: Olcu.b1,
                  runSpacing: Olcu.b1,
                  children: [
                    if (rehber.cefr != null)
                      Chip(
                        key: const ValueKey('rehber-cefr'),
                        avatar: const Icon(Icons.school_outlined),
                        label: Text('CEFR ${rehber.cefr}'),
                      ),
                    Chip(
                      key: const ValueKey('rehber-ders'),
                      avatar: const Icon(Icons.menu_book_outlined),
                      label: Text('${rehber.dersSayisi} ders'),
                    ),
                    Chip(
                      key: const ValueKey('rehber-sure'),
                      avatar: const Icon(Icons.schedule),
                      label: Text('yaklaşık ${rehber.dakika} dk'),
                    ),
                  ],
                ),
                if (rehber.bos)
                  Padding(
                    padding: const EdgeInsets.only(top: Olcu.b3),
                    child: Text(
                      'Bu ünite için henüz derlenecek bir şey yok.',
                      style: yazi.bodyLarge,
                    ),
                  ),
                if (rehber.kaliplar.isNotEmpty) ...[
                  baslik(rehber.kalipBasligi),
                  for (var i = 0; i < rehber.kaliplar.length; i++)
                    satir(
                      rehber.kaliplar[i],
                      anahtar: ValueKey('rehber-kalip-$i'),
                    ),
                ],
                if (rehber.cumleler.isNotEmpty) ...[
                  baslik('Örnek cümleler'),
                  for (var i = 0; i < rehber.cumleler.length; i++)
                    satir(
                      rehber.cumleler[i],
                      anahtar: ValueKey('rehber-cumle-$i'),
                    ),
                ],
                if (rehber.kelimeler.isNotEmpty) ...[
                  baslik(rehber.kelimeBasligi),
                  for (final k in rehber.kelimeler)
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
                if (rehber.notlar.isNotEmpty) ...[
                  baslik('Dilbilgisi notları'),
                  for (final n in rehber.notlar)
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
                  key: const ValueKey('rehber-kopyala'),
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: () async {
                    final mesaj = ScaffoldMessenger.of(context);
                    await Clipboard.setData(
                      ClipboardData(text: rehber.metin()),
                    );
                    mesaj
                      ..hideCurrentSnackBar()
                      ..showSnackBar(
                        const SnackBar(content: Text('Rehber kopyalandı')),
                      );
                  },
                  icon: const Icon(Icons.copy),
                  label: const Text('Metni kopyala'),
                ),
                if (Senaryolar.listele(tumSenaryolar, [kurs]).isNotEmpty) ...[
                  const SizedBox(height: Olcu.b2),
                  OutlinedButton.icon(
                    key: const ValueKey('rehber-senaryo'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(48, 48),
                    ),
                    onPressed: () => context.push('/senaryolar'),
                    icon: const Icon(Icons.forum_outlined),
                    label: const Text('Örnek diyalog: senaryolu konuşma'),
                  ),
                ],
                if (bitti && !Motor.uniteOzeti(kurs, uniteIndeks).bos) ...[
                  const SizedBox(height: Olcu.b2),
                  OutlinedButton.icon(
                    key: const ValueKey('rehber-ozet'),
                    style: OutlinedButton.styleFrom(
                      minimumSize: const Size(48, 48),
                    ),
                    onPressed: () => context.push(
                      '/unite-ozeti?kurs=${Uri.encodeComponent(kurs!.id)}'
                      '&unite=$uniteIndeks',
                    ),
                    icon: const Icon(Icons.summarize_outlined),
                    label: const Text('Ünite özeti'),
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
