/// Kelime bulutu ekranı (ÖZELLİK 66): öğrenilen kelimelerin güce göre
/// büyüyen bulutu ve "öğrendiğin kelime sayısı". Boyut gücü anlatır (renge
/// ek olarak); bir kelimeye dokununca anlamı ve gücü yazıyla gösterilir.
/// Profil'deki "Kelime bulutu" satırından açılır. Yalnız dil kurslarında.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../motor/kelime_bulutu.dart';
import '../tema/tema.dart';

class KelimeBulutuEkrani extends ConsumerWidget {
  const KelimeBulutuEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final kelimeler = KelimeBulutu.uret(durum, ref.watch(alanKurslariProvider));
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final gosterilen = kelimeler.take(KelimeBulutu.enCokGosterim).toList();
    // Alfabetik dizilim: bulut okunaklı kalır, boyut gücü gösterir.
    gosterilen.sort(
      (a, b) => a.metin.toLowerCase().compareTo(b.metin.toLowerCase()),
    );
    Color renk(KelimeGucu k) => switch (k) {
      KelimeGucu.guclu => r.dogru,
      KelimeGucu.orta => r.ana,
      KelimeGucu.zayif => r.hata,
      KelimeGucu.yeni => r.metinIkincil,
    };
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kelime bulutu'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/profil'),
        ),
      ),
      body: SafeArea(
        child: SayfaGovdesi(
          child: kelimeler.isEmpty
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(Olcu.b3),
                    child: Text(
                      'Henüz öğrenilmiş kelime yok. Dil dersleri bitirdikçe '
                      'kelimelerin burada büyür.',
                      key: const ValueKey('kelime-bulutu-bos'),
                      style: yazi.bodyLarge,
                      textAlign: TextAlign.center,
                    ),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(Olcu.b3),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        '${kelimeler.length}',
                        key: const ValueKey('kelime-bulutu-sayi'),
                        textAlign: TextAlign.center,
                        style: yazi.displayMedium?.copyWith(color: r.ana),
                      ),
                      Text(
                        'öğrendiğin kelime',
                        textAlign: TextAlign.center,
                        style: yazi.titleMedium,
                      ),
                      const SizedBox(height: Olcu.b3),
                      Wrap(
                        key: const ValueKey('kelime-bulutu'),
                        alignment: WrapAlignment.center,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        spacing: Olcu.b2,
                        runSpacing: Olcu.b1,
                        children: [
                          for (final k in gosterilen)
                            Semantics(
                              label: '${k.metin}, ${k.anlam}, ${k.kume.etiket}',
                              button: true,
                              excludeSemantics: true,
                              child: InkWell(
                                borderRadius: BorderRadius.circular(8),
                                onTap: () => ScaffoldMessenger.of(context)
                                  ..hideCurrentSnackBar()
                                  ..showSnackBar(
                                    SnackBar(
                                      content: Text(
                                        '${k.metin}: ${k.anlam} (${k.kume.etiket})',
                                      ),
                                    ),
                                  ),
                                child: ConstrainedBox(
                                  constraints: const BoxConstraints(
                                    minHeight: 32,
                                  ),
                                  child: Text(
                                    k.metin,
                                    style: TextStyle(
                                      fontSize: KelimeBulutu.boyut(k.guc),
                                      fontWeight: k.kume == KelimeGucu.guclu
                                          ? FontWeight.w800
                                          : FontWeight.w500,
                                      color: renk(k.kume),
                                    ),
                                  ),
                                ),
                              ),
                            ),
                        ],
                      ),
                      if (kelimeler.length > gosterilen.length)
                        Padding(
                          padding: const EdgeInsets.only(top: Olcu.b2),
                          child: Text(
                            'En güçlü ${gosterilen.length} kelime gösteriliyor.',
                            textAlign: TextAlign.center,
                            style: yazi.bodySmall?.copyWith(
                              color: r.metinIkincil,
                            ),
                          ),
                        ),
                      const SizedBox(height: Olcu.b3),
                      Text(
                        'Büyük yazı = daha güçlü hatırlıyorsun. Güçlü, orta, '
                        'zayıf ve yeni kelimeler sağlık eşiklerine göre '
                        'ayrılır.',
                        style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),
        ),
      ),
    );
  }
}
