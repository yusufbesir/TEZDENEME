// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Senaryolu konuşmalar (ÖZELLİK 65): İngilizce, Almanca ve Korece için kısa,
/// dallanan, çevrimdışı sohbetler. Cümleler kurs içeriğindeki kalıplarla
/// (selamlaşma, tanışma, sipariş, yol sorma, alışveriş) sınırlıdır ve özgün
/// yazılmıştır. Her uygun cevap bir sonraki düğüme dallanır; uygun olmayan
/// cevap bir notla aynı düğümde kalır. Korece cümleler için anadil denetimi
/// yapılmamıştır (başlangıç düzeyi, çok kısa kalıplar).
library;

import '../model/senaryo.dart';

SenaryoMesaji _mesaj(String metin, String anlam) =>
    (metin: metin, anlam: anlam);

final List<Senaryo> tumSenaryolar = List.unmodifiable(<Senaryo>[
  // ------------------------------------------------------------ İngilizce
  Senaryo(
    id: 'senaryo-en-kafe',
    kursOnek: 'ingilizce',
    dil: 'en-US',
    baslik: 'Kafede sipariş',
    aciklama: 'Garsona içecek siparişi ver, ödemeyi yap.',
    dugumler: [
      SenaryoDugumu(
        id: 'basla',
        karsi: [
          _mesaj(
            'Hello! What would you like to drink?',
            'Merhaba! Ne içmek istersiniz?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'I would like a coffee, please.',
            anlam: 'Bir kahve istiyorum, lütfen.',
            sonraki: 'kahve',
          ),
          SenaryoCevabi(
            metin: 'I would like a tea, please.',
            anlam: 'Bir çay istiyorum, lütfen.',
            sonraki: 'cay',
          ),
          SenaryoCevabi(
            metin: 'I am a coffee.',
            anlam: 'Ben bir kahveyim.',
            uygun: false,
            not:
                'Sipariş verirken "I would like ..., please." denir; '
                '"I am ..." kim olduğunu anlatır.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'kahve',
        karsi: [
          _mesaj(
            'Sure. Would you like milk with your coffee?',
            'Tabii. Kahvenize süt ister misiniz?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Yes, please.',
            anlam: 'Evet, lütfen.',
            sonraki: 'odeme',
          ),
          SenaryoCevabi(
            metin: 'No, thank you.',
            anlam: 'Hayır, teşekkürler.',
            sonraki: 'odeme',
          ),
          SenaryoCevabi(
            metin: 'Yes, I am.',
            anlam: 'Evet, öyleyim.',
            uygun: false,
            not:
                '"Would you like ...?" sorusuna "Yes, please." ya da '
                '"No, thank you." diye cevap verilir.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'cay',
        karsi: [
          _mesaj(
            'Sure. Would you like sugar with your tea?',
            'Tabii. Çayınıza şeker ister misiniz?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Yes, please.',
            anlam: 'Evet, lütfen.',
            sonraki: 'odeme',
          ),
          SenaryoCevabi(
            metin: 'No, thank you.',
            anlam: 'Hayır, teşekkürler.',
            sonraki: 'odeme',
          ),
          SenaryoCevabi(
            metin: 'Yes, I am.',
            anlam: 'Evet, öyleyim.',
            uygun: false,
            not:
                '"Would you like ...?" sorusuna "Yes, please." ya da '
                '"No, thank you." diye cevap verilir.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'odeme',
        karsi: [
          _mesaj(
            'Here you are. That is five dollars.',
            'Buyurun. Beş dolar tutuyor.',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Here you are. Thank you!',
            anlam: 'Buyurun. Teşekkür ederim!',
            sonraki: 'bitis',
          ),
          SenaryoCevabi(
            metin: 'You are welcome.',
            anlam: 'Rica ederim.',
            uygun: false,
            not:
                '"You are welcome." teşekkür edildiğinde söylenir; '
                'burada ödemeyi verip teşekkür edebilirsin.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'bitis',
        karsi: [
          _mesaj('Thank you! Have a nice day.', 'Teşekkürler! İyi günler.'),
        ],
      ),
    ],
  ),
  Senaryo(
    id: 'senaryo-en-tanisma',
    kursOnek: 'ingilizce',
    dil: 'en-US',
    baslik: 'Yeni biriyle tanışma',
    aciklama: 'Adını söyle, nereli olduğunu anlat.',
    dugumler: [
      SenaryoDugumu(
        id: 'basla',
        karsi: [
          _mesaj(
            "Hi! I'm Sara. What's your name?",
            'Merhaba! Ben Sara. Senin adın ne?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'My name is Ali.',
            anlam: 'Benim adım Ali.',
            sonraki: 'nereli',
          ),
          SenaryoCevabi(
            metin: "I'm fine, thanks.",
            anlam: 'İyiyim, teşekkürler.',
            uygun: false,
            not:
                'Sara adını sordu; "I\'m fine" nasılsın sorusunun cevabıdır. '
                'Önce adını söyle.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'nereli',
        karsi: [
          _mesaj(
            'Nice to meet you, Ali. Where are you from?',
            'Tanıştığımıza memnun oldum, Ali. Nerelisin?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'I am from Turkey.',
            anlam: 'Türkiye’denim.',
            sonraki: 'turkiye',
          ),
          SenaryoCevabi(
            metin: 'I am from Germany.',
            anlam: 'Almanya’danım.',
            sonraki: 'almanya',
          ),
          SenaryoCevabi(
            metin: 'I am twenty years old.',
            anlam: 'Yirmi yaşındayım.',
            uygun: false,
            not:
                '"Where are you from?" nereli olduğunu sorar; yaş değil, '
                'ülkeni söyle.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'turkiye',
        karsi: [
          _mesaj(
            'Oh, Turkey! It is a beautiful country.',
            'Ah, Türkiye! Güzel bir ülke.',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Thank you!',
            anlam: 'Teşekkür ederim!',
            sonraki: 'bitis',
          ),
          SenaryoCevabi(
            metin: 'I am from Turkey.',
            anlam: 'Türkiye’denim.',
            uygun: false,
            not: 'Bunu zaten söyledin. Güzel sözüne teşekkür edebilirsin.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'almanya',
        karsi: [
          _mesaj(
            'Oh, Germany! It is a beautiful country.',
            'Ah, Almanya! Güzel bir ülke.',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Thank you!',
            anlam: 'Teşekkür ederim!',
            sonraki: 'bitis',
          ),
          SenaryoCevabi(
            metin: 'I am from Germany.',
            anlam: 'Almanya’danım.',
            uygun: false,
            not: 'Bunu zaten söyledin. Güzel sözüne teşekkür edebilirsin.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'bitis',
        karsi: [
          _mesaj('You are welcome. See you soon!', 'Rica ederim. Görüşürüz!'),
        ],
      ),
    ],
  ),
  Senaryo(
    id: 'senaryo-en-yol',
    kursOnek: 'ingilizce',
    dil: 'en-US',
    baslik: 'Yol sorma',
    aciklama: 'Yoldaki birine istasyonu ya da eczaneyi sor.',
    dugumler: [
      SenaryoDugumu(
        id: 'basla',
        karsi: [
          _mesaj(
            'Hello! Can I help you?',
            'Merhaba! Size yardım edebilir miyim?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Excuse me, where is the station?',
            anlam: 'Affedersiniz, istasyon nerede?',
            sonraki: 'istasyon',
          ),
          SenaryoCevabi(
            metin: 'Excuse me, where is the pharmacy?',
            anlam: 'Affedersiniz, eczane nerede?',
            sonraki: 'eczane',
          ),
          SenaryoCevabi(
            metin: 'How much is it?',
            anlam: 'Ne kadar?',
            uygun: false,
            not:
                'Fiyat sorarken kullanılır. Yol sormak için '
                '"Excuse me, where is ...?" de.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'istasyon',
        karsi: [
          _mesaj(
            'Go straight and turn left. It is next to the bank.',
            'Düz gidin ve sola dönün. Bankanın yanında.',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Thank you very much!',
            anlam: 'Çok teşekkür ederim!',
            sonraki: 'bitis',
          ),
          SenaryoCevabi(
            metin: 'How much is it?',
            anlam: 'Ne kadar?',
            uygun: false,
            not: 'Tarif aldın; burada teşekkür etmek uygun olur.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'eczane',
        karsi: [
          _mesaj(
            'Turn right at the corner. It is near the park.',
            'Köşeden sağa dönün. Parkın yakınında.',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Thank you very much!',
            anlam: 'Çok teşekkür ederim!',
            sonraki: 'bitis',
          ),
          SenaryoCevabi(
            metin: 'How much is it?',
            anlam: 'Ne kadar?',
            uygun: false,
            not: 'Tarif aldın; burada teşekkür etmek uygun olur.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'bitis',
        karsi: [
          _mesaj(
            'You are welcome. Have a nice day!',
            'Rica ederim. İyi günler!',
          ),
        ],
      ),
    ],
  ),
  Senaryo(
    id: 'senaryo-en-market',
    kursOnek: 'ingilizce',
    dil: 'en-US',
    baslik: 'Markette alışveriş',
    aciklama: 'Kasiyere fiyat sor, poşet ve ödeme şeklini seç.',
    dugumler: [
      SenaryoDugumu(
        id: 'basla',
        karsi: [
          _mesaj(
            'Hi! Did you find everything?',
            'Merhaba! Her şeyi buldunuz mu?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Yes, thank you. How much is it?',
            anlam: 'Evet, teşekkürler. Ne kadar?',
            sonraki: 'fiyat',
          ),
          SenaryoCevabi(
            metin: 'Yes, I did. Where is the milk?',
            anlam: 'Evet, buldum. Süt nerede?',
            uygun: false,
            not:
                'Kasada "Did you find everything?" sorusuna "Yes, thank you." '
                'diye cevap verilir; süt sorusu bu aşamaya uymaz.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'fiyat',
        karsi: [
          _mesaj(
            'That is twelve dollars. Do you need a bag?',
            'On iki dolar. Poşet ister misiniz?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Yes, please.',
            anlam: 'Evet, lütfen.',
            sonraki: 'odeme',
          ),
          SenaryoCevabi(
            metin: 'No, I have my own bag.',
            anlam: 'Hayır, kendi çantam var.',
            sonraki: 'odeme',
          ),
          SenaryoCevabi(
            metin: 'It is twelve dollars.',
            anlam: 'On iki dolar.',
            uygun: false,
            not:
                'Fiyatı söyleyen kasiyerdi; sen poşet sorusuna "Yes, please." '
                'ya da "No, thank you." diye cevap verirsin.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'odeme',
        karsi: [
          _mesaj(
            'Would you like to pay by card or cash?',
            'Kartla mı nakit mi ödemek istersiniz?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'By card, please.',
            anlam: 'Kartla, lütfen.',
            sonraki: 'bitis',
          ),
          SenaryoCevabi(
            metin: 'Cash, please.',
            anlam: 'Nakit, lütfen.',
            sonraki: 'bitis',
          ),
          SenaryoCevabi(
            metin: 'Yes, I would.',
            anlam: 'Evet, isterim.',
            uygun: false,
            not:
                '"... or ...?" sorusuna evet/hayır denmez; seçeneklerden '
                'birini söylersin: "By card" ya da "Cash".',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'bitis',
        karsi: [
          _mesaj('Thank you! Have a great day.', 'Teşekkürler! İyi günler.'),
        ],
      ),
    ],
  ),
  Senaryo(
    id: 'senaryo-en-otel',
    kursOnek: 'ingilizce',
    dil: 'en-US',
    baslik: 'Otelde giriş',
    aciklama: 'Rezervasyonunu söyle, kaç gece kalacağını ve kahvaltıyı sor.',
    dugumler: [
      SenaryoDugumu(
        id: 'basla',
        karsi: [
          _mesaj(
            'Good evening. Welcome to our hotel. How can I help you?',
            'İyi akşamlar. Otelimize hoş geldiniz. Nasıl yardımcı olabilirim?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'I have a reservation.',
            anlam: 'Rezervasyonum var.',
            sonraki: 'ad',
          ),
          SenaryoCevabi(
            metin: 'I am a reservation.',
            anlam: 'Ben bir rezervasyonum.',
            uygun: false,
            not:
                '"I have a reservation." rezervasyonun olduğunu söyler; '
                '"I am ..." kim olduğunu anlatır.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'ad',
        karsi: [
          _mesaj(
            'Great. May I have your name, please?',
            'Harika. Adınızı alabilir miyim?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'My name is Ali Yilmaz.',
            anlam: 'Adım Ali Yılmaz.',
            sonraki: 'gece',
          ),
          SenaryoCevabi(
            metin: 'I am fine, thank you.',
            anlam: 'İyiyim, teşekkürler.',
            uygun: false,
            not:
                'Adın sorulunca "My name is ..." denir; "I am fine" '
                '"How are you?" sorusunun cevabıdır.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'gece',
        karsi: [
          _mesaj(
            'Thank you. How many nights are you staying?',
            'Teşekkürler. Kaç gece kalacaksınız?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Two nights, please.',
            anlam: 'İki gece, lütfen.',
            sonraki: 'kahvalti',
          ),
          SenaryoCevabi(
            metin: 'Three nights, please.',
            anlam: 'Üç gece, lütfen.',
            sonraki: 'kahvalti',
          ),
          SenaryoCevabi(
            metin: 'I am staying, yes.',
            anlam: 'Kalıyorum, evet.',
            uygun: false,
            not:
                '"How many ...?" sayı sorar; cevap bir sayı içerir: '
                '"Two nights, please."',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'kahvalti',
        karsi: [
          _mesaj(
            'Here is your key. Room 204.',
            'Anahtarınız burada. 204 numaralı oda.',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Thank you. Is breakfast included?',
            anlam: 'Teşekkürler. Kahvaltı dahil mi?',
            sonraki: 'bitis',
          ),
          SenaryoCevabi(
            metin: 'You are welcome.',
            anlam: 'Rica ederim.',
            uygun: false,
            not:
                '"You are welcome." teşekkür edildiğinde söylenir; anahtarı '
                'alan sensin, önce teşekkür edersin.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'bitis',
        karsi: [
          _mesaj(
            'Yes, breakfast is from seven to ten. Enjoy your stay!',
            'Evet, kahvaltı yedi ile on arası. İyi konaklamalar!',
          ),
        ],
      ),
    ],
  ),
  // ------------------------------------------------------------- Almanca
  Senaryo(
    id: 'senaryo-de-cafe',
    kursOnek: 'almanca',
    dil: 'de-DE',
    baslik: 'Im Café',
    aciklama: 'Garsona bir içecek söyle ve hesabı öde.',
    dugumler: [
      SenaryoDugumu(
        id: 'basla',
        karsi: [
          _mesaj(
            'Guten Tag! Was möchten Sie trinken?',
            'İyi günler! Ne içmek istersiniz?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Ich möchte einen Kaffee, bitte.',
            anlam: 'Bir kahve istiyorum, lütfen.',
            sonraki: 'kaffee',
          ),
          SenaryoCevabi(
            metin: 'Ich möchte ein Wasser, bitte.',
            anlam: 'Bir su istiyorum, lütfen.',
            sonraki: 'wasser',
          ),
          SenaryoCevabi(
            metin: 'Ich bin ein Kaffee.',
            anlam: 'Ben bir kahveyim.',
            uygun: false,
            not:
                'Sipariş verirken "Ich möchte ..., bitte." denir; '
                '"Ich bin ..." kim olduğunu anlatır.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'kaffee',
        karsi: [_mesaj('Gerne. Mit Milch?', 'Memnuniyetle. Sütlü mü?')],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Ja, bitte.',
            anlam: 'Evet, lütfen.',
            sonraki: 'zahlen',
          ),
          SenaryoCevabi(
            metin: 'Nein, danke.',
            anlam: 'Hayır, teşekkürler.',
            sonraki: 'zahlen',
          ),
          SenaryoCevabi(
            metin: 'Gern geschehen.',
            anlam: 'Rica ederim.',
            uygun: false,
            not:
                '"Gern geschehen" teşekkürün cevabıdır. Süt sorusuna '
                '"Ja, bitte." ya da "Nein, danke." de.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'wasser',
        karsi: [
          _mesaj(
            'Gerne. Mit Kohlensäure oder ohne?',
            'Memnuniyetle. Gazlı mı, gazsız mı?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Ohne, bitte.',
            anlam: 'Gazsız, lütfen.',
            sonraki: 'zahlen',
          ),
          SenaryoCevabi(
            metin: 'Mit, bitte.',
            anlam: 'Gazlı, lütfen.',
            sonraki: 'zahlen',
          ),
          SenaryoCevabi(
            metin: 'Gern geschehen.',
            anlam: 'Rica ederim.',
            uygun: false,
            not:
                '"Gern geschehen" teşekkürün cevabıdır. Burada '
                '"Mit, bitte." ya da "Ohne, bitte." de.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'zahlen',
        karsi: [
          _mesaj('Das macht drei Euro fünfzig.', 'Üç euro elli sent tutuyor.'),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Hier, bitte.',
            anlam: 'Buyurun.',
            sonraki: 'bitis',
          ),
          SenaryoCevabi(
            metin: 'Gern geschehen.',
            anlam: 'Rica ederim.',
            uygun: false,
            not: 'Ödeme sırasında "Hier, bitte." (Buyurun.) dersin.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'bitis',
        karsi: [
          _mesaj(
            'Danke schön! Einen schönen Tag noch.',
            'Çok teşekkürler! İyi günler dilerim.',
          ),
        ],
      ),
    ],
  ),
  Senaryo(
    id: 'senaryo-de-vorstellen',
    kursOnek: 'almanca',
    dil: 'de-DE',
    baslik: 'Sich vorstellen',
    aciklama: 'Adını söyle, nerelisin ve nerede yaşıyorsun anlat.',
    dugumler: [
      SenaryoDugumu(
        id: 'basla',
        karsi: [
          _mesaj(
            'Hallo! Ich heiße Anna. Wie heißt du?',
            'Merhaba! Adım Anna. Senin adın ne?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Ich heiße Ali.',
            anlam: 'Adım Ali.',
            sonraki: 'woher',
          ),
          SenaryoCevabi(
            metin: 'Mir geht es gut.',
            anlam: 'İyiyim.',
            uygun: false,
            not:
                'Anna adını sordu. "Mir geht es gut" nasılsın sorusunun '
                'cevabıdır; adını söyle.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'woher',
        karsi: [
          _mesaj(
            'Freut mich, Ali. Woher kommst du?',
            'Memnun oldum, Ali. Nerelisin?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Ich komme aus der Türkei.',
            anlam: 'Türkiye’denim.',
            sonraki: 'tuerkei',
          ),
          SenaryoCevabi(
            metin: 'Ich komme aus Deutschland.',
            anlam: 'Almanya’danım.',
            sonraki: 'deutschland',
          ),
          SenaryoCevabi(
            metin: 'Ich bin zwanzig Jahre alt.',
            anlam: 'Yirmi yaşındayım.',
            uygun: false,
            not:
                '"Woher kommst du?" nereli olduğunu sorar; yaşını değil, '
                'ülkeni söyle.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'tuerkei',
        karsi: [
          _mesaj(
            'Ach, aus der Türkei! Sprichst du Deutsch?',
            'Ah, Türkiye’den! Almanca konuşuyor musun?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Ja, ein bisschen.',
            anlam: 'Evet, biraz.',
            sonraki: 'bitis',
          ),
          SenaryoCevabi(
            metin: 'Nein, danke.',
            anlam: 'Hayır, teşekkürler.',
            uygun: false,
            not:
                '"Danke" bir teklifi geri çevirirken kullanılır; bu soru '
                'bir teklif değil. "Ja, ein bisschen." ya da "Nein." de.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'deutschland',
        karsi: [
          _mesaj(
            'Ach, aus Deutschland! Wo wohnst du?',
            'Ah, Almanya’dan! Nerede oturuyorsun?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Ich wohne in Berlin.',
            anlam: 'Berlin’de oturuyorum.',
            sonraki: 'bitis',
          ),
          SenaryoCevabi(
            metin: 'Ich heiße Berlin.',
            anlam: 'Adım Berlin.',
            uygun: false,
            not: '"Wo wohnst du?" nerede oturduğunu sorar: "Ich wohne in ...".',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'bitis',
        karsi: [_mesaj('Das ist toll! Bis bald.', 'Harika! Görüşürüz.')],
      ),
    ],
  ),
  Senaryo(
    id: 'senaryo-de-weg',
    kursOnek: 'almanca',
    dil: 'de-DE',
    baslik: 'Nach dem Weg fragen',
    aciklama: 'Yoldaki birine istasyonu ya da eczaneyi sor.',
    dugumler: [
      SenaryoDugumu(
        id: 'basla',
        karsi: [
          _mesaj(
            'Hallo! Kann ich Ihnen helfen?',
            'Merhaba! Size yardım edebilir miyim?',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Entschuldigung, wo ist der Bahnhof?',
            anlam: 'Affedersiniz, tren istasyonu nerede?',
            sonraki: 'bahnhof',
          ),
          SenaryoCevabi(
            metin: 'Entschuldigung, wo ist die Apotheke?',
            anlam: 'Affedersiniz, eczane nerede?',
            sonraki: 'apotheke',
          ),
          SenaryoCevabi(
            metin: 'Ich heiße Ali.',
            anlam: 'Adım Ali.',
            uygun: false,
            not:
                'Yardım teklifine yolu sorarak cevap ver: '
                '"Entschuldigung, wo ist ...?".',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'bahnhof',
        karsi: [
          _mesaj(
            'Gehen Sie geradeaus und dann links.',
            'Düz gidin, sonra sola.',
          ),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Vielen Dank!',
            anlam: 'Çok teşekkürler!',
            sonraki: 'bitis',
          ),
          SenaryoCevabi(
            metin: 'Ich heiße Ali.',
            anlam: 'Adım Ali.',
            uygun: false,
            not: 'Tarif aldın; burada teşekkür etmek uygun olur.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'apotheke',
        karsi: [
          _mesaj('Die Apotheke ist hier rechts.', 'Eczane burada, sağda.'),
        ],
        cevaplar: const [
          SenaryoCevabi(
            metin: 'Vielen Dank!',
            anlam: 'Çok teşekkürler!',
            sonraki: 'bitis',
          ),
          SenaryoCevabi(
            metin: 'Ich heiße Ali.',
            anlam: 'Adım Ali.',
            uygun: false,
            not: 'Tarif aldın; burada teşekkür etmek uygun olur.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'bitis',
        karsi: [
          _mesaj(
            'Gern geschehen! Auf Wiedersehen.',
            'Rica ederim! Hoşça kalın.',
          ),
        ],
      ),
    ],
  ),
  // -------------------------------------------------------------- Korece
  Senaryo(
    id: 'senaryo-ko-tanisma',
    kursOnek: 'korece',
    dil: 'ko-KR',
    baslik: 'Tanışma',
    aciklama: 'Selamlaş, adını söyle.',
    dugumler: [
      SenaryoDugumu(
        id: 'basla',
        karsi: [_mesaj('안녕하세요? 저는 민수예요.', 'Merhaba! Ben Minsu.')],
        cevaplar: const [
          SenaryoCevabi(
            metin: '안녕하세요. 저는 알리예요.',
            anlam: 'Merhaba. Ben Ali.',
            sonraki: 'memnun',
          ),
          SenaryoCevabi(
            metin: '감사합니다.',
            anlam: 'Teşekkür ederim.',
            uygun: false,
            not:
                '"감사합니다" teşekkür içindir. Selamla ve adını söyle: '
                '"안녕하세요. 저는 ...예요."',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'memnun',
        karsi: [_mesaj('만나서 반갑습니다.', 'Tanıştığımıza memnun oldum.')],
        cevaplar: const [
          SenaryoCevabi(
            metin: '만나서 반갑습니다.',
            anlam: 'Tanıştığımıza memnun oldum.',
            sonraki: 'bitis',
          ),
          SenaryoCevabi(
            metin: '얼마예요?',
            anlam: 'Ne kadar?',
            uygun: false,
            not:
                '"얼마예요?" fiyat sorar. Tanışmaya "만나서 반갑습니다." '
                'diye karşılık ver.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'bitis',
        karsi: [_mesaj('저도 반갑습니다.', 'Ben de memnun oldum.')],
      ),
    ],
  ),
  Senaryo(
    id: 'senaryo-ko-alisveris',
    kursOnek: 'korece',
    dil: 'ko-KR',
    baslik: 'Alışveriş',
    aciklama: 'Fiyat sor ve alıp almayacağına karar ver.',
    dugumler: [
      SenaryoDugumu(
        id: 'basla',
        karsi: [_mesaj('어서 오세요.', 'Hoş geldiniz.')],
        cevaplar: const [
          SenaryoCevabi(
            metin: '이거 얼마예요?',
            anlam: 'Bu ne kadar?',
            sonraki: 'fiyat',
          ),
          SenaryoCevabi(
            metin: '안녕히 계세요.',
            anlam: 'Hoşça kalın.',
            uygun: false,
            not:
                '"안녕히 계세요" ayrılırken söylenir; içeri girerken '
                'fiyat sorabilirsin.',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'fiyat',
        karsi: [_mesaj('삼천 원이에요.', 'Üç bin won.')],
        cevaplar: const [
          SenaryoCevabi(
            metin: '이거 주세요.',
            anlam: 'Bunu verin lütfen.',
            sonraki: 'al',
          ),
          SenaryoCevabi(
            metin: '너무 비싸요.',
            anlam: 'Çok pahalı.',
            sonraki: 'alma',
          ),
        ],
      ),
      SenaryoDugumu(
        id: 'al',
        karsi: [_mesaj('감사합니다. 안녕히 가세요.', 'Teşekkürler. Güle güle.')],
      ),
      SenaryoDugumu(
        id: 'alma',
        karsi: [_mesaj('죄송합니다. 안녕히 가세요.', 'Üzgünüm. Güle güle.')],
      ),
    ],
  ),
]);
