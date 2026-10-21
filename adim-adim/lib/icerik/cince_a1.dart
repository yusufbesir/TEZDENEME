/// Çince (Mandarin) A1: Başlangıç. Üç ünite: Yazı sistemi (Pinyin, 4 ton ve
/// 10 temel hanzi), Selamlaşma ve tanışma, Sayılar ve günlük ifadeler. Her
/// Çince sözcüğün yanında okunuşu (Pinyin) ve Türkçe anlamı verilir; Yaz
/// alıştırmalarında Pinyin (tonlu ya da tonsuz) ya da hanzi kabul edilir.
///
/// Yazı tipi notu: Hanzi için yeni yazı tipi GÖMÜLMEZ; Windows'ta sistem
/// yazı tipleri (Microsoft YaHei) kullanılır. Sesli okuma için Windows'ta
/// zh-CN ses paketi kurulu olmalıdır (docs/KURS-KO-JA-ZH-NOTLAR.md).
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
library;

import '../model/icerik.dart';

const String _zh = 'zh-CN';

const Kurs cinceA1 = Kurs(
  id: 'cince-1',
  ad: 'Çince A1: Başlangıç',
  aciklama:
      'Sıfırdan Çince: önce Pinyin, 4 ton ve temel hanziler, sonra selamlaşma, tanışma, sayılar ve günlük ifadeler.',
  alan: KursAlani.dil,
  uniteler: [
    Unite(
      id: 'cince-1.u1',
      ad: 'Yazı sistemi',
      dersler: [
        Ders(
          id: 'cince-1.u1.d1',
          ad: 'Pinyin ve dört ton',
          alistirmalar: [
            Secim(
              soru: 'Birinci ton (mā) nasıl bir sestir?',
              secenekler: ['Yüksek ve düz', 'Yükselen', 'Düşen'],
              dogru: 0,
              aciklama: 'Birinci ton yüksek ve düz tutulur: mā.',
            ),
            Secim(
              soru: 'mà hecesindeki işaret hangi tonu gösterir?',
              secenekler: ['Dördüncü ton (düşen)', 'Birinci ton', 'İkinci ton'],
              dogru: 0,
              aciklama: 'Düşen işaret (`) dördüncü tonu gösterir: mà.',
            ),
            Eslestir(
              soru: 'Ton işaretini tonun adıyla eşleştir.',
              ciftler: [
                (sol: 'ā', sag: '1. ton: yüksek düz'),
                (sol: 'á', sag: '2. ton: yükselen'),
                (sol: 'ǎ', sag: '3. ton: alçalıp yükselen'),
                (sol: 'à', sag: '4. ton: düşen'),
              ],
              aciklama: 'Dört ton: ā á ǎ à.',
            ),
            Secim(
              soru: 'Pinyin\'deki "ü" harfi nasıl okunur?',
              secenekler: [
                'Türkçedeki ü gibi',
                'Türkçedeki u gibi',
                'Türkçedeki i gibi',
              ],
              dogru: 0,
              aciklama: 'ü, Türkçedeki ü sesidir: nǚ (kadın).',
            ),
            Secim(
              soru: 'Pinyin\'deki "sh" ikilisi hangi sese yakındır?',
              secenekler: ['ş', 's', 'h'],
              dogru: 0,
              aciklama: 'sh, dil ucu hafif kıvrılarak çıkan "ş" sesidir: shān.',
            ),
            Bosluk(
              soru: 'ma + üçüncü ton = ___',
              secenekler: ['mǎ', 'mā', 'mà'],
              dogru: 0,
              aciklama: 'Üçüncü ton işareti ˇ biçimindedir: mǎ.',
            ),
            Yaz(
              soru: 'mà hecesi kaçıncı tondur? Rakamla ya da yazıyla yaz.',
              cevaplar: ['4', 'dört', '4. ton', 'dördüncü'],
              aciklama: 'mà dördüncü tondur (düşen).',
            ),
            Yaz(
              soru: 'mā hecesi kaçıncı tondur? Rakamla ya da yazıyla yaz.',
              cevaplar: ['1', 'bir', '1. ton', 'birinci'],
              aciklama: 'mā birinci tondur (yüksek düz).',
            ),
            Sirala(
              soru: 'Tonları 1\'den 4\'e doğru sırala.',
              kelimeler: ['mà', 'mā', 'mǎ', 'má'],
              dogru: ['mā', 'má', 'mǎ', 'mà'],
              aciklama: 'Sıra: mā (1), má (2), mǎ (3), mà (4).',
            ),
            Dinle(
              soru: 'Hangi hece-sözcüğü duydun? (Ton önemli!)',
              okunacak: '马',
              secenekler: ['妈', '马', '骂'],
              dogru: 1,
              dil: _zh,
              aciklama:
                  '马 (mǎ) at demektir; 妈 (mā) anne, 骂 (mà) azarlamak demektir.',
            ),
          ],
        ),
        Ders(
          id: 'cince-1.u1.d2',
          ad: 'On temel hanzi',
          alistirmalar: [
            Secim(
              soru: '一 hanzisi hangi sayıyı gösterir?',
              secenekler: ['Bir', 'İki', 'Üç'],
              dogru: 0,
              aciklama: '一 (yī) bir demektir: tek çizgi.',
            ),
            Secim(
              soru: '人 (rén) ne anlama gelir?',
              secenekler: ['İnsan', 'Dağ', 'Su'],
              dogru: 0,
              aciklama: '人 (rén) insan demektir; yürüyen iki bacağa benzer.',
            ),
            Secim(
              soru: '大 (dà) hanzisinin zıt anlamlısı hangisidir?',
              secenekler: ['小 (xiǎo)', '人 (rén)', '水 (shuǐ)'],
              dogru: 0,
              aciklama: '大 (dà) büyük, 小 (xiǎo) küçük demektir.',
            ),
            Eslestir(
              soru: 'Hanziyi anlamıyla eşleştir.',
              ciftler: [
                (sol: '一 (yī)', sag: 'Bir'),
                (sol: '人 (rén)', sag: 'İnsan'),
                (sol: '山 (shān)', sag: 'Dağ'),
                (sol: '水 (shuǐ)', sag: 'Su'),
              ],
              aciklama: 'Dört temel hanzi: 一 人 山 水.',
            ),
            Bosluk(
              soru: '一、二、___ (yī, èr, ___)',
              secenekler: ['三', '人', '山'],
              dogru: 0,
              aciklama: 'Sayılar: 一 (1), 二 (2), 三 (3).',
            ),
            Bosluk(
              soru: 'Su: ___ (shuǐ)',
              secenekler: ['水', '口', '日'],
              dogru: 0,
              aciklama:
                  '水 (shuǐ) su demektir; 口 (kǒu) ağız, 日 (rì) güneş/gün demektir.',
            ),
            Yaz(
              soru: '口 (kǒu) hanzisinin Türkçe anlamını yaz.',
              cevaplar: ['ağız', 'agiz'],
              aciklama: '口 (kǒu) ağız demektir; ağzın şeklini andırır.',
            ),
            Yaz(
              soru: 'Çincede "Büyük" nasıl söylenir? Pinyin (ya da hanzi) yaz.',
              cevaplar: ['dà', 'da', 'da4', '大'],
              aciklama: '大 (dà) büyük demektir; dördüncü ton.',
            ),
            Sirala(
              soru: 'Sıraya diz: bir, iki, üç.',
              kelimeler: ['三', '一', '二'],
              dogru: ['一', '二', '三'],
              aciklama: '一 (yī), 二 (èr), 三 (sān).',
            ),
            Dinle(
              soru: 'Hangi hanzinin okunuşunu duydun?',
              okunacak: '山',
              secenekler: ['山', '水', '人'],
              dogru: 0,
              dil: _zh,
              aciklama: '山 (shān) dağ demektir.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'cince-1.u2',
      ad: 'Selamlaşma ve tanışma',
      dersler: [
        Ders(
          id: 'cince-1.u2.d1',
          ad: 'Merhaba ve teşekkür',
          alistirmalar: [
            Secim(
              soru: '你好 (nǐ hǎo) ne anlama gelir?',
              secenekler: ['Merhaba', 'Hoşça kal', 'Teşekkürler'],
              dogru: 0,
              aciklama: '你好 (nǐ hǎo): Merhaba. Kelime anlamı "sen iyi".',
            ),
            Secim(
              soru: 'Teşekkür etmek için hangisi söylenir?',
              secenekler: ['谢谢 (xièxie)', '再见 (zàijiàn)', '对不起 (duìbuqǐ)'],
              dogru: 0,
              aciklama: '谢谢 (xièxie): Teşekkürler.',
            ),
            Secim(
              soru: '对不起 (duìbuqǐ) ne anlama gelir?',
              secenekler: ['Özür dilerim', 'Rica ederim', 'Güle güle'],
              dogru: 0,
              aciklama: '对不起 (duìbuqǐ): Özür dilerim.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: '你好 (nǐ hǎo)', sag: 'Merhaba'),
                (sol: '谢谢 (xièxie)', sag: 'Teşekkürler'),
                (sol: '再见 (zàijiàn)', sag: 'Hoşça kal'),
              ],
              aciklama: 'Üç temel ifade: merhaba, teşekkür, vedalaşma.',
            ),
            Bosluk(
              soru: 'Merhaba: ___ (nǐ hǎo)',
              secenekler: ['你好', '再见', '谢谢'],
              dogru: 0,
              aciklama: '你好 (nǐ hǎo): Merhaba.',
            ),
            Bosluk(
              soru: 'Hoşça kal: ___ (zàijiàn)',
              secenekler: ['再见', '你好', '谢谢'],
              dogru: 0,
              aciklama: '再见 (zàijiàn): Görüşmek üzere / Hoşça kal.',
            ),
            Yaz(
              soru:
                  'Çincede "Teşekkürler" nasıl söylenir? Pinyin (ya da hanzi) yaz.',
              cevaplar: ['xièxie', 'xiexie', 'xie xie', 'xiè xiè', '谢谢'],
              aciklama: '谢谢 (xièxie).',
            ),
            Yaz(
              soru: '你好 (nǐ hǎo) ne demektir? Türkçe yaz.',
              cevaplar: ['merhaba', 'selam'],
              aciklama: '你好 (nǐ hǎo): Merhaba.',
            ),
            Sirala(
              soru: 'Sıraya diz: Merhaba (nǐ hǎo).',
              kelimeler: ['好', '你'],
              dogru: ['你', '好'],
              aciklama: '你 (sen) + 好 (iyi) = 你好.',
            ),
            Dinle(
              soru: 'Hangi ifadeyi duydun?',
              okunacak: '你好',
              secenekler: ['你好', '谢谢', '再见'],
              dogru: 0,
              dil: _zh,
              aciklama: '你好 (nǐ hǎo): Merhaba.',
            ),
          ],
        ),
        Ders(
          id: 'cince-1.u2.d2',
          ad: 'Kendini tanıtma',
          alistirmalar: [
            Secim(
              soru: '我 (wǒ) ne anlama gelir?',
              secenekler: ['Ben', 'Sen', 'O'],
              dogru: 0,
              aciklama: '我 (wǒ) "ben" demektir.',
            ),
            Secim(
              soru: '你 (nǐ) ne anlama gelir?',
              secenekler: ['Sen', 'Ben', 'Biz'],
              dogru: 0,
              aciklama: '你 (nǐ) "sen" demektir.',
            ),
            Secim(
              soru: '学生 (xuésheng) ne anlama gelir?',
              secenekler: ['Öğrenci', 'Öğretmen', 'Doktor'],
              dogru: 0,
              aciklama: '学生 (xuésheng) öğrenci demektir.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: '我 (wǒ)', sag: 'Ben'),
                (sol: '你 (nǐ)', sag: 'Sen'),
                (sol: '学生 (xuésheng)', sag: 'Öğrenci'),
              ],
              aciklama: 'Kendini tanıtmanın üç temel sözcüğü.',
            ),
            Bosluk(
              soru: '我 ___ 学生。(Ben öğrenciyim.)',
              secenekler: ['是', '叫', '好'],
              dogru: 0,
              aciklama:
                  '是 (shì) "...dır/im" anlamında bağdır: 我是学生 (wǒ shì xuésheng).',
            ),
            Bosluk(
              soru: '我 ___ 小明。(Benim adım Xiaoming.)',
              secenekler: ['叫', '是', '不'],
              dogru: 0,
              aciklama:
                  '我叫小明 (wǒ jiào Xiǎomíng): Adım Xiaoming. 叫 (jiào) = adlandırılmak.',
            ),
            Yaz(
              soru: 'Türkçeye çevir: 我是学生。(wǒ shì xuésheng)',
              cevaplar: ['ben öğrenciyim', 'öğrenciyim'],
              aciklama: '我 = ben, 是 = ...dır/im, 学生 = öğrenci.',
            ),
            Yaz(
              soru: 'Çincede "Ben" nasıl söylenir? Pinyin (ya da hanzi) yaz.',
              cevaplar: ['wǒ', 'wo', 'wo3', '我'],
              aciklama: '我 (wǒ): üçüncü ton.',
            ),
            Sirala(
              soru: 'Sıraya diz: Ben öğrenciyim.',
              kelimeler: ['学生', '是', '我'],
              dogru: ['我', '是', '学生'],
              aciklama: 'Çincede de sıra özne + fiil + nesne: 我是学生.',
            ),
            Dinle(
              soru: 'Hangi cümleyi duydun?',
              okunacak: '我是学生',
              secenekler: ['我是学生', '我叫小明', '你好吗'],
              dogru: 0,
              dil: _zh,
              aciklama: '我是学生 (wǒ shì xuésheng): Ben öğrenciyim.',
            ),
            Soyle(
              soru: 'Yüksek sesle söyle (hěn gāoxìng rènshi nǐ).',
              metin: '很高兴认识你',
              ceviri: 'Tanıştığımıza memnun oldum',
              dil: _zh,
              aciklama: '很高兴认识你 (hěn gāoxìng rènshi nǐ).',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'cince-1.u3',
      ad: 'Sayılar ve günlük ifadeler',
      dersler: [
        Ders(
          id: 'cince-1.u3.d1',
          ad: 'Sayılar 1-10',
          alistirmalar: [
            Secim(
              soru: '三 (sān) hangi sayıdır?',
              secenekler: ['3', '5', '8'],
              dogru: 0,
              aciklama: '三 (sān) üç demektir: üç çizgi.',
            ),
            Secim(
              soru: '十 (shí) hangi sayıdır?',
              secenekler: ['10', '1', '9'],
              dogru: 0,
              aciklama: '十 (shí) on demektir.',
            ),
            Secim(
              soru: '5 sayısı Çincede nasıl yazılır?',
              secenekler: ['五 (wǔ)', '六 (liù)', '八 (bā)'],
              dogru: 0,
              aciklama: '五 (wǔ) beş; 六 (liù) altı; 八 (bā) sekiz demektir.',
            ),
            Eslestir(
              soru: 'Sayıyı eşleştir.',
              ciftler: [
                (sol: '五 (wǔ)', sag: 'Beş'),
                (sol: '八 (bā)', sag: 'Sekiz'),
                (sol: '十 (shí)', sag: 'On'),
              ],
              aciklama: '五 (5), 八 (8), 十 (10).',
            ),
            Bosluk(
              soru: '一、二、___、四 (yī, èr, ___, sì)',
              secenekler: ['三', '五', '七'],
              dogru: 0,
              aciklama: 'Sıra: 一 二 三 四 (1 2 3 4).',
            ),
            Bosluk(
              soru: '八、九、___ (bā, jiǔ, ___)',
              secenekler: ['十', '六', '七'],
              dogru: 0,
              aciklama: '八 (8), 九 (9), 十 (10).',
            ),
            Yaz(
              soru: '6 sayısının Çincesini Pinyin (ya da hanzi) ile yaz.',
              cevaplar: ['liù', 'liu', 'liu4', '六'],
              aciklama: '六 (liù) altı demektir.',
            ),
            Yaz(
              soru: '七 (qī) kaçtır? Rakamla ya da Türkçe yazıyla yaz.',
              cevaplar: ['7', 'yedi'],
              aciklama: '七 (qī) yedi demektir.',
            ),
            Sirala(
              soru: 'Sıraya diz: dört, beş, altı.',
              kelimeler: ['六', '四', '五'],
              dogru: ['四', '五', '六'],
              aciklama: '四 (sì), 五 (wǔ), 六 (liù).',
            ),
            Dinle(
              soru: 'Hangi sayıyı duydun?',
              okunacak: '六',
              secenekler: ['六', '八', '九'],
              dogru: 0,
              dil: _zh,
              aciklama: '六 (liù) altı; 八 (bā) sekiz; 九 (jiǔ) dokuzdur.',
            ),
          ],
        ),
        Ders(
          id: 'cince-1.u3.d2',
          ad: 'Günlük ifadeler',
          alistirmalar: [
            Secim(
              soru: 'Su istemek için hangisi söylenir?',
              secenekler: [
                '我要水 (wǒ yào shuǐ)',
                '今天 (jīntiān)',
                '明天 (míngtiān)',
              ],
              dogru: 0,
              aciklama: '我要水 (wǒ yào shuǐ): Su istiyorum.',
            ),
            Secim(
              soru: '多少钱 (duōshao qián) ne sorar?',
              secenekler: ['Ne kadar? (fiyat)', 'Nerede?', 'Kim?'],
              dogru: 0,
              aciklama: '多少钱 (duōshao qián): Kaç para / Ne kadar?',
            ),
            Secim(
              soru: '好吃 (hǎochī) ne anlama gelir?',
              secenekler: ['Lezzetli', 'Soğuk', 'Büyük'],
              dogru: 0,
              aciklama: '好吃 (hǎochī): Lezzetli.',
            ),
            Eslestir(
              soru: 'Eşleştir.',
              ciftler: [
                (sol: '今天 (jīntiān)', sag: 'Bugün'),
                (sol: '明天 (míngtiān)', sag: 'Yarın'),
                (sol: '多少钱 (duōshao qián)', sag: 'Ne kadar?'),
              ],
              aciklama: 'Bugün, yarın ve fiyat sorma kalıbı.',
            ),
            Bosluk(
              soru: '我要 ___。(Su istiyorum.)',
              secenekler: ['水', '今天', '明天'],
              dogru: 0,
              aciklama: '我要水 (wǒ yào shuǐ): Su istiyorum. 要 (yào) = istemek.',
            ),
            Bosluk(
              soru: '今天 (bugün) ↔ ___ (yarın)',
              secenekler: ['明天', '水', '多少钱'],
              dogru: 0,
              aciklama: '明天 (míngtiān) yarın demektir.',
            ),
            Yaz(
              soru: 'Çincede "Yarın" nasıl söylenir? Pinyin (ya da hanzi) yaz.',
              cevaplar: [
                'míngtiān',
                'mingtian',
                'ming tian',
                'míng tiān',
                '明天',
              ],
              aciklama: '明天 (míngtiān).',
            ),
            Yaz(
              soru: '今天 (jīntiān) ne demektir? Türkçe yaz.',
              cevaplar: ['bugün', 'bugun'],
              aciklama: '今天 (jīntiān) bugün demektir.',
            ),
            Sirala(
              soru: 'Sıraya diz: Su istiyorum.',
              kelimeler: ['水', '要', '我'],
              dogru: ['我', '要', '水'],
              aciklama: '我 (ben) + 要 (istemek) + 水 (su).',
            ),
            Dinle(
              soru: 'Hangi ifadeyi duydun?',
              okunacak: '多少钱',
              secenekler: ['多少钱', '好吃', '今天'],
              dogru: 0,
              dil: _zh,
              aciklama: '多少钱 (duōshao qián): Ne kadar?',
            ),
            Soyle(
              soru: 'Yüksek sesle söyle (duōshao qián).',
              metin: '多少钱',
              ceviri: 'Ne kadar?',
              dil: _zh,
              aciklama: '多少钱 (duōshao qián).',
            ),
          ],
        ),
      ],
    ),
  ],
);
