/// Görevler ekranındaki "Haftalık ödev" kartı: hafta sonunda (Cumartesi,
/// Pazar) o haftanın en zayıf 5 kelimesini gösterir, "Zayıf noktalar" kısa
/// tekrarına götürür ve "Bu hafta ne öğrendim?" serbest not alanı sunar. Not
/// yerelde saklanır (en çok 52 hafta, 500 karakter); geçmiş notlar listelenir.
/// Hafta içinde kart kapalıdır ama geçmiş notlar yine görünür. Ağ yok.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../durum/saglayicilar.dart';
import '../model/durum.dart';
import '../motor/haftalik_odev.dart';
import '../tema/tema.dart';

class HaftalikOdevKarti extends ConsumerStatefulWidget {
  const HaftalikOdevKarti({super.key});

  @override
  ConsumerState<HaftalikOdevKarti> createState() => _HaftalikOdevDurumu();
}

class _HaftalikOdevDurumu extends ConsumerState<HaftalikOdevKarti> {
  late final TextEditingController _not;
  bool _kaydedildi = false;

  @override
  void initState() {
    super.initState();
    final d = ref.read(durumProvider).value ?? const OgrenciDurumu();
    _not = TextEditingController(
      text: HaftalikOdev.not(d, ref.read(bugunProvider)),
    );
  }

  @override
  void dispose() {
    _not.dispose();
    super.dispose();
  }

  Future<void> _kaydet() async {
    await ref.read(durumProvider.notifier).haftalikNotKaydet(_not.text);
    if (!mounted) return;
    setState(() => _kaydedildi = true);
  }

  @override
  Widget build(BuildContext context) {
    final d = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final bugun = ref.watch(bugunProvider);
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final acik = HaftalikOdev.acik(bugun);
    final zayif = acik
        ? HaftalikOdev.zayifKelimeler(d, ref.watch(kurslarProvider))
        : const [];
    final gecmis = HaftalikOdev.gecmis(d, bugun: bugun);

    return Card(
      key: const ValueKey('haftalik-odev'),
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(Icons.assignment_outlined, color: r.ana),
                const SizedBox(width: Olcu.b1),
                Expanded(
                  child: Semantics(
                    header: true,
                    child: Text('Haftalık ödev', style: yazi.titleMedium),
                  ),
                ),
              ],
            ),
            const SizedBox(height: Olcu.b1),
            if (!acik)
              Text(
                'Haftalık ödev hafta sonu açılır.',
                key: const ValueKey('odev-kapali'),
                style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
              )
            else ...[
              Text(
                'Bu haftanın en zayıf ${HaftalikOdev.zayifAdet} kelimesi',
                style: yazi.titleSmall,
              ),
              const SizedBox(height: Olcu.b1 / 2),
              if (zayif.isEmpty)
                Text(
                  'Henüz tekrar edilmiş kelime yok. Birkaç ders çöz; zayıf '
                  'kelimelerin burada çıkar.',
                  key: const ValueKey('odev-zayif-yok'),
                  style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                )
              else
                for (final s in zayif)
                  Padding(
                    key: ValueKey('odev-kelime-${s.kartId}-${s.metin}'),
                    padding: const EdgeInsets.symmetric(vertical: 2),
                    child: Text(
                      '${s.metin}: ${s.anlam} (güç ${s.puan}/100)',
                      style: yazi.bodyMedium,
                    ),
                  ),
              const SizedBox(height: Olcu.b1),
              OutlinedButton.icon(
                key: const ValueKey('odev-tekrar'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(48, 48),
                ),
                onPressed: zayif.isEmpty
                    ? null
                    : () => context.push('/mikro?mod=zayif'),
                icon: const Icon(Icons.replay),
                label: const Text('Zayıf noktaları tekrar et'),
              ),
              const SizedBox(height: Olcu.b2),
              TextField(
                key: const ValueKey('odev-not'),
                controller: _not,
                minLines: 2,
                maxLines: 5,
                maxLength: OgrenciDurumu.haftalikNotEnCokKarakter,
                decoration: const InputDecoration(
                  labelText: 'Bu hafta ne öğrendim?',
                  alignLabelWithHint: true,
                ),
                onChanged: (_) {
                  if (_kaydedildi) setState(() => _kaydedildi = false);
                },
              ),
              const SizedBox(height: Olcu.b1),
              FilledButton(
                key: const ValueKey('odev-kaydet'),
                style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
                onPressed: _kaydet,
                child: Text(_kaydedildi ? 'Kaydedildi' : 'Notu kaydet'),
              ),
            ],
            if (gecmis.isNotEmpty) ...[
              const SizedBox(height: Olcu.b2),
              Text('Geçmiş notlar', style: yazi.titleSmall),
              const SizedBox(height: Olcu.b1 / 2),
              for (final g in gecmis)
                Padding(
                  key: ValueKey('odev-gecmis-${g.hafta}'),
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Text.rich(
                    TextSpan(
                      children: [
                        TextSpan(
                          text: '${g.hafta}: ',
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                        TextSpan(text: g.not),
                      ],
                    ),
                    style: yazi.bodyMedium,
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }
}
