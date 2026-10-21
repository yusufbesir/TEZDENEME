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
import 'ekranlar/ders_ekrani.dart';
import 'ekranlar/kabuk.dart';
import 'ekranlar/mikro_ders_ekrani.dart';
import 'ekranlar/profil_ekrani.dart';
import 'ekranlar/sozluk_ekrani.dart';
import 'ekranlar/tekrar_ekrani.dart';
import 'ekranlar/yarisma_ekrani.dart';
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
      GoRoute(path: '/sozluk', builder: (c, s) => const SozlukEkrani()),
      GoRoute(
        path: '/ders/:id',
        builder: (c, s) => DersEkrani(dersId: s.pathParameters['id'] ?? ''),
      ),
      GoRoute(
        path: '/mikro',
        // mod=zayif: hata defterinden zayıf noktalar dersi;
        // mod=karisik&ders=<id>: ünite sonu serpiştirilmiş tekrar;
        // mod=quiz&ders=<id>&yanlis=0,3: ders sonu kısa quiz.
        builder: (c, s) => MikroDersEkrani(
          mod: s.uri.queryParameters['mod'],
          dersId: s.uri.queryParameters['ders'],
          yanlis: s.uri.queryParameters['yanlis'],
        ),
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
