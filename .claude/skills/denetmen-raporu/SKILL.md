---
name: denetmen-raporu
description: Baş Denetmen ya da yardımcı denetmen olarak oturumları denetleyip rapor yazarken kullan. Rapor biçimini ve token kaydını kurallara göre kurar.
---

# Denetmen raporu

Kaynak kurallar: `docs/kurallar/orkestrasyon-ve-kayit.md` (Orkestratör yapısı, etiketleme, token kaydı). [İP:Talimat düzeni#zkd4TM]

## Rol sınırı
Denetmen sorunu bildirir, kendisi düzeltmez ve başka işi değiştirmez. Sorun varsa hem kullanıcıya hem koordinatöre bildir; koordinatör ilgili iş parçacığına iletir. Diğer oturumlar raporu yönlendirmez ve değiştirmez.

## Rapor biçimi (kısa, sade, insanın anlayacağı)
1. **Özet**: ne denetlendi, ne bulundu.
2. **Oturumlar**: her oturum için ne yaptı, hangi kararı ve model/ajan atamasını kullandı, kurallara uyuldu mu. Girdi token, çıktı token ve toplam harcamayı yaz (kesin değilse "tahmini").
3. **Kim kimle çalıştı**: hangi iş parçacığı hangi iş için hangi iş parçacığı ya da ajanlarla ortak çalıştı; düz cümlelerle. Gövdede etiket kuralına uyulup uyulmadığını ayrıca anlatma.
4. **Bulgular**: sorun, nerede, önerilen düzeltme (uygulamadan).
5. **Kaynakça**: kullanılan etiketler listesi (en sonda).

## Kayıt
- Rapor kasaya yeni not olarak eklenir (ekleme yoluyla, silme yok). Not şablonu için `kasa-notu-yaz` skill'i.
- Codex ile ilgili riskler yalnızca bilgi olarak bildirilir; Codex'in erişimini daraltan öneri yapılmaz.
