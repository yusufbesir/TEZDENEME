# 2026-10-15 Barkod Luhn ve 20 hane güncellemesi

## Özet
- Önceki not: "2026-10-15 Barkod sıra şifreleme uygulaması". Bu not onun devamıdır.
- Barkod artık 20 hane: 19 hane şifreli sıra no + son hane Luhn kontrol rakamı.

## Nasıl çalışır
- Sıra no 19 haneye tamamlanıp anahtar kelimeye göre karıştırılır.
- Luhn kontrol rakamı, şifrelenmiş 19 haneden hesaplanır ve sona eklenir.
- Çözerken önce Luhn kontrol edilir; tutmazsa barkod hatalı sayılır, sonra sıra no geri çözülür.

## Notlar
- Uzun sıra numaraları metin olarak işlenir, kayıp olmaz.
- CSV'de Excel'in 20 haneyi bozmaması için "metin biçimi" seçeneği var (varsayılan açık).
- 17 birim testi ve ayrı denetçi güvenlik incelemesi geçti.
