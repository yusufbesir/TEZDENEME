// İngilizce C1 kursu (CEFR C1): 3 ünite x 4 ders = 12 ders, ders başına 10 alıştırma.
// Sahibi: Yusuf (yusufbesir). İçerik testleri geçmeden değişmez; silme yalnız Yusuf kararıyla.
// yazan: [Claude#dalga10]
import '../model/icerik.dart';

/// İngilizce C1: İleri düzey
const Kurs ingilizceC1 = Kurs(
  id: 'ingilizce-5',
  ad: 'İngilizce C1',
  aciklama:
      'B2 sonrası ileri düzey İngilizce: gelişmiş zamanlar, devrik ve vurgu yapıları, akademik ve resmî dil, hafifletme, çıkarım, eşdizim, deyimler ve dilek kipi.',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'ingilizce-5.u1',
      ad: 'Gelişmiş zaman, devrik ve vurgu yapıları',
      dersler: [
        Ders(
          id: 'ingilizce-5.u1.d1',
          ad: 'Future perfect ve future continuous',
          dilbilgisiNotu:
              'Future continuous (will be + -ing) gelecekteki belirli bir anda sürecek eylemi anlatır. Future perfect (will have + V3) gelecekteki bir andan önce tamamlanmış olacak eylemi anlatır; sık sık by / by the time ile kullanılır. Zaman bağlacından sonra gelecek için şimdiki zaman kullanılır: by the time he arrives.',
          alistirmalar: [
            Secim(
              soru:
                  'Hangi cümle, gelecekteki bir andan önce tamamlanmış olacak eylemi anlatır?',
              secenekler: [
                'By Friday, I will have finished the report.',
                'I will finish the report on Friday.',
                'This time tomorrow, I will be finishing the report.',
              ],
              dogru: 0,
              aciklama:
                  'Will have + V3 (future perfect), belirli bir andan önce bitmiş olacak eylemi gösterir; by Friday bu anı belirtir.',
            ),
            Bosluk(
              soru: 'By the time you get home, I ___ dinner.',
              secenekler: ['cooked', 'will have cooked', 'would cook'],
              dogru: 1,
              aciklama:
                  'Sen eve gelmeden önce tamamlanmış olacak eylem için future perfect: will have cooked.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak:
                  'By next June, they will have been living here for a decade.',
              secenekler: [
                'By next June, they have been living here for a decade.',
                'By next July, they will have been living here for a decade.',
                'By next June, they will have been living here for a decade.',
              ],
              dogru: 2,
              aciklama:
                  'Will have been living, süreyi vurgulayan future perfect continuous yapısıdır; June haziran, July temmuzdur.',
            ),
            Yaz(
              soru:
                  'İngilizceye çevir: Cuma gününe kadar raporu bitirmiş olacağım.',
              cevaplar: [
                'I will have finished the report by Friday.',
                'I\'ll have finished the report by Friday.',
                'By Friday I will have finished the report.',
                'By Friday, I will have finished the report.',
                'By Friday I\'ll have finished the report.',
                'By Friday, I\'ll have finished the report.',
              ],
              aciklama:
                  'Gelecekteki bir andan önce tamamlanacak eylem: will have finished + by Friday.',
            ),
            Sirala(
              soru: 'Sıraya diz: Yarın bu saatte uçuyor olacağız.',
              kelimeler: [
                'be',
                'we',
                'time',
                'flying',
                'will',
                'tomorrow',
                'This',
              ],
              dogru: ['This', 'time', 'tomorrow', 'we', 'will', 'be', 'flying'],
              aciklama: 'Kalıp: This time tomorrow + will be + -ing.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'deadline', sag: 'son teslim tarihi'),
                (sol: 'by then', sag: 'o zamana kadar'),
                (sol: 'in the meantime', sag: 'bu arada'),
                (sol: 'ahead of schedule', sag: 'programdan önce'),
              ],
              aciklama: 'Gelecek planlarında sık geçen ifadeler.',
            ),
            Bosluk(
              soru: 'This time tomorrow, I ___ on a beach in Spain.',
              secenekler: ['will be lying', 'will have lain', 'lie'],
              dogru: 0,
              aciklama:
                  'Yarın bu saatte sürmekte olacak eylem için future continuous: will be lying.',
            ),
            Secim(
              soru:
                  'Hangi cümle, gelecekteki belirli bir anda sürmekte olacak eylemi anlatır?',
              secenekler: [
                'Next week, we will have flown to Tokyo.',
                'This time next week, we will be flying to Tokyo.',
                'Next week, we have flown to Tokyo.',
              ],
              dogru: 1,
              aciklama:
                  'Will be + -ing (future continuous), gelecekteki bir anda sürmekte olan eylemi gösterir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'This time next year, I will be studying in Canada.',
              secenekler: [
                'This time next year, I will have studied in Canada.',
                'This time next week, I will be studying in Canada.',
                'This time next year, I will be studying in Canada.',
              ],
              dogru: 2,
              aciklama:
                  'Will be studying gelecekte sürecek eylemi, will have studied ise tamamlanmış eylemi gösterir.',
            ),
            Secim(
              soru: 'Hangi cümle yanlıştır?',
              secenekler: [
                'By the time he will arrive, we will have left.',
                'By the time he arrives, we will have left.',
                'We will have left by the time he arrives.',
              ],
              dogru: 0,
              aciklama:
                  'By the time gibi zaman bağlaçlarından sonra gelecek anlamı için şimdiki zaman kullanılır: by the time he arrives.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-5.u1.d2',
          ad: 'Devrik yapılar: olumsuz zarflarla',
          dilbilgisiNotu:
              'Never, rarely, seldom, hardly, scarcely, little, not only, under no circumstances gibi olumsuz ya da sınırlayıcı ifadeler cümle başına gelince özne ile yardımcı fiil yer değiştirir: Never have I seen... Yardımcı fiil yoksa do / does / did eklenir: Not only did she win... Kalıplar: Hardly / Scarcely + had ... when, No sooner + had ... than.',
          alistirmalar: [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'hardly', sag: 'neredeyse hiç, ancak'),
                (sol: 'seldom', sag: 'nadiren'),
                (sol: 'under no circumstances', sag: 'hiçbir koşulda'),
                (sol: 'not only', sag: 'yalnızca ... değil'),
              ],
              aciklama: 'Devrik yapı başlatan ifadeler.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'Under no circumstances should you open this door.',
              secenekler: [
                'Under no circumstances should you open this door.',
                'Under no circumstances you should open this door.',
                'Under no circumstances should you close this door.',
              ],
              dogru: 0,
              aciklama:
                  'Under no circumstances başa gelince should özneden önce gelir; open açmak, close kapatmak demektir.',
            ),
            Secim(
              soru: 'Hangi cümle doğru devrik yapıdır?',
              secenekler: [
                'Never I have seen such a beautiful view.',
                'Never have I seen such a beautiful view.',
                'Never I seen such a beautiful view.',
              ],
              dogru: 1,
              aciklama:
                  'Olumsuz zarf başa gelince yardımcı fiil özneden önce gelir: Never have I seen.',
            ),
            Bosluk(
              soru: 'Rarely ___ such honesty in politics.',
              secenekler: ['we see', 'see we', 'do we see'],
              dogru: 2,
              aciklama: 'Rarely başa gelince: Rarely + do + özne + fiil.',
            ),
            Sirala(
              soru: 'Sıraya diz: Yalnızca kazanmakla kalmadı, rekor da kırdı.',
              kelimeler: [
                'the',
                'also',
                'but',
                'she',
                'only',
                'record',
                'broke',
                'she',
                'win',
                'did',
                'Not',
              ],
              dogru: [
                'Not',
                'only',
                'did',
                'she',
                'win',
                'but',
                'she',
                'also',
                'broke',
                'the',
                'record',
              ],
              aciklama: 'Kalıp: Not only + did + özne + fiil, but ... also ...',
            ),
            Secim(
              soru: '"No sooner" ile hangi bağlaç kullanılır?',
              secenekler: ['than', 'when', 'that'],
              dogru: 0,
              aciklama:
                  'Kalıp: No sooner had + özne + V3 + than. (Hardly had ... when da kullanılır.)',
            ),
            Yaz(
              soru:
                  'İngilizceye çevir: Hiç bu kadar güzel bir şarkı duymamıştım.',
              cevaplar: [
                'Never had I heard such a beautiful song.',
                'Never before had I heard such a beautiful song.',
                'Never had I heard such a lovely song.',
                'Never before had I heard such a lovely song.',
                'Never had I heard such a beautiful song before.',
                'I had never heard such a beautiful song.',
                'I had never heard such a lovely song.',
                'I had never heard such a beautiful song before.',
                'I had never heard such a lovely song before.',
              ],
              aciklama:
                  'Never başa gelince yardımcı fiil özneden önce gelir: Never had I heard.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'Little did he know that the plan had failed.',
              secenekler: [
                'Little he knew that the plan had failed.',
                'Little did he know that the plan had failed.',
                'Little did he know that the plan had worked.',
              ],
              dogru: 1,
              aciklama:
                  'Little did he know = Planın başarısız olduğundan haberi bile yoktu; devrik yapı kullanılır.',
            ),
            Bosluk(
              soru: 'Hardly ___ the house when it started to rain.',
              secenekler: ['we had entered', 'did we enter', 'had we entered'],
              dogru: 2,
              aciklama: 'Kalıp: Hardly had + özne + V3 + when.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'Not only did she pass the exam, but she also got the highest mark.',
                'Not only she passed the exam, but she also got the highest mark.',
                'Not only passed she the exam, but she also got the highest mark.',
              ],
              dogru: 0,
              aciklama:
                  'Not only başa gelince do/did eklenir ve özne yardımcı fiilden sonra gelir: Not only did she pass.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-5.u1.d3',
          ad: 'Cleft cümleler: vurgu',
          dilbilgisiNotu:
              'It-cleft: It was + vurgulanan öğe + that / who ...: It was Maria who solved the problem. Wh-cleft: What I need is a holiday. Diğer kalıplar: All I want is ..., The reason why ... is that ..., What happened was that ... Bu yapılar cümlenin bir öğesini öne çıkarır.',
          alistirmalar: [
            Secim(
              soru: 'Hangi cümle vurgulamak için it-cleft yapısını kullanır?',
              secenekler: [
                'It was the manager who signed the contract.',
                'The manager signed the contract.',
                'The contract was signed by the manager.',
              ],
              dogru: 0,
              aciklama:
                  'It was + vurgulanan öğe + who/that kalıbı it-cleft yapısıdır.',
            ),
            Sirala(
              soru: 'Sıraya diz: Beni rahatsız eden şey gürültüydü.',
              kelimeler: ['the', 'me', 'What', 'noise', 'was', 'bothered'],
              dogru: ['What', 'bothered', 'me', 'was', 'the', 'noise'],
              aciklama: 'Kalıp: What + özne + fiil + was + vurgulanan öğe.',
            ),
            Bosluk(
              soru: '___ I really enjoyed was the live music.',
              secenekler: ['That', 'What', 'Which'],
              dogru: 1,
              aciklama: 'Wh-cleft kalıbı: What + özne + fiil + is/was ...',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'What surprised me most was her honesty.',
              secenekler: [
                'What surprised me most was his honesty.',
                'What surprised me most is her honesty.',
                'What surprised me most was her honesty.',
              ],
              dogru: 2,
              aciklama:
                  'Dikkatli dinle: her onun (kadın), his onun (erkek) demektir; was geçmiş, is şimdiki zamandır.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'the reason why', sag: '... nedeni'),
                (sol: 'the thing is', sag: 'mesele şu ki'),
                (sol: 'all I want', sag: 'tek istediğim'),
                (sol: 'what matters', sag: 'önemli olan'),
              ],
              aciklama: 'Vurgu yapmak için sık kullanılan kalıplar.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: İstediğim tek şey biraz sessizlik.',
              cevaplar: [
                'All I want is some peace and quiet.',
                'All I want is some quiet.',
                'All I want is a bit of quiet.',
                'All I want is a little quiet.',
                'All I want is some silence.',
                'The only thing I want is some quiet.',
                'All I want is peace and quiet.',
              ],
              aciklama:
                  'All I want is ... kalıbı "istediğim tek şey" anlamında vurgu yapar.',
            ),
            Secim(
              soru: '"What I need is a long holiday." cümlesi hangi yapıdır?',
              secenekler: [
                'Wh-cleft (what ile vurgu)',
                'Edilgen yapı',
                'Soru cümlesi',
              ],
              dogru: 0,
              aciklama:
                  'What ile başlayan ve is/was ile devam eden yapı wh-cleft cümlesidir.',
            ),
            Bosluk(
              soru: 'It was Tom ___ broke the window, not Sam.',
              secenekler: ['which', 'who', 'whose'],
              dogru: 1,
              aciklama: 'Kişiyi vurgulayan it-cleft yapısında who kullanılır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'It was last year that we moved to London.',
              secenekler: [
                'It was last week that we moved to London.',
                'It was last year that we moved to Dublin.',
                'It was last year that we moved to London.',
              ],
              dogru: 2,
              aciklama:
                  'Last year geçen yıl, last week geçen hafta; London Londra, Dublin Dublin\'dir.',
            ),
            Secim(
              soru: 'Hangi cümle yanlıştır?',
              secenekler: [
                'It was my brother which called me.',
                'It was my brother who called me.',
                'It was my brother that called me.',
              ],
              dogru: 0,
              aciklama:
                  'Kişi için who ya da that kullanılır; which kişiler için kullanılmaz.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-5.u1.d4',
          ad: 'Karışık ve devrik koşul cümleleri',
          dilbilgisiNotu:
              'Karışık koşullu: geçmişteki neden, şimdiki sonuç: If I had taken that job, I would be living in Paris now. Resmî yazıda if atılarak devrik koşul kurulur: Had I known, I would have called (= If I had known); Should you need help, ... (= If you need help); Were I you, ... (= If I were you).',
          alistirmalar: [
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak:
                  'Had I known about the delay, I would have taken the train.',
              secenekler: [
                'Had I known about the delay, I would have taken the train.',
                'Had I known about the delay, I would take the train.',
                'Had I known about the delay, I would have taken the plane.',
              ],
              dogru: 0,
              aciklama:
                  'Üçüncü tip koşulun devrik biçimi: Had + özne + V3, would have + V3; train tren, plane uçaktır.',
            ),
            Secim(
              soru:
                  'Hangi cümle karışık koşulludur (geçmişteki neden, şimdiki sonuç)?',
              secenekler: [
                'If I took that job, I would live in Paris.',
                'If I had taken that job, I would be living in Paris now.',
                'If I had taken that job, I would have lived in Paris.',
              ],
              dogru: 1,
              aciklama:
                  'If + past perfect, would + V1 (now): geçmişteki bir olay şimdiki durumu etkiler.',
            ),
            Bosluk(
              soru: 'Should you ___ any help, please call me.',
              secenekler: ['needed', 'will need', 'need'],
              dogru: 2,
              aciklama: 'Should + özne + V1: if you need ile aynı anlamdadır.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'provided that', sag: 'şartıyla'),
                (sol: 'unless', sag: '-medikçe, olmadıkça'),
                (sol: 'otherwise', sag: 'aksi takdirde'),
                (sol: 'as long as', sag: '... sürece'),
              ],
              aciklama: 'Koşul bildiren bağlaçlar ve ifadeler.',
            ),
            Sirala(
              soru:
                  'Sıraya diz: İhtiyacınız olursa lütfen bizimle iletişime geçin.',
              kelimeler: [
                'contact',
                'help',
                'you',
                'us',
                'please',
                'need',
                'Should',
              ],
              dogru: [
                'Should',
                'you',
                'need',
                'help',
                'please',
                'contact',
                'us',
              ],
              aciklama: 'Kalıp: Should + özne + V1, ... (resmî koşul).',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Bilseydim sana söylerdim.',
              cevaplar: [
                'Had I known, I would have told you.',
                'Had I known I would have told you.',
                'If I had known, I would have told you.',
                'If I had known I would have told you.',
                'Had I known, I\'d have told you.',
                'Had I known I\'d have told you.',
                'If I had known, I\'d have told you.',
                'If I had known I\'d have told you.',
                'I would have told you if I had known.',
                'I\'d have told you if I had known.',
              ],
              aciklama:
                  'Üçüncü tip koşul: If I had known / Had I known + would have told.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'If he were more patient, he would have more friends.',
              secenekler: [
                'If he were more patient, he would have more friends.',
                'If he were more patient, he would have fewer friends.',
                'If he were more patient, he would have had more friends.',
              ],
              dogru: 0,
              aciklama:
                  'Şimdiki gerçek dışı durum: If + were, would + V1; more daha fazla, fewer daha az demektir.',
            ),
            Secim(
              soru:
                  '"Had I known, I would have called you." cümlesinin eşiti hangisidir?',
              secenekler: [
                'If I knew, I would call you.',
                'If I had known, I would have called you.',
                'If I have known, I will call you.',
              ],
              dogru: 1,
              aciklama:
                  'Had + özne + V3 yapısı, if I had + V3 ile aynı anlamdadır (resmî ve yazı dili).',
            ),
            Bosluk(
              soru: 'If I had saved more money, I ___ a house now.',
              secenekler: ['would have owned', 'will own', 'would own'],
              dogru: 2,
              aciklama: 'Geçmişteki neden, şimdiki sonuç (now): would + V1.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'Were I you, I would apologise.',
                'Would I be you, I would apologise.',
                'Am I you, I would apologise.',
              ],
              dogru: 0,
              aciklama: 'Devrik biçim: Were I you = If I were you.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-5.u2',
      ad: 'Resmî dil ve söylem',
      dersler: [
        Ders(
          id: 'ingilizce-5.u2.d1',
          ad: 'İsimleştirme ve akademik kayıt',
          dilbilgisiNotu:
              'Akademik ve resmî yazıda fiil ve sıfatlar isimleştirilir: introduce - introduction, fail - failure, improve - improvement, arrive - arrival, aware - awareness. Sonuç: daha yoğun, daha resmî anlatım. The introduction of new rules led to a reduction in costs.',
          alistirmalar: [
            Bosluk(
              soru: 'The ___ of new technology reduced costs. (introduce)',
              secenekler: ['introduction', 'introduce', 'introduced'],
              dogru: 0,
              aciklama: '"The" ile isim beklenir: introduce → introduction.',
            ),
            Secim(
              soru: 'Hangisi daha resmî ve akademik bir ifadedir?',
              secenekler: [
                'The company got bigger, so loads more people got jobs.',
                'The company\'s expansion resulted in a significant rise in employment.',
                'The company grew a lot and, you know, hired many people.',
              ],
              dogru: 1,
              aciklama:
                  'Akademik yazıda isimleştirme (expansion, rise) ve resmî sözcükler tercih edilir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'The government announced a reduction in taxes.',
              secenekler: [
                'The government announced a reduction in tasks.',
                'The government announced an introduction in taxes.',
                'The government announced a reduction in taxes.',
              ],
              dogru: 2,
              aciklama:
                  'Reduction azalma demektir; taxes vergiler, tasks görevlerdir.',
            ),
            Sirala(
              soru:
                  'Sıraya diz: Yeni kuralların getirilmesi maliyetleri düşürdü.',
              kelimeler: [
                'reduced',
                'new',
                'introduction',
                'costs',
                'rules',
                'of',
                'The',
              ],
              dogru: [
                'The',
                'introduction',
                'of',
                'new',
                'rules',
                'reduced',
                'costs',
              ],
              aciklama: 'Fiil yerine isim: introduce → the introduction of ...',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Fiyatlarda önemli bir artış oldu.',
              cevaplar: [
                'There has been a significant increase in prices.',
                'There was a significant increase in prices.',
                'There has been a significant rise in prices.',
                'There was a significant rise in prices.',
                'There has been a considerable increase in prices.',
                'There was a considerable increase in prices.',
              ],
              aciklama:
                  'İsimleştirme: increase (artmak) → an increase (artış).',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'decision', sag: 'karar'),
                (sol: 'improvement', sag: 'iyileştirme'),
                (sol: 'awareness', sag: 'farkındalık'),
                (sol: 'reduction', sag: 'azalma'),
              ],
              aciklama: 'Fiilden türeyen ve akademik yazıda sık geçen isimler.',
            ),
            Secim(
              soru: 'Hangi isimleştirme doğrudur?',
              secenekler: [
                'arrive → arrival',
                'arrive → arrivement',
                'arrive → arrivation',
              ],
              dogru: 0,
              aciklama: 'Arrive fiilinin isim hâli arrival\'dır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'There has been a significant increase in demand.',
              secenekler: [
                'There has been a significant decrease in demand.',
                'There has been a significant increase in demand.',
                'There has been a significant increase in prices.',
              ],
              dogru: 1,
              aciklama:
                  'Increase artış, decrease azalıştır; demand talep, prices fiyatlardır.',
            ),
            Bosluk(
              soru: 'Her ___ of the problem helped us solve it. (aware)',
              secenekler: ['aware', 'awarely', 'awareness'],
              dogru: 2,
              aciklama: 'Sıfat aware isimleştirilince awareness olur.',
            ),
            Secim(
              soru: 'Hangi cümle yanlıştır?',
              secenekler: [
                'There has been an improve in air quality.',
                'There has been an improvement in air quality.',
                'There has been a reduction in air pollution.',
              ],
              dogru: 0,
              aciklama:
                  'İsim gereken yerde fiil kullanılamaz: improve değil improvement olmalıdır.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-5.u2.d2',
          ad: 'Bağlaçlar ve söylem işaretleri',
          dilbilgisiNotu:
              'Zıtlık: however, nevertheless, nonetheless, whereas, although; despite / in spite of + isim (of yok: despite of yanlıştır). Ekleme: moreover, furthermore, in addition. Sonuç: consequently, therefore, as a result. Düzen: firstly, finally, in conclusion. However ve moreover gibi söylem işaretlerinden önce nokta ya da noktalı virgül, sonra virgül gelir.',
          alistirmalar: [
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'Moreover, the new policy is cheaper to run.',
              secenekler: [
                'Moreover, the new policy is cheaper to run.',
                'However, the new policy is cheaper to run.',
                'Moreover, the new policy is cheaper to rent.',
              ],
              dogru: 0,
              aciklama:
                  'Moreover dahası (ekleme), however ise ancak (zıtlık) demektir; run işletmek, rent kiralamaktır.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'nonetheless', sag: 'buna rağmen'),
                (sol: 'furthermore', sag: 'dahası'),
                (sol: 'therefore', sag: 'bu nedenle'),
                (sol: 'in conclusion', sag: 'sonuç olarak'),
              ],
              aciklama: 'Söylem işaretleri.',
            ),
            Secim(
              soru: '"Nevertheless" hangi ilişkiyi kurar?',
              secenekler: ['Sonuç', 'Zıtlık (yine de)', 'Ekleme'],
              dogru: 1,
              aciklama: 'Nevertheless = yine de, buna rağmen; zıtlık bildirir.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Hava kötü olmasına rağmen maça gittik.',
              cevaplar: [
                'Despite the bad weather, we went to the match.',
                'Despite the bad weather we went to the match.',
                'In spite of the bad weather, we went to the match.',
                'In spite of the bad weather we went to the match.',
                'Although the weather was bad, we went to the match.',
                'Although the weather was bad we went to the match.',
                'Even though the weather was bad, we went to the match.',
                'Even though the weather was bad we went to the match.',
                'Despite the bad weather, we went to the game.',
                'Despite the bad weather we went to the game.',
                'In spite of the bad weather, we went to the game.',
                'In spite of the bad weather we went to the game.',
                'Although the weather was bad, we went to the game.',
                'Although the weather was bad we went to the game.',
                'Even though the weather was bad, we went to the game.',
                'Even though the weather was bad we went to the game.',
                'We went to the match despite the bad weather.',
                'We went to the match in spite of the bad weather.',
                'We went to the game despite the bad weather.',
                'We went to the game in spite of the bad weather.',
                'We went to the match although the weather was bad.',
                'We went to the match even though the weather was bad.',
              ],
              aciklama:
                  'Despite / in spite of + isim; although / even though + cümle.',
            ),
            Bosluk(
              soru: 'The results were promising, ___ the sample was small.',
              secenekler: ['despite', 'therefore', 'although'],
              dogru: 2,
              aciklama:
                  'Although bir yan cümle (the sample was small) alır; despite isim ister.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'Whereas prices rose, wages remained the same.',
              secenekler: [
                'Whereas prices rose, wages remained the same.',
                'Whereas prices fell, wages remained the same.',
                'Although prices rose, wages remained the same.',
              ],
              dogru: 0,
              aciklama:
                  'Whereas oysa (zıtlık) anlamındadır; rose arttı, fell düştü demektir.',
            ),
            Sirala(
              soru: 'Sıraya diz: Dahası, proje bütçenin altında kaldı.',
              kelimeler: [
                'under',
                'came',
                'the',
                'budget',
                'in',
                'project',
                'Moreover',
              ],
              dogru: [
                'Moreover',
                'the',
                'project',
                'came',
                'in',
                'under',
                'budget',
              ],
              aciklama:
                  'Moreover ekleme bildirir; came in under budget bütçenin altında kalmak demektir.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'The plan was risky, nevertheless they went ahead.',
                'The plan was risky; nevertheless, they went ahead.',
                'The plan was risky; nevertheless, because they went ahead.',
              ],
              dogru: 1,
              aciklama:
                  'Nevertheless\'tan önce nokta ya da noktalı virgül, sonra virgül gelir.',
            ),
            Bosluk(
              soru: 'Sales fell sharply; ___, the company had to cut jobs.',
              secenekler: ['whereas', 'although', 'consequently'],
              dogru: 2,
              aciklama:
                  'Consequently = sonuç olarak; sonuç bildiren söylem işaretidir.',
            ),
            Secim(
              soru: 'Hangisi "despite" ile doğru kurulmuştur?',
              secenekler: [
                'Despite the rain, we enjoyed the trip.',
                'Despite of the rain, we enjoyed the trip.',
                'Despite it rained, we enjoyed the trip.',
              ],
              dogru: 0,
              aciklama:
                  'Despite doğrudan isim ya da -ing alır; of almaz ve yan cümle almaz.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-5.u2.d3',
          ad: 'Hedging: hafifletme ve kesinlik',
          dilbilgisiNotu:
              'Akademik yazıda kesin hükümlerden kaçınmak için hafifletme (hedging) kullanılır: seems / appears to, tends to, may / might / could, it is likely that, to some extent, arguably; prove yerine suggest / indicate. Güçlü kesinlik için: undoubtedly, clearly, it is evident that, without doubt.',
          alistirmalar: [
            Sirala(
              soru:
                  'Sıraya diz: Bulgular bir bağlantı olabileceğini düşündürüyor.',
              kelimeler: [
                'a',
                'may',
                'that',
                'findings',
                'link',
                'be',
                'there',
                'suggest',
                'The',
              ],
              dogru: [
                'The',
                'findings',
                'suggest',
                'that',
                'there',
                'may',
                'be',
                'a',
                'link',
              ],
              aciklama: 'Suggest that + may: temkinli akademik anlatım.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'It would appear that the figures are incorrect.',
              secenekler: [
                'It would appear that the figures are incorrect.',
                'It would appear that the figures are correct.',
                'It would appear that the figures are incomplete.',
              ],
              dogru: 0,
              aciklama:
                  'Incorrect yanlış, correct doğru, incomplete eksik demektir.',
            ),
            Secim(
              soru: 'Hangi cümle daha temkinli (hedged) bir ifadedir?',
              secenekler: [
                'The results prove that exercise improves memory.',
                'The results suggest that exercise may improve memory.',
                'Exercise definitely improves memory.',
              ],
              dogru: 1,
              aciklama:
                  'Suggest ve may hükmü hafifletir; prove ve definitely kesinlik bildirir.',
            ),
            Bosluk(
              soru:
                  'Temkinli bir dille: The study ___ that the policy has had little effect.',
              secenekler: ['proves', 'demonstrates conclusively', 'suggests'],
              dogru: 2,
              aciklama:
                  'Suggests hükmü hafifletir; proves kesin kanıt anlamı taşır.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'tend to', sag: 'eğiliminde olmak'),
                (sol: 'arguably', sag: 'savunulabilir biçimde'),
                (sol: 'undoubtedly', sag: 'kuşkusuz'),
                (sol: 'to some extent', sag: 'bir dereceye kadar'),
              ],
              aciklama: 'Hafifletme ve kesinlik ifadeleri.',
            ),
            Secim(
              soru: 'Hangisi güçlü kesinlik bildirir?',
              secenekler: [
                'It is undeniable that prices have risen.',
                'It seems that prices have risen.',
                'Prices may have risen.',
              ],
              dogru: 0,
              aciklama:
                  'Undeniable = yadsınamaz; seems ve may belirsizlik bildirir.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Bu durum sorunu kısmen açıklayabilir.',
              cevaplar: [
                'This may partly explain the problem.',
                'This might partly explain the problem.',
                'This could partly explain the problem.',
                'This may partially explain the problem.',
                'This might partially explain the problem.',
                'This could partially explain the problem.',
              ],
              aciklama: 'Hafifletme: may / might / could + partly.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'To some extent, the findings support our hypothesis.',
              secenekler: [
                'To a large extent, the findings support our hypothesis.',
                'To some extent, the findings support our hypothesis.',
                'To some extent, the findings contradict our hypothesis.',
              ],
              dogru: 1,
              aciklama:
                  'To some extent = bir dereceye kadar; support destekler, contradict çürütür.',
            ),
            Bosluk(
              soru: 'Younger people ___ to prefer online shopping.',
              secenekler: ['tends', 'tending', 'tend'],
              dogru: 2,
              aciklama: 'Özne çoğul (people) olduğu için tend kullanılır.',
            ),
            Secim(
              soru:
                  '"Young people tend to prefer online shopping." cümlesinde "tend to" ne anlatır?',
              secenekler: [
                'Çoğu zaman böyle olma eğilimi',
                'Her zaman böyle olması',
                'Asla böyle olmaması',
              ],
              dogru: 0,
              aciklama:
                  'Tend to genellemeyi yumuşatır: çoğunlukla öyle, ama her zaman değil.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-5.u2.d4',
          ad: 'Çıkarım ve ima',
          dilbilgisiNotu:
              'Geçmişle ilgili çıkarım: must have + V3 (neredeyse kesin), can\'t / couldn\'t have + V3 (olamaz), might / may / could have + V3 (olabilir). Imply: konuşan ima eder; infer: dinleyen çıkarım yapar. Satır aralarını okumak için bağlamdan ipucu aranır.',
          alistirmalar: [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'imply', sag: 'ima etmek'),
                (sol: 'infer', sag: 'çıkarım yapmak'),
                (sol: 'hint', sag: 'ima, ipucu'),
                (sol: 'conclude', sag: 'sonuca varmak'),
              ],
              aciklama: 'Çıkarım ve ima ile ilgili fiiller.',
            ),
            Secim(
              soru:
                  'Hangi cümle, geçmişte olması neredeyse kesin bir durumu anlatır?',
              secenekler: [
                'She must have left already; her coat is gone.',
                'She might have left already.',
                'She will leave already.',
              ],
              dogru: 0,
              aciklama:
                  'Must have + V3, geçmişle ilgili güçlü çıkarım bildirir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'You must have been exhausted after the journey.',
              secenekler: [
                'You must be exhausted after the journey.',
                'You must have been exhausted after the journey.',
                'You must have been excited after the journey.',
              ],
              dogru: 1,
              aciklama:
                  'Must have been geçmişle ilgili çıkarımdır; exhausted bitkin, excited heyecanlı demektir.',
            ),
            Sirala(
              soru: 'Sıraya diz: Bunu kasten yapmış olamaz.',
              kelimeler: [
                'on',
                'done',
                'can\'t',
                'purpose',
                'it',
                'have',
                'He',
              ],
              dogru: ['He', 'can\'t', 'have', 'done', 'it', 'on', 'purpose'],
              aciklama: 'Kalıp: can\'t have + V3.',
            ),
            Bosluk(
              soru: 'The lights are off. They ___ gone to bed.',
              secenekler: ['must', 'should', 'must have'],
              dogru: 2,
              aciklama: 'Geçmiş çıkarımı için must have + V3 kullanılır.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Ali anahtarlarını evde unutmuş olmalı.',
              cevaplar: [
                'Ali must have forgotten his keys at home.',
                'Ali must have left his keys at home.',
                'Ali must have forgotten his keys at the house.',
                'Ali must have left his keys at the house.',
              ],
              aciklama: 'Geçmişle ilgili güçlü çıkarım: must have + V3.',
            ),
            Secim(
              soru: '"He can\'t have seen us." ne anlama gelir?',
              secenekler: [
                'Bizi görmüş olamaz.',
                'Bizi görmemiş olabilir.',
                'Bizi görmesi gerekmiyordu.',
              ],
              dogru: 0,
              aciklama:
                  'Can\'t have + V3, geçmişte olmasının imkânsız olduğunu düşündüğümüzü gösterir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'She can\'t have forgotten our meeting.',
              secenekler: [
                'She can\'t forget our meeting.',
                'She can\'t have forgotten our meeting.',
                'She might have forgotten our meeting.',
              ],
              dogru: 1,
              aciklama:
                  'Can\'t have forgotten = unutmuş olamaz; might have forgotten = unutmuş olabilir.',
            ),
            Bosluk(
              soru:
                  'His car wasn\'t there, so he ___ been at home. (kesinlikle evde olamaz)',
              secenekler: ['must have', 'needn\'t have', 'can\'t have'],
              dogru: 2,
              aciklama:
                  'Olması imkânsız görünen geçmiş durum için can\'t have + V3.',
            ),
            Secim(
              soru: 'Imply ve infer arasındaki fark nedir?',
              secenekler: [
                'Imply: konuşan ima eder; infer: dinleyen çıkarım yapar.',
                'Imply: dinleyen çıkarım yapar; infer: konuşan ima eder.',
                'İkisi tamamen aynıdır ve yer değiştirebilir.',
              ],
              dogru: 0,
              aciklama:
                  'Konuşan ima eder (imply), dinleyen sonuç çıkarır (infer).',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-5.u3',
      ad: 'Eşdizim, deyim ve dilek kipi',
      dersler: [
        Ders(
          id: 'ingilizce-5.u3.d1',
          ad: 'Eşdizim (collocation)',
          dilbilgisiNotu:
              'Eşdizim, sözcüklerin doğal biçimde birlikte kullanılmasıdır. make a decision / an effort / progress; do research / homework / damage; take a risk / a break / responsibility; pay attention; heavy rain (strong rain denmez); bitterly cold; deeply concerned; highly unlikely; reach a conclusion.',
          alistirmalar: [
            Bosluk(
              soru: 'We need to ___ a break; we\'ve been working for hours.',
              secenekler: ['take', 'make', 'do'],
              dogru: 0,
              aciklama: 'Mola vermek: take a break.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'We need to pay more attention to the details.',
              secenekler: [
                'We need to pay less attention to the details.',
                'We need to pay more attention to the details.',
                'We need to pay more attention to the deals.',
              ],
              dogru: 1,
              aciklama:
                  'More daha fazla, less daha az; details ayrıntılar, deals anlaşmalardır.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'make progress', sag: 'ilerleme kaydetmek'),
                (sol: 'take a risk', sag: 'risk almak'),
                (sol: 'do damage', sag: 'zarar vermek'),
                (sol: 'reach a conclusion', sag: 'bir sonuca varmak'),
              ],
              aciklama: 'Sık kullanılan eşdizimler.',
            ),
            Secim(
              soru: 'Hangi eşdizim doğrudur?',
              secenekler: [
                'do a decision',
                'create a decision',
                'make a decision',
              ],
              dogru: 2,
              aciklama: 'Karar vermek: make a decision.',
            ),
            Sirala(
              soru: 'Sıraya diz: Dün gece şiddetli yağmur vardı.',
              kelimeler: ['last', 'heavy', 'There', 'night', 'rain', 'was'],
              dogru: ['There', 'was', 'heavy', 'rain', 'last', 'night'],
              aciklama: 'Heavy rain eşdizimi.',
            ),
            Secim(
              soru: 'Hangi eşdizim doğrudur?',
              secenekler: ['heavy rain', 'strong rain', 'big rain'],
              dogru: 0,
              aciklama: 'Yağmur heavy ile birlikte kullanılır: heavy rain.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Bir karar vermemiz gerekiyor.',
              cevaplar: [
                'We need to make a decision.',
                'We have to make a decision.',
                'We must make a decision.',
                'We should make a decision.',
                'We\'ve got to make a decision.',
              ],
              aciklama: 'Make a decision eşdizimi.',
            ),
            Bosluk(
              soru: 'It was ___ cold last night; the lake froze.',
              secenekler: ['heavily', 'bitterly', 'strongly'],
              dogru: 1,
              aciklama: 'Bitterly cold = dondurucu derecede soğuk.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'She made a real effort to finish on time.',
              secenekler: [
                'She made little effort to finish on time.',
                'She made a real effect to finish on time.',
                'She made a real effort to finish on time.',
              ],
              dogru: 2,
              aciklama:
                  'Make an effort = çaba göstermek; effect etki demektir.',
            ),
            Secim(
              soru: 'Hangi eşdizim doğrudur?',
              secenekler: ['do research', 'make research', 'create research'],
              dogru: 0,
              aciklama: 'Araştırma yapmak: do research.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-5.u3.d2',
          ad: 'İleri düzey phrasal verb\'ler',
          dilbilgisiNotu:
              'come across (tesadüfen karşılaşmak), bring up (gündeme getirmek), carry out (yürütmek), look into (araştırmak), put up with (katlanmak), back down (geri adım atmak), play down (önemsiz göstermek), get away with (yanına kâr kalmak). Nesnesi ayrılabilen fiillerde zamir araya girer: bring it up, carry it out. Come across, look into, put up with ayrılmaz.',
          alistirmalar: [
            Yaz(
              soru:
                  'İngilizceye çevir: Bu gürültüye daha fazla katlanamıyorum. (put up with)',
              cevaplar: [
                'I can\'t put up with this noise any more.',
                'I can\'t put up with this noise anymore.',
                'I cannot put up with this noise any more.',
                'I cannot put up with this noise anymore.',
                'I can\'t put up with this noise any longer.',
                'I cannot put up with this noise any longer.',
              ],
              aciklama: 'Put up with = katlanmak.',
            ),
            Secim(
              soru: '"Put up with" ne demektir?',
              secenekler: [
                'katlanmak, tahammül etmek',
                'ertelemek',
                'yükseltmek',
              ],
              dogru: 0,
              aciklama: 'Put up with = katlanmak, dayanmak.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'We will carry out a survey next month.',
              secenekler: [
                'We will carry on a survey next month.',
                'We will carry out a survey next month.',
                'We will carry out a survey next week.',
              ],
              dogru: 1,
              aciklama:
                  'Carry out = yürütmek, gerçekleştirmek; carry on devam etmek demektir.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'come across', sag: 'tesadüfen karşılaşmak'),
                (sol: 'bring up', sag: 'gündeme getirmek'),
                (sol: 'look into', sag: 'araştırmak'),
                (sol: 'get away with', sag: 'yanına kâr kalmak'),
              ],
              aciklama: 'İleri düzey phrasal verb\'ler.',
            ),
            Bosluk(
              soru: 'The police are ___ the case.',
              secenekler: ['looking after', 'looking up', 'looking into'],
              dogru: 2,
              aciklama:
                  'Look into = bir konuyu araştırmak; look after bakmak demektir.',
            ),
            Sirala(
              soru:
                  'Sıraya diz: Yeni bir ekip bunu yürütecek. (bunu = soruşturmayı)',
              kelimeler: ['it', 'will', 'new', 'out', 'carry', 'team', 'A'],
              dogru: ['A', 'new', 'team', 'will', 'carry', 'it', 'out'],
              aciklama:
                  'Ayrılabilen phrasal verb\'de nesne zamirse araya girer: carry it out.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'Let\'s bring it up at the meeting.',
                'Let\'s bring up it at the meeting.',
                'Let\'s bring up at the meeting it.',
              ],
              dogru: 0,
              aciklama:
                  'Ayrılabilen phrasal verb\'lerde zamir araya girer: bring it up.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'He backed down after the long argument.',
              secenekler: [
                'He backed up after the long argument.',
                'He backed down after the long argument.',
                'He backed down after the long agreement.',
              ],
              dogru: 1,
              aciklama:
                  'Back down = geri adım atmak; argument tartışma, agreement anlaşmadır.',
            ),
            Bosluk(
              soru: 'Don\'t try to ___ the problem; it is serious.',
              secenekler: ['play along', 'play out', 'play down'],
              dogru: 2,
              aciklama: 'Play down = önemsizmiş gibi göstermek.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'I came across an old photo yesterday.',
                'I came an old photo across yesterday.',
                'I came across to an old photo yesterday.',
              ],
              dogru: 0,
              aciklama:
                  'Come across ayrılmaz ve ek edat almaz: come across + nesne.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-5.u3.d3',
          ad: 'Deyimsel ifadeler',
          dilbilgisiNotu:
              'Deyimler sözcük sözcük çevrilmez: break the ice (ortamı yumuşatmak), a blessing in disguise (hayırlı talihsizlik), the tip of the iceberg (buzdağının görünen kısmı), once in a blue moon (çok nadiren), hit the nail on the head (tam isabet), under the weather (keyifsiz, hasta), cost an arm and a leg (çok pahalı), bite the bullet (zora katlanmak).',
          alistirmalar: [
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'We played a game to break the ice.',
              secenekler: [
                'We played a game to break the ice.',
                'We played a game to break the rules.',
                'We played a game to break the silence.',
              ],
              dogru: 0,
              aciklama:
                  'Break the ice = ortamı yumuşatmak; rules kurallar, silence sessizliktir.',
            ),
            Secim(
              soru: '"Once in a blue moon" ne anlama gelir?',
              secenekler: ['Her ay', 'Çok nadiren', 'Gece yarısı'],
              dogru: 1,
              aciklama: 'Once in a blue moon = çok nadiren.',
            ),
            Sirala(
              soru: 'Sıraya diz: Bu telefon çok pahalıya mal oldu.',
              kelimeler: [
                'a',
                'arm',
                'cost',
                'This',
                'leg',
                'and',
                'an',
                'phone',
              ],
              dogru: ['This', 'phone', 'cost', 'an', 'arm', 'and', 'a', 'leg'],
              aciklama: 'Cost an arm and a leg = çok pahalıya mal olmak.',
            ),
            Bosluk(
              soru:
                  'Losing that job was a blessing in ___; I found a much better one.',
              secenekler: ['secret', 'shadow', 'disguise'],
              dogru: 2,
              aciklama:
                  'A blessing in disguise = görünüşte kötü, aslında hayırlı olay.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'break the ice', sag: 'ortamı yumuşatmak'),
                (sol: 'once in a blue moon', sag: 'çok nadiren'),
                (sol: 'under the weather', sag: 'keyifsiz, hasta'),
                (
                  sol: 'the tip of the iceberg',
                  sag: 'buzdağının görünen kısmı',
                ),
              ],
              aciklama: 'Sık kullanılan deyimler.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'This problem is just the tip of the iceberg.',
              secenekler: [
                'This problem is just the tip of the iceberg.',
                'This problem is just the top of the iceberg.',
                'This problem is just the tip of the island.',
              ],
              dogru: 0,
              aciklama: 'Deyim: the tip of the iceberg.',
            ),
            Secim(
              soru: 'Hangi deyim "çok pahalıya mal olmak" anlamındadır?',
              secenekler: [
                'break the ice',
                'cost an arm and a leg',
                'under the weather',
              ],
              dogru: 1,
              aciklama: 'Cost an arm and a leg = çok pahalı olmak.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Dişimizi sıkıp bu işi yapmalıyız.',
              cevaplar: [
                'We have to bite the bullet and do it.',
                'We need to bite the bullet and do it.',
                'We must bite the bullet and do it.',
                'We should bite the bullet and do it.',
                'We just have to bite the bullet and do it.',
                'We have to bite the bullet.',
                'We need to bite the bullet.',
                'We must bite the bullet.',
                'We should bite the bullet.',
                'Let\'s bite the bullet and do it.',
                'Let\'s bite the bullet and do this.',
                'Let\'s bite the bullet and do the job.',
                'We have to bite the bullet and get it done.',
                'We need to bite the bullet and get it done.',
                'Let\'s bite the bullet and get it done.',
                'We have to bite the bullet and do this.',
                'We have to bite the bullet and do this job.',
                'We need to bite the bullet and do this job.',
                'Let\'s bite the bullet and do this job.',
                'We have to bite the bullet and do the job.',
                'We just have to bite the bullet.',
              ],
              aciklama: 'Bite the bullet = zor bir işe katlanmak.',
            ),
            Bosluk(
              soru:
                  'I\'m feeling a bit under the ___ today, so I\'ll stay home.',
              secenekler: ['sky', 'rain', 'weather'],
              dogru: 2,
              aciklama: 'Under the weather = keyifsiz, biraz hasta.',
            ),
            Secim(
              soru: '"She hit the nail on the head." ne demektir?',
              secenekler: [
                'Tam isabetli bir tespit yaptı.',
                'Çivi çakarken yaralandı.',
                'Çok sinirlendi.',
              ],
              dogru: 0,
              aciklama:
                  'Hit the nail on the head = tam üstüne basmak, doğru tespit etmek.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-5.u3.d4',
          ad: 'Wish, if only ve dilek kipi',
          dilbilgisiNotu:
              'I wish / If only + past simple: şimdiki pişmanlık (I wish I had more time). I wish / If only + past perfect: geçmiş pişmanlık (I wish I had listened). I wish + would: bir davranışın değişmesini istemek (I wish he would stop). It\'s high time + past simple: It\'s high time we left. I\'d rather + özne + past simple: I\'d rather you didn\'t smoke.',
          alistirmalar: [
            Secim(
              soru: 'Hangi cümle geçmişteki bir pişmanlığı anlatır?',
              secenekler: [
                'I wish I had listened to her advice.',
                'I wish I listened to her advice.',
                'I wish I would listen to her advice.',
              ],
              dogru: 0,
              aciklama: 'Geçmiş pişmanlık: I wish + past perfect.',
            ),
            Bosluk(
              soru: 'I wish I ___ more free time these days.',
              secenekler: ['have', 'had', 'would have'],
              dogru: 1,
              aciklama: 'Şimdiki durum için I wish + past simple: had.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'I wish', sag: 'keşke (genel dilek)'),
                (sol: 'if only', sag: 'keşke (güçlü dilek)'),
                (sol: 'high time', sag: 'tam zamanı'),
                (sol: 'would rather', sag: 'tercih ederdim'),
              ],
              aciklama: 'Dilek ve tercih ifadeleri.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'I wish I had studied harder at school.',
              secenekler: [
                'I wish I studied harder at school.',
                'I wish I had studied harder at work.',
                'I wish I had studied harder at school.',
              ],
              dogru: 2,
              aciklama:
                  'Had studied geçmiş pişmanlığı gösterir; school okul, work iş demektir.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'It\'s high time we started the meeting.',
                'It\'s high time we to start the meeting.',
                'It\'s high time we will start the meeting.',
              ],
              dogru: 0,
              aciklama:
                  'It\'s (high) time + özne + past simple: yapılması gereken zaman geldi.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Keşke daha fazla zamanım olsaydı.',
              cevaplar: [
                'I wish I had more time.',
                'If only I had more time.',
                'I wish I had more free time.',
                'If only I had more free time.',
              ],
              aciklama: 'Şimdiki dilek: I wish / If only + past simple.',
            ),
            Sirala(
              soru: 'Sıraya diz: Keşke o toplantıya gitmeseydim.',
              kelimeler: [
                'that',
                'gone',
                'I',
                'I',
                'meeting',
                'to',
                'hadn\'t',
                'wish',
              ],
              dogru: [
                'I',
                'wish',
                'I',
                'hadn\'t',
                'gone',
                'to',
                'that',
                'meeting',
              ],
              aciklama: 'Geçmiş pişmanlık: I wish + hadn\'t + V3.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'I would rather you didn\'t smoke here.',
              secenekler: [
                'I would rather you didn\'t joke here.',
                'I would rather you didn\'t smoke here.',
                'I would rather not smoke here.',
              ],
              dogru: 1,
              aciklama:
                  'I\'d rather + özne + past simple: başkasının yapmamasını tercih ederim; smoke sigara içmek, joke şaka yapmaktır.',
            ),
            Bosluk(
              soru:
                  'If only we ___ the earlier train! We missed our connection.',
              secenekler: ['caught', 'would catch', 'had caught'],
              dogru: 2,
              aciklama: 'Geçmiş pişmanlık: If only + past perfect.',
            ),
            Secim(
              soru: '"I wish he would stop talking." cümlesi neyi ifade eder?',
              secenekler: [
                'Şikâyet; davranışın değişmesi isteği',
                'Geçmiş pişmanlık',
                'Gelecek planı',
              ],
              dogru: 0,
              aciklama:
                  'I wish + would, hoşnutsuz olunan bir davranışın değişmesini ister.',
            ),
          ],
        ),
      ],
    ),
  ],
);
