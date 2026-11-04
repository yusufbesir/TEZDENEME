// Sahibi Yusuf (yusufbesir). Yazan: Claude (bugünkü hatalar). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.

/// Bugünkü hatalar saf işlevleri (boş, bugün/dün ayrımı, en çok 5 ve en yeni
/// önce, zayıf konu seçimi).
library;

import 'package:adim_adim/bilesenler/oturum_ozeti.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/motor/oturum_ozeti.dart';
import 'package:adim_adim/tema/tema.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

import 'sahte_icerik.dart';

const _bugun = '2026-10-15';
const _dun = '2026-10-14';

HataKaydi _kart(String id, String gun) =>
    HataKaydi(tur: HataKaydi.turKart, id: id, seviye: 'sahte-1', gun: gun);

void main() {
  group('saf', () {
    test('hata yoksa boş liste, sayı 0, zayıf konu null', () {
      const d = OgrenciDurumu();
      expect(OturumOzetiMotoru.bugunkuHatalar(d, _bugun), isEmpty);
      expect(OturumOzetiMotoru.bugunkuHataSayisi(d, _bugun), 0);
      expect(OturumOzetiMotoru.zayifKonu(d, _bugun), isNull);
      expect(OturumOzetiMotoru.kisalt('  a   b  '), 'a b');
    });

    test('yalnız bugünün kayıtları sayılır; dünkü dışarıda kalır', () {
      var d = Motor.kartIsle(
        const OgrenciDurumu(),
        '$sahteDers1#0',
        false,
        _dun,
      );
      d = Motor.kartIsle(d, '$sahteDers1#1', false, _bugun);
      d = Motor.kartIsle(d, '$sahteDers1#2', true, _bugun); // doğru: hata değil
      final bugunku = OturumOzetiMotoru.bugunkuHatalar(d, _bugun);
      expect(bugunku.map((h) => h.id), ['$sahteDers1#1']);
      expect(OturumOzetiMotoru.bugunkuHataSayisi(d, _bugun), 1);
      expect(
        OturumOzetiMotoru.bugunkuHatalar(d, _dun).single.id,
        '$sahteDers1#0',
      );
    });

    test('en çok 5 kayıt, en yeni önce; sayı tümünü verir', () {
      var d = const OgrenciDurumu();
      for (var i = 0; i < 7; i++) {
        d = Motor.kartIsle(d, '$sahteDers1#$i', false, _bugun);
      }
      final bugunku = OturumOzetiMotoru.bugunkuHatalar(d, _bugun);
      expect(bugunku, hasLength(5));
      expect(bugunku.map((h) => h.id), [
        '$sahteDers1#6',
        '$sahteDers1#5',
        '$sahteDers1#4',
        '$sahteDers1#3',
        '$sahteDers1#2',
      ]);
      expect(OturumOzetiMotoru.bugunkuHataSayisi(d, _bugun), 7);
    });

    test('zayıf konu: en çok hata toplanan ünite; eşitlikte en son', () {
      // Kurslarla çözülür: ünite adı.
      final d1 = OgrenciDurumu(
        hatalar: [
          _kart('$sahteDers1#0', _bugun),
          _kart('$sahteDers2#0', _bugun),
          _kart('baska-1.u2.d1#0', _bugun),
        ],
      );
      expect(
        OturumOzetiMotoru.zayifKonu(d1, _bugun, kurslar: [sahteKurs]),
        'Sahte Ünite',
      );
      // Kurs verilmezse ünite öneki; dünkü kayıtlar sayılmaz.
      expect(OturumOzetiMotoru.zayifKonu(d1, _bugun), 'sahte-1.u1');
      final d2 = OgrenciDurumu(
        hatalar: [
          _kart('a-1.u1.d1#0', _dun),
          _kart('a-1.u1.d1#1', _dun),
          _kart('a-1.u1.d1#2', _bugun),
          _kart('b-1.u3.d1#0', _bugun), // eşitlik: en son eklenen kazanır
        ],
      );
      expect(OturumOzetiMotoru.zayifKonu(d2, _bugun), 'b-1.u3');
      // Yarışma hatası kategori adıyla sayılır.
      const d3 = OgrenciDurumu(
        hatalar: [
          HataKaydi(
            tur: HataKaydi.turYarisma,
            id: 'y1',
            kategori: 'tarih',
            seviye: 'html-1',
            gun: _bugun,
          ),
        ],
      );
      expect(OturumOzetiMotoru.zayifKonu(d3, _bugun), 'Tarih');
      expect(OturumOzetiMotoru.zayifKonu(d3, _dun), isNull);
    });
  });

  group('oturum özeti satırları', () {
    test('yanlış sayısı ve en sık hatalı hece', () {
      const v = OturumOzetiVeri(
        dogru: 7,
        toplam: 10,
        xp: 1,
        seri: 1,
        seriArtti: false,
        yeniRozetler: [],
        kilometreler: [],
      );
      expect(v.yanlis, 3);
      expect(v.enSikHece, isNull);
      expect(
        OturumOzetiMotoru.enSikHece([
          ['tha', 'ri'],
          ['Ri'],
          ['tha'],
          ['ri'],
        ]),
        'ri',
      );
      expect(OturumOzetiMotoru.enSikHece(const []), isNull);
    });

    Widget sar(OturumOzetiVeri v) => MaterialApp.router(
      theme: acikTema(),
      routerConfig: GoRouter(
        routes: [
          GoRoute(
            path: '/',
            builder: (c, s) => Scaffold(body: OturumOzeti(veri: v)),
          ),
          GoRoute(
            path: '/tekrar',
            builder: (c, s) => const Scaffold(body: Text('hata-defteri')),
          ),
        ],
      ),
    );

    testWidgets('satır görünür, dokununca hatalara gider; hece satırı', (
      tester,
    ) async {
      await tester.pumpWidget(
        sar(
          const OturumOzetiVeri(
            dogru: 7,
            toplam: 10,
            xp: 1,
            seri: 1,
            seriArtti: false,
            yeniRozetler: [],
            kilometreler: [],
            enSikHece: 'tha',
          ),
        ),
      );
      expect(find.text('Bu oturumda 3 yanlış → Hatalarım'), findsOneWidget);
      expect(find.text('En sık hatalı hece: tha'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('oturum-yanlis')));
      await tester.pumpAndSettle();
      expect(find.text('hata-defteri'), findsOneWidget);
    });

    testWidgets('yanlış yoksa satırlar görünmez', (tester) async {
      await tester.pumpWidget(
        sar(
          const OturumOzetiVeri(
            dogru: 10,
            toplam: 10,
            xp: 1,
            seri: 1,
            seriArtti: false,
            yeniRozetler: [],
            kilometreler: [],
          ),
        ),
      );
      expect(find.byKey(const ValueKey('oturum-yanlis')), findsNothing);
      expect(find.byKey(const ValueKey('oturum-hece')), findsNothing);
    });
  });
}
