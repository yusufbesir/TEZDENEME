/// Arapça A1: Başlangıç (Modern Standart Arapça, CEFR A1). Dört ünite:
/// Alfabe ve selamlaşma; Tanışma, zamirler ve sayılar; Dilbilgisi temelleri
/// (müzekker/müennes, belirli artikel, işaret zamirleri, isim cümlesi, çoğul,
/// sahiplik); Günlük hayat (soru edatları, basit fiil, yiyecek, aile, saat).
/// Anlatım Türkçe, içerik Arapçadır.
///
/// Yazı sistemi: Arapça, sağdan sola. Her Arapça ifadenin yanında parantez
/// içinde Latin harfli okunuş verilir. Okunuş yaklaşıktır: aa/ii/uu uzun
/// ünlü yok; ش = ş, ج = c (Türkçe c), خ = kh/h, ع boğazdan "a", غ = ğ, ق = q (derin k).
/// Ünlü işaretleri (harekeler) yalnız öğretici sözcüklerde gösterilir;
/// diğer sözcükler harekesiz yazılır. Yaz alıştırmalarında klavye gerekmez:
/// cevap Latin okunuş ya da Türkçedir (Arapça yazı da kabul edilir, Türkçe →
/// Arapça yazdırma yok).
///
/// Yön: karışık metin (Arapça + Latin okunuş + Türkçe) Flutter'ın Unicode
/// çift yönlü algoritmasıyla doğru sıralanır; Sirala/İşaretle parçaları
/// sağdan sola akar (bilesenler/alistirma/yon.dart). Arapça sözcüğün hemen
/// ardına "." konmaz (düzen bozulmasın); soru işareti "؟" kullanılır.
///
/// Yazı tipi: yeni yazı tipi gömülmez; Windows'un sistem yazı tipleri Arapça
/// harfleri gösterir. Sesli okuma için ar-SA ses paketi kurulu olmalıdır
/// (docs/KURS-ARAPCA-A1-NOTLAR.md).
///
/// Sahibi Yusuf (yusufbesir). Yazan: [Claude#dalga13]. Değiştirme kuralı:
/// testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri
/// dönüşüm kutusuna.
library;

import '../model/icerik.dart';

const String _ar = 'ar-SA';

const Kurs arapcaA1 = Kurs(
  id: 'arapca-1',
  ad: 'Arapça A1: Başlangıç',
  aciklama:
      'Sıfırdan Arapça: alfabe ve harf şekilleri, harekeler, selamlaşma, tanışma, zamirler, sayılar, müzekker/müennes, belirli artikel, işaret zamirleri, isim cümlesi, sahiplik, soru edatları, basit fiil, yiyecek, aile ve saat.',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'arapca-1.u1',
      ad: 'Alfabe ve selamlaşma',
      dersler: [
        Ders(
          id: 'arapca-1.u1.d1',
          ad: 'Arap alfabesi 1: harf şekilleri',
          dilbilgisiNotu:
              "Arapça sağdan sola yazılır ve 28 harften oluşur. Harfler bitişik yazılır; çoğu harfin 4 şekli vardır: tek, başta, ortada, sonda (ب: بـ / ـبـ / ـب). Altı harf (ا د ذ ر ز و) kendinden sonraki harfe BİTİŞMEZ. İlk harfler: ا (elif, aa), ب (b), ت (t), ن (n), م (m), ل (l), ك (k), س (s). Örnek: كتاب (kitaab) = kitap, بيت (bayt) = ev, باب (baab) = kapı.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi sözcüğü duydun?',
              okunacak: 'كتاب',
              secenekler: ['كتاب', 'بيت', 'باب'],
              dogru: 0,
              dil: _ar,
              aciklama:
                  'كتاب (kitaab) = kitap. بيت (bayt) = ev; باب (baab) = kapı.',
            ),
            Secim(
              soru: 'Arapça hangi yönde yazılır?',
              secenekler: ['Sağdan sola', 'Soldan sağa', 'Yukarıdan aşağıya'],
              dogru: 0,
              aciklama:
                  'Arapça sağdan sola yazılır; sayılar ise soldan sağa okunur.',
            ),
            Secim(
              soru: 'Arap alfabesinde kaç harf vardır?',
              secenekler: ['28', '26', '33'],
              dogru: 0,
              aciklama: 'Arap alfabesi 28 harftir (ا ... ي).',
            ),
            Secim(
              soru: 'ا (elif) hangi sesi verir?',
              secenekler: ['Uzun a (aa)', 'b', 't'],
              dogru: 0,
              aciklama: 'ا uzun "aa" sesini verir: باب (baab).',
            ),
            Eslestir(
              soru: 'Harfi sesiyle eşleştir.',
              ciftler: [
                (sol: 'ب', sag: 'b sesi'),
                (sol: 'ت', sag: 't sesi'),
                (sol: 'ن', sag: 'n sesi'),
                (sol: 'م', sag: 'm sesi'),
                (sol: 'ل', sag: 'l sesi'),
              ],
              aciklama: 'ب (b), ت (t), ن (n), م (m), ل (l).',
            ),
            Bosluk(
              soru: 'Kitap: ___ (kitaab)',
              secenekler: ['كتاب', 'باب', 'بيت'],
              dogru: 0,
              aciklama: 'كتاب (kitaab) = kitap. باب = kapı; بيت = ev.',
            ),
            Yaz(
              soru: 'بيت (bayt) sözcüğü Türkçede ne demektir?',
              cevaplar: ['ev'],
              aciklama: 'بيت = ev.',
            ),
            Yaz(
              soru: 'Arapça yazılmış "باب" sözcüğünün okunuşunu yaz.',
              cevaplar: ['baab', 'bab', 'باب'],
              aciklama: 'ب (b) + ا (aa) + ب (b) = baab (kapı).',
            ),
            Sirala(
              soru: 'Harfleri sırala: kitaab (kitap). Sağdan başla.',
              kelimeler: ['ت', 'ب', 'ك', 'ا'],
              dogru: ['ك', 'ت', 'ا', 'ب'],
              aciklama: 'ك + ت + ا + ب = كتاب (kitaab). Sağdan sola yazılır.',
            ),
            Isaretle(
              soru: 'Harflerin içinde "elif" harfini işaretle.',
              cumle: 'ك ت ا ب',
              dogru: [2],
              aciklama:
                  'ا (elif) üçüncü harftir; kendinden sonraki harfe bitişmez.',
            ),
          ],
        ),
        Ders(
          id: 'arapca-1.u1.d2',
          ad: 'Arap alfabesi 2: ünlüler ve harekeler',
          dilbilgisiNotu:
              "Arapçada kısa ünlüler harf değil, harfin üstüne/altına konan harekelerdir: فَتْحَة ـَ (fetha) = a, كَسْرَة ـِ (kesra) = i, ضَمَّة ـُ (damme) = u; سُكُون ـْ (sükun) = ünlüsüz. Uzun ünlüler harfle yazılır: ا (aa), ي (ii), و (uu). Günlük yazıda harekeler çoğunlukla yazılmaz. Yeni harfler: د (d), ر (r), و (w/uu), ي (y/ii), ه (h). Örnek: بَ (ba), بِ (bi), بُ (bu); درس (dars) = ders, نور (nuur) = ışık, ولد (walad) = oğlan.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi sözcüğü duydun?',
              okunacak: 'ولد',
              secenekler: ['ولد', 'بيت', 'باب'],
              dogru: 0,
              dil: _ar,
              aciklama: 'ولد (walad) = oğlan, çocuk. بيت = ev; باب = kapı.',
            ),
            Secim(
              soru: 'ـَ (fetha) hangi sesi verir?',
              secenekler: ['a', 'i', 'u'],
              dogru: 0,
              aciklama: 'بَ = ba. Fetha harfin üstüne konur.',
            ),
            Secim(
              soru: 'ـِ (kesra) hangi sesi verir?',
              secenekler: ['i', 'a', 'u'],
              dogru: 0,
              aciklama: 'بِ = bi. Kesra harfin altına konur.',
            ),
            Secim(
              soru: 'ـْ (sükun) ne anlama gelir?',
              secenekler: [
                'Harfin ünlüsü yoktur',
                'Uzun ünlü',
                'Ünsüz ikilenir',
              ],
              dogru: 0,
              aciklama:
                  'Sükun, harfin ünlüsüz okunduğunu gösterir: دَرْس (dars).',
            ),
            Eslestir(
              soru: 'Harekeli harfi sesiyle eşleştir.',
              ciftler: [
                (sol: 'بَ', sag: 'ba'),
                (sol: 'بِ', sag: 'bi'),
                (sol: 'بُ', sag: 'bu'),
                (sol: 'بْ', sag: 'b (ünlüsüz)'),
              ],
              aciklama: 'fetha = a, kesra = i, damme = u, sükun = ünlüsüz.',
            ),
            Bosluk(
              soru: 'Ders: ___ (dars)',
              secenekler: ['درس', 'ولد', 'نور'],
              dogru: 0,
              aciklama: 'درس (dars) = ders. ولد = oğlan; نور = ışık.',
            ),
            Yaz(
              soru: 'نور (nuur) sözcüğü Türkçede ne demektir?',
              cevaplar: ['ışık', 'isik', 'nur'],
              aciklama: 'نور = ışık, nur.',
            ),
            Tablo(
              soru: 'Uzun ünlü harflerini tamamla.',
              baslik: ['Ses', 'Harf'],
              satirlar: [
                ['aa', 'ا'],
                ['ii', 'ي'],
                ['uu', 'و'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: ['ي', 'و', 'ا'],
              aciklama: 'aa = ا, ii = ي, uu = و.',
            ),
            Sirala(
              soru: 'Harfleri sırala: dars (ders). Sağdan başla.',
              kelimeler: ['س', 'ر', 'د'],
              dogru: ['د', 'ر', 'س'],
              aciklama: 'د + ر + س = درس (dars).',
            ),
          ],
        ),
        Ders(
          id: 'arapca-1.u1.d3',
          ad: 'Selamlaşma',
          dilbilgisiNotu:
              "السلام عليكم (essalaamu aleykum) = Selam size olsun (genel selam); cevabı وعليكم السلام (ve aleykumus selaam). مرحبا (marhaban) = Merhaba. أهلا وسهلا (ehlen ve sehlen) = Hoş geldin. صباح الخير (sabaahul hayr) = Günaydın; cevabı صباح النور (sabaahun nuur). شكرا (şukran) = Teşekkürler. عفوا (afwan) = Rica ederim. مع السلامة (maas selaame) = Hoşça kal. نعم (naam) = Evet, لا (laa) = Hayır, من فضلك (min fadlik) = Lütfen.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi ifadeyi duydun?',
              okunacak: 'شكرا',
              secenekler: ['شكرا', 'مرحبا', 'نعم'],
              dogru: 0,
              dil: _ar,
              aciklama:
                  'شكرا (şukran) = teşekkürler. مرحبا = merhaba; نعم = evet.',
            ),
            Dinle(
              soru: 'Hangi selamı duydun?',
              okunacak: 'السلام عليكم',
              secenekler: ['السلام عليكم', 'مع السلامة', 'صباح الخير'],
              dogru: 0,
              dil: _ar,
              aciklama:
                  'السلام عليكم (essalaamu aleykum) = selam. مع السلامة = hoşça kal; صباح الخير = günaydın.',
            ),
            Secim(
              soru: 'السلام عليكم (essalaamu aleykum) ne anlama gelir?',
              secenekler: ['Selam size olsun', 'Teşekkürler', 'Hoşça kal'],
              dogru: 0,
              aciklama: 'Genel selamlaşma kalıbıdır.',
            ),
            Secim(
              soru: 'السلام عليكم selamına hangi cevap verilir?',
              secenekler: ['وعليكم السلام', 'شكرا', 'مع السلامة'],
              dogru: 0,
              aciklama: 'Cevap: وعليكم السلام (ve aleykumus selaam).',
            ),
            Eslestir(
              soru: 'İfadeyi Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'مرحبا (marhaban)', sag: 'Merhaba'),
                (sol: 'شكرا (şukran)', sag: 'Teşekkürler'),
                (sol: 'نعم (naam)', sag: 'Evet'),
                (sol: 'لا (laa)', sag: 'Hayır'),
                (sol: 'مع السلامة (maas selaame)', sag: 'Hoşça kal'),
              ],
              aciklama: 'Temel nezaket ifadeleri.',
            ),
            Bosluk(
              soru: 'Teşekkürler: ___ (şukran)',
              secenekler: ['شكرا', 'عفوا', 'نعم'],
              dogru: 0,
              aciklama:
                  'شكرا (şukran) = teşekkürler. عفوا (afwan) = rica ederim.',
            ),
            Yaz(
              soru: 'Arapçada "evet" nasıl söylenir? Okunuşunu yaz.',
              cevaplar: ['naam', 'nam', 'نعم'],
              aciklama: 'نعم (naam) = evet.',
            ),
            Yaz(
              soru: 'Türkçeye çevir: مرحبا (marhaban)',
              cevaplar: ['merhaba', 'selam'],
              aciklama: 'مرحبا = merhaba.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Hoş geldin. Sağdan başla.',
              kelimeler: ['وسهلا', 'أهلا'],
              dogru: ['أهلا', 'وسهلا'],
              aciklama: 'أهلا وسهلا (ehlen ve sehlen) = hoş geldin.',
            ),
            Isaretle(
              soru: 'Cümlede "teşekkürler" sözcüğünü işaretle.',
              cumle: 'مرحبا شكرا نعم',
              dogru: [1],
              aciklama: 'شكرا (şukran) = teşekkürler.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'arapca-1.u2',
      ad: 'Tanışma, zamirler ve sayılar',
      dersler: [
        Ders(
          id: 'arapca-1.u2.d1',
          ad: 'Tanışma',
          dilbilgisiNotu:
              "اسمي ... (ismii) = Adım ...; ما اسمك؟ (maa ismuk) = Adın ne? (kadına ما اسمك؟ aynı yazılır, okunuşu ismuki). أنا من تركيا (ana min turkiyaa) = Türkiye'denim. من أين أنت؟ (min ayna ente) = Nerelisin? تشرفنا (teşerrafnaa) = Memnun oldum. Örnek isimler: يوسف (yuusuf), علي (alii). Arapçada sondaki ـي \"benim\" demektir: اسمي = adım.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'أنا من تركيا',
              secenekler: ['أنا من تركيا', 'اسمي يوسف', 'ما اسمك'],
              dogru: 0,
              dil: _ar,
              aciklama: 'أنا من تركيا (ana min turkiyaa) = Türkiye\'denim.',
            ),
            Secim(
              soru: 'اسمي (ismii) ne demektir?',
              secenekler: ['Adım', 'Adın', 'Adı'],
              dogru: 0,
              aciklama: 'ـي eki "benim" anlamı verir: اسمي = adım.',
            ),
            Secim(
              soru: 'ما اسمك؟ (maa ismuk) ne sorar?',
              secenekler: ['Adın ne?', 'Nerelisin?', 'Nasılsın?'],
              dogru: 0,
              aciklama: 'ما اسمك؟ = Adın ne?',
            ),
            Eslestir(
              soru: 'Kalıbı Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'ما اسمك؟ (maa ismuk)', sag: 'Adın ne?'),
                (sol: 'اسمي ... (ismii)', sag: 'Adım ...'),
                (sol: 'أنا من تركيا (ana min turkiyaa)', sag: "Türkiye'denim"),
                (sol: 'من أين أنت؟ (min ayna ente)', sag: 'Nerelisin?'),
                (sol: 'تشرفنا (teşerrafnaa)', sag: 'Memnun oldum'),
              ],
              aciklama: 'Tanışma kalıpları.',
            ),
            Bosluk(
              soru: 'Adım Yusuf: ___ يوسف',
              secenekler: ['اسمي', 'اسمك', 'أنا'],
              dogru: 0,
              aciklama: 'اسمي يوسف (ismii yuusuf) = Adım Yusuf.',
            ),
            Bosluk(
              soru: "Türkiye'denim: أنا ___ تركيا",
              secenekler: ['من', 'في', 'هل'],
              dogru: 0,
              aciklama: 'من (min) = -den, -dan: أنا من تركيا.',
            ),
            Yaz(
              soru: 'من أين أنت؟ (min ayna ente) sorusu Türkçede ne demektir?',
              cevaplar: ['nerelisin', 'nerelisiniz'],
              aciklama: 'من أين أنت؟ = Nerelisin?',
            ),
            Yaz(
              soru: 'Arapçada "adım" nasıl söylenir? Okunuşunu yaz.',
              cevaplar: ['ismii', 'ismi', 'esmi', 'اسمي'],
              aciklama: 'اسمي (ismii) = adım.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Adım Yusuf. Sağdan başla.',
              kelimeler: ['يوسف', 'اسمي'],
              dogru: ['اسمي', 'يوسف'],
              aciklama: 'اسمي يوسف = Adım Yusuf.',
            ),
            Isaretle(
              soru: 'Cümledeki ülke adını işaretle.',
              cumle: 'أنا من تركيا',
              dogru: [2],
              aciklama: 'تركيا (turkiyaa) = Türkiye.',
            ),
          ],
        ),
        Ders(
          id: 'arapca-1.u2.d2',
          ad: 'Şahıs zamirleri',
          dilbilgisiNotu:
              "أنا (ana) = ben, أنت (ente) = sen (erkek), أنتِ (enti) = sen (kadın), هو (huwe) = o (erkek), هي (hiye) = o (kadın), نحن (nahnu) = biz. Şimdiki zamanda \"olmak\" fiili söylenmez: أنا طالب (ana taalib) = Ben öğrenciyim; هو معلم (huwe muallim) = O öğretmendir. Kadınlarda meslek sözcüğü ة ile biter: طالبة, معلمة.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi zamiri duydun?',
              okunacak: 'هو',
              secenekler: ['هو', 'هي', 'أنا'],
              dogru: 0,
              dil: _ar,
              aciklama: 'هو (huwe) = o (erkek). هي = o (kadın); أنا = ben.',
            ),
            Secim(
              soru: 'أنا (ana) ne demektir?',
              secenekler: ['Ben', 'Sen', 'O'],
              dogru: 0,
              aciklama: 'أنا = ben.',
            ),
            Secim(
              soru: 'هي (hiye) kimdir?',
              secenekler: ['O (kadın)', 'O (erkek)', 'Biz'],
              dogru: 0,
              aciklama: 'هي = o (kadın); هو = o (erkek).',
            ),
            Tablo(
              soru: 'Şahıs zamirlerini tamamla.',
              baslik: ['Türkçe', 'Arapça'],
              satirlar: [
                ['ben', 'أنا'],
                ['sen (erkek)', 'أنت'],
                ['o (erkek)', 'هو'],
                ['o (kadın)', 'هي'],
                ['biz', 'نحن'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 4, sutun: 1)],
              secenekler: ['أنت', 'نحن', 'هو', 'هي'],
              aciklama: 'sen = أنت (ente), biz = نحن (nahnu).',
            ),
            Eslestir(
              soru: 'Zamiri Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'أنا (ana)', sag: 'ben'),
                (sol: 'أنت (ente)', sag: 'sen (erkek)'),
                (sol: 'هو (huwe)', sag: 'o (erkek)'),
                (sol: 'هي (hiye)', sag: 'o (kadın)'),
                (sol: 'نحن (nahnu)', sag: 'biz'),
              ],
              aciklama: 'Şahıs zamirleri.',
            ),
            Bosluk(
              soru: 'Ben öğrenciyim: ___ طالب',
              secenekler: ['أنا', 'هو', 'هي'],
              dogru: 0,
              aciklama: 'أنا طالب (ana taalib) = ben öğrenciyim.',
            ),
            Bosluk(
              soru: 'O (kadın) öğretmendir: ___ معلمة',
              secenekler: ['هي', 'هو', 'أنت'],
              dogru: 0,
              aciklama: 'هي معلمة (hiye muallima) = o öğretmendir.',
            ),
            Yaz(
              soru: 'Arapçada "biz" nasıl söylenir? Okunuşunu yaz.',
              cevaplar: ['nahnu', 'نحن'],
              aciklama: 'نحن (nahnu) = biz.',
            ),
            Yaz(
              soru: 'Türkçeye çevir: أنا طالب (ana taalib)',
              cevaplar: ['ben öğrenciyim', 'öğrenciyim'],
              aciklama: 'أنا طالب = ben öğrenciyim. "Olmak" fiili söylenmez.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Ben öğrenciyim. Sağdan başla.',
              kelimeler: ['طالب', 'أنا'],
              dogru: ['أنا', 'طالب'],
              aciklama: 'أنا طالب = Ben öğrenciyim.',
            ),
          ],
        ),
        Ders(
          id: 'arapca-1.u2.d3',
          ad: 'Sayılar 0-10 ve onluklar',
          dilbilgisiNotu:
              "Arapça rakamlar (soldan sağa okunur): ٠ ١ ٢ ٣ ٤ ٥ ٦ ٧ ٨ ٩ (0-9), ١٠ = 10. Sözcükler: صفر (sifr) 0, واحد (waahid) 1, اثنان (isnaan) 2, ثلاثة (selaasa) 3, أربعة (arbaa) 4, خمسة (hamsa) 5, ستة (sitta) 6, سبعة (sabaa) 7, ثمانية (samaaniya) 8, تسعة (tisaa) 9, عشرة (aşara) 10. Onluklar: عشرون (işruun) 20, ثلاثون (selaasuun) 30. Not: bazı ülkelerde 0-9 yerine Latin rakamlar da kullanılır.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi sayıyı duydun?',
              okunacak: 'خمسة',
              secenekler: ['خمسة', 'ستة', 'سبعة'],
              dogru: 0,
              dil: _ar,
              aciklama: 'خمسة (hamsa) = 5. ستة = 6; سبعة = 7.',
            ),
            Secim(
              soru: 'واحد (waahid) hangi sayıdır?',
              secenekler: ['1', '2', '3'],
              dogru: 0,
              aciklama: 'واحد = 1.',
            ),
            Secim(
              soru: '٣ hangi sayıdır?',
              secenekler: ['3', '2', '5'],
              dogru: 0,
              aciklama: '٣ = 3; ٢ = 2; ٥ = 5.',
            ),
            Secim(
              soru: 'عشرون (işruun) kaçtır?',
              secenekler: ['20', '10', '2'],
              dogru: 0,
              aciklama: 'عشرة = 10, عشرون = 20.',
            ),
            Eslestir(
              soru: 'Arapça rakamı Latin rakamıyla eşleştir.',
              ciftler: [
                (sol: '٠', sag: '0'),
                (sol: '١', sag: '1'),
                (sol: '٢', sag: '2'),
                (sol: '٣', sag: '3'),
                (sol: '٤', sag: '4'),
              ],
              aciklama: '٠ ١ ٢ ٣ ٤ = 0 1 2 3 4.',
            ),
            Tablo(
              soru: 'Sayıların Arapçasını tamamla.',
              baslik: ['Sayı', 'Arapça'],
              satirlar: [
                ['1', 'واحد'],
                ['2', 'اثنان'],
                ['3', 'ثلاثة'],
                ['4', 'أربعة'],
                ['5', 'خمسة'],
              ],
              bos: [(satir: 2, sutun: 1), (satir: 4, sutun: 1)],
              secenekler: ['ثلاثة', 'خمسة', 'واحد', 'اثنان'],
              aciklama: '3 = ثلاثة (selaasa), 5 = خمسة (hamsa).',
            ),
            Bosluk(
              soru: '5 + 3 = ___ (sekiz)',
              secenekler: ['ثمانية', 'سبعة', 'تسعة'],
              dogru: 0,
              aciklama: 'ثمانية (samaaniya) = 8.',
            ),
            Yaz(
              soru: 'ستة (sitta) kaçtır? Rakamla yaz.',
              cevaplar: ['6', 'altı', 'alti', '٦'],
              aciklama: 'ستة = 6.',
            ),
            Yaz(
              soru: 'Arapçada "yedi" nasıl söylenir? Okunuşunu yaz.',
              cevaplar: ['sabaa', 'saba', 'سبعة'],
              aciklama: 'سبعة (sabaa) = 7.',
            ),
            Sirala(
              soru: 'Sayıları küçükten büyüğe sırala. Sağdan başla.',
              kelimeler: ['ثلاثة', 'واحد', 'اثنان'],
              dogru: ['واحد', 'اثنان', 'ثلاثة'],
              aciklama: 'واحد (1), اثنان (2), ثلاثة (3).',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'arapca-1.u3',
      ad: 'Dilbilgisi temelleri',
      dersler: [
        Ders(
          id: 'arapca-1.u3.d1',
          ad: 'Müzekker, müennes ve ة',
          dilbilgisiNotu:
              "Arapçada her isim müzekker (eril) ya da müennes (dişil)dir. Müennes isimlerin çoğu ة (ta marbuta) ile biter; sondaki ة \"a\" okunur: طالب (taalib) öğrenci (erkek) → طالبة (taaliba) öğrenci (kız); معلم (muallim) → معلمة (muallima); صديق (sadiiq) arkadaş → صديقة (sadiiqa). Kendiliğinden müennes olanlar da vardır: مدرسة (madrasa) okul, مدينة (madiina) şehir. Sıfat isme uyar: بيت كبير (bayt kabiir) büyük ev; مدرسة كبيرة (madrasa kabiira) büyük okul.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi sözcüğü duydun?',
              okunacak: 'مدرسة',
              secenekler: ['مدرسة', 'مدينة', 'معلمة'],
              dogru: 0,
              dil: _ar,
              aciklama:
                  'مدرسة (madrasa) = okul. مدينة = şehir; معلمة = öğretmen (kadın).',
            ),
            Secim(
              soru: 'Müennes (dişil) isimlerin çoğu hangi harfle biter?',
              secenekler: ['ة (ta marbuta)', 'ب', 'و'],
              dogru: 0,
              aciklama: 'ة sonda "a" okunur: طالبة (taaliba).',
            ),
            Secim(
              soru: 'طالبة (taaliba) kimdir?',
              secenekler: ['Kız öğrenci', 'Erkek öğrenci', 'Öğretmen'],
              dogru: 0,
              aciklama: 'طالب = erkek öğrenci; طالبة = kız öğrenci.',
            ),
            Eslestir(
              soru: 'Sözcüğü Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'طالب (taalib)', sag: 'öğrenci (erkek)'),
                (sol: 'طالبة (taaliba)', sag: 'öğrenci (kız)'),
                (sol: 'معلم (muallim)', sag: 'öğretmen (erkek)'),
                (sol: 'معلمة (muallima)', sag: 'öğretmen (kadın)'),
                (sol: 'مدرسة (madrasa)', sag: 'okul'),
              ],
              aciklama: 'ة müennes işaretidir.',
            ),
            Tablo(
              soru: 'Müennes biçimleri tamamla.',
              baslik: ['Erkek', 'Kadın'],
              satirlar: [
                ['طالب', 'طالبة'],
                ['معلم', 'معلمة'],
                ['صديق', 'صديقة'],
                ['كبير', 'كبيرة'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: ['معلمة', 'صديقة', 'كبيرة', 'طالبة'],
              aciklama: 'معلم → معلمة, صديق → صديقة.',
            ),
            Bosluk(
              soru: 'O (kadın) öğrencidir: هي ___',
              secenekler: ['طالبة', 'طالب', 'بيت'],
              dogru: 0,
              aciklama: 'Kadın için طالبة kullanılır.',
            ),
            Bosluk(
              soru: 'O (erkek) öğrencidir: هو ___',
              secenekler: ['طالب', 'طالبة', 'مدرسة'],
              dogru: 0,
              aciklama: 'Erkek için طالب kullanılır.',
            ),
            Yaz(
              soru: 'مدرسة (madrasa) Türkçede ne demektir?',
              cevaplar: ['okul'],
              aciklama: 'مدرسة = okul.',
            ),
            Yaz(
              soru: 'Arapçada "şehir" nasıl söylenir? Okunuşunu yaz.',
              cevaplar: ['madiina', 'medine', 'مدينة'],
              aciklama: 'مدينة (madiina) = şehir.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: O (kadın) öğretmendir. Sağdan başla.',
              kelimeler: ['معلمة', 'هي'],
              dogru: ['هي', 'معلمة'],
              aciklama: 'هي معلمة = o öğretmendir.',
            ),
          ],
        ),
        Ders(
          id: 'arapca-1.u3.d2',
          ad: 'ال, güneş-ay harfleri ve işaret zamirleri',
          dilbilgisiNotu:
              "Belirli artikel ال (el) isme eklenir: كتاب (kitap) → الكتاب (el-kitaab, \"o kitap\"). ال'deki ل bazı harflerden önce okunmaz, o harfe benzer: bunlar güneş harfleridir (ت ث د ذ ر ز س ش ص ض ط ظ ل ن): الشمس (eş-şems) güneş. Diğerleri ay harfleridir ve ل okunur: القمر (el-kamar) ay, الكتاب (el-kitaab). İşaret zamirleri: هذا (haazaa) = bu (müzekker), هذه (haazihi) = bu (müennes): هذا كتاب (haazaa kitaab) = Bu bir kitap; هذه مدرسة (haazihi madrasa) = Bu bir okul.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'هذا كتاب',
              secenekler: ['هذا كتاب', 'هذه مدرسة', 'هذا بيت'],
              dogru: 0,
              dil: _ar,
              aciklama:
                  'هذا كتاب (haazaa kitaab) = bu bir kitap. هذه مدرسة = bu bir okul.',
            ),
            Secim(
              soru: 'ال ne işe yarar?',
              secenekler: [
                'Belirli artikeldir (el)',
                'Çoğul yapar',
                'Olumsuz yapar',
              ],
              dogru: 0,
              aciklama: 'ال isme eklenir: الكتاب (el-kitaab).',
            ),
            Secim(
              soru: 'الشمس (eş-şems) sözcüğünde ل nasıl okunur?',
              secenekler: [
                'Okunmaz; sonraki harfe (ş) benzer',
                'Aynen l okunur',
                'Uzatılarak okunur',
              ],
              dogru: 0,
              aciklama: 'ش güneş harfidir; ال + ش = "eş-ş".',
            ),
            Secim(
              soru: 'القمر (el-kamar) sözcüğünde ل okunur mu?',
              secenekler: ['Evet, el-kamar', 'Hayır, ek-kamar', 'Yalnız sonda'],
              dogru: 0,
              aciklama: 'ق ay harfidir; ل okunur.',
            ),
            Eslestir(
              soru: 'Sözcüğü Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'هذا (haazaa)', sag: 'bu (müzekker)'),
                (sol: 'هذه (haazihi)', sag: 'bu (müennes)'),
                (sol: 'الكتاب (el-kitaab)', sag: 'o kitap'),
                (sol: 'الشمس (eş-şems)', sag: 'güneş'),
                (sol: 'القمر (el-kamar)', sag: 'ay'),
              ],
              aciklama: 'Artikel ve işaret zamirleri.',
            ),
            Bosluk(
              soru: 'Bu bir kitap: ___ كتاب',
              secenekler: ['هذا', 'هذه', 'هو'],
              dogru: 0,
              aciklama: 'كتاب müzekker olduğu için هذا kullanılır.',
            ),
            Bosluk(
              soru: 'Bu bir okul: ___ مدرسة',
              secenekler: ['هذه', 'هذا', 'هي'],
              dogru: 0,
              aciklama: 'مدرسة müennes olduğu için هذه kullanılır.',
            ),
            Yaz(
              soru: 'Arapçada "bu" (müzekker) nasıl söylenir? Okunuşunu yaz.',
              cevaplar: ['haazaa', 'haza', 'hazaa', 'هذا'],
              aciklama: 'هذا (haazaa) = bu.',
            ),
            Yaz(
              soru: 'Türkçeye çevir: هذه مدرسة (haazihi madrasa)',
              cevaplar: ['bu bir okul', 'bu okul'],
              aciklama: 'هذه مدرسة = bu bir okul.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Bu bir kitap. Sağdan başla.',
              kelimeler: ['كتاب', 'هذا'],
              dogru: ['هذا', 'كتاب'],
              aciklama: 'هذا كتاب = Bu bir kitap.',
            ),
          ],
        ),
        Ders(
          id: 'arapca-1.u3.d3',
          ad: 'İsim cümlesi, çoğul ve sahiplik',
          dilbilgisiNotu:
              "İsim cümlesinde \"olmak\" fiili yoktur: بيتي كبير (baytii kabiir) = Evim büyüktür. Sıfat isimden sonra gelir ve cinsiyete uyar. Sahiplik ekleri isme eklenir: ـي (benim) كتابي (kitaabii) kitabım; ـك (senin) كتابك (kitaabuk) kitabın; ـه (onun, erkek) كتابه (kitaabuh) kitabı. Çoğul: erkek ـون (muallimuun öğretmenler), kadın ـات (muallimaat). Birçok isim düzensiz (kırık) çoğul alır: كتاب → كتب (kutub, kitaplar).",
          alistirmalar: [
            Dinle(
              soru: 'Hangi sözcüğü duydun?',
              okunacak: 'كتابي',
              secenekler: ['كتابي', 'كتابك', 'كتابه'],
              dogru: 0,
              dil: _ar,
              aciklama:
                  'كتابي (kitaabii) = kitabım. كتابك = kitabın; كتابه = onun kitabı.',
            ),
            Secim(
              soru: 'كتابي (kitaabii) ne demektir?',
              secenekler: ['Kitabım', 'Kitabın', 'Kitabı'],
              dogru: 0,
              aciklama: 'ـي = benim.',
            ),
            Secim(
              soru: 'كتابك (kitaabuk) ne demektir?',
              secenekler: ['Senin kitabın', 'Benim kitabım', 'Onun kitabı'],
              dogru: 0,
              aciklama: 'ـك = senin.',
            ),
            Secim(
              soru:
                  'Arapçada şimdiki zamanda "-dir" (olmak) fiili söylenir mi?',
              secenekler: [
                'Hayır, söylenmez',
                'Evet, her zaman',
                'Yalnız soruda',
              ],
              dogru: 0,
              aciklama: 'بيتي كبير = Evim büyüktür; "olmak" fiili yoktur.',
            ),
            Eslestir(
              soru: 'Sözcüğü Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'كتابي (kitaabii)', sag: 'kitabım'),
                (sol: 'كتابك (kitaabuk)', sag: 'kitabın'),
                (sol: 'كتابه (kitaabuh)', sag: 'kitabı (onun)'),
                (sol: 'بيتي (baytii)', sag: 'evim'),
                (sol: 'معلمون (muallimuun)', sag: 'öğretmenler (erkek)'),
              ],
              aciklama: 'Sahiplik ekleri ve çoğul.',
            ),
            Bosluk(
              soru: 'Evim büyük: بيتي ___',
              secenekler: ['كبير', 'كبيرة', 'كتاب'],
              dogru: 0,
              aciklama: 'بيت müzekker: كبير (kabiir).',
            ),
            Bosluk(
              soru: 'Okul büyük: المدرسة ___',
              secenekler: ['كبيرة', 'كبير', 'كتاب'],
              dogru: 0,
              aciklama: 'مدرسة müennes: كبيرة (kabiira).',
            ),
            Yaz(
              soru: 'Türkçeye çevir: بيتي كبير (baytii kabiir)',
              cevaplar: ['evim büyük', 'evim büyüktür'],
              aciklama: 'بيتي كبير = evim büyük.',
            ),
            Yaz(
              soru: 'كتب (kutub), كتاب sözcüğünün çoğuludur. Türkçesi nedir?',
              cevaplar: ['kitaplar'],
              aciklama: 'كتب = kitaplar (kırık çoğul).',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Evim büyük. Sağdan başla.',
              kelimeler: ['كبير', 'بيتي'],
              dogru: ['بيتي', 'كبير'],
              aciklama: 'بيتي كبير = Evim büyük.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'arapca-1.u4',
      ad: 'Günlük hayat',
      dersler: [
        Ders(
          id: 'arapca-1.u4.d1',
          ad: 'Soru edatları',
          dilbilgisiNotu:
              "ما (maa) = ne; أين (ayna) = nerede; من أين (min ayna) = nereden; كيف (keyfe) = nasıl; هل (hel) = evet/hayır sorusu açar. Örnekler: ما هذا؟ (maa haazaa) = Bu nedir? هل أنت طالب؟ (hel ente taalib) = Sen öğrenci misin? كيف حالك؟ (keyfe haaluk) = Nasılsın? Cevap: بخير، شكرا (bi-hayr şukran) = İyiyim, teşekkürler. Arapça soru işareti ؟ sağdan sola yazımda cümlenin sonuna (solda) konur.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi soruyu duydun?',
              okunacak: 'كيف حالك',
              secenekler: ['كيف حالك', 'ما اسمك', 'من أين أنت'],
              dogru: 0,
              dil: _ar,
              aciklama: 'كيف حالك (keyfe haaluk) = nasılsın?',
            ),
            Secim(
              soru: 'هل (hel) ne işe yarar?',
              secenekler: [
                'Evet/hayır sorusu açar',
                '"Kim" demektir',
                '"Nerede" demektir',
              ],
              dogru: 0,
              aciklama: 'هل أنت طالب؟ = Sen öğrenci misin?',
            ),
            Secim(
              soru: 'أين (ayna) ne demektir?',
              secenekler: ['Nerede', 'Ne', 'Nasıl'],
              dogru: 0,
              aciklama: 'أين = nerede.',
            ),
            Secim(
              soru: 'ما هذا؟ (maa haazaa) ne sorar?',
              secenekler: ['Bu nedir?', 'Bu kim?', 'Bu nerede?'],
              dogru: 0,
              aciklama: 'ما = ne; هذا = bu.',
            ),
            Eslestir(
              soru: 'Soru sözcüğünü Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'ما (maa)', sag: 'ne'),
                (sol: 'أين (ayna)', sag: 'nerede'),
                (sol: 'هل (hel)', sag: '-mi? (evet/hayır)'),
                (sol: 'كيف (keyfe)', sag: 'nasıl'),
                (sol: 'من أين (min ayna)', sag: 'nereden'),
              ],
              aciklama: 'Temel soru sözcükleri.',
            ),
            Bosluk(
              soru: 'Sen öğrenci misin: ___ أنت طالب؟',
              secenekler: ['هل', 'ما', 'أين'],
              dogru: 0,
              aciklama: 'هل أنت طالب؟ = Sen öğrenci misin?',
            ),
            Bosluk(
              soru: 'Nasılsın: ___ حالك؟',
              secenekler: ['كيف', 'أين', 'هل'],
              dogru: 0,
              aciklama: 'كيف حالك؟ = Nasılsın?',
            ),
            Yaz(
              soru: 'Arapçada "nerede" nasıl söylenir? Okunuşunu yaz.',
              cevaplar: ['ayna', 'eyne', 'أين'],
              aciklama: 'أين (ayna) = nerede.',
            ),
            Yaz(
              soru: 'Türkçeye çevir: كيف حالك؟ (keyfe haaluk)',
              cevaplar: ['nasılsın', 'nasılsınız', 'nasilsin'],
              aciklama: 'كيف حالك؟ = Nasılsın?',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Sen öğrenci misin? Sağdan başla.',
              kelimeler: ['أنت', 'طالب؟', 'هل'],
              dogru: ['هل', 'أنت', 'طالب؟'],
              aciklama: 'هل أنت طالب؟ = Sen öğrenci misin?',
            ),
          ],
        ),
        Ders(
          id: 'arapca-1.u4.d2',
          ad: 'Basit fiil (şimdiki zaman) ve yiyecek',
          dilbilgisiNotu:
              "Şimdiki/geniş zaman fiillerinin başına kişiyi gösteren bir ön ek gelir: أ (e-) = ben, ت (te-) = sen ve o (kadın), ي (ye-) = o (erkek). Örnek: أشرب (eşrab) içiyorum, تشرب (teşrab) sen içiyorsun / o (kadın) içiyor, يشرب (yeşrab) o (erkek) içiyor. آكل (aakul) = yiyorum. أريد (uriid) = istiyorum. Yiyecek: ماء (maa) su, شاي (şaay) çay, قهوة (qahwa) kahve, حليب (haliib) süt, خبز (hubz) ekmek. Örnek: أنا أشرب الشاي (ana eşrab eş-şaay) = Çay içiyorum.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'أنا أشرب الشاي',
              secenekler: ['أنا أشرب الشاي', 'أنا آكل الخبز', 'أنا أشرب الماء'],
              dogru: 0,
              dil: _ar,
              aciklama:
                  'أنا أشرب الشاي (ana eşrab eş-şaay) = çay içiyorum. الخبز = ekmek; الماء = su.',
            ),
            Secim(
              soru: 'أشرب (eşrab) ne demektir?',
              secenekler: ['İçiyorum', 'Yiyorum', 'İstiyorum'],
              dogru: 0,
              aciklama: 'أشرب = içiyorum / içerim.',
            ),
            Secim(
              soru: 'آكل (aakul) ne demektir?',
              secenekler: ['Yiyorum', 'İçiyorum', 'Gidiyorum'],
              dogru: 0,
              aciklama: 'آكل = yiyorum / yerim.',
            ),
            Secim(
              soru: 'Fiilin başındaki أ hangi kişiyi gösterir?',
              secenekler: ['Ben', 'Sen', 'O (erkek)'],
              dogru: 0,
              aciklama: 'أ = ben, ت = sen, ي = o (erkek).',
            ),
            Eslestir(
              soru: 'Yiyecek ve içeceği Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'ماء (maa)', sag: 'su'),
                (sol: 'شاي (şaay)', sag: 'çay'),
                (sol: 'قهوة (qahwa)', sag: 'kahve'),
                (sol: 'حليب (haliib)', sag: 'süt'),
                (sol: 'خبز (hubz)', sag: 'ekmek'),
              ],
              aciklama: 'Günlük yiyecek ve içecekler.',
            ),
            Tablo(
              soru: 'أشرب (içmek) fiilinin çekimini tamamla.',
              baslik: ['Kişi', 'İçmek'],
              satirlar: [
                ['أنا', 'أشرب'],
                ['أنت', 'تشرب'],
                ['هو', 'يشرب'],
                ['هي', 'تشرب'],
              ],
              bos: [(satir: 1, sutun: 1), (satir: 2, sutun: 1)],
              secenekler: ['تشرب', 'يشرب', 'أشرب'],
              aciklama: 'أنت تشرب, هو يشرب.',
            ),
            Bosluk(
              soru: 'Çay içiyorum: أنا ___ الشاي',
              secenekler: ['أشرب', 'آكل', 'أريد'],
              dogru: 0,
              aciklama: 'أشرب = içiyorum.',
            ),
            Bosluk(
              soru: 'Ekmek yiyorum: أنا ___ الخبز',
              secenekler: ['آكل', 'أشرب', 'أريد'],
              dogru: 0,
              aciklama: 'آكل = yiyorum.',
            ),
            Yaz(
              soru: 'Türkçeye çevir: أنا أشرب الماء (ana eşrab el-maa)',
              cevaplar: ['su içiyorum', 'ben su içiyorum'],
              aciklama: 'أنا أشرب الماء = ben su içiyorum.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Çay içiyorum. Sağdan başla.',
              kelimeler: ['الشاي', 'أشرب', 'أنا'],
              dogru: ['أنا', 'أشرب', 'الشاي'],
              aciklama: 'أنا أشرب الشاي = Çay içiyorum.',
            ),
          ],
        ),
        Ders(
          id: 'arapca-1.u4.d3',
          ad: 'Aile ve saat',
          dilbilgisiNotu:
              "Aile: أب (ab) baba, أم (umm) anne, أخ (ah) erkek kardeş, أخت (uht) kız kardeş, ابن (ibn) oğul, بنت (bint) kız. Sahiplik eki ـي: أبي (abii) babam, أمي (ummii) annem, أخي (ahii) kardeşim. Saat: كم الساعة؟ (kam es-saa) = Saat kaç? الساعة الواحدة (es-saa el-waahida) = saat bir; الساعة الثانية (es-saa es-saaniya) = saat iki; الساعة الثالثة (es-saa es-saalisa) = saat üç.",
          alistirmalar: [
            Dinle(
              soru: 'Hangi sözcüğü duydun?',
              okunacak: 'أخت',
              secenekler: ['أخت', 'أب', 'أم'],
              dogru: 0,
              dil: _ar,
              aciklama: 'أخت (uht) = kız kardeş. أب = baba; أم = anne.',
            ),
            Secim(
              soru: 'أم (umm) kimdir?',
              secenekler: ['Anne', 'Baba', 'Kız kardeş'],
              dogru: 0,
              aciklama: 'أم = anne.',
            ),
            Secim(
              soru: 'أب (ab) kimdir?',
              secenekler: ['Baba', 'Anne', 'Erkek kardeş'],
              dogru: 0,
              aciklama: 'أب = baba.',
            ),
            Secim(
              soru: 'كم الساعة؟ (kam es-saa) ne sorar?',
              secenekler: ['Saat kaç?', 'Nerelisin?', 'Adın ne?'],
              dogru: 0,
              aciklama: 'كم الساعة؟ = Saat kaç?',
            ),
            Eslestir(
              soru: 'Aile üyesini Türkçe karşılığıyla eşleştir.',
              ciftler: [
                (sol: 'أب (ab)', sag: 'baba'),
                (sol: 'أم (umm)', sag: 'anne'),
                (sol: 'أخ (ah)', sag: 'erkek kardeş'),
                (sol: 'أخت (uht)', sag: 'kız kardeş'),
                (sol: 'بنت (bint)', sag: 'kız'),
              ],
              aciklama: 'Aile sözcükleri.',
            ),
            Bosluk(
              soru: 'Babam: ___ (abii)',
              secenekler: ['أبي', 'أمي', 'أخي'],
              dogru: 0,
              aciklama: 'أبي (abii) = babam. أمي = annem; أخي = kardeşim.',
            ),
            Bosluk(
              soru: 'Saat üç: الساعة ___',
              secenekler: ['الثالثة', 'الواحدة', 'الثانية'],
              dogru: 0,
              aciklama:
                  'الثالثة (es-saalisa) = üçüncü; الساعة الثالثة = saat üç.',
            ),
            Yaz(
              soru: 'Arapçada "anne" nasıl söylenir? Okunuşunu yaz.',
              cevaplar: ['umm', 'um', 'أم'],
              aciklama: 'أم (umm) = anne.',
            ),
            Yaz(
              soru: 'Türkçeye çevir: هذا أبي (haazaa abii)',
              cevaplar: ['bu babam', 'bu benim babam'],
              aciklama: 'هذا أبي = bu babam.',
            ),
            Sirala(
              soru: 'Cümleyi sırala: Bu annem. Sağdan başla.',
              kelimeler: ['أمي', 'هذه'],
              dogru: ['هذه', 'أمي'],
              aciklama: 'هذه أمي = bu annem.',
            ),
          ],
        ),
      ],
    ),
  ],
);
