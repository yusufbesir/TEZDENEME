/// Almanca A1: Başlangıç (CEFR A1, Goethe Start Deutsch 1 düzeyi). Dört ünite:
/// Selamlaşma, alfabe ve sayılar; Tanışma; Günlük hayat; Zaman ve yer.
/// Anlatım Türkçe, içerik Almancadır; her Almanca ifadenin Türkçe karşılığı
/// açıklamada verilir. Yaz alıştırmalarında ä ö ü ß yerine ae oe ue ss
/// yazımı da kabul edilir (Almanca klavye gerekmez).
///
/// Sesli okuma için Windows'ta de-DE ses paketi kurulu olmalıdır.
library;

import '../model/icerik.dart';

const String _de = 'de-DE';

const Kurs almancaA1 = Kurs(
  id: 'almanca-1',
  ad: 'Almanca A1: Başlangıç',
  aciklama:
      'Sıfırdan Almanca: selamlaşma, alfabe ve sayılar, tanışma, artikel ve günlük hayat, saat, fiiller ve yön tarifi.',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'almanca-1.u1',
      ad: 'Selamlaşma, alfabe ve sayılar',
      dersler: [
        Ders(
          id: 'almanca-1.u1.d1',
          ad: 'Selamlaşma',
          dilbilgisiNotu:
              'Guten Morgen (günaydın), Guten Tag (iyi günler), Guten Abend (iyi akşamlar), Gute Nacht (iyi geceler). Tschüss samimi, Auf Wiedersehen resmi vedadır.',
          alistirmalar: [
            Dinle(
              soru: 'Hangi selamlamayı duydun?',
              okunacak: 'Guten Morgen',
              secenekler: ['Guten Morgen', 'Guten Abend', 'Gute Nacht'],
              dogru: 0,
              dil: _de,
              aciklama: 'Guten Morgen = Günaydın.',
            ),
            Secim(
              soru: '"Guten Tag" ne anlama gelir?',
              secenekler: [
                'İyi günler (gündüz selamı)',
                'İyi geceler',
                'Hoşça kal',
              ],
              dogru: 0,
              aciklama: 'Guten Tag = İyi günler; gün içinde kullanılır.',
            ),
            Secim(
              soru: 'Akşam biriyle karşılaşınca ne dersin?',
              secenekler: ['Guten Morgen', 'Guten Abend', 'Gute Nacht'],
              dogru: 1,
              aciklama:
                  'Guten Abend = İyi akşamlar. Gute Nacht yatmadan önce söylenir (iyi geceler).',
            ),
            Bosluk(
              soru: '___ Wiedersehen!',
              secenekler: ['Auf', 'Gut', 'Guten'],
              dogru: 0,
              aciklama:
                  'Auf Wiedersehen = Hoşça kalın / Görüşmek üzere (resmi).',
            ),
            Bosluk(
              soru: '___ Nacht!',
              secenekler: ['Guten', 'Gute', 'Guter'],
              dogru: 1,
              aciklama:
                  'Gute Nacht = İyi geceler. Nacht dişil olduğu için "Gute" olur.',
            ),
            Yaz(
              soru: 'Almancaya çevir: Teşekkürler.',
              cevaplar: ['Danke', 'Danke schön', 'Danke schoen', 'Dankeschön'],
              aciklama: 'Danke = Teşekkürler; Danke schön = Çok teşekkürler.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Nasılsın?',
              kelimeler: ['es', 'dir?', 'Wie', 'geht'],
              dogru: ['Wie', 'geht', 'es', 'dir?'],
              aciklama: 'Wie geht es dir? = Nasılsın? (samimi).',
            ),
            Eslestir(
              soru: 'Almanca ifadeyi Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'Hallo', sag: 'Merhaba'),
                (sol: 'Tschüss', sag: 'Hoşça kal (samimi)'),
                (sol: 'Bitte', sag: 'Lütfen / Rica ederim'),
                (sol: 'Danke', sag: 'Teşekkürler'),
                (sol: 'Entschuldigung', sag: 'Affedersiniz'),
              ],
              aciklama:
                  'Hallo = merhaba, Tschüss = hoşça kal, Bitte = lütfen, Danke = teşekkürler, Entschuldigung = affedersiniz.',
            ),
            Isaretle(
              soru: 'Günün hangi vaktini bildiren sözcüğü işaretle.',
              cumle: 'Guten Abend, Herr Weber!',
              dogru: [1],
              aciklama:
                  'Abend = akşam. Cümle: İyi akşamlar, Bay Weber! (Herr = Bay)',
            ),
          ],
        ),
        Ders(
          id: 'almanca-1.u1.d2',
          ad: 'Alfabe ve telaffuz',
          dilbilgisiNotu:
              'ä ≈ açık "e", ö ve ü ön ünlülerdir, ß = keskin "ss". ei = "ay", eu = "oy", ie = uzun "i", sch = "ş", z = "ts", w = "v". i/e/ä/ö/ü sonrası ch yumuşak (ich-Laut), a/o/u/au sonrası gırtlaktan (ach-Laut).',
          alistirmalar: [
            Dinle(
              soru: 'Hangi sözcüğü duydun?',
              okunacak: 'schön',
              secenekler: ['schön', 'schon', 'Sohn'],
              dogru: 0,
              dil: _de,
              aciklama:
                  'schön = güzel (ö ünlüsü, dudaklar yuvarlak "e" gibi). schon = çoktan; Sohn = oğul.',
            ),
            Secim(
              soru: 'Almanca "ä" harfi Türkçedeki hangi sese yakındır?',
              secenekler: ['e', 'ı', 'ü'],
              dogru: 0,
              aciklama: 'ä açık bir "e" gibi okunur: Bär (ayı) ≈ "ber".',
            ),
            Secim(
              soru: '"ß" harfi hangi sesi verir?',
              secenekler: ['Türkçe ş', 'Keskin s (ss)', 'b'],
              dogru: 1,
              aciklama:
                  'ß keskin "ss" sesidir: Fuß (ayak), heißen (adı olmak).',
            ),
            Bosluk(
              soru: '"Zahl" (sayı) sözcüğündeki Z şöyle okunur: ___',
              secenekler: ['z', 's', 'ts'],
              dogru: 2,
              aciklama: 'Almancada Z "ts" okunur: Zahl = "tsâl". Zahl = sayı.',
            ),
            Bosluk(
              soru: '"ich" sözcüğündeki ch sesi: ___',
              secenekler: ['ich-Laut', 'ach-Laut', 'k'],
              dogru: 0,
              aciklama:
                  'i, e, ä, ö, ü sonrası ch hafif ve ince okunur (ich-Laut). ich = ben.',
            ),
            Yaz(
              soru: '"Fuß" (ayak) sözcüğünü ß yerine ss kullanarak yaz.',
              cevaplar: ['Fuss', 'Fuß'],
              aciklama: 'Fuß = ayak. ß klavyede yoksa "ss" yazılabilir: Fuss.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Ben Almanca konuşuyorum.',
              kelimeler: ['Deutsch.', 'Ich', 'spreche'],
              dogru: ['Ich', 'spreche', 'Deutsch.'],
              aciklama: 'Ich spreche Deutsch. = Ben Almanca konuşuyorum.',
            ),
            Eslestir(
              soru: 'Harf birleşimini okunuşuyla eşleştir.',
              ciftler: [
                (sol: 'ei', sag: 'ay (Ei = yumurta)'),
                (sol: 'eu', sag: 'oy (Euro = avro)'),
                (sol: 'ie', sag: 'uzun i (Liebe = aşk)'),
                (sol: 'sch', sag: 'ş (Schule = okul)'),
                (sol: 'w', sag: 'v (Wasser = su)'),
              ],
              aciklama:
                  'ei = ay, eu = oy, ie = uzun i, sch = ş, w = v olarak okunur.',
            ),
            Isaretle(
              soru: 'ach-Laut (gırtlaktan ch) ile okunan sözcüğü işaretle.',
              cumle: 'Ich lese das Buch.',
              dogru: [3],
              aciklama:
                  'Buch = kitap; u sonrası ch gırtlaktan okunur. Ich = ben ise ince ch ile okunur. Cümle: Kitabı okuyorum.',
            ),
          ],
        ),
        Ders(
          id: 'almanca-1.u1.d3',
          ad: 'Sayılar 0-100',
          dilbilgisiNotu:
              '13-19 arası: birler + zehn (dreizehn). 21 ve sonrası birler önce söylenir: einundzwanzig (bir-ve-yirmi). Onlar: zwanzig, dreißig, vierzig, fünfzig, sechzig, siebzig, achtzig, neunzig, hundert.',
          alistirmalar: [
            Dinle(
              soru: 'Hangi sayıyı duydun?',
              okunacak: 'fünfzehn',
              secenekler: ['fünfzehn', 'fünfzig', 'fünf'],
              dogru: 0,
              dil: _de,
              aciklama: 'fünfzehn = on beş. fünfzig = elli, fünf = beş.',
            ),
            Secim(
              soru: '"sieben" kaçtır?',
              secenekler: ['6', '7', '9'],
              dogru: 1,
              aciklama: 'sieben = yedi (7).',
            ),
            Secim(
              soru: '"dreizehn" kaçtır?',
              secenekler: ['30', '3', '13'],
              dogru: 2,
              aciklama: 'dreizehn = on üç (13). dreißig ise otuzdur (30).',
            ),
            Bosluk(
              soru: 'zwanzig + eins = ___',
              secenekler: ['einundzwanzig', 'zwanzigeins', 'einszwanzig'],
              dogru: 0,
              aciklama:
                  'Almancada birler önce gelir: einundzwanzig = yirmi bir (21).',
            ),
            Bosluk(
              soru: 'zehn, elf, ___, dreizehn',
              secenekler: ['zwanzig', 'zwölf', 'zwei'],
              dogru: 1,
              aciklama: 'zehn (10), elf (11), zwölf (12), dreizehn (13).',
            ),
            Yaz(
              soru: '16 sayısını Almanca yaz.',
              cevaplar: ['sechzehn'],
              aciklama:
                  'sechzehn = on altı. sechs sözcüğünün s\'si düşer: sech + zehn.',
            ),
            Tablo(
              soru: 'Onluk sayıları tamamla.',
              baslik: ['Sayı', 'Almanca'],
              satirlar: [
                ['20', 'zwanzig'],
                ['30', 'dreißig'],
                ['40', 'vierzig'],
                ['50', 'fünfzig'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 3, sutun: 1)],
              secenekler: ['dreißig', 'fünfzig', 'sechzig'],
              aciklama:
                  '30 = dreißig (ß ile), 50 = fünfzig. Diğerleri: zwanzig (20), vierzig (40).',
            ),
            Eslestir(
              soru: 'Sayıyı rakamıyla eşleştir.',
              ciftler: [
                (sol: 'null', sag: '0'),
                (sol: 'elf', sag: '11'),
                (sol: 'zwölf', sag: '12'),
                (sol: 'achtzig', sag: '80'),
                (sol: 'hundert', sag: '100'),
              ],
              aciklama:
                  'null = sıfır, elf = on bir, zwölf = on iki, achtzig = seksen, hundert = yüz.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Yirmi yaşındayım.',
              kelimeler: ['Jahre', 'zwanzig', 'Ich', 'alt.', 'bin'],
              dogru: ['Ich', 'bin', 'zwanzig', 'Jahre', 'alt.'],
              aciklama: 'Ich bin zwanzig Jahre alt. = Yirmi yaşındayım.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'almanca-1.u2',
      ad: 'Tanışma',
      dersler: [
        Ders(
          id: 'almanca-1.u2.d1',
          ad: 'Kişi zamirleri ve sein',
          dilbilgisiNotu:
              'sein (olmak): ich bin, du bist, er/sie/es ist, wir sind, ihr seid, sie/Sie sind. Meslek ve uyruk söylerken artikel kullanılmaz: Ich bin Lehrer.',
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Wir sind Studenten.',
              secenekler: [
                'Wir sind Studenten.',
                'Ihr seid Studenten.',
                'Sie ist Studentin.',
              ],
              dogru: 0,
              dil: _de,
              aciklama: 'Wir sind Studenten. = Biz öğrenciyiz (üniversite).',
            ),
            Secim(
              soru: '"du" ile hangi sein biçimi kullanılır?',
              secenekler: ['bist', 'ist', 'bin'],
              dogru: 0,
              aciklama: 'du bist = sen ...sın/sin. ich bin, er ist.',
            ),
            Secim(
              soru: 'Resmi "siz" (tek kişiye) için hangi zamir kullanılır?',
              secenekler: ['du', 'Sie (büyük harfle)', 'ihr'],
              dogru: 1,
              aciklama:
                  'Sie (hep büyük S) resmi "siz"dir. du = sen, ihr = siz (çoğul, samimi).',
            ),
            Bosluk(
              soru: 'Ich ___ Anna.',
              secenekler: ['bin', 'bist', 'ist'],
              dogru: 0,
              aciklama: 'Ich bin Anna. = Ben Anna\'yım.',
            ),
            Bosluk(
              soru: 'Er ___ Lehrer.',
              secenekler: ['sind', 'ist', 'seid'],
              dogru: 1,
              aciklama: 'Er ist Lehrer. = O (erkek) öğretmendir.',
            ),
            Yaz(
              soru: 'Almancaya çevir: Biz öğrenciyiz.',
              cevaplar: ['Wir sind Studenten', 'Wir sind Schüler'],
              aciklama:
                  'Wir sind Studenten (üniversite) / Schüler (okul). sein, wir ile "sind" olur.',
            ),
            Tablo(
              soru: 'sein fiilinin çekimini tamamla.',
              baslik: ['Zamir', 'sein'],
              satirlar: [
                ['ich', 'bin'],
                ['du', 'bist'],
                ['er/sie/es', 'ist'],
                ['wir', 'sind'],
                ['ihr', 'seid'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 4, sutun: 1)],
              secenekler: ['bist', 'seid', 'ist', 'bin'],
              aciklama:
                  'du bist, ihr seid. Diğerleri: ich bin, er ist, wir sind.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Siz buradasınız.',
              kelimeler: ['hier.', 'Ihr', 'seid'],
              dogru: ['Ihr', 'seid', 'hier.'],
              aciklama: 'Ihr seid hier. = Siz buradasınız.',
            ),
            Eslestir(
              soru: 'Zamiri Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'ich', sag: 'ben'),
                (sol: 'du', sag: 'sen'),
                (sol: 'wir', sag: 'biz'),
                (sol: 'ihr', sag: 'siz (çoğul, samimi)'),
                (sol: 'sie (çoğul)', sag: 'onlar'),
              ],
              aciklama:
                  'ich = ben, du = sen, wir = biz, ihr = siz, sie = onlar.',
            ),
            Isaretle(
              soru: 'Cümledeki sein fiilini işaretle.',
              cumle: 'Wir sind Freunde.',
              dogru: [1],
              aciklama:
                  'sind = sein fiilinin wir çekimi. Cümle: Biz arkadaşız.',
            ),
          ],
        ),
        Ders(
          id: 'almanca-1.u2.d2',
          ad: 'haben ve kendini tanıtma',
          dilbilgisiNotu:
              'haben (sahip olmak): ich habe, du hast, er/sie/es hat, wir haben, ihr habt, sie/Sie haben. Kalıplar: Ich heiße ... (adım ...), Ich komme aus ... (... ülkesindenim), Ich wohne in ... (... şehrinde oturuyorum).',
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Ich heiße Anna.',
              secenekler: [
                'Ich heiße Anna.',
                'Ich habe Anna.',
                'Ich bin Anna.',
              ],
              dogru: 0,
              dil: _de,
              aciklama: 'Ich heiße Anna. = Benim adım Anna.',
            ),
            Secim(
              soru: '"Ich komme aus der Türkei" ne demektir?',
              secenekler: [
                'Türkiye\'denim.',
                'Türkiye\'ye gidiyorum.',
                'Türkiye\'de oturuyorum.',
              ],
              dogru: 0,
              aciklama:
                  'Ich komme aus ... = ...\'denim / ...\'den geliyorum. die Türkei = Türkiye.',
            ),
            Secim(
              soru: '"Ich wohne in Berlin" ne demektir?',
              secenekler: [
                'Berlin\'den geliyorum.',
                'Berlin\'de oturuyorum.',
                'Berlin\'e gidiyorum.',
              ],
              dogru: 1,
              aciklama:
                  'wohnen = oturmak, ikamet etmek: Berlin\'de oturuyorum.',
            ),
            Bosluk(
              soru: 'Ich ___ Hunger.',
              secenekler: ['bin', 'habe', 'hat'],
              dogru: 1,
              aciklama: 'Ich habe Hunger. = Acıktım (Hunger haben).',
            ),
            Bosluk(
              soru: 'Du ___ Zeit.',
              secenekler: ['hast', 'hat', 'habt'],
              dogru: 0,
              aciklama: 'Du hast Zeit. = Vaktin var. du ile "hast" kullanılır.',
            ),
            Yaz(
              soru: 'Almancaya çevir: Benim adım Max. (heißen ile)',
              cevaplar: ['Ich heiße Max', 'Ich heisse Max'],
              aciklama: 'Ich heiße Max. = Benim adım Max.',
            ),
            Tablo(
              soru: 'haben fiilinin çekimini tamamla.',
              baslik: ['Zamir', 'haben'],
              satirlar: [
                ['ich', 'habe'],
                ['du', 'hast'],
                ['er/sie/es', 'hat'],
                ['wir', 'haben'],
                ['ihr', 'habt'],
              ],
              bos: [(satir: 2, sutun: 1), (satir: 4, sutun: 1)],
              secenekler: ['hat', 'habt', 'habe', 'hast'],
              aciklama:
                  'er/sie/es hat, ihr habt. Diğerleri: ich habe, du hast, wir haben.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: München\'de oturuyorum.',
              kelimeler: ['München.', 'in', 'wohne', 'Ich'],
              dogru: ['Ich', 'wohne', 'in', 'München.'],
              aciklama: 'Ich wohne in München. = München\'de oturuyorum.',
            ),
            Eslestir(
              soru: 'Fiili Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'heißen', sag: 'adı ... olmak'),
                (sol: 'kommen', sag: 'gelmek'),
                (sol: 'wohnen', sag: 'oturmak'),
                (sol: 'haben', sag: 'sahip olmak'),
                (sol: 'sein', sag: 'olmak'),
              ],
              aciklama:
                  'heißen = adı olmak, kommen = gelmek, wohnen = oturmak, haben = sahip olmak, sein = olmak.',
            ),
            Isaretle(
              soru: 'Cümledeki haben fiilini işaretle.',
              cumle: 'Du hast ein Buch.',
              dogru: [1],
              aciklama:
                  'hast = haben fiilinin du çekimi. Cümle: Bir kitabın var.',
            ),
          ],
        ),
        Ders(
          id: 'almanca-1.u2.d3',
          ad: 'Sorular, ülkeler ve meslekler',
          dilbilgisiNotu:
              'W-Fragen: Wie (nasıl), Wo (nerede), Woher (nereden), Was (ne), Wer (kim), Wie alt (kaç yaşında). Soru sözcüğü başta, fiil ikinci yerdedir: Woher kommst du?',
          alistirmalar: [
            Dinle(
              soru: 'Hangi soruyu duydun?',
              okunacak: 'Woher kommst du?',
              secenekler: [
                'Woher kommst du?',
                'Wo wohnst du?',
                'Wie heißt du?',
              ],
              dogru: 0,
              dil: _de,
              aciklama: 'Woher kommst du? = Nerelisin? / Nereden geliyorsun?',
            ),
            Secim(
              soru: '"Wo" soru sözcüğü neyi sorar?',
              secenekler: ['Nerede', 'Nereden', 'Kim'],
              dogru: 0,
              aciklama: 'Wo = nerede. Woher = nereden. Wer = kim.',
            ),
            Secim(
              soru: '"Woher" soru sözcüğü neyi sorar?',
              secenekler: ['Nerede', 'Nereden', 'Ne zaman'],
              dogru: 1,
              aciklama: 'Woher = nereden (köken, geldiği yer).',
            ),
            Secim(
              soru: '"die Ärztin" ne demektir?',
              secenekler: ['Erkek doktor', 'Hemşire', 'Kadın doktor'],
              dogru: 2,
              aciklama:
                  'die Ärztin = kadın doktor. Erkek doktor: der Arzt. Kadın meslek adları -in ile biter.',
            ),
            Bosluk(
              soru: '___ heißt du?',
              secenekler: ['Wie', 'Wo', 'Woher'],
              dogru: 0,
              aciklama: 'Wie heißt du? = Adın ne?',
            ),
            Bosluk(
              soru: '___ wohnst du? – In Wien.',
              secenekler: ['Wer', 'Wo', 'Wie'],
              dogru: 1,
              aciklama: 'Wo wohnst du? = Nerede oturuyorsun? – Viyana\'da.',
            ),
            Yaz(
              soru: 'Almancaya çevir: Ben öğretmenim. (erkek)',
              cevaplar: ['Ich bin Lehrer'],
              aciklama:
                  'Ich bin Lehrer. = Öğretmenim. Meslekten önce artikel kullanılmaz.',
            ),
            Eslestir(
              soru: 'Ülkeyi Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'die Türkei', sag: 'Türkiye'),
                (sol: 'Deutschland', sag: 'Almanya'),
                (sol: 'Österreich', sag: 'Avusturya'),
                (sol: 'die Schweiz', sag: 'İsviçre'),
                (sol: 'Frankreich', sag: 'Fransa'),
              ],
              aciklama:
                  'die Türkei = Türkiye, Deutschland = Almanya, Österreich = Avusturya, die Schweiz = İsviçre, Frankreich = Fransa.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Almanya\'dan geliyorum.',
              kelimeler: ['aus', 'Ich', 'Deutschland.', 'komme'],
              dogru: ['Ich', 'komme', 'aus', 'Deutschland.'],
              aciklama: 'Ich komme aus Deutschland. = Almanya\'dan geliyorum.',
            ),
            Isaretle(
              soru: 'Cümledeki soru sözcüğünü işaretle.',
              cumle: 'Woher kommst du?',
              dogru: [0],
              aciklama: 'Woher = nereden. Cümle: Nerelisin?',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'almanca-1.u3',
      ad: 'Günlük hayat',
      dersler: [
        Ders(
          id: 'almanca-1.u3.d1',
          ad: 'Artikel ve çoğul',
          dilbilgisiNotu:
              'Her ismin bir cinsi vardır: der (eril), die (dişil), das (nötr). Çoğulda hep "die" kullanılır. Artikeli ismi öğrenirken birlikte ezberle: der Tisch, die Lampe, das Buch.',
          alistirmalar: [
            Dinle(
              soru: 'Hangi ifadeyi duydun?',
              okunacak: 'die Frau',
              secenekler: ['die Frau', 'der Mann', 'das Kind'],
              dogru: 0,
              dil: _de,
              aciklama: 'die Frau = kadın. der Mann = adam, das Kind = çocuk.',
            ),
            Secim(
              soru: '"Tisch" (masa) için doğru artikel hangisidir?',
              secenekler: ['der', 'die', 'das'],
              dogru: 0,
              aciklama: 'der Tisch = masa (eril).',
            ),
            Secim(
              soru: '"Lampe" (lamba) için doğru artikel hangisidir?',
              secenekler: ['das', 'die', 'der'],
              dogru: 1,
              aciklama: 'die Lampe = lamba (dişil).',
            ),
            Secim(
              soru: '"Buch" (kitap) için doğru artikel hangisidir?',
              secenekler: ['die', 'der', 'das'],
              dogru: 2,
              aciklama: 'das Buch = kitap (nötr).',
            ),
            Bosluk(
              soru: '___ Kind spielt.',
              secenekler: ['Das', 'Der', 'Die'],
              dogru: 0,
              aciklama: 'Das Kind spielt. = Çocuk oynuyor. Kind nötrdür.',
            ),
            Bosluk(
              soru: 'ein Buch – zwei ___',
              secenekler: ['Buchs', 'Bücher', 'Buche'],
              dogru: 1,
              aciklama: 'Buch\'un çoğulu Bücher\'dir: die Bücher = kitaplar.',
            ),
            Yaz(
              soru: '"das Kind" ismini çoğul yaz.',
              cevaplar: ['die Kinder', 'Kinder'],
              aciklama: 'das Kind – die Kinder = çocuk – çocuklar.',
            ),
            Tablo(
              soru: 'Çoğul biçimlerini tamamla.',
              baslik: ['Tekil', 'Çoğul'],
              satirlar: [
                ['der Tisch', 'die Tische'],
                ['die Lampe', 'die Lampen'],
                ['das Buch', 'die Bücher'],
                ['das Kind', 'die Kinder'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: [
                'die Lampen',
                'die Bücher',
                'die Tische',
                'die Kinder',
              ],
              aciklama:
                  'Lampe – Lampen, Buch – Bücher (ü ile). Çoğulda artikel hep "die" olur.',
            ),
            Eslestir(
              soru: 'İsmi Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'der Mann', sag: 'adam'),
                (sol: 'die Frau', sag: 'kadın'),
                (sol: 'das Kind', sag: 'çocuk'),
                (sol: 'der Tisch', sag: 'masa'),
                (sol: 'das Buch', sag: 'kitap'),
              ],
              aciklama:
                  'der Mann = adam, die Frau = kadın, das Kind = çocuk, der Tisch = masa, das Buch = kitap.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Kitap yeni.',
              kelimeler: ['neu.', 'ist', 'Das', 'Buch'],
              dogru: ['Das', 'Buch', 'ist', 'neu.'],
              aciklama: 'Das Buch ist neu. = Kitap yeni.',
            ),
          ],
        ),
        Ders(
          id: 'almanca-1.u3.d2',
          ad: 'Akkusativ, ein/kein ve aile',
          dilbilgisiNotu:
              'Akkusativ (-i hâli): yalnız eril değişir: der – den, ein – einen, kein – keinen. Dişil ve nötr aynı kalır: eine Schwester, ein Kind. Değil/yok: kein (eril: keinen, dişil: keine).',
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Ich habe einen Bruder.',
              secenekler: [
                'Ich habe einen Bruder.',
                'Ich habe eine Schwester.',
                'Ich habe keinen Bruder.',
              ],
              dogru: 0,
              dil: _de,
              aciklama: 'Ich habe einen Bruder. = Bir erkek kardeşim var.',
            ),
            Secim(
              soru: 'Akkusativde hangi artikel değişir?',
              secenekler: ['Yalnız eril (der – den)', 'Yalnız dişil', 'Hepsi'],
              dogru: 0,
              aciklama:
                  'Akkusativde yalnız eril değişir: der Vater – den Vater.',
            ),
            Secim(
              soru: '"Mutter" (anne) için doğru artikel hangisidir?',
              secenekler: ['der', 'die', 'das'],
              dogru: 1,
              aciklama: 'die Mutter = anne. der Vater = baba.',
            ),
            Bosluk(
              soru: 'Ich habe ___ Schwester.',
              secenekler: ['eine', 'einen', 'ein'],
              dogru: 0,
              aciklama:
                  'Ich habe eine Schwester. = Bir kız kardeşim var. Dişilde "eine" kullanılır.',
            ),
            Bosluk(
              soru: 'Ich sehe ___ Vater.',
              secenekler: ['den', 'der', 'das'],
              dogru: 0,
              aciklama:
                  'Ich sehe den Vater. = Babayı görüyorum. Eril akkusativde der – den olur.',
            ),
            Bosluk(
              soru: 'Ich habe ___ Bruder. (Kardeşim yok.)',
              secenekler: ['kein', 'keinen', 'keine'],
              dogru: 1,
              aciklama:
                  'Ich habe keinen Bruder. = Erkek kardeşim yok. Eril akkusativde keinen olur.',
            ),
            Yaz(
              soru: 'Almancaya çevir: Bir kız kardeşim var.',
              cevaplar: ['Ich habe eine Schwester'],
              aciklama: 'Ich habe eine Schwester. = Bir kız kardeşim var.',
            ),
            Tablo(
              soru: 'Belirli artikelin hâllere göre değişimini tamamla.',
              baslik: ['Hâl', 'der (eril)', 'die (dişil)', 'das (nötr)'],
              satirlar: [
                ['Nominativ', 'der', 'die', 'das'],
                ['Akkusativ', 'den', 'die', 'das'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 1, sutun: 3)],
              secenekler: ['den', 'das', 'der', 'die'],
              aciklama:
                  'Akkusativde yalnız eril değişir: den. Nötr: das aynı kalır.',
            ),
            Eslestir(
              soru: 'Aile üyesini Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'der Vater', sag: 'baba'),
                (sol: 'die Mutter', sag: 'anne'),
                (sol: 'der Bruder', sag: 'erkek kardeş'),
                (sol: 'die Schwester', sag: 'kız kardeş'),
                (sol: 'die Eltern', sag: 'anne baba'),
              ],
              aciklama:
                  'der Vater = baba, die Mutter = anne, der Bruder = erkek kardeş, die Schwester = kız kardeş, die Eltern = anne baba.',
            ),
            Isaretle(
              soru: 'Akkusativ hâlinde değişen artikeli işaretle.',
              cumle: 'Ich habe einen Bruder.',
              dogru: [2],
              aciklama:
                  'Bruder eril olduğu için ein → einen olur. Cümle: Bir erkek kardeşim var.',
            ),
          ],
        ),
        Ders(
          id: 'almanca-1.u3.d3',
          ad: 'Yiyecek, içecek ve alışveriş',
          dilbilgisiNotu:
              'Alışveriş kalıpları: Was kostet das? (Bu kaç para?), Das macht drei Euro. (Tutarı üç avro.), Ich nehme ... (...i alıyorum). essen = yemek, trinken = içmek.',
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Ich trinke Wasser.',
              secenekler: [
                'Ich trinke Wasser.',
                'Ich esse Brot.',
                'Ich trinke Tee.',
              ],
              dogru: 0,
              dil: _de,
              aciklama: 'Ich trinke Wasser. = Su içiyorum.',
            ),
            Secim(
              soru: '"die Milch" ne demektir?',
              secenekler: ['Su', 'Süt', 'Ekmek'],
              dogru: 1,
              aciklama: 'die Milch = süt. das Wasser = su, das Brot = ekmek.',
            ),
            Secim(
              soru: '"Was kostet das?" ne demektir?',
              secenekler: ['Bu ne?', 'Bu kimin?', 'Bu kaç para?'],
              dogru: 2,
              aciklama: 'Was kostet das? = Bu kaç para? (kosten = mal olmak).',
            ),
            Secim(
              soru: '"der Käse" ne demektir?',
              secenekler: ['Peynir', 'Elma', 'Sosis'],
              dogru: 0,
              aciklama:
                  'der Käse = peynir. der Apfel = elma, die Wurst = sosis.',
            ),
            Bosluk(
              soru: 'Ich esse ___ Apfel.',
              secenekler: ['einen', 'ein', 'eine'],
              dogru: 0,
              aciklama:
                  'Ich esse einen Apfel. = Bir elma yiyorum. Apfel eril olduğu için akkusativde "einen".',
            ),
            Bosluk(
              soru: 'Ich nehme ___ Käse.',
              secenekler: ['den', 'der', 'die'],
              dogru: 0,
              aciklama:
                  'Ich nehme den Käse. = Peyniri alıyorum. Käse eril: der – den.',
            ),
            Yaz(
              soru: 'Almancaya çevir: Su içiyorum.',
              cevaplar: ['Ich trinke Wasser'],
              aciklama: 'Ich trinke Wasser. = Su içiyorum.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Tutarı üç avro.',
              kelimeler: ['Euro.', 'drei', 'macht', 'Das'],
              dogru: ['Das', 'macht', 'drei', 'Euro.'],
              aciklama: 'Das macht drei Euro. = Tutarı üç avro.',
            ),
            Eslestir(
              soru: 'Yiyecek ve içeceği Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'das Brot', sag: 'ekmek'),
                (sol: 'die Milch', sag: 'süt'),
                (sol: 'das Wasser', sag: 'su'),
                (sol: 'der Käse', sag: 'peynir'),
                (sol: 'der Apfel', sag: 'elma'),
              ],
              aciklama:
                  'das Brot = ekmek, die Milch = süt, das Wasser = su, der Käse = peynir, der Apfel = elma.',
            ),
            Tablo(
              soru: 'Artikel ve çoğul biçimlerini tamamla.',
              baslik: ['Sözcük', 'Artikel', 'Çoğul'],
              satirlar: [
                ['Brot', 'das', 'die Brote'],
                ['Wurst', 'die', 'die Würste'],
                ['Apfel', 'der', 'die Äpfel'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 2, sutun: 2)],
              secenekler: ['das', 'die', 'die Äpfel', 'die Würste'],
              aciklama:
                  'das Brot – die Brote (ekmekler), der Apfel – die Äpfel (elmalar), die Wurst – die Würste (sosisler).',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'almanca-1.u4',
      ad: 'Zaman ve yer',
      dersler: [
        Ders(
          id: 'almanca-1.u4.d1',
          ad: 'Saat, günler ve aylar',
          dilbilgisiNotu:
              'Wie spät ist es? (Saat kaç?) – Es ist drei Uhr. halb vier = 3:30 (dörde yarım kala). Günler: Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag, Sonntag. Gün için "am Montag", ay için "im Januar".',
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Es ist drei Uhr.',
              secenekler: [
                'Es ist drei Uhr.',
                'Es ist vier Uhr.',
                'Es ist halb drei.',
              ],
              dogru: 0,
              dil: _de,
              aciklama: 'Es ist drei Uhr. = Saat üç.',
            ),
            Secim(
              soru: '"Wie spät ist es?" ne demektir?',
              secenekler: ['Nasılsın?', 'Saat kaç?', 'Bugün hangi gün?'],
              dogru: 1,
              aciklama: 'Wie spät ist es? = Saat kaç?',
            ),
            Secim(
              soru: '"Es ist halb vier." saat kaçtır?',
              secenekler: ['3:30', '4:30', '4:00'],
              dogru: 0,
              aciklama:
                  'halb vier = dörde yarım var, yani 3:30. Almancada "halb" bir sonraki saate göre söylenir.',
            ),
            Secim(
              soru: '"Samstag" hangi gündür?',
              secenekler: ['Cumartesi', 'Pazar', 'Cuma'],
              dogru: 0,
              aciklama: 'Samstag = Cumartesi. Sonntag = Pazar, Freitag = Cuma.',
            ),
            Bosluk(
              soru: 'Nach Montag kommt ___.',
              secenekler: ['Dienstag', 'Mittwoch', 'Sonntag'],
              dogru: 0,
              aciklama:
                  'Montag (Pazartesi), Dienstag (Salı), Mittwoch (Çarşamba).',
            ),
            Bosluk(
              soru: 'Mai\'dan sonra gelen ay: ___',
              secenekler: ['Juni', 'April', 'Juli'],
              dogru: 0,
              aciklama: 'Mai (Mayıs), Juni (Haziran), Juli (Temmuz).',
            ),
            Yaz(
              soru: 'Almancaya çevir: Saat yedi.',
              cevaplar: ['Es ist sieben Uhr'],
              aciklama: 'Es ist sieben Uhr. = Saat yedi.',
            ),
            Eslestir(
              soru: 'Günü Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'Montag', sag: 'Pazartesi'),
                (sol: 'Mittwoch', sag: 'Çarşamba'),
                (sol: 'Donnerstag', sag: 'Perşembe'),
                (sol: 'Freitag', sag: 'Cuma'),
                (sol: 'Sonntag', sag: 'Pazar'),
              ],
              aciklama:
                  'Montag = Pazartesi, Mittwoch = Çarşamba, Donnerstag = Perşembe, Freitag = Cuma, Sonntag = Pazar.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Saat yedi buçuk.',
              kelimeler: ['acht.', 'Es', 'halb', 'ist'],
              dogru: ['Es', 'ist', 'halb', 'acht.'],
              aciklama:
                  'Es ist halb acht. = Saat yedi buçuk (sekize yarım var, 7:30).',
            ),
            Tablo(
              soru: 'Ayları tamamla.',
              baslik: ['Sıra', 'Ay'],
              satirlar: [
                ['1', 'Januar'],
                ['2', 'Februar'],
                ['3', 'März'],
                ['4', 'April'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: ['Februar', 'März', 'Mai'],
              aciklama:
                  'Januar (Ocak), Februar (Şubat), März (Mart), April (Nisan).',
            ),
          ],
        ),
        Ders(
          id: 'almanca-1.u4.d2',
          ad: 'Fiiller ve cümle sırası',
          dilbilgisiNotu:
              'Düzenli fiil: kök + ich -e, du -st, er -t, wir -en, ihr -t, sie -en (lernen: ich lerne, du lernst). Fiil düz cümlede hep ikinci yerdedir: Heute lerne ich Deutsch. Ayrılabilen fiilde ön ek sona gider: aufstehen → Ich stehe um sieben Uhr auf.',
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Ich stehe um sieben Uhr auf.',
              secenekler: [
                'Ich stehe um sieben Uhr auf.',
                'Ich stehe um acht Uhr auf.',
                'Ich arbeite um sieben Uhr.',
              ],
              dogru: 0,
              dil: _de,
              aciklama: 'Ich stehe um sieben Uhr auf. = Saat yedide kalkarım.',
            ),
            Secim(
              soru: 'Düz bir Almanca cümlede fiil kaçıncı yerde durur?',
              secenekler: ['İkinci', 'Son', 'Birinci'],
              dogru: 0,
              aciklama: 'Fiil ikinci yerdedir: Heute lerne ich Deutsch.',
            ),
            Secim(
              soru: 'Düzenli fiillerde "ich" için eki hangisidir?',
              secenekler: ['-st', '-e', '-t'],
              dogru: 1,
              aciklama: 'ich lerne, du lernst, er lernt: ich ile -e eki gelir.',
            ),
            Bosluk(
              soru: 'Du ___ Deutsch.',
              secenekler: ['lerne', 'lernt', 'lernst'],
              dogru: 2,
              aciklama:
                  'Du lernst Deutsch. = Almanca öğreniyorsun. du ile -st gelir.',
            ),
            Bosluk(
              soru: 'Er ___ um acht Uhr auf.',
              secenekler: ['steht', 'stehe', 'stehen'],
              dogru: 0,
              aciklama:
                  'Er steht um acht Uhr auf. = Saat sekizde kalkar. er ile -t eki gelir.',
            ),
            Yaz(
              soru: 'Almancaya çevir: Ben Almanca öğreniyorum.',
              cevaplar: ['Ich lerne Deutsch'],
              aciklama: 'Ich lerne Deutsch. = Almanca öğreniyorum.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Bugün Almanca öğreniyorum.',
              kelimeler: ['Deutsch.', 'lerne', 'Heute', 'ich'],
              dogru: ['Heute', 'lerne', 'ich', 'Deutsch.'],
              aciklama:
                  'Heute lerne ich Deutsch. Başa zaman sözcüğü gelince fiil yine ikinci yerde kalır, özne fiilden sonra gelir.',
            ),
            Tablo(
              soru: 'lernen fiilinin çekimini tamamla.',
              baslik: ['Zamir', 'lernen'],
              satirlar: [
                ['ich', 'lerne'],
                ['du', 'lernst'],
                ['er/sie/es', 'lernt'],
                ['wir', 'lernen'],
                ['ihr', 'lernt'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 3, sutun: 1)],
              secenekler: ['lernst', 'lernen', 'lernt', 'lerne'],
              aciklama:
                  'du lernst, wir lernen. lernen = öğrenmek. Diğerleri: ich lerne, er lernt, ihr lernt.',
            ),
            Eslestir(
              soru: 'Fiili Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'aufstehen', sag: 'kalkmak'),
                (sol: 'einkaufen', sag: 'alışveriş yapmak'),
                (sol: 'arbeiten', sag: 'çalışmak'),
                (sol: 'spielen', sag: 'oynamak'),
                (sol: 'machen', sag: 'yapmak'),
              ],
              aciklama:
                  'aufstehen = kalkmak, einkaufen = alışveriş yapmak, arbeiten = çalışmak, spielen = oynamak, machen = yapmak.',
            ),
            Isaretle(
              soru: 'Ayrılabilen fiilin iki parçasını işaretle.',
              cumle: 'Ich stehe um sieben Uhr auf.',
              dogru: [1, 5],
              aciklama:
                  'aufstehen fiili ayrılır: stehe (ikinci yerde) ve auf (cümle sonunda). Cümle: Saat yedide kalkarım.',
            ),
          ],
        ),
        Ders(
          id: 'almanca-1.u4.d3',
          ad: 'können, möchten ve yön tarifi',
          dilbilgisiNotu:
              'Modal fiil ikinci yerde çekimlenir, ana fiil mastar olarak sona gider: Ich kann Deutsch sprechen. können: ich kann, du kannst, wir können. möchten: ich möchte, du möchtest, wir möchten. Yön: geradeaus (düz), links (sol), rechts (sağ).',
          alistirmalar: [
            Dinle(
              soru: 'Hangi soruyu duydun?',
              okunacak: 'Wo ist der Bahnhof?',
              secenekler: [
                'Wo ist der Bahnhof?',
                'Wo ist die Bank?',
                'Wo wohnst du?',
              ],
              dogru: 0,
              dil: _de,
              aciklama: 'Wo ist der Bahnhof? = Tren istasyonu nerede?',
            ),
            Secim(
              soru: '"Gehen Sie geradeaus" ne demektir?',
              secenekler: ['Düz gidin', 'Sola dönün', 'Sağa dönün'],
              dogru: 0,
              aciklama:
                  'geradeaus = düz ileri. Gehen Sie geradeaus. = Düz gidin.',
            ),
            Secim(
              soru: '"links" ne demektir?',
              secenekler: ['Sağ', 'Sol', 'Düz'],
              dogru: 1,
              aciklama: 'links = sol, rechts = sağ.',
            ),
            Bosluk(
              soru: 'Ich ___ Deutsch sprechen.',
              secenekler: ['kann', 'kannst', 'können'],
              dogru: 0,
              aciklama:
                  'Ich kann Deutsch sprechen. = Almanca konuşabilirim. ich ile "kann" kullanılır.',
            ),
            Bosluk(
              soru: 'Wir ___ einen Kaffee.',
              secenekler: ['möchten', 'möchte', 'möchtest'],
              dogru: 0,
              aciklama: 'Wir möchten einen Kaffee. = Bir kahve istiyoruz.',
            ),
            Bosluk(
              soru: 'Du ___ gut kochen.',
              secenekler: ['kannst', 'kann', 'können'],
              dogru: 0,
              aciklama: 'Du kannst gut kochen. = İyi yemek yapabilirsin.',
            ),
            Yaz(
              soru: 'Almancaya çevir: Bir kahve istiyorum. (möchten ile)',
              cevaplar: ['Ich möchte einen Kaffee', 'Ich moechte einen Kaffee'],
              aciklama:
                  'Ich möchte einen Kaffee. = Bir kahve istiyorum. ö yerine oe yazılabilir.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Bana yardım edebilir misiniz?',
              kelimeler: ['helfen?', 'Sie', 'Können', 'mir'],
              dogru: ['Können', 'Sie', 'mir', 'helfen?'],
              aciklama:
                  'Können Sie mir helfen? = Bana yardım edebilir misiniz? Evet/hayır sorusunda fiil başa gelir.',
            ),
            Eslestir(
              soru: 'Sözcüğü Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'geradeaus', sag: 'düz'),
                (sol: 'links', sag: 'sol'),
                (sol: 'rechts', sag: 'sağ'),
                (sol: 'der Bahnhof', sag: 'tren istasyonu'),
                (sol: 'die Straße', sag: 'sokak, cadde'),
              ],
              aciklama:
                  'geradeaus = düz, links = sol, rechts = sağ, der Bahnhof = tren istasyonu, die Straße = sokak.',
            ),
            Tablo(
              soru: 'Modal fiil çekimlerini tamamla.',
              baslik: ['Zamir', 'können', 'möchten'],
              satirlar: [
                ['ich', 'kann', 'möchte'],
                ['du', 'kannst', 'möchtest'],
                ['er/sie/es', 'kann', 'möchte'],
                ['wir', 'können', 'möchten'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 3, sutun: 2)],
              secenekler: ['kannst', 'möchten', 'kann', 'möchtest'],
              aciklama:
                  'du kannst (yapabilirsin), wir möchten (istiyoruz). können = -ebilmek, möchten = istemek.',
            ),
          ],
        ),
      ],
    ),
  ],
);
