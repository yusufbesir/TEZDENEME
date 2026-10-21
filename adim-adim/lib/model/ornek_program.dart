// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Örnek programlar kütüphanesi modeli: kod alanındaki dillerde (HTML, CSS,
/// JavaScript) konudan bağımsız, kısa ve açıklamalı örnekler. Kod gerçekten
/// çalıştırılmaz; yalnız okunur ve kopyalanır.
library;

enum OrnekDili {
  html('HTML'),
  css('CSS'),
  js('JavaScript');

  const OrnekDili(this.etiket);

  /// Arayüzde gösterilen ad.
  final String etiket;
}

enum OrnekZorlugu {
  kolay('Kolay'),
  orta('Orta');

  const OrnekZorlugu(this.etiket);

  /// Arayüzde gösterilen Türkçe ad.
  final String etiket;
}

/// Bir satır grubu: bir ya da birkaç satır kod ve "ne yapar" notu.
typedef SatirGrubu = ({String kod, String not});

class OrnekProgram {
  const OrnekProgram({
    required this.id,
    required this.dil,
    required this.zorluk,
    required this.baslik,
    required this.aciklama,
    required this.gruplar,
  });

  /// Ör. 'html-ornek-1'.
  final String id;
  final OrnekDili dil;
  final OrnekZorlugu zorluk;
  final String baslik;

  /// Bir iki cümlelik özet.
  final String aciklama;

  /// Kodun sırayla satır grupları; her birinin notu vardır.
  final List<SatirGrubu> gruplar;

  /// Kopyalanacak tam kod (grupların satırları art arda).
  String get kod => gruplar.map((g) => g.kod).join('\n');
}
