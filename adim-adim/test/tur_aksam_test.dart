import 'package:adim_adim/model/durum.dart';
import 'package:adim_adim/motor/motor.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('hata türü etiketi alıştırma türünden türetilir', () {
    expect(Motor.hataTuru('yaz'), 'yazım');
    expect(Motor.hataTuru('dikte'), 'yazım');
    expect(Motor.hataTuru('dinle'), 'dinleme');
    expect(Motor.hataTuru('soyle'), 'dinleme');
    expect(Motor.hataTuru('secim'), 'anlam');
    expect(Motor.hataTuru('eslestir'), 'anlam');
  });

  test('seri koruma kapalıyken atlanan gün seriyi bozar', () {
    const sonGun = '2026-11-02';
    const acik = OgrenciDurumu(seri: 5, sonGun: sonGun);
    const kapali = OgrenciDurumu(
      seri: 5,
      sonGun: sonGun,
      seriKorumaAcik: false,
    );
    expect(Motor.gosterilenSeri(acik, '2026-11-04'), 5);
    expect(Motor.gosterilenSeri(kapali, '2026-11-04'), 0);
  });

  test('ayarlar JSON gidiş-dönüş ve eski kayıt varsayılanı', () {
    final r = OgrenciDurumu.fromJson(
      const OgrenciDurumu(seriKorumaAcik: false, hataTuruAcik: false).toJson(),
    );
    expect(r.seriKorumaAcik, isFalse);
    expect(r.hataTuruAcik, isFalse);
    final eski = OgrenciDurumu.fromJson(const {});
    expect(eski.seriKorumaAcik, isTrue);
    expect(eski.hataTuruAcik, isTrue);
  });
}
