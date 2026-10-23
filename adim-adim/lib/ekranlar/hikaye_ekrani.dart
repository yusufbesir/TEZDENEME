// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Okuma hikâyesi ekranı (`/hikaye/:id`): dört aşamalı akış.
/// 1) Kelime ön testi: anahtar kelimeler tek tek, "Biliyorum / Bilmiyorum";
///    sonunda kelime bilgisi yüzdesi gösterilir (Motor.kelimeBilgisiYuzde).
/// 2) Okuma: başlık ve paragraflar; anahtar kelimeler kalın (bilinmeyenler
///    ana renkte) vurgulanır, dokununca alt sayfada anlamı çıkar. Aynı
///    kelimeler altta çip olarak da listelenir (erişilebilirlik).
/// 3) Anlama soruları: AlistirmaOturumu (SRS kartı yok, onSonuc boş).
/// 4) Özet: DersOzeti; XP Motor.hikayeXp, kayıt Motor.hikayeBitir.
library;

import 'package:flutter/gestures.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../bilesenler/alistirma_oturumu.dart';
import '../bilesenler/ders_ozeti.dart';
import '../bilesenler/sayfa_govdesi.dart';
import '../durum/saglayicilar.dart';
import '../icerik/hikayeler.dart';
import '../model/hikaye.dart';
import '../motor/motor.dart';
import '../tema/tema.dart';

enum _Asama { onTest, okuma, sorular, ozet }

class HikayeEkrani extends ConsumerStatefulWidget {
  const HikayeEkrani({super.key, required this.hikayeId});
  final String hikayeId;

  @override
  ConsumerState<HikayeEkrani> createState() => _HikayeDurumu();
}

class _HikayeDurumu extends ConsumerState<HikayeEkrani> {
  late final Hikaye? _hikaye = hikayeBul(widget.hikayeId);
  _Asama _asama = _Asama.onTest;

  /// Ön testte sırası gelen kelime ve "bilmiyorum" denen kelimeler.
  int _kelimeNo = 0;
  final Set<int> _bilinmeyen = {};
  ({int dogru, int toplam, int xp, int seri})? _ozet;
  bool _kaydediliyor = false;

  void _cik() => context.canPop() ? context.pop() : context.go('/yol');

  void _kelimeCevapla(bool biliyor) {
    if (!biliyor) _bilinmeyen.add(_kelimeNo);
    setState(() => _kelimeNo++);
  }

  Future<void> _kapatOnayi() async {
    final cik = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        icon: const Icon(Icons.warning_amber_rounded),
        title: const Text('Hikâyeden çıkılsın mı?'),
        content: const Text(
          'Şimdi çıkarsan bu hikâyedeki ilerleme kaydedilmez.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(c, false),
            child: const Text('Devam et'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(minimumSize: const Size(48, 48)),
            onPressed: () => Navigator.pop(c, true),
            child: const Text('Çık'),
          ),
        ],
      ),
    );
    if (cik == true && mounted) _cik();
  }

  Future<void> _bitir(int dogru, int toplam) async {
    final h = _hikaye;
    if (h == null || _kaydediliyor) return;
    _kaydediliyor = true;
    final bilinmeyen = _bilinmeyen.length;
    final yeni = await ref
        .read(durumProvider.notifier)
        .hikayeBitir(h.id, dogru, toplam, bilinmeyen);
    if (!mounted) return;
    setState(() {
      _ozet = (
        dogru: dogru,
        toplam: toplam,
        xp: Motor.hikayeXp(dogru, toplam, bilinmeyen),
        seri: yeni.seri,
      );
      _asama = _Asama.ozet;
    });
  }

  @override
  Widget build(BuildContext context) {
    final h = _hikaye;
    return Scaffold(
      body: SafeArea(
        child: h == null
            ? _Bos(onGeri: _cik)
            : switch (_asama) {
                _Asama.ozet => DersOzeti(
                  baslik: 'Hikâye tamamlandı',
                  altBaslik: h.baslik,
                  dogru: _ozet!.dogru,
                  toplam: _ozet!.toplam,
                  xp: _ozet!.xp,
                  seri: _ozet!.seri,
                  onDon: _cik,
                ),
                _Asama.sorular => AlistirmaOturumu(
                  alistirmalar: h.sorular,
                  // Hikâye soruları SRS kartı üretmez.
                  onSonuc: (_, _) {},
                  onBitti: _bitir,
                  onKapat: _kapatOnayi,
                  cikisOnayi: false,
                ),
                _Asama.okuma => _Okuma(
                  hikaye: h,
                  bilinmeyen: _bilinmeyen,
                  onSorular: () => setState(() => _asama = _Asama.sorular),
                  onKapat: _cik,
                ),
                _Asama.onTest => _OnTest(
                  hikaye: h,
                  kelimeNo: _kelimeNo,
                  bilinen: _kelimeNo - _bilinmeyen.length,
                  onCevap: _kelimeCevapla,
                  onBasla: () => setState(() => _asama = _Asama.okuma),
                  onKapat: _cik,
                ),
              },
      ),
    );
  }
}

/// Üst çubuk: kapat düğmesi + başlık.
class _Ust extends StatelessWidget {
  const _Ust({required this.baslik, required this.onKapat, this.sag});
  final String baslik;
  final VoidCallback onKapat;
  final String? sag;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(Olcu.b1, Olcu.b1, Olcu.b2, Olcu.b1),
      child: Row(
        children: [
          IconButton(
            tooltip: 'Hikâyeden çık',
            icon: const Icon(Icons.close),
            onPressed: onKapat,
          ),
          Expanded(
            child: Text(
              baslik,
              style: yazi.titleMedium,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          if (sag != null) ...[
            const SizedBox(width: Olcu.b1),
            Text(sag!, style: yazi.labelLarge?.copyWith(color: r.metinIkincil)),
          ],
        ],
      ),
    );
  }
}

/// Aşama 1: kelime ön testi ve sonuç yüzdesi.
class _OnTest extends StatelessWidget {
  const _OnTest({
    required this.hikaye,
    required this.kelimeNo,
    required this.bilinen,
    required this.onCevap,
    required this.onBasla,
    required this.onKapat,
  });

  final Hikaye hikaye;
  final int kelimeNo;
  final int bilinen;
  final void Function(bool biliyor) onCevap;
  final VoidCallback onBasla;
  final VoidCallback onKapat;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final toplam = hikaye.anahtarKelimeler.length;
    final bitti = kelimeNo >= toplam;
    final Widget govde;
    if (!bitti) {
      final kelime = hikaye.anahtarKelimeler[kelimeNo].kelime;
      govde = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            'Bu kelimeyi biliyor musun?',
            textAlign: TextAlign.center,
            style: yazi.titleMedium?.copyWith(color: r.metinIkincil),
          ),
          const SizedBox(height: Olcu.b3),
          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(
                vertical: Olcu.b4,
                horizontal: Olcu.b2,
              ),
              child: Semantics(
                label: 'Kelime: $kelime',
                excludeSemantics: true,
                child: Text(
                  kelime,
                  key: const Key('on-test-kelime'),
                  textAlign: TextAlign.center,
                  style: yazi.headlineMedium,
                ),
              ),
            ),
          ),
          const SizedBox(height: Olcu.b3),
          FilledButton(
            key: const Key('biliyorum'),
            onPressed: () => onCevap(true),
            child: const Text('Biliyorum'),
          ),
          const SizedBox(height: Olcu.b1),
          OutlinedButton(
            key: const Key('bilmiyorum'),
            onPressed: () => onCevap(false),
            child: const Text('Bilmiyorum'),
          ),
        ],
      );
    } else {
      final yuzde = Motor.kelimeBilgisiYuzde(bilinen, toplam);
      govde = Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Icon(Icons.spellcheck, size: 48, color: r.ana),
          const SizedBox(height: Olcu.b2),
          Text(
            'Kelime bilgin',
            textAlign: TextAlign.center,
            style: yazi.titleMedium?.copyWith(color: r.metinIkincil),
          ),
          Semantics(
            label: 'Kelime bilgin yüzde $yuzde',
            excludeSemantics: true,
            child: Text(
              '%$yuzde',
              key: const Key('on-test-yuzde'),
              textAlign: TextAlign.center,
              style: yazi.displaySmall,
            ),
          ),
          const SizedBox(height: Olcu.b1),
          Text(
            '$toplam kelimenin $bilinen tanesini biliyorsun.',
            textAlign: TextAlign.center,
            style: yazi.bodyLarge,
          ),
          const SizedBox(height: Olcu.b3),
          FilledButton(
            key: const Key('okumaya-basla'),
            onPressed: onBasla,
            child: const Text('Okumaya başla'),
          ),
        ],
      );
    }
    return Column(
      children: [
        _Ust(
          baslik: 'Kelime ön testi',
          onKapat: onKapat,
          sag: bitti ? null : '${kelimeNo + 1}/$toplam',
        ),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(Olcu.b2),
            child: SayfaGovdesi(genislik: 480, child: govde),
          ),
        ),
      ],
    );
  }
}

/// Aşama 2: okuma; anahtar kelimeler vurgulu ve dokunulabilir.
class _Okuma extends StatefulWidget {
  const _Okuma({
    required this.hikaye,
    required this.bilinmeyen,
    required this.onSorular,
    required this.onKapat,
  });

  final Hikaye hikaye;
  final Set<int> bilinmeyen;
  final VoidCallback onSorular;
  final VoidCallback onKapat;

  @override
  State<_Okuma> createState() => _OkumaDurumu();
}

class _OkumaDurumu extends State<_Okuma> {
  late final List<TapGestureRecognizer> _tanimlayicilar;
  late final RegExp _desen;

  @override
  void initState() {
    super.initState();
    final kelimeler = widget.hikaye.anahtarKelimeler;
    _tanimlayicilar = [
      for (var i = 0; i < kelimeler.length; i++)
        TapGestureRecognizer()..onTap = () => _anlamGoster(i),
    ];
    // Uzun kelime önce: "baggage claim" gibi çok sözcüklüler tam eşleşsin.
    final sirali = [...kelimeler.map((k) => k.kelime)]
      ..sort((a, b) => b.length.compareTo(a.length));
    _desen = RegExp(
      '\\b(?:${sirali.map(RegExp.escape).join('|')})\\b',
      caseSensitive: false,
    );
  }

  @override
  void dispose() {
    for (final t in _tanimlayicilar) {
      t.dispose();
    }
    super.dispose();
  }

  int _kelimeIndeksi(String bulunan) => widget.hikaye.anahtarKelimeler
      .indexWhere((k) => k.kelime.toLowerCase() == bulunan.toLowerCase());

  void _anlamGoster(int i) {
    final k = widget.hikaye.anahtarKelimeler[i];
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (c) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(
            Olcu.b3,
            Olcu.b1,
            Olcu.b3,
            Olcu.b3,
          ),
          child: Column(
            key: const Key('kelime-anlami'),
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(k.kelime, style: Theme.of(c).textTheme.headlineSmall),
              const SizedBox(height: Olcu.b1),
              Text(k.anlam, style: Theme.of(c).textTheme.titleMedium),
            ],
          ),
        ),
      ),
    );
  }

  List<InlineSpan> _parcalar(String metin, TextStyle? temel, Color vurgu) {
    final sonuc = <InlineSpan>[];
    var son = 0;
    for (final m in _desen.allMatches(metin)) {
      if (m.start > son) {
        sonuc.add(TextSpan(text: metin.substring(son, m.start)));
      }
      final bulunan = metin.substring(m.start, m.end);
      final i = _kelimeIndeksi(bulunan);
      final bilinmiyor = widget.bilinmeyen.contains(i);
      sonuc.add(
        TextSpan(
          text: bulunan,
          recognizer: i >= 0 ? _tanimlayicilar[i] : null,
          semanticsLabel: bulunan,
          style: TextStyle(
            fontWeight: FontWeight.w700,
            color: bilinmiyor ? vurgu : null,
            decoration: TextDecoration.underline,
            decorationStyle: TextDecorationStyle.dotted,
            decorationColor: vurgu,
          ),
        ),
      );
      son = m.end;
    }
    if (son < metin.length) sonuc.add(TextSpan(text: metin.substring(son)));
    return sonuc;
  }

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final h = widget.hikaye;
    final govde = yazi.bodyLarge?.copyWith(height: 1.6, color: r.metin);
    return Column(
      children: [
        _Ust(baslik: h.seviye.etiket, onKapat: widget.onKapat),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(Olcu.b2),
            child: SayfaGovdesi(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Semantics(
                    header: true,
                    child: Text(h.baslik, style: yazi.headlineSmall),
                  ),
                  const SizedBox(height: Olcu.b2),
                  for (final p in h.paragraflar)
                    Padding(
                      padding: const EdgeInsets.only(bottom: Olcu.b2),
                      child: Text.rich(
                        TextSpan(children: _parcalar(p, govde, r.ana)),
                        style: govde,
                      ),
                    ),
                  Text(
                    'Kalın kelimelere dokununca anlamını görürsün.',
                    style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
                  ),
                  const SizedBox(height: Olcu.b1),
                  Wrap(
                    spacing: Olcu.b1,
                    runSpacing: Olcu.b1,
                    children: [
                      for (var i = 0; i < h.anahtarKelimeler.length; i++)
                        ActionChip(
                          key: Key('kelime-cip-$i'),
                          label: Text(h.anahtarKelimeler[i].kelime),
                          onPressed: () => _anlamGoster(i),
                        ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(Olcu.b2),
            child: SayfaGovdesi(
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  key: const Key('sorulara-gec'),
                  onPressed: widget.onSorular,
                  child: const Text('Sorulara geç'),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }
}

class _Bos extends StatelessWidget {
  const _Bos({required this.onGeri});
  final VoidCallback onGeri;

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(Olcu.b3),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.menu_book_outlined, size: 48, color: r.ana),
            const SizedBox(height: Olcu.b2),
            Text(
              'Hikâye bulunamadı',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: Olcu.b2),
            FilledButton(onPressed: onGeri, child: const Text('Yola dön')),
          ],
        ),
      ),
    );
  }
}
