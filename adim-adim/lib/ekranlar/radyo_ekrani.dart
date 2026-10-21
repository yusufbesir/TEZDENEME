/// Dinleme radyosu ekranları (ÖZELLİK 46): dil kursu ünitelerinden türetilen
/// kısa sesli bölümler. Liste ([RadyoListesiEkrani]) bölümleri sıralar;
/// bölüm ([RadyoBolumEkrani]) cümleleri cihaz TTS ile art arda okur ("Radyo
/// gibi dinle") ve ardından dinle-eşleştir, dinle-tanı, dinle-sırala
/// etkinliklerini sorar. Ceza yok; kart aralıkları, hata defteri ve XP
/// değişmez. Pratik merkezinden açılır; yalnız dil kurslarında.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/alistirma_oturumu.dart';
import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../motor/radyo.dart';
import '../tema/tema.dart';

Widget _iskele(BuildContext context, String baslik, Widget govde) => Scaffold(
  appBar: AppBar(
    title: Text(baslik),
    leading: IconButton(
      icon: const Icon(Icons.arrow_back),
      tooltip: 'Geri',
      onPressed: () => context.canPop() ? context.pop() : context.go('/pratik'),
    ),
  ),
  body: SafeArea(child: SayfaGovdesi(child: govde)),
);

class RadyoListesiEkrani extends ConsumerWidget {
  const RadyoListesiEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final kurslar = ref.watch(alanKurslariProvider);
    final bolumler = Radyo.bolumler(kurslar);
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    return _iskele(
      context,
      'Dinleme radyosu',
      bolumler.isEmpty
          ? Center(
              child: Padding(
                padding: const EdgeInsets.all(Olcu.b3),
                child: Text(
                  'Dinleme radyosu yalnız dil kurslarında açılır.',
                  style: yazi.bodyLarge,
                  textAlign: TextAlign.center,
                ),
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(Olcu.b2),
              children: [
                Text(
                  'Kısa sesli bölümler: cihazın sesiyle okunur, çevrimdışı. '
                  'Ceza yok; tekrar takvimin değişmez.',
                  style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
                ),
                const SizedBox(height: Olcu.b2),
                for (final b in bolumler)
                  Card(
                    child: ListTile(
                      key: ValueKey('radyo-${b.uniteId}'),
                      minVerticalPadding: Olcu.b1,
                      leading: Icon(Icons.radio, color: r.ana),
                      title: Text(b.ad),
                      subtitle: Text(
                        '${b.kursAd} · ${b.cumleler.length} cümle',
                      ),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () => context.push(
                        '/radyo/bolum?kurs=${Uri.encodeComponent(b.kursId)}'
                        '&unite=${b.uniteIndeks}',
                      ),
                    ),
                  ),
              ],
            ),
    );
  }
}

enum _Asama { onizleme, etkinlik, bitti }

class RadyoBolumEkrani extends ConsumerStatefulWidget {
  const RadyoBolumEkrani({
    super.key,
    required this.kursId,
    required this.uniteIndeks,
  });
  final String kursId;
  final int uniteIndeks;

  @override
  ConsumerState<RadyoBolumEkrani> createState() => _RadyoBolumDurumu();
}

class _RadyoBolumDurumu extends ConsumerState<RadyoBolumEkrani> {
  RadyoBolumu? _bolum;
  List<RadyoSorusu> _sorular = const [];
  _Asama _asama = _Asama.onizleme;
  int _tur = 0;
  int _dogru = 0;
  int _toplam = 0;

  /// Radyo oynatma: çalan cümlenin indeksi (null: çalmıyor).
  int? _calan;
  bool _calisiyor = false;
  bool _sesHatasi = false;

  @override
  void initState() {
    super.initState();
    _bolum = Radyo.bolumBul(
      ref.read(alanKurslariProvider),
      widget.kursId,
      widget.uniteIndeks,
    );
  }

  @override
  void dispose() {
    _calisiyor = false; // Döngü bir sonraki adımda durur.
    super.dispose();
  }

  Future<void> _radyoyuCal() async {
    final b = _bolum;
    if (b == null || _calisiyor) return;
    final ses = ref.read(sesProvider);
    setState(() {
      _calisiyor = true;
      _sesHatasi = false;
    });
    for (var i = 0; i < b.cumleler.length; i++) {
      if (!_calisiyor || !mounted) break;
      setState(() => _calan = i);
      final tamam = await ses.okuBekle(
        b.cumleler[i].metin,
        dil: b.cumleler[i].dil,
      );
      if (!tamam) {
        if (mounted) setState(() => _sesHatasi = true);
        break;
      }
      if (!_calisiyor || !mounted) break;
      await Future<void>.delayed(const Duration(milliseconds: 400));
    }
    if (mounted) {
      setState(() {
        _calisiyor = false;
        _calan = null;
      });
    }
  }

  void _durdur() {
    if (!_calisiyor) return;
    setState(() {
      _calisiyor = false;
      _calan = null;
    });
  }

  void _etkinligeBasla() {
    final b = _bolum;
    if (b == null) return;
    _durdur();
    setState(() {
      _sorular = Radyo.sorular(
        b,
        tohum: DateTime.now().millisecondsSinceEpoch + _tur,
      );
      _tur++;
      _asama = _Asama.etkinlik;
    });
  }

  @override
  Widget build(BuildContext context) {
    final b = _bolum;
    if (b == null) {
      return _iskele(
        context,
        'Dinleme radyosu',
        const Center(child: Text('Bölüm bulunamadı.')),
      );
    }
    if (_asama == _Asama.etkinlik) {
      return Scaffold(
        body: SafeArea(
          child: AlistirmaOturumu(
            key: ValueKey('radyo-oturum-$_tur'),
            alistirmalar: [for (final s in _sorular) s.alistirma],
            // Ceza yok: kart, hata defteri ve XP değişmez.
            onSonuc: (_, _) {},
            ust: (i) => _sorular[i].tur == RadyoTuru.dinleSirala
                ? _DinleDugmesi(
                    metin: _sorular[i].okunacak,
                    dil: _sorular[i].dil,
                  )
                : null,
            onBitti: (dogru, toplam) => setState(() {
              _dogru = dogru;
              _toplam = toplam;
              _asama = _Asama.bitti;
            }),
            onKapat: () => setState(() => _asama = _Asama.onizleme),
          ),
        ),
      );
    }
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    final sesAcik = ref.watch(durumProvider).value?.sesAcik ?? true;
    if (_asama == _Asama.bitti) {
      return _iskele(
        context,
        b.ad,
        Padding(
          padding: const EdgeInsets.all(Olcu.b3),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Icon(Icons.radio, size: 64, color: r.ana),
              const SizedBox(height: Olcu.b2),
              Text(
                'Bölüm bitti',
                textAlign: TextAlign.center,
                style: yazi.headlineMedium,
              ),
              const SizedBox(height: Olcu.b1),
              Text(
                '$_dogru/$_toplam doğru. Ceza yok; tekrar takvimin değişmedi.',
                key: const ValueKey('radyo-sonuc'),
                textAlign: TextAlign.center,
                style: yazi.bodyLarge,
              ),
              const SizedBox(height: Olcu.b3),
              FilledButton(
                key: const ValueKey('radyo-yeniden'),
                style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
                onPressed: _etkinligeBasla,
                child: const Text('Yeniden dene'),
              ),
              const SizedBox(height: Olcu.b2),
              OutlinedButton(
                key: const ValueKey('radyo-don'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(48, 48),
                ),
                onPressed: () => setState(() => _asama = _Asama.onizleme),
                child: const Text('Bölüme dön'),
              ),
            ],
          ),
        ),
      );
    }
    return _iskele(
      context,
      b.ad,
      ListView(
        padding: const EdgeInsets.all(Olcu.b2),
        children: [
          Text(
            b.kursAd,
            style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          ),
          const SizedBox(height: Olcu.b2),
          Wrap(
            spacing: Olcu.b2,
            runSpacing: Olcu.b1,
            children: [
              if (_calisiyor)
                FilledButton.icon(
                  key: const ValueKey('radyo-durdur'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: _durdur,
                  icon: const Icon(Icons.stop),
                  label: const Text('Durdur'),
                )
              else
                FilledButton.icon(
                  key: const ValueKey('radyo-cal'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(48, 48),
                  ),
                  onPressed: sesAcik ? _radyoyuCal : null,
                  icon: const Icon(Icons.play_arrow),
                  label: const Text('Radyo gibi dinle'),
                ),
              OutlinedButton.icon(
                key: const ValueKey('radyo-etkinlik'),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(48, 48),
                ),
                onPressed: _etkinligeBasla,
                icon: const Icon(Icons.headphones),
                label: const Text('Etkinlikler'),
              ),
            ],
          ),
          if (!sesAcik)
            Padding(
              padding: const EdgeInsets.only(top: Olcu.b1),
              child: Text(
                'Ses ayarlardan kapalı; cümleler yazılı gösteriliyor.',
                style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
              ),
            ),
          if (_sesHatasi)
            Padding(
              padding: const EdgeInsets.only(top: Olcu.b1),
              child: Text(
                'Ses kullanılamıyor; cümleler yazılı gösteriliyor.',
                key: const ValueKey('radyo-ses-hatasi'),
                style: yazi.bodyMedium?.copyWith(color: r.hata),
              ),
            ),
          const SizedBox(height: Olcu.b2),
          for (var i = 0; i < b.cumleler.length; i++)
            Card(
              color: _calan == i ? r.yuzey : null,
              shape: _calan == i
                  ? RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(Olcu.kose),
                      side: BorderSide(color: r.ana, width: 3),
                    )
                  : null,
              child: ListTile(
                key: ValueKey('radyo-cumle-$i'),
                leading: _DinleDugmesi(
                  metin: b.cumleler[i].metin,
                  dil: b.cumleler[i].dil,
                  anahtar: ValueKey('radyo-oku-$i'),
                  kucuk: true,
                ),
                title: Text(b.cumleler[i].metin),
                subtitle: b.cumleler[i].anlam == null
                    ? null
                    : Text(b.cumleler[i].anlam!),
              ),
            ),
        ],
      ),
    );
  }
}

/// Cümleyi cihaz sesiyle okutan düğme (ses ayarda kapalıysa pasif).
class _DinleDugmesi extends ConsumerWidget {
  const _DinleDugmesi({
    required this.metin,
    required this.dil,
    this.anahtar,
    this.kucuk = false,
  });
  final String metin;
  final String dil;
  final Key? anahtar;
  final bool kucuk;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sesAcik = ref.watch(durumProvider).value?.sesAcik ?? true;
    void oku() => ref.read(sesProvider).oku(metin, dil: dil);
    if (kucuk) {
      return IconButton(
        key: anahtar,
        icon: const Icon(Icons.volume_up_outlined),
        tooltip: 'Oku',
        onPressed: sesAcik ? oku : null,
      );
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: Olcu.b2),
      child: Align(
        alignment: Alignment.centerLeft,
        child: OutlinedButton.icon(
          key: const ValueKey('radyo-dinle'),
          style: OutlinedButton.styleFrom(minimumSize: const Size(48, 48)),
          onPressed: sesAcik ? oku : null,
          icon: const Icon(Icons.volume_up),
          label: Text(sesAcik ? 'Cümleyi dinle' : 'Ses kapalı'),
        ),
      ),
    );
  }
}
