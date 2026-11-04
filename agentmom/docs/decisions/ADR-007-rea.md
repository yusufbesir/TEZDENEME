<!-- Sahip: Claude [İP:AgentMom Faz 6]. Karar kaydı; değişiklik yalnız ekleme. -->
# ADR-007: REA (araştırma ve iyileştirme danışmanı) küçük dilim (Faz 6, M6)
Durum: kabul (2026-10-21).
- **REA yalnız kayıt tutar.** Kaynak kaydı → bulgu → öneri → onay iş akışı. Modülde ağ, süreç, model, dosya yazma çağrısı yok (kaynak testi sabitler). Araştırma metni kod bloğu/komut benzeri içerik taşırsa temizlenir ve `security` kontrolü başarısız olur; metin hiçbir yerde çalıştırılmaz, bellek kaydına düz not olarak yazılır.
- **Politika sınırı kodla ve SQL ile:** politika/izin/onay/sandbox/bütçe/gizli bilgi/REA'nın kendisi ile ilgili öneri (alan, yol veya metin) `user_decision_required` olur; iş akışına (deney, kıyaslama, onay, benimseme) giremez: hem uygulama (`policy_boundary`) hem SQL tetikleyicisi. Dedektör bilerek **fail-closed** (yanlış pozitif tercih edilir): "sandbox" geçen her öneri kullanıcıya gider.
- **İnsan kapıları:** deney başlatma (git worktree, `file.read`+`file.write` politikası ve kullanıcı onayı), taban çizgisi/sonuç, onaya sunma, onay, ret, izleme, geri alma yalnız kullanıcı. Benimseme = kullanıcının kararının KAYDI; REA hiçbir şeyi uygulamaz.
- **Kıyaslama:** ≥3 koşu, koşular arası gürültü >%10 ise `noisy` (karar yok), ≥%5 iyileşme gerekir; yalnız `improved` onaya gider. İzleme gerilemeyi raporlar, geri almayı yalnız önerir.
- **Ucuz yol:** rutin keşif deterministik satır tarama (sınırlılık işaretleri, dosya:satır kanıtı, kaynak hash'i değiştiyse ret). Model çağrısı yok; `ModelBudget` varsayılan 0, açılırsa yalnız yüksek öncelikli kararlar için.
- Bu dilimde internet yok; belge kaynakları yalnız https adresi + "ne zaman okundu" olarak kaydedilir, çekilmez.
- Bilinen sınır: güvenilirlik/lisans/tazelik alanlarını kaydı giren kişi (kullanıcı) beyan eder; REA doğrulayamaz.

> Ek (2026-10-23): Bu ADR'de anlatılan REA motoru Yusuf kararıyla AgentMom kodundan çıkarıldı; bkz. ADR-014 Ek. Yalnız tarihsel kayıttır.
