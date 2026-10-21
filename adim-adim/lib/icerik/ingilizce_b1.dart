// İngilizce B1 kursu (CEFR B1): 6 ünite x 2 ders = 12 ders, ders başına 10 alıştırma.
// Sahibi: Yusuf (yusufbesir). İçerik testleri geçmeden değişmez; silme yalnız Yusuf kararıyla.
import '../model/icerik.dart';

/// İngilizce B1: Orta düzey
const Kurs ingilizceB1 = Kurs(
  id: 'ingilizce-3',
  ad: 'İngilizce B1',
  aciklama:
      'A2 sonrası orta düzey İngilizce: iş, seyahat, teknoloji, görüş bildirme, hikâye anlatma ve toplum.',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'ingilizce-3.u1',
      ad: 'İş ve kariyer',
      dersler: [
        Ders(
          id: 'ingilizce-3.u1.d1',
          ad: 'Present perfect ve past simple',
          alistirmalar: [
            Secim(
              soru:
                  'Hangi cümle "Beş yıldır bu şirkette çalışıyorum" anlamına gelir?',
              secenekler: [
                'I have worked here for five years.',
                'I worked here for five years.',
                'I work here since five years.',
              ],
              dogru: 0,
              aciklama:
                  'İş hâlâ sürüyorsa present perfect kullanılır: have worked + for.',
            ),
            Bosluk(
              soru: 'She ___ in London in 2019, but now she lives in Paris.',
              secenekler: ['worked', 'has worked', 'works'],
              dogru: 0,
              aciklama:
                  'Bitmiş ve belirli bir zaman (in 2019) past simple ister: worked.',
            ),
            Bosluk(
              soru: 'The manager ___ just left the office.',
              secenekler: ['has', 'have', 'did'],
              dogru: 0,
              aciklama: 'The manager üçüncü tekil kişidir: has just left.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Ben üç yıldır bu ofiste çalışıyorum.',
              cevaplar: [
                'I have worked in this office for three years.',
                'I\'ve worked in this office for three years.',
                'I have been working in this office for three years.',
                'I\'ve been working in this office for three years.',
                'I have worked at this office for three years.',
                'I\'ve worked at this office for three years.',
                'I have been working at this office for three years.',
                'I\'ve been working at this office for three years.',
              ],
              aciklama:
                  'Süren iş için present perfect: have worked ya da have been working, süre için for.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'manager', sag: 'yönetici'),
                (sol: 'salary', sag: 'maaş'),
                (sol: 'colleague', sag: 'iş arkadaşı'),
                (sol: 'interview', sag: 'iş görüşmesi'),
              ],
              aciklama: 'İş hayatının temel sözcükleri.',
            ),
            Sirala(
              soru: 'Sıraya diz: Ben iki yıldır çalışıyorum.',
              kelimeler: ['years', 'worked', 'I', 'for', 'have', 'two'],
              dogru: ['I', 'have', 'worked', 'for', 'two', 'years'],
              aciklama: 'Yapı: özne + have + üçüncü hâl (worked) + for + süre.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'I have lived here since 2018.',
                'I have lived here for 2018.',
                'I have lived here since ten years.',
              ],
              dogru: 0,
              aciklama:
                  'Since başlangıç noktası (2018) ile, for süre (ten years) ile kullanılır.',
            ),
            Bosluk(
              soru: 'He has had this job ___ last June.',
              secenekler: ['for', 'since', 'ago'],
              dogru: 1,
              aciklama: 'Last June bir başlangıç noktasıdır; since kullanılır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'I have worked here for six years.',
              secenekler: [
                'I have walked here for six years.',
                'I have worked here for six years.',
                'I worked here for six weeks.',
              ],
              dogru: 1,
              aciklama:
                  '"Worked" çalıştı, "walked" yürüdü demektir; "for six years" altı yıldır anlamındadır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'She started her job in March.',
              secenekler: [
                'She started her job in March.',
                'She stopped her job in March.',
                'She started her job in May.',
              ],
              dogru: 0,
              aciklama:
                  'Start başlamak, stop bırakmak demektir. March mart, May mayıstır.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-3.u1.d2',
          ad: 'For, since ve iş görüşmesi',
          alistirmalar: [
            Secim(
              soru:
                  '"How long have you worked here?" sorusuna hangisi uygun cevaptır?',
              secenekler: ['Since 2021.', 'Yesterday.', 'Next year.'],
              dogru: 0,
              aciklama:
                  'How long? süreyi sorar; since ile başlangıç noktası söylenir.',
            ),
            Bosluk(
              soru: 'I have been a teacher ___ ten years.',
              secenekler: ['for', 'since', 'ago'],
              dogru: 0,
              aciklama: 'Ten years bir süredir; for kullanılır.',
            ),
            Bosluk(
              soru: 'They have lived in Izmir ___ they got married.',
              secenekler: ['since', 'for', 'during'],
              dogru: 0,
              aciklama:
                  'Since bir olaydan beri anlamında bağlaç olarak da kullanılır.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Ben 2019\'dan beri burada çalışıyorum.',
              cevaplar: [
                'I have worked here since 2019.',
                'I\'ve worked here since 2019.',
                'I have been working here since 2019.',
                'I\'ve been working here since 2019.',
              ],
              aciklama: 'Başlangıç noktası için since: since 2019.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'resume', sag: 'özgeçmiş'),
                (sol: 'experience', sag: 'deneyim'),
                (sol: 'skill', sag: 'beceri'),
                (sol: 'apply for', sag: 'başvurmak'),
              ],
              aciklama: 'İş başvurusunda sık geçen sözcükler.',
            ),
            Sirala(
              soru: 'Sıraya diz: Biz bu işi iki yıldır yapıyoruz.',
              kelimeler: [
                'years',
                'We',
                'done',
                'this',
                'have',
                'job',
                'for',
                'two',
              ],
              dogru: [
                'We',
                'have',
                'done',
                'this',
                'job',
                'for',
                'two',
                'years',
              ],
              aciklama: 'Do fiilinin üçüncü hâli done olur: have done.',
            ),
            Secim(
              soru: 'Mülakatta "Tell me about yourself." ne ister?',
              secenekler: [
                'Kendinizden bahsetmenizi',
                'Odadan çıkmanızı',
                'Maaşınızı söylemenizi',
              ],
              dogru: 0,
              aciklama:
                  'Tell me about yourself: kendinden bahset. Mülakatın klasik açılış sorusudur.',
            ),
            Bosluk(
              soru: '___ you ever worked abroad? Yes, I have.',
              secenekler: ['Have', 'Did', 'Are'],
              dogru: 0,
              aciklama:
                  'Deneyim sorusu present perfect ile kurulur: Have you ever worked?',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'I have been in this team since January.',
              secenekler: [
                'I have been in this team since January.',
                'I have been in this team since June.',
                'I have been in this team for ten months.',
              ],
              dogru: 0,
              aciklama:
                  'January ocak, June hazirandır. Since başlangıç noktası, for süre gösterir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'We interviewed three candidates yesterday.',
              secenekler: [
                'We interviewed three candidates yesterday.',
                'We interviewed two candidates yesterday.',
                'We interview three candidates every day.',
              ],
              dogru: 0,
              aciklama:
                  '"Interviewed" geçmiş zamandır ve yesterday ile kullanılır. Three üç, two iki demektir.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-3.u2',
      ad: 'Seyahat ve deneyimler',
      dersler: [
        Ders(
          id: 'ingilizce-3.u2.d1',
          ad: 'Present perfect continuous',
          alistirmalar: [
            Secim(
              soru: '"I have been waiting for an hour." cümlesi ne anlatır?',
              secenekler: [
                'Bir saattir bekliyorum.',
                'Bir saat önce bekledim.',
                'Bir saat sonra bekleyeceğim.',
              ],
              dogru: 0,
              aciklama:
                  'Have been + -ing, geçmişte başlayıp şimdiye süren eylemi anlatır.',
            ),
            Bosluk(
              soru: 'He is tired because he ___ all day.',
              secenekler: [
                'has been driving',
                'have been driving',
                'has driving',
              ],
              dogru: 0,
              aciklama: 'He ile has been + -ing kullanılır: has been driving.',
            ),
            Bosluk(
              soru: 'How long ___ you been learning English?',
              secenekler: ['have', 'has', 'did'],
              dogru: 0,
              aciklama:
                  'You ile have kullanılır: How long have you been learning?',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Ben iki saattir yağmurda yürüyorum.',
              cevaplar: [
                'I have been walking in the rain for two hours.',
                'I\'ve been walking in the rain for two hours.',
                'I have walked in the rain for two hours.',
                'I\'ve walked in the rain for two hours.',
              ],
              aciklama:
                  'Süren eylem: have been walking, süre için for two hours.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'luggage', sag: 'bagaj'),
                (sol: 'passport', sag: 'pasaport'),
                (sol: 'journey', sag: 'yolculuk'),
                (sol: 'ticket', sag: 'bilet'),
              ],
              aciklama: 'Seyahatte sık kullanılan sözcükler.',
            ),
            Sirala(
              soru: 'Sıraya diz: Ne zamandır burada bekliyorsun?',
              kelimeler: [
                'long',
                'you',
                'waiting',
                'How',
                'here',
                'been',
                'have',
              ],
              dogru: ['How', 'long', 'have', 'you', 'been', 'waiting', 'here'],
              aciklama: 'Soru kalıbı: How long + have + özne + been + -ing.',
            ),
            Secim(
              soru:
                  'Hangi cümle, yeni biten ama sonucu hâlâ görünen bir eylemi anlatır?',
              secenekler: [
                'Your eyes are red. Have you been crying?',
                'I have a small car.',
                'He will cry tomorrow.',
              ],
              dogru: 0,
              aciklama:
                  'Present perfect continuous, sonucu şimdi görünen eylemler için de kullanılır.',
            ),
            Bosluk(
              soru: 'We have been travelling ___ three weeks.',
              secenekler: ['for', 'since', 'from'],
              dogru: 0,
              aciklama: 'Three weeks bir süredir; for kullanılır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'We have been travelling for two weeks.',
              secenekler: [
                'We have been travelling for two weeks.',
                'We have been travelling for two days.',
                'We were travelling for two weeks.',
              ],
              dogru: 0,
              aciklama:
                  'Weeks haftalar, days günlerdir. Have been travelling hâlâ süren yolculuğu gösterir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'How long have you been waiting for the train?',
              secenekler: [
                'How long did you wait for the train?',
                'How long have you been waiting for the train?',
                'How often do you take the train?',
              ],
              dogru: 1,
              aciklama:
                  'How long süreyi, how often sıklığı sorar. Have been waiting süren beklemeyi anlatır.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-3.u2.d2',
          ad: 'Ever, never, yet, already',
          alistirmalar: [
            Secim(
              soru:
                  '"Have you ever been to Italy?" sorusundaki "ever" ne anlama gelir?',
              secenekler: [
                'Hayatın boyunca herhangi bir zaman',
                'Her gün',
                'Yarın',
              ],
              dogru: 0,
              aciklama: 'Ever, hayat boyunca herhangi bir zamanı sorar.',
            ),
            Bosluk(
              soru: 'I have ___ been to Japan. I want to go one day.',
              secenekler: ['never', 'ever', 'already'],
              dogru: 0,
              aciklama: 'Hiç gitmemiş olmak: have never been.',
            ),
            Bosluk(
              soru: 'I haven\'t finished my report ___.',
              secenekler: ['yet', 'already', 'ago'],
              dogru: 0,
              aciklama: 'Olumsuz cümlede "henüz" anlamı için yet kullanılır.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Ben hiç Paris\'e gitmedim.',
              cevaplar: [
                'I have never been to Paris.',
                'I\'ve never been to Paris.',
                'I have never visited Paris.',
                'I\'ve never visited Paris.',
              ],
              aciklama: 'Deneyim yokluğu: have never been to + yer.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'ever', sag: 'hiç (soruda)'),
                (sol: 'never', sag: 'asla'),
                (sol: 'already', sag: 'çoktan'),
                (sol: 'yet', sag: 'henüz'),
              ],
              aciklama: 'Bu dört zarf present perfect ile sık kullanılır.',
            ),
            Sirala(
              soru: 'Sıraya diz: Yemeğini henüz bitirdin mi?',
              kelimeler: ['finished', 'Have', 'your', 'you', 'yet', 'meal'],
              dogru: ['Have', 'you', 'finished', 'your', 'meal', 'yet'],
              aciklama: 'Sorularda yet cümlenin sonuna gelir.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'She has already left.',
                'She has left already yesterday.',
                'She already has left yesterday.',
              ],
              dogru: 0,
              aciklama:
                  'Already, has ile üçüncü hâl arasına gelir. Yesterday ile present perfect kullanılmaz.',
            ),
            Bosluk(
              soru: 'He has ___ read this book. He read it last week.',
              secenekler: ['already', 'yet', 'ever'],
              dogru: 0,
              aciklama:
                  'Olumlu cümlede "çoktan" anlamı için already kullanılır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'I have never seen the sea.',
              secenekler: [
                'I have never seen the sea.',
                'I have never been to the sea.',
                'I have always seen the sea.',
              ],
              dogru: 0,
              aciklama: 'Never asla, always her zaman demektir. Sea denizdir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'Have you booked the tickets yet?',
              secenekler: [
                'Have you booked the tickets already?',
                'Did you book the tickets today?',
                'Have you booked the tickets yet?',
              ],
              dogru: 2,
              aciklama:
                  'Book ayırtmak demektir. Yet soruda "henüz" anlamı verir; already "çoktan" demektir.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-3.u3',
      ad: 'Teknoloji ve medya',
      dersler: [
        Ders(
          id: 'ingilizce-3.u3.d1',
          ad: 'Edilgen çatı: şimdiki zaman',
          alistirmalar: [
            Secim(
              soru: 'Hangisi edilgen (passive) cümledir?',
              secenekler: [
                'Coffee is grown in Brazil.',
                'People grow coffee in Brazil.',
                'Brazil grows coffee.',
              ],
              dogru: 0,
              aciklama: 'Edilgen yapı: is/are + üçüncü hâl (grown).',
            ),
            Bosluk(
              soru: 'English ___ in many countries.',
              secenekler: ['is spoken', 'speaks', 'is speaking'],
              dogru: 0,
              aciklama: 'Özne işi yapan değil, işten etkilenendir: is spoken.',
            ),
            Bosluk(
              soru: 'These phones ___ in a big factory.',
              secenekler: ['are made', 'is made', 'are making'],
              dogru: 0,
              aciklama: 'Çoğul özne (phones) ile are made kullanılır.',
            ),
            Yaz(
              soru:
                  'İngilizceye çevir: Bu uygulama milyonlarca insan tarafından kullanılıyor.',
              cevaplar: [
                'This app is used by millions of people.',
                'This application is used by millions of people.',
                'This app is being used by millions of people.',
                'This application is being used by millions of people.',
              ],
              aciklama:
                  'Yapan kişi by ile söylenir: is used by millions of people.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'screen', sag: 'ekran'),
                (sol: 'password', sag: 'şifre'),
                (sol: 'download', sag: 'indirmek'),
                (sol: 'update', sag: 'güncelleme'),
              ],
              aciklama: 'Teknolojide sık geçen sözcükler.',
            ),
            Sirala(
              soru: 'Sıraya diz: Bu kod bir uygulama tarafından okunur.',
              kelimeler: ['by', 'read', 'is', 'This', 'code', 'an', 'app'],
              dogru: ['This', 'code', 'is', 'read', 'by', 'an', 'app'],
              aciklama: 'Edilgen: özne + is + üçüncü hâl + by + yapan.',
            ),
            Secim(
              soru:
                  '"They sell tickets online." cümlesinin edilgen hâli hangisidir?',
              secenekler: [
                'Tickets are sold online.',
                'Tickets sell online.',
                'Tickets are selling online.',
              ],
              dogru: 0,
              aciklama: 'Sell fiilinin üçüncü hâli sold olur: are sold.',
            ),
            Bosluk(
              soru: 'Many photos ___ on social media every day.',
              secenekler: ['are shared', 'is shared', 'shares'],
              dogru: 0,
              aciklama: 'Photos çoğuldur; are shared kullanılır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'The room is cleaned every morning.',
              secenekler: [
                'The room is cleaned every evening.',
                'The rooms are cleaned every morning.',
                'The room is cleaned every morning.',
              ],
              dogru: 2,
              aciklama:
                  'Morning sabah, evening akşamdır. Room tekil olduğu için is cleaned kullanılır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'My password is never shared with anyone.',
              secenekler: [
                'My password is never shown to anyone.',
                'My password is never shared with anyone.',
                'My passwords are never shared with anyone.',
              ],
              dogru: 1,
              aciklama:
                  'Share paylaşmak, show göstermek demektir. Password tekil olduğu için is kullanılır.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-3.u3.d2',
          ad: 'Edilgen çatı: geçmiş zaman',
          alistirmalar: [
            Secim(
              soru: '"The telephone was invented by Bell." cümlesi ne anlatır?',
              secenekler: [
                'Telefon Bell tarafından icat edildi.',
                'Bell telefonu icat edecek.',
                'Telefon Bell\'i icat etti.',
              ],
              dogru: 0,
              aciklama: 'Was + üçüncü hâl, geçmişteki edilgen cümleyi kurar.',
            ),
            Bosluk(
              soru: 'This photo ___ taken last summer.',
              secenekler: ['was', 'were', 'is'],
              dogru: 0,
              aciklama: 'Tekil özne ve geçmiş zaman: was taken.',
            ),
            Bosluk(
              soru: 'The messages ___ sent yesterday.',
              secenekler: ['were', 'was', 'are'],
              dogru: 0,
              aciklama: 'Çoğul özne ve geçmiş zaman: were sent.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Bu film 2010\'da çekildi.',
              cevaplar: [
                'This film was made in 2010.',
                'This film was shot in 2010.',
                'This film was filmed in 2010.',
                'This movie was made in 2010.',
                'This movie was shot in 2010.',
                'This movie was filmed in 2010.',
              ],
              aciklama: 'Geçmiş edilgen: was made ya da was shot.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'write', sag: 'written'),
                (sol: 'build', sag: 'built'),
                (sol: 'steal', sag: 'stolen'),
                (sol: 'send', sag: 'sent'),
              ],
              aciklama:
                  'Edilgen yapıda fiilin üçüncü hâli (past participle) gerekir.',
            ),
            Sirala(
              soru: 'Sıraya diz: Bu köprü Romalılar tarafından inşa edildi.',
              kelimeler: [
                'bridge',
                'was',
                'This',
                'Romans',
                'built',
                'by',
                'the',
              ],
              dogru: ['This', 'bridge', 'was', 'built', 'by', 'the', 'Romans'],
              aciklama: 'Yapı: özne + was + built + by + yapan.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'The email was sent by my boss.',
                'The email sended by my boss.',
                'The email was send by my boss.',
              ],
              dogru: 0,
              aciklama: 'Send düzensiz fiildir; üçüncü hâli sent olur.',
            ),
            Bosluk(
              soru: 'My wallet ___ stolen on the bus.',
              secenekler: ['was', 'were', 'has'],
              dogru: 0,
              aciklama: 'Wallet tekildir ve olay geçmiştedir: was stolen.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'The app was created by two students.',
              secenekler: [
                'The app was created by two teachers.',
                'The apps were created by two students.',
                'The app was created by two students.',
              ],
              dogru: 2,
              aciklama:
                  'Students öğrenciler, teachers öğretmenlerdir. Tek app için was created kullanılır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'The door was locked at midnight.',
              secenekler: [
                'The door was opened at midnight.',
                'The door was locked at midnight.',
                'The doors were locked at midnight.',
              ],
              dogru: 1,
              aciklama:
                  'Lock kilitlemek, open açmaktır. Midnight gece yarısı demektir.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-3.u4',
      ad: 'Görüş ve tartışma',
      dersler: [
        Ders(
          id: 'ingilizce-3.u4.d1',
          ad: 'Birinci ve ikinci koşul',
          alistirmalar: [
            Secim(
              soru:
                  'Hangi cümle gerçekçi (birinci koşul) bir olasılık anlatır?',
              secenekler: [
                'If it rains, I will stay at home.',
                'If it rained, I would stay at home.',
                'If it rains, I stayed at home.',
              ],
              dogru: 0,
              aciklama:
                  'Birinci koşul: If + present simple, will + fiil. Gerçekleşmesi olası durumlar içindir.',
            ),
            Bosluk(
              soru: 'If I ___ enough money, I will buy a new laptop.',
              secenekler: ['have', 'had', 'would have'],
              dogru: 0,
              aciklama: 'Birinci koşulda if bölümü present simple olur: have.',
            ),
            Bosluk(
              soru: 'If I won the lottery, I ___ travel the world.',
              secenekler: ['would', 'will', 'am going to'],
              dogru: 0,
              aciklama:
                  'İkinci koşul: If + past simple, would + fiil. Hayalî durumlar içindir.',
            ),
            Yaz(
              soru:
                  'İngilizceye çevir: Eğer yarın yağmur yağarsa evde kalacağım.',
              cevaplar: [
                'If it rains tomorrow, I will stay at home.',
                'If it rains tomorrow, I\'ll stay at home.',
                'If it rains tomorrow, I will stay home.',
                'If it rains tomorrow, I\'ll stay home.',
              ],
              aciklama:
                  'If bölümünde will kullanılmaz: If it rains, I will stay.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'lottery', sag: 'piyango'),
                (sol: 'opportunity', sag: 'fırsat'),
                (sol: 'decide', sag: 'karar vermek'),
                (sol: 'succeed', sag: 'başarılı olmak'),
              ],
              aciklama: 'Koşul cümlelerinde sık geçen sözcükler.',
            ),
            Sirala(
              soru: 'Sıraya diz: Ne yapardın?',
              kelimeler: ['do', 'What', 'would', 'you'],
              dogru: ['What', 'would', 'you', 'do'],
              aciklama: 'Soru kalıbı: What + would + özne + fiil.',
            ),
            Secim(
              soru: '"If I were you, I would apply." cümlesi ne yapar?',
              secenekler: ['Tavsiye verir', 'Geçmişi anlatır', 'Emir verir'],
              dogru: 0,
              aciklama: 'If I were you kalıbı tavsiye vermek için kullanılır.',
            ),
            Bosluk(
              soru: 'If she ___ harder, she would pass the test.',
              secenekler: ['studied', 'studies', 'will study'],
              dogru: 0,
              aciklama: 'Would içeren ana cümlenin if bölümü past simple olur.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'If it rains, we will cancel the picnic.',
              secenekler: [
                'If it rained, we would cancel the picnic.',
                'If it rains, we will cancel the party.',
                'If it rains, we will cancel the picnic.',
              ],
              dogru: 2,
              aciklama:
                  'Picnic piknik, party partidir. If it rains, we will birinci koşuldur.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'What would you do if you lost your job?',
              secenekler: [
                'What will you do if you lose your job?',
                'What would you do if you lost your job?',
                'What would you do if you found a job?',
              ],
              dogru: 1,
              aciklama:
                  'Lose kaybetmek, find bulmaktır. Would ve lost birlikte ikinci koşulu kurar.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-3.u4.d2',
          ad: 'Görüş bildirme ve bağlaçlar',
          alistirmalar: [
            Secim(
              soru: 'Hangisi görüş bildirmek için kullanılır?',
              secenekler: ['In my opinion', 'As soon as', 'Right now'],
              dogru: 0,
              aciklama: 'In my opinion: bence, bana göre.',
            ),
            Bosluk(
              soru: '___ I like the idea, it is too expensive.',
              secenekler: ['Although', 'Because', 'So'],
              dogru: 0,
              aciklama: 'Although: -e rağmen. Karşıt iki durumu bağlar.',
            ),
            Bosluk(
              soru: 'I stayed at home ___ it was raining.',
              secenekler: ['because', 'but', 'so'],
              dogru: 0,
              aciklama:
                  'Because neden bildirir: yağmur yağdığı için evde kaldım.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Bence bu iyi bir fikir.',
              cevaplar: [
                'I think this is a good idea.',
                'I think that this is a good idea.',
                'I think it is a good idea.',
                'I think it\'s a good idea.',
                'I think that is a good idea.',
                'I think that\'s a good idea.',
              ],
              aciklama: 'Görüş bildirmek için I think + cümle kullanılır.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'however', sag: 'ancak'),
                (sol: 'therefore', sag: 'bu yüzden'),
                (sol: 'although', sag: '-e rağmen'),
                (sol: 'besides', sag: 'ayrıca'),
              ],
              aciklama: 'Bağlaçlar fikirleri birbirine bağlar.',
            ),
            Sirala(
              soru: 'Sıraya diz: Buna katılmıyorum.',
              kelimeler: ['not', 'that', 'I', 'agree', 'do', 'with'],
              dogru: ['I', 'do', 'not', 'agree', 'with', 'that'],
              aciklama: 'Olumsuz yapı: I do not agree with + konu.',
            ),
            Secim(
              soru: '"On the other hand" ne işe yarar?',
              secenekler: [
                'Karşıt bir görüş eklemeye',
                'Sonucu söylemeye',
                'Zamanı söylemeye',
              ],
              dogru: 0,
              aciklama:
                  'On the other hand: diğer yandan. Karşıt görüş getirir.',
            ),
            Bosluk(
              soru: 'It is cheap. ___, the quality is poor.',
              secenekler: ['However', 'Because', 'Although'],
              dogru: 0,
              aciklama: 'However yeni cümlenin başında karşıtlık bildirir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'In my opinion, remote work is better.',
              secenekler: [
                'In my opinion, remote work is bitter.',
                'In my opinion, remote work is better.',
                'In my mind, remote work is better.',
              ],
              dogru: 1,
              aciklama:
                  'Better daha iyi, bitter acı demektir. Remote work uzaktan çalışmadır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'I agree with you, but it is too risky.',
              secenekler: [
                'I disagree with you, because it is too risky.',
                'I agree with you, so it is too risky.',
                'I agree with you, but it is too risky.',
              ],
              dogru: 2,
              aciklama:
                  'Agree katılmak, disagree katılmamaktır. But karşıtlık bildirir.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-3.u5',
      ad: 'Hikâye anlatma',
      dersler: [
        Ders(
          id: 'ingilizce-3.u5.d1',
          ad: 'Past continuous ve past simple',
          alistirmalar: [
            Secim(
              soru:
                  'Hangi cümle "Ben yemek yerken telefon çaldı" anlamına gelir?',
              secenekler: [
                'The phone rang while I was eating.',
                'The phone was ringing while I ate it.',
                'I was eating when the phone rings.',
              ],
              dogru: 0,
              aciklama:
                  'Uzun eylem past continuous, araya giren kısa eylem past simple ile anlatılır.',
            ),
            Bosluk(
              soru: 'They ___ football in the park when it started to rain.',
              secenekler: ['were playing', 'was playing', 'is playing'],
              dogru: 0,
              aciklama: 'They ile were + -ing kullanılır: were playing.',
            ),
            Bosluk(
              soru: 'She ___ her keys while she was running for the bus.',
              secenekler: ['lost', 'was losing', 'has lost'],
              dogru: 0,
              aciklama: 'Araya giren kısa olay past simple olur: lost.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Ben uyurken telefon çaldı.',
              cevaplar: [
                'The phone rang while I was sleeping.',
                'The phone rang when I was sleeping.',
                'The phone rang while I was asleep.',
                'My phone rang while I was sleeping.',
                'My phone rang when I was sleeping.',
                'My phone rang while I was asleep.',
                'While I was sleeping, the phone rang.',
                'When I was sleeping, the phone rang.',
                'While I was sleeping, my phone rang.',
                'When I was sleeping, my phone rang.',
              ],
              aciklama: 'Uzun eylem: was sleeping; kısa eylem: rang.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'while', sag: '-erken'),
                (sol: 'when', sag: '-diğinde'),
                (sol: 'suddenly', sag: 'birden'),
                (sol: 'during', sag: 'sırasında'),
              ],
              aciklama: 'Hikâye anlatırken zaman bağlaçları önemlidir.',
            ),
            Sirala(
              soru: 'Sıraya diz: Sen ne yapıyordun?',
              kelimeler: ['doing', 'What', 'you', 'were'],
              dogru: ['What', 'were', 'you', 'doing'],
              aciklama: 'Soru kalıbı: What + were + özne + -ing.',
            ),
            Secim(
              soru: 'Hangisi doğrudur?',
              secenekler: [
                'I was cooking when she arrived.',
                'I cooking when she arrived.',
                'I was cook when she arrived.',
              ],
              dogru: 0,
              aciklama: 'Past continuous: was/were + fiil-ing.',
            ),
            Bosluk(
              soru: 'It was raining, ___ we stayed inside.',
              secenekler: ['so', 'or', 'because'],
              dogru: 0,
              aciklama:
                  'So sonuç bildirir: yağmur yağıyordu, bu yüzden içeride kaldık.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'I was reading when you called.',
              secenekler: [
                'I was riding when you called.',
                'I read when you called.',
                'I was reading when you called.',
              ],
              dogru: 2,
              aciklama:
                  'Reading okumak, riding binmektir. Was reading süren bir eylemi gösterir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'They were sleeping when the storm started.',
              secenekler: [
                'They were sleeping when the storm stopped.',
                'They were sleeping when the storm started.',
                'They slept when the storm started.',
              ],
              dogru: 1,
              aciklama: 'Start başlamak, stop durmaktır. Storm fırtınadır.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-3.u5.d2',
          ad: 'Anlatı zamanları ve dolaylı anlatım',
          alistirmalar: [
            Secim(
              soru:
                  '"By the time we arrived, the film had started." cümlesinde film ne zaman başlamıştı?',
              secenekler: [
                'Biz varmadan önce',
                'Biz vardıktan sonra',
                'Biz varırken',
              ],
              dogru: 0,
              aciklama:
                  'Past perfect (had started), geçmişteki başka bir olaydan önce olanı gösterir.',
            ),
            Bosluk(
              soru: 'When I got to the station, the train ___ already left.',
              secenekler: ['had', 'has', 'was'],
              dogru: 0,
              aciklama: 'Daha önce olan eylem past perfect ister: had left.',
            ),
            Bosluk(
              soru: 'Ali said that he ___ busy at that moment.',
              secenekler: ['was', 'is', 'will be'],
              dogru: 0,
              aciklama:
                  'Dolaylı anlatımda zaman bir adım geriye gider: is yerine was.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: O bana yorgun olduğunu söyledi.',
              cevaplar: [
                'He told me that he was tired.',
                'He told me he was tired.',
                'She told me that she was tired.',
                'She told me she was tired.',
                'He said that he was tired.',
                'She said that she was tired.',
              ],
              aciklama: 'Dolaylı anlatım: told me (that) + özne + was.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'now', sag: 'then'),
                (sol: 'today', sag: 'that day'),
                (sol: 'tomorrow', sag: 'the next day'),
                (sol: 'yesterday', sag: 'the day before'),
              ],
              aciklama: 'Dolaylı anlatımda zaman ifadeleri değişir.',
            ),
            Sirala(
              soru: 'Sıraya diz: Bana geç kaldığımı söyledi.',
              kelimeler: ['late', 'told', 'She', 'was', 'me', 'I'],
              dogru: ['She', 'told', 'me', 'I', 'was', 'late'],
              aciklama: 'Yapı: told + kişi + cümle. Zaman geriye gider: was.',
            ),
            Secim(
              soru:
                  'Hangisi geçmişteki bir olayın diğerinden önce olduğunu gösterir?',
              secenekler: [
                'I had finished before he came.',
                'I finish before he came.',
                'I was finish before he came.',
              ],
              dogru: 0,
              aciklama: 'Önce biten eylem için past perfect: had finished.',
            ),
            Bosluk(
              soru: 'After he ___ his homework, he went out.',
              secenekler: ['had finished', 'has finished', 'finishing'],
              dogru: 0,
              aciklama:
                  'Went out geçmiştir; önce biten eylem had finished olur.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'He said that he had missed the bus.',
              secenekler: [
                'He said that he would miss the bus.',
                'He says that he has missed the bus.',
                'He said that he had missed the bus.',
              ],
              dogru: 2,
              aciklama:
                  'Miss otobüsü kaçırmaktır. Said that + had missed, geçmişteki bir olayı aktarır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'We had already eaten when she arrived.',
              secenekler: [
                'We had already left when she arrived.',
                'We had already eaten when she arrived.',
                'We were eating when she arrived.',
              ],
              dogru: 1,
              aciklama:
                  'Eat yemek, leave ayrılmaktır. Had already eaten, o gelmeden önce yemeğin bittiğini gösterir.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-3.u6',
      ad: 'Çevre ve toplum',
      dersler: [
        Ders(
          id: 'ingilizce-3.u6.d1',
          ad: 'Çıkarım: must, might, can\'t',
          alistirmalar: [
            Secim(
              soru: '"He must be tired." cümlesi ne anlatır?',
              secenekler: [
                'Büyük olasılıkla yorgun.',
                'Belki de yorgun değil.',
                'Yorgun olmamalı.',
              ],
              dogru: 0,
              aciklama:
                  'Must be, güçlü bir çıkarımı gösterir: büyük olasılıkla.',
            ),
            Bosluk(
              soru:
                  'He has worked for 14 hours without a break. He ___ be very tired.',
              secenekler: ['must', 'can\'t', 'might not'],
              dogru: 0,
              aciklama: 'Güçlü kanıt olduğunda must be kullanılır.',
            ),
            Bosluk(
              soru: 'That ___ be Ali. He is on holiday in Spain this week.',
              secenekler: ['can\'t', 'must', 'might'],
              dogru: 0,
              aciklama:
                  'Olması imkânsız olan durumlar için can\'t be kullanılır.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: O şimdi evde olamaz.',
              cevaplar: [
                'He can\'t be at home now.',
                'She can\'t be at home now.',
                'He cannot be at home now.',
                'She cannot be at home now.',
                'He can\'t be home now.',
                'She can\'t be home now.',
              ],
              aciklama: 'İmkânsız çıkarım: can\'t be + yer.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'must be', sag: 'büyük olasılıkla öyle'),
                (sol: 'might be', sag: 'belki öyle'),
                (sol: 'can\'t be', sag: 'öyle olamaz'),
              ],
              aciklama: 'Üç kip, çıkarımın gücünü gösterir.',
            ),
            Sirala(
              soru: 'Sıraya diz: O çok yorgun olmalı.',
              kelimeler: ['must', 'very', 'He', 'tired', 'be'],
              dogru: ['He', 'must', 'be', 'very', 'tired'],
              aciklama: 'Yapı: özne + must + be + sıfat.',
            ),
            Secim(
              soru: 'Hangi cümle olasılığın en zayıf olduğunu gösterir?',
              secenekler: [
                'It might rain.',
                'It must be raining.',
                'It is raining.',
              ],
              dogru: 0,
              aciklama: 'Might, zayıf bir olasılığı anlatır: belki yağar.',
            ),
            Bosluk(
              soru: 'I am not sure, but she ___ be in the library.',
              secenekler: ['might', 'must', 'can\'t'],
              dogru: 0,
              aciklama: 'Emin değilsen might kullanılır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'He must be at work now.',
              secenekler: [
                'He can\'t be at work now.',
                'He might be at work now.',
                'He must be at work now.',
              ],
              dogru: 2,
              aciklama:
                  'Must büyük olasılığı, can\'t imkânsızlığı, might ise belki anlamını verir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'That can\'t be the right address.',
              secenekler: [
                'That must be the right address.',
                'That can\'t be the right address.',
                'That might be the wrong address.',
              ],
              dogru: 1,
              aciklama:
                  'Right doğru, wrong yanlış demektir. Can\'t be, "olamaz" anlamındadır.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-3.u6.d2',
          ad: 'Niceleyiciler',
          alistirmalar: [
            Secim(
              soru: 'Sayılamayan isimlerle hangisi kullanılır?',
              secenekler: ['much', 'many', 'few'],
              dogru: 0,
              aciklama:
                  'Much sayılamayanlarla (water, time), many ve few sayılabilirlerle kullanılır.',
            ),
            Bosluk(
              soru: 'There isn\'t ___ water in the bottle.',
              secenekler: ['much', 'many', 'few'],
              dogru: 0,
              aciklama: 'Water sayılamaz; olumsuzda much kullanılır.',
            ),
            Bosluk(
              soru: 'I have only ___ friends in this city, so I feel lonely.',
              secenekler: ['a few', 'a little', 'much'],
              dogru: 0,
              aciklama: 'Friends sayılabilir; a few birkaç demektir.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Çok fazla trafik var.',
              cevaplar: [
                'There is too much traffic.',
                'There\'s too much traffic.',
              ],
              aciklama: 'Fazlalık için too much; traffic sayılamaz.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'enough', sag: 'yeterli'),
                (sol: 'too many', sag: 'fazlasıyla çok (sayılabilir)'),
                (sol: 'a little', sag: 'biraz (sayılamayan)'),
                (sol: 'a few', sag: 'birkaç (sayılabilir)'),
              ],
              aciklama:
                  'Niceleyici seçimi ismin sayılabilir olup olmamasına bağlıdır.',
            ),
            Sirala(
              soru: 'Sıraya diz: Yeterince paramız yok.',
              kelimeler: ['not', 'enough', 'We', 'do', 'have', 'money'],
              dogru: ['We', 'do', 'not', 'have', 'enough', 'money'],
              aciklama: 'Enough isimden önce gelir: enough money.',
            ),
            Secim(
              soru: 'Hangisi doğrudur?',
              secenekler: [
                'There are too many cars.',
                'There is too many cars.',
                'There are too much cars.',
              ],
              dogru: 0,
              aciklama: 'Cars sayılabilir ve çoğuldur: are too many.',
            ),
            Bosluk(
              soru: 'Could I have ___ sugar in my tea, please?',
              secenekler: ['a little', 'a few', 'many'],
              dogru: 0,
              aciklama: 'Sugar sayılamaz; a little biraz demektir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'There are too many people here.',
              secenekler: [
                'There is too much noise here.',
                'There are too few people here.',
                'There are too many people here.',
              ],
              dogru: 2,
              aciklama:
                  'Too many çok fazla, too few çok az demektir. Noise sayılamaz bir isimdir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'We don\'t have enough time to finish.',
              secenekler: [
                'We don\'t have enough time to relax.',
                'We don\'t have enough time to finish.',
                'We have too much time to finish.',
              ],
              dogru: 1,
              aciklama:
                  'Finish bitirmek, relax dinlenmektir. Enough time yeterli zaman demektir.',
            ),
          ],
        ),
      ],
    ),
  ],
);
