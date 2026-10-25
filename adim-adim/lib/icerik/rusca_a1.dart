/// Rusça A1: Başlangıç (CEFR A1, TORFL elementary düzeyi). Dört ünite:
/// Kiril alfabesi ve selamlaşma; Tanışma ve sayılar; Dilbilgisi temelleri
/// (cinsiyet, çoğul, "var/yok", fiil çekimi); Günlük hayat (soru sözcükleri,
/// yer, yiyecek ve sipariş, saat, gün, ay). Anlatım Türkçe, içerik Rusçadır.
///
/// Yazı sistemi: Kiril. Her Rusça ifadenin yanında parantez içinde Latin
/// harfli okunuş verilir; vurgulu ünlü büyük harfle gösterilir (ör. privyEt).
/// Okunuş yaklaşıktır: vurgusuz o "a", vurgusuz e/ya "i" gibi okunur. Bu
/// kuralla yazıldı: ж = j, ш = ş, щ = şç, ч = ç, ц = ts, х = h, ы = ı,
/// э = e, ю = yu, я = ya, ё = yo, й = y. Yaz alıştırmalarında klavye
/// gerekmez: cevap Latin okunuş, Türkçe ya da rakamdır (Kiril yazısı da
/// kabul edilir). Kiril yazı Seçim, Boşluk, Sırala ve Eşleştir ile sunulur.
///
/// Yazı tipi: yeni yazı tipi gömülmez; Windows'un sistem yazı tipleri Kiril
/// harflerini gösterir. Sesli okuma için Windows'ta ru-RU ses paketi kurulu
/// olmalıdır (docs/KURS-RUSCA-A1-NOTLAR.md).
///
/// Sahibi Yusuf (yusufbesir). Yazan: [Claude#dalga12]. Değiştirme kuralı:
/// testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri
/// dönüşüm kutusuna.
library;

import '../model/icerik.dart';

const String _ru = 'ru-RU';

const Kurs ruscaA1 = Kurs(
  id: 'rusca-1',
  ad: 'Rusça A1: Başlangıç',
  aciklama:
      'Sıfırdan Rusça: Kiril alfabesi, selamlaşma, tanışma, sayılar, cinsiyet ve çoğul, fiiller, soru sözcükleri, yiyecek ve sipariş, saat, gün ve ay.',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'rusca-1.u1',
      ad: 'Kiril alfabesi ve selamlaşma',
      dersler: [
        Ders(
          id: 'rusca-1.u1.d1',
          ad: 'Kiril alfabesi 1: tanıdık harfler',
          dilbilgisiNotu:
              "Kiril alfabesinde 33 harf vardır. Latin harfleriyle aynı görünüp aynı okunanlar: А (a), К (k), М (m), О (o), Т (t). Benzeyip FARKLI okunanlar: В = v, Н = n, Р = r, С = s, У = u. Е \"ye\" okunur. Vurgusuz O \"a\" gibi okunur (молоко: malakO). Bu kursta okunuş parantez içinde verilir; vurgulu ünlü büyük harfle yazılır.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi sözcüğü duydun?',
              okunacak: 'мама',
              secenekler: ['мама', 'папа', 'там'],
              dogru: 0,
              dil: _ru,
              aciklama:
                  'мама (mAma) = anne. папа (pApa) = baba; там (tam) = orada.',
            ),
            Secim(
              soru: 'Kiril В harfi hangi sesi verir?',
              secenekler: ['v', 'b', 'w'],
              dogru: 0,
              aciklama:
                  'В = v: вода (vadA) = su. Latin B gibi görünür ama "v" okunur.',
            ),
            Secim(
              soru: 'Kiril Н harfi hangi sesi verir?',
              secenekler: ['n', 'h', 'p'],
              dogru: 0,
              aciklama:
                  'Н = n: нос (nos) = burun. Latin H gibi görünür ama "n" okunur.',
            ),
            Secim(
              soru: 'Kiril Р harfi hangi sesi verir?',
              secenekler: ['r', 'p', 'b'],
              dogru: 0,
              aciklama:
                  'Р = r (dil titretilir): рот (rot) = ağız. Latin P gibi görünür.',
            ),
            Bosluk(
              soru: 'С + О + К = ___ (meyve suyu)',
              secenekler: ['сок', 'кот', 'там'],
              dogru: 0,
              aciklama: 'сок (sok) = meyve suyu. кот (kot) = erkek kedi.',
            ),
            Bosluk(
              soru: 'Kedi: ___ (kot)',
              secenekler: ['кот', 'сок', 'там'],
              dogru: 0,
              aciklama: 'кот (kot) = erkek kedi; К + О + Т.',
            ),
            Yaz(
              soru: 'мама (mAma) sözcüğü Türkçede ne demektir?',
              cevaplar: ['anne'],
              aciklama: 'мама = anne.',
            ),
            Yaz(
              soru: 'Kiril yazılmış "сок" sözcüğünün okunuşunu yaz.',
              cevaplar: ['sok', 'сок'],
              aciklama: 'С (s) + О (o) + К (k) = sok (meyve suyu).',
            ),
            Sirala(
              soru: 'Harfleri sırala: kot (kedi).',
              kelimeler: ['Т', 'К', 'О'],
              dogru: ['К', 'О', 'Т'],
              aciklama: 'К + О + Т = кот (kot).',
            ),
            Eslestir(
              soru: 'Kiril harfini sesiyle eşleştir.',
              ciftler: [
                (sol: 'В', sag: 'v sesi'),
                (sol: 'Н', sag: 'n sesi'),
                (sol: 'Р', sag: 'r sesi'),
                (sol: 'С', sag: 's sesi'),
                (sol: 'У', sag: 'u sesi'),
              ],
              aciklama:
                  'Latin harflerine benzeyen ama farklı okunan beş harf: В (v), Н (n), Р (r), С (s), У (u).',
            ),
          ],
        ),
        Ders(
          id: 'rusca-1.u1.d2',
          ad: 'Kiril alfabesi 2: yeni harfler, ь ve ъ',
          dilbilgisiNotu:
              "Yeni harfler: Б b, Г g, Д d, Ж j (Türkçe j), З z, И i, Й y (kısa i), Л l, П p, Ф f, Х h, Ц ts, Ч ç, Ш ş, Щ şç, Ы ı, Э e, Ю yu, Я ya, Ё yo. Ь (yumuşatma işareti) kendi sesi olmayan bir harftir; önceki ünsüzü yumuşatır: день (dyen) = gün. Ъ (sert işaret) çok nadirdir: объект (abyEkt) = nesne.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi sözcüğü duydun?',
              okunacak: 'дом',
              secenekler: ['дом', 'том', 'дым'],
              dogru: 0,
              dil: _ru,
              aciklama: 'дом (dom) = ev. дым (dım) = duman.',
            ),
            Secim(
              soru: 'Kiril Ш harfi hangi sesi verir?',
              secenekler: ['ş', 'ç', 's'],
              dogru: 0,
              aciklama: 'Ш = ş: школа (şkOla) = okul.',
            ),
            Secim(
              soru: 'Kiril Ч harfi hangi sesi verir?',
              secenekler: ['ç', 'ş', 'ts'],
              dogru: 0,
              aciklama: 'Ч = ç: чай (çay) = çay.',
            ),
            Secim(
              soru: 'Ь (yumuşatma işareti) için hangisi doğrudur?',
              secenekler: [
                'Kendi sesi yoktur, önceki ünsüzü yumuşatır',
                'Kalın bir "u" sesi verir',
                'Sözcük sonunda "ya" diye okunur',
              ],
              dogru: 0,
              aciklama:
                  'Ь ses vermez; önceki ünsüzü yumuşatır: день (dyen), пять (pyat).',
            ),
            Bosluk(
              soru: 'Ev: ___ (dom)',
              secenekler: ['дом', 'дым', 'том'],
              dogru: 0,
              aciklama: 'дом (dom) = ev: Д + О + М.',
            ),
            Bosluk(
              soru: 'Kiril Ю harfi "___" sesini verir.',
              secenekler: ['yu', 'yo', 'ya'],
              dogru: 0,
              aciklama: 'Ю = yu; Ё = yo; Я = ya.',
            ),
            Yaz(
              soru: 'хлеб (hlyep) sözcüğü Türkçede ne demektir?',
              cevaplar: ['ekmek'],
              aciklama: 'хлеб = ekmek. Sondaki Б "p" gibi okunur.',
            ),
            Yaz(
              soru: 'Kiril yazılmış "школа" sözcüğünün okunuşunu yaz.',
              cevaplar: ['şkola', 'skola', 'shkola', 'школа'],
              aciklama: 'школа (şkOla) = okul. Ш = ş.',
            ),
            Sirala(
              soru: 'Harfleri sırala: dom (ev).',
              kelimeler: ['М', 'О', 'Д'],
              dogru: ['Д', 'О', 'М'],
              aciklama: 'Д + О + М = дом (dom).',
            ),
            Eslestir(
              soru: 'Kiril harfini sesiyle eşleştir.',
              ciftler: [
                (sol: 'Ж', sag: 'j (Türkçe j)'),
                (sol: 'Щ', sag: 'şç'),
                (sol: 'Ц', sag: 'ts'),
                (sol: 'Ы', sag: 'ı (kalın ı)'),
                (sol: 'Я', sag: 'ya'),
              ],
              aciklama:
                  'Ж = j (жизнь), Щ = şç, Ц = ts, Ы = ı (мы: mı), Я = ya (я: ya).',
            ),
          ],
        ),
        Ders(
          id: 'rusca-1.u1.d3',
          ad: 'Selamlaşma ve nezaket',
          dilbilgisiNotu:
              "Здравствуйте (zdrAstvuyte) resmi ve herkese söylenir (ilk в okunmaz); Привет (privyEt) samimidir. Доброе утро (günaydın), Добрый день (iyi günler), Добрый вечер (iyi akşamlar). Veda: До свидания (resmi), Пока (samimi). Спасибо = teşekkürler; Пожалуйста = lütfen ve rica ederim; Извините = affedersiniz.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi ifadeyi duydun?',
              okunacak: 'Здравствуйте',
              secenekler: ['Здравствуйте', 'Спасибо', 'Пожалуйста'],
              dogru: 0,
              dil: _ru,
              aciklama: 'Здравствуйте (zdrAstvuyte) = Merhaba (resmi).',
            ),
            Secim(
              soru: '"Спасибо (spasIba)" ne demektir?',
              secenekler: ['Teşekkürler', 'Lütfen', 'Günaydın'],
              dogru: 0,
              aciklama:
                  'Спасибо = Teşekkürler. Karşılığı: Пожалуйста (rica ederim).',
            ),
            Secim(
              soru: 'Arkadaşına samimi bir selam verirken ne dersin?',
              secenekler: [
                'Привет (privyEt)',
                'До свидания (da svidAniya)',
                'Спасибо (spasIba)',
              ],
              dogru: 0,
              aciklama: 'Привет = Selam. Resmi biçimi Здравствуйте.',
            ),
            Secim(
              soru: 'Sabah karşılaşınca ne dersin?',
              secenekler: [
                'Доброе утро (dObraye Utra)',
                'Спокойной ночи (spakOynay nOçi)',
                'Добрый вечер (dObrıy vyEçer)',
              ],
              dogru: 0,
              aciklama:
                  'Доброе утро = Günaydın. Спокойной ночи = İyi geceler; Добрый вечер = İyi akşamlar.',
            ),
            Bosluk(
              soru: 'Добрый ___! (İyi günler!)',
              secenekler: ['день', 'утро', 'ночь'],
              dogru: 0,
              aciklama:
                  'Добрый день (dObrıy dyen) = İyi günler. Утро nötr olduğu için "Доброе утро" denir.',
            ),
            Bosluk(
              soru: 'Спокойной ___! (İyi geceler!)',
              secenekler: ['ночи', 'дня', 'утра'],
              dogru: 0,
              aciklama: 'Спокойной ночи (spakOynay nOçi) = İyi geceler.',
            ),
            Yaz(
              soru: 'Rusçada "hayır" nasıl söylenir? Okunuşunu yaz.',
              cevaplar: ['nyet', 'net', 'нет'],
              aciklama: 'нет (nyet) = hayır, yok. да (da) = evet.',
            ),
            Yaz(
              soru: 'пожалуйста (pajAlsta) Türkçede ne demektir?',
              cevaplar: ['lütfen', 'rica ederim', 'lutfen'],
              aciklama:
                  'пожалуйста = lütfen; teşekküre karşılık "rica ederim".',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Hoşça kalın! (resmi)',
              kelimeler: ['свидания!', 'До'],
              dogru: ['До', 'свидания!'],
              aciklama:
                  'До свидания! (da svidAniya) = Hoşça kalın! / Görüşürüz!',
            ),
            Eslestir(
              soru: 'Rusça ifadeyi Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'Здравствуйте (zdrAstvuyte)', sag: 'Merhaba (resmi)'),
                (sol: 'Привет (privyEt)', sag: 'Selam'),
                (sol: 'Спасибо (spasIba)', sag: 'Teşekkürler'),
                (sol: 'Пожалуйста (pajAlsta)', sag: 'Lütfen / Rica ederim'),
                (sol: 'Извините (izvinIte)', sag: 'Affedersiniz'),
              ],
              aciklama:
                  'Здравствуйте = merhaba, Привет = selam, Спасибо = teşekkürler, Пожалуйста = lütfen, Извините = affedersiniz.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'rusca-1.u2',
      ad: 'Tanışma ve sayılar',
      dersler: [
        Ders(
          id: 'rusca-1.u2.d1',
          ad: 'Tanışma ve şahıs zamirleri',
          dilbilgisiNotu:
              "Меня зовут ... (minyA zavUt) = Adım ...; Как вас зовут? (kak vas zavUt) = Adınız nedir?; Очень приятно (Oçin priyAtna) = Memnun oldum; Я из Турции (ya iz tUrtsii) = Türkiye'denim. Zamirler: я (ben), ты (sen), он (o, erkek), она (o, kadın), оно (o, nötr), мы (biz), вы (siz), они (onlar). Şimdiki zamanda \"olmak\" fiili söylenmez: Я студент = Ben öğrenciyim. Kadında meslek ve uyruk değişir: студент / студентка, турок / турчанка.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Меня зовут Али',
              secenekler: ['Меня зовут Али', 'Меня зовут Анна', 'Я из Турции'],
              dogru: 0,
              dil: _ru,
              aciklama: 'Меня зовут Али (minyA zavUt alI) = Adım Ali.',
            ),
            Secim(
              soru: '"Как вас зовут? (kak vas zavUt)" ne sorar?',
              secenekler: ['Adınız nedir?', 'Nerelisiniz?', 'Nasılsınız?'],
              dogru: 0,
              aciklama:
                  'Как вас зовут? = Adınız nedir? Nerelisiniz? ise Откуда вы?',
            ),
            Eslestir(
              soru: 'Kalıbı Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'Меня зовут (minyA zavUt)', sag: 'Adım ...'),
                (sol: 'Как вас зовут? (kak vas zavUt)', sag: 'Adınız nedir?'),
                (sol: 'Очень приятно (Oçin priyAtna)', sag: 'Memnun oldum'),
                (sol: 'Откуда вы? (atkUda vı)', sag: 'Nerelisiniz?'),
                (sol: 'Я из Турции (ya iz tUrtsii)', sag: "Türkiye'denim"),
              ],
              aciklama:
                  "Tanışırken: Меня зовут..., Очень приятно, Откуда вы?, Я из Турции.",
            ),
            Bosluk(
              soru: 'Меня ___ Анна. (Adım Anna.)',
              secenekler: ['зовут', 'зовёт', 'звать'],
              dogru: 0,
              aciklama:
                  'Меня зовут Анна. "Beni çağırıyorlar: Anna" kalıbıdır; зовут sabittir.',
            ),
            Bosluk(
              soru: 'Я ___ Турции. (Türkiye\'denim.)',
              secenekler: ['из', 'в', 'на'],
              dogru: 0,
              aciklama: 'из = -den, -dan: Я из Турции (ya iz tUrtsii).',
            ),
            Tablo(
              soru: 'Şahıs zamirlerini tamamla.',
              baslik: ['Türkçe', 'Rusça'],
              satirlar: [
                ['ben', 'я'],
                ['sen', 'ты'],
                ['o (erkek)', 'он'],
                ['o (kadın)', 'она'],
                ['biz', 'мы'],
                ['siz', 'вы'],
                ['onlar', 'они'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 5, sutun: 1)],
              secenekler: ['вы', 'ты', 'они', 'она'],
              aciklama:
                  'sen = ты (tı, samimi), siz = вы (vı, resmi ya da çoğul). Diğerleri: я, он, она, мы, они.',
            ),
            Yaz(
              soru: 'Rusçada "ben" nasıl söylenir? Okunuşunu yaz.',
              cevaplar: ['ya', 'я'],
              aciklama: 'я (ya) = ben.',
            ),
            Yaz(
              soru: 'Türkçeye çevir: Я студент. (ya studyEnt)',
              cevaplar: ['ben öğrenciyim', 'öğrenciyim'],
              aciklama: 'Я студент = Ben öğrenciyim. "Olmak" fiili söylenmez.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Adım Anna.',
              kelimeler: ['Анна.', 'зовут', 'Меня'],
              dogru: ['Меня', 'зовут', 'Анна.'],
              aciklama: 'Меня зовут Анна. = Adım Anna.',
            ),
            Isaretle(
              soru: 'Cümledeki ülke adını işaretle.',
              cumle: 'Я из Турции.',
              dogru: [2],
              aciklama:
                  'Турции (tUrtsii) = Türkiye (-den hâlinde). Cümle: Türkiye\'denim.',
            ),
          ],
        ),
        Ders(
          id: 'rusca-1.u2.d2',
          ad: 'Sayılar 0-20',
          dilbilgisiNotu:
              "0 ноль (nol), 1 один (adIn), 2 два (dva), 3 три (tri), 4 четыре (çitIre), 5 пять (pyat), 6 шесть (şest), 7 семь (syem), 8 восемь (vOsyem), 9 девять (dEvyat), 10 десять (dEsyat). 11-19 sayı + -надцать (-natsat): одиннадцать (11), двенадцать (12), тринадцать (13), четырнадцать (14), пятнадцать (15), шестнадцать (16), семнадцать (17), восемнадцать (18), девятнадцать (19). 20 двадцать (dvAtsat).",
          alistirmalar: [
            Dinle(
              soru: 'Hangi sayıyı duydun?',
              okunacak: 'пять',
              secenekler: ['пять', 'шесть', 'семь'],
              dogru: 0,
              dil: _ru,
              aciklama: 'пять (pyat) = 5. шесть (şest) = 6; семь (syem) = 7.',
            ),
            Secim(
              soru: 'три (tri) hangi sayıdır?',
              secenekler: ['3', '2', '4'],
              dogru: 0,
              aciklama: 'три = 3; два = 2; четыре = 4.',
            ),
            Secim(
              soru: 'восемь (vOsyem) hangi sayıdır?',
              secenekler: ['8', '7', '9'],
              dogru: 0,
              aciklama: 'восемь = 8; семь = 7; девять = 9.',
            ),
            Secim(
              soru: 'десять (dEsyat) hangi sayıdır?',
              secenekler: ['10', '20', '11'],
              dogru: 0,
              aciklama: 'десять = 10; двадцать = 20; одиннадцать = 11.',
            ),
            Bosluk(
              soru: 'один, два, ___, четыре',
              secenekler: ['три', 'пять', 'шесть'],
              dogru: 0,
              aciklama: 'Sıra: один (1), два (2), три (3), четыре (4).',
            ),
            Bosluk(
              soru: 'семь, восемь, ___, десять',
              secenekler: ['девять', 'шесть', 'пять'],
              dogru: 0,
              aciklama: 'Sıra: семь (7), восемь (8), девять (9), десять (10).',
            ),
            Yaz(
              soru: 'Rakamla yaz: двенадцать (dvinAtsat)',
              cevaplar: ['12'],
              aciklama: 'двенадцать = 12 (два + -надцать).',
            ),
            Yaz(
              soru: 'Rusçada "iki" nasıl söylenir? Okunuşunu yaz.',
              cevaplar: ['dva', 'два'],
              aciklama: 'два (dva) = 2.',
            ),
            Sirala(
              soru: 'Sayıları küçükten büyüğe sırala: 1, 3, 5.',
              kelimeler: ['три', 'один', 'пять'],
              dogru: ['один', 'три', 'пять'],
              aciklama: 'один (1), три (3), пять (5).',
            ),
            Eslestir(
              soru: 'Rusça sayıyı rakamla eşleştir.',
              ciftler: [
                (sol: 'один (adIn)', sag: '1'),
                (sol: 'четыре (çitIre)', sag: '4'),
                (sol: 'семь (syem)', sag: '7'),
                (sol: 'девять (dEvyat)', sag: '9'),
                (sol: 'двадцать (dvAtsat)', sag: '20'),
              ],
              aciklama: 'один 1, четыре 4, семь 7, девять 9, двадцать 20.',
            ),
          ],
        ),
        Ders(
          id: 'rusca-1.u2.d3',
          ad: 'Onluklar ve fiyat',
          dilbilgisiNotu:
              "Onluklar: 10 десять, 20 двадцать (dvAtsat), 30 тридцать (trItsat), 40 сорок (sOrak), 50 пятьдесят (pyatdisyAt), 60 шестьдесят (şesdisyAt), 70 семьдесят (syEmdisyat), 80 восемьдесят (vOsyemdisyat), 90 девяносто (divinOsta), 100 сто (sto). Bileşik sayıda önce onluk, sonra birlik gelir: двадцать пять = 25. Fiyat: Сколько стоит? (skOlka stOit) = Ne kadar? Para birimi рубль (rubl): 1 рубль, 2-4 рубля, 5 ve üstü рублей.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi sayıyı duydun?',
              okunacak: 'тридцать',
              secenekler: ['тридцать', 'двадцать', 'сорок'],
              dogru: 0,
              dil: _ru,
              aciklama: 'тридцать (trItsat) = 30. двадцать = 20; сорок = 40.',
            ),
            Secim(
              soru: 'сорок (sOrak) hangi sayıdır?',
              secenekler: ['40', '14', '4'],
              dogru: 0,
              aciklama: 'сорок = 40; четырнадцать = 14; четыре = 4.',
            ),
            Secim(
              soru: '"двадцать пять" kaçtır?',
              secenekler: ['25', '35', '205'],
              dogru: 0,
              aciklama: 'двадцать (20) + пять (5) = 25.',
            ),
            Secim(
              soru: 'Fiyat sormak için hangisi söylenir?',
              secenekler: [
                'Сколько стоит? (skOlka stOit)',
                'Как вас зовут? (kak vas zavUt)',
                'Очень приятно (Oçin priyAtna)',
              ],
              dogru: 0,
              aciklama: 'Сколько стоит? = Ne kadar? (fiyatı ne?)',
            ),
            Bosluk(
              soru: 'Сколько ___? (Ne kadar?)',
              secenekler: ['стоит', 'зовут', 'есть'],
              dogru: 0,
              aciklama: 'Сколько стоит? (skOlka stOit) = Ne kadar?',
            ),
            Bosluk(
              soru: 'Это двадцать ___. (Bu yirmi ruble.)',
              secenekler: ['рублей', 'рубль', 'рубля'],
              dogru: 0,
              aciklama:
                  '5 ve üstü sayılarla рублей: двадцать рублей. 1 рубль, 2-4 рубля.',
            ),
            Yaz(
              soru: 'Rakamla yaz: пятьдесят (pyatdisyAt)',
              cevaplar: ['50'],
              aciklama: 'пятьдесят = 50 (пять + десят).',
            ),
            Yaz(
              soru: 'Rakamla yaz: сорок плюс сорок (40 + 40)',
              cevaplar: ['80'],
              aciklama: 'сорок + сорок = восемьдесят (80).',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Bu yirmi ruble.',
              kelimeler: ['рублей.', 'Это', 'двадцать'],
              dogru: ['Это', 'двадцать', 'рублей.'],
              aciklama:
                  'Это двадцать рублей. (Eta dvAtsat rubley) = Bu yirmi ruble.',
            ),
            Eslestir(
              soru: 'Rusça sayıyı rakamla eşleştir.',
              ciftler: [
                (sol: 'двадцать (dvAtsat)', sag: '20'),
                (sol: 'шестьдесят (şesdisyAt)', sag: '60'),
                (sol: 'семьдесят (syEmdisyat)', sag: '70'),
                (sol: 'девяносто (divinOsta)', sag: '90'),
                (sol: 'сто (sto)', sag: '100'),
              ],
              aciklama:
                  '20, 60, 70, 90 ve 100 Rusça: двадцать, шестьдесят, семьдесят, девяносто, сто.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'rusca-1.u3',
      ad: 'Dilbilgisi temelleri',
      dersler: [
        Ders(
          id: 'rusca-1.u3.d1',
          ad: 'Cinsiyet ve çoğul',
          dilbilgisiNotu:
              "Her isim üç cinsten biridir. Eril: çoğunlukla ünsüzle biter (стол: masa, дом: ev). Dişil: çoğunlukla -а / -я ile biter (книга: kitap, школа: okul). Nötr: -о / -е ile biter (окно: pencere, молоко: süt). Çoğul: eril ve dişil isimlerde -ы / -и (стол → столы, книга → книги); nötr isimlerde -а / -я (окно → окна). \"Benim\": мой (eril), моя (dişil), моё (nötr), мои (çoğul).",
          alistirmalar: [
            Dinle(
              soru: 'Hangi sözcüğü duydun?',
              okunacak: 'книга',
              secenekler: ['книга', 'окно', 'стол'],
              dogru: 0,
              dil: _ru,
              aciklama:
                  'книга (knIga) = kitap. окно (aknO) = pencere; стол (stol) = masa.',
            ),
            Secim(
              soru: 'стол (stol, masa) hangi cinstendir?',
              secenekler: ['Eril', 'Dişil', 'Nötr'],
              dogru: 0,
              aciklama: 'Ünsüzle biten isim eriltir: стол, дом.',
            ),
            Secim(
              soru: 'окно (aknO, pencere) hangi cinstendir?',
              secenekler: ['Nötr', 'Eril', 'Dişil'],
              dogru: 0,
              aciklama: '-о ile biten isim nötrdür: окно, молоко.',
            ),
            Eslestir(
              soru: 'Rusça sözcüğü Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'стол (stol)', sag: 'Masa'),
                (sol: 'книга (knIga)', sag: 'Kitap'),
                (sol: 'окно (aknO)', sag: 'Pencere'),
                (sol: 'молоко (malakO)', sag: 'Süt'),
                (sol: 'мама (mAma)', sag: 'Anne'),
              ],
              aciklama: 'стол eril, книга ve мама dişil, окно ve молоко nötr.',
            ),
            Bosluk(
              soru: '___ книга. (Benim kitabım.)',
              secenekler: ['Моя', 'Мой', 'Моё'],
              dogru: 0,
              aciklama: 'книга dişil olduğu için моя: Моя книга (mayA knIga).',
            ),
            Bosluk(
              soru: '___ дом. (Benim evim.)',
              secenekler: ['Мой', 'Моя', 'Моё'],
              dogru: 0,
              aciklama: 'дом eril olduğu için мой: Мой дом (moy dom).',
            ),
            Tablo(
              soru: 'Çoğul biçimleri tamamla.',
              baslik: ['Tekil', 'Çoğul'],
              satirlar: [
                ['книга', 'книги'],
                ['стол', 'столы'],
                ['окно', 'окна'],
                ['школа', 'школы'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: ['книги', 'окна', 'окно', 'столы'],
              aciklama:
                  'книга → книги, окно → окна. Diğerleri: стол → столы, школа → школы.',
            ),
            Yaz(
              soru: 'окно (aknO) Türkçede ne demektir?',
              cevaplar: ['pencere'],
              aciklama: 'окно = pencere.',
            ),
            Yaz(
              soru: 'Rusçada eril "benim" nasıl söylenir? Okunuşunu yaz.',
              cevaplar: ['moy', 'мой'],
              aciklama: 'мой (moy) = benim (eril): мой дом, мой стол.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Bu benim evim.',
              kelimeler: ['дом.', 'Это', 'мой'],
              dogru: ['Это', 'мой', 'дом.'],
              aciklama: 'Это мой дом. (Eta moy dom) = Bu benim evim.',
            ),
          ],
        ),
        Ders(
          id: 'rusca-1.u3.d2',
          ad: '"Olmak" fiili yok ve "var / yok": есть',
          dilbilgisiNotu:
              "Şimdiki zamanda \"olmak\" (быть) söylenmez: Это мой папа = Bu benim babam; Он дома = O evde. \"Var\" için есть (yest): У меня есть брат = Benim bir erkek kardeşim var (У меня = bende, У тебя = sende, У вас = sizde). \"Yok\" için нет + Genitiv (tamlayan/ilgi hâli) kullanılır; şimdilik kalıp olarak öğren: У меня нет брата, У меня нет сестры. Aile: мама, папа, брат (brat), сестра (sistrA), сын (sın), дочь (doç). Meslek: врач (vraç), учитель (uçItel).",
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'У меня есть брат',
              secenekler: [
                'У меня есть брат',
                'У меня есть сестра',
                'У меня нет брата',
              ],
              dogru: 0,
              dil: _ru,
              aciklama:
                  'У меня есть брат (u minyA yest brat) = Bir erkek kardeşim var.',
            ),
            Secim(
              soru: '"У меня есть сестра (u minyA yest sistrA)" ne demektir?',
              secenekler: [
                'Bir kız kardeşim var',
                'Bir erkek kardeşim var',
                'Kız kardeşim yok',
              ],
              dogru: 0,
              aciklama: 'сестра = kız kardeş; есть = var.',
            ),
            Bosluk(
              soru: 'У меня ___ брат. (Bir erkek kardeşim var.)',
              secenekler: ['есть', 'нет', 'это'],
              dogru: 0,
              aciklama: 'есть = var: У меня есть брат.',
            ),
            Bosluk(
              soru: 'У меня ___ сестры. (Kız kardeşim yok.)',
              secenekler: ['нет', 'есть', 'это'],
              dogru: 0,
              aciklama: 'нет = yok: У меня нет сестры (u minyA nyet sistrI).',
            ),
            Bosluk(
              soru: '___ мой папа. (Bu benim babam.)',
              secenekler: ['Это', 'Есть', 'Нет'],
              dogru: 0,
              aciklama:
                  'Это (Eta) = Bu: Это мой папа. "Olmak" fiili söylenmez.',
            ),
            Yaz(
              soru: 'брат (brat) Türkçede ne demektir?',
              cevaplar: ['erkek kardeş', 'kardeş', 'abi', 'ağabey'],
              aciklama: 'брат = erkek kardeş (abi ya da kardeş).',
            ),
            Yaz(
              soru: 'Rusçada "kız kardeş" nasıl söylenir? Okunuşunu yaz.',
              cevaplar: ['sistra', 'sestra', 'сестра'],
              aciklama: 'сестра (sistrA) = kız kardeş.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Bir erkek kardeşim var.',
              kelimeler: ['брат.', 'У', 'есть', 'меня'],
              dogru: ['У', 'меня', 'есть', 'брат.'],
              aciklama: 'У меня есть брат. = Bir erkek kardeşim var.',
            ),
            Eslestir(
              soru: 'Aile ve meslek sözcüklerini eşleştir.',
              ciftler: [
                (sol: 'мама (mAma)', sag: 'Anne'),
                (sol: 'папа (pApa)', sag: 'Baba'),
                (sol: 'сын (sın)', sag: 'Oğul'),
                (sol: 'врач (vraç)', sag: 'Doktor'),
                (sol: 'учитель (uçItel)', sag: 'Öğretmen'),
              ],
              aciklama: 'мама, папа, сын (aile); врач, учитель (meslek).',
            ),
          ],
        ),
        Ders(
          id: 'rusca-1.u3.d3',
          ad: 'Fiil şimdiki zaman ve olumsuzluk',
          dilbilgisiNotu:
              "Fiil mastarı -ть ile biter: читать (çitAt, okumak), говорить (gavarIt, konuşmak). 1. çekim: читать → я читаю, ты читаешь, он читает, мы читаем, вы читаете, они читают. 2. çekim: говорить → я говорю (gavaryU), ты говоришь, он говорит, мы говорим, вы говорите, они говорят. Olumsuzluk için не fiilin önüne konur: Я не читаю. Rusça konuşmak: говорить по-русски (gavarIt pa-rUski).",
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Я говорю',
              secenekler: ['Я говорю', 'Я читаю', 'Я не читаю'],
              dogru: 0,
              dil: _ru,
              aciklama:
                  'Я говорю (ya gavaryU) = Konuşuyorum. Я читаю = Okuyorum.',
            ),
            Secim(
              soru: '"читать (çitAt)" ne demektir?',
              secenekler: ['Okumak', 'Konuşmak', 'Yazmak'],
              dogru: 0,
              aciklama: 'читать = okumak: Я читаю книгу.',
            ),
            Secim(
              soru: '"говорить (gavarIt)" ne demektir?',
              secenekler: ['Konuşmak', 'Okumak', 'Bilmek'],
              dogru: 0,
              aciklama: 'говорить = konuşmak: Я говорю по-русски.',
            ),
            Tablo(
              soru: 'читать fiilinin çekimini tamamla.',
              baslik: ['Zamir', 'читать'],
              satirlar: [
                ['я', 'читаю'],
                ['ты', 'читаешь'],
                ['он/она', 'читает'],
                ['мы', 'читаем'],
                ['вы', 'читаете'],
                ['они', 'читают'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 3, sutun: 1)],
              secenekler: ['читаешь', 'читаем', 'читаю', 'читает'],
              aciklama:
                  'ты читаешь, мы читаем. Diğerleri: я читаю, он читает, вы читаете, они читают.',
            ),
            Bosluk(
              soru: 'Мы ___ по-русски. (Biz Rusça konuşuyoruz.)',
              secenekler: ['говорим', 'говорю', 'говорят'],
              dogru: 0,
              aciklama: 'мы говорим (mı gavarIm); я говорю, они говорят.',
            ),
            Bosluk(
              soru: 'Я не ___ по-русски. (Rusça konuşmuyorum.)',
              secenekler: ['говорю', 'говорит', 'говоришь'],
              dogru: 0,
              aciklama:
                  'я говорю: Я не говорю по-русски. (ya nye gavaryU pa-rUski)',
            ),
            Yaz(
              soru:
                  'Rusçada olumsuzluk sözcüğü nedir ("değil, -me")? Okunuşunu yaz.',
              cevaplar: ['ne', 'nye', 'не'],
              aciklama: 'не (nye) fiilin önüne konur: Я не читаю.',
            ),
            Yaz(
              soru: 'Türkçeye çevir: Я читаю. (ya çitAyu)',
              cevaplar: ['okuyorum', 'ben okuyorum'],
              aciklama: 'Я читаю = Okuyorum.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Rusça konuşmuyorum.',
              kelimeler: ['по-русски.', 'Я', 'не', 'говорю'],
              dogru: ['Я', 'не', 'говорю', 'по-русски.'],
              aciklama: 'Я не говорю по-русски. = Rusça konuşmuyorum.',
            ),
            Isaretle(
              soru: 'Cümledeki olumsuzluk sözcüğünü işaretle.',
              cumle: 'Он не читает книгу.',
              dogru: [1],
              aciklama:
                  'не = değil. Cümle: O kitabı okumuyor. (книга → книгу: nesne hâli)',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'rusca-1.u4',
      ad: 'Günlük hayat',
      dersler: [
        Ders(
          id: 'rusca-1.u4.d1',
          ad: 'Soru sözcükleri ve yer: в / на',
          dilbilgisiNotu:
              "Soru sözcükleri: Кто? (kto) kim?, Что? (şto) ne?, Где? (gdye) nerede?, Как? (kak) nasıl?, Когда? (kagdA) ne zaman? Soru cümlesinde sözcük sırası değişmez, yalnızca ses yükselir. Yer bildirmek için в (içinde: в доме, в школе, в Москве) ya da на (açık alan, iş yeri, etkinlik: на работе, на улице) ve sözcüğün sonuna -е eklenir (Prepositiv hâl): Москва → в Москве, школа → в школе, работа → на работе. Я живу в Москве = Moskova'da yaşıyorum.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi soruyu duydun?',
              okunacak: 'Где школа?',
              secenekler: ['Где школа?', 'Кто это?', 'Что это?'],
              dogru: 0,
              dil: _ru,
              aciklama:
                  'Где школа? (gdye şkOla) = Okul nerede? Кто это? = Bu kim?',
            ),
            Eslestir(
              soru: 'Soru sözcüğünü Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'Кто (kto)', sag: 'Kim'),
                (sol: 'Что (şto)', sag: 'Ne'),
                (sol: 'Где (gdye)', sag: 'Nerede'),
                (sol: 'Как (kak)', sag: 'Nasıl'),
                (sol: 'Когда (kagdA)', sag: 'Ne zaman'),
              ],
              aciklama:
                  'Кто = kim, Что = ne, Где = nerede, Как = nasıl, Когда = ne zaman.',
            ),
            Secim(
              soru: '"Как дела? (kak dilA)" ne anlama gelir?',
              secenekler: ['Nasılsın? / Ne haber?', 'Adın ne?', 'Nerelisin?'],
              dogru: 0,
              aciklama:
                  'Как дела? = Nasılsın? Cevap: Хорошо, спасибо (harashO, spasIba) = İyi, teşekkürler.',
            ),
            Bosluk(
              soru: '___ это? (Bu kim?)',
              secenekler: ['Кто', 'Что', 'Где'],
              dogru: 0,
              aciklama: 'Кто = kim (kişi için); Что = ne (nesne için).',
            ),
            Bosluk(
              soru: 'Я живу ___ Москве. (Moskova\'da yaşıyorum.)',
              secenekler: ['в', 'на', 'из'],
              dogru: 0,
              aciklama: 'в + Москве: Я живу в Москве (ya jivU v maskvE).',
            ),
            Bosluk(
              soru: 'Мама ___ работе. (Annem iş yerinde.)',
              secenekler: ['на', 'в', 'из'],
              dogru: 0,
              aciklama:
                  'на работе (na rabOte) = iş yerinde. "İş" ile на kullanılır.',
            ),
            Tablo(
              soru: 'Yer hâlini tamamla (в / на + -е).',
              baslik: ['Yalın', 'Yer hâli'],
              satirlar: [
                ['Москва', 'в Москве'],
                ['школа', 'в школе'],
                ['работа', 'на работе'],
                ['дом', 'в доме'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: ['в школе', 'на работе', 'в доме', 'в Москве'],
              aciklama:
                  'школа → в школе, работа → на работе. Diğerleri: в Москве, в доме.',
            ),
            Yaz(
              soru: 'Rusçada "nerede" nasıl söylenir? Okunuşunu yaz.',
              cevaplar: ['gdye', 'gde', 'где'],
              aciklama: 'где (gdye) = nerede.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Moskova\'da yaşıyorum.',
              kelimeler: ['Москве.', 'в', 'Я', 'живу'],
              dogru: ['Я', 'живу', 'в', 'Москве.'],
              aciklama: 'Я живу в Москве. = Moskova\'da yaşıyorum.',
            ),
            Isaretle(
              soru: 'Cümlede yeri bildiren iki sözcüğü işaretle (в + yer).',
              cumle: 'Я живу в Москве.',
              dogru: [2, 3],
              aciklama: 'в Москве = Moskova\'da: в ve yer adı (Prepositiv).',
            ),
          ],
        ),
        Ders(
          id: 'rusca-1.u4.d2',
          ad: 'Yiyecek ve sipariş',
          dilbilgisiNotu:
              "Yiyecek: хлеб (hlyep) ekmek, вода (vadA) su, чай (çay) çay, кофе (kOfe) kahve, молоко (malakO) süt, сыр (sır) peynir, мясо (myAsa) et, яблоко (yAbloka) elma. Sipariş: Я хочу чай (ya haçU çay) = Çay istiyorum; Дайте, пожалуйста, воду = Bana su verir misiniz?; Можно меню? (mOjna minyU) = Menü alabilir miyim?; Счёт, пожалуйста = Hesap lütfen. Nesne hâli (Akkusativ): -а → -у, -я → -ю: вода → воду, книга → книгу, мама → маму. Eril cansız ve nötr isimlerde yalınla aynıdır (чай, хлеб, молоко); кофе değişmez.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'Я хочу чай',
              secenekler: ['Я хочу чай', 'Я хочу воду', 'Я люблю чай'],
              dogru: 0,
              dil: _ru,
              aciklama:
                  'Я хочу чай (ya haçU çay) = Çay istiyorum. воду = su (nesne hâli).',
            ),
            Secim(
              soru: '"хлеб (hlyep)" ne demektir?',
              secenekler: ['Ekmek', 'Süt', 'Peynir'],
              dogru: 0,
              aciklama: 'хлеб = ekmek; молоко = süt; сыр = peynir.',
            ),
            Secim(
              soru: 'Garsondan hesabı isterken ne dersin?',
              secenekler: [
                'Счёт, пожалуйста (şçot pajAlsta)',
                'Можно меню? (mOjna minyU)',
                'Я хочу чай (ya haçU çay)',
              ],
              dogru: 0,
              aciklama:
                  'Счёт, пожалуйста = Hesap lütfen. Можно меню? = Menü alabilir miyim?',
            ),
            Bosluk(
              soru: 'Я хочу ___. (Su istiyorum.)',
              secenekler: ['воду', 'вода', 'водой'],
              dogru: 0,
              aciklama: 'Nesne hâli: вода → воду: Я хочу воду (ya haçU vOdu).',
            ),
            Bosluk(
              soru: 'Я люблю ___. (Kahveyi severim.)',
              secenekler: ['кофе', 'кофу', 'кофы'],
              dogru: 0,
              aciklama: 'кофе değişmez: Я люблю кофе (ya lyublyU kOfe).',
            ),
            Tablo(
              soru: 'Nesne hâlini (Akkusativ) tamamla.',
              baslik: ['Yalın', 'Nesne hâli'],
              satirlar: [
                ['вода', 'воду'],
                ['книга', 'книгу'],
                ['мама', 'маму'],
                ['чай', 'чай'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: ['воду', 'маму', 'книгу', 'вода'],
              aciklama:
                  'вода → воду, мама → маму. Eril cansız isimde değişmez: чай → чай.',
            ),
            Yaz(
              soru: 'вода (vadA) Türkçede ne demektir?',
              cevaplar: ['su'],
              aciklama: 'вода = su.',
            ),
            Yaz(
              soru: 'Rusçada "çay" nasıl söylenir? Okunuşunu yaz.',
              cevaplar: ['çay', 'chay', 'cay', 'чай'],
              aciklama: 'чай (çay) = çay.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Bana su verir misiniz, lütfen?',
              kelimeler: ['воду.', 'Дайте,', 'пожалуйста,'],
              dogru: ['Дайте,', 'пожалуйста,', 'воду.'],
              aciklama: 'Дайте, пожалуйста, воду. (dAyte, pajAlsta, vOdu)',
            ),
            Eslestir(
              soru: 'Yiyecek sözcüğünü Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'чай (çay)', sag: 'Çay'),
                (sol: 'молоко (malakO)', sag: 'Süt'),
                (sol: 'сыр (sır)', sag: 'Peynir'),
                (sol: 'мясо (myAsa)', sag: 'Et'),
                (sol: 'яблоко (yAbloka)', sag: 'Elma'),
              ],
              aciklama:
                  'чай, молоко, сыр, мясо, яблоко: sık kullanılan yiyecekler.',
            ),
          ],
        ),
        Ders(
          id: 'rusca-1.u4.d3',
          ad: 'Saat, gün ve ay',
          dilbilgisiNotu:
              "Который час? (katOrıy ças) = Saat kaç? Сейчас три часа (siçAs tri çasA) = Saat şimdi üç. Saat: 1 час, 2-4 часа, 5 ve üstü часов. Günler: понедельник (panidyElnik), вторник (ftOrnik), среда (sridA), четверг (çitvyErk), пятница (pyAtnitsa), суббота (subOta), воскресенье (vaskrisyEnye). Aylar: январь, февраль, март, апрель, май, июнь, июль, август, сентябрь, октябрь, ноябрь, декабрь. Gün ve ay adları küçük harfle yazılır. Сегодня = bugün, завтра = yarın, вчера = dün.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi günü duydun?',
              okunacak: 'понедельник',
              secenekler: ['понедельник', 'вторник', 'суббота'],
              dogru: 0,
              dil: _ru,
              aciklama:
                  'понедельник (panidyElnik) = pazartesi. вторник = salı; суббота = cumartesi.',
            ),
            Secim(
              soru: '"сегодня (sivOdnya)" ne demektir?',
              secenekler: ['Bugün', 'Yarın', 'Dün'],
              dogru: 0,
              aciklama: 'сегодня = bugün; завтра = yarın; вчера = dün.',
            ),
            Secim(
              soru: '"Который час? (katOrıy ças)" ne sorar?',
              secenekler: ['Saat kaç?', 'Bugün hangi gün?', 'Hava nasıl?'],
              dogru: 0,
              aciklama: 'Который час? = Saat kaç? Cevap: Сейчас три часа.',
            ),
            Eslestir(
              soru: 'Günü Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'понедельник (panidyElnik)', sag: 'Pazartesi'),
                (sol: 'среда (sridA)', sag: 'Çarşamba'),
                (sol: 'пятница (pyAtnitsa)', sag: 'Cuma'),
                (sol: 'воскресенье (vaskrisyEnye)', sag: 'Pazar'),
                (sol: 'завтра (zAftra)', sag: 'Yarın'),
              ],
              aciklama:
                  'понедельник pazartesi, среда çarşamba, пятница cuma, воскресенье pazar.',
            ),
            Bosluk(
              soru: 'Сейчас три ___. (Saat şimdi üç.)',
              secenekler: ['часа', 'часов', 'час'],
              dogru: 0,
              aciklama: '2, 3, 4 ile часа: три часа. 1 час, 5 ve üstü часов.',
            ),
            Bosluk(
              soru: 'Сегодня ___. (Bugün cumartesi.)',
              secenekler: ['суббота', 'субботу', 'субботы'],
              dogru: 0,
              aciklama: 'Сегодня суббота (sivOdnya subOta) = Bugün cumartesi.',
            ),
            Tablo(
              soru: 'Ay adlarını tamamla.',
              baslik: ['Ay no', 'Ay'],
              satirlar: [
                ['1', 'январь'],
                ['3', 'март'],
                ['5', 'май'],
                ['10', 'октябрь'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 3, sutun: 1)],
              secenekler: ['март', 'октябрь', 'январь', 'май'],
              aciklama:
                  '3. ay март (mart), 10. ay октябрь (aktyAbr). Diğerleri: январь, май.',
            ),
            Yaz(
              soru: 'Rusçada "yarın" nasıl söylenir? Okunuşunu yaz.',
              cevaplar: ['zaftra', 'zavtra', 'завтра'],
              aciklama: 'завтра (zAftra) = yarın.',
            ),
            Yaz(
              soru: 'Rakamla yaz: Сейчас восемь часов. (Saat kaç?)',
              cevaplar: ['8', '8:00', '08:00'],
              aciklama: 'восемь = 8. Сейчас восемь часов = Saat şimdi sekiz.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Saat şimdi üç.',
              kelimeler: ['часа.', 'Сейчас', 'три'],
              dogru: ['Сейчас', 'три', 'часа.'],
              aciklama: 'Сейчас три часа. (siçAs tri çasA) = Saat şimdi üç.',
            ),
          ],
        ),
      ],
    ),
  ],
);
