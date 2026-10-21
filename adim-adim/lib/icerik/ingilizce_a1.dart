import '../model/icerik.dart';

/// İngilizce A1: Başlangıç
const Kurs ingilizceA1 = Kurs(
  id: 'ingilizce-1',
  ad: 'İngilizce A1: Başlangıç',
  aciklama:
      'Türkçe konuşanlar için sıfırdan İngilizce: selamlaşma, sayılar, aile, yemek ve günlük hayat.',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'ingilizce-1.u1',
      ad: 'Selamlaşma ve tanışma',
      dersler: [
        Ders(
          id: 'ingilizce-1.u1.d1',
          ad: 'Merhaba demek',
          alistirmalar: [
            Secim(
              soru: '"Hello" ne demektir?',
              secenekler: ['Merhaba', 'Güle güle', 'Teşekkürler'],
              dogru: 0,
              aciklama: 'Hello, en yaygın selamlama sözüdür: Merhaba.',
            ),
            Secim(
              soru: '"Good morning" hangi zamanda söylenir?',
              secenekler: ['Sabah', 'Akşam', 'Gece yarısı'],
              dogru: 0,
              aciklama: 'Morning sabah demektir; Good morning sabah selamıdır.',
            ),
            Bosluk(
              soru: 'My name ___ Ayşe.',
              secenekler: ['is', 'am', 'are'],
              dogru: 0,
              aciklama: 'Name (ad) üçüncü tekil bir isimdir; yanına is gelir.',
            ),
            Bosluk(
              soru: 'I ___ from Turkey.',
              secenekler: ['am', 'is', 'are'],
              dogru: 0,
              aciklama: 'I öznesiyle her zaman am kullanılır.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Benim adım Can.',
              cevaplar: ['My name is Can.', 'My name is Can'],
              aciklama: 'Kalıp: My name is + isim.',
            ),
            Sirala(
              soru: 'Sıraya diz: Tanıştığımıza memnun oldum.',
              kelimeler: ['to', 'Nice', 'meet', 'you'],
              dogru: ['Nice', 'to', 'meet', 'you'],
              aciklama: 'Kalıp sıra: Nice to meet you.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'Hello', sag: 'Merhaba'),
                (sol: 'Goodbye', sag: 'Hoşça kal'),
                (sol: 'Thank you', sag: 'Teşekkürler'),
                (sol: 'Please', sag: 'Lütfen'),
              ],
              aciklama: 'Bu dört sözcük günlük konuşmanın temelidir.',
            ),
            Secim(
              soru: '"How are you?" sorusuna hangisi uygun cevaptır?',
              secenekler: [
                'I\'m fine, thanks.',
                'My name is Ali.',
                'Good night.',
              ],
              dogru: 0,
              aciklama:
                  'How are you? hal hatır sorar; I\'m fine, thanks. (İyiyim, sağ ol.) doğal cevaptır.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Teşekkürler.',
              cevaplar: ['Thank you', 'Thank you.', 'Thanks', 'Thanks.'],
              aciklama: 'Thank you ya da kısaca Thanks denir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'Hello, my name is Ali.',
              secenekler: [
                'Hello, my game is Ali.',
                'Hello, my name is Ali.',
                'Hello, my name is Emily.',
              ],
              dogru: 1,
              aciklama:
                  "'name' 'neym' diye okunur ve 'ad' demektir; 'game' (oyun) ile karıştırma, 'my name is' kendini tanıtma kalıbıdır.",
            ),
            Soyle(
              soru: 'Cümleyi yüksek sesle söyle.',
              metin: 'Good morning, nice to meet you.',
              ceviri: 'Günaydın, tanıştığımıza memnun oldum.',
              aciklama: 'Yavaş ve net söyle; kelimelerin sonlarını yutma.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-1.u1.d2',
          ad: 'Kendini tanıtmak',
          dilbilgisiNotu:
              'Be fiili özneye göre değişir: I am, you are, he/she/it is, '
              'we are, they are. Kısaltma: I\'m, you\'re, she\'s.',
          alistirmalar: [
            Secim(
              soru: '"Where are you from?" ne demektir?',
              secenekler: ['Nerelisin?', 'Nasılsın?', 'Adın ne?'],
              dogru: 0,
              aciklama: 'Where nerede/nereden, from -den/-dan demektir.',
            ),
            Isaretle(
              soru: 'Cümledeki be fiilini işaretle.',
              cumle: 'She is a teacher.',
              dogru: [1],
              aciklama: 'She, he, it ile is kullanılır.',
            ),
            Bosluk(
              soru: 'We ___ students.',
              secenekler: ['are', 'is', 'am'],
              dogru: 0,
              aciklama: 'We, you, they ile are kullanılır.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Ben öğrenciyim.',
              cevaplar: [
                'I am a student.',
                'I am a student',
                'I\'m a student.',
                'I\'m a student',
              ],
              aciklama: 'Tekil meslek/rol adlarından önce a gelir: a student.',
            ),
            Sirala(
              soru: 'Sıraya diz: Nerelisin?',
              kelimeler: ['from', 'you', 'Where', 'are'],
              dogru: ['Where', 'are', 'you', 'from'],
              aciklama: 'Soru sözcüğü başa gelir: Where are you from?',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'I', sag: 'ben'),
                (sol: 'you', sag: 'sen / siz'),
                (sol: 'he', sag: 'o (erkek)'),
                (sol: 'she', sag: 'o (kadın)'),
                (sol: 'we', sag: 'biz'),
              ],
              aciklama:
                  'Bunlar özne zamirleridir; be fiilinin biçimini belirlerler.',
            ),
            Tablo(
              soru: 'Be fiili çekim tablosunu tamamla.',
              baslik: ['Özne', 'Be fiili'],
              satirlar: [
                ['I', 'am'],
                ['you', 'are'],
                ['she', 'is'],
                ['we', 'are'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: ['am', 'is', 'are'],
              aciklama: 'I ile am, she/he/it ile is kullanılır.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Türkiye\'denim.',
              cevaplar: [
                'I am from Turkey.',
                'I am from Turkey',
                'I\'m from Turkey.',
                'I\'m from Turkey',
              ],
              aciklama: 'Kalıp: I am from + yer.',
            ),
            Bosluk(
              soru: 'Nice to ___ you.',
              secenekler: ['meet', 'eat', 'go'],
              dogru: 0,
              aciklama: 'Nice to meet you: tanıştığımıza memnun oldum.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'She is from Spain.',
              secenekler: [
                'He is from Spain.',
                'She is from Sweden.',
                'She is from Spain.',
              ],
              dogru: 2,
              aciklama:
                  "'Spain' 'speyn' gibi okunur; 'from' sözcüğü 'nereden' anlamına gelir ve 'she is from' kalıbı kökeni söyler.",
            ),
            Soyle(
              soru: 'Cümleyi yüksek sesle söyle.',
              metin: 'I am from Turkey.',
              ceviri: "Türkiye'denim.",
              aciklama: 'Yavaş ve net söyle; kelimelerin sonlarını yutma.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-1.u2',
      ad: 'Sayılar ve renkler',
      dersler: [
        Ders(
          id: 'ingilizce-1.u2.d1',
          ad: 'Birden ona kadar sayılar',
          alistirmalar: [
            Secim(
              soru: '"Seven" hangi sayıdır?',
              secenekler: ['7', '6', '9'],
              dogru: 0,
              aciklama: 'Seven yedi demektir. Six altı, nine dokuzdur.',
            ),
            Secim(
              soru: '"Eight" hangi sayıdır?',
              secenekler: ['3', '8', '10'],
              dogru: 1,
              aciklama: 'Eight sekiz demektir.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'one', sag: 'bir'),
                (sol: 'two', sag: 'iki'),
                (sol: 'three', sag: 'üç'),
                (sol: 'four', sag: 'dört'),
                (sol: 'five', sag: 'beş'),
              ],
              aciklama: 'Bir ile beş arasındaki sayıları tekrar et.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: on (10).',
              cevaplar: ['ten', 'Ten'],
              aciklama: '10 İngilizcede ten diye yazılır.',
            ),
            Bosluk(
              soru: 'I have ___ cats. (3 tane)',
              secenekler: ['two', 'three', 'five'],
              dogru: 1,
              aciklama: 'Three üç demektir.',
            ),
            Sirala(
              soru: 'Sıraya diz: Beş elmam var.',
              kelimeler: ['apples', 'five', 'have', 'I'],
              dogru: ['I', 'have', 'five', 'apples'],
              aciklama: 'Sayı, ismin önüne gelir: five apples.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: altı (6).',
              cevaplar: ['six', 'Six'],
              aciklama: '6 İngilizcede six diye yazılır.',
            ),
            Secim(
              soru: 'Hangisi 9 demektir?',
              secenekler: ['nine', 'five', 'nice'],
              dogru: 0,
              aciklama:
                  'Nine dokuz demektir; nice ise güzel/hoş anlamına gelir.',
            ),
            Bosluk(
              soru: 'One, two, ___, four.',
              secenekler: ['three', 'five', 'six'],
              dogru: 0,
              aciklama: 'Sıra: one, two, three, four.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'I have seven cats.',
              secenekler: [
                'I have seven cats.',
                'I have eleven cats.',
                'I have six cats.',
              ],
              dogru: 0,
              aciklama:
                  "'seven' 'sevın' gibi okunur; 'I have' 'sahibim' demektir ve 'cats' sonundaki s sesiyle çoğul olur.",
            ),
            Soyle(
              soru: 'Cümleyi yüksek sesle söyle.',
              metin: 'I have six cats.',
              ceviri: 'Altı kedim var.',
              aciklama: 'Yavaş ve net söyle; kelimelerin sonlarını yutma.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-1.u2.d2',
          ad: 'Temel renkler',
          alistirmalar: [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'red', sag: 'kırmızı'),
                (sol: 'blue', sag: 'mavi'),
                (sol: 'green', sag: 'yeşil'),
                (sol: 'yellow', sag: 'sarı'),
              ],
              aciklama: 'Dört temel rengi tekrar et.',
            ),
            Secim(
              soru: 'Gökyüzü genellikle hangi renktir?',
              secenekler: ['blue', 'green', 'black'],
              dogru: 0,
              aciklama: 'Blue mavi demektir.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: siyah.',
              cevaplar: ['black', 'Black'],
              aciklama: 'Siyah İngilizcede black olur.',
            ),
            Bosluk(
              soru: 'The banana is ___.',
              secenekler: ['yellow', 'red', 'blue'],
              dogru: 0,
              aciklama: 'Muz sarıdır: yellow.',
            ),
            Sirala(
              soru: 'Sıraya diz: Araba kırmızı.',
              kelimeler: ['red', 'is', 'car', 'The'],
              dogru: ['The', 'car', 'is', 'red'],
              aciklama: 'Sıfat (red), be fiilinden sonra gelir.',
            ),
            Secim(
              soru: '"White" hangi renktir?',
              secenekler: ['beyaz', 'siyah', 'gri'],
              dogru: 0,
              aciklama: 'White beyaz demektir.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Kar beyazdır.',
              cevaplar: [
                'The snow is white.',
                'The snow is white',
                'Snow is white.',
                'Snow is white',
              ],
              aciklama: 'Beyaz: white.',
            ),
            Bosluk(
              soru: 'Grass is ___.',
              secenekler: ['green', 'pink', 'black'],
              dogru: 0,
              aciklama: 'Çimen yeşildir: green.',
            ),
            Secim(
              soru: '"Orange" renk olarak ne demektir?',
              secenekler: ['turuncu', 'pembe', 'mor'],
              dogru: 0,
              aciklama: 'Orange hem portakal hem turuncu demektir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'The car is blue.',
              secenekler: [
                'The cat is blue.',
                'The car is blue.',
                'The car is black.',
              ],
              dogru: 1,
              aciklama:
                  "'blue' 'blu:' diye okunur, 'car' ise 'ka:r' gibi; cümle arabanın mavi olduğunu söyler.",
            ),
            Soyle(
              soru: 'Cümleyi yüksek sesle söyle.',
              metin: 'My bag is black.',
              ceviri: 'Çantam siyah.',
              aciklama: 'Yavaş ve net söyle; kelimelerin sonlarını yutma.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-1.u3',
      ad: 'Aile ve ev',
      dersler: [
        Ders(
          id: 'ingilizce-1.u3.d1',
          ad: 'Aile üyeleri',
          alistirmalar: [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'mother', sag: 'anne'),
                (sol: 'father', sag: 'baba'),
                (sol: 'sister', sag: 'kız kardeş'),
                (sol: 'brother', sag: 'erkek kardeş'),
                (sol: 'grandmother', sag: 'büyükanne'),
              ],
              aciklama:
                  'Aile sözcükleri: mother, father, sister, brother, grandmother.',
            ),
            Secim(
              soru: '"My father" ne demektir?',
              secenekler: ['babam', 'annem', 'kardeşim'],
              dogru: 0,
              aciklama: 'My benim, father baba demektir.',
            ),
            Bosluk(
              soru: 'This is my ___. (anne)',
              secenekler: ['mother', 'father', 'brother'],
              dogru: 0,
              aciklama: 'Anne: mother.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: kız kardeşim.',
              cevaplar: ['my sister', 'My sister'],
              aciklama: 'Sahiplik için ismin önüne my gelir.',
            ),
            Sirala(
              soru: 'Sıraya diz: Bir erkek kardeşim var.',
              kelimeler: ['brother', 'a', 'have', 'I'],
              dogru: ['I', 'have', 'a', 'brother'],
              aciklama: 'Tek bir kişiden önce a kullanılır.',
            ),
            Secim(
              soru: 'Hangisi kadın bir akrabadır?',
              secenekler: ['aunt', 'uncle', 'grandfather'],
              dogru: 0,
              aciklama: 'Aunt hala/teyze, uncle amca/dayı demektir.',
            ),
            Bosluk(
              soru: 'He is my ___. (amca ya da dayı)',
              secenekler: ['uncle', 'aunt', 'sister'],
              dogru: 0,
              aciklama: 'Uncle erkek akrabadır; aunt kadındır.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Ailem büyük.',
              cevaplar: [
                'My family is big.',
                'My family is big',
                'My family is large.',
                'My family is large',
              ],
              aciklama: 'Family tekil kabul edilir; yanında is gelir.',
            ),
            Bosluk(
              soru: 'She ___ my mother.',
              secenekler: ['is', 'are', 'am'],
              dogru: 0,
              aciklama: 'She ile is kullanılır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'My brother is tall.',
              secenekler: [
                'My mother is tall.',
                'My brother is tall.',
                'My brother is small.',
              ],
              dogru: 1,
              aciklama:
                  "'brother' 'bradhır' gibi okunur (th sesi dil uçtadır); 'tall' boyu uzun anlamına gelir.",
            ),
            Soyle(
              soru: 'Cümleyi yüksek sesle söyle.',
              metin: 'This is my sister.',
              ceviri: 'Bu benim kız kardeşim.',
              aciklama: 'Yavaş ve net söyle; kelimelerin sonlarını yutma.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-1.u3.d2',
          ad: 'Evimiz',
          alistirmalar: [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'kitchen', sag: 'mutfak'),
                (sol: 'bedroom', sag: 'yatak odası'),
                (sol: 'bathroom', sag: 'banyo'),
                (sol: 'garden', sag: 'bahçe'),
              ],
              aciklama: 'Evin bölümlerini tekrar et.',
            ),
            Secim(
              soru: 'Nerede uyursun?',
              secenekler: ['bedroom', 'kitchen', 'garden'],
              dogru: 0,
              aciklama: 'Bedroom yatak odasıdır; orada uyuruz.',
            ),
            Bosluk(
              soru: 'There is a table in the ___.',
              secenekler: ['kitchen', 'sky', 'road'],
              dogru: 0,
              aciklama: 'Mutfakta masa olması mantıklıdır: kitchen.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: kapı.',
              cevaplar: ['door', 'the door', 'a door'],
              aciklama: 'Kapı: door.',
            ),
            Sirala(
              soru: 'Sıraya diz: Kedi koltuğun üstünde.',
              kelimeler: ['sofa', 'on', 'cat', 'is', 'The', 'the'],
              dogru: ['The', 'cat', 'is', 'on', 'the', 'sofa'],
              aciklama: 'Yer bildiren on (üstünde) ismin önünde durur.',
            ),
            Secim(
              soru: '"Window" ne demektir?',
              secenekler: ['pencere', 'kapı', 'duvar'],
              dogru: 0,
              aciklama: 'Window pencere, door kapı, wall duvardır.',
            ),
            Bosluk(
              soru: 'The book is ___ the table. (üzerinde)',
              secenekler: ['on', 'in', 'under'],
              dogru: 0,
              aciklama: 'On üzerinde, in içinde, under altında demektir.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Evim küçük.',
              cevaplar: [
                'My house is small.',
                'My house is small',
                'My home is small.',
                'My home is small',
              ],
              aciklama: 'Küçük: small.',
            ),
            Secim(
              soru: '"Bed" ne demektir?',
              secenekler: ['yatak', 'masa', 'sandalye'],
              dogru: 0,
              aciklama: 'Bed yataktır; table masa, chair sandalyedir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'The kitchen is small.',
              secenekler: [
                'The kitchen is big.',
                'The chicken is small.',
                'The kitchen is small.',
              ],
              dogru: 2,
              aciklama:
                  "'kitchen' 'kiçın' gibi okunur; 'small' 'smol' diye okunur ve 'küçük' demektir.",
            ),
            Soyle(
              soru: 'Cümleyi yüksek sesle söyle.',
              metin: 'The table is in the kitchen.',
              ceviri: 'Masa mutfakta.',
              aciklama: 'Yavaş ve net söyle; kelimelerin sonlarını yutma.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-1.u4',
      ad: 'Yiyecek, içecek ve sipariş',
      dersler: [
        Ders(
          id: 'ingilizce-1.u4.d1',
          ad: 'Yiyecek ve içecek',
          alistirmalar: [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'water', sag: 'su'),
                (sol: 'bread', sag: 'ekmek'),
                (sol: 'milk', sag: 'süt'),
                (sol: 'cheese', sag: 'peynir'),
                (sol: 'tea', sag: 'çay'),
              ],
              aciklama: 'Günlük yiyecek ve içecek adları.',
            ),
            Secim(
              soru: '"I drink tea." ne demektir?',
              secenekler: ['Ben çay içerim.', 'Ben çay yaparım.', 'Çay soğuk.'],
              dogru: 0,
              aciklama: 'Drink içmek demektir.',
            ),
            Bosluk(
              soru: 'I ___ bread. (yerim)',
              secenekler: ['eat', 'drink', 'sleep'],
              dogru: 0,
              aciklama: 'Yemek yenir: eat. İçecekler için drink kullanılır.',
            ),
            Bosluk(
              soru: 'She drinks ___.',
              secenekler: ['milk', 'bread', 'cheese'],
              dogru: 0,
              aciklama: 'İçilen şey süttür: milk.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: elma.',
              cevaplar: ['apple', 'an apple', 'the apple'],
              aciklama:
                  'Sesli harfle başlayan sözcüklerden önce an kullanılır: an apple.',
            ),
            Sirala(
              soru: 'Sıraya diz: Kahveyi severim.',
              kelimeler: ['coffee', 'like', 'I'],
              dogru: ['I', 'like', 'coffee'],
              aciklama: 'Kalıp: I like + isim.',
            ),
            Secim(
              soru: 'Hangisi bir içecektir?',
              secenekler: ['juice', 'rice', 'egg'],
              dogru: 0,
              aciklama: 'Juice meyve suyudur; rice pirinç, egg yumurtadır.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Su istiyorum.',
              cevaplar: [
                'I want water.',
                'I want water',
                'I would like water.',
                'I would like water',
              ],
              aciklama: 'Want istemek demektir.',
            ),
            Secim(
              soru: '"I don\'t like fish." ne demektir?',
              secenekler: [
                'Balığı sevmem.',
                'Balık yerim.',
                'Balık istiyorum.',
              ],
              dogru: 0,
              aciklama: 'Don\'t like sevmemek anlamına gelir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'I drink tea every morning.',
              secenekler: [
                'I drink tea every morning.',
                'I drink tea every evening.',
                'I think tea every morning.',
              ],
              dogru: 0,
              aciklama:
                  "'drink' içmek, 'tea' 'ti:' diye okunur ve 'çay' demektir; 'every morning' her sabah anlamına gelir.",
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-1.u4.d2',
          ad: 'Restoranda sipariş',
          alistirmalar: [
            Secim(
              soru: '"Can I have the menu, please?" ne demektir?',
              secenekler: [
                'Menüyü alabilir miyim, lütfen?',
                'Hesabı alabilir miyim?',
                'Masa var mı?',
              ],
              dogru: 0,
              aciklama:
                  'Menu menü demektir. Can I have ...? bir şey rica etme kalıbıdır.',
            ),
            Sirala(
              soru: 'Sıraya diz: Bir kahve istiyorum.',
              kelimeler: ['a', 'like', 'would', 'coffee', 'I'],
              dogru: ['I', 'would', 'like', 'a', 'coffee'],
              aciklama: 'Kibar sipariş kalıbı: I would like ...',
            ),
            Bosluk(
              soru: 'How ___ is it?',
              secenekler: ['much', 'many', 'old'],
              dogru: 0,
              aciklama: 'Fiyat sorarken How much is it? denir.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Hesap, lütfen.',
              cevaplar: [
                'The bill, please.',
                'The bill please',
                'Bill, please.',
                'The check, please.',
                'Check, please.',
              ],
              aciklama: 'Hesap: bill (İngiltere) ya da check (ABD).',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'menu', sag: 'menü'),
                (sol: 'bill', sag: 'hesap'),
                (sol: 'waiter', sag: 'garson'),
                (sol: 'table', sag: 'masa'),
              ],
              aciklama: 'Restoran sözcükleri.',
            ),
            Bosluk(
              soru: 'I would ___ a tea, please.',
              secenekler: ['like', 'am', 'eat'],
              dogru: 0,
              aciklama: 'Would like, kibar istek kalıbıdır.',
            ),
            Secim(
              soru:
                  'Garson bir şey uzatırken "Here you are." der. Anlamı nedir?',
              secenekler: ['Buyurun.', 'Güle güle.', 'Hesap ödendi.'],
              dogru: 0,
              aciklama:
                  'Here you are, bir şeyi verirken söylenen buyurun karşılığıdır.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: İki su, lütfen.',
              cevaplar: [
                'Two waters, please.',
                'Two waters please',
                'Two water, please.',
                'Two water please',
              ],
              aciklama: 'Please her zaman nazik bir sipariş için eklenir.',
            ),
            Secim(
              soru: '"Is it expensive?" ne demektir?',
              secenekler: ['Pahalı mı?', 'Ucuz mu?', 'Soğuk mu?'],
              dogru: 0,
              aciklama: 'Expensive pahalı, cheap ucuz demektir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'A table for two, please.',
              secenekler: [
                'A table for four, please.',
                'A table for two, please.',
                'A table for you, please.',
              ],
              dogru: 1,
              aciklama:
                  "'table for two' iki kişilik masa demektir; 'two' 'tu:' diye okunur ve restoranda kullanılan kalıptır.",
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-1.u5',
      ad: 'Günlük rutin, saat ve günler',
      dersler: [
        Ders(
          id: 'ingilizce-1.u5.d1',
          ad: 'Günlük rutin',
          alistirmalar: [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'wake up', sag: 'uyanmak'),
                (sol: 'have breakfast', sag: 'kahvaltı etmek'),
                (sol: 'go to work', sag: 'işe gitmek'),
                (sol: 'go to bed', sag: 'yatmaya gitmek'),
              ],
              aciklama: 'Günlük rutin kalıpları.',
            ),
            Bosluk(
              soru: 'I ___ up at seven.',
              secenekler: ['wake', 'eat', 'go'],
              dogru: 0,
              aciklama: 'Wake up uyanmak demektir.',
            ),
            Bosluk(
              soru: 'She ___ to school every day.',
              secenekler: ['goes', 'go', 'going'],
              dogru: 0,
              aciklama: 'He/she/it ile fiile -s ya da -es eklenir: goes.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Sabah kahvaltı yaparım.',
              cevaplar: [
                'I have breakfast in the morning.',
                'I have breakfast in the morning',
                'I eat breakfast in the morning.',
                'I eat breakfast in the morning',
              ],
              aciklama:
                  'Kahvaltı yapmak: have breakfast. Sabah: in the morning.',
            ),
            Sirala(
              soru: 'Sıraya diz: O her gün çalışır.',
              kelimeler: ['every', 'works', 'day', 'He'],
              dogru: ['He', 'works', 'every', 'day'],
              aciklama: 'Her gün: every day. He ile fiil -s alır.',
            ),
            Secim(
              soru: '"I brush my teeth." ne demektir?',
              secenekler: [
                'Dişlerimi fırçalarım.',
                'Saçımı tararım.',
                'Elimi yıkarım.',
              ],
              dogru: 0,
              aciklama: 'Brush fırçalamak, teeth dişler demektir.',
            ),
            Secim(
              soru: 'Hangisi "her gün" demektir?',
              secenekler: ['every day', 'at night', 'last week'],
              dogru: 0,
              aciklama:
                  'Every day her gün, at night geceleyin, last week geçen hafta demektir.',
            ),
            Bosluk(
              soru: 'They ___ TV in the evening.',
              secenekler: ['watch', 'watches', 'watching'],
              dogru: 0,
              aciklama: 'They ile fiilin yalın hâli kullanılır: watch.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Akşam eve gelirim.',
              cevaplar: [
                'I come home in the evening.',
                'I come home in the evening',
                'I get home in the evening.',
                'I get home in the evening',
                'I go home in the evening.',
                'I go home in the evening',
              ],
              aciklama: 'Eve gelmek: come home ya da get home.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'She wakes up at seven.',
              secenekler: [
                'She wakes up at seven.',
                'She wakes up at eleven.',
                'He wakes up at seven.',
              ],
              dogru: 0,
              aciklama:
                  "'wakes up' uyanmak demektir ve 'wakes' sonunda 'ks' sesi duyulur; 'seven' yedi saatini belirtir.",
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-1.u5.d2',
          ad: 'Saati söylemek',
          alistirmalar: [
            Secim(
              soru: '"It\'s three o\'clock." saat kaçtır?',
              secenekler: ['3:00', '5:00', '3:30'],
              dogru: 0,
              aciklama: 'O\'clock tam saati belirtir.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'morning', sag: 'sabah'),
                (sol: 'afternoon', sag: 'öğleden sonra'),
                (sol: 'evening', sag: 'akşam'),
                (sol: 'night', sag: 'gece'),
              ],
              aciklama: 'Günün bölümleri.',
            ),
            Bosluk(
              soru: 'What ___ is it?',
              secenekler: ['time', 'clock', 'hour'],
              dogru: 0,
              aciklama: 'Saati sormak için What time is it? denir.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Saat kaç?',
              cevaplar: ['What time is it?', 'What time is it'],
              aciklama: 'Kalıp: What time is it?',
            ),
            Sirala(
              soru: 'Sıraya diz: Saat altı buçuk.',
              kelimeler: ['past', 'half', 'six', 'It', 'is'],
              dogru: ['It', 'is', 'half', 'past', 'six'],
              aciklama: 'Half past buçuk demektir: half past six = 6:30.',
            ),
            Secim(
              soru: '"Quarter past two" saat kaçtır?',
              secenekler: ['2:15', '1:45', '2:45'],
              dogru: 0,
              aciklama: 'Quarter past çeyrek geçe demektir: 2:15.',
            ),
            Bosluk(
              soru: 'I go to bed ___ ten o\'clock.',
              secenekler: ['at', 'in', 'on'],
              dogru: 0,
              aciklama: 'Saatlerin önünde at kullanılır.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Saat dokuz.',
              cevaplar: [
                'It is nine o\'clock.',
                'It\'s nine o\'clock.',
                'It is nine o\'clock',
                'It\'s nine o\'clock',
              ],
              aciklama: 'Tam saat: It is + sayı + o\'clock.',
            ),
            Secim(
              soru: '"Noon" günün hangi zamanıdır?',
              secenekler: ['öğle', 'gece yarısı', 'akşam'],
              dogru: 0,
              aciklama:
                  'Noon öğle vakti (saat 12), midnight gece yarısı demektir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'It is half past six.',
              secenekler: [
                'It is half past seven.',
                'It is quarter past six.',
                'It is half past six.',
              ],
              dogru: 2,
              aciklama:
                  "'half past six' altıyı yarım geçe, yani 6:30 demektir; 'half' içindeki l okunmaz ('ha:f').",
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-1.u5.d3',
          ad: 'Haftanın günleri',
          alistirmalar: [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'Monday', sag: 'Pazartesi'),
                (sol: 'Tuesday', sag: 'Salı'),
                (sol: 'Wednesday', sag: 'Çarşamba'),
                (sol: 'Thursday', sag: 'Perşembe'),
                (sol: 'Friday', sag: 'Cuma'),
              ],
              aciklama:
                  'Haftanın günleri İngilizcede her zaman büyük harfle yazılır.',
            ),
            Secim(
              soru: '"Saturday" hangi gündür?',
              secenekler: ['Cumartesi', 'Pazar', 'Cuma'],
              dogru: 0,
              aciklama: 'Saturday cumartesi, Sunday pazardır.',
            ),
            Bosluk(
              soru: 'Today is ___. (Pazar)',
              secenekler: ['Sunday', 'Saturday', 'Friday'],
              dogru: 0,
              aciklama: 'Sunday pazar demektir.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Pazartesi günü okula giderim.',
              cevaplar: [
                'I go to school on Monday.',
                'I go to school on Monday',
                'On Monday I go to school.',
              ],
              aciklama: 'Günlerin önünde on kullanılır: on Monday.',
            ),
            Sirala(
              soru: 'Sıraya diz: Cuma günü çalışırım.',
              kelimeler: ['Friday', 'work', 'on', 'I'],
              dogru: ['I', 'work', 'on', 'Friday'],
              aciklama: 'Kalıp: I work on + gün.',
            ),
            Bosluk(
              soru: 'I have English class ___ Tuesday.',
              secenekler: ['on', 'at', 'in'],
              dogru: 0,
              aciklama: 'Günlerin önünde on gelir; saatlerin önünde at gelir.',
            ),
            Secim(
              soru: '"What day is it today?" ne demektir?',
              secenekler: [
                'Bugün günlerden ne?',
                'Saat kaç?',
                'Bugün hava nasıl?',
              ],
              dogru: 0,
              aciklama: 'What day gün sorar; What time ise saat sorar.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: hafta sonu.',
              cevaplar: ['weekend', 'the weekend'],
              aciklama: 'Hafta sonu: weekend (Saturday ve Sunday).',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'See you on Friday.',
              secenekler: [
                'See you on Monday.',
                'See you on Sunday.',
                'See you on Friday.',
              ],
              dogru: 2,
              aciklama:
                  "'Friday' 'fraydey' gibi okunur; 'see you on' ile bir sonraki buluşma günü söylenir.",
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-1.u6',
      ad: 'Hava, yön ve alışveriş',
      dersler: [
        Ders(
          id: 'ingilizce-1.u6.d1',
          ad: 'Hava durumu',
          alistirmalar: [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'sunny', sag: 'güneşli'),
                (sol: 'rainy', sag: 'yağmurlu'),
                (sol: 'cloudy', sag: 'bulutlu'),
                (sol: 'windy', sag: 'rüzgârlı'),
                (sol: 'snowy', sag: 'karlı'),
              ],
              aciklama: 'Hava durumu sıfatları -y ile biter.',
            ),
            Secim(
              soru: '"It is raining." ne demektir?',
              secenekler: ['Yağmur yağıyor.', 'Kar yağıyor.', 'Hava güneşli.'],
              dogru: 0,
              aciklama: 'Rain yağmur, raining yağmur yağıyor demektir.',
            ),
            Bosluk(
              soru: 'It is ___ today. (sıcak)',
              secenekler: ['hot', 'cold', 'cool'],
              dogru: 0,
              aciklama: 'Hot sıcak, cold soğuk, cool serin demektir.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Hava nasıl?',
              cevaplar: [
                'How is the weather?',
                'How is the weather',
                'What is the weather like?',
                'What is the weather like',
                'What\'s the weather like?',
                'What\'s the weather like',
              ],
              aciklama: 'Hava durumu sorarken weather sözcüğü kullanılır.',
            ),
            Sirala(
              soru: 'Sıraya diz: Bugün hava soğuk.',
              kelimeler: ['cold', 'is', 'It', 'today'],
              dogru: ['It', 'is', 'cold', 'today'],
              aciklama: 'Hava durumunda özne olarak it kullanılır.',
            ),
            Secim(
              soru: 'Hangi havada şemsiye alırsın?',
              secenekler: ['rainy', 'sunny', 'hot'],
              dogru: 0,
              aciklama: 'Rainy yağmurlu demektir; yağmurda şemsiye gerekir.',
            ),
            Bosluk(
              soru: 'In winter it is ___.',
              secenekler: ['cold', 'hot', 'sunny'],
              dogru: 0,
              aciklama: 'Kışın hava genellikle soğuktur: cold.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Bugün hava güneşli.',
              cevaplar: [
                'It is sunny today.',
                'It is sunny today',
                'It\'s sunny today.',
                'It\'s sunny today',
                'Today it is sunny.',
              ],
              aciklama: 'Güneşli: sunny.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'It is cloudy and windy.',
              secenekler: [
                'It is cloudy and rainy.',
                'It is cloudy and windy.',
                'It is cloudy and sunny.',
              ],
              dogru: 1,
              aciklama:
                  "'cloudy' 'klaudi' (bulutlu), 'windy' 'vindi' (rüzgarlı) diye okunur; ikisi de hava durumu sıfatıdır.",
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-1.u6.d2',
          ad: 'Yön sorma',
          alistirmalar: [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'left', sag: 'sol'),
                (sol: 'right', sag: 'sağ'),
                (sol: 'straight ahead', sag: 'dümdüz ileri'),
                (sol: 'next to', sag: 'yanında'),
              ],
              aciklama: 'Yön tarif ederken sık kullanılan sözcükler.',
            ),
            Secim(
              soru: '"Where is the station?" ne demektir?',
              secenekler: [
                'İstasyon nerede?',
                'İstasyon ne zaman?',
                'İstasyon kaç para?',
              ],
              dogru: 0,
              aciklama: 'Where nerede demektir.',
            ),
            Sirala(
              soru: 'Sıraya diz: Köşeden sola dön.',
              kelimeler: ['corner', 'left', 'the', 'Turn', 'at'],
              dogru: ['Turn', 'left', 'at', 'the', 'corner'],
              aciklama: 'Yön tarifi emir kipiyle yapılır: Turn left.',
            ),
            Bosluk(
              soru: 'Go ___ ahead.',
              secenekler: ['straight', 'left', 'near'],
              dogru: 0,
              aciklama: 'Go straight ahead: dümdüz ileri git.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Affedersiniz, banka nerede?',
              cevaplar: [
                'Excuse me, where is the bank?',
                'Excuse me where is the bank?',
                'Excuse me, where is the bank',
                'Excuse me where is the bank',
              ],
              aciklama: 'Nazik başlangıç: Excuse me.',
            ),
            Secim(
              soru: '"The bank is next to the school." ne demektir?',
              secenekler: [
                'Banka okulun yanında.',
                'Banka okulun karşısında.',
                'Banka okulun arkasında.',
              ],
              dogru: 0,
              aciklama: 'Next to yanında demektir.',
            ),
            Bosluk(
              soru: 'The park is ___ the hospital. (karşısında)',
              secenekler: ['opposite', 'under', 'on'],
              dogru: 0,
              aciklama: 'Opposite karşısında demektir.',
            ),
            Secim(
              soru: '"It is far from here." ne demektir?',
              secenekler: ['Buradan uzak.', 'Buraya yakın.', 'Burada açık.'],
              dogru: 0,
              aciklama: 'Far uzak, near yakın demektir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'Turn right and walk two minutes.',
              secenekler: [
                'Turn left and walk two minutes.',
                'Turn right and walk ten minutes.',
                'Turn right and walk two minutes.',
              ],
              dogru: 2,
              aciklama:
                  "'right' 'rayt' diye okunur ve 'sağ' demektir; 'turn right' sağa dön, 'walk' yürü anlamına gelir.",
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-1.u6.d3',
          ad: 'Alışveriş',
          alistirmalar: [
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'shop', sag: 'mağaza'),
                (sol: 'price', sag: 'fiyat'),
                (sol: 'size', sag: 'beden'),
                (sol: 'change', sag: 'bozuk para'),
              ],
              aciklama: 'Alışverişte sık geçen sözcükler.',
            ),
            Secim(
              soru: '"How much is this?" ne demektir?',
              secenekler: ['Bu ne kadar?', 'Bu ne zaman?', 'Bu kimin?'],
              dogru: 0,
              aciklama: 'How much fiyat sormak için kullanılır.',
            ),
            Bosluk(
              soru: 'I want to ___ a shirt.',
              secenekler: ['buy', 'eat', 'go'],
              dogru: 0,
              aciklama: 'Buy satın almak demektir.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Bunu alıyorum.',
              cevaplar: [
                'I will take it.',
                'I will take it',
                'I\'ll take it.',
                'I\'ll take it',
                'I take it.',
              ],
              aciklama: 'Satın almaya karar verince I\'ll take it denir.',
            ),
            Sirala(
              soru: 'Sıraya diz: Daha ucuz bir tane var mı?',
              kelimeler: ['cheaper', 'you', 'a', 'Do', 'have', 'one'],
              dogru: ['Do', 'you', 'have', 'a', 'cheaper', 'one'],
              aciklama: 'Soru Do you have ...? kalıbıyla kurulur.',
            ),
            Secim(
              soru: '"It is too big." ne demektir?',
              secenekler: ['Çok büyük.', 'Çok küçük.', 'Çok pahalı.'],
              dogru: 0,
              aciklama: 'Too fazla anlamına gelir; big büyük demektir.',
            ),
            Bosluk(
              soru: 'Can I pay ___ card?',
              secenekler: ['by', 'on', 'at'],
              dogru: 0,
              aciklama: 'Ödeme biçiminde by card (kartla) denir.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Çok pahalı.',
              cevaplar: [
                'It is too expensive.',
                'It is too expensive',
                'It\'s too expensive.',
                'It\'s too expensive',
                'Too expensive.',
                'Too expensive',
              ],
              aciklama: 'Too expensive: çok pahalı.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'Can I try this on?',
              secenekler: [
                'Can I buy this one?',
                'Can I try this on?',
                'Can I try this one?',
              ],
              dogru: 1,
              aciklama:
                  "'try this on' bir kıyafeti denemek demektir; 'Can I' 'kenay' gibi bitişik okunur ve izin ister.",
            ),
          ],
        ),
      ],
    ),
  ],
);
