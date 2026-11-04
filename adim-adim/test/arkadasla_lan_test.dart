// LAN taşıması 127.0.0.1 döngü testi: gönder/al, boyut sınırı, ikinci bağlantı reddi, keşif.
// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım özellikler#cihaz] Claude
// Yalnız onu yazan yapay zekâ değiştirir; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
import 'dart:io';

import 'package:adim_adim/yarisma/arkadasla/lan_aktarim.dart';
import 'package:adim_adim/yarisma/arkadasla/protokol.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final lo = InternetAddress.loopbackIPv4;

  test('iki uç mesaj alışverişi yapar', () async {
    final ev = await LanEvSahibi.baslat(adres: lo);
    final istemci = await LanAktarimi.baglan(lo, ev.port);
    final rakip = await ev.rakip;
    final gelen = rakip.mesajlar.first;
    await istemci.gonder(const Hazir().kodla());
    expect(await gelen, const Hazir().kodla());
    final geri = istemci.mesajlar.first;
    await rakip.gonder('{"t":"ayril"}');
    expect(await geri, '{"t":"ayril"}');
    await istemci.kapat();
    await rakip.kapat();
    await ev.kapat();
  });

  test('gönderilen çok büyük ya da satır sonlu mesaj reddedilir', () async {
    final ev = await LanEvSahibi.baslat(adres: lo);
    final istemci = await LanAktarimi.baglan(lo, ev.port);
    await ev.rakip;
    expect(() => istemci.gonder('x' * 5000), throwsArgumentError);
    expect(() => istemci.gonder('a\nb'), throwsArgumentError);
    await istemci.kapat();
    await ev.kapat();
  });

  test('karşıdan gelen aşırı uzun satır bağlantıyı keser', () async {
    final ev = await LanEvSahibi.baslat(adres: lo);
    final ham = await Socket.connect(lo, ev.port);
    final rakip = await ev.rakip;
    final bitti = rakip.mesajlar.toList();
    ham.add(List.filled(enFazlaMesajBayt + 10, 65));
    await ham.flush();
    await bitti.timeout(const Duration(seconds: 3));
    ham.destroy();
    await ev.kapat();
  });

  test('ikinci bağlantı reddedilir', () async {
    final ev = await LanEvSahibi.baslat(adres: lo);
    final ilk = await LanAktarimi.baglan(lo, ev.port);
    await ev.rakip;
    final ikinci = await Socket.connect(lo, ev.port);
    await ikinci.drain<void>().timeout(const Duration(seconds: 3));
    await ilk.kapat();
    ikinci.destroy();
    await ev.kapat();
  });

  test('duyuru ayrıştırma geçersiz girdiyi reddeder', () {
    List<int> b(String s) => s.codeUnits;
    expect(lanDuyurusunuCoz(b('ADIMADIM1;5000;Ali'), lo)?.takmaAd, 'Ali');
    expect(lanDuyurusunuCoz(b('X;5000;Ali'), lo), isNull);
    expect(lanDuyurusunuCoz(b('ADIMADIM1;80;Ali'), lo), isNull);
    expect(lanDuyurusunuCoz(b('ADIMADIM1;abc;Ali'), lo), isNull);
    expect(lanDuyurusunuCoz(b('ADIMADIM1;5000;'), lo), isNull);
    expect(lanDuyurusunuCoz(b('ADIMADIM1;5000;${'a' * 25}'), lo), isNull);
    expect(lanDuyurusunuCoz(List.filled(300, 65), lo), isNull);
  });

  test('keşif döngüde duyuruyu bulur', () async {
    const port = 45899;
    final ev = await LanEvSahibi.baslat(adres: lo);
    final bulunan = lanKesfet(kesifPortu: port).first;
    await Future<void>.delayed(const Duration(milliseconds: 200));
    await ev.duyur(
      'Veli',
      hedef: lo,
      kesifPortu: port,
      aralik: const Duration(milliseconds: 200),
    );
    final ilan = await bulunan.timeout(const Duration(seconds: 5));
    expect(ilan.takmaAd, 'Veli');
    expect(ilan.port, ev.port);
    await ev.kapat();
  });
}
