/// Yazı yönü yardımcısı: Arapça gibi sağdan sola (RTL) yazılan parçaların
/// yerleşiminde kullanılır (Sirala/İşaretle gibi parça dizen bileşenler).
///
/// Metnin içindeki Arapça harfler Flutter'ın Unicode çift yönlü (bidi)
/// algoritmasıyla zaten doğru sıralanır (Arapça sözcüğün yanındaki Latin
/// okunuş ya da Türkçe karşılık düzeni bozmaz). Ancak ayrı ayrı parçalardan
/// oluşan satırlar (cümleyi dizdiğin kelimeler) soldan sağa dizilirse Arapça
/// cümle ters görünür; bu yüzden bu satırlar Arapça içerdiğinde `Wrap`
/// sağdan sola akar. Arapça içermeyen (tüm mevcut diller) metinlerde hiçbir
/// şey değişmez: [yonu] null döner, varsayılan yön kullanılır.
///
/// Sahibi Yusuf (yusufbesir). Yazan: [Claude#dalga13]. Değiştirme kuralı:
/// testler geçmeden değişmez; silme yalnız Yusuf kararıyla ve yalnızca geri
/// dönüşüm kutusuna.
library;

import 'package:flutter/painting.dart';

/// Arapça, Süryanice ve Arapça sunum biçimleri blokları (sağdan sola).
final RegExp _sagdanSola = RegExp('[֐-ࣿיִ-﷿ﹰ-﻿]');

/// [metin] sağdan sola yazılan harf içeriyor mu.
bool sagdanSolaMi(String metin) => _sagdanSola.hasMatch(metin);

/// [parcalar]dan biri sağdan sola yazılıysa [TextDirection.rtl], yoksa null
/// (null: çevredeki varsayılan yön korunur).
TextDirection? parcaYonu(Iterable<String> parcalar) =>
    parcalar.any(sagdanSolaMi) ? TextDirection.rtl : null;
