<!--
ÜRETİLMİŞ DOSYA: scripts/dokuman-uret.mjs; elle değiştirmeyin; sahibi Claude [İP:AgentMom Faz 11].
Ne bu: depodan deterministik üretilen otomatik belge (modül haritası, HTTP uç tablosu, migrasyon listesi, yetenek kontrol listesi sayımları).
Kim değiştirir: yalnız scripts/dokuman-uret.mjs (node scripts/dokuman-uret.mjs). Güncel mi diye bakmak için: node scripts/dokuman-uret.mjs --dogrula.
Silme yalnız Yusuf'un kararıyla ve Geri Dönüşüm Kutusu'na taşıyarak yapılır.
-->

# AgentMom otomatik belge

Bu belge depodan deterministik üretilir (tarih/saat içermez). Elle değiştirmeyin; kaynak değişince `node scripts/dokuman-uret.mjs` ile yeniden üretin.

## Modül haritası

src altında 357 dosya, 34 klasör. Açıklama = dosya başındaki yorumun ilk cümlesi.

### src/analysis/

| Dosya | Açıklama |
| --- | --- |
| absence.test.ts | Eksiklik / fazlalık dedektörü birim testleri (D8b, madde 83). |
| absence.ts | Eksiklik / fazlalık dedektörü (madde 83, D8b). |
| benchmark.test.ts | Ajan/model kıyaslama testleri (madde 12). |
| benchmark.ts | Ajan/model kıyaslama merkezi (madde 12, D10). |
| broker.test.ts | İç yetenek aracısı birim testleri (D8b, madde 99). |
| broker.ts | İç yetenek aracısı (madde 99, D8b). |
| capability-graph.test.ts | Yetenek bağımlılık grafiği ve yetenek düzeyinde etki testleri (madde 47 ve 10). |
| capability-graph.ts | Yetenek ve bağımlılık grafiği + yetenek düzeyinde etki analizi (madde 47 ve 10, D10). |
| continuity.test.ts | Yetenek süreklilik grafiği birim testleri (D8b, madde 73). |
| continuity.ts | Yetenek süreklilik grafiği (madde 73, D8b). |
| exit-plan.test.ts | Sağlayıcı çıkış / değiştirilebilirlik planlayıcı birim testleri (D8b, madde 80). |
| exit-plan.ts | Sağlayıcı çıkış / değiştirilebilirlik planlayıcı (madde 80, D8b). |
| expertise.test.ts | Uzmanlık haritalayıcı birim testleri (D8b, madde 86). |
| expertise.ts | Uzmanlık haritalayıcı (madde 86, D8b). |
| impact.test.ts | Nedensel etki haritası birim testleri (D8b, madde 70). |
| impact.ts | Nedensel etki haritası (madde 70, D8b): src altındaki import grafiği, bağımlılar ve etkilenen testler. |
| lock.ts | Analiz taramaları için tekil kilit (D8b). |
| offline.test.ts | Çevrimdışı kip planı birim testleri (D8b, madde 74). |
| offline.ts | Çevrimdışı kip planı (madde 74, D8b). |
| portfolio.test.ts | Çoklu proje portföyü birim testleri (madde 15). |
| portfolio.ts | Çoklu proje portföyü (madde 15, D9). |
| quota.test.ts | Kota ve gösterge seviyesi birim testleri. |
| quota.ts | Sağlayıcı kotası ve gösterge seviyeleri (Faz 11 durum göstergeleri + kota farkında öneri). |
| release-impact.test.ts | Sürüm etki analizi birim testleri (madde 29, D8b). |
| release-impact.ts | Sürüm etki analizi (madde 29, D8b): iki git başvurusu arasında değişen dosyalar ve etkileri. |
| scan.ts | Sistem analitiği (D8b) için depo dosyası tarayıcısı. |
| shadow-price.test.ts | Kaynak gölge fiyatı birim testleri (D8b, madde 72). |
| shadow-price.ts | Kaynak gölge fiyatı (madde 72, D8b). |
| snapshot.ts | Sağlayıcı anlık görüntüsü (D8b ortak girdi). |
| switching.test.ts | Bağlam değiştirme maliyeti birim testleri (D8c-3b, madde 71). |
| switching.ts | Bağlam değiştirme maliyeti (madde 71, D8c-3b). |
| tech-debt.test.ts | Teknik borç merkezi birim testleri (madde 33, D8b). |
| tech-debt.ts | Teknik borç merkezi (madde 33, D8b): yerel sinyaller, KAYNAK GÖSTERİMLİ. |

### src/automation/

| Dosya | Açıklama |
| --- | --- |
| analysis-summaries.ts | Zamanlanmış analizlerin KISA özetleri (madde 13 zaman tetikleyicisi, ADR-016). |
| automation.test.ts | Olay tetiklemeli otomasyon + değişiklik defteri + veri sınırı testleri (madde 13, 78, 76; D5b). |
| automation.ts | Olay tetiklemeli otomasyon (madde 13, D5b). |
| schedule.test.ts | Zaman tetikleyicili otomasyon testleri (madde 13 genişlemesi, ADR-016; migrasyon 016). |
| scheduler.ts | Zaman tetikleyicisi zamanlayıcısı (madde 13 genişlemesi, ADR-016). |

### src/capabilities/

| Dosya | Açıklama |
| --- | --- |
| model-runner-net.test.ts | İnternetli model yetenekleri çalıştırıcı testleri (37, 38, 40; D8c-2b). |
| model-runner.test.ts | Model yeteneği çalıştırıcısı testleri (D8c-1): kullanıcı şartı, veri sınırı, sağlayıcı seçimi, salt-okunur sandbox, tek koşu kilidi, çıktı işleme, denetim/kanıt. |
| model-runner.ts | Model yeteneği çalıştırıcısı (D8c-1, ADR-016). |
| negotiation.test.ts | Ajanlar arası müzakere (madde 75, D8c-3a) testleri. |
| negotiation.ts | Ajanlar arası müzakere çalıştırıcısı (madde 75, D8c-3a, ADR-016). |

### src/capabilities/model/

| Dosya | Açıklama |
| --- | --- |
| capabilities.test.ts | Altı model yeteneğinin testleri (81, 82, 84, 85, 65, 92): istem şablonu, şema doğrulama, enjeksiyon metninin yalnız metin kalması, niyet katmanı kuralları. |
| common.test.ts | Model yeteneği ortak parçalarının testleri (girdi doğrulama, sınırlayıcılar, JSON çıkarma, çıktı yardımcıları). |
| common.ts | Model yeteneklerinin ortak parçaları (D8c-1): girdi doğrulama, istem sınırlayıcıları, çıktı şeması yardımcıları. |
| competitor-research.ts | Madde 40: rakip ve ekosistem araştırması (INTERNETLİ model yeteneği, D8c-2b). |
| emergence.ts | Madde 85: ortaya çıkan davranış (model yeteneği, D8c-1). |
| feature-discovery.ts | Madde 38: özellik keşfi (INTERNETLİ model yeteneği, D8c-2b). |
| idea-transfer.ts | Madde 82: disiplinler arası fikir aktarımı (model yeteneği, D8c-1). |
| intent.ts | Madde 92: niyet katmanı (model yeteneği, D8c-1). |
| inversion.ts | Madde 84: tersine çevirme (model yeteneği, D8c-1). |
| multi-horizon.ts | Madde 65: çok ufuklu strateji (model yeteneği, D8c-1). |
| negotiation.ts | Madde 75: ajanlar arası müzakere protokolü (model yeteneği, D8c-3a): tanım, adım şemaları, istemler ve sonuç türetme. |
| net-capabilities.test.ts | İnternetli model yeteneklerinin (37, 38, 40) birim testleri: istem şablonu (kaynak sınırlayıcıları), alıntı doğrulaması, kaynaksız kip. |
| net-common.ts | İnternetli model yeteneklerinin (37, 38, 40) ortak parçaları (D8c-2b). |
| registry.ts | Model yeteneği kayıt defteri (D8c-1): dokuz yapılandırılmış-çıktılı yetenek (6 çevrimdışı + 3 internetli: 37, 38, 40). |
| research-center.ts | Madde 37: araştırma merkezi (INTERNETLİ model yeteneği, D8c-2b). |
| solution-space.ts | Madde 81: çözüm uzayı gezgini (model yeteneği, D8c-1). |

### src/cli/

| Dosya | Açıklama |
| --- | --- |
| agentmom.ts | AgentMom terminal komutu (Faz 8, M1). |
| common.ts | AgentMom terminal ortak parçaları (Faz 8/10). |
| repl.ts | AgentMom etkileşimli komut oturumu (Faz 10, Claude Code benzeri). |
| yedek.ts | AgentMom yedekleme komutu (Faz 9, #30). |

### src/core/

| Dosya | Açıklama |
| --- | --- |
| attention.test.ts | Dikkat bütçesi yöneticisi testleri. |
| attention.ts | Dikkat bütçesi yöneticisi (madde 93). |

### src/core/audit/

| Dosya | Açıklama |
| --- | --- |
| audit-chain.test.ts | Hesap verebilirlik zinciri testleri (madde 95, D5a). |
| audit.test.ts | (açıklama yok) |
| audit.ts | Denetim kaydı: kanallar (SQLite/JSONL/bellek) ve D5a'da eklenen özet zinciri. |
| change-ledger.ts | Anlamsal değişiklik defteri (madde 78, D5b). |
| redact.ts | (açıklama yok) |

### src/core/auth/

| Dosya | Açıklama |
| --- | --- |
| auth.test.ts | (açıklama yok) |
| auth.ts | (açıklama yok) |

### src/core/config/

| Dosya | Açıklama |
| --- | --- |
| config.test.ts | (açıklama yok) |
| config.ts | (açıklama yok) |
| safe-path.test.ts | (açıklama yok) |
| safe-path.ts | (açıklama yok) |

### src/core/db/

| Dosya | Açıklama |
| --- | --- |
| db.ts | (açıklama yok) |
| migrate.test.ts | (açıklama yok) |
| migrate.ts | (açıklama yok) |

### src/core/db/migrations/

| Dosya | Açıklama |
| --- | --- |
| 001_init.down.sql | (açıklama yok) |
| 001_init.sql | (açıklama yok) |
| 002_indexes.down.sql | (açıklama yok) |
| 002_indexes.sql | (açıklama yok) |
| 003_providers.down.sql | (açıklama yok) |
| 003_providers.sql | (açıklama yok) |
| 004_evidence.down.sql | (açıklama yok) |
| 004_evidence.sql | (açıklama yok) |
| 005_workflows.down.sql | (açıklama yok) |
| 005_workflows.sql | (açıklama yok) |
| 006_verification.down.sql | (açıklama yok) |
| 006_verification.sql | (açıklama yok) |
| 007_memory.down.sql | Down for 007 drops operational memory (data is lost by design of a rollback; the kasa export files stay). |
| 007_memory.sql | Operational memory (Faz 5b). |
| 008_skills.down.sql | Down for 008 removes the skill lifecycle records (rollback only; released versions are lost with it). |
| 008_skills.sql | Skill lifecycle (Faz 5c): records and policy gates only. |
| 009_rea.down.sql | Down for 009 drops the REA records (rollback only). |
| 009_rea.sql | REA (Faz 6): trusted-source registry, findings, recommendations and the adoption workflow. |
| 010_reasoning.down.sql | Down for 010 drops the reasoning ledgers (rollback only). |
| 010_reasoning.sql | Reasoning ledgers (Faz 7, M14): decisions with expiry and assumptions (#67, #69) and confidence calibration (#68). |
| 011_subsessions.down.sql | Down for 011 drops the sub-session tables (rollback only; yazan: Claude [İP:AgentMom Faz 11]). |
| 011_subsessions.sql | Sub-sessions (Faz 11, dilim 2; yazan: Claude [İP:AgentMom Faz 11], sahip: Yusuf; yalnız sahibi değiştirir). |
| 012_provider_state.down.sql | Down for 012 drops the provider on/off table (explicit rollback only; yazan: Claude [İP:AgentMom Faz 11 D3]). |
| 012_provider_state.sql | Provider on/off state (Faz 11, D3; yazan: Claude [İP:AgentMom Faz 11 D3], sahip: Yusuf; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar). |
| 013_audit_chain.down.sql | Down for 013 removes the audit hash chain and the append-only triggers (explicit rollback only; yazan: Claude [İP:AgentMom D5a]). |
| 013_audit_chain.sql | Hesap verebilirlik zinciri (madde 95, D5a; yazan: Claude [İP:AgentMom D5a], sahip: Yusuf; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar). |
| 014_d5b.down.sql | Down for 014 siler geçici izin, değişiklik defteri ve otomasyon kayıtlarını (yalnız geri alma; önce yedek alın). |
| 014_d5b.sql | D5b (madde 77, 78, 13). |
| 015_net.down.sql | Down for 015: VERİ KAYBI UYARISI. |
| 015_net.sql | D8c-2a (İnternet erişimi katmanı). |
| 016_schedule.down.sql | Down for 016: VERİ KAYBI UYARISI. |
| 016_schedule.sql | Zaman tetikleyicili otomasyon (madde 13 genişlemesi, ADR-016). |

### src/core/health/

| Dosya | Açıklama |
| --- | --- |
| health.test.ts | (açıklama yok) |
| health.ts | (açıklama yok) |

### src/core/policy/

| Dosya | Açıklama |
| --- | --- |
| action-semantics.test.ts | Eylem anlamları tablosu testleri (madde 94, D5a). |
| action-semantics.ts | Eylem anlamları ve geri alma haritası (madde 94, D5a). |
| data-boundary-entropy.test.ts | Veri sınırı ek sezgisi testleri (kodlanmış/yüksek entropili uzun dizgi => secret). |
| data-boundary.ts | Veri sınırı yönlendiricisi (madde 76, D5b). |
| engine.test.ts | (açıklama yok) |
| engine.ts | (açıklama yok) |
| grants.test.ts | Geçici yetenek izinleri testleri (madde 77, D5b). |
| grants.ts | Geçici yetenek izinleri (madde 77, D5b). |
| risk.test.ts | Risk değerlendirmesi testleri (madde 11, D5a). |
| risk.ts | Risk değerlendirmesi (madde 11, D5a). |
| types.ts | (açıklama yok) |

### src/core/secrets/

| Dosya | Açıklama |
| --- | --- |
| credman.ps1 | (açıklama yok) |
| credman.test.ts | (açıklama yok) |
| credman.ts | (açıklama yok) |
| secrets.test.ts | (açıklama yok) |
| secrets.ts | Only a secret_ref ever leaves this module (database, logs, API). |

### src/core/tasks/

| Dosya | Açıklama |
| --- | --- |
| tasks.test.ts | (açıklama yok) |
| tasks.ts | (açıklama yok) |

### src/desktop/

| Dosya | Açıklama |
| --- | --- |
| launcher.test.ts | Pure parts of the desktop launcher. |
| launcher.ts | AgentMom desktop launcher (Faz 11, slice 1). |

### src/desktop/assets/

| Dosya | Açıklama |
| --- | --- |
| agentmom.ico | (ikili ya da okunmayan dosya) |

### src/docs/

| Dosya | Açıklama |
| --- | --- |
| autodoc.test.ts | Otomatik dokümantasyon testleri: saf işlevler + üretici betik (scripts/dokuman-uret.mjs). |
| autodoc.ts | Otomatik dokümantasyon: SAF işlevler (madde 21). |

### src/memory/

| Dosya | Açıklama |
| --- | --- |
| compile.test.ts | Proje hafızası derleyicisi testleri. |
| compile.ts | Proje hafızası derleyicisi (madde 90). |
| export.ts | Obsidian-compatible Markdown export of memory records (Faz 5b). |
| halflife.test.ts | Bilgi yarı ömrü haritası testleri. |
| halflife.ts | Bilgi yarı ömrü haritası (madde 66). |
| implicit.test.ts | Örtük bilgi çıkarıcı testleri. |
| implicit.ts | Örtük bilgi çıkarıcı (madde 87). |
| memory.test.ts | (açıklama yok) |
| resolver.test.ts | Mantıksal çelişki çözücü testleri. |
| resolver.ts | Mantıksal çelişki çözücü (madde 64). |
| retrieval.test.ts | Aşamalı bellek getirme testleri. |
| retrieval.ts | Aşamalı bellek getirme (madde 44). |
| store.ts | AgentMom operational memory (Faz 5b). |

### src/net/

| Dosya | Açıklama |
| --- | --- |
| approval.ts | İnternet erişimi: sunucunun verdiği tek kullanımlık ONAY BİLETLERİ (D8c-2a). |
| guard.test.ts | İnternet erişimi katmanı güvenlik denetimleri testleri (D8c-2a). |
| guard.ts | İnternet erişimi katmanı: saf güvenlik denetimleri (D8c-2a). |
| html-text.test.ts | HTML -> düz metin testleri (D8c-2a). |
| html-text.ts | İnternet erişimi katmanı: HTML -> düz metin (D8c-2a). |
| settings.test.ts | İnternet erişimi ayarları testleri (D8c-2a). |
| settings.ts | İnternet erişimi ayarları (D8c-2a). |
| web-fetch.test.ts | İnternet erişimi getirme katmanı testleri (D8c-2a). |
| web-fetch.ts | İnternet erişimi katmanı: kamuya açık HTTP(S) GET getirme (D8c-2a). |

### src/ops/

| Dosya | Açıklama |
| --- | --- |
| backup-scheduler.test.ts | Kullanım-tabanlı denetimli yedek testleri (Faz 11 dilim 4). |
| backup-scheduler.ts | Kullanım-tabanlı DENETİMLİ yedek (Faz 11 dilim 4, madde 30/7/28). |
| backup.test.ts | (açıklama yok) |
| backup.ts | Local backup, verification and restore (Faz 9, #30). |
| capsule.test.ts | (açıklama yok) |
| capsule.ts | Portable project capsule (Faz 11, D9d, madde 79). |
| handoff-packet.test.ts | (açıklama yok) |
| handoff-packet.ts | Handoff packet for continuing work on another machine (Faz 11, D9g, madde 19). |
| kontrol-listesi.test.ts | 100 yetenek kontrol listesi tutarlılığı (Faz 11). |
| release.test.ts | (açıklama yok) |
| release.ts | Release records (Faz 11, D9f, madde 22). |
| tool-registry.test.ts | Güvenilir araç pazarı testleri (madde 32). |
| tool-registry.ts | Güvenilir araç pazarı (madde 32, D10): YEREL, ağsız. |

### src/ops/testing/

| Dosya | Açıklama |
| --- | --- |
| writer.ts | Test helper (Faz 9): a process that keeps writing memory records, one transaction each, and prints "ack <n>" AFTER each commit. |

### src/orchestrator/

| Dosya | Açıklama |
| --- | --- |
| evidence.ts | (açıklama yok) |
| run-task-fulltext.test.ts | startRun: tam yanıt (fullText) yalnız quietAudit koşularında ve SAYILAMAZ alan olarak döner (D8c-2b). |
| run-task.ts | (açıklama yok) |
| steps.ts | (açıklama yok) |

### src/providers/

| Dosya | Açıklama |
| --- | --- |
| child-env.ts | (açıklama yok) |
| claude-code.ts | (açıklama yok) |
| cli-adapter.ts | (açıklama yok) |
| codex.ts | (açıklama yok) |
| contract.ts | (açıklama yok) |
| gemini.ts | (açıklama yok) |
| integration-center.test.ts | Entegrasyon merkezi, yaşam döngüsü ve TestSprite bildirimi testleri (madde 46, 48, 54). |
| integration-center.ts | Birleşik Entegrasyon ve Yetenek Merkezi (madde 46) + Entegrasyon Yaşam Döngüsü (madde 48). |
| policy-map.ts | (açıklama yok) |
| providers.test.ts | (açıklama yok) |
| registry.ts | (açıklama yok) |
| testsprite.ts | İsteğe bağlı TestSprite sağlayıcısı (madde 54). |

### src/providers/testing/

| Dosya | Açıklama |
| --- | --- |
| claude-real-badmodel.jsonl | (ikili ya da okunmayan dosya) |
| claude-real-run.jsonl | (ikili ya da okunmayan dosya) |
| codex-real-run.jsonl | (ikili ya da okunmayan dosya) |
| fake-cli.mjs | Test fixture that imitates a provider CLI. |
| gemini-real-auth-error.txt | (açıklama yok) |
| gemini-real-ineligible.txt | (açıklama yok) |

### src/reasoning/

| Dosya | Açıklama |
| --- | --- |
| argument.test.ts | Akıl yürütme derleyicisi testleri. |
| argument.ts | Akıl yürütme derleyicisi (madde 61). |
| genealogy.test.ts | Karar soy ağacı testleri. |
| genealogy.ts | Karar soy ağacı (madde 89). |
| hypotheses.test.ts | Rakip hipotezler laboratuvarı testleri. |
| hypotheses.ts | Rakip hipotezler laboratuvarı (madde 62). |
| learning.test.ts | Öğrenme getirisi hesaplayıcı testleri. |
| learning.ts | Öğrenme getirisi hesaplayıcı (madde 97). |
| reasoning.test.ts | (açıklama yok) |
| reasoning.ts | Reasoning ledgers (Faz 7, M14). |
| voi.test.ts | Bilgi değeri değerlendirici testleri. |
| voi.ts | Bilgi değeri değerlendirici (madde 63). |

### src/server/

| Dosya | Açıklama |
| --- | --- |
| analysis-more-api.test.ts | Sistem analitiği uçları (teknik borç 33, sürüm etkisi 29, veri profili 25) testleri. |
| app.test.ts | (açıklama yok) |
| app.ts | (açıklama yok) |
| d5a-api.test.ts | D5a uçları testleri: eylem anlamları, denetim zinciri doğrulaması, canlı izleme, görevlerde risk/semantics alanları. |
| d5b-api.test.ts | D5b uçları testleri (geçici izinler, değişiklik defteri, otomasyon). |
| d7-api.test.ts | D7 uçları testleri (aşamalı getirme, proje hafızası derleyicisi, örtük bilgi önerileri, karar soy ağacı). |
| d8-api.test.ts | D8a uçları testleri (rakip hipotezler, bilgi değeri, çelişki çözüm önerisi, bilgi yarı ömrü, öğrenme getirisi, dikkat bütçesi, akıl yürütme derleyicisi). |
| d8b-api.test.ts | D8b uçları testleri (sistem analitiği: etki haritası, süreklilik, çıkış planı, aracı, çevrimdışı kip, uzmanlık, gölge fiyat, eksiklik dedektörü). |
| d8c-api.test.ts | D8c-1 uçları testleri (model yetenekleri: GET /api/capabilities/model, POST .../:id/run, GET .../runs/:taskId). |
| d8c2-api.test.ts | D8c-2a uçları testleri (internet erişimi katmanı: ayarlar, getirme, günlük). |
| d8c2b-api.test.ts | D8c-2b uç testleri: internetli model yetenekleri (37, 38, 40) HTTP üzerinden. |
| d8c3a-api.test.ts | D8c-3a uç testleri: ajanlar arası müzakere (madde 75) HTTP üzerinden. |
| desktop-entry.test.ts | One-time entry ticket rules. |
| desktop-entry.ts | One-time entry tickets for the desktop window (Faz 11, slice 1). |
| indicators-api.test.ts | Durum göstergeleri ucu testleri (GET /api/status/indicators). |
| indicators.ts | Durum göstergeleri (bağlam %, kota %, bekleyen onay, takılma şüphesi). |
| labs-api.test.ts | Doğrulama laboratuvarı ucu testleri (POST /api/verification/labs). |
| main.ts | (açıklama yok) |
| monitor.test.ts | Canlı izleme saf hesap testleri (madde 8, D5a). |
| monitor.ts | Canlı izleme ve darboğaz analizi (madde 8, D5a). |
| providers-api.test.ts | Sağlayıcı detay/test/devre dışı ve D3 liste uçları testleri (Faz 11, D3). |
| providers-api.ts | Sağlayıcı detay ve yerel bağlantı testi (Faz 11, D3). |
| subsessions.test.ts | Alt oturum ve kullanım API testleri (Faz 11, dilim 2). |
| subsessions.ts | Alt oturum deposu (Faz 11, dilim 2). |
| ui-desktop.test.ts | AgentMom masaüstü arayüzü (Faz 11) GÜVENLİK testleri: gerçek sunucu + gerçek Edge (playwright-core, channel msedge, başsız). |
| ui.ts | Static Command Panel files (Faz 8, redesigned in Faz 10). |
| usage.ts | Kullanım raporu (Faz 11, dilim 2). |

### src/server/ui/

| Dosya | Açıklama |
| --- | --- |
| capabilities.js | Sahip: Claude [İP:AgentMom Faz 11, D9 yetenekler menüsü]. |
| capabilities.test.ts | D9 testleri: Yetenekler menüsü (capabilities.js kataloğu, komut paleti "Yetenekler" grubu, "/yetenekler" komutu, AM.actions.openCapability). |
| chat.css | Sahip: Claude (Sonnet) [İP:AgentMom Faz 11, dilim 2] - ORTA SOHBET AKIŞI stilleri (chat.js ile birlikte). |
| chat.js | D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği, dikkat sırası): yazan: [Claude#agentmom-d9-yetenekler]. |
| chat.test.ts | Sahip: Claude (Sonnet) [İP:AgentMom Faz 11, dilim 2] - chat.js (orta sohbet akışı) testleri. |
| complexity.test.ts | D8c-UI-3 testleri: Arayüz karmaşıklığı (madde 91): Basit \| Gelişmiş. |
| core.js | D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği, dikkat sırası): yazan: [Claude#agentmom-d9-yetenekler]. |
| help.js | D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği, dikkat sırası): yazan: [Claude#agentmom-d9-yetenekler]. |
| icon.png | (ikili ya da okunmayan dosya) |
| icons.js | Sahip: Haiku (arayüz simgeleri) [İP:AgentMom Faz 11, dilim 2] yazan: [Claude#agentmom-faz11-dilim2] Amaç: window.AM_ICON(ad, {size, title}) kod içinde createElementNS ile küçük çizgi (stroke) SVG sim… |
| index.html | (açıklama yok) |
| indicators-ui.test.ts | Durum göstergeleri çekirdek testleri (core.js loadIndicators/normIndicators, canlı izleme takılma uyarlaması) ve sayfa rozetleri (Genel Bakış, Görevler). |
| lab-env.ts | D9 testleri için ortak ortam (karar laboratuvarı, sistem analitiği, dikkat sırası, yetenekler menüsü). |
| lab-sysan2.test.ts | Sistem analitiği kartları (teknik borç 33, sürüm etkisi 29, veri profili 25) arayüz testleri. |
| lab.test.ts | D9 testleri: Karar laboratuvarı (Araştırma), sistem analitiği (Entegrasyonlar), dikkat sırası (Görevler) ve çekirdek hesap eylemleri. |
| lang.test.ts | (açıklama yok) |
| layout.css | AgentMom masaüstü kabuğu ve ortak bileşenler (Faz 11, dilim 2). |
| menu.css | AgentMom kullanıcı menüsü stilleri (Faz 11, Ekran 4). |
| model.test.ts | D8c testleri: model yetenekleri (core.js modelRun, capabilities.js kayıtları, Araştırma sayfasındaki "Model yetenekleri" bölümü) ve internet ayarları eylemi (netSettingsSave, netDomainCheck). |
| page-audit.js | AgentMom "Denetim Kayıtları" sayfası (Faz 11, D3). |
| page-integrations.js | D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği, dikkat sırası): yazan: [Claude#agentmom-d9-yetenekler]. |
| page-memory.js | Sahip: Sonnet (D3 sayfası: Hafıza ve Bilgi) [İP:AgentMom Faz 11, D3] yazan: [Claude#agentmom-d3-sayfalar-more] Amaç: window.AM_PAGES.register("memory", ...) ile hafıza arama kutusu (300 ms bekleme, e… |
| page-models.js | Sahip: Sonnet (D3 sayfası: Modeller ve Ajanlar) [İP:AgentMom Faz 11, D3] yazan: [Claude#agentmom-faz11-d3-saglayicilar] Amaç: window.AM_PAGES.register("models", {title, group, render(AM, root, param)… |
| page-more.css | D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği): yazan: [Claude#agentmom-d9-yetenekler]. |
| page-more.test.ts | D3 sayfaları testleri: Entegrasyonlar, Beceriler, Araştırma, Hafıza, Beyin Verify (page-*.js + page-more.css). |
| page-overview.js | AgentMom "Genel Bakış" sayfası (Faz 11, D3). |
| page-projects.js | AgentMom "Projeler" sayfası (Faz 11, D3). |
| page-providers.css | Sahip: Sonnet (D3 sayfaları: Sağlayıcılar, Modeller, Kullanım ortak stilleri) [İP:AgentMom Faz 11, D3] yazan: [Claude#agentmom-faz11-d3-saglayicilar] Amaç: page-providers.js, page-models.js ve page-u… |
| page-providers.js | Sahip: Sonnet (D3 sayfası: AI Bağlantıları ve Sağlayıcılar) [İP:AgentMom Faz 11, D3] yazan: [Claude#agentmom-faz11-d3-saglayicilar] Amaç: window.AM_PAGES.register("providers", {title, group, render(A… |
| page-providers.test.ts | D3 sayfaları testleri: page-providers.js (Sağlayıcılar), page-models.js (Modeller ve Ajanlar), page-usage.js (Kullanım ve Maliyetler) ve page-providers.css. |
| page-research.js | D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği, dikkat sırası): yazan: [Claude#agentmom-d9-yetenekler]. |
| page-security.js | AgentMom "Güvenlik ve Yetkiler" sayfası (Faz 11, D3). |
| page-skills.js | Sahip: Sonnet (D3 sayfası: Beceriler) [İP:AgentMom Faz 11, D3] yazan: [Claude#agentmom-d3-sayfalar-more] Amaç: window.AM_PAGES.register("skills", ...) ile beceri KAYDI ve izin kapısı görünümü: ad, ya… |
| page-tasks.js | D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği, dikkat sırası): yazan: [Claude#agentmom-d9-yetenekler]. |
| page-usage.js | Sahip: Sonnet (D3 sayfası: Kullanım ve Maliyetler) [İP:AgentMom Faz 11, D3] yazan: [Claude#agentmom-faz11-d3-saglayicilar] Amaç: window.AM_PAGES.register("usage", {title, group, render(AM, root, para… |
| page-verify.js | Sahip: Sonnet (D3 sayfası: Beyin Verify) [İP:AgentMom Faz 11, D3] yazan: [Claude#agentmom-d3-sayfalar-more] Amaç: window.AM_PAGES.register("verify", ...) ile doğrulama koşuları tablosu (data.verifica… |
| pages.css | D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği): yazan: [Claude#agentmom-d9-yetenekler]. |
| pages.js | D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği, dikkat sırası): yazan: [Claude#agentmom-d9-yetenekler]. |
| pages.test.ts | Sayfa çerçevesi (pages.js) + sayfalar (overview, projects, tasks, security, audit) testleri. |
| palette.js | D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği, dikkat sırası): yazan: [Claude#agentmom-d9-yetenekler]. |
| panel.css | Sahip: Sonnet [İP:AgentMom Faz 11, dilim 2]. |
| panel.js | AgentMom sağ "Genel bakış" paneli (Faz 11, dilim 2). |
| panel.test.ts | Sağ "Genel bakış" paneli (panel.js) testleri. |
| prefs.js | AgentMom arayüz tercihleri (Faz 11). |
| ring.js | Sahip: Sonnet (bağlam halkası) [İP:AgentMom Faz 11, dilim 2] yazan: [Claude#agentmom-faz11-dilim2-shell] Amaç: window.AM_RING: #ringBtn içine aktif konunun bağlam doluluğunu halka olarak çizer; tıkla… |
| safe.js | AgentMom arayüzü güvenli çizim modülü (Faz 11, dilim 2): AM_MD (güvenli markdown), AM_STATUS (durum gruplama), AM_DIALOG (erişilebilir onay penceresi), AM_NAME (alt oturum adı temizleme + model uyuşm… |
| safe.test.ts | safe.js güvenlik testleri: güvenli markdown (XSS, şema hileleri, ReDoS, boyut/derinlik sınırları), durum gruplama, onay penceresi (odak tuzağı, Esc, arka plan, tek pencere), ad temizleme ve model uyu… |
| settings.css | Sahip: Sonnet (Ayarlar, Yardım ve Proje ayarları/Kullanım stilleri) [İP:AgentMom Faz 11, dilim 2] yazan: [Claude#agentmom-faz11-ayarlar] Kapsam: settings.js, help.js, usage.js. |
| settings.js | Sahip: Sonnet (Ayarlar penceresi) [İP:AgentMom Faz 11, dilim 2] yazan: [Claude#agentmom-faz11-ayarlar] Amaç: window.AM_SETTINGS = { init(AM, host), render(AM), pure }. |
| settings.test.ts | Ayarlar penceresi (settings.js), Yardım (help.js) ve Proje ayarları/Kullanım (usage.js) testleri. |
| shell.css | D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği): yazan: [Claude#agentmom-d9-yetenekler]. |
| shell.js | Sahip: Sonnet (yerleşim kabuğu) [İP:AgentMom Faz 11, dilim 2] yazan: [Claude#agentmom-faz11-dilim2-shell] Amaç: window.AM_SHELL: üst çubuk (#topbar içi), sütun genişlik kolları, duyarlı çekmece mantı… |
| shell.test.ts | Sahip: Sonnet [İP:AgentMom Faz 11, dilim 2]. |
| sidebar.css | AgentMom sol menü stilleri (Faz 11, Ekran 2). |
| sidebar.js | AgentMom sol menü (Faz 11, dilim 2, Ekran 2). |
| sidebar.test.ts | Sol menü ve kullanıcı menüsü saf mantık + güvenlik taraması testleri. |
| strings-en.js | İngilizce arayüz metinleri (Faz 11 D9e, madde 26, Kısmi). |
| strings.js | D9 eki (yetenekler menüsü, karar laboratuvarı, sistem analitiği, dikkat sırası): yazan: [Claude#agentmom-d9-yetenekler]. |
| tokens.css | Sahip: Haiku (arayüz belirteçleri) [İP:AgentMom Faz 11, dilim 2] yazan: [Claude#agentmom-faz11-dilim2] Amaç: Masaüstü arayüzü görsel belirteçleri. |
| usage.js | Sahip: Sonnet (Proje ayarları + Kullanım) [İP:AgentMom Faz 11, dilim 2] yazan: [Claude#agentmom-faz11-ayarlar] Amaç: window.AM_USAGE = { init(AM, host), render(AM), pure }. |
| usermenu.js | AgentMom kullanıcı menüsü (Faz 11, dilim 2, Ekran 4). |
| wf-editor.js | AgentMom görsel iş akışı editörü: saf mantık (Faz 11, D9c, madde 16). |
| wf-editor.test.ts | Görsel iş akışı editörü (madde 16) saf mantık testleri: sunucu validateDefinition ile eşlik. |

### src/skills/

| Dosya | Açıklama |
| --- | --- |
| factory.ts | Skill Factory (madde 36): yazılı bir tarif (spec) ile belirleyici (deterministik) bir SKILL.md üretir. |
| hunter.test.ts | Skill Hunter ve Skill Factory testleri (madde 35, 36). |
| hunter.ts | Skill Hunter (madde 35): kullanıcının verdiği YEREL klasörde beceri adaylarını bulur. |
| lifecycle.test.ts | (açıklama yok) |
| lifecycle.ts | Skill lifecycle skeleton (Faz 5c). |

### src/testing/

| Dosya | Açıklama |
| --- | --- |
| analysis-fixtures.ts | D8b analitik testleri için sahte sağlayıcı anlık görüntüleri ve bellek içi veritabanı kurucusu. |
| model-kit.ts | Model yeteneği testleri için ortak sahte sağlayıcı ve ortam (D8c-1). |
| scripted-adapter.ts | (açıklama yok) |
| tmp.ts | (açıklama yok) |

### src/verify/

| Dosya | Açıklama |
| --- | --- |
| auditor.ts | (açıklama yok) |
| baselines-api.test.ts | Görsel regresyon taban onay ucu testleri (POST /api/tasks/:id/baselines/approve, madde 52). |
| baselines.ts | Sahip: Claude [İP:AgentMom madde 52]; yalnız yazan yapay zeka değiştirir. |
| browser-automation.test.ts | Genel tarayıcı otomasyonu (madde 18) + Playwright doğrulama kütüphanesi ve görsel regresyon (madde 52) testleri. |
| browser-worker.ts | Runs in its own process (started by browser.ts). |
| browser.test.ts | (açıklama yok) |
| browser.ts | (açıklama yok) |
| classify.ts | (açıklama yok) |
| completeness.ts | (açıklama yok) |
| delivery.test.ts | (açıklama yok) |
| evidence-files.ts | (açıklama yok) |
| junit.ts | (açıklama yok) |
| links.ts | (açıklama yok) |
| local-tests.ts | (açıklama yok) |
| provider.ts | (açıklama yok) |
| repair.ts | (açıklama yok) |
| scenario-library.ts | Sahip: Claude [İP:AgentMom madde 18/52]; yalnız yazan yapay zeka değiştirir. |
| scenario.ts | Declarative browser scenario: data, not code. |
| schema.ts | Common verification result schema (versioned). |
| screenshot-compare.ts | Sahip: Claude [İP:AgentMom madde 52]; yalnız yazan yapay zeka değiştirir. |
| trace.ts | (açıklama yok) |
| verify.test.ts | (açıklama yok) |
| visual-probe.ts | Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. |

### src/verify/labs/

| Dosya | Açıklama |
| --- | --- |
| a11y.test.ts | Erişilebilirlik laboratuvarı testleri (madde 27). |
| a11y.ts | Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. |
| api.ts | Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. |
| contracts.ts | Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. |
| data-profile.test.ts | Veri analizi laboratuvarı (madde 25) testleri. |
| data-profile.ts | Veri analizi laboratuvarı (madde 25, D8b): yerel dosya profili. |
| design.test.ts | Tasarım laboratuvarı testleri (madde 49 + 50). |
| design.ts | Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. |
| index.ts | Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. |
| labs.test.ts | Doğrulama laboratuvarı D6a testleri. |
| lineage.test.ts | Test verisi soy ağacı testleri (madde 59). |
| lineage.ts | Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. |
| mutation.test.ts | Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. |
| mutation.ts | Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. |
| replay.test.ts | Hata oynatma paketi testleri (madde 60). |
| replay.ts | Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. |
| rules.ts | Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. |
| safe-read.ts | Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. |
| state.ts | Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. |

### src/workflows/

| Dosya | Açıklama |
| --- | --- |
| engine.ts | (açıklama yok) |
| handoff.ts | (açıklama yok) |
| lab-runs.ts | Sahip: Claude [İP:AgentMom Faz 11]; yalnız yazan yapay zeka değiştirir. |
| scopes.ts | Write scopes are repository-relative POSIX prefixes ("src/a", "docs"); "." means the whole repository. |
| store.ts | (açıklama yok) |
| types.ts | (açıklama yok) |
| verify-integration.test.ts | (açıklama yok) |
| workflows.test.ts | (açıklama yok) |

### src/workflows/testing/

| Dosya | Açıklama |
| --- | --- |
| codex-real-review-verdicts.json | (açıklama yok) |
| crash-runner.ts | Child process used by the crash-recovery test: runs a workflow whose implement step hangs, so the parent can kill this process mid-step. |

## HTTP uçları (src/server/app.ts)

Ham çıkarım: 93 uç. Yöntem "*" = satırda yöntem koşulu yok. Yol parametreleri :id / :param / {a|b} olarak gösterilir.

| Yöntem | Yol |
| --- | --- |
| * | /api/* |
| GET | /api/actions/semantics |
| GET | /api/analysis/absence |
| GET | /api/analysis/broker |
| GET | /api/analysis/continuity |
| GET | /api/analysis/data-profile |
| GET | /api/analysis/exit |
| GET | /api/analysis/expertise |
| GET | /api/analysis/graph |
| GET | /api/analysis/impact |
| GET | /api/analysis/offline |
| GET | /api/analysis/portfolio |
| GET | /api/analysis/release-impact |
| GET | /api/analysis/shadow-price |
| GET | /api/analysis/switching |
| GET | /api/analysis/tech-debt |
| GET | /api/assumption-debt |
| GET | /api/assumptions/:id |
| POST | /api/assumptions/:id |
| GET | /api/attention |
| GET | /api/audit |
| GET | /api/audit/verify |
| GET | /api/automation |
| POST | /api/automation/rules |
| POST | /api/automation/rules/:id/run-now |
| POST | /api/automation/rules/:id/{enable\|disable} |
| POST | /api/backup/run |
| GET | /api/backup/status |
| GET | /api/calibration |
| GET | /api/capabilities |
| GET | /api/capabilities/model |
| POST | /api/capabilities/model/:param/run |
| GET | /api/capabilities/model/runs/:id |
| GET | /api/changes |
| POST | /api/changes |
| GET | /api/decisions |
| POST | /api/decisions |
| GET | /api/decisions/:id/argument |
| GET | /api/decisions/:id/genealogy |
| GET | /api/decisions/:id[/retire] |
| POST | /api/decisions/:id[/retire] |
| GET | /api/decisions/genealogy |
| POST | /api/desktop/quit |
| POST | /api/desktop/ticket |
| GET | /api/grants |
| POST | /api/grants |
| POST | /api/grants/:id/revoke |
| GET | /api/help/:param |
| POST | /api/memory |
| GET | /api/memory/compile |
| GET | /api/memory/context |
| GET | /api/memory/contradictions/resolutions |
| POST | /api/memory/export |
| GET | /api/memory/flags |
| GET | /api/memory/halflife |
| GET | /api/memory/implicit |
| GET | /api/memory/search |
| GET | /api/monitor |
| POST | /api/net/approve |
| POST | /api/net/fetch |
| GET | /api/net/fetches |
| GET | /api/net/settings |
| POST | /api/net/settings |
| GET | /api/policy |
| POST | /api/predictions |
| POST | /api/predictions/:id/resolve |
| GET | /api/providers |
| GET | /api/providers/:param[/test\|disable\|enable] |
| POST | /api/providers/:param[/test\|disable\|enable] |
| POST | /api/reasoning/hypotheses |
| GET | /api/reasoning/learning |
| POST | /api/reasoning/voi |
| GET | /api/secrets/refs |
| GET | /api/skills |
| POST | /api/skills |
| GET | /api/skills/:id[/gate\|advance\|release\|reject\|revoke] |
| POST | /api/skills/:id[/gate\|advance\|release\|reject\|revoke] |
| GET | /api/status/indicators |
| GET | /api/subsessions |
| POST | /api/subsessions |
| POST | /api/subsessions/:param/{rename\|pin\|archive} |
| GET | /api/tasks |
| POST | /api/tasks |
| POST | /api/tasks/:id/baselines/approve |
| GET | /api/usage |
| GET | /api/usage/context |
| POST | /api/verification/labs |
| GET | /api/verification/runs |
| GET | /api/workflows |
| GET | /api/workflows/:id |
| GET | /desktop/enter |
| GET | /desktop/proof |
| GET | /health |

### Çözümlenemedi

- /api/tasks/:id/{approve|deny|run|evidence|contract|workflow|delivery|replay} (düzenli ifade; yöntem satırda belirlenemedi)

## Migrasyonlar (src/core/db/migrations)

16 ileri migrasyon.

| Migrasyon | Başlık |
| --- | --- |
| 001_init.sql | (açıklama yok) |
| 002_indexes.sql | (açıklama yok) |
| 003_providers.sql | (açıklama yok) |
| 004_evidence.sql | (açıklama yok) |
| 005_workflows.sql | (açıklama yok) |
| 006_verification.sql | (açıklama yok) |
| 007_memory.sql | Operational memory (Faz 5b). |
| 008_skills.sql | Skill lifecycle (Faz 5c): records and policy gates only. |
| 009_rea.sql | REA (Faz 6): trusted-source registry, findings, recommendations and the adoption workflow. |
| 010_reasoning.sql | Reasoning ledgers (Faz 7, M14): decisions with expiry and assumptions (#67, #69) and confidence calibration (#68). |
| 011_subsessions.sql | Sub-sessions (Faz 11, dilim 2; yazan: Claude [İP:AgentMom Faz 11], sahip: Yusuf; yalnız sahibi değiştirir). |
| 012_provider_state.sql | Provider on/off state (Faz 11, D3; yazan: Claude [İP:AgentMom Faz 11 D3], sahip: Yusuf; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar). |
| 013_audit_chain.sql | Hesap verebilirlik zinciri (madde 95, D5a; yazan: Claude [İP:AgentMom D5a], sahip: Yusuf; yalnız yazan yapay zeka değiştirir, diğerleri öneri sunar). |
| 014_d5b.sql | D5b (madde 77, 78, 13). |
| 015_net.sql | D8c-2a (İnternet erişimi katmanı). |
| 016_schedule.sql | Zaman tetikleyicili otomasyon (madde 13 genişlemesi, ADR-016). |

## Yetenek kontrol listesi sayımları (docs/status/100-yetenek-durum.json)

| Durum | Sayı |
| --- | --- |
| Doğrulandı | 30 |
| Kısmi | 67 |
| Planlı | 1 |
| Desteklenmiyor | 0 |
| Kapsam dışı | 2 |
| Toplam | 100 |
