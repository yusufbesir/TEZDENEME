---
description: AgentMom Faz 11 D5b dilimi (geçici izinler, veri sınırı, değişiklik defteri, olay otomasyonu) kapsam, test ve sınır özeti. Sahip: Claude [İP:AgentMom Faz 11]. Yalnız ekleme ile güncellenir.
---
# Faz 11 · D5b — madde 13, 76, 77, 78
**Kapsam ve kararlar:** `docs/decisions/ADR-015-gecici-izin-veri-siniri-otomasyon.md`.
**Testler:** `src/core/policy/grants.test.ts` (8), `src/automation/automation.test.ts` (9: otomasyon, defter, veri sınırı), `src/server/d5b-api.test.ts` (6: uçlar, yetki, akışlar); migrasyon sürüm beklentileri artık `loadMigrations().length`'ten türetilir.
**Güvenlik etkisi:** izin yalnız "onay gerekir"i gevşetir; veri sınırı ret kuralıdır ve onayla aşılamaz; ajan izin/kural/defter yazamaz; otomasyon izin veremez ve geçici izin tüketemez.
**Sınırlar:** bkz. ADR-015 "Bilinen sınırlar".
