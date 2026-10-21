/// Almanca A2: Temel. Dört ünite: Perfekt (geçmiş anlatımı), Dativ ve
/// Wechselpräpositionen, Modal fiiller / Imperativ / yan cümle, Sıfat çekimi /
/// karşılaştırma / refleksif fiiller / günlük durumlar (randevu, sağlık,
/// seyahat, iş). Anlatım Türkçe, içerik Almanca; her Almanca ifadenin
/// Türkçe karşılığı açıklamada verilir. Yaz alıştırmalarında özel harfler
/// yerine ae / oe / ue / ss yazımları da kabul edilir.
///
/// Sesli okuma için Windows'ta de-DE ses paketi kurulu olmalıdır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/icerik.dart';

const String _de = 'de-DE';

const Kurs almancaA2 = Kurs(
  id: 'almanca-2',
  ad: 'Almanca A2: Temel',
  aciklama:
      'A1 sonrası Almanca: Perfekt, Dativ, modal fiiller, yan cümleler, sıfat çekimi ve günlük durumlar.',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'almanca-2.u1',
      ad: 'Perfekt: geçmişi anlatmak',
      dersler: [
        Ders(
          id: 'almanca-2.u1.d1',
          ad: 'Perfekt: haben + Partizip II',
          dilbilgisiNotu:
              'Perfekt = haben/sein (ikinci sırada) + Partizip II (cümle sonunda). Düzenli fiillerde Partizip II: ge- + kök + -t (machen → gemacht).',
          alistirmalar: [
            Secim(
              soru: 'Perfekt (konuşma dilinde geçmiş) nasıl kurulur?',
              secenekler: [
                'haben/sein + Partizip II',
                'werden + mastar',
                'sein + zu + mastar',
              ],
              dogru: 0,
              aciklama:
                  'Perfekt, haben veya sein (çekimli) + Partizip II ile kurulur: Ich habe gemacht (yaptım).',
            ),
            Secim(
              soru: '"spielen" (oynamak) fiilinin Partizip II hâli hangisi?',
              secenekler: ['gespielt', 'spielt', 'gespielen'],
              dogru: 0,
              aciklama:
                  'Düzenli fiil: ge- + kök + -t = gespielt (oynadı/oynamış).',
            ),
            Bosluk(
              soru: 'Gestern ___ ich Tennis gespielt.',
              secenekler: ['habe', 'bin', 'hast'],
              dogru: 0,
              aciklama:
                  '"Dün tenis oynadım." ich ile haben: ich habe. Çekimli fiil ikinci sırada kalır.',
            ),
            Bosluk(
              soru: 'Wir haben Pizza ___.',
              secenekler: ['gemacht', 'gemachen', 'machen'],
              dogru: 0,
              aciklama: '"Pizza yaptık." machen → gemacht, cümlenin sonunda.',
            ),
            Yaz(
              soru: 'Almancaya çevir: Dün Almanca öğrendim.',
              cevaplar: [
                'Ich habe gestern Deutsch gelernt',
                'Gestern habe ich Deutsch gelernt',
              ],
              aciklama:
                  'Ich habe gestern Deutsch gelernt. lernen → gelernt; haben ikinci sırada.',
            ),
            Sirala(
              soru: 'Sıraya diz: O kahve pişirdi (kaynattı).',
              kelimeler: ['gekocht', 'Sie', 'Kaffee', 'hat'],
              dogru: ['Sie', 'hat', 'Kaffee', 'gekocht'],
              aciklama:
                  'Sie hat Kaffee gekocht. Partizip II en sonda: gekocht (pişirdi).',
            ),
            Eslestir(
              soru: 'Mastarı Partizip II ile eşleştir.',
              ciftler: [
                (sol: 'machen (yapmak)', sag: 'gemacht'),
                (sol: 'lernen (öğrenmek)', sag: 'gelernt'),
                (sol: 'kaufen (satın almak)', sag: 'gekauft'),
                (sol: 'spielen (oynamak)', sag: 'gespielt'),
                (sol: 'arbeiten (çalışmak)', sag: 'gearbeitet'),
              ],
              aciklama:
                  'Düzenli fiiller ge-...-t alır; kökü -t/-d ile biten fiillerde -et gelir: gearbeitet.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Ich habe Brot gekauft.',
              secenekler: [
                'Ich habe Brot gemacht.',
                'Ich habe Brot gekauft.',
                'Ich kaufe Brot.',
              ],
              dogru: 1,
              dil: _de,
              aciklama: 'Ich habe Brot gekauft: Ekmek satın aldım.',
            ),
            Tablo(
              soru: 'haben fiilini çekimle: kaufen (Perfekt).',
              baslik: ['Özne', 'haben', 'Partizip II'],
              satirlar: [
                ['ich', 'habe', 'gekauft'],
                ['du', 'hast', 'gekauft'],
                ['er', 'hat', 'gekauft'],
                ['wir', 'haben', 'gekauft'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
                (satir: 3, sutun: 1),
              ],
              secenekler: ['habe', 'hast', 'hat', 'haben'],
              aciklama:
                  'ich habe, du hast, er hat, wir haben gekauft (aldım, aldın, aldı, aldık).',
            ),
            Isaretle(
              soru: 'Yardımcı fiili ve Partizip II’yi işaretle.',
              cumle: 'Wir haben gestern Fußball gespielt',
              dogru: [1, 4],
              aciklama:
                  'haben (yardımcı fiil) ve gespielt (Partizip II). "Dün futbol oynadık."',
            ),
          ],
        ),
        Ders(
          id: 'almanca-2.u1.d2',
          ad: 'Perfekt: sein + Partizip II',
          dilbilgisiNotu:
              'Yer değiştirme (gehen, fahren, kommen, fliegen) ve durum değişikliği/kalma (bleiben, sein) bildiren fiiller Perfekt’te sein alır: Ich bin gegangen.',
          alistirmalar: [
            Secim(
              soru: 'Hangi fiiller Perfekt’te genellikle sein ile kullanılır?',
              secenekler: [
                'Hareket ve durum değişikliği bildirenler (gehen, fahren)',
                'Bütün düzenli fiiller',
                'Yalnız modal fiiller',
              ],
              dogru: 0,
              aciklama:
                  'gehen, fahren, kommen, fliegen gibi hareket fiilleri sein alır: Ich bin gefahren (gittim/sürdüm).',
            ),
            Secim(
              soru: '"gehen" (gitmek) fiilinin Partizip II hâli hangisi?',
              secenekler: ['gegehen', 'gegangen', 'gegeht'],
              dogru: 1,
              aciklama: 'gehen düzensizdir: gegangen (gitti/gitmiş).',
            ),
            Bosluk(
              soru: 'Er ___ gestern nach Hause gefahren.',
              secenekler: ['ist', 'hat', 'habe'],
              dogru: 0,
              aciklama:
                  '"O dün eve gitti (araçla)." fahren hareket fiilidir: er ist gefahren.',
            ),
            Bosluk(
              soru: 'Wir sind in Istanbul ___.',
              secenekler: ['bleiben', 'geblieben', 'gebleibt'],
              dogru: 1,
              aciklama: '"İstanbul’da kaldık." bleiben → geblieben (sein ile).',
            ),
            Yaz(
              soru: 'Almancaya çevir: Dün Berlin’e gittim. (gehen)',
              cevaplar: [
                'Ich bin gestern nach Berlin gegangen',
                'Gestern bin ich nach Berlin gegangen',
              ],
              aciklama:
                  'Ich bin gestern nach Berlin gegangen. Şehre giderken nach kullanılır.',
            ),
            Sirala(
              soru: 'Sıraya diz: Hamburg’a gittik (araçla).',
              kelimeler: ['gefahren', 'Wir', 'nach', 'sind', 'Hamburg'],
              dogru: ['Wir', 'sind', 'nach', 'Hamburg', 'gefahren'],
              aciklama: 'Wir sind nach Hamburg gefahren. sein ikinci sırada.',
            ),
            Eslestir(
              soru: 'Mastarı Partizip II ile eşleştir.',
              ciftler: [
                (sol: 'fliegen (uçmak)', sag: 'geflogen'),
                (sol: 'kommen (gelmek)', sag: 'gekommen'),
                (sol: 'fahren (gitmek, sürmek)', sag: 'gefahren'),
                (sol: 'bleiben (kalmak)', sag: 'geblieben'),
                (sol: 'sein (olmak)', sag: 'gewesen'),
              ],
              aciklama:
                  'Hepsi sein ile kurulur ve düzensizdir: geflogen, gekommen, gefahren, geblieben, gewesen.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Er ist nach Hause gegangen.',
              secenekler: [
                'Er ist zu Hause geblieben.',
                'Er ist nach Hause gefahren.',
                'Er ist nach Hause gegangen.',
              ],
              dogru: 2,
              dil: _de,
              aciklama: 'Er ist nach Hause gegangen: O eve gitti (yürüyerek).',
            ),
            Tablo(
              soru: 'sein fiilini çekimle: fahren (Perfekt).',
              baslik: ['Özne', 'sein', 'Partizip II'],
              satirlar: [
                ['ich', 'bin', 'gefahren'],
                ['du', 'bist', 'gefahren'],
                ['sie (o)', 'ist', 'gefahren'],
                ['ihr', 'seid', 'gefahren'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
                (satir: 3, sutun: 1),
              ],
              secenekler: ['bin', 'bist', 'ist', 'seid'],
              aciklama:
                  'ich bin, du bist, sie ist, ihr seid gefahren (gittim, gittin, gitti, gittiniz).',
            ),
            Isaretle(
              soru: 'Yardımcı fiili ve Partizip II’yi işaretle.',
              cumle: 'Ich bin gestern spät nach Hause gekommen',
              dogru: [1, 6],
              aciklama:
                  'bin (yardımcı fiil) ve gekommen. "Dün eve geç geldim."',
            ),
          ],
        ),
        Ders(
          id: 'almanca-2.u1.d3',
          ad: 'Düzensiz fiiller ve geçmişi anlatmak',
          dilbilgisiNotu:
              'Düzensiz (güçlü) fiillerde Partizip II ge-...-en olur ve kök değişebilir: trinken → getrunken. Ayrılabilen fiillerde ge- ortaya girer: aufstehen → aufgestanden. be-, ver-, -ieren fiillerinde ge- gelmez: besucht, telefoniert.',
          alistirmalar: [
            Secim(
              soru: '"essen" (yemek) fiilinin Partizip II hâli hangisi?',
              secenekler: ['gegessen', 'geesst', 'gessen'],
              dogru: 0,
              aciklama:
                  'essen düzensizdir: gegessen (yedi). Ich habe gegessen.',
            ),
            Secim(
              soru: '"telefonieren" fiili Partizip II’de ge- alır mı?',
              secenekler: [
                'Evet: getelefoniert',
                'Hayır: telefoniert',
                'Yalnız sein ile: getelefonieren',
              ],
              dogru: 1,
              aciklama:
                  '-ieren ile biten fiiller ge- almaz: Ich habe telefoniert (telefonla konuştum).',
            ),
            Bosluk(
              soru: 'Ich habe einen Film ___.',
              secenekler: ['sehen', 'gesehen', 'gesehent'],
              dogru: 1,
              aciklama: '"Bir film izledim." sehen → gesehen.',
            ),
            Bosluk(
              soru: 'Er hat seine Oma ___.',
              secenekler: ['gebesucht', 'besuchen', 'besucht'],
              dogru: 2,
              aciklama:
                  '"Büyükannesini ziyaret etti." be- ile başlayan fiiller ge- almaz: besucht.',
            ),
            Yaz(
              soru: 'Almancaya çevir: Su içtim.',
              cevaplar: ['Ich habe Wasser getrunken'],
              aciklama: 'Ich habe Wasser getrunken. trinken → getrunken.',
            ),
            Sirala(
              soru: 'Sıraya diz: O bir mektup yazdı.',
              kelimeler: ['geschrieben', 'einen', 'Sie', 'Brief', 'hat'],
              dogru: ['Sie', 'hat', 'einen', 'Brief', 'geschrieben'],
              aciklama:
                  'Sie hat einen Brief geschrieben. schreiben → geschrieben.',
            ),
            Eslestir(
              soru: 'Mastarı Partizip II ile eşleştir.',
              ciftler: [
                (sol: 'trinken (içmek)', sag: 'getrunken'),
                (sol: 'schreiben (yazmak)', sag: 'geschrieben'),
                (sol: 'nehmen (almak)', sag: 'genommen'),
                (sol: 'aufstehen (kalkmak)', sag: 'aufgestanden'),
                (sol: 'besuchen (ziyaret etmek)', sag: 'besucht'),
              ],
              aciklama:
                  'Düzensiz: getrunken, geschrieben, genommen. Ayrılabilen: aufgestanden. be- ile: besucht.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Wir haben Pizza gegessen.',
              secenekler: [
                'Wir haben Pizza bestellt.',
                'Wir haben Pizza gemacht.',
                'Wir haben Pizza gegessen.',
              ],
              dogru: 2,
              dil: _de,
              aciklama: 'Wir haben Pizza gegessen: Pizza yedik.',
            ),
            Tablo(
              soru: 'Her fiil için doğru yardımcı fiili seç.',
              baslik: ['Mastar', 'Partizip II', 'Yardımcı fiil'],
              satirlar: [
                ['trinken', 'getrunken', 'haben'],
                ['gehen', 'gegangen', 'sein'],
                ['sehen', 'gesehen', 'haben'],
                ['bleiben', 'geblieben', 'sein'],
              ],
              bos: [
                (satir: 0, sutun: 2),
                (satir: 1, sutun: 2),
                (satir: 2, sutun: 2),
                (satir: 3, sutun: 2),
              ],
              secenekler: ['haben', 'sein'],
              aciklama:
                  'trinken ve sehen haben alır; gehen ve bleiben sein alır.',
            ),
            Isaretle(
              soru: 'Yardımcı fiili ve Partizip II’yi işaretle.',
              cumle: 'Gestern habe ich einen Film gesehen',
              dogru: [1, 5],
              aciklama:
                  'habe ve gesehen. Zaman belirteci başa gelince fiil yine ikinci sırada kalır: "Dün bir film izledim."',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'almanca-2.u2',
      ad: 'Dativ ve yer/yön edatları',
      dersler: [
        Ders(
          id: 'almanca-2.u2.d1',
          ad: 'Dativ ister: mit, bei, nach, von, zu, aus, seit',
          dilbilgisiNotu:
              'aus, bei, mit, nach, seit, von, zu edatlarından sonra her zaman Dativ gelir. Dativ artikelleri: dem (der/das), der (die), den + n (çoğul).',
          alistirmalar: [
            Secim(
              soru: 'Hangi edat her zaman Dativ ister?',
              secenekler: ['für', 'mit', 'durch'],
              dogru: 1,
              aciklama:
                  'mit (ile) daima Dativ ister. für ve durch ise Akkusativ ister.',
            ),
            Secim(
              soru: '"seit zwei Jahren" ne anlama gelir?',
              secenekler: ['iki yıl önce', 'iki yıl sonra', 'iki yıldır'],
              dogru: 2,
              aciklama:
                  'seit = -den beri: Ich wohne seit zwei Jahren hier (iki yıldır burada yaşıyorum).',
            ),
            Bosluk(
              soru: 'Ich fahre mit ___ Bus.',
              secenekler: ['dem', 'den', 'der'],
              dogru: 0,
              aciklama:
                  '"Otobüsle gidiyorum." der Bus → mit dem Bus (Dativ, eril).',
            ),
            Bosluk(
              soru: 'Sie kommt aus ___ Türkei.',
              secenekler: ['die', 'dem', 'der'],
              dogru: 2,
              aciklama:
                  '"O Türkiye’den geliyor." die Türkei → aus der Türkei (Dativ, dişil).',
            ),
            Yaz(
              soru: 'Almancaya çevir: Doktora gidiyorum.',
              cevaplar: ['Ich gehe zum Arzt', 'Ich gehe zu dem Arzt'],
              aciklama:
                  'Ich gehe zum Arzt. zu + dem = zum; zu kişiye/yere gitmeyi anlatır.',
            ),
            Sirala(
              soru: 'Sıraya diz: Büyükannemin yanında kalıyorum.',
              kelimeler: ['Oma', 'wohne', 'Ich', 'meiner', 'bei'],
              dogru: ['Ich', 'wohne', 'bei', 'meiner', 'Oma'],
              aciklama:
                  'Ich wohne bei meiner Oma. bei = yanında; die Oma → meiner Oma (Dativ).',
            ),
            Eslestir(
              soru: 'Dativ edatını anlamıyla eşleştir.',
              ciftler: [
                (sol: 'mit', sag: 'ile (birlikte)'),
                (sol: 'aus', sag: '-den (içinden, menşe)'),
                (sol: 'seit', sag: '-den beri'),
                (sol: 'zu', sag: '-e, -ye (kişiye, yere)'),
                (sol: 'nach', sag: 'sonra; şehre, ülkeye'),
              ],
              aciklama:
                  'mit dem Auto (arabayla), aus der Stadt (şehirden), seit Montag (pazartesiden beri), zum Arzt (doktora), nach der Arbeit (işten sonra).',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Ich fahre nach Berlin.',
              secenekler: [
                'Ich fahre mit dem Zug.',
                'Ich fahre nach Berlin.',
                'Ich fahre zum Arzt.',
              ],
              dogru: 1,
              dil: _de,
              aciklama: 'Ich fahre nach Berlin: Berlin’e gidiyorum.',
            ),
            Tablo(
              soru: 'Edat örneklerini tamamla.',
              baslik: ['Edat', 'Anlam', 'Örnek'],
              satirlar: [
                ['mit', 'ile', 'mit dem Bus'],
                ['nach', 'sonra', 'nach der Schule'],
                ['seit', '-den beri', 'seit einem Jahr'],
                ['aus', '-den', 'aus der Türkei'],
              ],
              bos: [
                (satir: 0, sutun: 2),
                (satir: 1, sutun: 2),
                (satir: 2, sutun: 2),
                (satir: 3, sutun: 2),
              ],
              secenekler: [
                'mit dem Bus',
                'nach der Schule',
                'seit einem Jahr',
                'aus der Türkei',
              ],
              aciklama:
                  'otobüsle, okuldan sonra, bir yıldır, Türkiye’den. Her edattan sonra Dativ gelir.',
            ),
            Isaretle(
              soru: 'Dativ edatlarını işaretle.',
              cumle: 'Ich wohne seit einem Jahr bei meiner Tante',
              dogru: [2, 5],
              aciklama:
                  'seit (-den beri) ve bei (yanında). "Bir yıldır teyzemin yanında yaşıyorum."',
            ),
          ],
        ),
        Ders(
          id: 'almanca-2.u2.d2',
          ad: 'Dativ: kişi zamirleri ve Dativ fiilleri',
          dilbilgisiNotu:
              'Dativ zamirleri: mir (bana), dir (sana), ihm (ona, erkek/nesne), ihr (ona, kadın), uns, euch, ihnen. helfen, gefallen, gehören, danken, schmecken Dativ ister.',
          alistirmalar: [
            Secim(
              soru: '"der Mann" Dativ’de nasıl olur?',
              secenekler: ['den Mann', 'dem Mann', 'der Mann'],
              dogru: 1,
              aciklama:
                  'Eril ve nötr artikel Dativ’de dem olur: dem Mann (adama).',
            ),
            Secim(
              soru: 'Hangi fiil Dativ ister?',
              secenekler: ['kaufen', 'sehen', 'helfen'],
              dogru: 2,
              aciklama:
                  'helfen (yardım etmek) Dativ ister: Ich helfe dir. kaufen ve sehen Akkusativ ister.',
            ),
            Bosluk(
              soru: 'Das Buch gehört ___.',
              secenekler: ['ich', 'mir', 'mich'],
              dogru: 1,
              aciklama: '"Bu kitap bana ait." gehören Dativ ister: mir.',
            ),
            Bosluk(
              soru: 'Ich gebe ___ Kind einen Apfel.',
              secenekler: ['dem', 'den', 'das'],
              dogru: 0,
              aciklama:
                  '"Çocuğa bir elma veriyorum." das Kind → dem Kind (Dativ nesne).',
            ),
            Yaz(
              soru: 'Almancaya çevir: Bu hoşuma gidiyor.',
              cevaplar: [
                'Das gefällt mir',
                'Das gefaellt mir',
                'Es gefällt mir',
                'Es gefaellt mir',
              ],
              aciklama:
                  'Das gefällt mir. gefallen Dativ ister; kişi mir olur (bana hoş gelir).',
            ),
            Sirala(
              soru: 'Sıraya diz: Bana yardım edebilir misin?',
              kelimeler: ['helfen', 'du', 'Kannst', 'mir'],
              dogru: ['Kannst', 'du', 'mir', 'helfen'],
              aciklama:
                  'Kannst du mir helfen? Modal fiil başta, helfen sonda; mir Dativ.',
            ),
            Eslestir(
              soru: 'Kişi zamirini Dativ hâliyle eşleştir.',
              ciftler: [
                (sol: 'ich (ben)', sag: 'mir (bana)'),
                (sol: 'du (sen)', sag: 'dir (sana)'),
                (sol: 'er (o, erkek)', sag: 'ihm (ona)'),
                (sol: 'sie (o, kadın)', sag: 'ihr (ona, kadın)'),
                (sol: 'wir (biz)', sag: 'uns (bize)'),
              ],
              aciklama:
                  'Dativ zamirleri: mir, dir, ihm, ihr, uns. Örnek: Er hilft ihr (Ona yardım ediyor).',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Das Buch gehört mir.',
              secenekler: [
                'Das Buch gehört dir.',
                'Das Buch gefällt mir.',
                'Das Buch gehört mir.',
              ],
              dogru: 2,
              dil: _de,
              aciklama: 'Das Buch gehört mir: Kitap bana ait.',
            ),
            Tablo(
              soru: 'Dativ zamirlerini tamamla.',
              baslik: ['Nominativ', 'Dativ', 'Anlam'],
              satirlar: [
                ['ich', 'mir', 'bana'],
                ['du', 'dir', 'sana'],
                ['er', 'ihm', 'ona (erkek)'],
                ['sie', 'ihr', 'ona (kadın)'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
                (satir: 3, sutun: 1),
              ],
              secenekler: ['mir', 'dir', 'ihm', 'ihr'],
              aciklama: 'ich → mir, du → dir, er → ihm, sie → ihr.',
            ),
            Isaretle(
              soru: 'Dativ nesne grubunu işaretle.',
              cumle: 'Der Lehrer hilft dem Schüler',
              dogru: [3, 4],
              aciklama:
                  'dem Schüler Dativ’dedir (helfen Dativ ister). "Öğretmen öğrenciye yardım ediyor."',
            ),
          ],
        ),
        Ders(
          id: 'almanca-2.u2.d3',
          ad: 'Wechselpräpositionen: in, an, auf',
          dilbilgisiNotu:
              'in, an, auf, über, unter, vor, hinter, neben, zwischen: Wo? (yer) → Dativ; Wohin? (yön) → Akkusativ. Ich bin in der Küche. Ich gehe in die Küche.',
          alistirmalar: [
            Secim(
              soru: '"Wohin?" (nereye?) sorusunun cevabında hangi hâl gelir?',
              secenekler: ['Genitiv', 'Dativ', 'Akkusativ'],
              dogru: 2,
              aciklama:
                  'Yön (Wohin?) → Akkusativ: Ich gehe in die Stadt (şehre gidiyorum).',
            ),
            Secim(
              soru: '"Wo?" (nerede?) sorusunun cevabında hangi hâl gelir?',
              secenekler: ['Dativ', 'Akkusativ', 'Nominativ'],
              dogru: 0,
              aciklama: 'Yer (Wo?) → Dativ: Ich bin in der Stadt (şehirdeyim).',
            ),
            Bosluk(
              soru: 'Ich gehe in ___ Küche.',
              secenekler: ['die', 'der', 'dem'],
              dogru: 0,
              aciklama:
                  '"Mutfağa gidiyorum." Yön olduğu için Akkusativ: in die Küche.',
            ),
            Bosluk(
              soru: 'Das Buch liegt auf ___ Tisch.',
              secenekler: ['den', 'dem', 'der'],
              dogru: 1,
              aciklama:
                  '"Kitap masanın üstünde duruyor." Yer olduğu için Dativ: auf dem Tisch.',
            ),
            Yaz(
              soru: 'Almancaya çevir: Okuldayım.',
              cevaplar: ['Ich bin in der Schule'],
              aciklama: 'Ich bin in der Schule. Yer (Wo?) → in der (Dativ).',
            ),
            Sirala(
              soru: 'Sıraya diz: Kitabı masanın üstüne koyuyorum.',
              kelimeler: ['den', 'lege', 'Ich', 'auf', 'Tisch', 'das', 'Buch'],
              dogru: ['Ich', 'lege', 'das', 'Buch', 'auf', 'den', 'Tisch'],
              aciklama:
                  'Ich lege das Buch auf den Tisch. Yön (Wohin?) → Akkusativ: den Tisch.',
            ),
            Eslestir(
              soru: 'Edatı anlamıyla eşleştir.',
              ciftler: [
                (sol: 'in', sag: 'içinde, içine'),
                (sol: 'an', sag: 'kenarında, yanına'),
                (sol: 'auf', sag: 'üstünde, üstüne'),
                (sol: 'unter', sag: 'altında, altına'),
                (sol: 'vor', sag: 'önünde, önüne'),
              ],
              aciklama:
                  'Hepsi hem Wo? (Dativ) hem Wohin? (Akkusativ) sorusuna cevap verebilir.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Die Katze sitzt auf dem Sofa.',
              secenekler: [
                'Die Katze springt auf das Sofa.',
                'Die Katze sitzt auf dem Sofa.',
                'Die Katze schläft unter dem Sofa.',
              ],
              dogru: 1,
              dil: _de,
              aciklama:
                  'Die Katze sitzt auf dem Sofa: Kedi kanepenin üstünde oturuyor.',
            ),
            Tablo(
              soru: 'Soru kelimesine uygun hâli seç.',
              baslik: ['Soru', 'Hâl', 'Örnek'],
              satirlar: [
                ['Wo?', 'Dativ', 'Ich bin in der Stadt'],
                ['Wohin?', 'Akkusativ', 'Ich gehe in die Stadt'],
                ['Wo?', 'Dativ', 'Das Bild hängt an der Wand'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: ['Dativ', 'Akkusativ'],
              aciklama:
                  'Şehirdeyim (Dativ), şehre gidiyorum (Akkusativ), resim duvarda asılı (Dativ).',
            ),
            Isaretle(
              soru: 'Yön bildiren (Wohin?) edat grubunu işaretle.',
              cumle: 'Ich hänge das Bild an die Wand',
              dogru: [4, 5, 6],
              aciklama:
                  'an die Wand: Akkusativ (duvara). "Resmi duvara asıyorum."',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'almanca-2.u3',
      ad: 'Modal fiiller, Imperativ ve yan cümle',
      dersler: [
        Ders(
          id: 'almanca-2.u3.d1',
          ad: 'Modal fiiller: müssen, dürfen, sollen, wollen',
          dilbilgisiNotu:
              'Modal fiil ikinci sırada çekimlenir, ana fiil mastar olarak cümle sonuna gider: Ich muss heute arbeiten. ich ve er aynı biçimi alır (ek yok): muss, darf, soll, will.',
          alistirmalar: [
            Secim(
              soru: '"müssen" ne anlama gelir?',
              secenekler: ['-meli, zorunda olmak', 'istemek', 'izinli olmak'],
              dogru: 0,
              aciklama:
                  'müssen = zorunda olmak: Ich muss lernen (öğrenmek zorundayım).',
            ),
            Secim(
              soru: 'Modal fiilli cümlede ana fiil nerede durur?',
              secenekler: [
                'İkinci sırada',
                'Cümle sonunda (mastar)',
                'Cümle başında',
              ],
              dogru: 1,
              aciklama:
                  'Ana fiil mastar olarak sona gider: Du darfst hier parken (burada park edebilirsin).',
            ),
            Bosluk(
              soru: 'Ich ___ heute arbeiten.',
              secenekler: ['muss', 'musst', 'müssen'],
              dogru: 0,
              aciklama:
                  '"Bugün çalışmak zorundayım." ich muss (ich ve er aynı biçim).',
            ),
            Bosluk(
              soru: 'Hier ___ man nicht rauchen.',
              secenekler: ['darfst', 'dürfen', 'darf'],
              dogru: 2,
              aciklama:
                  '"Burada sigara içilmez." man ile darf; nicht darf = yasak.',
            ),
            Yaz(
              soru: 'Almancaya çevir: Almanca öğrenmek istiyorum.',
              cevaplar: [
                'Ich will Deutsch lernen',
                'Ich möchte Deutsch lernen',
                'Ich moechte Deutsch lernen',
              ],
              aciklama:
                  'Ich will Deutsch lernen. wollen = istemek; lernen mastar, sonda.',
            ),
            Sirala(
              soru: 'Sıraya diz: Daha fazla su içmelisin.',
              kelimeler: ['trinken', 'Du', 'mehr', 'sollst', 'Wasser'],
              dogru: ['Du', 'sollst', 'mehr', 'Wasser', 'trinken'],
              aciklama:
                  'Du sollst mehr Wasser trinken. sollen = -meli (tavsiye/görev).',
            ),
            Eslestir(
              soru: 'Modal fiili anlamıyla eşleştir.',
              ciftler: [
                (sol: 'müssen', sag: 'zorunda olmak'),
                (sol: 'dürfen', sag: 'izinli olmak'),
                (sol: 'sollen', sag: '-meli (görev, tavsiye)'),
                (sol: 'wollen', sag: 'istemek'),
                (sol: 'können', sag: 'yapabilmek'),
              ],
              aciklama:
                  'müssen (zorunluluk), dürfen (izin), sollen (tavsiye), wollen (istek), können (yetenek).',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Ich muss heute arbeiten.',
              secenekler: [
                'Ich will heute arbeiten.',
                'Ich darf heute arbeiten.',
                'Ich muss heute arbeiten.',
              ],
              dogru: 2,
              dil: _de,
              aciklama: 'Ich muss heute arbeiten: Bugün çalışmak zorundayım.',
            ),
            Tablo(
              soru: 'müssen ve wollen çekimlerini tamamla.',
              baslik: ['Özne', 'müssen', 'wollen'],
              satirlar: [
                ['ich', 'muss', 'will'],
                ['du', 'musst', 'willst'],
                ['er', 'muss', 'will'],
                ['wir', 'müssen', 'wollen'],
              ],
              bos: [
                (satir: 1, sutun: 1),
                (satir: 1, sutun: 2),
                (satir: 2, sutun: 2),
                (satir: 3, sutun: 1),
              ],
              secenekler: ['musst', 'willst', 'will', 'müssen'],
              aciklama:
                  'du musst / du willst; er will; wir müssen. ich ve er için biçim aynıdır.',
            ),
            Isaretle(
              soru: 'Modal fiili ve ana fiili işaretle.',
              cumle: 'Du darfst hier nicht parken',
              dogru: [1, 4],
              aciklama:
                  'darfst (modal) ve parken (mastar). "Burada park edemezsin (yasak)."',
            ),
          ],
        ),
        Ders(
          id: 'almanca-2.u3.d2',
          ad: 'Imperativ: emir kipi',
          dilbilgisiNotu:
              'du: kök (Komm!); ihr: -t (Kommt!); Sie: mastar + Sie (Kommen Sie!). Düzensiz: nehmen → Nimm!, sprechen → Sprich!, lesen → Lies!, sein → Sei! / Seid! / Seien Sie!',
          alistirmalar: [
            Secim(
              soru: '"kommen" fiilinin du için Imperativ’i hangisi?',
              secenekler: ['Kommst!', 'Komm!', 'Kommen!'],
              dogru: 1,
              aciklama: 'du Imperativ’inde -st düşer: Komm! (Gel!).',
            ),
            Secim(
              soru: '"sprechen" fiilinin du için Imperativ’i hangisi?',
              secenekler: ['Sprechst!', 'Sprech!', 'Sprich!'],
              dogru: 2,
              aciklama:
                  'e → i değişen fiillerde değişim korunur: Sprich! (Konuş!).',
            ),
            Bosluk(
              soru: '___ Sie bitte Platz!',
              secenekler: ['Nehmen', 'Nimm', 'Nehmt'],
              dogru: 0,
              aciklama:
                  '"Lütfen oturun." Sie biçimi: mastar + Sie → Nehmen Sie.',
            ),
            Bosluk(
              soru: '(ihr) ___ leise, bitte!',
              secenekler: ['Sei', 'Sind', 'Seid'],
              dogru: 2,
              aciklama:
                  '"Sessiz olun, lütfen." sein için ihr Imperativ’i: Seid!',
            ),
            Yaz(
              soru: 'Almancaya çevir: Pencereyi aç! (du)',
              cevaplar: [
                'Mach das Fenster auf',
                'Öffne das Fenster',
                'Oeffne das Fenster',
              ],
              aciklama:
                  'Mach das Fenster auf! aufmachen ayrılır: auf sona gider.',
            ),
            Sirala(
              soru: 'Sıraya diz: Lütfen kapıyı açın.',
              kelimeler: ['die', 'Öffnen', 'bitte', 'Tür', 'Sie'],
              dogru: ['Öffnen', 'Sie', 'bitte', 'die', 'Tür'],
              aciklama: 'Öffnen Sie bitte die Tür. Resmi emir: fiil + Sie.',
            ),
            Eslestir(
              soru: 'Emri anlamıyla eşleştir.',
              ciftler: [
                (sol: 'Komm!', sag: 'Gel! (sen)'),
                (sol: 'Kommt!', sag: 'Gelin! (sizler, samimi)'),
                (sol: 'Kommen Sie!', sag: 'Gelin! (resmî)'),
                (sol: 'Sei ruhig!', sag: 'Sakin ol!'),
                (sol: 'Warte!', sag: 'Bekle!'),
              ],
              aciklama:
                  'du, ihr ve Sie için üç farklı emir biçimi vardır; sein düzensizdir: Sei!',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Komm bitte schnell.',
              secenekler: [
                'Kommen Sie bitte schnell.',
                'Komm bitte später.',
                'Komm bitte schnell.',
              ],
              dogru: 2,
              dil: _de,
              aciklama: 'Komm bitte schnell: Lütfen çabuk gel.',
            ),
            Tablo(
              soru: 'Imperativ biçimlerini tamamla.',
              baslik: ['Mastar', 'du', 'ihr'],
              satirlar: [
                ['kommen', 'Komm', 'Kommt'],
                ['machen', 'Mach', 'Macht'],
                ['warten', 'Warte', 'Wartet'],
                ['nehmen', 'Nimm', 'Nehmt'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 2),
                (satir: 2, sutun: 1),
                (satir: 3, sutun: 1),
              ],
              secenekler: ['Komm', 'Macht', 'Warte', 'Nimm'],
              aciklama:
                  'Komm! Macht! Warte! (kök -t/-d ile bitince -e gelir) Nimm! (düzensiz).',
            ),
            Isaretle(
              soru: 'İki emir fiilini işaretle.',
              cumle: 'Bitte nimm die Tasche und geh nach Hause',
              dogru: [1, 5],
              aciklama: 'nimm ve geh. "Lütfen çantayı al ve eve git."',
            ),
          ],
        ),
        Ders(
          id: 'almanca-2.u3.d3',
          ad: 'Yan cümle: weil, dass, wenn ve zu + mastar',
          dilbilgisiNotu:
              'weil, dass, wenn, ob ile başlayan yan cümlede çekimli fiil cümlenin sonuna gider: Ich bleibe zu Hause, weil ich krank bin. zu + mastar: Ich habe keine Zeit, das Buch zu lesen.',
          alistirmalar: [
            Secim(
              soru:
                  '"weil" ile başlayan yan cümlede çekimli fiil nerede durur?',
              secenekler: ['Başta', 'İkinci sırada', 'Cümlenin sonunda'],
              dogru: 2,
              aciklama:
                  'weil çünkü demektir ve fiili sona iter: ..., weil er müde ist.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'Ich habe Zeit, ins Kino zu gehen.',
                'Ich habe Zeit, ins Kino gehen zu.',
                'Ich habe Zeit, zu ins Kino gehen.',
              ],
              dogru: 0,
              aciklama:
                  'zu mastarın hemen önüne gelir: ... zu gehen. "Sinemaya gitmek için vaktim var."',
            ),
            Bosluk(
              soru: 'Ich bleibe zu Hause, weil ich krank ___.',
              secenekler: ['ich', 'bin', 'bist'],
              dogru: 1,
              aciklama:
                  '"Hasta olduğum için evde kalıyorum." Fiil sonda: weil ich krank bin.',
            ),
            Bosluk(
              soru: 'Ich glaube, ___ er heute kommt.',
              secenekler: ['dass', 'weil', 'ob'],
              dogru: 0,
              aciklama:
                  '"Bence bugün geliyor." dass = ki/-dığını; fiil sonda: dass er kommt.',
            ),
            Yaz(
              soru: 'Almancaya çevir: Yorgun olduğum için evde kalıyorum.',
              cevaplar: [
                'Ich bleibe zu Hause, weil ich müde bin',
                'Ich bleibe zu Hause weil ich müde bin',
                'Ich bleibe zu Hause, weil ich muede bin',
                'Ich bleibe zu Hause weil ich muede bin',
              ],
              aciklama:
                  'Ich bleibe zu Hause, weil ich müde bin. weil sonrası fiil (bin) sonda.',
            ),
            Sirala(
              soru: 'Sıraya diz: Bugün geldiğini biliyorum.',
              kelimeler: ['kommt', 'dass', 'Ich', 'heute', 'er', 'weiß'],
              dogru: ['Ich', 'weiß', 'dass', 'er', 'heute', 'kommt'],
              aciklama:
                  'Ich weiß, dass er heute kommt. "Onun bugün geldiğini biliyorum."',
            ),
            Eslestir(
              soru: 'Bağlacı anlamıyla eşleştir.',
              ciftler: [
                (sol: 'weil', sag: 'çünkü'),
                (sol: 'dass', sag: 'ki, -dığını'),
                (sol: 'wenn', sag: 'eğer, -dığında'),
                (sol: 'ob', sag: '-ip -mediğini'),
                (sol: 'aber', sag: 'ama (fiil sırası değişmez)'),
              ],
              aciklama:
                  'weil, dass, wenn, ob fiili sona iter; aber ve und ise fiil sırasını değiştirmez.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Ich komme nicht, weil ich arbeiten muss.',
              secenekler: [
                'Ich komme nicht, weil ich krank bin.',
                'Ich komme nicht, weil ich arbeiten muss.',
                'Ich komme, wenn ich arbeiten muss.',
              ],
              dogru: 1,
              dil: _de,
              aciklama:
                  'Ich komme nicht, weil ich arbeiten muss: Çalışmak zorunda olduğum için gelmiyorum.',
            ),
            Tablo(
              soru: 'Bağlaçların anlamlarını tamamla.',
              baslik: ['Bağlaç', 'Anlam'],
              satirlar: [
                ['weil', 'çünkü'],
                ['dass', 'ki, -dığını'],
                ['wenn', 'eğer, -dığında'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
              ],
              secenekler: ['çünkü', 'ki, -dığını', 'eğer, -dığında'],
              aciklama:
                  'weil = çünkü, dass = ki/-dığını, wenn = eğer/-dığında.',
            ),
            Isaretle(
              soru: 'zu + mastar yapısını işaretle.',
              cumle: 'Ich habe keine Zeit, das Buch zu lesen',
              dogru: [6, 7],
              aciklama: 'zu lesen: zu + mastar. "Kitabı okumaya vaktim yok."',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'almanca-2.u4',
      ad: 'Sıfatlar, refleksif fiiller ve günlük durumlar',
      dersler: [
        Ders(
          id: 'almanca-2.u4.d1',
          ad: 'Sıfat çekimi ve karşılaştırma',
          dilbilgisiNotu:
              'ein ile Nominativ: ein großer Mann (eril -er), eine kleine Wohnung (dişil -e), ein neues Auto (nötr -es). Karşılaştırma: schnell – schneller – am schnellsten; "als" ile karşılaştırılır.',
          alistirmalar: [
            Secim(
              soru: 'ein ___ Mann (büyük): doğru sıfat hangisi?',
              secenekler: ['großer', 'große', 'großes'],
              dogru: 0,
              aciklama:
                  'ein + eril Nominativ: -er. ein großer Mann (büyük bir adam).',
            ),
            Secim(
              soru: '"schnell" sıfatının Komparativ hâli hangisi?',
              secenekler: ['schnellste', 'schneller', 'am schnellsten'],
              dogru: 1,
              aciklama:
                  'schnell – schneller (daha hızlı) – am schnellsten (en hızlı).',
            ),
            Bosluk(
              soru: 'Das ist ein ___ Auto.',
              secenekler: ['neuer', 'neue', 'neues'],
              dogru: 2,
              aciklama: '"Bu yeni bir araba." das Auto nötr: ein neues Auto.',
            ),
            Bosluk(
              soru: 'Mein Bruder ist ___ als ich.',
              secenekler: ['älter', 'alt', 'am ältesten'],
              dogru: 0,
              aciklama:
                  '"Ağabeyim benden büyük." Karşılaştırmada Komparativ + als: älter als.',
            ),
            Yaz(
              soru: 'Almancaya çevir: Berlin Hamburg’dan büyüktür.',
              cevaplar: [
                'Berlin ist größer als Hamburg',
                'Berlin ist groesser als Hamburg',
              ],
              aciklama:
                  'Berlin ist größer als Hamburg. groß → größer (ö/ü/ä değişimi).',
            ),
            Sirala(
              soru: 'Sıraya diz: Onun küçük bir dairesi var.',
              kelimeler: ['kleine', 'hat', 'Wohnung', 'eine', 'Sie'],
              dogru: ['Sie', 'hat', 'eine', 'kleine', 'Wohnung'],
              aciklama:
                  'Sie hat eine kleine Wohnung. Akkusativ’de de dişil: eine kleine.',
            ),
            Eslestir(
              soru: 'Sıfatı Komparativ hâliyle eşleştir.',
              ciftler: [
                (sol: 'gut (iyi)', sag: 'besser (daha iyi)'),
                (sol: 'viel (çok)', sag: 'mehr (daha çok)'),
                (sol: 'gern (severek)', sag: 'lieber (tercihen)'),
                (sol: 'hoch (yüksek)', sag: 'höher (daha yüksek)'),
                (sol: 'groß (büyük)', sag: 'größer (daha büyük)'),
              ],
              aciklama:
                  'Düzensiz karşılaştırmalar: gut–besser, viel–mehr, gern–lieber, hoch–höher.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Das ist die beste Pizza.',
              secenekler: [
                'Das ist eine große Pizza.',
                'Das ist die billigste Pizza.',
                'Das ist die beste Pizza.',
              ],
              dogru: 2,
              dil: _de,
              aciklama: 'Das ist die beste Pizza: Bu en iyi pizza.',
            ),
            Tablo(
              soru: 'Karşılaştırma derecelerini tamamla.',
              baslik: ['Sıfat', 'Komparativ', 'Superlativ'],
              satirlar: [
                ['schnell', 'schneller', 'am schnellsten'],
                ['gut', 'besser', 'am besten'],
                ['groß', 'größer', 'am größten'],
                ['viel', 'mehr', 'am meisten'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 2),
                (satir: 2, sutun: 2),
                (satir: 3, sutun: 1),
              ],
              secenekler: ['schneller', 'am besten', 'am größten', 'mehr'],
              aciklama:
                  'daha hızlı, en iyi, en büyük, daha çok. Superlativ am ...-sten biçimindedir.',
            ),
            Isaretle(
              soru: 'Karşılaştırma yapan iki kelimeyi işaretle.',
              cumle: 'Mein Auto ist schneller als dein Auto',
              dogru: [3, 4],
              aciklama:
                  'schneller als = -den daha hızlı. "Benim arabam seninkinden daha hızlı."',
            ),
          ],
        ),
        Ders(
          id: 'almanca-2.u4.d2',
          ad: 'Refleksif fiiller ve Präteritum: war, hatte',
          dilbilgisiNotu:
              'Refleksif fiil: ich wasche mich, du wäschst dich, er wäscht sich, wir treffen uns. Präteritum: ich war / hatte, du warst / hattest, wir waren / hatten, ihr wart / hattet.',
          alistirmalar: [
            Secim(
              soru: '"Ich wasche ___" cümlesinde hangi zamir gelir?',
              secenekler: ['sich', 'mich', 'uns'],
              dogru: 1,
              aciklama: 'ich ile mich kullanılır: Ich wasche mich (yıkanırım).',
            ),
            Secim(
              soru: '"sein" fiilinin ich için Präteritum hâli hangisi?',
              secenekler: ['wurde', 'bin', 'war'],
              dogru: 2,
              aciklama:
                  'ich war = idim/ydım. Gestern war ich zu Hause (dün evdeydim).',
            ),
            Bosluk(
              soru: 'Wir treffen ___ um acht Uhr.',
              secenekler: ['sich', 'uns', 'euch'],
              dogru: 1,
              aciklama:
                  '"Saat sekizde buluşuyoruz." wir ile uns: wir treffen uns.',
            ),
            Bosluk(
              soru: 'Gestern ___ ich sehr müde.',
              secenekler: ['war', 'bin', 'hatte'],
              dogru: 0,
              aciklama: '"Dün çok yorgundum." sein Präteritum: ich war müde.',
            ),
            Yaz(
              soru: 'Almancaya çevir: Dün vaktim yoktu.',
              cevaplar: [
                'Ich hatte gestern keine Zeit',
                'Gestern hatte ich keine Zeit',
              ],
              aciklama:
                  'Ich hatte gestern keine Zeit. haben Präteritum: ich hatte.',
            ),
            Sirala(
              soru: 'Sıraya diz: O tatile seviniyor.',
              kelimeler: ['Urlaub', 'sich', 'Er', 'freut', 'den', 'auf'],
              dogru: ['Er', 'freut', 'sich', 'auf', 'den', 'Urlaub'],
              aciklama:
                  'Er freut sich auf den Urlaub. sich freuen auf + Akkusativ = (bir şeye) sevinmek.',
            ),
            Eslestir(
              soru: 'Refleksif fiili anlamıyla eşleştir.',
              ciftler: [
                (sol: 'sich freuen', sag: 'sevinmek'),
                (sol: 'sich waschen', sag: 'yıkanmak'),
                (sol: 'sich treffen', sag: 'buluşmak'),
                (sol: 'sich setzen', sag: 'oturmak'),
                (sol: 'sich erinnern', sag: 'hatırlamak'),
              ],
              aciklama:
                  'Bu fiillerde zamir özneye göre değişir: mich, dich, sich, uns, euch, sich.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Wir waren gestern im Kino.',
              secenekler: [
                'Wir waren gestern im Park.',
                'Wir waren gestern im Kino.',
                'Wir sind gestern im Kino.',
              ],
              dogru: 1,
              dil: _de,
              aciklama: 'Wir waren gestern im Kino: Dün sinemadaydık.',
            ),
            Tablo(
              soru: 'Präteritum çekimlerini tamamla.',
              baslik: ['Özne', 'sein', 'haben'],
              satirlar: [
                ['ich', 'war', 'hatte'],
                ['du', 'warst', 'hattest'],
                ['wir', 'waren', 'hatten'],
                ['ihr', 'wart', 'hattet'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 2),
                (satir: 2, sutun: 1),
                (satir: 3, sutun: 2),
              ],
              secenekler: ['war', 'hattest', 'waren', 'hattet'],
              aciklama:
                  'ich war, du hattest, wir waren, ihr hattet. sein ve haben konuşmada Präteritum ile kullanılır.',
            ),
            Isaretle(
              soru: 'Refleksif zamiri işaretle.',
              cumle: 'Wir haben uns gestern getroffen',
              dogru: [2],
              aciklama:
                  'uns refleksif zamirdir. "Dün buluştuk." Refleksif fiiller Perfekt’te haben alır.',
            ),
          ],
        ),
        Ders(
          id: 'almanca-2.u4.d3',
          ad: 'Randevu, sağlık, seyahat ve iş',
          dilbilgisiNotu:
              'Günlük kalıplar: Ich möchte einen Termin. Ich habe Schmerzen. Eine Fahrkarte nach ..., bitte. Ich arbeite als ... (olarak çalışıyorum).',
          alistirmalar: [
            Secim(
              soru: '"Ich habe Kopfschmerzen." ne anlama gelir?',
              secenekler: ['Karnım ağrıyor.', 'Ateşim var.', 'Başım ağrıyor.'],
              dogru: 2,
              aciklama:
                  'Kopfschmerzen = baş ağrısı. Ich habe Kopfschmerzen: Başım ağrıyor.',
            ),
            Secim(
              soru: '"Wann haben Sie Zeit?" ne anlama gelir?',
              secenekler: [
                'Ne zaman vaktiniz var?',
                'Nerede çalışıyorsunuz?',
                'Kaç yaşındasınız?',
              ],
              dogru: 0,
              aciklama:
                  'Randevu konuşmasında sorulur: Wann haben Sie Zeit? (Ne zaman vaktiniz var?)',
            ),
            Bosluk(
              soru: 'Ich möchte einen ___ beim Arzt.',
              secenekler: ['Fahrkarte', 'Termin', 'Tablette'],
              dogru: 1,
              aciklama:
                  '"Doktordan randevu almak istiyorum." der Termin = randevu.',
            ),
            Bosluk(
              soru: 'Eine ___ nach München, bitte.',
              secenekler: ['Fahrkarte', 'Bewerbung', 'Termin'],
              dogru: 0,
              aciklama: '"Münih’e bir bilet lütfen." die Fahrkarte = bilet.',
            ),
            Yaz(
              soru: 'Almancaya çevir: Ateşim var.',
              cevaplar: ['Ich habe Fieber'],
              aciklama: 'Ich habe Fieber. das Fieber = ateş.',
            ),
            Sirala(
              soru: 'Sıraya diz: İki yıldır öğretmen olarak çalışıyorum.',
              kelimeler: [
                'als',
                'Ich',
                'Jahren',
                'arbeite',
                'zwei',
                'seit',
                'Lehrer',
              ],
              dogru: [
                'Ich',
                'arbeite',
                'seit',
                'zwei',
                'Jahren',
                'als',
                'Lehrer',
              ],
              aciklama:
                  'Ich arbeite seit zwei Jahren als Lehrer. seit + Dativ (Jahren), als = olarak.',
            ),
            Eslestir(
              soru: 'Sözcüğü Türkçesiyle eşleştir.',
              ciftler: [
                (sol: 'der Termin', sag: 'randevu'),
                (sol: 'der Arzt', sag: 'doktor'),
                (sol: 'die Fahrkarte', sag: 'bilet'),
                (sol: 'das Fieber', sag: 'ateş'),
                (sol: 'die Arbeit', sag: 'iş'),
              ],
              aciklama:
                  'Günlük hayat sözcükleri: Termin, Arzt, Fahrkarte, Fieber, Arbeit.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Ich habe morgen einen Termin beim Arzt.',
              secenekler: [
                'Ich habe heute einen Termin beim Arzt.',
                'Ich habe morgen einen Termin bei der Bank.',
                'Ich habe morgen einen Termin beim Arzt.',
              ],
              dogru: 2,
              dil: _de,
              aciklama:
                  'Ich habe morgen einen Termin beim Arzt: Yarın doktorda randevum var.',
            ),
            Tablo(
              soru: 'Durum ve kalıbı eşleştir.',
              baslik: ['Durum', 'Almanca'],
              satirlar: [
                ['Randevu istemek', 'Ich möchte einen Termin.'],
                ['Ağrı bildirmek', 'Ich habe Schmerzen.'],
                ['Bilet istemek', 'Eine Fahrkarte, bitte.'],
                ['Mesleği söylemek', 'Ich arbeite als Verkäufer.'],
              ],
              bos: [
                (satir: 0, sutun: 1),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
                (satir: 3, sutun: 1),
              ],
              secenekler: [
                'Ich möchte einen Termin.',
                'Ich habe Schmerzen.',
                'Eine Fahrkarte, bitte.',
                'Ich arbeite als Verkäufer.',
              ],
              aciklama:
                  'Randevu almak istiyorum. / Ağrım var. / Bir bilet lütfen. / Satıcı olarak çalışıyorum.',
            ),
            Isaretle(
              soru: 'Hastalık belirtilerini işaretle.',
              cumle: 'Ich habe seit gestern Fieber und Husten',
              dogru: [4, 6],
              aciklama:
                  'Fieber (ateş) ve Husten (öksürük). "Dünden beri ateşim ve öksürüğüm var."',
            ),
          ],
        ),
      ],
    ),
  ],
);
