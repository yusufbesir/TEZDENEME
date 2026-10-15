import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'durum/saglayicilar.dart';
import 'ekranlar/ana_sayfa.dart';
import 'ekranlar/ayarlar_ekrani.dart';
import 'ekranlar/ders_ekrani.dart';
import 'ekranlar/kabuk.dart';
import 'ekranlar/profil_ekrani.dart';
import 'ekranlar/tekrar_ekrani.dart';
import 'tema/tema.dart';

final yonlendiriciProvider = Provider<GoRouter>((ref) {
  final yonlendirici = GoRouter(
    initialLocation: '/yol',
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, kabuk) => Kabuk(kabuk: kabuk),
        branches: [
          StatefulShellBranch(routes: [
            GoRoute(path: '/yol', builder: (c, s) => const AnaSayfa()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/tekrar', builder: (c, s) => const TekrarEkrani()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/profil', builder: (c, s) => const ProfilEkrani()),
          ]),
          StatefulShellBranch(routes: [
            GoRoute(path: '/ayarlar', builder: (c, s) => const AyarlarEkrani()),
          ]),
        ],
      ),
      GoRoute(
        path: '/ders/:id',
        builder: (c, s) => DersEkrani(dersId: s.pathParameters['id'] ?? ''),
      ),
    ],
  );
  ref.onDispose(yonlendirici.dispose);
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
        return child ?? const SizedBox.shrink();
      },
    );
  }
}
