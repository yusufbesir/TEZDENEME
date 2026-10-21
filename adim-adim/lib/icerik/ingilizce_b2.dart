// İngilizce B2 kursu (CEFR B2): 6 ünite x 2 ders = 12 ders, ders başına 10 alıştırma.
// Sahibi: Yusuf (yusufbesir). İçerik testleri geçmeden değişmez; silme yalnız Yusuf kararıyla.
import '../model/icerik.dart';

/// İngilizce B2: Orta-ileri düzey
const Kurs ingilizceB2 = Kurs(
  id: 'ingilizce-4',
  ad: 'İngilizce B2',
  aciklama:
      'B1 sonrası orta-ileri düzey İngilizce: akademik ve iş dili, haber ve medya, varsayım ve pişmanlık, ikna ve tartışma, kültür ve sanat, bilim ve gelecek.',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'ingilizce-4.u1',
      ad: 'Akademik ve iş dünyası',
      dersler: [
        Ders(
          id: 'ingilizce-4.u1.d1',
          ad: 'Present perfect continuous ve simple',
          alistirmalar: [
            Secim(
              soru:
                  'Hangi cümle faaliyetin kendisinden çok tamamlanan sonucu ve sayıyı vurgular?',
              secenekler: [
                'I have been writing reports all week.',
                'I was writing reports this week.',
                'I have written three reports this week.',
              ],
              dogru: 2,
              aciklama:
                  'Present perfect simple biten işin sonucunu ve sayısını (three reports) öne çıkarır; continuous ise süren faaliyeti vurgular.',
            ),
            Bosluk(
              soru: 'Her eyes are red because she ___ all morning.',
              secenekler: [
                'has been crying',
                'has been cry',
                'have been crying',
              ],
              dogru: 0,
              aciklama:
                  'She ile has been + -ing kullanılır; gözlerin kırmızı olması süren eylemin görünen sonucudur.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'The team has been working on the project since March.',
              secenekler: [
                'The team has been working on the project since March.',
                'The team has been working on the project since May.',
                'The team had been working on the project since March.',
              ],
              dogru: 0,
              aciklama:
                  'Since March mart ayından beri demektir; May mayıs, had been ise geçmişte bitmiş bir süreci gösterir.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Üç saattir bu raporu yazıyorum.',
              cevaplar: [
                'I have been writing this report for three hours.',
                'I\'ve been writing this report for three hours.',
              ],
              aciklama:
                  'Süren ve süresi belirtilen eylem: have been writing + for three hours.',
            ),
            Sirala(
              soru: 'Sıraya diz: Bu proje üzerinde ne zamandır çalışıyorsun?',
              kelimeler: [
                'project',
                'been',
                'How',
                'this',
                'you',
                'on',
                'long',
                'working',
                'have',
              ],
              dogru: [
                'How',
                'long',
                'have',
                'you',
                'been',
                'working',
                'on',
                'this',
                'project',
              ],
              aciklama: 'Kalıp: How long + have + özne + been + -ing.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'research', sag: 'araştırma'),
                (sol: 'hypothesis', sag: 'hipotez'),
                (sol: 'evidence', sag: 'kanıt'),
                (sol: 'conclusion', sag: 'sonuç, çıkarım'),
              ],
              aciklama: 'Akademik yazıda sık geçen sözcükler.',
            ),
            Bosluk(
              soru: 'I ___ the report. You can read it now.',
              secenekler: ['finish', 'have been finishing', 'have finished'],
              dogru: 2,
              aciklama:
                  'Tamamlanmış ve sonucu şimdi geçerli olan iş için present perfect simple: have finished.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'I have known her for ten years.',
                'I have been knowing her for ten years.',
                'I am knowing her for ten years.',
              ],
              dogru: 0,
              aciklama:
                  'Know gibi durum fiilleri genellikle continuous kullanılmaz: have known.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'She has been studying economics for three years.',
              secenekler: [
                'She has been studying ecology for three years.',
                'She has been studying economics for thirteen years.',
                'She has been studying economics for three years.',
              ],
              dogru: 2,
              aciklama:
                  'Economics ekonomi, ecology ekoloji demektir; three üç, thirteen on üçtür.',
            ),
            Secim(
              soru: 'Hangi cümle yanlıştır?',
              secenekler: [
                'She has been working here since 2020.',
                'She has been working here for 2020.',
                'She has worked here since 2020.',
              ],
              dogru: 1,
              aciklama:
                  '2020 bir başlangıç noktasıdır; since ile kullanılır. For yalnızca süre (five years) ile gelir.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-4.u1.d2',
          ad: 'Resmî dil ve isimleştirme',
          alistirmalar: [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'whereas', sag: 'oysa, buna karşılık'),
                (sol: 'nevertheless', sag: 'yine de'),
                (sol: 'provided that', sag: 'şu koşulla ki'),
                (sol: 'furthermore', sag: 'dahası'),
              ],
              aciklama: 'Resmî yazıda argümanları bağlayan sözcükler.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'We would be grateful if you could reply by Friday.',
              secenekler: [
                'We would be grateful if you could reply by Friday.',
                'We would be grateful if you could reply by Monday.',
                'We would be grateful if you could apply by Friday.',
              ],
              dogru: 0,
              aciklama:
                  'Reply yanıtlamak, apply başvurmak demektir; Friday cuma, Monday pazartesidir.',
            ),
            Secim(
              soru: 'Hangisi daha resmî bir e-posta cümlesidir?',
              secenekler: [
                'Hey, got any jobs?',
                'I just wanna ask about the job.',
                'I am writing to enquire about the vacancy.',
              ],
              dogru: 2,
              aciklama:
                  'I am writing to enquire about... resmî yazışmanın standart açılışıdır; diğerleri günlük konuşma dilidir.',
            ),
            Bosluk(
              soru:
                  'They decided to cut costs. The ___ to cut costs surprised everyone.',
              secenekler: ['decided', 'decision', 'decide'],
              dogru: 1,
              aciklama:
                  'Fiil (decide) isimleştirilince decision olur; "the" ile isim beklenir.',
            ),
            Sirala(
              soru: 'Sıraya diz: Analist pozisyonuna başvurmak için yazıyorum.',
              kelimeler: [
                'analyst',
                'to',
                'am',
                'the',
                'I',
                'of',
                'apply',
                'writing',
                'position',
                'for',
              ],
              dogru: [
                'I',
                'am',
                'writing',
                'to',
                'apply',
                'for',
                'the',
                'position',
                'of',
                'analyst',
              ],
              aciklama:
                  'Başvuru mektubunun klasik açılışı: I am writing to apply for...',
            ),
            Secim(
              soru:
                  'Hangi cümle "Prices rose sharply, so people worried." cümlesinin isimleştirilmiş (nominalised) hâlidir?',
              secenekler: [
                'The sharp rise in prices worried people.',
                'Prices sharply rose and people worried.',
                'People worried that prices were rising sharply.',
              ],
              dogru: 0,
              aciklama:
                  'Fiil (rose) isme (rise) dönüşür ve cümle tek bir isim öbeğiyle başlar: The sharp rise in prices.',
            ),
            Yaz(
              soru:
                  'İngilizceye çevir (resmî mektup kapanışı): Sizden haber almayı sabırsızlıkla bekliyoruz.',
              cevaplar: [
                'We look forward to hearing from you.',
                'We are looking forward to hearing from you.',
                'We look forward to hearing from you soon.',
                'We are looking forward to hearing from you soon.',
              ],
              aciklama:
                  'Look forward to ifadesinden sonra fiil -ing alır: hearing from you.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak:
                  'Nevertheless, the results were statistically significant.',
              secenekler: [
                'Therefore, the results were statistically significant.',
                'Nevertheless, the results were statistically insignificant.',
                'Nevertheless, the results were statistically significant.',
              ],
              dogru: 2,
              aciklama:
                  'Nevertheless "yine de" anlamındadır, therefore "bu nedenle"; significant anlamlı, insignificant anlamsız demektir.',
            ),
            Bosluk(
              soru:
                  'Some students prefer lectures, ___ others like group work.',
              secenekler: ['provided that', 'nevertheless', 'whereas'],
              dogru: 2,
              aciklama:
                  'İki karşıt durumu yan yana koyan bağlaç whereas (oysa, buna karşılık) olur.',
            ),
            Secim(
              soru: '"Provided that" ne anlama gelir?',
              secenekler: [
                'oysa',
                'şu koşulla ki, şartıyla',
                'bununla birlikte',
              ],
              dogru: 1,
              aciklama:
                  'Provided that, if gibi koşul bildirir: "You may leave provided that you finish the work."',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-4.u2',
      ad: 'Haber ve medya',
      dersler: [
        Ders(
          id: 'ingilizce-4.u2.d1',
          ad: 'Modal fiillerle edilgen yapı',
          alistirmalar: [
            Secim(
              soru: 'Hangi cümle "Bu sorun çözülebilir" anlamına gelir?',
              secenekler: [
                'This problem can be solving.',
                'This problem can solve.',
                'This problem can be solved.',
              ],
              dogru: 2,
              aciklama: 'Modal + be + üçüncü hâl: can be solved.',
            ),
            Sirala(
              soru: 'Sıraya diz: Rapor cuma gününe kadar teslim edilmelidir.',
              kelimeler: [
                'by',
                'submitted',
                'The',
                'Friday',
                'be',
                'must',
                'report',
              ],
              dogru: [
                'The',
                'report',
                'must',
                'be',
                'submitted',
                'by',
                'Friday',
              ],
              aciklama: 'Kalıp: özne + must + be + üçüncü hâl.',
            ),
            Bosluk(
              soru: 'The news should ___ checked before it is published.',
              secenekler: ['been', 'be', 'being'],
              dogru: 1,
              aciklama:
                  'Modal fiilden sonra yalın be gelir: should be checked.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'The article might have been written by a journalist.',
              secenekler: [
                'The article might be written by a journalist.',
                'The article might have been written by a journalist.',
                'The article must have been written by a journalist.',
              ],
              dogru: 1,
              aciklama:
                  'Might olasılık, must güçlü çıkarım bildirir; have been written geçmişe işaret eder.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'headline', sag: 'manşet'),
                (sol: 'broadcast', sag: 'yayın'),
                (sol: 'source', sag: 'kaynak'),
                (sol: 'audience', sag: 'izleyici kitlesi'),
              ],
              aciklama: 'Medya dilinin temel sözcükleri.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Bu haber doğrulanmış olmalı.',
              cevaplar: [
                'This news must have been confirmed.',
                'This news must have been verified.',
              ],
              aciklama:
                  'Geçmişe yönelik güçlü çıkarım: must have been + üçüncü hâl.',
            ),
            Secim(
              soru:
                  '"The photos couldn\'t have been taken here." cümlesi ne ifade eder?',
              secenekler: [
                'Fotoğrafların burada çekilmiş olması imkânsız.',
                'Fotoğraflar burada çekilmeli.',
                'Fotoğraflar burada çekilebilir.',
              ],
              dogru: 0,
              aciklama:
                  'Couldn\'t have been + üçüncü hâl, geçmişle ilgili olumsuz bir çıkarımdır.',
            ),
            Bosluk(
              soru: 'The decision may ___ announced last night.',
              secenekler: ['be', 'have been', 'being'],
              dogru: 1,
              aciklama:
                  'Last night geçmişi gösterir; may have been announced kullanılır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'The suspect is believed to have left the country.',
              secenekler: [
                'The suspect is believed to leave the country.',
                'The suspect is believed to have left the county.',
                'The suspect is believed to have left the country.',
              ],
              dogru: 2,
              aciklama:
                  'Country ülke, county ilçe demektir; to have left terk etmiş olduğunu belirtir.',
            ),
            Secim(
              soru:
                  '"Someone might steal the painting." cümlesinin edilgen hâli hangisidir?',
              secenekler: [
                'The painting might be stolen.',
                'The painting might have stolen.',
                'The painting might be stealing.',
              ],
              dogru: 0,
              aciklama: 'Might + be + üçüncü hâl: might be stolen.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-4.u2.d2',
          ad: 'Aktarma fiilleri: claim, deny, suggest',
          alistirmalar: [
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'The minister denied taking the money.',
              secenekler: [
                'The minister admitted taking the money.',
                'The minister denied taking the money.',
                'The minister denied making the money.',
              ],
              dogru: 1,
              aciklama:
                  'Denied reddetti, admitted kabul etti demektir; taking almak, making yapmaktır.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'She suggested to go to the press conference.',
                'She suggested us to go to the press conference.',
                'She suggested going to the press conference.',
              ],
              dogru: 2,
              aciklama:
                  'Suggest fiilinden sonra -ing ya da that cümlesi gelir; to + fiil gelmez.',
            ),
            Bosluk(
              soru: 'The company denied ___ any rules.',
              secenekler: ['to break', 'breaking', 'break'],
              dogru: 1,
              aciklama: 'Deny fiilinden sonra -ing gelir: denied breaking.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'claim', sag: 'iddia etmek'),
                (sol: 'deny', sag: 'inkâr etmek'),
                (sol: 'admit', sag: 'itiraf etmek'),
                (sol: 'warn', sag: 'uyarmak'),
              ],
              aciklama: 'Haber dilinde sık kullanılan aktarma fiilleri.',
            ),
            Sirala(
              soru: 'Sıraya diz: Onunla hiç tanışmadığını iddia etti.',
              kelimeler: [
                'met',
                'She',
                'never',
                'claimed',
                'him',
                'had',
                'that',
                'she',
              ],
              dogru: [
                'She',
                'claimed',
                'that',
                'she',
                'had',
                'never',
                'met',
                'him',
              ],
              aciklama:
                  'Aktarılan cümlede geçmişten önceki olay için past perfect kullanılır: had never met.',
            ),
            Yaz(
              soru:
                  'İngilizceye çevir: Polis, adamın ülkeyi terk ettiğini iddia etti.',
              cevaplar: [
                'The police claimed that the man had left the country.',
                'The police claimed the man had left the country.',
                'The police claimed that the man left the country.',
                'The police claimed the man left the country.',
              ],
              aciklama: 'Claim + that cümlesi: claimed that the man had left.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'He suggested that she should apply for the job.',
              secenekler: [
                'He insisted that she should apply for the job.',
                'He suggested that he should apply for the job.',
                'He suggested that she should apply for the job.',
              ],
              dogru: 2,
              aciklama:
                  'Suggested önerdi, insisted ısrar etti demektir; she kadın başvurandır, he ise konuşanın kendisidir.',
            ),
            Secim(
              soru:
                  '"She admitted breaking the window." cümlesi ne anlama gelir?',
              secenekler: [
                'Pencereyi kırdığını kabul etti.',
                'Pencereyi kırmayı reddetti.',
                'Pencereyi kırmakla suçlandı.',
              ],
              dogru: 0,
              aciklama: 'Admit + -ing: yaptığını kabul etmek.',
            ),
            Bosluk(
              soru: 'The report suggests that prices ___ rise next year.',
              secenekler: ['are', 'will', 'to'],
              dogru: 1,
              aciklama: 'Suggest that + özne + will rise: gelecek tahmini.',
            ),
            Secim(
              soru:
                  'Hangi fiil cümleyi doğru tamamlar? She ___ to have been at home all evening.',
              secenekler: ['denied', 'suggested', 'claimed'],
              dogru: 2,
              aciklama:
                  'Claim + to have + üçüncü hâl kullanılabilir; deny ve suggest bu yapıyı almaz.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-4.u3',
      ad: 'Varsayım ve pişmanlık',
      dersler: [
        Ders(
          id: 'ingilizce-4.u3.d1',
          ad: 'Third conditional',
          alistirmalar: [
            Bosluk(
              soru: 'If I had left earlier, I ___ the train.',
              secenekler: ['had caught', 'would catch', 'would have caught'],
              dogru: 2,
              aciklama:
                  'Third conditional: If + past perfect, would have + üçüncü hâl.',
            ),
            Secim(
              soru: '"If she had studied, she would have passed." ne anlatır?',
              secenekler: [
                'Çalıştı ve geçti.',
                'Çalışırsa geçecek.',
                'Çalışmadı ve geçemedi.',
              ],
              dogru: 2,
              aciklama:
                  'Third conditional geçmişte gerçekleşmemiş durumu anlatır: çalışmadı, geçemedi.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'If we had known, we would have helped you.',
              secenekler: [
                'If we knew, we would help you.',
                'If we had known, we would have helped them.',
                'If we had known, we would have helped you.',
              ],
              dogru: 2,
              aciklama:
                  'You sana, them onlara demektir; had known ve would have helped geçmişteki varsayımı gösterir.',
            ),
            Sirala(
              soru:
                  'Sıraya diz: Daha çok antrenman yapsalardı kazanmış olurlardı.',
              kelimeler: [
                'harder',
                'They',
                'trained',
                'if',
                'won',
                'would',
                'had',
                'they',
                'have',
              ],
              dogru: [
                'They',
                'would',
                'have',
                'won',
                'if',
                'they',
                'had',
                'trained',
                'harder',
              ],
              aciklama:
                  'Sonuç cümlesi önce gelirse virgül gerekmez: ... would have won if they had trained.',
            ),
            Yaz(
              soru:
                  'Eksik parçayı yaz: If she ___ (see) him, she would have said hello.',
              cevaplar: ['had seen'],
              aciklama: 'If cümlesinde past perfect kullanılır: had seen.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'regret', sag: 'pişmanlık'),
                (sol: 'opportunity', sag: 'fırsat'),
                (sol: 'consequence', sag: 'sonuç, netice'),
                (sol: 'mistake', sag: 'hata'),
              ],
              aciklama:
                  'Pişmanlık ve varsayım anlatırken sık kullanılan sözcükler.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'If he would have told me, I would have helped.',
                'If he had told me, I would have helped.',
                'If he told me, I would have helped.',
              ],
              dogru: 1,
              aciklama: 'If cümlesinde would kullanılmaz; had told gerekir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'What would you have done if you had lost your job?',
              secenekler: [
                'What would you do if you lost your job?',
                'What would you have done if you had found a job?',
                'What would you have done if you had lost your job?',
              ],
              dogru: 2,
              aciklama:
                  'Lost kaybetmek, found bulmak demektir; would have done geçmiş varsayımı gösterir.',
            ),
            Bosluk(
              soru:
                  'She wouldn\'t have missed the flight if she ___ the alarm.',
              secenekler: ['would hear', 'had heard', 'heard'],
              dogru: 1,
              aciklama: 'If cümlesi past perfect ister: had heard.',
            ),
            Secim(
              soru: 'Third conditional ne için kullanılır?',
              secenekler: [
                'Gelecekteki kesin planlar için',
                'Geçmişte olmamış bir şeyin varsayımsal sonucu için',
                'Günlük alışkanlıklar için',
              ],
              dogru: 1,
              aciklama:
                  'Third conditional, geçmişte gerçekleşmeyen durumu ve onun hayalî sonucunu anlatır.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-4.u3.d2',
          ad: 'Karışık koşullar, wish ve if only',
          alistirmalar: [
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'If I had taken that job, I would be rich now.',
              secenekler: [
                'If I had taken that job, I would have been rich then.',
                'If I took that job, I would be rich now.',
                'If I had taken that job, I would be rich now.',
              ],
              dogru: 2,
              aciklama:
                  'Karışık koşulda geçmişteki neden (had taken) şimdiki sonucu (would be rich now) doğurur.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'I wish I were taller.', sag: 'şimdiki durum için dilek'),
                (sol: 'I wish I had studied.', sag: 'geçmiş için pişmanlık'),
                (
                  sol: 'I wish he would stop.',
                  sag: 'rahatsızlık, değişmesini isteme',
                ),
                (
                  sol: 'If only I knew.',
                  sag: 'keşke bilsem (şu an bilmiyorum)',
                ),
              ],
              aciklama: 'Wish yapıları zamana ve anlama göre değişir.',
            ),
            Secim(
              soru:
                  'Hangi cümle karışık koşuldur (geçmişteki neden, şimdiki sonuç)?',
              secenekler: [
                'If I go to bed earlier, I won\'t be tired.',
                'If I had gone to bed earlier, I wouldn\'t have been tired.',
                'If I had gone to bed earlier, I wouldn\'t be so tired now.',
              ],
              dogru: 2,
              aciklama:
                  'If + past perfect, would + yalın fiil: geçmişteki hareket şimdiki yorgunluğu etkiler.',
            ),
            Yaz(
              soru:
                  'Eksik parçayı yaz: I wish I ___ (not / eat) so much last night.',
              cevaplar: ['hadn\'t eaten', 'had not eaten'],
              aciklama:
                  'Geçmiş pişmanlığı için wish + past perfect: hadn\'t eaten.',
            ),
            Bosluk(
              soru: 'I wish I ___ a car, but I have to take the bus.',
              secenekler: ['would have', 'had', 'have'],
              dogru: 1,
              aciklama: 'Şimdiki durum için wish + past simple: I wish I had.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'I wish I had listened to your advice.',
              secenekler: [
                'I wish I had listened to your advice.',
                'I wish I listened to your advice.',
                'I wish I had listened to his advice.',
              ],
              dogru: 0,
              aciklama:
                  'Your senin, his onun demektir; wish + past perfect geçmiş pişmanlığını gösterir.',
            ),
            Sirala(
              soru: 'Sıraya diz: Keşke daha fazla vaktim olsa.',
              kelimeler: ['time', 'If', 'more', 'had', 'I', 'only'],
              dogru: ['If', 'only', 'I', 'had', 'more', 'time'],
              aciklama:
                  'If only + past simple, şimdiki zamanla ilgili güçlü bir dilektir.',
            ),
            Secim(
              soru: '"I wish you wouldn\'t shout." cümlesi ne anlatır?',
              secenekler: [
                'Bağırmandan rahatsızım.',
                'Bağırmanı çok isterim.',
                'Dün bağırmadın.',
              ],
              dogru: 0,
              aciklama:
                  'Wish + would, birinin can sıkıcı davranışının değişmesi isteğini anlatır.',
            ),
            Bosluk(
              soru: 'If I ___ harder at school, I would have a better job now.',
              secenekler: ['would study', 'would have studied', 'had studied'],
              dogru: 2,
              aciklama: 'Karışık koşul: If + past perfect, would + yalın fiil.',
            ),
            Secim(
              soru: '"If only" ile "I wish" arasındaki fark nedir?',
              secenekler: [
                'If only yalnızca soru cümlelerinde kullanılır.',
                'If only geleceği anlatır.',
                'If only dileği ve pişmanlığı daha güçlü vurgular.',
              ],
              dogru: 2,
              aciklama:
                  'If only, wish ile aynı yapıları kullanır ama duyguyu daha güçlü verir.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-4.u4',
      ad: 'İkna ve tartışma',
      dersler: [
        Ders(
          id: 'ingilizce-4.u4.d1',
          ad: 'Vurgu için devrik yapı',
          alistirmalar: [
            Sirala(
              soru: 'Sıraya diz: Böylesi yeteneği nadiren görürüz.',
              kelimeler: ['see', 'Rarely', 'talent', 'we', 'such', 'do'],
              dogru: ['Rarely', 'do', 'we', 'see', 'such', 'talent'],
              aciklama:
                  'Olumsuz zarf başa gelince yardımcı fiil özneden önce gelir: Rarely do we see.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'Not only is the plan expensive, but it is also risky.',
              secenekler: [
                'Not only is the plan cheap, but it is also risky.',
                'Not only is the plan expensive, but it is also risky.',
                'Not only is the plan expensive, but it is also easy.',
              ],
              dogru: 1,
              aciklama:
                  'Expensive pahalı, cheap ucuz; risky riskli, easy kolay demektir.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'Never I have seen such a beautiful view.',
                'Never have I saw such a beautiful view.',
                'Never have I seen such a beautiful view.',
              ],
              dogru: 2,
              aciklama: 'Never başa gelince: Never + have + özne + üçüncü hâl.',
            ),
            Bosluk(
              soru: 'Rarely ___ he make mistakes in his reports.',
              secenekler: ['is', 'does', 'do'],
              dogru: 1,
              aciklama:
                  'Üçüncü tekil özne için devrik yapıda does kullanılır: Rarely does he make.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'rarely', sag: 'nadiren'),
                (sol: 'scarcely', sag: 'güçlükle, neredeyse hiç'),
                (sol: 'under no circumstances', sag: 'hiçbir koşulda'),
                (sol: 'no sooner', sag: '...ir ...mez (hemen ardından)'),
              ],
              aciklama: 'Devrik yapıyı tetikleyen olumsuz anlamlı ifadeler.',
            ),
            Secim(
              soru: 'Devrik yapı ne için kullanılır?',
              secenekler: [
                'Geçmişi anlatmak için',
                'Soru sormayı engellemek için',
                'Vurgu yapmak ve resmî bir anlatım sağlamak için',
              ],
              dogru: 2,
              aciklama: 'Inversion, cümleye vurgu ve resmî bir ton katar.',
            ),
            Yaz(
              soru:
                  'Eksik parçayı yaz: Under no circumstances ___ you open this door. (should)',
              cevaplar: ['should'],
              aciklama:
                  'Olumsuz ifade başta olunca yardımcı fiil öznenin önüne geçer: should you open.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'Only after the vote did we realise the mistake.',
              secenekler: [
                'Only after the vote we realised the mistake.',
                'Only after the vote did we realise the mistakes.',
                'Only after the vote did we realise the mistake.',
              ],
              dogru: 2,
              aciklama:
                  'Only after ile başlayan cümlede did özneden önce gelir ve fiil yalın kalır: did we realise.',
            ),
            Bosluk(
              soru: 'Hardly had she arrived ___ the phone rang.',
              secenekler: ['than', 'when', 'if'],
              dogru: 1,
              aciklama:
                  'Hardly ... when kalıbıdır (no sooner ... than ile karıştırma).',
            ),
            Secim(
              soru: 'Hangi cümle "Little did he know" kalıbını doğru kullanır?',
              secenekler: [
                'Little did he know that the offer was a trap.',
                'Little he did know that the offer was a trap.',
                'Little did he knew that the offer was a trap.',
              ],
              dogru: 0,
              aciklama: 'Little did + özne + yalın fiil: Little did he know.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-4.u4.d2',
          ad: 'Cleft cümleler',
          alistirmalar: [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'persuade', sag: 'ikna etmek'),
                (sol: 'rebuttal', sag: 'çürütme, karşı argüman'),
                (sol: 'bias', sag: 'önyargı'),
                (sol: 'valid', sag: 'geçerli'),
              ],
              aciklama: 'Tartışma ve ikna dilinde sık geçen sözcükler.',
            ),
            Secim(
              soru: 'Hangi cümle bir cleft cümledir?',
              secenekler: [
                'I need a break.',
                'What I need is a break.',
                'A break needed me.',
              ],
              dogru: 1,
              aciklama:
                  'What ... is ... kalıbı vurgulanan öğeyi cümlenin sonuna taşır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'What really annoys me is the lack of respect.',
              secenekler: [
                'What really worries me is the lack of respect.',
                'What really annoys me is the lack of response.',
                'What really annoys me is the lack of respect.',
              ],
              dogru: 2,
              aciklama:
                  'Annoys sinirlendirir, worries endişelendirir; respect saygı, response yanıt demektir.',
            ),
            Sirala(
              soru: 'Sıraya diz: Son kararı veren müdürdü.',
              kelimeler: [
                'decision',
                'It',
                'the',
                'who',
                'was',
                'made',
                'final',
                'manager',
                'the',
              ],
              dogru: [
                'It',
                'was',
                'the',
                'manager',
                'who',
                'made',
                'the',
                'final',
                'decision',
              ],
              aciklama:
                  'Kalıp: It was + vurgulanan öğe + who/that + cümlenin kalanı.',
            ),
            Bosluk(
              soru: '___ I really want is a quiet weekend.',
              secenekler: ['That', 'Which', 'What'],
              dogru: 2,
              aciklama:
                  'What I want is... kalıbında what, "istediğim şey" anlamını verir.',
            ),
            Yaz(
              soru:
                  'Eksik sözcüğü yaz: What she wants ___ a bit of peace and quiet.',
              cevaplar: ['is'],
              aciklama:
                  'Cleft cümlede what öbeğinden sonra be fiili gelir: What she wants is...',
            ),
            Secim(
              soru:
                  '"It was John who broke the window." cümlesi neyi vurgular?',
              secenekler: [
                'Pencerenin nerede olduğunu',
                'Camı kimin kırdığını',
                'Camın ne zaman kırıldığını',
              ],
              dogru: 1,
              aciklama:
                  'It was ... who yapısı, vurgulanan kişiyi (John) öne çıkarır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'It is the quality, not the price, that matters most.',
              secenekler: [
                'It is the quality, not the price, that matters most.',
                'It is the price, not the quality, that matters most.',
                'It is the quality, not the price, that matters least.',
              ],
              dogru: 0,
              aciklama:
                  'Quality kalite, price fiyattır; most en çok, least en az demektir.',
            ),
            Bosluk(
              soru: 'All I want ___ to be left alone.',
              secenekler: ['are', 'be', 'is'],
              dogru: 2,
              aciklama: 'All I want is to ... kalıbında is kullanılır.',
            ),
            Secim(
              soru: 'Hangisi "I need more time." cümlesinin cleft hâlidir?',
              secenekler: [
                'What I need is more time.',
                'I need what is more time.',
                'More time what I need.',
              ],
              dogru: 0,
              aciklama:
                  'What I need is more time. cümlesi ihtiyaç duyulan şeyi vurgular.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-4.u5',
      ad: 'Kültür ve sanat',
      dersler: [
        Ders(
          id: 'ingilizce-4.u5.d1',
          ad: 'Defining ve non-defining ilgi cümleleri',
          alistirmalar: [
            Bosluk(
              soru: 'The author ___ book won the prize is giving a talk.',
              secenekler: ['who', 'which', 'whose'],
              dogru: 2,
              aciklama: 'Sahiplik bildirir: whose book = kitabı olan yazar.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak:
                  'The painting, which was stolen in 1990, has never been found.',
              secenekler: [
                'The painting, which was stolen in 1999, has never been found.',
                'The painting, which was stolen in 1990, has never been found.',
                'The painting that was stolen in 1990 has never been found.',
              ],
              dogru: 1,
              aciklama:
                  '1990 ile 1999 yılları karışabilir; virgüllü which ek bilgi veren non-defining cümledir.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'sculpture', sag: 'heykel'),
                (sol: 'exhibition', sag: 'sergi'),
                (sol: 'masterpiece', sag: 'başyapıt'),
                (sol: 'critic', sag: 'eleştirmen'),
              ],
              aciklama: 'Sanat dünyasının temel sözcükleri.',
            ),
            Secim(
              soru:
                  'Hangi cümle ek bilgi veren (non-defining) ilgi cümlesini doğru yazar?',
              secenekler: [
                'My brother who works in Milan, is an architect.',
                'My brother, that works in Milan, is an architect.',
                'My brother, who works in Milan, is an architect.',
              ],
              dogru: 2,
              aciklama:
                  'Non-defining cümle virgüllerle ayrılır ve that kullanılmaz.',
            ),
            Sirala(
              soru: 'Sıraya diz: İşine hayran olduğum heykeltıraş şu.',
              kelimeler: [
                'whose',
                'sculptor',
                'I',
                'That',
                'work',
                'the',
                'is',
                'admire',
              ],
              dogru: [
                'That',
                'is',
                'the',
                'sculptor',
                'whose',
                'work',
                'I',
                'admire',
              ],
              aciklama: 'Whose + isim, sahiplik bildiren ilgi sözcüğüdür.',
            ),
            Secim(
              soru:
                  'Virgüllü (non-defining) bir ilgi cümlesinde hangisi kullanılamaz?',
              secenekler: ['that', 'which', 'whose'],
              dogru: 0,
              aciklama:
                  'Non-defining cümlelerde that kullanılmaz; who, which, whose kullanılır.',
            ),
            Yaz(
              soru:
                  'Eksik sözcüğü yaz: Paris, ___ is the capital of France, has many museums.',
              cevaplar: ['which'],
              aciklama:
                  'Şehir için ek bilgi veren virgüllü cümlede which kullanılır.',
            ),
            Bosluk(
              soru: 'The exhibition ___ we visited last week was brilliant.',
              secenekler: ['whose', 'who', 'that'],
              dogru: 2,
              aciklama:
                  'Nesne için defining cümlede that (ya da which) kullanılır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak:
                  'The singer who performed last night is famous in Spain.',
              secenekler: [
                'The singer who performed last night is famous in Spain.',
                'The singer who performed last night is famous in Spain and Italy.',
                'The singer who performs every night is famous in Spain.',
              ],
              dogru: 0,
              aciklama:
                  'Performed last night geçmişte tek bir geceyi, performs every night düzenli alışkanlığı anlatır.',
            ),
            Secim(
              soru:
                  '"The book (that) I borrowed was long." cümlesinde that atılabilir mi?',
              secenekler: [
                'Hayır, that her zaman gerekir.',
                'Evet, that nesne konumundayken atılabilir.',
                'Evet, ama yalnızca özne konumundayken.',
              ],
              dogru: 1,
              aciklama:
                  'Defining cümlede ilgi sözcüğü nesne ise atılabilir: The book I borrowed.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-4.u5.d2',
          ad: 'Participle cümlecikleri',
          alistirmalar: [
            Yaz(
              soru:
                  'Cümleyi kısalt: "The man who is standing by the door is my uncle." → The man ___ by the door is my uncle.',
              cevaplar: ['standing'],
              aciklama:
                  'Who is standing, present participle ile kısalır: the man standing.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'Having finish the report, she went home.',
                'Having finished the report, she went home.',
                'Finished having the report, she went home.',
              ],
              dogru: 1,
              aciklama: 'Having + üçüncü hâl, önce biten eylemi gösterir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'Walking down the street, I met an old friend.',
              secenekler: [
                'Walking down the street, I missed an old friend.',
                'Walking down the street, I met my old friend.',
                'Walking down the street, I met an old friend.',
              ],
              dogru: 2,
              aciklama:
                  'Met karşılaştım, missed özledim ya da kaçırdım demektir; an old friend tanımsız bir arkadaştır.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'Having eaten', sag: 'yemek yedikten sonra'),
                (sol: 'Feeling tired', sag: 'yorgun hissettiği için'),
                (sol: 'Written in 1900', sag: '1900\'de yazılmış olan'),
                (sol: 'Not knowing the way', sag: 'yolu bilmediği için'),
              ],
              aciklama:
                  'Participle cümlecikleri neden, zaman ve edilgenlik anlatabilir.',
            ),
            Bosluk(
              soru: '___ by the news, she called her lawyer.',
              secenekler: ['Shocking', 'Shock', 'Shocked'],
              dogru: 2,
              aciklama:
                  'Edilgen anlam için -ed hâli kullanılır: Shocked by the news.',
            ),
            Sirala(
              soru: 'Sıraya diz: İşini bitirince doğruca eve gitti.',
              kelimeler: [
                'home',
                'she',
                'finished',
                'straight',
                'Having',
                'went',
                'work',
              ],
              dogru: [
                'Having',
                'finished',
                'work',
                'she',
                'went',
                'straight',
                'home',
              ],
              aciklama: 'Having finished, önce biten eylemi gösterir.',
            ),
            Secim(
              soru: '"Having been warned, he took an umbrella." ne anlatır?',
              secenekler: [
                'Uyarıldığı için şemsiye aldı.',
                'Uyarmak için şemsiye aldı.',
                'Şemsiye aldıktan sonra uyarıldı.',
              ],
              dogru: 0,
              aciklama:
                  'Having been + üçüncü hâl: edilgen ve önce gerçekleşen neden.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'The film directed by her won three awards.',
              secenekler: [
                'The film directed by him won three awards.',
                'The film directed by her won three awards.',
                'The film directed by her won three medals.',
              ],
              dogru: 1,
              aciklama:
                  'Her onun (kadın), him onun (erkek) demektir; awards ödüller, medals madalyalardır.',
            ),
            Bosluk(
              soru: 'The people ___ in the queue were very patient.',
              secenekler: ['waiting', 'waited', 'to waiting'],
              dogru: 0,
              aciklama:
                  'Süren eylem için present participle: the people waiting.',
            ),
            Secim(
              soru:
                  'Hangi cümlede participle ifadesinin öznesi ana cümlenin öznesiyle uyumludur?',
              secenekler: [
                'Walking to school, I saw a rainbow.',
                'Walking to school, the bag felt heavy.',
                'Walking to school, a bus hit the tree.',
              ],
              dogru: 0,
              aciklama:
                  'Walking eylemini yapan kişi "I"dır; diğer cümlelerde özne (bag, bus) yürüyemez.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-4.u6',
      ad: 'Bilim ve gelecek',
      dersler: [
        Ders(
          id: 'ingilizce-4.u6.d1',
          ad: 'Future perfect ve future continuous',
          alistirmalar: [
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'By next year, I will have finished my degree.',
              secenekler: [
                'By next year, I will be finishing my degree.',
                'By next week, I will have finished my degree.',
                'By next year, I will have finished my degree.',
              ],
              dogru: 2,
              aciklama:
                  'Will have finished belirli bir ana kadar bitmiş olacağını gösterir; next year gelecek yıl, next week gelecek haftadır.',
            ),
            Secim(
              soru:
                  'Hangi cümle "Yarın bu saatte uçakta olacağım" anlamına gelir?',
              secenekler: [
                'I will have flown tomorrow.',
                'I flew this time tomorrow.',
                'This time tomorrow I will be flying.',
              ],
              dogru: 2,
              aciklama:
                  'Gelecekteki bir anda süren eylem için future continuous: will be flying.',
            ),
            Sirala(
              soru:
                  'Sıraya diz: 2030\'a kadar bilim insanları bir tedavi bulmuş olacak.',
              kelimeler: [
                'will',
                'cure',
                'By',
                'scientists',
                'a',
                'discovered',
                '2030',
                'have',
              ],
              dogru: [
                'By',
                '2030',
                'scientists',
                'will',
                'have',
                'discovered',
                'a',
                'cure',
              ],
              aciklama: 'Kalıp: By + zaman + özne + will have + üçüncü hâl.',
            ),
            Bosluk(
              soru: 'By the time you arrive, we ___ dinner.',
              secenekler: [
                'are finishing',
                'will finish',
                'will have finished',
              ],
              dogru: 2,
              aciklama:
                  'By the time ile gelecekte o ana kadar bitmiş eylem: will have finished.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'breakthrough', sag: 'çığır açan buluş'),
                (sol: 'experiment', sag: 'deney'),
                (sol: 'theory', sag: 'kuram'),
                (sol: 'innovation', sag: 'yenilik'),
              ],
              aciklama: 'Bilim dilinin temel sözcükleri.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak:
                  'This time next week, they will be travelling across Asia.',
              secenekler: [
                'This time next week, they will be travelling across Asia.',
                'This time next week, they will have travelled across Asia.',
                'This time next week, they will be travelling across Africa.',
              ],
              dogru: 0,
              aciklama:
                  'Asia Asya, Africa Afrika demektir; will be travelling süren bir eylemi gösterir.',
            ),
            Secim(
              soru: '"Will have been working" neyi vurgular?',
              secenekler: [
                'Geçmişte bitmiş bir eylemi',
                'Gelecekteki bir ana kadar süren eylemin süresini',
                'Şimdiki alışkanlığı',
              ],
              dogru: 1,
              aciklama:
                  'Future perfect continuous, gelecekteki bir ana kadar süren eylemi ve süresini gösterir.',
            ),
            Yaz(
              soru:
                  'Eksik parçayı yaz: By December I ___ (finish) the course. (will have + üçüncü hâl)',
              cevaplar: ['will have finished', '\'ll have finished'],
              aciklama: 'Future perfect: will have + finished.',
            ),
            Bosluk(
              soru: 'Don\'t call at eight. I ___ a meeting then.',
              secenekler: [
                'will have attended',
                'will be attending',
                'attended',
              ],
              dogru: 1,
              aciklama:
                  'Gelecekteki belirli bir anda süren eylem: will be attending.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'By the end of the year, she will has saved enough money.',
                'By the end of the year, she will have save enough money.',
                'By the end of the year, she will have saved enough money.',
              ],
              dogru: 2,
              aciklama: 'Will have + üçüncü hâl: will have saved.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-4.u6.d2',
          ad: 'Tahmin kalıpları ve phrasal verbs',
          alistirmalar: [
            Secim(
              soru: '"The prices are bound to rise." ne anlatır?',
              secenekler: [
                'Fiyatların yükselmesi neredeyse kesin.',
                'Fiyatlar yükselmek zorunda bırakıldı.',
                'Fiyatlar yükselmeyecek.',
              ],
              dogru: 0,
              aciklama: 'Be bound to, neredeyse kesin olan bir sonucu anlatır.',
            ),
            Bosluk(
              soru: 'She is ___ to win; she has trained for years.',
              secenekler: ['probably', 'possible', 'likely'],
              dogru: 2,
              aciklama: 'Be likely to kalıbı yüksek olasılığı gösterir.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'carry out', sag: 'gerçekleştirmek'),
                (sol: 'come up with', sag: '(fikir) bulmak'),
                (sol: 'put off', sag: 'ertelemek'),
                (sol: 'look into', sag: 'incelemek, araştırmak'),
              ],
              aciklama: 'Bilim ve iş dilinde sık geçen phrasal verb\'ler.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak:
                  'Scientists are likely to come up with a solution soon.',
              secenekler: [
                'Scientists are likely to come up with a solution soon.',
                'Scientists are unlikely to come up with a solution soon.',
                'Scientists are likely to come up with a solution later.',
              ],
              dogru: 0,
              aciklama:
                  'Likely olası, unlikely olası değil demektir; soon yakında, later daha sonra anlamındadır.',
            ),
            Secim(
              soru: 'Hangi cümle en kesin tahmini yapar?',
              secenekler: [
                'He might be late.',
                'He could be late.',
                'He is bound to be late.',
              ],
              dogru: 2,
              aciklama:
                  'Bound to en güçlüdür; might ve could zayıf olasılık bildirir.',
            ),
            Yaz(
              soru:
                  'Eksik sözcüğü yaz: The team came ___ with a brilliant idea.',
              cevaplar: ['up'],
              aciklama: 'Come up with = (fikir) bulmak.',
            ),
            Sirala(
              soru: 'Sıraya diz: Deneyin başarılı olması pek olası değil.',
              kelimeler: [
                'succeed',
                'The',
                'unlikely',
                'is',
                'to',
                'experiment',
              ],
              dogru: ['The', 'experiment', 'is', 'unlikely', 'to', 'succeed'],
              aciklama: 'Kalıp: be unlikely to + yalın fiil.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'They are going to look into the cause of the problem.',
              secenekler: [
                'They are going to look after the cause of the problem.',
                'They are going to look into the cause of the problem.',
                'They are going to look into the causes of the problem.',
              ],
              dogru: 1,
              aciklama:
                  'Look into araştırmak, look after bakmak demektir; cause tekil, causes çoğuldur.',
            ),
            Bosluk(
              soru: 'He has been working all night. He ___ be exhausted.',
              secenekler: ['can\'t', 'mustn\'t', 'must'],
              dogru: 2,
              aciklama: 'Güçlü olumlu çıkarım için must kullanılır.',
            ),
            Secim(
              soru: 'Hangi phrasal verb "ertelemek" anlamına gelir?',
              secenekler: ['put on', 'put off', 'put up'],
              dogru: 1,
              aciklama:
                  'Put off = ertelemek; put on giymek, put up kurmak ya da konaklatmaktır.',
            ),
          ],
        ),
      ],
    ),
  ],
);
