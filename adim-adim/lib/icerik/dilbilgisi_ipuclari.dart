/// Dilbilgisi ipuçları (sabit içerik): İngilizce A1 (14), A2, B1, B2, C1 (12'şer)
/// ve Almanca A1 (11), A2 (11), B1 (12) kurslarının derslerine bağlı kısa ipuçları. Her ipucu,
/// bağlı dersin konusuyla tutarlıdır. Yalnızca kesin, yaygın dilbilgisi
/// kuralları yazıldı; istisnalı konularda "genellikle" denir. İpucu olmayan
/// kurslarda kart gösterilmez.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dalga3], genişletme [Claude#dalga4], Almanca A2/B1 ve İngilizce C1 [Claude#dalga10]
library;

import '../model/dilbilgisi_ipucu.dart';

/// Tüm ipuçları (sıra: kurs, ünite, ders).
const List<DilbilgisiIpucu> tumDilbilgisiIpuclari = [
  DilbilgisiIpucu(
    dersId: 'ingilizce-1.u1.d1',
    baslik: 'Günün saatine göre selamlama',
    metin:
        'Sabah "Good morning", öğleden sonra "Good afternoon", akşam '
        '"Good evening" denir. "Good night" yalnızca veda ederken ya da '
        'yatmadan önce söylenir.',
    ornek: 'Good morning, Ali!',
    ornekCeviri: 'Günaydın, Ali!',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-1.u1.d2',
    baslik: 'Be fiili (am, is, are)',
    metin:
        'Be fiili özneye göre değişir: I am, you are, he/she/it is, we are, '
        'they are. Kısaltmalar: I\'m, you\'re, she\'s.',
    ornek: 'She is from Spain.',
    ornekCeviri: 'O İspanyalı (İspanya\'dan).',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-1.u2.d1',
    baslik: 'Sayıdan sonra çoğul isim',
    metin:
        'Sayı birden büyükse isim çoğul olur: one cat (tek), three cats '
        '(çoğul). 13-19 arası sayılar -teen, onluklar -ty ile biter: '
        'thirteen, thirty.',
    ornek: 'I have three cats.',
    ornekCeviri: 'Üç kedim var.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-1.u2.d2',
    baslik: 'Sıfat isimden önce gelir',
    metin:
        'İngilizcede renk gibi sıfatlar isimden önce gelir ve çoğul olmaz: '
        'a red car, two red cars.',
    ornek: 'The car is blue.',
    ornekCeviri: 'Araba mavi.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-1.u3.d1',
    baslik: 'Sahiplik sıfatları',
    metin:
        'Sahiplik için my, your, his, her, our, their kullanılır ve '
        'isimden önce gelir: my mother, her name. Kişi adında \'s eki '
        'sahipliği gösterir: Ali\'s sister (Ali\'nin kız kardeşi).',
    ornek: 'This is my sister.',
    ornekCeviri: 'Bu benim kız kardeşim.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-1.u3.d2',
    baslik: 'There is / there are ve yer edatları',
    metin:
        'Tek bir şey için "There is", birden çok şey için "There are" '
        'kullanılır. Yer bildiren edatlar: in (içinde), on (üstünde), '
        'under (altında).',
    ornek: 'There is a table in the kitchen.',
    ornekCeviri: 'Mutfakta bir masa var.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-1.u4.d1',
    baslik: 'Olumsuz cümle: don\'t',
    metin:
        'I, you, we, they öznelerinde olumsuz cümle "don\'t" (do not) ile '
        'kurulur ve fiil yalın kalır: I don\'t like fish.',
    ornek: 'I don\'t like fish.',
    ornekCeviri: 'Balığı sevmem.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-1.u4.d2',
    baslik: 'Nazik rica: Can I have / I would like',
    metin:
        'Sipariş verirken "Can I have ...?" ve "I would like ..." nazik '
        'kalıplardır. "I want ..." daha doğrudan bir anlatım olduğundan '
        'restoranda genellikle tercih edilmez.',
    ornek: 'I would like a tea, please.',
    ornekCeviri: 'Bir çay rica ediyorum.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-1.u5.d1',
    baslik: 'Geniş zaman: he/she/it ile -s',
    metin:
        'Geniş zamanda he, she, it öznelerinde fiile -s ya da -es eklenir: '
        'she works, he watches. I, you, we, they ile fiil yalın kalır.',
    ornek: 'She wakes up at seven.',
    ornekCeviri: 'O saat yedide kalkar.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-1.u5.d2',
    baslik: 'Saati söylemek',
    metin:
        'Tam saat için o\'clock: it\'s three o\'clock. Buçuk için "half '
        'past", çeyrek geçe için "quarter past" kullanılır: half past six '
        '(6:30), quarter past two (2:15).',
    ornek: 'It is half past six.',
    ornekCeviri: 'Saat altı buçuk.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-1.u5.d3',
    baslik: 'Günlerde "on", saatte "at"',
    metin:
        'Gün adlarının önünde "on" kullanılır: on Monday. Saat için "at" '
        'kullanılır: at ten o\'clock. Gün adları her zaman büyük harfle '
        'yazılır.',
    ornek: 'See you on Friday.',
    ornekCeviri: 'Cuma günü görüşürüz.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-1.u6.d1',
    baslik: 'Hava durumunda "It is"',
    metin:
        'Hava durumunu anlatırken özne olarak "it" kullanılır: it is sunny, '
        'it is cold. Şu an yağıyorsa "It is raining" denir.',
    ornek: 'It is cloudy and windy.',
    ornekCeviri: 'Hava bulutlu ve rüzgârlı.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-1.u6.d2',
    baslik: 'Yol tarifi: emir kipi',
    metin:
        'Yol tarif ederken fiilin yalın hâli kullanılır: Turn right, go '
        'straight. Konum için next to (yanında), opposite (karşısında), '
        'between (arasında) söylenir.',
    ornek: 'Turn right and walk two minutes.',
    ornekCeviri: 'Sağa dön ve iki dakika yürü.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-1.u6.d3',
    baslik: 'Fiyat sorma: How much',
    metin:
        'Fiyat sormak için "How much is it?" (tek şey) ya da "How much are '
        'they?" (birden çok şey) denir. Kartla ödemede "by card" ya da '
        '"with a card" söylenir.',
    ornek: 'How much is this?',
    ornekCeviri: 'Bu ne kadar?',
  ),
  // ---- İngilizce A2 (ingilizce-2) ----
  DilbilgisiIpucu(
    dersId: 'ingilizce-2.u1.d1',
    baslik: 'Saat: past ve to',
    metin:
        'Saatin yarısına kadar "past" (geçe), yarıdan sonra "to" (var) '
        'kullanılır: ten past seven (7:10), twenty to eight (7:40). '
        '"Quarter" çeyrek demektir.',
    ornek: 'It\'s quarter to nine.',
    ornekCeviri: 'Dokuza çeyrek var (8:45).',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-2.u1.d2',
    baslik: 'Sıklık zarfları',
    metin:
        'always, usually, often, sometimes, never gibi zarflar genellikle ana '
        'fiilden önce, be fiilinden sonra gelir: I usually walk; she is '
        'always late.',
    ornek: 'I usually walk to work.',
    ornekCeviri: 'Genellikle işe yürüyerek giderim.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-2.u2.d1',
    baslik: 'Düzenli fiillerde geçmiş zaman',
    metin:
        'Düzenli fiillerin geçmişi -ed ile kurulur: work - worked. -e ile '
        'biten fiile yalnız -d eklenir (live - lived); ünsüz + y ile '
        'bitenlerde y düşer, -ied gelir (study - studied).',
    ornek: 'She studied English last year.',
    ornekCeviri: 'Geçen yıl İngilizce çalıştı.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-2.u2.d2',
    baslik: 'Geçmişte olumsuz ve soru: did',
    metin:
        'Olumsuz ve soru cümlelerinde "did" kullanılır ve ana fiil yalın '
        'kalır: She didn\'t go. Did she go? Düzensiz fiillerin geçmiş '
        'biçimleri ezberlenir: go - went, see - saw, have - had.',
    ornek: 'Did you see the film?',
    ornekCeviri: 'Filmi gördün mü?',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-2.u3.d1',
    baslik: 'Some ve any',
    metin:
        'Sayılabilen isimler çoğul olabilir (apple - apples), sayılamayanlar '
        'olamaz (milk, rice, water). Olumlu cümlede genellikle "some", '
        'olumsuz ve soru cümlesinde "any" kullanılır.',
    ornek: 'We don\'t have any milk.',
    ornekCeviri: 'Hiç sütümüz yok.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-2.u3.d2',
    baslik: 'How much ve how many',
    metin:
        'Sayılamayan isimlerde "How much", sayılabilen çoğul isimlerde '
        '"How many" kullanılır: How much water? How many eggs?',
    ornek: 'How many eggs do we need?',
    ornekCeviri: 'Kaç yumurtaya ihtiyacımız var?',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-2.u4.d1',
    baslik: 'Yer edatları',
    metin:
        'Konum için: next to (yanında), behind (arkasında), in front of '
        '(önünde), between (arasında). Tek şey için "There is", çoğul için '
        '"There are" kullanılır.',
    ornek: 'The bank is next to the school.',
    ornekCeviri: 'Banka okulun yanında.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-2.u4.d2',
    baslik: 'Emir kipi ile yol tarifi',
    metin:
        'Emir cümlesi fiilin yalın hâliyle kurulur: Go straight, turn left. '
        'Olumsuzu "Don\'t" ile yapılır: Don\'t turn right.',
    ornek: 'Take the second street on the right.',
    ornekCeviri: 'Sağdaki ikinci sokağa gir.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-2.u5.d1',
    baslik: 'Going to ve will',
    metin:
        'Önceden verilmiş plan için "be going to", konuşma anında verilen '
        'karar ya da söz için "will" kullanılır; ikisinden sonra fiil '
        'yalın kalır.',
    ornek: 'I\'m going to buy a new phone.',
    ornekCeviri: 'Yeni bir telefon alacağım (planım).',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-2.u5.d2',
    baslik: 'Yakın plan: present continuous',
    metin:
        'Kesinleşmiş yakın plan present continuous ile anlatılabilir ve '
        'genellikle bir zaman ifadesi taşır. Hava tahmini için "be going '
        'to be" kullanılır: It is going to be sunny.',
    ornek: 'We\'re flying to London on Friday.',
    ornekCeviri: 'Cuma günü Londra\'ya uçuyoruz.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-2.u6.d1',
    baslik: 'Öneri: should',
    metin:
        '"Should" öğüt verir ve tüm öznelerle aynı kalır; arkasından fiil '
        'yalın gelir. Olumsuzu: shouldn\'t.',
    ornek: 'You should drink more water.',
    ornekCeviri: 'Daha çok su içmelisin.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-2.u6.d2',
    baslik: 'Have to ve karşılaştırma',
    metin:
        'Zorunlulukta he/she/it ile "has to" kullanılır; "don\'t have to" '
        '"zorunda değil" demektir. Karşılaştırmada kısa sıfata -er + than '
        '(taller than), uzun sıfata more + sıfat gelir (more expensive).',
    ornek: 'She has to wear a uniform at work.',
    ornekCeviri: 'İşte üniforma giymek zorunda.',
  ),
  // ---- İngilizce B1 (ingilizce-3) ----
  DilbilgisiIpucu(
    dersId: 'ingilizce-3.u1.d1',
    baslik: 'Present perfect ve past simple',
    metin:
        'Present perfect (have/has + 3. hâl) zamanı belirtilmeden geçmişi ya '
        'da şimdiyle bağlantılı geçmişi anlatır. Belirli geçmiş zaman '
        'ifadesi (yesterday, in 2019) varsa past simple kullanılır.',
    ornek: 'I have lost my keys.',
    ornekCeviri: 'Anahtarlarımı kaybettim (hâlâ yoklar).',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-3.u1.d2',
    baslik: 'For ve since',
    metin:
        '"For" süreyi (for ten years), "since" başlangıç noktasını (since '
        '2019) bildirir. İkisi de present perfect ile sık kullanılır.',
    ornek: 'I have worked here since 2019.',
    ornekCeviri: '2019\'dan beri burada çalışıyorum.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-3.u2.d1',
    baslik: 'Present perfect continuous',
    metin:
        '"Have/has been + fiil-ing" şimdiye kadar süren ya da yeni biten '
        'eylemi, süreye vurgu yaparak anlatır.',
    ornek: 'I have been waiting for an hour.',
    ornekCeviri: 'Bir saattir bekliyorum.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-3.u2.d2',
    baslik: 'Ever, never, yet, already',
    metin:
        '"Ever" sorularda "hiç" anlamındadır; "never" olumsuz anlamlıdır, '
        'fiil olumlu kalır. "Yet" olumsuz ve soruda cümle sonuna gelir; '
        '"already" olumlu cümlede genellikle have ile 3. hâl arasındadır.',
    ornek: 'I haven\'t finished yet.',
    ornekCeviri: 'Henüz bitirmedim.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-3.u3.d1',
    baslik: 'Edilgen çatı: şimdiki zaman',
    metin:
        'Geniş zamanda edilgen yapı "am/is/are + 3. hâl" ile kurulur. '
        'Kimin yaptığı önemli değilse ya da bilinmiyorsa kullanılır.',
    ornek: 'English is spoken in many countries.',
    ornekCeviri: 'Birçok ülkede İngilizce konuşulur.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-3.u3.d2',
    baslik: 'Edilgen çatı: geçmiş zaman',
    metin:
        'Geçmişte edilgen yapı "was/were + 3. hâl" ile kurulur. Eylemi '
        'yapan belirtilecekse "by" kullanılır.',
    ornek: 'The window was broken by a ball.',
    ornekCeviri: 'Pencere bir top tarafından kırıldı.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-3.u4.d1',
    baslik: 'Birinci ve ikinci koşul',
    metin:
        'Birinci koşul gerçekleşmesi olası durumdur: If + geniş zaman, will '
        '+ fiil. İkinci koşul gerçek dışı ya da olası olmayan durumdur: If '
        '+ geçmiş zaman, would + fiil.',
    ornek: 'If it rains, we will stay at home.',
    ornekCeviri: 'Yağmur yağarsa evde kalırız.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-3.u4.d2',
    baslik: 'Karşıtlık ve neden bağlaçları',
    metin:
        '"Although" bir yan cümleyi başlatır ("-e rağmen"); "however" ise '
        'önceki cümleyle karşıtlık kurar ve ardından virgül gelir. '
        '"Because" neden, "so" sonuç bildirir.',
    ornek: 'Although it was cold, we went out.',
    ornekCeviri: 'Hava soğuk olmasına rağmen dışarı çıktık.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-3.u5.d1',
    baslik: 'Past continuous ve past simple',
    metin:
        'Uzun süren eylem past continuous (was/were + fiil-ing), onu kesen '
        'kısa eylem past simple ile anlatılır. Bağlayıcı olarak "when" ya '
        'da "while" kullanılır.',
    ornek: 'I was cooking when the phone rang.',
    ornekCeviri: 'Telefon çaldığında yemek pişiriyordum.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-3.u5.d2',
    baslik: 'Past perfect ve dolaylı anlatım',
    metin:
        'Past perfect (had + 3. hâl), geçmişteki başka bir olaydan önce '
        'olanı anlatır. Dolaylı anlatımda fiil genellikle bir adım geriye '
        'gider: "I am busy" - He said he was busy.',
    ornek: 'He said that he was busy.',
    ornekCeviri: 'Meşgul olduğunu söyledi.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-3.u6.d1',
    baslik: 'Çıkarım: must, might, can\'t',
    metin:
        'Güçlü olumlu çıkarım için "must", güçlü olumsuz çıkarım için '
        '"can\'t", belirsiz olasılık için "might" kullanılır. Çıkarımda '
        '"mustn\'t" kullanılmaz.',
    ornek: 'She must be at home; the lights are on.',
    ornekCeviri: 'Evde olmalı; ışıkları yanıyor.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-3.u6.d2',
    baslik: 'Niceleyiciler',
    metin:
        'Sayılabilenlerle many, a few, few; sayılamayanlarla much, a little, '
        'little kullanılır. "A few/a little" "biraz var", "few/little" '
        '"neredeyse hiç yok" anlamı taşır.',
    ornek: 'There are a few tickets left.',
    ornekCeviri: 'Birkaç bilet kaldı.',
  ),
  // ---- İngilizce B2 (ingilizce-4) ----
  DilbilgisiIpucu(
    dersId: 'ingilizce-4.u1.d1',
    baslik: 'Present perfect: simple ve continuous',
    metin:
        'Present perfect simple biten işin sonucuna ya da sayısına vurgu '
        'yapar (I\'ve written three reports); continuous ise sürece ve '
        'süreye vurgu yapar (I\'ve been writing reports all morning).',
    ornek: 'I have written three reports today.',
    ornekCeviri: 'Bugün üç rapor yazdım.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-4.u1.d2',
    baslik: 'Resmî dil ve isimleştirme',
    metin:
        'Resmî yazıda fiil yerine isim kullanmak yaygındır: decide - '
        'decision, develop - development. Kısaltmalar (don\'t) yerine tam '
        'biçimler tercih edilir.',
    ornek: 'The development of the new system took two years.',
    ornekCeviri: 'Yeni sistemin geliştirilmesi iki yıl sürdü.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-4.u2.d1',
    baslik: 'Modal fiillerle edilgen yapı',
    metin:
        'Modal edilgen yapı "modal + be + 3. hâl" ile kurulur; geçmiş için '
        '"modal + have been + 3. hâl" kullanılır.',
    ornek: 'The report must be finished by Monday.',
    ornekCeviri: 'Rapor Pazartesi\'ye kadar bitirilmeli.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-4.u2.d2',
    baslik: 'Aktarma fiilleri: deny, suggest, claim',
    metin:
        '"Deny" fiilinden sonra fiil-ing gelir. "Suggest" fiilinden sonra '
        'fiil-ing ya da that cümlesi gelir; "suggest to + fiil" '
        'kullanılmaz. "Claim" ardından to + fiil ya da that cümlesi alır.',
    ornek: 'The manager denied making a mistake.',
    ornekCeviri: 'Müdür hata yaptığını reddetti.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-4.u3.d1',
    baslik: 'Third conditional',
    metin:
        'Geçmişte gerçekleşmemiş durumlar için: If + past perfect, would '
        'have + 3. hâl. Hem koşul hem sonuç geçmiştedir ve gerçekleşmemiştir.',
    ornek: 'If I had left earlier, I would have caught the train.',
    ornekCeviri: 'Daha erken çıksaydım trene yetişirdim.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-4.u3.d2',
    baslik: 'Karışık koşul, wish ve if only',
    metin:
        'Karışık koşulda geçmişteki bir durum şimdiki sonucu etkiler: If I '
        'had studied, I would have a better job now. Pişmanlık için '
        '"wish/if only" kullanılır: şimdi için geçmiş zaman, geçmiş için '
        'past perfect.',
    ornek: 'I wish I had studied harder.',
    ornekCeviri: 'Keşke daha çok çalışsaydım.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-4.u4.d1',
    baslik: 'Vurgu için devrik yapı',
    metin:
        'Never, rarely, not only gibi olumsuz anlamlı ifadeler cümle '
        'başına gelince yardımcı fiil özneden önce gelir: Never have I '
        'seen ... / Rarely does he ...',
    ornek: 'Never have I seen such a beautiful view.',
    ornekCeviri: 'Hiç bu kadar güzel bir manzara görmedim.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-4.u4.d2',
    baslik: 'Cleft cümleler',
    metin:
        'Bir öğeyi vurgulamak için "It is/was ... that/who ..." ya da '
        '"What ... is ..." kalıbı kullanılır.',
    ornek: 'What I need is a long holiday.',
    ornekCeviri: 'İhtiyacım olan şey uzun bir tatil.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-4.u5.d1',
    baslik: 'Defining ve non-defining ilgi cümleleri',
    metin:
        'Defining cümlecik gerekli bilgi verir, virgülsüzdür ve that '
        'kullanılabilir. Non-defining cümlecik ek bilgi verir, virgülle '
        'ayrılır ve that kullanılmaz (who, which).',
    ornek: 'My brother, who lives in Rome, is a doctor.',
    ornekCeviri: 'Roma\'da yaşayan kardeşim doktordur.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-4.u5.d2',
    baslik: 'Participle cümlecikleri',
    metin:
        'Fiil-ing eş zamanlı ya da ardışık etken eylemi, 3. hâl edilgen '
        'anlamı, "having + 3. hâl" ise daha önce bitmiş eylemi anlatır. '
        'Cümleciğin öznesi ana cümlenin öznesidir.',
    ornek: 'Having finished his work, he went home.',
    ornekCeviri: 'İşini bitirince eve gitti.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-4.u6.d1',
    baslik: 'Future perfect ve future continuous',
    metin:
        'Future perfect (will have + 3. hâl) belirli bir zamana kadar '
        'tamamlanmış olacak eylemi, future continuous (will be + '
        'fiil-ing) gelecekte o anda sürmekte olacak eylemi anlatır.',
    ornek: 'By next June, I will have finished my degree.',
    ornekCeviri: 'Gelecek Haziran\'a kadar diplomamı bitirmiş olacağım.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-4.u6.d2',
    baslik: 'Tahmin kalıpları ve phrasal verb',
    metin:
        '"Be likely/unlikely/bound/sure to + fiil" tahmin bildirir. '
        'Ayrılabilen phrasal verb\'lerde zamir araya girer: turn it on '
        '("turn on it" denmez).',
    ornek: 'She is likely to win the prize.',
    ornekCeviri: 'Ödülü kazanması muhtemel.',
  ),
  // ---- İngilizce C1 (ingilizce-5) ----
  DilbilgisiIpucu(
    dersId: 'ingilizce-5.u1.d1',
    baslik: 'Future perfect ve future continuous',
    metin:
        'Will be + -ing gelecekteki bir anda süren eylemi, will have + V3 ise gelecekteki bir andan önce tamamlanmış olacak eylemi anlatır. Zaman bağlacından sonra şimdiki zaman kullanılır.',
    ornek: 'By Friday, I will have finished the report.',
    ornekCeviri: 'Cumaya kadar raporu bitirmiş olacağım.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-5.u1.d2',
    baslik: 'Olumsuz zarflarla devrik yapı',
    metin:
        'Never, rarely, hardly, not only gibi ifadeler cümle başına gelince yardımcı fiil özneden önce gelir; yardımcı fiil yoksa do / did eklenir.',
    ornek: 'Never have I seen such a beautiful view.',
    ornekCeviri: 'Hiç bu kadar güzel bir manzara görmemiştim.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-5.u1.d3',
    baslik: 'Cleft cümleler',
    metin:
        'It was ... who / that ... ve What ... is / was ... kalıpları cümlenin bir öğesini vurgular. Kişiler için who ya da that kullanılır; which kullanılmaz.',
    ornek: 'What I need is a long holiday.',
    ornekCeviri: 'İhtiyacım olan şey uzun bir tatil.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-5.u1.d4',
    baslik: 'Karışık ve devrik koşul',
    metin:
        'Resmî yazıda if atılır: Had I known (= If I had known), Should you need (= If you need), Were I you (= If I were you).',
    ornek: 'Had I known, I would have called you.',
    ornekCeviri: 'Bilseydim seni arardım.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-5.u2.d1',
    baslik: 'İsimleştirme',
    metin:
        'Akademik yazıda fiil ve sıfatlar isimleştirilir: introduce - introduction, improve - improvement, aware - awareness. "The" ya da "a" sonrasında isim gelir.',
    ornek: 'The introduction of new rules reduced costs.',
    ornekCeviri: 'Yeni kuralların getirilmesi maliyetleri düşürdü.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-5.u2.d2',
    baslik: 'Söylem işaretleri ve despite',
    metin:
        'However ve nevertheless gibi işaretlerden önce nokta ya da noktalı virgül, sonra virgül gelir. Despite / in spite of + isim alır; "despite of" denmez.',
    ornek: 'Despite the rain, we enjoyed the trip.',
    ornekCeviri: 'Yağmura rağmen gezinin tadını çıkardık.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-5.u2.d3',
    baslik: 'Hedging: hafifletme',
    metin:
        'Akademik yazıda prove yerine suggest, kesin ifadeler yerine may, tend to, to some extent gibi yumuşatıcılar kullanılır.',
    ornek: 'The results suggest that exercise may improve memory.',
    ornekCeviri:
        'Sonuçlar egzersizin belleği geliştirebileceğini düşündürüyor.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-5.u2.d4',
    baslik: 'Geçmişle ilgili çıkarım',
    metin:
        'Must have + V3 neredeyse kesin çıkarım, can\'t have + V3 imkânsızlık, might have + V3 olasılık bildirir. Imply konuşanın, infer dinleyenin işidir.',
    ornek: 'She must have left already.',
    ornekCeviri: 'Çoktan gitmiş olmalı.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-5.u3.d1',
    baslik: 'Eşdizim: make ve do',
    metin:
        'Eşdizimler ezberlenir: make a decision, make progress; do research, do damage; take a break, take a risk. Yağmur için heavy rain denir, strong rain denmez.',
    ornek: 'We need to make a decision.',
    ornekCeviri: 'Bir karar vermemiz gerekiyor.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-5.u3.d2',
    baslik: 'Ayrılabilen phrasal verb',
    metin:
        'Ayrılabilen phrasal verb\'lerde nesne zamirse fiil ile edat arasına girer: bring it up (bring up it denmez). Come across ve put up with ayrılmaz.',
    ornek: 'Let\'s bring it up at the meeting.',
    ornekCeviri: 'Bunu toplantıda gündeme getirelim.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-5.u3.d3',
    baslik: 'Deyimler sözcük sözcük çevrilmez',
    metin:
        'Deyimlerin anlamı sözcüklerin toplamından çıkmaz: once in a blue moon çok nadiren, under the weather keyifsiz demektir. Deyimi bütün olarak öğren.',
    ornek: 'It rains here once in a blue moon.',
    ornekCeviri: 'Burada çok nadiren yağmur yağar.',
  ),
  DilbilgisiIpucu(
    dersId: 'ingilizce-5.u3.d4',
    baslik: 'Wish ve if only',
    metin:
        'Şimdiki dilek için wish + past simple, geçmiş pişmanlık için wish + past perfect kullanılır. It\'s high time + özne + past simple da aynı mantıkla kurulur.',
    ornek: 'I wish I had listened to her advice.',
    ornekCeviri: 'Keşke onun tavsiyesini dinleseydim.',
  ),
  // ---- Almanca A1 (almanca-1) ----
  DilbilgisiIpucu(
    dersId: 'almanca-1.u1.d1',
    baslik: 'Resmî ve samimi selamlaşma',
    metin:
        '"Guten Morgen/Tag/Abend" nezaket biçimleridir; "Hallo" samimidir. '
        '"Gute Nacht" yalnızca yatmadan önce ya da veda ederken söylenir. '
        'Hitapta Herr (Bay) ve Frau (Bayan) kullanılır.',
    ornek: 'Guten Morgen, Herr Weber!',
    ornekCeviri: 'Günaydın, Bay Weber!',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-1.u1.d3',
    baslik: 'Sayılarda birler önce gelir',
    metin:
        '21-99 arası sayılarda önce birler, sonra onlar söylenir: '
        'einundzwanzig (21 = bir ve yirmi). Onluklar -zig ile biter; 30 '
        '"dreißig" olarak istisnadır.',
    ornek: 'Ich bin vierundzwanzig Jahre alt.',
    ornekCeviri: 'Yirmi dört yaşındayım.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-1.u2.d1',
    baslik: 'Sein fiili',
    metin:
        'sein çekimi: ich bin, du bist, er/sie/es ist, wir sind, ihr seid, '
        'sie/Sie sind. "Sie" büyük harfle yazılırsa resmî "siz" demektir.',
    ornek: 'Wir sind Freunde.',
    ornekCeviri: 'Biz arkadaşız.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-1.u2.d2',
    baslik: 'Haben fiili',
    metin:
        'haben çekimi: ich habe, du hast, er/sie/es hat, wir haben, ihr '
        'habt, sie/Sie haben. Yaş söylerken "haben" değil "sein" '
        'kullanılır: Ich bin 20 Jahre alt.',
    ornek: 'Du hast ein Buch.',
    ornekCeviri: 'Bir kitabın var.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-1.u2.d3',
    baslik: 'Soru cümlesi ve meslek',
    metin:
        'W-soru sözcüğünden (wie, wo, woher) sonra fiil ikinci sıradadır; '
        'evet/hayır sorusunda fiil başa gelir. Meslek bildirirken '
        'artikel kullanılmaz: Ich bin Lehrer.',
    ornek: 'Woher kommst du?',
    ornekCeviri: 'Nerelisin? (Nereden geliyorsun?)',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-1.u3.d1',
    baslik: 'Artikel: der, die, das',
    metin:
        'Her isim eril (der), dişil (die) ya da nötr (das) bir artikel '
        'alır; artikel isimle birlikte öğrenilmelidir. Çoğulda artikel '
        'daima "die" olur.',
    ornek: 'Der Tisch ist groß.',
    ornekCeviri: 'Masa büyük.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-1.u3.d2',
    baslik: 'Akkusativ: yalnız eril değişir',
    metin:
        'Cümlenin doğrudan nesnesi Akkusativ\'dedir. Bu hâlde yalnızca '
        'eril değişir: der - den, ein - einen, kein - keinen. Dişil, '
        'nötr ve çoğul aynı kalır.',
    ornek: 'Ich habe einen Bruder.',
    ornekCeviri: 'Bir erkek kardeşim var.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-1.u3.d3',
    baslik: 'Çoğul biçimleri',
    metin:
        'Almancada çoğul eki isme göre değişir (-e, -n, -er, ya da ünlüye '
        'ümlaut gelir): das Brot - die Brote, der Apfel - die Äpfel. '
        'Çoğul biçimi isimle birlikte öğrenilir.',
    ornek: 'Wir kaufen zwei Äpfel.',
    ornekCeviri: 'İki elma alıyoruz.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-1.u4.d1',
    baslik: 'Saat, gün ve ay edatları',
    metin:
        'Saat için "um", gün için "am", ay için "im" kullanılır: um acht '
        'Uhr, am Montag, im Januar. "Halb vier" dörde yarım var, yani 3:30 '
        'demektir.',
    ornek: 'Der Kurs beginnt am Montag um acht Uhr.',
    ornekCeviri: 'Kurs Pazartesi günü saat sekizde başlıyor.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-1.u4.d2',
    baslik: 'Fiil çekimi ve ayrılabilen fiiller',
    metin:
        'Düzenli fiil ekleri: ich -e, du -st, er/sie/es -t, wir -en, ihr '
        '-t, sie/Sie -en. Çekimli fiil ikinci sıradadır. Ayrılabilen '
        'fiillerde önek (auf, ein) cümle sonuna gider.',
    ornek: 'Ich stehe um sieben Uhr auf.',
    ornekCeviri: 'Saat yedide kalkarım.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-1.u4.d3',
    baslik: 'Modal fiiller: können, möchten',
    metin:
        'Modal fiil ikinci sırada çekimlenir, ana fiil mastar hâlinde '
        'cümle sonuna gider: Ich kann Deutsch sprechen. können: ich kann, '
        'du kannst, er kann.',
    ornek: 'Ich möchte einen Kaffee trinken.',
    ornekCeviri: 'Bir kahve içmek istiyorum.',
  ),
  // ---- Almanca A2 (almanca-2) ----
  DilbilgisiIpucu(
    dersId: 'almanca-2.u1.d1',
    baslik: 'Perfekt: haben + Partizip II',
    metin:
        'Perfekt, çekimli haben (ikinci sırada) ve Partizip II (cümle '
        'sonunda) ile kurulur. Düzenli fiillerde Partizip II: ge- + kök + '
        '-t (machen - gemacht).',
    ornek: 'Ich habe Fußball gespielt.',
    ornekCeviri: 'Futbol oynadım.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-2.u1.d2',
    baslik: 'Perfekt: sein ile',
    metin:
        'Yer değiştirme (gehen, fahren, kommen) ve durum değişikliği ya da '
        'kalma (bleiben, sein) bildiren fiiller Perfekt\'te genellikle '
        '"sein" alır. Çoğu diğer fiil "haben" alır.',
    ornek: 'Er ist nach Berlin gefahren.',
    ornekCeviri: 'Berlin\'e gitti (araçla).',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-2.u1.d3',
    baslik: 'Düzensiz fiillerde Partizip II',
    metin:
        'Düzensiz fiillerde Partizip II ge-...-en olur ve kök değişebilir '
        '(trinken - getrunken). Ayrılabilen fiillerde ge- ortaya girer '
        '(aufstehen - aufgestanden); be-, ver- ve -ieren fiillerinde ge- '
        'gelmez (besucht, telefoniert).',
    ornek: 'Wir haben Wasser getrunken.',
    ornekCeviri: 'Su içtik.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-2.u2.d1',
    baslik: 'Daima Dativ isteyen edatlar',
    metin:
        'aus, bei, mit, nach, seit, von, zu edatlarından sonra her zaman '
        'Dativ gelir. Dativ artikelleri: dem (eril/nötr), der (dişil), '
        'den + isme -n (çoğul).',
    ornek: 'Ich fahre mit dem Bus.',
    ornekCeviri: 'Otobüsle gidiyorum.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-2.u2.d2',
    baslik: 'Dativ zamirleri ve Dativ fiilleri',
    metin:
        'Dativ zamirleri: mir, dir, ihm, ihr, uns, euch, ihnen. helfen, '
        'gefallen, gehören, danken ve schmecken fiillerinden sonra Dativ '
        'gelir.',
    ornek: 'Das Buch gehört mir.',
    ornekCeviri: 'Bu kitap bana ait.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-2.u2.d3',
    baslik: 'Wechselpräpositionen: Wo? / Wohin?',
    metin:
        'in, an, auf, über, unter, vor, hinter, neben, zwischen edatlarından '
        'sonra yer (Wo?) bildirince Dativ, yön (Wohin?) bildirince '
        'Akkusativ gelir.',
    ornek: 'Ich gehe in die Küche.',
    ornekCeviri: 'Mutfağa gidiyorum.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-2.u3.d1',
    baslik: 'Modal fiiller: müssen, dürfen, sollen, wollen',
    metin:
        'Modal fiil ikinci sırada çekimlenir, ana fiil mastar hâlinde '
        'cümle sonuna gider. ich ve er/sie/es için çekimde ek yoktur: ich '
        'muss, er muss.',
    ornek: 'Ich muss heute arbeiten.',
    ornekCeviri: 'Bugün çalışmak zorundayım.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-2.u3.d2',
    baslik: 'Imperativ: emir kipi',
    metin:
        'du için kök kullanılır (Komm!), ihr için -t eklenir (Kommt!), Sie '
        'için fiil başa gelir (Kommen Sie!). Düzensiz örnekler: nehmen - '
        'Nimm!, sprechen - Sprich!, sein - Sei!',
    ornek: 'Komm bitte schnell!',
    ornekCeviri: 'Lütfen çabuk gel!',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-2.u3.d3',
    baslik: 'Yan cümle: weil, dass, wenn',
    metin:
        'weil, dass, wenn ve ob ile başlayan yan cümlede çekimli fiil '
        'cümlenin sonuna gider. Yan cümle virgülle ayrılır.',
    ornek: 'Ich bleibe zu Hause, weil ich krank bin.',
    ornekCeviri: 'Hasta olduğum için evde kalıyorum.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-2.u4.d1',
    baslik: 'Sıfat çekimi ve karşılaştırma',
    metin:
        'Belirsiz artikel (ein) sonrası sıfat çekilir: ein großer Mann '
        '(eril -er), eine kleine Wohnung (dişil -e), ein neues Auto '
        '(nötr -es). Karşılaştırma: schnell - schneller; "als" ile '
        'kıyaslanır.',
    ornek: 'Mein Bruder ist größer als ich.',
    ornekCeviri: 'Erkek kardeşim benden daha uzun.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-2.u4.d2',
    baslik: 'Refleksif fiiller ve war/hatte',
    metin:
        'Refleksif fiilde zamir özneye uyar: ich wasche mich, du wäschst '
        'dich, er wäscht sich, wir treffen uns. Präteritum: ich war/hatte, '
        'du warst/hattest, wir waren/hatten.',
    ornek: 'Gestern war ich sehr müde.',
    ornekCeviri: 'Dün çok yorgundum.',
  ),
  // ---- Almanca B1 (almanca-3) ----
  DilbilgisiIpucu(
    dersId: 'almanca-3.u1.d1',
    baslik: 'Präteritum: düzenli ve düzensiz',
    metin:
        'Düzenli fiiller -te alır (machen - machte); düzensiz fiillerde '
        'kök değişir (gehen - ging, sehen - sah). Präteritum daha çok '
        'yazıda ve hikâye anlatımında kullanılır.',
    ornek: 'Er ging nach Hause.',
    ornekCeviri: 'Eve gitti.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-3.u1.d2',
    baslik: 'Plusquamperfekt',
    metin:
        'Plusquamperfekt, hatte/war + Partizip II ile kurulur ve geçmişteki '
        'başka bir olaydan daha önce olanı anlatır. Konuşmada geçmiş için '
        'çoğunlukla Perfekt kullanılır.',
    ornek: 'Ich hatte schon gegessen, als er kam.',
    ornekCeviri: 'O geldiğinde ben zaten yemek yemiştim.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-3.u1.d3',
    baslik: 'Bağlaçlar ve fiilin sona gitmesi',
    metin:
        'obwohl (rağmen), während (iken), bevor (-meden önce), damit (diye) '
        've sodass (öyle ki) yan cümle kurar: çekimli fiil cümlenin '
        'sonuna gider ve yan cümle virgülle ayrılır.',
    ornek: 'Obwohl es regnet, gehen wir spazieren.',
    ornekCeviri: 'Yağmur yağmasına rağmen yürüyüşe çıkıyoruz.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-3.u2.d1',
    baslik: 'Relativsatz: der, die, das',
    metin:
        'İlgi zamirinin cinsi ve sayısı önceki isimden, hâli ise yan '
        'cümledeki görevinden gelir. Relativsatz virgülle ayrılır ve '
        'çekimli fiil sonda durur.',
    ornek: 'Der Mann, der dort steht, ist mein Lehrer.',
    ornekCeviri: 'Orada duran adam benim öğretmenim.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-3.u2.d2',
    baslik: 'Passiv: werden + Partizip II',
    metin:
        'Passiv, werden + Partizip II ile kurulur. Präsens: wird/werden '
        'gebaut; Präteritum: wurde/wurden gebaut. Yapan kişi von + Dativ '
        'ile belirtilir.',
    ornek: 'Das Haus wurde von einer Firma gebaut.',
    ornekCeviri: 'Ev bir firma tarafından inşa edildi.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-3.u2.d3',
    baslik: 'Konjunktiv II: dilek ve gerçek dışı',
    metin:
        'Gerçek dışı durum ve dilekler için wäre, hätte, könnte ya da '
        'würde + mastar kullanılır. Nezaket için de aynı biçimler '
        'kullanılır: Könnten Sie ...?',
    ornek: 'Wenn ich Zeit hätte, würde ich reisen.',
    ornekCeviri: 'Zamanım olsaydı seyahat ederdim.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-3.u3.d1',
    baslik: 'Belirli artikelden sonra sıfat sonu',
    metin:
        'Belirli artikelden sonra sıfat sonu çoğunlukla -en\'dir; yalnız '
        'Nominativ\'de ve dişil/nötr Akkusativ\'de -e olur (der gute '
        'Mann, die gute Frau). Dativ ve çoğulda hep -en.',
    ornek: 'Ich helfe der alten Frau.',
    ornekCeviri: 'Yaşlı kadına yardım ediyorum.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-3.u3.d2',
    baslik: 'Genitiv ve wegen, trotz',
    metin:
        'Genitiv sahiplik bildirir; eril ve nötr isme -(e)s eklenir: das '
        'Auto des Mannes. wegen (yüzünden), trotz (rağmen), während '
        '(süresince) ve statt (yerine) Genitiv ister.',
    ornek: 'Wegen des Wetters bleiben wir zu Hause.',
    ornekCeviri: 'Hava yüzünden evde kalıyoruz.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-3.u3.d3',
    baslik: 'Edatlı fiiller ve dolaylı soru',
    metin:
        'Bazı fiiller sabit edatla kullanılır: warten auf + Akkusativ. '
        'Cansız şeyler için da-/wo- kullanılır (darauf, worauf). '
        'Dolaylı soruda çekimli fiil sona gider.',
    ornek: 'Ich warte auf den Bus.',
    ornekCeviri: 'Otobüsü bekliyorum.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-3.u4.d1',
    baslik: 'Resmî ricada bitten um',
    metin:
        'Resmî yazıda "bitten um + Akkusativ" kalıbı ile rica edilir. '
        'Resmî hitapta Sie ve Ihnen büyük harfle yazılır.',
    ornek: 'Ich bitte um eine schnelle Antwort.',
    ornekCeviri: 'Hızlı bir yanıt rica ediyorum.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-3.u4.d2',
    baslik: 'Görüş bildirme: dass ve fiil sırası',
    metin:
        '"Ich finde, dass ..." yan cümlesinde çekimli fiil sona gider. '
        '"Meiner Meinung nach" ile başlayan cümlede ise fiil hemen '
        'ardından, ikinci sırada gelir.',
    ornek: 'Ich finde, dass Bildung sehr wichtig ist.',
    ornekCeviri: 'Bence eğitim çok önemli.',
  ),
  DilbilgisiIpucu(
    dersId: 'almanca-3.u4.d3',
    baslik: 'sich ärgern über + Akkusativ',
    metin:
        'Bazı refleksif fiiller sabit edat ister: sich ärgern über + '
        'Akkusativ (bir şeye kızmak). Zamir özneye uyar: ich ärgere mich, '
        'er ärgert sich.',
    ornek: 'Ich ärgere mich über den Lärm.',
    ornekCeviri: 'Gürültüye kızıyorum.',
  ),
];
