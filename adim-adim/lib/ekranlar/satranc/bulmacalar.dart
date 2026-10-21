/// Satranç bulmaca ekranları: günlük bulmaca (ÖZELLİK 47), tema bazlı
/// bulmacalar (52) ve yanlış çözülenlerin tekrar destesi (52). Bulmaca
/// ilk denemede yanlışsa tekrar destesine girer (ayrı yarı ömürlü kart);
/// ders kartlarının aralıkları değişmez.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../durum/saglayicilar.dart';
import '../../model/durum.dart';
import '../../motor/satranc_calisma.dart';
import '../../satranc/veri.dart';
import '../../tema/tema.dart';
import 'ortak.dart';

/// Günlük bulmaca: tarihe göre belirlenir; ilk deneme sonucu kaydedilir.
class GunlukBulmacaEkrani extends ConsumerWidget {
  const GunlukBulmacaEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final bugun = ref.watch(bugunProvider);
    final b = SatrancCalisma.gunlukBulmaca(bugun);
    final onceki = SatrancCalisma.gunlukSonuc(durum, bugun);
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    return satrancIskele(
      context,
      'Günlük bulmaca',
      SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              onceki == null
                  ? 'Bugünün bulmacası ($bugun). Her gün yenisi gelir.'
                  : onceki
                  ? 'Bugünkü bulmacayı ilk denemede çözdün. İstersen yeniden oyna.'
                  : 'Bugünkü bulmaca ilk denemede olmadı; tekrar destene eklendi.',
              key: const Key('gunluk-durum'),
              style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
            ),
            const SizedBox(height: Olcu.b2),
            BulmacaOynatici(
              key: ValueKey('gunluk-${b.id}'),
              bulmaca: b,
              onIlkSonuc: (dogru) =>
                  ref.read(durumProvider.notifier).satrancGunlukBitir(dogru),
            ),
          ],
        ),
      ),
    );
  }
}

/// Tema listesi: her tema için çözülen/toplam.
class TemaListesiEkrani extends ConsumerWidget {
  const TemaListesiEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    return satrancIskele(
      context,
      'Tema bulmacaları',
      ListView(
        padding: const EdgeInsets.all(Olcu.b2),
        children: [
          for (final t in SatrancVeri.temalar)
            satrancKart(
              context,
              anahtar: ValueKey('tema-${t.id}'),
              simge: Icons.extension_outlined,
              baslik: t.ad,
              ayrinti:
                  '${_cozulen(durum, t.id)}/${SatrancVeri.temaBulmacalari(t.id).length} '
                  'çözüldü. ${t.aciklama}',
              onTap: () => context.push('/satranc/tema/${t.id}'),
            ),
        ],
      ),
    );
  }

  static int _cozulen(OgrenciDurumu d, String tema) =>
      SatrancVeri.temaBulmacalari(
        tema,
      ).where((b) => d.satranc.cozulenBulmacalar.contains(b.id)).length;
}

/// Bir temanın bulmacalarını sırayla oynatır (çözülmemiş olandan başlar).
class TemaBulmacaEkrani extends ConsumerStatefulWidget {
  const TemaBulmacaEkrani({super.key, required this.tema});
  final String tema;

  @override
  ConsumerState<TemaBulmacaEkrani> createState() => _TemaBulmacaDurumu();
}

class _TemaBulmacaDurumu extends ConsumerState<TemaBulmacaEkrani> {
  int? _indeks;
  bool _tamam = false;

  @override
  Widget build(BuildContext context) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final tema = SatrancVeri.temaBul(widget.tema);
    final liste = SatrancVeri.temaBulmacalari(widget.tema);
    if (tema == null || liste.isEmpty) {
      return satrancIskele(
        context,
        'Bulmaca',
        satrancBosMesaj(context, 'Bu tema bulunamadı.'),
      );
    }
    // İlk açılışta çözülmemiş ilk bulmaca (hepsi çözüldüyse ilki).
    _indeks ??= () {
      final i = liste.indexWhere(
        (b) => !durum.satranc.cozulenBulmacalar.contains(b.id),
      );
      return i < 0 ? 0 : i;
    }();
    final i = _indeks!;
    final b = liste[i];
    return satrancIskele(
      context,
      tema.ad,
      SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Bulmaca ${i + 1}/${liste.length}',
              key: const Key('tema-sira'),
              style: Theme.of(context).textTheme.labelLarge,
            ),
            const SizedBox(height: Olcu.b1),
            BulmacaOynatici(
              key: ValueKey(b.id),
              bulmaca: b,
              onIlkSonuc: (dogru) => ref
                  .read(durumProvider.notifier)
                  .satrancBulmacaSonucu(b.id, dogru),
              onTamam: () => setState(() => _tamam = true),
            ),
            if (_tamam) ...[
              const SizedBox(height: Olcu.b2),
              FilledButton(
                key: const Key('tema-sonraki'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                ),
                onPressed: () => setState(() {
                  _tamam = false;
                  _indeks = (i + 1) % liste.length;
                }),
                child: Text(
                  i + 1 < liste.length ? 'Sonraki bulmaca' : 'Baştan başla',
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Yanlışlarım: ilk denemede yanlış çözülen bulmacaların tekrar destesi
/// (yarı ömür: doğruda x2, yanlışta /2). Bugün sırası gelenler sorulur.
class YanlislarimEkrani extends ConsumerStatefulWidget {
  const YanlislarimEkrani({super.key});

  @override
  ConsumerState<YanlislarimEkrani> createState() => _YanlislarimDurumu();
}

class _YanlislarimDurumu extends ConsumerState<YanlislarimEkrani> {
  /// Oturum başında kilitlenen kuyruk (kimlikler); cevaplandıkça durum
  /// değişse de oturum şaşmaz.
  List<String>? _kuyruk;
  int _sira = 0;
  bool _tamam = false;
  int _dogru = 0;

  @override
  Widget build(BuildContext context) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final bugun = ref.watch(bugunProvider);
    // Kuyruk ilk çizimde kilitlenir; cevaplandıkça kartlar ilerlese de
    // oturum şaşmaz.
    final kuyruk = _kuyruk ??= SatrancCalisma.bekleyenBulmacalar(durum, bugun);
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    if (kuyruk.isEmpty || _sira >= kuyruk.length) {
      final bitti = _sira > 0 && _sira >= kuyruk.length;
      final desteSayisi = SatrancCalisma.desteBulmacaSayisi(durum);
      return satrancIskele(
        context,
        'Yanlışlarım',
        Center(
          child: Padding(
            padding: const EdgeInsets.all(Olcu.b3),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  bitti ? Icons.check_circle_outline : Icons.inbox_outlined,
                  size: 48,
                  color: bitti ? r.dogru : r.metinIkincil,
                ),
                const SizedBox(height: Olcu.b2),
                Text(
                  bitti
                      ? 'Tekrar bitti: $_dogru/${kuyruk.length} doğru.'
                      : desteSayisi == 0
                      ? 'Tekrar destesi boş. İlk denemede yanlış çözdüğün '
                            'bulmacalar buraya eklenir.'
                      : 'Bugün tekrarı gelen bulmaca yok. Destede '
                            '$desteSayisi bulmaca bekliyor.',
                  key: const Key('yanlis-bos'),
                  style: yazi.bodyLarge,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      );
    }
    final id = kuyruk[_sira];
    final b = SatrancVeri.bulmacaBul(id)!;
    return satrancIskele(
      context,
      'Yanlışlarım',
      SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Tekrar ${_sira + 1}/${kuyruk.length}',
              key: const Key('yanlis-sira'),
              style: yazi.labelLarge,
            ),
            const SizedBox(height: Olcu.b1),
            BulmacaOynatici(
              key: ValueKey('yanlis-$id-$_sira'),
              bulmaca: b,
              onIlkSonuc: (dogru) {
                if (dogru) _dogru++;
                ref
                    .read(durumProvider.notifier)
                    .satrancBulmacaSonucu(b.id, dogru);
              },
              onTamam: () => setState(() => _tamam = true),
            ),
            if (_tamam) ...[
              const SizedBox(height: Olcu.b2),
              FilledButton(
                key: const Key('yanlis-sonraki'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                ),
                onPressed: () => setState(() {
                  _tamam = false;
                  _sira++;
                }),
                child: Text(
                  _sira + 1 < kuyruk.length ? 'Sonraki bulmaca' : 'Bitir',
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
