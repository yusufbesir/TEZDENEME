(function () {
  'use strict';

  // Alıştırma üreticileri (yalnızca yazım kolaylığı; çıktı düz şema nesnesidir).
  function secim(soru, secenekler, dogru, aciklama) {
    return { tur: 'secim', soru: soru, secenekler: secenekler, dogru: dogru, aciklama: aciklama };
  }
  function bosluk(soru, secenekler, dogru, aciklama) {
    return { tur: 'bosluk', soru: soru, secenekler: secenekler, dogru: dogru, aciklama: aciklama };
  }
  function yaz(soru, cevaplar, aciklama) {
    return { tur: 'yaz', soru: soru, cevaplar: cevaplar, aciklama: aciklama };
  }
  function sirala(soru, kelimeler, dogru, aciklama) {
    return { tur: 'sirala', soru: soru, kelimeler: kelimeler, dogru: dogru, aciklama: aciklama };
  }
  function eslestir(soru, ciftler, aciklama) {
    return { tur: 'eslestir', soru: soru, ciftler: ciftler, aciklama: aciklama };
  }

  var kurs = {
    id: 'ingilizce-1',
    ad: 'İngilizce A1: Başlangıç',
    aciklama: 'Türkçe konuşanlar için sıfırdan İngilizce: selamlaşma, sayılar, aile, yemek ve günlük hayat.',
    dil: 'en',
    uniteler: [
      {
        id: 'ingilizce-1.u1',
        ad: 'Selamlaşma ve tanışma',
        dersler: [
          {
            id: 'ingilizce-1.u1.d1',
            ad: 'Merhaba demek',
            alistirmalar: [
              secim('"Hello" ne demektir?', ['Merhaba', 'Güle güle', 'Teşekkürler'], 0,
                'Hello, en yaygın selamlama sözüdür: Merhaba.'),
              secim('"Good morning" hangi zamanda söylenir?', ['Sabah', 'Akşam', 'Gece yarısı'], 0,
                'Morning sabah demektir; Good morning sabah selamıdır.'),
              bosluk('My name ___ Ayşe.', ['is', 'am', 'are'], 0,
                'Name (ad) üçüncü tekil bir isimdir; yanına is gelir.'),
              bosluk('I ___ from Turkey.', ['am', 'is', 'are'], 0,
                'I öznesiyle her zaman am kullanılır.'),
              yaz('İngilizceye çevir: Benim adım Can.', ['My name is Can.', 'My name is Can'],
                'Kalıp: My name is + isim.'),
              sirala('Sıraya diz: Tanıştığımıza memnun oldum.', ['to', 'Nice', 'meet', 'you'],
                ['Nice', 'to', 'meet', 'you'],
                'Kalıp sıra: Nice to meet you.'),
              eslestir('Eşleştir.', [
                ['Hello', 'Merhaba'],
                ['Goodbye', 'Hoşça kal'],
                ['Thank you', 'Teşekkürler'],
                ['Please', 'Lütfen']
              ], 'Bu dört sözcük günlük konuşmanın temelidir.'),
              secim('"How are you?" sorusuna hangisi uygun cevaptır?',
                ['I\'m fine, thanks.', 'My name is Ali.', 'Good night.'], 0,
                'How are you? hal hatır sorar; I\'m fine, thanks. (İyiyim, sağ ol.) doğal cevaptır.'),
              yaz('İngilizceye çevir: Teşekkürler.', ['Thank you', 'Thank you.', 'Thanks', 'Thanks.'],
                'Thank you ya da kısaca Thanks denir.')
            ]
          },
          {
            id: 'ingilizce-1.u1.d2',
            ad: 'Kendini tanıtmak',
            alistirmalar: [
              secim('"Where are you from?" ne demektir?',
                ['Nerelisin?', 'Nasılsın?', 'Adın ne?'], 0,
                'Where nerede/nereden, from -den/-dan demektir.'),
              bosluk('She ___ a teacher.', ['is', 'am', 'are'], 0,
                'She, he, it ile is kullanılır.'),
              bosluk('We ___ students.', ['are', 'is', 'am'], 0,
                'We, you, they ile are kullanılır.'),
              yaz('İngilizceye çevir: Ben öğrenciyim.',
                ['I am a student.', 'I am a student', 'I\'m a student.', 'I\'m a student'],
                'Tekil meslek/rol adlarından önce a gelir: a student.'),
              sirala('Sıraya diz: Nerelisin?', ['from', 'you', 'Where', 'are'],
                ['Where', 'are', 'you', 'from'],
                'Soru sözcüğü başa gelir: Where are you from?'),
              eslestir('Eşleştir.', [
                ['I', 'ben'],
                ['you', 'sen / siz'],
                ['he', 'o (erkek)'],
                ['she', 'o (kadın)'],
                ['we', 'biz']
              ], 'Bunlar özne zamirleridir; be fiilinin biçimini belirlerler.'),
              secim('"He is my friend." cümlesinin anlamı nedir?',
                ['O benim arkadaşım.', 'Ben onun arkadaşıyım.', 'Biz arkadaşız.'], 0,
                'He o (erkek), my benim, friend arkadaş demektir.'),
              yaz('İngilizceye çevir: Türkiye\'denim.',
                ['I am from Turkey.', 'I am from Turkey', 'I\'m from Turkey.', 'I\'m from Turkey'],
                'Kalıp: I am from + yer.'),
              bosluk('Nice to ___ you.', ['meet', 'eat', 'go'], 0,
                'Nice to meet you: tanıştığımıza memnun oldum.')
            ]
          }
        ]
      },
      {
        id: 'ingilizce-1.u2',
        ad: 'Sayılar ve renkler',
        dersler: [
          {
            id: 'ingilizce-1.u2.d1',
            ad: 'Birden ona kadar sayılar',
            alistirmalar: [
              secim('"Seven" hangi sayıdır?', ['7', '6', '9'], 0,
                'Seven yedi demektir. Six altı, nine dokuzdur.'),
              secim('"Eight" hangi sayıdır?', ['3', '8', '10'], 1,
                'Eight sekiz demektir.'),
              eslestir('Eşleştir.', [
                ['one', 'bir'],
                ['two', 'iki'],
                ['three', 'üç'],
                ['four', 'dört'],
                ['five', 'beş']
              ], 'Bir ile beş arasındaki sayıları tekrar et.'),
              yaz('İngilizceye çevir: on (10).', ['ten', 'Ten'],
                '10 İngilizcede ten diye yazılır.'),
              bosluk('I have ___ cats. (3 tane)', ['two', 'three', 'five'], 1,
                'Three üç demektir.'),
              sirala('Sıraya diz: Beş elmam var.', ['apples', 'five', 'have', 'I'],
                ['I', 'have', 'five', 'apples'],
                'Sayı, ismin önüne gelir: five apples.'),
              yaz('İngilizceye çevir: altı (6).', ['six', 'Six'],
                '6 İngilizcede six diye yazılır.'),
              secim('Hangisi 9 demektir?', ['nine', 'five', 'nice'], 0,
                'Nine dokuz demektir; nice ise güzel/hoş anlamına gelir.'),
              bosluk('One, two, ___, four.', ['three', 'five', 'six'], 0,
                'Sıra: one, two, three, four.')
            ]
          },
          {
            id: 'ingilizce-1.u2.d2',
            ad: 'Temel renkler',
            alistirmalar: [
              eslestir('Eşleştir.', [
                ['red', 'kırmızı'],
                ['blue', 'mavi'],
                ['green', 'yeşil'],
                ['yellow', 'sarı']
              ], 'Dört temel rengi tekrar et.'),
              secim('Gökyüzü genellikle hangi renktir?', ['blue', 'green', 'black'], 0,
                'Blue mavi demektir.'),
              yaz('İngilizceye çevir: siyah.', ['black', 'Black'],
                'Siyah İngilizcede black olur.'),
              bosluk('The banana is ___.', ['yellow', 'red', 'blue'], 0,
                'Muz sarıdır: yellow.'),
              sirala('Sıraya diz: Araba kırmızı.', ['red', 'is', 'car', 'The'],
                ['The', 'car', 'is', 'red'],
                'Sıfat (red), be fiilinden sonra gelir.'),
              secim('"White" hangi renktir?', ['beyaz', 'siyah', 'gri'], 0,
                'White beyaz demektir.'),
              yaz('İngilizceye çevir: Kar beyazdır.',
                ['The snow is white.', 'The snow is white', 'Snow is white.', 'Snow is white'],
                'Beyaz: white.'),
              bosluk('Grass is ___.', ['green', 'pink', 'black'], 0,
                'Çimen yeşildir: green.'),
              secim('"Orange" renk olarak ne demektir?', ['turuncu', 'pembe', 'mor'], 0,
                'Orange hem portakal hem turuncu demektir.')
            ]
          }
        ]
      },
      {
        id: 'ingilizce-1.u3',
        ad: 'Aile ve ev',
        dersler: [
          {
            id: 'ingilizce-1.u3.d1',
            ad: 'Aile üyeleri',
            alistirmalar: [
              eslestir('Eşleştir.', [
                ['mother', 'anne'],
                ['father', 'baba'],
                ['sister', 'kız kardeş'],
                ['brother', 'erkek kardeş'],
                ['grandmother', 'büyükanne']
              ], 'Aile sözcükleri: mother, father, sister, brother, grandmother.'),
              secim('"My father" ne demektir?', ['babam', 'annem', 'kardeşim'], 0,
                'My benim, father baba demektir.'),
              bosluk('This is my ___. (anne)', ['mother', 'father', 'brother'], 0,
                'Anne: mother.'),
              yaz('İngilizceye çevir: kız kardeşim.', ['my sister', 'My sister'],
                'Sahiplik için ismin önüne my gelir.'),
              sirala('Sıraya diz: Bir erkek kardeşim var.', ['brother', 'a', 'have', 'I'],
                ['I', 'have', 'a', 'brother'],
                'Tek bir kişiden önce a kullanılır.'),
              secim('Hangisi kadın bir akrabadır?', ['aunt', 'uncle', 'grandfather'], 0,
                'Aunt hala/teyze, uncle amca/dayı demektir.'),
              bosluk('He is my ___. (amca ya da dayı)', ['uncle', 'aunt', 'sister'], 0,
                'Uncle erkek akrabadır; aunt kadındır.'),
              yaz('İngilizceye çevir: Ailem büyük.',
                ['My family is big.', 'My family is big', 'My family is large.', 'My family is large'],
                'Family tekil kabul edilir; yanında is gelir.'),
              bosluk('She ___ my mother.', ['is', 'are', 'am'], 0,
                'She ile is kullanılır.')
            ]
          },
          {
            id: 'ingilizce-1.u3.d2',
            ad: 'Evimiz',
            alistirmalar: [
              eslestir('Eşleştir.', [
                ['kitchen', 'mutfak'],
                ['bedroom', 'yatak odası'],
                ['bathroom', 'banyo'],
                ['garden', 'bahçe']
              ], 'Evin bölümlerini tekrar et.'),
              secim('Nerede uyursun?', ['bedroom', 'kitchen', 'garden'], 0,
                'Bedroom yatak odasıdır; orada uyuruz.'),
              bosluk('There is a table in the ___.', ['kitchen', 'sky', 'road'], 0,
                'Mutfakta masa olması mantıklıdır: kitchen.'),
              yaz('İngilizceye çevir: kapı.', ['door', 'the door', 'a door'],
                'Kapı: door.'),
              sirala('Sıraya diz: Kedi koltuğun üstünde.',
                ['sofa', 'on', 'cat', 'is', 'The', 'the'],
                ['The', 'cat', 'is', 'on', 'the', 'sofa'],
                'Yer bildiren on (üstünde) ismin önünde durur.'),
              secim('"Window" ne demektir?', ['pencere', 'kapı', 'duvar'], 0,
                'Window pencere, door kapı, wall duvardır.'),
              bosluk('The book is ___ the table. (üzerinde)', ['on', 'in', 'under'], 0,
                'On üzerinde, in içinde, under altında demektir.'),
              yaz('İngilizceye çevir: Evim küçük.',
                ['My house is small.', 'My house is small', 'My home is small.', 'My home is small'],
                'Küçük: small.'),
              secim('"Bed" ne demektir?', ['yatak', 'masa', 'sandalye'], 0,
                'Bed yataktır; table masa, chair sandalyedir.')
            ]
          }
        ]
      },
      {
        id: 'ingilizce-1.u4',
        ad: 'Yiyecek, içecek ve sipariş',
        dersler: [
          {
            id: 'ingilizce-1.u4.d1',
            ad: 'Yiyecek ve içecek',
            alistirmalar: [
              eslestir('Eşleştir.', [
                ['water', 'su'],
                ['bread', 'ekmek'],
                ['milk', 'süt'],
                ['cheese', 'peynir'],
                ['tea', 'çay']
              ], 'Günlük yiyecek ve içecek adları.'),
              secim('"I drink tea." ne demektir?',
                ['Ben çay içerim.', 'Ben çay yaparım.', 'Çay soğuk.'], 0,
                'Drink içmek demektir.'),
              bosluk('I ___ bread. (yerim)', ['eat', 'drink', 'sleep'], 0,
                'Yemek yenir: eat. İçecekler için drink kullanılır.'),
              bosluk('She drinks ___.', ['milk', 'bread', 'cheese'], 0,
                'İçilen şey süttür: milk.'),
              yaz('İngilizceye çevir: elma.', ['apple', 'an apple', 'the apple'],
                'Sesli harfle başlayan sözcüklerden önce an kullanılır: an apple.'),
              sirala('Sıraya diz: Kahveyi severim.', ['coffee', 'like', 'I'],
                ['I', 'like', 'coffee'],
                'Kalıp: I like + isim.'),
              secim('Hangisi bir içecektir?', ['juice', 'rice', 'egg'], 0,
                'Juice meyve suyudur; rice pirinç, egg yumurtadır.'),
              yaz('İngilizceye çevir: Su istiyorum.',
                ['I want water.', 'I want water', 'I would like water.', 'I would like water'],
                'Want istemek demektir.'),
              secim('"I don\'t like fish." ne demektir?',
                ['Balığı sevmem.', 'Balık yerim.', 'Balık istiyorum.'], 0,
                'Don\'t like sevmemek anlamına gelir.')
            ]
          },
          {
            id: 'ingilizce-1.u4.d2',
            ad: 'Restoranda sipariş',
            alistirmalar: [
              secim('"Can I have the menu, please?" ne demektir?',
                ['Menüyü alabilir miyim, lütfen?', 'Hesabı alabilir miyim?', 'Masa var mı?'], 0,
                'Menu menü demektir. Can I have ...? bir şey rica etme kalıbıdır.'),
              sirala('Sıraya diz: Bir kahve istiyorum.',
                ['a', 'like', 'would', 'coffee', 'I'],
                ['I', 'would', 'like', 'a', 'coffee'],
                'Kibar sipariş kalıbı: I would like ...'),
              bosluk('How ___ is it?', ['much', 'many', 'old'], 0,
                'Fiyat sorarken How much is it? denir.'),
              yaz('İngilizceye çevir: Hesap, lütfen.',
                ['The bill, please.', 'The bill please', 'Bill, please.', 'The check, please.', 'Check, please.'],
                'Hesap: bill (İngiltere) ya da check (ABD).'),
              eslestir('Eşleştir.', [
                ['menu', 'menü'],
                ['bill', 'hesap'],
                ['waiter', 'garson'],
                ['table', 'masa']
              ], 'Restoran sözcükleri.'),
              bosluk('I would ___ a tea, please.', ['like', 'am', 'eat'], 0,
                'Would like, kibar istek kalıbıdır.'),
              secim('Garson bir şey uzatırken "Here you are." der. Anlamı nedir?',
                ['Buyurun.', 'Güle güle.', 'Hesap ödendi.'], 0,
                'Here you are, bir şeyi verirken söylenen buyurun karşılığıdır.'),
              yaz('İngilizceye çevir: İki su, lütfen.',
                ['Two waters, please.', 'Two waters please', 'Two water, please.', 'Two water please'],
                'Please her zaman nazik bir sipariş için eklenir.'),
              secim('"Is it expensive?" ne demektir?',
                ['Pahalı mı?', 'Ucuz mu?', 'Soğuk mu?'], 0,
                'Expensive pahalı, cheap ucuz demektir.')
            ]
          }
        ]
      },
      {
        id: 'ingilizce-1.u5',
        ad: 'Günlük rutin ve saat',
        dersler: [
          {
            id: 'ingilizce-1.u5.d1',
            ad: 'Günlük rutin',
            alistirmalar: [
              eslestir('Eşleştir.', [
                ['wake up', 'uyanmak'],
                ['have breakfast', 'kahvaltı etmek'],
                ['go to work', 'işe gitmek'],
                ['go to bed', 'yatmaya gitmek']
              ], 'Günlük rutin kalıpları.'),
              bosluk('I ___ up at seven.', ['wake', 'eat', 'go'], 0,
                'Wake up uyanmak demektir.'),
              bosluk('She ___ to school every day.', ['goes', 'go', 'going'], 0,
                'He/she/it ile fiile -s ya da -es eklenir: goes.'),
              yaz('İngilizceye çevir: Sabah kahvaltı yaparım.',
                ['I have breakfast in the morning.', 'I have breakfast in the morning',
                  'I eat breakfast in the morning.', 'I eat breakfast in the morning'],
                'Kahvaltı yapmak: have breakfast. Sabah: in the morning.'),
              sirala('Sıraya diz: O her gün çalışır.', ['every', 'works', 'day', 'He'],
                ['He', 'works', 'every', 'day'],
                'Her gün: every day. He ile fiil -s alır.'),
              secim('"I brush my teeth." ne demektir?',
                ['Dişlerimi fırçalarım.', 'Saçımı tararım.', 'Elimi yıkarım.'], 0,
                'Brush fırçalamak, teeth dişler demektir.'),
              secim('Hangisi "her gün" demektir?', ['every day', 'at night', 'last week'], 0,
                'Every day her gün, at night geceleyin, last week geçen hafta demektir.'),
              bosluk('They ___ TV in the evening.', ['watch', 'watches', 'watching'], 0,
                'They ile fiilin yalın hâli kullanılır: watch.'),
              yaz('İngilizceye çevir: Akşam eve gelirim.',
                ['I come home in the evening.', 'I come home in the evening',
                  'I get home in the evening.', 'I get home in the evening',
                  'I go home in the evening.', 'I go home in the evening'],
                'Eve gelmek: come home ya da get home.')
            ]
          },
          {
            id: 'ingilizce-1.u5.d2',
            ad: 'Saati söylemek',
            alistirmalar: [
              secim('"It\'s three o\'clock." saat kaçtır?', ['3:00', '5:00', '3:30'], 0,
                'O\'clock tam saati belirtir.'),
              eslestir('Eşleştir.', [
                ['morning', 'sabah'],
                ['afternoon', 'öğleden sonra'],
                ['evening', 'akşam'],
                ['night', 'gece']
              ], 'Günün bölümleri.'),
              bosluk('What ___ is it?', ['time', 'clock', 'hour'], 0,
                'Saati sormak için What time is it? denir.'),
              yaz('İngilizceye çevir: Saat kaç?', ['What time is it?', 'What time is it'],
                'Kalıp: What time is it?'),
              sirala('Sıraya diz: Saat altı buçuk.',
                ['past', 'half', 'six', 'It', 'is'],
                ['It', 'is', 'half', 'past', 'six'],
                'Half past buçuk demektir: half past six = 6:30.'),
              secim('"Quarter past two" saat kaçtır?', ['2:15', '1:45', '2:45'], 0,
                'Quarter past çeyrek geçe demektir: 2:15.'),
              bosluk('I go to bed ___ ten o\'clock.', ['at', 'in', 'on'], 0,
                'Saatlerin önünde at kullanılır.'),
              yaz('İngilizceye çevir: Saat dokuz.',
                ['It is nine o\'clock.', 'It\'s nine o\'clock.', 'It is nine o\'clock', 'It\'s nine o\'clock'],
                'Tam saat: It is + sayı + o\'clock.'),
              secim('"Noon" günün hangi zamanıdır?', ['öğle', 'gece yarısı', 'akşam'], 0,
                'Noon öğle vakti (saat 12), midnight gece yarısı demektir.')
            ]
          }
        ]
      }
    ]
  };

  if (typeof module === 'object' && module.exports) module.exports = kurs;
  if (typeof window !== 'undefined') (window.ICERIK = window.ICERIK || []).push(kurs);
})();
