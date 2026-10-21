/// Korece A1: Başlangıç. Üç ünite: Yazı sistemi (Hangıl), Selamlaşma ve
/// tanışma, Sayılar ve günlük ifadeler. Her Korece sözcüğün yanında okunuşu
/// (Revised Romanization) ve Türkçe anlamı verilir; Yaz alıştırmalarında
/// romanizasyon ya da Hangıl kabul edilir (CJK klavyesi gerekmez).
///
/// Yazı tipi notu: Hangıl için yeni yazı tipi GÖMÜLMEZ; Windows'ta sistem
/// yazı tipleri (Malgun Gothic) kullanılır. Sesli okuma için Windows'ta
/// ko-KR ses paketi kurulu olmalıdır (docs/KURS-KO-JA-ZH-NOTLAR.md).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/icerik.dart';

const String _ko = 'ko-KR';

const Kurs koreceA1 = Kurs(
  id: 'korece-1',
  ad: 'Korece A1: Başlangıç',
  aciklama:
      'Sıfırdan Korece: önce Hangıl alfabesi, sonra selamlaşma, tanışma, sayılar ve günlük ifadeler.',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'korece-1.u1',
      ad: 'Yazı sistemi',
      dersler: [
        Ders(
          id: 'korece-1.u1.d1',
          ad: 'Hangıl: ünlüler ve ilk heceler',
          alistirmalar: [
            Secim(
              soru: 'ㅏ ünlüsü hangi sesi verir?',
              secenekler: ['a', 'o', 'u'],
              dogru: 0,
              aciklama: 'ㅏ "a" okunur: ㄱ + ㅏ = 가 (ga).',
            ),
            Secim(
              soru: 'ㅜ ünlüsü hangi sesi verir?',
              secenekler: ['i', 'u', 'a'],
              dogru: 1,
              aciklama: 'ㅜ "u" okunur; ㅗ ise "o" okunur.',
            ),
            Eslestir(
              soru: 'Hangıl ünlüsünü sesiyle eşleştir.',
              ciftler: [
                (sol: 'ㅏ', sag: 'a sesi'),
                (sol: 'ㅗ', sag: 'o sesi'),
                (sol: 'ㅜ', sag: 'u sesi'),
                (sol: 'ㅣ', sag: 'i sesi'),
              ],
              aciklama: 'Dört temel ünlü: ㅏ (a), ㅗ (o), ㅜ (u), ㅣ (i).',
            ),
            Bosluk(
              soru: 'ㄱ + ㅏ = ___',
              secenekler: ['가', '나', '다'],
              dogru: 0,
              aciklama: 'ㄱ (g) ile ㅏ (a) birleşince 가 (ga) olur.',
            ),
            Bosluk(
              soru: 'ㅁ + ㅜ = ___',
              secenekler: ['모', '무', '미'],
              dogru: 1,
              aciklama: 'ㅁ (m) ile ㅜ (u) birleşince 무 (mu) olur.',
            ),
            Yaz(
              soru: '가 hecesinin okunuşunu (romanizasyon) yaz.',
              cevaplar: ['ga'],
              aciklama: '가 = ㄱ (g) + ㅏ (a) = ga.',
            ),
            Yaz(
              soru: '나무 (ağaç) sözcüğünün okunuşunu yaz.',
              cevaplar: ['namu', 'na mu', 'na-mu'],
              aciklama: '나 (na) + 무 (mu) = namu.',
            ),
            Secim(
              soru: '고기 (gogi) ne anlama gelir?',
              secenekler: ['Et', 'Süt', 'Şapka'],
              dogru: 0,
              aciklama: '고기 (gogi) et demektir.',
            ),
            Dinle(
              soru: 'Hangi sözcüğü duydun?',
              okunacak: '나무',
              secenekler: ['나무', '고기', '바지'],
              dogru: 0,
              dil: _ko,
              aciklama: '나무 (namu) ağaç demektir.',
            ),
          ],
        ),
        Ders(
          id: 'korece-1.u1.d2',
          ad: 'Hece birleştirme ve okunuş',
          alistirmalar: [
            Secim(
              soru: 'ㅡ ünlüsü Türkçede hangi sese yakındır?',
              secenekler: ['ı', 'ü', 'e'],
              dogru: 0,
              aciklama: 'ㅡ (eu) dudaklar yayılarak çıkan "ı" sesine yakındır.',
            ),
            Eslestir(
              soru: 'Heceyi okunuşuyla eşleştir.',
              ciftler: [
                (sol: '하', sag: 'ha hecesi'),
                (sol: '사', sag: 'sa hecesi'),
                (sol: '무', sag: 'mu hecesi'),
                (sol: '기', sag: 'gi hecesi'),
              ],
              aciklama: 'Hece = ünsüz + ünlü: ㅎ+ㅏ=하, ㅅ+ㅏ=사, ㅁ+ㅜ=무, ㄱ+ㅣ=기.',
            ),
            Secim(
              soru: 'Hecenin altındaki bitiş ünsüzüne ne ad verilir?',
              secenekler: ['Patchim (받침)', 'Ünlü', 'Ton'],
              dogru: 0,
              aciklama: 'Hecenin sonundaki ünsüze patchim (받침) denir: 한 (han).',
            ),
            Bosluk(
              soru: 'ㅎ + ㅏ + ㄴ = ___',
              secenekler: ['한', '할', '함'],
              dogru: 0,
              aciklama: 'ㅎ (h) + ㅏ (a) + ㄴ (n) = 한 (han).',
            ),
            Bosluk(
              soru: 'ㄴ + ㅣ = ___',
              secenekler: ['나', '니', '누'],
              dogru: 1,
              aciklama: 'ㄴ (n) ile ㅣ (i) birleşince 니 (ni) olur.',
            ),
            Secim(
              soru: 'ㅇ harfi hece başında nasıl okunur?',
              secenekler: ['Sessiz, ses vermez', 'ng', 'h'],
              dogru: 0,
              aciklama:
                  'Hece başındaki ㅇ sessizdir; yalnız ünlüyü taşır: 아 (a). Hece sonunda "ng" okunur.',
            ),
            Yaz(
              soru: '한 hecesinin okunuşunu yaz.',
              cevaplar: ['han'],
              aciklama: '한 = h + a + n = han.',
            ),
            Yaz(
              soru: '아이 (çocuk) sözcüğünün okunuşunu yaz.',
              cevaplar: ['ai', 'a i', 'a-i'],
              aciklama: '아 (a) + 이 (i) = ai.',
            ),
            Sirala(
              soru: 'Hecelerle sözcük kur: baji (pantolon).',
              kelimeler: ['지', '바'],
              dogru: ['바', '지'],
              aciklama: '바 (ba) + 지 (ji) = 바지 (baji), pantolon.',
            ),
            Dinle(
              soru: 'Hangi sözcüğü duydun?',
              okunacak: '바지',
              secenekler: ['바지', '모자', '가수'],
              dogru: 0,
              dil: _ko,
              aciklama: '바지 (baji) pantolon demektir.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'korece-1.u2',
      ad: 'Selamlaşma ve tanışma',
      dersler: [
        Ders(
          id: 'korece-1.u2.d1',
          ad: 'Merhaba ve teşekkür',
          alistirmalar: [
            Secim(
              soru: '안녕하세요 (annyeonghaseyo) hangi anlama gelir?',
              secenekler: ['Merhaba', 'Teşekkür ederim', 'Güle güle'],
              dogru: 0,
              aciklama: '안녕하세요 (annyeonghaseyo) nazik bir merhabadır.',
            ),
            Secim(
              soru: 'Teşekkür etmek için ne dersin?',
              secenekler: [
                '감사합니다 (gamsahamnida)',
                '안녕하세요 (annyeonghaseyo)',
                '아니요 (aniyo)',
              ],
              dogru: 0,
              aciklama: '감사합니다 (gamsahamnida): Teşekkür ederim.',
            ),
            Secim(
              soru: '네 (ne) ne anlama gelir?',
              secenekler: ['Evet', 'Hayır', 'Lütfen'],
              dogru: 0,
              aciklama: '네 (ne) evet; 아니요 (aniyo) hayır demektir.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: '안녕하세요 (annyeonghaseyo)', sag: 'Merhaba'),
                (sol: '감사합니다 (gamsahamnida)', sag: 'Teşekkür ederim'),
                (sol: '네 (ne)', sag: 'Evet'),
              ],
              aciklama: 'Bu üç ifade günlük konuşmanın temelidir.',
            ),
            Bosluk(
              soru: 'Teşekkür ederim: ___ (gamsahamnida)',
              secenekler: ['감사합니다', '안녕하세요', '죄송합니다'],
              dogru: 0,
              aciklama: '감사합니다 (gamsahamnida) teşekkür ifadesidir.',
            ),
            Secim(
              soru: 'Birinden özür dilerken ne dersin?',
              secenekler: ['죄송합니다 (joesonghamnida)', '네 (ne)', '저 (jeo)'],
              dogru: 0,
              aciklama: '죄송합니다 (joesonghamnida): Özür dilerim.',
            ),
            Yaz(
              soru:
                  'Korecede "Merhaba" nasıl söylenir? Okunuşunu (ya da Hangıl yazısını) yaz.',
              cevaplar: ['annyeonghaseyo', 'annyeong haseyo', '안녕하세요'],
              aciklama: '안녕하세요 (annyeonghaseyo).',
            ),
            Sirala(
              soru: 'Sıraya diz: Tanıştığımıza memnun oldum.',
              kelimeler: ['반갑습니다', '만나서'],
              dogru: ['만나서', '반갑습니다'],
              aciklama:
                  '만나서 반갑습니다 (mannaseo bangapseumnida): Tanıştığımıza memnun oldum.',
            ),
            Dinle(
              soru: 'Hangi ifadeyi duydun?',
              okunacak: '안녕하세요',
              secenekler: ['안녕하세요', '감사합니다', '죄송합니다'],
              dogru: 0,
              dil: _ko,
              aciklama: '안녕하세요 (annyeonghaseyo): Merhaba.',
            ),
          ],
        ),
        Ders(
          id: 'korece-1.u2.d2',
          ad: 'Kendini tanıtma',
          alistirmalar: [
            Secim(
              soru: 'Kendini tanıtırken "ben" için hangisi kullanılır?',
              secenekler: ['저 (jeo)', '네 (ne)', '이름 (ireum)'],
              dogru: 0,
              aciklama: '저 (jeo) nazik "ben"dir; 저는 (jeoneun): Ben...',
            ),
            Secim(
              soru: '학생 (haksaeng) ne anlama gelir?',
              secenekler: ['Öğrenci', 'Öğretmen', 'Arkadaş'],
              dogru: 0,
              aciklama: '학생 (haksaeng) öğrenci demektir.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: '이름 (ireum)', sag: 'İsim, ad'),
                (sol: '학생 (haksaeng)', sag: 'Öğrenci'),
                (sol: '사람 (saram)', sag: 'İnsan, kişi'),
              ],
              aciklama: 'Tanışırken sık kullanılan üç sözcük.',
            ),
            Bosluk(
              soru: '저는 ___이에요. (Ben öğrenciyim.)',
              secenekler: ['학생', '이름', '한국'],
              dogru: 0,
              aciklama: '저는 학생이에요 (jeoneun haksaengieyo): Ben öğrenciyim.',
            ),
            Bosluk(
              soru: '제 ___은 민수예요. (Benim adım Minsu.)',
              secenekler: ['이름', '학생', '사람'],
              dogru: 0,
              aciklama: '제 이름은 민수예요 (je ireumeun minsuyeyo): Benim adım Minsu.',
            ),
            Yaz(
              soru: 'Türkçeye çevir: 저는 학생이에요. (jeoneun haksaengieyo)',
              cevaplar: ['ben öğrenciyim', 'öğrenciyim'],
              aciklama: '저는 = ben, 학생 = öğrenci, 이에요 = ...im/dır.',
            ),
            Yaz(
              soru:
                  'Korecede "Öğrenci" nasıl söylenir? Okunuşunu (ya da Hangıl yazısını) yaz.',
              cevaplar: ['haksaeng', '학생'],
              aciklama: '학생 (haksaeng).',
            ),
            Sirala(
              soru: 'Sıraya diz: Ben öğrenciyim.',
              kelimeler: ['학생이에요', '저는'],
              dogru: ['저는', '학생이에요'],
              aciklama: 'Sıra: özne + yüklem. 저는 학생이에요.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: '저는 학생이에요',
              secenekler: ['저는 학생이에요', '저는 한국 사람이에요', '제 이름은 민수예요'],
              dogru: 0,
              dil: _ko,
              aciklama: '저는 학생이에요 (jeoneun haksaengieyo): Ben öğrenciyim.',
            ),
            Soyle(
              soru: 'Yüksek sesle söyle (mannaseo bangapseumnida).',
              metin: '만나서 반갑습니다',
              ceviri: 'Tanıştığımıza memnun oldum',
              dil: _ko,
              aciklama: '만나서 반갑습니다 (mannaseo bangapseumnida).',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'korece-1.u3',
      ad: 'Sayılar ve günlük ifadeler',
      dersler: [
        Ders(
          id: 'korece-1.u3.d1',
          ad: 'Sayılar 1-10 (Çin-Kore sayıları)',
          alistirmalar: [
            Secim(
              soru: '삼 (sam) hangi sayıdır?',
              secenekler: ['3', '5', '8'],
              dogru: 0,
              aciklama: '삼 (sam) üç demektir.',
            ),
            Secim(
              soru: '십 (sip) hangi sayıdır?',
              secenekler: ['10', '1', '7'],
              dogru: 0,
              aciklama: '십 (sip) on demektir.',
            ),
            Secim(
              soru: '5 sayısı Çin-Korecesinde nasıl söylenir?',
              secenekler: ['오 (o)', '이 (i)', '구 (gu)'],
              dogru: 0,
              aciklama: '오 (o) beş; 이 (i) iki; 구 (gu) dokuz demektir.',
            ),
            Eslestir(
              soru: 'Sayıyı eşleştir.',
              ciftler: [
                (sol: '일 (il)', sag: 'Bir'),
                (sol: '삼 (sam)', sag: 'Üç'),
                (sol: '십 (sip)', sag: 'On'),
              ],
              aciklama: '일 (il) 1, 삼 (sam) 3, 십 (sip) 10.',
            ),
            Bosluk(
              soru: '일, 이, ___, 사, 오 (il, i, ___, sa, o)',
              secenekler: ['삼', '오', '칠'],
              dogru: 0,
              aciklama: 'Sıra: 일 (1), 이 (2), 삼 (3), 사 (4), 오 (5).',
            ),
            Bosluk(
              soru: '팔, 구, ___ (pal, gu, ___)',
              secenekler: ['십', '육', '일'],
              dogru: 0,
              aciklama: '팔 (8), 구 (9), 십 (10).',
            ),
            Yaz(
              soru:
                  '7 sayısının Korecesini okunuşuyla (ya da Hangıl yazısıyla) yaz.',
              cevaplar: ['chil', '칠'],
              aciklama: '칠 (chil) yedi demektir.',
            ),
            Yaz(
              soru: '육 (yuk) kaçtır? Rakamla ya da Türkçe yazıyla yaz.',
              cevaplar: ['6', 'altı'],
              aciklama: '육 (yuk) altı demektir.',
            ),
            Sirala(
              soru: 'Sıraya diz: bir, iki, üç.',
              kelimeler: ['삼', '일', '이'],
              dogru: ['일', '이', '삼'],
              aciklama: '일 (il), 이 (i), 삼 (sam).',
            ),
            Dinle(
              soru: 'Hangi sayıyı duydun?',
              okunacak: '삼',
              secenekler: ['삼', '사', '오'],
              dogru: 0,
              dil: _ko,
              aciklama: '삼 (sam) üç demektir; 사 (sa) dörttür.',
            ),
          ],
        ),
        Ders(
          id: 'korece-1.u3.d2',
          ad: 'Günlük ifadeler',
          alistirmalar: [
            Secim(
              soru: 'Garsondan su isterken ne dersin?',
              secenekler: ['물 주세요 (mul juseyo)', '내일 (naeil)', '오늘 (oneul)'],
              dogru: 0,
              aciklama: '물 주세요 (mul juseyo): Su verir misiniz?',
            ),
            Secim(
              soru: '얼마예요? (eolmayeyo) ne sorar?',
              secenekler: ['Ne kadar? (fiyat)', 'Nerede?', 'Kim?'],
              dogru: 0,
              aciklama: '얼마예요? (eolmayeyo): Ne kadar?',
            ),
            Secim(
              soru: '맛있어요 (masisseoyo) ne anlama gelir?',
              secenekler: ['Lezzetli', 'Soğuk', 'Büyük'],
              dogru: 0,
              aciklama: '맛있어요 (masisseoyo): Lezzetli.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: '물 (mul)', sag: 'Su'),
                (sol: '오늘 (oneul)', sag: 'Bugün'),
                (sol: '내일 (naeil)', sag: 'Yarın'),
              ],
              aciklama: 'Su, bugün ve yarın: günlük hayatın temel sözcükleri.',
            ),
            Bosluk(
              soru: '___ 주세요. (… juseyo.) Su lütfen.',
              secenekler: ['물', '오늘', '내일'],
              dogru: 0,
              aciklama: '물 주세요 (mul juseyo): Su verir misiniz?',
            ),
            Bosluk(
              soru: '오늘 (bugün) ↔ ___ (yarın)',
              secenekler: ['내일', '물', '삼'],
              dogru: 0,
              aciklama: '내일 (naeil) yarın demektir.',
            ),
            Yaz(
              soru:
                  'Korecede "Yarın" nasıl söylenir? Okunuşunu (ya da Hangıl yazısını) yaz.',
              cevaplar: ['naeil', '내일'],
              aciklama: '내일 (naeil).',
            ),
            Yaz(
              soru: '물 (mul) ne demektir? Türkçe yaz.',
              cevaplar: ['su'],
              aciklama: '물 (mul) su demektir.',
            ),
            Sirala(
              soru: 'Sıraya diz: Su lütfen.',
              kelimeler: ['주세요', '물'],
              dogru: ['물', '주세요'],
              aciklama: '물 주세요 (mul juseyo).',
            ),
            Dinle(
              soru: 'Hangi ifadeyi duydun?',
              okunacak: '물 주세요',
              secenekler: ['물 주세요', '얼마예요', '맛있어요'],
              dogru: 0,
              dil: _ko,
              aciklama: '물 주세요 (mul juseyo): Su verir misiniz?',
            ),
            Soyle(
              soru: 'Yüksek sesle söyle (eolmayeyo).',
              metin: '얼마예요',
              ceviri: 'Ne kadar?',
              dil: _ko,
              aciklama: '얼마예요 (eolmayeyo): Ne kadar?',
            ),
          ],
        ),
      ],
    ),
  ],
);
