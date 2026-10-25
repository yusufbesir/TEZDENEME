/// Yarışma soru bankası: İngilizce C1 (ingilizce-5), 6 kategori x 6 soru = 36 soru.
/// Olgular 2026-10-25'te elle doğrulandı; şüpheli soru silinmez, aciklama'ya 'KONTROL' notu eklenir.
/// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım Windows sürümü#cihaz] Claude. Testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model.dart';

const List<YarismaSorusu> ingilizceC1Sorulari = [
  YarismaSorusu(
    id: 'ingilizce-5.genelKultur.1',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.genelKultur,
    soru:
        'Which body awards the Nobel Peace Prize?',
    secenekler: ['The Norwegian Nobel Committee', 'The United Nations Security Council', 'The Swedish Academy', 'The International Court of Justice'],
    dogru: 0,
    aciklama:
        'Nobel Barış Ödülü\'nü Norveç Nobel Komitesi verir; Edebiyat Ödülü\'nü İsveç Akademisi verir.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.genelKultur.2',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.genelKultur,
    soru:
        'Which agreement, signed in 1992, established the European Union?',
    secenekler: ['The Schengen Agreement', 'The Maastricht Treaty', 'The Treaty of Rome', 'The Treaty of Versailles'],
    dogru: 1,
    aciklama:
        'Avrupa Birliği, 1992\'de imzalanan Maastricht Antlaşması ile kuruldu.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.genelKultur.3',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.genelKultur,
    soru:
        'In economics, what does the term \'inflation\' describe?',
    secenekler: ['An increase in exports only', 'A decrease in interest rates', 'A general rise in prices over time', 'A fall in unemployment'],
    dogru: 2,
    aciklama:
        'Enflasyon, fiyatlar genel düzeyinin zaman içinde artmasıdır.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.genelKultur.4',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.genelKultur,
    soru:
        'In which city is the headquarters of the International Monetary Fund located?',
    secenekler: ['Geneva', 'London', 'Brussels', 'Washington, D.C.'],
    dogru: 3,
    aciklama:
        'IMF\'nin merkezi ABD\'nin başkenti Washington\'dadır.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.genelKultur.5',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.genelKultur,
    soru:
        'Which word describes a system of government controlled by a small group of powerful people?',
    secenekler: ['Oligarchy', 'Democracy', 'Monarchy', 'Anarchy'],
    dogru: 0,
    aciklama:
        'Oligarşi, yönetimin küçük bir güçlü grubun elinde olmasıdır.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.genelKultur.6',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.genelKultur,
    soru:
        'What is the main purpose of the World Trade Organization?',
    secenekler: ['To train military forces', 'To set rules for international trade', 'To fund space exploration', 'To control global food prices directly'],
    dogru: 1,
    aciklama:
        'Dünya Ticaret Örgütü (WTO) uluslararası ticaretin kurallarını belirler ve anlaşmazlıkları çözer.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.tarih.1',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.tarih,
    soru:
        'In which year was the Magna Carta sealed?',
    secenekler: ['1348', '1492', '1215', '1066'],
    dogru: 2,
    aciklama:
        'Magna Carta 1215\'te İngiltere Kralı John tarafından mühürlendi.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.tarih.2',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.tarih,
    soru:
        'Which event is traditionally seen as the immediate trigger of the First World War?',
    secenekler: ['The sinking of the Titanic', 'The Russian Revolution', 'The invasion of Poland', 'The assassination of Archduke Franz Ferdinand'],
    dogru: 3,
    aciklama:
        'Birinci Dünya Savaşı\'nı tetikleyen olay, 1914\'te Arşidük Franz Ferdinand\'ın suikastle öldürülmesidir.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.tarih.3',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.tarih,
    soru:
        'In which country did the Industrial Revolution begin?',
    secenekler: ['Great Britain', 'France', 'Germany', 'Spain'],
    dogru: 0,
    aciklama:
        'Sanayi Devrimi 18. yüzyılda Büyük Britanya\'da başladı.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.tarih.4',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.tarih,
    soru:
        'Which structure, torn down in 1989, symbolised the division of Europe during the Cold War?',
    secenekler: ['The Iron Gate', 'The Berlin Wall', 'The Great Wall', 'Hadrian\'s Wall'],
    dogru: 1,
    aciklama:
        'Berlin Duvarı 1989\'da yıkıldı ve Soğuk Savaş bölünmüşlüğünün simgesiydi.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.tarih.5',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.tarih,
    soru:
        'Who was the first woman to win a Nobel Prize?',
    secenekler: ['Florence Nightingale', 'Rosa Parks', 'Marie Curie', 'Mother Teresa'],
    dogru: 2,
    aciklama:
        'Marie Curie, 1903\'te Fizik Nobel Ödülü ile bu ödülü alan ilk kadındır.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.tarih.6',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.tarih,
    soru:
        'The Rosetta Stone helped scholars to decipher which ancient writing system?',
    secenekler: ['Cuneiform', 'Runic script', 'Linear B', 'Egyptian hieroglyphs'],
    dogru: 3,
    aciklama:
        'Rosetta Taşı, Mısır hiyerogliflerinin çözülmesinde anahtar rol oynadı.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.sanat.1',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.sanat,
    soru:
        'Who painted \'The Persistence of Memory\' with its melting clocks?',
    secenekler: ['Salvador Dalí', 'Pablo Picasso', 'Claude Monet', 'Henri Matisse'],
    dogru: 0,
    aciklama:
        'Belleğin Azmi tablosu Salvador Dalí\'nin eseridir.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.sanat.2',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.sanat,
    soru:
        'Which author wrote the novel \'Pride and Prejudice\'?',
    secenekler: ['Virginia Woolf', 'Jane Austen', 'Charlotte Brontë', 'George Eliot'],
    dogru: 1,
    aciklama:
        'Gurur ve Önyargı romanı Jane Austen\'a aittir.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.sanat.3',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.sanat,
    soru:
        'What is an \'oxymoron\' in literature?',
    secenekler: ['An exaggeration used for effect', 'A repeated opening sound in nearby words', 'Two contradictory terms combined, such as \'deafening silence\'', 'A comparison using \'like\' or \'as\''],
    dogru: 2,
    aciklama:
        'Oksimoron, \'sağır edici sessizlik\' gibi birbiriyle çelişen iki terimin birleşmesidir.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.sanat.4',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.sanat,
    soru:
        'Which composer wrote \'The Four Seasons\'?',
    secenekler: ['Johann Sebastian Bach', 'Franz Schubert', 'Claude Debussy', 'Antonio Vivaldi'],
    dogru: 3,
    aciklama:
        'Dört Mevsim, Antonio Vivaldi\'nin keman konçertolarıdır.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.sanat.5',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.sanat,
    soru:
        'Which novel opens with the line \'Call me Ishmael\'?',
    secenekler: ['Moby-Dick', 'Treasure Island', 'Robinson Crusoe', 'Great Expectations'],
    dogru: 0,
    aciklama:
        'Bu cümle Herman Melville\'in Moby-Dick romanının ilk cümlesidir.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.sanat.6',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.sanat,
    soru:
        'In painting, what does the term \'chiaroscuro\' refer to?',
    secenekler: ['Painting directly on wet plaster', 'The strong contrast between light and dark', 'The use of only primary colours', 'A very small brush technique'],
    dogru: 1,
    aciklama:
        'Chiaroscuro, ışık ile gölge arasındaki güçlü karşıtlığın kullanılmasıdır.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.matematik.1',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.matematik,
    soru:
        'What is the value of 3 to the power of 4?',
    secenekler: ['64', '27', '81', '12'],
    dogru: 2,
    aciklama:
        '3 x 3 x 3 x 3 = 81.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.matematik.2',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.matematik,
    soru:
        'What is the median of the numbers 3, 7, 8, 12 and 20?',
    secenekler: ['10', '7', '12', '8'],
    dogru: 3,
    aciklama:
        'Sıralı listede ortadaki sayı 8\'dir.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.matematik.3',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.matematik,
    soru:
        'A shirt costs 80 pounds and is reduced by 25 per cent. What is the new price?',
    secenekler: ['60 pounds', '55 pounds', '65 pounds', '75 pounds'],
    dogru: 0,
    aciklama:
        '80\'in yüzde 25\'i 20\'dir; 80 - 20 = 60.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.matematik.4',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.matematik,
    soru:
        'What is the sum of the interior angles of a hexagon?',
    secenekler: ['360 degrees', '720 degrees', '540 degrees', '900 degrees'],
    dogru: 1,
    aciklama:
        '(6 - 2) x 180 = 720 derece.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.matematik.5',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.matematik,
    soru:
        'A train travels 150 km in 2.5 hours. What is its average speed?',
    secenekler: ['75 km/h', '65 km/h', '60 km/h', '50 km/h'],
    dogru: 2,
    aciklama:
        'Hız = yol / süre = 150 / 2,5 = 60 km/sa.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.matematik.6',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.matematik,
    soru:
        'Which of the following numbers is prime?',
    secenekler: ['51', '87', '91', '97'],
    dogru: 3,
    aciklama:
        '97 yalnızca 1 ve kendisine bölünür; 51, 87 ve 91 sırasıyla 3, 3 ve 7\'ye bölünür.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.fen.1',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.fen,
    soru:
        'What is the chemical symbol for gold?',
    secenekler: ['Au', 'Ag', 'Go', 'Gd'],
    dogru: 0,
    aciklama:
        'Altının simgesi Au\'dur (Latince aurum).',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.fen.2',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.fen,
    soru:
        'Which part of the cell is often called its \'powerhouse\'?',
    secenekler: ['The membrane', 'The mitochondrion', 'The nucleus', 'The ribosome'],
    dogru: 1,
    aciklama:
        'Mitokondri hücrenin enerji santrali olarak anılır.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.fen.3',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.fen,
    soru:
        'Which force keeps the planets in orbit around the Sun?',
    secenekler: ['Magnetism', 'Buoyancy', 'Gravity', 'Friction'],
    dogru: 2,
    aciklama:
        'Gezegenleri yörüngede tutan kuvvet kütle çekimidir.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.fen.4',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.fen,
    soru:
        'Which gas do plants take in from the air for photosynthesis?',
    secenekler: ['Oxygen', 'Nitrogen', 'Hydrogen', 'Carbon dioxide'],
    dogru: 3,
    aciklama:
        'Bitkiler fotosentez için karbondioksit alır ve oksijen verir.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.fen.5',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.fen,
    soru:
        'What is a substance that speeds up a chemical reaction without being used up?',
    secenekler: ['A catalyst', 'A solvent', 'A reagent', 'A precipitate'],
    dogru: 0,
    aciklama:
        'Katalizör, tepkimeyi hızlandırır ama tükenmez.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.fen.6',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.fen,
    soru:
        'Approximately how fast does light travel in a vacuum?',
    secenekler: ['3 million kilometres per second', '300,000 kilometres per second', '30,000 kilometres per second', '3,000 kilometres per second'],
    dogru: 1,
    aciklama:
        'Işığın boşluktaki hızı yaklaşık saniyede 300.000 km\'dir.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.cografya.1',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.cografya,
    soru:
        'Which river flows through the city of Baghdad?',
    secenekler: ['The Nile', 'The Jordan', 'The Tigris', 'The Euphrates'],
    dogru: 2,
    aciklama:
        'Bağdat, Dicle (Tigris) Nehri üzerindedir.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.cografya.2',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.cografya,
    soru:
        'Which is the largest hot desert in the world?',
    secenekler: ['The Gobi', 'The Kalahari', 'The Arabian Desert', 'The Sahara'],
    dogru: 3,
    aciklama:
        'En büyük sıcak çöl Afrika\'daki Sahra\'dır.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.cografya.3',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.cografya,
    soru:
        'Which strait separates Europe from Africa at the western end of the Mediterranean?',
    secenekler: ['The Strait of Gibraltar', 'The Bosphorus', 'The Strait of Hormuz', 'The Dardanelles'],
    dogru: 0,
    aciklama:
        'Cebelitarık Boğazı, Avrupa ile Afrika\'yı ayırır.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.cografya.4',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.cografya,
    soru:
        'In which country is Mount Kilimanjaro located?',
    secenekler: ['Uganda', 'Tanzania', 'Kenya', 'Ethiopia'],
    dogru: 1,
    aciklama:
        'Kilimanjaro Dağı Tanzanya\'dadır.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.cografya.5',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.cografya,
    soru:
        'Which country has the most time zones when its overseas territories are included?',
    secenekler: ['The United States', 'China', 'France', 'Russia'],
    dogru: 2,
    aciklama:
        'Denizaşırı bölgeleri sayıldığında en çok saat dilimine Fransa sahiptir.',
  ),
  YarismaSorusu(
    id: 'ingilizce-5.cografya.6',
    alan: 'dil',
    seviyeKursId: 'ingilizce-5',
    kategori: YarismaKategori.cografya,
    soru:
        'The Great Barrier Reef lies off the coast of which Australian state?',
    secenekler: ['Victoria', 'Tasmania', 'Western Australia', 'Queensland'],
    dogru: 3,
    aciklama:
        'Büyük Set Resifi, Queensland kıyısı açıklarındadır.',
  ),
];
