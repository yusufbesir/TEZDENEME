/// Bilgisayara karşı oynanan tahta (mini maç ve oyun sonu antrenörü ortak
/// bileşeni): oyuncu dokunarak oynar, bilgisayar (derinlik-2 arama, çevrimdışı)
/// cevap verir. Oyun bitince [BilgisayarOyunu.onBitti] bir kez çağrılır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';

import '../../bilesenler/satranc_tahtasi.dart';
import '../../satranc/oyun.dart';
import '../../satranc/satranc.dart';
import '../../satranc/yz.dart';
import '../../tema/tema.dart';

class BilgisayarOyunu extends StatefulWidget {
  const BilgisayarOyunu({
    super.key,
    required this.baslangic,
    required this.onBitti,
    this.geriAl = false,
    this.pesEt = false,
    this.bilgi,
  });

  final MacDurumu baslangic;

  /// Oyun bittiğinde (mat, pat, beraberlik, pes) bir kez: son durum, sonuç
  /// ('kazandi' | 'yenildi' | 'berabere') ve neden.
  final void Function(MacDurumu mac, String sonuc, String neden) onBitti;

  /// "Geri al" düğmesi (oyuncunun son hamlesini ve cevabı geri alır).
  final bool geriAl;

  /// "Pes et" düğmesi.
  final bool pesEt;

  /// Tahtanın üstündeki ek bilgi (ör. hedef); konumu bilmeyen ekranlar için.
  final Widget? bilgi;

  @override
  State<BilgisayarOyunu> createState() => _BilgisayarOyunuDurumu();
}

class _BilgisayarOyunuDurumu extends State<BilgisayarOyunu> {
  late final List<MacDurumu> _gecmis = [widget.baslangic];
  bool _dusunuyor = false;
  bool _bitti = false;
  String? _durum;

  MacDurumu get _mac => _gecmis.last;

  @override
  void initState() {
    super.initState();
    if (!_sonucuDene() && !_mac.kullaniciSirada) _bilgisayarSirasi();
  }

  /// Oyun bittiyse bildirir ve true döner.
  bool _sonucuDene() {
    final s = _mac.sonuc;
    if (s == null || _bitti) return s != null;
    _bitti = true;
    _durum = s.neden;
    // initState içinden çağrılabilir; bildirimi çerçeve sonrasına bırak.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) widget.onBitti(_mac, s.sonuc, s.neden);
    });
    return true;
  }

  Future<void> _bilgisayarSirasi() async {
    if (_dusunuyor || _bitti) return;
    setState(() => _dusunuyor = true);
    // Çizim için bir çerçeve bırak; arama aynı iş parçacığında çalışır.
    await Future<void>.delayed(const Duration(milliseconds: 30));
    if (!mounted) return;
    final h = _mac.bilgisayarHamlesi();
    setState(() {
      _dusunuyor = false;
      if (h != null) {
        final san = turkceSan(_mac.konum.san(h));
        _gecmis.add(_mac.oyna(h));
        _durum = 'Bilgisayar $san oynadı.';
      }
      _sonucuDene();
    });
  }

  void _kullaniciHamlesi(SatrancHamlesi h) {
    if (_bitti || _dusunuyor) return;
    final san = turkceSan(_mac.konum.san(h));
    setState(() {
      _gecmis.add(_mac.oyna(h));
      _durum = 'Hamlen: $san.';
      _sonucuDene();
    });
    if (!_bitti) _bilgisayarSirasi();
  }

  /// Geri alınınca dönülecek durum: oyuncunun sırasında olduğu bir önceki
  /// durum; yoksa null.
  int? _geriHedef() {
    for (var j = _gecmis.length - 2; j >= 0; j--) {
      if (_gecmis[j].kullaniciSirada) return j;
    }
    return null;
  }

  void _geriAl() {
    final j = _geriHedef();
    if (j == null || _dusunuyor || _bitti) return;
    setState(() {
      _gecmis.removeRange(j + 1, _gecmis.length);
      _durum = 'Son hamlen geri alındı.';
    });
  }

  void _pesEt() {
    if (_bitti) return;
    setState(() {
      _bitti = true;
      _durum = 'Pes ettin.';
    });
    widget.onBitti(_mac, MacDurumu.yenildi, 'Pes ettin.');
  }

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final mac = _mac;
    int? kaynak, hedef;
    if (mac.gecmis.isNotEmpty) {
      final u = mac.gecmis.last;
      kaynak = kareNo(u.substring(0, 2));
      hedef = kareNo(u.substring(2, 4));
    }
    final adimlar = MacIncelemesi.adimlar(
      mac.baslangicFen,
      mac.gecmis,
      mac.kullaniciBeyaz,
    );
    final fark = SatrancYZ.materyal(mac.konum);
    final kullaniciFarki = mac.kullaniciBeyaz ? fark : -fark;
    final farkMetni = kullaniciFarki == 0
        ? 'Madde eşit'
        : kullaniciFarki > 0
        ? 'Madde üstünlüğün: +${(kullaniciFarki / 100).toStringAsFixed(1).replaceAll('.', ',')}'
        : 'Madde geridesin: ${(kullaniciFarki / 100).toStringAsFixed(1).replaceAll('.', ',')}';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (widget.bilgi != null) ...[
          widget.bilgi!,
          const SizedBox(height: Olcu.b1),
        ],
        TahtaGirisi(
          konum: mac.konum,
          beyazAltta: mac.kullaniciBeyaz,
          oynayanBeyaz: mac.kullaniciBeyaz,
          onHamle: _kullaniciHamlesi,
          etkin: !_bitti && !_dusunuyor && mac.kullaniciSirada,
          sonKaynak: kaynak,
          sonHedef: hedef,
        ),
        const SizedBox(height: Olcu.b1),
        Semantics(
          liveRegion: true,
          child: Text(
            _dusunuyor
                ? 'Bilgisayar düşünüyor…'
                : (_durum ??
                      (mac.kullaniciSirada
                          ? 'Sıra sende.'
                          : 'Sıra bilgisayarda.')),
            key: const Key('oyun-durum'),
            style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
          ),
        ),
        const SizedBox(height: Olcu.b1),
        Text(
          'Hamle ${mac.kullaniciHamleSayisi} · $farkMetni'
          '${mac.konum.sah && !_bitti ? ' · Şah!' : ''}',
          key: const Key('oyun-bilgi'),
          style: yazi.bodySmall?.copyWith(color: r.metinIkincil),
        ),
        if (adimlar.isNotEmpty) ...[
          const SizedBox(height: Olcu.b1),
          Text(
            [for (final a in adimlar) a.etiket].join('  '),
            key: const Key('oyun-hamleler'),
            style: yazi.bodySmall,
          ),
        ],
        const SizedBox(height: Olcu.b1),
        Wrap(
          spacing: Olcu.b1,
          runSpacing: Olcu.b1,
          children: [
            if (widget.geriAl && !_bitti)
              TextButton.icon(
                key: const Key('oyun-geri-al'),
                style: TextButton.styleFrom(
                  minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                ),
                onPressed: _geriHedef() != null && !_dusunuyor ? _geriAl : null,
                icon: const Icon(Icons.undo),
                label: const Text('Geri al'),
              ),
            if (widget.pesEt && !_bitti)
              TextButton.icon(
                key: const Key('oyun-pes'),
                style: TextButton.styleFrom(
                  minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                ),
                onPressed: _pesEt,
                icon: const Icon(Icons.flag_outlined),
                label: const Text('Pes et'),
              ),
          ],
        ),
      ],
    );
  }
}
