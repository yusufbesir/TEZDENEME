/// Ders/alıştırma oturumundan çıkarken gösterilen "İlerlemeni kaybedeceksin"
/// alt sayfası. "Devam et" öne çıkan (dolu) düğme, "Dersten çık" ikincil
/// (metin) düğmedir. Sayfa dışına dokunmak ya da kapatmak "devam et" sayılır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dalga7]
library;

import 'package:flutter/material.dart';

import '../tema/tema.dart';

/// Alt sayfayı açar; kullanıcı "Dersten çık"ı seçerse true, aksi halde false.
Future<bool> cikisSayfasiGoster(BuildContext context) async {
  final sonuc = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (c) => const _CikisSayfasi(),
  );
  return sonuc == true;
}

class _CikisSayfasi extends StatelessWidget {
  const _CikisSayfasi();

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(Olcu.b3, 0, Olcu.b3, Olcu.b2),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Icon(Icons.warning_amber_rounded, size: 40, color: r.vurgu),
            const SizedBox(height: Olcu.b1),
            Semantics(
              header: true,
              child: Text(
                'İlerlemeni kaybedeceksin',
                textAlign: TextAlign.center,
                style: yazi.titleLarge,
              ),
            ),
            const SizedBox(height: Olcu.b1),
            Text(
              'Şimdi çıkarsan bu oturumdaki ilerleme kaydedilmez.',
              textAlign: TextAlign.center,
              style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
            ),
            const SizedBox(height: Olcu.b3),
            FilledButton(
              key: const Key('cikis-devam'),
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Devam et'),
            ),
            const SizedBox(height: Olcu.b1),
            TextButton(
              key: const Key('cikis-cik'),
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Dersten çık'),
            ),
          ],
        ),
      ),
    );
  }
}
