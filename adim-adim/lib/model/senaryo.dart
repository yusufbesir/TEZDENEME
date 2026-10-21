// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Senaryolu konuşma modeli (ÖZELLİK 65): önceden yazılmış, dallanan, iki
/// taraflı (karşı taraf + kullanıcı) çevrimdışı sohbet. Her düğümde karşı taraf
/// bir ya da birkaç mesaj söyler, kullanıcı cevaplardan birini seçer, yazar ya
/// da söyler. Uygun cevaplar bir sonraki düğüme dallanır; uygun olmayan cevap
/// nazik bir notla aynı düğümde kalır (ceza yok).
library;

/// Konuşma balonundaki bir mesaj: hedef dildeki [metin] ve Türkçe [anlam].
typedef SenaryoMesaji = ({String metin, String anlam});

/// Kullanıcının verebileceği bir cevap. [sonraki] null ise (ve [uygun] ise)
/// senaryo biter; [uygun] false ise [not] neden uymadığını açıklar ve
/// senaryo ilerlemez.
class SenaryoCevabi {
  const SenaryoCevabi({
    required this.metin,
    required this.anlam,
    this.sonraki,
    this.uygun = true,
    this.not,
  });

  final String metin;
  final String anlam;
  final String? sonraki;
  final bool uygun;
  final String? not;
}

/// Konuşmanın bir adımı: karşı tarafın mesajları ve kullanıcının cevap
/// seçenekleri. [cevaplar] boşsa konuşma burada biter.
class SenaryoDugumu {
  const SenaryoDugumu({
    required this.id,
    required this.karsi,
    this.cevaplar = const [],
  });

  final String id;
  final List<SenaryoMesaji> karsi;
  final List<SenaryoCevabi> cevaplar;

  bool get son => cevaplar.isEmpty;
}

class Senaryo {
  const Senaryo({
    required this.id,
    required this.kursOnek,
    required this.dil,
    required this.baslik,
    required this.aciklama,
    required this.dugumler,
    this.baslangic = 'basla',
  });

  /// Ör. 'senaryo-en-kafe'.
  final String id;

  /// Hangi kurs ailesine ait: kurs kimliğinin öneki ('ingilizce', 'almanca',
  /// 'korece'). Senaryo, kullanıcının o dilde kursu varsa listelenir.
  final String kursOnek;

  /// Okuma ve konuşma tanıma dili (BCP-47).
  final String dil;
  final String baslik;
  final String aciklama;
  final List<SenaryoDugumu> dugumler;
  final String baslangic;

  SenaryoDugumu? dugum(String id) {
    for (final d in dugumler) {
      if (d.id == id) return d;
    }
    return null;
  }

  /// Başlangıçtan sonlara kadar olası en uzun adım sayısı (en çok cevap
  /// sayısı; dönüşlere karşı korumalı).
  int get enUzunYol {
    int git(String id, Set<String> yol) {
      final d = dugum(id);
      if (d == null || d.son || yol.contains(id)) return 0;
      var en = 0;
      for (final c in d.cevaplar) {
        if (!c.uygun || c.sonraki == null) continue;
        final k = git(c.sonraki!, {...yol, id});
        if (k > en) en = k;
      }
      return en + 1;
    }

    return git(baslangic, {});
  }
}
