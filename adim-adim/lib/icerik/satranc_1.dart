import '../model/icerik.dart';

/// Satranç Başlangıç: tahta ve notasyon, taşların hareketi, şah/mat/pat,
/// rok, taş değerleri ve tek hamlede mat. Türkçe notasyon: Ş şah, V vezir,
/// K kale, F fil, A at; piyonun harfi yoktur. Tüm FEN ve hamleler
/// test/satranc_icerik_test.dart ile kural motorunda doğrulanır.
const Kurs satranc1 = Kurs(
  id: 'satranc-1',
  ad: 'Satranç Başlangıç',
  aciklama:
      'Tahtayı, taşların hareketini, şah-mat-pat kurallarını, roku ve tek '
      'hamlede matı öğren.',
  alan: KursAlani.oyun,
  uniteler: [
    Unite(
      id: 'satranc-1-u1',
      ad: 'Tahta ve taşlar',
      dersler: [
        Ders(
          id: 'satranc-1-u1-d1',
          ad: 'Tahta ve kareler',
          dilbilgisiNotu:
              'Tahtada 8 sütun (a–h) ve 8 sıra (1–8) vardır. Her kare sütun '
              'harfi ve sıra numarasıyla okunur: e4, f3. Beyaz taşlar 1. ve '
              '2. sırada, siyah taşlar 7. ve 8. sırada başlar.',
          alistirmalar: [
            Secim(
              soru: 'Satranç tahtasında kaç kare vardır?',
              secenekler: ['36', '48', '64', '100'],
              dogru: 2,
              aciklama: 'Tahta 8 sıra × 8 sütundur: 64 kare.',
            ),
            Secim(
              soru:
                  'Tahta doğru yerleştirildiğinde her oyuncunun sağ alt '
                  'köşesindeki kare hangi renktir?',
              secenekler: ['Açık renk', 'Koyu renk', 'Fark etmez'],
              dogru: 0,
              aciklama:
                  'Kural "sağda açık kare"dır: h1 ve a8 açık renkli karelerdir.',
            ),
            Bosluk(
              soru: 'Sütunlar a harfinden ___ harfine kadar adlandırılır.',
              secenekler: ['h', 'g', 'f', 'j'],
              dogru: 0,
              aciklama: 'Sekiz sütun vardır: a, b, c, d, e, f, g, h.',
            ),
            Yaz(
              soru:
                  'Beyaz şah oyun başında hangi karededir? (ör. a1 biçiminde '
                  'yaz)',
              cevaplar: ['e1'],
              aciklama: 'Beyaz şah e1\'de, siyah şah e8\'de başlar.',
            ),
            Eslestir(
              soru: 'Taşı Türkçe notasyondaki harfiyle eşleştir.',
              ciftler: [
                (sol: 'Şah', sag: 'Ş'),
                (sol: 'Vezir', sag: 'V'),
                (sol: 'Kale', sag: 'K'),
                (sol: 'Fil', sag: 'F'),
                (sol: 'At', sag: 'A'),
              ],
              aciklama: 'Piyonun harfi yoktur; yalnız gittiği kare yazılır.',
            ),
            Hamle(
              soru: 'e2\'deki piyonu iki kare ilerleterek e4\'e oynat.',
              fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
              hamleler: ['e2e4'],
              hataMesajlari: {
                'e2e3':
                    'Bu bir kare ilerledi. Piyon ilk hamlesinde iki kare de '
                    'gidebilir: e4.',
              },
              aciklama:
                  'Kare, sütun harfi ve sıra numarasıyla okunur: e sütunu, '
                  '4. sıra = e4.',
            ),
            Hamle(
              soru: 'g1\'deki atı f3\'e oynat.',
              fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
              hamleler: ['g1f3'],
              hataMesajlari: {'g1h3': 'Bu h3. Hedef f sütunu, 3. sıra: f3.'},
              aciklama: 'Notasyonda bu hamle Af3 diye yazılır.',
            ),
            Tablo(
              soru: 'Bir oyuncunun oyun başındaki taş sayılarını tamamla.',
              baslik: ['Taş', 'Adet'],
              satirlar: [
                ['Piyon', '8'],
                ['At', '2'],
                ['Fil', '2'],
                ['Kale', '2'],
                ['Vezir', '1'],
                ['Şah', '1'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 4, sutun: 1)],
              secenekler: ['8', '1', '4', '6'],
              aciklama: 'Her oyuncunun 16 taşı vardır: 8 piyon ve 8 taş.',
            ),
            Isaretle(
              soru: 'Beyaz vezir oyun başında hangi karededir? Kareye dokun.',
              cumle: 'a1 d1 e1 h1 d8',
              dogru: [1],
              aciklama:
                  'Vezir kendi rengindeki karede başlar: beyaz vezir açık '
                  'renkli d1\'de.',
            ),
          ],
        ),
        Ders(
          id: 'satranc-1-u1-d2',
          ad: 'Kale, fil ve vezir',
          alistirmalar: [
            Secim(
              soru: 'Kale nasıl hareket eder?',
              secenekler: [
                'Yatay ve dikey, istediği kadar',
                'Yalnız çapraz',
                'L biçiminde',
                'Her yöne bir kare',
              ],
              dogru: 0,
              aciklama:
                  'Kale sıra ve sütun boyunca gider; taşların üzerinden '
                  'atlayamaz.',
            ),
            Secim(
              soru: 'Fil nasıl hareket eder?',
              secenekler: [
                'Çapraz, istediği kadar',
                'Yatay ve dikey',
                'L biçiminde',
                'Yalnız ileri',
              ],
              dogru: 0,
              aciklama: 'Fil çaprazda gider ve hep aynı renk karelerde kalır.',
            ),
            Hamle(
              soru: 'Kaleyle d8\'deki siyah atı al.',
              fen: '3n2k1/8/8/8/8/8/8/3R2K1 w - - 0 1',
              hamleler: ['d1d8'],
              aciklama:
                  'Kale d sütunu boyunca ilerler; yol boş olduğu için d8\'e '
                  'ulaşır: Kxd8+.',
            ),
            Hamle(
              soru: 'Fille a6\'daki siyah kaleyi al.',
              fen: '7k/8/r7/8/8/8/8/5BK1 w - - 0 1',
              hamleler: ['f1a6'],
              aciklama: 'f1–a6 çaprazı boştur: Fxa6.',
            ),
            Hamle(
              soru: 'Vezirle d5\'teki korumasız siyah atı al.',
              fen: '4k3/8/8/3n4/8/8/8/3Q2K1 w - - 0 1',
              hamleler: ['d1d5'],
              aciklama:
                  'Vezir d sütunu boyunca d5\'e gider; atı koruyan taş yok: '
                  'Vxd5.',
            ),
            Bosluk(
              soru: 'Vezir, kalenin ve ___ hareketlerini birleştirir.',
              secenekler: ['filin', 'atın', 'piyonun', 'şahın'],
              dogru: 0,
              aciklama: 'Vezir hem kale gibi düz hem fil gibi çapraz gider.',
            ),
            Eslestir(
              soru: 'Taşı hareketiyle eşleştir.',
              ciftler: [
                (sol: 'Kale', sag: 'Yatay ve dikey'),
                (sol: 'Fil', sag: 'Çapraz'),
                (sol: 'Vezir', sag: 'Yatay, dikey ve çapraz'),
                (sol: 'Şah', sag: 'Her yöne bir kare'),
              ],
              aciklama: 'Kale, fil ve vezir uzun menzilli taşlardır.',
            ),
            Secim(
              soru:
                  'Açık renkli karede başlayan bir fil hiç koyu kareye '
                  'geçebilir mi?',
              secenekler: [
                'Hayır, hep açık karelerde kalır',
                'Evet, her hamlede renk değiştirir',
                'Yalnız taş alırken',
              ],
              dogru: 0,
              aciklama: 'Çapraz hareket kare rengini değiştirmez.',
            ),
            Yaz(
              soru: 'Türkçe notasyonda vezirin harfi nedir?',
              cevaplar: ['V'],
              aciklama: 'Vezir V ile yazılır: Vd5 gibi.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'satranc-1-u2',
      ad: 'At, piyon ve şah',
      dersler: [
        Ders(
          id: 'satranc-1-u2-d1',
          ad: 'At ve piyon',
          alistirmalar: [
            Secim(
              soru: 'At nasıl hareket eder?',
              secenekler: [
                'L biçiminde: bir yöne iki kare, sonra yana bir kare',
                'Çapraz, istediği kadar',
                'Yatay ve dikey',
                'Bir kare ileri',
              ],
              dogru: 0,
              aciklama: 'At her hamlede kare rengini değiştirir.',
            ),
            Secim(
              soru: 'Hangi taş diğer taşların üzerinden atlayabilir?',
              secenekler: ['At', 'Fil', 'Kale', 'Vezir'],
              dogru: 0,
              aciklama:
                  'Yalnız at atlayabilir; diğer taşların yolu boş '
                  'olmalıdır.',
            ),
            Hamle(
              soru: 'Atla e5\'teki siyah veziri al.',
              fen: '4k3/8/8/4q3/8/5N2/8/6K1 w - - 0 1',
              hamleler: ['f3e5'],
              aciklama: 'f3\'teki at L hareketiyle e5\'e ulaşır: Axe5.',
            ),
            Secim(
              soru: 'Piyon nasıl taş alır?',
              secenekler: [
                'Çapraz olarak bir kare ileride',
                'Düz ileri',
                'Geriye doğru',
                'L biçiminde',
              ],
              dogru: 0,
              aciklama: 'Piyon düz ilerler ama çapraz alır.',
            ),
            Hamle(
              soru: 'e4\'teki piyonla siyah atı al.',
              fen: '4k3/8/8/3np3/4P3/8/8/4K3 w - - 0 1',
              hamleler: ['e4d5'],
              aciklama:
                  'Piyon önündeki e5 piyonu yüzünden ilerleyemez ama çapraz '
                  'alabilir: exd5.',
            ),
            Hamle(
              soru:
                  'Siyah piyon az önce d7\'den d5\'e iki kare ilerledi. '
                  'Geçerken al!',
              fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 2',
              hamleler: ['e5d6'],
              hataMesajlari: {
                'e5e6':
                    'Bu düz ilerleme. Geçerken almada piyon d6\'ya çapraz '
                    'gider ve d5\'teki piyonu tahtadan kaldırır.',
              },
              aciklama:
                  'Geçerken alma: beyaz piyon d6\'ya gider, d5\'teki siyah '
                  'piyon alınır (exd6).',
            ),
            Bosluk(
              soru:
                  'Geçerken alma yalnız rakip piyon iki kare ilerledikten '
                  '___ hamlede yapılabilir.',
              secenekler: ['hemen sonraki', 'iki sonraki', 'herhangi bir'],
              dogru: 0,
              aciklama: 'Fırsat hemen kullanılmazsa kaybolur.',
            ),
            Secim(
              soru: 'Piyon ilk hamlesinde en çok kaç kare ilerleyebilir?',
              secenekler: ['Bir', 'İki', 'Üç', 'Dört'],
              dogru: 1,
              aciklama: 'İlk hamlede bir ya da iki kare; sonra hep bir kare.',
            ),
            Eslestir(
              soru: 'Taşı özelliğiyle eşleştir.',
              ciftler: [
                (sol: 'At', sag: 'Taşların üzerinden atlar'),
                (sol: 'Piyon', sag: 'Geri gidemez'),
                (sol: 'Fil', sag: 'Hep aynı renk karede kalır'),
                (sol: 'Kale', sag: 'Rokta şahla birlikte oynar'),
              ],
              aciklama: 'Her taşın kendine özgü bir kuralı vardır.',
            ),
          ],
        ),
        Ders(
          id: 'satranc-1-u2-d2',
          ad: 'Şah ve terfi',
          alistirmalar: [
            Secim(
              soru: 'Şah bir hamlede kaç kare gidebilir (rok hariç)?',
              secenekler: ['Bir', 'İki', 'İstediği kadar', 'Üç'],
              dogru: 0,
              aciklama: 'Şah her yöne yalnız bir kare gider.',
            ),
            Hamle(
              soru: 'Beyaz şahını saldırı altında olmayan tek kareye götür.',
              fen: '1r6/8/8/8/8/2k5/8/K7 w - - 0 1',
              hamleler: ['a1a2'],
              aciklama:
                  'b1 ve b2 kareleri b8\'deki siyah kalenin, b2 ayrıca siyah '
                  'şahın kontrolünde; güvenli kare a2.',
            ),
            Secim(
              soru: 'Şah, rakibin saldırdığı bir kareye gidebilir mi?',
              secenekler: [
                'Hayır, bu yasal değildir',
                'Evet, istediği zaman',
                'Yalnız taş alırken',
              ],
              dogru: 0,
              aciklama: 'Şah hiçbir zaman tehdit altındaki kareye gidemez.',
            ),
            Hamle(
              soru: 'Piyonun son sıraya ulaşsın: vezire terfi ettir.',
              fen: '8/4P3/8/8/8/8/k7/4K3 w - - 0 1',
              hamleler: ['e7e8q'],
              hataMesajlari: {
                'e7e8n': 'At da seçilebilir ama burada en güçlü taş vezirdir.',
                'e7e8r':
                    'Kale de olur ama vezir hem kale hem fil gibi oynar: daha '
                    'güçlüdür.',
                'e7e8b': 'Fil zayıf kalır; vezir seç.',
              },
              aciklama:
                  'Son sıraya ulaşan piyon vezir, kale, fil ya da ata '
                  'dönüşür: e8=V.',
            ),
            Bosluk(
              soru:
                  'Son sıraya ulaşan piyon şaha dönüşemez; genellikle ___ '
                  'seçilir.',
              secenekler: ['vezir', 'kale', 'at', 'fil'],
              dogru: 0,
              aciklama: 'Vezir en güçlü taştır; bu yüzden en sık o seçilir.',
            ),
            Secim(
              soru: 'İki şah yan yana (bitişik karelerde) durabilir mi?',
              secenekler: ['Hayır, asla', 'Evet', 'Yalnız oyun sonunda'],
              dogru: 0,
              aciklama: 'Bitişik kare rakip şahın saldırısı altındadır.',
            ),
            Yaz(
              soru: 'Türkçe notasyonda şahın harfi nedir?',
              cevaplar: ['Ş'],
              aciklama: 'Şah Ş ile yazılır: Şg1 gibi.',
            ),
            Tablo(
              soru: 'Terfi seçeneklerinin harflerini tamamla.',
              baslik: ['Taş', 'Harf'],
              satirlar: [
                ['Vezir', 'V'],
                ['Kale', 'K'],
                ['Fil', 'F'],
                ['At', 'A'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 3, sutun: 1)],
              secenekler: ['V', 'A', 'Ş', 'P'],
              aciklama: 'Terfi notasyonu: e8=V, e8=A gibi.',
            ),
            Isaretle(
              soru: 'Piyonun dönüşebileceği taşları işaretle.',
              cumle: 'vezir şah kale piyon fil at',
              dogru: [0, 2, 4, 5],
              aciklama: 'Piyon şaha ya da yine piyona dönüşemez.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'satranc-1-u3',
      ad: 'Şah, mat, pat ve rok',
      dersler: [
        Ders(
          id: 'satranc-1-u3-d1',
          ad: 'Şah çekme ve kurtulma',
          dilbilgisiNotu:
              'Şah çekilen taraf üç yoldan biriyle kurtulur: şahı kaçırır, '
              'araya taş koyar ya da şah çeken taşı alır. Hiçbiri mümkün '
              'değilse mattır.',
          alistirmalar: [
            Secim(
              soru: 'Şah çekilen taraf ne yapmalıdır?',
              secenekler: [
                'Şahı tehditten hemen kurtarmalı',
                'Başka bir taşla saldırmalı',
                'Pas geçmeli',
              ],
              dogru: 0,
              aciklama: 'Şahı tehdit altında bırakan hamle yasal değildir.',
            ),
            Eslestir(
              soru: 'Şahtan kurtulma yolunu açıklamasıyla eşleştir.',
              ciftler: [
                (sol: 'Kaçmak', sag: 'Şahı güvenli kareye götürmek'),
                (sol: 'Araya girmek', sag: 'Tehdit hattına taş koymak'),
                (sol: 'Almak', sag: 'Şah çeken taşı yemek'),
              ],
              aciklama: 'Atın şahına araya girilemez: at atlar.',
            ),
            Hamle(
              soru: 'Siyah vezir şah çekiyor. Şah çeken taşı al!',
              fen: '4k3/8/8/8/R3q3/8/8/4K3 w - - 0 1',
              hamleler: ['a4e4'],
              hataMesajlari: {
                'e1d1':
                    'Kaçmak da kurtarır ama vezir korumasız: kalenle onu '
                    'alabilirsin.',
                'e1f1':
                    'Kaçmak da kurtarır ama vezir korumasız: kalenle onu '
                    'alabilirsin.',
                'e1d2':
                    'Kaçmak da kurtarır ama vezir korumasız: kalenle onu '
                    'alabilirsin.',
                'e1f2':
                    'Kaçmak da kurtarır ama vezir korumasız: kalenle onu '
                    'alabilirsin.',
              },
              aciklama: 'Kale 4. sıra boyunca e4\'e gider: Kxe4+.',
            ),
            Hamle(
              soru:
                  'Siyah kale şah çekiyor ve şahın kaçacak yeri yok. Araya '
                  'filini koy.',
              fen: '6k1/5ppp/8/8/2B5/8/5PPP/r5K1 w - - 0 1',
              hamleler: ['c4f1'],
              aciklama: 'Fil c4–f1 çaprazıyla 1. sıraya iner: Ff1.',
            ),
            Hamle(
              soru: 'Şah çekiliyor. Şahını tek güvenli kareye kaçır.',
              fen: 'k3r3/8/8/8/8/1b6/3P1P2/4K3 w - - 0 1',
              hamleler: ['e1f1'],
              aciklama:
                  'e sütunu kalenin, d1 karesi b3\'teki filin kontrolünde; '
                  'güvenli kare f1.',
            ),
            Bosluk(
              soru: 'Şah çekildiğinde şahı kurtarmayan bir hamle ___ değildir.',
              secenekler: ['yasal', 'güzel', 'hızlı', 'kolay'],
              dogru: 0,
              aciklama: 'Kurallar şahı tehditte bırakmaya izin vermez.',
            ),
            Secim(
              soru:
                  'Şah tehdit altında ve kurtulmanın hiçbir yolu yoksa buna '
                  'ne denir?',
              secenekler: ['Mat', 'Pat', 'Rok', 'Terfi'],
              dogru: 0,
              aciklama: 'Mat olan taraf oyunu kaybeder.',
            ),
            Yaz(
              soru: 'Notasyonda şah çeken hamlenin sonuna hangi işaret konur?',
              cevaplar: ['+'],
              aciklama: 'Şah +, mat # ile gösterilir: Vh5+, Vxf7#.',
            ),
            Isaretle(
              soru: 'Şahtan kurtulma yollarını işaretle.',
              cumle: 'kaçmak beklemek engellemek rok almak',
              dogru: [0, 2, 4],
              aciklama:
                  'Kaçmak, araya girerek engellemek ve şah çeken taşı almak. '
                  'Şah altındayken rok yapılamaz.',
            ),
          ],
        ),
        Ders(
          id: 'satranc-1-u3-d2',
          ad: 'Rok ve pat',
          dilbilgisiNotu:
              'Rokta şah kaleye doğru iki kare gider, kale şahın üzerinden '
              'atlayıp yanına geçer. Şah ve o kale daha önce oynamamış, '
              'aradaki kareler boş olmalı; şah çekiliyken ya da geçeceği '
              'kare tehdit altındayken rok yapılamaz.',
          alistirmalar: [
            Hamle(
              soru: 'Kısa rok yap: şahı g1\'e iki kare kaydır.',
              fen:
                  'r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R3K2R '
                  'w KQkq - 0 1',
              hamleler: ['e1g1'],
              hataMesajlari: {
                'e1f1':
                    'Şah yalnız bir kare gitti; rokta şah kaleye doğru iki '
                    'kare gider.',
              },
              aciklama: 'Kısa rok: şah g1\'e, h1\'deki kale f1\'e (O-O).',
            ),
            Hamle(
              soru: 'Bu kez uzun rok yap.',
              fen:
                  'r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R3K2R '
                  'w KQkq - 0 1',
              hamleler: ['e1c1'],
              hataMesajlari: {
                'e1d1':
                    'Şah bir kare gitti; uzun rokta şah c1\'e iki kare gider.',
              },
              aciklama: 'Uzun rok: şah c1\'e, a1\'deki kale d1\'e (O-O-O).',
            ),
            Secim(
              soru: 'Hangisi rok için GEREKMEZ?',
              secenekler: [
                'Vezirin tahtada olması',
                'Şahın daha önce oynamamış olması',
                'Kalenin daha önce oynamamış olması',
                'Aradaki karelerin boş olması',
              ],
              dogru: 0,
              aciklama: 'Vezirin yeri rokla ilgili değildir.',
            ),
            Secim(
              soru: 'Şah çekilirken rok yapılabilir mi?',
              secenekler: ['Hayır', 'Evet', 'Yalnız uzun rok'],
              dogru: 0,
              aciklama: 'Önce şahtan kurtulmak gerekir.',
            ),
            Tablo(
              soru: 'Rok notasyonunu tamamla.',
              baslik: ['Rok', 'Notasyon', 'Beyaz şahın gittiği kare'],
              satirlar: [
                ['Kısa rok', 'O-O', 'g1'],
                ['Uzun rok', 'O-O-O', 'c1'],
              ],
              bos: [(satir: 0, sutun: 1), (satir: 1, sutun: 1)],
              secenekler: ['O-O', 'O-O-O', '0-1', 'K-K'],
              aciklama: 'Kısa rokta iki, uzun rokta üç O yazılır.',
            ),
            Secim(
              soru: 'Pat nedir?',
              secenekler: [
                'Sırası gelen tarafın yasal hamlesi yok ve şahı tehdit '
                    'altında değil: oyun berabere',
                'Şah tehdit altında ve kurtuluş yok',
                'Rok yapılamaması',
              ],
              dogru: 0,
              aciklama: 'Pat beraberliktir; kazanan taraf dikkat etmelidir.',
            ),
            Hamle(
              soru: 'Mat et, ama dikkat: pat yapma!',
              fen: '7k/4Q3/6K1/8/8/8/8/8 w - - 0 1',
              hamleler: ['e7e8'],
              matKabul: true,
              hataMesajlari: {
                'e7f7':
                    'Bu pat! Siyahın yasal hamlesi kalmadı ve şahı tehdit '
                    'altında değil: oyun berabere biter.',
                'e7e6':
                    'Bu pat! Siyahın yasal hamlesi kalmadı ve şahı tehdit '
                    'altında değil: oyun berabere biter.',
              },
              aciklama: 'Ve8#, Vf8#, Vg7# ya da Vh7# mattır; Vf7 ise pattır.',
            ),
            Bosluk(
              soru: 'Pat olursa oyun ___ biter.',
              secenekler: [
                'berabere',
                'beyazın kazanmasıyla',
                'siyahın kazanmasıyla',
              ],
              dogru: 0,
              aciklama: 'Pat, sırası gelen tarafın hamlesi olmaması demektir.',
            ),
            Yaz(
              soru: 'Uzun rokun notasyonu nedir?',
              cevaplar: ['O-O-O', '0-0-0'],
              aciklama: 'Uzun rok O-O-O, kısa rok O-O yazılır.',
            ),
          ],
        ),
      ],
    ),
    Unite(
      id: 'satranc-1-u4',
      ad: 'Taş değerleri ve tek hamlede mat',
      dersler: [
        Ders(
          id: 'satranc-1-u4-d1',
          ad: 'Taşların değeri',
          alistirmalar: [
            Tablo(
              soru: 'Taşların yaklaşık puan değerini tamamla.',
              baslik: ['Taş', 'Puan'],
              satirlar: [
                ['Piyon', '1'],
                ['At', '3'],
                ['Fil', '3'],
                ['Kale', '5'],
                ['Vezir', '9'],
              ],
              bos: [(satir: 3, sutun: 1), (satir: 4, sutun: 1)],
              secenekler: ['5', '9', '3', '1'],
              aciklama: 'Bu puanlar değiş tokuşta yol gösterir.',
            ),
            Secim(
              soru: 'Hangisi en değerlidir (şah hariç)?',
              secenekler: ['Vezir', 'Kale', 'Fil', 'At'],
              dogru: 0,
              aciklama: 'Vezir yaklaşık 9 puandır.',
            ),
            Secim(
              soru: 'Kaleni verip karşılığında bir at almak iyi bir takas mı?',
              secenekler: [
                'Hayır: 5 puan verip 3 puan alırsın',
                'Evet: at kaleden değerlidir',
                'Fark etmez',
              ],
              dogru: 0,
              aciklama: 'Kale (5) attan (3) değerlidir.',
            ),
            Hamle(
              soru: 'At üç taşa saldırıyor. En değerli olanı al.',
              fen: '7k/3r1p2/2p5/4N3/8/8/8/6K1 w - - 0 1',
              hamleler: ['e5d7'],
              hataMesajlari: {
                'e5f7':
                    'Piyon aldın (1 puan); d7\'deki kale 5 puan ve korumasız.',
                'e5c6':
                    'Piyon aldın (1 puan); d7\'deki kale 5 puan ve korumasız.',
              },
              aciklama: 'Axd7 ile korumasız kale alınır.',
            ),
            Hamle(
              soru:
                  'Vezirine fil saldırıyor. Vezirini kurtarırken en değerli '
                  'taşı al.',
              fen: '6k1/5pp1/7p/8/r5b1/8/5PPP/3Q2K1 w - - 0 1',
              hamleler: ['d1a4'],
              hataMesajlari: {
                'd1g4':
                    'Fili aldın (3 puan) ama a4\'teki kale 5 puan ve '
                    'korumasız.',
              },
              aciklama: 'Vxa4 hem veziri kaçırır hem kaleyi kazanır.',
            ),
            Bosluk(
              soru: 'Bir at yaklaşık ___ piyon değerindedir.',
              secenekler: ['üç', 'bir', 'beş', 'dokuz'],
              dogru: 0,
              aciklama: 'At ve fil yaklaşık 3 puandır.',
            ),
            Eslestir(
              soru: 'Taşı puanıyla eşleştir.',
              ciftler: [
                (sol: 'Piyon', sag: '1 puan'),
                (sol: 'At', sag: '3 puan'),
                (sol: 'Kale', sag: '5 puan'),
                (sol: 'Vezir', sag: '9 puan'),
              ],
              aciklama: 'Fil de atla aynı, yaklaşık 3 puandır.',
            ),
            Secim(
              soru: 'Şahın puan değeri neden verilmez?',
              secenekler: [
                'Şah kaybedilemez; mat oyunun sonudur',
                'Çok zayıf olduğu için',
                'Hiç hareket etmediği için',
              ],
              dogru: 0,
              aciklama: 'Şah alınmaz; mat edilir.',
            ),
            Yaz(
              soru: 'Bir kale ile bir fil toplam kaç puandır? (sayıyla yaz)',
              cevaplar: ['8', 'sekiz'],
              aciklama: 'Kale 5 + fil 3 = 8.',
            ),
          ],
        ),
        Ders(
          id: 'satranc-1-u4-d2',
          ad: 'Tek hamlede mat',
          dilbilgisiNotu:
              'Mat ararken önce şah çeken hamlelere bak; sonra rakip şahın '
              'kaçabileceği kareleri say. Kaçış, araya girme ve alma yoksa '
              'mattır.',
          alistirmalar: [
            Hamle(
              soru: 'Koridor matı: tek hamlede mat et.',
              fen: '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1',
              hamleler: ['e1e8'],
              matKabul: true,
              hataMesajlari: {
                'e1e7': 'Ke7 şah çekmez; kale 8. sıraya gitmeli.',
              },
              aciklama:
                  'Siyah şahın önündeki kendi piyonları kaçışı kapatır: Ke8#.',
            ),
            Hamle(
              soru: 'Vezir ve şah birlikte: tek hamlede mat et.',
              fen: 'k7/8/1K6/8/8/8/8/6Q1 w - - 0 1',
              hamleler: ['g1g8'],
              matKabul: true,
              hataMesajlari: {'g1a1': 'Şah çekiyor ama siyah şah b8\'e kaçar.'},
              aciklama:
                  'Vg8# : a7 ve b7\'yi beyaz şah, 8. sırayı vezir kontrol '
                  'eder.',
            ),
            Hamle(
              soru: 'Tek hamlede mat et.',
              fen: '6k1/5ppp/8/8/8/8/5PPP/3Q2K1 w - - 0 1',
              hamleler: ['d1d8'],
              matKabul: true,
              aciklama: 'Vd8#: yine son sıra ve kendi piyonlarıyla kapalı şah.',
            ),
            Hamle(
              soru: 'Siyah oynar: tek hamlede mat et.',
              fen: '6k1/8/8/8/8/8/1r3PPP/6K1 b - - 0 1',
              hamleler: ['b2b1'],
              matKabul: true,
              aciklama: 'Kb1#: beyaz şah da kendi piyonlarının arkasında.',
            ),
            Hamle(
              soru: 'Boğmaca matı: atla mat et.',
              fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
              hamleler: ['g5f7'],
              matKabul: true,
              aciklama:
                  'Siyah şah kendi taşlarıyla çevrili; at f7\'den şah çeker '
                  've kaçış yoktur: Af7#.',
            ),
            Hamle(
              soru: 'Çoban matı: tek hamlede mat et.',
              fen:
                  'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR '
                  'w KQkq - 4 4',
              hamleler: ['h5f7'],
              matKabul: true,
              aciklama:
                  'f7 yalnız şah tarafından korunur; c4\'teki fil veziri '
                  'destekler: Vxf7#.',
            ),
            Secim(
              soru: 'Notasyonda mat hangi işaretle gösterilir?',
              secenekler: ['#', '+', '!', '?'],
              dogru: 0,
              aciklama: '+ şah, # mat demektir.',
            ),
            Hamle(
              soru: 'Kale ve at birlikte: tek hamlede mat et.',
              fen: '7k/1R6/5N2/8/8/8/8/6K1 w - - 0 1',
              hamleler: ['b7h7'],
              matKabul: true,
              aciklama:
                  'Arap matı: Kh7#. At hem h7\'deki kaleyi korur hem g8\'i '
                  'kapatır.',
            ),
            Bosluk(
              soru: 'Matta şah tehdit altındadır ve ___ yolu yoktur.',
              secenekler: ['kurtuluş', 'rok', 'terfi', 'pat'],
              dogru: 0,
              aciklama: 'Kaçış, araya girme ve alma: hiçbiri mümkün değil.',
            ),
          ],
        ),
      ],
    ),
  ],
);
