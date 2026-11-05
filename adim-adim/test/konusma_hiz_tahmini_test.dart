// Mikrofon örnekleme hızı tahmini (Windows'ta 16 kHz verilmeyebilir).
import 'package:adim_adim/servis/konusma_sherpa.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('16 kHz akışı 16 kHz kalır', () {
    expect(SherpaKonusma.hizTahmini(32000, const Duration(seconds: 1)), 16000);
  });
  test('48 kHz akışı 48 kHz bulunur', () {
    expect(SherpaKonusma.hizTahmini(96000, const Duration(seconds: 1)), 48000);
  });
  test('44.1 kHz akışı 44100 bulunur', () {
    expect(SherpaKonusma.hizTahmini(88200, const Duration(seconds: 1)), 44100);
  });
  test('güvenilmez ölçümde 16 kHz', () {
    expect(SherpaKonusma.hizTahmini(0, const Duration(seconds: 1)), 16000);
    expect(SherpaKonusma.hizTahmini(1000, Duration.zero), 16000);
    expect(SherpaKonusma.hizTahmini(38000, const Duration(seconds: 1)), 16000);
  });
}
