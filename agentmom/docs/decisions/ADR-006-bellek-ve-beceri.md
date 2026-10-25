<!-- Sahip: Claude [İP:AgentMom Faz 5]. Karar kaydı; değişiklik yalnız ekleme. -->
# ADR-006: Operasyonel bellek ve beceri yaşam döngüsü (Faz 5)
Durum: kabul (2026-10-21). Bağlam: M7 (bellek/yaşayan dokümantasyon) ve M9 (beceri) küçük dilim.
- **Bellek salt-ekleme:** içerik SQL tetikleyicisiyle değiştirilemez/silinemez; düzeltme yeni kayıt + `supersedes`. Çelişki ve bayatlık **bayraklanır**, otomatik çözülmez/gizlenmez. Gerekçe: ajan çıktısı yanlış olabilir (Faz 5 denemesi: inceleyici yanlış pozitif, uygulayıcı yanlış beyan); sessiz üzerine yazma hatayı gizler.
- **Dışa aktarma kasaya yalnız yeni dosya:** `wx`, dizin önceden var ve gerçek, `anahtarlar` sert ret, `file.write` politikası + kullanıcı onayı. Kullanıcı yapılandırmasına yalnız `kasa/notlar` eklendi, `anahtarlar` yasaklandı.
- **Beceri kapıları kanıt kaydıdır, kod çalıştırmaz:** SHA-256'ya bağlı; ayrıcalıklı/uzak için 2 bağımsız denetçi; yayınlama yalnız kullanıcı. Kimlik düzeyinde bağımsızlık etiketle sınırlıdır (kanıtlanmış kimlik değil): bilinen sınır.
- Reddedilen: FTS için harici hizmet/embedding (yerel-önce ilkesi); otomatik çelişki çözümü.
