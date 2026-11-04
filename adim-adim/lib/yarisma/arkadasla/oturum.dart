/// "Arkadaşla oyna" oturum katmanı: taşıma + protokol + düello motorunu birleştirir.
/// Güvenlik: rakibin bildirdiği süre kullanılmaz; süreyi yerel saat ölçer. Yerelde olmayan
/// soru kimliği, sürüm/özet uyuşmazlığı ve sıra dışı mesaj düelloyu sonlandırır.
/// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım özellikler#cihaz] Claude
/// Yalnız onu yazan yapay zekâ değiştirir; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:async';

import '../model.dart';
import 'aktarim.dart';
import 'duello_motoru.dart';
import 'protokol.dart';

enum OturumDurumu { elSikisma, hazir, oynaniyor, bitti, hata }

typedef Saat = int Function();

int _simdiMs() => DateTime.now().millisecondsSinceEpoch;

/// Bir düello oturumu. [evSahibi] soruları seçer ve ilk sırayı belirler.
class DuelloOturumu {
  DuelloOturumu({
    required this.aktarim,
    required this.havuz,
    required this.takmaAd,
    required this.evSahibi,
    this.tohum = 1,
    Saat saat = _simdiMs,
  }) : _saat = saat,
       _ozet = soruBankasiOzetiHesapla(
         (List<YarismaSorusu>.of(havuz.where((s) => s.gecerliMi))
               ..sort((a, b) => a.id.compareTo(b.id)))
             .map((s) => '${s.id}|${s.soru}|${s.secenekler.join('/')}|${s.dogru}'),
       );

  final DuelloAktarimi aktarim;
  final List<YarismaSorusu> havuz;
  final String takmaAd;
  final bool evSahibi;
  final int tohum;
  final Saat _saat;
  final String _ozet;

  OturumDurumu durum = OturumDurumu.elSikisma;
  String? hata;
  String? rakipAdi;
  DuelloDurumu? duello;
  int _soruBasiMs = 0;
  bool _merhabaAlindi = false;
  bool _sonucGonderildi = false;
  StreamSubscription<String>? _abone;
  Timer? _elSikismaZamanlayici;
  final _degisim = StreamController<void>.broadcast();

  /// Durum her değiştiğinde olay üretir.
  Stream<void> get degisim => _degisim.stream;

  Future<void> baslat() async {
    // Rakip el sıkışmayı geciktirirse oturum askıda kalmasın.
    _elSikismaZamanlayici = Timer(const Duration(seconds: 10), () {
      if (!_merhabaAlindi) _hataVer('el_sikisma_zaman_asimi');
    });
    _abone = aktarim.mesajlar.listen(
      _geldi,
      onDone: () {
        if (durum != OturumDurumu.bitti) _hataVer('baglanti_koptu');
      },
    );
    await aktarim.gonder(
      Merhaba(
        surum: protokolSurumu,
        soruBankasiOzeti: _ozet,
        takmaAd: takmaAd,
      ).kodla(),
    );
  }

  void _bildir() {
    if (!_degisim.isClosed) _degisim.add(null);
  }

  void _hataVer(String neden) {
    if (durum == OturumDurumu.hata) return;
    durum = OturumDurumu.hata;
    hata = neden;
    _bildir();
    unawaited(kapat());
  }

  Future<void> _geldi(String ham) async {
    if (durum == OturumDurumu.hata) return;
    final r = ProtokolMesaji.coz(ham);
    if (r is ProtokolHatasi) return _hataVer('mesaj_${r.neden}');
    final m = (r as ProtokolTamam).mesaj;
    // Bittikten sonra yalnız rakibin kapanış mesajları (Sonuc, Ayril) beklenir.
    if (durum == OturumDurumu.bitti && m is! Sonuc && m is! Ayril) return;
    try {
      switch (m) {
        case Merhaba():
          if (_merhabaAlindi) return _hataVer('tekrar_merhaba');
          _merhabaAlindi = true;
          if (m.surum != protokolSurumu) return _hataVer('surum_uyusmuyor');
          if (m.soruBankasiOzeti != _ozet) return _hataVer('soru_bankasi_uyusmuyor');
          rakipAdi = m.takmaAd;
          durum = OturumDurumu.hazir;
          _bildir();
          if (evSahibi) await _duelloyuBaslat();
        case DuelloBasla():
          if (evSahibi || duello != null || !_merhabaAlindi) {
            return _hataVer('beklenmeyen_basla');
          }
          final map = {for (final s in havuz) s.id: s};
          final sorular = <YarismaSorusu>[];
          for (final id in m.soruIdleri) {
            final s = map[id];
            if (s == null) return _hataVer('bilinmeyen_soru');
            sorular.add(s);
          }
          // ilkSiraSende alıcı açısından yazılır: true ise ilk sıra bizde.
          _kur(sorular, m.ilkSiraSende ? Taraf.ben : Taraf.rakip);
        case Cevap():
          final d = duello;
          if (d == null) return _hataVer('beklenmeyen_cevap');
          // Rakibin bildirdiği süre güvenilmez; yalnız yerel ölçüm kullanılır.
          final gecen = _saat() - _soruBasiMs;
          final s = cevapUygula(d, Taraf.rakip, m.soruId, m.secenek, gecen);
          if (!s.basarili) return _hataVer('cevap_${s.hata!.name}');
          _ilerle(s.durum!);
        case Sonuc():
          // Bilgi amaçlı: iki uç hız bonusunu kendi saatiyle ölçtüğünden puanlar
          // küçük farklarla ayrışabilir; sonuç her zaman yerelde hesaplanır.
          final d = duello;
          if (d == null || !d.bitti) return _hataVer('erken_sonuc');
        case Hazir():
          break;
        case Ayril():
          if (durum != OturumDurumu.bitti) _hataVer('rakip_ayrildi');
      }
    } catch (_) {
      _hataVer('beklenmeyen');
    }
  }

  Future<void> _duelloyuBaslat() async {
    final secilen = duelloSorulariSec(havuz, tohum);
    final ilkBende = tohum.isEven;
    _kur(secilen, ilkBende ? Taraf.ben : Taraf.rakip);
    await aktarim.gonder(
      DuelloBasla(
        soruIdleri: [for (final s in secilen) s.id],
        ilkSiraSende: !ilkBende,
      ).kodla(),
    );
  }

  void _kur(List<YarismaSorusu> sorular, Taraf ilk) {
    duello = duelloBaslat(sorular: sorular, ilkSira: ilk);
    durum = OturumDurumu.oynaniyor;
    _soruBasiMs = _saat();
    _bildir();
  }

  void _ilerle(DuelloDurumu yeni) {
    final soruDegisti = yeni.mevcutIndeks != duello!.mevcutIndeks;
    duello = yeni;
    if (soruDegisti) _soruBasiMs = _saat();
    if (yeni.bitti) {
      durum = OturumDurumu.bitti;
      if (!_sonucGonderildi) {
        _sonucGonderildi = true;
        unawaited(aktarim.gonder(Sonuc(benimPuanim: yeni.benimPuan).kodla()));
      }
    }
    _bildir();
  }

  /// Yerel oyuncu cevap verir; süre yerel saatle ölçülür.
  Future<DuelloHatasi?> cevapla(int secenek) async {
    final d = duello;
    if (d == null || d.bitti) return DuelloHatasi.bitti;
    final id = d.mevcutSoru!.id;
    final gecen = _saat() - _soruBasiMs;
    final s = cevapUygula(d, Taraf.ben, id, secenek, gecen);
    if (!s.basarili) return s.hata;
    // Sıra önemli: Cevap, bitişte gönderilen Sonuc'tan önce gitmelidir.
    await aktarim.gonder(
      Cevap(soruId: id, secenek: secenek, gecenMs: gecen.clamp(0, enFazlaGecenMs)).kodla(),
    );
    _ilerle(s.durum!);
    return null;
  }

  Future<void> kapat() async {
    _elSikismaZamanlayici?.cancel();
    await _abone?.cancel();
    try {
      if (durum != OturumDurumu.bitti) {
        await aktarim
            .gonder(const Ayril().kodla())
            .timeout(const Duration(seconds: 2));
      }
    } catch (_) {
    } finally {
      await aktarim.kapat();
    }
    if (!_degisim.isClosed) await _degisim.close();
  }
}
