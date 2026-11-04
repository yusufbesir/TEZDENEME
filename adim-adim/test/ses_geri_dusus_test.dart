// Sahibi: Yusuf; yazan: [Claude#tts-geri-dusus]. Ses motoru/dil yoksa sessiz geçiş.
import 'package:adim_adim/servis/ses.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  const kanal = MethodChannel('flutter_tts');
  final mesgul = TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger;

  tearDown(() => mesgul.setMockMethodCallHandler(kanal, null));

  test('eklenti/motor yok: fırlatmaz, false döner (okuma ve okuBekle)', () async {
    // Kanal için işleyici yok => MissingPluginException.
    final ses = Ses();
    expect(await ses.oku('hello'), isFalse);
    expect(await ses.okuBekle('hello'), isFalse);
    expect(await ses.okuYavas('hello'), isFalse);
    expect(await ses.okuHizla('hello', carpan: 1.1), isFalse);
    await ses.durdur();
  });

  test('dil yok: false, konuşma başlatılmaz; öteki dil çalışır', () async {
    final cagrilar = <String>[];
    mesgul.setMockMethodCallHandler(kanal, (c) async {
      cagrilar.add(c.method);
      if (c.method == 'isLanguageAvailable') {
        return (c.arguments as String) == 'tr-TR' ? 0 : 1;
      }
      return 1;
    });
    final ses = Ses();
    expect(await ses.oku('merhaba', dil: 'tr-TR'), isFalse);
    expect(cagrilar.contains('speak'), isFalse);
    expect(await ses.oku('hello', dil: 'en-US'), isTrue);
    expect(cagrilar.contains('speak'), isTrue);
  });

  test('dil yok bir kez bulunca tekrar sorulmaz', () async {
    var soru = 0;
    mesgul.setMockMethodCallHandler(kanal, (c) async {
      if (c.method == 'isLanguageAvailable') {
        soru++;
        return 0;
      }
      return 1;
    });
    final ses = Ses();
    expect(await ses.okuBekle('x', dil: 'tr-TR'), isFalse);
    expect(await ses.okuBekle('x', dil: 'tr-TR'), isFalse);
    expect(soru, 1);
  });

  test('speak 0 dönerse false', () async {
    mesgul.setMockMethodCallHandler(kanal, (c) async {
      if (c.method == 'speak') return 0;
      return 1;
    });
    expect(await Ses().oku('hello'), isFalse);
  });

  test('platform hatası fırlatmaz', () async {
    mesgul.setMockMethodCallHandler(kanal, (c) async {
      throw PlatformException(code: 'tts_yok');
    });
    expect(await Ses().oku('hello'), isFalse);
  });

  test('normal akış true', () async {
    mesgul.setMockMethodCallHandler(kanal, (c) async => 1);
    expect(await Ses().oku('hello'), isTrue);
  });
}
