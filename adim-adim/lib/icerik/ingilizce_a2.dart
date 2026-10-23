// İngilizce A2 kursu (CEFR A2): 6 ünite x 2 ders = 12 ders, ders başına 10 alıştırma.
// Sahibi: Yusuf (yusufbesir). İçerik testleri geçmeden değişmez; silme yalnız Yusuf kararıyla.
import '../model/icerik.dart';

/// İngilizce A2: Günlük hayat
const Kurs ingilizceA2 = Kurs(
  id: 'ingilizce-2',
  ad: 'İngilizce A2',
  aciklama:
      'A1 sonrası günlük İngilizce: rutin, geçmiş zaman, alışveriş, yol tarifi, planlar ve sağlık.',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'ingilizce-2.u1',
      ad: 'Günlük rutin ve saat',
      dersler: [
        Ders(
          id: 'ingilizce-2.u1.d1',
          ad: 'Saati söylemek',
          alistirmalar: [
            Secim(
              soru: '"It\'s 7:15." Bu saati nasıl söyleriz?',
              secenekler: [
                'Quarter past seven',
                'Quarter to seven',
                'Half past seven',
              ],
              dogru: 0,
              aciklama:
                  'Quarter past: çeyrek geçe. 7:15, "quarter past seven" olur.',
            ),
            Bosluk(
              soru: 'I ___ up at seven o\'clock every day.',
              secenekler: ['get', 'gets', 'getting'],
              dogru: 0,
              aciklama: 'I öznesiyle fiilin yalın hali kullanılır: I get up.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'I get up at half past six.',
              secenekler: [
                'I get up at half past nine.',
                'I give up at half past six.',
                'I get up at half past six.',
              ],
              dogru: 2,
              aciklama:
                  '"Get up" kalkmak demektir; "give up" vazgeçmek. "Half past six" altı buçuktur.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Ben her sabah sekizde işe giderim.',
              cevaplar: [
                'I go to work at eight every morning.',
                'I go to work every morning at eight.',
                'I go to work at eight o\'clock every morning.',
                'I go to work at 8 every morning.',
              ],
              aciklama:
                  'Kalıp: go to work (işe gitmek); saat için at, tekrar için every morning.',
            ),
            Sirala(
              soru: 'Sıraya diz: Ders dokuzda başlar.',
              kelimeler: ['at', 'nine', 'class', 'The', 'starts'],
              dogru: ['The', 'class', 'starts', 'at', 'nine'],
              aciklama:
                  'Üçüncü tekil kişide fiile -s gelir: starts. Saat için at kullanılır.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'quarter past two', sag: '2:15'),
                (sol: 'half past two', sag: '2:30'),
                (sol: 'quarter to three', sag: '2:45'),
                (sol: 'two o\'clock', sag: '2:00'),
              ],
              aciklama: 'Past geçe, to var demektir; half yarım, yani buçuk.',
            ),
            Bosluk(
              soru: 'She ___ breakfast at eight.',
              secenekler: ['has', 'have', 'having'],
              dogru: 0,
              aciklama: 'She ile have fiili has olur: She has breakfast.',
            ),
            Secim(
              soru:
                  '"What time do you have lunch?" sorusuna hangisi uygun cevaptır?',
              secenekler: ['In the kitchen.', 'At one o\'clock.', 'Yes, I do.'],
              dogru: 1,
              aciklama: 'What time? saati sorar; cevap "At + saat" olur.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Ben saat yedide akşam yemeği yerim.',
              cevaplar: [
                'I have dinner at seven.',
                'I have dinner at seven o\'clock.',
                'I have dinner at 7.',
              ],
              aciklama: 'Yemek yemek için have kullanılır: have dinner.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'What time does the bus leave?',
              secenekler: [
                'What time does the bus leave?',
                'What time does the bus live?',
                'What time does the bus arrive?',
              ],
              dogru: 0,
              aciklama:
                  '"Leave" ayrılmak, kalkmak demektir; "arrive" varmak. Saat sorusu "What time" ile başlar.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-2.u1.d2',
          ad: 'Sıklık zarfları',
          alistirmalar: [
            Secim(
              soru: '"Always" ne demektir?',
              secenekler: ['Her zaman', 'Hiçbir zaman', 'Bazen'],
              dogru: 0,
              aciklama:
                  'Always her zaman demektir. Never hiçbir zaman, sometimes bazen demektir.',
            ),
            Isaretle(
              soru: 'Sıklık zarfını işaretle.',
              cumle: 'She usually walks to work.',
              dogru: [1],
              aciklama:
                  'Usually (genellikle) bir sıklık zarfıdır ve fiilden önce gelir.',
            ),
            Bosluk(
              soru: 'He ___ eats meat. He is a vegetarian.',
              secenekler: ['always', 'never', 'usually'],
              dogru: 1,
              aciklama: 'Vejetaryen et yemez; never "hiçbir zaman" demektir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'I never drink tea at night.',
              secenekler: [
                'I never think tea at night.',
                'I never drink tea at night.',
                'I often drink tea at night.',
              ],
              dogru: 1,
              aciklama:
                  '"Never" hiçbir zaman, "often" sık sık demektir. Drink içmek, think düşünmek.',
            ),
            Sirala(
              soru: 'Sıraya diz: Ben genellikle otobüsle giderim.',
              kelimeler: ['bus', 'go', 'I', 'by', 'usually'],
              dogru: ['I', 'usually', 'go', 'by', 'bus'],
              aciklama: 'Sıklık zarfı ana fiilden önce gelir: I usually go.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'always', sag: 'her zaman'),
                (sol: 'usually', sag: 'genellikle'),
                (sol: 'often', sag: 'sık sık'),
                (sol: 'sometimes', sag: 'bazen'),
                (sol: 'never', sag: 'asla'),
              ],
              aciklama: 'Bu zarflar bir işin ne sıklıkta yapıldığını anlatır.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Ben bazen geç kalırım.',
              cevaplar: [
                'I am sometimes late.',
                'I\'m sometimes late.',
                'Sometimes I am late.',
                'Sometimes I\'m late.',
                'I am late sometimes.',
                'I\'m late sometimes.',
              ],
              aciklama:
                  'Sıklık zarfı be fiilinden sonra gelir: I am sometimes late.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'Always she is happy.',
                'She is always happy.',
                'She is happy always the.',
              ],
              dogru: 1,
              aciklama: 'Zarf be fiilinden sonra gelir: She is always happy.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Sen her zaman erken kalkar mısın?',
              cevaplar: [
                'Do you always get up early?',
                'Do you always wake up early?',
              ],
              aciklama: 'Present simple soru: Do + özne + zarf + fiil.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'She usually walks to work.',
              secenekler: [
                'She usually walks to work.',
                'She usually walks to school.',
                'She usually works at home.',
              ],
              dogru: 0,
              aciklama:
                  '"Walks to work" işe yürüyerek gitmek demektir; "school" okul, "at home" evde.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-2.u2',
      ad: 'Geçmişi anlatma',
      dersler: [
        Ders(
          id: 'ingilizce-2.u2.d1',
          ad: 'Düzenli fiiller',
          alistirmalar: [
            Secim(
              soru: '"Yesterday" ne demektir?',
              secenekler: ['Yarın', 'Dün', 'Bugün'],
              dogru: 1,
              aciklama:
                  'Yesterday dün demektir. Tomorrow yarın, today bugündür.',
            ),
            Isaretle(
              soru: 'Geçmiş zaman fiillerini işaretle.',
              cumle: 'She opened the door and walked in.',
              dogru: [1, 5],
              aciklama:
                  'Düzenli fiillere geçmişte -ed eklenir: opened, walked.',
            ),
            Bosluk(
              soru: 'I ___ football yesterday.',
              secenekler: ['play', 'played', 'plays'],
              dogru: 1,
              aciklama:
                  'Geçmiş zaman için düzenli fiillere -ed eklenir: played.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Dün gece televizyon izledim.',
              cevaplar: [
                'I watched TV last night.',
                'I watched television last night.',
              ],
              aciklama: 'Last night dün gece demektir; watch + ed = watched.',
            ),
            Sirala(
              soru:
                  'Sıraya diz: Geçen pazar büyükanne ve büyükbabamızı ziyaret ettik.',
              kelimeler: [
                'last',
                'visited',
                'We',
                'Sunday',
                'our',
                'grandparents',
              ],
              dogru: ['We', 'visited', 'our', 'grandparents', 'last', 'Sunday'],
              aciklama:
                  'Visit fiilinin geçmişi visited\'dır; last Sunday geçen pazar demektir.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'walk', sag: 'walked'),
                (sol: 'study', sag: 'studied'),
                (sol: 'stop', sag: 'stopped'),
                (sol: 'like', sag: 'liked'),
                (sol: 'carry', sag: 'carried'),
              ],
              aciklama:
                  'Sessiz harf + y ile biten fiillerde y düşer, ied eklenir; kısa ünlü + sessiz harfle bitenlerde son harf ikilenir; e ile bitene yalnız d gelir.',
            ),
            Secim(
              soru: 'Hangisi doğrudur?',
              secenekler: [
                'He studyed hard.',
                'He studys hard.',
                'He studied hard.',
              ],
              dogru: 2,
              aciklama:
                  'Sessiz harf + y ile biten fiillerde y düşer, ied eklenir: studied.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Dün annemi aradım.',
              cevaplar: [
                'I called my mother yesterday.',
                'I called my mom yesterday.',
                'I phoned my mother yesterday.',
                'I phoned my mom yesterday.',
              ],
              aciklama: 'Call aramak demektir; geçmişi called.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'We danced all night.',
              secenekler: [
                'We dance all night.',
                'We danced all night.',
                'We danced all day.',
              ],
              dogru: 1,
              aciklama:
                  'Danced geçmiş zamandır; "night" gece, "day" gündüz demektir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'He cooked dinner for us.',
              secenekler: [
                'He cooks dinner for us.',
                'He cooked lunch for us.',
                'He cooked dinner for us.',
              ],
              dogru: 2,
              aciklama:
                  'Cooked pişirdi demektir; dinner akşam yemeği, lunch öğle yemeğidir.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-2.u2.d2',
          ad: 'Düzensiz fiiller, olumsuz ve soru',
          alistirmalar: [
            Secim(
              soru: '"Went" hangi fiilin geçmiş halidir?',
              secenekler: ['Get', 'Go', 'Give'],
              dogru: 1,
              aciklama: 'Go fiilinin geçmişi went\'tir; düzensiz bir fiildir.',
            ),
            Bosluk(
              soru: 'I ___ a great film last night.',
              secenekler: ['saw', 'seen', 'see'],
              dogru: 0,
              aciklama: 'See fiilinin geçmişi saw\'dur.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'go', sag: 'went'),
                (sol: 'eat', sag: 'ate'),
                (sol: 'buy', sag: 'bought'),
                (sol: 'see', sag: 'saw'),
                (sol: 'have', sag: 'had'),
              ],
              aciklama:
                  'Bunlar düzensiz fiillerdir; geçmiş hallerini ezberlemek gerekir.',
            ),
            Bosluk(
              soru: 'She ___ not come to school yesterday.',
              secenekler: ['did', 'was', 'has'],
              dogru: 0,
              aciklama:
                  'Geçmiş zamanda olumsuz yapı: did not + fiilin yalın hali.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Dün sinemaya gitmedik.',
              cevaplar: [
                'We didn\'t go to the cinema yesterday.',
                'We did not go to the cinema yesterday.',
                'We didn\'t go to the movies yesterday.',
                'We did not go to the movies yesterday.',
              ],
              aciklama: 'Olumsuzda didn\'t kullanılır ve fiil yalın kalır: go.',
            ),
            Sirala(
              soru: 'Sıraya diz: Bu sabah kahvaltı ettin mi?',
              kelimeler: ['breakfast', 'you', 'Did', 'eat', 'this', 'morning'],
              dogru: ['Did', 'you', 'eat', 'breakfast', 'this', 'morning'],
              aciklama: 'Soru yapısı: Did + özne + yalın fiil.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'Did she went home?',
                'Did she go home?',
                'She did went home?',
              ],
              dogru: 1,
              aciklama: 'Did varsa fiil yalın kalır: Did she go home?',
            ),
            Bosluk(
              soru: 'We ___ a taxi because it was raining.',
              secenekler: ['took', 'take', 'taked'],
              dogru: 0,
              aciklama: 'Take fiilinin geçmişi took\'tur.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'I bought a new phone yesterday.',
              secenekler: [
                'I brought a new phone yesterday.',
                'I bought a new phone tomorrow.',
                'I bought a new phone yesterday.',
              ],
              dogru: 2,
              aciklama:
                  'Bought satın aldım, brought getirdim demektir; yesterday geçmişi gösterir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'Did you see my keys?',
              secenekler: [
                'Did you see my keys?',
                'Did you sell my keys?',
                'Did you see my cat?',
              ],
              dogru: 0,
              aciklama:
                  '"See" görmek, "sell" satmak demektir; keys anahtarlar, cat kedidir.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-2.u3',
      ad: 'Alışveriş ve yemek',
      dersler: [
        Ders(
          id: 'ingilizce-2.u3.d1',
          ad: 'Sayılabilir ve sayılamayan, some ve any',
          alistirmalar: [
            Secim(
              soru: 'Hangisi sayılamayan bir isimdir?',
              secenekler: ['Apple', 'Egg', 'Water'],
              dogru: 2,
              aciklama:
                  'Water sayılamaz; bir, iki diye sayamayız. Apple ve egg sayılabilir.',
            ),
            Bosluk(
              soru: 'I need ___ milk.',
              secenekler: ['some', 'a', 'many'],
              dogru: 0,
              aciklama: 'Sayılamayan isimlerle olumlu cümlede some kullanılır.',
            ),
            Bosluk(
              soru: 'Is there ___ bread at home?',
              secenekler: ['any', 'a', 'many'],
              dogru: 0,
              aciklama: 'Sorularda genellikle any kullanılır; bread sayılamaz.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Evde hiç yumurta yok.',
              cevaplar: [
                'There aren\'t any eggs at home.',
                'There are no eggs at home.',
                'We don\'t have any eggs at home.',
                'There are not any eggs at home.',
                'There aren\'t any eggs in the house.',
              ],
              aciklama:
                  'Olumsuzda any kullanılır; "no" ile de aynı anlam verilir.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'rice', sag: 'pirinç'),
                (sol: 'cheese', sag: 'peynir'),
                (sol: 'bread', sag: 'ekmek'),
                (sol: 'butter', sag: 'tereyağı'),
                (sol: 'juice', sag: 'meyve suyu'),
              ],
              aciklama:
                  'Bunlar yiyecek ve içecek adlarıdır; çoğu sayılamayan isimdir.',
            ),
            Sirala(
              soru: 'Sıraya diz: Biraz çay ister misin?',
              kelimeler: ['some', 'you', 'Would', 'tea', 'like'],
              dogru: ['Would', 'you', 'like', 'some', 'tea'],
              aciklama: 'İkramda some kullanılır: Would you like some tea?',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'There are some milk.',
                'There is some milk.',
                'There is some apples.',
              ],
              dogru: 1,
              aciklama:
                  'Milk sayılamaz; is ile kullanılır: There is some milk.',
            ),
            Bosluk(
              soru: 'I don\'t have ___ money.',
              secenekler: ['some', 'any', 'a'],
              dogru: 1,
              aciklama: 'Olumsuz cümlede any kullanılır; money sayılamaz.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'Can I have some water, please?',
              secenekler: [
                'Can I have some water, please?',
                'Can I have some waiter, please?',
                'Can I have some coffee, please?',
              ],
              dogru: 0,
              aciklama:
                  'Water su demektir; waiter garson, coffee kahvedir. "Can I have..." rica kalıbıdır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'We don\'t have any sugar.',
              secenekler: [
                'We have some sugar.',
                'We don\'t have any sugar.',
                'We don\'t have any shoes.',
              ],
              dogru: 1,
              aciklama:
                  '"Don\'t have any" hiç yok demektir; "have some" biraz var. Sugar şeker, shoes ayakkabıdır.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-2.u3.d2',
          ad: 'How much, how many ve restoran',
          alistirmalar: [
            Secim(
              soru: '"How much is it?" ne sorar?',
              secenekler: ['Kaç tane?', 'Nerede?', 'Ne kadar? (fiyat)'],
              dogru: 2,
              aciklama: 'How much is it? bir şeyin fiyatını sorar.',
            ),
            Bosluk(
              soru: 'How ___ sugar do you want in your tea?',
              secenekler: ['much', 'many', 'few'],
              dogru: 0,
              aciklama: 'Sugar sayılamaz; How much kullanılır.',
            ),
            Bosluk(
              soru: 'How ___ people are there in your family?',
              secenekler: ['much', 'many', 'a lot'],
              dogru: 1,
              aciklama: 'People sayılabilir; How many kullanılır.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Ne kadar süt var?',
              cevaplar: [
                'How much milk is there?',
                'How much milk do we have?',
                'How much milk have we got?',
              ],
              aciklama: 'Sayılamayan isimle How much; ardından is there.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'menu', sag: 'menü'),
                (sol: 'bill', sag: 'hesap'),
                (sol: 'waiter', sag: 'garson'),
                (sol: 'order', sag: 'sipariş vermek'),
                (sol: 'tip', sag: 'bahşiş'),
              ],
              aciklama: 'Restoranda sık kullanılan sözcükler.',
            ),
            Sirala(
              soru: 'Sıraya diz: Bir fincan kahve istiyorum.',
              kelimeler: ['a', 'I\'d', 'coffee', 'like', 'of', 'cup'],
              dogru: ['I\'d', 'like', 'a', 'cup', 'of', 'coffee'],
              aciklama:
                  'I\'d like kibar bir istek kalıbıdır; a cup of fincan anlamında ölçü ifadesidir.',
            ),
            Secim(
              soru: 'Garson: "Are you ready to order?" Uygun cevap hangisidir?',
              secenekler: [
                'Yes, the bill is here.',
                'No, it\'s Tuesday.',
                'Yes, I\'d like the soup, please.',
              ],
              dogru: 2,
              aciklama: 'Sipariş sorusuna sipariş vererek cevap verilir.',
            ),
            Bosluk(
              soru: 'Would you like ___ more tea? Yes, please.',
              secenekler: ['a', 'some', 'many'],
              dogru: 1,
              aciklama: 'İkramlarda ve tekliflerde some kullanılır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'How much is this sandwich?',
              secenekler: [
                'How much is this sandwich?',
                'How much is that sandwich?',
                'How many are these sandwiches?',
              ],
              dogru: 0,
              aciklama:
                  'This bu, that şu demektir; How much fiyat sorar, How many sayı sorar.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'I\'d like two cups of tea.',
              secenekler: [
                'I\'d like two cups of tea.',
                'I\'d like two cups of coffee.',
                'I\'d like two glasses of tea.',
              ],
              dogru: 0,
              aciklama:
                  'Tea çay, coffee kahve demektir; cup fincan, glass bardaktır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-2.u4',
      ad: 'Yol tarifi ve şehir',
      dersler: [
        Ders(
          id: 'ingilizce-2.u4.d1',
          ad: 'Yer edatları ve there is/are',
          alistirmalar: [
            Secim(
              soru: '"Next to" ne demektir?',
              secenekler: ['Yanında', 'Karşısında', 'Altında'],
              dogru: 0,
              aciklama: 'Next to bir şeyin hemen yanında demektir.',
            ),
            Bosluk(
              soru: 'The bank is ___ the post office and the cafe.',
              secenekler: ['between', 'on', 'in'],
              dogru: 0,
              aciklama: 'Between iki şeyin arasında demektir.',
            ),
            Bosluk(
              soru: 'There ___ a park near my house.',
              secenekler: ['are', 'is', 'am'],
              dogru: 1,
              aciklama: 'Tek bir şey için there is kullanılır.',
            ),
            Bosluk(
              soru: 'There ___ two banks on this street.',
              secenekler: ['is', 'be', 'are'],
              dogru: 2,
              aciklama: 'Çoğul isimlerle there are kullanılır.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'opposite', sag: 'karşısında'),
                (sol: 'behind', sag: 'arkasında'),
                (sol: 'in front of', sag: 'önünde'),
                (sol: 'between', sag: 'arasında'),
                (sol: 'next to', sag: 'yanında'),
              ],
              aciklama:
                  'Bunlar yer edatlarıdır; bir şeyin nerede olduğunu söyler.',
            ),
            Sirala(
              soru: 'Sıraya diz: Buralarda süpermarket var mı?',
              kelimeler: ['here', 'Is', 'a', 'near', 'there', 'supermarket'],
              dogru: ['Is', 'there', 'a', 'supermarket', 'near', 'here'],
              aciklama: 'Soru yapısı: Is there + a + isim?',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Parkın yanında bir okul var.',
              cevaplar: [
                'There is a school next to the park.',
                'There\'s a school next to the park.',
                'There is a school beside the park.',
                'There\'s a school beside the park.',
              ],
              aciklama: 'Kalıp: There is + a + isim + yer edatı.',
            ),
            Secim(
              soru: '"The hotel is opposite the station." Otel nerededir?',
              secenekler: [
                'Garın arkasında',
                'Garın karşısında',
                'Garın yanında',
              ],
              dogru: 1,
              aciklama: 'Opposite karşısında demektir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'There is a bank behind the hotel.',
              secenekler: [
                'There is a bank behind the hotel.',
                'There is a bank beside the hotel.',
                'There is a bench behind the hotel.',
              ],
              dogru: 0,
              aciklama:
                  'Behind arkasında, beside yanında demektir; bank banka, bench banktır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'The museum is next to the park.',
              secenekler: [
                'The museum is next to the park.',
                'The museum is next to the bank.',
                'The museum is not next to the park.',
              ],
              dogru: 0,
              aciklama:
                  '"Next to the park" parkın yanında demektir; cümlede "not" yoktur.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-2.u4.d2',
          ad: 'Yol tarifi ve emir kipi',
          alistirmalar: [
            Secim(
              soru: '"Turn left" ne demektir?',
              secenekler: ['Sağa dön', 'Dümdüz git', 'Sola dön'],
              dogru: 2,
              aciklama: 'Turn dönmek, left sol demektir.',
            ),
            Bosluk(
              soru: '___ straight on for two hundred metres.',
              secenekler: ['Go', 'Going', 'Goes'],
              dogru: 0,
              aciklama: 'Emir cümlelerinde fiilin yalın hali kullanılır.',
            ),
            Bosluk(
              soru: '___ run in the library!',
              secenekler: ['Doesn\'t', 'Don\'t', 'Not'],
              dogru: 1,
              aciklama: 'Olumsuz emir: Don\'t + fiil.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'turn left', sag: 'sola dön'),
                (sol: 'turn right', sag: 'sağa dön'),
                (sol: 'go straight on', sag: 'dümdüz git'),
                (sol: 'cross the road', sag: 'yolu geç'),
                (sol: 'stop', sag: 'dur'),
              ],
              aciklama: 'Yol tarifinde sık kullanılan emir cümleleri.',
            ),
            Sirala(
              soru: 'Sıraya diz: Sağdan ilk sokağa gir.',
              kelimeler: [
                'the',
                'Take',
                'on',
                'first',
                'right',
                'street',
                'the',
              ],
              dogru: ['Take', 'the', 'first', 'street', 'on', 'the', 'right'],
              aciklama:
                  'Take the first street on the right: sağdaki ilk sokağa girmek.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Sola dön.',
              cevaplar: [
                'Turn left.',
                'Turn left',
                'Turn to the left.',
                'Turn to the left',
              ],
              aciklama: 'Emir cümlesinde özne yazılmaz.',
            ),
            Secim(
              soru:
                  '"How can I get to the station?" sorusuna uygun cevap hangisidir?',
              secenekler: [
                'I get to the station at six.',
                'Yes, it is a big station.',
                'Go straight on and turn left.',
              ],
              dogru: 2,
              aciklama: 'Yol sorusuna yol tarifi verilir.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Lütfen burada bekle.',
              cevaplar: [
                'Wait here, please.',
                'Please wait here.',
                'Wait here please.',
                'Please wait here',
              ],
              aciklama:
                  'Please emirleri nazik yapar; başa ya da sona gelebilir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'Turn right at the traffic lights.',
              secenekler: [
                'Turn left at the traffic lights.',
                'Turn right at the traffic lights.',
                'Turn right at the bus stop.',
              ],
              dogru: 1,
              aciklama:
                  'Right sağ, left sol demektir; traffic lights trafik ışıklarıdır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'Cross the road near the school.',
              secenekler: [
                'Cross the road near the school.',
                'Cross the road near the pool.',
                'Close the door near the school.',
              ],
              dogru: 0,
              aciklama:
                  'Cross geçmek, close kapatmak demektir; road yol, door kapıdır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-2.u5',
      ad: 'Planlar ve hava',
      dersler: [
        Ders(
          id: 'ingilizce-2.u5.d1',
          ad: 'Going to ve will',
          alistirmalar: [
            Secim(
              soru:
                  '"I\'m going to visit my aunt tomorrow." Bu cümle ne anlatır?',
              secenekler: [
                'Yarın için bir plan',
                'Geçmişte olmuş bir olay',
                'Her günkü alışkanlık',
              ],
              dogru: 0,
              aciklama: 'Be going to önceden yapılmış planı anlatır.',
            ),
            Isaretle(
              soru: 'Be going to yapısındaki be fiilini işaretle.',
              cumle: 'They are going to travel by train.',
              dogru: [1],
              aciklama:
                  'Be going to yapısında be fiili özneye göre değişir: they are.',
            ),
            Bosluk(
              soru: 'Look at those black clouds! It ___ rain.',
              secenekler: ['goes to', 'is going to', 'went to'],
              dogru: 1,
              aciklama:
                  'Şimdiki kanıta dayanan tahminde be going to kullanılır.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Yarın erken kalkmayacağım.',
              cevaplar: [
                'I\'m not going to get up early tomorrow.',
                'I am not going to get up early tomorrow.',
                'I won\'t get up early tomorrow.',
                'I will not get up early tomorrow.',
              ],
              aciklama: 'Gelecek için: be not going to ya da will not.',
            ),
            Sirala(
              soru: 'Sıraya diz: Bu hafta sonu ne yapacaksın?',
              kelimeler: [
                'do',
                'you',
                'What',
                'going',
                'are',
                'to',
                'this',
                'weekend',
              ],
              dogru: [
                'What',
                'are',
                'you',
                'going',
                'to',
                'do',
                'this',
                'weekend',
              ],
              aciklama: 'Soru yapısı: What + are + özne + going to + fiil?',
            ),
            Bosluk(
              soru: 'The phone is ringing. I ___ answer it.',
              secenekler: ['will', 'to', 'am'],
              dogru: 0,
              aciklama: 'Konuşma anında verilen karar will ile söylenir.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'tomorrow', sag: 'yarın'),
                (sol: 'next week', sag: 'gelecek hafta'),
                (sol: 'tonight', sag: 'bu akşam'),
                (sol: 'next year', sag: 'gelecek yıl'),
                (sol: 'soon', sag: 'yakında'),
              ],
              aciklama: 'Bunlar gelecek zaman ifadeleridir.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'She will goes to Paris.',
                'She will go to Paris.',
                'She will to go to Paris.',
              ],
              dogru: 1,
              aciklama: 'Will\'den sonra fiilin yalın hali gelir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'I\'m going to study tonight.',
              secenekler: [
                'I\'m going to study tonight.',
                'I\'m going to study tomorrow.',
                'I\'m not going to study tonight.',
              ],
              dogru: 0,
              aciklama:
                  'Tonight bu akşam, tomorrow yarın demektir; cümlede "not" yoktur.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'They are going to buy a new car.',
              secenekler: [
                'They are going to buy a new car.',
                'They are going to buy a new bag.',
                'They are going to sell a new car.',
              ],
              dogru: 0,
              aciklama:
                  'Buy satın almak, sell satmak demektir; car araba, bag çantadır.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-2.u5.d2',
          ad: 'Hava durumu ve yakın plan',
          alistirmalar: [
            Secim(
              soru: '"It\'s sunny." ne demektir?',
              secenekler: ['Hava güneşli.', 'Hava yağmurlu.', 'Hava soğuk.'],
              dogru: 0,
              aciklama: 'Sunny güneşli demektir.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'sunny', sag: 'güneşli'),
                (sol: 'rainy', sag: 'yağmurlu'),
                (sol: 'windy', sag: 'rüzgârlı'),
                (sol: 'cloudy', sag: 'bulutlu'),
                (sol: 'snowy', sag: 'karlı'),
              ],
              aciklama: 'Hava durumunu anlatan sıfatlar.',
            ),
            Bosluk(
              soru: 'I ___ my friends at the cinema tonight.',
              secenekler: ['met', 'am meeting', 'meeting'],
              dogru: 1,
              aciklama:
                  'Kesinleşmiş plan için present continuous kullanılır: am meeting.',
            ),
            Bosluk(
              soru: 'What\'s the weather ___ in Ankara?',
              secenekler: ['like', 'likes', 'liking'],
              dogru: 0,
              aciklama: 'Hava nasıl? sorusu: What\'s the weather like?',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Bu akşam arkadaşlarımla buluşuyorum.',
              cevaplar: [
                'I\'m meeting my friends this evening.',
                'I am meeting my friends this evening.',
                'I\'m meeting my friends tonight.',
                'I am meeting my friends tonight.',
              ],
              aciklama: 'Kesin plan için present continuous: I\'m meeting.',
            ),
            Sirala(
              soru: 'Sıraya diz: Yarın hava güneşli olacak.',
              kelimeler: ['be', 'sunny', 'going', 'is', 'It', 'to', 'tomorrow'],
              dogru: ['It', 'is', 'going', 'to', 'be', 'sunny', 'tomorrow'],
              aciklama: 'Hava tahmininde be going to be kullanılır.',
            ),
            Secim(
              soru: '"We\'re flying to London on Friday." Bu cümle ne anlatır?',
              secenekler: [
                'Cuma günü Londra\'ya uçma planı',
                'Geçen Cuma Londra\'ya uçtuk',
                'Her Cuma Londra\'ya uçarız',
              ],
              dogru: 0,
              aciklama:
                  'Present continuous yakın gelecekteki planı anlatabilir.',
            ),
            Bosluk(
              soru: 'It is raining. Take your ___ with you.',
              secenekler: ['sunglasses', 'umbrella', 'sandals'],
              dogru: 1,
              aciklama: 'Yağmurda şemsiye (umbrella) alınır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'It is raining in London today.',
              secenekler: [
                'It is raining in London today.',
                'It is snowing in London today.',
                'It is raining in Lyon today.',
              ],
              dogru: 0,
              aciklama:
                  'Raining yağmur yağıyor, snowing kar yağıyor demektir; London Londra, Lyon Lyon\'dur.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'We are leaving at nine tomorrow.',
              secenekler: [
                'We are leaving at nine tomorrow.',
                'We are leaving at five tomorrow.',
                'We are leaving at nine tonight.',
              ],
              dogru: 0,
              aciklama:
                  'Nine dokuz, five beş demektir; tomorrow yarın, tonight bu akşamdır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'ingilizce-2.u6',
      ad: 'Sağlık ve duygular',
      dersler: [
        Ders(
          id: 'ingilizce-2.u6.d1',
          ad: 'Sağlık ve should',
          alistirmalar: [
            Secim(
              soru: '"Headache" ne demektir?',
              secenekler: ['Mide ağrısı', 'Baş ağrısı', 'Diş ağrısı'],
              dogru: 1,
              aciklama: 'Head baş, ache ağrı demektir.',
            ),
            Bosluk(
              soru: 'You look tired. You ___ go to bed early.',
              secenekler: ['should', 'are', 'does'],
              dogru: 0,
              aciklama: 'Tavsiye vermek için should kullanılır.',
            ),
            Bosluk(
              soru: 'I have a cold. I ___ stay at home.',
              secenekler: ['shouldn\'t', 'to', 'should'],
              dogru: 2,
              aciklama:
                  'Soğuk algınlığında evde kalmak mantıklı tavsiyedir: should.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Doktora gitmelisin.',
              cevaplar: [
                'You should see a doctor.',
                'You should go to the doctor.',
                'You should visit a doctor.',
                'You should go to a doctor.',
                'You should see the doctor.',
              ],
              aciklama: 'Tavsiye: should + fiilin yalın hali.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'head', sag: 'baş'),
                (sol: 'stomach', sag: 'mide'),
                (sol: 'throat', sag: 'boğaz'),
                (sol: 'back', sag: 'sırt'),
                (sol: 'tooth', sag: 'diş'),
              ],
              aciklama: 'Vücut bölümlerinin adları.',
            ),
            Sirala(
              soru: 'Sıraya diz: Daha çok su içmelisin.',
              kelimeler: ['drink', 'You', 'water', 'more', 'should'],
              dogru: ['You', 'should', 'drink', 'more', 'water'],
              aciklama: 'Should\'dan sonra yalın fiil gelir: should drink.',
            ),
            Secim(
              soru: '"I have a toothache." İçin en iyi tavsiye hangisidir?',
              secenekler: [
                'You should see a vet.',
                'You should see a dentist.',
                'You should see a baker.',
              ],
              dogru: 1,
              aciklama: 'Toothache diş ağrısıdır; dişçiye (dentist) gidilir.',
            ),
            Bosluk(
              soru: 'You ___ smoke here. It\'s bad for your health.',
              secenekler: ['should', 'shouldn\'t', 'ought'],
              dogru: 1,
              aciklama: 'Yapılmaması gereken şey için shouldn\'t kullanılır.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'You should rest for a few days.',
              secenekler: [
                'You should rest for a few days.',
                'You shouldn\'t rest for a few days.',
                'You should wash for a few days.',
              ],
              dogru: 0,
              aciklama:
                  'Rest dinlenmek, wash yıkamak demektir; cümlede olumsuzluk yoktur.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'I have a sore throat.',
              secenekler: [
                'I have a sore throat.',
                'I have a sore thumb.',
                'I had a sore throat.',
              ],
              dogru: 0,
              aciklama:
                  'Throat boğaz, thumb başparmak demektir; have şimdiki, had geçmiş zamandır.',
            ),
          ],
        ),
        Ders(
          id: 'ingilizce-2.u6.d2',
          ad: 'Zorunluluk, karşılaştırma ve duygular',
          alistirmalar: [
            Secim(
              soru: '"Excited" ne demektir?',
              secenekler: ['Heyecanlı', 'Yorgun', 'Üzgün'],
              dogru: 0,
              aciklama:
                  'Excited heyecanlı demektir. Tired yorgun, sad üzgündür.',
            ),
            Bosluk(
              soru:
                  'Children ___ go to school until sixteen in many countries.',
              secenekler: ['has to', 'have to', 'having to'],
              dogru: 1,
              aciklama: 'Çoğul özneyle have to kullanılır: zorunluluk.',
            ),
            Bosluk(
              soru: 'She ___ wear a uniform at work.',
              secenekler: ['have to', 'to', 'has to'],
              dogru: 2,
              aciklama: 'She ile has to kullanılır.',
            ),
            Bosluk(
              soru: 'An elephant is ___ than a dog.',
              secenekler: ['bigger', 'biggest', 'more big'],
              dogru: 0,
              aciklama:
                  'Kısa sıfatlarda karşılaştırma -er ile yapılır; big sessiz ikilenir: bigger.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'big', sag: 'bigger'),
                (sol: 'good', sag: 'better'),
                (sol: 'bad', sag: 'worse'),
                (sol: 'happy', sag: 'happier'),
                (sol: 'expensive', sag: 'more expensive'),
              ],
              aciklama:
                  'Kısa sıfatlara -er, uzunlara more gelir; good ve bad düzensizdir.',
            ),
            Sirala(
              soru: 'Sıraya diz: Kardeşim benden daha uzun.',
              kelimeler: ['taller', 'My', 'is', 'brother', 'than', 'me'],
              dogru: ['My', 'brother', 'is', 'taller', 'than', 'me'],
              aciklama: 'Karşılaştırmada sıfat + er + than kullanılır.',
            ),
            Yaz(
              soru: 'İngilizceye çevir: Yarın erken kalkmak zorundayım.',
              cevaplar: [
                'I have to get up early tomorrow.',
                'I have got to get up early tomorrow.',
                'I\'ve got to get up early tomorrow.',
              ],
              aciklama: 'Zorunluluk: have to + yalın fiil.',
            ),
            Secim(
              soru: 'Hangi cümle doğrudur?',
              secenekler: [
                'Today is more hot than yesterday.',
                'Today is hotter than yesterday.',
                'Today is hot than yesterday.',
              ],
              dogru: 1,
              aciklama: 'Hot kısa sıfattır; hotter olur.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'I don\'t have to work on Sundays.',
              secenekler: [
                'I don\'t have to work on Sundays.',
                'I don\'t want to work on Sundays.',
                'I have to work on Sundays.',
              ],
              dogru: 0,
              aciklama:
                  'Don\'t have to zorunlu değil demektir; want istemek, have to zorundayım demektir.',
            ),
            Dinle(
              soru: 'Dinle ve duyduğun cümleyi seç.',
              okunacak: 'This phone is cheaper than that one.',
              secenekler: [
                'This phone is cheaper than that one.',
                'This phone is cleaner than that one.',
                'That phone is cheaper than this one.',
              ],
              dogru: 0,
              aciklama:
                  'Cheaper daha ucuz, cleaner daha temiz demektir; this/that cümlenin öznesini değiştirir.',
            ),
          ],
        ),
      ],
    ),
  ],
);
