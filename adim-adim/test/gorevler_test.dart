// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Günlük ve haftalık görevler (motor/gorevler.dart) birim testleri: ilerleme
/// mevcut durumdan hesaplanır, ödül sabit XP'dir ve yalnız bir kez alınır,
/// yeni durum alanları eski kayıtlarla geriye uyumludur.
library;

import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/gorevler.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter_test/flutter_test.dart';

// 2026-10-15 Perşembe; haftanın Pazartesi'si 2026-10-12.
const _bugun = '2026-10-15';
const _ders = 'sahte-1.u1.d1';

Gorev _bul(List<Gorev> l, String id) => l.firstWhere((g) => g.id == id);

void main() {
  group('günlük görevler', () {
    test('boş durumda ilerleme 0, tekrar görevi bekleyen kart yoksa gizli', () {
      final l = Gorevler.gunluk(const OgrenciDurumu(), _bugun);
      expect(l.map((g) => g.id), ['ders', 'xp', 'mikro', 'bilmece']);
      expect(l.every((g) => g.ilerleme == 0 && !g.tamam), isTrue);
    });

    test('bekleyen tekrar kartı varsa tekrar görevi listelenir', () {
      final l = Gorevler.gunluk(
        const OgrenciDurumu(),
        _bugun,
        bekleyenTekrar: 3,
      );
      final t = _bul(l, 'tekrar');
      expect(t.ayrinti, contains('3 kart'));
      expect(t.tamam, isFalse);
    });

    test('ders bitince ders ve XP görevleri ilerler', () {
      final d = Motor.dersBitir(const OgrenciDurumu(), _ders, 5, 5, _bugun);
      final l = Gorevler.gunluk(d, _bugun);
      expect(_bul(l, 'ders').tamam, isTrue);
      expect(_bul(l, 'xp').ilerleme, d.gunlukXp[_bugun]);
      // dersXp(5,5) = 10 + 10 + 5 = 25 < 30 hedef
      expect(_bul(l, 'xp').tamam, isFalse);
      expect(_bul(l, 'xp').hedef, 30);
    });

    test('XP hedefi günlük hedeften gelir', () {
      final l = Gorevler.gunluk(const OgrenciDurumu(gunlukHedef: 50), _bugun);
      expect(_bul(l, 'xp').hedef, 50);
      expect(_bul(l, 'xp').baslik, '50 XP kazan');
    });

    test('mikro ders, tekrar oturumu ve bilmece günlükten sayılır', () {
      var d = Motor.mikroBitir(const OgrenciDurumu(), 3, 3, _bugun);
      d = Motor.tekrarBitir(d, 2, 3, _bugun);
      d = d.copyWith(bilmece: const BilmeceDurumu(gun: _bugun, dogru: false));
      final l = Gorevler.gunluk(d, _bugun);
      expect(_bul(l, 'mikro').tamam, isTrue);
      expect(_bul(l, 'tekrar').tamam, isTrue); // bekleyen 0 ama bugün yapıldı
      expect(_bul(l, 'bilmece').tamam, isTrue);
    });

    test('dünkü kayıtlar bugünün görevini doldurmaz', () {
      final d = Motor.dersBitir(
        const OgrenciDurumu(),
        _ders,
        5,
        5,
        '2026-10-14',
      );
      final l = Gorevler.gunluk(d, _bugun);
      expect(_bul(l, 'ders').ilerleme, 0);
      expect(_bul(l, 'xp').ilerleme, 0);
    });

    test('geçersiz gün boş liste verir', () {
      expect(Gorevler.gunluk(const OgrenciDurumu(), 'x'), isEmpty);
      expect(Gorevler.haftalik(const OgrenciDurumu(), 'x'), isEmpty);
    });

    test('gösterilen ilerleme ve oran hedefle sınırlıdır', () {
      var d = const OgrenciDurumu();
      for (var i = 0; i < 3; i++) {
        d = Motor.dersBitir(d, _ders, 5, 5, _bugun);
      }
      final g = _bul(Gorevler.gunluk(d, _bugun), 'ders');
      expect(g.ilerleme, 3);
      expect(g.gosterilenIlerleme, 1);
      expect(g.oran, 1.0);
    });
  });

  group('haftalık görevler', () {
    test('hafta günü, ders ve XP hesabı Pazartesi başlangıçlıdır', () {
      var d = const OgrenciDurumu(haftalikHedefGun: 3);
      // Önceki haftanın Pazar günü: sayılmaz.
      d = Motor.dersBitir(d, _ders, 5, 5, '2026-10-11');
      // Bu hafta: Pazartesi ve Perşembe.
      d = Motor.dersBitir(d, _ders, 5, 5, '2026-10-12');
      d = Motor.dersBitir(d, _ders, 5, 5, _bugun);
      final l = Gorevler.haftalik(d, _bugun);
      expect(_bul(l, 'hafta_gun').ilerleme, 2);
      expect(_bul(l, 'hafta_gun').hedef, 3);
      expect(_bul(l, 'hafta_ders').ilerleme, 2);
      expect(_bul(l, 'hafta_xp').ilerleme, 50);
      expect(_bul(l, 'hafta_xp').hedef, 120); // 30 * 4
      expect(_bul(l, 'hafta_gun').anahtar, 'h:2026-10-12|hafta_gun');
    });

    test('haftalık XP hedefi en az 100 olur', () {
      expect(Gorevler.haftaXpHedefi(const OgrenciDurumu(gunlukHedef: 10)), 100);
    });
  });

  group('ödül', () {
    OgrenciDurumu bitmis() =>
        Motor.dersBitir(const OgrenciDurumu(), _ders, 5, 5, _bugun);

    test('tamamlanmamış görevin ödülü alınamaz', () {
      const d = OgrenciDurumu();
      final g = _bul(Gorevler.gunluk(d, _bugun), 'ders');
      expect(Gorevler.alinabilir(d, g), isFalse);
      expect(identical(Gorevler.odulAl(d, g), d), isTrue);
    });

    test('ödül sabit XP verir, günlük XP değişmez, ikinci kez verilmez', () {
      final d = bitmis();
      final g = _bul(Gorevler.gunluk(d, _bugun), 'ders');
      expect(Gorevler.alinabilir(d, g), isTrue);
      final y = Gorevler.odulAl(d, g);
      expect(y.xp, d.xp + Gorevler.dersOdul);
      expect(y.gunlukXp, d.gunlukXp);
      expect(y.alinanGorevler, contains('g:$_bugun|ders'));
      final gy = _bul(Gorevler.gunluk(y, _bugun), 'ders');
      expect(Gorevler.alindi(y, gy), isTrue);
      expect(Gorevler.alinabilir(y, gy), isFalse);
      expect(Gorevler.odulAl(y, gy).xp, y.xp);
    });

    test('ertesi gün aynı görev yeniden alınabilir', () {
      final d0 = bitmis();
      var d = Gorevler.odulAl(d0, _bul(Gorevler.gunluk(d0, _bugun), 'ders'));
      d = Motor.dersBitir(d, _ders, 5, 5, '2026-10-16');
      final g = _bul(Gorevler.gunluk(d, '2026-10-16'), 'ders');
      expect(Gorevler.alinabilir(d, g), isTrue);
    });

    test('tamamSayisi tamamlananları sayar', () {
      final l = Gorevler.gunluk(bitmis(), _bugun);
      expect(Gorevler.tamamSayisi(l), 1);
    });
  });

  group('durum alanları (geriye uyum)', () {
    test('eski kayıtta alanlar yoksa boş küme', () {
      final d = OgrenciDurumu.fromJson({'xp': 5});
      expect(d.alinanGorevler, isEmpty);
      expect(d.rozetler, isEmpty);
    });

    test('JSON gidiş-dönüş korunur', () {
      const d = OgrenciDurumu(
        alinanGorevler: {'g:2026-10-15|ders', 'h:2026-10-12|hafta_gun'},
        rozetler: {'seri_3', 'ilk_ders'},
      );
      final y = OgrenciDurumu.fromJson(d.toJson());
      expect(y.alinanGorevler, d.alinanGorevler);
      expect(y.rozetler, d.rozetler);
    });

    test('bozuk anahtarlar atlanır', () {
      final d = OgrenciDurumu.fromJson({
        'alinanGorevler': [
          'g:2026-10-15|ders',
          'g:2026-02-30|ders', // geçersiz gün
          'x:2026-10-15|ders', // geçersiz önek
          'g:2026-10-15|BÜYÜK',
          5,
        ],
        'rozetler': ['seri_3', 'Seri 3', '', 7],
      });
      expect(d.alinanGorevler, {'g:2026-10-15|ders'});
      expect(d.rozetler, {'seri_3'});
    });

    test('ödül kaydı en yeni 120 anahtara kırpılır', () {
      var d = const OgrenciDurumu();
      for (var i = 1; i <= 130; i++) {
        final gun = DateTime.utc(
          2026,
          1,
          1,
        ).add(Duration(days: i)).toIso8601String().substring(0, 10);
        d = d.copyWith(
          alinanGorevler: OgrenciDurumu.gorevAnahtarlariKirp({
            ...d.alinanGorevler,
            'g:$gun|ders',
          }),
        );
      }
      expect(d.alinanGorevler, hasLength(OgrenciDurumu.alinanGorevEnCok));
      // En eski anahtarlar düşer.
      expect(d.alinanGorevler.contains('g:2026-01-02|ders'), isFalse);
    });
  });
}
