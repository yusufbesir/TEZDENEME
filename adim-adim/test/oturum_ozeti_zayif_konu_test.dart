// Oturum özeti: bugünkü en çok hata yapılan konu (kart 10) hesapla'ya bağlandı.
// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım özellikler#cihaz] Claude
// Yalnız onu yazan yapay zekâ değiştirir; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/oturum_ozeti.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('bugun verilmezse zayifKonu null; hata yoksa da null', () {
    final d = const OgrenciDurumu();
    final v = OturumOzetiMotoru.hesapla(
      onceki: d,
      sonraki: d,
      kurslar: const [],
      dogru: 1,
      toplam: 1,
      xp: 1,
    );
    expect(v.zayifKonu, isNull);
    final v2 = OturumOzetiMotoru.hesapla(
      onceki: d,
      sonraki: d,
      kurslar: const [],
      dogru: 1,
      toplam: 1,
      xp: 1,
      bugun: '2026-11-05',
    );
    expect(v2.zayifKonu, isNull);
  });
}
