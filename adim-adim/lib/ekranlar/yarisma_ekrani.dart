/// Yarışma sekmesi: şimdilik yer tutucu ("Çok yakında").
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Gerçek yarışma ekranı bu dosyayı sonra dolduracak.
library;

import 'package:flutter/material.dart';

import '../bilesenler/sayfa_govdesi.dart';
import '../tema/tema.dart';

class YarismaYerTutucu extends StatelessWidget {
  const YarismaYerTutucu({super.key});

  @override
  Widget build(BuildContext context) {
    final yazi = Theme.of(context).textTheme;
    return SafeArea(
      child: SayfaGovdesi(
        child: Padding(
          padding: const EdgeInsets.all(Olcu.b3),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                header: true,
                child: Text('Bilgi Yarışması', style: yazi.headlineMedium),
              ),
              const SizedBox(height: Olcu.b2),
              Text('Çok yakında', style: yazi.bodyLarge),
            ],
          ),
        ),
      ),
    );
  }
}
