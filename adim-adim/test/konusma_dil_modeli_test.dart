// Konuşma tanıma: dil başına model klasörü (1.8.0'da yalnız İngilizce vardı).
import 'package:adim_adim/servis/konusma.dart';
import 'package:adim_adim/servis/konusma_sherpa.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('modelDili: BCP-47 dil kısmı; boşsa en', () {
    expect(SherpaKonusma.modelDili('de-DE'), 'de');
    expect(SherpaKonusma.modelDili('zh_CN'), 'zh');
    expect(SherpaKonusma.modelDili('KO-kr'), 'ko');
    expect(SherpaKonusma.modelDili(''), 'en');
    expect(SherpaKonusma.modelDili(null), 'en');
  });

  test('modelKlasorAdi: en eski ad, öteki diller dil koduyla', () {
    expect(
      SherpaKonusma.modelKlasorAdi('en-US'),
      SherpaKonusma.varsayilanModelAdi,
    );
    expect(
      SherpaKonusma.modelKlasorAdi('fr-FR'),
      'sherpa-onnx-streaming-zipformer-fr',
    );
    expect(
      SherpaKonusma.modelKlasorAdi('ja-JP'),
      'sherpa-onnx-streaming-zipformer-ja',
    );
  });

  test('SahteKonusma hazirMi dili kaydeder', () async {
    final k = SahteKonusma();
    await k.hazirMi(dil: 'de-DE');
    await k.hazirMi();
    expect(k.sorulanDiller, ['de-DE', null]);
  });
}
