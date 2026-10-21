/// Satranç modülü ekranlarının ortak parçaları: iskele, boş mesaj, liste
/// kartı ve bulmaca oynatıcı.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../bilesenler/sayfa_govdesi.dart';
import '../../bilesenler/satranc_tahtasi.dart';
import '../../satranc/oyun.dart';
import '../../satranc/satranc.dart';
import '../../satranc/veri.dart';
import '../../tema/tema.dart';

/// Satranç ekranı iskeleti: başlık, geri düğmesi (yığında yoksa merkeze).
Widget satrancIskele(
  BuildContext context,
  String baslik,
  Widget govde, {
  List<Widget>? eylemler,
}) => Scaffold(
  appBar: AppBar(
    title: Text(baslik),
    actions: eylemler,
    leading: IconButton(
      icon: const Icon(Icons.arrow_back),
      tooltip: 'Geri',
      onPressed: () =>
          context.canPop() ? context.pop() : context.go('/satranc'),
    ),
  ),
  body: SafeArea(child: SayfaGovdesi(child: govde)),
);

/// Ortalanmış bilgi mesajı (boş durum).
Widget satrancBosMesaj(BuildContext context, String metin) => Center(
  child: Padding(
    padding: const EdgeInsets.all(Olcu.b3),
    child: Text(
      metin,
      style: Theme.of(context).textTheme.bodyLarge,
      textAlign: TextAlign.center,
    ),
  ),
);

/// Liste kartı (başlık, ayrıntı, ok).
Widget satrancKart(
  BuildContext context, {
  required Key anahtar,
  required IconData simge,
  required String baslik,
  required String ayrinti,
  required VoidCallback? onTap,
}) => Card(
  child: ListTile(
    key: anahtar,
    minVerticalPadding: Olcu.b1,
    leading: Icon(simge, color: context.renkler.ana),
    title: Text(baslik),
    subtitle: Text(ayrinti),
    trailing: const Icon(Icons.chevron_right),
    onTap: onTap,
  ),
);

/// Bölüm başlığı.
Widget satrancBolum(BuildContext context, String metin) => Padding(
  padding: const EdgeInsets.only(top: Olcu.b2, bottom: Olcu.b1),
  child: Text(metin, style: Theme.of(context).textTheme.titleSmall),
);

/// Ana hattın Türkçe notasyonla metni: "Ac7+ Şd7 Axa8".
String hamleDizisiMetni(String fen, List<String> ucis) {
  try {
    var k = Konum.fen(fen);
    final parca = <String>[];
    for (final u in ucis) {
      final h = k.uciBul(u);
      if (h == null) break;
      parca.add(turkceSan(k.san(h)));
      k = k.oyna(h);
    }
    return parca.join(' ');
  } on FormatException {
    return '';
  }
}

/// Tek bir bulmacayı oynatır. İLK deneme sonucu [onIlkSonuc] ile bir kez
/// bildirilir (yanlış hamle ya da "Çözümü göster" = yanlış; ilk denemede
/// çözüm = doğru). Sonrasında oyuncu yeniden deneyebilir; bu istatistiği
/// değiştirmez. Çözüldüğünde ya da çözüm gösterilince [onTamam] çağrılır.
class BulmacaOynatici extends StatefulWidget {
  const BulmacaOynatici({
    super.key,
    required this.bulmaca,
    required this.onIlkSonuc,
    this.onTamam,
  });

  final SatrancBulmaca bulmaca;
  final ValueChanged<bool> onIlkSonuc;
  final VoidCallback? onTamam;

  @override
  State<BulmacaOynatici> createState() => _BulmacaOynaticiDurumu();
}

class _BulmacaOynaticiDurumu extends State<BulmacaOynatici> {
  late Konum _baslangic;
  late Konum _konum;
  int _adim = 0;
  bool _hata = false;
  bool _cozuldu = false;
  bool _cozumGoster = false;
  bool _ipucu = false;
  bool _sonucBildirildi = false;
  String? _durum;
  int? _sonKaynak;
  int? _sonHedef;
  bool? _sonuc;

  SatrancBulmaca get _b => widget.bulmaca;

  @override
  void initState() {
    super.initState();
    _baslangic = Konum.fen(_b.fen);
    _konum = _baslangic;
  }

  void _bildir(bool dogru) {
    if (_sonucBildirildi) return;
    _sonucBildirildi = true;
    widget.onIlkSonuc(dogru);
  }

  void _bastan() {
    setState(() {
      _konum = _baslangic;
      _adim = 0;
      _cozuldu = false;
      _cozumGoster = false;
      _durum = null;
      _sonKaynak = null;
      _sonHedef = null;
      _sonuc = null;
    });
  }

  void _hamle(SatrancHamlesi h) {
    final san = turkceSan(_konum.san(h));
    if (!BulmacaKurali.dogruMu(_b, _konum, h, _adim)) {
      _hata = true;
      _bildir(false);
      setState(() {
        _durum = '$san çözüm değil. Yeniden dene ya da çözümü gör.';
        _sonuc = false;
      });
      return;
    }
    final sonra = _konum.oyna(h);
    if (BulmacaKurali.bitti(_b, sonra, _adim)) {
      _bildir(!_hata);
      setState(() {
        _konum = sonra;
        _cozuldu = true;
        _sonKaynak = h.kaynak;
        _sonHedef = h.hedef;
        _sonuc = true;
        _durum = _hata ? 'Çözdün (ilk denemede değil).' : 'Doğru!';
      });
      widget.onTamam?.call();
      return;
    }
    final cevap = BulmacaKurali.rakipCevabi(_b, sonra, _adim, h);
    if (cevap == null) {
      _bildir(!_hata);
      setState(() {
        _konum = sonra;
        _cozuldu = true;
        _sonuc = true;
        _durum = _hata ? 'Çözdün (ilk denemede değil).' : 'Doğru!';
      });
      widget.onTamam?.call();
      return;
    }
    final cevapSan = turkceSan(sonra.san(cevap));
    setState(() {
      _konum = sonra.oyna(cevap);
      _adim++;
      _sonKaynak = cevap.kaynak;
      _sonHedef = cevap.hedef;
      _sonuc = null;
      _durum = 'İyi hamle: $san. Rakip $cevapSan oynadı; sıra sende.';
    });
  }

  void _cozumuGoster() {
    _hata = true;
    _bildir(false);
    setState(() {
      _cozumGoster = true;
      _durum = null;
    });
    widget.onTamam?.call();
  }

  @override
  Widget build(BuildContext context) {
    final r = context.renkler;
    final yazi = Theme.of(context).textTheme;
    final tema = SatrancVeri.temaBul(_b.tema);
    final bitti = _cozuldu || _cozumGoster;
    final satirHamle = _b.matSayisi > 0
        ? '${_b.matSayisi} hamlede mat bul.'
        : 'En iyi hamleyi bul.';
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('${tema?.ad ?? 'Bulmaca'}: $satirHamle', style: yazi.titleMedium),
        const SizedBox(height: Olcu.b1),
        Text(
          '${_b.beyazOynar ? 'Beyaz' : 'Siyah'} oynar. Taşa, sonra gideceği '
          'kareye dokun.',
          style: yazi.bodyMedium?.copyWith(color: r.metinIkincil),
        ),
        const SizedBox(height: Olcu.b2),
        TahtaGirisi(
          konum: _konum,
          beyazAltta: _b.beyazOynar,
          onHamle: _hamle,
          etkin: !bitti,
          sonKaynak: _sonKaynak,
          sonHedef: _sonHedef,
          sonuc: _sonuc,
        ),
        const SizedBox(height: Olcu.b1),
        if (_durum != null)
          Semantics(
            liveRegion: true,
            child: Text(
              _durum!,
              key: const Key('bulmaca-durum'),
              style: yazi.bodyMedium?.copyWith(
                color: _sonuc == false ? r.hata : r.metinIkincil,
              ),
            ),
          ),
        if (_ipucu && !bitti)
          Padding(
            padding: const EdgeInsets.only(top: Olcu.b1),
            child: Text(
              'İpucu: ${_b.ipucu}',
              key: const Key('bulmaca-ipucu-metni'),
              style: yazi.bodyMedium,
            ),
          ),
        if (bitti) ...[
          const SizedBox(height: Olcu.b1),
          Text(
            'Çözüm: ${hamleDizisiMetni(_b.fen, _b.hamleler)}',
            key: const Key('bulmaca-cozum-metni'),
            style: yazi.titleSmall,
          ),
          const SizedBox(height: Olcu.b1),
          Text(_b.aciklama, style: yazi.bodyMedium),
        ],
        const SizedBox(height: Olcu.b1),
        Wrap(
          spacing: Olcu.b1,
          runSpacing: Olcu.b1,
          children: [
            if (!bitti)
              TextButton.icon(
                key: const Key('bulmaca-ipucu'),
                style: TextButton.styleFrom(
                  minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                ),
                onPressed: () => setState(() => _ipucu = true),
                icon: const Icon(Icons.lightbulb_outline),
                label: const Text('İpucu'),
              ),
            if (!bitti)
              TextButton.icon(
                key: const Key('bulmaca-cozum'),
                style: TextButton.styleFrom(
                  minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                ),
                onPressed: _cozumuGoster,
                icon: const Icon(Icons.visibility_outlined),
                label: const Text('Çözümü göster'),
              ),
            if (_adim > 0 || _sonuc == false || bitti)
              TextButton.icon(
                key: const Key('bulmaca-bastan'),
                style: TextButton.styleFrom(
                  minimumSize: const Size(Olcu.hedef, Olcu.hedef),
                ),
                onPressed: _bastan,
                icon: const Icon(Icons.restart_alt),
                label: Text(bitti ? 'Yeniden oyna' : 'Baştan al'),
              ),
          ],
        ),
      ],
    );
  }
}
