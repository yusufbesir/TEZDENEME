/// Almanca B1: Orta. Dört ünite: Geçmiş zamanlar ve bağlaçlar, Cümle yapıları
/// (Relativsatz, Passiv, Konjunktiv II), Çekim ve edatlar, Yazı ve iletişim.
/// Türkçe anlatım, Almanca içerik (Goethe-Zertifikat B1 düzeyi). Yaz
/// alıştırmalarında ä/ö/ü/ß yerine ae/oe/ue/ss yazımı da kabul edilir.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/icerik.dart';

const String _de = 'de-DE';

const Kurs almancaB1 = Kurs(
  id: 'almanca-3',
  ad: 'Almanca B1: Orta',
  aciklama:
      'A2 sonrası orta düzey Almanca: Präteritum, bağlaçlar, Relativsatz, Passiv, Konjunktiv II, sıfat çekimi, edatlar ve resmî yazışma.',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'almanca-3.u1',
      ad: 'Geçmiş zamanlar ve bağlaçlar',
      dersler: [
        Ders(
          id: 'almanca-3.u1.d1',
          ad: 'Präteritum: düzenli ve düzensiz fiiller',
          dilbilgisiNotu:
              'Düzenli (zayıf) fiiller -te alır: machen → machte. Düzensiz (güçlü) fiillerde kök değişir: gehen → ging, sehen → sah. Präteritum daha çok yazıda ve hikâye anlatımında kullanılır.',
          alistirmalar: [
            Secim(
              soru: '"ich machte" hangi zamandadır?',
              secenekler: ['Präteritum', 'Perfekt', 'Präsens'],
              dogru: 0,
              aciklama:
                  'machte, machen fiilinin Präteritum (basit geçmiş) hâlidir: "yaptım".',
            ),
            Bosluk(
              soru: 'Als Kind ___ ich oft Fußball.',
              secenekler: ['spielte', 'spielt', 'gespielt'],
              dogru: 0,
              aciklama:
                  '"Çocukken sık sık futbol oynardım." Düzenli fiil: spielen → spielte.',
            ),
            Tablo(
              soru: 'Fiil çekim tablosunu tamamla.',
              baslik: ['Infinitiv', 'Präteritum', 'Perfekt'],
              satirlar: [
                ['machen', 'machte', 'gemacht'],
                ['gehen', 'ging', 'ist gegangen'],
                ['kommen', 'kam', 'ist gekommen'],
                ['sehen', 'sah', 'gesehen'],
              ],
              bos: [
                (satir: 1, sutun: 1),
                (satir: 3, sutun: 1),
                (satir: 2, sutun: 2),
              ],
              secenekler: ['ging', 'sah', 'ist gekommen', 'kam'],
              aciklama:
                  'gehen → ging → ist gegangen; sehen → sah → gesehen; kommen → kam → ist gekommen. Hareket fiilleri Perfekt\'te sein alır.',
            ),
            Yaz(
              soru: '"ich gehe" fiilinin Präteritum hâli nedir? (ich ...)',
              cevaplar: ['ging', 'ich ging'],
              aciklama: 'gehen düzensiz bir fiildir: ich ging = gittim.',
            ),
            Sirala(
              soru: 'Cümleyi doğru sıraya diz: "Dün sinemadaydım."',
              kelimeler: ['Kino.', 'war', 'im', 'Gestern', 'ich'],
              dogru: ['Gestern', 'war', 'ich', 'im', 'Kino.'],
              aciklama:
                  'Gestern war ich im Kino. Cümle zarfla başlarsa çekimli fiil 2. sırada kalır, özne fiilden sonra gelir.',
            ),
            Eslestir(
              soru: 'Fiili Präteritum hâliyle eşleştir.',
              ciftler: [
                (sol: 'sein', sag: 'war'),
                (sol: 'haben', sag: 'hatte'),
                (sol: 'fahren', sag: 'fuhr'),
                (sol: 'essen', sag: 'aß'),
                (sol: 'schreiben', sag: 'schrieb'),
              ],
              aciklama:
                  'sein = olmak (war), haben = sahip olmak (hatte), fahren = gitmek/araçla sürmek (fuhr), essen = yemek (aß), schreiben = yazmak (schrieb).',
            ),
            Isaretle(
              soru: 'Präteritum\'daki fiili işaretle.',
              cumle: 'Gestern ging er früh nach Hause.',
              dogru: [1],
              aciklama:
                  '"Dün erken eve gitti." ging, gehen fiilinin Präteritum hâlidir.',
            ),
            Secim(
              soru: 'Hangi fiil düzensizdir (kökü değişir)?',
              secenekler: [
                'nehmen – nahm',
                'lernen – lernte',
                'kaufen – kaufte',
              ],
              dogru: 0,
              aciklama:
                  'nehmen (almak) → nahm düzensizdir; lernen (öğrenmek) → lernte ve kaufen (satın almak) → kaufte düzenlidir.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Wir fuhren letztes Jahr nach Berlin.',
              secenekler: [
                'Wir fuhren letztes Jahr nach Berlin.',
                'Wir fahren nächstes Jahr nach Berlin.',
                'Wir fuhren letztes Jahr nach Bonn.',
              ],
              dogru: 0,
              dil: _de,
              aciklama:
                  '"Geçen yıl Berlin\'e gittik." fuhren = fahren fiilinin Präteritum çoğul hâli.',
            ),
          ],
        ),
        Ders(
          id: 'almanca-3.u1.d2',
          ad: 'Hikâye anlatımı ve Plusquamperfekt',
          dilbilgisiNotu:
              'Konuşmada geçmiş için çoğunlukla Perfekt kullanılır; ancak sein, haben ve modal fiiller konuşmada da Präteritum alır (war, hatte, konnte). Plusquamperfekt = hatte/war + Partizip II; geçmişteki bir olaydan daha önce olanı anlatır.',
          alistirmalar: [
            Secim(
              soru:
                  'Günlük konuşmada geçmiş için çoğunlukla hangi zaman kullanılır?',
              secenekler: ['Perfekt', 'Plusquamperfekt', 'Futur II'],
              dogru: 0,
              aciklama:
                  'Konuşma dilinde Perfekt tercih edilir; Präteritum ağırlıklı olarak yazıda ve hikâyelerde görülür.',
            ),
            Bosluk(
              soru: 'Ich ___ gestern keine Zeit.',
              secenekler: ['hatte', 'habe', 'gehabt'],
              dogru: 0,
              aciklama:
                  '"Dün zamanım yoktu." haben fiilinin Präteritum hâli hatte konuşmada da yaygındır.',
            ),
            Tablo(
              soru: 'Modal fiillerin Präteritum hâlini tamamla.',
              baslik: ['Infinitiv', 'ich / er (Präteritum)'],
              satirlar: [
                ['können', 'konnte'],
                ['müssen', 'musste'],
                ['wollen', 'wollte'],
                ['dürfen', 'durfte'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 3, sutun: 1)],
              secenekler: ['konnte', 'musste', 'wollte', 'durfte'],
              aciklama:
                  'müssen = zorunda olmak (musste), dürfen = izinli olmak (durfte). Modal fiillerin Präteritum\'unda ä/ö/ü düşer.',
            ),
            Sirala(
              soru: 'Cümleyi diz: "Küçükken kırda yaşıyorduk."',
              kelimeler: [
                'wohnten',
                'wir',
                'Als',
                'auf',
                'klein',
                'dem',
                'Land.',
                'ich',
                'war,',
              ],
              dogru: [
                'Als',
                'ich',
                'klein',
                'war,',
                'wohnten',
                'wir',
                'auf',
                'dem',
                'Land.',
              ],
              aciklama:
                  'Als ich klein war, wohnten wir auf dem Land. Yan cümleden sonra ana cümlede fiil başa gelir (wohnten wir).',
            ),
            Yaz(
              soru:
                  'Boşluğu doldur: "Es ist kalt." → "Es ___ kalt." (Präteritum)',
              cevaplar: ['war', 'es war kalt'],
              aciklama:
                  'sein fiilinin Präteritum hâli: es war = (hava) soğuktu.',
            ),
            Secim(
              soru:
                  'Metni oku: "Gestern regnete es den ganzen Tag. Wir blieben zu Hause und spielten Karten. Am Abend kochte mein Vater Suppe." Aile ne yaptı?',
              secenekler: [
                'Evde kart oynadı.',
                'Sinemaya gitti.',
                'Göle gitti.',
              ],
              dogru: 0,
              aciklama:
                  '"Dün bütün gün yağmur yağdı. Evde kaldık ve kart oynadık. Akşam babam çorba pişirdi."',
            ),
            Bosluk(
              soru: 'Nachdem ich gegessen ___, ging ich spazieren.',
              secenekler: ['hatte', 'habe', 'wurde'],
              dogru: 0,
              aciklama:
                  '"Yemek yedikten sonra yürüyüşe çıktım." Önce olan eylem Plusquamperfekt: hatte gegessen.',
            ),
            Isaretle(
              soru:
                  'Plusquamperfekt\'teki iki parçayı (yardımcı fiil ve Partizip II) işaretle.',
              cumle: 'Nachdem sie die Prüfung bestanden hatte, feierte sie.',
              dogru: [4, 5],
              aciklama:
                  '"Sınavı geçtikten sonra kutladı." bestanden hatte = Plusquamperfekt.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Es war einmal ein kleiner Hund.',
              secenekler: [
                'Es war einmal ein kleiner Hund.',
                'Es war einmal ein kleines Haus.',
                'Es ist ein kleiner Hund.',
              ],
              dogru: 0,
              dil: _de,
              aciklama:
                  '"Bir zamanlar küçük bir köpek vardı." Masalların klasik başlangıcı Präteritum ile kurulur.',
            ),
          ],
        ),
        Ders(
          id: 'almanca-3.u1.d3',
          ad: 'Bağlaçlar: obwohl, während, bevor, damit, sodass',
          dilbilgisiNotu:
              'Bu bağlaçlar yan cümle kurar: çekimli fiil cümlenin sonuna gider ve yan cümle virgülle ayrılır. Obwohl = rağmen, während = iken, bevor = -meden önce, damit = diye (amaç), sodass = öyle ki (sonuç).',
          alistirmalar: [
            Secim(
              soru: 'Yan cümlede (ör. obwohl ile) çekimli fiil nereye gider?',
              secenekler: [
                'Cümlenin sonuna',
                'Bağlacın hemen arkasına',
                'Cümlenin ortasına',
              ],
              dogru: 0,
              aciklama:
                  'Yan cümlede çekimli fiil sona gider: Obwohl er müde ist, arbeitet er.',
            ),
            Bosluk(
              soru: 'Ich gehe zur Arbeit, ___ ich krank bin.',
              secenekler: ['obwohl', 'weil', 'damit'],
              dogru: 0,
              aciklama:
                  '"Hasta olmama rağmen işe gidiyorum." obwohl = rağmen (karşıtlık).',
            ),
            Bosluk(
              soru: 'Ich erkläre es langsam, ___ du es verstehst.',
              secenekler: ['damit', 'obwohl', 'während'],
              dogru: 0,
              aciklama:
                  '"Anlayasın diye yavaş açıklıyorum." damit = amaç bildirir (iki cümlenin öznesi farklı).',
            ),
            Bosluk(
              soru: 'Er hörte Musik, ___ er kochte.',
              secenekler: ['während', 'damit', 'sodass'],
              dogru: 0,
              aciklama:
                  '"Yemek pişirirken müzik dinledi." während = aynı anda süren iki eylem.',
            ),
            Bosluk(
              soru: 'Es regnete stark, ___ wir zu Hause blieben.',
              secenekler: ['sodass', 'damit', 'obwohl'],
              dogru: 0,
              aciklama:
                  '"Şiddetli yağdı, böylece evde kaldık." sodass = sonuç bildirir.',
            ),
            Sirala(
              soru:
                  'Cümleyi diz: "Yağmur yağmasına rağmen yürüyüşe çıkıyoruz."',
              kelimeler: [
                'wir',
                'es',
                'spazieren.',
                'gehen',
                'regnet,',
                'Obwohl',
              ],
              dogru: ['Obwohl', 'es', 'regnet,', 'gehen', 'wir', 'spazieren.'],
              aciklama:
                  'Obwohl es regnet, gehen wir spazieren. Yan cümle başta olduğu için ana cümlede fiil önce gelir.',
            ),
            Eslestir(
              soru: 'Bağlacı Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'obwohl', sag: 'rağmen'),
                (sol: 'während', sag: 'iken, sırasında'),
                (sol: 'bevor', sag: '-meden önce'),
                (sol: 'damit', sag: 'diye (amaç)'),
                (sol: 'sodass', sag: 'öyle ki (sonuç)'),
              ],
              aciklama:
                  'Beşi de yan cümle bağlacıdır; çekimli fiil cümle sonunda durur.',
            ),
            Yaz(
              soru:
                  'Boşluğu doldur: Ich bleibe zu Hause, weil ich krank ___. (sein)',
              cevaplar: ['bin'],
              aciklama:
                  '"Hasta olduğum için evde kalıyorum." Fiil yan cümlenin sonunda: ich krank bin.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Obwohl er müde war, arbeitete er weiter.',
              secenekler: [
                'Obwohl er müde war, arbeitete er weiter.',
                'Weil er müde war, ging er nach Hause.',
                'Obwohl er müde ist, arbeitet er weiter.',
              ],
              dogru: 0,
              dil: _de,
              aciklama: '"Yorgun olmasına rağmen çalışmaya devam etti."',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'almanca-3.u2',
      ad: 'Relativsatz, Passiv, Konjunktiv II',
      dersler: [
        Ders(
          id: 'almanca-3.u2.d1',
          ad: 'Relativsätze: der, die, das',
          dilbilgisiNotu:
              'İlgi zamirinin cinsi ve sayısı önceki isimden, hâli ise yan cümledeki görevinden gelir. Genitiv: dessen (m/n), deren (f/çoğul). Relativsatz virgülle ayrılır ve çekimli fiil sonda durur.',
          alistirmalar: [
            Secim(
              soru: 'İlgi zamirinin cinsini ve hâlini ne belirler?',
              secenekler: [
                'Cinsi önceki isim, hâli yan cümledeki görevi',
                'Yalnız fiilin zamanı',
                'Cümlenin son sözcüğü',
              ],
              dogru: 0,
              aciklama:
                  'Das ist die Frau, die ich kenne: die dişil çünkü Frau dişil; Akkusativ çünkü "tanıdığım kişi" nesnedir.',
            ),
            Bosluk(
              soru: 'Das ist der Mann, ___ dort wohnt.',
              secenekler: ['der', 'den', 'dem'],
              dogru: 0,
              aciklama: '"Bu, orada oturan adam." Özne (Nominativ) eril: der.',
            ),
            Yaz(
              soru:
                  'Boşluğu doldur: Der Kuchen, ___ ich gebacken habe, ist lecker.',
              cevaplar: ['den'],
              aciklama:
                  '"Yaptığım kek lezzetli." Kuchen eril, yan cümlede nesne (Akkusativ): den.',
            ),
            Bosluk(
              soru: 'Die Frau, ___ ich helfe, ist nett.',
              secenekler: ['der', 'die', 'den'],
              dogru: 0,
              aciklama:
                  '"Yardım ettiğim kadın nazik." helfen Dativ ister; dişil Dativ: der.',
            ),
            Tablo(
              soru: 'İlgi zamiri tablosunu tamamla.',
              baslik: ['Kasus', 'maskulin', 'feminin', 'neutral'],
              satirlar: [
                ['Nominativ', 'der', 'die', 'das'],
                ['Akkusativ', 'den', 'die', 'das'],
                ['Dativ', 'dem', 'der', 'dem'],
              ],
              bos: [
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 1),
                (satir: 2, sutun: 2),
              ],
              secenekler: ['den', 'dem', 'der', 'die'],
              aciklama:
                  'Akkusativ eril: den; Dativ eril: dem; Dativ dişil: der. Diğer hâller artikelle aynıdır.',
            ),
            Bosluk(
              soru: 'Der Freund, mit ___ ich reise, heißt Tom.',
              secenekler: ['dem', 'den', 'der'],
              dogru: 0,
              aciklama:
                  '"Birlikte seyahat ettiğim arkadaş Tom." mit her zaman Dativ ister; eril: dem.',
            ),
            Bosluk(
              soru: 'Das Kind, ___ Mutter Ärztin ist, geht in meine Klasse.',
              secenekler: ['dessen', 'deren', 'das'],
              dogru: 0,
              aciklama:
                  '"Annesi doktor olan çocuk benim sınıfıma gidiyor." Kind nötr, Genitiv: dessen.',
            ),
            Isaretle(
              soru: 'Genitiv ilgi zamirini işaretle.',
              cumle:
                  'Der Student, dessen Eltern in Wien wohnen, studiert Medizin.',
              dogru: [2],
              aciklama:
                  '"Ailesi Viyana\'da yaşayan öğrenci tıp okuyor." dessen = "onun" (eril/nötr Genitiv).',
            ),
            Sirala(
              soru: 'Cümleyi diz: "İzlediğimiz film komikti."',
              kelimeler: [
                'war',
                'lustig.',
                'haben,',
                'Der',
                'den',
                'gesehen',
                'Film,',
                'wir',
              ],
              dogru: [
                'Der',
                'Film,',
                'den',
                'wir',
                'gesehen',
                'haben,',
                'war',
                'lustig.',
              ],
              aciklama:
                  'Der Film, den wir gesehen haben, war lustig. Relativsatz ismin hemen arkasına girer, fiil sonda durur.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Der Mann, der dort steht, ist mein Onkel.',
              secenekler: [
                'Der Mann, der dort steht, ist mein Onkel.',
                'Die Frau, die dort steht, ist meine Tante.',
                'Der Mann, den ich kenne, ist mein Onkel.',
              ],
              dogru: 0,
              dil: _de,
              aciklama: '"Orada duran adam benim amcam."',
            ),
          ],
        ),
        Ders(
          id: 'almanca-3.u2.d2',
          ad: 'Passiv Präsens ve Präteritum',
          dilbilgisiNotu:
              'Passiv = werden + Partizip II. Präsens: wird/werden gebaut; Präteritum: wurde/wurden gebaut. Yapan kişi von + Dativ ile, araç durch + Akkusativ ile verilir.',
          alistirmalar: [
            Secim(
              soru: 'Passiv Präsens nasıl kurulur?',
              secenekler: [
                'werden + Partizip II',
                'haben + Partizip II',
                'würde + Infinitiv',
              ],
              dogru: 0,
              aciklama:
                  'Das Haus wird gebaut = Ev inşa ediliyor. Yardımcı fiil werden çekimlenir.',
            ),
            Bosluk(
              soru: 'Das Auto ___ repariert.',
              secenekler: ['wird', 'wurde', 'ist'],
              dogru: 0,
              aciklama:
                  '"Araba tamir ediliyor." Şimdiki zaman Passiv: wird repariert.',
            ),
            Bosluk(
              soru: 'Gestern ___ das Fenster geöffnet.',
              secenekler: ['wurde', 'wird', 'worden'],
              dogru: 0,
              aciklama:
                  '"Dün pencere açıldı." Geçmiş Passiv (Präteritum): wurde geöffnet.',
            ),
            Tablo(
              soru: 'Passiv tablosunu tamamla.',
              baslik: ['Subjekt', 'Präsens', 'Präteritum'],
              satirlar: [
                ['das Buch', 'wird gelesen', 'wurde gelesen'],
                ['die Briefe', 'werden geschrieben', 'wurden geschrieben'],
                ['der Kuchen', 'wird gebacken', 'wurde gebacken'],
                ['die Autos', 'werden repariert', 'wurden repariert'],
              ],
              bos: [
                (satir: 1, sutun: 2),
                (satir: 2, sutun: 1),
                (satir: 3, sutun: 2),
              ],
              secenekler: [
                'wurden geschrieben',
                'wird gebacken',
                'wurden repariert',
                'wurde gebacken',
              ],
              aciklama:
                  'Tekil özne: wird/wurde; çoğul özne: werden/wurden. Mektuplar yazıldı = die Briefe wurden geschrieben.',
            ),
            Sirala(
              soru: 'Cümleyi diz: "Kapı dün kapatıldı."',
              kelimeler: ['geschlossen.', 'Tür', 'wurde', 'gestern', 'Die'],
              dogru: ['Die', 'Tür', 'wurde', 'gestern', 'geschlossen.'],
              aciklama:
                  'Die Tür wurde gestern geschlossen. Partizip II cümle sonunda durur.',
            ),
            Yaz(
              soru:
                  'Boşluğu doldur: "Man baut das Haus." → "Das Haus ___ gebaut."',
              cevaplar: ['wird'],
              aciklama:
                  '"Ev inşa ediliyor." Aktif "man" cümlesi Passiv\'e çevrilince nesne özne olur: wird gebaut.',
            ),
            Isaretle(
              soru: 'Passiv\'deki iki fiil parçasını işaretle.',
              cumle: 'Das Essen wird von meiner Mutter gekocht.',
              dogru: [2, 6],
              aciklama:
                  '"Yemek annem tarafından pişiriliyor." wird + gekocht = Passiv Präsens.',
            ),
            Bosluk(
              soru: 'Das Buch wurde ___ dem Autor geschrieben.',
              secenekler: ['von', 'durch', 'mit'],
              dogru: 0,
              aciklama:
                  '"Kitap yazar tarafından yazıldı." Yapan kişi von + Dativ ile belirtilir.',
            ),
            Secim(
              soru:
                  '"Der Brief wird von Anna geschrieben." cümlesinin aktif hâli hangisidir?',
              secenekler: [
                'Anna schreibt den Brief.',
                'Anna schrieb den Brief.',
                'Der Brief schreibt Anna.',
              ],
              dogru: 0,
              aciklama:
                  'Passiv Präsens aktifte Präsens olur: Anna mektubu yazıyor.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Das Haus wurde im Jahr neunzehnhundertneunzig gebaut.',
              secenekler: [
                'Das Haus wurde im Jahr neunzehnhundertneunzig gebaut.',
                'Das Haus wird im Jahr zweitausend gebaut.',
                'Das Haus wurde im Jahr neunzehnhundertneunzig verkauft.',
              ],
              dogru: 0,
              dil: _de,
              aciklama:
                  '"Ev 1990 yılında inşa edildi." wurde ... gebaut = Passiv Präteritum.',
            ),
          ],
        ),
        Ders(
          id: 'almanca-3.u2.d3',
          ad: 'Konjunktiv II: dilek ve nezaket',
          dilbilgisiNotu:
              'Gerçek dışı durumlar ve dilekler için Konjunktiv II kullanılır: wäre, hätte, würde + Infinitiv, könnte. Nezaket için: Könnten Sie ...? Ich hätte gern ... Wenn-cümlesi: Wenn ich Zeit hätte, würde ich reisen.',
          alistirmalar: [
            Secim(
              soru: '"Wenn ich Zeit hätte, ..." ne anlama gelir?',
              secenekler: [
                'Zamanım olsaydı (ama yok)',
                'Zamanım var',
                'Zamanım vardı',
              ],
              dogru: 0,
              aciklama:
                  'Konjunktiv II gerçek olmayan bir durumu anlatır: hätte = olsaydı.',
            ),
            Bosluk(
              soru: 'Wenn ich reich ___, würde ich um die Welt reisen.',
              secenekler: ['wäre', 'bin', 'war'],
              dogru: 0,
              aciklama:
                  '"Zengin olsaydım dünyayı gezerdim." sein → Konjunktiv II: wäre.',
            ),
            Bosluk(
              soru: 'Wenn er mehr Zeit ___, würde er Sport machen.',
              secenekler: ['hätte', 'hat', 'hatte'],
              dogru: 0,
              aciklama:
                  '"Daha çok zamanı olsaydı spor yapardı." haben → Konjunktiv II: hätte.',
            ),
            Tablo(
              soru: 'Konjunktiv II tablosunu tamamla.',
              baslik: ['Infinitiv', 'ich', 'er / sie / es', 'wir'],
              satirlar: [
                ['sein', 'wäre', 'wäre', 'wären'],
                ['haben', 'hätte', 'hätte', 'hätten'],
                ['werden', 'würde', 'würde', 'würden'],
                ['können', 'könnte', 'könnte', 'könnten'],
              ],
              bos: [
                (satir: 0, sutun: 3),
                (satir: 1, sutun: 1),
                (satir: 2, sutun: 2),
              ],
              secenekler: ['wären', 'hätte', 'würde', 'könnte'],
              aciklama:
                  'wir wären = olurduk; ich hätte = (benim) olurdu/olsaydı; er würde = o ... -erdi; ich könnte = yapabilirdim.',
            ),
            Bosluk(
              soru: '___ Sie mir bitte helfen?',
              secenekler: ['Könnten', 'Konnten', 'Können'],
              dogru: 0,
              aciklama:
                  '"Bana yardım edebilir misiniz?" Könnten, Können\'den daha nazik bir ricadır.',
            ),
            Secim(
              soru: '"Ich hätte gern einen Kaffee." ne demektir?',
              secenekler: [
                'Bir kahve isterdim.',
                'Kahve içtim.',
                'Kahveyi sevmiyorum.',
              ],
              dogru: 0,
              aciklama:
                  'Restoranda nazik sipariş kalıbı: Ich hätte gern ... = ... alabilir miyim / isterdim.',
            ),
            Sirala(
              soru: 'Cümleyi diz: "Senin yerinde olsam beklemezdim."',
              kelimeler: [
                'ich',
                'nicht',
                'Stelle',
                'warten.',
                'würde',
                'An',
                'deiner',
              ],
              dogru: [
                'An',
                'deiner',
                'Stelle',
                'würde',
                'ich',
                'nicht',
                'warten.',
              ],
              aciklama:
                  'An deiner Stelle würde ich nicht warten. Öneri verirken kullanılan kalıp.',
            ),
            Yaz(
              soru:
                  'Boşluğu doldur: Wenn ich du ___, würde ich ihn anrufen. (sein)',
              cevaplar: ['wäre', 'waere'],
              aciklama:
                  '"Ben sen olsam onu arardım." Wenn ich du wäre, ... tipik tavsiye kalıbıdır.',
            ),
            Isaretle(
              soru: 'Konjunktiv II\'deki iki fiil biçimini işaretle.',
              cumle: 'Wenn ich Geld hätte, würde ich ein Haus kaufen.',
              dogru: [3, 4],
              aciklama:
                  '"Param olsaydı bir ev satın alırdım." hätte ve würde = Konjunktiv II.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Ich würde gern nach Italien reisen.',
              secenekler: [
                'Ich würde gern nach Italien reisen.',
                'Ich reise gern nach Italien.',
                'Ich würde gern nach Spanien reisen.',
              ],
              dogru: 0,
              dil: _de,
              aciklama: '"İtalya\'ya seyahat etmek isterdim."',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'almanca-3.u3',
      ad: 'Sıfat çekimi, Genitiv ve edatlı fiiller',
      dersler: [
        Ders(
          id: 'almanca-3.u3.d1',
          ad: 'Sıfat çekimi: belirli ve belirsiz artikel',
          dilbilgisiNotu:
              'İsimden önceki sıfat çekilir. Belirli artikelle: Nom. m -e, Akk. m -en, Dativ hep -en, dişil/nötr Nom.-Akk. -e (nötr belirsizde -es). Belirsiz artikelle eril Nominativ -er, nötr Nom./Akk. -es.',
          alistirmalar: [
            Secim(
              soru:
                  '"der ___ Mann": belirli artikelden sonra eril Nominativ sıfat sonu nedir? (der gute Mann)',
              secenekler: ['-e', '-er', '-en'],
              dogru: 0,
              aciklama:
                  'der gute Mann = iyi adam. Belirli artikelden sonra eril Nominativ -e alır.',
            ),
            Bosluk(
              soru: 'Ich sehe den klein___ Hund.',
              secenekler: ['en', 'e', 'er'],
              dogru: 0,
              aciklama:
                  '"Küçük köpeği görüyorum." Eril Akkusativ, belirli artikel: den kleinen Hund.',
            ),
            Bosluk(
              soru: 'Ein alt___ Mann wohnt hier.',
              secenekler: ['er', 'e', 'en'],
              dogru: 0,
              aciklama:
                  '"Yaşlı bir adam burada oturuyor." Belirsiz artikel + eril Nominativ: ein alter Mann.',
            ),
            Bosluk(
              soru: 'Sie trägt ein schön___ Kleid.',
              secenekler: ['es', 'e', 'en'],
              dogru: 0,
              aciklama:
                  '"Güzel bir elbise giyiyor." Nötr Akkusativ, belirsiz artikel: ein schönes Kleid.',
            ),
            Tablo(
              soru: 'Belirli artikelli sıfat çekimini tamamla.',
              baslik: ['Genus', 'Nominativ', 'Akkusativ', 'Dativ'],
              satirlar: [
                [
                  'maskulin',
                  'der gute Mann',
                  'den guten Mann',
                  'dem guten Mann',
                ],
                ['feminin', 'die gute Frau', 'die gute Frau', 'der guten Frau'],
                ['neutral', 'das gute Kind', 'das gute Kind', 'dem guten Kind'],
              ],
              bos: [
                (satir: 0, sutun: 2),
                (satir: 1, sutun: 3),
                (satir: 2, sutun: 1),
              ],
              secenekler: [
                'den guten Mann',
                'der guten Frau',
                'das gute Kind',
                'die guten Frau',
              ],
              aciklama:
                  'Dativ her cinste -en alır; eril Akkusativ -en; dişil ve nötr Nominativ/Akkusativ -e.',
            ),
            Bosluk(
              soru: 'Ich helfe der alt___ Frau.',
              secenekler: ['en', 'e', 'er'],
              dogru: 0,
              aciklama:
                  '"Yaşlı kadına yardım ediyorum." Dativ: der alten Frau (-en).',
            ),
            Sirala(
              soru: 'Cümleyi diz: "Yeni bir bilgisayar satın aldım."',
              kelimeler: [
                'einen',
                'gekauft.',
                'Computer',
                'habe',
                'neuen',
                'Ich',
              ],
              dogru: ['Ich', 'habe', 'einen', 'neuen', 'Computer', 'gekauft.'],
              aciklama:
                  'Ich habe einen neuen Computer gekauft. Eril Akkusativ, belirsiz artikel: einen neuen.',
            ),
            Isaretle(
              soru: 'Cümledeki iki sıfatı işaretle.',
              cumle:
                  'Wir wohnen in einem kleinen Haus mit einem großen Garten.',
              dogru: [4, 8],
              aciklama:
                  '"Büyük bahçeli küçük bir evde oturuyoruz." kleinen ve großen, Dativ olduğu için -en alır.',
            ),
            Yaz(
              soru: 'Sıfat sonunu yaz: mit dem neu___ Auto',
              cevaplar: ['en', 'neuen'],
              aciklama: '"Yeni arabayla." mit + Dativ: dem neuen Auto (-en).',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Ich kaufe den roten Pullover.',
              secenekler: [
                'Ich kaufe den roten Pullover.',
                'Ich kaufe einen roten Pullover.',
                'Ich kaufe den blauen Pullover.',
              ],
              dogru: 0,
              dil: _de,
              aciklama: '"Kırmızı kazağı satın alıyorum."',
            ),
          ],
        ),
        Ders(
          id: 'almanca-3.u3.d2',
          ad: 'Genitiv ve genitif edatları',
          dilbilgisiNotu:
              'Genitiv sahiplik bildirir: das Auto des Mannes (eril/nötr isme -(e)s eklenir), die Tasche der Frau. Genitiv edatları: wegen (yüzünden), trotz (rağmen), während (süresince), statt (yerine). Artikelsiz sıfat: kalte Milch (dişil Akk.).',
          alistirmalar: [
            Secim(
              soru: '"Das Auto des Mannes" ne demektir?',
              secenekler: [
                'Adamın arabası',
                'Adam arabayı sürüyor',
                'Adama araba',
              ],
              dogru: 0,
              aciklama: 'des Mannes = adamın. Eril Genitiv: des + isme -es/-s.',
            ),
            Bosluk(
              soru: 'Das Haus ___ Lehrers ist groß.',
              secenekler: ['des', 'dem', 'den'],
              dogru: 0,
              aciklama: '"Öğretmenin evi büyük." Eril Genitiv: des Lehrers.',
            ),
            Bosluk(
              soru: 'Wegen ___ schlechten Wetters bleiben wir zu Hause.',
              secenekler: ['des', 'dem', 'das'],
              dogru: 0,
              aciklama:
                  '"Kötü hava yüzünden evde kalıyoruz." wegen + Genitiv: des schlechten Wetters.',
            ),
            Bosluk(
              soru: 'Die Tasche ___ Frau ist rot.',
              secenekler: ['der', 'die', 'den'],
              dogru: 0,
              aciklama: '"Kadının çantası kırmızı." Dişil Genitiv: der Frau.',
            ),
            Bosluk(
              soru: 'Trotz ___ Kälte gingen wir schwimmen.',
              secenekler: ['der', 'die', 'dem'],
              dogru: 0,
              aciklama:
                  '"Soğuğa rağmen yüzmeye gittik." trotz + Genitiv; Kälte dişil: der Kälte.',
            ),
            Eslestir(
              soru: 'Edatı Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'wegen', sag: 'yüzünden, nedeniyle'),
                (sol: 'trotz', sag: 'rağmen'),
                (sol: 'während', sag: 'süresince'),
                (sol: 'statt', sag: 'yerine'),
                (sol: 'innerhalb', sag: 'içinde (zaman/yer)'),
              ],
              aciklama:
                  'Bu edatlar yazılı dilde Genitiv ister; konuşmada sıkça Dativ de duyulur.',
            ),
            Bosluk(
              soru: 'Ich trinke gern kalt___ Milch.',
              secenekler: ['e', 'er', 'en'],
              dogru: 0,
              aciklama:
                  '"Soğuk sütü severek içerim." Artikelsiz dişil Akkusativ: kalte Milch.',
            ),
            Sirala(
              soru: 'Cümleyi diz: "Kötü hava yüzünden şenlik iptal oluyor."',
              kelimeler: [
                'Fest',
                'fällt',
                'Wetters',
                'das',
                'schlechten',
                'des',
                'aus.',
                'Wegen',
              ],
              dogru: [
                'Wegen',
                'des',
                'schlechten',
                'Wetters',
                'fällt',
                'das',
                'Fest',
                'aus.',
              ],
              aciklama:
                  'Wegen des schlechten Wetters fällt das Fest aus. ausfallen = iptal olmak (ayrılabilen fiil).',
            ),
            Isaretle(
              soru: 'Genitiv\'deki iki kelimeyi işaretle.',
              cumle: 'Trotz des Regens gingen wir spazieren.',
              dogru: [1, 2],
              aciklama:
                  '"Yağmura rağmen yürüyüşe çıktık." des Regens = Genitiv (eril: des + -s).',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Wegen des Wetters bleiben wir zu Hause.',
              secenekler: [
                'Wegen des Wetters bleiben wir zu Hause.',
                'Trotz des Wetters gehen wir spazieren.',
                'Wegen der Arbeit bleiben wir zu Hause.',
              ],
              dogru: 0,
              dil: _de,
              aciklama: '"Hava yüzünden evde kalıyoruz."',
            ),
          ],
        ),
        Ders(
          id: 'almanca-3.u3.d3',
          ad: 'Edatlı fiiller, da-/wo- ve dolaylı soru',
          dilbilgisiNotu:
              'Bazı fiiller sabit edatla kullanılır: warten auf + Akk., sich freuen über + Akk. (olan şey), sich freuen auf + Akk. (gelecek şey). Cansız şeyler için da-/wo-: darauf, wofür. Dolaylı soruda fiil sona gider: Ich weiß nicht, wo er wohnt. Evet/hayır sorusunda ob kullanılır.',
          alistirmalar: [
            Eslestir(
              soru: 'Edatlı fiili Türkçe anlamıyla eşleştir.',
              ciftler: [
                (sol: 'warten auf', sag: 'beklemek'),
                (sol: 'sich freuen über', sag: 'olan bir şeye sevinmek'),
                (sol: 'denken an', sag: 'düşünmek'),
                (sol: 'sich interessieren für', sag: 'ilgi duymak'),
                (sol: 'Angst haben vor', sag: '-den korkmak'),
              ],
              aciklama:
                  'Edat fiile aittir ve ezberlenir. sich freuen auf = gelecekteki bir şeyi dört gözle beklemek.',
            ),
            Bosluk(
              soru: 'Ich warte ___ den Bus.',
              secenekler: ['auf', 'für', 'über'],
              dogru: 0,
              aciklama: '"Otobüsü bekliyorum." warten auf + Akkusativ.',
            ),
            Bosluk(
              soru:
                  'Sie hat gestern ein Geschenk bekommen. Sie freut sich ___ das Geschenk.',
              secenekler: ['über', 'auf', 'an'],
              dogru: 0,
              aciklama:
                  '"Hediyeye seviniyor." Alınmış hediye için sich freuen über; gelecek için auf kullanılır.',
            ),
            Bosluk(
              soru: 'Wir warten auf den Bus. → Wir warten ___.',
              secenekler: ['darauf', 'davon', 'dafür'],
              dogru: 0,
              aciklama: '"Onu bekliyoruz." Cansız şey için auf + das → darauf.',
            ),
            Bosluk(
              soru: '___ interessierst du dich?',
              secenekler: ['Wofür', 'Womit', 'Wovon'],
              dogru: 0,
              aciklama:
                  '"Neye ilgi duyuyorsun?" sich interessieren für → wofür (cansız şey sorusu).',
            ),
            Sirala(
              soru: 'Cümleyi diz: "Yarın gelip gelmeyeceğini bilmiyorum."',
              kelimeler: [
                'er',
                'Ich',
                'morgen',
                'nicht,',
                'kommt.',
                'weiß',
                'ob',
              ],
              dogru: ['Ich', 'weiß', 'nicht,', 'ob', 'er', 'morgen', 'kommt.'],
              aciklama:
                  'Ich weiß nicht, ob er morgen kommt. Evet/hayır sorusu dolaylı olunca ob kullanılır, fiil sona gider.',
            ),
            Bosluk(
              soru: 'Ich weiß nicht, ___ er wohnt.',
              secenekler: ['wo', 'ob', 'dass'],
              dogru: 0,
              aciklama:
                  '"Nerede oturduğunu bilmiyorum." Soru sözcüğü (wo) dolaylı soruda aynen kalır.',
            ),
            Isaretle(
              soru: 'Dolaylı soru sözcüğünü ve cümle sonundaki fiili işaretle.',
              cumle: 'Kannst du mir sagen, wann der Zug abfährt?',
              dogru: [4, 7],
              aciklama:
                  '"Trenin ne zaman kalktığını söyleyebilir misin?" wann ... abfährt: fiil yan cümlenin sonunda.',
            ),
            Yaz(
              soru:
                  'Boşluğu doldur: Sie interessiert sich für Musik. → "___ interessiert sie sich?"',
              cevaplar: ['wofür', 'wofuer'],
              aciklama: '"Neye ilgi duyuyor?" für + wo → wofür.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Ich freue mich auf die Ferien.',
              secenekler: [
                'Ich freue mich auf die Ferien.',
                'Ich freue mich über die Ferien.',
                'Ich warte auf die Ferien.',
              ],
              dogru: 0,
              dil: _de,
              aciklama:
                  '"Tatili dört gözle bekliyorum." Gelecekteki şey için sich freuen auf.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'almanca-3.u4',
      ad: 'Yazı, tartışma ve toplum',
      dersler: [
        Ders(
          id: 'almanca-3.u4.d1',
          ad: 'Resmî yazı: e-posta ve şikâyet',
          dilbilgisiNotu:
              'Resmî yazı: Sehr geehrte Damen und Herren, ... Mit freundlichen Grüßen. Ricada Konjunktiv II ve bitte kullanılır. Şikâyette sorunu açık yaz, çözüm iste ve cevap için süre belirt.',
          alistirmalar: [
            Secim(
              soru: '"Sehr geehrte Damen und Herren," ne anlama gelir?',
              secenekler: [
                'Sayın Bayanlar ve Baylar (resmî hitap)',
                'Sevgili arkadaşlar',
                'Merhaba millet',
              ],
              dogru: 0,
              aciklama:
                  'Muhatabın adı bilinmeyen resmî yazılarda standart hitaptır.',
            ),
            Bosluk(
              soru: 'Mit freundlichen ___',
              secenekler: ['Grüßen', 'Grüße', 'Gruß'],
              dogru: 0,
              aciklama:
                  '"Saygılarımla / Saygıyla." Resmî kapanış kalıbı: Mit freundlichen Grüßen.',
            ),
            Bosluk(
              soru: 'Ich ___ mich über die Verspätung beschweren.',
              secenekler: ['möchte', 'möchten', 'müssen'],
              dogru: 0,
              aciklama:
                  '"Gecikme hakkında şikâyet etmek istiyorum." sich beschweren über = şikâyet etmek.',
            ),
            Eslestir(
              soru: 'Resmî kalıbı Türkçe anlamıyla eşleştir.',
              ciftler: [
                (
                  sol: 'Ich möchte mich beschweren',
                  sag: 'Şikâyet etmek istiyorum',
                ),
                (
                  sol: 'Ich bitte um Rückmeldung',
                  sag: 'Geri dönüş rica ediyorum',
                ),
                (sol: 'Anbei finden Sie', sag: 'Ekte bulabilirsiniz'),
                (sol: 'Vielen Dank im Voraus', sag: 'Şimdiden teşekkürler'),
                (
                  sol: 'Ich freue mich auf Ihre Antwort',
                  sag: 'Cevabınızı bekliyorum',
                ),
              ],
              aciklama:
                  'Bu kalıplar e-postanın giriş, ek ve kapanış bölümlerinde sık kullanılır.',
            ),
            Sirala(
              soru: 'Cümleyi diz: "Lütfen bana e-postayla bir onay gönderin."',
              kelimeler: [
                'Bestätigung',
                'eine',
                'Sie',
                'mir',
                'E-Mail.',
                'senden',
                'Bitte',
                'per',
              ],
              dogru: [
                'Bitte',
                'senden',
                'Sie',
                'mir',
                'eine',
                'Bestätigung',
                'per',
                'E-Mail.',
              ],
              aciklama:
                  'Bitte senden Sie mir eine Bestätigung per E-Mail. Emir kipinde Sie fiilden sonra gelir.',
            ),
            Bosluk(
              soru: 'Ich schreibe Ihnen ___ meiner Bestellung.',
              secenekler: ['wegen', 'trotz', 'während'],
              dogru: 0,
              aciklama:
                  '"Size siparişim nedeniyle yazıyorum." wegen + Genitiv e-posta girişinde sık kullanılır.',
            ),
            Yaz(
              soru: 'Kapanış kalıbını tamamla: "Mit freundlichen ___"',
              cevaplar: ['Grüßen', 'Gruessen', 'Grussen'],
              aciklama:
                  'Mit freundlichen Grüßen = Saygılarımla (ü/ß yerine ue/ss de yazılabilir).',
            ),
            Isaretle(
              soru: 'Şikâyet edilen sorunu (hasarı) işaretle.',
              cumle: 'Leider ist die Ware beschädigt angekommen.',
              dogru: [4],
              aciklama: '"Maalesef ürün hasarlı geldi." beschädigt = hasarlı.',
            ),
            Secim(
              soru: 'Resmî e-postada hangi hitap uygundur?',
              secenekler: [
                'Sehr geehrte Frau Schmidt,',
                'Hallo Schmidt,',
                'Hey Frau!',
              ],
              dogru: 0,
              aciklama:
                  'Sehr geehrte Frau ... = Sayın Bayan ...; resmî ve saygılı.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Ich bitte um eine schnelle Antwort.',
              secenekler: [
                'Ich bitte um eine schnelle Antwort.',
                'Ich bitte um einen schnellen Termin.',
                'Ich danke für die schnelle Antwort.',
              ],
              dogru: 0,
              dil: _de,
              aciklama: '"Hızlı bir cevap rica ediyorum."',
            ),
          ],
        ),
        Ders(
          id: 'almanca-3.u4.d2',
          ad: 'Görüş bildirme, iş ve eğitim',
          dilbilgisiNotu:
              'Görüş: Meiner Meinung nach ..., Ich finde, dass ..., Einerseits ..., andererseits ... İş başvurusu: sich bewerben um + Akk., der Lebenslauf (özgeçmiş), das Vorstellungsgespräch (iş görüşmesi).',
          alistirmalar: [
            Eslestir(
              soru: 'Görüş kalıbını Türkçe anlamıyla eşleştir.',
              ciftler: [
                (sol: 'Meiner Meinung nach', sag: 'Bence'),
                (sol: 'Ich bin dafür', sag: 'Taraftarım'),
                (
                  sol: 'Da stimme ich Ihnen zu',
                  sag: 'Bu konuda size katılıyorum',
                ),
                (sol: 'Das sehe ich anders', sag: 'Ben bunu farklı görüyorum'),
                (
                  sol: 'Einerseits ... andererseits',
                  sag: 'Bir yandan ... diğer yandan',
                ),
              ],
              aciklama: 'Tartışmada görüşü nazikçe belirtmek için kullanılır.',
            ),
            Secim(
              soru: '"Ich bin ganz Ihrer Meinung." ne demektir?',
              secenekler: [
                'Size tamamen katılıyorum.',
                'Size katılmıyorum.',
                'Fikrim yok.',
              ],
              dogru: 0,
              aciklama: 'Ihrer Meinung sein = sizinle aynı fikirde olmak.',
            ),
            Bosluk(
              soru: 'Meiner ___ nach ist das keine gute Idee.',
              secenekler: ['Meinung', 'Meinungen', 'meinen'],
              dogru: 0,
              aciklama:
                  '"Bence bu iyi bir fikir değil." Sabit kalıp: Meiner Meinung nach.',
            ),
            Bosluk(
              soru: 'Einerseits ist es teuer, ___ ist es sehr praktisch.',
              secenekler: ['andererseits', 'deshalb', 'deswegen'],
              dogru: 0,
              aciklama:
                  '"Bir yandan pahalı, diğer yandan çok pratik." einerseits ... andererseits çifti karşıt yönleri sıralar.',
            ),
            Bosluk(
              soru: 'Ich bewerbe mich ___ die Stelle als Ingenieur.',
              secenekler: ['um', 'bei', 'für'],
              dogru: 0,
              aciklama:
                  '"Mühendis pozisyonuna başvuruyorum." sich bewerben um + Akkusativ (auf + Akkusativ de kullanılır).',
            ),
            Sirala(
              soru: 'Cümleyi diz: "İş görüşmesi için bir randevum var."',
              kelimeler: [
                'Termin',
                'Vorstellungsgespräch.',
                'habe',
                'das',
                'Ich',
                'für',
                'einen',
              ],
              dogru: [
                'Ich',
                'habe',
                'einen',
                'Termin',
                'für',
                'das',
                'Vorstellungsgespräch.',
              ],
              aciklama:
                  'Ich habe einen Termin für das Vorstellungsgespräch. Vorstellungsgespräch = iş görüşmesi.',
            ),
            Secim(
              soru: '"der Lebenslauf" ne demektir?',
              secenekler: ['Özgeçmiş', 'Referans', 'Maaş'],
              dogru: 0,
              aciklama:
                  'Lebenslauf = özgeçmiş; Referenz = referans, Gehalt = maaş.',
            ),
            Yaz(
              soru: 'Boşluğu doldur: "Meiner Meinung ___" (bence)',
              cevaplar: ['nach'],
              aciklama: 'Meiner Meinung nach = benim görüşüme göre, bence.',
            ),
            Isaretle(
              soru: 'Meslek adını işaretle.',
              cumle: 'Ich arbeite seit drei Jahren als Lehrer an einer Schule.',
              dogru: [6],
              aciklama:
                  '"Üç yıldır bir okulda öğretmen olarak çalışıyorum." Lehrer = öğretmen.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Meiner Meinung nach ist Bildung sehr wichtig.',
              secenekler: [
                'Meiner Meinung nach ist Bildung sehr wichtig.',
                'Meiner Meinung nach ist Arbeit sehr wichtig.',
                'Meiner Meinung nach ist Bildung nicht wichtig.',
              ],
              dogru: 0,
              dil: _de,
              aciklama: '"Bence eğitim çok önemli."',
            ),
          ],
        ),
        Ders(
          id: 'almanca-3.u4.d3',
          ad: 'Medya, çevre ve okuma-anlama',
          dilbilgisiNotu:
              'Okuma-anlama için önce soruyu oku, sonra metinde anahtar sözcükleri ara. Faydalı sözcükler: die Umwelt (çevre), der Müll (çöp), das Klima (iklim), die Nachrichten (haberler), erneuerbare Energie (yenilenebilir enerji).',
          alistirmalar: [
            Secim(
              soru:
                  'Metni oku: "Immer mehr Menschen lesen die Nachrichten online. Gedruckte Zeitungen verlieren Leser, aber viele schätzen weiterhin gut recherchierte Artikel." Ana fikir nedir?',
              secenekler: [
                'Haberler giderek daha çok internetten okunuyor; gazeteler okur kaybediyor.',
                'Artık kimse haber okumuyor.',
                'Gazeteler giderek daha popüler oluyor.',
              ],
              dogru: 0,
              aciklama:
                  '"Giderek daha çok insan haberleri internetten okuyor. Basılı gazeteler okur kaybediyor, ama birçok kişi iyi araştırılmış makaleleri hâlâ değerli buluyor."',
            ),
            Secim(
              soru:
                  'Metni oku: "In unserer Stadt gibt es seit Januar eine neue Regel: Plastiktüten kosten jetzt Geld. Dadurch benutzen viele Leute Stofftaschen." Insanlar neden bez torba kullanıyor?',
              secenekler: [
                'Çünkü plastik poşetler artık ücretli.',
                'Çünkü bez torbalar bedava.',
                'Çünkü mağaza yok.',
              ],
              dogru: 0,
              aciklama:
                  '"Şehrimizde Ocak\'tan beri yeni bir kural var: plastik poşetler artık para. Bu yüzden birçok kişi bez torba kullanıyor."',
            ),
            Eslestir(
              soru: 'Sözcüğü Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'die Umwelt', sag: 'çevre'),
                (sol: 'der Müll', sag: 'çöp'),
                (sol: 'das Klima', sag: 'iklim'),
                (sol: 'erneuerbare Energie', sag: 'yenilenebilir enerji'),
                (sol: 'die Nachrichten', sag: 'haberler'),
              ],
              aciklama:
                  'Çevre ve medya konularının temel sözcükleri; Nachrichten çoğul kullanılır.',
            ),
            Bosluk(
              soru: 'Wir müssen den Müll ___, um die Umwelt zu schützen.',
              secenekler: ['trennen', 'trennt', 'getrennt'],
              dogru: 0,
              aciklama:
                  '"Çevreyi korumak için çöpü ayrıştırmalıyız." Modal fiilden sonra mastar: müssen ... trennen.',
            ),
            Bosluk(
              soru: 'Die Zeitung ___ gestern über den Unfall berichtet.',
              secenekler: ['hat', 'ist', 'wurde'],
              dogru: 0,
              aciklama:
                  '"Gazete dün kazayı haber yaptı." berichten Perfekt\'te haben alır: hat berichtet.',
            ),
            Bosluk(
              soru: 'Ich ärgere mich ___ den Lärm.',
              secenekler: ['über', 'auf', 'an'],
              dogru: 0,
              aciklama: '"Gürültüye kızıyorum." sich ärgern über + Akkusativ.',
            ),
            Sirala(
              soru: 'Cümleyi diz: "Çevre daha iyi korunmalı."',
              kelimeler: [
                'werden.',
                'besser',
                'Die',
                'geschützt',
                'muss',
                'Umwelt',
              ],
              dogru: [
                'Die',
                'Umwelt',
                'muss',
                'besser',
                'geschützt',
                'werden.',
              ],
              aciklama:
                  'Die Umwelt muss besser geschützt werden. Modal fiilli Passiv: muss + Partizip II + werden.',
            ),
            Yaz(
              soru: 'Almancada "çevre" nedir? (die ___)',
              cevaplar: ['Umwelt', 'die Umwelt'],
              aciklama: 'die Umwelt = çevre (dişil isim).',
            ),
            Isaretle(
              soru:
                  'Cümledeki iki ismi (konu sözcüklerini) işaretle: yenilenebilir enerji ve iklim.',
              cumle: 'Erneuerbare Energien sind wichtig für das Klima.',
              dogru: [1, 6],
              aciklama:
                  '"Yenilenebilir enerjiler iklim için önemlidir." Energien ve Klima isimdir.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Wir sollten weniger Plastik benutzen.',
              secenekler: [
                'Wir sollten weniger Plastik benutzen.',
                'Wir sollten mehr Plastik benutzen.',
                'Wir sollten weniger Papier benutzen.',
              ],
              dogru: 0,
              dil: _de,
              aciklama: '"Daha az plastik kullanmalıyız."',
            ),
          ],
        ),
      ],
    ),
  ],
);
