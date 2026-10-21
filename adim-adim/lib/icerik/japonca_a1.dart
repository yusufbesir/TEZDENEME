/// Japonca A1: Başlangıç. Üç ünite: Yazı sistemi (Hiragana ve birkaç
/// Katakana), Selamlaşma ve tanışma, Sayılar ve günlük ifadeler. Her Japonca
/// sözcüğün yanında okunuşu (Hepburn romanizasyonu; ō = uzun o) ve Türkçe
/// anlamı verilir; Yaz alıştırmalarında romanizasyon ya da kana kabul edilir.
///
/// Yazı tipi notu: Kana ve kanji için yeni yazı tipi GÖMÜLMEZ; Windows'ta
/// sistem yazı tipleri (Yu Gothic / Meiryo) kullanılır. Sesli okuma için
/// Windows'ta ja-JP ses paketi kurulu olmalıdır (docs/KURS-KO-JA-ZH-NOTLAR.md).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/icerik.dart';

const String _ja = 'ja-JP';

const Kurs japoncaA1 = Kurs(
  id: 'japonca-1',
  ad: 'Japonca A1: Başlangıç',
  aciklama:
      'Sıfırdan Japonca: önce Hiragana ve Katakana, sonra selamlaşma, tanışma, sayılar ve günlük ifadeler.',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'japonca-1.u1',
      ad: 'Yazı sistemi',
      dersler: [
        Ders(
          id: 'japonca-1.u1.d1',
          ad: 'Hiragana: a, ka, sa sıraları',
          alistirmalar: [
            Secim(
              soru: 'あ harfi hangi sesi verir?',
              secenekler: ['a', 'i', 'u'],
              dogru: 0,
              aciklama: 'あ "a" okunur. Sıra: あ い う え お (a i u e o).',
            ),
            Secim(
              soru: 'し harfi hangi sesi verir?',
              secenekler: ['shi', 'sa', 'su'],
              dogru: 0,
              aciklama: 'し "shi" okunur (Türkçedeki "şi" gibi).',
            ),
            Eslestir(
              soru: 'Hiragana harfini sesiyle eşleştir.',
              ciftler: [
                (sol: 'あ', sag: 'a sesi'),
                (sol: 'い', sag: 'i sesi'),
                (sol: 'か', sag: 'ka sesi'),
                (sol: 'く', sag: 'ku sesi'),
              ],
              aciklama: 'あ (a), い (i), か (ka), く (ku).',
            ),
            Bosluk(
              soru: 'か, き, ___, け, こ (ka, ki, ___, ke, ko)',
              secenekler: ['く', 'す', 'う'],
              dogru: 0,
              aciklama: 'Ka sırası: か き く け こ (ka ki ku ke ko).',
            ),
            Bosluk(
              soru: 'あ, い, う, ___, お (a, i, u, ___, o)',
              secenekler: ['え', 'ち', 'さ'],
              dogru: 0,
              aciklama: 'A sırası: あ い う え お (a i u e o).',
            ),
            Yaz(
              soru: 'さ harfinin okunuşunu (romanizasyon) yaz.',
              cevaplar: ['sa'],
              aciklama: 'Sa sırası: さ し す せ そ (sa shi su se so).',
            ),
            Yaz(
              soru: 'あさ (sabah) sözcüğünün okunuşunu yaz.',
              cevaplar: ['asa', 'a sa'],
              aciklama: 'あ (a) + さ (sa) = asa.',
            ),
            Secim(
              soru: 'かさ (kasa) ne anlama gelir?',
              secenekler: ['Şemsiye', 'Yüz', 'Sabah'],
              dogru: 0,
              aciklama: 'かさ (kasa) şemsiye demektir; かお (kao) yüz demektir.',
            ),
            Sirala(
              soru: 'Harflerle sözcük kur: kao (yüz).',
              kelimeler: ['お', 'か'],
              dogru: ['か', 'お'],
              aciklama: 'か (ka) + お (o) = かお (kao), yüz.',
            ),
            Dinle(
              soru: 'Hangi sözcüğü duydun?',
              okunacak: 'あさ',
              secenekler: ['あさ', 'あい', 'かお'],
              dogru: 0,
              dil: _ja,
              aciklama: 'あさ (asa) sabah demektir.',
            ),
          ],
        ),
        Ders(
          id: 'japonca-1.u1.d2',
          ad: 'Hiragana: ta, na ve Katakana',
          alistirmalar: [
            Secim(
              soru: 'つ harfi hangi sesi verir?',
              secenekler: ['tsu', 'su', 'ta'],
              dogru: 0,
              aciklama: 'つ "tsu" okunur.',
            ),
            Secim(
              soru: 'ち harfi hangi sesi verir?',
              secenekler: ['chi', 'shi', 'ta'],
              dogru: 0,
              aciklama: 'ち "chi" okunur (Türkçedeki "çi" gibi).',
            ),
            Eslestir(
              soru: 'Hiragana harfini sesiyle eşleştir.',
              ciftler: [
                (sol: 'た', sag: 'ta sesi'),
                (sol: 'ち', sag: 'chi sesi'),
                (sol: 'な', sag: 'na sesi'),
                (sol: 'ね', sag: 'ne sesi'),
              ],
              aciklama: 'た (ta), ち (chi), な (na), ね (ne).',
            ),
            Bosluk(
              soru: 'な, に, ___, ね, の (na, ni, ___, ne, no)',
              secenekler: ['ぬ', 'む', 'す'],
              dogru: 0,
              aciklama: 'Na sırası: な に ぬ ね の (na ni nu ne no).',
            ),
            Secim(
              soru: 'ア ve カ harfleri hangi yazı sistemine aittir?',
              secenekler: ['Katakana', 'Hiragana', 'Kanji'],
              dogru: 0,
              aciklama:
                  'Katakana köşeli harflerdir; yabancı sözcüklerde kullanılır: ア (a), カ (ka).',
            ),
            Bosluk(
              soru: 'ア, イ, ウ, ___, オ (a, i, u, ___, o) Katakana sırası',
              secenekler: ['エ', 'カ', 'コ'],
              dogru: 0,
              aciklama: 'Katakana a sırası: ア イ ウ エ オ.',
            ),
            Yaz(
              soru: 'ねこ (kedi) sözcüğünün okunuşunu yaz.',
              cevaplar: ['neko', 'ne ko'],
              aciklama: 'ね (ne) + こ (ko) = neko.',
            ),
            Yaz(
              soru:
                  'コーヒー (kahve) sözcüğünün okunuşunu yaz. Uzun ünlüyü çift harfle ya da ō/ī ile yazabilirsin.',
              cevaplar: ['koohii', 'kōhī', 'kohi', 'kohii'],
              aciklama: 'コーヒー (kōhī): ー işareti ünlüyü uzatır.',
            ),
            Sirala(
              soru: 'Harflerle sözcük kur: natsu (yaz mevsimi).',
              kelimeler: ['つ', 'な'],
              dogru: ['な', 'つ'],
              aciklama: 'な (na) + つ (tsu) = なつ (natsu), yaz.',
            ),
            Dinle(
              soru: 'Hangi sözcüğü duydun?',
              okunacak: 'ねこ',
              secenekler: ['ねこ', 'いぬ', 'たこ'],
              dogru: 0,
              dil: _ja,
              aciklama: 'ねこ (neko) kedi demektir; いぬ (inu) köpektir.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'japonca-1.u2',
      ad: 'Selamlaşma ve tanışma',
      dersler: [
        Ders(
          id: 'japonca-1.u2.d1',
          ad: 'Selamlaşma',
          alistirmalar: [
            Secim(
              soru: 'こんにちは (konnichiwa) hangi anlama gelir?',
              secenekler: ['Merhaba (gündüz)', 'Hoşça kal', 'Teşekkürler'],
              dogru: 0,
              aciklama: 'こんにちは (konnichiwa) gündüz kullanılan merhabadır.',
            ),
            Secim(
              soru: 'Sabah selamı hangisidir?',
              secenekler: [
                'おはよう (ohayō)',
                'こんばんは (konbanwa)',
                'さようなら (sayōnara)',
              ],
              dogru: 0,
              aciklama:
                  'おはよう (ohayō): Günaydın. こんばんは (konbanwa): İyi akşamlar.',
            ),
            Secim(
              soru: 'はい (hai) ne anlama gelir?',
              secenekler: ['Evet', 'Hayır', 'Lütfen'],
              dogru: 0,
              aciklama: 'はい (hai) evet demektir; いいえ (iie) hayır demektir.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'こんにちは (konnichiwa)', sag: 'Merhaba'),
                (sol: 'ありがとう (arigatō)', sag: 'Teşekkürler'),
                (sol: 'さようなら (sayōnara)', sag: 'Hoşça kal'),
              ],
              aciklama: 'Üç temel ifade: merhaba, teşekkür, vedalaşma.',
            ),
            Bosluk(
              soru: 'İyi akşamlar: ___ (konbanwa)',
              secenekler: ['こんばんは', 'おはよう', 'こんにちは'],
              dogru: 0,
              aciklama: 'こんばんは (konbanwa) akşam selamıdır.',
            ),
            Bosluk(
              soru: 'Teşekkürler: ___ (arigatō)',
              secenekler: ['ありがとう', 'すみません', 'はい'],
              dogru: 0,
              aciklama: 'ありがとう (arigatō): Teşekkürler.',
            ),
            Yaz(
              soru:
                  'Japoncada "Evet" nasıl söylenir? Okunuşunu (ya da kana yazısını) yaz.',
              cevaplar: ['hai', 'はい'],
              aciklama: 'はい (hai).',
            ),
            Yaz(
              soru: 'すみません (sumimasen) için Türkçe bir karşılık yaz.',
              cevaplar: ['affedersiniz', 'özür dilerim', 'pardon'],
              aciklama: 'すみません: Affedersiniz / Özür dilerim.',
            ),
            Sirala(
              soru: 'Sıraya diz: Günaydın (nazik biçim).',
              kelimeler: ['ございます', 'おはよう'],
              dogru: ['おはよう', 'ございます'],
              aciklama: 'おはよう ございます (ohayō gozaimasu): nazik günaydın.',
            ),
            Dinle(
              soru: 'Hangi selamı duydun?',
              okunacak: 'こんにちは',
              secenekler: ['こんにちは', 'こんばんは', 'おはよう'],
              dogru: 0,
              dil: _ja,
              aciklama: 'こんにちは (konnichiwa): Merhaba.',
            ),
          ],
        ),
        Ders(
          id: 'japonca-1.u2.d2',
          ad: 'Kendini tanıtma',
          alistirmalar: [
            Secim(
              soru: 'わたし (watashi) ne anlama gelir?',
              secenekler: ['Ben', 'Sen', 'O'],
              dogru: 0,
              aciklama: 'わたし (watashi) "ben" demektir.',
            ),
            Secim(
              soru: 'がくせい (gakusei) ne anlama gelir?',
              secenekler: ['Öğrenci', 'Öğretmen', 'Doktor'],
              dogru: 0,
              aciklama: 'がくせい (gakusei) öğrenci demektir.',
            ),
            Secim(
              soru: 'Tanışırken ilk söylenen kalıp hangisidir?',
              secenekler: [
                'はじめまして (hajimemashite)',
                'さようなら (sayōnara)',
                'いいえ (iie)',
              ],
              dogru: 0,
              aciklama:
                  'はじめまして (hajimemashite): Tanıştığımıza memnun oldum (ilk tanışmada).',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'わたし (watashi)', sag: 'Ben'),
                (sol: 'がくせい (gakusei)', sag: 'Öğrenci'),
                (sol: 'なまえ (namae)', sag: 'İsim, ad'),
              ],
              aciklama: 'Kendini tanıtmanın üç temel sözcüğü.',
            ),
            Bosluk(
              soru: 'わたしは ___ です。(Ben öğrenciyim.)',
              secenekler: ['がくせい', 'なまえ', 'はい'],
              dogru: 0,
              aciklama:
                  'わたしは がくせいです (watashi wa gakusei desu): Ben öğrenciyim.',
            ),
            Bosluk(
              soru: 'わたしの ___ は ケン です。(Benim adım Ken.)',
              secenekler: ['なまえ', 'がくせい', 'こんにちは'],
              dogru: 0,
              aciklama: 'わたしの なまえは ケンです (watashi no namae wa Ken desu).',
            ),
            Yaz(
              soru: 'Türkçeye çevir: わたしは がくせいです。(watashi wa gakusei desu)',
              cevaplar: ['ben öğrenciyim', 'öğrenciyim'],
              aciklama: 'わたし = ben, がくせい = öğrenci, です = ...dır/im.',
            ),
            Yaz(
              soru:
                  'Japoncada "Ben" nasıl söylenir? Okunuşunu (ya da kana yazısını) yaz.',
              cevaplar: ['watashi', 'わたし'],
              aciklama: 'わたし (watashi).',
            ),
            Sirala(
              soru: 'Sıraya diz: Ben öğrenciyim.',
              kelimeler: ['です', 'がくせい', 'わたしは'],
              dogru: ['わたしは', 'がくせい', 'です'],
              aciklama: 'Japoncada yüklem (です) sonda gelir.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: 'わたしは がくせいです',
              secenekler: ['わたしは がくせいです', 'わたしの なまえは ケンです', 'はじめまして'],
              dogru: 0,
              dil: _ja,
              aciklama:
                  'わたしは がくせいです (watashi wa gakusei desu): Ben öğrenciyim.',
            ),
            Soyle(
              soru: 'Yüksek sesle söyle (hajimemashite).',
              metin: 'はじめまして',
              ceviri: 'Tanıştığımıza memnun oldum',
              dil: _ja,
              aciklama: 'はじめまして (hajimemashite).',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'japonca-1.u3',
      ad: 'Sayılar ve günlük ifadeler',
      dersler: [
        Ders(
          id: 'japonca-1.u3.d1',
          ad: 'Sayılar 1-10',
          alistirmalar: [
            Secim(
              soru: 'さん (san) hangi sayıdır?',
              secenekler: ['3', '5', '8'],
              dogru: 0,
              aciklama: 'さん (san) üç demektir.',
            ),
            Secim(
              soru: 'じゅう (jū) hangi sayıdır?',
              secenekler: ['10', '1', '9'],
              dogru: 0,
              aciklama: 'じゅう (jū) on demektir.',
            ),
            Secim(
              soru: '5 sayısı Japoncada nasıl söylenir?',
              secenekler: ['ご (go)', 'ろく (roku)', 'はち (hachi)'],
              dogru: 0,
              aciklama:
                  'ご (go) beş; ろく (roku) altı; はち (hachi) sekiz demektir.',
            ),
            Eslestir(
              soru: 'Sayıyı eşleştir.',
              ciftler: [
                (sol: 'いち (ichi)', sag: 'Bir'),
                (sol: 'ご (go)', sag: 'Beş'),
                (sol: 'じゅう (jū)', sag: 'On'),
              ],
              aciklama: 'いち (1), ご (5), じゅう (10).',
            ),
            Bosluk(
              soru: 'いち、に、___、よん (ichi, ni, ___, yon)',
              secenekler: ['さん', 'ご', 'はち'],
              dogru: 0,
              aciklama: 'Sıra: いち (1), に (2), さん (3), よん (4).',
            ),
            Bosluk(
              soru: 'はち、きゅう、___ (hachi, kyū, ___)',
              secenekler: ['じゅう', 'なな', 'に'],
              dogru: 0,
              aciklama: 'はち (8), きゅう (9), じゅう (10).',
            ),
            Yaz(
              soru:
                  '6 sayısının Japoncasını okunuşuyla (ya da kana yazısıyla) yaz.',
              cevaplar: ['roku', 'ろく'],
              aciklama: 'ろく (roku) altı demektir.',
            ),
            Yaz(
              soru: 'ご (go) kaçtır? Rakamla ya da Türkçe yazıyla yaz.',
              cevaplar: ['5', 'beş'],
              aciklama: 'ご (go) beş demektir.',
            ),
            Sirala(
              soru: 'Sıraya diz: bir, iki, üç.',
              kelimeler: ['さん', 'いち', 'に'],
              dogru: ['いち', 'に', 'さん'],
              aciklama: 'いち (ichi), に (ni), さん (san).',
            ),
            Dinle(
              soru: 'Hangi sayıyı duydun?',
              okunacak: 'ろく',
              secenekler: ['ろく', 'なな', 'はち'],
              dogru: 0,
              dil: _ja,
              aciklama: 'ろく (roku) altı; なな (nana) yedi; はち (hachi) sekizdir.',
            ),
          ],
        ),
        Ders(
          id: 'japonca-1.u3.d2',
          ad: 'Günlük ifadeler',
          alistirmalar: [
            Secim(
              soru: 'Su istemek için hangisi söylenir?',
              secenekler: [
                'みずを ください (mizu o kudasai)',
                'あした (ashita)',
                'きょう (kyō)',
              ],
              dogru: 0,
              aciklama: 'みずを ください (mizu o kudasai): Su verir misiniz?',
            ),
            Secim(
              soru: 'いくらですか (ikura desu ka) ne sorar?',
              secenekler: ['Ne kadar? (fiyat)', 'Nerede?', 'Kim?'],
              dogru: 0,
              aciklama: 'いくらですか (ikura desu ka): Ne kadar?',
            ),
            Secim(
              soru: 'おいしい (oishii) ne anlama gelir?',
              secenekler: ['Lezzetli', 'Soğuk', 'Büyük'],
              dogru: 0,
              aciklama: 'おいしい (oishii): Lezzetli.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: 'みず (mizu)', sag: 'Su'),
                (sol: 'きょう (kyō)', sag: 'Bugün'),
                (sol: 'あした (ashita)', sag: 'Yarın'),
              ],
              aciklama: 'Su, bugün ve yarın: günlük hayatın temel sözcükleri.',
            ),
            Bosluk(
              soru: '___ を ください。(… o kudasai.) Su lütfen.',
              secenekler: ['みず', 'きょう', 'あした'],
              dogru: 0,
              aciklama: 'みずを ください (mizu o kudasai): Su verir misiniz?',
            ),
            Bosluk(
              soru: 'きょう (bugün) ↔ ___ (yarın)',
              secenekler: ['あした', 'みず', 'いくら'],
              dogru: 0,
              aciklama: 'あした (ashita) yarın demektir.',
            ),
            Yaz(
              soru:
                  'Japoncada "Yarın" nasıl söylenir? Okunuşunu (ya da kana yazısını) yaz.',
              cevaplar: ['ashita', 'あした'],
              aciklama: 'あした (ashita).',
            ),
            Yaz(
              soru: 'みず (mizu) ne demektir? Türkçe yaz.',
              cevaplar: ['su'],
              aciklama: 'みず (mizu) su demektir.',
            ),
            Sirala(
              soru: 'Sıraya diz: Su lütfen.',
              kelimeler: ['ください', 'みずを'],
              dogru: ['みずを', 'ください'],
              aciklama: 'みずを ください (mizu o kudasai).',
            ),
            Dinle(
              soru: 'Hangi ifadeyi duydun?',
              okunacak: 'みずを ください',
              secenekler: ['みずを ください', 'いくらですか', 'おいしいです'],
              dogru: 0,
              dil: _ja,
              aciklama: 'みずを ください (mizu o kudasai): Su verir misiniz?',
            ),
            Soyle(
              soru: 'Yüksek sesle söyle (ikura desu ka).',
              metin: 'いくらですか',
              ceviri: 'Ne kadar?',
              dil: _ja,
              aciklama: 'いくらですか (ikura desu ka): Ne kadar?',
            ),
          ],
        ),
      ],
    ),
  ],
);
