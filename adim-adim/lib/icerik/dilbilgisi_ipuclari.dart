/// Dilbilgisi ipuçları (sabit içerik): İngilizce A1 (14), A2, B1, B2 (12'şer)
/// ve Almanca A1 (11) kurslarının derslerine bağlı kısa ipuçları. Her ipucu,
/// bağlı dersin konusuyla tutarlıdır. Yalnızca kesin, yaygın dilbilgisi
/// kuralları yazıldı; istisnalı konularda "genellikle" denir. İpucu olmayan
/// kurslarda kart gösterilmez.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dalga3], genişletme [Claude#dalga4]
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
];
