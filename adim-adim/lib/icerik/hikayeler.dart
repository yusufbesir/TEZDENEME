// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Okuma hikâyeleri (yalnız İngilizce kursları): her kurs için kolay/orta/zor
/// birer özgün, kısa hikâye. Kolay 60-90, orta 100-140, zor 150-200 kelime.
/// Kodlama kurslarında hikâye yoktur.
library;

import '../model/hikaye.dart';
import '../model/icerik.dart';

/// Tüm hikâyeler: A1, A2, B1, B2 sırasıyla kolay, orta, zor.
final List<Hikaye> tumHikayeler = List.unmodifiable(<Hikaye>[
  // ---------------------------------------------------------------- A1
  const Hikaye(
    id: 'hikaye-a1-kolay',
    kursId: 'ingilizce-1',
    seviye: HikayeSeviyesi.kolay,
    baslik: 'My Morning',
    paragraflar: [
      "My name is Ali. I live in a small house with my family. Every morning I get up at seven o'clock. I wash my face and eat breakfast. I have bread, cheese and a glass of milk.",
      'After breakfast I take my bag and go to school by bus. My school is near the park. I like my teacher because she is kind. In the afternoon I come home and play football with my friends.',
    ],
    anahtarKelimeler: [
      (kelime: 'breakfast', anlam: 'kahvaltı'),
      (kelime: 'cheese', anlam: 'peynir'),
      (kelime: 'bus', anlam: 'otobüs'),
      (kelime: 'near', anlam: 'yakın, yanında'),
      (kelime: 'kind', anlam: 'nazik, iyi kalpli'),
      (kelime: 'afternoon', anlam: 'öğleden sonra'),
    ],
    sorular: [
      Secim(
        soru: 'What time does Ali get up?',
        secenekler: ['At six', "At seven o'clock", 'At eight', 'At nine'],
        dogru: 1,
        aciklama: "Metinde: \"Every morning I get up at seven o'clock.\"",
      ),
      Secim(
        soru: 'How does Ali go to school?',
        secenekler: ['By car', 'On foot', 'By bus', 'By bike'],
        dogru: 2,
        aciklama: 'Metinde: "go to school by bus".',
      ),
      Secim(
        soru: 'Why does Ali like his teacher?',
        secenekler: [
          'She is kind',
          'She is young',
          'She plays football',
          'She lives near the park',
        ],
        dogru: 0,
        aciklama: 'Metinde: "because she is kind".',
      ),
      Secim(
        soru: 'What does Ali do in the afternoon?',
        secenekler: [
          'He eats breakfast',
          'He plays football with friends',
          'He goes to the park alone',
          'He washes the bus',
        ],
        dogru: 1,
        aciklama: 'Öğleden sonra eve gelir ve arkadaşlarıyla futbol oynar.',
      ),
    ],
  ),
  const Hikaye(
    id: 'hikaye-a1-orta',
    kursId: 'ingilizce-1',
    seviye: HikayeSeviyesi.orta,
    baslik: 'At the Market',
    paragraflar: [
      'Today is Saturday, so my mother and I go to the market. It is a big market with many colourful stalls. Some people sell fruit and vegetables. Others sell fish, eggs and flowers. The market is very busy in the morning.',
      'My mother buys tomatoes, potatoes and a kilo of apples. The apples are cheap today, only two dollars. I want some bananas, but she says we have enough fruit at home. Then we buy fresh bread from a small shop.',
      'Before we go home, my mother drinks a cup of tea and I eat an ice cream. I carry the heavy bags to the car. I am tired, but I am happy. I love our Saturdays at the market.',
    ],
    anahtarKelimeler: [
      (kelime: 'stalls', anlam: 'tezgâhlar, pazar yerleri'),
      (kelime: 'vegetables', anlam: 'sebzeler'),
      (kelime: 'busy', anlam: 'kalabalık, yoğun'),
      (kelime: 'cheap', anlam: 'ucuz'),
      (kelime: 'enough', anlam: 'yeterli'),
      (kelime: 'heavy', anlam: 'ağır'),
      (kelime: 'tired', anlam: 'yorgun'),
    ],
    sorular: [
      Secim(
        soru: 'Which day do they go to the market?',
        secenekler: ['Friday', 'Saturday', 'Sunday', 'Monday'],
        dogru: 1,
        aciklama: 'Metinde: "Today is Saturday".',
      ),
      Secim(
        soru: 'What does the writer\'s mother buy?',
        secenekler: [
          'Fish and flowers',
          'Bananas and ice cream',
          'Tomatoes, potatoes and apples',
          'Only bread',
        ],
        dogru: 2,
        aciklama: 'Annesi domates, patates ve elma alır.',
      ),
      Secim(
        soru: 'Why does the writer not get bananas?',
        secenekler: [
          'They are too expensive',
          'There are no bananas',
          'The writer does not like them',
          'There is enough fruit at home',
        ],
        dogru: 3,
        aciklama: 'Annesi evde yeterince meyve olduğunu söyler.',
      ),
      Secim(
        soru: 'How does the writer feel at the end?',
        secenekler: [
          'Angry and busy',
          'Tired but happy',
          'Hungry and sad',
          'Cold and bored',
        ],
        dogru: 1,
        aciklama: 'Metinde: "I am tired, but I am happy."',
      ),
    ],
  ),
  const Hikaye(
    id: 'hikaye-a1-zor',
    kursId: 'ingilizce-1',
    seviye: HikayeSeviyesi.zor,
    baslik: 'A Day at the Lake',
    paragraflar: [
      'Last summer my family and I went to a lake for a holiday. We stayed in a small hotel near the water. The room was clean and the beds were soft. From the window we could see the mountains and a lot of green trees.',
      'On the first day we got up early and walked along the lake. The air was fresh and the water was very cold. My brother wanted to swim, but our father said it was dangerous. So we took a small boat and rowed to the other side. It took us one hour.',
      'In the afternoon we had a picnic under a big tree. We ate sandwiches, boiled eggs and sweet grapes. A friendly dog came and sat next to us, and my sister gave it a piece of bread. In the evening we returned to the hotel and watched the sunset. It was the best day of the holiday. I will never forget it.',
    ],
    anahtarKelimeler: [
      (kelime: 'holiday', anlam: 'tatil'),
      (kelime: 'soft', anlam: 'yumuşak'),
      (kelime: 'fresh', anlam: 'taze, ferah'),
      (kelime: 'dangerous', anlam: 'tehlikeli'),
      (kelime: 'boat', anlam: 'tekne, kayık'),
      (kelime: 'picnic', anlam: 'piknik'),
      (kelime: 'friendly', anlam: 'arkadaş canlısı'),
      (kelime: 'sunset', anlam: 'gün batımı'),
    ],
    sorular: [
      Secim(
        soru: 'Where did the family stay?',
        secenekler: [
          'In a tent',
          'With friends',
          'In a small hotel near the water',
          'In a house in the mountains',
        ],
        dogru: 2,
        aciklama: 'Göl kenarındaki küçük bir otelde kaldılar.',
      ),
      Secim(
        soru: 'Why did the brother not swim?',
        secenekler: [
          'The water was too warm',
          'His father said it was dangerous',
          'He was tired',
          'He did not like the lake',
        ],
        dogru: 1,
        aciklama: 'Babaları yüzmenin tehlikeli olduğunu söyledi.',
      ),
      Secim(
        soru: 'How did they get to the other side of the lake?',
        secenekler: ['By bus', 'By car', 'On foot', 'By boat'],
        dogru: 3,
        aciklama: 'Küçük bir tekneyle karşıya kürek çektiler.',
      ),
      Secim(
        soru: 'What did the sister give to the dog?',
        secenekler: ['A sandwich', 'A piece of bread', 'Some grapes', 'An egg'],
        dogru: 1,
        aciklama: 'Metinde: "gave it a piece of bread".',
      ),
    ],
  ),
  // ---------------------------------------------------------------- A2
  const Hikaye(
    id: 'hikaye-a2-kolay',
    kursId: 'ingilizce-2',
    seviye: HikayeSeviyesi.kolay,
    baslik: 'A New Phone',
    paragraflar: [
      'Last week my old phone fell on the floor and the screen broke. I could not send messages or take photos, so I decided to buy a new one.',
      'I looked at some websites and compared the prices. Finally I chose a model that was not expensive but had a good camera. It arrived two days later, and I am very pleased with it.',
    ],
    anahtarKelimeler: [
      (kelime: 'screen', anlam: 'ekran'),
      (kelime: 'broke', anlam: 'kırıldı'),
      (kelime: 'decided', anlam: 'karar verdi'),
      (kelime: 'compared', anlam: 'karşılaştırdı'),
      (kelime: 'expensive', anlam: 'pahalı'),
      (kelime: 'camera', anlam: 'kamera'),
      (kelime: 'arrived', anlam: 'geldi, ulaştı'),
      (kelime: 'pleased', anlam: 'memnun'),
    ],
    sorular: [
      Secim(
        soru: 'What happened to the old phone?',
        secenekler: [
          'It was stolen',
          'The screen broke',
          'The battery died',
          'It got lost',
        ],
        dogru: 1,
        aciklama: 'Telefon yere düştü ve ekranı kırıldı.',
      ),
      Secim(
        soru: 'How did the writer choose a new phone?',
        secenekler: [
          'By asking a friend',
          'By visiting a shop',
          'By comparing prices on websites',
          'By reading a magazine',
        ],
        dogru: 2,
        aciklama: 'Yazar internet sitelerinde fiyatları karşılaştırdı.',
      ),
      Secim(
        soru: 'Why did the writer choose this model?',
        secenekler: [
          'It was cheap and had a good camera',
          'It was the newest one',
          'It was red',
          'It had a big screen',
        ],
        dogru: 0,
        aciklama: 'Pahalı değildi ama iyi bir kamerası vardı.',
      ),
      Secim(
        soru: 'When did the new phone arrive?',
        secenekler: [
          'The next day',
          'Two days later',
          'A week later',
          'On the same day',
        ],
        dogru: 1,
        aciklama: 'Metinde: "It arrived two days later".',
      ),
    ],
  ),
  const Hikaye(
    id: 'hikaye-a2-orta',
    kursId: 'ingilizce-2',
    seviye: HikayeSeviyesi.orta,
    baslik: 'A Weekend by the Sea',
    paragraflar: [
      'Last weekend my friends and I took a train to a small town by the sea. We left early on Saturday morning because we wanted to spend the whole day outside. The journey took about two hours, and we played cards on the train.',
      'When we arrived, the weather was perfect. We rented bicycles and rode along the beach until lunchtime. Then we ate fresh fish at a little restaurant near the harbour. The owner was very polite and gave us a free dessert.',
      'In the evening it started to rain, so we stayed in a café and talked for hours. We missed the last train, but we found a cheap hotel and went back the next morning. It was a tiring weekend, but we all want to go again.',
    ],
    anahtarKelimeler: [
      (kelime: 'journey', anlam: 'yolculuk'),
      (kelime: 'weather', anlam: 'hava durumu'),
      (kelime: 'rented', anlam: 'kiraladı'),
      (kelime: 'harbour', anlam: 'liman'),
      (kelime: 'polite', anlam: 'kibar, nazik'),
      (kelime: 'free', anlam: 'bedava'),
      (kelime: 'missed', anlam: 'kaçırdı'),
      (kelime: 'tiring', anlam: 'yorucu'),
    ],
    sorular: [
      Secim(
        soru: 'How did the friends travel to the town?',
        secenekler: ['By bus', 'By train', 'By car', 'By boat'],
        dogru: 1,
        aciklama: 'Metinde: "took a train".',
      ),
      Secim(
        soru: 'What did they do before lunchtime?',
        secenekler: [
          'They swam in the sea',
          'They played cards',
          'They rode bicycles along the beach',
          'They visited a museum',
        ],
        dogru: 2,
        aciklama: 'Bisiklet kiralayıp plaj boyunca sürdüler.',
      ),
      Secim(
        soru: 'What was special about the dessert?',
        secenekler: [
          'It was very big',
          'It was free',
          'It was made of fish',
          'It was cold',
        ],
        dogru: 1,
        aciklama: 'Sahibi onlara bedava tatlı verdi.',
      ),
      Secim(
        soru: 'Why did they stay in a hotel?',
        secenekler: [
          'They missed the last train',
          'They wanted to swim at night',
          'The café was closed',
          'It was cheap to stay there for a week',
        ],
        dogru: 0,
        aciklama: 'Son treni kaçırınca ucuz bir otel buldular.',
      ),
    ],
  ),
  const Hikaye(
    id: 'hikaye-a2-zor',
    kursId: 'ingilizce-2',
    seviye: HikayeSeviyesi.zor,
    baslik: 'Lost Luggage',
    paragraflar: [
      'Maria had been looking forward to her holiday in Spain for months. She packed her suitcase carefully the night before and arrived at the airport three hours early. The flight was smooth, and the pilot said that the weather in Madrid was warm and sunny.',
      'However, when she was waiting at the baggage claim, her suitcase never appeared. Everybody else took their bags and left, and soon the hall was empty. Maria felt worried and a little angry. She went to the information desk and explained the problem to a young woman.',
      'The woman asked her to fill in a form and describe the suitcase. It was blue, with a red label on the handle. She promised that the airline would find it and deliver it to the hotel within two days. Maria was not happy, but she thanked her.',
      'That afternoon she had to buy new clothes and a toothbrush. Luckily, the suitcase arrived the next evening, and nothing was missing. After that, Maria always put her name and phone number inside her bag.',
    ],
    anahtarKelimeler: [
      (kelime: 'suitcase', anlam: 'bavul'),
      (kelime: 'airport', anlam: 'havalimanı'),
      (kelime: 'smooth', anlam: 'sorunsuz, pürüzsüz'),
      (kelime: 'baggage claim', anlam: 'bagaj teslim bandı'),
      (kelime: 'worried', anlam: 'endişeli'),
      (kelime: 'form', anlam: 'form, başvuru kâğıdı'),
      (kelime: 'deliver', anlam: 'teslim etmek'),
      (kelime: 'luckily', anlam: 'neyse ki'),
    ],
    sorular: [
      Secim(
        soru: 'How early did Maria arrive at the airport?',
        secenekler: [
          'One hour early',
          'Two hours early',
          'Three hours early',
          'She was late',
        ],
        dogru: 2,
        aciklama: 'Metinde: "three hours early".',
      ),
      Secim(
        soru: 'What went wrong at the baggage claim?',
        secenekler: [
          'Her passport was missing',
          'Her suitcase never appeared',
          'The hall was full',
          'She took the wrong bag',
        ],
        dogru: 1,
        aciklama: 'Bavulu bagaj bandında hiç görünmedi.',
      ),
      Secim(
        soru: 'What did the woman at the desk ask Maria to do?',
        secenekler: [
          'Come back the next day',
          'Buy a new suitcase',
          'Call the hotel',
          'Fill in a form and describe the suitcase',
        ],
        dogru: 3,
        aciklama: 'Bir form doldurup bavulu tarif etmesini istedi.',
      ),
      Secim(
        soru: 'When did the suitcase arrive?',
        secenekler: [
          'The next evening',
          'The same night',
          'Two weeks later',
          'It never arrived',
        ],
        dogru: 0,
        aciklama: 'Bavul ertesi akşam geldi ve hiçbir şey eksik değildi.',
      ),
    ],
  ),
  // ---------------------------------------------------------------- B1
  const Hikaye(
    id: 'hikaye-b1-kolay',
    kursId: 'ingilizce-3',
    seviye: HikayeSeviyesi.kolay,
    baslik: 'Working from Home',
    paragraflar: [
      'Since last spring, I have been working from home three days a week. At first I found it difficult to stay focused because there were so many distractions.',
      'Now I follow a strict routine: I start at nine, take a proper lunch break and switch off my laptop at five. This has made me more productive and much less stressed. I even save an hour of travelling every day.',
    ],
    anahtarKelimeler: [
      (kelime: 'focused', anlam: 'odaklanmış'),
      (kelime: 'distractions', anlam: 'dikkat dağıtıcı şeyler'),
      (kelime: 'strict', anlam: 'katı, sıkı'),
      (kelime: 'routine', anlam: 'düzen, rutin'),
      (kelime: 'productive', anlam: 'verimli'),
      (kelime: 'stressed', anlam: 'stresli'),
      (kelime: 'travelling', anlam: 'yolculuk etme'),
    ],
    sorular: [
      Secim(
        soru: 'How often does the writer work from home?',
        secenekler: [
          'Every day',
          'Three days a week',
          'Once a month',
          'Only in spring',
        ],
        dogru: 1,
        aciklama: 'Metinde: "three days a week".',
      ),
      Secim(
        soru: 'What was difficult at first?',
        secenekler: [
          'Using the laptop',
          'Starting work at nine',
          'Staying focused',
          'Finding a quiet room',
        ],
        dogru: 2,
        aciklama: 'Çok fazla dikkat dağıtıcı şey vardı.',
      ),
      Secim(
        soru: 'When does the writer stop working?',
        secenekler: ['At four', 'At nine', 'At noon', 'At five'],
        dogru: 3,
        aciklama: 'Saat beşte dizüstü bilgisayarı kapatır.',
      ),
      Secim(
        soru: 'What has the routine achieved?',
        secenekler: [
          'The writer is more productive and less stressed',
          'The writer works longer hours',
          'The writer travels more',
          'The writer has fewer breaks',
        ],
        dogru: 0,
        aciklama: 'Daha verimli ve çok daha az stresli.',
      ),
    ],
  ),
  const Hikaye(
    id: 'hikaye-b1-orta',
    kursId: 'ingilizce-3',
    seviye: HikayeSeviyesi.orta,
    baslik: 'The Village Bakery',
    paragraflar: [
      'In the centre of our village there is a small bakery that has been run by the same family for over sixty years. Every morning, long before the sun rises, the baker gets up to prepare the dough. By six o\'clock the smell of fresh bread fills the whole street.',
      'Last year a large supermarket opened nearby, and many people feared that the bakery would have to close. Surprisingly, the opposite happened. Customers said they preferred the traditional taste and enjoyed chatting with the owner. Some even travel from neighbouring towns just to buy his famous apple pie.',
      'The baker says the secret is simple: good ingredients, patience and respect for the customer.',
    ],
    anahtarKelimeler: [
      (kelime: 'bakery', anlam: 'fırın, ekmek dükkânı'),
      (kelime: 'dough', anlam: 'hamur'),
      (kelime: 'feared', anlam: 'korktu, endişelendi'),
      (kelime: 'surprisingly', anlam: 'şaşırtıcı biçimde'),
      (kelime: 'preferred', anlam: 'tercih etti'),
      (kelime: 'traditional', anlam: 'geleneksel'),
      (kelime: 'ingredients', anlam: 'malzemeler'),
      (kelime: 'patience', anlam: 'sabır'),
    ],
    sorular: [
      Secim(
        soru: 'How long has the same family run the bakery?',
        secenekler: [
          'For ten years',
          'For over sixty years',
          'Since last year',
          'For about thirty years',
        ],
        dogru: 1,
        aciklama: 'Metinde: "for over sixty years".',
      ),
      Secim(
        soru: 'What happened after the supermarket opened?',
        secenekler: [
          'The bakery closed',
          'The baker moved away',
          'The bakery stayed popular',
          'The prices fell',
        ],
        dogru: 2,
        aciklama: '"Surprisingly, the opposite happened": fırın kapanmadı.',
      ),
      Secim(
        soru: 'Why do customers prefer the bakery?',
        secenekler: [
          'It is cheaper',
          'It is open all night',
          'It is bigger',
          'They like the traditional taste and the owner',
        ],
        dogru: 3,
        aciklama: 'Geleneksel tadı ve sahibiyle sohbeti seviyorlar.',
      ),
      Secim(
        soru: 'What does the baker say is the secret?',
        secenekler: [
          'Good ingredients, patience and respect',
          'Low prices and fast service',
          'Advertising and new machines',
          'A secret recipe from his grandfather',
        ],
        dogru: 0,
        aciklama: 'Fırıncıya göre sır: iyi malzeme, sabır ve saygı.',
      ),
    ],
  ),
  const Hikaye(
    id: 'hikaye-b1-zor',
    kursId: 'ingilizce-3',
    seviye: HikayeSeviyesi.zor,
    baslik: 'A Change of Plans',
    paragraflar: [
      'Tom and his sister Emma had planned a long hike in the mountains for weeks. They had checked the route, bought new boots and packed enough food for two days. On the morning of the trip, however, the forecast predicted heavy storms, and the local rescue service advised walkers to stay at home.',
      'Tom was determined to go anyway. He argued that the storm might not reach their valley and that they could always turn back. Emma disagreed. She reminded him that the weather in the mountains can change within minutes and that nobody would be able to help them if they got lost.',
      'After a long discussion, they reached a compromise. Instead of climbing, they drove to a nearby lake and walked along the shore. It was less exciting than they had hoped, but they enjoyed the peaceful scenery. Later that evening, the news reported that several hikers had been rescued from the very path they had chosen. Tom admitted that his sister had been right.',
    ],
    anahtarKelimeler: [
      (kelime: 'hike', anlam: 'doğa yürüyüşü'),
      (kelime: 'route', anlam: 'güzergâh'),
      (kelime: 'forecast', anlam: 'hava tahmini'),
      (kelime: 'determined', anlam: 'kararlı'),
      (kelime: 'disagreed', anlam: 'aynı fikirde değildi'),
      (kelime: 'compromise', anlam: 'orta yol, uzlaşma'),
      (kelime: 'scenery', anlam: 'manzara'),
      (kelime: 'rescued', anlam: 'kurtarıldı'),
    ],
    sorular: [
      Secim(
        soru: 'Why did the rescue service advise walkers to stay at home?',
        secenekler: [
          'The paths were closed',
          'Heavy storms were forecast',
          'There was too much snow',
          'It was a public holiday',
        ],
        dogru: 1,
        aciklama: 'Hava tahmini şiddetli fırtına öngörüyordu.',
      ),
      Secim(
        soru: 'How did Tom react to the forecast?',
        secenekler: [
          'He cancelled the trip at once',
          'He called the rescue service',
          'He was determined to go anyway',
          'He went alone',
        ],
        dogru: 2,
        aciklama: 'Tom yine de gitmekte kararlıydı.',
      ),
      Secim(
        soru: 'What was the compromise?',
        secenekler: [
          'They climbed only half of the mountain',
          'They stayed at home',
          'They went the next week',
          'They walked along a lake instead of climbing',
        ],
        dogru: 3,
        aciklama: 'Tırmanmak yerine yakındaki gölün kıyısında yürüdüler.',
      ),
      Secim(
        soru: 'What did the news report that evening?',
        secenekler: [
          'Hikers were rescued from the path they had chosen',
          'The storm had never arrived',
          'The lake was closed',
          'Tom and Emma were lost',
        ],
        dogru: 0,
        aciklama: 'Seçtikleri yoldan birkaç yürüyüşçü kurtarılmıştı.',
      ),
    ],
  ),
  // ---------------------------------------------------------------- B2
  const Hikaye(
    id: 'hikaye-b2-kolay',
    kursId: 'ingilizce-4',
    seviye: HikayeSeviyesi.kolay,
    baslik: 'The Morning Commute',
    paragraflar: [
      'For years I regarded my daily commute as wasted time, until I started listening to audiobooks and podcasts on the train. What was once a tedious obligation has become the most stimulating part of my day.',
      'I have now finished more novels than in the whole of my twenties, and I arrive at the office feeling surprisingly energised rather than exhausted. Nobody is more surprised than me.',
    ],
    anahtarKelimeler: [
      (kelime: 'regarded', anlam: '(bir şey olarak) gördü'),
      (kelime: 'commute', anlam: 'işe gidiş geliş yolculuğu'),
      (kelime: 'tedious', anlam: 'sıkıcı, bıktırıcı'),
      (kelime: 'obligation', anlam: 'zorunluluk, yükümlülük'),
      (kelime: 'stimulating', anlam: 'zihin açıcı, canlandırıcı'),
      (kelime: 'novels', anlam: 'romanlar'),
      (kelime: 'energised', anlam: 'enerji dolu'),
      (kelime: 'exhausted', anlam: 'bitkin'),
    ],
    sorular: [
      Secim(
        soru: 'What changed the writer\'s view of the commute?',
        secenekler: [
          'A new job',
          'Listening to audiobooks and podcasts',
          'A faster train',
          'Moving closer to the office',
        ],
        dogru: 1,
        aciklama: 'Trende sesli kitap ve podcast dinlemeye başladı.',
      ),
      Secim(
        soru: 'How did the writer once see the commute?',
        secenekler: [
          'As a stimulating part of the day',
          'As a time to sleep',
          'As a tedious obligation',
          'As a chance to meet people',
        ],
        dogru: 2,
        aciklama:
            '"What was once a tedious obligation": eskiden sıkıcı bir zorunluluktu.',
      ),
      Secim(
        soru: 'How does the writer feel when arriving at the office?',
        secenekler: ['Exhausted', 'Bored', 'Worried', 'Energised'],
        dogru: 3,
        aciklama: 'Bitkin değil, şaşırtıcı biçimde enerji dolu varır.',
      ),
    ],
  ),
  const Hikaye(
    id: 'hikaye-b2-orta',
    kursId: 'ingilizce-4',
    seviye: HikayeSeviyesi.orta,
    baslik: 'Letting Nature Return',
    paragraflar: [
      'Conservationists have long argued that the best way to protect a damaged landscape is to leave it alone. This idea, known as rewilding, has gained considerable momentum across Europe over the past decade. Farmland that was once intensively cultivated is being allowed to return to forest, and rivers are being freed from the concrete channels that confined them.',
      'The results can be striking. Within a few years, beavers have reshaped streams, creating wetlands that shelter fish, insects and birds. Critics, however, point out that local farmers often bear the cost, since wild animals can damage crops and livestock. Supporters accept that compensation schemes are essential if rewilding is to win lasting public support.',
    ],
    anahtarKelimeler: [
      (kelime: 'conservationists', anlam: 'doğa koruma uzmanları'),
      (kelime: 'rewilding', anlam: 'doğal yaşamı geri getirme'),
      (kelime: 'momentum', anlam: 'ivme, ilgi'),
      (kelime: 'cultivated', anlam: 'ekilip biçilen, işlenen'),
      (kelime: 'confined', anlam: 'sınırlanmış, hapsedilmiş'),
      (kelime: 'striking', anlam: 'çarpıcı'),
      (kelime: 'wetlands', anlam: 'sulak alanlar'),
      (kelime: 'compensation', anlam: 'tazminat, telafi'),
    ],
    sorular: [
      Secim(
        soru: 'What does rewilding mean in the text?',
        secenekler: [
          'Building new nature parks',
          'Hunting wild animals',
          'Leaving damaged land to recover naturally',
          'Planting only one type of tree',
        ],
        dogru: 2,
        aciklama: 'Bozulmuş araziyi kendi haline bırakma fikri.',
      ),
      Secim(
        soru: 'What have beavers done in some places?',
        secenekler: [
          'Destroyed the forests',
          'Created wetlands that shelter wildlife',
          'Moved to the cities',
          'Blocked all rivers for ever',
        ],
        dogru: 1,
        aciklama: 'Akarsuları yeniden şekillendirip sulak alanlar yarattılar.',
      ),
      Secim(
        soru: 'What do critics worry about?',
        secenekler: [
          'The high price of land',
          'Too many tourists',
          'Farmers may bear the cost of damage',
          'The loss of forests',
        ],
        dogru: 2,
        aciklama: 'Yabani hayvanlar ürüne ve hayvanlara zarar verebilir.',
      ),
      Secim(
        soru: 'What do supporters say is essential?',
        secenekler: [
          'Compensation schemes',
          'Stricter hunting laws',
          'More farmland',
          'Fewer rivers',
        ],
        dogru: 0,
        aciklama: 'Kalıcı destek için tazminat düzenekleri şart.',
      ),
    ],
  ),
  const Hikaye(
    id: 'hikaye-b2-zor',
    kursId: 'ingilizce-4',
    seviye: HikayeSeviyesi.zor,
    baslik: 'The Hidden Cost of Convenience',
    paragraflar: [
      'Few innovations have changed everyday life as dramatically as online shopping. With a few taps on a screen, almost anything can be delivered to our door within hours, often at a lower price than in a shop. It is hardly surprising that millions of consumers have embraced the convenience without a second thought.',
      'Yet this convenience comes at a price that is rarely visible on the receipt. Each parcel requires packaging, fuel and a driver who is usually under intense pressure to meet unrealistic deadlines. Meanwhile, high streets are struggling, as independent retailers find it impossible to compete with the giant platforms that dominate the market.',
      'Some economists believe that stricter regulation could restore a fairer balance, for example by obliging companies to disclose the environmental impact of each delivery. Others maintain that consumers themselves hold the real power: if enough people accepted slower delivery and bought locally, the market would eventually adapt. Whichever view is correct, the question is no longer whether our habits have consequences, but whether we are prepared to face them.',
    ],
    anahtarKelimeler: [
      (kelime: 'embraced', anlam: 'benimsedi, kucakladı'),
      (kelime: 'convenience', anlam: 'kolaylık, rahatlık'),
      (kelime: 'parcel', anlam: 'koli, paket'),
      (kelime: 'deadlines', anlam: 'son teslim süreleri'),
      (kelime: 'independent', anlam: 'bağımsız'),
      (kelime: 'regulation', anlam: 'düzenleme, mevzuat'),
      (kelime: 'disclose', anlam: 'açıklamak, ifşa etmek'),
      (kelime: 'consequences', anlam: 'sonuçlar'),
    ],
    sorular: [
      Secim(
        soru: 'Why have so many consumers embraced online shopping?',
        secenekler: [
          'It is fast and often cheaper',
          'Shops have closed everywhere',
          'It is always better for the environment',
          'The government requires it',
        ],
        dogru: 0,
        aciklama: 'Saatler içinde teslimat ve çoğu zaman daha düşük fiyat.',
      ),
      Secim(
        soru: 'What problem do delivery drivers face?',
        secenekler: [
          'Low-quality vehicles',
          'Unrealistic deadlines and intense pressure',
          'Too few parcels',
          'Unfriendly customers',
        ],
        dogru: 1,
        aciklama: 'Gerçekçi olmayan teslim süreleri altında baskı görürler.',
      ),
      Secim(
        soru: 'What do some economists suggest?',
        secenekler: [
          'Banning online shopping',
          'Lowering the price of fuel',
          'Opening more large platforms',
          'Stricter regulation and more disclosure',
        ],
        dogru: 3,
        aciklama: 'Daha sıkı düzenleme ve çevresel etkinin açıklanması.',
      ),
      Secim(
        soru: 'What is the main point of the final sentence?',
        secenekler: [
          'Our habits have no real effect',
          'Only companies can change the situation',
          'Online shopping will soon disappear',
          'We must decide whether we will face the consequences',
        ],
        dogru: 3,
        aciklama:
            'Soru artık sonuçların olup olmadığı değil, yüzleşmeye hazır olup olmadığımız.',
      ),
    ],
  ),
]);

/// Kimliğe göre hikâye; yoksa null.
Hikaye? hikayeBul(String id) {
  for (final h in tumHikayeler) {
    if (h.id == id) return h;
  }
  return null;
}

/// Verilen kurs kimliklerinin hikâyeleri: kurs sırasıyla, kolay-orta-zor.
List<Hikaye> kurslarinHikayeleri(Iterable<String> kursKimlikleri) => [
  for (final k in kursKimlikleri)
    for (final h in tumHikayeler)
      if (h.kursId == k) h,
];
