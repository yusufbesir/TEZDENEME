/// Kelime defteri oynatıcısı (ÖZELLİK 82, Naver): kelime defterini sesli,
/// otomatik çalan liste olarak okur (cihaz TTS; eller serbest moduyla aynı
/// `Ses.okuBekle` kalıbı). Her kelime okunur, istenirse anlamı Türkçe okunur,
/// hıza göre bekleme sonrası sıradakine geçilir. Duraklat/devam, önceki/
/// sonraki, hız (yavaş/normal/hızlı) ve döngü desteklenir. Ekrandan bağımsızdır;
/// ses ve bekleme enjekte edilir (testte sahte, bekleme sıfır). Kart
/// aralıklarına (SRS), hata defterine ve XP'ye dokunmaz.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import 'dart:async';

import 'package:flutter/foundation.dart';

import '../model/durum.dart';
import '../model/icerik.dart';
import '../motor/ders_ogeleri.dart';
import '../motor/pratik.dart';
import 'ses.dart';

/// Oynatma hızı: konuşma hızı ve öğeler arası bekleme.
enum OynatmaHizi {
  yavas('Yavaş', 0.35, Duration(milliseconds: 2500)),
  normal('Normal', 0.45, Duration(milliseconds: 1500)),
  hizli('Hızlı', 0.55, Duration(milliseconds: 700));

  const OynatmaHizi(this.ad, this.konusmaHizi, this.bekleme);
  final String ad;
  final double konusmaHizi;
  final Duration bekleme;
}

class OynatmaOgesi {
  const OynatmaOgesi({
    required this.metin,
    required this.anlam,
    required this.dil,
  });
  final String metin;
  final String anlam;

  /// Metnin okuma dili (BCP-47).
  final String dil;
}

class KelimeOynatici extends ChangeNotifier {
  KelimeOynatici({
    required this.ses,
    required this.ogeler,
    this.hiz = OynatmaHizi.normal,
    this.anlamOku = false,
    this.dongu = false,
    Future<void> Function(Duration)? bekle,
  }) : _bekle = bekle ?? Future<void>.delayed;

  final Ses ses;
  final List<OynatmaOgesi> ogeler;
  final Future<void> Function(Duration) _bekle;

  OynatmaHizi hiz;
  bool anlamOku;
  bool dongu;

  /// Listede en çok öğe.
  static const int enCok = 100;

  int _indeks = 0;
  bool _caliyor = false;
  int _nesil = 0;

  int get indeks => _indeks;
  bool get caliyor => _caliyor;
  bool get bitti => ogeler.isNotEmpty && _indeks >= ogeler.length;
  OynatmaOgesi? get simdiki =>
      (_indeks >= 0 && _indeks < ogeler.length) ? ogeler[_indeks] : null;

  /// Öğrencinin kelime havuzundan çalma listesi: zayıf (yarı ömrü kısa) kartlar
  /// önce, en çok [enCok] öğe. Yalnız dil kurslarında anlamlıdır (kod
  /// kurslarında sesli okuma yok), bu yüzden kod/oyun kurslarında boş döner.
  static List<OynatmaOgesi> liste(OgrenciDurumu d, List<Kurs> kurslar) {
    final dilKurslari = [
      for (final k in kurslar)
        if (k.alan == KursAlani.dil) k,
    ];
    final havuz = Pratik.kelimeHavuzu(d, dilKurslari);
    double yo(KelimeCifti c) => d.kartlar[c.kartId]?.yariOmurGun ?? 1e9;
    final sirali = [
      ...havuz.where((c) => yo(c) < Kart.ortaEsik),
      ...havuz.where((c) => yo(c) >= Kart.ortaEsik),
    ];
    String dilBul(String kartId) {
      final i = kartId.lastIndexOf('#');
      final dersId = i > 0 ? kartId.substring(0, i) : kartId;
      for (final k in dilKurslari) {
        if (k.dersBul(dersId) != null) return DersOgeleri.kursSesDili(k.id);
      }
      return varsayilanSesDili;
    }

    return [
      for (final c in sirali.take(enCok))
        OynatmaOgesi(metin: c.metin, anlam: c.anlam, dil: dilBul(c.kartId)),
    ];
  }

  /// Çalmaya (ya da kalınan yerden devam etmeye) başlar. Liste bittiyse
  /// baştan başlar. Zaten çalıyorsa bir şey yapmaz. Döngü bitince tamamlanır.
  Future<void> oynat() async {
    if (_caliyor || ogeler.isEmpty) return;
    if (bitti) _indeks = 0;
    _caliyor = true;
    final nesil = ++_nesil;
    notifyListeners();
    bool gecerli() => _caliyor && nesil == _nesil;
    while (gecerli()) {
      if (_indeks >= ogeler.length) {
        if (!dongu) break;
        _indeks = 0;
      }
      final o = ogeler[_indeks];
      notifyListeners();
      ses.konusmaHizi = hiz.konusmaHizi;
      await ses.okuBekle(o.metin, dil: o.dil);
      if (!gecerli()) return;
      if (anlamOku && o.anlam.isNotEmpty) {
        await ses.okuBekle(o.anlam, dil: 'tr-TR');
        if (!gecerli()) return;
      }
      await _bekle(hiz.bekleme);
      if (!gecerli()) return;
      _indeks++;
    }
    if (nesil == _nesil) {
      _caliyor = false;
      notifyListeners();
    }
  }

  /// Duraklatır; aynı öğeden devam edilir.
  Future<void> duraklat() async {
    if (!_caliyor) return;
    _caliyor = false;
    _nesil++;
    notifyListeners();
    await ses.durdur();
  }

  Future<void> devam() => oynat();

  /// [i]. öğeye atlar (sınırlara kırpılır); çalıyorsa oradan okumaya sürer.
  Future<void> git(int i) async {
    if (ogeler.isEmpty) return;
    final calisiyordu = _caliyor;
    if (calisiyordu) await duraklat();
    _indeks = i.clamp(0, ogeler.length - 1);
    notifyListeners();
    if (calisiyordu) unawaited(oynat());
  }

  Future<void> sonraki() => git(_indeks + 1);
  Future<void> onceki() => git(_indeks - 1);

  @override
  void dispose() {
    _caliyor = false;
    _nesil++;
    super.dispose();
  }
}
