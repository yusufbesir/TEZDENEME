/// Kodda etkileşimli ders örnekleri (ÖZELLİK 68, 69): mevcut kod kurslarının
/// sonuna eklenen "Etkileşimli pratik" üniteleri. Her derste çoklu boşluk,
/// satır seçme, anahtar sözcük yazma ve çıktı yazma; JavaScript'te ayrıca
/// çalıştırılabilir alıştırma. Python kodu ÇALIŞTIRILMAZ (yalnız çıktı
/// tahmini). JS çıktıları gerçek QuickJS motoruyla, Python çıktıları
/// python3 ile doğrulandı (bkz. test/kod_etkilesim_test.dart).
library;

import '../model/icerik.dart';

/// JavaScript'e Giriş: 4. ünite.
const Unite jsEtkilesimliUnite = Unite(
  id: 'js-1-u4',
  ad: 'Etkileşimli pratik',
  dersler: [
    Ders(
      id: 'js-1-u4-d1',
      ad: 'Kodu çalıştır ve dene',
      dilbilgisiNotu:
          'Bu derste kodu kendin yazıp cihazda çalıştırırsın. console.log '
          'her çağrıda bir satır yazar; çıktın beklenen çıktıyla satır satır '
          'karşılaştırılır. Kod çevrimdışı çalışır; ağ ve dosya erişimi yoktur.',
      alistirmalar: [
        KodParcaSec(
          soru: 'Döngünün her turda çalıştırdığı satıra dokun.',
          kod:
              'let toplam = 0;\n'
              'for (let i = 1; i <= 3; i++) {\n'
              '  toplam += i;\n'
              '}\n'
              'console.log(toplam);',
          dogru: [2],
          aciklama:
              'Süslü parantezlerin içindeki satır her turda bir kez çalışır; '
              'console.log döngü bittikten sonra bir kez çalışır.',
        ),
        KodBoslukDoldur(
          soru: 'Dizinin değerlerini sırayla gezen kodu tamamla.',
          kod:
              '___ sayilar = [3, 5, 8];\n'
              'for (const s ___ sayilar) {\n'
              '  console.log(s * 2);\n'
              '}',
          dogru: ['const', 'of'],
          secenekler: ['const', 'of', 'in', 'function'],
          aciklama:
              'for...of dizinin değerlerini verir; for...in ise indeksleri '
              '(anahtarları) gezer.',
        ),
        KodYaz(
          soru: 'Koşul sağlanmadığında çalışacak bloğun anahtar sözcüğünü yaz.',
          kod:
              'if (yas >= 18) {\n'
              '  console.log("yetişkin");\n'
              '} ___ {\n'
              '  console.log("çocuk");\n'
              '}',
          cevaplar: ['else'],
          aciklama: 'else, if koşulu yanlış olduğunda çalışan bloktur.',
        ),
        KodCikti(
          soru: 'Bu kod konsola ne yazar?',
          kod:
              'let x = 5;\n'
              'x = x * 2;\n'
              'console.log(x + 1);',
          beklenenCikti: '11',
          aciklama: 'x önce 5, sonra 10 olur; 10 + 1 = 11 yazılır.',
        ),
        KodCalistir(
          soru:
              '1\'den 5\'e kadar sayıları alt alta yazdıran bir for döngüsü yaz.',
          baslangic: '// 1\'den 5\'e kadar yazdır\n',
          cozum:
              'for (let i = 1; i <= 5; i++) {\n'
              '  console.log(i);\n'
              '}',
          beklenenCikti: '1\n2\n3\n4\n5',
          gerekenler: ['for'],
          aciklama:
              'Sayaç 1\'den başlar, i <= 5 olduğu sürece döner ve her turda '
              'console.log(i) bir satır yazar.',
        ),
        KodCalistir(
          soru:
              'selamla fonksiyonu adı alıp "Merhaba, Ada!" biçiminde bir '
              'metin döndürsün.',
          baslangic:
              'function selamla(ad) {\n'
              '  // buraya yaz\n'
              '}\n'
              'console.log(selamla("Ada"));',
          cozum:
              'function selamla(ad) {\n'
              '  return "Merhaba, " + ad + "!";\n'
              '}\n'
              'console.log(selamla("Ada"));',
          beklenenCikti: 'Merhaba, Ada!',
          gerekenler: ['return'],
          aciklama:
              'Fonksiyon değeri return ile döndürür; return yoksa sonuç '
              'undefined olur.',
        ),
        Kod(
          soru: 'Dizinin eleman sayısını veren özelliği seç.',
          kod: 'const dizi = [1, 2, 3];\nconsole.log(dizi.___);',
          secenekler: ['length', 'size', 'count'],
          dogru: 0,
          dil: 'js',
          aciklama: 'Dizilerde eleman sayısı length özelliğindedir.',
        ),
        Secim(
          soru: 'console.log ne işe yarar?',
          secenekler: [
            'Konsola çıktı yazar',
            'Sayfayı yeniden yükler',
            'Yeni bir değişken tanımlar',
          ],
          dogru: 0,
          aciklama:
              'console.log verilen değerleri konsola yazar; hata ayıklamada '
              'sık kullanılır.',
        ),
        KodCikti(
          soru: 'Bu kodun çıktısını satır satır yaz.',
          kod:
              'const ad = "Ada";\n'
              'console.log(ad.length);\n'
              'console.log(ad.toUpperCase());',
          beklenenCikti: '3\nADA',
          aciklama:
              'length karakter sayısını (3), toUpperCase() büyük harfli '
              'kopyayı verir.',
        ),
        KodCalistir(
          soru: 'Dizideki sayıların toplamını bir döngüyle hesaplayıp yazdır.',
          baslangic:
              'const sayilar = [4, 7, 9];\n'
              'let toplam = 0;\n'
              '// döngüyle topla\n'
              'console.log(toplam);',
          cozum:
              'const sayilar = [4, 7, 9];\n'
              'let toplam = 0;\n'
              'for (const s of sayilar) {\n'
              '  toplam += s;\n'
              '}\n'
              'console.log(toplam);',
          beklenenCikti: '20',
          gerekenler: ['for'],
          aciklama: '4 + 7 + 9 = 20. Her turda toplam += s ile eklenir.',
        ),
      ],
    ),
  ],
);

/// Python'a Giriş: 5. ünite (çalıştırma yok; çıktı tahmini).
const Unite pythonEtkilesimliUnite = Unite(
  id: 'python-1-u5',
  ad: 'Etkileşimli pratik',
  dersler: [
    Ders(
      id: 'python-1-u5-d1',
      ad: 'Çıktıyı tahmin et',
      dilbilgisiNotu:
          'Bu derste Python kodu çalıştırılmaz: kodu satır satır izleyip '
          'çıktısını yazarsın. print her çağrıda bir satır yazar.',
      alistirmalar: [
        KodCikti(
          soru: 'Bu kod ne yazar?',
          kod:
              'x = 7\n'
              'y = 2\n'
              'print(x // y)\n'
              'print(x % y)',
          beklenenCikti: '3\n1',
          dil: 'python',
          aciklama: '// tam sayı bölmesidir (7 // 2 = 3), % kalanı verir (1).',
        ),
        KodCikti(
          soru: 'Döngünün çıktısını satır satır yaz.',
          kod:
              'for i in range(3):\n'
              '    print(i)',
          beklenenCikti: '0\n1\n2',
          dil: 'python',
          aciklama: 'range(3) 0, 1 ve 2 değerlerini verir; 3 dahil değildir.',
        ),
        KodCikti(
          soru: 'f-string ile yazılan satırı yaz.',
          kod:
              'ad = "Ada"\n'
              'print(f"Merhaba {ad}")',
          beklenenCikti: 'Merhaba Ada',
          dil: 'python',
          aciklama: 'f-string içindeki {ad}, değişkenin değeriyle değişir.',
        ),
        KodCikti(
          soru: 'Listenin yeni uzunluğu kaç olur?',
          kod:
              'liste = [1, 2, 3]\n'
              'liste.append(4)\n'
              'print(len(liste))',
          beklenenCikti: '4',
          dil: 'python',
          aciklama: 'append listenin sonuna bir öğe ekler; uzunluk 4 olur.',
        ),
        KodYaz(
          soru:
              '0\'dan 4\'e kadar sayıları yazan döngünün anahtar sözcüğünü yaz.',
          kod:
              '___ sayi in range(5):\n'
              '    print(sayi)',
          cevaplar: ['for'],
          dil: 'python',
          aciklama:
              'Python\'da bir dizi üzerinde dönmek için for ... in kullanılır.',
        ),
        KodYaz(
          soru: 'Fonksiyonun sonucu geri vermesi için boşluğa geleni yaz.',
          kod:
              'def kare(n):\n'
              '    ___ n * n',
          cevaplar: ['return'],
          dil: 'python',
          aciklama: 'return, fonksiyonun değerini çağırana döndürür.',
        ),
        KodBoslukDoldur(
          soru: 'Koşul yapısını tamamla.',
          kod:
              'yas = 20\n'
              '___ yas >= 18:\n'
              '    print("yetişkin")\n'
              '___:\n'
              '    print("çocuk")',
          dogru: ['if', 'else'],
          secenekler: ['if', 'else', 'elif', 'then'],
          dil: 'python',
          aciklama:
              'if koşulu sınar; else koşul yoksa çalışır. elif bir koşul '
              'ister, then Python\'da yoktur.',
        ),
        KodParcaSec(
          soru: 'Ekrana çıktı veren satıra dokun.',
          kod:
              'toplam = 0\n'
              'for n in [2, 4, 6]:\n'
              '    toplam += n\n'
              'print(toplam)',
          dogru: [3],
          dil: 'python',
          aciklama: 'Yalnız print ekrana yazar; diğer satırlar hesaplar.',
        ),
        Kod(
          soru: 'Metni tam sayıya çeviren fonksiyonu seç.',
          kod: 'print(___("42") + 1)',
          secenekler: ['int', 'str', 'len'],
          dogru: 0,
          dil: 'python',
          aciklama: 'int("42") 42 sayısını verir; 42 + 1 = 43 yazılır.',
        ),
        KodCikti(
          soru: 'Bu kod ne yazar?',
          kod: 'print("a" * 3)',
          beklenenCikti: 'aaa',
          dil: 'python',
          aciklama: 'Bir metni tam sayıyla çarpmak onu o kadar kez tekrarlar.',
        ),
      ],
    ),
  ],
);

/// HTML'e Giriş: 4. ünite.
const Unite htmlEtkilesimliUnite = Unite(
  id: 'html-1-u4',
  ad: 'Etkileşimli pratik',
  dersler: [
    Ders(
      id: 'html-1-u4-d1',
      ad: 'Etiketleri yerleştir',
      alistirmalar: [
        KodBoslukDoldur(
          soru: 'Bağlantı ve görsel için doğru nitelikleri yerleştir.',
          kod:
              '<a ___="https://example.com">Site</a>\n'
              '<img ___="kedi.jpg" alt="Kedi">',
          dogru: ['href', 'src'],
          secenekler: ['href', 'src', 'link', 'alt'],
          dil: 'html',
          aciklama:
              'Bağlantının adresi href, görselin dosyası src niteliğindedir.',
        ),
        KodParcaSec(
          soru: 'Tarayıcı sekmesinde görünen başlığı belirleyen satıra dokun.',
          kod:
              '<!DOCTYPE html>\n'
              '<html lang="tr">\n'
              '<head>\n'
              '  <title>Sayfam</title>\n'
              '</head>\n'
              '<body>\n'
              '  <h1>Merhaba</h1>\n'
              '</body>\n'
              '</html>',
          dogru: [3],
          dil: 'html',
          aciklama:
              'head içindeki title sekme başlığıdır; h1 ise sayfadaki görünür '
              'ana başlıktır.',
        ),
        KodYaz(
          soru: 'Paragraf etiketinin adını yaz.',
          kod: '<___>Bu bir paragraftır.</p>',
          cevaplar: ['p'],
          dil: 'html',
          aciklama: 'Paragraf <p> ile açılır, </p> ile kapanır.',
        ),
        KodYaz(
          soru: 'Numaralı listeyi kapatan etiketin adını yaz.',
          kod:
              '<ol>\n'
              '  <li>Bir</li>\n'
              '</___>',
          cevaplar: ['ol'],
          dil: 'html',
          aciklama: 'Açılan etiket aynı adla kapanır: <ol> ... </ol>.',
        ),
        KodParcaSec(
          soru: 'Kullanıcının yazı yazabildiği alanın satırına dokun.',
          kod:
              '<form>\n'
              '  <label for="ad">Ad</label>\n'
              '  <input id="ad" type="text">\n'
              '  <button type="submit">Gönder</button>\n'
              '</form>',
          dogru: [2],
          dil: 'html',
          aciklama:
              'type="text" olan input tek satırlık yazı alanıdır; label onun '
              'adını, button ise gönderme düğmesini verir.',
        ),
        KodBoslukDoldur(
          soru: 'Tablonun başlık satırını tamamla.',
          kod:
              '<table>\n'
              '  <___>\n'
              '    <___>Ad</th>\n'
              '  </tr>\n'
              '</table>',
          dogru: ['tr', 'th'],
          secenekler: ['tr', 'th', 'td', 'tbody'],
          dil: 'html',
          aciklama:
              'tr bir satırdır; th başlık hücresidir ve </th> ile kapanır.',
        ),
        Kod(
          soru: 'Ekran okuyucunun okuyacağı alternatif metni ekle.',
          kod: '<img src="logo.png" ___="Şirket logosu">',
          secenekler: ['alt', 'name', 'href'],
          dogru: 0,
          dil: 'html',
          aciklama:
              'alt, görsel yüklenemediğinde ve ekran okuyucularda kullanılan '
              'alternatif metindir.',
        ),
        Secim(
          soru: 'Hangi etiket sayfadaki en önemli başlıktır?',
          secenekler: ['<h1>', '<h6>', '<head>'],
          dogru: 0,
          aciklama:
              'h1 en üst düzey başlıktır; head ise görünür başlık değil, '
              'sayfa bilgilerinin bölümüdür.',
        ),
        KodYaz(
          soru: 'Satır sonu ekleyen boş (kapanmayan) etiketin adını yaz.',
          kod: 'Birinci satır<___>İkinci satır',
          cevaplar: ['br'],
          dil: 'html',
          aciklama: '<br> satır sonu ekler ve kapanış etiketi yoktur.',
        ),
      ],
    ),
  ],
);
