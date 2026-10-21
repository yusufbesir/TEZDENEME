import '../model/icerik.dart';

/// Satranç Orta: taktik motifler (çatal, çift saldırı, açmaz/bağ, şiş, keşif
/// şahı), 2-3 hamlelik matlar ve açılış ilkeleri. Taktik bulmacalarda ana
/// hat kural motorunda doğrulanır (test/satranc_icerik_test.dart); mat
/// iddiaları zorlanmış mat aramasıyla denetlenir.
const Kurs satranc2 = Kurs(
  id: 'satranc-2',
  ad: 'Satranç Orta',
  aciklama:
      'Çatal, açmaz, şiş ve keşif şahı gibi taktikleri, 2-3 hamlelik matları '
      've açılış ilkelerini çalış.',
  alan: KursAlani.oyun,
  uniteler: [
    Unite(
      id: 'satranc-2-u1',
      ad: 'Çatal ve çift saldırı',
      dersler: [
        Ders(
          id: 'satranc-2-u1-d1',
          ad: 'Çatal',
          dilbilgisiNotu:
              'Çatal: tek taşın aynı anda iki ya da daha çok rakip taşa '
              'saldırması. Rakip bir hamlede hepsini kurtaramaz.',
          alistirmalar: [
            Secim(
              soru: 'Çatal nedir?',
              secenekler: [
                'Bir taşın aynı anda iki ya da daha çok rakip taşa saldırması',
                'Bir taşın şaha bağlanması',
                'Şahın iki kare gitmesi',
              ],
              dogru: 0,
              aciklama: 'Çatal en sık rastlanan taktik motiftir.',
            ),
            Hamle(
              soru: 'At çatalı: şah çekerek a8\'deki kaleye de saldır.',
              fen: 'r3k3/7p/8/1N6/8/8/7P/4K3 w - - 0 1',
              hamleler: ['b5c7'],
              hataMesajlari: {
                'b5d6': 'Ad6+ şah çeker ama a8\'deki kaleye saldırmaz.',
              },
              aciklama: 'Ac7+ şaha ve kaleye saldırır; şah kaçınca Axa8 gelir.',
            ),
            Hamle(
              soru: 'At çatalıyla siyah veziri kazan.',
              fen: '2q3k1/5ppp/8/3N4/8/8/5PPP/6K1 w - - 0 1',
              hamleler: ['d5e7'],
              hataMesajlari: {'d5f6': 'Af6+ şah çeker ama g7 piyonu atı alır.'},
              aciklama: 'Ae7+ şaha ve c8\'deki vezire saldırır.',
            ),
            Bosluk(
              soru:
                  'Çatal denince akla ilk gelen taş ___; L biçimli hareketi '
                  'şaşırtıcı saldırılar yapar.',
              secenekler: ['at', 'kale', 'şah', 'fil'],
              dogru: 0,
              aciklama: 'At, kendisine saldıramayan taşlara saldırabilir.',
            ),
            Hamle(
              soru: 'Piyon çatalı: tek piyon hamlesiyle iki taşa saldır.',
              fen: '4k3/8/3b1n2/8/3PP3/8/8/6K1 w - - 0 1',
              hamleler: ['e4e5'],
              hataMesajlari: {
                'd4d5':
                    'd5 hiçbir taşa saldırmaz; e5 hem d6\'daki file hem '
                    'f6\'daki ata saldırır.',
              },
              aciklama:
                  'e5 piyonu d4 tarafından korunur; fil ya da at kaybedilir.',
            ),
            Eslestir(
              soru: 'Çatal türünü örneğiyle eşleştir.',
              ciftler: [
                (sol: 'At çatalı', sag: 'Ac7+ ile şaha ve kaleye saldırı'),
                (sol: 'Piyon çatalı', sag: 'e5 ile file ve ata saldırı'),
                (sol: 'Vezir çatalı', sag: 'Vd5+ ile şaha ve kaleye saldırı'),
              ],
              aciklama: 'Her taş çatal yapabilir; en sık at ve vezir yapar.',
            ),
            Secim(
              soru: 'Çatal şah çekerek yapıldığında neden daha güçlüdür?',
              secenekler: [
                'Rakip önce şahı kurtarmak zorundadır, diğer taşı koruyamaz',
                'Şah çekmek puan kazandırır',
                'Rakip hiç hamle yapamaz',
              ],
              dogru: 0,
              aciklama: 'Şah tehdidine cevap vermek zorunludur.',
            ),
            Hamle(
              soru: 'Vezir çatalı: şah çek ve a8\'deki kaleye saldır.',
              fen: 'r5k1/6pp/8/8/8/8/5PPP/3Q2K1 w - - 0 1',
              hamleler: ['d1d5'],
              hataMesajlari: {
                'd1d8': 'Vd8+ şah çeker ama a8\'deki kale veziri alır.',
              },
              aciklama: 'Vd5+ hem g8\'deki şaha hem a8\'deki kaleye saldırır.',
            ),
            Yaz(
              soru: 'Türkçe notasyonda atın harfi nedir?',
              cevaplar: ['A'],
              aciklama: 'At A ile yazılır: Ac7+ gibi.',
            ),
          ],
        ),
        Ders(
          id: 'satranc-2-u1-d2',
          ad: 'Çift saldırı',
          alistirmalar: [
            Secim(
              soru: 'Çift saldırıda amaç nedir?',
              secenekler: [
                'Rakibin tek hamlede savunamayacağı iki tehdit yaratmak',
                'Taşları geri çekmek',
                'Rok yapmak',
              ],
              dogru: 0,
              aciklama: 'İki tehdide karşı genellikle tek savunma yetmez.',
            ),
            Hamle(
              soru: 'Vezirle hem şah çek hem h4\'teki korumasız file saldır.',
              fen: '4k3/pp3ppp/8/8/7b/8/5PPP/3Q2K1 w - - 0 1',
              hamleler: ['d1a4'],
              hataMesajlari: {
                'd1h5': 'Vh5 file saldırır ama şah çekmez; fil kaçar.',
              },
              aciklama: 'Va4+ şah çeker; siyah şahı kurtarınca Vxh4 gelir.',
            ),
            Bosluk(
              soru:
                  'Vezirle aynı anda şah çekip korumasız bir taşa saldırmak '
                  'bir ___ saldırıdır.',
              secenekler: ['çift', 'tek', 'geri', 'sessiz'],
              dogru: 0,
              aciklama: 'İki hedef = çift saldırı.',
            ),
            Secim(
              soru: 'Hangi taş çift saldırıyı en kolay yapar?',
              secenekler: ['Vezir: sekiz yöne gidebilir', 'Piyon', 'Şah'],
              dogru: 0,
              aciklama: 'Vezirin menzili en geniş taştır.',
            ),
            Tablo(
              soru: 'Motif tablosunu tamamla.',
              baslik: ['Motif', 'Saldıran', 'Hedefler'],
              satirlar: [
                ['At çatalı', 'At', 'Şah ve kale'],
                ['Piyon çatalı', 'Piyon', 'Fil ve at'],
                ['Vezir çatalı', 'Vezir', 'Şah ve kale'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 1, sutun: 1)],
              secenekler: ['At', 'Piyon', 'Şah', 'Kale'],
              aciklama: 'Saldıran taş, aynı anda iki hedefe saldırır.',
            ),
            Hamle(
              soru: 'Kaleyle 5. sıradaki iki korumasız taşa aynı anda saldır.',
              fen: '6k1/5pp1/7p/b6n/8/8/5PPP/3R2K1 w - - 0 1',
              hamleler: ['d1d5'],
              hataMesajlari: {
                'd1d8':
                    'Kd8+ şah çeker ama şah h7\'ye kaçar; taşlara saldırmaz.',
              },
              aciklama:
                  'Kd5 hem a5\'teki file hem h5\'teki ata saldırır; biri '
                  'düşer.',
            ),
            Secim(
              soru: 'Çift saldırıya uğradın. En iyi savunma ne olabilir?',
              secenekler: [
                'Şah çekerek ya da karşı tehditle zaman kazanmak',
                'Hiçbir şey yapmamak',
                'Rastgele piyon oynamak',
              ],
              dogru: 0,
              aciklama: 'Zorlayıcı bir karşı hamle bazen iki taşı da kurtarır.',
            ),
            Eslestir(
              soru: 'Terimi anlamıyla eşleştir.',
              ciftler: [
                (sol: 'Korumasız taş', sag: 'Hiçbir taşın savunmadığı taş'),
                (sol: 'Tehdit', sag: 'Sonraki hamlede taş alma ya da mat'),
                (sol: 'Zorlayıcı hamle', sag: 'Rakibi cevap vermeye zorlar'),
              ],
              aciklama: 'Korumasız taşlar çift saldırının hedefidir.',
            ),
            Yaz(
              soru: 'Notasyonda taş almayı gösteren işaret nedir?',
              cevaplar: ['x'],
              aciklama: 'Vxh4: vezir h4\'teki taşı alır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'satranc-2-u2',
      ad: 'Açmaz ve şiş',
      dersler: [
        Ders(
          id: 'satranc-2-u2-d1',
          ad: 'Açmaz (bağ)',
          dilbilgisiNotu:
              'Açmaz (bağ): öndeki taş, arkasındaki daha değerli taşı açığa '
              'çıkaracağı için oynayamaz. Arkada şah varsa mutlak açmazdır ve '
              'taş yasal olarak oynayamaz.',
          alistirmalar: [
            Secim(
              soru: 'Açmaz nedir?',
              secenekler: [
                'Bir taşın, arkasındaki daha değerli taşı açığa çıkaracağı '
                    'için oynayamaması',
                'İki taşa birden saldırı',
                'Rokun bir türü',
              ],
              dogru: 0,
              aciklama: 'Açmazdaki taşa "bağlı taş" da denir.',
            ),
            Secim(
              soru: 'Arkasında şah olan açmazdaki taş oynayabilir mi?',
              secenekler: [
                'Hayır: şahı tehdide açmak yasal değildir',
                'Evet, her zaman',
                'Yalnız taş alırken',
              ],
              dogru: 0,
              aciklama: 'Bu mutlak açmazdır.',
            ),
            Hamle(
              soru: 'Fili b5\'e getirerek c6\'daki atı şaha bağla.',
              fen:
                  'r1bqkbnr/ppp2ppp/2np4/4p3/3PP3/5N2/PPP2PPP/RNBQKB1R '
                  'w KQkq - 1 4',
              hamleler: ['f1b5'],
              aciklama:
                  'd7 boş olduğu için Fb5 ile c6\'daki at e8\'deki şaha '
                  'bağlanır: mutlak açmaz.',
            ),
            Hamle(
              soru: 'Fili g5\'e getirerek f6\'daki atı vezire bağla.',
              fen:
                  'rnbqkb1r/ppp2ppp/4pn2/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR '
                  'w KQkq - 2 4',
              hamleler: ['c1g5'],
              aciklama:
                  'Fg5 sonrası f6\'daki at oynarsa d8\'deki vezir alınır: '
                  'göreli açmaz.',
            ),
            Hamle(
              soru:
                  'e5\'teki siyah at şaha bağlı. Açmazdaki atı bir piyonla '
                  'saldırarak kazan.',
              fen: '4k3/8/3p4/4n3/8/8/5P2/4R1K1 w - - 0 1',
              hamleler: ['f2f4'],
              hataMesajlari: {
                'e1e5': 'Kxe5+ dxe5: kaleni bir ata verdin.',
                'f2f3': 'f3 ata saldırmaz; piyon f4\'e iki kare gitmeli.',
              },
              aciklama: 'f4 ile bağlı at kaçamaz; bir sonraki hamlede alınır.',
            ),
            Hamle(
              soru: 'Siyah veziri şaha bağla ve kazan.',
              fen: 'k7/1q6/8/8/8/5P2/2B5/4K3 w - - 0 1',
              hamleler: ['c2e4'],
              aciklama:
                  'Fe4 ile vezir a8\'deki şaha bağlanır; Vxe4 fxe4 ile vezir '
                  'file gider.',
            ),
            Bosluk(
              soru:
                  'Arkasında şah olan açmaza ___ açmaz denir; bu taş yasal '
                  'olarak oynayamaz.',
              secenekler: ['mutlak', 'göreli', 'çift', 'yarım'],
              dogru: 0,
              aciklama: 'Arkada başka bir taş varsa göreli açmazdır.',
            ),
            Eslestir(
              soru: 'Terimi açıklamasıyla eşleştir.',
              ciftler: [
                (sol: 'Mutlak açmaz', sag: 'Arkada şah var, taş oynayamaz'),
                (sol: 'Göreli açmaz', sag: 'Oynamak arkadaki taşı kaybettirir'),
                (sol: 'Açmazı bozmak', sag: 'Araya taş koymak ya da kaçmak'),
              ],
              aciklama:
                  'Açmaz yapılan taşa yeniden saldırmak sık bir fikirdir.',
            ),
            Yaz(
              soru: 'Açmaz yapabilen taşlar vezir, kale ve hangisidir?',
              cevaplar: ['fil'],
              aciklama: 'Açmaz için uzun menzilli taş gerekir.',
            ),
          ],
        ),
        Ders(
          id: 'satranc-2-u2-d2',
          ad: 'Şiş',
          alistirmalar: [
            Secim(
              soru: 'Şiş nedir?',
              secenekler: [
                'Değerli bir taşa saldırı; o kaçınca arkasındaki taşın '
                    'alınması',
                'Arkadaki taşı koruyan taşa saldırı',
                'At çatalının bir türü',
              ],
              dogru: 0,
              aciklama: 'Şiş, açmazın tersidir: öndeki taş daha değerlidir.',
            ),
            Secim(
              soru: 'Açmaz ile şiş arasındaki fark nedir?',
              secenekler: [
                'Açmazda öndeki taş daha değersiz, şişte daha değerlidir',
                'Hiç fark yoktur',
                'Şiş yalnız atla yapılır',
              ],
              dogru: 0,
              aciklama: 'Şişte öndeki değerli taş kaçmak zorunda kalır.',
            ),
            Hamle(
              soru: 'Kaleyle şah çek; şah kaçınca veziri al.',
              fen: '8/8/4k2q/8/8/8/8/R5K1 w - - 0 1',
              hamleler: ['a1a6'],
              hataMesajlari: {
                'a1e1': 'Ke1+ şah çeker ama vezir ile şah aynı hatta değil.',
              },
              aciklama: 'Ka6+ ile şah ve vezir aynı sırada; şah kaçınca Kxh6.',
            ),
            Hamle(
              soru: 'Fille şiş: şah çek ve arkadaki veziri kazan.',
              fen: 'q7/1k6/8/8/8/1B6/8/6K1 w - - 0 1',
              hamleler: ['b3d5'],
              aciklama:
                  'Fd5+ ile şah ve vezir aynı çaprazda; şah kaçınca Fxa8.',
            ),
            Bosluk(
              soru: 'Şişte saldırılan taş, arkasındaki taştan daha ___ dir.',
              secenekler: ['değerli', 'değersiz', 'küçük', 'yavaş'],
              dogru: 0,
              aciklama: 'Öndeki değerli taş kaçar, arkadaki alınır.',
            ),
            Eslestir(
              soru: 'Motifi tanımıyla eşleştir.',
              ciftler: [
                (sol: 'Çatal', sag: 'Bir taş iki hedefe saldırır'),
                (sol: 'Açmaz', sag: 'Öndeki taş arkadakini açığa çıkaramaz'),
                (sol: 'Şiş', sag: 'Öndeki değerli taş kaçar, arkadaki alınır'),
              ],
              aciklama: 'Üç motif de taş kazanmanın temel yollarıdır.',
            ),
            Secim(
              soru: 'Hangi taşlar şiş yapabilir?',
              secenekler: [
                'Vezir, kale ve fil',
                'Yalnız at',
                'Yalnız piyon',
                'Şah ve at',
              ],
              dogru: 0,
              aciklama: 'Şiş için hat boyunca giden taş gerekir.',
            ),
            Hamle(
              soru: 'Fille şah çek ve h8\'deki kaleyi kazan.',
              fen: '7r/p7/5k2/8/8/8/P7/K5B1 w - - 0 1',
              hamleler: ['g1d4'],
              aciklama: 'Fd4+ ile şah ve kale aynı çaprazda; şah kaçınca Fxh8.',
            ),
            Yaz(
              soru: 'Türkçe notasyonda filin harfi nedir?',
              cevaplar: ['F'],
              aciklama: 'Fil F ile yazılır: Fd4+ gibi.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'satranc-2-u3',
      ad: 'Keşif şahı ve 2-3 hamlede mat',
      dersler: [
        Ders(
          id: 'satranc-2-u3-d1',
          ad: 'Keşif saldırısı ve çifte şah',
          alistirmalar: [
            Secim(
              soru: 'Keşif şahı nedir?',
              secenekler: [
                'Bir taş hareket edince arkasındaki taşın şah çekmesi',
                'Şahın kaçması',
                'Rokla şah çekmek',
              ],
              dogru: 0,
              aciklama: 'Öndeki taş serbestçe başka bir tehdit yaratabilir.',
            ),
            Hamle(
              soru: 'Atı oynatarak keşif şahı çek ve veziri kazan.',
              fen: '4k3/8/8/2q5/4N3/8/8/4R2K w - - 0 1',
              hamleler: ['e4c5'],
              hataMesajlari: {
                'e4f6': 'Af6+ çifte şah ama vezir kurtulur.',
                'e4d6': 'Ad6+ çifte şah ama vezir kurtulur.',
              },
              aciklama: 'Axc5+: at veziri alırken e1\'deki kale şah çeker.',
            ),
            Hamle(
              soru: 'Fil şah çekerek kalenin önünü açsın: veziri kazan.',
              fen: '3q2k1/5ppp/8/8/8/3B4/5PPP/3R2K1 w - - 0 1',
              hamleler: ['d3h7'],
              hataMesajlari: {
                'd3e4':
                    'Fil yolu açtı ama şah çekmedi; siyah vezir kaleni alır.',
              },
              aciklama: 'Fxh7+ şah çeker; şah kendini kurtarırken Kxd8 gelir.',
            ),
            Bosluk(
              soru: 'İki taşın aynı anda şah çekmesine ___ şah denir.',
              secenekler: ['çifte', 'keşif', 'sessiz', 'uzun'],
              dogru: 0,
              aciklama: 'Çifte şah en güçlü keşif şahıdır.',
            ),
            Secim(
              soru: 'Çifte şaha karşı tek savunma nedir?',
              secenekler: [
                'Şahı kaçırmak',
                'Araya taş koymak',
                'Şah çeken taşlardan birini almak',
              ],
              dogru: 0,
              aciklama: 'İki tehdit aynı anda engellenemez.',
            ),
            Hamle(
              soru: 'Çifte şahla tek hamlede mat et.',
              fen: '3qkb2/3p1p2/8/8/4N3/8/8/4R1K1 w - - 0 1',
              hamleler: ['e4d6'],
              matKabul: true,
              aciklama:
                  'Ad6# ya da Af6#: at ve kale birlikte şah çeker; şahın '
                  'kaçacak karesi yok.',
            ),
            Eslestir(
              soru: 'Terimi eşleştir.',
              ciftler: [
                (sol: 'Keşif şahı', sag: 'Öndeki taş çekilir, arkadaki şah'),
                (sol: 'Çifte şah', sag: 'İki taş aynı anda şah çeker'),
                (
                  sol: 'Keşif saldırısı',
                  sag: 'Öndeki taş çekilir, arkadaki taşa saldırı',
                ),
              ],
              aciklama: 'Hepsinde öndeki taşın hareketi hattı açar.',
            ),
            Secim(
              soru: 'Keşif saldırısında öndeki taş ne yapmalıdır?',
              secenekler: [
                'Mümkünse kendisi de tehdit yaratmalı',
                'Hiç hareket etmemeli',
                'Geri çekilip saklanmalı',
              ],
              dogru: 0,
              aciklama: 'İki tehdit birden rakibi çaresiz bırakır.',
            ),
            Yaz(
              soru:
                  'Çifte şahta, şah çeken taşlardan birini almak kurtarır mı? '
                  '(evet/hayır)',
              cevaplar: ['hayır', 'hayir'],
              aciklama: 'Diğer taş hâlâ şah çeker; yalnız kaçmak kalır.',
            ),
          ],
        ),
        Ders(
          id: 'satranc-2-u3-d2',
          ad: '2 ve 3 hamlede mat',
          dilbilgisiNotu:
              'Çok hamleli matta önce zorlayıcı hamlelere bak: şah çekmek, '
              'taş almak, tehdit. Her adımda rakibin en iyi savunmasını '
              'hesapla.',
          alistirmalar: [
            Secim(
              soru: 'Zorlayıcı hamleler hangileridir?',
              secenekler: [
                'Şah çekmek, taş almak ve tehdit',
                'Piyon itmek',
                'Şahı köşeye saklamak',
              ],
              dogru: 0,
              aciklama: 'Zorlayıcı hamleler rakibin seçeneklerini daraltır.',
            ),
            Hamle(
              soru: '2 hamlede mat et: önce veziri feda et.',
              fen: '2rr2k1/5ppp/8/8/3Q4/8/5PPP/3R2K1 w - - 0 1',
              hamleler: ['d4d8', 'c8d8', 'd1d8'],
              matKabul: true,
              aciklama:
                  'Vxd8+ Kxd8 Kxd8#: vezir feda edilir, son sıra mat olur.',
            ),
            Hamle(
              soru: 'Legal tuzağı: siyah vezirini aldı. 2 hamlede mat et.',
              fen:
                  'rn1qkbnr/ppp2p1p/3p2p1/4N3/2B1P3/2N5/PPPP1PPP/R1BbK2R '
                  'w KQkq - 0 6',
              hamleler: ['c4f7', 'e8e7', 'c3d5'],
              matKabul: true,
              hataMesajlari: {
                'e1d1':
                    'Veziri geri almak doğal ama mat fırsatını kaçırırsın: '
                    'Fxf7+ ile başla.',
              },
              aciklama: 'Fxf7+ Şe7 Ad5#: üç küçük taş şahı mat eder.',
            ),
            Bosluk(
              soru: 'Mat aramaya önce rakip şaha ___ hamlelerle başla.',
              secenekler: ['şah çeken', 'geri çekilen', 'sessiz', 'yavaş'],
              dogru: 0,
              aciklama: 'Şah çeken hamleler en zorlayıcı hamlelerdir.',
            ),
            Hamle(
              soru: '3 hamlede mat et (boğmaca matı).',
              fen: '4r1k1/5Npp/8/3Q4/8/8/5PPP/6K1 w - - 0 1',
              hamleler: ['f7h6', 'g8h8', 'd5g8', 'e8g8', 'h6f7'],
              matKabul: true,
              aciklama:
                  'Ah6+ (çifte şah) Şh8 Vg8+! Kxg8 Af7#: şah kendi '
                  'taşlarıyla hapsolur.',
            ),
            Secim(
              soru: 'Boğmaca matında şahı ne hapseder?',
              secenekler: [
                'Şahın kendi taşları',
                'Rakip vezir',
                'Rakip piyonlar',
              ],
              dogru: 0,
              aciklama: 'Son darbeyi at vurur.',
            ),
            Eslestir(
              soru: 'Mat kalıbını tanımıyla eşleştir.',
              ciftler: [
                (sol: 'Koridor matı', sag: 'Şah son sırada, önü kendi piyonu'),
                (sol: 'Boğmaca matı', sag: 'Kendi taşlarıyla çevrili şaha at'),
                (sol: 'Arap matı', sag: 'Kale ve at köşedeki şahı mat eder'),
              ],
              aciklama: 'Kalıpları tanımak matı hızlı bulmanı sağlar.',
            ),
            Yaz(
              soru: 'Notasyonda mat işareti nedir?',
              cevaplar: ['#'],
              aciklama: 'Ad5# gibi.',
            ),
            Secim(
              soru:
                  'Bir mat problemini çözerken her adımda rakibin en iyi '
                  'cevabını neden hesaba katmalısın?',
              secenekler: [
                'Rakip en güçlü savunmayı yapar; mat ona karşı da çalışmalı',
                'Rakip hep hata yapar',
                'Gerek yoktur',
              ],
              dogru: 0,
              aciklama: 'Zorlanmış mat her savunmaya karşı mattır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'satranc-2-u4',
      ad: 'Açılış ilkeleri',
      dersler: [
        Ders(
          id: 'satranc-2-u4-d1',
          ad: 'Merkez, gelişim, rok',
          dilbilgisiNotu:
              'Açılışın üç ilkesi: merkezi (d4, e4, d5, e5) kontrol et, '
              'atları ve filleri geliştir, şahını rokla güvene al.',
          alistirmalar: [
            Secim(
              soru: 'Açılışın üç temel ilkesi hangisidir?',
              secenekler: [
                'Merkezi kontrol et, taşlarını geliştir, rok yap',
                'Veziri erkenden çıkar, piyonları it, bekle',
                'Aynı taşı tekrar tekrar oynat',
              ],
              dogru: 0,
              aciklama: 'Bu ilkeler hemen her açılışta geçerlidir.',
            ),
            Hamle(
              soru: 'd piyonuyla merkezi tut: iki kare ilerlet.',
              fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
              hamleler: ['d2d4'],
              hataMesajlari: {
                'd2d3': 'd3 sağlamdır ama d4 merkezi daha çok kontrol eder.',
              },
              aciklama: 'd4 piyonu e5 ve c5 karelerini kontrol eder.',
            ),
            Hamle(
              soru:
                  'Atını merkeze doğru geliştir: g1\'deki atı f3\'e oynat ve '
                  'e5\'e saldır.',
              fen:
                  'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
              hamleler: ['g1f3'],
              hataMesajlari: {
                'g1h3':
                    'Kenardaki at az kareye ulaşır: "kenardaki at kederli '
                    'at".',
              },
              aciklama: 'Af3 hem gelişim hem e5 piyonuna saldırıdır.',
            ),
            Secim(
              soru:
                  'Açılışta veziri erken oyuna sokmak neden genellikle '
                  'kötüdür?',
              secenekler: [
                'Rakip, taş geliştirirken vezire saldırıp zaman kazanır',
                'Vezir zayıf bir taştır',
                'Kurallara aykırıdır',
              ],
              dogru: 0,
              aciklama: 'Her saldırıda vezir yeniden kaçmak zorunda kalır.',
            ),
            Hamle(
              soru: 'Şahını güvene al: kısa rok yap.',
              fen:
                  'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R '
                  'w KQkq - 4 4',
              hamleler: ['e1g1'],
              aciklama: 'O-O: şah g1\'de güvende, kale f1\'de oyuna girer.',
            ),
            Bosluk(
              soru: 'Kenardaki at ___ at.',
              secenekler: ['kederli', 'mutlu', 'güçlü', 'hızlı'],
              dogru: 0,
              aciklama: 'Kenardaki at merkezdekinden çok daha az kareye gider.',
            ),
            Eslestir(
              soru: 'İlkeyi amacıyla eşleştir.',
              ciftler: [
                (sol: 'Merkez', sag: 'Taşlara alan açar'),
                (sol: 'Gelişim', sag: 'Taşları oyuna sokar'),
                (sol: 'Rok', sag: 'Şahı güvene alır, kaleyi bağlar'),
              ],
              aciklama: 'Üçü birlikte iyi bir açılış oyunu kurar.',
            ),
            Secim(
              soru: 'Hangisi açılışta iyi bir alışkanlıktır?',
              secenekler: [
                'Önce atları ve filleri geliştirmek',
                'Kale piyonlarını oynamak',
                'Şahı merkezde bırakmak',
              ],
              dogru: 0,
              aciklama: 'Hafif taşlar önce, ağır taşlar sonra.',
            ),
            Isaretle(
              soru: 'Merkez karelerini işaretle.',
              cumle: 'a1 d4 e4 h8 d5 e5 b7',
              dogru: [1, 2, 4, 5],
              aciklama: 'Merkez dört karedir: d4, e4, d5, e5.',
            ),
          ],
        ),
        Ders(
          id: 'satranc-2-u4-d2',
          ad: 'Açılış tuzakları',
          alistirmalar: [
            Secim(
              soru:
                  'Beyaz Vh5 ve Fc4 ile f7\'ye saldırıyor. Siyah için iyi bir '
                  'savunma hangisidir?',
              secenekler: [
                'Ve7 ile f7\'yi korumak',
                'h6 oynamak',
                'a6 oynamak',
              ],
              dogru: 0,
              aciklama: 'Ve7 f7\'yi korur; h6 ve a6 Vxf7# tehdidini durdurmaz.',
            ),
            Hamle(
              soru: 'Aptal matı: siyah oynar ve tek hamlede mat eder.',
              fen:
                  'rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2',
              hamleler: ['d8h4'],
              matKabul: true,
              aciklama:
                  'f3 ve g4 şahın çaprazını açtı: Vh4#. Açılışta şahın '
                  'önündeki piyonları gereksiz oynama.',
            ),
            Hamle(
              soru: 'Englund kumarı tuzağı: siyah oynar ve mat eder.',
              fen:
                  'r1b1k1nr/pppp1ppp/2n5/4P3/8/2Q2N2/PqP1PPPP/RN2KB1R '
                  'b KQkq - 0 8',
              hamleler: ['b2c1'],
              matKabul: true,
              aciklama: 'Vc1#: d2 ve d1 kapalı, şah kaçamaz.',
            ),
            Secim(
              soru:
                  'Rakip bir taşını karşılıksız veriyor gibi görünüyorsa ne '
                  'düşünmelisin?',
              secenekler: [
                'Tuzak olabilir: almadan önce rakibin tehditlerini kontrol et',
                'Hemen al',
                'Asla alma',
              ],
              dogru: 0,
              aciklama: 'Her hamleden önce "rakip ne tehdit ediyor?" diye sor.',
            ),
            Hamle(
              soru: 'Siyah oynar ve tek hamlede mat eder.',
              fen: 'r1b1kbnr/pppp1Npp/8/8/3nq3/8/PPPPBP1P/RNBQKR2 b Qkq - 1 7',
              hamleler: ['d4f3'],
              matKabul: true,
              aciklama:
                  'Af3#: beyaz şahın kaçacak karesi yok; açılışta açgözlü '
                  'taş toplamanın bedeli.',
            ),
            Bosluk(
              soru:
                  'Açılışta aynı taşı gereksiz yere ___ kez oynamak zaman '
                  'kaybıdır.',
              secenekler: ['birden çok', 'bir', 'yalnız', 'son'],
              dogru: 0,
              aciklama: 'Her hamlede yeni bir taş geliştirmeye çalış.',
            ),
            Eslestir(
              soru: 'Tuzağı bitiren hamleyle eşleştir.',
              ciftler: [
                (sol: 'Aptal matı', sag: 'Vh4#'),
                (sol: 'Çoban matı', sag: 'Vxf7#'),
                (sol: 'Englund tuzağı', sag: 'Vc1#'),
              ],
              aciklama: 'Hepsinde zayıf kareye vezir girer.',
            ),
            Secim(
              soru: 'Çoban matına karşı en sağlam fikir hangisidir?',
              secenekler: [
                'f7 karesini korumak ve taş geliştirmek',
                'Şahı e7\'ye götürmek',
                'Kaleyi oynamak',
              ],
              dogru: 0,
              aciklama: 'Ör. Ac6, g6, Af6 gibi gelişim hamleleri.',
            ),
            Yaz(
              soru:
                  'Oyun başında siyahın f7 piyonunu yalnız hangi taş korur? '
                  '(tek kelime)',
              cevaplar: ['şah'],
              aciklama: 'f7 bu yüzden açılışta zayıf bir karedir.',
            ),
          ],
        ),
      ],
    ),
  ],
);
