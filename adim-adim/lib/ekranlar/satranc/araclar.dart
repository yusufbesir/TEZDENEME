/// Satranç araçları: serbest tahta (ÖZELLİK 47), tahta görme (koordinat)
/// antrenörü (54), Solo bulmaca (57), kendi analizin sonra çözüm (55), ders
/// sonu tahta meydan okuması ve ustalık kursu (56). Hepsi çevrimdışıdır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../bilesenler/alistirma_oturumu.dart';
import '../../bilesenler/satranc_tahtasi.dart';
import '../../durum/saglayicilar.dart';
import '../../model/durum.dart';
import '../../model/icerik.dart';
import '../../motor/satranc_calisma.dart';
import '../../satranc/oyun.dart';
import '../../satranc/satranc.dart';
import '../../satranc/veri.dart';
import '../../tema/tema.dart';
import 'ortak.dart';

// ---------------------------------------------------------------------------
// Serbest tahta
// ---------------------------------------------------------------------------

/// Serbest tahta: iki tarafı da sen oynarsın; geri al, sıfırla, çevir, FEN.
class SerbestTahtaEkrani extends StatefulWidget {
  const SerbestTahtaEkrani({super.key});

  @override
  State<SerbestTahtaEkrani> createState() => _SerbestTahtaDurumu();
}

class _SerbestTahtaDurumu extends State<SerbestTahtaEkrani> {
  late Konum _konum = Konum.fen(Konum.baslangicFen);
  final List<Konum> _gecmis = [];
  final List<String> _sanlar = [];
  bool _beyazAltta = true;
  final TextEditingController _fen = TextEditingController();
  String? _fenHatasi;
  int? _kaynak;
  int? _hedef;

  @override
  void dispose() {
    _fen.dispose();
    super.dispose();
  }

  void _oyna(SatrancHamlesi h) {
    setState(() {
      _gecmis.add(_konum);
      _sanlar.add(turkceSan(_konum.san(h)));
      _konum = _konum.oyna(h);
      _kaynak = h.kaynak;
      _hedef = h.hedef;
      _fenHatasi = null;
    });
  }

  void _geriAl() {
    if (_gecmis.isEmpty) return;
    setState(() {
      _konum = _gecmis.removeLast();
      _sanlar.removeLast();
      _kaynak = null;
      _hedef = null;
    });
  }

  void _sifirla([Konum? yeni]) => setState(() {
    _konum = yeni ?? Konum.fen(Konum.baslangicFen);
    _gecmis.clear();
    _sanlar.clear();
    _kaynak = null;
    _hedef = null;
  });

  void _fenYukle() {
    try {
      final k = Konum.fen(_fen.text);
      _sifirla(k);
      setState(() => _fenHatasi = null);
    } on FormatException catch (e) {
      setState(() => _fenHatasi = 'Geçersiz FEN: ${e.message}');
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final durum = _konum.mat
        ? 'Mat! ${_konum.beyazSirada ? 'Siyah' : 'Beyaz'} kazandı.'
        : _konum.pat
        ? 'Pat: berabere.'
        : '${_konum.beyazSirada ? 'Beyaz' : 'Siyah'} oynar${_konum.sah ? ' · Şah!' : ''}';
    final hamleMetni = [
      for (var i = 0; i < _sanlar.length; i++)
        (i.isEven ? '${i ~/ 2 + 1}. ' : '') + _sanlar[i],
    ].join(' ');
    return satrancIskele(
      context,
      'Serbest tahta',
      SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TahtaGirisi(
              konum: _konum,
              beyazAltta: _beyazAltta,
              onHamle: _oyna,
              sonKaynak: _kaynak,
              sonHedef: _hedef,
            ),
            const SizedBox(height: Olcu.b1),
            Text(
              durum,
              key: const Key('serbest-durum'),
              style: yazi.titleSmall,
            ),
            if (hamleMetni.isNotEmpty)
              Text(
                hamleMetni,
                key: const Key('serbest-hamleler'),
                style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
              ),
            const SizedBox(height: Olcu.b1),
            Wrap(
              spacing: Olcu.b1,
              runSpacing: Olcu.b1,
              children: [
                TextButton.icon(
                  key: const Key('serbest-geri'),
                  onPressed: _gecmis.isEmpty ? null : _geriAl,
                  icon: const Icon(Icons.undo),
                  label: const Text('Geri al'),
                ),
                TextButton.icon(
                  key: const Key('serbest-sifirla'),
                  onPressed: () => _sifirla(),
                  icon: const Icon(Icons.restart_alt),
                  label: const Text('Sıfırla'),
                ),
                TextButton.icon(
                  key: const Key('serbest-cevir'),
                  onPressed: () => setState(() => _beyazAltta = !_beyazAltta),
                  icon: const Icon(Icons.swap_vert),
                  label: const Text('Tahtayı çevir'),
                ),
                TextButton.icon(
                  key: const Key('serbest-kopyala'),
                  onPressed: () async {
                    final mesajci = ScaffoldMessenger.of(context);
                    await Clipboard.setData(ClipboardData(text: _konum.fen));
                    mesajci
                      ..hideCurrentSnackBar()
                      ..showSnackBar(
                        const SnackBar(
                          content: Text('FEN kopyalandı'),
                          duration: Duration(seconds: 2),
                        ),
                      );
                  },
                  icon: const Icon(Icons.copy),
                  label: const Text('FEN kopyala'),
                ),
              ],
            ),
            const SizedBox(height: Olcu.b1),
            TextField(
              key: const Key('serbest-fen-alani'),
              controller: _fen,
              decoration: InputDecoration(
                labelText: 'FEN yapıştır (konum yükle)',
                errorText: _fenHatasi,
                border: const OutlineInputBorder(),
              ),
              onSubmitted: (_) => _fenYukle(),
            ),
            const SizedBox(height: Olcu.b1),
            OutlinedButton(
              key: const Key('serbest-fen-yukle'),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size(Olcu.hedef, Olcu.hedef),
              ),
              onPressed: _fenYukle,
              child: const Text('Konumu yükle'),
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Tahta görme (koordinat) antrenörü
// ---------------------------------------------------------------------------

/// 30 saniyede kaç kareyi doğru bilirsin: "dokun" (söylenen kareye dokun) ya
/// da "yaz" (işaretli karenin adını yaz). Tahtada taş ve koordinat yazısı yok.
class KoordinatEkrani extends ConsumerStatefulWidget {
  const KoordinatEkrani({super.key, this.tohum});

  /// Test için sabit kare dizisi; null ise zamandan türetilir.
  final int? tohum;

  @override
  ConsumerState<KoordinatEkrani> createState() => _KoordinatDurumu();
}

class _KoordinatDurumu extends ConsumerState<KoordinatEkrani> {
  static final Konum _bos = Konum.fen(Konum.baslangicFen);
  static const int _adimMs = 100;

  String _mod = 'dokun';
  bool _siyahtan = false;
  bool _basladi = false;
  bool _bitti = false;
  int _ms = 0;
  int _dogru = 0;
  int _yanlis = 0;
  int _sira = 0;
  List<int> _dizi = const [];
  Timer? _sayac;
  String? _geriBildirim;
  int? _enIyiOnceki;
  final TextEditingController _girdi = TextEditingController();

  int get _hedef => _dizi[_sira % _dizi.length];

  @override
  void dispose() {
    _sayac?.cancel();
    _girdi.dispose();
    super.dispose();
  }

  void _basla() {
    final tohum =
        widget.tohum ?? DateTime.now().microsecondsSinceEpoch & 0x7fffffff;
    final durum = ref.read(durumProvider).value;
    _enIyiOnceki = durum?.satranc.koordinatEnIyi[_mod];
    _sayac?.cancel();
    setState(() {
      _dizi = KoordinatAntrenoru.dizi(tohum);
      _basladi = true;
      _bitti = false;
      _ms = 0;
      _dogru = 0;
      _yanlis = 0;
      _sira = 0;
      _geriBildirim = null;
      _girdi.clear();
    });
    _sayac = Timer.periodic(const Duration(milliseconds: _adimMs), (t) {
      if (!mounted) return;
      final yeni = _ms + _adimMs;
      if (yeni >= KoordinatAntrenoru.sure * 1000) {
        t.cancel();
        setState(() {
          _ms = KoordinatAntrenoru.sure * 1000;
          _bitti = true;
        });
        ref.read(durumProvider.notifier).satrancKoordinatBitir(_mod, _dogru);
      } else {
        setState(() => _ms = yeni);
      }
    });
  }

  void _cevapla(bool dogru) {
    if (!_basladi || _bitti) return;
    setState(() {
      if (dogru) {
        _dogru++;
        _geriBildirim = 'Doğru: ${kareAdi(_hedef)}';
      } else {
        _yanlis++;
        _geriBildirim = 'Yanlış: hedef ${kareAdi(_hedef)} idi';
      }
      _sira++;
      _girdi.clear();
    });
  }

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final kalanSn = ((KoordinatAntrenoru.sure * 1000 - _ms) / 1000).ceil();
    final calisiyor = _basladi && !_bitti;
    final enIyi = ref.watch(durumProvider).value?.satranc.koordinatEnIyi[_mod];
    return satrancIskele(
      context,
      'Tahta görme',
      SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (!calisiyor) ...[
              Text(
                '${KoordinatAntrenoru.sure} saniyede olabildiğince çok kare '
                'bil. Tahtada taş ve koordinat yazısı yok.',
                style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
              ),
              const SizedBox(height: Olcu.b1),
              SegmentedButton<String>(
                key: const Key('koordinat-mod'),
                segments: const [
                  ButtonSegment(
                    value: 'dokun',
                    icon: Icon(Icons.touch_app_outlined),
                    label: Text('Kareye dokun'),
                  ),
                  ButtonSegment(
                    value: 'yaz',
                    icon: Icon(Icons.keyboard_outlined),
                    label: Text('Adını yaz'),
                  ),
                ],
                selected: {_mod},
                onSelectionChanged: (s) => setState(() {
                  _mod = s.first;
                  _bitti = false;
                  _basladi = false;
                }),
              ),
              SwitchListTile(
                key: const Key('koordinat-siyah'),
                contentPadding: EdgeInsets.zero,
                title: const Text('Siyah taraftan göster'),
                value: _siyahtan,
                onChanged: (v) => setState(() => _siyahtan = v),
              ),
              if (enIyi != null)
                Text(
                  'En iyi skorun: $enIyi',
                  key: const Key('koordinat-en-iyi'),
                  style: yazi.bodyMedium,
                ),
            ],
            if (calisiyor) ...[
              Row(
                children: [
                  Expanded(
                    child: Text(
                      _mod == 'dokun'
                          ? 'Dokun: ${kareAdi(_hedef)}'
                          : 'Bu karenin adı ne?',
                      key: const Key('koordinat-hedef'),
                      style: yazi.headlineSmall,
                    ),
                  ),
                  Text(
                    '$kalanSn sn',
                    key: const Key('koordinat-sure'),
                    style: yazi.titleMedium,
                  ),
                ],
              ),
              Text(
                'Doğru: $_dogru · Yanlış: $_yanlis',
                key: const Key('koordinat-skor'),
                style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
              ),
            ],
            const SizedBox(height: Olcu.b1),
            LayoutBuilder(
              builder: (context, kisit) {
                final kenar =
                    kisit.maxWidth.clamp(0.0, satrancTahtaEnBuyukKenar) -
                    2 * SatrancTahtasi.cerceve;
                return Center(
                  child: SatrancTahtasi(
                    konum: _bos,
                    kenar: kenar < 0 ? 0 : kenar,
                    beyazAltta: !_siyahtan,
                    tasGoster: false,
                    koordinatGoster: false,
                    etiket: 'Boş satranç tahtası',
                    etkin: calisiyor && _mod == 'dokun',
                    onDokun: (k) => _cevapla(k == _hedef),
                    vurgu: calisiyor && _mod == 'yaz'
                        ? {_hedef: r.vurgu.withValues(alpha: 0.8)}
                        : const {},
                  ),
                );
              },
            ),
            const SizedBox(height: Olcu.b1),
            if (calisiyor && _mod == 'yaz')
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      key: const Key('koordinat-girdi'),
                      controller: _girdi,
                      autofocus: true,
                      decoration: const InputDecoration(
                        labelText: 'Kare adı (ör. e4)',
                        border: OutlineInputBorder(),
                      ),
                      onSubmitted: (v) =>
                          _cevapla(KoordinatAntrenoru.yazimDogru(v, _hedef)),
                    ),
                  ),
                  const SizedBox(width: Olcu.b1),
                  FilledButton(
                    key: const Key('koordinat-gonder'),
                    style: FilledButton.styleFrom(
                      minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                    ),
                    onPressed: () => _cevapla(
                      KoordinatAntrenoru.yazimDogru(_girdi.text, _hedef),
                    ),
                    child: const Text('Gönder'),
                  ),
                ],
              ),
            if (_geriBildirim != null && calisiyor)
              Semantics(
                liveRegion: true,
                child: Text(
                  _geriBildirim!,
                  key: const Key('koordinat-geri-bildirim'),
                  style: yazi.bodyMedium,
                ),
              ),
            if (_bitti) ...[
              const SizedBox(height: Olcu.b1),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(Olcu.b2),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Süre doldu: $_dogru doğru, $_yanlis yanlış.',
                        key: const Key('koordinat-sonuc'),
                        style: yazi.titleMedium,
                      ),
                      if (_enIyiOnceki == null || _dogru > _enIyiOnceki!)
                        Text(
                          'Yeni en iyi skor!',
                          key: const Key('koordinat-yeni-en-iyi'),
                          style: yazi.bodyMedium?.copyWith(color: r.dogru),
                        ),
                    ],
                  ),
                ),
              ),
            ],
            const SizedBox(height: Olcu.b2),
            if (!calisiyor)
              FilledButton.icon(
                key: Key(_bitti ? 'koordinat-yeniden' : 'koordinat-basla'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                ),
                onPressed: _basla,
                icon: Icon(_bitti ? Icons.replay : Icons.play_arrow),
                label: Text(_bitti ? 'Yeniden' : 'Başla'),
              ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Solo bulmaca
// ---------------------------------------------------------------------------

class SoloListesiEkrani extends ConsumerWidget {
  const SoloListesiEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    return satrancIskele(
      context,
      'Solo bulmaca',
      ListView(
        padding: const EdgeInsets.all(Olcu.b2),
        children: [
          Text(
            'Her hamlede bir siyah taş alınır; siyah taşlar kıpırdamaz. '
            'Hepsini (şah hariç) tek bir yoldan alabilirsin.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: context.renkler.metinIkincil,
            ),
          ),
          const SizedBox(height: Olcu.b2),
          for (final s in SatrancVeri.soloBulmacalar)
            satrancKart(
              context,
              anahtar: ValueKey('solo-${s.id}'),
              simge: durum.satranc.soloCozulen.contains(s.id)
                  ? Icons.check_circle_outline
                  : Icons.extension_outlined,
              baslik: 'Solo ${s.id.split('-').last}',
              ayrinti: durum.satranc.soloCozulen.contains(s.id)
                  ? 'Çözüldü'
                  : '${s.cozum.length} taş al',
              onTap: () => context.push('/satranc/solo/${s.id}'),
            ),
        ],
      ),
    );
  }
}

class SoloEkrani extends ConsumerStatefulWidget {
  const SoloEkrani({super.key, required this.id});
  final String id;

  @override
  ConsumerState<SoloEkrani> createState() => _SoloDurumu();
}

class _SoloDurumu extends ConsumerState<SoloEkrani> {
  SoloBulmaca? _b;
  late final List<SoloOyunu> _gecmis = [];
  bool _ipucu = false;
  bool _kaydedildi = false;

  @override
  void initState() {
    super.initState();
    _b = SatrancVeri.soloBul(widget.id);
    if (_b != null) _gecmis.add(SoloOyunu.baslat(_b!.fen));
  }

  void _oyna(SatrancHamlesi h) {
    setState(() => _gecmis.add(_gecmis.last.oyna(h)));
    if (_gecmis.last.bitti && !_kaydedildi) {
      _kaydedildi = true;
      ref.read(durumProvider.notifier).satrancSoloBitir(widget.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    final b = _b;
    if (b == null) {
      return satrancIskele(
        context,
        'Solo',
        satrancBosMesaj(context, 'Bu bulmaca bulunamadı.'),
      );
    }
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final oyun = _gecmis.last;
    final sonuc = oyun.bitti
        ? 'Tebrikler, hepsini aldın!'
        : oyun.kilitli
        ? 'Alınacak taş kaldı ama alabilecek hamle yok. Geri al ya da baştan başla.'
        : null;
    int? kaynak, hedef;
    if (oyun.gecmis.isNotEmpty) {
      final u = oyun.gecmis.last;
      kaynak = kareNo(u.substring(0, 2));
      hedef = kareNo(u.substring(2, 4));
    }
    return satrancIskele(
      context,
      'Solo ${b.id.split('-').last}',
      SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Her hamlede bir siyah taş al. Kalan taş: ${oyun.kalan}',
              key: const Key('solo-kalan'),
              style: yazi.titleSmall,
            ),
            const SizedBox(height: Olcu.b1),
            TahtaGirisi(
              konum: oyun.konum,
              beyazAltta: true,
              oynayanBeyaz: true,
              hamleler: oyun.hamleler,
              onHamle: _oyna,
              etkin: !oyun.bitti,
              sonKaynak: kaynak,
              sonHedef: hedef,
              sonuc: oyun.bitti ? true : (oyun.kilitli ? false : null),
            ),
            const SizedBox(height: Olcu.b1),
            if (sonuc != null)
              Text(
                sonuc,
                key: const Key('solo-sonuc'),
                style: yazi.titleSmall?.copyWith(
                  color: oyun.bitti ? r.dogru : r.hata,
                ),
              ),
            if (_ipucu && !oyun.bitti)
              Text(
                'İpucu: ${b.ipucu}',
                key: const Key('solo-ipucu-metni'),
                style: yazi.bodyMedium,
              ),
            const SizedBox(height: Olcu.b1),
            Wrap(
              spacing: Olcu.b1,
              runSpacing: Olcu.b1,
              children: [
                TextButton.icon(
                  key: const Key('solo-ipucu'),
                  onPressed: () => setState(() => _ipucu = true),
                  icon: const Icon(Icons.lightbulb_outline),
                  label: const Text('İpucu'),
                ),
                TextButton.icon(
                  key: const Key('solo-geri'),
                  onPressed: _gecmis.length > 1
                      ? () => setState(_gecmis.removeLast)
                      : null,
                  icon: const Icon(Icons.undo),
                  label: const Text('Geri al'),
                ),
                TextButton.icon(
                  key: const Key('solo-bastan'),
                  onPressed: _gecmis.length > 1
                      ? () => setState(
                          () => _gecmis.removeRange(1, _gecmis.length),
                        )
                      : null,
                  icon: const Icon(Icons.restart_alt),
                  label: const Text('Baştan al'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Kendi analizin, sonra çözüm
// ---------------------------------------------------------------------------

class AnalizListesiEkrani extends ConsumerWidget {
  const AnalizListesiEkrani({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    return satrancIskele(
      context,
      'Kendi analizin',
      ListView(
        padding: const EdgeInsets.all(Olcu.b2),
        children: [
          Text(
            'Önce konumu kendin çöz: en iyi hamleyi oyna, gerekçeni seç. '
            'Sonra yazılı çözümle karşılaştır.',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: context.renkler.metinIkincil,
            ),
          ),
          const SizedBox(height: Olcu.b2),
          for (final a in SatrancVeri.analizler)
            satrancKart(
              context,
              anahtar: ValueKey('analiz-${a.id}'),
              simge: Icons.psychology_alt_outlined,
              baslik: 'Konum ${a.id.split('-').last}',
              ayrinti: switch (durum.satranc.analizler[a.id]) {
                null => 'Henüz çözülmedi',
                final b =>
                  'Hamle ${b & 1 != 0 ? '✓' : '✗'} · Gerekçe ${b & 2 != 0 ? '✓' : '✗'}',
              },
              onTap: () => context.push('/satranc/analiz/${a.id}'),
            ),
        ],
      ),
    );
  }
}

class AnalizEkrani extends ConsumerStatefulWidget {
  const AnalizEkrani({super.key, required this.id});
  final String id;

  @override
  ConsumerState<AnalizEkrani> createState() => _AnalizDurumu();
}

class _AnalizDurumu extends ConsumerState<AnalizEkrani> {
  late final AnalizKonumu? _a = SatrancVeri.analizBul(widget.id);
  SatrancHamlesi? _secilen;
  String? _secilenSan;
  int? _gerekce;
  bool _karsilastirildi = false;

  @override
  Widget build(BuildContext context) {
    final a = _a;
    if (a == null) {
      return satrancIskele(
        context,
        'Analiz',
        satrancBosMesaj(context, 'Bu konum bulunamadı.'),
      );
    }
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final baslangic = Konum.fen(a.fen);
    final konum = _secilen == null ? baslangic : baslangic.oyna(_secilen!);
    final hamleDogru = _secilen?.uci == a.enIyi;
    final gerekceDogru = _gerekce == a.dogruGerekce;
    final enIyiSan = turkceSan(baslangic.san(baslangic.uciBul(a.enIyi)!));

    void karsilastir() {
      setState(() => _karsilastirildi = true);
      ref
          .read(durumProvider.notifier)
          .satrancAnalizBitir(a.id, hamleDogru, gerekceDogru);
    }

    return satrancIskele(
      context,
      'Konum ${a.id.split('-').last}',
      SingleChildScrollView(
        padding: const EdgeInsets.all(Olcu.b2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _secilen == null
                  ? '${baslangic.beyazSirada ? 'Beyaz' : 'Siyah'} oynar. '
                        'Önce en iyi hamleyi kendin bul ve oyna.'
                  : 'Seçtiğin hamle: $_secilenSan',
              key: const Key('analiz-yonerge'),
              style: yazi.titleSmall,
            ),
            const SizedBox(height: Olcu.b1),
            TahtaGirisi(
              konum: konum,
              beyazAltta: baslangic.beyazSirada,
              oynayanBeyaz: baslangic.beyazSirada,
              onHamle: (h) => setState(() {
                _secilen = h;
                _secilenSan = turkceSan(baslangic.san(h));
              }),
              etkin: _secilen == null,
              sonKaynak: _secilen?.kaynak,
              sonHedef: _secilen?.hedef,
            ),
            const SizedBox(height: Olcu.b1),
            if (_secilen != null && !_karsilastirildi) ...[
              TextButton.icon(
                key: const Key('analiz-degistir'),
                onPressed: () => setState(() {
                  _secilen = null;
                  _secilenSan = null;
                }),
                icon: const Icon(Icons.undo),
                label: const Text('Hamleyi değiştir'),
              ),
              Text('Gerekçen hangisi?', style: yazi.titleSmall),
              RadioGroup<int>(
                groupValue: _gerekce,
                onChanged: (v) => setState(() => _gerekce = v),
                child: Column(
                  children: [
                    for (var i = 0; i < a.gerekceler.length; i++)
                      RadioListTile<int>(
                        key: Key('analiz-gerekce-$i'),
                        contentPadding: EdgeInsets.zero,
                        value: i,
                        title: Text(a.gerekceler[i]),
                      ),
                  ],
                ),
              ),
              FilledButton(
                key: const Key('analiz-karsilastir'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                ),
                onPressed: _gerekce == null ? null : karsilastir,
                child: const Text('Çözümle karşılaştır'),
              ),
            ],
            if (_karsilastirildi) ...[
              const SizedBox(height: Olcu.b1),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(Olcu.b2),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        hamleDogru
                            ? 'Hamlen doğru: $_secilenSan'
                            : 'Hamlen: $_secilenSan. En iyi hamle: $enIyiSan',
                        key: const Key('analiz-hamle-sonuc'),
                        style: yazi.titleSmall?.copyWith(
                          color: hamleDogru ? r.dogru : r.hata,
                        ),
                      ),
                      const SizedBox(height: Olcu.b1),
                      Text(
                        gerekceDogru
                            ? 'Gerekçen doğru.'
                            : 'Gerekçen yanlış. Doğrusu: '
                                  '${a.gerekceler[a.dogruGerekce]}',
                        key: const Key('analiz-gerekce-sonuc'),
                        style: yazi.titleSmall?.copyWith(
                          color: gerekceDogru ? r.dogru : r.hata,
                        ),
                      ),
                      const SizedBox(height: Olcu.b1),
                      Text(
                        a.cozum,
                        key: const Key('analiz-cozum'),
                        style: yazi.bodyMedium,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Ders sonu tahta meydan okuması ve ustalık kursu
// ---------------------------------------------------------------------------

/// Bir dersin tahta konumlarını (en çok 3) yeniden çözdürür; sonuç ustalık
/// destesine de yazılır.
class DersMeydanEkrani extends ConsumerStatefulWidget {
  const DersMeydanEkrani({super.key, required this.dersId});
  final String dersId;

  @override
  ConsumerState<DersMeydanEkrani> createState() => _DersMeydanDurumu();
}

class _DersMeydanDurumu extends ConsumerState<DersMeydanEkrani> {
  ({int dogru, int toplam})? _sonuc;

  @override
  Widget build(BuildContext context) {
    final kurslar = ref.watch(kurslarProvider);
    Ders? ders;
    for (final k in kurslar) {
      final d = k.dersBul(widget.dersId);
      if (d != null && k.alan == KursAlani.oyun) ders = d;
    }
    final konumlar = ders == null
        ? const <DersKonumu>[]
        : SatrancCalisma.dersKonumlari(ders);
    if (ders == null || konumlar.isEmpty) {
      return satrancIskele(
        context,
        'Tahta meydan okuması',
        satrancBosMesaj(context, 'Bu ders için tahta konumu yok.'),
      );
    }
    final yazi = Theme.of(context).textTheme;
    final sonuc = _sonuc;
    if (sonuc != null) {
      return satrancIskele(
        context,
        'Tahta meydan okuması',
        Center(
          child: Padding(
            padding: const EdgeInsets.all(Olcu.b3),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  '${sonuc.dogru}/${sonuc.toplam} konumu doğru çözdün.',
                  key: const Key('meydan-sonuc'),
                  style: yazi.titleMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: Olcu.b1),
                Text(
                  'Bu ders, ustalık kursunda aralıklı tekrar edilecek.',
                  style: yazi.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: Olcu.b2),
                FilledButton(
                  key: const Key('meydan-bitir'),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                  ),
                  onPressed: () =>
                      context.canPop() ? context.pop() : context.go('/satranc'),
                  child: const Text('Tamam'),
                ),
              ],
            ),
          ),
        ),
      );
    }
    final dersKimligi = ders.id;
    return Scaffold(
      body: SafeArea(
        child: AlistirmaOturumu(
          key: ValueKey('meydan-$dersKimligi'),
          alistirmalar: [for (final k in konumlar) k.alistirma],
          onSonuc: (i, dogru) {},
          onBitti: (d, t) {
            ref
                .read(durumProvider.notifier)
                .satrancDersMeydanBitir(dersKimligi, d, t);
            setState(() => _sonuc = (dogru: d, toplam: t));
          },
          onKapat: () =>
              context.canPop() ? context.pop() : context.go('/satranc'),
        ),
      ),
    );
  }
}

/// Ustalık kursu: bitirilen satranç derslerinden sırası gelenleri (yarı ömür
/// tabanlı aralıklı tekrar) birer tahta konumuyla yeniden sorar.
class UstalikEkrani extends ConsumerStatefulWidget {
  const UstalikEkrani({super.key});

  @override
  ConsumerState<UstalikEkrani> createState() => _UstalikDurumu();
}

class _UstalikDurumu extends ConsumerState<UstalikEkrani> {
  List<({String dersId, Hamle alistirma})>? _oturum;
  ({int dogru, int toplam})? _sonuc;

  List<({String dersId, Hamle alistirma})> _hazirla() {
    final durum = ref.read(durumProvider).value ?? const OgrenciDurumu();
    final bugun = ref.read(bugunProvider);
    final kurslar = ref.read(kurslarProvider);
    return [
      for (final u in SatrancCalisma.ustalikDersleri(durum, kurslar, bugun))
        (
          dersId: u.ders.id,
          alistirma: SatrancCalisma.ustalikKonumu(u.ders, bugun).alistirma,
        ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    final durum = ref.watch(durumProvider).value ?? const OgrenciDurumu();
    final bugun = ref.watch(bugunProvider);
    final kurslar = ref.watch(kurslarProvider);
    final yazi = Theme.of(context).textTheme;
    final r = context.renkler;
    if (_oturum != null && _sonuc == null) {
      final o = _oturum!;
      return Scaffold(
        body: SafeArea(
          child: AlistirmaOturumu(
            key: const ValueKey('ustalik-oturum'),
            alistirmalar: [for (final x in o) x.alistirma],
            onSonuc: (i, dogru) => ref
                .read(durumProvider.notifier)
                .satrancUstalikSonucu(o[i].dersId, dogru),
            onBitti: (d, t) => setState(() => _sonuc = (dogru: d, toplam: t)),
            onKapat: () => setState(() => _oturum = null),
          ),
        ),
      );
    }
    final sirada = SatrancCalisma.ustalikDersleri(durum, kurslar, bugun);
    final sonuc = _sonuc;
    return satrancIskele(
      context,
      'Ustalık kursu',
      ListView(
        padding: const EdgeInsets.all(Olcu.b2),
        children: [
          Text(
            'Bitirdiğin satranç dersleri burada aralıklı tekrar edilir: her '
            'dersten bir tahta konumu gelir; doğruda aralık uzar, yanlışta kısalır.',
            style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          ),
          const SizedBox(height: Olcu.b2),
          if (sonuc != null)
            Card(
              child: ListTile(
                key: const Key('ustalik-sonuc'),
                leading: Icon(Icons.check_circle_outline, color: r.dogru),
                title: Text('Son tur: ${sonuc.dogru}/${sonuc.toplam} doğru'),
              ),
            ),
          if (sirada.isEmpty)
            Padding(
              padding: const EdgeInsets.all(Olcu.b2),
              child: Text(
                sonuc != null
                    ? 'Şimdilik sırası gelen ders kalmadı.'
                    : 'Sırası gelen ders yok. Bir satranç dersini bitirince '
                          'burada tekrar edilir.',
                key: const Key('ustalik-bos'),
                style: yazi.bodyLarge,
                textAlign: TextAlign.center,
              ),
            )
          else ...[
            for (final u in sirada)
              ListTile(
                key: ValueKey('ustalik-ders-${u.ders.id}'),
                leading: Icon(
                  u.yeni ? Icons.fiber_new_outlined : Icons.history,
                  color: r.ana,
                ),
                title: Text(u.ders.ad),
                subtitle: Text(u.kursAdi),
              ),
            const SizedBox(height: Olcu.b2),
            FilledButton.icon(
              key: const Key('ustalik-basla'),
              style: FilledButton.styleFrom(
                minimumSize: const Size(Olcu.hedef, Olcu.hedef),
              ),
              onPressed: () => setState(() {
                _sonuc = null;
                _oturum = _hazirla();
              }),
              icon: const Icon(Icons.play_arrow),
              label: Text('Başla (${sirada.length} konum)'),
            ),
          ],
        ],
      ),
    );
  }
}
