---
description: AgentMom Faz 11 D5a dilimi (yürütme güvenliği ve izleme) kapsam, test, denetim ve sınır özeti. Sahip: Claude (cihaz oturumu) [İP:AgentMom Faz 11]. Yalnız ekleme ile güncellenir.
---
# Faz 11 · D5a — izleme, risk, eylem anlamları, zincirli denetim

**Kapsam (madde 8, 11, 94, 95):** `GET /api/monitor` (çalışan/bekleyen/yavaş/yeniden denenen, darboğaz), deterministik risk skoru (`risk.ts`, 0–24 düşük, 25–49 orta, 50–74 yüksek, 75+ kritik; gerekçeli), 24 eylemlik anlam/geri alma haritası (`action-semantics.ts`, `GET /api/actions/semantics`), hash zincirli denetim (`013_audit_chain`, `GET /api/audit/verify`), arayüz: Genel Bakış izleme kartı, Güvenlik eylem anlamları, Denetim zincir kartı, onay penceresinde risk/geri alma.

**Test:** `npm test` 851/851, `tsc --noEmit` temiz; yeni dosyalar: risk, action-semantics, audit-chain, monitor, d5a-api testleri. Gerçek sunucuda `/api/audit/verify` (ok, 11 satır, 0 zincirli), `/api/monitor`, `/api/actions/semantics` çalıştı. Ekranlar: `docs/testing/faz11/d5a-*.png` (konsol hatası 0).

**Bağımsız Opus güvenlik denetimi:** Geçti (Kritik/Yüksek yok), 5 Orta + 3 Düşük bulgu.
- Düzeltildi: (1) zincir başladıktan sonra özetsiz satır artık zinciri KIRIK yapar (firstBreak = ilk böyle satır); zincirli satır yokken arayüz "Zincir henüz başlamadı" der, "SAĞLAM" demez. (4) `verification.run` ve `provider.switch` kısmen geri alınabilir/orta duyarlılık. (5) Onay penceresinde güvenilir risk ve geri alma satırları ajan başlığından ÖNCE, başlık etiketli ("ajan yazdı") ve 6 gerekçeye kadar. (3 kısmen) Zincir açıklama metni yumuşatıldı: yerel tutarlılık denetimi, dış sabitleme yok.
- Bilinen sınır / karar bekliyor: (2) özet ayrıştırılmış details üzerinden hesaplanır (yinelenen anahtar farkı); (3) HMAC anahtarı ve yedek manifestine son özet yazma yok; (6) risk kalıpları sınırlı (`command` alanı istekte yok, junction/8.3 adları çözülmez; motor gerçek yolu zaten çözer); (7) `busy_timeout` yok; (8) `013.down.sql` zincir kanıtını kaldırır, öncesinde yedek şart. Sonraki dilimlerde ele alınır.

**Güvenlik etkisi:** yeni uçlar yalnız kullanıcı belirteciyle, salt okunur; ücretli rota, silme, ACL, sır yazma yok.
