/// Dilbilgisi ipuçları (sabit içerik): İngilizce A1'in 14 dersi için birer kısa
/// ipucu. Her ipucu, bağlı dersin içeriğiyle tutarlıdır (ünite rehberindeki
/// "Dilbilgisi notları" ile aynı konular). Yalnızca kesin, yaygın dilbilgisi
/// kuralları yazıldı. Diğer seviyeler için ipucu eklenene kadar o kurslarda
/// kart gösterilmez.
/// Sahibi: Yusuf (yusufbesir). Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// yazan: [Claude#dalga3]
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
];
