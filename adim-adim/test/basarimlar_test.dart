// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Başarımlar (motor/basarimlar.dart) birim testleri: her rozetin koşulu,
/// ilerleme sayıları, kalıcı rozet kaydı ve kimliklerin tutarlılığı.
library;

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/basarimlar.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter_test/flutter_test.dart';

import 'sahte_icerik.dart';

const _bugun = '2026-10-15';

Basarim _b(OgrenciDurumu d, String id) =>
    Basarimlar.hesapla(d, [sahteKurs]).firstWhere((x) => x.id == id);

bool _kazanildi(OgrenciDurumu d, String id) => _b(d, id).kazanildi;

void main() {
  test('yaklaşık 20 rozet; kimlikler tekil ve geçerli biçimde', () {
    expect(Basarimlar.toplam, inInclusiveRange(18, 24));
    final idler = Basarimlar.tanimlar.map((t) => t.id).toList();
    expect(idler.toSet(), hasLength(idler.length));
    for (final id in idler) {
      expect(OgrenciDurumu.rozetGecerli(id), isTrue, reason: id);
    }
  });

  test('boş durumda hiçbir rozet kazanılmamış', () {
    final l = Basarimlar.hesapla(const OgrenciDurumu(), [sahteKurs]);
    expect(l.where((b) => b.kazanildi), isEmpty);
    expect(Basarimlar.kazanilanSayisi(l), 0);
    expect(l.length, Basarimlar.toplam);
  });

  test('seri 3 / 7 / 30 eşikleri en uzun seriden gelir', () {
    expect(_kazanildi(const OgrenciDurumu(enSeri: 2), 'seri_3'), isFalse);
    expect(_kazanildi(const OgrenciDurumu(enSeri: 3), 'seri_3'), isTrue);
    const d7 = OgrenciDurumu(enSeri: 7, seri: 1);
    expect(_kazanildi(d7, 'seri_7'), isTrue);
    expect(_kazanildi(d7, 'seri_30'), isFalse);
    expect(_b(d7, 'seri_30').ilerleme, 7);
    expect(_kazanildi(const OgrenciDurumu(enSeri: 30), 'seri_30'), isTrue);
  });

  test('ilk ders ve 10 ders farklı derslerden sayılır', () {
    var d = Motor.dersBitir(const OgrenciDurumu(), sahteDers1, 5, 5, _bugun);
    d = Motor.dersBitir(d, sahteDers1, 5, 5, _bugun); // aynı ders: tek sayılır
    expect(_kazanildi(d, 'ilk_ders'), isTrue);
    expect(_b(d, 'ders_10').ilerleme, 1);
    expect(_kazanildi(d, 'ders_10'), isFalse);

    final on = OgrenciDurumu(
      tamamlanan: {for (var i = 0; i < 10; i++) 'k.u1.d$i': 1},
    );
    expect(_kazanildi(on, 'ders_10'), isTrue);
    expect(_kazanildi(on, 'ders_50'), isFalse);
  });

  test('XP rozetleri toplam XP eşiğinde açılır', () {
    expect(_kazanildi(const OgrenciDurumu(xp: 99), 'xp_100'), isFalse);
    expect(_kazanildi(const OgrenciDurumu(xp: 100), 'xp_100'), isTrue);
    expect(_kazanildi(const OgrenciDurumu(xp: 1000), 'xp_1000'), isTrue);
    expect(_kazanildi(const OgrenciDurumu(xp: 1000), 'xp_5000'), isFalse);
    expect(_kazanildi(const OgrenciDurumu(xp: 5000), 'xp_5000'), isTrue);
  });

  test('ilk tekrar: tekrar oturumu günlükte kayıtlıysa', () {
    final d = Motor.tekrarBitir(const OgrenciDurumu(), 2, 3, _bugun);
    expect(_kazanildi(d, 'ilk_tekrar'), isTrue);
    expect(_kazanildi(const OgrenciDurumu(), 'ilk_tekrar'), isFalse);
  });

  test('tekrar ustası: 25 güçlü kart gerekir', () {
    Map<String, Kart> kartlar(int n, double yariOmur) => {
      for (var i = 0; i < n; i++)
        '$sahteDers1#$i': Kart(
          kutu: 3,
          sonraki: '2026-10-20',
          yariOmurGun: yariOmur,
        ),
    };
    final yirmiDort = OgrenciDurumu(kartlar: kartlar(24, 8));
    expect(_kazanildi(yirmiDort, 'tekrar_ustasi'), isFalse);
    expect(_b(yirmiDort, 'tekrar_ustasi').ilerleme, 24);
    expect(
      _kazanildi(OgrenciDurumu(kartlar: kartlar(25, 8)), 'tekrar_ustasi'),
      isTrue,
    );
    // Zayıf kartlar sayılmaz.
    expect(
      _kazanildi(OgrenciDurumu(kartlar: kartlar(30, 1)), 'tekrar_ustasi'),
      isFalse,
    );
  });

  test('mikro ders ve tam puan', () {
    final m = Motor.mikroBitir(const OgrenciDurumu(), 3, 3, _bugun);
    expect(_kazanildi(m, 'mikro_ders'), isTrue);
    final eksik = Motor.dersBitir(
      const OgrenciDurumu(),
      sahteDers1,
      4,
      5,
      _bugun,
    );
    expect(_kazanildi(eksik, 'tam_puan'), isFalse);
    final tam = Motor.dersBitir(
      const OgrenciDurumu(),
      sahteDers1,
      5,
      5,
      _bugun,
    );
    expect(_kazanildi(tam, 'tam_puan'), isTrue);
  });

  test('yarışma ilk galibiyet: eşik üstü doğru oranı gerekir', () {
    OgrenciDurumu oyna(int dogru, int toplam) => Motor.yarismaBitir(
      const OgrenciDurumu(),
      100,
      _bugun,
      dogru: dogru,
      toplam: toplam,
    );
    expect(_kazanildi(oyna(8, 10), 'yarisma_ilk'), isTrue);
    expect(_kazanildi(oyna(2, 10), 'yarisma_ilk'), isFalse);
    expect(_kazanildi(oyna(0, 0), 'yarisma_ilk'), isFalse);
  });

  test('günlük hedef, bilmece, hikâye ve altın ünite', () {
    expect(
      _kazanildi(
        const OgrenciDurumu(gunlukXp: {_bugun: 29}, gunlukHedef: 30),
        'gun_hedefi',
      ),
      isFalse,
    );
    expect(
      _kazanildi(
        const OgrenciDurumu(gunlukXp: {_bugun: 30}, gunlukHedef: 30),
        'gun_hedefi',
      ),
      isTrue,
    );
    expect(
      _kazanildi(
        const OgrenciDurumu(bilmece: BilmeceDurumu(gun: _bugun, dogru: false)),
        'bilmece',
      ),
      isFalse,
    );
    expect(
      _kazanildi(
        const OgrenciDurumu(bilmece: BilmeceDurumu(gun: _bugun, dogru: true)),
        'bilmece',
      ),
      isTrue,
    );
    expect(
      _kazanildi(
        const OgrenciDurumu(tamamlananHikayeler: {'h1': 1}),
        'ilk_hikaye',
      ),
      isTrue,
    );
    expect(
      _kazanildi(const OgrenciDurumu(altinUniteler: {'k.u1'}), 'altin_unite'),
      isTrue,
    );
  });

  test('kurs bitirme tüm dersler bitince, sertifika sınavı geçilince', () {
    expect(
      _kazanildi(
        const OgrenciDurumu(tamamlanan: {sahteDers1: 1}),
        'kurs_bitir',
      ),
      isFalse,
    );
    expect(
      _kazanildi(
        const OgrenciDurumu(tamamlanan: {sahteDers1: 1, sahteDers2: 1}),
        'kurs_bitir',
      ),
      isTrue,
    );
    // Seviye belirleme ile atlanan dersler de bitmiş sayılır.
    expect(
      _kazanildi(
        const OgrenciDurumu(atlananDersler: {sahteDers1, sahteDers2}),
        'kurs_bitir',
      ),
      isTrue,
    );
    expect(
      _kazanildi(
        const OgrenciDurumu(
          sertifikalar: {
            sahteKursId: SinavSonucu(dogru: 7, toplam: 10, gun: _bugun),
          },
        ),
        'sertifika',
      ),
      isFalse,
    );
    expect(
      _kazanildi(
        const OgrenciDurumu(
          sertifikalar: {
            sahteKursId: SinavSonucu(dogru: 9, toplam: 10, gun: _bugun),
          },
        ),
        'sertifika',
      ),
      isTrue,
    );
  });

  group('kalıcı rozet kaydı', () {
    test('kayıtlı rozet ilerleme düşse de kazanılmış kalır', () {
      const d = OgrenciDurumu(rozetler: {'seri_30'});
      final b = _b(d, 'seri_30');
      expect(b.kazanildi, isTrue);
      expect(b.ilerleme, 0);
    });

    test('rozetleriIsle yeni kazanılanları ekler, sonra değişmez', () {
      final d = Motor.dersBitir(
        const OgrenciDurumu(),
        sahteDers1,
        5,
        5,
        _bugun,
      );
      final yeni = Basarimlar.yeniKazanilan(d, [sahteKurs]);
      expect(yeni, containsAll(['ilk_ders', 'tam_puan']));
      final y = Basarimlar.rozetleriIsle(d, [sahteKurs]);
      expect(y.rozetler, containsAll(yeni));
      expect(Basarimlar.yeniKazanilan(y, [sahteKurs]), isEmpty);
      expect(identical(Basarimlar.rozetleriIsle(y, [sahteKurs]), y), isTrue);
    });

    test('günlük kırpılsa da kayıtlı rozet geri alınmaz', () {
      var d = Motor.tekrarBitir(const OgrenciDurumu(), 2, 3, _bugun);
      d = Basarimlar.rozetleriIsle(d, [sahteKurs]);
      final kirpilmis = d.copyWith(gunluk: const []);
      expect(_kazanildi(kirpilmis, 'ilk_tekrar'), isTrue);
    });
  });
}
