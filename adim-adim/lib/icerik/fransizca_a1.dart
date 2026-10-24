/// Fransızca A1: Başlangıç (CEFR A1, DELF A1 düzeyi). Dört ünite:
/// Selamlaşma, alfabe ve sayılar; Tanışma; Günlük hayat; Zaman ve yer.
/// Anlatım Türkçe, içerik Fransızcadır; her Fransızca ifadenin Türkçe
/// karşılığı açıklamada verilir. Yaz alıştırmalarında aksanlı harfler (é è à ç
/// ...) yerine bazı alıştırmalarda aksansız yazım da cevap listesinde ayrıca verilmiştir (genel bir aksan toleransı yoktur).
/// Soru işareti Fransızcada normalde boşlukla yazılır; alıştırmalarda
/// sözcüğe bitişik yazıldı (Comment ça va?), cevap karşılaştırmasında önemsizdir.
///
/// Sesli okuma için Windows'ta fr-FR ses paketi kurulu olmalıdır.
/// Sahibi Yusuf (yusufbesir). Yazan: [Claude#dalga11]. Değiştirme kuralı:
/// testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri
/// dönüşüm kutusuna.
library;

import '../model/icerik.dart';

const String _fr = 'fr-FR';

const Kurs fransizcaA1 = Kurs(
  id: 'fransizca-1',
  ad: 'Fransızca A1: Başlangıç',
  aciklama:
      'Sıfırdan Fransızca: selamlaşma, alfabe ve sayılar, tanışma, artikel ve aile, fiiller, yiyecek ve fiyat, saat ve yön tarifi.',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'fransizca-1.u1',
      ad: 'Selamlaşma, alfabe ve sayılar',
      dersler: [
        Ders(
          id: 'fransizca-1.u1.d1',
          ad: 'Selamlaşma',
          dilbilgisiNotu:
              "Bonjour (günaydın, iyi günler), Bonsoir (iyi akşamlar), Bonne nuit (iyi geceler, yatmadan önce). Salut samimidir (merhaba, hoşça kal); Au revoir genel veda sözüdür. Resmi hitap: Monsieur (Bay), Madame (Bayan).",
          alistirmalar: [
            Dinle(
              soru: 'Hangi selamlamayı duydun?',
              okunacak: 'Bonjour',
              secenekler: ['Bonjour', 'Bonsoir', 'Bonne nuit'],
              dogru: 0,
              dil: _fr,
              aciklama: 'Bonjour = Günaydın / İyi günler.',
            ),
            Secim(
              soru: '"Bonsoir" ne anlama gelir?',
              secenekler: ['İyi akşamlar', 'İyi geceler', 'Günaydın'],
              dogru: 0,
              aciklama:
                  'Bonsoir = İyi akşamlar; akşam karşılaşırken söylenir. Bonne nuit yatmadan önce söylenir.',
            ),
            Secim(
              soru: 'Yatmadan önce ne dersin?',
              secenekler: ['Bonjour', 'Bonsoir', 'Bonne nuit'],
              dogru: 2,
              aciklama: 'Bonne nuit = İyi geceler.',
            ),
            Bosluk(
              soru: '___ revoir!',
              secenekler: ['Au', 'Bon', 'Le'],
              dogru: 0,
              aciklama: 'Au revoir = Hoşça kal / Görüşmek üzere.',
            ),
            Bosluk(
              soru: '___ nuit!',
              secenekler: ['Bon', 'Bonne', 'Bons'],
              dogru: 1,
              aciklama:
                  'Bonne nuit = İyi geceler. Nuit dişil olduğu için "bonne" olur.',
            ),
            Yaz(
              soru: 'Fransızcaya çevir: Teşekkürler.',
              cevaplar: ['Merci', 'Merci beaucoup'],
              aciklama:
                  'Merci = Teşekkürler; Merci beaucoup = Çok teşekkürler.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Nasılsın? (Nasıl gidiyor?)',
              kelimeler: ['va?', 'Comment', 'ça'],
              dogru: ['Comment', 'ça', 'va?'],
              aciklama: 'Comment ça va? = Nasılsın? / Nasıl gidiyor?',
            ),
            Eslestir(
              soru: 'Fransızca ifadeyi Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'Bonjour', sag: 'Günaydın / İyi günler'),
                (sol: 'Salut', sag: 'Selam (samimi)'),
                (sol: 'Merci', sag: 'Teşekkürler'),
                (sol: "S'il vous plaît", sag: 'Lütfen (resmi)'),
                (sol: 'Excusez-moi', sag: 'Affedersiniz'),
              ],
              aciklama:
                  "Bonjour = günaydın, Salut = selam, Merci = teşekkürler, S'il vous plaît = lütfen, Excusez-moi = affedersiniz.",
            ),
            Isaretle(
              soru: 'Cümledeki "Bayan" sözcüğünü işaretle.',
              cumle: 'Bonjour, Madame Martin!',
              dogru: [1],
              aciklama:
                  'Madame = Bayan. Cümle: Günaydın, Bayan Martin! (Monsieur = Bay)',
            ),
          ],
        ),
        Ders(
          id: 'fransizca-1.u1.d2',
          ad: 'Alfabe, telaffuz ve aksanlar',
          dilbilgisiNotu:
              "Aksanlar: é (kapalı e), è ve ê (açık e), à, â, î, ô, û. ç her zaman \"s\" okunur. ch = \"ş\", j = Türkçe \"j\" (jour), u = \"ü\", ou = \"u\", eu = \"ö\", qu = \"k\", gn = \"ny\". r gırtlaktan söylenir. Sözcük sonundaki ünsüzler çoğunlukla okunmaz (petit, vous); h okunmaz (hôtel).",
          alistirmalar: [
            Dinle(
              soru: 'Hangi sözcüğü duydun?',
              okunacak: 'chat',
              secenekler: ['chat', 'chaud', 'chez'],
              dogru: 0,
              dil: _fr,
              aciklama:
                  'chat = kedi (ch = ş, sondaki t okunmaz). chaud = sıcak; chez = ...in evinde.',
            ),
            Secim(
              soru: 'Fransızca "ç" harfi hangi sesi verir?',
              secenekler: ['s', 'k', 'Türkçe ç'],
              dogru: 0,
              aciklama:
                  'ç (cédille) her zaman "s" okunur: français (Fransızca), garçon (oğlan).',
            ),
            Secim(
              soru: '"ch" Fransızcada nasıl okunur?',
              secenekler: ['ş', 'k', 'tş'],
              dogru: 0,
              aciklama: 'ch = "ş": chat (kedi), chambre (oda).',
            ),
            Bosluk(
              soru: '"tu" (sen) sözcüğündeki u harfi: ___',
              secenekler: ['Türkçe u gibi', 'Türkçe ü gibi', 'Türkçe o gibi'],
              dogru: 1,
              aciklama: 'Fransızca u, Türkçe "ü" gibi okunur: tu = "tü".',
            ),
            Bosluk(
              soru: '"vous" (siz) sözcüğündeki ou: ___',
              secenekler: ['Türkçe u gibi', 'Türkçe ü gibi', 'Türkçe ö gibi'],
              dogru: 0,
              aciklama: 'ou = "u": vous = "vu" (sondaki s okunmaz).',
            ),
            Yaz(
              soru: 'Aksanlarıyla yaz: ecole (okul)',
              cevaplar: ['école'],
              aciklama: 'école = okul (é: kapalı e). Aksan yazımın parçasıdır.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Adım Marie.',
              kelimeler: ['Marie.', "m'appelle", 'Je'],
              dogru: ['Je', "m'appelle", 'Marie.'],
              aciklama:
                  "Je m'appelle Marie. = Adım Marie. (m'appelle: me + appelle birleşmesi)",
            ),
            Eslestir(
              soru: 'Aksanlı sözcüğü Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'école', sag: 'okul'),
                (sol: 'été', sag: 'yaz'),
                (sol: 'père', sag: 'baba'),
                (sol: 'garçon', sag: 'oğlan'),
                (sol: 'fête', sag: 'parti / bayram'),
              ],
              aciklama:
                  'école = okul, été = yaz, père = baba, garçon = oğlan, fête = parti / bayram.',
            ),
            Isaretle(
              soru: 'Cümlede "ç" harfi olan sözcüğü işaretle.',
              cumle: 'Je parle français.',
              dogru: [2],
              aciklama:
                  'français = Fransızca ("fransé" gibi okunur). Cümle: Fransızca konuşuyorum.',
            ),
          ],
        ),
        Ders(
          id: 'fransizca-1.u1.d3',
          ad: 'Sayılar 0-100',
          dilbilgisiNotu:
              "0 zéro, 1 un, 2 deux, 3 trois, 4 quatre, 5 cinq, 6 six, 7 sept, 8 huit, 9 neuf, 10 dix. 11 onze, 12 douze, 13 treize, 14 quatorze, 15 quinze, 16 seize, 17 dix-sept, 18 dix-huit, 19 dix-neuf, 20 vingt. 30 trente, 40 quarante, 50 cinquante, 60 soixante. 70 soixante-dix (altmış-on), 80 quatre-vingts (dört-yirmi), 90 quatre-vingt-dix, 100 cent. 21 = vingt et un, 22 = vingt-deux.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi sayıyı duydun?',
              okunacak: 'quinze',
              secenekler: ['quinze', 'quatorze', 'seize'],
              dogru: 0,
              dil: _fr,
              aciklama: 'quinze = on beş. quatorze = on dört, seize = on altı.',
            ),
            Secim(
              soru: '"huit" kaç demektir?',
              secenekler: ['8', '9', '7'],
              dogru: 0,
              aciklama: 'huit = 8, neuf = 9, sept = 7.',
            ),
            Secim(
              soru: '"soixante-dix" kaçtır?',
              secenekler: ['60', '70', '90'],
              dogru: 1,
              aciklama: 'soixante-dix = altmış + on = 70.',
            ),
            Bosluk(
              soru: 'Deux plus trois font ___.',
              secenekler: ['quatre', 'cinq', 'six'],
              dogru: 1,
              aciklama: 'Deux plus trois font cinq. = İki artı üç beş eder.',
            ),
            Bosluk(
              soru: '80 = ___',
              secenekler: ['quatre-vingts', 'soixante-dix', 'quatre-vingt-dix'],
              dogru: 0,
              aciklama:
                  'quatre-vingts = 80 (dört-yirmi). soixante-dix = 70, quatre-vingt-dix = 90.',
            ),
            Yaz(
              soru: 'Fransızcaya çevir: 12',
              cevaplar: ['douze'],
              aciklama: 'douze = 12.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: İki ve üç beş eder.',
              kelimeler: ['trois', 'cinq.', 'font', 'Deux', 'et'],
              dogru: ['Deux', 'et', 'trois', 'font', 'cinq.'],
              aciklama: 'Deux et trois font cinq. = İki ve üç beş eder.',
            ),
            Eslestir(
              soru: 'Sayıyı rakamla eşleştir.',
              ciftler: [
                (sol: 'trois', sag: '3'),
                (sol: 'sept', sag: '7'),
                (sol: 'douze', sag: '12'),
                (sol: 'seize', sag: '16'),
                (sol: 'vingt', sag: '20'),
              ],
              aciklama:
                  'trois = 3, sept = 7, douze = 12, seize = 16, vingt = 20.',
            ),
            Isaretle(
              soru: 'Cümledeki sayıyı işaretle.',
              cumle: 'Voici douze euros.',
              dogru: [1],
              aciklama: 'douze = 12. Cümle: İşte on iki avro. (Voici = işte)',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'fransizca-1.u2',
      ad: 'Tanışma',
      dersler: [
        Ders(
          id: 'fransizca-1.u2.d1',
          ad: 'Özne zamirleri ve être',
          dilbilgisiNotu:
              "être (olmak): je suis, tu es, il/elle est, nous sommes, vous êtes, ils/elles sont. Samimi tek kişiye \"tu\", resmi ya da çoğul \"siz\" için \"vous\" kullanılır. Meslek söylerken artikel kullanılmaz: Je suis étudiant.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Nous sommes étudiants.',
              secenekler: [
                'Nous sommes étudiants.',
                'Vous êtes étudiants.',
                'Ils sont étudiants.',
              ],
              dogru: 0,
              dil: _fr,
              aciklama: 'Nous sommes étudiants. = Biz öğrenciyiz.',
            ),
            Secim(
              soru: '"tu" ile hangi être biçimi kullanılır?',
              secenekler: ['es', 'est', 'suis'],
              dogru: 0,
              aciklama: 'tu es = sen ...sın/sin. je suis, il est.',
            ),
            Secim(
              soru:
                  'Tek bir kişiye resmi "siz" demek için hangi zamir kullanılır?',
              secenekler: ['tu', 'vous', 'nous'],
              dogru: 1,
              aciklama:
                  'vous = siz (resmi ya da çoğul). tu = sen (samimi), nous = biz.',
            ),
            Bosluk(
              soru: 'Je ___ Marie.',
              secenekler: ['suis', 'es', 'est'],
              dogru: 0,
              aciklama: "Je suis Marie. = Ben Marie'yim.",
            ),
            Bosluk(
              soru: 'Elle ___ professeur.',
              secenekler: ['est', 'sont', 'êtes'],
              dogru: 0,
              aciklama: 'Elle est professeur. = O (kadın) öğretmendir.',
            ),
            Yaz(
              soru: 'Fransızcaya çevir: Biz öğrenciyiz.',
              cevaplar: [
                'Nous sommes étudiants',
                'Nous sommes etudiants',
                'Nous sommes étudiantes',
                'Nous sommes etudiantes',
              ],
              aciklama:
                  'Nous sommes étudiants. être, nous ile "sommes" olur (kadınlarsa étudiantes).',
            ),
            Tablo(
              soru: 'être fiilinin çekimini tamamla.',
              baslik: ['Zamir', 'être'],
              satirlar: [
                ['je', 'suis'],
                ['tu', 'es'],
                ['il/elle', 'est'],
                ['nous', 'sommes'],
                ['vous', 'êtes'],
                ['ils/elles', 'sont'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 4, sutun: 1)],
              secenekler: ['es', 'êtes', 'est', 'suis'],
              aciklama:
                  'tu es, vous êtes. Diğerleri: je suis, il est, nous sommes, ils sont.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Siz buradasınız.',
              kelimeler: ['ici.', 'Vous', 'êtes'],
              dogru: ['Vous', 'êtes', 'ici.'],
              aciklama: 'Vous êtes ici. = Siz buradasınız.',
            ),
            Eslestir(
              soru: 'Zamiri Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'je', sag: 'ben'),
                (sol: 'tu', sag: 'sen'),
                (sol: 'nous', sag: 'biz'),
                (sol: 'vous', sag: 'siz'),
                (sol: 'ils', sag: 'onlar (erkek ya da karışık)'),
              ],
              aciklama:
                  'je = ben, tu = sen, nous = biz, vous = siz, ils = onlar.',
            ),
            Isaretle(
              soru: 'Cümledeki être fiilini işaretle.',
              cumle: 'Nous sommes amis.',
              dogru: [1],
              aciklama:
                  'sommes = être fiilinin nous çekimi. Cümle: Biz arkadaşız.',
            ),
          ],
        ),
        Ders(
          id: 'fransizca-1.u2.d2',
          ad: 'avoir ve kendini tanıtma',
          dilbilgisiNotu:
              "avoir (sahip olmak): j'ai, tu as, il/elle a, nous avons, vous avez, ils/elles ont. Yaş avoir ile söylenir: J'ai vingt ans. Kalıplar: Je m'appelle ... (adım ...), J'habite à ... (... şehrinde oturuyorum), Je viens de ... (... yerindenim), Enchanté(e) (memnun oldum).",
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: "Je m'appelle Marie.",
              secenekler: [
                "Je m'appelle Marie.",
                "Tu t'appelles Marie.",
                "Elle s'appelle Marie.",
              ],
              dogru: 0,
              dil: _fr,
              aciklama: "Je m'appelle Marie. = Adım Marie.",
            ),
            Secim(
              soru: '"nous" ile avoir fiili nasıl çekimlenir?',
              secenekler: ['avons', 'avez', 'ont'],
              dogru: 0,
              aciklama: 'nous avons = bizim var. vous avez, ils ont.',
            ),
            Secim(
              soru: 'Fransızcada yaş hangi fiille söylenir?',
              secenekler: [
                'avoir (sahip olmak)',
                'être (olmak)',
                'aller (gitmek)',
              ],
              dogru: 0,
              aciklama:
                  "Yaş avoir ile söylenir: J'ai vingt ans (kelimesi kelimesine: yirmi yılım var).",
            ),
            Bosluk(
              soru: "J'___ vingt ans.",
              secenekler: ['ai', 'as', 'a'],
              dogru: 0,
              aciklama: "J'ai vingt ans. = Yirmi yaşındayım.",
            ),
            Bosluk(
              soru: 'Elle ___ un chat.',
              secenekler: ['a', 'as', 'ont'],
              dogru: 0,
              aciklama: 'Elle a un chat. = Onun bir kedisi var.',
            ),
            Yaz(
              soru: 'Fransızcaya çevir: Adım Paul.',
              cevaplar: ["Je m'appelle Paul"],
              aciklama: "Je m'appelle Paul. = Adım Paul.",
            ),
            Tablo(
              soru: 'avoir fiilinin çekimini tamamla.',
              baslik: ['Zamir', 'avoir'],
              satirlar: [
                ["j'", 'ai'],
                ['tu', 'as'],
                ['il/elle', 'a'],
                ['nous', 'avons'],
                ['vous', 'avez'],
                ['ils/elles', 'ont'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 3, sutun: 1)],
              secenekler: ['as', 'avons', 'avez', 'ai'],
              aciklama:
                  "tu as, nous avons. Diğerleri: j'ai, il a, vous avez, ils ont.",
            ),
            Sirala(
              soru: "Cümleyi sırala: Paris'te oturuyorum.",
              kelimeler: ['Paris.', 'à', "J'habite"],
              dogru: ["J'habite", 'à', 'Paris.'],
              aciklama: "J'habite à Paris. = Paris'te oturuyorum.",
            ),
            Eslestir(
              soru: 'Kalıbı Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: "Je m'appelle Paul.", sag: 'Adım Paul.'),
                (sol: "J'ai vingt ans.", sag: 'Yirmi yaşındayım.'),
                (sol: "J'habite à Lyon.", sag: "Lyon'da oturuyorum."),
                (sol: 'Enchanté(e).', sag: 'Memnun oldum.'),
                (sol: 'Je viens de Turquie.', sag: "Türkiye'denim."),
              ],
              aciklama:
                  "Je m'appelle = adım, J'ai ... ans = ... yaşındayım, J'habite à = ...'de oturuyorum, Enchanté(e) = memnun oldum, Je viens de = ...'denim.",
            ),
            Isaretle(
              soru: 'Cümledeki avoir fiilini işaretle.',
              cumle: 'Nous avons un chien.',
              dogru: [1],
              aciklama:
                  'avons = avoir fiilinin nous çekimi. Cümle: Bizim bir köpeğimiz var.',
            ),
          ],
        ),
        Ders(
          id: 'fransizca-1.u2.d3',
          ad: 'Sorular, ülkeler ve meslekler',
          dilbilgisiNotu:
              "Evet/hayır sorusu: Est-ce que ...? ya da yalnızca tonlama: Tu es étudiant? Soru sözcükleri: qui (kim), que/qu'est-ce que (ne), où (nerede), quand (ne zaman), comment (nasıl). Ülkeler: la France, l'Allemagne, la Turquie, l'Espagne, l'Italie. Uyruk ve meslekte dişil biçim genellikle -e ile yapılır: étudiant – étudiante, turc – turque.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi soruyu duydun?',
              okunacak: 'Où habites-tu?',
              secenekler: ['Où habites-tu?', 'Qui es-tu?', 'Comment vas-tu?'],
              dogru: 0,
              dil: _fr,
              aciklama: 'Où habites-tu? = Nerede oturuyorsun?',
            ),
            Secim(
              soru: '"Où" soru sözcüğü neyi sorar?',
              secenekler: [
                'Yeri (nerede)',
                'Kişiyi (kim)',
                'Zamanı (ne zaman)',
              ],
              dogru: 0,
              aciklama: 'Où = nerede. Qui = kim, quand = ne zaman.',
            ),
            Secim(
              soru: '"Qui est-ce?" ne demektir?',
              secenekler: ['Bu kim?', 'Bu ne?', 'Nerede?'],
              dogru: 0,
              aciklama:
                  "Qui est-ce? = Bu kim? Qu'est-ce que c'est? = Bu nedir?",
            ),
            Bosluk(
              soru: '___ tu es étudiant?',
              secenekler: ['Est-ce que', 'Qui', 'Où'],
              dogru: 0,
              aciklama:
                  'Est-ce que tu es étudiant? = Öğrenci misin? "Est-ce que" evet/hayır sorusu başlatır.',
            ),
            Bosluk(
              soru: 'Elle est ___. (Türk, kadın)',
              secenekler: ['turc', 'turque', 'turques'],
              dogru: 1,
              aciklama: 'Elle est turque. = O Türk (kadın). Erkek: turc.',
            ),
            Yaz(
              soru: 'Fransızcaya çevir: Bu kim?',
              cevaplar: ['Qui est-ce', "C'est qui"],
              aciklama: "Qui est-ce? = Bu kim? (günlük konuşmada C'est qui?)",
            ),
            Sirala(
              soru: 'Cümleyi sırala: O Fransa\'dan.',
              kelimeler: ['France.', 'est', 'Elle', 'de'],
              dogru: ['Elle', 'est', 'de', 'France.'],
              aciklama: "Elle est de France. = O (kadın) Fransa'dan.",
            ),
            Eslestir(
              soru: 'Ülkeyi Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'la France', sag: 'Fransa'),
                (sol: "l'Allemagne", sag: 'Almanya'),
                (sol: 'la Turquie', sag: 'Türkiye'),
                (sol: "l'Espagne", sag: 'İspanya'),
                (sol: "l'Italie", sag: 'İtalya'),
              ],
              aciklama:
                  "la France = Fransa, l'Allemagne = Almanya, la Turquie = Türkiye, l'Espagne = İspanya, l'Italie = İtalya.",
            ),
            Tablo(
              soru: 'Dişil biçimleri tamamla.',
              baslik: ['Erkek', 'Kadın'],
              satirlar: [
                ['étudiant', 'étudiante'],
                ['turc', 'turque'],
                ['allemand', 'allemande'],
                ['français', 'française'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: ['étudiante', 'allemande', 'française', 'turque'],
              aciklama:
                  'étudiant – étudiante, allemand – allemande. Genellikle dişil için -e eklenir.',
            ),
            Isaretle(
              soru: 'Soru sözcüğünü işaretle.',
              cumle: 'Où est Paul?',
              dogru: [0],
              aciklama: 'Où = nerede. Cümle: Paul nerede?',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'fransizca-1.u3',
      ad: 'Günlük hayat',
      dersler: [
        Ders(
          id: 'fransizca-1.u3.d1',
          ad: 'Artikel, cinsiyet ve çoğul',
          dilbilgisiNotu:
              "Her isim eril ya da dişildir. Belirli artikel: le (eril), la (dişil), l' (ünlü ya da sessiz h ile başlayan isim), les (çoğul). Belirsiz artikel: un (eril), une (dişil), des (çoğul). Çoğul genellikle -s ile yapılır ve okunmaz: un livre – des livres. -eau ile bitenler -eaux olur: un gâteau – des gâteaux. Cinsiyeti kelimeyle birlikte öğren.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi ifadeyi duydun?',
              okunacak: 'la table',
              secenekler: ['la table', 'le livre', 'les tables'],
              dogru: 0,
              dil: _fr,
              aciklama: 'la table = masa (dişil). le livre = kitap.',
            ),
            Secim(
              soru: '"maison" (ev) için doğru belirli artikel hangisidir?',
              secenekler: ['le', 'la', 'les'],
              dogru: 1,
              aciklama: 'la maison = ev (dişil).',
            ),
            Secim(
              soru: 'Belirli çoğul artikel hangisidir?',
              secenekler: ['les', 'des', 'la'],
              dogru: 0,
              aciklama:
                  'les = belirli çoğul (les livres). des = belirsiz çoğul.',
            ),
            Bosluk(
              soru: '___ livre est ici.',
              secenekler: ['Le', 'La', 'Les'],
              dogru: 0,
              aciklama:
                  'Le livre est ici. = Kitap burada. livre eril olduğu için "le".',
            ),
            Bosluk(
              soru: 'Elle a ___ amie.',
              secenekler: ['un', 'une', 'des'],
              dogru: 1,
              aciklama:
                  'Elle a une amie. = Onun bir kız arkadaşı var. amie dişildir.',
            ),
            Yaz(
              soru: 'Fransızcaya çevir: kitaplar (belirli artikelle)',
              cevaplar: ['les livres'],
              aciklama:
                  'les livres = kitaplar. Çoğul için -s eklenir (okunmaz).',
            ),
            Tablo(
              soru: 'Artikel tablosunu tamamla.',
              baslik: ['Tür', 'Eril', 'Dişil', 'Çoğul'],
              satirlar: [
                ['Belirli', 'le', 'la', 'les'],
                ['Belirsiz', 'un', 'une', 'des'],
              ],
              bos: [(satir: 0, sutun: 2), (satir: 1, sutun: 3)],
              secenekler: ['la', 'des', 'le', 'un'],
              aciklama: 'Belirli dişil: la. Belirsiz çoğul: des.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Bu bir masa.',
              kelimeler: ['table.', 'une', "C'est"],
              dogru: ["C'est", 'une', 'table.'],
              aciklama: "C'est une table. = Bu bir masa.",
            ),
            Eslestir(
              soru: 'İsmi Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'le livre', sag: 'kitap'),
                (sol: 'la table', sag: 'masa'),
                (sol: "l'école", sag: 'okul'),
                (sol: 'les enfants', sag: 'çocuklar'),
                (sol: 'le chat', sag: 'kedi'),
              ],
              aciklama:
                  "le livre = kitap, la table = masa, l'école = okul, les enfants = çocuklar, le chat = kedi.",
            ),
            Isaretle(
              soru: 'Cümledeki belirsiz artikeli işaretle.',
              cumle: 'Elle a un chat.',
              dogru: [2],
              aciklama:
                  'un = belirsiz eril artikel. Cümle: Onun bir kedisi var.',
            ),
          ],
        ),
        Ders(
          id: 'fransizca-1.u3.d2',
          ad: '-er fiilleri ve olumsuz cümle',
          dilbilgisiNotu:
              "-er fiilleri (parler, habiter, aimer, travailler): kökün sonuna -e, -es, -e, -ons, -ez, -ent gelir: je parle, tu parles, il parle, nous parlons, vous parlez, ils parlent. Ünlüyle başlayan fiilde je → j': j'habite, j'aime. Olumsuz: ne ... pas fiili sarar: Je ne parle pas. Ünlüden önce ne → n': Je n'aime pas.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Nous parlons français.',
              secenekler: [
                'Nous parlons français.',
                'Vous parlez français.',
                'Ils parlent français.',
              ],
              dogru: 0,
              dil: _fr,
              aciklama: 'Nous parlons français. = Fransızca konuşuyoruz.',
            ),
            Secim(
              soru: '"vous" ile -er fiilinin sonu ne olur?',
              secenekler: ['-ez', '-ons', '-ent'],
              dogru: 0,
              aciklama: 'vous parlez. nous parlons, ils parlent.',
            ),
            Secim(
              soru: 'Fransızcada olumsuz cümle nasıl kurulur?',
              secenekler: [
                'ne ... pas, fiili ortaya alır',
                'Fiilin sonuna -pas eklenir',
                'Cümlenin başına non konur',
              ],
              dogru: 0,
              aciklama: 'ne fiil pas: Je ne parle pas. = Konuşmuyorum.',
            ),
            Bosluk(
              soru: 'Je ___ français.',
              secenekler: ['parle', 'parles', 'parlons'],
              dogru: 0,
              aciklama: 'Je parle français. = Fransızca konuşuyorum.',
            ),
            Bosluk(
              soru: 'Il ne parle ___ anglais.',
              secenekler: ['pas', 'non', 'sans'],
              dogru: 0,
              aciklama: 'Il ne parle pas anglais. = O İngilizce konuşmuyor.',
            ),
            Yaz(
              soru: 'Fransızcaya çevir: Fransızca konuşmuyorum.',
              cevaplar: [
                'Je ne parle pas français',
                'Je ne parle pas le français',
                'Je ne parle pas francais',
              ],
              aciklama: 'Je ne parle pas français. = Fransızca konuşmuyorum.',
            ),
            Tablo(
              soru: 'parler fiilinin çekimini tamamla.',
              baslik: ['Zamir', 'parler'],
              satirlar: [
                ['je', 'parle'],
                ['tu', 'parles'],
                ['il/elle', 'parle'],
                ['nous', 'parlons'],
                ['vous', 'parlez'],
                ['ils/elles', 'parlent'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 4, sutun: 1)],
              secenekler: ['parles', 'parlez', 'parlons', 'parlent'],
              aciklama: 'tu parles, vous parlez. nous parlons, ils parlent.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Kahveyi sevmiyorum.',
              kelimeler: ['café.', 'pas', "n'aime", 'Je', 'le'],
              dogru: ['Je', "n'aime", 'pas', 'le', 'café.'],
              aciklama: "Je n'aime pas le café. = Kahveyi sevmiyorum.",
            ),
            Eslestir(
              soru: 'Fiili Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'parler', sag: 'konuşmak'),
                (sol: 'habiter', sag: 'oturmak (ikamet etmek)'),
                (sol: 'aimer', sag: 'sevmek'),
                (sol: 'travailler', sag: 'çalışmak'),
                (sol: 'manger', sag: 'yemek yemek'),
              ],
              aciklama:
                  'parler = konuşmak, habiter = oturmak, aimer = sevmek, travailler = çalışmak, manger = yemek yemek.',
            ),
            Isaretle(
              soru: 'Olumsuzluğu yapan iki sözcüğü işaretle.',
              cumle: 'Elle ne mange pas.',
              dogru: [1, 3],
              aciklama: 'ne ... pas olumsuzluk yapar. Cümle: O yemek yemiyor.',
            ),
          ],
        ),
        Ders(
          id: 'fransizca-1.u3.d3',
          ad: 'Aile ve sahiplik sıfatları',
          dilbilgisiNotu:
              "Sahiplik sıfatları: mon/ma/mes (benim), ton/ta/tes (senin), son/sa/ses (onun), notre/nos (bizim), votre/vos (sizin), leur/leurs (onların). Sahibin değil, sahip olunan ismin cinsiyetine uyar: sa mère (onun annesi; erkek ya da kadın için). Dişil isim ünlüyle başlarsa mon/ton/son kullanılır: mon amie. Aile: le père, la mère, le frère, la sœur, le fils, la fille, les parents.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Voici ma sœur.',
              secenekler: [
                'Voici ma sœur.',
                'Voici mon frère.',
                'Voici mes parents.',
              ],
              dogru: 0,
              dil: _fr,
              aciklama: 'Voici ma sœur. = İşte kız kardeşim.',
            ),
            Secim(
              soru: '"ma" hangi isimle kullanılır?',
              secenekler: [
                'Dişil tekil isimle (ma mère)',
                'Eril tekil isimle',
                'Çoğul isimle',
              ],
              dogru: 0,
              aciklama:
                  'ma = benim (dişil tekil): ma mère. Eril: mon père. Çoğul: mes.',
            ),
            Secim(
              soru: '"mes" ne zaman kullanılır?',
              secenekler: [
                'Sahip olunan şey çoğulsa (mes frères)',
                'Dişil tekil isimle',
                'Eril tekil isimle',
              ],
              dogru: 0,
              aciklama: 'mes = benim (çoğul): mes frères = erkek kardeşlerim.',
            ),
            Bosluk(
              soru: "C'est ___ père. (benim)",
              secenekler: ['mon', 'ma', 'mes'],
              dogru: 0,
              aciklama: "C'est mon père. = Bu benim babam.",
            ),
            Bosluk(
              soru: 'Voici ___ sœur. (senin)',
              secenekler: ['ta', 'ton', 'tes'],
              dogru: 0,
              aciklama: 'Voici ta sœur. = İşte senin kız kardeşin.',
            ),
            Yaz(
              soru: 'Fransızcaya çevir: annem',
              cevaplar: ['ma mère', 'ma mere'],
              aciklama: 'ma mère = annem (mère dişil).',
            ),
            Tablo(
              soru: 'Sahiplik sıfatlarını tamamla.',
              baslik: ['Kişi', 'Eril', 'Dişil', 'Çoğul'],
              satirlar: [
                ['je', 'mon', 'ma', 'mes'],
                ['tu', 'ton', 'ta', 'tes'],
                ['il/elle', 'son', 'sa', 'ses'],
              ],
              bos: [(satir: 1, sutun: 2), (satir: 2, sutun: 3)],
              secenekler: ['ta', 'ses', 'ton', 'sa'],
              aciklama: 'tu: ton, ta, tes. il/elle: son, sa, ses.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Bu bizim ailemiz.',
              kelimeler: ['famille.', 'notre', "C'est"],
              dogru: ["C'est", 'notre', 'famille.'],
              aciklama: "C'est notre famille. = Bu bizim ailemiz.",
            ),
            Eslestir(
              soru: 'Aile üyesini Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'le père', sag: 'baba'),
                (sol: 'la mère', sag: 'anne'),
                (sol: 'le frère', sag: 'erkek kardeş'),
                (sol: 'la sœur', sag: 'kız kardeş'),
                (sol: 'les parents', sag: 'anne baba'),
              ],
              aciklama:
                  'le père = baba, la mère = anne, le frère = erkek kardeş, la sœur = kız kardeş, les parents = anne baba.',
            ),
            Isaretle(
              soru: 'Sahiplik sıfatını işaretle.',
              cumle: 'Mon frère habite à Lyon.',
              dogru: [0],
              aciklama: "Mon = benim. Cümle: Erkek kardeşim Lyon'da oturuyor.",
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'fransizca-1.u4',
      ad: 'Zaman ve yer',
      dersler: [
        Ders(
          id: 'fransizca-1.u4.d1',
          ad: 'Yiyecek, sipariş ve fiyat',
          dilbilgisiNotu:
              "Sipariş: Je voudrais un café, s'il vous plaît. (Bir kahve istiyorum.) L'addition, s'il vous plaît. (Hesap lütfen.) Belirsiz miktar için du (eril), de la (dişil), de l' (ünlü), des (çoğul): Je mange du pain. Fiyat: Combien ça coûte? (Ne kadar?) – Ça coûte cinq euros. Sayıdan sonra çoğul: un euro, deux euros.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: "Je voudrais un café, s'il vous plaît.",
              secenekler: [
                "Je voudrais un café, s'il vous plaît.",
                "Je voudrais un thé, s'il vous plaît.",
                "Je voudrais de l'eau, s'il vous plaît.",
              ],
              dogru: 0,
              dil: _fr,
              aciklama:
                  'Bir kahve istiyorum, lütfen. (café = kahve, thé = çay)',
            ),
            Secim(
              soru: "\"L'addition, s'il vous plaît\" restoranda ne demektir?",
              secenekler: ['Hesap lütfen', 'Menü lütfen', 'Su lütfen'],
              dogru: 0,
              aciklama: "L'addition = hesap; le menu = menü.",
            ),
            Secim(
              soru: '"Combien ça coûte?" ne sorar?',
              secenekler: ['Fiyatı', 'Saati', 'Yeri'],
              dogru: 0,
              aciklama: 'Combien ça coûte? = Bu ne kadar?',
            ),
            Bosluk(
              soru: 'Je mange ___ pain.',
              secenekler: ['du', 'de la', 'des'],
              dogru: 0,
              aciklama:
                  'Je mange du pain. = Ekmek yiyorum. pain eril olduğu için "du".',
            ),
            Bosluk(
              soru: 'Je prends ___ eau.',
              secenekler: ["de l'", 'du', 'de la'],
              dogru: 0,
              aciklama:
                  "Je prends de l'eau. = Su alıyorum. Ünlüyle başlayan isimden önce de l' kullanılır.",
            ),
            Yaz(
              soru: 'Fransızcaya çevir: Hesap lütfen.',
              cevaplar: [
                "L'addition, s'il vous plaît",
                "L'addition s'il vous plaît",
              ],
              aciklama: "L'addition, s'il vous plaît. = Hesap lütfen.",
            ),
            Sirala(
              soru: 'Cümleyi sırala: Bu beş avro.',
              kelimeler: ['cinq', 'euros.', 'coûte', 'Ça'],
              dogru: ['Ça', 'coûte', 'cinq', 'euros.'],
              aciklama: 'Ça coûte cinq euros. = Beş avro tutuyor.',
            ),
            Eslestir(
              soru: 'Yiyecek ve içeceği Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'le pain', sag: 'ekmek'),
                (sol: 'le fromage', sag: 'peynir'),
                (sol: "l'eau", sag: 'su'),
                (sol: 'le lait', sag: 'süt'),
                (sol: 'la pomme', sag: 'elma'),
              ],
              aciklama:
                  "le pain = ekmek, le fromage = peynir, l'eau = su, le lait = süt, la pomme = elma.",
            ),
            Tablo(
              soru: 'Belirsiz miktar ifadelerini tamamla.',
              baslik: ['Eril', 'Dişil', 'Ünlüyle başlayan', 'Çoğul'],
              satirlar: [
                ['du pain', 'de la viande', "de l'eau", 'des fruits'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 0, sutun: 3)],
              secenekler: ['de la viande', 'des fruits', 'du pain', "de l'eau"],
              aciklama:
                  'Dişil: de la viande (et). Çoğul: des fruits (meyveler).',
            ),
            Isaretle(
              soru: 'Fiyatı gösteren sözcükleri işaretle.',
              cumle: 'Le café coûte deux euros.',
              dogru: [3, 4],
              aciklama: 'deux euros = iki avro. Cümle: Kahve iki avro.',
            ),
          ],
        ),
        Ders(
          id: 'fransizca-1.u4.d2',
          ad: 'Saat, günler ve aylar',
          dilbilgisiNotu:
              "Quelle heure est-il? (Saat kaç?) – Il est trois heures. Tekil: Il est une heure. et quart (çeyrek geçe), et demie (buçuk), moins le quart (çeyrek var), midi (öğle), minuit (gece yarısı). Günler: lundi, mardi, mercredi, jeudi, vendredi, samedi, dimanche. Aylar: janvier, février, mars, avril, mai, juin, juillet, août, septembre, octobre, novembre, décembre. Gün ve ay adları küçük harfle yazılır.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi saati duydun?',
              okunacak: 'Il est trois heures.',
              secenekler: [
                'Il est trois heures.',
                'Il est deux heures.',
                'Il est quatre heures.',
              ],
              dogru: 0,
              dil: _fr,
              aciklama: 'Il est trois heures. = Saat üç.',
            ),
            Secim(
              soru: '"Il est dix heures et demie" saat kaçtır?',
              secenekler: ['10:30', '10:15', '9:30'],
              dogru: 0,
              aciklama:
                  'et demie = buçuk: 10:30. et quart = çeyrek geçe: 10:15.',
            ),
            Secim(
              soru: '"mercredi" haftanın hangi günüdür?',
              secenekler: ['Çarşamba', 'Perşembe', 'Salı'],
              dogru: 0,
              aciklama: 'mercredi = çarşamba, jeudi = perşembe, mardi = salı.',
            ),
            Bosluk(
              soru: 'Il est une heure ___ quart. (1:15)',
              secenekler: ['et', 'moins', 'à'],
              dogru: 0,
              aciklama: 'Il est une heure et quart. = Saat bir çeyrek (1:15).',
            ),
            Bosluk(
              soru: "Après mardi, c'est ___.",
              secenekler: ['mercredi', 'jeudi', 'lundi'],
              dogru: 0,
              aciklama:
                  "Salıdan sonra çarşamba gelir: Après mardi, c'est mercredi.",
            ),
            Yaz(
              soru: 'Fransızcaya çevir: Saat kaç?',
              cevaplar: ['Quelle heure est-il', 'Il est quelle heure'],
              aciklama: 'Quelle heure est-il? = Saat kaç?',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Saat sekiz.',
              kelimeler: ['heures.', 'huit', 'est', 'Il'],
              dogru: ['Il', 'est', 'huit', 'heures.'],
              aciklama: 'Il est huit heures. = Saat sekiz.',
            ),
            Eslestir(
              soru: 'Gün ya da ayı Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'lundi', sag: 'pazartesi'),
                (sol: 'vendredi', sag: 'cuma'),
                (sol: 'dimanche', sag: 'pazar'),
                (sol: 'janvier', sag: 'ocak'),
                (sol: 'décembre', sag: 'aralık'),
              ],
              aciklama:
                  'lundi = pazartesi, vendredi = cuma, dimanche = pazar, janvier = ocak, décembre = aralık.',
            ),
            Isaretle(
              soru: 'Ayı gösteren sözcüğü işaretle.',
              cumle: 'Mon anniversaire est en mai.',
              dogru: [4],
              aciklama: 'mai = mayıs. Cümle: Doğum günüm mayısta.',
            ),
          ],
        ),
        Ders(
          id: 'fransizca-1.u4.d3',
          ad: 'aller ve yer edatları',
          dilbilgisiNotu:
              "aller (gitmek): je vais, tu vas, il/elle va, nous allons, vous allez, ils/elles vont. à + le = au, à + les = aux; à la ve à l' değişmez: Je vais au marché, à la gare, à l'école. Şehirle à: à Paris. Yakın gelecek: aller + mastar: Je vais manger. Yer: dans (içinde), sur (üstünde), sous (altında), devant (önünde), derrière (arkasında). Yön: tout droit (düz), à gauche (sola), à droite (sağa).",
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Je vais à la gare.',
              secenekler: [
                'Je vais à la gare.',
                'Je vais au marché.',
                "Je vais à l'école.",
              ],
              dogru: 0,
              dil: _fr,
              aciklama:
                  "Je vais à la gare. = İstasyona gidiyorum. (marché = pazar, école = okul)",
            ),
            Secim(
              soru: '"à + le" birleşince ne olur?',
              secenekler: ['au', 'aux', 'à la'],
              dogru: 0,
              aciklama: 'à + le = au: au marché. à + les = aux.',
            ),
            Secim(
              soru: '"à gauche" ne demektir?',
              secenekler: ['Sola', 'Sağa', 'Düz'],
              dogru: 0,
              aciklama: 'à gauche = sola, à droite = sağa, tout droit = düz.',
            ),
            Bosluk(
              soru: 'Nous ___ au cinéma.',
              secenekler: ['allons', 'allez', 'vont'],
              dogru: 0,
              aciklama: 'Nous allons au cinéma. = Sinemaya gidiyoruz.',
            ),
            Bosluk(
              soru: 'Je vais ___ marché.',
              secenekler: ['au', 'à la', 'aux'],
              dogru: 0,
              aciklama:
                  'Je vais au marché. = Pazara gidiyorum. marché eril: à + le = au.',
            ),
            Yaz(
              soru: 'Fransızcaya çevir: Okula gidiyorum.',
              cevaplar: ["Je vais à l'école", "Je vais a l'ecole"],
              aciklama: "Je vais à l'école. = Okula gidiyorum.",
            ),
            Tablo(
              soru: 'aller fiilinin çekimini tamamla.',
              baslik: ['Zamir', 'aller'],
              satirlar: [
                ['je', 'vais'],
                ['tu', 'vas'],
                ['il/elle', 'va'],
                ['nous', 'allons'],
                ['vous', 'allez'],
                ['ils/elles', 'vont'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 5, sutun: 1)],
              secenekler: ['vas', 'vont', 'va', 'allez'],
              aciklama:
                  'tu vas, ils vont. Diğerleri: je vais, il va, nous allons, vous allez.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: İstasyon nerede?',
              kelimeler: ['gare?', 'la', 'est', 'Où'],
              dogru: ['Où', 'est', 'la', 'gare?'],
              aciklama: 'Où est la gare? = İstasyon nerede?',
            ),
            Eslestir(
              soru: 'Yer edatını Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'dans', sag: 'içinde'),
                (sol: 'sur', sag: 'üstünde'),
                (sol: 'sous', sag: 'altında'),
                (sol: 'devant', sag: 'önünde'),
                (sol: 'derrière', sag: 'arkasında'),
              ],
              aciklama:
                  'dans = içinde, sur = üstünde, sous = altında, devant = önünde, derrière = arkasında.',
            ),
            Isaretle(
              soru: 'Cümledeki aller fiilini işaretle.',
              cumle: 'Ils vont à Paris.',
              dogru: [1],
              aciklama:
                  "vont = aller fiilinin ils çekimi. Cümle: Onlar Paris'e gidiyor.",
            ),
          ],
        ),
      ],
    ),
  ],
);
