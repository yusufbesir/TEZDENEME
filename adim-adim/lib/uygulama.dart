/// Uygulama kökü ve yönlendirici: 4 sekmeli kabuk (Yol, Yarışma, Tekrar,
/// Profil) ile kabuk dışı rotalar (ayarlar, sözlük, ders, mikro ders, alan
/// seçimi).
/// `/mikro` rotası `mod=zayif` (zayıf noktalar), `mod=karisik&ders=<id>`
/// (ünite sonu serpiştirilmiş tekrar) ve `mod=quiz&ders=<id>&yanlis=0,3`
/// (ders sonu kısa quiz) parametrelerini alır.
///
/// Sahibi Yusuf (yusufbesir). Değiştirme kuralı: testler geçmeden değişmez;
/// silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
/// MaterialApp builder'ı yükleme ekranını gösterir ve metin ölçeğini
/// [1,0 ; 1,3] aralığına kıstırır.
library;

import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'durum/saglayicilar.dart';
import 'ekranlar/alan_secimi_ekrani.dart';
import 'ekranlar/ana_sayfa.dart';
import 'ekranlar/ayarlar_ekrani.dart';
import 'ekranlar/calisma_plani_ekrani.dart';
import 'ekranlar/ders_ekrani.dart';
import 'ekranlar/ders_ogeleri_ekrani.dart';
import 'ekranlar/eller_serbest_ekrani.dart';
import 'ekranlar/kelime_bulutu_ekrani.dart';
import 'ekranlar/senaryo_ekrani.dart';
import 'ekranlar/efsanevi_ekrani.dart';
import 'ekranlar/filtreli_tekrar_ekrani.dart';
import 'ekranlar/hikaye_ekrani.dart';
import 'ekranlar/ornek_programlar_ekrani.dart';
import 'ekranlar/kabuk.dart';
import 'ekranlar/mikro_ders_ekrani.dart';
import 'ekranlar/pratik_etkinlikleri.dart';
import 'ekranlar/pratik_merkezi_ekrani.dart';
import 'ekranlar/radyo_ekrani.dart';
import 'ekranlar/profil_ekrani.dart';
import 'ekranlar/sozluk_ekrani.dart';
import 'ekranlar/tekrar_ekrani.dart';
import 'ekranlar/yarisma_ekrani.dart';
import 'ekranlar/sertifika_ekrani.dart';
import 'ekranlar/sinav_ekrani.dart';
import 'ekranlar/unite_ozeti_ekrani.dart';
import 'ekranlar/unite_rehberi_ekrani.dart';
import 'ekranlar/yerlestirme_ekrani.dart';
import 'ekranlar/satranc/araclar.dart';
import 'ekranlar/satranc/bulmacalar.dart';
import 'ekranlar/satranc/mac.dart';
import 'ekranlar/satranc/merkez.dart';
import 'ekranlar/satranc/oyun_sonu.dart';
import 'tema/tema.dart';

final yonlendiriciProvider = Provider<GoRouter>((ref) {
  // Durum yüklenince, alan değişince ya da ilk açılış akışı bitince
  // yönlendirme yeniden değerlendirilir.
  final yenile = ValueNotifier<int>(0);
  ref.listen(durumProvider, (onceki, simdi) {
    if (onceki?.value?.alan != simdi.value?.alan ||
        onceki?.value?.ilkAcilisTamam != simdi.value?.ilkAcilisTamam ||
        onceki?.hasValue != simdi.hasValue) {
      yenile.value++;
    }
  });
  final yonlendirici = GoRouter(
    initialLocation: '/yol',
    refreshListenable: yenile,
    redirect: (context, state) {
      final durum = ref.read(durumProvider).value;
      if (durum == null) return null; // yükleniyor: ekran yükleniyor gösterir
      // Alan seçilmemişse ya da ilk açılış akışı bitmemişse her yer alan
      // seçimine (ilk açılışta "Hoş geldin" akışına) gider. (Alan seçiliyken
      // /alan-sec açık kalabilir: Profil'deki "Değiştir" oraya gider; seçim
      // sonrası alan seçim ekranı kendisi /yol'a geçer.)
      if ((durum.alan == null || !durum.ilkAcilisTamam) &&
          state.matchedLocation != '/alan-sec') {
        return '/alan-sec';
      }
      return null;
    },
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, kabuk) => Kabuk(kabuk: kabuk),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/yol', builder: (c, s) => const AnaSayfa()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/yarisma',
                builder: (c, s) => const YarismaYerTutucu(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/tekrar', builder: (c, s) => const TekrarEkrani()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/profil', builder: (c, s) => const ProfilEkrani()),
            ],
          ),
        ],
      ),
      GoRoute(path: '/ayarlar', builder: (c, s) => const AyarlarEkrani()),
      GoRoute(path: '/plan', builder: (c, s) => const CalismaPlaniEkrani()),
      GoRoute(path: '/sozluk', builder: (c, s) => const SozlukEkrani()),
      GoRoute(
        path: '/ders/:id',
        builder: (c, s) => DersEkrani(dersId: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/ders-ogeleri/:id',
        builder: (c, s) =>
            DersOgeleriEkrani(dersId: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/hikaye/:id',
        builder: (c, s) => HikayeEkrani(hikayeId: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/ornekler',
        builder: (c, s) => const OrnekProgramlarEkrani(),
      ),
      GoRoute(
        path: '/ornek/:id',
        builder: (c, s) =>
            OrnekDetayEkrani(ornekId: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/mikro',
        // mod=zayif: hata defterinden zayıf noktalar dersi;
        // mod=karisik&ders=<id>: ünite sonu serpiştirilmiş tekrar;
        // mod=quiz&ders=<id>&yanlis=0,3: ders sonu kısa quiz;
        // mod=donem&donem=gunluk|haftalik|aylik: günün/haftanın/ayın dersi.
        builder: (c, s) => MikroDersEkrani(
          mod: s.uri.queryParameters['mod'],
          dersId: s.uri.queryParameters['ders'],
          yanlis: s.uri.queryParameters['yanlis'],
          donem: s.uri.queryParameters['donem'],
        ),
      ),
      GoRoute(
        path: '/yerlestirme',
        builder: (c, s) =>
            YerlestirmeEkrani(kursId: s.uri.queryParameters['kurs'] ?? ''),
      ),
      GoRoute(
        path: '/sinav',
        // kurs=<id>&unite=<indeks>: ünite ara sınavı; unite yoksa sertifika.
        builder: (c, s) => SinavEkrani(
          kursId: s.uri.queryParameters['kurs'] ?? '',
          uniteIndeks: int.tryParse(s.uri.queryParameters['unite'] ?? ''),
        ),
      ),
      GoRoute(
        path: '/unite-ozeti',
        builder: (c, s) => UniteOzetiEkrani(
          kursId: s.uri.queryParameters['kurs'] ?? '',
          uniteIndeks: int.tryParse(s.uri.queryParameters['unite'] ?? '') ?? -1,
        ),
      ),
      GoRoute(
        path: '/unite-rehberi',
        builder: (c, s) => UniteRehberiEkrani(
          kursId: s.uri.queryParameters['kurs'] ?? '',
          uniteIndeks: int.tryParse(s.uri.queryParameters['unite'] ?? '') ?? -1,
        ),
      ),
      GoRoute(
        path: '/efsanevi',
        // kurs=<id>&unite=<indeks>: efsanevi zor tekrar (ipucusuz, süreli).
        builder: (c, s) => EfsaneviEkrani(
          kursId: s.uri.queryParameters['kurs'] ?? '',
          uniteIndeks: int.tryParse(s.uri.queryParameters['unite'] ?? '') ?? -1,
        ),
      ),
      GoRoute(
        path: '/sertifika',
        builder: (c, s) =>
            SertifikaEkrani(kursId: s.uri.queryParameters['kurs'] ?? ''),
      ),
      GoRoute(
        path: '/tekrar-filtre',
        builder: (c, s) => const FiltreliTekrarEkrani(),
      ),
      GoRoute(path: '/pratik', builder: (c, s) => const PratikMerkeziEkrani()),
      GoRoute(
        path: '/pratik/eslestirme',
        builder: (c, s) => const EslestirmeEkrani(),
      ),
      GoRoute(
        path: '/pratik/tur',
        builder: (c, s) => const ArtanZorlukEkrani(),
      ),
      GoRoute(
        path: '/pratik/kartlar',
        builder: (c, s) => const KelimeKartlariEkrani(),
      ),
      // Eller serbest sesli mod (ÖZELLİK 64), senaryolu konuşma (65) ve kelime
      // bulutu (66).
      GoRoute(
        path: '/eller-serbest',
        builder: (c, s) => const EllerSerbestEkrani(),
      ),
      GoRoute(
        path: '/senaryolar',
        builder: (c, s) => const SenaryoListesiEkrani(),
      ),
      GoRoute(
        path: '/senaryo/:id',
        builder: (c, s) =>
            SenaryoEkrani(senaryoId: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/kelime-bulutu',
        builder: (c, s) => const KelimeBulutuEkrani(),
      ),
      // Dinleme radyosu (ÖZELLİK 46).
      GoRoute(path: '/radyo', builder: (c, s) => const RadyoListesiEkrani()),
      GoRoute(
        path: '/radyo/bolum',
        builder: (c, s) => RadyoBolumEkrani(
          kursId: s.uri.queryParameters['kurs'] ?? '',
          uniteIndeks: int.tryParse(s.uri.queryParameters['unite'] ?? '') ?? -1,
        ),
      ),
      // Satranç modülü (ÖZELLİK 47, 52-57).
      GoRoute(
        path: '/satranc',
        builder: (c, s) => const SatrancMerkeziEkrani(),
      ),
      GoRoute(
        path: '/satranc/gunluk',
        builder: (c, s) => const GunlukBulmacaEkrani(),
      ),
      GoRoute(
        path: '/satranc/tema',
        builder: (c, s) => const TemaListesiEkrani(),
      ),
      GoRoute(
        path: '/satranc/tema/:id',
        builder: (c, s) =>
            TemaBulmacaEkrani(tema: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/satranc/yanlislar',
        builder: (c, s) => const YanlislarimEkrani(),
      ),
      GoRoute(
        path: '/satranc/mac',
        builder: (c, s) => const MiniMacSecimiEkrani(),
      ),
      GoRoute(
        path: '/satranc/mac/:id',
        builder: (c, s) => MiniMacEkrani(konumId: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/satranc/inceleme',
        builder: (c, s) => const IncelemeEkrani(),
      ),
      GoRoute(
        path: '/satranc/serbest',
        builder: (c, s) => const SerbestTahtaEkrani(),
      ),
      GoRoute(
        path: '/satranc/oyunsonu',
        builder: (c, s) => const OyunSonuListesiEkrani(),
      ),
      GoRoute(
        path: '/satranc/oyunsonu/:id',
        builder: (c, s) =>
            OyunSonuEkrani(konumId: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/satranc/koordinat',
        builder: (c, s) => const KoordinatEkrani(),
      ),
      GoRoute(
        path: '/satranc/solo',
        builder: (c, s) => const SoloListesiEkrani(),
      ),
      GoRoute(
        path: '/satranc/solo/:id',
        builder: (c, s) => SoloEkrani(id: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/satranc/analiz',
        builder: (c, s) => const AnalizListesiEkrani(),
      ),
      GoRoute(
        path: '/satranc/analiz/:id',
        builder: (c, s) => AnalizEkrani(id: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/satranc/meydan/:id',
        builder: (c, s) =>
            DersMeydanEkrani(dersId: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/satranc/ustalik',
        builder: (c, s) => const UstalikEkrani(),
      ),
      GoRoute(path: '/alan-sec', builder: (c, s) => const AlanSecimiEkrani()),
    ],
  );
  ref.onDispose(() {
    yonlendirici.dispose();
    yenile.dispose();
  });
  return yonlendirici;
});

class AdimAdimUygulama extends ConsumerWidget {
  const AdimAdimUygulama({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final durum = ref.watch(durumProvider);
    final koyu = durum.value?.koyuTema;
    return MaterialApp.router(
      title: 'Adım Adım',
      debugShowCheckedModeBanner: false,
      locale: const Locale('tr', 'TR'),
      supportedLocales: const [Locale('tr', 'TR'), Locale('en', 'US')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      theme: acikTema(),
      darkTheme: koyuTema(),
      themeMode: koyu == null
          ? ThemeMode.system
          : (koyu ? ThemeMode.dark : ThemeMode.light),
      routerConfig: ref.watch(yonlendiriciProvider),
      builder: (context, child) {
        if (durum.isLoading && !durum.hasValue) {
          return Scaffold(
            body: Center(
              child: Semantics(
                label: 'Yükleniyor',
                child: const CircularProgressIndicator(),
              ),
            ),
          );
        }
        // Metin ölçeği [1,0 ; 1,3] aralığına kıstırılır: ne okunmaz küçülür
        // ne de yerleşimi bozacak kadar büyür.
        final medya = MediaQuery.of(context);
        final olcek = medya.textScaler
            .scale(1.0)
            .clamp(Olcu.metinOlcekEn, Olcu.metinOlcekEnCok)
            .toDouble();
        return MediaQuery(
          data: medya.copyWith(textScaler: TextScaler.linear(olcek)),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}
