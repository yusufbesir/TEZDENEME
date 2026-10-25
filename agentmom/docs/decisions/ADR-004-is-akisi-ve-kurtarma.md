# ADR-004: İş akışı, kontrol noktası ve devir (Faz 3, 2026-10-21)
Karar: bir görev, görev sözleşmesine (hedef + kabul kriterleri + yazma kapsamları + kısıtlar) bağlı, sıralı ve tek tanımlı bir iş akışı olarak yürütülür: `plan → implement → review → verify` (her biri en çok bir kez, alt küme geçerli). Tek izole git worktree'si tüm adımlar arasında paylaşılır; planlayıcı ve inceleyici salt-okunur, yalnız uygulayıcı yazabilir. `verify` bir sağlayıcı değil, deterministik kontrollerdir (kriterlerin tamamı karşılandı mı, inceleme onayladı mı, değişiklikler kapsamda mı).

Kontrol noktası: her adım geçişi (başlangıç, deneme sayacı, sağlayıcı sırası, çıktı, hata) SQLite'a yazılır. Süreç ölürse `recoverAll()` "running" adımları `interrupted` yapar; yarım kalan deneme bütçeden sayılır (çökme döngüsü sonsuz deneme yaratmaz); biten adımlar tekrar çalışmaz; devir, kontrol noktasındaki çıktıdan yeniden kurulur.

Yeniden deneme: sağlayıcı başına sınırlı (1–3, varsayılan 2), yalnız geçici hatalar. Sağlayıcı değiştirmek yeni bir `provider.switch` yetki kararıdır (politika motoru, audit kaydı); ücretli rotaya geçiş açık ücretli-rota onayı olmadan reddedilir.

Bağımsız inceleme: inceleyici uygulayıcıyla aynı sağlayıcı olamaz (çalışma anında da denetlenir).

Devir sözleşmesi (`Handoff`): sürümlü, doğrulanır, sırlardan arındırılır; önceki ajanın çıktısı güvenilmeyen veridir ve rastgele nonce'lu işaretçiler arasında tek satır JSON olarak verilir.

Eşzamanlılık ve çakışma: en çok 3 eşzamanlı iş akışı (sert sınır). Uygulama adımı olan iş akışları yazma kapsamlarını depo bazında talep eder (`scope_claims`); örtüşen kapsam hızlıca `scope_conflict` ile reddedilir. Kapsam dışı değişiklik (taşıma/yeniden adlandırma dahil) `scope_violation` olur.

Sınırlar: review çıktısı JSON'u bir modelin biçim uyumuna dayanır; doğrulama bu yüzden yalnız `approved` + kriter bayraklarını okur ve her kriteri ayrıca ister. İş akışı tanımı şimdilik tek doğrusal akıştır (dallanma, paralel adım, otomatik planlama yok: Faz 3 devamı).
