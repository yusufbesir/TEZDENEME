// Sahibi: Yusuf; yazan: [Claude#arka-plan-kayit]. Arka plana geçişte bekleyen yazma.
import 'dart:async';

import 'package:adim_adim/depo/depo.dart';
import 'package:adim_adim/model/durum.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

import 'arayuz_yardimci.dart';

/// Yazmayı kontrolle tamamlayan depo: kaç kez kaydet/bosalt çağrıldığını sayar.
class _YavasDepo extends BellekDepo {
  _YavasDepo() : super(const OgrenciDurumu(alan: 'dil'));

  final bekleyen = Completer<void>();
  int kaydetSayisi = 0;
  int bosaltSayisi = 0;
  bool yazmaBitti = false;

  @override
  Future<void> kaydet(OgrenciDurumu d) async {
    kaydetSayisi++;
    await super.kaydet(d);
    await bekleyen.future;
    yazmaBitti = true;
  }

  @override
  Future<void> bosalt() async {
    bosaltSayisi++;
    await bekleyen.future;
  }
}

void main() {
  testWidgets('paused: bekleyen yazma beklenir, ek kayıt açılmaz', (
    tester,
  ) async {
    final depo = _YavasDepo();
    await uygulamayiAc(tester, depo);
    final onceki = depo.kaydetSayisi;

    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.inactive);
    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.hidden);
    await tester.pump();
    expect(depo.bosaltSayisi, 0, reason: 'yalnız paused tetikler');

    tester.binding.handleAppLifecycleStateChanged(AppLifecycleState.paused);
    await tester.pump();
    expect(depo.bosaltSayisi, 1);
    expect(depo.kaydetSayisi, onceki, reason: 'çift yazma yok');

    depo.bekleyen.complete();
    await tester.pumpAndSettle();
  });
}
