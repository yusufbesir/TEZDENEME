/// Senaryolu konuşma motoru (ÖZELLİK 65): bir [Senaryo]nun akışını yürütür.
/// Saf Dart; ses, konuşma tanıma ve arayüzden bağımsızdır. Kullanıcı cevabı
/// üç yolla gelir ve hepsi aynı cevap seçeneğine çözülür: seçerek (indeks),
/// yazarak ([yazilanCevap], harf benzerliği) ya da konuşarak
/// ([soylenenCevap], tahmini telaffuz puanı). Uygun cevap konuşmayı bir sonraki
/// düğüme dallandırır; uygun olmayan cevap nazik bir notla aynı düğümde
/// bırakır (ceza yok).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/icerik.dart';
import '../model/senaryo.dart';
import 'telaffuz.dart';

/// Konuşma balonu: [kullanici] true ise kullanıcının, değilse karşı tarafın.
/// [not] doluysa balon bir ipucu/uyarı notudur (uygun olmayan cevaptan sonra).
class SenaryoBalonu {
  const SenaryoBalonu({
    required this.kullanici,
    required this.metin,
    required this.anlam,
    this.not,
  });
  final bool kullanici;
  final String metin;
  final String anlam;
  final String? not;
}

enum SenaryoAdimi { ilerledi, uygunDegil, bitti }

class SenaryoAkisi {
  SenaryoAkisi(this.senaryo) {
    _dugumeGir(senaryo.baslangic);
  }

  final Senaryo senaryo;
  final List<SenaryoBalonu> balonlar = [];
  late SenaryoDugumu _dugum;
  bool _bitti = false;

  /// Yazarak cevapta kabul için en düşük benzerlik; konuşarak cevapta en düşük
  /// tahmini telaffuz puanı.
  static const double yazmaEsigi = 0.85;
  static const int konusmaEsigi = 70;

  SenaryoDugumu get dugum => _dugum;
  bool get bitti => _bitti;

  /// Kullanıcının şimdi seçebileceği cevaplar (bitince boş).
  List<SenaryoCevabi> get cevaplar => _bitti ? const [] : _dugum.cevaplar;

  void _dugumeGir(String id) {
    final d = senaryo.dugum(id);
    if (d == null) {
      _bitti = true;
      return;
    }
    _dugum = d;
    for (final m in d.karsi) {
      balonlar.add(
        SenaryoBalonu(kullanici: false, metin: m.metin, anlam: m.anlam),
      );
    }
    if (d.son) _bitti = true;
  }

  /// [indeks]. cevabı verir. Uygunsa kullanıcı balonu eklenir ve konuşma
  /// ilerler; değilse not balonu eklenir ve aynı düğümde kalınır.
  SenaryoAdimi cevapla(int indeks) {
    if (_bitti || indeks < 0 || indeks >= _dugum.cevaplar.length) {
      return SenaryoAdimi.uygunDegil;
    }
    final c = _dugum.cevaplar[indeks];
    balonlar.add(
      SenaryoBalonu(
        kullanici: true,
        metin: c.metin,
        anlam: c.anlam,
        not: c.uygun ? null : (c.not ?? 'Bu cevap burada pek uymuyor.'),
      ),
    );
    if (!c.uygun) return SenaryoAdimi.uygunDegil;
    final sonraki = c.sonraki;
    if (sonraki == null) {
      _bitti = true;
      return SenaryoAdimi.bitti;
    }
    _dugumeGir(sonraki);
    return _bitti ? SenaryoAdimi.bitti : SenaryoAdimi.ilerledi;
  }

  /// Yazılan metni, düğümdeki cevaplardan en çok benzeyene çözer; yeterince
  /// benzeyen yoksa null. Büyük/küçük harf, noktalama ve Türkçe I/İ duyarsız.
  int? yazilanCevap(String girdi) {
    final g = telaffuzKelimeleri(girdi).join(' ');
    if (g.isEmpty || _bitti) return null;
    int? en;
    var enBenzerlik = 0.0;
    for (var i = 0; i < _dugum.cevaplar.length; i++) {
      final h = telaffuzKelimeleri(_dugum.cevaplar[i].metin).join(' ');
      final b = telaffuzBenzerligi(h, g);
      if (b > enBenzerlik) {
        enBenzerlik = b;
        en = i;
      }
    }
    return enBenzerlik >= yazmaEsigi ? en : null;
  }

  /// Söylenen (tanınan) metni cevaplara tahmini telaffuz puanıyla çözer; en
  /// yüksek puanlı cevap [konusmaEsigi] ve üstündeyse döner, yoksa null.
  int? soylenenCevap(String soylenen) {
    if (telaffuzKelimeleri(soylenen).isEmpty || _bitti) return null;
    int? en;
    var enPuan = -1;
    for (var i = 0; i < _dugum.cevaplar.length; i++) {
      final p = telaffuzTahmini(
        _dugum.cevaplar[i].metin,
        soylenen,
        dil: senaryo.dil,
      ).puan;
      if (p > enPuan) {
        enPuan = p;
        en = i;
      }
    }
    return enPuan >= konusmaEsigi ? en : null;
  }
}

abstract final class Senaryolar {
  /// Kullanıcının kurslarına uyan senaryolar: kurs kimliği senaryonun
  /// [Senaryo.kursOnek] önekiyle başlayan en az bir dil kursu varsa listelenir.
  static List<Senaryo> listele(List<Senaryo> hepsi, List<Kurs> kurslar) {
    final onekler = {
      for (final k in kurslar)
        if (k.alan == KursAlani.dil) k.id.split('-').first,
    };
    return [
      for (final s in hepsi)
        if (onekler.contains(s.kursOnek)) s,
    ];
  }

  /// Senaryo bitirildi: kaç kez bitirildiğini artırır. XP/SRS yok.
  static Map<String, int> bitirildi(Map<String, int> mevcut, String id) => {
    ...mevcut,
    id: (mevcut[id] ?? 0) + 1,
  };
}
