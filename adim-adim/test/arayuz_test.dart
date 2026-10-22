/// Arayüz testleri: gezinme, Yol, Tekrar, Profil, Ayarlar ve düzen akışları;
/// hata defteri bölümü, haftalık hedef satırı ve ayarı, karışık tekrar önerisi.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden kod
/// değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// Ortak yardımcılar test/arayuz_yardimci.dart içindedir.
library;

import 'package:adim_adim/bilesenler/alistirma_oturumu.dart';
import 'package:adim_adim/bilesenler/profil_karti.dart';
import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/durum/saglayicilar.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/model/icerik.dart';
import 'package:adim_adim/tema/kategori_renkleri.dart';
import 'package:adim_adim/yarisma/model.dart';
import 'package:adim_adim/yarisma/soru_bankasi.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';
import 'sahte_icerik.dart';

/// Profil sekmesine geçip sağ üstteki dişliyle Ayarlar'ı açar.
Future<void> ayarlariAc(WidgetTester tester) async {
  await dokun(
    tester,
    find.descendant(
      of: find.byType(NavigationBar),
      matching: find.text('Profil'),
    ),
  );
  await dokun(tester, find.byTooltip('Ayarlar'));
}

Future<void> kontrolEtDogru(WidgetTester tester, {bool son = false}) async {
  await dokun(tester, find.text('Kontrol et'));
  expect(find.text('Doğru!'), findsOneWidget);
  await dokun(tester, find.text(son ? 'Bitir' : 'Devam'));
}

void main() {
  testWidgets('ders akışı: doğru cevaplar -> geri bildirim -> özet', (
    tester,
  ) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    final ses = SahteSes();
    final kap = await uygulamayiAc(tester, depo, ses: ses);

    expect(find.text('Sahte Ünite'), findsOneWidget);
    expect(find.textContaining('Sıradaki ders'), findsOneWidget);
    expect(find.textContaining('Kilitli'), findsOneWidget);

    await dokun(tester, find.textContaining('Ders Bir'));

    // Secim
    await dokun(tester, find.text('dört'));
    await kontrolEtDogru(tester);
    // Bosluk
    await dokun(tester, find.text('am'));
    await kontrolEtDogru(tester);
    // Yaz
    await tester.enterText(find.byType(TextField), '  Hello! ');
    await tester.pump();
    await kontrolEtDogru(tester);
    // Sirala
    for (final k in ['I', 'am', 'happy']) {
      await dokun(tester, find.text(k));
    }
    await kontrolEtDogru(tester);
    // Eslestir
    for (final c in [('cat', 'kedi'), ('dog', 'köpek'), ('bird', 'kuş')]) {
      await dokun(tester, find.text(c.$1));
      await dokun(tester, find.text(c.$2));
    }
    await kontrolEtDogru(tester);
    // Dinle
    await dokun(tester, find.byIcon(Icons.volume_up));
    expect(ses.okunanlar, ['Good morning']);
    await dokun(tester, find.text('Good morning'));
    await kontrolEtDogru(tester);
    // Kod
    await dokun(tester, find.text('Merhaba'));
    await kontrolEtDogru(tester, son: true);

    expect(find.text('Ders tamamlandı'), findsOneWidget);
    expect(find.text('7/7'), findsOneWidget);
    expect(find.text('+29'), findsOneWidget); // 10 + 7*2 + 5 tam puan

    final d = kap.read(durumProvider).value!;
    expect(d.xp, 29);
    expect(d.seri, 1);
    expect(d.tamamlanan[sahteDers1], 1);
    expect(d.kartlar.length, 7);
    expect((await depo.yukle()).xp, 29);

    await dokun(tester, find.text('Yola dön'));
    expect(find.textContaining('Tamamlandı'), findsOneWidget);
  });

  testWidgets('yanlış cevap: hata bandı, doğru cevap ve açıklama gösterilir', (
    tester,
  ) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    await uygulamayiAc(tester, depo);
    await dokun(tester, find.textContaining('Ders Bir'));
    await dokun(tester, find.text('beş'));
    await dokun(tester, find.text('Kontrol et'));
    expect(find.text('Yanlış'), findsOneWidget);
    expect(find.textContaining('Doğru cevap: dört'), findsOneWidget);
    expect(find.byIcon(Icons.cancel), findsWidgets);
  });

  testWidgets('ayar değişikliği kalıcı olur ve sıfırlama onay ister', (
    tester,
  ) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    final bildirim = SahteBildirim();
    await uygulamayiAc(tester, depo, bildirim: bildirim);

    await ayarlariAc(tester);
    await dokun(tester, find.text('Koyu'));
    expect((await depo.yukle()).koyuTema, true);

    await dokun(tester, find.byType(SwitchListTile).first);
    expect((await depo.yukle()).sesAcik, false);

    await dokun(
      tester,
      find.widgetWithText(SwitchListTile, 'Günlük hatırlatma'),
    );
    expect((await depo.yukle()).hatirlatmaSaati, '20:00');
    expect(bildirim.cagrilar, ['kur:20:00']);

    // Sıfırla: önce vazgeç, sonra onayla.
    await dokun(tester, find.text('Verileri sıfırla'));
    expect(find.text('Tüm veriler silinsin mi?'), findsOneWidget);
    await dokun(tester, find.text('Vazgeç'));
    expect((await depo.yukle()).koyuTema, true);

    await dokun(tester, find.text('Verileri sıfırla'));
    await dokun(tester, find.text('Sıfırla'));
    final sifir = await depo.yukle();
    expect(sifir.koyuTema, isNull);
    expect(sifir.sesAcik, true);
  });

  testWidgets('geniş ekranda iki sütun: yol + profil kartı, yan ray', (
    tester,
  ) async {
    await uygulamayiAc(tester, null, boyut: const Size(1200, 900));
    expect(find.byType(NavigationRail), findsOneWidget);
    expect(
      tester.widget<NavigationRail>(find.byType(NavigationRail)).destinations,
      hasLength(5),
    );
    expect(find.byType(NavigationBar), findsNothing);
    expect(find.byType(ProfilKarti), findsOneWidget);
    expect(find.text('Sahte Ünite'), findsOneWidget);
  });

  testWidgets('dar ekranda alt gezinme çubuğu', (tester) async {
    await uygulamayiAc(tester, null, boyut: const Size(400, 800));
    expect(find.byType(NavigationBar), findsOneWidget);
    expect(find.byType(NavigationRail), findsNothing);
    expect(find.byType(ProfilKarti), findsNothing);
  });

  testWidgets('seri kopmuşsa ekranda 0 görünür', (tester) async {
    final depo = BellekDepo(
      const OgrenciDurumu(
        xp: 50,
        seri: 5,
        enSeri: 5,
        sonGun: '2026-10-01',
        alan: 'dil',
      ),
    );
    await uygulamayiAc(tester, depo, boyut: const Size(1200, 900));
    expect(find.text('0 gün seri'), findsWidgets);
    expect(find.text('5 gün seri'), findsNothing);
  });

  testWidgets('bildirim izni reddedilince anahtar kapanır ve uyarı çıkar', (
    tester,
  ) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    final bildirim = SahteBildirim()..izin = false;
    await uygulamayiAc(tester, depo, bildirim: bildirim);
    await ayarlariAc(tester);
    await dokun(
      tester,
      find.widgetWithText(SwitchListTile, 'Günlük hatırlatma'),
    );
    expect(find.text('Bildirim izni verilmedi'), findsOneWidget);
    expect((await depo.yukle()).hatirlatmaSaati, isNull);
    expect(
      tester
          .widget<SwitchListTile>(
            find.widgetWithText(SwitchListTile, 'Günlük hatırlatma'),
          )
          .value,
      false,
    );
  });

  testWidgets('alan seçilmemişse Alan seç ekranı açılır; Programlama yalnız '
      'kod kurslarını listeler', (tester) async {
    final kap = await uygulamayiAc(
      tester,
      BellekDepo(),
      kurslar: [sahteKurs, sahteKodKurs],
    );
    expect(find.text('Ne öğrenmek istiyorsun?'), findsOneWidget);
    expect(find.text('İngilizce'), findsOneWidget);
    expect(find.byType(NavigationBar), findsNothing);

    await dokun(tester, find.text('Programlama'));
    expect(kap.read(durumProvider).value!.alan, 'kod');
    // İlk açılış akışı (Özellik 28): hedef ve hatırlatma adımları atlanır,
    // "Başla" ile yola geçilir (ayrıntı: ilk_acilis_arayuz_test.dart).
    await dokun(tester, find.text('Atla'));
    await dokun(tester, find.text('Şimdi değil'));
    await dokun(tester, find.text('Başla'));
    expect(find.text('Sahte Kod Kursu'), findsOneWidget);
    expect(find.text('Sahte Kurs'), findsNothing);
    expect(find.byType(NavigationBar), findsOneWidget);
  });

  testWidgets('dil alanında kod kursu adı görünmez', (tester) async {
    await uygulamayiAc(tester, null, kurslar: [sahteKurs, sahteKodKurs]);
    expect(find.text('Sahte Kurs'), findsOneWidget);
    expect(find.text('Sahte Kod Kursu'), findsNothing);
  });

  testWidgets('2 dakikalık ders: özet, XP artar, tamamlanan değişmez', (
    tester,
  ) async {
    final mikroKurs = Kurs(
      id: 'mikro-1',
      ad: 'Mikro Kurs',
      aciklama: 'Yalnız seçim sorulu kurs.',
      alan: KursAlani.dil,
      uniteler: [
        Unite(
          id: 'mikro-1.u1',
          ad: 'Mikro Ünite',
          dersler: [
            Ders(
              id: 'mikro-1.u1.d1',
              ad: 'Mikro Ders',
              alistirmalar: [
                for (var i = 0; i < 5; i++)
                  Secim(
                    soru: 'Soru $i',
                    secenekler: ['yanlış$i', 'doğru$i'],
                    dogru: 1,
                  ),
              ],
            ),
          ],
        ),
      ],
    );
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    final kap = await uygulamayiAc(tester, depo, kurslar: [mikroKurs]);

    await dokun(tester, find.text('2 dakikalık ders'));
    final dogruSik = find.byWidgetPredicate(
      (w) => w is Text && RegExp(r'^doğru\d$').hasMatch(w.data ?? ''),
    );
    for (var i = 0; i < 5; i++) {
      await dokun(tester, dogruSik);
      await kontrolEtDogru(tester, son: i == 4);
    }

    expect(find.text('Mikro ders tamamlandı'), findsOneWidget);
    expect(find.text('+18'), findsOneWidget); // 5 + 5*2 + 3 tam puan
    final d = kap.read(durumProvider).value!;
    expect(d.xp, 18);
    expect(d.tamamlanan, isEmpty);
    expect(d.kartlar.length, 5);

    await dokun(tester, find.text('Yola dön'));
    expect(find.textContaining('Mikro Ders'), findsOneWidget);
  });

  testWidgets('alt çubukta 5 hedef var, Ayarlar sekmesi yok', (tester) async {
    await uygulamayiAc(tester, null, boyut: const Size(400, 800));
    final cubuk = find.byType(NavigationBar);
    expect(find.byType(NavigationDestination), findsNWidgets(5));
    for (final ad in ['Yol', 'Pratik', 'Yarışma', 'Görevler', 'Profil']) {
      expect(
        find.descendant(of: cubuk, matching: find.text(ad)),
        findsOneWidget,
      );
    }
    expect(
      find.descendant(of: cubuk, matching: find.text('Ayarlar')),
      findsNothing,
    );
  });

  testWidgets('Tekrar sekmesi rozeti yalnız alan kurslarının bekleyen '
      'kartlarını sayar', (tester) async {
    const gecmis = Kart(kutu: 1, sonraki: '2026-10-14');
    final depo = BellekDepo(
      OgrenciDurumu(
        alan: 'dil',
        kartlar: {
          '$sahteDers1#0': gecmis,
          '$sahteDers1#1': gecmis,
          '$sahteKodDers1#0': gecmis, // kod alanı: sayılmaz
          'yok.ders#0': gecmis, // çözülemeyen kart: sayılmaz
          '$sahteDers2#0': const Kart(kutu: 2, sonraki: '2026-10-20'),
        },
      ),
    );
    await uygulamayiAc(
      tester,
      depo,
      boyut: const Size(400, 800),
      kurslar: [sahteKurs, sahteKodKurs],
    );
    final rozet = find.byType(Badge);
    expect(rozet, findsOneWidget);
    expect(
      find.descendant(of: rozet, matching: find.text('2')),
      findsOneWidget,
    );
  });

  testWidgets('bekleyen kart yoksa Tekrar rozeti görünmez', (tester) async {
    await uygulamayiAc(tester, null, boyut: const Size(400, 800));
    expect(find.byType(Badge), findsNothing);
  });

  // --- Öğrenme motoru: hata defteri, haftalık hedef, karışık tekrar ---

  Future<void> tekrarSekmesineGec(WidgetTester tester) =>
      tekrarEkraniniAc(tester);

  testWidgets('Tekrar sekmesinde boş hata defteri açıklama gösterir', (
    tester,
  ) async {
    await uygulamayiAc(tester, null);
    await tekrarSekmesineGec(tester);
    expect(find.text('Hata defteri'), findsOneWidget);
    expect(find.text('Yanlış bildiklerin burada birikir.'), findsOneWidget);
    final dugme = tester.widget<ButtonStyleButton>(
      find.ancestor(
        of: find.text('Zayıf noktalar dersi'),
        matching: find.bySubtype<ButtonStyleButton>(),
      ),
    );
    expect(dugme.onPressed, isNull);
  });

  testWidgets('hata defteri alıştırma kartı hatasını ve düğmeyi gösterir', (
    tester,
  ) async {
    final depo = BellekDepo(
      OgrenciDurumu(
        alan: 'dil',
        hatalar: [
          const HataKaydi(
            tur: HataKaydi.turKart,
            id: '$sahteDers1#0',
            seviye: 'sahte-1',
            gun: '2026-10-14',
          ),
          // Kod alanının kaydı dil alanında görünmez.
          const HataKaydi(
            tur: HataKaydi.turKart,
            id: '$sahteKodDers1#0',
            seviye: 'sahte-kod-1',
            gun: '2026-10-14',
          ),
        ],
      ),
    );
    await uygulamayiAc(tester, depo, kurslar: [sahteKurs, sahteKodKurs]);
    await tekrarSekmesineGec(tester);
    expect(find.text('Hata defteri'), findsOneWidget);
    expect(find.text('1 kayıt'), findsOneWidget);
    expect(find.text('İki artı iki kaç eder?'), findsOneWidget);
    expect(find.text('HTML neyin kısaltmasıdır?'), findsNothing);
    expect(find.textContaining('Alıştırma · sahte-1'), findsOneWidget);
    final dugme = tester.widget<ButtonStyleButton>(
      find.ancestor(
        of: find.text('Zayıf noktalar dersi'),
        matching: find.bySubtype<ButtonStyleButton>(),
      ),
    );
    expect(dugme.onPressed, isNotNull);
  });

  testWidgets('hata defteri yarışma sorusunu kategori adı, simgesi ve '
      'rengiyle gösterir', (tester) async {
    final q = tumSorular.firstWhere((s) => s.alan == 'dil');
    final depo = BellekDepo(
      OgrenciDurumu(
        alan: 'dil',
        hatalar: [
          HataKaydi(
            tur: HataKaydi.turYarisma,
            id: q.id,
            kategori: q.kategori.kimlik,
            seviye: q.seviyeKursId,
            gun: '2026-10-14',
          ),
          // Soru bankasında olmayan kayıt sessizce gizlenir.
          const HataKaydi(
            tur: HataKaydi.turYarisma,
            id: 'yok.soru.1',
            kategori: 'tarih',
            seviye: 'x',
            gun: '2026-10-14',
          ),
        ],
      ),
    );
    await uygulamayiAc(tester, depo);
    await tekrarSekmesineGec(tester);
    expect(find.text('1 kayıt'), findsOneWidget);
    expect(find.text(q.soru), findsOneWidget);
    expect(find.textContaining(q.kategori.ad), findsOneWidget);
    final parlaklik = Theme.of(
      tester.element(find.byType(Scaffold).first),
    ).brightness;
    final simge = tester.widget<Icon>(
      find.byIcon(KategoriRenkleri.simge(q.kategori)),
    );
    expect(simge.color, KategoriRenkleri.renk(q.kategori, parlaklik));
    // Yarışma kaydı tek başına zayıf noktalar dersi açmaz (kartı yok).
    final dugme = tester.widget<ButtonStyleButton>(
      find.ancestor(
        of: find.text('Zayıf noktalar dersi'),
        matching: find.bySubtype<ButtonStyleButton>(),
      ),
    );
    expect(dugme.onPressed, isNull);
  });

  testWidgets('Zayıf noktalar dersi hatalı kartı ilk soru olarak açar', (
    tester,
  ) async {
    final depo = BellekDepo(
      const OgrenciDurumu(
        alan: 'dil',
        hatalar: [
          HataKaydi(
            tur: HataKaydi.turKart,
            id: '$sahteDers2#0',
            seviye: 'sahte-1',
            gun: '2026-10-14',
          ),
          // 7 günden eski hata zayıf nokta sayılmaz.
          HataKaydi(
            tur: HataKaydi.turKart,
            id: '$sahteDers1#1',
            seviye: 'sahte-1',
            gun: '2026-10-01',
          ),
        ],
      ),
    );
    await uygulamayiAc(tester, depo);
    await tekrarSekmesineGec(tester);
    await dokun(tester, find.text('Zayıf noktalar dersi'));
    expect(find.byType(AlistirmaOturumu), findsOneWidget);
    expect(
      find.descendant(
        of: find.byType(AlistirmaOturumu),
        matching: find.text('İki artı iki kaç eder?'),
      ),
      findsOneWidget,
    );
  });

  testWidgets('Yol sayfasında "Bu hafta 2/5 gün" satırı görünür', (
    tester,
  ) async {
    // bugün 2026-10-15 (Perşembe); hafta Pazartesi 2026-10-12'de başlar.
    final depo = BellekDepo(
      const OgrenciDurumu(
        alan: 'dil',
        sonGun: '2026-10-15',
        seri: 1,
        gunlukXp: {
          '2026-10-11': 30, // önceki hafta: sayılmaz
          '2026-10-13': 20,
          '2026-10-15': 25,
        },
      ),
    );
    await uygulamayiAc(tester, depo);
    expect(find.text('Bu hafta 2/5 gün'), findsOneWidget);
  });

  testWidgets('haftalık satır seçilen hedefi gösterir (0/3)', (tester) async {
    final depo = BellekDepo(
      const OgrenciDurumu(alan: 'dil', haftalikHedefGun: 3),
    );
    await uygulamayiAc(tester, depo);
    expect(find.text('Bu hafta 0/3 gün'), findsOneWidget);
  });

  testWidgets('Ayarlar: haftalık hedef değişir ve kalıcı olur', (tester) async {
    final depo = BellekDepo(const OgrenciDurumu(alan: 'dil'));
    await uygulamayiAc(tester, depo);
    await ayarlariAc(tester);
    expect(find.text('Haftalık hedef'), findsOneWidget);
    expect(find.text('Haftada 5 gün'), findsOneWidget);
    await tester.ensureVisible(find.text('Haftada 5 gün'));
    final kaydirici = find.byType(Slider).at(1);
    expect(tester.widget<Slider>(kaydirici).min, 3);
    expect(tester.widget<Slider>(kaydirici).max, 7);
    tester.widget<Slider>(kaydirici).onChanged!(6);
    await tester.pumpAndSettle();
    expect((await depo.yukle()).haftalikHedefGun, 6);
    expect(find.text('Haftada 6 gün'), findsOneWidget);
    // Sınır dışı değer 3..7 aralığına çekilir.
    tester.widget<Slider>(kaydirici).onChanged!(1);
    await tester.pumpAndSettle();
    expect((await depo.yukle()).haftalikHedefGun, 3);
  });

  group('karışık tekrar önerisi', () {
    final ikiUnite = Kurs(
      id: 'iki-1',
      ad: 'İki Ünite',
      aciklama: '',
      alan: KursAlani.dil,
      uniteler: [
        Unite(
          id: 'iki-1.u1',
          ad: 'Birinci',
          dersler: [
            Ders(
              id: 'iki-1.u1.d1',
              ad: 'Ders Alt',
              alistirmalar: [
                for (var i = 0; i < 6; i++)
                  Secim(
                    soru: 'Önceki soru $i',
                    secenekler: const ['x', 'y'],
                    dogru: 0,
                  ),
              ],
            ),
          ],
        ),
        Unite(
          id: 'iki-1.u2',
          ad: 'İkinci',
          dersler: [
            Ders(
              id: 'iki-1.u2.d1',
              ad: 'Ders Son',
              alistirmalar: const [
                Secim(
                  soru: 'Son soru',
                  secenekler: ['evet', 'hayır'],
                  dogru: 0,
                ),
              ],
            ),
          ],
        ),
      ],
    );

    testWidgets('ünitenin son dersi bitince öneri çıkar ve mikro ders açar', (
      tester,
    ) async {
      final depo = BellekDepo(
        const OgrenciDurumu(alan: 'dil', tamamlanan: {'iki-1.u1.d1': 1}),
      );
      await uygulamayiAc(tester, depo, kurslar: [ikiUnite]);
      await dokun(tester, find.textContaining('Ders Son'));
      await dokun(tester, find.text('evet'));
      await kontrolEtDogru(tester, son: true);
      expect(find.text('Ders tamamlandı'), findsOneWidget);
      expect(find.text('Karışık tekrar (5 soru)'), findsOneWidget);

      await dokun(tester, find.text('Karışık tekrar (5 soru)'));
      expect(find.byType(AlistirmaOturumu), findsOneWidget);
      expect(
        find.descendant(
          of: find.byType(AlistirmaOturumu),
          matching: find.textContaining('Önceki soru'),
        ),
        findsOneWidget,
      );
    });

    testWidgets('ilk ünitenin son dersinde (önceki ünite yok) öneri çıkmaz', (
      tester,
    ) async {
      final tek = Kurs(
        id: 'tek-1',
        ad: 'Tek',
        aciklama: '',
        alan: KursAlani.dil,
        uniteler: [
          Unite(
            id: 'tek-1.u1',
            ad: 'Tek Ünite',
            dersler: [
              Ders(
                id: 'tek-1.u1.d1',
                ad: 'Ders Tek',
                alistirmalar: const [
                  Secim(soru: 'Soru', secenekler: ['evet', 'hayır'], dogru: 0),
                ],
              ),
            ],
          ),
        ],
      );
      await uygulamayiAc(tester, null, kurslar: [tek]);
      await dokun(tester, find.textContaining('Ders Tek'));
      await dokun(tester, find.text('evet'));
      await kontrolEtDogru(tester, son: true);
      expect(find.text('Ders tamamlandı'), findsOneWidget);
      expect(find.text('Karışık tekrar (5 soru)'), findsNothing);
    });
  });
}
