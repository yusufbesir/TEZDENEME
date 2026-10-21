// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Çalışma planı ekranı: kurs, hedef (kursun tamamı ya da bir ünite), günde
/// dakika ve haftanın günleri seçilir; tahmini bitiş ve günlük ders sayısı
/// canlı gösterilir. Kaydet / Planı sil. Ayarlar'dan ya da ana sayfa
/// kartından `push` ile açılır.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/calisma_plani_karti.dart';
import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../model/icerik.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

const _gunAdlari = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

class CalismaPlaniEkrani extends ConsumerStatefulWidget {
  const CalismaPlaniEkrani({super.key});

  @override
  ConsumerState<CalismaPlaniEkrani> createState() => _PlanDurumu();
}

class _PlanDurumu extends ConsumerState<CalismaPlaniEkrani> {
  CalismaPlani? _plan;

  @override
  Widget build(BuildContext context) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final kurslar = ref.watch(alanKurslariProvider);
    final bugun = ref.watch(bugunProvider);
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;

    // Taslak: önce düzenlenen, sonra kayıtlı plan, yoksa ilk kurs.
    var plan = _plan ?? durum.calismaPlani;
    if (plan == null && kurslar.isNotEmpty) {
      plan = CalismaPlani(kursId: kurslar.first.id);
    }
    Kurs? kurs;
    for (final k in kurslar) {
      if (k.id == plan?.kursId) kurs = k;
    }
    // Kayıtlı kurs artık yok (alan değişti): ilk kursa düş.
    if (plan != null && kurs == null && kurslar.isNotEmpty) {
      kurs = kurslar.first;
      plan = CalismaPlani(kursId: kurs.id);
    }
    if (plan != null && kurs != null && plan.uniteId != null) {
      if (!kurs.uniteler.any((u) => u.id == plan!.uniteId)) {
        plan = plan.copyWith(uniteSil: true);
      }
    }
    final p = plan;
    final k = kurs;

    final ozet = p == null
        ? null
        : Motor.planOzeti(durum.copyWith(calismaPlani: p), kurslar, bugun);

    Widget bolum(String baslik) => Padding(
      padding: const EdgeInsets.only(top: Olcu.b3, bottom: Olcu.b1),
      child: Semantics(
        header: true,
        child: Text(baslik, style: yazi.titleMedium),
      ),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Çalışma planı'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          tooltip: 'Geri',
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/yol'),
        ),
      ),
      body: SafeArea(
        child: SayfaGovdesi(
          child: p == null || k == null
              ? const Center(child: Text('Önce bir alan ve kurs seç.'))
              : ListView(
                  padding: const EdgeInsets.all(Olcu.b2),
                  children: [
                    bolum('Kurs'),
                    DropdownButton<String>(
                      key: const ValueKey('plan-kurs'),
                      isExpanded: true,
                      value: k.id,
                      items: [
                        for (final x in kurslar)
                          DropdownMenuItem(
                            value: x.id,
                            child: Text(x.ad, overflow: TextOverflow.ellipsis),
                          ),
                      ],
                      onChanged: (v) => setState(
                        () => _plan = p.copyWith(
                          kursId: v ?? p.kursId,
                          uniteSil: true,
                        ),
                      ),
                    ),
                    bolum('Hedef'),
                    DropdownButton<String?>(
                      key: const ValueKey('plan-hedef'),
                      isExpanded: true,
                      value: p.uniteId,
                      items: [
                        const DropdownMenuItem<String?>(
                          value: null,
                          child: Text('Kursun tamamı'),
                        ),
                        for (final u in k.uniteler)
                          DropdownMenuItem<String?>(
                            value: u.id,
                            child: Text(u.ad, overflow: TextOverflow.ellipsis),
                          ),
                      ],
                      onChanged: (v) => setState(
                        () => _plan = v == null
                            ? p.copyWith(uniteSil: true)
                            : p.copyWith(uniteId: v),
                      ),
                    ),
                    bolum('Günde süre'),
                    Wrap(
                      spacing: Olcu.b1,
                      runSpacing: Olcu.b1,
                      children: [
                        for (final dk in CalismaPlani.dakikaSecenekleri)
                          ChoiceChip(
                            key: ValueKey('plan-dakika-$dk'),
                            label: Text('$dk dk'),
                            selected: p.gunlukDakika == dk,
                            onSelected: (_) => setState(
                              () => _plan = p.copyWith(gunlukDakika: dk),
                            ),
                          ),
                      ],
                    ),
                    bolum('Çalışılacak günler'),
                    Wrap(
                      spacing: Olcu.b1,
                      runSpacing: Olcu.b1,
                      children: [
                        for (var g = 1; g <= 7; g++)
                          FilterChip(
                            key: ValueKey('plan-gun-$g'),
                            label: Text(_gunAdlari[g - 1]),
                            selected: p.gunler.contains(g),
                            onSelected: (sec) => setState(
                              () => _plan = p.copyWith(
                                gunler: {
                                  for (final x in p.gunler)
                                    if (x != g) x,
                                  if (sec) g,
                                },
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: Olcu.b3),
                    Card(
                      key: const ValueKey('plan-ozet'),
                      child: Padding(
                        padding: const EdgeInsets.all(Olcu.b2),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Günde ${Motor.planGunlukDers(p.gunlukDakika)} ders '
                              '(ders başına ~${Motor.ortalamaDersDakikasi} dk varsayımı)',
                              style: yazi.titleMedium,
                            ),
                            if (ozet != null) ...[
                              Text(
                                'Kalan: ${ozet.kalan} / ${ozet.toplam} ders',
                                style: yazi.bodyMedium,
                              ),
                              Text(
                                ozet.kalan == 0
                                    ? 'Bu hedef zaten tamamlanmış.'
                                    : ozet.bitis == null
                                    ? 'En az bir gün seç.'
                                    : 'Tahmini bitiş: ${planTarihMetni(ozet.bitis!)}',
                                style: yazi.bodyMedium?.copyWith(
                                  color: r.metinIkincil,
                                ),
                              ),
                            ],
                            Text(
                              'Haftalık hedef önerisi: haftada '
                              '${Motor.planHaftalikOneri(p)} gün',
                              style: yazi.bodyMedium?.copyWith(
                                color: r.metinIkincil,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: Olcu.b2),
                    FilledButton(
                      key: const ValueKey('plan-kaydet'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                      ),
                      onPressed: p.gunler.isEmpty
                          ? null
                          : () async {
                              await ref
                                  .read(durumProvider.notifier)
                                  .planKaydet(p);
                              if (context.mounted) {
                                context.canPop()
                                    ? context.pop()
                                    : context.go('/yol');
                              }
                            },
                      child: const Text('Kaydet'),
                    ),
                    if (durum.calismaPlani != null) ...[
                      const SizedBox(height: Olcu.b1),
                      OutlinedButton(
                        key: const ValueKey('plan-sil'),
                        style: OutlinedButton.styleFrom(
                          minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                        ),
                        onPressed: () async {
                          await ref
                              .read(durumProvider.notifier)
                              .planKaydet(null);
                          if (context.mounted) {
                            context.canPop()
                                ? context.pop()
                                : context.go('/yol');
                          }
                        },
                        child: const Text('Planı sil'),
                      ),
                    ],
                  ],
                ),
        ),
      ),
    );
  }
}
