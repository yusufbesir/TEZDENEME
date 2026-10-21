/// Çok dosyalı kod projesi / oyun alanı (ÖZELLİK 70). Öğrenci durumunda
/// `kodProjeleri` alanında saklanır; eski kayıtta alan yoksa boş liste.
/// Boyut sınırlıdır (durum dosyası 2 MB sınırının çok altında kalsın):
/// en çok [enCokProje] proje, projede en çok [enCokDosya] dosya, dosyada en
/// çok [dosyaEnCokKarakter] karakter, tüm projelerde toplam
/// [toplamEnCokKarakter] karakter. Bozuk girdiler okunurken atlanır.
library;

/// Bir proje dosyası (ad + içerik).
typedef ProjeDosyasi = ({String ad, String icerik});

class KodProjesi {
  const KodProjesi({
    required this.id,
    required this.ad,
    required this.dosyalar,
    this.gun,
  });

  static const int enCokProje = 12;
  static const int enCokDosya = 6;
  static const int dosyaEnCokKarakter = 20000;
  static const int toplamEnCokKarakter = 200000;
  static const int adEnCok = 40;

  /// Şablondan açılan projenin kimlik öneki (`sablon-` + şablon kimliği).
  static const String sablonOnek = 'sablon-';

  /// Serbest oyun alanının kimlik öneki (`oyun-1`, `oyun-2`, ...).
  static const String oyunOnek = 'oyun-';

  static final _idDeseni = RegExp(r'^(sablon|oyun)-[a-z0-9-]{1,40}$');
  static final _dosyaDeseni = RegExp(
    r'^[a-z0-9][a-z0-9_-]{0,23}\.(html|css|js)$',
  );

  final String id;
  final String ad;
  final List<ProjeDosyasi> dosyalar;

  /// Son kayıt günü 'YYYY-MM-DD'; null: bilinmiyor.
  final String? gun;

  static bool idGecerli(String s) => _idDeseni.hasMatch(s);

  /// Dosya adı: küçük harf/rakam, en çok 24 karakter + .html/.css/.js.
  static bool dosyaAdiGecerli(String s) => _dosyaDeseni.hasMatch(s);

  /// Şablon kimliği (şablondan açıldıysa), yoksa null.
  String? get sablonId =>
      id.startsWith(sablonOnek) ? id.substring(sablonOnek.length) : null;

  /// Toplam karakter.
  int get boyut => dosyalar.fold<int>(0, (t, f) => t + f.icerik.length);

  /// Uzantısı [uzanti] olan dosyalar (ör. 'css').
  List<ProjeDosyasi> uzantili(String uzanti) => [
    for (final f in dosyalar)
      if (f.ad.endsWith('.$uzanti')) f,
  ];

  /// Adı [ad] olan dosyanın içeriği; yoksa null.
  String? icerik(String ad) {
    for (final f in dosyalar) {
      if (f.ad == ad) return f.icerik;
    }
    return null;
  }

  KodProjesi copyWith({
    String? ad,
    List<ProjeDosyasi>? dosyalar,
    String? gun,
  }) => KodProjesi(
    id: id,
    ad: ad ?? this.ad,
    dosyalar: dosyalar ?? this.dosyalar,
    gun: gun ?? this.gun,
  );

  /// Sınır denetimi; geçersizse Türkçe neden, geçerliyse null.
  String? denetle() {
    if (!idGecerli(id)) return 'Geçersiz proje kimliği';
    final a = ad.trim();
    if (a.isEmpty || a.length > adEnCok) {
      return 'Proje adı 1-$adEnCok karakter olmalı';
    }
    if (dosyalar.isEmpty) return 'Projede en az bir dosya olmalı';
    if (dosyalar.length > enCokDosya) {
      return 'En çok $enCokDosya dosya olabilir';
    }
    final adlar = <String>{};
    for (final f in dosyalar) {
      if (!dosyaAdiGecerli(f.ad)) {
        return 'Geçersiz dosya adı: ${f.ad} (ör. index.html, style.css, app.js)';
      }
      if (!adlar.add(f.ad)) return 'Aynı adlı iki dosya var: ${f.ad}';
      if (f.icerik.length > dosyaEnCokKarakter) {
        return '${f.ad} çok uzun (en çok $dosyaEnCokKarakter karakter)';
      }
    }
    return null;
  }

  Map<String, Object?> toJson() => {
    'id': id,
    'ad': ad,
    if (gun != null) 'gun': gun,
    'dosyalar': [
      for (final f in dosyalar) {'ad': f.ad, 'icerik': f.icerik},
    ],
  };

  /// Bozuk girdide null; geçersiz dosyalar atlanır (en az bir dosya kalmalı).
  static KodProjesi? fromJson(Object? j) {
    if (j is! Map) return null;
    final id = j['id'];
    final ad = j['ad'];
    if (id is! String || !idGecerli(id)) return null;
    if (ad is! String || ad.trim().isEmpty) return null;
    final dosyalar = <ProjeDosyasi>[];
    final adlar = <String>{};
    final ham = j['dosyalar'];
    if (ham is List) {
      for (final e in ham) {
        if (dosyalar.length >= enCokDosya) break;
        if (e is! Map) continue;
        final fa = e['ad'];
        final fi = e['icerik'];
        if (fa is! String || fi is! String) continue;
        if (!dosyaAdiGecerli(fa) || fi.length > dosyaEnCokKarakter) continue;
        if (!adlar.add(fa)) continue;
        dosyalar.add((ad: fa, icerik: fi));
      }
    }
    if (dosyalar.isEmpty) return null;
    final gun = j['gun'];
    final kisa = ad.trim();
    return KodProjesi(
      id: id,
      ad: kisa.length > adEnCok ? kisa.substring(0, adEnCok) : kisa,
      dosyalar: List.unmodifiable(dosyalar),
      gun: gun is String && gun.length == 10 ? gun : null,
    );
  }

  /// Durum JSON'undaki liste: tekrar eden kimlikler, sayı ve toplam boyut
  /// sınırını aşan projeler atlanır.
  static List<KodProjesi> listeCoz(Object? ham) {
    final sonuc = <KodProjesi>[];
    final idler = <String>{};
    var toplam = 0;
    if (ham is List) {
      for (final e in ham) {
        if (sonuc.length >= enCokProje) break;
        final p = fromJson(e);
        if (p == null || !idler.add(p.id)) continue;
        if (toplam + p.boyut > toplamEnCokKarakter) continue;
        toplam += p.boyut;
        sonuc.add(p);
      }
    }
    return List.unmodifiable(sonuc);
  }
}
