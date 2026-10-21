import '../model/icerik.dart';

/// Satranç İleri: piyon son oyunları (kare kuralı, muhalefet), kale son
/// oyunları (Lucena, Philidor, Tarrasch kuralı), açılış fikirleri ve orta
/// oyun planları. Piyon son oyunu bulmacalarının tek kazanan/tek berabere
/// hamlesi şah-piyon-şah çözümleyicisiyle denetlendi; tüm FEN ve hamleler
/// test/satranc_icerik_test.dart ile kural motorunda doğrulanır.
const Kurs satranc3 = Kurs(
  id: 'satranc-3',
  ad: 'Satranç İleri',
  aciklama:
      'Piyon ve kale son oyunları, muhalefet, açılış fikirleri ve orta oyun '
      'planlarıyla oyununu derinleştir.',
  alan: KursAlani.oyun,
  uniteler: [
    Unite(
      id: 'satranc-3-u1',
      ad: 'Piyon son oyunları',
      dersler: [
        Ders(
          id: 'satranc-3-u1-d1',
          ad: 'Kare kuralı ve geçer piyon',
          dilbilgisiNotu:
              'Kare kuralı: piyondan terfi karesine kadar bir kenar çiz ve '
              'bunu kareye tamamla. Sıra kendisindeyken rakip şah bu karenin '
              'içine girebiliyorsa piyonu yakalar.',
          alistirmalar: [
            Secim(
              soru: 'Kare kuralı neyi hesaplamaya yarar?',
              secenekler: [
                'Şahın, yalnız ilerleyen piyonu yakalayıp yakalayamayacağını',
                'Rokun yapılıp yapılamayacağını',
                'Taşların puanını',
              ],
              dogru: 0,
              aciklama: 'Saymadan, göz kararıyla hızlı karar verdirir.',
            ),
            Hamle(
              soru:
                  'Beyaz oynar ve kazanır: siyah şah piyonun karesine '
                  'girmesin.',
              fen: '8/8/8/8/1P4k1/8/7K/8 w - - 0 1',
              hamleler: ['b4b5'],
              hataMesajlari: {
                'h2g2':
                    'Şah hamlesi zaman kaybettirir; siyah şah piyonun '
                    'karesine girer.',
                'h2g1':
                    'Şah hamlesi zaman kaybettirir; siyah şah piyonun '
                    'karesine girer.',
                'h2h1':
                    'Şah hamlesi zaman kaybettirir; siyah şah piyonun '
                    'karesine girer.',
              },
              aciklama:
                  'b5 ile piyonun karesi b5–e5–e8–b8 olur; g4\'teki şah bir '
                  'hamlede bu kareye giremez.',
            ),
            Hamle(
              soru: 'Siyah oynar ve berabere kalır: piyonun karesine gir.',
              fen: '8/8/8/8/1P6/6k1/8/7K b - - 0 1',
              hamleler: ['g3f4'],
              hataMesajlari: {
                'g3f3': 'Bu kare piyonun karesinin dışında; piyon kaçar.',
                'g3g4': 'Bu kare piyonun karesinin dışında; piyon kaçar.',
                'g3h4': 'Bu kare piyonun karesinin dışında; piyon kaçar.',
                'g3h3': 'Bu kare piyonun karesinin dışında; piyon kaçar.',
                'g3f2': 'Bu kare piyonun karesinin dışında; piyon kaçar.',
              },
              aciklama:
                  'b4 piyonunun karesi b4–f4–f8–b8\'dir; Şf4 ile şah karenin '
                  'içine girer ve piyonu yakalar.',
            ),
            Bosluk(
              soru:
                  'Önünde ve yan sütunlarında rakip piyon olmayan piyona '
                  '___ piyon denir.',
              secenekler: ['geçer', 'zayıf', 'çifte', 'geri'],
              dogru: 0,
              aciklama: 'Geçer piyonu yalnız taşlar durdurabilir.',
            ),
            Secim(
              soru:
                  'Kare kuralında piyon henüz başlangıç sırasındaysa ne '
                  'yapılır?',
              secenekler: [
                'Kare, piyon bir kare ilerlemiş gibi çizilir',
                'Kural uygulanmaz',
                'Kare bir kare küçültülür',
              ],
              dogru: 0,
              aciklama: 'Çünkü piyon ilk hamlesinde iki kare gidebilir.',
            ),
            Eslestir(
              soru: 'Terimi eşleştir.',
              ciftler: [
                (sol: 'Geçer piyon', sag: 'Önünü kesecek rakip piyon yok'),
                (sol: 'Kare kuralı', sag: 'Şah piyonu yakalar mı?'),
                (sol: 'Terfi', sag: 'Piyonun son sırada taşa dönüşmesi'),
              ],
              aciklama: 'Son oyunda geçer piyon en büyük kozdur.',
            ),
            Secim(
              soru: 'Son oyunda şah nasıl kullanılmalıdır?',
              secenekler: [
                'Etkin: merkeze ve piyonların yanına gelmeli',
                'Köşede saklanmalı',
                'Hiç oynamamalı',
              ],
              dogru: 0,
              aciklama: 'Taşlar azalınca şah güçlü bir saldırı taşıdır.',
            ),
            Yaz(
              soru:
                  'Beyaz piyon a5\'te. Piyonun karesinin köşeleri a5, a8, d8 '
                  've hangi karedir?',
              cevaplar: ['d5'],
              aciklama: 'a5\'ten a8\'e 3 hamle: kare a5–d5–d8–a8.',
            ),
            Secim(
              soru:
                  'Beyaz piyon h4\'te, beyaz şah uzakta; sıra siyahta. Siyah '
                  'şah hangi karedeyse piyonu yakalar?',
              secenekler: ['e5', 'b5', 'a1', 'b8'],
              dogru: 0,
              aciklama: 'Piyonun karesi h4–d4–d8–h8; e5 bu karenin içindedir.',
            ),
          ],
        ),
        Ders(
          id: 'satranc-3-u1-d2',
          ad: 'Muhalefet',
          dilbilgisiNotu:
              'Muhalefet: iki şah aynı sütunda (ya da sırada), aralarında '
              'bir kare olacak biçimde karşı karşıya durur. Sıra rakipteyse '
              'muhalefet sendedir: rakip şah yol vermek zorunda kalır.',
          alistirmalar: [
            Secim(
              soru: 'Muhalefet nedir?',
              secenekler: [
                'Şahların arada bir kareyle karşı karşıya durması; sıra '
                    'rakipteyse muhalefet sendedir',
                'Şahın rakip şaha bitişik durması',
                'Piyonların karşılıklı kilitlenmesi',
              ],
              dogru: 0,
              aciklama: 'Şah ve piyon son oyunlarının anahtar kavramıdır.',
            ),
            Hamle(
              soru: 'Beyaz oynar ve kazanır: muhalefeti al.',
              fen: '8/4k3/8/8/3KP3/8/8/8 w - - 0 1',
              hamleler: ['d4e5'],
              hataMesajlari: {
                'e4e5':
                    'Piyonu erken ittin; siyah şah muhalefeti alır ve '
                    'berabere biter.',
                'd4d5':
                    'Şd5? Şd7! siyah muhalefeti alır; beyaz şah öne geçemez.',
              },
              aciklama:
                  'Şe5 ile beyaz şah piyonun önünde muhalefeti alır; siyah '
                  'şah yol vermek zorunda kalır.',
            ),
            Hamle(
              soru: 'Beyaz oynar ve kazanır: şahınla muhalefeti al.',
              fen: '8/8/4k3/8/8/3KP3/8/8 w - - 0 1',
              hamleler: ['d3e4'],
              hataMesajlari: {
                'e3e4':
                    'Piyonu ittin; siyah şah muhalefeti korur ve oyun '
                    'berabere biter.',
              },
              aciklama: 'Şe4 ile şahlar karşı karşıya; sıra siyahta.',
            ),
            Hamle(
              soru: 'Siyah oynar ve berabere kalır: muhalefeti al.',
              fen: '4k3/8/8/4K3/4P3/8/8/8 b - - 0 1',
              hamleler: ['e8e7'],
              hataMesajlari: {
                'e8d8':
                    'Bu hamleden sonra beyaz şah muhalefeti alır ve kazanır.',
                'e8f8':
                    'Bu hamleden sonra beyaz şah muhalefeti alır ve kazanır.',
                'e8d7':
                    'Bu hamleden sonra beyaz şah muhalefeti alır ve kazanır.',
                'e8f7':
                    'Bu hamleden sonra beyaz şah muhalefeti alır ve kazanır.',
              },
              aciklama: 'Şe7 ile siyah muhalefeti alır; beyaz şah ilerleyemez.',
            ),
            Hamle(
              soru: 'Siyah oynar ve berabere kalır.',
              fen: '8/8/4k3/8/3KP3/8/8/8 b - - 0 1',
              hamleler: ['e6d6'],
              hataMesajlari: {
                'e6e7': 'Beyaz şah öne geçer (Şd5) ve kazanır.',
                'e6f6': 'Beyaz şah öne geçer (Şd5) ve kazanır.',
                'e6f7': 'Beyaz şah öne geçer (Şd5) ve kazanır.',
                'e6d7': 'Beyaz şah öne geçer (Şd5) ve kazanır.',
              },
              aciklama: 'Şd6 ile siyah, beyaz şahın önünde muhalefeti tutar.',
            ),
            Bosluk(
              soru: 'Muhalefette sıra rakipteyse rakip şah ___ zorunda kalır.',
              secenekler: ['yol vermek', 'mat olmak', 'rok yapmak'],
              dogru: 0,
              aciklama: 'Bu duruma hamle zorunluluğu (zugzwang) da denir.',
            ),
            Secim(
              soru:
                  'Beyaz şah piyonun önünde 6. sıraya ulaştıysa (kale piyonu '
                  'değilse) sonuç genellikle nedir?',
              secenekler: [
                'Sıra kimde olursa olsun beyaz kazanır',
                'Her zaman berabere',
                'Siyah kazanır',
              ],
              dogru: 0,
              aciklama: 'Ör. Şe6, piyon e5 – Şe8: beyaz kazanır.',
            ),
            Secim(
              soru:
                  'Kale piyonuyla (a ya da h) şah-piyon / şah son oyunu çoğu '
                  'zaman nasıl biter?',
              secenekler: [
                'Savunan şah köşeye ulaşırsa berabere',
                'Her zaman beyaz kazanır',
                'Her zaman siyah kazanır',
              ],
              dogru: 0,
              aciklama: 'Köşedeki şah çıkarılamaz; pat tehlikesi vardır.',
            ),
            Yaz(
              soru: 'Şahlar e4 ve e6\'da. Aralarında hangi kare var?',
              cevaplar: ['e5'],
              aciklama: 'Aralarında tek kare: bu muhalefettir.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'satranc-3-u2',
      ad: 'Kale son oyunları',
      dersler: [
        Ders(
          id: 'satranc-3-u2-d1',
          ad: 'Lucena ve Tarrasch kuralı',
          dilbilgisiNotu:
              'Lucena konumu: kazanan taraf kalesini 4. sıraya getirerek '
              '"köprü" kurar; şahı çıkınca rakip kalenin şahlarını kendi '
              'kalesiyle keser.',
          alistirmalar: [
            Secim(
              soru: 'Lucena konumunda kazanan tarafın ana fikri nedir?',
              secenekler: [
                'Kaleyle köprü kurup şahı rakip kalenin şahlarından korumak',
                'Piyonu feda etmek',
                'Kaleleri değişmek',
              ],
              dogru: 0,
              aciklama: 'Köprü, şahın önüne kale ile kalkan kurmaktır.',
            ),
            Hamle(
              soru: 'Lucena: köprü kur, kaleni 4. sıraya getir.',
              fen: '3K4/3P2k1/8/8/8/8/2r5/5R2 w - - 0 1',
              hamleler: ['f1f4'],
              aciklama:
                  'Kf4! Ardından şah e7 üzerinden çıkar; siyah kale şah '
                  'çekmeyi sürdürünce beyaz kale 4. sırada araya girer (Kd4).',
            ),
            Bosluk(
              soru:
                  'Lucena konumunda beyaz kale ___ sıraya giderek köprü kurar.',
              secenekler: ['dördüncü', 'birinci', 'sekizinci', 'yedinci'],
              dogru: 0,
              aciklama: 'Kale 4. sırada, şahın şah çekmelerini keser.',
            ),
            Secim(
              soru: 'Lucena konumunda savunan şah neden uzakta kalır?',
              secenekler: [
                'Rakip kale onu bir sütun uzakta keser',
                'Kendi isteğiyle',
                'Piyonlar engeller',
              ],
              dogru: 0,
              aciklama: 'Kesilmiş şah piyona yardım edemez.',
            ),
            Hamle(
              soru: 'Kaleni geçer piyonunun arkasına koy.',
              fen: '8/r7/4k3/P7/8/8/6K1/7R w - - 0 1',
              hamleler: ['h1a1'],
              aciklama:
                  'Ka1: piyon ilerledikçe arkadaki kale daha da etkin olur '
                  '(Tarrasch kuralı).',
            ),
            Eslestir(
              soru: 'Kavramı açıklamasıyla eşleştir.',
              ciftler: [
                (sol: 'Lucena', sag: 'Kazanma yöntemi: köprü kurmak'),
                (sol: 'Philidor', sag: 'Savunma yöntemi: kale 6. sırada'),
                (sol: 'Tarrasch kuralı', sag: 'Kale geçer piyonun arkasına'),
              ],
              aciklama: 'Kale son oyunlarının üç temel bilgisi.',
            ),
            Secim(
              soru: 'Tarrasch kuralına göre kale nerede durmalıdır?',
              secenekler: [
                'Geçer piyonun arkasında',
                'Piyonun önünde',
                'Köşede',
              ],
              dogru: 0,
              aciklama: 'Arkadaki kale piyonu iterken menzilini artırır.',
            ),
            Yaz(
              soru: 'Lucena konumunda köprü hangi taşla kurulur? (tek kelime)',
              cevaplar: ['kale'],
              aciklama: 'Kale 4. sıraya gelir ve kalkan olur.',
            ),
            Secim(
              soru: 'Kale son oyunlarında en sık yapılan hata nedir?',
              secenekler: [
                'Kaleyi pasif bırakmak',
                'Kaleyi etkin oynamak',
                'Şahı merkeze getirmek',
              ],
              dogru: 0,
              aciklama: 'Pasif kale yalnız savunur, oyunu kazanamaz.',
            ),
          ],
        ),
        Ders(
          id: 'satranc-3-u2-d2',
          ad: 'Philidor ve etkin kale',
          alistirmalar: [
            Secim(
              soru:
                  'Philidor savunmasında, piyon 5. sıradayken siyah kale '
                  'nerede durur?',
              secenekler: [
                '6. sırada: beyaz şahın ilerlemesini keser',
                '1. sırada',
                'Piyonun hemen önünde',
              ],
              dogru: 0,
              aciklama: 'Savunanın gözünden bu, kendi 3. sırasıdır.',
            ),
            Hamle(
              soru:
                  'Siyah oynar: Philidor savunması için kaleni 6. sıraya '
                  'getir.',
              fen: '4k3/7R/8/4K3/4P3/8/8/1r6 b - - 0 1',
              hamleler: ['b1b6'],
              aciklama:
                  'Kb6: beyaz şah 6. sıraya giremez. Piyon e6\'ya gelirse '
                  'kale 1. sıraya iner ve arkadan şah çeker.',
            ),
            Bosluk(
              soru:
                  'Philidor savunmasında piyon 6. sıraya gelince kale 1. '
                  'sıraya iner ve ___ şah çeker.',
              secenekler: ['arkadan', 'önden', 'yandan'],
              dogru: 0,
              aciklama: 'Beyaz şahın saklanacak yeri kalmaz.',
            ),
            Secim(
              soru:
                  'Kale ve kale piyonu (a ya da h) – kale son oyunu çoğu '
                  'zaman nasıl biter?',
              secenekler: [
                'Beraberliğe yakındır',
                'Her zaman kazanılır',
                'Her zaman kaybedilir',
              ],
              dogru: 0,
              aciklama: 'Kale piyonunda köprü kurmak zordur.',
            ),
            Hamle(
              soru: 'Kaleni siyahın geçer piyonunun arkasına getir.',
              fen: '8/8/4k3/8/7R/p7/8/6K1 w - - 0 1',
              hamleler: ['h4a4'],
              aciklama:
                  'Ka4: arkadan saldıran kale piyonu durdurur ve gerekirse '
                  'alır.',
            ),
            Eslestir(
              soru: 'İlkeyi açıklamasıyla eşleştir.',
              ciftler: [
                (sol: 'Etkin kale', sag: 'Piyonlara saldırır, rakibi kısıtlar'),
                (sol: 'Şahı kesmek', sag: 'Rakip şahı bir sütun uzakta tutmak'),
                (sol: 'Arkadan şah', sag: 'Kalenin uzaktan şah çekmesi'),
              ],
              aciklama: 'Kale uzun menzilde en güçlüdür.',
            ),
            Secim(
              soru: 'Kale son oyunlarında hangisi doğrudur?',
              secenekler: [
                'Kale uzak mesafeden şah çekmeyi sever',
                'Kale şaha yapışık durmalıdır',
                'Kale hiç şah çekmemelidir',
              ],
              dogru: 0,
              aciklama: 'Uzaktaki kaleye şah yaklaşıp saldıramaz.',
            ),
            Yaz(
              soru:
                  'Philidor savunmasında siyah kale hangi sıraya gider? '
                  '(rakamla)',
              cevaplar: ['6', '6.'],
              aciklama: 'Siyahın gözünden 3. sıra, tahtada 6. sıra.',
            ),
            Secim(
              soru:
                  'Beyaz şah ve piyon 5. sırada, siyah kale 6. sırada. Beyaz '
                  'piyonu 6. sıraya iterse siyah ne yapar?',
              secenekler: [
                'Kaleyi 1. sıraya indirip arkadan şah çeker',
                'Kaleyi 7. sıraya çeker',
                'Kaleyi piyonun önüne koyar',
              ],
              dogru: 0,
              aciklama: 'Piyon 6. sırada şaha artık siper olamaz.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'satranc-3-u3',
      ad: 'Açılış fikirleri',
      dersler: [
        Ders(
          id: 'satranc-3-u3-d1',
          ad: 'Açık oyunlar',
          alistirmalar: [
            Hamle(
              soru: 'İtalyan oyununu başlat: fili c4\'e çıkar.',
              fen:
                  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R '
                  'w KQkq - 2 3',
              hamleler: ['f1c4'],
              hataMesajlari: {
                'f1b5': 'Bu İspanyol açılışı; İtalyan oyunu Fc4 ile başlar.',
              },
              aciklama: 'Fc4 zayıf f7 karesine bakar.',
            ),
            Hamle(
              soru:
                  'İspanyol açılışı: fili b5\'e çıkar ve c6\'daki ata baskı '
                  'yap.',
              fen:
                  'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R '
                  'w KQkq - 2 3',
              hamleler: ['f1b5'],
              hataMesajlari: {
                'f1c4': 'Bu İtalyan oyunu; İspanyol açılışı Fb5 ile oynanır.',
              },
              aciklama: 'Fb5 e5 piyonunu koruyan ata baskı yapar.',
            ),
            Secim(
              soru: 'İtalyan oyununda Fc4 hangi zayıf kareyi hedefler?',
              secenekler: ['f7', 'a7', 'h7', 'd6'],
              dogru: 0,
              aciklama: 'f7\'yi başta yalnız siyah şah korur.',
            ),
            Hamle(
              soru:
                  'Şah gambiti: f piyonunu iki kare ilerleterek e5\'teki '
                  'piyona saldır.',
              fen:
                  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
              hamleler: ['f2f4'],
              hataMesajlari: {
                'f2f3':
                    'f3 piyona saldırmaz ve şahı zayıflatır; gambitte f4 '
                    'oynanır.',
              },
              aciklama: '2.f4: beyaz hızlı gelişim için piyon feda eder.',
            ),
            Bosluk(
              soru:
                  'Gelişim ya da saldırı için piyon feda edilen açılışlara '
                  '___ denir.',
              secenekler: ['gambit', 'rok', 'pat', 'çatal'],
              dogru: 0,
              aciklama: 'Şah gambiti, Vezir gambiti gibi.',
            ),
            Eslestir(
              soru: 'Açılışı ilk hamleleriyle eşleştir.',
              ciftler: [
                (sol: 'İtalyan oyunu', sag: '1.e4 e5 2.Af3 Ac6 3.Fc4'),
                (sol: 'İspanyol açılışı', sag: '1.e4 e5 2.Af3 Ac6 3.Fb5'),
                (sol: 'Şah gambiti', sag: '1.e4 e5 2.f4'),
              ],
              aciklama: 'Üçü de "açık oyun"dur: 1.e4 e5.',
            ),
            Secim(
              soru: 'İspanyol açılışında Fb5\'in temel fikri nedir?',
              secenekler: [
                'e5 piyonunu koruyan c6 atına baskı yapmak',
                'Şahı hemen mat etmek',
                'Vezirleri değişmek',
              ],
              dogru: 0,
              aciklama: 'At giderse e5 piyonu zayıflar.',
            ),
            Secim(
              soru: 'Açık oyunlar hangi ilk hamlelerle başlar?',
              secenekler: ['1.e4 e5', '1.d4 d5', '1.c4', '1.Af3 d5'],
              dogru: 0,
              aciklama: 'İki taraf da e piyonunu iki kare ilerletir.',
            ),
            Yaz(
              soru:
                  'Gambitte gelişim karşılığında çoğunlukla hangi taş feda '
                  'edilir? (tek kelime)',
              cevaplar: ['piyon'],
              aciklama: 'Gambit genellikle bir piyon fedasıdır.',
            ),
          ],
        ),
        Ders(
          id: 'satranc-3-u3-d2',
          ad: 'Kapalı ve yarı açık oyunlar',
          alistirmalar: [
            Hamle(
              soru: 'Vezir gambiti: c piyonunu iki kare ilerlet.',
              fen:
                  'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2',
              hamleler: ['c2c4'],
              hataMesajlari: {
                'c2c3':
                    'c3 sağlam ama gambit değil; Vezir gambitinde c4 oynanır.',
              },
              aciklama: '2.c4 siyahın d5 piyonuna kanattan saldırır.',
            ),
            Hamle(
              soru: 'Sicilya savunması: siyah c piyonunu iki kare ilerletsin.',
              fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
              hamleler: ['c7c5'],
              hataMesajlari: {
                'e7e5': 'Bu açık oyun; Sicilya savunması c5 ile oynanır.',
                'c7c6': 'c6 Caro-Kann savunmasıdır.',
              },
              aciklama: '1...c5 d4 karesini kanattan kontrol eder.',
            ),
            Hamle(
              soru: 'Fransız savunması: e piyonunu bir kare ilerlet.',
              fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
              hamleler: ['e7e6'],
              hataMesajlari: {
                'e7e5':
                    'İki kare açık oyundur; Fransız savunması e6 ile başlar.',
              },
              aciklama: '1...e6 ve ardından d5 ile merkez tartışılır.',
            ),
            Hamle(
              soru: 'Caro-Kann savunması: c piyonunu bir kare ilerlet.',
              fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
              hamleler: ['c7c6'],
              hataMesajlari: {'c7c5': 'c5 Sicilya savunmasıdır.'},
              aciklama: '1...c6 ve ardından d5: sağlam bir merkez.',
            ),
            Eslestir(
              soru: 'Savunmayı ilk hamleleriyle eşleştir.',
              ciftler: [
                (sol: 'Sicilya', sag: '1.e4 c5'),
                (sol: 'Fransız', sag: '1.e4 e6'),
                (sol: 'Caro-Kann', sag: '1.e4 c6'),
                (sol: 'Vezir gambiti', sag: '1.d4 d5 2.c4'),
              ],
              aciklama: 'Her açılışın kendi piyon yapısı ve planı vardır.',
            ),
            Secim(
              soru: 'Sicilya savunmasının fikri nedir?',
              secenekler: [
                'Merkezi bir kanat piyonuyla (c5) dengesiz biçimde '
                    'tartışmak',
                'Hemen mat etmek',
                'Taşları geliştirmemek',
              ],
              dogru: 0,
              aciklama: 'Dengesiz konumlar iki tarafa da kazanma şansı verir.',
            ),
            Bosluk(
              soru:
                  'Fransız savunmasında siyahın sorunlu taşı genellikle '
                  'c8\'deki ___ dir.',
              secenekler: ['fil', 'at', 'kale', 'vezir'],
              dogru: 0,
              aciklama: 'e6 piyonu bu filin çaprazını kapatır.',
            ),
            Secim(
              soru:
                  'Vezir gambitinde beyaz c4 piyonunu neden feda eder gibi '
                  'görünür?',
              secenekler: [
                'Siyahın d5 piyonunu merkezden uzaklaştırmak için',
                'Şahı korumak için',
                'Kaleyi açmak için',
              ],
              dogru: 0,
              aciklama: 'dxc4 alınırsa beyaz merkezi e4 ile kurar.',
            ),
            Yaz(
              soru:
                  'Sicilya savunmasında siyahın ilk hamlesi nedir? '
                  '(notasyonla)',
              cevaplar: ['c5'],
              aciklama: '1.e4 c5.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'satranc-3-u4',
      ad: 'Orta oyun planları',
      dersler: [
        Ders(
          id: 'satranc-3-u4-d1',
          ad: 'Açık hat ve 7. sıra',
          dilbilgisiNotu:
              'Kaleler açık hatlarda (piyonsuz sütunlarda) güçlüdür. Açık '
              'hattan rakibin 7. sırasına giren kale piyonlara saldırır ve '
              'şahı son sıraya hapseder.',
          alistirmalar: [
            Secim(
              soru: 'Açık hat nedir?',
              secenekler: [
                'Üzerinde hiç piyon olmayan sütun',
                'Rok yapılan sıra',
                'Filin çaprazı',
              ],
              dogru: 0,
              aciklama: 'Kaleler açık hatlarda etkinleşir.',
            ),
            Hamle(
              soru: 'f1\'deki kaleyi açık d hattına getir.',
              fen: 'r4rk1/pp3ppp/2n1b3/8/8/2N5/PP3PPP/R1B2RK1 w - - 0 1',
              hamleler: ['f1d1'],
              aciklama: 'Kd1 ile kale açık d hattını ele geçirir.',
            ),
            Hamle(
              soru: 'Kaleni açık hattan 7. sıraya çıkar ve piyonlara saldır.',
              fen: '6k1/pp3pp1/7p/8/8/8/5PPP/3R2K1 w - - 0 1',
              hamleler: ['d1d7'],
              aciklama: 'Kd7 hem b7 hem f7 piyonuna saldırır.',
            ),
            Bosluk(
              soru:
                  '7. sıradaki kale rakip ___ saldırır ve şahı son sıraya '
                  'hapseder.',
              secenekler: ['piyonlara', 'fillere', 'atlara', 'vezire'],
              dogru: 0,
              aciklama: 'Rakip piyonlar başlangıçta 7. sıradadır.',
            ),
            Secim(
              soru: 'İki kale aynı sütunda üst üste dizilirse buna ne denir?',
              secenekler: ['Kalelerin ikilenmesi', 'Çatal', 'Pat'],
              dogru: 0,
              aciklama: 'İkilenmiş kaleler açık hatta çok güçlüdür.',
            ),
            Eslestir(
              soru: 'Terimi eşleştir.',
              ciftler: [
                (sol: 'Açık hat', sag: 'Piyonsuz sütun'),
                (
                  sol: 'Yarı açık hat',
                  sag: 'Yalnız rakip piyonun olduğu sütun',
                ),
                (sol: '7. sıra', sag: 'Rakip piyonların başlangıç sırası'),
              ],
              aciklama: 'Kalelerini bu hatlara yerleştir.',
            ),
            Hamle(
              soru: 'Kaleleri ikile: f2\'deki kaleyi d hattına getir.',
              fen: '6k1/pp3pp1/7p/8/8/8/PP3RPP/3R2K1 w - - 0 1',
              hamleler: ['f2d2'],
              aciklama: 'Kd2: iki kale d hattında birbirini destekler.',
            ),
            Yaz(
              soru: 'Üzerinde hiç piyon olmayan sütuna ne denir? (iki kelime)',
              cevaplar: ['açık hat', 'acik hat'],
              aciklama: 'Açık hat.',
            ),
            Secim(
              soru: 'Rakip kale 7. sıraya girdi. Ne yapmalısın?',
              secenekler: [
                'Kendi kalemle onu değişmeyi ya da sırayı kapatmayı '
                    'düşünmeliyim',
                'Görmezden gelmeliyim',
                'Şahımı ileri sürmeliyim',
              ],
              dogru: 0,
              aciklama: '7. sıradaki kale çok tehlikelidir.',
            ),
          ],
        ),
        Ders(
          id: 'satranc-3-u4-d2',
          ad: 'Zayıf kareler ve plan',
          alistirmalar: [
            Secim(
              soru: 'İleri karakol nedir?',
              secenekler: [
                'Rakip piyonların saldıramayacağı, taşın rahatça '
                    'yerleştiği kare',
                'Köşe karesi',
                'Şahın başlangıç karesi',
              ],
              dogru: 0,
              aciklama: 'Karakoldaki at çok güçlüdür.',
            ),
            Hamle(
              soru: 'Atını d5 karakoluna yerleştir.',
              fen: 'r2q1rk1/pp3ppp/3p4/4p3/4P3/2N5/PPP2PPP/R2Q1RK1 w - - 0 1',
              hamleler: ['c3d5'],
              aciklama:
                  'Siyahın c ve e piyonları d5\'e saldıramaz; e4 piyonu atı '
                  'korur: Ad5.',
            ),
            Bosluk(
              soru:
                  'Kötü fil, kendi piyonları ___ renkli karelerde olan fildir.',
              secenekler: ['kendisiyle aynı', 'farklı', 'hiç', 'tüm'],
              dogru: 0,
              aciklama: 'Piyonlar filin çaprazlarını kapatır.',
            ),
            Secim(
              soru: 'Plan yaparken ilk neye bakarsın?',
              secenekler: [
                'Piyon yapısına ve zayıf karelere',
                'Yalnız kendi şahına',
                'Hiçbir şeye; rastgele oynarım',
              ],
              dogru: 0,
              aciklama: 'Piyonlar konumun iskeletidir.',
            ),
            Eslestir(
              soru: 'Kavramı açıklamasıyla eşleştir.',
              ciftler: [
                (sol: 'Kötü fil', sag: 'Kendi piyonlarının önünü kestiği fil'),
                (
                  sol: 'İleri karakol',
                  sag: 'Piyonla saldırılamayan güçlü kare',
                ),
                (
                  sol: 'Azınlık saldırısı',
                  sag: 'Az piyonla çok piyona saldırı',
                ),
              ],
              aciklama: 'Orta oyun planları bu kavramlar üzerine kurulur.',
            ),
            Secim(
              soru:
                  'Az sayıda piyonla rakibin çok sayıdaki piyonuna saldırıp '
                  'zayıflık yaratma planına ne denir?',
              secenekler: ['Azınlık saldırısı', 'Şah gambiti', 'Merkez oyunu'],
              dogru: 0,
              aciklama: 'Amaç rakibin piyon yapısında zayıflık yaratmaktır.',
            ),
            Hamle(
              soru: 'Anastasia matı: at ve kale birlikte, tek hamlede mat et.',
              fen: '8/4N1pk/8/8/8/3R4/5PPP/6K1 w - - 0 1',
              hamleler: ['d3h3'],
              matKabul: true,
              aciklama:
                  'Kh3#: e7\'deki at g6 ve g8\'i, kale h hattını kapatır.',
            ),
            Yaz(
              soru:
                  'Piyonla saldırılamayan güçlü kareye ne denir? (iki kelime)',
              cevaplar: ['ileri karakol', 'karakol'],
              aciklama: 'İleri karakol.',
            ),
            Secim(
              soru: 'Taş değişirken hangi ilke önemlidir?',
              secenekler: [
                'İyi taşını koru, rakibin iyi taşını değiş',
                'Her zaman vezirleri değiş',
                'Hiç değişme',
              ],
              dogru: 0,
              aciklama: 'Kötü filini rakibin iyi taşıyla değişmek kazançtır.',
            ),
          ],
        ),
      ],
    ),
  ],
);
