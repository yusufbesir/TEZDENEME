// Windows ses yedeği: hız ve dil dönüşümleri (süreç başlatma cihazda denenir).
// Sahibi: Yusuf (yusufbesir); yazan: [İP:Adım Adım özellikler#cihaz] Claude
// Yalnız onu yazan yapay zekâ değiştirir; silme yalnız Yusuf kararıyla ve yalnızca geri dönüşüm kutusuna.
import 'package:adim_adim/servis/ses_windows_yedek.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('sapiHizi doğal 0,5 -> 0, sınırlar kırpılır, NaN 0', () {
    expect(sapiHizi(0.5), 0);
    expect(sapiHizi(0.45), -1);
    expect(sapiHizi(0.2), -6);
    expect(sapiHizi(5), 10);
    expect(sapiHizi(-5), -10);
    expect(sapiHizi(double.nan), 0);
  });

  test('sapiDilOnEki yalnız harf önekini alır', () {
    expect(sapiDilOnEki('en-US'), 'en');
    expect(sapiDilOnEki('tr_TR'), 'tr');
    expect(sapiDilOnEki("de'; calc"), 'de');
    expect(sapiDilOnEki('123'), 'en');
    expect(sapiDilOnEki(''), 'en');
  });
}
