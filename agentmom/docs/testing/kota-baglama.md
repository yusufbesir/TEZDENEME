---
description: AgentMom kota bağlama (claude-code rate_limit_event -> provider.event:usage data.limits). Sahip: Claude [İP:AgentMom devam]. Yalnız ekleme ile güncellenir.
---
# Kota bağlama
- `src/providers/claude-code.ts`: gerçek `rate_limit_event` (kayıt: `src/providers/testing/claude-real-run.jsonl`) artık yalnız-limit `usage` olayı üretir. En çok kullanılan pencere (`unifiedWindows`, utilization 0..1) bağlayıcı sayılır: `usedPct = utilization*100`, `resetsAt` epoch saniyesinden ISO. Eksik/aralık dışı pencere olay üretmez; uydurma değer yok.
- Okuma tarafı değişmedi: `analysis/quota.ts` `data.limits`i doğrulayıp kullanır; bayat/tutarsız/geçmiş-sıfırlanma "bilinmiyor" kalır.
- Test: providers.test.ts (olay dizisi + parseLimits kabulü), quota ve indicators testleri geçti. Tek kalan hata `child env` testi Windows `;` PATH ayracına özgü (Linux'ta beklenen).
- Sınır: yalnız 2026-10-21 tek kayıtlı gerçek çalıştırmayla doğrulandı; farklı plan/pencere adları görülmedi. Codex ve Gemini bu alanı üretmez (bilinmiyor). Durum dosyasında madde "Doğrulandı"ya çevrilmedi.
