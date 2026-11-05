/// "Arkadaşla oyna" ekranı: aynı Wi-Fi'da oda kur / odaya katıl, sonra sıra tabanlı düello.
/// Taşıma LAN'dır (lan_aktarim.dart); Bluetooth yedeği Android'e eklenince buraya bağlanır.
/// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım özellikler#cihaz] Claude
/// Yalnız onu yazan yapay zekâ değiştirir; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:async';

import 'package:flutter/material.dart';

import '../model.dart';
import '../soru_bankasi.dart';
import 'duello_motoru.dart';
import 'lan_aktarim.dart';
import 'oturum.dart';
import 'protokol.dart';

enum _Asama { giris, odaKurdu, araniyor, oyun }

class ArkadaslaEkrani extends StatefulWidget {
  const ArkadaslaEkrani({super.key, this.havuz});

  /// Test için soru havuzu; boşsa tüm soru bankası.
  final List<YarismaSorusu>? havuz;

  @override
  State<ArkadaslaEkrani> createState() => _ArkadaslaEkraniDurumu();
}

class _ArkadaslaEkraniDurumu extends State<ArkadaslaEkrani> {
  final _ad = TextEditingController(text: 'Oyuncu');
  _Asama _asama = _Asama.giris;
  String? _mesaj;
  LanEvSahibi? _ev;
  StreamSubscription<LanIlani>? _kesif;
  final List<LanIlani> _ilanlar = [];
  DuelloOturumu? _oturum;
  StreamSubscription<void>? _degisim;

  List<YarismaSorusu> get _havuz => widget.havuz ?? tumSorular;

  String? _adHatasi() {
    final r = ProtokolMesaji.fromJson({
      't': 'merhaba',
      'surum': protokolSurumu,
      'ozet': soruBankasiOzetiHesapla(const ['x']),
      'takmaAd': _ad.text,
    });
    return r is ProtokolHatasi ? 'Takma ad 1-24 karakter olmalı.' : null;
  }

  String get _temizAd {
    final r = ProtokolMesaji.fromJson({
      't': 'merhaba',
      'surum': protokolSurumu,
      'ozet': soruBankasiOzetiHesapla(const ['x']),
      'takmaAd': _ad.text,
    });
    return r is ProtokolTamam ? (r.mesaj as Merhaba).takmaAd : 'Oyuncu';
  }

  Future<void> _odaKur() async {
    final hata = _adHatasi();
    if (hata != null) return setState(() => _mesaj = hata);
    try {
      final ev = await LanEvSahibi.baslat();
      _ev = ev;
      await ev.duyur(_temizAd);
      setState(() {
        _asama = _Asama.odaKurdu;
        _mesaj = null;
      });
      final aktarim = await ev.rakip;
      await _oturumuBaslat(aktarim, evSahibi: true);
    } catch (_) {
      if (mounted) setState(() => _mesaj = 'Oda kurulamadı. Wi-Fi bağlı mı?');
    }
  }

  void _ara() {
    final hata = _adHatasi();
    if (hata != null) return setState(() => _mesaj = hata);
    setState(() {
      _asama = _Asama.araniyor;
      _mesaj = null;
      _ilanlar.clear();
    });
    _kesif = lanKesfet().listen(
      (i) {
        if (mounted) setState(() => _ilanlar.add(i));
      },
      onError: (_) {
        if (mounted) setState(() => _mesaj = 'Arama başlatılamadı.');
      },
    );
  }

  Future<void> _katil(LanIlani ilan) async {
    try {
      await _kesif?.cancel();
      final aktarim = await LanAktarimi.baglan(ilan.adres, ilan.port);
      await _oturumuBaslat(aktarim, evSahibi: false);
    } catch (_) {
      if (mounted) {
        setState(() {
          _asama = _Asama.giris;
          _mesaj = 'Bağlanılamadı.';
        });
      }
    }
  }

  Future<void> _oturumuBaslat(
    LanAktarimi aktarim, {
    required bool evSahibi,
  }) async {
    final o = DuelloOturumu(
      aktarim: aktarim,
      havuz: _havuz,
      takmaAd: _temizAd,
      evSahibi: evSahibi,
      tohum: DateTime.now().millisecondsSinceEpoch & 0x7fffffff,
    );
    _oturum = o;
    _degisim = o.degisim.listen((_) {
      if (mounted) setState(() {});
    });
    if (mounted) setState(() => _asama = _Asama.oyun);
    await o.baslat();
  }

  Future<void> _temizle() async {
    await _kesif?.cancel();
    await _degisim?.cancel();
    await _oturum?.kapat();
    await _ev?.kapat();
  }

  @override
  void dispose() {
    unawaited(_temizle());
    _ad.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Arkadaşla oyna')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: switch (_asama) {
            _Asama.giris => _giris(),
            _Asama.odaKurdu => _bekle(
              'Oda kuruldu. Arkadaşının aynı Wi-Fi\'dan katılmasını bekle…',
            ),
            _Asama.araniyor => _liste(),
            _Asama.oyun => _oyun(),
          },
        ),
      ),
    );
  }

  Widget _bekle(String metin) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const CircularProgressIndicator(),
        const SizedBox(height: 16),
        Text(metin, textAlign: TextAlign.center),
      ],
    ),
  );

  Widget _giris() => ListView(
    children: [
      const Text(
        'İki cihaz aynı Wi-Fi\'a bağlı olmalı. Veri yalnız iki cihaz arasında gider; internet kullanılmaz.',
      ),
      const SizedBox(height: 16),
      TextField(
        controller: _ad,
        maxLength: enFazlaTakmaAd,
        decoration: const InputDecoration(labelText: 'Takma ad'),
      ),
      if (_mesaj != null)
        Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Text(
            _mesaj!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ),
      FilledButton(onPressed: _odaKur, child: const Text('Oda kur')),
      const SizedBox(height: 8),
      OutlinedButton(onPressed: _ara, child: const Text('Odaya katıl')),
    ],
  );

  Widget _liste() {
    if (_ilanlar.isEmpty) return _bekle('Aynı Wi-Fi\'daki odalar aranıyor…');
    return ListView(
      children: [
        for (final i in _ilanlar)
          ListTile(
            title: Text(i.takmaAd),
            subtitle: Text(i.adres.address),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => _katil(i),
          ),
      ],
    );
  }

  Widget _oyun() {
    final o = _oturum;
    if (o == null) return _bekle('Bağlanılıyor…');
    if (o.durum == OturumDurumu.hata) {
      return _bitis('Bağlantı bitti', _hataMetni(o.hata));
    }
    final d = o.duello;
    if (d == null) return _bekle('Rakiple el sıkışılıyor…');
    if (o.durum == OturumDurumu.bitti || d.bitti) {
      final s = sonucHesapla(d);
      final baslik = switch (s) {
        DuelloSonucu.kazandi => 'Kazandın!',
        DuelloSonucu.kaybetti => 'Kaybettin',
        _ => 'Berabere',
      };
      return _bitis(
        baslik,
        'Sen ${d.benimPuan} – ${o.rakipAdi ?? 'Rakip'} ${d.rakipPuan}',
      );
    }
    final soru = d.mevcutSoru!;
    final sirasi = d.sira == Taraf.ben;
    return ListView(
      children: [
        Text(
          'Sen ${d.benimPuan} – ${o.rakipAdi ?? 'Rakip'} ${d.rakipPuan}',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        Text('Soru ${d.mevcutIndeks + 1}/${d.sorular.length}'),
        const SizedBox(height: 12),
        Text(soru.soru, style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 12),
        for (var i = 0; i < soru.secenekler.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: FilledButton.tonal(
              onPressed: sirasi ? () => o.cevapla(i) : null,
              child: Text(soru.secenekler[i]),
            ),
          ),
        Text(sirasi ? 'Sıra sende.' : 'Rakibin cevabı bekleniyor…'),
      ],
    );
  }

  Widget _bitis(String baslik, String ayrinti) => Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(baslik, style: Theme.of(context).textTheme.headlineMedium),
        const SizedBox(height: 8),
        Text(ayrinti, textAlign: TextAlign.center),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Tamam'),
        ),
      ],
    ),
  );

  String _hataMetni(String? h) => switch (h) {
    'soru_bankasi_uyusmuyor' || 'surum_uyusmuyor' =>
      'İki cihazdaki uygulama sürümü farklı. İkisini de güncelle.',
    'rakip_ayrildi' => 'Rakip oyundan ayrıldı.',
    'baglanti_koptu' => 'Bağlantı koptu.',
    'el_sikisma_zaman_asimi' => 'Rakipten yanıt gelmedi.',
    _ => 'Beklenmeyen bir durum oluştu.',
  };
}
