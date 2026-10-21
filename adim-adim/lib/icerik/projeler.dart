/// Bölüm sonu proje şablonları (ÖZELLİK 70). Her şablon bir kod kursunun
/// ünitesinin sonunda önerilir; başlangıç dosyaları ve basit, metin tabanlı
/// hedefler (düzenli ifadeyle aranır) içerir. Hedefler sözdizimini ya da
/// görünümü doğrulamaz; yalnız istenen öğenin kodda bulunduğuna bakar.
library;

import '../model/icerik.dart';
import '../model/kod_projesi.dart';

/// Bir proje hedefi: [dosya] içeriğinde [desen] (büyük/küçük harf duyarsız)
/// bulunmalı.
class ProjeHedefi {
  const ProjeHedefi({
    required this.aciklama,
    required this.dosya,
    required this.desen,
  });
  final String aciklama;
  final String dosya;
  final String desen;

  bool saglandi(KodProjesi p) {
    final icerik = p.icerik(dosya);
    if (icerik == null) return false;
    return RegExp(desen, caseSensitive: false).hasMatch(icerik);
  }
}

class ProjeSablonu {
  const ProjeSablonu({
    required this.id,
    required this.kursId,
    required this.uniteId,
    required this.ad,
    required this.aciklama,
    required this.dosyalar,
    required this.hedefler,
  });
  final String id;
  final String kursId;

  /// Projenin önerildiği (sonunda açıldığı) ünite.
  final String uniteId;
  final String ad;
  final String aciklama;
  final List<ProjeDosyasi> dosyalar;
  final List<ProjeHedefi> hedefler;

  String get projeId => '${KodProjesi.sablonOnek}$id';

  KodProjesi yeniProje() =>
      KodProjesi(id: projeId, ad: ad, dosyalar: List.unmodifiable(dosyalar));
}

const List<ProjeSablonu> projeSablonlari = [
  ProjeSablonu(
    id: 'kartvizit',
    kursId: 'html-1',
    uniteId: 'html-1-u3',
    ad: 'Kişisel kartvizit sayfası',
    aciklama:
        'Kendini tanıtan tek sayfalık bir kartvizit yap: başlık, kısa bir '
        'paragraf, bir bağlantı ve alt metinli bir görsel. style.css ile '
        'yazı tipini belirle.',
    dosyalar: [
      (
        ad: 'index.html',
        icerik:
            '<!DOCTYPE html>\n'
            '<html lang="tr">\n'
            '<head>\n'
            '  <meta charset="utf-8">\n'
            '  <title>Kartvizitim</title>\n'
            '  <link rel="stylesheet" href="style.css">\n'
            '</head>\n'
            '<body>\n'
            '  <!-- Buraya başlık, paragraf, bağlantı ve görsel ekle -->\n'
            '</body>\n'
            '</html>\n',
      ),
      (ad: 'style.css', icerik: 'body {\n  margin: 24px;\n}\n'),
    ],
    hedefler: [
      ProjeHedefi(
        aciklama: 'Bir h1 ana başlık ekle',
        dosya: 'index.html',
        desen: r'<h1[\s>]',
      ),
      ProjeHedefi(
        aciklama: 'Kendini anlatan bir paragraf (p) yaz',
        dosya: 'index.html',
        desen: r'<p[\s>]',
      ),
      ProjeHedefi(
        aciklama: 'href nitelikli bir bağlantı (a) ekle',
        dosya: 'index.html',
        desen: r'<a\s[^>]*href\s*=',
      ),
      ProjeHedefi(
        aciklama: 'alt metinli bir görsel (img) ekle',
        dosya: 'index.html',
        desen: r'<img\s[^>]*alt\s*=',
      ),
      ProjeHedefi(
        aciklama: 'style.css içinde font-family ile yazı tipini belirle',
        dosya: 'style.css',
        desen: r'font-family\s*:',
      ),
    ],
  ),
  ProjeSablonu(
    id: 'urun-kartlari',
    kursId: 'css-1',
    uniteId: 'css-1-u3',
    ad: 'Duyarlı ürün kartları',
    aciklama:
        'Üç ürün kartını grid ile diz, aralarına boşluk koy, köşeleri '
        'yuvarla ve dar ekranda tek sütuna düşmesi için bir medya sorgusu '
        'yaz.',
    dosyalar: [
      (
        ad: 'index.html',
        icerik:
            '<!DOCTYPE html>\n'
            '<html lang="tr">\n'
            '<head>\n'
            '  <meta charset="utf-8">\n'
            '  <meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '  <title>Ürünler</title>\n'
            '  <link rel="stylesheet" href="style.css">\n'
            '</head>\n'
            '<body>\n'
            '  <h1>Ürünler</h1>\n'
            '  <div class="kartlar">\n'
            '    <div class="kart"><h2>Defter</h2><p>40 TL</p></div>\n'
            '    <div class="kart"><h2>Kalem</h2><p>15 TL</p></div>\n'
            '    <div class="kart"><h2>Silgi</h2><p>10 TL</p></div>\n'
            '  </div>\n'
            '</body>\n'
            '</html>\n',
      ),
      (
        ad: 'style.css',
        icerik:
            '.kartlar {\n'
            '  /* kartları grid ile diz */\n'
            '}\n'
            '\n'
            '.kart {\n'
            '  border: 1px solid #ccc;\n'
            '}\n',
      ),
    ],
    hedefler: [
      ProjeHedefi(
        aciklama: 'Kart kapsayıcısını display: grid ile diz',
        dosya: 'style.css',
        desen: r'display\s*:\s*grid',
      ),
      ProjeHedefi(
        aciklama: 'Kartların arasına gap ile boşluk koy',
        dosya: 'style.css',
        desen: r'gap\s*:',
      ),
      ProjeHedefi(
        aciklama: 'Kartların köşelerini border-radius ile yuvarla',
        dosya: 'style.css',
        desen: r'border-radius\s*:',
      ),
      ProjeHedefi(
        aciklama: 'Kartlara iç boşluk (padding) ver',
        dosya: 'style.css',
        desen: r'padding\s*:',
      ),
      ProjeHedefi(
        aciklama: 'Dar ekran için bir @media sorgusu yaz',
        dosya: 'style.css',
        desen: r'@media',
      ),
    ],
  ),
  ProjeSablonu(
    id: 'sayac',
    kursId: 'js-1',
    uniteId: 'js-1-u3',
    ad: 'Tıklama sayacı',
    aciklama:
        'Düğmeye her tıklandığında sayıyı bir artıran bir sayaç yap: düğmeyi '
        've sayının yazdığı öğeyi seç, tıklama olayını dinle, sayacı artır ve '
        'textContent ile ekrana yaz.',
    dosyalar: [
      (
        ad: 'index.html',
        icerik:
            '<!DOCTYPE html>\n'
            '<html lang="tr">\n'
            '<head>\n'
            '  <meta charset="utf-8">\n'
            '  <title>Sayaç</title>\n'
            '</head>\n'
            '<body>\n'
            '  <h1>Sayaç</h1>\n'
            '  <p>Tıklama: <span id="sayi">0</span></p>\n'
            '  <button id="arttir">Artır</button>\n'
            '  <script src="script.js"></script>\n'
            '</body>\n'
            '</html>\n',
      ),
      (
        ad: 'script.js',
        icerik:
            'let sayac = 0;\n'
            '// 1. Düğmeyi ve #sayi öğesini seç\n'
            '// 2. Tıklamada sayacı artır ve ekrana yaz\n',
      ),
    ],
    hedefler: [
      ProjeHedefi(
        aciklama: 'Öğeyi querySelector ya da getElementById ile seç',
        dosya: 'script.js',
        desen: r'(querySelector|getElementById)\s*\(',
      ),
      ProjeHedefi(
        aciklama: 'Tıklama olayını addEventListener("click", ...) ile dinle',
        dosya: 'script.js',
        desen: r'''addEventListener\s*\(\s*["']click["']''',
      ),
      ProjeHedefi(
        aciklama: 'Sayacı bir artır (++ ya da += 1)',
        dosya: 'script.js',
        desen: r'\+\+|\+=\s*1\b',
      ),
      ProjeHedefi(
        aciklama: 'Yeni sayıyı textContent ile ekrana yaz',
        dosya: 'script.js',
        desen: r'textContent',
      ),
    ],
  ),
];

ProjeSablonu? projeSablonuBul(String id) {
  for (final s in projeSablonlari) {
    if (s.id == id) return s;
  }
  return null;
}

/// Ünitenin sonunda önerilen proje (yoksa null).
ProjeSablonu? uniteProjesi(String uniteId) {
  for (final s in projeSablonlari) {
    if (s.uniteId == uniteId) return s;
  }
  return null;
}

/// [dersId] bir ünitenin son dersiyse ve o ünitenin projesi varsa şablonu
/// (ders sonu özetindeki "Bölüm sonu projesi" düğmesi); yoksa null.
ProjeSablonu? dersSonuProjesi(List<Kurs> kurslar, String dersId) {
  for (final k in kurslar) {
    for (final u in k.uniteler) {
      if (u.dersler.isNotEmpty && u.dersler.last.id == dersId) {
        return uniteProjesi(u.id);
      }
    }
  }
  return null;
}
