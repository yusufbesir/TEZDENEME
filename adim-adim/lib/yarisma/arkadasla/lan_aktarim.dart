/// Aynı Wi-Fi/LAN üzerinde düello taşıması: UDP yayın keşfi + tek TCP bağlantısı.
/// Yalnız dart:io; Windows ve Android'de ortak. İnternet sunucusu yoktur.
/// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım özellikler#cihaz] Claude
/// Yalnız onu yazan yapay zekâ değiştirir; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'aktarim.dart';
import 'protokol.dart';

const int lanKesifPortu = 45871;
const String _duyuruOnEki = 'ADIMADIM1';
const Duration lanBaglantiZamanAsimi = Duration(seconds: 5);

/// Bir oturumda kabul edilen en çok gelen mesaj (düello ~20 soru; fazlası kuyruk şişirme sayılır).
const int lanEnFazlaGelenMesaj = 100;

/// Keşifte bellekte tutulan en çok ilan.
const int lanEnFazlaIlan = 64;

/// Satır tabanlı TCP taşıması. Satır [enFazlaMesajBayt]'ı aşarsa bağlantı kesilir.
class LanAktarimi implements DuelloAktarimi {
  LanAktarimi._(this._soket) {
    final tampon = <int>[];
    var sayac = 0;
    _soket.listen(
      (parca) {
        for (final b in parca) {
          if (b == 10) {
            if (++sayac > lanEnFazlaGelenMesaj) {
              kapat();
              return;
            }
            final metin = utf8.decode(tampon, allowMalformed: true);
            tampon.clear();
            if (!_denetci.isClosed) _denetci.add(metin);
          } else {
            tampon.add(b);
            if (tampon.length > enFazlaMesajBayt) {
              tampon.clear();
              kapat();
              return;
            }
          }
        }
      },
      onDone: () {
        if (!_denetci.isClosed) _denetci.close();
      },
      onError: (_) => kapat(),
      cancelOnError: true,
    );
  }

  final Socket _soket;
  final StreamController<String> _denetci = StreamController<String>();

  /// Verilen adrese bağlanır.
  static Future<LanAktarimi> baglan(
    InternetAddress adres,
    int port, {
    Duration zamanAsimi = lanBaglantiZamanAsimi,
  }) async {
    final s = await Socket.connect(adres, port, timeout: zamanAsimi);
    s.setOption(SocketOption.tcpNoDelay, true);
    return LanAktarimi._(s);
  }

  @override
  Stream<String> get mesajlar => _denetci.stream;

  @override
  Future<void> gonder(String mesaj) async {
    if (mesaj.contains('\n') || mesaj.contains('\r')) {
      throw ArgumentError('Mesaj satır sonu içeremez');
    }
    final bayt = utf8.encode(mesaj);
    if (bayt.length > enFazlaMesajBayt) {
      throw ArgumentError('Mesaj çok büyük');
    }
    _soket.add([...bayt, 10]);
    await _soket.flush();
  }

  @override
  Future<void> kapat() async {
    if (!_denetci.isClosed) unawaited(_denetci.close());
    _soket.destroy();
  }
}

/// Ev sahibi: tek bir rakibi kabul eder, sonrakileri reddeder, duyuru yayar.
class LanEvSahibi {
  LanEvSahibi._(this._sunucu);

  final ServerSocket _sunucu;
  final Completer<LanAktarimi> _ilk = Completer<LanAktarimi>();
  RawDatagramSocket? _yayin;
  Timer? _zamanlayici;

  int get port => _sunucu.port;

  /// İlk gelen bağlantı; sonrakiler hemen kapatılır.
  Future<LanAktarimi> get rakip => _ilk.future;

  static Future<LanEvSahibi> baslat({InternetAddress? adres}) async {
    final s = await ServerSocket.bind(adres ?? InternetAddress.anyIPv4, 0);
    final e = LanEvSahibi._(s);
    s.listen((soket) {
      if (e._ilk.isCompleted) {
        soket.destroy();
        return;
      }
      soket.setOption(SocketOption.tcpNoDelay, true);
      e._ilk.complete(LanAktarimi._(soket));
      e._duyuruyuDurdur();
    });
    return e;
  }

  /// UDP yayını ile duyurur: `ADIMADIM1;port;takmaAd`. [hedef] testte 127.0.0.1 olabilir.
  Future<void> duyur(
    String takmaAd, {
    InternetAddress? hedef,
    int kesifPortu = lanKesifPortu,
    Duration aralik = const Duration(seconds: 1),
  }) async {
    final temiz = takmaAd.replaceAll(RegExp(r'[;\r\n]'), ' ');
    final yayin = await RawDatagramSocket.bind(InternetAddress.anyIPv4, 0);
    yayin.broadcastEnabled = true;
    _yayin = yayin;
    final veri = utf8.encode('$_duyuruOnEki;$port;$temiz');
    final adres = hedef ?? InternetAddress('255.255.255.255');
    void yolla() => yayin.send(veri, adres, kesifPortu);
    yolla();
    _zamanlayici = Timer.periodic(aralik, (_) => yolla());
  }

  void _duyuruyuDurdur() {
    _zamanlayici?.cancel();
    _zamanlayici = null;
    _yayin?.close();
    _yayin = null;
  }

  Future<void> kapat() async {
    _duyuruyuDurdur();
    await _sunucu.close();
  }
}

/// Keşfedilen bir ev sahibi.
class LanIlani {
  const LanIlani(this.adres, this.port, this.takmaAd);
  final InternetAddress adres;
  final int port;
  final String takmaAd;
}

/// Duyuruyu ayrıştırır; geçersizse null (güvenilmeyen girdi).
LanIlani? lanDuyurusunuCoz(List<int> veri, InternetAddress gonderen) {
  if (veri.length > 256) return null;
  final metin = utf8.decode(veri, allowMalformed: true);
  final p = metin.split(';');
  if (p.length != 3 || p[0] != _duyuruOnEki) return null;
  final port = int.tryParse(p[1]);
  if (port == null || port < 1024 || port > 65535) return null;
  final ad = p[2].trim();
  if (ad.isEmpty || ad.runes.length > enFazlaTakmaAd) return null;
  return LanIlani(gonderen, port, ad);
}

/// Duyuruları dinler; aynı adres+port bir kez bildirilir.
Stream<LanIlani> lanKesfet({int kesifPortu = lanKesifPortu}) async* {
  final soket = await RawDatagramSocket.bind(
    InternetAddress.anyIPv4,
    kesifPortu,
    reuseAddress: true,
  );
  final gorulen = <String>{};
  try {
    await for (final olay in soket) {
      if (olay != RawSocketEvent.read) continue;
      final d = soket.receive();
      if (d == null) continue;
      final ilan = lanDuyurusunuCoz(d.data, d.address);
      if (ilan == null) continue;
      if (gorulen.length >= lanEnFazlaIlan) continue;
      if (gorulen.add('${ilan.adres.address}:${ilan.port}')) yield ilan;
    }
  } finally {
    soket.close();
  }
}
