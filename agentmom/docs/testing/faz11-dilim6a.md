---
description: AgentMom Faz 11 D6a dilimi (doğrulama laboratuvarı: API, sözleşme/değişmez, durum geçişi, birleşik kayıt) kapsam, test, denetim ve sınır özeti. Sahip: Claude [İP:AgentMom Faz 11]. Yalnız ekleme ile güncellenir.
---
# Faz 11 · D6a — madde 24, 53, 56, 57

**Kapsam:** `src/verify/labs/` altında üç deterministik, yerel, modelsiz sağlayıcı (ortak `RunResult` şeması): `api-lab`, `contracts-lab`, `state-lab`; kural dili `rules.ts` (regex yok, bütçeli); birleşik `runLab/summarizeRuns`. Uç: `POST /api/verification/labs` (yalnız kullanıcı; sonuç KAYDEDİLMEZ, görev bağı yok; denetim satırı `verification.lab`). İş akışı entegrasyonu: teslim planında `contracts` (çalışma ağacındaki JSON konu dosyası + sözleşmeler) ve `states` (makine tarifi) → `src/workflows/lab-runs.ts`, kanıt dosyası yazılır, ihlal teslimi bozar, planlı sağlayıcı koşmazsa teslim "doğrulanmadı" olur. API laboratuvarı iş akışına bağlı DEĞİL (sunucu gerektirir).

**Test:** `labs.test.ts` + `labs-api.test.ts` + `verify-integration.test.ts` (8 yeni); AgentMom'un kendi görev durum makinesi gerçek geçiş tablosuyla sınandı (`TASK_TRANSITIONS`, davranış değişmedi).

**Bağımsız Opus güvenlik denetimi:** Geçti (Kritik/Yüksek yok). Düzeltilenler: `unique` O(n²) idi, olay döngüsünü kilitleyebiliyordu (artık O(n) + değerlendirme bütçesi + son tarih); laboratuvar kendi portuna istek atamaz, aynı anda 1 koşu (429), istemci kopunca iptal; yanıt alıntısı önce maskelenip sonra kesilir, geç öğrenilen sırlar geriye dönük maskelenir; `%25` ve `/./` yolları reddedilir; geçersiz/meşgul denemeler denetlenir.

**Sınırlar (bilerek):** API laboratuvarı yalnız yerel adreslere gider ve kullanıcının kendi başlattığı çağrıdır (ajan çağıramaz); sonuç kaydedilmez. Sözleşme konu dosyası uygulayıcının çıktısıdır: sırf kuralları geçsin diye yazılabilir (konu dosyasının güvenilir kaynaktan üretilmesi ayrı iş). Durum laboratuvarı tarif edilen makineyi sınar, kodu makineye bağlamaz. 6 karakterden kısa kaydedilmiş değişken değerleri maskelenmez. Zaman aşımı `infra` sayılır.
