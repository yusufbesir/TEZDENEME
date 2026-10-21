// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Satranç modülü (ÖZELLİK 47, 52-57) mantık testleri. İÇERİK DOĞRULAMASI:
/// her bulmaca, oyun sonu, Solo ve analiz konumu kural motorunda ve aramayla
/// denetlenir (FEN geçerli, ana hat yasal, mat iddiası zorlanmış mat
/// aramasıyla doğru, tek çözüm, en az hamle). Ayrıca bilgisayar rakibi,
/// oyun sonu incelemesi, durum (eski kayıt uyumu), tekrar destesinin SRS
/// ile uyumu ve koordinat dizisi.
library;

import 'dart:convert';

import 'package:adim_adim/icerik/icerik.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/model/satranc_durumu.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:adim_adim/motor/satranc_calisma.dart';
import 'package:adim_adim/satranc/oyun.dart';
import 'package:adim_adim/satranc/satranc.dart';
import 'package:adim_adim/satranc/veri.dart';
import 'package:adim_adim/satranc/yz.dart';
import 'package:flutter_test/flutter_test.dart';

/// Hamle sırası: UCI hamlelerini sırayla oynar, hepsi yasal olmalı.
Konum _oyna(Konum k, List<String> ucis) {
  var s = k;
  for (final u in ucis) {
    final n = s.uciOyna(u);
    expect(n, isNotNull, reason: '$u yasal değil: ${s.fen}');
    s = n!;
  }
  return s;
}

void main() {
  group('bulmaca içeriği', () {
    test('kimlikler tekil, temalar kayıtlı, her temada en az 3 bulmaca', () {
      final idler = [for (final b in SatrancVeri.bulmacalar) b.id];
      expect(idler.toSet().length, idler.length);
      final temalar = {for (final t in SatrancVeri.temalar) t.id};
      expect(temalar.length, SatrancVeri.temalar.length);
      for (final b in SatrancVeri.bulmacalar) {
        expect(temalar, contains(b.tema), reason: b.id);
        expect(b.id, startsWith('${b.tema}-'));
        expect(b.aciklama, isNotEmpty);
        expect(b.ipucu, isNotEmpty);
      }
      for (final t in temalar) {
        expect(
          SatrancVeri.temaBulmacalari(t).length,
          greaterThanOrEqualTo(3),
          reason: t,
        );
      }
    });

    test('her bulmaca: FEN geçerli, ana hat yasal, iddia motorda doğru', () {
      for (final b in SatrancVeri.bulmacalar) {
        final k = Konum.fen(b.fen);
        expect(k.yasalHamleler, isNotEmpty, reason: b.id);
        expect(k.sah == false || b.matSayisi == 0, true, reason: b.id);
        // Ana hat baştan sona yasal ve çift indeksler oyuncunun hamlesi.
        final son = _oyna(k, b.hamleler);
        if (b.matSayisi > 0) {
          // N hamlede mat: tam N hamlede zorlanır, N-1'de zorlanmaz.
          expect(k.matZorlanir(b.matSayisi), true, reason: '${b.id} mat');
          expect(
            k.matZorlanir(b.matSayisi - 1),
            false,
            reason: '${b.id} daha kısa mat var',
          );
          // Ana hat: ilk oyuncu hamlesi zorla mat verir, son hamle mattır.
          expect(
            k.hamleZorlarMat(k.uciBul(b.hamleler.first)!, b.matSayisi),
            true,
            reason: b.id,
          );
          expect(son.mat, true, reason: '${b.id} ana hat mat ile bitmeli');
          // Rakibin ana hattaki cevabı yasal ve ardından mat bulunur.
          expect(b.hamleler.length, 2 * b.matSayisi - 1, reason: b.id);
        } else {
          // Taktik: ilk hamle derinlik-4 aramada TEK en iyi hamledir.
          final p = SatrancYZ.hamlePuanlari(k, derinlik: 4);
          expect(p.first.hamle.uci, b.hamleler.first, reason: b.id);
          expect(
            p.first.puan - p[1].puan,
            greaterThanOrEqualTo(100),
            reason: '${b.id}: en iyi hamle belirgin olmalı',
          );
          // Ana hat taş kazandırır (oyuncu açısından en az bir at).
          final kazanc =
              (SatrancYZ.materyal(son) - SatrancYZ.materyal(k)) *
              (k.beyazSirada ? 1 : -1);
          expect(kazanc, greaterThanOrEqualTo(300), reason: b.id);
          // Son hamle bir taş alır.
          final sonH = _oyna(
            k,
            b.hamleler.take(b.hamleler.length - 1).toList(),
          ).uciBul(b.hamleler.last);
          expect(sonH?.alinan, isNotNull, reason: b.id);
          expect(b.hamleler.length, 3, reason: b.id);
        }
        expect(b.beyazOynar, k.beyazSirada, reason: b.id);
      }
    });

    test('mat bulmacalarında birden çok doğru yol kabul edilir', () {
      // Çifte şah matı: hem Ad6 hem Af6.
      final b = SatrancVeri.bulmacaBul('kesif-3')!;
      final k = Konum.fen(b.fen);
      expect(BulmacaKurali.dogruMu(b, k, k.uciBul('e4d6')!, 0), true);
      expect(BulmacaKurali.dogruMu(b, k, k.uciBul('e4f6')!, 0), true);
      expect(BulmacaKurali.dogruMu(b, k, k.uciBul('e4c5')!, 0), false);
      // Basamak matında iki ilk hamle.
      final m = SatrancVeri.bulmacaBul('mat2-2')!;
      final km = Konum.fen(m.fen);
      expect(BulmacaKurali.dogruMu(m, km, km.uciBul('a1a7')!, 0), true);
      expect(BulmacaKurali.dogruMu(m, km, km.uciBul('b2b7')!, 0), true);
      expect(BulmacaKurali.dogruMu(m, km, km.uciBul('a1a2')!, 0), false);
    });

    test(
      'BulmacaKurali: taktikte ilk hamle şart, son hamlede eşit taş alma',
      () {
        final b = SatrancVeri.bulmacaBul('catal-1')!;
        final k = Konum.fen(b.fen);
        expect(BulmacaKurali.dogruMu(b, k, k.uciBul('d5c7')!, 0), true);
        expect(BulmacaKurali.dogruMu(b, k, k.uciBul('h2h3')!, 0), false);
        // Cevap sonrası konumda son hamle: ana hattaki capture.
        final sonra = _oyna(k, ['d5c7', 'e8d7']);
        expect(BulmacaKurali.dogruMu(b, sonra, sonra.uciBul('c7a8')!, 1), true);
        expect(
          BulmacaKurali.dogruMu(b, sonra, sonra.uciBul('c7e6')!, 1),
          false,
        );
        // Rakip cevabı ana hat hamlesi.
        final s1 = k.oyna(k.uciBul('d5c7')!);
        expect(
          BulmacaKurali.rakipCevabi(b, s1, 0, k.uciBul('d5c7')!)?.uci,
          'e8d7',
        );
        expect(BulmacaKurali.bitti(b, s1, 0), false);
        expect(BulmacaKurali.bitti(b, sonra, 1), true);
      },
    );
  });

  group('oyun sonu, Solo ve analiz içeriği', () {
    test('oyun sonu: enAz mat zorlanır, enAz-1 zorlanmaz; yan beyaz', () {
      expect(SatrancVeri.oyunSonlari.length, greaterThanOrEqualTo(9));
      final idler = [for (final k in SatrancVeri.oyunSonlari) k.id];
      expect(idler.toSet().length, idler.length);
      for (final o in SatrancVeri.oyunSonlari) {
        final k = Konum.fen(o.fen);
        expect(k.beyazSirada, true, reason: o.id);
        expect(o.enAz, inInclusiveRange(2, 3), reason: o.id);
        expect(k.matZorlanir(o.enAz), true, reason: '${o.id} en az ${o.enAz}');
        expect(
          k.matZorlanir(o.enAz - 1),
          false,
          reason: '${o.id} daha kısa mat var',
        );
      }
      expect(SatrancVeri.oyunSonuGruplari, [
        'Vezir ve şah',
        'Kale ve şah',
        'İki kale',
      ]);
    });

    test('Solo: tek çözüm, çözüm dizisi tüm taşları alır', () {
      expect(SatrancVeri.soloBulmacalar.length, greaterThanOrEqualTo(5));
      for (final s in SatrancVeri.soloBulmacalar) {
        var o = SoloOyunu.baslat(s.fen);
        expect(SoloOyunu.cozumSayisi(o), 1, reason: '${s.id} tek çözümlü');
        final hedef = o.kalan;
        expect(s.cozum.length, hedef, reason: s.id);
        for (final u in s.cozum) {
          final h = o.hamleler.where((x) => x.uci == u);
          expect(h, isNotEmpty, reason: '${s.id}: $u taş almıyor');
          expect(h.first.alinan, isNotNull);
          expect(h.first.alinan!.toLowerCase(), isNot('k'));
          o = o.oyna(h.first);
        }
        expect(o.bitti, true, reason: s.id);
        expect(o.kilitli, false);
        // Siyah şah ve beyaz şah yerinde (hiç alınmadı).
        expect(o.konum.fen.split(' ').first.contains('k'), true);
      }
    });

    test('Solo: yanlış sıra çıkmaza götürür (kilitli)', () {
      final s = SatrancVeri.soloBulmacalar.first;
      final o = SoloOyunu.baslat(s.fen);
      // İlk hamleler arasında çözüm olmayan bir seçenek varsa kilitlenir.
      var kilitBulundu = false;
      for (final h in o.hamleler) {
        if (h.uci == s.cozum.first) continue;
        var x = o.oyna(h);
        for (var i = 0; i < 10 && !x.bitti && !x.kilitli; i++) {
          x = x.oyna(x.hamleler.first);
        }
        if (x.kilitli) kilitBulundu = true;
      }
      // En azından çözüm dışı yol, çözümü bitirmez.
      for (final h in o.hamleler) {
        if (h.uci == s.cozum.first) continue;
        expect(SoloOyunu.cozumSayisi(o.oyna(h)), 0, reason: h.uci);
      }
      expect(kilitBulundu || o.hamleler.length == 1, true);
    });

    test(
      'analiz: en iyi hamle yasal ve aramada tek en iyi; gerekçeler tam',
      () {
        expect(SatrancVeri.analizler.length, greaterThanOrEqualTo(5));
        final dogruIdx = <int>{};
        for (final a in SatrancVeri.analizler) {
          final k = Konum.fen(a.fen);
          expect(k.uciBul(a.enIyi), isNotNull, reason: a.id);
          final p = SatrancYZ.hamlePuanlari(k, derinlik: 4);
          expect(p.first.hamle.uci, a.enIyi, reason: a.id);
          expect(p.first.puan, greaterThan(p[1].puan), reason: '${a.id} tek');
          expect(a.gerekceler.length, 4, reason: a.id);
          expect(a.gerekceler.toSet().length, 4);
          expect(a.dogruGerekce, inInclusiveRange(0, 3));
          expect(a.cozum, isNotEmpty);
          dogruIdx.add(a.dogruGerekce);
        }
        // Doğru gerekçe hep aynı sırada olmasın.
        expect(dogruIdx.length, greaterThan(1));
      },
    );

    test('mini maç konumları geçerli; kullanıcı rengi sıra ile uyumlu', () {
      expect(SatrancVeri.miniMaclar.length, greaterThanOrEqualTo(4));
      final idler = [for (final m in SatrancVeri.miniMaclar) m.id];
      expect(idler.toSet().length, idler.length);
      for (final m in SatrancVeri.miniMaclar) {
        final k = Konum.fen(m.fen);
        expect(k.yasalHamleler, isNotEmpty, reason: m.id);
        // Oyuncu ilk hamleyi oynar (bilgisayar beklemez).
        expect(k.beyazSirada, m.kullaniciBeyaz, reason: m.id);
      }
    });
  });

  group('bilgisayar rakibi (MacDurumu, SatrancYZ)', () {
    test('mat tespiti ve sonuç oyuncu açısından', () {
      var k = Konum.fen(Konum.baslangicFen);
      final ucis = ['f2f3', 'e7e5', 'g2g4', 'd8h4'];
      final beyaz = MacDurumu.baslat(Konum.baslangicFen, kullaniciBeyaz: true);
      var m = beyaz;
      for (final u in ucis) {
        m = m.oyna(m.konum.uciBul(u)!);
        k = k.oyna(k.uciBul(u)!);
      }
      expect(m.sonuc?.sonuc, MacDurumu.yenildi);
      var s = MacDurumu.baslat(Konum.baslangicFen, kullaniciBeyaz: false);
      for (final u in ucis) {
        s = s.oyna(s.konum.uciBul(u)!);
      }
      expect(s.sonuc?.sonuc, MacDurumu.kazandi);
      expect(s.sonuc?.neden, contains('Mat'));
      expect(m.kullaniciHamleSayisi, 2);
    });

    test('pat, yetersiz materyal, üç tekrar, hamle sınırı', () {
      final pat = MacDurumu.baslat(
        '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
        kullaniciBeyaz: false,
      );
      expect(pat.sonuc?.sonuc, MacDurumu.berabere);
      final yetersiz = MacDurumu.baslat(
        '8/8/4k3/8/8/4K3/8/8 w - - 0 1',
        kullaniciBeyaz: true,
      );
      expect(yetersiz.sonuc?.sonuc, MacDurumu.berabere);
      expect(
        MacDurumu.materyalYetersiz(Konum.fen('8/8/4k3/8/8/4KN2/8/8 w - - 0 1')),
        true,
      );
      expect(
        MacDurumu.materyalYetersiz(Konum.fen('8/8/4k3/8/8/4KR2/8/8 w - - 0 1')),
        false,
      );
      var t = MacDurumu.baslat(Konum.baslangicFen, kullaniciBeyaz: true);
      for (var i = 0; i < 2; i++) {
        for (final u in ['g1f3', 'g8f6', 'f3g1', 'f6g8']) {
          expect(t.sonuc, isNull, reason: 'erken bitti');
          t = t.oyna(t.konum.uciBul(u)!);
        }
      }
      expect(t.sonuc?.sonuc, MacDurumu.berabere);
      expect(t.sonuc?.neden, contains('tekrar'));
      var l = MacDurumu.baslat(
        Konum.baslangicFen,
        kullaniciBeyaz: true,
        hamleSiniri: 2,
      );
      l = l.oyna(l.konum.uciBul('e2e4')!);
      expect(l.sonuc, isNull);
      l = l.oyna(l.konum.uciBul('e7e5')!);
      expect(l.sonuc?.neden, contains('sınır'));
    });

    test('bilgisayar matı kaçırmaz, hep yasal hamle verir', () {
      var m = MacDurumu.baslat(Konum.baslangicFen, kullaniciBeyaz: true);
      for (final u in ['f2f3', 'e7e5', 'g2g4']) {
        m = m.oyna(m.konum.uciBul(u)!);
      }
      final h = m.bilgisayarHamlesi();
      expect(h?.uci, 'd8h4');
      // Kullanıcı sırasındayken ya da oyun bittiyse null.
      expect(m.oyna(h!).bilgisayarHamlesi(), isNull);
      final b = MacDurumu.baslat(Konum.baslangicFen, kullaniciBeyaz: true);
      expect(b.bilgisayarHamlesi(), isNull);
    });

    test('bilgisayar ile 12 yarım hamlelik oyunlar kuraldışı hamle yapmaz', () {
      for (final mk in SatrancVeri.miniMaclar) {
        var m = MacDurumu.baslat(mk.fen, kullaniciBeyaz: mk.kullaniciBeyaz);
        for (var i = 0; i < 12 && m.sonuc == null; i++) {
          final h = m.kullaniciSirada
              ? SatrancYZ.enIyi(m.konum, derinlik: 1)
              : m.bilgisayarHamlesi();
          expect(h, isNotNull, reason: mk.id);
          expect(m.konum.yasalHamleler.any((y) => y.uci == h!.uci), true);
          m = m.oyna(h!);
        }
      }
    });

    test('derinlik-2 arama asılı vezir yemez, taş kazanır', () {
      // Vezir takası: beyaz vezir d4'teki siyah veziri alır.
      final k = Konum.fen('4k3/8/8/8/3q4/8/8/3QK3 w - - 0 1');
      expect(SatrancYZ.enIyi(k)?.uci, 'd1d4');
      // Sakin aramanın faydası: korunan piyonu vezirle alma (kayıp).
      final k2 = Konum.fen('4k3/4p3/3p4/8/8/8/8/3QK3 w - - 0 1');
      final p = SatrancYZ.hamlePuanlari(k2);
      expect(p.first.hamle.uci, isNot('d1d6'));
    });

    test('puanMetni: piyon ve mat gösterimi', () {
      expect(SatrancYZ.puanMetni(130), '+1,3');
      expect(SatrancYZ.puanMetni(-50), '-0,5');
      expect(SatrancYZ.puanMetni(SatrancYZ.mat - 3), '+M2');
      expect(SatrancYZ.puanMetni(-(SatrancYZ.mat - 1)), '-M1');
    });
  });

  group('oyun sonu incelemesi', () {
    test('adımlar: Türkçe SAN, taraf, maddi eğri; bozuk hamlede durur', () {
      final a = MacIncelemesi.adimlar(Konum.baslangicFen, [
        'e2e4',
        'e7e5',
        'g1f3',
        'b8c6',
        'f1b5',
      ], true);
      expect([for (final x in a) x.san], ['e4', 'e5', 'Af3', 'Ac6', 'Fb5']);
      expect([for (final x in a) x.etiket].first, '1. e4');
      expect(a[1].etiket, '1... e5');
      expect(a.map((x) => x.kullanici), [true, false, true, false, true]);
      expect(a.every((x) => x.maddi == 0), true);
      final bozuk = MacIncelemesi.adimlar(Konum.baslangicFen, [
        'e2e4',
        'e2e4',
        'e7e5',
      ], true);
      expect(bozuk.length, 1);
      expect(MacIncelemesi.adimlar('geçersiz', ['e2e4'], true), isEmpty);
    });

    test('değerlendirme: en iyi hamle iyi, vezir bırakmak büyük hata', () {
      final k = Konum.fen('4k3/8/8/8/3q4/8/8/3QK3 w - - 0 1');
      final iyi = MacIncelemesi.degerlendir(k, 'd1d4');
      expect(iyi.kayip, 0);
      expect(iyi.etiket, anyOf('İyi hamle', 'Mat!'));
      final hata = MacIncelemesi.degerlendir(k, 'e1f1');
      expect(hata.etiket, 'Büyük hata');
      expect(hata.oneri, 'Vxd4');
      expect(hata.kayip, greaterThan(300));
      final mat = MacIncelemesi.degerlendir(
        Konum.fen('6k1/5ppp/8/8/8/2Q5/6PP/6K1 w - - 0 1'),
        'c3c8',
      );
      expect(mat.etiket, 'Mat!');
    });
  });

  group('koordinat antrenörü', () {
    test('dizi kararlı, art arda aynı kare yok, 0..63', () {
      final a = KoordinatAntrenoru.dizi(7);
      expect(a, KoordinatAntrenoru.dizi(7));
      expect(a, isNot(KoordinatAntrenoru.dizi(8)));
      expect(a.length, 120);
      expect(a.every((k) => k >= 0 && k < 64), true);
      for (var i = 1; i < a.length; i++) {
        expect(a[i], isNot(a[i - 1]));
      }
      expect(KoordinatAntrenoru.sure, 30);
    });

    test('yazım denetimi büyük/küçük harf ve boşluğu yok sayar', () {
      expect(KoordinatAntrenoru.yazimDogru(' E4 ', 28), true);
      expect(KoordinatAntrenoru.yazimDogru('e5', 28), false);
      expect(KoordinatAntrenoru.yazimDogru('', 28), false);
    });
  });

  group('durum: eski kayıt uyumu ve sınırlar', () {
    test('eski kayıtta satranc alanı yoksa boş durum', () {
      final eski = const OgrenciDurumu(xp: 5).toJson()..remove('satranc');
      final d = OgrenciDurumu.fromJson(jsonDecode(jsonEncode(eski)));
      expect(d.xp, 5);
      expect(d.satranc.oynananMac, 0);
      expect(d.satranc.cozulenBulmacalar, isEmpty);
      expect(d.satranc.tekrarKartlari, isEmpty);
      expect(d.satranc.sonMac, isNull);
      expect(OgrenciDurumu.fromJson(null).satranc.gunlukBulmaca, isEmpty);
    });

    test('gidiş-dönüş: bütün satranç alanları korunur', () {
      final mac = SatrancMaci(
        konumId: 'italyan',
        fen: Konum.baslangicFen,
        hamleler: const ['e2e4', 'e7e5'],
        sonuc: SatrancMaci.kazandi,
        gun: '2026-10-15',
        kullaniciBeyaz: false,
      );
      final s = SatrancDurumu(
        gunlukBulmaca: const {'2026-10-14': true, '2026-10-15': false},
        cozulenBulmacalar: const {'catal-1', 'sis-2'},
        tekrarKartlari: const {
          'b:catal-2': Kart(kutu: 1, sonraki: '2026-10-16', yariOmurGun: 0.5),
          'u:satranc-1-u1-d1': Kart(
            kutu: 2,
            sonraki: '2026-10-20',
            yariOmurGun: 2,
          ),
        },
        macSayilari: const {'kazandi': 2, 'berabere': 1},
        sonMac: mac,
        koordinatEnIyi: const {'dokun': 12, 'yaz': 5},
        oyunSonuEnIyi: const {'vezir-1': 4},
        oyunSonuPratik: const {'kale-1'},
        soloCozulen: const {'solo-1'},
        analizler: const {'analiz-1': 3},
        dersMeydan: const {'satranc-1-u1-d1': 2},
      );
      final d = OgrenciDurumu(satranc: s);
      final r = OgrenciDurumu.fromJson(jsonDecode(jsonEncode(d.toJson())));
      expect(jsonEncode(r.toJson()), jsonEncode(d.toJson()));
      expect(r.satranc.sonMac?.hamleler, ['e2e4', 'e7e5']);
      expect(r.satranc.sonMac?.kullaniciBeyaz, false);
      expect(r.satranc.tekrarKartlari['b:catal-2']?.yariOmurGun, 0.5);
      expect(r.satranc.oynananMac, 3);
    });

    test('bozuk girdiler sessizce atlanır, asla fırlatmaz', () {
      final j = {
        'satranc': {
          'gunlukBulmaca': {
            '2026-10-14': true,
            'bozuk': true,
            '2026-10-13': 'evet',
          },
          'cozulenBulmacalar': ['catal-1', 5, '', 'a b', null],
          'tekrarKartlari': {
            'b:catal-1': {'kutu': 1, 'sonraki': '2026-10-16'},
            'b:bozuk': {'kutu': 9, 'sonraki': '2026-10-16'},
            'z:yabanci': {'kutu': 1, 'sonraki': '2026-10-16'},
            'ders#0': {'kutu': 1, 'sonraki': '2026-10-16'},
          },
          'macSayilari': {'kazandi': -1, 'yenildi': 3, 'diger': 4},
          'sonMac': {
            'konumId': 'x',
            'fen': 'f',
            'hamleler': ['zzzz'],
          },
          'koordinatEnIyi': {'dokun': 5, 'baska': 9, 'yaz': 'x'},
          'analizler': {'analiz-1': 9, 'analiz-2': 2},
          'dersMeydan': {'satranc-1-u1-d1': 99, 'd': 2},
        },
      };
      final s = OgrenciDurumu.fromJson(j).satranc;
      expect(s.gunlukBulmaca, {'2026-10-14': true});
      expect(s.cozulenBulmacalar, {'catal-1'});
      expect(s.tekrarKartlari.keys, ['b:catal-1']);
      expect(s.macSayilari, {'yenildi': 3});
      expect(s.sonMac, isNull);
      expect(s.koordinatEnIyi, {'dokun': 5});
      expect(s.analizler, {'analiz-2': 2});
      expect(s.dersMeydan, {'d': 2});
      // Tür bozuk: tamamı boş durum.
      expect(OgrenciDurumu.fromJson({'satranc': 5}).satranc.oynananMac, 0);
      expect(
        OgrenciDurumu.fromJson({'satranc': []}).satranc.cozulenBulmacalar,
        isEmpty,
      );
    });

    test('günlük kayıt sınırı: en yeni 400 gün korunur', () {
      final gunler = {
        for (var i = 0; i < 450; i++)
          DateTime.utc(
            2025,
            1,
            1,
          ).add(Duration(days: i)).toIso8601String().substring(0, 10): true,
      };
      final s = SatrancDurumu.fromJson({'gunlukBulmaca': gunler});
      expect(s.gunlukBulmaca.length, SatrancDurumu.gunlukEnCok);
      final sirali = s.gunlukBulmaca.keys.toList()..sort();
      expect(sirali.last, gunler.keys.toList().last);
    });

    test('mac: 300 hamleden uzun kayıt reddedilir', () {
      final uzun = List.filled(SatrancMaci.enCokHamle + 1, 'e2e4');
      expect(
        SatrancMaci.fromJson({
          'konumId': 'x',
          'fen': Konum.baslangicFen,
          'hamleler': uzun,
          'sonuc': 'kazandi',
          'gun': '2026-10-15',
        }),
        isNull,
      );
    });
  });

  group('SatrancCalisma: günlük bulmaca ve tekrar destesi', () {
    const g0 = '2026-10-15';

    test('günlük bulmaca tarihe göre deterministik ve değişken', () {
      expect(
        SatrancCalisma.gunlukBulmaca(g0).id,
        SatrancCalisma.gunlukBulmaca(g0).id,
      );
      final idler = {
        for (var i = 0; i < 40; i++)
          SatrancCalisma.gunlukBulmaca(
            DateTime.utc(
              2026,
              10,
              1,
            ).add(Duration(days: i)).toIso8601String().substring(0, 10),
          ).id,
      };
      expect(idler.length, greaterThanOrEqualTo(10));
      expect(SatrancCalisma.tohum('a'), SatrancCalisma.tohum('a'));
    });

    test('günlük: yalnız ilk sonuç sayılır, yanlış desteye girer', () {
      final b = SatrancCalisma.gunlukBulmaca(g0);
      var d = const OgrenciDurumu();
      expect(SatrancCalisma.gunlukSonuc(d, g0), isNull);
      d = SatrancCalisma.gunlukBitir(d, g0, false);
      expect(SatrancCalisma.gunlukSonuc(d, g0), false);
      expect(d.satranc.tekrarKartlari.keys, ['b:${b.id}']);
      expect(d.satranc.cozulenBulmacalar, isEmpty);
      // İkinci (doğru) sonuç durumu değiştirmez.
      final d2 = SatrancCalisma.gunlukBitir(d, g0, true);
      expect(identical(d2, d), true);
      // Doğru ilk sonuç: kart yok, çözüldü işaretli.
      final dd = SatrancCalisma.gunlukBitir(const OgrenciDurumu(), g0, true);
      expect(dd.satranc.tekrarKartlari, isEmpty);
      expect(dd.satranc.cozulenBulmacalar, {b.id});
      // Geçersiz gün yok sayılır.
      expect(identical(SatrancCalisma.gunlukBitir(d, 'bozuk', true), d), true);
    });

    test('yanlış bulmaca: ertesi gün vadeli; doğrular yarı ömrü ikiler', () {
      var d = const OgrenciDurumu();
      d = SatrancCalisma.bulmacaSonucu(d, 'catal-1', false, g0);
      var kart = d.satranc.tekrarKartlari['b:catal-1']!;
      expect(kart.yariOmurGun, 0.5);
      expect(kart.sonraki, '2026-10-16');
      expect(SatrancCalisma.bekleyenBulmacalar(d, g0), isEmpty);
      expect(SatrancCalisma.bekleyenBulmacalar(d, '2026-10-16'), ['catal-1']);
      expect(SatrancCalisma.desteBulmacaSayisi(d), 1);
      // Doğru: 0,5 -> 1 -> 2 -> 4 -> 8 -> 16 (öğrenildi, desteden çıkar).
      final beklenen = [1.0, 2.0, 4.0, 8.0];
      var gun = '2026-10-16';
      for (final b in beklenen) {
        d = SatrancCalisma.bulmacaSonucu(d, 'catal-1', true, gun);
        kart = d.satranc.tekrarKartlari['b:catal-1']!;
        expect(kart.yariOmurGun, b);
        gun = kart.sonraki;
      }
      expect(d.satranc.cozulenBulmacalar, contains('catal-1'));
      d = SatrancCalisma.bulmacaSonucu(d, 'catal-1', true, gun);
      expect(d.satranc.tekrarKartlari, isEmpty);
      // Yanlış, yarı ömrü yarıya indirir.
      d = SatrancCalisma.bulmacaSonucu(d, 'sis-1', false, g0);
      d = SatrancCalisma.bulmacaSonucu(d, 'sis-1', true, '2026-10-16');
      d = SatrancCalisma.bulmacaSonucu(d, 'sis-1', false, '2026-10-17');
      expect(d.satranc.tekrarKartlari['b:sis-1']!.yariOmurGun, 0.5);
    });

    test('tekrar destesi ders kartlarını ve diğer durumu DEĞİŞTİRMEZ', () {
      final ders = {
        'satranc-1-u1-d1#0': const Kart(
          kutu: 3,
          sonraki: '2026-10-20',
          yariOmurGun: 5,
        ),
      };
      final d0 = OgrenciDurumu(
        xp: 40,
        seri: 3,
        kartlar: ders,
        hatalar: const [],
      );
      var d = d0;
      d = SatrancCalisma.bulmacaSonucu(d, 'catal-1', false, g0);
      d = SatrancCalisma.gunlukBitir(d, g0, false);
      d = SatrancCalisma.dersMeydanBitir(d, 'satranc-1-u1-d1', 1, 3, g0);
      d = SatrancCalisma.ustalikSonucu(d, 'satranc-1-u1-d1', true, g0);
      d = SatrancCalisma.macBitir(
        d,
        const SatrancMaci(
          konumId: 'x',
          fen: Konum.baslangicFen,
          hamleler: [],
          sonuc: SatrancMaci.berabere,
          gun: g0,
        ),
      );
      final a = d.toJson()..remove('satranc');
      final b = d0.toJson()..remove('satranc');
      expect(jsonEncode(a), jsonEncode(b));
      expect(d.kartlar, same(ders));
      expect(Motor.tekrarBekleyen(d, '2030-01-01'), ['satranc-1-u1-d1#0']);
    });

    test('aralık kuralı Motor.kartIsle ile birebir aynı', () {
      var s = const OgrenciDurumu();
      var m = const OgrenciDurumu();
      final cevaplar = [false, true, true, false, true, true, true];
      var gun = g0;
      for (final c in cevaplar) {
        s = SatrancCalisma.bulmacaSonucu(s, 'sis-3', c, gun);
        m = Motor.kartIsle(m, 'x#0', c, gun);
        final ks = s.satranc.tekrarKartlari['b:sis-3'];
        final km = m.kartlar['x#0']!;
        if (ks == null) break; // öğrenildi, desteden çıktı
        expect(ks.yariOmurGun, km.yariOmurGun);
        expect(ks.sonraki, km.sonraki);
        expect(ks.kutu, km.kutu);
        gun = ks.sonraki;
      }
    });

    test('bilinmeyen bulmaca kimliği yok sayılır', () {
      const d = OgrenciDurumu();
      expect(
        identical(SatrancCalisma.bulmacaSonucu(d, 'yok-1', false, g0), d),
        true,
      );
    });
  });

  group('SatrancCalisma: mini maç, oyun sonu, koordinat, Solo, analiz', () {
    const g0 = '2026-10-15';

    test('maç bitişi sayaç ve son oyunu yazar; bozuk sonuç yok sayılır', () {
      var d = const OgrenciDurumu();
      d = SatrancCalisma.macBitir(
        d,
        const SatrancMaci(
          konumId: 'italyan',
          fen: Konum.baslangicFen,
          hamleler: ['e2e4'],
          sonuc: SatrancMaci.kazandi,
          gun: g0,
        ),
      );
      d = SatrancCalisma.macBitir(
        d,
        const SatrancMaci(
          konumId: 'italyan',
          fen: Konum.baslangicFen,
          hamleler: ['e2e4', 'e7e5'],
          sonuc: SatrancMaci.yenildi,
          gun: g0,
        ),
      );
      expect(d.satranc.macSayilari, {'kazandi': 1, 'yenildi': 1});
      expect(d.satranc.oynananMac, 2);
      expect(d.satranc.sonMac?.hamleler.length, 2);
      final bozuk = SatrancCalisma.macBitir(
        d,
        const SatrancMaci(
          konumId: 'x',
          fen: 'f',
          hamleler: [],
          sonuc: 'x',
          gun: g0,
        ),
      );
      expect(identical(bozuk, d), true);
    });

    test('oyun sonu: yıldız eşikleri, en az hamle yalnız iyileşir', () {
      expect(SatrancCalisma.yildiz(3, 3), 3);
      expect(SatrancCalisma.yildiz(3, 2), 3);
      expect(SatrancCalisma.yildiz(3, 4), 2);
      expect(SatrancCalisma.yildiz(3, 5), 2);
      expect(SatrancCalisma.yildiz(3, 6), 1);
      var d = const OgrenciDurumu();
      d = SatrancCalisma.oyunSonuMeydanBitir(d, 'vezir-1', 5);
      d = SatrancCalisma.oyunSonuMeydanBitir(d, 'vezir-1', 7);
      expect(d.satranc.oyunSonuEnIyi['vezir-1'], 5);
      d = SatrancCalisma.oyunSonuMeydanBitir(d, 'vezir-1', 3);
      expect(d.satranc.oyunSonuEnIyi['vezir-1'], 3);
      // Geçersiz kimlik ve hamle.
      expect(
        identical(SatrancCalisma.oyunSonuMeydanBitir(d, 'yok', 3), d),
        true,
      );
      expect(
        identical(SatrancCalisma.oyunSonuMeydanBitir(d, 'vezir-1', 0), d),
        true,
      );
      d = SatrancCalisma.oyunSonuPratikBitir(d, 'kale-1');
      expect(d.satranc.oyunSonuPratik, {'kale-1'});
      expect(
        identical(SatrancCalisma.oyunSonuPratikBitir(d, 'kale-1'), d),
        true,
      );
    });

    test('koordinat: yalnız daha iyi skor; geçersiz mod yok sayılır', () {
      var d = const OgrenciDurumu();
      d = SatrancCalisma.koordinatBitir(d, 'dokun', 10);
      d = SatrancCalisma.koordinatBitir(d, 'dokun', 8);
      d = SatrancCalisma.koordinatBitir(d, 'yaz', 4);
      expect(d.satranc.koordinatEnIyi, {'dokun': 10, 'yaz': 4});
      d = SatrancCalisma.koordinatBitir(d, 'dokun', 11);
      expect(d.satranc.koordinatEnIyi['dokun'], 11);
      expect(identical(SatrancCalisma.koordinatBitir(d, 'x', 50), d), true);
      expect(identical(SatrancCalisma.koordinatBitir(d, 'yaz', -1), d), true);
    });

    test('Solo ve analiz kayıtları', () {
      var d = const OgrenciDurumu();
      d = SatrancCalisma.soloBitir(d, 'solo-1');
      expect(d.satranc.soloCozulen, {'solo-1'});
      expect(identical(SatrancCalisma.soloBitir(d, 'solo-1'), d), true);
      expect(identical(SatrancCalisma.soloBitir(d, 'yok'), d), true);
      d = SatrancCalisma.analizBitir(d, 'analiz-1', true, false);
      expect(d.satranc.analizler['analiz-1'], 1);
      d = SatrancCalisma.analizBitir(d, 'analiz-1', false, true);
      expect(d.satranc.analizler['analiz-1'], 3);
      expect(
        identical(SatrancCalisma.analizBitir(d, 'analiz-1', true, true), d),
        true,
      );
      expect(
        identical(SatrancCalisma.analizBitir(d, 'yok', true, true), d),
        true,
      );
      expect(SatrancCalisma.analizBitleri(true, true), 3);
      expect(SatrancCalisma.analizBitleri(false, false), 0);
    });
  });

  group('ders sonu meydan okuması ve ustalık kursu', () {
    const g0 = '2026-10-15';
    final ders = satranc1.dersBul('satranc-1-u1-d1')!;

    test(
      'dersKonumlari: en çok 3 Hamle, sondan; her satranç dersi en az 1',
      () {
        final k = SatrancCalisma.dersKonumlari(ders);
        expect(k.length, inInclusiveRange(1, 3));
        final hamleler = [
          for (var i = 0; i < ders.alistirmalar.length; i++)
            if (ders.alistirmalar[i] is Hamle) i,
        ];
        expect([
          for (final x in k) x.indeks,
        ], hamleler.skip(hamleler.length - k.length));
        // Üç satranç kursunun bütün dersleri bir tahta konumu içerir.
        for (final kurs in tumKurslar.where((c) => c.alan == KursAlani.oyun)) {
          for (final d in kurs.tumDersler) {
            expect(
              SatrancCalisma.dersKonumlari(d),
              isNotEmpty,
              reason: '${d.id} tahta konumu yok',
            );
          }
        }
      },
    );

    test('dersMeydanVar yalnız oyun alanı derslerinde', () {
      expect(SatrancCalisma.dersMeydanVar(tumKurslar, 'satranc-1-u1-d1'), true);
      expect(
        SatrancCalisma.dersMeydanVar(tumKurslar, 'ingilizce-a1-u1-d1'),
        false,
      );
      expect(SatrancCalisma.dersMeydanVar(tumKurslar, 'yok'), false);
    });

    test('meydan okuma: en iyi korunur, ustalık kartı yarı ömürle yazılır', () {
      var d = const OgrenciDurumu();
      d = SatrancCalisma.dersMeydanBitir(d, ders.id, 3, 3, g0);
      var kart = d.satranc.tekrarKartlari['u:${ders.id}']!;
      expect(kart.yariOmurGun, 2.0);
      expect(kart.sonraki, '2026-10-17');
      expect(d.satranc.dersMeydan[ders.id], 3);
      d = SatrancCalisma.dersMeydanBitir(d, ders.id, 1, 3, '2026-10-17');
      kart = d.satranc.tekrarKartlari['u:${ders.id}']!;
      expect(kart.yariOmurGun, 1.0);
      expect(d.satranc.dersMeydan[ders.id], 3, reason: 'düşmez');
      expect(
        identical(SatrancCalisma.dersMeydanBitir(d, 'a b', 1, 3, g0), d),
        true,
      );
      expect(
        identical(SatrancCalisma.dersMeydanBitir(d, ders.id, 1, 0, g0), d),
        true,
      );
    });

    test('ustalık: bitirilen dersler yeni, kart vadesi gelince yeniden', () {
      final kurslar = [satranc1];
      var d = const OgrenciDurumu(
        alan: 'oyun',
        tamamlanan: {'satranc-1-u1-d1': 1, 'satranc-1-u1-d2': 2},
      );
      var l = SatrancCalisma.ustalikDersleri(d, kurslar, g0);
      expect(
        [for (final u in l) u.ders.id],
        ['satranc-1-u1-d1', 'satranc-1-u1-d2'],
      );
      expect(l.every((u) => u.yeni), true);
      // Bitirilmemiş ders listelenmez.
      expect(
        SatrancCalisma.ustalikDersleri(const OgrenciDurumu(), kurslar, g0),
        isEmpty,
      );
      // Cevap: doğru -> 2 gün sonra; arada listede yok.
      d = SatrancCalisma.ustalikSonucu(d, 'satranc-1-u1-d1', true, g0);
      l = SatrancCalisma.ustalikDersleri(d, kurslar, g0);
      expect([for (final u in l) u.ders.id], ['satranc-1-u1-d2']);
      l = SatrancCalisma.ustalikDersleri(d, kurslar, '2026-10-16');
      expect([for (final u in l) u.ders.id], ['satranc-1-u1-d2']);
      l = SatrancCalisma.ustalikDersleri(d, kurslar, '2026-10-17');
      expect(
        [for (final u in l) u.ders.id],
        ['satranc-1-u1-d1', 'satranc-1-u1-d2'],
      );
      expect(l.first.yeni, false);
      // Yanlış cevap aralığı kısaltır (2 -> 1 gün).
      d = SatrancCalisma.ustalikSonucu(
        d,
        'satranc-1-u1-d1',
        false,
        '2026-10-17',
      );
      expect(d.satranc.tekrarKartlari['u:satranc-1-u1-d1']!.yariOmurGun, 1.0);
      expect(
        d.satranc.tekrarKartlari['u:satranc-1-u1-d1']!.sonraki,
        '2026-10-18',
      );
    });

    test('ustalık konumu: derse ait, güne göre kararlı', () {
      final a = SatrancCalisma.ustalikKonumu(ders, g0);
      expect(
        SatrancCalisma.dersKonumlari(ders).map((k) => k.indeks),
        contains(a.indeks),
      );
      expect(SatrancCalisma.ustalikKonumu(ders, g0).indeks, a.indeks);
    });
  });
}
