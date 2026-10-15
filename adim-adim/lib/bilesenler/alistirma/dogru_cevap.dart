import '../../model/icerik.dart';

/// Yanlış cevapta gösterilecek doğru cevap metni.
String dogruCevapMetni(Alistirma a) => switch (a) {
  Secim() => a.secenekler[a.dogru],
  Bosluk() => a.secenekler[a.dogru],
  Dinle() => a.secenekler[a.dogru],
  Kod() => a.secenekler[a.dogru],
  Yaz() => a.cevaplar.isEmpty ? '' : a.cevaplar.first,
  Sirala() => a.dogru.join(' '),
  Eslestir() => a.ciftler.map((c) => '${c.sol} = ${c.sag}').join('; '),
};
